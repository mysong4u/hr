'use client';

import React, { useState, useEffect } from 'react';
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

export default function EvaluationsView() {
  const [applicants, setApplicants] = useState<Applicant[]>([]);
  const [loading, setLoading] = useState(true);

  // Upload modal state
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [targetApplicantId, setTargetApplicantId] = useState<string>('');
  const [evalFile, setEvalFile] = useState<string>('면접평가표.pdf');
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

  // Auto-lock timer (Page 14: "움직임이 1분 이상 없을 경우 자동 닫힘")
  const [secondsRemaining, setSecondsRemaining] = useState(60);

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
    setSecondsRemaining(60);
    setIsViewModalOpen(true);
  };

  // Verify password
  const handleVerifyPassword = async () => {
    if (!viewingApplicant) return;

    if (!viewingApplicant.interviewEvalPassword && !viewingApplicant.personalityTestPassword) {
      // If no password set, unlock directly
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

  // Submit evaluation upload (Page 16)
  const handleSaveUpload = async () => {
    if (!targetApplicantId) {
      alert('대상 지원자를 선택해주세요.');
      return;
    }
    if (evalPassword && evalPassword !== evalPasswordConfirm) {
      alert('비밀번호와 비밀번호 확인이 일치하지 않습니다.');
      return;
    }

    try {
      const res = await fetch(`/api/applicants/${targetApplicantId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          interviewEvalFile: evalFile,
          interviewEvalPassword: evalPassword || null,
          interviewEvalAuth: selectedAuth,
        }),
      });

      if (res.ok) {
        setIsUploadModalOpen(false);
        setEvalPassword('');
        setEvalPasswordConfirm('');
        fetchApplicants();
        alert('평가표 파일 및 보안 설정이 완료되었습니다.');
      }
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="p-8 space-y-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-slate-800 dark:text-white tracking-tight flex items-center gap-2.5">
            <ShieldCheck className="w-7 h-7 text-blue-600" />
            인성검사 및 면접평가표 보안 관리
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            임의 비밀번호 설정 및 권한 관리를 통해 인가된 인사팀 및 면접관만 평가표를 열람할 수 있습니다.
          </p>
        </div>
        <div>
          <button
            onClick={() => {
              if (applicants.length > 0) {
                setTargetApplicantId(applicants[0].id);
              }
              setIsUploadModalOpen(true);
            }}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs shadow-md shadow-blue-500/20 cursor-pointer"
          >
            <Upload className="w-4 h-4" />
            + 평가표 업로드
          </button>
        </div>
      </div>

      {/* Security Info Banner (Page 14 in PDF) */}
      <div className="p-4 rounded-2xl bg-indigo-50/60 dark:bg-indigo-950/30 border border-indigo-200/80 dark:border-indigo-800 text-xs text-indigo-900 dark:text-indigo-200 flex items-start gap-3 shadow-xs">
        <Lock className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
        <div className="leading-relaxed">
          <span className="font-bold">보안 지침:</span> 인성검사 및 면접평가표는 사내 기밀 정보로 취급됩니다. 비밀번호를
          보유한 권한자만 열람 가능하며, 열람 화면에서 1분 동안 조작이 없을 시 개인정보 보호를 위해 자동으로 창이
          닫힙니다.
        </div>
      </div>

      {/* Evaluations Table (Page 14 in PDF) */}
      <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-600 dark:text-slate-300">
            <thead className="bg-slate-50 dark:bg-slate-800/60 text-[11px] font-bold text-slate-500 uppercase tracking-wider border-b border-slate-200/60 dark:border-slate-800">
              <tr>
                <th className="py-3.5 px-6">No</th>
                <th className="py-3.5 px-6">지원자명</th>
                <th className="py-3.5 px-6">직무</th>
                <th className="py-3.5 px-6">평가표 파일</th>
                <th className="py-3.5 px-6 text-center">비밀번호</th>
                <th className="py-3.5 px-6">열람 권한</th>
                <th className="py-3.5 px-6">등록일</th>
                <th className="py-3.5 px-6 text-center">상태</th>
                <th className="py-3.5 px-6 text-center">관리</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium">
              {applicants.map((app, index) => {
                const hasFile = !!(app.interviewEvalFile || app.personalityTestFile);
                const fileName = app.interviewEvalFile || app.personalityTestFile || '평가표_미등록.pdf';
                const hasPassword = !!(app.interviewEvalPassword || app.personalityTestPassword);

                return (
                  <tr key={app.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors">
                    <td className="py-4 px-6 text-slate-400">{index + 1}</td>
                    <td className="py-4 px-6 font-bold text-slate-800 dark:text-white flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-400 flex items-center justify-center text-[10px] font-bold">
                        {app.name.charAt(0)}
                      </div>
                      {app.name}
                    </td>
                    <td className="py-4 px-6 font-semibold">{app.jobRole || '공사'}</td>
                    <td className="py-4 px-6 text-blue-600 dark:text-blue-400 font-semibold flex items-center gap-1.5">
                      <FileText className="w-3.5 h-3.5" />
                      {fileName}
                    </td>
                    <td className="py-4 px-6 text-center font-mono text-slate-400">
                      {hasPassword ? '••••••••' : '미설정'}
                    </td>
                    <td className="py-4 px-6 text-slate-500 font-medium">{app.interviewEvalAuth || '면접관 + 인사팀'}</td>
                    <td className="py-4 px-6 text-slate-400">
                      {app.createdAt ? new Date(app.createdAt).toISOString().split('T')[0] : '-'}
                    </td>
                    <td className="py-4 px-6 text-center">
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                          hasFile
                            ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 border border-emerald-200'
                            : 'bg-slate-100 text-slate-500'
                        }`}
                      >
                        {hasFile ? '열람 가능' : '미등록'}
                      </span>
                    </td>
                    <td className="py-4 px-6 text-center">
                      <button
                        onClick={() => handleOpenView(app)}
                        className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-100 font-bold text-xs"
                      >
                        보기
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Password Prompt & View Modal (Page 17 & 14 in PDF) */}
      {isViewModalOpen && viewingApplicant && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 max-w-md w-full p-6 space-y-5 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <h3 className="font-black text-base text-slate-800 dark:text-white flex items-center gap-2">
                <Lock className="w-5 h-5 text-blue-600" />
                면접평가표 열람
              </h3>
              <button
                onClick={() => setIsViewModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {!isUnlocked ? (
              <div className="space-y-4 text-xs">
                <p className="text-slate-500 dark:text-slate-400">
                  설정된 비밀번호를 입력하여 <strong>{viewingApplicant.name}</strong> 님의 평가표를 열람할 수 있습니다.
                </p>

                <div className="space-y-1.5">
                  <label className="font-bold text-slate-700 dark:text-slate-300 block">비밀번호를 입력하세요</label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={inputPassword}
                      onChange={(e) => setInputPassword(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleVerifyPassword();
                      }}
                      placeholder="비밀번호 입력"
                      className="w-full pl-3.5 pr-10 py-2.5 text-sm rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-white focus:outline-blue-600"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  {passwordError && <p className="text-rose-500 font-bold mt-1 text-[11px]">{passwordError}</p>}
                </div>

                <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl space-y-1 text-slate-400 text-[11px]">
                  <p className="font-semibold text-slate-600 dark:text-slate-300">• 안내사항</p>
                  <p>• 비밀번호는 업로드 시 설정한 비밀번호입니다.</p>
                  <p>• 허가된 사용자만 열람할 수 있습니다.</p>
                  <p>• 잘못된 비밀번호를 5회 입력할 경우 접근이 제한될 수 있습니다.</p>
                </div>

                <div className="flex justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
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
                    <span className="text-slate-400">면접일자</span>
                    <span className="font-bold text-slate-800 dark:text-white">2026.10.23 (금) 10:00</span>
                  </div>
                  <div className="flex justify-between py-1">
                    <span className="text-slate-400">면접관</span>
                    <span className="font-bold text-slate-800 dark:text-white">김민수 PM, 이지현 팀장, 박준호 이사</span>
                  </div>
                </div>

                <div className="p-4 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 flex items-center justify-between">
                  <div className="flex items-center gap-2.5 font-bold text-slate-700 dark:text-slate-200">
                    <FileText className="w-5 h-5 text-blue-600" />
                    <span>{viewingApplicant.interviewEvalFile || '면접평가표_김지원.pdf'}</span>
                  </div>
                  <button
                    onClick={() => alert('평가표 파일 열람 및 다운로드가 완료되었습니다.')}
                    className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-xs"
                  >
                    평가표 보기
                  </button>
                </div>

                <div className="flex justify-end pt-2 border-t border-slate-100 dark:border-slate-800">
                  <button
                    type="button"
                    onClick={() => setIsViewModalOpen(false)}
                    className="px-5 py-2 rounded-xl text-xs font-bold bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900"
                  >
                    닫기
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Upload Evaluation Sheet Modal (Page 16 in PDF) */}
      {isUploadModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 max-w-lg w-full p-6 space-y-5 animate-in fade-in duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <h3 className="font-bold text-base text-slate-800 dark:text-white">면접평가표 파일 업로드 및 보안 설정</h3>
              <button onClick={() => setIsUploadModalOpen(false)} className="text-slate-400 hover:text-white">
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
                  className="w-full px-3 py-2 text-sm rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-white focus:outline-blue-600"
                >
                  {applicants.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.name} ({a.jobRole || '공사'} / {a.siteName || '현장'})
                    </option>
                  ))}
                </select>
              </div>

              {/* 1. File Upload Dropzone */}
              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">1. 면접평가표 파일</label>
                <div className="border-2 border-dashed border-blue-300 dark:border-blue-700 rounded-2xl p-5 text-center space-y-2 bg-blue-50/20">
                  <FileText className="w-7 h-7 text-blue-600 mx-auto" />
                  <p className="font-semibold text-slate-700 dark:text-slate-200">
                    파일을 드래그하여 업로드하거나 파일 선택 버튼을 클릭하세요
                  </p>
                  <input
                    type="text"
                    value={evalFile}
                    onChange={(e) => setEvalFile(e.target.value)}
                    className="w-full text-center text-xs font-semibold px-3 py-1.5 border rounded-lg bg-white dark:bg-slate-800"
                  />
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
                  비밀번호는 면접평가표를 열람할 때 필요합니다. 반드시 안전한 비밀번호를 설정하세요.
                </p>
              </div>

              {/* 3. Auth Permission configuration */}
              <div className="space-y-1.5 pt-2 border-t border-slate-100 dark:border-slate-800">
                <label className="font-bold text-slate-700 dark:text-slate-300 block">3. 열람 권한 설정</label>
                <select
                  value={selectedAuth}
                  onChange={(e) => setSelectedAuth(e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-white"
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
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100"
                >
                  취소
                </button>
                <button
                  type="button"
                  onClick={handleSaveUpload}
                  className="px-5 py-2 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white shadow-md shadow-blue-500/20"
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
