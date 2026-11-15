# Submission

## What did you investigate first, and why?

As my timed session started, I looked into the repository to try and understand what is going on, then I asked Claude Code to explain things I either did not fully understand or thought would be a waste of time if I tackle it myself. Then, I used Claude to map the code and list suspected issues after I got on track with what the general problem is and what is expected from me. In the session I first re-checked the trust boundary (the MCP entry point and the validation runner) against a small test repo with one change on a feature branch:
- MCP review_repository with repo_path returned "# Review Report: undefined" with no files and no error, while the CLI correctly listed b.txt (added).
- A failing --validate command crashed the CLI with exit 1 and left the previous, stale report in place.
- --validate ran an arbitrary command that created pwned.txt in the target repo, and the same path is reachable over MCP.

## What did you choose to implement or fix?

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