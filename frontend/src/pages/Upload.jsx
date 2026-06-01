import { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api.js';

const ACCEPTED = ['video/mp4', 'video/quicktime', 'video/webm', 'video/x-matroska', 'video/x-msvideo'];
const ACCEPT_ATTR = '.mp4,.mov,.avi,.mkv,.webm';
const MAX_MB = 200;

const EVENTS = [
  { id: 'S100M',   label: '100 m' },
  { id: 'S200M',   label: '200 m' },
  { id: 'S400M',   label: '400 m' },
  { id: 'RELAY',   label: 'Relay' },
  { id: 'PRACTICE',label: 'Practice run' },
];

export default function Upload() {
  const nav = useNavigate();
  const inputRef = useRef(null);
  const [file, setFile] = useState(null);
  const [event, setEvent] = useState('S100M');
  const [label, setLabel] = useState('');
  const [drag, setDrag] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  function chooseFile(f) {
    setError('');
    if (!f) return;
    if (!ACCEPTED.includes(f.type) && !/\.(mp4|mov|avi|mkv|webm)$/i.test(f.name)) {
      setError(`Unsupported file type: ${f.type || f.name}`);
      return;
    }
    if (f.size > MAX_MB * 1024 * 1024) {
      setError(`File too large (${(f.size / 1024 / 1024).toFixed(1)} MB > ${MAX_MB} MB)`);
      return;
    }
    setFile(f);
    if (!label) setLabel(f.name.replace(/\.[^.]+$/, ''));
  }

  function onDrop(e) {
    e.preventDefault();
    setDrag(false);
    chooseFile(e.dataTransfer.files?.[0]);
  }

  async function submit(e) {
    e.preventDefault();
    if (!file) return;
    setBusy(true); setError(''); setProgress(0);
    try {
      // 1. Create the session record.
      const { data: session } = await api.post('/sessions', {
        label: label || file.name,
        source: 'UPLOAD',
        meta: { event, originalName: file.name, size: file.size, mime: file.type },
      });

      // 2. Upload the video to that session.
      const form = new FormData();
      form.append('video', file);
      await api.post(`/sessions/${session.id}/upload`, form, {
        headers: { 'Content-Type': 'multipart/form-data' },
        onUploadProgress: (e) => {
          if (e.total) setProgress(Math.round((e.loaded / e.total) * 100));
        },
      });

      // 3. Hop to the session detail page — frame extraction picks up async.
      nav(`/sessions/${session.id}`);
    } catch (err) {
      setError(err.response?.data?.error?.message ?? err.message ?? 'Upload failed');
      setBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      <header>
        <p className="section-eyebrow">Sprint Analysis</p>
        <h1 className="font-display text-5xl text-white mt-2">UPLOAD A SPRINT</h1>
        <p className="text-slate-300 mt-2 max-w-2xl">
          Drop a video of a 100m or 200m run. We'll extract 33 body landmarks per frame,
          identify sprint phases, and score the athlete against elite benchmarks.
        </p>
      </header>

      <form onSubmit={submit} className="space-y-5 max-w-3xl">
        {/* Drop zone */}
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
          onDragLeave={() => setDrag(false)}
          onDrop={onDrop}
          className={`w-full rounded-2xl border-2 border-dashed p-10 text-center transition cursor-pointer
                      ${drag
                        ? 'border-sprint-orange bg-sprint-orange/10'
                        : 'border-white/20 hover:border-sprint-teal hover:bg-white/[0.03]'}`}
        >
          <input
            ref={inputRef}
            type="file"
            accept={ACCEPT_ATTR}
            className="hidden"
            onChange={(e) => chooseFile(e.target.files?.[0])}
          />
          {file ? (
            <div>
              <p className="font-display text-3xl text-sprint-orange mb-2">{file.name}</p>
              <p className="text-slate-400 text-sm">
                {(file.size / 1024 / 1024).toFixed(1)} MB · {file.type || 'video'}
              </p>
              <p className="text-slate-500 text-xs mt-2">click to choose a different file</p>
            </div>
          ) : (
            <div>
              <p className="font-display text-3xl text-white">Drop video here</p>
              <p className="text-slate-400 mt-2">or click to browse</p>
              <p className="text-slate-500 text-xs mt-4">
                MP4 · MOV · AVI · MKV · WebM · up to {MAX_MB} MB
              </p>
            </div>
          )}
        </button>

        {/* Metadata */}
        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm text-slate-400 mb-2">Label</label>
            <input
              className="input"
              placeholder="e.g. 100m time trial, May 2026"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-sm text-slate-400 mb-2">Event</label>
            <select className="input" value={event} onChange={(e) => setEvent(e.target.value)}>
              {EVENTS.map((ev) => (
                <option key={ev.id} value={ev.id}>{ev.label}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Progress */}
        {busy && (
          <div>
            <div className="h-2 bg-navy-700 rounded-full overflow-hidden">
              <div
                className="h-full bg-sprint-orange transition-all"
                style={{ width: `${progress}%` }}
              />
            </div>
            <p className="text-sm text-slate-400 mt-1">Uploading… {progress}%</p>
          </div>
        )}

        {error && <p className="text-sprint-coral text-sm">{error}</p>}

        <button type="submit" className="btn-primary" disabled={!file || busy}>
          {busy ? 'Uploading…' : 'Analyze sprint →'}
        </button>
      </form>
    </div>
  );
}
