# Medical Image Cards — drop-in photo slots

Each product card on the corporate site loads a real photo from this folder. Until a
file is present, the card shows a branded gradient + icon fallback, so the site looks
finished before the images land. Drop a file in with the exact name below and it appears
on next deploy — no code change.

**Recommended:** 1600 × 800 px (16:8), landscape, JPG, < 300 KB (optimized).
**License-clean sources (free for commercial use, no attribution):** Unsplash, Pexels, Pixabay.
Avoid Google Images results — mostly copyrighted.

| File | App | Search terms to find the right shot |
|------|-----|-------------------------------------|
| `forge.jpg`     | Forge — scheduling/PM hub        | "medical front desk reception", "clinic scheduling computer", "healthcare administration desk" |
| `revela.jpg`    | Revela — plastic/reconstructive  | "plastic surgery consultation", "aesthetic clinic modern", "surgeon consultation patient" |
| `mind.jpg`      | Mind — behavioral health         | "therapy session calm office", "psychiatry consultation", "mental health counseling room" |
| `or.jpg`        | OR — perioperative               | "operating room equipment", "surgical instruments sterile tray", "modern operating theatre" |
| `surgery.jpg`   | Surgery — documentation          | "surgeons operating teamwork", "surgical procedure operating room", "surgery team blue scrubs" |
| `profiler.jpg`  | Profiler — patient intake        | "patient tablet check-in", "person filling medical form clinic", "patient intake waiting room" |
| `companion.jpg` | Companion — self-management      | "patient using health app phone", "home recovery wellness", "telehealth remote monitoring" |

After adding files: `git add public/cards && git commit -m "Add card photos" && git push`.
