import React from 'react';
import { useTranslation } from 'react-i18next';
import { Globe, ChevronDown } from 'lucide-react';
import * as Select from '@radix-ui/react-select';

export const LanguageSwitcher: React.FC = () => {
  const { i18n, t } = useTranslation();

  return (
    <Select.Root value={i18n.language} onValueChange={(value) => i18n.changeLanguage(value)}>
      <Select.Trigger className="flex items-center space-x-1 px-3 py-1.5 text-sm text-gray-300 hover:text-gray-100 bg-gray-800 hover:bg-gray-700 rounded-lg transition-colors border-none outline-none cursor-pointer">
        <Globe className="h-4 w-4" />
        <Select.Value />
        <ChevronDown className="h-3 w-3 opacity-70" />
      </Select.Trigger>

      <Select.Portal>
        <Select.Content className="bg-gray-800 border border-gray-700 rounded-lg overflow-hidden shadow-xl z-50">
          <Select.Viewport className="p-1">
            <Select.Item
              value="zh"
              className="flex items-center px-3 py-2 text-sm text-gray-300 hover:bg-gray-700 hover:text-gray-100 rounded cursor-pointer outline-none select-none"
            >
              <Select.ItemText>{t('languageSwitcher.zh')}</Select.ItemText>
            </Select.Item>
            <Select.Item
              value="en"
              className="flex items-center px-3 py-2 text-sm text-gray-300 hover:bg-gray-700 hover:text-gray-100 rounded cursor-pointer outline-none select-none"
            >
              <Select.ItemText>{t('languageSwitcher.en')}</Select.ItemText>
            </Select.Item>
          </Select.Viewport>
        </Select.Content>
      </Select.Portal>
    </Select.Root>
  );
};
