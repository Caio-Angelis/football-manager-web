"""Remove solid black backgrounds from club badge PNGs and resize brand assets."""
from pathlib import Path
from PIL import Image
import numpy as np

ROOT = Path(__file__).resolve().parents[1]
badges = ROOT / 'frontend' / 'public' / 'badges'

for path in sorted(badges.glob('*.png')):
    im = Image.open(path).convert('RGBA')
    arr = np.asarray(im).copy()
    r, g, b, a = arr[:, :, 0], arr[:, :, 1], arr[:, :, 2], arr[:, :, 3]
    dark = (r < 28) & (g < 28) & (b < 28) & (a > 0)
    h, w = dark.shape
    visited = np.zeros((h, w), dtype=bool)
    stack: list[tuple[int, int]] = []
    for x in range(w):
        if dark[0, x]:
            stack.append((0, x))
        if dark[h - 1, x]:
            stack.append((h - 1, x))
    for y in range(h):
        if dark[y, 0]:
            stack.append((y, 0))
        if dark[y, w - 1]:
            stack.append((y, w - 1))
    while stack:
        y, x = stack.pop()
        if y < 0 or y >= h or x < 0 or x >= w or visited[y, x] or not dark[y, x]:
            continue
        visited[y, x] = True
        stack.extend([(y - 1, x), (y + 1, x), (y, x - 1), (y, x + 1)])
    cleared = int(visited.sum())
    arr[visited, 3] = 0
    out = Image.fromarray(arr, 'RGBA')
    bbox = out.getbbox()
    if bbox:
        pad = 4
        l, t, r2, b2 = bbox
        l = max(0, l - pad)
        t = max(0, t - pad)
        r2 = min(w, r2 + pad)
        b2 = min(h, b2 + pad)
        out = out.crop((l, t, r2, b2))
    mw = max(out.size)
    if mw > 320:
        scale = 320 / mw
        out = out.resize(
            (max(1, int(out.width * scale)), max(1, int(out.height * scale))),
            Image.Resampling.LANCZOS,
        )
    out.save(path, optimize=True)
    print(f'{path.name}: cleared={cleared} size={out.size} bytes={path.stat().st_size}')

logo = Image.open(ROOT / 'frontend' / 'public' / 'brand' / 'fm-web-logo.png').convert('RGBA')
for size, dest in [
    (256, ROOT / 'frontend' / 'public' / 'brand' / 'fm-web-logo.png'),
    (64, ROOT / 'frontend' / 'public' / 'favicon.png'),
    (180, ROOT / 'frontend' / 'public' / 'brand' / 'apple-touch-icon.png'),
]:
    resized = logo.resize((size, size), Image.Resampling.LANCZOS)
    resized.save(dest, optimize=True)
    print(f'wrote {dest.name} {size}px {dest.stat().st_size}b')
