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
    ["enough", "够用", "lucide-circle-check"],
    ["tight", "偏紧", "lucide-circle-alert"],
    ["not_enough", "不够", "lucide-circle-x"],
    ["unknown", "等待数据", "lucide-circle-dashed"],
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
});
