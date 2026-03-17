import { GoogleGenAI, type Part } from '@google/genai';

const API_KEY = import.meta.env.VITE_GEMINI_API_KEY || 'demo-key';
export const GEMINI_IMAGE_MODEL = 'gemini-2.5-flash-image';
const genAI = new GoogleGenAI({ apiKey: API_KEY });

interface GeminiResponseLike {
  candidates?: Array<{
    content?: {
      parts?: Part[];
    };
  }>;
}

export interface GenerationRequest {
  prompt: string;
  referenceImages?: string[];
  temperature?: number;
  seed?: number;
}

export interface EditRequest {
  instruction: string;
  originalImage: string;
  referenceImages?: string[];
  maskImage?: string;
  temperature?: number;
  seed?: number;
}

export interface SegmentationRequest {
  image: string;
  query: string;
}

export interface SegmentationResult {
  masks: Array<{
    label: string;
    box_2d: [number, number, number, number];
    mask: string;
  }>;
}

export class GeminiService {
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

      return this.extractInlineImages(response);
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

      return this.extractInlineImages(response);
    } catch (error) {
      console.error('调用 Gemini 编辑图片失败:', error);
      throw new Error('Failed to edit image. Please try again.');
    }
  }

  async segmentImage(request: SegmentationRequest): Promise<SegmentationResult> {
    try {
      const prompt: Part[] = [
        {
          text: `Analyze this image and create a segmentation mask for: ${request.query}

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

Only segment the specific object or region requested. The mask should be a binary PNG where white pixels (255) indicate the selected region and black pixels (0) indicate the background.`,
        },
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

      const responseText = this.extractText(response);
      return this.parseSegmentationResult(responseText);
    } catch (error) {
      console.error('调用 Gemini 分割图片失败:', error);
      throw new Error('Failed to segment image. Please try again.');
    }
  }

  private extractResponseParts(response: GeminiResponseLike): Part[] {
    const parts = response.candidates?.[0]?.content?.parts;
    if (!parts || parts.length === 0) {
      throw new Error('Gemini 返回了空响应');
    }

    return parts;
  }

  private extractInlineImages(response: GeminiResponseLike): string[] {
    return this.extractResponseParts(response)
      .map((part) => part.inlineData?.data)
      .filter((data): data is string => typeof data === 'string' && data.length > 0);
  }

  private extractText(response: GeminiResponseLike): string {
    const text = this.extractResponseParts(response)
      .map((part) => part.text)
      .find((value): value is string => typeof value === 'string' && value.length > 0);

    if (!text) {
      throw new Error('Gemini 没有返回文本结果');
    }

    return text;
  }

  private parseSegmentationResult(responseText: string): SegmentationResult {
    const parsed: unknown = JSON.parse(responseText);
    if (!parsed || typeof parsed !== 'object' || !Array.isArray((parsed as { masks?: unknown }).masks)) {
      throw new Error('Gemini 分割结果格式不正确');
    }

    return {
      masks: (parsed as { masks: unknown[] }).masks.map((mask) => this.parseMask(mask)),
    };
  }

  private parseMask(mask: unknown): SegmentationResult['masks'][number] {
    if (!mask || typeof mask !== 'object') {
      throw new Error('Gemini 分割结果缺少蒙版对象');
    }

    const candidate = mask as {
      label?: unknown;
      box_2d?: unknown;
      mask?: unknown;
    };

    if (typeof candidate.label !== 'string' || typeof candidate.mask !== 'string') {
      throw new Error('Gemini 分割结果字段类型不正确');
    }

    if (
      !Array.isArray(candidate.box_2d) ||
      candidate.box_2d.length !== 4 ||
      candidate.box_2d.some((value) => typeof value !== 'number')
    ) {
      throw new Error('Gemini 分割结果边界框格式不正确');
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

export const geminiService = new GeminiService();
