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
      'resumeUrl',
      'resumeText',
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

    // Interview 정보 업데이트가 포함된 경우
    if (
      body.interviewers !== undefined ||
      body.interviewDate !== undefined ||
      body.scheduledTime !== undefined ||
      body.location !== undefined
    ) {
      const scheduledTime = body.interviewDate
        ? new Date(body.interviewDate)
        : body.scheduledTime
        ? new Date(body.scheduledTime)
        : undefined;

      const existingInterview = await prisma.interview.findFirst({
        where: { applicantId: id },
      });

      if (existingInterview) {
        await prisma.interview.update({
          where: { id: existingInterview.id },
          data: {
            ...(body.interviewers !== undefined ? { interviewers: body.interviewers } : {}),
            ...(scheduledTime !== undefined ? { scheduledTime } : {}),
            ...(body.location !== undefined ? { location: body.location } : {}),
          },
        });
      } else {
        await prisma.interview.create({
          data: {
            applicantId: id,
            interviewers: body.interviewers || '김민수 PM, 이지현 팀장',
            scheduledTime: scheduledTime || null,
            location: body.location || '태일씨앤티 본사 회의실',
            status: 'PROPOSED',
          },
        });
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
