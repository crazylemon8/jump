import Phaser from "phaser";
import { GAME_HEIGHT, GAME_WIDTH, SHOW_GRID } from "../../config";
import { InfiniteGrid } from "../../render/InfiniteGrid";
import { ChunkedGroundLayer } from "../ChunkedGroundLayer";
import { WorldTheme } from "./types";

export class EarthyTheme implements WorldTheme {
  private ground?: ChunkedGroundLayer;
  private grid?: InfiniteGrid;
  private abyssGlow?: Phaser.GameObjects.Graphics;

  apply(scene: Phaser.Scene): void {
    scene.cameras.main.setBackgroundColor("#1b0608");
    this.ground = new ChunkedGroundLayer(scene);

    this.abyssGlow = scene.add.graphics();
    this.abyssGlow.setDepth(-120);
    this.abyssGlow.fillGradientStyle(0x2a080a, 0x2a080a, 0x521010, 0x521010, 1);
    this.abyssGlow.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
    this.abyssGlow.fillStyle(0xff6a1a, 0.14);
    this.abyssGlow.fillEllipse(GAME_WIDTH / 2, GAME_HEIGHT - 20, GAME_WIDTH * 0.8, Math.max(120, GAME_HEIGHT * 0.18));

    if (SHOW_GRID) {
      this.grid = new InfiniteGrid(scene, 0x6c2a18, 0.32);
    }
  }

  update(camera: Phaser.Cameras.Scene2D.Camera): void {
    this.ground?.update(camera);
    this.grid?.update(camera);
  }

  destroy(): void {
    this.ground?.destroy();
    this.ground = undefined;
    this.abyssGlow?.destroy();
    this.abyssGlow = undefined;
    this.grid?.destroy();
    this.grid = undefined;
  }
}
