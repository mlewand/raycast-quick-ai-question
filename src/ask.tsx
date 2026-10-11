import { Action, ActionPanel, Form, Icon, LaunchProps, Toast, showToast } from "@raycast/api";
import { Fragment, useState } from "react";
import { Message, useConversation } from "./use-conversation";

const BOLD_OFFSETS = { upper: 0x1d5d4 - 65, lower: 0x1d5ee - 97 };

/** Forms can't render bold text, so use the mathematical sans-serif bold letters. */
const bold = (s: string) =>
  [...s]
    .map((c) => {
      const code = c.charCodeAt(0);
      if (code >= 65 && code <= 90) return String.fromCodePoint(code + BOLD_OFFSETS.upper);
      if (code >= 97 && code <= 122) return String.fromCodePoint(code + BOLD_OFFSETS.lower);
      return c;
    })
    .join("");

const formatTime = (d: Date) => d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
const sender = (m: Message) => (m.role === "user" ? "You" : "Claude");
const transcript = (messages: Message[]) =>
  messages.map((m) => `${sender(m)} (${formatTime(m.time)}):\n${m.text}`).join("\n\n---\n\n");

export default function Ask(props: LaunchProps<{ arguments: Arguments.Ask }>) {
  const { messages, busy, ended, send } = useConversation(props.arguments.question, props.arguments.model);
  const [draft, setDraft] = useState("");

  const submit = () => {
    const text = draft.trim();
    if (!text) return;
    if (ended) {
      showToast({
        style: Toast.Style.Failure,
        title: "Conversation ended",
        message: "Close this window and ask again.",
      });
      return;
    }
    send(text);
    setDraft("");
  };

  const lastAnswer = [...messages].reverse().find((m) => m.role === "assistant")?.text ?? "";

  return (
    <Form
      isLoading={busy}
      actions={
        <ActionPanel>
          {/* Enter sends; Shift+Enter is left to the text area, which inserts a newline */}
          <Action title="Send" icon={Icon.ArrowRight} shortcut={{ modifiers: [], key: "return" }} onAction={submit} />
          <Action.CopyToClipboard
            title="Copy Last Answer"
            content={lastAnswer}
            shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
          />
          <Action.Paste
            title="Paste Last Answer"
            content={lastAnswer}
            shortcut={{ modifiers: ["cmd", "shift"], key: "v" }}
          />
          <Action.CopyToClipboard
            title="Copy Whole Conversation"
            content={transcript(messages)}
            shortcut={{ modifiers: ["cmd", "opt"], key: "c" }}
          />
        </ActionPanel>
      }
    >
      {/* Raycast can't scroll a form, so the input is on top and messages follow newest first */}
      <Form.TextArea
        id="prompt"
        title=""
        placeholder={ended ? "Conversation ended" : "Ask a follow-up…"}
        value={draft}
        onChange={setDraft}
      />
      {[...messages].reverse().map((m, i) => (
        <Fragment key={messages.length - i}>
          <Form.Description text={`${bold(sender(m))} · ${formatTime(m.time)}`} />
          <Form.Description text={m.text || "…"} />
          <Form.Separator />
        </Fragment>
      ))}
    </Form>
  );
}
