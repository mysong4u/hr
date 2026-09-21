'use client';

import { useState, useEffect } from 'react';
import {
  Briefcase,
  User,
  Mail,
  Phone,
  Calendar,
  FileText,
  CheckCircle,
  XCircle,
  Clock,
  ArrowRight,
  Search,
  Plus,
  Trash,
  Sparkles,
  RefreshCw,
  Video,
  ChevronRight,
  Send
} from 'lucide-react';

interface Interview {
  id: string;
  applicantId: string;
  interviewers: string;
  scheduledTime: string | null;
  duration: number;
  meetingLink: string | null;
  status: 'PROPOSED' | 'CONFIRMED' | 'COMPLETED' | 'CANCELLED';
  proposedSlots: string | null; // JSON string representing string[]
}

interface Applicant {
  id: string;
  name: string;
  email: string;
  phone: string;
  resumeUrl: string | null;
  resumeText: string | null;
  status: 'APPLIED' | 'SCREENED' | 'INTERVIEW_PROPOSED' | 'INTERVIEW_SCHEDULED' | 'REJECTED' | 'ACCEPTED';
  aiScore: '상' | '중' | '하' | null;
  aiReason: string | null;
  jobId: string;
  createdAt: string;
  updatedAt: string;
  interviews: Interview[];
}

interface Job {
  id: string;
  title: string;
  department: string;
  description: string;
  requirements: string;
  status: 'OPEN' | 'CLOSED';
}

const COLUMNS: { id: Applicant['status']; label: string; bg: string; text: string; border: string }[] = [
  { id: 'APPLIED', label: '지원 완료', bg: 'bg-slate-50 dark:bg-zinc-900', text: 'text-slate-700 dark:text-zinc-300', border: 'border-slate-200 dark:border-zinc-800' },
  { id: 'SCREENED', label: 'AI 검토완료', bg: 'bg-violet-50/50 dark:bg-violet-950/10', text: 'text-violet-700 dark:text-violet-400', border: 'border-violet-100 dark:border-violet-900/30' },
  { id: 'INTERVIEW_PROPOSED', label: '면접 제안', bg: 'bg-amber-50/50 dark:bg-amber-950/10', text: 'text-amber-700 dark:text-amber-400', border: 'border-amber-100 dark:border-amber-900/30' },
  { id: 'INTERVIEW_SCHEDULED', label: '면접 예정', bg: 'bg-emerald-50/50 dark:bg-emerald-950/10', text: 'text-emerald-700 dark:text-emerald-400', border: 'border-emerald-100 dark:border-emerald-900/30' },
  { id: 'ACCEPTED', label: '최종 합격', bg: 'bg-blue-50/50 dark:bg-blue-950/10', text: 'text-blue-700 dark:text-blue-400', border: 'border-blue-100 dark:border-blue-900/30' },
  { id: 'REJECTED', label: '불합격', bg: 'bg-rose-50/50 dark:bg-rose-950/10', text: 'text-rose-700 dark:text-rose-400', border: 'border-rose-100 dark:border-rose-900/30' }
];

export default function Dashboard() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [selectedJobId, setSelectedJobId] = useState<string>('');
  const [applicants, setApplicants] = useState<Applicant[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedApplicant, setSelectedApplicant] = useState<Applicant | null>(null);
  
  // Modals / Dropdowns
  const [activeTab, setActiveTab] = useState<'info' | 'ai' | 'interview' | 'email'>('info');
  const [isNewApplicantModalOpen, setIsNewApplicantModalOpen] = useState(false);
  const [isNewJobModalOpen, setIsNewJobModalOpen] = useState(false);
  
  // Form states
  const [newApplicantForm, setNewApplicantForm] = useState({
    name: '',
    email: '',
    phone: '',
    resumeText: '',
  });

  const [parsingFile, setParsingFile] = useState(false);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setParsingFile(true);
    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await fetch('/api/parse-resume', {
        method: 'POST',
        body: formData,
      });

      if (res.ok) {
        const data = await res.json();
        setNewApplicantForm((prev) => ({
          ...prev,
          resumeText: data.text,
        }));
      } else {
        alert('파일 파싱에 실패했습니다.');
      }
    } catch (err) {
      console.error('File parsing error:', err);
      alert('파일 파싱 중 오류가 발생했습니다.');
    } finally {
      setParsingFile(false);
    }
  };
  
  const [newJobForm, setNewJobForm] = useState({
    title: '',
    department: '',
    description: '',
    requirements: '',
  });

  const [aiAnalyzingId, setAiAnalyzingId] = useState<string | null>(null);
  const [schedulingId, setSchedulingId] = useState<string | null>(null);

  // Load jobs initially
  useEffect(() => {
    async function fetchJobs() {
      try {
        const res = await fetch('/api/jobs');
        const data = await res.json();
        if (Array.isArray(data) && data.length > 0) {
          setJobs(data);
          setSelectedJobId(data[0].id);
        } else {
          setJobs([]);
        }
      } catch (err) {
        console.error('Failed to load jobs', err);
      } finally {
        setLoading(false);
      }
    }
    fetchJobs();
  }, []);

  // Load applicants whenever selectedJobId changes
  useEffect(() => {
    if (!selectedJobId) return;
    
    async function fetchApplicants() {
      setLoading(true);
      try {
        const res = await fetch(`/api/applicants?jobId=${selectedJobId}`);
        const data = await res.json();
        if (Array.isArray(data)) {
          setApplicants(data);
        }
      } catch (err) {
        console.error('Failed to load applicants', err);
      } finally {
        setLoading(false);
      }
    }
    fetchApplicants();
  }, [selectedJobId]);

  // Drag and Drop Handlers
  const handleDragStart = (e: React.DragEvent, id: string) => {
    e.dataTransfer.setData('text/plain', id);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = async (e: React.DragEvent, targetStatus: Applicant['status']) => {
    e.preventDefault();
    const id = e.dataTransfer.getData('text/plain');
    if (!id) return;

    // Find applicant and update locally (Optimistic update)
    const originalApplicants = [...applicants];
    setApplicants((prev) =>
      prev.map((app) => (app.id === id ? { ...app, status: targetStatus } : app))
    );

    try {
      const res = await fetch(`/api/applicants/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: targetStatus }),
      });

      if (!res.ok) {
        throw new Error('Failed to update status');
      }

      const updatedApplicant = await res.json();
      
      // Update with server data
      setApplicants((prev) =>
        prev.map((app) => (app.id === id ? updatedApplicant : app))
      );

      // If currently viewing this applicant in the modal, update modal state
      if (selectedApplicant?.id === id) {
        setSelectedApplicant(updatedApplicant);
      }
    } catch (err) {
      console.error(err);
      // Revert on error
      setApplicants(originalApplicants);
    }
  };

  const handleStatusChange = async (id: string, targetStatus: Applicant['status']) => {
    try {
      const res = await fetch(`/api/applicants/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: targetStatus }),
      });
      if (res.ok) {
        const updatedApplicant = await res.json();
        setApplicants((prev) => prev.map((app) => (app.id === id ? updatedApplicant : app)));
        if (selectedApplicant?.id === id) {
          setSelectedApplicant(updatedApplicant);
        }
      }
    } catch (err) {
      console.error('Failed to change status', err);
    }
  };

  // Create Applicant
  const handleCreateApplicant = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedJobId) return;

    try {
      const res = await fetch('/api/applicants/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...newApplicantForm,
          jobId: selectedJobId,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setApplicants((prev) => [data, ...prev]);
        setIsNewApplicantModalOpen(false);
        setNewApplicantForm({ name: '', email: '', phone: '', resumeText: '' });
      } else {
        alert('지원자 생성에 실패했습니다.');
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Create Job
  const handleCreateJob = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/jobs/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newJobForm),
      });

      if (res.ok) {
        const data = await res.json();
        setJobs((prev) => [data, ...prev]);
        setSelectedJobId(data.id);
        setIsNewJobModalOpen(false);
        setNewJobForm({ title: '', department: '', description: '', requirements: '' });
      } else {
        alert('채용 공고 생성에 실패했습니다.');
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Delete Job
  const handleDeleteJob = async () => {
    if (!selectedJobId) return;

    if (
      !confirm(
        '이 채용 공고를 삭제하면 관련된 모든 지원자 정보와 면접 일정들이 데이터베이스에서 "영구히" 삭제됩니다. 정말 삭제하시겠습니까?'
      )
    ) {
      return;
    }

    try {
      const res = await fetch(`/api/jobs/${selectedJobId}`, {
        method: 'DELETE',
      });

      if (res.ok) {
        const remainingJobs = jobs.filter((job) => job.id !== selectedJobId);
        setJobs(remainingJobs);
        if (remainingJobs.length > 0) {
          setSelectedJobId(remainingJobs[0].id);
        } else {
          setSelectedJobId('');
          setApplicants([]);
        }
        alert('채용 공고가 성공적으로 삭제되었습니다.');
      } else {
        alert('채용 공고 삭제에 실패했습니다.');
      }
    } catch (err) {
      console.error('Failed to delete job:', err);
      alert('삭제 중 오류가 발생했습니다.');
    }
  };

  // Trigger AI Screening (Simulated until Phase 3)
  const triggerAiScreening = async (applicantId: string) => {
    setAiAnalyzingId(applicantId);
    try {
      const res = await fetch('/api/screen', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ applicantId }),
      });
      if (res.ok) {
        const data = await res.json();
        // Update applicants
        setApplicants((prev) => prev.map((app) => (app.id === applicantId ? data : app)));
        if (selectedApplicant?.id === applicantId) {
          setSelectedApplicant(data);
        }
      } else {
        alert('AI 스크리닝 도중 오류가 발생했습니다.');
      }
    } catch (err) {
      console.error(err);
    } finally {
      setAiAnalyzingId(null);
    }
  };

  // Trigger Interview Scheduling Link (Simulated until Phase 4)
  const triggerScheduling = async (applicantId: string, interviewerEmails: string) => {
    setSchedulingId(applicantId);
    try {
      const res = await fetch('/api/schedule/propose', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ applicantId, interviewerEmails }),
      });
      if (res.ok) {
        const data = await res.json();
        setApplicants((prev) => prev.map((app) => (app.id === applicantId ? data : app)));
        if (selectedApplicant?.id === applicantId) {
          setSelectedApplicant(data);
        }
      } else {
        alert('일정 조율 생성 도중 오류가 발생했습니다.');
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSchedulingId(null);
    }
  };

  // Confirm simulated interview slot
  const confirmInterviewSlot = async (applicantId: string, slot: string) => {
    try {
      const res = await fetch('/api/schedule/confirm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ applicantId, slot }),
      });
      if (res.ok) {
        const data = await res.json();
        setApplicants((prev) => prev.map((app) => (app.id === applicantId ? data : app)));
        if (selectedApplicant?.id === applicantId) {
          setSelectedApplicant(data);
        }
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Filter applicants by query
  const filteredApplicants = applicants.filter(
    (app) =>
      app.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      app.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      app.phone.includes(searchQuery)
  );

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 dark:bg-zinc-950 dark:text-zinc-100 font-sans pb-12">
      {/* GNB */}
      <header className="sticky top-0 z-10 border-b border-slate-200 bg-white/80 backdrop-blur-md dark:border-zinc-800 dark:bg-zinc-900/80">
        <div className="mx-auto flex max-w-7xl h-16 items-center justify-between px-6">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600 text-white font-bold text-lg shadow-sm">
              ATS
            </div>
            <div>
              <h1 className="text-lg font-bold tracking-tight text-slate-900 dark:text-white">SmartATS</h1>
              <p className="text-[10px] text-slate-500">AI-Powered Applicant Tracking</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="inline-flex items-center rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-semibold text-blue-700 dark:bg-blue-900/20 dark:text-blue-400 border border-blue-200 dark:border-blue-800/30">
              ● Live Engine Active
            </span>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="mx-auto max-w-7xl px-6 py-8">
        
        {/* Controls Panel */}
        <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-center md:justify-between bg-white dark:bg-zinc-900 p-5 rounded-2xl border border-slate-200 dark:border-zinc-800 shadow-sm">
          
          {/* Job Posting Selector */}
          <div className="flex flex-1 flex-col sm:flex-row sm:items-center gap-3">
            <div className="relative flex-1 max-w-md">
              <label className="block text-xs font-medium text-slate-500 mb-1">채용 공고 선택</label>
              <select
                className="w-full h-11 px-4 rounded-xl border border-slate-200 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-950 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium"
                value={selectedJobId}
                onChange={(e) => setSelectedJobId(e.target.value)}
              >
                {jobs.map((job) => (
                  <option key={job.id} value={job.id}>
                    [{job.department}] {job.title}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex items-end h-full mt-5 sm:mt-0 gap-2">
              <button
                onClick={() => setIsNewJobModalOpen(true)}
                className="h-11 px-4 flex items-center justify-center gap-2 rounded-xl border border-dashed border-slate-300 dark:border-zinc-700 text-slate-600 dark:text-zinc-300 hover:bg-slate-50 dark:hover:bg-zinc-800 text-sm font-medium transition-all"
              >
                <Plus size={16} />
                새 채용공고 등록
              </button>

              <button
                onClick={handleDeleteJob}
                disabled={!selectedJobId}
                className="h-11 px-4 flex items-center justify-center gap-2 rounded-xl border border-rose-200 dark:border-rose-900/30 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/10 disabled:opacity-40 text-sm font-medium transition-all"
                title="선택된 채용 공고 삭제"
              >
                <Trash size={15} />
                삭제
              </button>
            </div>
          </div>

          {/* Search and Action Buttons */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-end gap-3 md:w-auto">
            <div className="relative">
              <label className="block text-xs font-medium text-slate-500 mb-1">지원자 검색</label>
              <div className="relative">
                <Search className="absolute left-3.5 top-3.5 h-4.5 w-4.5 text-slate-400" />
                <input
                  type="text"
                  placeholder="이름, 이메일, 전화번호 검색"
                  className="h-11 w-full sm:w-64 pl-10 pr-4 rounded-xl border border-slate-200 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-950 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
            </div>
            
            <button
              onClick={() => setIsNewApplicantModalOpen(true)}
              className="h-11 px-5 flex items-center justify-center gap-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold shadow-sm transition-all"
            >
              <Plus size={16} />
              지원자 추가
            </button>
          </div>
        </div>

        {/* Selected Job Detail Info */}
        {selectedJobId && jobs.find(j => j.id === selectedJobId) && (
          <div className="mb-6 px-5 py-4 bg-slate-100/50 dark:bg-zinc-900/50 rounded-xl border border-slate-200/60 dark:border-zinc-800/60 text-xs">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <span className="font-semibold text-slate-500">채용 직무 상세: </span>
                <span className="text-slate-700 dark:text-zinc-300">{jobs.find(j => j.id === selectedJobId)?.description}</span>
              </div>
              <div>
                <span className="font-semibold text-slate-500">요구 조건: </span>
                <span className="text-slate-700 dark:text-zinc-300">{jobs.find(j => j.id === selectedJobId)?.requirements}</span>
              </div>
            </div>
          </div>
        )}

        {/* Kanban Board Container */}
        {loading ? (
          <div className="flex h-64 items-center justify-center">
            <div className="flex flex-col items-center gap-2">
              <RefreshCw className="animate-spin text-blue-500" size={32} />
              <p className="text-sm text-slate-500">데이터를 로드하는 중입니다...</p>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4 items-start overflow-x-auto pb-4">
            {COLUMNS.map((col) => {
              const colApplicants = filteredApplicants.filter((app) => app.status === col.id);
              return (
                <div
                  key={col.id}
                  className={`flex flex-col rounded-2xl border ${col.border} ${col.bg} p-4 min-h-[500px] transition-all`}
                  onDragOver={handleDragOver}
                  onDrop={(e) => handleDrop(e, col.id)}
                >
                  {/* Column Header */}
                  <div className="flex items-center justify-between mb-4 border-b border-slate-200/50 dark:border-zinc-800/50 pb-2">
                    <span className={`text-xs font-extrabold ${col.text}`}>{col.label}</span>
                    <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-white dark:bg-zinc-800 text-[10px] font-bold text-slate-500 dark:text-zinc-400 shadow-sm border border-slate-200/50 dark:border-zinc-700/50">
                      {colApplicants.length}
                    </span>
                  </div>

                  {/* Column Body / Draggable Cards */}
                  <div className="flex flex-1 flex-col gap-3">
                    {colApplicants.length === 0 ? (
                      <div className="flex flex-1 flex-col items-center justify-center rounded-xl border border-dashed border-slate-200 dark:border-zinc-800 py-12 px-2 text-center">
                        <p className="text-[10px] text-slate-400">카드를 드래그하여 이동하세요</p>
                      </div>
                    ) : (
                      colApplicants.map((app) => {
                        const hasInterview = app.interviews.length > 0;
                        const mainInterview = app.interviews[0];
                        return (
                          <div
                            key={app.id}
                            draggable
                            onDragStart={(e) => handleDragStart(e, app.id)}
                            onClick={() => {
                              setSelectedApplicant(app);
                              setActiveTab('info');
                            }}
                            className="group relative bg-white dark:bg-zinc-900 border border-slate-200/80 dark:border-zinc-800 rounded-xl p-3.5 hover:border-blue-400 dark:hover:border-blue-500/50 shadow-sm hover:shadow-md cursor-pointer transition-all duration-200 active:scale-[0.98]"
                          >
                            <div className="flex items-start justify-between gap-1 mb-2">
                              <h4 className="text-xs font-bold text-slate-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                                {app.name}
                              </h4>
                              
                              {/* AI Score Badge */}
                              {app.aiScore ? (
                                <span className={`inline-flex items-center rounded px-1.5 py-0.5 text-[9px] font-extrabold shadow-sm ${
                                  app.aiScore === '상'
                                    ? 'bg-emerald-50 dark:bg-emerald-950/20 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/30'
                                    : app.aiScore === '중'
                                    ? 'bg-amber-50 dark:bg-amber-950/20 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800/30'
                                    : 'bg-rose-50 dark:bg-rose-950/20 text-rose-700 dark:text-rose-400 border border-rose-200 dark:border-rose-800/30'
                                }`}>
                                  <Sparkles size={8} className="mr-0.5" />
                                  AI:{app.aiScore}
                                </span>
                              ) : (
                                app.status === 'APPLIED' && (
                                  <span className="inline-flex items-center rounded px-1 py-0.5 text-[8px] font-semibold bg-slate-100 dark:bg-zinc-800 text-slate-500">
                                    미분석
                                  </span>
                                )
                              )}
                            </div>

                            <p className="text-[10px] text-slate-500 mb-2 truncate">{app.email}</p>
                            
                            {/* Date and mini status icon */}
                            <div className="flex items-center justify-between text-[9px] text-slate-400 border-t border-slate-100 dark:border-zinc-800/50 pt-2 mt-2">
                              <span className="flex items-center gap-1">
                                <Calendar size={10} />
                                {new Date(app.createdAt).toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' })}
                              </span>

                              {hasInterview && (
                                <span className="flex items-center gap-1 font-semibold text-blue-600 dark:text-blue-400">
                                  {mainInterview.status === 'CONFIRMED' ? (
                                    <span className="inline-flex items-center text-emerald-600 dark:text-emerald-400">
                                      <Clock size={10} className="mr-0.5" />
                                      확정
                                    </span>
                                  ) : (
                                    <span className="inline-flex items-center text-amber-600 dark:text-amber-400">
                                      <Clock size={10} className="mr-0.5" />
                                      조율중
                                    </span>
                                  )}
                                </span>
                              )}
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* Applicant Details Modal */}
      {selectedApplicant && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 backdrop-blur-sm p-4">
          <div className="relative bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden shadow-2xl">
            
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-zinc-800 px-6 py-4.5 bg-slate-50 dark:bg-zinc-900/60">
              <div>
                <div className="flex items-center gap-3">
                  <h3 className="text-base font-extrabold text-slate-900 dark:text-white">{selectedApplicant.name}</h3>
                  <span className="text-xs text-slate-400">지원자 상세</span>
                  
                  {/* Status Dropdown inside Modal */}
                  <select
                    className="ml-2 text-[10px] h-7 px-2.5 rounded-lg border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 font-bold focus:outline-none"
                    value={selectedApplicant.status}
                    onChange={(e) => handleStatusChange(selectedApplicant.id, e.target.value as Applicant['status'])}
                  >
                    {COLUMNS.map((col) => (
                      <option key={col.id} value={col.id}>
                        {col.label}
                      </option>
                    ))}
                  </select>
                </div>
                <p className="text-[11px] text-slate-500 mt-0.5">{selectedApplicant.email} | {selectedApplicant.phone}</p>
              </div>
              <button
                onClick={() => setSelectedApplicant(null)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 dark:hover:bg-zinc-800 transition-all"
              >
                <XCircle size={22} />
              </button>
            </div>

            {/* Modal Navigation Tabs */}
            <div className="flex border-b border-slate-200 dark:border-zinc-800 px-6 bg-slate-50 dark:bg-zinc-900/40">
              {[
                { id: 'info', label: '기본 정보 & 이력서', icon: FileText },
                { id: 'ai', label: 'AI 스크리닝 분석', icon: Sparkles },
                { id: 'interview', label: '다면 면접 일정', icon: Calendar },
                { id: 'email', label: '합불 메일 통보', icon: Send },
              ].map((tab) => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id as any)}
                    className={`flex items-center gap-1.5 border-b-2 px-4 py-3 text-xs font-bold transition-all ${
                      activeTab === tab.id
                        ? 'border-blue-600 text-blue-600 dark:border-blue-500 dark:text-blue-400'
                        : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-zinc-200'
                    }`}
                  >
                    <Icon size={14} />
                    {tab.label}
                  </button>
                );
              })}
            </div>

            {/* Modal Scrollable Body */}
            <div className="flex-1 overflow-y-auto p-6 text-xs leading-relaxed">
              
              {/* Tab 1: Info & Resume */}
              {activeTab === 'info' && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {/* Left Metadata card */}
                  <div className="space-y-4 md:col-span-1">
                    <div className="p-4 bg-slate-50 dark:bg-zinc-950/40 rounded-xl border border-slate-100 dark:border-zinc-800/80">
                      <h4 className="font-bold text-slate-900 dark:text-white mb-3 flex items-center gap-1.5">
                        <User size={13} className="text-slate-500" />
                        지원 인적사항
                      </h4>
                      <ul className="space-y-2.5 text-[11px]">
                        <li>
                          <span className="text-slate-400 block mb-0.5">이름</span>
                          <span className="font-semibold text-slate-800 dark:text-zinc-200">{selectedApplicant.name}</span>
                        </li>
                        <li>
                          <span className="text-slate-400 block mb-0.5">이메일</span>
                          <span className="font-semibold text-slate-800 dark:text-zinc-200 flex items-center gap-1">
                            <Mail size={11} />
                            {selectedApplicant.email}
                          </span>
                        </li>
                        <li>
                          <span className="text-slate-400 block mb-0.5">연락처</span>
                          <span className="font-semibold text-slate-800 dark:text-zinc-200 flex items-center gap-1">
                            <Phone size={11} />
                            {selectedApplicant.phone}
                          </span>
                        </li>
                        <li>
                          <span className="text-slate-400 block mb-0.5">지원일</span>
                          <span className="font-semibold text-slate-800 dark:text-zinc-200">
                            {new Date(selectedApplicant.createdAt).toLocaleString('ko-KR')}
                          </span>
                        </li>
                      </ul>
                    </div>
                  </div>

                  {/* Right Resume Content */}
                  <div className="md:col-span-2 flex flex-col h-full min-h-[300px]">
                    <h4 className="font-bold text-slate-900 dark:text-white mb-2 flex items-center gap-1.5">
                      <FileText size={14} className="text-blue-500" />
                      추출된 이력서 본문 텍스트
                    </h4>
                    {selectedApplicant.resumeText ? (
                      <div className="flex-1 p-4 bg-slate-900 text-zinc-100 rounded-xl font-mono text-[11px] h-64 overflow-y-auto whitespace-pre-wrap border border-slate-800">
                        {selectedApplicant.resumeText}
                      </div>
                    ) : (
                      <div className="flex-1 flex flex-col items-center justify-center p-8 bg-slate-50 dark:bg-zinc-950/40 border border-dashed border-slate-200 dark:border-zinc-800/80 rounded-xl">
                        <FileText size={32} className="text-slate-300 mb-2" />
                        <p className="text-slate-500 font-medium">파싱된 이력서 텍스트가 없습니다.</p>
                        <p className="text-[10px] text-slate-400 mt-1">PDF/Word 파일 업로드 시 텍스트가 자동 파싱됩니다.</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Tab 2: AI Screening */}
              {activeTab === 'ai' && (
                <div className="space-y-5">
                  <div className="flex items-center justify-between border-b border-slate-100 dark:border-zinc-800/60 pb-3">
                    <div>
                      <h4 className="text-sm font-extrabold text-slate-900 dark:text-white flex items-center gap-1.5">
                        <Sparkles size={15} className="text-violet-500 animate-pulse" />
                        AI 기반 이력서 적합도 심층 평가
                      </h4>
                      <p className="text-[10px] text-slate-500 mt-0.5">이력서 원문 텍스트를 채용요구사항(JD)과 대조하여 LLM이 자동 스크리닝합니다.</p>
                    </div>
                    
                    {!selectedApplicant.aiScore && (
                      <button
                        onClick={() => triggerAiScreening(selectedApplicant.id)}
                        disabled={aiAnalyzingId === selectedApplicant.id}
                        className="px-3.5 py-1.5 flex items-center gap-1.5 rounded-lg bg-violet-600 hover:bg-violet-700 disabled:bg-violet-400 text-white font-semibold shadow-sm transition-all text-[11px]"
                      >
                        {aiAnalyzingId === selectedApplicant.id ? (
                          <>
                            <RefreshCw className="animate-spin" size={12} />
                            AI가 분석하는 중...
                          </>
                        ) : (
                          <>
                            <Sparkles size={12} />
                            AI 스크리닝 자동분석 실행
                          </>
                        )}
                      </button>
                    )}
                  </div>

                  {selectedApplicant.aiScore ? (
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-5">
                      {/* Left score panel */}
                      <div className="p-4 bg-violet-50/50 dark:bg-violet-950/10 rounded-xl border border-violet-100 dark:border-violet-900/20 text-center flex flex-col justify-center items-center">
                        <span className="text-[10px] text-violet-500 font-bold block mb-1">AI 적합도 등급</span>
                        <div className={`h-16 w-16 flex items-center justify-center rounded-full border-4 text-3xl font-black shadow-inner ${
                          selectedApplicant.aiScore === '상'
                            ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border-emerald-300'
                            : selectedApplicant.aiScore === '중'
                            ? 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 border-amber-300'
                            : 'bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-400 border-rose-300'
                        }`}>
                          {selectedApplicant.aiScore}
                        </div>
                        <p className="text-[9px] text-slate-400 mt-2">OpenAI GPT-4o 기반 평가</p>
                      </div>

                      {/* Right analysis panel */}
                      <div className="md:col-span-3 p-4.5 bg-slate-50 dark:bg-zinc-950/40 rounded-xl border border-slate-100 dark:border-zinc-800/80">
                        <h5 className="font-extrabold text-slate-900 dark:text-white mb-2">분석 및 판단 근거</h5>
                        <p className="text-slate-700 dark:text-zinc-300 font-medium whitespace-pre-line text-[11px] leading-5">
                          {selectedApplicant.aiReason}
                        </p>

                        <div className="mt-4 pt-3 border-t border-slate-200/50 dark:border-zinc-800 flex justify-end">
                          <button
                            onClick={() => triggerAiScreening(selectedApplicant.id)}
                            disabled={aiAnalyzingId === selectedApplicant.id}
                            className="flex items-center gap-1.5 text-[10px] text-violet-600 dark:text-violet-400 font-bold hover:underline"
                          >
                            <RefreshCw size={10} className={aiAnalyzingId === selectedApplicant.id ? 'animate-spin' : ''} />
                            결과 재수정 및 재분석
                          </button>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="p-8 text-center bg-slate-50 dark:bg-zinc-950/40 border border-dashed border-slate-200 dark:border-zinc-800/80 rounded-xl">
                      <Sparkles size={32} className="mx-auto text-slate-300 mb-2 animate-bounce" />
                      <h5 className="font-bold text-slate-700 dark:text-zinc-300 mb-1">아직 AI 스크리닝이 수행되지 않았습니다.</h5>
                      <p className="text-[10px] text-slate-400 max-w-sm mx-auto mb-4">
                        상단의 'AI 스크리닝 자동분석 실행' 버튼을 클릭하면, AI가 제출한 이력서를 파싱하여 적합도를 즉시 등급(상/중/하)으로 정량 분석해 드립니다.
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* Tab 3: Interview Scheduling */}
              {activeTab === 'interview' && (
                <div className="space-y-5">
                  <div className="flex items-center justify-between border-b border-slate-100 dark:border-zinc-800/60 pb-3">
                    <div>
                      <h4 className="text-sm font-extrabold text-slate-900 dark:text-white flex items-center gap-1.5">
                        <Calendar size={15} className="text-emerald-500" />
                        다면 면접 일정 자동 조율
                      </h4>
                      <p className="text-[10px] text-slate-500 mt-0.5">면접관들의 구글 캘린더를 실시간 조회하여 지원자와 매핑하고 타임슬롯을 확정합니다.</p>
                    </div>

                    {selectedApplicant.interviews.length === 0 && (
                      <button
                        onClick={() => triggerScheduling(selectedApplicant.id, 'lead-dev@test.com,cto@test.com')}
                        disabled={schedulingId === selectedApplicant.id}
                        className="px-3.5 py-1.5 flex items-center gap-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-400 text-white font-semibold shadow-sm transition-all text-[11px]"
                      >
                        {schedulingId === selectedApplicant.id ? (
                          <>
                            <RefreshCw className="animate-spin" size={12} />
                            캘린더 조회 및 일정 생성 중...
                          </>
                        ) : (
                          <>
                            <Calendar size={12} />
                            면접관 캘린더 연동 및 조율 링크 발송
                          </>
                        )}
                      </button>
                    )}
                  </div>

                  {selectedApplicant.interviews.map((item) => (
                    <div key={item.id} className="p-4 bg-slate-50 dark:bg-zinc-950/40 rounded-xl border border-slate-100 dark:border-zinc-800/80 space-y-4">
                      
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200/50 dark:border-zinc-800 pb-3">
                        <div className="flex items-center gap-2">
                          <span className={`inline-flex items-center rounded-md px-2 py-0.5 text-[10px] font-bold ${
                            item.status === 'CONFIRMED'
                              ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/20 dark:text-emerald-400 border border-emerald-200'
                              : 'bg-amber-50 text-amber-700 dark:bg-amber-950/20 dark:text-amber-400 border border-amber-200'
                          }`}>
                            {item.status === 'CONFIRMED' ? '일정 확정 완료' : '지원자 일정 선택 대기중'}
                          </span>
                          <span className="text-[10px] text-slate-400">면접관: {item.interviewers}</span>
                        </div>
                        {item.meetingLink && (
                          <a
                            href={item.meetingLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-[10px] bg-red-50 text-red-700 hover:underline px-2 py-0.5 rounded border border-red-200 dark:bg-red-950/20 dark:text-red-400"
                          >
                            <Video size={10} />
                            Google Meet 참여하기
                          </a>
                        )}
                      </div>

                      {item.status === 'CONFIRMED' ? (
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 flex items-center justify-center rounded-lg bg-emerald-100 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-400">
                            <CheckCircle size={20} />
                          </div>
                          <div>
                            <p className="font-bold text-slate-800 dark:text-zinc-200 text-[12px]">
                              {new Date(item.scheduledTime!).toLocaleString('ko-KR', {
                                weekday: 'long',
                                year: 'numeric',
                                month: 'long',
                                day: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </p>
                            <p className="text-[10px] text-slate-500">지정된 시간에 맞춰 구글 미트 회의에 참석해 주십시오. (소요: {item.duration}분)</p>
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-3">
                          <div className="p-3 bg-amber-50/50 dark:bg-amber-950/5 border border-amber-100 dark:border-amber-950/30 rounded-lg">
                            <p className="text-[10px] text-amber-800 dark:text-amber-400 font-bold">지원자 시뮬레이션 화면</p>
                            <p className="text-[9px] text-slate-500 mt-0.5">아래는 지원자에게 안내 발송된 일정 제안 화면입니다. 후보자가 빈 시간 중 원하는 타임슬롯을 선택하면 일정이 즉시 연동됩니다.</p>
                          </div>
                          
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-2">
                            {item.proposedSlots && JSON.parse(item.proposedSlots).map((slot: string) => (
                              <button
                                key={slot}
                                onClick={() => confirmInterviewSlot(selectedApplicant.id, slot)}
                                className="p-2 text-left rounded-lg border border-slate-200 hover:border-blue-500 hover:bg-blue-50/30 dark:border-zinc-800 dark:hover:bg-zinc-800 transition-all font-medium flex items-center justify-between group"
                              >
                                <span>
                                  {new Date(slot).toLocaleString('ko-KR', {
                                    month: 'long',
                                    day: 'numeric',
                                    hour: '2-digit',
                                    minute: '2-digit',
                                  })}
                                </span>
                                <ChevronRight size={12} className="text-slate-400 group-hover:text-blue-500 transition-colors" />
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}

                  {selectedApplicant.interviews.length === 0 && (
                    <div className="p-8 text-center bg-slate-50 dark:bg-zinc-950/40 border border-dashed border-slate-200 dark:border-zinc-800/80 rounded-xl">
                      <Calendar size={32} className="mx-auto text-slate-300 mb-2" />
                      <h5 className="font-bold text-slate-700 dark:text-zinc-300 mb-1">조율 예정인 면접 일정이 없습니다.</h5>
                      <p className="text-[10px] text-slate-400 max-w-sm mx-auto">
                        오른쪽 상단의 '면접관 캘린더 연동 및 조율 링크 발송'을 누르시면, 지정된 실무 면접진의 캘린더 빈 시간들을 실시간 대조하여 겹치지 않는 슬롯을 도출합니다.
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* Tab 4: Email Notification */}
              {activeTab === 'email' && (
                <div className="space-y-4">
                  <div className="border-b border-slate-100 dark:border-zinc-800/60 pb-3">
                    <h4 className="text-sm font-extrabold text-slate-900 dark:text-white flex items-center gap-1.5">
                      <Send size={15} className="text-blue-500" />
                      자동 안내 이메일 발송 트리거
                    </h4>
                    <p className="text-[10px] text-slate-500 mt-0.5">지원자 상태 변화(합격/불합격 등)에 맞춰 발송될 이메일 템플릿의 가상 브리핑 화면입니다.</p>
                  </div>

                  <div className="p-4.5 bg-slate-50 dark:bg-zinc-950/40 rounded-xl border border-slate-200/80 dark:border-zinc-800/80 space-y-4">
                    <div>
                      <span className="font-bold text-slate-400 block mb-1 text-[10px]">수신자</span>
                      <div className="p-2 bg-white dark:bg-zinc-950 border border-slate-100 dark:border-zinc-800 rounded-lg text-[11px] font-semibold text-slate-800 dark:text-zinc-300">
                        {selectedApplicant.name} ({selectedApplicant.email})
                      </div>
                    </div>

                    <div>
                      <span className="font-bold text-slate-400 block mb-1 text-[10px]">메일 유형 및 예상 제목</span>
                      <div className="p-2 bg-white dark:bg-zinc-950 border border-slate-100 dark:border-zinc-800 rounded-lg text-[11px] font-bold text-slate-800 dark:text-zinc-300">
                        {selectedApplicant.status === 'ACCEPTED' ? (
                          <span className="text-blue-600">[SmartATS] 축하드립니다! 최종 합격 안내 메일</span>
                        ) : selectedApplicant.status === 'REJECTED' ? (
                          <span className="text-rose-600">[SmartATS] 지원해 주셔서 감사합니다. 채용 전형 결과 안내</span>
                        ) : (
                          <span>[SmartATS] 서류 전형 검토 및 전형 상태 변경 알림 ({COLUMNS.find(c => c.id === selectedApplicant.status)?.label})</span>
                        )}
                      </div>
                    </div>

                    <div>
                      <span className="font-bold text-slate-400 block mb-1 text-[10px]">이메일 본문 템플릿</span>
                      <div className="p-4 bg-white dark:bg-zinc-950 border border-slate-100 dark:border-zinc-800 rounded-lg text-[11px] font-mono text-slate-700 dark:text-zinc-300 whitespace-pre-wrap leading-5">
                        {selectedApplicant.status === 'ACCEPTED' ? (
                          `안녕하세요 ${selectedApplicant.name}님,
SmartATS 채용팀입니다.

저희 SmartATS의 채용 전형에 성실히 임해 주셔서 진심으로 감사드립니다.
정밀한 종합 평가 결과, 귀하의 뛰어난 역량이 저희 개발팀의 미래 성장 방향과 부합한다고 판단되어 최종 합격 소식을 전해 드립니다.

합격 후 입사 절차 및 연봉 협상 등 세부 사항 조율을 위해 빠른 시일 내에 연락드릴 예정입니다.

다시 한번 축하드립니다.
SmartATS 채용지원팀 드림.`
                        ) : selectedApplicant.status === 'REJECTED' ? (
                          `안녕하세요 ${selectedApplicant.name}님,
SmartATS 채용팀입니다.

우선 저희 SmartATS 채용에 지원해 주시고 오랜 시간 동안 전형 절차에 성실하게 참여해 주신 점에 대해 깊은 감사 말씀을 드립니다.

귀하께서 제출해 주신 이력서와 포트폴리오를 바탕으로 당사 역량 위원회에서 신중하게 검토를 진행하였습니다. 그러나 아쉽게도 한정된 선발 인원으로 인해 이번 기회에는 더 이상 전형을 진행하지 못하게 되었음을 매우 무겁게 전달해 드립니다.

귀하의 탁월한 역량과 열정이 부족해서가 아니라 단지 당사가 찾고 있는 세부 직무 요건과의 매칭 우선순위에 따른 결정이었음을 넓은 마음으로 양해해 주시면 감사하겠습니다.

비록 이번에는 좋은 인연을 맺지 못했으나, 차후 더 나은 기회로 다시 뵐 수 있기를 진심으로 고대합니다. 귀하의 앞날에 건강과 무궁한 행운이 늘 깃들기를 축하합니다.

SmartATS 채용지원팀 드림.`
                        ) : (
                          `안녕하세요 ${selectedApplicant.name}님,
SmartATS 채용팀입니다.

현재 전형 상태가 [${COLUMNS.find(c => c.id === selectedApplicant.status)?.label}]로 업데이트 되었습니다.
새로운 전형 진행을 위한 안내가 준비되는 대로 즉시 이메일과 전화번호를 통해 추가 연락드리겠습니다.

추가 문의 사항이 있으실 경우 본 이메일로 답변 주십시오.
감사합니다.`
                        )}
                      </div>
                    </div>

                    <div className="flex justify-end pt-2">
                      <button
                        onClick={() => alert('안내 메일이 정상적으로 시뮬레이션 발송되었습니다!')}
                        className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold text-[11px] shadow flex items-center gap-1.5"
                      >
                        <Send size={11} />
                        안내 메일 즉시 발송
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* New Applicant Creation Modal */}
      {isNewApplicantModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl flex flex-col">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-zinc-800 px-6 py-4">
              <h3 className="text-sm font-extrabold text-slate-900 dark:text-white">새 지원자 등록</h3>
              <button
                onClick={() => setIsNewApplicantModalOpen(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <XCircle size={18} />
              </button>
            </div>
            
            <form onSubmit={handleCreateApplicant} className="p-6 space-y-4 text-xs">
              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-zinc-400 mb-1">지원자 이름</label>
                <input
                  type="text"
                  required
                  placeholder="예: 김지원"
                  className="w-full h-10 px-3 rounded-lg border border-slate-200 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-950 text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  value={newApplicantForm.name}
                  onChange={(e) => setNewApplicantForm({ ...newApplicantForm, name: e.target.value })}
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-zinc-400 mb-1">이메일 주소</label>
                <input
                  type="email"
                  required
                  placeholder="예: applicant@test.com"
                  className="w-full h-10 px-3 rounded-lg border border-slate-200 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-950 text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  value={newApplicantForm.email}
                  onChange={(e) => setNewApplicantForm({ ...newApplicantForm, email: e.target.value })}
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-zinc-400 mb-1">전화번호</label>
                <input
                  type="text"
                  required
                  placeholder="예: 010-1234-5678"
                  className="w-full h-10 px-3 rounded-lg border border-slate-200 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-950 text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  value={newApplicantForm.phone}
                  onChange={(e) => setNewApplicantForm({ ...newApplicantForm, phone: e.target.value })}
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-zinc-400 mb-1">이력서 파일 업로드 (PDF / Word)</label>
                <div className="relative border-2 border-dashed border-slate-200 dark:border-zinc-800/80 rounded-lg p-4 bg-slate-50 dark:bg-zinc-950/40 text-center hover:bg-slate-100/50 dark:hover:bg-zinc-800/20 transition-all cursor-pointer">
                  <input
                    type="file"
                    accept=".pdf,.docx,.txt"
                    onChange={handleFileUpload}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    disabled={parsingFile}
                  />
                  <div className="flex flex-col items-center justify-center gap-1">
                    {parsingFile ? (
                      <>
                        <RefreshCw className="animate-spin text-blue-500" size={18} />
                        <span className="font-extrabold text-[10px] text-blue-500">이력서 텍스트 추출 중...</span>
                      </>
                    ) : (
                      <>
                        <FileText className="text-slate-400" size={18} />
                        <span className="font-extrabold text-[10px]">이력서 드래그 혹은 마우스 클릭으로 업로드</span>
                        <span className="text-[8px] text-slate-400">PDF, DOCX, TXT 파일 지원 (업로드 시 하단 텍스트 자동 파싱)</span>
                      </>
                    )}
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-zinc-400 mb-1">이력서 텍스트 본문 (파싱 내용 검토)</label>
                <textarea
                  placeholder="위 드롭 존에 이력서 파일을 업로드하시면 텍스트가 여기에 자동으로 파싱됩니다. 직접 수동 입력 및 편집도 가능합니다."
                  className="w-full h-32 p-3 rounded-lg border border-slate-200 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-950 text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none font-mono"
                  value={newApplicantForm.resumeText}
                  onChange={(e) => setNewApplicantForm({ ...newApplicantForm, resumeText: e.target.value })}
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100 dark:border-zinc-800/80">
                <button
                  type="button"
                  onClick={() => setIsNewApplicantModalOpen(false)}
                  className="h-9 px-4 rounded-lg border border-slate-200 dark:border-zinc-800 hover:bg-slate-50 dark:hover:bg-zinc-800 text-slate-500 dark:text-zinc-300 font-bold"
                >
                  취소
                </button>
                <button
                  type="submit"
                  className="h-9 px-4 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold"
                >
                  지원자 등록 완료
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* New Job Posting Creation Modal */}
      {isNewJobModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl flex flex-col">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-zinc-800 px-6 py-4">
              <h3 className="text-sm font-extrabold text-slate-900 dark:text-white">새 채용 공고 등록</h3>
              <button
                onClick={() => setIsNewJobModalOpen(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <XCircle size={18} />
              </button>
            </div>
            
            <form onSubmit={handleCreateJob} className="p-6 space-y-4 text-xs">
              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-zinc-400 mb-1">채용 부서</label>
                <input
                  type="text"
                  required
                  placeholder="예: 플랫폼 엔지니어링팀"
                  className="w-full h-10 px-3 rounded-lg border border-slate-200 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-950 text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  value={newJobForm.department}
                  onChange={(e) => setNewJobForm({ ...newJobForm, department: e.target.value })}
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-zinc-400 mb-1">공고 명칭(직무)</label>
                <input
                  type="text"
                  required
                  placeholder="예: 시니어 인프라 엔지니어 (SRE)"
                  className="w-full h-10 px-3 rounded-lg border border-slate-200 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-950 text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  value={newJobForm.title}
                  onChange={(e) => setNewJobForm({ ...newJobForm, title: e.target.value })}
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-zinc-400 mb-1">직무 설명 (JD)</label>
                <textarea
                  required
                  placeholder="직무에 관한 설명(수행 업무 등)을 구체적으로 기재해 주십시오."
                  className="w-full h-24 p-3 rounded-lg border border-slate-200 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-950 text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  value={newJobForm.description}
                  onChange={(e) => setNewJobForm({ ...newJobForm, description: e.target.value })}
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-zinc-400 mb-1">요구 조건 & 자격 사항</label>
                <textarea
                  required
                  placeholder="필수 연차, 기술 스택, 우대 사항 등을 기재해 주십시오."
                  className="w-full h-24 p-3 rounded-lg border border-slate-200 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-950 text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  value={newJobForm.requirements}
                  onChange={(e) => setNewJobForm({ ...newJobForm, requirements: e.target.value })}
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100 dark:border-zinc-800/80">
                <button
                  type="button"
                  onClick={() => setIsNewJobModalOpen(false)}
                  className="h-9 px-4 rounded-lg border border-slate-200 dark:border-zinc-800 hover:bg-slate-50 dark:hover:bg-zinc-800 text-slate-500 dark:text-zinc-300 font-bold"
                >
                  취소
                </button>
                <button
                  type="submit"
                  className="h-9 px-4 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold"
                >
                  채용 공고 생성 완료
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
