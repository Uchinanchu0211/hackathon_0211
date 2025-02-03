const { DocumentProcessorServiceClient } = require('@google-cloud/documentai');
const fs = require('fs');
require('dotenv').config();

const client = new DocumentProcessorServiceClient();

async function processDocument() {
    const projectId = process.env.PROJECT_ID;
    const location = 'us'; // プロセッサーを作成したリージョン
    const processorId = process.env.PROCESSOR_ID; // プロセッサーのID
    const filePath = 'IMG_4410.jpg'; // OCR対象のレシート画像またはPDF

    const imageFile = fs.readFileSync(filePath);
    const encodedImage = imageFile.toString('base64');

    const request = {
        name: `projects/${projectId}/locations/${location}/processors/${processorId}`,
        rawDocument: {
            content: encodedImage,
            mimeType: 'image/jpeg',
        },
    };

    const [result] = await client.processDocument(request);
    const document = result.document;

    console.log("OCR結果:", document.text);

    // 🔍 自動で項目分けされた情報を抽出
    if (document.entities) {
        console.log("\n📌 項目分けされたデータ:");
        document.entities.forEach(entity => {
            console.log(`- ${entity.type}: ${entity.mentionText}`);
        });
    } else {
        console.log("\n⚠️ 項目分けされた情報が見つかりませんでした。");
    }
}

processDocument().catch(console.error);