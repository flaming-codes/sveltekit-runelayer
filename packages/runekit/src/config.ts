export interface RunekitConfig {
  /** Base path for the admin UI (default: "/admin") */
  adminPath?: string;
}

export function defineConfig(config: RunekitConfig): RunekitConfig {
  return {
    adminPath: "/admin",
    ...config,
  };
}
