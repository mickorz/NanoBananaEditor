/**
 * Gemini API 服务实现
 *
 * GeminiService 调用流程:
 *   ├─> generateImage(request)
 *   │     ├─> 构建 Part[] 内容
 *   │     └─> genAI.models.generateContent()
 *   │           └─> extractInlineImages()
 *   ├─> editImage(request)
 *   │     ├─> buildEditPrompt()
 *   │     ├─> 构建 Part[] 内容
 *   │     └─> genAI.models.generateContent()
 *   │           └─> extractInlineImages()
 *   └─> segmentImage(request)
 *         ├─> buildSegmentationPrompt()
 *         └─> genAI.models.generateContent()
 *               └─> parseSegmentationResult()
 */

import { GoogleGenAI, type Part } from '@google/genai';
import { BaseAIService } from './baseService';
import type { AIServiceInterface } from './interface';
import type {
  GenerationRequest,
  EditRequest,
  SegmentationRequest,
  SegmentationResult,
  GeminiAPIResponse,
} from './types';

const API_KEY = import.meta.env.VITE_GEMINI_API_KEY || 'demo-key';
export const GEMINI_IMAGE_MODEL = 'gemini-2.5-flash-image';
const genAI = new GoogleGenAI({ apiKey: API_KEY });

export class GeminiService extends BaseAIService implements AIServiceInterface {
  readonly name = 'gemini';

  async generateImage(request: GenerationRequest): Promise<string[]> {
    try {
      const contents: Part[] = [{ text: request.prompt }];

      request.referenceImages?.forEach((image) => {
        contents.push({
          inlineData: {
            mimeType: 'image/png',
            data: image,
          },
        });
      });

      const response = await genAI.models.generateContent({
        model: GEMINI_IMAGE_MODEL,
        contents,
      });

      return this.extractInlineImages(response as unknown as GeminiAPIResponse);
    } catch (error) {
      console.error('调用 Gemini 生成图片失败:', error);
      throw new Error('Failed to generate image. Please try again.');
    }
  }

  async editImage(request: EditRequest): Promise<string[]> {
    try {
      const contents: Part[] = [
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

      const response = await genAI.models.generateContent({
        model: GEMINI_IMAGE_MODEL,
        contents,
      });

      return this.extractInlineImages(response as unknown as GeminiAPIResponse);
    } catch (error) {
      console.error('调用 Gemini 编辑图片失败:', error);
      throw new Error('Failed to edit image. Please try again.');
    }
  }

  async segmentImage(request: SegmentationRequest): Promise<SegmentationResult> {
    try {
      const prompt: Part[] = [
        { text: this.buildSegmentationPrompt(request) },
        {
          inlineData: {
            mimeType: 'image/png',
            data: request.image,
          },
        },
      ];

      const response = await genAI.models.generateContent({
        model: GEMINI_IMAGE_MODEL,
        contents: prompt,
      });

      const responseText = this.extractText(response as unknown as GeminiAPIResponse);
      return this.parseSegmentationResult(responseText);
    } catch (error) {
      console.error('调用 Gemini 分割图片失败:', error);
      throw new Error('Failed to segment image. Please try again.');
    }
  }
}

export const geminiService = new GeminiService();
