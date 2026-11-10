import { useEffect, useRef, useState, type KeyboardEvent } from 'react';

export interface TerminalProps {
  lines: { kind: 'input' | 'output' | 'error'; text: string }[];
  onRun: (command: string) => void;
}

// コマンドを1行ずつ受け付けるターミナル風の入力欄。↑↓で入力履歴をたどれる。
export function Terminal({ lines, onRun }: TerminalProps) {
  const [value, setValue] = useState('');
  const [past, setPast] = useState<string[]>([]);
  const [cursor, setCursor] = useState<number | null>(null);
  const logRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    logRef.current?.scrollTo?.({ top: logRef.current.scrollHeight });
  }, [lines]);

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const command = value.trim();
      if (!command) return;
      onRun(command);
      setPast((p) => [...p, command]);
      setCursor(null);
      setValue('');
    } else if (e.key === 'ArrowUp' && past.length > 0) {
      e.preventDefault();
      const i = cursor === null ? past.length - 1 : Math.max(0, cursor - 1);
      setCursor(i);
      setValue(past[i]);
    } else if (e.key === 'ArrowDown' && cursor !== null) {
      e.preventDefault();
      const i = cursor + 1;
      setCursor(i >= past.length ? null : i);
      setValue(i >= past.length ? '' : past[i]);
    }
  };

  return (
    <div className="terminal" onClick={() => inputRef.current?.focus()}>
      <div className="terminal-log" ref={logRef} aria-live="polite">
        {lines.length === 0 && (
          <p className="terminal-hint">ここに git コマンドを入力して Enter（help で使えるコマンド一覧）</p>
        )}
        {lines.map((line, i) => (
          <p key={i} className={`terminal-line terminal-${line.kind}`} data-kind={line.kind}>
            {line.kind === 'input' ? `$ ${line.text}` : line.text}
          </p>
        ))}
      </div>
      <div className="terminal-prompt">
        <span aria-hidden="true">$</span>
        <input
          ref={inputRef}
          aria-label="コマンド入力"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={onKeyDown}
          autoComplete="off"
          autoCapitalize="off"
          spellCheck={false}
          placeholder='git add README.md'
        />
      </div>
    </div>
  );
}
