/**
 * 背景移除服务模块
 *
 * backgroundRemoval 服务导出:
 *   ├─> 类型定义 (types.ts)
 *   ├─> 核心处理函数 (removeBackground.ts)
 *   └─> 工具函数
 */

// 类型
export type {
  BackgroundRemovalOptions,
  BackgroundRemovalResult,
  ProcessingState,
  BackgroundRemovalProgress,
} from './types';

// 核心处理函数
export {
  processImageBackground,
  fileToDataUrl,
  blobToDataUrl,
  toProcessableInput,
  downloadProcessedImage,
  revokeObjectUrl,
  calculateProgress,
  createProgressUpdater,
} from './removeBackground';
