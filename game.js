// Title Screen (Welcome Screen)
class TitleScene extends Phaser.Scene {
  constructor() {
    super({ key: "TitleScene" });
  }
  preload() {
    this.load.image("background", "assets/background.png");
  }
  create() {
    this.add.image(400, 300, "background").setScale(2);
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
    this.add
      .text(400, 260, "WASD to move, Arrows/Mouse to shoot", {
        font: "18px Arial",
        fill: "#ffffff",
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
    this.maxWorlds = 3;
    this.currentRoom = { x: 0, y: 0 };
    this.coins = 0;
    this.damageMultiplier = 1;
    this.playerSpeed = 160;
    this.upgrades = { hp: 0, damage: 0, speed: 0, doubleShot: 0, splitShot: 0 };
    this.shopPurchases = {};
  }

  preload() {
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
    ];
    assets.forEach((key) => this.load.image(key, `assets/${key}.png`));
    this.load.image("wall1", "assets/wall1.png");
    this.load.image("wall2", "assets/wall2.png");
    this.load.image("wall3", "assets/wall3.png");
  }

  create() {
    // Play area bounds
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

    // UI + minimap
    this.createUI();
    this.minimap = this.add.graphics().setScrollFactor(0).setDepth(101);

    // Player setup
    this.player = this.physics.add.sprite(400, 300, "player").setDepth(10);
    this.player.health = 6;
    this.player.maxHealth = 6;
    this.player.lastDamageTime = 0;
    this.shootCooldown = 200;
    this.lastShootTime = 0;

    // Input
    this.keys = this.input.keyboard.addKeys("W,A,S,D,LEFT,RIGHT,UP,DOWN,E");

    // Collisions
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
      () => this.takeDamage(),
      null,
      this
    );
    this.physics.add.overlap(
      this.player,
      this.enemyProj,
      () => this.takeDamage(),
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
    this.input.on("pointerdown", (ptr) => this.shootMouse(ptr));

    // Generate map & load initial room
    this.generateWorldMap();
    this.loadRoom(0, 0);
  }

  update(time) {
    // Movement
    this.player.setVelocity(0);
    if (this.keys.A.isDown) this.player.setVelocityX(-this.playerSpeed);
    if (this.keys.D.isDown) this.player.setVelocityX(this.playerSpeed);
    if (this.keys.W.isDown) this.player.setVelocityY(-this.playerSpeed);
    if (this.keys.S.isDown) this.player.setVelocityY(this.playerSpeed);

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
      let nearDoor = false;
      this.doors.children.iterate((door) => {
        if (
          Phaser.Math.Distance.Between(
            this.player.x,
            this.player.y,
            door.x,
            door.y
          ) < 40
        ) {
          nearDoor = true;
          this.handleDoorPrompt(door);
        }
      });
      if (!nearDoor) this.doorPrompt.setVisible(false);
    }

    // Shop prompts
    const key = `${this.currentRoom.x},${this.currentRoom.y}`;
    if (this.roomMap[key].type === "shop" && this.shopIcons) {
      let near = false;
      this.shopIcons.forEach((icon) => {
        if (
          Phaser.Math.Distance.Between(
            this.player.x,
            this.player.y,
            icon.sprite.x,
            icon.sprite.y
          ) < 40
        ) {
          near = true;
          const msg =
            icon.type === "heal"
              ? "Press E to heal (10 coins)"
              : "Press E to increase damage (20 coins)";
          this.shopPrompt
            .setText(msg)
            .setPosition(icon.sprite.x, icon.sprite.y - 50)
            .setVisible(true);
          if (Phaser.Input.Keyboard.JustDown(this.keys.E)) {
            icon.purchase();
            this.shopPrompt.setVisible(false);
          }
        }
      });
      if (!near) this.shopPrompt.setVisible(false);
    } else {
      this.shopPrompt.setVisible(false);
    }

    // Shooting
    if (this.keys.LEFT.isDown) this.shootDir("left");
    else if (this.keys.RIGHT.isDown) this.shootDir("right");
    else if (this.keys.UP.isDown) this.shootDir("up");
    else if (this.keys.DOWN.isDown) this.shootDir("down");
  }

  createUI() {
    this.ui = this.add.container(0, 0).setDepth(100);
    this.hearts = [];
    for (let i = 0; i < 3; i++) {
      const h = this.add.image(100 + 48 * i, 100, "heart_full");
      this.hearts.push(h);
      this.ui.add(h);
    }
    this.coinsText = this.add.text(100, 140, "Coins: 0", {
      font: "28px Arial",
      fill: "#fff",
    });
    this.worldText = this.add.text(100, 180, "World: 1", {
      font: "24px Arial",
      fill: "#fff",
    });
    this.ui.add([this.coinsText, this.worldText]);
    this.doorPrompt = this.add
      .text(400, 200, "", {
        font: "18px Arial",
        fill: "#fff",
        backgroundColor: "#333",
        padding: { x: 5, y: 2 },
      })
      .setOrigin(0.5)
      .setDepth(101)
      .setVisible(false);
    this.ui.add(this.doorPrompt);
    this.shopPrompt = this.add
      .text(400, 240, "", {
        font: "18px Arial",
        fill: "#fff",
        backgroundColor: "#333",
        padding: { x: 5, y: 2 },
      })
      .setOrigin(0.5)
      .setDepth(101)
      .setVisible(false);
    this.ui.add(this.shopPrompt);
  }

  updateMinimap() {
    this.minimap.clear();
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
      this.minimap.lineStyle(1, 0xffffff);
      this.minimap.strokeRect(px, py, cell, cell);
      if (this.visitedRooms[k]) {
        this.minimap.fillStyle(0xffffff, 1);
        this.minimap.fillRect(px, py, cell, cell);
      }
      if (rx === this.currentRoom.x && ry === this.currentRoom.y) {
        this.minimap.lineStyle(2, 0xff0000);
        this.minimap.strokeRect(px - 1, py - 1, cell + 2, cell + 2);
      }
    });
  }

  /** Shows a temporary on-screen message */
  showTempMessage(text) {
    const msg = this.add
      .text(400, 300, text, {
        font: "24px Arial",
        fill: "#ff0000",
        backgroundColor: "#000",
        padding: { x: 10, y: 5 },
      })
      .setOrigin(0.5)
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
    enemy.health -= proj.damage;
    proj.destroy();
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
    const types = ["hp", "damage", "speed", "doubleShot", "splitShot"];
    const choice = Phaser.Utils.Array.GetRandom(types);
    const keyMap = {
      hp: "heart_full",
      damage: "projectile",
      speed: "boss_projectile",
      doubleShot: "blob",
      splitShot: "blob_projectile",
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
  }

  onPickup(player, pickup) {
    const t = pickup.upgradeType;
    switch (t) {
      case "hp":
        this.player.maxHealth += 5;
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
    }
    pickup.destroy();
  }

  takeDamage() {
    if (this.time.now < this.player.lastDamageTime + 500) return;
    this.player.health -= 1;
    this.player.lastDamageTime = this.time.now;
    this.updateHearts();
    if (this.player.health <= 0) this.scene.start("GameOverScene");
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
    const dx = this.player.x - enemy.x;
    const dy = this.player.y - enemy.y;
    const dist = Math.hypot(dx, dy) || 1;
    enemy.setVelocity((dx / dist) * enemy.speed, (dy / dist) * enemy.speed);
    if (time > enemy.lastShootTime + enemy.shootCooldown) {
      this.shootEnemyProjectile(enemy);
      enemy.lastShootTime = time;
    }
  }

  // --- Map & Rooms ---
  generateWorldMap() {
    this.roomMap = {};
    this.visitedRooms = {};
    this.clearedRooms = new Set();
    this.roomMap["0,0"] = { type: "start", doors: {}, depth: 0, variation: 0 };
    let pos = { x: 0, y: 0 },
      len = 0,
      exitKey = null;
    while (len < 3 || (len < 8 && Math.random() < 0.7)) {
      const dirs = Phaser.Utils.Array.Shuffle([
        { dx: 0, dy: -1, dir: "up", opp: "down" },
        { dx: 1, dy: 0, dir: "right", opp: "left" },
        { dx: 0, dy: 1, dir: "down", opp: "up" },
        { dx: -1, dy: 0, dir: "left", opp: "right" },
      ]);
      let moved = false;
      for (const d of dirs) {
        const nx = pos.x + d.dx,
          ny = pos.y + d.dy,
          key = `${nx},${ny}`;
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
        const nx = bx + d.dx,
          ny = by + d.dy,
          key = `${nx},${ny}`;
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
      this.createRoomLayout(this.roomMap[key].variation);
      ["up", "down", "left", "right"].forEach((d) =>
        this.createWallSegments(d, !!this.roomMap[key].doors[d])
      );
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
    const w = this.currentWorld;
    if (!this.shopPurchases[w])
      this.shopPurchases[w] = { heal: false, damage: false };
    this.shopIcons = [];
    const cx = 400,
      y = 300,
      sp = 100;
    // heal
    if (!this.shopPurchases[w].heal) {
      const h = this.add
        .image(cx - sp / 2, y, "heart_full")
        .setInteractive()
        .setScale(1.5);
      this.tweens.add({
        targets: h,
        scale: 1.8,
        yoyo: true,
        repeat: -1,
        duration: 500,
      });
      const buyHeal = () => {
        if (this.coins >= 10) {
          this.coins -= 10;
          this.coinsText.setText(
            `Coins: ${this.coins} else { this.showTempMessage('Not enough coins...'); }`
          );
          this.player.maxHealth += 2;
          this.player.health = Math.min(
            this.player.maxHealth,
            this.player.health + 2
          );
          this.updateHearts();
          this.shopPurchases[w].heal = true;
          h.destroy();
        }
      };
      h.on("pointerdown", buyHeal);
      this.shopIcons.push({ sprite: h, type: "heal", purchase: buyHeal });
    }
    // damage
    if (!this.shopPurchases[w].damage) {
      const d = this.add
        .image(cx + sp / 2, y, "projectile")
        .setInteractive()
        .setScale(1.5);
      this.tweens.add({
        targets: d,
        scale: 1.8,
        yoyo: true,
        repeat: -1,
        duration: 500,
      });
      const buyD = () => {
        if (this.coins >= 20) {
          this.coins -= 20;
          this.coinsText.setText(
            `Coins: ${this.coins} else { this.showTempMessage('Not enough coins...'); }`
          );
          this.damageMultiplier += 0.5;
          this.shopPurchases[w].damage = true;
          d.destroy();
        }
      };
      d.on("pointerdown", buyD);
      this.shopIcons.push({ sprite: d, type: "damage", purchase: buyD });
    }
  }
  createRoomLayout(v) {
    const wkey = `wall${this.currentWorld}`;
    if (v === 0)
      [
        [200, 200],
        [600, 200],
        [200, 400],
        [600, 400],
      ].forEach((p) => this.innerWalls.create(p[0], p[1], wkey).setScale(2));
    if (v === 1) {
      this.innerWalls.create(400, 300, wkey).setScale(4, 1);
      this.innerWalls.create(400, 300, wkey).setScale(1, 4);
    }
    if (v === 2) {
      this.innerWalls.create(300, 200, wkey).setScale(2).setAngle(45);
      this.innerWalls.create(500, 400, wkey).setScale(2).setAngle(45);
    }
  }

  createWallSegments(dir, hasDoor) {
    const wkey = `wall${this.currentWorld}`;
    const { x1, y1, x2, y2 } = this.playArea;
    if (dir === "up" || dir === "down") {
      const y = dir === "up" ? y1 : y2;
      if (hasDoor) {
        this.walls.create(220, y, wkey).body.setSize(320, 20);
        this.walls.create(580, y, wkey).body.setSize(320, 20);
      } else {
        this.walls.create(400, y, wkey).body.setSize(680, 20);
      }
    } else {
      const x = dir === "left" ? x1 : x2;
      if (hasDoor) {
        this.walls.create(x, 170, wkey).body.setSize(20, 220);
        this.walls.create(x, 430, wkey).body.setSize(20, 220);
      } else {
        this.walls.create(x, 300, wkey).body.setSize(20, 480);
      }
    }
  }

  createDoors(room) {
    Object.entries(room.doors).forEach(([dir, to]) => {
      let x = 400,
        y = 300;
      const { x1, y1, x2, y2 } = this.playArea;
      if (dir === "up") y = y1;
      if (dir === "down") y = y2;
      if (dir === "left") x = x1;
      if (dir === "right") x = x2;
      const door = this.doors.create(x, y, "door_closed");
      door.direction = dir;
      door.targetRoom = to;
      door.isOpen = false;
      door.transitionInProgress = false;
    });
  }

  openAllDoors() {
    this.doors.children.iterate((d) => {
      d.setTexture("door");
      d.isOpen = true;
      if (d.collider) {
        this.physics.world.removeCollider(d.collider);
        d.collider = null;
      }
    });
  }

  handleDoorPrompt(door) {
    const { x, y } = door;
    const offs = {
      up: [0, 40],
      down: [0, -40],
      left: [40, 0],
      right: [-40, 0],
    }[door.direction];
    this.doorPrompt.setPosition(x + offs[0], y + offs[1]);
    const target = this.roomMap[door.targetRoom];
    const canOpen =
      !this.roomActive ||
      target.type === "shop" ||
      this.clearedRooms.has(`${this.currentRoom.x},${this.currentRoom.y}`);
    this.doorPrompt
      .setText(canOpen ? "Press E to open door" : "")
      .setVisible(true);
    if (canOpen && this.keys.E.isDown && !door.isOpen) {
      door.setTexture("door");
      door.isOpen = true;
      if (door.collider) {
        this.physics.world.removeCollider(door.collider);
        door.collider = null;
      }
    }
    if (door.isOpen && !door.transitionInProgress && this.isCrossing(door)) {
      door.transitionInProgress = true;
      const [nx, ny] = door.targetRoom.split(",").map(Number);
      this.transitionToRoom(nx, ny, door.direction);
    }
  }

  isCrossing(door) {
    const p = this.player;
    switch (door.direction) {
      case "up":
        return p.y <= door.y + 15 && this.keys.W.isDown;
      case "down":
        return p.y >= door.y - 15 && this.keys.S.isDown;
      case "left":
        return p.x <= door.x + 15 && this.keys.A.isDown;
      case "right":
        return p.x >= door.x - 15 && this.keys.D.isDown;
      default:
        return false;
    }
  }

  setupColliders() {
    // world bounds
    this.physics.add.collider(this.player, this.walls);
    this.physics.add.collider(this.player, this.innerWalls);
    this.physics.add.collider(this.enemies, this.walls);
    this.physics.add.collider(this.enemies, this.innerWalls);
    // projectiles
    this.physics.add.collider(this.projectiles, this.walls, (p) => p.destroy());
    this.physics.add.collider(this.projectiles, this.innerWalls, (p) =>
      p.destroy()
    );
    this.physics.add.collider(this.enemyProj, this.walls, (p) => p.destroy());
    this.physics.add.collider(this.enemyProj, this.innerWalls, (p) =>
      p.destroy()
    );
    // doors
    this.doors.children.iterate((door) => {
      if (!door.isOpen)
        door.collider = this.physics.add.collider(this.player, door);
    });
    // open doors overlap
    this.doors.children.iterate((door) => {
      if (door.isOpen) {
        this.physics.add.overlap(this.player, door, () => {
          if (!this.inTransition) {
            const [nx, ny] = door.targetRoom.split(",").map(Number);
            this.transitionToRoom(nx, ny, door.direction);
          }
        });
      }
    });
  }
  
  transitionToRoom(nx, ny, from) {
    if (this.inTransition) return;
    this.inTransition = true;
    this.cameras.main.fadeOut(250);
    this.time.delayedCall(250, () => {
      this.loadRoom(nx, ny);
      const opp = { up: "down", down: "up", left: "right", right: "left" }[
        from
      ];
      const { x1, y1, x2, y2 } = this.playArea;
      let px = 400,
        py = 300;
      if (opp === "up") py = y1 + 50;
      if (opp === "down") py = y2 - 50;
      if (opp === "left") px = x1 + 50;
      if (opp === "right") px = x2 - 50;
      this.player.setPosition(px, py);
      this.cameras.main.fadeIn(250);
      this.time.delayedCall(250, () => (this.inTransition = false));
    });
  }

  createNormalRoom() {
    const count = Phaser.Math.Between(2, 4 + this.currentWorld);
    for (let i = 0; i < count; i++) {
      const x = Phaser.Math.Between(
        this.playArea.x1 + 50,
        this.playArea.x2 - 50
      );
      const y = Phaser.Math.Between(
        this.playArea.y1 + 50,
        this.playArea.y2 - 50
      );
      this.enemies.add(this.createEnemy("blob", x, y));
    }
  }

  createBossRoom() {
    const boss = this.createEnemy("boss", 400, 300);
    boss.health = 100 * this.currentWorld;
    boss.setScale(1.5);
    this.enemies.add(boss);
  }

  createEnemy(type, x, y) {
    const e = this.physics.add.sprite(x, y, type);
    e.type = type;
    e.speed = type === "boss" ? 80 : 50;
    e.shootCooldown = type === "boss" ? 1000 : 2000;
    e.lastShootTime = this.time.now;
    e.setCollideWorldBounds(true);
    e.health = (type === "boss" ? 50 : 20) * this.currentWorld;
    return e;
  }

  shootEnemyProjectile(enemy) {
    const tex = enemy.type === "boss" ? "boss_projectile" : "blob_projectile";
    if (enemy.type === "boss" && this.currentWorld >= 2) {
      const angles = [
        0,
        Math.PI / 4,
        Math.PI / 2,
        (3 * Math.PI) / 4,
        Math.PI,
        (5 * Math.PI) / 4,
        (3 * Math.PI) / 2,
        (7 * Math.PI) / 4,
      ];
      const count = this.currentWorld === 2 ? 4 : 8;
      for (let i = 0; i < count; i++) {
        const p = this.enemyProj.create(enemy.x, enemy.y, tex);
        p.setVelocity(Math.cos(angles[i]) * 200, Math.sin(angles[i]) * 200);
      }
    } else {
      const p = this.enemyProj.create(enemy.x, enemy.y, tex);
      this.physics.moveToObject(p, this.player, 200);
    }
  }

  onBossDefeated() {
    this.clearedRooms.add(`${this.currentRoom.x},${this.currentRoom.y}`);
    if (this.currentWorld < this.maxWorlds) {
      this.currentWorld++;
      this.worldText.setText(`World: ${this.currentWorld}`);
      this.generateWorldMap();
      const msg = this.add
        .text(400, 300, `Entering World ${this.currentWorld}!`, {
          font: "32px Arial",
          fill: "#ffffff",
          backgroundColor: "#000000",
        })
        .setOrigin(0.5)
        .setDepth(200);
      this.time.delayedCall(2000, () => {
        msg.destroy();
        this.loadRoom(0, 0);
      });
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
    this.add
      .text(400, 200, "Game Over", { font: "48px Arial", fill: "#ff0000" })
      .setOrigin(0.5);
    const again = this.add
      .text(400, 350, "Play Again", { font: "32px Arial", fill: "#00ff00" })
      .setOrigin(0.5)
      .setInteractive();
    again.on("pointerdown", () => this.scene.start("MainGameScene"));
    again.on("pointerover", () => again.setStyle({ fill: "#ffffff" }));
    again.on("pointerout", () => again.setStyle({ fill: "#00ff00" }));

    const exit = this.add
      .text(400, 450, "Exit", { font: "32px Arial", fill: "#00ff00" })
      .setOrigin(0.5)
      .setInteractive();
    exit.on("pointerdown", () => (window.location.href = "index.html"));
    exit.on("pointerover", () => exit.setStyle({ fill: "#ffffff" }));
    exit.on("pointerout", () => exit.setStyle({ fill: "#00ff00" }));
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
};

window.onload = () => new Phaser.Game(config);
