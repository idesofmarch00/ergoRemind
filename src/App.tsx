import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { SettingsPanel } from '@/components/SettingsPanel';
import { StatsPanel } from '@/components/StatsPanel';
import { PostureStatus } from '@/components/PostureStatus';
import { VideoFeed } from '@/components/VideoFeed';
import { usePoseDetection } from '@/hooks/usePoseDetection';
import { usePostureAnalysis } from '@/hooks/usePostureAnalysis';
import { usePostureSession } from '@/hooks/usePostureSession';
import { useSettings } from '@/hooks/useSettings';
import type { AppSettings } from '@/types';
import { buildCalibration } from '@/utils/postureUtils';
import alertSound from '../assets/sounds/alert.wav';

type ActiveView = 'monitor' | 'stats' | 'settings';

/** Renders the root ergoremind application shell. */
export default function App(): JSX.Element {
  const videoRef = useRef<HTMLVideoElement>(null);
  const { settings, isLoading, error: settingsError, updateSettings } = useSettings();
  const [isMonitoring, setIsMonitoring] = useState(true);
  const [activeView, setActiveView] = useState<ActiveView>('monitor');
  const [notice, setNotice] = useState<string | null>(null);

  const poseDetection = usePoseDetection({
    videoRef,
    selectedCamera: settings?.selectedCamera ?? 'default',
    isMonitoring,
  });
  const analysis = usePostureAnalysis({
    landmarks: poseDetection.landmarks,
    settings: settings ?? fallbackSettings,
    isMonitoring,
  });
  const sessionState = usePostureSession({ frame: analysis.frame, isMonitoring });

  const currentError = settingsError ?? poseDetection.error;

  const handleSettingsChange = useCallback(
    (update: Partial<AppSettings>): void => {
      void updateSettings(update);
    },
    [updateSettings],
  );

  const handleCalibrate = useCallback((): void => {
    if (!settings || !poseDetection.landmarks) {
      setNotice('Keep your upper body visible, then try calibrating again.');
      return;
    }
    const calibration = buildCalibration(poseDetection.landmarks);
    if (!calibration) {
      setNotice('Pose landmarks are not clear enough to calibrate yet.');
      return;
    }
    void updateSettings({ calibration });
    setNotice('Calibration saved.');
  }, [poseDetection.landmarks, settings, updateSettings]);

  const toggleMonitoring = useCallback((): void => {
    setIsMonitoring((current) => !current);
  }, []);

  const tabs = useMemo(
    () => [
      { id: 'monitor' as const, label: 'Monitor' },
      { id: 'stats' as const, label: 'Stats' },
      { id: 'settings' as const, label: 'Settings' },
    ],
    [],
  );

  useEffect(() => {
    const playAlert = () => {
      if (settings?.soundEnabled) {
        const audio = new Audio(alertSound);
        audio.play().catch(() => {});
      }
    };

    if (!window.ergoremind) return;

    const unsubscribeStandup = window.ergoremind.onStandupReminder(() => {
      playAlert();
      setNotice('Time to stand up and walk for 2 minutes.');
    });
    const unsubscribeEye = window.ergoremind.onEyeReminder(() => {
      playAlert();
      setNotice('Look 20 feet away for 20 seconds.');
    });
    const unsubscribePause = window.ergoremind.onPauseMonitoring(() => {
      setIsMonitoring(false);
    });
    const unsubscribeResume = window.ergoremind.onResumeMonitoring(() => {
      setIsMonitoring(true);
    });
    return () => {
      unsubscribeStandup();
      unsubscribeEye();
      unsubscribePause();
      unsubscribeResume();
    };
  }, [settings?.soundEnabled]);

  useEffect(() => {
    if (!notice) {
      return () => undefined;
    }
    const timeout = window.setTimeout(() => {
      setNotice(null);
    }, 5000);
    return () => {
      window.clearTimeout(timeout);
    };
  }, [notice]);

  if (isLoading || !settings) {
    return (
      <main className="grid min-h-screen place-items-center bg-slate-950 text-slate-100">
        <p className="text-sm text-slate-400">Loading ergoremind...</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100">
      <div className="mx-auto flex min-h-screen w-full max-w-6xl flex-col px-5 py-6">
        <header className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800 pb-4">
          <div>
            <h1 className="text-2xl font-semibold tracking-normal text-slate-50">ergoRemind</h1>
            <p className="text-sm text-slate-400">Local posture monitoring</p>
          </div>
          <div className="flex items-center gap-3">
            <nav className="flex rounded-md border border-slate-700 bg-slate-900 p-1">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  className={`rounded px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-green-400/50 ${
                    activeView === tab.id ? 'bg-green-500 text-slate-950' : 'text-slate-300 hover:bg-slate-800'
                  }`}
                  type="button"
                  onClick={() => {
                    setActiveView(tab.id);
                  }}
                >
                  {tab.label}
                </button>
              ))}
            </nav>
            <button
              className="rounded-md border border-slate-700 px-4 py-2 text-sm font-semibold text-slate-100 outline-none hover:bg-slate-800 focus:ring-2 focus:ring-green-400/50"
              type="button"
              onClick={toggleMonitoring}
            >
              {isMonitoring ? 'Pause' : 'Resume'}
            </button>
          </div>
        </header>

        {notice && <div className="mt-4 rounded-md border border-green-400/40 bg-green-950/60 px-4 py-3 text-sm text-green-100">{notice}</div>}

        <div className="grid flex-1 gap-5 py-5 lg:grid-cols-[minmax(0,1fr)_360px]">
          <div className="space-y-5">
            <VideoFeed
              videoRef={videoRef}
              landmarks={poseDetection.landmarks}
              isGoodPosture={analysis.frame?.isGood ?? true}
              isMonitoring={isMonitoring}
              error={currentError}
            />
            <PostureStatus frame={analysis.frame} session={sessionState.session} alertState={analysis.alertState} isMonitoring={isMonitoring} />
          </div>
          <aside className="space-y-5">
            {activeView === 'monitor' && (
              <>
                <StatsPanel stats={sessionState.stats} session={sessionState.session} />
                <SettingsPanel settings={settings} cameras={poseDetection.cameras} onSettingsChange={handleSettingsChange} onCalibrate={handleCalibrate} />
              </>
            )}
            {activeView === 'stats' && <StatsPanel stats={sessionState.stats} session={sessionState.session} />}
            {activeView === 'settings' && (
              <SettingsPanel settings={settings} cameras={poseDetection.cameras} onSettingsChange={handleSettingsChange} onCalibrate={handleCalibrate} />
            )}
          </aside>
        </div>
      </div>
    </main>
  );
}

const fallbackSettings: AppSettings = {
  slouchThreshold: 25,
  alertDelay: 60,
  alertCooldown: 120,
  standUpInterval: 30,
  eyeRuleInterval: 20,
  soundEnabled: true,
  selectedCamera: 'default',
  startMinimized: false,
  calibration: null,
};
