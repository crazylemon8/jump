import Phaser from "phaser";
import { GAME_HEIGHT, GAME_WIDTH, GRID_SIZE } from "../config";

export function createFloorGrid(scene: Phaser.Scene): void {
  const graphics = scene.add.graphics();
  graphics.lineStyle(1, 0x1d3557, 0.65);

  for (let x = 0; x <= GAME_WIDTH; x += GRID_SIZE) {
    graphics.lineBetween(x, 0, x, GAME_HEIGHT);
  }

  for (let y = 0; y <= GAME_HEIGHT; y += GRID_SIZE) {
    graphics.lineBetween(0, y, GAME_WIDTH, y);
  }
}
