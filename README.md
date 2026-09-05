# Fruits Cut AR

Camera-passthrough fruit slicing game. Cut with your hand via webcam hand
tracking, or by swiping. 23 fruits, bombs, three modes.

Everything is in this one folder. There are two ways to run it and they
share the same files — pick whichever you prefer.

## Live Demo

🔗 [FruitsCutAR – Live Website](https://fruitcuts-ar.vercel.app/)

## Run it

### Option A — Vite (recommended)

```bash
npm install
npm run dev
```

Opens **http://localhost:5291/** automatically. Hot reload: edit
`index.html` and the browser updates itself.

### Option B — no install at all

```bash
node serve.js          # or, if you prefer Python:
python serve.py        # Windows
python3 serve.py       # Mac / Linux
```

Then open **http://localhost:8790/**. Or just double-click
`start-windows.bat` / `start-mac-linux.command`, which pick whichever
runtime you have.

> **Windows note:** `python3` on Windows is a Microsoft Store alias, not
> real Python. It prints *"Python was not found"* even when Python is
> installed. Use `python` or `py`.

Both options serve the identical game. Vite is nicer to develop against;
the plain servers exist so the project runs on a machine with nothing
installed.

### Why localhost and not the file directly

Double-clicking `index.html` gives a `file://` URL where
`navigator.mediaDevices` does not exist at all, so the camera fails before
it can even ask permission — no prompt, no error, just a dead feed.

Browsers grant camera access on a *secure context*: `https://` **or**
`localhost`. That is why plain HTTP on localhost is fine and needs no
certificate. A phone at `192.168.x.x` gets no such exemption — see below.

---

## Build

```bash
npm run build          # -> dist/
npm run preview        # Vite's own preview of dist/
node serve.js --dist   # or serve dist/ with the plain server
```

---

## Playing

Choose an input mode, then a game mode.

**Hand tracking** — the front camera watches your hand; your index
fingertip is the blade, with a glow riding on it. Both hands work at once,
so you get two blades. Hold your hand about an arm's length away, palm
toward the camera. Good light on your hand matters more than anything else.

**Touch & swipe** — swipe the screen or drag with the mouse.

| Mode | Rules |
|---|---|
| Classic | Endless, difficulty climbs with your score. |
| Arcade | 60 seconds, dense waves, double points on fruit. |
| Zen | 90 seconds, no bombs, nothing to lose. |

**Scoring.** There are no lives — the score itself is the health bar.

- Fruit sliced: **+2** (doubled in Arcade)
- Bomb sliced: **−2**
- Score below zero: **game over**
- Dropping a fruit costs nothing but your combo

Cutting several fruit in **one continuous stroke** pays extra: three in a
sweep scores 11, three separate cuts score 6. Lifting the blade, or just
holding still, ends the stroke. Set `FRUIT_POINTS`/`BOMB_PENALTY` at the
top of the script to retune; delete the two bonus lines in `sliceFruit()`
for flat scoring.

Note that at a score of 0, one bomb ends the run immediately — there is no
buffer at the start. Slice a couple of fruit before you take any risks.

**Camera toggle** sits top-right. Switching it off releases the camera
properly — tracks are stopped, so the indicator light goes out and other
apps can use it again. Leaving the tab does the same automatically, and it
comes back when you return unless you switched it off yourself. Permission
is already granted by then, so there is no second prompt.

Pause with Esc or the Menu button. The game pauses itself when the window
loses focus, so you cannot lose a run by alt-tabbing. High scores are saved
per mode.

---

## Layout

```
index.html               the entire game — markup, styles, logic
vite.config.js           dev on 5291, preview on 5292
vercel.json              deploy config
serve.js / serve.py      no-build servers (http 8790, https 8791)
start-*.bat/.command     launchers for those
certs/                   self-signed cert for phone testing — git-ignored
public/
  sprites/               71 PNGs: 23 fruits x (whole, left, right) + bomb + blast
  mediapipe/             offline hand-tracking runtime and model
  thumbnail.png          favicon
```

`public/` is served from the site root and copied into `dist/` untouched.
Swap a sprite by dropping a new PNG over the old one — no rebuild, no
import to update. `serve.js` and `serve.py` mimic that same root-plus-public
lookup so both ways of running behave identically.

---

## Tuning

Near the top of the `<script>` block in `index.html`:

| Constant | Effect |
|---|---|
| `GRAVITY` 1500 | Higher = fruit falls faster |
| `BASE_R` 0.100 | Hitbox radius as a fraction of min(width,height) |
| `FILL` 1.18 | Drawn size — sprite width is `2 x r x FILL`, so this is measured against the hitbox DIAMETER |
| `HIT` 1.0 | Collision radius as a fraction of `r` |
| `HAND_SMOOTH` 0.45 | Raise if the blade jitters, lower if it lags your finger |
| `FRUIT_POINTS` 2 | Points per fruit |
| `BOMB_PENALTY` 2 | Points lost per bomb |

Per-fruit size and juice colour live in `FRUITS`:

```js
{"name":"watermelon","juice":["#D8232B","#FF8A8F"],"scale":1.35}
```

`scale` 1.35 makes a watermelon big; blueberry is 0.60. Juice colours were
sampled from the centre of each fruit's own cut face.

Difficulty curves: `bombChance()`, `waveGap()`, `waveSize()`.
In `checkSlices(blade, n)`, `n` is how far the blade must move between
frames to count as a cut — raise it if fruit cuts itself, lower it if cuts
get missed.

---

## Sprite conventions

Halves must be exported on the **same canvas bounds as the whole fruit**.
If a tool trims each half to its own content, the two halves jump apart at
the cut. All 71 sprites here are square and pre-aligned.

Naming is `name.png`, `name-left.png`, `name-right.png`, plus `bomb.png`
and `bomb-blast.png`. To add a fruit, drop the three files in
`public/sprites/` and add an entry to the `FRUITS` array.

---

## Hand tracking

Uses the legacy `@mediapipe/hands` solution, vendored into
`public/mediapipe/` instead of loaded from a CDN, so it works offline.
`modelComplexity` is 0 (the lite model) — frame rate matters more than
millimetre accuracy here. If it fails to load, the game says so and touch
mode still works.

---

## Testing on a phone

Your phone must be on the same WiFi, and it needs **real HTTPS** — the
localhost exemption does not apply to a LAN address. So use the plain
server rather than `npm run dev`:

```bash
node serve.js
```

It prints an `https://192.168.x.x:8791/` address. The certificate is
self-signed, so you get one warning: tap Advanced, then Proceed.

**Never commit or deploy `certs/`.** It holds a TLS private key. It is in
`.gitignore` already; keep it that way.

---

## Deploying

`vercel.json` is set up for Vite (`npm run build` → `dist`). It forces
`application/wasm` on the MediaPipe binaries — a `.wasm` served as the
wrong MIME type refuses to instantiate and hand tracking dies silently.

```bash
npm install -g vercel
vercel          # preview
vercel --prod   # live
```

Hosted over HTTPS, phones work with no certificate warning at all.
A first-time visitor downloads roughly 14 MB, nearly all of it the hand
tracking model, cached afterwards.
