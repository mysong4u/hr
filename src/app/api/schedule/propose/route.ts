import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(request: NextRequest) {
  try {
    const { applicantId, interviewerEmails } = await request.json();

    if (!applicantId || !interviewerEmails) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // 4개의 제안 타임슬롯을 다음 주 주중 비즈니스 시간으로 도출 (시뮬레이션)
    const proposedSlots = [];
    const baseDate = new Date();
    baseDate.setDate(baseDate.getDate() + 3); // 3일 후부터 조율 제안 시작
    
    for (let i = 0; i < 4; i++) {
      const slotDate = new Date(baseDate);
      slotDate.setDate(baseDate.getDate() + Math.floor(i / 2)); // 하루에 2개 슬롯씩 배치
      slotDate.setHours(i % 2 === 0 ? 10 : 14, 0, 0, 0); // 오전 10시 또는 오후 2시
      proposedSlots.push(slotDate.toISOString());
    }

    // 해당 지원자에 대한 미확정 인터뷰 데이터가 이미 있다면 삭제
    await prisma.interview.deleteMany({
      where: { applicantId, status: 'PROPOSED' }
    });

    // PROPOSED 상태의 Interview 레코드 생성
    await prisma.interview.create({
      data: {
        applicantId,
        interviewers: interviewerEmails,
        status: 'PROPOSED',
        proposedSlots: JSON.stringify(proposedSlots),
      }
    });

    // 지원자 상태를 'INTERVIEW_PROPOSED'(면접 제안)로 변경
    const updatedApplicant = await prisma.applicant.update({
      where: { id: applicantId },
      data: {
        status: 'INTERVIEW_PROPOSED',
      },
      include: {
        interviews: true,
      }
    });

    return NextResponse.json(updatedApplicant);
  } catch (error) {
    console.error('Propose schedule failed:', error);
    return NextResponse.json({ error: 'Failed to propose schedule' }, { status: 500 });
  }
}
