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
  hint = 'Used to place this run on the Global Talent Map.',
  // When provided, render a disclosed opt-in consent checkbox. The map shows
  // only country + aggregate score — never a name — and only for opted-in runs.
  consent,
  onConsentChange,
}) {
  const showConsent = typeof onConsentChange === 'function';
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

      {showConsent && (
        <label htmlFor={`${id}-consent`}
          className="mt-3 flex items-start gap-2.5 text-sm text-slate-300 cursor-pointer select-none">
          <input
            id={`${id}-consent`}
            type="checkbox"
            className="mt-0.5 h-4 w-4 shrink-0 accent-sprint-teal"
            checked={Boolean(consent)}
            disabled={disabled || !value}
            onChange={(e) => onConsentChange(e.target.checked)}
          />
          <span>
            Show this run on the public Talent Map
            <span className="block text-xs text-slate-500">
              Shares your country and sprint score only — never your name. Uncheck to keep it private.
            </span>
          </span>
        </label>
      )}
    </div>
  );
}
