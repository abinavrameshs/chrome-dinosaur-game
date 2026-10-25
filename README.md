# test_rea — Dino Lab

A small browser game whose speed rule is adjustable, built after using
[REA (Reverse Engineer Anything)](https://github.com/morluto/rea) to find out
**why Chrome's offline dinosaur game gets faster**.

```
dino-lab/                  the game we built (plain HTML/CSS/JS, no build step)
docs/findings.md           what the analysis found, with line references
reference/chromium-dino/   Chromium's dino game source, for reading (BSD-licensed)
```

## Try it

```bash
cd dino-lab
python3 -m http.server 8000     # then open http://localhost:8000
```

Or just open `dino-lab/index.html` in a browser. **Space / ↑** jumps. Three
sliders set the start speed, acceleration per frame and max speed. One button
restores Chrome's defaults (6 / 0.001 / 13).

## The question and the answer

**Why does the game get faster?** Once per game update, while the player has not
crashed, Chromium runs (`offline.ts:889-891`):

```ts
if (this.currentSpeed < this.config.maxSpeed) {
  this.currentSpeed += this.config.acceleration;
}
```

| Mode   | Start | Acceleration | Max |
|--------|-------|--------------|-----|
| normal | 6     | 0.001        | 13  |
| slow   | 4.2   | 0.0005       | 9   |

At 60 FPS, normal mode reaches max speed after 7000 updates (about 117 s).
Speed also moves obstacles, grows the score, and widens the gaps between
obstacles (`obstacle.ts:204`). Details are in [docs/findings.md](docs/findings.md).

## How REA was used

REA is a reverse-engineering toolkit that gives an agent (or the terminal)
evidence-backed analysis tools. Here is exactly what was done, including what
did not work.

1. **Install.** `npm install --global rea-agents` (v6.7.0), then
   `rea setup --client claude_code` to register the MCP server and skill.
   `rea doctor` showed no native analysis engine is installed. That is fine,
   because static JavaScript/TypeScript analysis needs none.
2. **Target.** REA's web commands (`inspect-web-page`, `analyze-web-bundle`)
   only attach to **HTTP(S) pages**. `chrome://dino` is excluded
   (`unsupported_url`), so the live built-in game could not be inspected that way.
3. **Get the artifact.** The game is public in Chromium's source tree
   (`components/neterror/resources/dino_game/`). Those 19 TypeScript files were
   downloaded into their own folder.
4. **Analyze.** 
   ```bash
   rea analyze-javascript-application <folder> --json
   ```
   It parsed all 19 files and produced an Evidence record
   (`ev_b234ae2a043609ab462a3adb84171279353d51d54248d66d6f9348bf7fc65933`,
   subject digest `sha256:4964dc8b…6f3d60`). The raw output is about 12 MB, so it
   is not committed.
5. **Read the evidence.** The speed rule, its config table and the call
   chain were located by reading the exact source lines the analysis pointed to
   (`grep` for `acceleration`, `maxSpeed`, `currentSpeed`, then reading
   `offline.ts` and `obstacle.ts`). The line numbers in this repo refer to the
   copy in `reference/chromium-dino/`.
6. **Rebuild.** `dino-lab/game.js` is **original code** that reproduces the
   rule and its effects, with the three values exposed as sliders.

### What REA did and did not do

- REA parsed and inventoried the source and recorded Evidence. The specific
  conclusions (the rule, the numbers, the gap formula) come from reading the
  source lines, not from an automatic REA verdict.
- The analysis is of Chromium's **public source**, not of the compiled
  Chrome binary or a live running game.

## How `dino-lab` differs from Chromium's game

| Chromium | Dino Lab |
|---|---|
| Sprite sheet, sounds, night mode, pterodactyls, gamepad, mobile scaling | Rectangles on a canvas, cacti only |
| Acceleration added per update (frame-rate dependent) | Fixed 60 Hz timestep, so the ramp is frame-rate independent |
| Collision with per-sprite sub-boxes | One simple box check |

Mechanics taken from the analysis: the speed rule above, gaps that grow with
speed (`minGap = width * speed + base`), and distance that grows with speed.

## Testing done

- Loaded the page in headless Chromium and confirmed no console errors.
- With acceleration set to 0.005, the speed after 148 frames was 6.74
  (6 + 148 × 0.005), matching the rule.
- A cactus collision produced the "Game over" state.

Not done: no automated test suite, no mobile or touch testing, and no
comparison of Dino Lab against Chrome's difficulty curve beyond the speed rule.

## Credits and licenses

- `reference/chromium-dino/` is © The Chromium Authors, BSD-style license (each
  file keeps its header). Source:
  <https://chromium.googlesource.com/chromium/src/+/refs/heads/main/components/neterror/resources/dino_game/>
- `dino-lab/` is original code. Chromium's art and sounds are not used.
- REA: <https://github.com/morluto/rea> (MIT).
