-- 初期マイグレーション。
-- Flywayが管理する最初のバージョン。以降は V2__, V3__ ... と連番で追加し、
-- このファイルを含む適用済みマイグレーションは編集しないこと。

-- 例: 機能追加時にこの下へ CREATE TABLE を足していくか、
--     新しい V ファイルを作成する。
CREATE TABLE IF NOT EXISTS schema_bootstrap (
    id         BIGINT       GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    note       VARCHAR(255) NOT NULL,
    created_at TIMESTAMPTZ  NOT NULL DEFAULT now()
);

INSERT INTO schema_bootstrap (note) VALUES ('initialized');
