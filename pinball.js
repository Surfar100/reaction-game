// Retro Cyberpunk Pinball ("Cyberball") Engine
// Custom 2D Physics Simulator, Audio Synthesizer, and Supabase Leaderboard Bindings

const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// Game States
const STATE = {
    WAITING: 'WAITING',
    PLAYING: 'PLAYING',
    PAUSED: 'PAUSED',
    GAME_OVER: 'GAME_OVER'
};

// Vector Maths helpers
class Vector {
    constructor(x, y) {
        this.x = x;
        this.y = y;
    }
    add(v) { return new Vector(this.x + v.x, this.y + v.y); }
    sub(v) { return new Vector(this.x - v.x, this.y - v.y); }
    mult(n) { return new Vector(this.x * n, this.y * n); }
    dot(v) { return this.x * v.x + this.y * v.y; }
    mag() { return Math.hypot(this.x, this.y); }
    norm() {
        const m = this.mag();
        return m === 0 ? new Vector(0, 0) : new Vector(this.x / m, this.y / m);
    }
}

// Line Segment class for boundaries
class Line {
    constructor(x1, y1, x2, y2, type = 'wall') {
        this.p1 = new Vector(x1, y1);
        this.p2 = new Vector(x2, y2);
        this.type = type; // 'wall', 'slingshot', 'drain'
        this.kickTimer = 0; // Visual flash timer on hits
    }

    closestPoint(p) {
        const ab = this.p2.sub(this.p1);
        const ap = p.sub(this.p1);
        let t = ap.dot(ab) / ab.dot(ab);
        t = Math.max(0, Math.min(1, t)); // clamp to segment
        return this.p1.add(ab.mult(t));
    }

    draw(ctx) {
        ctx.save();
        ctx.beginPath();
        ctx.moveTo(this.p1.x, this.p1.y);
        ctx.lineTo(this.p2.x, this.p2.y);
        
        if (this.type === 'slingshot') {
            ctx.strokeStyle = this.kickTimer > 0 ? '#ffffff' : '#ff007f';
            ctx.shadowColor = '#ff007f';
            ctx.shadowBlur = this.kickTimer > 0 ? 12 : 6;
            ctx.lineWidth = 4;
        } else {
            ctx.strokeStyle = '#bd00ff';
            ctx.shadowColor = '#bd00ff';
            ctx.shadowBlur = 4;
            ctx.lineWidth = 3;
        }
        ctx.stroke();
        ctx.restore();

        if (this.kickTimer > 0) this.kickTimer -= 16.67;
    }
}

// Web Audio API Sound System
class SoundSystem {
    constructor() {
        this.ctx = null;
        this.muted = false;
    }

    init() {
        if (!this.ctx) {
            this.ctx = new (window.AudioContext || window.webkitAudioContext)();
        }
    }

    playBumper() {
        if (this.muted || !this.ctx) return;
        const now = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(150, now);
        osc.frequency.exponentialRampToValueAtTime(600, now + 0.15);
        
        gain.gain.setValueAtTime(0.2, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.15);
        
        osc.start(now);
        osc.stop(now + 0.15);
    }

    playFlipper() {
        if (this.muted || !this.ctx) return;
        const now = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        
        osc.type = 'sine';
        osc.frequency.setValueAtTime(350, now);
        osc.frequency.exponentialRampToValueAtTime(100, now + 0.08);
        
        gain.gain.setValueAtTime(0.12, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.08);
        
        osc.start(now);
        osc.stop(now + 0.08);
    }

    playPlunger() {
        if (this.muted || !this.ctx) return;
        const now = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        
        osc.type = 'square';
        osc.frequency.setValueAtTime(80, now);
        osc.frequency.exponentialRampToValueAtTime(320, now + 0.2);
        
        gain.gain.setValueAtTime(0.15, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.2);
        
        osc.start(now);
        osc.stop(now + 0.2);
    }

    playTarget() {
        if (this.muted || !this.ctx) return;
        const now = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        
        osc.type = 'sine';
        osc.frequency.setValueAtTime(600, now);
        osc.frequency.setValueAtTime(900, now + 0.05);
        
        gain.gain.setValueAtTime(0.15, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.1);
        
        osc.start(now);
        osc.stop(now + 0.1);
    }

    playDrain() {
        if (this.muted || !this.ctx) return;
        const now = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(220, now);
        osc.frequency.exponentialRampToValueAtTime(40, now + 0.8);
        
        gain.gain.setValueAtTime(0.2, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.8);
        
        osc.start(now);
        osc.stop(now + 0.8);
    }
}

// Flipper entity class
class Flipper {
    constructor(pivotX, pivotY, length, isRight) {
        this.pivot = new Vector(pivotX, pivotY);
        this.length = length;
        this.isRight = isRight;
        
        // Rotational constraints (angles in radians)
        this.restAngle = isRight ? 150 * Math.PI / 180 : 30 * Math.PI / 180;
        this.activeAngle = isRight ? 205 * Math.PI / 180 : -25 * Math.PI / 180;
        this.angle = this.restAngle;
        
        this.angularVelocity = 0;
        this.thickness = 8;
    }

    update(active, dt) {
        const prevAngle = this.angle;
        const target = active ? this.activeAngle : this.restAngle;
        const speed = 0.35; // speed of flipper movement rads/frame
        
        if (this.isRight) {
            if (active) {
                this.angle = Math.min(this.activeAngle, this.angle + speed);
            } else {
                this.angle = Math.max(this.restAngle, this.angle - speed);
            }
        } else {
            if (active) {
                this.angle = Math.max(this.activeAngle, this.angle - speed);
            } else {
                this.angle = Math.min(this.restAngle, this.angle + speed);
            }
        }
        
        this.angularVelocity = (this.angle - prevAngle) / (dt / 16.67);
    }

    getTip() {
        return new Vector(
            this.pivot.x + Math.cos(this.angle) * this.length,
            this.pivot.y + Math.sin(this.angle) * this.length
        );
    }

    closestPoint(p) {
        const ab = this.getTip().sub(this.pivot);
        const ap = p.sub(this.pivot);
        let t = ap.dot(ab) / ab.dot(ab);
        t = Math.max(0, Math.min(1, t));
        return this.pivot.add(ab.mult(t));
    }

    draw(ctx) {
        const tip = this.getTip();
        ctx.save();
        ctx.beginPath();
        ctx.moveTo(this.pivot.x, this.pivot.y);
        ctx.lineTo(tip.x, tip.y);
        ctx.lineWidth = this.thickness;
        ctx.lineCap = 'round';
        ctx.strokeStyle = this.isRight ? '#00f3ff' : '#00f3ff';
        ctx.shadowColor = '#00f3ff';
        ctx.shadowBlur = 6;
        ctx.stroke();
        ctx.restore();
    }
}

// Bumper (Circle Obstacle) entity
class Bumper {
    constructor(x, y, r, points = 100, color = '#ff007f') {
        this.pos = new Vector(x, y);
        this.r = r;
        this.points = points;
        this.color = color;
        this.pulseTimer = 0;
    }

    draw(ctx) {
        ctx.save();
        ctx.beginPath();
        ctx.arc(this.pos.x, this.pos.y, this.r, 0, Math.PI * 2);
        ctx.fillStyle = '#060010';
        ctx.fill();
        
        ctx.lineWidth = 3;
        ctx.strokeStyle = this.color;
        ctx.shadowColor = this.color;
        ctx.shadowBlur = this.pulseTimer > 0 ? 16 : 6;
        ctx.stroke();
        
        // Inner core
        ctx.beginPath();
        ctx.arc(this.pos.x, this.pos.y, this.r * 0.5, 0, Math.PI * 2);
        ctx.fillStyle = this.pulseTimer > 0 ? '#ffffff' : this.color;
        ctx.fill();
        ctx.restore();

        if (this.pulseTimer > 0) this.pulseTimer -= 16.67;
    }
}

// Drop Target (Card Obstacle)
class DropTarget {
    constructor(x, y, w, h, idx) {
        this.pos = new Vector(x, y);
        this.w = w;
        this.h = h;
        this.idx = idx;
        this.active = true;
        this.flashTimer = 0;
    }

    closestPoint(p) {
        // Clamp ball center coordinates inside the target rectangle
        const cx = Math.max(this.pos.x, Math.min(p.x, this.pos.x + this.w));
        const cy = Math.max(this.pos.y, Math.min(p.y, this.pos.y + this.h));
        return new Vector(cx, cy);
    }

    draw(ctx) {
        if (!this.active) return;
        ctx.save();
        ctx.beginPath();
        ctx.rect(this.pos.x, this.pos.y, this.w, this.h);
        
        ctx.fillStyle = this.flashTimer > 0 ? '#ffffff' : '#ffff00';
        ctx.shadowColor = '#ffff00';
        ctx.shadowBlur = this.flashTimer > 0 ? 12 : 4;
        ctx.fill();
        ctx.restore();

        if (this.flashTimer > 0) this.flashTimer -= 16.67;
    }
}

// Cyber Portal Vortex
class Portal {
    constructor(entryX, entryY, exitX, exitY) {
        this.entry = new Vector(entryX, entryY);
        this.exit = new Vector(exitX, exitY);
        this.r = 15;
        this.active = true;
        this.cooldown = 0;
        this.pulse = 0;
    }

    update(dt) {
        this.pulse = Math.sin(performance.now() / 150) * 2 + 15;
        if (this.cooldown > 0) this.cooldown -= dt;
    }

    draw(ctx) {
        ctx.save();
        ctx.lineWidth = 2;
        // Entry portal (Neon Purple vortex)
        ctx.beginPath();
        ctx.arc(this.entry.x, this.entry.y, this.pulse, 0, Math.PI * 2);
        ctx.strokeStyle = '#bd00ff';
        ctx.shadowColor = '#bd00ff';
        ctx.shadowBlur = 8;
        ctx.stroke();

        ctx.beginPath();
        ctx.arc(this.entry.x, this.entry.y, 4, 0, Math.PI * 2);
        ctx.fillStyle = '#ffffff';
        ctx.fill();

        // Exit portal (Neon Cyan vortex)
        ctx.beginPath();
        ctx.arc(this.exit.x, this.exit.y, 12, 0, Math.PI * 2);
        ctx.strokeStyle = '#00f3ff';
        ctx.shadowColor = '#00f3ff';
        ctx.shadowBlur = 6;
        ctx.stroke();
        ctx.restore();
    }
}

// Particle System for Hits
class Particle {
    constructor(x, y, color) {
        this.pos = new Vector(x, y);
        this.vel = new Vector((Math.random() - 0.5) * 4, (Math.random() - 0.5) * 4);
        this.color = color;
        this.life = 1.0;
        this.decay = Math.random() * 0.05 + 0.03;
    }

    update() {
        this.pos = this.pos.add(this.vel);
        this.life -= this.decay;
    }

    draw(ctx) {
        ctx.save();
        ctx.globalAlpha = this.life;
        ctx.shadowColor = this.color;
        ctx.shadowBlur = 4;
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.arc(this.pos.x, this.pos.y, 2, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    }
}

// The Pinball class
class Ball {
    constructor(x, y) {
        this.pos = new Vector(x, y);
        this.vel = new Vector(0, 0);
        this.r = 7;
        this.trail = [];
        this.prevPos = new Vector(x, y);
    }

    update(gravity, dt) {
        // Save previous position to resolve boundary directions
        this.prevPos = new Vector(this.pos.x, this.pos.y);

        // Record trail
        this.trail.push(new Vector(this.pos.x, this.pos.y));
        if (this.trail.length > 8) this.trail.shift();

        // Gravity acceleration
        this.vel.y += gravity * (dt / 16.67);
        
        // Terminal speed limit
        const limit = 16;
        if (this.vel.mag() > limit) {
            this.vel = this.vel.norm().mult(limit);
        }

        this.pos = this.pos.add(this.vel.mult(dt / 16.67));
    }

    draw(ctx) {
        // Draw trail
        this.trail.forEach((p, idx) => {
            ctx.save();
            ctx.globalAlpha = (idx / this.trail.length) * 0.25;
            ctx.fillStyle = '#ffffff';
            ctx.beginPath();
            ctx.arc(p.x, p.y, this.r * 0.8, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
        });

        // Draw main ball (Neon silver sphere)
        ctx.save();
        ctx.beginPath();
        ctx.arc(this.pos.x, this.pos.y, this.r, 0, Math.PI * 2);
        
        const grad = ctx.createRadialGradient(
            this.pos.x - 2, this.pos.y - 2, 1,
            this.pos.x, this.pos.y, this.r
        );
        grad.addColorStop(0, '#ffffff');
        grad.addColorStop(0.3, '#d0d0ff');
        grad.addColorStop(1, '#1b1b3a');
        
        ctx.fillStyle = grad;
        ctx.shadowColor = '#00f3ff';
        ctx.shadowBlur = 4;
        ctx.fill();
        ctx.restore();
    }
}

// Main Game Controller Class
class Game {
    constructor() {
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.sound = new SoundSystem();
        
        this.score = 0;
        this.highScore = parseInt(localStorage.getItem('pinball_high_score')) || 0;
        this.lives = 3;
        this.multiplier = 1;
        this.gameState = STATE.WAITING;

        // Physics constants
        this.gravity = 0.28;
        this.restitution = 0.55; // bounce coefficient
        
        this.ball = null;
        this.flippers = [
            new Flipper(110, 530, 60, false), // Left flipper
            new Flipper(250, 530, 60, true)   // Right flipper
        ];
        
        // Static walls / borders
        this.lines = [];
        this.bumpers = [];
        this.targets = [];
        this.portal = null;
        this.particles = [];

        // Key states
        this.keys = {};
        
        // Plunger launcher spring variables
        this.plungerCharge = 0;
        this.plungerMaxCharge = 1.0;
        this.plungerCharging = false;
        
        this.lastTime = 0;
        this.accumulatedTime = 0;

        // Supabase binding
        this.supabase = null;
        this.currentUser = null;
        this.currentMode = 'login';

        this.setupDOM();
        this.setupInput();
        this.initHighscore();
        this.buildTableBoard();
        this.drawInitialScreen();
        this.initSupabase();
    }

    buildTableBoard() {
        this.lines = [
            // Left boundary outer wall
            new Line(10, 600, 10, 180),
            // Left top guide arch segments (approximating curve)
            new Line(10, 180, 20, 140),
            new Line(20, 140, 50, 90),
            new Line(50, 90, 100, 45),
            new Line(100, 45, 180, 25),
            // Connect right plunger guide arch to the left playfield dome peak
            new Line(280, 25, 180, 25),
            
            // Plunger lane inner partition
            new Line(360, 600, 360, 200),
            // Plunger lane floor (retains the ball at plunger level)
            new Line(360, 576, 400, 576),
            
            // Right outer wall
            new Line(400, 600, 400, 180),
            new Line(400, 180, 390, 130),
            new Line(390, 130, 370, 80),
            new Line(370, 80, 330, 40),
            new Line(330, 40, 280, 25),

            // Left drain lane return guide
            new Line(10, 420, 60, 470),
            new Line(60, 470, 110, 530, 'drain'), // left slope
            
            // Right drain lane return guide
            new Line(360, 420, 310, 470),
            new Line(310, 470, 250, 530, 'drain'), // right slope

            // Slingshot lines
            new Line(70, 410, 70, 470, 'slingshot'),
            new Line(290, 410, 290, 470, 'slingshot')
        ];

        // Slingshot back segments to enclose them
        this.lines.push(new Line(70, 470, 95, 450));
        this.lines.push(new Line(95, 450, 70, 410));
        this.lines.push(new Line(290, 470, 265, 450));
        this.lines.push(new Line(265, 450, 290, 410));

        // Plunger guide divider top curved lane feed
        this.lines.push(new Line(360, 200, 345, 175));

        // Circular Bumpers
        this.bumpers = [
            new Bumper(180, 140, 22, 100, '#bd00ff'), // Center purple
            new Bumper(115, 200, 20, 100, '#00f3ff'), // Left cyan
            new Bumper(245, 200, 20, 100, '#00f3ff')  // Right cyan
        ];

        // Drop Targets on the left wall
        this.targets = [
            new DropTarget(12, 250, 6, 22, 0),
            new DropTarget(12, 285, 6, 22, 1),
            new DropTarget(12, 320, 6, 22, 2)
        ];

        // Vortex Teleport Portal
        this.portal = new Portal(180, 75, 180, 350);
    }

    setupDOM() {
        this.overlay = document.getElementById('overlay');
        this.overlayTitle = document.getElementById('overlay-title');
        this.overlayMsg = document.getElementById('overlay-message');
        this.startBtn = document.getElementById('start-btn');
        this.scoreEl = document.getElementById('score');
        this.highScoreEl = document.getElementById('high-score');
        this.levelEl = document.getElementById('lives-container'); // Ball counter lives
        this.statusEl = document.getElementById('status-text');
        this.multiplierEl = document.getElementById('multiplier');
        this.muteBtn = document.getElementById('mute-btn');
        this.pauseBtn = document.getElementById('pause-btn');

        this.startBtn.addEventListener('click', () => {
            this.sound.init();
            if (this.gameState === STATE.WAITING || this.gameState === STATE.GAME_OVER) {
                this.startGame();
            }
        });

        this.muteBtn.addEventListener('click', () => {
            this.sound.muted = !this.sound.muted;
            this.muteBtn.textContent = this.sound.muted ? "🔇 Unmute" : "🔊 Mute";
        });

        this.pauseBtn.addEventListener('click', () => {
            this.togglePause();
        });

        const resetConfigBtn = document.getElementById('reset-config-btn');
        if (resetConfigBtn) {
            resetConfigBtn.addEventListener('click', (e) => {
                e.preventDefault();
                document.getElementById('setup-modal').classList.add('active');
            });
        }

        const closeSetupBtn = document.getElementById('close-setup-btn');
        if (closeSetupBtn) {
            closeSetupBtn.addEventListener('click', () => {
                document.getElementById('setup-modal').classList.remove('active');
            });
        }

        const useDefaultBtn = document.getElementById('use-default-btn');
        if (useDefaultBtn) {
            useDefaultBtn.addEventListener('click', () => {
                if (confirm("Reset configuration to the default game database project?")) {
                    localStorage.removeItem('supabase_url');
                    localStorage.removeItem('supabase_key');
                    window.location.reload();
                }
            });
        }
    }

    setupInput() {
        window.addEventListener('keydown', (e) => {
            if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

            const keys = ['Space', 'KeyA', 'KeyD', 'ArrowLeft', 'ArrowRight', 'ShiftLeft', 'ShiftRight', 'Escape', 'KeyP'];
            if (keys.includes(e.code) || e.code.startsWith('Arrow')) {
                e.preventDefault();
            }
            this.keys[e.code] = true;

            // Handle plunger compression initiation (must be in plunger lane near bottom)
            if (e.code === 'Space' && this.gameState === STATE.PLAYING && this.ball && this.ball.pos.x > 360 && this.ball.pos.y > 520) {
                this.plungerCharging = true;
            }

            // Pause triggers
            if (e.code === 'Escape' || e.code === 'KeyP') {
                this.togglePause();
            }
        });

        window.addEventListener('keyup', (e) => {
            if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
            this.keys[e.code] = false;

            // Launch ball on plunger release
            if (e.code === 'Space' && this.plungerCharging) {
                this.plungerCharging = false;
                this.firePlunger();
            }
        });
    }

    initHighscore() {
        this.highScoreEl.textContent = String(this.highScore).padStart(6, '0');
    }

    updateBallsDisplay() {
        // Redraw remaining extra balls (lives) icon
        this.levelEl.innerHTML = '';
        for (let i = 0; i < this.lives; i++) {
            this.levelEl.innerHTML += `
                <svg viewBox="0 0 20 20">
                    <circle cx="10" cy="10" r="8" />
                </svg>
            `;
        }
    }

    drawInitialScreen() {
        this.ctx.fillStyle = 'black';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        this.lines.forEach(l => l.draw(this.ctx));
        this.bumpers.forEach(b => b.draw(this.ctx));
        this.targets.forEach(t => t.draw(this.ctx));
        if (this.portal) this.portal.draw(this.ctx);
        this.drawOverlayScreen("READY PLAYER ONE", "HOLD SPACE TO COMPRESS SPRING\nUSE A/D OR SHIFTS FOR FLIPPERS", "LAUNCH");
    }

    drawOverlayScreen(title, msg, btnText) {
        this.overlayTitle.textContent = title;
        this.overlayMsg.innerHTML = msg.replace(/\n/g, '<br>');
        this.startBtn.textContent = btnText;
        this.overlay.classList.add('active');
    }

    startGame() {
        this.score = 0;
        this.lives = 3;
        this.multiplier = 1;
        this.scoreEl.textContent = "000000";
        this.multiplierEl.textContent = "x1";
        this.statusEl.textContent = "PLAYING";
        this.statusEl.className = "hud-footer-label neon-green";
        this.overlay.classList.remove('active');
        this.pauseBtn.disabled = false;
        
        this.particles = [];
        this.targets.forEach(t => t.active = true);
        
        this.spawnBall();
        this.updateBallsDisplay();
        
        this.gameState = STATE.PLAYING;
        this.lastTime = performance.now();
        
        requestAnimationFrame((t) => this.gameLoop(t));
    }

    spawnBall() {
        this.ball = new Ball(380, 550); // Spawn directly in plunger lane
    }

    firePlunger() {
        if (!this.ball) return;
        const force = 10 + this.plungerCharge * 18; // Max launch speed
        this.ball.vel = new Vector(0, -force);
        this.plungerCharge = 0;
        this.sound.playPlunger();
    }

    togglePause() {
        if (this.gameState === STATE.PLAYING) {
            this.gameState = STATE.PAUSED;
            this.pauseBtn.textContent = "▶ Resume";
            this.statusEl.textContent = "PAUSED";
            this.statusEl.className = "hud-footer-label neon-pink";
            this.drawOverlayScreen("PAUSED", "PRESS P OR ESC TO RESUME PLAY", "RESUME");
        } else if (this.gameState === STATE.PAUSED) {
            this.overlay.classList.remove('active');
            this.gameState = STATE.PLAYING;
            this.pauseBtn.textContent = "⏸ Pause";
            this.statusEl.textContent = "PLAYING";
            this.statusEl.className = "hud-footer-label neon-green";
            this.lastTime = performance.now();
        }
    }

    handleBallDrain() {
        this.sound.playDrain();
        this.lives--;
        this.multiplier = 1;
        this.multiplierEl.textContent = "x1";
        this.updateBallsDisplay();

        if (this.lives > 0) {
            this.spawnBall();
        } else {
            this.gameOver();
        }
    }

    gameOver() {
        this.gameState = STATE.GAME_OVER;
        this.statusEl.textContent = "GAME OVER";
        this.statusEl.className = "hud-footer-label neon-pink";
        this.pauseBtn.disabled = true;

        if (this.score > this.highScore) {
            this.highScore = this.score;
            localStorage.setItem('pinball_high_score', this.highScore);
            this.initHighscore();
        }

        this.submitScore();
        this.drawOverlayScreen("GAME OVER", `YOUR PINBALL SCORE: ${this.score}`, "PLAY AGAIN");
    }

    addScore(points) {
        this.score += points * this.multiplier;
        this.scoreEl.textContent = String(this.score).padStart(6, '0');
        if (this.score > this.highScore) {
            this.highScore = this.score;
            this.highScoreEl.textContent = String(this.highScore).padStart(6, '0');
        }
    }

    gameLoop(currentTime) {
        if (this.gameState !== STATE.PLAYING) return;

        let deltaTime = currentTime - this.lastTime;
        if (deltaTime > 100) deltaTime = 16.66;
        this.lastTime = currentTime;

        this.accumulatedTime += deltaTime;
        const frameStep = 16.67;
        
        while (this.accumulatedTime >= frameStep) {
            this.update(frameStep);
            this.accumulatedTime -= frameStep;
        }

        this.draw();
        requestAnimationFrame((t) => this.gameLoop(t));
    }

    update(dt) {
        // Charge plunger
        if (this.plungerCharging) {
            this.plungerCharge = Math.min(this.plungerMaxCharge, this.plungerCharge + 0.02 * (dt / 16.67));
        }

        // Update portal
        if (this.portal) this.portal.update(dt);

        // Update flippers
        const leftFlipperActive = this.keys['KeyA'] || this.keys['ArrowLeft'] || this.keys['ShiftLeft'];
        const rightFlipperActive = this.keys['KeyD'] || this.keys['ArrowRight'] || this.keys['ShiftRight'];
        this.flippers[0].update(leftFlipperActive, dt);
        this.flippers[1].update(rightFlipperActive, dt);

        // Update particles
        this.particles.forEach(p => p.update());
        this.particles = this.particles.filter(p => p.life > 0);

        // Update ball with physics iterations (sub-stepping avoids wall clipping)
        if (this.ball) {
            const steps = 4;
            const stepDt = dt / steps;
            
            for (let s = 0; s < steps; s++) {
                this.ball.update(this.gravity / steps, stepDt);
                this.resolveCollisions();
            }

            // Ball Drained out at bottom
            if (this.ball.pos.y > 620) {
                this.handleBallDrain();
            }
        }
    }

    resolveCollisions() {
        if (!this.ball) return;
        const ball = this.ball;

        // 1. Static lines collisions
        this.lines.forEach(line => {
            const cp = line.closestPoint(ball.pos);
            const distVector = ball.pos.sub(cp);
            const dist = distVector.mag();

            if (dist < ball.r) {
                // Determine normal pointing back inside
                let norm = distVector.norm();
                if (ball.prevPos) {
                    const toPrev = ball.prevPos.sub(cp);
                    if (toPrev.mag() > 0.01) {
                        norm = toPrev.norm();
                    }
                }

                // Colliding! Push out
                ball.pos = cp.add(norm.mult(ball.r));

                // Reflect velocity
                const normalVelocity = ball.vel.dot(norm);
                if (normalVelocity < 0) {
                    let bounce = this.restitution;
                    if (line.type === 'slingshot') {
                        bounce = 1.6; // High kick
                        line.kickTimer = 150;
                        this.sound.playBumper();
                        this.addScore(50);
                        this.createExplosion(cp.x, cp.y, '#ff007f');
                    }
                    ball.vel = ball.vel.sub(norm.mult(normalVelocity * (1 + bounce)));
                }
            }
        });

        // 2. Bumpers collisions
        this.bumpers.forEach(bumper => {
            const distVector = ball.pos.sub(bumper.pos);
            const dist = distVector.mag();
            const minDist = ball.r + bumper.r;

            if (dist < minDist) {
                // Colliding! Push out
                const norm = distVector.norm();
                ball.pos = bumper.pos.add(norm.mult(minDist));

                // Kickback velocity math
                const normalVelocity = ball.vel.dot(norm);
                if (normalVelocity < 0) {
                    const kickForce = 3.5;
                    ball.vel = ball.vel.sub(norm.mult(normalVelocity * 2)).add(norm.mult(kickForce));
                    bumper.pulseTimer = 180;
                    this.sound.playBumper();
                    this.addScore(bumper.points);
                    this.createExplosion(ball.pos.x, ball.pos.y, bumper.color);
                }
            }
        });

        // 3. Drop Targets collisions
        this.targets.forEach(target => {
            if (!target.active) return;
            const cp = target.closestPoint(ball.pos);
            const distVector = ball.pos.sub(cp);
            const dist = distVector.mag();

            if (dist < ball.r) {
                // Knock target down
                target.active = false;
                target.flashTimer = 150;
                
                const norm = distVector.norm();
                ball.pos = cp.add(norm.mult(ball.r));
                
                // Bounce
                const normalVelocity = ball.vel.dot(norm);
                if (normalVelocity < 0) {
                    ball.vel = ball.vel.sub(norm.mult(normalVelocity * (1 + this.restitution)));
                }

                this.sound.playTarget();
                this.addScore(250);
                this.createExplosion(cp.x, cp.y, '#ffff00');

                // Check target completion
                const remaining = this.targets.filter(t => t.active);
                if (remaining.length === 0) {
                    this.multiplier += 1;
                    this.multiplierEl.textContent = `x${this.multiplier}`;
                    this.addScore(1500); // Bonus
                    this.createExplosion(200, 300, '#3ecf8e', 30);
                    
                    // Reset targets
                    setTimeout(() => {
                        this.targets.forEach(t => t.active = true);
                    }, 1000);
                }
            }
        });

        // 4. Portal vortex teleports
        if (this.portal && this.portal.cooldown <= 0) {
            const distVector = ball.pos.sub(this.portal.entry);
            const dist = distVector.mag();
            if (dist < ball.r + this.portal.r) {
                // Teleport!
                ball.pos = new Vector(this.portal.exit.x, this.portal.exit.y);
                // Launch ball downwards out of exit with speed
                ball.vel = new Vector(0, 8);
                this.portal.cooldown = 2000; // 2 seconds delay
                this.multiplier += 1;
                this.multiplierEl.textContent = `x${this.multiplier}`;
                this.sound.playTarget();
                this.addScore(800);
                this.createExplosion(this.portal.exit.x, this.portal.exit.y, '#00f3ff', 20);
            }
        }

        // 5. Flippers collisions
        this.flippers.forEach(flipper => {
            const cp = flipper.closestPoint(ball.pos);
            const distVector = ball.pos.sub(cp);
            const dist = distVector.mag();

            if (dist < ball.r + flipper.thickness / 2) {
                let norm = distVector.norm();
                if (ball.prevPos) {
                    const toPrev = ball.prevPos.sub(cp);
                    if (toPrev.mag() > 0.01) {
                        norm = toPrev.norm();
                    }
                }
                ball.pos = cp.add(norm.mult(ball.r + flipper.thickness / 2));

                const normalVelocity = ball.vel.dot(norm);
                if (normalVelocity < 0) {
                    // Angular velocity impact kick transfer
                    const distFromPivot = cp.sub(flipper.pivot).mag();
                    const tangentialVelocity = flipper.angularVelocity * distFromPivot;
                    
                    let bounce = this.restitution;
                    ball.vel = ball.vel.sub(norm.mult(normalVelocity * (1 + bounce)));
                    
                    // Add flipper swing force perpendicular to flipper arm
                    if (Math.abs(flipper.angularVelocity) > 0.01) {
                        const perp = new Vector(-Math.sin(flipper.angle), Math.cos(flipper.angle)).norm();
                        ball.vel = ball.vel.add(perp.mult(tangentialVelocity * 0.7));
                        this.sound.playFlipper();
                        this.createExplosion(ball.pos.x, ball.pos.y, '#00f3ff', 8);
                    }
                }
            }
        });
    }

    createExplosion(x, y, color, count = 10) {
        for (let i = 0; i < count; i++) {
            this.particles.push(new Particle(x, y, color));
        }
    }

    draw() {
        this.ctx.fillStyle = '#030008';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        // Draw structural lines
        this.lines.forEach(l => l.draw(this.ctx));

        // Draw bumpers
        this.bumpers.forEach(b => b.draw(this.ctx));

        // Draw targets
        this.targets.forEach(t => t.draw(this.ctx));

        // Draw portal
        if (this.portal) this.portal.draw(this.ctx);

        // Draw flippers
        this.flippers.forEach(f => f.draw(this.ctx));

        // Draw particles
        this.particles.forEach(p => p.draw(this.ctx));

        // Draw plunger spring visual meter representation
        this.drawPlungerLane();

        // Draw ball
        if (this.ball) this.ball.draw(this.ctx);
    }

    drawPlungerLane() {
        this.ctx.save();
        // Plunger spring base
        this.ctx.fillStyle = '#100022';
        this.ctx.fillRect(362, 570, 36, 30);
        
        // Render compressing spring
        const springCompression = this.plungerCharge * 20;
        this.ctx.fillStyle = '#ff007f';
        this.ctx.shadowColor = '#ff007f';
        this.ctx.shadowBlur = 4;
        this.ctx.fillRect(376, 570 + springCompression, 8, 25 - springCompression);
        
        // Spring cap/tip
        this.ctx.fillStyle = '#ffffff';
        this.ctx.fillRect(370, 566 + springCompression, 20, 4);
        ctx.restore();
    }

    // ==========================================
    // SUPABASE INTEGRATION METHODS
    // ==========================================
    initSupabase() {
        const DEFAULT_URL = 'https://fhurbhnkmcntlrwbdvrm.supabase.co';
        const DEFAULT_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZodXJiaG5rbWNudGxyd2JkdnJtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODMwOTY5OTEsImV4cCI6MjA5ODY3Mjk5MX0.-Blcs3fh7ecIuMQGaSjWZByVLXbWf5_4vqgETKN_6Ow';

        let url = localStorage.getItem('supabase_url') || DEFAULT_URL;
        let key = localStorage.getItem('supabase_key') || DEFAULT_KEY;
        
        const dbStatus = document.getElementById('db-status');
        const setupModal = document.getElementById('setup-modal');
        const setupForm = document.getElementById('setup-form');
        
        if (setupForm) {
            setupForm.addEventListener('submit', (e) => {
                e.preventDefault();
                let urlVal = document.getElementById('setup-url').value.trim();
                let keyVal = document.getElementById('setup-key').value.trim();
                
                if (urlVal && keyVal) {
                    if (!/^https?:\/\//i.test(urlVal)) {
                        urlVal = 'https://' + urlVal;
                    }
                    localStorage.setItem('supabase_url', urlVal);
                    localStorage.setItem('supabase_key', keyVal);
                    window.location.reload();
                }
            });
        }
        
        if (!url || !key) {
            setupModal.classList.add('active');
            dbStatus.textContent = 'OFFLINE';
            dbStatus.className = 'status-indicator offline';
            return;
        }
        
        url = url.trim();
        key = key.trim();
        if (!/^https?:\/\//i.test(url)) {
            url = 'https://' + url;
        }
        
        try {
            this.supabase = supabase.createClient(url, key);
            
            dbStatus.textContent = 'ONLINE';
            dbStatus.className = 'status-indicator online';
            
            this.setupSupabaseAuth();
            this.checkSession();
            this.fetchLeaderboard();
        } catch (e) {
            console.error("Supabase Init Error:", e);
            dbStatus.textContent = 'ERROR';
            dbStatus.className = 'status-indicator offline';
        }
    }

    setupSupabaseAuth() {
        const toggleLogin = document.getElementById('toggle-login-btn');
        const toggleRegister = document.getElementById('toggle-register-btn');
        const usernameGroup = document.getElementById('username-group');
        const authForm = document.getElementById('auth-form');
        const usernameInput = document.getElementById('auth-username');
        const logoutBtn = document.getElementById('logout-btn');
        const errorMsg = document.getElementById('auth-error-msg');
        
        toggleLogin.addEventListener('click', () => {
            this.currentMode = 'login';
            toggleLogin.classList.add('active');
            toggleRegister.classList.remove('active');
            usernameGroup.style.display = 'none';
            usernameInput.required = false;
            errorMsg.textContent = '';
        });
        
        toggleRegister.addEventListener('click', () => {
            this.currentMode = 'register';
            toggleRegister.classList.add('active');
            toggleLogin.classList.remove('active');
            usernameGroup.style.display = 'flex';
            usernameInput.required = true;
            errorMsg.textContent = '';
        });
        
        authForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const email = document.getElementById('auth-email').value.trim();
            const password = document.getElementById('auth-password').value;
            errorMsg.textContent = '';
            
            try {
                if (this.currentMode === 'login') {
                    const { data, error } = await this.supabase.auth.signInWithPassword({
                        email,
                        password
                    });
                    if (error) throw error;
                    this.onUserLoggedIn(data.user);
                } else {
                    const username = usernameInput.value.trim();
                    if (!username) throw new Error("Username is required");
                    
                    const { data, error } = await this.supabase.auth.signUp({
                        email,
                        password,
                        options: {
                            data: { username }
                        }
                    });
                    if (error) throw error;
                    
                    if (data.user && data.session) {
                        this.onUserLoggedIn(data.user);
                    } else {
                        errorMsg.innerHTML = '<span style="color: var(--neon-green)">Signup success! Check your email to confirm.</span>';
                    }
                }
                authForm.reset();
            } catch (err) {
                console.error("Auth action error:", err);
                errorMsg.textContent = err.message || "An authentication error occurred.";
            }
        });
        
        logoutBtn.addEventListener('click', async () => {
            try {
                const { error } = await this.supabase.auth.signOut();
                if (error) throw error;
                this.onUserLoggedOut();
            } catch (err) {
                console.error("Log out error:", err);
            }
        });
    }

    async checkSession() {
        if (!this.supabase) return;
        try {
            const { data: { session }, error } = await this.supabase.auth.getSession();
            if (error) throw error;
            if (session && session.user) {
                this.onUserLoggedIn(session.user);
            }
        } catch (e) {
            console.error("Check session error:", e);
        }
    }

    onUserLoggedIn(user) {
        this.currentUser = user;
        const loggedOutEl = document.getElementById('auth-logged-out');
        const loggedInEl = document.getElementById('auth-logged-in');
        const playerUsernameEl = document.getElementById('player-username');
        
        loggedOutEl.style.display = 'none';
        loggedInEl.style.display = 'block';
        
        const username = user.user_metadata?.username || user.email.split('@')[0];
        playerUsernameEl.textContent = username;
        
        this.fetchPlayerPB(username);
        this.fetchLeaderboard();
    }

    onUserLoggedOut() {
        this.currentUser = null;
        const loggedOutEl = document.getElementById('auth-logged-out');
        const loggedInEl = document.getElementById('auth-logged-in');
        
        loggedOutEl.style.display = 'block';
        loggedInEl.style.display = 'none';
        
        this.fetchLeaderboard();
    }

    async fetchPlayerPB(username) {
        if (!this.supabase) return;
        try {
            const { data, error } = await this.supabase
                .from('pinball_scores')
                .select('score')
                .eq('username', username)
                .order('score', { ascending: false })
                .limit(1);
            
            if (error) throw error;
            
            const pb = (data && data.length > 0) ? data[0].score : 0;
            document.getElementById('player-pb').textContent = String(pb).padStart(6, '0');
            
            if (pb > this.highScore) {
                this.highScore = pb;
                localStorage.setItem('pinball_high_score', pb);
                this.initHighscore();
            }
        } catch (e) {
            console.error("Fetch personal best error:", e);
        }
    }

    async fetchLeaderboard() {
        if (!this.supabase) return;
        const bodyEl = document.getElementById('leaderboard-body');
        
        try {
            const { data, error } = await this.supabase
                .from('pinball_scores')
                .select('username, score, created_at')
                .order('score', { ascending: false })
                .limit(10);
            
            if (error) throw error;
            
            bodyEl.innerHTML = '';
            
            if (!data || data.length === 0) {
                bodyEl.innerHTML = '<tr><td colspan="3" class="no-scores-text">NO GLOBAL SCORES YET</td></tr>';
                return;
            }
            
            const currentUsername = this.currentUser?.user_metadata?.username;
            
            data.forEach((row, idx) => {
                const rank = idx + 1;
                let rankClass = '';
                if (rank <= 3) rankClass = `rank-${rank}`;
                
                const isCurrentUser = currentUsername && row.username === currentUsername;
                const rowClass = isCurrentUser ? 'current-user-row' : '';
                
                bodyEl.innerHTML += `
                    <tr class="${rowClass}">
                        <td class="rank-col ${rankClass}">${rank}</td>
                        <td class="player-col">${row.username}</td>
                        <td class="score-col">${String(row.score).padStart(6, '0')}</td>
                    </tr>
                `;
            });
        } catch (e) {
            console.error("Fetch leaderboard error:", e);
            bodyEl.innerHTML = '<tr><td colspan="3" class="no-scores-text" style="color: var(--neon-pink)">FAILED TO LOAD SCORES</td></tr>';
        }
    }

    async submitScore() {
        if (!this.supabase || !this.currentUser) return;
        const username = this.currentUser.user_metadata?.username;
        if (!username) return;
        
        try {
            const { error } = await this.supabase
                .from('pinball_scores')
                .insert([
                    { username: username, score: this.score }
                ]);
            if (error) throw error;
            
            this.fetchPlayerPB(username);
            this.fetchLeaderboard();
        } catch (e) {
            console.error("Submit score error:", e);
        }
    }
}

// Start game instance on load
window.addEventListener('DOMContentLoaded', () => {
    window.gameEngine = new Game();
});
