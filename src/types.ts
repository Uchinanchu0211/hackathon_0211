export interface Receipt {
  id: string;
  items: ReceiptItem[];
  store_name: string;
  total_amount: number;
  metadata: {
    processedAt: string;
    status: string;
    updatedAt: string;
  };
  originalFile: {
    bucket: string;
    name: string;
    path: string;
  };
  status: 'processed' | 'processing' | 'error';
}

export interface ReceiptItem {
  id: string;
  name: string;
  price: number;
  category: 'expense' | 'personal' | 'unclassified';
}

export interface AnalysisResult {
  items: ReceiptItem[];
  totalAmount: number;
  date: string;
}

export interface ProcessedReceipt {
  id: string;
  originalReceiptId: string;
  store: string;
  amount: number;
  category: 'expense' | 'personal';
  processedAt: string;
  metadata: {
    processedAt: string;
    store: string;
    status: string;
  };
}