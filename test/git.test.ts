import { execFileSync } from "node:child_process";
import { mkdtempSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { changedFiles } from "../src/git.js";

function git(cwd: string, args: string[]): void {
  execFileSync(
    "git",
    ["-c", "user.name=Test User", "-c", "user.email=test@example.com", ...args],
    { cwd, stdio: "pipe" },
  );
}

describe("changedFiles base ref handling", () => {
  let repoPath: string;
  let outputDir: string;

  beforeEach(() => {
    repoPath = mkdtempSync(join(tmpdir(), "inspector-git-"));
    outputDir = mkdtempSync(join(tmpdir(), "inspector-git-out-"));
    git(repoPath, ["init", "-q", "-b", "main"]);
    writeFileSync(join(repoPath, "a.txt"), "hello\n");
    git(repoPath, ["add", "a.txt"]);
    git(repoPath, ["commit", "-q", "-m", "main: add a.txt"]);
    git(repoPath, ["switch", "-q", "-c", "feature"]);
    writeFileSync(join(repoPath, "b.txt"), "feature\n");
    git(repoPath, ["add", "b.txt"]);
    git(repoPath, ["commit", "-q", "-m", "feature: add b.txt"]);
  });

  afterEach(() => {
    rmSync(repoPath, { recursive: true, force: true });
    rmSync(outputDir, { recursive: true, force: true });
  });

  it("rejects a base ref that starts with '-' and does not let git write a file", () => {
    const baseRef = `--output=${join(outputDir, "out.txt")}`;

    expect(() => changedFiles(repoPath, baseRef)).toThrow(
      `Invalid base ref "${baseRef}": refs must not start with "-".`,
    );
    // Check the whole folder: git would append "...HEAD" to the file name.
    expect(readdirSync(outputDir)).toEqual([]);
  });

  it("gives a clear error when the base ref does not exist", () => {
    expect(() => changedFiles(repoPath, "does-not-exist")).toThrow(
      `Base ref "does-not-exist" does not exist in ${repoPath}.`,
    );
  });
});
