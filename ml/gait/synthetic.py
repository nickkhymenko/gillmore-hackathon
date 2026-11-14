"""Synthetic trotting-dog keypoints with a controllable lame limb (for testing only)."""
import numpy as np


def make_trot(lame: str | None = None, severity: float = 0.5, seconds: float = 6.0,
              fps: float = 30.0, step: float = 0.25, body_px: float = 200.0,
              speed_bl: float = 1.5, noise_px: float = 1.0, drift_px: float = 10.0,
              direction: int = 1, seed: int = 0):
    """Return ({bodypart: (x, y, p)}, fps) using SuperAnimal names.

    Trot: diagonal pairs LF+RH, then RF+LH, each in stance for one `step`.
    Head trough happens mid-stance of each front limb; pelvis trough mid-stance of
    each hind limb. A lame limb makes the trough during its stance shallower by
    `severity` (0 = sound, 1 = no drop at all).
    """
    rng = np.random.default_rng(seed)
    n = int(seconds * fps)
    t = np.arange(n) / fps
    v = speed_bl * body_px * direction                 # px/s
    cx = 100 + v * t if direction > 0 else 1800 + v * t
    drift = drift_px * np.sin(2 * np.pi * t / 3.0)      # slow camera bob

    phase = (t % (2 * step)) / step                    # 0..2 within a stride
    lf_stance = phase < 1                              # LF + RH stance
    amp_head, amp_pelvis = 0.06 * body_px, 0.04 * body_px

    def bob(amp, stance_a, lame_a: bool, lame_b: bool):
        # one down-up per step: trough at mid-stance
        base = -amp * np.cos(2 * np.pi * (t - step / 2) / step)   # up-positive
        scale = np.ones(n)
        down = base < 0
        if lame_a:
            scale[down & stance_a] = 1 - severity
        if lame_b:
            scale[down & ~stance_a] = 1 - severity
        return base * scale

    head_up = bob(amp_head, lf_stance, lame == "front_left", lame == "front_right")
    # hind: LH stance when RF stance (i.e. ~lf_stance)
    pelvis_up = bob(amp_pelvis, ~lf_stance, lame == "hind_left", lame == "hind_right")

    def paw_x(stance_mask, offset):
        vel = np.where(stance_mask, 0.0, 2 * v)
        return cx[0] + offset + np.cumsum(vel) / fps

    out = {}
    def add(name, x, y):
        out[name] = (x + rng.normal(0, noise_px, n),
                     y + drift + rng.normal(0, noise_px, n),
                     np.full(n, 0.9))

    front = 0.45 * body_px * direction
    back = -0.45 * body_px * direction
    ground, back_y = 600.0, 600.0 - 0.6 * body_px
    head_y = back_y - 0.25 * body_px - head_up
    for nm, dx in [("left_earbase", 0), ("right_earbase", 3), ("left_eye", 15 * direction), ("right_eye", 17 * direction)]:
        add(nm, cx + front + 0.15 * body_px * direction + dx, head_y + (8 if "eye" in nm else 0))
    add("neck_base", cx + front, back_y - pelvis_up * 0 - head_up * 0.3)
    add("tail_base", cx + back, back_y - pelvis_up)
    add("front_left_paw", paw_x(lf_stance, front), np.full(n, ground))
    add("front_right_paw", paw_x(~lf_stance, front + 5), np.full(n, ground))
    add("back_left_paw", paw_x(~lf_stance, back), np.full(n, ground))
    add("back_right_paw", paw_x(lf_stance, back + 5), np.full(n, ground))
    return out, fps
