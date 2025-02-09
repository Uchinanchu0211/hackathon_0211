import { Receipt } from '../types';
import { Calendar } from 'lucide-react';

interface ReceiptHistoryProps {
  receipts: Receipt[];
}

export function ReceiptHistory({ receipts }: ReceiptHistoryProps) {
  const totalBusiness = receipts.reduce((sum, receipt) => 
    sum + receipt.items
      .filter(item => item.category === 'business')
      .reduce((itemSum, item) => itemSum + item.price, 0)
  , 0);

  const totalPersonal = receipts.reduce((sum, receipt) => 
    sum + receipt.items
      .filter(item => item.category === 'personal')
      .reduce((itemSum, item) => itemSum + item.price, 0)
  , 0);

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">領収書履歴</h2>

      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="bg-blue-50 p-4 rounded-lg">
          <p className="text-blue-600 font-medium">経費合計</p>
          <p className="text-2xl font-bold">¥{totalBusiness.toLocaleString()}</p>
        </div>
        <div className="bg-purple-50 p-4 rounded-lg">
          <p className="text-purple-600 font-medium">私費合計</p>
          <p className="text-2xl font-bold">¥{totalPersonal.toLocaleString()}</p>
        </div>
      </div>

      <div className="space-y-4">
        {receipts.map((receipt) => (
          <div key={receipt.id} className="bg-white p-4 rounded-lg shadow hover:shadow-md transition-shadow">
            <div className="flex justify-between items-center mb-2">
              <div className="flex items-center space-x-2">
                <Calendar className="w-4 h-4 text-gray-500" />
                <span>{receipt.date}</span>
              </div>
              <span className="font-bold">¥{receipt.totalAmount.toLocaleString()}</span>
            </div>
            <div className="text-sm text-gray-600">
              {receipt.items.length} アイテム
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}