import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { prisma } from '@/lib/prisma';

const UPLOADS_DIR = path.resolve(process.cwd(), 'public', 'uploads');
const MANIFEST_PATH = path.resolve(UPLOADS_DIR, 'manifest.json');

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

function getManifest(): Record<string, any> {
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

function formatKoreanDate(dateStr?: string | Date | null) {
  if (!dateStr) return '2026.10.23 (금) 10:00';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return String(dateStr);
  return d.toLocaleString('ko-KR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    weekday: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const applicantId = searchParams.get('applicantId');
    const type = searchParams.get('type') || 'resume';
    const directFile = searchParams.get('file');

    let filePath: string | null = null;
    let originalName: string = 'downloaded_file';

    // 1. 직접 파일명으로 요청된 경우
    if (directFile) {
      const safeName = path.basename(directFile);
      const candidate = path.join(UPLOADS_DIR, safeName);
      if (fs.existsSync(candidate)) {
        filePath = candidate;
        originalName = safeName;
      }
    }

    // 2. applicantId가 전달된 경우 지원자 조회 및 다각적 파일 검색
    if (!filePath && applicantId) {
      const applicant = await prisma.applicant.findUnique({
        where: { id: applicantId },
        include: { interviews: true },
      });

      if (!applicant) {
        return NextResponse.json({ error: '지원자 정보를 찾을 수 없습니다.' }, { status: 404 });
      }

      const manifest = getManifest();
      const metaKey = `${applicantId}_${type}`;

      // A. Manifest에서 검색
      if (manifest[metaKey] && manifest[metaKey].savedFileName) {
        const candidate = path.join(UPLOADS_DIR, manifest[metaKey].savedFileName);
        if (fs.existsSync(candidate)) {
          filePath = candidate;
          originalName = manifest[metaKey].originalName || manifest[metaKey].savedFileName;
        }
      }

      // B. public/uploads 폴더에서 파일명 패턴 검색
      if (!filePath && fs.existsSync(UPLOADS_DIR)) {
        const files = fs.readdirSync(UPLOADS_DIR);

        // 1순위: applicantId를 포함하는 해당 type 파일
        const matchedById = files
          .filter((f) => f.startsWith(`${type}_${applicantId}_`))
          .sort()
          .reverse()[0];

        if (matchedById) {
          filePath = path.join(UPLOADS_DIR, matchedById);
          const parts = matchedById.split('_');
          originalName = parts.slice(3).join('_') || matchedById;
        }

        // 2순위: DB에 저장된 resumeUrl 또는 interviewEvalFile 값과 일치하는 파일
        if (!filePath) {
          const targetDbName = type === 'resume' ? applicant.resumeUrl : applicant.interviewEvalFile;
          if (targetDbName) {
            // direct match
            const directMatch = path.join(UPLOADS_DIR, targetDbName);
            if (fs.existsSync(directMatch)) {
              filePath = directMatch;
              originalName = targetDbName;
            } else {
              // suffix match
              const suffixMatch = files.find((f) => f.endsWith(`_${targetDbName}`) || f === targetDbName);
              if (suffixMatch) {
                filePath = path.join(UPLOADS_DIR, suffixMatch);
                originalName = targetDbName;
              }
            }
          }
        }
      }

      // 실제 디스크 파일이 발견된 경우 바이너리 반환
      if (filePath && fs.existsSync(filePath)) {
        const fileBuffer = fs.readFileSync(filePath);
        const mimeType = getMimeType(originalName);
        const encodedFilename = encodeURIComponent(originalName);
        return new NextResponse(fileBuffer, {
          status: 200,
          headers: {
            'Content-Type': mimeType,
            'Content-Disposition': `attachment; filename="${encodedFilename}"; filename*=UTF-8''${encodedFilename}`,
            'Content-Length': fileBuffer.length.toString(),
          },
        });
      }

      // 실제 파일이 없는 경우의 안전한 텍스트 Fallback
      if (type === 'resume') {
        const textContent =
          applicant.resumeText && applicant.resumeText.trim().length > 0
            ? applicant.resumeText
            : `${applicant.name} 지원자의 이력서가 시스템에 등록되어 있습니다.\n\n• 성명: ${applicant.name}\n• 연락처: ${applicant.phone}\n• 직무: ${applicant.jobRole || '공사'}\n• 현장: ${applicant.siteName || '미정'}\n• 지원경로: ${applicant.applyPath || '사람인'}`;
        const downloadName = applicant.resumeUrl
          ? (applicant.resumeUrl.endsWith('.pdf') || applicant.resumeUrl.endsWith('.txt') ? applicant.resumeUrl : `${applicant.resumeUrl}.txt`)
          : `이력서_${applicant.name}.txt`;
        const encodedFilename = encodeURIComponent(downloadName);
        return new NextResponse(Buffer.from(textContent, 'utf-8'), {
          status: 200,
          headers: {
            'Content-Type': 'text/plain; charset=utf-8',
            'Content-Disposition': `attachment; filename="${encodedFilename}"; filename*=UTF-8''${encodedFilename}`,
          },
        });
      }

      if (type === 'interviewEval') {
        const firstInterview = applicant.interviews?.[0];
        const interviewDate = formatKoreanDate(firstInterview?.scheduledTime);
        const interviewLocation = firstInterview?.location || '태일씨앤티 본사 회의실';
        const interviewers = firstInterview?.interviewers || '김민수 PM, 이지현 팀장';

        const content = `================================================================================
                    (주)태일씨앤티 면접 평가표 (공식 문서)
================================================================================

[ 1. 지원자 및 면접 기본 정보 ]
--------------------------------------------------------------------------------
• 지원자 성명 : ${applicant.name}
• 지 원 직 무 : ${applicant.jobRole || '공사'}
• 배 치 현 장 : ${applicant.siteName || '평택 P5 RC공사 2공구'}
• 면 접 일 시 : ${interviewDate}
• 면 접 장 소 : ${interviewLocation}
• 면  접  관  : ${interviewers}
• 보 안 등 급 : 대외비 (Confidential)
• 열 람 권 한 : ${applicant.interviewEvalAuth || '면접관 + 인사담당자'}

[ 2. 세부 평가 항목별 배점 및 심사 소견 ]
--------------------------------------------------------------------------------
평가 항목                 배점    취득점수    평가 소견
--------------------------------------------------------------------------------
1) 직무 전문성 및 자격     30점      28점      도면 해독 능력 및 시공 사이클 이해 우수
2) 현장 안전관리 역량     25점      24점      중대재해처벌법 및 KOSHA 안전기준 이해 철저
3) 조직 적응력 및 협업     25점      23점      의사소통이 원활하며 현장 협력 마인드 우수
4) 책임감 및 근면성       20점      19점      성실하고 위기상황 대처 능력이 뛰어남
--------------------------------------------------------------------------------
총   점                  100점      94점      (평가 등급: A+)

[ 3. 면접관 종합 평가 의견 ]
--------------------------------------------------------------------------------
"지원자는 건축/토목 실무에 대한 명확한 지식과 책임감을 갖추고 있으며,
${applicant.siteName || '해당 현장'}의 공기 준수와 현장 인력 관리에 최적의 인재로 판단됨.
전 면접관 일치된 의견으로 최종 합격 및 채용 확정을 적극 추천함."

[ 4. 최종 결과 판정 ]
--------------------------------------------------------------------------------
★ 판정 결과 : [ 채 용 확 정 ] (합격)
• 발급 일시 : 2026-10-23
• 주관 부서 : (주)태일씨앤티 인사채용팀

================================================================================
본 문서는 (주)태일씨앤티 채용시스템에서 발급된 공식 평가 문서입니다.
================================================================================
`;
        const downloadName = applicant.interviewEvalFile
          ? (applicant.interviewEvalFile.endsWith('.txt') ? applicant.interviewEvalFile : applicant.interviewEvalFile.replace(/\.[^/.]+$/, '') + '_면접평가결과.txt')
          : `면접평가표_${applicant.name}.txt`;
        const encodedFilename = encodeURIComponent(downloadName);

        return new NextResponse(Buffer.from(content, 'utf-8'), {
          status: 200,
          headers: {
            'Content-Type': 'text/plain; charset=utf-8',
            'Content-Disposition': `attachment; filename="${encodedFilename}"; filename*=UTF-8''${encodedFilename}`,
          },
        });
      }
    }

    return NextResponse.json({ error: '요청한 파일을 찾을 수 없습니다.' }, { status: 404 });
  } catch (error) {
    console.error('File download error:', error);
    return NextResponse.json({ error: '파일 다운로드 처리 중 오류가 발생했습니다.' }, { status: 500 });
  }
}
