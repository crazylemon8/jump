import Phaser from "phaser";

export function createSlimeDropletTexture(scene: Phaser.Scene, key: string, size: number): string {
  if (scene.textures.exists(key)) {
    return key;
  }

  const graphics = scene.make.graphics({ x: 0, y: 0 }, false);
  const center = size / 2;

  graphics.fillStyle(0x8ee15c, 1);
  graphics.fillCircle(center, center + 1, size * 0.48);

  graphics.fillStyle(0x9be564, 1);
  graphics.fillCircle(center, center, size * 0.44);

  graphics.fillStyle(0x7ccf4f, 0.95);
  graphics.fillEllipse(center, center + size * 0.12, size * 0.62, size * 0.28);

  graphics.fillStyle(0xdaf7b8, 0.72);
  graphics.fillEllipse(size * 0.36, size * 0.28, size * 0.24, size * 0.16);

  graphics.generateTexture(key, size, size);
  graphics.destroy();

  return key;
}
