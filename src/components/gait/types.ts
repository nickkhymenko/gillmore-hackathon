/** Keypoints exported by ml/gait/export_web.py (DeepLabCut SuperAnimal-Quadruped, run offline). */
export type Point = [x: number, y: number, p: number] | null;

export type Series = { t: number[]; y: number[]; troughs: number[] } | null;

export type GaitClip = {
  id: string;
  species: "dog" | "cat";
  title: string;
  source: string;
  fps: number;
  width: number;
  height: number;
  /** where the analysed segment starts in the original file, seconds */
  start: number;
  duration: number;
  /** size of the owner's original upload, used to recognise it */
  bytes: number | null;
  sample: string | null;
  bodyparts: string[];
  frames: Point[][];
  result: {
    healthy: boolean;
    finding: string;
    area: string | null;
    key: "head" | "pelvis" | null;
    head_asym: number | null;
    pelvis_asym: number | null;
    model_light: string;
    model_limb: string | null;
  };
  signals: { head: Series; pelvis: Series };
};

export type ClipIndexRow = {
  id: string;
  species: "dog" | "cat";
  title: string;
  bytes: number | null;
  sample: string | null;
  thumb: string | null;
  healthy: boolean;
  area: string | null;
  source: string;
  duration: number;
};

/** Bones drawn between SuperAnimal keypoints. Left limbs use the accent colour. */
export const BONES: [string, string][] = [
  ["nose", "left_eye"],
  ["left_eye", "left_earbase"],
  ["nose", "right_eye"],
  ["right_eye", "right_earbase"],
  ["left_earbase", "neck_base"],
  ["right_earbase", "neck_base"],
  ["neck_base", "back_middle"],
  ["back_middle", "tail_base"],
  ["tail_base", "tail_end"],
  ["neck_base", "front_left_thai"],
  ["front_left_thai", "front_left_knee"],
  ["front_left_knee", "front_left_paw"],
  ["neck_base", "front_right_thai"],
  ["front_right_thai", "front_right_knee"],
  ["front_right_knee", "front_right_paw"],
  ["tail_base", "back_left_thai"],
  ["back_left_thai", "back_left_knee"],
  ["back_left_knee", "back_left_paw"],
  ["tail_base", "back_right_thai"],
  ["back_right_thai", "back_right_knee"],
  ["back_right_knee", "back_right_paw"],
];
