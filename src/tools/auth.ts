import { z } from "zod";
import { executeAndFormat, executeQitCommand } from "../cli/executor.js";

export const authTools = {
  authenticate: {
    name: "authenticate",
    description:
      "Authenticate with WooCommerce.com Partner Developer account. Required before running managed tests.",
    inputSchema: z.object({
      user: z
        .string()
        .optional()
        .describe("WooCommerce.com username (will prompt if not provided)"),
      application_password: z
        .string()
        .optional()
        .describe("Application password (will prompt if not provided)"),
    }),
    handler: async (args: { user?: string; application_password?: string }) => {
      const cmdArgs = ["connect"];

      if (args.user) {
        cmdArgs.push("--user", args.user);
      }
      if (args.application_password) {
        cmdArgs.push("--application_password", args.application_password);
      }

      // Add non-interactive flag to avoid prompts that would hang
      cmdArgs.push("--no-interaction");

      return executeAndFormat(cmdArgs);
    },
  },

  get_auth_status: {
    name: "get_auth_status",
    description:
      "Check if QIT CLI is authenticated and show current authentication status.",
    inputSchema: z.object({}),
    handler: async () => {
      // Try to list extensions - if it works, we're authenticated
      const result = await executeQitCommand(["extensions", "--no-interaction"]);

      if (result.success) {
        // Count lines that look like extension rows (start with |)
        const lines = result.stdout.split("\n");
        const extensionLines = lines.filter(line =>
          line.startsWith("|") && !line.includes("ID") && !line.includes("---")
        );
        const count = extensionLines.length;
        return {
          content: `Authenticated. You have access to ${count} extension(s). Use 'list_extensions' tool to see the full list.`,
          isError: false,
        };
      }

      // Check if error indicates auth issue
      const output = result.stderr || result.stdout;
      if (
        output.includes("not connected") ||
        output.includes("authenticate") ||
        output.includes("connect")
      ) {
        return {
          content:
            "Not authenticated. Use the 'authenticate' tool to connect with your WooCommerce.com Partner Developer account.",
          isError: false,
        };
      }

      return {
        content: `Unable to determine authentication status: ${output}`,
        isError: true,
      };
    },
  },
};
