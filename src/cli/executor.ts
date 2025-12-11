import { spawn } from "child_process";
import { detectQitCli, getQitCliNotFoundError } from "./detector.js";

export interface ExecuteResult {
  success: boolean;
  stdout: string;
  stderr: string;
  exitCode: number;
}

export interface ExecuteOptions {
  timeout?: number;
  cwd?: string;
}

let cachedCliPath: string | null = null;

/**
 * Get the QIT CLI path, using cached value if available
 */
export function getCliPath(): string {
  if (cachedCliPath) {
    return cachedCliPath;
  }

  const cliInfo = detectQitCli();
  if (!cliInfo) {
    throw new Error(getQitCliNotFoundError());
  }

  cachedCliPath = cliInfo.path;
  return cachedCliPath;
}

/**
 * Clear the cached CLI path (useful for testing or re-detection)
 */
export function clearCliCache(): void {
  cachedCliPath = null;
}

/**
 * Execute a QIT CLI command
 */
export async function executeQitCommand(
  args: string[],
  options: ExecuteOptions = {}
): Promise<ExecuteResult> {
  const cliPath = getCliPath();
  const { timeout = 300000, cwd } = options; // Default 5 minute timeout

  return new Promise((resolve) => {
    const process = spawn(cliPath, args, {
      cwd,
      shell: true,
      timeout,
    });

    let stdout = "";
    let stderr = "";

    process.stdout.on("data", (data) => {
      stdout += data.toString();
    });

    process.stderr.on("data", (data) => {
      stderr += data.toString();
    });

    process.on("close", (code) => {
      resolve({
        success: code === 0,
        stdout: stdout.trim(),
        stderr: stderr.trim(),
        exitCode: code ?? 1,
      });
    });

    process.on("error", (error) => {
      resolve({
        success: false,
        stdout: "",
        stderr: error.message,
        exitCode: 1,
      });
    });
  });
}

/**
 * Execute a QIT CLI command and return formatted output for MCP
 */
export async function executeAndFormat(
  args: string[],
  options: ExecuteOptions = {}
): Promise<{ content: string; isError: boolean }> {
  try {
    const result = await executeQitCommand(args, options);

    if (result.success) {
      return {
        content: result.stdout || "Command completed successfully.",
        isError: false,
      };
    } else {
      const errorMessage = result.stderr || result.stdout || "Command failed.";
      return {
        content: `Error (exit code ${result.exitCode}): ${errorMessage}`,
        isError: true,
      };
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return {
      content: `Error: ${message}`,
      isError: true,
    };
  }
}

/**
 * Build command arguments from an options object
 */
export function buildArgs(
  command: string,
  positional: string[] = [],
  flags: Record<string, string | boolean | undefined> = {}
): string[] {
  const args = [command, ...positional];

  for (const [key, value] of Object.entries(flags)) {
    if (value === undefined || value === false) {
      continue;
    }

    // QIT CLI uses underscores in flag names (e.g., --php_version, not --php-version)
    const flag = `--${key}`;

    if (value === true) {
      args.push(flag);
    } else {
      args.push(flag, value);
    }
  }

  return args;
}
