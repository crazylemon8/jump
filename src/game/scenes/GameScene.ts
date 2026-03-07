import Phaser from "phaser";
import { PLAYER_SPEED } from "../config";
import { ProjectileSystem } from "../entities/ProjectileSystem";
import { createControls, type Controls, getMovementVector } from "../input/createControls";
import { createFloorGrid } from "../render/createFloorGrid";
import { createSlimeTexture, type SlimeDirection } from "../render/createOvalTexture";
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
      .sprite(140, 440, this.getSlimeTexture("right"))
      .setCollideWorldBounds(true);
    this.player.body.setAllowGravity(false);
    this.player.setSize(42, 28);
    this.player.setOffset(6, 6);
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
        scaleX: 1.12,
        scaleY: 0.92,
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
    this.updatePlayerVisualDirection();
  }

  private updatePlayerVisualDirection(): void {
    if (Math.abs(this.facing.x) > Math.abs(this.facing.y)) {
      this.player.setTexture(this.getSlimeTexture(this.facing.x < 0 ? "left" : "right"));
      return;
    }

    if (this.facing.y < 0) {
      this.player.setTexture(this.getSlimeTexture("back"));
      return;
    }

    this.player.setTexture(this.getSlimeTexture("front"));
  }

  private getSlimeTexture(direction: SlimeDirection): string {
    return createSlimeTexture(this, `player-${direction}`, 54, 40, 0x9be564, direction);
  }
}
