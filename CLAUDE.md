# Nano Banana Editor - 项目说明与执行计划

## 项目概述

**Nano Banana Editor** 是一个基于 AI 的图像生成与编辑工具，使用 React + TypeScript + Vite 构建。

### 技术栈

- **前端框架**: React 18 + TypeScript
- **构建工具**: Vite
- **状态管理**: Zustand
- **样式**: Tailwind CSS + Radix UI
- **国际化**: react-i18next
- **AI 服务**: Gemini API / AIStudioToAPI

### 项目结构

```
src/
├── components/          # React 组件
│   ├── promptComposerParts/  # 提示词编辑器子组件
│   └── ui/              # 基础 UI 组件
├── hooks/               # React Hooks
│   ├── useImageGeneration.ts
│   ├── useImageEditing.ts
│   └── useMaskDrawing.ts
├── services/
│   └── ai/              # AI 服务层
│       ├── geminiService.ts
│       ├── aiStudioService.ts
│       ├── baseService.ts
│       └── factory.ts
├── store/               # Zustand 状态管理
│   └── useAppStore.ts
├── i18n/                # 国际化
│   └── locales/
├── constants/           # 常量定义
└── utils/               # 工具函数
```

### AI 服务配置

项目支持两种 AI 渠道：
1. **AIStudioToAPI** - 本地代理服务 (localhost:7860)
2. **Gemini API** - Google 官方 API

配置方式：通过 UI 或环境变量 `VITE_GEMINI_API_KEY`

---

## 当前执行计划: Sprite Sheet 模式移植

### 目标

移植 sprite-sheet-creator 和 remove-bg 项目的核心功能到 NanoBananaEditor：

1. **精灵图生成模式** - 使用现有 Gemini / AIStudioToAPI
2. **背景移除模式** - 移植 remove-bg (@imgly/background-removal)
3. **步骤式工作流** - 4 步骤引导式 UI
4. **动画预览功能** - 精灵图帧动画播放

---

## 执行阶段清单

### Phase 1: 背景移除服务移植 [ ] 预计 1.5 小时

**任务**:
- [ ] 安装依赖: `npm install @imgly/background-removal react-compare-slider`
- [ ] 创建 `src/services/backgroundRemoval/types.ts`
- [ ] 创建 `src/services/backgroundRemoval/removeBackground.ts`
- [ ] 创建 `src/services/backgroundRemoval/index.ts`

**关键代码**:

```typescript
// src/services/backgroundRemoval/removeBackground.ts
import { removeBackground } from '@imgly/background-removal';

export const processImageBackground = async (
  source: string | File | Blob,
  options?: BackgroundRemovalOptions
): Promise<BackgroundRemovalResult> => {
  const processedBlob = await removeBackground(source, {
    progress: options?.progress,
  });
  return {
    originalUrl: ...,
    processedUrl: URL.createObjectURL(processedBlob),
    blob: processedBlob,
  };
};
```

---

### Phase 2: 背景移除 Hook [ ] 预计 1 小时

**任务**:
- [ ] 创建 `src/hooks/useBackgroundRemoval.ts`
- [ ] 实现状态管理 (idle -> loading -> processing -> completed)
- [ ] 实现进度跟踪
- [ ] 实现结果下载和重置

**关键代码**:

```typescript
// src/hooks/useBackgroundRemoval.ts
export const useBackgroundRemoval = () => {
  const [state, setState] = useState<ProcessingState>('idle');
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<BackgroundRemovalResult | null>(null);

  const removeBackground = async (source: string | File | Blob) => {
    setState('loading');
    const bgResult = await processImageBackground(source, {
      progress: (key, current, total) => {
        setProgress(Math.round((current / total) * 100));
      },
    });
    setResult(bgResult);
    setState('completed');
  };

  return { state, progress, result, removeBackground, reset };
};
```

---

### Phase 3: 背景移除 UI 组件 [ ] 预计 2 小时

**任务**:
- [ ] 创建 `src/components/backgroundRemoval/ImageUploader.tsx`
- [ ] 创建 `src/components/backgroundRemoval/ImageCompareResult.tsx`
- [ ] 创建 `src/components/backgroundRemoval/ProcessingLoader.tsx`
- [ ] 创建 `src/components/backgroundRemoval/index.ts`

**组件列表**:

| 组件 | 功能 | 移植源 |
|------|------|--------|
| ImageUploader | 图片拖放上传 | remove-bg |
| ImageCompareResult | 前后对比滑块 | remove-bg |
| ProcessingLoader | 处理进度动画 | 新增 |

---

### Phase 4: 精灵图生成 [ ] 预计 2.5 小时

**任务**:
- [ ] 创建 `src/constants/spritePrompts.ts` - 提示词模板
- [ ] 创建 `src/hooks/useSpriteGeneration.ts`
- [ ] 创建 `src/utils/spriteUtils.ts` - 帧提取工具
- [ ] 创建 `src/components/spritePreview/AnimationPlayer.tsx`

**提示词模板**:

```typescript
// src/constants/spritePrompts.ts
export const SPRITE_ANIMATION_PROMPTS = {
  walk: `Create a 4-frame pixel art walk cycle sprite sheet...`,
  jump: `Create a 4-frame pixel art jump animation sprite sheet...`,
  attack: `Create a 4-frame pixel art attack animation sprite sheet...`,
  idle: `Create a 4-frame pixel art idle/breathing animation sprite sheet...`,
};
```

**帧提取工具**:

```typescript
// src/utils/spriteUtils.ts
export async function extractFramesFromSpriteSheet(
  spriteSheetUrl: string,
  frameCount: number
): Promise<string[]> {
  // 从精灵图中裁剪出单个帧
}
```

---

### Phase 5: Store 状态扩展 [ ] 预计 0.5 小时

**任务**:
- [ ] 更新 `src/store/useAppStore.ts`
- [ ] 添加 SpriteState 接口
- [ ] 添加 BackgroundRemovalState 接口
- [ ] 添加相关 Actions

**新增状态**:

```typescript
interface SpriteState {
  characterImage: string | null;
  characterPrompt: string;
  spriteSheets: Record<SpriteAnimationType, string | null>;
  transparentImage: string | null;
  gameBackground: string | null;
  currentAnimation: SpriteAnimationType;
}

interface BackgroundRemovalState {
  originalImage: string | null;
  processedImage: string | null;
  isProcessing: boolean;
  progress: number;
}
```

---

### Phase 6: i18n 翻译 [ ] 预计 0.5 小时

**任务**:
- [ ] 更新 `src/i18n/locales/zh.json`
- [ ] 更新 `src/i18n/locales/en.json`
- [ ] 添加背景移除相关翻译
- [ ] 添加精灵图相关翻译

**翻译键**:

```json
{
  "backgroundRemoval": {
    "title": "背景移除",
    "uploadHint": "点击或拖放图片至此处",
    "processing": "正在移除背景...",
    "download": "下载结果"
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

## 验收标准

完成以下检查项后标记任务完成：

### 背景移除功能
- [ ] 可以上传图片（点击或拖放）
- [ ] 显示处理进度（0-100%）
- [ ] 支持原图/处理后图片对比滑块
- [ ] 可以下载处理结果（PNG 格式）
- [ ] 可以选择其他图片重新处理

### 精灵图生成功能
- [ ] 可以通过文本描述生成角色
- [ ] 可以生成 walk/jump/attack/idle 四种精灵图
- [ ] 可以从精灵图中提取单个帧
- [ ] 动画播放器可以播放精灵图帧

### 通用
- [ ] 所有新功能有中文翻译
- [ ] 构建无错误 (`npm run build`)
- [ ] 开发服务器正常运行 (`npm run dev`)

---

## 相关文档

- 分析报告: `Docs/sprite-sheet-creator-analysis.md`
- 实现计划: `Docs/sprite-sheet-integration-plan.md`

---

## 开发命令

```bash
# 安装依赖
npm install

# 安装新功能依赖
npm install @imgly/background-removal react-compare-slider

# 开发模式
npm run dev

# 构建
npm run build

# 类型检查
npx tsc --noEmit
```

---

## 注意事项

1. **内存管理**: 背景移除处理完成后需调用 `URL.revokeObjectURL()` 释放内存
2. **模型加载**: @imgly/background-removal 首次使用需下载约 30MB 模型
3. **浏览器兼容**: 需要支持 WebAssembly 和 Web Workers 的现代浏览器
4. **图片格式**: 支持 PNG（推荐）、JPG、WEBP

---

## 联系方式

如有问题，请在 GitHub Issues 中反馈。
