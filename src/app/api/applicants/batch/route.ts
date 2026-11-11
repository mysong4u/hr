import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { applicants } = body;

    if (!Array.isArray(applicants) || applicants.length === 0) {
      return NextResponse.json(
        { error: '등록할 지원자 데이터가 없습니다.' },
        { status: 400 }
      );
    }

    // Default Job if none specified
    let defaultJob = await prisma.job.findFirst();
    if (!defaultJob) {
      defaultJob = await prisma.job.create({
        data: {
          title: '일반 채용',
          department: '인사팀',
          description: '상시 채용',
          requirements: '상시 채용 요건',
        },
      });
    }

    const createdList: any[] = [];
    const errors: { row: number; name: string; error: string }[] = [];

    // Process applicants sequentially or in small chunks
    for (let i = 0; i < applicants.length; i++) {
      const item = applicants[i];
      const rowNum = i + 1;

      if (!item.name || !item.phone) {
        errors.push({
          row: rowNum,
          name: item.name || '(이름 없음)',
          error: '이름과 연락처는 필수 항목입니다.',
        });
        continue;
      }

      try {
        const applicant = await prisma.applicant.create({
          data: {
            name: item.name.trim(),
            email: item.email?.trim() || `${Date.now()}_${i}@example.com`,
            phone: item.phone.trim(),
            applyPath: item.applyPath?.trim() || '사람인',
            jobRole: item.jobRole?.trim() || '공사',
            siteName: item.siteName?.trim() || '',
            memo: item.memo?.trim() || '',
            status: item.status || 'APPLIED',
            joinDate: item.joinDate ? new Date(item.joinDate) : null,
            resumeUrl: null,
            resumeText: '',
            jobId: defaultJob.id,
            interviews: {
              create: {
                interviewers: item.interviewers?.trim() || '김민수 PM, 이지현 팀장',
                scheduledTime: item.interviewDate ? new Date(item.interviewDate) : null,
                location: item.interviewLocation?.trim() || '태일씨앤티 본사 회의실',
                status: 'PROPOSED',
              },
            },
          },
          include: {
            job: true,
            interviews: true,
          },
        });

        createdList.push(applicant);
      } catch (err: any) {
        console.error(`Error creating applicant at row ${rowNum}:`, err);
        errors.push({
          row: rowNum,
          name: item.name,
          error: err?.message || '저장 중 DB 오류 발생',
        });
      }
    }

    return NextResponse.json({
      success: true,
      totalRequested: applicants.length,
      successCount: createdList.length,
      failureCount: errors.length,
      createdApplicants: createdList,
      errors,
    });
  } catch (error: any) {
    console.error('Batch applicant creation failed:', error);
    return NextResponse.json(
      { error: '지원자 일괄 등록 처리 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}
