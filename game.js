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
    }

    create() {
        this.player = this.physics.add.sprite(400, 300, 'player');
        this.player.health = 6;
        this.player.maxHealth = 6;
        this.player.lastDamageTime = 0;

        this.lastShootTime = 0;
        this.shootCooldown = 200;

        this.walls = this.physics.add.staticGroup();
        this.walls.create(400, 16, 'wall').setScale(25, 1).refreshBody();
        this.walls.create(400, 584, 'wall').setScale(25, 1).refreshBody();
        this.walls.create(16, 300, 'wall').setScale(1, 19).refreshBody();
        this.walls.create(784, 300, 'wall').setScale(1, 19).refreshBody();
        this.physics.add.collider(this.player, this.walls);

        this.innerWalls = this.physics.add.staticGroup();
        this.enemies = this.physics.add.group();
        this.enemyProjectiles = this.physics.add.group();

        // Add projectiles group here
        this.projectiles = this.physics.add.group();

        // Set up overlap detection for projectiles and enemies
        this.physics.add.overlap(this.projectiles, this.enemies, (projectile, enemy) => {
            enemy.health -= 10; // Adjust damage value as needed
            if (enemy.health <= 0) {
                this.showCoinDrop(enemy.x, enemy.y);
                enemy.destroy();
            }
            projectile.destroy();
        });
        
        this.hearts = [];
        for (let i = 0; i < 3; i++) {
            this.hearts.push(this.add.image(32 + i * 64, 32, 'heart_full'));
        }

        this.coins = 0;
        this.coinsText = this.add.text(16, 64, 'Coins: 0', { fontSize: '32px', fill: '#fff' });

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
        this.loadRoom();

        this.physics.add.collider(this.player, this.enemies, (player, enemy) => this.takeDamage(player));
        this.physics.add.overlap(this.player, this.enemyProjectiles, (player, projectile) => {
            this.takeDamage(player);
            projectile.destroy();
        });

        this.input.on('pointerdown', (pointer) => {
            this.shootWithMouse(pointer);
        });
    }

    update(time) {
        this.player.setVelocity(0);
        if (this.keyA.isDown) this.player.setVelocityX(-160);
        if (this.keyD.isDown) this.player.setVelocityX(160);
        if (this.keyW.isDown) this.player.setVelocityY(-160);
        if (this.keyS.isDown) this.player.setVelocityY(160);

        this.enemies.children.iterate(enemy => {
            if (enemy && enemy.active) {
                this.physics.moveToObject(enemy, this.player, enemy.speed);
                if ((enemy.type === 'blob' || enemy.type === 'boss') && time > enemy.lastShootTime + enemy.shootCooldown) {
                    this.shootEnemyProjectile(enemy);
                    enemy.lastShootTime = time;
                }
            }
        });

        if (this.roomActive && this.enemies.countActive() === 0) {
            this.roomActive = false;
            if (this.door) this.door.setTexture('door_open');
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

    loadRoom() {
        this.enemies.clear(true, true);
        this.enemyProjectiles.clear(true, true);
        this.innerWalls.clear(true, true);
        if (this.door) this.door.destroy();

        this.enemies.add(this.createEnemy('blob', 200, 200));
        this.enemies.add(this.createEnemy('boss', 600, 400));
        this.roomActive = true;

        for (let i = 0; i < 5; i++) {
            const x = Phaser.Math.Between(100, 700);
            const y = Phaser.Math.Between(100, 500);
            this.innerWalls.create(x, y, 'wall').setScale(2, 1).refreshBody();
        }
        this.physics.add.collider(this.player, this.innerWalls);
        this.physics.add.collider(this.enemies, this.innerWalls);
        this.physics.add.collider(this.projectiles, this.innerWalls, (projectile) => projectile.destroy());
        this.physics.add.collider(this.projectiles, this.walls, (projectile) => projectile.destroy());

        this.door = this.physics.add.sprite(400, 568, 'door_closed');
        this.physics.add.overlap(this.player, this.door, () => {
            if (!this.roomActive) this.loadRoom();
        });
    }

    createEnemy(type, x, y) {
        const enemy = this.physics.add.sprite(x, y, type);
        enemy.type = type;
        enemy.health = type === 'boss' ? 50 : 20;
        enemy.speed = type === 'boss' ? 80 : 50;
        enemy.shootCooldown = type === 'boss' ? 1000 : 2000;
        enemy.lastShootTime = 0;
        return enemy;
    }

    shootEnemyProjectile(enemy) {
        const texture = enemy.type === 'boss' ? 'boss_projectile' : 'blob_projectile';
        const projectile = this.physics.add.sprite(enemy.x, enemy.y, texture);
        this.enemyProjectiles.add(projectile);
        this.physics.moveToObject(projectile, this.player, 200);
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
        this.time.delayedCall(500, () => sparkle.destroy());
        this.coins += 1;
        this.coinsText.setText(`Coins: ${this.coins}`);
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