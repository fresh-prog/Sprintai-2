/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
  // Accent classes are built dynamically (bg-sprint-${accent}/15 etc.), so the
  // JIT can't see them in source — safelist the full matrix we use.
  safelist: [
    ...['coral', 'teal', 'orange', 'green', 'purple'].flatMap((c) => [
      `bg-sprint-${c}`, `bg-sprint-${c}/15`, `text-sprint-${c}`, `text-sprint-${c}/40`,
      `ring-sprint-${c}/30`, `border-l-sprint-${c}`,
    ]),
  ],
  theme: {
    extend: {
      colors: {
        // Sprint AI palette — pulled from the project deck.
        navy: {
          900: '#060c1c',
          800: '#0a1428',
          700: '#0e1b3a',
          600: '#142348',
          500: '#1a2d5c',
          400: '#243a73',
        },
        sprint: {
          orange: '#f5a623',
          'orange-bright': '#ffb330',
          'orange-deep': '#e08e0b',
          teal: '#1ec5c5',
          'teal-deep': '#159d9d',
          coral: '#ef4444',
          'coral-deep': '#dc2626',
          green: '#22c55e',
          purple: '#8b5cf6',
        },
        // Keep the old `brand.*` keys as aliases so existing components
        // don't break before we sweep them.
        brand: {
          50:  '#fff7e6',
          500: '#f5a623',
          600: '#e08e0b',
          700: '#b97005',
        },
      },
      fontFamily: {
        display: ['"Bebas Neue"', 'Impact', 'system-ui', 'sans-serif'],
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
