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

## Interface decision

- Decision: CLI-first / MCP-first / hybrid
- Primary user and execution environment:
- Trust boundary and allowed capabilities:
- Reliability, discoverability, latency/context, and output tradeoffs:
- How supported interfaces remain consistent:
- Evidence that would change this decision:

## How did you use an AI coding agent?

## Where did you check, correct, or reject an AI suggestion? (required)

## Commands used to verify the result, with outcomes

## A blocker you hit and how you approached it

## Known limitations and the next three things you would do

## Approximate focused-work time

- Start:
- Finish: