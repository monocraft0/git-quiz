#!/usr/bin/env bash
# 機械的に判定できる規約だけを見る。verifier(opus) の時間を grep で分かることに
# 使わせないためのもの。判断が要るもの（赤が本物か、テストの検出力、コメントの真偽）は見ない。
#
# 使い方: ./.claude/hooks/check-conventions.sh [<base>]
#   <base> 省略時は main。<base>..HEAD の差分と作業ツリーを対象にする。
set -uo pipefail
cd "$(git rev-parse --show-toplevel)" || exit 1

BASE="${1:-main}"
fail=0
note() { printf '  %s\n' "$*"; }
ng()   { printf 'NG  %s\n' "$*"; fail=1; }
ok()   { printf 'OK  %s\n' "$*"; }

# 対象ファイル（コミット済みの差分 + 未コミット + untracked）
changed=$( { git diff --name-only "$BASE"...HEAD 2>/dev/null
             git diff --name-only
             git ls-files --others --exclude-standard; } | sort -u )
[ -z "$changed" ] && { echo "変更ファイルがありません（base=${BASE}）"; exit 0; }

echo "== 対象 (base=$BASE) =="
printf '  %s\n' $changed
echo

# 1. 既存の Flyway マイグレーションを編集していないか
edited_v=$(git diff --name-only "$BASE"...HEAD -- '*/db/migration/V*.sql' 2>/dev/null; \
           git diff --name-only -- '*/db/migration/V*.sql')
new_v=$(git ls-files --others --exclude-standard -- '*/db/migration/V*.sql')
edited_existing=$(comm -23 <(echo "$edited_v" | sort -u | sed '/^$/d') \
                           <(echo "$new_v"    | sort -u | sed '/^$/d'))
if [ -n "$edited_existing" ]; then
  ng "既存の Flyway マイグレーションが編集されています（新しい V を足すこと）"
  note "$edited_existing"
else
  ok "既存の Flyway マイグレーションは無編集"
fi

# 2. ddl-auto が validate のままか
if grep -rq "ddl-auto:[[:space:]]*validate" backend/src/main/resources/ 2>/dev/null; then
  ok "ddl-auto: validate を維持"
else
  ng "ddl-auto が validate ではありません"
fi

# 3. .env をコミットしていないか
if git ls-files --error-unmatch .env >/dev/null 2>&1; then
  ng ".env が追跡されています"
else
  ok ".env は未追跡"
fi

# 4. 入力DTOの検証アノテーションに @field: が付いているか
#    Kotlin では @field: を落とすとコンストラクタ引数に付き、Bean Validation が効かない
for f in $(echo "$changed" | grep -E 'backend/.*/dto/.*Request\.kt$' || true); do
  [ -f "$f" ] || continue
  if grep -qE '^\s*@(NotNull|NotBlank|Size|Min|Max|Positive|Email|Pattern)\b' "$f"; then
    ng "$f: 検証アノテーションに @field: が付いていません"
  else
    ok "$f: 検証アノテーションの付け方"
  fi
done

# 5. フロントが fetch を直書きしていないか（api/client.ts 以外）
for f in $(echo "$changed" | grep -E '^frontend/src/' | grep -v 'api/client.ts' || true); do
  [ -f "$f" ] || continue
  if grep -qE '(^|[^.[:alnum:]])fetch\(' "$f"; then
    ng "$f: fetch を直書きしています（src/api/client.ts 経由にする）"
  fi
done

# 6. package.json に依存が増えていないか（増えていたら人の確認が要る）
if git diff "$BASE"...HEAD -- frontend/package.json 2>/dev/null | grep -qE '^\+\s*"' \
   || git diff -- frontend/package.json | grep -qE '^\+\s*"'; then
  note "! frontend/package.json に差分があります（依存の追加は意図したものか確認）"
fi

# 7. TDD: 赤いテストが実装より先にコミットされているか
#    順序は自己申告では検証できない。ここでは「test: の赤コミットが最初の実装コミットより
#    前にあるか」だけを機械的に見る。赤が本物か（assertion で落ちたか）は code-reviewer が
#    複製の上でチェックアウトして再現する。規約は .claude/skills/tdd/SKILL.md。
src_re='^(backend/src/|frontend/src/)'
test_re='(/src/test/|\.test\.tsx?$|\.spec\.tsx?$)'
branch_tests=$(echo "$changed" | grep -E "$test_re" || true)
branch_prod=$(echo "$changed" | grep -E "$src_re" | grep -vE "$test_re" || true)
commits=$(git rev-list --reverse "$BASE"..HEAD 2>/dev/null || true)

if [ -z "$branch_prod" ]; then
  ok "実装コードの変更なし（TDDの順序チェックは対象外）"
elif [ -z "$commits" ]; then
  note "! $BASE..HEAD にコミットが無いため、テストと実装の順序を判定できません"
elif [ -z "$branch_tests" ]; then
  note "! 実装を変更しているのにテストの変更がありません"
  note "  （振る舞いを変えない整理なら対象外。そうでなければテストの欠落）"
else
  seen_red=0
  offender=""
  for c in $commits; do
    files=$(git show --pretty=format: --name-only "$c" | sed '/^$/d')
    echo "$files" | grep -qE "$src_re" || continue   # ソースを触らないコミットは飛ばす
    case "$(git log -1 --format=%s "$c")" in
      test:*) seen_red=1; continue ;;
    esac
    [ "$seen_red" -eq 1 ] || offender="$c"
    break
  done
  if [ -n "$offender" ]; then
    ng "実装コミット $(git log -1 --format='%h %s' "$offender") より前に test: の赤コミットがありません"
    note "テストは実装より先にコミットする（.claude/skills/tdd/SKILL.md）"
    note "タスクに tdd: n/a を宣言した周だけがこの指摘の対象外"
  else
    ok "テストが実装より先にコミットされている"
  fi
fi

echo
if [ "$fail" -eq 0 ]; then echo "機械チェック: 問題なし"; else echo "機械チェック: NG あり"; fi
exit "$fail"
