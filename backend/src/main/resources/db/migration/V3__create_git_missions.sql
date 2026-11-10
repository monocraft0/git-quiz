-- 4択クイズを、コマンド入力のミッション形式に置き換える（docs/adr/0004）。
DROP TABLE IF EXISTS quiz_questions;

-- setup_commands / model_answer は1行1コマンド。
-- goals は判定条件（GoalSpec）のJSON配列。コミットIDは書かない（初期化コマンドで変わるため）。
-- goals の description 以外・model_answer・explanation は判定前のAPIに出さない。
CREATE TABLE git_missions (
    id             BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    sort_order     INTEGER       NOT NULL,
    title          VARCHAR(200)  NOT NULL,
    description    VARCHAR(1000) NOT NULL,
    setup_commands VARCHAR(2000) NOT NULL,
    goals          VARCHAR(2000) NOT NULL,
    model_answer   VARCHAR(1000) NOT NULL,
    explanation    VARCHAR(1000) NOT NULL
);

INSERT INTO git_missions (sort_order, title, description, setup_commands, goals, model_answer, explanation) VALUES
(1, 'ファイルをステージに載せよう',
 'README.md を作りました。まだ git は README.md を記録の対象にしていません（未追跡）。次のコミットに含めるため、ステージングエリアに載せましょう。',
 'touch README.md',
 '[{"type":"STAGED","file":"README.md","description":"README.md がステージにある"}]',
 'git add README.md',
 'git add は作業ディレクトリの変更をステージングエリア（インデックス）に載せます。ステージは「次のコミットに入れるもの」の置き場です。git add . ならすべての変更をまとめて載せられます。'),

(2, '初めてのコミット',
 'README.md がステージに載っています。この状態を履歴として記録（コミット）しましょう。メッセージは自由です。',
 'touch README.md
git add README.md',
 '[{"type":"COMMIT_COUNT","branch":"main","count":1,"description":"main にコミットが1つある"},{"type":"CLEAN","description":"未コミットの変更が無い"}]',
 'git commit -m "first commit"',
 'git commit はステージの内容を1つのコミットとして記録し、いまいるブランチ（main）をそのコミットへ進めます。-m でメッセージを付けます。'),

(3, '変更をまとめてコミット',
 'index.html と style.css を新しく作り、README.md も編集しました。3つの変更をすべて1つのコミットにまとめましょう。',
 'touch README.md
git add .
git commit -m "first commit"
touch index.html
touch style.css
touch README.md',
 '[{"type":"COMMIT_COUNT","branch":"main","count":2,"description":"main にコミットが2つある"},{"type":"CLEAN","description":"未コミットの変更が無い"}]',
 'git add .
git commit -m "add page"',
 'git add . はカレントディレクトリ以下の変更をすべてステージに載せます。git status で何がステージに載っているかを確かめてからコミットする習慣をつけましょう。'),

(4, 'ステージを取り消そう',
 'git add . をしたら、コミットしてはいけない secret.env までステージに載ってしまいました。app.js はステージに残したまま、secret.env だけをステージから降ろしましょう。',
 'touch README.md
git add .
git commit -m "first commit"
touch app.js
touch secret.env
git add .',
 '[{"type":"STAGED","file":"app.js","description":"app.js はステージにある"},{"type":"UNTRACKED","file":"secret.env","description":"secret.env は未追跡に戻っている"}]',
 'git restore --staged secret.env',
 'git restore --staged <file> はファイルをステージから降ろします（作業ディレクトリのファイルは消えません）。本来は .gitignore に書いておくと、うっかり add されるのを防げます。'),

(5, 'ブランチを作ろう',
 '新機能の開発用に feature ブランチを作りましょう。ただし、まだ main にいたままにします。',
 'touch README.md
git add .
git commit -m "first commit"',
 '[{"type":"BRANCH_EXISTS","branch":"feature","description":"feature ブランチがある"},{"type":"HEAD_ON","branch":"main","description":"HEAD は main を指している"}]',
 'git branch feature',
 'git branch <name> は「いまのコミットを指す新しい名札」を作るだけで、HEAD（いまいる場所）は動きません。グラフで同じコミットに main と feature の2つのラベルが付いたのを確認しましょう。'),

(6, 'ブランチを切り替えよう',
 'feature ブランチがすでにあります。feature ブランチに移動しましょう。',
 'touch README.md
git add .
git commit -m "first commit"
git branch feature',
 '[{"type":"HEAD_ON","branch":"feature","description":"HEAD が feature を指している"}]',
 'git switch feature',
 'git switch <branch>（古い書き方では git checkout <branch>）で HEAD を別のブランチに移します。以後のコミットはそのブランチに積まれます。'),

(7, 'ブランチで作業しよう',
 'main を汚さずに新機能を作ります。feature ブランチを作って移動し、login.html を作ってコミットしましょう。main は今のままにします。',
 'touch README.md
git add .
git commit -m "first commit"',
 '[{"type":"HEAD_ON","branch":"feature","description":"HEAD が feature を指している"},{"type":"COMMIT_COUNT","branch":"feature","count":2,"description":"feature にコミットが2つある"},{"type":"COMMIT_COUNT","branch":"main","count":1,"description":"main のコミットは1つのまま"},{"type":"CLEAN","description":"未コミットの変更が無い"}]',
 'git switch -c feature
touch login.html
git add .
git commit -m "add login"',
 'git switch -c <name>（または git checkout -b <name>）はブランチの作成と切り替えを一度に行います。feature でコミットすると、feature だけが先に進み main はそのまま残ります。'),

(8, 'マージしよう（fast-forward）',
 'feature ブランチで login.html を追加しました。main にいる状態で、feature の変更を main に取り込みましょう。',
 'touch README.md
git add .
git commit -m "first commit"
git switch -c feature
touch login.html
git add .
git commit -m "add login"
git switch main',
 '[{"type":"HEAD_ON","branch":"main","description":"HEAD は main を指している"},{"type":"CONTAINS","branch":"main","other":"feature","description":"main に feature の変更が取り込まれている"}]',
 'git merge feature',
 'main から分かれたあと main 側に新しいコミットが無いので、git merge は main の名札を feature の位置まで進めるだけで済みます。これを fast-forward と呼び、新しいコミットは作られません。'),

(9, '分岐したブランチをマージしよう',
 'feature と main の両方に別々のコミットがあり、履歴が分岐しています。main にいる状態で feature を取り込みましょう。',
 'touch README.md
git add .
git commit -m "first commit"
git switch -c feature
touch login.html
git add .
git commit -m "add login"
git switch main
touch README.md
git add .
git commit -m "update readme"',
 '[{"type":"HEAD_ON","branch":"main","description":"HEAD は main を指している"},{"type":"CONTAINS","branch":"main","other":"feature","description":"main に feature の変更が取り込まれている"}]',
 'git merge feature',
 '両方のブランチが進んでいると fast-forward できないため、git merge は親を2つ持つ「マージコミット」を作って2本の履歴を合流させます。グラフで線が合流しているのを確認しましょう。'),

(10, '直前のコミットを取り消そう',
 'debug.log を間違えてコミットしてしまいました。このコミットを取り消して、ただし debug.log はステージに載ったままの状態に戻しましょう。',
 'touch README.md
git add .
git commit -m "first commit"
touch debug.log
git add .
git commit -m "oops: add debug.log"',
 '[{"type":"COMMIT_COUNT","branch":"main","count":1,"description":"main のコミットが1つに戻っている"},{"type":"STAGED","file":"debug.log","description":"debug.log はステージに残っている"}]',
 'git reset --soft HEAD~1',
 'git reset はブランチを過去のコミットへ戻します。--soft はステージと作業ディレクトリをそのまま残し、--mixed（既定）はステージも戻し、--hard は作業ディレクトリの変更まで消します。HEAD~1 は「1つ前のコミット」です。');
