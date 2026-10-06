interface Message {
  role: "user" | "assistant";
  content: string;
  ts: number;
}

interface ChatPanelProps {
  messages: Message[];
  messagesEndRef: React.RefObject<HTMLDivElement>;
}

export function ChatPanel({ messages, messagesEndRef }: ChatPanelProps) {
  return (
    <div className="flex-1 overflow-y-auto space-y-4 pr-2">
      {messages.length === 0 && (
        <div className="flex flex-col items-center justify-center h-full text-white/40">
          <div className="text-6xl mb-4">🤖</div>
          <p className="text-lg">发送消息开始对话</p>
          <p className="text-sm mt-2">Agent 将自动完成代码、搜索、执行等任务</p>
        </div>
      )}

      {messages.map((msg, idx) => (
        <div
          key={idx}
          className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
        >
          <div
            className={`max-w-[85%] sm:max-w-[75%] p-4 rounded-2xl ${
              msg.role === "user"
                ? "btn-vice-primary rounded-br-sm"
                : "bg-white/10 border border-cyan/20 rounded-bl-sm"
            }`}
          >
            {msg.role === "assistant" && (
              <div className="flex items-center gap-2 mb-2 text-xs text-cyan/70">
                <span>🤖</span>
                <span>Agent</span>
                <span className="text-white/30">
                  {new Date(msg.ts).toLocaleTimeString()}
                </span>
              </div>
            )}
            {msg.role === "user" && (
              <div className="flex items-center justify-end gap-2 mb-2 text-xs text-pink/70">
                <span>
                  {new Date(msg.ts).toLocaleTimeString()}
                </span>
                <span>👤</span>
                <span>你</span>
              </div>
            )}
            <p className="text-white/90 whitespace-pre-wrap text-sm sm:text-base">{msg.content}</p>
          </div>
        </div>
      ))}

      <div ref={messagesEndRef} />
    </div>
  );
}
