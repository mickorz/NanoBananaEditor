/**
 * 精灵图生成 Hook
 *
 * useSpriteGeneration 状态流:
 *   idle -> generating -> composing -> completed
 *                         └-> error
 *
 * 功能:
 *   ├─> generate()        生成精灵图
 *   ├─> downloadSheet()   下载精灵图表
 *   ├─> downloadFrame()   下载单帧
 *   └─> reset()           重置状态
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import {
  generateSpriteSheet,
  downloadSpriteSheet,
  downloadFrame as downloadFrameUtil,
} from '../services/spriteGeneration';
import type {
  SpriteGenerationOptions,
  SpriteGenerationResult,
  SpriteGenerationState,
  SpriteGenerationProgress,
} from '../services/spriteGeneration';

interface UseSpriteGenerationOptions {
  onSuccess?: (result: SpriteGenerationResult) => void;
  onError?: (error: Error) => void;
  showToast?: boolean;
}

interface UseSpriteGenerationReturn {
  // 状态
  state: SpriteGenerationState;
  progress: SpriteGenerationProgress | null;
  result: SpriteGenerationResult | null;
  error: Error | null;

  // 计算属性
  isIdle: boolean;
  isGenerating: boolean;
  isComposing: boolean;
  isCompleted: boolean;
  hasError: boolean;

  // 操作
  generate: (options: SpriteGenerationOptions) => Promise<void>;
  downloadSheet: (fileName?: string) => void;
  downloadFrame: (frameIndex: number) => void;
  reset: () => void;
}

export const useSpriteGeneration = (
  options: UseSpriteGenerationOptions = {}
): UseSpriteGenerationReturn => {
  const { t } = useTranslation();
  const { onSuccess, onError, showToast = true } = options;

  const [state, setState] = useState<SpriteGenerationState>('idle');
  const [progress, setProgress] = useState<SpriteGenerationProgress | null>(null);
  const [result, setResult] = useState<SpriteGenerationResult | null>(null);
  const [error, setError] = useState<Error | null>(null);

  // 跟踪已创建的 URL，用于清理
  const createdUrlsRef = useRef<Set<string>>(new Set());

  // 清理已创建的 URL 对象
  const revokeUrls = useCallback(() => {
    createdUrlsRef.current.forEach((url) => {
      if (url.startsWith('blob:')) {
        URL.revokeObjectURL(url);
      }
    });
    createdUrlsRef.current.clear();
  }, []);

  // 组件卸载时清理
  useEffect(() => {
    return () => {
      revokeUrls();
    };
  }, [revokeUrls]);

  // 生成精灵图
  const generate = useCallback(
    async (genOptions: SpriteGenerationOptions) => {
      // 清理之前的结果
      revokeUrls();
      setState('generating');
      setProgress(null);
      setError(null);
      setResult(null);

      try {
        const spriteResult = await generateSpriteSheet(
          genOptions,
          (p) => {
            setProgress(p);
            if (p.phase === 'composing') {
              setState('composing');
            }
          }
        );

        // 记录创建的 URL
        if (spriteResult.spriteSheet?.url.startsWith('blob:')) {
          createdUrlsRef.current.add(spriteResult.spriteSheet.url);
        }
        spriteResult.frames.forEach((frame) => {
          if (frame.url?.startsWith('blob:')) {
            createdUrlsRef.current.add(frame.url);
          }
        });

        setResult(spriteResult);
        setState('completed');

        if (showToast) {
          toast.success(
            t('spriteGeneration.success', 'Sprite generation completed!')
          );
        }

        onSuccess?.(spriteResult);
      } catch (err) {
        const error =
          err instanceof Error ? err : new Error('Sprite generation failed');
        setError(error);
        setState('error');

        if (showToast) {
          toast.error(
            t('spriteGeneration.error', 'Sprite generation failed, please retry')
          );
        }

        onError?.(error);
      }
    },
    [revokeUrls, showToast, t, onSuccess, onError]
  );

  // 下载精灵图表
  const downloadSheet = useCallback(
    (fileName?: string) => {
      if (result?.spriteSheet?.url) {
        downloadSpriteSheet(result.spriteSheet.url, fileName);
      }
    },
    [result]
  );

  // 下载单帧
  const downloadFrame = useCallback(
    (frameIndex: number) => {
      if (result?.frames[frameIndex]?.url) {
        downloadFrameUtil(result.frames[frameIndex].url, frameIndex);
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
  const isGenerating = state === 'generating';
  const isComposing = state === 'composing';
  const isCompleted = state === 'completed';
  const hasError = state === 'error';

  return {
    // 状态
    state,
    progress,
    result,
    error,

    // 计算属性
    isIdle,
    isGenerating,
    isComposing,
    isCompleted,
    hasError,

    // 操作
    generate,
    downloadSheet,
    downloadFrame,
    reset,
  };
};
