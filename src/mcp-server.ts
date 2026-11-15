#!/usr/bin/env node
import { realpathSync } from "node:fs";
import { pathToFileURL } from "node:url";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { reviewRepository } from "./core.js";

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
