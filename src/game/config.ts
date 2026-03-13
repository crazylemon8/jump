const IS_MOBILE_VIEW =
  typeof window !== "undefined" &&
  (window.matchMedia("(pointer: coarse)").matches || window.matchMedia("(max-width: 560px)").matches);

export const GAME_WIDTH = 960;
export const GAME_HEIGHT = IS_MOBILE_VIEW ? 720 : 540;
export const GRID_SIZE = 48;
export const CHUNK_TILE_SIZE = 16;
export const CHUNK_VIEW_PADDING = 1;
export const SHOW_GRID = false;

export const PLAYER_SPEED = IS_MOBILE_VIEW ? 320 : 260;
export const BULLET_SPEED = 520;
export const BULLET_CULL_MARGIN = 64;
