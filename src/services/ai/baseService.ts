/**
 * AI 服务基础抽象类
 *
 * BaseAIService 公共逻辑:
 *   ├─> buildEditPrompt()          构建编辑提示词
 *   ├─> buildSegmentationPrompt()  构建分割提示词
 *   ├─> extractInlineImages()      提取返回图片
 *   ├─> extractText()              提取文本响应
 *   ├─> parseSegmentationResult()  解析分割结果
 *   └─> parseMask()                解析蒙版数据
 */

import type {
  EditRequest,
  SegmentationRequest,
  GeminiAPIResponse,
  SegmentationResult,
} from './types';

export abstract class BaseAIService {
  // 子类需要实现的抽象方法
  abstract readonly name: string;
  abstract generateImage(request: { prompt: string; referenceImages?: string[]; temperature?: number; seed?: number }): Promise<string[]>;
  abstract editImage(request: EditRequest): Promise<string[]>;

  /**
   * 构建编辑提示词
   */
  protected buildEditPrompt(request: EditRequest): string {
    const maskInstruction = request.maskImage
      ? '\n\nIMPORTANT: Apply changes ONLY where the mask image shows white pixels (value 255). Leave all other areas completely unchanged. Respect the mask boundaries precisely and maintain seamless blending at the edges.'
      : '';

    return `Edit this image according to the following instruction: ${request.instruction}

Maintain the original image's lighting, perspective, and overall composition. Make the changes look natural and seamlessly integrated.${maskInstruction}

Preserve image quality and ensure the edit looks natural and realistic.`;
  }

  /**
   * 构建分割提示词
   */
  protected buildSegmentationPrompt(request: SegmentationRequest): string {
    return `Analyze this image and create a segmentation mask for: ${request.query}

Return a JSON object with this exact structure:
{
  "masks": [
    {
      "label": "description of the segmented object",
      "box_2d": [x, y, width, height],
      "mask": "base64-encoded binary mask image"
    }
  ]
}

Only segment the specific object or region requested. The mask should be a binary PNG where white pixels (255) indicate the selected region and black pixels (0) indicate the background.`;
  }

  /**
   * 从响应中提取图片数据
   */
  protected extractInlineImages(response: GeminiAPIResponse): string[] {
    const parts = response.candidates?.[0]?.content?.parts;
    if (!parts || parts.length === 0) {
      throw new Error('API 返回了空响应');
    }

    return parts
      .map((part) => part.inlineData?.data)
      .filter((data): data is string => typeof data === 'string' && data.length > 0);
  }

  /**
   * 从响应中提取文本
   */
  protected extractText(response: GeminiAPIResponse): string {
    const parts = response.candidates?.[0]?.content?.parts;
    if (!parts || parts.length === 0) {
      throw new Error('API 返回了空响应');
    }

    const text = parts
      .map((part) => part.text)
      .find((value): value is string => typeof value === 'string' && value.length > 0);

    if (!text) {
      throw new Error('API 没有返回文本结果');
    }

    return text;
  }

  /**
   * 解析分割结果
   */
  protected parseSegmentationResult(responseText: string): SegmentationResult {
    const parsed: unknown = JSON.parse(responseText);
    if (!parsed || typeof parsed !== 'object' || !Array.isArray((parsed as { masks?: unknown }).masks)) {
      throw new Error('分割结果格式不正确');
    }

    return {
      masks: (parsed as { masks: unknown[] }).masks.map((mask) => this.parseMask(mask)),
    };
  }

  /**
   * 解析单个蒙版数据
   */
  private parseMask(mask: unknown): SegmentationResult['masks'][number] {
    if (!mask || typeof mask !== 'object') {
      throw new Error('分割结果缺少蒙版对象');
    }

    const candidate = mask as {
      label?: unknown;
      box_2d?: unknown;
      mask?: unknown;
    };

    if (typeof candidate.label !== 'string' || typeof candidate.mask !== 'string') {
      throw new Error('分割结果字段类型不正确');
    }

    if (
      !Array.isArray(candidate.box_2d) ||
      candidate.box_2d.length !== 4 ||
      candidate.box_2d.some((value) => typeof value !== 'number')
    ) {
      throw new Error('分割结果边界框格式不正确');
    }

    return {
      label: candidate.label,
      box_2d: candidate.box_2d as [number, number, number, number],
      mask: candidate.mask,
    };
  }
}
