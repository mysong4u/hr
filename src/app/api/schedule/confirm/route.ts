import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(request: NextRequest) {
  try {
    const { applicantId, slot } = await request.json();

    if (!applicantId || !slot) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // 지원자가 제안받은 인터뷰 일정 찾기
    const interview = await prisma.interview.findFirst({
      where: { applicantId, status: 'PROPOSED' }
    });

    if (!interview) {
      return NextResponse.json({ error: 'Proposed interview not found' }, { status: 404 });
    }

    // 구글 미트(Google Meet) 화상회의 링크 생성 (시뮬레이션)
    const codes = 'abcdefghijklmnopqrstuvwxyz';
    let meetCode = '';
    for (let i = 0; i < 10; i++) {
      if (i === 3 || i === 7) meetCode += '-';
      meetCode += codes.charAt(Math.floor(Math.random() * codes.length));
    }
    const meetingLink = `https://meet.google.com/${meetCode}`;

    // Interview 데이터를 CONFIRMED(일정 확정) 상태로 업데이트
    await prisma.interview.update({
      where: { id: interview.id },
      data: {
        status: 'CONFIRMED',
        scheduledTime: new Date(slot),
        meetingLink,
      }
    });

    // 지원자 상태를 'INTERVIEW_SCHEDULED'(면접 예정)로 변경
    const updatedApplicant = await prisma.applicant.update({
      where: { id: applicantId },
      data: {
        status: 'INTERVIEW_SCHEDULED'
      },
      include: {
        interviews: true
      }
    });

    return NextResponse.json(updatedApplicant);
  } catch (error) {
    console.error('Confirm schedule failed:', error);
    return NextResponse.json({ error: 'Failed to confirm schedule' }, { status: 500 });
  }
}
