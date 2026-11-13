"""Spatial lab: text sharpness of the four quarters of the 'sharp' view (SharpTest.tsx), against quarter A (2D DOM).

    python3 -I src/lab3d/tools/sharpness.py out/spatial-lab/work/sharp.png

For each quarter: the luminance gradient (Sobel) over the text box; 'p99' is the 99th percentile of the gradient
magnitude divided by the text/background contrast (1.0 = a one-pixel step), 'energy' the mean squared gradient
of the strongest 2% of pixels. Both relative to A. Lower = softer text.
"""
import sys

import numpy as np
from PIL import Image


def lum(im):
    a = np.asarray(im.convert('RGB'), dtype=np.float64) / 255.0
    return 0.2126 * a[..., 0] + 0.7152 * a[..., 1] + 0.0722 * a[..., 2]


def sobel(y):
    kx = np.array([[-1, 0, 1], [-2, 0, 2], [-1, 0, 1]], dtype=np.float64) / 8.0
    ky = kx.T
    pad = np.pad(y, 1, mode='edge')
    gx = sum(kx[i, j] * pad[i:i + y.shape[0], j:j + y.shape[1]] for i in range(3) for j in range(3))
    gy = sum(ky[i, j] * pad[i:i + y.shape[0], j:j + y.shape[1]] for i in range(3) for j in range(3))
    return np.hypot(gx, gy)


def measure(y):
    g = sobel(y)
    contrast = np.percentile(y, 99.5) - np.percentile(y, 2)
    p99 = np.percentile(g, 99) / max(1e-6, contrast)
    top = np.sort(g.ravel())[-max(1, g.size // 50):]
    return p99, float(np.mean(top ** 2)) / max(1e-9, contrast ** 2)


def main():
    path = sys.argv[1]
    im = Image.open(path)
    W, H = im.size
    # 3 x 2 cells of 640 x 540; the text sits around each cell's centre
    names = ['A screen space', "B old World", 'C lens, scale3d outer', 'D old World + 2x', 'E old World + Crisp', 'F lib camera lens + Crisp']
    boxes = {}
    for i, n in enumerate(names):
        cx, cy = (i % 3) * 640 + 320, (i // 3) * 540 + 270
        boxes[n] = (cx - 270, cy - 70, cx + 270, cy + 70)
    res = {k: measure(lum(im.crop(b))) for k, b in boxes.items()}
    a = res[names[0]]
    for k, (p, e) in res.items():
        print(f'{k:20s}  p99 {p:.3f} ({p / a[0] * 100:5.1f}%)   energy {e:.4f} ({e / a[1] * 100:5.1f}%)')


if __name__ == '__main__':
    main()
