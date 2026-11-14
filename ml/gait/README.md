# Mobility check (dogs & cats)

Phone video of a dog walking/trotting side-on → body points → head & pelvis up/down symmetry → 🟢 / 🟠 / 🔴 + suspected leg. Warning only, not a diagnosis.

| File | What |
|---|---|
| `mobility_check.ipynb` | Colab notebook, end to end (upload video → SuperAnimal → analysis → annotated video → calibration table). **Generated, don't edit by hand.** |
| `gait_analysis.py` | Core method: signals, step detection, asymmetry index, traffic light. |
| `visualize.py` | Curves plot + annotated video. |
| `synthetic.py` | Simulated trotting dog with a chosen lame leg (for tests). |
| `test_gait.py` | Tests on simulated dogs (`python test_gait.py`). |
| `cat_analysis.py` | Cat checks: walk (head/pelvis + stance time per paw) and jump (hesitation, two-stage climb, aborted attempts, hind push-off). |
| `synthetic_cat.py`, `test_cat.py` | Simulated cats + tests (`python test_cat.py`). |
| `build_notebook.py` | Rebuilds the notebook from the `.py` files: `python build_notebook.py`. |

## Run on Colab
1. Open https://colab.research.google.com → File → Upload notebook → `mobility_check.ipynb`.
2. Runtime → Change runtime type → **T4 GPU**.
3. Run cells top to bottom; upload a dog video in section 3.

## Method in one paragraph
SuperAnimal-Quadruped (DeepLabCut, pretrained, 39 keypoints) tracks the dog. Head height (ear bases/eyes) and pelvis height (tail base) are normalised by body length, smoothed and de-trended. Each step gives one low point; with a sore leg the body drops less while that leg bears weight, so consecutive low points alternate high/low. Asymmetry index = consistent low-point difference ÷ up/down amplitude (%). The paw that is stationary (on the ground) at the higher low point = suspected leg. Head → front legs, pelvis → hind legs.

## Quality gates (added after the first real-video test)
A clip is answered with "please re-film" instead of a guess when: frame rate < 20 fps, head/pelvis up-down movement < 1% of body length, or fewer than 6 steps. An asymmetry is only flagged if the same step is higher stride after stride (t-statistic ≥ 2), so random noise is not called lameness.

## Real-video results so far (Colab, T4)
| Clip | Result | Note |
|---|---|---|
| PLOS ONE 2013 healthy dog, side view (12 fps) | before gates: false RED; with gates: should be re-film (fps gate, not re-run on this clip yet) | camera pans with the dog; 12 fps = ~4 frames per step |
| Wikimedia "Dog walking in the Mission in San Francisco" (24 fps, 5.5–12 s) | GREEN (head 11.5%, pelvis 5.3%) | skeleton tracks a black long-haired dog well; step detection still noisy (side agreement ~63%) |

## Known limits
- Thresholds (`GREEN_MAX=15`, `AMBER_MAX=30`) are placeholders – calibrate with labelled videos (notebook section 7).
- Left/right paws can be confused from a side view; a low "side agreement" is reported as a warning.
- SuperAnimal weights: non-commercial licence. A phone/product version needs our own trained model (e.g. on Dog-Pose; keypoint mapping `DOG_POSE_24` is ready).
