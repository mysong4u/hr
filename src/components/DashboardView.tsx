'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  Building2,
  Users,
  UserCheck,
  TrendingUp,
  AlertCircle,
  Plus,
  Edit3,
  X,
  CheckCircle2,
  ArrowUpRight,
  Trash2,
  Calendar,
  ChevronDown,
  MapPin,
  User,
  Activity,
  Check,
} from 'lucide-react';

interface SiteRequirement {
  id?: string;
  jobRole: string;
  requiredCount: number;
  currentCount: number;
}

interface Site {
  id: string;
  name: string;
  location: string;
  pmName: string;
  pmContact: string | null;
  status?: string | null;
  requirements: SiteRequirement[];
}

const AVAILABLE_YEARS = ['2025년', '2026년', '2027년', '2028년', '2029년', '2030년'];
const AVAILABLE_HALVES = ['상반기', '하반기', '전체'];

const STATUS_OPTIONS = [
  { value: '진행중', label: '진행중', color: 'bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-400 border-blue-200/60' },
  { value: '충원완료', label: '충원완료', color: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 border-emerald-200/60' },
  { value: '공사진행중', label: '공사진행중', color: 'bg-indigo-50 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-400 border-indigo-200/60' },
  { value: '착공준비', label: '착공준비', color: 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400 border-amber-200/60' },
  { value: '보류', label: '보류', color: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border-slate-300/60' },
  { value: '공사완료', label: '공사완료', color: 'bg-teal-50 text-teal-700 dark:bg-teal-950/40 dark:text-teal-400 border-teal-200/60' },
];

export default function DashboardView() {
  const [sites, setSites] = useState<Site[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSite, setSelectedSite] = useState<Site | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isAddSiteModalOpen, setIsAddSiteModalOpen] = useState(false);

  // Year Selection State (Default: 2026년 하반기)
  const [selectedYear, setSelectedYear] = useState('2026년');
  const [selectedHalf, setSelectedHalf] = useState('하반기');
  const [isYearDropdownOpen, setIsYearDropdownOpen] = useState(false);
  const yearDropdownRef = useRef<HTMLDivElement>(null);

  // Edit Site Form State
  const [editName, setEditName] = useState('');
  const [editLocation, setEditLocation] = useState('');
  const [editPmName, setEditPmName] = useState('');
  const [editStatus, setEditStatus] = useState('진행중');
  const [editRequirements, setEditRequirements] = useState<SiteRequirement[]>([]);
  const [modifiedBy, setModifiedBy] = useState('김민수 PM');
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [saveSuccessNotice, setSaveSuccessNotice] = useState<string | null>(null);

  // New Site form
  const [newSiteForm, setNewSiteForm] = useState({
    name: '',
    location: '',
    pmName: '',
    status: '진행중',
  });

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (yearDropdownRef.current && !yearDropdownRef.current.contains(event.target as Node)) {
        setIsYearDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const fetchSites = async () => {
    try {
      const res = await fetch('/api/sites');
      if (res.ok) {
        const data = await res.json();
        setSites(data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSites();
  }, []);

  // Aggregates
  const totalSitesCount = sites.length;
  let totalRequired = 0;
  let totalCurrent = 0;

  // Job role aggregates
  const roleMap: Record<string, { required: number; current: number }> = {};

  sites.forEach((site) => {
    site.requirements?.forEach((req) => {
      totalRequired += req.requiredCount;
      totalCurrent += req.currentCount;

      if (!roleMap[req.jobRole]) {
        roleMap[req.jobRole] = { required: 0, current: 0 };
      }
      roleMap[req.jobRole].required += req.requiredCount;
      roleMap[req.jobRole].current += req.currentCount;
    });
  });

  const totalRate = totalRequired > 0 ? ((totalCurrent / totalRequired) * 100).toFixed(1) : '0';

  // Site fulfillment rates
  let completedCount = 0;
  let inProgressCount = 0;

  sites.forEach((s) => {
    const sReq = s.requirements?.reduce((acc, r) => acc + r.requiredCount, 0) || 0;
    const sCur = s.requirements?.reduce((acc, r) => acc + r.currentCount, 0) || 0;
    if (s.status === '충원완료' || (sReq > 0 && sCur >= sReq)) {
      completedCount++;
    } else {
      inProgressCount++;
    }
  });

  const handleOpenEdit = (site: Site) => {
    setSelectedSite(site);
    setEditName(site.name);
    setEditLocation(site.location);
    setEditPmName(site.pmName);

    // Initial status: user-defined status or fallback based on fulfillment
    const reqTotal = site.requirements?.reduce((acc, r) => acc + r.requiredCount, 0) || 0;
    const curTotal = site.requirements?.reduce((acc, r) => acc + r.currentCount, 0) || 0;
    const defaultStatus = reqTotal > 0 && curTotal >= reqTotal ? '충원완료' : '진행중';
    setEditStatus(site.status || defaultStatus);

    setModifiedBy(site.pmName || '현장 PM');
    setEditRequirements(
      site.requirements.map((r) => ({
        ...r,
      }))
    );
    setIsEditModalOpen(true);
  };

  const handleSaveEdit = async () => {
    if (!selectedSite) return;
    if (!editName.trim() || !editLocation.trim()) {
      alert('현장명과 위치를 올바르게 입력해주세요.');
      return;
    }

    setIsSaving(true);
    try {
      const res = await fetch('/api/sites', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          siteId: selectedSite.id,
          name: editName.trim(),
          location: editLocation.trim(),
          pmName: editPmName.trim(),
          status: editStatus,
          requirements: editRequirements,
          modifiedBy,
        }),
      });

      if (res.ok) {
        setIsEditModalOpen(false);
        await fetchSites();
        setSaveSuccessNotice(
          `"${editName}" 현장 정보(현장명, 위치, 담당PM, 진행상태, 필요인원)가 성공적으로 저장되었습니다. (수정자: ${modifiedBy} / 방금 전)`
        );
        setTimeout(() => setSaveSuccessNotice(null), 8000);
      } else {
        const errorData = await res.json();
        alert(errorData.error || '저장 중 오류가 발생했습니다.');
      }
    } catch (e) {
      console.error(e);
      alert('저장 중 통신 오류가 발생했습니다.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteSite = async () => {
    if (!selectedSite) return;

    const confirmed = window.confirm(
      `정말 "${selectedSite.name}" 현장을 삭제하시겠습니까?\n\n이 현장의 모든 직무별 인원 요구 및 배치 데이터가 영구적으로 삭제되며 복구할 수 없습니다.`
    );
    if (!confirmed) return;

    setIsDeleting(true);
    try {
      const res = await fetch(`/api/sites?id=${selectedSite.id}`, {
        method: 'DELETE',
      });

      if (res.ok) {
        const deletedName = selectedSite.name;
        setIsEditModalOpen(false);
        setSelectedSite(null);
        await fetchSites();
        setSaveSuccessNotice(`"${deletedName}" 현장이 대시보드에서 성공적으로 삭제되었습니다.`);
        setTimeout(() => setSaveSuccessNotice(null), 8000);
      } else {
        const errorData = await res.json();
        alert(errorData.error || '삭제 중 오류가 발생했습니다.');
      }
    } catch (e) {
      console.error(e);
      alert('현장 삭제 중 통신 오류가 발생했습니다.');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleAddSite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSiteForm.name || !newSiteForm.location) {
      alert('현장명과 위치를 입력해주세요.');
      return;
    }
    try {
      const defaultRoles = [
        { jobRole: '공사', requiredCount: 15, currentCount: 0 },
        { jobRole: '안전', requiredCount: 5, currentCount: 0 },
        { jobRole: '공무', requiredCount: 3, currentCount: 0 },
        { jobRole: '품질', requiredCount: 2, currentCount: 0 },
      ];
      const res = await fetch('/api/sites', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...newSiteForm,
          requirements: defaultRoles,
        }),
      });
      if (res.ok) {
        setIsAddSiteModalOpen(false);
        setNewSiteForm({ name: '', location: '', pmName: '', status: '진행중' });
        fetchSites();
        setSaveSuccessNotice(`신규 현장 "${newSiteForm.name}"이(가) 등록되었습니다.`);
        setTimeout(() => setSaveSuccessNotice(null), 6000);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const getStatusBadge = (site: Site) => {
    const reqTotal = site.requirements?.reduce((acc, r) => acc + r.requiredCount, 0) || 0;
    const curTotal = site.requirements?.reduce((acc, r) => acc + r.currentCount, 0) || 0;
    const isComplete = reqTotal > 0 && curTotal >= reqTotal;
    const currentStatus = site.status || (isComplete ? '충원완료' : '진행중');

    const matched = STATUS_OPTIONS.find((s) => s.value === currentStatus);
    const colorClass = matched
      ? matched.color
      : isComplete
      ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 border-emerald-200/60'
      : 'bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-400 border-blue-200/60';

    return (
      <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold border ${colorClass}`}>
        {currentStatus}
      </span>
    );
  };

  return (
    <div className="p-8 space-y-8 max-w-7xl mx-auto">
      {/* Title & Description */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-slate-800 dark:text-white tracking-tight">현장별 필요인원 관리</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            각 현장별로 필요한 인원을 직무별로 입력하고, 채용 진행 현황을 실시간으로 확인할 수 있습니다.
          </p>
        </div>

        {/* Action Controls: Year Selector & Add Site Button */}
        <div className="flex items-center gap-3">
          {/* Custom Year & Period Selector Dropdown */}
          <div className="relative" ref={yearDropdownRef}>
            <button
              onClick={() => setIsYearDropdownOpen(!isYearDropdownOpen)}
              className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all shadow-xs cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              title="운영 연도 및 기간 선택"
            >
              <Calendar className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              <span>
                {selectedYear} {selectedHalf}
              </span>
              <ChevronDown
                className={`w-3.5 h-3.5 text-slate-400 transition-transform duration-200 ${
                  isYearDropdownOpen ? 'rotate-180' : ''
                }`}
              />
            </button>

            {/* Dropdown Popover */}
            {isYearDropdownOpen && (
              <div className="absolute right-0 mt-2 w-72 bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-800 p-3.5 z-30 animate-in fade-in zoom-in-95 duration-100 space-y-3">
                <div>
                  <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2 px-1 flex items-center justify-between">
                    <span>기준 연도 선택</span>
                    <span className="text-blue-600 dark:text-blue-400 font-semibold">{selectedYear}</span>
                  </div>
                  <div className="grid grid-cols-3 gap-1.5">
                    {AVAILABLE_YEARS.map((year) => {
                      const isSelected = selectedYear === year;
                      return (
                        <button
                          key={year}
                          onClick={() => setSelectedYear(year)}
                          className={`py-2 px-2.5 rounded-xl text-xs font-bold text-center transition-all cursor-pointer ${
                            isSelected
                              ? 'bg-blue-600 text-white shadow-xs shadow-blue-500/30'
                              : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                          }`}
                        >
                          {year}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
                  <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2 px-1 flex items-center justify-between">
                    <span>반기 구분</span>
                    <span className="text-slate-600 dark:text-slate-400 font-semibold">{selectedHalf}</span>
                  </div>
                  <div className="grid grid-cols-3 gap-1.5">
                    {AVAILABLE_HALVES.map((half) => {
                      const isSelected = selectedHalf === half;
                      return (
                        <button
                          key={half}
                          onClick={() => {
                            setSelectedHalf(half);
                            setIsYearDropdownOpen(false);
                          }}
                          className={`py-1.5 px-2 rounded-xl text-xs font-semibold text-center transition-all cursor-pointer ${
                            isSelected
                              ? 'bg-slate-800 dark:bg-slate-100 text-white dark:text-slate-900'
                              : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                          }`}
                        >
                          {half}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-100 dark:border-slate-800 text-[11px] text-slate-400 text-center">
                  선택한 기간의 필요 인원 데이터가 대시보드에 반영됩니다.
                </div>
              </div>
            )}
          </div>

          <button
            onClick={() => setIsAddSiteModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm shadow-md shadow-blue-500/20 transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            현장 추가
          </button>
        </div>
      </div>

      {/* Real-time PM Edit Notification Banner */}
      {saveSuccessNotice && (
        <div className="p-4 rounded-xl bg-sky-50 dark:bg-sky-950/40 border border-sky-200 dark:border-sky-800 flex items-start gap-3 shadow-xs animate-in fade-in duration-200">
          <AlertCircle className="w-5 h-5 text-sky-600 dark:text-sky-400 shrink-0 mt-0.5" />
          <div className="flex-1 text-xs text-sky-800 dark:text-sky-300 font-medium">
            <span className="font-bold mr-1">[실시간 알림]</span>
            {saveSuccessNotice}
          </div>
          <button onClick={() => setSaveSuccessNotice(null)} className="text-sky-500 hover:text-sky-700">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* KPI Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-5">
        <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs flex items-center space-x-4">
          <div className="w-13 h-13 rounded-2xl bg-blue-50 dark:bg-blue-950/40 text-blue-600 flex items-center justify-center shrink-0">
            <Building2 className="w-7 h-7" />
          </div>
          <div>
            <div className="text-xs font-medium text-slate-500 dark:text-slate-400">
              전체 현장 수 ({selectedYear})
            </div>
            <div className="text-2xl font-black text-slate-800 dark:text-white mt-0.5">{totalSitesCount}개</div>
          </div>
        </div>

        <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs flex items-center space-x-4">
          <div className="w-13 h-13 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 flex items-center justify-center shrink-0">
            <Users className="w-7 h-7" />
          </div>
          <div>
            <div className="text-xs font-medium text-slate-500 dark:text-slate-400">총 필요 인원</div>
            <div className="text-2xl font-black text-slate-800 dark:text-white mt-0.5">{totalRequired}명</div>
          </div>
        </div>

        <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs flex items-center space-x-4">
          <div className="w-13 h-13 rounded-2xl bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 flex items-center justify-center shrink-0">
            <UserCheck className="w-7 h-7" />
          </div>
          <div>
            <div className="text-xs font-medium text-slate-500 dark:text-slate-400">현재 채용 인원</div>
            <div className="text-2xl font-black text-slate-800 dark:text-white mt-0.5">{totalCurrent}명</div>
          </div>
        </div>

        <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs flex items-center space-x-4">
          <div className="w-13 h-13 rounded-2xl bg-amber-50 dark:bg-amber-950/40 text-amber-600 flex items-center justify-center shrink-0">
            <TrendingUp className="w-7 h-7" />
          </div>
          <div>
            <div className="text-xs font-medium text-slate-500 dark:text-slate-400">전체 충원율</div>
            <div className="text-2xl font-black text-slate-800 dark:text-white mt-0.5 flex items-baseline gap-1">
              {totalRate}%
              <span className="text-xs font-semibold text-slate-400 font-normal">
                ({totalCurrent}/{totalRequired}명)
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Middle Section: Progress Chart & Job Role Distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Card: Fulfillment Donut Status */}
        <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs flex flex-col justify-between">
          <div>
            <h3 className="text-base font-bold text-slate-800 dark:text-white mb-4">
              현장별 충원율 현황 ({selectedYear} {selectedHalf})
            </h3>
            <div className="flex items-center justify-center py-6">
              <div className="relative w-40 h-40 flex items-center justify-center">
                <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
                  <circle cx="50" cy="50" r="40" className="stroke-slate-100 dark:stroke-slate-800 fill-none" strokeWidth="16" />
                  <circle
                    cx="50"
                    cy="50"
                    r="40"
                    className="stroke-blue-600 fill-none transition-all duration-1000 ease-out"
                    strokeWidth="16"
                    strokeDasharray="251.2"
                    strokeDashoffset={251.2 - (251.2 * Number(totalRate)) / 100}
                    strokeLinecap="round"
                  />
                </svg>
                <div className="absolute flex flex-col items-center">
                  <span className="text-2xl font-black text-slate-800 dark:text-white">{totalRate}%</span>
                  <span className="text-[11px] text-slate-400 font-medium">전체 충원율</span>
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-2.5 pt-4 border-t border-slate-100 dark:border-slate-800 text-xs">
            <div className="flex items-center justify-between text-slate-600 dark:text-slate-400">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                <span>충원 완료</span>
              </div>
              <span className="font-bold text-slate-800 dark:text-slate-200">
                {completedCount}개 ({((completedCount / (totalSitesCount || 1)) * 100).toFixed(1)}%)
              </span>
            </div>
            <div className="flex items-center justify-between text-slate-600 dark:text-slate-400">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-blue-500" />
                <span>진행 중</span>
              </div>
              <span className="font-bold text-slate-800 dark:text-slate-200">
                {inProgressCount}개 ({((inProgressCount / (totalSitesCount || 1)) * 100).toFixed(1)}%)
              </span>
            </div>
          </div>
        </div>

        {/* Right Card: Job Role Breakdown Bars */}
        <div className="lg:col-span-2 p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-base font-bold text-slate-800 dark:text-white">직무별 필요 인원 현황</h3>
            <div className="flex items-center gap-4 text-xs">
              <span className="flex items-center gap-1.5 text-slate-500">
                <span className="w-2.5 h-2.5 rounded-sm bg-blue-600" /> 필요 인원
              </span>
              <span className="flex items-center gap-1.5 text-slate-500">
                <span className="w-2.5 h-2.5 rounded-sm bg-emerald-500" /> 채용 인원
              </span>
            </div>
          </div>

          <div className="space-y-4 pt-2">
            {Object.entries(roleMap).map(([role, val]) => {
              const maxScale = 40;
              const reqPct = Math.min(100, (val.required / maxScale) * 100);
              const curPct = Math.min(100, (val.current / maxScale) * 100);
              const rate = val.required > 0 ? Math.round((val.current / val.required) * 100) : 0;

              return (
                <div key={role} className="space-y-1.5 text-xs">
                  <div className="flex items-center justify-between font-semibold">
                    <span className="text-slate-700 dark:text-slate-200 w-16">{role}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-slate-400">채용 {val.current}명 / 필요 {val.required}명</span>
                      <span className="w-12 text-right font-bold text-blue-600 dark:text-blue-400">{rate}%</span>
                    </div>
                  </div>
                  <div className="h-3 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden flex relative">
                    <div
                      className="h-full bg-blue-600/80 rounded-full absolute left-0 top-0 transition-all duration-500"
                      style={{ width: `${reqPct}%` }}
                    />
                    <div
                      className="h-full bg-emerald-500 rounded-full absolute left-0 top-0 transition-all duration-500 z-10"
                      style={{ width: `${curPct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Bottom Table: Sites List */}
      <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs overflow-hidden">
        <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold text-slate-800 dark:text-white">현장별 현황</h3>
            <p className="text-xs text-slate-400 mt-0.5">상세보기 버튼을 눌러 현장 정보, 진행상태 및 필요인원을 수정하거나 현장을 삭제할 수 있습니다.</p>
          </div>
          <span className="text-xs font-semibold px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
            총 {sites.length}개 현장 운영 중
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-600 dark:text-slate-300">
            <thead className="bg-slate-50 dark:bg-slate-800/60 text-xs font-bold text-slate-500 uppercase tracking-wider border-b border-slate-200/60 dark:border-slate-800">
              <tr>
                <th className="py-3.5 px-6">No</th>
                <th className="py-3.5 px-6">현장명</th>
                <th className="py-3.5 px-6">위치</th>
                <th className="py-3.5 px-6 text-center">담당 PM</th>
                <th className="py-3.5 px-6 text-right">총 필요 인원</th>
                <th className="py-3.5 px-6 text-right">채용 인원</th>
                <th className="py-3.5 px-6 text-right">잔여 인원</th>
                <th className="py-3.5 px-6 text-center min-w-[150px]">충원율</th>
                <th className="py-3.5 px-6 text-center">진행 상태</th>
                <th className="py-3.5 px-6 text-center">관리</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80 font-medium">
              {sites.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-12 text-center text-slate-400 text-sm">
                    등록된 현장이 없습니다. [현장 추가] 버튼을 눌러 새 현장을 등록하세요.
                  </td>
                </tr>
              ) : (
                sites.map((site, index) => {
                  const reqTotal = site.requirements?.reduce((acc, r) => acc + r.requiredCount, 0) || 0;
                  const curTotal = site.requirements?.reduce((acc, r) => acc + r.currentCount, 0) || 0;
                  const remTotal = Math.max(0, reqTotal - curTotal);
                  const rate = reqTotal > 0 ? ((curTotal / reqTotal) * 100).toFixed(1) : '0';
                  const isComplete = reqTotal > 0 && curTotal >= reqTotal;

                  return (
                    <tr key={site.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors">
                      <td className="py-4 px-6 text-slate-400 text-xs">{index + 1}</td>
                      <td className="py-4 px-6 font-bold text-slate-800 dark:text-white">
                        <div className="flex items-center gap-2">
                          <Building2 className="w-4 h-4 text-blue-600 shrink-0" />
                          <span>{site.name}</span>
                        </div>
                      </td>
                      <td className="py-4 px-6 text-slate-500 text-xs">
                        <div className="flex items-center gap-1.5">
                          <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span>{site.location}</span>
                        </div>
                      </td>
                      <td className="py-4 px-6 text-center text-xs font-semibold text-slate-700 dark:text-slate-300">
                        {site.pmName}
                      </td>
                      <td className="py-4 px-6 text-right font-bold text-slate-800 dark:text-white">{reqTotal}명</td>
                      <td className="py-4 px-6 text-right font-bold text-blue-600 dark:text-blue-400">{curTotal}명</td>
                      <td className="py-4 px-6 text-right text-rose-500 font-semibold">{remTotal}명</td>
                      <td className="py-4 px-6">
                        <div className="flex items-center gap-2.5">
                          <div className="flex-1 h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full ${isComplete ? 'bg-emerald-500' : 'bg-blue-600'}`}
                              style={{ width: `${Math.min(100, Number(rate))}%` }}
                            />
                          </div>
                          <span className="text-xs font-bold text-slate-700 dark:text-slate-300 w-12 text-right">
                            {rate}%
                          </span>
                        </div>
                      </td>
                      <td className="py-4 px-6 text-center">
                        {getStatusBadge(site)}
                      </td>
                      <td className="py-4 px-6 text-center">
                        <button
                          onClick={() => handleOpenEdit(site)}
                          className="px-3.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-bold text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/40 hover:border-blue-300 transition-all cursor-pointer shadow-xs"
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

      {/* Detail, Edit & Delete Modal */}
      {isEditModalOpen && selectedSite && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-in fade-in duration-150">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 max-w-2xl w-full p-6 space-y-6 max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
              <div>
                <h3 className="text-lg font-black text-slate-800 dark:text-white flex items-center gap-2">
                  <Building2 className="w-5 h-5 text-blue-600" />
                  현장 상세 및 관리
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  현장명, 위치, 담당PM, 진행상태 및 직무별 인원을 수정하거나 현장을 삭제할 수 있습니다.
                </p>
              </div>
              <button
                onClick={() => setIsEditModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Form Fields: Name, Location, PM, Status */}
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-slate-600 dark:text-slate-300 mb-1 flex items-center gap-1.5">
                    <Building2 className="w-3.5 h-3.5 text-blue-600" /> 현장명 <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    placeholder="현장명을 입력하세요"
                    className="w-full px-3.5 py-2 text-sm rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-white font-medium focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-600 dark:text-slate-300 mb-1 flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-emerald-600" /> 위치(주소) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={editLocation}
                    onChange={(e) => setEditLocation(e.target.value)}
                    placeholder="위치를 입력하세요"
                    className="w-full px-3.5 py-2 text-sm rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-white font-medium focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-600 dark:text-slate-300 mb-1 flex items-center gap-1.5">
                    <User className="w-3.5 h-3.5 text-indigo-600" /> 담당 PM 성함
                  </label>
                  <input
                    type="text"
                    value={editPmName}
                    onChange={(e) => setEditPmName(e.target.value)}
                    placeholder="예: 김민수 PM"
                    className="w-full px-3.5 py-2 text-sm rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-white font-medium focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-600 dark:text-slate-300 mb-1 flex items-center gap-1.5">
                    <Activity className="w-3.5 h-3.5 text-amber-600" /> 진행 상태
                  </label>
                  <select
                    value={editStatus}
                    onChange={(e) => setEditStatus(e.target.value)}
                    className="w-full px-3.5 py-2 text-sm rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-white font-bold focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 focus:outline-none cursor-pointer"
                  >
                    {STATUS_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-500 mb-1 block">수정 작업자 (알림용)</label>
                <input
                  type="text"
                  value={modifiedBy}
                  onChange={(e) => setModifiedBy(e.target.value)}
                  placeholder="예: 김민수 PM"
                  className="w-full px-3.5 py-2 text-sm rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-white font-medium focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 focus:outline-none"
                />
              </div>

              {/* Requirements Table */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                    <Users className="w-3.5 h-3.5 text-blue-600" /> 직무별 필요 인원 및 채용 현황
                  </label>
                  <span className="text-[11px] text-slate-400">숫자를 직접 수정할 수 있습니다</span>
                </div>

                <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 dark:bg-slate-800 text-slate-500 font-bold uppercase">
                      <tr>
                        <th className="py-2.5 px-4">직무</th>
                        <th className="py-2.5 px-4 text-center">필요 인원</th>
                        <th className="py-2.5 px-4 text-center">현재 채용 인원</th>
                        <th className="py-2.5 px-4 text-right">잔여 인원</th>
                        <th className="py-2.5 px-4 text-right">충원율</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium">
                      {editRequirements.map((req, idx) => {
                        const rem = Math.max(0, req.requiredCount - req.currentCount);
                        const rate = req.requiredCount > 0 ? Math.round((req.currentCount / req.requiredCount) * 100) : 0;
                        return (
                          <tr key={req.id || idx}>
                            <td className="py-3 px-4 font-bold text-slate-800 dark:text-white">{req.jobRole}</td>
                            <td className="py-3 px-4 text-center">
                              <input
                                type="number"
                                min="0"
                                value={req.requiredCount}
                                onChange={(e) => {
                                  const val = parseInt(e.target.value) || 0;
                                  const next = [...editRequirements];
                                  next[idx].requiredCount = val;
                                  setEditRequirements(next);
                                }}
                                className="w-16 px-2 py-1 text-center font-bold text-slate-800 dark:text-white bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg focus:outline-blue-600"
                              />
                            </td>
                            <td className="py-3 px-4 text-center">
                              <input
                                type="number"
                                min="0"
                                value={req.currentCount}
                                onChange={(e) => {
                                  const val = parseInt(e.target.value) || 0;
                                  const next = [...editRequirements];
                                  next[idx].currentCount = val;
                                  setEditRequirements(next);
                                }}
                                className="w-16 px-2 py-1 text-center font-bold text-blue-600 dark:text-blue-400 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg focus:outline-blue-600"
                              />
                            </td>
                            <td className="py-3 px-4 text-right font-bold text-rose-500">{rem}명</td>
                            <td className="py-3 px-4 text-right font-bold text-blue-600">{rate}%</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl text-xs text-slate-500 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-amber-500 shrink-0" />
                <span>수정 완료 시 인사팀 대시보드에 실시간 수정 알림이 전송됩니다.</span>
              </div>
            </div>

            {/* Modal Bottom Actions: Delete Button on Left, Cancel & Save on Right */}
            <div className="flex items-center justify-between pt-4 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={handleDeleteSite}
                disabled={isDeleting || isSaving}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 border border-rose-200 dark:border-rose-900 transition-colors cursor-pointer disabled:opacity-50"
              >
                <Trash2 className="w-4 h-4" />
                {isDeleting ? '삭제 중...' : '현장 삭제'}
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  disabled={isDeleting || isSaving}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                >
                  취소
                </button>
                <button
                  type="button"
                  onClick={handleSaveEdit}
                  disabled={isDeleting || isSaving}
                  className="px-5 py-2 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white shadow-md shadow-blue-500/20 cursor-pointer disabled:opacity-50"
                >
                  {isSaving ? '저장 중...' : '저장 및 알림 전송'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add Site Modal */}
      {isAddSiteModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-in fade-in duration-150">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 max-w-md w-full p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <h3 className="font-bold text-base text-slate-800 dark:text-white flex items-center gap-2">
                <Plus className="w-5 h-5 text-blue-600" />
                신규 현장 추가
              </h3>
              <button onClick={() => setIsAddSiteModalOpen(false)} className="text-slate-400 hover:text-white cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddSite} className="space-y-4 text-xs">
              <div>
                <label className="font-bold text-slate-600 dark:text-slate-400 block mb-1">
                  현장명 <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="예: 송도 바이오클러스터 신축공사"
                  value={newSiteForm.name}
                  onChange={(e) => setNewSiteForm({ ...newSiteForm, name: e.target.value })}
                  className="w-full px-3.5 py-2 text-sm rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-white focus:outline-blue-600 font-medium"
                />
              </div>

              <div>
                <label className="font-bold text-slate-600 dark:text-slate-400 block mb-1">
                  위치 <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="예: 인천광역시 연수구"
                  value={newSiteForm.location}
                  onChange={(e) => setNewSiteForm({ ...newSiteForm, location: e.target.value })}
                  className="w-full px-3.5 py-2 text-sm rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-white focus:outline-blue-600 font-medium"
                />
              </div>

              <div>
                <label className="font-bold text-slate-600 dark:text-slate-400 block mb-1">담당 PM 성함</label>
                <input
                  type="text"
                  placeholder="예: 이영준 PM"
                  value={newSiteForm.pmName}
                  onChange={(e) => setNewSiteForm({ ...newSiteForm, pmName: e.target.value })}
                  className="w-full px-3.5 py-2 text-sm rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-white focus:outline-blue-600 font-medium"
                />
              </div>

              <div>
                <label className="font-bold text-slate-600 dark:text-slate-400 block mb-1">진행 상태</label>
                <select
                  value={newSiteForm.status}
                  onChange={(e) => setNewSiteForm({ ...newSiteForm, status: e.target.value })}
                  className="w-full px-3.5 py-2 text-sm rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-white focus:outline-blue-600 font-bold cursor-pointer"
                >
                  {STATUS_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsAddSiteModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 cursor-pointer"
                >
                  취소
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white shadow-md shadow-blue-500/20 cursor-pointer"
                >
                  추가하기
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
