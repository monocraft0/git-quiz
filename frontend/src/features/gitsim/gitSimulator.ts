import type { CommandResult, FileStatus, RepoState } from './types';

// 初学者向けgitのサブセットを再現する純粋関数群（docs/adr/0004）。
// どの関数も引数の state を書き換えず、新しい state を返す。

type Tree = Record<string, number>;

export function initialRepo(): RepoState {
  return {
    commits: {},
    branches: { main: null },
    branchOrder: ['main'],
    head: { type: 'branch', name: 'main' },
    index: {},
    workdir: {},
    seq: 0,
    version: 0,
  };
}

export function runScript(commands: string[]): RepoState {
  return commands.reduce((state, cmd) => {
    const r = runCommand(state, cmd);
    if (!r.ok) throw new Error(`setup failed at "${cmd}": ${r.output.join(' ')}`);
    return r.state;
  }, initialRepo());
}

export function headCommitId(state: RepoState): string | null {
  return state.head.type === 'branch' ? (state.branches[state.head.name] ?? null) : state.head.commit;
}

export function reachableFrom(state: RepoState, commitId: string | null): string[] {
  const seen = new Set<string>();
  const stack = commitId ? [commitId] : [];
  while (stack.length > 0) {
    const id = stack.pop()!;
    if (seen.has(id) || !state.commits[id]) continue;
    seen.add(id);
    stack.push(...state.commits[id].parents);
  }
  return [...seen].sort((a, b) => state.commits[b].seq - state.commits[a].seq);
}

export function fileStatus(state: RepoState): FileStatus {
  const headTree = treeOf(state, headCommitId(state));
  const staged = union(state.index, headTree).filter((f) => state.index[f] !== headTree[f]);
  const modified = Object.keys(state.index).filter((f) => state.workdir[f] !== state.index[f]);
  const untracked = Object.keys(state.workdir).filter((f) => !(f in state.index));
  return { staged: staged.sort(), modified: modified.sort(), untracked: untracked.sort() };
}

export function runCommand(state: RepoState, input: string): CommandResult {
  const args = tokenize(input.trim());
  if (args.length === 0) return ok(state, []);
  const [cmd, ...rest] = args;
  try {
    switch (cmd) {
      case 'touch':
        return touch(state, rest);
      case 'ls':
        return ok(state, [Object.keys(state.workdir).sort().join('  ')]);
      case 'help':
        return ok(state, HELP);
      case 'git':
        return git(state, rest);
      default:
        return fail(state, `コマンドが見つかりません: ${cmd}（help で使えるコマンドを表示）`);
    }
  } catch (e) {
    if (e instanceof GitError) return fail(state, e.message);
    throw e;
  }
}

export const HELP = [
  '使えるコマンド:',
  '  touch <file>               ファイルを作る／編集する',
  '  ls                         作業ディレクトリのファイル一覧',
  '  git status                 状態を見る',
  '  git add <file> | .         ステージに載せる',
  '  git commit -m "<msg>"      コミットする',
  '  git branch [<name>]        ブランチ一覧／作成',
  '  git switch [-c] <branch>   ブランチを切り替える（-c で作成して切り替え）',
  '  git checkout [-b] <branch> 同上（古い書き方）',
  '  git merge <branch>         ブランチを取り込む',
  '  git log [--oneline]        履歴を見る',
  '  git reset [--soft|--mixed|--hard] <commit>  ブランチを過去へ戻す',
  '  git restore [--staged] <file>  変更／ステージを取り消す',
  '  clear                      画面をクリア',
];

// ---------------------------------------------------------------------------

class GitError extends Error {}

function ok(state: RepoState, output: string[]): CommandResult {
  return { state, output, ok: true };
}

function fail(state: RepoState, message: string): CommandResult {
  return { state, output: [message], ok: false };
}

function tokenize(input: string): string[] {
  const tokens: string[] = [];
  const re = /"([^"]*)"|'([^']*)'|(\S+)/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(input)) !== null) tokens.push(m[1] ?? m[2] ?? m[3]);
  return tokens;
}

function union(...trees: Tree[]): string[] {
  return [...new Set(trees.flatMap((t) => Object.keys(t)))];
}

function treeOf(state: RepoState, commitId: string | null): Tree {
  return commitId ? state.commits[commitId].tree : {};
}

function clone(state: RepoState): RepoState {
  return structuredClone(state);
}

// 作成順の番号から決定的に7桁の16進IDを作る（同じ初期化コマンドなら同じID）
function makeId(seq: number): string {
  return (Math.imul(seq, 2654435761) >>> 0).toString(16).padStart(8, '0').slice(0, 7);
}

function shortLabel(state: RepoState, id: string): string {
  const names = state.branchOrder.filter((b) => state.branches[b] === id);
  const head = state.head.type === 'branch' && names.includes(state.head.name) ? state.head.name : null;
  const decorations = names.map((n) => (n === head ? `HEAD -> ${n}` : n));
  if (state.head.type === 'detached' && state.head.commit === id) decorations.unshift('HEAD');
  return decorations.length ? ` (${decorations.join(', ')})` : '';
}

function touch(state: RepoState, files: string[]): CommandResult {
  if (files.length === 0) throw new GitError('touch: ファイル名を指定してください');
  const s = clone(state);
  for (const f of files) s.workdir[f] = ++s.version;
  return ok(s, []);
}

function git(state: RepoState, args: string[]): CommandResult {
  const [sub, ...rest] = args;
  switch (sub) {
    case 'status':
      return status(state);
    case 'add':
      return add(state, rest);
    case 'commit':
      return commit(state, rest);
    case 'branch':
      return branch(state, rest);
    case 'switch':
      return rest[0] === '-c' ? createAndSwitch(state, rest[1]) : switchTo(state, rest[0]);
    case 'checkout':
      return rest[0] === '-b' ? createAndSwitch(state, rest[1]) : switchTo(state, rest[0], true);
    case 'merge':
      return merge(state, rest[0]);
    case 'log':
      return log(state);
    case 'reset':
      return reset(state, rest);
    case 'restore':
      return restore(state, rest);
    case undefined:
      throw new GitError('git: サブコマンドを指定してください（help で一覧）');
    default:
      throw new GitError(`git: '${sub}' はこのクイズでは使えないコマンドです（help で一覧）`);
  }
}

function status(state: RepoState): CommandResult {
  const { staged, modified, untracked } = fileStatus(state);
  const where =
    state.head.type === 'branch' ? `On branch ${state.head.name}` : `HEAD detached at ${state.head.commit}`;
  const out = [where];
  if (staged.length) out.push('コミット予定の変更（ステージ済み）:', ...staged.map((f) => `  ${f}`));
  if (modified.length) out.push('ステージされていない変更:', ...modified.map((f) => `  ${f}`));
  if (untracked.length) out.push('追跡されていないファイル:', ...untracked.map((f) => `  ${f}`));
  if (!staged.length && !modified.length && !untracked.length) out.push('nothing to commit, working tree clean');
  return ok(state, out);
}

function add(state: RepoState, paths: string[]): CommandResult {
  if (paths.length === 0) throw new GitError('git add: ファイル名か . を指定してください');
  const s = clone(state);
  for (const p of paths) {
    if (p === '.' || p === '-A' || p === '--all') {
      s.index = { ...s.workdir };
    } else if (p in s.workdir) {
      s.index[p] = s.workdir[p];
    } else if (p in s.index) {
      delete s.index[p];
    } else {
      throw new GitError(`fatal: pathspec '${p}' did not match any files`);
    }
  }
  return ok(s, []);
}

function commit(state: RepoState, args: string[]): CommandResult {
  const mi = args.indexOf('-m');
  const message = mi >= 0 ? args[mi + 1] : undefined;
  if (!message) throw new GitError('git commit: -m "メッセージ" でコミットメッセージを指定してください');
  if (fileStatus(state).staged.length === 0) {
    throw new GitError('nothing to commit（ステージに何もありません。先に git add しましょう）');
  }
  const s = clone(state);
  const parent = headCommitId(s);
  const id = makeId(++s.seq);
  s.commits[id] = { id, message, parents: parent ? [parent] : [], tree: { ...s.index }, seq: s.seq };
  moveHead(s, id);
  const where = s.head.type === 'branch' ? s.head.name : 'detached HEAD';
  return ok(s, [`[${where} ${id}] ${message}`]);
}

function moveHead(s: RepoState, id: string) {
  if (s.head.type === 'branch') s.branches[s.head.name] = id;
  else s.head = { type: 'detached', commit: id };
}

function branch(state: RepoState, args: string[]): CommandResult {
  if (args.length === 0) {
    const current = state.head.type === 'branch' ? state.head.name : null;
    return ok(
      state,
      state.branchOrder
        .filter((b) => state.branches[b] !== null || b === current)
        .map((b) => `${b === current ? '*' : ' '} ${b}`),
    );
  }
  if (args[0] === '-d' || args[0] === '-D') {
    const name = args[1];
    if (!name || !(name in state.branches)) throw new GitError(`error: branch '${name ?? ''}' not found`);
    if (state.head.type === 'branch' && state.head.name === name) {
      throw new GitError(`error: いまいるブランチ '${name}' は削除できません`);
    }
    const s = clone(state);
    delete s.branches[name];
    s.branchOrder = s.branchOrder.filter((b) => b !== name);
    return ok(s, [`Deleted branch ${name}`]);
  }
  return ok(createBranch(state, args[0]), []);
}

function createBranch(state: RepoState, name: string | undefined): RepoState {
  if (!name || name.startsWith('-')) throw new GitError('ブランチ名を指定してください');
  if (name in state.branches) throw new GitError(`fatal: a branch named '${name}' already exists`);
  const at = headCommitId(state);
  if (!at) throw new GitError('fatal: まだコミットが無いのでブランチを作れません（先にコミットしましょう）');
  const s = clone(state);
  s.branches[name] = at;
  s.branchOrder.push(name);
  return s;
}

function createAndSwitch(state: RepoState, name: string | undefined): CommandResult {
  const s = createBranch(state, name);
  s.head = { type: 'branch', name: name! };
  return ok(s, [`Switched to a new branch '${name}'`]);
}

function switchTo(state: RepoState, target: string | undefined, allowCommit = false): CommandResult {
  if (!target) throw new GitError('切り替え先のブランチ名を指定してください');
  let targetId: string | null;
  let newHead: RepoState['head'];
  if (target in state.branches) {
    targetId = state.branches[target];
    newHead = { type: 'branch', name: target };
  } else if (allowCommit && findCommit(state, target)) {
    targetId = findCommit(state, target)!;
    newHead = { type: 'detached', commit: targetId };
  } else {
    throw new GitError(`fatal: invalid reference: ${target}（ブランチ '${target}' はありません）`);
  }

  const headTree = treeOf(state, headCommitId(state));
  const targetTree = treeOf(state, targetId);
  const s = clone(state);
  const index: Tree = {};
  const workdir: Tree = {};
  for (const f of union(state.index, headTree, targetTree)) {
    const localChange = state.index[f] !== headTree[f];
    if (localChange && headTree[f] !== targetTree[f]) {
      throw new GitError(`error: '${f}' のローカルの変更が上書きされるため切り替えできません。先にコミットしましょう`);
    }
    const v = localChange ? state.index[f] : targetTree[f];
    if (v !== undefined) index[f] = v;
  }
  for (const f of union(state.workdir, state.index, index)) {
    const localChange = state.workdir[f] !== state.index[f];
    if (localChange && state.index[f] !== index[f] && f in state.index) {
      throw new GitError(`error: '${f}' のローカルの変更が上書きされるため切り替えできません。先にコミットしましょう`);
    }
    const v = localChange ? state.workdir[f] : index[f];
    if (v !== undefined) workdir[f] = v;
  }
  s.index = index;
  s.workdir = workdir;
  s.head = newHead;
  return ok(s, [newHead.type === 'branch' ? `Switched to branch '${target}'` : `HEAD is now at ${targetId}`]);
}

function findCommit(state: RepoState, ref: string): string | null {
  if (ref.length < 4) return null;
  return Object.keys(state.commits).find((id) => id.startsWith(ref)) ?? null;
}

function merge(state: RepoState, name: string | undefined): CommandResult {
  if (!name) throw new GitError('git merge: 取り込むブランチ名を指定してください');
  const theirs = name in state.branches ? state.branches[name] : findCommit(state, name);
  if (!theirs) throw new GitError(`merge: ${name} - not something we can merge`);
  const st = fileStatus(state);
  if (st.staged.length || st.modified.length) {
    throw new GitError('error: コミットしていない変更があります。先にコミットしてからマージしましょう');
  }
  const ours = headCommitId(state);
  const oursAncestors = new Set(reachableFrom(state, ours));
  if (oursAncestors.has(theirs)) return ok(state, ['Already up to date.']);

  const s = clone(state);
  const untracked = Object.fromEntries(st.untracked.map((f) => [f, state.workdir[f]]));
  if (!ours || reachableFrom(state, theirs).includes(ours)) {
    moveHead(s, theirs);
    s.index = { ...state.commits[theirs].tree };
    s.workdir = { ...untracked, ...s.index };
    return ok(s, [`Updating ${ours ?? '(none)'}..${theirs}`, 'Fast-forward']);
  }

  const baseId = reachableFrom(state, theirs).find((id) => oursAncestors.has(id)) ?? null;
  const base = treeOf(state, baseId);
  const o = treeOf(state, ours);
  const t = treeOf(state, theirs);
  const tree: Tree = {};
  for (const f of union(base, o, t)) {
    let v: number | undefined;
    if (o[f] === t[f]) v = o[f];
    else if (o[f] === base[f]) v = t[f];
    else if (t[f] === base[f]) v = o[f];
    else {
      throw new GitError(
        `CONFLICT: '${f}' が両方のブランチで変更されています（このクイズではコンフリクトは扱いません）`,
      );
    }
    if (v !== undefined) tree[f] = v;
  }
  const id = makeId(++s.seq);
  const message = `Merge branch '${name}'`;
  s.commits[id] = { id, message, parents: [ours, theirs], tree, seq: s.seq };
  moveHead(s, id);
  s.index = { ...tree };
  s.workdir = { ...untracked, ...tree };
  return ok(s, [`Merge made by the 'ort' strategy. [${id}] ${message}`]);
}

function log(state: RepoState): CommandResult {
  const ids = reachableFrom(state, headCommitId(state));
  if (ids.length === 0) throw new GitError('fatal: まだコミットがありません');
  return ok(
    state,
    ids.map((id) => `${id}${shortLabel(state, id)} ${state.commits[id].message}`),
  );
}

function resolveRef(state: RepoState, ref: string): string {
  const m = /^(HEAD|[\w./-]+?)((?:~\d*|\^)*)$/.exec(ref);
  if (!m) throw new GitError(`fatal: ambiguous argument '${ref}'`);
  const [, base, suffix] = m;
  let id = base === 'HEAD' ? headCommitId(state) : (state.branches[base] ?? findCommit(state, base));
  if (!id) throw new GitError(`fatal: ambiguous argument '${ref}': コミットが見つかりません`);
  const steps = [...suffix.matchAll(/~(\d*)|\^/g)].reduce(
    (n, step) => n + (step[0] === '^' ? 1 : Number(step[1] || 1)),
    0,
  );
  for (let i = 0; i < steps; i++) {
    const parent: string | undefined = state.commits[id].parents[0];
    if (!parent) throw new GitError(`fatal: '${ref}' はさかのぼりすぎです（それより前のコミットはありません）`);
    id = parent;
  }
  return id;
}

function reset(state: RepoState, args: string[]): CommandResult {
  const mode = args.find((a) => a === '--soft' || a === '--mixed' || a === '--hard') ?? '--mixed';
  const ref = args.find((a) => !a.startsWith('--')) ?? 'HEAD';
  if (!headCommitId(state)) throw new GitError('fatal: まだコミットがありません');
  const target = resolveRef(state, ref);
  const s = clone(state);
  const untracked = fileStatus(state).untracked;
  moveHead(s, target);
  const tree = state.commits[target].tree;
  if (mode !== '--soft') s.index = { ...tree };
  if (mode === '--hard') {
    s.workdir = { ...tree };
    for (const f of untracked) s.workdir[f] = state.workdir[f];
  }
  return ok(s, mode === '--hard' ? [`HEAD is now at ${target} ${state.commits[target].message}`] : []);
}

function restore(state: RepoState, args: string[]): CommandResult {
  const staged = args.includes('--staged');
  const files = args.filter((a) => !a.startsWith('--'));
  if (files.length === 0) throw new GitError('git restore: ファイル名を指定してください');
  const s = clone(state);
  const headTree = treeOf(state, headCommitId(state));
  for (const f of files) {
    if (staged) {
      if (!(f in s.index) && !(f in headTree)) throw new GitError(`error: pathspec '${f}' did not match any file(s) known to git`);
      if (f in headTree) s.index[f] = headTree[f];
      else delete s.index[f];
    } else {
      if (!(f in s.index)) throw new GitError(`error: pathspec '${f}' did not match any file(s) known to git`);
      s.workdir[f] = s.index[f];
    }
  }
  return ok(s, []);
}
