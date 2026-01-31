// This file contains the JavaScript code that implements the game logic for the Pong game.

const canvas = document.getElementById('gameCanvas');
const context = canvas.getContext('2d');

// Game settings
const paddleWidth = 10;
const paddleHeight = 100;
const ballSize = 10;
let leftPaddleY = (canvas.height - paddleHeight) / 2;
let rightPaddleY = (canvas.height - paddleHeight) / 2;
let ballX = canvas.width / 2;
let ballY = canvas.height / 2;
let ballSpeedX = 5;
let ballSpeedY = 2;
let leftScore = 0;
let rightScore = 0;

// Control settings
const paddleSpeed = 30;

// Draw the paddles and ball
function draw() {
    context.clearRect(0, 0, canvas.width, canvas.height);
    
    // Draw left paddle
    context.fillStyle = 'white';
    context.fillRect(0, leftPaddleY, paddleWidth, paddleHeight);
    
    // Draw right paddle
    context.fillRect(canvas.width - paddleWidth, rightPaddleY, paddleWidth, paddleHeight);
    
    // Draw ball
    context.beginPath();
    context.arc(ballX, ballY, ballSize, 0, Math.PI * 2);
    context.fill();
    
    // Draw scores
    context.font = '20px Arial';
    context.fillText(leftScore, canvas.width / 4, 20);
    context.fillText(rightScore, (3 * canvas.width) / 4, 20);
}

// Update game state
function update() {
    ballX += ballSpeedX;
    ballY += ballSpeedY;

    // Ball collision with top and bottom walls
    if (ballY <= 0 || ballY >= canvas.height) {
        ballSpeedY = -ballSpeedY;
    }

    // Ball collision with paddles
    if (ballX <= paddleWidth && ballY > leftPaddleY && ballY < leftPaddleY + paddleHeight) {
        ballSpeedX = -ballSpeedX;
    }
    if (ballX >= canvas.width - paddleWidth && ballY > rightPaddleY && ballY < rightPaddleY + paddleHeight) {
        ballSpeedX = -ballSpeedX;
    }

    // Scoring
    if (ballX < 0) {
        rightScore++;
        resetBall();
    }
    if (ballX > canvas.width) {
        leftScore++;
        resetBall();
    }
}

// Reset ball position and speed
function resetBall() {
    ballX = canvas.width / 2;
    ballY = canvas.height / 2;
    ballSpeedX = -ballSpeedX;
}

// Handle user input
document.addEventListener('keydown', (event) => {
    // Prevent default arrow key scrolling
    if (event.key === 'ArrowUp' || event.key === 'ArrowDown') {
        event.preventDefault();
    }
    
    if (event.key === 'w' || event.key === 'W') {
        if (leftPaddleY > 0) {
            leftPaddleY -= paddleSpeed;
        }
    }
    if (event.key === 's' || event.key === 'S') {
        if (leftPaddleY < canvas.height - paddleHeight) {
            leftPaddleY += paddleSpeed;
        }
    }
    if (event.key === 'ArrowUp') {
        if (rightPaddleY > 0) {
            rightPaddleY -= paddleSpeed;
        }
    }
    if (event.key === 'ArrowDown') {
        if (rightPaddleY < canvas.height - paddleHeight) {
            rightPaddleY += paddleSpeed;
        }
    }
});

// Ensure canvas gets focus when clicked
canvas.addEventListener('click', () => {
    canvas.focus();
});

// Make canvas focusable
canvas.setAttribute('tabindex', '0');
canvas.focus();

// Game loop
function gameLoop() {
    draw();
    update();
    requestAnimationFrame(gameLoop);
}

// Start the game
gameLoop();