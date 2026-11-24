import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

const DEFAULT_JOB_ROLES = ['공사', '안전', '공무', '품질', '기타'];

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const yearParam = searchParams.get('year');
    const companyCodeParam = searchParams.get('companyCode');

    let where: any = {};
    if (companyCodeParam && companyCodeParam.trim()) {
      where.companyCode = companyCodeParam.trim().toLowerCase();
    }

    if (yearParam) {
      const year = parseInt(yearParam, 10);
      if (!isNaN(year)) {
        const startOfYear = new Date(year, 0, 1);
        const endOfYear = new Date(year + 1, 0, 1);
        where.createdAt = {
          gte: startOfYear,
          lt: endOfYear,
        };
      }
    }

    const sites = await prisma.site.findMany({
      where,
      include: {
        requirements: {
          orderBy: { createdAt: 'asc' },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    // 모든 현장에 5가지 기본 직무(기타, 공무, 안전, 공사, 품질)가 누락 없이 존재하도록 보장
    for (const site of sites) {
      const existingRoles = new Set(site.requirements.map((r) => r.jobRole));
      const missingRoles = DEFAULT_JOB_ROLES.filter((role) => !existingRoles.has(role));
      if (missingRoles.length > 0) {
        for (const role of missingRoles) {
          const newReq = await prisma.siteRequirement.create({
            data: {
              siteId: site.id,
              jobRole: role,
              requiredCount: 0,
              currentCount: 0,
            },
          });
          site.requirements.push(newReq);
        }
      }
    }

    return NextResponse.json(sites);
  } catch (error) {
    console.error('Failed to fetch sites:', error);
    return NextResponse.json({ error: 'Failed to fetch sites' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, location, pmName, pmContact, status, createdAt, requirements, companyCode } = body;

    if (!name || !location) {
      return NextResponse.json({ error: '현장명과 위치는 필수입니다.' }, { status: 400 });
    }

    // 5대 기본 직무가 누락되지 않도록 통합
    const reqList: { jobRole: string; requiredCount: number; currentCount: number }[] = [];
    const inputReqs = Array.isArray(requirements) ? requirements : [];
    const existingInputRoles = new Set(inputReqs.map((r: any) => r.jobRole));

    for (const req of inputReqs) {
      reqList.push({
        jobRole: req.jobRole,
        requiredCount: Number(req.requiredCount) || 0,
        currentCount: Number(req.currentCount) || 0,
      });
    }

    for (const defaultRole of DEFAULT_JOB_ROLES) {
      if (!existingInputRoles.has(defaultRole)) {
        reqList.push({
          jobRole: defaultRole,
          requiredCount: 0,
          currentCount: 0,
        });
      }
    }

    const site = await prisma.site.create({
      data: {
        name,
        location,
        pmName: pmName || '담당 PM',
        pmContact: pmContact || '',
        status: status || '진행중',
        companyCode: (companyCode && companyCode.trim()) ? companyCode.trim().toLowerCase() : 'taeil',
        createdAt: createdAt ? new Date(createdAt) : new Date(),
        requirements: {
          create: reqList,
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
    const { siteId, name, location, pmName, pmContact, status, createdAt, requirements, modifiedBy } = body;

    if (!siteId) {
      return NextResponse.json({ error: 'Site ID is required' }, { status: 400 });
    }

    const site = await prisma.site.findUnique({
      where: { id: siteId },
    });

    if (!site) {
      return NextResponse.json({ error: 'Site not found' }, { status: 404 });
    }

    // Update or create requirements
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
        } else if (req.jobRole) {
          await prisma.siteRequirement.create({
            data: {
              siteId,
              jobRole: req.jobRole,
              requiredCount: Number(req.requiredCount) || 0,
              currentCount: Number(req.currentCount) || 0,
            },
          });
        }
      }
    }

    // Update site fields if provided
    const updateData: any = {};
    if (name !== undefined) updateData.name = name;
    if (location !== undefined) updateData.location = location;
    if (pmName !== undefined) updateData.pmName = pmName;
    if (pmContact !== undefined) updateData.pmContact = pmContact;
    if (status !== undefined) updateData.status = status;
    if (createdAt !== undefined) {
      updateData.createdAt = new Date(createdAt);
    }

    if (Object.keys(updateData).length > 0) {
      await prisma.site.update({
        where: { id: siteId },
        data: updateData,
      });
    }

    // Create Notification
    const now = new Date();
    const formattedDate = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    const modifier = modifiedBy || pmName || site.pmName || '현장 PM';
    const siteTitle = name || site.name;

    await prisma.notification.create({
      data: {
        title: '현장 정보 수정 알림',
        message: `${siteTitle} 현장 정보가 수정되었습니다. (수정자: ${modifier} / ${formattedDate})`,
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

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    let id = searchParams.get('id');

    if (!id) {
      try {
        const body = await request.json();
        id = body.id || body.siteId;
      } catch (e) {
        // body might be empty
      }
    }

    if (!id) {
      return NextResponse.json({ error: '현장 ID가 필요합니다.' }, { status: 400 });
    }

    const site = await prisma.site.findUnique({
      where: { id },
    });

    if (!site) {
      return NextResponse.json({ error: '현장을 찾을 수 없습니다.' }, { status: 404 });
    }

    await prisma.site.delete({
      where: { id },
    });

    // Create Notification
    const now = new Date();
    const formattedDate = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    await prisma.notification.create({
      data: {
        title: '현장 삭제 알림',
        message: `${site.name} 현장이 삭제되었습니다. (${formattedDate})`,
      },
    });

    return NextResponse.json({
      success: true,
      message: `${site.name} 현장이 성공적으로 삭제되었습니다.`,
    });
  } catch (error) {
    console.error('Failed to delete site:', error);
    return NextResponse.json({ error: '현장 삭제 중 오류가 발생했습니다.' }, { status: 500 });
  }
}
