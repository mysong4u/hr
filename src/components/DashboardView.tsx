'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  Building2,
  Users,
  UserCheck,
  TrendingUp,
  Calendar,
  ChevronDown,
  MapPin,
  ArrowUpRight,
  BarChart3,
  PieChart,
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
  createdAt: string | Date;
  requirements: SiteRequirement[];
}

const AVAILABLE_YEARS = ['2025년', '2026년', '2027년', '2028년', '2029년', '2030년'];

const STATUS_OPTIONS: Record<string, string> = {
  '충원완료': 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 border-emerald-200/60',
  '진행중': 'bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-400 border-blue-200/60',
  '공사진행중': 'bg-indigo-50 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-400 border-indigo-200/60',
  '착공준비': 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400 border-amber-200/60',
  '보류': 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border-slate-300/60',
  '공사완료': 'bg-teal-50 text-teal-700 dark:bg-teal-950/40 dark:text-teal-400 border-teal-200/60',
};

export default function DashboardView() {
  const [sites, setSites] = useState<Site[]>([]);
  const [loading, setLoading] = useState(true);

  // Year Selection State (Default: 2026년)
  const [selectedYear, setSelectedYear] = useState('2026년');
  const [isYearDropdownOpen, setIsYearDropdownOpen] = useState(false);
  const yearDropdownRef = useRef<HTMLDivElement>(null);

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

  // Filter sites strictly by the selected registration year (createdAt)
  const selectedYearNumber = parseInt(selectedYear, 10);
  const filteredSites = sites.filter((site) => {
    if (!site.createdAt) return true;
    const siteYear = new Date(site.createdAt).getFullYear();
    return siteYear === selectedYearNumber;
  });

  // Aggregates based on filteredSites for the selected year
  const totalSitesCount = filteredSites.length;
  let totalRequired = 0;
  let totalCurrent = 0;

  // Job role aggregates for filtered sites
  const roleMap: Record<string, { required: number; current: number }> = {};

  filteredSites.forEach((site) => {
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

  // Site fulfillment rates for filtered sites
  let completedCount = 0;
  let inProgressCount = 0;

  filteredSites.forEach((s) => {
    const sReq = s.requirements?.reduce((acc, r) => acc + r.requiredCount, 0) || 0;
    const sCur = s.requirements?.reduce((acc, r) => acc + r.currentCount, 0) || 0;
    if (s.status === '충원완료' || (sReq > 0 && sCur >= sReq)) {
      completedCount++;
    } else {
      inProgressCount++;
    }
  });

  // Maximum scale for site comparison chart
  const maxSiteScale = Math.max(
    30,
    ...filteredSites.map((s) =>
      s.requirements?.reduce((acc, r) => acc + r.requiredCount, 0) || 0
    )
  );

  return (
    <div className="p-8 space-y-8 max-w-7xl mx-auto">
      {/* Title & Description & Year Selector */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-slate-800 dark:text-white tracking-tight">
            종합 채용 및 현장 현황 대시보드
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            등록 연도별로 현장별 필요 인원 및 채용 진행률, 직무별 현황을 시각화 그래프로 한눈에 파악할 수 있습니다.
          </p>
        </div>

        {/* Custom Year Selector Dropdown */}
        <div className="relative" ref={yearDropdownRef}>
          <button
            onClick={() => setIsYearDropdownOpen(!isYearDropdownOpen)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all shadow-xs cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            title="운영 연도 선택"
          >
            <Calendar className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            <span>📅 {selectedYear}</span>
            <ChevronDown
              className={`w-3.5 h-3.5 text-slate-400 transition-transform duration-200 ${
                isYearDropdownOpen ? 'rotate-180' : ''
              }`}
            />
          </button>

          {isYearDropdownOpen && (
            <div className="absolute right-0 mt-2 w-56 bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-800 p-2.5 z-30 animate-in fade-in zoom-in-95 duration-100 space-y-2">
              <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider px-2 py-1 flex items-center justify-between">
                <span>기준 연도 선택</span>
                <span className="text-blue-600 dark:text-blue-400 font-semibold">{selectedYear}</span>
              </div>
              <div className="grid grid-cols-2 gap-1.5">
                {AVAILABLE_YEARS.map((year) => {
                  const isSelected = selectedYear === year;
                  return (
                    <button
                      key={year}
                      onClick={() => {
                        setSelectedYear(year);
                        setIsYearDropdownOpen(false);
                      }}
                      className={`py-2 px-3 rounded-xl text-xs font-bold text-center transition-all cursor-pointer ${
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
              <div className="pt-2 border-t border-slate-100 dark:border-slate-800 text-[11px] text-slate-400 text-center px-1">
                등록일을 기준으로 {selectedYear} 통계가 집계됩니다.
              </div>
            </div>
          )}
        </div>
      </div>

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
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-bold text-slate-800 dark:text-white flex items-center gap-2">
                <PieChart className="w-4 h-4 text-blue-600" />
                현장별 충원율 현황 ({selectedYear})
              </h3>
            </div>
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
            <h3 className="text-base font-bold text-slate-800 dark:text-white flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-blue-600" />
              직무별 필요 인원 현황 ({selectedYear})
            </h3>
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
            {Object.keys(roleMap).length === 0 ? (
              <div className="py-12 text-center text-slate-400 text-xs">
                {selectedYear}에 등록된 직무 인원 데이터가 없습니다.
              </div>
            ) : (
              Object.entries(roleMap).map(([role, val]) => {
                const maxScale = Math.max(40, ...Object.values(roleMap).map((m) => m.required));
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
              })
            )}
          </div>
        </div>
      </div>

      {/* Bottom Section: 현장별 현황 (직무별 필요인원 현황처럼 그래프로 시각화 표현) */}
      <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-slate-100 dark:border-slate-800 pb-4">
          <div>
            <h3 className="text-base font-bold text-slate-800 dark:text-white flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-indigo-600" />
              현장별 필요 인원 및 충원율 비교 현황 그래프
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              각 현장별 총 필요 인원 대비 현재 채용 인원 및 충원율을 그래프로 실시간 비교 분석합니다.
            </p>
          </div>
          <div className="flex items-center gap-4 text-xs shrink-0">
            <span className="flex items-center gap-1.5 text-slate-600 dark:text-slate-400 font-medium">
              <span className="w-3 h-3 rounded-sm bg-blue-600" /> 총 필요 인원
            </span>
            <span className="flex items-center gap-1.5 text-slate-600 dark:text-slate-400 font-medium">
              <span className="w-3 h-3 rounded-sm bg-emerald-500" /> 현재 채용 인원
            </span>
          </div>
        </div>

        {/* Site Comparison Visual Bars */}
        {filteredSites.length === 0 ? (
          <div className="py-16 text-center text-slate-400 text-sm">
            {selectedYear}에 등록된 현장이 없습니다. 상단 연도를 변경하여 다른 연도의 데이터를 확인하세요.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {filteredSites.map((site) => {
              const reqTotal = site.requirements?.reduce((acc, r) => acc + r.requiredCount, 0) || 0;
              const curTotal = site.requirements?.reduce((acc, r) => acc + r.currentCount, 0) || 0;
              const remTotal = Math.max(0, reqTotal - curTotal);
              const rate = reqTotal > 0 ? ((curTotal / reqTotal) * 100).toFixed(1) : '0';
              const isComplete = reqTotal > 0 && curTotal >= reqTotal;

              const reqPct = Math.min(100, (reqTotal / maxSiteScale) * 100);
              const curPct = Math.min(100, (curTotal / maxSiteScale) * 100);

              const currentStatus = site.status || (isComplete ? '충원완료' : '진행중');
              const badgeClass = STATUS_OPTIONS[currentStatus] || 'bg-blue-50 text-blue-700 border-blue-200';

              return (
                <div
                  key={site.id}
                  className="p-5 rounded-2xl bg-slate-50/70 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-800 space-y-4 hover:border-slate-300 dark:hover:border-slate-700 transition-all shadow-xs"
                >
                  {/* Site Header Info */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <Building2 className="w-4 h-4 text-blue-600 shrink-0" />
                        <h4 className="font-bold text-slate-800 dark:text-white text-sm">{site.name}</h4>
                      </div>
                      <div className="flex items-center gap-3 text-xs text-slate-500 dark:text-slate-400">
                        <span className="flex items-center gap-1">
                          <MapPin className="w-3.5 h-3.5 text-slate-400" />
                          {site.location}
                        </span>
                        <span>•</span>
                        <span>담당: {site.pmName}</span>
                      </div>
                    </div>

                    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold border ${badgeClass}`}>
                      {currentStatus}
                    </span>
                  </div>

                  {/* Visual Bar Comparison Chart (직무별 현황과 동일한 스타일) */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-xs font-semibold">
                      <span className="text-slate-500 dark:text-slate-400">채용 진행 현황</span>
                      <div className="flex items-center gap-3">
                        <span className="text-slate-700 dark:text-slate-200">
                          채용 <strong className="text-emerald-600 dark:text-emerald-400">{curTotal}명</strong> / 필요 <strong className="text-slate-800 dark:text-white">{reqTotal}명</strong>
                        </span>
                        <span className="text-rose-500 font-bold">(잔여 {remTotal}명)</span>
                        <span className="w-12 text-right font-black text-blue-600 dark:text-blue-400 text-sm">
                          {rate}%
                        </span>
                      </div>
                    </div>

                    <div className="h-3.5 w-full bg-slate-200/80 dark:bg-slate-700 rounded-full overflow-hidden flex relative">
                      <div
                        className="h-full bg-blue-600/80 rounded-full absolute left-0 top-0 transition-all duration-500"
                        style={{ width: `${reqPct}%` }}
                      />
                      <div
                        className={`h-full rounded-full absolute left-0 top-0 transition-all duration-500 z-10 ${
                          isComplete ? 'bg-emerald-500' : 'bg-emerald-500'
                        }`}
                        style={{ width: `${curPct}%` }}
                      />
                    </div>
                  </div>

                  {/* Micro Breakdown by Job Role inside Site */}
                  <div className="flex flex-wrap gap-2 pt-1 border-t border-slate-200/60 dark:border-slate-800 text-[11px]">
                    {site.requirements?.map((req) => (
                      <span
                        key={req.id || req.jobRole}
                        className="px-2 py-0.5 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 font-medium"
                      >
                        {req.jobRole}: <strong className="text-blue-600 dark:text-blue-400">{req.currentCount}</strong>/{req.requiredCount}명
                      </span>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
