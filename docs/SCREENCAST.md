# Onboarding Screencast — Script & Shot List

This is the script for the 5-minute SprintAI onboarding video. Read it
verbatim or paraphrase — the timing is the contract.

Target length: **5:00**. Anything longer loses people in the second half.

---

## Pre-flight

- Resolution: 1920×1080, 30 fps.
- Recording tool: OBS Studio (open-source, MIT-friendly).
- Browser zoom: 110% so the Tailwind defaults stay readable.
- Two terminals visible side-by-side via tmux/iTerm: top for `docker compose`,
  bottom for `git`. Font ≥ 16 pt.
- Webcam visible bottom-right at ~20% opacity — keep the human element.
- Mic check: do a 10 s test, listen back, then start.

---

## 0:00 — 0:25 · The hook

> "Most AI-fitness products send your video to a third-party API. That
> costs money per request, leaks biometric data, and stops working without
> internet. SprintAI replaces all of that with a self-hosted stack you can
> spin up with one command."

**Shot**: README hero section, scroll past "Why this exists" → "System
architecture" diagram.

---

## 0:25 — 1:00 · The architecture in 30 seconds

> "Here's the data path. Your webcam frames stay in the browser — MediaPipe
> runs as WebAssembly on your CPU and emits 33 body landmarks per frame.
> Those landmarks — not the video — flow into a Node backend over a
> Socket.IO room. Node down-samples for storage, buffers into a Redis
> stream, and the heavier work — activity classification, OpenSim
> biomechanics — happens in two Python microservices."

**Shot**: `docs/ARCHITECTURE.md`, hover the component diagram.

---

## 1:00 — 1:40 · One-command spin-up

> "Let's run it. Fresh clone, copy the env template, `docker compose up
> --build`."

**Shot**: Terminal.
```bash
git clone … && cd sprintai-2
cp .env.example .env
docker compose up --build
```
Cut to the "all containers healthy" log line (~70 s later — speed up 4x in
post). Then open `http://localhost:5173`.

---

## 1:40 — 2:30 · First session

> "Register, hit Capture, allow the camera. You're now seeing a live
> skeleton overlay, real-time joint angles, and a posture classifier
> running on every frame. The activity classifier kicks in after 32 frames
> of buffered window — about a second."

**Shot**: Register → Dashboard → Capture. Wave at the camera, do a few
squat reps. Highlight the three live cards.

---

## 2:30 — 3:10 · Stopping a session = a report

> "Stop the session. The backend immediately pulls the persisted frames
> and asks the biomech service for a one-shot summary — range of motion,
> Robinson symmetry, gait cadence — and writes it back as summary metrics.
> Now open the session detail page."

**Shot**: Click Stop → Sessions → click the row. Scroll through the
summary cards, skeleton replay (drag the scrubber), and motion map.

---

## 3:10 — 3:40 · Export & PDF report

> "Three export options: JSON for analytics, CSV for spreadsheets, and a
> physio-grade PDF with the headline metrics."

**Shot**: Click each button. Open the PDF in the preview pane. Linger 2 s.

---

## 3:40 — 4:20 · Offline mode (the privacy story)

> "Kill the backend container. The browser keeps detecting your skeleton,
> and a TF.js posture classifier we ship in the bundle takes over with the
> 'offline' badge. No network, no degradation."

**Shot**: `docker compose stop backend`. Watch the Posture card sprout
"offline" badge. Move around — labels keep updating.

---

## 4:20 — 4:50 · For developers

> "The folder layout is conventional — `backend/` Express + Prisma,
> `frontend/` Vite + Tailwind, `ml/` and `biomech/` two FastAPI services.
> Every deliverable from the project spec is mapped to a file in
> `docs/MODULES.md`. Tests run with `npm test` / `pytest`. CI is GitHub
> Actions with a Trivy image scan."

**Shot**: VS Code with the folder tree open, then `docs/MODULES.md`
scrolling through.

---

## 4:50 — 5:00 · Wrap

> "That's SprintAI. No paid APIs, no cloud calls, biometric data never
> leaves your box. Clone, run, contribute — link in the description."

**Shot**: GitHub repo URL, contributing guide.

---

## Post-production checklist

- [ ] Cut the `docker compose up` build wait to ≤ 8 s with a 4× speed-up.
- [ ] Captions on for every spoken segment (Whisper for first pass).
- [ ] Lower-thirds at each section: title + the file path being shown.
- [ ] Bake a 1-frame thumbnail at the 2:00 mark (Capture screen with skeleton).
- [ ] Export H.264 at 8 Mbps, MP4. Upload to YouTube **unlisted** for the
      internal share first; flip to public only after a teammate review.
- [ ] Add a link in `README.md` once the video is published.
