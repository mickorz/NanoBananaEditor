/**
 * 高级设置组件
 *
 * AdvancedSettings 处理高级参数:
 *   ├─> 温度控制
 *   ├─> 种子设置
 *   └─> 清除会话
 */

import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ChevronDown, ChevronRight, RotateCcw } from 'lucide-react';
import { Button } from '../ui/Button';

interface AdvancedSettingsProps {
  temperature: number;
  seed: number | null;
  onTemperatureChange: (temp: number) => void;
  onSeedChange: (seed: number | null) => void;
  onClearSession: () => void;
}

export const AdvancedSettings: React.FC<AdvancedSettingsProps> = ({
  temperature,
  seed,
  onTemperatureChange,
  onSeedChange,
  onClearSession,
}) => {
  const { t } = useTranslation();
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [showClearConfirm, setShowClearConfirm] = useState(false);

  const handleClearConfirm = () => {
    onClearSession();
    setShowClearConfirm(false);
  };

  return (
    <div>
      <button
        onClick={() => setShowAdvanced(!showAdvanced)}
        className="flex items-center text-sm text-gray-400 hover:text-gray-300 transition-colors duration-200"
      >
        {showAdvanced ? <ChevronDown className="h-4 w-4 mr-1" /> : <ChevronRight className="h-4 w-4 mr-1" />}
        {showAdvanced ? t('promptComposer.hideAdvanced') : t('promptComposer.showAdvanced')}
      </button>

      <button
        onClick={() => setShowClearConfirm(!showClearConfirm)}
        className="flex items-center text-sm text-gray-400 hover:text-red-400 transition-colors duration-200 mt-2"
      >
        <RotateCcw className="h-4 w-4 mr-2" />
        {t('promptComposer.clearSession')}
      </button>

      {showClearConfirm && (
        <div className="mt-3 p-3 bg-gray-800 rounded-lg border border-gray-700">
          <p className="text-xs text-gray-300 mb-3">
            {t('promptComposer.clearConfirmText')}
          </p>
          <div className="flex space-x-2">
            <Button
              variant="destructive"
              size="sm"
              onClick={handleClearConfirm}
              className="flex-1"
            >
              {t('promptComposer.yesClear')}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowClearConfirm(false)}
              className="flex-1"
            >
              {t('promptComposer.cancel')}
            </Button>
          </div>
        </div>
      )}

      {showAdvanced && (
        <div className="mt-4 space-y-4">
          <div>
            <label className="text-xs text-gray-400 mb-2 block">
              {t('promptComposer.creativity')} ({temperature})
            </label>
            <input
              type="range"
              min="0"
              max="1"
              step="0.1"
              value={temperature}
              onChange={(e) => onTemperatureChange(parseFloat(e.target.value))}
              className="w-full h-2 bg-gray-800 rounded-lg appearance-none cursor-pointer slider"
            />
          </div>

          <div>
            <label className="text-xs text-gray-400 mb-2 block">{t('promptComposer.seed')}</label>
            <input
              type="number"
              value={seed ?? ''}
              onChange={(e) => onSeedChange(e.target.value ? parseInt(e.target.value, 10) : null)}
              placeholder={t('promptComposer.seedPlaceholder')}
              className="w-full h-8 px-2 bg-gray-900 border border-gray-700 rounded text-xs text-gray-100"
            />
          </div>
        </div>
      )}
    </div>
  );
};
