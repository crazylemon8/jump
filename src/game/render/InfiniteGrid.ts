import Phaser from "phaser";
import { GRID_SIZE } from "../config";

export class InfiniteGrid {
  private readonly graphics: Phaser.GameObjects.Graphics;

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly lineColor: number,
    private readonly alpha: number
  ) {
    this.graphics = this.scene.add.graphics();
    this.graphics.setDepth(-50);
  }

  update(camera: Phaser.Cameras.Scene2D.Camera): void {
    const view = camera.worldView;
    const startX = Math.floor(view.x / GRID_SIZE) * GRID_SIZE;
    const endX = Math.ceil(view.right / GRID_SIZE) * GRID_SIZE;
    const startY = Math.floor(view.y / GRID_SIZE) * GRID_SIZE;
    const endY = Math.ceil(view.bottom / GRID_SIZE) * GRID_SIZE;

    this.graphics.clear();
    this.graphics.lineStyle(1, this.lineColor, this.alpha);

    for (let x = startX; x <= endX; x += GRID_SIZE) {
      this.graphics.lineBetween(x, startY, x, endY);
    }

    for (let y = startY; y <= endY; y += GRID_SIZE) {
      this.graphics.lineBetween(startX, y, endX, y);
    }
  }

  destroy(): void {
    this.graphics.destroy();
  }
}
