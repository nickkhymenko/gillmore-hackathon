import { useId, type ReactNode } from "react";
import { darken, isHex, lighten, luminance, hexToRgb, mix } from "@/lib/palette";
import { SIZE_THEME, SPECIES_THEME } from "@/lib/theme";
import type { TwinProfile } from "@/lib/types";

export type AvatarTraits = Pick<TwinProfile, "species" | "sizeClass" | "coatColours" | "coatPattern" | "earShape" | "muzzle">;

export const DEFAULT_TRAITS: AvatarTraits = {
  species: "dog",
  sizeClass: "medium",
  coatColours: [],
  coatPattern: "solid",
  earShape: "floppy",
  muzzle: "medium",
};

type Parts = {
  /** Drawn behind the head (upright ears, manes). */
  back?: ReactNode;
  /** Head silhouette, also used as the clip for coat patterns. */
  head: ReactNode;
  /** Coat pattern, clipped to the head. */
  pattern?: ReactNode;
  /** Drawn over the head (floppy ears, muzzle, nose). */
  front: ReactNode;
  eyes: { x: number; y: number; r: number; iris: string; slit?: boolean };
  chest: { rx: number; patch: boolean };
};

const NOSE = "#2A2422";

/**
 * A flat illustrated portrait assembled from parts, driven by the Pet Twin profile:
 * head shape by muzzle, ears by ear shape, coat colours and pattern, scale by size class.
 * No image generation. Blinks every few seconds and twitches an ear on hover (see globals.css);
 * static when the user prefers reduced motion.
 */
export function PetAvatar({
  traits = DEFAULT_TRAITS,
  size = 96,
  title,
  animated = true,
  ring = true,
  className = "",
  collar = false,
}: {
  /** true: a plain collar; "companion": the collar with the Walk Companion tag on it. */
  collar?: boolean | "companion";
  traits?: AvatarTraits;
  size?: number;
  title?: string;
  animated?: boolean;
  ring?: boolean;
  className?: string;
}) {
  const uid = useId().replace(/[^a-zA-Z0-9]/g, "");
  const fallback = SPECIES_THEME[traits.species].coat;
  const coat = traits.coatColours.filter(isHex);
  const c1 = coat[0] ?? fallback[0];
  const isDark = luminance(hexToRgb(c1)) < 0.08;
  const c2 = coat[1] ?? (traits.coatPattern === "solid" ? lighten(c1, isDark ? 0.22 : 0.3) : fallback[1]);
  const shade = isDark ? lighten(c1, 0.14) : darken(c1, 0.2);
  const stripe = isDark ? lighten(c1, 0.22) : darken(c1, 0.38);
  const innerEar = mix(c1, "#E9B7AA", 0.6);
  const scale = SIZE_THEME[traits.sizeClass].scale;
  // Bicolour reads differently by direction: a lighter second colour is a blaze, muzzle and chest;
  // a darker one sits on the ears and as a mask or cap.
  const c2Darker = luminance(hexToRgb(c2)) < luminance(hexToRgb(c1));
  const ink: Ink = { c1, c2, shade, stripe, innerEar, c2Darker };

  const p =
    traits.species === "cat"
      ? cat(traits, ink)
      : traits.species === "rabbit"
        ? rabbit(traits, ink)
        : traits.species === "horse"
          ? horse(traits, ink)
          : dog(traits, ink);

  const e = p.eyes;
  const eye = (cx: number) => (
    <g key={cx}>
      <ellipse cx={cx} cy={e.y} rx={e.r} ry={e.slit ? e.r * 0.86 : e.r} fill={e.iris} />
      {e.slit ? <ellipse cx={cx} cy={e.y} rx={e.r * 0.3} ry={e.r * 0.74} fill="#141414" /> : <circle cx={cx} cy={e.y} r={e.r * 0.62} fill="#141414" />}
      <circle cx={cx + e.r * 0.3} cy={e.y - e.r * 0.34} r={e.r * 0.24} fill="#FFFFFF" />
    </g>
  );

  return (
    <svg
      viewBox="0 0 120 120"
      width={size}
      height={size}
      {...(title === "" ? { "aria-hidden": true } : { role: "img", "aria-label": title ?? `Illustrated ${SPECIES_THEME[traits.species].label.toLowerCase()} avatar` })}
      className={`pet-avatar shrink-0 ${animated ? "pet-avatar-live" : ""} ${className}`}
    >
      <defs>
        <clipPath id={`${uid}-frame`}>
          <circle cx="60" cy="60" r="58" />
        </clipPath>
        <clipPath id={`${uid}-head`}>{p.head}</clipPath>
      </defs>
      {ring && <circle cx="60" cy="60" r="58" fill="var(--accent-soft)" />}
      <g clipPath={ring ? `url(#${uid}-frame)` : undefined}>
        <g transform={`translate(60 70) scale(${scale}) translate(-60 -70)`}>
          {/* shoulders */}
          <ellipse cx="60" cy="124" rx={p.chest.rx} ry="26" fill={c1} />
          {((p.chest.patch && !c2Darker) || traits.coatPattern === "tuxedo") && <ellipse cx="60" cy="124" rx={p.chest.rx * 0.45} ry="24" fill={c2} />}
          {p.back}
          <g fill={c1}>{p.head}</g>
          {p.pattern && <g clipPath={`url(#${uid}-head)`}>{p.pattern}</g>}
          {p.front}
          <g className="pet-eyes">
            {eye(60 - e.x)}
            {eye(60 + e.x)}
          </g>
          {collar && (
            <g aria-hidden>
              <path d={`M${60 - p.chest.rx * 0.62} ${COLLAR_Y[traits.species]} Q60 ${COLLAR_Y[traits.species] + 9} ${60 + p.chest.rx * 0.62} ${COLLAR_Y[traits.species]}`} fill="none" stroke="var(--dark)" strokeWidth="6" strokeLinecap="round" />
              {collar === "companion" ? (
                <CompanionOnCollar y={COLLAR_Y[traits.species] + 3} />
              ) : (
                <rect x="55" y={COLLAR_Y[traits.species] + 3} width="10" height="8" rx="2" fill="var(--accent)" stroke="var(--dark)" strokeWidth="1.5" />
              )}
            </g>
          )}
        </g>
      </g>
    </svg>
  );
}

/** The Walk Companion tag hanging from the collar: a small white tag with a paw mark and the status light. */
function CompanionOnCollar({ y }: { y: number }) {
  return (
    <g data-testid="avatar-companion">
      <rect x="56.5" y={y - 2} width="7" height="5" rx="1.6" fill="#D9D4C9" stroke="var(--dark)" strokeWidth="0.8" />
      <rect x="52" y={y + 2} width="16" height="15" rx="5" fill="#FFFFFF" stroke="var(--dark)" strokeOpacity="0.35" strokeWidth="1" />
      <g transform={`translate(60 ${y + 9}) scale(0.42)`} fill="#141414">
        <path d="M0 0 C-5 0 -7.5 4 -6.5 6.5 C-5.5 9 -2 8 0 8 C2 8 5.5 9 6.5 6.5 C7.5 4 5 0 0 0 Z" />
        <ellipse cx="-6.8" cy="-3" rx="2" ry="2.8" transform="rotate(-20 -6.8 -3)" />
        <ellipse cx="-2.4" cy="-6.6" rx="2" ry="2.9" />
        <ellipse cx="2.4" cy="-6.6" rx="2" ry="2.9" />
        <ellipse cx="6.8" cy="-3" rx="2" ry="2.8" transform="rotate(20 6.8 -3)" />
      </g>
      <circle cx="60" cy={y + 14.2} r="1.2" fill="var(--accent)" stroke="#141414" strokeOpacity="0.3" strokeWidth="0.4" />
    </g>
  );
}

/** Where the collar sits for each species (just under the head). */
const COLLAR_Y: Record<AvatarTraits["species"], number> = { dog: 99, cat: 95, rabbit: 99, horse: 107, other: 99 };

type Ink = { c1: string; c2: string; shade: string; stripe: string; innerEar: string; c2Darker: boolean };

/** Shared coat patterns, drawn in head space and clipped to the head. */
function coatPattern(t: AvatarTraits, ink: Ink, cy: number, spread: number): ReactNode {
  switch (t.coatPattern) {
    case "bicolour":
      return ink.c2Darker ? (
        <g fill={ink.c2}>
          <ellipse cx={60 - spread - 5} cy={cy - 17} rx="17" ry="17" />
          <ellipse cx={60 + spread + 5} cy={cy - 17} rx="17" ry="17" />
        </g>
      ) : (
        <path d={`M60 ${cy - 34} C 52 ${cy - 14}, 50 ${cy + 4}, 44 ${cy + 40} L 76 ${cy + 40} C 70 ${cy + 4}, 68 ${cy - 14}, 60 ${cy - 34} Z`} fill={ink.c2} />
      );
    case "tuxedo":
      return <path d={`M60 ${cy + 2} C 50 ${cy + 8}, 42 ${cy + 20}, 40 ${cy + 44} L 80 ${cy + 44} C 78 ${cy + 20}, 70 ${cy + 8}, 60 ${cy + 2} Z`} fill={ink.c2} />;
    case "spots":
      return (
        <g fill={ink.c2 === ink.c1 ? ink.shade : ink.c2}>
          <ellipse cx={60 - spread - 6} cy={cy - 14} rx="5" ry="6" />
          <circle cx={60 + spread + 8} cy={cy - 2} r="3.6" />
          <circle cx={60 + spread * 0.4} cy={cy - 24} r="3.2" />
          <circle cx={60 - spread * 0.3} cy={cy - 17} r="2.2" />
          <circle cx={60 - spread - 12} cy={cy + 8} r="2.8" />
          <circle cx={60 + spread + 2} cy={cy - 17} r="2.4" />
          <circle cx={60 + spread + 13} cy={cy + 12} r="2.2" />
        </g>
      );
    case "tabby":
      return (
        <g fill="none" stroke={ink.stripe} strokeWidth="3" strokeLinecap="round">
          <path d={`M60 ${cy - 30} V ${cy - 17}`} />
          <path d={`M52 ${cy - 28} Q 51 ${cy - 21} 53 ${cy - 16}`} />
          <path d={`M68 ${cy - 28} Q 69 ${cy - 21} 67 ${cy - 16}`} />
          <path d={`M${60 - spread - 12} ${cy + 2} h 10`} />
          <path d={`M${60 - spread - 11} ${cy + 9} h 9`} />
          <path d={`M${60 + spread + 12} ${cy + 2} h -10`} />
          <path d={`M${60 + spread + 11} ${cy + 9} h -9`} />
        </g>
      );
    default:
      return null;
  }
}

const mirror = (node: ReactNode) => <g transform="translate(120 0) scale(-1 1)">{node}</g>;

function dog(t: AvatarTraits, ink: Ink): Parts {
  const g = {
    short: { rx: 34, ry: 31, cy: 62, sCy: 75, sRx: 16, sRy: 11, eyeX: 14 },
    medium: { rx: 31, ry: 32, cy: 60, sCy: 77, sRx: 14, sRy: 13, eyeX: 12.5 },
    long: { rx: 28, ry: 31, cy: 56, sCy: 80, sRx: 12, sRy: 18, eyeX: 11 },
  }[t.muzzle];
  const left = 60 - g.rx;
  const plain = t.coatPattern === "solid" || t.coatPattern === "spots" || t.coatPattern === "tabby";
  const snout = plain ? lighten(ink.c1, 0.18) : ink.c2;
  const mask = t.coatPattern === "bicolour" && ink.c2Darker;
  const earFill = mask ? ink.c2 : ink.shade;
  const nose = mask ? lighten(ink.c2, 0.22) : NOSE;
  const noseY = g.sCy - g.sRy * 0.42;

  const upright = (
    <g className="pet-ear pet-ear-l">
      <path d={`M${left + 3} ${g.cy - 12} L ${left + 8} ${g.cy - 46} L ${left + 27} ${g.cy - 26} Z`} fill={earFill} strokeLinejoin="round" stroke={earFill} strokeWidth="3" />
      <path d={`M${left + 9} ${g.cy - 18} L ${left + 11} ${g.cy - 37} L ${left + 21} ${g.cy - 26} Z`} fill={ink.innerEar} />
    </g>
  );
  const semi = (
    <g className="pet-ear pet-ear-l">
      <path d={`M${left + 3} ${g.cy - 12} L ${left + 7} ${g.cy - 38} L ${left + 27} ${g.cy - 26} Z`} fill={earFill} strokeLinejoin="round" stroke={earFill} strokeWidth="3" />
      <path d={`M${left + 7} ${g.cy - 38} L ${left + 21} ${g.cy - 31} L ${left + 5} ${g.cy - 23} Z`} fill={darken(earFill, 0.12)} strokeLinejoin="round" stroke={darken(earFill, 0.12)} strokeWidth="2" />
    </g>
  );
  const floppy = (
    <g className="pet-ear pet-ear-l">
      <ellipse cx={left + 3} cy={g.cy + 2} rx="10.5" ry="22" transform={`rotate(14 ${left + 3} ${g.cy - 18})`} fill={earFill} />
    </g>
  );

  return {
    back: t.earShape === "floppy" ? null : <>{t.earShape === "upright" ? upright : semi}{mirror(t.earShape === "upright" ? upright : semi)}</>,
    head: <ellipse cx="60" cy={g.cy} rx={g.rx} ry={g.ry} />,
    pattern: mask ? null : coatPattern(t, ink, g.cy, g.eyeX),
    front: (
      <>
        {t.earShape === "floppy" && <>{floppy}{mirror(floppy)}</>}
        <ellipse cx="60" cy={g.sCy} rx={g.sRx} ry={g.sRy} fill={snout} />
        <ellipse cx="60" cy={noseY} rx="5.4" ry="3.8" fill={nose} />
        <path d={`M60 ${noseY + 3.5} v 4 M60 ${noseY + 7.5} q -4 4 -8 1.5 M60 ${noseY + 7.5} q 4 4 8 1.5`} fill="none" stroke={nose} strokeWidth="1.6" strokeLinecap="round" />
      </>
    ),
    eyes: { x: g.eyeX, y: g.cy - 5, r: 3.7, iris: "#7A4A21" },
    chest: { rx: 36, patch: t.coatPattern === "bicolour" },
  };
}

function cat(t: AvatarTraits, ink: Ink): Parts {
  const cy = 64;
  const rx = t.muzzle === "short" ? 35 : 33;
  const left = 60 - rx;
  const cap = t.coatPattern === "bicolour" && ink.c2Darker;
  const muzzle = cap || t.coatPattern === "solid" || t.coatPattern === "tabby" || t.coatPattern === "spots" ? lighten(ink.c1, 0.2) : ink.c2;
  const earFill = cap ? ink.c2 : ink.c1;
  const ear =
    t.earShape === "floppy" ? (
      <g className="pet-ear pet-ear-l">
        <path d={`M${left + 4} ${cy - 16} L ${left + 10} ${cy - 30} L ${left + 26} ${cy - 25} Z`} fill={ink.shade} stroke={ink.shade} strokeWidth="3" strokeLinejoin="round" />
      </g>
    ) : (
      <g className="pet-ear pet-ear-l">
        <path d={`M${left + 2} ${cy - 10} L ${left + 5} ${cy - 46} L ${left + 29} ${cy - 25} Z`} fill={earFill} stroke={earFill} strokeWidth="3" strokeLinejoin="round" />
        <path d={`M${left + 8} ${cy - 19} L ${left + 9} ${cy - 37} L ${left + 22} ${cy - 25} Z`} fill={ink.innerEar} />
      </g>
    );
  return {
    back: <>{ear}{mirror(ear)}</>,
    head: <ellipse cx="60" cy={cy} rx={rx} ry="29" />,
    pattern: coatPattern(t, ink, cy, 15),
    front: (
      <>
        <circle cx="54.5" cy={cy + 13} r="6.5" fill={muzzle} />
        <circle cx="65.5" cy={cy + 13} r="6.5" fill={muzzle} />
        <path d={`M56.6 ${cy + 7} h 6.8 l -3.4 4 Z`} fill="#D98C8C" stroke="#D98C8C" strokeWidth="1" strokeLinejoin="round" />
        <g fill="none" stroke={ink.stripe} strokeWidth="0.9" strokeLinecap="round" opacity="0.7">
          <path d={`M47 ${cy + 12} h -15 M47 ${cy + 15} l -14 4 M73 ${cy + 12} h 15 M73 ${cy + 15} l 14 4`} />
        </g>
      </>
    ),
    eyes: { x: 14, y: cy - 3, r: 5, iris: "#9CB55B", slit: true },
    chest: { rx: 30, patch: t.coatPattern === "bicolour" },
  };
}

function rabbit(t: AvatarTraits, ink: Ink): Parts {
  const cy = 72;
  const earFill = t.coatPattern === "bicolour" && ink.c2Darker ? ink.c2 : null;
  const ear =
    t.earShape === "floppy" ? (
      <g className="pet-ear pet-ear-l">
        <ellipse cx="31" cy={cy + 8} rx="8.5" ry="25" transform={`rotate(8 31 ${cy - 16})`} fill={earFill ?? ink.shade} />
      </g>
    ) : (
      <g className="pet-ear pet-ear-l">
        <ellipse cx="47" cy="34" rx="8.5" ry="27" transform={`rotate(${t.earShape === "semi" ? -20 : -7} 47 58)`} fill={earFill ?? ink.c1} />
        <ellipse cx="47" cy="36" rx="4" ry="20" transform={`rotate(${t.earShape === "semi" ? -20 : -7} 47 58)`} fill={ink.innerEar} />
      </g>
    );
  const cheeks = earFill || t.coatPattern === "solid" || t.coatPattern === "spots" || t.coatPattern === "tabby" ? lighten(ink.c1, 0.22) : ink.c2;
  return {
    back: t.earShape === "floppy" ? null : <>{ear}{mirror(ear)}</>,
    head: <ellipse cx="60" cy={cy} rx="27" ry="26" />,
    pattern: coatPattern(t, ink, cy, 12),
    front: (
      <>
        {t.earShape === "floppy" && <>{ear}{mirror(ear)}</>}
        <circle cx="54" cy={cy + 12} r="7.5" fill={cheeks} />
        <circle cx="66" cy={cy + 12} r="7.5" fill={cheeks} />
        <rect x="57.6" y={cy + 14} width="4.8" height="5.5" rx="1.2" fill="#FFFFFF" stroke="#D8D2C8" strokeWidth="0.6" />
        <path d={`M57 ${cy + 6} h 6 l -3 3.6 Z`} fill="#D98C8C" stroke="#D98C8C" strokeWidth="1" strokeLinejoin="round" />
      </>
    ),
    eyes: { x: 13, y: cy - 4, r: 3.6, iris: "#3A2A22" },
    chest: { rx: 28, patch: false },
  };
}

function horse(t: AvatarTraits, ink: Ink): Parts {
  const mane = darken(ink.c1, 0.5);
  const ear = (
    <g className="pet-ear pet-ear-l">
      <path d="M42 36 L 44 12 L 56 30 Z" fill={ink.c1} stroke={ink.c1} strokeWidth="3" strokeLinejoin="round" />
      <path d="M46 31 L 46.5 20 L 52 29 Z" fill={ink.innerEar} />
    </g>
  );
  const isDark = luminance(hexToRgb(ink.c1)) < 0.08;
  const soft = isDark ? lighten(ink.c1, 0.2) : darken(ink.c1, 0.22);
  const muzzle = (t.coatPattern === "bicolour" && !ink.c2Darker) || t.coatPattern === "tuxedo" ? ink.c2 : soft;
  return {
    back: (
      <>
        <path d="M78 34 C 96 44, 100 78, 92 112 L 74 112 Z" fill={mane} />
        {ear}
        {mirror(ear)}
      </>
    ),
    head: <path d="M60 24 C 80 24, 84 44, 80 62 C 77 78, 76 86, 75 94 C 74 106, 46 106, 45 94 C 44 86, 43 78, 40 62 C 36 44, 40 24, 60 24 Z" />,
    pattern:
      t.coatPattern === "solid" || (t.coatPattern === "bicolour" && ink.c2Darker) ? null : t.coatPattern === "spots" ? (
        coatPattern(t, ink, 56, 12)
      ) : (
        <path d="M60 26 C 55 40, 55 70, 53 104 L 67 104 C 65 70, 65 40, 60 26 Z" fill={ink.c2} />
      ),
    front: (
      <>
        <ellipse cx="60" cy="93" rx="15.5" ry="12.5" fill={muzzle} />
        <ellipse cx="54" cy="94" rx="2.2" ry="3.2" fill={NOSE} />
        <ellipse cx="66" cy="94" rx="2.2" ry="3.2" fill={NOSE} />
        <path d="M50 36 C 54 22, 66 22, 68 34 C 64 44, 56 46, 50 36 Z" fill={mane} />
      </>
    ),
    eyes: { x: 15.5, y: 54, r: 3.8, iris: "#6B4423" },
    chest: { rx: 30, patch: false },
  };
}
