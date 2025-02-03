export interface Receipt {
  id: string;
  imageUrl: string;
  date: string;
  totalAmount: number;
  items: ReceiptItem[];
  status: 'processing' | 'analyzed' | 'error';
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