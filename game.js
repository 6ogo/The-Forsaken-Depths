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
        this.clearedRooms = new Set();
        this.damageMultiplier = 1;
        this.purchasedHealing = new Set();
        this.purchasedDamage = new Set();
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
        // Define game boundaries
        this.playAreaX1 = 60;
        this.playAreaY1 = 60;
        this.playAreaX2 = 740;
        this.playAreaY2 = 540;

        this.inTransition = false; // Transition cooldown flag

        // Setup groups
        this.walls = this.physics.add.staticGroup();
        this.innerWalls = this.physics.add.staticGroup();
        this.enemies = this.physics.add.group();
        this.enemyProjectiles = this.physics.add.group();
        this.doors = this.physics.add.staticGroup();
        this.projectiles = this.physics.add.group();

        // Create UI
        this.createUI();

        // Create player
        this.player = this.physics.add.sprite(400, 300, 'player');
        this.player.health = 6;
        this.player.maxHealth = 6;
        this.player.lastDamageTime = 0;
        this.player.setDepth(10);

        this.lastShootTime = 0;
        this.shootCooldown = 200;

        // Projectile-enemy overlap
        this.physics.add.overlap(this.projectiles, this.enemies, (projectile, enemy) => {
            enemy.health -= projectile.damage;
            if (enemy.health <= 0) {
                this.showCoinDrop(enemy.x, enemy.y);
                if (enemy.type === 'boss') this.onBossDefeated();
                enemy.destroy();
            }
            projectile.destroy();
        });

        // Input setup
        this.keyW = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.W);
        this.keyA = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.A);
        this.keyS = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.S);
        this.keyD = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.D);
        this.keyLeft = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.LEFT);
        this.keyRight = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.RIGHT);
        this.keyUp = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.UP);
        this.keyDown = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.DOWN);
        this.keyE = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.E);

        this.roomActive = false;

        // Generate and load initial map
        this.generateWorldMap();
        this.loadRoom(this.currentRoom.x, this.currentRoom.y);

        // Player collisions
        this.physics.add.collider(this.player, this.enemies, (player, enemy) => this.takeDamage(player));
        this.physics.add.overlap(this.player, this.enemyProjectiles, (player, projectile) => {
            this.takeDamage(player);
            projectile.destroy();
        });

        this.input.on('pointerdown', (pointer) => this.shootWithMouse(pointer));
    }

    createUI() {
        this.uiContainer = this.add.container(0, 0).setDepth(100);
        this.hearts = [];
        for (let i = 0; i < 3; i++) {
            const heart = this.add.image(100 + i * 48, 100, 'heart_full');
            this.hearts.push(heart);
            this.uiContainer.add(heart);
        }
        this.coinsText = this.add.text(100, 140, `Coins: ${this.coins}`, { fontSize: '28px', fill: '#fff' });
        this.worldText = this.add.text(100, 500, `World: ${this.currentWorld}`, { fontSize: '24px', fill: '#fff' });
        this.uiContainer.add([this.coinsText, this.worldText]);

        this.doorPrompt = this.add.text(400, 200, 'Press E to open door', {
            fontSize: '18px',
            fill: '#fff',
            backgroundColor: '#333',
            padding: { x: 5, y: 2 }
        }).setOrigin(0.5).setDepth(101).setVisible(false);
        this.uiContainer.add(this.doorPrompt);
    }

    update(time) {
        // Player movement
        this.player.setVelocity(0);
        if (this.keyA.isDown) this.player.setVelocityX(-160);
        if (this.keyD.isDown) this.player.setVelocityX(160);
        if (this.keyW.isDown) this.player.setVelocityY(-160);
        if (this.keyS.isDown) this.player.setVelocityY(160);

        // Enemy updates
        this.enemies.children.iterate(enemy => {
            if (enemy && enemy.active) {
                this.updateEnemyMovement(enemy, time);
                if ((enemy.type === 'blob' || enemy.type === 'boss') && time > enemy.lastShootTime + enemy.shootCooldown) {
                    this.shootEnemyProjectile(enemy);
                    enemy.lastShootTime = time;
                }
            }
        });

        // Room clearing
        if (this.roomActive && this.enemies.countActive() === 0) {
            console.log("Room cleared! Opening doors.");
            this.roomActive = false;
            const roomKey = `${this.currentRoom.x},${this.currentRoom.y}`;
            this.clearedRooms.add(roomKey);
            this.doors.children.iterate(door => {
                door.setTexture('door_open');
                door.isOpen = true;
                if (door.collider) this.physics.world.removeCollider(door.collider);
            });
        }

        // Door interaction with cooldown
        if (!this.inTransition) {
            let foundDoorInRange = false;
            this.doors.children.iterate(door => {
                const dist = Phaser.Math.Distance.Between(this.player.x, this.player.y, door.x, door.y);
                if (dist < 40) {
                    foundDoorInRange = true;
                    // Position prompt based on door direction
                    if (door.direction === 'up') {
                        this.doorPrompt.x = door.x;
                        this.doorPrompt.y = door.y + 40; // Below
                    } else if (door.direction === 'down') {
                        this.doorPrompt.x = door.x;
                        this.doorPrompt.y = door.y - 40; // Above
                    } else if (door.direction === 'left') {
                        this.doorPrompt.x = door.x + 40; // Right
                        this.doorPrompt.y = door.y;
                    } else if (door.direction === 'right') {
                        this.doorPrompt.x = door.x - 40; // Left
                        this.doorPrompt.y = door.y;
                    }
                    if (!door.isOpen) {
                        const isShop = this.roomMap[door.targetRoom].type === 'shop';
                        if (!this.roomActive || isShop) {
                            this.doorPrompt.setText('Press E to open door');
                            this.doorPrompt.visible = true;
                            if (Phaser.Input.Keyboard.JustDown(this.keyE)) {
                                console.log("Opening door to:", door.targetRoom);
                                door.setTexture('door_open');
                                door.isOpen = true;
                            }
                        } else {
                            this.doorPrompt.visible = false;
                        }
                    } else {
                        const [targetX, targetY] = door.targetRoom.split(',').map(Number);
                        if (!door.transitionInProgress && this.isPlayerCrossingDoor(door)) {
                            door.transitionInProgress = true;
                            this.transitionToRoom(targetX, targetY, door.direction);
                        }
                    }
                }
            });
            if (!foundDoorInRange) this.doorPrompt.visible = false;
        }

        // Shooting
        if (this.keyLeft.isDown) this.shoot('left');
        else if (this.keyRight.isDown) this.shoot('right');
        else if (this.keyUp.isDown) this.shoot('up');
        else if (this.keyDown.isDown) this.shoot('down');
    }

    isPlayerCrossingDoor(door) {
        switch (door.direction) {
            case 'up': return this.player.y <= door.y + 15 && this.keyW.isDown;
            case 'down': return this.player.y >= door.y - 15 && this.keyS.isDown;
            case 'left': return this.player.x <= door.x + 15 && this.keyA.isDown;
            case 'right': return this.player.x >= door.x - 15 && this.keyD.isDown;
            default: return false;
        }
    }

    updateEnemyMovement(enemy, time) {
        if (!enemy || !enemy.active || !this.player || !this.player.active) return;
        const dx = this.player.x - enemy.x;
        const dy = this.player.y - enemy.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        const normalizedDx = dx / distance;
        const normalizedDy = dy / distance;
        enemy.setVelocity(normalizedDx * enemy.speed, normalizedDy * enemy.speed);
        if (time % 500 < 100) enemy.setVelocity(0, 0);
    }

    shoot(direction) {
        if (this.time.now > this.lastShootTime + this.shootCooldown) {
            const projectile = this.projectiles.create(this.player.x, this.player.y, 'projectile');
            const speed = 300;
            switch (direction) {
                case 'left': projectile.setVelocityX(-speed); break;
                case 'right': projectile.setVelocityX(speed); break;
                case 'up': projectile.setVelocityY(-speed); break;
                case 'down': projectile.setVelocityY(speed); break;
            }
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
            projectile.damage = 10 * this.damageMultiplier;
            this.lastShootTime = this.time.now;
        }
    }

    generateWorldMap() {
        this.roomMap = {};
        this.visitedRooms = {};
        this.clearedRooms.clear();
        this.roomMap['0,0'] = { type: 'start', visited: false, doors: {}, depth: 0, variation: Math.floor(Math.random() * 3) };
        let currentPos = { x: 0, y: 0 };
        let pathLength = 0;
        let exitRoom = null;
        const minPathLength = 3;
        const maxRooms = 8;

        while (pathLength < minPathLength || (pathLength < maxRooms && Math.random() < 0.7)) {
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
                    this.roomMap[newKey] = {
                        type: 'normal',
                        visited: false,
                        doors: {},
                        depth: pathLength + 1,
                        variation: Math.floor(Math.random() * 3)
                    };
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

        if (exitRoom) {
            this.roomMap[exitRoom.key].type = 'boss';
            this.roomMap[exitRoom.key].hasExit = true;
        }

        const normalRooms = Object.entries(this.roomMap).filter(([key, room]) => room.type === 'normal' && key !== '0,0');
        if (normalRooms.length > 0) {
            const [shopRoomKey] = normalRooms[Math.floor(Math.random() * normalRooms.length)];
            this.roomMap[shopRoomKey].type = 'shop';
        }

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
                    this.roomMap[randomRoom].doors[dir.dir] = newKey;
                    this.roomMap[newKey].doors[dir.opposite] = randomRoom;
                    break;
                }
            }
        }
    }

    createWallSegments(direction, hasDoor) {
        const doorSize = 40;
        if (direction === 'up' || direction === 'down') {
            const y = direction === 'up' ? this.playAreaY1 : this.playAreaY2;
            if (hasDoor) {
                const leftWall = this.walls.create(220, y, `wall${this.currentWorld}`);
                leftWall.body.setSize(320, 20);
                const rightWall = this.walls.create(580, y, `wall${this.currentWorld}`);
                rightWall.body.setSize(320, 20);
            } else {
                const wall = this.walls.create(400, y, `wall${this.currentWorld}`);
                wall.body.setSize(680, 20);
            }
        } else if (direction === 'left' || direction === 'right') {
            const x = direction === 'left' ? this.playAreaX1 : this.playAreaX2;
            if (hasDoor) {
                const topWall = this.walls.create(x, 170, `wall${this.currentWorld}`);
                topWall.body.setSize(20, 220);
                const bottomWall = this.walls.create(x, 430, `wall${this.currentWorld}`);
                bottomWall.body.setSize(20, 220);
            } else {
                const wall = this.walls.create(x, 300, `wall${this.currentWorld}`);
                wall.body.setSize(20, 480);
            }
        }
    }

    loadRoom(x, y) {
        this.enemies.clear(true, true);
        this.enemyProjectiles.clear(true, true);
        this.innerWalls.clear(true, true);
        this.walls.clear(true, true);
        this.doors.children.iterate(door => {
            if (door.glowEffect) door.glowEffect.destroy();
        });
        this.doors.clear(true, true);
        this.projectiles.clear(true, true);

        this.currentRoom = { x, y };
        const roomKey = `${x},${y}`;
        const room = this.roomMap[roomKey];
        room.visited = true;
        this.visitedRooms[roomKey] = true;

        this.createRoomLayout(room.variation);
        this.createWallSegments('up', !!room.doors.up);
        this.createWallSegments('down', !!room.doors.down);
        this.createWallSegments('left', !!room.doors.left);
        this.createWallSegments('right', !!room.doors.right);

        switch (room.type) {
            case 'start': break;
            case 'shop': this.createShopRoom(); break;
            case 'boss': if (!this.clearedRooms.has(roomKey)) this.createBossRoom(); break;
            case 'normal': if (!this.clearedRooms.has(roomKey)) this.createNormalRoom(); break;
        }

        this.createDoors(room);
        this.setupCollisions();

        this.roomActive = this.enemies.countActive() > 0;

        this.doors.children.iterate(door => {
            const [targetX, targetY] = door.targetRoom.split(',').map(Number);
            const targetRoomKey = `${targetX},${targetY}`;
            const isShop = this.roomMap[targetRoomKey].type === 'shop';
            const isCleared = this.clearedRooms.has(`${this.currentRoom.x},${this.currentRoom.y}`);
            const shouldBeOpen = isCleared || this.roomMap[`${this.currentRoom.x},${this.currentRoom.y}`].type === 'start' || isShop;
            door.setTexture(shouldBeOpen ? 'door_open' : 'door_closed');
            door.isOpen = shouldBeOpen;
            if (!door.isOpen) door.collider = this.physics.add.collider(this.player, door);
            else door.collider = null;

            if (isShop) {
                door.setTint(0xFFD700);
                const glow = this.add.sprite(door.x, door.y, 'door_open')
                    .setTint(0xFFD700)
                    .setAlpha(0.5)
                    .setBlendMode(Phaser.BlendModes.ADD)
                    .setScale(1.2)
                    .setDepth(door.depth - 1);
                this.tweens.add({
                    targets: glow,
                    alpha: { from: 0.5, to: 0.8 },
                    duration: 1000,
                    yoyo: true,
                    repeat: -1,
                    ease: 'Sine.easeInOut'
                });
                door.glowEffect = glow;
            }
            if (!door.isOpen && (!this.roomActive || isShop)) door.setTint(0x00FF00);
            else door.clearTint();
        });
    }

    createDoors(room) {
        Object.entries(room.doors).forEach(([direction, targetRoomKey]) => {
            let x = 400, y = 300;
            switch (direction) {
                case 'up': y = this.playAreaY1; break;
                case 'down': y = this.playAreaY2; break;
                case 'left': x = this.playAreaX1; break;
                case 'right': x = this.playAreaX2; break;
            }
            const door = this.physics.add.staticSprite(x, y, 'door_closed');
            door.direction = direction;
            door.targetRoom = targetRoomKey;
            door.transitionInProgress = false;
            this.doors.add(door);
        });
    }

    createShopRoom() {
        const worldKey = `world${this.currentWorld}`;
        if (!this.purchasedHealing.has(worldKey)) {
            const healButton = this.add.text(300, 300, 'Buy Healing (10 coins)', { font: '16px Arial', fill: '#00ff00' }).setInteractive();
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
        if (!this.purchasedDamage.has(worldKey)) {
            const damageButton = this.add.text(300, 350, 'Buy Damage Up (20 coins)', { font: '16px Arial', fill: '#ff0000' }).setInteractive();
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
        const boss = this.createEnemy('boss', 400, 300);
        boss.health = 100 * this.currentWorld;
        boss.setScale(1.5);
        this.enemies.add(boss);
    }

    createNormalRoom() {
        const enemyCount = Phaser.Math.Between(2, 4 + this.currentWorld);
        for (let i = 0; i < enemyCount; i++) {
            const x = Phaser.Math.Between(this.playAreaX1 + 50, this.playAreaX2 - 50);
            const y = Phaser.Math.Between(this.playAreaY1 + 50, this.playAreaY2 - 50);
            this.enemies.add(this.createEnemy('blob', x, y));
        }
    }

    createRoomLayout(variation) {
        switch (variation) {
            case 0:
                this.innerWalls.create(200, 200, `wall${this.currentWorld}`).setScale(2);
                this.innerWalls.create(600, 200, `wall${this.currentWorld}`).setScale(2);
                this.innerWalls.create(200, 400, `wall${this.currentWorld}`).setScale(2);
                this.innerWalls.create(600, 400, `wall${this.currentWorld}`).setScale(2);
                break;
            case 1:
                this.innerWalls.create(400, 300, `wall${this.currentWorld}`).setScale(4, 1);
                this.innerWalls.create(400, 300, `wall${this.currentWorld}`).setScale(1, 4);
                break;
            case 2:
                this.innerWalls.create(300, 200, `wall${this.currentWorld}`).setScale(2).setAngle(45);
                this.innerWalls.create(500, 400, `wall${this.currentWorld}`).setScale(2).setAngle(45);
                break;
        }
    }

    setupCollisions() {
        this.physics.add.collider(this.player, this.walls);
        this.physics.add.collider(this.player, this.innerWalls);
        this.physics.add.collider(this.enemies, this.innerWalls);
        this.physics.add.collider(this.enemies, this.walls);
        this.physics.add.collider(this.projectiles, this.innerWalls, projectile => projectile.destroy());
        this.physics.add.collider(this.projectiles, this.walls, projectile => projectile.destroy());
        this.physics.add.collider(this.enemyProjectiles, this.walls, projectile => projectile.destroy());
        this.physics.add.collider(this.enemyProjectiles, this.innerWalls, projectile => projectile.destroy());
    }

    transitionToRoom(x, y, fromDirection) {
        if (this.inTransition) return;
        this.inTransition = true;
        console.log(`Transitioning to room at (${x},${y}) from ${fromDirection} direction`);

        this.cameras.main.fadeOut(250);
        this.time.delayedCall(250, () => {
            this.loadRoom(x, y);
            let playerX = 400, playerY = 300;
            const oppositeDirection = { 'up': 'down', 'down': 'up', 'left': 'right', 'right': 'left' };
            switch (oppositeDirection[fromDirection]) {
                case 'up': playerX = 400; playerY = this.playAreaY1 + 50; break;
                case 'down': playerX = 400; playerY = this.playAreaY2 - 50; break;
                case 'left': playerX = this.playAreaX1 + 50; playerY = 300; break;
                case 'right': playerX = this.playAreaX2 - 50; playerY = 300; break;
            }
            this.player.x = playerX;
            this.player.y = playerY;
            this.cameras.main.fadeIn(250);
            this.time.delayedCall(250, () => {
                this.inTransition = false;
            });
        });
    }

    createEnemy(type, x, y) {
        const enemy = this.physics.add.sprite(x, y, type);
        enemy.type = type;
        enemy.health = type === 'boss' ? 50 * this.currentWorld : 20 * this.currentWorld;
        enemy.speed = type === 'boss' ? 80 : 50;
        enemy.shootCooldown = type === 'boss' ? 1000 : 2000;
        enemy.lastShootTime = 0;
        enemy.setCollideWorldBounds(true);
        return enemy;
    }

    shootEnemyProjectile(enemy) {
        const texture = enemy.type === 'boss' ? 'boss_projectile' : 'blob_projectile';
        const projectile = this.enemyProjectiles.create(enemy.x, enemy.y, texture);
        if (enemy.type === 'boss' && this.currentWorld >= 2) {
            const angles = [0, Math.PI / 4, Math.PI / 2, 3 * Math.PI / 4, Math.PI, 5 * Math.PI / 4, 3 * Math.PI / 2, 7 * Math.PI / 4];
            const projCount = this.currentWorld === 2 ? 4 : 8;
            for (let i = 0; i < projCount; i++) {
                const proj = this.enemyProjectiles.create(enemy.x, enemy.y, texture);
                proj.setVelocity(Math.cos(angles[i]) * 200, Math.sin(angles[i]) * 200);
            }
            this.physics.moveToObject(projectile, this.player, 200);
        } else {
            this.physics.moveToObject(projectile, this.player, 200);
        }
    }

    takeDamage(player) {
        if (this.time.now > player.lastDamageTime + 500) {
            player.health -= 1;
            player.lastDamageTime = this.time.now;
            this.updateHearts();
            if (player.health <= 0) this.scene.start('GameOverScene');
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
        const sparkle = this.add.sprite(x, y, 'gold_sparkles').setDepth(5);
        this.time.delayedCall(500, () => sparkle.destroy());
        this.coins++;
        this.coinsText.setText(`Coins: ${this.coins}`);
    }

    onBossDefeated() {
        console.log("Boss defeated in world " + this.currentWorld);
        if (this.currentWorld < this.maxWorlds) {
            this.currentWorld++;
            this.worldText.setText(`World: ${this.currentWorld}`);
            this.generateWorldMap();
            const transitionText = this.add.text(400, 300, `Entering World ${this.currentWorld}!`, {
                font: '32px Arial',
                fill: '#ffffff',
                backgroundColor: '#000000'
            }).setOrigin(0.5).setDepth(200);
            this.time.delayedCall(2000, () => {
                transitionText.destroy();
                this.loadRoom(0, 0);
            });
        } else {
            const victoryText = this.add.text(400, 300, 'Victory! You have conquered The Forsaken Depths!', {
                font: '24px Arial',
                fill: '#ffffff',
                backgroundColor: '#000000'
            }).setOrigin(0.5).setDepth(200);
            this.time.delayedCall(5000, () => this.scene.start('TitleScene'));
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
        const playAgainButton = this.add.text(400, 350, 'Play Again', { font: '32px Arial', fill: '#00ff00' }).setOrigin(0.5).setInteractive();
        playAgainButton.on('pointerdown', () => this.scene.start('MainGameScene'));
        playAgainButton.on('pointerover', () => playAgainButton.setStyle({ fill: '#ffffff' }));
        playAgainButton.on('pointerout', () => playAgainButton.setStyle({ fill: '#00ff00' }));
        const exitButton = this.add.text(400, 450, 'Exit', { font: '32px Arial', fill: '#00ff00' }).setOrigin(0.5).setInteractive();
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
        arcade: { gravity: { y: 0 }, debug: false }
    },
    parent: 'game-container'
};

window.onload = function () {
    const game = new Phaser.Game(config);
};