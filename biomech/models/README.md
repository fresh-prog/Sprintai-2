# OpenSim musculoskeletal models

Drop a model file (e.g. `gait2354_simbody.osim`) here to enable the real
inverse-kinematics path in `src/ik.py`.

- Without a model present **and** the `opensim` Python package installed, the
  service automatically falls back to the pure-Python angle estimator in
  `src/geometry.py`. The rest of the stack stays functional either way.
- The default file name we look for is `gait2354_simbody.osim`. Override by
  setting the `OPENSIM_MODEL_PATH` env var if you prefer.

Source models (open-source):
- https://simtk.org/projects/opensim → "OpenSim Models" page
- The `gait2354` model ships with the OpenSim distribution under
  `Resources/Models/Gait2354_Simbody/gait2354_simbody.osim`.

Models are intentionally not committed — they're several MB binary blobs and
versions evolve over time. Pin the version you ship in your deployment notes.
