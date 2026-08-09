import { fireEvent, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { renderWithI18n as render } from "../test/render";
import type { QuotaEstimate } from "../types";
import { UsageTrendChart } from "./UsageTrendChart";

const NOW = 1_700_000_000;

function trendEstimate(overrides: Partial<QuotaEstimate> = {}): QuotaEstimate {
  return {
    state: "not_enough",
    projectedUtilization: 108,
    resetInSecs: 97_200,
    lastsForSecs: 64_800,
    slopePctPerHour: 1.4,
    trendWindowHours: 24,
    observedSpanSecs: 86_400,
    windowStartSecs: NOW - 6 * 86_400,
    windowEndSecs: NOW + 97_200,
    observedPoints: [
      { observedAtSecs: NOW - 86_400, utilization: 20 },
      { observedAtSecs: NOW - 43_200, utilization: 24 },
      { observedAtSecs: NOW, utilization: 70 },
    ],
    projectedPoints: [
      { observedAtSecs: NOW, utilization: 70 },
      { observedAtSecs: NOW + 64_800, utilization: 100 },
    ],
    ...overrides,
  };
}

describe("UsageTrendChart", () => {
  it("renders a forecast-first report without web-style tags", () => {
    render(<UsageTrendChart estimate={trendEstimate()} nowSecs={NOW} />);

    expect(
      screen.getByRole("img", { name: /7 天用量趋势.*当前已用.*预计将达到/ }),
    ).toBeInTheDocument();
    expect(
      screen.getByText("按照目前的用量，预计还可使用约 18 小时。"),
    ).toBeInTheDocument();
    expect(screen.queryByText(/根据最近/)).not.toBeInTheDocument();
    expect(screen.queryByText(/提前/)).not.toBeInTheDocument();
    expect(document.querySelector(".trend-outcome")).toBeNull();
    expect(document.querySelector(".trend-exhaustion-point")).not.toBeNull();
    const report = document.querySelector(".trend-report");
    const figure = document.querySelector(".usage-trend-figure");
    expect(report).not.toBeNull();
    expect(figure).not.toBeNull();
    expect(
      report && figure
        ? report.compareDocumentPosition(figure) & Node.DOCUMENT_POSITION_FOLLOWING
        : 0,
    ).toBeTruthy();
    expect(
      screen.getByTestId("observed-usage-line").getAttribute("stroke"),
    ).toMatch(/^url\(#trend-stroke-/);
  });

  it("keeps past-tense copy only when exhaustion already happened", () => {
    render(
      <UsageTrendChart
        estimate={trendEstimate({
          exhaustedAtSecs: NOW - 3_600,
          exhaustedBeforeResetSecs: 86_400,
          lastsForSecs: 200_000,
          projectedPoints: [
            { observedAtSecs: NOW - 10_000, utilization: 100 },
            { observedAtSecs: NOW, utilization: 100 },
          ],
        })}
        nowSecs={NOW}
      />,
    );

    expect(screen.getByText("本周期已在重置前用完")).toBeInTheDocument();
    expect(screen.getByText("比本周期重置时间早约 1 天")).toBeInTheDocument();
    expect(screen.queryByText(/预计还可使用/)).not.toBeInTheDocument();
  });

  it("labels a healthy forecast with projected reset usage", () => {
    render(
      <UsageTrendChart
        estimate={trendEstimate({
          state: "enough",
          projectedUtilization: 62,
          lastsForSecs: 200_000,
          slopePctPerHour: 12,
          trendWindowHours: 24,
          observedSpanSecs: 1_200,
          observedPoints: [
            { observedAtSecs: NOW - 1_200, utilization: 46 },
            { observedAtSecs: NOW - 900, utilization: 47 },
            { observedAtSecs: NOW - 600, utilization: 48 },
            { observedAtSecs: NOW - 300, utilization: 49 },
            { observedAtSecs: NOW, utilization: 50 },
          ],
          projectedPoints: [
            { observedAtSecs: NOW, utilization: 50 },
            { observedAtSecs: NOW + 86_400, utilization: 62 },
          ],
        })}
        nowSecs={NOW}
      />,
    );

    expect(
      screen.getByText("按照目前的用量，重置时预计约为 62%。"),
    ).toBeInTheDocument();
    expect(screen.queryByText(/根据最近/)).not.toBeInTheDocument();
  });

  it("shows observed history without inventing a projection while samples accumulate", () => {
    render(
      <UsageTrendChart
        estimate={trendEstimate({
          state: "unknown",
          projectedUtilization: null,
          lastsForSecs: null,
          slopePctPerHour: null,
          trendWindowHours: null,
          projectedPoints: [],
        })}
        nowSecs={NOW}
      />,
    );

    expect(screen.getByText("正在分析用量…")).toBeInTheDocument();
    expect(screen.getByTestId("observed-usage-line")).toBeInTheDocument();
    expect(screen.queryByTestId("projected-usage-line")).not.toBeInTheDocument();
  });

  it("keeps quiet chrome without a now label or red 100% limit line", () => {
    render(
      <UsageTrendChart
        estimate={trendEstimate({
          windowStartSecs: NOW,
          windowEndSecs: NOW + 7 * 86_400,
          observedPoints: [
            { observedAtSecs: NOW, utilization: 0 },
            { observedAtSecs: NOW + 300, utilization: 1 },
          ],
          projectedPoints: [
            { observedAtSecs: NOW + 300, utilization: 1 },
            { observedAtSecs: NOW + 28_800, utilization: 100 },
          ],
        })}
        nowSecs={NOW}
      />,
    );

    expect(screen.queryByText("现在")).not.toBeInTheDocument();
    expect(document.querySelector(".trend-limit-line")).toBeNull();
    expect(screen.getByText("100%")).toBeInTheDocument();
    expect(screen.queryByText("50%")).not.toBeInTheDocument();
    expect(document.querySelector(".trend-now-line")).not.toBeNull();
    // Only the 0% baseline — a top grid line reads as a second divider.
    expect(document.querySelectorAll(".trend-grid-line")).toHaveLength(1);
  });

  it("shows a hover tip for the nearest sample on the chart", () => {
    render(<UsageTrendChart estimate={trendEstimate()} nowSecs={NOW} />);

    const svg = document.querySelector(
      ".usage-trend-chart",
    ) as SVGSVGElement | null;
    expect(svg).not.toBeNull();
    if (!svg) return;

    vi.spyOn(svg, "getBoundingClientRect").mockReturnValue({
      x: 0,
      y: 0,
      top: 0,
      left: 0,
      right: 320,
      bottom: 120,
      width: 320,
      height: 120,
      toJSON: () => ({}),
    });

    // Left side of the plot → observed series.
    fireEvent.mouseMove(svg, { clientX: 24, clientY: 40 });
    expect(screen.getByRole("tooltip")).toHaveTextContent(/用量为/);
    expect(screen.getByTestId("trend-hover-mark")).toBeInTheDocument();

    // Right of the “now” marker → projected series (“预计”).
    fireEvent.mouseMove(svg, { clientX: 300, clientY: 40 });
    expect(screen.getByRole("tooltip")).toHaveTextContent(/预计/);

    fireEvent.mouseLeave(svg);
    expect(screen.queryByRole("tooltip")).toBeNull();
  });

  it("uses a compact pending state instead of an empty chart for a single sample", () => {
    render(
      <UsageTrendChart
        estimate={trendEstimate({
          state: "unknown",
          projectedUtilization: null,
          lastsForSecs: null,
          slopePctPerHour: null,
          trendWindowHours: null,
          observedPoints: [{ observedAtSecs: NOW, utilization: 26 }],
          projectedPoints: [],
        })}
        nowSecs={NOW}
      />,
    );

    expect(screen.getByRole("status")).toHaveTextContent("正在分析用量");
    expect(
      screen.getByText("收集更多用量数据后，将显示趋势预测。"),
    ).toBeInTheDocument();
    expect(screen.queryByRole("img")).not.toBeInTheDocument();
    expect(document.querySelector(".usage-trend")).toBeNull();
  });
});
