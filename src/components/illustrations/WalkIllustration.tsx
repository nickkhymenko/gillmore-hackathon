import { DogSide } from "./DogSide";
import { ILLO } from "./palette";

/** Narrative step one: Biscuit on his morning walk, a little slower than usual. */
export function WalkIllustration({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 400 300" className={className} role="img" aria-label="Illustration: Biscuit on his morning walk, at a slower pace than usual">
      <rect width="400" height="300" fill={ILLO.cream} />
      <circle cx="74" cy="70" r="26" fill={ILLO.yellow} />
      <path d="M0 210 Q120 176 230 200 T400 188 V300 H0 Z" fill={ILLO.sand} />
      <path d="M0 252 Q160 232 400 250 V300 H0 Z" fill={ILLO.sandstone} />
      {/* trees */}
      <rect x="318" y="136" width="8" height="64" rx="4" fill={ILLO.rust} />
      <circle cx="322" cy="128" r="28" fill={ILLO.sandstone} />
      <rect x="356" y="160" width="6" height="40" rx="3" fill={ILLO.rust} />
      <circle cx="359" cy="154" r="18" fill={ILLO.sandstone} />
      {/* trail behind him */}
      <path d="M12 262 Q40 254 70 256" fill="none" stroke={ILLO.ink} strokeWidth="2" strokeDasharray="2 8" strokeLinecap="round" />

      <DogSide stride={9} transform="translate(68 92) scale(0.78)" />

      {/* pace chip */}
      <rect x="226" y="24" width="152" height="52" rx="8" fill={ILLO.paper} stroke={ILLO.ink} strokeOpacity="0.14" />
      <text x="240" y="44" fontSize="10" fontWeight="600" letterSpacing="1.2" fill={ILLO.inkSoft}>
        MORNING WALK
      </text>
      <text x="240" y="64" fontSize="14" fontWeight="700" fill={ILLO.ink}>
        Pace below usual
      </text>
    </svg>
  );
}
