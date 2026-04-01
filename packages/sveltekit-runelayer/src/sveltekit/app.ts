import type { RunelayerApp, RunelayerAppConfig } from "./types.js";
import AdminPage from "./AdminPage.svelte";
import { createRunelayerRuntime } from "./runtime.js";

export function createRunelayerApp(config: RunelayerAppConfig): RunelayerApp {
  return createRunelayerRuntime(config, AdminPage);
}
