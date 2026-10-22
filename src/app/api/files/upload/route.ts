import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { prisma } from '@/lib/prisma';
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

const UPLOADS_DIR = path.join(process.cwd(), 'public', 'uploads');
const MANIFEST_PATH = path.join(UPLOADS_DIR, 'manifest.json');

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
    const file = formData.get('file') as File;
    const applicantId = formData.get('applicantId') as string | null;
    const type = (formData.get('type') as string) || 'resume';
    const password = formData.get('password') as string | null;
    const auth = formData.get('auth') as string | null;

    if (!file) {
      return NextResponse.json({ error: '업로드할 파일이 없습니다.' }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const originalName = file.name;
    const timestamp = Date.now();
    const safeOriginalName = originalName.replace(/[^a-zA-Z0-9가-힣._-]/g, '_');
    const savedFileName = `${type}_${applicantId || 'temp'}_${timestamp}_${safeOriginalName}`;
    const filePath = path.join(UPLOADS_DIR, savedFileName);

    // 실제 바이너리 파일 저장
    fs.writeFileSync(filePath, buffer);

    // Manifest 업데이트
    const manifest = getManifest();
    const key = applicantId ? `${applicantId}_${type}` : `temp_${timestamp}_${type}`;
    manifest[key] = {
      originalName,
      savedFileName,
      size: file.size,
      mimeType: file.type || 'application/octet-stream',
      uploadedAt: new Date().toISOString(),
      applicantId: applicantId || null,
      type,
    };
    saveManifest(manifest);

    // 텍스트 추출 (이력서인 경우)
    let text = '';
    if (type === 'resume') {
      try {
        if (originalName.endsWith('.pdf')) {
          const data = await pdf(buffer);
          text = data.text;
        } else if (originalName.endsWith('.docx')) {
          const data = await mammoth.extractRawText({ buffer });
          text = data.value;
        } else if (originalName.endsWith('.txt')) {
          text = buffer.toString('utf-8');
        }
        text = text.replace(/\n+/g, '\n').trim();
      } catch (err) {
        console.warn('Text extraction failed:', err);
      }
    }

    let updatedApplicant = null;
    if (applicantId) {
      if (type === 'resume') {
        updatedApplicant = await prisma.applicant.update({
          where: { id: applicantId },
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
          where: { id: applicantId },
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
          where: { id: applicantId },
          data: updateData,
          include: { interviews: true, job: true },
        });
      }
    }

    return NextResponse.json({
      success: true,
      originalName,
      savedFileName,
      url: `/uploads/${savedFileName}`,
      text,
      applicant: updatedApplicant,
    });
  } catch (error) {
    console.error('File upload error:', error);
    return NextResponse.json({ error: '파일 업로드 처리 중 오류가 발생했습니다.' }, { status: 500 });
  }
}
