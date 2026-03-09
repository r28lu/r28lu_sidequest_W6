/*
  Week 6 — Side Quest 6: Adding Sound Effects to the Fox Platformer
  Inspired by: Papers, Please / One Night Ultimate Werewolf
  
  Sound is used to reinforce player actions and game events —
  every action has a consequence you can hear (Papers, Please tension).

  Controls:
    A / D (or Left / Right Arrow)   Horizontal movement
    W (or Up Arrow)                 Jump
    Space Bar                       Attack
    R                               Restart (only when dead or won)
    M                               Mute / unmute music

  SOUND additions (SQ6 — Bonus: both sound + visual feedback):
    jump.wav          — plays when player jumps
    leafCollect.wav   — plays when a leaf is collected
    hitEnemy.wav      — plays when fox attacks a boar
    receiveDamage.wav — plays when fox takes damage
    music.wav         — looping background music (M to mute)
    Visual flash      — white screen flash on damage (multi-sensory)
*/

// ─── SOUND VARIABLES ────────────────────────────────────────────────────────
let sfxJump, sfxLeaf, sfxHit, sfxDamage, sfxMusic;
let musicMuted = false;

// ── SQ6 BONUS: damage flash ──────────────────────────────────────────────────
let damageFlashTimer = 0;
const DAMAGE_FLASH_FRAMES = 6;

// ─── PLAYER / SENSOR ────────────────────────────────────────────────────────
let player, sensor;
let playerImg;

let playerAnis = {
  idle:     { row: 0, frames: 4, frameDelay: 10 },
  run:      { row: 1, frames: 4, frameDelay: 3  },
  jump:     { row: 2, frames: 3, frameDelay: Infinity, frame: 0 },
  attack:   { row: 3, frames: 6, frameDelay: 2  },
  hurtPose: { row: 5, frames: 4, frameDelay: Infinity },
  death:    { row: 5, frames: 4, frameDelay: 16 },
};

let boar, boarImg, boarSpawns = [];

let boarAnis = {
  run:       { row: 1, frames: 4, frameDelay: 3 },
  throwPose: { row: 4, frames: 1, frameDelay: Infinity, frame: 0 },
  death:     { row: 5, frames: 4, frameDelay: 16 },
};

let attacking = false, attackFrameCounter = 0, attackHitThisSwing = false;
let invulnTimer = 0;
const INVULN_FRAMES = 45;
let knockTimer = 0;
const KNOCK_FRAMES = 30;
let won = false;

let ground, groundDeep, platformsL, platformsR, wallsL, wallsR;
let groundTileImg, groundTileDeepImg, platformLCImg, platformRCImg, wallLImg, wallRImg;
let bgLayers = [], bgForeImg, bgMidImg, bgFarImg;
let leaf, leafImg, leafSpawns = [];
let fire, fireImg;
let fontImg, hudGfx;
let lastScore = null, lastHealth = null, lastMaxHealth = null;
let score = 0, maxHealth = 3, health = maxHealth;
let dead = false, pendingDeath = false, deathStarted = false, deathFrameTimer = 0;

let level = [
  "                    g   g   b  x        ",
  "                b x         LggR        ",
  "      x   f     LggR                    ",
  "     LR   LgR          LR               ",
  "   fx  b        x   b                   ",
  "   LgggR   x   LR   LgR x   b  xf       ",
  "         LgR  b x       g   LggggR      ",
  " fx           LgR                    fx ",
  " LgR      b                         LggR",
  "         LgR        f x    LR  LgR  [dd]",
  "   x     [d]      x LggR   x    ff  [dd]",
  "LgggRffLggggggRfffLgggg]fffgfLgggggggggg",
  "dddddddddddddddddddddddddddddddddddddddd",
];

const TILE_W = 24, TILE_H = 24, FRAME_W = 32, FRAME_H = 32;
const LEVELW = TILE_W * level[0].length, LEVELH = TILE_H * level.length;
const VIEWTILE_W = 10, VIEWTILE_H = 8;
const VIEWW = TILE_W * VIEWTILE_W, VIEWH = TILE_H * VIEWTILE_H;
const WIN_SCORE = 15, PLAYER_START_Y = LEVELH - TILE_H * 4;
const PLAYER_KNOCKBACK_X = 2.0, PLAYER_KNOCKBACK_Y = 3.2, PLAYER_JUMP = 4.5;
const ATTACK_RANGE_X = 20, ATTACK_RANGE_Y = 16;
const BOAR_W = 18, BOAR_H = 12, BOAR_SPEED = 0.6, BOAR_HP = 3;
const BOAR_KNOCK_FRAMES = 7, BOAR_KNOCK_X = 1.2, BOAR_KNOCK_Y = 1.6, BOAR_FLASH_FRAMES = 5;
const BOAR_TURN_COOLDOWN = 12;
const PROBE_FORWARD = 10, PROBE_FRONT_Y = 10, PROBE_HEAD_Y = 0, PROBE_SIZE = 4;
const FONT_COLS = 19, CELL = 30, FONT_SCALE = 1 / 3;
const GLYPH_W = CELL * FONT_SCALE, GLYPH_H = CELL * FONT_SCALE;
const FONT_CHARS = " !\"#$%&'()*+,-./0123456789:;<=>?@ABCDEFGHIJKLMNOPQRSTUVWXYZ[\\]^_`abcdefghijklmnopqrstuvwxyz{|}~";
const GRAVITY = 10;

// ─── SOUND HELPERS ───────────────────────────────────────────────────────────
function playSfx(sfx) {
  if (!sfx) return;
  try { if (sfx.isPlaying()) sfx.stop(); sfx.play(); } catch(e) {}
}

function startMusic() {
  if (!sfxMusic || musicMuted) return;
  if (!sfxMusic.isPlaying()) { sfxMusic.setVolume(0.25); sfxMusic.loop(); }
}

// ─── TILE HELPERS ────────────────────────────────────────────────────────────
function tileAt(col, row) {
  if (row < 0 || row >= level.length || col < 0 || col >= level[0].length) return " ";
  return level[row][col];
}

// ─── PRELOAD ─────────────────────────────────────────────────────────────────
function preload() {
  playerImg         = loadImage("assets/foxSpriteSheet.png");
  boarImg           = loadImage("assets/boarSpriteSheet.png");
  leafImg           = loadImage("assets/leafSpriteSheet.png");
  fireImg           = loadImage("assets/fireSpriteSheet.png");
  bgFarImg          = loadImage("assets/background_layer_1.png");
  bgMidImg          = loadImage("assets/background_layer_2.png");
  bgForeImg         = loadImage("assets/background_layer_3.png");
  groundTileImg     = loadImage("assets/groundTile.png");
  groundTileDeepImg = loadImage("assets/groundTileDeep.png");
  platformLCImg     = loadImage("assets/platformLC.png");
  platformRCImg     = loadImage("assets/platformRC.png");
  wallLImg          = loadImage("assets/wallL.png");
  wallRImg          = loadImage("assets/wallR.png");
  fontImg           = loadImage("assets/bitmapFont.png");

  // SQ6: load sounds
  sfxJump   = loadSound("assets/sfx/jump.wav");
  sfxLeaf   = loadSound("assets/sfx/leafCollect.wav");
  sfxHit    = loadSound("assets/sfx/hitEnemy.wav");
  sfxDamage = loadSound("assets/sfx/receiveDamage.wav");
  sfxMusic  = loadSound("assets/sfx/music.wav");
}

// ─── SETUP ───────────────────────────────────────────────────────────────────
function setup() {
  new Canvas(VIEWW, VIEWH, "pixelated");
  noSmooth();
  applyIntegerScale();
  window.addEventListener("resize", applyIntegerScale);
  allSprites.pixelPerfect = true;
  world.autoStep = false;
  hudGfx = createGraphics(VIEWW, VIEWH);
  hudGfx.noSmooth(); hudGfx.pixelDensity(1);
  makeWorld();
  for (const s of leaf) s.removeColliders();
  leafSpawns = [];
  for (const s of leaf) { s.active = true; leafSpawns.push({ s, x: s.x, y: s.y }); }
  boarSpawns = [];
  for (const e of boar) boarSpawns.push({ x: e.x, y: e.y, dir: e.dir });
  if (sfxJump)   sfxJump.setVolume(0.6);
  if (sfxLeaf)   sfxLeaf.setVolume(0.7);
  if (sfxHit)    sfxHit.setVolume(0.7);
  if (sfxDamage) sfxDamage.setVolume(0.8);
}

// ─── DRAW ────────────────────────────────────────────────────────────────────
function draw() {
  startMusic();
  background(69, 61, 79);
  updateBoars();
  world.step();

  camera.width = VIEWW; camera.height = VIEWH;
  let targetX = constrain(player.x, VIEWW / 2, LEVELW - VIEWW / 2 - TILE_W / 2);
  let targetY = constrain(player.y, VIEWH / 2 - TILE_H * 2, LEVELH - VIEWH / 2 - TILE_H);
  camera.x = Math.round(lerp(camera.x || targetX, targetX, 0.1));
  camera.y = Math.round(lerp(camera.y || targetY, targetY, 0.1));

  const grounded = isPlayerGrounded();

  // ATTACK
  if (!dead && !won && knockTimer === 0 && !pendingDeath && grounded && !attacking && kb.presses("space")) {
    attacking = true; attackHitThisSwing = false; attackFrameCounter = 0;
    player.vel.x = 0; player.ani.frame = 0; player.ani = "attack"; player.ani.play();
  }

  // JUMP — SQ6: play jump sound
  if (!dead && !won && knockTimer === 0 && !pendingDeath && grounded && kb.presses("up")) {
    player.vel.y = -1 * PLAYER_JUMP;
    playSfx(sfxJump);
  }

  // MUTE TOGGLE — SQ6
  if (kb.presses("m")) {
    musicMuted = !musicMuted;
    if (musicMuted) { sfxMusic && sfxMusic.stop(); }
    else startMusic();
  }

  // PLAYER STATE
  if (!dead && knockTimer > 0)          { player.ani = "hurtPose"; player.ani.frame = 1; }
  else if (!dead && pendingDeath)       { player.ani = "hurtPose"; player.ani.frame = 1; }
  else if (!dead && attacking) {
    attackFrameCounter++;
    if (!attackHitThisSwing && attackFrameCounter >= 4 && attackFrameCounter <= 8) tryHitBoar();
    if (attackFrameCounter > 12) { attacking = false; attackFrameCounter = 0; attackHitThisSwing = false; }
  } else if (!dead && !grounded) { player.ani = "jump"; player.ani.frame = player.vel.y < 0 ? 0 : 1; }
  else if (!dead) { player.ani = kb.pressing("left") || kb.pressing("right") ? "run" : "idle"; }

  // MOVEMENT
  if (dead || won)          { player.vel.x = 0; }
  else if (knockTimer > 0)  {}
  else if (pendingDeath)    { player.vel.x = 0; }
  else if (!attacking) {
    player.vel.x = 0;
    if (kb.pressing("left"))  { player.vel.x = -1.5; player.mirror.x = true; }
    else if (kb.pressing("right")) { player.vel.x = 1.5; player.mirror.x = false; }
  }
  player.x = constrain(player.x, FRAME_W / 2, LEVELW - FRAME_W / 2);

  // PARALLAX
  camera.off();
  imageMode(CORNER); drawingContext.imageSmoothingEnabled = false;
  for (const layer of bgLayers) {
    const img = layer.img, w = img.width;
    let x = Math.round((-camera.x * layer.speed) % w);
    if (x > 0) x -= w;
    for (let tx = x; tx < VIEWW + w; tx += w) image(img, tx, 0);
  }
  camera.on();

  // FALL RESET
  if (!dead && player.y > LEVELH + TILE_H * 3) {
    player.x = FRAME_W; player.y = PLAYER_START_Y; player.vel.x = 0; player.vel.y = 0;
  }

  if (invulnTimer > 0) invulnTimer--;
  if (knockTimer  > 0) knockTimer--;
  if (damageFlashTimer > 0) damageFlashTimer--; // SQ6 bonus

  if (!dead && pendingDeath && knockTimer === 0 && grounded) { dead = true; pendingDeath = false; deathStarted = false; }

  if (dead && !deathStarted) {
    deathStarted = true; player.tint = "#ffffff";
    player.vel.x = 0; player.vel.y = 0;
    player.ani = "death"; player.ani.frame = 0; deathFrameTimer = 0;
  }
  if (dead) {
    const msPerFrame = (playerAnis.death.frameDelay * 1000) / 60;
    deathFrameTimer += deltaTime;
    player.ani.frame = Math.min(playerAnis.death.frames - 1, Math.floor(deathFrameTimer / msPerFrame));
  }

  // PIXEL SNAP
  const px = player.x, py = player.y, sx = sensor.x, sy = sensor.y;
  player.x = Math.round(player.x); player.y = Math.round(player.y);
  sensor.x = Math.round(sensor.x); sensor.y = Math.round(sensor.y);
  player.tint = (!dead && invulnTimer > 0) ? (Math.floor(invulnTimer / 4) % 2 === 0 ? "#ff5050" : "#ffffff") : "#ffffff";
  allSprites.draw();
  player.x = px; player.y = py; sensor.x = sx; sensor.y = sy;

  // HUD
  if (score !== lastScore || health !== lastHealth || maxHealth !== lastMaxHealth) {
    redrawHUD(); lastScore = score; lastHealth = health; lastMaxHealth = maxHealth;
  }
  camera.off(); imageMode(CORNER); drawingContext.imageSmoothingEnabled = false;
  image(hudGfx, 0, 0);

  // SQ6 BONUS: red screen flash on damage
  if (damageFlashTimer > 0) {
    const alpha = map(damageFlashTimer, 0, DAMAGE_FLASH_FRAMES, 0, 140);
    noStroke(); fill(255, 0, 0, alpha);
    rect(0, 0, VIEWW, VIEWH);
  }

  camera.on();

  if (dead) drawDeathOverlay();
  if (won)  drawWinOverlay();
  if ((dead || won) && kb.presses("r")) restartGame();
}

function applyIntegerScale() {
  const c = document.querySelector("canvas");
  const scale = Math.max(1, Math.floor(Math.min(window.innerWidth / VIEWW, window.innerHeight / VIEWH)));
  c.style.width = VIEWW * scale + "px"; c.style.height = VIEWH * scale + "px";
}

// ─── HUD ─────────────────────────────────────────────────────────────────────
function drawBitmapTextToGfx(g, str, x, y, scale = FONT_SCALE) {
  str = String(str);
  const dw = CELL * scale, dh = CELL * scale;
  for (let i = 0; i < str.length; i++) {
    const idx = FONT_CHARS.indexOf(str[i]);
    if (idx === -1) continue;
    g.image(fontImg, Math.round(x + i * dw), Math.round(y), dw, dh, (idx % FONT_COLS) * CELL, Math.floor(idx / FONT_COLS) * CELL, CELL, CELL);
  }
}

function drawOutlinedTextToGfx(g, str, x, y, fillHex) {
  g.tint("#000000");
  drawBitmapTextToGfx(g, str, x - 1, y); drawBitmapTextToGfx(g, str, x + 1, y);
  drawBitmapTextToGfx(g, str, x, y - 1); drawBitmapTextToGfx(g, str, x, y + 1);
  g.tint(fillHex); drawBitmapTextToGfx(g, str, x, y); g.noTint();
}

function redrawHUD() {
  hudGfx.clear(); hudGfx.drawingContext.imageSmoothingEnabled = false; hudGfx.imageMode(CORNER);
  drawOutlinedTextToGfx(hudGfx, `RESCUED ${score}/15`, 6, 6, "#ffdc00");
  for (let i = 0; i < maxHealth; i++) {
    drawOutlinedTextToGfx(hudGfx, "~", 200 + i * (GLYPH_W + 2), 6, i < health ? "#ff5050" : "#783030");
  }
  // SQ6: mute indicator
  if (musicMuted) drawOutlinedTextToGfx(hudGfx, "MUTED", 6, VIEWH - 14, "#aaaaaa");
}

function isPlayerGrounded() {
  return sensor.overlapping(ground) || sensor.overlapping(groundDeep) || sensor.overlapping(platformsL) || sensor.overlapping(platformsR);
}

// ─── EVENTS WITH SOUND ───────────────────────────────────────────────────────
function rescueLeaf(player, leaf) {
  if (!leaf.active) return;
  leaf.active = false; leaf.visible = false; leaf.removeColliders(); score++;
  playSfx(sfxLeaf); // SQ6
  if (score >= WIN_SCORE) { won = true; player.vel.x = 0; player.vel.y = 0; }
}

function takeDamageFromFire(player, fire) {
  if (invulnTimer > 0 || dead) return;
  health = max(0, health - 1); if (health <= 0) pendingDeath = true;
  invulnTimer = INVULN_FRAMES; knockTimer = KNOCK_FRAMES;
  const dir = player.x < fire.x ? -1 : 1;
  player.vel.x = dir * PLAYER_KNOCKBACK_X; player.vel.y = -PLAYER_KNOCKBACK_Y;
  attacking = false; attackFrameCounter = 0;
  playSfx(sfxDamage);            // SQ6
  damageFlashTimer = DAMAGE_FLASH_FRAMES; // SQ6 bonus flash
}

function playerHitByBoar(player, e) {
  if (e.dying || e.dead || invulnTimer > 0 || dead) return;
  health = max(0, health - 1); if (health <= 0) pendingDeath = true;
  invulnTimer = INVULN_FRAMES; knockTimer = KNOCK_FRAMES;
  const dir = player.x < e.x ? -1 : 1;
  player.vel.x = dir * PLAYER_KNOCKBACK_X; player.vel.y = -PLAYER_KNOCKBACK_Y;
  attacking = false; attackFrameCounter = 0;
  playSfx(sfxDamage);            // SQ6
  damageFlashTimer = DAMAGE_FLASH_FRAMES; // SQ6 bonus flash
}

function tryHitBoar() {
  if (!sensor.overlapping(ground) && !sensor.overlapping(platformsL) && !sensor.overlapping(platformsR)) return;
  const facingDir = player.mirror.x ? -1 : 1;
  const playerFeetY = player.y + player.h / 2;
  for (const e of boar) {
    if (e.dead || e.dying) continue;
    const dx = e.x - player.x;
    if (Math.sign(dx) !== facingDir || abs(dx) > ATTACK_RANGE_X + e.w / 2) continue;
    if (abs((e.y + e.h / 2) - playerFeetY) > ATTACK_RANGE_Y + 10) continue;
    damageBoar(e, facingDir);
    playSfx(sfxHit); // SQ6
    attackHitThisSwing = true; return;
  }
}

// ─── BOAR HELPERS ────────────────────────────────────────────────────────────
function turnBoar(e, newDir) {
  if (e.turnTimer > 0) return;
  e.dir = newDir; e.turnTimer = BOAR_TURN_COOLDOWN; e.x += e.dir * 6; e.vel.x = 0;
}

function groundAheadForDir(e, dir) {
  const old = e.dir; e.dir = dir; updateBoarProbes(e);
  const ok = e.frontProbe.overlapping(ground) || e.frontProbe.overlapping(groundDeep) || e.frontProbe.overlapping(platformsL) || e.frontProbe.overlapping(platformsR);
  e.dir = old; return ok;
}

function fixSpawnEdgeCase(e) {
  const leftOk = groundAheadForDir(e, -1), rightOk = groundAheadForDir(e, 1);
  if (leftOk && !rightOk) e.dir = -1; else if (rightOk && !leftOk) e.dir = 1;
  updateBoarProbes(e); e.vel.x = 0; e.turnTimer = 0; e.wasDanger = false;
}

function hookBoarSolids() {
  boar.collides(ground); boar.collides(groundDeep); boar.collides(platformsL);
  boar.collides(platformsR); boar.collides(wallsL); boar.collides(wallsR);
}

function damageBoar(e, facingDir) {
  if (e.dead || e.dying) return;
  e.hp = max(0, e.hp - 1); e.flashTimer = BOAR_FLASH_FRAMES;
  if (e.hp <= 0) { e.dying = true; e.vel.x = 0; e.collider = "none"; e.removeColliders(); e.ani = "throwPose"; e.ani.frame = 0; return; }
  e.knockTimer = BOAR_KNOCK_FRAMES; e.vel.x = facingDir * BOAR_KNOCK_X; e.vel.y = -BOAR_KNOCK_Y;
  e.ani = "throwPose"; e.ani.frame = 0;
}

function boarDiesInFire(e, f) { if (e.dead || e.dying) return; e.hp = 0; e.dying = true; e.knockTimer = 0; e.vel.x = 0; }

// ─── OVERLAYS ────────────────────────────────────────────────────────────────
function drawWinOverlay() {
  camera.off(); drawingContext.imageSmoothingEnabled = false;
  push(); noStroke(); fill(0, 120); rect(0, 0, VIEWW, VIEWH); pop();
  const msg1 = "YOU WIN!", msg2 = "Press R to restart";
  drawOutlinedTextToGfx(window, msg1, Math.round((VIEWW - msg1.length * GLYPH_W) / 2), Math.round(VIEWH / 2 - 18), "#00e5ff");
  drawOutlinedTextToGfx(window, msg2, Math.round((VIEWW - msg2.length * GLYPH_W) / 2), Math.round(VIEWH / 2 + 2), "#ffffff");
  camera.on();
}

function drawDeathOverlay() {
  camera.off(); drawingContext.imageSmoothingEnabled = false;
  push(); noStroke(); fill(0, 160); rect(0, 0, VIEWW, VIEWH); pop();
  const msg1 = "YOU DIED", msg2 = "Press R to restart";
  drawOutlinedTextToGfx(window, msg1, Math.round((VIEWW - msg1.length * GLYPH_W) / 2), Math.round(VIEWH / 2 - 18), "#ffffff");
  drawOutlinedTextToGfx(window, msg2, Math.round((VIEWW - msg2.length * GLYPH_W) / 2), Math.round(VIEWH / 2 + 2), "#ffffff");
  camera.on();
}

// ─── BOAR PROBES ─────────────────────────────────────────────────────────────
function placeProbe(probe, x, y) { probe.x = x; probe.y = y; }

function attachBoarProbes(e) {
  const mk = (color) => { const p = new Sprite(-9999, -9999, PROBE_SIZE, PROBE_SIZE); p.color = color; p.stroke = "black"; p.collider = "none"; p.sensor = true; p.visible = false; p.layer = 999; return p; };
  e.footProbe = mk("magenta"); e.frontProbe = mk("cyan"); e.groundProbe = mk("yellow");
}

function updateBoarProbes(e) {
  const fx = e.x + e.dir * PROBE_FORWARD;
  placeProbe(e.frontProbe, fx, e.y + PROBE_FRONT_Y);
  placeProbe(e.footProbe,  fx, e.y - PROBE_HEAD_Y);
}

function updateGroundProbe(e) { if (!e.groundProbe) return; placeProbe(e.groundProbe, e.x, e.y + e.h / 2 + 4); }
function frontProbeHasGroundAhead(e) { const p = e.frontProbe; return p.overlapping(ground) || p.overlapping(groundDeep) || p.overlapping(platformsL) || p.overlapping(platformsR); }
function frontProbeHitsWall(e)       { const p = e.frontProbe; return p.overlapping(wallsL) || p.overlapping(wallsR); }
function shouldTurnNow(e, danger)    { const r = danger && !e.wasDanger; e.wasDanger = danger; return r; }
function boarGrounded(e)             { const p = e.groundProbe; return p.overlapping(ground) || p.overlapping(groundDeep) || p.overlapping(platformsL) || p.overlapping(platformsR); }

// ─── BOAR AI ─────────────────────────────────────────────────────────────────
function updateBoars() {
  if (won) { for (const e of boar) e.vel.x = 0; return; }
  for (const e of boar) {
    updateBoarProbes(e); updateGroundProbe(e);
    if (e.spawnFreeze > 0) { e.spawnFreeze--; e.vel.x = 0; e.ani = "run"; continue; }
    if (e.flashTimer > 0) e.flashTimer--; if (e.knockTimer > 0) e.knockTimer--; if (e.turnTimer > 0) e.turnTimer--;
    e.tint = e.flashTimer > 0 ? "#ff5050" : "#ffffff";
    const grounded = boarGrounded(e);
    if (!e.dead && e.dying && grounded) { e.dead = true; e.deathStarted = false; }
    if (e.dying && !e.dead) { e.vel.x = 0; e.ani = "throwPose"; e.ani.frame = 0; continue; }
    if (e.dead && !e.deathStarted) {
      e.deathStarted = true; e.holdX = e.x; e.holdY = e.y; e.vel.x = 0; e.vel.y = 0;
      e.collider = "none"; e.removeColliders(); e.x = e.holdX; e.y = e.holdY;
      e.ani = "death"; e.ani.frame = 0; e.deathFrameTimer = 0; e.vanishTimer = 24; e.visible = true;
    }
    if (e.dead) {
      e.x = e.holdX; e.y = e.holdY;
      const msPerFrame = (boarAnis.death.frameDelay * 1000) / 60;
      e.deathFrameTimer += deltaTime;
      const f = Math.floor(e.deathFrameTimer / msPerFrame);
      e.ani.frame = Math.min(boarAnis.death.frames - 1, f);
      if (f >= boarAnis.death.frames - 1) {
        if (e.vanishTimer > 0) { e.visible = Math.floor(e.vanishTimer / 3) % 2 === 0; e.vanishTimer--; }
        else { e.footProbe?.remove(); e.frontProbe?.remove(); e.groundProbe?.remove(); e.remove(); }
      }
      continue;
    }
    if (e.knockTimer > 0) { e.ani = "throwPose"; e.ani.frame = 0; continue; }
    if (!grounded)         { e.ani = "throwPose"; e.ani.frame = 0; continue; }
    if (e.dir !== 1 && e.dir !== -1) e.dir = random([-1, 1]);
    if (e.x < e.w / 2)          turnBoar(e,  1);
    if (e.x > LEVELW - e.w / 2) turnBoar(e, -1);
    const danger = !frontProbeHasGroundAhead(e) || e.frontProbe.overlapping(leaf) || e.frontProbe.overlapping(fire) || frontProbeHitsWall(e) || e.footProbe.overlapping(fire);
    if (e.turnTimer === 0 && shouldTurnNow(e, danger)) { turnBoar(e, -e.dir); updateBoarProbes(e); continue; }
    e.vel.x = e.dir * BOAR_SPEED; e.mirror.x = e.dir === -1; e.ani = "run";
  }
}

// ─── RESTART ─────────────────────────────────────────────────────────────────
function restartGame() {
  won = false; score = 0; health = maxHealth; invulnTimer = 0; knockTimer = 0;
  dead = false; pendingDeath = false; deathStarted = false; deathFrameTimer = 0;
  attacking = false; attackFrameCounter = 0; damageFlashTimer = 0;
  player.x = FRAME_W; player.y = PLAYER_START_Y; player.vel.x = 0; player.vel.y = 0;
  sensor.x = player.x; sensor.y = player.y + player.h / 2; sensor.vel.x = 0; sensor.vel.y = 0;
  player.ani = "idle"; player.tint = "#ffffff"; camera.x = undefined; camera.y = undefined;
  for (const item of leafSpawns) { item.s.x = item.x; item.s.y = item.y; item.s.active = true; item.s.visible = true; item.s.removeColliders(); }
  for (const e of boar) { e.footProbe?.remove(); e.frontProbe?.remove(); e.groundProbe?.remove(); e.remove(); }
  boar = new Group(); boar.spriteSheet = boarImg; boar.anis.w = FRAME_W; boar.anis.h = FRAME_H; boar.anis.offset.y = -8; boar.addAnis(boarAnis); boar.overlaps(fire, boarDiesInFire);
  for (const s of boarSpawns) {
    const e = new Sprite(s.x, s.y, BOAR_W, BOAR_H);
    e.spriteSheet = boarImg; e.rotationLock = true; e.anis.w = FRAME_W; e.anis.h = FRAME_H; e.anis.offset.y = -8; e.addAnis(boarAnis);
    e.physics = "dynamic"; e.w = BOAR_W; e.h = BOAR_H; e.friction = 0; e.bounciness = 0; e.hp = BOAR_HP;
    attachBoarProbes(e); e.dir = random([-1, 1]); boar.add(e); fixSpawnEdgeCase(e);
    e.spawnFreeze = 1; updateBoarProbes(e); updateGroundProbe(e); e.vel.x = 0;
    e.wasDanger = false; e.flashTimer = 0; e.knockTimer = 0; e.turnTimer = 0;
    e.dead = false; e.dying = false; e.deathStarted = false; e.deathFrameTimer = 0; e.vanishTimer = 0; e.holdX = e.x; e.holdY = e.y; e.mirror.x = e.dir === -1; e.ani = "run";
  }
  hookBoarSolids(); player.overlaps(boar, playerHitByBoar); lastScore = lastHealth = lastMaxHealth = null;
  if (!musicMuted) startMusic();
}

// ─── MAKE WORLD ──────────────────────────────────────────────────────────────
function makeWorld() {
  world.gravity.y = GRAVITY;
  boar = new Group(); boar.spriteSheet = boarImg; boar.anis.w = FRAME_W; boar.anis.h = FRAME_H; boar.anis.offset.y = -8; boar.addAnis(boarAnis); boar.physics = "dynamic"; boar.tile = "b";
  leaf = new Group(); leaf.physics = "static"; leaf.spriteSheet = leafImg; leaf.addAnis({ idle: { w: 32, h: 32, row: 0, frames: 5 } }); leaf.w = 10; leaf.h = 6; leaf.anis.offset.x = 2; leaf.anis.offset.y = -4; leaf.tile = "x";
  fire = new Group(); fire.physics = "static"; fire.spriteSheet = fireImg; fire.addAnis({ burn: { w: 32, h: 32, row: 0, frames: 16 } }); fire.w = 18; fire.h = 16; fire.tile = "f";
  boar.overlaps(fire, boarDiesInFire);
  ground = new Group(); ground.physics = "static"; ground.img = groundTileImg; ground.tile = "g";
  groundDeep = new Group(); groundDeep.physics = "static"; groundDeep.img = groundTileDeepImg; groundDeep.tile = "d";
  platformsL = new Group(); platformsL.physics = "static"; platformsL.img = platformLCImg; platformsL.tile = "L";
  platformsR = new Group(); platformsR.physics = "static"; platformsR.img = platformRCImg; platformsR.tile = "R";
  wallsL = new Group(); wallsL.physics = "static"; wallsL.img = wallLImg; wallsL.tile = "[";
  wallsR = new Group(); wallsR.physics = "static"; wallsR.img = wallRImg; wallsR.tile = "]";
  new Tiles(level, 0, 0, TILE_W, TILE_H);
  player = new Sprite(FRAME_W, PLAYER_START_Y, FRAME_W, FRAME_H);
  player.spriteSheet = playerImg; player.rotationLock = true;
  player.anis.w = FRAME_W; player.anis.h = FRAME_H; player.anis.offset.y = -8; player.addAnis(playerAnis);
  player.ani = "idle"; player.w = 18; player.h = 12; player.friction = 0; player.bounciness = 0;
  player.overlaps(fire, takeDamageFromFire); player.overlaps(leaf, rescueLeaf); player.collides(boar, playerHitByBoar);
  sensor = new Sprite(); sensor.x = player.x; sensor.y = player.y + player.h / 2; sensor.w = player.w; sensor.h = 2; sensor.mass = 0.01; sensor.removeColliders(); sensor.visible = false;
  const sensorJoint = new GlueJoint(player, sensor); sensorJoint.visible = false;
  for (const s of fire) { s.collider = "static"; s.sensor = true; }
  for (const e of boar) {
    e.physics = "dynamic"; e.rotationLock = true; e.w = BOAR_W; e.h = BOAR_H; e.anis.offset.y = -8; e.friction = 0; e.bounciness = 0; e.hp = BOAR_HP;
    attachBoarProbes(e); e.dir = random([-1, 1]); fixSpawnEdgeCase(e);
    e.wasDanger = false; e.flashTimer = 0; e.knockTimer = 0; e.turnTimer = 0;
    e.dead = false; e.dying = false; e.deathStarted = false; e.deathFrameTimer = 0; e.vanishTimer = 0; e.holdX = e.x; e.holdY = e.y; e.mirror.x = e.dir === -1; e.ani = "run";
  }
  hookBoarSolids();
  bgLayers = [{ img: bgFarImg, speed: 0.2 }, { img: bgMidImg, speed: 0.4 }, { img: bgForeImg, speed: 0.6 }];
}
