import { execFileSync } from "node:child_process";
import type { ChangedFile } from "./types.js";

function git(repositoryPath: string, args: string[]): string {
  return execFileSync("git", args, {
    cwd: repositoryPath,
    encoding: "utf8",
  }).trim();
}

// The base ref is passed to git as an argument, so a value starting with "-"
// would be parsed as an option (e.g. --output=<file> makes git write a file).
function assertValidBaseRef(repositoryPath: string, base: string): void {
  if (base.startsWith("-")) {
    throw new Error(`Invalid base ref "${base}": refs must not start with "-".`);
  }
  try {
    git(repositoryPath, ["rev-parse", "--verify", "--quiet", `${base}^{commit}`]);
  } catch {
    throw new Error(`Base ref "${base}" does not exist in ${repositoryPath}.`);
  }
}

export function changedFiles(repositoryPath: string, baseRef?: string): ChangedFile[] {
  const base = baseRef ?? "main";
  assertValidBaseRef(repositoryPath, base);
  const output = git(repositoryPath, ["diff", "--name-status", `${base}...HEAD`]);

  return output
    .split("\n")
    .filter(Boolean)
    .map((line) => {
      const [code, ...pathParts] = line.split("\t");
      const status = code === "A" ? "added" : code === "D" ? "deleted" : "modified";
      return { path: pathParts.join("\t"), status };
    });
}