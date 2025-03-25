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
        this.currentWorld = 1;
        this.maxWorlds = 3;
        this.currentRoom = { x: 0, y: 0 };
        this.visitedRooms = {};
        this.roomMap = {};
        this.coins = 0;
        this.clearedRooms = new Set(); // Track cleared rooms
        this.damageMultiplier = 1; // Track damage upgrades
        this.purchasedHealing = new Set(); // Track purchased healing per world
        this.purchasedDamage = new Set(); // Track purchased damage upgrades per world
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
            enemy.health -= projectile.damage; // Adjust damage value as needed
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
            console.log("Room cleared! Opening doors.");
            this.roomActive = false;
            const roomKey = `${this.currentRoom.x},${this.currentRoom.y}`;
            this.clearedRooms.add(roomKey);

            // Open all doors
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
            const speed = 300;

            switch (direction) {
                case 'left':
                    projectile.setVelocityX(-speed);
                    break;
                case 'right':
                    projectile.setVelocityX(speed);
                    break;
                case 'up':
                    projectile.setVelocityY(-speed);
                    break;
                case 'down':
                    projectile.setVelocityY(speed);
                    break;
            }

            // Apply damage multiplier
            projectile.damage = 10 * this.damageMultiplier;
            this.lastShootTime = this.time.now;
        }
    }

    shootWithMouse(pointer) {
        if (this.time.now > this.lastShootTime + this.shootCooldown) {
            const projectile = this.projectiles.create(this.player.x, this.player.y, 'projectile');
            const angle = Phaser.Math.Angle.Between(this.player.x, this.player.y, pointer.x, pointer.y);
            const speed = 300;
            projectile.setVelocity(Math.cos(angle) * speed, Math.sin(angle) * speed);
            projectile.damage = 10 * this.damageMultiplier; // Add damage multiplier
            this.lastShootTime = this.time.now;
        }
    }

    generateWorldMap() {
        this.roomMap = {};
        this.visitedRooms = {};
        this.clearedRooms.clear();

        // Start with entry room at (0,0)
        let currentDepth = 0;
        const minPathLength = 3; // Minimum rooms to exit
        const maxRooms = 8;

        // Initialize starting room - CHANGE 'normal' to 'start'
        this.roomMap['0,0'] = {
            type: 'start', // Changed from 'normal' to prevent enemies from spawning
            visited: false,
            doors: {},
            depth: currentDepth,
            variation: Math.floor(Math.random() * 3) // Random room variation
        };

        // Generate main path first
        let currentPos = { x: 0, y: 0 };
        let pathLength = 0;
        let exitRoom = null;

        while (pathLength < minPathLength || (pathLength < maxRooms && Math.random() < 0.7)) {
            // Choose random direction
            const directions = [
                { x: 0, y: -1, dir: 'up', opposite: 'down' },
                { x: 1, y: 0, dir: 'right', opposite: 'left' },
                { x: 0, y: 1, dir: 'down', opposite: 'up' },
                { x: -1, y: 0, dir: 'left', opposite: 'right' }
            ];

            Phaser.Utils.Array.Shuffle(directions);

            let moved = false;
            for (const dir of directions) {
                const newX = currentPos.x + dir.x;
                const newY = currentPos.y + dir.y;
                const newKey = `${newX},${newY}`;

                if (!this.roomMap[newKey]) {
                    // All rooms start as normal
                    let roomType = 'normal';

                    // Create new room
                    this.roomMap[newKey] = {
                        type: roomType,
                        visited: false,
                        doors: {},
                        depth: ++currentDepth,
                        variation: Math.floor(Math.random() * 3)
                    };

                    // Connect rooms
                    this.roomMap[`${currentPos.x},${currentPos.y}`].doors[dir.dir] = newKey;
                    this.roomMap[newKey].doors[dir.opposite] = `${currentPos.x},${currentPos.y}`;

                    currentPos = { x: newX, y: newY };
                    pathLength++;
                    moved = true;
                    exitRoom = { x: newX, y: newY, key: newKey };
                    break;
                }
            }

            if (!moved) break;
        }

        // Set the last room as boss room with exit
        if (exitRoom) {
            this.roomMap[exitRoom.key].type = 'boss';
            this.roomMap[exitRoom.key].hasExit = true;
        }

        // Randomly select one normal room to be the shop
        const normalRooms = Object.entries(this.roomMap).filter(([key, room]) =>
            room.type === 'normal' && key !== '0,0' // Exclude starting room
        );

        if (normalRooms.length > 0) {
            const [shopRoomKey] = normalRooms[Math.floor(Math.random() * normalRooms.length)];
            this.roomMap[shopRoomKey].type = 'shop';
        }

        // Add some branch rooms
        const branchAttempts = 3;
        for (let i = 0; i < branchAttempts; i++) {
            const roomKeys = Object.keys(this.roomMap);
            const randomRoom = roomKeys[Math.floor(Math.random() * roomKeys.length)];
            const [x, y] = randomRoom.split(',').map(Number);

            const directions = [
                { x: 0, y: -1, dir: 'up', opposite: 'down' },
                { x: 1, y: 0, dir: 'right', opposite: 'left' },
                { x: 0, y: 1, dir: 'down', opposite: 'up' },
                { x: -1, y: 0, dir: 'left', opposite: 'right' }
            ];

            Phaser.Utils.Array.Shuffle(directions);

            for (const dir of directions) {
                const newX = x + dir.x;
                const newY = y + dir.y;
                const newKey = `${newX},${newY}`;

                if (!this.roomMap[newKey] && Object.keys(this.roomMap[randomRoom].doors).length < 3) {
                    this.roomMap[newKey] = {
                        type: 'normal',
                        visited: false,
                        doors: {},
                        depth: this.roomMap[randomRoom].depth + 1,
                        variation: Math.floor(Math.random() * 3)
                    };

                    // Connect rooms
                    this.roomMap[randomRoom].doors[dir.dir] = newKey;
                    this.roomMap[newKey].doors[dir.opposite] = randomRoom;
                    break;
                }
            }
        }
    }

    loadRoom(x, y) {
        // Clear existing room elements
        this.enemies.clear(true, true);
        this.enemyProjectiles.clear(true, true);
        this.innerWalls.clear(true, true);
        this.walls.clear(true, true);
        this.doors.children.iterate(door => {
            if (door.glowEffect) {
                door.glowEffect.destroy();
            }
        });
        this.doors.clear(true, true);
        this.projectiles.clear(true, true);

        this.currentRoom = { x, y };
        const roomKey = `${x},${y}`;

        if (!this.roomMap[roomKey]) {
            console.error("Tried to load nonexistent room:", roomKey);
            return;
        }

        const room = this.roomMap[roomKey];
        room.visited = true;
        this.visitedRooms[roomKey] = true;

        // Create room layout based on variation
        this.createRoomLayout(room.variation);

        // Create the outer walls
        this.walls.create(400, this.playAreaY1, `wall${this.currentWorld}`).setScale(25, 1).refreshBody();
        this.walls.create(400, this.playAreaY2, `wall${this.currentWorld}`).setScale(25, 1).refreshBody();
        this.walls.create(this.playAreaX1, 300, `wall${this.currentWorld}`).setScale(1, 19).refreshBody();
        this.walls.create(this.playAreaX2, 300, `wall${this.currentWorld}`).setScale(1, 19).refreshBody();

        // Handle different room types
        switch (room.type) {
            case 'start':
                // Starting room has no enemies
                break;
            case 'shop':
                this.createShopRoom();
                break;
            case 'boss':
                if (!this.clearedRooms.has(roomKey)) {
                    this.createBossRoom();
                }
                break;
            case 'normal':
                if (!this.clearedRooms.has(roomKey)) {
                    this.createNormalRoom();
                }
                break;
        }

        // Add doors
        this.createDoors(room);

        // Set up collisions
        this.setupCollisions();

        // Set room as active only if there are uncleaned enemies
        this.roomActive = this.enemies.countActive() > 0;

        // Update doors appearance
        this.doors.children.iterate(door => {
            
            // Remember the target room
            const [targetX, targetY] = door.targetRoom.split(',').map(Number);
            const targetRoomKey = `${targetX},${targetY}`;

            // Set up base door texture - check if room is active and if target is a shop
            const isShop = this.roomMap[targetRoomKey].type === 'shop';
            const isCleared = this.clearedRooms.has(`${this.currentRoom.x},${this.currentRoom.y}`);

            // Door is open if the room is cleared or it's the starting room, or if the target is a shop
            const shouldBeOpen = isCleared || this.roomMap[`${this.currentRoom.x},${this.currentRoom.y}`].type === 'start' || isShop;
            const baseTexture = shouldBeOpen ? 'door_open' : 'door_closed';

            door.setTexture(baseTexture);
            door.isOpen = shouldBeOpen;

            // For shop doors, add gold overlay and glow effect
            if (isShop) {
                // Create gold tint on the door
                door.setTint(0xFFD700);

                // Add glow sprite
                const glow = this.add.sprite(door.x, door.y, baseTexture);
                glow.setTint(0xFFD700);
                glow.setAlpha(0.5);
                glow.setBlendMode(Phaser.BlendModes.ADD);
                glow.setScale(1.2); // Slightly larger than the door
                glow.setDepth(door.depth - 1); // Ensure glow is behind the door

                // Create pulsing animation for the glow
                this.tweens.add({
                    targets: glow,
                    alpha: { from: 0.5, to: 0.8 },
                    duration: 1000,
                    yoyo: true,
                    repeat: -1,
                    ease: 'Sine.easeInOut'
                });

                // Store reference to glow for cleanup
                door.glowEffect = glow;
            }

            door.isOpen = !this.roomActive || isShop;

            // Ensure doors can't be used while room is active
            if (door.doorCollider) {
                this.physics.world.removeCollider(door.doorCollider);
            }
            door.doorCollider = this.physics.add.collider(this.player, door, null, () => {
                // Allow passage if room is cleared (not active) or it's a shop door
                return !this.roomActive || isShop;
            }, this);
        });
    }

    createDoors(room) {
        // Create doors based on room connections
        Object.entries(room.doors).forEach(([direction, targetRoomKey]) => {
            let x = 400;
            let y = 300;

            switch (direction) {
                case 'up':
                    y = this.playAreaY1;
                    break;
                case 'down':
                    y = this.playAreaY2;
                    break;
                case 'left':
                    x = this.playAreaX1;
                    break;
                case 'right':
                    x = this.playAreaX2;
                    break;
            }

            const door = this.physics.add.sprite(x, y, 'door_closed');
            door.direction = direction;
            door.targetRoom = targetRoomKey;
            this.doors.add(door);
        });
    }

    createShopRoom() {
        const worldKey = `world${this.currentWorld}`;

        // Create healing option if not purchased
        if (!this.purchasedHealing.has(worldKey)) {
            const healButton = this.add.text(300, 300, 'Buy Healing (10 coins)',
                { font: '16px Arial', fill: '#00ff00' }).setInteractive();

            healButton.on('pointerdown', () => {
                if (this.coins >= 10) {
                    this.coins -= 10;
                    this.player.health = Math.min(this.player.maxHealth, this.player.health + 2);
                    this.updateHearts();
                    this.coinsText.setText(`Coins: ${this.coins}`);
                    this.purchasedHealing.add(worldKey);
                    healButton.destroy();
                }
            });
        }

        // Create damage upgrade option if not purchased
        if (!this.purchasedDamage.has(worldKey)) {
            const damageButton = this.add.text(300, 350, 'Buy Damage Up (20 coins)',
                { font: '16px Arial', fill: '#ff0000' }).setInteractive();

            damageButton.on('pointerdown', () => {
                if (this.coins >= 20) {
                    this.coins -= 20;
                    this.damageMultiplier += 0.5;
                    this.coinsText.setText(`Coins: ${this.coins}`);
                    this.purchasedDamage.add(worldKey);
                    damageButton.destroy();
                }
            });
        }
    }

    createBossRoom() {
        // Create boss enemy
        const boss = this.createEnemy('boss', 400, 300);
        boss.health = 100 * this.currentWorld;
        boss.setScale(1.5);
        this.enemies.add(boss);
        this.boss = boss;
    }

    createNormalRoom() {
        // Add random enemies
        const enemyCount = Phaser.Math.Between(2, 4 + this.currentWorld);
        for (let i = 0; i < enemyCount; i++) {
            const x = Phaser.Math.Between(this.playAreaX1 + 50, this.playAreaX2 - 50);
            const y = Phaser.Math.Between(this.playAreaY1 + 50, this.playAreaY2 - 50);
            this.enemies.add(this.createEnemy('blob', x, y));
        }
    }

    createRoomLayout(variation) {
        // Different wall patterns based on variation
        switch (variation) {
            case 0: // Basic room with corner walls
                this.innerWalls.create(200, 200, `wall${this.currentWorld}`).setScale(2);
                this.innerWalls.create(600, 200, `wall${this.currentWorld}`).setScale(2);
                this.innerWalls.create(200, 400, `wall${this.currentWorld}`).setScale(2);
                this.innerWalls.create(600, 400, `wall${this.currentWorld}`).setScale(2);
                break;
            case 1: // Cross pattern
                this.innerWalls.create(400, 300, `wall${this.currentWorld}`).setScale(4, 1);
                this.innerWalls.create(400, 300, `wall${this.currentWorld}`).setScale(1, 4);
                break;
            case 2: // Diagonal barriers
                this.innerWalls.create(300, 200, `wall${this.currentWorld}`).setScale(2).setAngle(45);
                this.innerWalls.create(500, 400, `wall${this.currentWorld}`).setScale(2).setAngle(45);
                break;
        }
    }

    setupCollisions() {
        // Set up room collisions
        this.physics.add.collider(this.player, this.walls);
        this.physics.add.collider(this.player, this.innerWalls);
        this.physics.add.collider(this.enemies, this.innerWalls);
        this.physics.add.collider(this.enemies, this.walls);
        this.physics.add.collider(this.projectiles, this.innerWalls, (projectile) => projectile.destroy());
        this.physics.add.collider(this.projectiles, this.walls, (projectile) => projectile.destroy());

        // Update enemy projectile collisions
        this.physics.add.collider(this.enemyProjectiles, this.walls, (projectile) => projectile.destroy());
        this.physics.add.collider(this.enemyProjectiles, this.innerWalls, (projectile) => projectile.destroy());

        // Add door interaction
        this.doors.children.iterate(door => {
            // Remove existing collider if it exists
            if (door.doorCollider) {
                this.physics.world.removeCollider(door.doorCollider);
            }

            // Create new collider
            door.doorCollider = this.physics.add.overlap(this.player, door, (player, door) => {
                // Only allow transition if door is open (room cleared or shop)
                if (door.isOpen) {
                    const [targetX, targetY] = door.targetRoom.split(',').map(Number);
                    this.transitionToRoom(targetX, targetY, door.direction);
                }
            }, null, this);
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
                const angles = [0, Math.PI / 4, Math.PI / 2, 3 * Math.PI / 4, Math.PI, 5 * Math.PI / 4, 3 * Math.PI / 2, 7 * Math.PI / 4];
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
window.onload = function () {
    const game = new Phaser.Game(config);
};