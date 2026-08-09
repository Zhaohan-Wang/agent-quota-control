import { fireEvent } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { installPressFeedback } from "../pressFeedback";

describe("pressFeedback", () => {
  afterEach(() => {
    document.body.innerHTML = "";
  });

  it("previews hover on press and flashes click on release", () => {
    vi.useFakeTimers();
    const button = document.createElement("button");
    button.className = "secondary";
    document.body.append(button);

    const dispose = installPressFeedback(document);

    fireEvent.pointerDown(button, { button: 0 });
    expect(button.dataset.press).toBe("hover");

    fireEvent.pointerUp(button, { button: 0 });
    expect(button.dataset.press).toBe("click");

    vi.advanceTimersByTime(140);
    expect(button.dataset.press).toBeUndefined();

    dispose();
    vi.useRealTimers();
  });

  it("previews toggle press then clears cleanly without a click aftertaste", () => {
    const button = document.createElement("button");
    button.className = "toggle-switch on";
    document.body.append(button);

    const dispose = installPressFeedback(document);
    fireEvent.pointerDown(button, { button: 0 });
    expect(button.dataset.press).toBe("hover");

    fireEvent.pointerUp(button, { button: 0 });
    expect(button.dataset.press).toBeUndefined();

    dispose();
  });

  it("clears hover without click flash when released outside", () => {
    const button = document.createElement("button");
    button.className = "secondary";
    document.body.append(button);

    const dispose = installPressFeedback(document);
    fireEvent.pointerDown(button, { button: 0 });
    expect(button.dataset.press).toBe("hover");

    fireEvent.pointerUp(document.body, { button: 0 });
    expect(button.dataset.press).toBeUndefined();

    dispose();
  });
});
