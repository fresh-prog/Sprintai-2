import numpy as np
from src.geometry import angle, range_of_motion, robinson_symmetry


def test_angle_right_angle():
    a = np.array([1, 0, 0])
    b = np.array([0, 0, 0])
    c = np.array([0, 1, 0])
    assert angle(a, b, c) == 90.0


def test_robinson_zero_for_equal():
    assert robinson_symmetry(90, 90) == 0


def test_rom_basic():
    series = [{"knee": 90}, {"knee": 120}, {"knee": 60}]
    out = range_of_motion(series)
    assert out["knee"]["min"] == 60
    assert out["knee"]["max"] == 120
    assert out["knee"]["range"] == 60
