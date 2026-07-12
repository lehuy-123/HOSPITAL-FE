import React, { useState, useEffect } from 'react';
import { UserCheck, ClipboardList, Plus, Trash2, ArrowRight, CheckCircle2, AlertCircle, RefreshCw, Heart, MessageSquare, X, Send, Map, Camera } from 'lucide-react';

export default function StaffView({ departments, onTicketCreated, apiBase, socket }) {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [symptoms, setSymptoms] = useState('');
  const [gender, setGender] = useState('Nam');
  const [dob, setDob] = useState('');
  const [address, setAddress] = useState('');
  const [insurance, setInsurance] = useState('');
  const [medicalHistory, setMedicalHistory] = useState('');
  
  const [selectedRoutine, setSelectedRoutine] = useState([]);

  const [newTicketResult, setNewTicketResult] = useState(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const [mainDepartments, setMainDepartments] = useState([]);

  const [toastMessage, setToastMessage] = useState('');
  const [showToast, setShowToast] = useState(false);

  const triggerToast = (msg) => {
    setToastMessage(msg);
    setShowToast(true);
  };

  const [activeChatId, setActiveChatId] = useState(null);
  const [chatSessions, setChatSessions] = useState({});
  const [chatInput, setChatInput] = useState('');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const [patientTyping, setPatientTyping] = useState({});
  const patientTypingTimersRef = React.useRef({});
  const [patientSeen, setPatientSeen] = useState({});

  const [pendingTriage, setPendingTriage] = useState([]);
  const [selectedPendingTicketId, setSelectedPendingTicketId] = useState(null);

  useEffect(() => {
    const fetchPending = async () => {
      try {
        const res = await fetch(`${apiBase}/api/tickets/pending`);
        if (res.ok) {
          const data = await res.json();
          setPendingTriage(data);
        }
      } catch (err) { console.error('Lỗi lấy danh sách chờ duyệt:', err); }
    };
    fetchPending();
  }, [apiBase]);

  useEffect(() => {
    if (!socket) return;
    const pendingHandler = (newTicket) => {
      setPendingTriage(prev => [...prev, newTicket]);
      triggerToast('🆕 Có yêu cầu đăng ký trực tuyến mới!');
    };
    const approvedHandler = (ticket) => {
      setPendingTriage(prev => prev.filter(t => t.ticketId !== ticket.ticketId));
    };

    socket.on('new_pre_registration', pendingHandler);
    socket.on('ticket_approved', approvedHandler);

    return () => {
      socket.off('new_pre_registration', pendingHandler);
      socket.off('ticket_approved', approvedHandler);
    };
  }, [socket]);

  // Restore Global Chat History across all Tickets
  useEffect(() => {
    const fetchStaffChats = async () => {
      try {
        const res = await fetch(`${apiBase}/api/chats/all`);
        if (res.ok) {
          const allChats = await res.json();
          const restored = {};
          allChats.forEach(msg => {
            if (!restored[msg.ticketId]) restored[msg.ticketId] = { messages: [], unread: 0 };
            restored[msg.ticketId].messages.push(msg);
          });
          setChatSessions(restored);
        }
      } catch (err) { console.error('Lỗi load Lịch sử SOS Sidebar:', err); }
    };
    fetchStaffChats();
  }, [apiBase]);

  useEffect(() => {
    if (!socket) return;
    const handler = (payload) => {
      setChatSessions(prev => {
        const session = prev[payload.ticketId] || { messages: [], unread: 0 };
        const newSession = {
          ...session,
          messages: [...session.messages, payload],
          unread: activeChatId === payload.ticketId ? 0 : session.unread + (payload.sender === 'PATIENT' ? 1 : 0)
        };
        return { ...prev, [payload.ticketId]: newSession };
      });

      if (payload.sender === 'PATIENT') {
        setPatientTyping(prev => ({...prev, [payload.ticketId]: false}));
        if (activeChatId === payload.ticketId) {
             socket.emit('emergency_chat_seen', { ticketId: payload.ticketId, sender: 'STAFF', timestamp: Date.now() });
        } else {
             triggerToast('🆘 Có tín hiệu cấp cứu lạc đường mới!');
             setIsSidebarOpen(true);
        }
      }
    };
    
    const typingHandler = (p) => {
      if (p.sender === 'PATIENT') {
        setPatientTyping(prev => ({...prev, [p.ticketId]: true}));
        if (patientTypingTimersRef.current[p.ticketId]) clearTimeout(patientTypingTimersRef.current[p.ticketId]);
        patientTypingTimersRef.current[p.ticketId] = setTimeout(() => {
           setPatientTyping(prev => ({...prev, [p.ticketId]: false}));
        }, 3000);
      }
    };

    const seenHandler = (p) => {
      if (p.sender === 'PATIENT') {
        setPatientSeen(prev => ({...prev, [p.ticketId]: p.timestamp}));
      }
    };

    const deleteHandler = (payload) => {
       setChatSessions(prev => {
           const c = {...prev};
           delete c[payload.ticketId];
           return c;
       });
       if (activeChatId === payload.ticketId) setActiveChatId(null);
    };

    socket.on('emergency_chat_message', handler);
    socket.on('emergency_chat_typing', typingHandler);
    socket.on('emergency_chat_seen', seenHandler);
    socket.on('emergency_chat_delete', deleteHandler);
    
    return () => {
      socket.off('emergency_chat_message', handler);
      socket.off('emergency_chat_typing', typingHandler);
      socket.off('emergency_chat_seen', seenHandler);
      socket.off('emergency_chat_delete', deleteHandler);
    };
  }, [socket, activeChatId]);

  useEffect(() => {
     if (activeChatId && socket) {
         socket.emit('emergency_chat_seen', { ticketId: activeChatId, sender: 'STAFF', timestamp: Date.now() });
     }
  }, [activeChatId, socket]);

  const sendStaffMessage = (ticketId, txt, photoBase64 = null) => {
    if (!txt?.trim() && !photoBase64) return;
    if (!socket) return;
    const payload = {
      ticketId,
      sender: 'STAFF',
      text: (photoBase64 && !txt?.trim()) ? 'Cán bộ gửi bản đồ điều hướng.' : txt,
      isPhoto: !!photoBase64,
      photoUrl: photoBase64,
      timestamp: Date.now()
    };
    socket.emit('emergency_chat_message', payload);
    setChatInput('');
  };

  useEffect(() => {
    if (showToast) {
      const timer = setTimeout(() => {
        setShowToast(false);
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [showToast]);

  // Fetch departments configs on mount
  useEffect(() => {
    const fetchConfig = async () => {
      try {
        const res = await fetch(`${apiBase}/api/departments/config`);
        if (res.ok) {
          const data = await res.json();
          setMainDepartments(data);
        }
      } catch (err) {
        console.error('Lỗi khi tải cấu hình khoa khám:', err);
      }
    };
    fetchConfig();
  }, [apiBase]);

  // Add a department to the end of the routing list
  const addDeptToRoutine = (deptId) => {
    const mainDept = mainDepartments.find(d => d.id === deptId);
    if (!mainDept) return;

    if (selectedRoutine.some(s => s.deptId === deptId)) {
      triggerToast(`⚠️ Khoa ${mainDept.name} đã được chọn rồi!`);
      return;
    }

    setSelectedRoutine([...selectedRoutine, {
      deptId: mainDept.id,
      name: mainDept.name,
      roomNumber: mainDept.category
    }]);
    triggerToast(`✅ Đã thêm ${mainDept.name}`);
  };

  // Remove a department from the routine list by its index
  const removeDeptFromRoutine = (indexToRemove) => {
    const target = selectedRoutine[indexToRemove];
    setSelectedRoutine(selectedRoutine.filter((_, idx) => idx !== indexToRemove));
    if (target) {
      triggerToast(`🗑️ Đã xóa ${target.name}`);
    }
  };

  // Register patient
  const handleRegister = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!name.trim() || !phone.trim()) {
      setError('Vui lòng nhập tên và số điện thoại bệnh nhân.');
      return;
    }

    if (selectedRoutine.length === 0) {
      setError('Vui lòng chọn ít nhất một phòng khám trong lộ trình khám.');
      return;
    }

    setLoading(true);
    try {
      const routineDeptIds = selectedRoutine.map(step => step.deptId);

      let res;
      if (selectedPendingTicketId) {
         res = await fetch(`${apiBase}/api/tickets/${selectedPendingTicketId}/approve`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ routineDeptIds })
        });
      } else {
         res = await fetch(`${apiBase}/api/tickets`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: name.trim(),
            phone: phone.trim(),
            symptoms: symptoms.trim(),
            routineDeptIds
          })
        });
      }

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || 'Lỗi đăng ký bệnh nhân');
      }

      setNewTicketResult(data);
      setSuccess(`Phân tuyến thành công! Phiếu khám: ${data.ticketId}`);

      // Clear form
      setName('');
      setPhone('');
      setSymptoms('');
      setSelectedRoutine([]);
      setSelectedPendingTicketId(null);

      if (onTicketCreated) {
        onTicketCreated();
      }
    } catch (err) {
      console.error(err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteChat = async (e, tId) => {
    e.stopPropagation();
    if (!window.confirm("Bạn có chắc chắn muốn xóa hệ thống cứu trợ của bệnh nhân này? Toàn bộ lịch sử sẽ bị mất.")) return;
    try {
      const res = await fetch(`${apiBase}/api/chats/${tId}`, { method: 'DELETE' });
      if (res.ok) {
        setChatSessions(prev => {
          const c = {...prev};
          delete c[tId];
          return c;
        });
        if (activeChatId === tId) setActiveChatId(null);
        triggerToast('🗑️ Đã xóa cuộc trò chuyện!');
      }
    } catch(err) { console.error('Lỗi khi xóa chat:', err); }
  };

  const sortedSessions = Object.entries(chatSessions).sort((a, b) => {
    const aLastMsgs = a[1].messages;
    const bLastMsgs = b[1].messages;
    const aTime = aLastMsgs.length ? aLastMsgs[aLastMsgs.length - 1].timestamp : 0;
    const bTime = bLastMsgs.length ? bLastMsgs[bLastMsgs.length - 1].timestamp : 0;
    return bTime - aTime;
  });

  const renderSosChatUI = (isDesktopInline) => (
    <>
      {/* Header */}
      <div className={`bg-rose-600 p-4 shrink-0 flex items-center justify-between text-white ${isDesktopInline ? 'xl:rounded-t-2xl' : ''}`}>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center relative">
            <Heart className="w-5 h-5" />
            <div className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-green-400 rounded-full border-2 border-rose-600"></div>
          </div>
          <div>
            <h2 className="font-bold text-lg flex items-center gap-2">
              SOS Khẩn Cấp
            </h2>
            <p className="text-rose-100 text-[11px] font-medium opacity-90 uppercase tracking-wide">Trực Ban Y Tế</p>
          </div>
        </div>
        {!isDesktopInline && (
          <button onClick={() => setIsSidebarOpen(false)} className="hover:bg-white/20 p-2 rounded-full transition-colors xl:hidden">
            <X className="w-6 h-6" />
          </button>
        )}
      </div>

      <div className={`flex-1 overflow-hidden flex flex-col relative bg-slate-100 ${isDesktopInline ? 'xl:rounded-b-2xl' : ''}`}>
        {/* Contact List UI */}
        {!activeChatId ? (
          <div className="p-3 flex flex-col gap-2 overflow-y-auto w-full h-full">
            {Object.keys(chatSessions).length === 0 && (
              <p className="text-center text-xs text-slate-400 italic my-10 px-6">Hiện không có yêu cầu hỗ trợ lạc đường nào từ bệnh nhân.</p>
            )}
            {sortedSessions.map(([tId, session]) => (
              <button
                key={tId}
                onClick={() => {
                  setActiveChatId(tId);
                  setChatSessions(prev => ({ ...prev, [tId]: { ...prev[tId], unread: 0 } }));
                }}
                className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 flex items-center justify-between hover:border-rose-400 hover:shadow-md transition-all text-left relative overflow-hidden group"
              >
                <div className="flex flex-col gap-1 z-10">
                  <span className="font-bold text-slate-800 text-sm">Bệnh nhân Ticket: <span className="text-rose-600">{tId}</span></span>
                  <span className="text-xs text-slate-500 font-medium truncate max-w-[220px]">
                    {session.messages.length > 0 ? (session.messages[session.messages.length - 1].isPhoto ? '[Hình Ảnh]' : session.messages[session.messages.length - 1].text) : '...'}
                  </span>
                </div>
                {session.unread > 0 ? (
                  <div className="w-6 h-6 bg-rose-500 rounded-full flex items-center justify-center text-white text-xs font-bold z-10 animate-pulse">
                    {session.unread}
                  </div>
                ) : (
                  <div className="flex items-center gap-2 z-10">
                    <div onClick={(e) => handleDeleteChat(e, tId)} className="p-1.5 hover:bg-rose-100 rounded-md text-slate-300 hover:text-rose-600 transition-colors">
                      <Trash2 className="w-4 h-4" />
                    </div>
                    <ArrowRight className="w-4 h-4 text-slate-300 group-hover:text-rose-500 transition-colors" />
                  </div>
                )}
                {session.unread > 0 && <div className="absolute left-0 top-0 bottom-0 w-1 bg-rose-500"></div>}
              </button>
            ))}
          </div>
        ) : (
          /* Active Chat UI */
          <div className="flex flex-col h-full w-full bg-slate-50">
            <div className="bg-slate-200/60 px-4 py-2 flex items-center justify-between border-b border-slate-300">
              <button onClick={() => setActiveChatId(null)} className="text-slate-500 hover:text-slate-800 text-[11px] font-bold tracking-wider flex items-center gap-1 bg-white px-2 py-1 rounded shadow-sm">
                &larr; DANH SÁCH
              </button>
              <span className="text-xs font-bold text-slate-700 bg-white px-2 py-1 rounded">MÃ: {activeChatId}</span>
            </div>
            <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-3 pb-8">
              {chatSessions[activeChatId].messages.map((msg, idx) => {
                const isOurs = msg.sender === 'STAFF';
                return (
                  <div key={idx} className={`flex max-w-[85%] ${isOurs ? 'self-end bg-rose-600 text-white rounded-l-2xl rounded-tr-2xl' : 'self-start bg-white border border-slate-200 text-slate-700 rounded-r-2xl rounded-tl-2xl shadow-sm'} px-4 py-2.5 flex-col gap-1`}>
                    {msg.isPhoto ? (
                      <div className="w-full bg-slate-100 rounded-lg flex items-center justify-center mb-1 overflow-hidden border border-slate-200 relative">
                        {msg.photoUrl && msg.photoUrl.startsWith('data:image') ? (
                          <img src={msg.photoUrl} alt="Snapshot" className="w-full h-auto object-cover max-h-48 rounded" />
                        ) : (
                          <div className="h-32 w-full flex flex-col items-center justify-center">
                            <Map className={`w-8 h-8 ${isOurs ? 'text-white/50' : 'text-slate-400'}`} />
                            <div className="absolute bottom-2 right-2 bg-black/50 rounded px-1.5 py-0.5 text-[9px] text-white">ẢNH TỌA ĐỘ</div>
                          </div>
                        )}
                      </div>
                    ) : null}
                    <p className="text-[13px] leading-relaxed break-words">{msg.text}</p>
                    <div className="flex justify-end gap-1 items-center mt-0.5">
                      <span className={`text-[9px] font-medium ${isOurs ? 'text-rose-200' : 'text-slate-400'}`}>
                        {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                      {isOurs && msg.timestamp <= (patientSeen[activeChatId] || 0) && (
                         <CheckCircle2 className="w-3 h-3 text-rose-200" />
                      )}
                    </div>
                  </div>
                )
              })}
              {patientTyping[activeChatId] && (
                <div className="self-start bg-white border border-slate-200 text-slate-500 rounded-r-2xl rounded-tl-2xl shadow-sm px-4 py-2 flex items-center justify-center gap-1 w-fit max-w-[85%] mt-1">
                   <div className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce"></div>
                   <div className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce delay-75"></div>
                   <div className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce delay-150"></div>
                </div>
              )}
            </div>
            <div className="bg-white border-t border-slate-200 p-3 flex gap-2 items-end shrink-0 shadow-[0_-5px_20px_rgba(0,0,0,0.05)] pb-6 sm:pb-3">
              <input
                type="file"
                accept="image/*"
                id={`staffCameraInput_${isDesktopInline ? 'inline' : 'drawer'}`}
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files[0];
                  if (file) {
                    const reader = new FileReader();
                    reader.onload = (ev) => {
                      const img = new Image();
                      img.onload = () => {
                        const canvas = document.createElement('canvas');
                        const MAX_WIDTH = 1000;
                        const scale = img.width > MAX_WIDTH ? (MAX_WIDTH / img.width) : 1;
                        canvas.width = img.width * scale;
                        canvas.height = img.height * scale;
                        const ctx = canvas.getContext('2d');
                        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
                        sendStaffMessage(activeChatId, null, canvas.toDataURL('image/jpeg', 0.8));
                      };
                      img.src = ev.target.result;
                    };
                    reader.readAsDataURL(file);
                  }
                }}
              />
              <label
                htmlFor={`staffCameraInput_${isDesktopInline ? 'inline' : 'drawer'}`}
                className="w-10 h-10 bg-slate-100 hover:bg-slate-200 rounded-full flex items-center justify-center shrink-0 text-slate-500 transition-colors cursor-pointer shadow-sm"
              >
                <Camera className="w-5 h-5" />
              </label>
              <textarea
                value={chatInput}
                onChange={(e) => {
                   setChatInput(e.target.value);
                   if(socket && activeChatId) socket.emit('emergency_chat_typing', {ticketId: activeChatId, sender: 'STAFF'});
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendStaffMessage(activeChatId, chatInput); }
                }}
                placeholder="Hướng dẫn bệnh nhân..."
                className="flex-1 bg-slate-100 border-none focus:ring-0 rounded-xl px-4 py-2.5 text-sm resize-none h-10 max-h-24 css-scrollbar text-slate-800"
              />
              <button
                onClick={() => sendStaffMessage(activeChatId, chatInput)}
                disabled={!chatInput.trim()}
                className="w-10 h-10 bg-rose-600 hover:bg-rose-700 disabled:opacity-50 rounded-full flex items-center justify-center shrink-0 text-white shadow-md transition-colors"
              >
                <Send className="w-4 h-4 ml-0.5" />
              </button>
            </div>
          </div>
        )}
      </div>
    </>
  );

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 xl:grid-cols-4 gap-6 text-left w-full">
      {/* Registration Console */}
      <div className="lg:col-span-2 bg-white rounded-2xl p-4 sm:p-6 shadow-sm border border-slate-100 flex flex-col xl:flex-row gap-6">
        
        {/* Main form */}
        <div className="flex-1 space-y-6 order-2 xl:order-1">
          <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
            <UserCheck className="text-blue-600 w-5.5 h-5.5" />
            {selectedPendingTicketId ? `Duyệt Tuyến (${selectedPendingTicketId})` : 'Tiếp Nhận Khám Mới'}
          </h2>

          <form onSubmit={handleRegister} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-slate-600 mb-1">Tên Bệnh Nhân *</label>
              <input type="text" placeholder="Nhập họ và tên..." value={name} onChange={(e) => setName(e.target.value)} className="w-full px-4 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-slate-800" />
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-600 mb-1">Số Điện Thoại *</label>
              <input type="text" placeholder="Nhập số điện thoại..." value={phone} onChange={(e) => setPhone(e.target.value)} className="w-full px-4 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-slate-800" />
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="col-span-1">
              <label className="block text-sm font-semibold text-slate-600 mb-1">Giới tính</label>
              <select value={gender} onChange={(e) => setGender(e.target.value)} className="w-full px-4 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-slate-800">
                <option value="Nam">Nam</option>
                <option value="Nữ">Nữ</option>
                <option value="Khác">Khác</option>
              </select>
            </div>
            <div className="col-span-1">
              <label className="block text-sm font-semibold text-slate-600 mb-1">Năm sinh</label>
              <input type="number" placeholder="YYYY" value={dob} onChange={(e) => setDob(e.target.value)} className="w-full px-4 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-800" />
            </div>
            <div className="col-span-2">
              <label className="block text-sm font-semibold text-slate-600 mb-1">Mã BHYT</label>
              <input type="text" placeholder="Nhập mã BHYT..." value={insurance} onChange={(e) => setInsurance(e.target.value)} className="w-full px-4 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-800" />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
             <div>
                <label className="block text-sm font-semibold text-slate-600 mb-1">Địa chỉ liên hệ</label>
                <input type="text" placeholder="Tỉnh/Thành phố, Phường/Xã..." value={address} onChange={(e) => setAddress(e.target.value)} className="w-full px-4 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-800" />
             </div>
             <div>
                <label className="block text-sm font-semibold text-slate-600 mb-1">Tiền sử bệnh lý (Bệnh nền)</label>
                <input type="text" placeholder="Tim mạch, huyết áp..." value={medicalHistory} onChange={(e) => setMedicalHistory(e.target.value)} className="w-full px-4 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-800" />
             </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-600 mb-1">
              Triệu Chứng Lâm Sàng
            </label>
            <textarea
              rows={2}
              placeholder="Mô tả triệu chứng chính hoặc lý do khám..."
              value={symptoms}
              onChange={(e) => setSymptoms(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-slate-800 text-sm"
            />
          </div>

          {/* Quick clinical select list grouped by category */}
          <div className="border-t border-slate-100 pt-4">
            <h3 className="text-sm font-bold text-slate-700 mb-2">
              Chọn Khoa/Bộ phận bệnh nhân cần qua:
            </h3>
            <div className="space-y-4 max-h-[300px] overflow-y-auto pr-1">
              {Object.entries(
                mainDepartments.reduce((acc, dept) => {
                  if (!acc[dept.category]) acc[dept.category] = [];
                  acc[dept.category].push(dept);
                  return acc;
                }, {})
              ).map(([category, depts]) => (
                <div key={category} className="space-y-1.5">
                  <h4 className="text-[10px] font-extrabold text-blue-600 bg-blue-50/50 px-2 py-0.5 rounded uppercase tracking-wider">
                    {category}
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                    {depts.map((dept) => (
                      <button
                        key={dept.id}
                        type="button"
                        onClick={() => addDeptToRoutine(dept.id)}
                        className="px-3 py-1.5 bg-slate-50 hover:bg-blue-50 hover:text-blue-700 hover:border-blue-300 border border-slate-200 rounded-xl text-xs font-semibold text-slate-650 transition text-left cursor-pointer truncate"
                        title={dept.name}
                      >
                        {dept.name}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {error && (
            <div className="p-3 bg-rose-50 text-rose-700 rounded-xl border border-rose-100 text-sm flex items-center gap-2">
              <AlertCircle className="w-5 h-5 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {success && (
            <div className="p-3 bg-emerald-50 text-emerald-700 rounded-xl border border-emerald-100 text-sm flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
              <span>{success}</span>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 transition duration-200 shadow-md shadow-blue-200 cursor-pointer disabled:opacity-50"
          >
            {loading ? 'Đang xử lý phân khoa...' : selectedPendingTicketId ? 'DUYỆT HỒ SƠ & CẤP PHIÊN' : 'CẤP PHIÊN & PHÂN KHOA BỆNH NHÂN'}
          </button>
        </form>
      </div>

        {/* Pending Triage Column */}
        {pendingTriage.length > 0 && (
          <div className="w-full xl:w-72 mt-0 mb-8 xl:mb-0 xl:mt-0 bg-amber-50 rounded-xl border border-amber-200 p-4 shrink-0 flex flex-col gap-3 order-1 xl:order-2 shadow-sm">
            <h3 className="font-bold text-amber-800 text-sm flex items-center gap-1.5 uppercase">
              <ClipboardList className="w-4 h-4" /> Kê Khai Trực Tuyến
            </h3>
            <div className="flex flex-col gap-2 overflow-y-auto max-h-[300px]">
              {pendingTriage.map(tk => (
                <div 
                  key={tk.ticketId} 
                  onClick={() => {
                     setSelectedPendingTicketId(tk.ticketId);
                     setName(tk.name);
                     setPhone(tk.phone);
                     setGender(tk.gender || 'Nam');
                     setDob(tk.dob || '');
                     setAddress(tk.address || '');
                     setInsurance(tk.insurance || '');
                     setMedicalHistory(tk.medicalHistory || '');
                     setSymptoms(tk.symptoms);
                     setSelectedRoutine([]);
                     setError(''); setSuccess('');
                  }}
                  className={`p-3 rounded-xl border cursor-pointer transition-all ${selectedPendingTicketId === tk.ticketId ? 'bg-amber-100 border-amber-400 shadow-md ring-2 ring-amber-400 ring-opacity-50' : 'bg-white border-amber-200 hover:border-amber-400 hover:shadow-sm'}`}
                >
                  <div className="flex justify-between items-start mb-1">
                     <p className="font-bold text-blue-700 text-sm">{tk.ticketId}</p>
                     <span className="text-[10px] font-bold bg-amber-200 text-amber-800 px-1.5 py-0.5 rounded uppercase">Chờ Khám</span>
                  </div>
                  <p className="font-bold text-slate-800 text-sm truncate">{tk.name}</p>
                  <p className="text-xs text-slate-500">{tk.phone}</p>
                </div>
              ))}
            </div>
            <p className="text-[10px] text-amber-700/70 text-center italic mt-auto">Chọn một hồ sơ để điền nhanh lộ trình bên trái.</p>
          </div>
        )}
      </div>

      {/* Routine Tracker */}
      <div className="lg:col-span-1 xl:col-span-1 bg-white rounded-2xl p-4 sm:p-6 shadow-sm border border-slate-100 flex flex-col h-full justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-800 mb-2 flex items-center gap-2">
            <ClipboardList className="text-amber-500 w-5.5 h-5.5" />
            Lộ Trình Đã Tạo
          </h2>
          <p className="text-slate-500 text-xs mb-4">
            Danh sách các phòng khám theo thứ tự đi từ trên xuống dưới. Bạn có thể thêm hoặc xóa bớt.
          </p>

          {selectedRoutine.length === 0 ? (
            <div className="py-12 border-2 border-dashed border-slate-200 rounded-2xl text-center text-slate-400 text-sm flex flex-col items-center">
              <Plus className="w-8 h-8 mb-2 opacity-50 text-slate-400" />
              Chưa có phòng khám nào được chọn.
              <span className="text-xs text-slate-500 mt-1">Click vào các phòng ở bảng bên trái để thêm.</span>
            </div>
          ) : (
            <div className="space-y-3 max-h-[350px] overflow-y-auto pr-1">
              {selectedRoutine.map((step, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between p-3 bg-slate-50 border border-slate-200 rounded-xl hover:border-slate-300 transition"
                >
                  <div className="flex items-center gap-2">
                    <span className="w-6 h-6 bg-slate-200 text-slate-600 rounded-full flex items-center justify-center font-bold text-xs">
                      {idx + 1}
                    </span>
                    <div>
                      <p className="font-bold text-slate-700 text-sm">{step.name}</p>
                      <p className="text-[10px] text-slate-400 font-mono">{step.roomNumber}</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => removeDeptFromRoutine(idx)}
                    className="p-1 px-2 text-rose-500 hover:bg-rose-50 rounded-lg hover:text-rose-700 transition cursor-pointer"
                  >
                    <Trash2 className="w-4.5 h-4.5" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Dynamic Notification ticket result */}
        {newTicketResult && (
          <div className="mt-6 p-4 bg-blue-50/50 rounded-xl border border-blue-100 space-y-2">
            <h3 className="text-xs font-bold text-blue-700 uppercase tracking-wide">Số Khám Vừa Cấp</h3>
            <div className="flex justify-between items-center">
              <span className="text-2xl font-extrabold text-blue-900">{newTicketResult.ticketId}</span>
              <span className="text-xs font-medium bg-blue-100 text-blue-800 px-2 py-0.5 rounded">
                Hàng đợi: {getDeptInfo(newTicketResult.currentDeptId).name}
              </span>
            </div>
            <p className="text-slate-600 text-xs">
              Bệnh nhân: <span className="font-semibold text-slate-900">{newTicketResult.name}</span>
            </p>
          </div>
        )}
      </div>

      {/* INLINE SOS CHAT FOR DESKTOP (xl) */}
      <div className="hidden xl:flex xl:col-span-1 bg-slate-50 shadow-sm border border-slate-200 rounded-2xl flex-col relative h-[80vh] min-h-[600px] max-h-[85vh]">
        {renderSosChatUI(true)}
      </div>

      {/* FLOATING ACTION BUTTON - SOS HUB (Mobile Only) */}
      <button onClick={() => { setIsSidebarOpen(true); setActiveChatId(null) }} className={`xl:hidden fixed bottom-20 left-6 sm:bottom-6 sm:left-6 w-14 h-14 ${Object.keys(chatSessions).length > 0 ? 'bg-rose-600 hover:bg-rose-700 animate-bounce' : 'bg-slate-400 hover:bg-slate-500'} rounded-full shadow-2xl flex items-center justify-center transition-all text-white z-40`}>
        <MessageSquare className="w-6 h-6" />
        {Object.values(chatSessions).reduce((acc, sess) => acc + sess.unread, 0) > 0 && (
          <div className="absolute -top-1 -right-1 bg-yellow-400 text-rose-900 font-bold text-[10px] w-5 h-5 rounded-full flex items-center justify-center shadow animate-pulse border border-rose-600">
            {Object.values(chatSessions).reduce((acc, sess) => acc + sess.unread, 0)}
          </div>
        )}
      </button>

      {/* SOS CHAT DRAWER (Mobile / Tablet Only) */}
      {isSidebarOpen && (
        <div className="xl:hidden fixed inset-y-0 right-0 w-full sm:w-[400px] bg-slate-50 shadow-[0_0_50px_rgba(0,0,0,0.3)] z-50 flex flex-col animate-in slide-in-from-right duration-300 border-l border-slate-200">
          {renderSosChatUI(false)}
        </div>
      )}

      {/* Floating Toast Notification */}
      {showToast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-slate-900/90 backdrop-blur-md text-white px-4 py-2.5 rounded-full shadow-lg border border-white/10 flex items-center gap-2 text-xs font-bold transition-all duration-300 transform max-w-[90%] text-center">
          <Heart className="w-3.5 h-3.5 text-rose-500 fill-rose-500 animate-pulse" />
          <span>{toastMessage}</span>
        </div>
      )}
    </div>
  );

  function getDeptInfo(deptId) {
    return departments.find(d => d.deptId === deptId) || { name: '---' };
  }
}
