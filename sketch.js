/*
  GBDA 302 - Side Quest Week 6
  "Border Check" — Inspired by Papers, Please

  A document-checking game where travellers present papers at your desk.
  You must APPROVE or DENY each traveller based on simple rules.
  
  PHYSICS: Stamp sprites drop with gravity and bounce on the desk when
           you make a decision. Documents slide in with physics-based motion.
  SOUND:   Synthesized sound effects play on approve, deny, stamp hit,
           and document arrival — combining physics + sound for a 
           reactive, multi-sensory experience (BONUS).

  Controls:
    A key — APPROVE the current traveller
    D key — DENY the current traveller

  Rule: Only travellers from "Arstotzka" are allowed in.
        Deny everyone else.

  References:
    - p5.js (https://p5js.org/) [1]
    - p5play v3 (https://p5play.org/) [2]
    - p5.sound (https://p5js.org/reference/p5.sound/) [3]
    - Planck.js physics (https://github.com/shakiba/planck.js) [4]
    - Papers, Please by Lucas Pope (https://papersplea.se/) — game inspiration [5]
*/

// ============================================================
// GAME CONSTANTS
// ============================================================
const VIEWW = 500;
const VIEWH = 400;
const GRAVITY = 10;

// Countries for document generation
// Reference: Inspired by the fictional nations in Papers, Please [5]
const COUNTRIES = [
  "Arstotzka",  // the only valid country
  "Kolechia",
  "Antegria",
  "Republia",
  "Obristan",
  "Impor"
];

// ============================================================
// GAME STATE
// ============================================================
let gameState = "title"; // "title", "playing", "gameover"
let score = 0;
let lives = 3;
let travellersProcessed = 0;
let maxTravellers = 10;

// current traveller
let currentTraveller = null;
let waitingForInput = false;

// stamp physics sprites
let stamps;
let deskGroup;

// feedback
let feedbackText = "";
let feedbackColor;
let feedbackTimer = 0;

// document slide-in animation
let docX = -300;
let docTargetX = 100;
let docSliding = false;

// sound synthesis objects
let approveOsc, denyOsc, stampOsc, slideOsc;
let approveEnv, denyEnv, stampEnv, slideEnv;

// ============================================================
// SOUND SETUP — synthesized using p5.sound Oscillators [3]
// ============================================================
function setupSounds() {
  // APPROVE sound — pleasant rising tone
  approveOsc = new p5.Oscillator("sine");
  approveOsc.amp(0);
  approveOsc.start();
  approveEnv = new p5.Envelope();
  approveEnv.setADSR(0.01, 0.1, 0.2, 0.3);
  approveEnv.setRange(0.3, 0);

  // DENY sound — harsh low buzz
  denyOsc = new p5.Oscillator("square");
  denyOsc.amp(0);
  denyOsc.start();
  denyEnv = new p5.Envelope();
  denyEnv.setADSR(0.01, 0.05, 0.15, 0.2);
  denyEnv.setRange(0.2, 0);

  // STAMP sound — short percussive thud
  stampOsc = new p5.Oscillator("triangle");
  stampOsc.amp(0);
  stampOsc.start();
  stampEnv = new p5.Envelope();
  stampEnv.setADSR(0.005, 0.05, 0.0, 0.1);
  stampEnv.setRange(0.4, 0);

  // SLIDE sound — paper sliding
  slideOsc = new p5.Oscillator("sawtooth");
  slideOsc.amp(0);
  slideOsc.start();
  slideEnv = new p5.Envelope();
  slideEnv.setADSR(0.05, 0.2, 0.05, 0.1);
  slideEnv.setRange(0.08, 0);
}

function playApproveSound() {
  approveOsc.freq(523); // C5
  approveEnv.play(approveOsc);
  // second tone after short delay for a "ding-ding" feel
  setTimeout(() => {
    approveOsc.freq(659); // E5
    approveEnv.play(approveOsc);
  }, 120);
}

function playDenySound() {
  denyOsc.freq(150);
  denyEnv.play(denyOsc);
  setTimeout(() => {
    denyOsc.freq(120);
    denyEnv.play(denyOsc);
  }, 100);
}

function playStampSound() {
  stampOsc.freq(80);
  stampEnv.play(stampOsc);
}

function playSlideSound() {
  slideOsc.freq(200);
  slideEnv.play(slideOsc);
}

// ============================================================
// TRAVELLER GENERATION
// ============================================================
function generateTraveller() {
  let country = random(COUNTRIES);
  // Make roughly 50% of travellers from Arstotzka so the game is fair
  if (random() < 0.5) {
    country = "Arstotzka";
  }
  
  let names = [
    "Jorji Costava", "Sergiu Volkov", "Elisa Katsarov",
    "Dari Ludum", "Mikhail Saratov", "Anya Petrov",
    "Calensk Fier", "Shae Piersovska", "Vince Lansen", "Nina Orlov"
  ];

  return {
    name: random(names),
    country: country,
    isValid: country === "Arstotzka"
  };
}

// ============================================================
// SETUP — canvas, physics world, sound [1][2][3][4]
// ============================================================
function setup() {
  new Canvas(VIEWW, VIEWH);
  world.gravity.y = GRAVITY;

  // desk surface for stamps to land on — static physics body [2][4]
  deskGroup = new Group();
  deskGroup.physics = "static";

  let desk = new Sprite(VIEWW / 2, VIEWH - 30, VIEWW, 20);
  desk.physics = "static";
  desk.color = color(60, 40, 30);
  desk.stroke = color(80, 60, 40);
  deskGroup.add(desk);

  // stamp group — these will be dynamic physics sprites [2][4]
  stamps = new Group();

  setupSounds();
}

// ============================================================
// DRAW LOOP
// ============================================================
function draw() {
  background(30, 30, 50);

  if (gameState === "title") {
    drawTitle();
  } else if (gameState === "playing") {
    drawGame();
  } else if (gameState === "gameover") {
    drawGameOver();
  }
}

// ============================================================
// TITLE SCREEN
// ============================================================
function drawTitle() {
  // dark office background
  fill(40, 40, 60);
  noStroke();
  rect(0, 0, VIEWW, VIEWH);

  // title
  fill(200, 180, 140);
  textAlign(CENTER, CENTER);
  textSize(32);
  textStyle(BOLD);
  text("BORDER CHECK", VIEWW / 2, VIEWH / 3 - 20);

  // subtitle
  textSize(14);
  textStyle(NORMAL);
  fill(160, 150, 130);
  text("Inspired by Papers, Please", VIEWW / 2, VIEWH / 3 + 20);

  // rule
  textSize(16);
  fill(220, 200, 160);
  text("RULE: Only citizens of ARSTOTZKA may enter.", VIEWW / 2, VIEWH / 2 + 10);

  // controls
  textSize(14);
  fill(140, 200, 140);
  text("Press A to APPROVE  |  Press D to DENY", VIEWW / 2, VIEWH / 2 + 50);

  // start prompt
  if (frameCount % 60 < 40) {
    fill(255);
    textSize(18);
    text("Click anywhere to begin", VIEWW / 2, VIEWH * 0.75);
  }
}

// ============================================================
// MAIN GAME DRAWING
// ============================================================
function drawGame() {
  // desk background
  drawDesk();

  // slide document in
  if (docSliding) {
    docX = lerp(docX, docTargetX, 0.08);
    if (abs(docX - docTargetX) < 1) {
      docX = docTargetX;
      docSliding = false;
      waitingForInput = true;
    }
  }

  // draw document if we have a traveller
  if (currentTraveller) {
    drawDocument(docX, 80);
  }

  // draw HUD
  drawHUD();

  // draw feedback text
  if (feedbackTimer > 0) {
    feedbackTimer--;
    let alpha = map(feedbackTimer, 0, 60, 0, 255);
    fill(red(feedbackColor), green(feedbackColor), blue(feedbackColor), alpha);
    textAlign(CENTER, CENTER);
    textSize(24);
    textStyle(BOLD);
    text(feedbackText, VIEWW / 2, VIEWH / 2 + 40);
    textStyle(NORMAL);
  }

  // draw controls hint at bottom
  fill(180, 180, 180, 150);
  textAlign(CENTER, BOTTOM);
  textSize(12);
  text("[A] Approve    [D] Deny", VIEWW / 2, VIEWH - 45);

  // check if game is over
  if (travellersProcessed >= maxTravellers || lives <= 0) {
    gameState = "gameover";
  }

  // if no current traveller and game still going, spawn next
  if (!currentTraveller && gameState === "playing") {
    spawnNextTraveller();
  }
}

// ============================================================
// DESK DRAWING
// ============================================================
function drawDesk() {
  // wall
  fill(50, 45, 65);
  noStroke();
  rect(0, 0, VIEWW, VIEWH - 80);

  // desk surface
  fill(90, 65, 45);
  rect(0, VIEWH - 80, VIEWW, 80);

  // desk edge highlight
  fill(110, 80, 55);
  rect(0, VIEWH - 80, VIEWW, 4);

  // window on wall
  fill(70, 80, 110);
  stroke(80, 70, 60);
  strokeWeight(3);
  rect(VIEWW - 120, 30, 80, 60, 3);
  noStroke();

  // window bars
  stroke(80, 70, 60);
  strokeWeight(2);
  line(VIEWW - 80, 30, VIEWW - 80, 90);
  line(VIEWW - 120, 60, VIEWW - 40, 60);
  noStroke();
}

// ============================================================
// DOCUMENT DRAWING — represents traveller's papers
// ============================================================
function drawDocument(x, y) {
  // paper shadow
  fill(20, 20, 30, 100);
  noStroke();
  rect(x + 4, y + 4, 280, 200, 3);

  // paper
  fill(235, 225, 200);
  stroke(180, 170, 150);
  strokeWeight(1);
  rect(x, y, 280, 200, 3);
  noStroke();

  // header
  fill(80, 60, 50);
  textAlign(LEFT, TOP);
  textSize(16);
  textStyle(BOLD);
  text("TRAVEL DOCUMENT", x + 20, y + 15);

  // divider line
  stroke(180, 170, 150);
  strokeWeight(1);
  line(x + 20, y + 38, x + 260, y + 38);
  noStroke();

  // document details
  textStyle(NORMAL);
  textSize(13);

  fill(120, 100, 80);
  text("NAME:", x + 20, y + 50);
  text("NATION:", x + 20, y + 80);
  text("PURPOSE:", x + 20, y + 110);

  fill(50, 40, 30);
  textSize(14);
  text(currentTraveller.name, x + 90, y + 50);
  
  // highlight country name — red if not Arstotzka, green if valid
  if (currentTraveller.isValid) {
    fill(40, 100, 40);
  } else {
    fill(50, 40, 30);
  }
  text(currentTraveller.country, x + 100, y + 80);

  fill(50, 40, 30);
  text("Entry", x + 110, y + 110);

  // small stamp area indicator
  fill(200, 190, 170);
  stroke(180, 170, 150);
  rect(x + 160, y + 140, 100, 45, 2);
  noStroke();
  fill(170, 160, 140);
  textSize(9);
  textAlign(CENTER, CENTER);
  text("STAMP AREA", x + 210, y + 162);
  textAlign(LEFT, TOP);
}

// ============================================================
// HUD — score, lives, progress
// ============================================================
function drawHUD() {
  // top bar
  fill(20, 20, 35, 200);
  noStroke();
  rect(0, 0, VIEWW, 30);

  fill(220, 200, 160);
  textAlign(LEFT, CENTER);
  textSize(13);
  text("Score: " + score, 10, 15);

  // lives as hearts
  textAlign(CENTER, CENTER);
  for (let i = 0; i < 3; i++) {
    if (i < lives) {
      fill(220, 60, 60);
    } else {
      fill(80, 40, 40);
    }
    textSize(16);
    text("♥", VIEWW / 2 - 20 + i * 20, 15);
  }

  // progress
  fill(220, 200, 160);
  textAlign(RIGHT, CENTER);
  textSize(13);
  text(travellersProcessed + "/" + maxTravellers, VIEWW - 10, 15);
}

// ============================================================
// GAME OVER SCREEN
// ============================================================
function drawGameOver() {
  fill(20, 20, 35);
  noStroke();
  rect(0, 0, VIEWW, VIEWH);

  textAlign(CENTER, CENTER);

  if (lives <= 0) {
    fill(200, 60, 60);
    textSize(28);
    textStyle(BOLD);
    text("TERMINATED", VIEWW / 2, VIEWH / 3);
    textStyle(NORMAL);
    fill(180, 160, 140);
    textSize(14);
    text("Too many mistakes. You have been relieved.", VIEWW / 2, VIEWH / 3 + 35);
  } else {
    fill(140, 200, 140);
    textSize(28);
    textStyle(BOLD);
    text("SHIFT COMPLETE", VIEWW / 2, VIEWH / 3);
    textStyle(NORMAL);
    fill(180, 160, 140);
    textSize(14);
    text("Glory to Arstotzka.", VIEWW / 2, VIEWH / 3 + 35);
  }

  fill(220, 200, 160);
  textSize(20);
  text("Final Score: " + score + " / " + maxTravellers, VIEWW / 2, VIEWH / 2 + 20);

  if (frameCount % 60 < 40) {
    fill(255);
    textSize(16);
    text("Click to play again", VIEWW / 2, VIEWH * 0.72);
  }
}

// ============================================================
// SPAWN NEXT TRAVELLER — slide document in with sound
// ============================================================
function spawnNextTraveller() {
  currentTraveller = generateTraveller();
  docX = -300;
  docSliding = true;
  waitingForInput = false;
  playSlideSound(); // SOUND: paper sliding in [3]
}

// ============================================================
// PROCESS DECISION — physics stamp drops + sound feedback [2][3][4]
// ============================================================
function processDecision(approved) {
  if (!waitingForInput || !currentTraveller) return;
  waitingForInput = false;

  let correct = false;

  if (approved && currentTraveller.isValid) {
    correct = true; // correctly approved a valid traveller
  } else if (!approved && !currentTraveller.isValid) {
    correct = true; // correctly denied an invalid traveller
  }

  if (correct) {
    score++;
    feedbackText = approved ? "✓ APPROVED — Correct!" : "✗ DENIED — Correct!";
    feedbackColor = color(100, 220, 100);
  } else {
    lives--;
    feedbackText = approved ? "✓ APPROVED — Wrong!" : "✗ DENIED — Wrong!";
    feedbackColor = color(220, 80, 80);
  }
  feedbackTimer = 70;

  // PHYSICS + SOUND (BONUS): Drop a stamp sprite with gravity [2][4]
  // The stamp falls, bounces on the desk, and makes a thud sound on collision
  let stampX = random(docX + 170, docX + 250);
  let stampY = 40; // drops from top

  let s = new Sprite(stampX, stampY, 50, 25);
  s.physics = "dynamic";
  s.color = approved ? color(60, 160, 60, 200) : color(200, 50, 50, 200);
  s.stroke = approved ? color(40, 120, 40) : color(160, 30, 30);
  s.strokeWeight = 2;
  s.text = approved ? "APPROVED" : "DENIED";
  s.textColor = color(255);
  s.textSize = 9;
  s.bounciness = 0.3;
  s.friction = 0.8;
  s.rotationDrag = 5;
  s.vel.y = 2;
  s.vel.x = random(-1, 1);
  s.rotation = random(-15, 15);
  s.life = 90; // auto-remove after 90 frames
  stamps.add(s);
  s.collides(deskGroup, onStampHitDesk); // PHYSICS collision callback [2][4]

  // SOUND: play approve or deny tone [3]
  if (approved) {
    playApproveSound();
  } else {
    playDenySound();
  }

  travellersProcessed++;

  // clear traveller after short delay
  setTimeout(() => {
    currentTraveller = null;
  }, 800);
}

// PHYSICS + SOUND combined (BONUS): stamp hits desk → thud sound [2][3][4]
function onStampHitDesk(stamp, desk) {
  playStampSound();
}

// ============================================================
// INPUT HANDLING
// ============================================================
function keyPressed() {
  // unlock audio on first interaction [3]
  userStartAudio();

  if (gameState === "playing") {
    if (key === "a" || key === "A") {
      processDecision(true);  // approve
    } else if (key === "d" || key === "D") {
      processDecision(false); // deny
    }
  }
}

function mousePressed() {
  // unlock audio on first interaction [3]
  userStartAudio();

  if (gameState === "title") {
    gameState = "playing";
    score = 0;
    lives = 3;
    travellersProcessed = 0;
    currentTraveller = null;
  } else if (gameState === "gameover") {
    // reset
    gameState = "playing";
    score = 0;
    lives = 3;
    travellersProcessed = 0;
    currentTraveller = null;
    // remove old stamps
    for (let s of stamps) {
      s.remove();
    }
  }
}
