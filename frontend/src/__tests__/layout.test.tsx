// @ts-expect-error Vitest runs this regression check in Node.
import { readFileSync } from "node:fs";
// @ts-expect-error Vitest runs this regression check in Node.
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

describe("dashboard card layout", () => {
  it("lets trend data ink scale with the chart instead of pinning stroke width", () => {
    const styles = readFileSync(resolve("src/styles.css"), "utf8");
    const observedRule = styles.match(
      /\.trend-observed-line,\s*\n\.trend-projected-line\s*\{([^}]*)\}/,
    )?.[1];
    const pointRule = styles.match(/\.trend-observed-point\s*\{([^}]*)\}/)?.[1];

    expect(observedRule).toBeDefined();
    expect(observedRule).not.toMatch(/vector-effect:\s*non-scaling-stroke/);
    expect(pointRule).not.toMatch(/vector-effect:\s*non-scaling-stroke/);
    expect(styles).toMatch(
      /\.trend-grid-line,\s*\n\.trend-now-line\s*\{[^}]*vector-effect:\s*non-scaling-stroke/,
    );
  });

  it("lets quota cards grow with their chart and status content", () => {
    const styles = readFileSync(resolve("src/styles.css"), "utf8");
    const quotaCardRule = styles.match(/\.quota-card\s*\{([^}]*)\}/)?.[1];
    const gridRule = styles.match(/\.dashboard-grid\s*\{([^}]*)\}/)?.[1];

    expect(quotaCardRule).toBeDefined();
    expect(quotaCardRule).not.toMatch(/(?:^|\n)\s*height:\s*100%;/);
    expect(quotaCardRule).toMatch(/height:\s*auto;/);
    expect(quotaCardRule).not.toMatch(/min-height:\s*0;/);
    expect(gridRule).toMatch(/grid-auto-rows:\s*auto;/);
  });

  it("keeps populated quota tiers at a consistent row height", () => {
    const styles = readFileSync(resolve("src/styles.css"), "utf8");
    const tierRowRule = styles.match(/\.tier-row\s*\{([^}]*)\}/)?.[1];

    expect(tierRowRule).toMatch(/min-height:\s*57px;/);
    expect(styles).not.toMatch(/\.tier-unavailable\s*\{/);
  });

  it("keeps the content grid item constrained so the inner view can scroll", () => {
    const styles = readFileSync(resolve("src/styles.css"), "utf8");
    const contentRule = styles.match(/\.content\s*\{([^}]*)\}/)?.[1];
    const scrollerRule = styles.match(/\.content-scroll\s*\{([^}]*)\}/)?.[1];
    const bodyRule = styles.match(/\.content-scroll-body\s*\{([^}]*)\}/)?.[1];
    const trackRule = styles.match(
      /\.content-scroll::-webkit-scrollbar-track\s*\{([^}]*)\}/,
    )?.[1];
    const thumbHoverRule = styles.match(
      /\.content-scroll::-webkit-scrollbar-thumb:hover,\s*\n\.content-scroll::-webkit-scrollbar-thumb:active\s*\{([^}]*)\}/,
    )?.[1];

    expect(contentRule).toMatch(/min-height:\s*0;/);
    expect(contentRule).toMatch(/height:\s*calc\(100% \+ var\(--window-inset\)\);/);
    expect(contentRule).toMatch(/margin-bottom:\s*calc\(-1 \* var\(--window-inset\)\);/);
    expect(scrollerRule).toMatch(/min-height:\s*0;/);
    expect(scrollerRule).toMatch(/overflow:\s*auto;/);
    expect(scrollerRule).toMatch(/margin-right:\s*calc\(-1 \* var\(--window-inset\)\);/);
    expect(scrollerRule).toMatch(/mask-image:/);
    expect(scrollerRule).toMatch(
      /mask-size:\s*calc\(100% - var\(--scrollbar-reserve\)\) 100%,\s*\n\s*var\(--scrollbar-reserve\) 100%;/,
    );
    expect(bodyRule).not.toMatch(/mask-image:/);
    expect(trackRule).toMatch(/margin-top:\s*52px;/);
    expect(thumbHoverRule).not.toMatch(/transform:\s*scale/);
    expect(thumbHoverRule).toMatch(/width:\s*8px;/);
    expect(styles).toMatch(/--scrollbar-thumb:\s*#9b9b9b;/);
    expect(styles).toMatch(/--scrollbar-reserve:\s*12px;/);
  });

  it("keeps top chrome clear of the native scrollbar strip", () => {
    const styles = readFileSync(resolve("src/styles.css"), "utf8");
    const topbarRule = styles.match(/\.topbar\s*\{([^}]*)\}/)?.[1];
    const edgeRule = styles.match(/\.scroll-edge-effect\s*\{([^}]*)\}/)?.[1];

    expect(topbarRule).toMatch(/right:\s*var\(--scrollbar-reserve\);/);
    expect(edgeRule).toMatch(
      /width:\s*calc\(100% - var\(--scrollbar-reserve\)\);/,
    );
  });

  it("uses native non-selectable text while keeping form controls editable", () => {
    const styles = readFileSync(resolve("src/styles.css"), "utf8");
    const bodyRule = styles.match(/body\s*\{([^}]*)\}/)?.[1];
    const buttonRule = styles.match(/button\s*\{([^}]*)\}/)?.[1];

    expect(bodyRule).toMatch(/user-select:\s*none;/);
    expect(buttonRule).toMatch(/cursor:\s*default;/);
    expect(buttonRule).toMatch(/user-select:\s*none;/);
    expect(styles).toMatch(/input,\s*\ntextarea,\s*\nselect\s*\{[^}]*user-select:\s*text;/);
  });

  it("keeps the glass toolbar top-aligned while centering the title to it", () => {
    const styles = readFileSync(resolve("src/styles.css"), "utf8");
    const topbarRule = styles.match(/\.topbar\s*\{([^}]*)\}/)?.[1];
    const titleRule = styles.match(/\.topbar-title\s*\{([^}]*)\}/)?.[1];
    const controlsRule = styles.match(/\.topbar-actions\s*\{([^}]*)\}/)?.[1];

    expect(topbarRule).toMatch(/top:\s*0;/);
    expect(topbarRule).toMatch(/align-items:\s*flex-start;/);
    expect(topbarRule).toMatch(/min-height:\s*52px;/);
    expect(topbarRule).toMatch(/padding:\s*0 10px 0 8px;/);
    expect(controlsRule).toMatch(/min-height:\s*42px;/);
    expect(controlsRule).toMatch(/margin-left:\s*-10px;/);
    expect(titleRule).toMatch(/min-height:\s*42px;/);
    expect(titleRule).toMatch(/align-items:\s*center;/);
  });

  it("removes the dark sidebar border when the window is inactive", () => {
    const styles = readFileSync(resolve("src/styles.css"), "utf8");
    expect(styles).toMatch(
      /:root\[data-theme="dark"\] \.window-inactive \.sidebar[\s\S]*?border-color:\s*transparent;/,
    );
  });

  it("keeps settings group titles outside and aligned with row text", () => {
    const styles = readFileSync(resolve("src/styles.css"), "utf8");
    const groupTitle = styles.match(/\.settings-group-title\s*\{([^}]*)\}/)?.[1];
    const groupPanel = styles.match(
      /\.settings-group-panel\.panel\s*\{([^}]*)\}/,
    )?.[1];
    const rowLabel = styles.match(/\.switch-row strong\s*\{([^}]*)\}/)?.[1];

    expect(groupTitle).toMatch(/font-size:\s*13px;/);
    expect(groupTitle).toMatch(/font-weight:\s*650;/);
    expect(groupTitle).toMatch(/padding:\s*0 var\(--card-pad\);/);
    expect(rowLabel).toMatch(/font-size:\s*13px;/);
    expect(groupPanel).toMatch(/padding:\s*0;/);
  });

  it("fades card content, brand mark, and sidebar directory when inactive", () => {
    const styles = readFileSync(resolve("src/styles.css"), "utf8");
    const inactiveContent = styles.match(
      /\.window-inactive \.quota-card > \*,\s*\n\.window-inactive \.panel > \*,\s*\n\.window-inactive \.dashboard-empty > \*\s*\{([^}]*)\}/,
    )?.[1];
    const inactiveBrand = styles.match(
      /\.window-inactive \.brand-mark\s*\{([^}]*)\}/,
    )?.[1];
    const inactiveNav = styles.match(
      /\.window-inactive \.brand-copy,\s*\n\.window-inactive \.sidebar nav \.nav-item\s*\{([^}]*)\}/,
    )?.[1];

    expect(inactiveContent).toMatch(/opacity:\s*0\.48;/);
    expect(inactiveBrand).toMatch(/opacity:\s*0\.45;/);
    expect(inactiveNav).toMatch(/opacity:\s*0\.48;/);
    expect(styles).not.toMatch(
      /\.window-inactive \.quota-card,\s*\n\.window-inactive \.panel/,
    );
  });

  it("styles settings controls for press feedback, contrast, and inactive primary", () => {
    const styles = readFileSync(resolve("src/styles.css"), "utf8");
    const primaryPress = styles.match(
      /\.primary\[data-press="hover"\]:not\(:disabled\)\s*\{([^}]*)\}/,
    )?.[1];
    const primaryClick = styles.match(
      /\.primary\[data-press="click"\]:not\(:disabled\)\s*\{([^}]*)\}/,
    )?.[1];
    const inactivePrimary = styles.match(
      /\.window-inactive \.primary\s*\{([^}]*)\}/,
    )?.[1];
    const nestedRow = styles.match(
      /\.settings-group-panel > \.settings-nested-row\s*\{([^}]*)\}/,
    )?.[1];
    const groupRow = styles.match(
      /\.settings-group-panel > \.switch-row,\s*\n\.settings-group-panel > \.settings-group-row\s*\{([^}]*)\}/,
    )?.[1];

    expect(primaryPress).toMatch(/background:/);
    expect(primaryClick).toMatch(/background:/);
    expect(styles).not.toMatch(/\.primary:hover/);
    expect(styles).not.toMatch(/\.toggle-switch:hover/);
    expect(inactivePrimary).toMatch(/background:\s*var\(--control-solid\);/);
    expect(styles).not.toMatch(/\.proxy-editor\s*\{/);
    expect(groupRow).toMatch(/min-height:\s*44px;/);
    expect(groupRow).toMatch(/padding:\s*11px var\(--card-pad\);/);
    expect(nestedRow).toMatch(/padding-left:\s*calc\(var\(--card-pad\) \+ 40px\);/);
    expect(styles).not.toMatch(
      /\.settings-group-panel > \.settings-subtitle-row\s*\{[^}]*min-height:/,
    );
    expect(styles).toMatch(
      /\.settings-subtitle-label,\s*\n\.settings-row-label\s*\{[^}]*font-weight:\s*400;/,
    );
    expect(styles).toMatch(
      /:root\[data-theme="dark"\] \.segmented button\.active\s*\{[^}]*background:\s*#4a4949;/,
    );
    expect(styles).toMatch(/:root\[data-theme="dark"\]\s*\{/);
    expect(styles).toMatch(/--bg:\s*#ffffff;/);
    expect(styles).toMatch(/--panel-radius:\s*10px;/);
    expect(styles).toMatch(/--shadow-card:\s*0 0 0 0\.5px rgba\(0, 0, 0, 0\.06\);/);
  });

  it("keeps macOS popup selects width-stable with circle-to-rect hover", () => {
    const styles = readFileSync(resolve("src/styles.css"), "utf8");
    const popup = styles.match(/\.macos-popup\s*\{([^}]*)\}/)?.[1];
    const select = styles.match(/\.macos-popup select\s*\{([^}]*)\}/)?.[1];
    const indicator = styles.match(
      /\.macos-popup-indicator\s*\{([^}]*)\}/,
    )?.[1];
    const indicatorHover = styles.match(
      /\.macos-popup:hover \.macos-popup-indicator,\s*\n\.macos-popup:has\(select:active\) \.macos-popup-indicator\s*\{([^}]*)\}/,
    )?.[1];

    expect(popup).toMatch(/display:\s*inline-flex;/);
    expect(popup).toMatch(/background:\s*transparent;/);
    expect(select).toMatch(/width:\s*auto;/);
    expect(select).toMatch(/color:\s*var\(--text\);/);
    expect(indicator).toMatch(/border-radius:\s*999px;/);
    expect(indicatorHover).toMatch(/border-radius:\s*4px;/);
    expect(styles).toMatch(/\.macos-popup:hover\s*\{[^}]*background:/);
    expect(styles).not.toMatch(/\.macos-popup:focus-within/);
  });

  it("uses one top divider for each overview forecast state", () => {
    const styles = readFileSync(resolve("src/styles.css"), "utf8");
    const trend = styles.match(/\.usage-trend\s*\{([^}]*)\}/)?.[1];
    const estimate = styles.match(/\.estimate-note\s*\{([^}]*)\}/)?.[1];
    const pending = styles.match(/\.trend-pending\s*\{([^}]*)\}/)?.[1];

    expect(trend).toMatch(/border-top:\s*1px solid var\(--separator\);/);
    expect(estimate).toMatch(/border-top:\s*1px solid var\(--separator\);/);
    expect(pending).toMatch(/border-top:\s*1px solid var\(--separator\);/);
    expect(trend).not.toMatch(/border-bottom:/);
    expect(estimate).not.toMatch(/border-bottom:/);
    expect(pending).not.toMatch(/border-bottom:/);
  });
});
