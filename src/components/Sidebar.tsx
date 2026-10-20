'use client';

import React from 'react';
import {
  LayoutDashboard,
  Users,
  GitPullRequest,
  HardHat,
  Calendar,
  FileLock2,
  Settings,
  Sparkles,
} from 'lucide-react';

export type TabType = 'dashboard' | 'applicants' | 'pipeline' | 'sites' | 'interviews' | 'evaluations' | 'settings';

interface SidebarProps {
  currentTab: TabType;
  onSelectTab: (tab: TabType) => void;
}

export default function Sidebar({ currentTab, onSelectTab }: SidebarProps) {
  const menuItems = [
    { id: 'dashboard' as TabType, label: '대시보드', icon: LayoutDashboard },
    { id: 'applicants' as TabType, label: '지원자 관리', icon: Users },
    { id: 'pipeline' as TabType, label: '채용 절차 관리', icon: GitPullRequest },
    { id: 'sites' as TabType, label: '현장별 인원 관리', icon: HardHat },
    { id: 'interviews' as TabType, label: '면접 관리', icon: Calendar },
    { id: 'evaluations' as TabType, label: '면접평가표 관리', icon: FileLock2 },
    { id: 'settings' as TabType, label: '설정', icon: Settings },
  ];

  return (
    <aside className="w-64 bg-[#1E293B] text-slate-200 flex flex-col shrink-0 min-h-screen border-r border-slate-700/50 shadow-xl select-none">
      {/* Brand Header */}
      <div className="p-6 border-b border-slate-700/60 flex items-center space-x-3">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 to-cyan-400 flex items-center justify-center shadow-lg shadow-blue-500/20">
          <Sparkles className="w-6 h-6 text-white" />
        </div>
        <div>
          <div className="text-lg font-black tracking-tight text-white flex items-center gap-1">
            태일<span className="text-cyan-400">채용시스템</span>
          </div>
          <p className="text-[11px] text-slate-400 font-medium">(주)태일씨앤티</p>
        </div>
      </div>

      {/* Navigation List */}
      <nav className="flex-1 py-6 px-3 space-y-1.5">
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onSelectTab(item.id)}
              className={`w-full flex items-center px-4 py-3 rounded-xl text-sm font-semibold transition-all duration-150 ${
                isActive
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
                  : 'text-slate-300 hover:bg-slate-800/80 hover:text-white'
              }`}
            >
              <Icon className={`w-5 h-5 mr-3.5 ${isActive ? 'text-white' : 'text-slate-400'}`} />
              <span>{item.label}</span>
            </button>
          );
        })}
      </nav>

      {/* Footer Info */}
      <div className="p-4 m-3 rounded-xl bg-slate-800/50 border border-slate-700/50 text-xs text-slate-400">
        <div className="flex items-center justify-between font-medium text-slate-300 mb-1">
          <span>2026 하반기 공채</span>
          <span className="inline-block w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
        </div>
        <p className="text-[11px] text-slate-400">실시간 채용 집계 가동 중</p>
      </div>
    </aside>
  );
}
