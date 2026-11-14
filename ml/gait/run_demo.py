"""Batch demo: every video in a folder -> skeleton + analysis + overlay video.

File name decides the species: names starting with "cat" use the cat walk check,
everything else the dog gait check. Run on Colab (GPU) after DeepLabCut is installed:

    from run_demo import run_folder
    table = run_folder("/content/demo_in", "/content/demo_out", demo=True)

demo=True  -> banner is a hand-written DemoLabel (red "Ask your vet") for the pitch,
              the model's real numbers are still returned in the table.
demo=False -> banner shows the model's own verdict.
"""
from __future__ import annotations

import glob
import os
import subprocess

import cv2

from cat_analysis import analyse_cat
from gait_analysis import analyse_gait, keypoints_from_dlc_h5
from visualize import DemoLabel, render_video

DEMO_LABELS = {
    "dog": DemoLabel("red", "Ask your vet", "Uneven gait - possible limp"),
    "cat": DemoLabel("red", "Ask your vet", "Movement change - possible limp"),
}


def _normalise(src: str, dst: str, start: float = 0, duration: float = 0):
    trim = (["-ss", str(start)] if start else []) + (["-t", str(duration)] if duration else [])
    subprocess.run(["ffmpeg", "-y", "-loglevel", "error", *trim, "-i", src,
                    "-vf", "scale='min(1280,iw)':-2", "-r", "30", "-an",
                    "-c:v", "libx264", "-pix_fmt", "yuv420p", dst], check=True)


def run_one(src: str, out_dir: str, demo: bool = True, trims: dict | None = None):
    from deeplabcut.modelzoo.video_inference import video_inference_superanimal

    name = os.path.splitext(os.path.basename(src))[0].replace(" ", "_")
    species = "cat" if name.lower().startswith("cat") else "dog"
    work = os.path.join(out_dir, "work")
    os.makedirs(work, exist_ok=True)
    vid = os.path.join(work, name + ".mp4")
    start, dur = (trims or {}).get(name, (0, 0))
    _normalise(src, vid, start, dur)

    video_inference_superanimal(videos=[vid], superanimal_name="superanimal_quadruped",
                                model_name="hrnet_w32", detector_name="fasterrcnn_resnet50_fpn_v2",
                                max_individuals=1, dest_folder=work, create_labeled_video=False)
    h5 = sorted(glob.glob(os.path.join(work, name + "*.h5")), key=os.path.getmtime)[-1]
    fps = cv2.VideoCapture(vid).get(cv2.CAP_PROP_FPS)
    kps = keypoints_from_dlc_h5(h5)

    if species == "cat":
        res = analyse_cat(kps, fps, "walk")
        head = res.gait.head.asymmetry_index if res.gait else float("nan")
        pelvis = res.gait.pelvis.asymmetry_index if res.gait else float("nan")
    else:
        res = analyse_gait(kps, fps)
        head, pelvis = res.head.asymmetry_index, res.pelvis.asymmetry_index

    raw = os.path.join(work, name + "_overlay_raw.mp4")
    final = os.path.join(out_dir, name + ("_demo.mp4" if demo else "_model.mp4"))
    render_video(vid, kps, res, raw, demo_label=DEMO_LABELS[species] if demo else None)
    subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-i", raw, "-c:v", "libx264",
                    "-pix_fmt", "yuv420p", final], check=True)
    return dict(video=name, species=species, model_light=res.light, model_limb=res.suspected_limb,
                head_asym=round(head, 1), pelvis_asym=round(pelvis, 1),
                message=res.message, warnings="; ".join(res.warnings), output=final)


def run_folder(in_dir: str, out_dir: str, demo: bool = True, trims: dict | None = None):
    import pandas as pd

    os.makedirs(out_dir, exist_ok=True)
    rows = []
    for src in sorted(glob.glob(os.path.join(in_dir, "*.mp4")) + glob.glob(os.path.join(in_dir, "*.mov"))):
        try:
            rows.append(run_one(src, out_dir, demo, trims))
        except Exception as e:  # keep going with the other videos
            rows.append(dict(video=os.path.basename(src), error=repr(e)))
    return pd.DataFrame(rows)
