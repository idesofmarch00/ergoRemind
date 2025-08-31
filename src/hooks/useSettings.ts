import { useCallback, useEffect, useMemo, useState } from 'react';
import type { AppSettings } from '@/types';

interface UseSettingsResult {
  settings: AppSettings | null;
  isLoading: boolean;
  error: string | null;
  updateSettings: (update: Partial<AppSettings>) => Promise<void>;
  reloadSettings: () => Promise<void>;
}

/** Loads and persists app settings through the secure preload IPC API. */
export function useSettings(): UseSettingsResult {
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reloadSettings = useCallback(async (): Promise<void> => {
    try {
      setIsLoading(true);
      setError(null);
      setSettings(await window.ergoremind.getSettings());
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Unable to load settings.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const updateSettings = useCallback(async (update: Partial<AppSettings>): Promise<void> => {
    try {
      setError(null);
      const nextSettings = await window.ergoremind.saveSettings(update);
      setSettings(nextSettings);
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Unable to save settings.');
    }
  }, []);

  useEffect(() => {
    void reloadSettings();
    return () => {
      setError(null);
    };
  }, [reloadSettings]);

  return useMemo(
    () => ({ settings, isLoading, error, updateSettings, reloadSettings }),
    [settings, isLoading, error, updateSettings, reloadSettings],
  );
}
