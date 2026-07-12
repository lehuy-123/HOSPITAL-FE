import React, { useState, useEffect } from 'react';
import { Stethoscope, Users, UserCheck, Play, Check, AlertCircle, Clock } from 'lucide-react';

export default function DoctorView({ departments, onActionTriggered, apiBase }) {
  const DEPARTMENTS_RAW = [
    { id: 'K_KB', name: 'Khoa Khám bệnh', category: 'Khối Tiếp nhận & Cấp cứu' },
    { id: 'K_CC', name: 'Khoa Cấp cứu', category: 'Khối Tiếp nhận & Cấp cứu' },
    { id: 'K_LAO', name: 'Khoa Lão', category: 'Khối Nội khoa' },
    { id: 'K_LOCMAU', name: 'Khoa Lọc máu', category: 'Khối Nội khoa' },
    { id: 'K_NTK', name: 'Khoa Nội Thần kinh', category: 'Khối Nội khoa' },
    { id: 'K_DD', name: 'Khoa Dinh dưỡng', category: 'Khối Nội khoa' },
    { id: 'K_NHH', name: 'Khoa Nội hô hấp', category: 'Khối Nội khoa' },
    { id: 'K_YHCT', name: 'Khoa Y học cổ truyền', category: 'Khối Nội khoa' },
    { id: 'K_NTT', name: 'Khoa Nội tiết - Thận', category: 'Khối Nội khoa' },
    { id: 'K_NTIM', name: 'Khoa Nội Tim mạch', category: 'Khối Nội khoa' },
    { id: 'K_HSTC', name: 'Khoa Hồi sức tích cực - Chống độc', category: 'Khối Nội khoa' },
    { id: 'K_NTH', name: 'Khoa Nội Tiêu hóa', category: 'Khối Nội khoa' },
    { id: 'K_TMCT', name: 'Khoa Tim mạch can thiệp', category: 'Khối Nội khoa' },
    { id: 'K_HSTM', name: 'Khoa Hồi sức tim mạch', category: 'Khối Nội khoa' },
    { id: 'K_NCXK', name: 'Khoa Nội cơ xương khớp', category: 'Khối Nội khoa' },
    { id: 'K_NGTK', name: 'Khoa Ngoại thần kinh', category: 'Khối Ngoại khoa' },
    { id: 'K_NGLN', name: 'Khoa Ngoại lồng ngực - Mạch máu', category: 'Khối Ngoại khoa' },
    { id: 'K_VLTL', name: 'Khoa Vật lý trị liệu - Phục hồi chức năng', category: 'Khối Ngoại khoa' },
    { id: 'K_PTT', name: 'Khoa Phẫu thuật tim', category: 'Khối Ngoại khoa' },
    { id: 'K_GMHS', name: 'Khoa Gây mê hồi sức', category: 'Khối Ngoại khoa' },
    { id: 'K_NGTH', name: 'Khoa Ngoại tiêu hóa', category: 'Khối Ngoại khoa' },
    { id: 'K_NGTN', name: 'Khoa Ngoại Thận - Tiết niệu', category: 'Khối Ngoại khoa' },
    { id: 'K_THOP', name: 'Khoa Tổng hợp', category: 'Khối Ngoại khoa' },
    { id: 'K_NGCT', name: 'Khoa Ngoại chấn thương chỉnh hình', category: 'Khối Ngoại khoa' },
    { id: 'K_NGGMT', name: 'Khoa Ngoại Gan - Mật - Tụy', category: 'Khối Ngoại khoa' },
    { id: 'K_SANPHU', name: 'Khoa Sản phụ', category: 'Khối Sản - Nhi' },
    { id: 'K_SANTH', name: 'Khoa Sản thường', category: 'Khối Sản - Nhi' },
    { id: 'K_SANB', name: 'Khoa Sản bệnh', category: 'Khối Sản - Nhi' },
    { id: 'K_SANH', name: 'Khoa Sanh', category: 'Khối Sản - Nhi' },
    { id: 'K_NHI', name: 'Khoa Nhi', category: 'Khối Sản - Nhi' },
    { id: 'K_BLSS', name: 'Khoa Bệnh lý sơ sinh', category: 'Khối Sản - Nhi' },
    { id: 'K_MAT', name: 'Khoa Mắt', category: 'Khối Chuyên khoa & Dịch vụ tổng hợp' },
    { id: 'K_RHM', name: 'Khoa Răng Hàm Mặt', category: 'Khối Chuyên khoa & Dịch vụ tổng hợp' },
    { id: 'K_TMH', name: 'Khoa Tai Mũi Họng', category: 'Khối Chuyên khoa & Dịch vụ tổng hợp' },
    { id: 'K_SHHH', name: 'Khoa Sinh hóa Huyết học', category: 'Khối Cận Lâm Sàng' },
    { id: 'K_GPB', name: 'Khoa Giải phẫu bệnh', category: 'Khối Cận Lâm Sàng' },
    { id: 'K_KSNK', name: 'Khoa Kiểm soát Nhiễm khuẩn', category: 'Khối Cận Lâm Sàng' },
    { id: 'K_NSTD', name: 'Khoa Nội soi - Thăm dò chức năng', category: 'Khối Cận Lâm Sàng' },
    { id: 'K_DUC', name: 'Khoa Dược', category: 'Khối Cận Lâm Sàng' },
    { id: 'K_VS', name: 'Khoa Vi sinh', category: 'Khối Cận Lâm Sàng' },
    { id: 'K_CDHA', name: 'Khoa Chẩn đoán hình ảnh', category: 'Khối Cận Lâm Sàng' }
  ];

  const [selectedDeptId, setSelectedDeptId] = useState(() => {
    return localStorage.getItem('hq_doctor_selected_dept_id') || '';
  });
  const [selectedBlock, setSelectedBlock] = useState('');
  const [selectedParentDept, setSelectedParentDept] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Sync selectedBlock and selectedParentDept with selectedDeptId on initialization/load
  useEffect(() => {
    if (selectedDeptId && departments.length > 0) {
      const dept = departments.find(d => d.deptId === selectedDeptId);
      if (dept && dept.name.includes(' - ')) {
        const pName = dept.name.split(' - ')[0];
        setSelectedParentDept(pName);
        const rawInfo = DEPARTMENTS_RAW.find(d => d.name === pName);
        if (rawInfo) setSelectedBlock(rawInfo.category);
      }
    }
  }, [selectedDeptId, departments]);

  const blocks = [...new Set(DEPARTMENTS_RAW.map(d => d.category))];
  const deptsInBlock = selectedBlock ? DEPARTMENTS_RAW.filter(d => d.category === selectedBlock) : [];
  
  const subRoomsInDept = selectedParentDept 
    ? departments.filter(d => d.name.startsWith(selectedParentDept + ' - ')) 
    : [];

  const currentDept = departments.find(d => d.deptId === selectedDeptId);

  // Call the next patient in the queue
  const handleCallNext = async () => {
    if (!selectedDeptId) return;
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const res = await fetch(`${apiBase}/api/departments/${selectedDeptId}/call`, {
        method: 'POST',
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || 'Lỗi khi gọi bệnh nhân tiếp theo');
      }

      setSuccess(data.message);
      if (onActionTriggered) {
        onActionTriggered();
      }
    } catch (err) {
      console.error(err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Complete exam for current patient
  const handleComplete = async () => {
    if (!selectedDeptId || !currentDept?.currentTicketId) return;
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const res = await fetch(`${apiBase}/api/departments/${selectedDeptId}/complete`, {
        method: 'POST',
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || 'Lỗi khi hoàn thành khám');
      }

      setSuccess('Đã xác nhận hoàn thành khám cho bệnh nhân.');
      if (onActionTriggered) {
        onActionTriggered();
      }
    } catch (err) {
      console.error(err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 text-left">
      <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-sm border border-slate-100 space-y-6 relative overflow-hidden">
        {/* Subtle decorative background */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-50 rounded-full blur-3xl -z-10 translate-x-1/2 -translate-y-1/2 opacity-60"></div>
        
        {/* Selector title */}
        <div className="space-y-1">
          <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
            <Stethoscope className="text-emerald-600 w-5 h-5" />
            Bác Sĩ Trực Ban & Chẩn Đoán
          </h2>
          <p className="text-slate-500 text-sm">
            Chọn Phòng khám hiện đang trực để theo dõi danh sách hàng đợi ngoài cửa và điều phối lượt khám. Hệ thống tự động lọc danh sách theo từng cấp bậc chuyên môn.
          </p>
        </div>

        {/* Nested Room selection Dropdowns */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
              1. CHỌN KHỐI Y TẾ
            </label>
            <select
              value={selectedBlock}
              onChange={(e) => {
                setSelectedBlock(e.target.value);
                setSelectedParentDept('');
                setSelectedDeptId('');
                localStorage.setItem('hq_doctor_selected_dept_id', '');
                setError('');
                setSuccess('');
              }}
              className="w-full px-4 py-3 rounded-2xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 text-slate-800 font-semibold bg-slate-50/50 cursor-pointer text-sm shadow-sm transition-all"
            >
              <option value="">-- Chọn Khối --</option>
              {blocks.map((block) => (
                <option key={block} value={block}>
                  {block}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
              2. KHOA CHUYÊN MÔN
            </label>
            <select
              value={selectedParentDept}
              disabled={!selectedBlock}
              onChange={(e) => {
                setSelectedParentDept(e.target.value);
                setSelectedDeptId('');
                localStorage.setItem('hq_doctor_selected_dept_id', '');
                setError('');
                setSuccess('');
              }}
              className="w-full px-4 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-rose-350 text-slate-800 font-medium bg-white cursor-pointer text-xs disabled:opacity-50"
            >
              <option value="">-- Chọn Khoa --</option>
              {deptsInBlock.map((dept) => (
                <option key={dept.id} value={dept.name}>
                  {dept.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
              3. PHÒNG LÂM SÀNG
            </label>
            <select
              value={selectedDeptId}
              disabled={!selectedParentDept}
              onChange={(e) => {
                const val = e.target.value;
                setSelectedDeptId(val);
                localStorage.setItem('hq_doctor_selected_dept_id', val);
                setError('');
                setSuccess('');
              }}
              className="w-full px-4 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-rose-350 text-slate-800 font-medium bg-white cursor-pointer disabled:opacity-50 text-xs"
            >
              <option value="">
                {selectedParentDept ? '-- Chọn Phòng Trực --' : '-- Chờ chọn Khoa --'}
              </option>
              {subRoomsInDept.map((dept) => (
                <option key={dept.deptId} value={dept.deptId}>
                  {dept.name.split(' - ')[1]} ({dept.roomNumber})
                </option>
              ))}
            </select>
          </div>
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
          <Check className="w-5 h-5 flex-shrink-0" />
          <span>{success}</span>
        </div>
      )}

      {selectedDeptId ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Left panel: Active patient slot */}
          <div className="bg-white rounded-2xl p-4 sm:p-6 shadow-sm border border-slate-100 md:col-span-1 flex flex-col justify-between min-h-[300px]">
            <div>
              <div className="flex justify-between items-center pb-3 border-b border-slate-100 mb-4">
                <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wide">Đang Trong Phòng</h3>
                <span className="w-2 h-2 bg-rose-500 rounded-full animate-ping"></span>
              </div>

              {currentDept?.currentTicketId ? (
                <div className="space-y-4">
                  <div className="text-center py-6 bg-gradient-to-b from-white to-slate-50/50 rounded-2xl border border-slate-200 shadow-sm relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-full h-1 bg-emerald-500"></div>
                    <p className="text-[10px] font-bold text-slate-400 tracking-widest uppercase mb-1">MÃ PHIÊN KHÁM</p>
                    <p className="text-4xl sm:text-5xl font-black text-emerald-700 font-mono tracking-tight">
                      {currentDept.currentTicketId}
                    </p>
                  </div>

                  <div className="space-y-2 text-sm text-slate-700">
                    <p>
                      <span className="font-semibold text-slate-400 text-xs block">BỆNH NHÂN</span>
                      <span className="font-bold text-slate-800 text-base">{currentDept.currentTicketDetails?.name}</span>
                    </p>
                    {currentDept.currentTicketDetails?.phone && (
                      <p>
                        <span className="font-semibold text-slate-400 text-xs block">SỐ ĐIỆN THOẠI</span>
                        <span className="font-mono">{currentDept.currentTicketDetails.phone}</span>
                      </p>
                    )}
                    {currentDept.currentTicketDetails?.symptoms && (
                      <p>
                        <span className="font-semibold text-slate-400 text-xs block">TRIỆU CHỨNG</span>
                        <span className="italic text-slate-600 text-xs">{currentDept.currentTicketDetails.symptoms}</span>
                      </p>
                    )}
                  </div>

                  {/* Active Patient Timeline */}
                  {currentDept.currentTicketDetails?.routine && (
                    <div className="border-t border-slate-100 pt-3 mt-3">
                      <p className="text-[10px] font-bold text-slate-400 tracking-wider mb-2">TIẾN TRÌNH KHÁM BỆNH</p>
                      <div className="relative border-l-2 border-slate-150 ml-2 space-y-3 pb-1">
                        {currentDept.currentTicketDetails.routine.map((step, idx) => {
                          const isCurrent = step.deptId === selectedDeptId;
                          const isDone = step.status === 'DONE';

                          const getSubRoomName = (id) => {
                            const dept = departments.find(d => d.deptId === id);
                            return dept ? dept.name : id;
                          };

                          return (
                            <div key={idx} className="relative pl-5 text-left">
                              <span className={`absolute -left-[5px] top-1.5 w-2 h-2 rounded-full ${
                                isDone
                                  ? 'bg-emerald-500'
                                  : isCurrent
                                    ? 'bg-blue-500 ring-2 ring-blue-100 animate-pulse'
                                    : 'bg-slate-200'
                              }`}></span>
                              <div className="text-xs">
                                <span className={`font-semibold ${
                                  isDone 
                                    ? 'text-slate-400 line-through' 
                                    : isCurrent 
                                      ? 'text-blue-700 font-bold' 
                                      : 'text-slate-650'
                                }`}>
                                  {getSubRoomName(step.deptId)}
                                </span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="py-12 text-slate-400 text-center flex flex-col items-center">
                  <Stethoscope className="w-10 h-10 mb-2 opacity-30" />
                  <p className="text-sm font-semibold">Chưa có bệnh nhân khám</p>
                  <p className="text-xs opacity-75">Click "Gọi bệnh nhân" ở dưới để bắt đầu.</p>
                </div>
              )}
            </div>

            <div className="mt-6 border-t border-slate-100 pt-4">
              {currentDept?.currentTicketId ? (
                <button
                  onClick={handleComplete}
                  disabled={loading}
                  className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-md transition duration-200 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  <Check className="w-5 h-5" />
                  XÁC NHẬN HOÀN THÀNH KHÁM
                </button>
              ) : (
                <button
                  onClick={handleCallNext}
                  disabled={loading || !currentDept || !currentDept.queue || currentDept.queue.length === 0}
                  className="w-full py-3.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-2xl shadow-lg shadow-blue-600/20 transition-all duration-300 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:bg-slate-100 disabled:text-slate-400 disabled:shadow-none hover:-translate-y-0.5"
                >
                  <Play className={`w-5 h-5 fill-current ${currentDept?.queue?.length > 0 ? 'animate-pulse' : ''}`} />
                  GỌI BỆNH NHÂN TIẾP THEO
                </button>
              )}
            </div>
          </div>

          {/* Right panel: Queue listing */}
          <div className="bg-white rounded-2xl p-4 sm:p-6 shadow-sm border border-slate-100 md:col-span-2">
            <h3 className="text-base font-bold text-slate-800 pb-3 border-b border-slate-100 mb-4 flex items-center gap-2 justify-between">
              <span className="flex items-center gap-2">
                <Users className="text-teal-600 w-5 h-5" />
                Hàng Đợi Chờ Gọi Khám ({currentDept?.queue.length || 0} bệnh nhân)
              </span>
              <span className="text-xs font-mono font-bold bg-slate-100 text-slate-600 px-2 py-0.5 rounded">
                {currentDept?.roomNumber}
              </span>
            </h3>

            {!currentDept || !currentDept.queue || currentDept.queue.length === 0 ? (
              <div className="py-16 text-center text-slate-400 border border-dashed border-slate-200 rounded-xl flex flex-col items-center">
                <Clock className="w-8 h-8 mb-2 opacity-40" />
                <p className="text-sm font-semibold">Hàng đợi ngoài cửa đang trống</p>
                <p className="text-xs opacity-75">Tất cả bệnh nhân đăng ký phòng khám này đã được gọi.</p>
              </div>
            ) : (
              <div className="space-y-2.5 max-h-[350px] overflow-y-auto pr-1">
                {currentDept?.queueDetails?.map((patient, idx) => (
                  <div
                    key={patient.ticketId}
                    className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-xl border border-slate-200 mt-2 bg-white"
                  >
                    <div className="flex items-center gap-3">
                      <span className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm border ${
                        idx === 0
                          ? 'bg-blue-600 text-white border-blue-600'
                          : 'bg-white text-slate-500 border-slate-300'
                      }`}>
                        {idx + 1}
                      </span>
                      <div>
                        <p className="font-bold text-slate-800 text-sm">
                          {patient.name}
                        </p>
                        <p className="text-xs text-slate-400 font-mono">SĐT: {patient.phone}</p>
                      </div>
                    </div>

                    <div className="flex items-center justify-between sm:justify-end gap-2 w-full sm:w-auto pt-2.5 sm:pt-0">
                      <span className={`text-[11px] font-bold px-2 py-0.5 rounded-md font-mono ${
                        idx === 0 
                          ? 'bg-blue-50 text-blue-700' 
                          : 'bg-white text-slate-500 border border-slate-200'
                      }`}>
                        {patient.ticketId}
                      </span>
                      {idx === 0 && (
                        <button
                          onClick={handleCallNext}
                          disabled={loading}
                          className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1 cursor-pointer transition select-none"
                        >
                          <Play className="w-3 h-3 fill-current" /> Gọi vào
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="bg-slate-50 border border-dashed border-slate-200 rounded-2xl py-16 text-slate-450 flex flex-col items-center justify-center">
          <Stethoscope className="w-12 h-12 text-slate-350 mb-2" />
          <p className="text-base font-semibold text-slate-700">Chưa Đăng Ký Trực Phòng Khám</p>
          <p className="text-sm text-slate-550 opacity-90 max-w-sm text-center mt-1">
            Vui lòng chọn phòng ban trực của bạn ở góc phải phía trên để theo dõi dữ liệu và điều hành phòng khám.
          </p>
        </div>
      )}
    </div>
  );
}
