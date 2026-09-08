# Paper Combat Game

A paper puppet fighting/platforming game — paper puppets (School vs. Office)
fight using everyday classroom and office supplies as weapons. 18 fighters
across a 3×3 archetype × tech matrix.

**Live prototype:** open `index.html` directly in a browser, or serve the
folder with any static file server. No build step required.

## Structure

```
index.html      Entry point — screens (title, select, battle, platform view)
app.css         All styles (dark theme, mobile-first, responsive breakpoints)
app.js          All app logic (screen navigation, physics, camera, controls)
data/
  fighters.json  Roster data (not yet wired into app.js — see note in file)
```

This follows the same pattern as the Pangea Grocery List app: one `app.js`,
`data/*.json` for content, no framework/build tooling. Straightforward to
open, edit, and deploy anywhere that serves static files.

## Features implemented

- **4 screens:** Title (with upward particle effect), Character Select
  (School/Office tabs, 3×3 roster grid, independent P1/CPU selection),
  Battle (2-fighter HUD + diamond controls), Platform View (solo physics
  sandbox for Player 1)
- **Controls:** 4-button diamond (Attack/Defend/Movement/Special) with
  directional submenus, touch + keyboard (Arrows + WASD), color-coded
  per action
- **Physics:** gravity, jump, double jump, dash, fold (paper-thin dodge) —
  archetype (Rush/Bruiser/Zoner) tunes speed/weight/jump height
- **Camera:** Platform View has a real world-space level (±1200px) with a
  player-centered scrolling camera and world-fixed landmark markers
- **Mobile-adaptive:** responsive layout for portrait/landscape and small
  phone screens; touch and keyboard controls both fully supported

## Known gaps / next steps

- Fighters are colored placeholder boxes — no rigged art yet (see the
  Adobe Animate rig setup template in project docs)
- `data/fighters.json` isn't wired in yet; roster data currently lives
  inline in `app.js` (`ROSTER_NAMES`, `ARCH_COLOR`)
- Battle screen doesn't have real 2-fighter physics/combat yet — only
  Platform View has the full physics engine
- No persistence (stats reset on reload) — a natural place to add
  localStorage first, matching the Grocery app's pattern, before any
  backend

## Publishing this to GitHub (via VS Code)

This assistant can't push to GitHub directly (no network/credential
access from this environment) — here's the exact sequence to run
yourself in VS Code's integrated terminal:

1. **Unzip this folder** somewhere on your machine and open it in VS Code
   (`File → Open Folder...`)

2. **Open the integrated terminal** (`` Ctrl+` `` / `` Cmd+` ``) and run:
   ```bash
   git init
   git add .
   git commit -m "Initial commit: Paper Combat Game prototype"
   ```

3. **Create the GitHub repo.** Either:
   - On github.com: click **New repository**, name it `paper-combat-game`,
     set it **Public**, do *not* initialize with a README (you already
     have one) — then copy the remote URL it gives you, or
   - Using the GitHub CLI (if installed): `gh repo create paper-combat-game --public --source=. --remote=origin`

4. **Connect and push** (skip this step if you used `gh repo create` above):
   ```bash
   git remote add origin https://github.com/<your-username>/paper-combat-game.git
   git branch -M main
   git push -u origin main
   ```

5. **Optional — free hosting via GitHub Pages** (makes it playable at a
   public URL): in the repo on GitHub, go to **Settings → Pages**, set
   **Source** to the `main` branch, root folder. Your game will be live at
   `https://<your-username>.github.io/paper-combat-game/` within a minute
   or two.

## License

No license file included yet — as a public repo, consider adding one
(MIT is a common permissive default) via GitHub's "Add file → Create new
file → LICENSE" template picker, or ask for one to be generated.
