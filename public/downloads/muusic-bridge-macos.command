#!/bin/zsh
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

for candidate in \
  "$(command -v node 2>/dev/null)" \
  "/opt/homebrew/bin/node" \
  "/usr/local/bin/node" \
  "/opt/local/bin/node" \
  "/Library/Frameworks/Node.framework/Versions/Current/bin/node"
do
  if [[ -n "$candidate" && -x "$candidate" ]]; then
    exec "$candidate" "$SCRIPT_DIR/muusic-bridge-macos.mjs"
  fi
done

osascript -e 'display dialog "Node.js não encontrado. Instale o Node.js neste Mac para usar o Muusic Bridge." buttons {"OK"} default button "OK"'
