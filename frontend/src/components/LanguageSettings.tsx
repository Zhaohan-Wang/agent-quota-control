import { useLocale, useTranslations, type Locale } from "../i18n";
import { MacosPopupSelect } from "./MacosPopupSelect";

const localeOptions: Array<{ id: Locale; labelKey: "locale_zh_cn" | "locale_en" }> = [
  { id: "zh-CN", labelKey: "locale_zh_cn" },
  { id: "en", labelKey: "locale_en" },
];

export function LanguageSettings() {
  const t = useTranslations("settings");
  const { locale, setLocale } = useLocale();

  return (
    <div className="switch-row">
      <span id="language-row-label">
        <strong>{t("language_mode")}</strong>
      </span>
      <MacosPopupSelect
        value={locale}
        aria-labelledby="language-row-label"
        onChange={(event) => setLocale(event.currentTarget.value as Locale)}
      >
        {localeOptions.map((option) => (
          <option key={option.id} value={option.id}>
            {t(option.labelKey)}
          </option>
        ))}
      </MacosPopupSelect>
    </div>
  );
}
