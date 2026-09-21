import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const jobId = searchParams.get('jobId');

    if (!jobId) {
      return NextResponse.json({ error: 'Job ID is required' }, { status: 400 });
    }

    const applicants = await prisma.applicant.findMany({
      where: { jobId },
      include: { interviews: true },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json(applicants);
  } catch (error) {
    console.error('Failed to fetch applicants:', error);
    return NextResponse.json({ error: 'Failed to fetch applicants' }, { status: 500 });
  }
}
