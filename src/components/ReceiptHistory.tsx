import { ProcessedReceipt } from '../types';

interface Props {
  processedReceipts: ProcessedReceipt[];
  isLoading: boolean;
}

export const ReceiptHistory: React.FC<Props> = ({ processedReceipts, isLoading }) => {
  const totalExpense = processedReceipts.reduce((sum, receipt) => sum + receipt.total_expense, 0);
  const totalPersonal = processedReceipts.reduce((sum, receipt) => sum + receipt.total_personal, 0);

  if (isLoading) {
    return (
      <div className="text-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
        <p className="mt-4 text-gray-600">履歴を読み込み中...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">経費合計</h3>
          <p className="text-3xl font-bold text-blue-600">¥{totalExpense.toLocaleString()}</p>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">私費合計</h3>
          <p className="text-3xl font-bold text-green-600">¥{totalPersonal.toLocaleString()}</p>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">日付</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">店舗</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">経費金額</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">私費金額</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {processedReceipts.map((receipt) => (
              <tr key={receipt.id}>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {new Date(receipt.processedAt).toLocaleDateString()}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {receipt.store}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  ¥{receipt.total_expense.toLocaleString()}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  ¥{receipt.total_personal.toLocaleString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};