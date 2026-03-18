/**
 * 可视化网格分割器组件
 *
 * GridSplitter 功能:
 *   ├─> 显示精灵图表
 *   ├─> 可拖拽的垂直分割线
 *   ├─> 可拖拽的水平分割线
 *   ├─> 实时预览分割效果
 *   └─> 提取帧并输出
 */

import React, { useState, useCallback, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Scissors, Plus, Minus, RefreshCw } from 'lucide-react';
import { Button } from '../ui/Button';
import { cn } from '../../utils/cn';

export interface GridFrame {
  dataUrl: string;
  x: number;
  y: number;
  width: number;
  height: number;
  index: number;
}

interface GridSplitterProps {
  imageUrl: string;
  initialCols?: number;
  initialRows?: number;
  onFramesExtracted: (frames: GridFrame[]) => void;
  className?: string;
}

export const GridSplitter: React.FC<GridSplitterProps> = ({
  imageUrl,
  initialCols = 2,
  initialRows = 2,
  onFramesExtracted,
  className,
}) => {
  const { t } = useTranslation();
  const containerRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);

  const [cols, setCols] = useState(initialCols);
  const [rows, setRows] = useState(initialRows);
  const [imageSize, setImageSize] = useState({ width: 0, height: 0 });
  const [displaySize, setDisplaySize] = useState({ width: 0, height: 0 });
  const [verticalDividers, setVerticalDividers] = useState<number[]>([]);
  const [horizontalDividers, setHorizontalDividers] = useState<number[]>([]);
  const [draggingDivider, setDraggingDivider] = useState<{
    type: 'vertical' | 'horizontal';
    index: number;
  } | null>(null);
  const [extractedFrames, setExtractedFrames] = useState<GridFrame[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // 加载图片
  useEffect(() => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      setImageSize({ width: img.width, height: img.height });
      setIsLoading(false);

      // 初始化分割线位置（等分）
      const newVerticalDividers: number[] = [];
      const newHorizontalDividers: number[] = [];

      for (let i = 1; i < cols; i++) {
        newVerticalDividers.push((img.width / cols) * i);
      }
      for (let i = 1; i < rows; i++) {
        newHorizontalDividers.push((img.height / rows) * i);
      }

      setVerticalDividers(newVerticalDividers);
      setHorizontalDividers(newHorizontalDividers);
    };
    img.onerror = () => setIsLoading(false);
    img.src = imageUrl;
  }, [imageUrl, cols, rows]);

  // 计算显示尺寸
  useEffect(() => {
    if (!containerRef.current || imageSize.width === 0) return;

    const containerWidth = containerRef.current.clientWidth - 32;
    const scale = Math.min(1, containerWidth / imageSize.width);
    setDisplaySize({
      width: imageSize.width * scale,
      height: imageSize.height * scale,
    });
  }, [imageSize]);

  // 更新分割线数量
  const updateGrid = useCallback((newCols: number, newRows: number) => {
    setCols(newCols);
    setRows(newRows);

    // 重新计算分割线位置
    const newVerticalDividers: number[] = [];
    const newHorizontalDividers: number[] = [];

    for (let i = 1; i < newCols; i++) {
      const existingValue = verticalDividers[i - 1];
      if (existingValue !== undefined && newCols === cols) {
        newVerticalDividers.push(existingValue);
      } else {
        newVerticalDividers.push((imageSize.width / newCols) * i);
      }
    }
    for (let i = 1; i < newRows; i++) {
      const existingValue = horizontalDividers[i - 1];
      if (existingValue !== undefined && newRows === rows) {
        newHorizontalDividers.push(existingValue);
      } else {
        newHorizontalDividers.push((imageSize.height / newRows) * i);
      }
    }

    setVerticalDividers(newVerticalDividers);
    setHorizontalDividers(newHorizontalDividers);
  }, [imageSize, verticalDividers, horizontalDividers, cols, rows]);

  // 开始拖拽
  const handleMouseDown = useCallback(
    (type: 'vertical' | 'horizontal', index: number) => (e: React.MouseEvent) => {
      e.preventDefault();
      setDraggingDivider({ type, index });
    },
    []
  );

  // 拖拽移动
  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (!draggingDivider || !containerRef.current || imageSize.width === 0) return;

      const rect = containerRef.current.getBoundingClientRect();
      const scale = imageSize.width / displaySize.width;

      const x = (e.clientX - rect.left - 16) * scale;
      const y = (e.clientY - rect.top - 16) * scale;

      if (draggingDivider.type === 'vertical') {
        setVerticalDividers((prev) => {
          const newDividers = [...prev];
          const clampedX = Math.max(10, Math.min(imageSize.width - 10, x));
          newDividers[draggingDivider.index] = clampedX;
          return newDividers;
        });
      } else {
        setHorizontalDividers((prev) => {
          const newDividers = [...prev];
          const clampedY = Math.max(10, Math.min(imageSize.height - 10, y));
          newDividers[draggingDivider.index] = clampedY;
          return newDividers;
        });
      }
    },
    [draggingDivider, imageSize, displaySize]
  );

  // 结束拖拽
  const handleMouseUp = useCallback(() => {
    setDraggingDivider(null);
  }, []);

  // 提取帧
  const extractFrames = useCallback(async () => {
    if (!imageUrl || imageSize.width === 0) return;

    const img = new Image();
    img.crossOrigin = 'anonymous';

    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = reject;
      img.src = imageUrl;
    });

    // 计算每个格子的边界
    const boundaries: { x: number; y: number; width: number; height: number }[] = [];

    const xPoints = [0, ...verticalDividers.sort((a, b) => a - b), imageSize.width];
    const yPoints = [0, ...horizontalDividers.sort((a, b) => a - b), imageSize.height];

    for (let row = 0; row < yPoints.length - 1; row++) {
      for (let col = 0; col < xPoints.length - 1; col++) {
        const x = xPoints[col];
        const y = yPoints[row];
        const width = xPoints[col + 1] - x;
        const height = yPoints[row + 1] - y;

        boundaries.push({ x, y, width, height });
      }
    }

    // 提取每个帧
    const frames: GridFrame[] = [];

    for (let i = 0; i < boundaries.length; i++) {
      const { x, y, width, height } = boundaries[i];

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;

      const ctx = canvas.getContext('2d');
      if (!ctx) continue;

      ctx.drawImage(img, x, y, width, height, 0, 0, width, height);

      frames.push({
        dataUrl: canvas.toDataURL('image/png'),
        x,
        y,
        width,
        height,
        index: i,
      });
    }

    setExtractedFrames(frames);
    onFramesExtracted(frames);
  }, [imageUrl, imageSize, verticalDividers, horizontalDividers, onFramesExtracted]);

  // 重置分割线
  const resetDividers = useCallback(() => {
    const newVerticalDividers: number[] = [];
    const newHorizontalDividers: number[] = [];

    for (let i = 1; i < cols; i++) {
      newVerticalDividers.push((imageSize.width / cols) * i);
    }
    for (let i = 1; i < rows; i++) {
      newHorizontalDividers.push((imageSize.height / rows) * i);
    }

    setVerticalDividers(newVerticalDividers);
    setHorizontalDividers(newHorizontalDividers);
  }, [imageSize, cols, rows]);

  const scale = displaySize.width > 0 ? imageSize.width / displaySize.width : 1;

  return (
    <div className={cn('space-y-4', className)}>
      {/* 控制面板 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          {/* 列数控制 */}
          <div className="flex items-center space-x-2">
            <span className="text-xs text-gray-400">{t('sprite.splitter.cols', 'Cols')}</span>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => updateGrid(Math.max(1, cols - 1), rows)}
              disabled={cols <= 1}
            >
              <Minus className="w-3 h-3" />
            </Button>
            <span className="text-sm font-medium w-6 text-center">{cols}</span>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => updateGrid(Math.min(12, cols + 1), rows)}
              disabled={cols >= 12}
            >
              <Plus className="w-3 h-3" />
            </Button>
          </div>

          {/* 行数控制 */}
          <div className="flex items-center space-x-2">
            <span className="text-xs text-gray-400">{t('sprite.splitter.rows', 'Rows')}</span>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => updateGrid(cols, Math.max(1, rows - 1))}
              disabled={rows <= 1}
            >
              <Minus className="w-3 h-3" />
            </Button>
            <span className="text-sm font-medium w-6 text-center">{rows}</span>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => updateGrid(cols, Math.min(12, rows + 1))}
              disabled={rows >= 12}
            >
              <Plus className="w-3 h-3" />
            </Button>
          </div>

          <span className="text-xs text-gray-500">
            {t('sprite.splitter.frames', 'Frames')}: {cols * rows}
          </span>
        </div>

        <div className="flex items-center space-x-2">
          <Button variant="ghost" size="sm" onClick={resetDividers}>
            <RefreshCw className="w-3 h-3 mr-1" />
            {t('sprite.splitter.reset', 'Reset')}
          </Button>
        </div>
      </div>

      {/* 网格编辑器 */}
      <div
        ref={containerRef}
        className="relative bg-gray-900 rounded-lg border border-gray-700 p-4 overflow-hidden"
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        style={{ cursor: draggingDivider ? 'col-resize' : 'default' }}
      >
        {isLoading ? (
          <div className="flex items-center justify-center h-48">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-yellow-400" />
          </div>
        ) : (
          <div
            className="relative mx-auto"
            style={{ width: displaySize.width, height: displaySize.height }}
          >
            {/* 底层图片 */}
            <img
              ref={imageRef}
              src={imageUrl}
              alt="Sprite sheet"
              className="block"
              style={{
                width: displaySize.width,
                height: displaySize.height,
                imageRendering: 'pixelated',
              }}
              draggable={false}
            />

            {/* 分割线叠加层 */}
            <div className="absolute inset-0 pointer-events-none">
              {/* 垂直分割线 */}
              {verticalDividers.map((x, index) => (
                <div
                  key={`v-${index}`}
                  className="absolute top-0 bottom-0 w-1 bg-yellow-500 cursor-ew-resize pointer-events-auto hover:bg-yellow-400 transition-colors group"
                  style={{
                    left: x / scale - 2,
                  }}
                  onMouseDown={handleMouseDown('vertical', index)}
                >
                  {/* 拖拽手柄 */}
                  <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-3 h-8 bg-yellow-500 rounded opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
              ))}

              {/* 水平分割线 */}
              {horizontalDividers.map((y, index) => (
                <div
                  key={`h-${index}`}
                  className="absolute left-0 right-0 h-1 bg-yellow-500 cursor-ns-resize pointer-events-auto hover:bg-yellow-400 transition-colors group"
                  style={{
                    top: y / scale - 2,
                  }}
                  onMouseDown={handleMouseDown('horizontal', index)}
                >
                  {/* 拖拽手柄 */}
                  <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 h-3 w-8 bg-yellow-500 rounded opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
              ))}

              {/* 帧编号 */}
              {(() => {
                const xPoints = [0, ...verticalDividers.sort((a, b) => a - b), imageSize.width];
                const yPoints = [0, ...horizontalDividers.sort((a, b) => a - b), imageSize.height];
                const frames: React.ReactNode[] = [];

                for (let row = 0; row < yPoints.length - 1; row++) {
                  for (let col = 0; col < xPoints.length - 1; col++) {
                    const frameIndex = row * (xPoints.length - 1) + col;
                    const centerX = ((xPoints[col] + xPoints[col + 1]) / 2) / scale;
                    const centerY = ((yPoints[row] + yPoints[row + 1]) / 2) / scale;

                    frames.push(
                      <div
                        key={`frame-${frameIndex}`}
                        className="absolute text-xs font-bold text-white/50 pointer-events-none"
                        style={{
                          left: centerX,
                          top: centerY,
                          transform: 'translate(-50%, -50%)',
                          textShadow: '0 0 2px black',
                        }}
                      >
                        {frameIndex + 1}
                      </div>
                    );
                  }
                }
                return frames;
              })()}
            </div>
          </div>
        )}
      </div>

      {/* 提取按钮 */}
      <Button onClick={extractFrames} disabled={isLoading || imageSize.width === 0} className="w-full">
        <Scissors className="w-4 h-4 mr-2" />
        {t('sprite.splitter.extract', 'Extract Frames')}
      </Button>

      {/* 提取结果预览 */}
      {extractedFrames.length > 0 && (
        <div className="space-y-2">
          <h5 className="text-xs text-gray-400">
            {t('sprite.splitter.extracted', 'Extracted Frames')} ({extractedFrames.length})
          </h5>
          <div className="grid grid-cols-4 gap-2">
            {extractedFrames.map((frame) => (
              <div
                key={frame.index}
                className="relative group bg-gray-800 rounded border border-gray-700 p-1"
              >
                <img
                  src={frame.dataUrl}
                  alt={`Frame ${frame.index + 1}`}
                  className="w-full h-auto"
                  style={{
                    imageRendering: 'pixelated',
                    background:
                      'repeating-conic-gradient(#80808020 0% 25%, transparent 0% 50%) 50% / 8px 8px',
                  }}
                />
                <span className="absolute bottom-1 left-1 px-1 bg-black/70 text-white text-xs rounded">
                  {frame.index + 1}
                </span>
                <span className="absolute top-1 right-1 px-1 bg-black/70 text-gray-400 text-xs rounded">
                  {frame.width}x{frame.height}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 图片信息 */}
      {imageSize.width > 0 && (
        <div className="text-xs text-gray-500">
          {t('sprite.splitter.imageSize', 'Image Size')}: {imageSize.width}x{imageSize.height}px
        </div>
      )}
    </div>
  );
};
