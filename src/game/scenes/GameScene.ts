import Phaser from "phaser";
import { PLAYER_SPEED } from "../config";
import { ProjectileSystem } from "../entities/ProjectileSystem";
import { createControls, type Controls, getMovementVector } from "../input/createControls";
import { createFloorGrid } from "../render/createFloorGrid";
import { createSlimeTexture, type SlimeDirection } from "../render/createOvalTexture";
import { createRectTexture } from "../render/createRectTexture";

export class GameScene extends Phaser.Scene {
  private static readonly PLAYER_TEXTURE_WIDTH = 108;
  private static readonly PLAYER_TEXTURE_HEIGHT = 80;
  private static readonly PLAYER_DISPLAY_WIDTH = 54;
  private static readonly PLAYER_DISPLAY_HEIGHT = 40;
  private static readonly PLAYER_BASE_SCALE_X =
    GameScene.PLAYER_DISPLAY_WIDTH / GameScene.PLAYER_TEXTURE_WIDTH;
  private static readonly PLAYER_BASE_SCALE_Y =
    GameScene.PLAYER_DISPLAY_HEIGHT / GameScene.PLAYER_TEXTURE_HEIGHT;

  private player!: Phaser.Types.Physics.Arcade.SpriteWithDynamicBody;
  private controls!: Controls;
  private walls!: Phaser.Physics.Arcade.StaticGroup;
  private projectiles!: ProjectileSystem;
  private idleTween?: Phaser.Tweens.Tween;
  private moveTween?: Phaser.Tweens.Tween;
  private isMoving = false;
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
    this.player.setScale(GameScene.PLAYER_BASE_SCALE_X, GameScene.PLAYER_BASE_SCALE_Y);
    this.player.body.setAllowGravity(false);
    this.player.setSize(42, 28);
    this.player.setOffset(33, 26);
    this.physics.add.collider(this.player, this.walls);
    this.controls = createControls(this);
    this.startIdleAnimation();
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
      this.isMoving = true;
      this.stopIdleAnimation();

      if (this.moveTween) {
        return;
      }

      this.moveTween = this.tweens.add({
        targets: this.player,
        scaleX: GameScene.PLAYER_BASE_SCALE_X * 1.12,
        scaleY: GameScene.PLAYER_BASE_SCALE_Y * 0.92,
        duration: 180,
        ease: "Sine.InOut",
        yoyo: true,
        repeat: -1
      });

      return;
    }

    if (!this.isMoving) {
      this.startIdleAnimation();
      return;
    }

    this.isMoving = false;
    this.moveTween?.stop();
    this.moveTween = undefined;

    this.tweens.add({
      targets: this.player,
      scaleX: GameScene.PLAYER_BASE_SCALE_X,
      scaleY: GameScene.PLAYER_BASE_SCALE_Y,
      duration: 120,
      ease: "Quad.Out",
      onComplete: () => {
        this.startIdleAnimation();
      }
    });
  }

  private startIdleAnimation(): void {
    if (this.idleTween) {
      return;
    }

    this.idleTween = this.tweens.add({
      targets: this.player,
      scaleX: GameScene.PLAYER_BASE_SCALE_X * 1.02,
      scaleY: GameScene.PLAYER_BASE_SCALE_Y * 0.98,
      duration: 900,
      ease: "Sine.InOut",
      yoyo: true,
      repeat: -1
    });
  }

  private stopIdleAnimation(): void {
    this.idleTween?.stop();
    this.idleTween = undefined;
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
    return createSlimeTexture(
      this,
      `player-${direction}`,
      GameScene.PLAYER_TEXTURE_WIDTH,
      GameScene.PLAYER_TEXTURE_HEIGHT,
      0x9be564,
      direction
    );
  }
}
