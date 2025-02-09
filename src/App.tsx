import React, { useState } from 'react';
import axios from 'axios';
import { FileUpload } from './components/FileUpload';
import { ReceiptAnalysis } from './components/ReceiptAnalysis';
import { ReceiptHistory } from './components/ReceiptHistory';
import { Receipt, ReceiptItem } from './types';
import { Receipt as ReceiptScanner, FileText, History } from 'lucide-react';

// Firebase Storage へのアップロード関数
const uploadToCloudStorage = async (file: File): Promise<string> => {
  try {
    const response = await axios.post(
      `https://storage.googleapis.com/upload/storage/v1/b/save-reciept/o?uploadType=media&name=${file.name}`,
      file,
      {
        headers: {
          'Authorization': `Bearer ${import.meta.env.VITE_ACCESS_TOKEN}`, // Vite環境変数から認証トークンを取得
          'Content-Type': file.type // ファイルのMIMEタイプを指定
        },
      }
    );

    return response.data.mediaLink; // アップロードされたファイルのURLを返す
  } catch (error) {
    console.error('Error uploading to Cloud Storage:', error);
    throw new Error('Upload to Cloud Storage failed');
  }
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
      const fileUrl = await uploadToCloudStorage(file);
      console.log('File uploaded to:', fileUrl);
    } catch (error) {
      console.error('File upload failed:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100">
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center space-x-2">
            <ReceiptScanner className="w-8 h-8 text-blue-500" />
            <h1 className="text-2xl font-bold text-gray-900">レシートぽん！</h1>
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
            <span>レシートアップロード</span>
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
            <span>履歴</span>
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
                <p className="mt-4 text-gray-600">領収書をアップロード中...</p>
              </div>
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
