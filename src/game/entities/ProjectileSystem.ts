import Phaser from "phaser";
import { BULLET_CULL_MARGIN, BULLET_SPEED } from "../config";
import { createRectTexture } from "../render/createRectTexture";

export class ProjectileSystem {
  private readonly bullets: Phaser.Physics.Arcade.Group;

  constructor(
    private readonly scene: Phaser.Scene,
    walls: Phaser.Physics.Arcade.StaticGroup
  ) {
    this.bullets = this.scene.physics.add.group();
    this.scene.physics.add.collider(this.bullets, walls, (bullet) => {
      bullet.destroy();
    });
  }

  fire(from: Phaser.Math.Vector2, direction: Phaser.Math.Vector2): void {
    const bullet = this.bullets.create(
      from.x + direction.x * 30,
      from.y + direction.y * 30,
      createRectTexture(this.scene, "bullet", 16, 16, 0xa8dadc)
    ) as Phaser.Physics.Arcade.Sprite;

    bullet.setDepth(1);
    const body = bullet.body as Phaser.Physics.Arcade.Body;
    body.setAllowGravity(false);
    bullet.setCollideWorldBounds(false);
    bullet.setVelocity(direction.x * BULLET_SPEED, direction.y * BULLET_SPEED);
  }

  update(): void {
    const view = this.scene.cameras.main.worldView;

    this.bullets.children.each((child) => {
      const bullet = child as Phaser.Physics.Arcade.Sprite;

      if (
        bullet.x < view.x - BULLET_CULL_MARGIN ||
        bullet.x > view.right + BULLET_CULL_MARGIN ||
        bullet.y < view.y - BULLET_CULL_MARGIN ||
        bullet.y > view.bottom + BULLET_CULL_MARGIN
      ) {
        bullet.destroy();
      }

      return true;
    });
  }
}
