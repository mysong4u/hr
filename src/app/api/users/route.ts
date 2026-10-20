import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    // If no users exist, seed default user
    const count = await prisma.user.count();
    if (count === 0) {
      await prisma.user.create({
        data: {
          name: '김담당',
          department: '인사채용팀',
          role: '담당자',
          password: '1111',
        },
      });
    }

    const users = await prisma.user.findMany({
      select: {
        id: true,
        name: true,
        department: true,
        role: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'asc' },
    });

    return NextResponse.json(users);
  } catch (error) {
    console.error('Failed to fetch users:', error);
    return NextResponse.json({ error: '사용자 목록 조회에 실패했습니다.' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { name, department, role, password } = await request.json();

    if (!name || !name.trim()) {
      return NextResponse.json({ error: '등록할 사용자 이름을 입력해 주세요.' }, { status: 400 });
    }

    const trimmedName = name.trim();

    const existing = await prisma.user.findUnique({
      where: { name: trimmedName },
    });

    if (existing) {
      return NextResponse.json({ error: '이미 등록되어 있는 사용자 이름입니다.' }, { status: 409 });
    }

    const newUser = await prisma.user.create({
      data: {
        name: trimmedName,
        department: department || '인사채용팀',
        role: role || '담당자',
        password: password || '1111',
      },
    });

    return NextResponse.json(newUser, { status: 201 });
  } catch (error) {
    console.error('Failed to create user:', error);
    return NextResponse.json({ error: '사용자 등록 중 오류가 발생했습니다.' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const { id, name, department, role } = await request.json();

    if (!id) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    const updated = await prisma.user.update({
      where: { id },
      data: {
        ...(name && { name: name.trim() }),
        ...(department && { department: department.trim() }),
        ...(role && { role: role.trim() }),
      },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error('Failed to update user:', error);
    return NextResponse.json({ error: '사용자 정보 수정 중 오류가 발생했습니다.' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    await prisma.user.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to delete user:', error);
    return NextResponse.json({ error: '사용자 삭제 중 오류가 발생했습니다.' }, { status: 500 });
  }
}
