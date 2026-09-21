import { NextRequest, NextResponse } from 'next/server';
import mammoth from 'mammoth';

// Node.js 환경에서 pdf-parse가 기대하는 브라우저 API(DOMMatrix) 폴리필 주입
if (typeof window === 'undefined') {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (global as any).DOMMatrix = class DOMMatrix {
    constructor() {}
  };
}

// eslint-disable-next-line @typescript-eslint/no-require-imports
const pdf = require('pdf-parse');

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    let text = '';

    if (file.name.endsWith('.pdf')) {
      const data = await pdf(buffer);
      text = data.text;
    } else if (file.name.endsWith('.docx')) {
      const data = await mammoth.extractRawText({ buffer });
      text = data.value;
    } else {
      // 일반 텍스트 파일 등으로 처리
      text = buffer.toString('utf-8');
    }

    // 불필요한 연속 공백 및 개행 제거하여 텍스트 정돈
    text = text.replace(/\n+/g, '\n').trim();

    return NextResponse.json({ text });
  } catch (error) {
    console.error('File parsing failed:', error);
    return NextResponse.json({ error: 'Failed to parse file' }, { status: 500 });
  }
}
