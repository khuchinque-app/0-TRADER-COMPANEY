/**
 * Agent Chat API Routes
 * POST /api/agent/chat - Send message to agent
 * GET /api/agent/status - Get agent status
 */

import { Router, Request, Response } from "express";

const router = Router();

// Simulated agent response
function generateResponse(message: string): {
  reply: string;
  steps: Array<{ id: number; label: string; status: string }>;
} {
  const lowerMsg = message.toLowerCase();

  let reply = "";
  if (lowerMsg.includes("支付") || lowerMsg.includes("付款")) {
    reply = "支付网关模块已完成集成。支持 iPaymu 和 Duitku 两个支付渠道，当前使用 iPaymu 作为主渠道。";
  } else if (lowerMsg.includes("交易") || lowerMsg.includes("买入") || lowerMsg.includes("卖出")) {
    reply = "交易功能已就绪。支持 477 个交易对，包括 BTC/USD, ETH/USD 等主流币种。";
  } else if (lowerMsg.includes("价格") || lowerMsg.includes("行情")) {
    reply = "价格数据已对接 Indodax API，实时获取 477 个交易对的市场数据。";
  } else {
    reply = `收到你的消息: "${message}"。我正在处理中...`;
  }

  return {
    reply,
    steps: [
      { id: 1, label: "分析需求", status: "complete" },
      { id: 2, label: "实现功能", status: "complete" },
      { id: 3, label: "测试验证", status: "active" },
      { id: 4, label: "部署上线", status: "pending" },
    ],
  };
}

// Agent chat endpoint
router.post("/chat", (req: Request, res: Response) => {
  try {
    const { message, sessionId } = req.body;

    if (!message) {
      return res.status(400).json({ error: "message required" });
    }

    const result = generateResponse(message);

    res.json({
      success: true,
      sessionId: sessionId || `session-${Date.now()}`,
      reply: result.reply,
      steps: result.steps,
      timestamp: new Date().toISOString(),
    });
  } catch (e: any) {
    res.status(500).json({ error: "internal", message: e.message });
  }
});

// Agent status endpoint
router.get("/status", (_req: Request, res: Response) => {
  res.json({
    success: true,
    status: "online",
    model: "qwen3-coder",
    capabilities: ["web_search", "git_operations", "file_editing"],
    sessionCount: 0,
    uptime: "2h 34m",
  });
});

export { router as agentRouter };
