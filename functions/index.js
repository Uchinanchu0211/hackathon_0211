const functions = require('firebase-functions');
const {DocumentProcessorServiceClient} = require('@google-cloud/documentai').v1;
require('dotenv').config();

// DocumentAIクライアントの初期化
const client = new DocumentProcessorServiceClient();

exports.processReceipt = functions.storage.object().onFinalize(async (object) => {
  try {
    const projectId = process.env.PROJECT_ID;
    const location = 'us';
    const processorId = process.env.PROCESSOR_ID;

    const name = `projects/${projectId}/locations/${location}/processors/${processorId}`;

    // Cloud Storageからファイルを読み込む
    const bucket = admin.storage().bucket(object.bucket);
    const file = bucket.file(object.name);
    const [content] = await file.download();

    // DocumentAIリクエストの作成
    const request = {
      name,
      rawDocument: {
        content: content.toString('base64'),
        mimeType: object.contentType,
      },
    };

    // DocumentAIでの処理実行
    const [result] = await client.processDocument(request);
    const {document} = result;

    // 抽出されたテキストとエンティティの処理
    const text = document.text;
    const entities = document.entities;

    // 結果をFirestoreに保存
    await admin.firestore().collection('receipts').add({
      text: text,
      entities: entities,
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
      originalFile: object.name
    });

  } catch (error) {
    console.error('Error processing document:', error);
    throw error;
  }
}); 