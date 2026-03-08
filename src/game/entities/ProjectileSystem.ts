import Phaser from "phaser";
import { BULLET_CULL_MARGIN, BULLET_SPEED } from "../config";
import { createSlimeDropletTexture } from "../render/createSlimeDropletTexture";

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
    const dropletDirection = direction.clone().normalize();
    const spawnOffset = new Phaser.Math.Vector2(dropletDirection.x * 18, dropletDirection.y * 18);

    if (Math.abs(dropletDirection.x) > Math.abs(dropletDirection.y)) {
      spawnOffset.y += 6;
    }

    const bullet = this.bullets.create(
      from.x + spawnOffset.x,
      from.y + spawnOffset.y,
      createSlimeDropletTexture(this.scene, "slime-bullet", 20)
    ) as Phaser.Physics.Arcade.Sprite;

    bullet.setDepth(1);
    const body = bullet.body as Phaser.Physics.Arcade.Body;
    body.setAllowGravity(false);
    body.setCircle(8, 2, 2);
    bullet.setCollideWorldBounds(false);
    bullet.setScale(0.72);
    bullet.setVelocity(dropletDirection.x * BULLET_SPEED, dropletDirection.y * BULLET_SPEED);

    this.scene.tweens.add({
      targets: bullet,
      scaleX: 1,
      scaleY: 0.82,
      duration: 90,
      ease: "Quad.Out"
    });
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
