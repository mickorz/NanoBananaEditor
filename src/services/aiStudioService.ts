/**
 * AIStudioToAPI 服务实现
 *
 * AIStudioService 调用流程:
 *   ├─> generateImage(request)
 *   │     ├─> buildGenerateContents()  构建生成请求内容
 *   │     └─> callAPI()               调用 API
 *   │           └─> extractInlineImages()  提取返回图片
 *   ├─> editImage(request)
 *   │     ├─> buildEditPrompt()       构建编辑提示词
 *   │     ├─> buildEditContents()     构建编辑请求内容
 *   │     └─> callAPI()               调用 API
 *   │           └─> extractInlineImages()  提取返回图片
 *   └─> segmentImage(request)
 *         ├─> buildSegmentationPrompt()  构建分割提示词
 *         └─> callAPI()
 *               └─> parseSegmentationResult()  解析分割结果
 */

import type { AIServiceInterface } from './aiServiceInterface';
import {
  type GenerationRequest,
  type EditRequest,
  type SegmentationRequest,
  type SegmentationResult,
} from './geminiService';

// AIStudioToAPI 配置
const AI_STUDIO_ENDPOINT = 'http://localhost:7860';
const AI_STUDIO_API_KEY = 'sk-cf177e3cd183c711ec8177d455f1b557fe7909b6f40dc9a9';
const AI_STUDIO_MODEL = 'gemini-2.5-flash-image';

interface GeminiAPIResponse {
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

export class AIStudioService implements AIServiceInterface {
  readonly name = 'ai-studio';

  private async callAPI(contents: Array<{ text?: string; inlineData?: { mimeType: string; data: string } }>): Promise<GeminiAPIResponse> {
    const url = `${AI_STUDIO_ENDPOINT}/v1beta/models/${AI_STUDIO_MODEL}:generateContent`;

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': AI_STUDIO_API_KEY,
      },
      body: JSON.stringify({
        contents: [
          {
            parts: contents,
          },
        ],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('AIStudioToAPI 请求失败:', errorText);
      throw new Error(`AIStudioToAPI 请求失败: ${response.status} ${response.statusText}`);
    }

    return response.json();
  }

  async generateImage(request: GenerationRequest): Promise<string[]> {
    try {
      const contents: Array<{ text?: string; inlineData?: { mimeType: string; data: string } }> = [
        { text: request.prompt },
      ];

      request.referenceImages?.forEach((image) => {
        contents.push({
          inlineData: {
            mimeType: 'image/png',
            data: image,
          },
        });
      });

      const response = await this.callAPI(contents);
      return this.extractInlineImages(response);
    } catch (error) {
      console.error('调用 AIStudioToAPI 生成图片失败:', error);
      throw new Error('Failed to generate image via AIStudioToAPI. Please try again.');
    }
  }

  async editImage(request: EditRequest): Promise<string[]> {
    try {
      const contents: Array<{ text?: string; inlineData?: { mimeType: string; data: string } }> = [
        { text: this.buildEditPrompt(request) },
        {
          inlineData: {
            mimeType: 'image/png',
            data: request.originalImage,
          },
        },
      ];

      request.referenceImages?.forEach((image) => {
        contents.push({
          inlineData: {
            mimeType: 'image/png',
            data: image,
          },
        });
      });

      if (request.maskImage) {
        contents.push({
          inlineData: {
            mimeType: 'image/png',
            data: request.maskImage,
          },
        });
      }

      const response = await this.callAPI(contents);
      return this.extractInlineImages(response);
    } catch (error) {
      console.error('调用 AIStudioToAPI 编辑图片失败:', error);
      throw new Error('Failed to edit image via AIStudioToAPI. Please try again.');
    }
  }

  async segmentImage(request: SegmentationRequest): Promise<SegmentationResult> {
    try {
      const prompt = `Analyze this image and create a segmentation mask for: ${request.query}

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

      const contents: Array<{ text?: string; inlineData?: { mimeType: string; data: string } }> = [
        { text: prompt },
        {
          inlineData: {
            mimeType: 'image/png',
            data: request.image,
          },
        },
      ];

      const response = await this.callAPI(contents);
      const responseText = this.extractText(response);
      return this.parseSegmentationResult(responseText);
    } catch (error) {
      console.error('调用 AIStudioToAPI 分割图片失败:', error);
      throw new Error('Failed to segment image via AIStudioToAPI. Please try again.');
    }
  }

  private extractInlineImages(response: GeminiAPIResponse): string[] {
    const parts = response.candidates?.[0]?.content?.parts;
    if (!parts || parts.length === 0) {
      throw new Error('AIStudioToAPI 返回了空响应');
    }

    return parts
      .map((part) => part.inlineData?.data)
      .filter((data): data is string => typeof data === 'string' && data.length > 0);
  }

  private extractText(response: GeminiAPIResponse): string {
    const parts = response.candidates?.[0]?.content?.parts;
    if (!parts || parts.length === 0) {
      throw new Error('AIStudioToAPI 返回了空响应');
    }

    const text = parts
      .map((part) => part.text)
      .find((value): value is string => typeof value === 'string' && value.length > 0);

    if (!text) {
      throw new Error('AIStudioToAPI 没有返回文本结果');
    }

    return text;
  }

  private parseSegmentationResult(responseText: string): SegmentationResult {
    const parsed: unknown = JSON.parse(responseText);
    if (!parsed || typeof parsed !== 'object' || !Array.isArray((parsed as { masks?: unknown }).masks)) {
      throw new Error('AIStudioToAPI 分割结果格式不正确');
    }

    return {
      masks: (parsed as { masks: unknown[] }).masks.map((mask) => this.parseMask(mask)),
    };
  }

  private parseMask(mask: unknown): SegmentationResult['masks'][number] {
    if (!mask || typeof mask !== 'object') {
      throw new Error('AIStudioToAPI 分割结果缺少蒙版对象');
    }

    const candidate = mask as {
      label?: unknown;
      box_2d?: unknown;
      mask?: unknown;
    };

    if (typeof candidate.label !== 'string' || typeof candidate.mask !== 'string') {
      throw new Error('AIStudioToAPI 分割结果字段类型不正确');
    }

    if (
      !Array.isArray(candidate.box_2d) ||
      candidate.box_2d.length !== 4 ||
      candidate.box_2d.some((value) => typeof value !== 'number')
    ) {
      throw new Error('AIStudioToAPI 分割结果边界框格式不正确');
    }

    return {
      label: candidate.label,
      box_2d: candidate.box_2d as [number, number, number, number],
      mask: candidate.mask,
    };
  }

  private buildEditPrompt(request: EditRequest): string {
    const maskInstruction = request.maskImage
      ? '\n\nIMPORTANT: Apply changes ONLY where the mask image shows white pixels (value 255). Leave all other areas completely unchanged. Respect the mask boundaries precisely and maintain seamless blending at the edges.'
      : '';

    return `Edit this image according to the following instruction: ${request.instruction}

Maintain the original image's lighting, perspective, and overall composition. Make the changes look natural and seamlessly integrated.${maskInstruction}

Preserve image quality and ensure the edit looks professional and realistic.`;
  }
}

export const aiStudioService = new AIStudioService();
