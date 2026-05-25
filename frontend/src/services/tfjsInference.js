// Offline-mode posture inference. Loads a TF.js-converted posture model from
// /models/posture/model.json if one has been published; otherwise stays in a
// "no local model" state and returns null so callers can decide what to do.
//
// To publish a model:
//   1. Train the Keras model under ml/ (see ml/src/training/train_posture.py).
//   2. `tensorflowjs_converter --input_format keras checkpoints/posture/model.keras \
//        ../frontend/public/models/posture`
//   3. Reload — the next call to `posturePredictor.ready()` will succeed.

import { POSTURE_CLASSES, featureVector } from '../utils/features.js';

let modelPromise = null;
let model = null;

async function load() {
  // Lazy-import tfjs so the offline mode doesn't pull a ~600 kB bundle when
  // nobody asks for it.
  const tf = await import('@tensorflow/tfjs');
  try {
    const m = await tf.loadLayersModel('/models/posture/model.json');
    model = { tf, m };
    return model;
  } catch {
    model = null;
    return null;
  }
}

export const posturePredictor = {
  /** Resolve true once a TF.js model is available; false if none is shipped. */
  async ready() {
    modelPromise ||= load();
    return (await modelPromise) != null;
  },

  /** Return `{ label, confidence }` for one MediaPipe landmark frame, or null. */
  async predict(keypoints) {
    if (!await this.ready()) return null;
    const { tf, m } = model;
    const fv = featureVector(keypoints);
    const input = tf.tensor2d(fv, [1, fv.length]);
    try {
      const out = m.predict(input);
      const probs = await out.data();
      out.dispose();
      let bestIdx = 0;
      for (let i = 1; i < probs.length; i++) if (probs[i] > probs[bestIdx]) bestIdx = i;
      return {
        label: POSTURE_CLASSES[bestIdx] ?? `class_${bestIdx}`,
        confidence: probs[bestIdx],
        offline: true,
      };
    } finally {
      input.dispose();
    }
  },
};
