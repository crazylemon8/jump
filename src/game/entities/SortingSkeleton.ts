import Phaser from "phaser";
import { GAME_HEIGHT, GAME_WIDTH } from "../config";
import { createSkeletonTexture } from "../render/createSkeletonTexture";

export type SkeletonColor = "red" | "green";
export type ExitSide = "left" | "right";

export class SortingSkeleton {
  private static readonly GROUNDED_SPEED = 72;
  private static readonly AIRBORNE_SPEED = 44;
  private static readonly REDIRECT_SPEED = 165;
  private readonly shadow: Phaser.GameObjects.Ellipse;
  private readonly sprite: Phaser.Types.Physics.Arcade.SpriteWithDynamicBody;
  private direction: -1 | 1;
  private directionLockUntil = 0;

  constructor(
    private readonly scene: Phaser.Scene,
    x: number,
    y: number,
    private readonly color: SkeletonColor
  ) {
    this.direction = color === "red" ? 1 : -1;
    this.shadow = this.scene.add.ellipse(x, GAME_HEIGHT - 20, 42, 12, 0x120607, 0.35).setDepth(-4);
    this.sprite = this.scene.physics.add
      .sprite(x, y, createSkeletonTexture(this.scene, "sorting-skeleton", 96, 110))
      .setCollideWorldBounds(false);

    this.sprite.setTint(color === "red" ? 0xffb0b0 : 0xb9ffb9);
    this.sprite.setSize(40, 78);
    this.sprite.setOffset(28, 22);
    this.sprite.setScale(0.9);
    this.sprite.setFlipX(this.direction < 0);
  }

  get gameObject(): Phaser.Types.Physics.Arcade.SpriteWithDynamicBody {
    return this.sprite;
  }

  get skeletonColor(): SkeletonColor {
    return this.color;
  }

  get horizontalDirection(): -1 | 1 {
    return this.direction;
  }

  update(speedMultiplier = 1): void {
    if (!this.sprite.active) {
      return;
    }

    if (this.sprite.body.blocked.down || this.sprite.body.touching.down) {
      this.sprite.setVelocityX(this.direction * SortingSkeleton.GROUNDED_SPEED * speedMultiplier);
    } else {
      this.sprite.setVelocityX(this.direction * SortingSkeleton.AIRBORNE_SPEED * speedMultiplier);
    }

    this.shadow.x = this.sprite.x;
    this.shadow.scaleX = this.sprite.body.blocked.down || this.sprite.body.touching.down ? 1 : 0.72;
    this.shadow.alpha = this.sprite.body.blocked.down || this.sprite.body.touching.down ? 0.35 : 0.18;
    this.sprite.setFlipX(this.direction < 0);
  }

  redirectFromPlayer(playerX: number, time: number, speedMultiplier = 1): void {
    if (!this.sprite.active || time < this.directionLockUntil) {
      return;
    }

    this.direction = playerX < this.sprite.x ? 1 : -1;
    this.directionLockUntil = time + 220;

    const body = this.sprite.body as Phaser.Physics.Arcade.Body;
    body.velocity.x = this.direction * SortingSkeleton.REDIRECT_SPEED * speedMultiplier;
    body.velocity.y = Math.min(body.velocity.y, -120);
  }

  getExitSide(): ExitSide | null {
    if (this.sprite.x < -48) {
      return "left";
    }

    if (this.sprite.x > GAME_WIDTH + 48) {
      return "right";
    }

    if (this.sprite.y > GAME_HEIGHT + 96) {
      return this.sprite.x < GAME_WIDTH / 2 ? "left" : "right";
    }

    return null;
  }

  destroy(): void {
    this.shadow.destroy();
    this.sprite.destroy();
  }
}
