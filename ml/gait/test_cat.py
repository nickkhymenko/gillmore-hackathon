"""Run: python -m pytest -q test_cat.py   (or: python test_cat.py)"""
from cat_analysis import analyse_cat, analyse_jump
from synthetic_cat import make_jump, make_walk


def walk(**kw):
    kps, fps = make_walk(**kw)
    return analyse_cat(kps, fps, mode="walk")


def jump(**kw):
    kps, fps = make_jump(**kw)
    return analyse_cat(kps, fps, mode="jump")


def test_sound_walk_is_green():
    r = walk(long_stance=None)
    s = r.stance
    assert r.light == "green", (r.light, s.front_asymmetry, s.hind_asymmetry, r.gait.light)


def test_sound_walk_moving_left_is_green():
    r = walk(long_stance=None, direction=-1, seed=4)
    assert r.light == "green", (r.light, r.stance.front_asymmetry, r.stance.hind_asymmetry)


def test_long_stance_hind_left_flagged():
    r = walk(long_stance="hind_left", severity=0.5, seed=1)
    assert r.light in ("amber", "red"), (r.light, r.stance.hind_asymmetry)
    assert r.suspected_limb == "hind left", r.suspected_limb
    assert "movement changes" in r.message, r.message


def test_long_stance_front_right_flagged():
    r = walk(long_stance="front_right", severity=0.8, seed=2, direction=-1)
    assert r.light in ("amber", "red"), (r.light, r.stance.front_asymmetry)
    assert r.suspected_limb == "front right", r.suspected_limb


def test_smooth_jump_is_green():
    r = jump(kind="smooth")
    j = r.jump
    assert r.light == "green", (r.light, j.flags, j.hesitation_s, j.n_stages, j.push_off_diff_s)
    assert j.n_stages == 1 and j.aborted_attempts == 0
    assert 1.3 < j.jump_height_bl < 2.0, j.jump_height_bl


def test_hesitant_jump_flagged():
    r = jump(kind="hesitant", seed=1)
    assert r.light in ("amber", "red"), (r.light, r.jump.hesitation_s)
    assert "Hesitated" in r.message, r.message


def test_two_stage_climb_flagged():
    r = jump(kind="two_stage", seed=2)
    assert r.light in ("amber", "red"), (r.light, r.jump.n_stages)
    assert r.jump.two_stage and "two stages" in r.message, r.message


def test_aborted_attempt_flagged():
    r = jump(kind="aborted", seed=3)
    assert r.light in ("amber", "red"), (r.light, r.jump.aborted_attempts)
    assert r.jump.aborted_attempts >= 1 and "did not jump" in r.message, r.message


def test_uneven_push_off_flagged():
    kps, fps = make_jump(kind="smooth", push_delay_s=0.15, seed=5)
    j = analyse_jump(kps, fps)
    assert j.light in ("amber", "red"), (j.light, j.push_off_diff_s)
    assert "unevenly" in j.message, j.message


def test_short_jump_clip_retake():
    r = jump(kind="smooth", seconds=1.0)
    assert r.light == "retake", (r.light, r.message)


def test_short_walk_clip_retake():
    r = walk(long_stance=None, seconds=0.8)
    assert r.light == "retake", (r.light, r.message)


if __name__ == "__main__":
    for name, fn in list(globals().items()):
        if name.startswith("test_"):
            try:
                fn(); print("PASS", name)
            except AssertionError as e:
                print("FAIL", name, e)
