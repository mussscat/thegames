#!/usr/bin/env bash
# PreToolUse (Bash): never kill the user's dev server; BSD sed -i is unreliable on macOS.
cmd=$(jq -r '.tool_input.command // empty')
if printf '%s' "$cmd" | grep -Eq '(pkill|killall)[^|;&]*(vite|node)|kill[^|;&]*\$\(.*vite'; then
  echo "Blocked: do not kill the dev server (vite/node). Start your own on another port, e.g. npx vite --port 5199, and kill only that PID." >&2
  exit 2
fi
if printf '%s' "$cmd" | grep -Eq '(^|[;&|[:space:]])sed[[:space:]]+(-[a-zA-Z]*[[:space:]]+)*-i'; then
  echo "Blocked: BSD sed -i is unreliable on macOS. Use the Edit tool or a short python script." >&2
  exit 2
fi
exit 0
