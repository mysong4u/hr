import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(request: NextRequest) {
  try {
    const { applicantId, type, password } = await request.json();

    if (!applicantId || !type || !password) {
      return NextResponse.json({ error: '필수 입력값이 누락되었습니다.' }, { status: 400 });
    }

    const applicant = await prisma.applicant.findUnique({
      where: { id: applicantId },
    });

    if (!applicant) {
      return NextResponse.json({ error: '지원자를 찾을 수 없습니다.' }, { status: 404 });
    }

    const correctPassword =
      type === 'personality'
        ? applicant.personalityTestPassword
        : applicant.interviewEvalPassword;

    if (!correctPassword) {
      return NextResponse.json({ valid: true, message: '비밀번호가 설정되어 있지 않습니다.' });
    }

    if (correctPassword === password) {
      return NextResponse.json({ valid: true });
    } else {
      return NextResponse.json({ valid: false, error: '비밀번호가 일치하지 않습니다.' }, { status: 401 });
    }
  } catch (error) {
    console.error('Password verification error:', error);
    return NextResponse.json({ error: '비밀번호 검증 중 오류가 발생했습니다.' }, { status: 500 });
  }
}
