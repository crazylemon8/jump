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
    const width = this.scene.scale.width;
    const height = this.scene.scale.height;

    this.bullets.children.each((child) => {
      const bullet = child as Phaser.Physics.Arcade.Sprite;

      if (
        bullet.x < -BULLET_CULL_MARGIN ||
        bullet.x > width + BULLET_CULL_MARGIN ||
        bullet.y < -BULLET_CULL_MARGIN ||
        bullet.y > height + BULLET_CULL_MARGIN
      ) {
        bullet.destroy();
      }

      return true;
    });
  }
}
