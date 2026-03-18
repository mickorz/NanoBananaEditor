/**
 * 精灵图生成服务类型定义
 *
 * SpriteGeneration 类型:
 *   ├─> SpriteGenerationOptions   生成选项
 *   ├─> SpriteGenerationResult    生成结果
 *   ├─> SpriteDirection           方向定义
 *   └─> SpriteGenerationState     生成状态
 */

import type { AIProvider } from '../../types';

// 精灵方向
export type SpriteDirection =
  | 'front'
  | 'back'
  | 'left'
  | 'right'
  | 'up'
  | 'down';

// 精灵动作类型
export type SpriteAction =
  | 'idle'
  | 'walk'
  | 'run'
  | 'attack'
  | 'hurt'
  | 'death';

// 生成选项
export interface SpriteGenerationOptions {
  // 基础设置
  prompt: string;
  provider?: AIProvider;

  // 精灵设置
  style?: string;
  direction?: SpriteDirection;
  action?: SpriteAction;
  frameCount?: number;

  // 尺寸设置
  width?: number;
  height?: number;

  // 高级设置
  negativePrompt?: string;
  seed?: number;
}

// 单帧结果
export interface SpriteFrame {
  index: number;
  url: string;
  blob?: Blob;
}

// 生成结果
export interface SpriteGenerationResult {
  frames: SpriteFrame[];
  prompt: string;
  direction: SpriteDirection;
  action: SpriteAction;
  width: number;
  height: number;
  // 精灵图合成结果
  spriteSheet?: {
    url: string;
    blob: Blob;
    columns: number;
    rows: number;
  };
}

// 生成状态
export type SpriteGenerationState =
  | 'idle'
  | 'generating'
  | 'composing'
  | 'completed'
  | 'error';

// 生成进度
export interface SpriteGenerationProgress {
  phase: 'generating' | 'composing';
  current: number;
  total: number;
  message: string;
}

// 预设风格
export interface SpriteStylePreset {
  id: string;
  name: string;
  nameZh: string;
  promptSuffix: string;
  examples?: string[];
}

// 精灵方向配置
export const SPRITE_DIRECTIONS: Record<SpriteDirection, { name: string; nameZh: string }> = {
  front: { name: 'Front', nameZh: '正面' },
  back: { name: 'Back', nameZh: '背面' },
  left: { name: 'Left', nameZh: '左侧' },
  right: { name: 'Right', nameZh: '右侧' },
  up: { name: 'Up', nameZh: '向上' },
  down: { name: 'Down', nameZh: '向下' },
};

// 精灵动作配置
export const SPRITE_ACTIONS: Record<SpriteAction, { name: string; nameZh: string }> = {
  idle: { name: 'Idle', nameZh: '站立' },
  walk: { name: 'Walk', nameZh: '行走' },
  run: { name: 'Run', nameZh: '奔跑' },
  attack: { name: 'Attack', nameZh: '攻击' },
  hurt: { name: 'Hurt', nameZh: '受伤' },
  death: { name: 'Death', nameZh: '死亡' },
};

// 预设风格列表
export const SPRITE_STYLE_PRESETS: SpriteStylePreset[] = [
  {
    id: 'pixel-16',
    name: 'Pixel 16x16',
    nameZh: '像素 16x16',
    promptSuffix: '16-bit pixel art style, 16x16 sprite, retro game aesthetic',
  },
  {
    id: 'pixel-32',
    name: 'Pixel 32x32',
    nameZh: '像素 32x32',
    promptSuffix: '32-bit pixel art style, 32x32 sprite, classic RPG style',
  },
  {
    id: 'pixel-64',
    name: 'Pixel 64x64',
    nameZh: '像素 64x64',
    promptSuffix: 'detailed pixel art, 64x64 sprite, high quality indie game style',
  },
  {
    id: 'cartoon',
    name: 'Cartoon',
    nameZh: '卡通',
    promptSuffix: 'cartoon style, clean lines, vibrant colors, animated series look',
  },
  {
    id: 'anime',
    name: 'Anime',
    nameZh: '动漫',
    promptSuffix: 'anime style, cel shaded, Japanese RPG character art',
  },
  {
    id: 'realistic',
    name: 'Realistic',
    nameZh: '写实',
    promptSuffix: 'semi-realistic style, detailed shading, modern game art',
  },
];
