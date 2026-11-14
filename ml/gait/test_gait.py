"""Run: python -m pytest -q   (or: python test_gait.py)"""
from gait_analysis import analyse_gait
from synthetic import make_trot


def run(**kw):
    kps, fps = make_trot(**kw)
    return analyse_gait(kps, fps)


def test_sound_dog_is_green():
    r = run(lame=None)
    assert r.light == "green", (r.light, r.head.asymmetry_index, r.pelvis.asymmetry_index)


def test_front_left_lame_is_red():
    r = run(lame="front_left", severity=0.8)
    assert r.light == "red", (r.light, r.head.asymmetry_index)
    assert r.suspected_limb == "front left", r.suspected_limb


def test_front_right_lame_moving_left():
    r = run(lame="front_right", severity=0.8, direction=-1, seed=3)
    assert r.light == "red"
    assert r.suspected_limb == "front right", r.suspected_limb


def test_hind_right_lame():
    r = run(lame="hind_right", severity=0.8, seed=1)
    assert r.light == "red", (r.light, r.pelvis.asymmetry_index)
    assert r.suspected_limb == "hind right", r.suspected_limb


def test_mild_is_amber():
    r = run(lame="front_left", severity=0.4, seed=2)
    assert r.light == "amber", (r.light, r.head.asymmetry_index)


def test_short_clip_retake():
    r = run(lame=None, seconds=0.6)
    assert r.light == "retake"


def test_low_fps_retake():
    kps, _ = make_trot(lame="front_left", severity=0.8, fps=12)
    from gait_analysis import analyse_gait as ag
    assert ag(kps, 12).light == "retake"


def test_noise_only_not_flagged():
    # tiny real movement buried in noise (like a panning, low-quality clip)
    r = run(lame=None, noise_px=3.0, seed=5)
    assert r.light in ("green", "retake"), (r.light, r.head.asymmetry_index, r.head.consistency_t)


def test_no_vertical_movement_retake():
    kps, fps = make_trot(lame=None, noise_px=0.3)
    # flatten head and pelvis vertical movement to ~0.2% body length
    for k in ["left_earbase", "right_earbase", "left_eye", "right_eye", "tail_base", "neck_base"]:
        x, y, p = kps[k]
        kps[k] = (x, 400 + (y - y.mean()) * 0.03, p)
    from gait_analysis import analyse_gait as ag
    assert ag(kps, fps).light == "retake", ag(kps, fps).light


if __name__ == "__main__":
    for name, fn in list(globals().items()):
        if name.startswith("test_"):
            try:
                fn(); print("PASS", name)
            except AssertionError as e:
                print("FAIL", name, e)
