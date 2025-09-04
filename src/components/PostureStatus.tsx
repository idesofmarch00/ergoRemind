import type { AlertState, PostureFrame, PostureSession } from '@/types';
import { formatDuration } from '@/utils/postureUtils';

interface PostureStatusProps {
  frame: PostureFrame | null;
  session: PostureSession;
  alertState: AlertState;
  isMonitoring: boolean;
}

/** Converts alert state into readable status copy. */
function getStatusLabel(alertState: AlertState, frame: PostureFrame | null): string {
  if (!frame) {
    return alertState === 'IDLE' ? 'Paused' : 'Looking for posture';
  }
  if (alertState === 'BAD_POSTURE') {
    return 'Bad posture detected';
  }
  if (alertState === 'COOLDOWN') {
    return 'Alert cooldown';
  }
  return frame.isGood ? 'Good posture' : 'Needs attention';
}

/** Displays score, state, timer, and simple session counters. */
export function PostureStatus(props: PostureStatusProps): JSX.Element {
  const { frame, session, alertState, isMonitoring } = props;
  const score = Math.round(frame?.score ?? 0);
  const color = !isMonitoring ? 'text-slate-400' : frame?.isGood === false ? 'text-red-400' : 'text-green-400';

  return (
    <section className="rounded-lg border border-slate-700 bg-slate-900 p-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm text-slate-400">Posture score</p>
          <p className={`mt-1 text-6xl font-semibold leading-none ${color}`}>{score}</p>
        </div>
        <span className="rounded-md border border-slate-700 px-3 py-1 text-sm text-slate-300">
          {getStatusLabel(alertState, frame)}
        </span>
      </div>
      <div className="mt-6 grid grid-cols-3 gap-3 text-sm">
        <div className="rounded-md bg-slate-950 p-3">
          <p className="text-slate-500">Session</p>
          <p className="mt-1 font-semibold text-slate-100">{formatDuration(session.durationMs)}</p>
        </div>
        <div className="rounded-md bg-slate-950 p-3">
          <p className="text-slate-500">Good</p>
          <p className="mt-1 font-semibold text-green-400">{session.goodPercent}%</p>
        </div>
        <div className="rounded-md bg-slate-950 p-3">
          <p className="text-slate-500">Frames</p>
          <p className="mt-1 font-semibold text-slate-100">{session.totalFrames}</p>
        </div>
      </div>
    </section>
  );
}
