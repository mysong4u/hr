import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const code = searchParams.get('companyCode') || searchParams.get('code');
    const query = searchParams.get('q');

    if (code) {
      const company = await prisma.company.findUnique({
        where: { companyCode: code.trim().toLowerCase() },
      });
      if (!company) {
        return NextResponse.json({ error: 'Company not found' }, { status: 404 });
      }
      return NextResponse.json(company);
    }

    if (query) {
      const cleanQ = query.trim().toLowerCase();
      const companies = await prisma.company.findMany({
        where: {
          OR: [
            { companyCode: { contains: cleanQ, mode: 'insensitive' } },
            { companyName: { contains: cleanQ, mode: 'insensitive' } },
          ],
        },
        orderBy: { createdAt: 'desc' },
      });
      return NextResponse.json(companies);
    }

    const companies = await prisma.company.findMany({
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json(companies);
  } catch (error) {
    console.error('Failed to fetch companies:', error);
    return NextResponse.json({ error: '회사 목록 조회에 실패했습니다.' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    let { companyName, companyCode, adminName, adminPassword, adminDept, plan } = body;

    if (!companyName || !companyName.trim()) {
      return NextResponse.json({ error: '회사명을 입력해 주세요.' }, { status: 400 });
    }

    const cleanName = companyName.trim();
    // If companyCode is not provided, make an alphanumeric code from name or timestamp
    let cleanCode = (companyCode && companyCode.trim().length > 0)
      ? companyCode.trim().toLowerCase().replace(/[^a-z0-9_-]/g, '')
      : '';

    if (!cleanCode) {
      // Hangul to romanized fallback or timestamp
      cleanCode = 'comp-' + Date.now().toString(36);
    }

    const cleanAdmin = (adminName && adminName.trim()) ? adminName.trim() : '관리자';
    const cleanPw = (adminPassword && adminPassword.trim()) ? adminPassword.trim() : '1111';
    const cleanDept = (adminDept && adminDept.trim()) ? adminDept.trim() : '인사채용팀';

    // Check if company already exists
    let existingCompany = await prisma.company.findFirst({
      where: {
        OR: [
          { companyCode: cleanCode },
          { companyName: cleanName },
        ],
      },
    });

    if (existingCompany) {
      cleanCode = existingCompany.companyCode;
    } else {
      existingCompany = await prisma.company.create({
        data: {
          companyCode: cleanCode,
          companyName: cleanName,
          plan: plan || '프리미엄 (월 1,000원)',
        },
      });
    }

    // Ensure Admin user exists for this company
    let adminUser = await prisma.user.findFirst({
      where: {
        companyCode: cleanCode,
        name: cleanAdmin,
      },
    });

    if (!adminUser) {
      adminUser = await prisma.user.create({
        data: {
          name: cleanAdmin,
          department: cleanDept,
          role: '총괄관리자',
          password: cleanPw,
          companyCode: cleanCode,
        },
      });
    }

    // Ensure at least one starter site exists for this company
    const siteCount = await prisma.site.count({
      where: { companyCode: cleanCode },
    });

    if (siteCount === 0) {
      await prisma.site.create({
        data: {
          name: `${cleanName} 본사 / 1현장`,
          location: '서울/수도권 현장',
          pmName: cleanAdmin,
          pmContact: '010-0000-0000',
          companyCode: cleanCode,
          status: '진행중',
          requirements: {
            create: [
              { jobRole: '공사', requiredCount: 5, currentCount: 0 },
              { jobRole: '안전', requiredCount: 2, currentCount: 0 },
              { jobRole: '공무', requiredCount: 2, currentCount: 0 },
            ],
          },
        },
      });
    }

    return NextResponse.json({
      success: true,
      company: existingCompany,
      adminUser: {
        id: adminUser.id,
        name: adminUser.name,
        department: adminUser.department,
        role: adminUser.role,
        companyCode: adminUser.companyCode,
      },
    }, { status: 201 });
  } catch (error) {
    console.error('Failed to create company:', error);
    return NextResponse.json({ error: '기업 등록 중 오류가 발생했습니다.' }, { status: 500 });
  }
}
