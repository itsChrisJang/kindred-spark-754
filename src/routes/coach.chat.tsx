import { createFileRoute } from "@tanstack/react-router";
import { useMutation } from "@tanstack/react-query";
import { Mic, Send, Sparkles } from "lucide-react";
import { useEffect, useRef, useState } from "react";
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
  const scrollRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = (smooth = true) => {
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        const el = scrollRef.current;
        if (el) {
          el.scrollTo({ top: el.scrollHeight, behavior: smooth ? "smooth" : "auto" });
        }
      });
    });
  };


  const send = useMutation({
    mutationFn: (text: string) => {
      const history = messages.map((m) => ({
        role: m.role === "me" ? ("user" as const) : ("assistant" as const),
        text: m.text,
      }));
      return api.chatPractice(mode, text, history);
    },
    onSuccess: (reply) => {
      setMessages((m) => [...m, { role: "ai", text: reply.feedback, reply }]);
    },
    onError: () => {
      setMessages((m) => [
        ...m,
        { role: "ai", text: "앗, 답변 생성에 실패했어요. 잠시 후 다시 시도해주세요." },
      ]);
    },
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const text = input.trim();
    if (!text || send.isPending) return;
    setMessages((m) => [...m, { role: "me", text }]);
    setInput("");
    send.mutate(text);
  }

  function switchMode(next: Mode) {
    setMode(next);
    const intro: Record<Mode, string> = {
      intro: "안녕하세요! 지금부터 소개팅 자기소개를 연습해볼게요. 먼저 30초 자기소개를 해보세요 😊",
      hobby: "취미·관심사 이야기를 연습해볼게요. 요즘 가장 빠져있는 게 뭔가요? 🎨",
      smalltalk: "스몰토크를 연습해볼게요. 가볍게 날씨나 주말 이야기로 말 걸어보세요.",
    };
    setMessages([{ role: "ai", text: intro[next] }]);
    setInput("");
  }

  useEffect(() => {
    scrollToBottom();
  }, [messages, send.isPending]);

  return (
    <PhoneShell hideNav>
      {/* Fixed top header */}
      <div className="fixed inset-x-0 top-0 z-20 mx-auto w-full max-w-[420px] bg-surface">
        <NavHeader back title="대화 연습" />
        <div className="px-4 pb-3">
          <div className="flex gap-2">
            {MODES.map((m) => (
              <button
                key={m.id}
                onClick={() => switchMode(m.id)}
                className={`pill ${mode === m.id ? "pill-active" : ""}`}
              >
                {m.label}
              </button>
            ))}
          </div>
        </div>
        <div className="h-px w-full bg-border/60" />
      </div>

      {/* Scrollable messages, sized to fit between header and input */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto px-4"
        style={{ paddingTop: "120px", paddingBottom: "88px" }}
      >
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
                          <div className="mb-2 text-xs font-semibold text-purple">이렇게 이어가보세요</div>
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
          {send.isPending && (
            <div className="flex items-start gap-2">
              <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-pink to-purple">
                <Sparkles size={14} className="text-white" />
              </div>
              <div className="inline-block rounded-2xl rounded-bl-md bg-secondary px-3.5 py-2.5 text-sm">
                <TypingDots />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Fixed bottom input */}
      <div className="fixed inset-x-0 bottom-0 z-20 mx-auto w-full max-w-[420px] border-t border-border bg-surface px-4 pt-3 pb-[max(env(safe-area-inset-bottom),12px)]">
        <form onSubmit={handleSubmit} className="flex items-center gap-2">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="메시지를 입력하세요..."
            className="flex-1 rounded-full bg-secondary px-4 py-2.5 text-sm outline-none"
          />
          <button
            type="submit"
            disabled={send.isPending}
            className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-pink text-white disabled:opacity-50"
            aria-label={input.trim() ? "보내기" : "음성 입력"}
          >
            {input.trim() ? <Send size={16} /> : <Mic size={18} />}
          </button>
        </form>
      </div>
    </PhoneShell>
  );
}


function TypingDots() {
  const [n, setN] = useState(1);
  useEffect(() => {
    const id = setInterval(() => setN((v) => (v % 3) + 1), 400);
    return () => clearInterval(id);
  }, []);
  return (
    <span className="inline-flex items-center text-text-2">
      <span className="mr-1.5 text-xs">AI 분석중</span>
      <span className="inline-block w-4 text-left tracking-widest">{".".repeat(n)}</span>
    </span>
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
