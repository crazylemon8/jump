import Phaser from "phaser";

export type MovementKeys = Record<"w" | "a" | "s" | "d", Phaser.Input.Keyboard.Key>;

export interface Controls {
  cursors: Phaser.Types.Input.Keyboard.CursorKeys;
  wasd: MovementKeys;
  shoot: Phaser.Input.Keyboard.Key;
  pause: Phaser.Input.Keyboard.Key;
  sprint: Phaser.Input.Keyboard.Key;
}

export function createControls(scene: Phaser.Scene): Controls {
  if (!scene.input.keyboard) {
    throw new Error("Keyboard input is unavailable.");
  }

  const cursors = scene.input.keyboard.createCursorKeys();

  if (!cursors.up || !cursors.left || !cursors.right) {
    throw new Error("Cursor keys are unavailable.");
  }

  return {
    cursors,
    wasd: {
      w: scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.W),
      a: scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.A),
      s: scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.S),
      d: scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.D)
    },
    shoot: scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE),
    pause: scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.ESC),
    sprint: scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SHIFT)
  };
}

export function getMovementVector(
  cursors: Phaser.Types.Input.Keyboard.CursorKeys,
  wasd: MovementKeys
): Phaser.Math.Vector2 {
  let x = 0;
  let y = 0;

  if (cursors.left.isDown || wasd.a.isDown) {
    x -= 1;
  }

  if (cursors.right.isDown || wasd.d.isDown) {
    x += 1;
  }

  if (cursors.up.isDown || wasd.w.isDown) {
    y -= 1;
  }

  if (cursors.down?.isDown || wasd.s.isDown) {
    y += 1;
  }

  return new Phaser.Math.Vector2(x, y);
}
