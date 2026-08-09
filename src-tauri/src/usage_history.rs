use crate::types::{QuotaTier, ServiceQuota, UsageSample, UsageWeekDay};
use chrono::{Local, TimeZone};
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::io::Write;
use std::path::{Path, PathBuf};

const HISTORY_VERSION: u32 = 1;
const RETENTION_SECS: i64 = 8 * 86_400;
const MAX_SAMPLES_PER_TIER: usize = 2_500;
const WEEK_LATTICE_DAYS: i64 = 7;

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct UsageHistoryDocument {
    pub version: u32,
    pub samples: Vec<UsageSample>,
}

impl Default for UsageHistoryDocument {
    fn default() -> Self {
        Self {
            version: HISTORY_VERSION,
            samples: Vec::new(),
        }
    }
}

pub(crate) fn load_history() -> UsageHistoryDocument {
    load_history_from(&history_path())
}

pub(crate) fn record_quota_samples(
    service: &str,
    quota: &ServiceQuota,
    now_secs: i64,
) -> Result<(), String> {
    record_quota_samples_at(&history_path(), service, quota, now_secs)
}

pub(crate) fn samples_for_tier(
    document: &UsageHistoryDocument,
    service: &str,
    tier: &QuotaTier,
) -> Vec<UsageSample> {
    let Some(reset_at) = tier.resets_at.as_deref() else {
        return Vec::new();
    };
    document
        .samples
        .iter()
        .filter(|sample| {
            sample.service == service && sample.tier == tier.name && sample.reset_at == reset_at
        })
        .cloned()
        .collect()
}

/// Last 7 local calendar days of weekly-tier burn (positive utilization deltas).
pub(crate) fn week_burn_for_service(
    document: &UsageHistoryDocument,
    service: &str,
    now_secs: i64,
) -> Vec<UsageWeekDay> {
    let Some(today_start) = local_day_start_secs(now_secs) else {
        return empty_week(now_secs);
    };

    let mut weekly: Vec<&UsageSample> = document
        .samples
        .iter()
        .filter(|sample| {
            sample.service == service
                && matches!(sample.tier.as_str(), "weekly_limit" | "seven_day")
        })
        .collect();
    weekly.sort_by_key(|sample| sample.observed_at_secs);

    (0..WEEK_LATTICE_DAYS)
        .map(|offset| {
            let day_index = WEEK_LATTICE_DAYS - 1 - offset;
            let day_start = today_start - day_index * 86_400;
            let day_end = day_start + 86_400;
            let day_samples: Vec<&UsageSample> = weekly
                .iter()
                .copied()
                .filter(|sample| {
                    sample.observed_at_secs >= day_start && sample.observed_at_secs < day_end
                })
                .collect();
            UsageWeekDay {
                day_start_secs: day_start,
                burn_pct: day_burn_pct(&day_samples),
            }
        })
        .collect()
}

fn day_burn_pct(samples: &[&UsageSample]) -> f64 {
    if samples.len() < 2 {
        return 0.0;
    }
    let mut burn = 0.0;
    let mut previous = samples[0].utilization;
    for sample in samples.iter().skip(1) {
        if sample.utilization >= previous {
            burn += sample.utilization - previous;
        }
        previous = sample.utilization;
    }
    (burn * 10.0).round() / 10.0
}

fn local_day_start_secs(now_secs: i64) -> Option<i64> {
    let now = Local.timestamp_opt(now_secs, 0).single()?;
    let naive_midnight = now.date_naive().and_hms_opt(0, 0, 0)?;
    Local
        .from_local_datetime(&naive_midnight)
        .single()
        .map(|dt| dt.timestamp())
}

fn empty_week(now_secs: i64) -> Vec<UsageWeekDay> {
    let today_start = local_day_start_secs(now_secs).unwrap_or(now_secs - (now_secs % 86_400));
    (0..WEEK_LATTICE_DAYS)
        .map(|offset| {
            let day_index = WEEK_LATTICE_DAYS - 1 - offset;
            UsageWeekDay {
                day_start_secs: today_start - day_index * 86_400,
                burn_pct: 0.0,
            }
        })
        .collect()
}

pub(crate) fn remove_service(service: &str) -> Result<(), String> {
    remove_service_at(&history_path(), service)
}

fn history_path() -> PathBuf {
    crate::config::config_dir().join("usage-history.json")
}

fn load_history_from(path: &Path) -> UsageHistoryDocument {
    let Ok(content) = std::fs::read_to_string(path) else {
        return UsageHistoryDocument::default();
    };
    match serde_json::from_str::<UsageHistoryDocument>(&content) {
        Ok(mut document) => {
            document.version = HISTORY_VERSION;
            document
        }
        Err(error) => {
            log::warn!("Failed to parse usage history, starting empty: {error}");
            UsageHistoryDocument::default()
        }
    }
}

fn record_quota_samples_at(
    path: &Path,
    service: &str,
    quota: &ServiceQuota,
    now_secs: i64,
) -> Result<(), String> {
    if !quota.success {
        return Ok(());
    }
    let mut document = load_history_from(path);
    for tier in &quota.tiers {
        let Some(reset_at) = tier.resets_at.as_ref() else {
            continue;
        };
        document.samples.retain(|sample| {
            !(sample.service == service
                && sample.tier == tier.name
                && sample.reset_at == *reset_at
                && sample.observed_at_secs == now_secs)
        });
        document.samples.push(UsageSample {
            service: service.to_string(),
            tier: tier.name.clone(),
            reset_at: reset_at.clone(),
            observed_at_secs: now_secs,
            utilization: tier.utilization.clamp(0.0, 100.0),
        });
    }
    prune_history(&mut document, now_secs);
    save_history_to(path, &document)
}

fn prune_history(document: &mut UsageHistoryDocument, now_secs: i64) {
    let cutoff = now_secs - RETENTION_SECS;
    document
        .samples
        .retain(|sample| sample.observed_at_secs >= cutoff);
    document
        .samples
        .sort_by_key(|sample| sample.observed_at_secs);

    let mut counts: HashMap<(String, String), usize> = HashMap::new();
    let mut newest_bounded = document
        .samples
        .drain(..)
        .rev()
        .filter(|sample| {
            let count = counts
                .entry((sample.service.clone(), sample.tier.clone()))
                .or_default();
            let keep = *count < MAX_SAMPLES_PER_TIER;
            *count += 1;
            keep
        })
        .collect::<Vec<_>>();
    newest_bounded.reverse();
    document.samples = newest_bounded;
}

fn remove_service_at(path: &Path, service: &str) -> Result<(), String> {
    let mut document = load_history_from(path);
    document.samples.retain(|sample| sample.service != service);
    save_history_to(path, &document)
}

fn save_history_to(path: &Path, document: &UsageHistoryDocument) -> Result<(), String> {
    let parent = path
        .parent()
        .ok_or_else(|| "Usage history path has no parent directory".to_string())?;
    std::fs::create_dir_all(parent)
        .map_err(|error| format!("Failed to create usage history directory: {error}"))?;
    let temporary = parent.join(format!(
        ".usage-history-{}-{:016x}.tmp",
        std::process::id(),
        rand::random::<u64>()
    ));
    let content = serde_json::to_vec_pretty(document)
        .map_err(|error| format!("Failed to serialize usage history: {error}"))?;
    let write_result = (|| {
        let mut file = std::fs::OpenOptions::new()
            .create_new(true)
            .write(true)
            .open(&temporary)
            .map_err(|error| format!("Failed to create usage history: {error}"))?;
        file.write_all(&content)
            .map_err(|error| format!("Failed to write usage history: {error}"))?;
        file.sync_all()
            .map_err(|error| format!("Failed to sync usage history: {error}"))?;
        std::fs::rename(&temporary, path)
            .map_err(|error| format!("Failed to publish usage history: {error}"))
    })();
    if write_result.is_err() {
        let _ = std::fs::remove_file(&temporary);
    }
    write_result
}

#[cfg(test)]
mod tests {
    use super::*;

    const NOW: i64 = 1_700_000_000;

    fn quota(reset_at: &str) -> ServiceQuota {
        ServiceQuota {
            service: "codex".to_string(),
            display_name: "Codex".to_string(),
            success: true,
            tiers: vec![
                QuotaTier {
                    name: "five_hour".to_string(),
                    utilization: 12.0,
                    resets_at: Some(reset_at.to_string()),
                    used: None,
                    limit: None,
                    remaining: None,
                },
                QuotaTier {
                    name: "seven_day".to_string(),
                    utilization: 42.0,
                    resets_at: Some(reset_at.to_string()),
                    used: None,
                    limit: None,
                    remaining: None,
                },
            ],
            error: None,
            queried_at: Some(NOW * 1_000),
            credential_valid: true,
        }
    }

    #[test]
    fn record_round_trip_deduplicates_the_same_observation() {
        let temp = tempfile::tempdir().unwrap();
        let path = temp.path().join("usage-history.json");

        record_quota_samples_at(&path, "account-a", &quota("2026-07-30T00:00:00Z"), NOW).unwrap();
        record_quota_samples_at(&path, "account-a", &quota("2026-07-30T00:00:00Z"), NOW).unwrap();
        let document = load_history_from(&path);

        assert_eq!(document.samples.len(), 2);
        assert!(document
            .samples
            .iter()
            .all(|sample| sample.service == "account-a"));
    }

    #[test]
    fn malformed_history_is_treated_as_empty() {
        let temp = tempfile::tempdir().unwrap();
        let path = temp.path().join("usage-history.json");
        std::fs::write(&path, "{not-json").unwrap();

        let document = load_history_from(&path);

        assert!(document.samples.is_empty());
    }

    #[test]
    fn week_burn_sums_positive_deltas_across_reset_cycles() {
        let today = local_day_start_secs(NOW).unwrap();
        let document = UsageHistoryDocument {
            version: 1,
            samples: vec![
                UsageSample {
                    service: "account-a".to_string(),
                    tier: "seven_day".to_string(),
                    reset_at: "old".to_string(),
                    observed_at_secs: today + 3_600,
                    utilization: 10.0,
                },
                UsageSample {
                    service: "account-a".to_string(),
                    tier: "seven_day".to_string(),
                    reset_at: "old".to_string(),
                    observed_at_secs: today + 7_200,
                    utilization: 18.0,
                },
                UsageSample {
                    service: "account-a".to_string(),
                    tier: "seven_day".to_string(),
                    reset_at: "new".to_string(),
                    observed_at_secs: today + 10_800,
                    utilization: 2.0,
                },
                UsageSample {
                    service: "account-a".to_string(),
                    tier: "seven_day".to_string(),
                    reset_at: "new".to_string(),
                    observed_at_secs: today + 14_400,
                    utilization: 5.0,
                },
            ],
        };

        let week = week_burn_for_service(&document, "account-a", NOW);
        assert_eq!(week.len(), 7);
        assert_eq!(week[6].day_start_secs, today);
        // +8 before reset, then +3 after reset
        assert_eq!(week[6].burn_pct, 11.0);
        assert!(week.iter().take(6).all(|day| day.burn_pct == 0.0));
    }

    #[test]
    fn matching_samples_are_isolated_by_service_tier_and_reset_cycle() {
        let current_reset = "2026-07-30T00:00:00Z";
        let document = UsageHistoryDocument {
            version: 1,
            samples: vec![
                UsageSample {
                    service: "account-a".to_string(),
                    tier: "seven_day".to_string(),
                    reset_at: current_reset.to_string(),
                    observed_at_secs: NOW,
                    utilization: 42.0,
                },
                UsageSample {
                    service: "account-a".to_string(),
                    tier: "seven_day".to_string(),
                    reset_at: "2026-07-23T00:00:00Z".to_string(),
                    observed_at_secs: NOW - 86_400,
                    utilization: 99.0,
                },
                UsageSample {
                    service: "account-b".to_string(),
                    tier: "seven_day".to_string(),
                    reset_at: current_reset.to_string(),
                    observed_at_secs: NOW,
                    utilization: 12.0,
                },
            ],
        };
        let tier = quota(current_reset).tiers.pop().unwrap();

        let samples = samples_for_tier(&document, "account-a", &tier);

        assert_eq!(samples.len(), 1);
        assert_eq!(samples[0].utilization, 42.0);
    }

    #[test]
    fn pruning_bounds_each_service_tier_and_removes_old_samples() {
        let mut document = UsageHistoryDocument {
            version: 1,
            samples: (0..2_600)
                .map(|offset| UsageSample {
                    service: "account-a".to_string(),
                    tier: "seven_day".to_string(),
                    reset_at: "2026-07-30T00:00:00Z".to_string(),
                    observed_at_secs: NOW - 2_599 + offset,
                    utilization: offset as f64 / 100.0,
                })
                .chain(std::iter::once(UsageSample {
                    service: "account-a".to_string(),
                    tier: "seven_day".to_string(),
                    reset_at: "2026-07-20T00:00:00Z".to_string(),
                    observed_at_secs: NOW - 9 * 86_400,
                    utilization: 90.0,
                }))
                .collect(),
        };

        prune_history(&mut document, NOW);

        assert_eq!(document.samples.len(), 2_500);
        assert!(document
            .samples
            .iter()
            .all(|sample| sample.observed_at_secs >= NOW - 8 * 86_400));
    }

    #[test]
    fn removing_service_preserves_other_accounts() {
        let temp = tempfile::tempdir().unwrap();
        let path = temp.path().join("usage-history.json");
        let mut document = UsageHistoryDocument {
            version: 1,
            samples: ["account-a", "account-b"]
                .into_iter()
                .map(|service| UsageSample {
                    service: service.to_string(),
                    tier: "seven_day".to_string(),
                    reset_at: "2026-07-30T00:00:00Z".to_string(),
                    observed_at_secs: NOW,
                    utilization: 42.0,
                })
                .collect(),
        };
        save_history_to(&path, &document).unwrap();

        remove_service_at(&path, "account-a").unwrap();
        document = load_history_from(&path);

        assert_eq!(document.samples.len(), 1);
        assert_eq!(document.samples[0].service, "account-b");
    }
}
