import { getPreferenceValues } from "@raycast/api";
import { useEffect, useRef, useState } from "react";
import { Session, startSession } from "./claude";

export interface Message {
  role: "user" | "assistant";
  text: string;
  time: Date;
}

// Raycast forms can't render markdown, so ask for plain text.
const PLAIN_TEXT = "Reply in plain text without markdown formatting.";

/**
 * Chat state on top of a single claude process. Replies come back in the order the questions
 * were sent; each question adds a user message plus an empty assistant message that fills up.
 */
export function useConversation(firstQuestion: string, model: string | undefined) {
  const prefs = getPreferenceValues<Preferences.Ask>();
  const [messages, setMessages] = useState<Message[]>([]);
  const [pending, setPending] = useState(0);
  const [ended, setEnded] = useState(false);
  const session = useRef<Session | undefined>(undefined);

  const send = (text: string) => {
    const now = new Date();
    setMessages((m) => [...m, { role: "user", text, time: now }, { role: "assistant", text: "", time: now }]);
    setPending((n) => n + 1);
    session.current?.send(text);
  };

  useEffect(() => {
    // `cancelled` makes a stale run (e.g. React's dev double-mount) inert
    let cancelled = false;
    const guard =
      <A extends unknown[]>(fn: (...args: A) => void) =>
      (...args: A) => {
        if (!cancelled) fn(...args);
      };
    // number of questions answered so far; the next reply goes to the assistant message at this slot
    let answered = 0;
    const replyIndex = () => answered * 2 + 1;
    const updateReply = (fn: (m: Message) => Message) => {
      const target = replyIndex(); // read now: updaters run later, after `answered` may have moved on
      setMessages((all) => all.map((m, i) => (i === target ? fn(m) : m)));
    };

    setMessages([]);
    setPending(0);
    setEnded(false);
    session.current = startSession(
      {
        bin: prefs.claudePath,
        model: model || prefs.defaultModel || "haiku",
        systemPrompt: `${prefs.systemPrompt || "Answer as briefly as possible."} ${PLAIN_TEXT}`,
        oauthToken: prefs.oauthToken,
      },
      {
        onDelta: guard((text) => updateReply((m) => ({ ...m, text: m.text + text }))),
        onResult: guard(({ error, text, streamed }) => {
          updateReply((m) => ({
            ...m,
            text: error ? `${m.text}\n\nError: ${error}` : streamed ? m.text : text,
            time: new Date(),
          }));
          answered++;
          setPending((n) => n - 1);
        }),
        onExit: guard(({ unexpected, message }) => {
          setEnded(true);
          if (!unexpected) return;
          // fail replies that never came, so the spinner stops and the reason is visible
          const from = replyIndex();
          setMessages((all) =>
            all.map((m, i) =>
              m.role === "assistant" && i >= from ? { ...m, text: `${m.text}\n\nError: ${message}` } : m,
            ),
          );
          setPending(0);
        }),
      },
    );
    send(firstQuestion);
    return () => {
      cancelled = true;
      session.current?.close();
    };
  }, []);

  return { messages, busy: pending > 0, ended, send };
}
