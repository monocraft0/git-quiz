#!/usr/bin/env bash
#
# PreToolUse(Bash) フック — ゲート系コマンドを run-gate.sh 経由に書き換える。
#
# なぜ: 成功した gradle / vitest のログは一度文脈に入ると以降の**全ターンで再送**される。
# トークンは「出力量 × 残りターン数」で効くので、成功時の出力を捨てるのが一番効く。
#
# 安全側の設計:
#   書き換えた命令は permissionDecision:allow で承認をスキップする。無人ループを
#   止めないためだが、裏を返せば「フックが手を出した命令は無条件に通る」。
#   そこで **既知のゲート命令の形にちょうど一致するときだけ**書き換える。
#   セグメントが1つでもホワイトリスト外なら何もせず（{} を返し）通常の権限フローに戻す。
#   ホワイトリストは行頭行末で固定しているので、`|` `` ` `` `$(` `>` は構造上通らない。

set -uo pipefail

input=$(cat)

# 何もせず通常の権限フローに戻す
passthrough() { printf '{}\n'; exit 0; }

command -v jq >/dev/null 2>&1 || passthrough

cmd=$(jq -r '.tool_input.command // ""' <<<"$input")
[ -n "$cmd" ] || passthrough

# 既に書き換え済みなら二重適用しない
case "$cmd" in *run-gate.sh*) passthrough ;; esac

hook_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
runner="$hook_dir/run-gate.sh"
[ -x "$runner" ] || passthrough

# ゲート命令として認める形。ここに無いものが混ざったら一切触らない。
# TDD の内側ループ（`--rerun-tasks` / `--tests` / 単一ファイルの vitest）もここに入れる。
# 赤→緑で何度も走るので、成功時の出力を捨てる効果がいちばん大きいのはこの形。
# 引数の文字クラスは狭く固定しているので、`|` `` ` `` `$(` `>` は構造上通らない。
q="'"
allowed="^(cd [A-Za-z0-9_./-]+|make (test|build|gate|test-backend|test-frontend)|\./gradlew (test|build|check)( --continue)?( --rerun-tasks)?( --tests ${q}[A-Za-z0-9_.*-]+${q})?|npm (test|run build)|npx vitest run( [A-Za-z0-9_./-]+)?)\$"

# `&&` と `;` で分割する。sed の `\n` は環境差があるので bash の置換で行う。
segs="${cmd//&&/$'\n'}"
segs="${segs//;/$'\n'}"

gate=0
# `|| [ -n "$seg" ]` が無いと、末尾に改行が無い場合に**最後のセグメントを読み飛ばす**。
# 読み飛ばすと `make test; rm -rf /` の後半を検査せずに allow してしまうので必須。
while IFS= read -r seg || [ -n "$seg" ]; do
  seg=$(printf '%s' "$seg" | sed 's/^[[:space:]]*//; s/[[:space:]]*$//')
  [ -n "$seg" ] || continue
  [[ "$seg" =~ $allowed ]] || passthrough
  case "$seg" in
    cd\ *) ;;          # cd だけでは「ゲートを含む」とみなさない
    *) gate=1 ;;
  esac
done <<< "$segs"

# test/build を1つも含まない（cd だけ、など）なら触らない
[ "$gate" -eq 1 ] || passthrough

printf -v newcmd '%q %q' "$runner" "$cmd"

jq -n --arg c "$newcmd" '{
  hookSpecificOutput: {
    hookEventName: "PreToolUse",
    permissionDecision: "allow",
    updatedInput: { command: $c }
  }
}'
