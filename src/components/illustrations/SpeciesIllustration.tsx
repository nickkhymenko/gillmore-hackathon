import type { ReactNode } from "react";
import type { Species } from "@/lib/types";
import { BISCUIT_COAT } from "./DogSide";
import { ILLO } from "./palette";

type Drawn = Exclude<Species, "other">;

const eye = (cx: number, cy: number, r = 3.6) => (
  <g key={cx}>
    <circle cx={cx} cy={cy} r={r} fill={ILLO.ink} />
    <circle cx={cx + r * 0.35} cy={cy - r * 0.35} r={r * 0.3} fill={ILLO.white} />
  </g>
);

function Dog() {
  const { coat, shade, light } = BISCUIT_COAT;
  return (
    <>
      <path d="M152 204 Q188 200 184 166" fill="none" stroke={shade} strokeWidth="11" strokeLinecap="round" />
      <ellipse cx="120" cy="180" rx="48" ry="44" fill={coat} />
      <ellipse cx="120" cy="168" rx="22" ry="32" fill={light} />
      <rect x="100" y="170" width="15" height="50" rx="7.5" fill={coat} />
      <rect x="125" y="170" width="15" height="50" rx="7.5" fill={coat} />
      <ellipse cx="107" cy="219" rx="11" ry="6" fill={light} />
      <ellipse cx="133" cy="219" rx="11" ry="6" fill={light} />
      <circle cx="120" cy="100" r="34" fill={coat} />
      <ellipse cx="87" cy="106" rx="11" ry="23" fill={shade} transform="rotate(14 87 106)" />
      <ellipse cx="153" cy="106" rx="11" ry="23" fill={shade} transform="rotate(-14 153 106)" />
      <ellipse cx="120" cy="117" rx="17" ry="13" fill={light} />
      <ellipse cx="120" cy="109" rx="6" ry="4.5" fill={ILLO.ink} />
      <path d="M120 113 V118 M113 121 Q120 126 127 121" fill="none" stroke={ILLO.ink} strokeWidth="2" strokeLinecap="round" />
      {eye(107, 95)}
      {eye(133, 95)}
      <path d="M97 133 Q120 148 143 133" fill="none" stroke={ILLO.ink} strokeWidth="6" strokeLinecap="round" />
      <circle cx="120" cy="146" r="5" fill={ILLO.yellow} stroke={ILLO.ink} strokeWidth="1.5" />
    </>
  );
}

function Cat() {
  const coat = "#D9A066";
  const shade = "#B57B45";
  const light = "#F6E3C4";
  return (
    <>
      <path d="M150 214 Q196 210 190 162 Q187 142 172 148" fill="none" stroke={coat} strokeWidth="10" strokeLinecap="round" />
      <ellipse cx="120" cy="182" rx="40" ry="42" fill={coat} />
      <ellipse cx="120" cy="174" rx="18" ry="28" fill={light} />
      <rect x="104" y="178" width="12" height="42" rx="6" fill={coat} />
      <rect x="124" y="178" width="12" height="42" rx="6" fill={coat} />
      <ellipse cx="110" cy="219" rx="9" ry="5" fill={light} />
      <ellipse cx="130" cy="219" rx="9" ry="5" fill={light} />
      <path d="M90 96 L94 60 L118 82 Z M150 96 L146 60 L122 82 Z" fill={coat} strokeLinejoin="round" stroke={coat} strokeWidth="4" />
      <path d="M96 86 L98 68 L110 80 Z M144 86 L142 68 L130 80 Z" fill={ILLO.pink} />
      <ellipse cx="120" cy="106" rx="33" ry="29" fill={coat} />
      <path d="M120 80 V92 M111 82 L113 91 M129 82 L127 91" fill="none" stroke={shade} strokeWidth="3" strokeLinecap="round" />
      <ellipse cx="120" cy="119" rx="14" ry="9" fill={light} />
      <path d="M116 113 H124 L120 118 Z" fill={ILLO.pink} />
      <path d="M100 118 H80 M100 123 L82 128 M140 118 H160 M140 123 L158 128" stroke={ILLO.ink} strokeWidth="1.2" strokeLinecap="round" />
      {[107, 133].map((cx) => (
        <g key={cx}>
          <ellipse cx={cx} cy="102" rx="5" ry="4.4" fill={ILLO.yellow} />
          <ellipse cx={cx} cy="102" rx="1.6" ry="3.6" fill={ILLO.ink} />
        </g>
      ))}
    </>
  );
}

function Rabbit() {
  const coat = "#F4EADB";
  const patch = "#D9A066";
  return (
    <>
      <ellipse cx="106" cy="74" rx="10" ry="34" fill={coat} transform="rotate(-8 106 74)" />
      <ellipse cx="134" cy="74" rx="10" ry="34" fill={patch} transform="rotate(8 134 74)" />
      <ellipse cx="106" cy="78" rx="4.5" ry="24" fill={ILLO.pink} transform="rotate(-8 106 78)" />
      <ellipse cx="134" cy="78" rx="4.5" ry="24" fill={ILLO.pink} transform="rotate(8 134 78)" />
      <circle cx="170" cy="198" r="11" fill={ILLO.white} />
      <ellipse cx="120" cy="186" rx="50" ry="38" fill={coat} />
      <ellipse cx="146" cy="180" rx="20" ry="18" fill={patch} />
      <ellipse cx="102" cy="220" rx="13" ry="7" fill={coat} />
      <ellipse cx="138" cy="220" rx="13" ry="7" fill={coat} />
      <ellipse cx="120" cy="126" rx="31" ry="28" fill={coat} />
      <ellipse cx="134" cy="120" rx="12" ry="12" fill={patch} />
      <ellipse cx="120" cy="134" rx="4" ry="3" fill={ILLO.pink} />
      <path d="M120 137 V141 M115 143 Q120 146 125 143" fill="none" stroke={ILLO.ink} strokeWidth="1.6" strokeLinecap="round" />
      {eye(108, 121)}
      {eye(132, 121)}
    </>
  );
}

function Horse() {
  const coat = "#A86B45";
  const mane = "#4A3426";
  const muzzle = "#C78A5E";
  return (
    <>
      <path d="M84 240 Q86 160 108 118 L150 118 Q166 170 172 240 Z" fill={coat} />
      <path d="M110 96 Q84 140 80 240 L96 240 Q98 160 120 112 Z" fill={mane} />
      <path d="M101 74 L97 40 L116 62 Z M139 74 L143 40 L124 62 Z" fill={coat} strokeLinejoin="round" stroke={coat} strokeWidth="4" />
      <rect x="96" y="62" width="48" height="108" rx="24" fill={coat} />
      <ellipse cx="120" cy="166" rx="23" ry="18" fill={muzzle} />
      <path d="M116 84 H124 L127 150 Q120 156 113 150 Z" fill={ILLO.cream} />
      <path d="M106 66 Q120 56 134 66 Q128 86 120 80 Q112 86 106 66 Z" fill={mane} />
      <ellipse cx="112" cy="170" rx="2.6" ry="3.8" fill={mane} />
      <ellipse cx="128" cy="170" rx="2.6" ry="3.8" fill={mane} />
      {eye(102, 100, 4)}
      {eye(138, 100, 4)}
    </>
  );
}

const DRAW: Record<Drawn, () => ReactNode> = { dog: Dog, cat: Cat, rabbit: Rabbit, horse: Horse };

/** A sitting (or, for the horse, head-and-shoulders) portrait in front of a sandstone arch. Decorative by default. */
export function SpeciesIllustration({ species, className = "", title }: { species: Drawn; className?: string; title?: string }) {
  const Draw = DRAW[species];
  return (
    <svg viewBox="0 0 240 240" className={className} {...(title ? { role: "img", "aria-label": title } : { "aria-hidden": true })}>
      <rect width="240" height="240" fill={ILLO.cream} />
      <path d="M40 240 V122 A80 80 0 0 1 200 122 V240 Z" fill={ILLO.sand} />
      <rect y="224" width="240" height="16" fill={ILLO.sandstone} />
      <Draw />
    </svg>
  );
}
