import type { Mission } from './types';

// 初心者向けのミッション。上から順に出題する。
// goals にコミットIDは書かない（初期化コマンドで変わるため）。
export const MISSIONS: Mission[] = [
  {
    id: 1,
    title: 'ファイルをステージに載せよう',
    description:
      'README.md を作りました。まだ git は README.md を記録の対象にしていません（未追跡）。次のコミットに含めるため、ステージングエリアに載せましょう。',
    setupCommands: ['touch README.md'],
    goals: [
      { type: 'STAGED', file: 'README.md', description: 'README.md がステージにある' },
    ],
    modelAnswer: ['git add README.md'],
    explanation:
      'git add は作業ディレクトリの変更をステージングエリア（インデックス）に載せます。ステージは「次のコミットに入れるもの」の置き場です。git add . ならすべての変更をまとめて載せられます。',
  },
  {
    id: 2,
    title: '初めてのコミット',
    description:
      'README.md がステージに載っています。この状態を履歴として記録（コミット）しましょう。メッセージは自由です。',
    setupCommands: ['touch README.md', 'git add README.md'],
    goals: [
      { type: 'COMMIT_COUNT', branch: 'main', count: 1, description: 'main にコミットが1つある' },
      { type: 'CLEAN', description: '未コミットの変更が無い' },
    ],
    modelAnswer: ['git commit -m "first commit"'],
    explanation:
      'git commit はステージの内容を1つのコミットとして記録し、いまいるブランチ（main）をそのコミットへ進めます。-m でメッセージを付けます。',
  },
  {
    id: 3,
    title: '変更をまとめてコミット',
    description:
      'index.html と style.css を新しく作り、README.md も編集しました。3つの変更をすべて1つのコミットにまとめましょう。',
    setupCommands: [
      'touch README.md',
      'git add .',
      'git commit -m "first commit"',
      'touch index.html',
      'touch style.css',
      'touch README.md',
    ],
    goals: [
      { type: 'COMMIT_COUNT', branch: 'main', count: 2, description: 'main にコミットが2つある' },
      { type: 'CLEAN', description: '未コミットの変更が無い' },
    ],
    modelAnswer: ['git add .', 'git commit -m "add page"'],
    explanation:
      'git add . はカレントディレクトリ以下の変更をすべてステージに載せます。git status で何がステージに載っているかを確かめてからコミットする習慣をつけましょう。',
  },
  {
    id: 4,
    title: 'ステージを取り消そう',
    description:
      'git add . をしたら、コミットしてはいけない secret.env までステージに載ってしまいました。app.js はステージに残したまま、secret.env だけをステージから降ろしましょう。',
    setupCommands: [
      'touch README.md',
      'git add .',
      'git commit -m "first commit"',
      'touch app.js',
      'touch secret.env',
      'git add .',
    ],
    goals: [
      { type: 'STAGED', file: 'app.js', description: 'app.js はステージにある' },
      { type: 'UNTRACKED', file: 'secret.env', description: 'secret.env は未追跡に戻っている' },
    ],
    modelAnswer: ['git restore --staged secret.env'],
    explanation:
      'git restore --staged <file> はファイルをステージから降ろします（作業ディレクトリのファイルは消えません）。本来は .gitignore に書いておくと、うっかり add されるのを防げます。',
  },
  {
    id: 5,
    title: 'ブランチを作ろう',
    description:
      '新機能の開発用に feature ブランチを作りましょう。ただし、まだ main にいたままにします。',
    setupCommands: ['touch README.md', 'git add .', 'git commit -m "first commit"'],
    goals: [
      { type: 'BRANCH_EXISTS', branch: 'feature', description: 'feature ブランチがある' },
      { type: 'HEAD_ON', branch: 'main', description: 'HEAD は main を指している' },
    ],
    modelAnswer: ['git branch feature'],
    explanation:
      'git branch <name> は「いまのコミットを指す新しい名札」を作るだけで、HEAD（いまいる場所）は動きません。グラフで同じコミットに main と feature の2つのラベルが付いたのを確認しましょう。',
  },
  {
    id: 6,
    title: 'ブランチを切り替えよう',
    description:
      'feature ブランチがすでにあります。feature ブランチに移動しましょう。',
    setupCommands: [
      'touch README.md',
      'git add .',
      'git commit -m "first commit"',
      'git branch feature',
    ],
    goals: [
      { type: 'HEAD_ON', branch: 'feature', description: 'HEAD が feature を指している' },
    ],
    modelAnswer: ['git switch feature'],
    explanation:
      'git switch <branch>（古い書き方では git checkout <branch>）で HEAD を別のブランチに移します。以後のコミットはそのブランチに積まれます。',
  },
  {
    id: 7,
    title: 'ブランチで作業しよう',
    description:
      'main を汚さずに新機能を作ります。feature ブランチを作って移動し、login.html を作ってコミットしましょう。main は今のままにします。',
    setupCommands: ['touch README.md', 'git add .', 'git commit -m "first commit"'],
    goals: [
      { type: 'HEAD_ON', branch: 'feature', description: 'HEAD が feature を指している' },
      { type: 'COMMIT_COUNT', branch: 'feature', count: 2, description: 'feature にコミットが2つある' },
      { type: 'COMMIT_COUNT', branch: 'main', count: 1, description: 'main のコミットは1つのまま' },
      { type: 'CLEAN', description: '未コミットの変更が無い' },
    ],
    modelAnswer: [
      'git switch -c feature',
      'touch login.html',
      'git add .',
      'git commit -m "add login"',
    ],
    explanation:
      'git switch -c <name>（または git checkout -b <name>）はブランチの作成と切り替えを一度に行います。feature でコミットすると、feature だけが先に進み main はそのまま残ります。',
  },
  {
    id: 8,
    title: 'マージしよう（fast-forward）',
    description:
      'feature ブランチで login.html を追加しました。main にいる状態で、feature の変更を main に取り込みましょう。',
    setupCommands: [
      'touch README.md',
      'git add .',
      'git commit -m "first commit"',
      'git switch -c feature',
      'touch login.html',
      'git add .',
      'git commit -m "add login"',
      'git switch main',
    ],
    goals: [
      { type: 'HEAD_ON', branch: 'main', description: 'HEAD は main を指している' },
      { type: 'CONTAINS', branch: 'main', other: 'feature', description: 'main に feature の変更が取り込まれている' },
    ],
    modelAnswer: ['git merge feature'],
    explanation:
      'main から分かれたあと main 側に新しいコミットが無いので、git merge は main の名札を feature の位置まで進めるだけで済みます。これを fast-forward と呼び、新しいコミットは作られません。',
  },
  {
    id: 9,
    title: '分岐したブランチをマージしよう',
    description:
      'feature と main の両方に別々のコミットがあり、履歴が分岐しています。main にいる状態で feature を取り込みましょう。',
    setupCommands: [
      'touch README.md',
      'git add .',
      'git commit -m "first commit"',
      'git switch -c feature',
      'touch login.html',
      'git add .',
      'git commit -m "add login"',
      'git switch main',
      'touch README.md',
      'git add .',
      'git commit -m "update readme"',
    ],
    goals: [
      { type: 'HEAD_ON', branch: 'main', description: 'HEAD は main を指している' },
      { type: 'CONTAINS', branch: 'main', other: 'feature', description: 'main に feature の変更が取り込まれている' },
    ],
    modelAnswer: ['git merge feature'],
    explanation:
      '両方のブランチが進んでいると fast-forward できないため、git merge は親を2つ持つ「マージコミット」を作って2本の履歴を合流させます。グラフで線が合流しているのを確認しましょう。',
  },
  {
    id: 10,
    title: '直前のコミットを取り消そう',
    description:
      'debug.log を間違えてコミットしてしまいました。このコミットを取り消して、ただし debug.log はステージに載ったままの状態に戻しましょう。',
    setupCommands: [
      'touch README.md',
      'git add .',
      'git commit -m "first commit"',
      'touch debug.log',
      'git add .',
      'git commit -m "oops: add debug.log"',
    ],
    goals: [
      { type: 'COMMIT_COUNT', branch: 'main', count: 1, description: 'main のコミットが1つに戻っている' },
      { type: 'STAGED', file: 'debug.log', description: 'debug.log はステージに残っている' },
    ],
    modelAnswer: ['git reset --soft HEAD~1'],
    explanation:
      'git reset はブランチを過去のコミットへ戻します。--soft はステージと作業ディレクトリをそのまま残し、--mixed（既定）はステージも戻し、--hard は作業ディレクトリの変更まで消します。HEAD~1 は「1つ前のコミット」です。',
  },
];
