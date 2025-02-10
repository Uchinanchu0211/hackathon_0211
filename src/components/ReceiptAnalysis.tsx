import { Receipt } from '../types';
import { Calendar, DollarSign } from 'lucide-react';
import { extractTotalAmount } from '../utils';

interface ReceiptAnalysisProps {
  receipt: Receipt;
  onCategorize: (category: 'expense' | 'personal') => void;
  isProcessing: boolean;
}

export function ReceiptAnalysis({ receipt, onCategorize, isProcessing }: ReceiptAnalysisProps) {
  const amount = extractTotalAmount(receipt.rawText);

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
          <DollarSign className="text-gray-500" />
          <span className="text-lg font-bold">¥{amount.toLocaleString()}</span>
        </div>
      </div>

      <div className="space-y-4">
        <div className="p-4 bg-gray-50 rounded-lg">
          <p className="font-medium">店舗名: {receipt.store || '不明'}</p>
          <p className="text-gray-600 mt-2">レシート内容:</p>
          <pre className="mt-2 p-2 bg-gray-100 rounded whitespace-pre-wrap">
            {receipt.rawText}
          </pre>
        </div>
      </div>

      <div className="mt-6 space-y-2">
        <button
          onClick={() => onCategorize('expense')}
          disabled={isProcessing}
          className="w-full py-2 px-4 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50"
        >
          経費として登録
        </button>
        <button
          onClick={() => onCategorize('personal')}
          disabled={isProcessing}
          className="w-full py-2 px-4 bg-purple-500 text-white rounded-lg hover:bg-purple-600 disabled:opacity-50"
        >
          私費として登録
        </button>
      </div>
    </div>
  );
}