import { Plug } from "lucide-react";
import { useEffect, useState } from "react";
import { api } from "../api";
import { useLocale, useTranslations } from "../i18n";
import type { Translator } from "../i18n/translate";
import { proxyDetailLabel } from "../proxyDisplay";
import type {
  DashboardState,
  ProxyMode,
  ProxySettings as ProxySettingsType,
  ServiceProxyConfig,
} from "../types";
import { MacosPopupSelect } from "./MacosPopupSelect";

interface ProxySettingsProps {
  state: DashboardState;
  onChange: (state: DashboardState) => void;
}

const proxyModes: ProxyMode[] = ["auto", "on", "off"];

export function ProxySettings({ state, onChange }: ProxySettingsProps) {
  const t = useTranslations("settings");
  const common = useTranslations("common");
  const dashboard = useTranslations("dashboard");
  const { locale } = useLocale();
  const [settings, setSettings] = useState<ProxySettingsType>(state.config.proxy);
  const [message, setMessage] = useState<string | null>(null);
  const sectionColon = locale.startsWith("zh") ? "：" : ":";
  const dirty = !proxySettingsEqual(settings, state.config.proxy);

  useEffect(() => {
    setSettings(state.config.proxy);
  }, [state.config.proxy]);

  async function save() {
    try {
      const next = await api.saveProxySettings(settings);
      setSettings(next.config.proxy);
      setMessage(null);
      onChange(next);
    } catch {
      setMessage(t("proxy_save_failed"));
    }
  }

  async function test(service: "kimi" | "codex") {
    const name = service === "kimi" ? common("kimi_code") : common("codex");
    try {
      const result = await api.testProxy(service, settings[service]);
      setMessage(
        t("proxy_test_result", {
          service: name,
          result: proxyDetailLabel(result, dashboard),
        }),
      );
    } catch {
      setMessage(t("proxy_test_failed", { service: name }));
    }
  }

  function update(service: "kimi" | "codex", next: ServiceProxyConfig) {
    setSettings({ ...settings, [service]: next });
  }

  return (
    <section className="settings-group wide" aria-labelledby="proxy-title">
      <div className="settings-group-heading">
        <div className="settings-group-header">
          <h3 className="settings-group-title" id="proxy-title">
            {t("network_proxy")}
          </h3>
          <p className="settings-group-caption">{t("proxy_auto_hint")}</p>
        </div>
        {dirty ? (
          <div className="button-row proxy-apply-actions">
            <button
              className="primary compact"
              type="button"
              onClick={() => void save()}
              aria-label={t("save_proxy_settings")}
            >
              {t("apply_changes")}
            </button>
          </div>
        ) : null}
      </div>
      <div className="panel settings-group-panel">
        <ServiceProxyRows
          label={common("kimi_code")}
          sectionColon={sectionColon}
          value={settings.kimi}
          onChange={(next) => update("kimi", next)}
          onTest={() => void test("kimi")}
          t={t}
        />
        <ServiceProxyRows
          label={common("codex")}
          sectionColon={sectionColon}
          value={settings.codex}
          onChange={(next) => update("codex", next)}
          onTest={() => void test("codex")}
          t={t}
        />
      </div>
      {message && <p className="notice settings-group-footer-note">{message}</p>}
    </section>
  );
}

function ServiceProxyRows({
  label,
  sectionColon,
  value,
  onChange,
  onTest,
  t,
}: {
  label: string;
  sectionColon: string;
  value: ServiceProxyConfig;
  onChange: (value: ServiceProxyConfig) => void;
  onTest: () => void;
  t: Translator<"settings">;
}) {
  return (
    <>
      <div className="settings-group-row settings-subtitle-row">
        <span className="settings-subtitle-label">
          {label}
          {sectionColon}
        </span>
      </div>
      <div className="switch-row settings-nested-row">
        <span>
          <span className="settings-row-label">{t("proxy_mode_label")}</span>
        </span>
        <MacosPopupSelect
          value={value.mode}
          aria-label={t("proxy_mode", { service: label })}
          onChange={(event) =>
            onChange({
              ...value,
              mode: event.currentTarget.value as ProxyMode,
            })
          }
        >
          {proxyModes.map((mode) => (
            <option key={mode} value={mode}>
              {modeLabel(mode, t)}
            </option>
          ))}
        </MacosPopupSelect>
      </div>
      <div className="switch-row settings-nested-row proxy-url-switch-row">
        <span>
          <span className="settings-row-label">{t("proxy_url")}</span>
        </span>
        <div className="proxy-url-controls">
          <input
            value={value.proxyUrl ?? ""}
            onChange={(event) =>
              onChange({ ...value, proxyUrl: event.currentTarget.value || null })
            }
            placeholder={t("proxy_url_placeholder")}
            aria-label={t("proxy_url_for", { service: label })}
          />
          <button className="secondary compact" type="button" onClick={onTest}>
            <Plug size={13} strokeWidth={1.75} aria-hidden />
            {t("test_connection")}
          </button>
        </div>
      </div>
    </>
  );
}

function modeLabel(mode: ProxyMode, t: Translator<"settings">): string {
  if (mode === "auto") return t("mode_auto");
  if (mode === "on") return t("mode_on");
  return t("mode_off");
}

function proxySettingsEqual(a: ProxySettingsType, b: ProxySettingsType): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}
