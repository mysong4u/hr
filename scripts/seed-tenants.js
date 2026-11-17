const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const companies = [
    { companyCode: 'taeil', companyName: '(주)태일씨앤티', plan: '프리미엄' },
    { companyCode: 'angel', companyName: '천사건설(주)', plan: '프리미엄' },
    { companyCode: 'hanshin', companyName: '한신개발(주)', plan: '7일 무료 체험' },
    { companyCode: 'uimusic', companyName: '유아이뮤직', plan: '프리미엄' },
  ];

  for (const c of companies) {
    const existing = await prisma.company.findUnique({
      where: { companyCode: c.companyCode },
    });
    if (!existing) {
      await prisma.company.create({ data: c });
      console.log('Created company:', c.companyName);
    } else {
      console.log('Company already exists:', c.companyName);
    }
  }

  // Check if uimusic has at least one site and admin user
  const uimusicSite = await prisma.site.findFirst({
    where: { companyCode: 'uimusic' },
  });
  if (!uimusicSite) {
    const site = await prisma.site.create({
      data: {
        name: '유아이뮤직 본사 / 1스튜디오',
        location: '서울 강남구 테헤란로',
        pmName: '음악감독 PM',
        pmContact: '010-1234-5678',
        companyCode: 'uimusic',
        status: '진행중',
        requirements: {
          create: [
            { jobRole: '음향/작곡', requiredCount: 5, currentCount: 2 },
            { jobRole: '마케팅/기획', requiredCount: 3, currentCount: 1 },
            { jobRole: '공사', requiredCount: 2, currentCount: 1 },
          ],
        },
      },
    });
    console.log('Created starter site for uimusic:', site.name);
  }

  const uimusicAdmin = await prisma.user.findFirst({
    where: { companyCode: 'uimusic' },
  });
  if (!uimusicAdmin) {
    const user = await prisma.user.create({
      data: {
        name: '유아이관리자',
        department: '인사채용팀',
        role: '총괄관리자',
        password: '1111',
        companyCode: 'uimusic',
      },
    });
    console.log('Created starter admin for uimusic:', user.name);
  }
}

main()
  .catch((e) => console.error(e))
  .finally(() => prisma.$disconnect());
