// game.js
class TitleScene extends Phaser.Scene {
    constructor() { super({ key: 'TitleScene' }); }
    preload() {
      this.load.image('background', 'assets/background.png');
    }
    create() {
      this.add.image(400, 300, 'background').setScale(2);
      this.add.text(400, 100, 'The Forsaken Depths', { font: '48px Arial', fill: '#fff' }).setOrigin(0.5);
      this.add.text(400, 200, 'Dive into a world of mystery and danger.', { font: '20px Arial', fill: '#fff' }).setOrigin(0.5);
      this.add.text(400, 260, 'WASD to move, Arrows/Mouse to shoot', { font: '18px Arial', fill: '#fff' }).setOrigin(0.5);
  
      const start = this.add.text(400, 360, 'Start Game', { font: '32px Arial', fill: '#0f0' }).setOrigin(0.5).setInteractive();
      start.on('pointerdown', () => this.scene.start('MainGameScene'));
      start.on('pointerover',  () => start.setStyle({ fill: '#fff' }));
      start.on('pointerout',   () => start.setStyle({ fill: '#0f0' }));
    }
  }
  
  class MainGameScene extends Phaser.Scene {
    constructor() {
      super({ key: 'MainGameScene' });
      this.currentWorld = 1;
      this.maxWorlds    = 3;
      this.currentRoom  = { x:0, y:0 };
      this.coins        = 0;
      this.damageMultiplier = 1;
      this.purchasedHealing = new Set();
      this.purchasedDamage  = new Set();
    }
  
    preload() {
      // Core assets
      const images = [
        'player','projectile','blob','boss','wall','door_closed','door_open',
        'boss_projectile','blob_projectile','gold_sparkles','heart_full',
        'heart_half','heart_empty','background'
      ];
      images.forEach(key => this.load.image(key, `assets/${key}.png`));
      // Load variations
      this.load.image('wall1','assets/wall1.png');
      this.load.image('wall2','assets/wall2.png');
      this.load.image('wall3','assets/wall3.png');
    }
  
    create() {
      // Play area bounds
      this.playArea = { x1:60,y1:60,x2:740,y2:540 };
      this.inTransition = false;
  
      // Groups
      this.walls     = this.physics.add.staticGroup();
      this.innerWalls= this.physics.add.staticGroup();
      this.doors     = this.physics.add.staticGroup();
      this.enemies   = this.physics.add.group();
      this.enemyProj = this.physics.add.group();
      this.projectiles = this.physics.add.group();
  
      // UI
      this.createUI();
  
      // Player
      this.player = this.physics.add.sprite(400,300,'player').setDepth(10);
      this.player.health = 6;
      this.player.maxHealth = 6;
      this.player.lastDamageTime = 0;
      this.shootCooldown = 200;
      this.lastShootTime = 0;
  
      // Input
      this.keys = this.input.keyboard.addKeys('W,A,S,D,LEFT,RIGHT,UP,DOWN,E');
  
      // Overlaps / Colliders
      this.physics.add.overlap(this.projectiles, this.enemies, this.onHitEnemy, null, this);
      this.physics.add.collider(this.player, this.enemies,    () => this.takeDamage(), null, this);
      this.physics.add.overlap(this.player, this.enemyProj,    () => this.takeDamage(), null, this);
      this.input.on('pointerdown', ptr => this.shootMouse(ptr));
  
      // Map setup
      this.generateWorldMap();
      this.loadRoom(0,0);
    }
  
    createUI() {
      this.ui   = this.add.container(0,0).setDepth(100);
      this.hearts = [];
      for(let i=0;i<3;i++){
        const heart = this.add.image(100+i*48,100,'heart_full');
        this.hearts.push(heart);
        this.ui.add(heart);
      }
      this.coinsText = this.add.text(100,140,`Coins: 0`, { fontSize:'28px', fill:'#fff' });
      this.worldText = this.add.text(100,180,`World: 1`, { fontSize:'24px', fill:'#fff' });
      this.ui.add([this.coinsText, this.worldText]);
  
      this.doorPrompt = this.add.text(400,200,'', {
        fontSize:'18px', fill:'#fff', backgroundColor:'#333', padding:{ x:5,y:2 }
      }).setOrigin(0.5).setDepth(101).setVisible(false);
      this.ui.add(this.doorPrompt);
    }
  
    update(time) {
      // Movement
      this.player.setVelocity(0);
      if (this.keys.A.isDown) this.player.setVelocityX(-160);
      if (this.keys.D.isDown) this.player.setVelocityX(160);
      if (this.keys.W.isDown) this.player.setVelocityY(-160);
      if (this.keys.S.isDown) this.player.setVelocityY(160);
  
      // Enemy AI
      this.enemies.children.iterate(e => {
        if (!e.active) return;
        this.updateEnemy(e, time);
      });
  
      // Clear room
      if (this.roomActive && this.enemies.countActive()===0) {
        this.roomActive = false;
        this.openAllDoors();
      }
  
      // Door interactions
      if (!this.inTransition) {
        let near = false;
        this.doors.children.iterate(door => {
          const d = Phaser.Math.Distance.Between(
            this.player.x,this.player.y,door.x,door.y
          );
          if (d<40) {
            near = true;
            this.handleDoorPrompt(door);
          }
        });
        if (!near) this.doorPrompt.setVisible(false);
      }
  
      // Keyboard shooting
      if      (this.keys.LEFT.isDown)  this.shootDir('left');
      else if (this.keys.RIGHT.isDown) this.shootDir('right');
      else if (this.keys.UP.isDown)    this.shootDir('up');
      else if (this.keys.DOWN.isDown)  this.shootDir('down');
    }
  
    onHitEnemy(proj, enemy) {
      enemy.health -= proj.damage;
      proj.destroy();
      if (enemy.health <= 0) {
        this.coins++;
        this.coinsText.setText(`Coins: ${this.coins}`);
        if (enemy.type==='boss') this.onBossDefeated();
        enemy.destroy();
      }
    }
  
    shootDir(dir) {
      if (this.time.now < this.lastShootTime+this.shootCooldown) return;
      const p = this.projectiles.create(this.player.x,this.player.y,'projectile');
      const speed = 300;
      if (dir==='left')  p.setVelocityX(-speed);
      if (dir==='right') p.setVelocityX(speed);
      if (dir==='up')    p.setVelocityY(-speed);
      if (dir==='down')  p.setVelocityY(speed);
      p.damage = 10 * this.damageMultiplier;
      this.lastShootTime = this.time.now;
    }
  
    shootMouse(ptr) {
      if (this.time.now < this.lastShootTime+this.shootCooldown) return;
      const angle = Phaser.Math.Angle.Between(this.player.x,this.player.y,ptr.x,ptr.y);
      const p = this.projectiles.create(this.player.x,this.player.y,'projectile');
      p.setVelocity(Math.cos(angle)*300, Math.sin(angle)*300);
      p.damage = 10 * this.damageMultiplier;
      this.lastShootTime = this.time.now;
    }
  
    takeDamage() {
      if (this.time.now < this.player.lastDamageTime+500) return;
      this.player.health--;
      this.player.lastDamageTime = this.time.now;
      this.updateHearts();
      if (this.player.health<=0) this.scene.start('GameOverScene');
    }
  
    updateHearts() {
      const full = Math.floor(this.player.health/2);
      const half = this.player.health%2===1;
      this.hearts.forEach((h,i)=>{
        if      (i<full)      h.setTexture('heart_full');
        else if (i===full&&half) h.setTexture('heart_half');
        else                   h.setTexture('heart_empty');
      });
    }
  
    updateEnemy(enemy, time) {
      const dx = this.player.x - enemy.x, dy = this.player.y - enemy.y;
      const dist = Math.hypot(dx,dy);
      const vx = dx/dist * enemy.speed, vy = dy/dist * enemy.speed;
      enemy.setVelocity(vx, vy);
      if ((enemy.type==='blob' || enemy.type==='boss') &&
          time > enemy.lastShootTime + enemy.shootCooldown) {
        this.shootEnemyProjectile(enemy);
        enemy.lastShootTime = time;
      }
    }
  
    // --- ROOM & DOOR LOGIC ---
    generateWorldMap() {
      this.roomMap      = {};
      this.visitedRooms = {};
      this.clearedRooms = new Set();
  
      // Start
      this.roomMap['0,0'] = { type:'start', doors:{}, depth:0, variation:0 };
      let pos = {x:0,y:0}, len=0, exit=null;
      const minLen=3, maxRooms=8;
  
      // Main path
      while(len<minLen || (len<maxRooms && Math.random()<0.7)) {
        const dirs = Phaser.Utils.Array.Shuffle([
          {dx:0,dy:-1,dir:'up',opp:'down'},
          {dx:1,dy:0,dir:'right',opp:'left'},
          {dx:0,dy:1,dir:'down',opp:'up'},
          {dx:-1,dy:0,dir:'left',opp:'right'}
        ]);
        let moved=false;
        for (const d of dirs) {
          const nx=pos.x+d.dx, ny=pos.y+d.dy, key=`${nx},${ny}`;
          if (!this.roomMap[key]) {
            this.roomMap[key] = { type:'normal', doors:{}, depth:len+1, variation:Phaser.Math.Between(0,2) };
            this.roomMap[`${pos.x},${pos.y}`].doors[d.dir] = key;
            this.roomMap[key].doors[d.opp] = `${pos.x},${pos.y}`;
            pos={x:nx,y:ny}; len++; exit=key; moved=true; break;
          }
        }
        if (!moved) break;
      }
      // Mark boss exit
      if (exit) this.roomMap[exit].type='boss';
  
      // One shop
      const normals = Object.keys(this.roomMap).filter(k=>this.roomMap[k].type==='normal');
      if (normals.length) {
        const shop = Phaser.Utils.Array.GetRandom(normals);
        this.roomMap[shop].type='shop';
      }
  
      // Branches
      for (let i=0;i<3;i++){
        const roomKeys = Object.keys(this.roomMap);
        const base = Phaser.Utils.Array.GetRandom(roomKeys);
        const [bx,by] = base.split(',').map(Number);
        const dirs = Phaser.Utils.Array.Shuffle([
          {dx:0,dy:-1,dir:'up',opp:'down'},
          {dx:1,dy:0,dir:'right',opp:'left'},
          {dx:0,dy:1,dir:'down',opp:'up'},
          {dx:-1,dy:0,dir:'left',opp:'right'}
        ]);
        for (const d of dirs) {
          const nx=bx+d.dx, ny=by+d.dy, key=`${nx},${ny}`;
          if (!this.roomMap[key] && Object.keys(this.roomMap[base].doors).length<3) {
            this.roomMap[key] = {
              type:'normal', doors:{}, depth:this.roomMap[base].depth+1,
              variation:Phaser.Math.Between(0,2)
            };
            this.roomMap[base].doors[d.dir] = key;
            this.roomMap[key].doors[d.opp] = base;
            break;
          }
        }
      }
    }
  
    loadRoom(x,y) {
      // clear old
      this.enemies.clear(true,true);
      this.enemyProj.clear(true,true);
      this.innerWalls.clear(true,true);
      this.walls.clear(true,true);
      this.doors.clear(true,true);
      this.projectiles.clear(true,true);
      this.inTransition = false;
  
      this.currentRoom = {x,y};
      const key = `${x},${y}`;
      const room = this.roomMap[key];
      room.visited = true; this.visitedRooms[key]=true;
  
      // Layout & walls
      this.createRoomLayout(room.variation);
      ['up','down','left','right'].forEach(dir=>
        this.createWallSegments(dir, !!room.doors[dir])
      );
  
      // Room type
      switch(room.type){
        case 'shop': this.createShopRoom(); break;
        case 'boss':
          if (!this.clearedRooms.has(key)) this.createBossRoom();
          break;
        case 'normal':
          if (!this.clearedRooms.has(key)) this.createNormalRoom();
          break;
      }
  
      // Doors
      this.createDoors(room);
      this.setupColliders();
      this.roomActive = this.enemies.countActive()>0;
    }
  
    createRoomLayout(v){
      const wkey=`wall${this.currentWorld}`;
      switch(v){
        case 0:
          [ [200,200],[600,200],[200,400],[600,400] ]
            .forEach(p=>this.innerWalls.create(p[0],p[1],wkey).setScale(2));
          break;
        case 1:
          this.innerWalls.create(400,300,wkey).setScale(4,1);
          this.innerWalls.create(400,300,wkey).setScale(1,4);
          break;
        case 2:
          this.innerWalls.create(300,200,wkey).setScale(2).setAngle(45);
          this.innerWalls.create(500,400,wkey).setScale(2).setAngle(45);
          break;
      }
    }
  
    createWallSegments(dir, hasDoor){
      const wkey=`wall${this.currentWorld}`;
      const { x1,y1,x2,y2 } = this.playArea;
      const doorSize=40;
      if (dir==='up' || dir==='down'){
        const y = (dir==='up'?y1:y2);
        if (hasDoor){
          this.walls.create(220,y,wkey).body.setSize(320,20);
          this.walls.create(580,y,wkey).body.setSize(320,20);
        } else {
          this.walls.create(400,y,wkey).body.setSize(680,20);
        }
      } else {
        const x = (dir==='left'?x1:x2);
        if (hasDoor){
          this.walls.create(x,170,wkey).body.setSize(20,220);
          this.walls.create(x,430,wkey).body.setSize(20,220);
        } else {
          this.walls.create(x,300,wkey).body.setSize(20,480);
        }
      }
    }
  
    createDoors(room) {
      Object.entries(room.doors).forEach(([dir,to])=>{
        let x=400,y=300;
        const { x1,y1,x2,y2 } = this.playArea;
        if      (dir==='up')    y=y1;
        else if (dir==='down')  y=y2;
        else if (dir==='left')  x=x1;
        else if (dir==='right') x=x2;
        const door = this.doors.create(x,y,'door_closed');
        door.direction = dir;
        door.targetRoom = to;
        door.isOpen = false;
        door.transitionInProgress = false;
      });
    }
  
    openAllDoors() {
      this.doors.children.iterate(door => {
        door.setTexture('door_open');
        door.isOpen = true;
        if (door.collider) { this.physics.world.removeCollider(door.collider); door.collider=null; }
      });
    }
  
    handleDoorPrompt(door) {
      const { x,y } = door;
      // prompt position
      const offs = { up:[0,40], down:[0,-40], left:[40,0], right:[-40,0] }[door.direction];
      this.doorPrompt.setPosition(x+offs[0], y+offs[1]);
      const targetKey = door.targetRoom, target = this.roomMap[targetKey];
      const canOpen = !this.roomActive || target.type==='shop' || this.clearedRooms.has(`${this.currentRoom.x},${this.currentRoom.y}`);
      this.doorPrompt.setText(canOpen ? 'Press E to open door' : '');
      this.doorPrompt.setVisible(true);
      if (canOpen && this.keys.E.isDown && !door.isOpen) {
        door.setTexture('door_open');
        door.isOpen = true;
        if (door.collider) { this.physics.world.removeCollider(door.collider); door.collider=null; }
      }
      // crossing
      if (door.isOpen && !door.transitionInProgress && this.isCrossing(door)) {
        door.transitionInProgress = true;
        const [nx,ny] = door.targetRoom.split(',').map(Number);
        this.transitionToRoom(nx,ny,door.direction);
      }
    }
  
    isCrossing(door) {
      const p = this.player, d = door;
      if (d.direction==='up'   ) return p.y <= d.y+15 && this.keys.W.isDown;
      if (d.direction==='down' ) return p.y >= d.y-15 && this.keys.S.isDown;
      if (d.direction==='left' ) return p.x <= d.x+15 && this.keys.A.isDown;
      if (d.direction==='right') return p.x >= d.x-15 && this.keys.D.isDown;
      return false;
    }
  
    setupColliders() {
      this.physics.add.collider(this.player, this.walls);
      this.physics.add.collider(this.player, this.innerWalls);
      this.physics.add.collider(this.enemies, this.walls);
      this.physics.add.collider(this.enemies, this.innerWalls);
      this.physics.add.collider(this.projectiles, this.walls, p=>p.destroy());
      this.physics.add.collider(this.projectiles, this.innerWalls, p=>p.destroy());
      this.physics.add.collider(this.enemyProj, this.walls, p=>p.destroy());
      this.physics.add.collider(this.enemyProj, this.innerWalls, p=>p.destroy());
  
      // door colliders
      this.doors.children.iterate(door=>{
        if (!door.isOpen) {
          door.collider = this.physics.add.collider(this.player, door);
        }
      });
    }
  
    transitionToRoom(nx,ny,from) {
      if (this.inTransition) return;
      this.inTransition = true;
      this.cameras.main.fadeOut(250);
      this.time.delayedCall(250, ()=>{
        this.loadRoom(nx,ny);
        // place player at opposite door
        const opp = { up:'down', down:'up', left:'right', right:'left' }[from];
        const { x1,y1,x2,y2 } = this.playArea;
        let px=400, py=300;
        if (opp==='up')    { py=y1+50; }
        if (opp==='down')  { py=y2-50; }
        if (opp==='left')  { px=x1+50; }
        if (opp==='right') { px=x2-50; }
        this.player.setPosition(px,py);
        this.cameras.main.fadeIn(250);
        this.time.delayedCall(250, ()=> this.inTransition=false);
      });
    }
  
    createNormalRoom() {
      const count = Phaser.Math.Between(2,4+this.currentWorld);
      for (let i=0;i<count;i++){
        const x = Phaser.Math.Between(this.playArea.x1+50,this.playArea.x2-50);
        const y = Phaser.Math.Between(this.playArea.y1+50,this.playArea.y2-50);
        this.enemies.add(this.createEnemy('blob',x,y));
      }
    }
  
    createBossRoom() {
      const boss = this.createEnemy('boss',400,300);
      boss.health = 100 * this.currentWorld;
      boss.setScale(1.5);
      this.enemies.add(boss);
    }
  
    createShopRoom() {
      const key = `world${this.currentWorld}`;
      if (!this.purchasedHealing.has(key)) {
        const btn = this.add.text(300,300,'Buy Healing (10)',{ font:'16px Arial', fill:'#0f0' }).setInteractive();
        btn.on('pointerdown',()=>{
          if (this.coins>=10) {
            this.coins-=10;
            this.player.health = Math.min(this.player.maxHealth,this.player.health+2);
            this.updateHearts();
            this.coinsText.setText(`Coins: ${this.coins}`);
            this.purchasedHealing.add(key);
            btn.destroy();
          }
        });
      }
      if (!this.purchasedDamage.has(key)) {
        const btn = this.add.text(300,350,'Buy Damage (20)',{ font:'16px Arial', fill:'#f00' }).setInteractive();
        btn.on('pointerdown',()=>{
          if (this.coins>=20) {
            this.coins-=20;
            this.damageMultiplier+=0.5;
            this.coinsText.setText(`Coins: ${this.coins}`);
            this.purchasedDamage.add(key);
            btn.destroy();
          }
        });
      }
    }
  
    createEnemy(type,x,y) {
      const e = this.physics.add.sprite(x,y,type);
      e.type = type;
      e.speed = type==='boss'?80:50;
      e.shootCooldown = type==='boss'?1000:2000;
      e.lastShootTime = 0;
      e.setCollideWorldBounds(true);
      e.health = (type==='boss'?50:20) * this.currentWorld;
      return e;
    }
  
    shootEnemyProjectile(enemy) {
      const tex = enemy.type==='boss'?'boss_projectile':'blob_projectile';
      if (enemy.type==='boss' && this.currentWorld>=2) {
        const angles = [0,Math.PI/4,Math.PI/2,3*Math.PI/4,Math.PI,5*Math.PI/4,3*Math.PI/2,7*Math.PI/4];
        const cnt = this.currentWorld===2?4:8;
        for (let i=0;i<cnt;i++){
          const p = this.enemyProj.create(enemy.x,enemy.y,tex);
          p.setVelocity(Math.cos(angles[i])*200, Math.sin(angles[i])*200);
        }
      } else {
        const p = this.enemyProj.create(enemy.x,enemy.y,tex);
        this.physics.moveToObject(p,this.player,200);
      }
    }
  
    onBossDefeated() {
      this.clearedRooms.add(`${this.currentRoom.x},${this.currentRoom.y}`);
      if (this.currentWorld < this.maxWorlds) {
        this.currentWorld++;
        this.worldText.setText(`World: ${this.currentWorld}`);
        this.generateWorldMap();
        const msg = this.add.text(400,300,`Entering World ${this.currentWorld}!`,{
          font:'32px Arial', fill:'#fff', backgroundColor:'#000'
        }).setOrigin(0.5).setDepth(200);
        this.time.delayedCall(2000,()=>{
          msg.destroy();
          this.loadRoom(0,0);
        });
      } else {
        const msg = this.add.text(400,300,'Victory! You have conquered The Forsaken Depths!',{
          font:'24px Arial', fill:'#fff', backgroundColor:'#000'
        }).setOrigin(0.5).setDepth(200);
        this.time.delayedCall(5000,()=> this.scene.start('TitleScene'));
      }
    }
  }
  
  class GameOverScene extends Phaser.Scene {
    constructor() { super({ key:'GameOverScene' }); }
    create() {
      this.add.text(400,200,'Game Over',{font:'48px Arial',fill:'#f00'}).setOrigin(0.5);
      const again = this.add.text(400,350,'Play Again',{font:'32px Arial',fill:'#0f0'}).setOrigin(0.5).setInteractive();
      again.on('pointerdown',()=> this.scene.start('MainGameScene'));
      again.on('pointerover', ()=> again.setStyle({fill:'#fff'}));
      again.on('pointerout', ()=> again.setStyle({fill:'#0f0'}));
  
      const exit = this.add.text(400,450,'Exit',{font:'32px Arial',fill:'#0f0'}).setOrigin(0.5).setInteractive();
      exit.on('pointerdown',()=> window.location.href='index.html');
      exit.on('pointerover', ()=> exit.setStyle({fill:'#fff'}));
      exit.on('pointerout', ()=> exit.setStyle({fill:'#0f0'}));
    }
  }
  
  const config = {
    type: Phaser.AUTO,
    width: 800, height: 600,
    scene: [TitleScene, MainGameScene, GameOverScene],
    physics: { default:'arcade', arcade:{ gravity:{y:0}, debug:false }},
    parent: 'game-container'
  };
  
  window.onload = ()=> new Phaser.Game(config);
  