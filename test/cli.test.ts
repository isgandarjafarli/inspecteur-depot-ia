import { describe, expect, it } from "vitest";
import { parseArgs } from "../src/cli.js";

describe("parseArgs", () => {
  it("keeps a repo path that contains a space", () => {
    const args = parseArgs(["review", "--repo", "/tmp/My Projects"]);

    expect(args.repositoryPath).toBe("/tmp/My Projects");
  });

  it("rejects an unknown flag", () => {
    expect(() => parseArgs(["review", "--repo", "/tmp/x", "--validat", "npm test"])).toThrow(
      "Unknown option: --validat",
    );
  });

  it("rejects a stray argument, e.g. an unquoted --validate npm test", () => {
    expect(() => parseArgs(["review", "--repo", "/tmp/x", "--validate", "npm", "test"])).toThrow(
      "Unexpected argument: test",
    );
  });

  it("rejects a flag with no value", () => {
    expect(() => parseArgs(["review", "--repo", "/tmp/x", "--validate"])).toThrow(
      "Missing value for --validate",
    );
  });
});
