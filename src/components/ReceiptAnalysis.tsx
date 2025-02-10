import { Receipt, ReceiptItem } from '../types';
import { Calendar, Tag } from 'lucide-react';
import { useState } from 'react';

interface ReceiptAnalysisProps {
  receipt: Receipt;
  onCategorize: (items: ReceiptItem[]) => void;
  isProcessing: boolean;
}

export function ReceiptAnalysis({ receipt, onCategorize, isProcessing }: ReceiptAnalysisProps) {
  const [items, setItems] = useState<ReceiptItem[]>(
    receipt.items.map(item => ({ ...item, category: 'unclassified' as const }))
  );

  const totalExpense = items
    .filter(item => item.category === 'expense')
    .reduce((sum, item) => sum + item.price, 0);

  const totalPersonal = items
    .filter(item => item.category === 'personal')
    .reduce((sum, item) => sum + item.price, 0);

  const handleItemCategorize = (itemId: string, category: 'expense' | 'personal') => {
    setItems(prevItems =>
      prevItems.map(item =>
        item.id === itemId ? { ...item, category } : item
      )
    );
  };

  const handleSave = () => {
    onCategorize(items);
  };

  if (isProcessing) {
    return (
      <div className="bg-white rounded-lg shadow-lg p-6">
        <div className="flex flex-col items-center justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
          <p className="mt-4 text-gray-600">レシートを解析中...</p>
          <p className="text-sm text-gray-500 mt-2">
            解析には数秒かかる場合があります
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center space-x-4">
          <Calendar className="text-gray-500" />
          <span className="text-lg">{receipt.metadata.processedAt}</span>
        </div>
        <div className="flex items-center space-x-4">
          <Tag className="text-gray-500" />
          <span className="text-lg">{receipt.store_name}</span>
        </div>
      </div>

      <div className="space-y-4">
        {items.map((item) => (
          <div key={item.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
            <div className="flex-1">
              <p className="font-medium">{item.name}</p>
              <p className="text-gray-600">¥{item.price.toLocaleString()}</p>
            </div>
            <div className="flex space-x-2">
              <button
                onClick={() => handleItemCategorize(item.id, 'expense')}
                className={`px-4 py-2 rounded-full text-sm ${
                  item.category === 'expense'
                    ? 'bg-blue-500 text-white'
                    : 'bg-gray-200 text-gray-700 hover:bg-blue-100'
                }`}
              >
                経費
              </button>
              <button
                onClick={() => handleItemCategorize(item.id, 'personal')}
                className={`px-4 py-2 rounded-full text-sm ${
                  item.category === 'personal'
                    ? 'bg-purple-500 text-white'
                    : 'bg-gray-200 text-gray-700 hover:bg-purple-100'
                }`}
              >
                私費
              </button>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-6 grid grid-cols-2 gap-4 p-4 bg-gray-100 rounded-lg">
        <div>
          <p className="text-sm text-gray-600">経費合計</p>
          <p className="text-lg font-bold text-blue-600">¥{totalExpense.toLocaleString()}</p>
        </div>
        <div>
          <p className="text-sm text-gray-600">私費合計</p>
          <p className="text-lg font-bold text-purple-600">¥{totalPersonal.toLocaleString()}</p>
        </div>
      </div>

      <button
        onClick={handleSave}
        disabled={items.some(item => item.category === 'unclassified')}
        className="mt-6 w-full py-2 px-4 bg-green-500 text-white rounded-lg hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        保存する
      </button>
    </div>
  );
}