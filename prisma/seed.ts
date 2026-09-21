import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  // Clean up existing data
  await prisma.interview.deleteMany({});
  await prisma.applicant.deleteMany({});
  await prisma.job.deleteMany({});

  // 1. Create Jobs
  const job1 = await prisma.job.create({
    data: {
      title: "시니어 파이썬 백엔드 개발자",
      department: "백엔드 개발팀",
      description: "Python, Django, FastAPI를 활용한 고성능 웹 서비스 아키텍처 설계 및 API 개발을 담당합니다.",
      requirements: "Python 개발 경력 3년 이상, Django/FastAPI 개발 경험, RDBMS(PostgreSQL) 설계 및 최적화 경험 필수.",
    },
  });

  const job2 = await prisma.job.create({
    data: {
      title: "주니어 프론트엔드 개발자 (React)",
      department: "프론트엔드 개발팀",
      description: "React, Next.js, TypeScript를 활용해 사용자 중심의 직관적인 UI/UX를 개발하고 고도화합니다.",
      requirements: "React 실무 개발 경험, TypeScript 사용 능력, Tailwind CSS를 활용한 반응형 웹 구현 능력 우대.",
    },
  });

  // 2. Create Applicants for Job 1 (Python Backend)
  await prisma.applicant.create({
    data: {
      name: "이영희",
      email: "younghee.lee@test.com",
      phone: "010-1234-5678",
      status: "SCREENED",
      aiScore: "상",
      aiReason: "이력서 분석 결과 Python 경력이 4년으로 요구사항 충족. Django 프레임워크 경험이 풍부하고 대용량 트래픽 처리 역량이 우수함.",
      jobId: job1.id,
    },
  });

  await prisma.applicant.create({
    data: {
      name: "김철수",
      email: "chulsoo.kim@test.com",
      phone: "010-8765-4321",
      status: "INTERVIEW_PROPOSED",
      aiScore: "중",
      aiReason: "Python 기반의 머신러닝 모델 활용 경험은 풍부하나, 백엔드 웹 아키텍처 및 REST API 서버 구축 경력이 다소 한정적임.",
      jobId: job1.id,
      interviews: {
        create: {
          interviewers: "lead-dev@test.com,cto@test.com",
          status: "PROPOSED",
          proposedSlots: JSON.stringify([
            "2026-09-22T10:00:00.000Z",
            "2026-09-22T14:00:00.000Z",
            "2026-09-23T11:00:00.000Z",
            "2026-09-23T16:00:00.000Z"
          ]),
        }
      }
    },
  });

  await prisma.applicant.create({
    data: {
      name: "정아름",
      email: "areum.jung@test.com",
      phone: "010-1111-2222",
      status: "REJECTED",
      aiScore: "하",
      aiReason: "지원 직무(백엔드)와 무관한 디자인 및 기획 경력이 대부분이며, Python 개발 역량이 증명되지 않음.",
      jobId: job1.id,
    },
  });

  // 3. Create Applicants for Job 2 (React Frontend)
  await prisma.applicant.create({
    data: {
      name: "김민지",
      email: "minji.kim@test.com",
      phone: "010-9999-8888",
      status: "APPLIED",
      jobId: job2.id,
    },
  });

  await prisma.applicant.create({
    data: {
      name: "최우진",
      email: "woojin.choi@test.com",
      phone: "010-3333-4444",
      status: "INTERVIEW_SCHEDULED",
      aiScore: "상",
      aiReason: "Next.js 및 Tailwind CSS 실무 경력이 다수 있으며, TypeScript를 활용해 재사용 가능한 고성능 컴포넌트를 설계한 역량이 매우 돋보임.",
      jobId: job2.id,
      interviews: {
        create: {
          interviewers: "frontend-lead@test.com,hr-manager@test.com",
          status: "CONFIRMED",
          scheduledTime: new Date("2026-09-24T14:00:00.000Z"),
          duration: 60,
          meetingLink: "https://meet.google.com/abc-defg-hij",
        }
      }
    },
  });

  console.log("Database has been seeded! 🌱");
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
