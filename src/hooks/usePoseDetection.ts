import { RefObject, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { PostureLandmark, WorkerInMessage, WorkerOutMessage } from '@/types';

interface UsePoseDetectionOptions {
  videoRef: RefObject<HTMLVideoElement>;
  selectedCamera: string;
  isMonitoring: boolean;
}

interface UsePoseDetectionResult {
  landmarks: PostureLandmark[] | null;
  isCameraReady: boolean;
  isModelReady: boolean;
  error: string | null;
  cameras: MediaDeviceInfo[];
  refreshCameras: () => Promise<void>;
}

/** Handles webcam setup and delegates all MediaPipe inference to a Web Worker. */
export function usePoseDetection(options: UsePoseDetectionOptions): UsePoseDetectionResult {
  const { videoRef, selectedCamera, isMonitoring } = options;
  const [landmarks, setLandmarks] = useState<PostureLandmark[] | null>(null);
  const [isCameraReady, setIsCameraReady] = useState(false);
  const [isModelReady, setIsModelReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cameras, setCameras] = useState<MediaDeviceInfo[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const workerRef = useRef<Worker | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const frameCounterRef = useRef(0);
  const frameInFlightRef = useRef(false);
  const lastTimestampRef = useRef(-1);

  /** Enumerates available video input devices. */
  const refreshCameras = useCallback(async (): Promise<void> => {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      setCameras(devices.filter((device) => device.kind === 'videoinput'));
    } catch (cameraError) {
      setError(cameraError instanceof Error ? cameraError.message : 'Unable to list cameras.');
    }
  }, []);

  /** Stops the active webcam stream and clears the video element. */
  const stopStream = useCallback((): void => {
    streamRef.current?.getTracks().forEach((track) => {
      track.stop();
    });
    streamRef.current = null;
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setIsCameraReady(false);
  }, [videoRef]);

  /** Opens the selected camera and attaches the stream to the video element. */
  const startCamera = useCallback(async (): Promise<void> => {
    try {
      stopStream();
      setError(null);
      const videoConstraints: MediaTrackConstraints = selectedCamera === 'default'
        ? { width: { ideal: 320 }, height: { ideal: 240 }, frameRate: { ideal: 15 } }
        : {
            deviceId: { exact: selectedCamera },
            width: { ideal: 320 },
            height: { ideal: 240 },
            frameRate: { ideal: 15 },
          };
      const stream = await navigator.mediaDevices.getUserMedia({ video: videoConstraints, audio: false });
      streamRef.current = stream;
      const video = videoRef.current;
      if (video) {
        video.srcObject = stream;
        try {
          await video.play();
        } catch (playError) {
          if (!(playError instanceof DOMException && playError.name === 'AbortError')) {
            throw playError;
          }
        }
      }
      setIsCameraReady(true);
      await refreshCameras();
    } catch (cameraError) {
      setError(cameraError instanceof Error ? cameraError.message : 'Unable to access the camera.');
      setIsCameraReady(false);
    }
  }, [refreshCameras, selectedCamera, stopStream, videoRef]);

  /** Cancels the running requestAnimationFrame loop. */
  const stopLoop = useCallback((): void => {
    if (animationFrameRef.current !== null) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    frameInFlightRef.current = false;
  }, []);

  /** Creates the pose worker and initializes its offline model and WASM assets. */
  useEffect(() => {
    const worker = new Worker(new URL('../workers/poseWorker.ts', import.meta.url), { type: 'module' });
    workerRef.current = worker;
    const baseUrl = window.location.href.startsWith('http') ? window.location.origin : 'app://local';
    const initMessage: WorkerInMessage = {
      type: 'INIT',
      wasmPath: `${baseUrl}/mediapipe/wasm`,
      modelPath: `${baseUrl}/models/pose_landmarker_lite.task`,
    };

    /** Applies typed pose-worker responses to renderer state. */
    const handleWorkerMessage = (event: MessageEvent<WorkerOutMessage>): void => {
      const message = event.data;
      if (message.type === 'READY') {
        setIsModelReady(true);
        return;
      }
      if (message.type === 'INIT_ERROR') {
        frameInFlightRef.current = false;
        setError(message.error);
        setIsModelReady(false);
        return;
      }
      if (message.type === 'LANDMARKS') {
        frameInFlightRef.current = false;
        setLandmarks(message.landmarks);
        return;
      }
      if (message.type === 'NO_PERSON_DETECTED') {
        frameInFlightRef.current = false;
        setLandmarks(null);
        return;
      }
      frameInFlightRef.current = false;
      setError(message.error);
    };

    /** Reports an unrecoverable worker runtime failure to the UI. */
    const handleWorkerError = (): void => {
      frameInFlightRef.current = false;
      setIsModelReady(false);
      setError('Pose detection worker stopped unexpectedly.');
    };

    worker.addEventListener('message', handleWorkerMessage);
    worker.addEventListener('error', handleWorkerError);
    worker.postMessage(initMessage);

    return () => {
      const destroyMessage: WorkerInMessage = { type: 'DESTROY' };
      worker.postMessage(destroyMessage);
      worker.removeEventListener('message', handleWorkerMessage);
      worker.removeEventListener('error', handleWorkerError);
      worker.terminate();
      workerRef.current = null;
      frameInFlightRef.current = false;
      setIsModelReady(false);
    };
  }, []);

  /** Starts a throttled capture loop that transfers frames to the pose worker. */
  const runLoop = useCallback((): void => {
    const tick = (): void => {
      const video = videoRef.current;
      frameCounterRef.current += 1;
      const canProcess = isMonitoring
        && isModelReady
        && !frameInFlightRef.current
        && workerRef.current
        && video
        && video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA
        && video.videoWidth > 0
        && video.videoHeight > 0
        && frameCounterRef.current % 3 === 0;

      if (canProcess && workerRef.current && video) {
        const timestamp = performance.now();
        if (timestamp > lastTimestampRef.current) {
          lastTimestampRef.current = timestamp;
          frameInFlightRef.current = true;
          void createImageBitmap(video)
            .then((imageBitmap) => {
              if (!workerRef.current || !isMonitoring) {
                imageBitmap.close();
                frameInFlightRef.current = false;
                return;
              }
              const message: WorkerInMessage = { type: 'PROCESS_FRAME', imageBitmap, timestamp };
              workerRef.current.postMessage(message, [imageBitmap]);
            })
            .catch((captureError: unknown) => {
              frameInFlightRef.current = false;
              setError(captureError instanceof Error ? captureError.message : 'Unable to capture a video frame.');
            });
        }
      }

      animationFrameRef.current = requestAnimationFrame(tick);
    };

    tick();
  }, [isModelReady, isMonitoring, videoRef]);

  /** Starts or stops the camera when monitoring state changes. */
  useEffect(() => {
    if (isMonitoring) {
      void startCamera();
    } else {
      stopStream();
      setLandmarks(null);
    }
    return () => {
      stopStream();
    };
  }, [isMonitoring, startCamera, stopStream]);

  /** Starts or stops frame capture when the camera and worker are ready. */
  useEffect(() => {
    if (isMonitoring && isCameraReady && isModelReady) {
      stopLoop();
      runLoop();
    }
    return () => {
      stopLoop();
    };
  }, [isCameraReady, isModelReady, isMonitoring, runLoop, stopLoop]);

  return useMemo(
    () => ({ landmarks, isCameraReady, isModelReady, error, cameras, refreshCameras }),
    [landmarks, isCameraReady, isModelReady, error, cameras, refreshCameras],
  );
}
