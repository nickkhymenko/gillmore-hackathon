import { DogSide } from "./DogSide";
import { ILLO } from "./palette";

/** Seven days of activity, in the 0 to 1 range; the last two days dip below the usual band. */
const WEEK = [0.62, 0.7, 0.58, 0.66, 0.72, 0.52, 0.44];

/**
 * Landing hero: Biscuit in front of a sandstone arch, read as an infographic:
 * a small activity line and his Care Score tag.
 */
export function HeroIllustration({ className = "" }: { className?: string }) {
  const x0 = 44;
  const x1 = 208;
  const y0 = 66;
  const y1 = 116;
  const pts = WEEK.map((v, i) => [x0 + (i * (x1 - x0)) / (WEEK.length - 1), y1 - v * (y1 - y0)] as const);
  const last = pts[pts.length - 1];
  return (
    <svg
      viewBox="0 0 480 440"
      className={className}
      role="img"
      aria-label="Illustration: Biscuit, a yellow Labrador, with a seven-day activity line and a Care Score of 82"
    >
      <rect width="480" height="440" fill={ILLO.cream} />
      <circle cx="404" cy="84" r="34" fill={ILLO.yellow} />
      <path d="M110 440 V262 A150 150 0 0 1 410 262 V440 Z" fill={ILLO.sand} />
      <path d="M170 440 V300 A90 90 0 0 1 350 300 V440 Z" fill={ILLO.creamDeep} />
      <rect y="372" width="480" height="68" fill={ILLO.sandstone} />

      <DogSide transform="translate(52 172) scale(1.1)" />

      {/* Activity card */}
      <g>
        <rect x="24" y="24" width="208" height="112" rx="8" fill={ILLO.paper} stroke={ILLO.ink} strokeOpacity="0.14" />
        <text x="40" y="48" fontSize="11" fontWeight="600" letterSpacing="1.4" fill={ILLO.inkSoft}>
          ACTIVITY, 7 DAYS
        </text>
        <rect x={x0} y="72" width={x1 - x0} height="18" fill={ILLO.yellowSoft} />
        <polyline points={pts.map((p) => p.join(",")).join(" ")} fill="none" stroke={ILLO.ink} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
        <circle cx={last[0]} cy={last[1]} r="4.5" fill={ILLO.ink} stroke={ILLO.paper} strokeWidth="2" />
        <text x="40" y="128" fontSize="10.5" fill={ILLO.inkSoft}>
          Usual range shaded
        </text>
      </g>

      {/* Care Score tag */}
      <g>
        <path d="M330 178 L322 196" stroke={ILLO.ink} strokeWidth="1.5" />
        <rect x="262" y="140" width="138" height="38" rx="19" fill={ILLO.yellow} stroke={ILLO.ink} strokeWidth="1.5" />
        <text x="331" y="165" textAnchor="middle" fontSize="15" fontWeight="700" fill={ILLO.ink}>
          Care Score 82
        </text>
      </g>
    </svg>
  );
}
