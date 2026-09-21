const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

try {
  console.log('🔄 Swapping Prisma schema to PostgreSQL for production...');
  const src = path.join(__dirname, '../prisma/schema.postgresql.prisma');
  const dest = path.join(__dirname, '../prisma/schema.prisma');
  
  if (fs.existsSync(src)) {
    fs.copyFileSync(src, dest);
    console.log('✅ Schema swapped successfully.');
  } else {
    console.log('ℹ️ PostgreSQL schema not found, using default schema.');
  }

  // DATABASE_URL이 환경 변수에 설정되어 있을 때만 원격 DB에 스키마를 동기화(push)합니다.
  if (process.env.DATABASE_URL) {
    console.log('🚀 Connecting to PostgreSQL and pushing database schema...');
    execSync('npx prisma db push', { stdio: 'inherit' });
  } else {
    console.log('⚠️ DATABASE_URL is not set. Skipping DB push.');
    console.log('ℹ️ Generating Prisma client local bindings...');
    execSync('npx prisma generate', { stdio: 'inherit' });
  }

  console.log('📦 Bundling Next.js application...');
  // 실제 Next.js 빌드는 package.json 내의 next build를 무조건 수행합니다.
  execSync('next build', { stdio: 'inherit' });
  console.log('🎉 Production build succeeded!');
} catch (error) {
  console.error('❌ Build script failed:', error);
  process.exit(1);
}
