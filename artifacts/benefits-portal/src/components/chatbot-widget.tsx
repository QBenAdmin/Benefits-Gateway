import { useState, useRef, useEffect } from "react";
import { useSendChatbotMessage, useGetChatbotTopics, getGetChatbotTopicsQueryKey } from "@workspace/api-client-react";
import { MessageCircle, X, Send, Bot, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

interface Message {
  role: "user" | "bot";
  text: string;
  suggestions?: string[];
}

export function ChatbotWidget() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [sessionId, setSessionId] = useState<string | undefined>(undefined);
  const [showTopics, setShowTopics] = useState(true);
  const bottomRef = useRef<HTMLDivElement>(null);

  const sendMessage = useSendChatbotMessage();
  const { data: topics } = useGetChatbotTopics({
    query: { queryKey: getGetChatbotTopicsQueryKey(), enabled: open }
  });

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleOpen = () => {
    setOpen(true);
    if (messages.length === 0) {
      setMessages([
        {
          role: "bot",
          text: "Hi! I'm BeneBot, your benefits assistant. I can answer questions about your health plans, enrollment, COBRA, HSA/FSA, and more. What would you like to know?",
          suggestions: [],
        },
      ]);
    }
  };

  const send = (text: string) => {
    if (!text.trim()) return;
    const userMsg: Message = { role: "user", text: text.trim() };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setShowTopics(false);

    sendMessage.mutate(
      { data: { message: text.trim(), sessionId } },
      {
        onSuccess: (data) => {
          const d = data as unknown as { response: string; suggestions: string[]; sessionId: string };
          setSessionId(d.sessionId);
          setMessages((prev) => [
            ...prev,
            { role: "bot", text: d.response, suggestions: d.suggestions ?? [] },
          ]);
        },
        onError: () => {
          setMessages((prev) => [
            ...prev,
            { role: "bot", text: "Sorry, I couldn't process that. Please try again." },
          ]);
        },
      }
    );
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    send(input);
  };

  return (
    <>
      {open && (
        <div className="fixed bottom-20 right-6 w-80 sm:w-96 z-50 flex flex-col rounded-xl border border-border bg-card shadow-xl overflow-hidden"
          style={{ maxHeight: "520px" }}
        >
          <div className="flex items-center justify-between px-4 py-3 bg-primary text-primary-foreground">
            <div className="flex items-center gap-2">
              <Bot className="h-4 w-4" />
              <span className="font-semibold text-sm">BeneBot</span>
              <span className="text-xs opacity-70">Benefits Assistant</span>
            </div>
            <button
              onClick={() => setOpen(false)}
              className="opacity-70 hover:opacity-100 transition-opacity"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-3 space-y-3 bg-background" style={{ minHeight: 0, maxHeight: "360px" }}>
            {messages.map((msg, i) => (
              <div key={i} className={cn("flex flex-col gap-1", msg.role === "user" ? "items-end" : "items-start")}>
                <div
                  className={cn(
                    "rounded-xl px-3 py-2 text-sm max-w-[85%] leading-relaxed",
                    msg.role === "user"
                      ? "bg-primary text-primary-foreground rounded-br-sm"
                      : "bg-muted text-foreground rounded-bl-sm"
                  )}
                >
                  {msg.text}
                </div>
                {msg.role === "bot" && msg.suggestions && msg.suggestions.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-1 max-w-[90%]">
                    {msg.suggestions.map((s, si) => (
                      <button
                        key={si}
                        onClick={() => send(s)}
                        className="text-xs px-2 py-1 rounded-full border border-primary/30 text-primary hover:bg-primary/10 transition-colors"
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ))}

            {sendMessage.isPending && (
              <div className="flex items-start">
                <div className="bg-muted rounded-xl rounded-bl-sm px-3 py-2 text-sm text-muted-foreground">
                  <span className="inline-flex gap-1">
                    <span className="animate-bounce" style={{ animationDelay: "0ms" }}>·</span>
                    <span className="animate-bounce" style={{ animationDelay: "150ms" }}>·</span>
                    <span className="animate-bounce" style={{ animationDelay: "300ms" }}>·</span>
                  </span>
                </div>
              </div>
            )}

            <div ref={bottomRef} />
          </div>

          {showTopics && topics && topics.length > 0 && (
            <div className="border-t border-border px-3 py-2 bg-muted/40">
              <p className="text-xs font-medium text-muted-foreground mb-1.5">Popular topics</p>
              <div className="space-y-1">
                {topics.slice(0, 4).map((t) => (
                  <button
                    key={t.id}
                    onClick={() => send(t.title)}
                    className="w-full flex items-center justify-between text-xs text-left px-2 py-1.5 rounded-md hover:bg-primary/10 hover:text-primary transition-colors group"
                  >
                    <span>{t.title}</span>
                    <ChevronRight className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </button>
                ))}
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="border-t border-border p-3 flex gap-2 bg-card">
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask about your benefits…"
              className="text-sm h-8"
              disabled={sendMessage.isPending}
            />
            <Button type="submit" size="sm" className="h-8 px-3" disabled={!input.trim() || sendMessage.isPending}>
              <Send className="h-3.5 w-3.5" />
            </Button>
          </form>
        </div>
      )}

      <button
        onClick={open ? () => setOpen(false) : handleOpen}
        className="fixed bottom-6 right-6 z-50 h-12 w-12 rounded-full bg-primary text-primary-foreground shadow-lg flex items-center justify-center hover:bg-primary/90 transition-all hover:scale-105 active:scale-95"
        aria-label="Open benefits chatbot"
      >
        {open ? <X className="h-5 w-5" /> : <MessageCircle className="h-5 w-5" />}
      </button>
    </>
  );
}
