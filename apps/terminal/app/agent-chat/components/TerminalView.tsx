import { useRef } from "react";

interface TerminalViewProps {
  lines: string[];
}

export function TerminalView({ lines }: TerminalViewProps) {
  const linesEndRef = useRef<HTMLDivElement>(null);

  return (
    <div className="space-y-4 max-w-4xl mx-auto">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-cyan/20 flex items-center justify-center text-xl">
          🖥️
        </div>
        <div>
          <h2 className="text-lg font-bold text-white">终端输出</h2>
          <p className="text-sm text-white/50">Agent 执行的实时日志</p>
        </div>
      </div>

      <div className="bg-black/80 rounded-xl border border-cyan/20 overflow-hidden">
        <div className="flex items-center gap-2 px-4 py-2 bg-white/5 border-b border-white/10">
          <div className="w-3 h-3 rounded-full bg-red-500" />
          <div className="w-3 h-3 rounded-full bg-yellow-500" />
          <div className="w-3 h-3 rounded-full bg-green-500" />
          <span className="ml-2 text-xs text-white/50">bash</span>
        </div>
        <div className="p-4 font-mono text-sm h-96 overflow-y-auto">
          {lines.length === 0 && (
            <div className="text-white/30 italic">暂无输出...</div>
          )}
          {lines.map((line, idx) => (
            <div key={idx} className="mb-1">
              {line.startsWith("[INFO]") ? (
                <span className="text-cyan-400">{line}</span>
              ) : line.startsWith("[ERROR]") ? (
                <span className="text-red-400">{line}</span>
              ) : (
                <span className="text-green-400">{line}</span>
              )}
            </div>
          ))}
          <div ref={linesEndRef} />
        </div>
      </div>
    </div>
  );
}
