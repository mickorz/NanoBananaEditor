/**
 * AI 服务统一接口
 *
 * AIServiceInterface
 *   ├─> name                   服务名称标识
 *   ├─> generateImage()        生成图片
 *   ├─> editImage()            编辑图片
 *   └─> segmentImage()         分割图片(可选)
 */

import type {
  GenerationRequest,
  EditRequest,
  SegmentationRequest,
  SegmentationResult,
} from './types';

export interface AIServiceInterface {
  // 服务名称标识
  readonly name: string;

  // 生成图片
  generateImage(request: GenerationRequest): Promise<string[]>;

  // 编辑图片
  editImage(request: EditRequest): Promise<string[]>;

  // 分割图片(可选)
  segmentImage?(request: SegmentationRequest): Promise<SegmentationResult>;
}
