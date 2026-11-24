import { requireOptionalNativeModule } from 'expo-modules-core';

export interface AthanAlarmInput {
  prayer: string;
  hour: number;
  minute: number;
  /** res/raw resource name (no extension), or null for a silent reminder. */
  sound: string | null;
  label: string;
}

interface AthanAlarmsNativeModule {
  scheduleAll(alarms: AthanAlarmInput[]): Promise<number>;
  cancelAll(): Promise<void>;
  playNow(sound: string, label: string): Promise<void>;
  playIn(seconds: number, sound: string, label: string): Promise<void>;
  stop(): Promise<void>;
  canScheduleExactAlarms(): boolean;
}

const native = requireOptionalNativeModule<AthanAlarmsNativeModule>('AthanAlarms');

export const isAthanAlarmsAvailable = native != null;

export const canScheduleExactAthanAlarms = (): boolean =>
  native?.canScheduleExactAlarms() ?? false;

export const scheduleAthanAlarms = async (alarms: AthanAlarmInput[]): Promise<number> =>
  native ? native.scheduleAll(alarms) : 0;

export const cancelAthanAlarms = async (): Promise<void> => {
  await native?.cancelAll();
};

export const playAthanNow = async (sound: string, label: string): Promise<void> => {
  await native?.playNow(sound, label);
};

export const playAthanIn = async (seconds: number, sound: string, label: string): Promise<void> => {
  await native?.playIn(seconds, sound, label);
};

export const stopAthan = async (): Promise<void> => {
  await native?.stop();
};
