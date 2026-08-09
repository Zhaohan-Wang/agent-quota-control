import type { DashboardState } from "../types";

const FAKE_STORAGE_KEY = "aqc.fakeDashboard";

/**
 * Local UI debugging only. Never active in production builds.
 * Enable with either:
 * - `VITE_FAKE_DASHBOARD=1` in `frontend/.env.local`
 * - `localStorage.setItem("aqc.fakeDashboard", "1")` then reload
 *
 * Payload lives in gitignored `fake-dashboard.local.ts`.
 * Mutating API calls update an in-memory copy so settings toggles work.
 */
export function isFakeDashboardEnabled(): boolean {
  if (!import.meta.env.DEV) return false;
  // Vitest loads `.env.local`; never let the fixture hijack unit tests.
  if (import.meta.env.MODE === "test" || import.meta.env.VITEST) return false;
  if (import.meta.env.VITE_FAKE_DASHBOARD === "1") return true;
  try {
    return localStorage.getItem(FAKE_STORAGE_KEY) === "1";
  } catch {
    return false;
  }
}

const fakeModules = import.meta.glob<{
  buildFakeDashboardState: (nowMs?: number) => DashboardState;
}>("./fake-dashboard.local.ts");

let fakeState: DashboardState | null = null;

function cloneDashboard(state: DashboardState): DashboardState {
  return structuredClone(state);
}

async function ensureFakeState(nowMs = Date.now()): Promise<DashboardState | null> {
  if (!isFakeDashboardEnabled()) return null;
  if (fakeState) return fakeState;

  const loader = fakeModules["./fake-dashboard.local.ts"];
  if (!loader) {
    console.warn(
      "[fake-dashboard] enabled, but frontend/src/debug/fake-dashboard.local.ts is missing",
    );
    return null;
  }

  const mod = await loader();
  fakeState = mod.buildFakeDashboardState(nowMs);
  return fakeState;
}

export async function tryGetFakeDashboard(
  nowMs = Date.now(),
): Promise<DashboardState | null> {
  const state = await ensureFakeState(nowMs);
  return state ? cloneDashboard(state) : null;
}

/** Apply a local mutation while fake dashboard mode is on. */
export async function updateFakeDashboard(
  mutate: (state: DashboardState) => void,
): Promise<DashboardState | null> {
  const state = await ensureFakeState();
  if (!state) return null;
  mutate(state);
  return cloneDashboard(state);
}
