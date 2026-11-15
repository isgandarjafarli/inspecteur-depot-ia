#!/usr/bin/env node
import { realpathSync, writeFileSync } from "node:fs";
import { pathToFileURL } from "node:url";
import { reviewRepository } from "./core.js";

export type Args = {
  command: string;
  repositoryPath?: string;
  baseRef?: string;
  format?: "markdown" | "json";
  validations: string[];
};

const USAGE = "Usage: inspector review --repo <path> [--base-ref <ref>] [--validate <command>]";

// Throws on unknown flags and missing values so a mistyped flag (e.g. --validat)
// can't silently skip a check.
export function parseArgs(argv: string[]): Args {
  const args: Args = { command: argv[0] ?? "", validations: [] };
  for (let index = 1; index < argv.length; index++) {
    const token = argv[index];
    const takeValue = (): string => {
      const value = argv[index + 1];
      if (value === undefined || value.startsWith("--")) {
        throw new Error(`Missing value for ${token}`);
      }
      index++;
      return value;
    };

    if (token === "--repo") {
      args.repositoryPath = takeValue();
    } else if (token === "--base-ref") {
      args.baseRef = takeValue();
    } else if (token === "--format") {
      args.format = takeValue() as Args["format"];
    } else if (token === "--validate") {
      args.validations.push(takeValue());
    } else if (token.startsWith("-")) {
      throw new Error(`Unknown option: ${token}`);
    } else {
      throw new Error(`Unexpected argument: ${token}`);
    }
  }
  return args;
}

async function main() {
  let args: Args;
  try {
    args = parseArgs(process.argv.slice(2));
  } catch (error) {
    console.error(`Error: ${(error as Error).message}`);
    console.error(USAGE);
    process.exitCode = 1;
    return;
  }
  if (args.command !== "review" || !args.repositoryPath) {
    console.error(USAGE);
    process.exitCode = 1;
    return;
  }

  const report = await reviewRepository({
    repositoryPath: args.repositoryPath,
    baseRef: args.baseRef,
    validationCommands: args.validations,
    format: args.format,
  });
  writeFileSync("review-report.md", report, "utf8");
  console.log("Review report written to review-report.md");
}

const entryPath = process.argv[1];
if (entryPath && import.meta.url === pathToFileURL(realpathSync(entryPath)).href) {
  main().catch((error) => {
    console.error("Fatal error:", error);
    process.exitCode = 1;
  });
}