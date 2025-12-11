import { z } from "zod";
import { executeAndFormat, buildArgs } from "../cli/executor.js";

const testTypes = [
  "activation",
  "api",
  "compatibility",
  "e2e",
  "malware",
  "performance",
  "phpcompatibility",
  "phpstan",
  "plugin-check",
  "security",
  "validation",
  "woo-api",
  "woo-e2e",
] as const;

// Managed tests run on GitHub Actions (remote), local tests run in Docker (local)
const managedTestTypes = new Set([
  "api",
  "compatibility",
  "malware",
  "phpcompatibility",
  "phpstan",
  "plugin-check",
  "security",
  "validation",
]);

const localTestTypes = new Set([
  "activation",
  "e2e",
  "performance",
  "woo-api",
  "woo-e2e",
]);

// Version flag support per test type - CLI errors if unknown flags are passed
const versionFlagSupport = {
  // Full version support (php, wp, woo)
  full: new Set(["activation", "e2e", "performance", "compatibility", "woo-api", "woo-e2e"]),
  // WordPress and WooCommerce only (no PHP version)
  wpWooOnly: new Set(["phpstan", "phpcompatibility"]),
  // No version flags at all
  none: new Set(["security", "malware", "validation", "api", "plugin-check"]),
};

// Local-only flags: --env, --volume, --plugin, --theme, --object_cache, --tunnel, --ui, --test-package
// These are only available for local tests (activation, e2e, performance), not managed tests
const localOnlyFlagTests = new Set(["activation", "e2e", "performance"]);

const tunnelMethods = ["no_tunnel", "cloudflare", "ngrok"] as const;

export const testExecutionTools = {
  run_test: {
    name: "run_test",
    description: `Run a QIT test on a plugin or theme. Local tests (${[...localTestTypes].join(", ")}) run in Docker locally. Managed tests (${[...managedTestTypes].join(", ")}) are enqueued on GitHub Actions. Version flags - Full (php/wp/woo): ${[...versionFlagSupport.full].join(", ")}; WP/Woo only: ${[...versionFlagSupport.wpWooOnly].join(", ")}; None: ${[...versionFlagSupport.none].join(", ")}. Local-only flags (env_vars, volumes, additional_plugins/themes, object_cache, tunnel, ui, test_packages): ${[...localOnlyFlagTests].join(", ")}.`,
    inputSchema: z.object({
      type: z
        .enum(testTypes)
        .describe("The type of test to run"),
      plugin: z
        .string()
        .describe(
          "Plugin slug, path to ZIP file, or path to plugin directory"
        ),
      zip: z
        .string()
        .optional()
        .describe("Custom source for the plugin/theme (local ZIP, local directory, or URL to a .zip file)"),
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
      additional_plugins: z
        .array(z.string())
        .optional()
        .describe("Additional plugins to install (slug or slug:version format)"),
      additional_themes: z
        .array(z.string())
        .optional()
        .describe("Additional themes to install (slug or slug:version format)"),
      test_packages: z
        .array(z.string())
        .optional()
        .describe("Test packages to include"),
      volumes: z
        .array(z.string())
        .optional()
        .describe("Docker volumes to mount (host:container format)"),
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
      ui: z
        .boolean()
        .optional()
        .describe("Run tests in Playwright UI mode (for e2e tests)"),
      config: z
        .string()
        .optional()
        .describe("Path to qit.json configuration file"),
      wait: z
        .boolean()
        .optional()
        .describe("Wait for managed test to complete before returning (default: true)"),
      async: z
        .boolean()
        .optional()
        .describe("Enqueue test and return immediately without waiting"),
      json: z
        .boolean()
        .optional()
        .describe("Return output in JSON format"),
    }),
    handler: async (args: {
      type: (typeof testTypes)[number];
      plugin: string;
      zip?: string;
      php_version?: string;
      wp_version?: string;
      wc_version?: string;
      additional_plugins?: string[];
      additional_themes?: string[];
      test_packages?: string[];
      volumes?: string[];
      env_vars?: Record<string, string>;
      object_cache?: boolean;
      tunnel?: (typeof tunnelMethods)[number];
      ui?: boolean;
      config?: string;
      wait?: boolean;
      async?: boolean;
      json?: boolean;
    }) => {
      const command = `run:${args.type}`;
      const positional = [args.plugin];

      // Managed tests run on GitHub Actions - default to async mode
      // Local tests run in Docker - wait for completion
      const isManagedTest = managedTestTypes.has(args.type);
      const useAsync = args.async ?? (isManagedTest ? true : false);

      const isLocalOnlyTest = localOnlyFlagTests.has(args.type);

      const flags: Record<string, string | boolean | undefined> = {
        zip: args.zip,
        config: args.config,
        wait: args.wait,
        async: useAsync,
        json: args.json,
        // For managed tests, include the report URL in the output
        "print-report-url": isManagedTest ? true : undefined,
      };

      // Only add version flags if the test type supports them
      // CLI errors on unknown flags, so we must be selective
      // Use canonical flag names from the trunk QIT CLI
      if (versionFlagSupport.full.has(args.type)) {
        flags.php_version = args.php_version;
        flags.wordpress_version = args.wp_version;
        flags.woocommerce_version = args.wc_version;
      } else if (versionFlagSupport.wpWooOnly.has(args.type)) {
        // phpstan, phpcompatibility - no PHP version flag
        flags.wordpress_version = args.wp_version;
        flags.woocommerce_version = args.wc_version;
      }
      // For versionFlagSupport.none (security, malware, etc.) - don't add any version flags

      // Local-only flags: only for activation, e2e, performance
      if (isLocalOnlyTest) {
        flags.object_cache = args.object_cache;
        flags.tunnel = args.tunnel;
        flags.ui = args.ui;
      }

      const cmdArgs = buildArgs(command, positional, flags);

      // Add array-based flags (these need special handling)
      // These are also local-only flags
      if (isLocalOnlyTest) {
        if (args.additional_plugins?.length) {
          for (const plugin of args.additional_plugins) {
            cmdArgs.push("--plugin", plugin);
          }
        }
        if (args.additional_themes?.length) {
          for (const theme of args.additional_themes) {
            cmdArgs.push("--theme", theme);
          }
        }
        if (args.test_packages?.length) {
          for (const pkg of args.test_packages) {
            cmdArgs.push("--test-package", pkg);
          }
        }
        if (args.volumes?.length) {
          for (const volume of args.volumes) {
            cmdArgs.push("--volume", volume);
          }
        }
        if (args.env_vars) {
          for (const [key, value] of Object.entries(args.env_vars)) {
            cmdArgs.push("--env", `${key}=${value}`);
          }
        }
      }

      // Managed tests return quickly (async), local tests may take longer
      const timeout = useAsync ? 120000 : 1800000;

      return executeAndFormat(cmdArgs, { timeout });
    },
  },

  run_test_group: {
    name: "run_test_group",
    description:
      "Run a group of tests defined in qit.json configuration file.",
    inputSchema: z.object({
      group: z.string().describe("Name of the test group defined in qit.json"),
      config: z
        .string()
        .optional()
        .describe("Path to qit.json configuration file"),
      wait: z
        .boolean()
        .optional()
        .describe("Wait for all tests to complete before returning"),
      json: z
        .boolean()
        .optional()
        .describe("Return output in JSON format"),
    }),
    handler: async (args: {
      group: string;
      config?: string;
      wait?: boolean;
      json?: boolean;
    }) => {
      const cmdArgs = buildArgs("run:group", [args.group], {
        config: args.config,
        wait: args.wait,
        json: args.json,
      });

      const timeout = args.wait ? 1800000 : 300000;

      return executeAndFormat(cmdArgs, { timeout });
    },
  },
};
