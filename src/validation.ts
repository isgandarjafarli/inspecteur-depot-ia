import { exec } from "node:child_process";
import type { ValidationResult } from "./types.js";

export type ValidationOptions = {
  /** Kill the command after this many milliseconds. Defaults to 2 minutes. */
  timeoutMs?: number;
};

export const DEFAULT_VALIDATION_TIMEOUT_MS = 2 * 60 * 1000;

function combineOutput(stdout: string, stderr: string): string {
  return [stdout, stderr].filter((part) => part.length > 0).join("\n");
}

// Never rejects: a failing or timed-out command is reported as "failed".
// Note: on timeout only the shell is killed; child processes it started may keep running.
export function runValidation(
  command: string,
  cwd: string,
  options: ValidationOptions = {},
): Promise<ValidationResult> {
  const timeoutMs = options.timeoutMs ?? DEFAULT_VALIDATION_TIMEOUT_MS;
  return new Promise((resolve) => {
    exec(command, { cwd, timeout: timeoutMs }, (error, stdout, stderr) => {
      const output = combineOutput(stdout, stderr);
      if (!error) {
        resolve({ command, status: "passed", output });
        return;
      }
      const note = error.killed
        ? `[timed out after ${timeoutMs} ms]`
        : `[exit code ${error.code ?? "unknown"}${error.signal ? `, signal ${error.signal}` : ""}]`;
      resolve({ command, status: "failed", output: output ? `${output}\n${note}` : note });
    });
  });
}

export async function runValidations(
  commands: string[],
  cwd: string,
  options: ValidationOptions = {},
): Promise<ValidationResult[]> {
  const results: ValidationResult[] = [];
  for (const command of commands) {
    results.push(await runValidation(command, cwd, options));
  }
  return results;
}
