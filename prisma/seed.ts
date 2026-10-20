import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Clearing existing data...');
  await prisma.notification.deleteMany({});
  await prisma.siteRequirement.deleteMany({});
  await prisma.site.deleteMany({});
  await prisma.interview.deleteMany({});
  await prisma.applicant.deleteMany({});
  await prisma.job.deleteMany({});

  console.log('Seeding Jobs...');
  const jobGeneral = await prisma.job.create({
    data: {
      title: "건설 현장 기술직/관리직 통합 채용",
      department: "건설사업본부",
      description: "국내 대형 RC/토목/건축 현장 공사, 안전, 공무, 품질 부문 인재 채용",
      requirements: "현장 경험자, 관련 자격증(토목/건축/안전기사) 소지자 우대",
      status: "OPEN",
    },
  });

  console.log('Seeding Sites & Requirements...');
  const site1 = await prisma.site.create({
    data: {
      name: "평택 P5 RC공사 2공구",
      location: "경기도 평택시",
      pmName: "김민수 PM",
      pmContact: "010-1234-5678",
      requirements: {
        create: [
          { jobRole: "공사", requiredCount: 20, currentCount: 15 },
          { jobRole: "안전", requiredCount: 8, currentCount: 6 },
          { jobRole: "공무", requiredCount: 5, currentCount: 4 },
          { jobRole: "품질", requiredCount: 4, currentCount: 2 },
          { jobRole: "기타", requiredCount: 3, currentCount: 1 },
        ],
      },
    },
  });

  const site2 = await prisma.site.create({
    data: {
      name: "화성 동탄 신축공사",
      location: "경기도 화성시",
      pmName: "이지현 PM",
      pmContact: "010-2345-6789",
      requirements: {
        create: [
          { jobRole: "공사", requiredCount: 15, currentCount: 7 },
          { jobRole: "안전", requiredCount: 4, currentCount: 2 },
          { jobRole: "공무", requiredCount: 3, currentCount: 2 },
          { jobRole: "품질", requiredCount: 2, currentCount: 1 },
          { jobRole: "기타", requiredCount: 1, currentCount: 0 },
        ],
      },
    },
  });

  const site3 = await prisma.site.create({
    data: {
      name: "안산 송도 오피스텔",
      location: "인천광역시 연수구",
      pmName: "박선영 PM",
      pmContact: "010-3456-7890",
      requirements: {
        create: [
          { jobRole: "공사", requiredCount: 10, currentCount: 8 },
          { jobRole: "안전", requiredCount: 5, currentCount: 4 },
          { jobRole: "공무", requiredCount: 3, currentCount: 2 },
          { jobRole: "품질", requiredCount: 2, currentCount: 1 },
        ],
      },
    },
  });

  const site4 = await prisma.site.create({
    data: {
      name: "대전 도안지구 공사",
      location: "대전광역시 서구",
      pmName: "김진수 PM",
      pmContact: "010-4567-8901",
      requirements: {
        create: [
          { jobRole: "공사", requiredCount: 12, currentCount: 6 },
          { jobRole: "안전", requiredCount: 4, currentCount: 2 },
          { jobRole: "공무", requiredCount: 2, currentCount: 1 },
        ],
      },
    },
  });

  const site5 = await prisma.site.create({
    data: {
      name: "김포 한강신도시",
      location: "경기도 김포시",
      pmName: "이재명 PM",
      pmContact: "010-5678-9012",
      requirements: {
        create: [
          { jobRole: "공사", requiredCount: 8, currentCount: 5 },
          { jobRole: "안전", requiredCount: 4, currentCount: 2 },
          { jobRole: "공무", requiredCount: 3, currentCount: 2 },
        ],
      },
    },
  });

  const site6 = await prisma.site.create({
    data: {
      name: "부산 센텀데이터센터",
      location: "부산광역시 해운대구",
      pmName: "정우성 PM",
      pmContact: "010-6789-0123",
      requirements: {
        create: [
          { jobRole: "공사", requiredCount: 6, currentCount: 3 },
          { jobRole: "안전", requiredCount: 3, currentCount: 2 },
          { jobRole: "공무", requiredCount: 3, currentCount: 1 },
        ],
      },
    },
  });

  const site7 = await prisma.site.create({
    data: {
      name: "광주 첨단산업단지",
      location: "광주광역시 북구",
      pmName: "최지훈 PM",
      pmContact: "010-7890-1234",
      requirements: {
        create: [
          { jobRole: "공사", requiredCount: 8, currentCount: 6 },
          { jobRole: "안전", requiredCount: 3, currentCount: 2 },
          { jobRole: "공무", requiredCount: 3, currentCount: 2 },
        ],
      },
    },
  });

  console.log('Seeding Applicants...');
  // 김지원
  await prisma.applicant.create({
    data: {
      name: "김지원",
      email: "kimjw@naver.com",
      phone: "010-1234-5678",
      applyPath: "사람인",
      jobRole: "공사",
      siteName: "평택 P5 RC공사 2공구",
      status: "INTERVIEW_SCHEDULED",
      aiScore: "상",
      aiReason: "RC 구조물 골조 공사 7년 경력 보유. 현장 안전 수칙 및 공정 관리 역량이 우수함.",
      memo: "추천인: 본사 최상무님",
      jobId: jobGeneral.id,
      interviewEvalFile: "면접평가표_김지원.pdf",
      interviewEvalPassword: "password123!",
      interviewEvalAuth: "면접관 + 인사담당자",
      personalityTestFile: "인성검사_김지원.pdf",
      personalityTestPassword: "test1234!",
      createdAt: new Date("2026-10-10"),
      interviews: {
        create: {
          interviewers: "김진수, 이지현, 박준호",
          scheduledTime: new Date("2026-10-23T10:00:00"),
          location: "태일씨앤티 본사 회의실",
          status: "CONFIRMED",
        },
      },
    },
  });

  // 이민호
  await prisma.applicant.create({
    data: {
      name: "이민호",
      email: "minho@daum.net",
      phone: "010-2345-6789",
      applyPath: "잡코리아",
      jobRole: "안전",
      siteName: "화성 동탄 신축공사",
      status: "PERSONALITY_TEST_PENDING",
      aiScore: "중",
      aiReason: "산업안전기사 자격증 보유. 신축 공사 현장 3년 경력.",
      jobId: jobGeneral.id,
      createdAt: new Date("2026-10-09"),
    },
  });

  // 백서연
  await prisma.applicant.create({
    data: {
      name: "백서연",
      email: "seoyeon@naver.com",
      phone: "010-3456-7890",
      applyPath: "지인 소개",
      jobRole: "공무",
      siteName: "안산 송도 오피스텔",
      status: "PERSONALITY_TEST_COMPLETED",
      aiScore: "상",
      aiReason: "내역서 및 기성 청구 실무 능통. ERP 시스템 활용도 우수.",
      jobId: jobGeneral.id,
      personalityTestFile: "인성평가_백서연.pdf",
      personalityTestPassword: "pass789!",
      createdAt: new Date("2026-10-08"),
    },
  });

  // 최준호
  await prisma.applicant.create({
    data: {
      name: "최준호",
      email: "junho@hanmail.net",
      phone: "010-4567-8901",
      applyPath: "사람인",
      jobRole: "전산",
      siteName: "대전 도안지구 공사",
      status: "ACCEPTED",
      aiScore: "상",
      aiReason: "현장 전산망 및 보안 시스템 구축 경력 5년.",
      jobId: jobGeneral.id,
      createdAt: new Date("2026-10-07"),
    },
  });

  // 이서영
  await prisma.applicant.create({
    data: {
      name: "이서영",
      email: "seoyoung@naver.com",
      phone: "010-5678-9012",
      applyPath: "헬로코리아",
      jobRole: "공사",
      siteName: "김포 한강신도시",
      status: "APPLIED",
      jobId: jobGeneral.id,
      createdAt: new Date("2026-10-06"),
    },
  });

  // 정연재
  await prisma.applicant.create({
    data: {
      name: "정연재",
      email: "minjae@daum.net",
      phone: "010-6789-0123",
      applyPath: "기타",
      jobRole: "기타",
      status: "REJECTED",
      jobId: jobGeneral.id,
      createdAt: new Date("2026-10-05"),
    },
  });

  // 한지민
  await prisma.applicant.create({
    data: {
      name: "한지민",
      email: "jimin@naver.com",
      phone: "010-7890-1234",
      applyPath: "사람인",
      jobRole: "공사",
      siteName: "평택 P5 RC공사 2공구",
      status: "ONBOARDING_SCHEDULED",
      aiScore: "상",
      joinDate: new Date("2026-11-01"),
      jobId: jobGeneral.id,
      createdAt: new Date("2026-10-04"),
    },
  });

  // Notifications
  console.log('Seeding Notifications...');
  await prisma.notification.create({
    data: {
      title: "현장 필요인원 수정 알림",
      message: "평택 P5 RC공사 2공구 현장의 필요인원이 수정되었습니다. (수정자: 김민수 PM / 2026-10-16 14:32)",
      createdAt: new Date("2026-10-16T14:32:00"),
    },
  });

  console.log('Seed completed successfully!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
