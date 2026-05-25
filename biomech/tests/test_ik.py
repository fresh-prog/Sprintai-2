from pathlib import Path

from src.ik import run_ik
from src.trc import MARKER_MAP, write_trc


def _make_frame(ts_ms: int, knee_y: float = 0.8) -> dict:
    kp = [{"i": i, "x": 0.5, "y": 0.5, "z": 0.0, "vis": 1.0} for i in range(33)]
    kp[25]["y"] = knee_y
    kp[26]["y"] = knee_y
    return {"frameIdx": ts_ms, "tsMs": ts_ms, "keypoints": kp}


def test_run_ik_fallback_returns_per_frame_angles():
    frames = [_make_frame(i * 33) for i in range(5)]
    out = run_ik(frames)
    assert out["method"] in ("opensim", "fallback")
    assert len(out["angles"]) == 5
    assert "left_knee" in out["angles"][0]
    assert "tsMs" in out["angles"][0]


def test_run_ik_empty():
    assert run_ik([]) == {"method": "noop", "angles": []}


def test_write_trc_produces_expected_header(tmp_path: Path):
    frames = [_make_frame(i * 33) for i in range(3)]
    out = write_trc(frames, out_path=tmp_path / "out.trc", rate_hz=30.0)
    text = out.read_text()

    # Header sanity: PathFileType, DataRate row, marker name row.
    lines = text.splitlines()
    assert lines[0].startswith("PathFileType")
    assert "DataRate" in lines[1]
    # First data line should be frame 1 at t=0.
    data_start = next(i for i, ln in enumerate(lines) if ln.startswith("1\t"))
    assert lines[data_start].split("\t")[0] == "1"
    # Has 3 axes per marker.
    parts = lines[data_start].split("\t")
    # 2 leading cols + 3 per marker
    assert len(parts) == 2 + 3 * len(MARKER_MAP)
