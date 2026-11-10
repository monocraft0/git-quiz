import { fileStatus, headCommitId } from './gitSimulator';
import type { RepoState } from './types';

// 作業ディレクトリ → ステージングエリア → リポジトリ の3か所を並べ、
// ファイルがどこにあるかを見せる。ファイルの版が変わるとチップの key が変わり、再アニメーションする。
export function AreasPanel({ repo }: { repo: RepoState }) {
  const { staged, modified, untracked } = fileStatus(repo);
  const headId = headCommitId(repo);
  const head = headId ? repo.commits[headId] : null;
  const workFiles = Object.keys(repo.workdir).sort();
  const repoFiles = head ? Object.keys(head.tree).sort() : [];
  const where = repo.head.type === 'branch' ? repo.head.name : 'detached HEAD';

  return (
    <div className="areas">
      <section className="area area-work" aria-label="作業ディレクトリ">
        <h3>作業ディレクトリ</h3>
        <p className="area-caption">手元のファイル</p>
        <ul>
          {workFiles.map((f) => {
            const kind = untracked.includes(f) ? 'untracked' : modified.includes(f) ? 'modified' : 'clean';
            return (
              <li key={`${f}@${repo.workdir[f]}`} className={`file-chip file-${kind}`}>
                <span className="file-name">{f}</span>
                {kind !== 'clean' && (
                  <span className="file-badge">{kind === 'untracked' ? '未追跡' : '変更あり'}</span>
                )}
              </li>
            );
          })}
          {workFiles.length === 0 && <li className="area-empty">（ファイルなし）</li>}
        </ul>
      </section>

      <div className="area-arrow" aria-hidden="true">
        <span>git add</span>→
      </div>

      <section className="area area-stage" aria-label="ステージングエリア">
        <h3>ステージングエリア</h3>
        <p className="area-caption">次のコミットに入る変更</p>
        <ul>
          {staged.map((f) => (
            <li key={`${f}@${repo.index[f] ?? 'deleted'}`} className="file-chip file-staged">
              <span className="file-name">{f}</span>
            </li>
          ))}
          {staged.length === 0 && <li className="area-empty">（空）</li>}
        </ul>
      </section>

      <div className="area-arrow" aria-hidden="true">
        <span>git commit</span>→
      </div>

      <section className="area area-repo" aria-label="リポジトリ">
        <h3>リポジトリ</h3>
        <p className="area-caption">
          {head ? (
            <>
              HEAD → {where} <code>{head.id}</code>
            </>
          ) : (
            `HEAD → ${where}（コミットなし）`
          )}
        </p>
        <ul>
          {repoFiles.map((f) => (
            <li key={`${headId}-${f}`} className="file-chip file-committed">
              <span className="file-name">{f}</span>
            </li>
          ))}
          {repoFiles.length === 0 && <li className="area-empty">（空）</li>}
        </ul>
      </section>
    </div>
  );
}
