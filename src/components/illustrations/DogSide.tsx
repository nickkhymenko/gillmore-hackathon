import { ILLO } from "./palette";

/** Biscuit's coat (a yellow Labrador), matching his PetAvatar. */
export const BISCUIT_COAT = { coat: "#E2BE7A", shade: "#C99A55", light: "#F1D9A8" };

/**
 * A side-on Labrador, facing right, drawn in a 300 x 200 box. Flat shapes only.
 * `stride` swings the legs for a walking pose (degrees).
 */
export function DogSide({ stride = 0, transform }: { stride?: number; transform?: string }) {
  const { coat, shade, light } = BISCUIT_COAT;
  const leg = (x: number, fill: string, angle: number) => (
    <g transform={`rotate(${angle} ${x + 11} 122)`}>
      <rect x={x} y="112" width="22" height="78" rx="11" fill={fill} />
    </g>
  );
  return (
    <g transform={transform}>
      <ellipse cx="146" cy="194" rx="112" ry="7" fill={ILLO.sandstone} opacity="0.45" />
      {/* tail */}
      <path d="M62 96 Q30 92 22 58" fill="none" stroke={coat} strokeWidth="13" strokeLinecap="round" />
      {/* far legs, then near legs */}
      {leg(94, shade, -stride)}
      {leg(172, shade, stride)}
      {leg(70, coat, stride)}
      {leg(196, coat, -stride)}
      {/* body and neck */}
      <ellipse cx="140" cy="108" rx="90" ry="44" fill={coat} />
      <path d="M186 84 L226 34 L262 62 L228 124 Z" fill={coat} />
      <ellipse cx="200" cy="122" rx="26" ry="20" fill={light} />
      {/* head */}
      <circle cx="240" cy="50" r="31" fill={coat} />
      <rect x="248" y="47" width="46" height="28" rx="14" fill={light} />
      <ellipse cx="291" cy="53" rx="7" ry="5.5" fill={ILLO.ink} />
      <path d="M268 70 Q278 75 288 69" fill="none" stroke={ILLO.ink} strokeWidth="2" strokeLinecap="round" />
      <path d="M226 26 Q206 38 212 76 Q226 84 235 66 Q240 42 226 26 Z" fill={shade} />
      <circle cx="254" cy="41" r="3.8" fill={ILLO.ink} />
      <circle cx="255.4" cy="39.6" r="1.1" fill={ILLO.white} />
      {/* collar and tag */}
      <path d="M212 70 Q222 94 248 80" fill="none" stroke={ILLO.ink} strokeWidth="7" strokeLinecap="round" />
      <circle cx="230" cy="95" r="5.5" fill={ILLO.yellow} stroke={ILLO.ink} strokeWidth="1.6" />
    </g>
  );
}
