import React, { useState, useEffect } from 'react';
import { Search, Activity, Clock, CheckCircle2, AlertCircle, ArrowRight, Building, Play, Map, Navigation, MapPin, Info, X, FileText, HelpCircle, Coffee, Ticket, Bell, ChevronDown, User, Layers, Volume2, MessageSquare, PhoneCall, Camera, Send } from 'lucide-react';
import VisualHospitalMap from './VisualHospitalMap';
import HospitalCampusMap from './HospitalCampusMap';
const AutoSpeaker = ({ text }) => {
  useEffect(() => {
    if (!text || typeof window === 'undefined' || !window.speechSynthesis) return;

    const playSpeech = () => {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'vi-VN';
      utterance.rate = 1.0;
      utterance.volume = 1.0;

      const voices = window.speechSynthesis.getVoices();
      const viVoice = voices.find(v => v.lang.includes('vi') || v.lang === 'vi-VN');
      if (viVoice) utterance.voice = viVoice;

      window.speechSynthesis.speak(utterance);
    };

    if (window.speechSynthesis.getVoices().length === 0) {
      window.speechSynthesis.addEventListener('voiceschanged', () => setTimeout(playSpeech, 500), { once: true });
    } else {
      const timer = setTimeout(playSpeech, 800);
      return () => clearTimeout(timer);
    }
  }, [text]);
  return null;
};

export default function PatientView({ departments, onConfirmNext, apiBase, socket }) {
  const [searchQuery, setSearchQuery] = useState(() => {
    return localStorage.getItem('hq_patient_search_query') || '';
  });
  const [patientTickets, setPatientTickets] = useState([]);
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPrepModal, setShowPrepModal] = useState(false);
  const [prepInfo, setPrepInfo] = useState(null);
  const [showFirstTimerModal, setShowFirstTimerModal] = useState(false);
  const [alertedApproaching, setAlertedApproaching] = useState(new Set());
  const [alertedReady, setAlertedReady] = useState(new Set());
  const [lostHelpModal, setLostHelpModal] = useState({ isOpen: false, data: null });
  const [navStates, setNavStates] = useState(() => {
    try {
      const saved = localStorage.getItem('hq_nav_states');
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  const [emergencyChat, setEmergencyChat] = useState({ isOpen: false, messages: [], inputText: '' });
  const [staffTyping, setStaffTyping] = useState(false);
  const [staffSeenTimestamp, setStaffSeenTimestamp] = useState(0);
  const staffTypingTimerRef = React.useRef(null);

  const [isPreRegistering, setIsPreRegistering] = useState(false);
  const [preName, setPreName] = useState('');
  const [prePhone, setPrePhone] = useState('');
  const [preSymptoms, setPreSymptoms] = useState('');
  const [preGender, setPreGender] = useState('Nam');
  const [preDob, setPreDob] = useState('');
  const [preAddress, setPreAddress] = useState('');
  const [preBHYT, setPreBHYT] = useState('');
  const [preMedicalHistory, setPreMedicalHistory] = useState('');
  const [waitingForApprovalId, setWaitingForApprovalId] = useState(() => localStorage.getItem('hq_waiting_approval_id') || null);
  const [approvedTicketAlert, setApprovedTicketAlert] = useState(null);
  const [isWaitOvertime, setIsWaitOvertime] = useState(false);

  useEffect(() => {
    let timer;
    if (waitingForApprovalId) {
      setIsWaitOvertime(false);
      timer = setTimeout(() => {
        setIsWaitOvertime(true);
      }, 7000); // 7 seconds 
    } else {
      setIsWaitOvertime(false);
    }
    return () => clearTimeout(timer);
  }, [waitingForApprovalId]);

  useEffect(() => {
    if (approvedTicketAlert) {
      const tm = setTimeout(() => {
        setApprovedTicketAlert(null);
      }, 5000);
      return () => clearTimeout(tm);
    }
  }, [approvedTicketAlert]);

  useEffect(() => {
    if (!socket || !waitingForApprovalId) return;
    const approvedHandler = (ticket) => {
      if (ticket.ticketId === waitingForApprovalId) {
        setSearchQuery(ticket.ticketId);
        setPatientTickets([ticket]);
        setSelectedTicket(ticket);
        setIsPreRegistering(false);
        setWaitingForApprovalId(null);
        localStorage.removeItem('hq_waiting_approval_id');
        localStorage.setItem('hq_patient_search_query', ticket.ticketId);
        setApprovedTicketAlert(ticket);
      }
    };
    socket.on('ticket_approved', approvedHandler);
    return () => socket.off('ticket_approved', approvedHandler);
  }, [socket, waitingForApprovalId]);

  // Handle case where it was approved while the user closed the window or navigated away
  useEffect(() => {
    if (waitingForApprovalId) {
      const checkStatus = async () => {
        try {
          const res = await fetch(`${apiBase}/api/tickets/track/${waitingForApprovalId}`);
          const data = await res.json();
          if (res.ok && data.length > 0) {
            const ticket = data[0];
            if (ticket.status !== 'PENDING_TRIAGE') {
              setSearchQuery(ticket.ticketId);
              setPatientTickets([ticket]);
              setSelectedTicket(ticket);
              setIsPreRegistering(false);
              setWaitingForApprovalId(null);
              localStorage.removeItem('hq_waiting_approval_id');
              localStorage.setItem('hq_patient_search_query', ticket.ticketId);
              setApprovedTicketAlert(ticket);
            }
          }
        } catch (e) {
          console.log("Could not check pending ticket status");
        }
      };

      const timerId = setInterval(checkStatus, 2000);
      return () => clearInterval(timerId);
    }
  }, [waitingForApprovalId, apiBase]);

  const handlePreRegister = async (e) => {
    e.preventDefault();
    if (!preName.trim() || !prePhone.trim() || !preDob.trim()) {
      setError("Vui lòng nhập đầy đủ Tên, Số điện thoại và Năm sinh");
      return;
    }
    setLoading(true); setError(''); setSuccess('');

    try {
      const res = await fetch(`${apiBase}/api/tickets/pre-register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: preName,
          phone: prePhone,
          symptoms: preSymptoms,
          gender: preGender,
          dob: preDob,
          address: preAddress,
          insurance: preBHYT,
          medicalHistory: preMedicalHistory
        })
      });
      const data = await res.json();
      if (res.ok) {
        setWaitingForApprovalId(data.ticketId);
        localStorage.setItem('hq_waiting_approval_id', data.ticketId);
        setSuccess('');
      } else {
        setError(data.message || 'Lỗi');
      }
    } catch (err) {
      setError('Lỗi kết nối máy chủ!');
    }
    setLoading(false);
  };

  // Notify staff when chat is opened
  useEffect(() => {
    if (emergencyChat.isOpen && selectedTicket && socket) {
      socket.emit('emergency_chat_seen', { ticketId: selectedTicket.ticketId, sender: 'PATIENT', timestamp: Date.now() });
    }
  }, [emergencyChat.isOpen, selectedTicket, socket]);

  // Fetch chat history for selected patient ticket whenever they reconnect or swap tickets
  useEffect(() => {
    if (!selectedTicket) return;
    const fetchHistory = async () => {
      try {
        const res = await fetch(`${apiBase}/api/chats/${selectedTicket.ticketId}`);
        if (res.ok) {
          const history = await res.json();
          if (history.length > 0) {
            setEmergencyChat(prev => ({ ...prev, messages: history }));
          }
        }
      } catch (e) { console.error('Lỗi khi tải lịch sử chat', e); }
    };
    fetchHistory();
  }, [selectedTicket, apiBase]);

  useEffect(() => {
    if (!socket) return;
    const handler = (payload) => {
      if (selectedTicket && payload.ticketId === selectedTicket.ticketId) {
        setEmergencyChat(prev => ({
          ...prev, messages: [...prev.messages, payload], isOpen: true
        }));
        if (payload.sender === 'STAFF') {
          setStaffTyping(false);
          socket.emit('emergency_chat_seen', { ticketId: selectedTicket.ticketId, sender: 'PATIENT', timestamp: Date.now() });
        }
        if ('vibrate' in navigator) navigator.vibrate([200, 100, 200]);
      }
    };

    const typingHandler = (payload) => {
      if (selectedTicket && payload.ticketId === selectedTicket.ticketId && payload.sender === 'STAFF') {
        setStaffTyping(true);
        if (staffTypingTimerRef.current) clearTimeout(staffTypingTimerRef.current);
        staffTypingTimerRef.current = setTimeout(() => setStaffTyping(false), 3000);
      }
    };

    const seenHandler = (payload) => {
      if (selectedTicket && payload.ticketId === selectedTicket.ticketId && payload.sender === 'STAFF') {
        setStaffSeenTimestamp(payload.timestamp);
      }
    };

    const deleteHandler = (payload) => {
      if (selectedTicket && payload.ticketId === selectedTicket.ticketId) {
        setEmergencyChat(prev => ({ ...prev, messages: [], isOpen: false, inputText: '' }));
      }
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
  }, [socket, selectedTicket]);

  const sendPatientMessage = (text, photoBase64 = null) => {
    if (!text?.trim() && !photoBase64) return;

    const payload = {
      ticketId: selectedTicket.ticketId,
      sender: 'PATIENT',
      text: (photoBase64 && !text?.trim()) ? (photoBase64 === true ? 'Hệ thống Camera An ninh ghi nhận.' : 'Bệnh nhân vừa gửi Ảnh.') : text,
      isPhoto: !!photoBase64,
      photoUrl: photoBase64 === true ? null : photoBase64,
      timestamp: Date.now()
    };

    if (socket) socket.emit('emergency_chat_message', payload);
    setEmergencyChat(prev => ({ ...prev, inputText: '' }));
  };

  const advanceNavState = (deptId, ticketId, currentStateFromUI) => {
    const stateKey = `${ticketId}_${deptId}`;
    setNavStates(prev => {
      const current = currentStateFromUI;
      const next = Math.min(current + 1, 3);
      if (prev[stateKey] === next) return prev;
      const newState = { ...prev, [stateKey]: next };
      localStorage.setItem('hq_nav_states', JSON.stringify(newState));
      return newState;
    });
  };

  // HAPTIC AND VOICE ANNOUNCEMENT SYSTEM (DUAL STAGE)
  useEffect(() => {
    if (!selectedTicket || selectedTicket.status === 'COMPLETED' || !selectedTicket.currentDeptId) return;
    const deptId = selectedTicket.currentDeptId;
    const dept = getDeptInfo(deptId);
    if (!dept?.queue) return;

    const queueIdx = dept.queue.indexOf(selectedTicket.ticketId);
    if (queueIdx === -1) return;

    const playAlert = (pattern, text) => {
      try {
        if ('vibrate' in navigator) navigator.vibrate(pattern);
        if ('speechSynthesis' in window) {
          window.speechSynthesis.cancel(); // Mute older pending messages
          const msg = new SpeechSynthesisUtterance(text);

          // Nâng cấp: Tốc độ điều chỉnh hơi nhanh 1 chút cho tự nhiên, chỉnh pitch nhẹ nhàng
          msg.lang = 'vi-VN';
          msg.rate = 1.05;
          msg.pitch = 1.05;

          // Ưu tiên chọn Giọng NỮ cao cấp (Linh - Apple, HoaiMy - Microsoft, Google Tiếng Việt)
          // Chủ động NÉ các giọng Nam (ví dụ như 'An' của Microsoft)
          const voices = window.speechSynthesis.getVoices();

          // Log ra console để Bệnh viện kiểm tra máy tính này đang cài những giọng nào
          console.log("Các giọng Tiếng Việt máy bạn đang có:", voices.filter(v => v.lang.includes('vi')).map(v => v.name));

          let femaleVoice = voices.find(v =>
            v.lang.includes('vi') &&
            (v.name.includes('HoaiMy') || v.name.includes('Linh') || v.name.includes('Google')) &&
            !v.name.includes('An')
          );

          if (!femaleVoice) {
            // Nếu không có mác xịn, pick tạm giọng Tiếng Việt bất kỳ miến không phải 'An' (Nam)
            femaleVoice = voices.find(v => v.lang.includes('vi') && !v.name.includes('An')) || voices.find(v => v.lang.includes('vi'));
          }

          if (femaleVoice) {
            msg.voice = femaleVoice;
          }

          window.speechSynthesis.speak(msg);
        }
      } catch (e) {
        console.log("Audio module blocked without user interaction.");
      }
    };


    if (queueIdx === 1 || queueIdx === 2) {
      if (!alertedApproaching.has(deptId)) {
        setAlertedApproaching(prev => new Set(prev).add(deptId));
        playAlert([300, 100, 300], `Bệnh nhân ${selectedTicket.name} chú ý, còn ${queueIdx} lượt nữa là đến lượt khám của bạn tại ${dept.roomNumber}. Vui lòng kiểm tra lại giấy tờ cần thiết và di chuyển đến khu vực chờ khám`);
      }
    }

    else if (queueIdx === 0) {
      if (!alertedReady.has(deptId)) {
        setAlertedReady(prev => new Set(prev).add(deptId));
        playAlert([500, 200, 500, 200, 800], `Xin mời bệnh nhân ${selectedTicket.name}, vui lòng bước vào ${dept.roomNumber} để bắt đầu khám!`);
      }
    }
  }, [selectedTicket, alertedApproaching, alertedReady]);

  const handleShowPrep = (dept, step) => {
    setPrepInfo({ dept, step });
    setShowPrepModal(true);
  };






  useEffect(() => {
    const savedQuery = localStorage.getItem('hq_patient_search_query');
    if (savedQuery) {
      const autoFetch = async () => {
        setLoading(true);
        setError('');
        try {
          const res = await fetch(`${apiBase}/api/tickets/track/${savedQuery}`);
          const data = await res.json();
          if (res.ok && data.length > 0) {
            setPatientTickets(data);
            setSelectedTicket(data[0]);
          }
        } catch (err) {
          console.error(err);
        } finally {
          setLoading(false);
        }
      };
      autoFetch();
    }
  }, [apiBase]);


  useEffect(() => {
    if (searchQuery.trim()) {
      const refreshTicket = async () => {
        try {
          const res = await fetch(`${apiBase}/api/tickets/track/${searchQuery}`);
          const data = await res.json();
          if (res.ok && data.length > 0) {
            setPatientTickets(data);
            if (selectedTicket) {
              const current = data.find(t => t.ticketId === selectedTicket.ticketId);
              if (current) {
                setSelectedTicket(current);
              }
            } else {
              setSelectedTicket(data[0]);
            }
          }
        } catch (err) {
          console.error('Lỗi khi cập nhật thực tế vé khám:', err);
        }
      };
      refreshTicket();
    }
  }, [departments, apiBase]);

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;

    setLoading(true);
    setError('');
    setSuccess('');

    // Clear audio memory so it replays upon manual check
    setAlertedApproaching(new Set());
    setAlertedReady(new Set());

    try {
      const res = await fetch(`${apiBase}/api/tickets/track/${searchQuery}`);
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || 'Không tìm thấy bệnh nhân');
      }
      setPatientTickets(data);
      if (data.length > 0) {
        // Default to the first found ticket
        const latest = data[0];
        setSelectedTicket(latest);
        localStorage.setItem('hq_patient_search_query', searchQuery.trim());
      }
    } catch (err) {
      console.error(err);
      setError(err.message);
      setPatientTickets([]);
      setSelectedTicket(null);
    } finally {
      setLoading(false);
    }
  };

  // Run confirm next request
  const handleConfirmNext = async (ticketId) => {
    setError('');
    setSuccess('');
    try {
      const res = await fetch(`${apiBase}/api/tickets/${ticketId}/confirm-next`, {
        method: 'POST',
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || 'Không thể chuyển phòng khám');
      }

      setSuccess('Đã chuyển phòng khám thành công! Hàng đợi đã được cập nhật.');
      // Refresh patient ticket data
      const refRes = await fetch(`${apiBase}/api/tickets/track/${ticketId}`);
      const refData = await refRes.json();
      if (refRes.ok && refData.length > 0) {
        setSelectedTicket(refData[0]);
      }

      // Let parent reload departments state
      if (onConfirmNext) {
        onConfirmNext();
      }
    } catch (err) {
      console.error(err);
      setError(err.message);
    }
  };

  // Find department details
  const getDeptInfo = (deptId) => {
    return departments.find(d => d.deptId === deptId) || {
      name: 'Khoa/Phòng khám',
      roomNumber: '---',
      queue: [],
      currentTicketId: null
    };
  };

  // Sync map text routing - Manhattan Pathfinding Engine
  const generateNavInstruction = (startCode, endCode) => {
    if (startCode === endCode || !startCode || !endCode) return '';
    const buildings = [
      { id: 'D', x: 80, y: 60, w: 220, h: 110 },
      { id: 'E', x: 500, y: 60, w: 220, h: 110 },
      { id: 'F', x: 290, y: 220, w: 220, h: 110 },
      { id: 'B', x: 80, y: 380, w: 220, h: 110 },
      { id: 'C', x: 500, y: 380, w: 220, h: 110 },
      { id: 'A', x: 290, y: 540, w: 220, h: 110 }
    ];
    const p1 = buildings.find(b => b.id === startCode) || buildings[5];
    const p2 = buildings.find(b => b.id === endCode) || buildings[5];
    const c1 = { x: p1.x + p1.w / 2, y: p1.y + p1.h / 2 };
    const c2 = { x: p2.x + p2.w / 2, y: p2.y + p2.h / 2 };

    const SPINE_X = 400;
    const dy = c2.y - c1.y;
    let instructions = [];

    // Scenario 1: Starting on a Wing (B, C, D, E)
    if (Math.abs(c1.x - SPINE_X) > 10) {
      const distToSpine = Math.round(Math.abs(c1.x - SPINE_X) * 0.75);

      if (Math.abs(c2.x - SPINE_X) > 10 && Math.abs(dy) < 10) {
        // Direct crossing opposite wing (e.g., D -> E)
        instructions.push(`đi thẳng xuyên Hành lang nối khoảng ${distToSpine * 2} mét`);
      } else {
        // Step 1: Walk exiting the wing to the spine
        instructions.push(`đi thẳng khoảng ${distToSpine}m ra đường chính`);

        if (Math.abs(dy) > 10) {
          const distSpine = Math.round(Math.abs(dy) * 0.75);
          const cameFromRight = c1.x > SPINE_X;
          const goingSouth = dy > 0;
          let turn = (cameFromRight && goingSouth) || (!cameFromRight && !goingSouth) ? 'rẽ Trái' : 'rẽ Phải';

          if (Math.abs(c2.x - SPINE_X) <= 10) {
            // Target is directly on the spine (A or F)
            instructions.push(`${turn} ${distSpine} mét`);
          } else {
            // Target is another wing on a different Y (e.g., E -> B)
            instructions.push(`${turn} ${distSpine} mét`);

            // Final Step: Turn into the Wing
            const goingToRight = c2.x > SPINE_X;
            let finalTurn = (goingSouth && goingToRight) || (!goingSouth && !goingToRight) ? 'rẽ Trái' : 'rẽ Phải';
            const distToWing = Math.round(Math.abs(c2.x - SPINE_X) * 0.75);
            instructions.push(`sau đó ${finalTurn} vào ${distToWing} mét`);
          }
        }
      }
    } else {
      // Scenario 2: Starting ON the Central Spine (A or F)
      const distSpine = Math.round(Math.abs(dy) * 0.75);
      instructions.push(`đi dọc hành lang tuyến giữa ${distSpine} mét`);

      if (Math.abs(c2.x - SPINE_X) > 10) {
        const goingSouth = dy > 0;
        const goingToRight = c2.x > SPINE_X;
        let turn = (!goingSouth && goingToRight) || (goingSouth && !goingToRight) ? 'rẽ Phải' : 'rẽ Trái';
        const distToWing = Math.round(Math.abs(c2.x - SPINE_X) * 0.75);
        instructions.push(`${turn} ${distToWing} mét`);
      }
    }

    // Capitalize first letter strictly
    const finalString = instructions.join(' và ');
    return finalString.charAt(0).toUpperCase() + finalString.slice(1);
  };

  // Check if ticket's current step in routine is marked PROCESSING or DONE
  const isCurrentStepDone = (ticket) => {
    if (!ticket || ticket.status === 'COMPLETED' || !ticket.currentDeptId) return false;
    const step = ticket.routine.find(s => s.deptId === ticket.currentDeptId);
    return step && (step.status === 'PROCESSING' || step.status === 'DONE');
  };

  const FLOORS = [
    { level: 6, label: 'F6', name: 'Tầng 6: Khối Cận Lâm Sàng & Xét Nghiệm', matches: ['Khối Cận Lâm Sàng'] },
    { level: 5, label: 'F5', name: 'Tầng 5: Chuyên Khoa Tổng Hợp', matches: ['Khối Chuyên khoa & Dịch vụ tổng hợp'] },
    { level: 4, label: 'F4', name: 'Tầng 4: Khối Sản - Nhi', matches: ['Khối Sản - Nhi'] },
    { level: 3, label: 'F3', name: 'Tầng 3: Khối Ngoại Khoa & Phẫu Thuật', matches: ['Khối Ngoại Khoa', 'Khối Ngoại khoa'] },
    { level: 2, label: 'F2', name: 'Tầng 2: Khối Nội Khoa', matches: ['Khối Nội Khoa', 'Khối Nội khoa'] },
    { level: 1, label: 'F1', name: 'Tầng Trệt: Tiếp Nhận & Cấp Cứu', matches: ['Khối Tiếp Nhận & Cấp Cứu', 'Khối Tiếp nhận & Cấp cứu'] }
  ];

  const DEPARTMENTS_Categories = {
    'Khoa Khám bệnh': 'Khối Tiếp Nhận & Cấp Cứu', 'Khoa Cấp cứu': 'Khối Tiếp Nhận & Cấp Cứu', 'Quầy Phát Thuốc Ngoại Trú': 'Khối Tiếp Nhận & Cấp Cứu',
    'Khoa Lão': 'Khối Nội Khoa', 'Khoa Lọc máu': 'Khối Nội Khoa', 'Khoa Nội Thần kinh': 'Khối Nội Khoa', 'Khoa Dinh dưỡng': 'Khối Nội Khoa', 'Khoa Nội hô hấp': 'Khối Nội Khoa', 'Khoa Y học cổ truyền': 'Khối Nội Khoa', 'Khoa Nội tiết - Thận': 'Khối Nội Khoa', 'Khoa Nội Tim mạch': 'Khối Nội Khoa', 'Khoa Hồi sức tích cực - Chống độc': 'Khối Nội Khoa', 'Khoa Nội Tiêu hóa': 'Khối Nội Khoa', 'Khoa Hồi sức tim mạch': 'Khối Nội Khoa', 'Khoa Nội cơ xương khớp': 'Khối Nội Khoa',
    'Khoa Ngoại thần kinh': 'Khối Ngoại Khoa', 'Khoa Ngoại lồng ngực - Mạch máu': 'Khối Ngoại Khoa', 'Khoa Vật lý trị liệu - Phục hồi chức năng': 'Khối Ngoại Khoa', 'Khoa Phẫu thuật tim': 'Khối Ngoại Khoa', 'Khoa Gây mê hồi sức': 'Khối Ngoại Khoa', 'Khoa Ngoại tiêu hóa': 'Khối Ngoại Khoa', 'Khoa Ngoại Thận - Tiết niệu': 'Khối Ngoại Khoa', 'Khoa Tổng hợp': 'Khối Ngoại Khoa', 'Khoa Ngoại chấn thương chỉnh hình': 'Khối Ngoại Khoa', 'Khoa Ngoại Gan - Mật - Tụy': 'Khối Ngoại Khoa',
    'Khoa Sản phụ': 'Khối Sản - Nhi', 'Khoa Sản thường': 'Khối Sản - Nhi', 'Khoa Sản bệnh': 'Khối Sản - Nhi', 'Khoa Sanh': 'Khối Sản - Nhi', 'Khoa Nhi': 'Khối Sản - Nhi', 'Khoa Bệnh lý sơ sinh': 'Khối Sản - Nhi',
    'Khoa Mắt': 'Khối Chuyên khoa & Dịch vụ tổng hợp', 'Khoa Răng Hàm Mặt': 'Khối Chuyên khoa & Dịch vụ tổng hợp', 'Khoa Tai Mũi Họng': 'Khối Chuyên khoa & Dịch vụ tổng hợp',
    'Khoa Sinh hóa Huyết học': 'Khối Cận Lâm Sàng', 'Khoa Giải phẫu bệnh': 'Khối Cận Lâm Sàng', 'Khoa Kiểm soát Nhiễm khuẩn': 'Khối Cận Lâm Sàng', 'Khoa Nội soi - Thăm dò chức năng': 'Khối Cận Lâm Sàng', 'Khoa Dược': 'Khối Cận Lâm Sàng', 'Khoa Vi sinh': 'Khối Cận Lâm Sàng', 'Khoa Chẩn đoán hình ảnh': 'Khối Cận Lâm Sàng'
  };

  let activeFloor = 1;
  let activeDeptName = '';
  let activeRoom = '';
  if (selectedTicket && selectedTicket.currentDeptId) {
    const d = getDeptInfo(selectedTicket.currentDeptId);
    if (d.name) {
      activeDeptName = d.name;
      const parentName = d.name.split(' - ')[0];
      activeRoom = d.roomNumber;
      const category = DEPARTMENTS_Categories[parentName];
      if (category) {
        const floorInfo = FLOORS.find(f => f.matches.includes(category));
        if (floorInfo) activeFloor = floorInfo.level;
      }
    }
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Search Console */}
      <div className="bg-white rounded-2xl p-4 sm:p-6 shadow-sm border border-slate-100">
        <h2 className="text-xl font-bold text-slate-800 mb-2 flex items-center gap-2">
          <Activity className="text-teal-600 w-5 h-5 animate-pulse" />
          Tra Cứu Tiến Trình Khám Bệnh
        </h2>
        <p className="text-slate-500 text-sm mb-4">
          Nhập Mã Số Khám (ví dụ: <span className="font-semibold text-teal-600">KB-001</span>) hoặc số điện thoại đăng ký phục vụ theo dõi của bạn.
        </p>

        <form onSubmit={handleSearch} className="flex flex-col sm:flex-row gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-3.5 text-slate-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Nhập mã khám KB-xxx hoặc Số điện thoại..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent text-slate-800 text-sm sm:text-base"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full sm:w-auto px-6 py-3 bg-teal-600 text-white font-medium rounded-xl hover:bg-teal-700 transition duration-200 cursor-pointer disabled:opacity-50 text-center text-sm sm:text-base"
          >
            {loading ? 'Đang tìm...' : 'Tra Cứu'}
          </button>
        </form>

        {!isPreRegistering && !waitingForApprovalId && (
          <div className="mt-4 pt-4 border-t border-slate-100 flex flex-col items-center">
            <p className="text-slate-500 text-sm mb-3">Chưa có mã khám bệnh?</p>
            <button
              onClick={() => setIsPreRegistering(true)}
              className="w-full bg-emerald-100 hover:bg-emerald-200 text-emerald-800 font-bold py-3 rounded-xl transition-colors ring-1 ring-emerald-300 ring-inset cursor-pointer flex justify-center items-center gap-2"
            >
              <FileText className="w-5 h-5" /> Đăng Ký Khám Bệnh Trực Tuyến
            </button>
          </div>
        )}

        {isPreRegistering && !waitingForApprovalId && (
          <div className="mt-6 pt-5 border-t border-slate-200">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-slate-800 text-lg">Điền thông tin trực tuyến</h3>
              <button onClick={() => setIsPreRegistering(false)} className="text-slate-400 hover:text-rose-500"><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={handlePreRegister} className="flex flex-col gap-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <input type="text" placeholder="Họ và Tên *" value={preName} onChange={(e) => setPreName(e.target.value)} className="w-full px-4 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500" />
                <input type="text" placeholder="Số điện thoại *" value={prePhone} onChange={(e) => setPrePhone(e.target.value)} className="w-full px-4 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500" />
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                <select value={preGender} onChange={(e) => setPreGender(e.target.value)} className="w-full px-4 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white">
                  <option value="Nam">Nam</option>
                  <option value="Nữ">Nữ</option>
                  <option value="Khác">Khác</option>
                </select>
                <input type="number" placeholder="Năm sinh *" value={preDob} onChange={(e) => setPreDob(e.target.value)} className="w-full px-4 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500" />
                <input type="text" placeholder="Mã BHYT (nếu có)" value={preBHYT} onChange={(e) => setPreBHYT(e.target.value)} className="w-full col-span-2 sm:col-span-1 px-4 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500" />
              </div>

              <input type="text" placeholder="Tỉnh/Thành phố, Quận/Huyện, Phường/Xã..." value={preAddress} onChange={(e) => setPreAddress(e.target.value)} className="w-full px-4 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500" />
              <input type="text" placeholder="Tiền sử bệnh lý nền (VD: Huyết áp, Tiểu đường...)" value={preMedicalHistory} onChange={(e) => setPreMedicalHistory(e.target.value)} className="w-full px-4 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500" />

              <textarea placeholder="Mô tả chi tiết triệu chứng bệnh hiện tại..." value={preSymptoms} onChange={(e) => setPreSymptoms(e.target.value)} className="w-full px-4 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500" rows={3}></textarea>

              <button type="submit" disabled={loading} className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3 rounded-xl transition-colors cursor-pointer mt-2 shadow-md">
                {loading ? 'Đang gửi...' : 'Gửi Yêu Cầu Chờ Phân Khoa'}
              </button>
            </form>
          </div>
        )}

        {waitingForApprovalId && (
          <div className="mt-6 bg-slate-50 border border-slate-200 rounded-2xl p-4 sm:p-5 shadow-sm">
            <div className="flex flex-col sm:flex-row items-center gap-4 border-b border-slate-200 pb-4 mb-4">
              <div className="flex items-center gap-3 flex-1 text-left">
                <div className="w-12 h-12 shrink-0 bg-blue-100 text-blue-600 rounded-full flex flex-col items-center justify-center relative shadow-inner ring-2 ring-blue-50">
                  <Send className="w-5 h-5 ml-0.5 relative z-10" />
                  <div className="absolute inset-0 rounded-full border border-blue-300 animate-ping opacity-50"></div>
                </div>
                <div>
                  <h3 className="font-bold text-slate-800 text-base">Đã Gửi Thành Công!</h3>
                  <p className="text-slate-500 text-[13px]">Vui lòng đợi y tế duyệt hồ sơ.</p>
                </div>
              </div>

              <div className="bg-white border border-blue-300 shadow-sm rounded-xl px-4 py-2 flex flex-col items-center justify-center shrink-0 w-full sm:w-auto">
                <div className="text-[10px] uppercase font-bold text-slate-400 mb-0.5">MÃ HỒ SƠ TẠM</div>
                <div className="text-blue-600 font-bold text-2xl tracking-wider leading-none">{waitingForApprovalId}</div>
              </div>
            </div>

            {isWaitOvertime ? (
              <div className="bg-amber-50 rounded-xl p-3 border border-amber-200 text-amber-800 text-sm flex gap-3 items-start animate-fade-in text-left">
                <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                <p className="text-amber-700/90 text-[13px] leading-relaxed">
                  <strong>Bạn đợi có lâu không?</strong> Phòng Y tế hiện có thể quá tải. Vui lòng giữ kết nối thêm giây lát, hoặc di chuyển đến <strong>Quầy Tiếp Nhận</strong> để được xử lý ngay lập tức!
                </p>
              </div>
            ) : (
              <div className="flex gap-2.5 justify-center items-center bg-white px-5 py-2.5 rounded-full border border-slate-100 shadow-sm text-[13px] text-slate-600 font-medium">
                <div className="w-4 h-4 border-[2px] border-slate-300 border-t-blue-500 rounded-full animate-spin"></div>
                Hệ thống đang tự động duyệt và cấp phiên lâm sàng...
              </div>
            )}
          </div>
        )}

        {error && (
          <div className="mt-4 p-3 bg-rose-50 text-rose-700 rounded-xl border border-rose-100 text-sm flex items-center gap-2">
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {success && (
          <div className="mt-4 p-3 bg-emerald-50 text-emerald-700 rounded-xl border border-emerald-100 text-sm flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
            <span>{success}</span>
          </div>
        )}

        {/* First Timer Button */}
        <div className="mt-6 pt-5 border-t border-slate-100 flex justify-center">
          <button
            onClick={() => setShowFirstTimerModal(true)}
            className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-100 rounded-xl text-blue-700 text-sm font-bold hover:shadow-md hover:from-blue-100 transition-all hover:-translate-y-0.5"
          >
            <HelpCircle className="w-4 h-4 animate-bounce" />
            TÔI LÀ NGƯỜI MỚI - Xem hướng dẫn quy trình khám
          </button>
        </div>
      </div>

      {/* Ticket Selection List (if searchable returns multiple matches like on Phone queries) */}
      {patientTickets.length > 1 && (
        <div className="bg-slate-50 rounded-xl p-3 flex gap-2 overflow-x-auto border border-slate-100">
          {patientTickets.map((t) => (
            <button
              key={t.ticketId}
              onClick={() => setSelectedTicket(t)}
              className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition cursor-pointer select-none ${selectedTicket?.ticketId === t.ticketId
                ? 'bg-teal-600 text-white'
                : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
                }`}
            >
              {t.ticketId} ({t.name})
            </button>
          ))}
        </div>
      )}

      {/* Primary Details Panel */}
      {selectedTicket ? (
        <div className="space-y-6">
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
            {/* Header Card Optimized */}
            <div className="bg-gradient-to-r from-teal-600 to-emerald-600 p-4 sm:px-6 sm:py-5 text-white text-left flex flex-col md:flex-row md:items-center justify-between gap-4 md:gap-6 border-b-4 border-emerald-500">
              <div className="flex items-center gap-4">
                <div>
                  <p className="text-emerald-100 text-[10px] sm:text-xs font-semibold uppercase tracking-wider mb-0.5">Mã Khám Bệnh</p>
                  <div className="flex items-center gap-3">
                    <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight drop-shadow-md">{selectedTicket.ticketId}</h1>
                    <span className="px-2.5 py-1 bg-white/20 backdrop-blur-md border border-white/30 rounded-full text-[10px] sm:text-xs font-bold uppercase tracking-wider">
                      {selectedTicket.status === 'COMPLETED' ? 'Đã Xong' : 'Đang Khám'}
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap md:flex-nowrap items-center gap-4 md:gap-6 md:justify-end text-sm border-t md:border-t-0 md:border-l border-white/20 pt-3 md:pt-0 md:pl-6 w-full md:w-auto">
                <div>
                  <p className="text-emerald-100 text-[10px] sm:text-xs uppercase tracking-wider mb-0.5">Bệnh Nhân</p>
                  <p className="font-bold text-sm sm:text-base">{selectedTicket.name} <span className="font-medium text-emerald-50 ml-1">({selectedTicket.phone})</span></p>
                </div>
                {selectedTicket.symptoms && (
                  <div className="border-l border-white/20 pl-4 md:pl-6">
                    <p className="text-emerald-100 text-[10px] sm:text-xs uppercase tracking-wider mb-0.5">Triệu Chứng</p>
                    <p className="text-emerald-50 italic text-xs sm:text-sm truncate max-w-[150px] sm:max-w-[200px]" title={selectedTicket.symptoms}>
                      {selectedTicket.symptoms}
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Bản Đồ Định Vị (Campus / Floor) Mapped To Top */}
            {selectedTicket && selectedTicket.status !== 'COMPLETED' && activeDeptName && (() => {
              const currentStep = selectedTicket.routine.find(s => s.deptId === selectedTicket.currentDeptId);
              const currentIdx = selectedTicket.routine.indexOf(currentStep);

              let currentAutoSkip = 0;
              const TOA_NAMES = {
                'A': 'Tòa A (Tiếp Nhận, Cấp Cứu & Cấp Thuốc)',
                'B': 'Tòa B (Nội Khoa)',
                'C': 'Tòa C (Ngoại Khoa)',
                'D': 'Tòa D (Sản Nhi)',
                'E': 'Tòa E (Chuyên Khoa Tổng Hợp)',
                'F': 'Tòa F (Xét Nghiệm CLS)'
              };

              if (currentIdx > 0 && currentStep) {
                const prevDeptId = selectedTicket.routine[currentIdx - 1].deptId;
                const prevDept = getDeptInfo(prevDeptId);
                let prevToaName = 'Tòa A (Tiếp Nhận, Cấp Cứu & Cấp Thuốc)';
                let prevTangNum = 1;
                const prevMatch = prevDept.roomNumber.match(/([A-F])(\d)(\d{2})/i);
                if (prevMatch) {
                  prevToaName = TOA_NAMES[prevMatch[1].toUpperCase()];
                  prevTangNum = parseInt(prevMatch[2], 10);
                }

                const currentDeptInfo = getDeptInfo(currentStep.deptId);
                const currentMatch = currentDeptInfo.roomNumber.match(/([A-F])(\d)(\d{2})/i);
                let currToaName = 'Tòa B (Nội Khoa)';
                let currTangNum = 1;
                if (currentMatch) {
                  currToaName = TOA_NAMES[currentMatch[1].toUpperCase()];
                  currTangNum = parseInt(currentMatch[2], 10);
                }

                if (prevToaName === currToaName) {
                  currentAutoSkip = 1;
                  if (prevTangNum === currTangNum) {
                    currentAutoSkip = 2;
                  }
                }
              }

              const rawStateMap = currentStep ? (navStates[`${selectedTicket.ticketId}_${currentStep.deptId}`] || 0) : 0;
              const currentState = Math.max(rawStateMap, currentAutoSkip);

              // Extract current target TOA
              const dept = getDeptInfo(selectedTicket.currentDeptId);
              const matchRoom = dept?.roomNumber ? dept.roomNumber.match(/([A-F])(\d)(\d{2})/i) : null;
              let mapCurrentToa = 'A';
              if (matchRoom) mapCurrentToa = matchRoom[1].toUpperCase();

              // Extract prev starting TOA
              let mapPrevToa = 'A';
              if (currentIdx > 0) {
                const prevDeptId = selectedTicket.routine[currentIdx - 1].deptId;
                const prevDept = getDeptInfo(prevDeptId);
                const prevMatch = prevDept?.roomNumber ? prevDept.roomNumber.match(/([A-F])(\d)(\d{2})/i) : null;
                if (prevMatch) mapPrevToa = prevMatch[1].toUpperCase();
              }

              return (
                <div className="mb-0 border-b-2 border-slate-100 bg-slate-50/30 pb-6 pt-2 animate-in slide-in-from-top-5 duration-700">
                  {currentState < 2 ? (
                    <HospitalCampusMap currentToa={mapPrevToa} targetToa={mapCurrentToa} />
                  ) : (
                    <VisualHospitalMap departmentName={activeDeptName} roomNumber={activeRoom} />
                  )}
                </div>
              );
            })()}

            {/* Timeline Section */}
            <div className="p-4 sm:p-6 text-left pt-8">
              <h3 className="text-lg font-bold text-slate-800 mb-6 flex items-center gap-2">
                <Building className="w-5 h-5 text-slate-500" />
                Lộ Trình Các Phòng Cần Khám
              </h3>

              <div className="relative border-l-2 border-slate-200/60 ml-4 space-y-6 pb-4 mt-6">
                {selectedTicket.routine.map((step, idx) => {
                  const dept = getDeptInfo(step.deptId);
                  const isCurrent = selectedTicket.currentDeptId === step.deptId;
                  const isDone = step.status === 'DONE';
                  const isProcessing = step.status === 'PROCESSING';

                  // Queue position index calculations
                  const queueIdx = dept.queue.indexOf(selectedTicket.ticketId);
                  const queuePosition = queueIdx !== -1 ? queueIdx + 1 : 0;

                  return (
                    <div key={idx} className="relative pl-8 sm:pl-10 lg:pl-12 transition-all duration-300">
                      {/* Circle Node Indicator */}
                      <div className={`absolute -left-[17px] top-4 flex items-center justify-center w-8 h-8 rounded-full text-xs font-bold ring-[6px] ring-white transition-colors duration-500 shadow-sm ${isDone
                        ? 'bg-emerald-500 text-white'
                        : isCurrent
                          ? 'bg-teal-500 text-white animate-bounce shadow-teal-500/30'
                          : 'bg-slate-100 text-slate-400 border border-slate-200'
                        }`}>
                        {isDone ? <CheckCircle2 className="w-4 h-4" /> : idx + 1}
                      </div>

                      {/* Content Detail Card */}
                      <div className={`p-4 sm:p-5 rounded-2xl border ${isCurrent ? 'bg-white shadow-xl border-teal-100 ring-1 ring-teal-50/50 transform scale-[1.01]'
                        : isDone ? 'bg-slate-50 border-slate-100/50 opacity-80'
                          : 'bg-white border-slate-100 opacity-60'
                        } transition-all duration-300`}>
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <h4 className={`text-sm sm:text-base font-bold ${isDone ? 'text-slate-500 line-through' : isCurrent ? 'text-teal-800' : 'text-slate-600'
                              }`}>
                              {dept.name}
                            </h4>
                            <span className={`text-[10px] sm:text-xs font-mono font-semibold px-2 py-0.5 rounded-md ${isCurrent ? 'bg-teal-100 text-teal-700' : 'bg-slate-100 text-slate-500'
                              }`}>
                              {dept.roomNumber}
                            </span>
                          </div>

                          {isDone && (
                            <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider flex items-center gap-1">
                              <CheckCircle2 className="w-3.5 h-3.5" /> HOÀN TẤT
                            </span>
                          )}
                          {!isDone && !isCurrent && (
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                              <Clock className="w-3.5 h-3.5" /> CHỜ TỚI LƯỢT
                            </span>
                          )}
                        </div>

                        {/* LOCOMOTION / NAVIGATION PHASE (3-Step Wizard) */}
                        {isCurrent && (navStates[`${selectedTicket._id}_${step.deptId}`] || 0) < 3 && (
                          <div className="mt-4 p-4 sm:p-5 bg-gradient-to-br from-indigo-50 to-blue-50/50 border border-blue-200/60 rounded-2xl animate-in fade-in zoom-in duration-500 shadow-sm">

                            {(() => {
                              // Handle new format like 'Phòng B211'
                              const matchRoom = dept.roomNumber.match(/([A-F])(\d)(\d{2})/i);
                              let tang = 1;
                              let toa = 'Tòa A (Tiếp Nhận, Cấp Cứu & Cấp Thuốc)';

                              const TOA_NAMES = {
                                'A': 'Tòa A (Tiếp Nhận, Cấp Cứu & Cấp Thuốc)',
                                'B': 'Tòa B (Nội Khoa)',
                                'C': 'Tòa C (Ngoại Khoa)',
                                'D': 'Tòa D (Sản Nhi)',
                                'E': 'Tòa E (Chuyên Khoa Tổng Hợp)',
                                'F': 'Tòa F (Xét Nghiệm CLS)'
                              };

                              if (matchRoom) {
                                toa = TOA_NAMES[matchRoom[1].toUpperCase()];
                                tang = parseInt(matchRoom[2], 10);
                              } else {
                                // Fallback
                                const roomNumOnly = parseInt(dept.roomNumber.replace(/\D/g, '')) || 0;
                                tang = Math.max(1, Math.floor(roomNumOnly / 100));
                                const parentName = dept.name.split(' - ')[0];
                                const categoryName = DEPARTMENTS_Categories[parentName] || 'Khối Nội Khoa';
                                const CATEGORY_TO_TOA = {
                                  'Khối Tiếp Nhận & Cấp Cứu': 'Tòa A (Tiếp Nhận, Cấp Cứu & Cấp Thuốc)',
                                  'Khối Khám Bệnh': 'Tòa A (Tiếp Nhận, Cấp Cứu & Cấp Thuốc)',
                                  'Khối Nội Khoa': 'Tòa B (Nội Khoa)',
                                  'Khối Ngoại Khoa': 'Tòa C (Ngoại Khoa)',
                                  'Khối Sản - Nhi': 'Tòa D (Sản Nhi)',
                                  'Khối Chuyên khoa & Dịch vụ tổng hợp': 'Tòa E (Chuyên Khoa Tổng Hợp)',
                                  'Khối Cận Lâm Sàng': 'Tòa F (Xét Nghiệm CLS)',
                                };
                                toa = CATEGORY_TO_TOA[categoryName] || 'Tòa Trung Tâm';
                                if (parentName === 'Quầy Phát Thuốc Ngoại Trú') {
                                  toa = 'Tòa A (Quầy Cấp Thuốc)';
                                }
                              }

                              const rawState = navStates[`${selectedTicket._id}_${step.deptId}`] || 0;
                              let autoSkipState = 0;

                              if (idx > 0) {
                                const prevDeptId = selectedTicket.routine[idx - 1].deptId;
                                const prevDept = getDeptInfo(prevDeptId);

                                let prevToaName = 'Tòa A (Tiếp Nhận, Cấp Cứu & Cấp Thuốc)';
                                let prevTangNum = 1;
                                const prevMatch = prevDept.roomNumber.match(/([A-F])(\d)(\d{2})/i);
                                if (prevMatch) {
                                  prevToaName = TOA_NAMES[prevMatch[1].toUpperCase()];
                                  prevTangNum = parseInt(prevMatch[2], 10);
                                } else {
                                  const roomNumOnly = parseInt(prevDept.roomNumber.replace(/\D/g, '')) || 0;
                                  prevTangNum = Math.max(1, Math.floor(roomNumOnly / 100));
                                  const prevParentName = prevDept.name.split(' - ')[0];
                                  const prevCategoryName = DEPARTMENTS_Categories[prevParentName] || 'Khối Nội Khoa';
                                  const CATEGORY_TO_TOA = {
                                    'Khối Tiếp Nhận & Cấp Cứu': 'Tòa A (Tiếp Nhận, Cấp Cứu & Cấp Thuốc)',
                                    'Khối Khám Bệnh': 'Tòa A (Tiếp Nhận, Cấp Cứu & Cấp Thuốc)',
                                    'Khối Nội Khoa': 'Tòa B (Nội Khoa)',
                                    'Khối Ngoại Khoa': 'Tòa C (Ngoại Khoa)',
                                    'Khối Sản - Nhi': 'Tòa D (Sản Nhi)',
                                    'Khối Chuyên khoa & Dịch vụ tổng hợp': 'Tòa E (Chuyên Khoa Tổng Hợp)',
                                    'Khối Cận Lâm Sàng': 'Tòa F (Xét Nghiệm CLS)',
                                  };
                                  prevToaName = CATEGORY_TO_TOA[prevCategoryName] || 'Tòa Trung Tâm';
                                  if (prevParentName === 'Quầy Phát Thuốc Ngoại Trú') {
                                    prevToaName = 'Tòa A (Quầy Cấp Thuốc)';
                                  }
                                }

                                if (prevToaName === toa) {
                                  autoSkipState = 1;
                                  if (prevTangNum === tang) {
                                    autoSkipState = 2;
                                  }
                                }
                              }

                              const currentState = Math.max(rawState, autoSkipState);
                              const parentName = dept.name.split(' - ')[0];

                              let spokenText = "";
                              if (isCurrent) { // generate speech for all current navigating states (0, 1, 2)
                                if (currentState === 0) {
                                  if (idx === 0) {
                                    spokenText = `Từ vị trí Quầy cấp số, Bạn cần ${generateNavInstruction('A', toa.length > 4 ? toa.substring(4, 5) : 'B').replace('m và', ' mét và')} để tiến về ${toa}. Hãy chú ý các biển báo dọc đường đi.`;
                                  } else {
                                    const prevDeptId = selectedTicket.routine[idx - 1].deptId;
                                    const prevDept = getDeptInfo(prevDeptId);
                                    let prevToaSpeech = 'Tòa A (Tiếp Nhận, Cấp Cứu & Cấp Thuốc)';
                                    const prevMatch = prevDept.roomNumber.match(/([A-F])(\d)(\d{2})/i);
                                    if (prevMatch) {
                                      prevToaSpeech = TOA_NAMES[prevMatch[1].toUpperCase()];
                                    } else {
                                      const prevParentName = prevDept.name.split(' - ')[0];
                                      const prevCategoryName = DEPARTMENTS_Categories[prevParentName] || 'Khối Nội Khoa';
                                      const CATEGORY_TO_TOA = {
                                        'Khối Tiếp Nhận & Cấp Cứu': 'Tòa A (Tiếp Nhận, Cấp Cứu & Cấp Thuốc)',
                                        'Khối Khám Bệnh': 'Tòa A (Tiếp Nhận, Cấp Cứu & Cấp Thuốc)',
                                        'Khối Nội Khoa': 'Tòa B (Nội Khoa)',
                                        'Khối Ngoại Khoa': 'Tòa C (Ngoại Khoa)',
                                        'Khối Sản - Nhi': 'Tòa D (Sản Nhi)',
                                        'Khối Chuyên khoa & Dịch vụ tổng hợp': 'Tòa E (Chuyên Khoa Tổng Hợp)',
                                        'Khối Cận Lâm Sàng': 'Tòa F (Xét Nghiệm CLS)',
                                      };
                                      prevToaSpeech = CATEGORY_TO_TOA[prevCategoryName] || 'Tòa Trung Tâm';
                                      if (prevParentName === 'Quầy Phát Thuốc Ngoại Trú') {
                                        prevToaSpeech = 'Tòa A (Quầy Cấp Thuốc)';
                                      }
                                    }
                                    const startCode = prevToaSpeech.length > 4 ? prevToaSpeech.substring(4, 5) : 'A';
                                    const endCode = toa.length > 4 ? toa.substring(4, 5) : 'B';
                                    spokenText = `Từ phòng khám hiện tại, vui lòng xuống Hành lang chính, ${generateNavInstruction(startCode, endCode).replace('m và', ' mét và')} để sang ${toa}.`;
                                  }
                                } else if (currentState === 1) {
                                  if (tang === 1 && toa.includes('Tòa A')) {
                                    spokenText = `Tuyệt vời, bạn đang ở sảnh chính của ${toa}. Điểm đến nằm ngay tại Tầng trệt, bạn không cần phải tìm thang máy, hãy ấn xác nhận trên màn hình để xem sơ đồ dẫn tới phòng!`;
                                  } else {
                                    spokenText = `Tuyệt vời! Tiếp theo hãy sử dụng hệ thống thang máy trung tâm để di chuyển lên Tầng ${tang}. Vui lòng xác nhận trên màn hình khi bạn đã đứng tại sảnh thang máy ở Tầng ${tang}.`;
                                  }
                                } else if (currentState === 2) {
                                  if (tang === 1 && toa.includes('Tòa A')) {
                                    spokenText = `Bạn đã ở đúng Tầng trệt. Hãy thả bộ dọc hành lang và tìm chính xác không gian ${dept.roomNumber}.`;
                                  } else {
                                    spokenText = `Gần đến nơi rồi! Bạn đã ở Tầng ${tang}. Hãy thả bộ dọc hành lang và tìm chính xác ${dept.roomNumber}.`;
                                  }
                                }
                              }

                              return (
                                <>
                                  {isCurrent && spokenText && <AutoSpeaker text={spokenText.replace(/Tòa A \(Quầy Cấp Thuốc\)/g, "Quầy Cấp Thuốc của hệ thống").replace(/Tòa A \(Tiếp Nhận, Cấp Cứu & Cấp Thuốc\)/g, "Khu vực tiếp nhận Tòa A")} />}

                                  {currentState < 2 && (
                                    <div className="flex items-center gap-3 mb-5">
                                      <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center text-blue-600 shadow-inner shrink-0">
                                        <Navigation className="w-5 h-5 -rotate-45" />
                                      </div>
                                      <div>
                                        <h4 className="font-black text-blue-800 text-sm md:text-base uppercase tracking-wide">Lộ Trình Di Chuyển</h4>
                                        <p className="text-xs md:text-sm text-blue-700 font-medium">Bạn cần đi đến đúng điểm để được gọi vào khám.</p>
                                      </div>
                                    </div>
                                  )}

                                  {currentState < 2 && (
                                    <div className="flex items-center justify-between mb-5 relative px-2">
                                      <div className="absolute top-1/2 left-8 right-8 h-1 bg-blue-100 -translate-y-1/2 -z-10 rounded-full"></div>
                                      {[
                                        { stepIdx: 0, label: 'Tòa Nhà', icon: Building, desc: toa.split(' ')[0] },
                                        { stepIdx: 1, label: 'Khu Vực', icon: Layers, desc: (tang === 1 && toa.includes('Tòa A')) ? 'Tầng Trệt' : `Tại Tầng ${tang}` },
                                        { stepIdx: 2, label: 'Tới Phòng', icon: MapPin, desc: dept.roomNumber }
                                      ].map(s => {
                                        const isPassed = currentState > s.stepIdx;
                                        const isCurrentStep = currentState === s.stepIdx;
                                        return (
                                          <div key={s.stepIdx} className={`flex flex-col items-center gap-1.5 transition-all duration-300 ${isPassed ? 'opacity-100' : isCurrentStep ? 'opacity-100 transform scale-105' : 'opacity-40 grayscale filter'}`}>
                                            <div className={`w-12 h-12 rounded-full flex items-center justify-center border-[3px] shadow ${isPassed ? 'bg-blue-600 border-blue-200 text-white' : isCurrentStep ? 'bg-white border-blue-500 text-blue-600 shadow-[0_4px_15px_rgba(59,130,246,0.3)]' : 'bg-slate-100 border-slate-300 text-slate-500'}`}>
                                              <s.icon className={`w-5 h-5 ${isCurrentStep && 'animate-bounce'}`} />
                                            </div>
                                            <span className={`text-[11px] font-black uppercase ${isCurrentStep ? 'text-blue-800' : 'text-slate-600'}`}>{s.label}</span>
                                            <span className="text-[10px] text-blue-600 font-bold bg-blue-100/50 px-2 py-0.5 rounded text-center whitespace-nowrap overflow-hidden text-ellipsis max-w-[80px] border border-blue-200/50">{s.desc}</span>
                                          </div>
                                        )
                                      })}
                                    </div>
                                  )}

                                  <div className={`bg-white p-5 rounded-2xl border border-blue-100 shadow-sm text-center flex flex-col justify-center animate-in slide-in-from-right-4 duration-300 relative group ${currentState < 2 ? 'mb-5 min-h-[100px]' : 'mb-3 min-h-[80px]'}`}>
                                    {isCurrent && spokenText && (
                                      <button
                                        onClick={() => {
                                          window.speechSynthesis.cancel();
                                          const u = new SpeechSynthesisUtterance(spokenText);
                                          u.lang = 'vi-VN';
                                          u.rate = 1.0;
                                          window.speechSynthesis.speak(u);
                                        }}
                                        className="absolute -top-3 -right-3 w-10 h-10 bg-indigo-100 text-indigo-600 hover:bg-indigo-600 hover:text-white rounded-full flex items-center justify-center shadow-md border-2 border-white transition-all cursor-pointer z-10 scale-90 group-hover:scale-100"
                                        title="Phát lại Âm thanh Hướng dẫn"
                                      >
                                        <Volume2 className="w-5 h-5" />
                                      </button>
                                    )}
                                    {currentState === 0 && (
                                      <div className="text-sm text-slate-600 leading-relaxed">
                                        {(() => {
                                          if (idx === 0) {
                                            return (
                                              <p>Từ vị trí <strong>QUẦY CẤP SỐ - SẢNH ĐÓN TIẾP (Tầng Trệt)</strong>, bạn cần <strong className="text-blue-700">{generateNavInstruction('A', toa.length > 4 ? toa.substring(4, 5) : 'B')}</strong> để tiến về Tòa điểm đến tiếp theo là <strong className="text-blue-700 text-lg uppercase px-1">{toa}</strong>. Hãy chú ý theo dõi các Biển báo dọc đường đi.</p>
                                            );
                                          }

                                          const prevDeptId = selectedTicket.routine[idx - 1].deptId;
                                          const prevDept = getDeptInfo(prevDeptId);
                                          let prevToa = 'Tòa A (Tiếp Nhận, Cấp Cứu & Cấp Thuốc)';
                                          const prevMatch = prevDept.roomNumber.match(/([A-F])(\d)(\d{2})/i);

                                          if (prevMatch) {
                                            prevToa = TOA_NAMES[prevMatch[1].toUpperCase()];
                                          } else {
                                            const prevParentName = prevDept.name.split(' - ')[0];
                                            const prevCategoryName = DEPARTMENTS_Categories[prevParentName] || 'Khối Nội Khoa';
                                            const CATEGORY_TO_TOA = {
                                              'Khối Tiếp Nhận & Cấp Cứu': 'Tòa A (Tiếp Nhận, Cấp Cứu & Cấp Thuốc)',
                                              'Khối Khám Bệnh': 'Tòa A (Tiếp Nhận, Cấp Cứu & Cấp Thuốc)',
                                              'Khối Nội Khoa': 'Tòa B (Nội Khoa)',
                                              'Khối Ngoại Khoa': 'Tòa C (Ngoại Khoa)',
                                              'Khối Sản - Nhi': 'Tòa D (Sản Nhi)',
                                              'Khối Chuyên khoa & Dịch vụ tổng hợp': 'Tòa E (Chuyên Khoa Tổng Hợp)',
                                              'Khối Cận Lâm Sàng': 'Tòa F (Xét Nghiệm CLS)',
                                            };
                                            prevToa = CATEGORY_TO_TOA[prevCategoryName] || 'Tòa Trung Tâm';
                                            if (prevParentName === 'Quầy Phát Thuốc Ngoại Trú') {
                                              prevToa = 'Tòa A (Quầy Cấp Thuốc)';
                                            }
                                          }

                                          const startCode = prevToa.length > 4 ? prevToa.substring(4, 5) : 'A';
                                          const endCode = toa.length > 4 ? toa.substring(4, 5) : 'B';
                                          const instruction = generateNavInstruction(startCode, endCode);

                                          return <p>Từ điểm khám vừa hoàn thành là <strong>{prevDept.roomNumber} ({prevToa})</strong>, vui lòng xuống Hành lang nối các Tòa nhà, <strong className="text-blue-700">{instruction}</strong> để sang <strong className="text-blue-700 text-lg uppercase px-1">{toa}</strong>.</p>;
                                        })()}
                                      </div>
                                    )}
                                    {currentState === 1 && (
                                      <p className="text-sm text-slate-600 leading-relaxed">Tuyệt vời, bạn đang ở Sảnh Chính của <strong>{toa}</strong>. {(tang === 1 && toa.includes('Tòa A')) ? (
                                        <>Điểm đến nằm ngay tại Tầng Trệt này. Không Cần phải loay hoay tìm Thang Máy nữa.<br /><span className="text-xs text-rose-500 mt-1 block italic -ml-1 border-l-2 border-rose-400 pl-2">Hãy BẤM XÁC NHẬN BÊN DƯỚI để xem sơ đồ Tầng Trệt chi tiết dẫn đường tới tận phòng!</span></>
                                      ) : (
                                        <>Tiếp theo hãy sử dụng <strong className="text-blue-700">Lõi Thang bộ / Thang máy trung tâm của tòa nhà này</strong> để di chuyển lên <strong className="text-blue-700 text-lg uppercase px-1">Tầng {tang}</strong>.<br /><span className="text-xs text-rose-500 mt-1 block italic -ml-1 border-l-2 border-rose-400 pl-2">Hãy BẤM NÚT XÁC NHẬN BÊN DƯỚI khi bạn đã đứng tại khu vực Thang máy ở Tầng {tang}, Sơ đồ dẫn đường chi tiết tới phòng khám sẽ hiện ra!</span></>
                                      )}</p>
                                    )}
                                    {currentState === 2 && (
                                      <p className="text-sm text-slate-600 leading-relaxed">Gần đến nơi rồi! Bạn đã ở {(tang === 1 && toa.includes('Tòa A')) ? 'Tầng Trệt' : `Tầng ${tang}`}. Hãy thả bộ dọc hành lang tầng này và tìm chính xác <strong className="text-blue-700 text-lg uppercase px-1">{dept.roomNumber}</strong>.<br />Phòng này thuộc Khoa <strong>{parentName}</strong>.</p>
                                    )}
                                  </div>

                                  <div className="flex flex-col gap-2 w-full">
                                    <button
                                      onClick={() => advanceNavState(step.deptId, selectedTicket._id, currentState)}
                                      className="w-full py-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-black tracking-widest text-xs sm:text-sm uppercase rounded-2xl shadow-[0_5px_15px_rgba(37,99,235,0.3)] transition-all transform hover:-translate-y-0.5 flex items-center justify-center gap-2 cursor-pointer"
                                    >
                                      {currentState === 0 ? <Building className="w-5 h-5 fill-current opacity-80" /> : currentState === 1 ? <Layers className="w-5 h-5 opacity-80" /> : <MapPin className="w-5 h-5 fill-current opacity-80" />}
                                      {currentState === 0 ? `XÁC NHẬN ĐÃ ĐẾN ${toa.split(' ')[0]}` : currentState === 1 ? ((tang === 1 && toa.includes('Tòa A')) ? `XEM BẢN ĐỒ TẦNG TRỆT` : `XÁC NHẬN ĐÃ Ở THANG MÁY TẦNG ${tang}`) : 'TÔI ĐÃ ĐẾN TRƯỚC CỬA PHÒNG'}
                                    </button>
                                    <button
                                      onClick={() => setLostHelpModal({ isOpen: true, data: { ticketId: selectedTicket.ticketId, room: dept.roomNumber, deptName: dept.name } })}
                                      className="w-full py-3 mt-1 bg-rose-50 hover:bg-rose-100 text-rose-600 font-bold tracking-wider text-[10px] sm:text-xs uppercase rounded-xl border border-rose-200 transition-all flex items-center justify-center gap-2 cursor-pointer"
                                    >
                                      <AlertCircle className="w-4 h-4" /> BỊ LẠC ĐƯỜNG - GỌI NHÂN VIÊN HỖ TRỢ
                                    </button>
                                  </div>
                                </>
                              );
                            })()}
                          </div>
                        )}

                        {/* QUEUE & CLINICAL STATUS PHASE (Unlocks after arrival) */}
                        {isCurrent && (navStates[`${selectedTicket._id}_${step.deptId}`] || 0) === 3 && isProcessing && (
                          <div className="mt-4 animate-in fade-in zoom-in duration-500 shadow-xl rounded-2xl flex flex-col">
                            <div
                              onClick={() => handleShowPrep(dept, step)}
                              className="p-4 sm:p-5 bg-gradient-to-r from-teal-500 to-emerald-500 hover:from-teal-600 hover:to-emerald-600 rounded-t-2xl text-white flex items-start gap-4 cursor-pointer transition-all group"
                            >
                              <div className="mt-1 flex-shrink-0 animate-pulse bg-white/20 p-2 rounded-full shadow-inner">
                                <Play className="w-6 h-6 fill-white text-white group-hover:scale-110 transition-transform" />
                              </div>
                              <div className="flex-1">
                                <h4 className="font-black text-sm sm:text-base tracking-wide uppercase">ĐẾN LƯỢT KHÁM CỦA BẠN</h4>
                                <p className="text-teal-50 text-xs sm:text-sm mt-1 opacity-90 leading-relaxed">Xin mời di chuyển vào trong phòng khám ngay bây giờ. Bác sĩ đang đợi!</p>
                              </div>
                              <div className="hidden sm:flex flex-col items-center justify-center self-stretch border-l border-white/20 pl-4 ml-2">
                                <Info className="w-6 h-6 text-emerald-100 mb-1 group-hover:text-white transition-colors" />
                                <span className="text-[9px] uppercase font-bold text-emerald-100 whitespace-nowrap group-hover:text-white mt-1">Chuẩn bị</span>
                              </div>
                            </div>
                            <div className="bg-emerald-50 border-x border-b border-emerald-200 rounded-b-2xl p-4 sm:p-5 flex flex-col sm:flex-row items-center gap-4 justify-between">
                              <p className="text-emerald-800 text-[13px] font-medium max-w-sm">Sau khi khám xong bước này, vui lòng bấm Xác Nhận để nhường lượt cho người khác và chuyển tuyến!</p>
                              <button
                                disabled={loading}
                                onClick={(e) => { e.stopPropagation(); handleConfirmNext(selectedTicket.ticketId); }}
                                className="w-full sm:w-auto flex-shrink-0 flex items-center justify-center px-6 py-3 bg-white border-2 border-emerald-500 text-emerald-600 hover:bg-emerald-600 hover:text-white font-black tracking-wider rounded-xl shadow-sm transition-colors text-xs sm:text-sm disabled:opacity-50"
                              >
                                <CheckCircle2 className="w-4 h-4 mr-2" />
                                HOÀN TẤT & ĐI TIẾP
                              </button>
                            </div>
                          </div>
                        )}

                        {isCurrent && (navStates[`${selectedTicket._id}_${step.deptId}`] || 0) === 3 && !isProcessing && (
                          <div className="mt-4 p-4 sm:p-5 bg-gradient-to-br from-slate-50 to-amber-50/50 border border-amber-100/60 rounded-xl animate-in fade-in duration-500">
                            <div className="grid grid-cols-2 md:grid-cols-3 gap-3 sm:gap-4">
                              {/* Stats Box 1 */}
                              <div className="bg-white p-3 sm:p-4 rounded-xl border border-slate-100 shadow-sm text-center flex flex-col justify-center relative overflow-hidden">
                                <div className="absolute top-0 right-0 w-8 h-8 bg-amber-50 rounded-bl-3xl -z-0"></div>
                                <p className="text-[9px] sm:text-[10px] text-slate-450 font-bold uppercase tracking-widest mb-1 sm:mb-2 z-10">STT CỦA BẠN</p>
                                <p className="text-2xl sm:text-3xl font-black text-amber-600 font-mono z-10">{queuePosition || '--'}</p>
                              </div>

                              {/* Stats Box 2 */}
                              <div className="bg-white p-3 sm:p-4 rounded-xl border border-slate-100 shadow-sm text-center flex flex-col justify-center relative overflow-hidden">
                                <div className="absolute top-0 right-0 w-8 h-8 bg-teal-50 rounded-bl-3xl -z-0"></div>
                                <p className="text-[9px] sm:text-[10px] text-slate-450 font-bold uppercase tracking-widest mb-1 sm:mb-2 z-10">ĐANG KHÁM SỐ</p>
                                <p className="text-2xl sm:text-3xl font-black text-teal-600 font-mono z-10">{dept.currentTicketId ? dept.currentTicketId.split('-')[1] : '--'}</p>
                              </div>

                              {/* Stats Box 3 */}
                              <div className="col-span-2 md:col-span-1 bg-white p-3 sm:p-4 rounded-xl border border-slate-100 shadow-sm flex flex-col justify-center items-center relative overflow-hidden">
                                <div className="absolute top-0 right-0 w-8 h-8 bg-purple-50 rounded-bl-3xl -z-0"></div>
                                <p className="text-[9px] sm:text-[10px] text-slate-450 font-bold uppercase tracking-widest mb-1 sm:mb-2 z-10">ƯỚC TÍNH CHỜ</p>
                                <p className="text-lg sm:text-xl font-extrabold text-slate-700 z-10">
                                  {queuePosition > 1 ? `~${(queuePosition - 1) * 3} phút` : 'Sắp tới lượt'}
                                </p>
                              </div>
                            </div>

                            {/* Smart Crowd Control ETA Box (Cafeteria Logic) */}
                            {queuePosition > 8 && (
                              <div className="mt-4 p-4 border border-indigo-100 bg-gradient-to-r from-indigo-50 to-sky-50 rounded-2xl relative overflow-hidden group shadow-sm transition-all animate-in fade-in slide-in-from-bottom-2">
                                <div className="absolute -right-4 -top-4 text-indigo-200/50 transform rotate-12 group-hover:scale-110 transition-transform duration-500">
                                  <Coffee className="w-24 h-24" />
                                </div>
                                <div className="relative z-10 flex gap-3">
                                  <div className="w-12 h-12 bg-indigo-100 rounded-xl flex items-center justify-center text-indigo-600 shrink-0">
                                    <Coffee className="w-6 h-6" />
                                  </div>
                                  <div>
                                    <h5 className="font-bold text-indigo-800 text-base leading-tight">Gợi ý Giãn Cách</h5>
                                    <p className="text-sm text-indigo-700/85 mt-1 leading-relaxed pr-6">
                                      Thời gian chờ hiện tại khá lâu (ước tính hơn {(queuePosition - 1) * 3} phút) và hành lang phòng khám đang đông.
                                      <br />Bạn có thể xuống <strong>Khu Căn-Tin (Tầng Trệt)</strong> nghỉ ngơi uống nước. Điện thoại sẽ tự động <strong className="text-rose-500">Rung & Đổ chuông</strong> gọi bạn khi sắp đến lượt!
                                    </p>
                                  </div>
                                </div>
                              </div>
                            )}

                            {queuePosition > 1 && queuePosition <= 8 && (
                              <div className="mt-3 sm:mt-4 flex items-center justify-center gap-1.5 sm:gap-2 text-[11px] sm:text-xs text-amber-700 font-bold bg-amber-100/60 py-2 sm:py-2.5 rounded-lg border border-amber-200/50">
                                <Clock className="w-3.5 h-3.5 sm:w-4 sm:h-4 animate-pulse" />
                                Còn {queuePosition - 1} lượt khám phía trước bạn
                              </div>
                            )}
                            {queuePosition === 1 && (
                              <div className="mt-3 sm:mt-4 flex items-center justify-center gap-1.5 sm:gap-2 text-[11px] sm:text-xs text-teal-700 font-bold bg-teal-50 py-2 sm:py-2.5 rounded-lg border border-teal-100/50">
                                <Activity className="w-3.5 h-3.5 sm:w-4 sm:h-4 animate-pulse" />
                                Đã đến lượt rút sổ, chú ý thông báo vào phòng!
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Removed READ-ONLY warning block since Patient now self confirms */}

              {selectedTicket.status === 'COMPLETED' && (
                <div className="mt-8 p-6 bg-emerald-50 rounded-2xl border border-emerald-100 text-center">
                  <CheckCircle2 className="w-12 h-12 text-emerald-600 mx-auto mb-2" />
                  <h3 className="text-emerald-800 text-lg font-bold">Lộ Trình Khám Đã Hoàn Tất!</h3>
                  <p className="text-emerald-600 text-sm mt-1">
                    Cảm ơn Quý khách đã tin tưởng và khám bệnh tại Bệnh viện Đa khoa Gia Định. Quý khách có thể tiến hành lấy thuốc hoặc ra về.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-slate-50 border border-dashed border-slate-200 rounded-2xl py-12 text-slate-400 flex flex-col items-center">
          <Clock className="w-10 h-10 mb-2 opacity-50 text-slate-400" />
          <p className="text-base font-semibold">Chưa có thông tin số khám nào được tra cứu</p>
          <p className="text-sm opacity-85">Hãy nhập Mã số khám hoặc Số điện thoại ở thanh tìm kiếm phía trên.</p>
        </div>
      )}

      {/* Preparation Modal */}
      {showPrepModal && prepInfo && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[110] flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white max-w-md w-full rounded-3xl p-6 sm:p-8 shadow-2xl border border-slate-100 animate-in zoom-in-95 duration-300">
            <div className="flex justify-between items-start mb-6">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-emerald-50 rounded-2xl flex items-center justify-center text-emerald-600 shadow-sm border border-emerald-100">
                  <Info className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-slate-800">Hướng Dẫn Chuẩn Bị</h3>
                  <p className="text-xs text-slate-500 font-medium uppercase tracking-wider mt-0.5">Vào Phòng Khám</p>
                </div>
              </div>
              <button
                onClick={() => setShowPrepModal(false)}
                className="text-slate-400 hover:text-slate-600 bg-slate-50 hover:bg-slate-100 p-2 rounded-full transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-6 text-left">
              <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100">
                <p className="text-xs text-slate-500 font-bold uppercase tracking-wider mb-1">Điểm đến hiện tại</p>
                <p className="text-sm font-bold text-emerald-700">{prepInfo.dept.name}</p>
                <div className="flex items-center gap-2 mt-2">
                  <span className="px-2.5 py-1 bg-white border border-slate-200 rounded-lg text-xs font-mono font-bold text-slate-600 shadow-sm">
                    {prepInfo.dept.roomNumber}
                  </span>
                </div>
              </div>

              <div className="space-y-4">
                <h4 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                  <FileText className="w-4 h-4 text-emerald-500" />
                  Giấy tờ & Hồ sơ cần thiết:
                </h4>
                <ul className="space-y-3 text-sm text-slate-600 ml-1">
                  <li className="flex items-start gap-2.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                    <span><strong className="text-slate-700">Sổ khám bệnh</strong> (sổ điện tử hoặc sổ giấy).</span>
                  </li>
                  <li className="flex items-start gap-2.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                    <span><strong className="text-slate-700">Thẻ BHYT & CCCD</strong> (đối với lần đầu tiếp nhận hoặc kiểm tra hành chính).</span>
                  </li>
                  <li className="flex items-start gap-2.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                    <span><strong className="text-slate-700">Đơn thuốc & Kết quả xét nghiệm cũ</strong> (nếu có - rất quan trọng).</span>
                  </li>
                </ul>
              </div>

              <div className="space-y-4 pt-4 border-t border-slate-100">
                <h4 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-amber-500" />
                  Lưu ý khi vào phòng:
                </h4>
                <ul className="space-y-3 text-sm text-slate-600 ml-1">
                  <li className="flex items-start gap-2.5">
                    <div className="w-1.5 h-1.5 rounded-full bg-amber-400 mt-1.5 shrink-0"></div>
                    <span>Tuyệt đối giữ trật tự chung, chuyển điện thoại sang chế độ rung.</span>
                  </li>
                  <li className="flex items-start gap-2.5">
                    <div className="w-1.5 h-1.5 rounded-full bg-amber-400 mt-1.5 shrink-0"></div>
                    <span>Chuẩn bị sẵn sàng các câu hỏi phụ về triệu chứng để Bác sĩ có thể định bệnh chính xác nhất.</span>
                  </li>
                </ul>
              </div>

              <button
                onClick={() => setShowPrepModal(false)}
                className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-2xl shadow-lg shadow-emerald-600/20 transition-all duration-300 mt-4 cursor-pointer"
              >
                TÔI ĐÃ HIỂU & SẴN SÀNG
              </button>
            </div>
          </div>
        </div>
      )}

      {/* First Timer Modal */}
      {showFirstTimerModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[110] flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white max-w-xl w-full rounded-3xl p-6 sm:p-8 shadow-2xl border border-slate-100 animate-in zoom-in-95 duration-300">
            <div className="flex justify-between items-start mb-6 border-b border-slate-100 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-blue-50 rounded-2xl flex items-center justify-center text-blue-600 shadow-sm border border-blue-100">
                  <HelpCircle className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-xl font-black text-slate-800">Hướng Dẫn Cho Người Mới</h3>
                  <p className="text-xs text-slate-500 font-bold uppercase tracking-wider mt-0.5">3 bước bắt đầu quy trình tại viện</p>
                </div>
              </div>
              <button
                onClick={() => setShowFirstTimerModal(false)}
                className="text-slate-400 hover:text-slate-600 bg-slate-50 hover:bg-slate-100 p-2 rounded-full transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-6">
              {/* Step 1 */}
              <div className="flex gap-4 items-start">
                <div className="w-10 h-10 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold font-mono text-lg shrink-0 ring-4 ring-blue-50 shadow-md">1</div>
                <div>
                  <h4 className="font-bold text-slate-800 text-base">Lấy Phiếu Đăng Ký (STT)</h4>
                  <p className="text-slate-600 text-sm mt-1 leading-relaxed">
                    Bạn vui lòng di chuyển đến <strong>Máy Phát Số Tự Động</strong> màu xanh tại Sảnh chính (Tầng Trệt). Bấm nút trên màn hình lớn để lấy số thứ tự (STT) chờ đăng ký khám.
                  </p>
                </div>
              </div>

              {/* Step 2 */}
              <div className="flex gap-4 items-start relative before:absolute before:left-5 before:-top-5 before:-bottom-1 before:w-[2px] before:bg-slate-100 before:-z-10">
                <div className="w-10 h-10 rounded-full bg-indigo-600 text-white flex items-center justify-center font-bold font-mono text-lg shrink-0 ring-4 ring-indigo-50 shadow-md relative z-10">2</div>
                <div className="pt-1.5">
                  <h4 className="font-bold text-slate-800 text-base">Chuẩn bị Giấy Tờ & Làm Thủ Tục</h4>
                  <p className="text-slate-600 text-sm mt-1 leading-relaxed">
                    Lấy số xong, chờ tại <strong>Khu Vực Hàng Ghế (Quầy 1 đến 5)</strong>. Vui lòng chuẩn bị sẵn:
                    <span className="bg-slate-100 px-1 py-0.5 rounded text-[11px] font-bold mx-1 border border-slate-200">CCCD/CMND</span> và
                    <span className="bg-slate-100 px-1 py-0.5 rounded text-[11px] font-bold border border-slate-200 ml-1">Thẻ BHYT (nếu có)</span>.
                    Nhân viên sẽ gọi bạn vào quầy tương ứng STT để mở Hồ sơ & Tính viện phí.
                  </p>
                </div>
              </div>

              {/* Step 3 */}
              <div className="flex gap-4 items-start">
                <div className="w-10 h-10 rounded-full bg-emerald-600 text-white flex items-center justify-center font-bold font-mono text-lg shrink-0 ring-4 ring-emerald-50 shadow-md">3</div>
                <div className="pt-1.5">
                  <h4 className="font-bold text-slate-800 text-base">Nhận Mã Khám & Theo Dõi App</h4>
                  <p className="text-slate-600 text-sm mt-1 leading-relaxed">
                    Sau khi đóng tiền, quầy sẽ xuất cho bạn <strong>Phiếu Khám có chứa mã KB-xxx</strong> (ví dụ: KB-005).
                    Kể từ đây, bạn chỉ cần <strong>Nhập mã đó vào thanh tìm kiếm ở ứng dụng này</strong> để Hệ thống Trí tuệ tự động vẽ sơ đồ di chuyển và trực tiếp gọi bạn nhé!
                  </p>
                </div>
              </div>
            </div>

            <button
              onClick={() => setShowFirstTimerModal(false)}
              className="w-full py-4 bg-slate-800 hover:bg-slate-900 text-white font-bold tracking-wider rounded-2xl shadow-lg transition-all duration-300 mt-8 cursor-pointer"
            >
              ĐÃ HIỂU, TÔI ĐÃ SẴN SÀNG
            </button>
          </div>
        </div>
      )}

      {/* KHẨN CẤP LẠC ĐƯỜNG MODAL */}
      {lostHelpModal.isOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-sm overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="bg-gradient-to-r from-rose-500 to-red-600 px-6 py-5 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-white opacity-10 rounded-full blur-2xl transform translate-x-10 -translate-y-10 pointer-events-none"></div>
              <div className="flex justify-between items-start relative z-10">
                <div className="flex items-center gap-3 w-full pr-4">
                  <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center shrink-0">
                    <AlertCircle className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h3 className="text-white font-black text-lg sm:text-xl uppercase drop-shadow-md tracking-wide">CẦN HỖ TRỢ KHẨN</h3>
                    <p className="text-rose-100 text-[11px] font-bold mt-0.5">Giữ bình tĩnh, chúng tôi luôn ở đây.</p>
                  </div>
                </div>
                <button onClick={() => setLostHelpModal({ isOpen: false, data: null })} className="text-white/80 hover:text-white bg-white/10 hover:bg-white/20 rounded-full p-1.5 transition-colors shrink-0">
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="p-6 flex flex-col gap-5">
              <p className="text-slate-600 text-[13px] sm:text-sm font-medium leading-relaxed bg-slate-50 p-4 rounded-xl border border-slate-100 shadow-inner">
                Hệ thống ghi nhận bạn đang tìm đường tới <strong className="text-slate-800 text-[15px]">{lostHelpModal.data?.room}</strong> thuộc <strong className="text-slate-800">{lostHelpModal.data?.deptName}</strong>. Vui lòng chọn phương thức kết nối tức thì:
              </p>

              <div className="flex flex-col gap-3">
                <button
                  onClick={() => {
                    window.location.href = 'tel:0828433249';
                    setLostHelpModal({ isOpen: false, data: null });
                  }}
                  className="w-full flex items-center gap-4 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 p-4 rounded-2xl transition-colors group text-left cursor-pointer"
                >
                  <div className="w-12 h-12 bg-emerald-500 rounded-full flex items-center justify-center shrink-0 shadow-md group-hover:scale-110 transition-transform">
                    <PhoneCall className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h4 className="font-bold text-emerald-800 text-[15px]">Gọi Kênh Hỗ Trợ Âm thanh</h4>
                    <p className="text-[11px] text-emerald-600/80 font-bold mt-0.5">Hotline: 0828.433.249</p>
                  </div>
                </button>

                <button
                  onClick={() => {
                    setLostHelpModal({ isOpen: false, data: null });
                    setEmergencyChat(prev => ({ ...prev, isOpen: true }));
                  }}
                  className="w-full flex items-center gap-4 bg-blue-50 hover:bg-blue-100 border border-blue-200 p-4 rounded-2xl transition-colors group text-left relative overflow-hidden cursor-pointer"
                >
                  <div className="absolute top-2 right-3 w-2 h-2 bg-blue-500 rounded-full animate-ping"></div>
                  <div className="absolute top-2 right-3 w-2 h-2 bg-blue-600 rounded-full"></div>
                  <div className="w-12 h-12 bg-blue-600 rounded-full flex items-center justify-center shrink-0 shadow-md group-hover:scale-110 transition-transform">
                    <MessageSquare className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h4 className="font-bold text-blue-800 text-[15px]">Chat Trực Tiếp Hình Ảnh</h4>
                    <p className="text-[11px] text-blue-600/80 font-bold mt-0.5">Nhân viên sẽ gửi ảnh rẽ nhánh</p>
                  </div>
                </button>
              </div>

              <div className="border-t border-slate-100 pt-4 mt-1">
                <button onClick={() => setLostHelpModal({ isOpen: false, data: null })} className="w-full py-3 bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-700 font-bold rounded-xl text-[11px] uppercase tracking-wider transition-colors cursor-pointer ring-1 ring-slate-200 ring-inset">
                  Tôi sẽ tự xem lại Tọa Độ Bản Đồ (Hủy)
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* EMERGENCY CHAT UI (SLIDE DOWN FROM TOP) */}
      {emergencyChat.isOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[110] flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-300">
          <div className="bg-white w-full h-[85vh] sm:h-[600px] sm:max-w-md sm:rounded-3xl rounded-t-3xl shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-bottom-full sm:zoom-in-95 duration-300">
            {/* Chat Header */}
            <div className="bg-blue-600 px-4 py-3 sm:py-4 flex items-center justify-between shadow-md relative z-10">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full flex flex-col items-center justify-center relative overflow-hidden shadow-sm shrink-0 border border-white/20">
                  <div className="absolute top-0 right-0 w-2.5 h-2.5 bg-emerald-400 border-2 border-blue-600 rounded-full z-10"></div>
                  <img src="/staff_avatar.jpg" alt="Support Staff Avatar" className="w-full h-full object-cover" />
                </div>
                <div>
                  <h3 className="text-white font-bold text-sm sm:text-base leading-tight">BP. Trực Ban Hỗ Trợ</h3>
                  <p className="text-blue-100 text-[11px] font-medium">Trực tuyến - Đang theo dõi bạn</p>
                </div>
              </div>
              <button onClick={() => setEmergencyChat(prev => ({ ...prev, isOpen: false }))} className="text-white/80 hover:text-white bg-white/10 hover:bg-white/20 rounded-full p-2 transition-colors">
                <ChevronDown className="w-5 h-5" />
              </button>
            </div>

            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto p-4 bg-slate-50 flex flex-col gap-3">
              {emergencyChat.messages.length === 0 && (
                <p className="text-center text-xs text-slate-400 font-medium my-auto italic px-6">
                  Đường truyền Y tế trực tiếp đã mở. Bạn có thể Bấm vào Icon máy ảnh để chụp và gửi quang cảnh xung quanh nơi bạn đang đứng cho nhân viên!
                </p>
              )}
              {emergencyChat.messages.map((msg, idx) => {
                const isOurs = msg.sender === 'PATIENT';
                return (
                  <div key={idx} className={`flex max-w-[85%] ${isOurs ? 'self-end bg-blue-600 text-white rounded-l-2xl rounded-tr-2xl' : 'self-start bg-white border border-slate-200 text-slate-700 rounded-r-2xl rounded-tl-2xl shadow-sm'} px-4 py-2.5 flex-col gap-1`}>
                    {msg.isPhoto ? (
                      <div className="w-full bg-slate-200/50 rounded-lg flex items-center justify-center mb-1 overflow-hidden border border-white/20 relative">
                        {msg.photoUrl && msg.photoUrl.startsWith('data:image') ? (
                          <img src={msg.photoUrl} alt="Snapshot" className="w-full h-auto object-cover rounded-md max-h-48" />
                        ) : (
                          <div className="h-32 w-full flex flex-col items-center justify-center">
                            <Map className={`w-8 h-8 ${isOurs ? 'text-white/50' : 'text-slate-400'}`} />
                            <div className="absolute bottom-2 right-2 bg-black/60 rounded px-1.5 py-0.5 text-[9px] text-white">Bản Đồ Dữ Liệu</div>
                          </div>
                        )}
                      </div>
                    ) : null}
                    <p className="text-[13px] leading-relaxed break-words">{msg.text}</p>
                    <div className="flex justify-end gap-1 items-center mt-0.5">
                      <span className={`text-[9px] font-medium ${isOurs ? 'text-blue-200' : 'text-slate-400'}`}>
                        {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                      {isOurs && msg.timestamp <= staffSeenTimestamp && (
                        <CheckCircle2 className="w-3 h-3 text-blue-200" />
                      )}
                    </div>
                  </div>
                )
              })}
              {staffTyping && (
                <div className="self-start bg-white border border-slate-200 text-slate-500 rounded-r-2xl rounded-tl-2xl shadow-sm px-4 py-2 flex items-center justify-center gap-1 w-fit max-w-[85%]">
                  <div className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce"></div>
                  <div className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce delay-75"></div>
                  <div className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce delay-150"></div>
                </div>
              )}
            </div>

            {/* Chat Input Bar */}
            <div className="bg-white border-t border-slate-200 p-3 flex gap-2 items-end shrink-0 sm:pb-3 pb-8">
              <input
                type="file"
                accept="image/*"
                id="cameraInput"
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
                        sendPatientMessage(null, canvas.toDataURL('image/jpeg', 0.8));
                      };
                      img.src = ev.target.result;
                    };
                    reader.readAsDataURL(file);
                  }
                }}
              />
              <label
                htmlFor="cameraInput"
                className="w-10 h-10 bg-slate-100 hover:bg-slate-200 rounded-full flex items-center justify-center shrink-0 text-slate-500 transition-colors cursor-pointer shadow-sm"
              >
                <Camera className="w-5 h-5" />
              </label>
              <textarea
                value={emergencyChat.inputText}
                onChange={(e) => {
                  setEmergencyChat(prev => ({ ...prev, inputText: e.target.value }));
                  if (socket && selectedTicket) socket.emit('emergency_chat_typing', { ticketId: selectedTicket.ticketId, sender: 'PATIENT' });
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendPatientMessage(emergencyChat.inputText); }
                }}
                placeholder="Viết tin nhắn cho Y tá..."
                className="flex-1 bg-slate-100 border-none focus:ring-0 rounded-xl px-4 py-2.5 text-sm resize-none h-10 max-h-24 css-scrollbar text-slate-800"
              />
              <button
                onClick={() => sendPatientMessage(emergencyChat.inputText)}
                disabled={!emergencyChat.inputText.trim()}
                className="w-10 h-10 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded-full flex items-center justify-center shrink-0 text-white shadow-md transition-colors"
              >
                <Send className="w-4 h-4 ml-0.5" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* GLOBAL FLOATING SOS BUTTON */}
      {selectedTicket && !lostHelpModal.isOpen && !emergencyChat.isOpen && (
        <button
          onClick={() => setLostHelpModal({
            isOpen: true,
            data: {
              room: "Vị trí không xác định",
              deptName: "Khu vực Cảnh báo chung"
            }
          })}
          className="fixed bottom-6 right-6 w-14 h-14 bg-rose-600 rounded-full shadow-rose flex items-center justify-center hover:bg-rose-700 hover:scale-105 transition-all text-white z-40 border-4 border-rose-200 shadow-[0_0_20px_rgba(225,29,72,0.6)] animate-pulse cursor-pointer group"
        >
          <AlertCircle className="w-6 h-6 group-hover:animate-ping absolute opacity-50" />
          <AlertCircle className="w-7 h-7 relative z-10" />
        </button>
      )}

      {/* APPROVED TICKET MODAL */}
      {approvedTicketAlert && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[200] flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-sm overflow-hidden shadow-2xl animate-in zoom-in duration-300">
            <div className="bg-emerald-500 px-6 py-8 relative overflow-hidden flex flex-col items-center text-center">
              <div className="w-16 h-16 bg-white rounded-full flex flex-col items-center justify-center shadow-lg relative z-10 mb-4 animate-[bounce_1s_ease-in-out_infinite]">
                <CheckCircle2 className="w-10 h-10 text-emerald-500" />
              </div>
              <h2 className="text-white font-black text-2xl uppercase tracking-wider relative z-10">ĐÃ DUYỆT!</h2>
              <p className="text-emerald-50 font-medium text-sm mt-1 mb-2 relative z-10">Hồ sơ của bạn đã được thiết lập lộ trình</p>

              <div className="absolute top-0 right-0 w-32 h-32 bg-white opacity-20 rounded-full blur-2xl transform translate-x-10 -translate-y-10"></div>
              <div className="absolute bottom-0 left-0 w-32 h-32 bg-white opacity-20 rounded-full blur-2xl transform -translate-x-10 translate-y-10"></div>
            </div>
            <div className="p-6 flex flex-col items-center gap-2">
              <p className="text-slate-500 text-sm font-semibold uppercase tracking-widest text-center mt-2">Mã Khám Bệnh Chuyên Khoa</p>
              <div className="bg-emerald-50 border-2 border-emerald-500 text-emerald-700 px-8 py-3 rounded-2xl text-4xl font-black tracking-widest shadow-sm my-2 text-center w-full">
                {approvedTicketAlert.ticketId}
              </div>
              <p className="text-slate-500 text-xs italic text-center mb-4">Tự động điều hướng sau 5 giây...</p>
              <button
                onClick={() => setApprovedTicketAlert(null)}
                className="w-full py-3.5 bg-slate-800 hover:bg-slate-900 text-white font-bold rounded-xl transition duration-200 cursor-pointer shadow-md"
              >
                BẮT ĐẦU VÀO XEM LỘ TRÌNH KHÁM
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
