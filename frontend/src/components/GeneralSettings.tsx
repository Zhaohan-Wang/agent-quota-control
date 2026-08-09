import { api } from "../api";
import { useTranslations } from "../i18n";
import { AppearanceSettings } from "./AppearanceSettings";
import { LanguageSettings } from "./LanguageSettings";

export function GeneralSettings() {
  const t = useTranslations("settings");

  return (
    <section className="settings-group" aria-labelledby="general-title">
      <h3 className="settings-group-title" id="general-title">
        {t("general")}
      </h3>
      <div className="panel settings-group-panel">
        <AppearanceSettings />
        <LanguageSettings />
        <div className="switch-row">
          <span>
            <strong>{t("config_dir")}</strong>
            <small>{t("config_dir_hint")}</small>
          </span>
          <button
            className="secondary compact"
            type="button"
            onClick={api.revealConfigDir}
          >
            {t("reveal_in_finder")}
          </button>
        </div>
      </div>
    </section>
  );
}
