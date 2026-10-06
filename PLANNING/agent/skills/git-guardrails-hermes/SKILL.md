---
name: git-guardrails-hermes
description: Set up Hermes Agent hooks to block dangerous git commands (push, reset --hard, clean, branch -D, etc.) before they execute. Use when user wants to prevent destructive git operations, add git safety hooks, or block git push/reset in Hermes Agent.
---
# Setup Git Guardrails for Hermes Agent

Sets up a PreToolUse hook that intercepts and blocks dangerous git commands before Hermes executes them.

## What Gets Blocked

- `git push` (all variants including `--force`)
- `git reset --hard`
- `git clean -f` / `git clean -fd`
- `git branch -D`
- `git checkout .` / `git restore .`

When blocked, Hermes sees a message telling it that it does not have authority to access these commands.

## Steps

### 1. Ask scope

Ask the user: install for **this project only** (.hermes/settings.json) or **all projects** (~/.hermes/settings.json)?

### 2. Copy the hook script

The bundled script is at: [scripts/block-dangerous-git.sh](scripts/block-dangerous-git.sh)

Copy it to the target location based on scope:

- **Project**: `.hermes/hooks/block-dangerous-git.sh`
- **Global**: `~/.hermes/hooks/block-dangerous-git.sh`

Make it executable with `chmod +x`.

### 3. Add hook to settings

Add to the appropriate settings file:

**Project** (.hermes/settings.json):

```json
{
  "hooks": {
    "PreToolUse": [
      {
        "matcher": "terminal",
        "hooks": [
          {
            "type": "command",
            "command": "$CLAUDE_PROJECT_DIR/.hermes/hooks/block-dangerous-git.sh"
          }
        ]
      }
    ]
  }
}
```

**Global** (~/.hermes/settings.json):

```json
{
  "hooks": {
    "PreToolUse": [
      {
        "matcher": "terminal",
        "hooks": [
          {
            "type": "command",
            "command": "~/.hermes/hooks/block-dangerous-git.sh"
          }
        ]
      }
    ]
  }
}
```

If the settings file already exists, merge the hook into the existing hooks.PreToolUse array. Don't overwrite other settings.

### 4. Ask about customization

Ask if user wants to add or remove any patterns from the blocked list. Edit the copied script accordingly.

### 5. Verify

Run a quick test:

```bash
echo '{"tool_input":{"command":"git push origin main"}}' | <path-to-script>
```

Should exit with code 2 and print a BLOCKED message to stderr.
