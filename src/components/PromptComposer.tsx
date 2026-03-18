/**
 * 提示词编辑器主组件
 *
 * PromptComposer 组合子组件:
 *   ├─> AIChannelSelector    AI 渠道选择器
 *   ├─> ModeSelector         模式选择器
 *   ├─> ImageUploader        图片上传组件
 *   ├─> PromptInput          提示词输入组件
 *   ├─> AdvancedSettings     高级设置组件
 *   └─> BackgroundRemovalPanel 背景移除面板
 */

import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Wand2 } from 'lucide-react';
import { Button } from './ui/Button';
import { useAppStore } from '../store/useAppStore';
import { useImageGeneration, useImageEditing } from '../hooks';
import { PromptHints } from './PromptHints';
import { BackgroundRemovalPanel } from './backgroundRemoval';
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
  } = useAppStore();

  const { generate } = useImageGeneration();
  const { edit } = useImageEditing();
  const [showHintsModal, setShowHintsModal] = useState(false);

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

  const handleClearSession = () => {
    setCurrentPrompt('');
    clearUploadedImages();
    clearEditReferenceImages();
    clearBrushStrokes();
    setCanvasImage(null);
    setSeed(null);
    setTemperature(0.7);
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
          onToolChange={(tool) => setSelectedTool(tool)}
          onHelpClick={() => setShowHintsModal(true)}
          onHidePanel={() => setShowPromptPanel(false)}
        />

        {/* 背景移除模式 */}
        {selectedTool === 'background' ? (
          <BackgroundRemovalPanel />
        ) : (
          <>
            {/* 图片上传 */}
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
