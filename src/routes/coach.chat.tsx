import { createFileRoute } from "@tanstack/react-router";
import { useMutation } from "@tanstack/react-query";
import { Mic, Send, Sparkles } from "lucide-react";
import { useState } from "react";
import { PhoneShell, NavHeader } from "@/components/PhoneShell";
import { api, type ChatPracticeReply } from "@/lib/api";

export const Route = createFileRoute("/coach/chat")({
  head: () => ({
    meta: [
      { title: "AI 대화 연습 — 소개팅 AI" },
      { name: "description", content: "자기소개·취미·스몰토크를 AI와 미리 연습하세요." },
    ],
  }),
  component: ChatPractice,
});

type Mode = "intro" | "hobby" | "smalltalk";
type Msg =
  | { role: "me"; text: string }
  | { role: "ai"; text: string; reply?: ChatPracticeReply };

const MODES: { id: Mode; label: string }[] = [
  { id: "intro", label: "자기소개" },
  { id: "hobby", label: "취미·관심사" },
  { id: "smalltalk", label: "스몰토크" },
];

function ChatPractice() {
  const [mode, setMode] = useState<Mode>("intro");
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<Msg[]>([
    { role: "ai", text: "안녕하세요! 지금부터 소개팅 자기소개를 연습해볼게요. 먼저 30초 자기소개를 해보세요 😊" },
  ]);

  const send = useMutation({
    mutationFn: (text: string) => api.chatPractice(mode, text),
    onSuccess: (reply, text) => {
      setMessages((m) => [...m, { role: "me", text }, { role: "ai", text: reply.feedback, reply }]);
      setInput("");
    },
  });

  return (
    <PhoneShell hideNav>
      <NavHeader back title="대화 연습" />

      <div className="flex-shrink-0 bg-surface px-4 pb-3">
        <div className="flex gap-2">
          {MODES.map((m) => (
            <button
              key={m.id}
              onClick={() => setMode(m.id)}
              className={`pill ${mode === m.id ? "pill-active" : ""}`}
            >
              {m.label}
            </button>
          ))}
        </div>
      </div>

      <div className="scroll-area-no-nav px-4 pt-4 pb-32">
        <div className="space-y-3">
          {messages.map((msg, i) =>
            msg.role === "me" ? (
              <div key={i} className="flex justify-end">
                <div className="max-w-[80%] rounded-2xl rounded-br-md bg-pink px-3.5 py-2.5 text-sm text-white">
                  {msg.text}
                </div>
              </div>
            ) : (
              <div key={i} className="flex items-start gap-2">
                <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-pink to-purple">
                  <Sparkles size={14} className="text-white" />
                </div>
                <div className="flex-1 space-y-2">
                  <div className="inline-block max-w-[85%] rounded-2xl rounded-bl-md bg-secondary px-3.5 py-2.5 text-sm">
                    {msg.text}
                  </div>
                  {msg.reply && (
                    <div className="space-y-1.5">
                      {msg.reply.good.map((g, gi) => (
                        <Tip key={"g" + gi} kind="good">{g}</Tip>
                      ))}
                      {msg.reply.improve.map((g, gi) => (
                        <Tip key={"i" + gi} kind="improve">{g}</Tip>
                      ))}
                      {msg.reply.suggestions.length > 0 && (
                        <div className="rounded-2xl border border-border bg-surface p-3.5">
                          <div className="mb-2 text-xs font-semibold text-purple">💬 이렇게 이어가보세요</div>
                          <div className="space-y-1.5">
                            {msg.reply.suggestions.map((s, si) => (
                              <button
                                key={si}
                                onClick={() => setInput(s)}
                                className={`block w-full rounded-lg px-3 py-2 text-left text-sm ${
                                  si === 0 ? "bg-purple-light text-foreground" : "bg-secondary text-foreground"
                                }`}
                              >
                                {s}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ),
          )}
          {send.isPending && <div className="text-xs text-text-3">AI가 답변 중…</div>}
        </div>
      </div>

      {/* Input bar */}
      <div className="fixed inset-x-0 bottom-0 mx-auto w-full max-w-[420px] border-t border-border bg-surface px-4 py-3 pb-6">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (input.trim() && !send.isPending) send.mutate(input.trim());
          }}
          className="flex items-center gap-2"
        >
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="메시지를 입력하세요..."
            className="flex-1 rounded-full bg-secondary px-4 py-2.5 text-sm outline-none"
          />
          <button
            type="submit"
            className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-pink text-white"
            aria-label={input.trim() ? "보내기" : "음성 입력"}
          >
            {input.trim() ? <Send size={16} /> : <Mic size={18} />}
          </button>
        </form>
      </div>
    </PhoneShell>
  );
}

function Tip({ kind, children }: { kind: "good" | "improve"; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-border bg-surface p-3 text-xs">
      <span className={kind === "good" ? "font-semibold text-green-600" : "font-semibold text-pink"}>
        {kind === "good" ? "✓ 좋은 점" : "💡 개선 포인트"}
      </span>
      <div className="mt-1 text-text-2">{children}</div>
    </div>
  );
}
