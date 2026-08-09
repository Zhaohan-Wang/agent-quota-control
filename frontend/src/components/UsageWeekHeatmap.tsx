import { useId, useState } from "react";
import { useTranslations } from "../i18n";
import type { UsageWeekDay } from "../types";

interface UsageWeekHeatmapProps {
  days: UsageWeekDay[];
  /** Nest under the 7-day meter: fill that column, no side caption. */
  embedded?: boolean;
}

export function UsageWeekHeatmap({
  days,
  embedded = false,
}: UsageWeekHeatmapProps) {
  const t = useTranslations("dashboard");
  const tipId = useId();
  const [activeIndex, setActiveIndex] = useState<number | null>(null);

  if (days.length === 0) return null;

  const maxBurn = Math.max(...days.map((day) => day.burnPct), 0);
  const activeDay = activeIndex == null ? null : days[activeIndex];
  const activeTip =
    activeDay == null
      ? null
      : t("usage_week_day_aria", {
          date: formatDay(activeDay.dayStartSecs),
          burn: formatBurn(activeDay.burnPct),
        });

  return (
    <div
      className={embedded ? "usage-week usage-week-embedded" : "usage-week"}
      aria-label={t("usage_week_aria")}
    >
      <div className="usage-week-track">
        <div className="usage-week-cells">
          {days.map((day, index) => {
            const level = burnLevel(day.burnPct, maxBurn);
            const label = t("usage_week_day_aria", {
              date: formatDay(day.dayStartSecs),
              burn: formatBurn(day.burnPct),
            });
            return (
              <button
                key={day.dayStartSecs}
                type="button"
                className={`usage-week-cell level-${level}`}
                aria-label={label}
                aria-describedby={
                  activeIndex === index ? tipId : undefined
                }
                onMouseEnter={() => setActiveIndex(index)}
                onMouseLeave={() => setActiveIndex(null)}
                onFocus={() => setActiveIndex(index)}
                onBlur={() => setActiveIndex(null)}
              />
            );
          })}
        </div>
        {activeTip ? (
          <div id={tipId} role="tooltip" className="usage-week-tip">
            {activeTip}
          </div>
        ) : null}
      </div>
      {!embedded ? (
        <span className="usage-week-caption">{t("usage_week_caption")}</span>
      ) : null}
    </div>
  );
}

function formatDay(dayStartSecs: number): string {
  const date = new Date(dayStartSecs * 1_000);
  return `${date.getMonth() + 1}/${date.getDate()}`;
}

function burnLevel(burnPct: number, maxBurn: number): number {
  if (burnPct <= 0 || maxBurn <= 0) return 0;
  const ratio = burnPct / maxBurn;
  if (ratio < 0.25) return 1;
  if (ratio < 0.5) return 2;
  if (ratio < 0.75) return 3;
  return 4;
}

function formatBurn(burnPct: number): string {
  if (burnPct <= 0) return "0";
  return Number.isInteger(burnPct) ? String(burnPct) : burnPct.toFixed(1);
}
