import Phaser from "phaser";

export function createSkeletonTexture(scene: Phaser.Scene, key: string, width: number, height: number): string {
  if (scene.textures.exists(key)) {
    return key;
  }

  const graphics = scene.make.graphics({ x: 0, y: 0 }, false);
  const skullX = width * 0.5;
  const skullY = height * 0.22;

  graphics.lineStyle(2, 0x4a4a4a, 1);

  graphics.fillStyle(0xe8e8e8, 1);
  graphics.fillCircle(skullX, skullY, width * 0.14);
  graphics.strokeCircle(skullX, skullY, width * 0.14);

  graphics.fillStyle(0xff2d2d, 1);
  graphics.fillEllipse(width * 0.44, height * 0.22, width * 0.08, height * 0.06);
  graphics.fillEllipse(width * 0.56, height * 0.22, width * 0.08, height * 0.06);

  graphics.strokeLineShape(new Phaser.Geom.Line(width * 0.5, height * 0.33, width * 0.5, height * 0.54));
  graphics.strokeLineShape(new Phaser.Geom.Line(width * 0.42, height * 0.38, width * 0.58, height * 0.38));
  graphics.strokeLineShape(new Phaser.Geom.Line(width * 0.41, height * 0.44, width * 0.59, height * 0.44));
  graphics.strokeLineShape(new Phaser.Geom.Line(width * 0.42, height * 0.5, width * 0.58, height * 0.5));

  graphics.strokeLineShape(new Phaser.Geom.Line(width * 0.5, height * 0.4, width * 0.34, height * 0.52));
  graphics.strokeLineShape(new Phaser.Geom.Line(width * 0.34, height * 0.52, width * 0.28, height * 0.69));
  graphics.strokeLineShape(new Phaser.Geom.Line(width * 0.5, height * 0.4, width * 0.67, height * 0.52));
  graphics.strokeLineShape(new Phaser.Geom.Line(width * 0.67, height * 0.52, width * 0.77, height * 0.69));

  graphics.strokeLineShape(new Phaser.Geom.Line(width * 0.5, height * 0.54, width * 0.41, height * 0.76));
  graphics.strokeLineShape(new Phaser.Geom.Line(width * 0.41, height * 0.76, width * 0.34, height * 0.95));
  graphics.strokeLineShape(new Phaser.Geom.Line(width * 0.5, height * 0.54, width * 0.58, height * 0.76));
  graphics.strokeLineShape(new Phaser.Geom.Line(width * 0.58, height * 0.76, width * 0.65, height * 0.95));

  graphics.fillStyle(0xe8e8e8, 1);
  graphics.fillCircle(width * 0.28, height * 0.69, width * 0.03);
  graphics.fillCircle(width * 0.77, height * 0.69, width * 0.03);
  graphics.fillCircle(width * 0.34, height * 0.95, width * 0.04);
  graphics.fillCircle(width * 0.65, height * 0.95, width * 0.04);

  graphics.lineStyle(3, 0xc89a1d, 1);
  graphics.beginPath();
  graphics.arc(width * 0.18, height * 0.6, width * 0.22, Phaser.Math.DegToRad(290), Phaser.Math.DegToRad(70), false);
  graphics.strokePath();

  graphics.generateTexture(key, width, height);
  graphics.destroy();

  return key;
}
