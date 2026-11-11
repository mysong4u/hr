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

export function parseStatusFromLabel(label?: string): string {
  if (!label) return 'APPLIED';
  const clean = label.trim();
  switch (clean) {
    case '이력서 지원':
    case '지원':
    case '서류접수':
    case 'APPLIED':
      return 'APPLIED';
    case '인성검사 진행 중':
    case '인성검사 진행':
    case '인성검사 대기':
    case 'PERSONALITY_TEST_PENDING':
      return 'PERSONALITY_TEST_PENDING';
    case '인성검사 완료':
    case 'PERSONALITY_TEST_COMPLETED':
      return 'PERSONALITY_TEST_COMPLETED';
    case '면접일자 확정':
    case '면접 확정':
    case '면접 대기':
    case '면접 진행':
    case 'INTERVIEW_SCHEDULED':
      return 'INTERVIEW_SCHEDULED';
    case '채용 확정':
    case '합격':
    case '최종합격':
    case 'ACCEPTED':
      return 'ACCEPTED';
    case '불합격':
    case 'REJECTED':
      return 'REJECTED';
    case '입문교육 일정':
    case '입문교육':
    case '입사대기':
    case 'ONBOARDING_SCHEDULED':
      return 'ONBOARDING_SCHEDULED';
    default:
      return 'APPLIED';
  }
}

export function formatPhoneNumber(val: any): string {
  if (val === undefined || val === null) return '';
  let str = String(val).replace(/[^0-9]/g, '');
  if (!str) return '';

  // 엑셀에서 앞의 0이 지워진 10자리 번호(10XXXXXXXX) 처리
  if (str.length === 10 && str.startsWith('10')) {
    str = '0' + str;
  }

  // 010-XXXX-XXXX
  if (str.length === 11 && str.startsWith('010')) {
    return `${str.slice(0, 3)}-${str.slice(3, 7)}-${str.slice(7)}`;
  }
  // 01X-XXX-XXXX
  if (str.length === 10 && str.startsWith('01')) {
    return `${str.slice(0, 3)}-${str.slice(3, 6)}-${str.slice(6)}`;
  }
  // 02-XXXX-XXXX
  if (str.length === 10 && str.startsWith('02')) {
    return `${str.slice(0, 2)}-${str.slice(2, 6)}-${str.slice(6)}`;
  }
  // 02-XXX-XXXX
  if (str.length === 9 && str.startsWith('02')) {
    return `${str.slice(0, 2)}-${str.slice(2, 5)}-${str.slice(5)}`;
  }

  return String(val).trim();
}

export function parseExcelDate(val: any): string | null {
  if (!val) return null;
  if (val instanceof Date) {
    if (isNaN(val.getTime())) return null;
    return val.toISOString();
  }
  if (typeof val === 'number') {
    const utc_days = Math.floor(val - 25569);
    const utc_value = utc_days * 86400;
    const date_info = new Date(utc_value * 1000);
    const fractional_day = val - Math.floor(val) + 0.0000001;
    let total_seconds = Math.floor(86400 * fractional_day);
    const seconds = total_seconds % 60;
    total_seconds -= seconds;
    const hours = Math.floor(total_seconds / (60 * 60));
    const minutes = Math.floor(total_seconds / 60) % 60;
    const date = new Date(date_info.getFullYear(), date_info.getMonth(), date_info.getDate(), hours, minutes, seconds);
    return isNaN(date.getTime()) ? null : date.toISOString();
  }
  if (typeof val === 'string') {
    const cleaned = val.trim().replace(/\./g, '-').replace(/\//g, '-');
    const parsed = new Date(cleaned);
    if (!isNaN(parsed.getTime())) {
      return parsed.toISOString();
    }
  }
  return null;
}

export function downloadApplicantTemplateExcel(fileName = '지원자_일괄등록_양식_태일씨앤티.xlsx') {
  const sampleData = [
    {
      '이름*': '홍길동',
      '연락처*': '010-1234-5678',
      '이메일': 'hong@example.com',
      '지원직무': '공사',
      '지원현장': '평택 P5 RC공사 2공구',
      '지원경로': '사람인',
      '채용단계': '이력서 지원',
      '입사예정일': '2026-11-01',
      '면접관': '김민수 PM, 이지현 팀장',
      '면접일시': '2026-10-25 10:00',
      '면접장소': '태일씨앤티 본사 회의실',
      '메모': '철근콘크리트 현장 경력 5년',
    },
    {
      '이름*': '이몽룡',
      '연락처*': '010-9876-5432',
      '이메일': 'lee@example.com',
      '지원직무': '안전',
      '지원현장': '화성 반도체 배관공사',
      '지원경로': '잡코리아',
      '채용단계': '면접일자 확정',
      '입사예정일': '',
      '면접관': '박안전 과장',
      '면접일시': '2026-10-26 14:00',
      '면접장소': '화성 현장 사무실',
      '메모': '산업안전기사 자격증 보유',
    },
  ];

  const worksheet = XLSX.utils.json_to_sheet(sampleData);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, '지원자등록양식');

  const colWidths = [
    { wch: 12 }, // 이름*
    { wch: 16 }, // 연락처*
    { wch: 22 }, // 이메일
    { wch: 12 }, // 지원직무
    { wch: 24 }, // 지원현장
    { wch: 14 }, // 지원경로
    { wch: 16 }, // 채용단계
    { wch: 14 }, // 입사예정일
    { wch: 24 }, // 면접관
    { wch: 18 }, // 면접일시
    { wch: 24 }, // 면접장소
    { wch: 30 }, // 메모
  ];
  worksheet['!cols'] = colWidths;

  XLSX.writeFile(workbook, fileName);
}

export interface ParsedApplicantRow {
  name: string;
  phone: string;
  email?: string;
  jobRole?: string;
  siteName?: string;
  applyPath?: string;
  status: string;
  statusLabel: string;
  joinDate?: string | null;
  interviewers?: string;
  interviewDate?: string | null;
  interviewLocation?: string;
  memo?: string;
  isValid: boolean;
  errorReason?: string;
}

export async function parseApplicantsFromExcel(file: File): Promise<ParsedApplicantRow[]> {
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: 'array', cellDates: true });
  const sheetName = workbook.SheetNames[0];
  if (!sheetName) return [];

  const worksheet = workbook.Sheets[sheetName];
  const rawRows: any[] = XLSX.utils.sheet_to_json(worksheet, { defval: '' });

  const results: ParsedApplicantRow[] = [];

  for (const row of rawRows) {
    // 키 정규화 맵 생성 (공백 제거, 특수문자 제거)
    const normalizedRow: Record<string, any> = {};
    let hasAnyValue = false;

    for (const [k, v] of Object.entries(row)) {
      const cleanKey = k.replace(/[\s*_]/g, '');
      normalizedRow[cleanKey] = v;
      if (v !== undefined && v !== null && String(v).trim() !== '') {
        hasAnyValue = true;
      }
    }

    // 완전히 비어있는 행(서식만 남은 행)은 스킵
    if (!hasAnyValue) continue;

    const getVal = (...keys: string[]) => {
      for (const k of keys) {
        const cleanK = k.replace(/[\s*_]/g, '');
        if (normalizedRow[cleanK] !== undefined && normalizedRow[cleanK] !== null) {
          const s = String(normalizedRow[cleanK]).trim();
          if (s !== '') return s;
        }
      }
      return '';
    };

    const name = getVal('이름', '지원자명', '성명');
    const rawPhone = getVal('연락처', '전화번호', '핸드폰', '휴대폰', '전화');
    const phone = formatPhoneNumber(rawPhone);

    const email = getVal('이메일', '이메일주소', '메일');
    const jobRole = getVal('지원직무', '직무', '채용직무') || '공사';
    const siteName = getVal('지원현장', '현장', '배정현장', '현장명');
    const applyPath = getVal('지원경로', '경로', '유입경로') || '사람인';
    const statusLabel = getVal('채용단계', '단계', '상태', '채용상태') || '이력서 지원';
    const status = parseStatusFromLabel(statusLabel);

    const rawJoinDate = getVal('입사예정일', '입사일자', '입사일');
    const joinDate = parseExcelDate(rawJoinDate);

    const interviewers = getVal('면접관', '면접관명', '면접관이름') || '김민수 PM, 이지현 팀장';
    const rawInterviewDate = getVal('면접일시', '면접일자', '면접시간', '면접일');
    const interviewDate = parseExcelDate(rawInterviewDate);
    const interviewLocation = getVal('면접장소', '장소', '면접장') || '태일씨앤티 본사 회의실';
    const memo = getVal('메모', '비고', '특이사항', '내용');

    let isValid = true;
    const errors: string[] = [];

    if (!name) {
      isValid = false;
      errors.push('이름 누락');
    }
    if (!phone) {
      isValid = false;
      errors.push('연락처 누락');
    }

    results.push({
      name,
      phone,
      email: email || undefined,
      jobRole,
      siteName,
      applyPath,
      status,
      statusLabel,
      joinDate,
      interviewers,
      interviewDate,
      interviewLocation,
      memo,
      isValid,
      errorReason: errors.length > 0 ? errors.join(', ') : undefined,
    });
  }

  return results;
}
