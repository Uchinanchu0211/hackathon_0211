import { Receipt } from '../types';
import { Calendar, DollarSign } from 'lucide-react';

interface ReceiptAnalysisProps {
  receipt: Receipt;
  onUpdateCategory: (itemId: string, category: 'business' | 'personal') => void;
}

export function ReceiptAnalysis({ receipt, onUpdateCategory }: ReceiptAnalysisProps) {
  const totalBusiness = receipt.items
    .filter(item => item.category === 'business')
    .reduce((sum, item) => sum + item.price, 0);

  const totalPersonal = receipt.items
    .filter(item => item.category === 'personal')
    .reduce((sum, item) => sum + item.price, 0);

  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center space-x-4">
          <Calendar className="text-gray-500" />
          <span className="text-lg">{receipt.date}</span>
        </div>
        <div className="flex items-center space-x-4">
          <DollarSign className="text-gray-500" />
          <span className="text-lg font-bold">¥{receipt.totalAmount.toLocaleString()}</span>
        </div>
      </div>

      <div className="space-y-4">
        {receipt.items.map((item) => (
          <div key={item.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
            <div className="flex-1">
              <p className="font-medium">{item.name}</p>
              <p className="text-gray-600">¥{item.price.toLocaleString()}</p>
            </div>
            <div className="flex space-x-2">
              <button
                onClick={() => onUpdateCategory(item.id, 'business')}
                className={`px-4 py-2 rounded-full text-sm ${
                  item.category === 'business'
                    ? 'bg-blue-500 text-white'
                    : 'bg-gray-200 text-gray-700 hover:bg-blue-100'
                }`}
              >
                経費
              </button>
              <button
                onClick={() => onUpdateCategory(item.id, 'personal')}
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

      <div className="mt-6 flex justify-between p-4 bg-gray-100 rounded-lg">
        <div>
          <p className="text-sm text-gray-600">経費合計</p>
          <p className="text-lg font-bold text-blue-600">¥{totalBusiness.toLocaleString()}</p>
        </div>
        <div>
          <p className="text-sm text-gray-600">私費合計</p>
          <p className="text-lg font-bold text-purple-600">¥{totalPersonal.toLocaleString()}</p>
        </div>
      </div>
    </div>
  );
}