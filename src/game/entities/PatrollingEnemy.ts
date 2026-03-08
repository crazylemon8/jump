import Phaser from "phaser";
import { createSkeletonTexture } from "../render/createSkeletonTexture";

export class PatrollingEnemy {
  private readonly sprite: Phaser.Types.Physics.Arcade.SpriteWithDynamicBody;
  private direction = -1;
  private defeated = false;

  constructor(
    private readonly scene: Phaser.Scene,
    x: number,
    y: number,
    private readonly minX: number,
    private readonly maxX: number,
    private readonly speed: number,
    private readonly onDefeated?: () => void
  ) {
    this.sprite = this.scene.physics.add
      .sprite(x, y, createSkeletonTexture(this.scene, "skeleton-enemy", 96, 110))
      .setCollideWorldBounds(false);
    this.sprite.body.setAllowGravity(false);
    this.sprite.setSize(40, 78);
    this.sprite.setOffset(28, 22);
    this.sprite.setScale(0.9);
    this.sprite.setFlipX(true);

    this.scene.tweens.add({
      targets: this.sprite,
      y: y - 4,
      duration: 520,
      ease: "Sine.InOut",
      yoyo: true,
      repeat: -1
    });
  }

  get body(): Phaser.Physics.Arcade.Body {
    return this.sprite.body as Phaser.Physics.Arcade.Body;
  }

  get gameObject(): Phaser.Types.Physics.Arcade.SpriteWithDynamicBody {
    return this.sprite;
  }

  isActive(): boolean {
    return !this.defeated && this.sprite.active;
  }

  takeHit(direction: Phaser.Math.Vector2): void {
    if (this.defeated) {
      return;
    }

    this.defeated = true;
    this.sprite.setTint(0xffb3b3);
    this.sprite.setVelocity(direction.x * 140, -40 + direction.y * 140);
    this.sprite.body.enable = false;

    this.scene.tweens.add({
      targets: this.sprite,
      alpha: 0,
      y: this.sprite.y - 12,
      duration: 220,
      ease: "Quad.Out",
      onComplete: () => {
        this.sprite.destroy();
        this.onDefeated?.();
      }
    });
  }

  update(): void {
    if (this.defeated || !this.sprite.active) {
      return;
    }

    if (this.sprite.x <= this.minX) {
      this.direction = 1;
      this.sprite.setFlipX(false);
    } else if (this.sprite.x >= this.maxX) {
      this.direction = -1;
      this.sprite.setFlipX(true);
    }

    this.sprite.setVelocityX(this.direction * this.speed);
    this.sprite.setVelocityY(0);
  }
}
