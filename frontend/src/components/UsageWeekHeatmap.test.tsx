import { fireEvent, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { renderWithI18n as render } from "../test/render";
import { UsageWeekHeatmap } from "./UsageWeekHeatmap";

describe("UsageWeekHeatmap", () => {
  it("renders seven activity cells with a quiet caption", () => {
    const days = Array.from({ length: 7 }, (_, index) => ({
      dayStartSecs: 1_700_000_000 - (6 - index) * 86_400,
      burnPct: [0, 1, 2, 4, 0, 8, 3][index],
    }));

    render(<UsageWeekHeatmap days={days} />);

    expect(screen.getByLabelText("近 7 日用量")).toBeInTheDocument();
    expect(screen.getByText("近 7 日")).toBeInTheDocument();
    expect(document.querySelectorAll(".usage-week-cell")).toHaveLength(7);
    expect(document.querySelector(".usage-week-cell.level-0")).not.toBeNull();
    expect(document.querySelector(".usage-week-cell.level-4")).not.toBeNull();
  });

  it("embeds under the weekly meter without a side caption", () => {
    const days = Array.from({ length: 7 }, (_, index) => ({
      dayStartSecs: 1_700_000_000 - (6 - index) * 86_400,
      burnPct: [0, 1, 2, 4, 0, 8, 3][index],
    }));

    render(<UsageWeekHeatmap days={days} embedded />);

    expect(screen.getByLabelText("近 7 日用量")).toBeInTheDocument();
    expect(screen.queryByText("近 7 日")).not.toBeInTheDocument();
    expect(document.querySelector(".usage-week-embedded")).not.toBeNull();
  });

  it("shows a tip while hovering a cell", () => {
    const days = Array.from({ length: 7 }, (_, index) => ({
      dayStartSecs: 1_700_000_000 - (6 - index) * 86_400,
      burnPct: [0, 1, 2, 4, 0, 8, 3][index],
    }));

    render(<UsageWeekHeatmap days={days} />);

    const hotCell = screen.getByLabelText(/约增加 8%/);
    fireEvent.mouseEnter(hotCell);
    expect(screen.getByRole("tooltip")).toHaveTextContent(/约增加 8%/);
    fireEvent.mouseLeave(hotCell);
    expect(screen.queryByRole("tooltip")).toBeNull();
  });

  it("renders nothing without days", () => {
    const { container } = render(<UsageWeekHeatmap days={[]} />);
    expect(container).toBeEmptyDOMElement();
  });
});
