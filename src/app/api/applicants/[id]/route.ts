import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const body = await request.json();

    const allowedFields = [
      'status',
      'aiScore',
      'aiReason',
      'memo',
      'joinDate',
      'jobRole',
      'siteName',
      'applyPath',
      'personalityTestFile',
      'personalityTestPassword',
      'interviewEvalFile',
      'interviewEvalPassword',
      'interviewEvalAuth',
    ];

    const updateData: any = {};
    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        if (field === 'joinDate') {
          updateData[field] = body[field] ? new Date(body[field]) : null;
        } else {
          updateData[field] = body[field];
        }
      }
    }

    const applicant = await prisma.applicant.update({
      where: { id },
      data: updateData,
      include: { interviews: true, job: true },
    });

    return NextResponse.json(applicant);
  } catch (error) {
    console.error('Failed to update applicant:', error);
    return NextResponse.json({ error: 'Failed to update applicant' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    await prisma.applicant.delete({
      where: { id },
    });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to delete applicant:', error);
    return NextResponse.json({ error: 'Failed to delete applicant' }, { status: 500 });
  }
}
