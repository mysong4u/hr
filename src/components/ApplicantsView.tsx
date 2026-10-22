'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  Users,
  Search,
  Filter,
  Download,
  Plus,
  FileText,
  Upload,
  Calendar,
  Sparkles,
  ExternalLink,
  MessageSquare,
  CheckCircle2,
  Clock,
  ChevronRight,
  Shield,
  FileCheck,
  Send,
  X,
  Share2,
  Copy,
  AlertCircle,
  Building2,
  Trash2,
} from 'lucide-react';
import { exportApplicantsToExcel, getStatusLabel } from '@/lib/excel';

interface Interview {
  id: string;
  interviewers: string;
  scheduledTime: string | null;
  location: string | null;
  status: string;
}

interface Applicant {
  id: string;
  name: string;
  email: string;
  phone: string;
  resumeUrl?: string | null;
  resumeText?: string | null;
  status: string;
  aiScore?: string | null;
  aiReason?: string | null;
  applyPath?: string | null;
  joinDate?: string | null;
  jobRole?: string | null;
  siteName?: string | null;
  memo?: string | null;
  personalityTestFile?: string | null;
  personalityTestPassword?: string | null;
  interviewEvalFile?: string | null;
  interviewEvalPassword?: string | null;
  interviewEvalAuth?: string | null;
  createdAt: string;
  interviews: Interview[];
}

interface SiteItem {
  id: string;
  name: string;
  location?: string;
}

const PIPELINE_STEPS = [
  { id: 'ALL', label: '전체 지원자', color: 'from-slate-600 to-slate-800' },
  { id: 'APPLIED', label: '1. 이력서 지원', color: 'from-blue-600 to-cyan-500' },
  { id: 'PERSONALITY_TEST_PENDING', label: '2. 인성검사 진행', color: 'from-amber-500 to-orange-500' },
  { id: 'PERSONALITY_TEST_COMPLETED', label: '3. 인성검사 완료', color: 'from-teal-500 to-emerald-600' },
  { id: 'INTERVIEW_SCHEDULED', label: '4. 면접일자 확정', color: 'from-purple-600 to-indigo-600' },
  { id: 'ONBOARDING_SCHEDULED', label: '5. 입문교육 일정', color: 'from-pink-600 to-rose-500' },
  { id: 'ACCEPTED', label: '채용확정', color: 'from-emerald-600 to-green-700' },
  { id: 'REJECTED', label: '불합격', color: 'from-rose-600 to-red-700' },
];

export default function ApplicantsView() {
  const [applicants, setApplicants] = useState<Applicant[]>([]);
  const [sites, setSites] = useState<SiteItem[]>([]);
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
  const [isPersonalityDragging, setIsPersonalityDragging] = useState(false);
  const personalityFileInputRef = useRef<HTMLInputElement>(null);

  // Manual Add Form
  const [manualForm, setManualForm] = useState({
    name: '',
    phone: '',
    email: '',
    applyPath: '사람인',
    jobRole: '공사',
    siteName: '',
    joinDate: '',
    interviewers: '김민수 PM, 이지현 팀장',
    interviewDate: '2026-10-23T10:00',
    interviewLocation: '태일씨앤티 본사 회의실',
    memo: '',
  });

  // Resume Upload State in Manual Registration Modal
  const [manualResumeFile, setManualResumeFile] = useState<File | null>(null);
  const [manualResumeFileName, setManualResumeFileName] = useState<string>('');
  const [isManualResumeDragging, setIsManualResumeDragging] = useState(false);
  const manualResumeFileInputRef = useRef<HTMLInputElement>(null);

  // Resume Upload in Detail Modal
  const detailResumeFileInputRef = useRef<HTMLInputElement>(null);
  const [isDetailResumeUploading, setIsDetailResumeUploading] = useState(false);

  // Memo edit in detail
  const [editingMemo, setEditingMemo] = useState('');
  const [copyNotice, setCopyNotice] = useState<string | null>(null);

  const formatInterviewDateTime = (dateStr?: string | null) => {
    if (!dateStr) return '2026년 10월 23일(금) 오전 10:00';
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return String(dateStr);
    return d.toLocaleString('ko-KR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      weekday: 'short',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

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

  const fetchSites = async () => {
    try {
      const res = await fetch('/api/sites');
      if (res.ok) {
        const data = await res.json();
        setSites(data);
        if (data.length > 0 && !manualForm.siteName) {
          setManualForm((prev) => ({ ...prev, siteName: data[0].name }));
        }
      }
    } catch (e) {
      console.error('Failed to load sites:', e);
    }
  };

  useEffect(() => {
    fetchApplicants();
    fetchSites();
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
    ONBOARDING_SCHEDULED: applicants.filter((a) => a.status === 'ONBOARDING_SCHEDULED').length,
    ACCEPTED: applicants.filter((a) => a.status === 'ACCEPTED').length,
    REJECTED: applicants.filter((a) => a.status === 'REJECTED').length,
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

  // Update status handler
  const handleUpdateStatus = async (applicantId: string, nextStatus: string) => {
    try {
      const res = await fetch(`/api/applicants/${applicantId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: nextStatus }),
      });
      if (res.ok) {
        const updated = await res.json();
        setApplicants((prev) => prev.map((a) => (a.id === applicantId ? updated : a)));
        if (selectedApplicant && selectedApplicant.id === applicantId) {
          setSelectedApplicant(updated);
        }
        const label = getStatusLabel(nextStatus);
        showCopyFeedback(`지원자 상태가 "${label}"(으)로 변경되었습니다.`);
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Open external personality test site & auto-update status
  const handlePersonalitySiteRedirect = (app: Applicant) => {
    handleUpdateStatus(app.id, 'PERSONALITY_TEST_PENDING');
    window.open('https://onlinetest.kirbs.re.kr/eKPDI/contents/eflow/', '_blank');
    showCopyFeedback('인성검사 사이트(kirbs)로 이동하며 지원자 상태를 "인성검사 진행 중"으로 변경했습니다.');
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
        setApplicants((prev) => prev.map((a) => (a.id === updated.id ? updated : a)));
        setSelectedApplicant(updated);
        setIsPersonalityUploadModalOpen(false);
        setPersonalityPassword('');
        showCopyFeedback('인성검사 결과표가 등록되었으며 "인성검사 완료" 상태로 전환되었습니다.');
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Update Memo
  const handleSaveMemo = async () => {
    if (!selectedApplicant) return;
    try {
      const res = await fetch(`/api/applicants/${selectedApplicant.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ memo: editingMemo }),
      });
      if (res.ok) {
        const updated = await res.json();
        setApplicants((prev) => prev.map((a) => (a.id === updated.id ? updated : a)));
        setSelectedApplicant(updated);
        showCopyFeedback('메모가 저장되었습니다.');
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Download Resume File
  const handleDownloadResume = (applicant: Applicant) => {
    const downloadUrl = `/api/files/download?applicantId=${applicant.id}&type=resume`;
    const link = document.createElement('a');
    link.href = downloadUrl;
    link.download = applicant.resumeUrl || `이력서_${applicant.name}.pdf`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showCopyFeedback(`"${applicant.name}" 지원자의 이력서 다운로드가 시작되었습니다.`);
  };

  // Upload/Replace Resume File from Detail Modal
  const handleDetailResumeUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!selectedApplicant || !e.target.files || !e.target.files[0]) return;
    const file = e.target.files[0];
    setIsDetailResumeUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('applicantId', selectedApplicant.id);
      formData.append('type', 'resume');

      const res = await fetch('/api/files/upload', {
        method: 'POST',
        body: formData,
      });

      if (res.ok) {
        const data = await res.json();
        if (data.applicant) {
          setSelectedApplicant(data.applicant);
          setApplicants((prev) => prev.map((a) => (a.id === data.applicant.id ? data.applicant : a)));
        } else {
          fetchApplicants();
        }
        showCopyFeedback(`이력서 파일("${file.name}")이 새로 등록되었습니다.`);
      } else {
        alert('이력서 파일 업로드에 실패했습니다.');
      }
    } catch (err) {
      console.error(err);
      alert('업로드 처리 중 오류가 발생했습니다.');
    } finally {
      setIsDetailResumeUploading(false);
      if (detailResumeFileInputRef.current) {
        detailResumeFileInputRef.current.value = '';
      }
    }
  };

  // Format Interview SMS message
  const handleCopyInterviewSMS = (app: Applicant) => {
    const interviewDate = formatInterviewDateTime(app.interviews?.[0]?.scheduledTime);
    const location = app.interviews?.[0]?.location || '태일씨앤티 본사 회의실';
    const interviewers = app.interviews?.[0]?.interviewers || '김민수 PM, 이지현 팀장';

    const msg = `[태일씨앤티 면접안내]
안녕하세요 ${app.name}님, (주)태일씨앤티 채용팀입니다.
서류전형 합격을 축하드리며 아래와 같이 면접 일정을 안내해 드립니다.

- 지원직무: ${app.jobRole || '공사'}
- 면접일시: ${interviewDate}
- 면접장소: ${location}
- 면 접 관: ${interviewers}
- 안내사항: 신분증 지참 및 면접 10분 전 도착 부탁드립니다.

감사합니다.`;

    navigator.clipboard.writeText(msg);
    showCopyFeedback('면접 안내 문자가 클립보드에 복사되었습니다.');
  };

  // Format Onboarding SMS message (Page 10 in PDF)
  const handleCopyOnboardingSMS = (app: Applicant) => {
    const targetDate = app.joinDate
      ? new Date(app.joinDate).toISOString().split('T')[0]
      : '2026-11-01';

    const msg = `[태일씨앤티 입문교육 안내]
안녕하세요 ${app.name}님, (주)태일씨앤티입니다.
최종 합격을 진심으로 축하드리며, 입문교육 일정을 안내드립니다.

- 일시: ${targetDate} 오전 10:00
- 장소: ${app.siteName || (sites[0]?.name ?? '평택 P5 RC공사 2공구')} 현장사무실
- 준비물: 신분증 사본, 통장 사본, 자격증 사본

상세 문의: 010-1234-5678 (인사채용팀)
감사합니다.`;

    navigator.clipboard.writeText(msg);
    showCopyFeedback('입문교육 안내 문자가 클립보드에 복사되었습니다.');
  };

  // Handle Manual Add
  const handleManualSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const assignedSite = manualForm.siteName || (sites[0]?.name ?? '평택 P5 RC공사 2공구');
      const res = await fetch('/api/applicants', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...manualForm,
          siteName: assignedSite,
          status: 'APPLIED',
        }),
      });

      if (res.ok) {
        const createdApplicant = await res.json();

        // 선택된 이력서 파일이 있다면 신규 지원자에 업로드 연동
        if (manualResumeFile && createdApplicant?.id) {
          try {
            const formData = new FormData();
            formData.append('file', manualResumeFile);
            formData.append('applicantId', createdApplicant.id);
            formData.append('type', 'resume');
            await fetch('/api/files/upload', {
              method: 'POST',
              body: formData,
            });
          } catch (uploadErr) {
            console.error('Failed to upload manual resume file:', uploadErr);
          }
        }

        setIsAddModalOpen(false);
        setManualForm({
          name: '',
          phone: '',
          email: '',
          applyPath: '사람인',
          jobRole: '공사',
          siteName: sites[0]?.name ?? '',
          joinDate: '',
          interviewers: '김민수 PM, 이지현 팀장',
          interviewDate: '2026-10-23T10:00',
          interviewLocation: '태일씨앤티 본사 회의실',
          memo: '',
        });
        setManualResumeFile(null);
        setManualResumeFileName('');
        if (manualResumeFileInputRef.current) {
          manualResumeFileInputRef.current.value = '';
        }
        fetchApplicants();
        showCopyFeedback('신규 지원자가 등록되었습니다.');
      } else {
        const err = await res.json();
        alert(err.error || '지원자 등록 중 오류가 발생했습니다.');
      }
    } catch (e) {
      console.error(e);
      alert('지원자 등록 처리 중 오류가 발생했습니다.');
    }
  };

  return (
    <div className="p-8 space-y-6 max-w-7xl mx-auto">
      {/* Toast Notification */}
      {copyNotice && (
        <div className="fixed top-6 right-8 z-50 p-4 bg-slate-900 text-white text-xs font-semibold rounded-2xl shadow-2xl flex items-center gap-2 border border-slate-700 animate-in fade-in slide-in-from-top duration-200">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span>{copyNotice}</span>
        </div>
      )}

      {/* Top Banner / Pipeline Navigation Cards (Pages 6, 7 in PDF) */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
        {PIPELINE_STEPS.map((step) => {
          const isSelected = selectedStatusTab === step.id;
          const count = statusCounts[step.id] || 0;
          return (
            <button
              key={step.id}
              onClick={() => setSelectedStatusTab(step.id)}
              className={`p-3.5 rounded-2xl border text-left transition-all duration-200 cursor-pointer ${
                isSelected
                  ? 'bg-blue-600 border-blue-600 text-white shadow-lg shadow-blue-500/25 scale-[1.02]'
                  : 'bg-white dark:bg-slate-900 border-slate-200/80 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 text-slate-700 dark:text-slate-200'
              }`}
            >
              <div className="text-[11px] font-bold opacity-80 truncate">{step.label}</div>
              <div className="text-xl font-black mt-1 flex items-baseline justify-between">
                <span>{count}명</span>
                <ChevronRight className={`w-3.5 h-3.5 opacity-60 ${isSelected ? 'translate-x-0.5' : ''}`} />
              </div>
            </button>
          );
        })}
      </div>

      {/* Controls & Search Bar */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        {/* Search */}
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 absolute left-3.5 top-3 text-slate-400" />
          <input
            type="text"
            placeholder="지원자 이름, 연락처, 이메일 검색..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs text-slate-800 dark:text-white placeholder:text-slate-400 focus:outline-blue-600 font-medium"
          />
        </div>

        {/* Filters and Actions */}
        <div className="flex flex-wrap items-center gap-2.5 text-xs">
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
            <option value="기타">기타</option>
          </select>

          {/* Site Filter (Dynamically fetched from DB) */}
          <select
            value={selectedSite}
            onChange={(e) => setSelectedSite(e.target.value)}
            className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 font-semibold focus:outline-blue-600 cursor-pointer"
          >
            <option value="ALL">전체 현장</option>
            {sites.map((site) => (
              <option key={site.id} value={site.name}>
                {site.name}
              </option>
            ))}
          </select>

          {/* Join Date Sort Toggle */}
          <button
            onClick={() => setSortByJoinDate(!sortByJoinDate)}
            className={`px-3 py-2 rounded-xl border font-semibold transition-colors flex items-center gap-1.5 cursor-pointer ${
              sortByJoinDate
                ? 'bg-blue-50 border-blue-300 text-blue-600 dark:bg-blue-950/40 dark:border-blue-700 dark:text-blue-400'
                : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-50'
            }`}
          >
            <Calendar className="w-3.5 h-3.5" />
            입사일자순 {sortByJoinDate && '✓'}
          </button>

          {/* Excel Export */}
          <button
            onClick={() => exportApplicantsToExcel(filteredApplicants)}
            className="flex items-center gap-1.5 px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-xs cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            엑셀 다운로드
          </button>

          {/* Add Applicant */}
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-xs cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            지원자 등록
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
                              ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 border border-emerald-300'
                              : app.status === 'REJECTED'
                              ? 'bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-400 border border-rose-300'
                              : app.status === 'ONBOARDING_SCHEDULED'
                              ? 'bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-400 border border-rose-200'
                              : 'bg-slate-100 text-slate-600'
                          }`}
                        >
                          {getStatusLabel(app.status)}
                        </span>
                      </td>
                      <td className="py-4 px-5 text-center">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedApplicant(app);
                            setEditingMemo(app.memo || '');
                          }}
                          className="px-3 py-1 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 font-semibold"
                        >
                          상세보기
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

      {/* Applicant Detail Modal (Pages 8, 9, 10 in PDF) */}
      {selectedApplicant && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-in fade-in duration-150">
          <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 max-w-4xl w-full p-6 space-y-6 max-h-[92vh] overflow-y-auto">
            {/* Header */}
            <div className="flex items-start justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
              <div className="flex items-center gap-3.5">
                <div className="w-12 h-12 rounded-2xl bg-blue-600 text-white font-black text-lg flex items-center justify-center shadow-md shadow-blue-500/20">
                  {selectedApplicant.name.charAt(0)}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-xl font-black text-slate-800 dark:text-white">{selectedApplicant.name}</h3>
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-400 border border-blue-200">
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
                className="p-1 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-white cursor-pointer"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Stepper Pipeline Status Changer with '채용확정' and '불합격' buttons */}
            <div className="space-y-3 p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800">
              <div className="flex items-center justify-between">
                <div>
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-200 uppercase tracking-wider block">
                    채용 단계 변경
                  </label>
                  <p className="text-[11px] text-slate-400 mt-0.5">단계를 클릭하거나 [채용확정] / [불합격]으로 바로 결정할 수 있습니다.</p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleUpdateStatus(selectedApplicant.id, 'ACCEPTED')}
                    className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer shadow-xs ${
                      selectedApplicant.status === 'ACCEPTED'
                        ? 'bg-emerald-600 text-white ring-2 ring-emerald-400'
                        : 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border border-emerald-300 dark:border-emerald-800 hover:bg-emerald-600 hover:text-white'
                    }`}
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    채용확정
                  </button>
                  <button
                    onClick={() => handleUpdateStatus(selectedApplicant.id, 'REJECTED')}
                    className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer shadow-xs ${
                      selectedApplicant.status === 'REJECTED'
                        ? 'bg-rose-600 text-white ring-2 ring-rose-400'
                        : 'bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-400 border border-rose-300 dark:border-rose-800 hover:bg-rose-600 hover:text-white'
                    }`}
                  >
                    <X className="w-4 h-4" />
                    불합격
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 pt-1">
                {[
                  { id: 'APPLIED', num: '1', title: '이력서 지원' },
                  { id: 'PERSONALITY_TEST_PENDING', num: '2', title: '인성검사 진행' },
                  { id: 'PERSONALITY_TEST_COMPLETED', num: '3', title: '인성검사 완료' },
                  { id: 'INTERVIEW_SCHEDULED', num: '4', title: '면접일자 확정' },
                  { id: 'ONBOARDING_SCHEDULED', num: '5', title: '입문교육 일정' },
                ].map((st) => {
                  const isActive = selectedApplicant.status === st.id;
                  return (
                    <button
                      key={st.id}
                      onClick={() => handleUpdateStatus(selectedApplicant.id, st.id)}
                      className={`p-2.5 rounded-xl border text-center transition-all cursor-pointer ${
                        isActive
                          ? 'bg-blue-600 border-blue-600 text-white shadow-md shadow-blue-500/20 font-bold'
                          : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:border-slate-400 text-xs'
                      }`}
                    >
                      <div className="text-[10px] opacity-75">{st.num}단계</div>
                      <div className="text-xs font-bold truncate mt-0.5">{st.title}</div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Resume & Memo Section */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Resume Card */}
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2 text-xs font-bold text-slate-700 dark:text-slate-200">
                    <FileText className="w-4 h-4 text-blue-600" />
                    <span>제출된 이력서</span>
                    {selectedApplicant.resumeUrl && (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-blue-100 dark:bg-blue-900/60 text-blue-700 dark:text-blue-300 truncate max-w-[150px]">
                        {selectedApplicant.resumeUrl}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5">
                    <input
                      ref={detailResumeFileInputRef}
                      type="file"
                      accept=".pdf,.doc,.docx,.hwp,.hwpx,.xlsx,.xls,.png,.jpg,.jpeg,.txt"
                      onChange={handleDetailResumeUpload}
                      className="hidden"
                    />
                    <button
                      type="button"
                      disabled={isDetailResumeUploading}
                      onClick={() => detailResumeFileInputRef.current?.click()}
                      className="px-2.5 py-1 bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-600 flex items-center gap-1 cursor-pointer transition-colors"
                    >
                      <Upload className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                      {isDetailResumeUploading ? '업로드 중...' : '이력서 업로드 / 변경'}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDownloadResume(selectedApplicant)}
                      className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold flex items-center gap-1 shadow-xs cursor-pointer transition-colors"
                    >
                      <Download className="w-3.5 h-3.5" />
                      다운로드
                    </button>
                  </div>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed bg-white dark:bg-slate-900 p-3 rounded-xl border border-slate-200/60 dark:border-slate-800 max-h-36 overflow-y-auto whitespace-pre-line">
                  {selectedApplicant.resumeText || '이력서 파일이 정상 파싱되었거나 등록되어 있습니다.'}
                </p>
              </div>

              {/* Memo Box */}
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-200 flex items-center gap-1.5">
                    <MessageSquare className="w-4 h-4 text-indigo-500" />
                    <span>지원자 메모 (@추천인 기록)</span>
                  </label>
                  <button
                    onClick={handleSaveMemo}
                    className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold"
                  >
                    저장
                  </button>
                </div>
                <textarea
                  value={editingMemo}
                  onChange={(e) => setEditingMemo(e.target.value)}
                  placeholder="예: @김민수 부장님 지인 소개 / 면접 태도 매우 우수함"
                  rows={3}
                  className="w-full p-2.5 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-white focus:outline-blue-600"
                />
              </div>
            </div>

            {/* Workflow Action Steps */}
            <div className="space-y-4">
              {/* 1. Personality Test & Result Upload */}
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
                      className="flex items-center gap-1.5 px-3.5 py-1.5 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded-xl shadow-xs cursor-pointer"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      인성검사 사이트 이동
                    </button>
                    <button
                      onClick={() => setIsPersonalityUploadModalOpen(true)}
                      className="flex items-center gap-1.5 px-3.5 py-1.5 bg-white dark:bg-slate-800 border border-amber-300 dark:border-amber-700 text-amber-800 dark:text-amber-300 text-xs font-bold rounded-xl cursor-pointer"
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

              {/* 2. Interview Scheduling & Kakao/SMS Sharing (문자천사 연동) */}
              <div className="p-5 rounded-2xl bg-purple-50/50 dark:bg-purple-950/20 border border-purple-200 dark:border-purple-800/60 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-5 h-5 text-purple-600" />
                    <div>
                      <h4 className="text-sm font-bold text-purple-900 dark:text-purple-200">
                        면접 일정 확정 및 알림 전송
                      </h4>
                      <p className="text-xs text-purple-700 dark:text-purple-400">
                        면접관 및 지원자에게 카카오톡/문자천사로 확정 알림을 전달합니다.
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleCopyInterviewSMS(selectedApplicant)}
                      className="flex items-center gap-1.5 px-3.5 py-1.5 bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold rounded-xl shadow-xs cursor-pointer"
                    >
                      <Copy className="w-3.5 h-3.5" />
                      문자 복사
                    </button>
                    <button
                      onClick={() => {
                        handleCopyInterviewSMS(selectedApplicant);
                        window.open('https://sharer.kakao.com', '_blank');
                      }}
                      className="flex items-center gap-1.5 px-3.5 py-1.5 bg-[#FEE500] hover:bg-[#FDD835] text-[#191919] text-xs font-bold rounded-xl shadow-xs cursor-pointer"
                    >
                      <Share2 className="w-3.5 h-3.5" />
                      카카오톡 공유
                    </button>
                    <button
                      onClick={() => window.open('https://www.munja1004.co.kr/', '_blank')}
                      className="flex items-center gap-1.5 px-3.5 py-1.5 bg-white dark:bg-slate-800 border border-purple-300 dark:border-purple-700 text-purple-700 dark:text-purple-300 text-xs font-bold rounded-xl cursor-pointer"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      문자천사 열기
                    </button>
                  </div>
                </div>

                <div className="p-3 bg-white dark:bg-slate-900 rounded-xl border border-purple-200/80 text-xs space-y-1 text-slate-700 dark:text-slate-300">
                  <div className="font-bold text-purple-600">[태일씨앤티] 면접 일정 안내</div>
                  <div>일시: {formatInterviewDateTime(selectedApplicant.interviews?.[0]?.scheduledTime)}</div>
                  <div>장소: {selectedApplicant.interviews?.[0]?.location || '태일씨앤티 본사 회의실'}</div>
                  <div>면접관: {selectedApplicant.interviews?.[0]?.interviewers || '김민수 PM, 이지현 팀장'}</div>
                </div>
              </div>

              {/* 3. Onboarding & Munja1004 Integration */}
              <div className="p-5 rounded-2xl bg-rose-50/50 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-800/60 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <MessageSquare className="w-5 h-5 text-rose-600" />
                    <div>
                      <h4 className="text-sm font-bold text-rose-900 dark:text-rose-200">
                        입문교육 일정 안내 (문자천사 연동)
                      </h4>
                      <p className="text-xs text-rose-700 dark:text-rose-400">
                        문자 내용을 복사하여 문자천사(munja1004.co.kr) 사이트에서 바로 발송할 수 있습니다.
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleCopyOnboardingSMS(selectedApplicant)}
                      className="flex items-center gap-1.5 px-3.5 py-1.5 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl shadow-xs cursor-pointer"
                    >
                      <Copy className="w-3.5 h-3.5" />
                      문자 내용 복사
                    </button>
                    <button
                      onClick={() => window.open('https://www.munja1004.co.kr/', '_blank')}
                      className="flex items-center gap-1.5 px-3.5 py-1.5 bg-white dark:bg-slate-800 border border-rose-300 text-rose-700 text-xs font-bold rounded-xl cursor-pointer"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      문자천사 사이트 이동
                    </button>
                  </div>
                </div>

                <div className="p-3 bg-white dark:bg-slate-900 rounded-xl border border-rose-200/80 text-xs space-y-1 text-slate-700 dark:text-slate-300">
                  <div className="font-bold text-rose-600">[태일씨앤티] 입문교육 안내</div>
                  <div>일시: {selectedApplicant.joinDate ? new Date(selectedApplicant.joinDate).toISOString().split('T')[0] : '2026-11-01'} 오전 10:00</div>
                  <div>장소: {selectedApplicant.siteName || (sites[0]?.name ?? '평택 P5 RC공사 2공구')} 현장사무실</div>
                  <div>문의: 010-1234-5678 (인사채용팀)</div>
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
                className="flex items-center gap-1.5 text-xs text-rose-600 hover:text-rose-700 font-bold cursor-pointer"
              >
                <Trash2 className="w-4 h-4" />
                지원자 삭제
              </button>

              <button
                onClick={() => setSelectedApplicant(null)}
                className="px-5 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-bold cursor-pointer"
              >
                닫기
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Personality Test Upload Modal */}
      {isPersonalityUploadModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 max-w-md w-full p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <h3 className="font-bold text-base text-slate-800 dark:text-white flex items-center gap-2">
                <Upload className="w-5 h-5 text-amber-600" />
                인성검사 결과표 등록
              </h3>
              <button onClick={() => setIsPersonalityUploadModalOpen(false)} className="text-slate-400 hover:text-white cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4 text-xs">
              <div>
                <label className="font-bold text-slate-600 dark:text-slate-400 block mb-1">결과표 파일 첨부</label>
                <input
                  ref={personalityFileInputRef}
                  type="file"
                  accept=".pdf,.doc,.docx,.hwp,.hwpx,.xlsx,.xls,.png,.jpg,.jpeg"
                  onChange={(e) => {
                    if (e.target.files && e.target.files[0]) {
                      setPersonalityFile(e.target.files[0].name);
                    }
                  }}
                  className="hidden"
                />

                <div
                  onDragOver={(e) => {
                    e.preventDefault();
                    setIsPersonalityDragging(true);
                  }}
                  onDragLeave={(e) => {
                    e.preventDefault();
                    setIsPersonalityDragging(false);
                  }}
                  onDrop={(e) => {
                    e.preventDefault();
                    setIsPersonalityDragging(false);
                    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                      setPersonalityFile(e.dataTransfer.files[0].name);
                    }
                  }}
                  onClick={() => personalityFileInputRef.current?.click()}
                  className={`border-2 border-dashed rounded-xl p-4 text-center space-y-2 cursor-pointer transition-all ${
                    isPersonalityDragging
                      ? 'border-amber-500 bg-amber-50 dark:bg-amber-950/40'
                      : 'border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800/50'
                  }`}
                >
                  <Upload className="w-6 h-6 text-amber-600 mx-auto" />
                  <p className="font-semibold text-slate-700 dark:text-slate-200">
                    파일을 드래그하거나 아래 버튼을 클릭하세요
                  </p>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      personalityFileInputRef.current?.click();
                    }}
                    className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-bold inline-flex items-center gap-1 cursor-pointer"
                  >
                    <Upload className="w-3 h-3" />
                    파일 선택
                  </button>

                  {personalityFile && (
                    <div
                      onClick={(e) => e.stopPropagation()}
                      className="p-2 bg-white dark:bg-slate-800 rounded-lg border border-amber-200 text-xs flex items-center justify-between mt-2"
                    >
                      <span className="font-bold text-slate-800 dark:text-white truncate">{personalityFile}</span>
                      <button
                        type="button"
                        onClick={() => setPersonalityFile('')}
                        className="text-slate-400 hover:text-rose-500 ml-2"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-600 dark:text-slate-400 block mb-1">
                  열람 비밀번호 (선택 - 보안 잠금용)
                </label>
                <input
                  type="password"
                  placeholder="미입력 시 비밀번호 없이 열람 가능"
                  value={personalityPassword}
                  onChange={(e) => setPersonalityPassword(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-white focus:outline-blue-600"
                />
                <p className="text-[11px] text-slate-400 mt-1">
                  비밀번호를 설정하면 면접평가표 관리 탭에서 비밀번호를 입력해야만 열람할 수 있습니다.
                </p>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  onClick={() => setIsPersonalityUploadModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100"
                >
                  취소
                </button>
                <button
                  onClick={handleSavePersonalityTest}
                  className="px-5 py-2 rounded-xl text-xs font-bold bg-amber-600 hover:bg-amber-700 text-white shadow-md shadow-amber-500/20 cursor-pointer"
                >
                  등록 및 인성검사 완료 처리
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Manual Add Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 max-w-xl w-full p-6 space-y-4 max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <h3 className="font-bold text-base text-slate-800 dark:text-white flex items-center gap-2">
                <Plus className="w-5 h-5 text-blue-600" />
                신규 지원자 수동 등록
              </h3>
              <button
                type="button"
                onClick={() => setIsAddModalOpen(false)}
                className="text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleManualSubmit} className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-600 dark:text-slate-400 block mb-1">지원자 이름 *</label>
                  <input
                    type="text"
                    required
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
                    placeholder="010-0000-0000"
                    value={manualForm.phone}
                    onChange={(e) => setManualForm({ ...manualForm, phone: e.target.value })}
                    className="w-full px-3 py-2 text-sm rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-white focus:outline-blue-600"
                  />
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-600 dark:text-slate-400 block mb-1">이메일 *</label>
                <input
                  type="email"
                  required
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
                    <option value="사람인">사람인</option>
                    <option value="잡코리아">잡코리아</option>
                    <option value="지인 소개">지인 소개</option>
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
                  {sites.length === 0 ? (
                    <option value="">등록된 현장이 없습니다</option>
                  ) : (
                    sites.map((site) => (
                      <option key={site.id} value={site.name}>
                        {site.name}
                      </option>
                    ))
                  )}
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

              {/* 면접관 이름 (입사 예정 일자 바로 아래 위치) */}
              <div>
                <label className="font-bold text-slate-600 dark:text-slate-400 block mb-1">면접관 이름</label>
                <input
                  type="text"
                  placeholder="예: 김민수 PM, 이지현 팀장"
                  value={manualForm.interviewers}
                  onChange={(e) => setManualForm({ ...manualForm, interviewers: e.target.value })}
                  className="w-full px-3 py-2 text-sm rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-white focus:outline-blue-600"
                />
              </div>

              {/* 면접 일시 및 장소 */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-600 dark:text-slate-400 block mb-1">면접 일시</label>
                  <input
                    type="datetime-local"
                    value={manualForm.interviewDate}
                    onChange={(e) => setManualForm({ ...manualForm, interviewDate: e.target.value })}
                    className="w-full px-3 py-2 text-sm rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-white focus:outline-blue-600"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-600 dark:text-slate-400 block mb-1">면접 장소</label>
                  <input
                    type="text"
                    placeholder="예: 태일씨앤티 본사 회의실"
                    value={manualForm.interviewLocation}
                    onChange={(e) => setManualForm({ ...manualForm, interviewLocation: e.target.value })}
                    className="w-full px-3 py-2 text-sm rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-white focus:outline-blue-600"
                  />
                </div>
              </div>

              {/* 이력서 파일 첨부 (수동 등록 시 이력서 업로드 기능) */}
              <div>
                <label className="font-bold text-slate-600 dark:text-slate-400 block mb-1">
                  이력서 파일 첨부
                </label>
                <input
                  ref={manualResumeFileInputRef}
                  type="file"
                  accept=".pdf,.doc,.docx,.hwp,.hwpx,.xlsx,.xls,.png,.jpg,.jpeg,.txt"
                  onChange={(e) => {
                    if (e.target.files && e.target.files[0]) {
                      const f = e.target.files[0];
                      setManualResumeFile(f);
                      setManualResumeFileName(f.name);
                    }
                  }}
                  className="hidden"
                />

                <div
                  onDragOver={(e) => {
                    e.preventDefault();
                    setIsManualResumeDragging(true);
                  }}
                  onDragLeave={() => setIsManualResumeDragging(false)}
                  onDrop={(e) => {
                    e.preventDefault();
                    setIsManualResumeDragging(false);
                    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                      const f = e.dataTransfer.files[0];
                      setManualResumeFile(f);
                      setManualResumeFileName(f.name);
                    }
                  }}
                  onClick={() => manualResumeFileInputRef.current?.click()}
                  className={`border-2 border-dashed rounded-xl p-3.5 text-center cursor-pointer transition-all ${
                    isManualResumeDragging
                      ? 'border-blue-500 bg-blue-50 dark:bg-blue-950/40'
                      : 'border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800/50'
                  }`}
                >
                  {manualResumeFileName ? (
                    <div
                      onClick={(e) => e.stopPropagation()}
                      className="p-2.5 bg-white dark:bg-slate-800 rounded-lg border border-blue-200 dark:border-blue-800 text-xs flex items-center justify-between"
                    >
                      <div className="flex items-center gap-2 text-slate-800 dark:text-white truncate">
                        <FileText className="w-4 h-4 text-blue-600 shrink-0" />
                        <span className="font-bold truncate max-w-[280px]">{manualResumeFileName}</span>
                        {manualResumeFile && (
                          <span className="text-[10px] text-slate-400 shrink-0">
                            ({(manualResumeFile.size / 1024).toFixed(1)} KB)
                          </span>
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setManualResumeFile(null);
                          setManualResumeFileName('');
                          if (manualResumeFileInputRef.current) {
                            manualResumeFileInputRef.current.value = '';
                          }
                        }}
                        className="text-slate-400 hover:text-rose-500 p-1 ml-2 cursor-pointer"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center gap-1 text-slate-500 dark:text-slate-400 py-1">
                      <Upload className="w-5 h-5 text-blue-500" />
                      <p className="font-semibold text-slate-700 dark:text-slate-200 text-xs">
                        이력서 파일을 마우스로 끌어오거나 <span className="text-blue-600 font-bold underline">파일 선택</span>을 클릭하세요
                      </p>
                      <p className="text-[10px] text-slate-400">PDF, Word, HWP, 텍스트 파일 지원</p>
                    </div>
                  )}
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-600 dark:text-slate-400 block mb-1">지원자 메모 (@추천인 등)</label>
                <textarea
                  rows={2}
                  placeholder="예: @김민수 부장님 지인 소개"
                  value={manualForm.memo}
                  onChange={(e) => setManualForm({ ...manualForm, memo: e.target.value })}
                  className="w-full p-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-white focus:outline-blue-600"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 cursor-pointer"
                >
                  취소
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white shadow-md shadow-blue-500/20 cursor-pointer"
                >
                  등록 완료
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
