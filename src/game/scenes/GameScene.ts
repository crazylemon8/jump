import Phaser from "phaser";

export class GameScene extends Phaser.Scene {
  private static readonly BULLET_SPEED = 520;
  private static readonly BULLET_CULL_MARGIN = 64;

  private player!: Phaser.Types.Physics.Arcade.SpriteWithDynamicBody;
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private wasd!: Record<"w" | "a" | "s" | "d", Phaser.Input.Keyboard.Key>;
  private walls!: Phaser.Physics.Arcade.StaticGroup;
  private bullets!: Phaser.Physics.Arcade.Group;
  private shootKey!: Phaser.Input.Keyboard.Key;
  private moveTween?: Phaser.Tweens.Tween;
  private facing = new Phaser.Math.Vector2(1, 0);

  constructor() {
    super("game");
  }

  create(): void {
    this.cameras.main.setBackgroundColor("#09111f");

    this.createFloorGrid();
    this.walls = this.physics.add.staticGroup();
    this.createWall(480, 270, 96, 220, 0xe63946);
    this.bullets = this.physics.add.group();

    this.player = this.physics.add
      .sprite(140, 440, this.createRectTexture("player", 48, 48, 0xf4d35e))
      .setCollideWorldBounds(true);
    this.player.body.setAllowGravity(false);
    this.physics.add.collider(this.player, this.walls);
    this.physics.add.collider(this.bullets, this.walls, (bullet) => {
      bullet.destroy();
    });
    this.player.setScale(1);

    if (!this.input.keyboard) {
      throw new Error("Keyboard input is unavailable.");
    }

    const keyboard = this.input.keyboard.createCursorKeys();

    if (!keyboard.up || !keyboard.left || !keyboard.right) {
      throw new Error("Cursor keys are unavailable.");
    }

    this.cursors = keyboard;
    this.wasd = {
      w: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.W),
      a: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.A),
      s: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.S),
      d: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.D)
    };
    this.shootKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
    this.input.keyboard.on("keydown", (event: KeyboardEvent) => {
      console.log("[keyboard] keydown", event.code, event.key);
    });
    this.input.keyboard.on("keydown-SPACE", () => {
      console.log("[keyboard] Phaser keydown-SPACE fired");
    });
    this.input.keyboard.on("keyup-SPACE", () => {
      console.log("[keyboard] Phaser keyup-SPACE fired");
    });
    window.addEventListener("keydown", this.handleWindowKeydown);

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      window.removeEventListener("keydown", this.handleWindowKeydown);
    });
  }

  update(): void {
    const speed = 260;
    let velocityX = 0;
    let velocityY = 0;

    if (this.cursors.left.isDown || this.wasd.a.isDown) {
      velocityX -= speed;
    }

    if (this.cursors.right.isDown || this.wasd.d.isDown) {
      velocityX += speed;
    }

    if (this.cursors.up.isDown || this.wasd.w.isDown) {
      velocityY -= speed;
    }

    if (this.cursors.down?.isDown || this.wasd.s.isDown) {
      velocityY += speed;
    }

    this.player.setVelocity(velocityX, velocityY);
    this.updateFacing(velocityX, velocityY);
    this.updateMoveAnimation(velocityX !== 0 || velocityY !== 0);
    this.cullOffscreenBullets();

    if (Phaser.Input.Keyboard.JustDown(this.shootKey)) {
      console.log("[keyboard] JustDown(space)", {
        isDown: this.shootKey.isDown,
        timeDown: this.shootKey.timeDown,
        facing: { x: this.facing.x, y: this.facing.y }
      });
      this.shootBullet();
    }
  }

  private createFloorGrid(): void {
    const graphics = this.add.graphics();
    graphics.lineStyle(1, 0x1d3557, 0.65);

    for (let x = 0; x <= 960; x += 48) {
      graphics.lineBetween(x, 0, x, 540);
    }

    for (let y = 0; y <= 540; y += 48) {
      graphics.lineBetween(0, y, 960, y);
    }
  }

  private createWall(x: number, y: number, width: number, height: number, color: number): void {
    this.walls.create(x, y, this.createRectTexture(`wall-${x}-${y}`, width, height, color)).refreshBody();
  }

  private updateMoveAnimation(isMoving: boolean): void {
    if (isMoving) {
      if (this.moveTween) {
        return;
      }

      this.moveTween = this.tweens.add({
        targets: this.player,
        scaleX: 1.16,
        scaleY: 0.88,
        duration: 180,
        ease: "Sine.InOut",
        yoyo: true,
        repeat: -1
      });

      return;
    }

    this.moveTween?.stop();
    this.moveTween = undefined;

    this.tweens.add({
      targets: this.player,
      scaleX: 1,
      scaleY: 1,
      duration: 120,
      ease: "Quad.Out"
    });
  }

  private updateFacing(velocityX: number, velocityY: number): void {
    if (velocityX === 0 && velocityY === 0) {
      return;
    }

    this.facing.set(velocityX, velocityY).normalize();
  }

  private shootBullet(): void {
    console.log("[shoot] spawning bullet", {
      x: this.player.x,
      y: this.player.y,
      facing: { x: this.facing.x, y: this.facing.y }
    });

    const bullet = this.bullets.create(
      this.player.x + this.facing.x * 30,
      this.player.y + this.facing.y * 30,
      this.createRectTexture("bullet", 16, 16, 0xa8dadc)
    ) as Phaser.Physics.Arcade.Sprite;

    bullet.setDepth(1);
    const body = bullet.body as Phaser.Physics.Arcade.Body;
    body.setAllowGravity(false);
    bullet.setCollideWorldBounds(false);
    bullet.setVelocity(this.facing.x * GameScene.BULLET_SPEED, this.facing.y * GameScene.BULLET_SPEED);
  }

  private handleWindowKeydown = (event: KeyboardEvent): void => {
    if (event.code === "Space") {
      console.log("[window] keydown Space", {
        key: event.key,
        target: event.target instanceof HTMLElement ? event.target.tagName : String(event.target)
      });
    }
  };

  private cullOffscreenBullets(): void {
    const margin = GameScene.BULLET_CULL_MARGIN;
    const width = this.scale.width;
    const height = this.scale.height;

    this.bullets.children.each((child) => {
      const bullet = child as Phaser.Physics.Arcade.Sprite;

      if (
        bullet.x < -margin ||
        bullet.x > width + margin ||
        bullet.y < -margin ||
        bullet.y > height + margin
      ) {
        bullet.destroy();
      }

      return true;
    });
  }

  private createRectTexture(key: string, width: number, height: number, color: number): string {
    if (this.textures.exists(key)) {
      return key;
    }

    const graphics = this.make.graphics({ x: 0, y: 0 }, false);
    graphics.fillStyle(color, 1);
    graphics.fillRoundedRect(0, 0, width, height, 8);
    graphics.generateTexture(key, width, height);
    graphics.destroy();

    return key;
  }
}
