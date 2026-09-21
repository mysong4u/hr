import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, email, phone, resumeText, jobId } = body;

    if (!name || !email || !phone || !jobId) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const applicant = await prisma.applicant.create({
      data: {
        name,
        email,
        phone,
        resumeText: resumeText || null,
        jobId,
        status: 'APPLIED',
      },
      include: {
        interviews: true,
      },
    });

    return NextResponse.json(applicant);
  } catch (error) {
    console.error('Failed to create applicant:', error);
    return NextResponse.json({ error: 'Failed to create applicant' }, { status: 500 });
  }
}
