'use client';

import React, { useState, useEffect } from 'react';
import {
  User,
  Users,
  Building,
  Shield,
  Plus,
  Trash2,
  X,
  CheckCircle,
  AlertCircle,
  LogOut,
  Save,
} from 'lucide-react';

interface UserData {
  id: string;
  name: string;
  department: string;
  role: string;
}

interface UserProfileModalProps {
  currentUser: UserData;
  onClose: () => void;
  onUpdateCurrentUser: (user: UserData) => void;
  onLogout: () => void;
}

export default function UserProfileModal({
  currentUser,
  onClose,
  onUpdateCurrentUser,
  onLogout,
}: UserProfileModalProps) {
  // My profile edit state
  const [name, setName] = useState(currentUser.name);
  const [department, setDepartment] = useState(currentUser.department);
  const [role, setRole] = useState(currentUser.role);
  const [savingProfile, setSavingProfile] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  // Registered users state
  const [usersList, setUsersList] = useState<UserData[]>([]);
  const [newUserName, setNewUserName] = useState('');
  const [newUserDept, setNewUserDept] = useState('인사채용팀');
  const [newUserRole, setNewUserRole] = useState('담당자');
  const [addingUser, setAddingUser] = useState(false);

  const fetchUsers = async () => {
    try {
      const res = await fetch('/api/users');
      if (res.ok) {
        const data = await res.json();
        setUsersList(data);
      }
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const showFeedbackMsg = (msg: string) => {
    setFeedback(msg);
    setTimeout(() => setFeedback(null), 4000);
  };

  // Save profile changes
  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      alert('이름을 입력해 주세요.');
      return;
    }

    setSavingProfile(true);
    try {
      const res = await fetch('/api/users', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: currentUser.id,
          name: name.trim(),
          department: department.trim(),
          role: role.trim(),
        }),
      });

      if (res.ok) {
        const updated = await res.json();
        const newObj = {
          id: updated.id,
          name: updated.name,
          department: updated.department,
          role: updated.role,
        };
        localStorage.setItem('taeil_user', JSON.stringify(newObj));
        onUpdateCurrentUser(newObj);
        fetchUsers();
        showFeedbackMsg('사용자 정보가 성공적으로 수정되었습니다.');
      } else {
        const err = await res.json();
        alert(err.error || '수정 중 오류가 발생했습니다.');
      }
    } catch (e) {
      console.error(e);
      alert('네트워크 오류가 발생했습니다.');
    } finally {
      setSavingProfile(false);
    }
  };

  // Add new authorized user
  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUserName.trim()) {
      alert('등록할 사용자 이름을 입력해 주세요.');
      return;
    }

    setAddingUser(true);
    try {
      const res = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newUserName.trim(),
          department: newUserDept.trim(),
          role: newUserRole.trim(),
          password: '1111',
        }),
      });

      if (res.ok) {
        setNewUserName('');
        fetchUsers();
        showFeedbackMsg(
          `'${newUserName.trim()}' 님이 등록되었습니다. 이제 해당 이름과 비밀번호(1111)로 시스템에 진입할 수 있습니다.`
        );
      } else {
        const err = await res.json();
        alert(err.error || '사용자 등록 실패');
      }
    } catch (e) {
      console.error(e);
      alert('네트워크 오류가 발생했습니다.');
    } finally {
      setAddingUser(false);
    }
  };

  // Delete user
  const handleDeleteUser = async (userToDelete: UserData) => {
    if (userToDelete.id === currentUser.id) {
      alert('현재 로그인 중인 계정은 삭제할 수 없습니다.');
      return;
    }
    if (confirm(`'${userToDelete.name}' 사용자를 진입 허용 목록에서 삭제하시겠습니까?`)) {
      try {
        const res = await fetch(`/api/users?id=${userToDelete.id}`, {
          method: 'DELETE',
        });
        if (res.ok) {
          fetchUsers();
          showFeedbackMsg(`'${userToDelete.name}' 사용자가 삭제되었습니다.`);
        }
      } catch (e) {
        console.error(e);
      }
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 max-w-2xl w-full p-8 max-h-[92vh] overflow-y-auto space-y-6 animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-400 flex items-center justify-center font-black text-xl">
              {currentUser.name.charAt(0)}
            </div>
            <div>
              <h3 className="text-xl font-black text-slate-800 dark:text-white">사용자 정보 및 권한 관리</h3>
              <p className="text-xs text-slate-400 mt-0.5">내 정보 수정 및 시스템 진입 허용 사용자 등록</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-white">
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Feedback Alert */}
        {feedback && (
          <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 text-xs font-semibold flex items-center gap-2 animate-in fade-in">
            <CheckCircle className="w-4 h-4 shrink-0" />
            <span>{feedback}</span>
          </div>
        )}

        {/* Section 1: Edit My Profile */}
        <div className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-700 space-y-4">
          <h4 className="text-sm font-bold text-slate-800 dark:text-white flex items-center gap-2">
            <User className="w-4 h-4 text-blue-600" />
            내 프로필 정보 수정
          </h4>

          <form onSubmit={handleSaveProfile} className="space-y-4 text-xs">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="font-bold text-slate-600 dark:text-slate-400 block mb-1">성명 (이름) *</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-white font-bold focus:outline-blue-600"
                />
              </div>

              <div>
                <label className="font-bold text-slate-600 dark:text-slate-400 block mb-1">소속 부서</label>
                <input
                  type="text"
                  value={department}
                  onChange={(e) => setDepartment(e.target.value)}
                  placeholder="예: 인사채용팀"
                  className="w-full px-3 py-2 text-sm rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-white focus:outline-blue-600"
                />
              </div>

              <div>
                <label className="font-bold text-slate-600 dark:text-slate-400 block mb-1">직책 / 역할</label>
                <input
                  type="text"
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  placeholder="예: 담당자"
                  className="w-full px-3 py-2 text-sm rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-white focus:outline-blue-600"
                />
              </div>
            </div>

            <div className="flex justify-end">
              <button
                type="submit"
                disabled={savingProfile}
                className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-xs cursor-pointer disabled:opacity-50"
              >
                <Save className="w-4 h-4" />
                {savingProfile ? '저장 중...' : '프로필 저장'}
              </button>
            </div>
          </form>
        </div>

        {/* Section 2: Manage Allowed Users (진입 허용 사용자 등록) */}
        <div className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-700 space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-bold text-slate-800 dark:text-white flex items-center gap-2">
              <Users className="w-4 h-4 text-emerald-600" />
              시스템 진입 허용 사용자 관리
            </h4>
            <span className="text-[11px] text-slate-400">총 {usersList.length}명 등록됨</span>
          </div>

          <p className="text-xs text-slate-500 leading-relaxed">
            새로운 사용자 이름을 등록하면, 해당 사용자는 초기 비밀번호 <strong>1111</strong>을 입력하여 시스템에
            진입할 수 있습니다.
          </p>

          {/* Add New User Form */}
          <form onSubmit={handleAddUser} className="p-4 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 space-y-3 text-xs">
            <div className="font-bold text-slate-700 dark:text-slate-200 flex items-center gap-1.5">
              <Plus className="w-3.5 h-3.5 text-blue-600" />
              <span>진입 허용 사용자 이름 추가</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-4 gap-2.5">
              <input
                type="text"
                required
                placeholder="사용자 성명 (예: 김민수 PM)"
                value={newUserName}
                onChange={(e) => setNewUserName(e.target.value)}
                className="sm:col-span-2 px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-white focus:outline-blue-600"
              />
              <input
                type="text"
                placeholder="부서 (예: 건설본부)"
                value={newUserDept}
                onChange={(e) => setNewUserDept(e.target.value)}
                className="px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-white focus:outline-blue-600"
              />
              <button
                type="submit"
                disabled={addingUser}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg shadow-xs flex items-center justify-center gap-1 cursor-pointer disabled:opacity-50"
              >
                <Plus className="w-3.5 h-3.5" />
                추가 등록
              </button>
            </div>
          </form>

          {/* User List Table */}
          <div className="border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden bg-white dark:bg-slate-900">
            <table className="w-full text-left text-xs text-slate-600 dark:text-slate-300">
              <thead className="bg-slate-100 dark:bg-slate-800 text-[11px] font-bold text-slate-500 uppercase">
                <tr>
                  <th className="py-2.5 px-4">성명</th>
                  <th className="py-2.5 px-4">소속 부서</th>
                  <th className="py-2.5 px-4">직책</th>
                  <th className="py-2.5 px-4 text-center">비밀번호</th>
                  <th className="py-2.5 px-4 text-center">관리</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium">
                {usersList.map((u) => (
                  <tr key={u.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                    <td className="py-3 px-4 font-bold text-slate-800 dark:text-white flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 flex items-center justify-center text-[10px] font-bold">
                        {u.name.charAt(0)}
                      </div>
                      {u.name}
                      {u.id === currentUser.id && (
                        <span className="text-[10px] bg-blue-100 text-blue-600 px-1.5 py-0.5 rounded-md font-semibold">
                          (나)
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4">{u.department}</td>
                    <td className="py-3 px-4">{u.role}</td>
                    <td className="py-3 px-4 text-center font-mono text-slate-400">1111</td>
                    <td className="py-3 px-4 text-center">
                      {u.id !== currentUser.id && (
                        <button
                          onClick={() => handleDeleteUser(u)}
                          className="p-1 text-slate-400 hover:text-rose-500 rounded-md"
                          title="삭제"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between pt-4 border-t border-slate-100 dark:border-slate-800">
          <button
            onClick={onLogout}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
          >
            <LogOut className="w-4 h-4" />
            로그아웃
          </button>
          <button
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 text-xs font-bold"
          >
            닫기
          </button>
        </div>
      </div>
    </div>
  );
}
