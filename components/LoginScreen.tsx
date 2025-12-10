import React, { useState, useEffect } from 'react';
import { GradeLevel, User } from '../types';
import { AcademicCapIcon, UserIcon, KeyIcon, ChevronDownIcon } from '@heroicons/react/24/solid';

interface LoginScreenProps {
  onLogin: (user: User) => void;
}

const STORAGE_KEY_NAMES = 'thay_dung_student_names';

const LoginScreen: React.FC<LoginScreenProps> = ({ onLogin }) => {
  const [activeTab, setActiveTab] = useState<'student' | 'teacher'>('student');
  
  // Student State
  const [studentName, setStudentName] = useState('');
  const [recentNames, setRecentNames] = useState<string[]>([]);
  // Default to Grade 12 as requested
  const [selectedGrade, setSelectedGrade] = useState<GradeLevel>(GradeLevel.Lop12);
  const [showRecentDropdown, setShowRecentDropdown] = useState(false);

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

  const selectRecentName = (name: string) => {
    setStudentName(name);
    setShowRecentDropdown(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#FFDEE9] bg-gradient-to-br from-pink-200 via-purple-200 to-blue-200 p-4 font-sans overflow-hidden relative">
      {/* Decorative background elements */}
      <div className="absolute top-10 left-10 w-32 h-32 bg-yellow-400 rounded-full border-4 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] z-0 animate-bounce delay-700"></div>
      <div className="absolute bottom-20 right-10 w-24 h-24 bg-blue-500 transform rotate-45 border-4 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] z-0 animate-pulse"></div>
      
      <div className="bg-white rounded-[2rem] border-4 border-black shadow-[16px_16px_0px_0px_rgba(0,0,0,1)] w-full max-w-md overflow-hidden relative z-10">
        
        {/* 3D Header */}
        <div className="bg-orange-500 p-8 flex flex-col justify-center items-center relative border-b-4 border-black">
            <div className="bg-white p-4 rounded-2xl border-4 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] z-10 mb-3 transform -rotate-3 hover:rotate-0 transition-transform duration-300">
                <AcademicCapIcon className="h-12 w-12 text-orange-600" />
            </div>
            <h1 className="text-white font-black text-3xl z-10 text-center uppercase tracking-wider drop-shadow-[2px_2px_0px_rgba(0,0,0,1)]">
              Lớp Học Thầy Dũng
            </h1>
        </div>

        {/* Tabs with 3D effect */}
        <div className="flex bg-gray-100 p-3 gap-3 border-b-4 border-black">
          <button
            className={`flex-1 py-3 text-sm font-black text-center rounded-xl transition-all duration-200 border-2 border-black ${
              activeTab === 'student'
                ? 'bg-blue-400 text-white shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] translate-y-[-2px]'
                : 'bg-white text-gray-500 hover:bg-gray-50 shadow-none'
            }`}
            onClick={() => { setActiveTab('student'); setError(''); }}
          >
            HỌC SINH
          </button>
          <button
            className={`flex-1 py-3 text-sm font-black text-center rounded-xl transition-all duration-200 border-2 border-black ${
              activeTab === 'teacher'
                ? 'bg-purple-500 text-white shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] translate-y-[-2px]'
                : 'bg-white text-gray-500 hover:bg-gray-50 shadow-none'
            }`}
            onClick={() => { setActiveTab('teacher'); setError(''); }}
          >
            GIÁO VIÊN
          </button>
        </div>

        {/* Form Content */}
        <div className="p-8 bg-white">
          {error && (
            <div className="mb-6 bg-red-100 border-l-4 border-red-500 text-red-700 p-4 rounded font-bold" role="alert">
              <p>{error}</p>
            </div>
          )}

          {activeTab === 'student' ? (
            <form onSubmit={handleStudentLogin} className="space-y-6">
              <div className="relative">
                <label className="block text-gray-800 text-sm font-black mb-2 uppercase">Họ và Tên</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none z-10">
                    <UserIcon className="h-5 w-5 text-gray-500" />
                  </div>
                  <input
                    type="text"
                    value={studentName}
                    onChange={(e) => setStudentName(e.target.value)}
                    onFocus={() => recentNames.length > 0 && setShowRecentDropdown(true)}
                    className="w-full pl-10 pr-10 py-3 rounded-xl border-4 border-gray-200 focus:border-blue-500 focus:ring-0 text-gray-900 font-bold placeholder-gray-400 transition-colors bg-gray-50"
                    placeholder="Nhập tên của em..."
                  />
                  {recentNames.length > 0 && (
                    <div 
                        className="absolute inset-y-0 right-0 pr-3 flex items-center cursor-pointer"
                        onClick={() => setShowRecentDropdown(!showRecentDropdown)}
                    >
                        <ChevronDownIcon className="h-5 w-5 text-gray-500 hover:text-blue-500" />
                    </div>
                  )}
                </div>
                
                {/* Recent names dropdown */}
                {showRecentDropdown && recentNames.length > 0 && (
                    <div className="absolute z-20 top-full left-0 w-full bg-white border-4 border-gray-200 border-t-0 rounded-b-xl shadow-lg mt-1 overflow-hidden">
                        {recentNames.map((name, idx) => (
                            <div 
                                key={idx}
                                onClick={() => selectRecentName(name)}
                                className="px-4 py-2 hover:bg-blue-50 cursor-pointer font-medium text-gray-700 border-b border-gray-100 last:border-0"
                            >
                                {name}
                            </div>
                        ))}
                    </div>
                )}
              </div>

              <div>
                <label className="block text-gray-800 text-sm font-black mb-2 uppercase">Khối Lớp</label>
                <div className="relative">
                  <select
                    value={selectedGrade}
                    onChange={(e) => setSelectedGrade(e.target.value as GradeLevel)}
                    className="w-full pl-4 pr-10 py-3 rounded-xl border-4 border-gray-200 focus:border-blue-500 focus:ring-0 text-gray-900 font-bold bg-gray-50 appearance-none"
                  >
                    {Object.values(GradeLevel).map((grade) => (
                      <option key={grade} value={grade} className="text-gray-900">
                        {grade}
                      </option>
                    ))}
                  </select>
                  <div className="absolute inset-y-0 right-0 flex items-center px-4 pointer-events-none text-gray-500">
                    <ChevronDownIcon className="h-5 w-5" />
                  </div>
                </div>
              </div>

              <button
                type="submit"
                className="w-full bg-blue-500 hover:bg-blue-600 text-white font-black py-4 px-4 rounded-xl shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] active:shadow-none active:translate-y-[4px] border-2 border-black transition-all text-lg uppercase"
              >
                Vào Lớp Học Ngay
              </button>
            </form>
          ) : (
            <form onSubmit={handleTeacherLogin} className="space-y-6">
              <div>
                <label className="block text-gray-800 text-sm font-black mb-2 uppercase">Mật khẩu Giáo Viên</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <KeyIcon className="h-5 w-5 text-gray-500" />
                  </div>
                  <input
                    type="password"
                    value={teacherPassword}
                    onChange={(e) => setTeacherPassword(e.target.value)}
                    className="w-full pl-10 py-3 rounded-xl border-4 border-gray-200 focus:border-purple-500 focus:ring-0 text-gray-900 font-bold placeholder-gray-400 bg-gray-50"
                    placeholder="Nhập mật khẩu..."
                  />
                </div>
              </div>

              <button
                type="submit"
                className="w-full bg-purple-500 hover:bg-purple-600 text-white font-black py-4 px-4 rounded-xl shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] active:shadow-none active:translate-y-[4px] border-2 border-black transition-all text-lg uppercase"
              >
                Đăng Nhập
              </button>
            </form>
          )}
        </div>
      </div>
      
      {/* Footer Text */}
      <div className="absolute bottom-4 text-center w-full text-blue-800/60 font-bold text-sm">
         © Thầy Dũng - Trợ lý học tập thông minh
      </div>
    </div>
  );
};

export default LoginScreen;
