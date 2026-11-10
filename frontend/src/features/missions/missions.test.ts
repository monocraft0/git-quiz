import { describe, expect, it } from 'vitest';
import { runCommand, runScript } from '../gitsim/gitSimulator';
import { judgeMission } from './judge';
import { MISSIONS } from './missions';

describe('MISSIONS', () => {
  it('初心者向けに10問あり、id は重複しない', () => {
    expect(MISSIONS).toHaveLength(10);
    expect(new Set(MISSIONS.map((m) => m.id)).size).toBe(10);
  });

  it.each(MISSIONS.map((m) => [m.title, m] as const))(
    '「%s」は初期状態では未クリアで、模範解答を打つとクリアになる',
    (_title, mission) => {
      const initial = runScript(mission.setupCommands);
      expect(judgeMission(mission.goals, initial).cleared).toBe(false);

      const solved = mission.modelAnswer.reduce((s, cmd) => {
        const r = runCommand(s, cmd);
        expect(r.ok, `${cmd}: ${r.output.join(' ')}`).toBe(true);
        return r.state;
      }, initial);
      expect(judgeMission(mission.goals, solved).cleared).toBe(true);
    },
  );
});
