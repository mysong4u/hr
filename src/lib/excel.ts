import * as XLSX from 'xlsx';

export function exportApplicantsToExcel(applicants: any[], fileName = '지원자목록_태일채용시스템.xlsx') {
  const data = applicants.map((app, index) => ({
    'No': index + 1,
    '이름': app.name,
    '연락처': app.phone,
    '이메일': app.email,
    '지원직무': app.jobRole || '공사',
    '지원현장': app.siteName || '-',
    '지원경로': app.applyPath || '사람인',
    '채용단계': getStatusLabel(app.status),
    'AI평가': app.aiScore || '-',
    '지원일자': app.createdAt ? new Date(app.createdAt).toISOString().split('T')[0] : '-',
    '입사일자': app.joinDate ? new Date(app.joinDate).toISOString().split('T')[0] : '-',
    '메모': app.memo || '',
  }));

  const worksheet = XLSX.utils.json_to_sheet(data);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, '지원자목록');

  // Auto-fit column widths
  const colWidths = [
    { wch: 6 },  // No
    { wch: 10 }, // 이름
    { wch: 15 }, // 연락처
    { wch: 22 }, // 이메일
    { wch: 10 }, // 지원직무
    { wch: 20 }, // 지원현장
    { wch: 12 }, // 지원경로
    { wch: 16 }, // 채용단계
    { wch: 8 },  // AI평가
    { wch: 12 }, // 지원일자
    { wch: 12 }, // 입사일자
    { wch: 25 }, // 메모
  ];
  worksheet['!cols'] = colWidths;

  XLSX.writeFile(workbook, fileName);
}

export function getStatusLabel(status: string): string {
  switch (status) {
    case 'APPLIED':
      return '이력서 지원';
    case 'PERSONALITY_TEST_PENDING':
      return '인성검사 진행 중';
    case 'PERSONALITY_TEST_COMPLETED':
      return '인성검사 완료';
    case 'INTERVIEW_SCHEDULED':
      return '면접일자 확정';
    case 'ACCEPTED':
      return '채용 확정';
    case 'REJECTED':
      return '불합격';
    case 'ONBOARDING_SCHEDULED':
      return '입문교육 일정';
    default:
      return status;
  }
}
