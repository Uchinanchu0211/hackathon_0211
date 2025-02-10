import { useState, useEffect } from 'react';
import axios from 'axios';
import { FileUpload } from './components/FileUpload';
import { ReceiptHistory } from './components/ReceiptHistory';
import { Receipt, ProcessedReceipt } from './types';
import { Receipt as ReceiptScanner, FileText, History } from 'lucide-react';
import { extractTotalAmount } from './utils';
import { ReceiptAnalysis } from './components/ReceiptAnalysis';

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

// Firestoreからprocessed_receiptsを取得する関数を追加
const fetchProcessedReceiptsFromFirestore = async (): Promise<ProcessedReceipt[]> => {
  try {
    const response = await axios.get(
      `https://firestore.googleapis.com/v1/projects/${import.meta.env.VITE_PROJECT_ID}/databases/(default)/documents/processed_receipts`,
      {
        headers: {
          'Authorization': `Bearer ${import.meta.env.VITE_ACCESS_TOKEN}`,
        }
      }
    );

    const documents = response.data.documents || [];
    return documents.map((doc: any) => ({
      id: doc.name.split('/').pop(),
      originalReceiptId: doc.fields.originalReceiptId?.stringValue || '',
      store: doc.fields.store?.stringValue || '',
      amount: Number(doc.fields.amount?.integerValue || 0),
      category: doc.fields.category?.stringValue || 'expense',
      processedAt: doc.fields.processedAt?.timestampValue || '',
      metadata: {
        processedAt: doc.fields.metadata?.mapValue?.fields?.processedAt?.stringValue || '',
        store: doc.fields.metadata?.mapValue?.fields?.store?.stringValue || '',
        status: doc.fields.metadata?.mapValue?.fields?.status?.stringValue || ''
      }
    }));
  } catch (error) {
    console.error('Error fetching from Firestore:', error);
    return [];
  }
};

function App() {
  const [activeTab, setActiveTab] = useState<'upload' | 'history'>('upload');
  const [processedReceipts, setProcessedReceipts] = useState<ProcessedReceipt[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedReceipt, setSelectedReceipt] = useState<Receipt | null>(null);

  // コンポーネントマウント時にデータを取得
  useEffect(() => {
    const loadReceipts = async () => {
      try {
        setIsProcessing(true);
        const fetchedProcessedReceipts = await fetchProcessedReceiptsFromFirestore();
        setProcessedReceipts(fetchedProcessedReceipts);
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
      console.log('Uploading file:', file.name, 'Type:', file.type);

      const fileUrl = await uploadToCloudStorage(file);
      console.log('File uploaded to:', fileUrl);
      
      // 最新のレシートを選択状態にする（ローディング表示のため）
      setSelectedReceipt({ 
        id: 'loading',
        fullText: '',
        metadata: {
          processedAt: new Date().toISOString(),
          store: '',
          status: 'processing',
          updatedAt: new Date().toISOString()
        },
        originalFile: {
          bucket: '',
          name: '',
          path: ''
        },
        rawText: '',
        status: 'processing',
        store: ''
      });
      
      // Cloud Functionsの処理を待つ
      let retryCount = 0;
      const maxRetries = 10;
      const checkForReceipt = async () => {
        try {
          const updatedReceipts = await fetchReceiptsFromFirestore();
          const latestReceipt = updatedReceipts[0];
          
          if (latestReceipt && latestReceipt.status === 'processed') {
            const updatedProcessedReceipts = await fetchProcessedReceiptsFromFirestore();
            setProcessedReceipts(updatedProcessedReceipts);
            setSelectedReceipt(latestReceipt);
            setIsProcessing(false);
          } else if (retryCount < maxRetries) {
            retryCount++;
            setTimeout(checkForReceipt, 2000);
          } else {
            throw new Error('レシートの処理がタイムアウトしました');
          }
        } catch (err) {
          console.error('Error fetching updated receipts:', err);
          setError('レシートの処理に失敗しました');
          setIsProcessing(false);  // エラー時のみfalseに設定
        }
      };
      
      setTimeout(checkForReceipt, 2000);

    } catch (error) {
      console.error('File upload failed:', error);
      setError('ファイルのアップロードに失敗しました');
      setIsProcessing(false);  // エラー時のみfalseに設定
    }
  };

  const saveProcessedReceipt = async (receipt: Receipt, category: 'expense' | 'personal') => {
    try {
      const processedData = {
        fields: {
          originalReceiptId: { stringValue: receipt.id },
          store: { stringValue: receipt.store || '' },
          amount: { integerValue: extractTotalAmount(receipt.rawText) },
          category: { stringValue: category },
          processedAt: { timestampValue: new Date().toISOString() },
          metadata: {
            mapValue: {
              fields: {
                processedAt: { stringValue: new Date().toISOString() },
                store: { stringValue: receipt.store || '' },
                status: { stringValue: 'categorized' }
              }
            }
          }
        }
      };

      await axios.post(
        `https://firestore.googleapis.com/v1/projects/${import.meta.env.VITE_PROJECT_ID}/databases/(default)/documents/processed_receipts`,
        processedData,
        {
          headers: {
            'Authorization': `Bearer ${import.meta.env.VITE_ACCESS_TOKEN}`,
            'Content-Type': 'application/json'
          }
        }
      );

      // 両方のデータを更新
      const updatedProcessedReceipts = await fetchProcessedReceiptsFromFirestore();
      setProcessedReceipts(updatedProcessedReceipts);
      setSelectedReceipt(null);
    } catch (error) {
      console.error('Error saving processed receipt:', error);
      setError('レシートの保存に失敗しました');
    }
  };

  // 経費/私費ボタンのハンドラーを追加
  const handleCategorize = async (category: 'expense' | 'personal') => {
    if (!selectedReceipt) return;
    
    setIsProcessing(true);
    try {
      await saveProcessedReceipt(selectedReceipt, category);
    } catch (error) {
      console.error('Failed to categorize receipt:', error);
      setError('レシートの分類に失敗しました');
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
              <ReceiptAnalysis
                receipt={selectedReceipt}
                onCategorize={handleCategorize}
                isProcessing={isProcessing}
              />
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
            processedReceipts={processedReceipts} 
            isLoading={isProcessing}
          />
        )}
      </main>
    </div>
  );
}

export default App;