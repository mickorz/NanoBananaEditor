/**
 * AI 服务统一接口
 *
 * AIServiceInterface
 *   ├─> generateImage(request)    生成图片
 *   ├─> editImage(request)        编辑图片
 *   └─> segmentImage(request)     分割图片(可选)
 */

import { GenerationRequest, EditRequest, SegmentationRequest, SegmentationResult } from './geminiService';

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
