import { spawn } from "node:child_process";
import { homedir, tmpdir, userInfo } from "node:os";

export interface SessionOptions {
  bin: string;
  model: string;
  systemPrompt: string;
  oauthToken?: string;
}

export interface SessionHandlers {
  /** A chunk of the reply to the oldest unanswered message. */
  onDelta: (text: string) => void;
  /** The reply to the oldest unanswered message is complete. */
  onResult: (result: { error?: string; text: string; streamed: boolean }) => void;
  /** The process could not start, or exited. `unexpected` is true when we did not ask it to stop. */
  onExit: (info: { unexpected: boolean; message: string }) => void;
}

export interface Session {
  send: (text: string) => void;
  close: () => void;
}

/**
 * A long-lived `claude -p` process fed with stream-json messages on stdin, so follow-ups keep
 * the conversation context without anything being persisted to disk or to claude.ai history.
 */
export function startSession(opts: SessionOptions, handlers: SessionHandlers): Session {
  const bin = (opts.bin || "~/.local/bin/claude").replace(/^~(?=\/|$)/, homedir());
  // claude looks up its keychain credentials by $USER, which GUI-launched processes may lack
  const { username } = userInfo();
  const env: NodeJS.ProcessEnv = { USER: username, LOGNAME: username, ...process.env };
  if (opts.oauthToken) env.CLAUDE_CODE_OAUTH_TOKEN = opts.oauthToken;

  const child = spawn(
    bin,
    [
      "-p",
      "--input-format",
      "stream-json",
      "--output-format",
      "stream-json",
      "--verbose",
      "--include-partial-messages",
      "--model",
      opts.model,
      "--no-session-persistence",
      "--tools",
      "",
      "--strict-mcp-config",
      "--disable-slash-commands",
      "--setting-sources",
      "",
      "--system-prompt",
      opts.systemPrompt,
    ],
    { cwd: tmpdir(), env, stdio: ["pipe", "pipe", "pipe"] },
  );

  let closing = false;
  let streamed = false;
  let stdoutBuf = "";
  let stderrBuf = "";

  const handleLine = (line: string) => {
    if (!line.trim()) return;
    let ev;
    try {
      ev = JSON.parse(line);
    } catch {
      return;
    }
    if (ev.type === "stream_event" && ev.event?.delta?.type === "text_delta") {
      streamed = true;
      handlers.onDelta(ev.event.delta.text);
    } else if (ev.type === "result") {
      handlers.onResult({
        error: ev.is_error ? String(ev.result) : undefined,
        text: typeof ev.result === "string" ? ev.result : "",
        streamed,
      });
      streamed = false;
    }
  };

  child.stdout.on("data", (chunk: Buffer) => {
    stdoutBuf += chunk.toString();
    const lines = stdoutBuf.split("\n");
    stdoutBuf = lines.pop() ?? "";
    lines.forEach(handleLine);
  });
  child.stderr.on("data", (d: Buffer) => (stderrBuf += d.toString()));
  child.stdin.on("error", () => {
    /* process is gone; the close/error handlers report it */
  });
  child.on("error", (err) =>
    handlers.onExit({
      unexpected: true,
      message: `Could not run \`${bin}\`: ${err.message}. Set the correct path in the command preferences.`,
    }),
  );
  child.on("close", (code) => {
    handleLine(stdoutBuf);
    handlers.onExit({
      unexpected: !closing,
      message: stderrBuf.trim() || `claude exited${code ? ` with code ${code}` : ""}.`,
    });
  });

  return {
    send: (text) => {
      const msg = { type: "user", message: { role: "user", content: text } };
      child.stdin.write(JSON.stringify(msg) + "\n");
    },
    close: () => {
      closing = true;
      child.stdin.end();
      child.kill("SIGINT");
    },
  };
}
