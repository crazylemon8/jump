import Phaser from "phaser";
import { GAME_HEIGHT, GAME_WIDTH, PLAYER_SPEED } from "../config";
import { SortingSkeleton, type ExitSide, type SkeletonColor } from "../entities/SortingSkeleton";
import { createControls, type Controls, getMovementVector } from "../input/createControls";
import { createSlimeTexture, type SlimeDirection } from "../render/createOvalTexture";
import { createRectTexture } from "../render/createRectTexture";
import { createDefaultWorldTheme, type WorldTheme } from "../world/themes";

export class GameScene extends Phaser.Scene {
  private static readonly PLAYER_TEXTURE_WIDTH = 108;
  private static readonly PLAYER_TEXTURE_HEIGHT = 80;
  private static readonly PLAYER_DISPLAY_WIDTH = 54;
  private static readonly PLAYER_DISPLAY_HEIGHT = 40;
  private static readonly PLAYER_BASE_SCALE_X =
    GameScene.PLAYER_DISPLAY_WIDTH / GameScene.PLAYER_TEXTURE_WIDTH;
  private static readonly PLAYER_BASE_SCALE_Y =
    GameScene.PLAYER_DISPLAY_HEIGHT / GameScene.PLAYER_TEXTURE_HEIGHT;
  private static readonly FLOOR_Y = 476;
  private static readonly FLOOR_WIDTH = 640;
  private static readonly FLOOR_HEIGHT = 36;
  private static readonly FLOOR_X = GAME_WIDTH / 2;
  private static readonly PLAYER_SPAWN_X = GAME_WIDTH / 2;
  private static readonly PLAYER_SPAWN_Y = 390;

  private player!: Phaser.Types.Physics.Arcade.SpriteWithDynamicBody;
  private controls!: Controls;
  private floor!: Phaser.Types.Physics.Arcade.ImageWithStaticBody;
  private enemies: SortingSkeleton[] = [];
  private enemyGroup!: Phaser.Physics.Arcade.Group;
  private worldTheme!: WorldTheme;
  private idleTween?: Phaser.Tweens.Tween;
  private moveTween?: Phaser.Tweens.Tween;
  private spawnTimer?: Phaser.Time.TimerEvent;
  private isMoving = false;
  private isGameOver = false;
  private retryHandler?: () => void;
  private facing = new Phaser.Math.Vector2(1, 0);
  private redSorted = 0;
  private greenSorted = 0;
  private mistakesRemaining = 5;

  constructor() {
    super("game");
  }

  create(): void {
    this.resetState();
    this.worldTheme = createDefaultWorldTheme();
    this.worldTheme.apply(this);
    this.cameras.main.setBounds(0, 0, GAME_WIDTH, GAME_HEIGHT);

    this.createLedge();
    this.createGoalMarkers();

    this.enemyGroup = this.physics.add.group();
    this.spawnTimer = this.time.addEvent({
      delay: 1600,
      loop: true,
      callback: () => {
        this.spawnSkeleton();
      }
    });

    this.player = this.physics.add
      .sprite(GameScene.PLAYER_SPAWN_X, GameScene.PLAYER_SPAWN_Y, this.getSlimeTexture("right"))
      .setCollideWorldBounds(false);
    this.player.setScale(GameScene.PLAYER_BASE_SCALE_X, GameScene.PLAYER_BASE_SCALE_Y);
    this.player.setSize(42, 28);
    this.player.setOffset(33, 26);
    this.player.setBounce(0);
    this.player.setDragX(1400);
    this.player.setMaxVelocity(PLAYER_SPEED, 900);

    this.physics.add.collider(this.player, this.floor);
    this.physics.add.collider(this.enemyGroup, this.floor);
    this.physics.add.collider(
      this.enemyGroup,
      this.enemyGroup,
      undefined,
      (leftGO, rightGO) => {
        const leftEnemy = this.findEnemy(leftGO as Phaser.Types.Physics.Arcade.SpriteWithDynamicBody);
        const rightEnemy = this.findEnemy(rightGO as Phaser.Types.Physics.Arcade.SpriteWithDynamicBody);

        if (!leftEnemy || !rightEnemy) {
          return true;
        }

        return leftEnemy.horizontalDirection === rightEnemy.horizontalDirection;
      }
    );
    this.physics.add.collider(
      this.player,
      this.enemyGroup,
      (_player, enemyGO) => {
        const enemy = this.findEnemy(enemyGO as Phaser.Types.Physics.Arcade.SpriteWithDynamicBody);

        if (!enemy) {
          return;
        }

        enemy.redirectFromPlayer(this.player.x, this.time.now);
        const body = this.player.body as Phaser.Physics.Arcade.Body;
        body.velocity.x += enemy.gameObject.x < this.player.x ? 40 : -40;
      },
      (_player, enemyGO) => {
        const enemy = this.findEnemy(enemyGO as Phaser.Types.Physics.Arcade.SpriteWithDynamicBody);

        if (!enemy) {
          return true;
        }

        const movingTowardCorrectSide =
          (enemy.skeletonColor === "red" && enemy.horizontalDirection === -1) ||
          (enemy.skeletonColor === "green" && enemy.horizontalDirection === 1);

        return !movingTowardCorrectSide;
      }
    );

    this.controls = createControls(this);
    this.startIdleAnimation();
    this.updateHud();
    this.setGameOverOverlay(false);

    this.retryHandler = () => {
      this.physics.resume();
      this.scene.restart();
    };

    document.querySelector<HTMLButtonElement>("#retry-button")?.addEventListener("click", this.retryHandler);

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.spawnTimer?.destroy();
      document.querySelector<HTMLButtonElement>("#retry-button")?.removeEventListener("click", this.retryHandler!);
      this.setGameOverOverlay(false);
      this.worldTheme.destroy();
    });
  }

  private resetState(): void {
    this.enemies = [];
    this.isMoving = false;
    this.isGameOver = false;
    this.redSorted = 0;
    this.greenSorted = 0;
    this.mistakesRemaining = 5;
    this.idleTween = undefined;
    this.moveTween = undefined;
    this.spawnTimer = undefined;
    this.retryHandler = undefined;
    this.facing.set(1, 0);
  }

  update(): void {
    if (this.isGameOver) {
      return;
    }

    const movement = getMovementVector(this.controls.cursors, this.controls.wasd);
    this.updatePlayerMovement(movement);
    this.updateFacing(movement);
    this.updateMoveAnimation(Math.abs(this.player.body.velocity.x) > 8);
    this.worldTheme.update(this.cameras.main);
    this.updateEnemies();
    this.respawnPlayerIfNeeded();
  }

  private createLedge(): void {
    this.floor = this.physics.add
      .staticImage(
        GameScene.FLOOR_X,
        GameScene.FLOOR_Y,
        createRectTexture(this, "ledge-floor", GameScene.FLOOR_WIDTH, GameScene.FLOOR_HEIGHT, 0x6f3323)
      )
      .setDepth(-10);
    this.floor.refreshBody();

    const trim = this.add.graphics();
    trim.setDepth(-9);
    trim.fillStyle(0xff7a21, 0.85);
    trim.fillRect(
      GameScene.FLOOR_X - GameScene.FLOOR_WIDTH / 2,
      GameScene.FLOOR_Y - GameScene.FLOOR_HEIGHT / 2,
      GameScene.FLOOR_WIDTH,
      6
    );
  }

  private createGoalMarkers(): void {
    const graphics = this.add.graphics();
    graphics.setDepth(-5);

    graphics.fillStyle(0xff5757, 0.95);
    graphics.fillTriangle(104, GameScene.FLOOR_Y - 12, 62, GameScene.FLOOR_Y + 10, 104, GameScene.FLOOR_Y + 30);

    graphics.fillStyle(0x67e27d, 0.95);
    graphics.fillTriangle(
      GAME_WIDTH - 104,
      GameScene.FLOOR_Y - 12,
      GAME_WIDTH - 62,
      GameScene.FLOOR_Y + 10,
      GAME_WIDTH - 104,
      GameScene.FLOOR_Y + 30
    );
  }

  private spawnSkeleton(): void {
    const spawnBandWidth = GameScene.FLOOR_WIDTH * 0.3;
    const minSpawnX = GameScene.FLOOR_X - spawnBandWidth / 2;
    const maxSpawnX = GameScene.FLOOR_X + spawnBandWidth / 2;
    const color: SkeletonColor = Phaser.Math.Between(0, 1) === 0 ? "red" : "green";
    const enemy = new SortingSkeleton(this, Phaser.Math.Between(minSpawnX, maxSpawnX), 88, color);

    this.enemies.push(enemy);
    this.enemyGroup.add(enemy.gameObject);
  }

  private updatePlayerMovement(movement: Phaser.Math.Vector2): void {
    const body = this.player.body as Phaser.Physics.Arcade.Body;
    const horizontal = Phaser.Math.Clamp(movement.x, -1, 1);
    this.player.setVelocityX(horizontal * PLAYER_SPEED);

    if (movement.y < 0 && body.blocked.down) {
      this.player.setVelocityY(-520);
    }
  }

  private updateEnemies(): void {
    for (let index = this.enemies.length - 1; index >= 0; index -= 1) {
      const enemy = this.enemies[index];
      enemy.update();

      const exitSide = enemy.getExitSide();

      if (!exitSide) {
        continue;
      }

      this.handleEnemyExit(enemy, exitSide);
      this.enemies.splice(index, 1);
    }
  }

  private handleEnemyExit(enemy: SortingSkeleton, exitSide: ExitSide): void {
    const color = enemy.skeletonColor;
    const isCorrect =
      (color === "red" && exitSide === "left") || (color === "green" && exitSide === "right");

    if (isCorrect) {
      if (color === "red") {
        this.redSorted += 1;
      } else {
        this.greenSorted += 1;
      }
    } else {
      if (this.mistakesRemaining === 0) {
        enemy.destroy();
        this.endGame();
        return;
      }

      this.mistakesRemaining -= 1;
    }

    enemy.destroy();
    this.updateHud();
  }

  private respawnPlayerIfNeeded(): void {
    if (this.player.y <= GAME_HEIGHT + 80) {
      return;
    }

    this.player.setPosition(GameScene.PLAYER_SPAWN_X, GameScene.PLAYER_SPAWN_Y);
    this.player.setVelocity(0, 0);
  }

  private findEnemy(sprite: Phaser.Types.Physics.Arcade.SpriteWithDynamicBody): SortingSkeleton | undefined {
    return this.enemies.find((enemy) => enemy.gameObject === sprite);
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

    if (Math.abs(movement.x) >= Math.abs(movement.y)) {
      this.facing.set(Math.sign(movement.x) || this.facing.x || 1, 0);
    } else {
      this.facing.set(0, Math.sign(movement.y));
    }

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

  private updateHud(): void {
    const redScore = document.querySelector<HTMLElement>("#hud-red");
    const mistakes = document.querySelector<HTMLElement>("#hud-mistakes");
    const greenScore = document.querySelector<HTMLElement>("#hud-green");

    if (redScore) {
      redScore.textContent = String(this.redSorted);
    }

    if (mistakes) {
      mistakes.textContent = String(this.mistakesRemaining);
    }

    if (greenScore) {
      greenScore.textContent = String(this.greenSorted);
    }
  }

  private endGame(): void {
    this.isGameOver = true;
    this.spawnTimer?.remove(false);
    this.player.setVelocity(0, 0);
    this.physics.pause();
    this.setGameOverOverlay(true);
  }

  private setGameOverOverlay(isVisible: boolean): void {
    const overlay = document.querySelector<HTMLElement>("#game-over");

    if (overlay) {
      overlay.hidden = !isVisible;
    }
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
