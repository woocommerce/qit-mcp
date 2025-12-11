import { z } from "zod";
import { executeAndFormat, buildArgs, executeQitCommand } from "../cli/executor.js";

const packageActions = [
  "publish",
  "download",
  "scaffold",
  "delete",
  "show",
] as const;

export const packagesTools = {
  manage_package: {
    name: "manage_package",
    description: `Manage QIT test packages. Actions: ${packageActions.join(", ")}`,
    inputSchema: z.object({
      action: z
        .enum(packageActions)
        .describe("The package management action to perform"),
      package_name: z
        .string()
        .optional()
        .describe("Full package ID with version (e.g., 'namespace/name:version'). Required for download, show, delete actions."),
      path: z
        .string()
        .optional()
        .describe("Path for scaffold output or package location"),
      type: z
        .enum(["e2e", "utility"])
        .optional()
        .describe("Package type for scaffold action"),
      json: z
        .boolean()
        .optional()
        .describe("Return output in JSON format"),
    }),
    handler: async (args: {
      action: (typeof packageActions)[number];
      package_name?: string;
      path?: string;
      type?: "e2e" | "utility";
      json?: boolean;
    }) => {
      let command: string;
      let positional: string[] = [];
      const flags: Record<string, string | boolean | undefined> = {
        json: args.json,
      };

      switch (args.action) {
        case "publish":
          command = "package:publish";
          if (args.path) positional.push(args.path);
          break;

        case "download":
          command = "package:download";
          if (args.package_name) positional.push(args.package_name);
          if (args.path) flags.output = args.path;
          break;

        case "scaffold":
          command = "package:scaffold";
          if (args.package_name) positional.push(args.package_name);
          if (args.type) flags.type = args.type;
          if (args.path) flags.output = args.path;
          break;

        case "delete":
          command = "package:delete";
          if (args.package_name) positional.push(args.package_name);
          break;

        case "show":
          command = "package:show";
          if (args.package_name) positional.push(args.package_name);
          break;

        default:
          return {
            content: `Unknown action: ${args.action}`,
            isError: true,
          };
      }

      const cmdArgs = buildArgs(command, positional, flags);
      return executeAndFormat(cmdArgs);
    },
  },

  list_packages: {
    name: "list_packages",
    description:
      "List available QIT test packages with compact output. Use 'search' to filter and 'limit' to control response size.",
    inputSchema: z.object({
      search: z
        .string()
        .optional()
        .describe("Search/filter packages by name or namespace"),
      type: z
        .enum(["e2e", "utility"])
        .optional()
        .describe("Filter by package type"),
      limit: z
        .number()
        .optional()
        .describe("Maximum number of packages to return (default: 20)"),
    }),
    handler: async (args: { search?: string; type?: string; limit?: number }) => {
      const cmdArgs = ["package:list"];
      if (args.type) {
        cmdArgs.push("--type", args.type);
      }

      const result = await executeQitCommand(cmdArgs);

      if (!result.success && !result.stdout.includes("Package")) {
        return {
          content: result.stderr || result.stdout || "Failed to list packages",
          isError: true,
        };
      }

      // Parse the table output format
      // | Package ID | Namespace | Version | Size | Visibility | Created |
      const lines = (result.stdout + "\n" + result.stderr)
        .split("\n")
        .filter(line => !line.includes("Deprecated:") && !line.includes("PHP Deprecated:"));

      let packages: Array<{
        id: string;
        namespace: string;
        version: string;
        size: string;
        visibility: string;
      }> = [];

      for (const line of lines) {
        // Skip non-table lines
        if (!line.startsWith("|") || line.includes("---") || line.includes("Package ID")) {
          continue;
        }

        const parts = line.split("|").map(p => p.trim()).filter(p => p);
        if (parts.length >= 5) {
          packages.push({
            id: parts[0],
            namespace: parts[1],
            version: parts[2],
            size: parts[3],
            visibility: parts[4].replace("🌐 ", "").replace("🔒 ", ""),
          });
        }
      }

      const totalCount = packages.length;

      // Filter by search term if provided
      if (args.search) {
        const searchLower = args.search.toLowerCase();
        packages = packages.filter(pkg =>
          pkg.id.toLowerCase().includes(searchLower) ||
          pkg.namespace.toLowerCase().includes(searchLower)
        );
      }

      // Apply limit (default 20)
      const limit = args.limit ?? 20;
      const limited = packages.slice(0, limit);
      const hasMore = packages.length > limit;

      if (packages.length === 0) {
        let msg = "No packages found";
        if (args.search) msg += ` matching "${args.search}"`;
        if (args.type) msg += ` of type "${args.type}"`;
        return { content: msg + ".", isError: false };
      }

      // Compact text format
      const outputLines = limited.map(pkg =>
        `- ${pkg.id} (${pkg.visibility}, ${pkg.size})`
      );

      let output = `Packages (showing ${limited.length} of ${packages.length}`;
      if (args.search) output += ` matching "${args.search}"`;
      output += `, ${totalCount} total):\n${outputLines.join("\n")}`;

      if (hasMore) {
        output += `\n\n... and ${packages.length - limit} more. Use 'limit' to see more or 'search' to filter.`;
      }

      return { content: output, isError: false };
    },
  },
};
