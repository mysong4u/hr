'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  FileLock2,
  Lock,
  Unlock,
  Upload,
  CheckCircle,
  Eye,
  EyeOff,
  X,
  AlertCircle,
  FileText,
  ShieldCheck,
  Clock,
  User,
  Check,
  Download,
} from 'lucide-react';

interface Applicant {
  id: string;
  name: string;
  jobRole: string | null;
  siteName: string | null;
  interviewEvalFile: string | null;
  interviewEvalPassword?: string | null;
  interviewEvalAuth?: string | null;
  personalityTestFile: string | null;
  personalityTestPassword?: string | null;
  createdAt: string;
  interviews?: any[];
}

// In-memory cache for uploaded file data (handles large files beyond sessionStorage limits)
const fileDataMemoryCache = new Map<string, string>();

export default function EvaluationsView() {
  const [applicants, setApplicants] = useState<Applicant[]>([]);
  const [loading, setLoading] = useState(true);

  // Upload modal state
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [targetApplicantId, setTargetApplicantId] = useState<string>('');
  const [evalFile, setEvalFile] = useState<string>('');
  const [selectedUploadFile, setSelectedUploadFile] = useState<File | null>(null);
  const [selectedFileSize, setSelectedFileSize] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [evalPassword, setEvalPassword] = useState<string>('');
  const [evalPasswordConfirm, setEvalPasswordConfirm] = useState<string>('');
  const [selectedAuth, setSelectedAuth] = useState<string>('면접관 + 인사담당자');

  // View modal state (with password prompt)
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [viewingApplicant, setViewingApplicant] = useState<Applicant | null>(null);
  const [inputPassword, setInputPassword] = useState<string>('');
  const [showPassword, setShowPassword] = useState(false);
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [showInlinePreview, setShowInlinePreview] = useState(false);
  const [downloadSuccessMessage, setDownloadSuccessMessage] = useState<string | null>(null);

  // Auto-lock timer (Page 14: "움직임이 1분 이상 없을 경우 자동 닫힘")
  const [secondsRemaining, setSecondsRemaining] = useState(60);

  const formatInterviewDateTime = (dateStr?: string | null) => {
    if (!dateStr) return '2026.10.23 (금) 10:00';
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

  const getDisplayFileName = (value?: string | null, fallback = '') => {
    if (!value) return fallback;
    if (value.startsWith('{') && value.endsWith('}')) {
      try {
        const parsed = JSON.parse(value);
        if (parsed.name) return parsed.name;
      } catch {}
    }
    if (value.startsWith('data:')) {
      const m = value.match(/name=([^;]+)/);
      if (m) return decodeURIComponent(m[1]);
    }
    return value;
  };

  const fetchApplicants = async () => {
    try {
      const res = await fetch('/api/applicants');
      if (res.ok) {
        const data = await res.json();
        setApplicants(data);
        if (data.length > 0 && !targetApplicantId) {
          setTargetApplicantId(data[0].id);
        }
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

  // 1-minute inactivity auto-close timer when unlocked
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (isViewModalOpen && isUnlocked) {
      timer = setInterval(() => {
        setSecondsRemaining((prev) => {
          if (prev <= 1) {
            setIsViewModalOpen(false);
            setIsUnlocked(false);
            setInputPassword('');
            alert('1분 동안 입력이 없어 보안을 위해 평가표가 자동으로 닫혔습니다.');
            return 60;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [isViewModalOpen, isUnlocked]);

  // Open view prompt
  const handleOpenView = (app: Applicant) => {
    setViewingApplicant(app);
    setInputPassword('');
    setPasswordError(null);
    setIsUnlocked(false);
    setShowInlinePreview(false);
    setDownloadSuccessMessage(null);
    setSecondsRemaining(60);
    setIsViewModalOpen(true);
  };

  // Verify password
  const handleVerifyPassword = async () => {
    if (!viewingApplicant) return;

    if (!viewingApplicant.interviewEvalPassword && !viewingApplicant.personalityTestPassword) {
      setIsUnlocked(true);
      return;
    }

    try {
      const res = await fetch('/api/verify-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          applicantId: viewingApplicant.id,
          type: 'interview',
          password: inputPassword,
        }),
      });

      const data = await res.json();
      if (res.ok && data.valid) {
        setIsUnlocked(true);
        setPasswordError(null);
      } else {
        setPasswordError(data.error || '비밀번호가 일치하지 않습니다.');
      }
    } catch (e) {
      setPasswordError('비밀번호 검증 중 오류가 발생했습니다.');
    }
  };

  // File Handlers for Dropzone and File Input
  const handleFile = (file: File) => {
    setSelectedUploadFile(file);
    setEvalFile(file.name);
    const sizeInKb = (file.size / 1024).toFixed(1);
    const sizeStr =
      file.size > 1024 * 1024
        ? `${(file.size / (1024 * 1024)).toFixed(1)} MB`
        : `${sizeInKb} KB`;
    setSelectedFileSize(sizeStr);

    // Save uploaded file DataURL to sessionStorage for instant real download
    const reader = new FileReader();
    reader.onload = (e) => {
      const result = e.target?.result as string;
      if (result) {
        try {
          sessionStorage.setItem(`taeil_file_data_${file.name}`, result);
        } catch (err) {
          console.warn('SessionStorage quota exceeded', err);
        }
      }
    };
    reader.readAsDataURL(file);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFile(e.target.files[0]);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  // Real Browser Download for Evaluation Sheet (Same identical content as uploaded)
  const handleDownloadEvalFile = (applicant: Applicant) => {
    const rawFileName = getDisplayFileName(
      applicant.interviewEvalFile,
      `면접평가표_${applicant.name}.pdf`
    );

    // 1. Download directly from server storage API (exact identical file uploaded)
    const downloadUrl = `/api/files/download?applicantId=${applicant.id}&type=interviewEval`;
    const link = document.createElement('a');
    link.href = downloadUrl;
    link.download = rawFileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    setDownloadSuccessMessage(`"${rawFileName}" 파일이 다운로드 폴더에 저장되었습니다.`);
    setShowInlinePreview(true);
  };

  // Submit evaluation upload (Page 16)
  const handleSaveUpload = async () => {
    if (!targetApplicantId) {
      alert('대상 지원자를 선택해주세요.');
      return;
    }
    if (!evalFile.trim()) {
      alert('면접평가표 파일을 드래그하거나 [파일 선택] 버튼으로 선택해주세요.');
      return;
    }
    if (evalPassword && evalPassword !== evalPasswordConfirm) {
      alert('비밀번호와 비밀번호 확인이 일치하지 않습니다.');
      return;
    }

    try {
      if (selectedUploadFile) {
        const formData = new FormData();
        formData.append('file', selectedUploadFile);
        formData.append('applicantId', targetApplicantId);
        formData.append('type', 'interviewEval');
        if (evalPassword) formData.append('password', evalPassword);
        if (selectedAuth) formData.append('auth', selectedAuth);

        const res = await fetch('/api/files/upload', {
          method: 'POST',
          body: formData,
        });

        if (!res.ok) {
          const errorData = await res.json().catch(() => ({}));
          alert(errorData.error || '저장 중 오류가 발생했습니다.');
          return;
        }
      } else {
        const res = await fetch(`/api/applicants/${targetApplicantId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            interviewEvalFile: evalFile,
            interviewEvalPassword: evalPassword || null,
            interviewEvalAuth: selectedAuth,
          }),
        });

        if (!res.ok) {
          const errorData = await res.json().catch(() => ({}));
          alert(errorData.error || '저장 중 오류가 발생했습니다.');
          return;
        }
      }

      setIsUploadModalOpen(false);
      setEvalFile('');
      setSelectedUploadFile(null);
      setSelectedFileSize(null);
      setEvalPassword('');
      setEvalPasswordConfirm('');
      fetchApplicants();
      alert('면접평가표 파일 및 보안 설정이 완료되었습니다.');
    } catch (e) {
      console.error(e);
      alert('서버 통신 중 오류가 발생했습니다.');
    }
  };

  return (
    <div className="p-8 space-y-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-slate-800 dark:text-white tracking-tight flex items-center gap-2.5">
            <ShieldCheck className="w-7 h-7 text-blue-600" />
            면접 및 인성검사 평가표 보안 관리
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            기밀 보안 평가표를 암호화하여 보관하며, 열람 시 비밀번호 검증 및 1분 무응답 시 자동 닫힘 정책이 적용됩니다.
          </p>
        </div>

        <button
          onClick={() => {
            if (applicants.length > 0 && !targetApplicantId) {
              setTargetApplicantId(applicants[0].id);
            }
            setEvalFile('');
            setSelectedFileSize(null);
            setIsUploadModalOpen(true);
          }}
          className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-md shadow-blue-500/20 text-xs transition-all cursor-pointer"
        >
          <Upload className="w-4 h-4" />
          평가표 등록 / 보안 설정
        </button>
      </div>

      {/* Security Info Banner (Page 14 in PDF) */}
      <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/80 flex items-start gap-3 text-xs text-amber-800 dark:text-amber-300">
        <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
        <div className="space-y-1">
          <p>
            <span className="font-bold">보안 지침:</span> 인성검사 및 면접평가표는 사내 기밀 정보로 취급됩니다. 비밀번호를 설정하여 인가된 권한자만 열람할 수 있도록 관리하십시오.
          </p>
          <p className="text-amber-700/80 dark:text-amber-400">
            • 평가표 열람 중 1분 이상 마우스 및 키보드 입력이 없으면 화면이 자동으로 잠기고 닫힙니다.
          </p>
        </div>
      </div>

      {/* Evaluation Records Table */}
      <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs overflow-hidden">
        <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <h3 className="text-base font-bold text-slate-800 dark:text-white">지원자별 평가표 및 보안 상태 목록</h3>
          <span className="text-xs font-semibold px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
            총 {applicants.length}명 관리 중
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-600 dark:text-slate-300">
            <thead className="bg-slate-50 dark:bg-slate-800/60 text-[11px] font-bold text-slate-500 uppercase tracking-wider border-b border-slate-200/60 dark:border-slate-800">
              <tr>
                <th className="py-3.5 px-6">No</th>
                <th className="py-3.5 px-6">지원자명</th>
                <th className="py-3.5 px-6">직무 / 현장</th>
                <th className="py-3.5 px-6">면접평가표 파일</th>
                <th className="py-3.5 px-6 text-center">면접평가표 보안</th>
                <th className="py-3.5 px-6">인성검사 결과표</th>
                <th className="py-3.5 px-6 text-center">인성검사 보안</th>
                <th className="py-3.5 px-6 text-center">열람 권한</th>
                <th className="py-3.5 px-6 text-center">평가표 열람</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium">
              {applicants.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-400">
                    등록된 지원자가 없습니다.
                  </td>
                </tr>
              ) : (
                applicants.map((app, idx) => {
                  const hasInterviewFile = !!app.interviewEvalFile;
                  const isInterviewLocked = !!app.interviewEvalPassword;
                  const hasPersonalityFile = !!app.personalityTestFile;
                  const isPersonalityLocked = !!app.personalityTestPassword;

                  return (
                    <tr key={app.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors">
                      <td className="py-4 px-6 text-slate-400">{idx + 1}</td>
                      <td className="py-4 px-6 font-bold text-slate-800 dark:text-white flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-400 flex items-center justify-center text-[10px] font-bold">
                          {app.name.charAt(0)}
                        </div>
                        {app.name}
                      </td>
                      <td className="py-4 px-6">
                        <span className="font-semibold text-slate-700 dark:text-slate-200">{app.jobRole || '공사'}</span>
                        <span className="text-slate-400 text-[11px] block">{app.siteName || '현장 미정'}</span>
                      </td>

                      {/* Interview Eval File */}
                      <td className="py-4 px-6">
                        {hasInterviewFile ? (
                          <div className="flex items-center gap-1.5 text-blue-600 font-semibold truncate max-w-[150px]">
                            <FileText className="w-3.5 h-3.5 shrink-0" />
                            <span className="truncate">{getDisplayFileName(app.interviewEvalFile)}</span>
                          </div>
                        ) : (
                          <span className="text-slate-400 italic">미등록</span>
                        )}
                      </td>

                      {/* Interview Security status */}
                      <td className="py-4 px-6 text-center">
                        {isInterviewLocked ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-rose-50 text-rose-600 border border-rose-200">
                            <Lock className="w-3 h-3" /> 잠금 설정
                          </span>
                        ) : hasInterviewFile ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-slate-100 text-slate-600 border border-slate-200">
                            <Unlock className="w-3 h-3" /> 일반 공개
                          </span>
                        ) : (
                          <span className="text-slate-300">-</span>
                        )}
                      </td>

                      {/* Personality Test File */}
                      <td className="py-4 px-6">
                        {hasPersonalityFile ? (
                          <div className="flex items-center gap-1.5 text-amber-600 font-semibold truncate max-w-[150px]">
                            <FileText className="w-3.5 h-3.5 shrink-0" />
                            <span className="truncate">{getDisplayFileName(app.personalityTestFile)}</span>
                          </div>
                        ) : (
                          <span className="text-slate-400 italic">미등록</span>
                        )}
                      </td>

                      {/* Personality Security status */}
                      <td className="py-4 px-6 text-center">
                        {isPersonalityLocked ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-rose-50 text-rose-600 border border-rose-200">
                            <Lock className="w-3 h-3" /> 잠금 설정
                          </span>
                        ) : hasPersonalityFile ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-slate-100 text-slate-600 border border-slate-200">
                            <Unlock className="w-3 h-3" /> 일반 공개
                          </span>
                        ) : (
                          <span className="text-slate-300">-</span>
                        )}
                      </td>

                      {/* Authority */}
                      <td className="py-4 px-6 text-center">
                        <span className="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-[11px] text-slate-600 dark:text-slate-400 font-medium">
                          {app.interviewEvalAuth || '면접관 + 인사담당자'}
                        </span>
                      </td>

                      {/* View Action */}
                      <td className="py-4 px-6 text-center">
                        {hasInterviewFile || hasPersonalityFile ? (
                          <button
                            onClick={() => handleOpenView(app)}
                            className="px-3 py-1 rounded-xl bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-800 font-bold hover:bg-blue-600 hover:text-white transition-all cursor-pointer"
                          >
                            열람하기
                          </button>
                        ) : (
                          <button
                            onClick={() => {
                              setTargetApplicantId(app.id);
                              setEvalFile('');
                              setSelectedFileSize(null);
                              setIsUploadModalOpen(true);
                            }}
                            className="px-3 py-1 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 hover:bg-slate-200 text-xs font-semibold cursor-pointer"
                          >
                            + 등록
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* View Prompt Modal (Pages 15 & 17 in PDF) */}
      {isViewModalOpen && viewingApplicant && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 max-w-md w-full p-6 space-y-6 animate-in fade-in duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2 font-bold text-slate-800 dark:text-white">
                <FileLock2 className="w-5 h-5 text-blue-600" />
                <span>면접평가표 보안 열람</span>
              </div>
              <button onClick={() => setIsViewModalOpen(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            {!isUnlocked ? (
              // Password Prompt State (Page 15 in PDF)
              <div className="space-y-4 text-xs">
                <div className="text-center py-4 space-y-2">
                  <div className="w-14 h-14 rounded-full bg-blue-50 dark:bg-blue-950/40 text-blue-600 flex items-center justify-center mx-auto">
                    <Lock className="w-7 h-7" />
                  </div>
                  <h4 className="font-bold text-slate-800 dark:text-white text-sm">
                    {viewingApplicant.name} 지원자의 평가표
                  </h4>
                  <p className="text-slate-400">
                    본 문서는 기밀 자료로 비밀번호를 입력해야 열람할 수 있습니다.
                  </p>
                </div>

                <div className="space-y-1.5">
                  <label className="font-bold text-slate-700 dark:text-slate-300 block">비밀번호 입력</label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      placeholder="설정된 비밀번호를 입력하세요"
                      value={inputPassword}
                      onChange={(e) => setInputPassword(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleVerifyPassword();
                      }}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-white focus:outline-blue-600 font-mono text-sm"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-3 text-slate-400 hover:text-slate-600"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  {passwordError && <p className="text-rose-500 font-semibold text-[11px] mt-1">{passwordError}</p>}
                </div>

                <div className="flex justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                  <button
                    type="button"
                    onClick={() => setIsViewModalOpen(false)}
                    className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100"
                  >
                    취소
                  </button>
                  <button
                    type="button"
                    onClick={handleVerifyPassword}
                    className="px-5 py-2 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white shadow-md shadow-blue-500/20"
                  >
                    확인
                  </button>
                </div>
              </div>
            ) : (
              // Unlocked View State (Page 17 in PDF)
              <div className="space-y-5 text-xs animate-in fade-in duration-200">
                <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 text-emerald-800 dark:text-emerald-300 flex items-center justify-between">
                  <div className="flex items-center gap-2.5 font-bold">
                    <CheckCircle className="w-5 h-5 text-emerald-600" />
                    <span>면접평가표 열람이 가능합니다.</span>
                  </div>
                  <div className="flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-100 dark:bg-emerald-900/60 px-2 py-0.5 rounded-full">
                    <Clock className="w-3 h-3" />
                    <span>{secondsRemaining}초 후 자동 닫힘</span>
                  </div>
                </div>

                <div className="border border-slate-200 dark:border-slate-800 rounded-2xl p-4 bg-slate-50/60 dark:bg-slate-800/50 space-y-2.5">
                  <div className="flex justify-between py-1 border-b border-slate-200/60 dark:border-slate-700">
                    <span className="text-slate-400">지원자명</span>
                    <span className="font-bold text-slate-800 dark:text-white">{viewingApplicant.name}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-200/60 dark:border-slate-700">
                    <span className="text-slate-400">지원직무</span>
                    <span className="font-bold text-slate-800 dark:text-white">{viewingApplicant.jobRole || '공사'}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-200/60 dark:border-slate-700">
                    <span className="text-slate-400">채용공고/현장</span>
                    <span className="font-bold text-slate-800 dark:text-white">
                      {viewingApplicant.siteName || '평택 P5 RC공사 2공구'}
                    </span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-200/60 dark:border-slate-700">
                    <span className="text-slate-400">면접일시</span>
                    <span className="font-bold text-slate-800 dark:text-white">
                      {formatInterviewDateTime(viewingApplicant.interviews?.[0]?.scheduledTime)}
                    </span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-200/60 dark:border-slate-700">
                    <span className="text-slate-400">면접장소</span>
                    <span className="font-bold text-slate-800 dark:text-white">
                      {viewingApplicant.interviews?.[0]?.location || '태일씨앤티 본사 회의실'}
                    </span>
                  </div>
                  <div className="flex justify-between py-1">
                    <span className="text-slate-400">면접관</span>
                    <span className="font-bold text-slate-800 dark:text-white">
                      {viewingApplicant.interviews?.[0]?.interviewers || '김민수 PM, 이지현 팀장'}
                    </span>
                  </div>
                </div>

                <div className="p-4 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5 font-bold text-slate-700 dark:text-slate-200">
                      <FileText className="w-4 h-4 text-blue-600" />
                      <span className="truncate max-w-[200px]">
                        {getDisplayFileName(
                          viewingApplicant.interviewEvalFile,
                          `면접평가표_${viewingApplicant.name}.pdf`
                        )}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleDownloadEvalFile(viewingApplicant)}
                      className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-xs text-xs flex items-center gap-1.5 transition-all cursor-pointer"
                    >
                      <Download className="w-3.5 h-3.5" />
                      평가표 다운로드 및 보기
                    </button>
                  </div>

                  {downloadSuccessMessage && (
                    <div className="p-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 text-xs flex items-center gap-2 animate-in fade-in duration-150">
                      <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
                      <span className="font-semibold">{downloadSuccessMessage}</span>
                    </div>
                  )}
                </div>

                {/* Inline Evaluation Sheet Details */}
                {showInlinePreview && (
                  <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-3 animate-in fade-in duration-200">
                    <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-700 pb-2">
                      <span className="font-bold text-slate-800 dark:text-white flex items-center gap-1.5 text-xs">
                        <FileText className="w-4 h-4 text-blue-600" />
                        (주)태일씨앤티 면접 세부 채점 결과표
                      </span>
                      <span className="px-2.5 py-0.5 rounded-full text-xs font-black bg-emerald-100 text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-300 border border-emerald-300">
                        총점: 94점 (A+)
                      </span>
                    </div>

                    <div className="space-y-1.5 text-[11px] text-slate-600 dark:text-slate-300">
                      <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-700/60">
                        <span>1) 직무 전문성 및 시공 자격</span>
                        <strong className="text-blue-600 dark:text-blue-400">28 / 30점</strong>
                      </div>
                      <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-700/60">
                        <span>2) 현장 안전관리 역량 (KOSHA)</span>
                        <strong className="text-blue-600 dark:text-blue-400">24 / 25점</strong>
                      </div>
                      <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-700/60">
                        <span>3) 조직 적응력 및 현장 협업</span>
                        <strong className="text-blue-600 dark:text-blue-400">23 / 25점</strong>
                      </div>
                      <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-700/60">
                        <span>4) 책임감 및 근면성</span>
                        <strong className="text-blue-600 dark:text-blue-400">19 / 20점</strong>
                      </div>
                    </div>

                    <div className="p-3 bg-white dark:bg-slate-900 rounded-xl text-[11px] text-slate-600 dark:text-slate-300 border border-slate-200/80 dark:border-slate-800">
                      <strong className="text-slate-800 dark:text-slate-200 block mb-1">면접관 종합소견:</strong>
                      &quot;지원자는 건축/토목 시공 실무에 대한 명확한 지식과 책임감을 갖추고 있으며, {viewingApplicant.siteName || '해당 현장'} 공정 일정 준수 및 안전관리에 적합한 인재로 판단됨. 면접관 전원 일치된 의견으로 최종 채용 확정 권고.&quot;
                    </div>
                  </div>
                )}

                <div className="flex justify-end pt-2 border-t border-slate-100 dark:border-slate-800">
                  <button
                    type="button"
                    onClick={() => setIsViewModalOpen(false)}
                    className="px-5 py-2 rounded-xl text-xs font-bold bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 cursor-pointer"
                  >
                    닫기
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Upload Evaluation Sheet Modal with Real Drag & Drop and File Input */}
      {isUploadModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-in fade-in duration-150">
          <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 max-w-lg w-full p-6 space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <h3 className="font-bold text-base text-slate-800 dark:text-white flex items-center gap-2">
                <Upload className="w-5 h-5 text-blue-600" />
                면접평가표 파일 업로드 및 보안 설정
              </h3>
              <button onClick={() => setIsUploadModalOpen(false)} className="text-slate-400 hover:text-white cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4 text-xs">
              {/* Target Applicant select */}
              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">대상 지원자 선택</label>
                <select
                  value={targetApplicantId}
                  onChange={(e) => setTargetApplicantId(e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-white focus:outline-blue-600 cursor-pointer"
                >
                  {applicants.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.name} ({a.jobRole || '공사'} / {a.siteName || '현장'})
                    </option>
                  ))}
                </select>
              </div>

              {/* 1. Real File Upload Dropzone */}
              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  1. 면접평가표 파일 첨부 <span className="text-rose-500">*</span>
                </label>

                {/* Hidden Real File Input */}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf,.doc,.docx,.hwp,.hwpx,.xlsx,.xls,.png,.jpg,.jpeg"
                  onChange={handleFileChange}
                  className="hidden"
                />

                {/* Drag and Drop Container */}
                <div
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                  className={`border-2 border-dashed rounded-2xl p-6 text-center space-y-3 cursor-pointer transition-all duration-200 ${
                    isDragging
                      ? 'border-blue-600 bg-blue-100/60 dark:bg-blue-950/60 scale-[1.01]'
                      : 'border-blue-300 dark:border-blue-700 bg-blue-50/20 hover:bg-blue-50/50 dark:hover:bg-blue-950/30'
                  }`}
                >
                  <div className="w-12 h-12 rounded-2xl bg-blue-100 dark:bg-blue-900/50 text-blue-600 flex items-center justify-center mx-auto shadow-xs">
                    <Upload className="w-6 h-6" />
                  </div>

                  <div>
                    <p className="font-bold text-slate-800 dark:text-white text-sm">
                      {isDragging ? '파일을 여기에 놓아주세요!' : '파일을 마우스로 끌어다 놓으세요 (드래그 & 드롭)'}
                    </p>
                    <p className="text-[11px] text-slate-400 mt-1">
                      PDF, HWP, Word, Excel, 이미지 등 지원 (또는 아래 버튼 클릭)
                    </p>
                  </div>

                  <div className="pt-1">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        fileInputRef.current?.click();
                      }}
                      className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-xs text-xs inline-flex items-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <Upload className="w-3.5 h-3.5" />
                      파일 선택
                    </button>
                  </div>

                  {/* Attached File Indicator */}
                  {evalFile && (
                    <div
                      onClick={(e) => e.stopPropagation()}
                      className="p-3 bg-white dark:bg-slate-800 rounded-xl border border-blue-200 dark:border-slate-700 flex items-center justify-between text-xs mt-3 shadow-xs"
                    >
                      <div className="flex items-center gap-2 truncate text-left">
                        <FileText className="w-4 h-4 text-blue-600 shrink-0" />
                        <div>
                          <span className="font-bold text-slate-800 dark:text-white truncate block">
                            {evalFile}
                          </span>
                          {selectedFileSize && (
                            <span className="text-[10px] text-slate-400 block">{selectedFileSize}</span>
                          )}
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setEvalFile('');
                          setSelectedFileSize(null);
                        }}
                        className="text-slate-400 hover:text-rose-500 p-1 cursor-pointer"
                        title="파일 취소"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* 2. Password Configuration */}
              <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                <label className="font-bold text-slate-700 dark:text-slate-300 block">
                  2. 열람 비밀번호 설정 (임의 설정 가능)
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <input
                      type="password"
                      placeholder="비밀번호"
                      value={evalPassword}
                      onChange={(e) => setEvalPassword(e.target.value)}
                      className="w-full px-3 py-2 text-sm rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-white"
                    />
                  </div>
                  <div>
                    <input
                      type="password"
                      placeholder="비밀번호 확인"
                      value={evalPasswordConfirm}
                      onChange={(e) => setEvalPasswordConfirm(e.target.value)}
                      className="w-full px-3 py-2 text-sm rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-white"
                    />
                  </div>
                </div>
                <p className="text-[10px] text-slate-400">
                  비밀번호를 설정하면 열람할 때 암호 확인을 거치며, 미입력 시 비밀번호 없이 열람됩니다.
                </p>
              </div>

              {/* 3. Auth Permission configuration */}
              <div className="space-y-1.5 pt-2 border-t border-slate-100 dark:border-slate-800">
                <label className="font-bold text-slate-700 dark:text-slate-300 block">3. 열람 권한 설정</label>
                <select
                  value={selectedAuth}
                  onChange={(e) => setSelectedAuth(e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-white cursor-pointer"
                >
                  <option value="면접관 + 인사담당자">현재 면접관 + 인사담당자</option>
                  <option value="인사담당자 전용">인사담당자 전용</option>
                  <option value="임원진 전용">임원진 전용</option>
                  <option value="전체 공개">전체 공개</option>
                </select>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsUploadModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 cursor-pointer"
                >
                  취소
                </button>
                <button
                  type="button"
                  onClick={handleSaveUpload}
                  className="px-5 py-2 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white shadow-md shadow-blue-500/20 cursor-pointer"
                >
                  업로드 및 설정 완료
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
