/**
 * 视差背景生成面板组件
 *
 * ParallaxBackgroundPanel 功能:
 *   ├─> 选择背景风格
 *   ├─> 选择时间
 *   ├─> 生成3层视差背景
 *   ├─> 预览各层
 *   └─> 重新生成单层
 */

import React, { useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Mountain, Building2, Trees, RefreshCw, Download, Eye } from 'lucide-react';
import { Button } from '../ui/Button';
import { cn } from '../../utils/cn';
import {
  type ParallaxBackgroundLayers,
  type ParallaxBackgroundConfig,
  BACKGROUND_STYLE_PROMPTS,
  TIME_OF_DAY_PROMPTS,
  PARALLAX_SPEEDS,
  ParallaxBackgroundGenerator,
} from '../../services/sprite/parallaxBackground';

interface ParallaxBackgroundPanelProps {
  characterDescription: string;
  generateImage: (prompt: string) => Promise<string[]>;
  onLayersGenerated?: (layers: ParallaxBackgroundLayers) => void;
  className?: string;
}

const STYLE_OPTIONS = [
  { id: 'fantasy', name: 'Fantasy', nameZh: '奇幻' },
  { id: 'scifi', name: 'Sci-Fi', nameZh: '科幻' },
  { id: 'nature', name: 'Nature', nameZh: '自然' },
  { id: 'urban', name: 'Urban', nameZh: '都市' },
  { id: 'dungeon', name: 'Dungeon', nameZh: '地牢' },
] as const;

const TIME_OPTIONS = [
  { id: 'day', name: 'Day', nameZh: '白天' },
  { id: 'sunset', name: 'Sunset', nameZh: '黄昏' },
  { id: 'night', name: 'Night', nameZh: '夜晚' },
] as const;

export const ParallaxBackgroundPanel: React.FC<ParallaxBackgroundPanelProps> = ({
  characterDescription,
  generateImage,
  onLayersGenerated,
  className,
}) => {
  const { t, i18n } = useTranslation();
  const isZh = i18n.language === 'zh';

  const [style, setStyle] = useState<ParallaxBackgroundConfig['style']>('fantasy');
  const [timeOfDay, setTimeOfDay] = useState<ParallaxBackgroundConfig['timeOfDay']>('day');
  const [layers, setLayers] = useState<ParallaxBackgroundLayers>({
    layer1Url: null,
    layer2Url: null,
    layer3Url: null,
  });
  const [generatingLayer, setGeneratingLayer] = useState<number | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [previewMode, setPreviewMode] = useState<'separate' | 'combined'>('separate');

  // 生成所有层
  const handleGenerateAll = useCallback(async () => {
    setIsGenerating(true);
    setGeneratingLayer(0);

    const generator = new ParallaxBackgroundGenerator(generateImage);

    const config: ParallaxBackgroundConfig = {
      characterDescription,
      style,
      timeOfDay,
    };

    const newLayers = await generator.generateAllLayers(config, (layer, status) => {
      if (status === 'generating') {
        setGeneratingLayer(layer);
      }
    });

    setLayers(newLayers);
    setIsGenerating(false);
    setGeneratingLayer(null);
    onLayersGenerated?.(newLayers);
  }, [characterDescription, style, timeOfDay, generateImage, onLayersGenerated]);

  // 重新生成单层
  const handleRegenerateLayer = useCallback(
    async (layerNumber: 1 | 2 | 3) => {
      setGeneratingLayer(layerNumber);

      const generator = new ParallaxBackgroundGenerator(generateImage);

      const config: ParallaxBackgroundConfig = {
        characterDescription,
        style,
        timeOfDay,
      };

      const newUrl = await generator.regenerateLayer(layerNumber, config);

      if (newUrl) {
        const newLayers = { ...layers };
        if (layerNumber === 1) newLayers.layer1Url = newUrl;
        else if (layerNumber === 2) newLayers.layer2Url = newUrl;
        else newLayers.layer3Url = newUrl;

        setLayers(newLayers);
        onLayersGenerated?.(newLayers);
      }

      setGeneratingLayer(null);
    },
    [characterDescription, style, timeOfDay, layers, generateImage, onLayersGenerated]
  );

  // 下载层图片
  const handleDownloadLayer = useCallback((layerUrl: string, layerNumber: number) => {
    const link = document.createElement('a');
    link.download = `parallax-layer-${layerNumber}.png`;
    link.href = layerUrl;
    link.click();
  }, []);

  // Layer 图标和颜色
  const layerStyles = [
    { icon: Mountain, label: 'Layer 1 - Far', labelZh: '层1 - 远景', color: 'text-blue-400', speed: PARALLAX_SPEEDS.layer1 },
    { icon: Building2, label: 'Layer 2 - Mid', labelZh: '层2 - 中景', color: 'text-purple-400', speed: PARALLAX_SPEEDS.layer2 },
    { icon: Trees, label: 'Layer 3 - Near', labelZh: '层3 - 近景', color: 'text-green-400', speed: PARALLAX_SPEEDS.layer3 },
  ];

  return (
    <div className={cn('space-y-4', className)}>
      {/* 风格选择 */}
      <div>
        <h4 className="text-sm font-medium text-gray-300 mb-2">
          {t('sprite.background.style', 'Background Style')}
        </h4>
        <div className="grid grid-cols-5 gap-1">
          {STYLE_OPTIONS.map((option) => (
            <button
              key={option.id}
              onClick={() => setStyle(option.id as typeof style)}
              className={cn(
                'px-2 py-1.5 rounded text-xs transition-colors',
                style === option.id
                  ? 'bg-yellow-500 text-gray-900'
                  : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
              )}
            >
              {isZh ? option.nameZh : option.name}
            </button>
          ))}
        </div>
      </div>

      {/* 时间选择 */}
      <div>
        <h4 className="text-sm font-medium text-gray-300 mb-2">
          {t('sprite.background.timeOfDay', 'Time of Day')}
        </h4>
        <div className="grid grid-cols-3 gap-1">
          {TIME_OPTIONS.map((option) => (
            <button
              key={option.id}
              onClick={() => setTimeOfDay(option.id as typeof timeOfDay)}
              className={cn(
                'px-2 py-1.5 rounded text-xs transition-colors',
                timeOfDay === option.id
                  ? 'bg-yellow-500 text-gray-900'
                  : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
              )}
            >
              {isZh ? option.nameZh : option.name}
            </button>
          ))}
        </div>
      </div>

      {/* 生成按钮 */}
      <Button
        onClick={handleGenerateAll}
        disabled={isGenerating || !characterDescription}
        className="w-full"
      >
        {isGenerating ? (
          <>
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-900 mr-2" />
            {t('sprite.background.generating', 'Generating Layer')} {generatingLayer}...
          </>
        ) : (
          <>
            <Mountain className="w-4 h-4 mr-2" />
            {t('sprite.background.generateAll', 'Generate 3-Layer Background')}
          </>
        )}
      </Button>

      {/* 层预览 */}
      {layers.layer1Url && (
        <div className="space-y-3">
          {/* 预览模式切换 */}
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-medium text-gray-300">
              {t('sprite.background.preview', 'Preview')}
            </h4>
            <div className="flex space-x-1">
              <Button
                variant={previewMode === 'separate' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setPreviewMode('separate')}
              >
                {t('sprite.background.separate', 'Separate')}
              </Button>
              <Button
                variant={previewMode === 'combined' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setPreviewMode('combined')}
              >
                <Eye className="w-3 h-3 mr-1" />
                {t('sprite.background.combined', 'Combined')}
              </Button>
            </div>
          </div>

          {previewMode === 'separate' ? (
            // 分层预览
            <div className="space-y-2">
              {[layers.layer1Url, layers.layer2Url, layers.layer3Url].map((layerUrl, index) => {
                const layerStyle = layerStyles[index];
                const layerNum = (index + 1) as 1 | 2 | 3;

                return (
                  <div key={index} className="bg-gray-800 rounded-lg border border-gray-700 p-2">
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center space-x-2">
                        <layerStyle.icon className={cn('w-4 h-4', layerStyle.color)} />
                        <span className="text-xs font-medium text-gray-300">
                          {isZh ? layerStyle.labelZh : layerStyle.label}
                        </span>
                        <span className="text-xs text-gray-500">
                          ({t('sprite.background.speed', 'Speed')}: {layerStyle.speed})
                        </span>
                      </div>
                      <div className="flex items-center space-x-1">
                        {layerUrl && (
                          <>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleRegenerateLayer(layerNum)}
                              disabled={generatingLayer !== null}
                              className="h-6 px-2"
                            >
                              <RefreshCw
                                className={cn(
                                  'w-3 h-3',
                                  generatingLayer === layerNum && 'animate-spin'
                                )}
                              />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDownloadLayer(layerUrl, layerNum)}
                              className="h-6 px-2"
                            >
                              <Download className="w-3 h-3" />
                            </Button>
                          </>
                        )}
                      </div>
                    </div>
                    {layerUrl ? (
                      <img
                        src={layerUrl}
                        alt={`Layer ${layerNum}`}
                        className="w-full h-20 object-cover rounded"
                        style={{ imageRendering: 'pixelated' }}
                      />
                    ) : (
                      <div className="w-full h-20 bg-gray-900 rounded flex items-center justify-center text-xs text-gray-500">
                        {t('sprite.background.notGenerated', 'Not generated')}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            // 组合预览
            <div
              className="relative overflow-hidden rounded-lg border border-gray-700"
              style={{ height: 200 }}
            >
              {layers.layer1Url && (
                <img
                  src={layers.layer1Url}
                  alt="Layer 1"
                  className="absolute inset-0 w-full h-full object-cover"
                />
              )}
              {layers.layer2Url && (
                <img
                  src={layers.layer2Url}
                  alt="Layer 2"
                  className="absolute inset-0 w-full h-full object-cover"
                  style={{ opacity: 0.9 }}
                />
              )}
              {layers.layer3Url && (
                <img
                  src={layers.layer3Url}
                  alt="Layer 3"
                  className="absolute inset-0 w-full h-full object-cover"
                  style={{ opacity: 0.95 }}
                />
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
