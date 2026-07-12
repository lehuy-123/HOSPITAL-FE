import React, { useState, useRef, useEffect } from 'react';
import { Bot, X, Send, User, ChevronDown, MessageSquare } from 'lucide-react';

export default function AIChatBot({ departments = [], apiBase }) {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([
    { id: 1, text: 'Xin chào! Tôi là Chon thuii 🦖🦖 . Tôi có thể giải đáp thông tin gì cho bạn hôm nay (Hotline, sơ đồ các khoa phòng, giá dịch vụ, thủ tục nhập viện...)?', isBot: true }
  ]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping]);

  const handleSend = () => {
    if (!input.trim()) return;

    // Check if waiting for active AI response
    if (isTyping) return;

    const userMsg = { id: Date.now(), text: input, isBot: false };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsTyping(true);

    // Simulate AI thinking time
    setTimeout(async () => {
      const response = await getBotResponse(userMsg.text);
      setMessages(prev => [...prev, { id: Date.now(), text: response, isBot: true }]);
      setIsTyping(false);
    }, 1200);
  };

  // Helper function to remove Vietnamese accents for typo-tolerant searching
  const removeAccents = (str) => {
    return str.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D');
  };

  const getBotResponse = async (text) => {
    const lower = text.toLowerCase();
    const noAccentLower = removeAccents(lower);

    // 0. EMERGENCY OVERRIDE (Cấp cứu khẩn cấp)
    const emergencies = ['mau', 'chay mau', 'ngat', 'xiu', 'kho tho', 'dau nguc', 'dot quy', 'tai bien', 'vo oi', 'bong', 'ngong', 'co giat'];
    if (emergencies.some(e => noAccentLower.includes(e))) {
      return '🚨 **CẢNH BÁO KHẨN CẤP** 🚨\nTriệu chứng của bạn cần xử lý y tế NGAY LẬP TỨC!\n👉 **BỎ QUA LẤY SỐ!** Vui lòng di chuyển hoặc nhờ người thân đưa thẳng xuống **TẦNG TRỆT - KHOA CẤP CỨU**.\n📞 Nếu không thể di chuyển, gọi ngay: **028 3812 3456** để xe lăn ra đón!';
    }

    // Mapping Constants for floor parsing
    const FLOORS = [
      { level: 6, label: 'F6', name: 'Tầng 6: Cận Lâm Sàng & Xét Nghiệm', matches: ['Khối Cận Lâm Sàng'] },
      { level: 5, label: 'F5', name: 'Tầng 5: Chuyên Khoa Tổng Hợp', matches: ['Khối Chuyên khoa & Dịch vụ tổng hợp'] },
      { level: 4, label: 'F4', name: 'Tầng 4: Sản - Nhi', matches: ['Khối Sản - Nhi'] },
      { level: 3, label: 'F3', name: 'Tầng 3: Ngoại Khoa & Phẫu Thuật', matches: ['Khối Ngoại Khoa', 'Khối Ngoại khoa'] },
      { level: 2, label: 'F2', name: 'Tầng 2: Nội Khoa', matches: ['Khối Nội Khoa', 'Khối Nội khoa'] },
      { level: 1, label: 'F1', name: 'Tầng Trệt: Tiếp Nhận & Cấp Cứu', matches: ['Khối Tiếp Nhận & Cấp Cứu', 'Khối Tiếp nhận & Cấp cứu'] }
    ];

    const DEPARTMENTS_Categories = {
      'Khoa Khám bệnh': 'Khối Tiếp Nhận & Cấp Cứu', 'Khoa Cấp cứu': 'Khối Tiếp Nhận & Cấp Cứu',
      'Khoa Lão': 'Khối Nội Khoa', 'Khoa Lọc máu': 'Khối Nội Khoa', 'Khoa Nội Thần kinh': 'Khối Nội Khoa', 'Khoa Dinh dưỡng': 'Khối Nội Khoa', 'Khoa Nội hô hấp': 'Khối Nội Khoa', 'Khoa Y học cổ truyền': 'Khối Nội Khoa', 'Khoa Nội tiết - Thận': 'Khối Nội Khoa', 'Khoa Nội Tim mạch': 'Khối Nội Khoa', 'Khoa Hồi sức tích cực - Chống độc': 'Khối Nội Khoa', 'Khoa Nội Tiêu hóa': 'Khối Nội Khoa', 'Khoa Tim mạch can thiệp': 'Khối Nội Khoa', 'Khoa Hồi sức tim mạch': 'Khối Nội Khoa', 'Khoa Nội cơ xương khớp': 'Khối Nội Khoa',
      'Khoa Ngoại thần kinh': 'Khối Ngoại Khoa', 'Khoa Ngoại lồng ngực - Mạch máu': 'Khối Ngoại Khoa', 'Khoa Vật lý trị liệu - Phục hồi chức năng': 'Khối Ngoại Khoa', 'Khoa Phẫu thuật tim': 'Khối Ngoại Khoa', 'Khoa Gây mê hồi sức': 'Khối Ngoại Khoa', 'Khoa Ngoại tiêu hóa': 'Khối Ngoại Khoa', 'Khoa Ngoại Thận - Tiết niệu': 'Khối Ngoại Khoa', 'Khoa Tổng hợp': 'Khối Ngoại Khoa', 'Khoa Ngoại chấn thương chỉnh hình': 'Khối Ngoại Khoa', 'Khoa Ngoại Gan - Mật - Tụy': 'Khối Ngoại Khoa',
      'Khoa Sản phụ': 'Khối Sản - Nhi', 'Khoa Sản thường': 'Khối Sản - Nhi', 'Khoa Sản bệnh': 'Khối Sản - Nhi', 'Khoa Sanh': 'Khối Sản - Nhi', 'Khoa Nhi': 'Khối Sản - Nhi', 'Khoa Bệnh lý sơ sinh': 'Khối Sản - Nhi',
      'Khoa Mắt': 'Khối Chuyên khoa & Dịch vụ tổng hợp', 'Khoa Răng Hàm Mặt': 'Khối Chuyên khoa & Dịch vụ tổng hợp', 'Khoa Tai Mũi Họng': 'Khối Chuyên khoa & Dịch vụ tổng hợp',
      'Khoa Sinh hóa Huyết học': 'Khối Cận Lâm Sàng', 'Khoa Giải phẫu bệnh': 'Khối Cận Lâm Sàng', 'Khoa Kiểm soát Nhiễm khuẩn': 'Khối Cận Lâm Sàng', 'Khoa Nội soi - Thăm dò chức năng': 'Khối Cận Lâm Sàng', 'Khoa Dược': 'Khối Cận Lâm Sàng', 'Khoa Vi sinh': 'Khối Cận Lâm Sàng', 'Khoa Chẩn đoán hình ảnh': 'Khối Cận Lâm Sàng'
    };

    const SYMPTOM_MAP = {
      'mat': 'Khoa Mắt', 'nhin mo': 'Khoa Mắt', 'can thi': 'Khoa Mắt', 'do mat': 'Khoa Mắt',
      'tai': 'Khoa Tai Mũi Họng', 'mui': 'Khoa Tai Mũi Họng', 'hong': 'Khoa Tai Mũi Họng', 'ho': 'Khoa Tai Mũi Họng',
      'da': 'Khoa Khám bệnh', 'ngua': 'Khoa Khám bệnh', 'noi man': 'Khoa Khám bệnh', 'mun': 'Khoa Khám bệnh',
      'rang': 'Khoa Răng Hàm Mặt', 'nhu': 'Khoa Răng Hàm Mặt', 'nho rang': 'Khoa Răng Hàm Mặt',
      'tim': 'Khoa Nội Tim mạch', 'huyet ap': 'Khoa Nội Tim mạch', 'met': 'Khoa Nội Tim mạch',
      'tieu hoa': 'Khoa Nội Tiêu hóa', 'dau bung': 'Khoa Nội Tiêu hóa', 'da day': 'Khoa Nội Tiêu hóa', 'tieu chay': 'Khoa Nội Tiêu hóa', 'non': 'Khoa Nội Tiêu hóa',
      'ho hap': 'Khoa Nội hô hấp', 'hen suyen': 'Khoa Nội hô hấp', 'viem phoi': 'Khoa Nội hô hấp',
      'than kinh': 'Khoa Nội Thần kinh', 'dau dau': 'Khoa Nội Thần kinh', 'chong mat': 'Khoa Nội Thần kinh', 'mat ngu': 'Khoa Nội Thần kinh',
      'xuong': 'Khoa Nội cơ xương khớp', 'khop': 'Khoa Nội cơ xương khớp', 'dau lung': 'Khoa Nội cơ xương khớp', 'te tay': 'Khoa Nội cơ xương khớp',
      'gay xuong': 'Khoa Ngoại chấn thương chỉnh hình', 'chan thuong': 'Khoa Ngoại chấn thương chỉnh hình',
      'sot': 'Khoa Khám bệnh', 'kham tong quat': 'Khoa Khám bệnh', 'cam cum': 'Khoa Khám bệnh', 'met mỏi': 'Khoa Khám bệnh',
      'mang thai': 'Khoa Sanh', 'bau': 'Khoa Sanh', 'phu khoa': 'Khoa Sản phụ', 'kham thai': 'Khoa Sản bệnh',
      'tre em': 'Khoa Nhi', 'em be': 'Khoa Nhi', 'so sinh': 'Khoa Bệnh lý sơ sinh',
      'tieu duong': 'Khoa Nội tiết - Thận', 'than': 'Khoa Lọc máu', 'tieu buot': 'Khoa Ngoại Thận - Tiết niệu',
      'xet nghiem': 'Khoa Sinh hóa Huyết học', 'lay mau': 'Khoa Sinh hóa Huyết học', 'thu mau': 'Khoa Sinh hóa Huyết học',
      'sieu am': 'Khoa Chẩn đoán hình ảnh', 'x-quang': 'Khoa Chẩn đoán hình ảnh', 'xquang': 'Khoa Chẩn đoán hình ảnh', 'mri': 'Khoa Chẩn đoán hình ảnh'
    };

    // 1. TICKET LOOKUP & PHONE LOOKUP
    const ticketMatch = lower.match(/(kb-\d+)/i);
    if (ticketMatch) {
      return `👉 Vui lòng nhập mã **${ticketMatch[0].toUpperCase()}** vào thanh "Tra Cứu" ở trên để xem lộ trình chi tiết.`;
    }

    const phoneMatch = lower.match(/(0\d{9})/);
    if (phoneMatch && apiBase) {
      const phone = phoneMatch[1];
      try {
        const res = await fetch(`${apiBase}/api/tickets/track/${phone}`);
        const data = await res.json();
        if (res.ok && data.length > 0) {
           const ticket = data[0]; 
           return `✅ Đã tìm thấy Hồ sơ khám bệnh!\n- Bệnh nhân: **${ticket.name}**\n- Mã sổ khám (KB): **${ticket.ticketId}**\n👉 Vui lòng nhập mã **${ticket.ticketId}** vào ô "Tra Cứu" bên ngoài hệ thống để theo dõi vị trí!`;
        } else {
           return `❌ Hệ thống trực tuyến không tìm thấy mã số khám nào khớp với SĐT ${phone}. Vui lòng kiểm tra lại với mộc Quầy nhận bệnh.`;
        }
      } catch (e) {
         return `❌ Lỗi mạng khi tra cứu SĐT. Tuy nhiên bạn có thể cầm Căn cước công dân đến Quầy hành chính để xin cấp lại mã nghen.`;
      }
    }

    // 2. ROOM ENQUIRY
    const roomMatch = lower.match(/(phòng|p\.|p)\s*(\d{3})/i);
    if (roomMatch) {
      const roomNumber = roomMatch[2];
      const dept = departments.find(d => String(d.roomNumber) === roomNumber);
      if (dept) {
        const queueSize = dept.queue?.length || 0;
        const eta = queueSize * 3; 
        const floorName = FLOORS.find(f => f.matches.includes(DEPARTMENTS_Categories[dept.name.split(' - ')[0]]))?.name || 'Nội bộ';
        
        let response = `📍 Phòng ${roomNumber} (${dept.name}) - **${floorName}**.\n👥 Đang có **${queueSize} người** đợi.`;
        if (queueSize > 8) response += `\n☕ Ước tính chờ **~${eta} phút**. Bạn có thể ghé Căn-tin Trệt nghỉ ngơi.`;
        return response;
      } else {
        return `❌ Không tìm thấy Phòng ${roomNumber}. Vui lòng kiểm tra lại.`;
      }
    }

    // 3. FLOOR ENQUIRY
    const floorMatch = lower.match(/tầng\s*(\d|trệt)/i);
    if (floorMatch) {
      let floorStr = floorMatch[1];
      let level = floorStr === 'trệt' || floorStr === '1' ? 1 : parseInt(floorStr);
      const floorInfo = FLOORS.find(f => f.level === level);
      
      if (floorInfo) {
        const cats = floorInfo.matches;
        const validBaseNames = Object.keys(DEPARTMENTS_Categories).filter(k => cats.includes(DEPARTMENTS_Categories[k]));
        const floorDepts = departments.filter(d => validBaseNames.includes(d.name.split(' - ')[0]));
        const uniqueNames = [...new Set(floorDepts.map(d => d.name.split(' - ')[0]))];

        if (uniqueNames.length > 0) {
          return `📍 **${floorInfo.name}** gồm:\n- ${uniqueNames.join('\n- ')}`;
        } else {
          return `❌ ${floorInfo.name} chưa cập nhật phòng khám online.`;
        }
      }
    }

    // 4. MULTI-INTENT DEPARTMENT OR SYMPTOM FUZZY MATCH
    let matchedDepartments = new Set();
    
    // a. Direct Name Match
    Object.keys(DEPARTMENTS_Categories).forEach(baseName => {
       const looseName = removeAccents(baseName.toLowerCase().replace('khoa ', ''));
       if (noAccentLower.includes(looseName)) matchedDepartments.add(baseName);
    });

    // b. Symptom Dictionary Match (No-accent)
    Object.entries(SYMPTOM_MAP).forEach(([symptom, deptName]) => {
      if (noAccentLower.includes(symptom)) matchedDepartments.add(deptName);
    });

    // Process matched departments (handle Multiple at once!)
    if (matchedDepartments.size > 0) {
      let results = [];
      matchedDepartments.forEach(dept => {
        const subrooms = departments.filter(d => d.name.startsWith(dept));
        if (subrooms.length > 0) {
          const totalWaiting = subrooms.reduce((acc, r) => acc + (r.queue ? r.queue.length : 0), 0);
          const roomList = subrooms.map(r => `P.${r.roomNumber}`).join(', ');
          const floorName = FLOORS.find(f => f.matches.includes(DEPARTMENTS_Categories[dept]))?.name || '';
          const floorLabel = floorName.split(':')[0]; // Just "Tầng 3"
          
          results.push(`⚕️ **${dept}** (${floorLabel})\n📍 Gồm: ${roomList}\n👥 Chờ: **${totalWaiting} người** (` + (totalWaiting * 3 > 30 ? 'Khá đông - Nên lấy số sớm' : 'Đường truyền tốt') + `)`);
        }
      });
      
      if (results.length > 0) {
        return results.join('\n\n');
      } else {
        return `✅ Hệ thống ghi nhận bạn cần khám **${[...matchedDepartments][0]}**, nhưng hiện khu vực đó chưa mở máy lấy số.`;
      }
    }

    // 5. GLOBAL FALLBACK KNOWLEDGE
    if (noAccentLower.includes('hotline') || noAccentLower.includes('lien he') || noAccentLower.includes('tong dai') || noAccentLower.includes('so dt')) {
      return '📞 CSKH: 1900 1234\n🚨 Cấp cứu: 028 3812 3456';
    }
    if (noAccentLower.includes('o dau') || noAccentLower.includes('nam dau') || noAccentLower.includes('so do') || noAccentLower.includes('ban do')) {
      return '📍 Sơ đồ Bệnh viện:\n- Trệt: Cấp Cứu\n- Tầng 2,3: Nội/Ngoại Khoa\n- Tầng 4: Sản Nhi\n- Tầng 5: Chuyên Khoa\n- Tầng 6: Xét Nghiệm';
    }
    if (noAccentLower.includes('giay') || noAccentLower.includes('ho so') || noAccentLower.includes('chuan bi') || noAccentLower.includes('thu tuc')) {
      return '📋 Cần chuẩn bị:\n1. Sổ Khám bệnh\n2. CCCD / CMND\n3. Thẻ BHYT\n4. Xét nghiệm cũ';
    }
    if (noAccentLower.includes('gia') || noAccentLower.includes('chi phi') || noAccentLower.includes('tien') || noAccentLower.includes('bhyt')) {
      return '💰 Bảng giá:\n- Cơ bản (BHYT): ~42.000đ\n- DV: 150k - 300k\n- Chuyên gia: 500k';
    }
    if (noAccentLower.match(/^(chao|hello|hi|xin chao|ê|ai do|hey)/i)) {
      return '👋 Xin chào! Hãy thử nói triệu chứng bệnh (vd: "đau bụng", "sốt cao", "nhức răng"...), Trợ lý AI sẽ kê đơn tuyến đường cho bạn lập tức!';
    }
    if (noAccentLower.match(/^(cam on|thanks|ok|duoc|hieu roi|hay|tuyet)/i)) {
      return 'Dạ không có chi, chúc bạn và gia đình thật nhiều sức khỏe 💙';
    }

    return '🤔 Dạ tôi chưa hiểu rõ. Thử hỏi ngắn gọn: "Tầng 5 có gì?", "Đau răng khám ở đâu?", "Phòng 101"...';
  };

  return (
    <>
      {/* Floating Toggle Button */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="fixed bottom-6 right-6 w-14 h-14 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-full shadow-2xl flex items-center justify-center text-white hover:scale-110 active:scale-95 transition-all z-50 hover:shadow-emerald-500/30"
        >
          <MessageSquare className="w-6 h-6" />
          <div className="absolute top-1 right-1 w-3 h-3 bg-rose-500 rounded-full border-2 border-white animate-pulse"></div>
        </button>
      )}

      {/* Chat Window */}
      {isOpen && (
        <div className="fixed bottom-6 right-6 w-80 sm:w-96 bg-white rounded-3xl shadow-2xl border border-slate-100 flex flex-col z-[120] overflow-hidden animate-in slide-in-from-bottom-5 duration-300 h-[30rem] max-h-[85vh]">
          {/* Header */}
          <div className="bg-gradient-to-r from-emerald-600 to-teal-600 p-4 flex items-center justify-between shadow-sm relative z-10">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center backdrop-blur-sm shadow-inner">
                <Bot className="w-6 h-6 text-white" />
              </div>
              <div>
                <h3 className="text-white font-bold text-sm tracking-wide">Trợ Lý AI Gia Định</h3>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <div className="w-2 h-2 rounded-full bg-emerald-300 animate-pulse"></div>
                  <span className="text-white/80 text-[10px] font-medium uppercase tracking-wider">Luôn Túc Trực (24/7)</span>
                </div>
              </div>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="text-white/70 hover:text-white p-2 hover:bg-white/10 rounded-full transition-colors"
            >
              <ChevronDown className="w-5 h-5" />
            </button>
          </div>

          {/* Messages Area */}
          <div className="flex-1 overflow-y-auto p-4 space-y-5 bg-slate-50 relative scroll-smooth">
            <div className="text-center mb-4">
              <span className="text-[10px] font-bold text-slate-400 bg-white px-3 py-1 rounded-full shadow-sm border border-slate-100 uppercase tracking-wider">Hôm nay</span>
            </div>
            {messages.map((msg) => (
              <div key={msg.id} className={`flex ${msg.isBot ? 'justify-start' : 'justify-end'}`}>
                <div className={`flex gap-3 max-w-[85%] ${msg.isBot ? 'flex-row' : 'flex-row-reverse'}`}>
                  {/* Avatar */}
                  <div className="flex-shrink-0 mt-auto mb-1">
                    {msg.isBot ? (
                      <div className="w-8 h-8 bg-gradient-to-br from-emerald-100 to-teal-100 rounded-full flex items-center justify-center border border-emerald-200/50 shadow-sm">
                        <Bot className="w-4.5 h-4.5 text-teal-600" />
                      </div>
                    ) : (
                      <div className="w-8 h-8 bg-gradient-to-br from-slate-200 to-slate-300 rounded-full flex items-center justify-center shadow-sm">
                        <User className="w-4.5 h-4.5 text-slate-600" />
                      </div>
                    )}
                  </div>

                  {/* Bubble */}
                  <div className={`p-3.5 rounded-2xl text-sm leading-relaxed shadow-sm ${msg.isBot
                    ? 'bg-white border border-slate-100 text-slate-700 rounded-bl-sm'
                    : 'bg-emerald-600 text-white rounded-br-sm'
                    }`}>
                    {msg.text.split('\n').map((line, i) => (
                      <React.Fragment key={i}>
                        {line}
                        {i !== msg.text.split('\n').length - 1 && <br />}
                      </React.Fragment>
                    ))}
                  </div>
                </div>
              </div>
            ))}

            {/* Typing Indicator */}
            {isTyping && (
              <div className="flex justify-start">
                <div className="flex gap-3 max-w-[85%] flex-row">
                  <div className="flex-shrink-0 mt-auto mb-1">
                    <div className="w-8 h-8 bg-gradient-to-br from-emerald-100 to-teal-100 rounded-full flex items-center justify-center border border-emerald-200/50 shadow-sm">
                      <Bot className="w-4.5 h-4.5 text-teal-600" />
                    </div>
                  </div>
                  <div className="p-4 rounded-2xl rounded-bl-sm bg-white border border-slate-100 shadow-sm flex items-center gap-1.5 h-[44px]">
                    <div className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                    <div className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                    <div className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input Area */}
          <div className="p-4 bg-white border-t border-slate-100 relative z-10">
            <div className="flex items-center gap-2 bg-slate-50/50 rounded-2xl p-1.5 border border-slate-200 focus-within:border-emerald-400 focus-within:bg-white focus-within:ring-4 focus-within:ring-emerald-500/10 transition-all shadow-sm">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                placeholder="Hỏi AI về Bệnh viện..."
                className="flex-1 bg-transparent px-4 py-2.5 text-sm font-medium text-slate-700 placeholder:text-slate-400 focus:outline-none"
              />
              <button
                onClick={handleSend}
                disabled={!input.trim() || isTyping}
                className={`p-3 rounded-xl shadow-md transition-all ${input.trim() && !isTyping
                  ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-600/20 cursor-pointer'
                  : 'bg-slate-200 text-slate-400 shadow-none cursor-default'
                  }`}
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
