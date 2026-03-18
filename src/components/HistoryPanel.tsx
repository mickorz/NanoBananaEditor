import React from 'react';
import { useTranslation } from 'react-i18next';
import { History, Download, Image as ImageIcon } from 'lucide-react';
import { useAppStore } from '../store/useAppStore';
import { Button } from './ui/Button';
import { cn } from '../utils/cn';
import { ImagePreviewModal } from './ImagePreviewModal';

export const HistoryPanel: React.FC = () => {
  const { t } = useTranslation();
  const {
    currentProject,
    canvasImage,
    selectedGenerationId,
    selectedEditId,
    selectGeneration,
    selectEdit,
    showHistory,
    setShowHistory,
    setCanvasImage,
    selectedTool,
  } = useAppStore();

  const [previewModal, setPreviewModal] = React.useState<{
    open: boolean;
    imageUrl: string;
    title: string;
    description?: string;
  }>({
    open: false,
    imageUrl: '',
    title: '',
    description: '',
  });
  const [imageDimensions, setImageDimensions] = React.useState<{
    width: number;
    height: number;
  } | null>(null);

  const generations = currentProject?.generations ?? [];
  const edits = currentProject?.edits ?? [];
  const selectedGeneration = generations.find((generation) => generation.id === selectedGenerationId);
  const selectedEdit = edits.find((edit) => edit.id === selectedEditId);

  React.useEffect(() => {
    if (!canvasImage) {
      setImageDimensions(null);
      return;
    }

    const img = new Image();
    img.onload = () => {
      setImageDimensions({ width: img.width, height: img.height });
    };
    img.src = canvasImage;
  }, [canvasImage]);

  const openPreview = (imageUrl: string, title: string, description?: string) => {
    setPreviewModal({
      open: true,
      imageUrl,
      title,
      description,
    });
  };

  const getCurrentImageUrl = () => {
    if (selectedGeneration) {
      return selectedGeneration.outputAssets[0]?.url ?? null;
    }

    if (selectedEdit) {
      return selectedEdit.outputAssets[0]?.url ?? null;
    }

    return canvasImage;
  };

  const handleDownload = async () => {
    const imageUrl = getCurrentImageUrl();
    if (!imageUrl) {
      return;
    }

    if (imageUrl.startsWith('data:')) {
      const link = document.createElement('a');
      link.href = imageUrl;
      link.download = `nano-banana-${Date.now()}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      return;
    }

    const response = await fetch(imageUrl);
    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `nano-banana-${Date.now()}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  if (!showHistory) {
    return (
      <div className="w-8 bg-gray-950 border-l border-gray-800 flex flex-col items-center justify-center">
        <button
          onClick={() => setShowHistory(true)}
          className="w-6 h-16 bg-gray-800 hover:bg-gray-700 rounded-l-lg border border-r-0 border-gray-700 flex items-center justify-center transition-colors group"
          title={t('historyPanel.showHistoryPanel')}
        >
          <div className="flex flex-col space-y-1">
            <div className="w-1 h-1 bg-gray-500 group-hover:bg-gray-400 rounded-full" />
            <div className="w-1 h-1 bg-gray-500 group-hover:bg-gray-400 rounded-full" />
            <div className="w-1 h-1 bg-gray-500 group-hover:bg-gray-400 rounded-full" />
          </div>
        </button>
      </div>
    );
  }

  return (
    <div className="w-80 bg-gray-950 border-l border-gray-800 p-6 flex flex-col h-full">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-2">
          <History className="h-5 w-5 text-gray-400" />
          <h3 className="text-sm font-medium text-gray-300">{t('historyPanel.title')}</h3>
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setShowHistory(false)}
          className="h-6 w-6"
          title={t('historyPanel.hideHistoryPanel')}
        >
          x
        </Button>
      </div>

      <div className="mb-6 flex-shrink-0">
        <h4 className="text-xs font-medium text-gray-400 mb-3">{t('historyPanel.currentVariants')}</h4>
        {generations.length === 0 && edits.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-sm text-gray-500">{t('historyPanel.noGenerations')}</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {generations.slice(-2).map((generation, index) => (
              <div
                key={generation.id}
                className={cn(
                  'relative aspect-square rounded-lg border-2 cursor-pointer transition-all duration-200 overflow-hidden',
                  selectedGenerationId === generation.id
                    ? 'border-yellow-400'
                    : 'border-gray-700 hover:border-gray-600'
                )}
                onClick={() => {
                  selectGeneration(generation.id);
                  selectEdit(null);
                  if (generation.outputAssets[0]) {
                    setCanvasImage(generation.outputAssets[0].url);
                  }
                }}
              >
                {generation.outputAssets[0] ? (
                  <img
                    src={generation.outputAssets[0].url}
                    alt={t('historyPanel.generatedVariant')}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full bg-gray-800 flex items-center justify-center">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-yellow-400" />
                  </div>
                )}
                <div className="absolute top-2 left-2 bg-gray-900/80 text-xs px-2 py-1 rounded">
                  #{index + 1}
                </div>
              </div>
            ))}

            {edits.slice(-2).map((edit, index) => (
              <div
                key={edit.id}
                className={cn(
                  'relative aspect-square rounded-lg border-2 cursor-pointer transition-all duration-200 overflow-hidden',
                  selectedEditId === edit.id
                    ? 'border-yellow-400'
                    : 'border-gray-700 hover:border-gray-600'
                )}
                onClick={() => {
                  if (edit.outputAssets[0]) {
                    setCanvasImage(edit.outputAssets[0].url);
                    selectEdit(edit.id);
                    selectGeneration(null);
                  }
                }}
              >
                {edit.outputAssets[0] ? (
                  <img
                    src={edit.outputAssets[0].url}
                    alt={t('historyPanel.editedVariant')}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full bg-gray-800 flex items-center justify-center">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-yellow-400" />
                  </div>
                )}
                <div className="absolute top-2 left-2 bg-purple-900/80 text-xs px-2 py-1 rounded">
                  {t('historyPanel.edit')} #{index + 1}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {(canvasImage || imageDimensions) && (
        <div className="mb-4 p-3 bg-gray-900 rounded-lg border border-gray-700">
          <h4 className="text-xs font-medium text-gray-400 mb-2">{t('historyPanel.currentImage')}</h4>
          <div className="space-y-1 text-xs text-gray-500">
            {imageDimensions && (
              <div className="flex justify-between">
                <span>{t('historyPanel.dimensions')}:</span>
                <span className="text-gray-300">{imageDimensions.width} x {imageDimensions.height}</span>
              </div>
            )}
            <div className="flex justify-between">
              <span>{t('historyPanel.mode')}:</span>
              <span className="text-gray-300 capitalize">{selectedTool}</span>
            </div>
          </div>
        </div>
      )}

      <div className="mb-6 p-4 bg-gray-900 rounded-lg border border-gray-700 flex-1 overflow-y-auto min-h-0">
        <h4 className="text-xs font-medium text-gray-400 mb-2">{t('historyPanel.generationDetails')}</h4>

        {selectedGeneration && (
          <div className="space-y-3">
            <div className="space-y-2 text-xs text-gray-500">
              <div>
                <span className="text-gray-400">{t('historyPanel.prompt')}:</span>
                <p className="text-gray-300 mt-1">{selectedGeneration.prompt}</p>
              </div>
              <div className="flex justify-between">
                <span>{t('historyPanel.model')}:</span>
                <span>{selectedGeneration.modelVersion}</span>
              </div>
              {selectedGeneration.parameters.seed && (
                <div className="flex justify-between">
                  <span>{t('historyPanel.seed')}:</span>
                  <span>{selectedGeneration.parameters.seed}</span>
                </div>
              )}
            </div>

            {selectedGeneration.sourceAssets.length > 0 && (
              <div>
                <h5 className="text-xs font-medium text-gray-400 mb-2">{t('historyPanel.referenceImages')}</h5>
                <div className="grid grid-cols-2 gap-2">
                  {selectedGeneration.sourceAssets.map((asset, index) => (
                    <button
                      key={asset.id}
                      onClick={() =>
                        openPreview(
                          asset.url,
                          `${t('historyPanel.referenceImage')} ${index + 1}`,
                          t('historyPanel.referenceImageDesc')
                        )
                      }
                      className="relative aspect-square rounded border border-gray-700 hover:border-gray-600 transition-colors overflow-hidden group"
                    >
                      <img
                        src={asset.url}
                        alt={`${t('promptComposer.reference')} ${index + 1}`}
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                        <ImageIcon className="h-4 w-4 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                      </div>
                      <div className="absolute bottom-1 left-1 bg-gray-900/80 text-xs px-1 py-0.5 rounded text-gray-300">
                        {t('promptComposer.reference')} {index + 1}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {!selectedGeneration && selectedEdit && (
          <div className="space-y-3">
            <div className="space-y-2 text-xs text-gray-500">
              <div>
                <span className="text-gray-400">{t('historyPanel.editInstruction')}:</span>
                <p className="text-gray-300 mt-1">{selectedEdit.instruction}</p>
              </div>
              <div className="flex justify-between">
                <span>{t('historyPanel.type')}:</span>
                <span>{t('historyPanel.imageEdit')}</span>
              </div>
              <div className="flex justify-between">
                <span>{t('historyPanel.created')}:</span>
                <span>{new Date(selectedEdit.timestamp).toLocaleTimeString()}</span>
              </div>
              {selectedEdit.maskAssetId && (
                <div className="flex justify-between">
                  <span>{t('historyPanel.mask')}:</span>
                  <span className="text-purple-400">{t('historyPanel.maskApplied')}</span>
                </div>
              )}
            </div>

            {(() => {
              const parentGeneration = generations.find(
                (generation) => generation.id === selectedEdit.parentGenerationId
              );
              return parentGeneration ? (
                <div>
                  <h5 className="text-xs font-medium text-gray-400 mb-2">{t('historyPanel.originalImage')}</h5>
                  <button
                    onClick={() =>
                      openPreview(
                        parentGeneration.outputAssets[0]?.url ?? '',
                        t('historyPanel.originalImage'),
                        t('historyPanel.originalImageDesc')
                      )
                    }
                    className="relative aspect-square w-16 rounded border border-gray-700 hover:border-gray-600 transition-colors overflow-hidden group"
                  >
                    <img
                      src={parentGeneration.outputAssets[0]?.url}
                      alt={t('historyPanel.originalImage')}
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                      <ImageIcon className="h-3 w-3 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                  </button>
                </div>
              ) : null;
            })()}

            {selectedEdit.maskReferenceAsset &&
              (() => {
                const maskReferenceAsset = selectedEdit.maskReferenceAsset;

                return (
                  <div>
                    <h5 className="text-xs font-medium text-gray-400 mb-2">{t('historyPanel.maskedReference')}</h5>
                    <button
                      onClick={() =>
                        openPreview(
                          maskReferenceAsset.url,
                          t('historyPanel.maskedReference'),
                          t('historyPanel.maskedReferenceDesc')
                        )
                      }
                      className="relative aspect-square w-16 rounded border border-gray-700 hover:border-gray-600 transition-colors overflow-hidden group"
                    >
                      <img
                        src={maskReferenceAsset.url}
                        alt={t('historyPanel.maskedReference')}
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                        <ImageIcon className="h-3 w-3 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                      </div>
                      <div className="absolute bottom-1 left-1 bg-purple-900/80 text-xs px-1 py-0.5 rounded text-purple-300">
                        {t('historyPanel.mask')}
                      </div>
                    </button>
                  </div>
                );
              })()}
          </div>
        )}

        {!selectedGeneration && !selectedEdit && (
          <div className="space-y-2 text-xs text-gray-500">
            <p className="text-gray-400">{t('historyPanel.selectToViewDetails')}</p>
          </div>
        )}
      </div>

      <div className="space-y-3 flex-shrink-0">
        <Button
          variant="outline"
          size="sm"
          className="w-full"
          onClick={() => {
            void handleDownload();
          }}
          disabled={!getCurrentImageUrl()}
        >
          <Download className="h-4 w-4 mr-2" />
          {t('historyPanel.download')}
        </Button>
      </div>

      <ImagePreviewModal
        open={previewModal.open}
        onOpenChange={(open) => setPreviewModal((prev) => ({ ...prev, open }))}
        imageUrl={previewModal.imageUrl}
        title={previewModal.title}
        description={previewModal.description}
      />
    </div>
  );
};
