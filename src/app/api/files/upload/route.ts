import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { prisma } from '@/lib/prisma';
import mammoth from 'mammoth';

const UPLOADS_DIR = path.resolve(process.cwd(), 'public', 'uploads');
const MANIFEST_PATH = path.resolve(UPLOADS_DIR, 'manifest.json');

function ensureUploadsDir() {
  if (!fs.existsSync(UPLOADS_DIR)) {
    fs.mkdirSync(UPLOADS_DIR, { recursive: true });
  }
}

function getManifest(): Record<string, any> {
  ensureUploadsDir();
  if (fs.existsSync(MANIFEST_PATH)) {
    try {
      const data = fs.readFileSync(MANIFEST_PATH, 'utf-8');
      return JSON.parse(data);
    } catch {
      return {};
    }
  }
  return {};
}

function saveManifest(manifest: Record<string, any>) {
  ensureUploadsDir();
  try {
    fs.writeFileSync(MANIFEST_PATH, JSON.stringify(manifest, null, 2), 'utf-8');
  } catch (err) {
    console.error('Failed to save manifest:', err);
  }
}

export async function POST(request: NextRequest) {
  try {
    ensureUploadsDir();

    const formData = await request.formData();
    const file = formData.get('file');
    const applicantId = (formData.get('applicantId') as string | null) || null;
    const type = (formData.get('type') as string) || 'resume';
    const password = (formData.get('password') as string | null) || null;
    const auth = (formData.get('auth') as string | null) || null;

    if (!file || typeof file === 'string' || typeof (file as any).arrayBuffer !== 'function') {
      return NextResponse.json({ error: '유효한 파일이 첨부되지 않았습니다.' }, { status: 400 });
    }

    const browserFile = file as File;
    const arrayBuf = await browserFile.arrayBuffer();
    const buffer = Buffer.from(arrayBuf);
    const originalName = browserFile.name || 'uploaded_file';
    const timestamp = Date.now();
    const safeOriginalName = originalName.replace(/[^a-zA-Z0-9가-힣._-]/g, '_');
    const savedFileName = `${type}_${applicantId || 'temp'}_${timestamp}_${safeOriginalName}`;
    const filePath = path.join(UPLOADS_DIR, savedFileName);

    // 실제 바이너리 파일 디스크 저장
    fs.writeFileSync(filePath, buffer);

    // Manifest 메타데이터 등록
    const manifest = getManifest();
    const manifestKey = applicantId ? `${applicantId}_${type}` : `temp_${timestamp}_${type}`;
    manifest[manifestKey] = {
      originalName,
      savedFileName,
      size: buffer.length,
      mimeType: browserFile.type || 'application/octet-stream',
      uploadedAt: new Date().toISOString(),
      applicantId: applicantId || null,
      type,
    };
    saveManifest(manifest);

    // 텍스트 추출 (docx, txt 등 안전하게 지원)
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
          // PDF 바이너리 내 인쇄 가능 문자 기반 텍스트 요약
          const snippet = buffer.toString('utf-8', 0, Math.min(buffer.length, 5000));
          const cleaned = snippet.replace(/[^\x20-\x7E\uAC00-\uD7A3\n\r\t]/g, ' ').replace(/\s+/g, ' ').trim();
          if (cleaned.length > 50) {
            text = cleaned.slice(0, 500);
          }
        }
        text = text.replace(/\n+/g, '\n').trim();
      } catch (extractErr) {
        console.warn('Text extraction skipped:', extractErr);
      }
    }

    // 지원자 정보 갱신 (applicantId가 전달된 경우)
    let updatedApplicant = null;
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
                resumeUrl: originalName,
                ...(text ? { resumeText: text } : {}),
              },
              include: { interviews: true, job: true },
            });
          } else if (type === 'interviewEval') {
            const updateData: any = {
              interviewEvalFile: originalName,
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
          } else if (type === 'personality') {
            const updateData: any = {
              personalityTestFile: originalName,
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
      savedFileName,
      url: `/uploads/${savedFileName}`,
      text: text || `${originalName} 파일이 정상 등록되었습니다.`,
      applicant: updatedApplicant,
    });
  } catch (error: any) {
    console.error('File upload error:', error);
    return NextResponse.json(
      {
        error: error?.message || '파일 업로드 처리 중 오류가 발생했습니다.',
        detail: String(error),
      },
      { status: 500 }
    );
  }
}
