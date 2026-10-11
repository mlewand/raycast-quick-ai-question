import { Action, ActionPanel, Detail, LaunchProps, getPreferenceValues } from "@raycast/api";
import { spawn } from "node:child_process";
import { homedir, tmpdir, userInfo } from "node:os";
import { useEffect, useState } from "react";

export default function Ask(props: LaunchProps<{ arguments: Arguments.Ask }>) {
  const { question, model } = props.arguments;
  const prefs = getPreferenceValues<Preferences.Ask>();
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const bin = (prefs.claudePath || "~/.local/bin/claude").replace(/^~(?=\/|$)/, homedir());
    // claude looks up its keychain credentials by $USER, which GUI-launched processes may lack
    const { username } = userInfo();
    const env: NodeJS.ProcessEnv = { USER: username, LOGNAME: username, ...process.env };
    if (prefs.oauthToken) env.CLAUDE_CODE_OAUTH_TOKEN = prefs.oauthToken;

    const child = spawn(
      bin,
      [
        "-p",
        question,
        "--model",
        model || prefs.defaultModel || "haiku",
        "--no-session-persistence",
        "--output-format",
        "stream-json",
        "--verbose",
        "--include-partial-messages",
        "--tools",
        "",
        "--strict-mcp-config",
        "--disable-slash-commands",
        "--setting-sources",
        "",
        "--system-prompt",
        prefs.systemPrompt || "Answer as briefly as possible.",
      ],
      // stdin must be closed, otherwise -p waits for piped input
      { cwd: tmpdir(), env, stdio: ["ignore", "pipe", "pipe"] },
    );

    let streamed = false;
    let errored = false;
    let buf = "";
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
        setText((t) => t + ev.event.delta.text);
      } else if (ev.type === "result") {
        if (ev.is_error) {
          errored = true;
          setText((t) => `${t}\n\n**Error:** ${ev.result}`);
        } else if (!streamed && typeof ev.result === "string") {
          setText(ev.result);
        }
      }
    };

    child.stdout.on("data", (chunk: Buffer) => {
      buf += chunk.toString();
      const lines = buf.split("\n");
      buf = lines.pop() ?? "";
      lines.forEach(handleLine);
    });
    child.stderr.on("data", (d: Buffer) => setText((t) => `${t}\n\n\`${d.toString().trim()}\``));
    child.on("error", (err) =>
      setText(`**Could not run \`${bin}\`:** ${err.message}\n\nSet the correct path in the command preferences.`),
    );
    child.on("close", (code) => {
      handleLine(buf);
      if (code && !errored) setText((t) => `${t}\n\n\`claude exited with code ${code}\``);
      setLoading(false);
    });

    return () => {
      child.kill("SIGINT");
    };
  }, []);

  return (
    <Detail
      isLoading={loading}
      navigationTitle={question}
      markdown={text || "…"}
      actions={
        <ActionPanel>
          <Action.CopyToClipboard content={text} />
          <Action.Paste content={text} />
        </ActionPanel>
      }
    />
  );
}
