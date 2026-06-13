import type { FocusStats as FocusStatsType } from '../types';
import { formatDuration } from '../utils/postureUtils';

interface FocusStatsProps {
  focusStats: FocusStatsType;
}

/**
 * FocusStats displays today's distraction metrics: focus percentage, total distraction time,
 * distraction event count, and a breakdown of time spent on blocked apps.
 */
export function FocusStats(props: FocusStatsProps): JSX.Element {
  const { focusStats } = props;
  const { totalDistractionMs, distractionCount, focusPercentage, distractionsByApp } = focusStats;

  // Sort distractions by duration descending
  const sortedDistractions = Object.entries(distractionsByApp || {})
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5); // show top 5 only

  const formatAppDuration = (ms: number): string => {
    const sec = Math.round(ms / 1000);
    if (sec < 60) return `${sec}s`;
    const min = Math.floor(sec / 60);
    if (min < 60) return `${min}m ${sec % 60}s`;
    const hr = Math.floor(min / 60);
    return `${hr}h ${min % 60}m`;
  };

  return (
    <div className="space-y-5 border-t border-slate-800 pt-5 mt-5">
      <div>
        <h3 className="text-md font-semibold text-slate-200">Focus stats</h3>
        <p className="text-xs text-slate-400">Tracking today's focus metrics</p>
      </div>

      {/* Focus percentage and bar */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-sm">
          <span className="text-slate-300 font-medium">Focus score</span>
          <span className={`text-lg font-bold ${focusPercentage >= 80 ? 'text-green-400' : 'text-amber-400'}`}>
            {focusPercentage}%
          </span>
        </div>
        <div className="h-3 w-full bg-slate-950 rounded-full overflow-hidden flex">
          <div
            className="h-full bg-green-500 transition-all duration-500 ease-out"
            style={{ width: `${focusPercentage}%` }}
          />
          <div
            className="h-full bg-amber-500 transition-all duration-500 ease-out"
            style={{ width: `${100 - focusPercentage}%` }}
          />
        </div>
      </div>

      {/* Numeric statistics */}
      <div className="grid grid-cols-2 gap-3 text-sm">
        <div className="rounded-md bg-slate-950 p-3">
          <span className="text-xs text-slate-400 block font-medium">Distracted time</span>
          <span className="text-slate-200 font-mono font-semibold text-md mt-1 block">
            {formatDuration(totalDistractionMs)}
          </span>
        </div>
        <div className="rounded-md bg-slate-950 p-3">
          <span className="text-xs text-slate-400 block font-medium">Distractions triggered</span>
          <span className="text-slate-200 font-semibold text-md mt-1 block">
            {distractionCount} {distractionCount === 1 ? 'time' : 'times'}
          </span>
        </div>
      </div>

      {/* Top distracting apps */}
      <div className="space-y-2">
        <span className="text-xs text-slate-400 block font-medium">Top distractors:</span>
        {sortedDistractions.length > 0 ? (
          <div className="rounded-md bg-slate-950/60 border border-slate-900 overflow-hidden divide-y divide-slate-950">
            {sortedDistractions.map(([appName, durationMs]) => (
              <div key={appName} className="flex items-center justify-between p-2.5 text-xs text-slate-300">
                <span className="font-semibold truncate max-w-[200px]">{appName}</span>
                <span className="text-slate-400 font-mono font-medium">{formatAppDuration(durationMs)}</span>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-xs text-slate-500 italic p-1">No distractions detected today. Keep up the focus! 🎯</p>
        )}
      </div>
    </div>
  );
}
