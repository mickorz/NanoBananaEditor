/**
 * 动画播放器组件
 *
 * AnimationPlayer 功能:
 *   ├─> 播放帧动画
 *   ├─> 控制播放速度
 *   ├─> 播放/暂停控制
 *   └─> 逐帧预览
 */

import React, { useState, useCallback, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Play, Pause, SkipBack, SkipForward, RotateCcw } from 'lucide-react';
import { Button } from '../ui/Button';
import { cn } from '../../utils/cn';

interface AnimationPlayerProps {
  frames: string[]; // 帧 URL 数组
  frameWidth: number;
  frameHeight: number;
  frameInterval?: number; // 默认 150ms
  autoPlay?: boolean;
  loop?: boolean;
  showControls?: boolean;
  className?: string;
  onFrameChange?: (frameIndex: number) => void;
}

export const AnimationPlayer: React.FC<AnimationPlayerProps> = ({
  frames,
  frameWidth,
  frameHeight,
  frameInterval = 150,
  autoPlay = false,
  loop = true,
  showControls = true,
  className,
  onFrameChange,
}) => {
  const { t } = useTranslation();
  const [currentFrame, setCurrentFrame] = useState(0);
  const [isPlaying, setIsPlaying] = useState(autoPlay);
  const [speed, setSpeed] = useState(1); // 1x 速度
  const animationRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number>(0);

  // 动画循环
  useEffect(() => {
    if (!isPlaying || frames.length === 0) {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
        animationRef.current = null;
      }
      return;
    }

    const animate = (timestamp: number) => {
      if (timestamp - lastTimeRef.current >= frameInterval / speed) {
        lastTimeRef.current = timestamp;
        setCurrentFrame((prev) => {
          const next = prev + 1;
          if (next >= frames.length) {
            if (loop) {
              return 0;
            } else {
              setIsPlaying(false);
              return prev;
            }
          }
          return next;
        });
      }
      animationRef.current = requestAnimationFrame(animate);
    };

    animationRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [isPlaying, frames.length, frameInterval, speed, loop]);

  // 帧变化回调
  useEffect(() => {
    onFrameChange?.(currentFrame);
  }, [currentFrame, onFrameChange]);

  // 播放/暂停
  const togglePlay = useCallback(() => {
    setIsPlaying((prev) => !prev);
  }, []);

  // 上一帧
  const prevFrame = useCallback(() => {
    setIsPlaying(false);
    setCurrentFrame((prev) => (prev > 0 ? prev - 1 : frames.length - 1));
  }, [frames.length]);

  // 下一帧
  const nextFrame = useCallback(() => {
    setIsPlaying(false);
    setCurrentFrame((prev) => (prev < frames.length - 1 ? prev + 1 : 0));
  }, [frames.length]);

  // 重置
  const reset = useCallback(() => {
    setIsPlaying(false);
    setCurrentFrame(0);
  }, []);

  // 速度选项
  const speedOptions = [0.25, 0.5, 1, 1.5, 2];

  if (frames.length === 0) {
    return (
      <div className={cn('flex items-center justify-center bg-gray-900 rounded-lg', className)}>
        <p className="text-gray-500 text-sm">{t('sprite.player.noFrames', 'No frames')}</p>
      </div>
    );
  }

  return (
    <div className={cn('flex flex-col space-y-3', className)}>
      {/* 动画显示区域 */}
      <div
        className="relative overflow-hidden bg-gray-900 rounded-lg border border-gray-700 flex items-center justify-center"
        style={{
          minHeight: Math.max(frameHeight + 40, 150),
          background: 'repeating-conic-gradient(#80808020 0% 25%, transparent 0% 50%) 50% / 16px 16px',
        }}
      >
        <img
          src={frames[currentFrame]}
          alt={`Frame ${currentFrame + 1}`}
          className="max-w-full max-h-full object-contain"
          style={{
            imageRendering: 'pixelated', // 像素艺术友好
          }}
        />

        {/* 帧计数器 */}
        <div className="absolute bottom-2 right-2 px-2 py-1 bg-black/70 text-white text-xs rounded">
          {currentFrame + 1} / {frames.length}
        </div>
      </div>

      {/* 控制面板 */}
      {showControls && (
        <div className="space-y-2">
          {/* 播放控制按钮 */}
          <div className="flex items-center justify-center space-x-2">
            <Button variant="ghost" size="sm" onClick={reset} title={t('sprite.player.reset')}>
              <RotateCcw className="w-4 h-4" />
            </Button>
            <Button variant="ghost" size="sm" onClick={prevFrame} title={t('sprite.player.prev')}>
              <SkipBack className="w-4 h-4" />
            </Button>
            <Button
              variant="default"
              size="sm"
              onClick={togglePlay}
              className="w-12"
              title={isPlaying ? t('sprite.player.pause') : t('sprite.player.play')}
            >
              {isPlaying ? (
                <Pause className="w-4 h-4" />
              ) : (
                <Play className="w-4 h-4" />
              )}
            </Button>
            <Button variant="ghost" size="sm" onClick={nextFrame} title={t('sprite.player.next')}>
              <SkipForward className="w-4 h-4" />
            </Button>
          </div>

          {/* 速度控制 */}
          <div className="flex items-center justify-center space-x-1">
            <span className="text-xs text-gray-400 mr-2">{t('sprite.player.speed')}:</span>
            {speedOptions.map((s) => (
              <button
                key={s}
                onClick={() => setSpeed(s)}
                className={cn(
                  'px-2 py-1 text-xs rounded transition-colors',
                  speed === s
                    ? 'bg-yellow-500 text-gray-900'
                    : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                )}
              >
                {s}x
              </button>
            ))}
          </div>

          {/* 进度条 */}
          <div className="flex items-center space-x-2">
            <input
              type="range"
              min={0}
              max={frames.length - 1}
              value={currentFrame}
              onChange={(e) => {
                setIsPlaying(false);
                setCurrentFrame(parseInt(e.target.value));
              }}
              className="flex-1 h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer"
            />
          </div>
        </div>
      )}
    </div>
  );
};
