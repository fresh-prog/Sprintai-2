from src.data.synth_posture import generate as gen_posture
from src.data.synth_activity import generate as gen_activity
from src.models.posture import FEATURE_DIM, POSTURE_CLASSES
from src.models.activity import ACTIVITY_CLASSES, PER_FRAME_DIM, WINDOW_LEN


def test_posture_dataset_shape():
    df = gen_posture(n=128, seed=1)
    assert len(df) == 128
    feature_cols = [c for c in df.columns if c.startswith("f")]
    assert len(feature_cols) == FEATURE_DIM
    assert df["label"].min() >= 0
    assert df["label"].max() < len(POSTURE_CLASSES)


def test_activity_dataset_shape():
    X, y = gen_activity(n=32, seed=1)
    assert X.shape == (32, WINDOW_LEN, PER_FRAME_DIM)
    assert y.shape == (32,)
    assert y.min() >= 0
    assert y.max() < len(ACTIVITY_CLASSES)


def test_activity_classes_are_covered_at_scale():
    # With enough samples, every class should appear at least once.
    _, y = gen_activity(n=400, seed=2)
    assert set(y.tolist()) == set(range(len(ACTIVITY_CLASSES)))
