import { useEffect, useRef, useState } from 'react';
import { FilesetResolver, PoseLandmarker } from '@mediapipe/tasks-vision';

const E2E_MOCK = import.meta.env.VITE_E2E_MOCK_POSE === '1';

/**
 * Initialize a MediaPipe Pose detector once and expose a `detect` callable.
 * Detector runs in VIDEO mode for streaming use. When the
 * VITE_E2E_MOCK_POSE flag is set, we skip the real WASM model load and
 * return a deterministic landmark array — used by the Playwright capture
 * spec so it doesn't need a real camera or GPU.
 */
export function usePoseDetector() {
  const detectorRef = useRef(null);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    if (E2E_MOCK) {
      // Deterministic 33-landmark fixture, slightly perturbed each call so
      // the buffer flush logic still has something to do.
      detectorRef.current = {
        detectForVideo: () => ({
          landmarks: [Array.from({ length: 33 }, (_, i) => ({
            x: 0.5 + Math.sin(performance.now() / 1000 + i) * 0.01,
            y: 0.5 + Math.cos(performance.now() / 1000 + i) * 0.01,
            z: 0,
            visibility: 1,
          }))],
        }),
        close: () => {},
      };
      setReady(true);
      return () => { cancelled = true; };
    }
    async function init() {
      try {
        const fileset = await FilesetResolver.forVisionTasks(
          'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision/wasm',
        );
        const detector = await PoseLandmarker.createFromOptions(fileset, {
          baseOptions: {
            modelAssetPath:
              'https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/latest/pose_landmarker_lite.task',
            delegate: 'GPU',
          },
          runningMode: 'VIDEO',
          numPoses: 1,
        });
        if (cancelled) {
          detector.close();
          return;
        }
        detectorRef.current = detector;
        setReady(true);
      } catch (e) {
        setError(e);
      }
    }
    init();
    return () => {
      cancelled = true;
      detectorRef.current?.close();
      detectorRef.current = null;
    };
  }, []);

  function detect(videoEl, tsMs) {
    if (!detectorRef.current || !videoEl) return null;
    return detectorRef.current.detectForVideo(videoEl, tsMs);
  }

  return { ready, error, detect };
}
