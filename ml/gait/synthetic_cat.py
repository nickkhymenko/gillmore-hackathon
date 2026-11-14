"""Synthetic cat keypoints for testing the cat checks (SuperAnimal-Quadruped names).

make_walk : lateral-sequence walk (footfalls LH, LF, RH, RF, a quarter stride apart)
            with an optional limb that stays on the ground longer (Stadig et al. 2016).
make_jump : side view of a cat jumping onto a surface: "smooth", "hesitant"
            (long crouch), "two_stage" (rise, pause, second rise) or "aborted"
            (crouch, then walks away without jumping).
"""
import numpy as np

GROUND_Y = 600.0
FOOTFALL = {"hind_left": 0.0, "front_left": 0.25, "hind_right": 0.5, "front_right": 0.75}
DLC_NAME = {"front_left": "front_left_paw", "front_right": "front_right_paw",
            "hind_left": "back_left_paw", "hind_right": "back_right_paw"}


def _add_body(out, add, cx, back_y, head_up, pelvis_up, body_px, direction):
    front = 0.45 * body_px * direction
    back = -0.45 * body_px * direction
    head_y = back_y - 0.25 * body_px - head_up
    for nm, dx in [("left_earbase", 0), ("right_earbase", 3),
                   ("left_eye", 15 * direction), ("right_eye", 17 * direction)]:
        add(nm, cx + front + 0.15 * body_px * direction + dx, head_y + (8 if "eye" in nm else 0))
    add("neck_base", cx + front, back_y - 0.3 * head_up)
    add("tail_base", cx + back, back_y - pelvis_up)
    return front, back


def make_walk(long_stance: str | None = None, severity: float = 0.5, seconds: float = 8.0,
              fps: float = 30.0, stride: float = 0.9, duty: float = 0.6,
              body_px: float = 200.0, speed_bl: float = 1.0, noise_px: float = 1.0,
              drift_px: float = 8.0, direction: int = 1, seed: int = 0):
    """Return ({bodypart: (x, y, p)}, fps).

    long_stance: "front_left" / "front_right" / "hind_left" / "hind_right" / None.
    That paw's stance lasts (1 + 0.4 * severity) times longer (footfall timing kept).
    Head/pelvis bob is kept symmetric on purpose: cats often hide a limp.
    """
    rng = np.random.default_rng(seed)
    n = int(seconds * fps)
    t = np.arange(n) / fps
    v = speed_bl * body_px * direction
    cx = (100 if direction > 0 else 1800) + v * t
    drift = drift_px * np.sin(2 * np.pi * t / 3.0)

    amp_head, amp_pelvis = 0.03 * body_px, 0.02 * body_px
    half = stride / 2
    pelvis_up = -amp_pelvis * np.cos(2 * np.pi * (t - duty / 2 * stride) / half)
    head_up = -amp_head * np.cos(2 * np.pi * (t - (0.25 + duty / 2) * stride) / half)

    out = {}

    def add(name, x, y):
        out[name] = (x + rng.normal(0, noise_px, n),
                     y + drift + rng.normal(0, noise_px, n),
                     np.full(n, 0.9))

    back_y = GROUND_Y - 0.6 * body_px
    front, back = _add_body(out, add, cx, back_y, head_up, pelvis_up, body_px, direction)

    for paw, phi in FOOTFALL.items():
        d = min(0.9, duty * (1 + 0.4 * severity)) if paw == long_stance else duty
        # integrate paw speed at 20x the frame rate so stance edges are not frame-quantised
        sub = 20
        ts = np.arange(n * sub) / (fps * sub)
        stance = ((ts / stride - phi) % 1.0) < d
        xs = np.cumsum(np.where(stance, 0.0, v / (1 - d))) / (fps * sub)
        x = xs[::sub]
        x = x - np.mean(x - v * t)                    # keep the paw under the body
        off = (front if paw.startswith("front") else back) + (5 if "right" in paw else 0)
        add(DLC_NAME[paw], cx[0] + off + x, np.full(n, GROUND_Y))
    return out, fps


def _ease(u):
    u = np.clip(u, 0, 1)
    return 3 * u ** 2 - 2 * u ** 3


JUMP_KINDS = ("smooth", "hesitant", "two_stage", "aborted")


def make_jump(kind: str = "smooth", seconds: float | None = None, fps: float = 30.0,
              body_px: float = 200.0, height_px: float | None = None,
              push_delay_s: float = 0.0, noise_px: float = 1.0, seed: int = 0):
    """Return ({bodypart: (x, y, p)}, fps) for a cat jumping onto a surface.

    seconds: optionally cut the clip to this length (for "too short" tests).
    push_delay_s: right hind paw leaves the ground this much later than the left.
    """
    if kind not in JUMP_KINDS:
        raise ValueError(f"kind must be one of {JUMP_KINDS}")
    rng = np.random.default_rng(seed)
    H = 1.5 * body_px if height_px is None else height_px
    crouch = 0.15 * body_px
    walk_v = 1.0 * body_px

    # segments: (mode, duration s, dx px, dy px up)
    seg = [("walk", 1.5, walk_v * 1.5, 0.0), ("ease", 0.25, 0.0, -crouch)]
    if kind == "smooth":
        seg += [("hold", 0.5, 0, 0), ("ease", 0.3, 0.8 * body_px, H + crouch), ("hold", 1.5, 0, 0)]
    elif kind == "hesitant":
        seg = [("walk", 1.0, walk_v, 0.0), ("ease", 0.25, 0.0, -crouch),
               ("hold", 4.0, 0, 0), ("ease", 0.3, 0.8 * body_px, H + crouch), ("hold", 1.5, 0, 0)]
    elif kind == "two_stage":
        first = 0.5 * H
        seg += [("hold", 0.5, 0, 0), ("ease", 0.3, 0.5 * body_px, first + crouch),
                ("hold", 0.6, 0, 0), ("ease", 0.5, 0.3 * body_px, H - first), ("hold", 1.5, 0, 0)]
    elif kind == "aborted":
        seg += [("hold", 1.5, 0, 0), ("ease", 0.4, 0.0, crouch), ("walk", 2.0, -walk_v * 2.0, 0.0)]

    total = sum(s[1] for s in seg)
    n = int(round(total * fps))
    t = np.arange(n) / fps
    cx = np.zeros(n)
    up = np.zeros(n)
    x0, y0, t0 = 100.0, 0.0, 0.0
    for mode, dur, dx, dy in seg:
        m = (t >= t0) & (t < t0 + dur)
        u = (t[m] - t0) / dur
        if mode == "walk":
            cx[m] = x0 + dx * u
            up[m] = y0 + 0.015 * body_px * np.sin(2 * np.pi * 2.2 * (t[m] - t0))
        elif mode == "ease":
            cx[m] = x0 + dx * _ease(u)
            up[m] = y0 + dy * _ease(u)
        else:
            cx[m] = x0
            up[m] = y0
        x0, y0, t0 = x0 + dx, y0 + dy, t0 + dur

    stand_h = 0.6 * body_px                    # centre height above the paws when standing
    centre_y = GROUND_Y - stand_h - up         # image y (down)

    out = {}

    def add(name, x, y):
        out[name] = (x + rng.normal(0, noise_px, n), y + rng.normal(0, noise_px, n),
                     np.full(n, 0.9))

    # body kept level for simplicity (no head/pelvis bob during the jump)
    front, back = _add_body(out, add, cx, centre_y, np.zeros(n), np.zeros(n), body_px, 1)

    # paws hang a leg-length below the centre but cannot go below the floor;
    # once on top, the surface is at centre + leg length so the same rule holds.
    def paw_y(delay):
        shift = int(round(delay * fps))
        cy = np.concatenate([np.full(shift, centre_y[0]), centre_y[:n - shift]]) if shift else centre_y
        return np.minimum(GROUND_Y, cy + stand_h)

    add("front_left_paw", cx + front, paw_y(0.0))
    add("front_right_paw", cx + front + 5, paw_y(0.0))
    add("back_left_paw", cx + back, paw_y(0.0))
    add("back_right_paw", cx + back + 5, paw_y(push_delay_s))

    if seconds is not None:
        k = int(round(seconds * fps))
        out = {nm: (a[:k], b[:k], c[:k]) for nm, (a, b, c) in out.items()}
    return out, fps
