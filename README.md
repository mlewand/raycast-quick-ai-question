# Quick AI Question

A private Raycast extension for throwaway questions. It runs the official `claude` CLI in print mode, so:

- usage counts against your Claude plan (no API key),
- nothing shows up in claude.ai history, and with `--no-session-persistence` nothing is saved locally either,
- credentials never leave Anthropic's own binary.

Tools, MCP servers, skills, user settings and the coding system prompt are all switched off, and `claude` runs from a temp dir, so answers are fast and cheap.

## Setup

```sh
pnpm install
pnpm run dev
```

Once `dev` has run, the extension stays imported in Raycast and you can stop it. Then in Raycast, open **Ask Claude**, and set an alias (e.g. `q`) in Raycast Settings → Extensions. Type `q`, space, your question, Enter. Tab moves to the optional model picker (Haiku / Sonnet / Opus). Haiku is the default.

Enter copies the answer, ⌘↵ pastes it into the frontmost app (see the action panel with ⌘K).

## Preferences

- **claude Binary**: defaults to `~/.local/bin/claude`. Use the output of `which claude`.
- **Default Model**: used when no model is picked in the arguments.
- **OAuth Token**: only needed if you see "Not logged in". Run `claude setup-token` and paste the result here.
- **System Prompt**: the instruction that keeps answers short.

## Notes

- Don't add `--bare`: it ignores subscription (OAuth) auth.
- `package.json` uses `license: UNLICENSED` and `private: true`; `pnpm run lint` (Raycast store validation) will complain about that, which doesn't matter for a local extension.
