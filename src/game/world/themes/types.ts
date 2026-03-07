import Phaser from "phaser";

export interface WorldTheme {
  apply(scene: Phaser.Scene): void;
  update(camera: Phaser.Cameras.Scene2D.Camera): void;
  destroy(): void;
}
