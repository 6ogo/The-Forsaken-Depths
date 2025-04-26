// Title Scene (Welcome Screen)
class TitleScene extends Phaser.Scene {
  constructor() {
    super({ key: "TitleScene" });
  }

  preload() {
    this.load.image("background", "assets/background.png");
    // Load sound assets
    this.load.audio('walk', 'assets/sounds/walk.wav');
    this.load.audio('dash', 'assets/sounds/dash.wav');
    this.load.audio('shot', 'assets/sounds/shot.wav');
    this.load.audio('death', 'assets/sounds/death.wav');
    this.load.audio('upgrade', 'assets/sounds/upgrade.wav');
    this.load.audio('powerup', 'assets/sounds/powerup.wav');
  }

  create() {
    // Add fullscreen button
    const fullscreenBtn = this.add
      .text(750, 50, "[ ]", { font: "24px Arial", fill: "#ffffff" })
      .setOrigin(1, 0.5)
      .setInteractive();

    fullscreenBtn.on("pointerdown", () => {
      if (this.scale.isFullscreen) {
        this.scale.stopFullscreen();
      } else {
        this.scale.startFullscreen();
      }
    });

    // Background
    const bg = this.add.image(400, 300, "background").setOrigin(0.5);
    const scaleX = this.sys.game.config.width / bg.width;
    const scaleY = this.sys.game.config.height / bg.height;
    const scale = Math.max(scaleX, scaleY);
    bg.setScale(scale);

    // Title text
    this.add
      .text(400, 100, "The Forsaken Depths", {
        font: "48px Arial",
        fill: "#ffffff",
      })
      .setOrigin(0.5);

    this.add
      .text(400, 200, "Dive into a world of mystery and danger.", {
        font: "20px Arial",
        fill: "#ffffff",
      })
      .setOrigin(0.5);

    // Device-specific controls text
    const isMobile = this.sys.game.device.os.android || this.sys.game.device.os.iOS;
    const controlText = isMobile ?
      "Left side to move, Right side to dodge\nGame auto-shoots at enemies" :
      "WASD to move, Arrows/Mouse to shoot, Space to dodge";

    this.add
      .text(400, 260, controlText, {
        font: "18px Arial",
        fill: "#ffffff",
        align: "center"
      })
      .setOrigin(0.5);

    // Start button
    const start = this.add
      .text(400, 360, "Start Game", {
        font: "32px Arial",
        fill: "#00ff00",
        backgroundColor: "#000000",
        padding: { x: 20, y: 10 }
      })
      .setOrigin(0.5)
      .setInteractive();

    start.on("pointerdown", () => this.scene.start("MainGameScene"));
    start.on("pointerover", () => start.setStyle({ fill: "#ffffff" }));
    start.on("pointerout", () => start.setStyle({ fill: "#00ff00" }));
  }
}

// Game Over Scene
class GameOverScene extends Phaser.Scene {
  constructor() {
    super({ key: "GameOverScene" });
  }

  create() {
    // Game Over text
    this.add
      .text(400, 180, "Game Over", {
        font: "48px Arial",
        fill: "#ff0000",
        stroke: '#000000',
        strokeThickness: 6
      })
      .setOrigin(0.5);

    // Continue Run button (hard mode)
    const continueBtn = this.add
      .text(400, 300, "Continue Run (Enemies are harder!)", {
        font: "28px Arial",
        fill: "#ffcc00",
        backgroundColor: "#000000",
        padding: { x: 20, y: 10 }
      })
      .setOrigin(0.5)
      .setInteractive();

    continueBtn.on("pointerdown", () => {
      this.scene.start("MainGameScene", { continueRun: true });
    });
    continueBtn.on("pointerover", () => continueBtn.setStyle({ fill: "#ffffff" }));
    continueBtn.on("pointerout", () => continueBtn.setStyle({ fill: "#ffcc00" }));

    // Restart button
    const restartBtn = this.add
      .text(400, 370, "Restart (Start from 0)", {
        font: "28px Arial",
        fill: "#00ff00",
        backgroundColor: "#000000",
        padding: { x: 20, y: 10 }
      })
      .setOrigin(0.5)
      .setInteractive();

    restartBtn.on("pointerdown", () => {
      this.scene.start("MainGameScene", { restart: true });
    });
    restartBtn.on("pointerover", () => restartBtn.setStyle({ fill: "#ffffff" }));
    restartBtn.on("pointerout", () => restartBtn.setStyle({ fill: "#00ff00" }));

    // Exit button
    const exit = this.add
      .text(400, 440, "Exit to Menu", {
        font: "28px Arial",
        fill: "#00ffff",
        backgroundColor: "#000000",
        padding: { x: 20, y: 10 }
      })
      .setOrigin(0.5)
      .setInteractive();

    exit.on("pointerdown", () => this.scene.start("TitleScene"));
    exit.on("pointerover", () => exit.setStyle({ fill: "#ffffff" }));
    exit.on("pointerout", () => exit.setStyle({ fill: "#00ffff" }));
  }
}
// Main Game Scene
class MainGameScene extends Phaser.Scene {
  constructor() {
    super({ key: "MainGameScene" });
    this.currentWorld = 1;
    this.maxWorlds = 6;
    this.currentRoom = { x: 0, y: 0 };
    this.coins = 0;
    this.damageMultiplier = 1;
    this.playerSpeed = 160;
    this.dodgeSpeed = 400;
    this.dodgeDuration = 300;
    this.upgrades = {
      hp: 0,
      damage: 0,
      speed: 0,
      doubleShot: 0,
      splitShot: 0,
      dodge: 2,
    };
    this.shopPurchases = {};
    this.invincible = false;
    this.dodgeCount = 2;
    this.dodgeCooldowns = [null, null];
    this.lastDodgeUsed = 0;
    this.isMobile = false;
    this.autoShootTimer = 0;
    this.powerupIcons = {};
    this.hardMode = false;
    this.footstepTimer = 0;
    this.worldEnemies = {
      1: ["blob", "bee", "witch"],
      2: ["quasit", "orc", "witch"],
      3: ["wizard", "shapeshifter", "witch"],
      4: ["orc", "witch", "bee"],
      5: ["shapeshifter", "orc", "quasit"],
      6: ["witch", "bee", "orc"]
    };
    this.roomActive = false;
    this.clearedRooms = new Set();
    this.visitedRooms = {};
  }

  preload() {
    // Load all game assets
    const assets = [
      "player", "projectile", "blob", "boss", "wall",
      "door", "door_closed", "boss_projectile", "blob_projectile",
      "gold_sparkles", "heart_full", "heart_half", "heart_empty",
      "background", "shapeshifter", "wizard", "quasit", "orc",
      "bee", "witch", "boss1", "boss2", "boss3", "boss4", "boss5"
    ];

    assets.forEach((key) => this.load.image(key, `assets/${key}.png`));

    // Load wall variations
    for (let i = 1; i <= 5; i++) {
      this.load.image(`wall${i}`, `assets/wall${i}.png`);
    }

    this.load.image("bg", "assets/bg.png");

    // Load powerup icons
    const powerupAssets = {
      dodge_icon: "boss_projectile",
      damage_icon: "damage_up",
      hp_icon: "health_up",
      speed_icon: "blob_projectile",
      doubleshot_icon: "blob",
      splitshot_icon: "blob_projectile"
    };

    Object.entries(powerupAssets).forEach(([key, value]) => {
      this.load.image(key, `assets/${value}.png`);
    });

    // Load sounds
    const sounds = ['walk', 'dash', 'shot', 'death', 'upgrade', 'powerup'];
    sounds.forEach(sound => {
      this.load.audio(sound, `assets/sounds/${sound}.wav`);
    });

    // Mobile controls
    this.load.image("touchstick", "assets/wall.png");
  }

  create(data) {
    // Initialize sounds
    this.sounds = {
      walk: this.sound.add('walk', { loop: false, volume: 0.3 }),
      dash: this.sound.add('dash', { loop: false, volume: 0.5 }),
      shot: this.sound.add('shot', { loop: false, volume: 0.4 }),
      death: this.sound.add('death', { loop: false, volume: 0.6 }),
      upgrade: this.sound.add('upgrade', { loop: false, volume: 0.5 }),
      powerup: this.sound.add('powerup', { loop: false, volume: 0.5 })
    };

    // Check platform
    this.isMobile = this.sys.game.device.os.android || this.sys.game.device.os.iOS;

    // Setup game area
    this.playArea = { x1: 60, y1: 60, x2: 740, y2: 540 };
    this.inTransition = false;

    // Create physics groups
    this.setupPhysicsGroups();

    // Setup player
    this.setupPlayer();

    // Input handling - IMPORTANT: Move this BEFORE createUI
    this.setupInputs();

    // Create UI - Now this comes AFTER input initialization
    this.createUI();

    // Handle game mode
    if (data?.continueRun) {
      this.hardMode = true;
      this.showTempMessage('Harder Run: Enemies have 50% more health!');
    }
    if (data?.restart) {
      this.resetUpgrades();
      this.coins = 0;
    }

    // Generate world
    this.generateWorldMap();
    this.loadRoom(0, 0);

    // Create powerup icons
    this.createPowerupIcons();

    // Initialize camera
    this.cameras.main.setZoom(1.0);
  }

  setupPhysicsGroups() {
    this.walls = this.physics.add.staticGroup();
    this.innerWalls = this.physics.add.staticGroup();
    this.doors = this.physics.add.staticGroup();
    this.enemies = this.physics.add.group();
    this.enemyProj = this.physics.add.group();
    this.projectiles = this.physics.add.group();
    this.pickups = this.physics.add.group();
  }

  setupPlayer() {
    this.player = this.physics.add.sprite(400, 300, "player").setDepth(10);
    this.player.health = 6;
    this.player.maxHealth = 6;
    this.player.lastDamageTime = 0;
    this.shootCooldown = 200;
    this.lastShootTime = 0;
    this.isDodging = false;
  }

  setupInputs() {
    this.keys = this.input.keyboard.addKeys(
      "W,A,S,D,LEFT,RIGHT,UP,DOWN,E,SPACE"
    );

    if (this.isMobile) {
      this.setupMobileControls();
    } else {
      this.input.on("pointerdown", (ptr) => this.shootMouse(ptr));
    }

    // Minimap graphics for dodge UI
    this.minimap = this.add.graphics().setDepth(100);
  }

  takeDamage() {
    if (this.invincible || this.time.now < this.player.lastDamageTime + 500) return;

    this.player.health -= 1;
    this.player.lastDamageTime = this.time.now;

    // Visual feedback
    this.player.setTint(0xff0000);

    // Flash effect
    this.time.addEvent({
      delay: 100,
      repeat: 7,
      callback: () => {
        this.player.alpha = this.player.alpha === 1 ? 0.5 : 1;
      },
      onComplete: () => {
        this.player.alpha = 1;
        if (this.player.active) this.player.clearTint();
      }
    });

    // Screen shake
    this.shake(0.005, 200);

    this.updateHearts();
    if (this.player.health <= 0) {
      this.sounds.death.play();
      this.scene.start("GameOverScene");
    }

    // Invincibility period
    this.invincible = true;
    this.time.delayedCall(800, () => {
      this.invincible = false;
    });
  }
  
  shootMouse(ptr) {
    if (this.time.now < this.lastShootTime + this.shootCooldown) return;

    const angle = Phaser.Math.Angle.Between(
      this.player.x,
      this.player.y,
      ptr.x,
      ptr.y
    );

    this.fireProjectiles(angle);
    this.lastShootTime = this.time.now;
  }

  createBossProjectile(x, y, vx, vy) {
    const proj = this.enemyProj.create(x, y, 'boss_projectile');
    proj.setVelocity(vx, vy);
    proj.setScale(1.5);
    return proj;
  }

  setupColliders() {
    // Wall collisions
    this.physics.add.collider(this.player, this.walls);
    this.physics.add.collider(this.enemies, this.walls);
    this.physics.add.collider(this.player, this.innerWalls);
    this.physics.add.collider(this.enemies, this.innerWalls);

    // Projectiles
    this.physics.add.collider(this.projectiles, this.walls, (proj) => proj.destroy());
    this.physics.add.collider(this.enemyProj, this.walls, (proj) => proj.destroy());

    // Combat
    this.physics.add.overlap(
      this.projectiles,
      this.enemies,
      this.onHitEnemy,
      null,
      this
    );

    this.physics.add.collider(
      this.player,
      this.enemies,
      (player, enemy) => {
        if (enemy.isCharging && !this.invincible) {
          this.takeDamage();
        }
      },
      null,
      this
    );

    this.physics.add.overlap(
      this.player,
      this.enemyProj,
      () => {
        if (!this.invincible) this.takeDamage();
      },
      null,
      this
    );

    // Pickups
    this.physics.add.overlap(
      this.player,
      this.pickups,
      this.onPickup,
      null,
      this
    );
  }
  
  createUI() {
    this.ui = this.add.container(0, 0).setDepth(100);

    // Hearts
    this.hearts = [];
    for (let i = 0; i < 3; i++) {
      const h = this.add.image(100 + 48 * i, 60, "heart_full");
      this.hearts.push(h);
      this.ui.add(h);
    }

    // Status text
    this.coinsText = this.add.text(100, 100, "Coins: 0", {
      font: "28px Arial",
      fill: "#fff",
    });

    this.worldText = this.add.text(100, 140, "World: 1", {
      font: "24px Arial",
      fill: "#fff",
    });

    this.ui.add([this.coinsText, this.worldText]);

    // Create prompts
    this.createPrompts();

    // Level transition text
    this.nextLevelText = this.add
      .text(400, 250, "", {
        font: "32px Arial",
        fill: "#00ff00",
        backgroundColor: "#000",
        padding: { x: 10, y: 5 },
      })
      .setOrigin(0.5);
  }

  // Dodge functionality - Moved from incorrectly being inside createUI
  performDodge() {
    if (this.isDodging || this.dodgeCount <= 0) return;

    // Set states
    this.isDodging = true;
    this.invincible = true;
    this.player.setTint(0x00ffff);
    this.dodgeCount--;
    
    // Play dash sound
    this.sounds.dash.play();

    // Track which dodge was used
    this.lastDodgeUsed = (this.upgrades.dodge - this.dodgeCount) - 1;
    this.dodgeCooldowns[this.lastDodgeUsed] = this.time.now + 4000;

    let dx = 0, dy = 0;

    if (this.isMobile) {
      if (this.isTouching) {
        const centerX = this.cameras.main.width / 4;
        const centerY = this.cameras.main.height / 2;
        dx = this.touchPosition.x - centerX;
        dy = this.touchPosition.y - centerY;

        const length = Math.sqrt(dx * dx + dy * dy);
        if (length > 0) {
          dx /= length;
          dy /= length;
        } else {
          dy = -1;
        }
      } else {
        dy = -1;
      }
    } else {
      if (this.keys.W.isDown) dy = -1;
      else if (this.keys.S.isDown) dy = 1;

      if (this.keys.A.isDown) dx = -1;
      else if (this.keys.D.isDown) dx = 1;

      if (dx === 0 && dy === 0) {
        dy = -1;
      }

      if (dx !== 0 && dy !== 0) {
        const length = Math.sqrt(dx * dx + dy * dy);
        dx /= length;
        dy /= length;
      }
    }

    this.player.setVelocity(dx * this.dodgeSpeed, dy * this.dodgeSpeed);

    this.time.delayedCall(this.dodgeDuration, () => {
      if (this.player.active) {
        this.isDodging = false;
        if (!this.keys.W.isDown && !this.keys.A.isDown &&
          !this.keys.S.isDown && !this.keys.D.isDown && !this.isTouching) {
          this.player.setVelocity(0, 0);
        }
      }
    });

    this.time.delayedCall(this.dodgeDuration, () => {
      this.invincible = false;
      if (this.player.active) {
        this.player.clearTint();
      }
    });
  }

  createPrompts() {
    const promptY = this.isMobile ? 240 : 200;

    // Door prompt
    this.doorPrompt = this.add
      .text(400, promptY, "", {
        font: "18px Arial",
        fill: "#fff",
        backgroundColor: "#333",
        padding: { x: 5, y: 2 },
      })
      .setOrigin(0.5)
      .setDepth(101)
      .setVisible(false);

    if (this.isMobile) {
      this.doorPrompt.setInteractive();
      this.doorPrompt.on('pointerdown', () => {
        this.handleDoorInteraction();
      });
    }

    // Shop prompt
    this.shopPrompt = this.add
      .text(400, promptY + 40, "", {
        font: "18px Arial",
        fill: "#fff",
        backgroundColor: "#333",
        padding: { x: 5, y: 2 },
      })
      .setOrigin(0.5)
      .setDepth(101)
      .setVisible(false);

    this.ui.add([this.doorPrompt, this.shopPrompt]);
  }

  handleDoorInteraction() {
    const doors = this.doors.getChildren();
    for (const door of doors) {
      const distance = Phaser.Math.Distance.Between(
        this.player.x, this.player.y, door.x, door.y
      );

      if (door.isOpen && this.isCrossing(door)) {
        const [nx, ny] = door.targetRoom.split(",").map(Number);
        this.transitionToRoom(nx, ny, door.direction);
        break;
      } else if (!door.isOpen && !this.roomActive && distance < 60) {
        door.setTexture("door");
        door.isOpen = true;
        if (door.collider) {
          this.physics.world.removeCollider(door.collider);
          door.collider = null;
        }
        break;
      }
    }
  }

  setupMobileControls() {
    // Left half for movement
    this.leftHalf = this.add
      .zone(0, 0, this.cameras.main.width / 2, this.cameras.main.height)
      .setOrigin(0)
      .setInteractive();

    // Touch position tracking
    this.touchPosition = { x: 0, y: 0 };
    this.isTouching = false;

    // Movement controls
    this.leftHalf.on('pointerdown', (pointer) => {
      this.isTouching = true;
      this.touchPosition.x = pointer.x;
      this.touchPosition.y = pointer.y;
    });

    this.leftHalf.on('pointermove', (pointer) => {
      if (this.isTouching && pointer.isDown) {
        this.touchPosition.x = pointer.x;
        this.touchPosition.y = pointer.y;
      }
    });

    this.leftHalf.on('pointerup', () => {
      this.isTouching = false;
    });

    // Right half for dodge
    this.rightHalf = this.add
      .zone(this.cameras.main.width / 2, 0, this.cameras.main.width / 2, this.cameras.main.height)
      .setOrigin(0)
      .setInteractive();

    this.rightHalf.on('pointerdown', () => {
      if (this.dodgeCount > 0) {
        this.performDodge();
      }
    });

    // Auto-shooting
    this.time.addEvent({
      delay: 500,
      callback: this.autoShoot,
      callbackScope: this,
      loop: true
    });

    // Touch indicators
    this.touchIndicator = this.add
      .circle(100, 450, 40, 0xffffff, 0.3)
      .setDepth(90)
      .setVisible(false);

    this.touchStick = this.add
      .circle(100, 450, 20, 0xffffff, 0.7)
      .setDepth(91)
      .setVisible(false);
  }
  
  fireProjectiles(angle) {
    const countSplit = this.upgrades.splitShot;
    const spread = Math.PI / 12;
    const angles = [];

    // Calculate split angles
    for (let i = 0; i <= countSplit; i++) {
      const offset = (i - countSplit / 2) * spread;
      angles.push(angle + offset);
    }

    // Handle double shots with delay
    if (this.upgrades.doubleShot > 0) {
      // First shot
      angles.forEach((a) => {
        const p = this.projectiles.create(
          this.player.x,
          this.player.y,
          "projectile"
        );
        p.setVelocity(Math.cos(a) * 300, Math.sin(a) * 300);
        p.damage = 10 * this.damageMultiplier;
      });

      // Second shot with delay
      this.time.delayedCall(100, () => {
        angles.forEach((a) => {
          const p = this.projectiles.create(
            this.player.x,
            this.player.y,
            "projectile"
          );
          p.setVelocity(Math.cos(a) * 300, Math.sin(a) * 300);
          p.damage = 10 * this.damageMultiplier;
        });
      });
    } else {
      // Single shot
      angles.forEach((a) => {
        const p = this.projectiles.create(
          this.player.x,
          this.player.y,
          "projectile"
        );
        p.setVelocity(Math.cos(a) * 300, Math.sin(a) * 300);
        p.damage = 10 * this.damageMultiplier;
      });
    }

    // Play shoot sound
    this.sounds.shot.play();
  }

  onBossDefeated() {
    this.clearedRooms.add(`${this.currentRoom.x},${this.currentRoom.y}`);

    // Play upgrade sound
    this.sounds.upgrade.play();

    if (this.currentWorld < this.maxWorlds) {
      this.currentWorld++;
      this.worldText.setText(`World: ${this.currentWorld}`);

      // Start the 5-second countdown
      this.nextLevelText.setText(`Going to next level in 5...`).setVisible(true);

      // Create countdown
      for (let i = 4; i >= 0; i--) {
        this.time.delayedCall((5 - i) * 1000, () => {
          if (i === 0) {
            this.nextLevelText.setVisible(false);
            this.generateWorldMap();
            this.loadRoom(0, 0);
          } else {
            this.nextLevelText.setText(`Going to next level in ${i}...`);
          }
        });
      }
    } else {
      // Victory screen
      const victory = this.add
        .text(400, 300, "Victory! You have conquered The Forsaken Depths!", {
          font: "24px Arial",
          fill: "#ffffff",
          backgroundColor: "#000000",
          padding: { x: 20, y: 10 }
        })
        .setOrigin(0.5)
        .setDepth(200);

      this.time.delayedCall(5000, () => {
        this.scene.start("TitleScene");
      });
    }
  }
  
  autoShoot() {
    if (!this.player.active || this.time.now < this.lastShootTime + this.shootCooldown) return;

    // Find closest enemy
    let closest = null;
    let minDist = 300; // Max range

    this.enemies.getChildren().forEach(enemy => {
      const dist = Phaser.Math.Distance.Between(
        this.player.x, this.player.y, enemy.x, enemy.y
      );

      if (dist < minDist) {
        minDist = dist;
        closest = enemy;
      }
    });

    // Shoot if enemy found
    if (closest) {
      const angle = Phaser.Math.Angle.Between(
        this.player.x, this.player.y, closest.x, closest.y
      );
      this.fireProjectiles(angle);
      this.lastShootTime = this.time.now;
    }
  }

  createPowerupIcons() {
    this.powerupsText = this.add.text(100, 500, "Powerups:", {
      font: "20px Arial",
      fill: "#fff"
    }).setDepth(101);

    this.ui.add(this.powerupsText);

    this.powerupContainer = this.add.container(100, 535).setDepth(101);
    this.ui.add(this.powerupContainer);
  }

  updatePowerupIcons() {
    this.powerupContainer.removeAll(true);

    const iconConfigs = [
      {
        condition: this.damageMultiplier > 1,
        count: Math.floor((this.damageMultiplier - 1) / 0.3),
        icon: "damage_icon"
      },
      {
        condition: this.playerSpeed > 160,
        count: Math.floor((this.playerSpeed - 160) / 20),
        icon: "speed_icon"
      },
      {
        condition: this.player.maxHealth > 6,
        count: Math.floor((this.player.maxHealth - 6) / 2),
        icon: "hp_icon"
      },
      {
        condition: true,
        count: this.upgrades.doubleShot,
        icon: "doubleshot_icon"
      },
      {
        condition: true,
        count: this.upgrades.splitShot,
        icon: "splitshot_icon"
      }
    ];

    let xOffset = 0;
    const gap = 40;

    iconConfigs.forEach(config => {
      if (config.condition) {
        for (let i = 0; i < config.count; i++) {
          const icon = this.add.image(xOffset, 0, config.icon).setScale(0.8);
          this.powerupContainer.add(icon);
          xOffset += gap;
        }
      }
    });

    // Handle wrapping
    if (xOffset > 300) {
      this.powerupContainer.iterate((icon, index) => {
        const row = Math.floor(index / 8);
        const col = index % 8;
        icon.setPosition(col * gap, row * gap);
      });
    }
  }
  
  generateWorldMap() {
    this.roomMap = {};
    this.visitedRooms = {};
    this.clearedRooms = new Set();

    // Create start room
    this.roomMap["0,0"] = {
      type: "start",
      doors: {},
      depth: 0,
      variation: 0
    };

    let pos = { x: 0, y: 0 };
    let len = 0;
    let exitKey = null;

    // Generate main path
    while (len < 3 || (len < 8 && Math.random() < 0.7)) {
      const dirs = Phaser.Utils.Array.Shuffle([
        { dx: 0, dy: -1, dir: "up", opp: "down" },
        { dx: 1, dy: 0, dir: "right", opp: "left" },
        { dx: 0, dy: 1, dir: "down", opp: "up" },
        { dx: -1, dy: 0, dir: "left", opp: "right" },
      ]);

      let moved = false;
      for (const d of dirs) {
        const nx = pos.x + d.dx;
        const ny = pos.y + d.dy;
        const key = `${nx},${ny}`;

        if (!this.roomMap[key]) {
          this.roomMap[key] = {
            type: "normal",
            doors: {},
            depth: len + 1,
            variation: Phaser.Math.Between(0, 2),
          };

          this.roomMap[`${pos.x},${pos.y}`].doors[d.dir] = key;
          this.roomMap[key].doors[d.opp] = `${pos.x},${pos.y}`;
          pos = { x: nx, y: ny };
          len++;
          exitKey = key;
          moved = true;
          break;
        }
      }
      if (!moved) break;
    }

    // Set boss room
    if (exitKey) this.roomMap[exitKey].type = "boss";

    // Add shop
    const normals = Object.keys(this.roomMap).filter(
      (k) => this.roomMap[k].type === "normal"
    );
    if (normals.length) {
      this.roomMap[Phaser.Utils.Array.GetRandom(normals)].type = "shop";
    }

    // Add branches
    for (let i = 0; i < 3; i++) {
      const keys = Object.keys(this.roomMap);
      const base = Phaser.Utils.Array.GetRandom(keys);
      const [bx, by] = base.split(",").map(Number);

      const dirs = Phaser.Utils.Array.Shuffle([
        { dx: 0, dy: -1, dir: "up", opp: "down" },
        { dx: 1, dy: 0, dir: "right", opp: "left" },
        { dx: 0, dy: 1, dir: "down", opp: "up" },
        { dx: -1, dy: 0, dir: "left", opp: "right" },
      ]);

      for (const d of dirs) {
        const nx = bx + d.dx;
        const ny = by + d.dy;
        const key = `${nx},${ny}`;

        if (!this.roomMap[key] &&
          Object.keys(this.roomMap[base].doors).length < 3) {
          this.roomMap[key] = {
            type: "normal",
            doors: {},
            depth: this.roomMap[base].depth + 1,
            variation: Phaser.Math.Between(0, 2),
          };
          this.roomMap[base].doors[d.dir] = key;
          this.roomMap[key].doors[d.opp] = base;
          break;
        }
      }
    }
  }

  loadRoom(x, y) {
    // Clear old room
    if (this.shopIcons) {
      this.shopIcons.forEach((icon) => icon.sprite.destroy());
      this.shopIcons = null;
    }

    this.enemies.clear(true, true);
    this.enemyProj.clear(true, true);
    this.innerWalls.clear(true, true);
    this.walls.clear(true, true);
    this.doors.clear(true, true);
    this.projectiles.clear(true, true);
    this.pickups.clear(true, true);

    this.inTransition = false;
    this.currentRoom = { x, y };

    const key = `${x},${y}`;
    this.roomMap[key].visited = true;
    this.visitedRooms[key] = true;

    // Create room layout
    if (this.roomMap[key].type !== "shop") {
      this.createRoomLayout(key);
    }

    // Setup room based on type
    switch (this.roomMap[key].type) {
      case "shop":
        this.createShopRoom();
        break;
      case "boss":
        if (!this.clearedRooms.has(key)) this.createBossRoom();
        break;
      case "normal":
        if (!this.clearedRooms.has(key)) this.createNormalRoom();
        break;
    }

    this.createDoors(this.roomMap[key]);
    this.setupColliders();
    this.roomActive = this.enemies.countActive() > 0;
    this.updateMinimap();
  }

  createRoomLayout(key) {
    // Set background
    if (this.background) this.background.destroy();
    this.background = this.add.image(400, 300, "bg").setDepth(-10);
    this.background.setScale(1.5);

    const { x1, y1, x2, y2 } = this.playArea;
    const wallType = `wall${this.currentWorld}`;

    // Base walls
    if (!this.roomMap[key].doors?.up) {
      this.walls.create(400, y1, wallType).setScale(10, 1).refreshBody();
    }
    if (!this.roomMap[key].doors?.down) {
      this.walls.create(400, y2, wallType).setScale(10, 1).refreshBody();
    }
    if (!this.roomMap[key].doors?.left) {
      this.walls.create(x1, 300, wallType).setScale(1, 10).refreshBody();
    }
    if (!this.roomMap[key].doors?.right) {
      this.walls.create(x2, 300, wallType).setScale(1, 10).refreshBody();
    }

    // Add room variations
    const variation = this.roomMap[key].variation;
    switch (variation) {
      case 1:
        // Cross pattern
        this.innerWalls.create(400, 300, wallType)
          .setScale(6, 0.5)
          .refreshBody();
        this.innerWalls.create(400, 300, wallType)
          .setScale(0.5, 6)
          .refreshBody();
        break;
      case 2:
        // Corner blocks
        this.innerWalls.create(200, 200, wallType)
          .setScale(2, 2)
          .refreshBody();
        this.innerWalls.create(600, 200, wallType)
          .setScale(2, 2)
          .refreshBody();
        this.innerWalls.create(200, 400, wallType)
          .setScale(2, 2)
          .refreshBody();
        this.innerWalls.create(600, 400, wallType)
          .setScale(2, 2)
          .refreshBody();
        break;
    }
  }

  createDoors(room) {
    const { x1, y1, x2, y2 } = this.playArea;
    const doors = room.doors;

    Object.entries(doors).forEach(([direction, targetRoom]) => {
      let x = 400, y = 300;
      switch (direction) {
        case 'up': y = y1; break;
        case 'down': y = y2; break;
        case 'left': x = x1; break;
        case 'right': x = x2; break;
      }

      const door = this.doors.create(x, y, "door").setDepth(2);
      door.direction = direction;
      door.targetRoom = targetRoom;
      door.isOpen = !this.roomActive;
    });
  }

  createNormalRoom() {
    // Get enemies for current world
    const possibleEnemies = this.worldEnemies[this.currentWorld];
    const enemyCount = Phaser.Math.Between(3, 5);

    for (let i = 0; i < enemyCount; i++) {
      const enemyType = Phaser.Utils.Array.GetRandom(possibleEnemies);
      const angle = (i / enemyCount) * Math.PI * 2;
      const radius = 150;
      const x = 400 + Math.cos(angle) * radius;
      const y = 300 + Math.sin(angle) * radius;

      this.createEnemy(x, y, enemyType);
    }
  }

  createEnemy(x, y, type) {
    const enemy = this.enemies.create(x, y, type);

    // Base stats
    const baseStats = {
      blob: { health: 30, speed: 100, shootCooldown: 2000 },
      wizard: { health: 40, speed: 80, shootCooldown: 1500 },
      shapeshifter: { health: 50, speed: 120, shootCooldown: 2500 },
      orc: { health: 60, speed: 90, shootCooldown: 0 },
      bee: { health: 25, speed: 150, shootCooldown: 0 },
      witch: { health: 45, speed: 85, shootCooldown: 1800 }
    };

    const stats = baseStats[type];

    enemy.health = this.hardMode ?
      Math.ceil(stats.health * 1.5) :
      stats.health;
    enemy.speed = stats.speed;
    enemy.type = type;
    enemy.shootCooldown = stats.shootCooldown;
    enemy.lastShootTime = 0;
    enemy.isPreparingCharge = false;
    enemy.isCharging = false;

    return enemy;
  }
  
  updateEnemy(enemy, time) {
    if (enemy.isPreparingCharge || enemy.isCharging) {
      this.processChargingState(enemy, time);
      return;
    }

    const dx = this.player.x - enemy.x;
    const dy = this.player.y - enemy.y;
    const dist = Math.hypot(dx, dy) || 1;

    switch (enemy.type) {
      case "boss":
        // Handle boss behavior
        if (enemy.updateAttack) {
          enemy.updateAttack(time);
        }
        break;

      case "wizard":
        // Keep distance and shoot
        if (dist < 150) {
          enemy.setVelocity((-dx / dist) * enemy.speed, (-dy / dist) * enemy.speed);
        } else if (dist > 250) {
          enemy.setVelocity((dx / dist) * enemy.speed * 0.5, (dy / dist) * enemy.speed * 0.5);
        } else {
          enemy.setVelocity(0, 0);
        }

        if (time > enemy.lastShootTime + enemy.shootCooldown) {
          this.shootEnemyProjectile(enemy);
          enemy.lastShootTime = time;
        }
        break;

      case "witch":
        // Teleport and shoot
        if (time > enemy.lastShootTime + enemy.shootCooldown) {
          if (Math.random() < 0.3) {
            const angle = Math.random() * Math.PI * 2;
            const radius = Phaser.Math.Between(100, 200);
            enemy.x = this.player.x + Math.cos(angle) * radius;
            enemy.y = this.player.y + Math.sin(angle) * radius;
          }
          this.shootEnemyProjectile(enemy);
          enemy.lastShootTime = time;
        }
        break;

      case "shapeshifter":
        // Random behaviors
        if (!enemy.behaviorTimer || time > enemy.behaviorTimer) {
          enemy.behavior = Phaser.Math.Between(0, 2);
          enemy.behaviorTimer = time + 3000;
        }

        switch (enemy.behavior) {
          case 0: // Chase
            enemy.setVelocity((dx / dist) * enemy.speed, (dy / dist) * enemy.speed);
            break;
          case 1: // Circle
            const angle = time * 0.003;
            enemy.setVelocity(
              Math.cos(angle) * enemy.speed,
              Math.sin(angle) * enemy.speed
            );
            break;
          case 2: // Shoot
            enemy.setVelocity(0, 0);
            if (time > enemy.lastShootTime + enemy.shootCooldown) {
              this.shootEnemyProjectile(enemy);
              enemy.lastShootTime = time;
            }
            break;
        }
        break;

      default:
        // Basic chase and shoot behavior
        enemy.setVelocity((dx / dist) * enemy.speed, (dy / dist) * enemy.speed);
        if (enemy.shootCooldown && time > enemy.lastShootTime + enemy.shootCooldown) {
          this.shootEnemyProjectile(enemy);
          enemy.lastShootTime = time;
        }
    }
  }

  createBossRoom() {
    const bossTypes = {
      1: {
        sprite: 'boss1',
        health: 200,
        speed: 80,
        pattern: 'circle',
        attackDelay: 2000,
        projectileSpeed: 150
      },
      2: {
        sprite: 'boss2',
        health: 250,
        speed: 90,
        pattern: 'charge',
        attackDelay: 2500,
        projectileSpeed: 180
      },
      3: {
        sprite: 'boss3',
        health: 300,
        speed: 100,
        pattern: 'split',
        attackDelay: 3000,
        projectileSpeed: 200
      },
      4: {
        sprite: 'boss4',
        health: 350,
        speed: 110,
        pattern: 'spiral',
        attackDelay: 2800,
        projectileSpeed: 220
      },
      5: {
        sprite: 'boss5',
        health: 400,
        speed: 120,
        pattern: 'waves',
        attackDelay: 2600,
        projectileSpeed: 240
      }
    };

    const bossConfig = bossTypes[this.currentWorld];
    const boss = this.enemies.create(400, 300, bossConfig.sprite);
    boss.setScale(2);
    boss.health = this.hardMode ? Math.ceil(bossConfig.health * 1.5) : bossConfig.health;
    boss.speed = bossConfig.speed;
    boss.type = 'boss';
    boss.pattern = bossConfig.pattern;
    boss.attackDelay = bossConfig.attackDelay;
    boss.projectileSpeed = bossConfig.projectileSpeed;
    boss.lastAttackTime = 0;
    boss.attackPhase = 0;

    boss.updateAttack = (time) => {
      if (time < boss.lastAttackTime + boss.attackDelay) return;

      boss.lastAttackTime = time;
      const intensity = 0.008;
      const duration = 300;

      switch (boss.pattern) {
        case 'circle':
          for (let i = 0; i < 8; i++) {
            const angle = (i / 8) * Math.PI * 2 + boss.attackPhase;
            this.createBossProjectile(
              boss.x,
              boss.y,
              Math.cos(angle) * boss.projectileSpeed,
              Math.sin(angle) * boss.projectileSpeed
            );
          }
          boss.attackPhase += Math.PI / 16;
          this.shake(intensity, duration);
          break;

        case 'charge':
          const chargeSpeed = boss.speed * 3;
          const dx = this.player.x - boss.x;
          const dy = this.player.y - boss.y;
          const dist = Math.hypot(dx, dy) || 1;
          boss.setVelocity(
            (dx / dist) * chargeSpeed,
            (dy / dist) * chargeSpeed
          );
          this.shake(intensity * 0.7, duration);
          break;

        case 'split':
          const angles = [0, Math.PI / 2, Math.PI, 3 * Math.PI / 2];
          angles.forEach(angle => {
            const proj = this.createBossProjectile(
              boss.x,
              boss.y,
              Math.cos(angle) * boss.projectileSpeed,
              Math.sin(angle) * boss.projectileSpeed
            );

            this.time.delayedCall(1000, () => {
              if (proj.active) {
                for (let i = 0; i < 3; i++) {
                  const splitAngle = angle + (i - 1) * Math.PI / 4;
                  this.createBossProjectile(
                    proj.x,
                    proj.y,
                    Math.cos(splitAngle) * boss.projectileSpeed * 0.7,
                    Math.sin(splitAngle) * boss.projectileSpeed * 0.7
                  );
                }
                proj.destroy();
              }
            });
          });
          this.shake(intensity * 0.5, duration);
          break;

        case 'spiral':
          const spiralCount = 3;
          for (let i = 0; i < spiralCount; i++) {
            const spiralAngle = boss.attackPhase + (i * Math.PI * 2 / spiralCount);
            this.createBossProjectile(
              boss.x,
              boss.y,
              Math.cos(spiralAngle) * boss.projectileSpeed,
              Math.sin(spiralAngle) * boss.projectileSpeed
            );
          }
          boss.attackPhase += Math.PI / 8;
          this.shake(intensity * 0.3, duration);
          break;

        case 'waves':
          const waveCount = 5;
          const spread = Math.PI / 3;
          const baseAngle = Math.atan2(
            this.player.y - boss.y,
            this.player.x - boss.x
          );

          for (let i = 0; i < waveCount; i++) {
            const offset = (i - (waveCount - 1) / 2) * (spread / (waveCount - 1));
            const angle = baseAngle + offset;
            this.createBossProjectile(
              boss.x,
              boss.y,
              Math.cos(angle) * boss.projectileSpeed,
              Math.sin(angle) * boss.projectileSpeed
            );
          }
          this.shake(intensity * 0.6, duration);
          break;
      }
    };
  }

  shootEnemyProjectile(enemy) {
    const angle = Phaser.Math.Angle.Between(
      enemy.x, enemy.y,
      this.player.x, this.player.y
    );

    const speed = enemy.type === 'wizard' ? 200 : 150;
    const scale = enemy.type === 'witch' ? 1.5 : 1;

    const proj = this.enemyProj.create(enemy.x, enemy.y, 'blob_projectile');
    proj.setVelocity(
      Math.cos(angle) * speed,
      Math.sin(angle) * speed
    );
    proj.setScale(scale);
  }

  onHitEnemy(proj, enemy) {
    // Visual feedback
    enemy.setTint(0xff0000);
    this.time.delayedCall(100, () => {
      if (enemy.active) enemy.clearTint();
    });

    // Apply damage
    enemy.health -= proj.damage;
    proj.destroy();

    if (enemy.health <= 0) {
      // Drop rewards
      if (enemy.type === "boss") {
        this.dropRandomUpgrade(enemy.x, enemy.y);
        this.onBossDefeated();
        this.sounds.upgrade.play();
      } else {
        this.coins++;
        this.coinsText.setText(`Coins: ${this.coins}`);
      }
      enemy.destroy();
    }
  }

  processChargingState(enemy, time) {
    if (enemy.isPreparingCharge) {
      if (time > enemy.chargeStartTime + enemy.chargeDuration) {
        enemy.isPreparingCharge = false;
        enemy.isCharging = true;
        enemy.chargeEndTime = time + 500;

        const dx = this.player.x - enemy.x;
        const dy = this.player.y - enemy.y;
        const dist = Math.hypot(dx, dy) || 1;

        const chargeSpeed = enemy.type === "boss" ? 300 : 250;
        enemy.setVelocity(
          (dx / dist) * chargeSpeed,
          (dy / dist) * chargeSpeed
        );

        enemy.setTint(0xff0000);
      }
    } else if (enemy.isCharging) {
      if (time > enemy.chargeEndTime) {
        enemy.isCharging = false;
        enemy.clearTint();
        enemy.lastShootTime = time;
      }
    }
  }

  dropRandomUpgrade(x, y) {
    const types = ["hp", "damage", "speed", "doubleShot", "splitShot", "dodge"];
    const choice = Phaser.Utils.Array.GetRandom(types);
    const keyMap = {
      hp: "hp_icon",
      damage: "damage_icon",
      speed: "speed_icon",
      doubleShot: "doubleshot_icon",
      splitShot: "splitshot_icon",
      dodge: "dodge_icon"
    };

    const pickup = this.pickups.create(x, y, keyMap[choice]);
    pickup.upgradeType = choice;

    this.tweens.add({
      targets: pickup,
      scale: 1.2,
      yoyo: true,
      repeat: -1,
      duration: 500
    });
  }

  onPickup(player, pickup) {
    this.sounds.powerup.play();

    switch (pickup.upgradeType) {
      case "hp":
        this.player.maxHealth += 2;
        this.player.health = Math.min(this.player.health + 2, this.player.maxHealth);
        this.upgrades.hp++;
        break;
      case "damage":
        this.damageMultiplier += 0.3;
        this.upgrades.damage++;
        break;
      case "speed":
        this.playerSpeed += 20;
        this.upgrades.speed++;
        break;
      case "doubleShot":
        this.upgrades.doubleShot++;
        break;
      case "splitShot":
        this.upgrades.splitShot++;
        break;
      case "dodge":
        this.upgrades.dodge++;
        this.dodgeCount++;
        break;
    }

    this.updateHearts();
    this.updatePowerupIcons();
    pickup.destroy();
  }

  createShopRoom() {
    const shopItems = [
      { key: 'hp', name: 'Max Health +2', icon: 'hp_icon', cost: 5, type: 'upgrade', desc: '+2 max health' },
      { key: 'damage', name: 'Damage Up', icon: 'damage_icon', cost: 10, type: 'upgrade', desc: '+0.3 damage' },
      { key: 'speed', name: 'Speed Up', icon: 'speed_icon', cost: 5, type: 'upgrade', desc: '+20 speed' },
      { key: 'doubleShot', name: 'Double Shot', icon: 'doubleshot_icon', cost: 10, type: 'upgrade', desc: 'Shoot 2 at once' },
      { key: 'splitShot', name: 'Split Shot', icon: 'splitshot_icon', cost: 10, type: 'upgrade', desc: 'Spread shot' },
      { key: 'dodge', name: 'Extra Dodge', icon: 'dodge_icon', cost: 5, type: 'upgrade', desc: '+1 dodge' },
      { key: 'heal', name: 'Health Potion', icon: 'hp_icon', cost: 5, type: 'consumable', desc: 'Restore 2 health' }
    ];

    // Random selection
    const selection = Phaser.Utils.Array.Shuffle(shopItems).slice(0, 3);
    this.shopIcons = [];

    selection.forEach((item, i) => {
      const x = 300 + i * 100;
      const y = 250;

      const sprite = this.add.image(x, y, item.icon)
        .setScale(2)
        .setInteractive();

      const text = this.add.text(x, y + 50,
        `${item.name}\n${item.cost} coins`, {
        font: '16px Arial',
        fill: '#fff',
        align: 'center'
      }).setOrigin(0.5);

      const desc = this.add.text(x, y + 75,
        item.desc, {
        font: '12px Arial',
        fill: '#aaa',
        align: 'center'
      }).setOrigin(0.5);

      sprite.on('pointerdown', () => {
        if (this.coins >= item.cost) {
          this.coins -= item.cost;
          this.coinsText.setText(`Coins: ${this.coins}`);

          if (item.type === 'upgrade') {
            this.onPickup(this.player, {
              upgradeType: item.key,
              destroy: () => { }
            });
          } else if (item.type === 'consumable') {
            this.player.health = Math.min(
              this.player.maxHealth,
              this.player.health + 2
            );
            this.updateHearts();
            this.showTempMessage('Healed 2 health!');
            this.sounds.powerup.play();
          }

          sprite.destroy();
          text.destroy();
          desc.destroy();
        } else {
          this.showTempMessage('Not enough coins!');
        }
      });

      this.shopIcons.push({ sprite, text, desc });
    });

    if (!this.shopPrompt.visible) {
      this.shopPrompt.setText('Shop: Click an item to buy')
        .setPosition(400, 180)
        .setVisible(true);
    }
  }

  showTempMessage(text) {
    const msg = this.add
      .text(400, 150, text, {
        font: "24px Arial",
        fill: "#ff0000",
        backgroundColor: "#000",
        padding: { x: 30, y: 10 },
        align: 'center'
      })
      .setOrigin(0.5)
      .setDepth(200);

    this.time.delayedCall(4000, () => msg.destroy());
  }

  // Screen shake effect
  shake(intensity = 0.005, duration = 100) {
    this.cameras.main.shake(duration, intensity);
  }

  updateHearts() {
    const full = Math.floor(this.player.health / 2);
    const half = this.player.health % 2 === 1;

    this.hearts.forEach((h, i) => {
      if (i < full) h.setTexture("heart_full");
      else if (i === full && half) h.setTexture("heart_half");
      else h.setTexture("heart_empty");
    });
  }

  resetUpgrades() {
    this.upgrades = {
      hp: 0,
      damage: 0,
      speed: 0,
      doubleShot: 0,
      splitShot: 0,
      dodge: 2
    };
    this.damageMultiplier = 1;
    this.playerSpeed = 160;
    this.dodgeCount = 2;
    this.dodgeCooldowns = [null, null];
  }
  
  handleDoorPrompt(door) {
    if (door.isOpen) {
      this.doorPrompt.setText("Press E to enter")
        .setPosition(door.x, door.y - 40)
        .setVisible(true);

      if (this.keys.E.isDown || this.isCrossing(door)) {
        const [nx, ny] = door.targetRoom.split(",").map(Number);
        this.transitionToRoom(nx, ny, door.direction);
      }
    } else if (!this.roomActive) {
      door.setTexture("door");
      door.isOpen = true;
      if (door.collider) {
        this.physics.world.removeCollider(door.collider);
        door.collider = null;
      }
    }
  }

  isCrossing(door) {
    const threshold = 20;
    switch (door.direction) {
      case "up":
        return this.player.y < door.y && Math.abs(this.player.x - door.x) < threshold;
      case "down":
        return this.player.y > door.y && Math.abs(this.player.x - door.x) < threshold;
      case "left":
        return this.player.x < door.x && Math.abs(this.player.y - door.y) < threshold;
      case "right":
        return this.player.x > door.x && Math.abs(this.player.y - door.y) < threshold;
    }
    return false;
  }

  transitionToRoom(x, y, direction) {
    if (this.inTransition) return;
    this.inTransition = true;

    // Calculate new player position
    const { x1, y1, x2, y2 } = this.playArea;
    let playerX = this.player.x;
    let playerY = this.player.y;

    switch (direction) {
      case "up":
        playerY = y2 - 80;
        break;
      case "down":
        playerY = y1 + 80;
        break;
      case "left":
        playerX = x2 - 80;
        break;
      case "right":
        playerX = x1 + 80;
        break;
    }

    // Fade transition
    this.cameras.main.fade(250, 0, 0, 0);
    this.time.delayedCall(250, () => {
      this.loadRoom(x, y);
      this.player.setPosition(playerX, playerY);
      this.cameras.main.fadeIn(250);
      this.time.delayedCall(250, () => {
        this.inTransition = false;
      });
    });
  }

  openAllDoors() {
    this.doors.children.iterate(door => {
      door.setTexture("door");
      door.isOpen = true;
      if (door.collider) {
        this.physics.world.removeCollider(door.collider);
        door.collider = null;
      }
    });
  }

  updateMinimap() {
    if (!this.minimapObj) {
      this.minimapObj = this.add.graphics().setDepth(100);
    } else {
      this.minimapObj.clear();
    }

    const keys = Object.keys(this.roomMap);
    const coords = keys.map(k => k.split(",").map(Number));
    const xs = coords.map(c => c[0]);
    const ys = coords.map(c => c[1]);

    const minX = Math.min(...xs);
    const minY = Math.min(...ys);
    const cell = 8;
    const pad = 2;
    const originX = 700;
    const originY = 50;

    keys.forEach(k => {
      const [rx, ry] = k.split(",").map(Number);
      const px = originX + (rx - minX) * (cell + pad);
      const py = originY + (ry - minY) * (cell + pad);

      this.minimapObj.lineStyle(1, 0xffffff);
      this.minimapObj.strokeRect(px, py, cell, cell);

      if (this.visitedRooms[k]) {
        this.minimapObj.fillStyle(0xffffff, 1);
        this.minimapObj.fillRect(px, py, cell, cell);
      }

      if (rx === this.currentRoom.x && ry === this.currentRoom.y) {
        this.minimapObj.lineStyle(2, 0xff0000);
        this.minimapObj.strokeRect(px - 1, py - 1, cell + 2, cell + 2);
      }
    });
  }
  
  update(time, delta) {
    if (!this.player.active) return;

    // Handle player movement
    if (!this.isDodging) {
      let dx = 0, dy = 0;

      if (this.isMobile) {
        if (this.isTouching) {
          const centerX = this.cameras.main.width / 4;
          const centerY = this.cameras.main.height / 2;
          dx = this.touchPosition.x - centerX;
          dy = this.touchPosition.y - centerY;

          const length = Math.sqrt(dx * dx + dy * dy);
          if (length > 10) {
            dx = dx / length;
            dy = dy / length;
            
            // Show touch indicator
            this.touchIndicator.setPosition(centerX, centerY).setVisible(true);
            this.touchStick.setPosition(
              centerX + dx * 30,
              centerY + dy * 30
            ).setVisible(true);
          } else {
            dx = 0;
            dy = 0;
          }
        } else {
          this.touchIndicator.setVisible(false);
          this.touchStick.setVisible(false);
        }
      } else {
        if (this.keys.W.isDown) dy = -1;
        else if (this.keys.S.isDown) dy = 1;

        if (this.keys.A.isDown) dx = -1;
        else if (this.keys.D.isDown) dx = 1;
      }

      if (dx !== 0 || dy !== 0) {
        if (dx !== 0 && dy !== 0) {
          const length = Math.sqrt(dx * dx + dy * dy);
          dx /= length;
          dy /= length;
        }

        this.player.setVelocity(dx * this.playerSpeed, dy * this.playerSpeed);

        // Play walking sound occasionally
        if (time > this.footstepTimer + 300) {
          this.sounds.walk.play();
          this.footstepTimer = time;
        }
      } else {
        this.player.setVelocity(0, 0);
      }

      // Handle keyboard shooting
      if (!this.isMobile && 
          (this.keys.LEFT.isDown || this.keys.RIGHT.isDown || 
           this.keys.UP.isDown || this.keys.DOWN.isDown)) {
        if (time > this.lastShootTime + this.shootCooldown) {
          let shootDx = 0, shootDy = 0;
          
          if (this.keys.LEFT.isDown) shootDx = -1;
          else if (this.keys.RIGHT.isDown) shootDx = 1;
          
          if (this.keys.UP.isDown) shootDy = -1;
          else if (this.keys.DOWN.isDown) shootDy = 1;
          
          const angle = Math.atan2(shootDy, shootDx);
          this.fireProjectiles(angle);
          this.lastShootTime = time;
        }
      }

      // Handle dodge with space key
      if (!this.isMobile && this.keys.SPACE.isDown && this.dodgeCount > 0) {
        this.performDodge();
      }
    }

    // Update enemies
    this.enemies.getChildren().forEach(enemy => {
      this.updateEnemy(enemy, time);
    });

    // Check for door interactions
    const doors = this.doors.getChildren();
    for (const door of doors) {
      const distance = Phaser.Math.Distance.Between(
        this.player.x, this.player.y, door.x, door.y
      );

      if (!this.isMobile && distance < 60) {
        this.handleDoorPrompt(door);
        break;
      } else {
        this.doorPrompt.setVisible(false);
      }
    }

    // Clear room when all enemies defeated
    if (this.roomActive && this.enemies.countActive() === 0) {
      this.roomActive = false;
      this.openAllDoors();
      this.clearedRooms.add(`${this.currentRoom.x},${this.currentRoom.y}`);
    }

    // Update dodge cooldowns
    for (let i = 0; i < this.upgrades.dodge; i++) {
      if (this.dodgeCooldowns[i] && time > this.dodgeCooldowns[i]) {
        if (this.dodgeCount < this.upgrades.dodge) {
          this.dodgeCount++;
        }
        this.dodgeCooldowns[i] = null;
      }
    }

    // Draw dodge UI
    this.drawDodgeUI(time);
  }

  drawDodgeUI(time) {
    this.minimap.clear();
    const x = 400;
    const y = 550;
    const radius = 15;
    const gap = 40;

    for (let i = 0; i < this.upgrades.dodge; i++) {
      const dx = x + (i - this.upgrades.dodge / 2 + 0.5) * gap;
      
      if (i < this.dodgeCount) {
        // Available dodge
        this.minimap.fillStyle(0x00ffff, 1);
        this.minimap.fillCircle(dx, y, radius);
      } else {
        // Cooldown dodge
        const cooldown = this.dodgeCooldowns[i];
        if (cooldown) {
          const progress = Math.min(1, (cooldown - time) / 4000);
          
          // Background
          this.minimap.fillStyle(0x555555, 1);
          this.minimap.fillCircle(dx, y, radius);
          
          // Cooldown pie
          this.minimap.fillStyle(0x00ffff, 0.7);
          this.minimap.slice(
            dx, y, radius,
            -Math.PI / 2,
            -Math.PI / 2 + (1 - progress) * Math.PI * 2,
            true
          );
        }
      }
      
      // Outline
      this.minimap.lineStyle(2, 0xffffff, 1);
      this.minimap.strokeCircle(dx, y, radius);
    }
  }
}

// Game Configuration
var config = {
  type: Phaser.AUTO,
  width: 800,
  height: 600,
  scene: [TitleScene, MainGameScene, GameOverScene],
  physics: {
    default: "arcade",
    arcade: {
      gravity: { y: 0 },
      debug: false
    }
  },
  parent: "game-container",
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH
  }
};

// Start the game when window loads
window.onload = () => new Phaser.Game(config);