# Research Methodology — Ugandan Athlete Sprint Dataset

This document is the engineering- and ethics-side specification for the
20 % of the Sprint AI training dataset that comes from original research
on Ugandan athletes. Pair it with a separately-approved IRB protocol —
this doc is the **operational** plan, not the ethics submission itself.

> If you change anything here, also update the dataset card committed
> alongside the released model (template in `ml/docs/dataset_card.md`).

---

## 1. Why a Uganda-collected cohort?

- The 80 % "public" portion of our training data over-represents elite,
  Northern-hemisphere athletes filmed in optimized lab conditions
  (uniform lighting, sub-1ms shutter, fixed camera height). A model
  trained only on that distribution will under-perform on the field
  conditions that matter for talent ID — variable lighting, dirt
  tracks, side-angle phone footage.
- Uganda has documented sprint potential (Halimah Nakaayi, Tarsis
  Orogot, etc.) but limited formal scouting infrastructure. Collecting
  a high-quality dataset there gives us:
  1. Domain adaptation signal for the pose detector + technique scorer.
  2. A baseline distribution of mechanics for an under-studied
     population — useful for fairer benchmarks.
  3. A field-test of the deployment workflow (consent, capture protocol,
     return-of-results) that the platform itself will encode.

---

## 2. Population & inclusion criteria

| | Criterion |
|---|---|
| **Age range** | 10–25 inclusive. Minors (10–17) require parental/guardian consent. |
| **Performance band** | Three tiers: school (no prior club affiliation), club (registered with a local athletics club), elite (national-team or NCAA-equivalent). |
| **Events** | 100m and 200m primary. We accept athletes who also compete in 400m or relays for the secondary cohort but their primary event is captured for stratified analysis. |
| **Geography** | At least 4 sites: Kampala (urban), Jinja (peri-urban), Mbale, Mbarara (rural east + west). |
| **Sex** | Balanced sampling target: 50 ± 5 % female, 50 ± 5 % male; explicit "X" / non-binary option captured. |
| **Health** | Athletes must be cleared for sprint training by a local physiotherapist or club medic at the time of capture. |

Target N = **400** athletes (≈ 100 per site), ~ **3 sessions** each → 1,200
sessions, ≥ 3,000 sprint videos.

---

## 3. Capture protocol

### 3.1 Hardware

- Primary: 1× athlete's own smartphone (we deliberately don't standardize
  hardware — the deployed product runs on whatever phone they have).
- Reference: 1× study-provided iPhone 13 (or equivalent ≥ 1080p / 60 fps)
  filming the same trial from a fixed tripod for ground truth.
- Optional: 1× wide-angle GoPro for the 60–100 m segment.
- Two retroreflective markers (heel + iliac crest) when an athlete
  consents — used to validate marker-less ankle/heel detection.

### 3.2 Track + lane

- Lane 4 of a standard 400m track when available; closest equivalent
  straight surface otherwise.
- Cones at 0 m, 10 m, 30 m, 60 m, 80 m, 100 m — used to validate the
  ML phase classifier's segmentation.
- Wind speed recorded with a handheld anemometer; runs with > 2 m/s
  tailwind are tagged but not excluded.

### 3.3 Trial structure

Each session = 3 maximal sprints with 6 min recovery between:
1. 60m flying (rolling start) — captures max velocity phase cleanly.
2. 100m from blocks — full phase sequence.
3. 200m (only when the athlete trains for it; otherwise a second 100m).

Athletes wear their normal training kit. We deliberately don't ask
them to change clothing or remove jewelry — the deployed product won't
either.

### 3.4 Camera angles

- **Side (perpendicular to lane)** is mandatory.
- **3/4 view (45° from start)** is captured when staffing allows; this
  is the angle the deployed phone-app expects.
- **Following shot** (zoom-tracking from the side of the track) is
  experimental — used to test camera-motion robustness of the pose
  detector.

### 3.5 Hand-time + photo-finish

Two staff with stopwatches per run, averaged. Where a club has access
to electronic timing (some Kampala clubs do), we record both.

---

## 4. Consent & ethics

- **IRB**: protocol filed with Makerere University SBS REC (or equivalent
  affiliate) before any data collection. Reciprocal review with the
  hosting institution's IRB.
- **Consent form** (English + Luganda + Runyankole) explicitly covers:
  1. The video and derived skeleton/landmark data will be stored.
  2. The dataset may be released for non-commercial research, with the
     athlete's identifying features blurred.
  3. The athlete can withdraw at any time and have their data deleted.
  4. Return of results: every athlete gets their own analysis as a PDF
     report (the one the platform generates) within 14 days.
- **Minors**: written assent from athlete + written consent from
  parent/guardian. School-based collection requires headteacher sign-off.
- **Data sovereignty**: raw video stays on infrastructure hosted in
  Uganda (we provision a small Hetzner CCX in Kampala). Only the
  anonymized skeleton + metric rows ever leave the country.
- **Compensation**: a per-session transport stipend (UGX equivalent of
  $5–8). No payment for the data itself — that would skew consent.

---

## 5. Annotation

Two passes per session:

1. **Automated**: MediaPipe Pose runs against every frame in production
   mode. Output is the canonical 33-landmark JSON.
2. **Human verification**: a trained annotator (per the COCO Keypoints
   guidelines) reviews 10 % of frames per session in our annotation tool
   (CVAT). They:
   - Confirm or correct landmark positions.
   - Tag phase boundaries (acceleration / drive / max-vel / endurance /
     finish) — this is the ground truth for the TCN phase classifier
     in §6 of `SPRINT_AI_V2.md`.
   - Flag occlusions (camera operator stepped in front, etc.).

Inter-annotator agreement is measured monthly; we target Cohen's
κ ≥ 0.85 for phase labels.

---

## 6. Dataset structure

```
research/
├── README.md                ← this file references it
├── consent/
│   └── <athlete_id>.pdf     ← signed consent (encrypted, off-repo)
├── athletes.csv             ← demographic table (athlete_id, age, sex, ...)
├── sessions/
│   └── <session_id>/
│       ├── side.mp4
│       ├── 3q.mp4           ← optional
│       ├── follow.mp4       ← optional
│       ├── pose.parquet     ← 33 landmarks × N frames
│       ├── phases.json      ← human-verified phase boundaries
│       └── metadata.json    ← wind, surface, times, kit
└── splits/
    ├── train.txt            ← 70 % of sessions
    ├── val.txt              ← 15 %
    └── test.txt             ← 15 % (held out for v2 model release)
```

Splits are by **athlete**, not session, so we never train on one
session from an athlete whose other session is in val/test.

---

## 7. Release cadence

- **v0** (internal): first 50 athletes, used only to validate the
  capture protocol. Not released.
- **v1**: first 200 athletes. Released alongside Sprint AI v2 as a
  research-license dataset (CC BY-NC-SA 4.0).
- **v2**: full 400 athletes + a second wave for longitudinal study (each
  athlete revisited 6 months later). Released alongside Sprint AI v2.5.

Each release ships a dataset card following the
[HuggingFace dataset card template](https://github.com/huggingface/datasets/blob/main/templates/README_guide.md)
plus our own ethics summary.

---

## 8. Field team

| Role | Count | Notes |
|---|---|---|
| Site lead | 1 per site | Local coach or PE teacher, paid per-session. |
| Camera operator | 2 per site | Tripod + handheld. |
| Athlete liaison | 1 per site | Handles consent, transport stipends. |
| Medic | 1 per site | On call during sessions. |
| Annotator | 4 total | Remote, work async. Trained by lead engineer. |
| Lead engineer | 1 | Owns the pipeline + IRB liaison. |

---

## 9. Risks + mitigations

| Risk | Mitigation |
|---|---|
| **Coercion of school-age athletes** | All school visits are opt-in **after** the session is over; consent is taken privately, not in front of teachers. |
| **Re-identification of "elite" subset** (small N) | Faces blurred in any released media. Elite cohort gets aggregate-only release with N ≥ 5 per stratum. |
| **Model fits Ugandan-specific variance** | We keep the 80 / 20 mix and run per-country evaluation; reports per release flag if any country's test slice degrades. |
| **Data leaves the country accidentally** | Storage is in-country; egress is gated by an audited service that strips video, exporting only the parquet skeletons. |
| **Hardware variance overwhelms signal** | Reference iPhone trial in every session lets us calibrate per-device deltas during the v0 phase. |

---

## 10. Engineering checklist (the parts that touch this codebase)

- [x] `athlete.country` field — exists (ISO alpha-2).
- [x] Sessions are athlete-scoped, not just user-scoped.
- [ ] `Consent` table — planned (`SPRINT_AI_V2.md` open work #10).
- [ ] Site / wave fields on Athlete (`siteCode`, `wave`).
- [ ] Per-session metadata: `windMs`, `surface`, `handTimes`, `kit`.
- [ ] CVAT export ingester (`ml/scripts/ingest_cvat.py`).
- [ ] In-country storage adapter for `upload.service.js` (env-driven).
- [ ] Per-country eval slice in CI.

Add to this list as the protocol evolves.
