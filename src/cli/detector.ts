import { execSync } from "child_process";
import { existsSync } from "fs";
import { join } from "path";

export interface QitCliInfo {
  path: string;
  version: string;
}

/**
 * Detects QIT CLI location in order of priority:
 * 1. QIT_CLI_PATH environment variable
 * 2. 'qit' in system PATH
 * 3. './vendor/bin/qit' (local composer installation)
 */
export function detectQitCli(): QitCliInfo | null {
  const candidates: string[] = [];

  // 1. Check environment variable first
  if (process.env.QIT_CLI_PATH) {
    candidates.push(process.env.QIT_CLI_PATH);
  }

  // 2. Check system PATH
  candidates.push("qit");

  // 3. Check local composer installation
  const localPaths = [
    "./vendor/bin/qit",
    join(process.cwd(), "vendor/bin/qit"),
  ];
  candidates.push(...localPaths);

  for (const candidate of candidates) {
    const result = tryQitPath(candidate);
    if (result) {
      return result;
    }
  }

  return null;
}

function tryQitPath(path: string): QitCliInfo | null {
  try {
    // For absolute/relative paths, check if file exists first
    if (path.includes("/") || path.includes("\\")) {
      if (!existsSync(path)) {
        return null;
      }
    }

    // Try to get version to verify it's a working QIT CLI
    const version = execSync(`${path} --version 2>/dev/null`, {
      encoding: "utf-8",
      timeout: 5000,
    }).trim();

    return { path, version };
  } catch {
    return null;
  }
}

export function getQitCliNotFoundError(): string {
  return `QIT CLI not found. Please install it using one of these methods:

1. Via Composer (recommended):
   composer require woocommerce/qit-cli --dev

2. Set QIT_CLI_PATH environment variable:
   export QIT_CLI_PATH=/path/to/qit

3. Ensure 'qit' is available in your system PATH

For more information, visit: https://github.com/woocommerce/qit-cli`;
}
