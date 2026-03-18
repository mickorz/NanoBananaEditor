# Sprite Sheet 模式移植实现计划

## 目标

将 sprite-sheet-creator 项目的核心模式移植到 NanoBananaEditor，**使用现有的 Gemini / AIStudioToAPI 服务**，增加以下功能：
1. 精灵图生成模式
2. 背景移除模式（使用 Gemini 编辑能力）
3. 步骤式工作流
4. 动画预览功能

---

## 技术方案对比

| 功能 | sprite-sheet-creator | NanoBananaEditor (本方案) |
|------|---------------------|--------------------------|
| 角色生成 | fal-ai/nano-banana-pro | Gemini 2.5 Flash Image |
| 精灵图生成 | fal-ai/nano-banana-pro/edit | Gemini 编辑模式 |
| 背景移除 | fal-ai/bria/background/remove | Gemini 编辑（提示词指令） |
| 工作流 | 6 步骤 | 4 步骤（简化） |

---

## 架构设计

### 新增目录结构

```
src/
├── hooks/
│   ├── useSpriteGeneration.ts     # 新增: 精灵图生成
│   └── useBackgroundRemoval.ts    # 新增: 背景移除
├── components/
│   ├── spritePreview/
│   │   ├── SpritePreview.tsx      # 新增: 精灵图预览
│   │   ├── AnimationPlayer.tsx    # 新增: 动画播放器
│   │   └── FrameExtractor.tsx     # 新增: 帧提取器
│   └── workflow/
│       ├── WorkflowStepper.tsx    # 新增: 工作流步骤器
│       └── StepIndicator.tsx      # 新增: 步骤指示器
├── utils/
│   └── spriteUtils.ts             # 新增: 精灵图处理工具
└── constants/
    └── spritePrompts.ts           # 新增: 精灵图提示词模板
```

---

## Phase 1: 提示词模板与常量 (预计 1 小时)

### 1.1 创建精灵图提示词模板

**文件**: `src/constants/spritePrompts.ts`

```typescript
/**
 * 精灵图生成提示词模板
 *
 * 基于 sprite-sheet-creator 的提示词，适配 Gemini 模型
 */

// 角色风格基础提示词
export const CHARACTER_STYLE_PROMPT = `
Generate a single character only, centered in the frame on a plain white background.
The character should be rendered in detailed 32-bit pixel art style.
Make sure the character is:
- Clearly visible and well-lit
- Facing forward or slightly to the side
- Full body visible from head to toe
- No weapons or accessories that extend beyond the frame
- Style: Pixel art, game asset quality
`.trim();

// 精灵图动画提示词
export const SPRITE_ANIMATION_PROMPTS = {
  walk: `
Create a 4-frame pixel art walk cycle sprite sheet for this character.
Requirements:
- Arrange frames horizontally in a single row (left to right: frame 1, 2, 3, 4)
- Each frame should be the same size
- Character walks in place (stays centered)
- Smooth walking motion: right leg forward, neutral, left leg forward, neutral
- Keep the character's head at the same height in all frames
- Pure white background (#FFFFFF)
- No grid lines or frame borders
- Consistent pixel size and art style
`.trim(),

  jump: `
Create a 4-frame pixel art jump animation sprite sheet for this character.
Requirements:
- Arrange frames horizontally in a single row (left to right: frame 1, 2, 3, 4)
- Frame 1: Crouch/jump preparation
- Frame 2: Jumping up (highest point)
- Frame 3: Falling down
- Frame 4: Landing/crouch
- Keep the character centered in each frame
- Pure white background (#FFFFFF)
- No grid lines or frame borders
`.trim(),

  attack: `
Create a 4-frame pixel art attack animation sprite sheet for this character.
Requirements:
- Arrange frames horizontally in a single row (left to right: frame 1, 2, 3, 4)
- Frame 1: Preparation/wind-up
- Frame 2: Attack strike
- Frame 3: Attack impact
- Frame 4: Recovery/follow-through
- Keep the character centered
- Pure white background (#FFFFFF)
- No grid lines or frame borders
`.trim(),

  idle: `
Create a 4-frame pixel art idle/breathing animation sprite sheet for this character.
Requirements:
- Arrange frames horizontally in a single row (left to right: frame 1, 2, 3, 4)
- Subtle breathing animation
- Slight body movement (rise and fall)
- Keep the character centered and at same height
- Pure white background (#FFFFFF)
- No grid lines or frame borders
`.trim(),
};

// 背景移除提示词
export const BACKGROUND_REMOVAL_PROMPT = `
Remove the background from this image completely.
Requirements:
- Keep only the main character/subject
- Make the background completely transparent
- Preserve all details and colors of the character
- Clean edges around the character
- Output as PNG with transparent background
`.trim();

// 游戏背景生成提示词
export const GAME_BACKGROUND_PROMPT = `
Generate a pixel art game background that matches this character's style.
Requirements:
- 16:9 aspect ratio
- Side-scrolling platformer style
- Include ground/platform area at the bottom
- Parallax-friendly layered design
- Consistent pixel art style with the character
- Color palette that complements the character
`.trim();

export type SpriteAnimationType = keyof typeof SPRITE_ANIMATION_PROMPTS;
```

---

## Phase 2: 精灵图生成 Hook (预计 2 小时)

### 2.1 创建精灵图生成 Hook

**文件**: `src/hooks/useSpriteGeneration.ts`

```typescript
/**
 * 精灵图生成 Hook
 *
 * useSpriteGeneration 工作流程:
 *   ├─> generateCharacter()      生成角色
 *   ├─> generateSpriteSheet()    生成精灵图
 *   ├─> extractFrames()          提取帧
 *   └─> exportAnimation()        导出动画
 */

import { useMutation } from '@tanstack/react-query';
import { useAppStore } from '../store/useAppStore';
import { getCurrentAIService } from '../services/ai';
import {
  CHARACTER_STYLE_PROMPT,
  SPRITE_ANIMATION_PROMPTS,
  SpriteAnimationType,
} from '../constants/spritePrompts';
import { extractFramesFromSpriteSheet } from '../utils/spriteUtils';

interface SpriteGenerationResult {
  characterImage: string;
  spriteSheets: Record<SpriteAnimationType, string>;
  frames: Record<SpriteAnimationType, string[]>;
}

export const useSpriteGeneration = () => {
  const { setSpriteState, spriteState } = useAppStore();

  // 生成角色
  const generateCharacter = useMutation({
    mutationFn: async (prompt: string) => {
      const service = getCurrentAIService();
      const fullPrompt = `${CHARACTER_STYLE_PROMPT}\n\nCharacter description: ${prompt}`;

      const images = await service.generateImage({
        prompt: fullPrompt,
      });

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
      // 提取帧
      const frames = extractFramesFromSpriteSheet(spriteSheetUrl, 4);

      setSpriteState({
        spriteSheets: {
          ...spriteState.spriteSheets,
          [animationType]: spriteSheetUrl,
        },
        frames: {
          ...spriteState.frames,
          [animationType]: frames,
        },
      });
    },
  });

  // 批量生成所有精灵图
  const generateAllSpriteSheets = async (characterImage: string) => {
    const animationTypes: SpriteAnimationType[] = ['walk', 'jump', 'attack', 'idle'];

    await Promise.all(
      animationTypes.map((type) =>
        generateSpriteSheet.mutateAsync({ characterImage, animationType: type })
      )
    );
  };

  return {
    generateCharacter: generateCharacter.mutate,
    generateSpriteSheet: generateSpriteSheet.mutate,
    generateAllSpriteSheets,
    isGenerating: generateCharacter.isPending || generateSpriteSheet.isPending,
    error: generateCharacter.error || generateSpriteSheet.error,
  };
};
```

### 2.2 创建背景移除 Hook

**文件**: `src/hooks/useBackgroundRemoval.ts`

```typescript
/**
 * 背景移除 Hook
 *
 * useBackgroundRemoval 工作流程:
 *   ├─> removeBackground()       移除背景
 *   └─> generateGameBackground() 生成游戏背景
 */

import { useMutation } from '@tanstack/react-query';
import { useAppStore } from '../store/useAppStore';
import { getCurrentAIService } from '../services/ai';
import { BACKGROUND_REMOVAL_PROMPT, GAME_BACKGROUND_PROMPT } from '../constants/spritePrompts';

export const useBackgroundRemoval = () => {
  const { setSpriteState, spriteState } = useAppStore();

  // 移除背景
  const removeBackground = useMutation({
    mutationFn: async (imageUrl: string) => {
      const service = getCurrentAIService();

      const images = await service.editImage({
        instruction: BACKGROUND_REMOVAL_PROMPT,
        originalImage: imageUrl,
      });

      return images[0];
    },
    onSuccess: (transparentImage) => {
      setSpriteState({ transparentImage });
    },
  });

  // 生成游戏背景
  const generateGameBackground = useMutation({
    mutationFn: async ({ characterImage, characterPrompt }: { characterImage: string; characterPrompt: string }) => {
      const service = getCurrentAIService();
      const fullPrompt = `${GAME_BACKGROUND_PROMPT}\n\nCharacter style reference: ${characterPrompt}`;

      const images = await service.generateImage({
        prompt: fullPrompt,
        referenceImages: [characterImage],
      });

      return images[0];
    },
    onSuccess: (gameBackground) => {
      setSpriteState({ gameBackground });
    },
  });

  return {
    removeBackground: removeBackground.mutate,
    generateGameBackground: generateGameBackground.mutate,
    isRemoving: removeBackground.isPending,
    isGeneratingBackground: generateGameBackground.isPending,
    error: removeBackground.error || generateGameBackground.error,
  };
};
```

---

## Phase 3: 工具函数 (预计 1.5 小时)

### 3.1 创建精灵图处理工具

**文件**: `src/utils/spriteUtils.ts`

```typescript
/**
 * 精灵图处理工具函数
 *
 * spriteUtils 工具:
 *   ├─> extractFramesFromSpriteSheet()  从精灵图提取帧
 *   ├─> calculateContentBounds()         计算内容边界
 *   ├─> createTransparentCanvas()        创建透明画布
 *   └─> exportFramesAsZip()              导出帧为 ZIP
 */

/**
 * 从精灵图中提取单个帧
 */
export async function extractFramesFromSpriteSheet(
  spriteSheetUrl: string,
  frameCount: number
): Promise<string[]> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';

    img.onload = () => {
      const frameWidth = img.width / frameCount;
      const frameHeight = img.height;
      const frames: string[] = [];

      for (let i = 0; i < frameCount; i++) {
        const canvas = document.createElement('canvas');
        canvas.width = frameWidth;
        canvas.height = frameHeight;

        const ctx = canvas.getContext('2d')!;
        ctx.drawImage(
          img,
          i * frameWidth, 0, frameWidth, frameHeight,
          0, 0, frameWidth, frameHeight
        );

        frames.push(canvas.toDataURL('image/png'));
      }

      resolve(frames);
    };

    img.onerror = () => reject(new Error('Failed to load sprite sheet'));
    img.src = spriteSheetUrl;
  });
}

/**
 * 计算图像内容边界（用于自动裁剪透明区域）
 */
export function calculateContentBounds(imageData: ImageData): {
  x: number;
  y: number;
  width: number;
  height: number;
} {
  const { data, width, height } = imageData;
  let minX = width;
  let minY = height;
  let maxX = 0;
  let maxY = 0;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const alpha = data[(y * width + x) * 4 + 3];
      if (alpha > 0) {
        minX = Math.min(minX, x);
        minY = Math.min(minY, y);
        maxX = Math.max(maxX, x);
        maxY = Math.max(maxY, y);
      }
    }
  }

  return {
    x: minX,
    y: minY,
    width: maxX - minX + 1,
    height: maxY - minY + 1,
  };
}

/**
 * 创建指定尺寸的透明画布
 */
export function createTransparentCanvas(width: number, height: number): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  return canvas;
}

/**
 * 将帧列表合并为精灵图
 */
export function combineFramesToSpriteSheet(frames: string[]): Promise<string> {
  return new Promise((resolve, reject) => {
    if (frames.length === 0) {
      reject(new Error('No frames to combine'));
      return;
    }

    const images: HTMLImageElement[] = [];
    let loadedCount = 0;

    frames.forEach((frame, index) => {
      const img = new Image();
      img.onload = () => {
        images[index] = img;
        loadedCount++;

        if (loadedCount === frames.length) {
          const frameWidth = images[0].width;
          const frameHeight = images[0].height;

          const canvas = document.createElement('canvas');
          canvas.width = frameWidth * frames.length;
          canvas.height = frameHeight;

          const ctx = canvas.getContext('2d')!;
          images.forEach((img, i) => {
            ctx.drawImage(img, i * frameWidth, 0);
          });

          resolve(canvas.toDataURL('image/png'));
        }
      };
      img.onerror = () => reject(new Error(`Failed to load frame ${index}`));
      img.src = frames[index];
    });
  });
}
```

---

## Phase 4: Store 状态扩展 (预计 0.5 小时)

### 4.1 添加精灵图状态

**更新**: `src/store/useAppStore.ts`

```typescript
import { SpriteAnimationType } from '../constants/spritePrompts';

interface SpriteState {
  // 角色图像
  characterImage: string | null;
  characterPrompt: string;

  // 精灵图
  spriteSheets: Record<SpriteAnimationType, string | null>;
  frames: Record<SpriteAnimationType, string[]>;

  // 背景处理
  transparentImage: string | null;
  gameBackground: string | null;

  // 当前选中的动画
  currentAnimation: SpriteAnimationType;
}

// 在 AppState 中添加
interface AppState {
  // ... 现有状态

  // 精灵图状态
  spriteState: SpriteState;

  // Actions
  setSpriteState: (state: Partial<SpriteState>) => void;
  resetSpriteState: () => void;
  setCurrentAnimation: (animation: SpriteAnimationType) => void;
}

// 初始状态
const initialSpriteState: SpriteState = {
  characterImage: null,
  characterPrompt: '',
  spriteSheets: {
    walk: null,
    jump: null,
    attack: null,
    idle: null,
  },
  frames: {
    walk: [],
    jump: [],
    attack: [],
    idle: [],
  },
  transparentImage: null,
  gameBackground: null,
  currentAnimation: 'idle',
};
```

---

## Phase 5: UI 组件 (预计 3 小时)

### 5.1 工作流步骤器

**文件**: `src/components/workflow/WorkflowStepper.tsx`

```typescript
/**
 * 工作流步骤器组件
 *
 * WorkflowStepper 渲染步骤:
 *   ├─> Step 1: 生成角色
 *   ├─> Step 2: 生成精灵图
 *   ├─> Step 3: 移除背景
 *   └─> Step 4: 生成游戏背景
 */

import React from 'react';
import { useTranslation } from 'react-i18next';
import { Check } from 'lucide-react';
import { cn } from '../../utils/cn';

export type SpriteWorkflowStep = 1 | 2 | 3 | 4;

interface WorkflowStepperProps {
  currentStep: SpriteWorkflowStep;
  completedSteps: Set<number>;
  onStepClick: (step: SpriteWorkflowStep) => void;
}

export const WorkflowStepper: React.FC<WorkflowStepperProps> = ({
  currentStep,
  completedSteps,
  onStepClick,
}) => {
  const { t } = useTranslation();

  const steps = [
    { id: 1, label: t('spriteWorkflow.step1', '生成角色') },
    { id: 2, label: t('spriteWorkflow.step2', '精灵图') },
    { id: 3, label: t('spriteWorkflow.step3', '移除背景') },
    { id: 4, label: t('spriteWorkflow.step4', '游戏背景') },
  ];

  return (
    <div className="flex items-center justify-between mb-6">
      {steps.map((step, index) => (
        <React.Fragment key={step.id}>
          <button
            onClick={() => onStepClick(step.id as SpriteWorkflowStep)}
            className={cn(
              'flex items-center justify-center w-8 h-8 rounded-full text-sm font-medium transition-all',
              currentStep === step.id
                ? 'bg-yellow-400 text-gray-900'
                : completedSteps.has(step.id)
                  ? 'bg-green-500 text-white'
                  : 'bg-gray-700 text-gray-400 hover:bg-gray-600'
            )}
          >
            {completedSteps.has(step.id) ? (
              <Check className="h-4 w-4" />
            ) : (
              step.id
            )}
          </button>
          <span className="text-xs text-gray-400 ml-2 hidden sm:inline">{step.label}</span>
          {index < steps.length - 1 && (
            <div className={cn(
              'flex-1 h-0.5 mx-2',
              completedSteps.has(step.id) ? 'bg-green-500' : 'bg-gray-700'
            )} />
          )}
        </React.Fragment>
      ))}
    </div>
  );
};
```

### 5.2 动画播放器

**文件**: `src/components/spritePreview/AnimationPlayer.tsx`

```typescript
/**
 * 动画播放器组件
 *
 * AnimationPlayer 功能:
 *   ├─> 帧动画播放
 *   ├─> FPS 控制
 *   └─> 动画类型切换
 */

import React, { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Play, Pause, SkipBack, SkipForward } from 'lucide-react';
import { Button } from '../ui/Button';
import { SpriteAnimationType } from '../../constants/spritePrompts';
import { cn } from '../../utils/cn';

interface AnimationPlayerProps {
  frames: string[];
  fps?: number;
  animationType: SpriteAnimationType;
  isPlaying: boolean;
  onPlayPause: () => void;
  onAnimationTypeChange: (type: SpriteAnimationType) => void;
}

export const AnimationPlayer: React.FC<AnimationPlayerProps> = ({
  frames,
  fps = 8,
  animationType,
  isPlaying,
  onPlayPause,
  onAnimationTypeChange,
}) => {
  const { t } = useTranslation();
  const [currentFrame, setCurrentFrame] = useState(0);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // 动画循环
  useEffect(() => {
    if (!isPlaying || frames.length === 0) return;

    const frameDuration = 1000 / fps;
    const interval = setInterval(() => {
      setCurrentFrame((prev) => (prev + 1) % frames.length);
    }, frameDuration);

    return () => clearInterval(interval);
  }, [isPlaying, frames, fps]);

  // 渲染当前帧
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || frames.length === 0) return;

    const ctx = canvas.getContext('2d')!;
    const img = new Image();
    img.src = frames[currentFrame];
    img.onload = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    };
  }, [frames, currentFrame]);

  const animationTypes: SpriteAnimationType[] = ['idle', 'walk', 'jump', 'attack'];

  return (
    <div className="bg-gray-900 rounded-lg p-4">
      {/* 动画类型选择 */}
      <div className="flex space-x-2 mb-4">
        {animationTypes.map((type) => (
          <button
            key={type}
            onClick={() => onAnimationTypeChange(type)}
            className={cn(
              'px-3 py-1 rounded text-sm transition-colors',
              animationType === type
                ? 'bg-yellow-400 text-gray-900'
                : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
            )}
          >
            {t(`spriteAnimations.${type}`, type)}
          </button>
        ))}
      </div>

      {/* 画布 */}
      <div className="flex justify-center mb-4">
        <canvas
          ref={canvasRef}
          width={128}
          height={128}
          className="border border-gray-700 rounded bg-gray-800"
        />
      </div>

      {/* 控制按钮 */}
      <div className="flex items-center justify-center space-x-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setCurrentFrame(0)}
          disabled={frames.length === 0}
        >
          <SkipBack className="h-4 w-4" />
        </Button>
        <Button
          variant="secondary"
          size="sm"
          onClick={onPlayPause}
          disabled={frames.length === 0}
        >
          {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setCurrentFrame((frames.length - 1))}
          disabled={frames.length === 0}
        >
          <SkipForward className="h-4 w-4" />
        </Button>
      </div>

      {/* 帧信息 */}
      <div className="text-center text-xs text-gray-500 mt-2">
        {frames.length > 0 ? `${currentFrame + 1} / ${frames.length}` : t('spritePreview.noFrames', '无帧')}
      </div>
    </div>
  );
};
```

---

## Phase 6: 模式集成 (预计 1 小时)

### 6.1 更新模式选择器

在 `ModeSelector` 组件中添加新模式：

```typescript
const tools = [
  { id: 'generate', icon: Wand2, label: '生成' },
  { id: 'edit', icon: Edit3, label: '编辑' },
  { id: 'mask', icon: MousePointer, label: '蒙版' },
  { id: 'sprite', icon: Gamepad2, label: '精灵图' },  // 新增
] as const;
```

### 6.2 添加 i18n 翻译

**更新**: `src/i18n/locales/zh.json`

```json
{
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
  },
  "spritePreview": {
    "noFrames": "无帧数据",
    "generateCharacter": "生成角色",
    "generateAllSprites": "生成全部精灵图",
    "removeBackground": "移除背景",
    "generateBackground": "生成背景"
  },
  "promptComposer": {
    "tools": {
      "sprite": "精灵图",
      "spriteDesc": "生成游戏精灵图动画"
    }
  }
}
```

---

## 实施时间表

| 阶段 | 任务 | 预计时间 | 依赖 |
|------|------|----------|------|
| Phase 1 | 提示词模板与常量 | 1 小时 | 无 |
| Phase 2 | 精灵图生成 Hook | 2 小时 | Phase 1 |
| Phase 3 | 工具函数 | 1.5 小时 | 无 |
| Phase 4 | Store 状态扩展 | 0.5 小时 | 无 |
| Phase 5 | UI 组件 | 3 小时 | Phase 2, 3 |
| Phase 6 | 模式集成 | 1 小时 | Phase 4, 5 |

**总计**: 约 9 小时

---

## 优势对比

| 方面 | 使用 fal.ai | 使用现有 Gemini API |
|------|------------|---------------------|
| API 密钥 | 需要新增 | 无需新增 |
| 费用 | 额外费用 | 复用现有 |
| 背景移除 | 专用模型 (更精准) | 编辑模式 (基本可用) |
| 维护成本 | 多个服务 | 单一服务 |
| 一致性 | 可能不一致 | 风格统一 |

---

## 验收标准

- [ ] 可以通过文本描述生成角色
- [ ] 可以生成 walk/jump/attack/idle 四种精灵图
- [ ] 可以从精灵图中提取单个帧
- [ ] 可以使用 Gemini 移除背景
- [ ] 工作流步骤器正常工作
- [ ] 动画播放器可以播放精灵图帧
- [ ] 所有新功能有中文翻译
- [ ] 构建无错误

---

## 参考资源

- sprite-sheet-creator 分析报告: `Docs/sprite-sheet-creator-analysis.md`
- Gemini API 文档: https://ai.google.dev/docs
- 当前 AI 服务实现: `src/services/ai/`
