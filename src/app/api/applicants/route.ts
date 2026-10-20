import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const jobId = searchParams.get('jobId');
    const search = searchParams.get('search');
    const status = searchParams.get('status');
    const jobRole = searchParams.get('jobRole');
    const siteName = searchParams.get('siteName');

    const where: any = {};
    if (jobId) where.jobId = jobId;
    if (status && status !== 'ALL') where.status = status;
    if (jobRole && jobRole !== 'ALL') where.jobRole = jobRole;
    if (siteName && siteName !== 'ALL') where.siteName = siteName;

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { phone: { contains: search, mode: 'insensitive' } },
      ];
    }

    const applicants = await prisma.applicant.findMany({
      where,
      include: { interviews: true, job: true },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json(applicants);
  } catch (error) {
    console.error('Failed to fetch applicants:', error);
    return NextResponse.json({ error: 'Failed to fetch applicants' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    let { name, email, phone, applyPath, jobRole, siteName, memo, status, jobId, resumeText } = body;

    if (!name || !phone) {
      return NextResponse.json({ error: '이름과 연락처는 필수 항목입니다.' }, { status: 400 });
    }

    // Default Job if none specified
    if (!jobId) {
      const defaultJob = await prisma.job.findFirst();
      if (defaultJob) {
        jobId = defaultJob.id;
      } else {
        const createdJob = await prisma.job.create({
          data: {
            title: '일반 채용',
            department: '인사팀',
            description: '상시 채용',
            requirements: '상시 채용 요건',
          },
        });
        jobId = createdJob.id;
      }
    }

    const applicant = await prisma.applicant.create({
      data: {
        name,
        email: email || `${Date.now()}@example.com`,
        phone,
        applyPath: applyPath || '사람인',
        jobRole: jobRole || '공사',
        siteName: siteName || '',
        memo: memo || '',
        status: status || 'APPLIED',
        resumeText: resumeText || '',
        jobId,
      },
      include: { job: true, interviews: true },
    });

    return NextResponse.json(applicant, { status: 201 });
  } catch (error) {
    console.error('Failed to create applicant:', error);
    return NextResponse.json({ error: 'Failed to create applicant' }, { status: 500 });
  }
}
