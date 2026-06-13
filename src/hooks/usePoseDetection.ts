import { RefObject, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { PostureLandmark } from '@/types';
import { PoseLandmarker, FilesetResolver } from '@mediapipe/tasks-vision';

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

/**
 * Handles webcam stream setup and MediaPipe pose detection on the main thread.
 *
 * We intentionally run inference on the main thread (not a Web Worker) because
 * MediaPipe's WASM runtime uses `importScripts()` internally, which is
 * incompatible with ESM Web Workers (`{ type: 'module' }`). Running it here
 * matches the approach used by ergoSmart and PostureCorrectionAlarm-TFJs.
 * Performance is kept smooth by only processing every 3rd frame.
 */
export function usePoseDetection(options: UsePoseDetectionOptions): UsePoseDetectionResult {
  const { videoRef, selectedCamera, isMonitoring } = options;
  const [landmarks, setLandmarks] = useState<PostureLandmark[] | null>(null);
  const [isCameraReady, setIsCameraReady] = useState(false);
  const [isModelReady, setIsModelReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cameras, setCameras] = useState<MediaDeviceInfo[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const landmarkerRef = useRef<PoseLandmarker | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const frameCounterRef = useRef(0);
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
      const constraints: MediaStreamConstraints = {
        // Low resolution to conserve CPU/energy — MediaPipe only needs landmark
        // positions, not pixel quality. 320x240 is plenty for pose detection.
        video: selectedCamera === 'default'
          ? { width: { ideal: 320 }, height: { ideal: 240 }, frameRate: { ideal: 15 } }
          : { deviceId: { exact: selectedCamera }, width: { ideal: 320 }, height: { ideal: 240 }, frameRate: { ideal: 15 } },
        audio: false,
      };
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;
      const video = videoRef.current;
      if (video) {
        video.srcObject = stream;
        try {
          await video.play();
        } catch (playError) {
          // AbortError is expected when React re-mounts rapidly; ignore it.
          if (playError instanceof DOMException && playError.name === 'AbortError') {
            console.log('Video play interrupted, ignoring.');
          } else {
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
  }, []);

  /**
   * Initializes the MediaPipe PoseLandmarker on the main thread.
   * This avoids the "ModuleFactory not set" error that occurs when
   * MediaPipe's importScripts() is called inside an ESM Web Worker.
   */
  useEffect(() => {
    let cancelled = false;

    async function initModel(): Promise<void> {
      try {
        const isPackaged = !window.location.href.startsWith('http');
        
        let wasmPath: string;
        let modelPath: string;
        
        if (isPackaged) {
          wasmPath = 'app://mediapipe/wasm';
          modelPath = 'app://models/pose_landmarker_lite.task';
        } else {
          wasmPath = window.location.origin + '/mediapipe/wasm';
          modelPath = import.meta.env.VITE_MODEL_PATH ?? '/models/pose_landmarker_lite.task';
        }

        const filesetResolver = await FilesetResolver.forVisionTasks(wasmPath);
        if (cancelled) return;

        const landmarker = await PoseLandmarker.createFromOptions(filesetResolver, {
          baseOptions: {
            modelAssetPath: modelPath,
            delegate: 'CPU',
          },
          runningMode: 'VIDEO',
          numPoses: 1,
        });
        if (cancelled) return;

        landmarkerRef.current = landmarker;
        setIsModelReady(true);
        console.log('MediaPipe PoseLandmarker ready (main thread).');
      } catch (initError) {
        if (!cancelled) {
          setError(initError instanceof Error ? initError.message : 'Unable to load MediaPipe pose model.');
        }
      }
    }

    void initModel();

    return () => {
      cancelled = true;
      landmarkerRef.current?.close();
      landmarkerRef.current = null;
      setIsModelReady(false);
    };
  }, []);

  /**
   * Starts the detection loop. Runs pose detection every 3rd frame to keep
   * CPU usage low while maintaining responsive feedback.
   */
  const runLoop = useCallback((): void => {
    const tick = (): void => {
      const video = videoRef.current;
      frameCounterRef.current += 1;

      if (
        isMonitoring &&
        isModelReady &&
        landmarkerRef.current &&
        video &&
        video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA &&
        video.videoWidth > 0 &&
        video.videoHeight > 0 &&
        frameCounterRef.current % 3 === 0
      ) {
        // MediaPipe requires strictly increasing timestamps.
        const now = performance.now();
        if (now <= lastTimestampRef.current) {
          animationFrameRef.current = requestAnimationFrame(tick);
          return;
        }
        lastTimestampRef.current = now;

        try {
          const result = landmarkerRef.current.detectForVideo(video, now);
          const firstPose = result.landmarks[0];
          if (!firstPose) {
            setLandmarks(null);
          } else {
            const normalized: PostureLandmark[] = firstPose.map((lm) => {
              // NormalizedLandmark.visibility may be undefined in Tasks Vision API.
              // Cast through unknown to safely check the property.
              const raw = lm as unknown as { x: number; y: number; z: number; visibility?: number };
              return {
                x: raw.x,
                y: raw.y,
                z: raw.z,
                visibility: raw.visibility ?? 1.0,
              };
            });
            setLandmarks(normalized);
          }
        } catch (detectionError) {
          // Don't crash the loop on individual frame errors
          console.warn('Pose detection frame error:', detectionError);
        }
      }

      animationFrameRef.current = requestAnimationFrame(tick);
    };

    tick();
  }, [isModelReady, isMonitoring, videoRef]);

  /** Start/stop camera when monitoring state changes. */
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

  /** Start/stop the detection loop when camera and model are ready. */
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
