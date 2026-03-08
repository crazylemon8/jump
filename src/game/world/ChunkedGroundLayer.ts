import Phaser from "phaser";
import { CHUNK_TILE_SIZE, CHUNK_VIEW_PADDING, GRID_SIZE } from "../config";

type ChunkKey = `${number},${number}`;

interface Chunk {
  graphics: Phaser.GameObjects.Graphics;
  chunkX: number;
  chunkY: number;
}

export class ChunkedGroundLayer {
  private readonly chunks = new Map<ChunkKey, Chunk>();
  private readonly chunkWorldSize = GRID_SIZE * CHUNK_TILE_SIZE;

  constructor(private readonly scene: Phaser.Scene) {}

  update(camera: Phaser.Cameras.Scene2D.Camera): void {
    const visibleChunkBounds = this.getVisibleChunkBounds(camera.worldView);
    const nextKeys = new Set<ChunkKey>();

    for (let chunkY = visibleChunkBounds.minChunkY; chunkY <= visibleChunkBounds.maxChunkY; chunkY += 1) {
      for (let chunkX = visibleChunkBounds.minChunkX; chunkX <= visibleChunkBounds.maxChunkX; chunkX += 1) {
        const key = this.toChunkKey(chunkX, chunkY);
        nextKeys.add(key);

        if (!this.chunks.has(key)) {
          this.chunks.set(key, this.createChunk(chunkX, chunkY));
        }
      }
    }

    for (const [key, chunk] of this.chunks.entries()) {
      if (!nextKeys.has(key)) {
        chunk.graphics.destroy();
        this.chunks.delete(key);
      }
    }
  }

  destroy(): void {
    for (const chunk of this.chunks.values()) {
      chunk.graphics.destroy();
    }

    this.chunks.clear();
  }

  private createChunk(chunkX: number, chunkY: number): Chunk {
    const graphics = this.scene.add.graphics();
    graphics.setDepth(-100);

    const originX = chunkX * this.chunkWorldSize;
    const originY = chunkY * this.chunkWorldSize;

    for (let tileY = 0; tileY < CHUNK_TILE_SIZE; tileY += 1) {
      for (let tileX = 0; tileX < CHUNK_TILE_SIZE; tileX += 1) {
        const worldTileX = chunkX * CHUNK_TILE_SIZE + tileX;
        const worldTileY = chunkY * CHUNK_TILE_SIZE + tileY;
        const tileColor = this.getTileColor(worldTileX, worldTileY);

        graphics.fillStyle(tileColor, 1);
        graphics.fillRect(originX + tileX * GRID_SIZE, originY + tileY * GRID_SIZE, GRID_SIZE, GRID_SIZE);
      }
    }

    return { graphics, chunkX, chunkY };
  }

  private getVisibleChunkBounds(view: Phaser.Geom.Rectangle): {
    minChunkX: number;
    maxChunkX: number;
    minChunkY: number;
    maxChunkY: number;
  } {
    return {
      minChunkX: Math.floor(view.x / this.chunkWorldSize) - CHUNK_VIEW_PADDING,
      maxChunkX: Math.floor(view.right / this.chunkWorldSize) + CHUNK_VIEW_PADDING,
      minChunkY: Math.floor(view.y / this.chunkWorldSize) - CHUNK_VIEW_PADDING,
      maxChunkY: Math.floor(view.bottom / this.chunkWorldSize) + CHUNK_VIEW_PADDING
    };
  }

  private getTileColor(tileX: number, tileY: number): number {
    const noise = this.hash(tileX, tileY);

    if (noise < 0.14) {
      return 0x2a1110;
    }

    if (noise < 0.3) {
      return 0x3a1714;
    }

    if (noise < 0.78) {
      return 0x4a1e17;
    }

    return 0x5d261b;
  }

  private hash(x: number, y: number): number {
    const value = Math.sin(x * 127.1 + y * 311.7) * 43758.5453123;
    return value - Math.floor(value);
  }

  private toChunkKey(chunkX: number, chunkY: number): ChunkKey {
    return `${chunkX},${chunkY}`;
  }
}
