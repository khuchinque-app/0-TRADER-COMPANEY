# VPS Agent 连接指南

## 当前状态

| 服务 | 地址 | 状态 |
|------|------|------|
| 后端 API | http://187.127.178.20:11110 | ✅ 运行中 |
| 终端 Next.js | http://187.127.178.20:22220 | ✅ 运行中 |
| A2A 网关 | 未配置 | ❌ 需要设置 |

## 问题诊断

`@Herme_KhuChinQue_bot` 的 A2A 网关未运行。当前配置指向 Next.js 终端应用（端口 22220），不是 Hermes A2A 网关。

## 解决方案

### 在 VPS 上设置 A2A 网关

```bash
# 1. SSH 登录
ssh root@187.127.178.20

# 2. 切换到 khuchinque 用户
su khuchinque

# 3. 启动 Hermes 并配置 A2A 网关
hermes -p herme-khuchinque
# 在界面中运行：
hermes gateway setup
# 选择 A2A 协议，端口设为 29900（符合 2xxxx 规则）

# 4. 启动网关
hermes gateway

# 5. 验证端点
curl http://127.0.0.1:29900/.well-known/agent-card.json
```

### 验证 A2A 连通性

设置完成后，在本地测试：
```bash
curl http://187.127.178.20:29900/.well-known/agent-card.json
```

成功后会显示 agent card JSON。

## 端口合规性

遵循用户规则：**所有端口必须 >= 2000 或 >= 20000**

| 服务 | 端口 | 合规？ |
|------|------|--------|
| 后端 API | 11110 | ✅ |
| 终端 Next.js | 22220 | ✅ |
| A2A 网关 | 29900 | ✅ |
| HTTP (8000) | 8000 | ❌ 需改为 28000+ |

## 快速脚本

```bash
# 运行 VPS 测试
python3 /home/chinque/CONTINUE-CONTINUE/vps-run.py

# 查看任务状态
python3 /home/chinque/project/TRADING-COMPANEY/autopilot/autopilot.py --status
```
