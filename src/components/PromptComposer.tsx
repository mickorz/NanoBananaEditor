import React, { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Upload,
  Wand2,
  Edit3,
  MousePointer,
  HelpCircle,
  ChevronDown,
  ChevronRight,
  RotateCcw,
} from 'lucide-react';
import { Textarea } from './ui/Textarea';
import { Button } from './ui/Button';
import { useAppStore } from '../store/useAppStore';
import { useImageGeneration, useImageEditing } from '../hooks/useImageGeneration';
import { blobToBase64 } from '../utils/imageUtils';
import { PromptHints } from './PromptHints';
import { cn } from '../utils/cn';
import { getAvailableProviders } from '../services/aiServiceFactory';

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
  } = useAppStore();

  const { generate } = useImageGeneration();
  const { edit } = useImageEditing();
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [showHintsModal, setShowHintsModal] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const tools = [
    { id: 'generate', icon: Wand2, label: t('promptComposer.tools.generate'), description: t('promptComposer.tools.generateDesc') },
    { id: 'edit', icon: Edit3, label: t('promptComposer.tools.edit'), description: t('promptComposer.tools.editDesc') },
    { id: 'mask', icon: MousePointer, label: t('promptComposer.tools.mask'), description: t('promptComposer.tools.maskDesc') },
  ] as const;

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

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !file.type.startsWith('image/')) {
      event.target.value = '';
      return;
    }

    try {
      const base64 = await blobToBase64(file);
      const dataUrl = `data:${file.type};base64,${base64}`;

      if (selectedTool === 'generate') {
        if (uploadedImages.length < 2) {
          addUploadedImage(dataUrl);
        }
      } else if (selectedTool === 'edit') {
        if (!canvasImage) {
          setCanvasImage(dataUrl);
        } else if (editReferenceImages.length < 2) {
          addEditReferenceImage(dataUrl);
        }
      } else {
        clearUploadedImages();
        addUploadedImage(dataUrl);
        setCanvasImage(dataUrl);
      }
    } catch (error) {
      console.error('Failed to upload image:', error);
    } finally {
      event.target.value = '';
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
    setShowClearConfirm(false);
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
        <div>
          <label className="text-sm font-medium text-gray-300 mb-2 block">{t('promptComposer.aiChannel')}</label>
          <select
            value={aiProvider}
            onChange={(e) => setAIProvider(e.target.value as 'gemini' | 'ai-studio')}
            className="w-full h-10 px-3 bg-gray-900 border border-gray-700 rounded-lg text-sm text-gray-100 focus:outline-none focus:ring-2 focus:ring-yellow-400/50 focus:border-yellow-400/50"
          >
            {getAvailableProviders().map((provider) => (
              <option key={provider.id} value={provider.id}>
                {provider.name}
              </option>
            ))}
          </select>
          <p className="text-xs text-gray-500 mt-1">
            {getAvailableProviders().find((p) => p.id === aiProvider)?.description}
          </p>
        </div>

        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-medium text-gray-300">{t('promptComposer.mode')}</h3>
            <div className="flex items-center space-x-1">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setShowHintsModal(true)}
                className="h-6 w-6"
              >
                <HelpCircle className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setShowPromptPanel(false)}
                className="h-6 w-6"
                title={t('promptComposer.hidePromptPanel')}
              >
                x
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2">
            {tools.map((tool) => (
              <button
                key={tool.id}
                onClick={() => setSelectedTool(tool.id as 'generate' | 'edit' | 'mask')}
                title={tool.description}
                className={cn(
                  'flex flex-col items-center p-3 rounded-lg border transition-all duration-200',
                  selectedTool === tool.id
                    ? 'bg-yellow-400/10 border-yellow-400/50 text-yellow-400'
                    : 'bg-gray-900 border-gray-700 text-gray-400 hover:bg-gray-800 hover:text-gray-300'
                )}
              >
                <tool.icon className="h-5 w-5 mb-1" />
                <span className="text-xs font-medium">{tool.label}</span>
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="text-sm font-medium text-gray-300 mb-1 block">
            {selectedTool === 'generate'
              ? t('promptComposer.referenceImages')
              : selectedTool === 'edit'
                ? t('promptComposer.editImage')
                : t('promptComposer.uploadImage')}
          </label>

          {selectedTool === 'mask' && (
            <p className="text-xs text-gray-400 mb-3">{t('promptComposer.maskHint')}</p>
          )}
          {selectedTool === 'generate' && (
            <p className="text-xs text-gray-500 mb-3">{t('promptComposer.generateHint')}</p>
          )}
          {selectedTool === 'edit' && (
            <p className="text-xs text-gray-500 mb-3">
              {canvasImage
                ? t('promptComposer.editHintWithCanvas')
                : t('promptComposer.editHintNoCanvas')}
            </p>
          )}

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileUpload}
            className="hidden"
          />

          <Button
            variant="outline"
            onClick={() => fileInputRef.current?.click()}
            className="w-full"
            disabled={
              (selectedTool === 'generate' && uploadedImages.length >= 2) ||
              (selectedTool === 'edit' && canvasImage !== null && editReferenceImages.length >= 2)
            }
          >
            <Upload className="h-4 w-4 mr-2" />
            {t('promptComposer.upload')}
          </Button>

          {((selectedTool === 'generate' && uploadedImages.length > 0) ||
            (selectedTool === 'edit' && editReferenceImages.length > 0)) && (
            <div className="mt-3 space-y-2">
              {(selectedTool === 'generate' ? uploadedImages : editReferenceImages).map((image, index) => (
                <div key={index} className="relative">
                  <img
                    src={image}
                    alt={`${t('promptComposer.reference')} ${index + 1}`}
                    className="w-full h-20 object-cover rounded-lg border border-gray-700"
                  />
                  <button
                    onClick={() =>
                      selectedTool === 'generate'
                        ? removeUploadedImage(index)
                        : removeEditReferenceImage(index)
                    }
                    className="absolute top-1 right-1 bg-gray-900/80 text-gray-400 hover:text-gray-200 rounded-full p-1 transition-colors"
                  >
                    x
                  </button>
                  <div className="absolute bottom-1 left-1 bg-gray-900/80 text-xs px-2 py-1 rounded text-gray-300">
                    {t('promptComposer.reference')} {index + 1}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div>
          <label className="text-sm font-medium text-gray-300 mb-3 block">
            {selectedTool === 'generate' ? t('promptComposer.describeGenerate') : t('promptComposer.describeEdit')}
          </label>
          <Textarea
            value={currentPrompt}
            onChange={(e) => setCurrentPrompt(e.target.value)}
            placeholder={
              selectedTool === 'generate'
                ? t('promptComposer.placeholderGenerate')
                : t('promptComposer.placeholderEdit')
            }
            className="min-h-[120px] resize-none"
          />

          <button
            onClick={() => setShowHintsModal(true)}
            className="mt-2 flex items-center text-xs hover:text-gray-400 transition-colors group"
          >
            {currentPrompt.length < 20 ? (
              <HelpCircle className="h-3 w-3 mr-2 text-red-500 group-hover:text-red-400" />
            ) : (
              <div
                className={cn(
                  'h-2 w-2 rounded-full mr-2',
                  currentPrompt.length < 50 ? 'bg-yellow-500' : 'bg-green-500'
                )}
              />
            )}
            <span className="text-gray-500 group-hover:text-gray-400">
              {currentPrompt.length < 20
                ? t('promptComposer.promptTooShort')
                : currentPrompt.length < 50
                  ? t('promptComposer.promptGood')
                  : t('promptComposer.promptExcellent')}
            </span>
          </button>
        </div>

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

        <div>
          <button
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="flex items-center text-sm text-gray-400 hover:text-gray-300 transition-colors duration-200"
          >
            {showAdvanced ? <ChevronDown className="h-4 w-4 mr-1" /> : <ChevronRight className="h-4 w-4 mr-1" />}
            {showAdvanced ? t('promptComposer.hideAdvanced') : t('promptComposer.showAdvanced')}
          </button>

          <button
            onClick={() => setShowClearConfirm(!showClearConfirm)}
            className="flex items-center text-sm text-gray-400 hover:text-red-400 transition-colors duration-200 mt-2"
          >
            <RotateCcw className="h-4 w-4 mr-2" />
            {t('promptComposer.clearSession')}
          </button>

          {showClearConfirm && (
            <div className="mt-3 p-3 bg-gray-800 rounded-lg border border-gray-700">
              <p className="text-xs text-gray-300 mb-3">
                {t('promptComposer.clearConfirmText')}
              </p>
              <div className="flex space-x-2">
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={handleClearSession}
                  className="flex-1"
                >
                  {t('promptComposer.yesClear')}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowClearConfirm(false)}
                  className="flex-1"
                >
                  {t('promptComposer.cancel')}
                </Button>
              </div>
            </div>
          )}

          {showAdvanced && (
            <div className="mt-4 space-y-4">
              <div>
                <label className="text-xs text-gray-400 mb-2 block">{t('promptComposer.creativity')} ({temperature})</label>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.1"
                  value={temperature}
                  onChange={(e) => setTemperature(parseFloat(e.target.value))}
                  className="w-full h-2 bg-gray-800 rounded-lg appearance-none cursor-pointer slider"
                />
              </div>

              <div>
                <label className="text-xs text-gray-400 mb-2 block">{t('promptComposer.seed')}</label>
                <input
                  type="number"
                  value={seed ?? ''}
                  onChange={(e) => setSeed(e.target.value ? parseInt(e.target.value, 10) : null)}
                  placeholder={t('promptComposer.seedPlaceholder')}
                  className="w-full h-8 px-2 bg-gray-900 border border-gray-700 rounded text-xs text-gray-100"
                />
              </div>
            </div>
          )}
        </div>

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
