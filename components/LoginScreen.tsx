import React, { useState, useEffect } from 'react';
import { GradeLevel, User } from '../types';
import { UserIcon, AcademicCapIcon, KeyIcon, ChevronDownIcon } from '@heroicons/react/24/solid';

interface LoginScreenProps {
  onLogin: (user: User) => void;
}

const STORAGE_KEY_NAMES = 'thay_dung_student_names';

const LoginScreen: React.FC<LoginScreenProps> = ({ onLogin }) => {
  const [activeTab, setActiveTab] = useState<'student' | 'teacher'>('student');
  
  // Student State
  const [studentName, setStudentName] = useState('');
  const [recentNames, setRecentNames] = useState<string[]>([]);
  const [selectedGrade, setSelectedGrade] = useState<GradeLevel>(GradeLevel.Lop5);

  // Teacher State
  const [teacherPassword, setTeacherPassword] = useState('');
  const [error, setError] = useState('');

  // Load recent names on mount
  useEffect(() => {
    const savedNames = localStorage.getItem(STORAGE_KEY_NAMES);
    if (savedNames) {
      try {
        setRecentNames(JSON.parse(savedNames));
      } catch (e) {
        console.error("Failed to parse recent names");
      }
    }
  }, []);

  const handleStudentLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!studentName.trim()) {
      setError('Vui lòng nhập họ và tên của em.');
      return;
    }

    // Save name to local storage if new
    const updatedNames = Array.from(new Set([studentName.trim(), ...recentNames])).slice(0, 5); // Keep top 5
    localStorage.setItem(STORAGE_KEY_NAMES, JSON.stringify(updatedNames));

    onLogin({
      name: studentName,
      role: 'student',
      grade: selectedGrade,
    });
  };

  const handleTeacherLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (teacherPassword === 'Anhdung1@') {
      onLogin({
        name: 'Thầy Dũng',
        role: 'teacher',
      });
    } else {
      setError('Mật khẩu không đúng.');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-teal-400 via-purple-400 to-pink-400 p-4">
      <div className="bg-white/95 backdrop-blur-sm rounded-3xl shadow-2xl w-full max-w-md overflow-hidden border border-white/50">
        
        {/* Header Image/Icon */}
        <div className="bg-gradient-to-r from-teal-500 to-teal-600 p-8 flex flex-col justify-center items-center relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-full bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10"></div>
            <div className="bg-white p-4 rounded-full shadow-lg z-10 mb-2">
                <AcademicCapIcon className="h-12 w-12 text-teal-600" />
            </div>
            <h1 className="text-white font-bold text-2xl z-10 text-center">Lớp Học Thầy Dũng</h1>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-100">
          <button
            className={`flex-1 py-4 text-sm font-bold text-center transition-all duration-300 ${
              activeTab === 'student'
                ? 'text-teal-600 border-b-2 border-teal-600 bg-teal-50/50'
                : 'text-gray-400 hover:text-gray-600'
            }`}
            onClick={() => { setActiveTab('student'); setError(''); }}
          >
            Học Sinh
          </button>
          <button
            className={`flex-1 py-4 text-sm font-bold text-center transition-all duration-300 ${
              activeTab === 'teacher'
                ? 'text-pink-600 border-b-2 border-pink-600 bg-pink-50/50'
                : 'text-gray-400 hover:text-gray-600'
            }`}
            onClick={() => { setActiveTab('teacher'); setError(''); }}
          >
            Tôi là Giáo Viên
          </button>
        </div>

        <div className="p-8">
          <h2 className="text-2xl font-bold text-gray-800 text-center mb-2">
            {activeTab === 'student' ? 'Chào mừng em!' : 'Khu vực Giáo viên'}
          </h2>
          <p className="text-center text-gray-500 mb-6 text-sm">
            {activeTab === 'student' 
              ? 'Nhập thông tin để bắt đầu trò chuyện với Thầy.' 
              : 'Vui lòng xác thực danh tính.'}
          </p>

          {error && (
            <div className="mb-4 p-3 bg-red-100 border border-red-200 text-red-700 text-sm rounded-xl text-center font-medium animate-pulse">
              {error}
            </div>
          )}

          {activeTab === 'student' ? (
            <form onSubmit={handleStudentLogin} className="space-y-5">
              <div className="relative group">
                <label className="block text-sm font-bold text-gray-700 mb-1 ml-1">Họ và tên</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <UserIcon className="h-5 w-5 text-gray-400 group-focus-within:text-teal-500 transition-colors" />
                  </div>
                  <input
                    type="text"
                    required
                    list="recent-names"
                    className="block w-full pl-10 pr-3 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-all bg-gray-50 focus:bg-white text-gray-900 placeholder-gray-400"
                    placeholder="Ví dụ: Nguyễn Văn An"
                    value={studentName}
                    onChange={(e) => setStudentName(e.target.value)}
                  />
                  <datalist id="recent-names">
                    {recentNames.map((name, index) => (
                      <option key={index} value={name} />
                    ))}
                  </datalist>
                  {/* Visual indicator that this is a dropdown-able field */}
                  <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                     <ChevronDownIcon className="h-4 w-4 text-gray-300" />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1 ml-1">Khối lớp</label>
                <div className="relative">
                  <select
                    className="block w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-teal-500 focus:border-transparent bg-gray-50 focus:bg-white appearance-none cursor-pointer text-gray-900"
                    value={selectedGrade}
                    onChange={(e) => setSelectedGrade(e.target.value as GradeLevel)}
                  >
                    {Object.values(GradeLevel).map((grade) => (
                      <option key={grade} value={grade}>{grade}</option>
                    ))}
                  </select>
                  <div className="absolute inset-y-0 right-0 flex items-center px-3 pointer-events-none">
                    <ChevronDownIcon className="h-5 w-5 text-gray-400" />
                  </div>
                </div>
              </div>

              <button
                type="submit"
                className="w-full bg-gradient-to-r from-teal-500 to-teal-600 hover:from-teal-600 hover:to-teal-700 text-white font-bold py-3.5 rounded-xl shadow-lg shadow-teal-500/30 transition-all transform hover:scale-[1.02] active:scale-95"
              >
                Vào lớp học
              </button>
            </form>
          ) : (
            <form onSubmit={handleTeacherLogin} className="space-y-5">
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1 ml-1">Mật khẩu</label>
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <KeyIcon className="h-5 w-5 text-gray-400 group-focus-within:text-pink-500 transition-colors" />
                  </div>
                  <input
                    type="password"
                    required
                    className="block w-full pl-10 pr-3 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-pink-500 focus:border-transparent bg-gray-50 focus:bg-white text-gray-900 placeholder-gray-400 transition-all"
                    placeholder="Nhập mật khẩu"
                    value={teacherPassword}
                    onChange={(e) => setTeacherPassword(e.target.value)}
                  />
                </div>
              </div>

              <button
                type="submit"
                className="w-full bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 text-white font-bold py-3.5 rounded-xl shadow-lg shadow-purple-500/30 transition-all transform hover:scale-[1.02] active:scale-95"
              >
                Đăng nhập
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

export default LoginScreen;