import { z } from "zod";
import { executeAndFormat, buildArgs, executeQitCommand } from "../cli/executor.js";

const tunnelMethods = ["no_tunnel", "cloudflare", "ngrok"] as const;
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
        .describe("WordPress version to use (e.g., '6.4', '6.5', 'stable', 'rc')"),
      wc_version: z
        .string()
        .optional()
        .describe("WooCommerce version to use (e.g., '8.5', '9.0', 'latest')"),
      plugins: z
        .array(z.string())
        .optional()
        .describe("Plugins to install (slug, path, or URL)"),
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
      json: z
        .boolean()
        .optional()
        .describe("Return output in JSON format"),
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
      json?: boolean;
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
        json: args.json,
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

      // Environment startup can take a while
      return executeAndFormat(cmdArgs, { timeout: 600000 });
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
      "Execute a command inside a running QIT test environment's PHP container.",
    inputSchema: z.object({
      command: z.string().describe("Command to execute inside the container"),
      env_id: z
        .string()
        .optional()
        .describe(
          "Environment ID. If not provided, uses the most recent environment."
        ),
    }),
    handler: async (args: { command: string; env_id?: string }) => {
      const cmdArgs = ["env:exec"];

      if (args.env_id) {
        cmdArgs.push("--env", args.env_id);
      }

      cmdArgs.push("--", args.command);

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
