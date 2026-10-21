'use client';

import React, { useState, useEffect } from 'react';
import Sidebar, { TabType } from '@/components/Sidebar';
import Header from '@/components/Header';
import DashboardView from '@/components/DashboardView';
import SiteManagementView from '@/components/SiteManagementView';
import ApplicantsView from '@/components/ApplicantsView';
import EvaluationsView from '@/components/EvaluationsView';
import LoginView from '@/components/LoginView';
import UserProfileModal from '@/components/UserProfileModal';
import { Settings, Shield, Building2, Bell, CheckCircle2 } from 'lucide-react';

interface UserData {
  id: string;
  name: string;
  department: string;
  role: string;
}

export default function TaeilATSApp() {
  const [currentTab, setCurrentTab] = useState<TabType>('dashboard');
  const [currentUser, setCurrentUser] = useState<UserData | null>(null);
  const [isInitializing, setIsInitializing] = useState(true);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);

  // Load user session from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem('taeil_user');
      if (saved) {
        setCurrentUser(JSON.parse(saved));
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsInitializing(false);
    }
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('taeil_user');
    setCurrentUser(null);
    setIsProfileModalOpen(false);
  };

  const getTabTitle = (tab: TabType) => {
    switch (tab) {
      case 'dashboard':
        return '종합 채용 및 현장 현황 대시보드';
      case 'applicants':
        return '지원자 관리';
      case 'sites':
        return '현장별 인원 관리';
      case 'evaluations':
        return '면접 및 인성검사 평가표 보안 관리';
      case 'settings':
        return '시스템 환경 설정';
      default:
        return '태일채용시스템';
    }
  };

  // While checking local storage session
  if (isInitializing) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center text-white">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-xs text-slate-400 font-medium">태일채용시스템 불러오는 중...</p>
        </div>
      </div>
    );
  }

  // If not logged in, show Login Screen (Requires Name & Password 1111)
  if (!currentUser) {
    return <LoginView onLoginSuccess={(user) => setCurrentUser(user)} />;
  }

  return (
    <div className="flex h-screen bg-slate-50 dark:bg-slate-950 font-sans text-slate-800 dark:text-slate-100 overflow-hidden">
      {/* Sidebar Navigation */}
      <Sidebar currentTab={currentTab} onSelectTab={(tab) => setCurrentTab(tab)} />

      {/* Main Container */}
      <div className="flex-1 flex flex-col h-screen overflow-hidden">
        {/* Top Header */}
        <Header
          title={getTabTitle(currentTab)}
          currentUser={currentUser}
          onOpenProfileModal={() => setIsProfileModalOpen(true)}
        />

        {/* Scrollable Content View */}
        <main className="flex-1 overflow-y-auto bg-slate-50/50 dark:bg-slate-950/50 pb-16">
          {currentTab === 'dashboard' && <DashboardView />}
          {currentTab === 'applicants' && <ApplicantsView />}
          {currentTab === 'sites' && <SiteManagementView />}
          {currentTab === 'evaluations' && <EvaluationsView />}
          {currentTab === 'settings' && <SettingsView />}
        </main>
      </div>

      {/* User Profile & Allowed Users Management Modal */}
      {isProfileModalOpen && (
        <UserProfileModal
          currentUser={currentUser}
          onClose={() => setIsProfileModalOpen(false)}
          onUpdateCurrentUser={(updated) => setCurrentUser(updated)}
          onLogout={handleLogout}
        />
      )}
    </div>
  );
}

function SettingsView() {
  return (
    <div className="p-8 space-y-6 max-w-4xl mx-auto">
      <div>
        <h2 className="text-2xl font-black text-slate-800 dark:text-white">환경 설정</h2>
        <p className="text-sm text-slate-500 mt-1">태일채용시스템 설정 및 운영 옵션을 관리합니다.</p>
      </div>

      <div className="space-y-4">
        {/* Company Info */}
        <div className="p-6 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-3">
          <div className="flex items-center gap-2.5 font-bold text-slate-800 dark:text-white text-base">
            <Building2 className="w-5 h-5 text-blue-600" />
            <span>기업 및 채용 본부 정보</span>
          </div>
          <div className="grid grid-cols-2 gap-4 text-xs pt-2">
            <div>
              <span className="text-slate-400 block mb-1">회사명</span>
              <input
                type="text"
                disabled
                value="(주)태일씨앤티"
                className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border font-bold text-slate-700 dark:text-slate-200"
              />
            </div>
            <div>
              <span className="text-slate-400 block mb-1">채용 주관 부서</span>
              <input
                type="text"
                disabled
                value="인사채용팀"
                className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border font-bold text-slate-700 dark:text-slate-200"
              />
            </div>
          </div>
        </div>

        {/* SMS / Messenger Integration */}
        <div className="p-6 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-3">
          <div className="flex items-center gap-2.5 font-bold text-slate-800 dark:text-white text-base">
            <Bell className="w-5 h-5 text-indigo-600" />
            <span>외부 서비스 연동 설정</span>
          </div>
          <p className="text-xs text-slate-500">
            문자천사(munja1004.co.kr) 및 카카오 알림톡 바로가기 연동이 활성화되어 있습니다.
          </p>
          <div className="pt-2 flex items-center gap-3 text-xs">
            <span className="px-3 py-1.5 rounded-lg bg-emerald-50 text-emerald-700 font-bold border border-emerald-200 flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4" /> 문자천사(munja1004.co.kr) 연동 정상
            </span>
            <span className="px-3 py-1.5 rounded-lg bg-amber-50 text-amber-700 font-bold border border-amber-200 flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4" /> 카카오톡 공유 연동 정상
            </span>
          </div>
        </div>

        {/* Security Settings */}
        <div className="p-6 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-3">
          <div className="flex items-center gap-2.5 font-bold text-slate-800 dark:text-white text-base">
            <Shield className="w-5 h-5 text-emerald-600" />
            <span>평가표 보안 규정</span>
          </div>
          <p className="text-xs text-slate-500">
            평가표 열람 시 1분 무응답 자동 화면 닫힘 정책이 적용 중입니다.
          </p>
        </div>
      </div>
    </div>
  );
}
