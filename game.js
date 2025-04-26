// Title Scene (Welcome Screen)
class TitleScene extends Phaser.Scene {
    constructor() {
      super({ key: "TitleScene" });
    }
    preload() {
      this.load.image("background", "assets/background.png");
    }
    create() {
      // Handle fullscreen
      this.scale.startFullscreen();
      
      // Dynamically scale background to fill canvas
      const bg = this.add.image(400, 300, "background").setOrigin(0.5);
      const scaleX = this.sys.game.config.width / bg.width;
      const scaleY = this.sys.game.config.height / bg.height;
      const scale = Math.max(scaleX, scaleY);
      bg.setScale(scale);
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
        
      // Different instructions based on device
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
  
      const start = this.add
        .text(400, 360, "Start Game", { font: "32px Arial", fill: "#00ff00" })
        .setOrigin(0.5)
        .setInteractive();
      start.on("pointerdown", () => this.scene.start("MainGameScene"));
      start.on("pointerover", () => start.setStyle({ fill: "#ffffff" }));
      start.on("pointerout", () => start.setStyle({ fill: "#00ff00" }));
    }
  }
  
  // Main Gameplay Scene
  class MainGameScene extends Phaser.Scene {
    constructor() {
      super({ key: "MainGameScene" });
      this.currentWorld = 1;
      this.maxWorlds = 6;
      this.currentRoom = { x: 0, y: 0 };
      this.coins = 0;
      this.damageMultiplier = 1;
      this.playerSpeed = 160;
      this.dodgeSpeed = 400; // Speed boost during dodge
      this.dodgeDuration = 300; // Duration of dodge in milliseconds
      this.upgrades = {
        hp: 0,
        damage: 0,
        speed: 0,
        doubleShot: 0,
        splitShot: 0,
        dodge: 2, // Start with 2 dodges
      };
      this.shopPurchases = {};
      this.invincible = false;
      this.dodgeCount = 2; // Start with 2 dodges available
      this.dodgeCooldowns = [null, null]; // Track cooldowns for each dodge
      this.lastDodgeUsed = 0; // Track which dodge was used last (1 = rightmost, 0 = leftmost)
      this.isMobile = false;
      this.autoShootTimer = 0;
      this.powerupIcons = {}; // To store powerup icons in the UI
      this.hardMode = false; // Track hard mode
      // Enemy types per world
      this.worldEnemies = {
        1: ["blob", "bee", "witch"],
        2: ["quasit", "orc", "witch"],
        3: ["wizard", "shapeshifter", "witch"],
        4: ["orc", "witch", "bee"],
        5: ["shapeshifter", "orc", "quasit"],
        6: ["witch", "bee", "orc"]
      };
    }
  
    preload() {
      // Basic assets
      const assets = [
        "player",
        "projectile",
        "blob",
        "boss",
        "wall",
        "door",
        "door_closed",
        "boss_projectile",
        "blob_projectile",
        "gold_sparkles",
        "heart_full",
        "heart_half",
        "heart_empty",
        "background",
        "shapeshifter",
        "wizard",
        "quasit",
        "orc",
        "bee",
        "witch",
        "boss1",
        "boss2",
        "boss3",
        "boss4",
        "boss5"
      ];
      assets.forEach((key) => this.load.image(key, `assets/${key}.png`));
      this.load.image("wall1", "assets/wall1.png");
      this.load.image("wall2", "assets/wall2.png");
      this.load.image("wall3", "assets/wall3.png");
      this.load.image("wall4", "assets/wall4.png");
      this.load.image("wall5", "assets/wall5.png");
      this.load.image("bg", "assets/bg.png");
      // New bosses and witch enemy
      this.load.image("boss1", "assets/boss1.png");
      this.load.image("boss2", "assets/boss2.png");
      this.load.image("boss3", "assets/boss3.png");
      this.load.image("boss4", "assets/boss4.png");
      this.load.image("boss5", "assets/boss5.png");
      this.load.image("witch", "assets/witch.png");
      
      // Powerup icons
      this.load.image("dodge_icon", "assets/boss_projectile.png");
      this.load.image("damage_icon", "assets/damage_up.png");
      this.load.image("hp_icon", "assets/health_up.png");
      this.load.image("speed_icon", "assets/blob_projectile.png");
      this.load.image("doubleshot_icon", "assets/blob.png");
      this.load.image("splitshot_icon", "assets/blob_projectile.png");
      
      // Mobile touch controls
      this.load.image("touchstick", "assets/wall.png");
    }
  
    create(data) {
      // Check if on mobile
      this.isMobile = this.sys.game.device.os.android || this.sys.game.device.os.iOS;

      // Bounds
      this.playArea = { x1: 60, y1: 60, x2: 740, y2: 540 };
      this.inTransition = false;

      // Groups
      this.walls = this.physics.add.staticGroup();
      this.innerWalls = this.physics.add.staticGroup();
      this.doors = this.physics.add.staticGroup();
      this.enemies = this.physics.add.group();
      this.enemyProj = this.physics.add.group();
      this.projectiles = this.physics.add.group();
      this.pickups = this.physics.add.group();

      // UI
      this.createUI();

      // Handle continue run (hard mode) or restart
      if (data && data.continueRun) {
        this.hardMode = true;
        this.showTempMessage('Harder Run: Enemies have 50% more health!');
      } else {
        this.hardMode = false;
      }
      if (data && data.restart) {
        this.resetUpgrades();
        this.coins = 0;
      }

      // Player
      this.player = this.physics.add.sprite(400, 300, "player").setDepth(10);
      this.player.health = 6;
      this.player.maxHealth = 6;
      this.player.lastDamageTime = 0;
      this.shootCooldown = 200;
      this.lastShootTime = 0;
      this.isDodging = false;

      // Input - keep keyboard for desktop
      this.keys = this.input.keyboard.addKeys(
        "W,A,S,D,LEFT,RIGHT,UP,DOWN,E,SPACE"
      );

      // Mobile controls setup
      if (this.isMobile) {
        this.setupMobileControls();
      }

      // Colliders
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
          // Only take damage if enemy is charging and player isn't invincible
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
      this.physics.add.overlap(
        this.player,
        this.pickups,
        this.onPickup,
        null,
        this
      );

      // Desktop shooting
      if (!this.isMobile) {
        this.input.on("pointerdown", (ptr) => this.shootMouse(ptr));
      }

      // Minimap graphics object for dodge UI
      this.minimap = this.add.graphics().setDepth(100);

      // Map
      this.generateWorldMap();
      this.loadRoom(0, 0);

      // Create powerup icons container
      this.createPowerupIcons();
    }
  
    resetUpgrades() {
      this.upgrades = { hp: 0, damage: 0, speed: 0, doubleShot: 0, splitShot: 0, dodge: 2 };
      this.damageMultiplier = 1;
      this.playerSpeed = 160;
      this.dodgeCount = 2;
      this.dodgeCooldowns = [null, null];
    }
  
    setupMobileControls() {
      // Create virtual joystick area for the left half of the screen
      this.leftHalf = this.add.zone(0, 0, this.cameras.main.width / 2, this.cameras.main.height)
        .setOrigin(0)
        .setInteractive();
      
      // Touch position for movement
      this.touchPosition = { x: 0, y: 0 };
      this.isTouching = false;
      
      // Handle movement with left side touches
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
      
      // Right side of screen for dodge
      this.rightHalf = this.add.zone(this.cameras.main.width / 2, 0, this.cameras.main.width / 2, this.cameras.main.height)
        .setOrigin(0)
        .setInteractive();
        
      this.rightHalf.on('pointerdown', () => {
        // Dodge on right screen tap if dodge available
        if (this.dodgeCount > 0) {
          this.performDodge();
        }
      });
      
      // Auto-shoot timer
      this.time.addEvent({
        delay: 500,
        callback: this.autoShoot,
        callbackScope: this,
        loop: true
      });
      
      // Display a virtual joystick indicator
      this.touchIndicator = this.add.circle(100, 450, 40, 0xffffff, 0.3)
        .setDepth(90)
        .setVisible(false);
      this.touchStick = this.add.circle(100, 450, 20, 0xffffff, 0.7)
        .setDepth(91)
        .setVisible(false);
    }
    
    autoShoot() {
      if (!this.player.active || this.time.now < this.lastShootTime + this.shootCooldown) return;
      
      // Find the closest enemy in range
      let closest = null;
      let minDist = 300; // Max targeting range
      
      this.enemies.getChildren().forEach(enemy => {
        const dist = Phaser.Math.Distance.Between(
          this.player.x, this.player.y, enemy.x, enemy.y
        );
        
        if (dist < minDist) {
          minDist = dist;
          closest = enemy;
        }
      });
      
      // Shoot at closest enemy if found
      if (closest) {
        const angle = Phaser.Math.Angle.Between(
          this.player.x, this.player.y, closest.x, closest.y
        );
        this.fireProjectiles(angle);
        this.lastShootTime = this.time.now;
      }
    }
    
    performDodge() {
      if (this.isDodging || this.dodgeCount <= 0) return;
      
      this.isDodging = true;
      this.dodgeCount--;
      this.invincible = true;
      this.player.setTint(0x99ff99); // Green tint for dodge
      
      // Track which dodge was used - we'll use the rightmost dodge first
      this.lastDodgeUsed = (this.upgrades.dodge - this.dodgeCount) - 1;
      this.dodgeCooldowns[this.lastDodgeUsed] = this.time.now + 4000; // 4 second cooldown
      
      // Determine dodge direction based on keys pressed
      let dx = 0, dy = 0;
      
      if (this.isMobile) {
        // For mobile, use the current movement direction
        if (this.isTouching) {
          const centerX = this.cameras.main.width / 4;
          const centerY = this.cameras.main.height / 2;
          dx = this.touchPosition.x - centerX;
          dy = this.touchPosition.y - centerY;
          
          // Normalize
          const length = Math.sqrt(dx * dx + dy * dy);
          if (length > 0) {
            dx /= length;
            dy /= length;
          } else {
            // Default to up if no direction
            dy = -1;
          }
        } else {
          // Default to up if not touching
          dy = -1;
        }
      } else {
        // For desktop, use WASD keys
        if (this.keys.W.isDown) dy = -1;
        else if (this.keys.S.isDown) dy = 1;
        
        if (this.keys.A.isDown) dx = -1;
        else if (this.keys.D.isDown) dx = 1;
        
        // Default to up if no direction keys are pressed
        if (dx === 0 && dy === 0) {
          dy = -1;
        }
        
        // Normalize diagonal movement
        if (dx !== 0 && dy !== 0) {
          const length = Math.sqrt(dx * dx + dy * dy);
          dx /= length;
          dy /= length;
        }
      }
      
      // Apply dodge movement
      this.player.setVelocity(dx * this.dodgeSpeed, dy * this.dodgeSpeed);
      
      // Reset after dodge duration
      this.time.delayedCall(this.dodgeDuration, () => {
        if (this.player.active) {
          this.isDodging = false;
          // Reset velocity only if still dodging (not using direct controls)
          if (!this.keys.W.isDown && !this.keys.A.isDown && 
              !this.keys.S.isDown && !this.keys.D.isDown && !this.isTouching) {
            this.player.setVelocity(0, 0);
          }
        }
      });
      
      // End invincibility
      this.time.delayedCall(this.dodgeDuration, () => {
        this.invincible = false;
        if (this.player.active) {
          this.player.clearTint();
        }
      });
    }
  
    update(time) {
      // Movement - Handle differently for mobile vs desktop, but not during a dodge
      if (!this.isDodging) {
        this.player.setVelocity(0, 0);
        
        if (this.isMobile) {
          if (this.isTouching) {
            // Update touch indicator position
            this.touchIndicator.setVisible(true);
            this.touchStick.setVisible(true);
            this.touchIndicator.setPosition(this.touchPosition.x, this.touchPosition.y);
            
            // Calculate distance from initial touch to current position
            const centerX = this.cameras.main.width / 4; // Center of left half
            const centerY = this.cameras.main.height / 2;
            const maxDistance = 80; // Max joystick range
            
            const dx = this.touchPosition.x - centerX;
            const dy = this.touchPosition.y - centerY;
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            if (distance > 5) { // Small threshold to avoid tiny movements
              // Normalize and scale velocity based on distance
              const scale = Math.min(distance / maxDistance, 1);
              const normX = dx / distance;
              const normY = dy / distance;
              
              // Move player
              this.player.setVelocity(
                normX * this.playerSpeed * scale,
                normY * this.playerSpeed * scale
              );
              
              // Position the joystick indicator
              const stickX = centerX + normX * Math.min(distance, maxDistance);
              const stickY = centerY + normY * Math.min(distance, maxDistance);
              this.touchStick.setPosition(stickX, stickY);
            } else {
              this.touchStick.setPosition(this.touchIndicator.x, this.touchIndicator.y);
            }
          } else {
            this.touchIndicator.setVisible(false);
            this.touchStick.setVisible(false);
          }
        } else {
          // Desktop WASD movement
          if (this.keys.A.isDown) this.player.setVelocityX(-this.playerSpeed);
          if (this.keys.D.isDown) this.player.setVelocityX(this.playerSpeed);
          if (this.keys.W.isDown) this.player.setVelocityY(-this.playerSpeed);
          if (this.keys.S.isDown) this.player.setVelocityY(this.playerSpeed);
        }
      }
  
      // Dodge for desktop
      if (!this.isMobile && 
          Phaser.Input.Keyboard.JustDown(this.keys.SPACE) &&
          this.dodgeCount > 0 && !this.isDodging) {
        this.performDodge();
      }
      
      // Recharge dodges
      for (let i = 0; i < this.dodgeCooldowns.length; i++) {
        if (this.dodgeCooldowns[i] && time > this.dodgeCooldowns[i]) {
          this.dodgeCooldowns[i] = null;
          this.dodgeCount++;
        }
      }
  
      // Enemy AI
      this.enemies.children.iterate((e) => e.active && this.updateEnemy(e, time));
  
      // Room clear
      if (this.roomActive && this.enemies.countActive() === 0) {
        this.roomActive = false;
        this.clearedRooms.add(`${this.currentRoom.x},${this.currentRoom.y}`);
        this.openAllDoors();
      }
  
      // Door interactions
      if (!this.inTransition) {
        this.doors.children.iterate((door) => {
          const dist = Phaser.Math.Distance.Between(
            this.player.x, this.player.y, door.x, door.y
          );
          if (dist < 60) {
            this.handleDoorPrompt(door);
          } else if (this.doorPrompt.visible) {
            this.doorPrompt.setVisible(false);
          }
        });
      }
  
      // Shooting (for desktop)
      if (!this.isMobile) {
        if (this.keys.LEFT.isDown) this.shootDir("left");
        else if (this.keys.RIGHT.isDown) this.shootDir("right");
        else if (this.keys.UP.isDown) this.shootDir("up");
        else if (this.keys.DOWN.isDown) this.shootDir("down");
      }
  
      // Draw dodge cooldown UI
      this.drawDodgeUI(time);
      
      // Update powerup icons if they exist
      this.updatePowerupIcons();
    }
  
    createUI() {
      this.ui = this.add.container(0, 0).setDepth(100);
      this.hearts = [];
      for (let i = 0; i < 3; i++) {
        const h = this.add.image(100 + 48 * i, 60, "heart_full");
        this.hearts.push(h);
        this.ui.add(h);
      }
      this.coinsText = this.add.text(100, 100, "Coins: 0", {
        font: "28px Arial",
        fill: "#fff",
      });
      this.worldText = this.add.text(100, 140, "World: 1", {
        font: "24px Arial",
        fill: "#fff",
      });
      this.ui.add([this.coinsText, this.worldText]);
      
      // Door and shop prompts
      const promptY = this.isMobile ? 240 : 200;
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
          const doors = this.doors.getChildren();
          for (const door of doors) {
            if (door.isOpen && this.isCrossing(door)) {
              const [nx, ny] = door.targetRoom.split(",").map(Number);
              this.transitionToRoom(nx, ny, door.direction);
              break;
            } else if (!door.isOpen && !this.roomActive && 
                Phaser.Math.Distance.Between(this.player.x, this.player.y, door.x, door.y) < 60) {
              door.setTexture("door");
              door.isOpen = true;
              if (door.collider) {
                this.physics.world.removeCollider(door.collider);
                door.collider = null;
              }
              break;
            }
          }
        });
      }
      
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
      
      // Level transition countdown timer (invisible initially)
      this.nextLevelText = this.add
        .text(400, 250, "", {
          font: "32px Arial",
          fill: "#00ff00",
          backgroundColor: "#000",
          padding: { x: 10, y: 5 },
        })
        .setOrigin(0.5)
        .setDepth(200)
        .setVisible(false);
      this.ui.add(this.nextLevelText);
    }
    
    createPowerupIcons() {
      // Moved to bottom left
      this.powerupsText = this.add.text(100, 500, "Powerups:", {
        font: "20px Arial",
        fill: "#fff"
      }).setDepth(101);
      this.ui.add(this.powerupsText);
      
      this.powerupContainer = this.add.container(100, 535).setDepth(101);
      this.ui.add(this.powerupContainer);
    }
    
    updatePowerupIcons() {
      // Clear existing icons
      this.powerupContainer.removeAll(true);
      
      // Create icons for all powerups
      let xOffset = 0;
      const gap = 40;
      
      // Display damage upgrade
      if (this.damageMultiplier > 1) {
        const count = Math.floor((this.damageMultiplier - 1) / 0.3);
        for (let i = 0; i < count; i++) {
          const icon = this.add.image(xOffset, 0, "damage_icon").setScale(0.8);
          this.powerupContainer.add(icon);
          xOffset += gap;
        }
      }
      
      // Display speed upgrade
      if (this.playerSpeed > 160) {
        const count = Math.floor((this.playerSpeed - 160) / 20);
        for (let i = 0; i < count; i++) {
          const icon = this.add.image(xOffset, 0, "speed_icon").setScale(0.8);
          this.powerupContainer.add(icon);
          xOffset += gap;
        }
      }
      
      // Display HP upgrade
      if (this.player.maxHealth > 6) {
        const count = Math.floor((this.player.maxHealth - 6) / 2);
        for (let i = 0; i < count; i++) {
          const icon = this.add.image(xOffset, 0, "hp_icon").setScale(0.8);
          this.powerupContainer.add(icon);
          xOffset += gap;
        }
      }
      
      // Display double shot
      for (let i = 0; i < this.upgrades.doubleShot; i++) {
        const icon = this.add.image(xOffset, 0, "doubleshot_icon").setScale(0.8);
        this.powerupContainer.add(icon);
        xOffset += gap;
      }
      
      // Display split shot
      for (let i = 0; i < this.upgrades.splitShot; i++) {
        const icon = this.add.image(xOffset, 0, "splitshot_icon").setScale(0.8);
        this.powerupContainer.add(icon);
        xOffset += gap;
      }
      
      // Wrap to new rows if needed
      if (xOffset > 300) {
        // Create multiple rows of icons if needed
        this.powerupContainer.iterate((icon, index) => {
          const row = Math.floor(index / 8);
          const col = index % 8;
          icon.setPosition(col * gap, row * gap);
        });
      }
    }
  
    drawDodgeUI(time) {
      // Moved above powerups
      const startX = 100,
        startY = 460,
        radius = 12,
        gap = 30;
      this.minimap.clear();
      
      // Draw dodge indicator text
      if (!this.dodgeText) {
        this.dodgeText = this.add.text(startX, startY - 5, "Dodges:", {
          font: "16px Arial",
          fill: "#fff"
        }).setDepth(101);
        this.ui.add(this.dodgeText);
      }
      
      // Draw dodge indicators - from right to left
      for (let i = 0; i < this.upgrades.dodge; i++) {
        const px = startX + (i + 1) * gap,
          py = startY;
        
        // Background circle
        this.minimap.lineStyle(2, 0xffffff);
        this.minimap.strokeCircle(px, py, radius);
        
        // Fill based on cooldown state
        const reverseIdx = this.upgrades.dodge - i - 1; // Reverse index (rightmost is 0)
        if (this.dodgeCooldowns[reverseIdx]) {
          const remain = Math.max(0, this.dodgeCooldowns[reverseIdx] - time);
          const pct = remain / 4000;
          this.minimap.fillStyle(0xaaaaaa, 0.7);
          this.minimap.slice(
            px,
            py,
            radius,
            -Math.PI / 2,
            -Math.PI / 2 + 2 * Math.PI * (1 - pct),
            false
          );
          this.minimap.fillPath();
        } else if (reverseIdx < this.dodgeCount) {
          this.minimap.fillStyle(0x00ff00, 1);
          this.minimap.fillCircle(px, py, radius - 2);
        }
      }
    }
  
    updateMinimap() {
      if (!this.minimapObj) {
        this.minimapObj = this.add.graphics().setDepth(100);
      } else {
        this.minimapObj.clear();
      }
      
      const keys = Object.keys(this.roomMap);
      const coords = keys.map((k) => k.split(",").map(Number));
      const xs = coords.map((c) => c[0]),
        ys = coords.map((c) => c[1]);
      const minX = Math.min(...xs),
        minY = Math.min(...ys);
      const cell = 8,
        pad = 2;
      const originX = 700,
        originY = 50;
      keys.forEach((k) => {
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
  
    /** Shows a temporary on-screen message */
    showTempMessage(text) {
      const msg = this.add
        .text(400, 570, text, {
          font: "24px Arial",
          fill: "#ff0000",
          backgroundColor: "#000",
          padding: { x: 30, y: 10 },
          align: 'center',
          wordWrap: { width: 760, useAdvancedWrap: true }
        })
        .setOrigin(0.5, 1)
        .setDepth(200);
      this.time.delayedCall(4000, () => msg.destroy());
    }
  
    // --- Shooting & Damage ---
    shootDir(dir) {
      if (this.time.now < this.lastShootTime + this.shootCooldown) return;
      // handle patterns
      const angleMap = {
        left: Math.PI,
        right: 0,
        up: -Math.PI / 2,
        down: Math.PI / 2,
      };
      const baseAngle = angleMap[dir];
      this.fireProjectiles(baseAngle);
      this.lastShootTime = this.time.now;
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
  
    fireProjectiles(angle) {
      const countSplit = this.upgrades.splitShot;
      const doubleCount = this.upgrades.doubleShot > 0 ? 2 : 1;
      const totalShots = (countSplit + 1) * doubleCount;
      const spread = Math.PI / 12;
      const angles = [];
      // split angles
      for (let i = 0; i <= countSplit; i++) {
        const offset = (i - countSplit / 2) * spread;
        angles.push(angle + offset);
      }
      // double shots
      const finalAngles = [];
      angles.forEach((a) => {
        for (let d = 0; d < doubleCount; d++) finalAngles.push(a);
      });
      finalAngles.forEach((a) => {
        const p = this.projectiles.create(
          this.player.x,
          this.player.y,
          "projectile"
        );
        p.setVelocity(Math.cos(a) * 300, Math.sin(a) * 300);
        p.damage = 10 * this.damageMultiplier;
      });
    }
  
    onHitEnemy(proj, enemy) {
      // Hard mode: enemies have 50% more health
      if (this.hardMode && !enemy._hardModeBuffed) {
        enemy.health = Math.ceil(enemy.health * 1.5);
        enemy._hardModeBuffed = true;
      }
      enemy.health -= proj.damage;
      proj.destroy();
      
      // Flash enemy when hit
      enemy.setTint(0xff0000);
      this.time.delayedCall(100, () => {
        if (enemy.active) enemy.clearTint();
      });
      
      if (enemy.health <= 0) {
        if (enemy.type === "boss") {
          this.dropRandomUpgrade(enemy.x, enemy.y);
          this.onBossDefeated();
        } else {
          this.coins++;
          this.coinsText.setText(`Coins: ${this.coins}`);
        }
        enemy.destroy();
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
        duration: 500,
      });
      
      // Make pickups interactive for mobile
      if (this.isMobile) {
        pickup.setInteractive();
        pickup.on('pointerdown', () => {
          const dist = Phaser.Math.Distance.Between(
            this.player.x, this.player.y, pickup.x, pickup.y
          );
          if (dist < 100) {
            this.onPickup(this.player, pickup);
          }
        });
      }
    }
  
    onPickup(player, pickup) {
      const t = pickup.upgradeType;
      switch (t) {
        case "hp":
          this.player.maxHealth += 2;
          this.player.health = Math.min(
            this.player.maxHealth,
            this.player.health + 2
          );
          break;
        case "damage":
          this.damageMultiplier += 0.3;
          break;
        case "speed":
          this.playerSpeed += 20;
          break;
        case "doubleShot":
          this.upgrades.doubleShot++;
          break;
        case "splitShot":
          this.upgrades.splitShot++;
          break;
        case "dodge":
          this.upgrades.dodge++;
          this.dodgeCooldowns.push(null);
          this.dodgeCount++;
          break;
      }
      
      // Show what was picked up
      this.showTempMessage(`Picked up: ${t} upgrade!`);
      
      // Update hearts if needed
      this.updateHearts();
      
      pickup.destroy();
    }
  
    takeDamage() {
      if (this.invincible || this.time.now < this.player.lastDamageTime + 500) return;
      
      this.player.health -= 1;
      this.player.lastDamageTime = this.time.now;
      
      // Visual feedback
      this.player.setTint(0xff0000);
      this.time.delayedCall(200, () => {
        if (this.player.active) this.player.clearTint();
      });
      
      this.updateHearts();
      if (this.player.health <= 0) this.scene.start("GameOverScene");
      
      // Short invincibility after taking damage
      this.invincible = true;
      this.time.delayedCall(800, () => {
        this.invincible = false;
      });
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
  
    // --- Enemy AI ---
    updateEnemy(enemy, time) {
      // Skip if we're already processing a charging attack
      if (enemy.isPreparingCharge || enemy.isCharging) {
        this.processChargingState(enemy, time);
        return;
      }
      
      const dx = this.player.x - enemy.x;
      const dy = this.player.y - enemy.y;
      const dist = Math.hypot(dx, dy) || 1;
      
      // Different behavior based on enemy type
      switch (enemy.type) {
        case "boss":
          // Boss behavior - mix of charge and projectiles
          if (Math.random() < 0.01 && dist < 300) {
            this.prepareCharge(enemy, time, 1000, 0xffff00);
          } else {
            // Regular movement and shooting
            enemy.setVelocity((dx / dist) * enemy.speed, (dy / dist) * enemy.speed);
            if (time > enemy.lastShootTime + enemy.shootCooldown) {
              this.shootEnemyProjectile(enemy);
              enemy.lastShootTime = time;
            }
          }
          break;
          
        case "wizard":
          // Wizard - only ranged attacks, no charging
          // Keep distance from player
          if (dist < 150) {
            // Move away from player
            enemy.setVelocity((-dx / dist) * enemy.speed, (-dy / dist) * enemy.speed);
          } else if (dist > 250) {
            // Move closer
            enemy.setVelocity((dx / dist) * enemy.speed * 0.5, (dy / dist) * enemy.speed * 0.5);
          } else {
            // Stop and shoot if in ideal range
            enemy.setVelocity(0, 0);
          }
          
          // Shoot more frequently
          if (time > enemy.lastShootTime + (enemy.shootCooldown * 0.7)) {
            this.shootEnemyProjectile(enemy);
            enemy.lastShootTime = time;
          }
          break;
          
        case "shapeshifter":
          // Shapeshifter - random behavior patterns
          if (!enemy.behaviorPattern || time > enemy.lastBehaviorChange + 5000) {
            // Randomly choose a new behavior every 5 seconds
            enemy.behaviorPattern = Phaser.Math.Between(0, 2);
            enemy.lastBehaviorChange = time;
          }
          
          switch (enemy.behaviorPattern) {
            case 0: // Aggressive charging
              if (Math.random() < 0.02 && dist < 250) {
                this.prepareCharge(enemy, time, 600, 0xff0000);
              } else {
                enemy.setVelocity((dx / dist) * enemy.speed * 1.2, (dy / dist) * enemy.speed * 1.2);
              }
              break;
            case 1: // Ranged attacks
              if (dist < 200) {
                // Keep distance
                enemy.setVelocity((-dx / dist) * enemy.speed * 0.8, (-dy / dist) * enemy.speed * 0.8);
              } else {
                enemy.setVelocity(0, 0);
              }
              if (time > enemy.lastShootTime + enemy.shootCooldown) {
                this.shootEnemyProjectile(enemy);
                enemy.lastShootTime = time;
              }
              break;
            case 2: // Erratic movement
              const angle = Math.sin(time * 0.005) * Math.PI;
              const newDx = Math.cos(angle) * dx - Math.sin(angle) * dy;
              const newDy = Math.sin(angle) * dx + Math.cos(angle) * dy;
              const newDist = Math.hypot(newDx, newDy) || 1;
              enemy.setVelocity((newDx / newDist) * enemy.speed, (newDy / newDist) * enemy.speed);
              if (time > enemy.lastShootTime + enemy.shootCooldown * 2) {
                this.shootEnemyProjectile(enemy);
                enemy.lastShootTime = time;
              }
              break;
          }
          break;
        
        case "orc":
          // Orc - only does charge attacks, no ranged
          if (Math.random() < 0.015 && dist < 220) {
            this.prepareCharge(enemy, time, 900, 0xff6600);
          } else {
            // Slower approach
            enemy.setVelocity((dx / dist) * enemy.speed * 0.8, (dy / dist) * enemy.speed * 0.8);
          }
          break;
        
        case "quasit":
          // Quasit - mix of behaviors
          if (Math.random() < 0.01 && dist < 180) {
            this.prepareCharge(enemy, time, 500, 0x00ff00);
          } else {
            // Fast circling movement
            const circleRadius = 150;
            const angle = time * 0.001;
            const targetX = this.player.x + Math.cos(angle) * circleRadius;
            const targetY = this.player.y + Math.sin(angle) * circleRadius;
            const circleDx = targetX - enemy.x;
            const circleDy = targetY - enemy.y;
            const circleDist = Math.hypot(circleDx, circleDy) || 1;
            enemy.setVelocity((circleDx / circleDist) * enemy.speed * 1.2, (circleDy / circleDist) * enemy.speed * 1.2);
            
            if (time > enemy.lastShootTime + enemy.shootCooldown) {
              this.shootEnemyProjectile(enemy);
              enemy.lastShootTime = time;
            }
          }
          break;
        
        case "bee":
          // Bee - fast charging attacks only
          if (Math.random() < 0.02 && dist < 250) {
            this.prepareCharge(enemy, time, 400, 0xffff00);
          } else {
            // Erratic fast movement
            const offsetX = Math.sin(time * 0.01) * 50;
            const offsetY = Math.cos(time * 0.01) * 50;
            const targetX = this.player.x + offsetX;
            const targetY = this.player.y + offsetY;
            const beeDx = targetX - enemy.x;
            const beeDy = targetY - enemy.y;
            const beeDist = Math.hypot(beeDx, beeDy) || 1;
            enemy.setVelocity((beeDx / beeDist) * enemy.speed * 1.3, (beeDy / beeDist) * enemy.speed * 1.3);
          }
          break;
          
        default: // Default blob behavior
          if (Math.random() < 0.005 && dist < 200) {
            this.prepareCharge(enemy, time, 800, 0xffaa00);
          } else {
            enemy.setVelocity((dx / dist) * enemy.speed, (dy / dist) * enemy.speed);
            if (time > enemy.lastShootTime + enemy.shootCooldown) {
              this.shootEnemyProjectile(enemy);
              enemy.lastShootTime = time;
            }
          }
          break;
      }
    }
    
    prepareCharge(enemy, time, duration, color) {
      enemy.isPreparingCharge = true;
      enemy.chargeStartTime = time;
      enemy.chargeDuration = duration;
      enemy.setTint(color);
      enemy.setVelocity(0, 0); // Stop while preparing
      
      // Show warning
      const warningText = this.add.text(enemy.x, enemy.y - 40, "!!!", {
        font: "24px Arial",
        fill: "#ff0000",
        stroke: "#000000",
        strokeThickness: 4
      }).setOrigin(0.5).setDepth(50);
      
      // Pulsate the enemy
      this.tweens.add({
        targets: enemy,
        scale: enemy.type === "boss" ? 1.8 : 1.5,
        yoyo: true,
        repeat: 2,
        duration: duration / 3,
        onComplete: () => {
          if (warningText) warningText.destroy();
        }
      });
    }
    
    processChargingState(enemy, time) {
      if (enemy.isPreparingCharge) {
        // Check if preparation time is over
        if (time > enemy.chargeStartTime + enemy.chargeDuration) {
          // Start the charge attack
          enemy.isPreparingCharge = false;
          enemy.isCharging = true;
          enemy.chargeEndTime = time + 500; // Charge lasts 0.5 seconds
          
          // Get direction to player
          const dx = this.player.x - enemy.x;
          const dy = this.player.y - enemy.y;
          const dist = Math.hypot(dx, dy) || 1;
          
          // Set charge velocity (faster than normal)
          const chargeSpeed = enemy.type === "boss" ? 300 : 250;
          enemy.setVelocity(
            (dx / dist) * chargeSpeed,
            (dy / dist) * chargeSpeed
          );
          
          // Change tint to indicate charging
          enemy.setTint(0xff0000); // Red for charging
        }
      } else if (enemy.isCharging) {
        // Check if charge duration is over
        if (time > enemy.chargeEndTime) {
          enemy.isCharging = false;
          enemy.clearTint();
          enemy.lastShootTime = time; // Reset shoot timer
        }
      }
    }
  
    // --- Map & Rooms ---
    generateWorldMap() {
      this.roomMap = {};
      this.visitedRooms = {};
      this.clearedRooms = new Set();
      this.roomMap["0,0"] = { type: "start", doors: {}, depth: 0, variation: 0 };
      let pos = { x: 0, y: 0 }, len = 0, exitKey = null;
      while (len < 3 || (len < 8 && Math.random() < 0.7)) {
        const dirs = Phaser.Utils.Array.Shuffle([
          { dx: 0, dy: -1, dir: "up", opp: "down" },
          { dx: 1, dy: 0, dir: "right", opp: "left" },
          { dx: 0, dy: 1, dir: "down", opp: "up" },
          { dx: -1, dy: 0, dir: "left", opp: "right" },
        ]);
        let moved = false;
        for (const d of dirs) {
          const nx = pos.x + d.dx, ny = pos.y + d.dy, key = `${nx},${ny}`;
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
      if (exitKey) this.roomMap[exitKey].type = "boss";
      const normals = Object.keys(this.roomMap).filter(
        (k) => this.roomMap[k].type === "normal"
      );
      if (normals.length)
        this.roomMap[Phaser.Utils.Array.GetRandom(normals)].type = "shop";
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
          const nx = bx + d.dx, ny = by + d.dy, key = `${nx},${ny}`;
          if (
            !this.roomMap[key] &&
            Object.keys(this.roomMap[base].doors).length < 3
          ) {
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

    // --- Room Layout ---
    createRoomLayout(key) {
      // Draw background using bg.png and scale to cover the canvas
      if (this.background) this.background.destroy();
      this.background = this.add.image(400, 300, "bg").setDepth(-10);
      this.background.setScale(1.5, 1.5); // Adjust scale as needed to cover canvas
      // Layout the room: walls, floor, and doors based on roomMap[key]
      const bounds = this.playArea || { x1: 60, y1: 60, x2: 740, y2: 540 };
      const { x1, y1, x2, y2 } = bounds;
      // Top wall (leave gap for up door)
      if (!this.roomMap[key].doors || !this.roomMap[key].doors.up) {
        this.walls.create(400, y1, "wall").setScale(10, 1).refreshBody();
      }
      // Bottom wall (leave gap for down door)
      if (!this.roomMap[key].doors || !this.roomMap[key].doors.down) {
        this.walls.create(400, y2, "wall").setScale(10, 1).refreshBody();
      }
      // Left wall (leave gap for left door)
      if (!this.roomMap[key].doors || !this.roomMap[key].doors.left) {
        this.walls.create(x1, 300, "wall").setScale(1, 10).refreshBody();
      }
      // Right wall (leave gap for right door)
      if (!this.roomMap[key].doors || !this.roomMap[key].doors.right) {
        this.walls.create(x2, 300, "wall").setScale(1, 10).refreshBody();
      }
      // Door creation is now handled by createDoors
    }

    // --- Door Creation ---
    createDoors(room) {
      const bounds = this.playArea || { x1: 60, y1: 60, x2: 740, y2: 540 };
      const { x1, y1, x2, y2 } = bounds;
      const doors = room.doors;
      if (doors && doors.up) this.doors.create(400, y1, "door").setDepth(2);
      if (doors && doors.down) this.doors.create(400, y2, "door").setDepth(2);
      if (doors && doors.left) this.doors.create(x1, 300, "door").setDepth(2);
      if (doors && doors.right) this.doors.create(x2, 300, "door").setDepth(2);
    }

    loadRoom(x, y) {
      // remove any leftover shop icons
      if (this.shopIcons) {
        this.shopIcons.forEach((icon) => icon.sprite.destroy());
        this.shopIcons = null;
      }
      // clear old
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

      // layout
      if (this.roomMap[key].type !== "shop") {
        this.createRoomLayout(key);
      }

      // room type
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
  
    createShopRoom() {
      // Define possible shop items
      const shopItems = [
        { key: 'hp', name: 'Max Health +2', icon: 'hp_icon', cost: 5, type: 'upgrade', desc: '+2 max health' },
        { key: 'damage', name: 'Damage Up', icon: 'damage_icon', cost: 5, type: 'upgrade', desc: '+0.3 damage' },
        { key: 'speed', name: 'Speed Up', icon: 'speed_icon', cost: 5, type: 'upgrade', desc: '+20 speed' },
        { key: 'doubleShot', name: 'Double Shot', icon: 'doubleshot_icon', cost: 7, type: 'upgrade', desc: 'Shoot 2 at once' },
        { key: 'splitShot', name: 'Split Shot', icon: 'splitshot_icon', cost: 7, type: 'upgrade', desc: 'Spread shot' },
        { key: 'dodge', name: 'Extra Dodge', icon: 'dodge_icon', cost: 7, type: 'upgrade', desc: '+1 dodge' },
        { key: 'heal', name: 'Health Potion', icon: 'hp_icon', cost: 3, type: 'consumable', desc: 'Restore 2 health' }
      ];
      // Randomly pick 3 unique items for this shop
      const selection = Phaser.Utils.Array.Shuffle(shopItems).slice(0, 3);
      this.shopIcons = [];
      // Show shop items
      selection.forEach((item, i) => {
        const x = 300 + i * 100, y = 250;
        const sprite = this.add.image(x, y, item.icon).setScale(2).setInteractive();
        const text = this.add.text(x, y + 50, `${item.name}\n${item.cost} coins`, { font: '16px Arial', fill: '#fff', align: 'center' }).setOrigin(0.5);
        const desc = this.add.text(x, y + 75, item.desc, { font: '12px Arial', fill: '#aaa', align: 'center' }).setOrigin(0.5);
        sprite.on('pointerdown', () => {
          if (this.coins >= item.cost) {
            this.coins -= item.cost;
            this.coinsText.setText(`Coins: ${this.coins}`);
            if (item.type === 'upgrade') {
              this.onPickup(this.player, { upgradeType: item.key, destroy: () => {} });
            } else if (item.type === 'consumable') {
              this.player.health = Math.min(this.player.maxHealth, this.player.health + 2);
              this.updateHearts();
              this.showTempMessage('Healed 2 health!');
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
      // Shop prompt
      if (!this.shopPrompt) {
        this.shopPrompt = this.add.text(400, 180, 'Shop: Click an item to buy', { font: '20px Arial', fill: '#ffff00', backgroundColor: '#222', padding: { x: 10, y: 5 } }).setOrigin(0.5).setDepth(101);
        this.ui.add(this.shopPrompt);
      }
      this.shopPrompt.setText('Shop: Click an item to buy').setVisible(true);
    }
  
    // ... rest of the code remains the same ...
  
    onBossDefeated() {
      this.clearedRooms.add(`${this.currentRoom.x},${this.currentRoom.y}`);
      
      if (this.currentWorld < this.maxWorlds) {
        this.currentWorld++;
        this.worldText.setText(`World: ${this.currentWorld}`);
        
        // Start the 5-second countdown
        this.nextLevelText.setText(`Going to next level in 5...`).setVisible(true);
        
        // Create countdown
        for (let i = 4; i >= 0; i--) {
          this.time.delayedCall((5-i) * 1000, () => {
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
        const victory = this.add
          .text(400, 300, "Victory! You have conquered The Forsaken Depths!", {
            font: "24px Arial",
            fill: "#ffffff",
            backgroundColor: "#000000",
          })
          .setOrigin(0.5)
          .setDepth(200);
        this.time.delayedCall(5000, () => this.scene.start("TitleScene"));
      }
    }
  }
  
  // Game Over Scene
  class GameOverScene extends Phaser.Scene {
  constructor() {
    super({ key: "GameOverScene" });
  }
  create() {
    this.add.text(400, 180, "Game Over", { font: "48px Arial", fill: "#ff0000" }).setOrigin(0.5);
    // Continue Run (hard mode)
    const continueBtn = this.add.text(400, 300, "Continue Run (Enemies are harder!)", { font: "28px Arial", fill: "#ffcc00" })
      .setOrigin(0.5)
      .setInteractive();
    continueBtn.on("pointerdown", () => {
      this.scene.start("MainGameScene", { continueRun: true });
    });
    continueBtn.on("pointerover", () => continueBtn.setStyle({ fill: "#ffffff" }));
    continueBtn.on("pointerout", () => continueBtn.setStyle({ fill: "#ffcc00" }));
    // Restart
    const restartBtn = this.add.text(400, 370, "Restart (Start from 0)", { font: "28px Arial", fill: "#00ff00" })
      .setOrigin(0.5)
      .setInteractive();
    restartBtn.on("pointerdown", () => {
      this.scene.start("MainGameScene", { restart: true });
    });
    restartBtn.on("pointerover", () => restartBtn.setStyle({ fill: "#ffffff" }));
    restartBtn.on("pointerout", () => restartBtn.setStyle({ fill: "#00ff00" }));
    // Exit
    const exit = this.add.text(400, 440, "Exit to Menu", { font: "28px Arial", fill: "#00ffff" })
      .setOrigin(0.5)
      .setInteractive();
    exit.on("pointerdown", () => this.scene.start("TitleScene"));
    exit.on("pointerover", () => exit.setStyle({ fill: "#ffffff" }));
    exit.on("pointerout", () => exit.setStyle({ fill: "#00ffff" }));
  }
}
  
  // Game Configuration
  const config = {
    type: Phaser.AUTO,
    width: 800,
    height: 600,
    scene: [TitleScene, MainGameScene, GameOverScene],
    physics: { default: "arcade", arcade: { gravity: { y: 0 }, debug: false } },
    parent: "game-container",
    scale: {
      mode: Phaser.Scale.FIT,
      autoCenter: Phaser.Scale.CENTER_BOTH
    }
  };
  
  window.onload = () => new Phaser.Game(config);