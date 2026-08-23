#!/usr/bin/env bash
#
# ゲート命令を実行し、**成功なら1行・失敗なら抜粋だけ**を標準出力に出す。
# 終了コードは元のコマンドのものをそのまま返す（ループの機械ゲートが見るのはここ）。
# 全文は .logs/gate.log に残るので、抜粋で足りなければそれを読む。
#
# 呼び出し元は .claude/hooks/filter-test-output.sh（PreToolUse フック）。
# 直接叩いてもよい: .claude/hooks/run-gate.sh 'make test && make build'

set -uo pipefail

cmd="${1:-}"
if [ -z "$cmd" ]; then
  echo "run-gate.sh: 実行するコマンドが渡されていません" >&2
  exit 2
fi

# 自分の位置からリポジトリルートを求める（呼び出し時のカレントに依存しないため）
root="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
log="$root/.logs/gate.log"
mkdir -p "$root/.logs"

# サブシェルで実行する。cmd 側の `cd` をこのスクリプトに漏らさないため。
( eval "$cmd" ) >"$log" 2>&1
rc=$?

if [ "$rc" -eq 0 ]; then
  echo "[gate] PASS (exit 0) — $cmd"
  echo "[gate] 出力は省略。全文: $log"
  exit 0
fi

echo "[gate] FAIL (exit $rc) — $cmd"
echo "[gate] 以下は抜粋。全文: $log"
echo

excerpt=$(grep -nEi -B2 -A6 \
  'FAILED|FAIL |ERROR|error:|Exception|AssertionError|NotImplementedError|not implemented|✗|not assignable|Cannot find|Test.*failed' \
  "$log" | head -150)

if [ -n "$excerpt" ]; then
  printf '%s\n' "$excerpt"
else
  # 既知のパターンに当たらない落ち方（OOM、ポート衝突など）は末尾を出す
  tail -60 "$log"
fi

exit "$rc"
