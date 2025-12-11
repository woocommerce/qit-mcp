import { z } from "zod";
import { executeAndFormat, buildArgs, executeQitCommand } from "../cli/executor.js";

export const utilitiesTools = {
  list_extensions: {
    name: "list_extensions",
    description:
      "List WooCommerce extensions you have access to test with QIT. Use 'search' parameter to filter results and reduce response size.",
    inputSchema: z.object({
      search: z
        .string()
        .optional()
        .describe("Search/filter extensions by name or slug (recommended to reduce response size)"),
      limit: z
        .number()
        .optional()
        .describe("Maximum number of extensions to return (default: 20, use higher values only when needed)"),
    }),
    handler: async (args: { search?: string; limit?: number }) => {
      const result = await executeQitCommand(["extensions", "--no-interaction"]);

      if (!result.success) {
        return {
          content: result.stderr || result.stdout || "Failed to list extensions",
          isError: true,
        };
      }

      // Parse table output format: | ID | Slug | Type |
      const lines = result.stdout.split("\n");
      let extensions: Array<{ id: string; slug: string; type: string }> = [];

      for (const line of lines) {
        // Skip header, separator lines, and empty lines
        if (!line.startsWith("|") || line.includes("---") || line.includes(" ID ")) {
          continue;
        }

        const parts = line.split("|").map(p => p.trim()).filter(p => p);
        if (parts.length >= 3) {
          extensions.push({
            id: parts[0],
            slug: parts[1],
            type: parts[2],
          });
        }
      }

      const totalCount = extensions.length;

      // Filter by search term if provided
      if (args.search) {
        const searchLower = args.search.toLowerCase();
        extensions = extensions.filter(ext =>
          ext.slug.toLowerCase().includes(searchLower)
        );
      }

      // Apply limit (default 20 to prevent huge responses)
      const limit = args.limit ?? 20;
      const limited = extensions.slice(0, limit);
      const hasMore = extensions.length > limit;

      // Text format - compact representation
      const outputLines = limited.map(ext => `- ${ext.slug} (${ext.type})`);

      let output = `Extensions (showing ${limited.length} of ${extensions.length}`;
      if (args.search) output += ` matching "${args.search}"`;
      output += `, ${totalCount} total):\n${outputLines.join("\n")}`;

      if (hasMore) {
        output += `\n\n... and ${extensions.length - limit} more. Use 'limit' parameter to see more or 'search' to filter.`;
      }

      return { content: output, isError: false };
    },
  },

  validate_zip: {
    name: "validate_zip",
    description: "Validate a local plugin or theme ZIP file's content.",
    inputSchema: z.object({
      path: z.string().describe("Path to the ZIP file to validate"),
    }),
    handler: async (args: { path: string }) => {
      const cmdArgs = ["woo:validate-zip", args.path];
      return executeAndFormat(cmdArgs);
    },
  },

  manage_cache: {
    name: "manage_cache",
    description:
      "Low-level QIT cache manipulation. For refreshing cache data, use sync_cache instead.",
    inputSchema: z.object({
      action: z
        .enum(["get", "set", "delete"])
        .describe("Cache action: get (retrieve), set (store), or delete (remove)"),
      key: z.string().describe("The cache key to operate on"),
      value: z
        .string()
        .optional()
        .describe("The value to store (required for 'set' action)"),
      expiration: z
        .number()
        .optional()
        .describe("Expiration time in seconds (optional for 'set' action)"),
    }),
    handler: async (args: {
      action: "get" | "set" | "delete";
      key: string;
      value?: string;
      expiration?: number;
    }) => {
      // CLI uses positional args: cache <action> <key> [<value> [<expiration>]]
      const cmdArgs = ["cache", args.action, args.key];

      if (args.action === "set") {
        if (!args.value) {
          return {
            content: "Error: 'value' is required for 'set' action",
            isError: true,
          };
        }
        cmdArgs.push(args.value);
        if (args.expiration !== undefined) {
          cmdArgs.push(String(args.expiration));
        }
      }

      return executeAndFormat(cmdArgs);
    },
  },

  get_qit_dir: {
    name: "get_qit_dir",
    description: "Get the QIT configuration directory path.",
    inputSchema: z.object({}),
    handler: async () => {
      const cmdArgs = ["qit:dir"];
      return executeAndFormat(cmdArgs);
    },
  },

  sync_cache: {
    name: "sync_cache",
    description: "Re-sync local cache with QIT Manager.",
    inputSchema: z.object({}),
    handler: async () => {
      const cmdArgs = ["sync"];
      return executeAndFormat(cmdArgs);
    },
  },
};
