import { z } from "zod";
import { executeAndFormat, buildArgs, executeQitCommand } from "../cli/executor.js";

const tunnelMethods = ["no_tunnel", "cloudflare", "ngrok"] as const;

/**
 * Parse qit env:up human-readable output into structured fields.
 *
 * Expected output format (simplified):
 *   Environment ready: qitenvf37b92852e51bb21
 *     URL:         http://localhost:32774
 *     Credentials: admin/password
 *     Stack:       WordPress stable, PHP 8.2
 *     Plugins:     WooCommerce 10.7.0
 *
 * Falls back gracefully: missing fields end up in parse_warning.
 */
interface ParsedEnvUp {
  env_id?: string;
  site_url?: string;
  admin_user?: string;
  admin_password?: string;
  parse_warning?: string;
}

function parseEnvUpOutput(raw: string): ParsedEnvUp {
  // Strip ANSI escape codes (color/style sequences) before matching
  // eslint-disable-next-line no-control-regex
  const noAnsi = raw.replace(/\x1b\[[0-9;]*[a-zA-Z]/g, "");

  // Strip PHP deprecation noise that may leak in via stderr
  const text = noAnsi
    .split("\n")
    .filter(
      (line) =>
        !line.includes("Deprecated:") && !line.includes("PHP Deprecated:")
    )
    .join("\n");

  // env_id: "Environment ready: qitenv<hex>" anywhere on a line
  const envIdMatch = text.match(/Environment\s+ready[^:]*:\s*(qitenv[0-9a-f]+)/i);

  // URL: "URL:  http://localhost:NNNNN" - value is everything non-whitespace after the colon.
  const urlMatch = text.match(/^\s*(?:URL|Site URL)\s*:\s*(https?:\/\/[^\s]+)/im);

  // Credentials: "Credentials: admin/password" or "Credentials: admin / password".
  const credsMatch = text.match(/^\s*Credentials\s*:\s*([^\s/]+)\s*\/\s*([^\s]+)/im);

  const out: ParsedEnvUp = {};
  if (envIdMatch) out.env_id = envIdMatch[1];
  if (urlMatch) out.site_url = urlMatch[1].replace(/[/,]+$/, ""); // strip trailing punctuation
  if (credsMatch) {
    out.admin_user = credsMatch[1];
    out.admin_password = credsMatch[2];
  }

  const requiredFields: Array<keyof Omit<ParsedEnvUp, "parse_warning">> = [
    "env_id",
    "site_url",
    "admin_user",
    "admin_password",
  ];
  const missing = requiredFields.filter((key) => !(key in out));
  if (missing.length > 0) {
    out.parse_warning = `Could not parse: ${missing.join(", ")}. See raw_output.`;
  }
  return out;
}

const environmentTypes = ["e2e", "performance"] as const;

export const environmentTools = {
  start_environment: {
    name: "start_environment",
    description:
      "Start a local QIT test environment. Creates a temporary, ephemeral environment for testing.",
    inputSchema: z.object({
      environment_type: z
        .enum(environmentTypes)
        .optional()
        .describe("Type of environment to create: 'e2e' or 'performance'"),
      php_version: z
        .string()
        .optional()
        .describe("PHP version to use (e.g., '8.1', '8.2', '8.3')"),
      wp_version: z
        .string()
        .optional()
        .describe("WordPress version. Omit unless the bug requires a specific WP version. Prefer 'stable' or 'rc'. Pinning an older numeric version may break plugin activation (e.g., current WooCommerce requires WP 6.8+)."),
      wc_version: z
        .string()
        .optional()
        .describe("WooCommerce version. Omit unless the bug requires a specific WooCommerce version. Use 'latest' for the current release."),
      plugins: z
        .array(z.string())
        .optional()
        .describe("Plugins to install, as an array of bare slugs, e.g. [\"woocommerce\"]. Never pass a JSON string or scalar."),
      themes: z
        .array(z.string())
        .optional()
        .describe("Themes to install (slug, path, or URL)"),
      test_packages: z
        .array(z.string())
        .optional()
        .describe("Test packages to set up environment from"),
      utilities: z
        .array(z.string())
        .optional()
        .describe("Utility packages for environment setup"),
      volumes: z
        .array(z.string())
        .optional()
        .describe("Docker volumes to mount (host:container format)"),
      php_extensions: z
        .array(z.string())
        .optional()
        .describe("PHP extensions to enable"),
      env_vars: z
        .record(z.string())
        .optional()
        .describe("Environment variables to set (key-value pairs)"),
      object_cache: z
        .boolean()
        .optional()
        .describe("Enable Redis object cache"),
      tunnel: z
        .enum(tunnelMethods)
        .optional()
        .describe("Enable tunnelling method (cloudflare, ngrok)"),
      config: z
        .string()
        .optional()
        .describe("Path to qit.json configuration file"),
      skip_setup: z
        .boolean()
        .optional()
        .describe("Skip running setup phases even if qit-test.json is found"),
      skip_activating_plugins: z
        .boolean()
        .optional()
        .describe("Skip activating plugins during environment setup"),
      skip_activating_themes: z
        .boolean()
        .optional()
        .describe("Skip activating themes during environment setup"),
    }),
    handler: async (args: {
      environment_type?: (typeof environmentTypes)[number];
      php_version?: string;
      wp_version?: string;
      wc_version?: string;
      plugins?: string[];
      themes?: string[];
      test_packages?: string[];
      utilities?: string[];
      volumes?: string[];
      php_extensions?: string[];
      env_vars?: Record<string, string>;
      object_cache?: boolean;
      tunnel?: (typeof tunnelMethods)[number];
      config?: string;
      skip_setup?: boolean;
      skip_activating_plugins?: boolean;
      skip_activating_themes?: boolean;
    }) => {
      // Use canonical flag names from the trunk QIT CLI
      // These support aliases (--wp, --woo) for backwards compatibility
      const flags: Record<string, string | boolean | undefined> = {
        environment_type: args.environment_type,
        php_version: args.php_version,
        wordpress_version: args.wp_version,
        woocommerce_version: args.wc_version,
        object_cache: args.object_cache,
        tunnel: args.tunnel,
        config: args.config,
        "skip-setup": args.skip_setup,
        skip_activating_plugins: args.skip_activating_plugins,
        skip_activating_themes: args.skip_activating_themes,
      };

      const cmdArgs = buildArgs("env:up", [], flags);

      // Add array-based flags
      if (args.plugins?.length) {
        for (const plugin of args.plugins) {
          cmdArgs.push("--plugin", plugin);
        }
      }
      if (args.themes?.length) {
        for (const theme of args.themes) {
          cmdArgs.push("--theme", theme);
        }
      }
      if (args.test_packages?.length) {
        for (const pkg of args.test_packages) {
          cmdArgs.push("--test-package", pkg);
        }
      }
      if (args.utilities?.length) {
        for (const util of args.utilities) {
          cmdArgs.push("--utility", util);
        }
      }
      if (args.volumes?.length) {
        for (const volume of args.volumes) {
          cmdArgs.push("--volume", volume);
        }
      }
      if (args.php_extensions?.length) {
        for (const ext of args.php_extensions) {
          cmdArgs.push("--php_extension", ext);
        }
      }
      if (args.env_vars) {
        for (const [key, value] of Object.entries(args.env_vars)) {
          cmdArgs.push("--env", `${key}=${value}`);
        }
      }

      // Environment startup can take a while; parse output for structured creds
      const result = await executeQitCommand(cmdArgs, { timeout: 600000 });
      const rawOutput = result.stdout + "\n" + result.stderr;

      if (!result.success) {
        return {
          content: result.stderr || result.stdout || "Failed to start environment",
          isError: true,
        };
      }

      const parsed = parseEnvUpOutput(rawOutput);

      if (!parsed.env_id) {
        return {
          content: result.stderr || result.stdout || "Failed to start environment (no env_id parsed from output)",
          isError: true,
        };
      }

      const payload = {
        env_id: parsed.env_id,
        site_url: parsed.site_url,
        admin_user: parsed.admin_user,
        admin_password: parsed.admin_password,
        ...(parsed.parse_warning
          ? { parse_warning: parsed.parse_warning, raw_output: rawOutput }
          : {}),
      };

      return {
        content: JSON.stringify(payload, null, 2),
        isError: false,
      };
    },
  },

  stop_environment: {
    name: "stop_environment",
    description: "Stop a running QIT test environment.",
    inputSchema: z.object({
      env_id: z
        .string()
        .optional()
        .describe(
          "Environment ID to stop. If not provided, stops all environments."
        ),
    }),
    handler: async (args: { env_id?: string }) => {
      const positional = args.env_id ? [args.env_id] : [];
      const cmdArgs = buildArgs("env:down", positional, {});
      return executeAndFormat(cmdArgs);
    },
  },

  list_environments: {
    name: "list_environments",
    description: "List all running QIT test environments with compact output.",
    inputSchema: z.object({}),
    handler: async () => {
      const cmdArgs = ["env:list"];
      const result = await executeQitCommand(cmdArgs);

      // Combine stdout and stderr, filter PHP warnings
      const rawOutput = (result.stdout + "\n" + result.stderr)
        .split("\n")
        .filter(line => !line.includes("Deprecated:") && !line.includes("PHP Deprecated:"))
        .join("\n");

      if (!result.success && !rawOutput.includes("Environment")) {
        return {
          content: result.stderr || result.stdout || "Failed to list environments",
          isError: true,
        };
      }

      // Parse the verbose output into compact format
      // The output has blocks separated by dashed lines, each block has key-value pairs
      const environments: Array<{
        env_id: string;
        created_at: string;
        php_version: string;
        woo_version: string;
        site_url: string;
        status: string;
      }> = [];

      // Split by environment blocks (each starts with "Extra" or similar header)
      const blocks = rawOutput.split(/\s+-{20,}\s+/).filter(block => block.includes("Env_id"));

      for (const block of blocks) {
        const lines = block.split("\n");
        const env: Record<string, string> = {};

        for (const line of lines) {
          // Match key-value pairs like "Env_id                    qitenv01ed18d948bfe5cc"
          const match = line.match(/^\s*([A-Za-z_]+)\s{2,}(.+?)\s*$/);
          if (match) {
            env[match[1].toLowerCase()] = match[2].trim();
          }
        }

        if (env.env_id) {
          environments.push({
            env_id: env.env_id || "",
            created_at: env.created_at || "",
            php_version: env.php_version || "",
            woo_version: env.woocommerce_version || "",
            site_url: env.site_url || "",
            status: env.status || "",
          });
        }
      }

      if (environments.length === 0) {
        return {
          content: "No running environments found.",
          isError: false,
        };
      }

      // Format as compact table
      const header = "| Env ID | Created | PHP | WooCommerce | URL | Status |";
      const separator = "|--------|---------|-----|-------------|-----|--------|";
      const rows = environments.map(env =>
        `| ${env.env_id} | ${env.created_at} | ${env.php_version} | ${env.woo_version} | ${env.site_url} | ${env.status} |`
      );

      return {
        content: `Running environments (${environments.length}):\n${header}\n${separator}\n${rows.join("\n")}`,
        isError: false,
      };
    },
  },

  exec_in_environment: {
    name: "exec_in_environment",
    description:
      "Execute a command inside a running QIT test environment's PHP container. " +
      "Always pass `{env_id, command}` as named args. Never put the env id inside `command`.",
    inputSchema: z.object({
      command: z.string().describe("Command to execute inside the container"),
      env_id: z
        .string()
        .describe("The environment ID to execute the command in (e.g. qitenv...)"),
    }),
    handler: async (args: { command: string; env_id: string }) => {
      // Guard: defend against the agent passing env_id as command (observed
      // first-call routing bug in runs #1 and #2).
      if (/^qitenv[0-9a-f]+$/i.test(args.command)) {
        return {
          content: `env_id passed as command. Received command="${args.command}", env_id="${args.env_id}". Retry with {env_id: "qitenv...", command: "wp ..."}.`,
          isError: true,
        };
      }

      // qit-cli env:exec uses --env_id flag: `env:exec --env_id <env_id> -- <command>`.
      // The executor spawns with shell: true, which sh-splits each arg on whitespace.
      // Single-quote-escape the command so qit-cli sees it as ONE positional arg.
      const escaped = "'" + args.command.replace(/'/g, "'\\''") + "'";
      const cmdArgs = ["env:exec", "--env_id", args.env_id, "--", escaped];

      return executeAndFormat(cmdArgs, { timeout: 300000 });
    },
  },

  reset_environment: {
    name: "reset_environment",
    description:
      "Reset a QIT test environment's database to the post-setup state.",
    inputSchema: z.object({
      env_id: z
        .string()
        .optional()
        .describe(
          "Environment ID to reset. If not provided, resets the most recent environment."
        ),
    }),
    handler: async (args: { env_id?: string }) => {
      const positional = args.env_id ? [args.env_id] : [];
      const cmdArgs = buildArgs("env:reset", positional, {});
      return executeAndFormat(cmdArgs);
    },
  },
};
