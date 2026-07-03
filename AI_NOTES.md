# AI_NOTES.md

## Tools used
Built with Claude (Anthropic) as the primary AI pair-programmer, working
directly in an agentic coding environment with file read/write and a
sandboxed shell. Roughly 80% of the boilerplate (models, routes, CRUD
controllers, page scaffolding, CSS) was AI-generated from a spec; the
remaining 20% — the interaction state machine, dedup strategy, and the
defer/follow-up flow — needed several rounds of correction described below.

## Key decisions made deliberately (not just "what the AI suggested")

1. **Dedup on `interactionId` via a unique Mongo index, not an in-memory
   set.** An in-memory Set would reset on every redeploy/restart (common on
   free hosting tiers that sleep), silently reopening the door to
   double-processing right after a cold start. A DB-level unique index is
   the actual guarantee, and it also gives "already processed" a natural
   fallback response when a duplicate does slip through the pre-check.

2. **Mirror failures are `pending`, not `failed`, until a retry budget is
   exhausted.** The brief said a downstream outage must not lose the
   interaction. Treating every failed webhook POST as terminal would violate
   that. Instead there's a background sweep (`retryPendingMirrors`, every
   60s) that requeues anything still `pending`, with a 5-attempt cap so a
   permanently dead webhook doesn't retry forever and pollute the queue.

3. **Deferred response only on the AI path, not for every command.**
   Deferring every interaction would be simpler code, but it makes the bot
   feel slower for the common case (`/status`, `/report` without AI) where a
   direct reply comfortably fits in the 3-second window. Only the AI
   summarization call — the one genuinely slow, uncertain-latency step —
   goes through defer + follow-up-edit.

## The hardest bug / wrong turn

The first draft of the Ed25519 verification middleware worked in manual
`curl` testing but failed on ~every real request Discord sent, including the
initial PING handshake. The AI's first instinct was to verify against
`JSON.stringify(req.body)` after `express.json()` had already parsed it —
which round-trips through JSON.parse/stringify and can change key order and
whitespace relative to the exact bytes Discord signed. The signature check
uses the *raw bytes*, so any re-serialization breaks it, and the failure
mode is a plain 401 with no useful message from Discord's side, which made
it look at first like the public key itself was wrong.

Fixed by moving the raw body capture into `express.json()`'s own `verify`
hook (`req.rawBody = buf`) so the exact bytes Discord sent are preserved
alongside the parsed object, and having the signature check use `req.rawBody`
instead of anything derived from `req.body`. Confirmed the fix by comparing
byte lengths of `req.rawBody` vs. `Buffer.from(JSON.stringify(req.body))` in
a temporary log line — they differed by a few bytes on nearly every request,
which is what had been silently breaking verification.

## What I'd add with more time

- Full button/modal interaction handling (`MESSAGE_COMPONENT` /
  `MODAL_SUBMIT`) — the type-check branch exists but isn't built out.
- Socket.io push instead of 5s dashboard polling.
- Structured JSON logging (pino) instead of `console.log`/`console.error`,
  plus a visible "failures & retries" view in the dashboard rather than just
  a mirror-status badge per row.
- Real multi-server UI (a server switcher) instead of "load one config at a
  time" in Settings.

## Illustrative prompt excerpt (the raw-body fix)

> "Discord's PING keeps getting a 401 from my endpoint even though I'm sure
> the public key is right. Here's my verify middleware and where I mount
> `express.json()` — what's going on?"

The response identified that `express.json()` had already consumed and
reserialized the body before the signature check ran, and proposed the
`verify` callback pattern used in `server.js` today.
