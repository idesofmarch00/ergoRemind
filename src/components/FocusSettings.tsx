import React, { useState } from 'react';
import type { AppSettings, FocusGuardCapability } from '../types';
import { FOCUS_PRESETS, togglePreset } from '../utils/focusUtils';

interface FocusSettingsProps {
  settings: AppSettings;
  onSettingsChange: (update: Partial<AppSettings>) => void;
  capability: FocusGuardCapability;
  error: string | null;
}

/**
 * FocusSettings handles user configuration for Focus Guard distraction monitoring.
 * It provides preset blocklists, manual keyword editing, and interval/delay/cooldown sliders.
 */
export function FocusSettings(props: FocusSettingsProps): JSX.Element {
  const { settings, onSettingsChange, capability, error } = props;
  const [newKeyword, setNewKeyword] = useState('');
  const [showPrivacyNotice, setShowPrivacyNotice] = useState(false);

  const handleToggleEnable = (event: React.ChangeEvent<HTMLInputElement>): void => {
    const isChecked = event.target.checked;
    if (isChecked && !settings.focusPrivacyNoticeSeen) {
      setShowPrivacyNotice(true);
      onSettingsChange({ focusGuardEnabled: true, focusPrivacyNoticeSeen: true });
      return;
    }
    onSettingsChange({ focusGuardEnabled: isChecked });
  };

  const handleAddKeyword = (e: React.FormEvent): void => {
    e.preventDefault();
    const word = newKeyword.trim();
    if (!word) return;

    // Avoid duplicates (case-insensitive check)
    const exists = settings.blocklist.some(
      (k) => k.toLowerCase() === word.toLowerCase()
    );

    if (!exists) {
      onSettingsChange({
        blocklist: [...settings.blocklist, word],
      });
    }
    setNewKeyword('');
  };

  const handleRemoveKeyword = (indexToRemove: number): void => {
    onSettingsChange({
      blocklist: settings.blocklist.filter((_, idx) => idx !== indexToRemove),
    });
  };

  const handleTogglePreset = (category: string): void => {
    onSettingsChange({ blocklist: togglePreset(settings.blocklist, FOCUS_PRESETS[category] ?? []) });
  };

  const updateNumber = (key: 'focusCheckInterval' | 'distractionAlertDelay' | 'distractionCooldown') => {
    return (event: React.ChangeEvent<HTMLInputElement>): void => {
      onSettingsChange({ [key]: Number(event.target.value) });
    };
  };

  return (
    <div className="space-y-5 border-t border-slate-800 pt-5 mt-5">
      <div>
        <h3 className="text-md font-semibold text-slate-200">Focus Guard</h3>
        <p className="text-xs text-slate-400">Alerts you when you are browsing distracting apps or sites</p>
      </div>

      <label className="flex items-center justify-between rounded-md bg-slate-950 p-3 text-sm text-slate-300">
        <span>Enable Focus Guard</span>
        <input
          className="h-5 w-5 accent-amber-500 focus:ring-2 focus:ring-amber-400/40"
          type="checkbox"
          checked={settings.focusGuardEnabled}
          disabled={!capability.supported}
          onChange={handleToggleEnable}
        />
      </label>

      {!capability.supported && (
        <p className="rounded-md border border-amber-500/30 bg-amber-500/5 p-3 text-xs text-amber-300">
          {capability.reason}
        </p>
      )}
      {error && (
        <p className="rounded-md border border-red-500/30 bg-red-500/5 p-3 text-xs text-red-300">{error}</p>
      )}

      {showPrivacyNotice && settings.focusGuardEnabled && (
        <div className="rounded-md border border-amber-500/20 bg-amber-500/5 p-3 text-xs text-amber-300 leading-normal relative">
          <p className="font-semibold mb-1">Privacy Notice 🔒</p>
          <p>
            Focus Guard detects distractions by polling active app names and window titles.
            All data remains strictly offline on your computer. Window titles are never saved to disk (only app names and durations).
          </p>
          <button
            onClick={() => setShowPrivacyNotice(false)}
            className="absolute top-2 right-2 text-amber-400 hover:text-white font-bold"
          >
            ✕
          </button>
        </div>
      )}

      {settings.focusGuardEnabled && (
        <div className="space-y-4 animate-fadeIn">
          {/* Quick Preset Buttons */}
          <div>
            <span className="text-xs text-slate-400 block mb-2 font-medium">Quick-add categories:</span>
            <div className="flex flex-wrap gap-2">
              {Object.keys(FOCUS_PRESETS).map((cat) => (
                <button
                  key={cat}
                  type="button"
                  aria-pressed={(FOCUS_PRESETS[cat] ?? []).every((word) => settings.blocklist.some((keyword) => keyword.toLowerCase() === word.toLowerCase()))}
                  onClick={() => handleTogglePreset(cat)}
                  className="px-2.5 py-1 text-xs font-semibold rounded-md border border-slate-700 bg-slate-800/40 hover:bg-slate-700 text-slate-300 hover:text-white transition aria-pressed:border-amber-500 aria-pressed:bg-amber-500/15 aria-pressed:text-amber-300 focus:outline-none focus:ring-2 focus:ring-amber-400/40"
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          {/* Blocklist tags form */}
          <form onSubmit={handleAddKeyword} className="flex gap-2">
            <input
              type="text"
              placeholder="Add app or site keyword (e.g. YouTube)"
              value={newKeyword}
              onChange={(e) => setNewKeyword(e.target.value)}
              className="flex-1 bg-slate-950 border border-slate-800 rounded-md px-3 py-1.5 text-sm text-slate-200 focus:outline-none focus:border-amber-500 transition"
            />
            <button
              type="submit"
              className="px-3.5 py-1.5 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold rounded-md text-sm transition"
            >
              Add
            </button>
          </form>

          {/* Blocklist chips display */}
          {settings.blocklist.length > 0 ? (
            <div className="flex flex-wrap gap-1.5 max-h-[140px] overflow-y-auto p-2 rounded-md bg-slate-950/60 border border-slate-900">
              {settings.blocklist.map((keyword, index) => (
                <span
                  key={`${keyword}-${index}`}
                  className="flex items-center gap-1.5 px-2.5 py-0.5 text-xs bg-slate-800 text-slate-200 border border-slate-700 rounded-full font-medium"
                >
                  {keyword}
                  <button
                    type="button"
                    onClick={() => handleRemoveKeyword(index)}
                    className="text-slate-400 hover:text-red-400 transition"
                  >
                    ✕
                  </button>
                </span>
              ))}
            </div>
          ) : (
            <p className="text-xs text-slate-500 italic">Blocklist is empty. Add apps/sites above to get started.</p>
          )}

          {/* Configuration Sliders */}
          <div className="space-y-4 pt-2 border-t border-slate-800/60">
            <RangeSetting
              label="Active window polling interval"
              value={settings.focusCheckInterval}
              min={3}
              max={15}
              suffix="sec"
              onChange={updateNumber('focusCheckInterval')}
            />
            <RangeSetting
              label="Distraction alert delay"
              value={settings.distractionAlertDelay}
              min={5}
              max={60}
              suffix="sec"
              onChange={updateNumber('distractionAlertDelay')}
            />
            <RangeSetting
              label="Distraction cooldown"
              value={settings.distractionCooldown}
              min={30}
              max={300}
              suffix="sec"
              onChange={updateNumber('distractionCooldown')}
            />
          </div>
        </div>
      )}
    </div>
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

/** Renders a labeled numeric slider control for Focus Guard settings. */
function RangeSetting(props: RangeSettingProps): JSX.Element {
  const { label, value, min, max, suffix, onChange } = props;
  return (
    <label className="block text-sm text-slate-300">
      <span className="flex justify-between">
        <span>{label}</span>
        <span className="font-semibold text-amber-400">
          {value} {suffix}
        </span>
      </span>
      <input
        className="mt-2 w-full accent-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-400/40"
        type="range"
        min={min}
        max={max}
        value={value}
        onChange={onChange}
      />
    </label>
  );
}
