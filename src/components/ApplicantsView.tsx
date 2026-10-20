'use client';

import React, { useState, useEffect } from 'react';
import {
  Search,
  Filter,
  Download,
  Upload,
  Plus,
  FileText,
  Mail,
  Phone,
  Calendar,
  Building,
  CheckCircle,
  Clock,
  ExternalLink,
  Copy,
  Share2,
  Trash2,
  X,
  Lock,
  MessageSquare,
  AlertCircle,
  FileCheck,
  Check,
} from 'lucide-react';
import { exportApplicantsToExcel, getStatusLabel } from '@/lib/excel';

interface Interview {
  id: string;
  applicantId: string;
  interviewers: string;
  scheduledTime: string | null;
  duration: number;
  meetingLink: string | null;
  location: string | null;
  status: string;
}

interface Applicant {
  id: string;
  name: string;
  email: string;
  phone: string;
  resumeUrl: string | null;
  resumeText: string | null;
  status: string;
  aiScore: string | null;
  aiReason: string | null;
  applyPath: string | null;
  joinDate: string | null;
  jobRole: string | null;
  siteName: string | null;
  memo: string | null;
  personalityTestFile: string | null;
  personalityTestPassword?: string | null;
  interviewEvalFile: string | null;
  interviewEvalPassword?: string | null;
  interviewEvalAuth?: string | null;
  createdAt: string;
  interviews: Interview[];
}

const PIPELINE_STEPS = [
  { id: 'ALL', label: '전체 지원자', color: 'from-slate-600 to-slate-800' },
  { id: 'APPLIED', label: '1. 이력서 지원', color: 'from-blue-600 to-cyan-500' },
  { id: 'PERSONALITY_TEST_PENDING', label: '2. 인성검사 진행 중', color: 'from-amber-500 to-orange-500' },
  { id: 'PERSONALITY_TEST_COMPLETED', label: '3. 인성검사 완료', color: 'from-teal-500 to-emerald-600' },
  { id: 'INTERVIEW_SCHEDULED', label: '4. 면접일자 확정', color: 'from-purple-600 to-indigo-600' },
  { id: 'ACCEPTED', label: '5. 채용 여부 (합격)', color: 'from-emerald-600 to-green-700' },
  { id: 'ONBOARDING_SCHEDULED', label: '6. 입문교육 일정', color: 'from-rose-500 to-pink-600' },
];

export default function ApplicantsView() {
  const [applicants, setApplicants] = useState<Applicant[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedStatusTab, setSelectedStatusTab] = useState<string>('ALL');

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedJobRole, setSelectedJobRole] = useState('ALL');
  const [selectedSite, setSelectedSite] = useState('ALL');
  const [sortByJoinDate, setSortByJoinDate] = useState(false);

  // Modals
  const [selectedApplicant, setSelectedApplicant] = useState<Applicant | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isDragUploadModalOpen, setIsDragUploadModalOpen] = useState(false);
  const [isPersonalityUploadModalOpen, setIsPersonalityUploadModalOpen] = useState(false);

  // Personality Upload form
  const [personalityFile, setPersonalityFile] = useState<string>('인성평가결과표.pdf');
  const [personalityPassword, setPersonalityPassword] = useState<string>('');

  // Manual Add Form
  const [manualForm, setManualForm] = useState({
    name: '',
    phone: '',
    email: '',
    applyPath: '사람인',
    jobRole: '공사',
    siteName: '평택 P5 RC공사 2공구',
    memo: '',
    joinDate: '',
  });

  // Memo edit in detail
  const [editingMemo, setEditingMemo] = useState('');
  const [copyNotice, setCopyNotice] = useState<string | null>(null);

  const fetchApplicants = async () => {
    try {
      const res = await fetch('/api/applicants');
      if (res.ok) {
        const data = await res.json();
        setApplicants(data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchApplicants();
  }, []);

  const showCopyFeedback = (msg: string) => {
    setCopyNotice(msg);
    setTimeout(() => setCopyNotice(null), 3000);
  };

  // Status counters
  const statusCounts: Record<string, number> = {
    ALL: applicants.length,
    APPLIED: applicants.filter((a) => a.status === 'APPLIED').length,
    PERSONALITY_TEST_PENDING: applicants.filter((a) => a.status === 'PERSONALITY_TEST_PENDING').length,
    PERSONALITY_TEST_COMPLETED: applicants.filter((a) => a.status === 'PERSONALITY_TEST_COMPLETED').length,
    INTERVIEW_SCHEDULED: applicants.filter((a) => a.status === 'INTERVIEW_SCHEDULED').length,
    ACCEPTED: applicants.filter((a) => a.status === 'ACCEPTED').length,
    ONBOARDING_SCHEDULED: applicants.filter((a) => a.status === 'ONBOARDING_SCHEDULED').length,
  };

  // Filtered List
  const filteredApplicants = applicants.filter((app) => {
    if (selectedStatusTab !== 'ALL' && app.status !== selectedStatusTab) {
      return false;
    }
    if (selectedJobRole !== 'ALL' && app.jobRole !== selectedJobRole) {
      return false;
    }
    if (selectedSite !== 'ALL' && app.siteName !== selectedSite) {
      return false;
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchName = app.name.toLowerCase().includes(q);
      const matchEmail = app.email.toLowerCase().includes(q);
      const matchPhone = app.phone.toLowerCase().includes(q);
      if (!matchName && !matchEmail && !matchPhone) return false;
    }
    return true;
  });

  if (sortByJoinDate) {
    filteredApplicants.sort((a, b) => {
      if (!a.joinDate) return 1;
      if (!b.joinDate) return -1;
      return new Date(a.joinDate).getTime() - new Date(b.joinDate).getTime();
    });
  }

  // Update Status helper
  const handleUpdateStatus = async (applicantId: string, newStatus: string) => {
    try {
      const res = await fetch(`/api/applicants/${applicantId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
      if (res.ok) {
        const updated = await res.json();
        setApplicants((prev) => prev.map((a) => (a.id === applicantId ? updated : a)));
        if (selectedApplicant?.id === applicantId) {
          setSelectedApplicant(updated);
        }
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Save Memo
  const handleSaveMemo = async (applicantId: string) => {
    try {
      const res = await fetch(`/api/applicants/${applicantId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ memo: editingMemo }),
      });
      if (res.ok) {
        const updated = await res.json();
        setApplicants((prev) => prev.map((a) => (a.id === applicantId ? updated : a)));
        setSelectedApplicant(updated);
        showCopyFeedback('메모가 저장되었습니다.');
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Open external personality test site & auto-update status
  const handlePersonalitySiteRedirect = (app: Applicant) => {
    handleUpdateStatus(app.id, 'PERSONALITY_TEST_PENDING');
    window.open('https://www.saramin.co.kr/zf_user/personality-test', '_blank');
    showCopyFeedback('인성검사 사이트로 이동하며 지원자 상태를 "인성검사 진행 중"으로 변경했습니다.');
  };

  // Submit personality upload
  const handleSavePersonalityTest = async () => {
    if (!selectedApplicant) return;
    try {
      const res = await fetch(`/api/applicants/${selectedApplicant.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          personalityTestFile: personalityFile,
          personalityTestPassword: personalityPassword || null,
          status: 'PERSONALITY_TEST_COMPLETED',
        }),
      });
      if (res.ok) {
        const updated = await res.json();
        setApplicants((prev) => prev.map((a) => (a.id === selectedApplicant.id ? updated : a)));
        setSelectedApplicant(updated);
        setIsPersonalityUploadModalOpen(false);
        showCopyFeedback('인성검사 결과표가 등록되었으며 "인성검사 완료" 상태로 전환되었습니다.');
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Copy interview notification SMS (Page 12 in PDF)
  const handleCopyInterviewSMS = (app: Applicant) => {
    const interview = app.interviews?.[0];
    const dateStr = interview?.scheduledTime
      ? new Date(interview.scheduledTime).toLocaleDateString('ko-KR', {
          year: 'numeric',
          month: 'long',
          day: 'numeric',
          weekday: 'short',
        })
      : '2026년 10월 23일(금)';
    const timeStr = interview?.scheduledTime
      ? new Date(interview.scheduledTime).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })
      : '오전 10:00';

    const text = `[태일씨앤티] 면접 일정 안내
지원자: ${app.name} 님
일시: ${dateStr} ${timeStr}
장소: ${interview?.location || '태일씨앤티 본사 회의실'}
면접관: ${interview?.interviewers || '김민수 PM, 이지현 팀장'}
감사합니다.`;

    navigator.clipboard.writeText(text);
    showCopyFeedback('면접 안내 문자가 클립보드에 복사되었습니다.');
  };

  // Copy onboarding SMS (Page 10 in PDF)
  const handleCopyOnboardingSMS = (app: Applicant) => {
    const dateStr = app.joinDate ? new Date(app.joinDate).toISOString().split('T')[0] : '2026-11-01';
    const text = `[태일씨앤티] 안녕하세요.
입문교육 일정이 확정되었습니다.
일시: ${dateStr} 오전 10:00
장소: ${app.siteName || '평택 P5 RC공사 2공구'} 현장사무실
문의: 010-1234-5678
감사합니다.`;

    navigator.clipboard.writeText(text);
    showCopyFeedback('입문교육 문자 내용이 복사되었습니다. 문자천사에 바로 붙여넣기 하실 수 있습니다.');
  };

  // Handle Manual Add
  const handleCreateManualApplicant = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/applicants', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(manualForm),
      });
      if (res.ok) {
        setIsAddModalOpen(false);
        setManualForm({
          name: '',
          phone: '',
          email: '',
          applyPath: '사람인',
          jobRole: '공사',
          siteName: '평택 P5 RC공사 2공구',
          memo: '',
          joinDate: '',
        });
        fetchApplicants();
        showCopyFeedback('지원자가 성공적으로 추가되었습니다.');
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Resume Drag & Drop Simulation
  const handleResumeDrop = async (fileName: string) => {
    try {
      const randomName = fileName.replace('.pdf', '').replace('.docx', '');
      const res = await fetch('/api/applicants', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: randomName.includes('지원') ? '신규지원자' : randomName,
          phone: '010-5555-7777',
          email: `${Date.now()}@applicant.com`,
          applyPath: '이력서 직접접수',
          jobRole: '공사',
          siteName: '평택 P5 RC공사 2공구',
          resumeText: `${fileName} 파일이 정상 업로드되어 자동 파싱 완료되었습니다.`,
        }),
      });
      if (res.ok) {
        setIsDragUploadModalOpen(false);
        fetchApplicants();
        showCopyFeedback(`${fileName} 파일이 성공적으로 접수되어 지원자가 추가되었습니다.`);
      }
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="p-8 space-y-8 max-w-7xl mx-auto">
      {/* Toast Feedback */}
      {copyNotice && (
        <div className="fixed top-20 right-8 z-50 bg-slate-900/90 text-white px-5 py-3 rounded-2xl shadow-2xl border border-slate-700 flex items-center gap-3 animate-in fade-in slide-in-from-top-3 duration-150">
          <CheckCircle className="w-5 h-5 text-emerald-400" />
          <span className="text-xs font-semibold">{copyNotice}</span>
        </div>
      )}

      {/* Top Section: Title & Pipeline Steps Bar (Page 1 & 6 in PDF) */}
      <div className="space-y-4">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h2 className="text-2xl font-black text-slate-800 dark:text-white tracking-tight">지원자 관리</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
              현재 진행 중인 채용의 단계별 지원자 수를 확인하고 관리할 수 있습니다.
            </p>
          </div>
          <div className="flex items-center gap-2.5">
            <button
              onClick={() => exportApplicantsToExcel(filteredApplicants)}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 font-semibold text-xs shadow-xs transition-all cursor-pointer"
            >
              <Download className="w-4 h-4 text-emerald-600" />
              엑셀 다운로드
            </button>
            <button
              onClick={() => setIsDragUploadModalOpen(true)}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-300 hover:bg-blue-100 font-semibold text-xs shadow-xs transition-all cursor-pointer"
            >
              <Upload className="w-4 h-4" />
              이력서 파일 추가
            </button>
            <button
              onClick={() => setIsAddModalOpen(true)}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs shadow-md shadow-blue-500/20 transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              지원자 추가
            </button>
          </div>
        </div>

        {/* 6-Step Pipeline Header Buttons (Page 6 in PDF) */}
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2.5 pt-2">
          {PIPELINE_STEPS.map((step) => {
            const count = statusCounts[step.id] || 0;
            const isSelected = selectedStatusTab === step.id;
            return (
              <button
                key={step.id}
                onClick={() => setSelectedStatusTab(step.id)}
                className={`p-3 rounded-2xl border text-left transition-all duration-150 flex flex-col justify-between ${
                  isSelected
                    ? 'bg-blue-600 border-blue-600 text-white shadow-lg shadow-blue-500/20 scale-[1.02]'
                    : 'bg-white dark:bg-slate-900 border-slate-200/80 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:border-slate-300'
                }`}
              >
                <span className={`text-[11px] font-bold truncate ${isSelected ? 'text-blue-100' : 'text-slate-400'}`}>
                  {step.label}
                </span>
                <span className="text-xl font-black mt-2 tracking-tight">{count}명</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Search & Multi-Filters Toolbar (Page 7 & 13 in PDF) */}
      <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-1 items-center gap-3 min-w-[280px]">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="이름, 이메일, 전화번호 검색"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 text-slate-800 dark:text-white placeholder:text-slate-400 focus:outline-blue-600"
            />
          </div>
        </div>

        <div className="flex items-center gap-3 text-xs">
          {/* Job Role Filter */}
          <select
            value={selectedJobRole}
            onChange={(e) => setSelectedJobRole(e.target.value)}
            className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 font-semibold focus:outline-blue-600 cursor-pointer"
          >
            <option value="ALL">전체 직무</option>
            <option value="공사">공사</option>
            <option value="안전">안전</option>
            <option value="공무">공무</option>
            <option value="품질">품질</option>
            <option value="전산">전산</option>
          </select>

          {/* Site Filter */}
          <select
            value={selectedSite}
            onChange={(e) => setSelectedSite(e.target.value)}
            className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 font-semibold focus:outline-blue-600 cursor-pointer"
          >
            <option value="ALL">전체 현장</option>
            <option value="평택 P5 RC공사 2공구">평택 P5 RC공사 2공구</option>
            <option value="화성 동탄 신축공사">화성 동탄 신축공사</option>
            <option value="안산 송도 오피스텔">안산 송도 오피스텔</option>
            <option value="대전 도안지구 공사">대전 도안지구 공사</option>
            <option value="김포 한강신도시">김포 한강신도시</option>
          </select>

          {/* Join Date Sort Toggle (Page 13) */}
          <button
            onClick={() => setSortByJoinDate(!sortByJoinDate)}
            className={`px-3 py-2 rounded-xl border font-semibold transition-colors flex items-center gap-1.5 cursor-pointer ${
              sortByJoinDate
                ? 'bg-blue-50 border-blue-300 text-blue-600 dark:bg-blue-950/40 dark:border-blue-700 dark:text-blue-400'
                : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-50'
            }`}
          >
            <Calendar className="w-3.5 h-3.5" />
            입사일자순 정렬 {sortByJoinDate && '✓'}
          </button>
        </div>
      </div>

      {/* Main Applicants Table (Page 7 in PDF) */}
      <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-600 dark:text-slate-300">
            <thead className="bg-slate-50 dark:bg-slate-800/60 text-[11px] font-bold text-slate-500 uppercase tracking-wider border-b border-slate-200/60 dark:border-slate-800">
              <tr>
                <th className="py-3.5 px-5">No</th>
                <th className="py-3.5 px-5">이름</th>
                <th className="py-3.5 px-5">연락처</th>
                <th className="py-3.5 px-5">이메일</th>
                <th className="py-3.5 px-5">지원경로</th>
                <th className="py-3.5 px-5">지원직무</th>
                <th className="py-3.5 px-5">지원현장</th>
                <th className="py-3.5 px-5">지원일자</th>
                <th className="py-3.5 px-5">입사일자</th>
                <th className="py-3.5 px-5 text-center">현재 단계</th>
                <th className="py-3.5 px-5 text-center">관리</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium">
              {filteredApplicants.length === 0 ? (
                <tr>
                  <td colSpan={11} className="py-12 text-center text-slate-400 text-sm">
                    해당 조건에 일치하는 지원자가 없습니다.
                  </td>
                </tr>
              ) : (
                filteredApplicants.map((app, idx) => {
                  return (
                    <tr
                      key={app.id}
                      onClick={() => {
                        setSelectedApplicant(app);
                        setEditingMemo(app.memo || '');
                      }}
                      className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors cursor-pointer"
                    >
                      <td className="py-4 px-5 text-slate-400">{idx + 1}</td>
                      <td className="py-4 px-5 font-bold text-slate-800 dark:text-white flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-400 flex items-center justify-center text-[10px] font-bold">
                          {app.name.charAt(0)}
                        </div>
                        {app.name}
                      </td>
                      <td className="py-4 px-5 font-mono text-slate-600 dark:text-slate-300">{app.phone}</td>
                      <td className="py-4 px-5 text-slate-500">{app.email}</td>
                      <td className="py-4 px-5">
                        <span className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 text-[10px]">
                          {app.applyPath || '사람인'}
                        </span>
                      </td>
                      <td className="py-4 px-5 font-bold text-slate-700 dark:text-slate-300">{app.jobRole || '공사'}</td>
                      <td className="py-4 px-5 text-slate-500 truncate max-w-[140px]">{app.siteName || '-'}</td>
                      <td className="py-4 px-5 text-slate-400">
                        {app.createdAt ? new Date(app.createdAt).toISOString().split('T')[0] : '-'}
                      </td>
                      <td className="py-4 px-5 font-semibold text-blue-600 dark:text-blue-400">
                        {app.joinDate ? new Date(app.joinDate).toISOString().split('T')[0] : '-'}
                      </td>
                      <td className="py-4 px-5 text-center">
                        <span
                          className={`inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-bold ${
                            app.status === 'APPLIED'
                              ? 'bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-400 border border-blue-200'
                              : app.status === 'PERSONALITY_TEST_PENDING'
                              ? 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400 border border-amber-200'
                              : app.status === 'PERSONALITY_TEST_COMPLETED'
                              ? 'bg-teal-50 text-teal-700 dark:bg-teal-950/40 dark:text-teal-400 border border-teal-200'
                              : app.status === 'INTERVIEW_SCHEDULED'
                              ? 'bg-purple-50 text-purple-700 dark:bg-purple-950/40 dark:text-purple-400 border border-purple-200'
                              : app.status === 'ACCEPTED'
                              ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 border border-emerald-200'
                              : app.status === 'ONBOARDING_SCHEDULED'
                              ? 'bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-400 border border-rose-200'
                              : 'bg-slate-100 text-slate-600'
                          }`}
                        >
                          {getStatusLabel(app.status)}
                        </span>
                      </td>
                      <td className="py-4 px-5 text-center">
                        <button className="px-2.5 py-1 text-slate-500 hover:text-blue-600 font-semibold hover:underline">
                          상세
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Applicant Detail Modal (Pages 8, 9, 10, 12 in PDF) */}
      {selectedApplicant && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 max-w-3xl w-full p-8 max-h-[92vh] overflow-y-auto space-y-6 animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="flex items-start justify-between border-b border-slate-100 dark:border-slate-800 pb-5">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white font-black text-2xl flex items-center justify-center shadow-lg shadow-blue-500/20">
                  {selectedApplicant.name.charAt(0)}
                </div>
                <div>
                  <div className="flex items-center gap-2.5">
                    <h3 className="text-xl font-black text-slate-800 dark:text-white">{selectedApplicant.name}</h3>
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300">
                      {selectedApplicant.jobRole || '공사'}
                    </span>
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400">
                      경로: {selectedApplicant.applyPath || '사람인'}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 mt-1 flex items-center gap-3">
                    <span>📞 {selectedApplicant.phone}</span>
                    <span>✉️ {selectedApplicant.email}</span>
                    <span>🏢 {selectedApplicant.siteName || '현장 미정'}</span>
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelectedApplicant(null)}
                className="p-1 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-white"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Stepper Pipeline Status Changer (Pages 6 & 8) */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block">채용 단계 변경</label>
              <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                {[
                  { id: 'APPLIED', num: '1', title: '이력서 지원' },
                  { id: 'PERSONALITY_TEST_PENDING', num: '2', title: '인성검사 진행' },
                  { id: 'PERSONALITY_TEST_COMPLETED', num: '3', title: '인성검사 완료' },
                  { id: 'INTERVIEW_SCHEDULED', num: '4', title: '면접일자 확정' },
                  { id: 'ACCEPTED', num: '5', title: '채용 여부' },
                  { id: 'ONBOARDING_SCHEDULED', num: '6', title: '입문교육 일정' },
                ].map((st) => {
                  const isActive = selectedApplicant.status === st.id;
                  return (
                    <button
                      key={st.id}
                      onClick={() => handleUpdateStatus(selectedApplicant.id, st.id)}
                      className={`p-2.5 rounded-xl border text-center transition-all cursor-pointer ${
                        isActive
                          ? 'bg-blue-600 border-blue-600 text-white shadow-md shadow-blue-500/20 font-bold'
                          : 'bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:border-slate-400 text-xs'
                      }`}
                    >
                      <div className="text-[10px] opacity-75">{st.num}단계</div>
                      <div className="text-xs font-bold truncate mt-0.5">{st.title}</div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Resume & Memo Section (Page 8 in PDF) */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Resume Card */}
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-xs font-bold text-slate-700 dark:text-slate-200">
                    <FileText className="w-4 h-4 text-blue-600" />
                    <span>제출된 이력서</span>
                  </div>
                  <button
                    onClick={() => {
                      alert('이력서 파일 다운로드가 시작되었습니다.');
                    }}
                    className="px-3 py-1 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg text-xs font-bold text-blue-600 dark:text-blue-400 hover:bg-blue-50"
                  >
                    다운로드
                  </button>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed bg-white dark:bg-slate-900 p-3 rounded-xl border border-slate-200/60 dark:border-slate-800">
                  {selectedApplicant.resumeText || '이력서_김지원.pdf (첨부파일 정상 파싱됨)'}
                </p>
              </div>

              {/* Memo Box (Page 8: "@님 소개 등 작성") */}
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-200 flex items-center gap-1.5">
                    <MessageSquare className="w-4 h-4 text-indigo-500" />
                    <span>지원자 메모 (@추천인 기록)</span>
                  </label>
                  <button
                    onClick={() => handleSaveMemo(selectedApplicant.id)}
                    className="px-3 py-1 bg-blue-600 text-white rounded-lg text-xs font-bold hover:bg-blue-700"
                  >
                    저장
                  </button>
                </div>
                <textarea
                  rows={3}
                  value={editingMemo}
                  onChange={(e) => setEditingMemo(e.target.value)}
                  placeholder="@님 소개 등 지원자에 대한 메모를 작성하세요."
                  className="w-full text-xs p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-white focus:outline-blue-600"
                />
              </div>
            </div>

            {/* Special Action Sections according to requirements */}
            <div className="space-y-4 pt-2">
              {/* 1. Personality Test Actions (Pages 8 & 9 in PDF) */}
              <div className="p-5 rounded-2xl bg-amber-50/50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800/60 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <AlertCircle className="w-5 h-5 text-amber-600" />
                    <div>
                      <h4 className="text-sm font-bold text-amber-900 dark:text-amber-200">인성검사 연동 및 결과표</h4>
                      <p className="text-xs text-amber-700 dark:text-amber-400">
                        사이트 이동 시 자동으로 &quot;인성검사 진행 중&quot;으로 전환됩니다.
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handlePersonalitySiteRedirect(selectedApplicant)}
                      className="flex items-center gap-1.5 px-3.5 py-1.5 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded-xl shadow-xs"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      인성검사 사이트 이동
                    </button>
                    <button
                      onClick={() => setIsPersonalityUploadModalOpen(true)}
                      className="flex items-center gap-1.5 px-3.5 py-1.5 bg-white dark:bg-slate-800 border border-amber-300 dark:border-amber-700 text-amber-800 dark:text-amber-300 text-xs font-bold rounded-xl"
                    >
                      <Upload className="w-3.5 h-3.5" />
                      결과표 등록
                    </button>
                  </div>
                </div>

                {selectedApplicant.personalityTestFile && (
                  <div className="flex items-center justify-between p-3 rounded-xl bg-white dark:bg-slate-900 border border-amber-200/80 text-xs font-medium">
                    <span className="flex items-center gap-2 text-slate-700 dark:text-slate-300">
                      <FileCheck className="w-4 h-4 text-emerald-500" />
                      {selectedApplicant.personalityTestFile}
                    </span>
                    <span className="text-[11px] text-slate-400">
                      {selectedApplicant.personalityTestPassword ? '🔒 비밀번호 설정됨' : '공개'}
                    </span>
                  </div>
                )}
              </div>

              {/* 2. Interview Date & Share via Kakao / SMS (Page 12 in PDF) */}
              <div className="p-5 rounded-2xl bg-purple-50/50 dark:bg-purple-950/20 border border-purple-200 dark:border-purple-800/60 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-5 h-5 text-purple-600" />
                    <div>
                      <h4 className="text-sm font-bold text-purple-900 dark:text-purple-200">
                        면접일자 확정 & 일정 공유하기
                      </h4>
                      <p className="text-xs text-purple-700 dark:text-purple-400">
                        지원자에게 전달할 면접 일정을 문자 복사 또는 카카오톡으로 공유할 수 있습니다.
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleCopyInterviewSMS(selectedApplicant)}
                      className="flex items-center gap-1.5 px-3.5 py-1.5 bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold rounded-xl shadow-xs"
                    >
                      <Copy className="w-3.5 h-3.5" />
                      문자 복사
                    </button>
                    <button
                      onClick={() => {
                        handleCopyInterviewSMS(selectedApplicant);
                        window.open('https://sharer.kakao.com', '_blank');
                      }}
                      className="flex items-center gap-1.5 px-3.5 py-1.5 bg-[#FEE500] hover:bg-[#FDD835] text-[#191919] text-xs font-bold rounded-xl shadow-xs"
                    >
                      <Share2 className="w-3.5 h-3.5" />
                      카카오톡 공유
                    </button>
                    <button
                      onClick={() => window.open('https://www.send1004.com', '_blank')}
                      className="flex items-center gap-1.5 px-3.5 py-1.5 bg-white dark:bg-slate-800 border border-purple-300 dark:border-purple-700 text-purple-700 dark:text-purple-300 text-xs font-bold rounded-xl"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      문자천사 열기
                    </button>
                  </div>
                </div>

                <div className="p-3 bg-white dark:bg-slate-900 rounded-xl border border-purple-200/80 text-xs space-y-1 text-slate-700 dark:text-slate-300">
                  <div className="font-bold text-purple-600">[태일씨앤티] 면접 일정 안내</div>
                  <div>일시: 2026년 10월 23일(금) 오전 10:00</div>
                  <div>장소: 태일씨앤티 본사 회의실</div>
                  <div>면접관: 김민수 PM, 이지현 팀장</div>
                </div>
              </div>

              {/* 3. Onboarding & Send1004 Integration (Page 10 in PDF) */}
              <div className="p-5 rounded-2xl bg-rose-50/50 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-800/60 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <MessageSquare className="w-5 h-5 text-rose-600" />
                    <div>
                      <h4 className="text-sm font-bold text-rose-900 dark:text-rose-200">
                        입문교육 일정 안내 (문자천사 연동)
                      </h4>
                      <p className="text-xs text-rose-700 dark:text-rose-400">
                        문자 내용을 복사하여 문자천사 사이트에서 바로 발송할 수 있습니다.
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleCopyOnboardingSMS(selectedApplicant)}
                      className="flex items-center gap-1.5 px-3.5 py-1.5 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl shadow-xs"
                    >
                      <Copy className="w-3.5 h-3.5" />
                      문자 내용 복사
                    </button>
                    <button
                      onClick={() => window.open('https://www.send1004.com', '_blank')}
                      className="flex items-center gap-1.5 px-3.5 py-1.5 bg-white dark:bg-slate-800 border border-rose-300 text-rose-700 text-xs font-bold rounded-xl"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      문자천사 사이트 이동
                    </button>
                  </div>
                </div>

                <div className="p-3 bg-white dark:bg-slate-900 rounded-xl border border-rose-200/80 text-xs space-y-1 text-slate-700 dark:text-slate-300">
                  <div className="font-bold text-rose-600">[태일씨앤티] 안녕하세요.</div>
                  <div>입문교육 일정이 확정되었습니다.</div>
                  <div>일시: {selectedApplicant.joinDate ? new Date(selectedApplicant.joinDate).toISOString().split('T')[0] : '2026-11-01'} 오전 10:00</div>
                  <div>장소: {selectedApplicant.siteName || '평택 P5 RC공사 2공구'} 현장사무실</div>
                  <div>문의: 010-1234-5678</div>
                </div>
              </div>
            </div>

            {/* Bottom Actions */}
            <div className="flex items-center justify-between pt-4 border-t border-slate-100 dark:border-slate-800">
              <button
                onClick={async () => {
                  if (confirm('해당 지원자를 정말 삭제하시겠습니까?')) {
                    await fetch(`/api/applicants/${selectedApplicant.id}`, { method: 'DELETE' });
                    setSelectedApplicant(null);
                    fetchApplicants();
                  }
                }}
                className="flex items-center gap-1.5 text-xs text-rose-500 hover:text-rose-700 font-semibold"
              >
                <Trash2 className="w-4 h-4" /> 지원자 삭제
              </button>
              <button
                onClick={() => setSelectedApplicant(null)}
                className="px-5 py-2.5 rounded-xl bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 text-xs font-bold"
              >
                닫기
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Manual Add Applicant Modal (Page 7 in PDF) */}
      {isAddModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 max-w-lg w-full p-6 space-y-5 animate-in fade-in duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <h3 className="font-bold text-base text-slate-800 dark:text-white">지원자 직접 추가 (소개 등)</h3>
              <button onClick={() => setIsAddModalOpen(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateManualApplicant} className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-600 dark:text-slate-400 block mb-1">지원자 이름 *</label>
                  <input
                    type="text"
                    required
                    placeholder="예: 홍길동"
                    value={manualForm.name}
                    onChange={(e) => setManualForm({ ...manualForm, name: e.target.value })}
                    className="w-full px-3 py-2 text-sm rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-white focus:outline-blue-600"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-600 dark:text-slate-400 block mb-1">연락처 *</label>
                  <input
                    type="text"
                    required
                    placeholder="010-1234-5678"
                    value={manualForm.phone}
                    onChange={(e) => setManualForm({ ...manualForm, phone: e.target.value })}
                    className="w-full px-3 py-2 text-sm rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-white focus:outline-blue-600"
                  />
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-600 dark:text-slate-400 block mb-1">이메일</label>
                <input
                  type="email"
                  placeholder="user@example.com"
                  value={manualForm.email}
                  onChange={(e) => setManualForm({ ...manualForm, email: e.target.value })}
                  className="w-full px-3 py-2 text-sm rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-white focus:outline-blue-600"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-600 dark:text-slate-400 block mb-1">지원 직무</label>
                  <select
                    value={manualForm.jobRole}
                    onChange={(e) => setManualForm({ ...manualForm, jobRole: e.target.value })}
                    className="w-full px-3 py-2 text-sm rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-white focus:outline-blue-600"
                  >
                    <option value="공사">공사</option>
                    <option value="안전">안전</option>
                    <option value="공무">공무</option>
                    <option value="품질">품질</option>
                    <option value="전산">전산</option>
                    <option value="기타">기타</option>
                  </select>
                </div>
                <div>
                  <label className="font-bold text-slate-600 dark:text-slate-400 block mb-1">지원 경로</label>
                  <select
                    value={manualForm.applyPath}
                    onChange={(e) => setManualForm({ ...manualForm, applyPath: e.target.value })}
                    className="w-full px-3 py-2 text-sm rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-white focus:outline-blue-600"
                  >
                    <option value="지인 소개">지인 소개</option>
                    <option value="사람인">사람인</option>
                    <option value="잡코리아">잡코리아</option>
                    <option value="기타">기타</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-600 dark:text-slate-400 block mb-1">배정 현장</label>
                <select
                  value={manualForm.siteName}
                  onChange={(e) => setManualForm({ ...manualForm, siteName: e.target.value })}
                  className="w-full px-3 py-2 text-sm rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-white focus:outline-blue-600"
                >
                  <option value="평택 P5 RC공사 2공구">평택 P5 RC공사 2공구</option>
                  <option value="화성 동탄 신축공사">화성 동탄 신축공사</option>
                  <option value="안산 송도 오피스텔">안산 송도 오피스텔</option>
                  <option value="대전 도안지구 공사">대전 도안지구 공사</option>
                  <option value="김포 한강신도시">김포 한강신도시</option>
                </select>
              </div>

              <div>
                <label className="font-bold text-slate-600 dark:text-slate-400 block mb-1">입사 예정 일자</label>
                <input
                  type="date"
                  value={manualForm.joinDate}
                  onChange={(e) => setManualForm({ ...manualForm, joinDate: e.target.value })}
                  className="w-full px-3 py-2 text-sm rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-white focus:outline-blue-600"
                />
              </div>

              <div>
                <label className="font-bold text-slate-600 dark:text-slate-400 block mb-1">메모 (@추천인)</label>
                <input
                  type="text"
                  placeholder="예: @본사 김전무님 추천"
                  value={manualForm.memo}
                  onChange={(e) => setManualForm({ ...manualForm, memo: e.target.value })}
                  className="w-full px-3 py-2 text-sm rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-white focus:outline-blue-600"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100"
                >
                  취소
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white shadow-md shadow-blue-500/20"
                >
                  등록하기
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Drag & Drop Resume Upload Modal (Page 6 in PDF) */}
      {isDragUploadModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 max-w-md w-full p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <h3 className="font-bold text-base text-slate-800 dark:text-white">이력서 파일 추가</h3>
              <button onClick={() => setIsDragUploadModalOpen(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                const file = e.dataTransfer.files[0];
                if (file) handleResumeDrop(file.name);
              }}
              className="border-2 border-dashed border-blue-400/60 dark:border-blue-600/60 rounded-2xl p-8 text-center flex flex-col items-center justify-center space-y-3 bg-blue-50/30 dark:bg-blue-950/20 hover:bg-blue-50/60 transition-all cursor-pointer"
            >
              <div className="w-12 h-12 rounded-full bg-blue-100 dark:bg-blue-900/40 text-blue-600 flex items-center justify-center">
                <Upload className="w-6 h-6" />
              </div>
              <div>
                <p className="text-xs font-bold text-slate-700 dark:text-slate-200">
                  이력서 파일을 여기에 드래그하거나
                </p>
                <p className="text-[11px] text-slate-400 mt-1">파일 선택 버튼을 클릭하세요 (PDF, DOCX)</p>
              </div>
              <label className="px-4 py-1.5 bg-blue-600 text-white rounded-xl text-xs font-bold hover:bg-blue-700 cursor-pointer">
                파일 선택
                <input
                  type="file"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) handleResumeDrop(f.name);
                  }}
                />
              </label>
            </div>
          </div>
        </div>
      )}

      {/* Personality Test Upload Modal (Page 9 in PDF) */}
      {isPersonalityUploadModalOpen && selectedApplicant && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 max-w-md w-full p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <h3 className="font-bold text-base text-slate-800 dark:text-white">인성평가 결과표 등록</h3>
              <button
                onClick={() => setIsPersonalityUploadModalOpen(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4 text-xs">
              <div className="border-2 border-dashed border-amber-300 rounded-2xl p-6 text-center space-y-2 bg-amber-50/20">
                <FileCheck className="w-8 h-8 text-amber-500 mx-auto" />
                <p className="font-bold text-slate-700 dark:text-slate-200">
                  결과표를 여기에 드래그하거나 선택하세요
                </p>
                <input
                  type="text"
                  value={personalityFile}
                  onChange={(e) => setPersonalityFile(e.target.value)}
                  className="w-full text-center text-xs font-semibold px-3 py-1.5 border rounded-lg bg-white dark:bg-slate-800 text-slate-800 dark:text-white"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  🔒 열람 비밀번호 설정 (선택 사항)
                </label>
                <input
                  type="password"
                  placeholder="임원/담당자 전용 열람 비밀번호"
                  value={personalityPassword}
                  onChange={(e) => setPersonalityPassword(e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-white focus:outline-blue-600"
                />
                <p className="text-[10px] text-slate-400 mt-1">
                  비밀번호를 설정하면 권한이 있는 담당자만 결과표를 열람할 수 있습니다.
                </p>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsPersonalityUploadModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100"
                >
                  취소
                </button>
                <button
                  type="button"
                  onClick={handleSavePersonalityTest}
                  className="px-5 py-2 rounded-xl text-xs font-bold bg-amber-600 hover:bg-amber-700 text-white shadow-md shadow-amber-500/20"
                >
                  등록 완료
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
