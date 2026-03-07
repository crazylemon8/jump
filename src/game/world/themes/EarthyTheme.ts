import Phaser from "phaser";
import { SHOW_GRID } from "../../config";
import { InfiniteGrid } from "../../render/InfiniteGrid";
import { ChunkedGroundLayer } from "../ChunkedGroundLayer";
import { WorldTheme } from "./types";

export class EarthyTheme implements WorldTheme {
  private ground?: ChunkedGroundLayer;
  private grid?: InfiniteGrid;

  apply(scene: Phaser.Scene): void {
    scene.cameras.main.setBackgroundColor("#6b4625");
    this.ground = new ChunkedGroundLayer(scene);

    if (SHOW_GRID) {
      this.grid = new InfiniteGrid(scene, 0x4c3218, 0.42);
    }
  }

  update(camera: Phaser.Cameras.Scene2D.Camera): void {
    this.ground?.update(camera);
    this.grid?.update(camera);
  }

  destroy(): void {
    this.ground?.destroy();
    this.ground = undefined;
    this.grid?.destroy();
    this.grid = undefined;
  }
}
