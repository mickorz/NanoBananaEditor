/**
 * 精灵图生成服务模块导出
 *
 * spriteGeneration 服务:
 *   ├─> 类型定义 (types.ts)
 *   ├─> 核心生成函数 (generateSprite.ts)
 *   └─> 工具函数
 */

// 类型
export type {
  SpriteGenerationOptions,
  SpriteGenerationResult,
  SpriteFrame,
  SpriteDirection,
  SpriteAction,
  SpriteGenerationState,
  SpriteGenerationProgress,
  SpriteStylePreset,
} from './types';

// 常量
export {
  SPRITE_DIRECTIONS,
  SPRITE_ACTIONS,
  SPRITE_STYLE_PRESETS,
} from './types';

// 核心函数
export {
  buildSpritePrompt,
  generateSingleFrame,
  generateFrames,
  composeSpriteSheet,
  generateSpriteSheet,
  downloadSpriteSheet,
  downloadFrame,
} from './generateSprite';
