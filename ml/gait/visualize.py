"""Plots and annotated result video for the mobility check."""
from __future__ import annotations

from dataclasses import dataclass

import numpy as np

LIGHT_BGR = {"green": (80, 175, 76), "amber": (0, 165, 255), "red": (60, 60, 230), "retake": (150, 150, 150)}
LIGHT_HEX = {"green": "#4caf50", "amber": "#ffa500", "red": "#e63c3c", "retake": "#969696"}

# SuperAnimal-Quadruped skeleton (subset that is useful from a side view)
SKELETON_SA = [
    ("nose", "left_eye"), ("left_eye", "left_earbase"), ("left_earbase", "neck_base"),
    ("neck_base", "back_middle"), ("back_middle", "tail_base"), ("tail_base", "tail_end"),
    ("neck_base", "front_left_thai"), ("front_left_thai", "front_left_knee"), ("front_left_knee", "front_left_paw"),
    ("neck_base", "front_right_thai"), ("front_right_thai", "front_right_knee"), ("front_right_knee", "front_right_paw"),
    ("tail_base", "back_left_thai"), ("back_left_thai", "back_left_knee"), ("back_left_knee", "back_left_paw"),
    ("tail_base", "back_right_thai"), ("back_right_thai", "back_right_knee"), ("back_right_knee", "back_right_paw"),
]
LEFT_COLOR, RIGHT_COLOR = (255, 170, 0), (255, 0, 200)   # BGR: left = blue-ish, right = magenta


def plot_signals(result, title: str = "Mobility check"):
    """Head and pelvis up/down curves with the low points coloured by weight-bearing side."""
    import matplotlib.pyplot as plt

    fig, axes = plt.subplots(2, 1, figsize=(11, 6), sharex=True)
    for ax, s, label in [(axes[0], result.head, "Head (front legs)"), (axes[1], result.pelvis, "Pelvis (hind legs)")]:
        ax.plot(s.t, s.signal * 100, color="#555", lw=1.5)
        for k, i in enumerate(s.troughs):
            side = s.trough_side[k] if k < len(s.trough_side) else None
            c = "#1f77b4" if side == "left" else "#d62728" if side == "right" else "#999"
            ax.plot(s.t[i], s.signal[i] * 100, "o", color=c, ms=7)
        idx = "n/a" if np.isnan(s.asymmetry_index) else f"{s.asymmetry_index:.0f}%"
        ax.set_title(f"{label}: asymmetry {idx}  (steps: {s.n_steps})", loc="left", fontsize=11)
        ax.set_ylabel("up / down\n(% body length)")
        ax.grid(alpha=0.3)
    axes[1].set_xlabel("time (s)")
    axes[0].plot([], [], "o", color="#1f77b4", label="left leg on ground")
    axes[0].plot([], [], "o", color="#d62728", label="right leg on ground")
    axes[0].legend(loc="upper right", fontsize=9)
    fig.suptitle(f"{title}: {result.light.upper()}  {result.suspected_limb or ''}",
                 color=LIGHT_HEX[result.light], fontsize=14, fontweight="bold")
    fig.tight_layout()
    return fig


@dataclass
class DemoLabel:
    """Hand-written banner for pitch videos (DEMO MODE - not the model's own verdict)."""
    light: str = "red"
    title: str = "Ask your vet"
    detail: str = "Uneven movement detected"


def render_video(video_path: str, kps: dict, result, out_path: str,
                 skeleton=SKELETON_SA, min_p: float = 0.5, banner: bool = True,
                 demo_label: "DemoLabel | None" = None):
    """Write a copy of the video with skeleton and (optionally) a result banner.

    `result` can be a dog GaitResult, a CatResult, or None (skeleton only).
    `demo_label` replaces the banner with a hand-written one (shows a small 'DEMO' tag)."""
    import cv2

    cap = cv2.VideoCapture(video_path)
    fps = cap.get(cv2.CAP_PROP_FPS) or 30
    w, h = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH)), int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
    writer = cv2.VideoWriter(out_path, cv2.VideoWriter_fourcc(*"mp4v"), fps, (w, h))
    show_banner = banner and (result is not None or demo_label is not None)
    colour = LIGHT_BGR[(demo_label or result).light] if show_banner else None
    scale = max(0.6, min(w, h) / 720)
    i = 0
    while True:
        ok, frame = cap.read()
        if not ok:
            break
        _draw_frame(frame, kps, i, skeleton, min_p, scale)
        if show_banner and demo_label is not None:
            _draw_demo_banner(frame, demo_label, colour, scale)
        elif show_banner:
            _draw_banner(frame, result, colour, scale)
        writer.write(frame)
        i += 1
    cap.release()
    writer.release()
    return out_path


def _pt(kps, name, i, min_p):
    if name not in kps or i >= len(kps[name][0]):
        return None
    x, y, p = kps[name][0][i], kps[name][1][i], kps[name][2][i]
    if np.isnan(x) or np.isnan(y) or p < min_p:
        return None
    return int(x), int(y)


def _draw_frame(frame, kps, i, skeleton, min_p, scale):
    import cv2

    th = max(2, int(3 * scale))
    for a, b in skeleton:
        pa, pb = _pt(kps, a, i, min_p), _pt(kps, b, i, min_p)
        if pa and pb:
            c = LEFT_COLOR if "left" in b else RIGHT_COLOR if "right" in b else (230, 230, 230)
            cv2.line(frame, pa, pb, c, th, cv2.LINE_AA)
    for name in kps:
        p = _pt(kps, name, i, min_p)
        if p:
            cv2.circle(frame, p, th + 1, (255, 255, 255), -1, cv2.LINE_AA)
    # highlight the two measured points
    for name, c in [("left_earbase", (0, 255, 255)), ("tail_base", (0, 255, 255))]:
        p = _pt(kps, name, i, min_p)
        if p:
            cv2.circle(frame, p, th * 3, c, th, cv2.LINE_AA)


def _draw_demo_banner(frame, d: DemoLabel, colour, scale):
    import cv2

    h, w = frame.shape[:2]
    bh = int(70 * scale)
    overlay = frame.copy()
    cv2.rectangle(overlay, (0, 0), (w, bh), (30, 30, 30), -1)
    cv2.addWeighted(overlay, 0.6, frame, 0.4, 0, frame)
    cv2.circle(frame, (int(35 * scale), bh // 2), int(20 * scale), colour, -1, cv2.LINE_AA)
    cv2.putText(frame, d.title, (int(70 * scale), int(bh * 0.45)), cv2.FONT_HERSHEY_SIMPLEX, 0.9 * scale,
                (255, 255, 255), max(1, int(2 * scale)), cv2.LINE_AA)
    cv2.putText(frame, f"{d.detail}   Screening only - not a diagnosis", (int(70 * scale), int(bh * 0.85)),
                cv2.FONT_HERSHEY_SIMPLEX, 0.5 * scale, (220, 220, 220), 1, cv2.LINE_AA)
    cv2.putText(frame, "DEMO", (w - int(70 * scale), h - int(12 * scale)), cv2.FONT_HERSHEY_SIMPLEX,
                0.5 * scale, (200, 200, 200), 1, cv2.LINE_AA)


def _draw_banner(frame, result, colour, scale):
    import cv2

    h, w = frame.shape[:2]
    bh = int(70 * scale)
    overlay = frame.copy()
    cv2.rectangle(overlay, (0, 0), (w, bh), (30, 30, 30), -1)
    cv2.addWeighted(overlay, 0.6, frame, 0.4, 0, frame)
    cv2.circle(frame, (int(35 * scale), bh // 2), int(20 * scale), colour, -1, cv2.LINE_AA)
    label = {"green": "Looks even", "amber": "Keep an eye", "red": "Ask your vet", "retake": "Please re-film"}[result.light]
    txt = label + (f"  |  {result.suspected_limb}" if result.suspected_limb else "")
    cv2.putText(frame, txt, (int(70 * scale), int(bh * 0.45)), cv2.FONT_HERSHEY_SIMPLEX, 0.9 * scale,
                (255, 255, 255), max(1, int(2 * scale)), cv2.LINE_AA)
    fmt = lambda v: "n/a" if np.isnan(v) else f"{v:.0f}%"
    gait = result if hasattr(result, "head") else getattr(result, "gait", None)
    if gait is not None and getattr(result, "mode", "walk") == "walk":
        sub = (f"Head asym {fmt(gait.head.asymmetry_index)}   Pelvis asym {fmt(gait.pelvis.asymmetry_index)}"
               "   Screening only - not a diagnosis")
    else:
        msg = result.message.split(". ")[0]
        sub = f"{msg[:70]}   Screening only - not a diagnosis"
    cv2.putText(frame, sub, (int(70 * scale), int(bh * 0.85)), cv2.FONT_HERSHEY_SIMPLEX, 0.5 * scale,
                (220, 220, 220), 1, cv2.LINE_AA)
