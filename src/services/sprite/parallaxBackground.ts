/**
 * 视差背景生成服务
 *
 * ParallaxBackground 功能:
 *   ├─> Layer 1: 远景 (天空、山脉)
 *   ├─> Layer 2: 中景 (建筑、树木)
 *   └─> Layer 3: 近景 (地面、前景)
 */

export interface ParallaxBackgroundLayers {
  layer1Url: string | null; // 远景
  layer2Url: string | null; // 中景
  layer3Url: string | null; // 近景
}

export interface ParallaxBackgroundConfig {
  characterDescription: string;
  style: 'fantasy' | 'scifi' | 'nature' | 'urban' | 'dungeon';
  timeOfDay: 'day' | 'sunset' | 'night';
  width?: number;
  height?: number;
}

// 各层视差滚动速度
export const PARALLAX_SPEEDS = {
  layer1: 0.1, // 远景 - 最慢
  layer2: 0.3, // 中景 - 中等
  layer3: 0.6, // 近景 - 最快
};

// 背景风格提示词
export const BACKGROUND_STYLE_PROMPTS: Record<string, string> = {
  fantasy: 'fantasy medieval world, magical kingdom, enchanted forest',
  scifi: 'science fiction cyberpunk city, futuristic metropolis, neon lights',
  nature: 'natural wilderness, lush forest, peaceful countryside',
  urban: 'modern city urban environment, skyscrapers, street scene',
  dungeon: 'dark dungeon caves, underground ruins, ominous atmosphere',
};

// 时间提示词
export const TIME_OF_DAY_PROMPTS: Record<string, string> = {
  day: 'bright daylight, sunny day, clear sky',
  sunset: 'golden hour sunset, warm orange sky, twilight',
  night: 'nighttime, starry sky, moonlight, dark atmosphere',
};

// 各层提示词模板
export const LAYER_PROMPTS = {
  layer1: (style: string, time: string, characterDesc: string) => `
Create a parallax background layer 1 (far background/sky) for a side-scrolling game.
Character: ${characterDesc}
Style: ${style}
Time: ${time}

Requirements:
- Sky, distant mountains, clouds, atmospheric effects
- No visible ground
- Seamless horizontally tileable
- Width: 800px, Height: 400px
- PNG format with smooth edges
- Calm, static elements only
- Pastel/muted colors for distance effect
`.trim(),

  layer2: (style: string, time: string, characterDesc: string) => `
Create a parallax background layer 2 (mid-ground) for a side-scrolling game.
Character: ${characterDesc}
Style: ${style}
Time: ${time}

Requirements:
- Mid-distance elements: buildings, trees, rocks, structures
- Partial ground coverage allowed
- Seamless horizontally tileable
- Width: 800px, Height: 400px
- PNG format
- Some detail but not too sharp
- Matches layer 1 color palette
`.trim(),

  layer3: (style: string, time: string, characterDesc: string) => `
Create a parallax background layer 3 (near-ground/foreground) for a side-scrolling game.
Character: ${characterDesc}
Style: ${style}
Time: ${time}

Requirements:
- Ground plane, platforms, foreground elements
- Detailed grass, stones, paths, decorative elements
- Seamless horizontally tileable
- Width: 800px, Height: 400px
- PNG format
- Sharp details, clear silhouette
- Matches the character's visual style
- Walking/jumping surface visible
`.trim(),
};

/**
 * 视差背景生成器类
 */
export class ParallaxBackgroundGenerator {
  private generateImage: (prompt: string, referenceImages?: string[]) => Promise<string[]>;

  constructor(generateImageFn: (prompt: string, referenceImages?: string[]) => Promise<string[]>) {
    this.generateImage = generateImageFn;
  }

  /**
   * 生成所有3层背景
   */
  async generateAllLayers(
    config: ParallaxBackgroundConfig,
    onProgress?: (layer: number, status: 'generating' | 'completed') => void
  ): Promise<ParallaxBackgroundLayers> {
    const stylePrompt = BACKGROUND_STYLE_PROMPTS[config.style] || BACKGROUND_STYLE_PROMPTS.fantasy;
    const timePrompt = TIME_OF_DAY_PROMPTS[config.timeOfDay] || TIME_OF_DAY_PROMPTS.day;

    const layers: ParallaxBackgroundLayers = {
      layer1Url: null,
      layer2Url: null,
      layer3Url: null,
    };

    // 生成 Layer 1 (远景)
    try {
      onProgress?.(1, 'generating');
      const layer1Prompt = LAYER_PROMPTS.layer1(stylePrompt, timePrompt, config.characterDescription);
      const results1 = await this.generateImage(layer1Prompt);
      if (results1.length > 0) {
        layers.layer1Url = results1[0];
      }
      onProgress?.(1, 'completed');
    } catch (error) {
      console.error('Failed to generate layer 1:', error);
    }

    // 生成 Layer 2 (中景)
    try {
      onProgress?.(2, 'generating');
      const layer2Prompt = LAYER_PROMPTS.layer2(stylePrompt, timePrompt, config.characterDescription);
      const results2 = await this.generateImage(layer2Prompt);
      if (results2.length > 0) {
        layers.layer2Url = results2[0];
      }
      onProgress?.(2, 'completed');
    } catch (error) {
      console.error('Failed to generate layer 2:', error);
    }

    // 生成 Layer 3 (近景)
    try {
      onProgress?.(3, 'generating');
      const layer3Prompt = LAYER_PROMPTS.layer3(stylePrompt, timePrompt, config.characterDescription);
      const results3 = await this.generateImage(layer3Prompt);
      if (results3.length > 0) {
        layers.layer3Url = results3[0];
      }
      onProgress?.(3, 'completed');
    } catch (error) {
      console.error('Failed to generate layer 3:', error);
    }

    return layers;
  }

  /**
   * 重新生成单个层
   */
  async regenerateLayer(
    layerNumber: 1 | 2 | 3,
    config: ParallaxBackgroundConfig
  ): Promise<string | null> {
    const stylePrompt = BACKGROUND_STYLE_PROMPTS[config.style] || BACKGROUND_STYLE_PROMPTS.fantasy;
    const timePrompt = TIME_OF_DAY_PROMPTS[config.timeOfDay] || TIME_OF_DAY_PROMPTS.day;

    const promptFn = layerNumber === 1 ? LAYER_PROMPTS.layer1 : layerNumber === 2 ? LAYER_PROMPTS.layer2 : LAYER_PROMPTS.layer3;
    const prompt = promptFn(stylePrompt, timePrompt, config.characterDescription);

    try {
      const results = await this.generateImage(prompt);
      return results.length > 0 ? results[0] : null;
    } catch (error) {
      console.error(`Failed to regenerate layer ${layerNumber}:`, error);
      return null;
    }
  }
}
