"""Build mobility_check.ipynb from the .py modules (single source of truth).

Run: python build_notebook.py
"""
from pathlib import Path

import nbformat as nbf

HERE = Path(__file__).parent
md, code = nbf.v4.new_markdown_cell, nbf.v4.new_code_cell


def writefile(name: str) -> str:
    return f"%%writefile {name}\n" + (HERE / name).read_text(encoding="utf-8")


cells = [
    md("""# Pet mobility check (dogs & cats) – gait asymmetry from a phone video

**What it does:** film a dog walking or trotting past the camera, side-on. The notebook finds 39 body points per frame (DeepLabCut **SuperAnimal-Quadruped**, pretrained, no training needed), then measures how evenly the **head** and **pelvis** move up and down with each step.

**Why head and pelvis:** a dog with a sore leg drops its body *less* when that leg takes weight, so the two low points in each stride become unequal (Gómez Álvarez et al. 2017, *Vet J*; Bergh et al. 2018, *Acta Vet Scand*). Head = front legs, pelvis = hind legs.

**Output:** 🟢 looks even · 🟠 keep an eye · 🔴 ask your vet, plus which leg is suspected.
⚠️ **Screening/warning only, not a diagnosis.** Thresholds are placeholders until calibrated on real videos (section 6).

**How to film:** phone held still (or on a tripod) at the dog's height, 3–5 m away, dog walks or trots **across** the frame for at least 3–4 full strides, flat ground, whole dog visible.

**Before running:** `Runtime → Change runtime type → GPU (T4)`."""),
    md("## 1. Setup"),
    code("!nvidia-smi --query-gpu=name,memory.total --format=csv || echo 'No GPU - switch runtime to GPU'"),
    code("""# Takes a few minutes. If Colab asks to restart the session afterwards, restart and continue from the next cell.
!pip install -q --pre deeplabcut"""),
    md("## 2. Analysis code\nThese cells write the helper modules (same files as `ml/gait/` in the repo)."),
    code(writefile("gait_analysis.py")),
    code(writefile("visualize.py")),
    code(writefile("synthetic.py")),
    md("### Self-test (no video, no GPU needed)\nA simulated dog that is lame on the front-left leg. Expect 🔴 *front left*."),
    code("""%matplotlib inline
import importlib, gait_analysis, visualize, synthetic
for m in (gait_analysis, visualize, synthetic): importlib.reload(m)
from gait_analysis import analyse_gait, keypoints_from_dlc_h5
from visualize import plot_signals, render_video
from synthetic import make_trot

for lame in [None, "front_left", "hind_right"]:
    r = analyse_gait(*make_trot(lame=lame, severity=0.8))
    print(f"simulated: {str(lame):11s} -> {r.light:6s} {r.suspected_limb}  "
          f"(head {r.head.asymmetry_index:.0f}%, pelvis {r.pelvis.asymmetry_index:.0f}%)")
plot_signals(analyse_gait(*make_trot(lame="front_left", severity=0.8)), "Simulated dog");"""),
    md("""## 3. Get a video
Either paste a direct video URL, or leave it empty to upload a file (mp4/mov) from your computer.

Open-licence test clips (supplementary videos of PLOS ONE 2013, doi:10.1371/journal.pone.0059875, CC BY 2.5, via Wikimedia Commons):
- healthy dog, side view: `https://upload.wikimedia.org/wikipedia/commons/9/95/Quantitative-Phenotyping-of-Duchenne-Muscular-Dystrophy-Dogs-by-Comprehensive-Gait-Analysis-and-pone.0059875.s003.ogv`
- dog with abnormal (dystrophic) gait: `https://upload.wikimedia.org/wikipedia/commons/8/84/Quantitative-Phenotyping-of-Duchenne-Muscular-Dystrophy-Dogs-by-Comprehensive-Gait-Analysis-and-pone.0059875.s002.ogv`"""),
    code("""import os, subprocess
from google.colab import files

video_url = ""  # @param {type:"string"}
if video_url:
    raw_path = "/content/" + os.path.basename(video_url.split("?")[0])
    subprocess.run(["curl", "-sSfL", "-A", "gait-demo-notebook/0.1", "-o", raw_path, video_url], check=True)
    assert os.path.getsize(raw_path) > 0, "download failed (empty file)"
else:
    uploaded = files.upload()
    raw_path = os.path.abspath(next(iter(uploaded)))
print("video:", raw_path, os.path.getsize(raw_path), "bytes")"""),
    code("""# Normalise: max 1280 px wide, H.264, no audio, optional trim. Smaller = much faster pose estimation.
start_s = 0      # @param {type:"number"}
duration_s = 0   # @param {type:"number"}  (0 = whole video)
os.makedirs("/content/work", exist_ok=True)
video_path = "/content/work/" + os.path.splitext(os.path.basename(raw_path))[0].replace(" ", "_") + ".mp4"
trim = (["-ss", str(start_s)] if start_s else []) + (["-t", str(duration_s)] if duration_s else [])
subprocess.run(["ffmpeg", "-y", "-loglevel", "error", *trim, "-i", raw_path,
                "-vf", "scale='min(1280,iw)':-2", "-an", "-c:v", "libx264", "-pix_fmt", "yuv420p", video_path], check=True)
print("ready:", video_path)"""),
    md("## 4. Find the dog's body points (SuperAnimal-Quadruped)\n`video_adapt=True` reduces jitter (recommended for the final demo) but takes longer."),
    code("""import glob
from deeplabcut.modelzoo.video_inference import video_inference_superanimal

video_adapt = False  # @param {type:"boolean"}
out_dir = "/content/work/results"
os.makedirs(out_dir, exist_ok=True)

_ = video_inference_superanimal(
    videos=[video_path],
    superanimal_name="superanimal_quadruped",
    model_name="hrnet_w32",
    detector_name="fasterrcnn_resnet50_fpn_v2",
    video_adapt=video_adapt,
    max_individuals=1,
    dest_folder=out_dir,
)
stem = os.path.splitext(os.path.basename(video_path))[0]
h5s = sorted(glob.glob(f"{out_dir}/{stem}*.h5"), key=os.path.getmtime)
print("\\n".join(h5s))
h5_path = h5s[-1]  # newest (after_adapt if adaptation was used)"""),
    md("## 5. Gait analysis"),
    code("""import cv2
fps = cv2.VideoCapture(video_path).get(cv2.CAP_PROP_FPS)
kps = keypoints_from_dlc_h5(h5_path)
result = analyse_gait(kps, fps)

icon = {"green": "🟢", "amber": "🟠", "red": "🔴", "retake": "⚪"}[result.light]
print(f"{icon} {result.light.upper()}  {result.suspected_limb or ''}")
print(result.message)
print(f"head asymmetry  : {result.head.asymmetry_index:.1f}%  ({result.head.n_steps} steps, side agreement {result.head.side_agreement:.0%})")
print(f"pelvis asymmetry: {result.pelvis.asymmetry_index:.1f}%  ({result.pelvis.n_steps} steps, side agreement {result.pelvis.side_agreement:.0%})")
for w in result.warnings:
    print("⚠", w)
plot_signals(result, stem);"""),
    code("""# Annotated result video (skeleton + banner), converted to H.264 so it plays in the browser
from IPython.display import HTML
from base64 import b64encode

tmp = f"/content/work/{stem}_annot_raw.mp4"
annotated = f"/content/work/{stem}_mobility.mp4"
render_video(video_path, kps, result, tmp)
subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-i", tmp, "-c:v", "libx264", "-pix_fmt", "yuv420p", annotated], check=True)
HTML(f'<video width=720 controls autoplay loop muted src="data:video/mp4;base64,{b64encode(open(annotated, "rb").read()).decode()}"></video>')"""),
    code("files.download(annotated)"),
    md("""## 6. Cat mode 🐈
Cats rarely limp visibly: most cats with arthritis just shift weight off the sore leg and stop jumping (Stadig et al. 2016, *Acta Vet Scand*; Slingerland et al. 2011, *Vet J*: 61% of cats ≥6 y have OA). So for cats we add two checks:
- **walk**: head/pelvis symmetry (as dogs) **+ stance time** per paw (a sore paw stays down longer).
- **jump**: film the cat jumping onto a sofa/bed → hesitation before take-off, one smooth jump vs two-stage climb, aborted attempts, hind push-off timing.

Use sections 3–4 with a cat video first (SuperAnimal-Quadruped covers cats), then run below. Thresholds are placeholders."""),
    code(writefile("cat_analysis.py")),
    code(writefile("synthetic_cat.py")),
    code("""import importlib, cat_analysis, synthetic_cat
for m in (gait_analysis, cat_analysis, synthetic_cat): importlib.reload(m)
from cat_analysis import analyse_cat
from synthetic_cat import make_walk, make_jump

# self-test on simulated cats
for label, (k, f), mode in [("sound walk", make_walk(), "walk"),
                            ("hind-left long stance", make_walk(long_stance="hind_left", severity=0.6), "walk"),
                            ("smooth jump", make_jump("smooth"), "jump"),
                            ("hesitant jump", make_jump("hesitant"), "jump"),
                            ("two-stage climb", make_jump("two_stage"), "jump")]:
    r = analyse_cat(k, f, mode)
    print(f"simulated {label:22s} -> {r.light:6s} {r.suspected_limb or ''}  | {r.message[:70]}")"""),
    code("""# Run on the video analysed in section 4
cat_mode = "walk"  # @param ["walk", "jump"]
import matplotlib.pyplot as plt
cat = analyse_cat(kps, fps, cat_mode)
icon = {"green": "🟢", "amber": "🟠", "red": "🔴", "retake": "⚪"}[cat.light]
print(f"{icon} {cat.light.upper()}  {cat.suspected_limb or ''}\\n{cat.message}")
if cat.stance:
    s = cat.stance
    print("mean stance (s):", {k: round(v, 2) for k, v in s.mean_stance_s.items()},
          f"| front asym {s.front_asymmetry:.0f}%  hind asym {s.hind_asymmetry:.0f}%")
if cat.jump:
    j = cat.jump
    print(f"hesitation {j.hesitation_s:.1f}s | height {j.jump_height_bl:.2f} body lengths | stages {j.n_stages} | "
          f"aborted {j.aborted_attempts} | push-off diff {j.push_off_diff_s:.2f}s | flags: {j.flags}")
    plt.figure(figsize=(10, 3)); plt.plot(j.t, j.centre_up); plt.title("Body centre height"); plt.xlabel("time (s)")
    for x in (j.takeoff_s, j.landing_s):
        if x == x: plt.axvline(x, ls="--", c="grey")
for w in cat.warnings:
    print("⚠", w)"""),
    md("""## 6b. Demo batch (pitch videos)
Put real owner videos (e.g. from Reddit) in `/content/demo_in/` named `cat1.mp4`, `dog1.mp4`, …
(drag them into the Files panel). `demo=True` draws a hand-written red "Ask your vet" banner with a small DEMO tag;
the table still shows what the model itself measured. Optional `trims = {"dog1": (start_s, duration_s)}`."""),
    code(writefile("run_demo.py")),
    code("""import importlib, visualize, run_demo
for m in (gait_analysis, cat_analysis, visualize, run_demo): importlib.reload(m)
os.makedirs("/content/demo_in", exist_ok=True)
trims = {}  # e.g. {"dog1": (2, 8)}
table = run_demo.run_folder("/content/demo_in", "/content/demo_out", demo=True, trims=trims)
table"""),
    code("""# Download all demo videos as one zip
import shutil
shutil.make_archive("/content/demo_videos", "zip", "/content/demo_out", ".")
files.download("/content/demo_videos.zip")"""),
    md("""## 7. Calibrate thresholds on several videos
This answers *"how do we know what is a good or bad gait?"*: the pose dataset has no healthy/lame labels, so **we label our own videos**.

1. Put videos in Google Drive, named with their label: `healthy_bella.mp4`, `lame_frontleft_max.mp4`, …
2. Run the cells below → a table of asymmetry per video.
3. Set `GREEN_MAX` just above the healthy dogs' values and check the lame dogs land above it.

Best label source: a vet watching the same clips and saying lame / not lame."""),
    code("""from google.colab import drive
drive.mount("/content/drive")
video_dir = "/content/drive/MyDrive/gait-videos"  # @param {type:"string"}"""),
    code("""import pandas as pd

rows = []
for src in sorted(glob.glob(f"{video_dir}/*.mp4") + glob.glob(f"{video_dir}/*.mov")):
    name = os.path.splitext(os.path.basename(src))[0].replace(" ", "_")
    dst = f"/content/work/{name}.mp4"
    subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-i", src, "-vf", "scale='min(1280,iw)':-2",
                    "-an", "-c:v", "libx264", "-pix_fmt", "yuv420p", dst], check=True)
    video_inference_superanimal(videos=[dst], superanimal_name="superanimal_quadruped", model_name="hrnet_w32",
                                detector_name="fasterrcnn_resnet50_fpn_v2", max_individuals=1,
                                dest_folder=out_dir, create_labeled_video=False)
    h5 = sorted(glob.glob(f"{out_dir}/{name}*.h5"), key=os.path.getmtime)[-1]
    r = analyse_gait(keypoints_from_dlc_h5(h5), cv2.VideoCapture(dst).get(cv2.CAP_PROP_FPS))
    rows.append(dict(video=name, label=name.split("_")[0], light=r.light, limb=r.suspected_limb,
                     head_asym=round(r.head.asymmetry_index, 1), pelvis_asym=round(r.pelvis.asymmetry_index, 1),
                     steps=min(r.head.n_steps, r.pelvis.n_steps), warnings="; ".join(r.warnings)))
table = pd.DataFrame(rows)
table.to_csv("/content/work/calibration.csv", index=False)
table"""),
    code("""# Current thresholds (edit and re-run section 5/6 to try new ones)
import gait_analysis
print("GREEN_MAX =", gait_analysis.GREEN_MAX, " AMBER_MAX =", gait_analysis.AMBER_MAX)
if len(table):
    print(table.groupby("label")[["head_asym", "pelvis_asym"]].describe().round(1))"""),
]

nb = nbf.v4.new_notebook(cells=cells)
nb.metadata.update({
    "colab": {"provenance": [], "gpuType": "T4"},
    "accelerator": "GPU",
    "kernelspec": {"name": "python3", "display_name": "Python 3"},
    "language_info": {"name": "python"},
})
out = HERE / "mobility_check.ipynb"
nbf.write(nb, out)
print("wrote", out)
