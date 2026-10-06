import { useState, useRef, useEffect } from "react";
import { ChatPanel } from "./components/ChatPanel";
import { WorkflowView } from "./components/WorkflowView";
import { TerminalView } from "./components/TerminalView";

type TabType = "chat" | "workflow" | "terminal";

export default function AgentChatPage() {
  const [activeTab, setActiveTab] = useState<TabType>("chat");
  const [messages, setMessages] = useState<any[]>([]);
  const [inputText, setInputText] = useState("");
  const [workflowSteps, setWorkflowSteps] = useState([
    { id: 1, label: "分析需求", status: "pending" as const },
    { id: 2, label: "实现功能", status: "pending" as const },
    { id: 3, label: "测试验证", status: "pending" as const },
    { id: 4, label: "部署上线", status: "pending" as const },
  ]);
  const [terminalLines, setTerminalLines] = useState<string[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = async () => {
    if (!inputText.trim()) return;

    const userMessage = { role: "user", content: inputText, ts: Date.now() };
    setMessages((prev) => [...prev, userMessage]);
    setInputText("");

    // Simulate agent response
    setTimeout(() => {
      const aiMessage = {
        role: "assistant",
        content: `收到指令: "${inputText}"。正在分析中...`,
        ts: Date.now(),
        steps: [
          { id: 1, label: "分析需求", status: "complete" as const },
          { id: 2, label: "实现功能", status: "active" as const },
          { id: 3, label: "测试验证", status: "pending" as const },
          { id: 4, label: "部署上线", status: "pending" as const },
        ],
      };
      setMessages((prev) => [...prev, aiMessage]);
      setWorkflowSteps(aiMessage.steps);
      setTerminalLines((prev) => [
        ...prev,
        `[${new Date().toLocaleTimeString()}] 开始执行: ${inputText}`,
        "[INFO] 正在加载模块...",
        "[INFO] 处理中...",
      ]);
    }, 500);
  };

  const tabs: { id: TabType; label: string; icon: string }[] = [
    { id: "chat", label: "对话", icon: "💬" },
    { id: "workflow", label: "工作流", icon: "📊" },
    { id: "terminal", label: "终端", icon: "🖥️" },
  ];

  return (
    <div className="min-h-screen bg-ocean-night flex flex-col">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-ocean-night/90 backdrop-blur-lg border-b border-cyan/20">
        <div className="max-w-7xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between mb-3">
            <h1 className="text-xl font-bold text-pink glow-pink">
              🤖 Agent 对话
            </h1>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
              <span className="text-xs text-cyan/70">在线</span>
            </div>
          </div>

          {/* Tabs - Desktop */}
          <div className="hidden sm:flex gap-1 bg-ocean-night/50 p-1 rounded-lg border border-cyan/10">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all duration-200 ${
                  activeTab === tab.id
                    ? "btn-vice-primary shadow-lg shadow-pink/20"
                    : "text-white/60 hover:text-white hover:bg-white/5"
                }`}
              >
                <span>{tab.icon}</span>
                <span>{tab.label}</span>
              </button>
            ))}
          </div>

          {/* Tabs - Mobile */}
          <div className="sm:hidden flex gap-1 bg-ocean-night/50 p-1 rounded-lg border border-cyan/10 overflow-x-auto">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-1 px-3 py-2 rounded-md text-xs font-medium transition-all duration-200 whitespace-nowrap ${
                  activeTab === tab.id
                    ? "btn-vice-primary shadow-lg shadow-pink/20"
                    : "text-white/60 hover:text-white hover:bg-white/5"
                }`}
              >
                <span>{tab.icon}</span>
                <span>{tab.label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 max-w-7xl mx-auto px-4 py-4 w-full">
        {activeTab === "chat" && (
          <div className="flex flex-col h-[calc(100vh-200px)] sm:h-[calc(100vh-180px)] max-h-[600px]">
            <ChatPanel
              messages={messages}
              messagesEndRef={messagesEndRef}
            />
            <div className="mt-4 sticky bottom-0">
              <div className="flex gap-2 bg-white/5 p-3 rounded-xl border border-cyan/20 backdrop-blur-sm">
                <input
                  type="text"
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSend()}
                  placeholder="输入指令，Agent 帮你完成..."
                  className="flex-1 bg-transparent text-white placeholder-white/40 outline-none"
                />
                <button
                  onClick={handleSend}
                  className="btn-vice-primary px-6 rounded-lg"
                >
                  发送
                </button>
              </div>
            </div>
          </div>
        )}

        {activeTab === "workflow" && (
          <WorkflowView steps={workflowSteps} />
        )}

        {activeTab === "terminal" && (
          <TerminalView lines={terminalLines} />
        )}
      </div>
    </div>
  );
}
