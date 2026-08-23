# I-Brick, public site

Source for the I-Brick pilot-programme page: <https://ckteja.github.io/i-brick/>

I-Brick is a sensor node that sits inside the wall and reports the moisture, thermal and
air-quality conditions that drive building-envelope failure, as an explainable 0–100 risk
score with the reasoning attached.

**The pilot programme is open.** Four sites for Q4 2026, no cost, 12 weeks.
Enquiries: <contactibricklabs@gmail.com>

## Contents

| Path | What |
|---|---|
| `index.html` | The entire page: self-contained, no build step, no dependencies |
| `assets/` | Product screenshots and the social link-preview card |
| `.nojekyll` | Serve files as-is, no Jekyll processing |

## Local preview

```bash
python -m http.server 8777
```

Then open <http://localhost:8777>.

## Deployment

GitHub Pages, served from `main` at the repository root. Any push to `main` republishes the
page within about a minute.

---

© 2026 I-Brick. All rights reserved. Product screenshots and brand marks are not licensed
for reuse.
