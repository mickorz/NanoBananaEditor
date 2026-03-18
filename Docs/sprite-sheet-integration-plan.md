# Sprite Sheet 模式移植实现计划（更新版）

## 目标

将 sprite-sheet-creator 项目的核心模式移植到 NanoBananaEditor：
1. 精灵图生成模式 - 使用现有 Gemini / AIStudioToAPI
2. **背景移除模式** - 移植 remove-bg 项目（使用 @imgly/background-removal）
3. 步骤式工作流
4. 动画预览功能

---

## 技术方案

| 功能 | 实现方案 |
|------|----------|
| 角色生成 | Gemini 2.5 Flash Image |
| 精灵图生成 | Gemini 编辑模式 |
| **背景移除** | **@imgly/background-removal（本地处理）** |
| 工作流 | 4 步骤引导式 |

---

## 架构设计

### 新增目录结构

```
src/
├── services/
│   └── backgroundRemoval/
│       ├── index.ts                # 导出入口
│       ├── removeBackground.ts     # 核心移除逻辑
│       └── types.ts                # 类型定义
├── hooks/
│   ├── useSpriteGeneration.ts      # 精灵图生成
│   └── useBackgroundRemoval.ts     # 背景移除
├── components/
│   ├── spritePreview/
│   │   ├── SpritePreview.tsx       # 精灵图预览
│   │   ├── AnimationPlayer.tsx     # 动画播放器
│   │   └── FrameExtractor.tsx      # 帧提取器
│   ├── backgroundRemoval/
│   │   ├── ImageUploader.tsx       # 图片上传（移植自 remove-bg）
│   │   ├── ImageCompareResult.tsx  # 图片对比（移植自 remove-bg）
│   │   └── ProcessingLoader.tsx    # 处理加载动画
│   └── workflow/
│       ├── WorkflowStepper.tsx     # 工作流步骤器
│       └── StepIndicator.tsx       # 步骤指示器
├── utils/
│   └── spriteUtils.ts              # 精灵图处理工具
└── constants/
    └── spritePrompts.ts            # 精灵图提示词模板
```

---

## Phase 1: 背景移除服务移植 (预计 1.5 小时)

### 1.1 安装依赖

```bash
npm install @imgly/background-removal react-compare-slider
```

### 1.2 创建背景移除服务

**文件**: `src/services/backgroundRemoval/types.ts`

```typescript
/**
 * 背景移除服务类型定义
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
```

**文件**: `src/services/backgroundRemoval/removeBackground.ts`

```typescript
/**
 * 背景移除核心逻辑
 *
 * removeBackground 处理流程:
 *   ├─> fileToDataUrl()       文件转 Data URL
 *   ├─> processImageBackground()  执行背景移除
 *   └─> 返回处理结果
 *
 * 移植自: D:\NodejsP\remove-bg\src\lib\backgroundRemoval.ts
 */

import { removeBackground } from '@imgly/background-removal';
import type { BackgroundRemovalOptions, BackgroundRemovalResult } from './types';

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
    reader.onerror = () => reject(reader.error);
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

  // 如果是 URL，fetch 获取图片
  if (typeof source === 'string') {
    const response = await fetch(source);
    const blob = await response.blob();
    return blob;
  }

  throw new Error('不支持的输入类型');
};

/**
 * 处理图片背景移除
 */
export const processImageBackground = async (
  source: string | File | Blob,
  options?: BackgroundRemovalOptions
): Promise<BackgroundRemovalResult> => {
  // 保存原始 URL
  let originalUrl: string;
  if (typeof source === 'string') {
    originalUrl = source;
  } else if (source instanceof File) {
    originalUrl = await fileToDataUrl(source);
  } else {
    originalUrl = URL.createObjectURL(source);
  }

  // 转换为可处理的输入
  const input = await toProcessableInput(source);

  // 配置选项
  const config = {
    debug: options?.debug ?? false,
    progress: options?.progress,
  };

  // 执行背景移除
  const processedBlob = await removeBackground(input, config);

  // 创建处理后的 URL
  const processedUrl = URL.createObjectURL(processedBlob);

  return {
    originalUrl,
    processedUrl,
    blob: processedBlob,
  };
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
```

**文件**: `src/services/backgroundRemoval/index.ts`

```typescript
/**
 * 背景移除服务导出
 */

export * from './types';
export * from './removeBackground';
```

---

## Phase 2: 背景移除 Hook (预计 1 小时)

### 2.1 创建背景移除 Hook

**文件**: `src/hooks/useBackgroundRemoval.ts`

```typescript
/**
 * 背景移除 Hook
 *
 * useBackgroundRemoval 状态流:
 *   idle -> loading -> processing -> completed
 *                      └-> error
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import {
  processImageBackground,
  downloadProcessedImage,
  revokeObjectUrl,
  type ProcessingState,
  type BackgroundRemovalResult,
  type BackgroundRemovalOptions,
} from '../services/backgroundRemoval';

interface UseBackgroundRemovalReturn {
  // 状态
  state: ProcessingState;
  progress: number;
  result: BackgroundRemovalResult | null;
  error: Error | null;

  // 操作
  removeBackground: (source: string | File | Blob) => Promise<void>;
  downloadResult: (fileName?: string) => void;
  reset: () => void;
}

export const useBackgroundRemoval = (
  options?: BackgroundRemovalOptions
): UseBackgroundRemovalReturn => {
  const [state, setState] = useState<ProcessingState>('idle');
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<BackgroundRemovalResult | null>(null);
  const [error, setError] = useState<Error | null>(null);

  // 跟踪进度
  const progressRef = useRef(options?.progress);

  const handleProgress = useCallback((key: string, current: number, total: number) => {
    const percentage = Math.round((current / total) * 100);
    setProgress(percentage);
    progressRef.current?.(key, current, total);
  }, []);

  // 移除背景
  const removeBackground = useCallback(async (source: string | File | Blob) => {
    // 清理之前的结果
    if (result?.processedUrl) {
      revokeObjectUrl(result.processedUrl);
    }

    setState('loading');
    setProgress(0);
    setError(null);
    setResult(null);

    try {
      const bgResult = await processImageBackground(source, {
        ...options,
        progress: handleProgress,
      });

      setResult(bgResult);
      setState('completed');
    } catch (err) {
      setError(err instanceof Error ? err : new Error('背景移除失败'));
      setState('error');
    }
  }, [options, handleProgress, result]);

  // 下载结果
  const downloadResult = useCallback((fileName?: string) => {
    if (result?.processedUrl) {
      downloadProcessedImage(result.processedUrl, fileName);
    }
  }, [result]);

  // 重置状态
  const reset = useCallback(() => {
    if (result?.processedUrl) {
      revokeObjectUrl(result.processedUrl);
    }
    setState('idle');
    setProgress(0);
    setResult(null);
    setError(null);
  }, [result]);

  // 清理
  useEffect(() => {
    return () => {
      if (result?.processedUrl) {
        revokeObjectUrl(result.processedUrl);
      }
    };
  }, [result]);

  return {
    state,
    progress,
    result,
    error,
    removeBackground,
    downloadResult,
    reset,
  };
};
```

---

## Phase 3: 背景移除 UI 组件 (预计 2 小时)

### 3.1 图片上传组件

**文件**: `src/components/backgroundRemoval/ImageUploader.tsx`

```typescript
/**
 * 图片上传组件
 *
 * 移植自: D:\NodejsP\remove-bg\src\components\ImageUploader.tsx
 */

import React, { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Upload, Image as ImageIcon } from 'lucide-react';
import { cn } from '../../utils/cn';

interface ImageUploaderProps {
  onImageSelected: (file: File) => void;
  disabled?: boolean;
  className?: string;
}

export const ImageUploader: React.FC<ImageUploaderProps> = ({
  onImageSelected,
  disabled = false,
  className,
}) => {
  const { t } = useTranslation();

  const handleDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      if (disabled) return;

      const files = e.dataTransfer.files;
      if (files.length > 0 && files[0].type.startsWith('image/')) {
        onImageSelected(files[0]);
      }
    },
    [disabled, onImageSelected]
  );

  const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
  }, []);

  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file && file.type.startsWith('image/')) {
        onImageSelected(file);
      }
      e.target.value = '';
    },
    [onImageSelected]
  );

  return (
    <div
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      className={cn(
        'flex flex-col items-center justify-center',
        'border-2 border-dashed border-gray-700 rounded-xl',
        'bg-gray-900/50 p-8',
        'transition-colors duration-200',
        !disabled && 'hover:border-yellow-400/50 hover:bg-gray-800/50 cursor-pointer',
        disabled && 'opacity-50 cursor-not-allowed',
        className
      )}
    >
      <input
        type="file"
        accept="image/*"
        onChange={handleFileChange}
        disabled={disabled}
        className="hidden"
        id="image-upload-input"
      />

      <label
        htmlFor="image-upload-input"
        className={cn(
          'flex flex-col items-center cursor-pointer',
          disabled && 'cursor-not-allowed'
        )}
      >
        <div className="w-16 h-16 rounded-full bg-gray-800 flex items-center justify-center mb-4">
          <Upload className="w-8 h-8 text-gray-400" />
        </div>

        <p className="text-sm text-gray-300 mb-2">
          {t('backgroundRemoval.uploadHint', '点击或拖放图片至此处')}
        </p>

        <p className="text-xs text-gray-500">
          {t('backgroundRemoval.supportedFormats', '支持 PNG, JPG, WEBP 格式')}
        </p>
      </label>
    </div>
  );
};
```

### 3.2 图片对比组件

**文件**: `src/components/backgroundRemoval/ImageCompareResult.tsx`

```typescript
/**
 * 图片对比组件
 *
 * 移植自: D:\NodejsP\remove-bg\src\components\ImageCompareResult.tsx
 */

import React from 'react';
import { useTranslation } from 'react-i18next';
import { Download, RotateCcw } from 'lucide-react';
import { ReactCompareSlider, ReactCompareSliderImage } from 'react-compare-slider';
import { Button } from '../ui/Button';

interface ImageCompareResultProps {
  originalImage: string;
  processedImage: string;
  fileName?: string;
  onDownload: () => void;
  onReset: () => void;
}

export const ImageCompareResult: React.FC<ImageCompareResultProps> = ({
  originalImage,
  processedImage,
  fileName,
  onDownload,
  onReset,
}) => {
  const { t } = useTranslation();

  return (
    <div className="bg-gray-900 rounded-xl border border-gray-700 overflow-hidden">
      {/* 图片对比区域 */}
      <div className="relative aspect-video bg-gray-800">
        <ReactCompareSlider
          itemOne={
            <ReactCompareSliderImage
              src={originalImage}
              alt={t('backgroundRemoval.original', '原图')}
              style={{
                objectFit: 'contain',
                width: '100%',
                height: '100%',
                backgroundColor: '#1f2937',
              }}
            />
          }
          itemTwo={
            <ReactCompareSliderImage
              src={processedImage}
              alt={t('backgroundRemoval.processed', '处理后')}
              style={{
                objectFit: 'contain',
                width: '100%',
                height: '100%',
                backgroundColor: '#1f2937',
              }}
            />
          }
          className="h-full w-full"
          position={50}
        />

        {/* 标签 */}
        <div className="absolute top-2 left-2 px-2 py-1 bg-black/50 rounded text-xs text-gray-300">
          {t('backgroundRemoval.original', '原图')}
        </div>
        <div className="absolute top-2 right-2 px-2 py-1 bg-black/50 rounded text-xs text-gray-300">
          {t('backgroundRemoval.processed', '处理后')}
        </div>
      </div>

      {/* 操作按钮 */}
      <div className="p-4 flex justify-center space-x-4">
        <Button variant="outline" onClick={onReset}>
          <RotateCcw className="w-4 h-4 mr-2" />
          {t('backgroundRemoval.selectOther', '选择其他图片')}
        </Button>
        <Button onClick={onDownload} className="bg-green-600 hover:bg-green-700">
          <Download className="w-4 h-4 mr-2" />
          {t('backgroundRemoval.download', '下载结果')}
        </Button>
      </div>
    </div>
  );
};
```

### 3.3 处理加载动画

**文件**: `src/components/backgroundRemoval/ProcessingLoader.tsx`

```typescript
/**
 * 处理加载动画组件
 */

import React from 'react';
import { useTranslation } from 'react-i18next';
import { Loader2 } from 'lucide-react';

interface ProcessingLoaderProps {
  progress: number;
  className?: string;
}

export const ProcessingLoader: React.FC<ProcessingLoaderProps> = ({
  progress,
  className,
}) => {
  const { t } = useTranslation();

  return (
    <div className={`flex flex-col items-center justify-center p-8 ${className || ''}`}>
      <Loader2 className="w-12 h-12 text-yellow-400 animate-spin mb-4" />

      <p className="text-gray-300 mb-2">
        {t('backgroundRemoval.processing', '正在移除背景...')}
      </p>

      {/* 进度条 */}
      <div className="w-64 h-2 bg-gray-700 rounded-full overflow-hidden">
        <div
          className="h-full bg-yellow-400 transition-all duration-300"
          style={{ width: `${progress}%` }}
        />
      </div>

      <p className="text-xs text-gray-500 mt-2">{progress}%</p>
    </div>
  );
};
```

---

## Phase 4: 精灵图生成 (预计 2.5 小时)

### 4.1 提示词模板

**文件**: `src/constants/spritePrompts.ts`

```typescript
/**
 * 精灵图生成提示词模板
 */

export const CHARACTER_STYLE_PROMPT = `
Generate a single character only, centered in the frame on a plain white background.
The character should be rendered in detailed 32-bit pixel art style.
Requirements:
- Clearly visible and well-lit
- Facing forward or slightly to the side
- Full body visible from head to toe
- No weapons or accessories extending beyond the frame
- Pixel art, game asset quality
`.trim();

export const SPRITE_ANIMATION_PROMPTS = {
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
`.trim(),

  jump: `
Create a 4-frame pixel art jump animation sprite sheet.
Frames: crouch -> jump up -> falling -> landing
- Keep the character centered
- Pure white background
`.trim(),

  attack: `
Create a 4-frame pixel art attack animation sprite sheet.
Frames: preparation -> strike -> impact -> recovery
- Keep the character centered
- Pure white background
`.trim(),

  idle: `
Create a 4-frame pixel art idle/breathing animation sprite sheet.
- Subtle breathing animation
- Keep the character centered
- Pure white background
`.trim(),
};

export type SpriteAnimationType = keyof typeof SPRITE_ANIMATION_PROMPTS;
```

### 4.2 精灵图生成 Hook

**文件**: `src/hooks/useSpriteGeneration.ts`

```typescript
/**
 * 精灵图生成 Hook
 */

import { useMutation } from '@tanstack/react-query';
import { useAppStore } from '../store/useAppStore';
import { getCurrentAIService } from '../services/ai';
import { SPRITE_ANIMATION_PROMPTS, SpriteAnimationType } from '../constants/spritePrompts';

export const useSpriteGeneration = () => {
  const { setSpriteState, spriteState } = useAppStore();

  // 生成角色
  const generateCharacter = useMutation({
    mutationFn: async (prompt: string) => {
      const service = getCurrentAIService();
      const fullPrompt = `${CHARACTER_STYLE_PROMPT}\n\n${prompt}`;
      const images = await service.generateImage({ prompt: fullPrompt });
      return images[0];
    },
    onSuccess: (characterImage) => {
      setSpriteState({ characterImage });
    },
  });

  // 生成精灵图
  const generateSpriteSheet = useMutation({
    mutationFn: async ({
      characterImage,
      animationType,
    }: {
      characterImage: string;
      animationType: SpriteAnimationType;
    }) => {
      const service = getCurrentAIService();
      const prompt = SPRITE_ANIMATION_PROMPTS[animationType];

      const images = await service.editImage({
        instruction: prompt,
        originalImage: characterImage,
      });

      return { animationType, spriteSheetUrl: images[0] };
    },
    onSuccess: ({ animationType, spriteSheetUrl }) => {
      setSpriteState({
        spriteSheets: {
          ...spriteState.spriteSheets,
          [animationType]: spriteSheetUrl,
        },
      });
    },
  });

  return {
    generateCharacter: generateCharacter.mutate,
    generateSpriteSheet: generateSpriteSheet.mutate,
    isGenerating: generateCharacter.isPending || generateSpriteSheet.isPending,
  };
};
```

---

## Phase 5: Store 状态扩展 (预计 0.5 小时)

**更新**: `src/store/useAppStore.ts`

```typescript
// 添加精灵图状态
interface SpriteState {
  characterImage: string | null;
  characterPrompt: string;
  spriteSheets: Record<SpriteAnimationType, string | null>;
  transparentImage: string | null;
  gameBackground: string | null;
  currentAnimation: SpriteAnimationType;
}

// 添加背景移除状态
interface BackgroundRemovalState {
  originalImage: string | null;
  processedImage: string | null;
  isProcessing: boolean;
  progress: number;
}
```

---

## Phase 6: i18n 翻译 (预计 0.5 小时)

**更新**: `src/i18n/locales/zh.json`

```json
{
  "backgroundRemoval": {
    "title": "背景移除",
    "uploadHint": "点击或拖放图片至此处",
    "supportedFormats": "支持 PNG, JPG, WEBP 格式",
    "processing": "正在移除背景...",
    "original": "原图",
    "processed": "处理后",
    "selectOther": "选择其他图片",
    "download": "下载结果",
    "error": "处理失败，请重试"
  },
  "spriteWorkflow": {
    "step1": "生成角色",
    "step2": "生成精灵图",
    "step3": "移除背景",
    "step4": "游戏背景"
  },
  "spriteAnimations": {
    "idle": "待机",
    "walk": "行走",
    "jump": "跳跃",
    "attack": "攻击"
  }
}
```

---

## 实施时间表

| 阶段 | 任务 | 预计时间 | 依赖 |
|------|------|----------|------|
| Phase 1 | 背景移除服务移植 | 1.5 小时 | 无 |
| Phase 2 | 背景移除 Hook | 1 小时 | Phase 1 |
| Phase 3 | 背景移除 UI 组件 | 2 小时 | Phase 2 |
| Phase 4 | 精灵图生成 | 2.5 小时 | 无 |
| Phase 5 | Store 状态扩展 | 0.5 小时 | 无 |
| Phase 6 | i18n 翻译 | 0.5 小时 | 无 |

**总计**: 约 8 小时

---

## 依赖安装

```bash
npm install @imgly/background-removal react-compare-slider
```

---

## 优势

| 方面 | 说明 |
|------|------|
| **本地处理** | 背景移除在浏览器端完成，无需服务器 |
| **无需额外 API** | 不需要付费的背景移除 API |
| **隐私保护** | 图片不会上传到第三方服务 |
| **离线可用** | 加载模型后可离线使用 |

---

## 验收标准

- [ ] 可以上传图片并移除背景
- [ ] 显示处理进度
- [ ] 支持原图/处理后图片对比
- [ ] 可以下载处理结果
- [ ] 可以生成精灵图
- [ ] 所有功能有中文翻译
- [ ] 构建无错误

---

## 参考资源

- remove-bg 项目: `D:\NodejsP\remove-bg`
- @imgly/background-removal: https://www.npmjs.com/package/@imgly/background-removal
- react-compare-slider: https://www.npmjs.com/package/react-compare-slider
