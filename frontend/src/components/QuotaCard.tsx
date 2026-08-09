import {
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  CircleDashed,
  Network,
  XCircle,
  type LucideIcon,
} from "lucide-react";
import { useFormatter, useTranslations } from "../i18n";
import type { Translator } from "../i18n/translate";
import { proxyDetailLabel } from "../proxyDisplay";
import type {
  CardSnapshot,
  QuotaEstimate,
  QuotaTier,
  SufficiencyState,
  UsageWeekDay,
} from "../types";
import { meterFillClass, usageToneClass } from "../usageColor";
import { UsageTrendChart } from "./UsageTrendChart";
import { UsageWeekHeatmap } from "./UsageWeekHeatmap";

interface QuotaCardProps {
  card: CardSnapshot;
  iconSrc: string;
}

/** Icons track sufficiency meaning — never data-freshness alone. */
const STATUS_ICONS: Record<SufficiencyState, LucideIcon> = {
  enough: CheckCircle2,
  tight: AlertCircle,
  not_enough: XCircle,
  unknown: CircleDashed,
};

export function QuotaCard({ card, iconSrc }: QuotaCardProps) {
  const t = useTranslations("dashboard");
  const format = useFormatter();
  const estimateState = card.weeklyEstimate?.state ?? "unknown";
  const displayState = stateLabel(estimateState, t);
  const hasData = card.tiers.length > 0;
  const needsLogin = card.status === "login_expired";
  const waitingFirstRefresh = !hasData && !card.errorMessage;
  const showStatusBadge = !needsLogin && !waitingFirstRefresh;
  const statusTone = estimateState;
  const statusText = displayState;
  const StatusIcon = STATUS_ICONS[estimateState];
  const weeklyTier = card.tiers.find((tier) =>
    ["weekly_limit", "seven_day"].includes(tier.name),
  );
  const fiveHourTier = card.tiers.find((tier) => tier.name === "five_hour");
  const remainingTiers = card.tiers.filter(
    (tier) =>
      tier.name !== "weekly_limit" &&
      tier.name !== "seven_day" &&
      tier.name !== "five_hour",
  );
  const twinPrimary =
    weeklyTier && fiveHourTier ? [weeklyTier, fiveHourTier] : null;
  const stackedTiers = twinPrimary
    ? remainingTiers
    : [weeklyTier, fiveHourTier, ...remainingTiers].filter(
        (tier): tier is QuotaTier => tier !== undefined,
      );
  const showAccountName =
    normalizeIdentity(card.accountDisplayName) !==
    normalizeIdentity(card.serviceDisplayName);
  const showEstimateBlock =
    hasData &&
    !!card.weeklyEstimate &&
    !needsLogin &&
    !trendCoversEstimate(card.weeklyEstimate);
  const showWeekHeatmap =
    hasData &&
    !needsLogin &&
    !!card.usageWeek &&
    card.usageWeek.length > 0;

  return (
    <section
      className="quota-card"
      aria-label={t("quota_aria", { name: card.accountDisplayName })}
    >
      <div className="quota-header">
        <div className="service-heading">
          <img src={iconSrc} alt="" aria-hidden />
          <div
            className={
              showAccountName
                ? "service-copy"
                : "service-copy service-copy-single"
            }
          >
            {showAccountName ? (
              <>
                <p className="eyebrow">{card.serviceDisplayName}</p>
                <h3>{card.accountDisplayName}</h3>
              </>
            ) : (
              <h3>{card.serviceDisplayName}</h3>
            )}
          </div>
        </div>
        {showStatusBadge ? (
          <div className={`status-badge ${statusTone}`}>
            <StatusIcon size={13} strokeWidth={1.75} aria-hidden />
            {statusText}
          </div>
        ) : null}
      </div>

      {card.errorMessage && (
        <div className="card-alert" role="status">
          <AlertTriangle size={13} strokeWidth={1.75} aria-hidden />
          <span>
            {needsLogin ? t("login_expired") : card.errorMessage}
          </span>
        </div>
      )}
      {waitingFirstRefresh && (
        <p className="muted quota-empty">{t("waiting_first_refresh")}</p>
      )}
      {hasData && twinPrimary && (
        <div className="tier-pair">
          {twinPrimary.map((tier) => (
            <TierMeter
              key={tier.name}
              tier={tier}
              compact
              weekDays={
                showWeekHeatmap && isWeeklyTier(tier.name)
                  ? card.usageWeek
                  : undefined
              }
              t={t}
            />
          ))}
        </div>
      )}
      {hasData && stackedTiers.length > 0 && (
        <div className="tier-stack">
          {stackedTiers.map((tier) => (
            <TierMeter
              key={tier.name}
              tier={tier}
              compact
              weekDays={
                showWeekHeatmap && isWeeklyTier(tier.name)
                  ? card.usageWeek
                  : undefined
              }
              t={t}
            />
          ))}
        </div>
      )}

      {showEstimateBlock && card.weeklyEstimate && (
        <p className="estimate-note">
          {card.weeklyEstimate.projectedUtilization == null
            ? t("accumulating")
            : card.weeklyEstimate.exhaustedBeforeResetSecs != null
              ? t("exhausted_early", {
                  duration: formatDuration(
                    card.weeklyEstimate.exhaustedBeforeResetSecs,
                    t,
                  ),
                })
              : estimateHint(
                  card.weeklyEstimate.state,
                  t,
                  card.weeklyEstimate.lastsForSecs,
                )}
        </p>
      )}
      {hasData && card.weeklyEstimate && !needsLogin && (
        <UsageTrendChart estimate={card.weeklyEstimate} />
      )}

      <div className="card-meta">
        <div className="proxy-line card-meta-line">
          <Network size={12} strokeWidth={1.75} aria-hidden />
          <span>{proxyDetailLabel(card.proxy, t)}</span>
          {card.queriedAt ? (
            <>
              <span className="meta-sep" aria-hidden>
                ·
              </span>
              <span>
                {t("updated_at", {
                  time: format.dateTime(card.queriedAt, { timeStyle: "medium" }),
                })}
              </span>
            </>
          ) : null}
        </div>
      </div>
    </section>
  );
}

function TierMeter({
  tier,
  compact = false,
  weekDays,
  t,
}: {
  tier: QuotaTier;
  compact?: boolean;
  weekDays?: UsageWeekDay[] | null;
  t: Translator<"dashboard">;
}) {
  const resetLabel = tier.resetsAt
    ? formatResetLabel(tier.resetsAt, t)
    : null;
  const showWeek = !!weekDays && weekDays.length > 0;

  return (
    <div
      className={
        [
          "tier-row",
          compact ? "tier-row-compact" : null,
          showWeek ? "tier-row-with-week" : null,
        ]
          .filter(Boolean)
          .join(" ")
      }
    >
      <div className="tier-meta">
        <div className="tier-heading">
          <span className="tier-label">
            <span>{tierLabel(tier.name, t)}</span>
          </span>
          {showWeek ? <UsageWeekHeatmap days={weekDays} embedded /> : null}
        </div>
        <strong className={usageToneClass(tier.utilization)}>
          {Math.round(tier.utilization)}%
        </strong>
      </div>
      <div className="meter" aria-label={`${tier.name} utilization`}>
        <div
          className={meterFillClass(tier.utilization)}
          style={{ width: `${Math.min(tier.utilization, 100)}%` }}
        />
      </div>
      {compact || resetLabel ? (
        <small
          className={
            resetLabel ? "tier-reset" : "tier-reset tier-reset-spacer"
          }
        >
          {resetLabel ?? "\u00a0"}
        </small>
      ) : null}
    </div>
  );
}

function isWeeklyTier(name: string): boolean {
  return name === "weekly_limit" || name === "seven_day";
}

function trendCoversEstimate(estimate: QuotaEstimate): boolean {
  const windowStart = estimate.windowStartSecs;
  const windowEnd = estimate.windowEndSecs;
  const hasDomain =
    windowStart != null &&
    windowEnd != null &&
    Number.isFinite(windowStart) &&
    Number.isFinite(windowEnd) &&
    windowEnd > windowStart;
  return hasDomain;
}

function tierLabel(name: string, t: Translator<"dashboard">): string {
  if (name === "five_hour") return t("tier_5h");
  if (name === "weekly_limit" || name === "seven_day") return t("tier_7d");
  return name;
}

function stateLabel(state: SufficiencyState, t: Translator<"dashboard">): string {
  if (state === "enough") return t("state_enough");
  if (state === "tight") return t("state_tight");
  if (state === "not_enough") return t("state_not_enough");
  return t("state_waiting");
}

function normalizeIdentity(value: string): string {
  return value.trim().toLocaleLowerCase();
}

function estimateHint(
  state: SufficiencyState,
  t: Translator<"dashboard">,
  lastsForSecs?: number | null,
): string {
  if (state === "not_enough" && lastsForSecs != null) {
    return t("hint_exhaust_in", { duration: formatDuration(lastsForSecs, t) });
  }
  if (state === "tight") return t("hint_tight");
  if (state === "enough") return t("hint_enough");
  return t("hint_waiting");
}

function formatDuration(seconds: number, t: Translator<"dashboard">): string {
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  if (days > 0 && hours > 0) {
    return t("duration_days_hours", { days, hours });
  }
  if (days > 0) return t("duration_days", { days });
  return t("duration_hours", { hours });
}

/** Same countdown phrasing for every tier meter (“Xh later reset”). */
function formatResetLabel(
  value: string,
  t: Translator<"dashboard">,
): string {
  return t("reset_in", { duration: formatResetCountdown(value, t) });
}

function formatResetCountdown(
  value: string,
  t: Translator<"dashboard">,
): string {
  const resetAt = new Date(value).getTime();
  if (Number.isNaN(resetAt)) return t("unknown_time");
  const seconds = Math.max(0, Math.ceil((resetAt - Date.now()) / 1000));
  const days = Math.floor(seconds / 86_400);
  const hours = Math.floor((seconds % 86_400) / 3_600);
  const minutes = Math.ceil((seconds % 3_600) / 60);
  if (days > 0 && hours > 0) {
    return t("duration_days_hours", { days, hours });
  }
  if (days > 0) return t("duration_days", { days });
  if (hours > 0 && minutes > 0) {
    return t("duration_hours_minutes", { hours, minutes });
  }
  if (hours > 0) return t("duration_hours", { hours });
  return t("duration_minutes", { minutes });
}
