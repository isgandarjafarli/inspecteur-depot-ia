import { describe, expect, it } from "vitest";
import { markdownReport } from "../src/report.js";
import { runValidation } from "../src/validation.js";

// Quoted because on Windows the Node path usually contains a space ("C:\Program Files\...").
const node = `"${process.execPath}"`;
const cwd = process.cwd();

describe("runValidation", () => {
  it("returns failed with stdout and stderr when the command exits 1", async () => {
    const command = `${node} -e "console.log('out-line'); console.error('err-line'); process.exit(1)"`;

    const result = await runValidation(command, cwd);

    expect(result.status).toBe("failed");
    expect(result.output).toContain("out-line");
    expect(result.output).toContain("err-line");
    expect(result.output).toContain("exit code 1");
  });

  it("returns failed with a timed out note when the command runs too long", async () => {
    const command = `${node} -e "setTimeout(() => {}, 10000)"`;

    const started = Date.now();
    const result = await runValidation(command, cwd, { timeoutMs: 500 });
    const elapsed = Date.now() - started;

    expect(result.status).toBe("failed");
    expect(result.output).toContain("timed out");
    expect(elapsed).toBeLessThan(5000);
  });

  it("returns passed and the report shows (passed)", async () => {
    const command = `${node} -e "console.log('ok')"`;

    const result = await runValidation(command, cwd);
    const report = markdownReport({
      repositoryPath: "/work/sample",
      changedFiles: [],
      validationResults: [result],
    });

    expect(result.status).toBe("passed");
    expect(result.output).toContain("ok");
    expect(report).toContain(`### ${command} (passed)`);
  });
});
