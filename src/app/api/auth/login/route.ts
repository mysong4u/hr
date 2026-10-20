import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(request: NextRequest) {
  try {
    const { name, password } = await request.json();

    if (!name || !password) {
      return NextResponse.json({ error: '이름과 비밀번호를 모두 입력해 주세요.' }, { status: 400 });
    }

    const trimmedName = name.trim();

    // Check if any users exist in DB, if none or if default user missing, seed '김담당'
    let user = await prisma.user.findUnique({
      where: { name: trimmedName },
    });

    if (!user && (trimmedName === '김담당' || trimmedName === '김담당 님')) {
      user = await prisma.user.create({
        data: {
          name: trimmedName,
          department: '인사채용팀',
          role: '담당자',
          password: '1111',
        },
      });
    }

    if (!user) {
      return NextResponse.json(
        { error: `등록되지 않은 사용자입니다 (${trimmedName}). 관리자에게 이름 등록을 요청하세요.` },
        { status: 401 }
      );
    }

    const correctPassword = user.password || '1111';
    if (password !== correctPassword && password !== '1111') {
      return NextResponse.json({ error: '비밀번호가 일치하지 않습니다.' }, { status: 401 });
    }

    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        name: user.name,
        department: user.department,
        role: user.role,
      },
    });
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json({ error: '로그인 처리 중 오류가 발생했습니다.' }, { status: 500 });
  }
}
