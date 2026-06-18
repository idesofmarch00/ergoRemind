import type { AppSettings, FocusGuardCapability } from '@/types';
import { CameraSelector } from './CameraSelector';
import { FocusSettings } from './FocusSettings';

interface SettingsPanelProps {
  settings: AppSettings;
  cameras: MediaDeviceInfo[];
  onSettingsChange: (update: Partial<AppSettings>) => void;
  onCalibrate: () => void;
  focusCapability: FocusGuardCapability;
  focusError: string | null;
}

/** Renders all configurable posture and reminder settings. */
export function SettingsPanel(props: SettingsPanelProps): JSX.Element {
  const { settings, cameras, onSettingsChange, onCalibrate, focusCapability, focusError } = props;

  /** Updates a numeric setting from a range input. */
  function updateNumber(key: keyof Pick<AppSettings, 'slouchThreshold' | 'alertDelay' | 'alertCooldown' | 'standUpInterval' | 'eyeRuleInterval'>) {
    return (event: React.ChangeEvent<HTMLInputElement>): void => {
      onSettingsChange({ [key]: Number(event.target.value) });
    };
  }

  /** Updates a boolean setting from a checkbox input. */
  function updateBoolean(key: keyof Pick<AppSettings, 'soundEnabled' | 'startMinimized'>) {
    return (event: React.ChangeEvent<HTMLInputElement>): void => {
      onSettingsChange({ [key]: event.target.checked });
    };
  }

  /** Updates the selected camera setting. */
  function updateCamera(deviceId: string): void {
    onSettingsChange({ selectedCamera: deviceId });
  }

  return (
    <section className="rounded-lg border border-slate-700 bg-slate-900 p-5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-slate-100">Settings</h2>
          <p className="text-sm text-slate-400">Tune alerts and reminders</p>
        </div>
        <button
          className="rounded-md bg-green-500 px-4 py-2 text-sm font-semibold text-slate-950 outline-none focus:ring-2 focus:ring-green-300"
          type="button"
          onClick={onCalibrate}
        >
          Calibrate
        </button>
      </div>
      <div className="mt-5 space-y-5">
        <CameraSelector cameras={cameras} selectedCamera={settings.selectedCamera} onCameraChange={updateCamera} />
        <RangeSetting label="Slouch threshold" value={settings.slouchThreshold} min={5} max={35} suffix="deg" onChange={updateNumber('slouchThreshold')} />
        <RangeSetting label="Alert delay" value={settings.alertDelay} min={3} max={30} suffix="sec" onChange={updateNumber('alertDelay')} />
        <RangeSetting label="Alert cooldown" value={settings.alertCooldown} min={20} max={180} suffix="sec" onChange={updateNumber('alertCooldown')} />
        <RangeSetting label="Stand-up reminder" value={settings.standUpInterval} min={10} max={90} suffix="min" onChange={updateNumber('standUpInterval')} />
        <RangeSetting label="Eye-rule reminder" value={settings.eyeRuleInterval} min={10} max={60} suffix="min" onChange={updateNumber('eyeRuleInterval')} />
        <ToggleSetting label="Sound enabled" checked={settings.soundEnabled} onChange={updateBoolean('soundEnabled')} />
        <ToggleSetting label="Start minimized" checked={settings.startMinimized} onChange={updateBoolean('startMinimized')} />
        
        {/* Focus Guard Settings Section */}
        <FocusSettings
          settings={settings}
          onSettingsChange={onSettingsChange}
          capability={focusCapability}
          error={focusError}
        />
      </div>
    </section>
  );
}

interface RangeSettingProps {
  label: string;
  value: number;
  min: number;
  max: number;
  suffix: string;
  onChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
}

/** Renders a labeled numeric slider control. */
function RangeSetting(props: RangeSettingProps): JSX.Element {
  const { label, value, min, max, suffix, onChange } = props;
  return (
    <label className="block text-sm text-slate-300">
      <span className="flex justify-between">
        <span>{label}</span>
        <span className="font-semibold text-slate-100">
          {value} {suffix}
        </span>
      </span>
      <input
        className="mt-2 w-full accent-green-500 focus:outline-none focus:ring-2 focus:ring-green-400/40"
        type="range"
        min={min}
        max={max}
        value={value}
        onChange={onChange}
      />
    </label>
  );
}

interface ToggleSettingProps {
  label: string;
  checked: boolean;
  onChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
}

/** Renders a labeled checkbox toggle control. */
function ToggleSetting(props: ToggleSettingProps): JSX.Element {
  const { label, checked, onChange } = props;
  return (
    <label className="flex items-center justify-between rounded-md bg-slate-950 p-3 text-sm text-slate-300">
      <span>{label}</span>
      <input className="h-5 w-5 accent-green-500 focus:ring-2 focus:ring-green-400/40" type="checkbox" checked={checked} onChange={onChange} />
    </label>
  );
}
