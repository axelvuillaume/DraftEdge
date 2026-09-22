# Génère les tuiles MSIX (resources/appx) à partir de resources/icon.png. Usage : python3 scripts/appx-assets.py
from pathlib import Path
from PIL import Image
root = Path(__file__).resolve().parent.parent
out = root / 'resources' / 'appx'
out.mkdir(exist_ok=True)
for f in out.glob('*.png'): f.unlink()
src = Image.open(root / 'resources' / 'icon.png').convert('RGBA')

def make(w, h, ratio, name):
    c = Image.new('RGBA', (w, h), (0, 0, 0, 0))
    s = int(min(w, h) * ratio)
    c.alpha_composite(src.resize((s, s), Image.LANCZOS), ((w - s) // 2, (h - s) // 2))
    c.save(out / name)

scales = {100: 1, 125: 1.25, 150: 1.5, 200: 2, 400: 4}
bases = {'Square44x44Logo': (44, 44, 1.0), 'Square150x150Logo': (150, 150, 0.6), 'Wide310x150Logo': (310, 150, 0.6),
         'LargeTile': (310, 310, 0.6), 'SmallTile': (71, 71, 0.7), 'StoreLogo': (50, 50, 1.0), 'SplashScreen': (620, 300, 0.5)}
for name, (w, h, r) in bases.items():
    make(w, h, r, f'{name}.png')
    for sc, f in scales.items():
        make(round(w * f), round(h * f), r, f'{name}.scale-{sc}.png')
for t in (16, 20, 24, 30, 32, 36, 40, 48, 60, 64, 72, 80, 96, 256):
    for suffix in ('', '_altform-unplated', '_altform-lightunplated'):
        make(t, t, 1.0, f'Square44x44Logo.targetsize-{t}{suffix}.png')
print(len(list(out.glob('*.png'))), 'fichiers')
