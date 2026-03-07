import Phaser from "phaser";

export type SlimeDirection = "front" | "back" | "left" | "right";

export function createSlimeTexture(
  scene: Phaser.Scene,
  key: string,
  width: number,
  height: number,
  color: number,
  direction: SlimeDirection
): string {
  if (scene.textures.exists(key)) {
    return key;
  }

  const graphics = scene.make.graphics({ x: 0, y: 0 }, false);

  const centerX = width / 2;
  const centerY = height / 2;

  graphics.fillStyle(0x8ee15c, 1);
  graphics.fillEllipse(centerX, centerY + 2, width, height);

  graphics.fillStyle(color, 1);
  graphics.fillEllipse(centerX, centerY - 2, width * 0.94, height * 0.88);

  graphics.fillStyle(0x7ccf4f, 0.95);
  graphics.fillEllipse(centerX, centerY + height * 0.14, width * 0.82, height * 0.42);

  graphics.fillStyle(0xdaf7b8, 0.7);
  graphics.fillEllipse(width * 0.34, height * 0.22, width * 0.24, height * 0.18);
  graphics.fillEllipse(width * 0.66, height * 0.18, width * 0.2, height * 0.14);

  if (direction === "front") {
    graphics.fillStyle(0x0b0f14, 1);
    graphics.fillCircle(width * 0.33, height * 0.53, width * 0.07);
    graphics.fillCircle(width * 0.67, height * 0.53, width * 0.07);

    graphics.fillStyle(0xffffff, 1);
    graphics.fillCircle(width * 0.305, height * 0.5, width * 0.025);
    graphics.fillCircle(width * 0.645, height * 0.5, width * 0.025);
    graphics.fillCircle(width * 0.35, height * 0.57, width * 0.014);
    graphics.fillCircle(width * 0.69, height * 0.57, width * 0.014);

    graphics.fillStyle(0xff8fb1, 0.85);
    graphics.fillEllipse(width * 0.21, height * 0.64, width * 0.12, height * 0.09);
    graphics.fillEllipse(width * 0.79, height * 0.64, width * 0.12, height * 0.09);

    graphics.lineStyle(2, 0x4f7f27, 0.9);
    graphics.beginPath();
    graphics.arc(centerX, height * 0.63, width * 0.075, Phaser.Math.DegToRad(15), Phaser.Math.DegToRad(165), false);
    graphics.strokePath();
  }

  if (direction === "left" || direction === "right") {
    const facingRight = direction === "right";
    const eyeX = facingRight ? width * 0.71 : width * 0.29;
    const eyeHighlightX = facingRight ? width * 0.68 : width * 0.26;
    const eyeSparkleX = facingRight ? width * 0.74 : width * 0.31;
    const blushX = facingRight ? width * 0.54 : width * 0.46;

    graphics.fillStyle(0x0b0f14, 1);
    graphics.fillCircle(eyeX, height * 0.54, width * 0.075);

    graphics.fillStyle(0xffffff, 1);
    graphics.fillCircle(eyeHighlightX, height * 0.505, width * 0.028);
    graphics.fillCircle(eyeSparkleX, height * 0.585, width * 0.015);

    graphics.fillStyle(0xff8fb1, 0.8);
    graphics.fillEllipse(blushX, height * 0.65, width * 0.13, height * 0.09);
  }

  if (direction === "back") {
    graphics.fillStyle(0xbef18f, 0.45);
    graphics.fillEllipse(centerX, height * 0.52, width * 0.34, height * 0.14);
  }

  graphics.generateTexture(key, width, height);
  graphics.destroy();

  return key;
}
