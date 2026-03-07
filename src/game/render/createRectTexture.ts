import Phaser from "phaser";

export function createRectTexture(
  scene: Phaser.Scene,
  key: string,
  width: number,
  height: number,
  color: number
): string {
  if (scene.textures.exists(key)) {
    return key;
  }

  const graphics = scene.make.graphics({ x: 0, y: 0 }, false);
  graphics.fillStyle(color, 1);
  graphics.fillRoundedRect(0, 0, width, height, 8);
  graphics.generateTexture(key, width, height);
  graphics.destroy();

  return key;
}
