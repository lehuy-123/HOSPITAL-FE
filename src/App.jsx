import React, { useState, useEffect } from 'react';
import { io } from 'socket.io-client';
import PatientView from './components/PatientView';
import StaffView from './components/StaffView';
import { Activity, Users, Landmark, Heart, Lock, Unlock } from 'lucide-react';

// Configure the backend connection URL (Express Server)
const API_URL =
  window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
    ? 'http://localhost:5000'
    : 'https://hospital-tv01.onrender.com';

// Establish local socket instance
const socket = io(API_URL);

export default function App() {
  const [isInternal, setIsInternal] = useState(() => {
    return localStorage.getItem('hq_is_internal') === 'true';
  });
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [passwordInput, setPasswordInput] = useState('');
  const [loginError, setLoginError] = useState('');

  const [activeTab, setActiveTab] = useState(() => {
    const isInternalUser = localStorage.getItem('hq_is_internal') === 'true';
    if (!isInternalUser) return 'PATIENT';
    return localStorage.getItem('hq_active_tab') || 'PATIENT';
  });

  const handleTabChange = (tab) => {
    if (!isInternal && tab !== 'PATIENT') return;
    setActiveTab(tab);
    localStorage.setItem('hq_active_tab', tab);
  };

  const handleLoginSubmit = (e) => {
    e.preventDefault();
    if (passwordInput === 'giadinh123') {
      setIsInternal(true);
      localStorage.setItem('hq_is_internal', 'true');
      setShowLoginModal(false);
      setPasswordInput('');
      setLoginError('');
    } else {
      setLoginError('Mật khẩu không chính xác. Vui lòng thử lại!');
    }
  };

  const handleLogout = () => {
    setIsInternal(false);
    localStorage.removeItem('hq_is_internal');
    setActiveTab('PATIENT');
    localStorage.setItem('hq_active_tab', 'PATIENT');
  };

  const [departments, setDepartments] = useState([]);
  const [connected, setConnected] = useState(false);

  // Retrieve current rooms snapshot from REST API
  const fetchDepartments = async () => {
    try {
      const res = await fetch(`${API_URL}/api/departments`);
      if (res.ok) {
        const data = await res.json();
        setDepartments(data);
      }
    } catch (err) {
      console.error('Lỗi khi tải thông tin sảnh phòng:', err);
    }
  };

  useEffect(() => {
    fetchDepartments();

    socket.on('connect', () => {
      setConnected(true);
      console.log('Socket link established.');
    });

    socket.on('disconnect', () => {
      setConnected(false);
      console.log('Socket link dropped.');
    });

    // Capture global database update broadcast from server
    socket.on('queue-updated', () => {
      console.log('Phát hiện cập nhật hàng đợi thực tế. Đang làm mới dữ liệu...');
      fetchDepartments();
    });

    return () => {
      socket.off('connect');
      socket.off('disconnect');
      socket.off('queue-updated');
    };
  }, []);

  return (
    <div className="min-h-screen flex flex-col font-sans select-none pb-12 relative bg-transparent overflow-hidden">
      {/* Premium Hospital Background */}
      <div
        className="fixed inset-0 pointer-events-none bg-cover bg-center bg-no-repeat -z-10"
        style={{ backgroundImage: 'url("https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?q=80&w=2053&auto=format&fit=crop")' }}
      ></div>
      {/* Glassmorphism Frosted Overlay */}
      <div className="fixed inset-0 pointer-events-none bg-slate-50/60 backdrop-blur-md -z-10"></div>

      {/* Main Content Wrapper */}
      <div className="relative z-10 flex flex-col flex-1">
        {/* Premium Navigation Hub Header */}
        <header className="sticky top-0 z-50 bg-white/70 backdrop-blur-xl border-b border-white/50 shadow-sm">
          <div className="max-w-6xl mx-auto px-4 py-3 flex flex-col sm:flex-row items-center justify-between gap-4">

            {/* Clinic Brand */}
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-teal-600 rounded-xl flex items-center justify-center text-white shadow-md shadow-teal-150">
                <Landmark className="w-6 h-6" />
              </div>
              <div>
                <h1 className="text-xl font-black text-slate-800 tracking-tight leading-4 flex items-center gap-1.5 m-0 uppercase font-sans">
                  BVĐK Gia Định
                  <Heart className="w-4 h-4 text-red-500 fill-red-500 animate-pulse ml-0.5" />
                </h1>
                <span className="text-[10px] text-slate-400 font-bold tracking-wider uppercase">
                  TINH TẾ TRONG TỪNG TRẢI NGHIỆM CỦA BỆNH NHÂN
                </span>
              </div>
            </div>

            {/* Tab Selector Buttons */}
            {isInternal && (
              <nav className="flex bg-slate-100 p-1 rounded-xl border border-slate-200/50 max-w-full overflow-x-auto whitespace-nowrap scrollbar-none">
                <button
                  onClick={() => handleTabChange('PATIENT')}
                  className={`flex items-center gap-1 px-2.5 sm:px-4 py-2 text-[10px] sm:text-xs font-bold rounded-lg transition-all cursor-pointer whitespace-nowrap flex-shrink-0 ${activeTab === 'PATIENT'
                    ? 'bg-white text-teal-700 shadow-sm border border-slate-200/20'
                    : 'text-slate-550 hover:bg-slate-250/20 hover:text-slate-900'
                    }`}
                >
                  <Activity className="w-3 sm:w-3.5 h-3 sm:h-3.5" />
                  BỆNH NHÂN
                </button>
                <button
                  onClick={() => handleTabChange('STAFF')}
                  className={`flex items-center gap-1 px-2.5 sm:px-4 py-2 text-[10px] sm:text-xs font-bold rounded-lg transition-all cursor-pointer whitespace-nowrap flex-shrink-0 ${activeTab === 'STAFF'
                    ? 'bg-white text-blue-700 shadow-sm border border-slate-200/20'
                    : 'text-slate-550 hover:bg-slate-250/20 hover:text-slate-900'
                    }`}
                >
                  <Users className="w-3 sm:w-3.5 h-3 sm:h-3.5" />
                  CÁN BỘ Y TẾ
                </button>
              </nav>
            )}

            {/* Status and Authenticator Control */}
            <div className="flex items-center gap-3">
              <div className="hidden sm:flex items-center gap-2">
                <span className={`w-2.5 h-2.5 rounded-full ${connected ? 'bg-emerald-500' : 'bg-rose-500'} animate-pulse`}></span>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest font-mono">
                  {connected ? 'REAL-TIME' : 'OFFLINE'}
                </span>
              </div>

              {isInternal ? (
                <button
                  onClick={handleLogout}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-700 font-bold rounded-xl text-[10px] sm:text-xs transition duration-200 cursor-pointer whitespace-nowrap"
                >
                  <Unlock className="w-3.5 h-3.5 animate-pulse" />
                  ĐĂNG XUẤT
                </button>
              ) : (
                <button
                  onClick={() => setShowLoginModal(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-teal-50 hover:bg-teal-100 border border-teal-100 text-teal-700 font-bold rounded-xl text-[10px] sm:text-xs transition duration-200 cursor-pointer whitespace-nowrap"
                >
                  <Lock className="w-3.5 h-3.5" />
                  CHỈ NỘI BỘ
                </button>
              )}
            </div>

          </div>
        </header>

        {/* Main Workspace Frame */}
        <main className="max-w-[1650px] mx-auto px-2 sm:px-4 mt-8 flex-1 w-full relative">
          {activeTab === 'PATIENT' && (
            <PatientView
              departments={departments}
              onConfirmNext={fetchDepartments}
              apiBase={API_URL}
              socket={socket}
            />
          )}
          {activeTab === 'STAFF' && (
            <StaffView
              departments={departments}
              onTicketCreated={fetchDepartments}
              apiBase={API_URL}
              socket={socket}
            />
          )}
        </main>

        {/* Clean Aesthetic Footer */}
        <footer className="mt-12 text-center text-[10px] font-semibold text-slate-400 tracking-wider">
          © 2026 BỆNH VIỆN ĐA KHOA GIA ĐỊNH • HỆ THỐNG HỖ TRỢ ĐIỀU PHỐI BỆNH NHÂN
        </footer>

        {/* Login Modal */}
        {showLoginModal && (
          <div className="fixed inset-0 bg-slate-900/65 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
            <div className="bg-white max-w-sm w-full rounded-2xl p-6 shadow-2xl border border-slate-100 animate-in fade-in zoom-in-95 duration-200 text-left">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-teal-50 rounded-xl flex items-center justify-center text-teal-600">
                  <Lock className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-800">Xác Thực Nội Bộ</h3>
                  <p className="text-[10px] text-slate-450 font-bold uppercase tracking-wider">Đăng nhập tài khoản y tế</p>
                </div>
              </div>

              <form onSubmit={handleLoginSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                    Mật Khẩu Truy Cập *
                  </label>
                  <input
                    type="password"
                    placeholder="Nhập mã xác thực..."
                    value={passwordInput}
                    onChange={(e) => {
                      setPasswordInput(e.target.value);
                      setLoginError('');
                    }}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-teal-500 text-slate-800 text-sm font-medium"
                    autoFocus
                  />
                  {loginError && (
                    <p className="text-xs text-rose-500 font-semibold mt-1.5">{loginError}</p>
                  )}
                  <p className="text-[10px] text-slate-400 italic mt-2.5">
                    <span className="font-semibold text-teal-600"></span>
                  </p>
                </div>

                <div className="flex justify-end gap-2 pt-3.5 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => {
                      setShowLoginModal(false);
                      setPasswordInput('');
                      setLoginError('');
                    }}
                    className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold rounded-xl text-xs transition duration-200 cursor-pointer"
                  >
                    HỦY
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white font-bold rounded-xl text-xs transition duration-200 cursor-pointer"
                  >
                    XÁC NHẬN
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Chatbot removed for manual emergency SOS */}
      </div>
    </div>
  );
}
