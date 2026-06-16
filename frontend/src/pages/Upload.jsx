import { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { UploadCloud, FileVideo, ArrowRight } from 'lucide-react';
import api from '../services/api.js';
import PageHeader from '../components/PageHeader.jsx';
import CountrySelect from '../components/CountrySelect.jsx';

const COUNTRY_KEY = 'sprintai.captureCountry';

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
  const [country, setCountry] = useState(() => localStorage.getItem(COUNTRY_KEY) || '');
  const [label, setLabel] = useState('');

  function pickCountry(code) {
    setCountry(code);
    if (code) localStorage.setItem(COUNTRY_KEY, code);
  }
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
        ...(country ? { country } : {}),
        meta: { event, originalName: file.name, size: file.size, mime: file.type },
      });

      // 2. Upload the video to that session.
      const form = new FormData();
      form.append('video', file);
      const { data: uploaded } = await api.post(`/sessions/${session.id}/upload`, form, {
        headers: { 'Content-Type': 'multipart/form-data' },
        onUploadProgress: (e) => {
          if (e.total) setProgress(Math.round((e.loaded / e.total) * 100));
        },
      });

      // 3. Hop to the right session — duplicate uploads bounce to the
      // existing session rather than creating a brand new one.
      if (uploaded?.duplicate && uploaded.sessionId) {
        nav(`/sessions/${uploaded.sessionId}?from=duplicate`);
      } else {
        nav(`/sessions/${session.id}`);
      }
    } catch (err) {
      setError(err.response?.data?.error?.message ?? err.message ?? 'Upload failed');
      setBusy(false);
    }
  }

  return (
    <div className="space-y-8">
      <PageHeader icon={UploadCloud} eyebrow="Sprint Analysis" title="UPLOAD A SPRINT"
        subtitle="Drop a video of a 100m or 200m run. We extract 33 body landmarks per frame, identify sprint phases, and score the athlete against elite benchmarks." />

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
              <FileVideo className="h-10 w-10 mx-auto mb-3 text-sprint-orange" strokeWidth={1.5} />
              <p className="font-display text-3xl text-sprint-orange mb-2">{file.name}</p>
              <p className="text-slate-400 text-sm">
                {(file.size / 1024 / 1024).toFixed(1)} MB · {file.type || 'video'}
              </p>
              <p className="text-slate-500 text-xs mt-2">click to choose a different file</p>
            </div>
          ) : (
            <div>
              <UploadCloud className="h-12 w-12 mx-auto mb-3 text-slate-400" strokeWidth={1.25} />
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
            <label htmlFor="upload-label" className="block text-sm text-slate-400 mb-2">Label</label>
            <input
              id="upload-label"
              className="input"
              placeholder="e.g. 100m time trial, May 2026"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
            />
          </div>
          <div>
            <label htmlFor="upload-event" className="block text-sm text-slate-400 mb-2">Event</label>
            <select id="upload-event" className="input" value={event} onChange={(e) => setEvent(e.target.value)}>
              {EVENTS.map((ev) => (
                <option key={ev.id} value={ev.id}>{ev.label}</option>
              ))}
            </select>
          </div>
          <div className="md:col-span-2">
            <CountrySelect
              id="upload-country"
              value={country}
              onChange={pickCountry}
              label="Country where the run was performed"
              hint="Optional — places this sprint on the Global Talent Map."
            />
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
          {busy ? 'Uploading…' : <>Analyze sprint <ArrowRight className="h-5 w-5" /></>}
        </button>
      </form>
    </div>
  );
}
