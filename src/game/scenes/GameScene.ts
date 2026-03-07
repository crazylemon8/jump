import Phaser from "phaser";
import { PLAYER_SPEED } from "../config";
import { ProjectileSystem } from "../entities/ProjectileSystem";
import { createControls, type Controls, getMovementVector } from "../input/createControls";
import { createFloorGrid } from "../render/createFloorGrid";
import { createRectTexture } from "../render/createRectTexture";

export class GameScene extends Phaser.Scene {
  private player!: Phaser.Types.Physics.Arcade.SpriteWithDynamicBody;
  private controls!: Controls;
  private walls!: Phaser.Physics.Arcade.StaticGroup;
  private projectiles!: ProjectileSystem;
  private moveTween?: Phaser.Tweens.Tween;
  private facing = new Phaser.Math.Vector2(1, 0);

  constructor() {
    super("game");
  }

  create(): void {
    this.cameras.main.setBackgroundColor("#09111f");

    createFloorGrid(this);
    this.walls = this.physics.add.staticGroup();
    this.createWall(480, 270, 96, 220, 0xe63946);
    this.projectiles = new ProjectileSystem(this, this.walls);

    this.player = this.physics.add
      .sprite(140, 440, createRectTexture(this, "player", 48, 48, 0xf4d35e))
      .setCollideWorldBounds(true);
    this.player.body.setAllowGravity(false);
    this.physics.add.collider(this.player, this.walls);
    this.player.setScale(1);
    this.controls = createControls(this);
  }

  update(): void {
    const movement = getMovementVector(this.controls.cursors, this.controls.wasd);
    const velocity = movement.clone().scale(PLAYER_SPEED);

    this.player.setVelocity(velocity.x, velocity.y);
    this.updateFacing(movement);
    this.updateMoveAnimation(!movement.equals(Phaser.Math.Vector2.ZERO));
    this.projectiles.update();

    if (Phaser.Input.Keyboard.JustDown(this.controls.shoot)) {
      this.projectiles.fire(new Phaser.Math.Vector2(this.player.x, this.player.y), this.facing);
    }
  }

  private createWall(x: number, y: number, width: number, height: number, color: number): void {
    this.walls.create(x, y, createRectTexture(this, `wall-${x}-${y}`, width, height, color)).refreshBody();
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

  private updateFacing(movement: Phaser.Math.Vector2): void {
    if (movement.lengthSq() === 0) {
      return;
    }

    this.facing.copy(movement).normalize();
  }
}
