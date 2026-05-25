// Pure geometry helpers shared between the live pipeline and the persisted
// post-session pass. Keep this file dependency-free so it can be unit-tested
// without spinning up Express or Prisma.

const sub = (a, b) => ({ x: a.x - b.x, y: a.y - b.y, z: (a.z ?? 0) - (b.z ?? 0) });
const dot = (a, b) => a.x * b.x + a.y * b.y + a.z * b.z;
const mag = (v) => Math.sqrt(v.x * v.x + v.y * v.y + v.z * v.z);

/**
 * Angle at vertex `b` formed by a–b–c. Returns degrees in [0, 180].
 * Inputs are 3D points; pass z=0 for 2D.
 */
export function angle3(a, b, c) {
  const ba = sub(a, b);
  const bc = sub(c, b);
  const denom = mag(ba) * mag(bc);
  if (denom === 0) return 0;
  const cos = Math.min(1, Math.max(-1, dot(ba, bc) / denom));
  return (Math.acos(cos) * 180) / Math.PI;
}

// MediaPipe Pose landmark indices (subset we care about).
export const LM = {
  NOSE: 0,
  LEFT_SHOULDER: 11, RIGHT_SHOULDER: 12,
  LEFT_ELBOW: 13,    RIGHT_ELBOW: 14,
  LEFT_WRIST: 15,    RIGHT_WRIST: 16,
  LEFT_HIP: 23,      RIGHT_HIP: 24,
  LEFT_KNEE: 25,     RIGHT_KNEE: 26,
  LEFT_ANKLE: 27,    RIGHT_ANKLE: 28,
};

/** Compute the common joint angles for one frame of 33 keypoints. */
export function jointAngles(kp) {
  const get = (i) => kp[i];
  return {
    left_elbow:    angle3(get(LM.LEFT_SHOULDER),  get(LM.LEFT_ELBOW),    get(LM.LEFT_WRIST)),
    right_elbow:   angle3(get(LM.RIGHT_SHOULDER), get(LM.RIGHT_ELBOW),   get(LM.RIGHT_WRIST)),
    left_shoulder: angle3(get(LM.LEFT_ELBOW),     get(LM.LEFT_SHOULDER), get(LM.LEFT_HIP)),
    right_shoulder:angle3(get(LM.RIGHT_ELBOW),    get(LM.RIGHT_SHOULDER),get(LM.RIGHT_HIP)),
    left_hip:      angle3(get(LM.LEFT_SHOULDER),  get(LM.LEFT_HIP),      get(LM.LEFT_KNEE)),
    right_hip:     angle3(get(LM.RIGHT_SHOULDER), get(LM.RIGHT_HIP),     get(LM.RIGHT_KNEE)),
    left_knee:     angle3(get(LM.LEFT_HIP),       get(LM.LEFT_KNEE),     get(LM.LEFT_ANKLE)),
    right_knee:    angle3(get(LM.RIGHT_HIP),      get(LM.RIGHT_KNEE),    get(LM.RIGHT_ANKLE)),
  };
}

/**
 * Robinson symmetry index: 0 = perfectly symmetric, → 100 as asymmetry grows.
 * SI = |L − R| / (0.5 · (L + R)) · 100
 */
export function symmetryIndex(left, right) {
  const denom = 0.5 * (Math.abs(left) + Math.abs(right));
  if (denom === 0) return 0;
  return (Math.abs(left - right) / denom) * 100;
}
