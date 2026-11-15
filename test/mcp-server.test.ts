import { execFileSync } from "node:child_process";
import { existsSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createServer } from "../src/mcp-server.js";

function git(cwd: string, args: string[]): void {
  execFileSync(
    "git",
    ["-c", "user.name=Test User", "-c", "user.email=test@example.com", ...args],
    { cwd, stdio: "pipe" },
  );
}

describe("review_repository MCP tool", () => {
  let repoPath: string;

  beforeAll(() => {
    repoPath = mkdtempSync(join(tmpdir(), "inspector-mcp-"));
    git(repoPath, ["init", "-q", "-b", "main"]);
    writeFileSync(join(repoPath, "a.txt"), "hello\n");
    git(repoPath, ["add", "a.txt"]);
    git(repoPath, ["commit", "-q", "-m", "main: add a.txt"]);
    git(repoPath, ["switch", "-q", "-c", "feature"]);
    writeFileSync(join(repoPath, "b.txt"), "feature\n");
    git(repoPath, ["add", "b.txt"]);
    git(repoPath, ["commit", "-q", "-m", "feature: add b.txt"]);
  });

  afterAll(() => {
    rmSync(repoPath, { recursive: true, force: true });
  });

  it("reviews the repository given in repo_path", async () => {
    const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
    const server = createServer();
    const client = new Client({ name: "test-client", version: "0.0.0" });
    await server.connect(serverTransport);
    await client.connect(clientTransport);

    try {
      const { tools } = await client.listTools();
      const tool = tools.find((t) => t.name === "review_repository");
      const properties = tool?.inputSchema.properties as
        | Record<string, { description?: string }>
        | undefined;
      const description = properties?.validationCommands?.description ?? "";
      expect(description).toContain("npm test");
      expect(description).toContain("npm run typecheck");
      expect(description).toContain("npm run build");

      const result = await client.callTool({
        name: "review_repository",
        arguments: { repo_path: repoPath },
      });

      expect(result.isError).toBeFalsy();
      const content = result.content as Array<{ type: string; text: string }>;
      const text = content[0].text;
      expect(text).toContain(`# Review Report: ${repoPath}`);
      expect(text).toContain("- b.txt (added)");
    } finally {
      await client.close();
      await server.close();
    }
  });

  it("refuses validation commands outside the allowlist without running them", async () => {
    const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
    const server = createServer();
    const client = new Client({ name: "test-client", version: "0.0.0" });
    await server.connect(serverTransport);
    await client.connect(clientTransport);

    try {
      const result = await client.callTool({
        name: "review_repository",
        arguments: {
          repo_path: repoPath,
          validationCommands: ["node -e \"require('fs').writeFileSync('pwned.txt','')\""],
        },
      });

      expect(result.isError).toBe(true);
      const content = result.content as Array<{ type: string; text: string }>;
      const text = content[0].text;
      expect(text).toContain("npm test");
      expect(text).toContain("npm run typecheck");
      expect(text).toContain("npm run build");
      expect(existsSync(join(repoPath, "pwned.txt"))).toBe(false);
    } finally {
      await client.close();
      await server.close();
    }
  });
});
