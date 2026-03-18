/**
 * 精灵图生成面板组件
 *
 * SpriteGenerationPanel 功能:
 *   ├─> 角色描述输入
 *   ├─> 动画类型选择
 *   ├─> 方向选择
 *   ├─> 风格预设选择
 *   ├─> 生成控制
 *   └─> 结果预览
 */

import React, { useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Wand2, RefreshCw, Download, ChevronDown, ChevronUp } from 'lucide-react';
import { Button } from '../ui/Button';
import { cn } from '../../utils/cn';
import { WorkflowStepper, type WorkflowStep } from './WorkflowStepper';
import { SpritePreview } from './SpritePreview';
import { AnimationPlayer } from './AnimationPlayer';
import { FrameExtractor } from './FrameExtractor';
import {
  ANIMATION_TYPES,
  DIRECTIONS,
  SPRITE_STYLE_PRESETS,
  type SpriteAnimationType,
  type SpriteDirection,
} from '../../constants/spritePrompts';
import { extractFrames, canvasToBase64, downloadSpriteSheet } from '../../utils/spriteUtils';

interface SpriteGenerationPanelProps {
  onGenerate: (config: SpriteGenerationConfig) => void;
  isGenerating?: boolean;
  generatedImageUrl?: string;
  className?: string;
}

export interface SpriteGenerationConfig {
  characterDescription: string;
  animationType: SpriteAnimationType;
  direction: SpriteDirection;
  stylePreset: string;
  frameCount: number;
}

// 工作流步骤定义
const WORKFLOW_STEPS: WorkflowStep[] = [
  {
    id: 'character',
    title: 'Character',
    titleZh: '角色描述',
    description: 'Describe your character',
    descriptionZh: '描述你的角色',
    status: 'active',
  },
  {
    id: 'settings',
    title: 'Settings',
    titleZh: '生成设置',
    description: 'Animation and style',
    descriptionZh: '动画类型和风格',
    status: 'pending',
  },
  {
    id: 'generate',
    title: 'Generate',
    titleZh: '生成',
    description: 'Create sprite sheet',
    descriptionZh: '创建精灵图',
    status: 'pending',
  },
  {
    id: 'preview',
    title: 'Preview',
    titleZh: '预览',
    description: 'Review and export',
    descriptionZh: '预览并导出',
    status: 'pending',
  },
];

export const SpriteGenerationPanel: React.FC<SpriteGenerationPanelProps> = ({
  onGenerate,
  isGenerating = false,
  generatedImageUrl,
  className,
}) => {
  const { t, i18n } = useTranslation();
  const isZh = i18n.language === 'zh';

  // 状态
  const [currentStep, setCurrentStep] = useState(0);
  const [characterDescription, setCharacterDescription] = useState('');
  const [animationType, setAnimationType] = useState<SpriteAnimationType>('idle');
  const [direction, setDirection] = useState<SpriteDirection>('front');
  const [stylePreset, setStylePreset] = useState(SPRITE_STYLE_PRESETS[1].id); // 默认 32x32
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [frameWidth, setFrameWidth] = useState(64);
  const [frameHeight, setFrameHeight] = useState(64);
  const [frameCount, setFrameCount] = useState(4);
  const [extractedFrames, setExtractedFrames] = useState<string[]>([]);

  // 获取当前风格预设
  const currentPreset = SPRITE_STYLE_PRESETS.find((p) => p.id === stylePreset);

  // 获取当前动画类型的帧数
  const currentAnimationType = ANIMATION_TYPES.find((a) => a.id === animationType);
  const defaultFrameCount = currentAnimationType?.frameCount || 4;

  // 更新步骤状态
  const getStepsWithStatus = useCallback((): WorkflowStep[] => {
    return WORKFLOW_STEPS.map((step, index) => {
      let status: WorkflowStep['status'] = 'pending';
      if (index < currentStep) {
        status = 'completed';
      } else if (index === currentStep) {
        status = 'active';
      }
      return { ...step, status };
    });
  }, [currentStep]);

  // 处理生成
  const handleGenerate = useCallback(() => {
    const config: SpriteGenerationConfig = {
      characterDescription,
      animationType,
      direction,
      stylePreset: currentPreset?.promptSuffix || '',
      frameCount: defaultFrameCount,
    };

    setCurrentStep(2); // 移动到生成步骤
    onGenerate(config);
  }, [characterDescription, animationType, direction, currentPreset, defaultFrameCount, onGenerate]);

  // 生成完成后处理帧提取
  const handleFramesExtracted = useCallback((frames: string[]) => {
    setExtractedFrames(frames);
    if (frames.length > 0) {
      setCurrentStep(3); // 移动到预览步骤
    }
  }, []);

  // 下载精灵图表
  const handleDownload = useCallback(async () => {
    if (!generatedImageUrl) return;

    const link = document.createElement('a');
    link.download = `sprite-${animationType}-${direction}-${Date.now()}.png`;
    link.href = generatedImageUrl;
    link.click();
  }, [generatedImageUrl, animationType, direction]);

  // 重新开始
  const handleReset = useCallback(() => {
    setCurrentStep(0);
    setCharacterDescription('');
    setExtractedFrames([]);
  }, []);

  return (
    <div className={cn('flex flex-col h-full', className)}>
      {/* 工作流步骤器 */}
      <div className="p-4 border-b border-gray-800">
        <WorkflowStepper
          steps={getStepsWithStatus()}
          currentStep={currentStep}
          allowNavigation={false}
          orientation="horizontal"
        />
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        {/* 步骤 1: 角色描述 */}
        {currentStep === 0 && (
          <div className="space-y-4">
            <h3 className="text-sm font-medium text-gray-300">
              {t('sprite.panel.characterDescription', 'Character Description')}
            </h3>
            <textarea
              value={characterDescription}
              onChange={(e) => setCharacterDescription(e.target.value)}
              placeholder={t(
                'sprite.panel.characterPlaceholder',
                'Describe your character: appearance, clothing, colors, etc.'
              )}
              className="w-full h-32 px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-sm text-white placeholder-gray-500 resize-none focus:border-yellow-500 focus:outline-none"
            />
            <Button
              onClick={() => setCurrentStep(1)}
              disabled={!characterDescription.trim()}
              className="w-full"
            >
              {t('sprite.panel.next', 'Next')}
            </Button>
          </div>
        )}

        {/* 步骤 2: 设置 */}
        {currentStep === 1 && (
          <div className="space-y-4">
            {/* 动画类型选择 */}
            <div>
              <h4 className="text-sm font-medium text-gray-300 mb-2">
                {t('sprite.panel.animationType', 'Animation Type')}
              </h4>
              <div className="grid grid-cols-2 gap-2">
                {ANIMATION_TYPES.map((type) => (
                  <button
                    key={type.id}
                    onClick={() => {
                      setAnimationType(type.id);
                      setFrameCount(type.frameCount);
                    }}
                    className={cn(
                      'px-3 py-2 rounded-lg border text-sm transition-colors',
                      animationType === type.id
                        ? 'bg-yellow-500 border-yellow-500 text-gray-900'
                        : 'bg-gray-800 border-gray-700 text-gray-300 hover:border-gray-600'
                    )}
                  >
                    {isZh ? type.nameZh : type.name}
                  </button>
                ))}
              </div>
            </div>

            {/* 方向选择 */}
            <div>
              <h4 className="text-sm font-medium text-gray-300 mb-2">
                {t('sprite.panel.direction', 'Direction')}
              </h4>
              <div className="grid grid-cols-4 gap-2">
                {DIRECTIONS.map((dir) => (
                  <button
                    key={dir.id}
                    onClick={() => setDirection(dir.id)}
                    className={cn(
                      'px-3 py-2 rounded-lg border text-sm transition-colors',
                      direction === dir.id
                        ? 'bg-yellow-500 border-yellow-500 text-gray-900'
                        : 'bg-gray-800 border-gray-700 text-gray-300 hover:border-gray-600'
                    )}
                  >
                    {isZh ? dir.nameZh : dir.name}
                  </button>
                ))}
              </div>
            </div>

            {/* 风格预设选择 */}
            <div>
              <h4 className="text-sm font-medium text-gray-300 mb-2">
                {t('sprite.panel.stylePreset', 'Style Preset')}
              </h4>
              <div className="grid grid-cols-2 gap-2">
                {SPRITE_STYLE_PRESETS.map((preset) => (
                  <button
                    key={preset.id}
                    onClick={() => {
                      setStylePreset(preset.id);
                      setFrameWidth(preset.frameSize);
                      setFrameHeight(preset.frameSize);
                    }}
                    className={cn(
                      'px-3 py-2 rounded-lg border text-sm transition-colors',
                      stylePreset === preset.id
                        ? 'bg-yellow-500 border-yellow-500 text-gray-900'
                        : 'bg-gray-800 border-gray-700 text-gray-300 hover:border-gray-600'
                    )}
                  >
                    {isZh ? preset.nameZh : preset.name}
                  </button>
                ))}
              </div>
            </div>

            {/* 高级设置 */}
            <div>
              <button
                onClick={() => setShowAdvanced(!showAdvanced)}
                className="flex items-center space-x-1 text-sm text-gray-400 hover:text-gray-300"
              >
                {showAdvanced ? (
                  <ChevronUp className="w-4 h-4" />
                ) : (
                  <ChevronDown className="w-4 h-4" />
                )}
                <span>{t('sprite.panel.advancedSettings', 'Advanced Settings')}</span>
              </button>

              {showAdvanced && (
                <div className="mt-2 p-3 bg-gray-800 rounded-lg border border-gray-700 space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs text-gray-400 block mb-1">
                        {t('sprite.panel.frameWidth', 'Frame Width')}
                      </label>
                      <input
                        type="number"
                        value={frameWidth}
                        onChange={(e) => setFrameWidth(parseInt(e.target.value) || 64)}
                        className="w-full px-2 py-1 bg-gray-700 border border-gray-600 rounded text-sm text-white"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-gray-400 block mb-1">
                        {t('sprite.panel.frameHeight', 'Frame Height')}
                      </label>
                      <input
                        type="number"
                        value={frameHeight}
                        onChange={(e) => setFrameHeight(parseInt(e.target.value) || 64)}
                        className="w-full px-2 py-1 bg-gray-700 border border-gray-600 rounded text-sm text-white"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="text-xs text-gray-400 block mb-1">
                      {t('sprite.panel.frameCount', 'Frame Count')}
                    </label>
                    <input
                      type="number"
                      value={frameCount}
                      onChange={(e) => setFrameCount(parseInt(e.target.value) || 4)}
                      min={1}
                      max={12}
                      className="w-full px-2 py-1 bg-gray-700 border border-gray-600 rounded text-sm text-white"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* 操作按钮 */}
            <div className="flex space-x-2">
              <Button
                variant="outline"
                onClick={() => setCurrentStep(0)}
                className="flex-1"
              >
                {t('sprite.panel.back', 'Back')}
              </Button>
              <Button
                onClick={handleGenerate}
                disabled={isGenerating}
                className="flex-1"
              >
                {isGenerating ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-900 mr-2" />
                    {t('sprite.panel.generating', 'Generating...')}
                  </>
                ) : (
                  <>
                    <Wand2 className="w-4 h-4 mr-2" />
                    {t('sprite.panel.generate', 'Generate')}
                  </>
                )}
              </Button>
            </div>
          </div>
        )}

        {/* 步骤 3: 生成中/生成完成 */}
        {currentStep === 2 && (
          <div className="space-y-4">
            {isGenerating ? (
              <div className="flex flex-col items-center justify-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-yellow-400 mb-4" />
                <p className="text-gray-400">
                  {t('sprite.panel.generatingSprite', 'Generating sprite sheet...')}
                </p>
              </div>
            ) : generatedImageUrl ? (
              <div className="space-y-4">
                {/* 精灵图预览 */}
                <SpritePreview
                  imageUrl={generatedImageUrl}
                  frameWidth={frameWidth}
                  frameHeight={frameHeight}
                  frameCount={frameCount}
                  columns={4}
                />

                {/* 帧提取 */}
                <FrameExtractor
                  imageUrl={generatedImageUrl}
                  frameWidth={frameWidth}
                  frameHeight={frameHeight}
                  frameCount={frameCount}
                  columns={4}
                  onFramesExtracted={handleFramesExtracted}
                />

                {/* 操作按钮 */}
                <div className="flex space-x-2">
                  <Button variant="outline" onClick={handleDownload}>
                    <Download className="w-4 h-4 mr-2" />
                    {t('sprite.panel.download', 'Download')}
                  </Button>
                  <Button variant="outline" onClick={handleReset}>
                    <RefreshCw className="w-4 h-4 mr-2" />
                    {t('sprite.panel.startOver', 'Start Over')}
                  </Button>
                </div>
              </div>
            ) : (
              <div className="text-center text-gray-500 py-8">
                {t('sprite.panel.waitingForGeneration', 'Waiting for generation...')}
              </div>
            )}
          </div>
        )}

        {/* 步骤 4: 预览动画 */}
        {currentStep === 3 && extractedFrames.length > 0 && (
          <div className="space-y-4">
            <h3 className="text-sm font-medium text-gray-300">
              {t('sprite.panel.animationPreview', 'Animation Preview')}
            </h3>

            {/* 动画播放器 */}
            <AnimationPlayer
              frames={extractedFrames}
              frameWidth={frameWidth}
              frameHeight={frameHeight}
              autoPlay
              loop
            />

            {/* 操作按钮 */}
            <div className="flex space-x-2">
              <Button variant="outline" onClick={handleDownload}>
                <Download className="w-4 h-4 mr-2" />
                {t('sprite.panel.downloadSheet', 'Download Sprite Sheet')}
              </Button>
              <Button variant="outline" onClick={handleReset}>
                <RefreshCw className="w-4 h-4 mr-2" />
                {t('sprite.panel.newSprite', 'Create New Sprite')}
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
