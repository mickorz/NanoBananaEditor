/**
 * 精灵图预览组件
 *
 * SpritePreview 功能:
 *   ├─> 显示精灵图表全貌
 *   ├─> 帧网格标记
 *   ├─> 点击选择帧
 *   └─> 支持缩放和平移
 */

import React, { useState, useCallback, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { ZoomIn, ZoomOut, RotateCcw } from 'lucide-react';
import { Button } from '../ui/Button';
import { cn } from '../../utils/cn';

interface SpritePreviewProps {
  imageUrl: string;
  frameWidth: number;
  frameHeight: number;
  frameCount: number;
  columns?: number;
  selectedFrame?: number;
  onFrameSelect?: (frameIndex: number) => void;
  className?: string;
}

export const SpritePreview: React.FC<SpritePreviewProps> = ({
  imageUrl,
  frameWidth,
  frameHeight,
  frameCount,
  columns = 4,
  selectedFrame,
  onFrameSelect,
  className,
}) => {
  const { t } = useTranslation();
  const containerRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  const [imageSize, setImageSize] = useState({ width: 0, height: 0 });
  const [isLoading, setIsLoading] = useState(true);

  // 加载图片获取尺寸
  useEffect(() => {
    const img = new Image();
    img.onload = () => {
      setImageSize({ width: img.width, height: img.height });
      setIsLoading(false);
    };
    img.src = imageUrl;
  }, [imageUrl]);

  // 计算帧位置
  const getFramePosition = useCallback(
    (index: number) => {
      const col = index % columns;
      const row = Math.floor(index / columns);
      return { col, row };
    },
    [columns]
  );

  // 处理帧点击
  const handleFrameClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (!onFrameSelect || !containerRef.current) return;

      const rect = containerRef.current.getBoundingClientRect();
      const x = (e.clientX - rect.left) / scale;
      const y = (e.clientY - rect.top) / scale;

      const col = Math.floor(x / frameWidth);
      const row = Math.floor(y / frameHeight);
      const frameIndex = row * columns + col;

      if (frameIndex >= 0 && frameIndex < frameCount) {
        onFrameSelect(frameIndex);
      }
    },
    [scale, frameWidth, frameHeight, columns, frameCount, onFrameSelect]
  );

  // 缩放控制
  const zoomIn = () => setScale((s) => Math.min(s * 1.25, 5));
  const zoomOut = () => setScale((s) => Math.max(s / 1.25, 0.25));
  const resetZoom = () => setScale(1);

  const rows = Math.ceil(frameCount / columns);

  return (
    <div className={cn('flex flex-col space-y-2', className)}>
      {/* 工具栏 */}
      <div className="flex items-center justify-between">
        <span className="text-sm text-gray-400">
          {t('sprite.preview.frames', 'Frames')}: {frameCount}
        </span>
        <div className="flex items-center space-x-1">
          <Button variant="ghost" size="sm" onClick={zoomOut} title={t('sprite.preview.zoomOut')}>
            <ZoomOut className="w-4 h-4" />
          </Button>
          <span className="text-xs text-gray-500 w-12 text-center">{Math.round(scale * 100)}%</span>
          <Button variant="ghost" size="sm" onClick={zoomIn} title={t('sprite.preview.zoomIn')}>
            <ZoomIn className="w-4 h-4" />
          </Button>
          <Button variant="ghost" size="sm" onClick={resetZoom} title={t('sprite.preview.reset')}>
            <RotateCcw className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* 预览区域 */}
      <div
        ref={containerRef}
        className="relative overflow-auto bg-gray-900 rounded-lg border border-gray-700"
        style={{ minHeight: 200, maxHeight: 400 }}
      >
        {isLoading ? (
          <div className="flex items-center justify-center h-48">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-yellow-400" />
          </div>
        ) : (
          <div
            className="relative inline-block"
            style={{
              transform: `scale(${scale})`,
              transformOrigin: 'top left',
            }}
            onClick={handleFrameClick}
          >
            {/* 底层图片 */}
            <img
              src={imageUrl}
              alt="Sprite sheet"
              className="block"
              style={{
                background:
                  'repeating-conic-gradient(#80808020 0% 25%, transparent 0% 50%) 50% / 16px 16px',
              }}
            />

            {/* 帧网格叠加层 */}
            <svg
              className="absolute top-0 left-0 pointer-events-none"
              width={imageSize.width}
              height={imageSize.height}
            >
              {/* 网格线 */}
              {Array.from({ length: columns + 1 }).map((_, i) => (
                <line
                  key={`v-${i}`}
                  x1={i * frameWidth}
                  y1={0}
                  x2={i * frameWidth}
                  y2={rows * frameHeight}
                  stroke="rgba(255,255,255,0.2)"
                  strokeWidth={1}
                />
              ))}
              {Array.from({ length: rows + 1 }).map((_, i) => (
                <line
                  key={`h-${i}`}
                  x1={0}
                  y1={i * frameHeight}
                  x2={columns * frameWidth}
                  y2={i * frameHeight}
                  stroke="rgba(255,255,255,0.2)"
                  strokeWidth={1}
                />
              ))}

              {/* 选中帧高亮 */}
              {selectedFrame !== undefined && selectedFrame < frameCount && (
                (() => {
                  const { col, row } = getFramePosition(selectedFrame);
                  return (
                    <rect
                      x={col * frameWidth}
                      y={row * frameHeight}
                      width={frameWidth}
                      height={frameHeight}
                      fill="rgba(234, 179, 8, 0.3)"
                      stroke="rgb(234, 179, 8)"
                      strokeWidth={2}
                    />
                  );
                })()
              )}
            </svg>

            {/* 帧编号叠加层 */}
            <div className="absolute top-0 left-0 pointer-events-none">
              {Array.from({ length: frameCount }).map((_, index) => {
                const { col, row } = getFramePosition(index);
                return (
                  <div
                    key={index}
                    className="absolute flex items-center justify-center text-xs font-bold"
                    style={{
                      left: col * frameWidth,
                      top: row * frameHeight,
                      width: frameWidth,
                      height: frameHeight,
                      color: selectedFrame === index ? 'rgb(234, 179, 8)' : 'rgba(255,255,255,0.5)',
                      textShadow: '0 0 2px black',
                    }}
                  >
                    {index + 1}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* 帧信息 */}
      <div className="text-xs text-gray-500">
        {t('sprite.preview.frameSize', 'Frame Size')}: {frameWidth}x{frameHeight} |{' '}
        {t('sprite.preview.grid', 'Grid')}: {columns}x{rows}
      </div>
    </div>
  );
};
