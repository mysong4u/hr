import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    const sites = await prisma.site.findMany({
      include: {
        requirements: {
          orderBy: { createdAt: 'asc' },
        },
      },
      orderBy: { createdAt: 'asc' },
    });
    return NextResponse.json(sites);
  } catch (error) {
    console.error('Failed to fetch sites:', error);
    return NextResponse.json({ error: 'Failed to fetch sites' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, location, pmName, pmContact, requirements } = body;

    if (!name || !location) {
      return NextResponse.json({ error: '현장명과 위치는 필수입니다.' }, { status: 400 });
    }

    const site = await prisma.site.create({
      data: {
        name,
        location,
        pmName: pmName || '담당 PM',
        pmContact: pmContact || '',
        requirements: {
          create: Array.isArray(requirements)
            ? requirements.map((req: any) => ({
                jobRole: req.jobRole,
                requiredCount: Number(req.requiredCount) || 0,
                currentCount: Number(req.currentCount) || 0,
              }))
            : [],
        },
      },
      include: { requirements: true },
    });

    return NextResponse.json(site, { status: 201 });
  } catch (error) {
    console.error('Failed to create site:', error);
    return NextResponse.json({ error: 'Failed to create site' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { siteId, pmName, requirements, modifiedBy } = body;

    if (!siteId) {
      return NextResponse.json({ error: 'Site ID is required' }, { status: 400 });
    }

    const site = await prisma.site.findUnique({
      where: { id: siteId },
    });

    if (!site) {
      return NextResponse.json({ error: 'Site not found' }, { status: 404 });
    }

    // Update requirements
    if (Array.isArray(requirements)) {
      for (const req of requirements) {
        if (req.id) {
          await prisma.siteRequirement.update({
            where: { id: req.id },
            data: {
              requiredCount: Number(req.requiredCount) || 0,
              currentCount: Number(req.currentCount) || 0,
            },
          });
        }
      }
    }

    // If PM name modified
    if (pmName) {
      await prisma.site.update({
        where: { id: siteId },
        data: { pmName },
      });
    }

    // Create Notification according to requirement (Page 15 in PDF)
    // "평택 P5 RC공사 2공구 현장의 필요인원이 수정되었습니다. (수정자: 김민수 PM / 2026-10-16 14:32)"
    const now = new Date();
    const formattedDate = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    const modifier = modifiedBy || site.pmName || '현장 PM';

    await prisma.notification.create({
      data: {
        title: '현장 필요인원 수정 알림',
        message: `${site.name} 현장의 필요인원이 수정되었습니다. (수정자: ${modifier} / ${formattedDate})`,
      },
    });

    const updatedSite = await prisma.site.findUnique({
      where: { id: siteId },
      include: { requirements: true },
    });

    return NextResponse.json(updatedSite);
  } catch (error) {
    console.error('Failed to update site requirements:', error);
    return NextResponse.json({ error: 'Failed to update site requirements' }, { status: 500 });
  }
}
