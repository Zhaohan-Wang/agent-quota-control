import { invoke } from "@tauri-apps/api/core";
import {
  tryGetFakeDashboard,
  updateFakeDashboard,
} from "./debug/fakeDashboard";
import type {
  DashboardState,
  KimiCredentialBackend,
  ProxySettings,
  ProxyTestResult,
  ServiceProxyConfig,
  StatusBarDisplayConfig,
} from "./types";

async function dashboardOrInvoke(
  command: string,
  args?: Record<string, unknown>,
): Promise<DashboardState> {
  const fake = await tryGetFakeDashboard();
  if (fake) return fake;
  return args === undefined
    ? invoke<DashboardState>(command)
    : invoke<DashboardState>(command, args);
}

async function mutateOrInvoke(
  command: string,
  args: Record<string, unknown>,
  mutate: (state: DashboardState) => void,
): Promise<DashboardState> {
  const fake = await updateFakeDashboard(mutate);
  if (fake) return fake;
  return invoke<DashboardState>(command, args);
}

export const api = {
  getDashboardState: () => dashboardOrInvoke("get_dashboard_state"),
  refreshUsage: () => dashboardOrInvoke("refresh_usage"),
  setSelectedServices: (serviceIds: string[]) =>
    mutateOrInvoke("set_selected_services", { serviceIds }, (state) => {
      state.config.selectedServices = [...serviceIds];
    }),
  setStatusBarServices: (serviceIds: string[]) =>
    mutateOrInvoke("set_status_bar_services", { serviceIds }, (state) => {
      state.config.statusBarServices = [...serviceIds];
    }),
  setStatusBarDisplay: (display: StatusBarDisplayConfig) =>
    mutateOrInvoke("set_status_bar_display", { display }, (state) => {
      state.config.statusBarDisplay = { ...display };
    }),
  saveProxySettings: (settings: ProxySettings) =>
    mutateOrInvoke("save_proxy_settings", { settings }, (state) => {
      state.config.proxy = structuredClone(settings);
    }),
  testProxy: (service: string, config: ServiceProxyConfig) =>
    invoke<ProxyTestResult>("test_proxy", { service, config }),
  saveKimiApiKey: (apiKey: string, backend: KimiCredentialBackend) =>
    mutateOrInvoke("save_kimi_api_key", { apiKey, backend }, (state) => {
      state.config.credentials.kimiBackend = backend;
    }),
  clearKimiApiKey: (backend: KimiCredentialBackend) =>
    mutateOrInvoke("clear_kimi_api_key", { backend }, (state) => {
      state.config.credentials.kimiBackend = backend;
    }),
  addKimiAccount: (
    displayName: string,
    apiKey: string,
    backend: KimiCredentialBackend,
  ) =>
    mutateOrInvoke(
      "add_kimi_account",
      { displayName, apiKey, backend },
      (state) => {
        const id = `fake-kimi-${Date.now()}`;
        state.config.accounts.push({
          id,
          service: "kimi",
          displayName,
          providerIdentityHint: null,
          credentialRef: "fake_kimi",
          enabled: true,
          createdAt: Date.now(),
        });
        state.config.credentials.kimiBackend = backend;
      },
    ),
  importCodexAccount: (displayName: string) =>
    mutateOrInvoke("import_codex_account", { displayName }, (state) => {
      const id = `fake-codex-${Date.now()}`;
      state.config.accounts.push({
        id,
        service: "codex",
        displayName,
        providerIdentityHint: null,
        credentialRef: "fake_codex",
        enabled: true,
        createdAt: Date.now(),
      });
    }),
  renameAccount: (accountId: string, displayName: string) =>
    mutateOrInvoke("rename_account", { accountId, displayName }, (state) => {
      const account = state.config.accounts.find((item) => item.id === accountId);
      if (account) account.displayName = displayName;
      const card = state.cards.find((item) => item.accountId === accountId);
      if (card) card.accountDisplayName = displayName;
    }),
  removeAccount: (accountId: string) =>
    mutateOrInvoke("remove_account", { accountId }, (state) => {
      state.config.accounts = state.config.accounts.filter(
        (item) => item.id !== accountId,
      );
      state.cards = state.cards.filter((item) => item.accountId !== accountId);
    }),
  revealConfigDir: () => invoke<void>("reveal_config_dir"),
};
