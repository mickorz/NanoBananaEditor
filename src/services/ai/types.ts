/**
 * AI 服务类型定义
 *
 * 类型结构:
 *   ├─> GenerationRequest     生成图片请求
 *   ├─> EditRequest           编辑图片请求
 *   ├─> SegmentationRequest   分割图片请求
 *   └─> SegmentationResult    分割结果
 */

// 生成图片请求
export interface GenerationRequest {
  prompt: string;
  referenceImages?: string[];
  temperature?: number;
  seed?: number;
}

// 编辑图片请求
export interface EditRequest {
  instruction: string;
  originalImage: string;
  referenceImages?: string[];
  maskImage?: string;
  temperature?: number;
  seed?: number;
}

// 分割图片请求
export interface SegmentationRequest {
  image: string;
  query: string;
}

// 分割结果
export interface SegmentationResult {
  masks: Array<{
    label: string;
    box_2d: [number, number, number, number];
    mask: string;
  }>;
}

// Gemini API 响应结构
export interface GeminiAPIResponse {
  candidates?: Array<{
    content?: {
      parts?: Array<{
        text?: string;
        inlineData?: {
          mimeType: string;
          data: string;
        };
      }>;
    };
  }>;
}
