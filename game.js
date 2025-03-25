// Title Scene (Welcome Screen) - Enhanced with Music and Accessibility Options
class TitleScene extends Phaser.Scene {
    constructor() {
        super({ key: 'TitleScene' });
    }

    preload() {
        this.load.image('background', 'assets/background.png');
        this.load.audio('title_music', 'assets/title_music.mp3');
        this.load.image('settings_icon', 'assets/settings_icon.png');
    }

    create() {
        this.add.image(400, 300, 'background').setScale(2);

        // Dynamic title with shadow effect
        const title = this.add.text(400, 100, 'The Forsaken Depths', { 
            font: '48px Arial', 
            fill: '#ffffff', 
            stroke: '#000000', 
            strokeThickness: 6 
        }).setOrigin(0.5);

        this.add.text(400, 200, 'Dive into a world of mystery and danger.', { font: '20px Arial', fill: '#ffffff' }).setOrigin(0.5);
        this.add.text(400, 340, 'Controls: WASD to move, Arrow keys/Mouse to shoot\nE to interact, I for inventory', { 
            font: '18px Arial', 
            fill: '#ffffff' 
        }).setOrigin(0.5);

        // Start button with animation
        const startButton = this.add.text(400, 450, 'Start Game', { font: '32px Arial', fill: '#00ff00' }).setOrigin(0.5);
        startButton.setInteractive();
        startButton.on('pointerdown', () => this.scene.start('MainGameScene'));
        startButton.on('pointerover', () => startButton.setStyle({ fill: '#ffffff' }));
        startButton.on('pointerout', () => startButton.setStyle({ fill: '#00ff00' }));
        this.tweens.add({
            targets: startButton,
            scale: { from: 1, to: 1.1 },
            duration: 500,
            yoyo: true,
            repeat: -1
        });

        // Settings button
        const settingsButton = this.add.image(750, 50, 'settings_icon').setScale(0.5).setInteractive();
        settingsButton.on('pointerdown', () => this.showSettings());

        // Play title music
        this.sound.play('title_music', { loop: true, volume: 0.5 });
    }

    showSettings() {
        const settingsPanel = this.add.rectangle(400, 300, 300, 200, 0x333333).setOrigin(0.5);
        const volumeText = this.add.text(400, 250, 'Volume', { font: '20px Arial', fill: '#ffffff' }).setOrigin(0.5);
        const volumeSlider = this.add.rectangle(400, 300, 200, 20, 0x00ff00).setOrigin(0.5).setInteractive();
        volumeSlider.on('pointermove', (pointer) => {
            if (pointer.isDown) {
                const newVolume = Phaser.Math.Clamp((pointer.x - 300) / 200, 0, 1);
                this.sound.setVolume(newVolume);
            }
        });
        const closeButton = this.add.text(400, 350, 'Close', { font: '20px Arial', fill: '#ff0000' }).setOrigin(0.5).setInteractive();
        closeButton.on('pointerdown', () => {
            settingsPanel.destroy();
            volumeText.destroy();
            volumeSlider.destroy();
            closeButton.destroy();
        });
    }
}

// Main Game Scene (Actual Gameplay) - Massively Expanded
class MainGameScene extends Phaser.Scene {
    constructor() {
        super({ key: 'MainGameScene' });
        this.currentWorld = 1;
        this.maxWorlds = 5; // Increased for more progression
        this.currentRoom = { x: 0, y: 0 };
        this.visitedRooms = {};
        this.roomMap = {};
        this.coins = 0;
        this.clearedRooms = new Set();
        this.damageMultiplier = 1;
        this.purchasedHealing = new Set();
        this.purchasedDamage = new Set();
        this.inventory = []; // New: Inventory system
        this.powerUps = new Map(); // New: Active power-ups
        this.experience = 0; // New: Leveling system
        this.level = 1;
        this.combo = 0; // New: Combo system for bonus rewards
        this.comboTimer = 0;
    }

    preload() {
        // Existing assets
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

        // New assets
        this.load.image('spike_trap', 'assets/spike_trap.png');
        this.load.image('powerup_speed', 'assets/powerup_speed.png');
        this.load.image('powerup_shield', 'assets/powerup_shield.png');
        this.load.image('powerup_multishot', 'assets/powerup_multishot.png');
        this.load.image('enemy_spectral', 'assets/enemy_spectral.png');
        this.load.image('enemy_turret', 'assets/enemy_turret.png');
        this.load.audio('bgm_world1', 'assets/bgm_world1.mp3');
        this.load.audio('bgm_world2', 'assets/bgm_world2.mp3');
        this.load.audio('bgm_world3', 'assets/bgm_world3.mp3');
        this.load.audio('bgm_boss', 'assets/bgm_boss.mp3');
        this.load.audio('sfx_powerup', 'assets/sfx_powerup.mp3');
        this.load.audio('sfx_levelup', 'assets/sfx_levelup.mp3');
    }

    create() {
        this.playAreaX1 = 60;
        this.playAreaY1 = 60;
        this.playAreaX2 = 740;
        this.playAreaY2 = 540;

        // Groups
        this.walls = this.physics.add.staticGroup();
        this.innerWalls = this.physics.add.staticGroup();
        this.enemies = this.physics.add.group();
        this.enemyProjectiles = this.physics.add.group();
        this.doors = this.physics.add.group();
        this.projectiles = this.physics.add.group();
        this.hazards = this.physics.add.group(); // New: Environmental hazards
        this.powerUpItems = this.physics.add.group(); // New: Power-up items
        this.boss = null;
        this.isBossRoom = false;

        // Player setup
        this.player = this.physics.add.sprite(400, 300, 'player');
        this.player.health = 6;
        this.player.maxHealth = 6;
        this.player.lastDamageTime = 0;
        this.player.setDepth(10);
        this.player.speed = 160; // Base speed, modifiable by power-ups

        this.lastShootTime = 0;
        this.shootCooldown = 200;

        // UI and input
        this.createUI();
        this.setupInput();

        // Generate world and load initial room
        this.generateWorldMap();
        this.loadRoom(this.currentRoom.x, this.currentRoom.y);

        // Collisions
        this.physics.add.collider(this.player, this.enemies, (player, enemy) => this.takeDamage(player));
        this.physics.add.overlap(this.player, this.enemyProjectiles, (player, projectile) => {
            this.takeDamage(player);
            projectile.destroy();
        });
        this.physics.add.overlap(this.projectiles, this.enemies, this.handleProjectileHit, null, this);
        this.physics.add.overlap(this.player, this.powerUpItems, this.collectPowerUp, null, this);
        this.physics.add.overlap(this.player, this.hazards, this.handleHazardCollision, null, this);

        // Dynamic music
        this.playBackgroundMusic();

        // Minimap
        this.createMinimap();
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
        this.levelText = this.add.text(100, 170, `Level: ${this.level} (XP: ${this.experience}/100)`, { fontSize: '20px', fill: '#fff' });
        this.comboText = this.add.text(600, 100, `Combo: ${this.combo}x`, { fontSize: '20px', fill: '#ffcc00' });
        this.uiContainer.add([this.coinsText, this.worldText, this.levelText, this.comboText]);

        // Inventory UI (hidden by default)
        this.inventoryUI = this.add.rectangle(400, 300, 300, 200, 0x333333).setOrigin(0.5).setVisible(false);
        this.inventoryText = this.add.text(400, 250, 'Inventory', { font: '20px Arial', fill: '#ffffff' }).setOrigin(0.5).setVisible(false);
        this.inventorySlots = [];
        for (let i = 0; i < 4; i++) {
            const slot = this.add.text(300 + i * 50, 300, '', { font: '16px Arial', fill: '#ffffff' }).setVisible(false);
            this.inventorySlots.push(slot);
        }
    }

    setupInput() {
        this.keyW = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.W);
        this.keyA = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.A);
        this.keyS = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.S);
        this.keyD = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.D);
        this.keyLeft = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.LEFT);
        this.keyRight = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.RIGHT);
        this.keyUp = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.UP);
        this.keyDown = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.DOWN);
        this.keyE = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.E); // Interact key
        this.keyI = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.I); // Inventory key
        this.input.on('pointerdown', (pointer) => this.shootWithMouse(pointer));
    }

    update(time) {
        // Player movement with speed power-up consideration
        this.player.setVelocity(0);
        if (this.keyA.isDown) this.player.setVelocityX(-this.player.speed);
        if (this.keyD.isDown) this.player.setVelocityX(this.player.speed);
        if (this.keyW.isDown) this.player.setVelocityY(-this.player.speed);
        if (this.keyS.isDown) this.player.setVelocityY(this.player.speed);

        // Enemy updates
        this.enemies.children.iterate(enemy => {
            if (enemy && enemy.active) {
                this.updateEnemyBehavior(enemy, time);
                if (enemy.shootCooldown && time > enemy.lastShootTime + enemy.shootCooldown) {
                    this.shootEnemyProjectile(enemy);
                    enemy.lastShootTime = time;
                }
            }
        });

        // Room clearing logic
        if (this.roomActive && this.enemies.countActive() === 0) {
            this.roomActive = false;
            const roomKey = `${this.currentRoom.x},${this.currentRoom.y}`;
            this.clearedRooms.add(roomKey);
            this.doors.children.iterate(door => {
                door.setTexture('door_open');
                door.isOpen = true;
            });
        }

        // Shooting
        if (this.keyLeft.isDown) this.shoot('left');
        else if (this.keyRight.isDown) this.shoot('right');
        else if (this.keyUp.isDown) this.shoot('up');
        else if (this.keyDown.isDown) this.shoot('down');

        // Inventory toggle
        if (Phaser.Input.Keyboard.JustDown(this.keyI)) {
            this.toggleInventory();
        }

        // Combo timer
        if (this.combo > 0 && time > this.comboTimer + 3000) {
            this.combo = 0;
            this.comboText.setText(`Combo: ${this.combo}x`);
        }

        // Power-up duration management
        this.powerUps.forEach((duration, type) => {
            if (time > duration) {
                this.removePowerUp(type);
            }
        });
    }

    updateEnemyBehavior(enemy, time) {
        if (!enemy || !this.player) return;
        const dx = this.player.x - enemy.x;
        const dy = this.player.y - enemy.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        const normalizedDx = dx / distance;
        const normalizedDy = dy / distance;

        switch (enemy.type) {
            case 'blob':
                enemy.setVelocity(normalizedDx * enemy.speed, normalizedDy * enemy.speed);
                if (time % 500 < 100) enemy.setVelocity(0, 0);
                break;
            case 'spectral':
                enemy.setVelocity(normalizedDx * enemy.speed * 1.5, normalizedDy * enemy.speed * 1.5); // Faster
                break;
            case 'turret':
                enemy.setVelocity(0, 0); // Stationary
                break;
            case 'boss':
                enemy.setVelocity(normalizedDx * enemy.speed, normalizedDy * enemy.speed);
                break;
        }
    }

    shoot(direction) {
        if (this.time.now > this.lastShootTime + this.shootCooldown) {
            const speed = 300;
            const multishot = this.powerUps.has('multishot');
            const baseProjectile = this.projectiles.create(this.player.x, this.player.y, 'projectile');
            baseProjectile.damage = 10 * this.damageMultiplier;

            switch (direction) {
                case 'left': baseProjectile.setVelocityX(-speed); break;
                case 'right': baseProjectile.setVelocityX(speed); break;
                case 'up': baseProjectile.setVelocityY(-speed); break;
                case 'down': baseProjectile.setVelocityY(speed); break;
            }

            if (multishot) {
                const angles = [-0.2, 0.2];
                angles.forEach(angle => {
                    const proj = this.projectiles.create(this.player.x, this.player.y, 'projectile');
                    proj.damage = 10 * this.damageMultiplier;
                    const adjustedAngle = Phaser.Math.Angle.Between(0, 0, baseProjectile.body.velocity.x, baseProjectile.body.velocity.y) + angle;
                    proj.setVelocity(Math.cos(adjustedAngle) * speed, Math.sin(adjustedAngle) * speed);
                });
            }

            this.lastShootTime = this.time.now;
        }
    }

    shootWithMouse(pointer) {
        if (this.time.now > this.lastShootTime + this.shootCooldown) {
            const angle = Phaser.Math.Angle.Between(this.player.x, this.player.y, pointer.x, pointer.y);
            const speed = 300;
            const baseProjectile = this.projectiles.create(this.player.x, this.player.y, 'projectile');
            baseProjectile.setVelocity(Math.cos(angle) * speed, Math.sin(angle) * speed);
            baseProjectile.damage = 10 * this.damageMultiplier;

            if (this.powerUps.has('multishot')) {
                const angles = [-0.2, 0.2];
                angles.forEach(offset => {
                    const proj = this.projectiles.create(this.player.x, this.player.y, 'projectile');
                    proj.damage = 10 * this.damageMultiplier;
                    proj.setVelocity(Math.cos(angle + offset) * speed, Math.sin(angle + offset) * speed);
                });
            }

            this.lastShootTime = this.time.now;
        }
    }

    generateWorldMap() {
        this.roomMap = {};
        this.visitedRooms = {};
        this.clearedRooms.clear();
        let currentDepth = 0;
        const minPathLength = 5; // Longer paths
        const maxRooms = 12;

        this.roomMap['0,0'] = { type: 'normal', visited: false, doors: {}, depth: currentDepth, variation: Math.floor(Math.random() * 5) };

        let currentPos = { x: 0, y: 0 };
        let pathLength = 0;
        let exitRoom = null;

        const directions = [
            { x: 0, y: -1, dir: 'up', opposite: 'down' },
            { x: 1, y: 0, dir: 'right', opposite: 'left' },
            { x: 0, y: 1, dir: 'down', opposite: 'up' },
            { x: -1, y: 0, dir: 'left', opposite: 'right' }
        ];

        while (pathLength < minPathLength || (pathLength < maxRooms && Math.random() < 0.7)) {
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
                        depth: ++currentDepth,
                        variation: Math.floor(Math.random() * 5)
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

        // Add treasure and hazard rooms
        const roomKeys = Object.keys(this.roomMap);
        if (roomKeys.length > 3) {
            const treasureRoomKey = roomKeys[Math.floor(Math.random() * roomKeys.length)];
            if (this.roomMap[treasureRoomKey].type === 'normal') this.roomMap[treasureRoomKey].type = 'treasure';
            const hazardRoomKey = roomKeys[Math.floor(Math.random() * roomKeys.length)];
            if (this.roomMap[hazardRoomKey].type === 'normal') this.roomMap[hazardRoomKey].type = 'hazard';
        }

        // Branch rooms
        const branchAttempts = 5;
        for (let i = 0; i < branchAttempts; i++) {
            const randomRoom = roomKeys[Math.floor(Math.random() * roomKeys.length)];
            const [x, y] = randomRoom.split(',').map(Number);
            Phaser.Utils.Array.Shuffle(directions);
            for (const dir of directions) {
                const newX = x + dir.x;
                const newY = y + dir.y;
                const newKey = `${newX},${newY}`;
                if (!this.roomMap[newKey] && Object.keys(this.roomMap[randomRoom].doors).length < 4) {
                    this.roomMap[newKey] = {
                        type: 'normal',
                        visited: false,
                        doors: {},
                        depth: this.roomMap[randomRoom].depth + 1,
                        variation: Math.floor(Math.random() * 5)
                    };
                    this.roomMap[randomRoom].doors[dir.dir] = newKey;
                    this.roomMap[newKey].doors[dir.opposite] = randomRoom;
                    break;
                }
            }
        }
    }

    loadRoom(x, y) {
        this.enemies.clear(true, true);
        this.enemyProjectiles.clear(true, true);
        this.innerWalls.clear(true, true);
        this.walls.clear(true, true);
        this.doors.children.iterate(door => door.glowEffect?.destroy());
        this.doors.clear(true, true);
        this.projectiles.clear(true, true);
        this.hazards.clear(true, true);
        this.powerUpItems.clear(true, true);

        this.currentRoom = { x, y };
        const roomKey = `${x},${y}`;
        const room = this.roomMap[roomKey];
        room.visited = true;
        this.visitedRooms[roomKey] = true;

        this.createRoomLayout(room.variation);
        this.walls.create(400, this.playAreaY1, `wall${this.currentWorld}`).setScale(25, 1).refreshBody();
        this.walls.create(400, this.playAreaY2, `wall${this.currentWorld}`).setScale(25, 1).refreshBody();
        this.walls.create(this.playAreaX1, 300, `wall${this.currentWorld}`).setScale(1, 19).refreshBody();
        this.walls.create(this.playAreaX2, 300, `wall${this.currentWorld}`).setScale(1, 19).refreshBody();

        switch (room.type) {
            case 'shop': this.createShopRoom(); break;
            case 'boss': if (!this.clearedRooms.has(roomKey)) this.createBossRoom(); break;
            case 'normal': if (!this.clearedRooms.has(roomKey)) this.createNormalRoom(); break;
            case 'treasure': this.createTreasureRoom(); break;
            case 'hazard': this.createHazardRoom(); break;
        }

        this.createDoors(room);
        this.setupCollisions();
        this.roomActive = this.enemies.countActive() > 0;
        this.updateDoors();
        this.updateMinimap();
        this.playBackgroundMusic();
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
            case 3: // New: Maze-like
                this.innerWalls.create(300, 250, `wall${this.currentWorld}`).setScale(3, 1);
                this.innerWalls.create(500, 350, `wall${this.currentWorld}`).setScale(3, 1);
                break;
            case 4: // New: Circular
                for (let i = 0; i < 8; i++) {
                    const angle = (i / 8) * Math.PI * 2;
                    this.innerWalls.create(400 + Math.cos(angle) * 100, 300 + Math.sin(angle) * 100, `wall${this.currentWorld}`).setScale(1);
                }
                break;
        }
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
        // New: Max health upgrade
        if (!this.purchasedHealing.has(worldKey + '_max')) {
            const maxHealthButton = this.add.text(300, 400, 'Buy Max Health (30 coins)', { font: '16px Arial', fill: '#00ffff' }).setInteractive();
            maxHealthButton.on('pointerdown', () => {
                if (this.coins >= 30) {
                    this.coins -= 30;
                    this.player.maxHealth += 2;
                    this.player.health += 2;
                    this.updateHearts();
                    this.coinsText.setText(`Coins: ${this.coins}`);
                    this.purchasedHealing.add(worldKey + '_max');
                    maxHealthButton.destroy();
                }
            });
        }
    }

    createBossRoom() {
        this.isBossRoom = true;
        const boss = this.createEnemy('boss', 400, 300);
        boss.health = 100 * this.currentWorld;
        boss.setScale(1.5 + this.currentWorld * 0.2);
        this.enemies.add(boss);
        this.boss = boss;
    }

    createNormalRoom() {
        const enemyTypes = ['blob', 'spectral', 'turret'];
        const enemyCount = Phaser.Math.Between(3, 5 + this.currentWorld);
        for (let i = 0; i < enemyCount; i++) {
            const x = Phaser.Math.Between(this.playAreaX1 + 50, this.playAreaX2 - 50);
            const y = Phaser.Math.Between(this.playAreaY1 + 50, this.playAreaY2 - 50);
            const type = enemyTypes[Math.floor(Math.random() * enemyTypes.length)];
            this.enemies.add(this.createEnemy(type, x, y));
        }
        if (Math.random() < 0.3) this.spawnPowerUp();
    }

    createTreasureRoom() {
        this.showCoinDrop(400, 300);
        this.showCoinDrop(420, 320);
        this.showCoinDrop(380, 280);
        this.spawnPowerUp();
    }

    createHazardRoom() {
        const spikeCount = Phaser.Math.Between(3, 6);
        for (let i = 0; i < spikeCount; i++) {
            const x = Phaser.Math.Between(this.playAreaX1 + 50, this.playAreaX2 - 50);
            const y = Phaser.Math.Between(this.playAreaY1 + 50, this.playAreaY2 - 50);
            const spike = this.hazards.create(x, y, 'spike_trap').setScale(0.5);
            this.tweens.add({
                targets: spike,
                scale: { from: 0.5, to: 0.7 },
                duration: 500,
                yoyo: true,
                repeat: -1
            });
        }
        const enemyCount = Phaser.Math.Between(1, 3);
        for (let i = 0; i < enemyCount; i++) {
            const x = Phaser.Math.Between(this.playAreaX1 + 50, this.playAreaX2 - 50);
            const y = Phaser.Math.Between(this.playAreaY1 + 50, this.playAreaY2 - 50);
            this.enemies.add(this.createEnemy('blob', x, y));
        }
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
            const door = this.physics.add.sprite(x, y, 'door_closed');
            door.direction = direction;
            door.targetRoom = targetRoomKey;
            this.doors.add(door);
        });
    }

    updateDoors() {
        this.doors.children.iterate(door => {
            const isShop = this.roomMap[door.targetRoom].type === 'shop';
            const baseTexture = this.roomActive && !isShop ? 'door_closed' : 'door_open';
            door.setTexture(baseTexture);
            if (isShop) {
                door.setTint(0xFFD700);
                const glow = this.add.sprite(door.x, door.y, baseTexture).setTint(0xFFD700).setAlpha(0.5).setBlendMode(Phaser.BlendModes.ADD).setScale(1.2).setDepth(door.depth - 1);
                this.tweens.add({ targets: glow, alpha: { from: 0.5, to: 0.8 }, duration: 1000, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
                door.glowEffect = glow;
            }
            door.isOpen = !this.roomActive || isShop;
            if (door.doorCollider) this.physics.world.removeCollider(door.doorCollider);
            door.doorCollider = this.physics.add.collider(this.player, door, () => this.transitionToRoom(...door.targetRoom.split(',').map(Number), door.direction), () => !this.roomActive || isShop, this);
        });
    }

    setupCollisions() {
        this.physics.add.collider(this.player, this.walls);
        this.physics.add.collider(this.player, this.innerWalls);
        this.physics.add.collider(this.enemies, this.innerWalls);
        this.physics.add.collider(this.enemies, this.walls);
        this.physics.add.collider(this.projectiles, this.innerWalls, (proj) => proj.destroy());
        this.physics.add.collider(this.projectiles, this.walls, (proj) => proj.destroy());
        this.physics.add.collider(this.enemyProjectiles, this.walls, (proj) => proj.destroy());
        this.physics.add.collider(this.enemyProjectiles, this.innerWalls, (proj) => proj.destroy());
    }

    transitionToRoom(x, y, fromDirection) {
        const oppositeDirection = { 'up': 'down', 'down': 'up', 'left': 'right', 'right': 'left' };
        let playerX = 400, playerY = 300;
        switch (oppositeDirection[fromDirection]) {
            case 'up': playerY = this.playAreaY1 + 50; break;
            case 'down': playerY = this.playAreaY2 - 50; break;
            case 'left': playerX = this.playAreaX1 + 50; break;
            case 'right': playerX = this.playAreaX2 - 50; break;
        }
        this.loadRoom(x, y);
        this.player.setPosition(playerX, playerY);
    }

    createEnemy(type, x, y) {
        const enemy = this.physics.add.sprite(x, y, type);
        enemy.type = type;
        enemy.setCollideWorldBounds(true);
        switch (type) {
            case 'blob':
                enemy.health = 20 * this.currentWorld;
                enemy.speed = 50;
                enemy.shootCooldown = 2000;
                break;
            case 'spectral':
                enemy.health = 15 * this.currentWorld;
                enemy.speed = 70;
                enemy.shootCooldown = 1500;
                enemy.setAlpha(0.7); // Ghostly appearance
                break;
            case 'turret':
                enemy.health = 30 * this.currentWorld;
                enemy.speed = 0;
                enemy.shootCooldown = 1000;
                break;
            case 'boss':
                enemy.health = 100 * this.currentWorld;
                enemy.speed = 80;
                enemy.shootCooldown = 800 - this.currentWorld * 100;
                break;
        }
        enemy.lastShootTime = 0;
        return enemy;
    }

    shootEnemyProjectile(enemy) {
        const texture = enemy.type === 'boss' ? 'boss_projectile' : 'blob_projectile';
        const projectile = this.enemyProjectiles.create(enemy.x, enemy.y, texture);

        if (enemy.type === 'boss') {
            const pattern = this.currentWorld >= 3 ? 8 : this.currentWorld === 2 ? 4 : 1;
            if (pattern > 1) {
                const angles = Array.from({ length: pattern }, (_, i) => (i / pattern) * Math.PI * 2);
                angles.forEach(angle => {
                    const proj = this.enemyProjectiles.create(enemy.x, enemy.y, texture);
                    proj.setVelocity(Math.cos(angle) * 200, Math.sin(angle) * 200);
                });
            } else {
                this.physics.moveToObject(projectile, this.player, 200);
            }
        } else if (enemy.type === 'turret') {
            const angle = Phaser.Math.Angle.Between(enemy.x, enemy.y, this.player.x, this.player.y);
            projectile.setVelocity(Math.cos(angle) * 250, Math.sin(angle) * 250);
        } else {
            this.physics.moveToObject(projectile, this.player, 200);
        }
    }

    handleProjectileHit(projectile, enemy) {
        enemy.health -= projectile.damage;
        if (enemy.health <= 0) {
            this.showCoinDrop(enemy.x, enemy.y);
            this.addExperience(10 * this.currentWorld);
            this.combo++;
            this.comboTimer = this.time.now;
            this.comboText.setText(`Combo: ${this.combo}x`);
            if (enemy.type === 'boss') this.onBossDefeated();
            enemy.destroy();
        }
        projectile.destroy();
    }

    takeDamage(player) {
        if (this.time.now > player.lastDamageTime + 500 && !this.powerUps.has('shield')) {
            player.health -= 1;
            player.lastDamageTime = this.time.now;
            this.updateHearts();
            if (player.health <= 0) this.scene.start('GameOverScene');
            this.combo = 0;
            this.comboText.setText(`Combo: ${this.combo}x`);
        }
    }

    handleHazardCollision(player, hazard) {
        if (this.time.now > player.lastDamageTime + 1000) {
            this.takeDamage(player);
        }
    }

    updateHearts() {
        const fullHearts = Math.floor(this.player.health / 2);
        const halfHeart = this.player.health % 2 === 1;
        for (let i = 0; i < Math.ceil(this.player.maxHealth / 2); i++) {
            if (!this.hearts[i]) {
                const heart = this.add.image(100 + i * 48, 100, 'heart_empty');
                this.hearts.push(heart);
                this.uiContainer.add(heart);
            }
            if (i < fullHearts) this.hearts[i].setTexture('heart_full');
            else if (i === fullHearts && halfHeart) this.hearts[i].setTexture('heart_half');
            else this.hearts[i].setTexture('heart_empty');
        }
    }

    showCoinDrop(x, y) {
        const sparkle = this.add.sprite(x, y, 'gold_sparkles').setDepth(5);
        this.time.delayedCall(500, () => sparkle.destroy());
        const coinValue = 1 + Math.floor(this.combo / 5); // Combo bonus
        this.coins += coinValue;
        this.coinsText.setText(`Coins: ${this.coins}`);
    }

    spawnPowerUp() {
        const types = ['speed', 'shield', 'multishot'];
        const type = types[Math.floor(Math.random() * types.length)];
        const powerUp = this.powerUpItems.create(400, 300, `powerup_${type}`);
        powerUp.type = type;
    }

    collectPowerUp(player, powerUp) {
        this.sound.play('sfx_powerup');
        this.applyPowerUp(powerUp.type);
        this.inventory.push(powerUp.type);
        this.updateInventoryUI();
        powerUp.destroy();
    }

    applyPowerUp(type) {
        const duration = this.time.now + 10000; // 10 seconds
        this.powerUps.set(type, duration);
        switch (type) {
            case 'speed': this.player.speed = 240; break;
            case 'shield': this.player.setTint(0x00ffff); break;
            case 'multishot': break; // Handled in shoot methods
        }
    }

    removePowerUp(type) {
        this.powerUps.delete(type);
        switch (type) {
            case 'speed': this.player.speed = 160; break;
            case 'shield': this.player.clearTint(); break;
        }
    }

    addExperience(amount) {
        this.experience += amount;
        if (this.experience >= 100 * this.level) {
            this.levelUp();
        }
        this.levelText.setText(`Level: ${this.level} (XP: ${this.experience}/${100 * this.level})`);
    }

    levelUp() {
        this.level++;
        this.sound.play('sfx_levelup');
        this.player.maxHealth += 2;
        this.player.health = this.player.maxHealth;
        this.updateHearts();
        const levelUpText = this.add.text(400, 300, `Level Up! ${this.level}`, { font: '32px Arial', fill: '#00ff00' }).setOrigin(0.5);
        this.time.delayedCall(2000, () => levelUpText.destroy());
    }

    toggleInventory() {
        const isVisible = this.inventoryUI.visible;
        this.inventoryUI.setVisible(!isVisible);
        this.inventoryText.setVisible(!isVisible);
        this.inventorySlots.forEach(slot => slot.setVisible(!isVisible));
        this.updateInventoryUI();
    }

    updateInventoryUI() {
        this.inventorySlots.forEach((slot, i) => {
            slot.setText(this.inventory[i] || '');
        });
    }

    createMinimap() {
        this.minimap = this.add.graphics().setDepth(101);
        this.minimap.setPosition(650, 50);
    }

    updateMinimap() {
        this.minimap.clear();
        this.minimap.fillStyle(0x333333, 0.8);
        this.minimap.fillRect(-50, -50, 100, 100);
        Object.entries(this.roomMap).forEach(([key, room]) => {
            const [x, y] = key.split(',').map(Number);
            const relX = x - this.currentRoom.x;
            const relY = y - this.currentRoom.y;
            if (Math.abs(relX) <= 2 && Math.abs(relY) <= 2) {
                this.minimap.fillStyle(room.visited ? 0x00ff00 : 0x666666, 1);
                if (x === this.currentRoom.x && y === this.currentRoom.y) this.minimap.fillStyle(0xffff00, 1);
                this.minimap.fillRect(relX * 20 - 10, relY * 20 - 10, 15, 15);
            }
        });
    }

    playBackgroundMusic() {
        if (this.currentMusic) this.currentMusic.stop();
        const musicKey = this.isBossRoom ? 'bgm_boss' : `bgm_world${Math.min(this.currentWorld, 3)}`;
        this.currentMusic = this.sound.add(musicKey, { loop: true, volume: 0.3 });
        this.currentMusic.play();
    }

    onBossDefeated() {
        if (this.currentWorld < this.maxWorlds) {
            this.currentWorld++;
            this.worldText.setText(`World: ${this.currentWorld}`);
            this.generateWorldMap();
            const transitionText = this.add.text(400, 300, `Entering World ${this.currentWorld}!`, 
                { font: '32px Arial', fill: '#ffffff', backgroundColor: '#000000' }).setOrigin(0.5).setDepth(200);
            this.time.delayedCall(2000, () => {
                transitionText.destroy();
                this.loadRoom(0, 0);
            });
        } else {
            const victoryText = this.add.text(400, 300, 'Victory! You have conquered The Forsaken Depths!', 
                { font: '24px Arial', fill: '#ffffff', backgroundColor: '#000000' }).setOrigin(0.5).setDepth(200);
            this.time.delayedCall(5000, () => this.scene.start('TitleScene'));
        }
    }

    saveGame() {
        const saveData = {
            currentWorld: this.currentWorld,
            coins: this.coins,
            player: { health: this.player.health, maxHealth: this.player.maxHealth },
            inventory: this.inventory,
            level: this.level,
            experience: this.experience
        };
        localStorage.setItem('forsakenDepthsSave', JSON.stringify(saveData));
    }

    loadGame() {
        const saveData = JSON.parse(localStorage.getItem('forsakenDepthsSave'));
        if (saveData) {
            this.currentWorld = saveData.currentWorld;
            this.coins = saveData.coins;
            this.player.health = saveData.player.health;
            this.player.maxHealth = saveData.player.maxHealth;
            this.inventory = saveData.inventory;
            this.level = saveData.level;
            this.experience = saveData.experience;
            this.updateHearts();
            this.coinsText.setText(`Coins: ${this.coins}`);
            this.levelText.setText(`Level: ${this.level} (XP: ${this.experience}/${100 * this.level})`);
            this.worldText.setText(`World: ${this.currentWorld}`);
            this.generateWorldMap();
            this.loadRoom(0, 0);
        }
    }
}

// Game Over Scene - Enhanced with Save/Load
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

        const loadButton = this.add.text(400, 400, 'Load Game', { font: '32px Arial', fill: '#00ffff' }).setOrigin(0.5).setInteractive();
        loadButton.on('pointerdown', () => {
            const mainScene = this.scene.get('MainGameScene');
            mainScene.loadGame();
            this.scene.start('MainGameScene');
        });

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
