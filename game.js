class GameScene extends Phaser.Scene {
    constructor() {
        super({ key: 'GameScene' });
    }

    preload() {
        // Load assets
        this.load.image('player', 'assets/player.png');
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
        // Initialize player
        this.player = this.physics.add.sprite(400, 300, 'player');
        this.player.health = 6; // 3 hearts * 2 HP
        this.player.maxHealth = 6;
        this.player.lastDamageTime = 0;
        
        // Perimeter walls
        this.walls = this.physics.add.staticGroup();
        this.walls.create(400, 16, 'wall').setScale(25, 1).refreshBody(); // Top
        this.walls.create(400, 584, 'wall').setScale(25, 1).refreshBody(); // Bottom
        this.walls.create(16, 300, 'wall').setScale(1, 19).refreshBody(); // Left
        this.walls.create(784, 300, 'wall').setScale(1, 19).refreshBody(); // Right
        this.physics.add.collider(this.player, this.walls);

        // Inner walls group
        this.innerWalls = this.physics.add.staticGroup();

        // Groups
        this.enemies = this.physics.add.group();
        this.enemyProjectiles = this.physics.add.group();

        // Hearts UI
        this.hearts = [];
        for (let i = 0; i < 3; i++) {
            this.hearts.push(this.add.image(32 + i * 64, 32, 'heart_full'));
        }

        // Coin counter
        this.coins = 0;
        this.coinsText = this.add.text(16, 64, 'Coins: 0', { fontSize: '32px', fill: '#fff' });

        // Keyboard input
        this.keys = this.input.keyboard.addKeys('W,A,S,D');

        // Initial room
        this.roomActive = false;
        this.loadRoom();

        // Collisions
        this.physics.add.collider(this.player, this.enemies, (player, enemy) => {
            this.takeDamage(player);
        });
        this.physics.add.overlap(this.player, this.enemyProjectiles, (player, projectile) => {
            this.takeDamage(player);
            projectile.destroy();
        });
    }

    update(time) {
        // Player movement
        this.player.setVelocity(0);
        if (this.keys.A.isDown) this.player.setVelocityX(-160);
        if (this.keys.D.isDown) this.player.setVelocityX(160);
        if (this.keys.W.isDown) this.player.setVelocityY(-160);
        if (this.keys.S.isDown) this.player.setVelocityY(160);

        // Enemy AI
        this.enemies.children.iterate(enemy => {
            this.physics.moveToObject(enemy, this.player, enemy.speed);
            if ((enemy.type === 'blob' || enemy.type === 'boss') && time > enemy.lastShootTime + enemy.shootCooldown) {
                this.shootEnemyProjectile(enemy);
                enemy.lastShootTime = time;
            }
        });

        // Check room clear
        if (this.roomActive && this.enemies.countActive() === 0) {
            this.roomActive = false;
            if (this.door) this.door.setTexture('door_open');
        }
    }

    loadRoom() {
        // Clear previous room
        this.enemies.clear(true, true);
        this.enemyProjectiles.clear(true, true);
        this.innerWalls.clear(true, true);
        if (this.door) this.door.destroy();

        // Spawn enemies (example)
        this.enemies.add(this.createEnemy('blob', 200, 200));
        this.enemies.add(this.createEnemy('boss', 600, 400));
        this.roomActive = true;

        // Random inner walls
        for (let i = 0; i < 5; i++) {
            const x = Phaser.Math.Between(100, 700);
            const y = Phaser.Math.Between(100, 500);
            this.innerWalls.create(x, y, 'wall').setScale(2, 1).refreshBody();
        }
        this.physics.add.collider(this.player, this.innerWalls);
        this.physics.add.collider(this.enemies, this.innerWalls);

        // Door (example: south exit)
        this.door = this.physics.add.sprite(400, 568, 'door_closed');
        this.physics.add.overlap(this.player, this.door, () => {
            if (!this.roomActive) this.loadRoom(); // Simplified for demo
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
            player.health -= 1; // 1 HP damage
            player.lastDamageTime = this.time.now;
            this.updateHearts();
            if (player.health <= 0) {
                this.add.text(400, 300, 'Game Over', { fontSize: '64px', fill: '#fff' }).setOrigin(0.5);
                this.physics.pause();
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

    // Called when an enemy is defeated (not shown here, but example usage)
    showCoinDrop(x, y) {
        const sparkle = this.add.sprite(x, y, 'gold_sparkles');
        this.time.delayedCall(500, () => sparkle.destroy());
        this.coins += 1;
        this.coinsText.setText(`Coins: ${this.coins}`);
    }
}

// Game configuration
const config = {
    type: Phaser.AUTO,
    width: 800,
    height: 600,
    physics: {
        default: 'arcade',
        arcade: {
            gravity: { y: 0 },
            debug: false
        }
    },
    scene: [GameScene]
};

// Initialize the game
const game = new Phaser.Game(config);