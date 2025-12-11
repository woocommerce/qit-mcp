import { z } from "zod";
import { executeAndFormat, buildArgs } from "../cli/executor.js";

const configActions = [
  "add_backend",
  "remove_backend",
  "switch_backend",
  "current_backend",
  "add_partner",
  "remove_partner",
  "setup_tunnel",
  "set_default_tunnel",
] as const;

export const configTools = {
  manage_config: {
    name: "manage_config",
    description: `Manage QIT configuration (backends, partners, tunneling). Actions: ${configActions.join(", ")}`,
    inputSchema: z.object({
      action: z
        .enum(configActions)
        .describe("The configuration action to perform"),
      name: z
        .string()
        .optional()
        .describe("Backend or partner name (required for add/remove/switch)"),
      url: z
        .string()
        .optional()
        .describe("Backend URL (for add_backend)"),
      tunnel_method: z
        .string()
        .optional()
        .describe("Tunnel method (for tunnel actions: ngrok, cloudflare, etc.)"),
    }),
    handler: async (args: {
      action: (typeof configActions)[number];
      name?: string;
      url?: string;
      tunnel_method?: string;
    }) => {
      let command: string;
      let positional: string[] = [];
      const flags: Record<string, string | boolean | undefined> = {};

      switch (args.action) {
        case "add_backend":
          command = "backend:add";
          if (args.name) positional.push(args.name);
          if (args.url) flags.url = args.url;
          break;

        case "remove_backend":
          command = "backend:remove";
          if (args.name) positional.push(args.name);
          break;

        case "switch_backend":
          command = "backend:switch";
          if (args.name) positional.push(args.name);
          break;

        case "current_backend":
          command = "backend:current";
          break;

        case "add_partner":
          command = "partner:add";
          if (args.name) positional.push(args.name);
          break;

        case "remove_partner":
          command = "partner:remove";
          if (args.name) positional.push(args.name);
          break;

        case "setup_tunnel":
          command = "tunnel:setup";
          if (args.tunnel_method) positional.push(args.tunnel_method);
          break;

        case "set_default_tunnel":
          command = "tunnel:set-default";
          if (args.tunnel_method) positional.push(args.tunnel_method);
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
};
