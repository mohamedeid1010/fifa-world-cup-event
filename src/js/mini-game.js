
const canvas = document.getElementById('game-canvas');
const ctx = canvas.getContext('2d');
const pCanvas = document.getElementById('particle-canvas');
const pCtx = pCanvas.getContext('2d');
const scoreElement = document.getElementById('score');
const highScoreElement = document.getElementById('high-score');
const goalPopup = document.getElementById('goal-popup');
const resetBtn = document.getElementById('reset-btn');
const goalkeeper = document.getElementById('goalkeeper');
const gameContainer = document.getElementById('game-container');
const levelIndicator = document.getElementById('level-indicator');
const levelTarget = document.getElementById('level-target');
const nextLevelOverlay = document.getElementById('next-level-overlay');
const nextLevelBtn = document.getElementById('next-level-btn');
const goalPost = document.querySelector('.goal-post');

// Assets
const ballImg = new Image();
ballImg.src = '/src/assets/image/ball.png';

// Funny elements
const funnyGoalShouts = ["SIIIIIIU!", "MAGISTERIAL!", "WHAT A SCREAMER!", "GOOOOOOOOAL!", "TOP BINS!", "ABSOLUTE FILTH!", "HAVE THAT!"];
const gkQuotes = ["Nice try, human!", "I'm the GOAT!", "Not today!", "Too slow!", "Is that all you got?", "I'm literally a wall.", "My grandma shoots better!"];
const gkSpeech = document.createElement('div');
gkSpeech.className = 'gk-speech';
document.body.appendChild(gkSpeech);

let width, height;
let score = 0;
let highScore = localStorage.getItem('fifa-mini-game-high-score') || 0;
highScoreElement.innerText = highScore;
let isDragging = false;
let startX, startY;
let currentX, currentY;
let ballX, ballY, ballRadius = 22;
let ballVX = 0, ballVY = 0;
let friction = 0.985;
let ballInGoal = false;
let gkX = 0;
let gkDirection = 1;
let gkBaseSpeed = 4;
let trail = [];
let particles = [];
let shake = 0;

// Level system
let currentLevelIndex = 0;
let levelScore = 0;
const levels = [
    {
        goalsToPass: 3,
        gkSpeed: 3,
        goalWidth: 220,
        ballSpeedMult: 0.16,
        obstacles: []
    },
    {
        goalsToPass: 5,
        gkSpeed: 5,
        goalWidth: 190,
        ballSpeedMult: 0.18,
        obstacles: []
    },
    {
        goalsToPass: 5,
        gkSpeed: 7,
        goalWidth: 160,
        ballSpeedMult: 0.20,
        obstacles: [{ x: 0.5, y: 0.4, w: 60, h: 20 }]
    },
    {
        goalsToPass: 7,
        gkSpeed: 9,
        goalWidth: 140,
        ballSpeedMult: 0.22,
        obstacles: [{ x: 0.3, y: 0.5, w: 40, h: 40 }, { x: 0.7, y: 0.5, w: 40, h: 40 }]
    },
    {
        goalsToPass: 10,
        gkSpeed: 11,
        goalWidth: 120,
        ballSpeedMult: 0.25,
        obstacles: [{ x: 0.5, y: 0.3, w: 80, h: 20 }, { x: 0.2, y: 0.6, w: 40, h: 40 }, { x: 0.8, y: 0.6, w: 40, h: 40 }]
    }
];

function applyLevelSettings() {
    const level = levels[currentLevelIndex];
    gkBaseSpeed = level.gkSpeed;
    levelIndicator.innerText = `LEVEL ${currentLevelIndex + 1}`;
    levelTarget.innerText = level.goalsToPass;
    scoreElement.innerText = levelScore;
    
    // Update goal post visual
    goalPost.style.width = `${level.goalWidth}px`;
    
    // Reset ball
    resetBall();
}

function resize() {
    width = canvas.width = pCanvas.width = window.innerWidth;
    height = canvas.height = pCanvas.height = window.innerHeight;
    resetBall();
}

function resetBall() {
    ballX = width / 2;
    ballY = height - 90; // Lowered from 120
    ballVX = 0;
    ballVY = 0;
    ballInGoal = false;
    trail = [];
}

class Particle {
    constructor(x, y, color) {
        this.x = x;
        this.y = y;
        this.vx = (Math.random() - 0.5) * 15;
        this.vy = (Math.random() - 0.5) * 15 - 5;
        this.gravity = 0.2;
        this.color = color;
        this.alpha = 1;
        this.life = 100;
    }
    update() {
        this.vx *= 0.99;
        this.vy += this.gravity;
        this.x += this.vx;
        this.y += this.vy;
        this.life--;
        this.alpha = this.life / 100;
    }
    draw() {
        pCtx.globalAlpha = this.alpha;
        pCtx.fillStyle = this.color;
        pCtx.beginPath();
        pCtx.arc(this.x, this.y, 3, 0, Math.PI * 2);
        pCtx.fill();
    }
}

function createConfetti(x, y) {
    const colors = ['#fbbf24', '#f59e0b', '#ef4444', '#3b82f6', '#10b981'];
    for (let i = 0; i < 50; i++) {
        particles.push(new Particle(x, y, colors[Math.floor(Math.random() * colors.length)]));
    }
}

function update() {
    if (shake > 0) {
        const sx = (Math.random() - 0.5) * shake;
        const sy = (Math.random() - 0.5) * shake;
        gameContainer.style.transform = `translate(${sx}px, ${sy}px)`;
        shake *= 0.9;
        if (shake < 0.5) {
            shake = 0;
            gameContainer.style.transform = '';
        }
    }

    if (!isDragging) {
        ballX += ballVX;
        ballY += ballVY;
        ballVX *= friction;
        ballVY *= friction;

        if (Math.abs(ballVX) > 1 || Math.abs(ballVY) > 1) {
            trail.push({ x: ballX, y: ballY });
            if (trail.length > 15) trail.shift();
        } else {
            if (trail.length > 0) trail.shift();
        }

        if (Math.abs(ballVX) < 0.1) ballVX = 0;
        if (Math.abs(ballVY) < 0.1) ballVY = 0;
    }

    // Goalkeeper movement
    const level = levels[currentLevelIndex];
    const goalWidth = level.goalWidth;
    const goalLeft = (width / 2) - (goalWidth / 2);
    const goalRight = (width / 2) + (goalWidth / 2);

    gkX += gkBaseSpeed * gkDirection;
    if (gkX > goalRight - 20 || gkX < goalLeft + 20) {
        gkDirection *= -1;
    }
    goalkeeper.style.left = `${gkX}px`;

    // Obstacle collision
    level.obstacles.forEach(obs => {
        const obsX = obs.x * width - obs.w / 2;
        const obsY = obs.y * height - obs.h / 2;
        
        if (ballX + ballRadius > obsX && ballX - ballRadius < obsX + obs.w &&
            ballY + ballRadius > obsY && ballY - ballRadius < obsY + obs.h) {
            
            // Simple collision response
            if (Math.abs(ballX - (obsX + obs.w/2)) > Math.abs(ballY - (obsY + obs.h/2))) {
                ballVX *= -0.8;
                ballX = ballX < obsX + obs.w/2 ? obsX - ballRadius : obsX + obs.w + ballRadius;
            } else {
                ballVY *= -0.8;
                ballY = ballY < obsY + obs.h/2 ? obsY - ballRadius : obsY + obs.h + ballRadius;
            }
            shake = 3;
        }
    });

    // GK Speech positioning
    const gkRect = goalkeeper.getBoundingClientRect();
    gkSpeech.style.left = `${gkRect.left + 20}px`;
    gkSpeech.style.top = `${gkRect.top - 40}px`;

    // Boundary check
    if (ballX < ballRadius || ballX > width - ballRadius) {
        ballVX *= -0.7;
        ballX = ballX < ballRadius ? ballRadius : width - ballRadius;
    }

    if (ballY < ballRadius + 50) {
        const goalTop = 50;
        if (ballX > goalLeft && ballX < goalRight && ballY < goalTop + 80 && !ballInGoal) {
            if (ballX > gkRect.left - 10 && ballX < gkRect.right + 10 && ballY < gkRect.bottom + 10) {
                // SAVE!
                ballVY = Math.abs(ballVY) * 0.8 + 2;
                ballVX += (Math.random() - 0.5) * 25;
                playSound('https://assets.mixkit.co/active_storage/sfx/2625/2625-preview.mp3');
                shake = 5;
                showGKQuote();
            } else {
                // GOAL!
                levelScore++;
                score++;
                scoreElement.innerText = levelScore;
                if (score > highScore) {
                    highScore = score;
                    highScoreElement.innerText = highScore;
                    localStorage.setItem('fifa-mini-game-high-score', highScore);
                }
                showGoalPopup(funnyGoalShouts[Math.floor(Math.random() * funnyGoalShouts.length)]);
                createConfetti(ballX, ballY);
                ballInGoal = true;
                ballVY *= 0.2;
                shake = 15;
                playSound('https://assets.mixkit.co/active_storage/sfx/2013/2013-preview.mp3');
                
                if (levelScore >= level.goalsToPass) {
                    setTimeout(showLevelComplete, 1000);
                } else {
                    setTimeout(resetBall, 1500);
                }
            }
        } else {
            ballVY *= -0.8;
            ballY = ballRadius + 51;
        }
    }

    if (ballY > height - ballRadius) {
        ballVY *= -0.8;
        ballY = height - ballRadius;
    }

    for (let i = particles.length - 1; i >= 0; i--) {
        particles[i].update();
        if (particles[i].life <= 0) particles.splice(i, 1);
    }
}

function showGKQuote() {
    gkSpeech.innerText = gkQuotes[Math.floor(Math.random() * gkQuotes.length)];
    gkSpeech.classList.add('active');
    setTimeout(() => gkSpeech.classList.remove('active'), 2000);
}

function playSound(url) {
    try {
        const audio = new Audio(url);
        audio.volume = 0.4;
        audio.play();
    } catch (e) { }
}

function draw() {
    ctx.clearRect(0, 0, width, height);
    pCtx.clearRect(0, 0, width, height);

    if (trail.length > 2) {
        ctx.beginPath();
        ctx.moveTo(trail[0].x, trail[0].y);
        for (let i = 1; i < trail.length; i++) {
            ctx.lineTo(trail[i].x, trail[i].y);
        }
        ctx.strokeStyle = `rgba(255, 255, 255, 0.2)`;
        ctx.lineWidth = ballRadius * 0.7;
        ctx.lineCap = 'round';
        ctx.stroke();
    }

    if (isDragging) {
        ctx.beginPath();
        ctx.setLineDash([5, 5]);
        ctx.moveTo(ballX, ballY);
        const targetX = ballX + (startX - currentX) * 0.6;
        const targetY = ballY + (startY - currentY) * 0.6;
        ctx.lineTo(targetX, targetY);
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
        ctx.lineWidth = 2;
        ctx.stroke();
        ctx.setLineDash([]);
    }

    // Shadow
    ctx.beginPath();
    ctx.arc(ballX + 6, ballY + 6, ballRadius, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(0,0,0,0.15)';
    ctx.fill();

    // Ball Image
    ctx.save();
    ctx.translate(ballX, ballY);
    ctx.rotate(ballX * 0.02);

    // Clip to circle (shrunk slightly to remove white edge pixels from PNG)
    ctx.beginPath();
    ctx.arc(0, 0, ballRadius - 1, 0, Math.PI * 2);
    ctx.clip();

    if (ballImg.complete) {
        ctx.drawImage(ballImg, -ballRadius, -ballRadius, ballRadius * 2, ballRadius * 2);

        // Removed all highlights and shading as requested to eliminate white borders
    } else {
        ctx.beginPath();
        ctx.arc(0, 0, ballRadius, 0, Math.PI * 2);
        ctx.fillStyle = '#fff';
        ctx.fill();
    }

    ctx.restore();

    // Draw Obstacles
    const level = levels[currentLevelIndex];
    level.obstacles.forEach(obs => {
        const obsX = obs.x * width - obs.w / 2;
        const obsY = obs.y * height - obs.h / 2;
        
        // Shadow
        ctx.fillStyle = 'rgba(0,0,0,0.2)';
        ctx.fillRect(obsX + 4, obsY + 4, obs.w, obs.h);
        
        // Body (Training block style)
        ctx.fillStyle = '#f97316'; // Orange
        ctx.fillRect(obsX, obsY, obs.w, obs.h);
        
        // Stripes
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(obsX, obsY + obs.h * 0.3, obs.w, obs.h * 0.15);
        ctx.fillRect(obsX, obsY + obs.h * 0.7, obs.w, obs.h * 0.15);
        
        // Border
        ctx.strokeStyle = '#c2410c';
        ctx.lineWidth = 2;
        ctx.strokeRect(obsX, obsY, obs.w, obs.h);
    });

    particles.forEach(p => p.draw());
}

function loop() {
    update();
    draw();
    requestAnimationFrame(loop);
}

function showGoalPopup(text = "GOAL!!!") {
    goalPopup.innerText = text;
    goalPopup.classList.add('active');
    setTimeout(() => goalPopup.classList.remove('active'), 1200);
}

function showLevelComplete() {
    if (currentLevelIndex < levels.length - 1) {
        document.getElementById('next-level-title').innerText = "LEVEL COMPLETE!";
        document.getElementById('next-level-desc').innerText = `Amazing! You've passed Level ${currentLevelIndex + 1}.`;
        nextLevelBtn.innerText = "NEXT LEVEL";
    } else {
        document.getElementById('next-level-title').innerText = "ALL LEVELS CLEARED!";
        document.getElementById('next-level-desc').innerText = "You are a football legend!";
        nextLevelBtn.innerText = "PLAY AGAIN";
    }
    nextLevelOverlay.classList.add('active');
}

nextLevelBtn.addEventListener('click', () => {
    nextLevelOverlay.classList.remove('active');
    if (currentLevelIndex < levels.length - 1) {
        currentLevelIndex++;
    } else {
        currentLevelIndex = 0;
        score = 0;
    }
    levelScore = 0;
    applyLevelSettings();
});

function getPos(e) {
    const rect = canvas.getBoundingClientRect();
    const clientX = e.clientX || (e.touches && e.touches[0].clientX);
    const clientY = e.clientY || (e.touches && e.touches[0].clientY);
    return {
        x: clientX - rect.left,
        y: clientY - rect.top
    };
}

canvas.addEventListener('mousedown', (e) => {
    const pos = getPos(e);
    const dx = pos.x - ballX;
    const dy = pos.y - ballY;
    if (Math.sqrt(dx * dx + dy * dy) < ballRadius * 4) {
        isDragging = true;
        startX = pos.x;
        startY = pos.y;
        currentX = pos.x;
        currentY = pos.y;
    }
});

canvas.addEventListener('touchstart', (e) => {
    e.preventDefault();
    const pos = getPos(e);
    const dx = pos.x - ballX;
    const dy = pos.y - ballY;
    if (Math.sqrt(dx * dx + dy * dy) < ballRadius * 4) {
        isDragging = true;
        startX = pos.x;
        startY = pos.y;
        currentX = pos.x;
        currentY = pos.y;
    }
}, { passive: false });

window.addEventListener('mousemove', (e) => {
    if (!isDragging) return;
    const pos = getPos(e);
    currentX = pos.x;
    currentY = pos.y;
});

window.addEventListener('touchmove', (e) => {
    if (!isDragging) return;
    const pos = getPos(e);
    currentX = pos.x;
    currentY = pos.y;
});

window.addEventListener('mouseup', handleRelease);
window.addEventListener('touchend', handleRelease);

function handleRelease(e) {
    if (!isDragging) return;
    isDragging = false;

    const dx = startX - currentX;
    const dy = startY - currentY;

    const level = levels[currentLevelIndex];
    ballVX = dx * level.ballSpeedMult;
    ballVY = dy * level.ballSpeedMult;

    if (Math.abs(ballVY) < 2) {
        ballVX = 0;
        ballVY = 0;
    } else {
        playSound('https://assets.mixkit.co/active_storage/sfx/2624/2624-preview.mp3');
    }
}

resetBtn.addEventListener('click', () => {
    score = 0;
    levelScore = 0;
    currentLevelIndex = 0;
    applyLevelSettings();
});

window.addEventListener('resize', resize);

resize();
applyLevelSettings();
loop();
loop();
