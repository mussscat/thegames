#!/usr/bin/env bash
# PostToolUse (Edit|Write): typecheck after a .ts/.tsx edit; type errors go back to Claude (exit 2).
file=$(jq -r '.tool_input.file_path // empty')
case "$file" in
  *.ts|*.tsx) ;;
  *) exit 0 ;;
esac
cd "$CLAUDE_PROJECT_DIR" || exit 0
out=$(npx tsc -p tsconfig.json --noEmit 2>&1 | head -20)
if [ -n "$out" ]; then
  echo "tsc found type errors after editing $file:" >&2
  echo "$out" >&2
  exit 2
fi
