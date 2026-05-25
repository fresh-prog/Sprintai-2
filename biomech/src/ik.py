"""OpenSim Inverse-Kinematics runner.

This is the thin wrapper that turns a list of pose frames into a per-joint
angle time series. If `opensim` is importable we run the real
InverseKinematicsTool against the bundled `gait2354_simbody.osim` model;
otherwise we fall back to the pure-Python `geometry.frame_angles` so the
pipeline still produces sensible output.

The fallback is what lets us ship and test the rest of the stack without a
1 GB native dependency — see SECURITY.md for the supply-chain reasoning.
"""
from __future__ import annotations

import importlib.util
import os
import tempfile
from pathlib import Path
from typing import Any

import numpy as np

from .geometry import frame_angles
from .trc import write_trc

_OPENSIM_AVAILABLE = importlib.util.find_spec("opensim") is not None
_DEFAULT_MODEL = Path(os.getenv(
    "OPENSIM_MODEL_PATH",
    str(Path(__file__).resolve().parent.parent / "models" / "gait2354_simbody.osim"),
))


def run_ik(frames: list[dict], *, rate_hz: float = 30.0) -> dict[str, Any]:
    """Return a dict shaped like:
        { "method": "opensim" | "fallback",
          "angles": [ { tsMs, left_knee, right_knee, ... }, ... ] }
    """
    if not frames:
        return {"method": "noop", "angles": []}

    if _OPENSIM_AVAILABLE and _DEFAULT_MODEL.exists():
        try:
            return _run_opensim(frames, rate_hz)
        except Exception:  # noqa: BLE001 — fall back silently rather than fail the job
            pass

    return _run_fallback(frames)


def _run_fallback(frames: list[dict]) -> dict[str, Any]:
    angles_series = []
    for f in frames:
        kp = np.zeros((33, 4), dtype=np.float32)
        for p in f["keypoints"]:
            kp[p["i"]] = (p["x"], p["y"], p.get("z", 0.0), p.get("vis", 1.0))
        angles_series.append({"tsMs": f["tsMs"], **frame_angles(kp)})
    return {"method": "fallback", "angles": angles_series}


def _run_opensim(frames: list[dict], rate_hz: float) -> dict[str, Any]:
    import opensim as osim  # noqa: WPS433 — guarded import

    with tempfile.TemporaryDirectory() as tmp:
        tmp_path = Path(tmp)
        trc = write_trc(frames, out_path=tmp_path / "markers.trc", rate_hz=rate_hz)

        model = osim.Model(str(_DEFAULT_MODEL))
        state = model.initSystem()

        ik = osim.InverseKinematicsTool()
        ik.setModel(model)
        ik.setMarkerDataFileName(str(trc))
        ik.setOutputMotionFileName(str(tmp_path / "ik.mot"))
        ik.setStartTime(0.0)
        ik.setEndTime((frames[-1]["tsMs"] - frames[0]["tsMs"]) / 1000.0)
        ik.run()

        # Parse .mot → joint-angle series. We expose the joints we already
        # compute in the fallback so the downstream contract is unchanged.
        mot = osim.Storage(str(tmp_path / "ik.mot"))
        labels = [mot.getColumnLabels().get(i) for i in range(mot.getColumnLabels().getSize())]
        series = []
        for r in range(mot.getSize()):
            row_t = mot.getStateVector(r).getTime()
            data = mot.getStateVector(r).getData()
            d = {labels[i + 1]: data.get(i) for i in range(data.getSize())}
            series.append({
                "tsMs": int(row_t * 1000 + frames[0]["tsMs"]),
                "left_knee":  d.get("knee_angle_l",  0.0),
                "right_knee": d.get("knee_angle_r",  0.0),
                "left_hip":   d.get("hip_flexion_l", 0.0),
                "right_hip":  d.get("hip_flexion_r", 0.0),
            })
        # state intentionally unused, kept for symmetry with OpenSim examples
        _ = state
        return {"method": "opensim", "angles": series}
