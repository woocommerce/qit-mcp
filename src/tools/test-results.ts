import { z } from "zod";
import { executeAndFormat, buildArgs, executeQitCommand } from "../cli/executor.js";

export const testResultsTools = {
  get_test_result: {
    name: "get_test_result",
    description: "Get test result(s) by test run ID.",
    inputSchema: z.object({
      test_run_id: z
        .union([z.string(), z.array(z.string())])
        .describe("Single test run ID or array of test run IDs"),
      json: z
        .boolean()
        .optional()
        .describe("Return output in JSON format"),
    }),
    handler: async (args: {
      test_run_id: string | string[];
      json?: boolean;
    }) => {
      const ids = Array.isArray(args.test_run_id)
        ? args.test_run_id
        : [args.test_run_id];

      // Validate test run IDs - must be numeric and within reasonable bounds
      // PHP_INT_MAX on 64-bit is 9223372036854775807
      const MAX_VALID_ID = BigInt("9223372036854775807");
      for (const id of ids) {
        if (!/^\d+$/.test(id)) {
          return {
            content: `Error: Invalid test run ID "${id}". Test run IDs must be numeric.`,
            isError: true,
          };
        }
        try {
          if (BigInt(id) > MAX_VALID_ID) {
            return {
              content: `Error: Test run ID "${id}" is too large. Maximum valid ID is ${MAX_VALID_ID}.`,
              isError: true,
            };
          }
        } catch {
          return {
            content: `Error: Invalid test run ID "${id}".`,
            isError: true,
          };
        }
      }

      const cmdArgs = ids.length === 1
        ? buildArgs("get", [ids[0]], { json: args.json })
        : buildArgs("get-multiple", ids, { json: args.json });

      const result = await executeQitCommand(cmdArgs);

      // The get command returns exit code 1 when test status is failed/warning,
      // but this is not a command error - we still got valid results
      const output = result.stdout || result.stderr || "";

      // Check if we got actual test result data (contains "Test Run Id" or JSON structure)
      if (output && (output.includes("Test Run Id") || output.includes("test_run_id") || output.startsWith("{"))) {
        return {
          content: output,
          isError: false,
        };
      }

      // If the output looks like an error (e.g., "Test not found"), report as error
      if (!result.success) {
        return {
          content: `Error: ${output || "Failed to get test result"}`,
          isError: true,
        };
      }

      return {
        content: output || "No result found",
        isError: false,
      };
    },
  },

  list_tests: {
    name: "list_tests",
    description: "List test runs with optional filters. Default per_page is 10 to reduce response size.",
    inputSchema: z.object({
      status: z
        .enum(["pending", "running", "success", "failed", "warning"])
        .optional()
        .describe("Filter by test status"),
      test_type: z
        .string()
        .optional()
        .describe("Filter by test type (e.g., 'security', 'e2e')"),
      extension: z
        .string()
        .optional()
        .describe("Filter by extension slug"),
      per_page: z
        .number()
        .optional()
        .describe("Maximum number of results to return (default: 10)"),
    }),
    handler: async (args: {
      status?: string;
      test_type?: string;
      extension?: string;
      per_page?: number;
    }) => {
      // Default per_page to 10 to prevent large responses
      const perPage = args.per_page ?? 10;

      const flags: Record<string, string | boolean | undefined> = {
        test_status: args.status,
        test_types: args.test_type,
        extensions: args.extension,
        per_page: perPage.toString(),
      };

      const cmdArgs = buildArgs("list-tests", [], flags);
      return executeAndFormat(cmdArgs);
    },
  },

  get_test_report: {
    name: "get_test_report",
    description: "Get a detailed local test report for a specific test run. Only available for tests run locally (not managed tests).",
    inputSchema: z.object({
      test_run_id: z.string().describe("Test run ID to get report for"),
    }),
    handler: async (args: { test_run_id: string }) => {
      const cmdArgs = ["report", args.test_run_id];
      const result = await executeQitCommand(cmdArgs);

      const output = result.stdout || result.stderr || "";

      // Check if it's a "report not found" error vs actual report content
      if (output.includes("Could not find") || output.includes("not found")) {
        return {
          content: `Report not available locally. This may be a managed test (run on GitHub Actions) or the local report files were cleaned up. Use get_test_result to see the test status and result URL.`,
          isError: false,
        };
      }

      // If we got output, return it (even with exit code 1 for failed tests)
      if (output) {
        return {
          content: output,
          isError: false,
        };
      }

      return {
        content: "No report found",
        isError: true,
      };
    },
  },

  open_test_result: {
    name: "open_test_result",
    description: "Open a test result in the default web browser and return the report URL.",
    inputSchema: z.object({
      test_run_id: z.string().describe("Test run ID to open in browser"),
    }),
    handler: async (args: { test_run_id: string }) => {
      const cmdArgs = ["open", args.test_run_id];
      const result = await executeQitCommand(cmdArgs);

      // The open command outputs to stderr and may exit with code 1 even on success
      // Extract URL from output (either stdout or stderr)
      const output = result.stdout || result.stderr || "";
      const urlMatch = output.match(/https?:\/\/[^\s]+/);

      if (urlMatch) {
        return {
          content: `Report opened in browser.\n\nURL: ${urlMatch[0]}`,
          isError: false,
        };
      }

      // If we can't find a URL but there's output, return it
      if (output) {
        return {
          content: output,
          isError: false,
        };
      }

      return {
        content: "Report opened in browser.",
        isError: false,
      };
    },
  },
};
