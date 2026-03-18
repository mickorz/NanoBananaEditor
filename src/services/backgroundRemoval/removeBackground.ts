/**
 * 背景移除核心逻辑
 *
 * removeBackground 处理流程:
 *   ├─> toProcessableInput()   转换输入为可处理格式
 *   ├─> removeBackground()     执行 AI 背景移除
 *   └─> 返回处理结果
 *
 * 移植自: D:\NodejsP\remove-bg\src\lib\backgroundRemoval.ts
 * 使用库: @imgly/background-removal
 */

import { removeBackground as imglyRemoveBackground } from '@imgly/background-removal';
import type {
  BackgroundRemovalOptions,
  BackgroundRemovalResult,
  BackgroundRemovalProgress,
} from './types';

/**
 * 将文件转换为 Data URL
 */
export const fileToDataUrl = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        resolve(reader.result);
      } else {
        reject(new Error('无法将文件转换为 Data URL'));
      }
    };
    reader.onerror = () => reject(reader.error || new Error('文件读取失败'));
    reader.readAsDataURL(file);
  });
};

/**
 * 将 URL/Blob/File 转换为可处理的对象
 */
export const toProcessableInput = async (
  source: string | File | Blob
): Promise<File | Blob> => {
  if (source instanceof File || source instanceof Blob) {
    return source;
  }

  // 如果是 Data URL，直接 fetch
  if (source.startsWith('data:')) {
    const response = await fetch(source);
    const blob = await response.blob();
    return blob;
  }

  // 如果是普通 URL，fetch 获取图片
  const response = await fetch(source);
  const blob = await response.blob();
  return blob;
};

/**
 * 处理图片背景移除
 *
 * @param source - 图片源（URL、File 或 Blob）
 * @param options - 处理选项
 * @returns 处理结果
 */
export const processImageBackground = async (
  source: string | File | Blob,
  options?: BackgroundRemovalOptions
): Promise<BackgroundRemovalResult> => {
  // 保存原始 URL
  let originalUrl: string;
  if (typeof source === 'string') {
    if (source.startsWith('data:')) {
      originalUrl = source;
    } else {
      // 普通 URL 需要转换为 Data URL
      const blob = await toProcessableInput(source);
      originalUrl = await blobToDataUrl(blob);
    }
  } else if (source instanceof File) {
    originalUrl = await fileToDataUrl(source);
  } else {
    originalUrl = URL.createObjectURL(source);
  }

  // 转换为可处理的输入
  const input = await toProcessableInput(source);

  // 构建进度回调
  const progressCallback = options?.progress
    ? (key: string, current: number, total: number) => {
        options.progress!(key, current, total);
      }
    : undefined;

  // 执行背景移除
  const processedBlob = await imglyRemoveBackground(input, {
    debug: options?.debug ?? false,
    progress: progressCallback,
  });

  // 创建处理后的 URL
  const processedUrl = URL.createObjectURL(processedBlob);

  return {
    originalUrl,
    processedUrl,
    blob: processedBlob,
  };
};

/**
 * 将 Blob 转换为 Data URL
 */
export const blobToDataUrl = (blob: Blob): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        resolve(reader.result);
      } else {
        reject(new Error('无法将 Blob 转换为 Data URL'));
      }
    };
    reader.onerror = () => reject(reader.error || new Error('Blob 读取失败'));
    reader.readAsDataURL(blob);
  });
};

/**
 * 下载处理后的图片
 */
export const downloadProcessedImage = (
  url: string,
  fileName: string = 'bg-removed.png'
): void => {
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

/**
 * 清理 URL 对象（防止内存泄漏）
 */
export const revokeObjectUrl = (url: string): void => {
  if (url.startsWith('blob:')) {
    URL.revokeObjectURL(url);
  }
};

/**
 * 计算进度百分比
 */
export const calculateProgress = (current: number, total: number): number => {
  return Math.round((current / total) * 100);
};

/**
 * 创建进度更新器
 */
export const createProgressUpdater = (
  onUpdate: (progress: BackgroundRemovalProgress) => void
) => {
  return (key: string, current: number, total: number) => {
    onUpdate({
      key,
      current,
      total,
      percentage: calculateProgress(current, total),
    });
  };
};
