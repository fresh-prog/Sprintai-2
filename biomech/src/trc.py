"""TRC marker-file writer.

The .trc format is what OpenSim's InverseKinematicsTool expects: a fixed
14-line header followed by per-frame rows of X/Y/Z marker coordinates in
millimetres. We map a subset of MediaPipe's 33 landmarks onto the marker
names that the `gait2354` musculoskeletal model uses out of the box.

Keeping this isolated from the OpenSim wrapper means we can unit-test the
file generation without needing the native bindings installed.
"""
from __future__ import annotations

from io import StringIO
from pathlib import Path
from typing import Iterable

# Map: TRC marker name → MediaPipe landmark index.
# Names match gait2354's MarkerSet.xml; coordinates are mirrored from the
# subject's frame (right-hand coord system, Y up).
MARKER_MAP: dict[str, int] = {
    "Sternum":   11,  # approximate from L shoulder
    "R.Shoulder": 12, "L.Shoulder": 11,
    "R.Elbow":    14, "L.Elbow":    13,
    "R.Wrist":    16, "L.Wrist":    15,
    "R.ASIS":     24, "L.ASIS":     23,
    "R.Knee":     26, "L.Knee":     25,
    "R.Ankle":    28, "L.Ankle":    27,
    "R.Heel":     30, "L.Heel":     29,
    "R.Toe":      32, "L.Toe":      31,
}

# Conversion: MediaPipe coords are normalized to image size. We assume
# the subject is roughly 1.7 m tall and rescale so vertical extent ~= 1700 mm.
MM_PER_NORMALIZED_UNIT = 1700.0


def write_trc(
    frames: Iterable[dict],
    *,
    out_path: Path,
    rate_hz: float = 30.0,
    units: str = "mm",
) -> Path:
    """Write a list of `{ tsMs, keypoints: [...] }` frames out as a TRC file."""
    frames = list(frames)
    if not frames:
        raise ValueError("at least one frame required")

    marker_names = list(MARKER_MAP.keys())
    n_markers = len(marker_names)
    n_frames = len(frames)
    t0_ms = frames[0]["tsMs"]

    out_path = Path(out_path)
    out_path.parent.mkdir(parents=True, exist_ok=True)
    buf = StringIO()

    # ---- Header ----
    buf.write(f"PathFileType\t4\t(X/Y/Z)\t{out_path.name}\n")
    buf.write("DataRate\tCameraRate\tNumFrames\tNumMarkers\tUnits\tOrigDataRate\tOrigDataStartFrame\tOrigNumFrames\n")
    buf.write(f"{rate_hz}\t{rate_hz}\t{n_frames}\t{n_markers}\t{units}\t{rate_hz}\t1\t{n_frames}\n")

    name_row = "Frame#\tTime\t" + "\t\t\t".join(marker_names) + "\t\t\t\n"
    buf.write(name_row)

    axis_row_parts = []
    for i in range(1, n_markers + 1):
        axis_row_parts.append(f"X{i}\tY{i}\tZ{i}")
    buf.write("\t\t" + "\t".join(axis_row_parts) + "\n")
    buf.write("\n")

    # ---- Data rows ----
    for i, f in enumerate(frames, start=1):
        t_s = (f["tsMs"] - t0_ms) / 1000.0
        kps = f["keypoints"]
        row = [str(i), f"{t_s:.6f}"]
        for name in marker_names:
            idx = MARKER_MAP[name]
            p = kps[idx]
            # Image Y grows downward → flip so Y up matches OpenSim convention.
            x = float(p["x"]) * MM_PER_NORMALIZED_UNIT
            y = (1.0 - float(p["y"])) * MM_PER_NORMALIZED_UNIT
            z = float(p.get("z", 0.0)) * MM_PER_NORMALIZED_UNIT
            row += [f"{x:.4f}", f"{y:.4f}", f"{z:.4f}"]
        buf.write("\t".join(row) + "\n")

    out_path.write_text(buf.getvalue())
    return out_path
