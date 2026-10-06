interface WorkflowStep {
  id: number;
  label: string;
  status: "pending" | "active" | "complete" | "error";
}

interface WorkflowViewProps {
  steps: WorkflowStep[];
}

export function WorkflowView({ steps }: WorkflowViewProps) {
  const getStatusColor = (status: string) => {
    switch (status) {
      case "complete":
        return "text-green-400";
      case "active":
        return "text-cyan-400";
      case "error":
        return "text-red-400";
      default:
        return "text-white/30";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "complete":
        return "✅";
      case "active":
        return "🔄";
      case "error":
        return "❌";
      default:
        return "⏳";
    }
  };

  const completeCount = steps.filter((s) => s.status === "complete").length;
  const activeCount = steps.filter((s) => s.status === "active").length;
  const pendingCount = steps.filter((s) => s.status === "pending").length;

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-full bg-pink/20 flex items-center justify-center text-xl">
          📊
        </div>
        <div>
          <h2 className="text-lg font-bold text-white">工作流进度</h2>
          <p className="text-sm text-white/50">实时查看 Agent 执行状态</p>
        </div>
      </div>

      <div className="bg-white/5 rounded-2xl border border-cyan/20 p-6">
        <div className="space-y-4">
          {steps.map((step, idx) => (
            <div key={step.id} className="flex items-center gap-4">
              <div
                className={`flex items-center justify-center w-10 h-10 rounded-full border-2 text-lg shrink-0 ${
                  step.status === "active"
                    ? "border-cyan-400 bg-cyan-400/10 animate-pulse"
                    : step.status === "complete"
                    ? "border-green-400 bg-green-400/10"
                    : "border-white/20 bg-white/5"
                }`}
              >
                {getStatusIcon(step.status)}
              </div>
              <div className="flex-1">
                <p className={`font-medium ${getStatusColor(step.status)}`}>
                  {step.label}
                </p>
                {step.status === "active" && (
                  <div className="mt-2 h-1 bg-white/10 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-pink to-purple animate-pulse"
                      style={{ width: "60%" }}
                    />
                  </div>
                )}
              </div>
              <div className="text-xs text-white/40 hidden sm:block">
                {step.status === "complete"
                  ? "完成"
                  : step.status === "active"
                  ? "执行中..."
                  : "等待中"}
              </div>
              {idx < steps.length - 1 && (
                <div className="absolute left-5 top-10 w-px h-6 bg-white/20" />
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white/5 rounded-xl border border-green-400/20 p-4 text-center">
          <div className="text-2xl font-bold text-green-400">
            {completeCount}
          </div>
          <div className="text-xs text-white/50 mt-1">已完成</div>
        </div>
        <div className="bg-white/5 rounded-xl border border-cyan-400/20 p-4 text-center">
          <div className="text-2xl font-bold text-cyan-400">
            {activeCount}
          </div>
          <div className="text-xs text-white/50 mt-1">执行中</div>
        </div>
        <div className="bg-white/5 rounded-xl border border-white/10 p-4 text-center">
          <div className="text-2xl font-bold text-white/40">
            {pendingCount}
          </div>
          <div className="text-xs text-white/50 mt-1">待执行</div>
        </div>
      </div>
    </div>
  );
}
