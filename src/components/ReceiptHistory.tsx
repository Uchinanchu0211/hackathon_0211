import { Receipt } from '../types';
import { Calendar } from 'lucide-react';

interface ReceiptHistoryProps {
  receipts: Receipt[];
  isLoading: boolean;
}

export function ReceiptHistory({ receipts, isLoading }: ReceiptHistoryProps) {
  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">レシート履歴</h2>

      {isLoading ? (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-4 text-gray-600">読み込み中...</p>
        </div>
      ) : (
        <div className="space-y-4">
          {receipts.map((receipt) => (
            <div key={receipt.id} className="bg-white p-4 rounded-lg shadow hover:shadow-md transition-shadow">
              <div className="flex justify-between items-center mb-2">
                <div className="flex items-center space-x-2">
                  <Calendar className="w-4 h-4 text-gray-500" />
                  <span>{receipt.metadata.processedAt}</span>
                </div>
                <span className="font-bold">{receipt.store}</span>
              </div>
              <div className="text-sm text-gray-600">
                {receipt.rawText.slice(0, 50)}...
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}