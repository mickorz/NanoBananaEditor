/**
 * 精灵图组件导出
 *
 * sprite 组件:
 *   ├─> SpritePreview          精灵图预览
 *   ├─> AnimationPlayer        动画播放器
 *   ├─> FrameExtractor         帧提取器
 *   ├─> GridSplitter           可视化网格分割器
 *   ├─> ParallaxBackgroundPanel 视差背景面板
 *   ├─> WorkflowStepper        工作流步骤器
 *   └─> SpriteGenerationPanel  精灵图生成面板
 */

export { SpritePreview } from './SpritePreview';
export { AnimationPlayer } from './AnimationPlayer';
export { FrameExtractor } from './FrameExtractor';
export { GridSplitter, type GridFrame } from './GridSplitter';
export { ParallaxBackgroundPanel } from './ParallaxBackgroundPanel';
export { WorkflowStepper, type WorkflowStep } from './WorkflowStepper';
export {
  SpriteGenerationPanel,
  type SpriteGenerationConfig,
} from './SpriteGenerationPanel';
export {
  SpriteSandbox,
  type AnimationFrames,
  CharacterState,
  CharacterDirection,
} from './SpriteSandbox';

// 导出服务类型
export type {
  ParallaxBackgroundLayers,
  ParallaxBackgroundConfig,
} from '../../services/sprite/parallaxBackground';
export { ParallaxBackgroundGenerator } from '../../services/sprite/parallaxBackground';
