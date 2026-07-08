// Kong Invaders - 80s Fusion Game Engine
// Donkey Kong + Space Invaders + Frogger Mashup

// Polyfill for CanvasRenderingContext2D.prototype.roundRect for backward compatibility
if (typeof CanvasRenderingContext2D !== 'undefined' && !CanvasRenderingContext2D.prototype.roundRect) {
    CanvasRenderingContext2D.prototype.roundRect = function (x, y, w, h, r) {
        if (w < 2 * r) r = w / 2;
        if (h < 2 * r) r = h / 2;
        this.beginPath();
        this.moveTo(x + r, y);
        this.arcTo(x + w, y, x + w, y + h, r);
        this.arcTo(x + w, y + h, x, y + h, r);
        this.arcTo(x, y + h, x, y, r);
        this.arcTo(x, y, x + w, y, r);
        this.closePath();
        return this;
    };
}

const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

const STATE = {
    WAITING: 'WAITING',
    PLAYING: 'PLAYING',
    PAUSED: 'PAUSED',
    VICTORY: 'VICTORY',
    GAME_OVER: 'GAME_OVER'
};

const DIFFICULTY = {
    EASY: { alienSpeed: 0.8, fireRate: 0.005, brickRate: 1500, label: 'EASY', color: '#00ff66' },
    NORMAL: { alienSpeed: 1.3, fireRate: 0.012, brickRate: 1000, label: 'NORMAL', color: '#00f3ff' },
    HARD: { alienSpeed: 1.8, fireRate: 0.022, brickRate: 750, label: 'HARD', color: '#ffcc00' },
    INSANE: { alienSpeed: 2.6, fireRate: 0.040, brickRate: 500, label: 'INSANE', color: '#ff007f' }
};

// Vector helper
class Vector {
    constructor(x, y) {
        this.x = x;
        this.y = y;
    }
    add(v) { return new Vector(this.x + v.x, this.y + v.y); }
    sub(v) { return new Vector(this.x - v.x, this.y - v.y); }
    mult(n) { return new Vector(this.x * n, this.y * n); }
}

// Sound Synthesizer using Web Audio API
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

    playLaser() {
        if (this.muted || !this.ctx) return;
        const now = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(800, now);
        osc.frequency.exponentialRampToValueAtTime(150, now + 0.12);
        
        gain.gain.setValueAtTime(0.08, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
        
        osc.start(now);
        osc.stop(now + 0.12);
    }

    playJump() {
        if (this.muted || !this.ctx) return;
        const now = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(180, now);
        osc.frequency.exponentialRampToValueAtTime(500, now + 0.15);
        
        gain.gain.setValueAtTime(0.12, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
        
        osc.start(now);
        osc.stop(now + 0.15);
    }

    playExplosion() {
        if (this.muted || !this.ctx) return;
        const now = this.ctx.currentTime;
        
        // Noise buffer helper
        const bufferSize = this.ctx.sampleRate * 0.25;
        const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
            data[i] = Math.random() * 2 - 1;
        }
        
        const noise = this.ctx.createBufferSource();
        noise.buffer = buffer;
        
        const filter = this.ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(400, now);
        filter.frequency.exponentialRampToValueAtTime(20, now + 0.25);
        
        const gain = this.ctx.createGain();
        gain.gain.setValueAtTime(0.15, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.25);
        
        noise.connect(filter);
        filter.connect(gain);
        gain.connect(this.ctx.destination);
        
        noise.start(now);
        noise.stop(now + 0.25);
    }

    playDeflect() {
        if (this.muted || !this.ctx) return;
        const now = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        
        osc.type = 'sine';
        osc.frequency.setValueAtTime(300, now);
        osc.frequency.setValueAtTime(600, now + 0.05);
        osc.frequency.exponentialRampToValueAtTime(1200, now + 0.15);
        
        gain.gain.setValueAtTime(0.12, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.15);
        
        osc.start(now);
        osc.stop(now + 0.15);
    }

    playHurt() {
        if (this.muted || !this.ctx) return;
        const now = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(150, now);
        osc.frequency.linearRampToValueAtTime(60, now + 0.3);
        
        gain.gain.setValueAtTime(0.15, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.3);
        
        osc.start(now);
        osc.stop(now + 0.3);
    }

    playFanfare() {
        if (this.muted || !this.ctx) return;
        const notes = [261.63, 329.63, 392.00, 523.25]; // C E G C
        notes.forEach((freq, idx) => {
            const now = this.ctx.currentTime + idx * 0.15;
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            osc.connect(gain);
            gain.connect(this.ctx.destination);
            
            osc.frequency.setValueAtTime(freq, now);
            gain.gain.setValueAtTime(0.12, now);
            gain.gain.exponentialRampToValueAtTime(0.005, now + 0.25);
            
            osc.start(now);
            osc.stop(now + 0.25);
        });
    }
}

// Particle system helper
class Particle {
    constructor(x, y, color) {
        this.pos = new Vector(x, y);
        this.vel = new Vector((Math.random() - 0.5) * 4, (Math.random() - 0.5) * 4);
        this.color = color;
        this.size = Math.random() * 3 + 1;
        this.life = 255;
    }
    update() {
        this.pos = this.pos.add(this.vel);
        this.life -= 8;
    }
    draw(ctx) {
        ctx.save();
        ctx.fillStyle = this.color;
        ctx.globalAlpha = this.life / 255;
        ctx.beginPath();
        ctx.arc(this.pos.x, this.pos.y, this.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    }
}

class Game {
    constructor() {
        this.state = STATE.WAITING;
        this.score = 0;
        this.highScore = parseInt(localStorage.getItem('kong_high') || '0', 10);
        this.level = 1;
        this.lives = 3;
        this.bossLife = 100;
        
        this.difficulty = DIFFICULTY.NORMAL;
        
        // Physics variables
        this.gravity = 0.28;
        
        // Setup Web Audio
        this.sound = new SoundSystem();
        
        // DOM binding
        this.scoreEl = document.getElementById('score');
        this.highScoreEl = document.getElementById('high-score');
        this.levelEl = document.getElementById('level');
        this.bossLifeEl = document.getElementById('boss-life');
        this.livesContainer = document.getElementById('lives-container');
        this.difficultyEl = document.getElementById('hud-difficulty');
        
        this.overlay = document.getElementById('overlay');
        this.overlayTitle = document.getElementById('overlay-title');
        this.overlayMessage = document.getElementById('overlay-message');
        this.startBtn = document.getElementById('start-btn');
        this.pauseBtn = document.getElementById('pause-btn');
        this.muteBtn = document.getElementById('mute-btn');
        
        // Highscores
        this.loginBtn = document.getElementById('lobby-login-btn');
        this.logoutBtn = document.getElementById('logout-btn');
        this.leaderboardBody = document.getElementById('leaderboard-body');
        
        this.keys = {};
        this.particles = [];
        this.player = null;
        this.invaders = [];
        this.hovercars = [];
        this.bricks = [];
        this.lasers = [];
        this.lastTime = 0;
        
        // Platform definitions
        this.platforms = [
            // Bottom Floor
            { x1: 0, x2: 480, y: 550 },
            // Mid Scaffolding (alternating gaps)
            { x1: 0, x2: 400, y: 460 },
            { x1: 80, x2: 480, y: 370 },
            { x1: 0, x2: 400, y: 280 },
            // Cyber Highway (Frogger road gap in center)
            { x1: 0, x2: 120, y: 190 },
            { x1: 360, x2: 480, y: 190 },
            // Boss Scaffolding at top
            { x1: 0, x2: 480, y: 110 }
        ];

        // Ladder definitions
        this.ladders = [
            { x: 380, y1: 460, y2: 550 },
            { x: 100, y1: 370, y2: 460 },
            { x: 380, y1: 280, y2: 370 },
            { x: 80,  y1: 190, y2: 280 },
            { x: 400, y1: 110, y2: 190 }
        ];

        // Boss Kong variables
        this.kongPos = new Vector(240, 75);
        this.kongChestBeating = false;
        this.kongBeatTimer = 0;
        this.lastBrickSpawn = 0;

        this.setupDOM();
        this.setupInput();
        this.initHighscore();
    }

    setupDOM() {
        this.startBtn.addEventListener('click', () => {
            this.sound.init();
            this.startGame();
        });
        
        this.pauseBtn.addEventListener('click', () => this.togglePause());
        this.muteBtn.addEventListener('click', () => {
            this.sound.muted = !this.sound.muted;
            this.muteBtn.textContent = this.sound.muted ? '🔇 Unmute' : '🔊 Mute';
        });

        // Difficulty selectors
        ['easy', 'normal', 'hard', 'insane'].forEach(id => {
            document.getElementById(`diff-${id}`).addEventListener('click', (e) => {
                // Remove active class from all
                document.querySelectorAll('.diff-btn').forEach(b => b.classList.remove('active'));
                e.target.classList.add('active');
                
                this.difficulty = DIFFICULTY[id.toUpperCase()];
                this.difficultyEl.textContent = this.difficulty.label;
                this.difficultyEl.className = `hud-value`;
                if (id === 'easy') this.difficultyEl.classList.add('neon-green');
                if (id === 'normal') this.difficultyEl.classList.add('neon-blue');
                if (id === 'hard') this.difficultyEl.classList.add('neon-yellow-text');
                if (id === 'insane') this.difficultyEl.classList.add('neon-pink');
            });
        });
    }

    setupInput() {
        window.addEventListener('keydown', (e) => {
            const list = ['Space', 'KeyA', 'KeyD', 'KeyW', 'KeyS', 'KeyF', 'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Enter', 'KeyP'];
            if (list.includes(e.code) || e.code.startsWith('Arrow')) {
                e.preventDefault();
            }
            this.keys[e.code] = true;
            
            // Flipper fire key shortcut
            if (e.code === 'KeyF' || e.code === 'Enter') {
                this.fireBlaster();
            }

            if (e.code === 'KeyP') {
                this.togglePause();
            }
        });

        window.addEventListener('keyup', (e) => {
            this.keys[e.code] = false;
        });
    }

    initHighscore() {
        this.highScoreEl.textContent = String(this.highScore).padStart(6, '0');
        this.updateIntegrityDisplay();
    }

    updateIntegrityDisplay() {
        this.livesContainer.innerHTML = '';
        for (let i = 0; i < 3; i++) {
            const dot = document.createElement('span');
            dot.className = `live-dot ${i < this.lives ? 'active' : ''}`;
            dot.style.background = i < this.lives ? 'var(--neon-green)' : '#222';
            dot.style.boxShadow = i < this.lives ? '0 0 5px var(--neon-green)' : 'none';
            dot.style.display = 'inline-block';
            dot.style.width = '10px';
            dot.style.height = '10px';
            dot.style.borderRadius = '50%';
            dot.style.marginLeft = '5px';
            this.livesContainer.appendChild(dot);
        }
    }

    startGame() {
        this.score = 0;
        this.level = 1;
        this.lives = 3;
        this.bossLife = 100;
        this.particles = [];
        this.lasers = [];
        this.bricks = [];
        this.scoreEl.textContent = "000000";
        this.levelEl.textContent = "1";
        this.bossLifeEl.textContent = "100%";
        
        this.updateIntegrityDisplay();
        this.overlay.classList.remove('active');
        this.pauseBtn.disabled = false;
        
        this.spawnPlayer();
        this.spawnInvaders();
        this.spawnCars();
        
        this.state = STATE.PLAYING;
        const timeNow = (typeof performance !== 'undefined' && performance.now) ? performance.now() : Date.now();
        this.lastTime = timeNow;
        this.lastBrickSpawn = timeNow;
        
        requestAnimationFrame((t) => this.gameLoop(t));
    }

    spawnPlayer() {
        this.player = {
            pos: new Vector(240, 520),
            vel: new Vector(0, 0),
            width: 14,
            height: 24,
            isGrounded: true,
            isClimbing: false,
            lastDirection: 'right'
        };
    }

    spawnInvaders() {
        this.invaders = [];
        // Spawn 3 invaders on platform 4, 3, and 2
        const platformsForInvaders = [
            { y: 460, minX: 40, maxX: 360 },
            { y: 370, minX: 120, maxX: 400 },
            { y: 280, minX: 40, maxX: 360 }
        ];

        platformsForInvaders.forEach(plat => {
            for (let i = 0; i < 3; i++) {
                this.invaders.push({
                    pos: new Vector(plat.minX + i * 100, plat.y - 16),
                    vel: new Vector(this.difficulty.alienSpeed, 0),
                    width: 16,
                    height: 12,
                    platY: plat.y,
                    animFrame: 0,
                    shootCooldown: Math.random() * 2000 + 1000
                });
            }
        });
    }

    spawnCars() {
        this.hovercars = [
            // Row 1 (going right)
            { pos: new Vector(100, 182), vel: new Vector(1.2, 0), width: 45, height: 8 },
            { pos: new Vector(300, 182), vel: new Vector(1.2, 0), width: 45, height: 8 },
            // Row 2 (going left)
            { pos: new Vector(200, 172), vel: new Vector(-1.6, 0), width: 40, height: 8 },
            { pos: new Vector(440, 172), vel: new Vector(-1.6, 0), width: 40, height: 8 }
        ];
    }

    fireBlaster() {
        if (this.state !== STATE.PLAYING || !this.player) return;
        this.lasers.push({
            pos: new Vector(this.player.pos.x + this.player.width / 2, this.player.pos.y - 4),
            vel: new Vector(0, -6),
            r: 3,
            isEnemy: false
        });
        this.sound.playLaser();
    }

    triggerDamage() {
        this.lives--;
        this.updateIntegrityDisplay();
        this.sound.playHurt();
        this.createExplosion(this.player.pos.x + 7, this.player.pos.y + 12, '#ff007f', 15);
        
        if (this.lives <= 0) {
            this.gameOver();
        } else {
            // Respawn player
            this.spawnPlayer();
        }
    }

    gameOver() {
        this.state = STATE.GAME_OVER;
        this.pauseBtn.disabled = true;
        this.sound.playExplosion();
        
        if (this.score > this.highScore) {
            this.highScore = this.score;
            localStorage.setItem('kong_high', this.highScore);
            this.highScoreEl.textContent = String(this.highScore).padStart(6, '0');
        }

        this.overlayTitle.textContent = "GAME OVER";
        this.overlayTitle.className = "neon-pink";
        this.overlayMessage.innerHTML = `SCORE: ${String(this.score).padStart(6, '0')}<br>BLASTER LOCKOUT INITIATED`;
        this.startBtn.textContent = "TRY AGAIN";
        this.overlay.classList.add('active');
    }

    victory() {
        this.state = STATE.VICTORY;
        this.pauseBtn.disabled = true;
        this.sound.playFanfare();
        
        this.score += 5000 * this.level;
        this.scoreEl.textContent = String(this.score).padStart(6, '0');
        
        if (this.score > this.highScore) {
            this.highScore = this.score;
            localStorage.setItem('kong_high', this.highScore);
            this.highScoreEl.textContent = String(this.highScore).padStart(6, '0');
        }

        this.overlayTitle.textContent = "MAINFRAME CLEARED";
        this.overlayTitle.className = "neon-blue";
        this.overlayMessage.innerHTML = `LEVEL ${this.level} CLEARED!<br>BONUS +${5000 * this.level} POINTS`;
        this.startBtn.textContent = "NEXT LEVEL";
        this.overlay.classList.add('active');
        
        // Level progression increment
        this.level++;
        this.levelEl.textContent = this.level;
    }

    togglePause() {
        if (this.state === STATE.PLAYING) {
            this.state = STATE.PAUSED;
            this.pauseBtn.textContent = "▶ Resume";
            this.overlayTitle.textContent = "PAUSED";
            this.overlayTitle.className = "neon-yellow";
            this.overlayMessage.innerHTML = "PRESS P TO RESUME GRID CLIMB";
            this.startBtn.style.display = 'none';
            this.overlay.classList.add('active');
        } else if (this.state === STATE.PAUSED) {
            this.overlay.classList.remove('active');
            this.startBtn.style.display = 'inline-block';
            this.state = STATE.PLAYING;
            this.pauseBtn.textContent = "⏸ Pause";
            this.lastTime = (typeof performance !== 'undefined' && performance.now) ? performance.now() : Date.now();
            requestAnimationFrame((t) => this.gameLoop(t));
        }
    }

    gameLoop(currentTime) {
        if (this.state !== STATE.PLAYING) return;
        
        const t = currentTime || ((typeof performance !== 'undefined' && performance.now) ? performance.now() : Date.now());
        const dt = t - this.lastTime;
        this.lastTime = t;
        
        this.update(dt);
        this.draw();
        
        requestAnimationFrame((t) => this.gameLoop(t));
    }

    update(dt) {
        // 1. Update particles
        this.particles.forEach(p => p.update());
        this.particles = this.particles.filter(p => p.life > 0);

        // 2. Update player controls & physics
        this.updatePlayerPhysics(dt);

        // 3. Update invaders
        this.updateInvaders(dt);

        // 4. Update highway hovercars
        this.updateCars(dt);

        // 5. Update projectiles
        this.updateLasers(dt);

        // 6. Update Boss bricks
        this.updateBricks(dt);

        // 7. Check Victory conditions
        if (this.bossLife <= 0) {
            this.victory();
        }
    }

    updatePlayerPhysics(dt) {
        if (!this.player) return;
        const player = this.player;

        // Check if overlapping a ladder
        let overLadder = null;
        this.ladders.forEach(lad => {
            const feetY = player.pos.y + player.height;
            if (Math.abs(player.pos.x + player.width/2 - lad.x) < 14) {
                if (feetY >= lad.y1 && player.pos.y <= lad.y2) {
                    overLadder = lad;
                }
            }
        });

        // Vertical controls (climbing)
        if (overLadder) {
            if (this.keys['KeyW'] || this.keys['ArrowUp'] || this.keys['KeyS'] || this.keys['ArrowDown']) {
                player.isClimbing = true;
                player.isGrounded = false;
                player.vel.y = 0;
            }
        } else {
            player.isClimbing = false;
        }

        if (player.isClimbing) {
            if (this.keys['KeyW'] || this.keys['ArrowUp']) {
                player.pos.y -= 1.8;
            } else if (this.keys['KeyS'] || this.keys['ArrowDown']) {
                player.pos.y += 1.8;
            }
            
            // Align player X closely to ladder axis for precision climbing
            if (overLadder) {
                player.pos.x += (overLadder.x - (player.pos.x + player.width/2)) * 0.15;
            }

            // Snap off bottom of ladder
            if (overLadder && player.pos.y + player.height > overLadder.y2) {
                player.pos.y = overLadder.y2 - player.height;
                player.isClimbing = false;
                player.isGrounded = true;
            }
            // Snap off top of ladder
            if (overLadder && player.pos.y + player.height < overLadder.y1 + 4) {
                player.pos.y = overLadder.y1 - player.height;
                player.isClimbing = false;
                player.isGrounded = true;
            }
        } else {
            // Horizontal controls
            if (this.keys['KeyA'] || this.keys['ArrowLeft']) {
                player.pos.x -= 2.0;
                player.lastDirection = 'left';
            } else if (this.keys['KeyD'] || this.keys['ArrowRight']) {
                player.pos.x += 2.0;
                player.lastDirection = 'right';
            }

            // Apply gravity
            player.vel.y += this.gravity;
            player.pos.y += player.vel.y;
            player.isGrounded = false;

            // Platform collision checking
            this.platforms.forEach(plat => {
                const px = player.pos.x + player.width / 2;
                if (px >= plat.x1 && px <= plat.x2) {
                    // Check top-side landing
                    if (player.pos.y + player.height >= plat.y && 
                        player.pos.y + player.height - player.vel.y <= plat.y + 8) {
                        player.pos.y = plat.y - player.height;
                        player.vel.y = 0;
                        player.isGrounded = true;
                    }
                }
            });

            // Handle Frogger vehicle attachment (riding the hovercars)
            if (Math.abs(player.pos.y + player.height - 190) < 2) {
                let onCar = null;
                this.hovercars.forEach(car => {
                    if (player.pos.x + player.width > car.pos.x && player.pos.x < car.pos.x + car.width) {
                        onCar = car;
                    }
                });
                if (onCar) {
                    player.pos.x += onCar.vel.x;
                    player.isGrounded = true;
                    player.vel.y = 0;
                } else {
                    // Falls into road gaps!
                    if (player.pos.x + player.width/2 > 120 && player.pos.x + player.width/2 < 360) {
                        player.isGrounded = false;
                    }
                }
            }

            // Jump
            if ((this.keys['Space'] || this.keys['KeyJ']) && player.isGrounded) {
                player.vel.y = -6.4;
                player.isGrounded = false;
                this.sound.playJump();
            }
        }

        // Keep player in bounds
        if (player.pos.x < 0) player.pos.x = 0;
        if (player.pos.x + player.width > 480) player.pos.x = 480 - player.width;
        
        // Falling off screen bottom triggers damage
        if (player.pos.y > 600) {
            this.triggerDamage();
        }
    }

    updateInvaders(dt) {
        let hitEdge = false;
        this.invaders.forEach(ali => {
            ali.pos.x += ali.vel.x;
            
            // Periodically alternate animations
            if (Math.random() < 0.005) {
                ali.animFrame = 1 - ali.animFrame;
            }

            // Bounds check
            if (ali.pos.x < 10 || ali.pos.x + ali.width > 470) {
                hitEdge = true;
            }

            // Shoot lasers
            ali.shootCooldown -= 16.67;
            if (ali.shootCooldown <= 0) {
                ali.shootCooldown = Math.random() * 2500 + 1500;
                if (Math.random() < this.difficulty.fireRate * 12) {
                    this.lasers.push({
                        pos: new Vector(ali.pos.x + ali.width/2, ali.pos.y + ali.height),
                        vel: new Vector(0, 3.5),
                        r: 3,
                        isEnemy: true
                    });
                }
            }

            // Check collision with player
            if (this.player && 
                this.player.pos.x < ali.pos.x + ali.width &&
                this.player.pos.x + this.player.width > ali.pos.x &&
                this.player.pos.y < ali.pos.y + ali.height &&
                this.player.pos.y + this.player.height > ali.pos.y) {
                this.triggerDamage();
            }
        });

        // Swap directions on boundary hits
        if (hitEdge) {
            this.invaders.forEach(ali => {
                ali.vel.x = -ali.vel.x;
                ali.pos.x += ali.vel.x;
            });
        }
    }

    updateCars(dt) {
        this.hovercars.forEach(car => {
            car.pos.x += car.vel.x;
            // Loop back around on canvas edges
            if (car.vel.x > 0 && car.pos.x > 480) {
                car.pos.x = -car.width;
            } else if (car.vel.x < 0 && car.pos.x + car.width < 0) {
                car.pos.x = 480;
            }
        });
    }

    updateLasers(dt) {
        this.lasers.forEach(las => {
            las.pos = las.pos.add(las.vel);
        });

        // Remove out-of-bounds lasers
        this.lasers = this.lasers.filter(las => las.pos.y > 0 && las.pos.y < 600);

        // Check laser hits
        this.lasers.forEach((las, lasIdx) => {
            if (las.isEnemy) {
                // Hit player
                if (this.player &&
                    las.pos.x > this.player.pos.x &&
                    las.pos.x < this.player.pos.x + this.player.width &&
                    las.pos.y > this.player.pos.y &&
                    las.pos.y < this.player.pos.y + this.player.height) {
                    this.lasers.splice(lasIdx, 1);
                    this.triggerDamage();
                }
            } else {
                // Hit invaders
                this.invaders.forEach((ali, aliIdx) => {
                    if (las.pos.x > ali.pos.x &&
                        las.pos.x < ali.pos.x + ali.width &&
                        las.pos.y > ali.pos.y &&
                        las.pos.y < ali.pos.y + ali.height) {
                        
                        this.createExplosion(ali.pos.x + ali.width/2, ali.pos.y + ali.height/2, '#ff007f');
                        this.invaders.splice(aliIdx, 1);
                        this.lasers.splice(lasIdx, 1);
                        this.sound.playExplosion();
                        this.score += 200;
                        this.scoreEl.textContent = String(this.score).padStart(6, '0');
                    }
                });
            }
        });
    }

    updateBricks(dt) {
        // Spawning bricks by Kong
        const timeNow = (typeof performance !== 'undefined' && performance.now) ? performance.now() : Date.now();
        if (timeNow - this.lastBrickSpawn > this.difficulty.brickRate) {
            this.lastBrickSpawn = timeNow;
            this.bricks.push({
                pos: new Vector(this.kongPos.x + (Math.random() - 0.5) * 60, this.kongPos.y + 20),
                vel: new Vector((Math.random() - 0.5) * 1.5, 2.5),
                width: 20,
                height: 10,
                isDeflected: false
            });
            this.kongChestBeating = true;
            this.kongBeatTimer = 300;
        }

        if (this.kongChestBeating) {
            this.kongBeatTimer -= 16.67;
            if (this.kongBeatTimer <= 0) {
                this.kongChestBeating = false;
            }
        }

        this.bricks.forEach((brick, brkIdx) => {
            brick.pos = brick.pos.add(brick.vel);

            // Bounds check
            if (brick.pos.y > 600 || brick.pos.y < 0) {
                this.bricks.splice(brkIdx, 1);
                return;
            }

            // Hit player
            if (!brick.isDeflected && this.player &&
                this.player.pos.x < brick.pos.x + brick.width &&
                this.player.pos.x + this.player.width > brick.pos.x &&
                this.player.pos.y < brick.pos.y + brick.height &&
                this.player.pos.y + this.player.height > brick.pos.y) {
                
                this.bricks.splice(brkIdx, 1);
                this.triggerDamage();
            }

            // Hit Kong (deflected brick)
            if (brick.isDeflected &&
                brick.pos.x + brick.width > this.kongPos.x - 30 &&
                brick.pos.x < this.kongPos.x + 30 &&
                brick.pos.y < this.kongPos.y + 20 &&
                brick.pos.y + brick.height > this.kongPos.y - 20) {
                
                this.createExplosion(brick.pos.x + brick.width/2, brick.pos.y, '#00ff66', 20);
                this.bricks.splice(brkIdx, 1);
                this.sound.playExplosion();
                this.bossLife = Math.max(0, this.bossLife - 10);
                this.bossLifeEl.textContent = `${this.bossLife}%`;
                this.score += 500;
                this.scoreEl.textContent = String(this.score).padStart(6, '0');
            }

            // Check blaster laser deflection collisions
            this.lasers.forEach((las, lasIdx) => {
                if (!las.isEnemy && !brick.isDeflected &&
                    las.pos.x > brick.pos.x && las.pos.x < brick.pos.x + brick.width &&
                    las.pos.y > brick.pos.y && las.pos.y < brick.pos.y + brick.height) {
                    
                    // Deflect!
                    brick.isDeflected = true;
                    brick.vel.y = -5.0; // Shoot it back up
                    brick.vel.x = (brick.pos.x + brick.width/2 - las.pos.x) * 0.2; // Angle deflection
                    
                    this.lasers.splice(lasIdx, 1);
                    this.sound.playDeflect();
                    this.createExplosion(las.pos.x, las.pos.y, '#ffff00', 6);
                }
            });
        });
    }

    draw() {
        ctx.fillStyle = '#05050f';
        ctx.fillRect(0, 0, 480, 600);

        // 1. Draw platforms
        this.platforms.forEach(plat => {
            ctx.save();
            ctx.strokeStyle = '#00f3ff';
            ctx.lineWidth = 4;
            ctx.shadowColor = '#00f3ff';
            ctx.shadowBlur = 6;
            ctx.beginPath();
            ctx.moveTo(plat.x1, plat.y);
            ctx.lineTo(plat.x2, plat.y);
            ctx.stroke();
            ctx.restore();

            // Draw cyber highway dashes
            if (plat.y === 190 && plat.x1 === 0) {
                ctx.save();
                ctx.strokeStyle = 'rgba(0, 243, 255, 0.25)';
                ctx.lineWidth = 1;
                ctx.setLineDash([5, 5]);
                ctx.beginPath();
                ctx.moveTo(120, 182);
                ctx.lineTo(360, 182);
                ctx.moveTo(120, 172);
                ctx.lineTo(360, 172);
                ctx.stroke();
                ctx.restore();
            }
        });

        // 2. Draw ladders
        this.ladders.forEach(lad => {
            ctx.save();
            ctx.strokeStyle = '#00ff66';
            ctx.lineWidth = 2;
            ctx.shadowColor = '#00ff66';
            ctx.shadowBlur = 4;
            
            // Left & right rails
            ctx.beginPath();
            ctx.moveTo(lad.x - 8, lad.y1);
            ctx.lineTo(lad.x - 8, lad.y2);
            ctx.moveTo(lad.x + 8, lad.y1);
            ctx.lineTo(lad.x + 8, lad.y2);
            ctx.stroke();
            
            // Rungs
            ctx.lineWidth = 1.5;
            for (let ry = lad.y1 + 6; ry < lad.y2; ry += 10) {
                ctx.beginPath();
                ctx.moveTo(lad.x - 8, ry);
                ctx.lineTo(lad.x + 8, ry);
                ctx.stroke();
            }
            ctx.restore();
        });

        // 3. Draw hovercars
        this.hovercars.forEach(car => {
            ctx.save();
            ctx.fillStyle = '#ff007f';
            ctx.shadowColor = '#ff007f';
            ctx.shadowBlur = 8;
            ctx.beginPath();
            ctx.roundRect(car.pos.x, car.pos.y, car.width, car.height, 4);
            ctx.fill();
            
            // Windshield shine
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(car.pos.x + (car.vel.x > 0 ? 30 : 6), car.pos.y + 1, 8, 3);
            ctx.restore();
        });

        // 4. Draw invaders
        this.invaders.forEach(ali => {
            ctx.save();
            ctx.fillStyle = '#ff007f';
            ctx.shadowColor = '#ff007f';
            ctx.shadowBlur = 6;
            
            // Draw retro pixel invader
            ctx.beginPath();
            if (ali.animFrame === 0) {
                // Shape frame 0
                ctx.fillRect(ali.pos.x + 4, ali.pos.y, 8, 2);
                ctx.fillRect(ali.pos.x + 2, ali.pos.y + 2, 12, 2);
                ctx.fillRect(ali.pos.x, ali.pos.y + 4, 16, 2);
                ctx.fillRect(ali.pos.x, ali.pos.y + 6, 4, 2);
                ctx.fillRect(ali.pos.x + 6, ali.pos.y + 6, 4, 2);
                ctx.fillRect(ali.pos.x + 12, ali.pos.y + 6, 4, 2);
                ctx.fillRect(ali.pos.x + 2, ali.pos.y + 8, 12, 2);
                ctx.fillRect(ali.pos.x, ali.pos.y + 10, 2, 2);
                ctx.fillRect(ali.pos.x + 14, ali.pos.y + 10, 2, 2);
            } else {
                // Shape frame 1
                ctx.fillRect(ali.pos.x + 4, ali.pos.y, 8, 2);
                ctx.fillRect(ali.pos.x + 2, ali.pos.y + 2, 12, 2);
                ctx.fillRect(ali.pos.x, ali.pos.y + 4, 16, 2);
                ctx.fillRect(ali.pos.x + 2, ali.pos.y + 6, 12, 2);
                ctx.fillRect(ali.pos.x + 4, ali.pos.y + 8, 8, 2);
                ctx.fillRect(ali.pos.x + 2, ali.pos.y + 10, 2, 2);
                ctx.fillRect(ali.pos.x + 12, ali.pos.y + 10, 2, 2);
            }
            ctx.restore();
        });

        // 5. Draw lasers
        this.lasers.forEach(las => {
            ctx.save();
            ctx.fillStyle = las.isEnemy ? '#ff007f' : '#00ff66';
            ctx.shadowColor = las.isEnemy ? '#ff007f' : '#00ff66';
            ctx.shadowBlur = 6;
            ctx.beginPath();
            ctx.arc(las.pos.x, las.pos.y, las.r, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
        });

        // 6. Draw falling bricks
        this.bricks.forEach(brick => {
            ctx.save();
            ctx.fillStyle = brick.isDeflected ? '#00ff66' : '#ffff00';
            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = 1.5;
            ctx.shadowColor = brick.isDeflected ? '#00ff66' : '#ffff00';
            ctx.shadowBlur = 8;
            ctx.beginPath();
            ctx.roundRect(brick.pos.x, brick.pos.y, brick.width, brick.height, 2);
            ctx.fill();
            ctx.stroke();
            ctx.restore();
        });

        // 7. Draw Boss Neon Kong
        ctx.save();
        ctx.strokeStyle = '#ff005f';
        ctx.lineWidth = 3;
        ctx.shadowColor = '#ff005f';
        ctx.shadowBlur = 12;
        
        ctx.beginPath();
        // Head
        ctx.arc(this.kongPos.x, this.kongPos.y - 12, 10, 0, Math.PI * 2);
        // Chest & Shoulders
        ctx.moveTo(this.kongPos.x - 22, this.kongPos.y);
        ctx.lineTo(this.kongPos.x + 22, this.kongPos.y);
        ctx.lineTo(this.kongPos.x + 18, this.kongPos.y + 24);
        ctx.lineTo(this.kongPos.x - 18, this.kongPos.y + 24);
        ctx.closePath();
        ctx.stroke();

        // Arms (animate if throwing/beating chest)
        ctx.beginPath();
        if (this.kongChestBeating) {
            // Arms up/beat chest
            ctx.moveTo(this.kongPos.x - 22, this.kongPos.y + 2);
            ctx.lineTo(this.kongPos.x - 12, this.kongPos.y - 4);
            ctx.moveTo(this.kongPos.x + 22, this.kongPos.y + 2);
            ctx.lineTo(this.kongPos.x + 12, this.kongPos.y - 4);
        } else {
            // Arms down
            ctx.moveTo(this.kongPos.x - 22, this.kongPos.y + 2);
            ctx.lineTo(this.kongPos.x - 30, this.kongPos.y + 16);
            ctx.moveTo(this.kongPos.x + 22, this.kongPos.y + 2);
            ctx.lineTo(this.kongPos.x + 30, this.kongPos.y + 16);
        }
        ctx.stroke();
        ctx.restore();

        // 8. Draw Player
        if (this.player) {
            const player = this.player;
            ctx.save();
            ctx.fillStyle = '#00ff66';
            ctx.shadowColor = '#00ff66';
            ctx.shadowBlur = 8;
            
            // Helmet base
            ctx.beginPath();
            ctx.arc(player.pos.x + player.width/2, player.pos.y + 6, 6, 0, Math.PI * 2);
            ctx.fill();
            
            // Visor shine
            ctx.fillStyle = '#000000';
            ctx.fillRect(player.pos.x + (player.lastDirection === 'right' ? 6 : 2), player.pos.y + 3, 5, 3);
            
            // Torso/Jumpsuit
            ctx.fillStyle = '#00ff66';
            ctx.beginPath();
            ctx.roundRect(player.pos.x + 2, player.pos.y + 12, player.width - 4, 8, 2);
            ctx.fill();
            
            // Jetpack / blaster nozzle
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(player.pos.x + (player.lastDirection === 'right' ? -1 : 12), player.pos.y + 13, 3, 5);
            ctx.restore();
        }

        // 9. Draw particles
        this.particles.forEach(p => p.draw(ctx));
    }

    createExplosion(x, y, color, count = 12) {
        for (let i = 0; i < count; i++) {
            this.particles.push(new Particle(x, y, color));
        }
    }
}

// Initialise the game
window.addEventListener('DOMContentLoaded', () => {
    window.game = new Game();
});
