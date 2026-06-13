import { useEffect, useState } from 'react';

interface DistractionEventData {
  appName: string;
  duration: number;
}

/**
 * OverlayApp is the component rendered in the separate transparent BrowserWindow overlay.
 * It alerts the user when they are distracted, displays a visual warning, and
 * auto-dismisses after a 5 second countdown.
 */
export function OverlayApp(): JSX.Element {
  const [data, setData] = useState<DistractionEventData | null>(null);
  const [countdown, setCountdown] = useState(5);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Listen to distraction alerts from main process
    const unsubscribeDetect = window.ergoremind.onDistractionDetected((event) => {
      setData(event);
      setCountdown(5);
      setIsVisible(true);
    });

    // Listen to focus restored from main process (closes overlay immediately)
    const unsubscribeRestore = window.ergoremind.onFocusRestored(() => {
      setIsVisible(false);
    });

    return () => {
      unsubscribeDetect();
      unsubscribeRestore();
    };
  }, []);

  // Countdown timer for auto-dismiss
  useEffect(() => {
    if (!isVisible) return;
    if (countdown <= 0) {
      setIsVisible(false);
      window.ergoremind.dismissOverlay();
      return;
    }

    const timer = setTimeout(() => {
      setCountdown((prev) => prev - 1);
    }, 1000);

    return () => clearTimeout(timer);
  }, [countdown, isVisible]);

  // Request dismiss on clicking anywhere
  const handleDismiss = (): void => {
    setIsVisible(false);
    window.ergoremind.dismissOverlay();
  };

  if (!data) return <div className="w-screen h-screen bg-transparent" />;

  const formatDuration = (ms: number): string => {
    const sec = Math.round(ms / 1000);
    if (sec < 60) return `${sec}s`;
    const min = Math.floor(sec / 60);
    return `${min}m ${sec % 60}s`;
  };

  return (
    <div
      onClick={handleDismiss}
      className={`w-screen h-screen flex items-center justify-center bg-transparent cursor-pointer transition-all duration-500 ease-in-out ${
        isVisible ? 'opacity-100 scale-100' : 'opacity-0 scale-95'
      }`}
    >
      <div className="w-[400px] h-[200px] bg-slate-900/95 border border-red-500/30 rounded-2xl p-6 flex flex-col justify-between shadow-2xl shadow-red-900/30 backdrop-blur-md">
        <div className="flex items-start gap-4">
          <div className="text-3xl animate-bounce">⚠️</div>
          <div>
            <h1 className="text-white text-xl font-bold tracking-tight">You're distracted!</h1>
            <p className="text-slate-300 text-sm mt-1 leading-relaxed">
              Get back to work! You've been on <span className="text-red-400 font-semibold">{data.appName}</span>
              {data.duration > 0 && ` for ${formatDuration(data.duration)}`}.
            </p>
          </div>
        </div>

        {/* Visual Countdown Indicator */}
        <div className="flex items-center justify-between mt-4">
          <span className="text-slate-400 text-xs font-medium uppercase tracking-wider">Refocusing...</span>
          <div className="flex items-center gap-2">
            {/* Visual indicator bar */}
            <div className="w-24 h-1.5 bg-slate-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-red-500 transition-all duration-1000 ease-linear"
                style={{ width: `${(countdown / 5) * 100}%` }}
              />
            </div>
            <span className="text-red-400 text-xs font-mono font-bold w-4 text-right">{countdown}s</span>
          </div>
        </div>
      </div>
    </div>
  );
}
