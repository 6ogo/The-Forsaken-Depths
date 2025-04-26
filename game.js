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
      hp: 0, damage: 0, speed: 0, doubleShot: 0, splitShot: 0, dodge: 2,
    };
    this.shopPurchases = {};
    this.invincible = false;
    this.dodgeCount = 2;
    this.dodgeCooldownTime = 4000;
    this.dodgeCooldowns = [];
    this.lastDodgeUsed = 0;
    this.isMobile = false;
    this.autoShootTimer = 0;
    this.powerupIcons = {};
    this.hardMode = false;
    this.footstepTimer = 0;
    this.worldEnemies = {
      1: ["blob", "bee", "witch"], 2: ["quasit", "orc", "witch"], 3: ["wizard", "shapeshifter", "witch"],
      4: ["orc", "witch", "bee"], 5: ["shapeshifter", "orc", "quasit"], 6: ["witch", "bee", "orc", "wizard"]
    };
    this.roomActive = false;
    this.clearedRooms = new Set();
    this.visitedRooms = {};
    this.entryDoorDirection = null;
    this.colliders = [];
    this.finder = null;
    this.pathfindingGrid = null;
    this.gridCellSize = 32;
    this.enemyPathData = new Map();
    this.repathTimer = 0;
  }

  preload() {
    const assets = [
      "player", "projectile", "blob", "boss", "wall", "door", "door_closed", "boss_projectile",
      "gold_sparkles", "heart_full", "heart_half", "heart_empty", "background",
      "shapeshifter", "wizard", "quasit", "orc", "bee", "witch",
      "boss1", "boss2", "boss3", "boss4", "boss5",
    ];
    assets.forEach((key) => this.load.image(key, `assets/${key}.png`));
    this.load.image("wizard_projectile", "assets/wizard_projectile.png");
    this.load.image("witch_projectile", "assets/witch_projectile.png");
    this.load.image("quasit_projectile", "assets/quasit_projectile.png");
    this.load.image("blob_projectile", "assets/blob_projectile.png");
    for (let i = 1; i <= 5; i++) { this.load.image(`wall${i}`, `assets/wall${i}.png`); }
    this.load.image("bg", "assets/bg.png");
    const powerupAssets = {
      dodge_icon: "boss_projectile", damage_icon: "damage_up", hp_icon: "health_up",
      speed_icon: "blob_projectile", doubleshot_icon: "blob", splitshot_icon: "blob_projectile"
    };
    Object.entries(powerupAssets).forEach(([key, value]) => { if (!this.textures.exists(key)) { this.load.image(key, `assets/${value}.png`); } });
    const sounds = ['walk', 'dash', 'shot', 'death', 'upgrade', 'powerup'];
    sounds.forEach(sound => { if (!this.sound.get(sound)) { this.load.audio(sound, `assets/sounds/${sound}.wav`); } });
    this.load.image("touchstick", "assets/wall.png");
  }

  create(data) {
    this.sounds = {
      walk: this.sound.add('walk', { loop: false, volume: 0.3 }), dash: this.sound.add('dash', { loop: false, volume: 0.5 }),
      shot: this.sound.add('shot', { loop: false, volume: 0.4 }), death: this.sound.add('death', { loop: false, volume: 0.6 }),
      upgrade: this.sound.add('upgrade', { loop: false, volume: 0.5 }), powerup: this.sound.add('powerup', { loop: false, volume: 0.5 })
    };
    this.isMobile = this.sys.game.device.os.android || this.sys.game.device.os.iOS;
    this.playArea = { x1: 60, y1: 60, x2: 740, y2: 540 };
    this.physics.world.setBounds(0, 0, this.sys.game.config.width, this.sys.game.config.height);
    this.inTransition = false;
    this.finder = new EasyStar.js();
    this.setupPhysicsGroups();
    this.setupPlayer();
    this.setupInputs();
    this.createUI();
    this.dodgeCooldowns = Array(this.upgrades.dodge).fill(null);
    if (data?.restart) { this.resetGame(); }
    this.generateWorldMap();
    this.loadRoom(0, 0);
    this.createPowerupIcons();
    this.updatePowerupIcons();
    this.cameras.main.setZoom(1.0);
  }

  // --- Pathfinding Helper Functions ---
  setupPathfindingGrid() {
    const gridWidth = Math.ceil(this.sys.game.config.width / this.gridCellSize);
    const gridHeight = Math.ceil(this.sys.game.config.height / this.gridCellSize);
    this.pathfindingGrid = [];
    for (let y = 0; y < gridHeight; y++) { this.pathfindingGrid[y] = []; for (let x = 0; x < gridWidth; x++) { this.pathfindingGrid[y][x] = 0; } }
    const markWallTile = (wall) => {
        const left = Math.max(0, Math.floor((wall.x - wall.displayWidth / 2) / this.gridCellSize));
        const right = Math.min(gridWidth, Math.ceil((wall.x + wall.displayWidth / 2) / this.gridCellSize));
        const top = Math.max(0, Math.floor((wall.y - wall.displayHeight / 2) / this.gridCellSize));
        const bottom = Math.min(gridHeight, Math.ceil((wall.y + wall.displayHeight / 2) / this.gridCellSize));
        for (let y = top; y < bottom; y++) { for (let x = left; x < right; x++) { this.pathfindingGrid[y][x] = 1; } }
    };
    this.walls.getChildren().forEach(markWallTile);
    this.innerWalls.getChildren().forEach(markWallTile);
    this.doors.getChildren().forEach(door => { if (!door.isOpen) { markWallTile(door); } });
    this.finder.setGrid(this.pathfindingGrid);
    this.finder.setAcceptableTiles([0]);
    this.finder.setIterationsPerCalculation(1000);
  }
  getGridCoordinates(worldX, worldY) { const gridX = Math.floor(worldX / this.gridCellSize); const gridY = Math.floor(worldY / this.gridCellSize); return { x: gridX, y: gridY }; }
  getWorldCoordinates(gridX, gridY) { const worldX = gridX * this.gridCellSize + this.gridCellSize / 2; const worldY = gridY * this.gridCellSize + this.gridCellSize / 2; return { x: worldX, y: worldY }; }
  isWalkableAt(worldX, worldY) {
      if (!this.pathfindingGrid) return false;
      const gridPos = this.getGridCoordinates(worldX, worldY);
      const gridHeight = this.pathfindingGrid.length; const gridWidth = gridHeight > 0 ? this.pathfindingGrid[0].length : 0;
      if (gridPos.x < 0 || gridPos.y < 0 || gridPos.y >= gridHeight || gridPos.x >= gridWidth) { return false; }
      return this.pathfindingGrid[gridPos.y][gridPos.x] === 0;
  }
  findPathForEnemy(enemy) {
    if (!this.finder || !enemy.active || !this.player.active || !this.pathfindingGrid) return;
    const enemyGridPos = this.getGridCoordinates(enemy.x, enemy.y); const playerGridPos = this.getGridCoordinates(this.player.x, this.player.y);
    const gridHeight = this.pathfindingGrid.length; const gridWidth = gridHeight > 0 ? this.pathfindingGrid[0].length : 0;
    if (enemyGridPos.x < 0 || enemyGridPos.y < 0 || enemyGridPos.y >= gridHeight || enemyGridPos.x >= gridWidth || playerGridPos.x < 0 || playerGridPos.y < 0 || playerGridPos.y >= gridHeight || playerGridPos.x >= gridWidth) { this.enemyPathData.set(enemy.id, { path: null, targetNodeIndex: -1 }); return; }
    if (enemyGridPos.x === playerGridPos.x && enemyGridPos.y === playerGridPos.y) { this.enemyPathData.set(enemy.id, { path: null, targetNodeIndex: -1 }); return; }
    if (this.pathfindingGrid[playerGridPos.y][playerGridPos.x] === 1) { this.enemyPathData.set(enemy.id, { path: null, targetNodeIndex: -1 }); return; }
    this.finder.findPath(enemyGridPos.x, enemyGridPos.y, playerGridPos.x, playerGridPos.y, (path) => {
        if (!enemy.active) return;
        if (path === null || path.length <= 1) { this.enemyPathData.set(enemy.id, { path: null, targetNodeIndex: -1 }); }
        else { this.enemyPathData.set(enemy.id, { path: path, targetNodeIndex: 1 }); }
    });
  }

  // --- Rest of Scene Methods ---
  setupPhysicsGroups() { this.walls = this.physics.add.staticGroup(); this.innerWalls = this.physics.add.staticGroup(); this.doors = this.physics.add.group({ immovable: true }); this.enemies = this.physics.add.group(); this.enemyProj = this.physics.add.group(); this.projectiles = this.physics.add.group(); this.pickups = this.physics.add.group(); }
  setupPlayer() { this.player = this.physics.add.sprite(400, 300, "player").setDepth(10); this.player.setCollideWorldBounds(true); this.player.health = 6; this.player.maxHealth = 6; this.player.lastDamageTime = 0; this.shootCooldown = 200; this.lastShootTime = 0; this.isDodging = false; this.player.body.setSize(this.player.width * 0.8, this.player.height * 0.8); }
  setupInputs() { this.keys = this.input.keyboard.addKeys( "W,A,S,D,LEFT,RIGHT,UP,DOWN,E,SPACE" ); if (this.isMobile) { this.setupMobileControls(); } else { this.input.on("pointerdown", (ptr) => { if (ptr.y < this.sys.game.config.height - 100) { this.shootMouse(ptr); } }); } this.minimap = this.add.graphics().setDepth(100); }
  takeDamage() { if (this.invincible || this.time.now < this.player.lastDamageTime + 800) return; this.player.health -= 1; this.player.lastDamageTime = this.time.now; this.player.setTint(0xff0000); this.player.alpha = 0.5; this.time.addEvent({ delay: 100, repeat: 3, callback: () => { this.player.alpha = (this.player.alpha === 1) ? 0.5 : 1; }, onComplete: () => { if (this.player.active) { this.player.alpha = 1; this.player.clearTint(); } } }); this.shake(0.005, 200); this.updateHearts(); if (this.player.health <= 0) { this.sounds.death.play(); this.scene.start("GameOverScene"); } this.invincible = true; this.time.delayedCall(800, () => { if (!this.isDodging) { this.invincible = false; } }); }
  shootMouse(ptr) { if (this.time.now < this.lastShootTime + this.shootCooldown) return; const worldPoint = this.cameras.main.getWorldPoint(ptr.x, ptr.y); const angle = Phaser.Math.Angle.Between(this.player.x, this.player.y, worldPoint.x, worldPoint.y); this.fireProjectiles(angle); this.lastShootTime = this.time.now; }
  createBossProjectile(x, y, vx, vy) { const proj = this.enemyProj.create(x, y, 'boss_projectile'); if (!proj) return null; proj.setVelocity(vx, vy); proj.setScale(1.5); proj.body.onWorldBounds = true; return proj; }
  setupColliders() { if (this.colliders) { this.colliders.forEach(c => { if (c && c.active) c.destroy() }); } this.colliders = []; this.colliders.push(this.physics.add.collider(this.player, this.walls)); this.colliders.push(this.physics.add.collider(this.enemies, this.walls)); this.colliders.push(this.physics.add.collider(this.player, this.innerWalls)); this.colliders.push(this.physics.add.collider(this.enemies, this.innerWalls)); this.colliders.push(this.physics.add.collider(this.projectiles, [this.walls, this.innerWalls], (proj) => proj.destroy())); this.colliders.push(this.physics.add.collider(this.enemyProj, [this.walls, this.innerWalls], (proj) => proj.destroy())); this.colliders.push(this.physics.add.overlap(this.projectiles, this.enemies, this.onHitEnemy, null, this)); this.colliders.push(this.physics.add.collider(this.player, this.enemies, (player, enemy) => { if ((enemy.isCharging || enemy.type === 'bee') && !this.invincible) { this.takeDamage(); } }, null, this )); this.colliders.push(this.physics.add.overlap(this.player, this.enemyProj, (player, proj) => { if (!this.invincible) { this.takeDamage(); proj.destroy(); } }, null, this )); this.colliders.push(this.physics.add.overlap(this.player, this.pickups, this.onPickup, null, this)); this.doors.getChildren().forEach(door => { if (!door.isOpen) { door.collider = this.physics.add.collider(this.player, door); this.colliders.push(door.collider); } }); this.physics.world.off('worldbounds'); this.physics.world.on('worldbounds', (body) => { if (body.gameObject && (this.projectiles.contains(body.gameObject) || this.enemyProj.contains(body.gameObject))) { body.gameObject.destroy(); } else if (body.gameObject && this.enemies.contains(body.gameObject)) { body.gameObject.setVelocity(0,0); } }); }
  createUI() { this.ui = this.add.container(0, 0).setDepth(100).setScrollFactor(0); this.hearts = []; const maxHeartsToShow = 10; for (let i = 0; i < maxHeartsToShow; i++) { const h = this.add.image(100 + 48 * i, 60, "heart_empty"); this.hearts.push(h); this.ui.add(h); } this.updateHearts(); this.coinsText = this.add.text(100, 100, "Coins: 0", { font: "28px Arial", fill: "#fff" }); this.worldText = this.add.text(100, 140, "World: 1", { font: "24px Arial", fill: "#fff" }); this.ui.add([this.coinsText, this.worldText]); this.createPrompts(); this.nextLevelText = this.add.text(400, 250, "", { font: "32px Arial", fill: "#00ff00", backgroundColor: "#000", padding: { x: 10, y: 5 } }).setOrigin(0.5).setVisible(false); this.ui.add(this.nextLevelText); }
  performDodge() { if (this.isDodging || this.dodgeCount <= 0) return; this.isDodging = true; this.invincible = true; this.player.setTint(0x00ffff); this.dodgeCount--; this.sounds.dash.play(); let cITS = -1; for(let i = 0; i < this.upgrades.dodge; ++i) { if (this.dodgeCooldowns[i] === null) { cITS = i; break; } } if (cITS !== -1) { this.dodgeCooldowns[cITS] = this.time.now + this.dodgeCooldownTime; } else { console.warn("Could not find empty slot for dodge cooldown"); this.dodgeCooldowns.push(this.time.now + this.dodgeCooldownTime); } let dx = 0, dy = 0; let mR = false; if (this.isMobile) { if (this.isTouching && this.touchIndicator && this.touchIndicator.visible) { const cX = this.touchIndicator.x; const cY = this.touchIndicator.y; dx = this.touchPosition.x - cX; dy = this.touchPosition.y - cY; const len = Math.sqrt(dx * dx + dy * dy); const dZ = 10; if (len > dZ) { dx /= len; dy /= len; mR = true; } } if (!mR) { dy = -1; } } else { if (this.keys.W.isDown) { dy = -1; mR = true; } else if (this.keys.S.isDown) { dy = 1; mR = true; } if (this.keys.A.isDown) { dx = -1; mR = true; } else if (this.keys.D.isDown) { dx = 1; mR = true; } if (!mR) { dy = -1; } if (dx !== 0 && dy !== 0) { const len = Math.sqrt(2); dx /= len; dy /= len; } } this.player.setVelocity(dx * this.dodgeSpeed, dy * this.dodgeSpeed); this.time.delayedCall(this.dodgeDuration, () => { if (this.player.active) { this.isDodging = false; this.player.clearTint(); this.player.setVelocity(0, 0); if (this.time.now > this.player.lastDamageTime + 800) { this.invincible = false; } } }); }
  createPrompts() { const pY = this.isMobile ? 240 : 200; this.doorPrompt = this.add.text(400, pY, "", { font: "18px Arial", fill: "#fff", backgroundColor: "#333", padding: { x: 5, y: 2 } }).setOrigin(0.5).setDepth(101).setVisible(false); this.shopPrompt = this.add.text(400, pY + 40, "", { font: "18px Arial", fill: "#fff", backgroundColor: "#333", padding: { x: 5, y: 2 } }).setOrigin(0.5).setDepth(101).setVisible(false); this.ui.add([this.doorPrompt, this.shopPrompt]); }
  handleDoorInteraction(door) { const dist = Phaser.Math.Distance.Between( this.player.x, this.player.y, door.x, door.y ); if (dist < 60) { if (door.isOpen) { if (!this.isMobile) { this.doorPrompt.setText("[E] Enter").setPosition(door.x, door.y - 40).setVisible(true); } if ((!this.isMobile && Phaser.Input.Keyboard.JustDown(this.keys.E)) || this.isCrossingDoorThreshold(door)) { const [nx, ny] = door.targetRoom.split(",").map(Number); this.transitionToRoom(nx, ny, door.direction); return true; } } else if (!this.roomActive) { this.openDoor(door); } return false; } }
  isCrossingDoorThreshold(door) { const t = 10; switch (door.direction) { case "up": return this.player.y < door.y - t; case "down": return this.player.y > door.y + t; case "left": return this.player.x < door.x - t; case "right": return this.player.x > door.x + t; } return false; }
  setupMobileControls() { this.leftHalf = this.add.zone(0, 0, this.cameras.main.width / 2, this.cameras.main.height).setOrigin(0).setScrollFactor(0).setInteractive(); this.touchPosition = { x: 0, y: 0 }; this.isTouching = false; this.touchId = -1; this.touchIndicator = this.add.circle(100, 450, 40, 0xffffff, 0.3).setDepth(90).setScrollFactor(0).setVisible(false); this.touchStick = this.add.circle(100, 450, 20, 0xffffff, 0.7).setDepth(91).setScrollFactor(0).setVisible(false); this.leftHalf.on('pointerdown', (p) => { if (this.touchId === -1) { this.isTouching = true; this.touchPosition.x = p.x; this.touchPosition.y = p.y; this.touchId = p.id; this.touchIndicator.setPosition(p.x, p.y).setVisible(true); this.touchStick.setPosition(p.x, p.y).setVisible(true); } }); this.input.on('pointermove', (p) => { if (this.isTouching && p.id === this.touchId && p.x < this.cameras.main.width / 2) { this.touchPosition.x = p.x; this.touchPosition.y = p.y; const bX = this.touchIndicator.x; const bY = this.touchIndicator.y; let dx = p.x - bX; let dy = p.y - bY; const dist = Math.sqrt(dx*dx + dy*dy); const maxD = 40; if (dist > maxD) { dx *= maxD / dist; dy *= maxD / dist; } this.touchStick.setPosition(bX + dx, bY + dy); } }); this.input.on('pointerup', (p) => { if (p.id === this.touchId) { this.isTouching = false; this.touchId = -1; this.touchIndicator.setVisible(false); this.touchStick.setVisible(false); } }); this.rightHalf = this.add.zone(this.cameras.main.width / 2, 0, this.cameras.main.width / 2, this.cameras.main.height).setOrigin(0).setScrollFactor(0).setInteractive(); this.rightHalf.on('pointerdown', (p) => { if (p.id !== this.touchId && this.dodgeCount > 0) { this.performDodge(); } }); this.autoShootTimerEvent = this.time.addEvent({ delay: 500, callback: this.autoShoot, callbackScope: this, loop: true }); }
  fireProjectiles(angle) { const cS = this.upgrades.splitShot; const sA = Math.PI / 12; const fD = 10 * this.damageMultiplier; const pS = 300; const fireSet = (delay = 0) => { this.time.delayedCall(delay, () => { if (!this.player.active) return; const pC = this.projectiles.create(this.player.x, this.player.y, "projectile"); if (!pC) return; pC.setVelocity(Math.cos(angle) * pS, Math.sin(angle) * pS); pC.damage = fD; pC.body.onWorldBounds = true; for (let i = 1; i <= cS; i++) { const aL = angle - i * sA; const pL = this.projectiles.create(this.player.x, this.player.y, "projectile"); if (!pL) continue; pL.setVelocity(Math.cos(aL) * pS, Math.sin(aL) * pS); pL.damage = fD; pL.body.onWorldBounds = true; const aR = angle + i * sA; const pR = this.projectiles.create(this.player.x, this.player.y, "projectile"); if (!pR) continue; pR.setVelocity(Math.cos(aR) * pS, Math.sin(aR) * pS); pR.damage = fD; pR.body.onWorldBounds = true; } }); }; fireSet(); if (this.upgrades.doubleShot > 0) { fireSet(100); } this.sounds.shot.play(); }
  onBossDefeated() { this.clearedRooms.add(`${this.currentRoom.x},${this.currentRoom.y}`); this.roomActive = false; this.sounds.upgrade.play(); if (this.currentWorld < this.maxWorlds) { this.currentWorld++; this.worldText.setText(`World: ${this.currentWorld}`); this.nextLevelText.setText(`Going to next level in 5...`).setVisible(true); let count = 5; if (this.countdownEvent) this.countdownEvent.remove(); this.countdownEvent = this.time.addEvent({ delay: 1000, repeat: 4, callback: () => { count--; this.nextLevelText.setText(`Going to next level in ${count}...`); if (count === 0) { this.nextLevelText.setVisible(false); this.generateWorldMap(); this.entryDoorDirection = null; this.loadRoom(0, 0); } } }); } else { this.cameras.main.fadeOut(1000, 0, 0, 0); this.time.delayedCall(1000, () => { const vic = this.add.text(400, 300, "Victory! You have conquered The Forsaken Depths!", { font: "24px Arial", fill: "#ffffff", backgroundColor: "#000000", padding: { x: 20, y: 10 }, align: 'center', wordWrap: { width: 600 } }).setOrigin(0.5).setDepth(200).setScrollFactor(0); this.time.delayedCall(5000, () => { this.scene.start("TitleScene"); }); }); } }
  autoShoot() { if (!this.isMobile || !this.player.active || this.time.now < this.lastShootTime + this.shootCooldown) return; let cE = null; let mDSq = 300 * 300; this.enemies.getChildren().forEach(e => { if (!e.active) return; const dSq = Phaser.Math.Distance.Squared(this.player.x, this.player.y, e.x, e.y); if (dSq < mDSq) { mDSq = dSq; cE = e; } }); if (cE) { const angle = Phaser.Math.Angle.Between( this.player.x, this.player.y, cE.x, cE.y ); this.fireProjectiles(angle); this.lastShootTime = this.time.now; } }
  createPowerupIcons() { this.powerupsText = this.add.text(100, 500, "Powerups:", { font: "20px Arial", fill: "#fff" }).setDepth(101).setScrollFactor(0); this.ui.add(this.powerupsText); this.powerupContainer = this.add.container(100, 535).setDepth(101).setScrollFactor(0); this.ui.add(this.powerupContainer); }
  updatePowerupIcons() { if (!this.powerupContainer) return; this.powerupContainer.removeAll(true); const iC = [ { c: this.upgrades.damage, i: "damage_icon" }, { c: this.upgrades.speed, i: "speed_icon" }, { c: this.upgrades.hp, i: "hp_icon" }, { c: this.upgrades.doubleShot, i: "doubleshot_icon" }, { c: this.upgrades.splitShot, i: "splitshot_icon" } ]; let xO = 0; const iS = 32; const gap = 8; const mPR = 8; let cY = 0; let iR = 0; iC.forEach(config => { if (config.c > 0) { for (let i = 0; i < config.c; i++) { if (iR >= mPR) { xO = 0; cY += iS + gap; iR = 0; } const icon = this.add.image(xO, cY, config.i).setOrigin(0, 0).setScale(0.8); this.powerupContainer.add(icon); xO += (iS * 0.8) + gap; iR++; } } }); }
  generateWorldMap() { this.roomMap = {}; this.visitedRooms = {}; this.clearedRooms = new Set(); this.roomMap["0,0"] = { type: "start", doors: {}, depth: 0, variation: 0 }; this.visitedRooms["0,0"] = true; let cP = { x: 0, y: 0 }; let pL = 0; const mP = 3; const xP = 6; let bRK = null; while (pL < xP) { const pD = Phaser.Utils.Array.Shuffle([ { dx: 0, dy: -1, dir: "up", opp: "down" }, { dx: 1, dy: 0, dir: "right", opp: "left" }, { dx: 0, dy: 1, dir: "down", opp: "up" }, { dx: -1, dy: 0, dir: "left", opp: "right" }, ]); let moved = false; for (const move of pD) { const nX = cP.x + move.dx; const nY = cP.y + move.dy; const nK = `${nX},${nY}`; const cK = `${cP.x},${cP.y}`; if (!this.roomMap[nK]) { this.roomMap[nK] = { type: "normal", doors: {}, depth: pL + 1, variation: Phaser.Math.Between(1, 2) }; this.roomMap[cK].doors[move.dir] = nK; this.roomMap[nK].doors[move.opp] = cK; cP = { x: nX, y: nY }; pL++; bRK = nK; moved = true; break; } } if (!moved || pL >= xP) break; } if (bRK) { this.roomMap[bRK].type = "boss"; } else if (pL === 0) { bRK = "1,0"; this.roomMap[bRK] = { type: "boss", doors: {"left": "0,0"}, depth: 1, variation: 0 }; this.roomMap["0,0"].doors["right"] = bRK; } const nRK = Object.keys(this.roomMap).filter( (k) => k !== "0,0" && k !== bRK && this.roomMap[k].type === "normal" ); if (nRK.length > 0) { const sK = Phaser.Utils.Array.GetRandom(nRK); this.roomMap[sK].type = "shop"; } const mB = 2; let bA = 0; const pBS = Object.keys(this.roomMap).filter(k => k !== bRK); for (let i = 0; i < pBS.length && bA < mB; i++) { const bK = Phaser.Utils.Array.GetRandom(pBS); pBS.splice(pBS.indexOf(bK), 1); const bR = this.roomMap[bK]; if (Object.keys(bR.doors).length < 3) { const [bX, bY] = bK.split(",").map(Number); const pD2 = Phaser.Utils.Array.Shuffle([ { dx: 0, dy: -1, dir: "up", opp: "down" }, { dx: 1, dy: 0, dir: "right", opp: "left" }, { dx: 0, dy: 1, dir: "down", opp: "up" }, { dx: -1, dy: 0, dir: "left", opp: "right" }, ]); for (const move of pD2) { const nX = bX + move.dx; const nY = bY + move.dy; const nK = `${nX},${nY}`; if (!this.roomMap[nK] && !bR.doors[move.dir]) { this.roomMap[nK] = { type: "normal", doors: {}, depth: bR.depth + 1, variation: Phaser.Math.Between(1, 2) }; bR.doors[move.dir] = nK; this.roomMap[nK].doors[move.opp] = bK; bA++; break; } } } } }
  loadRoom(x, y, entryDirection = null) { if (this.shopIcons) { this.shopIcons.forEach((g) => { if (g.sprite) g.sprite.destroy(); if (g.text) g.text.destroy(); if (g.desc) g.desc.destroy(); }); this.shopIcons = null; } this.enemies.getChildren().forEach(e => { if (e.getData('shadow')) e.getData('shadow').destroy(); }); this.enemies.clear(true, true); this.enemyProj.clear(true, true); this.innerWalls.clear(true, true); this.walls.clear(true, true); this.doors.clear(true, true); this.projectiles.clear(true, true); this.pickups.clear(true, true); if (this.colliders) { this.colliders.forEach(c => { if (c && c.active) c.destroy(); }); this.colliders = []; } else { this.colliders = []; } this.enemyPathData.clear(); this.doorPrompt.setVisible(false); this.shopPrompt.setVisible(false); this.inTransition = false; this.currentRoom = { x, y }; this.entryDoorDirection = entryDirection; const rK = `${x},${y}`; if (!this.roomMap[rK]) { console.error(`Room ${rK} not found!`); this.loadRoom(0, 0); return; } const cRD = this.roomMap[rK]; cRD.visited = true; this.visitedRooms[rK] = true; const isC = this.clearedRooms.has(rK); this.roomActive = (cRD.type === 'normal' || cRD.type === 'boss') && !isC; this.createRoomLayout(rK, cRD); switch (cRD.type) { case "shop": this.createShopRoom(); this.roomActive = false; break; case "boss": if (!isC) this.createBossRoom(); break; case "normal": if (!isC) this.createNormalRoom(); break; case "start": this.roomActive = false; break; } this.createDoors(cRD); this.setupPathfindingGrid(); this.setupColliders(); this.updateMinimap(); this.updateHearts(); }
  createRoomLayout(key, roomData) { if (this.background) this.background.destroy(); this.background = this.add.image(400, 300, "bg").setDepth(-10); this.background.setScale(Math.max(this.sys.game.config.width / this.background.width, this.sys.game.config.height / this.background.height)); const { x1, y1, x2, y2 } = this.playArea; const wT = `wall${this.currentWorld}`; const wTh = 32; this.walls.create(400, y1 - wTh / 2, wT).setOrigin(0.5).setDisplaySize(x2 - x1 + wTh * 2, wTh).refreshBody(); this.walls.create(400, y2 + wTh / 2, wT).setOrigin(0.5).setDisplaySize(x2 - x1 + wTh * 2, wTh).refreshBody(); this.walls.create(x1 - wTh / 2, 300, wT).setOrigin(0.5).setDisplaySize(wTh, y2 - y1 + wTh * 2).refreshBody(); this.walls.create(x2 + wTh / 2, 300, wT).setOrigin(0.5).setDisplaySize(wTh, y2 - y1 + wTh * 2).refreshBody(); const variation = roomData.variation; const iWS = 64; switch (variation) { case 1: this.innerWalls.create(400, 300, wT).setOrigin(0.5).setDisplaySize(iWS * 4, iWS * 0.5).refreshBody(); this.innerWalls.create(400, 300, wT).setOrigin(0.5).setDisplaySize(iWS * 0.5, iWS * 4).refreshBody(); break; case 2: this.innerWalls.create(x1 + iWS * 1.5, y1 + iWS * 1.5, wT).setOrigin(0.5).setDisplaySize(iWS, iWS).refreshBody(); this.innerWalls.create(x2 - iWS * 1.5, y1 + iWS * 1.5, wT).setOrigin(0.5).setDisplaySize(iWS, iWS).refreshBody(); this.innerWalls.create(x1 + iWS * 1.5, y2 - iWS * 1.5, wT).setOrigin(0.5).setDisplaySize(iWS, iWS).refreshBody(); this.innerWalls.create(x2 - iWS * 1.5, y2 - iWS * 1.5, wT).setOrigin(0.5).setDisplaySize(iWS, iWS).refreshBody(); break; } }
  createDoors(roomData) { const { x1, y1, x2, y2 } = this.playArea; const dD = roomData.doors; const dS = 48; const vO = 5; Object.entries(dD).forEach(([dir, tRK]) => { let dX = 400, dY = 300; let dTex = "door"; switch (dir) { case 'up': dY = y1 + vO; break; case 'down': dY = y2 - vO; break; case 'left': dX = x1 + vO; break; case 'right': dX = x2 - vO; break; } const sBC = this.roomActive; if (sBC) { dTex = "door_closed"; } const door = this.doors.create(dX, dY, dTex).setDepth(1).setImmovable(true); door.body.setSize(dS * 0.7, dS * 0.7); door.setDisplaySize(dS, dS); door.direction = dir; door.targetRoom = tRK; door.isOpen = !sBC; door.collider = null; }); }
  openDoor(door) { if (door && !door.isOpen) { door.setTexture("door"); door.isOpen = true; if (door.collider) { if (door.collider.active && this.physics.world.colliders.getActive().includes(door.collider)) { door.collider.destroy(); } const index = this.colliders.indexOf(door.collider); if (index > -1) { this.colliders.splice(index, 1); } door.collider = null; } } }
  openAllDoors() { this.doors.getChildren().forEach(door => { this.openDoor(door); }); }
  createNormalRoom() { const pE = this.worldEnemies[this.currentWorld] || ["blob"]; const eC = Phaser.Math.Between(3, 5); let eDP = null; const { x1, y1, x2, y2 } = this.playArea; const sSDS = 150 * 150; if (this.entryDoorDirection) { switch (this.entryDoorDirection) { case 'up': eDP = { x: 400, y: y1 + 30 }; break; case 'down': eDP = { x: 400, y: y2 - 30 }; break; case 'left': eDP = { x: x1 + 30, y: 300 }; break; case 'right': eDP = { x: x2 - 30, y: 300 }; break; } } for (let i = 0; i < eC; i++) { const eT = Phaser.Utils.Array.GetRandom(pE); let sX, sY, dSFD, dSFC; let att = 0; const maxAtt = 20; do { sX = Phaser.Math.Between(this.playArea.x1 + 50, this.playArea.x2 - 50); sY = Phaser.Math.Between(this.playArea.y1 + 50, this.playArea.y2 - 50); dSFD = eDP ? Phaser.Math.Distance.Squared(sX, sY, eDP.x, eDP.y) : sSDS + 1; dSFC = Phaser.Math.Distance.Squared(sX, sY, 400, 300); att++; } while ((dSFD < sSDS || dSFC < 100*100) && att < maxAtt); if (att >= maxAtt) { console.warn("Could not find ideal spawn position for enemy."); } this.createEnemy(sX, sY, eT); } this.roomActive = true; }
  createEnemy(x, y, type) { const enemy = this.enemies.create(x, y, type); if (!enemy || !enemy.body) return null; const bS = { blob: { h: 30, s: 80, sC: 2000, d: 1 }, bee: { h: 25, s: 150, sC: 0, d: 1 }, witch: { h: 45, s: 0, sC: 3500, d: 1, tD: 100, kD: 400, hD: 500 }, quasit: { h: 40, s: 110, sC: 1800, d: 1 }, orc: { h: 60, s: 90, sC: 0, cPT: 1000, cD: 500, cS: 250, d: 2 }, wizard: { h: 40, s: 70, sC: 1500, d: 1, fD: 150, eD: 250 }, shapeshifter: { h: 50, s: 120, sC: 2500, d: 1, bCT: 3000 }, }; const stats = bS[type] || bS.blob; enemy.health = this.hardMode ? Math.ceil(stats.h * 1.5) : stats.h; enemy.maxHealth = enemy.health; enemy.speed = stats.s; enemy.type = type; enemy.shootCooldown = stats.sC; enemy.lastShootTime = this.time.now + Phaser.Math.Between(500, stats.sC || 2000); enemy.damage = stats.d; enemy.isPreparingCharge = false; enemy.isCharging = false; enemy.chargePrepareTime = stats.cPT; enemy.chargeDuration = stats.cD; enemy.chargeSpeed = stats.cS; enemy.lastChargeAttempt = 0; enemy.chargeCooldown = 4000; enemy.fleeDistance = stats.fD; enemy.engageDistance = stats.eD; enemy.behaviorTimer = 0; enemy.behaviorChangeTime = stats.bCT; enemy.currentBehavior = 'chase'; enemy.isTeleporting = false; enemy.teleportDelay = stats.tD; enemy.shootDelay = stats.hD; enemy.shakeDuration = stats.kD; enemy.setCollideWorldBounds(true); enemy.body.onWorldBounds = true; enemy.body.setSize(enemy.width * 0.8, enemy.height * 0.8); enemy.id = Phaser.Utils.String.UUID(); if (type === 'bee') { const shadow = this.add.ellipse(x, y + 10, enemy.width * 0.6, enemy.width * 0.25, 0x000000, 0.4).setDepth(enemy.depth - 1); enemy.setData('shadow', shadow); this.tweens.add({ targets: enemy, y: y - 6, duration: 1200, ease: 'Sine.easeInOut', yoyo: true, repeat: -1 }); } return enemy; }
  updateEnemy(enemy, time, delta) { if (!enemy.active || !this.player.active) return; const dx = this.player.x - enemy.x; const dy = this.player.y - enemy.y; const distSq = dx * dx + dy * dy; const dist = Math.sqrt(distSq); const stopDist = 50; const stopDistSq = stopDist * stopDist; const pD = this.enemyPathData.get(enemy.id); let tX = this.player.x; let tY = this.player.y; let mAP = false; if (pD && pD.path && pD.targetNodeIndex < pD.path.length) { const tN = pD.path[pD.targetNodeIndex]; const nWP = this.getWorldCoordinates(tN.x, tN.y); tX = nWP.x; tY = nWP.y; mAP = true; const dSq = Phaser.Math.Distance.Squared(enemy.x, enemy.y, tX, tY); if (dSq < (this.gridCellSize / 1.5) * (this.gridCellSize / 1.5)) { pD.targetNodeIndex++; if (pD.targetNodeIndex >= pD.path.length) { this.enemyPathData.set(enemy.id, { path: null, targetNodeIndex: -1 }); mAP = false; tX = this.player.x; tY = this.player.y; } else { const nN = pD.path[pD.targetNodeIndex]; const nNWP = this.getWorldCoordinates(nN.x, nN.y); tX = nNWP.x; tY = nNWP.y; } } } else { tX = this.player.x; tY = this.player.y; mAP = false; } switch (enemy.type) { case "boss": if (enemy.updateAttack) enemy.updateAttack(time); if (!enemy.isCharging && !enemy.isPreparingCharge) { if (dist > 150) { this.physics.moveTo(enemy, tX, tY, enemy.speed * 0.5); } else { enemy.setVelocity(0, 0); } } break; case "witch": enemy.setVelocity(0, 0); if (!enemy.isTeleporting && time > enemy.lastShootTime + enemy.shootCooldown) { enemy.isTeleporting = true; enemy.lastShootTime = time; enemy.setTint(0xff00ff); this.tweens.add({ targets: enemy, scaleX: enemy.scaleX * 1.1, scaleY: enemy.scaleY * 0.9, angle: Phaser.Math.Between(-10, 10), duration: 50, yoyo: true, repeat: Math.floor(enemy.shakeDuration / 100) - 1, onComplete: () => { if (!enemy.active) return; enemy.setScale(1); enemy.setAngle(0); enemy.clearTint(); this.time.delayedCall(enemy.teleportDelay, () => { if (!enemy.active) return; let tx, ty, att = 0; const maxAtt = 15; do { const angle = Math.random() * Math.PI * 2; const radius = Phaser.Math.Between(100, 250); tx = this.player.x + Math.cos(angle) * radius; ty = this.player.y + Math.sin(angle) * radius; att++; } while (att < maxAtt && (!this.isWalkableAt(tx, ty) || Phaser.Math.Distance.Squared(tx, ty, this.player.x, this.player.y) < 50*50)); if (att >= maxAtt) { console.warn("Witch couldn't find valid teleport spot."); tx = Phaser.Math.Clamp(enemy.x + Phaser.Math.Between(-50, 50), this.playArea.x1, this.playArea.x2); ty = Phaser.Math.Clamp(enemy.y + Phaser.Math.Between(-50, 50), this.playArea.y1, this.playArea.y2); } enemy.x = Phaser.Math.Clamp(tx, this.playArea.x1 + enemy.width/2, this.playArea.x2 - enemy.width/2); enemy.y = Phaser.Math.Clamp(ty, this.playArea.y1 + enemy.height/2, this.playArea.y2 - enemy.height/2); enemy.alpha = 0.3; this.tweens.add({ targets: enemy, alpha: 1, duration: 150 }); this.tweens.add({ targets: enemy, scaleX: enemy.scaleX * 1.1, scaleY: enemy.scaleY * 0.9, angle: Phaser.Math.Between(-5, 5), duration: 40, yoyo: true, repeat: 3, onComplete: () => { if(enemy.active) { enemy.setScale(1); enemy.setAngle(0); } } }); this.time.delayedCall(enemy.shootDelay, () => { if (enemy.active && this.player.active) { this.shootEnemyProjectile(enemy, this.player.x, this.player.y); } enemy.isTeleporting = false; }); }); } }); } break; case "wizard": if (distSq < enemy.fleeDistance * enemy.fleeDistance) { this.physics.velocityFromAngle(Phaser.Math.Angle.Between(this.player.x, this.player.y, enemy.x, enemy.y), enemy.speed, enemy.body.velocity); } else if (distSq > enemy.engageDistance * enemy.engageDistance) { if (mAP || dist > stopDist + 20) { this.physics.moveTo(enemy, tX, tY, enemy.speed * 0.5); } else { enemy.setVelocity(0, 0); } } else { enemy.setVelocity(0, 0); if (time > enemy.lastShootTime + enemy.shootCooldown) { this.shootEnemyProjectile(enemy, this.player.x, this.player.y); enemy.lastShootTime = time; } } break; case "orc": if (enemy.isCharging || enemy.isPreparingCharge) { this.processChargingState(enemy, time); } else if (distSq < 150 * 150 && time > enemy.lastChargeAttempt + enemy.chargeCooldown) { enemy.isPreparingCharge = true; enemy.chargeStartTime = time; enemy.lastChargeAttempt = time; enemy.setVelocity(0, 0); enemy.setTint(0xffff00); } else { if (mAP || dist > stopDist + 20) { this.physics.moveTo(enemy, tX, tY, enemy.speed); } else { enemy.setVelocity(0, 0); } } break;
        case "bee":
            if (mAP) { // Prioritize path following
                const angleToNode = Phaser.Math.Angle.Between(enemy.x, enemy.y, tX, tY);
                this.physics.velocityFromAngle(angleToNode, enemy.speed, enemy.body.velocity);
            } else if (dist > stopDist - 10) { // Only chase directly if NO path and far away
                 this.physics.moveToObject(enemy, this.player, enemy.speed);
            } else { // Close and no path, stop
                enemy.setVelocity(0,0);
            }
            const shadow = enemy.getData('shadow');
            if (shadow && shadow.active) { shadow.setPosition(enemy.x, enemy.y + 10); shadow.setDepth(enemy.depth - 1); }
            break;
        case "shapeshifter": if (time > enemy.behaviorTimer) { const b = ['chase', 'flee', 'shoot', 'circle']; enemy.currentBehavior = Phaser.Utils.Array.GetRandom(b); enemy.behaviorTimer = time + enemy.behaviorChangeTime; enemy.setVelocity(0,0); } switch (enemy.currentBehavior) { case 'chase': if (mAP || dist > stopDist) { this.physics.moveTo(enemy, tX, tY, enemy.speed); } else { enemy.setVelocity(0, 0); } break; case 'flee': if (distSq < 300 * 300) { this.physics.velocityFromAngle(Phaser.Math.Angle.Between(this.player.x, this.player.y, enemy.x, enemy.y), enemy.speed, enemy.body.velocity); } else { enemy.setVelocity(0, 0); } break; case 'shoot': enemy.setVelocity(0, 0); if (time > enemy.lastShootTime + enemy.shootCooldown) { this.shootEnemyProjectile(enemy, this.player.x, this.player.y); enemy.lastShootTime = time; } break; case 'circle': const cS = enemy.speed * 0.8; const dD = 150; if (dist > dD + 20) { this.physics.moveTo(enemy, this.player.x, this.player.y, cS); } else if (dist < dD - 20) { this.physics.velocityFromAngle(Phaser.Math.Angle.Between(this.player.x, this.player.y, enemy.x, enemy.y), cS, enemy.body.velocity); } else { const aO = Math.PI / 2; const tA = Math.atan2(dy, dx); const cA = tA + aO; enemy.setVelocity(Math.cos(cA) * cS, Math.sin(cA) * cS); } break; } break; case "blob": default: if (mAP || dist > stopDist) { this.physics.moveTo(enemy, tX, tY, enemy.speed); } else { enemy.setVelocity(0, 0); } if (enemy.shootCooldown && time > enemy.lastShootTime + enemy.shootCooldown) { this.shootEnemyProjectile(enemy, this.player.x, this.player.y); enemy.lastShootTime = time; } break; } }
  createBossRoom() { const bT = { 1: { s: 'boss1', h: 200, sp: 80, p: ['circle', 'targeted'], aD: 2500, pS: 150 }, 2: { s: 'boss2', h: 250, sp: 90, p: ['charge', 'spread'], aD: 3000, pS: 180, cPT: 1000, cD: 600, cS: 300 }, 3: { s: 'boss3', h: 300, sp: 100, p: ['split', 'wave', 'summon_blob'], aD: 2800, pS: 200, sD: 800 }, 4: { s: 'boss4', h: 350, sp: 110, p: ['spiral', 'charge', 'targeted_fast'], aD: 2000, pS: 220, sC: 5, cPT: 800, cD: 500, cS: 350 }, 5: { s: 'boss5', h: 400, sp: 120, p: ['waves', 'split', 'summon_bee'], aD: 2600, pS: 240, wC: 5, wS: Math.PI / 3, sD: 700 }, 6: { s: 'boss', h: 500, sp: 100, p: ['combo', 'charge', 'summon_wizard', 'spiral_fast'], aD: 2400, pS: 210, cPT: 900, cD: 550, cS: 320, sC: 7 } }; const bC = bT[this.currentWorld] || bT[1]; const boss = this.enemies.create(400, 150, bC.s); if (!boss || !boss.body) return; boss.setScale(2); boss.health = this.hardMode ? Math.ceil(bC.h * 1.5) : bC.h; boss.maxHealth = boss.health; boss.speed = bC.sp; boss.type = 'boss'; boss.attackDelay = bC.aD; boss.projectileSpeed = bC.pS; boss.lastAttackTime = this.time.now + 1500; boss.attackPhase = 0; boss.chargePrepareTime = bC.cPT; boss.chargeDuration = bC.cD; boss.chargeSpeed = bC.cS; boss.isPreparingCharge = false; boss.isCharging = false; boss.splitDelay = bC.sD; boss.spiralCount = bC.sC; boss.waveCount = bC.wC; boss.waveSpread = bC.wS; boss.setCollideWorldBounds(true); boss.body.onWorldBounds = true; boss.setImmovable(true); boss.body.setSize(boss.width * 0.7, boss.height * 0.7); boss.id = Phaser.Utils.String.UUID(); boss.attackFunctions = { 'circle': this.bossAttack_CircleShot, 'targeted': this.bossAttack_SingleTargeted, 'targeted_fast': this.bossAttack_SingleTargetedFast, 'charge': this.bossAttack_Charge, 'spread': this.bossAttack_ShotgunSpread, 'split': this.bossAttack_SplitShot, 'wave': this.bossAttack_WaveShot, 'spiral': this.bossAttack_SpiralShot, 'spiral_fast': this.bossAttack_SpiralShotFast, 'summon_blob': (b, t) => this.bossAttack_SummonMinions(b, t, 'blob', 2), 'summon_bee': (b, t) => this.bossAttack_SummonMinions(b, t, 'bee', 3), 'summon_wizard': (b, t) => this.bossAttack_SummonMinions(b, t, 'wizard', 1), 'combo': this.bossAttack_Combo }; boss.availablePatterns = bC.p || ['circle']; boss.currentAttackIndex = Phaser.Math.Between(0, boss.availablePatterns.length - 1); boss.updateAttack = (time) => { if (!boss.active || !this.player.active) return; if (boss.isCharging || boss.isPreparingCharge) { this.processChargingState(boss, time); return; } if (time < boss.lastAttackTime + boss.attackDelay) return; const pN = boss.availablePatterns[boss.currentAttackIndex]; const aF = boss.attackFunctions[pN]; if (aF) { aF.call(this, boss, time); } else { console.warn(`Boss attack pattern ${pN} not found!`); this.bossAttack_CircleShot(boss, time); } boss.currentAttackIndex = Phaser.Math.Between(0, boss.availablePatterns.length - 1); boss.lastAttackTime = time; }; this.roomActive = true; }
  bossAttack_CircleShot(boss, time) { const c=8,I=0.005,d=200; for(let i=0;i<c;i++){const a=(i/c)*Math.PI*2+boss.attackPhase;this.createBossProjectile(boss.x,boss.y,Math.cos(a)*boss.projectileSpeed,Math.sin(a)*boss.projectileSpeed);} boss.attackPhase+=Math.PI/16; this.shake(I,d); }
  bossAttack_SingleTargeted(boss, time) { const I=0.003,d=150; if(this.player.active){const a=Phaser.Math.Angle.Between(boss.x,boss.y,this.player.x,this.player.y);this.createBossProjectile(boss.x,boss.y,Math.cos(a)*boss.projectileSpeed*1.2,Math.sin(a)*boss.projectileSpeed*1.2);} this.shake(I,d); }
  bossAttack_SingleTargetedFast(boss, time) { const I=0.004,d=100; if(this.player.active){const a=Phaser.Math.Angle.Between(boss.x,boss.y,this.player.x,this.player.y);this.createBossProjectile(boss.x,boss.y,Math.cos(a)*boss.projectileSpeed*1.5,Math.sin(a)*boss.projectileSpeed*1.5);} this.shake(I,d); }
  bossAttack_Charge(boss, time) { if(!boss.isCharging&&!boss.isPreparingCharge){boss.isPreparingCharge=true;boss.chargeStartTime=time;boss.setVelocity(0,0);boss.setTint(0xffa500);} }
  bossAttack_ShotgunSpread(boss, time) { const I=0.006,d=250,c=5,sA=Math.PI/12; if(this.player.active){const bA=Phaser.Math.Angle.Between(boss.x,boss.y,this.player.x,this.player.y);for(let i=0;i<c;i++){const a=bA+(i-(c-1)/2)*(sA/(c>1?c-1:1));this.createBossProjectile(boss.x,boss.y,Math.cos(a)*boss.projectileSpeed*0.9,Math.sin(a)*boss.projectileSpeed*0.9);}} this.shake(I,d); }
  bossAttack_SplitShot(boss, time) { const I=0.007,d=280,sAs=[0,Math.PI/2,Math.PI,(3*Math.PI)/2]; sAs.forEach(angle=>{const p=this.createBossProjectile(boss.x,boss.y,Math.cos(angle)*boss.projectileSpeed,Math.sin(angle)*boss.projectileSpeed);if(p){this.time.delayedCall(boss.splitDelay||800,()=>{if(p.active){const sC=3;for(let i=0;i<sC;i++){const sA=angle+(i-1)*(Math.PI/6);this.createBossProjectile(p.x,p.y,Math.cos(sA)*boss.projectileSpeed*0.7,Math.sin(sA)*boss.projectileSpeed*0.7);} p.destroy();}});}}); this.shake(I,d); }
  bossAttack_WaveShot(boss, time) { const I=0.007,d=260,wC=boss.waveCount||5,wS=boss.waveSpread||Math.PI/3; if(this.player.active){const bA=Phaser.Math.Angle.Between(boss.x,boss.y,this.player.x,this.player.y);for(let i=0;i<wC;i++){const o=(i-(wC-1)/2)*(wS/(wC>1?wC-1:1));const a=bA+o;this.createBossProjectile(boss.x,boss.y,Math.cos(a)*boss.projectileSpeed,Math.sin(a)*boss.projectileSpeed);}} this.shake(I,d); }
  bossAttack_SpiralShot(boss, time) { const I=0.004,d=200,sC=boss.spiralCount||5; for(let i=0;i<sC;i++){const sA=boss.attackPhase+(i*Math.PI*2/sC);this.createBossProjectile(boss.x,boss.y,Math.cos(sA)*boss.projectileSpeed,Math.sin(sA)*boss.projectileSpeed);} boss.attackPhase+=Math.PI/12; this.shake(I,d); }
  bossAttack_SpiralShotFast(boss, time) { const I=0.005,d=150,sC=boss.spiralCount||7; for(let i=0;i<sC;i++){const sA=boss.attackPhase+(i*Math.PI*2/sC);this.createBossProjectile(boss.x,boss.y,Math.cos(sA)*boss.projectileSpeed*1.1,Math.sin(sA)*boss.projectileSpeed*1.1);} boss.attackPhase+=Math.PI/8; this.shake(I,d); }
  bossAttack_SummonMinions(boss, time, minionType, count) { const I=0.01,d=400; for(let i=0;i<count;i++){const angle=(i/count)*Math.PI*2+Math.random()*0.5;const radius=80+Math.random()*20;const spawnX=boss.x+Math.cos(angle)*radius;const spawnY=boss.y+Math.sin(angle)*radius;this.time.delayedCall(i*150,()=>{const cX=Phaser.Math.Clamp(spawnX,this.playArea.x1+20,this.playArea.x2-20);const cY=Phaser.Math.Clamp(spawnY,this.playArea.y1+20,this.playArea.y2-20);this.createEnemy(cX,cY,minionType);});} this.shake(I,d); }
  bossAttack_Combo(boss, time) { this.bossAttack_CircleShot(boss,time); this.time.delayedCall(500,()=>{if(boss.active){this.bossAttack_SingleTargetedFast(boss,time);}}); this.time.delayedCall(1000,()=>{}); }
  shootEnemyProjectile(enemy, targetX, targetY) { if (!enemy.active) return; const angle = Phaser.Math.Angle.Between(enemy.x, enemy.y, targetX, targetY); let speed = 150; let texture = 'blob_projectile'; let scale = 1; switch (enemy.type) { case 'wizard': texture = 'wizard_projectile'; speed = 200; scale = 1.1; break; case 'witch': texture = 'witch_projectile'; speed = 180; scale = 1.2; break; case 'quasit': texture = 'quasit_projectile'; speed = 160; scale = 1; break; case 'blob': case 'shapeshifter': texture = 'blob_projectile'; speed = 150; scale = 1; break; } const proj = this.enemyProj.create(enemy.x, enemy.y, texture); if (!proj) return; proj.setScale(scale); proj.setVelocity(Math.cos(angle) * speed, Math.sin(angle) * speed); proj.damage = enemy.damage; proj.body.onWorldBounds = true; }
  onHitEnemy(proj, enemy) { if (!proj.active || !enemy.active) return; enemy.setTint(0xff0000); this.time.delayedCall(100, () => { if (enemy.active) enemy.clearTint(); }); enemy.health -= proj.damage; proj.destroy(); if (enemy.health <= 0) { if (enemy.type === 'bee') { const shadow = enemy.getData('shadow'); if (shadow) shadow.destroy(); } this.enemyPathData.delete(enemy.id); enemy.destroy(); if (enemy.type === "boss") { this.dropRandomUpgrade(enemy.x, enemy.y); this.onBossDefeated(); } else { this.coins++; this.coinsText.setText(`Coins: ${this.coins}`); if (Phaser.Math.Between(1, 20) === 1) { /* Drop health? */ } } if (this.roomActive && this.enemies.countActive(true) === 0) { console.log("Room Cleared!"); this.roomActive = false; this.openAllDoors(); this.clearedRooms.add(`${this.currentRoom.x},${this.currentRoom.y}`); } } }
  processChargingState(enemy, time) { if (!enemy.active) return; if (enemy.isPreparingCharge) { if (time > enemy.chargeStartTime + enemy.chargePrepareTime) { enemy.isPreparingCharge = false; enemy.isCharging = true; enemy.chargeEndTime = time + enemy.chargeDuration; const tX = this.player.x; const tY = this.player.y; const angle = Phaser.Math.Angle.Between(enemy.x, enemy.y, tX, tY); enemy.setVelocity( Math.cos(angle) * enemy.chargeSpeed, Math.sin(angle) * enemy.chargeSpeed ); enemy.setTint(0xff0000); } } else if (enemy.isCharging) { if (time > enemy.chargeEndTime) { enemy.isCharging = false; enemy.clearTint(); enemy.setVelocity(0, 0); } } }
  dropRandomUpgrade(x, y) { const UO = [ { k: "hp", i: "hp_icon" }, { k: "damage", i: "damage_icon" }, { k: "speed", i: "speed_icon" }, { k: "doubleShot", i: "doubleshot_icon" }, { k: "splitShot", i: "splitshot_icon" }, { k: "dodge", i: "dodge_icon" }, ]; const cU = Phaser.Utils.Array.GetRandom(UO); const p = this.pickups.create(x, y, cU.i); if (!p) return; p.upgradeType = cU.k; p.setScale(1.2); this.tweens.add({ targets: p, scale: 1.4, yoyo: true, repeat: -1, duration: 500, ease: 'Sine.easeInOut' }); this.tweens.add({ targets: p, y: y - 10, yoyo: true, repeat: -1, duration: 1000, ease: 'Sine.easeInOut' }); }
  onPickup(player, pickup) { if (!pickup.active) return; this.sounds.powerup.play(); switch (pickup.upgradeType) { case "hp": this.player.maxHealth += 2; this.player.health = Math.min(this.player.health + 2, this.player.maxHealth); this.upgrades.hp++; this.updateHearts(); break; case "damage": this.damageMultiplier += 0.3; this.upgrades.damage++; break; case "speed": this.playerSpeed += 20; this.upgrades.speed++; break; case "doubleShot": this.upgrades.doubleShot++; break; case "splitShot": this.upgrades.splitShot++; break; case "dodge": if (this.upgrades.dodge < 5) { this.upgrades.dodge++; this.dodgeCount++; this.dodgeCooldowns.push(null); } else { this.coins += 5; this.coinsText.setText(`Coins: ${this.coins}`); this.showTempMessage("Max Dodges Reached! +5 Coins"); } break; } this.updatePowerupIcons(); pickup.destroy(); }
  createShopRoom() { const sI = [ { k: 'hp', n: 'Max Health +2', i: 'hp_icon', c: 5, t: 'upgrade', d: '+2 max health' }, { k: 'damage', n: 'Damage Up', i: 'damage_icon', c: 10, t: 'upgrade', d: '+0.3 damage mult' }, { k: 'speed', n: 'Speed Up', i: 'speed_icon', c: 5, t: 'upgrade', d: '+20 move speed' }, { k: 'doubleShot', n: 'Double Shot', i: 'doubleshot_icon', c: 15, t: 'upgrade', d: 'Fire second volley' }, { k: 'splitShot', n: 'Split Shot +1', i: 'splitshot_icon', c: 15, t: 'upgrade', d: '+1 proj per side' }, { k: 'dodge', n: 'Extra Dodge', i: 'dodge_icon', c: 10, t: 'upgrade', d: '+1 dodge charge' }, { k: 'heal', n: 'Health Potion', i: 'hp_icon', c: 5, t: 'consumable', d: 'Restore 2 health' } ]; const sel = Phaser.Utils.Array.Shuffle(sI).slice(0, 3); this.shopIcons = []; sel.forEach((item, i) => { const x = 250 + i * 150; const y = 300; const sprite = this.add.image(x, y, item.i).setScale(1.5).setInteractive({ useHandCursor: true }); const text = this.add.text(x, y + 50, `${item.n}\nCost: ${item.c}`, { font: '16px Arial', fill: '#fff', align: 'center', backgroundColor: '#000a', padding: { x: 5, y: 2 } }).setOrigin(0.5); const desc = this.add.text(x, y + 90, item.d, { font: '12px Arial', fill: '#bbb', align: 'center', wordWrap: { width: 120 } }).setOrigin(0.5); const iG = { sprite, text, desc, itemData: item }; this.shopIcons.push(iG); sprite.on('pointerdown', () => { if (this.coins >= item.c) { this.coins -= item.c; this.coinsText.setText(`Coins: ${this.coins}`); this.sounds.upgrade.play(); if (item.t === 'upgrade') { this.onPickup(this.player, { upgradeType: item.k, active: true, destroy: () => {} }); this.showTempMessage(`Purchased: ${item.n}`); } else if (item.t === 'consumable' && item.k === 'heal') { const hB = this.player.health; this.player.health = Math.min(this.player.maxHealth, this.player.health + 2); const hA = this.player.health - hB; if (hA > 0) { this.updateHearts(); this.showTempMessage(`Healed ${hA} health!`); this.sounds.powerup.play(); } else { this.showTempMessage(`Already at full health!`); } } sprite.disableInteractive().setTint(0x555555); text.setVisible(false); desc.setVisible(false); } else { this.showTempMessage('Not enough coins!'); this.sounds.death.play({volume: 0.3}); } }); if (!this.isMobile) { sprite.on('pointerover', () => desc.setVisible(true)); sprite.on('pointerout', () => desc.setVisible(false)); desc.setVisible(false); } else { desc.setVisible(true); } }); this.shopPrompt.setText('Shop: Tap an item to buy').setPosition(400, 180).setVisible(true); }
  showTempMessage(text) { if (this.tempMessage) { this.tempMessage.destroy(); } const msg = this.add.text(400, 100, text, { font: "24px Arial", fill: "#ffff00", backgroundColor: "#000000a0", padding: { x: 15, y: 8 }, align: 'center' }).setOrigin(0.5).setDepth(200).setScrollFactor(0); this.tempMessage = msg; this.time.delayedCall(3000, () => { if (this.tempMessage === msg) { msg.destroy(); this.tempMessage = null; } }); }
  shake(intensity = 0.005, duration = 100) { this.cameras.main.shake(duration, intensity, false); }
  updateHearts() { const maxH = Math.ceil(this.player.maxHealth / 2); const fullH = Math.floor(this.player.health / 2); const halfH = this.player.health % 2 === 1; this.hearts.forEach((hS, i) => { if (i < maxH) { hS.setVisible(true); if (i < fullH) hS.setTexture("heart_full"); else if (i === fullH && halfH) hS.setTexture("heart_half"); else hS.setTexture("heart_empty"); } else { hS.setVisible(false); } }); }
  resetGame() { this.coins = 0; this.damageMultiplier = 1; this.playerSpeed = 160; this.upgrades = { hp: 0, damage: 0, speed: 0, doubleShot: 0, splitShot: 0, dodge: 2 }; if (this.player) { this.player.health = 6; this.player.maxHealth = 6; } this.dodgeCount = 2; this.dodgeCooldowns = Array(this.upgrades.dodge).fill(null); this.currentWorld = 1; this.hardMode = false; this.clearedRooms = new Set(); this.visitedRooms = {}; this.roomActive = false; this.entryDoorDirection = null; this.enemyPathData.clear(); if (this.coinsText) this.coinsText.setText(`Coins: ${this.coins}`); if (this.worldText) this.worldText.setText(`World: ${this.currentWorld}`); if (this.hearts) this.updateHearts(); if (this.powerupContainer) this.updatePowerupIcons(); }
  transitionToRoom(x, y, direction) { if (this.inTransition) return; this.inTransition = true; const eD = { 'up': 'down', 'down': 'up', 'left': 'right', 'right': 'left' }[direction]; const { x1, y1, x2, y2 } = this.playArea; const offset = 50; let nPX = this.player.x; let nPY = this.player.y; switch (direction) { case "up": nPY = y2 - offset; break; case "down": nPY = y1 + offset; break; case "left": nPX = x2 - offset; break; case "right": nPX = x1 + offset; break; } this.cameras.main.fade(250, 0, 0, 0, false, (cam, prog) => { if (prog === 1) { this.player.setVelocity(0, 0); this.loadRoom(x, y, eD); this.player.setPosition(nPX, nPY); this.cameras.main.fadeIn(250, 0, 0, 0, (c, p) => { if (p === 1) { this.inTransition = false; } }); } }); }
  updateMinimap() { if (!this.minimapObj) { this.minimapObj = this.add.graphics().setDepth(100).setScrollFactor(0); this.ui.add(this.minimapObj); } else { this.minimapObj.clear(); } const cW = 10, cH = 8, cP = 2; const mOX = 650, mOY = 50; const vC = 0xaaaaaa, cC = 0x00ff00, bC = 0xff0000, sC = 0xffff00, uC = 0x555555; let minX = 0, minY = 0; Object.keys(this.visitedRooms).forEach(k => { const [rx, ry] = k.split(",").map(Number); minX = Math.min(minX, rx); minY = Math.min(minY, ry); }); Object.keys(this.visitedRooms).forEach(k => { const rD = this.roomMap[k]; if(rD) { Object.values(rD.doors).forEach(nK => { if (!this.visitedRooms[nK]) { const [nx, ny] = nK.split(",").map(Number); minX = Math.min(minX, nx); minY = Math.min(minY, ny); } }); } }); const drawnKeys = new Set(); Object.keys(this.visitedRooms).forEach(key => { if (drawnKeys.has(key) && key !== `${this.currentRoom.x},${this.currentRoom.y}`) return; const [rx, ry] = key.split(",").map(Number); const roomData = this.roomMap[key]; if (!roomData) return; const dX = mOX + (rx - minX) * (cW + cP); const dY = mOY + (ry - minY) * (cH + cP); let fC = vC; if (roomData.type === 'boss') fC = bC; if (roomData.type === 'shop') fC = sC; if (rx === this.currentRoom.x && ry === this.currentRoom.y) { fC = cC; } this.minimapObj.fillStyle(fC, 0.8); this.minimapObj.fillRect(dX, dY, cW, cH); drawnKeys.add(key); Object.values(roomData.doors).forEach(nK => { if (!this.visitedRooms[nK] && !drawnKeys.has(nK)) { const [nx, ny] = nK.split(",").map(Number); const nDX = mOX + (nx - minX) * (cW + cP); const nDY = mOY + (ny - minY) * (cH + cP); this.minimapObj.fillStyle(uC, 0.6); this.minimapObj.fillRect(nDX, nDY, cW, cH); drawnKeys.add(nK); } }); }); const cDX = mOX + (this.currentRoom.x - minX) * (cW + cP); const cDY = mOY + (this.currentRoom.y - minY) * (cH + cP); this.minimapObj.lineStyle(1, 0xffffff, 1); this.minimapObj.strokeRect(cDX - 1, cDY - 1, cW + 2, cH + 2); }

  update(time, delta) {
    if (!this.player || !this.player.active || this.inTransition) return;

    // Pathfinding Calculation
    this.repathTimer -= delta;
    if (this.repathTimer <= 0) {
        this.repathTimer = 500;
        this.enemies.getChildren().forEach(enemy => {
            if (enemy.active && enemy.type !== 'witch' && enemy.type !== 'boss') {
                 const distSq = Phaser.Math.Distance.Squared(this.player.x, this.player.y, enemy.x, enemy.y);
                 if (!enemy.isCharging && !enemy.isPreparingCharge && !(enemy.type === 'shapeshifter' && enemy.currentBehavior === 'flee') && !(enemy.type === 'wizard' && distSq < enemy.fleeDistance * enemy.fleeDistance) ) {
                    this.findPathForEnemy(enemy);
                 } else { this.enemyPathData.set(enemy.id, { path: null, targetNodeIndex: -1 }); }
            }
        });
    }
    if (this.finder) { this.finder.calculate(); }

    // Player Movement
    if (!this.isDodging) {
      let tVX = 0; let tVY = 0; let isMoving = false;
      if (this.isMobile) { if (this.isTouching && this.touchIndicator && this.touchIndicator.visible) { const bX = this.touchIndicator.x; const bY = this.touchIndicator.y; let dx = this.touchPosition.x - bX; let dy = this.touchPosition.y - bY; const len = Math.sqrt(dx * dx + dy * dy); const dZ = 10; if (len > dZ) { dx /= len; dy /= len; tVX = dx * this.playerSpeed; tVY = dy * this.playerSpeed; isMoving = true; } } if (this.touchIndicator) this.touchIndicator.setVisible(this.isTouching); if (this.touchStick) this.touchStick.setVisible(this.isTouching); }
      else { let dx = 0, dy = 0; if (this.keys.W.isDown) dy = -1; else if (this.keys.S.isDown) dy = 1; if (this.keys.A.isDown) dx = -1; else if (this.keys.D.isDown) dx = 1; if (dx !== 0 || dy !== 0) { isMoving = true; if (dx !== 0 && dy !== 0) { const l = Math.sqrt(2); dx /= l; dy /= l; } tVX = dx * this.playerSpeed; tVY = dy * this.playerSpeed; } }
      this.player.setVelocity(tVX, tVY);
      if (isMoving && time > this.footstepTimer + 300) { this.sounds.walk.play(); this.footstepTimer = time; }
    }

    // Player Shooting (Keyboard/Arrows)
    if (!this.isMobile && !this.isDodging) { let sDX = 0, sDY = 0; if (this.keys.LEFT.isDown) sDX = -1; else if (this.keys.RIGHT.isDown) sDX = 1; if (this.keys.UP.isDown) sDY = -1; else if (this.keys.DOWN.isDown) sDY = 1; if ((sDX !== 0 || sDY !== 0) && time > this.lastShootTime + this.shootCooldown) { const angle = Math.atan2(sDY, sDX); this.fireProjectiles(angle); this.lastShootTime = time; } }

    // Player Dodge (Keyboard)
    if (!this.isMobile && Phaser.Input.Keyboard.JustDown(this.keys.SPACE)) { this.performDodge(); }

    // Enemy Updates
    this.enemies.getChildren().forEach(enemy => { this.updateEnemy(enemy, time, delta); });

    // Door Interaction
    let nearDoor = false; let onDoor = false;
    this.doors.getChildren().forEach(door => { const iR = this.handleDoorInteraction(door); if (iR === true) { nearDoor = true; onDoor = true; } else if (iR === false && this.doorPrompt.visible && Math.abs(this.doorPrompt.x - door.x) < 5) { nearDoor = true; onDoor = true; } });
    if (!this.isMobile && !nearDoor && this.doorPrompt.visible) { this.doorPrompt.setVisible(false); }

    // Dodge Cooldown and UI Update
    let dR = 0; for (let i = this.dodgeCooldowns.length - 1; i >= 0; i--) { if (this.dodgeCooldowns[i] !== null && time >= this.dodgeCooldowns[i]) { this.dodgeCooldowns[i] = null; dR++; } } this.dodgeCooldowns = this.dodgeCooldowns.filter(cd => cd !== null); if (dR > 0) { this.dodgeCount = Math.min(this.upgrades.dodge, this.dodgeCount + dR); } while (this.dodgeCooldowns.length < this.upgrades.dodge - this.dodgeCount) { this.dodgeCooldowns.push(null); } this.drawDodgeUI(time);

  } // End update()

  drawDodgeUI(time) {
    if (!this.minimap) return; this.minimap.clear();
    const uiX = 400; const uiY = 565; const radius = 15; const gap = 10;
    const totalWidth = this.upgrades.dodge * radius * 2 + Math.max(0, this.upgrades.dodge - 1) * gap;
    const startX = uiX - totalWidth / 2 + radius; let cooldownIndex = 0;
    for (let i = 0; i < this.upgrades.dodge; i++) {
      const circleX = startX + i * (radius * 2 + gap);
      this.minimap.lineStyle(2, 0xffffff, 1); this.minimap.strokeCircle(circleX, uiY, radius);
      if (i < this.dodgeCount) { this.minimap.fillStyle(0x00ffff, 1); this.minimap.fillCircle(circleX, uiY, radius); }
      else {
        const cooldownEndTime = this.dodgeCooldowns[cooldownIndex];
        if (cooldownEndTime && cooldownEndTime > time) {
            this.minimap.fillStyle(0x555555, 0.8); this.minimap.fillCircle(circleX, uiY, radius);
            const remainingTime = cooldownEndTime - time; const progress = 1 - Math.max(0, remainingTime / this.dodgeCooldownTime);
            if (progress > 0) { this.minimap.fillStyle(0x00ffff, 0.7); this.minimap.slice(circleX, uiY, radius, Phaser.Math.DegToRad(-90), Phaser.Math.DegToRad(-90 + progress * 360), false); this.minimap.fillPath(); }
            cooldownIndex++;
        } else { this.minimap.fillStyle(0x555555, 0.8); this.minimap.fillCircle(circleX, uiY, radius); if (cooldownEndTime) cooldownIndex++; }
      }
    }
  }

} // End Scene Class

// Game Configuration
var config = {
  type: Phaser.AUTO,
  width: 800, height: 600,
  scene: [TitleScene, MainGameScene, GameOverScene],
  physics: { default: "arcade", arcade: { gravity: { y: 0 }, debug: false } },
  parent: "game-container",
  scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
   render: { pixelArt: true, antialias: false }
};

// Start the game
window.onload = () => { const game = new Phaser.Game(config); };