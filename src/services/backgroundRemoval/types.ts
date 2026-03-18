/**
 * 背景移除服务类型定义
 *
 * BackgroundRemoval 类型:
 *   ├─> BackgroundRemovalOptions   处理选项
 *   ├─> BackgroundRemovalResult    处理结果
 *   └─> ProcessingState            处理状态
 */

export interface BackgroundRemovalOptions {
  debug?: boolean;
  progress?: (key: string, current: number, total: number) => void;
}

export interface BackgroundRemovalResult {
  originalUrl: string;
  processedUrl: string;
  blob: Blob;
}

export type ProcessingState = 'idle' | 'loading' | 'processing' | 'completed' | 'error';

export interface BackgroundRemovalProgress {
  key: string;
  current: number;
  total: number;
  percentage: number;
}
