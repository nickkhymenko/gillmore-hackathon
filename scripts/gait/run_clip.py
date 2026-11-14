"""Runs the team's unchanged ml/gait pipeline (SuperAnimal-Quadruped + analyse_cat / analyse_gait) on one new
openly licensed clip and exports the website JSON with export_web.export. Nothing in ml/** is edited:
the pipeline functions are imported and only the input/output folders are pointed elsewhere.

Needs DeepLabCut 3 (PyTorch), OpenCV and ffmpeg; runs on a laptop (Apple MPS) in about 5 minutes for 6 s of video.
usage: python scripts/gait/run_clip.py <repo> <src video> <id> <species> <start> <duration> <title> <source>
"""
import glob
import json
import os
import sys

repo, src, cid, species, start, dur, title, source = sys.argv[1:9]
sys.path.insert(0, os.path.join(repo, "ml", "gait"))

import export_web  # noqa: E402
from run_demo import _normalise  # noqa: E402
from gait_analysis import analyse_gait, keypoints_from_dlc_h5  # noqa: E402
from cat_analysis import analyse_cat  # noqa: E402
import cv2  # noqa: E402

work = os.path.abspath(os.path.join(os.environ.get("GAIT_WORK", "/tmp/gait-work"), cid))
os.makedirs(work, exist_ok=True)
vid = os.path.join(work, cid + ".mp4")
if not os.path.exists(vid):
    _normalise(src, vid, float(start), float(dur))

if not glob.glob(os.path.join(work, cid + "*.h5")):
    from deeplabcut.modelzoo.video_inference import video_inference_superanimal
    video_inference_superanimal(videos=[vid], superanimal_name="superanimal_quadruped", model_name="hrnet_w32",
                                detector_name="fasterrcnn_resnet50_fpn_v2", max_individuals=1, dest_folder=work,
                                create_labeled_video=False)

h5 = sorted(glob.glob(os.path.join(work, cid + "*.h5")), key=os.path.getmtime)[-1]
fps = cv2.VideoCapture(vid).get(cv2.CAP_PROP_FPS)
kps = keypoints_from_dlc_h5(h5)
if species == "cat":
    res = analyse_cat(kps, fps, "walk")
    g = res.gait
else:
    res = g = analyse_gait(kps, fps)
head = g.head.asymmetry_index if g else float("nan")
pelvis = g.pelvis.asymmetry_index if g else float("nan")
print(json.dumps(dict(light=res.light, limb=res.suspected_limb, message=res.message, head=head, pelvis=pelvis,
                      warnings=list(getattr(res, "warnings", []))), default=str))

# The finding, area and healthy flag come from the model's own verdict, never hand-written.
limb = res.suspected_limb
healthy = res.light == "green"
# Highlight a head or hip chart only when that signal itself crossed the model's green limit (GREEN_MAX);
# a cat finding from stance time alone shows in neither chart.
from gait_analysis import GREEN_MAX  # noqa: E402
sig = {"head": head, "pelvis": pelvis}
want = None if healthy or not limb else ("head" if limb.startswith("front") else "pelvis")
key = want if want and sig[want] == sig[want] and sig[want] > GREEN_MAX else None
export_web.WORK = work
export_web.OUT = os.path.join(repo, "public", "gait", "clips")
cfg = dict(sample=f"/gait/samples/{cid}.mp4", species=species, h5=os.path.basename(h5), video=cid + ".mp4", bytes=None,
           start=0.0, cut=0.0, title=title, source=source, finding=res.message, area=None if healthy else limb, key=key,
           healthy=healthy, numbers=dict(head_asym=head, pelvis_asym=pelvis))
row = export_web.export(cid, cfg, {})
row["model_light"] = res.light
print(json.dumps(row))
