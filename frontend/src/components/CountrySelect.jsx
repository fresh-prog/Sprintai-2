import { MapPin } from 'lucide-react';
import { COUNTRIES } from '../lib/countries.js';

// Labeled country picker shared by the capture + upload flows. The chosen code
// tags the session so it lands on the Global Talent Map. Keep it a native
// <select> for built-in keyboard/screen-reader support and mobile pickers.
export default function CountrySelect({
  id = 'country',
  value,
  onChange,
  disabled = false,
  label = 'Where are you sprinting?',
  hint = 'Tags this run on the Global Talent Map.',
}) {
  return (
    <div>
      <label htmlFor={id} className="block text-sm text-slate-300 mb-1.5 font-medium">
        {label}
      </label>
      <div className="relative">
        <MapPin className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-sprint-teal"
          strokeWidth={1.75} aria-hidden="true" />
        <select
          id={id}
          className="input pl-9 appearance-none"
          value={value ?? ''}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
        >
          <option value="">Select a country…</option>
          {COUNTRIES.map((c) => (
            <option key={c.code} value={c.code}>{c.flag} {c.name}</option>
          ))}
        </select>
      </div>
      {hint && <p className="text-xs text-slate-500 mt-1.5">{hint}</p>}
    </div>
  );
}
