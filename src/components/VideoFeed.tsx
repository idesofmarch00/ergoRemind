import { RefObject, useEffect, useRef } from 'react';
import type { PostureLandmark } from '@/types';
import { POSE_CONNECTIONS, LANDMARKS } from '@/utils/landmarkUtils';

interface VideoFeedProps {
  videoRef: RefObject<HTMLVideoElement>;
  landmarks: PostureLandmark[] | null;
  isGoodPosture: boolean;
  isMonitoring: boolean;
  error: string | null;
}

/**
 * Draws the posture skeleton overlay on the canvas.
 * Draws lines between connected landmarks (green = good posture, red = bad).
 * Draws dots at each landmark position (shoulder dots are larger for emphasis).
 * Mirrors the approach used by ergoSmart's drawConnectors + drawLandmarks.
 */
function drawSkeleton(canvas: HTMLCanvasElement, landmarks: PostureLandmark[] | null, isGoodPosture: boolean): void {
  const context = canvas.getContext('2d');
  if (!context) {
    return;
  }

  context.clearRect(0, 0, canvas.width, canvas.height);
  if (!landmarks || landmarks.length === 0) {
    return;
  }

  const goodColor = '#22c55e';
  const badColor = '#ef4444';
  const skeletonColor = isGoodPosture ? goodColor : badColor;

  // Draw connection lines between landmark pairs
  context.lineWidth = 3;
  context.strokeStyle = skeletonColor;
  context.shadowColor = skeletonColor;
  context.shadowBlur = 6;

  POSE_CONNECTIONS.forEach(([start, end]) => {
    const a = landmarks[start];
    const b = landmarks[end];
    if (!a || !b) {
      return;
    }
    // Lower visibility threshold to 0.3 so more landmarks show up (was 0.5)
    if (a.visibility < 0.3 || b.visibility < 0.3) {
      return;
    }
    context.globalAlpha = Math.min(a.visibility, b.visibility);
    context.beginPath();
    context.moveTo(a.x * canvas.width, a.y * canvas.height);
    context.lineTo(b.x * canvas.width, b.y * canvas.height);
    context.stroke();
  });

  // Draw dots at each tracked landmark
  context.shadowBlur = 0;
  const keyLandmarkIndices: Set<number> = new Set([
    LANDMARKS.NOSE,
    LANDMARKS.LEFT_EAR,
    LANDMARKS.RIGHT_EAR,
    LANDMARKS.LEFT_SHOULDER,
    LANDMARKS.RIGHT_SHOULDER,
    LANDMARKS.LEFT_HIP,
    LANDMARKS.RIGHT_HIP,
  ]);

  landmarks.forEach((landmark, index) => {
    if (landmark.visibility < 0.3) {
      return;
    }
    // Only draw the landmarks we actually track for posture
    if (!keyLandmarkIndices.has(index)) {
      return;
    }

    context.globalAlpha = landmark.visibility;
    context.fillStyle = skeletonColor;
    // Shoulders and nose get larger dots for emphasis
    const radius = (index === LANDMARKS.LEFT_SHOULDER || index === LANDMARKS.RIGHT_SHOULDER || index === LANDMARKS.NOSE) ? 7 : 5;
    context.beginPath();
    context.arc(landmark.x * canvas.width, landmark.y * canvas.height, radius, 0, Math.PI * 2);
    context.fill();

    // White border for visibility against any background
    context.strokeStyle = 'rgba(255,255,255,0.7)';
    context.lineWidth = 1.5;
    context.stroke();
  });

  context.globalAlpha = 1;
}

/** Shows the live webcam stream and posture skeleton overlay. */
export function VideoFeed(props: VideoFeedProps): JSX.Element {
  const { videoRef, landmarks, isGoodPosture, isMonitoring, error } = props;
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    let animationFrame = 0;

    /** Keeps the canvas dimensions and overlay synchronized to the video element. */
    function renderOverlay(): void {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      if (video && canvas && video.videoWidth > 0 && video.videoHeight > 0) {
        // Match canvas internal resolution to video resolution
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        drawSkeleton(canvas, landmarks, isGoodPosture);
      }
      animationFrame = requestAnimationFrame(renderOverlay);
    }

    renderOverlay();
    return () => {
      cancelAnimationFrame(animationFrame);
    };
  }, [isGoodPosture, landmarks, videoRef]);

  return (
    <section className="relative overflow-hidden rounded-lg border border-slate-700 bg-slate-950">
      <video ref={videoRef} className="aspect-video w-full bg-slate-950 object-cover" muted playsInline />
      <canvas ref={canvasRef} className="pointer-events-none absolute inset-0 h-full w-full object-cover" />
      {isMonitoring && (
        <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(90deg,rgba(100,116,139,0.14)_1px,transparent_1px),linear-gradient(0deg,rgba(100,116,139,0.14)_1px,transparent_1px)] bg-[size:48px_48px]" />
      )}
      {!isMonitoring && (
        <div className="absolute inset-0 grid place-items-center bg-slate-950/85 text-sm font-medium text-slate-300">
          Monitoring paused
        </div>
      )}
      {error && (
        <div className="absolute bottom-4 left-4 right-4 rounded-md border border-red-400/40 bg-red-950/90 px-4 py-3 text-sm text-red-100">
          {error}
        </div>
      )}
    </section>
  );
}
