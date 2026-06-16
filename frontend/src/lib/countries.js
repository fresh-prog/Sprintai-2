// Shared country reference used by BOTH the capture/upload country pickers and
// the Global Talent Map globe, so a country a user can pick is always a country
// the globe can plot. `lat`/`lng` are approximate land centroids (degrees).
// `code` is ISO 3166-1 alpha-2 (upper-case). Extend freely — the globe and the
// pickers stay in sync automatically.

export const COUNTRIES = [
  { code: 'UG', name: 'Uganda',            flag: '🇺🇬', lat:   1.3733, lng:  32.2903 },
  { code: 'KE', name: 'Kenya',             flag: '🇰🇪', lat:  -0.0236, lng:  37.9062 },
  { code: 'ET', name: 'Ethiopia',          flag: '🇪🇹', lat:   9.1450, lng:  40.4897 },
  { code: 'TZ', name: 'Tanzania',          flag: '🇹🇿', lat:  -6.3690, lng:  34.8888 },
  { code: 'RW', name: 'Rwanda',            flag: '🇷🇼', lat:  -1.9403, lng:  29.8739 },
  { code: 'BI', name: 'Burundi',           flag: '🇧🇮', lat:  -3.3731, lng:  29.9189 },
  { code: 'SS', name: 'South Sudan',       flag: '🇸🇸', lat:   6.8770, lng:  31.3070 },
  { code: 'SD', name: 'Sudan',             flag: '🇸🇩', lat:  12.8628, lng:  30.2176 },
  { code: 'SO', name: 'Somalia',           flag: '🇸🇴', lat:   5.1521, lng:  46.1996 },
  { code: 'CD', name: 'DR Congo',          flag: '🇨🇩', lat:  -4.0383, lng:  21.7587 },
  { code: 'ZA', name: 'South Africa',      flag: '🇿🇦', lat: -30.5595, lng:  22.9375 },
  { code: 'NG', name: 'Nigeria',           flag: '🇳🇬', lat:   9.0820, lng:   8.6753 },
  { code: 'GH', name: 'Ghana',             flag: '🇬🇭', lat:   7.9465, lng:  -1.0232 },
  { code: 'CI', name: "Côte d'Ivoire",     flag: '🇨🇮', lat:   7.5400, lng:  -5.5471 },
  { code: 'SN', name: 'Senegal',           flag: '🇸🇳', lat:  14.4974, lng: -14.4524 },
  { code: 'CM', name: 'Cameroon',          flag: '🇨🇲', lat:   7.3697, lng:  12.3547 },
  { code: 'EG', name: 'Egypt',             flag: '🇪🇬', lat:  26.8206, lng:  30.8025 },
  { code: 'MA', name: 'Morocco',           flag: '🇲🇦', lat:  31.7917, lng:  -7.0926 },
  { code: 'DZ', name: 'Algeria',           flag: '🇩🇿', lat:  28.0339, lng:   1.6596 },
  { code: 'JM', name: 'Jamaica',           flag: '🇯🇲', lat:  18.1096, lng: -77.2975 },
  { code: 'TT', name: 'Trinidad & Tobago', flag: '🇹🇹', lat:  10.6918, lng: -61.2225 },
  { code: 'BS', name: 'Bahamas',           flag: '🇧🇸', lat:  25.0343, lng: -77.3963 },
  { code: 'US', name: 'United States',     flag: '🇺🇸', lat:  37.0902, lng: -95.7129 },
  { code: 'CA', name: 'Canada',            flag: '🇨🇦', lat:  56.1304, lng:-106.3468 },
  { code: 'MX', name: 'Mexico',            flag: '🇲🇽', lat:  23.6345, lng:-102.5528 },
  { code: 'BR', name: 'Brazil',            flag: '🇧🇷', lat: -14.2350, lng: -51.9253 },
  { code: 'AR', name: 'Argentina',         flag: '🇦🇷', lat: -38.4161, lng: -63.6167 },
  { code: 'CO', name: 'Colombia',          flag: '🇨🇴', lat:   4.5709, lng: -74.2973 },
  { code: 'CU', name: 'Cuba',              flag: '🇨🇺', lat:  21.5218, lng: -77.7812 },
  { code: 'GB', name: 'United Kingdom',    flag: '🇬🇧', lat:  55.3781, lng:  -3.4360 },
  { code: 'IE', name: 'Ireland',           flag: '🇮🇪', lat:  53.1424, lng:  -7.6921 },
  { code: 'FR', name: 'France',            flag: '🇫🇷', lat:  46.6034, lng:   1.8883 },
  { code: 'DE', name: 'Germany',           flag: '🇩🇪', lat:  51.1657, lng:  10.4515 },
  { code: 'NL', name: 'Netherlands',       flag: '🇳🇱', lat:  52.1326, lng:   5.2913 },
  { code: 'BE', name: 'Belgium',           flag: '🇧🇪', lat:  50.5039, lng:   4.4699 },
  { code: 'IT', name: 'Italy',             flag: '🇮🇹', lat:  41.8719, lng:  12.5674 },
  { code: 'ES', name: 'Spain',             flag: '🇪🇸', lat:  40.4637, lng:  -3.7492 },
  { code: 'PT', name: 'Portugal',          flag: '🇵🇹', lat:  39.3999, lng:  -8.2245 },
  { code: 'SE', name: 'Sweden',            flag: '🇸🇪', lat:  60.1282, lng:  18.6435 },
  { code: 'NO', name: 'Norway',            flag: '🇳🇴', lat:  60.4720, lng:   8.4689 },
  { code: 'PL', name: 'Poland',            flag: '🇵🇱', lat:  51.9194, lng:  19.1451 },
  { code: 'GR', name: 'Greece',            flag: '🇬🇷', lat:  39.0742, lng:  21.8243 },
  { code: 'TR', name: 'Türkiye',           flag: '🇹🇷', lat:  38.9637, lng:  35.2433 },
  { code: 'RU', name: 'Russia',            flag: '🇷🇺', lat:  61.5240, lng: 105.3188 },
  { code: 'UA', name: 'Ukraine',           flag: '🇺🇦', lat:  48.3794, lng:  31.1656 },
  { code: 'SA', name: 'Saudi Arabia',      flag: '🇸🇦', lat:  23.8859, lng:  45.0792 },
  { code: 'AE', name: 'UAE',               flag: '🇦🇪', lat:  23.4241, lng:  53.8478 },
  { code: 'QA', name: 'Qatar',             flag: '🇶🇦', lat:  25.3548, lng:  51.1839 },
  { code: 'IL', name: 'Israel',            flag: '🇮🇱', lat:  31.0461, lng:  34.8516 },
  { code: 'IN', name: 'India',             flag: '🇮🇳', lat:  20.5937, lng:  78.9629 },
  { code: 'PK', name: 'Pakistan',          flag: '🇵🇰', lat:  30.3753, lng:  69.3451 },
  { code: 'BD', name: 'Bangladesh',        flag: '🇧🇩', lat:  23.6850, lng:  90.3563 },
  { code: 'CN', name: 'China',             flag: '🇨🇳', lat:  35.8617, lng: 104.1954 },
  { code: 'JP', name: 'Japan',             flag: '🇯🇵', lat:  36.2048, lng: 138.2529 },
  { code: 'KR', name: 'South Korea',       flag: '🇰🇷', lat:  35.9078, lng: 127.7669 },
  { code: 'ID', name: 'Indonesia',         flag: '🇮🇩', lat:  -0.7893, lng: 113.9213 },
  { code: 'PH', name: 'Philippines',       flag: '🇵🇭', lat:  12.8797, lng: 121.7740 },
  { code: 'TH', name: 'Thailand',          flag: '🇹🇭', lat:  15.8700, lng: 100.9925 },
  { code: 'VN', name: 'Vietnam',           flag: '🇻🇳', lat:  14.0583, lng: 108.2772 },
  { code: 'MY', name: 'Malaysia',          flag: '🇲🇾', lat:   4.2105, lng: 101.9758 },
  { code: 'AU', name: 'Australia',         flag: '🇦🇺', lat: -25.2744, lng: 133.7751 },
  { code: 'NZ', name: 'New Zealand',       flag: '🇳🇿', lat: -40.9006, lng: 174.8860 },
];

// code → country record, for O(1) lookup from the globe / rankings table.
export const COUNTRY_BY_CODE = Object.fromEntries(COUNTRIES.map((c) => [c.code, c]));

export function countryName(code) {
  return COUNTRY_BY_CODE[code]?.name ?? code;
}
