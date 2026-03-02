# Border Check — Side Quest Week 6

## Group Members

- Rini Lu, r28lu, 21091404

## Description

A document-checking mini-game inspired by _Papers, Please_ (Pope, 2013). You play as a border inspector reviewing traveller documents. Each traveller presents their papers, and you must **approve** or **deny** entry based on one simple rule: **only citizens of Arstotzka may enter.**

The sketch demonstrates **sound** and **simple physics** — the two coding topics for Week 6:

- **Sound:** Synthesized audio effects (using p5.sound Oscillators) play for approve, deny, stamp impact, and document sliding.
- **Physics:** Stamp sprites are created as dynamic p5play physics bodies that fall with gravity and bounce on the desk surface (a static physics body). The collision between stamps and the desk triggers a percussive "thud" sound.
- **Bonus — Combined:** The stamp's physics collision with the desk directly triggers a sound effect, creating a reactive, multi-sensory experience where physics events drive audio feedback.

## Setup and Interaction Instructions

1. Open `index.html` in Google Chrome (or view via GitHub Pages).
2. Click anywhere to start.
3. Read the traveller's document — check their **NATION** field.
4. Press **A** to APPROVE or **D** to DENY.
5. Correct decisions earn a point. Wrong decisions lose a life (♥).
6. Process all 10 travellers before running out of lives.

## Iteration Notes

### Post-Playtest

1. N/A (Side Quest — individual weekly assignment)
2. N/A
3. N/A

### Post-Showcase

1. N/A
2. N/A

## Assets

All visual elements are generated procedurally in code — no external image or audio files are used. Sound effects are synthesized at runtime using p5.sound Oscillators (p5.js, n.d.).

## References

1. p5.js Foundation. (n.d.). _p5.js_. Retrieved February 26, 2026, from https://p5js.org/
2. Pockney, Q. (n.d.). _p5play_. Retrieved February 26, 2026, from https://p5play.org/
3. p5.js Foundation. (n.d.). _p5.sound library_. Retrieved February 26, 2026, from https://p5js.org/reference/p5.sound/
4. Shakiba, A. (n.d.). _Planck.js — 2D physics engine_. GitHub. Retrieved February 26, 2026, from https://github.com/shakiba/planck.js
5. Pope, L. (2013). _Papers, Please_ [Video game]. 3909 LLC. https://papersplea.se/
