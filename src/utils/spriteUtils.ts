/**
 * 精灵图处理工具函数
 *
 * spriteUtils 功能:
 *   ├─> extractFrames          从精灵图表提取帧
 *   ├─> composeSpriteSheet     合成精灵图表
 *   ├─> resizeFrame            调整帧大小
 *   ├─> flipFrameHorizontal    水平翻转帧
 *   └─> createAnimationPreview  创建动画预览 GIF
 */

import type { SpriteAnimationType, SpriteDirection } from '../constants/spritePrompts';

/**
 * 帧信息接口
 */
export interface FrameInfo {
  imageData: ImageData;
  x: number;
  y: number;
  width: number;
  height: number;
}

/**
 * 精灵图表信息
 */
export interface SpriteSheetInfo {
  image: HTMLCanvasElement;
  frameWidth: number;
  frameHeight: number;
  frameCount: number;
  columns: number;
  rows: number;
}

/**
 * 动画配置
 */
export interface AnimationConfig {
  frames: HTMLCanvasElement[];
  frameInterval: number; // 毫秒
  loop: boolean;
}

/**
 * 从图像中提取帧
 * @param image 源图像
 * @param frameWidth 帧宽度
 * @param frameHeight 帧高度
 * @param frameCount 帧数量
 * @param columns 列数（默认自动计算）
 */
export async function extractFrames(
  image: HTMLImageElement | HTMLCanvasElement | string,
  frameWidth: number,
  frameHeight: number,
  frameCount: number,
  columns?: number
): Promise<HTMLCanvasElement[]> {
  console.log('[extractFrames] Starting with params:', {
    frameWidth,
    frameHeight,
    frameCount,
    columns,
    imageType: typeof image,
  });

  // 如果是字符串 URL，先加载图像
  let sourceImage: HTMLImageElement;
  if (typeof image === 'string') {
    console.log('[extractFrames] Loading image from URL...');
    sourceImage = await loadImage(image);
    console.log('[extractFrames] Image loaded:', {
      width: sourceImage.width,
      height: sourceImage.height,
    });
  } else if (image instanceof HTMLCanvasElement) {
    // Canvas 转 Image
    console.log('[extractFrames] Converting canvas to image...');
    sourceImage = await loadImage(image.toDataURL());
    console.log('[extractFrames] Canvas converted:', {
      width: sourceImage.width,
      height: sourceImage.height,
    });
  } else {
    sourceImage = image;
    console.log('[extractFrames] Using provided image:', {
      width: sourceImage.width,
      height: sourceImage.height,
    });
  }

  // 验证图片尺寸
  if (sourceImage.width === 0 || sourceImage.height === 0) {
    console.error('[extractFrames] Invalid image size:', {
      width: sourceImage.width,
      height: sourceImage.height,
    });
    throw new Error('Invalid image size');
  }

  const cols = columns || Math.ceil(sourceImage.width / frameWidth);
  const frames: HTMLCanvasElement[] = [];

  console.log('[extractFrames] Extracting frames:', {
    sourceSize: `${sourceImage.width}x${sourceImage.height}`,
    cols,
    frameSize: `${frameWidth}x${frameHeight}`,
  });

  for (let i = 0; i < frameCount; i++) {
    const col = i % cols;
    const row = Math.floor(i / cols);

    const canvas = document.createElement('canvas');
    canvas.width = frameWidth;
    canvas.height = frameHeight;

    const ctx = canvas.getContext('2d');
    if (!ctx) continue;

    ctx.drawImage(
      sourceImage,
      col * frameWidth,
      row * frameHeight,
      frameWidth,
      frameHeight,
      0,
      0,
      frameWidth,
      frameHeight
    );

    frames.push(canvas);
  }

  return frames;
}

/**
 * 将多个帧合成为精灵图表
 * @param frames 帧数组
 * @param columns 列数
 * @param padding 帧间距
 */
export function composeSpriteSheet(
  frames: HTMLCanvasElement[],
  columns: number = 4,
  padding: number = 0
): HTMLCanvasElement {
  if (frames.length === 0) {
    throw new Error('No frames to compose');
  }

  const frameWidth = frames[0].width;
  const frameHeight = frames[0].height;
  const rows = Math.ceil(frames.length / columns);

  const totalWidth = columns * frameWidth + (columns - 1) * padding;
  const totalHeight = rows * frameHeight + (rows - 1) * padding;

  const canvas = document.createElement('canvas');
  canvas.width = totalWidth;
  canvas.height = totalHeight;

  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('Failed to get canvas context');
  }

  // 填充白色背景
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, totalWidth, totalHeight);

  frames.forEach((frame, index) => {
    const col = index % columns;
    const row = Math.floor(index / columns);
    const x = col * (frameWidth + padding);
    const y = row * (frameHeight + padding);

    ctx.drawImage(frame, x, y);
  });

  return canvas;
}

/**
 * 调整帧大小
 * @param frame 源帧
 * @param newWidth 新宽度
 * @param newHeight 新高度
 */
export function resizeFrame(
  frame: HTMLCanvasElement,
  newWidth: number,
  newHeight: number
): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = newWidth;
  canvas.height = newHeight;

  const ctx = canvas.getContext('2d');
  if (!ctx) return frame;

  // 使用像素艺术友好的缩放（最近邻插值）
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(frame, 0, 0, newWidth, newHeight);

  return canvas;
}

/**
 * 水平翻转帧
 * @param frame 源帧
 */
export function flipFrameHorizontal(frame: HTMLCanvasElement): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = frame.width;
  canvas.height = frame.height;

  const ctx = canvas.getContext('2d');
  if (!ctx) return frame;

  ctx.translate(canvas.width, 0);
  ctx.scale(-1, 1);
  ctx.drawImage(frame, 0, 0);

  return canvas;
}

/**
 * 加载图像
 * @param src 图像 URL
 */
export function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

/**
 * Canvas 转 Base64
 * @param canvas 画布
 * @param format 图像格式
 * @param quality 质量（0-1）
 */
export function canvasToBase64(
  canvas: HTMLCanvasElement,
  format: string = 'image/png',
  quality: number = 1
): string {
  return canvas.toDataURL(format, quality);
}

/**
 * Canvas 转 Blob
 * @param canvas 画布
 * @param format 图像格式
 * @param quality 质量（0-1）
 */
export function canvasToBlob(
  canvas: HTMLCanvasElement,
  format: string = 'image/png',
  quality: number = 1
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) {
          resolve(blob);
        } else {
          reject(new Error('Failed to convert canvas to blob'));
        }
      },
      format,
      quality
    );
  });
}

/**
 * Base64 转 Canvas
 * @param base64 Base64 字符串
 */
export async function base64ToCanvas(base64: string): Promise<HTMLCanvasElement> {
  const img = await loadImage(base64);
  const canvas = document.createElement('canvas');
  canvas.width = img.width;
  canvas.height = img.height;

  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Failed to get canvas context');

  ctx.drawImage(img, 0, 0);
  return canvas;
}

/**
 * 检测精灵图中的透明边距
 * @param canvas 画布
 * @returns { top, right, bottom, left } 边距
 */
export function detectTransparentMargins(
  canvas: HTMLCanvasElement
): { top: number; right: number; bottom: number; left: number } {
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    return { top: 0, right: 0, bottom: 0, left: 0 };
  }

  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const data = imageData.data;
  const width = canvas.width;
  const height = canvas.height;

  // 检测顶部边距
  let top = 0;
  topLoop: for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const alpha = data[(y * width + x) * 4 + 3];
      if (alpha > 10) {
        top = y;
        break topLoop;
      }
    }
  }

  // 检测底部边距
  let bottom = 0;
  bottomLoop: for (let y = height - 1; y >= 0; y--) {
    for (let x = 0; x < width; x++) {
      const alpha = data[(y * width + x) * 4 + 3];
      if (alpha > 10) {
        bottom = height - 1 - y;
        break bottomLoop;
      }
    }
  }

  // 检测左边距
  let left = 0;
  leftLoop: for (let x = 0; x < width; x++) {
    for (let y = 0; y < height; y++) {
      const alpha = data[(y * width + x) * 4 + 3];
      if (alpha > 10) {
        left = x;
        break leftLoop;
      }
    }
  }

  // 检测右边距
  let right = 0;
  rightLoop: for (let x = width - 1; x >= 0; x--) {
    for (let y = 0; y < height; y++) {
      const alpha = data[(y * width + x) * 4 + 3];
      if (alpha > 10) {
        right = width - 1 - x;
        break rightLoop;
      }
    }
  }

  return { top, right, bottom, left };
}

/**
 * 裁剪帧到内容边界
 * @param frame 源帧
 * @param padding 额外边距
 */
export function cropToContent(
  frame: HTMLCanvasElement,
  padding: number = 0
): HTMLCanvasElement {
  const margins = detectTransparentMargins(frame);

  const x = margins.left - padding;
  const y = margins.top - padding;
  const width = frame.width - margins.left - margins.right + padding * 2;
  const height = frame.height - margins.top - margins.bottom + padding * 2;

  // 确保尺寸有效
  const validX = Math.max(0, x);
  const validY = Math.max(0, y);
  const validWidth = Math.min(frame.width - validX, Math.max(1, width));
  const validHeight = Math.min(frame.height - validY, Math.max(1, height));

  const canvas = document.createElement('canvas');
  canvas.width = validWidth;
  canvas.height = validHeight;

  const ctx = canvas.getContext('2d');
  if (!ctx) return frame;

  ctx.drawImage(frame, validX, validY, validWidth, validHeight, 0, 0, validWidth, validHeight);

  return canvas;
}

/**
 * 对齐帧（使所有帧的字符在相同位置）
 * @param frames 帧数组
 * @param align 对齐方式
 */
export function alignFrames(
  frames: HTMLCanvasElement[],
  align: 'center' | 'bottom' | 'top' = 'bottom'
): HTMLCanvasElement[] {
  if (frames.length === 0) return frames;

  // 找到最大尺寸
  let maxWidth = 0;
  let maxHeight = 0;

  frames.forEach((frame) => {
    const cropped = cropToContent(frame);
    maxWidth = Math.max(maxWidth, cropped.width);
    maxHeight = Math.max(maxHeight, cropped.height);
  });

  // 对齐所有帧
  return frames.map((frame) => {
    const margins = detectTransparentMargins(frame);
    const contentWidth = frame.width - margins.left - margins.right;
    const contentHeight = frame.height - margins.top - margins.bottom;

    const canvas = document.createElement('canvas');
    canvas.width = maxWidth;
    canvas.height = maxHeight;

    const ctx = canvas.getContext('2d');
    if (!ctx) return frame;

    // 计算偏移
    let destX = 0;
    let destY = 0;

    if (align === 'center') {
      destX = Math.floor((maxWidth - contentWidth) / 2);
      destY = Math.floor((maxHeight - contentHeight) / 2);
    } else if (align === 'bottom') {
      destX = Math.floor((maxWidth - contentWidth) / 2);
      destY = maxHeight - contentHeight;
    } else {
      destX = Math.floor((maxWidth - contentWidth) / 2);
      destY = 0;
    }

    ctx.drawImage(
      frame,
      margins.left,
      margins.top,
      contentWidth,
      contentHeight,
      destX,
      destY,
      contentWidth,
      contentHeight
    );

    return canvas;
  });
}

/**
 * 构建精灵图生成提示词
 * @param characterDescription 角色描述
 * @param animationType 动画类型
 * @param direction 方向
 * @param stylePreset 风格预设后缀
 */
export function buildSpritePrompt(
  characterDescription: string,
  animationType: SpriteAnimationType,
  direction: SpriteDirection,
  stylePreset?: string
): string {
  const parts: string[] = [characterDescription];

  // 添加动画类型提示词（从常量导入）
  // 这里返回基础结构，实际提示词由组件组合

  if (stylePreset) {
    parts.push(stylePreset);
  }

  return parts.join('. ');
}

/**
 * 下载精灵图表
 * @param canvas 画布
 * @param filename 文件名
 */
export function downloadSpriteSheet(canvas: HTMLCanvasElement, filename: string): void {
  const link = document.createElement('a');
  link.download = filename;
  link.href = canvas.toDataURL('image/png');
  link.click();
}

/**
 * 生成精灵图表元数据（JSON）
 * @param info 精灵图表信息
 * @param animationType 动画类型
 * @param direction 方向
 */
export function generateSpriteMetadata(
  info: SpriteSheetInfo,
  animationType: SpriteAnimationType,
  direction: SpriteDirection
): object {
  return {
    frames: info.frameCount,
    frameSize: {
      width: info.frameWidth,
      height: info.frameHeight,
    },
    layout: {
      columns: info.columns,
      rows: info.rows,
    },
    animation: {
      type: animationType,
      direction: direction,
    },
  };
}
