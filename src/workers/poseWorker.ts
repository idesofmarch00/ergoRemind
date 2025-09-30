import { FilesetResolver, PoseLandmarker } from '@mediapipe/tasks-vision';
import type { PostureLandmark, WorkerInMessage, WorkerOutMessage } from '@/types';

let poseLandmarker: PoseLandmarker | null = null;

/** Posts a typed message from the worker back to the renderer. */
function postWorkerMessage(message: WorkerOutMessage): void {
  self.postMessage(message);
}

/** Initializes MediaPipe Pose Landmarker in the worker thread. */
async function initializePoseLandmarker(modelPath: string, wasmPath: string): Promise<void> {
  const filesetResolver = await FilesetResolver.forVisionTasks(wasmPath);
  poseLandmarker = await PoseLandmarker.createFromOptions(filesetResolver, {
    baseOptions: {
      modelAssetPath: modelPath,
      delegate: 'CPU',
    },
    runningMode: 'VIDEO',
    numPoses: 1,
  });
}

/** Converts MediaPipe result landmarks into app-level landmarks. */
function toPostureLandmarks(landmarks: Array<{ x: number; y: number; z: number; visibility?: number }>): PostureLandmark[] {
  return landmarks.map((landmark) => ({
    x: landmark.x,
    y: landmark.y,
    z: landmark.z,
    visibility: landmark.visibility ?? 0,
  }));
}

/** Runs pose detection for a single frame bitmap. */
function processFrame(imageBitmap: ImageBitmap, timestamp: number): void {
  if (!poseLandmarker) {
    postWorkerMessage({ type: 'PROCESS_ERROR', error: 'Pose detector is not ready.' });
    imageBitmap.close();
    return;
  }

  try {
    const result = poseLandmarker.detectForVideo(imageBitmap, timestamp);
    imageBitmap.close();
    const firstPose = result.landmarks[0];
    if (!firstPose) {
      postWorkerMessage({ type: 'NO_PERSON_DETECTED', timestamp });
      return;
    }
    postWorkerMessage({ type: 'LANDMARKS', landmarks: toPostureLandmarks(firstPose), timestamp });
  } catch (error) {
    imageBitmap.close();
    postWorkerMessage({
      type: 'PROCESS_ERROR',
      error: error instanceof Error ? error.message : 'Failed to process video frame.',
    });
  }
}

/** Handles renderer-to-worker messages for initialization and inference. */
async function handleMessage(message: WorkerInMessage): Promise<void> {
  if (message.type === 'INIT') {
    try {
      await initializePoseLandmarker(message.modelPath, message.wasmPath);
      postWorkerMessage({ type: 'READY' });
    } catch (error) {
      postWorkerMessage({
        type: 'INIT_ERROR',
        error: error instanceof Error ? error.message : 'Unable to load MediaPipe pose model.',
      });
    }
    return;
  }

  if (message.type === 'PROCESS_FRAME') {
    processFrame(message.imageBitmap, message.timestamp);
    return;
  }

  poseLandmarker?.close();
  poseLandmarker = null;
}

self.addEventListener('message', (event: MessageEvent<WorkerInMessage>) => {
  void handleMessage(event.data);
});
