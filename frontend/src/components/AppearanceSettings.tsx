import { useEffect, useState } from "react";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { useTranslations } from "../i18n";
import {
  applyThemePreference,
  readThemePreference,
  setThemePreference,
  subscribeSystemTheme,
  type ThemePreference,
} from "../theme";
import { MacosPopupSelect } from "./MacosPopupSelect";

const themeOptions: Array<{
  id: ThemePreference;
  labelKey: "theme_light" | "theme_dark" | "theme_system";
}> = [
  { id: "light", labelKey: "theme_light" },
  { id: "dark", labelKey: "theme_dark" },
  { id: "system", labelKey: "theme_system" },
];

export function AppearanceSettings() {
  const t = useTranslations("settings");
  const [preference, setPreference] = useState<ThemePreference>(() =>
    readThemePreference(),
  );

  useEffect(() => {
    applyThemePreference(preference);
    void syncNativeTheme(preference);
    return subscribeSystemTheme(preference, () => {
      applyThemePreference(preference);
      void syncNativeTheme(preference);
    });
  }, [preference]);

  function selectTheme(next: ThemePreference) {
    setPreference(next);
    setThemePreference(next);
    void syncNativeTheme(next);
  }

  return (
    <div className="switch-row">
      <span id="appearance-row-label">
        <strong>{t("appearance_mode")}</strong>
      </span>
      <MacosPopupSelect
        value={preference}
        aria-labelledby="appearance-row-label"
        onChange={(event) =>
          selectTheme(event.currentTarget.value as ThemePreference)
        }
      >
        {themeOptions.map((option) => (
          <option key={option.id} value={option.id}>
            {t(option.labelKey)}
          </option>
        ))}
      </MacosPopupSelect>
    </div>
  );
}

async function syncNativeTheme(preference: ThemePreference) {
  try {
    await getCurrentWindow().setTheme(
      preference === "system" ? null : preference,
    );
  } catch {
    // Theme API may be unavailable in tests or restricted runtimes.
  }
}
