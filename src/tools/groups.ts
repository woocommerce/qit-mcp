import { z } from "zod";
import { executeAndFormat, buildArgs } from "../cli/executor.js";

export const groupsTools = {
  get_group_status: {
    name: "get_group_status",
    description: "Fetch the status of a registered test group from QIT Manager.",
    inputSchema: z.object({
      group: z.string().describe("Name of the test group to fetch status for"),
      json: z
        .boolean()
        .optional()
        .describe("Return output in JSON format"),
    }),
    handler: async (args: { group: string; json?: boolean }) => {
      const cmdArgs = buildArgs("group:fetch", [args.group], {
        json: args.json,
      });
      return executeAndFormat(cmdArgs);
    },
  },
};
