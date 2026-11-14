/** The Petra Walk Companion: a sleek collar tag on a strap, with a soft yellow glow. Decorative illustration. */
export function CompanionTag({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 320 320" className={className} role="img" aria-label="The Petra Walk Companion, a small tag that clips to a collar">
      <defs>
        <radialGradient id="tag-glow" cx="50%" cy="55%" r="50%">
          <stop offset="0%" stopColor="#FFD43B" stopOpacity="0.55" />
          <stop offset="55%" stopColor="#FFD43B" stopOpacity="0.12" />
          <stop offset="100%" stopColor="#FFD43B" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="tag-body" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#3A3A3A" />
          <stop offset="100%" stopColor="#141414" />
        </linearGradient>
        <linearGradient id="tag-face" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#2A2A2A" />
          <stop offset="100%" stopColor="#1A1A1A" />
        </linearGradient>
        <linearGradient id="strap" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#F2C230" />
          <stop offset="100%" stopColor="#D9A514" />
        </linearGradient>
      </defs>
      <circle cx="160" cy="176" r="140" fill="url(#tag-glow)" />
      {/* collar strap */}
      <path d="M8 96 Q160 150 312 96 L312 124 Q160 178 8 124 Z" fill="url(#strap)" />
      <path d="M8 104 Q160 158 312 104" fill="none" stroke="#141414" strokeOpacity="0.18" strokeWidth="1.5" strokeDasharray="4 6" />
      <path d="M8 116 Q160 170 312 116" fill="none" stroke="#141414" strokeOpacity="0.18" strokeWidth="1.5" strokeDasharray="4 6" />
      {/* clip */}
      <rect x="138" y="118" width="44" height="30" rx="8" fill="#2B2B2B" stroke="#4A4A4A" strokeWidth="2" />
      {/* tag */}
      <rect x="98" y="138" width="124" height="150" rx="40" fill="url(#tag-body)" />
      <rect x="106" y="146" width="108" height="134" rx="34" fill="url(#tag-face)" stroke="#FFFFFF" strokeOpacity="0.08" strokeWidth="2" />
      <path d="M118 166 Q126 152 146 150" fill="none" stroke="#FFFFFF" strokeOpacity="0.22" strokeWidth="4" strokeLinecap="round" />
      {/* paw mark */}
      <g transform="translate(160 214) scale(2.1)" fill="#FFD43B">
        <path d="M0 0 C-5 0 -7.5 4 -6.5 6.5 C-5.5 9 -2 8 0 8 C2 8 5.5 9 6.5 6.5 C7.5 4 5 0 0 0 Z" />
        <ellipse cx="-6.8" cy="-3" rx="2" ry="2.8" transform="rotate(-20 -6.8 -3)" />
        <ellipse cx="-2.4" cy="-6.6" rx="2" ry="2.9" />
        <ellipse cx="2.4" cy="-6.6" rx="2" ry="2.9" />
        <ellipse cx="6.8" cy="-3" rx="2" ry="2.8" transform="rotate(20 6.8 -3)" />
      </g>
      {/* status light */}
      <circle cx="160" cy="262" r="4" fill="#FFD43B" />
      <circle cx="160" cy="262" r="9" fill="#FFD43B" opacity="0.25" />
    </svg>
  );
}
