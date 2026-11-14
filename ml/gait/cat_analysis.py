"""Cat mobility checks: walk (head/pelvis + stance time) and jump.

Input : per-frame 2D keypoints of one cat filmed side-on (DeepLabCut
        SuperAnimal-Quadruped names), {bodypart: (x[n], y[n], likelihood[n])},
        pixels, image y pointing down.
Output: traffic light + plain-English owner message. Screening only, NOT a diagnosis.

Why cats need more than the dog check (see research/cat-gait-literature.md):
- Cats with joint disease rarely limp visibly. Instead they shift weight off the
  sore limb: that limb carries LESS weight but stays on the ground LONGER
  (Stadig, Lascelles & Bergh 2016, Acta Vet Scand 58). -> stance-time asymmetry.
- Owners notice that cats stop jumping, hesitate or climb in stages
  (FMPI, Benito et al. 2013; Godfrey 2002; Slingerland et al. 2011). -> jump check.

Checks
1. analyse_stance: a paw is "in stance" while its horizontal speed is near zero
   (below STANCE_SPEED_FRAC x the body's walking speed, both in body lengths/s).
   Mean stance duration per paw; left/right asymmetry index for the front pair and
   the hind pair: |L - R| / mean(L, R) x 100 %. The side with the LONGER stance is
   the suspected limb.
2. analyse_jump: body centre = mean of withers (neck_base/back_base) and tail_base,
   vertical position in body lengths.
   - take-off  = start of the first fast rise (upward speed > RISE_SPEED_BL).
   - landing   = end of the last rise, once the centre settles on a higher plateau.
   - stages    = separate fast rises with a pause of >= PAUSE_MIN_S between them.
   - hesitation = length of the period just before take-off in which the cat is
     still (centre speed < STILL_SPEED_BL) or crouched (centre lowered by more than
     CROUCH_DROP_BL below its standing height). Counted back from take-off until the
     cat was last walking upright, or to the start of the clip.
     Standing height = 90th percentile of centre height before take-off, so the clip
     should start with the cat walking or standing.
   - aborted attempt = a crouch (>= MIN_CROUCH_S) after which the cat stands up
     again without taking off.
   - hind push-off difference = gap between the times the two hind paws lift off.
3. analyse_cat: combines the above into one result.

All thresholds marked PLACEHOLDER must be calibrated on real cat videos.
"""
from __future__ import annotations

from dataclasses import dataclass, field

import numpy as np
from scipy.signal import savgol_filter

from gait_analysis import (SUPERANIMAL_QUADRUPED, GaitResult, _fill, _pick,
                           _smooth, analyse_gait)

ORDER = {"retake": 0, "green": 1, "amber": 2, "red": 3}
PAWS = ("front_left", "front_right", "hind_left", "hind_right")
DISCLAIMER = "This is a warning, not a diagnosis."

# --- stance thresholds (PLACEHOLDERS - calibrate on real videos) -------------
STANCE_SPEED_FRAC = 0.3      # paw slower than 30% of body speed = on the ground
MIN_STANCE_S = 0.08          # shorter "stances" are tracking noise
MAX_STANCE_S = 2.0           # longer = cat stopped, not a walking stance
MIN_STANCES_PER_PAW = 3
MIN_WALK_SPEED_BL = 0.2      # body lengths / s
STANCE_GREEN_MAX = 10.0      # % stance-duration asymmetry
STANCE_AMBER_MAX = 20.0

# --- jump thresholds (PLACEHOLDERS - calibrate on real videos) ---------------
MIN_CLIP_S = 1.5
RISE_SPEED_BL = 1.0          # upward speed counted as "jumping/climbing", BL/s
MIN_STAGE_RISE_BL = 0.2      # a rise smaller than this is not a stage
MIN_JUMP_RISE_BL = 0.5       # total rise needed to call it a jump
PAUSE_MIN_S = 0.15           # pause between rises that makes it a two-stage climb
SETTLE_SPEED_BL = 0.5        # |vertical speed| below this = landed / settled
STILL_SPEED_BL = 0.3         # centre speed below this = standing still
CROUCH_DROP_BL = 0.08        # centre lowered this much below standing = crouched
MIN_CROUCH_S = 0.3
ABORT_GAP_S = 0.5            # crouch ending this long before take-off = aborted
LIFT_HEIGHT_BL = 0.05        # paw this far above its ground level = lifted off
HESITATION_GREEN_MAX_S = 1.5
HESITATION_AMBER_MAX_S = 3.0
PUSH_OFF_DIFF_MAX_S = 0.06


# ---------------------------------------------------------------------------
# Result types
# ---------------------------------------------------------------------------
@dataclass
class StanceResult:
    mean_stance_s: dict            # paw -> mean stance duration (s), nan if unknown
    n_stances: dict                # paw -> number of complete stances used
    stances: dict                  # paw -> list of (start_s, end_s)
    front_asymmetry: float         # % (nan if not enough stances)
    hind_asymmetry: float          # %
    front_hind_ratio: float        # mean front stance / mean hind stance
    suspected_limb: str | None     # e.g. "hind left" (side with the longer stance)
    light: str                     # green / amber / red / retake
    body_speed: float              # body lengths per second
    warnings: list = field(default_factory=list)


@dataclass
class JumpResult:
    light: str                     # green / amber / red / retake
    message: str
    jumped: bool
    takeoff_s: float               # nan if no jump
    landing_s: float
    hesitation_s: float            # still/crouched time before take-off
    jump_height_bl: float          # landing plateau minus standing height, body lengths
    n_stages: int                  # number of separate rises (1 = one continuous jump)
    two_stage: bool
    aborted_attempts: int
    push_off_diff_s: float         # |left - right| hind lift-off time, nan if unknown
    flags: list                    # short owner-facing findings
    t: np.ndarray                  # time (s)
    centre_up: np.ndarray          # body centre height, body lengths (up = positive)
    warnings: list = field(default_factory=list)


@dataclass
class CatResult:
    mode: str                      # "walk" or "jump"
    light: str
    suspected_limb: str | None
    message: str
    gait: GaitResult | None = None
    stance: StanceResult | None = None
    jump: JumpResult | None = None
    warnings: list = field(default_factory=list)


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------
def _role(kps: dict, mapping: dict, role: str, fps: float):
    names = mapping.get(role)
    if not names:
        return None
    p = _pick(kps, names)
    if p is None:
        return None
    max_gap = int(round(fps * 0.2))
    return _smooth(_fill(p[0], max_gap), fps), _smooth(_fill(p[1], max_gap), fps)


def _body_and_scale(kps, fps, mapping, warnings):
    withers = _role(kps, mapping, "withers", fps)
    pelvis = _role(kps, mapping, "pelvis", fps)
    if pelvis is None:
        raise ValueError("Tail base keypoint missing - check the keypoint mapping.")
    if withers is None:
        withers = _role(kps, mapping, "head", fps)
    if withers is None:
        raise ValueError("Withers/head keypoints missing - check the keypoint mapping.")
    body_len = np.nanmedian(np.hypot(withers[0] - pelvis[0], withers[1] - pelvis[1]))
    if not np.isfinite(body_len) or body_len <= 0:
        body_len = 1.0
        warnings.append("Could not estimate body length; results not scale-normalised.")
    cx = (withers[0] + pelvis[0]) / 2
    cy = (withers[1] + pelvis[1]) / 2
    return cx, cy, float(body_len)


def _deriv(a: np.ndarray, fps: float, window_s: float = 0.15) -> np.ndarray:
    """Smoothed first derivative (units per second); NaN where input is NaN."""
    win = max(5, int(round(fps * window_s)) | 1)
    out = np.full(len(a), np.nan)
    good = ~np.isnan(a)
    if good.sum() > win:
        out[good] = savgol_filter(a[good], win, 2, deriv=1, delta=1.0 / fps)
    return out


def _runs(mask: np.ndarray) -> list[tuple[int, int]]:
    """Contiguous True runs as (start, end_exclusive)."""
    m = np.concatenate([[False], np.asarray(mask, bool), [False]])
    d = np.diff(m.astype(int))
    return list(zip(np.flatnonzero(d == 1), np.flatnonzero(d == -1)))


def _asym(left: float, right: float) -> float:
    if not (np.isfinite(left) and np.isfinite(right)) or left + right <= 0:
        return float("nan")
    return abs(left - right) / ((left + right) / 2) * 100


def _stance_light(index: float) -> str:
    if np.isnan(index):
        return "retake"
    if index <= STANCE_GREEN_MAX:
        return "green"
    if index <= STANCE_AMBER_MAX:
        return "amber"
    return "red"


# ---------------------------------------------------------------------------
# 1. Stance-time asymmetry
# ---------------------------------------------------------------------------
def analyse_stance(kps: dict, fps: float, mapping: dict = SUPERANIMAL_QUADRUPED) -> StanceResult:
    warnings: list = []
    cx, _, body_len = _body_and_scale(kps, fps, mapping, warnings)
    n = len(cx)
    body_speed = float(np.nanmedian(np.abs(_deriv(cx, fps)))) / body_len if n else float("nan")

    mean_s, counts, stances = {}, {}, {}
    if not np.isfinite(body_speed) or body_speed < MIN_WALK_SPEED_BL:
        warnings.append("Cat was not walking steadily - film it walking past the camera.")
        body_speed = float(body_speed) if np.isfinite(body_speed) else float("nan")
        empty = {p: float("nan") for p in PAWS}
        return StanceResult(empty, {p: 0 for p in PAWS}, {p: [] for p in PAWS},
                            float("nan"), float("nan"), float("nan"), None, "retake",
                            body_speed, warnings)

    thr = STANCE_SPEED_FRAC * body_speed
    stopped = 0
    for paw in PAWS:
        r = _role(kps, mapping, f"{paw}_paw", fps)
        if r is None:
            mean_s[paw], counts[paw], stances[paw] = float("nan"), 0, []
            warnings.append(f"{paw.replace('_', ' ')} paw not found.")
            continue
        speed = np.abs(_deriv(r[0], fps)) / body_len
        on_ground = np.where(np.isnan(speed), False, speed < thr)
        durs, spans = [], []
        for s, e in _runs(on_ground):
            if s == 0 or e == n:          # incomplete stance at clip edge
                continue
            # sub-frame start/end: interpolate where speed crosses the threshold
            a0, a1 = speed[s - 1], speed[s]
            b0, b1 = speed[e - 1], speed[e]
            start = s - 1 + ((a0 - thr) / (a0 - a1) if np.isfinite(a0) and a0 != a1 else 1.0)
            end = e - 1 + ((thr - b0) / (b1 - b0) if np.isfinite(b1) and b1 != b0 else 1.0)
            d = (end - start) / fps
            if d < MIN_STANCE_S:
                continue
            if d > MAX_STANCE_S:
                stopped += 1
                continue
            durs.append(d)
            spans.append((start / fps, end / fps))
        counts[paw] = len(durs)
        stances[paw] = spans
        mean_s[paw] = float(np.mean(durs)) if len(durs) >= MIN_STANCES_PER_PAW else float("nan")
    if stopped:
        warnings.append("The cat stopped during the clip; stops were ignored.")
    if any(counts[p] < MIN_STANCES_PER_PAW for p in PAWS):
        warnings.append(f"Fewer than {MIN_STANCES_PER_PAW} full steps seen for some paws - film a longer walk.")

    fa = _asym(mean_s["front_left"], mean_s["front_right"])
    ha = _asym(mean_s["hind_left"], mean_s["hind_right"])
    front_mean = np.nanmean([mean_s["front_left"], mean_s["front_right"]]) \
        if np.isfinite(mean_s["front_left"]) or np.isfinite(mean_s["front_right"]) else np.nan
    hind_mean = np.nanmean([mean_s["hind_left"], mean_s["hind_right"]]) \
        if np.isfinite(mean_s["hind_left"]) or np.isfinite(mean_s["hind_right"]) else np.nan
    fh = float(front_mean / hind_mean) if np.isfinite(front_mean) and np.isfinite(hind_mean) and hind_mean > 0 else float("nan")

    lights = [l for l in (_stance_light(fa), _stance_light(ha)) if l != "retake"]
    light = max(lights, key=ORDER.get) if lights else "retake"

    limb = None
    if light in ("amber", "red"):
        end = "front" if np.nan_to_num(fa) >= np.nan_to_num(ha) else "hind"
        left, right = mean_s[f"{end}_left"], mean_s[f"{end}_right"]
        limb = f"{end} {'left' if left > right else 'right'}"   # longer stance = sore side

    return StanceResult(mean_s, counts, stances, fa, ha, fh, limb, light, body_speed, warnings)


# ---------------------------------------------------------------------------
# 2. Jump check
# ---------------------------------------------------------------------------
def _jump_retake(reason, t, up, warnings, **kw) -> JumpResult:
    base = dict(jumped=False, takeoff_s=float("nan"), landing_s=float("nan"),
                hesitation_s=float("nan"), jump_height_bl=float("nan"), n_stages=0,
                two_stage=False, aborted_attempts=0, push_off_diff_s=float("nan"))
    base.update(kw)
    return JumpResult("retake", reason, flags=[], t=t, centre_up=up, warnings=warnings, **base)


def analyse_jump(kps: dict, fps: float, mapping: dict = SUPERANIMAL_QUADRUPED) -> JumpResult:
    """Side view of a cat jumping up onto a surface (sofa, bed, chair)."""
    warnings: list = []
    cx, cy, body_len = _body_and_scale(kps, fps, mapping, warnings)
    n = len(cy)
    t = np.arange(n) / fps
    up = -cy / body_len
    x = cx / body_len

    if n / fps < MIN_CLIP_S:
        return _jump_retake(f"Clip too short (under {MIN_CLIP_S:g} s). Film from the approach until the cat has settled on top.",
                            t, up, warnings)
    coverage = float(np.mean(~np.isnan(up)))
    if coverage < 0.6:
        return _jump_retake(f"Cat tracked in only {coverage:.0%} of frames. Film again with the whole cat in view.",
                            t, up, warnings)

    vy = _deriv(up, fps)
    vx = _deriv(x, fps)
    speed = np.hypot(vx, vy)

    # --- rises (fast upward movement), merged across short dips ---------------
    rising = np.where(np.isnan(vy), False, vy > RISE_SPEED_BL)
    runs = _runs(rising)
    merged: list[list[int]] = []
    for s, e in runs:
        if merged and (s - merged[-1][1]) / fps < PAUSE_MIN_S:
            merged[-1][1] = e
        else:
            merged.append([s, e])
    stages = [(s, e) for s, e in merged
              if np.nan_to_num(up[min(e, n - 1)] - up[s]) >= MIN_STAGE_RISE_BL]
    total_rise = sum(up[min(e, n - 1)] - up[s] for s, e in stages)
    jumped = bool(stages) and total_rise >= MIN_JUMP_RISE_BL

    takeoff = stages[0][0] if jumped else n
    pre = up[:takeoff]
    if np.sum(~np.isnan(pre)) < max(3, int(0.2 * fps)):
        pre = up
        if jumped:
            warnings.append("Take-off happened right at the start of the clip; start filming earlier.")
    standing = float(np.nanpercentile(pre, 90))
    lowered = np.where(np.isnan(up), False, up < standing - CROUCH_DROP_BL)

    # --- aborted attempts: crouches before take-off that end without a jump ---
    aborted, crouched_at_end = 0, False
    for s, e in _runs(lowered[:takeoff]):
        if (e - s) / fps < MIN_CROUCH_S:
            continue
        if jumped and (takeoff - e) / fps <= ABORT_GAP_S:
            continue                      # the crouch that led into the jump
        if not jumped and e == n:
            crouched_at_end = True        # still crouched when the clip ended
            continue
        aborted += 1

    if not jumped:
        if aborted == 0:
            msg = ("Still crouched when the clip ended - keep filming until the cat jumps."
                   if crouched_at_end else
                   "No jump found. Film the cat jumping onto a sofa or bed from the side.")
            return _jump_retake(msg, t, up, warnings)
        flags = ["Started to jump but did not jump" + (f" ({aborted} tries)" if aborted > 1 else "")]
        msg = (f"{flags[0]}. Cats that avoid jumping are often uncomfortable - "
               f"we recommend a vet check. {DISCLAIMER}")
        return JumpResult("red", msg, False, float("nan"), float("nan"), float("nan"),
                          float("nan"), 0, False, aborted, float("nan"), flags, t, up, warnings)

    # --- landing plateau --------------------------------------------------------
    last_end = stages[-1][1]
    settled = np.flatnonzero(np.where(np.isnan(vy[last_end:]), False,
                                      np.abs(vy[last_end:]) < SETTLE_SPEED_BL))
    if settled.size == 0:
        return _jump_retake("The clip ends before the cat has landed. Keep filming until it settles on top.",
                            t, up, warnings, jumped=True, takeoff_s=takeoff / fps)
    land = last_end + int(settled[0])
    plateau = up[land:land + max(2, int(0.3 * fps))]
    if (n - land) / fps < 0.2:
        warnings.append("Clip ends right after landing; height may be inaccurate.")
    height = float(np.nanmedian(plateau) - standing)

    # --- hesitation: still or crouched time just before take-off --------------
    i = takeoff - 1
    while i >= 0 and (lowered[i] or (np.isfinite(speed[i]) and speed[i] < STILL_SPEED_BL)):
        i -= 1
    hesitation = (takeoff - (i + 1)) / fps
    if i < 0:
        warnings.append("Cat was already waiting when filming started; hesitation may be longer.")

    # --- hind push-off symmetry -----------------------------------------------
    push_diff = float("nan")
    lifts = []
    for paw in ("hind_left", "hind_right"):
        r = _role(kps, mapping, f"{paw}_paw", fps)
        if r is None:
            lifts.append(None)
            continue
        p_up = -r[1] / body_len
        g0, g1 = max(0, takeoff - int(0.5 * fps)), max(1, takeoff - int(0.1 * fps))
        ground = np.nanmedian(p_up[g0:g1]) if np.any(~np.isnan(p_up[g0:g1])) else np.nan
        start = max(0, takeoff - int(0.3 * fps))
        above = np.flatnonzero(np.nan_to_num(p_up[start:] - ground, nan=-1) > LIFT_HEIGHT_BL)
        lifts.append((start + above[0]) / fps if above.size and np.isfinite(ground) else None)
    if None in lifts:
        warnings.append("Could not see both hind paws lift off; push-off symmetry not measured.")
    else:
        push_diff = abs(lifts[0] - lifts[1])

    # --- traffic light ------------------------------------------------------------
    flags, levels = [], []
    if hesitation > HESITATION_AMBER_MAX_S:
        flags.append(f"Hesitated before jumping ({hesitation:.1f} s)"); levels.append("red")
    elif hesitation > HESITATION_GREEN_MAX_S:
        flags.append(f"Hesitated before jumping ({hesitation:.1f} s)"); levels.append("amber")
    two_stage = len(stages) >= 2
    if two_stage:
        flags.append("Climbed in two stages" if len(stages) == 2 else f"Climbed in {len(stages)} stages")
        levels.append("amber")
    if aborted:
        flags.append(f"Started to jump but stopped first ({aborted}x)"); levels.append("amber")
    if np.isfinite(push_diff) and push_diff > PUSH_OFF_DIFF_MAX_S:
        flags.append("Hind legs pushed off unevenly"); levels.append("amber")

    if "red" in levels or len(levels) >= 2:
        light = "red"
    elif levels:
        light = "amber"
    else:
        light = "green"

    if light == "green":
        msg = "Smooth jump. Keep checking regularly."
    elif light == "amber":
        msg = (f"{'. '.join(flags)}. Film again in a few days; mention it to your vet "
               f"if it keeps happening. {DISCLAIMER}")
    else:
        msg = (f"{'. '.join(flags)}. Changes like these are common signs of joint "
               f"discomfort in cats - we recommend a vet check. {DISCLAIMER}")

    return JumpResult(light, msg, True, takeoff / fps, land / fps, float(hesitation), height,
                      len(stages), two_stage, aborted, push_diff, flags, t, up, warnings)


# ---------------------------------------------------------------------------
# 3. Combined cat check
# ---------------------------------------------------------------------------
def analyse_cat(kps: dict, fps: float, mode: str = "walk",
                mapping: dict = SUPERANIMAL_QUADRUPED) -> CatResult:
    if mode == "jump":
        j = analyse_jump(kps, fps, mapping)
        return CatResult("jump", j.light, None, j.message, jump=j, warnings=list(j.warnings))
    if mode != "walk":
        raise ValueError('mode must be "walk" or "jump"')

    warnings: list = []
    try:
        g = analyse_gait(kps, fps, mapping)
        warnings += [w.replace("Dog", "Cat") for w in g.warnings]
    except ValueError as e:
        g = None
        warnings.append(f"Head/pelvis check skipped: {e}")
    s = analyse_stance(kps, fps, mapping)
    warnings += s.warnings

    parts = []                                   # (light, limb, source)
    if g is not None and g.light != "retake":
        parts.append((g.light, g.suspected_limb, "gait"))
    if s.light != "retake":
        parts.append((s.light, s.suspected_limb, "stance"))

    if not parts:
        return CatResult("walk", "retake", None,
                         "Could not read the walk reliably. Film your cat walking past the "
                         "camera side-on for at least 3-4 seconds (a treat at the end of a "
                         "hallway helps).", g, s, None, warnings)

    # worst light wins; on a tie prefer stance (more sensitive for cats)
    light, limb, source = max(parts, key=lambda p: (ORDER[p[0]], p[2] == "stance"))
    where = ""
    if limb:
        why = " - that paw stays on the ground longer" if source == "stance" else ""
        where = f" ({limb}{why})"
    messages = {
        "green": "Walking looks even. Cats hide discomfort well, so also try the jump check "
                 "and keep checking regularly.",
        "amber": f"Slight movement changes{where}. Re-check in a few days; mention it to your "
                 f"vet if it persists. {DISCLAIMER}",
        "red": f"Clear movement changes{where}. We recommend a vet check. {DISCLAIMER}",
    }
    return CatResult("walk", light, limb, messages[light], g, s, None, warnings)
