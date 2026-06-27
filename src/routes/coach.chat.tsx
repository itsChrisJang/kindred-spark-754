import { createFileRoute } from "@tanstack/react-router";
import { useMutation } from "@tanstack/react-query";
import { Lock, Send, Sparkles, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { PhoneShell, NavHeader } from "@/components/PhoneShell";
import { api, type ChatPracticeReply } from "@/lib/api";

const FREE_LIMIT = 5;

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
  const [showPaywall, setShowPaywall] = useState(false);
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
      setMessages((m) => [...m, { role: "ai", text: reply.partnerReply, reply }]);
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
    const sentCount = messages.filter((m) => m.role === "me").length;
    if (sentCount >= FREE_LIMIT) {
      setShowPaywall(true);
      return;
    }
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
    setShowPaywall(false);
  }

  useEffect(() => {
    scrollToBottom();
  }, [messages, send.isPending]);

  return (
    <PhoneShell hideNav>
      {/* Fixed top header */}
      <div className="fixed inset-x-0 top-0 z-20 mx-auto w-full max-w-[420px] bg-surface">
        <NavHeader back backTo="/coach" title="대화 연습" />
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
        className="overflow-y-auto px-4"
        style={{ height: "100dvh", paddingTop: "120px", paddingBottom: "88px" }}
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
                      {/* 평가 */}
                      {msg.reply.feedback && (
                        <div className="rounded-xl border border-border bg-surface p-3 text-xs">
                          <div className="mb-1 font-semibold text-foreground">평가</div>
                          <div className="text-text-2 leading-relaxed">{msg.reply.feedback}</div>
                        </div>
                      )}
                      {/* 좋은 점 + 개선 포인트 통합 박스 */}
                      {(msg.reply.good.length > 0 || msg.reply.improve.length > 0) && (
                        <div className="rounded-xl border border-border bg-surface p-3 text-xs">
                          {msg.reply.good.length > 0 && (
                            <div className={msg.reply.improve.length > 0 ? "mb-2.5" : ""}>
                              <div className="mb-1 font-semibold text-green-600">✓ 좋은 점</div>
                              <ul className="space-y-1 pl-1">
                                {msg.reply.good.map((g, gi) => (
                                  <li key={"g" + gi} className="flex gap-1.5 text-text-2 leading-relaxed">
                                    <span className="text-green-600">•</span>
                                    <span>{g}</span>
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}
                          {msg.reply.improve.length > 0 && (
                            <div>
                              <div className="mb-1 font-semibold text-pink">💡 개선 포인트</div>
                              <ul className="space-y-1 pl-1">
                                {msg.reply.improve.map((g, gi) => (
                                  <li key={"i" + gi} className="flex gap-1.5 text-text-2 leading-relaxed">
                                    <span className="text-pink">•</span>
                                    <span>{g}</span>
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </div>
                      )}
                      {/* 이렇게 이어가보세요 */}
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
            disabled={send.isPending || !input.trim()}
            className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-pink text-white disabled:opacity-40"
            aria-label="보내기"
          >
            <Send size={16} />
          </button>
        </form>
      </div>
      {showPaywall && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-sm"
          onClick={() => setShowPaywall(false)}
        >
          <div
            className="relative w-full max-w-[420px] rounded-t-3xl bg-surface px-6 pb-[max(env(safe-area-inset-bottom),24px)] pt-6"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setShowPaywall(false)}
              aria-label="닫기"
              className="absolute right-4 top-4 flex h-9 w-9 items-center justify-center rounded-full bg-secondary text-text-2"
            >
              <X size={18} />
            </button>
            <div className="mb-3 flex justify-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-pink to-purple">
                <Lock size={24} className="text-white" />
              </div>
            </div>
            <h2 className="mb-2 text-center text-lg font-bold text-foreground">
              무제한 연습 시작하기
            </h2>
            <p className="mb-6 text-center text-sm leading-relaxed text-text-2">
              무료 체험 {FREE_LIMIT}회를 모두 사용했어요.
              <br />
              프리미엄으로 업그레이드하면
              <br />
              무제한으로 대화 연습을 할 수 있어요.
            </p>
            <button
              type="button"
              className="mb-3 block w-full rounded-2xl bg-pink py-3.5 text-center text-sm font-bold text-white"
            >
              프리미엄 시작하기
            </button>
            <button
              type="button"
              onClick={() => setShowPaywall(false)}
              className="block w-full py-2 text-center text-sm text-text-3"
            >
              닫기
            </button>
          </div>
        </div>
      )}
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
