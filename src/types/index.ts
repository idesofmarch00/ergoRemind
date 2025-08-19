export type NotificationType = 'posture' | 'standup' | 'eye';

export type TrayStatus = 'good' | 'bad' | 'paused';

export type AlertState = 'IDLE' | 'MONITORING' | 'BAD_POSTURE' | 'ALERTING' | 'COOLDOWN';

export interface PostureLandmark {
  x: number;
  y: number;
  z: number;
  visibility: number;
}

export interface PostureFrame {
  score: number;
  isGood: boolean;
  headForward: number;
  slouch: number;
  tilt: number;
  timestamp: number;
}

export interface PostureSession {
  startTime: number;
  totalFrames: number;
  goodFrames: number;
  badFrames: number;
  goodPercent: number;
  durationMs: number;
}

export interface CalibrationData {
  noseY: number;
  earMidY: number;
  shoulderMidY: number;
  headForwardRatio: number;
  capturedAt: number;
}

export interface AppSettings {
  slouchThreshold: number;
  alertDelay: number;
  alertCooldown: number;
  standUpInterval: number;
  eyeRuleInterval: number;
  soundEnabled: boolean;
  selectedCamera: string;
  startMinimized: boolean;
  calibration: CalibrationData | null;
}

export interface DailyStats {
  date: string;
  sessions: PostureSession[];
  totalGoodMs: number;
  totalBadMs: number;
}

export interface NotificationPayload {
  title: string;
  body: string;
  type: NotificationType;
}

export interface ergoremindAPI {
  getSettings: () => Promise<AppSettings>;
  saveSettings: (settings: Partial<AppSettings>) => Promise<AppSettings>;
  getStats: (date?: string) => Promise<DailyStats>;
  saveStats: (stats: DailyStats) => Promise<DailyStats>;
  saveSession: (session: PostureSession) => Promise<DailyStats>;
  sendNotification: (payload: NotificationPayload) => Promise<void>;
  startTimers: () => Promise<void>;
  stopTimers: () => Promise<void>;
  updateTrayStatus: (status: TrayStatus) => Promise<void>;
  onStandupReminder: (callback: () => void) => () => void;
  onEyeReminder: (callback: () => void) => () => void;
  onPauseMonitoring: (callback: () => void) => () => void;
  onResumeMonitoring: (callback: () => void) => () => void;
}

export interface WorkerInitMessage {
  type: 'INIT';
  modelPath: string;
  wasmPath: string;
}

export interface WorkerProcessFrameMessage {
  type: 'PROCESS_FRAME';
  imageBitmap: ImageBitmap;
  timestamp: number;
}

export interface WorkerDestroyMessage {
  type: 'DESTROY';
}

export type WorkerInMessage = WorkerInitMessage | WorkerProcessFrameMessage | WorkerDestroyMessage;

export interface WorkerReadyMessage {
  type: 'READY';
}

export interface WorkerInitErrorMessage {
  type: 'INIT_ERROR';
  error: string;
}

export interface WorkerLandmarksMessage {
  type: 'LANDMARKS';
  landmarks: PostureLandmark[];
  timestamp: number;
}

export interface WorkerNoPersonMessage {
  type: 'NO_PERSON_DETECTED';
  timestamp: number;
}

export interface WorkerProcessErrorMessage {
  type: 'PROCESS_ERROR';
  error: string;
}

export type WorkerOutMessage =
  | WorkerReadyMessage
  | WorkerInitErrorMessage
  | WorkerLandmarksMessage
  | WorkerNoPersonMessage
  | WorkerProcessErrorMessage;

declare global {
  interface Window {
    ergoremind: ergoremindAPI;
  }
}
