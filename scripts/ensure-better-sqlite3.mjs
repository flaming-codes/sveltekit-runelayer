import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const runelayerPackageJsonPath = path.join(repoRoot, "packages/sveltekit-runelayer/package.json");

if (!existsSync(runelayerPackageJsonPath)) {
  process.exit(0);
}

const requireFromRunelayer = createRequire(runelayerPackageJsonPath);

function openInMemoryDatabase() {
  try {
    const Database = requireFromRunelayer("better-sqlite3");
    const db = new Database(":memory:");
    db.prepare("select 1").get();
    db.close();
    return { ok: true };
  } catch (error) {
    return { ok: false, error };
  }
}

function readErrorMessage(error) {
  if (error && typeof error === "object" && "message" in error) {
    return String(error.message);
  }

  return String(error);
}

function isAbiMismatch(error) {
  const message = readErrorMessage(error);
  return message.includes("better_sqlite3.node") && message.includes("NODE_MODULE_VERSION");
}

function rebuildBetterSqlite3() {
  const pnpmCommand = process.platform === "win32" ? "pnpm.cmd" : "pnpm";

  return spawnSync(
    pnpmCommand,
    ["--filter", "@flaming-codes/sveltekit-runelayer", "rebuild", "better-sqlite3"],
    {
      cwd: repoRoot,
      stdio: "inherit",
    },
  );
}

const loadAttempt = openInMemoryDatabase();

if (loadAttempt.ok) {
  process.exit(0);
}

if (!isAbiMismatch(loadAttempt.error)) {
  console.error("[runekit] Failed to load better-sqlite3 before starting dev server.");
  console.error(loadAttempt.error);
  process.exit(1);
}

console.log(
  `[runekit] better-sqlite3 ABI mismatch detected for Node ${process.version} (NODE_MODULE_VERSION ${process.versions.modules}). Rebuilding...`,
);

const rebuildResult = rebuildBetterSqlite3();

if (rebuildResult.error) {
  console.error("[runekit] Failed to run pnpm rebuild for better-sqlite3.");
  console.error(rebuildResult.error);
  process.exit(1);
}

if (typeof rebuildResult.status === "number" && rebuildResult.status !== 0) {
  process.exit(rebuildResult.status);
}

const verifyAttempt = openInMemoryDatabase();

if (!verifyAttempt.ok) {
  console.error("[runekit] Rebuild completed but better-sqlite3 still failed to load.");
  console.error(verifyAttempt.error);
  process.exit(1);
}

console.log("[runekit] better-sqlite3 rebuilt successfully.");
