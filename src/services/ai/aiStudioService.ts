/**
 * AIStudioToAPI 服务实现
 *
 * AIStudioService 调用流程:
 *   ├─> generateImage(request)
 *   │     ├─> 构建 contents 数组
 *   │     └─> callAPI()
 *   │           └─> extractInlineImages()
 *   ├─> editImage(request)
 *   │     ├─> buildEditPrompt()
 *   │     ├─> 构建 contents 数组
 *   │     └─> callAPI()
 *   │           └─> extractInlineImages()
 *   └─> segmentImage(request)
 *         ├─> buildSegmentationPrompt()
 *         └─> callAPI()
 *               └─> parseSegmentationResult()
 */

import { BaseAIService } from './baseService';
import type { AIServiceInterface } from './interface';
import type {
  GenerationRequest,
  EditRequest,
  SegmentationRequest,
  SegmentationResult,
  GeminiAPIResponse,
} from './types';

// AIStudioToAPI 配置
const AI_STUDIO_ENDPOINT = 'http://localhost:7860';
const AI_STUDIO_API_KEY = 'sk-cf177e3cd183c711ec8177d455f1b557fe7909b6f40dc9a9';
const AI_STUDIO_MODEL = 'gemini-2.5-flash-image';

export class AIStudioService extends BaseAIService implements AIServiceInterface {
  readonly name = 'ai-studio';

  /**
   * 调用 AIStudioToAPI
   */
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
      const contents: Array<{ text?: string; inlineData?: { mimeType: string; data: string } }> = [
        { text: this.buildSegmentationPrompt(request) },
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
}

export const aiStudioService = new AIStudioService();
