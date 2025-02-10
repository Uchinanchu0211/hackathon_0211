import { useState, useEffect } from 'react';
import axios from 'axios';
import { FileUpload } from './components/FileUpload';
import { ReceiptHistory } from './components/ReceiptHistory';
import { Receipt, ProcessedReceipt, ReceiptItem } from './types';
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

// Firestoreからデータを取得する関数
const fetchReceiptById = async (receiptId: string): Promise<Receipt | null> => {
  try {
    const response = await axios.get(
      `https://firestore.googleapis.com/v1/projects/${import.meta.env.VITE_PROJECT_ID}/databases/(default)/documents/receipts/${receiptId}`,
      {
        headers: {
          'Authorization': `Bearer ${import.meta.env.VITE_ACCESS_TOKEN}`,
        }
      }
    );

    if (!response.data) return null;

    const doc = response.data;
    // statusがprocessedの場合のみパースを実行
    const rawText = doc.fields.status?.stringValue === 'processed' ? doc.fields.rawText?.stringValue || '' : '';
    const parsedData = rawText ? parseReceiptText(rawText) : { store_name: '', items: [], total_amount: 0, date: new Date().toISOString() };

    return {
      id: doc.name.split('/').pop(),
      items: parsedData.items,
      store_name: parsedData.store_name,
      total_amount: parsedData.total_amount,
      metadata: {
        processedAt: parsedData.date,
        status: doc.fields.status?.stringValue || 'processing',
        updatedAt: doc.fields.metadata?.mapValue?.fields?.updatedAt?.stringValue || new Date().toISOString()
      },
      originalFile: {
        bucket: doc.fields.originalFile?.mapValue?.fields?.bucket?.stringValue || '',
        name: doc.fields.originalFile?.mapValue?.fields?.name?.stringValue || '',
        path: doc.fields.originalFile?.mapValue?.fields?.path?.stringValue || ''
      },
      status: doc.fields.status?.stringValue || 'processing'
    };
  } catch (error) {
    console.error('Error fetching receipt:', error);
    return null;
  }
};

// Firestoreからprocessed_receiptsを取得する関数
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

// ポーリング用のカスタムフック
const usePollingEffect = (
  callback: () => Promise<boolean>,
  delay: number,
  dependencies: any[] = [],
  maxAttempts: number = 30
) => {
  useEffect(() => {
    let attempts = 0;
    let timeoutId: NodeJS.Timeout;
    
    const execute = async () => {
      const shouldContinue = await callback();
      attempts++;
      
      if (shouldContinue && attempts < maxAttempts) {
        timeoutId = setTimeout(execute, delay);
      }
    };

    execute();

    return () => {
      clearTimeout(timeoutId);
    };
  }, dependencies);
};

// テキスト解析関数
const parseReceiptText = (text: string): {
  store_name: string;
  items: ReceiptItem[];
  total_amount: number;
  date: string;
} => {
  const lines = text.split('\n');
  
  const store_name = lines[0].trim();
  const dateMatch = text.match(/(\d{4}\/\d{1,2}\/\d{1,2})/);
  const date = dateMatch ? dateMatch[1] : new Date().toISOString();

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

  const totalMatch = text.match(/合計\s*¥?\s*(\d+)/);
  const total_amount = totalMatch ? parseInt(totalMatch[1], 10) : 0;

  return {
    store_name,
    items,
    total_amount,
    date
  };
};

// ポーリングを使用してレシートの処理状態を監視する関数
const useReceiptPolling = (receiptId: string | null, onComplete: (receipt: Receipt) => void) => {
  usePollingEffect(
    async () => {
      if (!receiptId) return false;
      const receipt = await fetchReceiptById(receiptId);
      if (receipt && receipt.status === 'processed') {
        onComplete(receipt);
        return false; // ポーリングを停止
      }
      return true; // ポーリングを継続
    },
    3000, // 3秒間隔でポーリング
    [receiptId]
  );
};

// Firestoreから最新のレシートを取得する関数を追加
const fetchLatestReceipt = async (fileName: string): Promise<string | null> => {
  try {
    const response = await axios.get(
      `https://firestore.googleapis.com/v1/projects/${import.meta.env.VITE_PROJECT_ID}/databases/(default)/documents/receipts`,
      {
        headers: {
          'Authorization': `Bearer ${import.meta.env.VITE_ACCESS_TOKEN}`,
        },
        params: {
          orderBy: 'createdAt desc',
          pageSize: 10 // 最新の10件を取得
        }
      }
    );

    console.log('Searching for receipt with fileName:', fileName);
    const documents = response.data.documents || [];
    
    // ファイル名とパスが一致するドキュメントを探す
    const targetDoc = documents.find((doc: any) => {
      const originalFile = doc.fields.originalFile?.mapValue?.fields;
      return originalFile?.name?.stringValue === fileName;
    });

    if (targetDoc) {
      const receiptId = targetDoc.name.split('/').pop();
      console.log('Found receipt:', receiptId);
      return receiptId;
    }

    console.log('Receipt not found');
    return null;
  } catch (error) {
    console.error('Error fetching latest receipt:', error);
    return null;
  }
};

// ファイル名に基づいてレシートを監視するカスタムフック
const useWaitForReceipt = (fileName: string | null, onFound: (receiptId: string) => void) => {
  usePollingEffect(
    async () => {
      if (!fileName) return false;
      const receiptId = await fetchLatestReceipt(fileName);
      if (receiptId) {
        onFound(receiptId);
        return false; // ポーリングを停止
      }
      return true; // ポーリングを継続
    },
    3000,
    [fileName]
  );
};

function App() {
  const [currentReceipt, setCurrentReceipt] = useState<Receipt | null>(null);
  const [processedReceipts, setProcessedReceipts] = useState<ProcessedReceipt[]>([]);
  const [currentReceiptId, setCurrentReceiptId] = useState<string | null>(null);
  const [uploadedFileName, setUploadedFileName] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  // コンポーネントマウント時に処理済みレシートを取得
  useEffect(() => {
    const fetchInitialData = async () => {
      const receipts = await fetchProcessedReceiptsFromFirestore();
      setProcessedReceipts(receipts);
    };
    
    fetchInitialData();
  }, []);

  // アップロードされたファイルの監視
  useWaitForReceipt(uploadedFileName, (receiptId) => {
    setCurrentReceiptId(receiptId);
    setUploadedFileName(null); // リセット
  });

  // レシート処理の監視（既存のポーリング）
  useReceiptPolling(currentReceiptId, (processedReceipt) => {
    setCurrentReceipt(processedReceipt);
    fetchProcessedReceiptsFromFirestore().then(setProcessedReceipts);
    setIsProcessing(false);
  });

  const handleFileUpload = async (files: File[]) => {
    try {
      setIsProcessing(true);
      const file = files[0];
      console.log('Uploading file:', file.name);
      
      await uploadToCloudStorage(file);
      setUploadedFileName(file.name);
      setCurrentReceipt(null);

      // ファイルアップロード後、Firestoreのドキュメントを監視
      let retryCount = 0;
      const maxRetries = 30;

      const checkForReceipt = async () => {
        const receiptId = await fetchLatestReceipt(file.name);
        if (receiptId) {
          console.log('Receipt found in Firestore:', receiptId);
          setCurrentReceiptId(receiptId);
          return true;
        }
        
        if (retryCount < maxRetries) {
          retryCount++;
          console.log(`Retry ${retryCount}/${maxRetries}`);
          await new Promise(resolve => setTimeout(resolve, 2000));
          return checkForReceipt();
        }
        
        throw new Error('レシートの処理がタイムアウトしました');
      };

      checkForReceipt().catch(error => {
        console.error('Error during receipt processing:', error);
        setIsProcessing(false);
      });

    } catch (error) {
      console.error('Error during file upload:', error);
      setIsProcessing(false);
    }
  };

  const handleCategorize = async (items: ReceiptItem[]) => {
    if (!currentReceipt) return;
    
    try {
      // 経費と私費の合計を計算
      const total_expense = items
        .filter(item => item.category === 'expense')
        .reduce((sum, item) => sum + item.price, 0);

      const total_personal = items
        .filter(item => item.category === 'personal')
        .reduce((sum, item) => sum + item.price, 0);

      // Firestoreに保存するデータを作成
      const processedData = {
        fields: {
          items: {
            arrayValue: { values: items.map(item => ({
              mapValue: {
                fields: {
                  id: { stringValue: item.id },
                  name: { stringValue: item.name },
                  price: { integerValue: item.price },
                  category: { stringValue: item.category }
                }
              }
            }))}
          },
          originalReceiptId: { stringValue: currentReceipt.id },
          store: { stringValue: currentReceipt.store_name },
          processedAt: { timestampValue: new Date().toISOString() },
          total_expense: { integerValue: total_expense },
          total_personal: { integerValue: total_personal }
        }
      };

      // Firestoreに保存
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
      const updatedReceipts = await fetchProcessedReceiptsFromFirestore();
      setProcessedReceipts(updatedReceipts);
      setCurrentReceipt(null);
    } catch (error) {
      console.error('Error saving categorized receipt:', error);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100">
      <div className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div>
            {isProcessing ? (
              <div className="bg-white rounded-lg shadow p-6">
                <div className="text-center py-12">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
                  <p className="mt-4 text-gray-600">レシートを解析中...</p>
                  <p className="text-sm text-gray-500">処理に少々時間がかかる場合があります</p>
                </div>
              </div>
            ) : (
              <>
                <FileUpload onUpload={handleFileUpload} />
                {currentReceipt && (
                  <ReceiptAnalysis 
                    receipt={currentReceipt}
                    onCategorize={handleCategorize}
                    isProcessing={false}
                  />
                )}
              </>
            )}
          </div>
          <div>
            <ReceiptHistory 
              receipts={processedReceipts} 
              isLoading={false}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;