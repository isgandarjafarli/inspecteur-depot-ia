# Submission

## What did you investigate first, and why?

As my timed session started, I looked into the repository to try and understand what is going on, then I asked Claude Code to explain things I either did not fully understand or thought would be a waste of time if I tackle it myself. Then, I used Claude to map the code and list suspected issues after I got on track with what the general problem is and what is expected from me. In the session I first re-checked the trust boundary (the MCP entry point and the validation runner) against a small test repo with one change on a feature branch:
- MCP review_repository with repo_path returned "# Review Report: undefined" with no files and no error, while the CLI correctly listed b.txt (added).
- A failing --validate command crashed the CLI with exit 1 and left the previous, stale report in place.
- --validate ran an arbitrary command that created pwned.txt in the target repo, and the same path is reachable over MCP.

## What did you choose to implement or fix?

I implemented six fixes, one commit each (except for number 2, where I committed twice), each with a test. Also, all except for one run against the old code first and failed:
1. MCP tool ignored repo_path: the handler read input.repoPath. Because of this, every call reviewed the server's own folder, which was not what we wanted from it. After I fixed it, it reads repo_path, the handler is typed so typecheck catches this, and createServer() is exported for testing.
2. MCP clients could run any shell command. But now, the MCP adapter only accepts npm test, npm run typecheck and npm run build, and it refuses anything else without running it, and also it lists the allowed commands in the tool schema.
3. A failing validation crashed the review. It now returns failed with stdout, stderr and the exit code, has a 2-minute timeout, and the report now shows (passed) or (failed).
4. A --base-ref starting with - was passed to git as an option and could make git write a file; a missing ref gave git's raw error. Both now fail with clear errors in git.ts, for CLI and MCP alike
5. Output containing triple backticks could break out of the report's code block and inject Mrkdown an agent would read. Fences are now longer than any backtick run inside.
6. CLI arguments: paths with spaces were cut, unknown flags and stray words were ignored, a missing value crashed. All now work or give a clear error and also exit 1.

## What did you intentionally not do?

* No size cap on report or validation output: huge output floods an agent's context, and above 1 MB the check fails on exec's buffer limit.
* Git parsing: renames show as "oldnew (modified)", non-ASCII names come out quoted, and uncommitted or untracked changes are ignored.
* --format json is accepted but ignored; the report is always Markdown.
* package.json bin points to dist/cli.js, but the build writes dist/src/cli.js.
* The CLI always writes review-report.md into the current folder, overwriting the previous one.
* I did not run npm audit fix --force for the 15 dependency advisories : it would move zod to a new major version.

i ranked these below the six above because none of them lets an agent's input run code, write files, mislead the agent, or silently skip a check.

## Interface decision

* Decision: hybrid
* Primary user and execution environment: developers in a local terminal (CLI), and AI coding agents calling the tool over stdio MCP on the same machine.
* Trust boundary and allowed capabilities: a developer at the CLI is trusted to run what they type. An MCP client is not, because agents can be steered by text they read (prompt injection). Over MCP the tool may only review a repository and run the three allowlisted checks.
* Reliability, discoverability, latency/context, and output tradeoffs: MCP gives agents a typed, discoverable tool, and the schema now lists the allowed checks so agents don't waste calls. Agents need compact output, so a size cap is the next step. Checks can be slow or hang, so they have a timeout. The CLI writes a file, which suits humans and CI.
* How supported interfaces remain consistent: both go through reviewRepository in core.ts, so the git checks, validation results and report format are shared and tested once. Only the policy differs: the allowlist sits in the MCP adapter.
* Evidence that would change this decision: if usage showed almost all calls come from agents, I would go MCP-first. Then I'd apply the same rules to the CLI. If nobody used MCP , I would drop it and keep the CLI. 

## How did you use an AI coding agent?

Claude Code made the edits and ran commands in my repository. I also talked to Claude code to check for its suggestions and made higher-order executive decisions when it remained unsure; and during the session it helped me order the work. I also occasionally used Claude Code to do its own prompt engineering when my instructions were not as clear and the code would still crash.  For every change I asked Claude Code for its plan first, then a failing test, then the smallest fix, then typecheck and tests, and I read each diff before committing. I also used Claude to help draft and edit this write-up. I was telling it to keep my comments in its mind along the way so I do not have to write everything. Most could be formatted by Claude Code to save my time. The most important parts like this one or where it concered my higher-order decision making were completely written by me. I briefly wrote to Claude Code where I rejected its suggestions and asked it to phrase it better below. 

## Where did you check, correct, or reject an AI suggestion? (required)

* Claude Code planned to reproduce the MCP bug on a test repo with a single commit. That repo has no changes to compare, so it cannot tell "wrong folder" from "no changes". I had it add a feature branch, so the correct CLI report and the broken MCP report could be compared.
* Its "is this file run directly" check compared paths as plain text. The reviewer chat tested it: launched through a symlink, the server started nothing and exited 0. I had it resolve the real path first.
* For the timeout it proposed killing the whole process tree with platform-specific code, to avoid a possible delay. I had it measure first: the timeout returned in 508 ms, so the delay didn't happen. I kept exec's built-in timeout and listed leftover child processes as a known limitation, because the Windows branch could not be tested in CI.
* For the fence test it proposed a hand-written Markdown scanner. I replaced it with a check on the exact expected text: simpler, readable, and it doesn't reimplement the logic it tests.
* In the CLI fix it added a check for stray arguments that I had not asked for. I kept it, because the reason was sound (a missing quote silently drops part of a command), but only after requiring a test for it. That one test was added after the check existed, so unlike the others it was not run against the old code first.
* npm install with my newer npm rewrote package-lock.json. I reverted it, because CI uses npm ci with the committed lock file.

## Commands used to verify the result, with outcomes

* npm run typecheck: exit 0
* npm test: 13 tests passed (1 at the start)
* npm run build: passed
* Every new test was run against the old code first and failed for the expected reason, for example "# Review Report: undefined", "expected [Function] to throw", or a 5 s vitest timeout.
* I temporarily removed the schema description to confirm its test fails without it, then restored it.
* Manual reruns: the CLI with --base-ref "--output=" now exits 1 with a clear error and writes no file; npm run mcp-server starts and answers an initialize request.
* The reviewer chat cloned my pushed repository and ran npm ci, typecheck, build and test on Linux, the OS CI uses: all passed.

## A blocker you hit and how you approached it

The MCP server started listening on stdio as soon as its file was imported, so a test could not call the tool without starting a real server, and a fail-first test would only have failed on a missing export, not on the bug. I split the work: first export createServer() and start stdio only when the file is run directly, then run the test and see it fail on the real bug (the "undefined" report), then apply the one-line fix.

## Known limitations and the next three things you would do

* The allowlist limits which command runs, but npm test runs whatever the target repository's package.json defines, so an agent pointed at an untrusted repository can still run that repository's code.
* On timeout only the shell is killed; child processes it started can keep running.
* The "### " heading line isn't escaped, so a CLI --validate command containing a newline could inject Markdown there. MCP is not affected because of the allowlist.
* The base-ref check is tested at the git.ts level, with no MCP-level test.

Next three:

1. Let MCP review only configured repository roots, which also closes the npm test gap above.
2. Cap report and validation output size, with a clear "truncated" note.
3. Fix git parsing (-z, renames, uncommitted changes), and implement or remove --format json.

## Approximate focused-work time

* Start: about 02:12 (Baku time, 16 November 2026)
* Finish: 3:30 (Baku time, 16 November 2026)
* P.S. I finished writing the SUBMISSION.md at 3:48