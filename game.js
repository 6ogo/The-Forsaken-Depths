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
      6: ["witch", "bee", "orc", "wizard"] // Example world 6 enemies
    };
    this.roomActive = false; // Is the current room uncleared?
    this.clearedRooms = new Set(); // Stores keys of cleared rooms ("x,y")
    this.visitedRooms = {}; // Stores keys of visited rooms for minimap
    this.entryDoorDirection = null; // Direction player entered from
    this.colliders = []; // Initialize collider array

    this.finder = null; // Pathfinding instance
    this.pathfindingGrid = null; // Grid representation for pathfinding
    this.gridCellSize = 32; // Size of pathfinding grid cells (adjust as needed)
    this.enemyPathData = new Map(); // Store path data per enemy { enemy.id -> { path: [], targetNodeIndex: number } }
    this.repathTimer = 0; // Timer to recalculate paths periodically
  }

  preload() {
    // Load all game assets
    const assets = [
      "player", "projectile", "blob", "boss", "wall",
      "door", "door_closed", "boss_projectile", // Keep boss_projectile for bosses
      "gold_sparkles", "heart_full", "heart_half", "heart_empty",
      "background", "shapeshifter", "wizard", "quasit", "orc",
      "bee", "witch", "boss1", "boss2", "boss3", "boss4", "boss5",
      "shadow" // Load shadow asset
    ];

    assets.forEach((key) => this.load.image(key, `assets/${key}.png`));

    // Load specific projectile assets
    this.load.image("wizard_projectile", "assets/wizard_projectile.png");
    this.load.image("witch_projectile", "assets/witch_projectile.png");
    this.load.image("quasit_projectile", "assets/quail_projectile.png"); // Assuming quail_ is for quasit
    this.load.image("blob_projectile", "assets/blob_projectile.png");

    // Load wall variations
    for (let i = 1; i <= 5; i++) {
      this.load.image(`wall${i}`, `assets/wall${i}.png`);
    }

    this.load.image("bg", "assets/bg.png");

    // Load powerup icons
    const powerupAssets = {
      dodge_icon: "boss_projectile", // Placeholder, replace with actual icons
      damage_icon: "damage_up", // Assuming you have these assets
      hp_icon: "health_up",     // Assuming you have these assets
      speed_icon: "blob_projectile", // Placeholder
      doubleshot_icon: "blob", // Placeholder
      splitshot_icon: "blob_projectile" // Placeholder
    };

    Object.entries(powerupAssets).forEach(([key, value]) => {
        // Check if asset already loaded to avoid warnings (optional)
        if (!this.textures.exists(key)) {
            this.load.image(key, `assets/${value}.png`);
        }
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

    // Initialize Pathfinding
    this.finder = new EasyStar.js();
    // Grid setup happens in loadRoom after walls are placed

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

  // --- Pathfinding Helper Functions ---

  setupPathfindingGrid() {
    const gridWidth = Math.ceil(this.sys.game.config.width / this.gridCellSize);
    const gridHeight = Math.ceil(this.sys.game.config.height / this.gridCellSize);

    this.pathfindingGrid = [];
    for (let y = 0; y < gridHeight; y++) {
        this.pathfindingGrid[y] = [];
        for (let x = 0; x < gridWidth; x++) {
            this.pathfindingGrid[y][x] = 0; // 0 = Walkable
        }
    }

    // Mark wall tiles as non-walkable (1)
    const markWallTile = (wall) => {
        // Calculate the grid cells this wall overlaps
        const left = Math.max(0, Math.floor((wall.x - wall.displayWidth / 2) / this.gridCellSize));
        const right = Math.min(gridWidth, Math.ceil((wall.x + wall.displayWidth / 2) / this.gridCellSize));
        const top = Math.max(0, Math.floor((wall.y - wall.displayHeight / 2) / this.gridCellSize));
        const bottom = Math.min(gridHeight, Math.ceil((wall.y + wall.displayHeight / 2) / this.gridCellSize));

        for (let y = top; y < bottom; y++) {
            for (let x = left; x < right; x++) {
                // No need for bounds check here due to Math.max/min above
                this.pathfindingGrid[y][x] = 1; // 1 = Non-walkable
            }
        }
    };

    this.walls.getChildren().forEach(markWallTile);
    this.innerWalls.getChildren().forEach(markWallTile);
    // Optionally mark closed doors as non-walkable too
    this.doors.getChildren().forEach(door => {
        if (!door.isOpen) {
            markWallTile(door); // Treat closed doors as walls for pathfinding
        }
    });


    this.finder.setGrid(this.pathfindingGrid);
    this.finder.setAcceptableTiles([0]); // Only tile ID 0 is walkable
    // this.finder.enableDiagonals(); // Optional: Allow diagonal movement
    this.finder.setIterationsPerCalculation(1000); // Adjust performance if needed
    console.log("Pathfinding grid setup complete.");
  }

  getGridCoordinates(worldX, worldY) {
    const gridX = Math.floor(worldX / this.gridCellSize);
    const gridY = Math.floor(worldY / this.gridCellSize);
    return { x: gridX, y: gridY };
  }

  getWorldCoordinates(gridX, gridY) {
    const worldX = gridX * this.gridCellSize + this.gridCellSize / 2;
    const worldY = gridY * this.gridCellSize + this.gridCellSize / 2;
    return { x: worldX, y: worldY };
  }

  findPathForEnemy(enemy) {
    if (!this.finder || !enemy.active || !this.player.active || !this.pathfindingGrid) return;

    const enemyGridPos = this.getGridCoordinates(enemy.x, enemy.y);
    const playerGridPos = this.getGridCoordinates(this.player.x, this.player.y);

    // Basic bounds check for grid coordinates
    const gridHeight = this.pathfindingGrid.length;
    const gridWidth = gridHeight > 0 ? this.pathfindingGrid[0].length : 0;

    if (enemyGridPos.x < 0 || enemyGridPos.y < 0 || enemyGridPos.y >= gridHeight || enemyGridPos.x >= gridWidth ||
        playerGridPos.x < 0 || playerGridPos.y < 0 || playerGridPos.y >= gridHeight || playerGridPos.x >= gridWidth) {
        // console.warn("Pathfinding coordinates out of bounds.", enemyGridPos, playerGridPos);
        this.enemyPathData.set(enemy.id, { path: null, targetNodeIndex: -1 });
        return; // Invalid positions
    }

    // Avoid pathfinding if already at target
    if (enemyGridPos.x === playerGridPos.x && enemyGridPos.y === playerGridPos.y) {
         this.enemyPathData.set(enemy.id, { path: null, targetNodeIndex: -1 }); // Clear path
         // Don't stop velocity here, let movement logic handle stopping
         return;
    }

    // Check if the target tile is walkable
    if (this.pathfindingGrid[playerGridPos.y][playerGridPos.x] === 1) {
         // console.log("Target tile is unwalkable.");
         // Maybe stop the enemy or have it wait? Or target last known player pos?
         this.enemyPathData.set(enemy.id, { path: null, targetNodeIndex: -1 });
         // enemy.setVelocity(0,0); // Let movement logic handle this
         return;
    }

    // Request path calculation (asynchronous)
    this.finder.findPath(enemyGridPos.x, enemyGridPos.y, playerGridPos.x, playerGridPos.y, (path) => {
        if (!enemy.active) return; // Check if enemy is still active when callback fires

        if (path === null || path.length <= 1) {
            // console.warn("Path not found for enemy:", enemy.type);
            this.enemyPathData.set(enemy.id, { path: null, targetNodeIndex: -1 });
        } else {
            // console.log("Path found for enemy:", enemy.type, path.length);
            // Start moving towards the second node (index 1) as index 0 is the start node
            this.enemyPathData.set(enemy.id, { path: path, targetNodeIndex: 1 });
        }
    });
    // Calculation is processed via this.finder.calculate() in the main update loop
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
    // Set player body size slightly smaller than sprite for smoother wall collision
    this.player.body.setSize(this.player.width * 0.8, this.player.height * 0.8);
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
        this.colliders.forEach(c => {
             if (c && c.active) c.destroy()
        });
    }
    this.colliders = []; // Reset the array

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
    this.doors.getChildren().forEach(door => {
        if (!door.isOpen) {
             // Create collider and store reference on the door AND in the main array
             door.collider = this.physics.add.collider(this.player, door);
             this.colliders.push(door.collider);
        }
    });

    // Physics world bounds collision for projectiles
    this.physics.world.off('worldbounds'); // Remove previous listener if any
    this.physics.world.on('worldbounds', (body) => {
        // Check if the body hitting the bounds is a projectile and destroy it
        if (body.gameObject && (this.projectiles.contains(body.gameObject) || this.enemyProj.contains(body.gameObject))) {
            body.gameObject.destroy();
        }
        // Also stop enemies if they hit bounds (player has setCollideWorldBounds)
        else if (body.gameObject && this.enemies.contains(body.gameObject)) {
             body.gameObject.setVelocity(0,0); // Stop enemy at bounds
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

    const availableSlotIndex = this.upgrades.dodge - this.dodgeCount;

    this.isDodging = true;
    this.invincible = true;
    this.player.setTint(0x00ffff);
    this.dodgeCount--;

    this.sounds.dash.play();

    // Start cooldown for the used dodge slot
    // Find the first null slot (or the next available index)
    let cooldownIndexToSet = -1;
    for(let i = 0; i < this.upgrades.dodge; ++i) {
        if (this.dodgeCooldowns[i] === null) {
            cooldownIndexToSet = i;
            break;
        }
    }
    if (cooldownIndexToSet !== -1) {
        this.dodgeCooldowns[cooldownIndexToSet] = this.time.now + this.dodgeCooldownTime;
    } else {
        console.warn("Could not find empty slot for dodge cooldown, logic error?");
        // Fallback: just push it, might lead to incorrect UI later
        this.dodgeCooldowns.push(this.time.now + this.dodgeCooldownTime);
    }


    // --- Determine Dodge Direction ---
    let dx = 0, dy = 0;
    let moveRequested = false;

    if (this.isMobile) {
      if (this.isTouching && this.touchIndicator && this.touchIndicator.visible) { // Check if indicator is visible
        const centerX = this.touchIndicator.x;
        const centerY = this.touchIndicator.y;
        dx = this.touchPosition.x - centerX;
        dy = this.touchPosition.y - centerY;
        const length = Math.sqrt(dx * dx + dy * dy);
        const deadZone = 10;

        if (length > deadZone) {
            dx /= length;
            dy /= length;
            moveRequested = true;
        }
      }
      if (!moveRequested) {
        dy = -1; // Default dodge up
      }

    } else { // Keyboard
      if (this.keys.W.isDown) { dy = -1; moveRequested = true; }
      else if (this.keys.S.isDown) { dy = 1; moveRequested = true; }
      if (this.keys.A.isDown) { dx = -1; moveRequested = true; }
      else if (this.keys.D.isDown) { dx = 1; moveRequested = true; }

      if (!moveRequested) {
        dy = -1; // Default dodge up
      }

      if (dx !== 0 && dy !== 0) {
        const length = Math.sqrt(2);
        dx /= length;
        dy /= length;
      }
    }
    // --- End Dodge Direction ---


    this.player.setVelocity(dx * this.dodgeSpeed, dy * this.dodgeSpeed);

    // End dodge after duration
    this.time.delayedCall(this.dodgeDuration, () => {
      if (this.player.active) {
        this.isDodging = false;
        this.player.clearTint();
        this.player.setVelocity(0, 0); // Stop velocity after dodge

        // Check if player was hit during dodge; if so, invincibility remains
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
    const distance = Phaser.Math.Distance.Between(
        this.player.x, this.player.y, door.x, door.y
    );

    if (distance < 60) {
        if (door.isOpen) {
            if (!this.isMobile) {
                this.doorPrompt.setText("[E] Enter")
                    .setPosition(door.x, door.y - 40)
                    .setVisible(true);
            }
            if ((!this.isMobile && Phaser.Input.Keyboard.JustDown(this.keys.E)) || this.isCrossingDoorThreshold(door)) {
                 const [nx, ny] = door.targetRoom.split(",").map(Number);
                 this.transitionToRoom(nx, ny, door.direction);
                 return true; // Transition started
            }
        } else if (!this.roomActive) {
             this.openDoor(door); // Open if room cleared but door still closed
        }
        return false; // Near door, but no transition
    }
    // Return undefined if not near this door
  }

  isCrossingDoorThreshold(door) {
      const threshold = 10;
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

    // Touch indicators (visual feedback for joystick) - Create them first
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
            if (!pCenter) return; // Pool check
            pCenter.setVelocity(Math.cos(angle) * projectileSpeed, Math.sin(angle) * projectileSpeed);
            pCenter.damage = finalDamage;
            pCenter.body.onWorldBounds = true;

            // Split projectiles
            for (let i = 1; i <= countSplit; i++) {
                // Left side
                const angleL = angle - i * spreadAngle;
                const pL = this.projectiles.create(this.player.x, this.player.y, "projectile");
                 if (!pL) continue; // Pool check
                pL.setVelocity(Math.cos(angleL) * projectileSpeed, Math.sin(angleL) * projectileSpeed);
                pL.damage = finalDamage;
                pL.body.onWorldBounds = true;


                // Right side
                const angleR = angle + i * spreadAngle;
                const pR = this.projectiles.create(this.player.x, this.player.y, "projectile");
                 if (!pR) continue; // Pool check
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
    this.clearedRooms.add(`${this.currentRoom.x},${this.currentRoom.y}`);
    this.roomActive = false;

    this.sounds.upgrade.play();

    if (this.currentWorld < this.maxWorlds) {
      this.currentWorld++;
      this.worldText.setText(`World: ${this.currentWorld}`);

      this.nextLevelText.setText(`Going to next level in 5...`).setVisible(true);
      let countdown = 5;
      if (this.countdownEvent) this.countdownEvent.remove();

      this.countdownEvent = this.time.addEvent({
          delay: 1000,
          repeat: 4,
          callback: () => {
              countdown--;
              this.nextLevelText.setText(`Going to next level in ${countdown}...`);
              if (countdown === 0) {
                  this.nextLevelText.setVisible(false);
                  this.generateWorldMap();
                  this.entryDoorDirection = null;
                  this.loadRoom(0, 0);
              }
          }
      });

    } else {
      this.cameras.main.fadeOut(1000, 0, 0, 0);
      this.time.delayedCall(1000, () => {
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
            .setScrollFactor(0);

          this.time.delayedCall(5000, () => {
            this.scene.start("TitleScene");
          });
      });
    }
  }

  autoShoot() {
    if (!this.isMobile || !this.player.active || this.time.now < this.lastShootTime + this.shootCooldown) return;

    let closestEnemy = null;
    let minDistanceSq = 300 * 300;

    this.enemies.getChildren().forEach(enemy => {
        if (!enemy.active) return;
        const distSq = Phaser.Math.Distance.Squared(this.player.x, this.player.y, enemy.x, enemy.y);

        if (distSq < minDistanceSq) {
            minDistanceSq = distSq;
            closestEnemy = enemy;
        }
    });

    if (closestEnemy) {
        const angle = Phaser.Math.Angle.Between(
            this.player.x, this.player.y, closestEnemy.x, closestEnemy.y
        );
        this.fireProjectiles(angle);
        this.lastShootTime = this.time.now;
    }
  }

  createPowerupIcons() {
    this.powerupsText = this.add.text(100, 500, "Powerups:", {
      font: "20px Arial",
      fill: "#fff"
    }).setDepth(101).setScrollFactor(0);

    this.ui.add(this.powerupsText);

    this.powerupContainer = this.add.container(100, 535).setDepth(101).setScrollFactor(0);
    this.ui.add(this.powerupContainer);
  }

  updatePowerupIcons() {
    if (!this.powerupContainer) return;
    this.powerupContainer.removeAll(true);

    const iconConfigs = [
      { count: this.upgrades.damage, icon: "damage_icon" },
      { count: this.upgrades.speed, icon: "speed_icon" },
      { count: this.upgrades.hp, icon: "hp_icon" },
      { count: this.upgrades.doubleShot, icon: "doubleshot_icon" },
      { count: this.upgrades.splitShot, icon: "splitshot_icon" }
    ];

    let xOffset = 0;
    const iconSize = 32;
    const gap = 8;
    const maxIconsPerRow = 8;
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
          const icon = this.add.image(xOffset, currentY, config.icon).setOrigin(0, 0).setScale(0.8);
          this.powerupContainer.add(icon);
          xOffset += (iconSize * 0.8) + gap;
          iconsInRow++;
        }
      }
    });
  }

  generateWorldMap() {
    this.roomMap = {};
    this.visitedRooms = {};
    this.clearedRooms = new Set();

    this.roomMap["0,0"] = { type: "start", doors: {}, depth: 0, variation: 0 };
    this.visitedRooms["0,0"] = true;

    let currentPos = { x: 0, y: 0 };
    let pathLength = 0;
    const minPath = 3;
    const maxPath = 6;
    let bossRoomKey = null;

    while (pathLength < maxPath) {
      const possibleDirections = Phaser.Utils.Array.Shuffle([
        { dx: 0, dy: -1, dir: "up", opp: "down" }, { dx: 1, dy: 0, dir: "right", opp: "left" },
        { dx: 0, dy: 1, dir: "down", opp: "up" }, { dx: -1, dy: 0, dir: "left", opp: "right" },
      ]);

      let moved = false;
      for (const move of possibleDirections) {
        const nextX = currentPos.x + move.dx;
        const nextY = currentPos.y + move.dy;
        const nextKey = `${nextX},${nextY}`;
        const currentKey = `${currentPos.x},${currentPos.y}`;

        if (!this.roomMap[nextKey]) {
          this.roomMap[nextKey] = { type: "normal", doors: {}, depth: pathLength + 1, variation: Phaser.Math.Between(1, 2) };
          this.roomMap[currentKey].doors[move.dir] = nextKey;
          this.roomMap[nextKey].doors[move.opp] = currentKey;
          currentPos = { x: nextX, y: nextY };
          pathLength++;
          bossRoomKey = nextKey;
          moved = true;
          break;
        }
      }
      if (!moved || pathLength >= maxPath) break;
    }

    if (bossRoomKey) {
      this.roomMap[bossRoomKey].type = "boss";
    } else if (pathLength === 0) {
        bossRoomKey = "1,0";
        this.roomMap[bossRoomKey] = { type: "boss", doors: {"left": "0,0"}, depth: 1, variation: 0 };
        this.roomMap["0,0"].doors["right"] = bossRoomKey;
    }

    const normalRoomKeys = Object.keys(this.roomMap).filter(
      (k) => k !== "0,0" && k !== bossRoomKey && this.roomMap[k].type === "normal"
    );
    if (normalRoomKeys.length > 0) {
      const shopKey = Phaser.Utils.Array.GetRandom(normalRoomKeys);
      this.roomMap[shopKey].type = "shop";
    }

    const maxBranches = 2;
    let branchesAdded = 0;
    const potentialBranchStarts = Object.keys(this.roomMap).filter(k => k !== bossRoomKey);

    for (let i = 0; i < potentialBranchStarts.length && branchesAdded < maxBranches; i++) {
        const baseKey = Phaser.Utils.Array.GetRandom(potentialBranchStarts);
        potentialBranchStarts.splice(potentialBranchStarts.indexOf(baseKey), 1);
        const baseRoom = this.roomMap[baseKey];

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

                if (!this.roomMap[nextKey] && !baseRoom.doors[move.dir]) {
                    this.roomMap[nextKey] = { type: "normal", doors: {}, depth: baseRoom.depth + 1, variation: Phaser.Math.Between(1, 2) };
                    baseRoom.doors[move.dir] = nextKey;
                    this.roomMap[nextKey].doors[move.opp] = baseKey;
                    branchesAdded++;
                    break;
                }
            }
        }
    }
  }

  loadRoom(x, y, entryDirection = null) {
    // --- Cleanup previous room ---
    if (this.shopIcons) {
      this.shopIcons.forEach((iconGroup) => {
          if (iconGroup.sprite) iconGroup.sprite.destroy();
          if (iconGroup.text) iconGroup.text.destroy();
          if (iconGroup.desc) iconGroup.desc.destroy();
      });
      this.shopIcons = null;
    }
    // Cleanup enemies AND their shadows before clearing group
    this.enemies.getChildren().forEach(enemy => {
        if (enemy.type === 'bee') {
            const shadow = enemy.getData('shadow');
            if (shadow) shadow.destroy();
        }
    });
    this.enemies.clear(true, true);
    this.enemyProj.clear(true, true);
    this.innerWalls.clear(true, true);
    this.walls.clear(true, true);
    this.doors.clear(true, true);
    this.projectiles.clear(true, true);
    this.pickups.clear(true, true);

    // Clear dynamic colliders from previous room
    if (this.colliders) {
        this.colliders.forEach(c => {
            if (c && c.active) {
                c.destroy();
            }
        });
        this.colliders = []; // Reset the array AFTER the loop
    } else {
        this.colliders = []; // Initialize if it doesn't exist
    }
    // Reset pathfinding data
    this.enemyPathData.clear();
    // Hide prompts
    this.doorPrompt.setVisible(false);
    this.shopPrompt.setVisible(false);


    // --- Setup new room ---
    this.inTransition = false;
    this.currentRoom = { x, y };
    this.entryDoorDirection = entryDirection;

    const roomKey = `${x},${y}`;
    if (!this.roomMap[roomKey]) {
        console.error(`Room ${roomKey} not found in map! Attempting recovery.`);
        this.loadRoom(0, 0);
        return;
    }

    const currentRoomData = this.roomMap[roomKey];
    currentRoomData.visited = true;
    this.visitedRooms[roomKey] = true;

    const isCleared = this.clearedRooms.has(roomKey);
    this.roomActive = (currentRoomData.type === 'normal' || currentRoomData.type === 'boss') && !isCleared;

    // Create room layout (walls, background)
    this.createRoomLayout(roomKey, currentRoomData); // Creates walls

    // Spawn content based on room type and cleared status
    switch (currentRoomData.type) {
      case "shop": this.createShopRoom(); this.roomActive = false; break;
      case "boss": if (!isCleared) this.createBossRoom(); break;
      case "normal": if (!isCleared) this.createNormalRoom(); break;
      case "start": this.roomActive = false; break;
    }

    // Create doors AFTER determining room state
    this.createDoors(currentRoomData);

    // Setup Pathfinding Grid for the new layout
    this.setupPathfindingGrid();

    // Setup physics colliders
    this.setupColliders();

    // Update UI elements
    this.updateMinimap();
    this.updateHearts();
  }


  createRoomLayout(key, roomData) {
    if (this.background) this.background.destroy();
    this.background = this.add.image(400, 300, "bg").setDepth(-10);
    this.background.setScale(Math.max(this.sys.game.config.width / this.background.width, this.sys.game.config.height / this.background.height));

    const { x1, y1, x2, y2 } = this.playArea;
    const wallTexture = `wall${this.currentWorld}`;
    const wallThickness = 32;

    // --- Create FULL outer walls ---
    this.walls.create(400, y1 - wallThickness / 2, wallTexture).setOrigin(0.5).setDisplaySize(x2 - x1 + wallThickness * 2, wallThickness).refreshBody();
    this.walls.create(400, y2 + wallThickness / 2, wallTexture).setOrigin(0.5).setDisplaySize(x2 - x1 + wallThickness * 2, wallThickness).refreshBody();
    this.walls.create(x1 - wallThickness / 2, 300, wallTexture).setOrigin(0.5).setDisplaySize(wallThickness, y2 - y1 + wallThickness * 2).refreshBody();
    this.walls.create(x2 + wallThickness / 2, 300, wallTexture).setOrigin(0.5).setDisplaySize(wallThickness, y2 - y1 + wallThickness * 2).refreshBody();

    // --- Add inner wall variations ---
    const variation = roomData.variation;
    const innerWallSize = 64;
    switch (variation) {
      case 1: // Cross pattern
        this.innerWalls.create(400, 300, wallTexture).setOrigin(0.5).setDisplaySize(innerWallSize * 4, innerWallSize * 0.5).refreshBody();
        this.innerWalls.create(400, 300, wallTexture).setOrigin(0.5).setDisplaySize(innerWallSize * 0.5, innerWallSize * 4).refreshBody();
        break;
      case 2: // Corner blocks
        this.innerWalls.create(x1 + innerWallSize * 1.5, y1 + innerWallSize * 1.5, wallTexture).setOrigin(0.5).setDisplaySize(innerWallSize, innerWallSize).refreshBody();
        this.innerWalls.create(x2 - innerWallSize * 1.5, y1 + innerWallSize * 1.5, wallTexture).setOrigin(0.5).setDisplaySize(innerWallSize, innerWallSize).refreshBody();
        this.innerWalls.create(x1 + innerWallSize * 1.5, y2 - innerWallSize * 1.5, wallTexture).setOrigin(0.5).setDisplaySize(innerWallSize, innerWallSize).refreshBody();
        this.innerWalls.create(x2 - innerWallSize * 1.5, y2 - innerWallSize * 1.5, wallTexture).setOrigin(0.5).setDisplaySize(innerWallSize, innerWallSize).refreshBody();
        break;
    }
  }

  createDoors(roomData) {
    const { x1, y1, x2, y2 } = this.playArea;
    const doorsData = roomData.doors;
    const doorSize = 64;
    const visualOffset = 5; // How much the door overlaps the wall visually

    Object.entries(doorsData).forEach(([direction, targetRoomKey]) => {
      let doorX = 400, doorY = 300;
      let doorTexture = "door";

      switch (direction) {
        case 'up':    doorY = y1 + visualOffset; break;
        case 'down':  doorY = y2 - visualOffset; break;
        case 'left':  doorX = x1 + visualOffset; break;
        case 'right': doorX = x2 - visualOffset; break;
      }

      const shouldBeClosed = this.roomActive;
      if (shouldBeClosed) {
          doorTexture = "door_closed";
      }

      const door = this.doors.create(doorX, doorY, doorTexture).setDepth(1).setImmovable(true);
      door.body.setSize(doorSize * 0.8, doorSize * 0.8); // Smaller physics body for easier entry
      door.setDisplaySize(doorSize, doorSize);
      door.direction = direction;
      door.targetRoom = targetRoomKey;
      door.isOpen = !shouldBeClosed;
      door.collider = null;

      // Collider added/removed in setupColliders/openDoor
    });
  }

  openDoor(door) {
      if (door && !door.isOpen) {
          door.setTexture("door");
          door.isOpen = true;
          if (door.collider) {
              if (door.collider.active && this.physics.world.colliders.getActive().includes(door.collider)) {
                   door.collider.destroy();
              }
              const index = this.colliders.indexOf(door.collider);
              if (index > -1) {
                  this.colliders.splice(index, 1);
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
    const possibleEnemies = this.worldEnemies[this.currentWorld] || ["blob"];
    const enemyCount = Phaser.Math.Between(3, 5);

    let entryDoorPos = null;
    const { x1, y1, x2, y2 } = this.playArea;
    const safeSpawnDistanceSq = 150 * 150;

    if (this.entryDoorDirection) {
        switch (this.entryDoorDirection) {
            case 'up':    entryDoorPos = { x: 400, y: y1 + 30 }; break;
            case 'down':  entryDoorPos = { x: 400, y: y2 - 30 }; break;
            case 'left':  entryDoorPos = { x: x1 + 30, y: 300 }; break;
            case 'right': entryDoorPos = { x: x2 - 30, y: 300 }; break;
        }
    }

    for (let i = 0; i < enemyCount; i++) {
      const enemyType = Phaser.Utils.Array.GetRandom(possibleEnemies);
      let spawnX, spawnY, distSqFromDoor, distSqFromCenter;
      let attempts = 0;
      const maxAttempts = 20;

      do {
          spawnX = Phaser.Math.Between(this.playArea.x1 + 50, this.playArea.x2 - 50);
          spawnY = Phaser.Math.Between(this.playArea.y1 + 50, this.playArea.y2 - 50);
          distSqFromDoor = entryDoorPos ? Phaser.Math.Distance.Squared(spawnX, spawnY, entryDoorPos.x, entryDoorPos.y) : safeSpawnDistanceSq + 1;
          distSqFromCenter = Phaser.Math.Distance.Squared(spawnX, spawnY, 400, 300);
          attempts++;
      } while ((distSqFromDoor < safeSpawnDistanceSq || distSqFromCenter < 100*100) && attempts < maxAttempts);

      if (attempts >= maxAttempts) {
          console.warn("Could not find ideal spawn position for enemy, spawning anyway.");
      }

      this.createEnemy(spawnX, spawnY, enemyType);
    }
    this.roomActive = true;
  }

  createEnemy(x, y, type) {
    const enemy = this.enemies.create(x, y, type);
    if (!enemy || !enemy.body) return null;

    const baseStats = {
      blob: { health: 30, speed: 80, shootCooldown: 2000, damage: 1 },
      bee: { health: 25, speed: 150, shootCooldown: 0, damage: 1 },
      witch: { health: 45, speed: 0, shootCooldown: 3500, damage: 1, teleportDelay: 100, shakeDuration: 400, shootDelay: 500 },
      quasit: { health: 40, speed: 110, shootCooldown: 1800, damage: 1 },
      orc: { health: 60, speed: 90, shootCooldown: 0, chargePrepareTime: 1000, chargeDuration: 500, chargeSpeed: 250, damage: 2 },
      wizard: { health: 40, speed: 70, shootCooldown: 1500, damage: 1, fleeDistance: 150, engageDistance: 250 },
      shapeshifter: { health: 50, speed: 120, shootCooldown: 2500, damage: 1, behaviorChangeTime: 3000 },
    };

    const stats = baseStats[type] || baseStats.blob;

    enemy.health = this.hardMode ? Math.ceil(stats.health * 1.5) : stats.health;
    enemy.maxHealth = enemy.health;
    enemy.speed = stats.speed;
    enemy.type = type;
    enemy.shootCooldown = stats.shootCooldown;
    enemy.lastShootTime = this.time.now + Phaser.Math.Between(500, stats.shootCooldown || 2000); // Ensure shootCooldown has a fallback
    enemy.damage = stats.damage;

    enemy.isPreparingCharge = false;
    enemy.isCharging = false;
    enemy.chargePrepareTime = stats.chargePrepareTime;
    enemy.chargeDuration = stats.chargeDuration;
    enemy.chargeSpeed = stats.chargeSpeed;
    enemy.lastChargeAttempt = 0;
    enemy.chargeCooldown = 4000;

    enemy.fleeDistance = stats.fleeDistance;
    enemy.engageDistance = stats.engageDistance;

    enemy.behaviorTimer = 0;
    enemy.behaviorChangeTime = stats.behaviorChangeTime;
    enemy.currentBehavior = 'chase';

    enemy.isTeleporting = false;
    enemy.teleportDelay = stats.teleportDelay;
    enemy.shootDelay = stats.shootDelay;
    enemy.shakeDuration = stats.shakeDuration;

    enemy.setCollideWorldBounds(true);
    enemy.body.onWorldBounds = true;
    enemy.body.setSize(enemy.width * 0.8, enemy.height * 0.8);
    enemy.id = Phaser.Utils.String.UUID(); // Assign unique ID for path map

    // --- Bee Specific Enhancements ---
    if (type === 'bee') {
        const shadow = this.add.sprite(x, y + 10, 'shadow').setDepth(enemy.depth - 1).setAlpha(0.4);
        enemy.setData('shadow', shadow); // Store shadow reference

        this.tweens.add({
            targets: enemy,
            y: y - 6, // How high it floats
            duration: 1200, // Speed of float cycle
            ease: 'Sine.easeInOut',
            yoyo: true,
            repeat: -1
        });
    }
    // --- End Bee Enhancements ---

    return enemy;
  }

  updateEnemy(enemy, time, delta) {
    if (!enemy.active || !this.player.active) return;

    const dx = this.player.x - enemy.x;
    const dy = this.player.y - enemy.y;
    const distSq = dx * dx + dy * dy;
    const dist = Math.sqrt(distSq);

    const stopDistance = 50; // Distance to stop from player
    const stopDistanceSq = stopDistance * stopDistance;

    // --- Pathfinding Movement Logic ---
    const pathData = this.enemyPathData.get(enemy.id);
    let targetX = this.player.x; // Default target is player
    let targetY = this.player.y;
    let movingAlongPath = false;

    if (pathData && pathData.path && pathData.targetNodeIndex < pathData.path.length) {
        const targetNode = pathData.path[pathData.targetNodeIndex];
        const nodeWorldPos = this.getWorldCoordinates(targetNode.x, targetNode.y);
        targetX = nodeWorldPos.x;
        targetY = nodeWorldPos.y;
        movingAlongPath = true;

        const distToNodeSq = Phaser.Math.Distance.Squared(enemy.x, enemy.y, targetX, targetY);
        if (distToNodeSq < (this.gridCellSize / 1.5) * (this.gridCellSize / 1.5)) { // Increased tolerance for reaching node
            pathData.targetNodeIndex++;
            if (pathData.targetNodeIndex >= pathData.path.length) {
                this.enemyPathData.set(enemy.id, { path: null, targetNodeIndex: -1 });
                movingAlongPath = false;
                targetX = this.player.x;
                targetY = this.player.y;
            } else {
                const nextNode = pathData.path[pathData.targetNodeIndex];
                const nextNodeWorldPos = this.getWorldCoordinates(nextNode.x, nextNode.y);
                targetX = nextNodeWorldPos.x;
                targetY = nextNodeWorldPos.y;
            }
        }
    } else {
        targetX = this.player.x;
        targetY = this.player.y;
        movingAlongPath = false;
    }

    // --- Enemy Type Specific Logic ---
    switch (enemy.type) {
        case "boss":
            if (enemy.updateAttack) enemy.updateAttack(time);
            if (!enemy.isCharging && !enemy.isPreparingCharge) {
                if (dist > 150) {
                    this.physics.moveTo(enemy, targetX, targetY, enemy.speed * 0.5);
                } else {
                    enemy.setVelocity(0, 0);
                }
            }
            break;

        case "witch":
            enemy.setVelocity(0, 0);
            if (!enemy.isTeleporting && time > enemy.lastShootTime + enemy.shootCooldown) {
                enemy.isTeleporting = true;
                enemy.lastShootTime = time;

                // 1. Pre-Teleport Shake
                enemy.setTint(0xff00ff);
                this.tweens.add({
                    targets: enemy,
                    scaleX: enemy.scaleX * 1.1, scaleY: enemy.scaleY * 0.9,
                    angle: Phaser.Math.Between(-10, 10),
                    duration: 50, yoyo: true,
                    repeat: Math.floor(enemy.shakeDuration / 100) - 1,
                    onComplete: () => {
                        if (!enemy.active) return;
                        enemy.setScale(1); enemy.setAngle(0); enemy.clearTint();

                        // 2. Teleport after shake
                        this.time.delayedCall(enemy.teleportDelay, () => {
                            if (!enemy.active) return;
                            let tx, ty, attempts = 0;
                            do {
                                const angle = Math.random() * Math.PI * 2;
                                const radius = Phaser.Math.Between(100, 250);
                                tx = this.player.x + Math.cos(angle) * radius;
                                ty = this.player.y + Math.sin(angle) * radius;
                                attempts++;
                            } while (attempts < 10 && (tx < this.playArea.x1 || tx > this.playArea.x2 || ty < this.playArea.y1 || ty > this.playArea.y2));

                            enemy.x = Phaser.Math.Clamp(tx, this.playArea.x1 + enemy.width/2, this.playArea.x2 - enemy.width/2);
                            enemy.y = Phaser.Math.Clamp(ty, this.playArea.y1 + enemy.height/2, this.playArea.y2 - enemy.height/2);

                            enemy.alpha = 0.3;
                            this.tweens.add({ targets: enemy, alpha: 1, duration: 150 });

                            // *** ARRIVAL SHAKE ***
                            this.tweens.add({
                                targets: enemy,
                                scaleX: enemy.scaleX * 1.1, scaleY: enemy.scaleY * 0.9,
                                angle: Phaser.Math.Between(-5, 5),
                                duration: 40, yoyo: true, repeat: 3,
                                onComplete: () => { if(enemy.active) { enemy.setScale(1); enemy.setAngle(0); } }
                            });
                            // *********************

                            // 3. Shoot after teleport
                            this.time.delayedCall(enemy.shootDelay, () => {
                                if (enemy.active && this.player.active) {
                                    this.shootEnemyProjectile(enemy, this.player.x, this.player.y);
                                }
                                enemy.isTeleporting = false;
                            });
                        });
                    }
                });
            }
            break;

        case "wizard":
            if (distSq < enemy.fleeDistance * enemy.fleeDistance) {
                this.physics.velocityFromAngle(Phaser.Math.Angle.Between(this.player.x, this.player.y, enemy.x, enemy.y), enemy.speed, enemy.body.velocity);
            } else if (distSq > enemy.engageDistance * enemy.engageDistance) {
                 if (movingAlongPath || dist > stopDistance + 20) {
                    this.physics.moveTo(enemy, targetX, targetY, enemy.speed * 0.5);
                 } else {
                    enemy.setVelocity(0, 0);
                 }
            } else {
                enemy.setVelocity(0, 0);
                if (time > enemy.lastShootTime + enemy.shootCooldown) {
                    this.shootEnemyProjectile(enemy, this.player.x, this.player.y);
                    enemy.lastShootTime = time;
                }
            }
            break;

        case "orc":
            if (enemy.isCharging || enemy.isPreparingCharge) {
                this.processChargingState(enemy, time);
            } else if (distSq < 150 * 150 && time > enemy.lastChargeAttempt + enemy.chargeCooldown) {
                enemy.isPreparingCharge = true;
                enemy.chargeStartTime = time;
                enemy.lastChargeAttempt = time;
                enemy.setVelocity(0, 0);
                enemy.setTint(0xffff00);
            } else {
                 if (movingAlongPath || dist > stopDistance + 20) {
                    this.physics.moveTo(enemy, targetX, targetY, enemy.speed);
                 } else {
                    enemy.setVelocity(0, 0);
                 }
            }
            break;

         case "bee":
            if (movingAlongPath || dist > stopDistance - 10) { // Bees get closer
                this.physics.moveTo(enemy, targetX, targetY, enemy.speed);
            } else {
                enemy.setVelocity(0,0);
            }
            const shadow = enemy.getData('shadow');
            if (shadow && shadow.active) {
                shadow.setPosition(enemy.x, enemy.y + 10);
                shadow.setDepth(enemy.depth - 1);
            }
            break;

        case "shapeshifter":
             if (time > enemy.behaviorTimer) {
                const behaviors = ['chase', 'flee', 'shoot', 'circle'];
                enemy.currentBehavior = Phaser.Utils.Array.GetRandom(behaviors);
                enemy.behaviorTimer = time + enemy.behaviorChangeTime;
                enemy.setVelocity(0,0);
             }
             switch (enemy.currentBehavior) {
                case 'chase':
                     if (movingAlongPath || dist > stopDistance) {
                        this.physics.moveTo(enemy, targetX, targetY, enemy.speed);
                     } else {
                        enemy.setVelocity(0, 0);
                     }
                     break;
                case 'flee':
                     if (distSq < 300 * 300) {
                        this.physics.velocityFromAngle(Phaser.Math.Angle.Between(this.player.x, this.player.y, enemy.x, enemy.y), enemy.speed, enemy.body.velocity);
                     } else {
                        enemy.setVelocity(0, 0);
                     }
                     break;
                case 'shoot':
                     enemy.setVelocity(0, 0);
                     if (time > enemy.lastShootTime + enemy.shootCooldown) {
                        this.shootEnemyProjectile(enemy, this.player.x, this.player.y);
                        enemy.lastShootTime = time;
                     }
                     break;
                case 'circle':
                     const circleSpeed = enemy.speed * 0.8;
                     const desiredDist = 150;
                     if (dist > desiredDist + 20) {
                         this.physics.moveTo(enemy, this.player.x, this.player.y, circleSpeed);
                     } else if (dist < desiredDist - 20) {
                         this.physics.velocityFromAngle(Phaser.Math.Angle.Between(this.player.x, this.player.y, enemy.x, enemy.y), circleSpeed, enemy.body.velocity);
                     } else {
                        const angleOffset = Math.PI / 2;
                        const targetAngle = Math.atan2(dy, dx);
                        const circleAngle = targetAngle + angleOffset;
                        enemy.setVelocity(Math.cos(circleAngle) * circleSpeed, Math.sin(circleAngle) * circleSpeed);
                     }
                    break;
             }
             break;


        case "blob":
        default:
             if (movingAlongPath || dist > stopDistance) {
                this.physics.moveTo(enemy, targetX, targetY, enemy.speed);
             } else {
                enemy.setVelocity(0, 0);
             }
             if (enemy.shootCooldown && time > enemy.lastShootTime + enemy.shootCooldown) {
                 this.shootEnemyProjectile(enemy, this.player.x, this.player.y);
                 enemy.lastShootTime = time;
             }
             break;
    }
}


  createBossRoom() {
    const bossTypes = {
      1: { sprite: 'boss1', health: 200, speed: 80, patterns: ['circle', 'targeted'], attackDelay: 2500, projectileSpeed: 150 },
      2: { sprite: 'boss2', health: 250, speed: 90, patterns: ['charge', 'spread'], attackDelay: 3000, projectileSpeed: 180, chargePrepareTime: 1000, chargeDuration: 600, chargeSpeed: 300 },
      3: { sprite: 'boss3', health: 300, speed: 100, patterns: ['split', 'wave', 'summon_blob'], attackDelay: 2800, projectileSpeed: 200, splitDelay: 800 },
      4: { sprite: 'boss4', health: 350, speed: 110, patterns: ['spiral', 'charge', 'targeted_fast'], attackDelay: 2000, projectileSpeed: 220, spiralCount: 5, chargePrepareTime: 800, chargeDuration: 500, chargeSpeed: 350 },
      5: { sprite: 'boss5', health: 400, speed: 120, patterns: ['waves', 'split', 'summon_bee'], attackDelay: 2600, projectileSpeed: 240, waveCount: 5, waveSpread: Math.PI / 3, splitDelay: 700 },
      6: { sprite: 'boss', health: 500, speed: 100, patterns: ['combo', 'charge', 'summon_wizard', 'spiral_fast'], attackDelay: 2400, projectileSpeed: 210, chargePrepareTime: 900, chargeDuration: 550, chargeSpeed: 320, spiralCount: 7 }
    };

    const bossConfig = bossTypes[this.currentWorld] || bossTypes[1];
    const boss = this.enemies.create(400, 150, bossConfig.sprite);
    if (!boss || !boss.body) return;

    boss.setScale(2);
    boss.health = this.hardMode ? Math.ceil(bossConfig.health * 1.5) : bossConfig.health;
    boss.maxHealth = boss.health;
    boss.speed = bossConfig.speed;
    boss.type = 'boss';
    boss.attackDelay = bossConfig.attackDelay;
    boss.projectileSpeed = bossConfig.projectileSpeed;
    boss.lastAttackTime = this.time.now + 1500;
    boss.attackPhase = 0; // For circle/spiral rotation

    // Pattern-specific properties from config
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
    boss.body.onWorldBounds = true;
    boss.setImmovable(true);
    boss.body.setSize(boss.width * 0.7, boss.height * 0.7);
    boss.id = Phaser.Utils.String.UUID(); // Unique ID

    // --- Setup Attack Patterns ---
    boss.attackFunctions = {
        'circle': this.bossAttack_CircleShot,
        'targeted': this.bossAttack_SingleTargeted,
        'targeted_fast': this.bossAttack_SingleTargetedFast, // New variation
        'charge': this.bossAttack_Charge,
        'spread': this.bossAttack_ShotgunSpread,
        'split': this.bossAttack_SplitShot,
        'wave': this.bossAttack_WaveShot,
        'spiral': this.bossAttack_SpiralShot,
        'spiral_fast': this.bossAttack_SpiralShotFast, // New variation
        'summon_blob': (b, t) => this.bossAttack_SummonMinions(b, t, 'blob', 2), // Use lambda for parameters
        'summon_bee': (b, t) => this.bossAttack_SummonMinions(b, t, 'bee', 3),
        'summon_wizard': (b, t) => this.bossAttack_SummonMinions(b, t, 'wizard', 1),
        'combo': this.bossAttack_Combo // Example combo attack
    };
    boss.availablePatterns = bossConfig.patterns || ['circle']; // Get patterns from config
    boss.currentAttackIndex = Phaser.Math.Between(0, boss.availablePatterns.length - 1); // Start random

    // --- Boss Main Attack Logic ---
    boss.updateAttack = (time) => {
        if (!boss.active || !this.player.active) return;
        if (boss.isCharging || boss.isPreparingCharge) {
            this.processChargingState(boss, time);
            return;
        }
        if (time < boss.lastAttackTime + boss.attackDelay) return;

        // Select the next attack pattern name
        const patternName = boss.availablePatterns[boss.currentAttackIndex];
        const attackFunction = boss.attackFunctions[patternName];

        if (attackFunction) {
            attackFunction.call(this, boss, time); // Execute the attack
        } else {
            console.warn(`Boss attack pattern ${patternName} not found!`);
            // Fallback to a default attack?
            this.bossAttack_CircleShot(boss, time);
        }

        // Move to the next pattern (can be random or sequential)
        // Let's make it random to increase unpredictability
        boss.currentAttackIndex = Phaser.Math.Between(0, boss.availablePatterns.length - 1);
        // Avoid repeating the exact same attack immediately (optional)
        // if (boss.availablePatterns.length > 1) {
        //     let nextIndex;
        //     do {
        //         nextIndex = Phaser.Math.Between(0, boss.availablePatterns.length - 1);
        //     } while (nextIndex === boss.currentAttackIndex);
        //     boss.currentAttackIndex = nextIndex;
        // }


        boss.lastAttackTime = time; // Reset cooldown timer
    };

    this.roomActive = true;
  }

  // --- Define Separate Boss Attack Functions ---
  // (Place these as methods within the MainGameScene class)

  bossAttack_CircleShot(boss, time) {
    // console.log("Boss using Circle Shot");
    const circleCount = 8;
    const intensity = 0.005;
    const duration = 200;
    for (let i = 0; i < circleCount; i++) {
        const angle = (i / circleCount) * Math.PI * 2 + boss.attackPhase;
        this.createBossProjectile(boss.x, boss.y, Math.cos(angle) * boss.projectileSpeed, Math.sin(angle) * boss.projectileSpeed);
    }
    boss.attackPhase += Math.PI / 16;
    this.shake(intensity, duration);
  }

  bossAttack_SingleTargeted(boss, time) {
    // console.log("Boss using Single Targeted");
    const intensity = 0.003;
    const duration = 150;
     if(this.player.active) {
         const targetAngle = Phaser.Math.Angle.Between(boss.x, boss.y, this.player.x, this.player.y);
         this.createBossProjectile(boss.x, boss.y, Math.cos(targetAngle) * boss.projectileSpeed * 1.2, Math.sin(targetAngle) * boss.projectileSpeed * 1.2); // Slightly faster
     }
     this.shake(intensity, duration);
  }
   bossAttack_SingleTargetedFast(boss, time) { // New variation
    // console.log("Boss using Single Targeted Fast");
    const intensity = 0.004;
    const duration = 100;
     if(this.player.active) {
         const targetAngle = Phaser.Math.Angle.Between(boss.x, boss.y, this.player.x, this.player.y);
         this.createBossProjectile(boss.x, boss.y, Math.cos(targetAngle) * boss.projectileSpeed * 1.5, Math.sin(targetAngle) * boss.projectileSpeed * 1.5); // Even faster
     }
     this.shake(intensity, duration);
  }


  bossAttack_Charge(boss, time) {
    // console.log("Boss using Charge");
    if (!boss.isCharging && !boss.isPreparingCharge) {
        boss.isPreparingCharge = true;
        boss.chargeStartTime = time;
        boss.setVelocity(0, 0);
        boss.setTint(0xffa500);
    }
  }

  bossAttack_ShotgunSpread(boss, time) {
    // console.log("Boss using Shotgun Spread");
    const intensity = 0.006;
    const duration = 250;
    const spreadCount = 5;
    const spreadAngle = Math.PI / 12; // Total angle
     if(this.player.active) {
         const baseAngle = Phaser.Math.Angle.Between(boss.x, boss.y, this.player.x, this.player.y);
         for (let i = 0; i < spreadCount; i++) {
             const angle = baseAngle + (i - (spreadCount - 1) / 2) * (spreadAngle / (spreadCount > 1 ? spreadCount - 1 : 1));
             this.createBossProjectile(boss.x, boss.y, Math.cos(angle) * boss.projectileSpeed * 0.9, Math.sin(angle) * boss.projectileSpeed * 0.9); // Slightly slower
         }
     }
     this.shake(intensity, duration);
  }

  bossAttack_SplitShot(boss, time) {
    //  console.log("Boss using Split Shot");
     const intensity = 0.007;
     const duration = 280;
     const splitAngles = [0, Math.PI / 2, Math.PI, (3 * Math.PI) / 2];
     splitAngles.forEach(angle => {
         const proj = this.createBossProjectile(boss.x, boss.y, Math.cos(angle) * boss.projectileSpeed, Math.sin(angle) * boss.projectileSpeed);
         if (proj) {
             this.time.delayedCall(boss.splitDelay || 800, () => { // Use boss property or default
                 if (proj.active) {
                     const splitCount = 3;
                     for (let i = 0; i < splitCount; i++) {
                         const splitAngle = angle + (i - 1) * (Math.PI / 6);
                         this.createBossProjectile(proj.x, proj.y, Math.cos(splitAngle) * boss.projectileSpeed * 0.7, Math.sin(splitAngle) * boss.projectileSpeed * 0.7);
                     }
                     proj.destroy();
                 }
             });
         }
     });
     this.shake(intensity, duration);
  }

  bossAttack_WaveShot(boss, time) {
    //  console.log("Boss using Wave Shot");
     const intensity = 0.007;
     const duration = 260;
     const waveCount = boss.waveCount || 5;
     const waveSpread = boss.waveSpread || Math.PI / 3;
      if(this.player.active) {
          const baseAngle = Phaser.Math.Angle.Between(boss.x, boss.y, this.player.x, this.player.y);
          for (let i = 0; i < waveCount; i++) {
              const offset = (i - (waveCount - 1) / 2) * (waveSpread / (waveCount > 1 ? waveCount - 1 : 1));
              const angle = baseAngle + offset;
              this.createBossProjectile(boss.x, boss.y, Math.cos(angle) * boss.projectileSpeed, Math.sin(angle) * boss.projectileSpeed);
          }
      }
      this.shake(intensity, duration);
  }

  bossAttack_SpiralShot(boss, time) {
    //  console.log("Boss using Spiral Shot");
     const intensity = 0.004;
     const duration = 200;
     const spiralCount = boss.spiralCount || 5;
     for (let i = 0; i < spiralCount; i++) {
         const spiralAngle = boss.attackPhase + (i * Math.PI * 2 / spiralCount);
         this.createBossProjectile(boss.x, boss.y, Math.cos(spiralAngle) * boss.projectileSpeed, Math.sin(spiralAngle) * boss.projectileSpeed);
     }
     boss.attackPhase += Math.PI / 12;
     this.shake(intensity, duration);
  }

  bossAttack_SpiralShotFast(boss, time) { // New variation
    //  console.log("Boss using Spiral Shot Fast");
     const intensity = 0.005;
     const duration = 150;
     const spiralCount = boss.spiralCount || 7; // Use boss property or default
     for (let i = 0; i < spiralCount; i++) {
         const spiralAngle = boss.attackPhase + (i * Math.PI * 2 / spiralCount);
         this.createBossProjectile(boss.x, boss.y, Math.cos(spiralAngle) * boss.projectileSpeed * 1.1, Math.sin(spiralAngle) * boss.projectileSpeed * 1.1); // Slightly faster
     }
     boss.attackPhase += Math.PI / 8; // Faster rotation
     this.shake(intensity, duration);
  }


  bossAttack_SummonMinions(boss, time, minionType, count) {
    // console.log(`Boss summoning ${count} ${minionType}(s)`);
    const intensity = 0.01; // Bigger shake for summoning
    const duration = 400;
    for (let i = 0; i < count; i++) {
        // Spawn minions near the boss, but not directly on top
        const angle = (i / count) * Math.PI * 2 + Math.random() * 0.5; // Add randomness
        const radius = 80 + Math.random() * 20;
        const spawnX = boss.x + Math.cos(angle) * radius;
        const spawnY = boss.y + Math.sin(angle) * radius;
        // Add small delay between spawns?
        this.time.delayedCall(i * 150, () => {
             // Clamp spawn position just in case
             const clampedX = Phaser.Math.Clamp(spawnX, this.playArea.x1 + 20, this.playArea.x2 - 20);
             const clampedY = Phaser.Math.Clamp(spawnY, this.playArea.y1 + 20, this.playArea.y2 - 20);
             this.createEnemy(clampedX, clampedY, minionType);
        });
    }
    this.shake(intensity, duration);
  }

  bossAttack_Combo(boss, time) { // Example Combo
    // console.log("Boss using Combo Attack");
    // Part 1: Circle shot
    this.bossAttack_CircleShot(boss, time);
    // Part 2: Delayed targeted shot
    this.time.delayedCall(500, () => {
        if (boss.active) {
            this.bossAttack_SingleTargetedFast(boss, time);
        }
    });
     // Part 3: Another delayed action? Maybe short charge prep?
     this.time.delayedCall(1000, () => {
         if (boss.active && !boss.isCharging && !boss.isPreparingCharge) {
            // Briefly flash for a potential follow-up? Or just end combo.
         }
     });
  }


  shootEnemyProjectile(enemy, targetX, targetY) {
    if (!enemy.active) return;

    const angle = Phaser.Math.Angle.Between(enemy.x, enemy.y, targetX, targetY);
    let speed = 150;
    let texture = 'blob_projectile'; // Default
    let scale = 1;

    // --- Select texture and properties based on enemy type ---
    switch (enemy.type) {
        case 'wizard':
            texture = 'wizard_projectile';
            speed = 200;
            scale = 1.1;
            break;
        case 'witch':
            texture = 'witch_projectile';
            speed = 180;
            scale = 1.2;
            break;
        case 'quasit':
            texture = 'quasit_projectile'; // Using the quail asset name
            speed = 160;
            scale = 1;
            break;
        case 'blob':
        case 'shapeshifter': // Shapeshifter uses blob projectile?
            texture = 'blob_projectile';
            speed = 150;
            scale = 1;
            break;
        // Add other enemy types if they shoot
    }
    // --- End selection ---

    const proj = this.enemyProj.create(enemy.x, enemy.y, texture);
    if (!proj) return; // Pool check

    proj.setScale(scale);
    proj.setVelocity(Math.cos(angle) * speed, Math.sin(angle) * speed);
    proj.damage = enemy.damage; // Assign damage value to projectile if needed elsewhere
    proj.body.onWorldBounds = true; // Ensure it checks world bounds
  }


  onHitEnemy(proj, enemy) {
    if (!proj.active || !enemy.active) return;

    enemy.setTint(0xff0000);
    this.time.delayedCall(100, () => {
      if (enemy.active) enemy.clearTint();
    });

    enemy.health -= proj.damage;
    proj.destroy();

    if (enemy.health <= 0) {
      // *** Add this for Bee shadow cleanup ***
      if (enemy.type === 'bee') {
          const shadow = enemy.getData('shadow');
          if (shadow) {
              shadow.destroy();
          }
      }
      // Remove path data when enemy dies
      this.enemyPathData.delete(enemy.id);

      enemy.destroy();

      if (enemy.type === "boss") {
        this.dropRandomUpgrade(enemy.x, enemy.y);
        this.onBossDefeated();
      } else {
        this.coins++;
        this.coinsText.setText(`Coins: ${this.coins}`);
        if (Phaser.Math.Between(1, 20) === 1) {
            // Maybe drop health pickup here later
        }
      }

      // Check if room is now clear
      if (this.roomActive && this.enemies.countActive(true) === 0) {
          console.log("Room Cleared!");
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
      if (time > enemy.chargeStartTime + enemy.chargePrepareTime) {
        enemy.isPreparingCharge = false;
        enemy.isCharging = true;
        enemy.chargeEndTime = time + enemy.chargeDuration;

        const targetX = this.player.x;
        const targetY = this.player.y;
        const angle = Phaser.Math.Angle.Between(enemy.x, enemy.y, targetX, targetY);

        enemy.setVelocity(
          Math.cos(angle) * enemy.chargeSpeed,
          Math.sin(angle) * enemy.chargeSpeed
        );
        enemy.setTint(0xff0000);
      }
    } else if (enemy.isCharging) {
      if (time > enemy.chargeEndTime) {
        enemy.isCharging = false;
        enemy.clearTint();
        enemy.setVelocity(0, 0);
      }
    }
  }


  dropRandomUpgrade(x, y) {
    const upgradeOptions = [
      { key: "hp", icon: "hp_icon" }, { key: "damage", icon: "damage_icon" },
      { key: "speed", icon: "speed_icon" }, { key: "doubleShot", icon: "doubleshot_icon" },
      { key: "splitShot", icon: "splitshot_icon" }, { key: "dodge", icon: "dodge_icon" },
    ];

    const chosenUpgrade = Phaser.Utils.Array.GetRandom(upgradeOptions);
    const pickup = this.pickups.create(x, y, chosenUpgrade.icon);
    if (!pickup) return;

    pickup.upgradeType = chosenUpgrade.key;
    pickup.setScale(1.2);

    this.tweens.add({ targets: pickup, scale: 1.4, yoyo: true, repeat: -1, duration: 500, ease: 'Sine.easeInOut' });
    this.tweens.add({ targets: pickup, y: y - 10, yoyo: true, repeat: -1, duration: 1000, ease: 'Sine.easeInOut' });
  }

  onPickup(player, pickup) {
    if (!pickup.active) return;

    this.sounds.powerup.play();

    switch (pickup.upgradeType) {
      case "hp":
        this.player.maxHealth += 2;
        this.player.health = Math.min(this.player.health + 2, this.player.maxHealth);
        this.upgrades.hp++;
        this.updateHearts();
        break;
      case "damage": this.damageMultiplier += 0.3; this.upgrades.damage++; break;
      case "speed": this.playerSpeed += 20; this.upgrades.speed++; break;
      case "doubleShot": this.upgrades.doubleShot++; break;
      case "splitShot": this.upgrades.splitShot++; break;
      case "dodge":
        if (this.upgrades.dodge < 5) {
            this.upgrades.dodge++;
            this.dodgeCount++;
            this.dodgeCooldowns.push(null); // Add placeholder for new slot
        } else {
            this.coins += 5;
            this.coinsText.setText(`Coins: ${this.coins}`);
            this.showTempMessage("Max Dodges Reached! +5 Coins");
        }
        break;
    }

    this.updatePowerupIcons();
    pickup.destroy();
  }

  createShopRoom() {
    const shopItems = [
      { key: 'hp', name: 'Max Health +2', icon: 'hp_icon', cost: 5, type: 'upgrade', desc: '+2 max health' },
      { key: 'damage', name: 'Damage Up', icon: 'damage_icon', cost: 10, type: 'upgrade', desc: '+0.3 damage mult' },
      { key: 'speed', name: 'Speed Up', icon: 'speed_icon', cost: 5, type: 'upgrade', desc: '+20 move speed' },
      { key: 'doubleShot', name: 'Double Shot', icon: 'doubleshot_icon', cost: 15, type: 'upgrade', desc: 'Fire second volley' },
      { key: 'splitShot', name: 'Split Shot +1', icon: 'splitshot_icon', cost: 15, type: 'upgrade', desc: '+1 proj per side' },
      { key: 'dodge', name: 'Extra Dodge', icon: 'dodge_icon', cost: 10, type: 'upgrade', desc: '+1 dodge charge' },
      { key: 'heal', name: 'Health Potion', icon: 'hp_icon', cost: 5, type: 'consumable', desc: 'Restore 2 health' }
    ];

    const selection = Phaser.Utils.Array.Shuffle(shopItems).slice(0, 3);
    this.shopIcons = [];

    selection.forEach((item, i) => {
      const x = 250 + i * 150;
      const y = 300;

      const sprite = this.add.image(x, y, item.icon).setScale(1.5).setInteractive({ useHandCursor: true });
      const text = this.add.text(x, y + 50, `${item.name}\nCost: ${item.cost}`, { font: '16px Arial', fill: '#fff', align: 'center', backgroundColor: '#000a', padding: { x: 5, y: 2 } }).setOrigin(0.5);
      const desc = this.add.text(x, y + 90, item.desc, { font: '12px Arial', fill: '#bbb', align: 'center', wordWrap: { width: 120 } }).setOrigin(0.5);

      const itemGroup = { sprite, text, desc, itemData: item };
      this.shopIcons.push(itemGroup);

      sprite.on('pointerdown', () => {
        if (this.coins >= item.cost) {
          this.coins -= item.cost;
          this.coinsText.setText(`Coins: ${this.coins}`);
          this.sounds.upgrade.play();

          if (item.type === 'upgrade') {
            this.onPickup(this.player, { upgradeType: item.key, active: true, destroy: () => {} });
            this.showTempMessage(`Purchased: ${item.name}`);
          } else if (item.type === 'consumable' && item.key === 'heal') {
            const healthBefore = this.player.health;
            this.player.health = Math.min(this.player.maxHealth, this.player.health + 2);
            const healedAmount = this.player.health - healthBefore;
            if (healedAmount > 0) {
                this.updateHearts();
                this.showTempMessage(`Healed ${healedAmount} health!`);
                this.sounds.powerup.play();
            } else {
                this.showTempMessage(`Already at full health!`);
            }
          }

          sprite.disableInteractive().setTint(0x555555);
          text.setVisible(false);
          desc.setVisible(false);

        } else {
          this.showTempMessage('Not enough coins!');
          this.sounds.death.play({volume: 0.3});
        }
      });

      if (!this.isMobile) {
          sprite.on('pointerover', () => desc.setVisible(true));
          sprite.on('pointerout', () => desc.setVisible(false));
          desc.setVisible(false);
      } else {
          desc.setVisible(true);
      }
    });

    this.shopPrompt.setText('Shop: Tap an item to buy').setPosition(400, 180).setVisible(true);
  }


  showTempMessage(text) {
    if (this.tempMessage) {
        this.tempMessage.destroy();
    }
    const msg = this.add.text(400, 100, text, { font: "24px Arial", fill: "#ffff00", backgroundColor: "#000000a0", padding: { x: 15, y: 8 }, align: 'center' })
      .setOrigin(0.5).setDepth(200).setScrollFactor(0);
    this.tempMessage = msg;
    this.time.delayedCall(3000, () => {
        if (this.tempMessage === msg) {
             msg.destroy();
             this.tempMessage = null;
        }
    });
  }

  shake(intensity = 0.005, duration = 100) {
    this.cameras.main.shake(duration, intensity, false);
  }

  updateHearts() {
    const maxHearts = Math.ceil(this.player.maxHealth / 2);
    const fullHearts = Math.floor(this.player.health / 2);
    const halfHeart = this.player.health % 2 === 1;

    this.hearts.forEach((heartSprite, i) => {
      if (i < maxHearts) {
        heartSprite.setVisible(true);
        if (i < fullHearts) heartSprite.setTexture("heart_full");
        else if (i === fullHearts && halfHeart) heartSprite.setTexture("heart_half");
        else heartSprite.setTexture("heart_empty");
      } else {
        heartSprite.setVisible(false);
      }
    });
  }

  resetGame() {
    this.coins = 0;
    this.damageMultiplier = 1;
    this.playerSpeed = 160;
    this.upgrades = { hp: 0, damage: 0, speed: 0, doubleShot: 0, splitShot: 0, dodge: 2 };
    if (this.player) {
        this.player.health = 6;
        this.player.maxHealth = 6;
    }
    this.dodgeCount = 2;
    this.dodgeCooldowns = Array(this.upgrades.dodge).fill(null);
    this.currentWorld = 1;
    this.hardMode = false;
    this.clearedRooms = new Set();
    this.visitedRooms = {};
    this.roomActive = false;
    this.entryDoorDirection = null;
    this.enemyPathData.clear(); // Clear path data

    if (this.coinsText) this.coinsText.setText(`Coins: ${this.coins}`);
    if (this.worldText) this.worldText.setText(`World: ${this.currentWorld}`);
    if (this.hearts) this.updateHearts();
    if (this.powerupContainer) this.updatePowerupIcons();
  }

  transitionToRoom(x, y, direction) {
    if (this.inTransition) return;
    this.inTransition = true;

    const entryDirection = { 'up': 'down', 'down': 'up', 'left': 'right', 'right': 'left' }[direction];
    const { x1, y1, x2, y2 } = this.playArea;
    const offset = 50;
    let newPlayerX = this.player.x;
    let newPlayerY = this.player.y;

    switch (direction) {
      case "up":    newPlayerY = y2 - offset; break;
      case "down":  newPlayerY = y1 + offset; break;
      case "left":  newPlayerX = x2 - offset; break;
      case "right": newPlayerX = x1 + offset; break;
    }

    this.cameras.main.fade(250, 0, 0, 0, false, (camera, progress) => {
        if (progress === 1) {
            this.player.setVelocity(0, 0);
            this.loadRoom(x, y, entryDirection);
            this.player.setPosition(newPlayerX, newPlayerY);
            this.cameras.main.fadeIn(250, 0, 0, 0, (cam, prog) => {
                if (prog === 1) {
                     this.inTransition = false;
                }
            });
        }
    });
  }


  updateMinimap() {
    if (!this.minimapObj) {
      this.minimapObj = this.add.graphics().setDepth(100).setScrollFactor(0);
      this.ui.add(this.minimapObj);
    } else {
      this.minimapObj.clear();
    }

    const cellWidth = 10, cellHeight = 8, cellPadding = 2;
    const mapOriginX = 650, mapOriginY = 50;
    const visitedColor = 0xaaaaaa, currentColor = 0x00ff00;
    const bossColor = 0xff0000, shopColor = 0xffff00, unknownColor = 0x555555;

    let minX = 0, minY = 0; // Don't need max bounds here
    Object.keys(this.visitedRooms).forEach(key => {
        const [rx, ry] = key.split(",").map(Number);
        minX = Math.min(minX, rx); minY = Math.min(minY, ry);
    });
    // Also consider neighbors for bounds
     Object.keys(this.visitedRooms).forEach(key => {
         const roomData = this.roomMap[key];
         if(roomData) {
             Object.values(roomData.doors).forEach(neighborKey => {
                 if (!this.visitedRooms[neighborKey]) {
                     const [nx, ny] = neighborKey.split(",").map(Number);
                     minX = Math.min(minX, nx); minY = Math.min(minY, ny);
                 }
             });
         }
     });


    const drawnKeys = new Set();

    Object.keys(this.visitedRooms).forEach(key => {
       if (drawnKeys.has(key) && key !== `${this.currentRoom.x},${this.currentRoom.y}`) return;

        const [rx, ry] = key.split(",").map(Number);
        const roomData = this.roomMap[key];
        if (!roomData) return;

        const drawX = mapOriginX + (rx - minX) * (cellWidth + cellPadding);
        const drawY = mapOriginY + (ry - minY) * (cellHeight + cellPadding);

        let fillColor = visitedColor;
        if (roomData.type === 'boss') fillColor = bossColor;
        if (roomData.type === 'shop') fillColor = shopColor;
        if (rx === this.currentRoom.x && ry === this.currentRoom.y) {
            fillColor = currentColor;
        }

        this.minimapObj.fillStyle(fillColor, 0.8);
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
                drawnKeys.add(neighborKey);
            }
        });
    });

     const currentDrawX = mapOriginX + (this.currentRoom.x - minX) * (cellWidth + cellPadding);
     const currentDrawY = mapOriginY + (this.currentRoom.y - minY) * (cellHeight + cellPadding);
     this.minimapObj.lineStyle(1, 0xffffff, 1);
     this.minimapObj.strokeRect(currentDrawX - 1, currentDrawY - 1, cellWidth + 2, cellHeight + 2);
  }

  update(time, delta) {
    if (!this.player || !this.player.active || this.inTransition) return;

    // --- Pathfinding Calculation ---
    this.repathTimer -= delta;
    if (this.repathTimer <= 0) {
        this.repathTimer = 500; // Recalculate every 500ms
        this.enemies.getChildren().forEach(enemy => {
            if (enemy.active && enemy.type !== 'witch' && enemy.type !== 'boss') { // Exclude non-pathfinding types
                 const distSq = Phaser.Math.Distance.Squared(this.player.x, this.player.y, enemy.x, enemy.y);
                 // Only pathfind if enemy isn't doing a special action
                 if (!enemy.isCharging && !enemy.isPreparingCharge && !(enemy.type === 'shapeshifter' && enemy.currentBehavior === 'flee') && !(enemy.type === 'wizard' && distSq < enemy.fleeDistance * enemy.fleeDistance) ) {
                    this.findPathForEnemy(enemy);
                 } else {
                     this.enemyPathData.set(enemy.id, { path: null, targetNodeIndex: -1 }); // Clear path during special actions
                 }
            }
        });
    }
    // Process pathfinding calculations (must be called each frame)
    if (this.finder) {
        this.finder.calculate();
    }
    // --- End Pathfinding ---


    // --- Player Movement ---
    if (!this.isDodging) {
      let targetVelocityX = 0;
      let targetVelocityY = 0;
      let isMoving = false;

      if (this.isMobile) {
        if (this.isTouching && this.touchIndicator && this.touchIndicator.visible) {
          const basePosX = this.touchIndicator.x;
          const basePosY = this.touchIndicator.y;
          let dx = this.touchPosition.x - basePosX;
          let dy = this.touchPosition.y - basePosY;
          const length = Math.sqrt(dx * dx + dy * dy);
          const deadZone = 10;

          if (length > deadZone) {
            dx /= length; dy /= length;
            targetVelocityX = dx * this.playerSpeed;
            targetVelocityY = dy * this.playerSpeed;
            isMoving = true;
          }
        }
        if (this.touchIndicator) this.touchIndicator.setVisible(this.isTouching);
        if (this.touchStick) this.touchStick.setVisible(this.isTouching);

      } else { // Keyboard Movement
        let dx = 0, dy = 0;
        if (this.keys.W.isDown) dy = -1; else if (this.keys.S.isDown) dy = 1;
        if (this.keys.A.isDown) dx = -1; else if (this.keys.D.isDown) dx = 1;

        if (dx !== 0 || dy !== 0) {
            isMoving = true;
            if (dx !== 0 && dy !== 0) { const length = Math.sqrt(2); dx /= length; dy /= length; }
            targetVelocityX = dx * this.playerSpeed;
            targetVelocityY = dy * this.playerSpeed;
        }
      }
      this.player.setVelocity(targetVelocityX, targetVelocityY);
      if (isMoving && time > this.footstepTimer + 300) { this.sounds.walk.play(); this.footstepTimer = time; }
    }

    // --- Player Shooting (Keyboard/Arrows) ---
    if (!this.isMobile && !this.isDodging) {
        let shootDx = 0, shootDy = 0;
        if (this.keys.LEFT.isDown) shootDx = -1; else if (this.keys.RIGHT.isDown) shootDx = 1;
        if (this.keys.UP.isDown) shootDy = -1; else if (this.keys.DOWN.isDown) shootDy = 1;

        if ((shootDx !== 0 || shootDy !== 0) && time > this.lastShootTime + this.shootCooldown) {
            const angle = Math.atan2(shootDy, shootDx);
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
    let nearDoor = false; // Is player near *any* door?
    let onDoor = false; // Is player near the door the prompt is currently for?
    this.doors.getChildren().forEach(door => {
        const interactionResult = this.handleDoorInteraction(door);
        if (interactionResult === true) { // Transition started
            nearDoor = true;
            onDoor = true;
        } else if (interactionResult === false && this.doorPrompt.visible && Math.abs(this.doorPrompt.x - door.x) < 5) {
            // Player is near this door (prompt is visible for it), but didn't transition
            nearDoor = true; // Still near a door
            onDoor = true;
        }
    });
    // Hide desktop prompt only if not near *any* door that would show it
    if (!this.isMobile && !nearDoor && this.doorPrompt.visible) {
        this.doorPrompt.setVisible(false);
    }


    // --- Dodge Cooldown and UI Update ---
    let dodgesRecovered = 0;
    // Iterate backwards to safely remove nulls
    for (let i = this.dodgeCooldowns.length - 1; i >= 0; i--) {
        if (this.dodgeCooldowns[i] !== null && time >= this.dodgeCooldowns[i]) {
            this.dodgeCooldowns[i] = null; // Mark as finished
            dodgesRecovered++;
        }
    }
    // Clean up nulls from the array
    this.dodgeCooldowns = this.dodgeCooldowns.filter(cd => cd !== null);

    // Add recovered dodges back to count
    if (dodgesRecovered > 0) {
        this.dodgeCount = Math.min(this.upgrades.dodge, this.dodgeCount + dodgesRecovered);
    }
    // Add null placeholders for cooldowns not yet started
    while (this.dodgeCooldowns.length < this.upgrades.dodge - this.dodgeCount) {
        this.dodgeCooldowns.push(null);
    }

    this.drawDodgeUI(time);

  } // End update()

  drawDodgeUI(time) {
    if (!this.minimap) return;
    this.minimap.clear();

    const uiX = 400;
    const uiY = 565;
    const radius = 15;
    const gap = 10;
    const totalWidth = this.upgrades.dodge * radius * 2 + Math.max(0, this.upgrades.dodge - 1) * gap;
    const startX = uiX - totalWidth / 2 + radius;

    let cooldownIndex = 0; // Index into the filtered dodgeCooldowns array

    for (let i = 0; i < this.upgrades.dodge; i++) {
      const circleX = startX + i * (radius * 2 + gap);

      this.minimap.lineStyle(2, 0xffffff, 1);
      this.minimap.strokeCircle(circleX, uiY, radius);

      if (i < this.dodgeCount) {
        // Available dodge
        this.minimap.fillStyle(0x00ffff, 1);
        this.minimap.fillCircle(circleX, uiY, radius);
      } else {
        // On cooldown
        const cooldownEndTime = this.dodgeCooldowns[cooldownIndex];

        if (cooldownEndTime && cooldownEndTime > time) {
            this.minimap.fillStyle(0x555555, 0.8);
            this.minimap.fillCircle(circleX, uiY, radius);

            const remainingTime = cooldownEndTime - time;
            const progress = 1 - Math.max(0, remainingTime / this.dodgeCooldownTime);

            if (progress > 0) {
                this.minimap.fillStyle(0x00ffff, 0.7);
                this.minimap.slice(circleX, uiY, radius, Phaser.Math.DegToRad(-90), Phaser.Math.DegToRad(-90 + progress * 360), false);
                this.minimap.fillPath();
            }
            cooldownIndex++; // Move to the next active cooldown
        } else {
             // Should not happen if logic is correct, but draw grey if it does
             this.minimap.fillStyle(0x555555, 0.8);
             this.minimap.fillCircle(circleX, uiY, radius);
             // Increment cooldownIndex even if the cooldown seems finished but dodgeCount hasn't updated?
             if (cooldownEndTime) cooldownIndex++;
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