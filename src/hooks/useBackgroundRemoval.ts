/**
 * 背景移除 Hook
 *
 * useBackgroundRemoval 状态流:
 *   idle -> loading -> processing -> completed
 *                      └-> error
 *
 * 功能:
 *   ├─> removeBackground()   执行背景移除
 *   ├─> downloadResult()     下载结果
 *   ├─> reset()              重置状态
 *   └─> revokeUrls()         清理 URL 对象
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import {
  processImageBackground,
  downloadProcessedImage,
  revokeObjectUrl,
  createProgressUpdater,
} from '../services/backgroundRemoval';
import type {
  ProcessingState,
  BackgroundRemovalResult,
  BackgroundRemovalProgress,
} from '../services/backgroundRemoval';

interface UseBackgroundRemovalOptions {
  onSuccess?: (result: BackgroundRemovalResult) => void;
  onError?: (error: Error) => void;
  showToast?: boolean;
}

interface UseBackgroundRemovalReturn {
  // 状态
  state: ProcessingState;
  progress: BackgroundRemovalProgress | null;
  result: BackgroundRemovalResult | null;
  error: Error | null;

  // 计算属性
  isIdle: boolean;
  isLoading: boolean;
  isProcessing: boolean;
  isCompleted: boolean;
  hasError: boolean;
  progressPercentage: number;

  // 操作
  removeBackground: (source: string | File | Blob) => Promise<void>;
  downloadResult: (fileName?: string) => void;
  reset: () => void;
}

export const useBackgroundRemoval = (
  options: UseBackgroundRemovalOptions = {}
): UseBackgroundRemovalReturn => {
  const { t } = useTranslation();
  const { onSuccess, onError, showToast = true } = options;

  const [state, setState] = useState<ProcessingState>('idle');
  const [progress, setProgress] = useState<BackgroundRemovalProgress | null>(null);
  const [result, setResult] = useState<BackgroundRemovalResult | null>(null);
  const [error, setError] = useState<Error | null>(null);

  // 跟踪已创建的 URL，用于清理
  const createdUrlsRef = useRef<Set<string>>(new Set());

  // 清理已创建的 URL 对象
  const revokeUrls = useCallback(() => {
    createdUrlsRef.current.forEach((url) => {
      revokeObjectUrl(url);
    });
    createdUrlsRef.current.clear();
  }, []);

  // 组件卸载时清理
  useEffect(() => {
    return () => {
      revokeUrls();
    };
  }, [revokeUrls]);

  // 移除背景
  const removeBackground = useCallback(
    async (source: string | File | Blob) => {
      // 清理之前的结果
      revokeUrls();
      setState('loading');
      setProgress(null);
      setError(null);
      setResult(null);

      try {
        const bgResult = await processImageBackground(source, {
          progress: createProgressUpdater((p) => {
            setProgress(p);
            if (p.key === 'compute:inference') {
              setState('processing');
            }
          }),
        });

        // 记录创建的 URL
        if (bgResult.processedUrl.startsWith('blob:')) {
          createdUrlsRef.current.add(bgResult.processedUrl);
        }

        setResult(bgResult);
        setState('completed');

        if (showToast) {
          toast.success(t('backgroundRemoval.success', '背景移除成功！'));
        }

        onSuccess?.(bgResult);
      } catch (err) {
        const error = err instanceof Error ? err : new Error('背景移除失败');
        setError(error);
        setState('error');

        if (showToast) {
          toast.error(t('backgroundRemoval.error', '背景移除失败，请重试'));
        }

        onError?.(error);
      }
    },
    [revokeUrls, showToast, t, onSuccess, onError]
  );

  // 下载结果
  const downloadResult = useCallback(
    (fileName?: string) => {
      if (result?.processedUrl) {
        downloadProcessedImage(result.processedUrl, fileName);
      }
    },
    [result]
  );

  // 重置状态
  const reset = useCallback(() => {
    revokeUrls();
    setState('idle');
    setProgress(null);
    setResult(null);
    setError(null);
  }, [revokeUrls]);

  // 计算属性
  const isIdle = state === 'idle';
  const isLoading = state === 'loading';
  const isProcessing = state === 'processing';
  const isCompleted = state === 'completed';
  const hasError = state === 'error';
  const progressPercentage = progress?.percentage ?? 0;

  return {
    // 状态
    state,
    progress,
    result,
    error,

    // 计算属性
    isIdle,
    isLoading,
    isProcessing,
    isCompleted,
    hasError,
    progressPercentage,

    // 操作
    removeBackground,
    downloadResult,
    reset,
  };
};
