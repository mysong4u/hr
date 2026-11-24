import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import mammoth from 'mammoth';

function getMimeType(filename: string): string {
  const ext = filename.split('.').pop()?.toLowerCase();
  switch (ext) {
    case 'pdf':
      return 'application/pdf';
    case 'docx':
      return 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
    case 'doc':
      return 'application/msword';
    case 'xlsx':
      return 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
    case 'xls':
      return 'application/vnd.ms-excel';
    case 'hwp':
    case 'hwpx':
      return 'application/x-hwp';
    case 'png':
      return 'image/png';
    case 'jpg':
    case 'jpeg':
      return 'image/jpeg';
    case 'txt':
      return 'text/plain; charset=utf-8';
    default:
      return 'application/octet-stream';
  }
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const applicantId = (formData.get('applicantId') as string | null) || null;
    const type = (formData.get('type') as string) || 'resume';
    const password = (formData.get('password') as string | null) || null;
    const auth = (formData.get('auth') as string | null) || null;

    // 복수 파일(files) 및 단일 파일(file) 모두 수집
    const allFileEntries = [
      ...formData.getAll('files'),
      ...formData.getAll('file'),
    ];

    const validFiles = allFileEntries.filter(
      (f): f is File => !!f && typeof f !== 'string' && typeof (f as any).arrayBuffer === 'function'
    );

    if (validFiles.length === 0) {
      return NextResponse.json({ error: '유효한 파일이 첨부되지 않았습니다.' }, { status: 400 });
    }

    let updatedApplicant = null;

    // 면접평가표인 경우: 최대 4개 파일까지 복수 파일 JSON 배열 페이로드로 저장
    if (type === 'interviewEval') {
      const targetFiles = validFiles.slice(0, 4);
      const fileItems = [];

      for (const f of targetFiles) {
        const arrayBuf = await f.arrayBuffer();
        const buffer = Buffer.from(arrayBuf);
        const originalName = f.name || '면접평가표.pdf';
        const mimeType = f.type || getMimeType(originalName);
        fileItems.push({
          name: originalName,
          size: buffer.length,
          type: mimeType,
          data: buffer.toString('base64'),
        });
      }

      const filePayload = JSON.stringify(fileItems);

      if (applicantId && applicantId.trim()) {
        try {
          const updateData: any = {
            interviewEvalFile: filePayload,
          };
          if (password !== null && password !== undefined) {
            updateData.interviewEvalPassword = password || null;
          }
          if (auth) {
            updateData.interviewEvalAuth = auth;
          }
          updatedApplicant = await prisma.applicant.update({
            where: { id: applicantId.trim() },
            data: updateData,
            include: { interviews: true, job: true },
          });
        } catch (dbErr) {
          console.error('Database update error in interviewEval upload:', dbErr);
        }
      }

      return NextResponse.json({
        success: true,
        count: fileItems.length,
        originalName: fileItems[0]?.name || '면접평가표.pdf',
        fileNames: fileItems.map((item) => item.name),
        filePayload,
        applicant: updatedApplicant,
      });
    }

    // 이력서(resume) 및 인성검사(personality)는 단일 파일 처리
    const browserFile = validFiles[0];
    const arrayBuf = await browserFile.arrayBuffer();
    const buffer = Buffer.from(arrayBuf);
    const originalName = browserFile.name || 'uploaded_file';
    const mimeType = browserFile.type || getMimeType(originalName);

    // 1. Netlify 서버리스(/var/task 읽기전용) 완벽 대응: Base64 JSON 페이로드 생성
    const base64Data = buffer.toString('base64');
    const filePayload = JSON.stringify({
      name: originalName,
      size: buffer.length,
      type: mimeType,
      data: base64Data,
    });

    // 2. 텍스트 추출 (Word docx, txt 등)
    let text = '';
    if (type === 'resume') {
      try {
        const lowerName = originalName.toLowerCase();
        if (lowerName.endsWith('.docx')) {
          const docxData = await mammoth.extractRawText({ buffer });
          text = docxData.value;
        } else if (lowerName.endsWith('.txt')) {
          text = buffer.toString('utf-8');
        } else if (lowerName.endsWith('.pdf')) {
          const snippet = buffer.toString('utf-8', 0, Math.min(buffer.length, 6000));
          const cleaned = snippet.replace(/[^\x20-\x7E\uAC00-\uD7A3\n\r\t]/g, ' ').replace(/\s+/g, ' ').trim();
          if (cleaned.length > 50) {
            text = cleaned.slice(0, 500);
          }
        }
        text = text.replace(/\n+/g, '\n').trim();
      } catch (err) {
        console.warn('Text parsing skipped:', err);
      }
    }

    // 3. PostgreSQL DB에 Base64 영구 저장 (TEXT 컬럼은 최대 1GB 지원)
    if (applicantId && applicantId.trim()) {
      try {
        const existingApplicant = await prisma.applicant.findUnique({
          where: { id: applicantId.trim() },
        });

        if (existingApplicant) {
          if (type === 'resume') {
            updatedApplicant = await prisma.applicant.update({
              where: { id: applicantId.trim() },
              data: {
                resumeUrl: filePayload,
                ...(text ? { resumeText: text } : {}),
              },
              include: { interviews: true, job: true },
            });
          } else if (type === 'personality') {
            const updateData: any = {
              personalityTestFile: filePayload,
            };
            if (password !== null && password !== undefined) {
              updateData.personalityTestPassword = password || null;
            }
            updatedApplicant = await prisma.applicant.update({
              where: { id: applicantId.trim() },
              data: updateData,
              include: { interviews: true, job: true },
            });
          }
        }
      } catch (dbErr) {
        console.error('Database update error in upload:', dbErr);
      }
    }

    return NextResponse.json({
      success: true,
      originalName,
      filePayload,
      text: text || `${originalName} 파일이 정상 등록되었습니다.`,
      applicant: updatedApplicant,
    });
  } catch (error: any) {
    console.error('File upload error:', error);
    return NextResponse.json(
      {
        error: error?.message || '파일 업로드 처리 중 오류가 발생했습니다.',
      },
      { status: 500 }
    );
  }
}
