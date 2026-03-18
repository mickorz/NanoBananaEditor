import React, { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Stage, Layer, Image as KonvaImage, Line } from 'react-konva';
import type { KonvaEventObject } from 'konva/lib/Node';
import type { Stage as KonvaStage } from 'konva/lib/Stage';
import { useAppStore } from '../store/useAppStore';
import { Button } from './ui/Button';
import { ZoomIn, ZoomOut, RotateCcw, Download, Eye, EyeOff, Eraser } from 'lucide-react';
import { cn } from '../utils/cn';

const MASK_STROKE_COLOR = '#A855F7';

export const ImageCanvas: React.FC = () => {
  const { t } = useTranslation();
  const {
    canvasImage,
    canvasZoom,
    setCanvasZoom,
    canvasPan,
    setCanvasPan,
    brushStrokes,
    addBrushStroke,
    clearBrushStrokes,
    showMasks,
    setShowMasks,
    selectedTool,
    isGenerating,
    brushSize,
    setBrushSize,
  } = useAppStore();

  const stageRef = useRef<KonvaStage | null>(null);
  const [image, setImage] = useState<HTMLImageElement | null>(null);
  const [stageSize, setStageSize] = useState({ width: 800, height: 600 });
  const [isDrawing, setIsDrawing] = useState(false);
  const [currentStroke, setCurrentStroke] = useState<number[]>([]);

  useEffect(() => {
    if (!canvasImage) {
      setImage(null);
      return;
    }

    const img = new window.Image();
    img.onload = () => {
      setImage(img);

      if (canvasZoom === 1 && canvasPan.x === 0 && canvasPan.y === 0) {
        const isMobile = window.innerWidth < 768;
        const padding = isMobile ? 0.9 : 0.8;
        const scaleX = (stageSize.width * padding) / img.width;
        const scaleY = (stageSize.height * padding) / img.height;
        const maxZoom = isMobile ? 0.3 : 0.8;
        const optimalZoom = Math.min(scaleX, scaleY, maxZoom);

        setCanvasZoom(optimalZoom);
        setCanvasPan({ x: 0, y: 0 });
      }
    };
    img.src = canvasImage;
  }, [canvasImage, canvasPan, canvasZoom, setCanvasPan, setCanvasZoom, stageSize]);

  useEffect(() => {
    const updateSize = () => {
      const container = document.getElementById('canvas-container');
      if (!container) {
        return;
      }

      setStageSize({
        width: container.offsetWidth,
        height: container.offsetHeight,
      });
    };

    updateSize();
    window.addEventListener('resize', updateSize);
    return () => window.removeEventListener('resize', updateSize);
  }, []);

  const getImageRelativePointerPosition = (stage: KonvaStage) => {
    if (!image) {
      return null;
    }

    const relativePos = stage.getRelativePointerPosition();
    if (!relativePos) {
      return null;
    }

    const imageX = (stageSize.width / canvasZoom - image.width) / 2;
    const imageY = (stageSize.height / canvasZoom - image.height) / 2;
    const relativeX = relativePos.x - imageX;
    const relativeY = relativePos.y - imageY;

    if (relativeX < 0 || relativeX > image.width || relativeY < 0 || relativeY > image.height) {
      return null;
    }

    return { x: relativeX, y: relativeY };
  };

  const handleMouseDown = (e: KonvaEventObject<MouseEvent>) => {
    if (selectedTool !== 'mask' || !image) {
      return;
    }

    const stage = e.target.getStage();
    if (!stage) {
      return;
    }

    const pointer = getImageRelativePointerPosition(stage);
    if (!pointer) {
      return;
    }

    setIsDrawing(true);
    setCurrentStroke([pointer.x, pointer.y]);
  };

  const handleMouseMove = (e: KonvaEventObject<MouseEvent>) => {
    if (!isDrawing || selectedTool !== 'mask' || !image) {
      return;
    }

    const stage = e.target.getStage();
    if (!stage) {
      return;
    }

    const pointer = getImageRelativePointerPosition(stage);
    if (!pointer) {
      return;
    }

    setCurrentStroke((prev) => [...prev, pointer.x, pointer.y]);
  };

  const handleMouseUp = () => {
    if (!isDrawing || currentStroke.length < 4) {
      setIsDrawing(false);
      setCurrentStroke([]);
      return;
    }

    addBrushStroke({
      id: `stroke-${Date.now()}`,
      points: currentStroke,
      brushSize,
      color: MASK_STROKE_COLOR,
    });
    setIsDrawing(false);
    setCurrentStroke([]);
  };

  const handleZoom = (delta: number) => {
    const newZoom = Math.max(0.1, Math.min(3, canvasZoom + delta));
    setCanvasZoom(newZoom);
  };

  const handleReset = () => {
    if (!image) {
      return;
    }

    const isMobile = window.innerWidth < 768;
    const padding = isMobile ? 0.9 : 0.8;
    const scaleX = (stageSize.width * padding) / image.width;
    const scaleY = (stageSize.height * padding) / image.height;
    const maxZoom = isMobile ? 0.3 : 0.8;
    const optimalZoom = Math.min(scaleX, scaleY, maxZoom);

    setCanvasZoom(optimalZoom);
    setCanvasPan({ x: 0, y: 0 });
  };

  const handleDownload = () => {
    if (!canvasImage || !canvasImage.startsWith('data:')) {
      return;
    }

    const link = document.createElement('a');
    link.href = canvasImage;
    link.download = `nano-banana-${Date.now()}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="flex flex-col h-full">
      <div className="p-3 border-b border-gray-800 bg-gray-950">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Button variant="outline" size="sm" onClick={() => handleZoom(-0.1)}>
              <ZoomOut className="h-4 w-4" />
            </Button>
            <span className="text-sm text-gray-400 min-w-[60px] text-center">
              {Math.round(canvasZoom * 100)}%
            </span>
            <Button variant="outline" size="sm" onClick={() => handleZoom(0.1)}>
              <ZoomIn className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="sm" onClick={handleReset}>
              <RotateCcw className="h-4 w-4" />
            </Button>
          </div>

          <div className="flex items-center space-x-2">
            {selectedTool === 'mask' && (
              <>
                <div className="flex items-center space-x-2 mr-2">
                  <span className="text-xs text-gray-400">{t('imageCanvas.brush')}:</span>
                  <input
                    type="range"
                    min="5"
                    max="50"
                    value={brushSize}
                    onChange={(e) => setBrushSize(parseInt(e.target.value, 10))}
                    className="w-16 h-2 bg-gray-800 rounded-lg appearance-none cursor-pointer slider"
                  />
                  <span className="text-xs text-gray-400 w-6">{brushSize}</span>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={clearBrushStrokes}
                  disabled={brushStrokes.length === 0}
                >
                  <Eraser className="h-4 w-4" />
                </Button>
              </>
            )}

            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowMasks(!showMasks)}
              className={cn(showMasks && 'bg-yellow-400/10 border-yellow-400/50')}
            >
              {showMasks ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
              <span className="hidden sm:inline ml-2">{t('imageCanvas.masks')}</span>
            </Button>

            {canvasImage && (
              <Button variant="secondary" size="sm" onClick={handleDownload}>
                <Download className="h-4 w-4 mr-2" />
                <span className="hidden sm:inline">{t('imageCanvas.download')}</span>
              </Button>
            )}
          </div>
        </div>
      </div>

      <div id="canvas-container" className="flex-1 relative overflow-hidden bg-gray-800">
        {!image && !isGenerating && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center">
              <h2 className="text-xl font-medium text-gray-300 mb-2">
                {t('imageCanvas.welcome')}
              </h2>
              <p className="text-gray-500 max-w-md">
                {selectedTool === 'generate'
                  ? t('imageCanvas.welcomeHintGenerate')
                  : t('imageCanvas.welcomeHintEdit')}
              </p>
            </div>
          </div>
        )}

        {isGenerating && (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-900/50">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-yellow-400 mb-4" />
              <p className="text-gray-300">{t('imageCanvas.creating')}</p>
            </div>
          </div>
        )}

        <Stage
          ref={stageRef}
          width={stageSize.width}
          height={stageSize.height}
          scaleX={canvasZoom}
          scaleY={canvasZoom}
          x={canvasPan.x * canvasZoom}
          y={canvasPan.y * canvasZoom}
          draggable={selectedTool !== 'mask'}
          onDragEnd={(e) => {
            setCanvasPan({
              x: e.target.x() / canvasZoom,
              y: e.target.y() / canvasZoom,
            });
          }}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          style={{
            cursor: selectedTool === 'mask' ? 'crosshair' : 'default',
          }}
        >
          <Layer>
            {image && (
              <KonvaImage
                image={image}
                x={(stageSize.width / canvasZoom - image.width) / 2}
                y={(stageSize.height / canvasZoom - image.height) / 2}
              />
            )}

            {showMasks &&
              brushStrokes.map((stroke) => (
                <Line
                  key={stroke.id}
                  points={stroke.points}
                  stroke={stroke.color}
                  strokeWidth={stroke.brushSize}
                  tension={0.5}
                  lineCap="round"
                  lineJoin="round"
                  globalCompositeOperation="source-over"
                  opacity={0.6}
                  x={(stageSize.width / canvasZoom - (image?.width || 0)) / 2}
                  y={(stageSize.height / canvasZoom - (image?.height || 0)) / 2}
                />
              ))}

            {isDrawing && currentStroke.length > 2 && (
              <Line
                points={currentStroke}
                stroke={MASK_STROKE_COLOR}
                strokeWidth={brushSize}
                tension={0.5}
                lineCap="round"
                lineJoin="round"
                globalCompositeOperation="source-over"
                opacity={0.6}
                x={(stageSize.width / canvasZoom - (image?.width || 0)) / 2}
                y={(stageSize.height / canvasZoom - (image?.height || 0)) / 2}
              />
            )}
          </Layer>
        </Stage>
      </div>

      <div className="p-3 border-t border-gray-800 bg-gray-950">
        <div className="flex items-center justify-between text-xs text-gray-500">
          <div className="flex items-center space-x-4">
            {brushStrokes.length > 0 && (
              <span className="text-yellow-400">
                {brushStrokes.length} {brushStrokes.length === 1 ? t('imageCanvas.brushStroke') : t('imageCanvas.brushStrokes')}
              </span>
            )}
          </div>

          <div className="flex items-center space-x-2">
            <span className="text-xs text-gray-500">{t('imageCanvas.copyright')}</span>
            <span className="text-gray-600 hidden md:inline">|</span>
            <a
              href="https://www.reinventing.ai/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-yellow-400 hover:text-yellow-300 transition-colors"
            >
              Reinventing.AI Solutions
            </a>
            <span className="text-gray-600 hidden md:inline">|</span>
            <span className="hidden md:inline">{t('imageCanvas.poweredBy')}</span>
          </div>
        </div>
      </div>
    </div>
  );
};
