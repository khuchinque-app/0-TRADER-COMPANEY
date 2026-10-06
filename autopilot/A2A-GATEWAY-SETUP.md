# VPS A2A 网关设置指南

## 当前状态
- VPS 后端 API: `http://187.127.178.20:11110` ✅ 运行中
- VPS 终端: `http://187.127.178.20:22220` ✅ 运行中（Next.js）
- A2A 网关: ❌ 未运行

## 设置步骤

### 1. SSH 登录 VPS
```bash
ssh root@187.127.178.20
```

### 2. 切换到 khuchinque 用户
```bash
su khuchinque
```

### 3. 启动 Hermes 并配置 A2A 网关
```bash
hermes -p herme-khuchinque
```

然后在 Hermes 界面中运行:
```
hermes gateway setup
```
选择 **A2A** 协议，端口设置为 **29900**（符合你的 2xxxx 规则）

### 4. 启动 A2A 网关
```bash
hermes gateway
```

### 5. 验证 A2A 端点
```bash
curl http://127.0.0.1:29900/.well-known/agent-card.json
```

应该返回类似:
```json
{
  "name": "herme-khuchinque",
  "url": "http://187.127.178.20:29900",
  "capabilities": [...]
}
```

### 6. 更新本地配置

修改 `~/.hermes/profiles/herme-chinque/config.yaml`:

```yaml
a2a_agents:
  hermekhu:
    url: "http://187.127.178.20:29900/.well-known/agent-card.json"
    auth:
      type: bearer
      token: "your-token-here"  # 可选，如果启用了认证
    timeout: 120
    capabilities:
      - web_search
      - terminal
      - code_execution
      - file
      - memory
```

### 7. 启用 A2A 工具
```bash
hermes tools enable a2a --platform telegram
```

## 端口合规检查

| 服务 | 端口 | 合规？ |
|------|------|--------|
| 后端 API | 11110 | ✅ |
| 终端 Next.js | 22220 | ✅ |
| A2A 网关 | 29900 | ✅ |

## 测试连接

在本地运行:
```bash
curl http://187.127.178.20:29900/.well-known/agent-card.json
```

如果成功，就可以用 `a2a_discover` 和 `a2a_call` 工具了。
