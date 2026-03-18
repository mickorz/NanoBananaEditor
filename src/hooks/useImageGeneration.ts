/**
 * 图片生成 Hook
 *
 * useImageGeneration 处理图片生成逻辑:
 *   ├─> generate()          执行生成操作
 *   ├─> isGenerating        生成状态
 *   └─> error               错误信息
 */

import { useMutation } from '@tanstack/react-query';
import { getCurrentAIService, GEMINI_IMAGE_MODEL } from '../services/ai';
import { useAppStore } from '../store/useAppStore';
import { createAsset, createProject } from '../utils/assetUtils';
import { generateId } from '../utils/imageUtils';
import type { GenerationRequest, Generation } from '../types';

/**
 * 图片生成 Hook
 */
export const useImageGeneration = () => {
  const generateMutation = useMutation({
    mutationFn: async (request: GenerationRequest) => {
      const service = getCurrentAIService();
      return service.generateImage(request);
    },
    onMutate: () => {
      useAppStore.getState().setIsGenerating(true);
    },
    onSuccess: (images, request) => {
      const state = useAppStore.getState();

      if (images.length === 0) {
        state.setIsGenerating(false);
        return;
      }

      const outputAssets = images.map((base64) => createAsset(base64, 'output'));
      const sourceAssets = (request.referenceImages ?? []).map((base64) =>
        createAsset(base64, 'original')
      );

      const generation: Generation = {
        id: generateId(),
        prompt: request.prompt,
        parameters: {
          seed: request.seed,
          temperature: request.temperature,
        },
        sourceAssets,
        outputAssets,
        modelVersion: `${GEMINI_IMAGE_MODEL} (${useAppStore.getState().aiProvider})`,
        timestamp: Date.now(),
      };

      if (state.currentProject) {
        state.addGeneration(generation);
      } else {
        state.setCurrentProject(
          createProject({
            generations: [generation],
            edits: [],
          })
        );
      }

      state.setCanvasImage(outputAssets[0].url);
      state.selectGeneration(generation.id);
      state.selectEdit(null);
      state.setIsGenerating(false);
    },
    onError: (error) => {
      console.error('生成图片失败:', error);
      useAppStore.getState().setIsGenerating(false);
    },
  });

  return {
    generate: generateMutation.mutate,
    isGenerating: generateMutation.isPending,
    error: generateMutation.error,
  };
};

// 重新导出 useImageEditing 以保持向后兼容
export { useImageEditing } from './useImageEditing';
