// Retro Pac-Man Arcade Game Logic
// Built using HTML5 Canvas & Web Audio API

// Map Layout:
// 1 = Wall
// 2 = Pac-Dot
// 3 = Power Pellet
// 4 = Ghost Gate (only ghosts can cross)
// 0 = Empty Space
// 5 = Ghost House Space
const TILE_SIZE = 16;
const COLS = 32;
const ROWS = 34;

const MAP = [
  [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1], // 0
  [1,3,2,2,2,2,2,2,2,2,2,2,2,2,2,1,1,2,2,2,2,2,2,2,2,2,2,2,2,2,3,1], // 1
  [1,2,1,1,1,1,2,1,1,1,1,1,1,1,2,1,1,2,1,1,1,1,1,1,1,2,1,1,1,1,2,1], // 2
  [1,2,1,1,1,1,2,1,1,1,1,1,1,1,2,1,1,2,1,1,1,1,1,1,1,2,1,1,1,1,2,1], // 3
  [1,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,1], // 4
  [1,2,1,1,1,1,2,1,1,2,1,1,1,1,1,1,1,1,1,1,1,1,2,1,1,2,1,1,1,1,2,1], // 5
  [1,2,1,1,1,1,2,1,1,2,1,1,1,1,1,1,1,1,1,1,1,1,2,1,1,2,1,1,1,1,2,1], // 6
  [1,2,2,2,2,2,2,1,1,2,2,2,2,2,2,1,1,2,2,2,2,2,2,1,1,2,2,2,2,2,2,1], // 7
  [1,1,1,1,1,1,2,1,1,1,1,1,1,1,0,1,1,0,1,1,1,1,1,1,1,2,1,1,1,1,1,1], // 8
  [0,0,0,0,0,1,2,1,1,1,1,1,1,1,0,1,1,0,1,1,1,1,1,1,1,2,1,0,0,0,0,0], // 9
  [0,0,0,0,0,1,2,1,1,0,0,0,0,0,0,0,0,0,0,0,0,0,1,1,2,1,0,0,0,0,0], // 10
  [0,0,0,0,0,1,2,1,1,0,1,1,1,1,1,0,0,1,1,1,1,1,0,1,1,2,1,0,0,0,0,0], // 11
  [0,0,0,0,0,0,2,0,0,0,1,1,1,1,1,4,4,1,1,1,1,1,0,0,0,2,0,0,0,0,0,0], // 12 - Warp Tunnel 1 & Gate
  [1,1,1,1,1,1,2,1,1,0,1,5,5,5,5,5,5,5,5,5,5,1,0,1,1,2,1,1,1,1,1,1], // 13
  [0,0,0,0,0,1,2,1,1,0,1,5,5,5,5,5,5,5,5,5,5,1,0,1,1,2,1,0,0,0,0,0], // 14
  [0,0,0,0,0,1,2,1,1,0,1,5,5,5,5,5,5,5,5,5,5,1,0,1,1,2,1,0,0,0,0,0], // 15
  [1,1,1,1,1,1,2,1,1,0,1,1,1,1,1,1,1,1,1,1,1,1,0,1,1,2,1,1,1,1,1,1], // 16
  [0,0,0,0,0,1,2,1,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,1,2,1,0,0,0,0,0], // 17
  [0,0,0,0,0,1,2,1,1,0,1,1,1,1,1,1,1,1,1,1,1,1,0,1,1,2,1,0,0,0,0,0], // 18
  [1,1,1,1,1,1,2,1,1,0,1,1,1,1,1,1,1,1,1,1,1,1,0,1,1,2,1,1,1,1,1,1], // 19
  [1,2,2,2,2,2,2,2,2,2,2,2,2,2,2,1,1,2,2,2,2,2,2,2,2,2,2,2,2,2,2,1], // 20
  [0,0,0,0,0,0,2,0,0,0,1,1,1,1,2,1,1,2,1,1,1,1,0,0,0,2,0,0,0,0,0,0], // 21 - Warp Tunnel 2
  [1,1,1,2,1,1,2,1,1,2,1,1,1,1,2,1,1,2,1,1,1,1,2,1,1,2,1,1,2,1,1,1], // 22
  [1,1,1,2,1,1,2,1,1,2,1,1,1,1,2,1,1,2,1,1,1,1,2,1,1,2,1,1,2,1,1,1], // 23
  [1,2,2,2,1,1,2,2,2,2,2,2,2,2,2,0,0,2,2,2,2,2,2,2,2,2,1,1,2,2,2,1], // 24
  [1,2,1,1,1,1,1,1,2,1,1,2,1,1,1,1,1,1,1,1,2,1,1,2,1,1,1,1,1,1,2,1], // 25
  [1,2,1,1,1,1,1,1,2,1,1,2,1,1,1,1,1,1,1,1,2,1,1,2,1,1,1,1,1,1,2,1], // 26
  [1,3,2,2,2,2,2,2,2,1,1,2,2,2,2,1,1,2,2,2,2,1,1,2,2,2,2,2,2,2,3,1], // 27
  [1,1,1,1,1,1,2,1,1,1,1,1,1,1,2,1,1,2,1,1,1,1,1,1,1,2,1,1,1,1,1,1], // 28
  [1,1,1,1,1,1,2,1,1,1,1,1,1,1,2,1,1,2,1,1,1,1,1,1,1,2,1,1,1,1,1,1], // 29
  [1,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,1], // 30
  [1,2,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,2,1], // 31
  [1,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,1], // 32
  [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1]  // 33
];

// Directions
const DIR_UP = { x: 0, y: -1, angle: Math.PI * 1.5 };
const DIR_DOWN = { x: 0, y: 1, angle: Math.PI * 0.5 };
const DIR_LEFT = { x: -1, y: 0, angle: Math.PI };
const DIR_RIGHT = { x: 1, y: 0, angle: 0 };

// Game State Enum
const STATE = {
    WAITING: 'WAITING',
    PLAYING: 'PLAYING',
    PAUSED: 'PAUSED',
    LEVEL_COMPLETE: 'LEVEL_COMPLETE',
    GAME_OVER: 'GAME_OVER',
    DYING: 'DYING'
};

// Web Audio API Synthesizer Sound System
class SoundEffects {
    constructor() {
        this.ctx = null;
        this.muted = false;
        this.sirenNode = null;
        this.sirenOsc = null;
        this.sirenGain = null;
    }

    init() {
        if (!this.ctx) {
            this.ctx = new (window.AudioContext || window.webkitAudioContext)();
        }
    }

    playChomp() {
        if (this.muted || !this.ctx) return;
        const now = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        
        osc.type = 'triangle';
        // Alternating chew sounds
        const high = Math.random() > 0.5;
        osc.frequency.setValueAtTime(high ? 450 : 250, now);
        osc.frequency.exponentialRampToValueAtTime(80, now + 0.08);
        
        gain.gain.setValueAtTime(0.12, now);
        gain.gain.linearRampToValueAtTime(0.01, now + 0.08);
        
        osc.start(now);
        osc.stop(now + 0.08);
    }

    playDeath() {
        if (this.muted || !this.ctx) return;
        const now = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(800, now);
        osc.frequency.exponentialRampToValueAtTime(40, now + 1.2);
        
        gain.gain.setValueAtTime(0.2, now);
        gain.gain.linearRampToValueAtTime(0.001, now + 1.2);
        
        osc.start(now);
        osc.stop(now + 1.2);
    }

    playEatGhost() {
        if (this.muted || !this.ctx) return;
        const now = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        
        osc.type = 'sine';
        osc.frequency.setValueAtTime(150, now);
        osc.frequency.linearRampToValueAtTime(900, now + 0.45);
        
        gain.gain.setValueAtTime(0.25, now);
        gain.gain.linearRampToValueAtTime(0.01, now + 0.45);
        
        osc.start(now);
        osc.stop(now + 0.45);
    }

    playPowerUp() {
        if (this.muted || !this.ctx) return;
        const now = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        
        osc.type = 'square';
        osc.frequency.setValueAtTime(220, now);
        osc.frequency.setValueAtTime(330, now + 0.08);
        osc.frequency.setValueAtTime(440, now + 0.16);
        osc.frequency.setValueAtTime(550, now + 0.24);
        
        gain.gain.setValueAtTime(0.1, now);
        gain.gain.linearRampToValueAtTime(0.01, now + 0.35);
        
        osc.start(now);
        osc.stop(now + 0.35);
    }

    playLevelComplete() {
        if (this.muted || !this.ctx) return;
        const now = this.ctx.currentTime;
        const notes = [523.25, 587.33, 659.25, 698.46, 783.99, 880.00, 987.77, 1046.50];
        
        notes.forEach((freq, idx) => {
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            osc.connect(gain);
            gain.connect(this.ctx.destination);
            
            osc.type = 'triangle';
            osc.frequency.setValueAtTime(freq, now + idx * 0.1);
            
            gain.gain.setValueAtTime(0.12, now + idx * 0.1);
            gain.gain.linearRampToValueAtTime(0.01, now + idx * 0.1 + 0.12);
            
            osc.start(now + idx * 0.1);
            osc.stop(now + idx * 0.1 + 0.12);
        });
    }

    startSiren() {
        if (this.muted || !this.ctx || this.sirenOsc) return;
        try {
            const now = this.ctx.currentTime;
            this.sirenOsc = this.ctx.createOscillator();
            this.sirenGain = this.ctx.createGain();
            
            this.sirenOsc.type = 'triangle';
            this.sirenOsc.frequency.setValueAtTime(250, now);
            
            this.sirenGain.gain.setValueAtTime(0.03, now);
            
            // Continuous low ambient siren oscillation
            const modulator = this.ctx.createOscillator();
            const modulatorGain = this.ctx.createGain();
            modulator.frequency.setValueAtTime(2, now); // 2Hz siren wave
            modulatorGain.gain.setValueAtTime(50, now); // sweep range
            
            modulator.connect(modulatorGain);
            modulatorGain.connect(this.sirenOsc.frequency);
            
            this.sirenOsc.connect(this.sirenGain);
            this.sirenGain.connect(this.ctx.destination);
            
            modulator.start(now);
            this.sirenOsc.start(now);
            
            this.sirenModulator = modulator;
        } catch (e) {
            console.error("Failed to start siren:", e);
        }
    }

    stopSiren() {
        if (this.sirenOsc) {
            try {
                this.sirenOsc.stop();
                this.sirenModulator.stop();
            } catch(e) {}
            this.sirenOsc = null;
            this.sirenGain = null;
            this.sirenModulator = null;
        }
    }
}

// Game Core Controller Class
class Game {
    constructor() {
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.sound = new SoundEffects();
        
        this.score = 0;
        this.highScore = parseInt(localStorage.getItem('pacman_high_score')) || 0;
        this.lives = 3;
        this.level = 1;
        this.gameState = STATE.WAITING;
        
        this.grid = [];
        this.pacman = null;
        this.ghosts = [];
        this.powerPelletTimer = 0;
        this.ghostsEatenMultiplier = 1;
        
        this.activeKeys = {};
        this.lastTime = 0;
        this.accumulatedTime = 0;
        
        // Floating point popup points array (for +200 visual scores)
        this.floatingPoints = [];
        
        this.supabase = null;
        this.currentUser = null;
        this.currentMode = 'login';
        
        this.setupDOM();
        this.setupInput();
        this.initHighscore();
        this.drawInitialScreen();
        this.initSupabase();
    }

    setupDOM() {
        this.overlay = document.getElementById('overlay');
        this.overlayTitle = document.getElementById('overlay-title');
        this.overlayMsg = document.getElementById('overlay-message');
        this.startBtn = document.getElementById('start-btn');
        this.scoreEl = document.getElementById('score');
        this.highScoreEl = document.getElementById('high-score');
        this.levelEl = document.getElementById('level');
        this.statusEl = document.getElementById('status-text');
        this.livesContainer = document.getElementById('lives-container');
        this.muteBtn = document.getElementById('mute-btn');
        this.pauseBtn = document.getElementById('pause-btn');

        this.startBtn.addEventListener('click', () => {
            this.sound.init();
            if (this.gameState === STATE.WAITING || this.gameState === STATE.GAME_OVER) {
                this.startGame();
            } else if (this.gameState === STATE.LEVEL_COMPLETE) {
                this.nextLevel();
            }
        });

        this.muteBtn.addEventListener('click', () => {
            this.sound.muted = !this.sound.muted;
            this.muteBtn.textContent = this.sound.muted ? "🔇 Unmute" : "🔊 Mute";
            if (this.sound.muted) {
                this.sound.stopSiren();
            } else if (this.gameState === STATE.PLAYING) {
                this.sound.startSiren();
            }
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
            // Ignore game controls keydown when typing in inputs/textareas
            if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
                return;
            }

            const keys = ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'KeyW', 'KeyA', 'KeyS', 'KeyD', 'Escape', 'Space'];
            if (keys.includes(e.code)) {
                e.preventDefault(); // Stop scrolling standard arrows
            }
            this.activeKeys[e.code] = true;
            
            if (this.gameState === STATE.PLAYING) {
                if (e.code === 'ArrowUp' || e.code === 'KeyW') this.pacman.queueDirection(DIR_UP);
                if (e.code === 'ArrowDown' || e.code === 'KeyS') this.pacman.queueDirection(DIR_DOWN);
                if (e.code === 'ArrowLeft' || e.code === 'KeyA') this.pacman.queueDirection(DIR_LEFT);
                if (e.code === 'ArrowRight' || e.code === 'KeyD') this.pacman.queueDirection(DIR_RIGHT);
                if (e.code === 'Escape' || e.code === 'Space') this.togglePause();
            }
        });

        window.addEventListener('keyup', (e) => {
            // Ignore game controls keyup when typing in inputs/textareas
            if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
                return;
            }
            this.activeKeys[e.code] = false;
        });
    }

    initHighscore() {
        this.highScoreEl.textContent = String(this.highScore).padStart(6, '0');
    }

    updateLivesDisplay() {
        this.livesContainer.innerHTML = '';
        for (let i = 0; i < this.lives; i++) {
            // Neon Yellow Pac-Man SVGs
            this.livesContainer.innerHTML += `
                <svg viewBox="0 0 20 20">
                    <path d="M10,0 A10,10 0 1,1 9.9,0 L10,10 Z" />
                </svg>
            `;
        }
    }

    drawInitialScreen() {
        // Draw standard blue walls and yellow dots on startup screen
        this.resetMap();
        this.drawMap();
        this.drawOverlayScreen("READY PLAYER ONE", "INSERT COIN TO START", "INSERT COIN");
    }

    drawOverlayScreen(title, msg, btnText) {
        this.overlayTitle.textContent = title;
        this.overlayMsg.textContent = msg;
        this.startBtn.textContent = btnText;
        this.overlay.classList.add('active');
    }

    startGame() {
        this.score = 0;
        this.lives = 3;
        this.level = 1;
        this.scoreEl.textContent = "000000";
        this.levelEl.textContent = "1";
        this.statusEl.textContent = "PLAYING";
        this.statusEl.className = "hud-value neon-green";
        this.overlay.classList.remove('active');
        this.pauseBtn.disabled = false;
        this.floatingPoints = [];

        this.sound.playPowerUp();
        
        this.resetMap();
        this.spawnEntities();
        this.updateLivesDisplay();
        
        this.gameState = STATE.PLAYING;
        this.lastTime = performance.now();
        this.sound.startSiren();
        
        requestAnimationFrame((t) => this.gameLoop(t));
    }

    nextLevel() {
        this.level++;
        this.levelEl.textContent = this.level;
        this.statusEl.textContent = "PLAYING";
        this.statusEl.className = "hud-value neon-green";
        this.overlay.classList.remove('active');
        this.pauseBtn.disabled = false;
        this.floatingPoints = [];

        this.sound.playPowerUp();
        this.resetMap();
        this.spawnEntities();
        
        this.gameState = STATE.PLAYING;
        this.lastTime = performance.now();
        this.sound.startSiren();
    }

    resetMap() {
        this.grid = MAP.map(row => [...row]);
    }

    spawnEntities() {
        // Pacman spawn at row 24, col 15.5
        this.pacman = new Pacman(15.5 * TILE_SIZE, 24.5 * TILE_SIZE);
        
        // Spawn 4 ghosts with level-scaled release delays
        const delayMultiplier = Math.max(0.2, 1 - (this.level - 1) * 0.25);
        this.ghosts = [
            new Ghost(15.5 * TILE_SIZE, 10.5 * TILE_SIZE, 'red', DIR_LEFT, { x: 31, y: 0 }),       // Blinky (starts outside)
            new Ghost(15.5 * TILE_SIZE, 14.5 * TILE_SIZE, 'pink', DIR_UP, { x: 0, y: 0 }, 1000 * delayMultiplier),    // Pinky
            new Ghost(11.5 * TILE_SIZE, 14.5 * TILE_SIZE, 'cyan', DIR_UP, { x: 31, y: 33 }, 3000 * delayMultiplier),  // Inky
            new Ghost(19.5 * TILE_SIZE, 14.5 * TILE_SIZE, 'orange', DIR_UP, { x: 0, y: 33 }, 6000 * delayMultiplier)  // Clyde
        ];
    }

    togglePause() {
        if (this.gameState === STATE.PLAYING) {
            this.gameState = STATE.PAUSED;
            this.pauseBtn.textContent = "▶ Resume";
            this.statusEl.textContent = "PAUSED";
            this.statusEl.className = "hud-value neon-pink";
            this.sound.stopSiren();
            this.drawOverlayScreen("PAUSED", "PRESS SPACE OR ESC TO RESUME", "RESUME GAME");
        } else if (this.gameState === STATE.PAUSED) {
            this.overlay.classList.remove('active');
            this.gameState = STATE.PLAYING;
            this.pauseBtn.textContent = "⏸ Pause";
            this.statusEl.textContent = "PLAYING";
            this.statusEl.className = "hud-value neon-green";
            this.sound.startSiren();
            this.lastTime = performance.now();
        }
    }

    handleDeath() {
        this.gameState = STATE.DYING;
        this.pauseBtn.disabled = true;
        this.sound.stopSiren();
        this.sound.playDeath();
        
        let deathFrame = 0;
        const deathLoop = () => {
            this.ctx.fillStyle = 'black';
            this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
            this.drawMap();
            
            // Draw ghosts but faded/hiding
            this.ghosts.forEach(g => {
                this.ctx.save();
                this.ctx.globalAlpha = Math.max(0, 1 - deathFrame/30);
                g.draw(this.ctx);
                this.ctx.restore();
            });

            // Pacman death animation
            deathFrame++;
            this.pacman.drawDeath(this.ctx, deathFrame);

            if (deathFrame < 45) {
                requestAnimationFrame(deathLoop);
            } else {
                this.lives--;
                this.updateLivesDisplay();
                if (this.lives > 0) {
                    this.respawnRound();
                } else {
                    this.gameOver();
                }
            }
        };
        requestAnimationFrame(deathLoop);
    }

    respawnRound() {
        this.pacman.reset(15.5 * TILE_SIZE, 24.5 * TILE_SIZE);
        
        // Reset ghosts to starting coordinates and delays
        const delayMultiplier = Math.max(0.2, 1 - (this.level - 1) * 0.25);
        this.ghosts[0].reset(15.5 * TILE_SIZE, 10.5 * TILE_SIZE, DIR_LEFT, 0);
        this.ghosts[1].reset(15.5 * TILE_SIZE, 14.5 * TILE_SIZE, DIR_UP, 1000 * delayMultiplier);
        this.ghosts[2].reset(11.5 * TILE_SIZE, 14.5 * TILE_SIZE, DIR_UP, 3000 * delayMultiplier);
        this.ghosts[3].reset(19.5 * TILE_SIZE, 14.5 * TILE_SIZE, DIR_UP, 6000 * delayMultiplier);
        
        this.gameState = STATE.PLAYING;
        this.pauseBtn.disabled = false;
        this.lastTime = performance.now();
        this.sound.startSiren();
        requestAnimationFrame((t) => this.gameLoop(t));
    }

    gameOver() {
        this.gameState = STATE.GAME_OVER;
        this.statusEl.textContent = "GAME OVER";
        this.statusEl.className = "hud-value neon-pink";
        this.sound.stopSiren();

        if (this.score > this.highScore) {
            this.highScore = this.score;
            localStorage.setItem('pacman_high_score', this.highScore);
            this.initHighscore();
        }

        this.submitScore();

        this.drawOverlayScreen("GAME OVER", `YOUR FINAL SCORE: ${this.score}`, "INSERT COIN");
    }

    checkWinCondition() {
        // Count remaining dots
        let dots = 0;
        for (let r = 0; r < ROWS; r++) {
            for (let c = 0; c < COLS; c++) {
                if (this.grid[r][c] === 2 || this.grid[r][c] === 3) {
                    dots++;
                }
            }
        }

        if (dots === 0) {
            this.gameState = STATE.LEVEL_COMPLETE;
            this.pauseBtn.disabled = true;
            this.sound.stopSiren();
            this.sound.playLevelComplete();

            // Symmetrical Level Finish Flashing Animation
            let flashCount = 0;
            const flashInterval = setInterval(() => {
                flashCount++;
                this.ctx.fillStyle = 'black';
                this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
                this.drawMap(flashCount % 2 === 0);
                this.pacman.draw(this.ctx);
                if (flashCount >= 8) {
                    clearInterval(flashInterval);
                    this.drawOverlayScreen("VICTORY!", "LEVEL COMPLETE", "NEXT ROUND");
                }
            }, 180);
        }
    }

    triggerPowerPellet() {
        const durations = [8000, 6000, 4000, 2000, 0];
        const duration = durations[Math.min(this.level - 1, durations.length - 1)];
        
        this.powerPelletTimer = duration;
        this.ghostsEatenMultiplier = 1;
        this.sound.playPowerUp();
        
        if (duration > 0) {
            this.ghosts.forEach(g => {
                g.becomeFrightened();
            });
        } else {
            // Level 5+: ghosts reverse direction immediately but do not turn blue/frightened
            this.ghosts.forEach(g => {
                g.dir = { x: -g.dir.x, y: -g.dir.y, angle: g.dir.angle + Math.PI };
            });
        }
    }

    addScore(points) {
        this.score += points;
        this.scoreEl.textContent = String(this.score).padStart(6, '0');
        if (this.score > this.highScore) {
            this.highScore = this.score;
            this.highScoreEl.textContent = String(this.highScore).padStart(6, '0');
        }
    }

    gameLoop(currentTime) {
        if (this.gameState !== STATE.PLAYING) return;

        let deltaTime = currentTime - this.lastTime;
        if (deltaTime > 100) deltaTime = 16.66; // protect against window tab blur resume jumps
        this.lastTime = currentTime;

        this.accumulatedTime += deltaTime;
        
        // Target fixed update rate of ~60 FPS (16.67ms per frame step)
        const frameStep = 16.67;
        while (this.accumulatedTime >= frameStep) {
            this.update(frameStep);
            this.accumulatedTime -= frameStep;
        }

        this.draw();
        requestAnimationFrame((t) => this.gameLoop(t));
    }

    update(dt) {
        // Update power pellet timer
        if (this.powerPelletTimer > 0) {
            this.powerPelletTimer -= dt;
            if (this.powerPelletTimer <= 0) {
                this.powerPelletTimer = 0;
                this.ghosts.forEach(g => g.exitFrightened());
            }
        }

        // Update Pac-man
        this.pacman.update(this.grid, this.sound, this);

        // Update Ghosts
        this.ghosts.forEach(ghost => {
            ghost.update(this.grid, this.pacman, dt);
            
            // Check Collisions
            const dist = Math.hypot(this.pacman.x - ghost.x, this.pacman.y - ghost.y);
            if (dist < 10) { // Collision threshold
                if (ghost.isFrightened) {
                    // Eat Ghost!
                    this.sound.playEatGhost();
                    ghost.becomeEaten();
                    
                    const scoreReward = 200 * this.ghostsEatenMultiplier;
                    this.addScore(scoreReward);
                    
                    // Add floating text popup
                    this.floatingPoints.push({
                        x: ghost.x,
                        y: ghost.y,
                        text: `+${scoreReward}`,
                        timer: 800
                    });

                    this.ghostsEatenMultiplier *= 2;
                } else if (!ghost.isEaten) {
                    // Pac-Man hit!
                    this.handleDeath();
                }
            }
        });

        // Update floaters
        this.floatingPoints.forEach(f => f.timer -= dt);
        this.floatingPoints = this.floatingPoints.filter(f => f.timer > 0);

        this.checkWinCondition();
    }

    draw() {
        this.ctx.fillStyle = 'black';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        // Draw Maze Walls and Dots
        this.drawMap();

        // Draw Entities
        this.pacman.draw(this.ctx);
        this.ghosts.forEach(g => g.draw(this.ctx));

        // Draw floating score tags
        this.floatingPoints.forEach(f => {
            this.ctx.fillStyle = '#00f3ff';
            this.ctx.font = '8px "Press Start 2P"';
            this.ctx.shadowColor = '#00f3ff';
            this.ctx.shadowBlur = 4;
            this.ctx.fillText(f.text, f.x - 12, f.y - 10);
            this.ctx.shadowBlur = 0; // reset
        });
    }

    drawMap(flashLevelComplete = false) {
        this.ctx.lineWidth = 2.5;
        const color = flashLevelComplete ? '#ffffff' : '#0033ff';
        const shadow = flashLevelComplete ? '#ffffff' : '#00f3ff';

        for (let r = 0; r < ROWS; r++) {
            for (let c = 0; c < COLS; c++) {
                const val = this.grid[r][c];
                const x = c * TILE_SIZE;
                const y = r * TILE_SIZE;

                if (val === 1) {
                    // Draw neon glowing walls
                    this.ctx.strokeStyle = color;
                    this.ctx.shadowColor = shadow;
                    this.ctx.shadowBlur = 6;
                    
                    // Determine if neighbor walls exist to join them nicely
                    const wUp = r > 0 && this.grid[r-1][c] === 1;
                    const wDown = r < ROWS-1 && this.grid[r+1][c] === 1;
                    const wLeft = c > 0 && this.grid[r][c-1] === 1;
                    const wRight = c < COLS-1 && this.grid[r][c+1] === 1;

                    this.ctx.beginPath();
                    this.ctx.rect(x + 3, y + 3, TILE_SIZE - 6, TILE_SIZE - 6);
                    this.ctx.stroke();
                    this.ctx.shadowBlur = 0; // reset
                } 
                else if (val === 2) {
                    // Pac-Dot
                    this.ctx.fillStyle = '#ffb8ae';
                    this.ctx.shadowColor = '#ffb8ae';
                    this.ctx.shadowBlur = 4;
                    this.ctx.beginPath();
                    this.ctx.arc(x + TILE_SIZE/2, y + TILE_SIZE/2, 2.5, 0, Math.PI * 2);
                    this.ctx.fill();
                    this.ctx.shadowBlur = 0;
                } 
                else if (val === 3) {
                    // Pulsing Power Pellet
                    const pulse = Math.sin(performance.now() / 100) * 1.5 + 4.5;
                    this.ctx.fillStyle = '#ffff00';
                    this.ctx.shadowColor = '#ffff00';
                    this.ctx.shadowBlur = pulse * 1.5;
                    this.ctx.beginPath();
                    this.ctx.arc(x + TILE_SIZE/2, y + TILE_SIZE/2, pulse, 0, Math.PI * 2);
                    this.ctx.fill();
                    this.ctx.shadowBlur = 0;
                }
                else if (val === 4) {
                    // Ghost gate
                    this.ctx.strokeStyle = '#ff00aa';
                    this.ctx.shadowColor = '#ff00aa';
                    this.ctx.shadowBlur = 4;
                    this.ctx.beginPath();
                    this.ctx.moveTo(x, y + TILE_SIZE/2);
                    this.ctx.lineTo(x + TILE_SIZE, y + TILE_SIZE/2);
                    this.ctx.stroke();
                    this.ctx.shadowBlur = 0;
                }
            }
        }
    }

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
                    // Prepend https:// if protocol is missing
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
        
        // Sanitize retrieved values
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
                .from('scores')
                .select('score')
                .eq('username', username)
                .order('score', { ascending: false })
                .limit(1);
            
            if (error) throw error;
            
            const pb = (data && data.length > 0) ? data[0].score : 0;
            document.getElementById('player-pb').textContent = String(pb).padStart(6, '0');
            
            if (pb > this.highScore) {
                this.highScore = pb;
                localStorage.setItem('pacman_high_score', pb);
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
                .from('scores')
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
            bodyEl.innerHTML = '<tr><td colspan="3" class="no-scores-text" style="color: var(--neon-red)">FAILED TO LOAD SCORES</td></tr>';
        }
    }

    async submitScore() {
        if (!this.supabase || !this.currentUser) return;
        const username = this.currentUser.user_metadata?.username;
        if (!username) return;
        
        try {
            const { error } = await this.supabase
                .from('scores')
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

// Pacman Entity Definition
class Pacman {
    constructor(x, y) {
        this.reset(x, y);
    }

    reset(x, y) {
        this.x = x;
        this.y = y;
        this.dir = DIR_LEFT;
        this.nextDir = DIR_LEFT;
        this.speed = 2; // Perfect integer step
        this.mouthAngle = 0.2;
        this.mouthOpening = true;
    }

    queueDirection(newDir) {
        this.nextDir = newDir;
    }

    update(grid, sound, game) {
        // Standard Grid Alignment check
        if ((this.x - TILE_SIZE/2) % TILE_SIZE === 0 && (this.y - TILE_SIZE/2) % TILE_SIZE === 0) {
            const gridX = Math.floor(this.x / TILE_SIZE);
            const gridY = Math.floor(this.y / TILE_SIZE);

            // Warp logic
            if (gridX === 0 && this.dir === DIR_LEFT) {
                this.x = (COLS - 1) * TILE_SIZE;
                return;
            } else if (gridX === COLS - 1 && this.dir === DIR_RIGHT) {
                this.x = 0;
                return;
            }

            // Check if we can apply the queued next direction
            if (this.canMove(gridX, gridY, this.nextDir, grid)) {
                this.dir = this.nextDir;
            }

            // If we hit a wall, stop
            if (!this.canMove(gridX, gridY, this.dir, grid)) {
                this.mouthAngle = 0.1; // reset mouth slightly open
                return;
            }
        }

        // Move player
        this.x += this.dir.x * this.speed;
        this.y += this.dir.y * this.speed;

        // Animate Mouth
        if (this.mouthOpening) {
            this.mouthAngle += 0.05;
            if (this.mouthAngle >= 0.45) this.mouthOpening = false;
        } else {
            this.mouthAngle -= 0.05;
            if (this.mouthAngle <= 0.05) this.mouthOpening = true;
        }

        // Check if we stepped into dots or power pellets
        const currentGridX = Math.floor(this.x / TILE_SIZE);
        const currentGridY = Math.floor(this.y / TILE_SIZE);
        
        // Safeguard inside walls
        if (currentGridY >= 0 && currentGridY < ROWS && currentGridX >= 0 && currentGridX < COLS) {
            const val = grid[currentGridY][currentGridX];
            if (val === 2) {
                // Eat Dot
                grid[currentGridY][currentGridX] = 0;
                game.addScore(10);
                sound.playChomp();
            } else if (val === 3) {
                // Eat Power Pellet
                grid[currentGridY][currentGridX] = 0;
                game.addScore(50);
                game.triggerPowerPellet();
            }
        }
    }

    canMove(gridX, gridY, direction, grid) {
        const nextX = gridX + direction.x;
        const nextY = gridY + direction.y;
        if (nextX < 0 || nextX >= COLS || nextY < 0 || nextY >= ROWS) return true; // tunnels warp
        
        const cell = grid[nextY][nextX];
        return cell !== 1 && cell !== 4; // cannot enter walls or gates
    }

    draw(ctx) {
        ctx.fillStyle = '#ffff00';
        ctx.shadowColor = '#ffff00';
        ctx.shadowBlur = 6;
        ctx.beginPath();
        
        const startMouth = this.dir.angle + this.mouthAngle * Math.PI;
        const endMouth = this.dir.angle + (2 - this.mouthAngle) * Math.PI;
        
        ctx.arc(this.x, this.y, 8, startMouth, endMouth);
        ctx.lineTo(this.x, this.y);
        ctx.fill();
        ctx.shadowBlur = 0;
    }

    drawDeath(ctx, frame) {
        ctx.fillStyle = '#ffff00';
        ctx.shadowColor = '#ffff00';
        ctx.shadowBlur = 8;
        ctx.beginPath();
        
        // Make mouth widen until it collapses into nothingness
        const fraction = frame / 45;
        const startMouth = this.dir.angle + fraction * Math.PI;
        const endMouth = this.dir.angle + (2 - fraction) * Math.PI;

        if (fraction < 1.0) {
            ctx.arc(this.x, this.y, 8 * (1 - fraction * 0.5), startMouth, endMouth);
            ctx.lineTo(this.x, this.y);
            ctx.fill();
        } else {
            // Draw particle burst
            ctx.strokeStyle = '#ffff00';
            ctx.beginPath();
            ctx.arc(this.x, this.y, (frame - 45) * 1.5, 0, Math.PI * 2);
            ctx.stroke();
        }
        ctx.shadowBlur = 0;
    }
}

// Ghost Entity Definition
class Ghost {
    constructor(x, y, color, startDir, scatterTile, startDelay = 0) {
        this.color = color;
        this.scatterTile = scatterTile;
        this.reset(x, y, startDir, startDelay);
    }

    reset(x, y, startDir, startDelay) {
        this.x = x;
        this.y = y;
        this.dir = startDir;
        this.speed = 2; // matching integer step
        this.startDelay = startDelay;
        
        this.isFrightened = false;
        this.isEaten = false;
        this.inHouse = this.y > 11 * TILE_SIZE; // inside home box initially
        this.exitProgress = 0;
        this.chaseTimer = 0;
    }

    becomeFrightened() {
        if (!this.isEaten) {
            this.isFrightened = true;
            this.speed = 1; // slow down in frightened mode
            // reverse direction immediately on entering frightened mode
            this.dir = { x: -this.dir.x, y: -this.dir.y, angle: this.dir.angle + Math.PI };
        }
    }

    exitFrightened() {
        this.isFrightened = false;
        if (!this.isEaten) {
            this.speed = 2;
        }
    }

    becomeEaten() {
        this.isFrightened = false;
        this.isEaten = true;
        this.speed = 4; // return extremely fast to base!
    }

    update(grid, pacman, dt) {
        // Handle initial delay inside ghost house
        if (this.startDelay > 0) {
            this.startDelay -= dt;
            // bounce up and down in home
            if (this.y <= 14 * TILE_SIZE) this.dir = DIR_DOWN;
            if (this.y >= 15 * TILE_SIZE) this.dir = DIR_UP;
            this.y += this.dir.y * 0.5;
            return;
        }

        // Handle exiting house sequence
        if (this.inHouse) {
            // Move horizontally to middle: col 15.5
            const homeCenterX = 15.5 * TILE_SIZE;
            if (Math.abs(this.x - homeCenterX) > 1) {
                this.dir = (this.x < homeCenterX) ? DIR_RIGHT : DIR_LEFT;
                this.x += this.dir.x * 1;
            } else {
                this.x = homeCenterX;
                // Move vertical to exit: row 11.5
                this.dir = DIR_UP;
                this.y += this.dir.y * 1;
                if (this.y <= 11.5 * TILE_SIZE) {
                    this.y = 11.5 * TILE_SIZE;
                    this.inHouse = false;
                }
            }
            return;
        }

        // Return Home sequence if eaten
        if (this.isEaten) {
            const homeTargetX = 15.5 * TILE_SIZE;
            const homeTargetY = 14.5 * TILE_SIZE;
            if (Math.hypot(this.x - homeTargetX, this.y - homeTargetY) < 4) {
                this.x = homeTargetX;
                this.y = homeTargetY;
                this.isEaten = false;
                this.inHouse = true;
                this.speed = 2;
                this.startDelay = 2000; // sit in house 2 seconds before returning to play
                return;
            }
        }

        // Blinky Speed Boost ("Cruise Elroy")
        if (this.color === 'red' && !this.isFrightened && !this.isEaten) {
            let dots = 0;
            for (let r = 0; r < ROWS; r++) {
                for (let c = 0; c < COLS; c++) {
                    if (grid[r][c] === 2 || grid[r][c] === 3) dots++;
                }
            }
            this.speed = (dots < 30) ? 4 : 2;
        }

        // Main Movement (Grid Alignment checks)
        if ((this.x - TILE_SIZE/2) % TILE_SIZE === 0 && (this.y - TILE_SIZE/2) % TILE_SIZE === 0) {
            const gridX = Math.floor(this.x / TILE_SIZE);
            const gridY = Math.floor(this.y / TILE_SIZE);

            // Warp logic
            if (gridX === 0 && this.dir === DIR_LEFT) {
                this.x = (COLS - 1) * TILE_SIZE;
                return;
            } else if (gridX === COLS - 1 && this.dir === DIR_RIGHT) {
                this.x = 0;
                return;
            }

            // Pathfinding decisions at intersections
            const targetTile = this.determineTargetTile(pacman, grid);
            const nextDirection = this.chooseNextDirection(gridX, gridY, targetTile, grid);
            if (nextDirection) {
                this.dir = nextDirection;
            }
        }

        // Advance ghost positions
        this.x += this.dir.x * this.speed;
        this.y += this.dir.y * this.speed;
    }

    determineTargetTile(pacman, grid) {
        if (this.isEaten) {
            return { x: 15, y: 12 }; // Ghost Gate coordinate
        }

        if (this.isFrightened) {
            // Target is irrelevant, random walks triggered below
            return { x: 0, y: 0 };
        }

        // Get dynamic level
        const currentLevel = window.gameEngine ? window.gameEngine.level : 1;

        // Target Scatter tiles vs Target Chase tiles dynamically based on level
        const scatterDurations = [7000, 5000, 2000, 1000, 0];
        const chaseDurations = [20000, 25000, 30000, 35000, 40000];
        
        const lvlIdx = Math.min(currentLevel - 1, scatterDurations.length - 1);
        const scatterPeriod = scatterDurations[lvlIdx];
        const chasePeriod = chaseDurations[lvlIdx];
        
        const cycleTime = performance.now() % (scatterPeriod + chasePeriod);
        const inScatterMode = cycleTime < scatterPeriod;

        if (inScatterMode) {
            return this.scatterTile;
        }

        // Chase Targets
        switch (this.color) {
            case 'red': // Blinky targets Pac-man directly
                return { x: Math.floor(pacman.x / TILE_SIZE), y: Math.floor(pacman.y / TILE_SIZE) };
            
            case 'pink': // Pinky targets 4 cells ahead
                return {
                    x: Math.floor(pacman.x / TILE_SIZE) + pacman.dir.x * 4,
                    y: Math.floor(pacman.y / TILE_SIZE) + pacman.dir.y * 4
                };
            
            case 'cyan': // Inky targets custom offset
                return {
                    x: Math.floor(pacman.x / TILE_SIZE) - pacman.dir.x * 2,
                    y: Math.floor(pacman.y / TILE_SIZE) - pacman.dir.y * 2
                };
            
            case 'orange': // Clyde chases if far, scatters if close
                const pacGridX = Math.floor(pacman.x / TILE_SIZE);
                const pacGridY = Math.floor(pacman.y / TILE_SIZE);
                const selfGridX = Math.floor(this.x / TILE_SIZE);
                const selfGridY = Math.floor(this.y / TILE_SIZE);
                const dist = Math.hypot(selfGridX - pacGridX, selfGridY - pacGridY);
                if (dist > 8) {
                    return { x: pacGridX, y: pacGridY };
                } else {
                    return this.scatterTile;
                }
        }
        return { x: 15, y: 11 };
    }

    chooseNextDirection(gridX, gridY, target, grid) {
        const directions = [DIR_UP, DIR_LEFT, DIR_DOWN, DIR_RIGHT];
        let bestDir = null;
        let minDistance = Infinity;

        // Frightened mode random choices
        if (this.isFrightened) {
            const validDirs = [];
            directions.forEach(d => {
                // Ensure we don't turn 180 degrees back immediately
                if (d.x === -this.dir.x && d.y === -this.dir.y) return;
                
                const nextX = gridX + d.x;
                const nextY = gridY + d.y;
                if (nextX >= 0 && nextX < COLS && nextY >= 0 && nextY < ROWS) {
                    const val = grid[nextY][nextX];
                    if (val !== 1 && val !== 4) {
                        validDirs.push(d);
                    }
                }
            });
            if (validDirs.length > 0) {
                return validDirs[Math.floor(Math.random() * validDirs.length)];
            }
            return null;
        }

        // Targeted pathfinding
        directions.forEach(d => {
            // Cannot reverse
            if (d.x === -this.dir.x && d.y === -this.dir.y) return;

            const nextX = gridX + d.x;
            const nextY = gridY + d.y;

            if (nextY >= 0 && nextY < ROWS && nextX >= 0 && nextX < COLS) {
                const cellVal = grid[nextY][nextX];
                
                // Red/Eaten ghosts can go through the gate. Regular ghosts can't enter wall/gate.
                const isGateCrossable = this.isEaten && cellVal === 4;
                if (cellVal !== 1 && (cellVal !== 4 || isGateCrossable)) {
                    // Distance formula to target tile
                    const dist = Math.hypot(nextX - target.x, nextY - target.y);
                    if (dist < minDistance) {
                        minDistance = dist;
                        bestDir = d;
                    }
                }
            }
        });

        return bestDir;
    }

    draw(ctx) {
        ctx.save();
        ctx.beginPath();
        
        // Define colors
        let bodyColor = '#000';
        let glowColor = '#000';
        
        if (this.isEaten) {
            // Just eyes returning home
            this.drawEyes(ctx);
            ctx.restore();
            return;
        }

        if (this.isFrightened) {
            // Check if flashing (last 2 seconds of power pellet)
            const remaining = window.gameEngine ? window.gameEngine.powerPelletTimer : 0;
            const flash = (remaining < 2500) && (Math.floor(remaining / 250) % 2 === 0);
            bodyColor = flash ? '#ffffff' : '#1c1cff';
            glowColor = flash ? '#ffffff' : '#3d3dff';
        } else {
            if (this.color === 'red') { bodyColor = '#ff003c'; glowColor = '#ff003c'; }
            if (this.color === 'pink') { bodyColor = '#ff00ea'; glowColor = '#ff00ea'; }
            if (this.color === 'cyan') { bodyColor = '#00f3ff'; glowColor = '#00f3ff'; }
            if (this.color === 'orange') { bodyColor = '#ff9900'; glowColor = '#ff9900'; }
        }

        ctx.fillStyle = bodyColor;
        ctx.shadowColor = glowColor;
        ctx.shadowBlur = 6;

        // Render Ghost Body (Round top head, wavy skirt footer)
        const radius = 8;
        const bottomY = this.y + 8;
        
        ctx.arc(this.x, this.y, radius, Math.PI, 0, false);
        
        // Wave pattern
        const w1 = Math.sin(performance.now() / 60) * 1.5;
        ctx.lineTo(this.x + 8, bottomY + w1);
        ctx.lineTo(this.x + 4, bottomY - 2 + w1);
        ctx.lineTo(this.x, bottomY + w1);
        ctx.lineTo(this.x - 4, bottomY - 2 + w1);
        ctx.lineTo(this.x - 8, bottomY + w1);
        
        ctx.closePath();
        ctx.fill();
        ctx.shadowBlur = 0; // reset

        // Draw eyes
        this.drawEyes(ctx);

        // Draw mouth for frightened ghosts
        if (this.isFrightened) {
            ctx.strokeStyle = '#ffb8ae';
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            // Frightened wiggle mouth
            ctx.moveTo(this.x - 4, this.y + 4);
            ctx.lineTo(this.x - 2, this.y + 2);
            ctx.lineTo(this.x, this.y + 4);
            ctx.lineTo(this.x + 2, this.y + 2);
            ctx.lineTo(this.x + 4, this.y + 4);
            ctx.stroke();
        }

        ctx.restore();
    }

    drawEyes(ctx) {
        const eyeOffset = 3.5;
        const dx = this.dir.x * 1.5;
        const dy = this.dir.y * 1.5;

        // Left Eye
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(this.x - eyeOffset, this.y - 1, 2.5, 0, Math.PI * 2);
        ctx.fill();
        
        ctx.fillStyle = this.isFrightened ? '#ffb8ae' : '#0022ff';
        ctx.beginPath();
        ctx.arc(this.x - eyeOffset + dx, this.y - 1 + dy, this.isFrightened ? 1 : 1.2, 0, Math.PI * 2);
        ctx.fill();

        // Right Eye
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(this.x + eyeOffset, this.y - 1, 2.5, 0, Math.PI * 2);
        ctx.fill();
        
        ctx.fillStyle = this.isFrightened ? '#ffb8ae' : '#0022ff';
        ctx.beginPath();
        ctx.arc(this.x + eyeOffset + dx, this.y - 1 + dy, this.isFrightened ? 1 : 1.2, 0, Math.PI * 2);
        ctx.fill();
    }
}

// Start game instance on load
window.addEventListener('DOMContentLoaded', () => {
    window.gameEngine = new Game();
});
