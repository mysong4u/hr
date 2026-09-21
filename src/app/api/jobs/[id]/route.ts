import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;

    if (!id) {
      return NextResponse.json({ error: 'Job ID is required' }, { status: 400 });
    }

    // schema.prisma에 onDelete: Cascade가 정의되어 있으므로,
    // 채용공고(Job)를 삭제하면 관련된 지원자(Applicant) 및 면접 일정(Interview)이 DB 레벨에서 자동 연쇄 삭제됩니다.
    const deletedJob = await prisma.job.delete({
      where: { id },
    });

    return NextResponse.json(deletedJob);
  } catch (error) {
    console.error('Failed to delete job:', error);
    return NextResponse.json({ error: 'Failed to delete job' }, { status: 500 });
  }
}
