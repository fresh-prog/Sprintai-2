// Mirror of ml/src/utils/features.feature_vector — must stay in sync.
//
// Why duplicate the Python code instead of round-tripping through the
// backend? Latency. The offline-mode predictor runs in the browser, so we
// need the same 107-element feature vector without a network hop. Keep the
// constants and the order identical to the Python version, and the shipped
// TF.js model weights will keep matching.

const LM = {
  LEFT_SHOULDER: 11, RIGHT_SHOULDER: 12,
  LEFT_ELBOW: 13,    RIGHT_ELBOW: 14,
  LEFT_WRIST: 15,    RIGHT_WRIST: 16,
  LEFT_HIP: 23,      RIGHT_HIP: 24,
  LEFT_KNEE: 25,     RIGHT_KNEE: 26,
  LEFT_ANKLE: 27,    RIGHT_ANKLE: 28,
};

function angle(a, b, c) {
  const ba = [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
  const bc = [c[0] - b[0], c[1] - b[1], c[2] - b[2]];
  const magBa = Math.hypot(...ba);
  const magBc = Math.hypot(...bc);
  if (magBa === 0 || magBc === 0) return 0;
  const dot = ba[0] * bc[0] + ba[1] * bc[1] + ba[2] * bc[2];
  return Math.acos(Math.min(1, Math.max(-1, dot / (magBa * magBc)))) * (180 / Math.PI);
}

function normalize(landmarks) {
  // Center on hip midpoint; scale by shoulder width.
  const hipMid = [
    (landmarks[LM.LEFT_HIP][0] + landmarks[LM.RIGHT_HIP][0]) / 2,
    (landmarks[LM.LEFT_HIP][1] + landmarks[LM.RIGHT_HIP][1]) / 2,
    (landmarks[LM.LEFT_HIP][2] + landmarks[LM.RIGHT_HIP][2]) / 2,
  ];
  const ls = landmarks[LM.LEFT_SHOULDER];
  const rs = landmarks[LM.RIGHT_SHOULDER];
  const shW = Math.hypot(ls[0] - rs[0], ls[1] - rs[1], ls[2] - rs[2]) || 1;
  return landmarks.map((p) => [(p[0] - hipMid[0]) / shW, (p[1] - hipMid[1]) / shW, (p[2] - hipMid[2]) / shW]);
}

function jointAnglesFor(landmarks) {
  const p = landmarks;
  return [
    angle(p[LM.LEFT_SHOULDER],  p[LM.LEFT_ELBOW],    p[LM.LEFT_WRIST]),
    angle(p[LM.RIGHT_SHOULDER], p[LM.RIGHT_ELBOW],   p[LM.RIGHT_WRIST]),
    angle(p[LM.LEFT_ELBOW],     p[LM.LEFT_SHOULDER], p[LM.LEFT_HIP]),
    angle(p[LM.RIGHT_ELBOW],    p[LM.RIGHT_SHOULDER], p[LM.RIGHT_HIP]),
    angle(p[LM.LEFT_SHOULDER],  p[LM.LEFT_HIP],      p[LM.LEFT_KNEE]),
    angle(p[LM.RIGHT_SHOULDER], p[LM.RIGHT_HIP],     p[LM.RIGHT_KNEE]),
    angle(p[LM.LEFT_HIP],       p[LM.LEFT_KNEE],     p[LM.LEFT_ANKLE]),
    angle(p[LM.RIGHT_HIP],      p[LM.RIGHT_KNEE],    p[LM.RIGHT_ANKLE]),
  ];
}

/**
 * Build the 107-element feature vector from a MediaPipe landmark array.
 * @param {Array<{x:number,y:number,z?:number}>} keypoints - 33 landmarks
 * @returns {Float32Array} length 107
 */
export function featureVector(keypoints) {
  const xyz = keypoints.map((p) => [p.x, p.y, p.z ?? 0]);
  const normed = normalize(xyz);
  const flat = new Float32Array(107);
  let o = 0;
  for (const p of normed) { flat[o++] = p[0]; flat[o++] = p[1]; flat[o++] = p[2]; }
  const angles = jointAnglesFor(xyz);
  for (const a of angles) flat[o++] = a;
  return flat;
}

export const POSTURE_CLASSES = ['upright', 'hunched', 'leaning_left', 'leaning_right', 'slouched'];
