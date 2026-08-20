# Survey 35 PWA

An offline-capable RPN land-survey field calculator with an original HP-35s-inspired interface.

## Included
- Four-level X/Y/Z/T RPN stack
- Basic arithmetic, trig, inverse trig, square root, square, reciprocal
- DEG/RAD mode
- Coordinate inverse with quadrant bearing, azimuth, HD, ΔN, ΔE, and Gunther chains
- Forward/traverse coordinate calculation using quadrant bearing in DD.MMSS format
- Feet ↔ Gunther chains
- Simple circular curve solver with six solve modes: Radius+Delta, Radius+Arc, Radius+Chord, Tangent+Delta, Chord+Delta, Arc+Delta
- Full curve elements: R, Δ, arc, long chord, tangent, middle ordinate, external, and 100-ft arc degree of curve
- Triangle solver: SSS, SAS, ASA, AAS, and right-triangle legs
- Triangle outputs: all sides, all angles, area, perimeter, plus Law of Sines/Cosines reference formulas
- DD.MMSS / decimal degree conversion
- Local memory storage
- Offline service worker and installable PWA manifest

## Install on iPhone
The app must be served over HTTPS; opening the HTML file directly will not install as a PWA.

1. Upload this folder to any static HTTPS host such as GitHub Pages, Netlify, or Cloudflare Pages.
2. Open the resulting URL in Safari on your iPhone.
3. Tap Share.
4. Choose **Add to Home Screen**.
5. Launch **Survey 35** from the new icon.

After the first successful load, the core calculator works offline.

## Bearing format
Forward/traverse bearings use quadrant + `DD.MMSS`, for example:
- N 45.3015 E = N 45°30′15″ E
- S 12.0500 W = S 12°05′00″ W

## Disclaimer
Use normal survey QA/QC procedures. This software is a field aid and should not be treated as an independent professional verification or authoritative record.
