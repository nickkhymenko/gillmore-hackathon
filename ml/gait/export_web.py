"""Export DeepLabCut keypoints (+ our gait analysis) to small JSON files for the website.

Run (from repo root):
    python ml/gait/export_web.py

Reads  demo/videos/reddit_out/work/*.h5 (+ the normalised .mp4 they were computed on)
Writes public/gait/clips/<id>.json and public/gait/clips/index.json

Coordinates are stored normalised (0..1 of the analysed frame), so the website can overlay
them on the owner's ORIGINAL upload at any resolution. `start` is where the analysed segment
begins in the original file (seconds); keypoint frame k is shown at start + k / fps.
"""
from __future__ import annotations

import csv
import glob
import json
import math
import os
import shutil
import sys

import cv2
import numpy as np

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, "..", ".."))
sys.path.insert(0, HERE)

from cat_analysis import analyse_cat  # noqa: E402
from gait_analysis import analyse_gait, keypoints_from_dlc_h5  # noqa: E402

WORK = os.path.join(ROOT, "demo", "videos", "reddit_out", "work")
NUMBERS = os.path.join(ROOT, "demo", "videos", "reddit_out", "model_numbers.csv")
OUT = os.path.join(ROOT, "public", "gait", "clips")

# keypoints the website draws (subset of SuperAnimal-Quadruped's 39)
KEEP = ["nose", "left_eye", "right_eye", "left_earbase", "right_earbase", "neck_base", "back_middle",
        "tail_base", "tail_end",
        "front_left_thai", "front_left_knee", "front_left_paw",
        "front_right_thai", "front_right_knee", "front_right_paw",
        "back_left_thai", "back_left_knee", "back_left_paw",
        "back_right_thai", "back_right_knee", "back_right_paw"]

# id -> clip definition. `bytes` = size of the owner's original file (used to recognise an upload).
# `cut` = seconds to drop from the start of the analysed segment (dog1: dog too far away before 4.2 s).
CLIPS = {
    "cat1": dict(sample="/gait/samples/cat1.mp4", species="cat", h5="cat1_*.h5", video="cat1.mp4", bytes=2460981, start=0.0, cut=0.0,
                 title="Tabby and white cat at home", source="Reddit r/CATHELP owner video",
                 finding="Front left: shorter, lighter steps", area="front left", key="head"),
    "cat2": dict(sample="/gait/samples/cat2.mp4", species="cat", h5="cat2_*.h5", video="cat2.mp4", bytes=1983917, start=0.0, cut=0.0,
                 title="Ginger cat in the hallway", source="Reddit r/cats owner video",
                 finding="Hind end: uneven hip movement", area="hind", key="pelvis"),
    "dog1": dict(sample="/gait/samples/dog1.mp4", species="dog", h5="dog1_*.h5", video="dog1.mp4", bytes=3617065, start=0.0, cut=4.2,
                 title="Black Labrador in the living room", source="Reddit r/labrador owner video",
                 finding="Hind end: uneven hip movement", area="hind", key="pelvis"),
    "dog2": dict(sample="/gait/samples/dog2.mp4", species="dog", h5="dog2_*.h5", video="dog2.mp4", bytes=3750392, start=0.0, cut=0.0,
                 title="Pomeranian at home", source="Reddit r/DogAdvice owner video",
                 finding="Front left: head nods on every step", area="front left", key="head"),
    "sample-healthy": dict(species="dog", h5="Dog_walking_in_the_Mission_in_San_Francisco_*.h5",
                           video="Dog_walking_in_the_Mission_in_San_Francisco.mp4", bytes=None,
                           start=0.0, cut=0.0, sample="/gait/samples/healthy-dog-sf.mp4",
                           title="Healthy dog on a city walk",
                           source='"Dog walking in the Mission in San Francisco", Wikimedia Commons, CC BY-SA 3.0',
                           finding="Even movement", area=None, key=None, healthy=True,
                           numbers=dict(head_asym=11.5, pelvis_asym=5.3)),
}


def _r(v, n=4):
    return None if v is None or (isinstance(v, float) and math.isnan(v)) else round(float(v), n)


def export(cid: str, c: dict, numbers: dict) -> dict:
    h5 = sorted(glob.glob(os.path.join(WORK, c["h5"])))[-1]
    cap = cv2.VideoCapture(os.path.join(WORK, c["video"]))
    fps = cap.get(cv2.CAP_PROP_FPS)
    w, h = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH)), int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
    kps = keypoints_from_dlc_h5(h5)
    n = len(next(iter(kps.values()))[0])
    k0 = int(round(c["cut"] * fps))

    # model analysis on the full analysed segment (what the batch run reported)
    if c["species"] == "cat":
        res = analyse_cat(kps, fps, "walk")
        gait = res.gait
    else:
        res = gait = analyse_gait(kps, fps)
    num = c.get("numbers") or numbers.get(cid, {})

    frames = []
    for k in range(k0, n):
        row = []
        for bp in KEEP:
            x, y, p = kps[bp][0][k], kps[bp][1][k], kps[bp][2][k]
            ok = not (np.isnan(x) or np.isnan(y)) and p >= 0.4
            row.append([_r(x / w), _r(y / h), _r(p, 2)] if ok else None)
        frames.append(row)

    def series(s):
        if s is None or len(s.signal) == 0:
            return None
        return dict(t=[_r(t - c["cut"], 3) for t in s.t[k0:]],
                    y=[_r(v * 100, 2) for v in s.signal[k0:]],
                    troughs=[int(i - k0) for i in s.troughs if i >= k0])

    clip = dict(
        id=cid, species=c["species"], title=c["title"], source=c["source"],
        fps=fps, width=w, height=h,
        start=c["start"] + c["cut"], duration=(n - k0) / fps,
        bytes=c["bytes"], sample=c.get("sample"),
        bodyparts=KEEP, frames=frames,
        result=dict(
            healthy=bool(c.get("healthy")), finding=c["finding"], area=c["area"], key=c["key"],
            head_asym=_r(float(num.get("head_asym", "nan")), 1),
            pelvis_asym=_r(float(num.get("pelvis_asym", "nan")), 1),
            model_light=res.light, model_limb=res.suspected_limb,
        ),
        signals=dict(head=series(gait.head) if gait else None, pelvis=series(gait.pelvis) if gait else None),
    )
    path = os.path.join(OUT, cid + ".json")
    with open(path, "w", encoding="utf-8") as f:
        json.dump(clip, f, separators=(",", ":"))
    # demo copy of the analysed video (same time origin as the owner's original) + thumbnail
    samples = os.path.join(ROOT, "public", "gait", "samples")
    os.makedirs(samples, exist_ok=True)
    if c.get("sample"):
        dst = os.path.join(ROOT, "public", c["sample"].lstrip("/").replace("/", os.sep))
        if not os.path.exists(dst):
            shutil.copyfile(os.path.join(WORK, c["video"]), dst)
        cap = cv2.VideoCapture(os.path.join(WORK, c["video"]))
        cap.set(cv2.CAP_PROP_POS_FRAMES, k0 + (n - k0) // 3)
        ok, img = cap.read()
        if ok:
            hh, ww = img.shape[:2]
            scale = 480 / max(hh, ww)
            img = cv2.resize(img, (int(ww * scale), int(hh * scale)), interpolation=cv2.INTER_AREA)
            cv2.imwrite(dst.rsplit(".", 1)[0] + ".jpg", img, [cv2.IMWRITE_JPEG_QUALITY, 82])
    return dict(id=cid, species=c["species"], title=c["title"], bytes=c["bytes"], sample=c.get("sample"),
                thumb=c["sample"].rsplit(".", 1)[0] + ".jpg" if c.get("sample") else None,
                healthy=bool(c.get("healthy")), area=c["area"], source=c["source"],
                duration=round(clip["duration"], 2), kb=round(os.path.getsize(path) / 1024))


def main():
    os.makedirs(OUT, exist_ok=True)
    numbers = {}
    if os.path.exists(NUMBERS):
        with open(NUMBERS, encoding="utf-8") as f:
            numbers = {r["video"]: r for r in csv.DictReader(f)}
    index = [export(cid, c, numbers) for cid, c in CLIPS.items()]
    with open(os.path.join(OUT, "index.json"), "w", encoding="utf-8") as f:
        json.dump(index, f, indent=1)
    for row in index:
        print(row)


if __name__ == "__main__":
    main()
