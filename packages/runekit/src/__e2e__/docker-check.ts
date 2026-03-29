/**
 * Docker availability check for testcontainers-based E2E tests.
 *
 * Tests that require Docker (testcontainers) should call `requireDocker()`
 * in their `beforeAll` hook. If Docker is not running, the entire suite
 * is skipped with a clear message instead of failing with a cryptic error.
 */
import { execSync } from "node:child_process";

let _dockerAvailable: boolean | null = null;

/** Returns true if Docker daemon is running and responsive. */
export function isDockerAvailable(): boolean {
  if (_dockerAvailable !== null) return _dockerAvailable;

  try {
    execSync("docker info", { stdio: "ignore", timeout: 5000 });
    _dockerAvailable = true;
  } catch {
    _dockerAvailable = false;
  }

  return _dockerAvailable;
}

/**
 * Call in `beforeAll` to skip the entire suite if Docker is not available.
 * Throws a descriptive error that vitest will report as a skip reason.
 *
 * Usage:
 * ```ts
 * import { requireDocker } from './docker-check.js';
 * beforeAll(() => { requireDocker(); });
 * ```
 */
export function requireDocker(): void {
  if (!isDockerAvailable()) {
    throw new Error(
      [
        "Docker is not running — skipping testcontainers-based tests.",
        "",
        "To run these tests, start Docker Desktop or the Docker daemon:",
        "  macOS:  open -a Docker",
        "  Linux:  sudo systemctl start docker",
        "",
        "These tests use testcontainers to spin up ephemeral services",
        "(PostgreSQL, Mailpit, etc.) for realistic E2E validation.",
      ].join("\n"),
    );
  }
}

/**
 * Vitest-compatible check that returns a describe-compatible skip flag.
 * Use with `describe.skipIf(!isDockerRunning())`.
 */
export function isDockerRunning(): boolean {
  return isDockerAvailable();
}
