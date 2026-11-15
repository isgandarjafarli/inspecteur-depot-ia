#!/usr/bin/env node
import { realpathSync } from "node:fs";
import { pathToFileURL } from "node:url";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { reviewRepository } from "./core.js";

// MCP callers (AI agents) are not trusted to run arbitrary shell commands,
// so only these exact validation commands are accepted over MCP.
const ALLOWED_VALIDATION_COMMANDS = ["npm test", "npm run typecheck", "npm run build"];

export function createServer(): McpServer {
  const server = new McpServer({ name: "repository-inspector", version: "2.0.0" });

  server.tool(
    "review_repository",
    "Inspects a Git repository and returns a review report.",
    {
      repo_path: z.string().describe("Repository path to inspect."),
      baseRef: z.string().optional(),
      validationCommands: z.array(z.string()).optional(),
    },
    async (input) => {
      const rejected = (input.validationCommands ?? []).filter(
        (command) => !ALLOWED_VALIDATION_COMMANDS.includes(command),
      );
      if (rejected.length > 0) {
        return {
          isError: true,
          content: [
            {
              type: "text",
              text:
                `Refused validation command(s): ${rejected.map((c) => JSON.stringify(c)).join(", ")}. ` +
                `Allowed commands: ${ALLOWED_VALIDATION_COMMANDS.join(", ")}. Nothing was run.`,
            },
          ],
        };
      }

      const report = await reviewRepository({
        repositoryPath: input.repo_path,
        baseRef: input.baseRef,
        validationCommands: input.validationCommands,
      });
      return { content: [{ type: "text", text: report }] };
    },
  );

  return server;
}

const entryPath = process.argv[1];
if (entryPath && import.meta.url === pathToFileURL(realpathSync(entryPath)).href) {
  await createServer().connect(new StdioServerTransport());
}
