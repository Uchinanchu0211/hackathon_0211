import React, { useState } from 'react';
import { FileUpload } from './components/FileUpload';
import { ReceiptAnalysis } from './components/ReceiptAnalysis';
import { ReceiptHistory } from './components/ReceiptHistory';
import { Receipt, ReceiptItem } from './types';
import { Receipt as ReceiptScanner, FileText, History } from 'lucide-react';

// モックデータ生成
const mockAnalyzeReceipt = async (file: File): Promise<Receipt> => {
  // 実際のアプリケーションではGoogle Cloud Document AIなどと連携
  return new Promise((resolve) => {
    setTimeout(() => {
      const mockItems: ReceiptItem[] = [
        { id: '1', name: 'コーヒー', price: 500, category: 'unclassified' },
        { id: '2', name: 'ノートPC', price: 150000, category: 'unclassified' },
        { id: '3', name: '文具セット', price: 2000, category: 'unclassified' },
      ];

      resolve({
        id: Math.random().toString(36).substr(2, 9),
        imageUrl: URL.createObjectURL(file),
        date: new Date().toLocaleDateString(),
        totalAmount: mockItems.reduce((sum, item) => sum + item.price, 0),
        items: mockItems,
        status: 'analyzed'
      });
    }, 1500);
  });
};

function App() {
  const [activeTab, setActiveTab] = useState<'upload' | 'history'>('upload');
  const [currentReceipt, setCurrentReceipt] = useState<Receipt | null>(null);
  const [receipts, setReceipts] = useState<Receipt[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);

  const handleUpload = async (files: File[]) => {
    setIsProcessing(true);
    try {
      const file = files[0];
      const analyzedReceipt = await mockAnalyzeReceipt(file);
      setCurrentReceipt(analyzedReceipt);
      setReceipts(prev => [analyzedReceipt, ...prev]);
    } catch (error) {
      console.error('Receipt analysis failed:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleUpdateCategory = (itemId: string, category: 'business' | 'personal') => {
    if (!currentReceipt) return;

    const updatedReceipt = {
      ...currentReceipt,
      items: currentReceipt.items.map(item =>
        item.id === itemId ? { ...item, category } : item
      )
    };

    setCurrentReceipt(updatedReceipt);
    setReceipts(prev =>
      prev.map(receipt =>
        receipt.id === updatedReceipt.id ? updatedReceipt : receipt
      )
    );
  };

  return (
    <div className="min-h-screen bg-gray-100">
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center space-x-2">
            <ReceiptScanner className="w-8 h-8 text-blue-500" />
            <h1 className="text-2xl font-bold text-gray-900">領収書マネージャー</h1>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex space-x-4 mb-8">
          <button
            onClick={() => setActiveTab('upload')}
            className={`flex items-center space-x-2 px-4 py-2 rounded-lg ${
              activeTab === 'upload'
                ? 'bg-blue-500 text-white'
                : 'bg-white text-gray-600 hover:bg-gray-50'
            }`}
          >
            <FileText className="w-5 h-5" />
            <span>領収書アップロード</span>
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`flex items-center space-x-2 px-4 py-2 rounded-lg ${
              activeTab === 'history'
                ? 'bg-blue-500 text-white'
                : 'bg-white text-gray-600 hover:bg-gray-50'
            }`}
          >
            <History className="w-5 h-5" />
            <span>履歴・分析</span>
          </button>
        </div>

        {activeTab === 'upload' && (
          <div className="space-y-8">
            <div className="bg-white rounded-lg shadow-lg p-6">
              <FileUpload onUpload={handleUpload} />
            </div>

            {isProcessing && (
              <div className="text-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
                <p className="mt-4 text-gray-600">領収書を解析中...</p>
              </div>
            )}

            {currentReceipt && !isProcessing && (
              <ReceiptAnalysis
                receipt={currentReceipt}
                onUpdateCategory={handleUpdateCategory}
              />
            )}
          </div>
        )}

        {activeTab === 'history' && (
          <ReceiptHistory receipts={receipts} />
        )}
      </main>
    </div>
  );
}

export default App;