import Phaser from "phaser";

export class GameScene extends Phaser.Scene {
  private player!: Phaser.Types.Physics.Arcade.SpriteWithDynamicBody;
  private platforms!: Phaser.Physics.Arcade.StaticGroup;
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;

  constructor() {
    super("game");
  }

  create(): void {
    this.cameras.main.setBackgroundColor("#09111f");

    this.platforms = this.physics.add.staticGroup();
    this.createPlatform(480, 520, 960, 40, 0x1d3557);
    this.createPlatform(160, 390, 220, 24, 0x457b9d);
    this.createPlatform(490, 300, 240, 24, 0x457b9d);
    this.createPlatform(810, 210, 180, 24, 0x457b9d);

    this.player = this.physics.add
      .sprite(140, 440, this.createRectTexture("player", 48, 48, 0xf4d35e))
      .setBounce(0.05)
      .setCollideWorldBounds(true);

    this.physics.add.collider(this.player, this.platforms);

    if (!this.input.keyboard) {
      throw new Error("Keyboard input is unavailable.");
    }

    const keyboard = this.input.keyboard.createCursorKeys();

    if (!keyboard.up || !keyboard.left || !keyboard.right) {
      throw new Error("Cursor keys are unavailable.");
    }

    this.cursors = keyboard;

    this.add.text(24, 24, "Arrow keys to move, up to jump", {
      fontFamily: "monospace",
      fontSize: "24px",
      color: "#f1faee"
    });
  }

  update(): void {
    const speed = 260;

    if (this.cursors.left.isDown) {
      this.player.setVelocityX(-speed);
    } else if (this.cursors.right.isDown) {
      this.player.setVelocityX(speed);
    } else {
      this.player.setVelocityX(0);
    }

    if (Phaser.Input.Keyboard.JustDown(this.cursors.up) && this.player.body.blocked.down) {
      this.player.setVelocityY(-520);
    }
  }

  private createPlatform(x: number, y: number, width: number, height: number, color: number): void {
    this.platforms
      .create(x, y, this.createRectTexture(`platform-${x}-${y}`, width, height, color))
      .refreshBody();
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
