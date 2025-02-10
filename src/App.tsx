import { useState, useEffect } from 'react';
import axios from 'axios';
import { FileUpload } from './components/FileUpload';
import { ReceiptHistory } from './components/ReceiptHistory';
import { Receipt, ProcessedReceipt, ReceiptItem } from './types';
import { Receipt as ReceiptScanner, FileText, History } from 'lucide-react';
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

const parseReceiptText = (text: string): {
  store_name: string;
  items: ReceiptItem[];
  total_amount: number;
  date: string;
} => {
  const lines = text.split('\n');
  
  // 店舗名の抽出（最初の行から）
  const store_name = lines[0].trim();

  // 日付の抽出（YYYY/MM/DD形式を探す）
  const dateMatch = text.match(/(\d{4}\/\d{1,2}\/\d{1,2})/);
  const date = dateMatch ? dateMatch[1] : new Date().toISOString();

  // 商品と金額の抽出
  // この例では「商品名 ¥金額」のパターンを探します
  const items: ReceiptItem[] = [];
  const itemMatches = text.match(/([^\d¥]+)\s*¥\s*(\d+)/g);
  if (itemMatches) {
    itemMatches.forEach((match, index) => {
      const [name, priceStr] = match.split('¥').map(s => s.trim());
      const price = parseInt(priceStr.replace(/,/g, ''), 10);
      if (!isNaN(price) && price > 0) {
        items.push({
          id: `item-${index}`,
          name,
          price,
          category: 'unclassified'
        });
      }
    });
  }

  // 合計金額の抽出（最後の数値を探す）
  const totalMatch = text.match(/合計\s*¥?\s*(\d+)/);
  const total_amount = totalMatch ? parseInt(totalMatch[1], 10) : 0;

  return {
    store_name,
    items,
    total_amount,
    date
  };
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

    const documents = response.data.documents || [];
    const receipts = documents.map((doc: any) => {
      const rawText = doc.fields.rawText?.stringValue || '';
      const parsedData = parseReceiptText(rawText);

      return {
        id: doc.name.split('/').pop(),
        items: parsedData.items,
        store_name: parsedData.store_name,
        total_amount: parsedData.total_amount,
        metadata: {
          processedAt: parsedData.date,
          status: doc.fields.status?.stringValue || 'processed',
          updatedAt: doc.fields.metadata?.mapValue?.fields?.updatedAt?.stringValue || new Date().toISOString()
        },
        originalFile: {
          bucket: doc.fields.originalFile?.mapValue?.fields?.bucket?.stringValue || '',
          name: doc.fields.originalFile?.mapValue?.fields?.name?.stringValue || '',
          path: doc.fields.originalFile?.mapValue?.fields?.path?.stringValue || ''
        },
        status: doc.fields.status?.stringValue || 'processed'
      };
    });

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

    console.log('Fetched processed receipts response:', response.data);

    const documents = response.data.documents || [];
    return documents.map((doc: any) => ({
      id: doc.name.split('/').pop(),
      items: (doc.fields.items?.arrayValue?.values || []).map((item: any) => ({
        id: item.mapValue.fields.id.stringValue,
        name: item.mapValue.fields.name.stringValue,
        price: Number(item.mapValue.fields.price.integerValue),
        category: item.mapValue.fields.category.stringValue
      })),
      originalReceiptId: doc.fields.originalReceiptId?.stringValue || '',
      store: doc.fields.store?.stringValue || '',
      processedAt: doc.fields.processedAt?.timestampValue || new Date().toISOString(),
      total_expense: Number(doc.fields.total_expense?.integerValue || 0),
      total_personal: Number(doc.fields.total_personal?.integerValue || 0)
    }));
  } catch (error) {
    console.error('Error fetching processed receipts:', error);
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
        items: [],
        store_name: '',
        total_amount: 0,
        metadata: {
          processedAt: new Date().toISOString(),
          status: 'processing',
          updatedAt: new Date().toISOString()
        },
        originalFile: {
          bucket: '',
          name: '',
          path: ''
        },
        status: 'processing'
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

  const handleCategorize = async (items: ReceiptItem[]) => {
    if (!selectedReceipt) return;
    
    setIsProcessing(true);
    try {
      // 経費と私費の合計を計算
      const total_expense = items
        .filter(item => item.category === 'expense')
        .reduce((sum, item) => sum + item.price, 0);

      const total_personal = items
        .filter(item => item.category === 'personal')
        .reduce((sum, item) => sum + item.price, 0);

      // レシートを保存
      const processedData = {
        fields: {
          items: {
            arrayValue: {
              values: items.map(item => ({
                mapValue: {
                  fields: {
                    id: { stringValue: item.id },
                    name: { stringValue: item.name },
                    price: { integerValue: item.price },
                    category: { stringValue: item.category }
                  }
                }
              }))
            }
          },
          originalReceiptId: { stringValue: selectedReceipt.id },
          store: { stringValue: selectedReceipt.store_name },
          processedAt: { timestampValue: new Date().toISOString() },
          total_expense: { integerValue: total_expense },
          total_personal: { integerValue: total_personal }
        }
      };

      console.log('Saving processed receipt:', processedData);
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

      // 保存後に履歴を更新
      const updatedProcessedReceipts = await fetchProcessedReceiptsFromFirestore();
      setProcessedReceipts(updatedProcessedReceipts);
      
      setSelectedReceipt(null);
      setError(null);
      setActiveTab('history');
    } catch (error) {
      console.error('Failed to save receipt:', error);
      setError('レシートの保存に失敗しました');
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