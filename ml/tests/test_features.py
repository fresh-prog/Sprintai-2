import numpy as np
from src.utils.features import feature_vector, joint_angles, normalize


def _fake_landmarks():
    # Simple T-pose: hips at origin, shoulders above, arms outstretched, legs down.
    lm = np.zeros((33, 4), dtype=np.float32)
    lm[:, 3] = 1.0  # visibility
    lm[23] = (-0.1, 0.5, 0.0, 1.0)  # L hip
    lm[24] = ( 0.1, 0.5, 0.0, 1.0)  # R hip
    lm[11] = (-0.15, 0.2, 0.0, 1.0) # L shoulder
    lm[12] = ( 0.15, 0.2, 0.0, 1.0) # R shoulder
    lm[13] = (-0.4, 0.2, 0.0, 1.0)  # L elbow
    lm[15] = (-0.65, 0.2, 0.0, 1.0) # L wrist
    lm[14] = ( 0.4, 0.2, 0.0, 1.0)
    lm[16] = ( 0.65, 0.2, 0.0, 1.0)
    lm[25] = (-0.1, 0.85, 0.0, 1.0) # L knee
    lm[27] = (-0.1, 1.0, 0.0, 1.0)  # L ankle
    lm[26] = ( 0.1, 0.85, 0.0, 1.0)
    lm[28] = ( 0.1, 1.0, 0.0, 1.0)
    return lm


def test_feature_vector_length():
    fv = feature_vector(_fake_landmarks().flatten().tolist())
    assert fv.shape == (107,)


def test_joint_angles_left_arm_extended_is_straight():
    angles = joint_angles(_fake_landmarks())
    assert 170 <= angles["left_elbow"] <= 180


def test_normalize_centers_on_hips():
    out = normalize(_fake_landmarks())
    hip_mid = (out[23, :3] + out[24, :3]) / 2
    assert np.allclose(hip_mid, [0, 0, 0], atol=1e-6)
