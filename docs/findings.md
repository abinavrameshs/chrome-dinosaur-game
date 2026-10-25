# Why Chrome's offline dino gets faster

Source inspected: Chromium `components/neterror/resources/dino_game/` (BSD-licensed),
copied to `reference/chromium-dino/`. REA `analyze-javascript-application` evidence id:
`ev_b234ae2a043609ab462a3adb84171279353d51d54248d66d6f9348bf7fc65933`.

## The speed rule — `offline.ts:889-891`
```ts
if (this.currentSpeed < this.config.maxSpeed) {
  this.currentSpeed += this.config.acceleration;
}
```
Runs once per game update while the player has not collided. Config (`offline.ts:61-69`):

| mode   | start | acceleration | max |
|--------|-------|--------------|-----|
| normal | 6     | 0.001        | 13  |
| slow   | 4.2   | 0.0005       | 9   |

At 60 FPS the normal mode needs (13-6)/0.001 = 7000 updates (~117 s) to hit max.

## What speed affects
- Obstacles move `floor(speed * FPS / 1000 * deltaTime)` px per update (`obstacle.ts:177`).
- Distance score grows by `speed * deltaTime / msPerFrame` (`offline.ts:887`).
- Gaps between obstacles widen: `minGap = width * speed + typeMinGap * gapCoefficient` (`obstacle.ts:204`),
  which keeps jumps survivable as the game speeds up.
- Caveat: Chromium adds acceleration per update, not scaled by `deltaTime`, so acceleration is frame-rate dependent.
  `dino-lab` fixes this with a 60 Hz fixed timestep.
