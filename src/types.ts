export interface Receipt {
  id: string;
  fullText: string;
  metadata: {
    processedAt: string;
    store: string;
    status: string;
    updatedAt: string;
  };
  originalFile: {
    bucket: string;
    name: string;
    path: string;
  };
  rawText: string;
  status: 'processed' | 'processing' | 'error';
  store: string;
}

export interface ReceiptItem {
  id: string;
  name: string;
  price: number;
  category: 'business' | 'personal' | 'unclassified';
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