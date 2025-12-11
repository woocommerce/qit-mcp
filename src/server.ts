import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { zodToJsonSchema } from "zod-to-json-schema";
import { allTools, ToolName } from "./tools/index.js";
import { detectQitCli, getQitCliNotFoundError } from "./cli/detector.js";

export function createServer() {
  const server = new Server(
    {
      name: "qit-mcp",
      version: "0.1.0",
    },
    {
      capabilities: {
        tools: {},
      },
    }
  );

  // List available tools
  server.setRequestHandler(ListToolsRequestSchema, async () => {
    // Check if QIT CLI is available
    const cliInfo = detectQitCli();

    const tools = Object.entries(allTools).map(([_, tool]) => ({
      name: tool.name,
      description: cliInfo
        ? tool.description
        : `${tool.description}\n\n⚠️ QIT CLI not detected. ${getQitCliNotFoundError()}`,
      inputSchema: zodToJsonSchema(tool.inputSchema),
    }));

    return { tools };
  });

  // Handle tool calls
  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;

    const tool = allTools[name as ToolName];

    if (!tool) {
      return {
        content: [
          {
            type: "text",
            text: `Unknown tool: ${name}`,
          },
        ],
        isError: true,
      };
    }

    try {
      // Validate input
      const validatedArgs = tool.inputSchema.parse(args);

      // Execute tool
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const result = await (tool.handler as (args: any) => Promise<{ content: string; isError: boolean }>)(validatedArgs);

      return {
        content: [
          {
            type: "text",
            text: result.content,
          },
        ],
        isError: result.isError,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return {
        content: [
          {
            type: "text",
            text: `Error: ${message}`,
          },
        ],
        isError: true,
      };
    }
  });

  return server;
}

export async function runServer() {
  const server = createServer();
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("QIT MCP server running on stdio");
}
