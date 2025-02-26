const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

canvas.width = 1250;
canvas.height = 640;

const PLATFORM_COUNT = 50;
const PLATFORM_SPACING = 400;
const INITIAL_PLATFORM_X = 800;
const WALL_HEIGHT_MIN = 150;
const WALL_HEIGHT_VARIANCE = 150;
const COIN_HEIGHT_MIN = 250;
const COIN_HEIGHT_VARIANCE = 150;

let player = {
    x: 200, // Fixed position on the canvas
    y: canvas.height - 60,
    width: 30,
    height: 30,
    dx: 0,
    dy: 0,
    gravity: 0.21111111, // Reduced gravity for a more floaty feel
    jumpPower: -12, // Increased jump power for a higher jump
    grounded: false,
    speed: 1.5, // Initial speed of the player 
    maxSpeed: 1.5, // Maximum speed the player can move
    sprintSpeed: 1.55, // Additional speed when Shift key is pressed
    acceleration: 0.05, // Acceleration rate
    friction: 0.9 // Friction rate
};

const initialPlayerX = player.x; // Store the initial starting position

// Remove obstacles array and only keep platforms
let platforms = [];
let coins = [];
let enemies = [];
let score = 0;
let gameOver = false;
let levelComplete = false;
let keys = {};
let environmentSpeed = 2;

// Add with other state variables
let isPaused = false;
const pauseMenuOptions = [
    { 
        text: 'Resume', 
        action: function() {
            isPaused = false;
            canvas.style.cursor = 'default';
            requestAnimationFrame(update); // Ensure game loop continues
        }
    },
    { 
        text: 'Restart Level', 
        action: function() {
            isPaused = false;
            canvas.style.cursor = 'default';
            restartGame();
        }
    },
    { 
        text: 'Return to Title', 
        action: function() {
            canvas.style.cursor = 'default';
            returnToTitle();
        }
    }
];
let selectedOption = 0;

// Add these as constants at the top of the file
const MENU_BUTTON_WIDTH = 120;
const MENU_BUTTON_HEIGHT = 30;
const MENU_BUTTON_PADDING = 25;
const MENU_START_Y = canvas.height / 2;
const MENU_SPACING = 40;

// Optimize the getMenuOptionPositions function
function getMenuOptionPositions() {
    // Cache the center position
    const centerX = canvas.width / 2 - MENU_BUTTON_WIDTH / 2;
    
    return pauseMenuOptions.map((_, index) => ({
        x: centerX,
        y: MENU_START_Y + (index * MENU_SPACING),
        width: MENU_BUTTON_WIDTH,
        height: MENU_BUTTON_HEIGHT
    }));
}

// Add mouse event listeners
canvas.addEventListener('mousemove', function(event) {
    if (!isPaused) {
        canvas.style.cursor = 'default';
        return;
    }
    
    const rect = canvas.getBoundingClientRect();
    mouseX = event.clientX - rect.left;
    mouseY = event.clientY - rect.top;
    
    const menuPositions = getMenuOptionPositions();
    const hoveredOption = menuPositions.findIndex(pos => 
        mouseX >= pos.x &&
        mouseX <= pos.x + pos.width &&
        mouseY >= pos.y - 25 &&
        mouseY <= pos.y + pos.height - 25
    );
    
    if (hoveredOption !== -1) {
        selectedOption = hoveredOption;
        canvas.style.cursor = 'pointer';
    } else {
        canvas.style.cursor = 'default';
    }
});

// Add mouseout event listener to reset cursor
canvas.addEventListener('mouseout', function() {
    canvas.style.cursor = 'default';
});

// Update click areas in the click event listener
canvas.addEventListener('click', function(event) {
    if (!isPaused) return;
    
    const rect = canvas.getBoundingClientRect();
    mouseX = event.clientX - rect.left;
    mouseY = event.clientY - rect.top;
    
    const menuPositions = getMenuOptionPositions();
    const clickedOption = menuPositions.findIndex(pos => 
        mouseX >= pos.x &&
        mouseX <= pos.x + pos.width &&
        mouseY >= pos.y - 25 &&
        mouseY <= pos.y + pos.height - 25
    );
    
    if (clickedOption !== -1) {
        pauseMenuOptions[clickedOption].action();
    }
});

// Load background image
const backgroundImage = new Image();
backgroundImage.src = 'assets/img/pbackg2.PNG';

let backgroundX = 0;

// Modify the wall generation logic
for (let i = 0; i < 50; i++) {
    let platformX = 800 + i * 400; // Start walls further away from player spawn
    let coinX = platformX + 50; // Position coins relative to walls

    // Create taller platforms that act as walls
    platforms.push({ 
        x: platformX, 
        y: canvas.height - (150 + Math.random() * 150), // Vary the height
        width: 60, // Make them thicker
        height: 200 + Math.random() * 100, // Make them taller
        passed: false // Keep track of passed platforms for scoring
    });
    
    // Adjust coin positions to be above the platforms
    coins.push({ 
        x: coinX, 
        y: canvas.height - (250 + Math.random() * 150),
        width: 20, 
        height: 20, 
        collected: false 
    });

    let enemyX = platformX + Math.random() * 200; // Random position near platforms

    // Create enemies
    enemies.push({
        x: enemyX,
        y: canvas.height - 30, // Start on ground
        width: 20,
        height: 20,
        dx: 0.5, // Movement speed
        dy: 0,
        gravity: 0.21111111, // Same gravity as player
        direction: 1, // 1 for right, -1 for left
        grounded: false,
        patrolDistance: 100, // How far they walk
        startX: enemyX, // Remember starting position for patrol
        jumpPower: -10 , // Lower jump power than player
        thinkTimer: 0, // Timer for making decisions
        thinkDelay: Math.random() * 60 + 30, // Random delay between decisions
        canJump: true
    });
}

// Add invisible wall at the beginning
platforms.unshift({
    x: 0,
    y: 0,
    width: 10,
    height: canvas.height,
    passed: true, // Don't count this wall for scoring
    invisible: true // Flag to not render this wall
});

// Define the finish line
let finishLine = {
    x: 400 + 50 * 300, // Position it after the last obstacle
    y: 0,
    width: 10,
    height: canvas.height
};

function update() {
    if (gameOver) {
        displayGameOver();
        return;
    }

    if (levelComplete) {
        displayLevelComplete();
        return;
    }

    if (isPaused) {
        displayPauseMenu();
        requestAnimationFrame(update); // Keep the game loop running while paused
        return;
    }

    // Clear the canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw background tiles
    let tileWidth = canvas.width;
    let tileHeight = canvas.height;
    let offsetX = backgroundX % tileWidth;

    ctx.drawImage(backgroundImage, offsetX, 0, tileWidth, tileHeight);
    ctx.drawImage(backgroundImage, offsetX - tileWidth, 0, tileWidth, tileHeight);
    ctx.drawImage(backgroundImage, offsetX + tileWidth, 0, tileWidth, tileHeight);

    // Update player
    player.dy += player.gravity;
    player.y += player.dy;

    if (player.y + player.height >= canvas.height) {
        player.y = canvas.height - player.height;
        player.dy = 0;
        player.grounded = true;
    } else {
        player.grounded = false;
    }

    // Handle horizontal movement
    let currentSpeed = player.speed;
    if (keys['ShiftLeft'] || keys['ShiftRight']) {
        currentSpeed += player.sprintSpeed;
    }

    if (keys['ArrowLeft']) {
        player.dx = Math.max(player.dx - player.acceleration, -currentSpeed);
    } else if (keys['ArrowRight']) {
        player.dx = Math.min(player.dx + player.acceleration, currentSpeed);
    } else {
        player.dx *= player.friction; // Apply friction when no key is pressed
    }

    player.x += player.dx;

    // Prevent the player from moving left beyond the start of the level
    if (backgroundX >= 0 && player.x < initialPlayerX) {
        player.x = initialPlayerX;
        player.dx = 0;
    } else if (player.x > canvas.width / 2) {
        player.x = canvas.width / 2;
        environmentSpeed = player.dx; // Maintain the player's speed
    } else if (player.x < canvas.width / 3) {
        player.x = canvas.width / 3;
        environmentSpeed = player.dx; // Maintain the player's speed
    } else {
        environmentSpeed = 0;
    }

    // Update background position
    backgroundX -= environmentSpeed;

    // Draw player as a black box
    ctx.fillStyle = 'black';
    ctx.fillRect(player.x, player.y, player.width, player.height);

    // Update and draw platforms (walls)
    for (let i = 0; i < platforms.length; i++) {
        let wall = platforms[i];
        wall.x -= environmentSpeed;

        // Only draw the wall if it's not invisible
        if (!wall.invisible) {
            // Draw the wall
            ctx.fillStyle = '#50C878';
            ctx.fillRect(wall.x, wall.y, wall.width, wall.height);
        }

        // Check if player has passed the wall
        if (!wall.passed && player.x > wall.x + wall.width) {
            wall.passed = true;
            if (!wall.invisible) { // Only count visible walls for score
                score += 1;
            }
        }

        // Check collision with walls (both visible and invisible)
        checkPlatformCollision(player, wall);
    }

    // Update and draw coins
    for (let i = 0; i < coins.length; i++) {
        let coin = coins[i];
        coin.x -= environmentSpeed;

        if (!coin.collected) {
            ctx.fillStyle = 'yellow';
            ctx.beginPath();
            ctx.arc(coin.x + coin.width / 2, coin.y + coin.height / 2, coin.width / 2, 0, Math.PI * 2);
            ctx.fill();
        }

        // Check if player collects the coin
        if (!coin.collected && checkCollision(player, coin)) {
            coin.collected = true;
            score += 5; // Increase score by 5 for each coin collected
        }
    }

    // Update and draw enemies
    for (let i = 0; i < enemies.length; i++) {
        let enemy = enemies[i];
        enemy.x -= environmentSpeed;
        
        // Apply gravity
        enemy.dy += enemy.gravity;
        enemy.y += enemy.dy;
        
        // AI behavior
        enemy.thinkTimer++;
        if (enemy.thinkTimer >= enemy.thinkDelay) {
            enemy.thinkTimer = 0;
            
            // Look ahead in current direction
            let lookAheadX = enemy.x + (enemy.direction * 50);
            let foundPlatform = false;
            let foundGap = true;
            
            // Check for platforms or gaps ahead
            for (let platform of platforms) {
                // Check for platform ahead
                if (lookAheadX >= platform.x && 
                    lookAheadX <= platform.x + platform.width &&
                    enemy.y + enemy.height >= platform.y &&
                    enemy.y <= platform.y + platform.height) {
                    foundPlatform = true;
                }
                
                // Check for ground beneath
                if (enemy.x >= platform.x && 
                    enemy.x <= platform.x + platform.width &&
                    enemy.y + enemy.height + 20 >= platform.y) {
                    foundGap = false;
                }
            }
            
            // Make decisions based on environment
            if (foundPlatform || foundGap) {
                enemy.direction *= -1; // Change direction if obstacle ahead or gap detected
            }
        }
        
        // Movement
        const previousX = enemy.x;
        enemy.x += enemy.dx * enemy.direction;
        
        // Check platform collisions for enemies
        let isColliding = false;
        enemy.grounded = false;
        
        for (let platform of platforms) {
            if (checkPlatformCollision(enemy, platform)) {
                isColliding = true;
                // If we hit a wall, revert movement and change direction
                if (enemy.x !== previousX) {
                    enemy.x = previousX;
                    enemy.direction *= -1;
                }
            }
        }
        
        // Ground collision
        if (enemy.y + enemy.height >= canvas.height) {
            enemy.y = canvas.height - enemy.height;
            enemy.dy = 0;
            enemy.grounded = true;
        }
        
        // Draw enemy
        ctx.fillStyle = '#FFA500';
        ctx.fillRect(enemy.x, enemy.y, enemy.width, enemy.height);
        
        // Check collision with player
        if (checkCollision(player, enemy)) {
            if (player.y + player.height < enemy.y + enemy.height/2 && player.dy > 0) {
                enemies.splice(i, 1);
                player.dy = player.jumpPower * 1.5;
                score += 10;
            } else {
                gameOver = true;
            }
        }
    }

    // Draw finish line
    finishLine.x -= environmentSpeed;
    ctx.fillStyle = 'red';
    ctx.fillRect(finishLine.x, finishLine.y, finishLine.width, finishLine.height);

    // Check if player crosses the finish line
    if (player.x > finishLine.x) {
        levelComplete = true;
    }

    // Display score
    ctx.fillStyle = 'black';
    ctx.font = '20px Arial';
    ctx.fillText('Score: ' + score, 10, 20);

    requestAnimationFrame(update);
}

function jump() {
    if (player.grounded) {
        player.dy = player.jumpPower;
    }
}

function checkCollision(rect1, rect2) {
    return rect1.x < rect2.x + rect2.width &&
           rect1.x + rect1.width > rect2.x &&
           rect1.y < rect2.y + rect2.height &&
           rect1.y + rect1.height > rect2.y;
}

function checkPlatformCollision(player, platform) {
    // Calculate the sides of both rectangles
    const playerLeft = player.x;
    const playerRight = player.x + player.width;
    const playerTop = player.y;
    const playerBottom = player.y + player.height;
    
    const platformLeft = platform.x;
    const platformRight = platform.x + platform.width;
    const platformTop = platform.y;
    const platformBottom = platform.y + platform.height;

    // Previous position (before collision)
    const prevPlayerBottom = playerBottom - player.dy;
    const prevPlayerRight = playerRight - player.dx;
    const prevPlayerLeft = playerLeft - player.dx;

    // Check if there's any collision at all
    if (playerRight > platformLeft && 
        playerLeft < platformRight && 
        playerBottom > platformTop && 
        playerTop < platformBottom) {

        // Calculate overlap from each side
        const fromTop = playerBottom - platformTop;
        const fromBottom = platformBottom - playerTop;
        const fromLeft = playerRight - platformLeft;
        const fromRight = platformRight - playerLeft;

        // Find the smallest overlap
        const minOverlap = Math.min(fromTop, fromBottom, fromLeft, fromRight);

        // Resolve collision based on the direction with smallest overlap
        if (minOverlap === fromTop && prevPlayerBottom <= platformTop) {
            // Collision from top
            player.y = platformTop - player.height;
            player.dy = 0;
            player.grounded = true;
            return true;
        } else if (minOverlap === fromBottom && player.dy < 0) {
            // Collision from bottom
            player.y = platformBottom;
            player.dy = 0;
            return true;
        } else if (minOverlap === fromLeft && prevPlayerRight <= platformLeft) {
            // Collision from left
            player.x = platformLeft - player.width;
            player.dx = 0;
            return true;
        } else if (minOverlap === fromRight && prevPlayerLeft >= platformRight) {
            // Collision from right
            player.x = platformRight;
            player.dx = 0;
            return true;
        }
    }
    return false;
}

function displayGameOver() {
    // Draw a semi-transparent rectangle over the entire canvas
    ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Display game over text
    ctx.fillStyle = 'red';
    ctx.font = '40px Arial';
    ctx.fillText('Game Over', canvas.width / 2 - 100, canvas.height / 2);
    ctx.font = '20px Arial';
    ctx.fillText('Score: ' + score, canvas.width / 2 - 50, canvas.height / 2 + 40);
    ctx.fillText('Press R to Restart', canvas.width / 2 - 70, canvas.height / 2 + 80);
}

function displayLevelComplete() {
    // Draw a semi-transparent rectangle over the entire canvas
    ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Display level complete text
    ctx.fillStyle = 'green';
    ctx.font = '40px Arial';
    ctx.fillText('Level Complete!', canvas.width / 2 - 120, canvas.height / 2);
    ctx.font = '20px Arial';
    ctx.fillText('Score: ' + score, canvas.width / 2 - 50, canvas.height / 2 + 40);
    ctx.fillText('Press R to Restart', canvas.width / 2 - 70, canvas.height / 2 + 80);
}

function restartGame() {
    // Reset player
    Object.assign(player, {
        x: 100,
        y: canvas.height - player.height,
        dx: 0,
        dy: 0,
        grounded: false
    });

    // Reset game state
    score = 0;
    gameOver = false;
    levelComplete = false;
    environmentSpeed = 3;
    backgroundX = 0;

    // Pre-allocate arrays
    platforms = new Array(PLATFORM_COUNT + 1); // +1 for invisible wall
    coins = new Array(PLATFORM_COUNT);
    enemies = new Array(PLATFORM_COUNT);

    // Add invisible wall first
    platforms[0] = {
        x: 0,
        y: 0,
        width: 100,
        height: canvas.height,
        passed: true,
        invisible: true
    };

    // Generate level elements
    for (let i = 0; i < PLATFORM_COUNT; i++) {
        const platformX = INITIAL_PLATFORM_X + i * PLATFORM_SPACING;
        
        platforms[i + 1] = { 
            x: platformX, 
            y: canvas.height - (WALL_HEIGHT_MIN + Math.random() * WALL_HEIGHT_VARIANCE),
            width: 60,
            height: 200 + Math.random() * 100,
            passed: false
        };
        
        coins[i] = { 
            x: platformX + 50, 
            y: canvas.height - (COIN_HEIGHT_MIN + Math.random() * COIN_HEIGHT_VARIANCE),
            width: 20, 
            height: 20, 
            collected: false 
        };

        enemies[i] = {
            x: platformX + Math.random() * 200,
            y: canvas.height - 30,
            width: 20,
            height: 20,
            dx: 0.5,
            dy: 0,
            gravity: 0.21111111,
            direction: 1,
            grounded: false,
            patrolDistance: 200,
            startX: platformX + Math.random() * 200,
            jumpPower: -8,
            thinkTimer: 0,
            thinkDelay: Math.random() * 60 + 30,
            canJump: true
        };
    }

    requestAnimationFrame(update);
}

function displayPauseMenu() {
    // Semi-transparent background (use a slightly more transparent background for better performance)
    ctx.fillStyle = 'rgba(0, 0, 0, 0)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Pause menu title
    ctx.fillStyle = 'white';
    ctx.font = '40px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('PAUSED', canvas.width / 2, canvas.height / 3);

    // Menu options
    ctx.font = '25px Arial';
    ctx.textAlign = 'left';
    
    // Cache menu positions
    const menuPositions = getMenuOptionPositions();
    
    // Draw menu options in a single loop
    pauseMenuOptions.forEach((option, index) => {
        const pos = menuPositions[index];
        
        // Draw button background
        ctx.fillStyle = index === selectedOption ? '#0056b3' : '#007BFF';
        ctx.fillRect(pos.x, pos.y - MENU_BUTTON_PADDING, MENU_BUTTON_WIDTH, MENU_BUTTON_HEIGHT);
        
        // Draw button border
        ctx.strokeStyle = 'white';
        ctx.lineWidth = 2;
        ctx.strokeRect(pos.x, pos.y - MENU_BUTTON_PADDING, MENU_BUTTON_WIDTH, MENU_BUTTON_HEIGHT);
        
        // Draw text
        ctx.fillStyle = 'white';
        ctx.fillText(option.text, pos.x + 10, pos.y);
    });

    // Only update cursor if mouse position has changed
    if (lastMouseX !== mouseX || lastMouseY !== mouseY) {
        const isOverButton = menuPositions.some(pos => 
            mouseX >= pos.x &&
            mouseX <= pos.x + MENU_BUTTON_WIDTH &&
            mouseY >= pos.y - MENU_BUTTON_PADDING &&
            mouseY <= pos.y + MENU_BUTTON_HEIGHT - MENU_BUTTON_PADDING
        );
        canvas.style.cursor = isOverButton ? 'pointer' : 'default';
        lastMouseX = mouseX;
        lastMouseY = mouseY;
    }
}

// Add variables to track last mouse position
let lastMouseX = 0;
let lastMouseY = 0;

// Optimize mouse move handler with throttling
let lastMoveTime = 0;
const MOVE_THROTTLE = 16; // About 60fps

canvas.addEventListener('mousemove', function(event) {
    const now = Date.now();
    if (now - lastMoveTime < MOVE_THROTTLE) return;
    lastMoveTime = now;

    if (!isPaused) {
        canvas.style.cursor = 'default';
        return;
    }
    
    const rect = canvas.getBoundingClientRect();
    mouseX = event.clientX - rect.left;
    mouseY = event.clientY - rect.top;
    
    const menuPositions = getMenuOptionPositions();
    const hoveredOption = menuPositions.findIndex(pos => 
        mouseX >= pos.x &&
        mouseX <= pos.x + MENU_BUTTON_WIDTH &&
        mouseY >= pos.y - MENU_BUTTON_PADDING &&
        mouseY <= pos.y + MENU_BUTTON_HEIGHT - MENU_BUTTON_PADDING
    );
    
    if (hoveredOption !== -1) {
        selectedOption = hoveredOption;
        canvas.style.cursor = 'pointer';
    } else {
        canvas.style.cursor = 'default';
    }
});

function returnToTitle() {
    isPaused = false;
    document.getElementById('titleScreen').style.display = 'flex';
    document.getElementById('gameCanvas').style.display = 'none';
    restartGame();
}

// Update the keydown event listener
document.addEventListener('keydown', function(event) {
    if (event.code === 'Escape') {
        if (isPaused) {
            // If already paused, resume the game (same as clicking Resume)
            isPaused = false;
            canvas.style.cursor = 'default';
            requestAnimationFrame(update);
        } else {
            // If not paused, pause the game
            isPaused = true;
        }
        return;
    }

    if (isPaused) {
        switch (event.code) {
            case 'ArrowUp':
                selectedOption = (selectedOption - 1 + pauseMenuOptions.length) % pauseMenuOptions.length;
                break;
            case 'ArrowDown':
                selectedOption = (selectedOption + 1) % pauseMenuOptions.length;
                break;
            case 'Enter':
            case 'Space':
                pauseMenuOptions[selectedOption].action();
                break;
        }
        return;
    }

    if (!gameOver && !levelComplete) {
        keys[event.code] = true;
        if (event.code === 'Space') {
            jump();
        }
        if (event.code === 'ArrowLeft') {
            player.dx = Math.max(player.dx - player.acceleration, -player.speed);
        } else if (event.code === 'ArrowRight') {
            player.dx = Math.min(player.dx + player.acceleration, player.speed);
        }
    } else if (event.code === 'KeyR') {
        restartGame();
    }
});

document.addEventListener('keyup', function(event) {
    keys[event.code] = false;
    if (event.code === 'ArrowLeft' || event.code === 'ArrowRight') {
        player.dx *= player.friction; // Apply friction when no key is pressed
    }
});

// Function to start the game
function startGame() {
    document.getElementById('titleScreen').style.display = 'none';
    document.getElementById('gameCanvas').style.display = 'block';
    restartGame();
}

// Update the start button event listener
document.getElementById('startButton').addEventListener('click', startGame);

// Add space bar listener for the title screen
document.addEventListener('keydown', function(event) {
    if (event.code === 'Space' && document.getElementById('titleScreen').style.display !== 'none') {
        startGame();
        event.preventDefault(); // Prevent space from scrolling the page
    }
});