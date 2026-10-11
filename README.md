# Quick AI Question

A [Raycast](https://raycast.com) extension for throwaway questions: type a short question, get a short answer, and carry on with a follow-up or two if needed. No browser tab, no heavy desktop app, and nothing added to your chat history.

It does not talk to any API itself. Each window runs your own, already logged-in [Claude Code](https://docs.claude.com/en/docs/claude-code) CLI (`claude -p`), so:

- usage counts against your Claude plan, with no API key involved,
- credentials stay inside Anthropic's own binary and are never read or stored by this extension (the optional token preference below is the only exception),
- conversations don't appear in claude.ai history, and with `--no-session-persistence` nothing is saved locally either.

The CLI is started without tools, MCP servers, skills, user settings or its coding system prompt, and runs from a temp directory, so answers are fast and cheap.

## Requirements

- macOS with Raycast
- Node.js and [pnpm](https://pnpm.io)
- The [`claude` CLI](https://docs.claude.com/en/docs/claude-code), logged in to a Claude plan

## Install

```sh
pnpm install
pnpm run dev
```

Once `dev` has run, the extension stays imported in Raycast and you can stop it. Re-run it after pulling changes.

In Raycast, open **Ask Claude** and set an alias (e.g. `q`) under Settings → Extensions.

## Usage

- Type `q`, a space, your question, and press Enter. `Tab` moves to an optional model picker (Haiku, Sonnet or Opus); Haiku is the default.
- The newest message is at the top, directly under the input. Raycast cannot scroll a form from code, so a follow-up input at the bottom would leave streaming answers out of view.
- **Enter** sends a follow-up, **Shift+Enter** inserts a new line.
- ⌘K opens the other actions: copy the last answer (⌘⇧C), paste it into the frontmost app (⌘⇧V), copy the whole conversation (⌘⌥C).
- Closing the window ends the conversation. Answers are plain text, because Raycast forms can't render markdown.

## Preferences

| Preference    | Description                                                                                                               |
| ------------- | ------------------------------------------------------------------------------------------------------------------------- |
| claude Binary | Path to the CLI, default `~/.local/bin/claude`. Use the output of `which claude`.                                         |
| Default Model | Used when no model is picked in the command arguments.                                                                    |
| OAuth Token   | Optional. Only needed if you see "Not logged in". Run `claude setup-token` and paste the result; it is stored by Raycast. |
| System Prompt | Instructions that keep answers short.                                                                                     |

## Development

```sh
pnpm run dev           # run in Raycast with live reload
pnpm run typecheck
pnpm run build
pnpm run format        # prettier
```

- `src/claude.ts` wraps one long-lived `claude -p` process fed with stream-json messages, which is what keeps follow-ups in context without persisting anything.
- `src/use-conversation.ts` holds the chat state.
- `src/ask.tsx` is the view.

Don't add `--bare` to the CLI arguments: it ignores subscription (OAuth) login.

## License

None. This is a personal project published for reference; all rights reserved.
