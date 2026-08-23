-- gitクイズの問題マスタ。
-- correct_index は 0-based（choice1=0, choice2=1, choice3=2, choice4=3）。
-- 正解インデックスと解説はここにのみ保持し、質問一覧APIには含めない（docs/adr/0003）。
CREATE TABLE quiz_questions (
    id            BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    question      VARCHAR(500) NOT NULL,
    choice1       VARCHAR(200) NOT NULL,
    choice2       VARCHAR(200) NOT NULL,
    choice3       VARCHAR(200) NOT NULL,
    choice4       VARCHAR(200) NOT NULL,
    correct_index SMALLINT     NOT NULL,
    explanation   VARCHAR(500) NOT NULL
);

INSERT INTO quiz_questions (question, choice1, choice2, choice3, choice4, correct_index, explanation) VALUES
('変更をステージングエリアに追加するコマンドは？', 'git add <file>', 'git commit <file>', 'git push <file>', 'git stage-only <file>', 0, 'git add は作業ディレクトリの変更をステージングエリア（インデックス）に追加するコマンドです。'),
('直前のコミットにファイルの変更を追加しつつコミットメッセージも編集したいときに使うコマンドは？', 'git commit --amend', 'git commit --fixup', 'git commit --squash', 'git commit --edit', 0, 'git commit --amend は直前のコミットを新しい内容で上書きします。'),
('リモートリポジトリの変更を取得し、ローカルの作業ブランチに反映する（fetch+merge）コマンドは？', 'git fetch', 'git pull', 'git clone', 'git push', 1, 'git pull は git fetch と git merge（または rebase）をまとめて行うコマンドです。'),
('新しいブランチを作成し、同時にそのブランチへ切り替えるコマンドは？', 'git branch -b feature', 'git checkout -b feature', 'git merge -b feature', 'git log -b feature', 1, 'git checkout -b <name> はブランチの作成と切り替えを同時に行います。'),
('コミット履歴を書き換えずに、あるコミットの変更を打ち消す新しいコミットを作るコマンドは？', 'git reset', 'git revert', 'git rebase', 'git cherry-pick', 1, 'git revert は指定したコミットの変更を打ち消す新しいコミットを作成し、既存の履歴は書き換えません。'),
('git reset --hard HEAD~1 を実行するとどうなりますか？', '直前のコミットが取り消され、変更内容もワーキングディレクトリから削除される', '直前のコミットのみ取り消され変更はステージングに残る', '直前のコミットのみ取り消され変更は作業ディレクトリに残る', '何も起こらない', 0, '--hard はHEAD・インデックス・作業ディレクトリのすべてを指定コミットの状態に戻すため、変更内容も失われます。'),
('作業中の変更を一時的に退避し、あとで復元できるようにするコマンドは？', 'git stash', 'git shelf', 'git park', 'git hold', 0, 'git stash は未コミットの変更を一時的に退避します。'),
('他のブランチの特定の1コミットだけを現在のブランチに取り込むコマンドは？', 'git merge', 'git rebase', 'git cherry-pick', 'git pull', 2, 'git cherry-pick は指定した1つのコミットだけを現在のブランチに適用します。'),
('フィーチャーブランチのコミット履歴を、対象ブランチの先端に付け替えて直線的な履歴にするコマンドは？', 'git merge', 'git rebase', 'git cherry-pick', 'git reset', 1, 'git rebase はコミット群を別のベースに付け替えます。'),
('リポジトリの追跡対象から特定のファイルやパターンを除外したいときに編集するファイルは？', '.gitconfig', '.gitattributes', '.gitignore', '.gitmodules', 2, '.gitignore に書いたパターンに一致するファイルはgitの追跡対象から除外されます。'),
('HEAD が指しているものは何ですか？', 'リモートリポジトリのURL', '現在チェックアウトしているブランチ（またはコミット）への参照', 'ステージングエリアの内容', '最初のコミット', 1, 'HEAD は現在作業しているブランチの最新コミット（またはコミット自体）を指すポインタです。'),
('リモートリポジトリのURLに別名（エイリアス）を付けて登録するコマンドは？', 'git remote add', 'git branch add', 'git clone add', 'git fetch add', 0, 'git remote add <name> <url> でリモートリポジトリに別名を付けて登録します。');
