/**
 * 精灵图生成常量定义
 *
 * SpritePrompts 提示词模板:
 *   ├─> CHARACTER_STYLE_PROMPT    角色风格提示词
 *   ├─> SPRITE_ANIMATION_PROMPTS  动画类型提示词
 *   └─> SPRITE_DIRECTION_PROMPTS  方向提示词
 */

// 角色风格基础提示词
export const CHARACTER_STYLE_PROMPT = `
Generate a single character only, centered in the frame on a plain white background.
The character should be rendered in detailed 32-bit pixel art style.
Requirements:
- Clearly visible and well-lit
- Facing forward or slightly to the side
- Full body visible from head to toe
- No weapons or accessories extending beyond the frame
- Pixel art, game asset quality
- Simple design, easy to animate
`.trim();

// 动画类型提示词
export const SPRITE_ANIMATION_PROMPTS: Record<string, string> = {
  idle: `
Create a 4-frame pixel art idle/breathing animation sprite sheet for this character.
Requirements:
- Arrange frames horizontally in a single row (left to right: 1, 2, 3, 4)
- Each frame should be the same size
- Subtle breathing animation
- Keep the character centered and head at same height
- Pure white background (#FFFFFF)
- No grid lines or frame borders
- Consistent style across all frames
`.trim(),

  walk: `
Create a 4-frame pixel art walk cycle sprite sheet for this character.
Requirements:
- Arrange frames horizontally in a single row (left to right: 1, 2, 3, 4)
- Each frame should be the same size
- Character walks in place (stays centered)
- Smooth walking motion
- Keep the character's head at the same height
- Pure white background (#FFFFFF)
- No grid lines or frame borders
- Consistent style across all frames
`.trim(),

  run: `
Create a 4-frame pixel art run cycle sprite sheet for this character.
Requirements:
- Arrange frames horizontally in a single row
- Dynamic running pose
- Keep character centered
- Pure white background
- No grid lines or borders
`.trim(),

  jump: `
Create a 4-frame pixel art jump animation sprite sheet.
Frames: crouch -> jump up -> peak -> falling
- Keep the character centered horizontally
- Show vertical movement progression
- Pure white background
- No grid lines or borders
`.trim(),

  attack: `
Create a 4-frame pixel art attack animation sprite sheet.
Frames: preparation -> strike -> impact -> recovery
- Keep the character centered
- Show clear attack motion
- Pure white background
- No grid lines or borders
`.trim(),

  hurt: `
Create a 2-frame pixel art hurt/damage animation sprite sheet.
- Character recoiling from hit
- Keep the character centered
- Pure white background
- No grid lines or borders
`.trim(),

  death: `
Create a 4-frame pixel art death animation sprite sheet.
- Character falling down progressively
- Keep frames aligned
- Pure white background
- No grid lines or borders
`.trim(),
};

// 方向提示词
export const SPRITE_DIRECTION_PROMPTS: Record<string, string> = {
  front: 'facing directly forward (front view)',
  back: 'facing directly away (back view)',
  left: 'facing left (side view)',
  right: 'facing right (side view)',
};

// 预设风格
export const SPRITE_STYLE_PRESETS = [
  {
    id: 'pixel-16',
    name: 'Pixel 16x16',
    nameZh: '像素 16x16',
    promptSuffix: '16-bit pixel art style, 16x16 sprite, retro game aesthetic, limited color palette',
    frameSize: 16,
  },
  {
    id: 'pixel-32',
    name: 'Pixel 32x32',
    nameZh: '像素 32x32',
    promptSuffix: '32-bit pixel art style, 32x32 sprite, classic RPG style',
    frameSize: 32,
  },
  {
    id: 'pixel-64',
    name: 'Pixel 64x64',
    nameZh: '像素 64x64',
    promptSuffix: 'detailed pixel art, 64x64 sprite, high quality indie game style',
    frameSize: 64,
  },
  {
    id: 'cartoon',
    name: 'Cartoon',
    nameZh: '卡通',
    promptSuffix: 'cartoon style, clean lines, vibrant colors, animated series look',
    frameSize: 64,
  },
  {
    id: 'anime',
    name: 'Anime',
    nameZh: '动漫',
    promptSuffix: 'anime style, cel shaded, Japanese RPG character art',
    frameSize: 64,
  },
] as const;

// 默认帧数
export const DEFAULT_FRAME_COUNT = 4;

// 默认帧间隔（毫秒）
export const DEFAULT_FRAME_INTERVAL = 150;

// 动画类型列表
export const ANIMATION_TYPES = [
  { id: 'idle', name: 'Idle', nameZh: '待机', frameCount: 4 },
  { id: 'walk', name: 'Walk', nameZh: '行走', frameCount: 4 },
  { id: 'run', name: 'Run', nameZh: '奔跑', frameCount: 4 },
  { id: 'jump', name: 'Jump', nameZh: '跳跃', frameCount: 4 },
  { id: 'attack', name: 'Attack', nameZh: '攻击', frameCount: 4 },
  { id: 'hurt', name: 'Hurt', nameZh: '受伤', frameCount: 2 },
  { id: 'death', name: 'Death', nameZh: '死亡', frameCount: 4 },
] as const;

// 方向列表
export const DIRECTIONS = [
  { id: 'front', name: 'Front', nameZh: '正面' },
  { id: 'back', name: 'Back', nameZh: '背面' },
  { id: 'left', name: 'Left', nameZh: '左侧' },
  { id: 'right', name: 'Right', nameZh: '右侧' },
] as const;

export type SpriteAnimationType = typeof ANIMATION_TYPES[number]['id'];
export type SpriteDirection = typeof DIRECTIONS[number]['id'];
export type SpriteStylePreset = typeof SPRITE_STYLE_PRESETS[number];
