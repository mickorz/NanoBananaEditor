/**
 * 提示词编辑器主组件
 *
 * PromptComposer 组合子组件:
 *   ├─> AIChannelSelector    AI 渠道选择器
 *   ├─> ModeSelector         模式选择器
 *   ├─> ImageUploader        图片上传组件
 *   ├─> PromptInput          提示词输入组件
 *   └─> AdvancedSettings     高级设置组件
 */

import React, { useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Wand2, Eraser } from 'lucide-react';
import { Button } from './ui/Button';
import { useAppStore } from '../store/useAppStore';
import { useImageGeneration, useImageEditing, useBackgroundRemoval } from '../hooks';
import { PromptHints } from './PromptHints';
import { createAsset, createProject } from '../utils/assetUtils';
import { generateId } from '../utils/imageUtils';
import type { Generation } from '../types';
import {
  ModeSelector,
  ImageUploader,
  PromptInput,
  AdvancedSettings,
  AIChannelSelector,
} from './promptComposerParts';

type ToolId = 'generate' | 'edit' | 'mask' | 'background';

export const PromptComposer: React.FC = () => {
  const { t } = useTranslation();
  const {
    currentPrompt,
    setCurrentPrompt,
    selectedTool,
    setSelectedTool,
    temperature,
    setTemperature,
    seed,
    setSeed,
    isGenerating,
    setIsGenerating,
    uploadedImages,
    addUploadedImage,
    removeUploadedImage,
    clearUploadedImages,
    editReferenceImages,
    addEditReferenceImage,
    removeEditReferenceImage,
    clearEditReferenceImages,
    canvasImage,
    setCanvasImage,
    showPromptPanel,
    setShowPromptPanel,
    clearBrushStrokes,
    aiProvider,
    setAIProvider,
    aiModel,
    setAIModel,
    currentProject,
    addGeneration,
    selectGeneration,
    selectEdit,
  } = useAppStore();

  const { generate } = useImageGeneration();
  const { edit } = useImageEditing();
  const [showHintsModal, setShowHintsModal] = useState(false);

  // 背景移除成功后的回调 - 保存结果到 generations
  const handleBgRemovalSuccess = useCallback(
    async (result: { originalUrl: string; processedUrl: string; blob: Blob }) => {
      // 从 base64 URL 提取数据
      const extractBase64 = (url: string): string => {
        if (url.includes('base64,')) {
          return url.split('base64,')[1];
        }
        return url;
      };

      // 将 Blob 转换为 base64 字符串
      const blobToBase64 = async (blob: Blob): Promise<string> => {
        return new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onloadend = () => {
            const result = reader.result as string;
            if (result.includes('base64,')) {
              resolve(result.split('base64,')[1]);
            } else {
              resolve(result);
            }
          };
          reader.onerror = reject;
          reader.readAsDataURL(blob);
        });
      };

      // 获取输出的 base64
      let outputBase64: string;
      if (result.processedUrl.startsWith('blob:')) {
        // 如果是 blob URL，使用 blob 转换
        outputBase64 = await blobToBase64(result.blob);
      } else {
        // 否则直接提取 base64
        outputBase64 = extractBase64(result.processedUrl);
      }

      // 创建资源对象
      const sourceAsset = createAsset(extractBase64(result.originalUrl), 'original');
      const outputAsset = createAsset(outputBase64, 'output');

      // 创建 Generation 记录
      const generation: Generation = {
        id: generateId(),
        prompt: t('backgroundRemoval.generationPrompt', 'Background Removal'),
        parameters: {},
        sourceAssets: [sourceAsset],
        outputAssets: [outputAsset],
        modelVersion: '@imgly/background-removal',
        timestamp: Date.now(),
      };

      // 保存到项目
      if (currentProject) {
        addGeneration(generation);
      } else {
        // 如果没有当前项目，创建一个新项目
        const newProject = createProject({
          generations: [generation],
          edits: [],
        });
        useAppStore.getState().setCurrentProject(newProject);
      }

      // 选中新生成的结果
      selectGeneration(generation.id);
      selectEdit(null);
    },
    [currentProject, addGeneration, selectGeneration, selectEdit, t]
  );

  const {
    progress: bgProgress,
    isIdle: isBgIdle,
    isLoading: isBgLoading,
    isProcessing: isBgProcessing,
    isCompleted: isBgCompleted,
    progressPercentage: bgProgressPercentage,
    removeBackground,
    reset: resetBgRemoval,
  } = useBackgroundRemoval({
    showToast: true,
    onSuccess: handleBgRemovalSuccess,
  });

  const handleGenerate = () => {
    if (!currentPrompt.trim()) {
      return;
    }

    if (selectedTool === 'generate') {
      const referenceImages = uploadedImages
        .filter((image) => image.includes('base64,'))
        .map((image) => image.split('base64,')[1]);

      generate({
        prompt: currentPrompt,
        referenceImages: referenceImages.length > 0 ? referenceImages : undefined,
        temperature,
        seed: seed ?? undefined,
      });
      return;
    }

    edit(currentPrompt);
  };

  // 处理背景移除
  const handleRemoveBackground = async () => {
    if (!canvasImage) return;

    setIsGenerating(true);
    try {
      // 从 canvasImage 创建 File 并处理
      const response = await fetch(canvasImage);
      const blob = await response.blob();
      const file = new File([blob], 'image.png', { type: blob.type });
      await removeBackground(file);
    } catch (error) {
      console.error('Background removal failed:', error);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleClearSession = () => {
    setCurrentPrompt('');
    clearUploadedImages();
    clearEditReferenceImages();
    clearBrushStrokes();
    setCanvasImage(null);
    setSeed(null);
    setTemperature(0.7);
    resetBgRemoval();
  };

  if (!showPromptPanel) {
    return (
      <div className="w-8 bg-gray-950 border-r border-gray-800 flex flex-col items-center justify-center">
        <button
          onClick={() => setShowPromptPanel(true)}
          className="w-6 h-16 bg-gray-800 hover:bg-gray-700 rounded-r-lg border border-l-0 border-gray-700 flex items-center justify-center transition-colors group"
          title={t('promptComposer.showPromptPanel')}
        >
          <div className="flex flex-col space-y-1">
            <div className="w-1 h-1 bg-gray-500 group-hover:bg-gray-400 rounded-full" />
            <div className="w-1 h-1 bg-gray-500 group-hover:bg-gray-400 rounded-full" />
            <div className="w-1 h-1 bg-gray-500 group-hover:bg-gray-400 rounded-full" />
          </div>
        </button>
      </div>
    );
  }

  return (
    <>
      <div className="w-80 lg:w-72 xl:w-80 h-full bg-gray-950 border-r border-gray-800 p-6 flex flex-col space-y-6 overflow-y-auto">
        {/* AI 渠道选择 */}
        <AIChannelSelector
          aiProvider={aiProvider}
          aiModel={aiModel}
          onProviderChange={setAIProvider}
          onModelChange={setAIModel}
        />

        {/* 模式选择器 */}
        <ModeSelector
          selectedTool={selectedTool as ToolId}
          onToolChange={(tool) => {
            setSelectedTool(tool);
            if (tool !== 'background') {
              resetBgRemoval();
            }
          }}
          onHelpClick={() => setShowHintsModal(true)}
          onHidePanel={() => setShowPromptPanel(false)}
        />

        {/* 图片上传 - 所有模式都使用 */}
        <ImageUploader
          selectedTool={selectedTool as ToolId}
          uploadedImages={uploadedImages}
          editReferenceImages={editReferenceImages}
          canvasImage={canvasImage}
          onAddUploadedImage={addUploadedImage}
          onRemoveUploadedImage={removeUploadedImage}
          onAddEditReferenceImage={addEditReferenceImage}
          onRemoveEditReferenceImage={removeEditReferenceImage}
          onSetCanvasImage={setCanvasImage}
          onClearUploadedImages={clearUploadedImages}
        />

        {/* 背景移除按钮和进度 */}
        {selectedTool === 'background' && (
          <div className="space-y-4">
            {/* 进度条 */}
            {(isBgLoading || isBgProcessing) && bgProgress && (
              <div className="space-y-2">
                <div className="flex justify-between text-sm text-gray-400">
                  <span>{t('backgroundRemoval.processing', 'Processing...')}</span>
                  <span>{bgProgressPercentage}%</span>
                </div>
                <div className="w-full h-2 bg-gray-700 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-yellow-400 transition-all duration-300"
                    style={{ width: `${bgProgressPercentage}%` }}
                  />
                </div>
              </div>
            )}

            {/* 移除背景按钮 */}
            <Button
              onClick={handleRemoveBackground}
              disabled={isBgLoading || isBgProcessing || !canvasImage}
              className="w-full h-14 text-base font-medium"
            >
              {isBgLoading || isBgProcessing ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-900 mr-2" />
                  {t('backgroundRemoval.processing', 'Processing...')}
                </>
              ) : (
                <>
                  <Eraser className="h-4 w-4 mr-2" />
                  {t('backgroundRemoval.start', 'Remove Background')}
                </>
              )}
            </Button>

            {/* 处理新图片按钮 */}
            {isBgCompleted && (
              <Button
                variant="outline"
                onClick={() => {
                  resetBgRemoval();
                  setCanvasImage(null);
                }}
                className="w-full"
              >
                {t('backgroundRemoval.newImage', 'Process New Image')}
              </Button>
            )}
          </div>
        )}

        {/* 非背景移除模式的 UI */}
        {selectedTool !== 'background' && (
          <>
            {/* 提示词输入 */}
            <PromptInput
              selectedTool={selectedTool as ToolId}
              currentPrompt={currentPrompt}
              onPromptChange={setCurrentPrompt}
              onHelpClick={() => setShowHintsModal(true)}
            />

            {/* 生成按钮 */}
            <Button
              onClick={handleGenerate}
              disabled={isGenerating || !currentPrompt.trim()}
              className="w-full h-14 text-base font-medium"
            >
              {isGenerating ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-900 mr-2" />
                  {t('promptComposer.generating')}
                </>
              ) : (
                <>
                  <Wand2 className="h-4 w-4 mr-2" />
                  {selectedTool === 'generate' ? t('promptComposer.generate') : t('promptComposer.applyEdit')}
                </>
              )}
            </Button>

            {/* 高级设置 */}
            <AdvancedSettings
              temperature={temperature}
              seed={seed}
              onTemperatureChange={setTemperature}
              onSeedChange={setSeed}
              onClearSession={handleClearSession}
            />
          </>
        )}

        {/* 快捷键提示 */}
        <div className="pt-4 border-t border-gray-800">
          <h4 className="text-xs font-medium text-gray-400 mb-2">{t('promptComposer.shortcuts')}</h4>
          <div className="space-y-1 text-xs text-gray-500">
            <div className="flex justify-between">
              <span>{t('promptComposer.shortcutGenerate')}</span>
              <span>Ctrl or Cmd + Enter</span>
            </div>
            <div className="flex justify-between">
              <span>{t('promptComposer.shortcutReroll')}</span>
              <span>Shift + R</span>
            </div>
            <div className="flex justify-between">
              <span>{t('promptComposer.shortcutEditMode')}</span>
              <span>E</span>
            </div>
            <div className="flex justify-between">
              <span>{t('promptComposer.shortcutHistory')}</span>
              <span>H</span>
            </div>
            <div className="flex justify-between">
              <span>{t('promptComposer.shortcutTogglePanel')}</span>
              <span>P</span>
            </div>
          </div>
        </div>
      </div>

      <PromptHints open={showHintsModal} onOpenChange={setShowHintsModal} />
    </>
  );
};
