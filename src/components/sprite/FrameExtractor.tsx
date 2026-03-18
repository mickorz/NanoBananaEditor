/**
 * 帧提取器组件
 *
 * FrameExtractor 功能:
 *   ├─> 从精灵图表提取帧
 *   ├─> 预览提取的帧
 *   ├─> 调整帧参数
 *   └─> 导出单个帧
 */

import React, { useState, useCallback, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Scissors, Download, Settings2 } from 'lucide-react';
import { Button } from '../ui/Button';
import { cn } from '../../utils/cn';
import { extractFrames, canvasToBase64 } from '../../utils/spriteUtils';

interface FrameExtractorProps {
  imageUrl: string;
  onFramesExtracted: (frames: string[]) => void;
  initialFrameWidth?: number;
  initialFrameHeight?: number;
  initialFrameCount?: number;
  initialColumns?: number;
  className?: string;
}

export const FrameExtractor: React.FC<FrameExtractorProps> = ({
  imageUrl,
  onFramesExtracted,
  initialFrameWidth = 64,
  initialFrameHeight = 64,
  initialFrameCount = 4,
  initialColumns = 4,
  className,
}) => {
  const { t } = useTranslation();
  const [frameWidth, setFrameWidth] = useState(initialFrameWidth);
  const [frameHeight, setFrameHeight] = useState(initialFrameHeight);
  const [frameCount, setFrameCount] = useState(initialFrameCount);
  const [columns, setColumns] = useState(initialColumns);
  const [isExtracting, setIsExtracting] = useState(false);
  const [extractedFrames, setExtractedFrames] = useState<string[]>([]);
  const [showSettings, setShowSettings] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 提取帧
  const handleExtract = useCallback(async () => {
    setIsExtracting(true);
    setError(null);

    try {
      // 先加载图片获取实际尺寸
      const img = new Image();
      img.crossOrigin = 'anonymous';

      await new Promise<void>((resolve, reject) => {
        img.onload = () => resolve();
        img.onerror = () => reject(new Error('Failed to load image'));
        img.src = imageUrl;
      });

      const actualWidth = img.width;
      const actualHeight = img.height;

      console.log('[FrameExtractor] Image loaded:', {
        actualWidth,
        actualHeight,
        frameWidth,
        frameHeight,
        frameCount,
        columns,
      });

      // 检查尺寸是否合理
      const expectedWidth = columns * frameWidth;
      const expectedHeight = Math.ceil(frameCount / columns) * frameHeight;

      if (actualWidth < expectedWidth || actualHeight < expectedHeight) {
        console.warn('[FrameExtractor] Image size mismatch:', {
          expected: `${expectedWidth}x${expectedHeight}`,
          actual: `${actualWidth}x${actualHeight}`,
        });

        // 自动调整帧尺寸
        const autoFrameWidth = Math.floor(actualWidth / columns);
        const autoFrameHeight = Math.floor(actualHeight / Math.ceil(frameCount / columns));

        console.log('[FrameExtractor] Auto-adjusted frame size:', {
          autoFrameWidth,
          autoFrameHeight,
        });

        if (autoFrameWidth > 0 && autoFrameHeight > 0) {
          setFrameWidth(autoFrameWidth);
          setFrameHeight(autoFrameHeight);
        }
      }

      const frames = await extractFrames(
        imageUrl,
        frameWidth,
        frameHeight,
        frameCount,
        columns
      );

      console.log('[FrameExtractor] Frames extracted:', frames.length);

      // 转换为 base64 URL
      const frameUrls = frames.map((canvas) => canvasToBase64(canvas));

      // 验证帧不是空白的
      const nonEmptyFrames = frameUrls.filter((url, index) => {
        // 检查是否有实际内容（不是纯白）
        const canvas = frames[index];
        const ctx = canvas.getContext('2d');
        if (!ctx) return false;

        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imageData.data;

        // 检查是否有非白色像素
        for (let i = 0; i < data.length; i += 4) {
          const r = data[i];
          const g = data[i + 1];
          const b = data[i + 2];
          const a = data[i + 3];

          // 如果有非白色或不透明像素
          if (a > 0 && (r < 250 || g < 250 || b < 250)) {
            return true;
          }
        }
        return false;
      });

      console.log('[FrameExtractor] Non-empty frames:', nonEmptyFrames.length, '/', frameUrls.length);

      setExtractedFrames(frameUrls);
      onFramesExtracted(frameUrls);
    } catch (err) {
      console.error('Frame extraction failed:', err);
      setError(t('sprite.extract.error', 'Failed to extract frames'));
    } finally {
      setIsExtracting(false);
    }
  }, [imageUrl, frameWidth, frameHeight, frameCount, columns, onFramesExtracted, t]);

  // 下载单个帧
  const downloadFrame = useCallback((frameUrl: string, index: number) => {
    const link = document.createElement('a');
    link.download = `frame-${index + 1}.png`;
    link.href = frameUrl;
    link.click();
  }, []);

  // 自动提取
  useEffect(() => {
    if (imageUrl) {
      handleExtract();
    }
  }, [imageUrl, frameWidth, frameHeight, frameCount, columns]); // 不包含 handleExtract

  return (
    <div className={cn('space-y-4', className)}>
      {/* 设置面板 */}
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-medium text-gray-300">
          {t('sprite.extract.title', 'Frame Extraction')}
        </h4>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setShowSettings(!showSettings)}
        >
          <Settings2 className="w-4 h-4" />
        </Button>
      </div>

      {showSettings && (
        <div className="space-y-3 p-3 bg-gray-800 rounded-lg border border-gray-700">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-gray-400 block mb-1">
                {t('sprite.extract.frameWidth', 'Frame Width')}
              </label>
              <input
                type="number"
                value={frameWidth}
                onChange={(e) => setFrameWidth(parseInt(e.target.value) || 64)}
                min={8}
                max={512}
                className="w-full px-2 py-1 bg-gray-700 border border-gray-600 rounded text-sm text-white"
              />
            </div>
            <div>
              <label className="text-xs text-gray-400 block mb-1">
                {t('sprite.extract.frameHeight', 'Frame Height')}
              </label>
              <input
                type="number"
                value={frameHeight}
                onChange={(e) => setFrameHeight(parseInt(e.target.value) || 64)}
                min={8}
                max={512}
                className="w-full px-2 py-1 bg-gray-700 border border-gray-600 rounded text-sm text-white"
              />
            </div>
            <div>
              <label className="text-xs text-gray-400 block mb-1">
                {t('sprite.extract.frameCount', 'Frame Count')}
              </label>
              <input
                type="number"
                value={frameCount}
                onChange={(e) => setFrameCount(parseInt(e.target.value) || 4)}
                min={1}
                max={24}
                className="w-full px-2 py-1 bg-gray-700 border border-gray-600 rounded text-sm text-white"
              />
            </div>
            <div>
              <label className="text-xs text-gray-400 block mb-1">
                {t('sprite.extract.columns', 'Columns')}
              </label>
              <input
                type="number"
                value={columns}
                onChange={(e) => setColumns(parseInt(e.target.value) || 4)}
                min={1}
                max={12}
                className="w-full px-2 py-1 bg-gray-700 border border-gray-600 rounded text-sm text-white"
              />
            </div>
          </div>
        </div>
      )}

      {/* 错误提示 */}
      {error && (
        <div className="p-2 bg-red-900/30 border border-red-700 rounded text-sm text-red-400">
          {error}
        </div>
      )}

      {/* 提取按钮 */}
      <Button
        onClick={handleExtract}
        disabled={isExtracting || !imageUrl}
        className="w-full"
      >
        <Scissors className="w-4 h-4 mr-2" />
        {isExtracting
          ? t('sprite.extract.extracting', 'Extracting...')
          : t('sprite.extract.extract', 'Extract Frames')}
      </Button>

      {/* 提取结果预览 */}
      {extractedFrames.length > 0 && (
        <div className="space-y-2">
          <h5 className="text-xs text-gray-400">
            {t('sprite.extract.extractedFrames', 'Extracted Frames')} ({extractedFrames.length})
          </h5>
          <div className="grid grid-cols-4 gap-2">
            {extractedFrames.map((frame, index) => (
              <div
                key={index}
                className="relative group bg-gray-800 rounded border border-gray-700 p-1"
              >
                <img
                  src={frame}
                  alt={`Frame ${index + 1}`}
                  className="w-full h-auto"
                  style={{
                    imageRendering: 'pixelated',
                    background:
                      'repeating-conic-gradient(#80808020 0% 25%, transparent 0% 50%) 50% / 8px 8px',
                  }}
                />
                <button
                  onClick={() => downloadFrame(frame, index)}
                  className="absolute top-1 right-1 p-1 bg-black/70 rounded opacity-0 group-hover:opacity-100 transition-opacity"
                  title={t('sprite.extract.download', 'Download')}
                >
                  <Download className="w-3 h-3 text-white" />
                </button>
                <span className="absolute bottom-1 left-1 px-1 bg-black/70 text-white text-xs rounded">
                  {index + 1}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
