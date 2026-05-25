import { useEffect, useRef, useState } from 'react';

/** Acquire the user's webcam stream and bind it to a video element. */
export function useWebcam({ width = 640, height = 480 } = {}) {
  const videoRef = useRef(null);
  const [stream, setStream] = useState(null);
  const [error, setError] = useState(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    let localStream = null;

    async function start() {
      try {
        localStream = await navigator.mediaDevices.getUserMedia({
          video: { width, height, facingMode: 'user' },
          audio: false,
        });
        if (cancelled) {
          localStream.getTracks().forEach((t) => t.stop());
          return;
        }
        setStream(localStream);
        if (videoRef.current) {
          videoRef.current.srcObject = localStream;
          await videoRef.current.play();
          setReady(true);
        }
      } catch (e) {
        setError(e);
      }
    }
    start();
    return () => {
      cancelled = true;
      localStream?.getTracks().forEach((t) => t.stop());
    };
  }, [width, height]);

  return { videoRef, stream, ready, error };
}
