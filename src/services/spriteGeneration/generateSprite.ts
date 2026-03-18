/**
 * 精灵图生成核心逻辑
 *
 * generateSprite 处理流程:
 *   ├─> buildSpritePrompt()     构建精灵提示词
 *   ├─> generateFrames()        生成多帧图片
 *   ├─> composeSpriteSheet()    合成精灵图
 *   └─> 返回生成结果
 *
 * 使用: 现有 AI 服务 (Gemini/AIStudioToAPI)
 */

import { getAIService } from '../ai/factory';
import type { AIProvider } from '../../types';
import type {
  SpriteGenerationOptions,
  SpriteGenerationResult,
  SpriteFrame,
  SpriteDirection,
  SpriteAction,
  SpriteGenerationProgress,
} from './types';
import { SPRITE_STYLE_PRESETS } from './types';

/**
 * 构建精灵图生成提示词
 */
export const buildSpritePrompt = (
  basePrompt: string,
  options: {
    style?: string;
    direction?: SpriteDirection;
    action?: SpriteAction;
    frameCount?: number;
    width?: number;
    height?: number;
  }
): string => {
  const {
    style = 'pixel-32',
    direction = 'front',
    action = 'idle',
    frameCount = 4,
    width = 32,
    height = 32,
  } = options;

  // 获取风格预设
  const stylePreset = SPRITE_STYLE_PRESETS.find((s) => s.id === style);
  const stylePrompt = stylePreset?.promptSuffix || '';

  // 构建完整提示词
  const parts: string[] = [
    basePrompt,
    stylePrompt,
    `character facing ${direction}`,
    `${action} animation pose`,
    `sprite sheet with ${frameCount} frames`,
    `${width}x${height} pixels per frame`,
    'transparent background',
    'consistent style across all frames',
    'game ready sprite',
  ];

  return parts.join(', ');
};

/**
 * 生成单帧精灵图
 */
export const generateSingleFrame = async (
  prompt: string,
  frameIndex: number,
  options: SpriteGenerationOptions
): Promise<SpriteFrame> => {
  const service = getAIService((options.provider as AIProvider) || 'gemini');

  // 添加帧变化
  const framePrompt = `${prompt}, frame ${frameIndex + 1}`;

  const result = await service.generateImage({
    prompt: framePrompt,
    negativePrompt: options.negativePrompt,
    width: options.width || 32,
    height: options.height || 32,
  });

  return {
    index: frameIndex,
    url: result.images[0]?.url || '',
    blob: result.images[0]?.blob,
  };
};

/**
 * 并行生成多帧精灵图
 */
export const generateFrames = async (
  prompt: string,
  options: SpriteGenerationOptions,
  onProgress?: (progress: SpriteGenerationProgress) => void
): Promise<SpriteFrame[]> => {
  const frameCount = options.frameCount || 4;
  const frames: SpriteFrame[] = [];

  // 并行生成所有帧
  const promises = Array.from({ length: frameCount }, (_, i) =>
    generateSingleFrame(prompt, i, options).then((frame) => {
      frames.push(frame);
      onProgress?.({
        phase: 'generating',
        current: frames.length,
        total: frameCount,
        message: `Generating frame ${frames.length}/${frameCount}`,
      });
      return frame;
    })
  );

  await Promise.all(promises);

  // 按索引排序
  return frames.sort((a, b) => a.index - b.index);
};

/**
 * 合成精灵图
 */
export const composeSpriteSheet = async (
  frames: SpriteFrame[],
  options: {
    columns?: number;
    frameWidth?: number;
    frameHeight?: number;
  } = {}
): Promise<{ url: string; blob: Blob; columns: number; rows: number }> => {
  const { columns = 4, frameWidth = 32, frameHeight = 32 } = options;

  const rows = Math.ceil(frames.length / columns);

  // 创建画布
  const canvas = document.createElement('canvas');
  canvas.width = columns * frameWidth;
  canvas.height = rows * frameHeight;
  const ctx = canvas.getContext('2d');

  if (!ctx) {
    throw new Error('Failed to get canvas context');
  }

  // 加载所有图片并绘制到画布
  const loadImage = (url: string): Promise<HTMLImageElement> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = url;
    });
  };

  for (let i = 0; i < frames.length; i++) {
    const frame = frames[i];
    if (frame.url) {
      try {
        const img = await loadImage(frame.url);
        const col = i % columns;
        const row = Math.floor(i / columns);
        ctx.drawImage(img, col * frameWidth, row * frameHeight, frameWidth, frameHeight);
      } catch (error) {
        console.warn(`Failed to load frame ${i}:`, error);
      }
    }
  }

  // 转换为 Blob
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) {
          const url = URL.createObjectURL(blob);
          resolve({ url, blob, columns, rows });
        } else {
          reject(new Error('Failed to create sprite sheet blob'));
        }
      },
      'image/png'
    );
  });
};

/**
 * 完整的精灵图生成流程
 */
export const generateSpriteSheet = async (
  options: SpriteGenerationOptions,
  onProgress?: (progress: SpriteGenerationProgress) => void
): Promise<SpriteGenerationResult> => {
  const {
    prompt,
    direction = 'front',
    action = 'idle',
    width = 32,
    height = 32,
    frameCount = 4,
  } = options;

  // 构建提示词
  const fullPrompt = buildSpritePrompt(prompt, {
    style: options.style,
    direction,
    action,
    frameCount,
    width,
    height,
  });

  // 生成帧
  onProgress?.({
    phase: 'generating',
    current: 0,
    total: frameCount,
    message: 'Starting frame generation...',
  });

  const frames = await generateFrames(fullPrompt, options, onProgress);

  // 合成精灵图
  onProgress?.({
    phase: 'composing',
    current: 0,
    total: 1,
    message: 'Composing sprite sheet...',
  });

  const spriteSheet = await composeSpriteSheet(frames, {
    frameWidth: width,
    frameHeight: height,
    columns: Math.min(frameCount, 4),
  });

  onProgress?.({
    phase: 'composing',
    current: 1,
    total: 1,
    message: 'Sprite sheet completed!',
  });

  return {
    frames,
    prompt: fullPrompt,
    direction,
    action,
    width,
    height,
    spriteSheet,
  };
};

/**
 * 下载精灵图
 */
export const downloadSpriteSheet = (
  url: string,
  fileName: string = 'sprite-sheet.png'
): void => {
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

/**
 * 下载单帧
 */
export const downloadFrame = (url: string, index: number): void => {
  downloadSpriteSheet(url, `frame-${index + 1}.png`);
};
