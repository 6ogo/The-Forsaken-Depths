// Title Scene (Welcome Screen)
class TitleScene extends Phaser.Scene {
    constructor() {
        super({ key: 'TitleScene' });
    }

    preload() {
        this.load.image('background', 'assets/background.png');
    }

    create() {
        this.add.image(400, 300, 'background').setScale(2);
        this.add.text(400, 100, 'The Forsaken Depths', { font: '48px Arial', fill: '#ffffff' }).setOrigin(0.5);
        this.add.text(400, 200, 'Dive into a world of mystery and danger.', { font: '20px Arial', fill: '#ffffff' }).setOrigin(0.5);
        this.add.text(400, 340, 'Controls: WASD to move, Arrow keys to shoot', { font: '18px Arial', fill: '#ffffff' }).setOrigin(0.5);

        const startButton = this.add.text(400, 450, 'Start Game', { font: '32px Arial', fill: '#00ff00' }).setOrigin(0.5);
        startButton.setInteractive();
        startButton.on('pointerdown', () => this.scene.start('MainGameScene'));
        startButton.on('pointerover', () => startButton.setStyle({ fill: '#ffffff' }));
        startButton.on('pointerout', () => startButton.setStyle({ fill: '#00ff00' }));
    }
}

// Main Game Scene (Actual Gameplay)
class MainGameScene extends Phaser.Scene {
    constructor() {
        super({ key: 'MainGameScene' });
        // World/level progression system
        this.currentWorld = 1;
        this.maxWorlds = 3;
        // Room tracking
        this.currentRoom = { x: 0, y: 0 };
        this.visitedRooms = {};
        this.roomMap = {};
        // Initialize coins variable
        this.coins = 0;
    }

    preload() {
        this.load.image('player', 'assets/player.png');
        this.load.image('projectile', 'assets/projectile.png');
        this.load.image('blob', 'assets/blob.png');
        this.load.image('boss', 'assets/boss.png');
        this.load.image('wall', 'assets/wall.png');
        this.load.image('door_closed', 'assets/door_closed.png');
        this.load.image('door_open', 'assets/door.png');
        this.load.image('boss_projectile', 'assets/boss_projectile.png');
        this.load.image('blob_projectile', 'assets/blob_projectile.png');
        this.load.image('gold_sparkles', 'assets/gold_sparkles_2.png');
        this.load.image('heart_full', 'assets/heart_full.png');
        this.load.image('heart_half', 'assets/heart_half.png');
        this.load.image('heart_empty', 'assets/heart_empty.png');
        this.load.image('wall1', 'assets/wall.png');
        this.load.image('wall2', 'assets/wall.png');
        this.load.image('wall3', 'assets/wall.png');
    }

    create() {
        // Define game boundaries - play area slightly smaller than full canvas
        this.playAreaX1 = 60;
        this.playAreaY1 = 60;
        this.playAreaX2 = 740;
        this.playAreaY2 = 540;
        
        // Setup gameplay area with borders
        this.walls = this.physics.add.staticGroup();
        this.innerWalls = this.physics.add.staticGroup();
        this.enemies = this.physics.add.group();
        this.enemyProjectiles = this.physics.add.group();
        this.doors = this.physics.add.group(); // Changed from staticGroup to regular group for better collision
        this.boss = null;
        this.isBossRoom = false;

        // Create game UI
        this.createUI();
        
        // Create the player
        this.player = this.physics.add.sprite(400, 300, 'player');
        this.player.health = 6;
        this.player.maxHealth = 6;
        this.player.lastDamageTime = 0;
        this.player.setDepth(10); // Ensure player is above other elements
        
        this.lastShootTime = 0;
        this.shootCooldown = 200;

        // Add projectiles group here
        this.projectiles = this.physics.add.group();

        // Set up overlap detection for projectiles and enemies
        this.physics.add.overlap(this.projectiles, this.enemies, (projectile, enemy) => {
            enemy.health -= 10; // Adjust damage value as needed
            if (enemy.health <= 0) {
                this.showCoinDrop(enemy.x, enemy.y);
                // Check if boss was killed
                if (enemy.type === 'boss') {
                    this.onBossDefeated();
                }
                enemy.destroy();
            }
            projectile.destroy();
        });
       
        // Set up movement keys (WASD)
        this.keyW = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.W);
        this.keyA = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.A);
        this.keyS = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.S);
        this.keyD = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.D);

        // Set up shooting keys (Arrow keys)
        this.keyLeft = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.LEFT);
        this.keyRight = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.RIGHT);
        this.keyUp = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.UP);
        this.keyDown = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.DOWN);

        this.roomActive = false;
        
        // Generate initial map for this world
        this.generateWorldMap();
        // Load the starting room
        this.loadRoom(this.currentRoom.x, this.currentRoom.y);

        this.physics.add.collider(this.player, this.enemies, (player, enemy) => this.takeDamage(player));
        this.physics.add.overlap(this.player, this.enemyProjectiles, (player, projectile) => {
            this.takeDamage(player);
            projectile.destroy();
        });

        this.input.on('pointerdown', (pointer) => {
            this.shootWithMouse(pointer);
        });
    }
    
    createUI() {
        // Create a UI container that stays on top
        this.uiContainer = this.add.container(0, 0);
        this.uiContainer.setDepth(100); // Ensure UI is always on top
        
        // Add hearts - moved inside the play area
        this.hearts = [];
        for (let i = 0; i < 3; i++) {
            const heart = this.add.image(100 + i * 48, 100, 'heart_full');
            this.hearts.push(heart);
            this.uiContainer.add(heart);
        }

        // Add other UI elements - moved inside the play area
        this.coinsText = this.add.text(100, 140, `Coins: ${this.coins}`, { fontSize: '28px', fill: '#fff' });
        
        // Move world text to bottom left
        this.worldText = this.add.text(100, 500, `World: ${this.currentWorld}`, { fontSize: '24px', fill: '#fff' });
        
        // Add texts to UI container
        this.uiContainer.add(this.coinsText);
        this.uiContainer.add(this.worldText);
    }

    update(time) {
        this.player.setVelocity(0);
        if (this.keyA.isDown) this.player.setVelocityX(-160);
        if (this.keyD.isDown) this.player.setVelocityX(160);
        if (this.keyW.isDown) this.player.setVelocityY(-160);
        if (this.keyS.isDown) this.player.setVelocityY(160);

        this.enemies.children.iterate(enemy => {
            if (enemy && enemy.active) {
                // Update enemy pathfinding AI
                this.updateEnemyMovement(enemy, time);
                
                if ((enemy.type === 'blob' || enemy.type === 'boss') && time > enemy.lastShootTime + enemy.shootCooldown) {
                    this.shootEnemyProjectile(enemy);
                    enemy.lastShootTime = time;
                }
            }
        });

        if (this.roomActive && this.enemies.countActive() === 0) {
            this.roomActive = false;
            // Open all doors when enemies are cleared
            this.doors.children.iterate(door => {
                door.setTexture('door_open');
                door.isOpen = true;
            });
        }
        
        // Check for arrow key shooting
        if (this.keyLeft.isDown) {
            this.shoot('left');
        } else if (this.keyRight.isDown) {
            this.shoot('right');
        } else if (this.keyUp.isDown) {
            this.shoot('up');
        } else if (this.keyDown.isDown) {
            this.shoot('down');
        }
    }
    
    updateEnemyMovement(enemy, time) {
        if (!enemy || !enemy.active || !this.player || !this.player.active) return;
        
        // Simple naive AI - don't move directly to player, but try to avoid walls
        // Calculate direction to player
        const dx = this.player.x - enemy.x;
        const dy = this.player.y - enemy.y;
        
        // Normalize direction
        const distance = Math.sqrt(dx * dx + dy * dy);
        const normalizedDx = dx / distance;
        const normalizedDy = dy / distance;
        
        // Set velocity based on direction
        let velocityX = normalizedDx * enemy.speed;
        let velocityY = normalizedDy * enemy.speed;
        
        // Apply velocity
        enemy.setVelocity(velocityX, velocityY);
        
        // Slow down enemies slightly to make game more fair
        if (time % 500 < 100) {
            enemy.setVelocity(0, 0);
        }
    }

    shoot(direction) {
        if (this.time.now > this.lastShootTime + this.shootCooldown) {
            const projectile = this.projectiles.create(this.player.x, this.player.y, 'projectile');
            switch (direction) {
                case 'left':
                    projectile.setVelocityX(-300);
                    break;
                case 'right':
                    projectile.setVelocityX(300);
                    break;
                case 'up':
                    projectile.setVelocityY(-300);
                    break;
                case 'down':
                    projectile.setVelocityY(300);
                    break;
            }
            this.lastShootTime = this.time.now;
        }
    }

    shootWithMouse(pointer) {
        if (this.time.now > this.lastShootTime + this.shootCooldown) {
            const projectile = this.projectiles.create(this.player.x, this.player.y, 'projectile');
            const angle = Phaser.Math.Angle.Between(this.player.x, this.player.y, pointer.x, pointer.y);
            const speed = 300;
            projectile.setVelocity(Math.cos(angle) * speed, Math.sin(angle) * speed);
            this.lastShootTime = this.time.now;
        }
    }

    generateWorldMap() {
        // Clear the existing map
        this.roomMap = {};
        this.visitedRooms = {};
        
        // Generate a random map with 5-8 rooms per world
        const numRooms = Phaser.Math.Between(5, 8);
        let roomsCreated = 0;
        
        // Start with a room at (0,0)
        this.roomMap['0,0'] = { 
            type: 'normal',
            visited: false,
            doors: {}
        };
        
        // Queue of rooms to process (ensure connected graph)
        let queue = [{x: 0, y: 0}];
        
        while (roomsCreated < numRooms && queue.length > 0) {
            // Get a random room from the queue
            const randomIndex = Math.floor(Math.random() * queue.length);
            const currentRoom = queue[randomIndex];
            queue.splice(randomIndex, 1);
            
            // Possible directions
            const directions = [
                {x: 0, y: -1, dir: 'up'},
                {x: 1, y: 0, dir: 'right'},
                {x: 0, y: 1, dir: 'down'},
                {x: -1, y: 0, dir: 'left'}
            ];
            
            // Shuffle directions
            Phaser.Utils.Array.Shuffle(directions);
            
            // Try to create doors in random directions
            for (const direction of directions) {
                const newRoomX = currentRoom.x + direction.x;
                const newRoomY = currentRoom.y + direction.y;
                const newRoomKey = `${newRoomX},${newRoomY}`;
                
                // If this room position doesn't exist yet
                if (!this.roomMap[newRoomKey] && roomsCreated < numRooms) {
                    // Create the new room
                    let roomType = 'normal';
                    if (roomsCreated === numRooms - 1) {
                        // Last room is the boss room
                        roomType = 'boss';
                    }
                    
                    this.roomMap[newRoomKey] = {
                        type: roomType,
                        visited: false,
                        doors: {}
                    };
                    
                    // Create doors between rooms
                    const oppositeDir = {
                        'up': 'down',
                        'right': 'left',
                        'down': 'up',
                        'left': 'right'
                    };
                    
                    // Add door to current room
                    this.roomMap[`${currentRoom.x},${currentRoom.y}`].doors[direction.dir] = newRoomKey;
                    
                    // Add door to new room
                    this.roomMap[newRoomKey].doors[oppositeDir[direction.dir]] = `${currentRoom.x},${currentRoom.y}`;
                    
                    // Add new room to queue
                    queue.push({x: newRoomX, y: newRoomY});
                    
                    roomsCreated++;
                }
                
                // If we've reached our target number of rooms, break
                if (roomsCreated >= numRooms) break;
            }
        }
        
        // Set the current room to the starting room
        this.currentRoom = {x: 0, y: 0};
        
        console.log("Generated map with " + roomsCreated + " rooms for world " + this.currentWorld);
        console.log("Map structure:", this.roomMap);
    }

    loadRoom(x, y) {
        // Clear existing room elements
        this.enemies.clear(true, true);
        this.enemyProjectiles.clear(true, true);
        this.innerWalls.clear(true, true);
        this.walls.clear(true, true);
        this.doors.clear(true, true);
        this.projectiles.clear(true, true);
        
        // Set the current room
        this.currentRoom = {x, y};
        const roomKey = `${x},${y}`;
        
        // Ensure roomKey exists in map
        if (!this.roomMap[roomKey]) {
            console.error("Tried to load nonexistent room:", roomKey);
            this.roomMap[roomKey] = { type: 'normal', visited: false, doors: {} };
        }
        
        // Mark room as visited
        this.roomMap[roomKey].visited = true;
        this.visitedRooms[roomKey] = true;
        
        // Check if this is a boss room
        this.isBossRoom = this.roomMap[roomKey].type === 'boss';
        
        // Create the outer walls (adjusted to create a visible border)
        this.walls.create(400, this.playAreaY1, `wall${this.currentWorld}`).setScale(25, 1).refreshBody();
        this.walls.create(400, this.playAreaY2, `wall${this.currentWorld}`).setScale(25, 1).refreshBody();
        this.walls.create(this.playAreaX1, 300, `wall${this.currentWorld}`).setScale(1, 19).refreshBody();
        this.walls.create(this.playAreaX2, 300, `wall${this.currentWorld}`).setScale(1, 19).refreshBody();
        
        // Add doors based on the room's connections
        const roomData = this.roomMap[roomKey];
        if (roomData) {
            if (roomData.doors.up) {
                const door = this.physics.add.sprite(400, this.playAreaY1, 'door_closed');
                door.direction = 'up';
                door.targetRoom = roomData.doors.up;
                door.isOpen = !this.roomActive;
                door.setOrigin(0.5, 0);
                door.setInteractive();
                this.doors.add(door);
                
                // Add collider to prevent going through closed doors
                const doorCollider = this.physics.add.collider(this.player, door, null, () => {
                    // Only allow collision if door is closed
                    return !door.isOpen;
                }, this);
                door.doorCollider = doorCollider;
            }
            
            if (roomData.doors.down) {
                const door = this.physics.add.sprite(400, this.playAreaY2, 'door_closed');
                door.direction = 'down';
                door.targetRoom = roomData.doors.down;
                door.isOpen = !this.roomActive;
                door.setOrigin(0.5, 1);
                door.setInteractive();
                this.doors.add(door);
                
                // Add collider to prevent going through closed doors
                const doorCollider = this.physics.add.collider(this.player, door, null, () => {
                    // Only allow collision if door is closed
                    return !door.isOpen;
                }, this);
                door.doorCollider = doorCollider;
            }
            
            if (roomData.doors.left) {
                const door = this.physics.add.sprite(this.playAreaX1, 300, 'door_closed');
                door.direction = 'left';
                door.targetRoom = roomData.doors.left;
                door.isOpen = !this.roomActive;
                door.setOrigin(0, 0.5);
                door.setInteractive();
                this.doors.add(door);
                
                // Add collider to prevent going through closed doors
                const doorCollider = this.physics.add.collider(this.player, door, null, () => {
                    // Only allow collision if door is closed
                    return !door.isOpen;
                }, this);
                door.doorCollider = doorCollider;
            }
            
            if (roomData.doors.right) {
                const door = this.physics.add.sprite(this.playAreaX2, 300, 'door_closed');
                door.direction = 'right';
                door.targetRoom = roomData.doors.right;
                door.isOpen = !this.roomActive;
                door.setOrigin(1, 0.5);
                door.setInteractive();
                this.doors.add(door);
                
                // Add collider to prevent going through closed doors
                const doorCollider = this.physics.add.collider(this.player, door, null, () => {
                    // Only allow collision if door is closed
                    return !door.isOpen;
                }, this);
                door.doorCollider = doorCollider;
            }
        }
        
        // Add enemies based on room type
        if (this.isBossRoom) {
            // Add a powerful boss in boss rooms
            this.boss = this.createEnemy('boss', 400, 300);
            this.boss.health = 100 * this.currentWorld; // Scale boss health with world
            this.boss.setScale(1.5); // Make the boss bigger
            this.enemies.add(this.boss);
        } else {
            // Add random enemies in normal rooms
            const enemyCount = Phaser.Math.Between(2, 4 + this.currentWorld);
            for (let i = 0; i < enemyCount; i++) {
                const x = Phaser.Math.Between(this.playAreaX1 + 50, this.playAreaX2 - 50);
                const y = Phaser.Math.Between(this.playAreaY1 + 50, this.playAreaY2 - 50);
                this.enemies.add(this.createEnemy('blob', x, y));
            }
        }
        
        // Add random inner walls
        const wallCount = Phaser.Math.Between(3, 7);
        for (let i = 0; i < wallCount; i++) {
            const x = Phaser.Math.Between(this.playAreaX1 + 50, this.playAreaX2 - 50);
            const y = Phaser.Math.Between(this.playAreaY1 + 50, this.playAreaY2 - 50);
            const rotation = Phaser.Math.Between(0, 1) ? 0 : Math.PI / 2; // Horizontal or vertical
            const wall = this.innerWalls.create(x, y, `wall${this.currentWorld}`);
            wall.rotation = rotation;
            wall.setScale(Phaser.Math.Between(1, 3), 1).refreshBody();
        }
        
        // Set up room collisions
        this.physics.add.collider(this.player, this.walls);
        this.physics.add.collider(this.player, this.innerWalls);
        this.physics.add.collider(this.enemies, this.innerWalls);
        this.physics.add.collider(this.enemies, this.walls);
        this.physics.add.collider(this.projectiles, this.innerWalls, (projectile) => projectile.destroy());
        this.physics.add.collider(this.projectiles, this.walls, (projectile) => projectile.destroy());
        
        // Door overlap detection - improved
        this.physics.add.overlap(this.player, this.doors, (player, door) => {
            // Only process if door is open
            if (!door.isOpen) return;
            
            // Get target room coordinates
            if (!door.targetRoom) {
                console.error("Door has no target room");
                return;
            }
            
            const [targetX, targetY] = door.targetRoom.split(',').map(Number);
            console.log(`Moving from ${x},${y} to ${targetX},${targetY} via ${door.direction} door`);
            
            // Move to new room
            this.transitionToRoom(targetX, targetY, door.direction);
        });
        
        // Set room as active (doors locked until enemies are cleared)
        this.roomActive = this.enemies.countActive() > 0;
        
        // Update doors appearance based on room state
        this.doors.children.iterate(door => {
            door.setTexture(this.roomActive ? 'door_closed' : 'door_open');
        });
    }

    transitionToRoom(x, y, fromDirection) {
        // Set player position based on entry direction
        let playerX = 400;
        let playerY = 300;
        
        // Position player on opposite side of the door they entered
        const oppositeDirection = {
            'up': 'down',
            'down': 'up',
            'left': 'right',
            'right': 'left'
        };
        
        switch (oppositeDirection[fromDirection]) {
            case 'up':
                playerX = 400;
                playerY = this.playAreaY1 + 50; // Closer to top
                break;
            case 'down':
                playerX = 400;
                playerY = this.playAreaY2 - 50; // Closer to bottom
                break;
            case 'left':
                playerX = this.playAreaX1 + 50; // Closer to left
                playerY = 300;
                break;
            case 'right':
                playerX = this.playAreaX2 - 50; // Closer to right
                playerY = 300;
                break;
        }
        
        // Load the new room
        this.loadRoom(x, y);
        
        // Position the player
        this.player.x = playerX;
        this.player.y = playerY;
    }

    createEnemy(type, x, y) {
        const enemy = this.physics.add.sprite(x, y, type);
        enemy.type = type;
        enemy.health = type === 'boss' ? 50 * this.currentWorld : 20 * this.currentWorld;
        enemy.speed = type === 'boss' ? 80 : 50;
        enemy.shootCooldown = type === 'boss' ? 1000 : 2000;
        enemy.lastShootTime = 0;
        enemy.setCollideWorldBounds(true); // Keep enemies inside the game area
        return enemy;
    }

    shootEnemyProjectile(enemy) {
        const texture = enemy.type === 'boss' ? 'boss_projectile' : 'blob_projectile';
        const projectile = this.physics.add.sprite(enemy.x, enemy.y, texture);
        this.enemyProjectiles.add(projectile);
        
        // Boss shoots multiple projectiles in different directions
        if (enemy.type === 'boss') {
            if (this.currentWorld >= 2) {
                // Multiple projectiles for higher worlds
                const angles = [0, Math.PI/4, Math.PI/2, 3*Math.PI/4, Math.PI, 5*Math.PI/4, 3*Math.PI/2, 7*Math.PI/4];
                const projCount = this.currentWorld === 2 ? 4 : 8; // 4 for world 2, 8 for world 3
                
                for (let i = 0; i < projCount; i++) {
                    const angle = angles[i];
                    const speed = 200;
                    const proj = this.enemyProjectiles.create(enemy.x, enemy.y, texture);
                    proj.setVelocity(Math.cos(angle) * speed, Math.sin(angle) * speed);
                }
                
                // Normal homing projectile
                this.physics.moveToObject(projectile, this.player, 200);
            } else {
                // Just one homing projectile for world 1
                this.physics.moveToObject(projectile, this.player, 200);
            }
        } else {
            // Regular enemies just shoot at player
            this.physics.moveToObject(projectile, this.player, 200);
        }
        
        this.physics.add.collider(projectile, this.walls, () => projectile.destroy());
        this.physics.add.collider(projectile, this.innerWalls, () => projectile.destroy());
    }

    takeDamage(player) {
        if (this.time.now > player.lastDamageTime + 500) {
            player.health -= 1;
            player.lastDamageTime = this.time.now;
            this.updateHearts();
            if (player.health <= 0) {
                this.scene.start('GameOverScene');
            }
        }
    }

    updateHearts() {
        const fullHearts = Math.floor(this.player.health / 2);
        const halfHeart = this.player.health % 2 === 1;
        for (let i = 0; i < 3; i++) {
            if (i < fullHearts) this.hearts[i].setTexture('heart_full');
            else if (i === fullHearts && halfHeart) this.hearts[i].setTexture('heart_half');
            else this.hearts[i].setTexture('heart_empty');
        }
    }

    showCoinDrop(x, y) {
        const sparkle = this.add.sprite(x, y, 'gold_sparkles');
        sparkle.setDepth(5); // Above floor, below player
        this.time.delayedCall(500, () => sparkle.destroy());
        
        // Update coins counter
        this.coins++;
        this.coinsText.setText(`Coins: ${this.coins}`);
    }
    
    onBossDefeated() {
        console.log("Boss defeated in world " + this.currentWorld);
        
        // Advance to the next world if not at max
        if (this.currentWorld < this.maxWorlds) {
            this.currentWorld++;
            this.worldText.setText(`World: ${this.currentWorld}`);
            
            // Generate a new map for the next world
            this.generateWorldMap();
            
            // Show level transition message
            const transitionText = this.add.text(400, 300, `Entering World ${this.currentWorld}!`, 
                { font: '32px Arial', fill: '#ffffff', backgroundColor: '#000000' }).setOrigin(0.5);
            transitionText.setDepth(200); // Make sure it's visible above everything
            
            // Load the starting room after a short delay
            this.time.delayedCall(2000, () => {
                transitionText.destroy();
                this.loadRoom(0, 0);
            });
        } else {
            // Player has beaten the final boss - show victory
            const victoryText = this.add.text(400, 300, 'Victory! You have conquered The Forsaken Depths!', 
                { font: '24px Arial', fill: '#ffffff', backgroundColor: '#000000' }).setOrigin(0.5);
            victoryText.setDepth(200); // Make sure it's visible above everything
                
            // Return to title after delay
            this.time.delayedCall(5000, () => {
                this.scene.start('TitleScene');
            });
        }
    }
}

// Game Over Scene
class GameOverScene extends Phaser.Scene {
    constructor() {
        super({ key: 'GameOverScene' });
    }

    create() {
        this.add.text(400, 200, 'Game Over', { font: '48px Arial', fill: '#ff0000' }).setOrigin(0.5);

        const playAgainButton = this.add.text(400, 350, 'Play Again', { font: '32px Arial', fill: '#00ff00' }).setOrigin(0.5);
        playAgainButton.setInteractive();
        playAgainButton.on('pointerdown', () => this.scene.start('MainGameScene'));
        playAgainButton.on('pointerover', () => playAgainButton.setStyle({ fill: '#ffffff' }));
        playAgainButton.on('pointerout', () => playAgainButton.setStyle({ fill: '#00ff00' }));

        const exitButton = this.add.text(400, 450, 'Exit', { font: '32px Arial', fill: '#00ff00' }).setOrigin(0.5);
        exitButton.setInteractive();
        exitButton.on('pointerdown', () => window.location.href = 'index.html');
        exitButton.on('pointerover', () => exitButton.setStyle({ fill: '#ffffff' }));
        exitButton.on('pointerout', () => exitButton.setStyle({ fill: '#00ff00' }));
    }
}

// Game Configuration
const config = {
    type: Phaser.AUTO,
    width: 800,
    height: 600,
    scene: [TitleScene, MainGameScene, GameOverScene],
    physics: {
        default: 'arcade',
        arcade: {
            gravity: { y: 0 },
            debug: false
        }
    },
    parent: 'game-container'
};

// Wait for DOM to load before creating the game
window.onload = function() {
    const game = new Phaser.Game(config);
};