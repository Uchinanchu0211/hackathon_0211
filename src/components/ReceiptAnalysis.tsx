import { Receipt } from '../types';
import { Calendar, DollarSign } from 'lucide-react';
import { extractTotalAmount } from '../utils';

export function ReceiptAnalysis({ receipt }: { receipt: Receipt }) {
  const date = new Date(receipt.metadata.processedAt).toLocaleDateString('ja-JP');
  const totalAmount = extractTotalAmount(receipt.rawText);
  
  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center space-x-4">
          <Calendar className="text-gray-500" />
          <span className="text-lg">{date}</span>
        </div>
        <div className="flex items-center space-x-4">
          <DollarSign className="text-gray-500" />
          <span className="text-lg font-bold">¥{totalAmount.toLocaleString()}</span>
        </div>
      </div>

      <div className="p-4 bg-gray-50 rounded-lg">
        <pre className="whitespace-pre-wrap text-sm">
          {receipt.rawText}
        </pre>
      </div>
    </div>
  );
}