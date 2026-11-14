"""Dog gait asymmetry analysis (mobility check).

Input : per-frame 2D keypoints of one dog filmed side-on while walking/trotting.
Output: head and pelvis vertical asymmetry indices, suspected limb, traffic light.

Method (screening only, NOT a diagnosis):
- Vets read lameness from vertical head and pelvis movement. In each stride the
  head (front limbs) / pelvis (hind limbs) moves down and up twice, once per step.
  With a lame limb the body drops LESS while the painful limb bears weight, so the
  two lowest points in a stride become unequal ("MinDiff").
  Refs: Gomez Alvarez et al. 2017 Vet J 229; Bergh et al. 2018 Acta Vet Scand 60.
- We detect the low points (troughs) of each signal, compare consecutive troughs,
  and express the consistent difference as a % of the up/down amplitude.
- The limb bearing weight at the HIGHER trough is the suspected limb.

Thresholds are placeholders and must be calibrated on real videos.
"""
from __future__ import annotations

import warnings as _warnings
from dataclasses import dataclass, field

import numpy as np
from scipy.signal import find_peaks, savgol_filter

# ---------------------------------------------------------------------------
# Keypoint name mappings. Each role lists candidate names; the first ones found
# in the data are used (several head points are averaged for stability).
# ---------------------------------------------------------------------------
SUPERANIMAL_QUADRUPED = {
    "head": ["left_earbase", "right_earbase", "left_eye", "right_eye"],
    "pelvis": ["tail_base"],
    "withers": ["neck_base", "back_base"],
    "front_left_paw": ["front_left_paw"],
    "front_right_paw": ["front_right_paw"],
    "hind_left_paw": ["back_left_paw"],
    "hind_right_paw": ["back_right_paw"],
}

# Ultralytics Dog-Pose (StanfordExtra scheme) - for a later trained phone model.
DOG_POSE_24 = {
    "head": ["left_ear_base", "right_ear_base", "left_eye", "right_eye"],
    "pelvis": ["tail_start"],
    "withers": ["withers"],
    "front_left_paw": ["front_left_paw"],
    "front_right_paw": ["front_right_paw"],
    "hind_left_paw": ["rear_left_paw"],
    "hind_right_paw": ["rear_right_paw"],
}

# Asymmetry index thresholds in % (PLACEHOLDERS - calibrate on real videos).
GREEN_MAX = 15.0
AMBER_MAX = 30.0
MIN_STEPS = 6            # need at least 3 strides worth of troughs
MIN_LIKELIHOOD = 0.5
MIN_FPS = 20             # below this a step is only a few frames - cannot read it
MIN_AMPLITUDE = 0.01     # up/down movement must be >= 1% of body length to be readable
MIN_CONSISTENCY_T = 2.0  # the high/low alternation must repeat stride after stride (t-statistic)


@dataclass
class SignalResult:
    name: str                      # "head" or "pelvis"
    t: np.ndarray                  # time (s)
    signal: np.ndarray             # detrended vertical position, up = positive, body-length units
    troughs: np.ndarray            # frame indices of low points
    trough_side: list              # "left"/"right"/None: which limb bears weight at each trough
    asymmetry_index: float         # % of amplitude (nan if not enough steps)
    min_diff: float                # consistent trough difference (body-length units)
    amplitude: float               # mean peak-to-trough (body-length units)
    suspected_side: str | None     # side bearing weight at the higher trough
    side_agreement: float          # 0..1 fraction of strides agreeing with the side
    n_steps: int
    consistency_t: float = float("nan")  # how consistently the same step is higher (|t| >= 2 = consistent)
    readable: bool = True                # False if movement too small / too few steps


@dataclass
class GaitResult:
    head: SignalResult
    pelvis: SignalResult
    light: str                     # "green" / "amber" / "red" / "retake"
    suspected_limb: str | None     # e.g. "front left"
    message: str
    warnings: list = field(default_factory=list)


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------
def _pick(kps: dict, names: list[str]):
    """Average the available keypoints from `names`. kps[name] = (x, y, p) arrays."""
    found = [kps[n] for n in names if n in kps]
    if not found:
        return None
    xs = np.stack([f[0] for f in found])
    ys = np.stack([f[1] for f in found])
    ps = np.stack([f[2] for f in found])
    good = ps >= MIN_LIKELIHOOD
    with np.errstate(invalid="ignore"), _warnings.catch_warnings():
        _warnings.simplefilter("ignore", category=RuntimeWarning)
        x = np.where(good, xs, np.nan)
        y = np.where(good, ys, np.nan)
        x = np.nanmean(x, axis=0) if np.any(good) else np.full(xs.shape[1], np.nan)
        y = np.nanmean(y, axis=0) if np.any(good) else np.full(ys.shape[1], np.nan)
    return x, y


def _fill(a: np.ndarray, max_gap: int) -> np.ndarray:
    """Linearly interpolate NaN gaps up to max_gap frames; longer gaps stay NaN."""
    a = a.astype(float).copy()
    n = len(a)
    idx = np.arange(n)
    good = ~np.isnan(a)
    if good.sum() < 2:
        return a
    filled = np.interp(idx, idx[good], a[good])
    # keep long gaps as NaN
    isnan = np.isnan(a)
    start = None
    for i in range(n + 1):
        if i < n and isnan[i]:
            start = i if start is None else start
        elif start is not None:
            if i - start > max_gap or start == 0 or i == n:
                filled[start:i] = np.nan
            start = None
    return filled


def _smooth(a: np.ndarray, fps: float) -> np.ndarray:
    win = max(5, int(round(fps * 0.1)) | 1)  # ~0.1 s, odd
    out = a.copy()
    good = ~np.isnan(a)
    if good.sum() > win:
        out[good] = savgol_filter(a[good], win, 2)
    return out


def _detrend(a: np.ndarray, fps: float, window_s: float) -> np.ndarray:
    """Remove slow drift (camera shake, ground slope) with a moving average."""
    w = max(3, int(round(fps * window_s)))
    good = ~np.isnan(a)
    filled = np.where(good, a, np.nanmean(a))
    kernel = np.ones(w) / w
    trend = np.convolve(np.pad(filled, (w // 2, w - 1 - w // 2), mode="edge"), kernel, mode="valid")
    out = a - trend
    out[~good] = np.nan
    return out


def _stance_side(kps_paws, frame: int, fps: float) -> str | None:
    """Which paw (left/right) is on the ground at `frame`: the one moving slowest horizontally."""
    (lx, _), (rx, _) = kps_paws
    h = max(1, int(round(fps * 0.03)))
    lo, hi = max(0, frame - h), min(len(lx) - 1, frame + h)
    if hi <= lo:
        return None
    vl = abs(lx[hi] - lx[lo])
    vr = abs(rx[hi] - rx[lo])
    if np.isnan(vl) or np.isnan(vr) or abs(vl - vr) < 1e-9:
        return None
    return "left" if vl < vr else "right"


def _analyse_signal(name, y_up, fps, paws, step_period_s) -> SignalResult:
    t = np.arange(len(y_up)) / fps
    sig = _detrend(y_up, fps, window_s=2 * step_period_s)  # one stride = 2 steps
    clean = np.where(np.isnan(sig), 0.0, sig)

    min_dist = max(2, int(round(fps * step_period_s * 0.6)))
    prom = 0.15 * np.nanstd(sig) if np.nanstd(sig) > 0 else None
    troughs, _ = find_peaks(-clean, distance=min_dist, prominence=prom)
    peaks, _ = find_peaks(clean, distance=min_dist, prominence=prom)
    troughs = np.array([i for i in troughs if not np.isnan(sig[i])], dtype=int)

    n = len(troughs)
    res = SignalResult(name, t, sig, troughs, [], float("nan"), float("nan"),
                       float("nan"), None, 0.0, n)
    if n < MIN_STEPS:
        res.readable = False
        return res

    vals = sig[troughs]
    # amplitude: mean high point minus mean low point (independent of which side is lame)
    pk = [sig[p] for p in peaks if not np.isnan(sig[p])]
    amplitude = float(np.mean(pk) - np.mean(vals)) if pk else float(np.nanstd(sig) * 2)

    # consistent alternating difference: even-indexed vs odd-indexed troughs
    pairs = [(vals[i], vals[i + 1]) for i in range(0, n - 1, 2)]
    d = np.array([a - b for a, b in pairs])          # even minus odd
    min_diff = float(np.mean(d))
    asym = abs(min_diff) / amplitude * 100 if amplitude > 0 else float("nan")
    if len(d) >= 2 and np.std(d, ddof=1) > 0:
        t_stat = float(np.mean(d) / (np.std(d, ddof=1) / np.sqrt(len(d))))
    else:
        t_stat = float("inf") if abs(min_diff) > 0 else 0.0
    res.consistency_t = t_stat
    res.readable = amplitude >= MIN_AMPLITUDE

    sides = [_stance_side(paws, int(i), fps) if paws else None for i in troughs]
    # higher trough = less drop = suspected painful limb in stance
    hi_parity = 0 if min_diff > 0 else 1
    hi_sides = [s for k, s in enumerate(sides) if k % 2 == hi_parity and s]
    if hi_sides:
        left = hi_sides.count("left")
        side = "left" if left >= len(hi_sides) - left else "right"
        agree = max(left, len(hi_sides) - left) / len(hi_sides)
    else:
        side, agree = None, 0.0

    res.trough_side = sides
    res.asymmetry_index = float(asym)
    res.min_diff = min_diff
    res.amplitude = amplitude
    res.suspected_side = side
    res.side_agreement = float(agree)
    return res


def _estimate_step_period(y_up: np.ndarray, fps: float) -> float:
    """Dominant up/down period from autocorrelation (dogs: roughly 0.15-0.6 s per step)."""
    a = y_up[~np.isnan(y_up)]
    if len(a) < fps:
        return 0.3
    a = a - a.mean()
    ac = np.correlate(a, a, mode="full")[len(a) - 1:]
    lo, hi = int(fps * 0.12), int(fps * 0.8)
    if hi <= lo + 1 or hi >= len(ac):
        return 0.3
    seg = ac[lo:hi]
    # first clear local maximum = one step (the stride peak comes later at ~2x)
    for i in range(1, len(seg) - 1):
        if seg[i] >= seg[i - 1] and seg[i] >= seg[i + 1] and seg[i] > 0.2 * ac[0]:
            return (lo + i) / fps
    return (lo + int(np.argmax(seg))) / fps


def _signal_light(s: SignalResult) -> str:
    if not s.readable or np.isnan(s.asymmetry_index):
        return "retake"
    if abs(s.consistency_t) < MIN_CONSISTENCY_T:
        return "green"   # no consistent high/low pattern -> nothing to flag
    return _light(s.asymmetry_index)


def _light(index: float) -> str:
    if np.isnan(index):
        return "retake"
    if index <= GREEN_MAX:
        return "green"
    if index <= AMBER_MAX:
        return "amber"
    return "red"


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------
def analyse_gait(kps: dict, fps: float, mapping: dict = SUPERANIMAL_QUADRUPED) -> GaitResult:
    """kps: {bodypart_name: (x[n], y[n], likelihood[n])} in pixels, image y pointing down."""
    warnings = []
    if fps < MIN_FPS:
        empty = SignalResult("head", np.array([]), np.array([]), np.array([], int), [], float("nan"),
                             float("nan"), float("nan"), None, 0.0, 0, readable=False)
        p_empty = SignalResult("pelvis", np.array([]), np.array([]), np.array([], int), [], float("nan"),
                               float("nan"), float("nan"), None, 0.0, 0, readable=False)
        return GaitResult(empty, p_empty, "retake", None,
                          f"Video frame rate is too low ({fps:.0f} fps). Please film at 30 fps or more.",
                          [f"Frame rate {fps:.0f} fps < {MIN_FPS} fps."])
    max_gap = int(round(fps * 0.2))

    def role(r):
        p = _pick(kps, mapping[r])
        if p is None:
            return None
        return _smooth(_fill(p[0], max_gap), fps), _smooth(_fill(p[1], max_gap), fps)

    head, pelvis, withers = role("head"), role("pelvis"), role("withers")
    if head is None or pelvis is None:
        raise ValueError("Head or pelvis keypoints missing - check the keypoint mapping.")

    # body length for scale (pixels) -> signals in body-length units
    ref = withers if withers is not None else head
    body_len = np.nanmedian(np.hypot(ref[0] - pelvis[0], ref[1] - pelvis[1]))
    if not np.isfinite(body_len) or body_len <= 0:
        body_len = 1.0
        warnings.append("Could not estimate body length; results not scale-normalised.")

    head_up = -head[1] / body_len
    pelvis_up = -pelvis[1] / body_len

    # quality: dog should cross the frame side-on
    centre_x = (head[0] + pelvis[0]) / 2
    travel = (np.nanmax(centre_x) - np.nanmin(centre_x)) / body_len
    if travel < 1.5:
        warnings.append("Dog moved less than 1.5 body lengths across the frame - film side-on, walking past the camera.")
    coverage = np.mean(~np.isnan(head_up) & ~np.isnan(pelvis_up))
    if coverage < 0.6:
        warnings.append(f"Dog tracked in only {coverage:.0%} of frames.")

    step = _estimate_step_period(pelvis_up, fps)

    def paws(l, r):
        a, b = role(l), role(r)
        return (a, b) if a is not None and b is not None else None

    h = _analyse_signal("head", head_up, fps, paws("front_left_paw", "front_right_paw"), step)
    p = _analyse_signal("pelvis", pelvis_up, fps, paws("hind_left_paw", "hind_right_paw"), step)

    if h.n_steps < MIN_STEPS and p.n_steps < MIN_STEPS:
        return GaitResult(h, p, "retake", None,
                          "Not enough steps detected. Film at least 3 full strides side-on.",
                          warnings)
    if not h.readable and not p.readable:
        warnings.append(f"Up/down movement too small to read (head {h.amplitude*100:.1f}%, "
                        f"pelvis {p.amplitude*100:.1f}% of body length).")
        return GaitResult(h, p, "retake", None,
                          "Could not see clear up/down movement. Film closer, side-on, with the camera still.",
                          warnings)

    lh, lp = _signal_light(h), _signal_light(p)
    order = {"retake": 0, "green": 1, "amber": 2, "red": 3}
    light = max([lh, lp], key=lambda s: order[s])

    limb = None
    if light in ("amber", "red"):
        worst = h if order[lh] >= order[lp] and (np.nan_to_num(h.asymmetry_index) >= np.nan_to_num(p.asymmetry_index)) else p
        end = "front" if worst.name == "head" else "hind"
        limb = f"{end} {worst.suspected_side}" if worst.suspected_side else end
        if worst.side_agreement < 0.7:
            warnings.append("Side (left/right) is uncertain - paws were hard to tell apart.")
        if worst.name == "head" and order[lp] >= 2:
            warnings.append("Head nod can also be compensation for a hind-limb problem.")

    messages = {
        "green": "Movement looks even. Keep checking regularly.",
        "amber": f"Slightly uneven movement{' (' + limb + ')' if limb else ''}. Re-check in a few days; book your vet if it persists.",
        "red": f"Clearly uneven movement{' (' + limb + ')' if limb else ''}. We recommend a check with your vet.",
        "retake": "Could not read the movement reliably. Please film again side-on.",
    }
    return GaitResult(h, p, light, limb, messages[light], warnings)


def keypoints_from_dlc_h5(h5_path: str, individual: str | None = None):
    """Load a DeepLabCut output .h5 into {bodypart: (x, y, likelihood)} for one dog.

    Picks the individual with the highest mean likelihood when several are present.
    """
    import pandas as pd

    df = pd.read_hdf(h5_path)
    cols = df.columns
    names = list(cols.names)
    if "individuals" in names:
        inds = cols.get_level_values("individuals").unique()
        if individual is None:
            best, best_p = None, -1.0
            for ind in inds:
                sub = df.xs(ind, axis=1, level="individuals")
                p = sub.xs("likelihood", axis=1, level="coords").mean().mean()
                if p > best_p:
                    best, best_p = ind, p
            individual = best
        df = df.xs(individual, axis=1, level="individuals")
    out = {}
    for bp in df.columns.get_level_values("bodyparts").unique():
        sub = df.xs(bp, axis=1, level="bodyparts")
        g = lambda c: sub.xs(c, axis=1, level="coords").iloc[:, 0].to_numpy(dtype=float)
        out[bp] = (g("x"), g("y"), g("likelihood"))
    return out
