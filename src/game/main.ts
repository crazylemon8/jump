import Phaser from "phaser";
import { BootScene } from "./scenes/BootScene";
import { GameScene } from "./scenes/GameScene";

export function createGame(parent: string): Phaser.Game {
  return new Phaser.Game({
    type: Phaser.AUTO,
    parent,
    width: 960,
    height: 540,
    backgroundColor: "#09111f",
    physics: {
      default: "arcade",
      arcade: {
        gravity: { x: 0, y: 900 },
        debug: false
      }
    },
    scale: {
      mode: Phaser.Scale.FIT,
      autoCenter: Phaser.Scale.CENTER_BOTH
    },
    scene: [BootScene, GameScene]
  });
}
