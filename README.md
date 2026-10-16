# I-Brick, public site

Source for the I-Brick pilot-programme page: <https://ckteja.github.io/i-brick/>

I-Brick is an early-stage real-time structural health monitoring device and software platform.
The current stage is MVP software with prototype hardware. Its broader development scope includes
moisture and mould risk, structural deformation, and energy efficiency; the current prototype
focuses on wall-adjacent environmental conditions, while other capabilities require further
sensing and validation.

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
