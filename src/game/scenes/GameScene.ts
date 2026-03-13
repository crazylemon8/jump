import Phaser from "phaser";
import { GAME_HEIGHT, GAME_WIDTH, PLAYER_SPEED } from "../config";
import { SortingSkeleton, type ExitSide, type SkeletonColor } from "../entities/SortingSkeleton";
import { createControls, type Controls, getMovementVector } from "../input/createControls";
import { createSlimeTexture, type SlimeDirection } from "../render/createOvalTexture";
import { createRectTexture } from "../render/createRectTexture";
import { createDefaultWorldTheme, type WorldTheme } from "../world/themes";

export class GameScene extends Phaser.Scene {
  private static readonly SPEED_STEP_INTERVAL = 10;
  private static readonly SPEED_STEP_AMOUNT = 0.16;
  private static readonly SPAWN_DELAY_BASE = 1600;
  private static readonly SPAWN_DELAY_STEP = 70;
  private static readonly SPAWN_DELAY_MIN = 780;
  private static readonly SPEED_POWER_MAX = 100;
  private static readonly SPEED_POWER_DRAIN_PER_SECOND = 34;
  private static readonly SPEED_POWER_RECOVER_PER_SECOND = 10;
  private static readonly SPRINT_SPEED_MULTIPLIER = 1.75;
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
  private isPaused = false;
  private isRoundActive = false;
  private retryHandler?: () => void;
  private startHandler?: (event: KeyboardEvent) => void;
  private startPointerHandler?: () => void;
  private pauseButtonHandler?: () => void;
  private resumeHandler?: (event: KeyboardEvent) => void;
  private pausePointerHandler?: () => void;
  private blurHandler?: () => void;
  private visibilityHandler?: () => void;
  private mobileCleanupHandlers: Array<() => void> = [];
  private facing = new Phaser.Math.Vector2(1, 0);
  private redSorted = 0;
  private greenSorted = 0;
  private mistakesRemaining = 5;
  private resolvedSkeletons = 0;
  private speedPower = GameScene.SPEED_POWER_MAX;
  private isSprintActive = false;
  private mobileInput = {
    x: 0,
    y: 0,
    sprint: false
  };

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
    this.configureSpawnTimer(true);

    this.player = this.physics.add
      .sprite(GameScene.PLAYER_SPAWN_X, GameScene.PLAYER_SPAWN_Y, this.getSlimeTexture("right"))
      .setCollideWorldBounds(false);
    this.player.setScale(GameScene.PLAYER_BASE_SCALE_X, GameScene.PLAYER_BASE_SCALE_Y);
    this.player.setSize(42, 28);
    this.player.setOffset(33, 26);
    this.player.setBounce(0);
    this.player.setDragX(1400);
    this.player.setMaxVelocity(PLAYER_SPEED * GameScene.SPRINT_SPEED_MULTIPLIER, 900);

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

        enemy.redirectFromPlayer(this.player.x, this.time.now, this.getSkeletonSpeedMultiplier());
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
    this.updateSpeedMeter();
    this.setGameOverOverlay(false);
    this.setPauseOverlay(false);
    this.setStartOverlay(true);

    this.retryHandler = () => {
      this.physics.resume();
      this.scene.restart();
    };

    this.startHandler = () => {
      this.beginRound();
    };
    this.startPointerHandler = () => {
      this.beginRound();
    };
    this.pauseButtonHandler = () => {
      this.togglePause();
    };
    this.resumeHandler = () => {
      if (this.isPaused) {
        this.resumeGame();
      }
    };
    this.pausePointerHandler = () => {
      if (this.isPaused) {
        this.resumeGame();
      }
    };
    this.blurHandler = () => {
      this.pauseGame();
    };
    this.visibilityHandler = () => {
      if (document.hidden) {
        this.pauseGame();
      }
    };

    document.querySelector<HTMLButtonElement>("#retry-button")?.addEventListener("click", this.retryHandler);
    document.querySelector<HTMLButtonElement>("#pause-button")?.addEventListener("click", this.pauseButtonHandler);
    document.querySelector<HTMLElement>("#game-start")?.addEventListener("pointerdown", this.startPointerHandler);
    document.querySelector<HTMLElement>("#game-pause")?.addEventListener("pointerdown", this.pausePointerHandler);
    window.addEventListener("keydown", this.startHandler, { once: true });
    window.addEventListener("keydown", this.resumeHandler);
    window.addEventListener("blur", this.blurHandler);
    document.addEventListener("visibilitychange", this.visibilityHandler);
    this.bindMobileControls();

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.spawnTimer?.destroy();
      document.querySelector<HTMLButtonElement>("#retry-button")?.removeEventListener("click", this.retryHandler!);
      document.querySelector<HTMLButtonElement>("#pause-button")?.removeEventListener("click", this.pauseButtonHandler!);
      document.querySelector<HTMLElement>("#game-start")?.removeEventListener("pointerdown", this.startPointerHandler!);
      document.querySelector<HTMLElement>("#game-pause")?.removeEventListener("pointerdown", this.pausePointerHandler!);
      if (this.startHandler) {
        window.removeEventListener("keydown", this.startHandler);
      }
      if (this.resumeHandler) {
        window.removeEventListener("keydown", this.resumeHandler);
      }
      if (this.blurHandler) {
        window.removeEventListener("blur", this.blurHandler);
      }
      if (this.visibilityHandler) {
        document.removeEventListener("visibilitychange", this.visibilityHandler);
      }
      for (const cleanup of this.mobileCleanupHandlers) {
        cleanup();
      }
      this.setGameOverOverlay(false);
      this.setPauseOverlay(false);
      this.setStartOverlay(false);
      this.worldTheme.destroy();
    });
  }

  private resetState(): void {
    this.enemies = [];
    this.isMoving = false;
    this.isGameOver = false;
    this.isPaused = false;
    this.redSorted = 0;
    this.greenSorted = 0;
    this.mistakesRemaining = 5;
    this.resolvedSkeletons = 0;
    this.speedPower = GameScene.SPEED_POWER_MAX;
    this.isSprintActive = false;
    this.idleTween = undefined;
    this.moveTween = undefined;
    this.spawnTimer = undefined;
    this.retryHandler = undefined;
    this.startHandler = undefined;
    this.startPointerHandler = undefined;
    this.pauseButtonHandler = undefined;
    this.resumeHandler = undefined;
    this.pausePointerHandler = undefined;
    this.blurHandler = undefined;
    this.visibilityHandler = undefined;
    this.mobileCleanupHandlers = [];
    this.isRoundActive = false;
    this.facing.set(1, 0);
    this.mobileInput.x = 0;
    this.mobileInput.y = 0;
    this.mobileInput.sprint = false;
  }

  update(_time: number, delta: number): void {
    if (Phaser.Input.Keyboard.JustDown(this.controls.pause)) {
      this.togglePause();
    }

    if (this.isGameOver) {
      return;
    }

    if (this.isPaused) {
      return;
    }

    const movement = this.getMovementInput();
    if (this.isRoundActive) {
      this.updatePlayerMovement(movement, delta);
    } else {
      this.isSprintActive = false;
      this.player.setVelocity(0, 0);
      this.recoverSpeedPower(delta);
    }
    this.updateFacing(movement);
    this.updateMoveAnimation(Math.abs(this.player.body.velocity.x) > 8);
    this.worldTheme.update(this.cameras.main);
    if (this.isRoundActive) {
      this.updateEnemies();
    }
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

  private getMovementInput(): Phaser.Math.Vector2 {
    const movement = getMovementVector(this.controls.cursors, this.controls.wasd);

    movement.x += this.mobileInput.x;
    movement.y += this.mobileInput.y;

    movement.x = Phaser.Math.Clamp(movement.x, -1, 1);
    movement.y = Phaser.Math.Clamp(movement.y, -1, 1);

    return movement;
  }

  private updatePlayerMovement(movement: Phaser.Math.Vector2, delta: number): void {
    const body = this.player.body as Phaser.Physics.Arcade.Body;
    const horizontal = Phaser.Math.Clamp(movement.x, -1, 1);
    const isTryingToSprint =
      horizontal !== 0 && (this.controls.sprint.isDown || this.mobileInput.sprint) && this.speedPower > 0;
    this.isSprintActive = isTryingToSprint;

    if (this.isSprintActive) {
      this.speedPower = Math.max(
        0,
        this.speedPower - (GameScene.SPEED_POWER_DRAIN_PER_SECOND * delta) / 1000
      );

      if (this.speedPower === 0) {
        this.isSprintActive = false;
      }
    } else {
      this.recoverSpeedPower(delta);
    }

    const horizontalSpeed =
      PLAYER_SPEED * (this.isSprintActive ? GameScene.SPRINT_SPEED_MULTIPLIER : 1);

    this.player.setVelocityX(horizontal * horizontalSpeed);
    this.updateSpeedMeter();

    if (movement.y < 0 && body.blocked.down) {
      this.player.setVelocityY(-520);
    }
  }

  private updateEnemies(): void {
    const speedMultiplier = this.getSkeletonSpeedMultiplier();

    for (let index = this.enemies.length - 1; index >= 0; index -= 1) {
      const enemy = this.enemies[index];
      enemy.update(speedMultiplier);

      const exitSide = enemy.getExitSide();

      if (!exitSide) {
        continue;
      }

      this.handleEnemyExit(enemy, exitSide);
      this.enemies.splice(index, 1);
    }
  }

  private handleEnemyExit(enemy: SortingSkeleton, exitSide: ExitSide): void {
    this.resolvedSkeletons += 1;

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
    this.refreshSpawnRate();
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

  private updateSpeedMeter(): void {
    const fill = document.querySelector<HTMLElement>("#hud-speed-fill");

    if (!fill) {
      return;
    }

    const ratio = Phaser.Math.Clamp(this.speedPower / GameScene.SPEED_POWER_MAX, 0, 1);
    fill.style.transform = `scaleX(${ratio})`;
    fill.style.opacity = this.isSprintActive ? "1" : "0.88";
  }

  private getSkeletonSpeedMultiplier(): number {
    const speedSteps = Math.floor(this.resolvedSkeletons / GameScene.SPEED_STEP_INTERVAL);

    return 1 + speedSteps * GameScene.SPEED_STEP_AMOUNT;
  }

  private getSpawnDelay(): number {
    const speedSteps = Math.floor(this.resolvedSkeletons / GameScene.SPEED_STEP_INTERVAL);

    return Math.max(GameScene.SPAWN_DELAY_MIN, GameScene.SPAWN_DELAY_BASE - speedSteps * GameScene.SPAWN_DELAY_STEP);
  }

  private bindMobileControls(): void {
    this.bindMobileJoystick();
    this.bindMobileButton("#mobile-sprint", "sprint");
  }

  private bindMobileButton(selector: string, key: "sprint"): void {
    const element = document.querySelector<HTMLElement>(selector);

    if (!element) {
      return;
    }

    const press = (event: Event) => {
      event.preventDefault();
      this.mobileInput[key] = true;
    };
    const release = (event: Event) => {
      event.preventDefault();
      this.mobileInput[key] = false;
    };

    element.addEventListener("pointerdown", press);
    element.addEventListener("pointerup", release);
    element.addEventListener("pointerleave", release);
    element.addEventListener("pointercancel", release);

    this.mobileCleanupHandlers.push(() => {
      element.removeEventListener("pointerdown", press);
      element.removeEventListener("pointerup", release);
      element.removeEventListener("pointerleave", release);
      element.removeEventListener("pointercancel", release);
    });
  }

  private bindMobileJoystick(): void {
    const base = document.querySelector<HTMLElement>("#mobile-joystick");
    const thumb = document.querySelector<HTMLElement>("#mobile-joystick-thumb");

    if (!base || !thumb) {
      return;
    }

    let activePointerId: number | null = null;

    const updateJoystick = (clientX: number, clientY: number) => {
      const rect = base.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;
      const radius = rect.width * 0.34;
      const dx = clientX - centerX;
      const dy = clientY - centerY;
      const distance = Math.hypot(dx, dy);
      const clampedDistance = Math.min(distance, radius);
      const angle = Math.atan2(dy, dx);
      const knobX = Math.cos(angle) * clampedDistance;
      const knobY = Math.sin(angle) * clampedDistance;
      const normalizedDistance = radius === 0 ? 0 : clampedDistance / radius;

      thumb.style.transform = `translate(calc(-50% + ${knobX}px), calc(-50% + ${knobY}px))`;
      this.mobileInput.x = Math.abs(knobX) < 4 ? 0 : Math.cos(angle) * normalizedDistance;
      this.mobileInput.y = Math.abs(knobY) < 4 ? 0 : Math.sin(angle) * normalizedDistance;
    };

    const resetJoystick = () => {
      activePointerId = null;
      thumb.style.transform = "translate(-50%, -50%)";
      this.mobileInput.x = 0;
      this.mobileInput.y = 0;
    };

    const onPointerDown = (event: PointerEvent) => {
      event.preventDefault();
      activePointerId = event.pointerId;
      base.setPointerCapture(event.pointerId);
      updateJoystick(event.clientX, event.clientY);
    };

    const onPointerMove = (event: PointerEvent) => {
      if (activePointerId !== event.pointerId) {
        return;
      }

      event.preventDefault();
      updateJoystick(event.clientX, event.clientY);
    };

    const onPointerUp = (event: PointerEvent) => {
      if (activePointerId !== event.pointerId) {
        return;
      }

      event.preventDefault();
      if (base.hasPointerCapture(event.pointerId)) {
        base.releasePointerCapture(event.pointerId);
      }
      resetJoystick();
    };

    base.addEventListener("pointerdown", onPointerDown);
    base.addEventListener("pointermove", onPointerMove);
    base.addEventListener("pointerup", onPointerUp);
    base.addEventListener("pointercancel", onPointerUp);

    this.mobileCleanupHandlers.push(() => {
      base.removeEventListener("pointerdown", onPointerDown);
      base.removeEventListener("pointermove", onPointerMove);
      base.removeEventListener("pointerup", onPointerUp);
      base.removeEventListener("pointercancel", onPointerUp);
      resetJoystick();
    });
  }

  private recoverSpeedPower(delta: number): void {
    this.speedPower = Math.min(
      GameScene.SPEED_POWER_MAX,
      this.speedPower + (GameScene.SPEED_POWER_RECOVER_PER_SECOND * delta) / 1000
    );
    this.updateSpeedMeter();
  }

  private endGame(): void {
    this.isGameOver = true;
    this.isRoundActive = false;
    this.isPaused = false;
    this.spawnTimer?.remove(false);
    this.player.setVelocity(0, 0);
    this.physics.pause();
    this.setPauseOverlay(false);
    this.updateFinalScore();
    this.setGameOverOverlay(true);
  }

  private setGameOverOverlay(isVisible: boolean): void {
    const overlay = document.querySelector<HTMLElement>("#game-over");

    if (overlay) {
      overlay.hidden = !isVisible;
    }
  }

  private setPauseOverlay(isVisible: boolean): void {
    const overlay = document.querySelector<HTMLElement>("#game-pause");

    if (overlay) {
      overlay.hidden = !isVisible;
    }
  }

  private updateFinalScore(): void {
    const finalScore = document.querySelector<HTMLElement>("#final-score");

    if (finalScore) {
      finalScore.textContent = `Final score: ${this.redSorted + this.greenSorted}  |  Red: ${this.redSorted}  |  Green: ${this.greenSorted}`;
    }
  }

  private setStartOverlay(isVisible: boolean): void {
    const overlay = document.querySelector<HTMLElement>("#game-start");

    if (overlay) {
      overlay.hidden = !isVisible;
    }
  }

  private beginRound(): void {
    if (this.isRoundActive || this.isGameOver) {
      return;
    }

    this.isRoundActive = true;
    this.isPaused = false;
    this.configureSpawnTimer(false);
    this.setStartOverlay(false);
  }

  private togglePause(): void {
    if (!this.isRoundActive || this.isGameOver) {
      return;
    }

    if (this.isPaused) {
      this.resumeGame();
      return;
    }

    this.pauseGame();
  }

  private pauseGame(): void {
    if (!this.isRoundActive || this.isGameOver || this.isPaused) {
      return;
    }

    this.isPaused = true;
    this.player.setVelocity(0, 0);
    if (this.spawnTimer) {
      this.spawnTimer.paused = true;
    }
    this.physics.pause();
    this.setPauseOverlay(true);
  }

  private resumeGame(): void {
    if (!this.isRoundActive || this.isGameOver || !this.isPaused) {
      return;
    }

    this.isPaused = false;
    this.physics.resume();
    if (this.spawnTimer) {
      this.spawnTimer.paused = false;
    }
    this.setPauseOverlay(false);
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

  private configureSpawnTimer(paused: boolean): void {
    this.spawnTimer?.destroy();
    this.spawnTimer = this.time.addEvent({
      delay: this.getSpawnDelay(),
      loop: true,
      callback: () => {
        this.spawnSkeleton();
      },
      paused
    });
  }

  private refreshSpawnRate(): void {
    if (!this.spawnTimer || this.isGameOver) {
      return;
    }

    this.configureSpawnTimer(this.isPaused || !this.isRoundActive);
  }
}
