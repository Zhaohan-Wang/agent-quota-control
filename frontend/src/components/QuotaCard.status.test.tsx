import { screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { renderWithI18n as render } from "../test/render";
import type { CardSnapshot, SufficiencyState } from "../types";
import { QuotaCard } from "./QuotaCard";

function cardWithState(state: SufficiencyState): CardSnapshot {
  return {
    accountId: "acct",
    service: "kimi",
    serviceDisplayName: "Kimi Code",
    accountDisplayName: "测试账号",
    status: "fresh",
    tiers: [{ name: "weekly_limit", utilization: 40, resetsAt: null }],
    weeklyEstimate: { state },
    proxy: { status: "direct", proxyUrl: null, message: "Direct" },
    queriedAt: Date.now(),
    lastSuccessfulAt: Date.now(),
    errorMessage: null,
  };
}

describe("QuotaCard status badge icons", () => {
  it.each([
    ["enough", "余量充足", "lucide-circle-check"],
    ["tight", "余量较少", "lucide-circle-alert"],
    ["not_enough", "可能不足", "lucide-circle-x"],
    ["unknown", "正在分析", "lucide-circle-dashed"],
  ] as const)(
    "uses a meaningful icon for %s",
    (state, label, iconClass) => {
      const { container } = render(
        <QuotaCard card={cardWithState(state)} iconSrc="icon.png" />,
      );

      const badge = container.querySelector(`.status-badge.${state}`);
      expect(badge).not.toBeNull();
      expect(screen.getByText(label)).toBeInTheDocument();
      const svg = badge?.querySelector("svg");
      expect(svg?.getAttribute("class") ?? "").toContain(iconClass);
    },
  );

  it("describes a forecast as a forecast, not a completed exhaustion", () => {
    render(
      <QuotaCard
        card={{
          ...cardWithState("not_enough"),
          weeklyEstimate: {
            state: "not_enough",
            projectedUtilization: 110,
            lastsForSecs: 7_200,
            exhaustedBeforeResetSecs: 86_400,
          },
        }}
        iconSrc="icon.png"
      />,
    );

    expect(
      screen.getByText("按照目前的用量，预计还可使用约 2 小时。"),
    ).toBeInTheDocument();
    expect(screen.queryByText(/本周期已/)).not.toBeInTheDocument();
  });

  it("uses past tense only after exhaustion has actually happened", () => {
    render(
      <QuotaCard
        card={{
          ...cardWithState("not_enough"),
          weeklyEstimate: {
            state: "not_enough",
            projectedUtilization: 100,
            exhaustedAtSecs: Math.floor(Date.now() / 1_000) - 60,
            exhaustedBeforeResetSecs: 86_400,
          },
        }}
        iconSrc="icon.png"
      />,
    );

    expect(
      screen.getByText("本周期用量已在重置前约 1 天达到上限。"),
    ).toBeInTheDocument();
  });
});
