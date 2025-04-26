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
    this.load.audio('explosion', 'assets/sounds/explosion.mp3');
    this.load.audio('shield_block', 'assets/sounds/shield_block.mp3');
    this.load.audio('shield_regen', 'assets/sounds/shield_regen.mp3');

    // Load portal sprite sheet
    this.load.spritesheet('portal', 'assets/Dimensional_Portal.png', {
      frameWidth: 64,
      frameHeight: 64,
      startFrame: 0,
      endFrame: 5
    });
    // Load sparkle effect for drops
    this.load.image("gold_sparkles", "assets/gold_sparkles.png");
  }

  create() {
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

    // Create portal animation if it doesn't exist (for potential direct game start)
    if (!this.anims.exists('portal_anim')) {
      this.anims.create({
        key: 'portal_anim',
        frames: this.anims.generateFrameNumbers('portal', { start: 0, end: 5 }),
        frameRate: 8,
        repeat: -1
      });
    }
  }
}

// Game Over Scene
class GameOverScene extends Phaser.Scene {
  constructor() {
    super({ key: "GameOverScene" });
  }

  create(data) { // Accept data passed from MainGameScene
    // Get score and time from main scene data
    const score = data.score || 0;
    const time = data.time || 0;

    const minutes = Math.floor(time / 60000);
    const seconds = Math.floor((time % 60000) / 1000);
    const timeString = `${minutes}:${seconds.toString().padStart(2, '0')}`;

    // Game Over text
    this.add
      .text(400, 140, "Game Over", { // Adjusted Y position
        font: "48px Arial",
        fill: "#ff0000",
        stroke: '#000000',
        strokeThickness: 6
      })
      .setOrigin(0.5);

    // Display final score and time
    this.add
      .text(400, 210, `Score: ${score}`, { // Adjusted Y position
        font: "28px Arial",
        fill: "#ffffff",
        stroke: '#000000',
        strokeThickness: 3
      })
      .setOrigin(0.5);

    this.add
      .text(400, 250, `Time: ${timeString}`, { // Adjusted Y position
        font: "24px Arial",
        fill: "#ffffff",
        stroke: '#000000',
        strokeThickness: 3
      })
      .setOrigin(0.5);


    // Restart button
    const restartBtn = this.add
      .text(400, 320, "Restart", { // Adjusted Y position
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
      .text(400, 390, "Exit to Menu", { // Adjusted Y position
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

// Inventory Scene
class InventoryScene extends Phaser.Scene {
  constructor() {
    super({ key: "InventoryScene" });
  }

  init(data) {
    this.mainScene = data.mainScene;
    // Make copies or ensure data is passed correctly if needed
    this.inventory = data.inventory || {}; // Currently unused, but good practice
    this.upgrades = data.upgrades || {};
    this.playerStats = data.playerStats || {}; // Pass player stats for display
  }

  create() {
    // Semi-transparent background
    this.add.rectangle(400, 300, 800, 600, 0x000000, 0.85)
      .setScrollFactor(0)
      .setDepth(90); // Ensure it's above main game but below UI elements if needed

    // Title
    this.add.text(400, 60, "INVENTORY", {
      font: "36px Arial",
      fill: "#ffffff",
      stroke: '#000000',
      strokeThickness: 4
    }).setOrigin(0.5).setDepth(91);

    // Close button
    const closeBtn = this.add.text(700, 50, "X", {
      font: "28px Arial",
      fill: "#ff0000",
      backgroundColor: "#000000",
      padding: { x: 15, y: 10 }
    })
      .setOrigin(0.5)
      .setInteractive()
      .setDepth(91);

    closeBtn.on("pointerdown", () => this.closeInventory());
    closeBtn.on("pointerover", () => closeBtn.setStyle({ fill: "#ffffff" }));
    closeBtn.on("pointerout", () => closeBtn.setStyle({ fill: "#ff0000" }));

    // Display sections
    this.displayUpgrades();
    this.displayStats();

    // Keyboard input for closing
    this.input.keyboard.on('keydown-I', this.closeInventory, this);
    this.input.keyboard.on('keydown-ESC', this.closeInventory, this);
  }

  displayUpgrades() {
    const upgradeIcons = [
      { key: 'hp', icon: 'hp_icon', name: 'Max Health', desc: 'Increases maximum health by 2', value: this.upgrades.hp || 0 },
      { key: 'damage', icon: 'damage_icon', name: 'Damage Up', desc: 'Increases damage multiplier by 0.3', value: this.upgrades.damage || 0 },
      { key: 'speed', icon: 'speed_icon', name: 'Speed Up', desc: 'Increases movement speed by 20', value: this.upgrades.speed || 0 },
      { key: 'doubleShot', icon: 'doubleshot_icon', name: 'Double Shot', desc: 'Shoots an additional volley', value: this.upgrades.doubleShot || 0 },
      { key: 'splitShot', icon: 'splitshot_icon', name: 'Split Shot', desc: 'Adds projectiles per side (+1 per level)', value: this.upgrades.splitShot || 0 },
      { key: 'dodge', icon: 'dodge_icon', name: 'Dodge Charge', desc: 'Adds an extra dodge charge (Max 5)', value: (this.upgrades.dodge || 0) } // Show total charges
    ];

    const startX = 160;
    const startY = 150;
    const itemsPerRow = 3;
    const xGap = 220;
    const yGap = 120;

    upgradeIcons.forEach((item, index) => {
      if (item.value > 0) { // Only display upgrades the player actually has
        const row = Math.floor(index / itemsPerRow);
        const col = index % itemsPerRow;
        const x = startX + col * xGap;
        const y = startY + row * yGap;

        // Icon
        const icon = this.add.image(x, y, item.icon)
          .setScale(1.5) // Adjust scale as needed
          .setDepth(91);

        // Name and Level/Count
        this.add.text(x, y + 40, `${item.name}: ${item.value}`, {
          font: '16px Arial',
          fill: '#ffffff',
          align: 'center'
        }).setOrigin(0.5).setDepth(91);

        // Description (shown on hover)
        const desc = this.add.text(x, y + 65, item.desc, {
          font: '14px Arial',
          fill: '#aaaaaa',
          align: 'center',
          wordWrap: { width: 180 } // Ensure text wraps
        }).setOrigin(0.5).setDepth(91).setVisible(false);

        // Make icon interactive for hover effect
        icon.setInteractive({ useHandCursor: true });
        icon.on('pointerover', () => desc.setVisible(true));
        icon.on('pointerout', () => desc.setVisible(false));
      }
    });
  }

  displayStats() {
    const x = 400;
    const y = 450; // Adjust Y position based on upgrade display

    // Use the passed playerStats
    const stats = [
      { name: "Health", value: `${this.playerStats.health}/${this.playerStats.maxHealth}` },
      { name: "Damage Multiplier", value: this.playerStats.damageMultiplier.toFixed(1) },
      { name: "Movement Speed", value: this.playerStats.playerSpeed },
      { name: "Crit Chance", value: `${Math.round((this.playerStats.critChance || 0) * 100)}%` },
      { name: "Bomb Shot Chance", value: `${Math.round((this.playerStats.bombShotChance || 0) * 100)}%` },
      { name: "Shield", value: this.playerStats.shieldEnabled ? (this.playerStats.shieldActive ? 'Ready' : 'Cooldown') : 'Not Acquired' },
      { name: "Current World", value: this.playerStats.currentWorld },
      { name: "Coins", value: this.playerStats.coins }
    ];

    this.add.text(x, y - 30, "STATS", {
      font: '22px Arial',
      fill: '#ffff00',
      stroke: '#000000',
      strokeThickness: 3
    }).setOrigin(0.5).setDepth(91);

    stats.forEach((stat, index) => {
      this.add.text(x, y + index * 25, `${stat.name}: ${stat.value}`, {
        font: '16px Arial',
        fill: '#ffffff'
      }).setOrigin(0.5).setDepth(91);
    });
  }

  closeInventory() {
    // Remove keyboard listeners specific to this scene
    this.input.keyboard.off('keydown-I', this.closeInventory, this);
    this.input.keyboard.off('keydown-ESC', this.closeInventory, this);

    this.scene.resume('MainGameScene');
    this.scene.stop();
  }
}


// Main Game Scene
class MainGameScene extends Phaser.Scene {
  constructor() {
    super({ key: "MainGameScene" });
    // --- Game State ---
    this.currentWorld = 1;
    this.maxWorlds = 6; // Assuming 6 worlds including final boss
    this.currentRoom = { x: 0, y: 0 };
    this.roomMap = {}; // Stores the generated map layout
    this.visitedRooms = {}; // Tracks visited rooms for minimap { "x,y": true }
    this.clearedRooms = new Set(); // Tracks cleared rooms { "x,y" }
    this.roomActive = false; // Is the current room in combat?
    this.entryDoorDirection = null; // Which door player entered from
    this.inTransition = false; // Prevent actions during room change fade

    // --- Player Stats & Upgrades ---
    this.coins = 0;
    this.damageMultiplier = 1.0;
    this.playerSpeed = 160;
    this.critChance = 0.0; // Critical hit chance (0.0 to 1.0)
    this.bombShotChance = 0.0; // Explosive shot chance
    this.upgrades = { // Counts of each upgrade type
      hp: 0, damage: 0, speed: 0, doubleShot: 0, splitShot: 0, dodge: 0, // Base dodge charges are handled separately
      crit: 0, bomb: 0, shield: 0 // New upgrade types
    };
    this.baseDodgeCharges = 2; // Start with 2 dodges
    this.maxDodgeCharges = 5; // Maximum possible dodge charges

    // --- Player State ---
    this.player = null; // Player sprite reference
    this.invincible = false; // Player taking damage cooldown
    this.isDodging = false; // Is player currently dodging?
    this.dodgeCount = this.baseDodgeCharges;
    this.dodgeSpeed = 400;
    this.dodgeDuration = 300; // ms
    this.dodgeCooldownTime = 4000; // ms (4 seconds)
    this.dodgeCooldowns = []; // Stores timestamps for when each charge becomes available
    this.shieldEnabled = false; // Has the player acquired the shield?
    this.shieldActive = false; // Is the shield currently ready?
    this.shieldCooldown = 15000; // ms (15 seconds)
    this.shieldTimer = null; // Phaser timer event for cooldown
    this.shieldSprite = null; // Visual representation of the shield around the player

    // --- Controls & Input ---
    this.keys = null;
    this.isMobile = false;
    this.isMouseDown = false; // For hold-to-fire desktop
    this.lastShootTime = 0;
    this.shootCooldown = 200; // ms between shots
    this.autoShootTimer = 0; // Timer for mobile auto-shoot check
    this.footstepTimer = 0; // Timer for footstep sounds

    // --- Enemies ---
    this.worldEnemies = { // Enemy types per world
      1: ["blob", "bee", "witch"],
      2: ["quasit", "orc", "witch"],
      3: ["wizard", "shapeshifter", "witch", "blob"], // Added blob
      4: ["orc", "witch", "bee", "quasit"], // Added quasit
      5: ["shapeshifter", "orc", "quasit", "wizard"], // Added wizard
      6: ["witch", "bee", "orc", "wizard", "shapeshifter"] // Added shapeshifter
    };
    this.miniBossSpawned = {}; // Track if miniboss for the world is defeated { world_X: true }

    // --- Physics & Groups ---
    this.walls = null;
    this.innerWalls = null;
    this.doors = null;
    this.enemies = null;
    this.enemyProj = null;
    this.projectiles = null;
    this.pickups = null;
    this.portals = null;
    this.colliders = []; // Keep track of colliders to destroy them on room change

    // --- Pathfinding ---
    this.finder = null; // EasyStar instance
    this.pathfindingGrid = null; // 2D array for pathfinding
    this.gridCellSize = 32;
    this.enemyPathData = new Map(); // Stores path { enemy.id: { path: [], targetNodeIndex: N } }
    this.repathTimer = 0; // Timer to recalculate paths periodically

    // --- UI ---
    this.ui = null; // Container for UI elements
    this.hearts = [];
    this.coinsText = null;
    this.worldText = null;
    this.scoreText = null; // Added for score display
    this.powerupContainer = null; // Container for upgrade icons
    this.minimapObj = null; // Graphics object for minimap
    this.doorPrompt = null;
    this.shopPrompt = null; // General shop prompt
    this.tempMessage = null; // Temporary message display
    this.bossHealthBar = null;
    this.bossHealthBarBg = null;
    this.bossNameText = null;
    this.dodgeCircles = []; // Graphics objects for dodge UI

    // --- Shop ---
    this.shopInventory = {}; // Stores items offered per world { "world_X": [item1, item2, item3] }
    this.shopPurchases = {}; // Tracks purchased item keys per world { "world_X": Set{"item_key1", "item_key2"} }
    this.shopRefreshCount = {}; // Tracks remaining refreshes per world { "world_X": N }
    this.maxShopRefreshes = 1; // Max refreshes allowed per world shop

    // --- Game Progression ---
    this.score = 0;
    this.gameStartTime = 0;
    this.gameTime = 0; // Total elapsed game time in ms
    this.portalActive = false; // Is the exit portal currently active?
  }

  preload() {
    console.log("MainGameScene Preload Start");
    // --- Standard Assets ---
    const assets = [
      "player", "projectile", "blob", "boss", "wall", "door", "door_closed", "boss_projectile",
      "heart_full", "heart_half", "heart_empty", "background", "bg", // bg is likely the room background
      "shapeshifter", "wizard", "quasit", "orc", "bee", "witch",
      "boss1", "boss2", "boss3", "boss4", "boss5", // Assuming boss6 uses 'boss' key
      "miniboss", // Added miniboss asset
      "gold_sparkles" // Added sparkle asset
    ];
    assets.forEach((key) => {
      if (!this.textures.exists(key)) {
        console.log(`Loading image: ${key}`);
        this.load.image(key, `assets/${key}.png`);
      }
    });

    // --- Projectile Assets ---
    const projectileAssets = ["wizard_projectile", "witch_projectile", "quasit_projectile", "blob_projectile"];
    projectileAssets.forEach(key => {
      if (!this.textures.exists(key)) {
        console.log(`Loading image: ${key}`);
        this.load.image(key, `assets/${key}.png`);
      }
    });

    // --- Wall Variations ---
    for (let i = 1; i <= 5; i++) {
      const key = `wall${i}`;
      if (!this.textures.exists(key)) {
        console.log(`Loading image: ${key}`);
        this.load.image(key, `assets/wall${i}.png`);
      }
    }

    // --- Powerup/Icon Assets (Map internal key to asset file if different) ---
    const powerupAssets = {
      // Using descriptive keys consistent with upgrade keys
      hp_icon: "health_up", // Assuming health_up.png exists
      damage_icon: "damage_up", // Assuming damage_up.png exists
      speed_icon: "speed_up", // Assuming speed_up.png exists
      doubleshot_icon: "doubleshot_icon", // Assuming doubleshot_icon.png exists
      splitshot_icon: "splitshot_icon", // Assuming splitshot_icon.png exists
      dodge_icon: "dodge_icon", // Assuming dodge_icon.png exists
      crit_icon: "crit_icon", // Add crit_icon.png
      bomb_icon: "bomb_icon", // Add bomb_icon.png
      shield_icon: "shield_icon", // Add shield_icon.png
      // Add other icons if needed (e.g., for shop consumables)
      health_potion_icon: "health_up" // Reuse health icon for potion
    };
    Object.entries(powerupAssets).forEach(([key, filename]) => {
      if (!this.textures.exists(key)) {
        console.log(`Loading image: ${key} from ${filename}.png`);
        // Use the key for loading if the filename is the same, otherwise use filename
        this.load.image(key, `assets/${filename}.png`);
      }
    });


    // --- Sound Assets ---
    const sounds = ['walk', 'dash', 'shot', 'death', 'upgrade', 'powerup', 'explosion', 'shield_block', 'shield_regen']; // Added new sounds
    sounds.forEach(sound => {
      if (!this.sound.get(sound)) { // Check if sound is already loaded (e.g., from TitleScene)
        console.log(`Loading audio: ${sound}`);
        this.load.audio(sound, `assets/sounds/${sound}.wav`);
      }
    });

    // --- Mobile Controls Asset ---
    if (!this.textures.exists("touchstick")) {
      console.log("Loading image: touchstick");
      this.load.image("touchstick", "assets/touchstick.png"); // Use a proper image if available
    }

    // --- Portal Spritesheet ---
    if (!this.textures.exists('portal')) {
      console.log("Loading spritesheet: portal");
      this.load.spritesheet('portal', 'assets/Dimensional_Portal.png', {
        frameWidth: 64,
        frameHeight: 64,
        startFrame: 0,
        endFrame: 5
      });
    }
    console.log("MainGameScene Preload End");
  }

  create(data) {
    console.log("MainGameScene Create Start");
    // --- Initialize Sound ---
    this.sounds = {
      walk: this.sound.add('walk', { loop: false, volume: 0.3 }),
      dash: this.sound.add('dash', { loop: false, volume: 0.5 }),
      shot: this.sound.add('shot', { loop: false, volume: 0.3 }), // Reduced volume slightly
      death: this.sound.add('death', { loop: false, volume: 0.6 }),
      upgrade: this.sound.add('upgrade', { loop: false, volume: 0.5 }),
      powerup: this.sound.add('powerup', { loop: false, volume: 0.5 }),
      explosion: this.sound.add('explosion', { loop: false, volume: 0.7 }),
      shield_block: this.sound.add('shield_block', { loop: false, volume: 0.6 }),
      shield_regen: this.sound.add('shield_regen', { loop: false, volume: 0.4 })
    };

    // --- Basic Setup ---
    this.isMobile = this.sys.game.device.os.android || this.sys.game.device.os.iOS;
    this.playArea = { x1: 60, y1: 60, x2: 740, y2: 540 }; // Playable area bounds
    this.physics.world.setBounds(0, 0, this.sys.game.config.width, this.sys.game.config.height);
    this.cameras.main.setBounds(0, 0, this.sys.game.config.width, this.sys.game.config.height);
    this.cameras.main.setZoom(1.0); // Default zoom

    // --- Initialize Systems ---
    this.finder = new EasyStar.js();
    this.setupPhysicsGroups();
    this.setupPlayer();
    this.setupInputs(); // Includes Inventory key listener
    this.createUI(); // Create UI elements

    // --- Reset or Start Game ---
    if (data?.restart) {
      console.log("Restarting game...");
      this.resetGame();
    } else {
      console.log("Starting new game...");
      // Initialize for a fresh game
      this.resetGame(); // Use resetGame to ensure clean state
    }

    // --- Generate World and Load First Room ---
    this.generateWorldMap();
    this.loadRoom(0, 0); // Load the starting room

    // --- Final Touches ---
    this.updatePowerupIcons(); // Update UI based on initial state
    this.updateDodgeUI(); // Initialize dodge UI display

    // --- Game Timer Start ---
    this.gameStartTime = this.time.now;

    // --- Portal Animation ---
    if (!this.anims.exists('portal_anim')) {
      this.anims.create({
        key: 'portal_anim',
        frames: this.anims.generateFrameNumbers('portal', { start: 0, end: 5 }),
        frameRate: 8,
        repeat: -1
      });
    }

    console.log("MainGameScene Create End");
  }

  // --- Core Update Loop ---
  update(time, delta) {
    if (!this.player || this.inTransition) return;

    // --- Pathfinding Calculation ---
    this.repathTimer -= delta;
    if (this.repathTimer <= 0) {
      this.repathTimer = 500; // Recalculate paths every 500ms
      this.enemies.getChildren().forEach(enemy => {
        if (enemy.active && enemy.type !== 'witch' && enemy.type !== 'boss') { // Witches teleport, bosses have own logic
          const distSq = Phaser.Math.Distance.Squared(this.player.x, this.player.y, enemy.x, enemy.y);
          // Only pathfind if not charging, fleeing, etc.
          if (!enemy.isCharging && !enemy.isPreparingCharge &&
            !(enemy.type === 'shapeshifter' && enemy.currentBehavior === 'flee') &&
            !(enemy.type === 'wizard' && distSq < (enemy.fleeDistance * enemy.fleeDistance))) {
            this.findPathForEnemy(enemy);
          } else {
            this.enemyPathData.set(enemy.id, { path: null, targetNodeIndex: -1 }); // Clear path if in special state
          }
        }
      });
      // Calculate paths found in the previous step
      if (this.finder) {
        this.finder.calculate();
      }
    }

    // find the closest open door under our threshold
    const threshold = 60;
    let closestDoor = null;
    let closestDist = threshold;

    // --- Player Logic ---
    this.handlePlayerMovement(time, delta);
    this.handlePlayerShooting(time);
    this.handlePlayerDodge(time);
    this.updateShield(time);

    // --- Enemy Updates ---
    this.enemies.getChildren().forEach(enemy => {
      this.updateEnemy(enemy, time, delta);
    });

    // --- Interactions ---
    this.doors.getChildren().forEach(door => {
      if (!door.isOpen) return;              // only open doors
      const d = Phaser.Math.Distance.Between(
        this.player.x, this.player.y,
        door.x, door.y
      );
      if (d < closestDist) {
        closestDist = d;
        closestDoor = door;
      }
    });

    if (closestDoor) {
      // show the prompt at that door
      this.doorPrompt
        .setText("[E] Enter")
        .setPosition(closestDoor.x, closestDoor.y - 40)
        .setVisible(true);

      // if they actually hit E, transition just once
      if (!this.isMobile && Phaser.Input.Keyboard.JustDown(this.keys.E)) {
        const [nx, ny] = closestDoor.targetRoom.split(",").map(Number);
        console.log(`→ moving to room ${nx},${ny}`);   // <— handy debug
        this.transitionToRoom(nx, ny, closestDoor.direction);
      }
    } else {
      // hide prompt if no door in range
      this.doorPrompt.setVisible(false);
    }
    // Shop interaction is handled by button clicks, not continuous check

    // --- UI Updates ---
    this.updateDodgeUI(time); // Pass time for cooldown animation
    this.updateGameTime(time); // Update elapsed time display if needed

    // --- Portal Interaction (Overlap handles the trigger) ---
    // No continuous check needed here, overlap collider does the work

  } // End update()

  // --- Setup Functions ---

  setupPhysicsGroups() {
    this.walls = this.physics.add.staticGroup();
    this.innerWalls = this.physics.add.staticGroup();
    this.doors = this.physics.add.group({ immovable: true }); // Doors are physics objects but don't move
    this.enemies = this.physics.add.group();
    this.enemyProj = this.physics.add.group();
    this.projectiles = this.physics.add.group();
    this.pickups = this.physics.add.group();
    this.portals = this.physics.add.group(); // Group for the exit portal
  }

  setupPlayer() {
    this.player = this.physics.add.sprite(400, 300, "player").setDepth(10);
    this.player.setCollideWorldBounds(true);
    this.player.health = 6; // Initial health
    this.player.maxHealth = 6; // Initial max health
    this.player.lastDamageTime = 0;
    this.player.body.setSize(this.player.width * 0.8, this.player.height * 0.8); // Adjust hitbox
    this.player.setOrigin(0.5, 0.5);

    // Initialize dodge cooldown array based on starting charges
    this.dodgeCount = this.baseDodgeCharges + this.upgrades.dodge;
    this.dodgeCooldowns = Array(this.getTotalDodgeCharges()).fill(null); // Array to hold cooldown end times

    // Shield sprite (initially invisible)
    this.shieldSprite = this.add.circle(this.player.x, this.player.y, this.player.width * 0.7, 0x00ffff, 0.3)
      .setStrokeStyle(2, 0x00ffff, 0.5)
      .setDepth(this.player.depth - 1) // Behind player
      .setVisible(false);
  }

  setupInputs() {
    this.keys = this.input.keyboard.addKeys("W,A,S,D,LEFT,RIGHT,UP,DOWN,E,SPACE,I,ESC"); // Added I, ESC

    if (this.isMobile) {
      this.setupMobileControls();
    } else {
      // Desktop mouse controls (hold to fire)
      this.input.on("pointerdown", (ptr) => {
        if (ptr.button === 0 && ptr.y < this.sys.game.config.height - 100) { // Check if inside game area, avoid UI
          this.isMouseDown = true;
          this.shootMouse(ptr); // Shoot immediately on click
        }
      });

      this.input.on("pointermove", (ptr) => {
        if (this.isMouseDown && ptr.y < this.sys.game.config.height - 100) {
          // Continuous shooting handled in update via handlePlayerShooting
        }
      });

      this.input.on("pointerup", (ptr) => {
        if (ptr.button === 0) {
          this.isMouseDown = false;
        }
      });

      // Keyboard dodge
      this.keys.SPACE.on('down', this.performDodge, this);
    }

    // Inventory Key
    this.keys.I.on('down', this.openInventory, this);
    // Allow ESC to potentially close inventory (handled within InventoryScene as well)
    this.keys.ESC.on('down', () => {
      if (this.scene.isActive('InventoryScene')) {
        this.scene.stop('InventoryScene');
        this.scene.resume('MainGameScene');
      }
      // Add other ESC functions if needed (e.g., pause menu)
    }, this);

  }

  setupMobileControls() {
    // Left half for movement joystick
    this.leftHalf = this.add.zone(0, 0, this.cameras.main.width / 2, this.cameras.main.height)
      .setOrigin(0).setScrollFactor(0).setInteractive();
    this.touchPosition = { x: 0, y: 0 };
    this.isTouching = false;
    this.touchId = -1;

    // Visual joystick elements
    this.touchIndicator = this.add.circle(100, 450, 50, 0xffffff, 0.2) // Larger, fainter base
      .setDepth(90).setScrollFactor(0).setVisible(false);
    this.touchStick = this.add.image(100, 450, 'touchstick') // Use the loaded image
      .setScale(0.5) // Adjust scale as needed
      .setAlpha(0.7)
      .setDepth(91).setScrollFactor(0).setVisible(false);


    this.leftHalf.on('pointerdown', (p) => {
      if (this.touchId === -1) { // Only track the first touch on the left
        this.isTouching = true;
        this.touchPosition.x = p.x;
        this.touchPosition.y = p.y;
        this.touchId = p.id;
        this.touchIndicator.setPosition(p.x, p.y).setVisible(true);
        this.touchStick.setPosition(p.x, p.y).setVisible(true);
      }
    });

    this.input.on('pointermove', (p) => {
      if (this.isTouching && p.id === this.touchId) {
        // Update position regardless of which half it moves to, but joystick visuals stay relative to start
        this.touchPosition.x = p.x;
        this.touchPosition.y = p.y;

        const baseStickX = this.touchIndicator.x;
        const baseStickY = this.touchIndicator.y;
        let dx = p.x - baseStickX;
        let dy = p.y - baseStickY;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const maxDist = this.touchIndicator.radius * 0.8; // Max distance stick can move from center

        if (dist > maxDist) {
          dx *= maxDist / dist;
          dy *= maxDist / dist;
        }
        this.touchStick.setPosition(baseStickX + dx, baseStickY + dy);
      }
    });

    this.input.on('pointerup', (p) => {
      if (p.id === this.touchId) {
        this.isTouching = false;
        this.touchId = -1;
        this.touchIndicator.setVisible(false);
        this.touchStick.setVisible(false);
        if (this.player) this.player.setVelocity(0, 0); // Stop player when touch ends
      }
    });

    // Right half for dodging
    this.rightHalf = this.add.zone(this.cameras.main.width / 2, 0, this.cameras.main.width / 2, this.cameras.main.height)
      .setOrigin(0).setScrollFactor(0).setInteractive();

    this.rightHalf.on('pointerdown', (p) => {
      // Ensure the touch didn't start on the left side (is not the movement touch)
      if (p.id !== this.touchId) {
        this.performDodge();
      }
    });

    // Mobile auto-shoot timer (checks periodically)
    this.autoShootTimerEvent = this.time.addEvent({
      delay: 300, // Check slightly more often than shoot cooldown
      callback: this.autoShoot,
      callbackScope: this,
      loop: true
    });
  }

  setupColliders() {
    // Clear existing colliders before adding new ones
    if (this.colliders) {
      this.colliders.forEach(c => { if (c && c.active) c.destroy() });
    }
    this.colliders = [];

    // --- World Boundaries and Walls ---
    this.colliders.push(this.physics.add.collider(this.player, this.walls));
    this.colliders.push(this.physics.add.collider(this.enemies, this.walls));
    this.colliders.push(this.physics.add.collider(this.player, this.innerWalls));
    this.colliders.push(this.physics.add.collider(this.enemies, this.innerWalls));

    // --- Projectile Collisions ---
    // Player projectiles hitting walls
    this.colliders.push(this.physics.add.collider(this.projectiles, [this.walls, this.innerWalls], (proj) => proj.destroy()));
    // Enemy projectiles hitting walls
    this.colliders.push(this.physics.add.collider(this.enemyProj, [this.walls, this.innerWalls], (proj) => proj.destroy()));
    // Player projectiles hitting enemies
    this.colliders.push(this.physics.add.overlap(this.projectiles, this.enemies, this.onHitEnemy, null, this));

    // --- Player / Enemy Interactions ---
    // Player bumping into enemies (only take damage if enemy is charging/bee type)
    this.colliders.push(this.physics.add.collider(this.player, this.enemies, (player, enemy) => {
      if ((enemy.isCharging || enemy.type === 'bee') && !this.invincible && !this.isDodging) { // Don't take bump damage while dodging
        this.takeDamage(1); // Standard bump damage
      }
    }, null, this));
    // Player getting hit by enemy projectiles
    this.colliders.push(this.physics.add.overlap(this.player, this.enemyProj, (player, proj) => {
      if (!this.invincible && !this.isDodging) { // Check invincibility and dodge state
        this.takeDamage(proj.damage || 1); // Use projectile's damage if defined, else 1
        proj.destroy();
      } else if (this.isDodging) {
        // Optional: Destroy projectile even if dodging? Or let it pass through?
        // proj.destroy();
      }
    }, null, this));

    // --- Player / Pickup Interactions ---
    this.colliders.push(this.physics.add.overlap(this.player, this.pickups, this.onPickup, null, this));

    // --- Player / Portal Interaction ---
    this.colliders.push(this.physics.add.overlap(this.player, this.portals, this.onEnterPortal, null, this));

    // --- Player / Door Collisions (Closed Doors Only) ---
    this.doors.getChildren().forEach(door => {
      if (!door.isOpen) {
        // Add collider specifically for this closed door
        door.collider = this.physics.add.collider(this.player, door);
        this.colliders.push(door.collider); // Track this collider
      }
    });

    // --- World Bounds Handling for Projectiles ---
    this.physics.world.off('worldbounds'); // Remove previous listener if any
    this.physics.world.on('worldbounds', (body) => {
      const go = body.gameObject;
      if (go && (this.projectiles.contains(go) || this.enemyProj.contains(go))) {
        go.destroy(); // Destroy projectiles hitting world bounds
      } else if (go && this.enemies.contains(go)) {
        // Optional: Stop enemies hitting bounds? Or let them bounce?
        // go.setVelocity(0, 0);
      }
    });
  }

  // --- Player Action Functions ---

  takeDamage(amount = 1) {
    if (this.invincible || this.isDodging || !this.player.active) return; // Extra check for active player

    // Shield Check FIRST
    if (this.shieldEnabled && this.shieldActive) {
      this.shieldActive = false;
      this.sound.play('shield_block');
      this.showTempMessage("Shield blocked damage!");

      // Visual feedback for shield break
      if (this.shieldSprite) {
        this.shieldSprite.setAlpha(0.1); // Make it almost disappear
        this.tweens.add({
          targets: this.shieldSprite,
          alpha: 0.8, // Flash back briefly
          duration: 100,
          yoyo: true,
          repeat: 2,
          onComplete: () => {
            if (this.shieldSprite) this.shieldSprite.setVisible(false); // Hide after flashing
          }
        });
      }

      // Start shield cooldown timer
      if (this.shieldTimer) this.shieldTimer.remove(); // Remove existing timer if any
      this.shieldTimer = this.time.delayedCall(this.shieldCooldown, () => {
        if (this.shieldEnabled) { // Check if shield is still enabled
          this.shieldActive = true;
          this.sound.play('shield_regen');
          if (this.shieldSprite) {
            this.shieldSprite.setAlpha(0.3).setStrokeStyle(2, 0x00ffff, 0.5).setVisible(true); // Restore visual
          }
        }
        this.shieldTimer = null;
      });
      return; // Damage blocked, exit function
    }


    // --- Normal Damage Handling ---
    this.player.health -= amount;
    this.player.lastDamageTime = this.time.now;
    this.invincible = true; // Grant invincibility frames

    // Visual feedback: tint and flicker
    this.player.setTint(0xff0000);
    this.player.alpha = 0.5;
    if (this.player.damageFlickerTween) this.player.damageFlickerTween.stop(); // Stop previous flicker if any
    this.player.damageFlickerTween = this.time.addEvent({
      delay: 100,
      repeat: 7, // Flicker for ~800ms total
      callback: () => {
        if (this.player && this.player.active) {
          this.player.alpha = (this.player.alpha === 1) ? 0.5 : 1;
        }
      },
      onComplete: () => {
        if (this.player && this.player.active) {
          this.player.alpha = 1;
          this.player.clearTint();
        }
        // Invincibility ends slightly after flicker
      }
    });

    this.shake(0.005, 200); // Camera shake
    this.updateHearts(); // Update UI

    // Check for death
    if (this.player.health <= 0) {
      this.player.health = 0; // Prevent negative health display
      this.sounds.death.play();
      this.gameTime = this.time.now - this.gameStartTime; // Calculate final time
      this.scene.start("GameOverScene", {
        score: this.score,
        time: this.gameTime
      });
      return; // Stop further processing if dead
    }

    // Set invincibility timer
    this.time.delayedCall(800, () => {
      this.invincible = false;
      // Ensure tint/alpha are cleared if the flicker finished early or was interrupted
      if (this.player && this.player.active && !this.player.damageFlickerTween?.isPlaying()) {
        this.player.alpha = 1;
        this.player.clearTint();
      }
    });
  }

  shootMouse(ptr) {
    // This is called on pointerdown for immediate shot, continuous firing handled in update
    if (this.time.now < this.lastShootTime + this.shootCooldown || this.isDodging) return;

    const worldPoint = this.cameras.main.getWorldPoint(ptr.x, ptr.y);
    const angle = Phaser.Math.Angle.Between(this.player.x, this.player.y, worldPoint.x, worldPoint.y);
    this.fireProjectiles(angle);
    this.lastShootTime = this.time.now;
  }

  handlePlayerShooting(time) {
    if (this.isDodging || !this.player.active) return;

    let shootAngle = null;

    // Desktop: Mouse Hold
    if (!this.isMobile && this.isMouseDown && time > this.lastShootTime + this.shootCooldown) {
      const ptr = this.input.activePointer;
      if (ptr.y < this.sys.game.config.height - 100) { // Check if pointer is in game area
        const worldPoint = this.cameras.main.getWorldPoint(ptr.x, ptr.y);
        shootAngle = Phaser.Math.Angle.Between(this.player.x, this.player.y, worldPoint.x, worldPoint.y);
      }
    }
    // Desktop: Arrow Keys
    else if (!this.isMobile && time > this.lastShootTime + this.shootCooldown) {
      let shootDX = 0;
      let shootDY = 0;
      if (this.keys.LEFT.isDown) shootDX = -1;
      else if (this.keys.RIGHT.isDown) shootDX = 1;
      if (this.keys.UP.isDown) shootDY = -1;
      else if (this.keys.DOWN.isDown) shootDY = 1;

      if (shootDX !== 0 || shootDY !== 0) {
        shootAngle = Math.atan2(shootDY, shootDX);
      }
    }
    // Mobile: Auto-shoot handled by autoShoot() called via timer

    // Fire if an angle was determined
    if (shootAngle !== null) {
      this.fireProjectiles(shootAngle);
      this.lastShootTime = time;
    }
  }


  fireProjectiles(angle) {
    if (!this.player.active) return;

    const baseDamage = 10; // Base damage per projectile
    const finalDamage = baseDamage * this.damageMultiplier;
    const projectileSpeed = 350;
    const splitCount = this.upgrades.splitShot; // How many extra pairs
    const splitAngle = Math.PI / 18; // Angle between split shots

    const fireSingleSet = (delay = 0) => {
      this.time.delayedCall(delay, () => {
        if (!this.player || !this.player.active) return; // Check player exists and is active

        // --- Central Projectile ---
        const mainProj = this.projectiles.create(this.player.x, this.player.y, "projectile");
        if (!mainProj) return; // Could fail if group is destroyed
        mainProj.setTint(0xffffff); // Make player projectiles white/bright
        mainProj.setVelocity(Math.cos(angle) * projectileSpeed, Math.sin(angle) * projectileSpeed);
        mainProj.damage = finalDamage;
        mainProj.critChance = this.critChance; // Pass crit chance
        mainProj.bombChance = this.bombShotChance; // Pass bomb chance
        mainProj.body.onWorldBounds = true; // Enable world bounds check

        // --- Split Projectiles ---
        for (let i = 1; i <= splitCount; i++) {
          // Left side
          const angleL = angle - i * splitAngle;
          const projL = this.projectiles.create(this.player.x, this.player.y, "projectile");
          if (projL) {
            projL.setTint(0xffffff);
            projL.setVelocity(Math.cos(angleL) * projectileSpeed, Math.sin(angleL) * projectileSpeed);
            projL.damage = finalDamage;
            projL.critChance = this.critChance;
            projL.bombChance = this.bombShotChance;
            projL.body.onWorldBounds = true;
          }

          // Right side
          const angleR = angle + i * splitAngle;
          const projR = this.projectiles.create(this.player.x, this.player.y, "projectile");
          if (projR) {
            projR.setTint(0xffffff);
            projR.setVelocity(Math.cos(angleR) * projectileSpeed, Math.sin(angleR) * projectileSpeed);
            projR.damage = finalDamage;
            projR.critChance = this.critChance;
            projR.bombChance = this.bombShotChance;
            projR.body.onWorldBounds = true;
          }
        }
      });
    };

    // Fire the first set immediately
    fireSingleSet(0);

    // Fire the second set if Double Shot is active
    if (this.upgrades.doubleShot > 0) {
      fireSingleSet(100); // Delay the second volley slightly
    }

    this.sounds.shot.play();
  }

  autoShoot() {
    // Only run on mobile and if player is alive and not dodging
    if (!this.isMobile || !this.player || !this.player.active || this.isDodging) return;
    if (this.time.now < this.lastShootTime + this.shootCooldown) return;

    let closestEnemy = null;
    let minDistanceSq = 400 * 400; // Max range for auto-shoot (adjust as needed)

    this.enemies.getChildren().forEach(enemy => {
      if (!enemy.active) return;
      const distanceSq = Phaser.Math.Distance.Squared(this.player.x, this.player.y, enemy.x, enemy.y);
      if (distanceSq < minDistanceSq) {
        minDistanceSq = distanceSq;
        closestEnemy = enemy;
      }
    });

    // If a close enough enemy is found, shoot at it
    if (closestEnemy) {
      const angle = Phaser.Math.Angle.Between(this.player.x, this.player.y, closestEnemy.x, closestEnemy.y);
      this.fireProjectiles(angle);
      this.lastShootTime = this.time.now;
    }
  }

  getTotalDodgeCharges() {
    return Math.min(this.baseDodgeCharges + this.upgrades.dodge, this.maxDodgeCharges);
  }

  handlePlayerDodge(time) {
    // Update cooldowns
    let chargesRecovered = 0;
    for (let i = this.dodgeCooldowns.length - 1; i >= 0; i--) {
      // Check if a cooldown slot exists and the time has passed
      if (this.dodgeCooldowns[i] !== null && time >= this.dodgeCooldowns[i]) {
        this.dodgeCooldowns[i] = null; // Mark slot as available
        chargesRecovered++;
      }
    }

    // Add recovered charges back to count, up to the max
    if (chargesRecovered > 0) {
      this.dodgeCount = Math.min(this.getTotalDodgeCharges(), this.dodgeCount + chargesRecovered);
    }

    // Ensure the cooldowns array matches the potential charges
    // Remove excess nulls if dodge count decreased somehow (shouldn't happen often)
    let nullCount = this.dodgeCooldowns.filter(cd => cd === null).length;
    while (nullCount > this.dodgeCount && this.dodgeCooldowns.length > 0) {
      const nullIndex = this.dodgeCooldowns.indexOf(null);
      if (nullIndex > -1) {
        this.dodgeCooldowns.splice(nullIndex, 1);
        nullCount--;
      } else {
        break; // Should not happen if logic is correct
      }
    }
    // Add null slots if needed (e.g., after gaining a charge upgrade)
    while (this.dodgeCooldowns.length < this.getTotalDodgeCharges() - (this.getTotalDodgeCharges() - this.dodgeCount)) {
      // This logic seems overly complex. Let's simplify.
      // We need slots for charges currently on cooldown.
      // Total slots = Total Charges. Available slots = dodgeCount. Cooldown slots = Total - Available.
      const neededCooldownSlots = this.getTotalDodgeCharges() - this.dodgeCount;
      let currentCooldownSlots = this.dodgeCooldowns.filter(cd => cd !== null).length;

      // Add nulls until the array represents the total charges
      while (this.dodgeCooldowns.length < this.getTotalDodgeCharges()) {
        this.dodgeCooldowns.push(null);
      }
      // Ensure correct number of non-null cooldowns (might remove extras if needed)
      this.dodgeCooldowns.sort((a, b) => (a === null ? 1 : 0) - (b === null ? 1 : 0)); // Put nulls at the end
      while (this.dodgeCooldowns.filter(cd => cd !== null).length > neededCooldownSlots) {
        const lastNonNullIndex = this.dodgeCooldowns.map(e => e !== null).lastIndexOf(true);
        if (lastNonNullIndex > -1) this.dodgeCooldowns[lastNonNullIndex] = null;
        else break;
      }
    }
  }


  performDodge() {
    if (this.isDodging || this.dodgeCount <= 0 || !this.player.active) return;

    this.isDodging = true;
    this.invincible = true; // Invincible during dodge
    this.player.setTint(0x00ffff); // Visual feedback for dodge
    this.dodgeCount--;
    this.sounds.dash.play();

    // Find the first available (null) cooldown slot and set the cooldown end time
    const cooldownEndTime = this.time.now + this.dodgeCooldownTime;
    let slotFound = false;
    for (let i = 0; i < this.dodgeCooldowns.length; i++) {
      if (this.dodgeCooldowns[i] === null) {
        this.dodgeCooldowns[i] = cooldownEndTime;
        slotFound = true;
        break;
      }
    }
    if (!slotFound) {
      // This case should ideally not happen if handlePlayerDodge keeps the array size correct.
      // As a fallback, push it, but log a warning.
      console.warn("No null slot found for dodge cooldown, pushing new entry. Array size might be mismatched.");
      this.dodgeCooldowns.push(cooldownEndTime);
    }


    // Determine dodge direction based on input
    let dodgeX = 0;
    let dodgeY = 0;
    let directionFound = false;

    if (this.isMobile) {
      // Use movement joystick direction if active
      if (this.isTouching && this.touchIndicator && this.touchIndicator.visible) {
        const baseStickX = this.touchIndicator.x;
        const baseStickY = this.touchIndicator.y;
        let dx = this.touchPosition.x - baseStickX;
        let dy = this.touchPosition.y - baseStickY;
        const len = Math.sqrt(dx * dx + dy * dy);
        const deadZone = 10;
        if (len > deadZone) {
          dodgeX = dx / len;
          dodgeY = dy / len;
          directionFound = true;
        }
      }
      // Default dodge direction if joystick not active (e.g., forward) - Optional
      if (!directionFound) {
        // Maybe dodge based on player facing? Or default forward?
        // Let's default forward (up) for now if no input
        // dodgeY = -1;
        // Or maybe default based on last movement? More complex.
        // For simplicity, if no input, maybe don't dodge? Or pick a default.
        // Let's require movement input for mobile dodge direction. If no input, maybe cancel?
        // Or just use last known velocity?
        const lastVel = this.player.body.velocity;
        if (lastVel.x !== 0 || lastVel.y !== 0) {
          const len = lastVel.length();
          dodgeX = lastVel.x / len;
          dodgeY = lastVel.y / len;
          directionFound = true;
        } else {
          // Default to forward if completely still
          dodgeY = -1;
          directionFound = true;
        }
      }
    } else {
      // Desktop WASD keys
      if (this.keys.W.isDown) dodgeY = -1;
      else if (this.keys.S.isDown) dodgeY = 1;
      if (this.keys.A.isDown) dodgeX = -1;
      else if (this.keys.D.isDown) dodgeX = 1;

      if (dodgeX !== 0 || dodgeY !== 0) {
        directionFound = true;
        // Normalize diagonal movement
        if (dodgeX !== 0 && dodgeY !== 0) {
          const len = Math.sqrt(2);
          dodgeX /= len;
          dodgeY /= len;
        }
      } else {
        // Default dodge direction if no keys pressed (e.g., forward)
        // Or use mouse direction? Let's default forward.
        dodgeY = -1; // Default dodge up
        directionFound = true;
      }
    }

    // Apply velocity
    if (directionFound) {
      this.player.setVelocity(dodgeX * this.dodgeSpeed, dodgeY * this.dodgeSpeed);
    } else {
      // Handle case where no direction could be determined (e.g., cancel dodge?)
      // For now, let's assume a direction is always found or defaulted.
      this.player.setVelocity(0, -this.dodgeSpeed); // Default up if all else fails
    }


    // End dodge after duration
    this.time.delayedCall(this.dodgeDuration, () => {
      if (this.player && this.player.active) { // Check if player still exists
        this.isDodging = false;
        this.player.clearTint();
        // Stop velocity unless player is providing new input
        if (!this.isMoving()) { // Add an isMoving() helper or check inputs directly
          this.player.setVelocity(0, 0);
        }
        // Check if damage invincibility should also end
        if (this.time.now >= this.player.lastDamageTime + 800) {
          this.invincible = false;
        }
      }
    });
  }

  isMoving() {
    if (!this.player || !this.player.body) return false;
    if (this.isMobile && this.isTouching) {
      const baseStickX = this.touchIndicator.x;
      const baseStickY = this.touchIndicator.y;
      let dx = this.touchPosition.x - baseStickX;
      let dy = this.touchPosition.y - baseStickY;
      const len = Math.sqrt(dx * dx + dy * dy);
      const deadZone = 10;
      return len > deadZone;
    } else if (!this.isMobile) {
      return this.keys.W.isDown || this.keys.A.isDown || this.keys.S.isDown || this.keys.D.isDown;
    }
    return false;
  }


  handlePlayerMovement(time, delta) {
    if (this.isDodging || !this.player || !this.player.active) return;

    let targetVelocityX = 0;
    let targetVelocityY = 0;
    let moving = false;

    if (this.isMobile) {
      if (this.isTouching && this.touchIndicator && this.touchIndicator.visible) {
        const baseStickX = this.touchIndicator.x;
        const baseStickY = this.touchIndicator.y;
        let dx = this.touchPosition.x - baseStickX;
        let dy = this.touchPosition.y - baseStickY;
        const len = Math.sqrt(dx * dx + dy * dy);
        const deadZone = 10;

        if (len > deadZone) {
          // Normalize vector and apply speed
          targetVelocityX = (dx / len) * this.playerSpeed;
          targetVelocityY = (dy / len) * this.playerSpeed;
          moving = true;
        }
      }
    } else {
      // Desktop WASD controls
      let dx = 0;
      let dy = 0;
      if (this.keys.W.isDown) dy = -1;
      else if (this.keys.S.isDown) dy = 1;
      if (this.keys.A.isDown) dx = -1;
      else if (this.keys.D.isDown) dx = 1;

      if (dx !== 0 || dy !== 0) {
        moving = true;
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

    // Apply the calculated velocity
    this.player.setVelocity(targetVelocityX, targetVelocityY);

    // Play footstep sound periodically while moving
    if (moving && time > this.footstepTimer + 350) { // Adjust timing as needed
      this.sounds.walk.play();
      this.footstepTimer = time;
    }

    // Update shield position to follow player
    if (this.shieldSprite && this.shieldEnabled) {
      this.shieldSprite.setPosition(this.player.x, this.player.y);
    }
  }

  updateShield(time) {
    if (!this.shieldEnabled || !this.player || !this.player.active) {
      if (this.shieldSprite) this.shieldSprite.setVisible(false);
      return;
    }

    // Make shield visible only if it's active (ready)
    if (this.shieldSprite) {
      this.shieldSprite.setVisible(this.shieldActive);
      this.shieldSprite.setPosition(this.player.x, this.player.y); // Ensure position updates
    }

    // Cooldown is handled when damage is blocked in takeDamage()
  }


  // --- Enemy Functions ---

  createEnemy(x, y, type) {
    const enemy = this.enemies.create(x, y, type);
    if (!enemy || !enemy.body) {
      console.error(`Failed to create enemy of type ${type} at ${x},${y}`);
      return null;
    }

    // --- Base Stats ---
    // Define stats in a more structured way
    const enemyStats = {
      blob: { h: 30, s: 80, sC: 2000, d: 1, score: 10 },
      bee: { h: 25, s: 150, sC: 0, d: 1, score: 15 }, // Bees don't shoot (sC=0), rely on contact
      witch: { h: 45, s: 0, sC: 1800, d: 1, tD: 100, kD: 400, hD: 500, score: 25 }, // Faster teleport (reduced sC)
      quasit: { h: 40, s: 110, sC: 1800, d: 1, score: 20 },
      orc: { h: 60, s: 90, sC: 0, cPT: 1000, cD: 500, cS: 250, d: 2, score: 30 }, // Orcs charge, don't shoot
      wizard: { h: 40, s: 70, sC: 1500, d: 1, fD: 150, eD: 250, score: 35 },
      shapeshifter: { h: 50, s: 120, sC: 2500, d: 1, bCT: 3000, score: 40 },
      miniboss: { h: 150, s: 100, sC: 1200, d: 2, score: 200, p: ['spread', 'targeted_fast'] } // Example miniboss stats
    };

    const stats = enemyStats[type] || enemyStats.blob; // Default to blob if type unknown

    // Apply stats
    enemy.health = this.hardMode ? Math.ceil(stats.h * 1.5) : stats.h;
    enemy.maxHealth = enemy.health;
    enemy.speed = stats.s;
    enemy.type = type;
    enemy.shootCooldown = stats.sC || 0; // Use 0 if undefined
    enemy.lastShootTime = this.time.now + Phaser.Math.Between(500, (stats.sC || 2000)); // Randomize first shot time
    enemy.damage = stats.d; // Damage dealt by contact or projectiles
    enemy.scoreValue = stats.score || 10; // Score awarded on defeat

    // --- Behavior Flags & Timers ---
    enemy.isPreparingCharge = false;
    enemy.isCharging = false;
    enemy.chargePrepareTime = stats.cPT || 1000;
    enemy.chargeDuration = stats.cD || 500;
    enemy.chargeSpeed = stats.cS || 250;
    enemy.lastChargeAttempt = 0;
    enemy.chargeCooldown = 4000; // Cooldown between charge attempts

    enemy.fleeDistance = stats.fD || 0; // Distance at which wizard flees
    enemy.engageDistance = stats.eD || 0; // Distance at which wizard stops fleeing/starts shooting

    enemy.behaviorTimer = 0; // Shapeshifter behavior change timer
    enemy.behaviorChangeTime = stats.bCT || 3000;
    enemy.currentBehavior = 'chase'; // Default shapeshifter behavior

    enemy.isTeleporting = false; // Witch state
    enemy.teleportDelay = stats.tD || 100; // Delay before teleporting after telegraph
    enemy.shootDelay = stats.hD || 500; // Delay before shooting after reappearing
    enemy.shakeDuration = stats.kD || 400; // Duration of telegraph shake

    // --- Miniboss Specific ---
    if (type === 'miniboss') {
      enemy.attackPatterns = stats.p || [];
      enemy.currentAttackIndex = 0;
      enemy.attackDelay = stats.sC; // Use shootCooldown as attack delay
      enemy.projectileSpeed = 200; // Example speed
      enemy.attackFunctions = { // Map pattern names to functions
        'spread': this.bossAttack_ShotgunSpread, // Reuse boss functions
        'targeted_fast': this.bossAttack_SingleTargetedFast
      };
      enemy.updateAttack = (time) => { // Simple attack logic for miniboss
        if (!enemy.active || !this.player.active) return;
        if (time < enemy.lastShootTime + enemy.attackDelay) return;

        const pattern = enemy.attackPatterns[enemy.currentAttackIndex % enemy.attackPatterns.length];
        const attackFunc = enemy.attackFunctions[pattern];
        if (attackFunc) {
          attackFunc.call(this, enemy, time); // Call function with correct context
        } else {
          console.warn(`Miniboss attack pattern ${pattern} not found!`);
        }

        enemy.currentAttackIndex++;
        enemy.lastShootTime = time;
      };
    }


    // --- Physics & ID ---
    enemy.setCollideWorldBounds(true);
    enemy.body.onWorldBounds = true; // Use event for bounds collision if needed
    enemy.body.setSize(enemy.width * 0.8, enemy.height * 0.8); // Adjust hitbox
    enemy.setOrigin(0.5, 0.5);
    enemy.id = Phaser.Utils.String.UUID(); // Unique ID for pathfinding map

    // --- Special Visuals ---
    if (type === 'bee') {
      // Add shadow for flying effect
      const shadow = this.add.ellipse(x, y + enemy.height * 0.4, enemy.width * 0.6, enemy.width * 0.25, 0x000000, 0.4)
        .setDepth(enemy.depth - 1); // Render shadow below enemy
      enemy.setData('shadow', shadow);
      // Add slight bobbing tween
      this.tweens.add({
        targets: enemy,
        y: enemy.y - 6, // Bob up and down
        duration: 1200,
        ease: 'Sine.easeInOut',
        yoyo: true,
        repeat: -1
      });
    }

    return enemy;
  }

  updateEnemy(enemy, time, delta) {
    if (!enemy.active || !this.player.active) return;

    // --- Calculate Distance & Target ---
    const dx = this.player.x - enemy.x;
    const dy = this.player.y - enemy.y;
    const distSq = dx * dx + dy * dy;
    const dist = Math.sqrt(distSq);
    const stopDist = 50; // Base stopping distance
    const stopDistSq = stopDist * stopDist;

    // --- Pathfinding Target ---
    const pathData = this.enemyPathData.get(enemy.id);
    let targetX = this.player.x;
    let targetY = this.player.y;
    let movingAlongPath = false;

    if (pathData && pathData.path && pathData.targetNodeIndex < pathData.path.length) {
      const targetNode = pathData.path[pathData.targetNodeIndex];
      const nodeWorldPos = this.getWorldCoordinates(targetNode.x, targetNode.y);
      targetX = nodeWorldPos.x;
      targetY = nodeWorldPos.y;
      movingAlongPath = true;

      // Check if close enough to current path node to advance
      const distToNodeSq = Phaser.Math.Distance.Squared(enemy.x, enemy.y, targetX, targetY);
      if (distToNodeSq < (this.gridCellSize / 1.5) * (this.gridCellSize / 1.5)) {
        pathData.targetNodeIndex++;
        // If reached end of path, clear path data and target player directly
        if (pathData.targetNodeIndex >= pathData.path.length) {
          this.enemyPathData.set(enemy.id, { path: null, targetNodeIndex: -1 });
          movingAlongPath = false;
          targetX = this.player.x;
          targetY = this.player.y;
        } else {
          // Get next node position
          const nextNode = pathData.path[pathData.targetNodeIndex];
          const nextNodeWorldPos = this.getWorldCoordinates(nextNode.x, nextNode.y);
          targetX = nextNodeWorldPos.x;
          targetY = nextNodeWorldPos.y;
        }
      }
    } else {
      // No path or path finished, target player directly
      targetX = this.player.x;
      targetY = this.player.y;
      movingAlongPath = false;
    }

    // --- Enemy Type Specific Logic ---
    switch (enemy.type) {
      case "boss":
        if (enemy.updateAttack) enemy.updateAttack(time); // Handle boss attack patterns
        // Basic boss movement (can be overridden by specific attacks like charge)
        if (!enemy.isCharging && !enemy.isPreparingCharge) {
          if (dist > 150) { // Keep some distance
            this.physics.moveTo(enemy, targetX, targetY, enemy.speed * 0.6);
          } else {
            enemy.setVelocity(0, 0); // Stop if close
          }
        }
        break;

      case "miniboss":
        if (enemy.updateAttack) enemy.updateAttack(time); // Handle miniboss attack patterns
        // Simple movement for miniboss
        if (dist > 100) {
          this.physics.moveTo(enemy, targetX, targetY, enemy.speed * 0.8);
        } else {
          enemy.setVelocity(0, 0);
        }
        break;

      case "witch":
        enemy.setVelocity(0, 0); // Witches don't move normally
        if (!enemy.isTeleporting && time > enemy.lastShootTime + enemy.shootCooldown) {
          enemy.isTeleporting = true;
          enemy.lastShootTime = time; // Reset timer when starting teleport sequence
          enemy.setTint(0xff00ff); // Telegraph color

          // Telegraph shake tween
          this.tweens.add({
            targets: enemy,
            scaleX: enemy.scaleX * 1.1,
            scaleY: enemy.scaleY * 0.9,
            angle: Phaser.Math.Between(-10, 10),
            duration: 50,
            yoyo: true,
            repeat: Math.floor(enemy.shakeDuration / 100) - 1, // Number of shakes
            onComplete: () => {
              if (!enemy.active) return;
              enemy.setScale(1); // Reset visual state
              enemy.setAngle(0);
              enemy.clearTint();

              // Delay before actual teleport
              this.time.delayedCall(enemy.teleportDelay, () => {
                if (!enemy.active) return;

                // Find a valid teleport location near the player
                let teleportX, teleportY, attempts = 0;
                const maxAttempts = 15;
                do {
                  const angle = Math.random() * Math.PI * 2;
                  const radius = Phaser.Math.Between(100, 250); // Teleport range
                  teleportX = this.player.x + Math.cos(angle) * radius;
                  teleportY = this.player.y + Math.sin(angle) * radius;
                  attempts++;
                } while (attempts < maxAttempts && (!this.isWalkableAt(teleportX, teleportY) || Phaser.Math.Distance.Squared(teleportX, teleportY, this.player.x, this.player.y) < 50 * 50)); // Ensure not too close

                // Clamp position within play area
                enemy.x = Phaser.Math.Clamp(teleportX, this.playArea.x1 + enemy.width / 2, this.playArea.x2 - enemy.width / 2);
                enemy.y = Phaser.Math.Clamp(teleportY, this.playArea.y1 + enemy.height / 2, this.playArea.y2 - enemy.height / 2);

                // Reappear effect
                enemy.alpha = 0.3;
                this.tweens.add({ targets: enemy, alpha: 1, duration: 150 });
                // Slight visual pop on reappear
                this.tweens.add({ targets: enemy, scaleX: 1.1, scaleY: 0.9, angle: Phaser.Math.Between(-5, 5), duration: 40, yoyo: true, repeat: 3, onComplete: () => { if (enemy.active) { enemy.setScale(1); enemy.setAngle(0); } } });

                // Delay before shooting after reappearing
                this.time.delayedCall(enemy.shootDelay, () => {
                  if (enemy.active && this.player.active) {
                    this.shootEnemyProjectile(enemy, this.player.x, this.player.y);
                  }
                  enemy.isTeleporting = false; // End teleport state
                });
              });
            }
          });
        }
        break;

      case "wizard":
        if (distSq < enemy.fleeDistance * enemy.fleeDistance) {
          // Flee directly away from player
          const fleeAngle = Phaser.Math.Angle.Between(this.player.x, this.player.y, enemy.x, enemy.y);
          this.physics.velocityFromAngle(fleeAngle, enemy.speed, enemy.body.velocity);
        } else if (distSq > enemy.engageDistance * enemy.engageDistance) {
          // Move towards player if far away
          if (movingAlongPath || dist > stopDist + 20) { // Use path if available
            this.physics.moveTo(enemy, targetX, targetY, enemy.speed * 0.7);
          } else {
            enemy.setVelocity(0, 0); // Stop if close enough and no path
          }
        } else {
          // In engagement range, stop moving and shoot
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
        } else if (distSq < 180 * 180 && time > enemy.lastChargeAttempt + enemy.chargeCooldown) { // Charge if player is close enough
          enemy.isPreparingCharge = true;
          enemy.chargeStartTime = time;
          enemy.lastChargeAttempt = time; // Reset cooldown timer
          enemy.setVelocity(0, 0);
          enemy.setTint(0xffff00); // Telegraph charge
        } else {
          // Move towards player if not charging
          if (movingAlongPath || dist > stopDist + 30) { // Use path if available, stop a bit further for Orc
            this.physics.moveTo(enemy, targetX, targetY, enemy.speed);
          } else {
            enemy.setVelocity(0, 0);
          }
        }
        break;

      case "bee":
        // Bees constantly move towards the player (or path target)
        if (movingAlongPath) {
          const angleToNode = Phaser.Math.Angle.Between(enemy.x, enemy.y, targetX, targetY);
          this.physics.velocityFromAngle(angleToNode, enemy.speed, enemy.body.velocity);
        } else { // No path, move directly towards player
          this.physics.moveToObject(enemy, this.player, enemy.speed);
        }
        // Update shadow position
        const shadow = enemy.getData('shadow');
        if (shadow && shadow.active) {
          shadow.setPosition(enemy.x, enemy.y + enemy.height * 0.4); // Adjust shadow position relative to bee
          shadow.setDepth(enemy.depth - 1); // Keep shadow below bee
        }
        break;

      case "shapeshifter":
        // Change behavior periodically
        if (time > enemy.behaviorTimer) {
          const behaviors = ['chase', 'flee', 'shoot', 'circle'];
          enemy.currentBehavior = Phaser.Utils.Array.GetRandom(behaviors);
          enemy.behaviorTimer = time + enemy.behaviorChangeTime;
          enemy.setVelocity(0, 0); // Reset velocity on behavior change
        }

        // Execute current behavior
        switch (enemy.currentBehavior) {
          case 'chase':
            if (movingAlongPath || dist > stopDist) {
              this.physics.moveTo(enemy, targetX, targetY, enemy.speed);
            } else {
              enemy.setVelocity(0, 0);
            }
            break;
          case 'flee':
            if (distSq < 300 * 300) { // Flee if player is within range
              const fleeAngle = Phaser.Math.Angle.Between(this.player.x, this.player.y, enemy.x, enemy.y);
              this.physics.velocityFromAngle(fleeAngle, enemy.speed, enemy.body.velocity);
            } else {
              enemy.setVelocity(0, 0); // Stop fleeing if player is far
            }
            break;
          case 'shoot':
            enemy.setVelocity(0, 0); // Stop to shoot
            if (time > enemy.lastShootTime + enemy.shootCooldown) {
              this.shootEnemyProjectile(enemy, this.player.x, this.player.y);
              enemy.lastShootTime = time;
            }
            break;
          case 'circle':
            const circleSpeed = enemy.speed * 0.8;
            const desiredDist = 150; // Circling radius
            if (dist > desiredDist + 20) {
              // Move towards player if too far
              this.physics.moveTo(enemy, this.player.x, this.player.y, circleSpeed);
            } else if (dist < desiredDist - 20) {
              // Move away from player if too close
              const fleeAngle = Phaser.Math.Angle.Between(this.player.x, this.player.y, enemy.x, enemy.y);
              this.physics.velocityFromAngle(fleeAngle, circleSpeed, enemy.body.velocity);
            } else {
              // Circle around player (tangential velocity)
              const angleOffset = Math.PI / 2; // 90 degrees offset for tangential movement
              const targetAngle = Math.atan2(dy, dx); // Angle towards player
              const circleAngle = targetAngle + angleOffset; // Angle perpendicular to player
              enemy.setVelocity(Math.cos(circleAngle) * circleSpeed, Math.sin(circleAngle) * circleSpeed);
            }
            break;
        }
        break;

      case "blob":
      default:
        // Simple move towards target (player or path node)
        if (movingAlongPath || dist > stopDist) {
          this.physics.moveTo(enemy, targetX, targetY, enemy.speed);
        } else {
          enemy.setVelocity(0, 0); // Stop if close enough
        }
        // Shoot if cooldown is ready
        if (enemy.shootCooldown && time > enemy.lastShootTime + enemy.shootCooldown) {
          this.shootEnemyProjectile(enemy, this.player.x, this.player.y);
          enemy.lastShootTime = time;
        }
        break;
    }

    // Ensure enemies stay within play area (simple clamp) - might conflict with pathfinding near edges
    // enemy.x = Phaser.Math.Clamp(enemy.x, this.playArea.x1 + enemy.width / 2, this.playArea.x2 - enemy.width / 2);
    // enemy.y = Phaser.Math.Clamp(enemy.y, this.playArea.y1 + enemy.height / 2, this.playArea.y2 - enemy.height / 2);
  }

  processChargingState(enemy, time) {
    if (!enemy.active) return;

    if (enemy.isPreparingCharge) {
      // Check if preparation time is over
      if (time > enemy.chargeStartTime + enemy.chargePrepareTime) {
        enemy.isPreparingCharge = false;
        enemy.isCharging = true;
        enemy.chargeEndTime = time + enemy.chargeDuration; // Set when charge ends

        // Target the player's position *at the moment the charge starts*
        const targetX = this.player.x;
        const targetY = this.player.y;
        const angle = Phaser.Math.Angle.Between(enemy.x, enemy.y, targetX, targetY);

        // Apply charge velocity
        enemy.setVelocity(Math.cos(angle) * enemy.chargeSpeed, Math.sin(angle) * enemy.chargeSpeed);
        enemy.setTint(0xff0000); // Charging color
      }
      // Else: Still preparing, do nothing (velocity should be 0)
    } else if (enemy.isCharging) {
      // Check if charge duration is over
      if (time > enemy.chargeEndTime) {
        enemy.isCharging = false;
        enemy.clearTint();
        enemy.setVelocity(0, 0); // Stop after charge
      }
      // Else: Still charging, let velocity continue
    }
  }

  shootEnemyProjectile(enemy, targetX, targetY) {
    if (!enemy.active || !this.player.active) return;

    const angle = Phaser.Math.Angle.Between(enemy.x, enemy.y, targetX, targetY);
    let speed = 150;
    let texture = 'blob_projectile'; // Default texture
    let scale = 1.0;
    let damage = enemy.damage || 1; // Use enemy's base damage

    // Customize projectile based on enemy type
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
        texture = 'quasit_projectile';
        speed = 160;
        break;
      case 'blob':
      case 'shapeshifter': // Shapeshifter might use blob projectile
        texture = 'blob_projectile';
        speed = 150;
        break;
      // Add cases for miniboss/boss if they use this function (they likely use createBossProjectile)
    }

    const proj = this.enemyProj.create(enemy.x, enemy.y, texture);
    if (!proj) return; // Failed to create

    proj.setScale(scale);
    proj.setTint(0xffffff); // Make enemy projectiles brighter/whiter for visibility
    // proj.setPipeline('Light2D'); // Optional: Use if you have 2D lighting
    proj.setVelocity(Math.cos(angle) * speed, Math.sin(angle) * speed);
    proj.damage = damage; // Assign damage value to projectile
    proj.body.onWorldBounds = true; // Enable world bounds check
    // Optional: Add slight inaccuracy
    // const inaccuracy = Phaser.Math.DegToRad(5); // Max 5 degrees inaccuracy
    // angle += Phaser.Math.FloatBetween(-inaccuracy, inaccuracy);
    // proj.setVelocity(Math.cos(angle) * speed, Math.sin(angle) * speed);

    return proj;
  }

  createBossProjectile(x, y, vx, vy, texture = 'boss_projectile', scale = 1.5, damage = 2) {
    const proj = this.enemyProj.create(x, y, texture);
    if (!proj) return null;

    proj.setTint(0xffffff); // Make boss projectiles bright
    // proj.setPipeline('Light2D'); // Optional: Use if you have 2D lighting
    proj.setVelocity(vx, vy);
    proj.setScale(scale);
    proj.damage = damage; // Assign damage
    proj.body.onWorldBounds = true;
    return proj;
  }

  onHitEnemy(proj, enemy) {
    // Ensure both projectile and enemy are active and valid
    if (!proj.active || !enemy.active || !proj.body || !enemy.body) return;

    // --- Invulnerability Checks ---
    // Boss invulnerability check
    if (enemy.type === 'boss' && enemy.isInvulnerable) {
      proj.destroy(); // Destroy projectile, no damage
      // Optional: Add a visual/sound effect for hitting invulnerable target
      return;
    }
    // Add other invulnerability checks if needed (e.g., specific enemy phases)

    // --- Damage Calculation ---
    let damageDealt = proj.damage || 1; // Base damage from projectile
    let isCritical = false;

    // Check for critical hit
    if (proj.critChance && Math.random() < proj.critChance) {
      damageDealt *= 2; // Double damage for crit
      isCritical = true;
    }

    // Apply damage
    enemy.health -= damageDealt;

    // --- Visual Feedback ---
    // Damage number popup
    this.showDamageNumber(enemy.x, enemy.y, damageDealt, isCritical);
    // Enemy flash red
    enemy.setTint(0xff0000);
    this.time.delayedCall(100, () => {
      if (enemy.active) enemy.clearTint(); // Clear tint only if enemy still exists
    });

    // --- Special Effects ---
    // Check for bomb shot
    if (proj.bombChance && Math.random() < proj.bombChance) {
      this.createExplosion(proj.x, proj.y, damageDealt * 1.5); // Explosion damage based on projectile
    }

    // Destroy the projectile
    proj.destroy();

    // --- Health Bar Update (Boss/Miniboss) ---
    if ((enemy.type === 'boss' || enemy.type === 'miniboss') && enemy.updateHealthBar) {
      enemy.updateHealthBar();
    }

    // --- Enemy Death Check ---
    if (enemy.health <= 0) {
      // Clean up enemy-specific data/visuals
      if (enemy.type === 'bee') {
        const shadow = enemy.getData('shadow');
        if (shadow) shadow.destroy();
      }
      // Remove from pathfinding map
      this.enemyPathData.delete(enemy.id);

      // --- Rewards & Score ---
      this.score += enemy.scoreValue || 10; // Add score value defined in createEnemy
      this.scoreText.setText(`Score: ${this.score}`);

      // --- Specific Death Actions ---
      if (enemy.type === "boss") {
        this.dropRandomUpgrade(enemy.x, enemy.y); // Drop guaranteed upgrade
        this.onBossDefeated(); // Trigger boss defeat sequence
        // Clear boss UI
        if (this.bossHealthBar) this.bossHealthBar.destroy();
        if (this.bossHealthBarBg) this.bossHealthBarBg.destroy();
        if (this.bossNameText) this.bossNameText.destroy();
        this.bossHealthBar = null;
        this.bossHealthBarBg = null;
        this.bossNameText = null;

      } else if (enemy.type === "miniboss") {
        this.dropRandomUpgrade(enemy.x, enemy.y); // Drop guaranteed upgrade
        this.coins += 25; // More coins for miniboss
        this.coinsText.setText(`Coins: ${this.coins}`);
        this.showTempMessage("Mini-boss defeated! +25 Coins");
        // Mark miniboss for this world as defeated
        this.miniBossSpawned[`world_${this.currentWorld}`] = true;

      } else {
        // Regular enemy drops
        this.coins += Phaser.Math.Between(1, 3); // Drop 1-3 coins
        this.coinsText.setText(`Coins: ${this.coins}`);

        // Chance to drop small health pickup (e.g., 5%)
        if (Phaser.Math.FloatBetween(0, 1) < 0.05) {
          this.createHealthPickup(enemy.x, enemy.y);
        }
      }

      // Destroy the enemy sprite AFTER handling drops/score etc.
      enemy.destroy();


      // --- Room Clear Check ---
      // Check if room is active and no enemies are left
      if (this.roomActive && this.enemies.countActive(true) === 0) {
        console.log("Room Cleared!");
        this.roomActive = false;
        this.openAllDoors();
        this.clearedRooms.add(`${this.currentRoom.x},${this.currentRoom.y}`);
        // Optional: Add a "Room Cleared" sound or visual
      }
    }
  }

  showDamageNumber(x, y, amount, isCritical = false) {
    const displayAmount = Math.round(amount);
    if (displayAmount <= 0) return; // Don't show 0 damage

    const style = {
      fontFamily: 'Arial',
      fontSize: isCritical ? '20px' : '16px',
      fill: isCritical ? '#ff0000' : '#ffffff', // Red for crit, white for normal
      stroke: '#000000',
      strokeThickness: 3
    };
    const prefix = isCritical ? 'CRIT! ' : '';

    const text = this.add.text(x, y - 20, `${prefix}${displayAmount}`, style)
      .setOrigin(0.5)
      .setDepth(101); // Ensure damage numbers are above most things

    // Tween for popup effect
    this.tweens.add({
      targets: text,
      y: y - 70, // Move up
      alpha: 0, // Fade out
      duration: 1200,
      ease: 'Cubic.easeOut', // Smoother easing
      onComplete: () => {
        text.destroy(); // Remove text object after tween
      }
    });
  }

  createExplosion(x, y, damage) {
    // Visual effect: Expanding circle
    const explosionRadius = 80;
    const explosion = this.add.circle(x, y, 10, 0xff6600, 0.8) // Start small
      .setDepth(15); // Render above enemies but below player?

    this.tweens.add({
      targets: explosion,
      radius: explosionRadius,
      alpha: 0,
      duration: 300,
      ease: 'Quad.easeOut',
      onComplete: () => explosion.destroy()
    });

    // Sound effect
    this.sounds.explosion.play();

    // Camera shake
    this.shake(0.006, 150);

    // Damage nearby enemies
    this.enemies.getChildren().forEach(enemy => {
      if (!enemy.active || enemy.health <= 0) return; // Skip inactive/dead enemies

      const dist = Phaser.Math.Distance.Between(x, y, enemy.x, enemy.y);

      if (dist < explosionRadius) {
        // Damage falls off with distance
        const damageFactor = 1 - (dist / explosionRadius);
        const explosionDamage = damage * damageFactor; // Base damage passed from projectile

        if (explosionDamage > 0) {
          enemy.health -= explosionDamage;
          this.showDamageNumber(enemy.x, enemy.y, explosionDamage, false); // Show explosion damage

          // Update boss/miniboss health bar if applicable
          if ((enemy.type === 'boss' || enemy.type === 'miniboss') && enemy.updateHealthBar) {
            enemy.updateHealthBar();
          }

          // Check if enemy died from explosion
          if (enemy.health <= 0) {
            // Need to trigger the full onHitEnemy logic to handle score/drops etc.
            // Simulate a zero-damage hit to trigger the death sequence
            this.onHitEnemy({ active: true, damage: 0, critChance: 0, bombChance: 0, destroy: () => { } }, enemy);
          } else {
            // Flash enemy red briefly from explosion hit
            enemy.setTint(0xff8888); // Slightly different tint for explosion?
            this.time.delayedCall(80, () => {
              if (enemy.active) enemy.clearTint();
            });
          }
        }
      }
    });
  }


  createHealthPickup(x, y) {
    const pickup = this.pickups.create(x, y, 'hp_icon'); // Use standard health icon
    if (!pickup) return null;

    pickup.upgradeType = 'health_small'; // Internal type identifier
    pickup.healAmount = 2; // Heal 1 full heart (2 health points)
    pickup.setScale(0.8); // Slightly smaller than upgrade pickups?
    pickup.setDepth(5); // Render above ground, below player

    // Floating animation
    this.tweens.add({
      targets: pickup,
      y: pickup.y - 8, // Bob up and down
      duration: 1200,
      ease: 'Sine.easeInOut',
      yoyo: true,
      repeat: -1
    });

    // Optional: Add a subtle glow?
    // pickup.setPipeline('Light2D');
    // const light = this.lights.addPointLight(x, y, 0x00ff00, 40, 0.4);
    // pickup.setData('light', light);
    // Add logic to update light position or destroy it when pickup is collected

    return pickup;
  }

  dropRandomUpgrade(x, y) {
    // Available upgrades to drop (expand this list)
    const upgradeOptions = [
      { key: "hp", icon: "hp_icon", desc: "Max Health +2" },
      { key: "damage", icon: "damage_icon", desc: "Damage x1.3" },
      { key: "speed", icon: "speed_icon", desc: "Speed +20" },
      { key: "doubleShot", icon: "doubleshot_icon", desc: "Double Shot" },
      { key: "splitShot", icon: "splitshot_icon", desc: "Split Shot +1" },
      { key: "dodge", icon: "dodge_icon", desc: "Dodge Charge +1" },
      { key: "crit", icon: "crit_icon", desc: "Crit Chance +5%" },
      { key: "bomb", icon: "bomb_icon", desc: "Bomb Shot +10%" },
      { key: "shield", icon: "shield_icon", desc: "Energy Shield" },
    ];

    // Filter out upgrades the player can no longer benefit from (e.g., max dodge, already has shield)
    const possibleUpgrades = upgradeOptions.filter(upg => {
      if (upg.key === 'dodge' && this.getTotalDodgeCharges() >= this.maxDodgeCharges) return false;
      if (upg.key === 'shield' && this.shieldEnabled) return false; // Only offer shield once
      // Add other limits if needed (e.g., max crit chance?)
      return true;
    });

    // If no valid upgrades can be dropped, maybe drop coins instead?
    if (possibleUpgrades.length === 0) {
      console.log("No valid upgrades to drop, dropping coins instead.");
      this.coins += 20; // Drop a decent amount of coins
      this.coinsText.setText(`Coins: ${this.coins}`);
      this.showTempMessage("Maxed Upgrades! +20 Coins");
      this.createSparkleEffect(x, y); // Still show sparkles
      return;
    }


    const chosenUpgrade = Phaser.Utils.Array.GetRandom(possibleUpgrades);

    // --- Create Sparkle Effect ---
    this.createSparkleEffect(x, y);

    // --- Create Pickup Item ---
    const pickup = this.pickups.create(x, y, chosenUpgrade.icon);
    if (!pickup) return;

    pickup.upgradeType = chosenUpgrade.key; // Assign the internal key
    pickup.description = chosenUpgrade.desc; // Store description for potential display
    pickup.setScale(1.2); // Make upgrades slightly larger
    pickup.setDepth(5); // Render above ground

    // Add tweens for visual appeal
    this.tweens.add({
      targets: pickup,
      scale: 1.4, // Pulse size
      yoyo: true,
      repeat: -1,
      duration: 600,
      ease: 'Sine.easeInOut'
    });
    this.tweens.add({
      targets: pickup,
      y: pickup.y - 10, // Bob up and down
      yoyo: true,
      repeat: -1,
      duration: 1100,
      ease: 'Sine.easeInOut'
    });
  }

  createSparkleEffect(x, y) {
    const count = 4;
    const spread = 40;
    const duration = 600;

    for (let i = 0; i < count; i++) {
      const sparkle = this.add.image(x, y, 'gold_sparkles')
        .setScale(0.1) // Start small
        .setAlpha(0.8)
        .setDepth(6); // Above pickups

      const angle = Math.random() * Math.PI * 2;
      const targetX = x + Math.cos(angle) * spread;
      const targetY = y + Math.sin(angle) * spread;

      this.tweens.add({
        targets: sparkle,
        x: targetX,
        y: targetY,
        scale: 0.6, // Grow
        alpha: 0, // Fade out
        duration: duration,
        ease: 'Quad.easeOut',
        onComplete: () => {
          sparkle.destroy();
        }
      });
    }
  }


  onPickup(player, pickup) {
    if (!pickup.active || !player.active) return;

    let message = "";
    let playUpgradeSound = true;

    switch (pickup.upgradeType) {
      // --- Stat Upgrades ---
      case "hp":
        this.player.maxHealth += 2;
        this.player.health = Math.min(this.player.health + 2, this.player.maxHealth); // Heal as well
        this.upgrades.hp++;
        this.updateHearts();
        message = "Max Health +2!";
        break;
      case "damage":
        this.damageMultiplier += 0.3;
        this.upgrades.damage++;
        message = "Damage Up!";
        break;
      case "speed":
        this.playerSpeed += 20;
        this.upgrades.speed++;
        message = "Speed Up!";
        break;

      // --- Weapon Upgrades ---
      case "doubleShot":
        this.upgrades.doubleShot++;
        message = "Double Shot!";
        break;
      case "splitShot":
        this.upgrades.splitShot++;
        message = "Split Shot!";
        break;

      // --- Utility Upgrades ---
      case "dodge":
        if (this.getTotalDodgeCharges() < this.maxDodgeCharges) {
          this.upgrades.dodge++; // Increment upgrade count
          this.dodgeCount++; // Immediately add the charge
          this.dodgeCooldowns.push(null); // Add a slot for the new charge
          message = "Extra Dodge Charge!";
        } else {
          // Give coins if already maxed
          this.coins += 10;
          this.coinsText.setText(`Coins: ${this.coins}`);
          message = "Max Dodges! +10 Coins";
          playUpgradeSound = false; // Maybe play coin sound instead?
        }
        break;
      case "crit":
        this.critChance = Math.min(this.critChance + 0.05, 0.5); // Add 5% crit, max 50%?
        this.upgrades.crit++;
        message = `Crit Chance +5% (${Math.round(this.critChance * 100)}% total)`;
        break;
      case "bomb":
        this.bombShotChance = Math.min(this.bombShotChance + 0.10, 0.5); // Add 10% bomb, max 50%?
        this.upgrades.bomb++;
        message = `Bomb Shot +10% (${Math.round(this.bombShotChance * 100)}% total)`;
        break;
      case "shield":
        if (!this.shieldEnabled) {
          this.shieldEnabled = true;
          this.shieldActive = true; // Shield starts ready
          this.upgrades.shield++;
          message = "Energy Shield Acquired!";
          if (this.shieldSprite) this.shieldSprite.setVisible(true); // Show shield visual
        } else {
          // Should not happen if drop logic is correct, but handle anyway
          this.coins += 15;
          this.coinsText.setText(`Coins: ${this.coins}`);
          message = "Already Have Shield! +15 Coins";
          playUpgradeSound = false;
        }
        break;

      // --- Consumables ---
      case "health_small":
        const healthBefore = this.player.health;
        this.player.health = Math.min(this.player.maxHealth, this.player.health + (pickup.healAmount || 2));
        const healthGained = this.player.health - healthBefore;
        if (healthGained > 0) {
          this.updateHearts();
          message = `Healed ${healthGained} health!`;
          this.sounds.powerup.play(); // Use powerup sound for heal
          playUpgradeSound = false;
        } else {
          message = "Already at full health!";
          playUpgradeSound = false; // Don't play upgrade sound if no health gained
        }
        break;

      default:
        console.warn("Unknown pickup type:", pickup.upgradeType);
        playUpgradeSound = false;
        break;
    }

    // Play sound and show message
    if (playUpgradeSound) {
      this.sounds.upgrade.play();
    }
    if (message) {
      this.showTempMessage(message);
    }

    // Update UI icons and destroy pickup
    this.updatePowerupIcons();
    // Destroy associated light if it exists
    // const light = pickup.getData('light');
    // if (light) light.destroy();
    pickup.destroy();
  }


  // --- Room and World Generation ---

  generateWorldMap() {
    this.roomMap = {};
    // this.visitedRooms = {}; // Don't reset visited on world change, only on full reset
    // this.clearedRooms = new Set(); // Reset cleared rooms for the new world
    this.miniBossSpawned[`world_${this.currentWorld}`] = false; // Reset miniboss status for the new world

    const worldSize = 5 + this.currentWorld; // Increase size slightly per world
    const maxDepth = Math.floor(worldSize * 1.2); // Max path length from start
    const minRooms = worldSize;

    // Start room
    this.roomMap["0,0"] = { type: "start", doors: {}, depth: 0, variation: 0 };
    let queue = [{ x: 0, y: 0, depth: 0 }];
    let createdRooms = { "0,0": true };
    let roomCount = 1;
    let head = 0;
    let bossRoomKey = null;
    let potentialBossDepths = [];

    // Breadth-first or Depth-first generation
    while (head < queue.length && roomCount < worldSize * 2) { // Limit total rooms
      const current = queue[head++];
      const currentKey = `${current.x},${current.y}`;

      // Store potential boss locations (deeper rooms)
      if (current.depth >= Math.floor(maxDepth * 0.6)) {
        potentialBossDepths.push(currentKey);
      }

      // Try adding neighbors
      const directions = Phaser.Utils.Array.Shuffle([
        { dx: 0, dy: -1, dir: "up", opp: "down" }, { dx: 1, dy: 0, dir: "right", opp: "left" },
        { dx: 0, dy: 1, dir: "down", opp: "up" }, { dx: -1, dy: 0, dir: "left", opp: "right" },
      ]);

      let neighborsAdded = 0;
      const maxNeighbors = (current.depth < 2) ? 3 : 2; // More branching near start

      for (const move of directions) {
        if (neighborsAdded >= maxNeighbors && currentKey !== "0,0") break; // Limit branching

        const nextX = current.x + move.dx;
        const nextY = current.y + move.dy;
        const nextKey = `${nextX},${nextY}`;
        const nextDepth = current.depth + 1;

        // Check bounds and existing rooms
        if (Math.abs(nextX) > worldSize || Math.abs(nextY) > worldSize || createdRooms[nextKey] || nextDepth > maxDepth) {
          continue;
        }

        // Random chance to skip creating a room to make less dense maps
        if (Math.random() < 0.25 && currentKey !== "0,0") {
          continue;
        }

        // Create new room
        this.roomMap[nextKey] = {
          type: "normal", // Default type
          doors: {},
          depth: nextDepth,
          variation: Phaser.Math.Between(0, 3) // More layout variations
        };
        this.roomMap[currentKey].doors[move.dir] = nextKey;
        this.roomMap[nextKey].doors[move.opp] = currentKey;

        createdRooms[nextKey] = true;
        queue.push({ x: nextX, y: nextY, depth: nextDepth });
        roomCount++;
        neighborsAdded++;
      }
    }

    // --- Place Boss Room ---
    // Try placing at the deepest point or a random deep room
    let deepestRoomKey = "0,0";
    let maxD = 0;
    queue.forEach(r => {
      if (r.depth > maxD) {
        maxD = r.depth;
        deepestRoomKey = `${r.x},${r.y}`;
      }
    });

    if (deepestRoomKey !== "0,0" && Object.keys(this.roomMap[deepestRoomKey].doors).length === 1) { // Prefer dead ends
      bossRoomKey = deepestRoomKey;
    } else if (potentialBossDepths.length > 0) {
      // Try finding a dead end among potential boss rooms
      const deadEndBossOptions = potentialBossDepths.filter(key => key !== "0,0" && Object.keys(this.roomMap[key].doors).length === 1);
      if (deadEndBossOptions.length > 0) {
        bossRoomKey = Phaser.Utils.Array.GetRandom(deadEndBossOptions);
      } else {
        bossRoomKey = Phaser.Utils.Array.GetRandom(potentialBossDepths.filter(k => k !== "0,0"));
      }
    }

    // Fallback if no suitable boss room found yet
    if (!bossRoomKey && roomCount > 1) {
      const possibleKeys = Object.keys(this.roomMap).filter(k => k !== "0,0");
      bossRoomKey = Phaser.Utils.Array.GetRandom(possibleKeys);
    }

    if (bossRoomKey) {
      this.roomMap[bossRoomKey].type = "boss";
    } else {
      // Handle edge case: only start room exists
      console.warn("Could not place boss room!");
      // Force a boss room if needed, e.g., adjacent to start
      if (roomCount === 1) {
        this.roomMap["1,0"] = { type: "boss", doors: { "left": "0,0" }, depth: 1, variation: 0 };
        this.roomMap["0,0"].doors["right"] = "1,0";
        bossRoomKey = "1,0";
        roomCount++;
      }
    }


    // --- Place Shop Room ---
    const shopCandidates = Object.keys(this.roomMap).filter(key =>
      key !== "0,0" && key !== bossRoomKey && this.roomMap[key].type === 'normal' && this.roomMap[key].depth > 1
    );
    if (shopCandidates.length > 0) {
      const shopKey = Phaser.Utils.Array.GetRandom(shopCandidates);
      this.roomMap[shopKey].type = "shop";
    } else {
      console.warn("Could not place shop room!");
    }

    // --- Place Mini-Boss Room ---
    if (this.currentWorld > 1 && this.currentWorld < this.maxWorlds) { // No miniboss in world 1 or final world?
      const miniBossCandidates = Object.keys(this.roomMap).filter(key =>
        key !== "0,0" && key !== bossRoomKey && this.roomMap[key].type === 'normal' &&
        this.roomMap[key].depth >= Math.floor(maxDepth * 0.4) // Place somewhat deep
        // Optional: Prefer dead ends? && Object.keys(this.roomMap[key].doors).length === 1
      );
      if (miniBossCandidates.length > 0) {
        const miniBossKey = Phaser.Utils.Array.GetRandom(miniBossCandidates);
        this.roomMap[miniBossKey].type = "miniboss";
      } else {
        console.warn("Could not place mini-boss room!");
      }
    }


    console.log(`World ${this.currentWorld} Map Generated: ${roomCount} rooms.`);
    // console.log(this.roomMap); // For debugging map structure
  }


  loadRoom(x, y, entryDirection = null) {
    console.log(`Loading room: ${x},${y} from ${entryDirection || 'start'}`);
    if (this.inTransition) return; // Prevent loading during transition

    // --- Cleanup Previous Room ---
    // Destroy shop UI elements if they exist
    if (this.shopInstance) {
      this.shopInstance.destroy();
      this.shopInstance = null;
    }
    // Clear physics groups and game objects
    this.enemies.getChildren().forEach(e => { if (e.getData('shadow')) e.getData('shadow').destroy(); }); // Remove bee shadows
    this.enemies.clear(true, true);
    this.enemyProj.clear(true, true);
    this.innerWalls.clear(true, true);
    this.walls.clear(true, true);
    this.doors.clear(true, true);
    this.projectiles.clear(true, true);
    this.pickups.clear(true, true);
    this.portals.clear(true, true); // Clear any existing portals
    // Clear pathfinding data for the room
    this.enemyPathData.clear();
    // Clear active colliders
    this.colliders.forEach(c => { if (c && c.active) c.destroy(); });
    this.colliders = [];
    // Hide prompts
    this.doorPrompt.setVisible(false);
    this.shopPrompt.setVisible(false);
    // Clear boss UI if any
    if (this.bossHealthBar) this.bossHealthBar.destroy();
    if (this.bossHealthBarBg) this.bossHealthBarBg.destroy();
    if (this.bossNameText) this.bossNameText.destroy();
    this.bossHealthBar = null; this.bossHealthBarBg = null; this.bossNameText = null;

    // --- Load New Room ---
    this.currentRoom = { x, y };
    this.entryDoorDirection = entryDirection;
    const roomKey = `${x},${y}`;

    if (!this.roomMap[roomKey]) {
      console.error(`Room ${roomKey} not found in map! Returning to start.`);
      this.loadRoom(0, 0); // Load start room as fallback
      return;
    }

    const currentRoomData = this.roomMap[roomKey];
    this.visitedRooms[roomKey] = true; // Mark as visited for minimap
    const isCleared = this.clearedRooms.has(roomKey);

    // Determine if the room should start active (combat)
    this.roomActive = (currentRoomData.type === 'normal' || currentRoomData.type === 'boss' || currentRoomData.type === 'miniboss') && !isCleared;
    this.portalActive = false; // Reset portal status

    // --- Create Room Layout ---
    this.createRoomLayout(roomKey, currentRoomData); // Walls, background

    // --- Populate Room Based on Type ---
    switch (currentRoomData.type) {
      case "shop":
        this.createShopRoom();
        this.roomActive = false; // Shops are always inactive
        break;
      case "boss":
        if (!isCleared) this.createBossRoom();
        else this.createPortal(); // Spawn portal if boss room is already cleared
        break;
      case "miniboss":
        if (!isCleared) this.createMiniBossRoom();
        // No portal in miniboss room, just becomes a normal cleared room
        break;
      case "normal":
        if (!isCleared) this.createNormalRoom();
        break;
      case "start":
        this.roomActive = false; // Start room is always inactive
        break;
      default:
        console.warn(`Unknown room type: ${currentRoomData.type}`);
        this.roomActive = false;
    }

    // --- Create Doors ---
    this.createDoors(currentRoomData); // Create doors based on map connections and room state

    // --- Finalize Setup ---
    this.setupPathfindingGrid(); // Setup grid based on new walls/doors
    this.setupColliders(); // Setup physics interactions for the new layout
    this.updateMinimap(); // Redraw minimap
    this.updateHearts(); // Ensure hearts are correct

    // Reset transition flag AFTER setup is complete
    this.inTransition = false;
    console.log(`Room ${roomKey} loaded. Active: ${this.roomActive}`);
  }

  createRoomLayout(key, roomData) {
    // Background
    if (this.background) this.background.destroy();
    this.background = this.add.image(400, 300, "bg").setDepth(-10);
    this.background.setScale(Math.max(this.sys.game.config.width / this.background.width, this.sys.game.config.height / this.background.height));

    // Outer Walls
    const { x1, y1, x2, y2 } = this.playArea;
    const wallTexture = `wall${Phaser.Math.Clamp(this.currentWorld, 1, 5)}`; // Use world-specific wall texture (up to wall5)
    const wallThickness = 32; // Visual thickness

    // Create walls using texture, set display size, and refresh body for physics
    this.walls.create(400, y1 - wallThickness / 2, wallTexture).setOrigin(0.5).setDisplaySize(x2 - x1 + wallThickness * 2, wallThickness).refreshBody(); // Top
    this.walls.create(400, y2 + wallThickness / 2, wallTexture).setOrigin(0.5).setDisplaySize(x2 - x1 + wallThickness * 2, wallThickness).refreshBody(); // Bottom
    this.walls.create(x1 - wallThickness / 2, 300, wallTexture).setOrigin(0.5).setDisplaySize(wallThickness, y2 - y1 + wallThickness * 2).refreshBody(); // Left
    this.walls.create(x2 + wallThickness / 2, 300, wallTexture).setOrigin(0.5).setDisplaySize(wallThickness, y2 - y1 + wallThickness * 2).refreshBody(); // Right

    // Inner Walls based on variation
    const variation = roomData.variation;
    const innerWallSize = 64;
    switch (variation) {
      case 1: // Central cross
        this.innerWalls.create(400, 300, wallTexture).setOrigin(0.5).setDisplaySize(innerWallSize * 4, innerWallSize * 0.5).refreshBody();
        this.innerWalls.create(400, 300, wallTexture).setOrigin(0.5).setDisplaySize(innerWallSize * 0.5, innerWallSize * 4).refreshBody();
        break;
      case 2: // Four corner blocks
        this.innerWalls.create(x1 + innerWallSize * 1.5, y1 + innerWallSize * 1.5, wallTexture).setOrigin(0.5).setDisplaySize(innerWallSize, innerWallSize).refreshBody();
        this.innerWalls.create(x2 - innerWallSize * 1.5, y1 + innerWallSize * 1.5, wallTexture).setOrigin(0.5).setDisplaySize(innerWallSize, innerWallSize).refreshBody();
        this.innerWalls.create(x1 + innerWallSize * 1.5, y2 - innerWallSize * 1.5, wallTexture).setOrigin(0.5).setDisplaySize(innerWallSize, innerWallSize).refreshBody();
        this.innerWalls.create(x2 - innerWallSize * 1.5, y2 - innerWallSize * 1.5, wallTexture).setOrigin(0.5).setDisplaySize(innerWallSize, innerWallSize).refreshBody();
        break;
      case 3: // Two horizontal barriers
        this.innerWalls.create(400, y1 + innerWallSize * 2, wallTexture).setOrigin(0.5).setDisplaySize(innerWallSize * 6, innerWallSize * 0.5).refreshBody();
        this.innerWalls.create(400, y2 - innerWallSize * 2, wallTexture).setOrigin(0.5).setDisplaySize(innerWallSize * 6, innerWallSize * 0.5).refreshBody();
        break;
      case 0: // Start room, Shop, Boss room - often empty or specific layout
      default: // Empty room
        // No inner walls
        break;
    }
  }

  createDoors(roomData) {
    const { x1, y1, x2, y2 } = this.playArea;
    const doorData = roomData.doors;
    const doorSize = 48;
    const doorVisualOffset = 5; // How far inside the play area the door visually sits

    Object.entries(doorData).forEach(([direction, targetRoomKey]) => {
      let doorX = 400, doorY = 300;
      let doorTexture = this.roomActive ? "door_closed" : "door"; // Closed if room has enemies

      // Position doors slightly inside the play area boundaries
      switch (direction) {
        case 'up': doorY = y1 + doorVisualOffset; doorX = 400; break;
        case 'down': doorY = y2 - doorVisualOffset; doorX = 400; break;
        case 'left': doorX = x1 + doorVisualOffset; doorY = 300; break;
        case 'right': doorX = x2 - doorVisualOffset; doorY = 300; break;
      }

      const door = this.doors.create(doorX, doorY, doorTexture)
        .setDepth(1) // Render above background but below player/enemies
        .setImmovable(true); // Doors don't get pushed

      door.body.setSize(doorSize * 0.7, doorSize * 0.7); // Smaller physics body
      door.setDisplaySize(doorSize, doorSize); // Visual size
      door.direction = direction; // Store direction for transition logic
      door.targetRoom = targetRoomKey; // Store target room key ("x,y")
      door.isOpen = !this.roomActive; // Door starts open if room is not active
      door.collider = null; // Placeholder for the physics collider if closed

      // Make door interactive for potential click/tap interaction (optional)
      // door.setInteractive();
      // door.on('pointerdown', () => this.tryEnterDoor(door));
    });
  }

  openDoor(door) {
    if (door && !door.isOpen) {
      door.setTexture("door"); // Change visual to open door
      door.isOpen = true;
      // Remove the collider associated with this door
      if (door.collider) {
        if (door.collider.active && this.physics.world.colliders.getActive().includes(door.collider)) {
          door.collider.destroy(); // Remove from physics system
        }
        const index = this.colliders.indexOf(door.collider);
        if (index > -1) {
          this.colliders.splice(index, 1); // Remove from our tracked list
        }
        door.collider = null; // Clear reference
      }
    }
  }

  openAllDoors() {
    this.doors.getChildren().forEach(door => {
      this.openDoor(door);
    });
    // Recalculate pathfinding grid after opening doors
    this.setupPathfindingGrid();
  }

  createNormalRoom() {
    const potentialEnemies = this.worldEnemies[this.currentWorld] || ["blob"]; // Fallback to blobs
    const enemyCount = Phaser.Math.Between(3, 5 + Math.floor(this.currentWorld / 2)); // Scale enemy count slightly
    const { x1, y1, x2, y2 } = this.playArea;
    const safeSpawnDistSq = 180 * 180; // Don't spawn too close to player start

    // Determine player starting position based on entry door
    let playerStartX = 400, playerStartY = 300;
    if (this.entryDoorDirection) {
      const entryOffset = 60;
      switch (this.entryDoorDirection) {
        case 'up': playerStartY = y1 + entryOffset; break;
        case 'down': playerStartY = y2 - entryOffset; break;
        case 'left': playerStartX = x1 + entryOffset; break;
        case 'right': playerStartX = x2 - entryOffset; break;
      }
    }

    for (let i = 0; i < enemyCount; i++) {
      const enemyType = Phaser.Utils.Array.GetRandom(potentialEnemies);
      let spawnX, spawnY, distSqFromPlayerStart;
      let attempts = 0;
      const maxAttempts = 20;

      // Try to find a valid spawn position away from the player's entry point
      do {
        spawnX = Phaser.Math.Between(this.playArea.x1 + 40, this.playArea.x2 - 40);
        spawnY = Phaser.Math.Between(this.playArea.y1 + 40, this.playArea.y2 - 40);
        distSqFromPlayerStart = Phaser.Math.Distance.Squared(spawnX, spawnY, playerStartX, playerStartY);
        attempts++;
      } while (distSqFromPlayerStart < safeSpawnDistSq && attempts < maxAttempts && !this.isNearWall(spawnX, spawnY)); // Also check proximity to walls

      if (attempts >= maxAttempts) {
        console.warn("Could not find ideal spawn position for enemy, placing randomly.");
        // Fallback: place randomly but ensure it's walkable
        do {
          spawnX = Phaser.Math.Between(this.playArea.x1 + 40, this.playArea.x2 - 40);
          spawnY = Phaser.Math.Between(this.playArea.y1 + 40, this.playArea.y2 - 40);
        } while (!this.isWalkableAt(spawnX, spawnY)); // Ensure it's not inside a wall
      }

      this.createEnemy(spawnX, spawnY, enemyType);
    }
    this.roomActive = true; // Set room to active combat state
  }

  isNearWall(x, y, checkRadius = 32) {
    // Check if the position is too close to any inner walls
    let near = false;
    this.innerWalls.getChildren().forEach(wall => {
      if (Phaser.Math.Distance.Between(x, y, wall.x, wall.y) < checkRadius + wall.displayWidth / 2) {
        near = true;
      }
    });
    return near;
  }


  createMiniBossRoom() {
    console.log("Creating Mini-Boss Room");
    const { x1, y1, x2, y2 } = this.playArea;
    // Spawn the miniboss near the center, or opposite the entry door
    let spawnX = 400, spawnY = 300;
    if (this.entryDoorDirection) {
      const offset = 150;
      switch (this.entryDoorDirection) {
        case 'up': spawnY = y2 - offset; break;
        case 'down': spawnY = y1 + offset; break;
        case 'left': spawnX = x2 - offset; break;
        case 'right': spawnX = x1 + offset; break;
        default: spawnX = 400; spawnY = 200; // Default if no direction
      }
    } else {
      spawnX = 400; spawnY = 200; // Default spawn position if entering fresh
    }


    const miniboss = this.createEnemy(spawnX, spawnY, 'miniboss');
    if (miniboss) {
      miniboss.setScale(1.5); // Make miniboss slightly larger
      this.createBossHealthBar(miniboss, `Mini-Boss ${this.currentWorld}`); // Use boss health bar
      miniboss.updateHealthBar = () => this.updateBossHealthBar(miniboss); // Assign update function
    } else {
      console.error("Failed to create miniboss!");
    }
    this.roomActive = true;
  }

  createBossRoom() {
    console.log("Creating Boss Room for World:", this.currentWorld);
    // --- Boss Stats Lookup Table ---
    // Define stats per world boss
    const bossStats = {
      1: { key: 'boss1', name: 'Gore Golem', h: 200, sp: 80, p: ['circle', 'targeted'], aD: 2500, pS: 150, score: 500 },
      2: { key: 'boss2', name: 'Charging Chieftain', h: 250, sp: 90, p: ['charge', 'spread'], aD: 3000, pS: 180, cPT: 1000, cD: 600, cS: 300, score: 750 },
      3: { key: 'boss3', name: 'Summoning Sorcerer', h: 300, sp: 100, p: ['split', 'wave', 'summon_blob'], aD: 2800, pS: 200, sD: 800, score: 1000 },
      4: { key: 'boss4', name: 'Spiral Sentinel', h: 350, sp: 110, p: ['spiral', 'charge', 'targeted_fast'], aD: 2000, pS: 220, sC: 5, cPT: 800, cD: 500, cS: 350, score: 1250 },
      5: { key: 'boss5', name: 'Wave Weaver', h: 400, sp: 120, p: ['waves', 'split', 'summon_bee'], aD: 2600, pS: 240, wC: 5, wS: Math.PI / 3, sD: 700, score: 1500 },
      6: { key: 'boss', name: 'The Forsaken One', h: 500, sp: 100, p: ['combo', 'charge', 'summon_wizard', 'spiral_fast'], aD: 2400, pS: 210, cPT: 900, cD: 550, cS: 320, sC: 7, score: 2500 }
    };

    const config = bossStats[this.currentWorld] || bossStats[1]; // Default to world 1 boss if invalid world

    // --- Spawn Boss ---
    const boss = this.enemies.create(400, 180, config.key); // Spawn towards top center
    if (!boss || !boss.body) {
      console.error("Failed to create boss!");
      return;
    }

    // --- Apply Stats & Config ---
    boss.setScale(2); // Bosses are larger
    boss.health = this.hardMode ? Math.ceil(config.h * 1.5) : config.h;
    boss.maxHealth = boss.health;
    boss.speed = config.sp;
    boss.type = 'boss';
    boss.attackDelay = config.aD;
    boss.projectileSpeed = config.pS;
    boss.lastAttackTime = this.time.now + 2500; // Initial delay before first attack
    boss.attackPhase = 0; // Used for patterns like spiral
    boss.scoreValue = config.score;

    // Charge parameters
    boss.chargePrepareTime = config.cPT;
    boss.chargeDuration = config.cD;
    boss.chargeSpeed = config.cS;
    boss.isPreparingCharge = false;
    boss.isCharging = false;

    // Pattern-specific parameters
    boss.splitDelay = config.sD;
    boss.spiralCount = config.sC;
    boss.waveCount = config.wC;
    boss.waveSpread = config.wS;

    // --- Physics & ID ---
    boss.setCollideWorldBounds(true);
    boss.body.onWorldBounds = true;
    boss.setImmovable(true); // Boss cannot be pushed
    boss.body.setSize(boss.width * 0.7, boss.height * 0.7); // Adjust hitbox
    boss.setOrigin(0.5, 0.5);
    boss.id = Phaser.Utils.String.UUID();

    // --- Attack Logic ---
    // Map pattern names to functions
    boss.attackFunctions = {
      'circle': this.bossAttack_CircleShot, 'targeted': this.bossAttack_SingleTargeted,
      'targeted_fast': this.bossAttack_SingleTargetedFast, 'charge': this.bossAttack_Charge,
      'spread': this.bossAttack_ShotgunSpread, 'split': this.bossAttack_SplitShot,
      'wave': this.bossAttack_WaveShot, 'waves': this.bossAttack_MultiWaveShot, // Added 'waves' alias/function
      'spiral': this.bossAttack_SpiralShot, 'spiral_fast': this.bossAttack_SpiralShotFast,
      'summon_blob': (b, t) => this.bossAttack_SummonMinions(b, t, 'blob', 2),
      'summon_bee': (b, t) => this.bossAttack_SummonMinions(b, t, 'bee', 3),
      'summon_wizard': (b, t) => this.bossAttack_SummonMinions(b, t, 'wizard', 1),
      'combo': this.bossAttack_Combo
    };
    boss.availablePatterns = config.p || ['circle']; // Get patterns from config
    boss.currentAttackIndex = Phaser.Math.Between(0, boss.availablePatterns.length - 1); // Start with random pattern

    // --- Invulnerability ---
    boss.isInvulnerable = true; // Start invulnerable
    this.time.delayedCall(boss.lastAttackTime - this.time.now - 500, () => { // Become vulnerable shortly before first attack
      if (boss.active) boss.isInvulnerable = false;
      console.log("Boss vulnerable!");
    });


    // --- Boss Update Function ---
    boss.updateAttack = (time) => {
      if (!boss.active || !this.player.active) return;
      if (boss.isInvulnerable) return; // Don't attack if invulnerable (e.g., during phase change?)

      // Handle charging state separately
      if (boss.isCharging || boss.isPreparingCharge) {
        this.processChargingState(boss, time);
        return; // Don't execute other attacks while charging
      }

      // Check if ready for next attack
      if (time < boss.lastAttackTime + boss.attackDelay) return;

      // Select and execute attack pattern
      const patternName = boss.availablePatterns[boss.currentAttackIndex % boss.availablePatterns.length];
      const attackFunc = boss.attackFunctions[patternName];

      if (attackFunc) {
        attackFunc.call(this, boss, time); // Execute attack
      } else {
        console.warn(`Boss attack pattern ${patternName} not found! Defaulting.`);
        this.bossAttack_CircleShot(boss, time); // Default attack
      }

      // Move to next attack pattern and reset timer
      boss.currentAttackIndex++; // Simple rotation, could be random: Phaser.Math.Between(...)
      boss.lastAttackTime = time;
    };

    // --- Boss Health Bar ---
    this.createBossHealthBar(boss, config.name || `Boss ${this.currentWorld}`);
    // Assign the update function to the boss object itself
    boss.updateHealthBar = () => this.updateBossHealthBar(boss);


    this.roomActive = true; // Set room to active combat state
  }

  // --- Boss Attack Pattern Functions ---
  // (These functions are called with 'this' bound to the MainGameScene instance)

  bossAttack_CircleShot(boss, time) {
    const count = 8; // Number of projectiles
    const speed = boss.projectileSpeed * 0.9;
    const damage = boss.damage || 1;
    this.shake(0.005, 150);
    for (let i = 0; i < count; i++) {
      const angle = (i / count) * Math.PI * 2 + boss.attackPhase; // Use attackPhase for rotation
      const vx = Math.cos(angle) * speed;
      const vy = Math.sin(angle) * speed;
      this.createBossProjectile(boss.x, boss.y, vx, vy, 'boss_projectile', 1.2, damage);
    }
    boss.attackPhase += Math.PI / 16; // Rotate pattern slightly each time
  }

  bossAttack_SingleTargeted(boss, time) {
    const speed = boss.projectileSpeed * 1.1;
    const damage = (boss.damage || 1) * 1.2;
    this.shake(0.004, 100);
    if (this.player.active) {
      const angle = Phaser.Math.Angle.Between(boss.x, boss.y, this.player.x, this.player.y);
      const vx = Math.cos(angle) * speed;
      const vy = Math.sin(angle) * speed;
      this.createBossProjectile(boss.x, boss.y, vx, vy, 'boss_projectile', 1.3, damage);
    }
  }

  bossAttack_SingleTargetedFast(boss, time) {
    const speed = boss.projectileSpeed * 1.4;
    const damage = (boss.damage || 1) * 1.1;
    this.shake(0.004, 80);
    if (this.player.active) {
      const angle = Phaser.Math.Angle.Between(boss.x, boss.y, this.player.x, this.player.y);
      const vx = Math.cos(angle) * speed;
      const vy = Math.sin(angle) * speed;
      this.createBossProjectile(boss.x, boss.y, vx, vy, 'boss_projectile', 1.1, damage);
    }
  }

  bossAttack_Charge(boss, time) {
    // Initiate the charge sequence (actual movement handled by processChargingState)
    if (!boss.isCharging && !boss.isPreparingCharge) {
      boss.isPreparingCharge = true;
      boss.chargeStartTime = time;
      boss.setVelocity(0, 0); // Stop moving during preparation
      boss.setTint(0xffa500); // Telegraph color (orange)
      this.shake(0.008, boss.chargePrepareTime || 1000); // Shake during prep
    }
  }

  bossAttack_ShotgunSpread(boss, time) {
    const count = 5; // Number of projectiles
    const spreadAngle = Math.PI / 10; // Angle between projectiles
    const speed = boss.projectileSpeed * 0.9;
    const damage = boss.damage || 1;
    this.shake(0.006, 200);
    if (this.player.active) {
      const baseAngle = Phaser.Math.Angle.Between(boss.x, boss.y, this.player.x, this.player.y);
      for (let i = 0; i < count; i++) {
        // Calculate angle for each projectile relative to the center
        const angle = baseAngle + (i - (count - 1) / 2) * spreadAngle;
        const vx = Math.cos(angle) * speed;
        const vy = Math.sin(angle) * speed;
        this.createBossProjectile(boss.x, boss.y, vx, vy, 'boss_projectile', 1.0, damage);
      }
    }
  }

  bossAttack_SplitShot(boss, time) {
    const initialAngles = [0, Math.PI / 2, Math.PI, (3 * Math.PI) / 2]; // Four directions
    const splitDelay = boss.splitDelay || 800; // Delay before splitting
    const splitCount = 3; // Number of projectiles after split
    const splitSpread = Math.PI / 8; // Angle between split projectiles
    const speed = boss.projectileSpeed;
    const splitSpeed = speed * 0.7;
    const damage = boss.damage || 1;
    this.shake(0.007, 250);

    initialAngles.forEach(angle => {
      const vx = Math.cos(angle) * speed;
      const vy = Math.sin(angle) * speed;
      const initialProj = this.createBossProjectile(boss.x, boss.y, vx, vy, 'boss_projectile', 1.4, damage);

      if (initialProj) {
        // Schedule the split
        this.time.delayedCall(splitDelay, () => {
          if (initialProj.active) { // Check if the initial projectile still exists
            const splitX = initialProj.x;
            const splitY = initialProj.y;
            const baseSplitAngle = angle; // Split relative to initial direction

            for (let i = 0; i < splitCount; i++) {
              const currentSplitAngle = baseSplitAngle + (i - (splitCount - 1) / 2) * splitSpread;
              const splitVx = Math.cos(currentSplitAngle) * splitSpeed;
              const splitVy = Math.sin(currentSplitAngle) * splitSpeed;
              this.createBossProjectile(splitX, splitY, splitVx, splitVy, 'boss_projectile', 0.9, damage * 0.8); // Smaller, slightly less damage
            }
            initialProj.destroy(); // Destroy the original projectile
          }
        });
      }
    });
  }

  bossAttack_WaveShot(boss, time) {
    // Fires a single wave aimed at the player
    const waveCount = boss.waveCount || 5; // Number of projectiles in the wave
    const waveSpread = boss.waveSpread || Math.PI / 4; // Total angle spread of the wave
    const speed = boss.projectileSpeed;
    const damage = boss.damage || 1;
    this.shake(0.006, 220);

    if (this.player.active) {
      const baseAngle = Phaser.Math.Angle.Between(boss.x, boss.y, this.player.x, this.player.y);
      for (let i = 0; i < waveCount; i++) {
        const angleOffset = (i - (waveCount - 1) / 2) * (waveSpread / Math.max(1, waveCount - 1)); // Calculate offset from center
        const angle = baseAngle + angleOffset;
        const vx = Math.cos(angle) * speed;
        const vy = Math.sin(angle) * speed;
        this.createBossProjectile(boss.x, boss.y, vx, vy, 'boss_projectile', 1.1, damage);
      }
    }
  }

  bossAttack_MultiWaveShot(boss, time) {
    // Fires multiple waves in sequence
    const numWaves = 3;
    const delayBetweenWaves = 200; // ms

    for (let i = 0; i < numWaves; i++) {
      this.time.delayedCall(i * delayBetweenWaves, () => {
        if (boss.active) { // Check if boss is still active
          this.bossAttack_WaveShot(boss, time); // Call the single wave function
        }
      });
    }
  }

  bossAttack_SpiralShot(boss, time) {
    const count = boss.spiralCount || 5; // Number of arms in the spiral
    const speed = boss.projectileSpeed;
    const damage = boss.damage || 1;
    this.shake(0.004, 180);
    for (let i = 0; i < count; i++) {
      const angle = boss.attackPhase + (i * Math.PI * 2 / count); // Calculate angle for each arm
      const vx = Math.cos(angle) * speed;
      const vy = Math.sin(angle) * speed;
      this.createBossProjectile(boss.x, boss.y, vx, vy, 'boss_projectile', 1.0, damage);
    }
    boss.attackPhase += Math.PI / 12; // Rotate the spiral
  }

  bossAttack_SpiralShotFast(boss, time) {
    const count = boss.spiralCount || 7;
    const speed = boss.projectileSpeed * 1.2;
    const damage = (boss.damage || 1) * 0.9; // Slightly less damage for faster spiral
    this.shake(0.005, 150);
    for (let i = 0; i < count; i++) {
      const angle = boss.attackPhase + (i * Math.PI * 2 / count);
      const vx = Math.cos(angle) * speed;
      const vy = Math.sin(angle) * speed;
      this.createBossProjectile(boss.x, boss.y, vx, vy, 'boss_projectile', 0.9, damage);
    }
    boss.attackPhase += Math.PI / 9; // Rotate faster
  }

  bossAttack_SummonMinions(boss, time, minionType, count) {
    this.shake(0.01, 300); // Bigger shake for summoning
    const summonDelay = 200; // Delay between each minion spawn

    for (let i = 0; i < count; i++) {
      this.time.delayedCall(i * summonDelay, () => {
        if (!boss.active) return; // Don't spawn if boss died

        // Spawn minions in an arc around the boss
        const angle = (Math.random() - 0.5) * Math.PI + (Math.random() > 0.5 ? 0 : Math.PI); // Random angle top/bottom half?
        const radius = 100 + Math.random() * 30;
        let spawnX = boss.x + Math.cos(angle) * radius;
        let spawnY = boss.y + Math.sin(angle) * radius;

        // Clamp spawn position within play area and ensure it's walkable
        let attempts = 0;
        while (attempts < 10 && (!this.isWalkableAt(spawnX, spawnY) || this.isNearWall(spawnX, spawnY))) {
          const newAngle = Math.random() * Math.PI * 2;
          const newRadius = 80 + Math.random() * 50;
          spawnX = boss.x + Math.cos(newAngle) * newRadius;
          spawnY = boss.y + Math.sin(newAngle) * newRadius;
          attempts++;
        }

        spawnX = Phaser.Math.Clamp(spawnX, this.playArea.x1 + 20, this.playArea.x2 - 20);
        spawnY = Phaser.Math.Clamp(spawnY, this.playArea.y1 + 20, this.playArea.y2 - 20);

        this.createEnemy(spawnX, spawnY, minionType);
        // Optional: Add a spawn visual effect at spawnX, spawnY
      });
    }
  }

  bossAttack_Combo(boss, time) {
    // Example combo: Circle shot followed quickly by targeted fast shot
    this.bossAttack_CircleShot(boss, time);
    this.time.delayedCall(400, () => {
      if (boss.active) { // Check boss still exists
        this.bossAttack_SingleTargetedFast(boss, time);
      }
    });
    // Could add more steps to the combo
  }

  onBossDefeated() {
    console.log(`Boss for world ${this.currentWorld} defeated!`);
    this.clearedRooms.add(`${this.currentRoom.x},${this.currentRoom.y}`);
    this.roomActive = false;
    this.sounds.upgrade.play({ volume: 0.7 }); // Play a triumphant sound

    // No automatic transition. Create the portal instead.
    this.createPortal();
  }

  createPortal() {
    if (this.portalActive) return; // Don't create multiple portals

    // Spawn portal in the center of the room (or boss defeat location)
    const portalX = 400;
    const portalY = 300;

    const portal = this.portals.create(portalX, portalY, 'portal')
      .setDepth(5) // Render above ground but potentially below player
      .setScale(1.5); // Adjust size

    // Play animation
    portal.play('portal_anim');
    this.portalActive = true;

    // Optional: Add visual effects like pulsing light
    // const portalLight = this.lights.addPointLight(portalX, portalY, 0xaa00ff, 150, 0.8);
    // this.tweens.add({ targets: portalLight, intensity: 1.2, duration: 1000, yoyo: true, repeat: -1 });
    // portal.setData('light', portalLight); // Store light reference

    console.log("Exit Portal Activated!");
  }

  onEnterPortal(player, portal) {
    if (!this.portalActive || this.inTransition) return; // Only interact if portal is active and not already transitioning

    this.inTransition = true; // Prevent multiple triggers
    this.portalActive = false; // Deactivate portal
    player.setVelocity(0, 0); // Stop player movement

    // Optional: Sound effect for entering portal
    // this.sounds.portalEnter.play();

    // Optional: Visual effect (fade player, portal effect)
    this.tweens.add({ targets: player, alpha: 0, duration: 300 });
    // if (portal.getData('light')) portal.getData('light').destroy(); // Remove light if exists
    this.tweens.add({ targets: portal, scale: 2.5, alpha: 0, duration: 400, onComplete: () => portal.destroy() });


    this.time.delayedCall(400, () => { // Wait for visual effects
      if (this.currentWorld < this.maxWorlds) {
        // Proceed to the next world
        this.currentWorld++;
        this.worldText.setText(`World: ${this.currentWorld}`);
        this.showTempMessage(`Entering World ${this.currentWorld}...`);
        this.generateWorldMap(); // Generate map for the new world
        this.entryDoorDirection = null; // Reset entry direction for new world start
        // Fade out and load the new starting room
        this.cameras.main.fade(300, 0, 0, 0, false, (cam, prog) => {
          if (prog === 1) {
            this.player.alpha = 1; // Restore player visibility
            this.loadRoom(0, 0); // Load start room of new world
            this.player.setPosition(400, 450); // Position player at bottom center for new world
            this.cameras.main.fadeIn(300, 0, 0, 0, (c, p) => {
              if (p === 1) this.inTransition = false; // Allow actions again
            });
          }
        });
      } else {
        // Game Victory
        this.cameras.main.fadeOut(1000, 0, 0, 0);
        this.time.delayedCall(1000, () => {
          this.add.text(400, 300, "Victory!\nYou have conquered The Forsaken Depths!", {
            font: "28px Arial", fill: "#00ff00", backgroundColor: "#000000",
            padding: { x: 20, y: 10 }, align: 'center', wordWrap: { width: 600 }
          }).setOrigin(0.5).setDepth(200).setScrollFactor(0);

          // Display final score and time on victory screen
          this.gameTime = this.time.now - this.gameStartTime;
          const minutes = Math.floor(this.gameTime / 60000);
          const seconds = Math.floor((this.gameTime % 60000) / 1000);
          const timeString = `${minutes}:${seconds.toString().padStart(2, '0')}`;
          this.add.text(400, 400, `Final Score: ${this.score}\nTime: ${timeString}`, {
            font: "20px Arial", fill: "#ffffff", align: 'center'
          }).setOrigin(0.5).setDepth(200).setScrollFactor(0);


          this.time.delayedCall(6000, () => {
            this.scene.start("TitleScene"); // Return to title after showing victory message
          });
        });
      }
    });
  }


  // --- Shop Functions ---

  createShopRoom() {
    console.log("Creating Shop Room");
    this.roomActive = false; // Ensure shop room is not active combat
    const worldKey = `world_${this.currentWorld}`;

    // --- Initialize Shop State for this World if it doesn't exist ---
    if (!this.shopInventory[worldKey]) {
      this.shopInventory[worldKey] = this.generateShopItems();
      this.shopPurchases[worldKey] = new Set(); // Initialize empty set for purchases
      this.shopRefreshCount[worldKey] = this.maxShopRefreshes; // Set initial refresh count
    }

    const currentInventory = this.shopInventory[worldKey];
    const currentPurchases = this.shopPurchases[worldKey];
    const remainingRefreshes = this.shopRefreshCount[worldKey];

    // --- Create Shop UI Container ---
    // Use a Phaser Container for easier management and destruction
    this.shopInstance = this.add.container(0, 0).setDepth(50);

    const shopTitle = this.add.text(400, 150, `World ${this.currentWorld} Shop`, {
      font: '28px Arial', fill: '#ffff00', stroke: '#000', strokeThickness: 4
    }).setOrigin(0.5);
    this.shopInstance.add(shopTitle);

    // --- Display Items ---
    const itemSlots = 3; // Number of items to display
    const startX = 250;
    const gapX = 150;
    const itemY = 300;
    const buttonYOffset = 85;
    const descYOffset = 115;

    for (let i = 0; i < Math.min(itemSlots, currentInventory.length); i++) {
      const itemData = currentInventory[i];
      const itemX = startX + i * gapX;
      const isPurchased = currentPurchases.has(itemData.key); // Check if item key is in purchase set

      // Item Icon
      const icon = this.add.image(itemX, itemY, itemData.icon).setScale(1.5);
      this.shopInstance.add(icon);

      // Item Name and Cost Text
      const nameText = this.add.text(itemX, itemY + 50, `${itemData.name}\nCost: ${itemData.cost}`, {
        font: '15px Arial', fill: '#fff', align: 'center', backgroundColor: '#000a', padding: { x: 4, y: 2 }
      }).setOrigin(0.5);
      this.shopInstance.add(nameText);

      // Item Description Text (always add, visibility toggled later if needed)
      const descText = this.add.text(itemX, itemY + descYOffset, itemData.desc, {
        font: '12px Arial', fill: '#bbb', align: 'center', wordWrap: { width: 120 }
      }).setOrigin(0.5);
      this.shopInstance.add(descText);

      // Buy/Bought Button
      const buttonText = isPurchased ? "Bought" : "Buy";
      const buttonColor = isPurchased ? "#888888" : "#00ff00"; // Grey if bought, green if available
      const buyButton = this.add.text(itemX, itemY + buttonYOffset, buttonText, {
        font: '18px Arial', fill: buttonColor, backgroundColor: '#333', padding: { x: 15, y: 5 }
      }).setOrigin(0.5);
      this.shopInstance.add(buyButton);

      if (!isPurchased) {
        buyButton.setInteractive({ useHandCursor: true });
        buyButton.on('pointerdown', () => {
          if (this.coins >= itemData.cost) {
            this.coins -= itemData.cost;
            this.coinsText.setText(`Coins: ${this.coins}`);
            this.sounds.upgrade.play();
            currentPurchases.add(itemData.key); // Add key to purchased set for this world

            // Apply the effect
            if (itemData.type === 'upgrade') {
              this.applyShopUpgrade(itemData.key);
            } else if (itemData.type === 'consumable') {
              this.applyShopConsumable(itemData.key);
            }

            this.showTempMessage(`Purchased: ${itemData.name}`);
            buyButton.setText("Bought").setStyle({ fill: '#888888' }).disableInteractive(); // Update button state
          } else {
            this.showTempMessage('Not enough coins!');
            this.sounds.death.play({ volume: 0.3 }); // Error sound
          }
        });

        // Hover effect for description (desktop only)
        if (!this.isMobile) {
          descText.setVisible(false);
          buyButton.on('pointerover', () => descText.setVisible(true));
          buyButton.on('pointerout', () => descText.setVisible(false));
          icon.setInteractive().on('pointerover', () => descText.setVisible(true)); // Also show on icon hover
          icon.on('pointerout', () => descText.setVisible(false));
        } else {
          descText.setVisible(true); // Always visible on mobile
        }

      } else {
        descText.setVisible(true); // Ensure description is visible if already bought
      }
    }

    // --- Refresh Button ---
    const refreshButtonY = itemY + 160;
    const refreshButton = this.add.text(400, refreshButtonY, `Refresh (${remainingRefreshes} left)`, {
      font: '20px Arial', fill: remainingRefreshes > 0 ? '#00ffff' : '#888888',
      backgroundColor: '#333', padding: { x: 15, y: 8 }
    }).setOrigin(0.5);
    this.shopInstance.add(refreshButton);

    if (remainingRefreshes > 0) {
      refreshButton.setInteractive({ useHandCursor: true });
      refreshButton.on('pointerdown', () => {
        this.shopRefreshCount[worldKey]--; // Decrement count
        this.shopInventory[worldKey] = this.generateShopItems(currentPurchases); // Generate new items, respecting purchases
        // Reload the shop UI by destroying the current instance and recreating it
        this.shopInstance.destroy();
        this.createShopRoom(); // Re-call the function to display new items
        this.showTempMessage("Shop Refreshed!");
      });
    } else {
      refreshButton.disableInteractive();
    }

    // General shop prompt
    this.shopPrompt.setText('Welcome! Click BUY to purchase.').setPosition(400, 80).setVisible(true);
  }


  generateShopItems(excludeKeys = new Set()) {
    // Define all possible shop items
    const allShopItems = [
      // Upgrades
      { key: 'hp', name: 'Max Health +2', icon: 'hp_icon', cost: 15, type: 'upgrade', desc: '+2 max health' },
      { key: 'damage', name: 'Damage Up', icon: 'damage_icon', cost: 25, type: 'upgrade', desc: '+0.3 damage mult' },
      { key: 'speed', name: 'Speed Up', icon: 'speed_icon', cost: 15, type: 'upgrade', desc: '+20 move speed' },
      { key: 'doubleShot', name: 'Double Shot', icon: 'doubleshot_icon', cost: 30, type: 'upgrade', desc: 'Fire second volley' },
      { key: 'splitShot', name: 'Split Shot +1', icon: 'splitshot_icon', cost: 30, type: 'upgrade', desc: '+1 proj per side' },
      { key: 'dodge', name: 'Extra Dodge', icon: 'dodge_icon', cost: 20, type: 'upgrade', desc: '+1 dodge charge' },
      { key: 'crit', name: 'Crit Chance +5%', icon: 'crit_icon', cost: 20, type: 'upgrade', desc: '+5% crit chance' },
      { key: 'bomb', name: 'Bomb Shot +10%', icon: 'bomb_icon', cost: 25, type: 'upgrade', desc: '+10% bomb shot' },
      { key: 'shield', name: 'Energy Shield', icon: 'shield_icon', cost: 40, type: 'upgrade', desc: 'Blocks one hit' },
      // Consumables
      { key: 'heal_full', name: 'Full Heal', icon: 'health_potion_icon', cost: 20, type: 'consumable', desc: 'Restore all health' },
      { key: 'heal_small', name: 'Health Potion', icon: 'health_potion_icon', cost: 10, type: 'consumable', desc: 'Restore 2 health' },
      // Add more items? Keys, bombs, temporary buffs?
    ];

    // Filter out items that are already purchased or shouldn't be offered again
    const availableItems = allShopItems.filter(item => {
      if (excludeKeys.has(item.key)) return false; // Already purchased this world
      if (item.key === 'dodge' && this.getTotalDodgeCharges() >= this.maxDodgeCharges) return false; // Max dodges reached
      if (item.key === 'shield' && this.shieldEnabled) return false; // Already have shield
      // Add other conditions if needed (e.g., max crit)
      return true;
    });

    // Shuffle and select items (e.g., 3 items per shop)
    return Phaser.Utils.Array.Shuffle(availableItems).slice(0, 3);
  }

  applyShopUpgrade(itemKey) {
    // Use the same logic as onPickup for upgrades
    this.onPickup(this.player, { upgradeType: itemKey, active: true, destroy: () => { } });
  }

  applyShopConsumable(itemKey) {
    let message = "";
    let playSound = true;
    switch (itemKey) {
      case 'heal_full':
        if (this.player.health < this.player.maxHealth) {
          this.player.health = this.player.maxHealth;
          this.updateHearts();
          message = "Healed to full health!";
        } else {
          message = "Already at full health!";
          playSound = false;
        }
        break;
      case 'heal_small':
        const healthBefore = this.player.health;
        this.player.health = Math.min(this.player.maxHealth, this.player.health + 2);
        const healthGained = this.player.health - healthBefore;
        if (healthGained > 0) {
          this.updateHearts();
          message = `Healed ${healthGained} health!`;
        } else {
          message = "Already at full health!";
          playSound = false;
        }
        break;
      default:
        console.warn("Unknown shop consumable:", itemKey);
        playSound = false;
        break;
    }

    if (playSound) {
      this.sounds.powerup.play(); // Use powerup sound for consumables
    }
    if (message) {
      this.showTempMessage(message);
    }
  }


  // --- UI Functions ---

  createUI() {
    // Main UI container, fixed to camera
    this.ui = this.add.container(0, 0).setDepth(100).setScrollFactor(0);

    // --- Health Display ---
    this.hearts = [];
    const maxHeartsToShow = 10; // Max hearts displayed visually
    const heartStartX = 100;
    const heartStartY = 40; // Moved up slightly
    const heartSpacing = 48;
    for (let i = 0; i < maxHeartsToShow; i++) {
      const heart = this.add.image(heartStartX + heartSpacing * i, heartStartY, "heart_empty")
        .setScale(1.2); // Slightly larger hearts
      this.hearts.push(heart);
      this.ui.add(heart);
    }
    this.updateHearts(); // Initial update

    // --- Text Info ---
    const textStartY = heartStartY + 45; // Position below hearts
    const textStyle = { font: "20px Arial", fill: "#ffffff", stroke: '#000000', strokeThickness: 3 };
    this.coinsText = this.add.text(heartStartX, textStartY, `Coins: ${this.coins}`, textStyle);
    this.worldText = this.add.text(heartStartX, textStartY + 30, `World: ${this.currentWorld}`, textStyle);
    this.scoreText = this.add.text(heartStartX, textStartY + 60, `Score: ${this.score}`, textStyle); // Added Score
    this.ui.add([this.coinsText, this.worldText, this.scoreText]);

    // --- Prompts (Initially Hidden) ---
    const promptStyle = { font: "18px Arial", fill: "#fff", backgroundColor: "#333a", padding: { x: 8, y: 4 } };
    this.doorPrompt = this.add.text(400, 100, "[E] Enter", promptStyle).setOrigin(0.5).setVisible(false);
    this.shopPrompt = this.add.text(400, 80, "", promptStyle).setOrigin(0.5).setVisible(false); // General shop prompt
    this.ui.add([this.doorPrompt, this.shopPrompt]);

    // --- Powerup Icons Display ---
    this.powerupsTitle = this.add.text(100, 500, "Powerups:", { font: "18px Arial", fill: "#fff" });
    this.powerupContainer = this.add.container(100, 525); // Position below title
    this.ui.add([this.powerupsTitle, this.powerupContainer]);
    this.updatePowerupIcons(); // Initial display

    // --- Minimap ---
    this.minimapObj = this.add.graphics().setDepth(99); // Slightly below main UI text
    this.ui.add(this.minimapObj);
    // Initial minimap draw happens in loadRoom

    // --- Dodge UI ---
    // REMOVED: this.dodgeUIGroup = this.add.group();
    // REMOVED: this.ui.add(this.dodgeUIGroup);
    this.dodgeUIContainer = this.add.container(0, 0); // Create a container instead
    this.ui.add(this.dodgeUIContainer);             // Add the container to the main UI
    this.createDodgeUI(); // Create the initial circles and add them to the container
  }

  updateHearts() {
    if (!this.player || !this.hearts) return; // Guard clause

    const maxHealthHearts = Math.ceil(this.player.maxHealth / 2);
    const currentFullHearts = Math.floor(this.player.health / 2);
    const hasHalfHeart = this.player.health % 2 === 1;

    this.hearts.forEach((heartSprite, index) => {
      if (index < maxHealthHearts) {
        heartSprite.setVisible(true);
        if (index < currentFullHearts) {
          heartSprite.setTexture("heart_full");
        } else if (index === currentFullHearts && hasHalfHeart) {
          heartSprite.setTexture("heart_half");
        } else {
          heartSprite.setTexture("heart_empty");
        }
      } else {
        heartSprite.setVisible(false); // Hide excess heart sprites
      }
    });
  }

  updatePowerupIcons() {
    if (!this.powerupContainer) return;
    this.powerupContainer.removeAll(true); // Clear previous icons

    // Define which upgrades have icons and map key to icon texture
    const iconMapping = {
      damage: "damage_icon", speed: "speed_icon", hp: "hp_icon",
      doubleShot: "doubleshot_icon", splitShot: "splitshot_icon",
      crit: "crit_icon", bomb: "bomb_icon", shield: "shield_icon",
      // Dodge is handled by the dedicated dodge UI
    };

    let currentX = 0;
    const iconSize = 28; // Smaller icons for the list
    const gap = 5;
    const maxPerRow = 10; // Adjust how many fit on one line
    let rowCount = 0;
    const rowHeight = iconSize + gap;

    Object.entries(this.upgrades).forEach(([key, count]) => {
      if (iconMapping[key] && count > 0) { // Check if icon exists and player has the upgrade
        for (let i = 0; i < count; i++) {
          if (rowCount >= maxPerRow) {
            currentX = 0;
            // Move to next row - currently overlaps, needs Y adjustment
            // For now, just reset X, icons will overlap if too many
            rowCount = 0;
            // TODO: Implement proper row wrapping if needed
          }

          const icon = this.add.image(currentX, 0, iconMapping[key]) // Y is relative to container
            .setOrigin(0, 0)
            .setDisplaySize(iconSize, iconSize); // Use setDisplaySize for consistency
          this.powerupContainer.add(icon);
          currentX += iconSize + gap;
          rowCount++;
        }
      }
    });
  }

  createDodgeUI() {
    // REMOVED: this.dodgeUIGroup.clear(true, true);
    this.dodgeUIContainer.removeAll(true); // Clear the container instead
    this.dodgeCircles = []; // Reset the array holding circle references

    const totalCharges = this.getTotalDodgeCharges();
    const radius = 12;
    const gap = 8;
    const startY = 565; // Position below powerups
    const totalWidth = totalCharges * radius * 2 + Math.max(0, totalCharges - 1) * gap;
    const startX = 400 - totalWidth / 2 + radius; // Center the UI horizontally

    for (let i = 0; i < totalCharges; i++) {
      const circleX = startX + i * (radius * 2 + gap);

      // Background/Outline circle
      const bgCircle = this.add.circle(circleX, startY, radius)
        .setStrokeStyle(2, 0xffffff, 0.8); // White outline
      // CHANGED: Add to container
      this.dodgeUIContainer.add(bgCircle);

      // Fill circle (represents charge state)
      const fillCircle = this.add.circle(circleX, startY, radius, 0x555555, 0.7) // Default empty/cooldown color
        .setVisible(true); // Initially visible, color/alpha changes
      // CHANGED: Add to container
      this.dodgeUIContainer.add(fillCircle);

      // Cooldown progress slice (initially invisible)
      const progressSlice = this.add.graphics()
        .setVisible(false)
        .setPosition(circleX, startY); // Position graphics object at circle center
      // CHANGED: Add to container
      this.dodgeUIContainer.add(progressSlice);


      this.dodgeCircles.push({ bg: bgCircle, fill: fillCircle, progress: progressSlice });
    }
  }

  updateDodgeUI(time = this.time.now) { // Default to current time if not passed
    if (!this.dodgeCircles || this.dodgeCircles.length !== this.getTotalDodgeCharges()) {
      // Recreate UI if the number of charges changed
      this.createDodgeUI();
    }
    if (!this.dodgeCircles.length) return; // Nothing to update if no circles exist

    const totalCharges = this.getTotalDodgeCharges();
    let cooldownSlotIndex = 0; // Index for tracking which cooldown time corresponds to which empty slot

    for (let i = 0; i < totalCharges; i++) {
      const uiElements = this.dodgeCircles[i];
      if (!uiElements) continue; // Safety check

      uiElements.progress.clear().setVisible(false); // Clear and hide progress slice by default

      if (i < this.dodgeCount) {
        // Charge is available
        uiElements.fill.setFillStyle(0x00ffff, 1.0).setVisible(true); // Bright cyan for available
      } else {
        // Charge is on cooldown or empty
        uiElements.fill.setFillStyle(0x555555, 0.7).setVisible(true); // Dim grey for unavailable/cooldown

        // Find the corresponding cooldown end time
        let cooldownEndTime = null;
        let currentCooldownIndex = 0;
        for (let cdTime of this.dodgeCooldowns) {
          if (cdTime !== null) {
            if (currentCooldownIndex === cooldownSlotIndex) {
              cooldownEndTime = cdTime;
              break;
            }
            currentCooldownIndex++;
          }
        }


        if (cooldownEndTime && time < cooldownEndTime) {
          // Charge is actively cooling down, draw progress
          const remainingTime = cooldownEndTime - time;
          const progressRatio = 1 - Math.max(0, remainingTime / this.dodgeCooldownTime);

          if (progressRatio > 0) {
            uiElements.progress.setVisible(true);
            uiElements.progress.fillStyle(0x00ffff, 0.6); // Semi-transparent cyan for progress
            // Draw slice starting from top (-90 degrees) clockwise
            uiElements.progress.slice(0, 0, uiElements.bg.radius, Phaser.Math.DegToRad(-90), Phaser.Math.DegToRad(-90 + progressRatio * 360), false);
            uiElements.progress.fillPath();
          }
          cooldownSlotIndex++; // Move to the next cooldown time for the next empty slot
        } else if (cooldownEndTime) {
          // Cooldown finished but charge not yet added back? Should be handled by handlePlayerDodge.
          // This slot represents a finished cooldown.
          cooldownSlotIndex++; // Still need to increment index
        }
        // If cooldownEndTime is null, it's just an empty slot beyond current charges, do nothing extra.
      }
    }
  }


  updateMinimap() {
    if (!this.minimapObj) {
      this.minimapObj = this.add.graphics().setDepth(99).setScrollFactor(0);
      this.ui.add(this.minimapObj); // Add to UI container
    } else {
      this.minimapObj.clear();
    }

    const cellSize = { width: 10, height: 8 };
    const cellPadding = 2;
    const mapOrigin = { x: 650, y: 50 }; // Top-right corner

    // Colors for different room types
    const colors = {
      visited: 0xaaaaaa, current: 0x00ff00, boss: 0xff0000,
      shop: 0xffff00, unvisited: 0x555555, miniboss: 0xaa00aa // Added miniboss color
    };

    // Determine map bounds to center the display (optional, can just use 0,0)
    let minX = 0, minY = 0, maxX = 0, maxY = 0;
    Object.keys(this.visitedRooms).forEach(key => {
      const [rx, ry] = key.split(",").map(Number);
      minX = Math.min(minX, rx); minY = Math.min(minY, ry);
      maxX = Math.max(maxX, rx); maxY = Math.max(maxY, ry);
      // Check neighbors of visited rooms to include unvisited outlines
      const roomData = this.roomMap[key];
      if (roomData) {
        Object.values(roomData.doors).forEach(neighborKey => {
          if (!this.visitedRooms[neighborKey]) {
            const [nx, ny] = neighborKey.split(",").map(Number);
            minX = Math.min(minX, nx); minY = Math.min(minY, ny);
            maxX = Math.max(maxX, nx); maxY = Math.max(maxY, ny);
          }
        });
      }
    });
    // Calculate offset to roughly center the map (optional)
    // const mapWidth = (maxX - minX + 1) * (cellSize.width + cellPadding);
    // const mapHeight = (maxY - minY + 1) * (cellSize.height + cellPadding);
    // const offsetX = mapOrigin.x - mapWidth / 2; // Adjust origin based on calculated width/height
    // const offsetY = mapOrigin.y;

    const drawnKeys = new Set(); // Keep track of drawn rooms to avoid duplicates

    // Draw visited rooms first
    Object.keys(this.visitedRooms).forEach(key => {
      if (drawnKeys.has(key)) return;

      const [rx, ry] = key.split(",").map(Number);
      const roomData = this.roomMap[key];
      if (!roomData) return; // Should not happen if map generation is correct

      const drawX = mapOrigin.x + (rx - minX) * (cellSize.width + cellPadding);
      const drawY = mapOrigin.y + (ry - minY) * (cellSize.height + cellPadding);

      // Determine fill color
      let fillColor = colors.visited;
      if (roomData.type === 'boss') fillColor = colors.boss;
      else if (roomData.type === 'shop') fillColor = colors.shop;
      else if (roomData.type === 'miniboss') fillColor = colors.miniboss; // Miniboss color

      // Current room overrides other colors
      if (rx === this.currentRoom.x && ry === this.currentRoom.y) {
        fillColor = colors.current;
      }

      // Draw the room rectangle
      this.minimapObj.fillStyle(fillColor, 0.9);
      this.minimapObj.fillRect(drawX, drawY, cellSize.width, cellSize.height);
      drawnKeys.add(key);

      // Draw connected unvisited rooms (as outlines/dimmed)
      Object.values(roomData.doors).forEach(neighborKey => {
        if (!this.visitedRooms[neighborKey] && !drawnKeys.has(neighborKey)) {
          const [nx, ny] = neighborKey.split(",").map(Number);
          const neighborDrawX = mapOrigin.x + (nx - minX) * (cellSize.width + cellPadding);
          const neighborDrawY = mapOrigin.y + (ny - minY) * (cellSize.height + cellPadding);

          this.minimapObj.fillStyle(colors.unvisited, 0.6);
          this.minimapObj.fillRect(neighborDrawX, neighborDrawY, cellSize.width, cellSize.height);
          // Optional: Add a border to unvisited?
          // this.minimapObj.lineStyle(1, 0x888888, 0.8);
          // this.minimapObj.strokeRect(neighborDrawX, neighborDrawY, cellSize.width, cellSize.height);
          drawnKeys.add(neighborKey);
        }
      });
    });

    // Highlight current room with a border
    const currentDrawX = mapOrigin.x + (this.currentRoom.x - minX) * (cellSize.width + cellPadding);
    const currentDrawY = mapOrigin.y + (this.currentRoom.y - minY) * (cellSize.height + cellPadding);
    this.minimapObj.lineStyle(2, 0xffffff, 1); // White border
    this.minimapObj.strokeRect(currentDrawX - 1, currentDrawY - 1, cellSize.width + 2, cellSize.height + 2);
  }

  createBossHealthBar(boss, name) {
    const barWidth = 400;
    const barHeight = 20;
    const barX = this.sys.game.config.width / 2;
    const barY = 30; // Position at the top center

    // Background
    if (this.bossHealthBarBg) this.bossHealthBarBg.destroy();
    this.bossHealthBarBg = this.add.graphics().setScrollFactor(0).setDepth(100);
    this.bossHealthBarBg.fillStyle(0x555555, 0.8); // Dark grey background
    this.bossHealthBarBg.fillRect(barX - barWidth / 2 - 2, barY - barHeight / 2 - 2, barWidth + 4, barHeight + 4);
    this.ui.add(this.bossHealthBarBg); // Add to UI container

    // Health bar fill
    if (this.bossHealthBar) this.bossHealthBar.destroy();
    this.bossHealthBar = this.add.graphics().setScrollFactor(0).setDepth(101);
    this.ui.add(this.bossHealthBar); // Add to UI container

    // Boss Name Text
    if (this.bossNameText) this.bossNameText.destroy();
    this.bossNameText = this.add.text(barX, barY + barHeight, name, {
      font: '16px Arial', fill: '#ffffff', stroke: '#000000', strokeThickness: 3
    }).setOrigin(0.5, 0).setScrollFactor(0).setDepth(101);
    this.ui.add(this.bossNameText);

    // Initial draw
    this.updateBossHealthBar(boss);
  }

  updateBossHealthBar(boss) {
    if (!this.bossHealthBar || !boss || !boss.active) {
      // Clean up if boss is dead or bar doesn't exist
      if (this.bossHealthBar) this.bossHealthBar.destroy();
      if (this.bossHealthBarBg) this.bossHealthBarBg.destroy();
      if (this.bossNameText) this.bossNameText.destroy();
      this.bossHealthBar = null; this.bossHealthBarBg = null; this.bossNameText = null;
      return;
    };

    const barWidth = 400;
    const barHeight = 20;
    const barX = this.sys.game.config.width / 2;
    const barY = 30;
    const healthPercent = Math.max(0, boss.health / boss.maxHealth);

    this.bossHealthBar.clear();
    this.bossHealthBar.fillStyle(0xff0000, 1); // Red fill
    this.bossHealthBar.fillRect(barX - barWidth / 2, barY - barHeight / 2, barWidth * healthPercent, barHeight);
  }

  showTempMessage(text) {
    // Destroy previous message if it exists
    if (this.tempMessage) {
      this.tempMessage.destroy();
    }

    // Create new message text
    const msg = this.add.text(400, 60, text, { // Positioned higher up
      font: "22px Arial", fill: "#ffff00", // Yellow text
      backgroundColor: "#000000a0", // Semi-transparent black background
      padding: { x: 15, y: 8 },
      align: 'center'
    }).setOrigin(0.5).setDepth(200).setScrollFactor(0); // Ensure it's on top and doesn't scroll

    this.tempMessage = msg; // Store reference

    // Fade out and destroy after a delay
    this.tweens.add({
      targets: msg,
      alpha: 0,
      delay: 2500, // Start fading after 2.5 seconds
      duration: 500, // Fade over 0.5 seconds
      onComplete: () => {
        if (this.tempMessage === msg) { // Ensure we are destroying the correct message
          msg.destroy();
          this.tempMessage = null;
        }
      }
    });
  }

  shake(intensity = 0.005, duration = 100) {
    this.cameras.main.shake(duration, intensity, false); // Use built-in camera shake
  }

  updateGameTime(time) {
    this.gameTime = time - this.gameStartTime;
    // Optional: Display elapsed time on UI?
    // const minutes = Math.floor(this.gameTime / 60000);
    // const seconds = Math.floor((this.gameTime % 60000) / 1000);
    // const timeString = `${minutes}:${seconds.toString().padStart(2, '0')}`;
    // if (this.timeText) this.timeText.setText(`Time: ${timeString}`);
  }

  openInventory() {
    if (this.scene.isActive('InventoryScene')) {
      this.scene.stop('InventoryScene');
      this.scene.resume('MainGameScene');
    } else {
      this.scene.pause('MainGameScene');
      // Pass necessary data to the inventory scene
      this.scene.launch('InventoryScene', {
        mainScene: this, // Reference to this scene (use carefully)
        inventory: {}, // Pass actual inventory data if implemented
        upgrades: this.upgrades,
        playerStats: { // Pass a snapshot of relevant stats
          health: this.player.health,
          maxHealth: this.player.maxHealth,
          damageMultiplier: this.damageMultiplier,
          playerSpeed: this.playerSpeed,
          critChance: this.critChance,
          bombShotChance: this.bombShotChance,
          shieldEnabled: this.shieldEnabled,
          shieldActive: this.shieldActive,
          currentWorld: this.currentWorld,
          coins: this.coins
        }
      });
    }
  }

  // --- Game Flow & Reset ---

  resetGame() {
    console.log("Resetting game state...");
    // Reset Core Stats
    this.coins = 0;
    this.damageMultiplier = 1.0;
    this.playerSpeed = 160;
    this.critChance = 0.0;
    this.bombShotChance = 0.0;
    this.score = 0;
    this.gameStartTime = this.time.now; // Reset timer start
    this.gameTime = 0;

    // Reset Upgrades
    this.upgrades = { hp: 0, damage: 0, speed: 0, doubleShot: 0, splitShot: 0, dodge: 0, crit: 0, bomb: 0, shield: 0 };

    // Reset Player State
    if (this.player) {
      this.player.health = 6;
      this.player.maxHealth = 6;
      this.player.setPosition(400, 300); // Reset position
      this.player.setVelocity(0, 0);
      this.player.clearTint().setAlpha(1);
    }
    this.invincible = false;
    this.isDodging = false;
    this.dodgeCount = this.baseDodgeCharges; // Reset to base + 0 upgrades
    this.dodgeCooldowns = Array(this.baseDodgeCharges).fill(null); // Reset cooldown array size
    this.shieldEnabled = false;
    this.shieldActive = false;
    if (this.shieldTimer) this.shieldTimer.remove();
    this.shieldTimer = null;
    if (this.shieldSprite) this.shieldSprite.setVisible(false);


    // Reset World/Room State
    this.currentWorld = 1;
    this.currentRoom = { x: 0, y: 0 };
    this.roomMap = {};
    this.visitedRooms = {}; // Clear visited rooms on full reset
    this.clearedRooms = new Set();
    this.roomActive = false;
    this.entryDoorDirection = null;
    this.portalActive = false;
    this.miniBossSpawned = {}; // Clear miniboss status

    // Reset Shop State
    this.shopInventory = {};
    this.shopPurchases = {};
    this.shopRefreshCount = {};

    // Reset Pathfinding Data
    this.enemyPathData.clear();
    this.repathTimer = 0;

    // Update UI Elements if they exist
    if (this.coinsText) this.coinsText.setText(`Coins: ${this.coins}`);
    if (this.worldText) this.worldText.setText(`World: ${this.currentWorld}`);
    if (this.scoreText) this.scoreText.setText(`Score: ${this.score}`);
    if (this.hearts.length > 0) this.updateHearts();
    if (this.powerupContainer) this.updatePowerupIcons();
    if (this.dodgeCircles) this.updateDodgeUI(); // Update dodge UI for reset state
  }

  transitionToRoom(x, y, direction) {
    if (this.inTransition) return;
    this.inTransition = true;

    // figure out the opposite doorway so enemies spawn in from the right side
    const exitDir = { up: 'down', down: 'up', left: 'right', right: 'left' }[direction];

    // compute the new player position just inside the next room
    const { x1, y1, x2, y2 } = this.playArea;
    const offset = 50;
    let newX = this.player.x;
    let newY = this.player.y;
    switch (direction) {
      case 'up': newY = y2 - offset; break;
      case 'down': newY = y1 + offset; break;
      case 'left': newX = x2 - offset; break;
      case 'right': newX = x1 + offset; break;
    }

    // 1) Fade *out* the old room
    this.cameras.main.fadeOut(250, 0, 0, 0);

    // 2) When fade‐out is done, swap rooms and position the player
    this.cameras.main.once('camerafadeoutcomplete', () => {
      this.player.setVelocity(0, 0);
      this.loadRoom(x, y, exitDir);
      this.player.setPosition(newX, newY);

      // 3) Fade *in* the new room
      this.cameras.main.fadeIn(250, 0, 0, 0);

      // 4) When fade‐in finishes, allow transitions again
      this.cameras.main.once('camerafadeincomplete', () => {
        this.inTransition = false;
      });
    });
  }

  handleDoorInteraction(door) {
    if (!door) return false;
    const dist = Phaser.Math.Distance.Between(
      this.player.x, this.player.y,
      door.x, door.y
    );

    if (dist < 60) {
      if (door.isOpen) {
        // show the prompt
        if (!this.isMobile) {
          this.doorPrompt
            .setText("[E] Enter")
            .setPosition(door.x, door.y - 40)
            .setVisible(true);
        }

        // only ENTER on key‐press — remove the automatic threshold check
        if (!this.isMobile && Phaser.Input.Keyboard.JustDown(this.keys.E)) {
          const [nx, ny] = door.targetRoom.split(",").map(Number);
          this.transitionToRoom(nx, ny, door.direction);
          return true;
        }
      } else if (!this.roomActive) {
        this.openDoor(door);
      }
      return false;
    } else if (!this.isMobile && this.doorPrompt.visible) {
      // hide prompt if you walk away
      this.doorPrompt.setVisible(false);
    }
  }

  isCrossingDoorThreshold(door) {
    if (!this.player || !this.player.body) return false;

    const threshold = 15; // How far past the door center counts as crossing
    const playerBounds = this.player.getBounds();

    switch (door.direction) {
      case "up": return playerBounds.top < door.y - threshold;
      case "down": return playerBounds.bottom > door.y + threshold;
      case "left": return playerBounds.left < door.x - threshold;
      case "right": return playerBounds.right > door.x + threshold;
    }
    return false;
  }

  tryEnterDoor(door) {
    this.lastDoorX = door.x;
    this.lastDoorY = door.y;
    const [nx, ny] = door.targetRoom.split(',').map(Number);
    this.transitionToRoom(nx, ny, door.direction);
  }

  // --- Pathfinding Functions ---
  setupPathfindingGrid() {
    const gridWidth = Math.ceil(this.sys.game.config.width / this.gridCellSize);
    const gridHeight = Math.ceil(this.sys.game.config.height / this.gridCellSize);
    this.pathfindingGrid = [];

    // Initialize grid with walkable tiles (0)
    for (let y = 0; y < gridHeight; y++) {
      this.pathfindingGrid[y] = [];
      for (let x = 0; x < gridWidth; x++) {
        this.pathfindingGrid[y][x] = 0;
      }
    }

    // Mark tiles occupied by walls as unwalkable (1)
    const markWallTile = (wall) => {
      // Calculate grid cells covered by the wall sprite
      const left = Math.max(0, Math.floor((wall.x - wall.displayWidth / 2) / this.gridCellSize));
      const right = Math.min(gridWidth, Math.ceil((wall.x + wall.displayWidth / 2) / this.gridCellSize));
      const top = Math.max(0, Math.floor((wall.y - wall.displayHeight / 2) / this.gridCellSize));
      const bottom = Math.min(gridHeight, Math.ceil((wall.y + wall.displayHeight / 2) / this.gridCellSize));

      for (let y = top; y < bottom; y++) {
        for (let x = left; x < right; x++) {
          // Ensure indices are within bounds before marking
          if (y >= 0 && y < gridHeight && x >= 0 && x < gridWidth) {
            this.pathfindingGrid[y][x] = 1; // Mark as unwalkable
          }
        }
      }
    };

    this.walls.getChildren().forEach(markWallTile);
    this.innerWalls.getChildren().forEach(markWallTile);
    // Mark closed doors as unwalkable
    this.doors.getChildren().forEach(door => {
      if (!door.isOpen) {
        markWallTile(door); // Treat closed doors like walls for pathfinding
      }
    });

    // Configure EasyStar
    this.finder.setGrid(this.pathfindingGrid);
    this.finder.setAcceptableTiles([0]); // Only tile type 0 is walkable
    this.finder.enableDiagonals(); // Allow diagonal movement
    // this.finder.setIterationsPerCalculation(1000); // Adjust as needed for performance
  }

  getGridCoordinates(worldX, worldY) {
    const gridX = Math.floor(worldX / this.gridCellSize);
    const gridY = Math.floor(worldY / this.gridCellSize);
    return { x: gridX, y: gridY };
  }

  getWorldCoordinates(gridX, gridY) {
    const worldX = gridX * this.gridCellSize + this.gridCellSize / 2; // Center of the grid cell
    const worldY = gridY * this.gridCellSize + this.gridCellSize / 2;
    return { x: worldX, y: worldY };
  }

  isWalkableAt(worldX, worldY) {
    if (!this.pathfindingGrid) return false; // Grid not initialized

    const gridPos = this.getGridCoordinates(worldX, worldY);
    const gridHeight = this.pathfindingGrid.length;
    const gridWidth = gridHeight > 0 ? this.pathfindingGrid[0].length : 0;

    // Check bounds
    if (gridPos.x < 0 || gridPos.y < 0 || gridPos.y >= gridHeight || gridPos.x >= gridWidth) {
      return false; // Outside grid bounds
    }

    // Check if tile is marked as unwalkable (1)
    return this.pathfindingGrid[gridPos.y][gridPos.x] === 0;
  }


  findPathForEnemy(enemy) {
    // Basic checks
    if (!this.finder || !enemy.active || !this.player.active || !this.pathfindingGrid) {
      this.enemyPathData.set(enemy.id, { path: null, targetNodeIndex: -1 });
      return;
    }

    const enemyGridPos = this.getGridCoordinates(enemy.x, enemy.y);
    const playerGridPos = this.getGridCoordinates(this.player.x, this.player.y);
    const gridHeight = this.pathfindingGrid.length;
    const gridWidth = gridHeight > 0 ? this.pathfindingGrid[0].length : 0;

    // Check if positions are valid within the grid
    const isValid = (pos) => pos.x >= 0 && pos.y >= 0 && pos.y < gridHeight && pos.x < gridWidth;
    if (!isValid(enemyGridPos) || !isValid(playerGridPos)) {
      this.enemyPathData.set(enemy.id, { path: null, targetNodeIndex: -1 });
      return;
    }

    // Check if start or end points are unwalkable (e.g., inside a wall)
    if (this.pathfindingGrid[enemyGridPos.y][enemyGridPos.x] === 1 ||
      this.pathfindingGrid[playerGridPos.y][playerGridPos.x] === 1) {
      this.enemyPathData.set(enemy.id, { path: null, targetNodeIndex: -1 });
      return;
    }

    // Avoid pathfinding if already at the target grid cell
    if (enemyGridPos.x === playerGridPos.x && enemyGridPos.y === playerGridPos.y) {
      this.enemyPathData.set(enemy.id, { path: null, targetNodeIndex: -1 });
      return;
    }

    // --- Asynchronous Pathfinding Request ---
    this.finder.findPath(enemyGridPos.x, enemyGridPos.y, playerGridPos.x, playerGridPos.y, (path) => {
      // This callback executes when the path is found (or not found)
      if (!enemy.active) return; // Enemy might have died while path was calculating

      if (path === null || path.length <= 1) {
        // No path found or path is trivial (start = end)
        this.enemyPathData.set(enemy.id, { path: null, targetNodeIndex: -1 });
      } else {
        // Path found, store it and start at the second node (index 1)
        this.enemyPathData.set(enemy.id, { path: path, targetNodeIndex: 1 });
      }
    });

    // --- IMPORTANT ---
    // Call finder.calculate() periodically in the main update loop
    // This processes the pending pathfinding requests.
  }
}
// --- Game Configuration ---
var config = {
  type: Phaser.AUTO, // Use WebGL if available, otherwise Canvas
  width: 800,
  height: 600,
  scene: [TitleScene, MainGameScene, GameOverScene, InventoryScene], // Add InventoryScene
  physics: {
    default: "arcade",
    arcade: {
      gravity: { y: 0 }, // Top-down game, no gravity
      // debug: true // Set to true to see physics bodies and velocity vectors
      debug: false
    }
  },
  parent: "game-container", // ID of the div to contain the game canvas
  scale: {
    mode: Phaser.Scale.FIT, // Fit the game within the parent container
    autoCenter: Phaser.Scale.CENTER_BOTH // Center the game canvas
  },
  render: {
    pixelArt: true, // Use nearest neighbor scaling for pixel art
    antialias: false // Disable anti-aliasing for crisp pixels
  }
};

// --- Global Helper --- (Optional: For EasyStar)
// Ensure EasyStar is loaded before the game starts
var game; // Make game instance accessible if needed globally (rarely necessary)

window.onload = () => {
  // Check if EasyStar is loaded
  if (typeof EasyStar === 'undefined') {
    console.error("EasyStar library not found. Please include easystar.js");
    // Optionally display an error message to the user on the page
    document.getElementById('game-container').innerHTML = 'Error: Required pathfinding library (EasyStar.js) is missing.';
    return; // Stop game initialization
  }
  console.log("EasyStar found. Starting Phaser game...");
  game = new Phaser.Game(config); // Start the game
};