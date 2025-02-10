import { useState, useEffect } from 'react';
import axios from 'axios';
import { FileUpload } from './components/FileUpload';
import { ReceiptHistory } from './components/ReceiptHistory';
import { Receipt } from './types';
import { Receipt as ReceiptScanner, FileText, History } from 'lucide-react';
import { extractTotalAmount } from './utils';

// Cloud Storage へのアップロード関数
const uploadToCloudStorage = async (file: File): Promise<string> => {
  try {
    const response = await axios.post(
      `https://storage.googleapis.com/upload/storage/v1/b/save-reciept/o?uploadType=media&name=${file.name}`,
      file,
      {
        headers: {
          'Authorization': `Bearer ${import.meta.env.VITE_ACCESS_TOKEN}`,
          'Content-Type': file.type
        },
      }
    );

    return response.data.mediaLink;
  } catch (error) {
    console.error('Error uploading to Cloud Storage:', error);
    throw new Error('Upload to Cloud Storage failed');
  }
};

// Firestoreからデータを取得する関数を修正
const fetchReceiptsFromFirestore = async (): Promise<Receipt[]> => {
  try {
    const response = await axios.get(
      `https://firestore.googleapis.com/v1/projects/${import.meta.env.VITE_PROJECT_ID}/databases/(default)/documents/receipts`,
      {
        headers: {
          'Authorization': `Bearer ${import.meta.env.VITE_ACCESS_TOKEN}`,
        }
      }
    );

    console.log('Firestore Response:', response.data);

    // Firestoreのレスポンスから必要なデータを抽出
    const documents = response.data.documents || [];
    const receipts = documents.map((doc: any) => ({
      id: doc.name.split('/').pop(),
      fullText: doc.fields.fullText?.stringValue || '',
      metadata: {
        processedAt: doc.fields.metadata?.mapValue?.fields?.processedAt?.stringValue || new Date().toISOString(),
        store: doc.fields.metadata?.mapValue?.fields?.store?.stringValue || '',
        status: doc.fields.metadata?.mapValue?.fields?.status?.stringValue || 'processed',
        updatedAt: doc.fields.metadata?.mapValue?.fields?.updatedAt?.stringValue || new Date().toISOString()
      },
      originalFile: {
        bucket: doc.fields.originalFile?.mapValue?.fields?.bucket?.stringValue || '',
        name: doc.fields.originalFile?.mapValue?.fields?.name?.stringValue || '',
        path: doc.fields.originalFile?.mapValue?.fields?.path?.stringValue || ''
      },
      rawText: doc.fields.rawText?.stringValue || '',
      status: doc.fields.status?.stringValue || 'processed',
      store: doc.fields.store?.stringValue || ''
    }));

    console.log('Processed Receipts:', receipts);
    return receipts;
  } catch (error) {
    console.error('Error fetching from Firestore:', error);
    return [];
  }
};

function App() {
  const [activeTab, setActiveTab] = useState<'upload' | 'history'>('upload');
  const [receipts, setReceipts] = useState<Receipt[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedReceipt, setSelectedReceipt] = useState<Receipt | null>(null);

  // コンポーネントマウント時にデータを取得
  useEffect(() => {
    const loadReceipts = async () => {
      try {
        setIsProcessing(true);
        const fetchedReceipts = await fetchReceiptsFromFirestore();
        setReceipts(fetchedReceipts);
        setError(null);
      } catch (err) {
        setError('レシートデータの取得に失敗しました');
        console.error('Failed to load receipts:', err);
      } finally {
        setIsProcessing(false);
      }
    };
    
    loadReceipts();
  }, []);

  const handleUpload = async (files: File[]) => {
    setIsProcessing(true);
    try {
      const file = files[0];
      console.log('Uploading file:', file.name, 'Type:', file.type); // ファイル情報の確認

      const fileUrl = await uploadToCloudStorage(file);
      console.log('File uploaded to:', fileUrl);
      
      // アップロード成功後、少し待ってからFirestoreのデータを取得
      // Cloud Functionsの処理に時間がかかるため
      setTimeout(async () => {
        try {
          const updatedReceipts = await fetchReceiptsFromFirestore();
          setReceipts(updatedReceipts);
          // 最新のレシートを選択状態にする
          if (updatedReceipts.length > 0) {
            setSelectedReceipt(updatedReceipts[0]);
          }
        } catch (err) {
          console.error('Error fetching updated receipts:', err);
        }
      }, 5000); // 5秒待つ

    } catch (error) {
      console.error('File upload failed:', error);
      setError('ファイルのアップロードに失敗しました');
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
            <span>履歴・分析</span>
          </button>
        </div>

        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
            {error}
          </div>
        )}

        {activeTab === 'upload' && (
          <div className="space-y-8">
            {!selectedReceipt ? (
              <div className="bg-white rounded-lg shadow-lg p-6">
                <FileUpload onUpload={handleUpload} />
              </div>
            ) : (
              <div className="bg-white rounded-lg shadow-lg p-6">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-medium">レシート分析</h3>
                  <button
                    onClick={() => setSelectedReceipt(null)}
                    className="text-gray-500 hover:text-gray-700"
                  >
                    新規アップロードに戻る
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    {/* レシート画像の表示 */}
                    <img
                      src={selectedReceipt.originalFile.path}
                      alt="Receipt"
                      className="w-full rounded-lg shadow"
                    />
                  </div>
                  <div>
                    {/* 金額仕分けUI */}
                    <div className="space-y-4">
                      <div>
                        <p className="text-sm text-gray-600">合計金額</p>
                        <p className="text-2xl font-bold">
                          ¥{extractTotalAmount(selectedReceipt.rawText).toLocaleString()}
                        </p>
                      </div>
                      <div className="space-y-2">
                        <button
                          onClick={() => {/* 経費として処理 */}}
                          className="w-full py-2 px-4 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
                        >
                          経費として登録
                        </button>
                        <button
                          onClick={() => {/* 私費として処理 */}}
                          className="w-full py-2 px-4 bg-purple-500 text-white rounded-lg hover:bg-purple-600"
                        >
                          私費として登録
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {isProcessing && (
              <div className="text-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
                <p className="mt-4 text-gray-600">処理中...</p>
              </div>
            )}
          </div>
        )}
        {activeTab === 'history' && (
          <ReceiptHistory 
            receipts={receipts} 
            isLoading={isProcessing}
          />
        )}
      </main>
    </div>
  );
}

export default App;