const BUTTON_SELECTOR =
  "button.primary, button.secondary, button.icon-button, button.topbar-control, button.toggle-switch";

/**
 * Pointer-down shows the hover treatment; pointer-up flashes the click
 * treatment. Keeps actions on click/release (Apple-style press preview).
 */
export function installPressFeedback(root: ParentNode = document): () => void {
  let pressed: HTMLElement | null = null;
  let clickTimer: number | undefined;

  function targetButton(eventTarget: EventTarget | null): HTMLElement | null {
    if (!(eventTarget instanceof Element)) return null;
    const button = eventTarget.closest<HTMLElement>(BUTTON_SELECTOR);
    if (!button || button.disabled) return null;
    return button;
  }

  function clearClickTimer() {
    if (clickTimer !== undefined) {
      window.clearTimeout(clickTimer);
      clickTimer = undefined;
    }
  }

  function onPointerDown(event: PointerEvent) {
    // Some synthetic test events omit `button`; treat those as primary click.
    if (event.button != null && event.button !== 0) return;
    const button = targetButton(event.target);
    if (!button) return;
    clearClickTimer();
    if (pressed && pressed !== button) {
      delete pressed.dataset.press;
    }
    pressed = button;
    button.dataset.press = "hover";
  }

  function onPointerUp(event: PointerEvent) {
    if (!pressed || pressed.dataset.press !== "hover") {
      pressed = null;
      return;
    }
    const button = pressed;
    pressed = null;
    const releasedOnButton =
      event.target instanceof Node && button.contains(event.target);
    if (!releasedOnButton) {
      delete button.dataset.press;
      return;
    }
    // Toggles commit on release — drop press chrome immediately so the new
    // on/off color is not mixed with a lingering click flash.
    if (button.classList.contains("toggle-switch")) {
      delete button.dataset.press;
      return;
    }
    button.dataset.press = "click";
    clearClickTimer();
    clickTimer = window.setTimeout(() => {
      if (button.dataset.press === "click") {
        delete button.dataset.press;
      }
      clickTimer = undefined;
    }, 140);
  }

  function onPointerCancel() {
    if (!pressed) return;
    delete pressed.dataset.press;
    pressed = null;
    clearClickTimer();
  }

  root.addEventListener("pointerdown", onPointerDown, true);
  window.addEventListener("pointerup", onPointerUp, true);
  window.addEventListener("pointercancel", onPointerCancel, true);

  return () => {
    clearClickTimer();
    if (pressed) delete pressed.dataset.press;
    pressed = null;
    root.removeEventListener("pointerdown", onPointerDown, true);
    window.removeEventListener("pointerup", onPointerUp, true);
    window.removeEventListener("pointercancel", onPointerCancel, true);
  };
}
