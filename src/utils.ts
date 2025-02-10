export const extractTotalAmount = (text: string): number => {
  const amountMatch = text.match(/合計\s*[¥￥]?\s*(\d+)/);
  return amountMatch ? parseInt(amountMatch[1], 10) : 0;
}; 