import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const body = await request.json();
    const { status, aiScore, aiReason } = body;

    const applicant = await prisma.applicant.update({
      where: { id },
      data: {
        ...(status && { status }),
        ...(aiScore && { aiScore }),
        ...(aiReason !== undefined && { aiReason }),
      },
      include: { interviews: true },
    });

    return NextResponse.json(applicant);
  } catch (error) {
    console.error('Failed to update applicant:', error);
    return NextResponse.json({ error: 'Failed to update applicant' }, { status: 500 });
  }
}
