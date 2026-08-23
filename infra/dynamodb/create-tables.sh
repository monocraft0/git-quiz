#!/usr/bin/env bash
# DynamoDB Local のテーブルを作成する。冪等（既存ならスキップ）。
# 使い方: bash infra/dynamodb/create-tables.sh
set -euo pipefail

ENDPOINT="${DYNAMO_ENDPOINT:-http://localhost:8000}"
REGION="${AWS_REGION:-ap-northeast-1}"
export AWS_ACCESS_KEY_ID="${AWS_ACCESS_KEY_ID:-local}"
export AWS_SECRET_ACCESS_KEY="${AWS_SECRET_ACCESS_KEY:-local}"

create_table() {
  local name="$1"; shift
  if aws dynamodb describe-table --table-name "$name" \
       --endpoint-url "$ENDPOINT" --region "$REGION" >/dev/null 2>&1; then
    echo "table '$name' already exists — skip"
  else
    echo "creating table '$name'..."
    aws dynamodb create-table --table-name "$name" \
      --endpoint-url "$ENDPOINT" --region "$REGION" \
      --billing-mode PAY_PER_REQUEST "$@"
  fi
}

# --- テーブル定義（機能追加のたびにここへ追記する） ---
create_table Items \
  --attribute-definitions AttributeName=pk,AttributeType=S \
  --key-schema AttributeName=pk,KeyType=HASH

echo "done."
