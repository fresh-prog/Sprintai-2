// Curated, free-license sprinter/track imagery (Unsplash License — free for
// commercial use, no attribution required). We hotlink the Unsplash CDN with
// sizing params so the images arrive pre-optimized as WebP/AVIF.
//
// `auto=format` negotiates the best format; `fit=crop` + `w` control size.
const ID = {
  heroGolden: 'photo-1744060204728-f68e434a3edf', // golden-hour sprinter, sun flare
  blurSide: 'photo-1744868646521-2620c945a1fe', // B&W motion-blur sprinter (profile)
  blurPan: 'photo-1744706908605-ac30eb45f98c', // B&W panning sprinter
  fountain: 'photo-1727094141271-9bea5bc8c757', // B&W runner past fountain
  urban: 'photo-1554139844-af2fc8ad3a3a', // urban runner, bold sneakers
};

/** Build a sized Unsplash CDN URL. */
export function img(key, { w = 1200, q = 80 } = {}) {
  const id = ID[key] ?? key;
  return `https://images.unsplash.com/${id}?auto=format&fit=crop&q=${q}&w=${w}`;
}

/** A tiny blurred placeholder (LQIP) for smooth load-in, same aspect. */
export function blurUrl(key) {
  const id = ID[key] ?? key;
  return `https://images.unsplash.com/${id}?auto=format&fit=crop&q=20&w=40&blur=20`;
}

export const IMAGES = ID;
