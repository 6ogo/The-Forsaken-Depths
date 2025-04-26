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

    // Restart button (shifted up)
    const restartBtn = this.add
      .text(400, 300, "Restart", { // Changed text and position
        font: "28px Arial",
        fill: "#00ff00",
        backgroundColor: "#000000",
        padding: { x: 20, y: 10 }
      })
      .setOrigin(0.5)
      .setInteractive();

    restartBtn.on("pointerdown", () => {
      // Restart implies starting from 0, no need for extra flag?
      // Let's keep the flag for clarity in MainGameScene's create
      this.scene.start("MainGameScene", { restart: true });
    });
    restartBtn.on("pointerover", () => restartBtn.setStyle({ fill: "#ffffff" }));
    restartBtn.on("pointerout", () => restartBtn.setStyle({ fill: "#00ff00" }));

    // Exit button (shifted up)
    const exit = this.add
      .text(400, 370, "Exit to Menu", { // Changed position
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

    // Remove the "Continue Run" button entirely
    // const continueBtn = this.add ... (code removed)
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
    this.dodgeDuration = 300; // ms
    this.upgrades = {
      hp: 0,
      damage: 0,
      speed: 0,
      doubleShot: 0,
      splitShot: 0,
      dodge: 2, // Start with 2 dodges
    };
    this.shopPurchases = {}; // Track shop items if needed (currently not used)
    this.invincible = false;
    this.dodgeCount = 2;
    this.dodgeCooldownTime = 4000; // 4 seconds cooldown per dodge
    this.dodgeCooldowns = []; // Array to store cooldown end times
    this.lastDodgeUsed = 0; // Index of the last used dodge slot
    this.isMobile = false;
    this.autoShootTimer = 0;
    this.powerupIcons = {};
    this.hardMode = false; // Flag for harder run after continue
    this.footstepTimer = 0;
    this.worldEnemies = {
      1: ["blob", "bee", "witch"],
      2: ["quasit", "orc", "witch"],
      3: ["wizard", "shapeshifter", "witch"],
      4: ["orc", "witch", "bee"],
      5: ["shapeshifter", "orc", "quasit"],
      6: ["witch", "bee", "orc"]
    };
    this.roomActive = false; // Is the current room uncleared?
    this.clearedRooms = new Set(); // Stores keys of cleared rooms ("x,y")
    this.visitedRooms = {}; // Stores keys of visited rooms for minimap
    this.entryDoorDirection = null; // Direction player entered from
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
      dodge_icon: "boss_projectile", // Placeholder, replace with actual icons
      damage_icon: "damage_up",
      hp_icon: "health_up",
      speed_icon: "blob_projectile", // Placeholder
      doubleshot_icon: "blob", // Placeholder
      splitshot_icon: "blob_projectile" // Placeholder
    };

    Object.entries(powerupAssets).forEach(([key, value]) => {
      this.load.image(key, `assets/${value}.png`);
    });

    // Load sounds (already loaded in TitleScene, but good practice to ensure)
    const sounds = ['walk', 'dash', 'shot', 'death', 'upgrade', 'powerup'];
    sounds.forEach(sound => {
      if (!this.sound.get(sound)) { // Only load if not already loaded
        this.load.audio(sound, `assets/sounds/${sound}.wav`);
      }
    });

    // Mobile controls
    this.load.image("touchstick", "assets/wall.png"); // Placeholder for touch stick base/knob
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

    // Setup game area and world bounds
    this.playArea = { x1: 60, y1: 60, x2: 740, y2: 540 };
    this.physics.world.setBounds(0, 0, this.sys.game.config.width, this.sys.game.config.height);
    this.inTransition = false;

    // Create physics groups
    this.setupPhysicsGroups();

    // Setup player
    this.setupPlayer();

    // Input handling - IMPORTANT: Move this BEFORE createUI
    this.setupInputs();

    // Create UI - Now this comes AFTER input initialization
    this.createUI();

    // Initialize dodge cooldowns array based on starting dodges
    this.dodgeCooldowns = Array(this.upgrades.dodge).fill(null);

    // Handle game mode (Restart / Continue - though continue is removed from GameOver)
    if (data?.restart) {
      this.resetGame(); // Use a dedicated reset function
    }
    // Note: Continue logic removed as per request

    // Generate world
    this.generateWorldMap();
    this.loadRoom(0, 0); // Load starting room

    // Create powerup icons display
    this.createPowerupIcons();
    this.updatePowerupIcons(); // Initial update

    // Initialize camera
    this.cameras.main.setZoom(1.0); // Adjust zoom if needed
    // this.cameras.main.startFollow(this.player); // Optional: Camera follows player
  }

  setupPhysicsGroups() {
    this.walls = this.physics.add.staticGroup();
    this.innerWalls = this.physics.add.staticGroup();
    this.doors = this.physics.add.group({ immovable: true }); // Use group for dynamic colliders
    this.enemies = this.physics.add.group();
    this.enemyProj = this.physics.add.group();
    this.projectiles = this.physics.add.group();
    this.pickups = this.physics.add.group();
  }

  setupPlayer() {
    this.player = this.physics.add.sprite(400, 300, "player").setDepth(10);
    this.player.setCollideWorldBounds(true); // Prevent going out of canvas
    this.player.health = 6;
    this.player.maxHealth = 6;
    this.player.lastDamageTime = 0;
    this.shootCooldown = 200; // ms between shots
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
      // Mouse shooting
      this.input.on("pointerdown", (ptr) => {
        // Prevent shooting if clicking UI elements (like shop items)
        if (ptr.y < this.sys.game.config.height - 100) { // Basic check, adjust if UI layout changes
             this.shootMouse(ptr);
        }
      });
    }

    // Minimap graphics for dodge UI
    this.minimap = this.add.graphics().setDepth(100); // Used for dodge UI
  }

  takeDamage() {
    // Ignore damage if invincible (dodge, post-hit) or recently hit
    if (this.invincible || this.time.now < this.player.lastDamageTime + 800) return; // 800ms invincibility

    this.player.health -= 1;
    this.player.lastDamageTime = this.time.now;

    // Visual feedback: Tint red
    this.player.setTint(0xff0000);

    // Flash effect
    this.player.alpha = 0.5;
    this.time.addEvent({
        delay: 100,
        repeat: 3, // Flash 4 times (initial + 3 repeats)
        callback: () => {
            this.player.alpha = (this.player.alpha === 1) ? 0.5 : 1;
        },
        onComplete: () => {
            if (this.player.active) {
                this.player.alpha = 1;
                this.player.clearTint();
            }
        }
    });


    // Screen shake
    this.shake(0.005, 200);

    this.updateHearts();
    if (this.player.health <= 0) {
      this.sounds.death.play();
      this.scene.start("GameOverScene");
    }

    // Set temporary invincibility after getting hit
    this.invincible = true;
    this.time.delayedCall(800, () => {
        // Only remove invincibility if not currently dodging
        if (!this.isDodging) {
            this.invincible = false;
        }
    });
  }

  shootMouse(ptr) {
    if (this.time.now < this.lastShootTime + this.shootCooldown) return;

    const angle = Phaser.Math.Angle.Between(
      this.player.x,
      this.player.y,
      this.cameras.main.getWorldPoint(ptr.x, ptr.y).x, // Convert pointer coords to world coords
      this.cameras.main.getWorldPoint(ptr.x, ptr.y).y
    );

    this.fireProjectiles(angle);
    this.lastShootTime = this.time.now;
  }

  createBossProjectile(x, y, vx, vy) {
    const proj = this.enemyProj.create(x, y, 'boss_projectile');
    if (!proj) return null; // Check if pool was exhausted or group destroyed
    proj.setVelocity(vx, vy);
    proj.setScale(1.5);
    proj.body.onWorldBounds = true; // Ensure it checks world bounds
    return proj;
  }

  setupColliders() {
    // Clear existing colliders before adding new ones (important for room transitions)
    if (this.colliders) {
        this.colliders.forEach(c => c.destroy());
    }
    this.colliders = [];

    // Wall collisions
    this.colliders.push(this.physics.add.collider(this.player, this.walls));
    this.colliders.push(this.physics.add.collider(this.enemies, this.walls));
    this.colliders.push(this.physics.add.collider(this.player, this.innerWalls));
    this.colliders.push(this.physics.add.collider(this.enemies, this.innerWalls));

    // Projectiles vs Walls
    this.colliders.push(this.physics.add.collider(this.projectiles, [this.walls, this.innerWalls], (proj) => proj.destroy()));
    this.colliders.push(this.physics.add.collider(this.enemyProj, [this.walls, this.innerWalls], (proj) => proj.destroy()));

    // Combat Collisions
    this.colliders.push(this.physics.add.overlap(
      this.projectiles,
      this.enemies,
      this.onHitEnemy,
      null,
      this
    ));

    // Player vs Enemy (Collision Damage)
    this.colliders.push(this.physics.add.collider(
      this.player,
      this.enemies,
      (player, enemy) => {
        // Only take damage if enemy is actively harmful (e.g., charging or specific types)
        if ((enemy.isCharging || enemy.type === 'bee') && !this.invincible) { // Example: Bees always hurt on touch
          this.takeDamage();
        }
      },
      null,
      this
    ));

    // Player vs Enemy Projectiles
    this.colliders.push(this.physics.add.overlap(
      this.player,
      this.enemyProj,
      (player, proj) => { // Pass projectile to handler
         if (!this.invincible) {
             this.takeDamage();
             proj.destroy(); // Destroy projectile on hit
         }
      },
      null,
      this
    ));

    // Pickups
    this.colliders.push(this.physics.add.overlap(
      this.player,
      this.pickups,
      this.onPickup,
      null,
      this
    ));

    // Player vs Closed Doors
    // This collider is added dynamically when doors are created/closed
    this.doors.getChildren().forEach(door => {
        if (!door.isOpen) {
             door.collider = this.physics.add.collider(this.player, door);
             this.colliders.push(door.collider);
        }
    });

    // Physics world bounds collision for projectiles
    this.physics.world.on('worldbounds', (body) => {
        // Check if the body hitting the bounds is a projectile and destroy it
        if (this.projectiles.contains(body.gameObject) || this.enemyProj.contains(body.gameObject)) {
            body.gameObject.destroy();
        }
    });
  }

  createUI() {
    // Use a container for UI elements if needed, especially for scaling or positioning
    this.ui = this.add.container(0, 0).setDepth(100).setScrollFactor(0); // Set scroll factor 0 to fix UI position

    // Hearts display
    this.hearts = [];
    const maxHeartsToShow = 10; // Limit displayed hearts for sanity
    for (let i = 0; i < maxHeartsToShow; i++) {
      const h = this.add.image(100 + 48 * i, 60, "heart_empty"); // Start empty
      this.hearts.push(h);
      this.ui.add(h);
    }
    this.updateHearts(); // Initial update based on player health

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

    // Create prompts (door, shop)
    this.createPrompts();

    // Level transition text (initially hidden)
    this.nextLevelText = this.add
      .text(400, 250, "", {
        font: "32px Arial",
        fill: "#00ff00",
        backgroundColor: "#000",
        padding: { x: 10, y: 5 },
      })
      .setOrigin(0.5)
      .setVisible(false);
    this.ui.add(this.nextLevelText); // Add to UI container
  }

  performDodge() {
    if (this.isDodging || this.dodgeCount <= 0) return;

    // Find the next available dodge slot to put on cooldown
    // This logic assumes cooldowns are tracked correctly elsewhere
    // A simpler approach might be just decrementing count and starting one cooldown timer
    // Let's use the simpler approach for now:
    const availableSlotIndex = this.upgrades.dodge - this.dodgeCount; // Index of the dodge being used

    // Set states
    this.isDodging = true;
    this.invincible = true; // Invincible during dodge
    this.player.setTint(0x00ffff); // Cyan tint during dodge
    this.dodgeCount--;

    this.sounds.dash.play();

    // Start cooldown for the used dodge slot
    this.dodgeCooldowns[availableSlotIndex] = this.time.now + this.dodgeCooldownTime;

    // --- Determine Dodge Direction ---
    let dx = 0, dy = 0;
    let moveRequested = false;

    if (this.isMobile) {
      if (this.isTouching) {
        // Calculate direction from joystick center to touch position
        const centerX = this.cameras.main.width / 4; // Center of left half
        const centerY = this.cameras.main.height / 2;
        dx = this.touchPosition.x - centerX;
        dy = this.touchPosition.y - centerY;
        const length = Math.sqrt(dx * dx + dy * dy);

        if (length > 10) { // Only dodge if stick is moved significantly
            dx /= length;
            dy /= length;
            moveRequested = true;
        }
      }
      // If not touching or stick is centered, default dodge direction (e.g., forward)
      if (!moveRequested) {
        // Determine forward direction based on player sprite or last movement?
        // For simplicity, let's default to dodging upwards if no direction is input
        dy = -1;
      }

    } else { // Keyboard
      if (this.keys.W.isDown) { dy = -1; moveRequested = true; }
      else if (this.keys.S.isDown) { dy = 1; moveRequested = true; }

      if (this.keys.A.isDown) { dx = -1; moveRequested = true; }
      else if (this.keys.D.isDown) { dx = 1; moveRequested = true; }

      // If no movement keys are pressed, default dodge direction (e.g., forward/up)
      if (!moveRequested) {
        dy = -1; // Default dodge up
      }

      // Normalize diagonal movement
      if (dx !== 0 && dy !== 0) {
        const length = Math.sqrt(dx * dx + dy * dy);
        dx /= length;
        dy /= length;
      }
    }
    // --- End Dodge Direction ---


    this.player.setVelocity(dx * this.dodgeSpeed, dy * this.dodgeSpeed);

    // End dodge after duration
    this.time.delayedCall(this.dodgeDuration, () => {
      if (this.player.active) { // Check if player still exists
        this.isDodging = false;
        this.player.clearTint();
        // Stop movement ONLY if no movement keys are pressed AFTER the dodge ends
        // This requires checking keys again here, or setting velocity based on current input
        // Let's just stop velocity for simplicity, player needs to press keys again to move
        this.player.setVelocity(0, 0);

        // Check if player was hit during dodge; if so, invincibility remains for post-hit duration
        // Otherwise, remove invincibility
        if (this.time.now > this.player.lastDamageTime + 800) {
             this.invincible = false;
        }
      }
    });
  }


  createPrompts() {
    const promptY = this.isMobile ? 240 : 200; // Adjust Y position as needed

    // Door prompt (for desktop 'E' key)
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

    // Mobile door interaction zone (invisible, covers door area)
    // This might be better handled by checking distance in update loop
    // Let's stick to distance check for mobile door interaction for now.

    // Shop prompt (text displayed when near shop items)
    this.shopPrompt = this.add
      .text(400, promptY + 40, "", { // Position below door prompt
        font: "18px Arial",
        fill: "#fff",
        backgroundColor: "#333",
        padding: { x: 5, y: 2 },
      })
      .setOrigin(0.5)
      .setDepth(101)
      .setVisible(false);

    this.ui.add([this.doorPrompt, this.shopPrompt]); // Add to UI container
  }

  handleDoorInteraction(door) {
    // Called when player is near a door
    const distance = Phaser.Math.Distance.Between(
        this.player.x, this.player.y, door.x, door.y
    );

    if (distance < 60) { // Interaction radius
        if (door.isOpen) {
            // Show prompt for desktop
            if (!this.isMobile) {
                this.doorPrompt.setText("[E] Enter")
                    .setPosition(door.x, door.y - 40) // Position above door
                    .setVisible(true);
            }

            // Check for interaction input (Key E or crossing threshold)
            if ((!this.isMobile && this.keys.E.isDown) || this.isCrossingDoorThreshold(door)) {
                 const [nx, ny] = door.targetRoom.split(",").map(Number);
                 this.transitionToRoom(nx, ny, door.direction);
                 return true; // Interaction happened
            }
        } else if (!this.roomActive) {
             // Room is cleared, but this door was somehow missed? Open it.
             // This case should ideally not happen if openAllDoors works correctly.
             this.openDoor(door);
        }
    } else {
        // Hide prompt if player moved away (only hide if it was for this door)
        if (!this.isMobile && this.doorPrompt.visible && this.doorPrompt.x === door.x) {
             this.doorPrompt.setVisible(false);
        }
    }
    return false; // No interaction happened
  }

  isCrossingDoorThreshold(door) {
      // Check if player center has moved past the door's threshold
      const threshold = 10; // How far past the door center counts as crossing
      switch (door.direction) {
          case "up":    return this.player.y < door.y - threshold;
          case "down":  return this.player.y > door.y + threshold;
          case "left":  return this.player.x < door.x - threshold;
          case "right": return this.player.x > door.x + threshold;
      }
      return false;
  }


  setupMobileControls() {
    // Left half for movement joystick
    this.leftHalf = this.add
      .zone(0, 0, this.cameras.main.width / 2, this.cameras.main.height)
      .setOrigin(0)
      .setScrollFactor(0) // Fix zone to camera
      .setInteractive();

    // Touch position tracking
    this.touchPosition = { x: 0, y: 0 };
    this.isTouching = false;
    this.touchId = -1; // Track the finger used for movement

    // Movement controls
    this.leftHalf.on('pointerdown', (pointer) => {
        if (this.touchId === -1) { // Only track the first finger down on the left side
            this.isTouching = true;
            this.touchPosition.x = pointer.x;
            this.touchPosition.y = pointer.y;
            this.touchId = pointer.id;
            this.touchIndicator.setPosition(pointer.x, pointer.y).setVisible(true); // Show base at initial touch
            this.touchStick.setPosition(pointer.x, pointer.y).setVisible(true); // Show stick at initial touch
        }
    });

    this.input.on('pointermove', (pointer) => {
        // Only move if the correct finger is moving on the left side
        if (this.isTouching && pointer.id === this.touchId && pointer.x < this.cameras.main.width / 2) {
            this.touchPosition.x = pointer.x;
            this.touchPosition.y = pointer.y;

            // Update stick position relative to base
            const basePosX = this.touchIndicator.x;
            const basePosY = this.touchIndicator.y;
            let dx = pointer.x - basePosX;
            let dy = pointer.y - basePosY;
            const dist = Math.sqrt(dx*dx + dy*dy);
            const maxDist = 40; // Max distance stick can move from base

            if (dist > maxDist) {
                dx *= maxDist / dist;
                dy *= maxDist / dist;
            }
            this.touchStick.setPosition(basePosX + dx, basePosY + dy);

        }
    });

    this.input.on('pointerup', (pointer) => {
        // If the finger lifted is the one we were tracking for movement
        if (pointer.id === this.touchId) {
            this.isTouching = false;
            this.touchId = -1;
            this.touchIndicator.setVisible(false);
            this.touchStick.setVisible(false);
        }
    });


    // Right half for dodge
    this.rightHalf = this.add
      .zone(this.cameras.main.width / 2, 0, this.cameras.main.width / 2, this.cameras.main.height)
      .setOrigin(0)
      .setScrollFactor(0) // Fix zone to camera
      .setInteractive();

    this.rightHalf.on('pointerdown', (pointer) => {
        // Ensure this touch isn't the movement touch spilling over
        if (pointer.id !== this.touchId) {
            if (this.dodgeCount > 0) {
                this.performDodge();
            }
        }
    });

    // Auto-shooting timer
    this.autoShootTimerEvent = this.time.addEvent({ // Store reference to potentially pause/resume
      delay: 500, // Time between auto-shots
      callback: this.autoShoot,
      callbackScope: this,
      loop: true
    });

    // Touch indicators (visual feedback for joystick)
    this.touchIndicator = this.add
      .circle(100, 450, 40, 0xffffff, 0.3) // Base circle
      .setDepth(90)
      .setScrollFactor(0)
      .setVisible(false);

    this.touchStick = this.add
      .circle(100, 450, 20, 0xffffff, 0.7) // Knob circle
      .setDepth(91)
      .setScrollFactor(0)
      .setVisible(false);
  }

  fireProjectiles(angle) {
    const countSplit = this.upgrades.splitShot; // How many extra projectiles per side
    const spreadAngle = Math.PI / 12; // Angle between split shots
    const baseDamage = 10;
    const finalDamage = baseDamage * this.damageMultiplier;
    const projectileSpeed = 300;

    const fireOneSet = (delay = 0) => {
        this.time.delayedCall(delay, () => {
            if (!this.player.active) return; // Don't fire if player is destroyed

            // Center projectile
            const pCenter = this.projectiles.create(this.player.x, this.player.y, "projectile");
            pCenter.setVelocity(Math.cos(angle) * projectileSpeed, Math.sin(angle) * projectileSpeed);
            pCenter.damage = finalDamage;
            pCenter.body.onWorldBounds = true;

            // Split projectiles
            for (let i = 1; i <= countSplit; i++) {
                // Left side
                const angleL = angle - i * spreadAngle;
                const pL = this.projectiles.create(this.player.x, this.player.y, "projectile");
                pL.setVelocity(Math.cos(angleL) * projectileSpeed, Math.sin(angleL) * projectileSpeed);
                pL.damage = finalDamage;
                pL.body.onWorldBounds = true;


                // Right side
                const angleR = angle + i * spreadAngle;
                const pR = this.projectiles.create(this.player.x, this.player.y, "projectile");
                pR.setVelocity(Math.cos(angleR) * projectileSpeed, Math.sin(angleR) * projectileSpeed);
                pR.damage = finalDamage;
                pR.body.onWorldBounds = true;
            }
        });
    };

    // Fire the first set immediately
    fireOneSet();

    // If double shot is active, fire a second set after a short delay
    if (this.upgrades.doubleShot > 0) {
        // The second shot fires slightly later
        fireOneSet(100); // 100ms delay for the second shot
    }

    this.sounds.shot.play();
  }


  onBossDefeated() {
    // Mark room as cleared BEFORE potentially transitioning
    this.clearedRooms.add(`${this.currentRoom.x},${this.currentRoom.y}`);
    this.roomActive = false; // Ensure room is marked inactive

    // Play upgrade sound
    this.sounds.upgrade.play();

    if (this.currentWorld < this.maxWorlds) {
      this.currentWorld++;
      this.worldText.setText(`World: ${this.currentWorld}`);

      // Start the 5-second countdown visual
      this.nextLevelText.setText(`Going to next level in 5...`).setVisible(true);
      let countdown = 5;
      this.countdownEvent = this.time.addEvent({ // Store event to potentially cancel if needed
          delay: 1000,
          repeat: 4, // 5, 4, 3, 2, 1 (5 ticks total, 4 repeats)
          callback: () => {
              countdown--;
              this.nextLevelText.setText(`Going to next level in ${countdown}...`);
              if (countdown === 0) {
                  this.nextLevelText.setVisible(false);
                  this.generateWorldMap(); // Generate new layout
                  this.entryDoorDirection = null; // Reset entry direction for new world
                  this.loadRoom(0, 0); // Load the starting room of the new world
              }
          }
      });

    } else {
      // Victory Screen
      this.cameras.main.fadeOut(1000, 0, 0, 0);
      this.time.delayedCall(1000, () => {
          // Display victory message (or transition to a dedicated Victory Scene)
           const victory = this.add
            .text(400, 300, "Victory! You have conquered The Forsaken Depths!", {
              font: "24px Arial",
              fill: "#ffffff",
              backgroundColor: "#000000",
              padding: { x: 20, y: 10 },
              align: 'center',
              wordWrap: { width: 600 }
            })
            .setOrigin(0.5)
            .setDepth(200)
            .setScrollFactor(0); // Fix to camera

          this.time.delayedCall(5000, () => {
            this.scene.start("TitleScene");
          });
      });
    }
  }

  autoShoot() {
    // Only auto-shoot if mobile, player is active, and cooldown is ready
    if (!this.isMobile || !this.player.active || this.time.now < this.lastShootTime + this.shootCooldown) return;

    // Find the closest enemy within a certain range
    let closestEnemy = null;
    let minDistanceSq = 300 * 300; // Max auto-shoot range (squared for efficiency)

    this.enemies.getChildren().forEach(enemy => {
        if (!enemy.active) return; // Skip inactive enemies
        const distSq = Phaser.Math.Distance.Squared(this.player.x, this.player.y, enemy.x, enemy.y);

        if (distSq < minDistanceSq) {
            minDistanceSq = distSq;
            closestEnemy = enemy;
        }
    });

    // If an enemy is found in range, shoot at it
    if (closestEnemy) {
        const angle = Phaser.Math.Angle.Between(
            this.player.x, this.player.y, closestEnemy.x, closestEnemy.y
        );
        this.fireProjectiles(angle);
        this.lastShootTime = this.time.now; // Reset cooldown timer
    }
  }

  createPowerupIcons() {
    // Text label for the powerup section
    this.powerupsText = this.add.text(100, 500, "Powerups:", {
      font: "20px Arial",
      fill: "#fff"
    }).setDepth(101).setScrollFactor(0); // Fix to camera

    this.ui.add(this.powerupsText); // Add to UI container

    // Container to hold the actual powerup icons
    this.powerupContainer = this.add.container(100, 535).setDepth(101).setScrollFactor(0); // Position below text
    this.ui.add(this.powerupContainer); // Add to UI container
  }

  updatePowerupIcons() {
    this.powerupContainer.removeAll(true); // Clear previous icons

    const iconConfigs = [
      { // Damage
        count: this.upgrades.damage,
        icon: "damage_icon"
      },
      { // Speed
        count: this.upgrades.speed,
        icon: "speed_icon"
      },
      { // HP (show based on upgrades, not current health)
        count: this.upgrades.hp,
        icon: "hp_icon"
      },
      { // Double Shot
        count: this.upgrades.doubleShot,
        icon: "doubleshot_icon"
      },
      { // Split Shot
        count: this.upgrades.splitShot,
        icon: "splitshot_icon"
      }
      // Note: Dodge count is handled by the dedicated dodge UI
    ];

    let xOffset = 0;
    const iconSize = 32; // Assumed size of icons
    const gap = 8; // Gap between icons
    const maxIconsPerRow = 8; // How many icons before wrapping
    let currentY = 0;
    let iconsInRow = 0;

    iconConfigs.forEach(config => {
      if (config.count > 0) {
        for (let i = 0; i < config.count; i++) {
          if (iconsInRow >= maxIconsPerRow) {
              xOffset = 0;
              currentY += iconSize + gap;
              iconsInRow = 0;
          }
          const icon = this.add.image(xOffset, currentY, config.icon).setOrigin(0, 0).setScale(0.8); // Scale down slightly
          this.powerupContainer.add(icon);
          xOffset += (iconSize * 0.8) + gap; // Adjust offset based on scaled size
          iconsInRow++;
        }
      }
    });
  }

  generateWorldMap() {
    this.roomMap = {};
    this.visitedRooms = {}; // Reset visited status for the new world
    this.clearedRooms = new Set(); // Reset cleared status for the new world

    // Create start room
    this.roomMap["0,0"] = {
      type: "start", // Start room is always clear, no enemies
      doors: {},
      depth: 0,
      variation: 0 // No variation for start room
    };
    this.visitedRooms["0,0"] = true; // Mark start room as visited

    let currentPos = { x: 0, y: 0 };
    let pathLength = 0;
    const minPath = 3; // Minimum rooms in main path (excluding start)
    const maxPath = 6; // Maximum rooms in main path
    let bossRoomKey = null;

    // Generate main path towards the boss
    while (pathLength < maxPath) {
      const possibleDirections = Phaser.Utils.Array.Shuffle([
        { dx: 0, dy: -1, dir: "up", opp: "down" }, // Up
        { dx: 1, dy: 0, dir: "right", opp: "left" }, // Right
        { dx: 0, dy: 1, dir: "down", opp: "up" }, // Down
        { dx: -1, dy: 0, dir: "left", opp: "right" }, // Left
      ]);

      let moved = false;
      for (const move of possibleDirections) {
        const nextX = currentPos.x + move.dx;
        const nextY = currentPos.y + move.dy;
        const nextKey = `${nextX},${nextY}`;
        const currentKey = `${currentPos.x},${currentPos.y}`;

        // Check if the next room position is already taken
        if (!this.roomMap[nextKey]) {
          // Create the new room
          this.roomMap[nextKey] = {
            type: "normal", // Default to normal, will be changed later if needed
            doors: {},
            depth: pathLength + 1,
            variation: Phaser.Math.Between(1, 2), // Assign a random variation (1 or 2)
          };

          // Connect doors
          this.roomMap[currentKey].doors[move.dir] = nextKey;
          this.roomMap[nextKey].doors[move.opp] = currentKey;

          // Move to the new room
          currentPos = { x: nextX, y: nextY };
          pathLength++;
          bossRoomKey = nextKey; // Potential boss room is the last one added
          moved = true;
          break; // Exit loop after finding a valid direction
        }
      }

      // If no valid move was found from the current position, stop extending the path
      if (!moved || pathLength >= maxPath) {
          break;
      }
    }

    // Ensure minimum path length
    if (pathLength < minPath && bossRoomKey) {
        // This scenario is less likely with the loop structure but handle defensively
        // Could try extending again, or just accept a shorter path
    }

    // Set the last room in the main path as the boss room
    if (bossRoomKey) {
      this.roomMap[bossRoomKey].type = "boss";
    } else {
        // Fallback if no path could be generated (shouldn't happen with start room)
        // Maybe force a boss room adjacent to start?
        this.roomMap["1,0"] = { type: "boss", doors: {"left": "0,0"}, depth: 1, variation: 0 };
        this.roomMap["0,0"].doors["right"] = "1,0";
    }


    // Add a shop room (optional, could be guaranteed)
    const normalRoomKeys = Object.keys(this.roomMap).filter(
      (k) => k !== "0,0" && this.roomMap[k].type === "normal"
    );
    if (normalRoomKeys.length > 0) {
      const shopKey = Phaser.Utils.Array.GetRandom(normalRoomKeys);
      this.roomMap[shopKey].type = "shop";
    }

    // Add some side branches (optional)
    const maxBranches = 2;
    let branchesAdded = 0;
    const potentialBranchStarts = Object.keys(this.roomMap).filter(k => k !== bossRoomKey); // Don't branch off boss

    for (let i = 0; i < potentialBranchStarts.length && branchesAdded < maxBranches; i++) {
        const baseKey = Phaser.Utils.Array.GetRandom(potentialBranchStarts);
        const baseRoom = this.roomMap[baseKey];
        // Only add branch if the room has space for more doors (less than 3 existing)
        if (Object.keys(baseRoom.doors).length < 3) {
            const [baseX, baseY] = baseKey.split(",").map(Number);
            const possibleDirections = Phaser.Utils.Array.Shuffle([
                { dx: 0, dy: -1, dir: "up", opp: "down" }, { dx: 1, dy: 0, dir: "right", opp: "left" },
                { dx: 0, dy: 1, dir: "down", opp: "up" }, { dx: -1, dy: 0, dir: "left", opp: "right" },
            ]);

            for (const move of possibleDirections) {
                const nextX = baseX + move.dx;
                const nextY = baseY + move.dy;
                const nextKey = `${nextX},${nextY}`;

                // Check if room exists and if base room already has a door in this direction
                if (!this.roomMap[nextKey] && !baseRoom.doors[move.dir]) {
                    this.roomMap[nextKey] = {
                        type: "normal", // Branch rooms are usually normal
                        doors: {},
                        depth: baseRoom.depth + 1,
                        variation: Phaser.Math.Between(1, 2),
                    };
                    // Connect doors
                    baseRoom.doors[move.dir] = nextKey;
                    this.roomMap[nextKey].doors[move.opp] = baseKey;
                    branchesAdded++;
                    break; // Added one branch from this base room
                }
            }
        }
    }
  }

  loadRoom(x, y, entryDirection = null) {
    // --- Cleanup previous room ---
    if (this.shopIcons) {
      this.shopIcons.forEach((iconGroup) => {
          // Add checks here too, just in case
          if (iconGroup.sprite) iconGroup.sprite.destroy();
          if (iconGroup.text) iconGroup.text.destroy();
          if (iconGroup.desc) iconGroup.desc.destroy();
      });
      this.shopIcons = null;
    }
    this.enemies.clear(true, true);
    this.enemyProj.clear(true, true);
    this.innerWalls.clear(true, true);
    this.walls.clear(true, true);
    this.doors.clear(true, true); // Clear the doors group
    this.projectiles.clear(true, true);
    this.pickups.clear(true, true);

    // Clear dynamic colliders from previous room - MODIFY THIS PART
    if (this.colliders) {
        this.colliders.forEach(c => {
            // *** ADD THIS CHECK ***
            // Ensure 'c' exists and ideally check if it's still active in the physics world
            // Using 'c.active' is a good check provided by Phaser for colliders
            if (c && c.active) {
                c.destroy();
            }
            // *********************
        });
        this.colliders = []; // Reset the array AFTER the loop
    } else {
        this.colliders = []; // Initialize if it doesn't exist
    }
    // Hide prompts
    this.doorPrompt.setVisible(false);
    this.shopPrompt.setVisible(false);


    // --- Setup new room ---
    this.inTransition = false; // Mark transition as complete
    this.currentRoom = { x, y };
    this.entryDoorDirection = entryDirection; // Store how player entered

    const roomKey = `${x},${y}`;
    if (!this.roomMap[roomKey]) {
        console.error(`Room ${roomKey} not found in map!`);
        // Fallback: Go back to start?
        this.loadRoom(0, 0);
        return;
    }

    const currentRoomData = this.roomMap[roomKey];
    currentRoomData.visited = true; // Mark as visited for map generation logic (if needed)
    this.visitedRooms[roomKey] = true; // Mark as visited for minimap display

    // Determine if the room should have active enemies
    const isCleared = this.clearedRooms.has(roomKey);
    // Room is active if it's normal/boss AND not cleared
    this.roomActive = (currentRoomData.type === 'normal' || currentRoomData.type === 'boss') && !isCleared;

    // Create room layout (walls, background)
    this.createRoomLayout(roomKey, currentRoomData);

    // Spawn content based on room type and cleared status
    switch (currentRoomData.type) {
      case "shop":
        this.createShopRoom();
        this.roomActive = false; // Shops are never active/locked
        break;
      case "boss":
        if (!isCleared) {
            this.createBossRoom();
        }
        break;
      case "normal":
        if (!isCleared) {
            this.createNormalRoom();
        }
        break;
      case "start":
        this.roomActive = false; // Start room is never active
        break;
    }

    // Create doors for the current room AFTER determining if room is active
    this.createDoors(currentRoomData);

    // Setup physics colliders for the new room layout and entities
    // This will repopulate this.colliders
    this.setupColliders();

    // Update UI elements
    this.updateMinimap();
    this.updateHearts(); // Ensure hearts are correct after potential healing/max hp changes
  }

  createRoomLayout(key, roomData) {
    // Set background
    if (this.background) this.background.destroy();
    // Choose background based on world?
    this.background = this.add.image(400, 300, "bg").setDepth(-10);
    this.background.setScale(Math.max(this.sys.game.config.width / this.background.width, this.sys.game.config.height / this.background.height)); // Scale to fit/fill

    const { x1, y1, x2, y2 } = this.playArea;
    const wallTexture = `wall${this.currentWorld}`; // Use world-specific wall texture

    // Create outer walls based on whether a door exists in that direction
    // Top wall
    if (!roomData.doors?.up) {
      this.walls.create(400, y1 - 16, wallTexture).setOrigin(0.5, 0.5).setDisplaySize(x2 - x1 + 64, 32).refreshBody();
    }
    // Bottom wall
    if (!roomData.doors?.down) {
      this.walls.create(400, y2 + 16, wallTexture).setOrigin(0.5, 0.5).setDisplaySize(x2 - x1 + 64, 32).refreshBody();
    }
    // Left wall
    if (!roomData.doors?.left) {
      this.walls.create(x1 - 16, 300, wallTexture).setOrigin(0.5, 0.5).setDisplaySize(32, y2 - y1 + 64).refreshBody();
    }
    // Right wall
    if (!roomData.doors?.right) {
      this.walls.create(x2 + 16, 300, wallTexture).setOrigin(0.5, 0.5).setDisplaySize(32, y2 - y1 + 64).refreshBody();
    }

    // Add inner wall variations based on roomData.variation
    const variation = roomData.variation;
    const innerWallSize = 64; // Example size for inner blocks
    switch (variation) {
      case 1: // Cross pattern
        this.innerWalls.create(400, 300, wallTexture)
          .setOrigin(0.5)
          .setDisplaySize(innerWallSize * 4, innerWallSize * 0.5) // Horizontal bar
          .refreshBody();
        this.innerWalls.create(400, 300, wallTexture)
          .setOrigin(0.5)
          .setDisplaySize(innerWallSize * 0.5, innerWallSize * 4) // Vertical bar
          .refreshBody();
        break;
      case 2: // Corner blocks
        this.innerWalls.create(x1 + innerWallSize, y1 + innerWallSize, wallTexture)
          .setOrigin(0.5)
          .setDisplaySize(innerWallSize, innerWallSize)
          .refreshBody();
        this.innerWalls.create(x2 - innerWallSize, y1 + innerWallSize, wallTexture)
          .setOrigin(0.5)
          .setDisplaySize(innerWallSize, innerWallSize)
          .refreshBody();
        this.innerWalls.create(x1 + innerWallSize, y2 - innerWallSize, wallTexture)
          .setOrigin(0.5)
          .setDisplaySize(innerWallSize, innerWallSize)
          .refreshBody();
        this.innerWalls.create(x2 - innerWallSize, y2 - innerWallSize, wallTexture)
          .setOrigin(0.5)
          .setDisplaySize(innerWallSize, innerWallSize)
          .refreshBody();
        break;
      // case 0 or default: No inner walls (start room, potentially others)
    }
  }

  createDoors(roomData) {
    const { x1, y1, x2, y2 } = this.playArea;
    const doorsData = roomData.doors;

    Object.entries(doorsData).forEach(([direction, targetRoomKey]) => {
      let doorX = 400, doorY = 300;
      let doorTexture = "door"; // Default open texture

      // Determine position based on direction
      switch (direction) {
        case 'up':    doorY = y1; break;
        case 'down':  doorY = y2; break;
        case 'left':  doorX = x1; break;
        case 'right': doorX = x2; break;
      }

      // Check if the door should be closed (if room is active)
      const shouldBeClosed = this.roomActive;
      if (shouldBeClosed) {
          doorTexture = "door_closed";
      }

      // Create the door sprite and add it to the physics group
      const door = this.doors.create(doorX, doorY, doorTexture).setDepth(1).setImmovable(true);
      door.direction = direction;
      door.targetRoom = targetRoomKey;
      door.isOpen = !shouldBeClosed; // Set initial state
      door.collider = null; // Placeholder for the player collider if closed

      // If the door is closed, add a collider with the player
      if (!door.isOpen) {
          // Note: Collider is added in setupColliders to ensure it's managed correctly
      }
    });
  }

  openDoor(door) {
      if (!door.isOpen) {
          door.setTexture("door");
          door.isOpen = true;
          // Remove the specific collider between player and this door
          if (door.collider) {
              // Check if collider exists and is part of the physics world before removing
              if (this.physics.world.colliders.getActive().includes(door.collider)) {
                   door.collider.destroy(); // Use destroy() which removes it from the world
              }
              door.collider = null;
          }
      }
  }

  openAllDoors() {
    this.doors.getChildren().forEach(door => {
      this.openDoor(door);
    });
  }


  createNormalRoom() {
    // Get possible enemies for the current world
    const possibleEnemies = this.worldEnemies[this.currentWorld] || ["blob"]; // Fallback to blob
    const enemyCount = Phaser.Math.Between(3, 5); // Number of enemies to spawn

    // Determine entry door position to avoid spawning enemies too close
    let entryDoorPos = null;
    const { x1, y1, x2, y2 } = this.playArea;
    const safeSpawnDistanceSq = 150 * 150; // Squared distance check

    if (this.entryDoorDirection) {
        switch (this.entryDoorDirection) {
            case 'up':    entryDoorPos = { x: 400, y: y1 }; break;
            case 'down':  entryDoorPos = { x: 400, y: y2 }; break;
            case 'left':  entryDoorPos = { x: x1, y: 300 }; break;
            case 'right': entryDoorPos = { x: x2, y: 300 }; break;
        }
    }

    for (let i = 0; i < enemyCount; i++) {
      const enemyType = Phaser.Utils.Array.GetRandom(possibleEnemies);
      let spawnX, spawnY, distSq;
      let attempts = 0;
      const maxAttempts = 10; // Prevent infinite loop

      // Find a valid spawn position (not too close to entry door or center)
      do {
          // Generate random position within playable area, avoiding edges slightly
          spawnX = Phaser.Math.Between(this.playArea.x1 + 50, this.playArea.x2 - 50);
          spawnY = Phaser.Math.Between(this.playArea.y1 + 50, this.playArea.y2 - 50);

          // Check distance from entry door if applicable
          distSq = entryDoorPos ? Phaser.Math.Distance.Squared(spawnX, spawnY, entryDoorPos.x, entryDoorPos.y) : safeSpawnDistanceSq + 1;

          attempts++;
      } while (distSq < safeSpawnDistanceSq && attempts < maxAttempts);

      // If we couldn't find a good spot after several attempts, spawn anyway
      this.createEnemy(spawnX, spawnY, enemyType);
    }
    this.roomActive = true; // Mark room as active
  }

  createEnemy(x, y, type) {
    const enemy = this.enemies.create(x, y, type);
    if (!enemy || !enemy.body) return null; // Check if creation failed

    // Base stats (customize per enemy type)
    const baseStats = {
      blob: { health: 30, speed: 80, shootCooldown: 2000, damage: 1 },
      bee: { health: 25, speed: 150, shootCooldown: 0, damage: 1 }, // No shooting, contact damage
      witch: { health: 45, speed: 0, shootCooldown: 3500, damage: 1, teleportDelay: 500, shootDelay: 500 }, // Stationary, relies on teleport/shoot
      quasit: { health: 40, speed: 110, shootCooldown: 1800, damage: 1 },
      orc: { health: 60, speed: 90, shootCooldown: 0, chargePrepareTime: 1000, chargeDuration: 500, chargeSpeed: 250, damage: 2 }, // Charging enemy
      wizard: { health: 40, speed: 70, shootCooldown: 1500, damage: 1, fleeDistance: 150, engageDistance: 250 }, // Kiting enemy
      shapeshifter: { health: 50, speed: 120, shootCooldown: 2500, damage: 1, behaviorChangeTime: 3000 }, // Changes behavior
    };

    const stats = baseStats[type] || baseStats.blob; // Default to blob stats if type unknown

    // Apply stats
    enemy.health = this.hardMode ? Math.ceil(stats.health * 1.5) : stats.health;
    enemy.maxHealth = enemy.health; // Store max health if needed for UI/logic
    enemy.speed = stats.speed;
    enemy.type = type;
    enemy.shootCooldown = stats.shootCooldown;
    enemy.lastShootTime = this.time.now + Phaser.Math.Between(0, stats.shootCooldown / 2); // Stagger initial shots
    enemy.damage = stats.damage; // Damage dealt (e.g., on contact or projectile)

    // Type-specific properties
    enemy.isPreparingCharge = false;
    enemy.isCharging = false;
    enemy.chargePrepareTime = stats.chargePrepareTime;
    enemy.chargeDuration = stats.chargeDuration;
    enemy.chargeSpeed = stats.chargeSpeed;
    enemy.lastChargeAttempt = 0;
    enemy.chargeCooldown = 4000; // Cooldown between charge attempts for Orc

    enemy.fleeDistance = stats.fleeDistance;
    enemy.engageDistance = stats.engageDistance;

    enemy.behaviorTimer = 0;
    enemy.behaviorChangeTime = stats.behaviorChangeTime;
    enemy.currentBehavior = 'chase'; // Default behavior for shapeshifter

    enemy.isTeleporting = false; // For Witch
    enemy.teleportDelay = stats.teleportDelay;
    enemy.shootDelay = stats.shootDelay; // Delay between teleport and shoot for Witch

    // Ensure enemy collides with walls
    enemy.setCollideWorldBounds(true); // Collide with canvas edges too

    return enemy;
  }

  updateEnemy(enemy, time, delta) {
    if (!enemy.active || !this.player.active) return; // Skip if enemy or player is inactive

    const dx = this.player.x - enemy.x;
    const dy = this.player.y - enemy.y;
    const distSq = dx * dx + dy * dy; // Use squared distance for comparisons
    const dist = Math.sqrt(distSq);

    // Common behavior: Stop if too close (unless charging/specific type)
    const stopDistanceSq = 50 * 50; // Squared stop distance

    // --- Type-Specific Logic ---
    switch (enemy.type) {
      case "boss":
        if (enemy.updateAttack) {
          enemy.updateAttack(time); // Bosses have custom attack logic
        }
        // Basic boss movement (can be overridden in specific boss logic)
        if (dist > 100) { // Keep some distance
             this.physics.moveToObject(enemy, this.player, enemy.speed * 0.5);
        } else {
             enemy.setVelocity(0, 0);
        }
        break;

      case "witch":
        enemy.setVelocity(0, 0); // Witches don't move normally
        if (!enemy.isTeleporting && time > enemy.lastShootTime + enemy.shootCooldown) {
            enemy.isTeleporting = true;
            enemy.lastShootTime = time; // Reset timer immediately

            // 1. Shake effect
            this.tweens.add({
                targets: enemy,
                scaleX: 1.1,
                scaleY: 0.9,
                duration: 50,
                yoyo: true,
                repeat: 4, // ~400ms shake
                onComplete: () => {
                    if (!enemy.active) return; // Check if still active
                    enemy.setScale(1); // Reset scale

                    // 2. Teleport after shake (with delay)
                    this.time.delayedCall(enemy.teleportDelay, () => {
                        if (!enemy.active) return;

                        // Find a valid teleport spot (simple random for now)
                        // TODO: Add checks to prevent teleporting into walls?
                        const angle = Math.random() * Math.PI * 2;
                        const radius = Phaser.Math.Between(100, 200);
                        const targetX = this.player.x + Math.cos(angle) * radius;
                        const targetY = this.player.y + Math.sin(angle) * radius;

                        // Clamp position to play area bounds
                        enemy.x = Phaser.Math.Clamp(targetX, this.playArea.x1, this.playArea.x2);
                        enemy.y = Phaser.Math.Clamp(targetY, this.playArea.y1, this.playArea.y2);

                        // Visual feedback for teleport (optional)
                        enemy.alpha = 0.5;
                        this.time.delayedCall(100, () => { if(enemy.active) enemy.alpha = 1; });

                        // 3. Shoot after teleport (with delay)
                        this.time.delayedCall(enemy.shootDelay, () => {
                            if (enemy.active && this.player.active) {
                                this.shootEnemyProjectile(enemy, this.player.x, this.player.y);
                            }
                            // 4. End teleport sequence
                            enemy.isTeleporting = false;
                        });
                    });
                }
            });
        }
        break;

      case "wizard": // Kiting behavior
        if (distSq < enemy.fleeDistance * enemy.fleeDistance) {
            // Too close, move away
            enemy.setVelocity((-dx / dist) * enemy.speed, (-dy / dist) * enemy.speed);
        } else if (distSq > enemy.engageDistance * enemy.engageDistance) {
            // Too far, move closer slowly
            enemy.setVelocity((dx / dist) * enemy.speed * 0.5, (dy / dist) * enemy.speed * 0.5);
        } else {
            // In range, stop moving and shoot
            enemy.setVelocity(0, 0);
            if (time > enemy.lastShootTime + enemy.shootCooldown) {
                this.shootEnemyProjectile(enemy, this.player.x, this.player.y);
                enemy.lastShootTime = time;
            }
        }
        break;

      case "orc": // Charging behavior
        if (enemy.isCharging || enemy.isPreparingCharge) {
            // Handle charging state
            this.processChargingState(enemy, time);
        } else if (distSq < 150 * 150 && time > enemy.lastChargeAttempt + enemy.chargeCooldown) { // Range to start charge
            // Start charge preparation
            enemy.isPreparingCharge = true;
            enemy.chargeStartTime = time;
            enemy.lastChargeAttempt = time; // Start cooldown now
            enemy.setVelocity(0, 0); // Stop moving during prep
            enemy.setTint(0xffff00); // Yellow tint during prep
        } else {
            // Normal chase behavior when not charging/preparing
            if (distSq > stopDistanceSq) {
                 this.physics.moveToObject(enemy, this.player, enemy.speed);
            } else {
                 enemy.setVelocity(0, 0);
            }
        }
        break;

      case "shapeshifter":
        if (time > enemy.behaviorTimer) {
            // Change behavior periodically
            const behaviors = ['chase', 'flee', 'shoot', 'circle'];
            enemy.currentBehavior = Phaser.Utils.Array.GetRandom(behaviors);
            enemy.behaviorTimer = time + enemy.behaviorChangeTime;
            // Reset state for new behavior if needed
            enemy.setVelocity(0,0);
        }

        // Execute current behavior
        switch (enemy.currentBehavior) {
            case 'chase':
                if (distSq > stopDistanceSq) this.physics.moveToObject(enemy, this.player, enemy.speed);
                else enemy.setVelocity(0, 0);
                break;
            case 'flee':
                if (distSq < 300 * 300) enemy.setVelocity((-dx / dist) * enemy.speed, (-dy / dist) * enemy.speed);
                else enemy.setVelocity(0, 0); // Stop fleeing if far enough
                break;
            case 'shoot':
                enemy.setVelocity(0, 0); // Stand still to shoot
                if (time > enemy.lastShootTime + enemy.shootCooldown) {
                    this.shootEnemyProjectile(enemy, this.player.x, this.player.y);
                    enemy.lastShootTime = time;
                }
                break;
            case 'circle':
                 // Simple circling logic (adjust radius and speed)
                 const circleSpeed = enemy.speed * 0.8;
                 const angleOffset = Math.PI / 2; // Perpendicular offset
                 const targetAngle = Math.atan2(dy, dx);
                 const circleAngle = targetAngle + angleOffset;
                 enemy.setVelocity(Math.cos(circleAngle) * circleSpeed, Math.sin(circleAngle) * circleSpeed);
                break;
        }
        break;

      case "bee": // Simple aggressive chase
         this.physics.moveToObject(enemy, this.player, enemy.speed);
         break;

      case "blob": // Basic chase and shoot
      default:
        if (distSq > stopDistanceSq) {
           this.physics.moveToObject(enemy, this.player, enemy.speed);
        } else {
           enemy.setVelocity(0, 0);
        }
        // Shoot if cooldown ready
        if (enemy.shootCooldown && time > enemy.lastShootTime + enemy.shootCooldown) {
          this.shootEnemyProjectile(enemy, this.player.x, this.player.y);
          enemy.lastShootTime = time;
        }
        break;
    }
  }


  createBossRoom() {
    const bossTypes = {
      1: { sprite: 'boss1', health: 200, speed: 80, pattern: 'circle', attackDelay: 2000, projectileSpeed: 150 },
      2: { sprite: 'boss2', health: 250, speed: 90, pattern: 'charge', attackDelay: 2500, projectileSpeed: 180, chargePrepareTime: 1000, chargeDuration: 600, chargeSpeed: 300 },
      3: { sprite: 'boss3', health: 300, speed: 100, pattern: 'split', attackDelay: 3000, projectileSpeed: 200, splitDelay: 800 },
      4: { sprite: 'boss4', health: 350, speed: 110, pattern: 'spiral', attackDelay: 1500, projectileSpeed: 220, spiralCount: 5 }, // Faster attacks
      5: { sprite: 'boss5', health: 400, speed: 120, pattern: 'waves', attackDelay: 2600, projectileSpeed: 240, waveCount: 5, waveSpread: Math.PI / 3 },
      6: { sprite: 'boss', health: 500, speed: 100, pattern: 'combo', attackDelay: 3500, projectileSpeed: 210 } // Example final boss
    };

    const bossConfig = bossTypes[this.currentWorld] || bossTypes[1]; // Default to world 1 boss if config missing
    const boss = this.enemies.create(400, 150, bossConfig.sprite); // Spawn near top center
    if (!boss || !boss.body) return; // Creation check

    boss.setScale(2); // Bosses are larger
    boss.health = this.hardMode ? Math.ceil(bossConfig.health * 1.5) : bossConfig.health;
    boss.maxHealth = boss.health;
    boss.speed = bossConfig.speed;
    boss.type = 'boss'; // Critical for specific handling
    boss.pattern = bossConfig.pattern;
    boss.attackDelay = bossConfig.attackDelay;
    boss.projectileSpeed = bossConfig.projectileSpeed;
    boss.lastAttackTime = this.time.now + 1000; // Small delay before first attack
    boss.attackPhase = 0; // Used for patterns like spiral/circle

    // Pattern-specific properties
    boss.chargePrepareTime = bossConfig.chargePrepareTime;
    boss.chargeDuration = bossConfig.chargeDuration;
    boss.chargeSpeed = bossConfig.chargeSpeed;
    boss.isPreparingCharge = false;
    boss.isCharging = false;

    boss.splitDelay = bossConfig.splitDelay;
    boss.spiralCount = bossConfig.spiralCount;
    boss.waveCount = bossConfig.waveCount;
    boss.waveSpread = bossConfig.waveSpread;

    boss.setCollideWorldBounds(true);
    boss.setImmovable(true); // Bosses often shouldn't be pushed easily

    // --- Boss Attack Logic ---
    boss.updateAttack = (time) => {
        if (!boss.active || !this.player.active) return;

        // Handle charging state separately
        if (boss.isCharging || boss.isPreparingCharge) {
            this.processChargingState(boss, time);
            return; // Don't execute normal attacks while charging
        }

        // Check attack cooldown
        if (time < boss.lastAttackTime + boss.attackDelay) return;

        boss.lastAttackTime = time;
        const intensity = 0.008; // Screen shake intensity
        const duration = 300; // Screen shake duration

        // Execute attack based on pattern
        switch (boss.pattern) {
            case 'circle':
                const circleCount = 8;
                for (let i = 0; i < circleCount; i++) {
                    const angle = (i / circleCount) * Math.PI * 2 + boss.attackPhase;
                    this.createBossProjectile(boss.x, boss.y, Math.cos(angle) * boss.projectileSpeed, Math.sin(angle) * boss.projectileSpeed);
                }
                boss.attackPhase += Math.PI / 16; // Rotate pattern slightly each time
                this.shake(intensity, duration);
                break;

            case 'charge':
                // Initiate charge preparation
                boss.isPreparingCharge = true;
                boss.chargeStartTime = time;
                boss.setVelocity(0, 0);
                boss.setTint(0xffa500); // Orange tint during prep
                break;

            case 'split':
                const splitAngles = [0, Math.PI / 2, Math.PI, (3 * Math.PI) / 2]; // 4 directions
                splitAngles.forEach(angle => {
                    const proj = this.createBossProjectile(boss.x, boss.y, Math.cos(angle) * boss.projectileSpeed, Math.sin(angle) * boss.projectileSpeed);
                    if (proj) {
                        // Schedule the split
                        this.time.delayedCall(boss.splitDelay, () => {
                            if (proj.active) { // Check if original projectile still exists
                                const splitCount = 3;
                                for (let i = 0; i < splitCount; i++) {
                                    const splitAngle = angle + (i - 1) * (Math.PI / 6); // Small spread
                                    this.createBossProjectile(proj.x, proj.y, Math.cos(splitAngle) * boss.projectileSpeed * 0.7, Math.sin(splitAngle) * boss.projectileSpeed * 0.7);
                                }
                                proj.destroy(); // Destroy original after splitting
                            }
                        });
                    }
                });
                this.shake(intensity * 0.8, duration);
                break;

            case 'spiral':
                for (let i = 0; i < boss.spiralCount; i++) {
                    const spiralAngle = boss.attackPhase + (i * Math.PI * 2 / boss.spiralCount);
                    this.createBossProjectile(boss.x, boss.y, Math.cos(spiralAngle) * boss.projectileSpeed, Math.sin(spiralAngle) * boss.projectileSpeed);
                }
                boss.attackPhase += Math.PI / 12; // Adjust rotation speed
                this.shake(intensity * 0.6, duration);
                break;

            case 'waves':
                const baseAngle = Phaser.Math.Angle.Between(boss.x, boss.y, this.player.x, this.player.y);
                for (let i = 0; i < boss.waveCount; i++) {
                    // Calculate angle for each projectile in the wave
                    const offset = (i - (boss.waveCount - 1) / 2) * (boss.waveSpread / (boss.waveCount > 1 ? boss.waveCount - 1 : 1));
                    const angle = baseAngle + offset;
                    this.createBossProjectile(boss.x, boss.y, Math.cos(angle) * boss.projectileSpeed, Math.sin(angle) * boss.projectileSpeed);
                }
                this.shake(intensity * 0.7, duration);
                break;

            case 'combo': // Example: Mix of circle and targeted shots
                 // Circle part
                 const comboCircleCount = 6;
                 for (let i = 0; i < comboCircleCount; i++) {
                     const angle = (i / comboCircleCount) * Math.PI * 2 + boss.attackPhase;
                     this.createBossProjectile(boss.x, boss.y, Math.cos(angle) * boss.projectileSpeed * 0.8, Math.sin(angle) * boss.projectileSpeed * 0.8);
                 }
                 boss.attackPhase += Math.PI / 10;
                 // Targeted part (after a small delay)
                 this.time.delayedCall(300, () => {
                     if(boss.active && this.player.active) {
                         const targetAngle = Phaser.Math.Angle.Between(boss.x, boss.y, this.player.x, this.player.y);
                         this.createBossProjectile(boss.x, boss.y, Math.cos(targetAngle) * boss.projectileSpeed, Math.sin(targetAngle) * boss.projectileSpeed);
                     }
                 });
                 this.shake(intensity, duration);
                 break;
        }
    };
    this.roomActive = true; // Mark room as active
  }

  shootEnemyProjectile(enemy, targetX, targetY) {
    if (!enemy.active) return; // Don't shoot if enemy is dead

    const angle = Phaser.Math.Angle.Between(enemy.x, enemy.y, targetX, targetY);
    const speed = (enemy.type === 'wizard' || enemy.type === 'witch') ? 200 : 150; // Adjust speed per type
    const texture = (enemy.type === 'witch') ? 'boss_projectile' : 'blob_projectile'; // Witch uses different projectile?
    const scale = 1; // Adjust scale if needed

    const proj = this.enemyProj.create(enemy.x, enemy.y, texture);
    if (!proj) return; // Pool check

    proj.setScale(scale);
    proj.setVelocity(Math.cos(angle) * speed, Math.sin(angle) * speed);
    proj.damage = enemy.damage; // Assign damage value to projectile if needed elsewhere
    proj.body.onWorldBounds = true; // Ensure it checks world bounds
  }


  onHitEnemy(proj, enemy) {
    if (!proj.active || !enemy.active) return; // Ignore if either is already inactive

    // Visual feedback: Tint red briefly
    enemy.setTint(0xff0000);
    this.time.delayedCall(100, () => {
      if (enemy.active) enemy.clearTint(); // Check active before clearing tint
    });

    // Apply damage
    enemy.health -= proj.damage; // Use damage property from projectile
    proj.destroy(); // Destroy the projectile

    // Check for enemy death
    if (enemy.health <= 0) {
      // --- Enemy Defeated ---
      enemy.destroy(); // Remove enemy sprite and body

      // Drop rewards
      if (enemy.type === "boss") {
        // Bosses always drop an upgrade
        this.dropRandomUpgrade(enemy.x, enemy.y);
        this.onBossDefeated(); // Trigger boss defeat sequence (next level, etc.)
        // Sound played in onBossDefeated
      } else {
        // Regular enemies drop coins (maybe chance for health?)
        this.coins++;
        this.coinsText.setText(`Coins: ${this.coins}`);
        // Potential health drop chance
        if (Phaser.Math.Between(1, 20) === 1) { // 5% chance
            // Create a small health pickup? (Needs asset and pickup logic)
        }
      }

      // Check if room is now clear
      if (this.roomActive && this.enemies.countActive() === 0) {
          this.roomActive = false;
          this.openAllDoors();
          this.clearedRooms.add(`${this.currentRoom.x},${this.currentRoom.y}`);
          // Play room clear sound?
      }
    }
  }

  processChargingState(enemy, time) {
    if (!enemy.active) return;

    if (enemy.isPreparingCharge) {
      // Check if preparation time is over
      if (time > enemy.chargeStartTime + enemy.chargePrepareTime) {
        enemy.isPreparingCharge = false;
        enemy.isCharging = true;
        enemy.chargeEndTime = time + enemy.chargeDuration; // Calculate when charge ends

        // Determine charge direction towards player's position *at the start of the charge*
        const targetX = this.player.x;
        const targetY = this.player.y;
        const angle = Phaser.Math.Angle.Between(enemy.x, enemy.y, targetX, targetY);

        // Set velocity for the charge
        enemy.setVelocity(
          Math.cos(angle) * enemy.chargeSpeed,
          Math.sin(angle) * enemy.chargeSpeed
        );

        // Visual feedback for charging
        enemy.setTint(0xff0000); // Red tint while charging
      }
    } else if (enemy.isCharging) {
      // Check if charge duration is over
      if (time > enemy.chargeEndTime) {
        enemy.isCharging = false;
        enemy.clearTint();
        enemy.setVelocity(0, 0); // Stop after charging
        // enemy.lastShootTime = time; // Use if charge acts as an "attack" for cooldown purposes
      }
      // Note: Collision handling during charge is done in setupColliders
    }
  }


  dropRandomUpgrade(x, y) {
    // Define possible upgrades and their corresponding icons
    const upgradeOptions = [
      { key: "hp", icon: "hp_icon" },
      { key: "damage", icon: "damage_icon" },
      { key: "speed", icon: "speed_icon" },
      { key: "doubleShot", icon: "doubleshot_icon" },
      { key: "splitShot", icon: "splitshot_icon" },
      { key: "dodge", icon: "dodge_icon" },
      // Add more potential upgrades here if needed
    ];

    // Choose a random upgrade
    const chosenUpgrade = Phaser.Utils.Array.GetRandom(upgradeOptions);

    // Create the pickup sprite at the specified location
    const pickup = this.pickups.create(x, y, chosenUpgrade.icon);
    if (!pickup) return; // Check if creation failed

    pickup.upgradeType = chosenUpgrade.key; // Store the type of upgrade this pickup represents
    pickup.setScale(1.2); // Make it slightly larger and more visible

    // Add a visual effect (e.g., pulsing scale or floating)
    this.tweens.add({
      targets: pickup,
      scale: 1.4, // Pulse slightly larger
      yoyo: true, // Scale back down
      repeat: -1, // Repeat indefinitely
      duration: 500, // Duration of one pulse cycle
      ease: 'Sine.easeInOut'
    });

    // Optional: Add floating effect
    this.tweens.add({
        targets: pickup,
        y: y - 10, // Float up
        yoyo: true,
        repeat: -1,
        duration: 1000, // Slower duration for floating
        ease: 'Sine.easeInOut'
    });
  }

  onPickup(player, pickup) {
    if (!pickup.active) return; // Ignore if pickup already collected

    this.sounds.powerup.play(); // Play powerup sound effect

    // Apply the upgrade based on the pickup's type
    switch (pickup.upgradeType) {
      case "hp":
        this.player.maxHealth += 2;
        // Heal the player by the amount gained, up to the new max health
        this.player.health = Math.min(this.player.health + 2, this.player.maxHealth);
        this.upgrades.hp++;
        this.updateHearts(); // Update heart display immediately
        break;
      case "damage":
        this.damageMultiplier += 0.3; // Increase damage multiplier
        this.upgrades.damage++;
        break;
      case "speed":
        this.playerSpeed += 20; // Increase base player speed
        this.upgrades.speed++;
        break;
      case "doubleShot":
        this.upgrades.doubleShot++; // Increment double shot level
        break;
      case "splitShot":
        this.upgrades.splitShot++; // Increment split shot level (more projectiles per side)
        break;
      case "dodge":
        if (this.upgrades.dodge < 5) { // Add a cap to dodges? (e.g., max 5)
            this.upgrades.dodge++;
            this.dodgeCount++; // Immediately gain the extra dodge charge
            // Add a new null entry to the cooldowns array
            this.dodgeCooldowns.push(null);
            // Update the dodge UI (called in main update loop)
        } else {
            // If max dodges reached, maybe give coins instead?
            this.coins += 5;
            this.coinsText.setText(`Coins: ${this.coins}`);
            this.showTempMessage("Max Dodges Reached! +5 Coins");
        }
        break;
      // Add cases for other pickup types (e.g., coins, health potions) if implemented
    }

    this.updatePowerupIcons(); // Update the display of collected powerups
    pickup.destroy(); // Remove the pickup item from the game
  }

  createShopRoom() {
    // Define the items available in the shop
    const shopItems = [
      { key: 'hp', name: 'Max Health +2', icon: 'hp_icon', cost: 5, type: 'upgrade', desc: '+2 max health' },
      { key: 'damage', name: 'Damage Up', icon: 'damage_icon', cost: 10, type: 'upgrade', desc: '+0.3 damage mult' },
      { key: 'speed', name: 'Speed Up', icon: 'speed_icon', cost: 5, type: 'upgrade', desc: '+20 move speed' },
      { key: 'doubleShot', name: 'Double Shot', icon: 'doubleshot_icon', cost: 15, type: 'upgrade', desc: 'Fire second volley' },
      { key: 'splitShot', name: 'Split Shot +1', icon: 'splitshot_icon', cost: 15, type: 'upgrade', desc: '+1 proj per side' },
      { key: 'dodge', name: 'Extra Dodge', icon: 'dodge_icon', cost: 10, type: 'upgrade', desc: '+1 dodge charge' },
      { key: 'heal', name: 'Health Potion', icon: 'hp_icon', cost: 5, type: 'consumable', desc: 'Restore 2 health' }
    ];

    // Randomly select 3 items to display (ensure no duplicates if possible)
    const selection = Phaser.Utils.Array.Shuffle(shopItems).slice(0, 3);
    this.shopIcons = []; // Array to store shop item sprites and texts

    // Display the selected items
    selection.forEach((item, i) => {
      const x = 250 + i * 150; // Position items horizontally
      const y = 300; // Vertical position of items

      // Create item sprite
      const sprite = this.add.image(x, y, item.icon)
        .setScale(1.5) // Make icons noticeable
        .setInteractive({ useHandCursor: true }); // Make it clickable

      // Create item name and cost text
      const text = this.add.text(x, y + 50, `${item.name}\nCost: ${item.cost}`, {
        font: '16px Arial',
        fill: '#fff',
        align: 'center',
        backgroundColor: '#000a', // Semi-transparent background
        padding: { x: 5, y: 2 }
      }).setOrigin(0.5);

      // Create item description text
      const desc = this.add.text(x, y + 90, item.desc, {
        font: '12px Arial',
        fill: '#bbb',
        align: 'center',
        wordWrap: { width: 120 } // Wrap description text
      }).setOrigin(0.5);

      // Store references
      const itemGroup = { sprite, text, desc, itemData: item };
      this.shopIcons.push(itemGroup);

      // Handle purchase on click/tap
      sprite.on('pointerdown', () => {
        if (this.coins >= item.cost) {
          // Sufficient coins
          this.coins -= item.cost;
          this.coinsText.setText(`Coins: ${this.coins}`);
          this.sounds.upgrade.play(); // Use upgrade sound for purchase

          // Apply effect based on type
          if (item.type === 'upgrade') {
            // Use the onPickup logic to apply the upgrade
            this.onPickup(this.player, {
              upgradeType: item.key,
              active: true, // Mock active state for onPickup
              destroy: () => {} // Mock destroy function
            });
            this.showTempMessage(`Purchased: ${item.name}`);
          } else if (item.type === 'consumable') {
            if (item.key === 'heal') {
              const healthBefore = this.player.health;
              this.player.health = Math.min(this.player.maxHealth, this.player.health + 2);
              const healedAmount = this.player.health - healthBefore;
              if (healedAmount > 0) {
                  this.updateHearts();
                  this.showTempMessage(`Healed ${healedAmount} health!`);
                  this.sounds.powerup.play(); // Use powerup sound for heal
              } else {
                  this.showTempMessage(`Already at full health!`);
                  // Refund? Or just waste the purchase? Let's waste it for now.
                  // this.coins += item.cost; // Uncomment to refund
                  // this.coinsText.setText(`Coins: ${this.coins}`);
              }
            }
          }

          // Remove the purchased item from the shop display
          sprite.disableInteractive().setTint(0x555555); // Grey out and disable
          text.setVisible(false); // Hide text
          desc.setVisible(false);
          // Optionally, completely destroy the elements:
          // sprite.destroy();
          // text.destroy();
          // desc.destroy();

        } else {
          // Not enough coins
          this.showTempMessage('Not enough coins!');
          this.sounds.death.play({volume: 0.3}); // Play a failure sound quietly
        }
      });

      // Show description on hover (desktop)
      if (!this.isMobile) {
          sprite.on('pointerover', () => desc.setVisible(true));
          sprite.on('pointerout', () => desc.setVisible(false));
          desc.setVisible(false); // Initially hidden
      } else {
          desc.setVisible(true); // Always visible on mobile
      }

    });

    // Display general shop instructions
    this.shopPrompt.setText('Shop: Tap an item to buy')
        .setPosition(400, 180) // Position instructions above items
        .setVisible(true);
  }


  showTempMessage(text) {
    // Check if a message is already displayed, remove it first
    if (this.tempMessage) {
        this.tempMessage.destroy();
    }

    const msg = this.add
      .text(400, 100, text, { // Position near top-center
        font: "24px Arial",
        fill: "#ffff00", // Yellow text
        backgroundColor: "#000000a0", // Semi-transparent black background
        padding: { x: 15, y: 8 },
        align: 'center'
      })
      .setOrigin(0.5)
      .setDepth(200) // Ensure it's above most elements
      .setScrollFactor(0); // Fix to camera

    this.tempMessage = msg; // Store reference

    // Automatically destroy the message after a delay
    this.time.delayedCall(3000, () => { // 3 seconds duration
        if (this.tempMessage === msg) { // Only destroy if it's still the current message
             msg.destroy();
             this.tempMessage = null;
        }
    });
  }

  shake(intensity = 0.005, duration = 100) {
    this.cameras.main.shake(duration, intensity, false); // `false` for force parameter
  }

  updateHearts() {
    const maxHearts = Math.ceil(this.player.maxHealth / 2);
    const fullHearts = Math.floor(this.player.health / 2);
    const halfHeart = this.player.health % 2 === 1;

    // Iterate through the displayed heart sprites
    this.hearts.forEach((heartSprite, i) => {
      if (i < maxHearts) {
        // This heart position corresponds to potential health
        heartSprite.setVisible(true); // Make sure it's visible
        if (i < fullHearts) {
          heartSprite.setTexture("heart_full"); // Display a full heart
        } else if (i === fullHearts && halfHeart) {
          heartSprite.setTexture("heart_half"); // Display a half heart
        } else {
          heartSprite.setTexture("heart_empty"); // Display an empty heart container
        }
      } else {
        // This heart position is beyond the player's max health
        heartSprite.setVisible(false); // Hide extra heart sprites
      }
    });
  }

  resetGame() {
    // Reset player stats and upgrades
    this.coins = 0;
    this.damageMultiplier = 1;
    this.playerSpeed = 160;
    this.upgrades = { hp: 0, damage: 0, speed: 0, doubleShot: 0, splitShot: 0, dodge: 2 };
    this.player.health = 6;
    this.player.maxHealth = 6;

    // Reset dodge system
    this.dodgeCount = 2;
    this.dodgeCooldowns = Array(this.upgrades.dodge).fill(null);

    // Reset world progression
    this.currentWorld = 1;
    this.hardMode = false; // Ensure hard mode is off on restart

    // Reset room tracking
    this.clearedRooms = new Set();
    this.visitedRooms = {};
    this.roomActive = false;
    this.entryDoorDirection = null;

    // Update UI immediately
    if (this.coinsText) this.coinsText.setText(`Coins: ${this.coins}`);
    if (this.worldText) this.worldText.setText(`World: ${this.currentWorld}`);
    if (this.hearts) this.updateHearts();
    if (this.powerupContainer) this.updatePowerupIcons();

    // Note: World map regeneration and loading room 0,0 happens in create/loadRoom
  }

  transitionToRoom(x, y, direction) {
    if (this.inTransition) return; // Prevent double transitions
    this.inTransition = true;

    // Store the direction we came from for the next room's load logic
    const entryDirection = { 'up': 'down', 'down': 'up', 'left': 'right', 'right': 'left' }[direction];

    // Calculate player's spawn position in the new room
    const { x1, y1, x2, y2 } = this.playArea;
    const offset = 50; // How far from the edge the player spawns
    let newPlayerX = this.player.x;
    let newPlayerY = this.player.y;

    switch (direction) {
      case "up":    newPlayerY = y2 - offset; break;
      case "down":  newPlayerY = y1 + offset; break;
      case "left":  newPlayerX = x2 - offset; break;
      case "right": newPlayerX = x1 + offset; break;
    }

    // Fade out screen
    this.cameras.main.fade(250, 0, 0, 0, false, (camera, progress) => {
        if (progress === 1) {
            // --- Actions after fade out ---
            // Stop player movement during transition
            this.player.setVelocity(0, 0);

            // Load the new room content (walls, enemies, doors etc.)
            this.loadRoom(x, y, entryDirection); // Pass the entry direction

            // Position the player in the new room
            this.player.setPosition(newPlayerX, newPlayerY);

            // --- Fade back in ---
            this.cameras.main.fadeIn(250, 0, 0, 0);
            // Optional: Short delay before allowing movement again
            this.time.delayedCall(100, () => {
                 this.inTransition = false; // Allow actions again slightly before fade completes
            });
            // --- End Fade In ---
        }
    });
  }


  updateMinimap() {
    if (!this.minimapObj) {
      // Create minimap graphics object if it doesn't exist
      this.minimapObj = this.add.graphics().setDepth(100).setScrollFactor(0); // Fix to camera
      this.ui.add(this.minimapObj); // Add to UI container
    } else {
      this.minimapObj.clear(); // Clear previous drawing
    }

    // Minimap settings
    const cellWidth = 10;
    const cellHeight = 8;
    const cellPadding = 2;
    const mapOriginX = 650; // Top-right corner position
    const mapOriginY = 50;
    const visitedColor = 0xaaaaaa; // Grey for visited
    const currentColor = 0x00ff00; // Green for current room
    const bossColor = 0xff0000;    // Red for boss room (if known)
    const shopColor = 0xffff00;    // Yellow for shop room (if known)
    const unknownColor = 0x555555; // Dark grey for unseen adjacent rooms

    // Find bounds of the discovered map to center it (optional, but nice)
    let minX = 0, minY = 0, maxX = 0, maxY = 0;
    Object.keys(this.visitedRooms).forEach(key => {
        const [rx, ry] = key.split(",").map(Number);
        minX = Math.min(minX, rx);
        minY = Math.min(minY, ry);
        maxX = Math.max(maxX, rx);
        maxY = Math.max(maxY, ry);
    });

    // Draw visited rooms and potential adjacent rooms
    const drawnKeys = new Set(); // Keep track of what's drawn

    Object.keys(this.visitedRooms).forEach(key => {
        if (drawnKeys.has(key)) return; // Skip if already drawn (e.g., as adjacent)

        const [rx, ry] = key.split(",").map(Number);
        const roomData = this.roomMap[key];
        if (!roomData) return; // Skip if room data doesn't exist for some reason

        // Calculate drawing position relative to map origin and bounds
        const drawX = mapOriginX + (rx - minX) * (cellWidth + cellPadding);
        const drawY = mapOriginY + (ry - minY) * (cellHeight + cellPadding);

        // Determine fill color based on room type and status
        let fillColor = visitedColor; // Default for visited
        if (roomData.type === 'boss') fillColor = bossColor;
        if (roomData.type === 'shop') fillColor = shopColor;
        if (rx === this.currentRoom.x && ry === this.currentRoom.y) {
            fillColor = currentColor; // Override for current room
        }

        // Draw the room rectangle
        this.minimapObj.fillStyle(fillColor, 0.8); // Slightly transparent fill
        this.minimapObj.fillRect(drawX, drawY, cellWidth, cellHeight);
        drawnKeys.add(key);

        // Draw adjacent, unvisited rooms (fog of war)
        Object.values(roomData.doors).forEach(neighborKey => {
            if (!this.visitedRooms[neighborKey] && !drawnKeys.has(neighborKey)) {
                const [nx, ny] = neighborKey.split(",").map(Number);
                const neighborDrawX = mapOriginX + (nx - minX) * (cellWidth + cellPadding);
                const neighborDrawY = mapOriginY + (ny - minY) * (cellHeight + cellPadding);

                this.minimapObj.fillStyle(unknownColor, 0.6);
                this.minimapObj.fillRect(neighborDrawX, neighborDrawY, cellWidth, cellHeight);
                drawnKeys.add(neighborKey); // Mark as drawn to avoid duplicates
            }
        });
    });

     // Optional: Draw outline around the current room for extra emphasis
     const currentDrawX = mapOriginX + (this.currentRoom.x - minX) * (cellWidth + cellPadding);
     const currentDrawY = mapOriginY + (this.currentRoom.y - minY) * (cellHeight + cellPadding);
     this.minimapObj.lineStyle(1, 0xffffff, 1); // White outline
     this.minimapObj.strokeRect(currentDrawX - 1, currentDrawY - 1, cellWidth + 2, cellHeight + 2);
  }

  update(time, delta) {
    if (!this.player.active || this.inTransition) return; // Do nothing if player is dead or transitioning

    // --- Player Movement ---
    if (!this.isDodging) {
      let targetVelocityX = 0;
      let targetVelocityY = 0;
      let isMoving = false;

      if (this.isMobile) {
        if (this.isTouching) {
          // Calculate movement vector from joystick base to current touch
          const basePosX = this.touchIndicator.x;
          const basePosY = this.touchIndicator.y;
          let dx = this.touchPosition.x - basePosX;
          let dy = this.touchPosition.y - basePosY;
          const length = Math.sqrt(dx * dx + dy * dy);
          const deadZone = 10; // Ignore small movements near center

          if (length > deadZone) {
            // Normalize vector
            dx /= length;
            dy /= length;
            targetVelocityX = dx * this.playerSpeed;
            targetVelocityY = dy * this.playerSpeed;
            isMoving = true;
          }
        }
        // Hide joystick visuals if not touching
        this.touchIndicator.setVisible(this.isTouching);
        this.touchStick.setVisible(this.isTouching);

      } else { // Keyboard Movement
        let dx = 0;
        let dy = 0;
        if (this.keys.W.isDown) dy = -1;
        else if (this.keys.S.isDown) dy = 1;
        if (this.keys.A.isDown) dx = -1;
        else if (this.keys.D.isDown) dx = 1;

        if (dx !== 0 || dy !== 0) {
            isMoving = true;
            // Normalize diagonal movement
            if (dx !== 0 && dy !== 0) {
                const length = Math.sqrt(2);
                dx /= length;
                dy /= length;
            }
            targetVelocityX = dx * this.playerSpeed;
            targetVelocityY = dy * this.playerSpeed;
        }
      }

      // Apply velocity
      this.player.setVelocity(targetVelocityX, targetVelocityY);

      // Play walking sound occasionally when moving
      if (isMoving && time > this.footstepTimer + 300) {
        this.sounds.walk.play();
        this.footstepTimer = time;
      }
    } // End if (!isDodging)

    // --- Player Shooting (Keyboard/Arrows) ---
    if (!this.isMobile && !this.isDodging) {
        let shootDx = 0;
        let shootDy = 0;
        if (this.keys.LEFT.isDown) shootDx = -1;
        else if (this.keys.RIGHT.isDown) shootDx = 1;
        if (this.keys.UP.isDown) shootDy = -1;
        else if (this.keys.DOWN.isDown) shootDy = 1;

        if ((shootDx !== 0 || shootDy !== 0) && time > this.lastShootTime + this.shootCooldown) {
            const angle = Math.atan2(shootDy, shootDx); // Calculate angle from direction vector
            this.fireProjectiles(angle);
            this.lastShootTime = time;
        }
    }

    // --- Player Dodge (Keyboard) ---
    if (!this.isMobile && Phaser.Input.Keyboard.JustDown(this.keys.SPACE)) {
         this.performDodge();
    }

    // --- Enemy Updates ---
    this.enemies.getChildren().forEach(enemy => {
      this.updateEnemy(enemy, time, delta);
    });

    // --- Door Interaction ---
    let nearDoor = false;
    this.doors.getChildren().forEach(door => {
        if (this.handleDoorInteraction(door)) {
            nearDoor = true; // Set flag if interaction occurred (transition started)
        }
    });
    // Hide desktop prompt if not near any door
    if (!this.isMobile && !nearDoor && this.doorPrompt.visible) {
        this.doorPrompt.setVisible(false);
    }


    // --- Dodge Cooldown and UI Update ---
    let dodgesRecovered = 0;
    for (let i = 0; i < this.upgrades.dodge; i++) {
        if (this.dodgeCooldowns[i] !== null && time >= this.dodgeCooldowns[i]) {
            this.dodgeCooldowns[i] = null; // Cooldown finished
            dodgesRecovered++;
        }
    }
    // Add recovered dodges back to count, capped by max dodges
    if (dodgesRecovered > 0) {
        this.dodgeCount = Math.min(this.upgrades.dodge, this.dodgeCount + dodgesRecovered);
    }
    this.drawDodgeUI(time); // Update the visual dodge indicators

    // --- Room Clear Check ---
    // Moved inside onHitEnemy for more immediate response

  } // End update()

  drawDodgeUI(time) {
    this.minimap.clear(); // Using 'minimap' graphics object for dodge UI

    const uiX = 400; // Center X position for the UI
    const uiY = 565; // Y position near the bottom
    const radius = 15; // Radius of each dodge indicator circle
    const gap = 40; // Gap between circles
    const totalWidth = this.upgrades.dodge * radius * 2 + (this.upgrades.dodge - 1) * gap;
    const startX = uiX - totalWidth / 2 + radius; // Calculate starting X for the first circle

    for (let i = 0; i < this.upgrades.dodge; i++) {
      const circleX = startX + i * (radius * 2 + gap);

      // Draw outline for all slots
      this.minimap.lineStyle(2, 0xffffff, 1);
      this.minimap.strokeCircle(circleX, uiY, radius);

      // Check if this dodge slot is available or on cooldown
      if (i < this.dodgeCount) {
        // Available dodge: Fill with solid color
        this.minimap.fillStyle(0x00ffff, 1); // Cyan for available
        this.minimap.fillCircle(circleX, uiY, radius);
      } else {
        // On cooldown: Draw background and progress pie
        const cooldownIndex = i - this.dodgeCount; // Index within the active cooldowns
        const cooldownEndTime = this.dodgeCooldowns[cooldownIndex];

        if (cooldownEndTime && cooldownEndTime > time) {
            // Draw background grey circle
            this.minimap.fillStyle(0x555555, 0.8); // Dark grey background
            this.minimap.fillCircle(circleX, uiY, radius);

            // Calculate cooldown progress (0 to 1, where 1 is fully cooled down)
            const remainingTime = cooldownEndTime - time;
            const progress = 1 - Math.max(0, remainingTime / this.dodgeCooldownTime);

            // Draw cooldown progress pie (starts from top, goes clockwise)
            this.minimap.fillStyle(0x00ffff, 0.7); // Semi-transparent cyan for progress
            this.minimap.slice(
                circleX, uiY, radius,           // Position and radius
                Phaser.Math.DegToRad(-90),      // Start angle (top)
                Phaser.Math.DegToRad(-90 + progress * 360), // End angle based on progress
                false                          // Draw clockwise
            );
            this.minimap.fillPath(); // Fill the slice path

        } else {
             // Should be available if cooldown ended, but draw empty grey just in case state is weird
             this.minimap.fillStyle(0x555555, 0.8);
             this.minimap.fillCircle(circleX, uiY, radius);
        }
      }
    }
  }

} // End Scene Class

// Game Configuration
var config = {
  type: Phaser.AUTO, // Use WebGL if available, otherwise Canvas
  width: 800,
  height: 600,
  scene: [TitleScene, MainGameScene, GameOverScene], // Scenes in order
  physics: {
    default: "arcade",
    arcade: {
      gravity: { y: 0 }, // Top-down game, no gravity
      debug: false // Set to true for physics debugging visuals
    }
  },
  parent: "game-container", // ID of the HTML element to contain the game
  scale: {
    mode: Phaser.Scale.FIT, // Fit the game within the container, maintaining aspect ratio
    autoCenter: Phaser.Scale.CENTER_BOTH // Center the game canvas horizontally and vertically
  },
   render: {
      pixelArt: true, // Optional: Set true if using pixel art assets for sharper scaling
      antialias: false // Optional: Set false if pixelArt is true
   }
};

// Start the game when window loads
window.onload = () => {
    const game = new Phaser.Game(config);
};