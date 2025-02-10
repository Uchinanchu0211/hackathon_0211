import { ProcessedReceipt } from '../types';

interface ReceiptHistoryProps {
  processedReceipts: ProcessedReceipt[];
  isLoading: boolean;
}

export function ReceiptHistory({ processedReceipts, isLoading }: ReceiptHistoryProps) {
  if (isLoading) {
    return (
      <div className="text-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
        <p className="mt-4 text-gray-600">データを読み込み中...</p>
      </div>
    );
  }

  const totalExpense = processedReceipts
    .filter(receipt => receipt.category === 'expense')
    .reduce((sum, receipt) => sum + receipt.amount, 0);

  const totalPersonal = processedReceipts
    .filter(receipt => receipt.category === 'personal')
    .reduce((sum, receipt) => sum + receipt.amount, 0);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-medium text-gray-900 mb-2">経費合計</h3>
          <p className="text-2xl font-bold text-blue-600">
            ¥{totalExpense.toLocaleString()}
          </p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-medium text-gray-900 mb-2">私費合計</h3>
          <p className="text-2xl font-bold text-purple-600">
            ¥{totalPersonal.toLocaleString()}
          </p>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                日付
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                店舗
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                金額
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                区分
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {processedReceipts.map((receipt) => (
              <tr key={receipt.id}>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {new Date(receipt.processedAt).toLocaleDateString('ja-JP')}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {receipt.store}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  ¥{receipt.amount.toLocaleString()}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                    receipt.category === 'expense' 
                      ? 'bg-blue-100 text-blue-800' 
                      : 'bg-purple-100 text-purple-800'
                  }`}>
                    {receipt.category === 'expense' ? '経費' : '私費'}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}