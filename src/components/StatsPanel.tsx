import type { DailyStats, PostureSession, FocusStats as FocusStatsType } from '@/types';
import { FocusStats } from './FocusStats';

interface StatsPanelProps {
  stats: DailyStats | null;
  session: PostureSession;
  focusStats: FocusStatsType;
}

/** Calculates a bounded percentage for the good-posture progress bar. */
function getGoodPercent(stats: DailyStats | null, session: PostureSession): number {
  if (session.totalFrames > 0) {
    return session.goodPercent;
  }
  if (!stats || stats.totalGoodMs + stats.totalBadMs === 0) {
    return 0;
  }
  return Math.round((stats.totalGoodMs / (stats.totalGoodMs + stats.totalBadMs)) * 100);
}

/** Shows simple daily posture stats and session history. */
export function StatsPanel(props: StatsPanelProps): JSX.Element {
  const { stats, session, focusStats } = props;
  const goodPercent = getGoodPercent(stats, session);

  return (
    <section className="rounded-lg border border-slate-700 bg-slate-900 p-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-slate-100">Today</h2>
          <p className="text-sm text-slate-400">{stats?.date ?? new Date().toISOString().slice(0, 10)}</p>
        </div>
        <p className="text-3xl font-semibold text-green-400">{goodPercent}%</p>
      </div>
      <div className="mt-5 h-3 overflow-hidden rounded-full bg-red-500/30">
        <div className="h-full bg-green-500" style={{ width: `${goodPercent}%` }} />
      </div>
      <div className="mt-5 grid grid-cols-2 gap-3 text-sm">
        <div className="rounded-md bg-slate-950 p-3">
          <p className="text-slate-500">Saved sessions</p>
          <p className="mt-1 font-semibold text-slate-100">{stats?.sessions.length ?? 0}</p>
        </div>
        <div className="rounded-md bg-slate-950 p-3">
          <p className="text-slate-500">Current frames</p>
          <p className="mt-1 font-semibold text-slate-100">{session.totalFrames}</p>
        </div>
      </div>

      {/* Focus statistics section */}
      <FocusStats focusStats={focusStats} />
    </section>
  );
}
