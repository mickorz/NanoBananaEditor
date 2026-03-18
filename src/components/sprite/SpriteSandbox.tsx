/**
 * 精灵图沙盒模式组件
 *
 * SpriteSandbox 功能:
 *   ├─> Canvas 横向滚动游戏环境
 *   ├─> WASD 键盘控制移动
 *   ├─> 跳跃物理(重力/速度)
 *   ├─> 攻击动作
 *   ├─> 视差滚动背景
 *   └─> 角色动画状态机
 */

import React, { useState, useCallback, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Play, Pause, RotateCcw, Maximize2, Minimize2 } from 'lucide-react';
import { Button } from '../ui/Button';
import { cn } from '../../utils/cn';
import type { ParallaxBackgroundLayers } from '../../services/sprite/parallaxBackground';
import { PARALLAX_SPEEDS } from '../../services/sprite/parallaxBackground';

// 角色状态枚举
export enum CharacterState {
  IDLE = 'idle',
  WALK = 'walk',
  RUN = 'run',
  JUMP = 'jump',
  FALL = 'fall',
  ATTACK = 'attack',
  HURT = 'hurt',
}

// 角色方向枚举
export enum CharacterDirection {
  LEFT = 'left',
  RIGHT = 'right',
}

// 角色配置
interface CharacterConfig {
  x: number;
  y: number;
  velocityX: number;
  velocityY: number;
  width: number;
  height: number;
  state: CharacterState;
  direction: CharacterDirection;
  isGrounded: boolean;
  isAttacking: boolean;
  attackFrame: number;
  currentFrame: number;
  frameTimer: number;
}

// 帧动画数据
export interface AnimationFrames {
  idle: string[];
  walk: string[];
  run: string[];
  jump: string[];
  fall: string[];
  attack: string[];
  hurt: string[];
}

// 物理常量
const GRAVITY = 0.5;
const JUMP_FORCE = -12;
const MOVE_SPEED = 5;
const RUN_MULTIPLIER = 1.8;
const GROUND_Y_RATIO = 0.85; // 地面位置比例

interface SpriteSandboxProps {
  frames?: AnimationFrames;
  backgroundLayers?: ParallaxBackgroundLayers;
  frameWidth?: number;
  frameHeight?: number;
  className?: string;
}

export const SpriteSandbox: React.FC<SpriteSandboxProps> = ({
  frames,
  backgroundLayers,
  frameWidth = 64,
  frameHeight = 64,
  className,
}) => {
  const { t } = useTranslation();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const animationRef = useRef<number | null>(null);
  const keysRef = useRef<Set<string>>(new Set());
  const backgroundOffsetRef = useRef({ layer1: 0, layer2: 0, layer3: 0 });

  // 状态
  const [isPlaying, setIsPlaying] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [canvasSize, setCanvasSize] = useState({ width: 800, height: 400 });
  const [character, setCharacter] = useState<CharacterConfig>({
    x: 400,
    y: 300,
    velocityX: 0,
    velocityY: 0,
    width: frameWidth,
    height: frameHeight,
    state: CharacterState.IDLE,
    direction: CharacterDirection.RIGHT,
    isGrounded: false,
    isAttacking: false,
    attackFrame: 0,
    currentFrame: 0,
    frameTimer: 0,
  });

  // 背景图片缓存
  const bgImagesRef = useRef<{ layer1: HTMLImageElement | null; layer2: HTMLImageElement | null; layer3: HTMLImageElement | null }>({
    layer1: null,
    layer2: null,
    layer3: null,
  });

  // 加载背景图片
  useEffect(() => {
    if (backgroundLayers?.layer1Url) {
      const img = new Image();
      img.src = backgroundLayers.layer1Url;
      img.onload = () => {
        bgImagesRef.current.layer1 = img;
      };
    }
    if (backgroundLayers?.layer2Url) {
      const img = new Image();
      img.src = backgroundLayers.layer2Url;
      img.onload = () => {
        bgImagesRef.current.layer2 = img;
      };
    }
    if (backgroundLayers?.layer3Url) {
      const img = new Image();
      img.src = backgroundLayers.layer3Url;
      img.onload = () => {
        bgImagesRef.current.layer3 = img;
      };
    }
  }, [backgroundLayers]);

  // 加载角色帧图片
  const frameImagesRef = useRef<Map<string, HTMLImageElement>>(new Map());

  useEffect(() => {
    if (!frames) return;
    // 预加载所有帧图片
    Object.values(frames).forEach((frameArray) => {
      frameArray.forEach((src) => {
        if (!frameImagesRef.current.has(src)) {
          const img = new Image();
          img.src = src;
          img.onload = () => {
            frameImagesRef.current.set(src, img);
          };
        }
      });
    });
  }, [frames]);

  // 处理键盘按下
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    keysRef.current.add(e.key.toLowerCase());
  }, []);

  // 处理键盘释放
  const handleKeyUp = useCallback((e: KeyboardEvent) => {
    keysRef.current.delete(e.key.toLowerCase());
  }, []);

  // 注册键盘事件
  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [handleKeyDown, handleKeyUp]);

  // 获取当前帧
  const getCurrentFrame = useCallback((char: CharacterConfig): string | null => {
    if (!frames) return null;
    const stateFrames = frames[char.state];
    if (!stateFrames || stateFrames.length === 0) return null;
    const frameIndex = char.currentFrame % stateFrames.length;
    return stateFrames[frameIndex];
  }, [frames]);

  // 更新角色状态
  const updateCharacter = useCallback((deltaTime: number, groundY: number) => {
    const keys = keysRef.current;

    setCharacter((prev) => {
      const next = { ...prev };
      let newState = prev.state;
      let newDirection = prev.direction;

      // 处理攻击
      if (keys.has('j') || keys.has('space')) {
        if (!prev.isAttacking) {
          next.isAttacking = true;
          next.attackFrame = 0;
          newState = CharacterState.ATTACK;
        }
      }

      // 攻击动画完成检测
      if (next.isAttacking) {
        next.attackFrame++;
        const attackFrames = frames?.attack?.length || 4;
        if (next.attackFrame >= attackFrames) {
          next.isAttacking = false;
          next.attackFrame = 0;
        }
      }

      // 攻击时不能移动
      if (!next.isAttacking) {
        // 水平移动
        const isRunning = keys.has('shift');
        const speed = MOVE_SPEED * (isRunning ? RUN_MULTIPLIER : 1);

        if (keys.has('a') || keys.has('arrowleft')) {
          next.velocityX = -speed;
          newDirection = CharacterDirection.LEFT;
          newState = isRunning ? CharacterState.RUN : CharacterState.WALK;
        } else if (keys.has('d') || keys.has('arrowright')) {
          next.velocityX = speed;
          newDirection = CharacterDirection.RIGHT;
          newState = isRunning ? CharacterState.RUN : CharacterState.WALK;
        } else {
          next.velocityX *= 0.8; // 摩擦力
          if (Math.abs(next.velocityX) < 0.1) {
            next.velocityX = 0;
            if (prev.isGrounded) {
              newState = CharacterState.IDLE;
            }
          }
        }

        // 跳跃
        if ((keys.has('w') || keys.has('arrowup')) && prev.isGrounded) {
          next.velocityY = JUMP_FORCE;
          next.isGrounded = false;
          newState = CharacterState.JUMP;
        }
      }

      // 重力
      if (!next.isGrounded) {
        next.velocityY += GRAVITY;

        // 空中状态
        if (next.velocityY < 0) {
          newState = CharacterState.JUMP;
        } else {
          newState = CharacterState.FALL;
        }
      }

      // 更新位置
      next.x += next.velocityX;
      next.y += next.velocityY;

      // 地面碰撞
      if (next.y >= groundY - next.height) {
        next.y = groundY - next.height;
        next.velocityY = 0;
        next.isGrounded = true;
        if (!next.isAttacking && Math.abs(next.velocityX) < 0.1) {
          newState = CharacterState.IDLE;
        }
      }

      // 边界限制
      if (next.x < 0) next.x = 0;
      if (next.x > canvasSize.width - next.width) {
        next.x = canvasSize.width - next.width;
      }

      // 更新动画帧
      next.frameTimer += deltaTime;
      const frameInterval = 150; // ms per frame
      if (next.frameTimer >= frameInterval) {
        next.frameTimer = 0;
        next.currentFrame++;
      }

      next.state = newState;
      next.direction = newDirection;

      return next;
    });
  }, [canvasSize, frames]);

  // 更新背景偏移
  const updateBackgroundOffset = useCallback(() => {
    const velocityX = character.velocityX;
    const direction = character.direction === CharacterDirection.LEFT ? -1 : 1;

    backgroundOffsetRef.current.layer1 += velocityX * PARALLAX_SPEEDS.layer1 * direction;
    backgroundOffsetRef.current.layer2 += velocityX * PARALLAX_SPEEDS.layer2 * direction;
    backgroundOffsetRef.current.layer3 += velocityX * PARALLAX_SPEEDS.layer3 * direction;
  }, [character.velocityX, character.direction]);

  // 绘制背景
  const drawBackground = useCallback((ctx: CanvasRenderingContext2D) => {
    const { width, height } = canvasSize;
    const bgImages = bgImagesRef.current;

    // 绘制层 1 (远景)
    if (bgImages.layer1) {
      const offset = backgroundOffsetRef.current.layer1 % width;
      ctx.drawImage(bgImages.layer1, -offset, 0, width, height);
      ctx.drawImage(bgImages.layer1, width - offset, 0, width, height);
    } else {
      // 默认渐变背景
      const gradient = ctx.createLinearGradient(0, 0, 0, height);
      gradient.addColorStop(0, '#1a1a2e');
      gradient.addColorStop(1, '#16213e');
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, width, height);
    }

    // 绘制层 2 (中景)
    if (bgImages.layer2) {
      const offset = backgroundOffsetRef.current.layer2 % width;
      ctx.globalAlpha = 0.9;
      ctx.drawImage(bgImages.layer2, -offset, 0, width, height);
      ctx.drawImage(bgImages.layer2, width - offset, 0, width, height);
      ctx.globalAlpha = 1;
    }

    // 绘制层 3 (近景)
    if (bgImages.layer3) {
      const offset = backgroundOffsetRef.current.layer3 % width;
      ctx.globalAlpha = 0.95;
      ctx.drawImage(bgImages.layer3, -offset, 0, width, height);
      ctx.drawImage(bgImages.layer3, width - offset, 0, width, height);
      ctx.globalAlpha = 1;
    }
  }, [canvasSize]);

  // 绘制角色
  const drawCharacter = useCallback((ctx: CanvasRenderingContext2D) => {
    const frameSrc = getCurrentFrame(character);
    const img = frameSrc ? frameImagesRef.current.get(frameSrc) : null;

    ctx.save();

    // 翻转角色
    if (character.direction === CharacterDirection.LEFT) {
      ctx.translate(character.x + character.width, character.y);
      ctx.scale(-1, 1);
      ctx.translate(0, 0);
    } else {
      ctx.translate(character.x, character.y);
    }

    if (img) {
      ctx.drawImage(img, 0, 0, character.width, character.height);
    } else {
      // 默认占位符
      ctx.fillStyle = character.isAttacking ? '#ff6b6b' : '#4ecdc4';
      ctx.fillRect(0, 0, character.width, character.height);

      // 简单的角色指示
      ctx.fillStyle = '#fff';
      ctx.beginPath();
      const eyeX = character.direction === CharacterDirection.LEFT ? character.width * 0.25 : character.width * 0.65;
      ctx.arc(eyeX, character.height * 0.3, 4, 0, Math.PI * 2);
      ctx.fill();

      // 攻击指示
      if (character.isAttacking) {
        ctx.strokeStyle = '#ff6b6b';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(character.width, character.height * 0.5);
        ctx.lineTo(character.width + 20, character.height * 0.5);
        ctx.stroke();
      }
    }

    ctx.restore();

    // 绘制状态指示
    ctx.fillStyle = '#fff';
    ctx.font = '12px monospace';
    ctx.fillText(`State: ${character.state}`, 10, 20);
    ctx.fillText(`Direction: ${character.direction}`, 10, 35);
    ctx.fillText(`Grounded: ${character.isGrounded ? 'Yes' : 'No'}`, 10, 50);
  }, [character, getCurrentFrame]);

  // 绘制地面
  const drawGround = useCallback((ctx: CanvasRenderingContext2D, groundY: number) => {
    ctx.fillStyle = '#2d3436';
    ctx.fillRect(0, groundY, canvasSize.width, canvasSize.height - groundY);

    // 地面线
    ctx.strokeStyle = '#636e72';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, groundY);
    ctx.lineTo(canvasSize.width, groundY);
    ctx.stroke();
  }, [canvasSize]);

  // 绘制控制提示
  const drawControls = useCallback((ctx: CanvasRenderingContext2D) => {
    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    ctx.fillRect(canvasSize.width - 180, 10, 170, 100);

    ctx.fillStyle = '#fff';
    ctx.font = '11px monospace';
    const controls = [
      'W / ArrowUp: Jump',
      'A/D: Move Left/Right',
      'Shift + A/D: Run',
      'J / Space: Attack',
      'P: Play/Pause',
    ];
    controls.forEach((text, i) => {
      ctx.fillText(text, canvasSize.width - 170, 28 + i * 16);
    });
  }, [canvasSize]);

  // 游戏循环
  const gameLoop = useCallback((timestamp: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const groundY = canvasSize.height * GROUND_Y_RATIO;

    // 更新
    updateCharacter(16, groundY);
    updateBackgroundOffset();

    // 清空画布
    ctx.clearRect(0, 0, canvasSize.width, canvasSize.height);

    // 绘制
    drawBackground(ctx);
    drawGround(ctx, groundY);
    drawCharacter(ctx);
    drawControls(ctx);

    // 继续循环
    if (isPlaying) {
      animationRef.current = requestAnimationFrame(gameLoop);
    }
  }, [isPlaying, canvasSize, updateCharacter, updateBackgroundOffset, drawBackground, drawCharacter, drawGround, drawControls]);

  // 启动/停止游戏循环
  useEffect(() => {
    if (isPlaying) {
      animationRef.current = requestAnimationFrame(gameLoop);
    } else {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
        animationRef.current = null;
      }
    }

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [isPlaying, gameLoop]);

  // 重置游戏
  const handleReset = useCallback(() => {
    setCharacter({
      x: canvasSize.width / 2 - frameWidth / 2,
      y: canvasSize.height * GROUND_Y_RATIO - frameHeight,
      velocityX: 0,
      velocityY: 0,
      width: frameWidth,
      height: frameHeight,
      state: CharacterState.IDLE,
      direction: CharacterDirection.RIGHT,
      isGrounded: true,
      isAttacking: false,
      attackFrame: 0,
      currentFrame: 0,
      frameTimer: 0,
    });
    backgroundOffsetRef.current = { layer1: 0, layer2: 0, layer3: 0 };
  }, [canvasSize, frameWidth, frameHeight]);

  // 监听 P 键切换播放状态
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() === 'p') {
        setIsPlaying((prev) => !prev);
      }
    };

    window.addEventListener('keypress', handleKeyPress);
    return () => window.removeEventListener('keypress', handleKeyPress);
  }, []);

  // 更新画布大小
  useEffect(() => {
    const updateSize = () => {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        setCanvasSize({
          width: rect.width,
          height: isFullscreen ? window.innerHeight - 100 : Math.min(400, rect.width * 0.5),
        });
      }
    };

    updateSize();
    window.addEventListener('resize', updateSize);
    return () => window.removeEventListener('resize', updateSize);
  }, [isFullscreen]);

  // 初始化角色位置
  useEffect(() => {
    handleReset();
  }, [handleReset]);

  return (
    <div ref={containerRef} className={cn('flex flex-col space-y-3', className)}>
      {/* 画布区域 */}
      <div
        className={cn(
          'relative overflow-hidden rounded-lg border border-gray-700 bg-gray-900',
          isFullscreen && 'fixed inset-0 z-50 rounded-none'
        )}
      >
        <canvas
          ref={canvasRef}
          width={canvasSize.width}
          height={canvasSize.height}
          className="block"
        />

        {/* 暂停覆盖层 */}
        {!isPlaying && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/30">
            <div className="text-center">
              <p className="text-white text-lg mb-2">
                {t('sprite.sandbox.paused', 'Paused')}
              </p>
              <p className="text-gray-300 text-sm">
                {t('sprite.sandbox.pressP', 'Press P to play')}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* 控制面板 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Button
            variant={isPlaying ? 'default' : 'outline'}
            size="sm"
            onClick={() => setIsPlaying((prev) => !prev)}
          >
            {isPlaying ? (
              <>
                <Pause className="w-4 h-4 mr-1" />
                {t('sprite.sandbox.pause', 'Pause')}
              </>
            ) : (
              <>
                <Play className="w-4 h-4 mr-1" />
                {t('sprite.sandbox.play', 'Play')}
              </>
            )}
          </Button>
          <Button variant="ghost" size="sm" onClick={handleReset}>
            <RotateCcw className="w-4 h-4 mr-1" />
            {t('sprite.sandbox.reset', 'Reset')}
          </Button>
        </div>

        <div className="flex items-center space-x-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsFullscreen((prev) => !prev)}
          >
            {isFullscreen ? (
              <>
                <Minimize2 className="w-4 h-4 mr-1" />
                {t('sprite.sandbox.exitFullscreen', 'Exit Fullscreen')}
              </>
            ) : (
              <>
                <Maximize2 className="w-4 h-4 mr-1" />
                {t('sprite.sandbox.fullscreen', 'Fullscreen')}
              </>
            )}
          </Button>
        </div>
      </div>

      {/* 控制说明 */}
      <div className="text-xs text-gray-500 space-y-1">
        <p>
          <kbd className="px-1 py-0.5 bg-gray-800 rounded">W</kbd>
          <kbd className="px-1 py-0.5 bg-gray-800 rounded ml-1">A</kbd>
          <kbd className="px-1 py-0.5 bg-gray-800 rounded ml-1">S</kbd>
          <kbd className="px-1 py-0.5 bg-gray-800 rounded ml-1">D</kbd>
          {' '}- {t('sprite.sandbox.wasdHint', 'Move')}
        </p>
        <p>
          <kbd className="px-1 py-0.5 bg-gray-800 rounded">Shift</kbd>
          {' '}+ {t('sprite.sandbox.shiftHint', 'Move to run')}
        </p>
        <p>
          <kbd className="px-1 py-0.5 bg-gray-800 rounded">J</kbd>
          {' '}/
          <kbd className="px-1 py-0.5 bg-gray-800 rounded ml-1">Space</kbd>
          {' '}- {t('sprite.sandbox.attackHint', 'Attack')}
        </p>
      </div>
    </div>
  );
};
