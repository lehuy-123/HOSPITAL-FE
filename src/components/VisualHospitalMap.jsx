import React, { useState, useEffect } from 'react';
import { Target, Layers, Building, MapPin, ArrowRight, ArrowLeft, ArrowUp, ArrowDown, Navigation2, CornerUpLeft, CornerUpRight } from 'lucide-react';

export default function VisualHospitalMap({ departmentName, roomNumber }) {
  const roomString = roomNumber?.toString() || '';

  // Parse format like 'Phòng B211' or 'B211'
  const match = roomString.match(/([A-F])(\d)(\d{2})/i);

  let initialToa = 'A';
  let initialFloor = 1;
  let targetRoomCode = '';

  if (match) {
    initialToa = match[1].toUpperCase();
    initialFloor = parseInt(match[2], 10);
    const roomSub = parseInt(match[3], 10);
    targetRoomCode = `${initialToa}${initialFloor}${roomSub}`;
  } else {
    // Fallback if not new format
    const legacyRoomNum = parseInt(roomString.replace(/\D/g, '')) || 0;
    if (legacyRoomNum > 0) {
      initialFloor = Math.max(1, Math.floor(legacyRoomNum / 100));
      targetRoomCode = legacyRoomNum.toString();
    }
  }

  const [viewToa, setViewToa] = useState(initialToa);
  const [viewFloor, setViewFloor] = useState(initialFloor);

  useEffect(() => {
    setViewToa(initialToa);
    setViewFloor(initialFloor);
  }, [initialToa, initialFloor]);

  const isTargetFloorView = (viewFloor === initialFloor) && (viewToa === initialToa);

  // HARDWARE REAL-TIME GPS EXTENSION FOR FLOOR MAP
  const [gpsTracker, setGpsTracker] = useState({ active: true, x: 0, y: 0, baseLat: null, baseLng: null });
  const [compassAngle, setCompassAngle] = useState(0);

  useEffect(() => {
    let watchId;
    if (gpsTracker.active && "geolocation" in navigator) {
      watchId = navigator.geolocation.watchPosition(
        (pos) => {
          const { latitude, longitude } = pos.coords;
          setGpsTracker(prev => {
            if (prev.baseLat === null) {
              return { ...prev, baseLat: latitude, baseLng: longitude };
            }
            // Translate real geolocation speed deltas into corridor progression
            const deltaY_m = (latitude - prev.baseLat) * 111320;
            const deltaX_m = (longitude - prev.baseLng) * 111320 * Math.cos(latitude * Math.PI / 180);
            return { ...prev, x: deltaX_m * 3.0, y: -deltaY_m * 3.0 }; // Sensitivity multiplier
          });
        },
        (err) => console.warn("GPS Tracking Error: ", err),
        { enableHighAccuracy: true, maximumAge: 0, timeout: 5000 }
      );
    }

    // Live Device Orientation integration for Compass Vector
    const handleOrientation = (event) => {
      let heading = 0;
      if (event.webkitCompassHeading) {
        heading = event.webkitCompassHeading;
      } else if (event.alpha !== null) {
        heading = 360 - event.alpha;
      }
      setCompassAngle(heading);
    };

    if (window.DeviceOrientationEvent) {
      window.addEventListener('deviceorientationabsolute', handleOrientation);
      window.addEventListener('deviceorientation', handleOrientation);
    }

    return () => {
      if (watchId) navigator.geolocation.clearWatch(watchId);
      window.removeEventListener('deviceorientationabsolute', handleOrientation);
      window.removeEventListener('deviceorientation', handleOrientation);
    };
  }, [gpsTracker.active]);

  const TOA_NAMES = {
    'A': 'Tiếp nhận & Cấp cứu',
    'B': 'Nội Khoa',
    'C': 'Ngoại Khoa',
    'D': 'Sản - Nhi',
    'E': 'Chuyên Khoa',
    'F': 'Cận Lâm Sàng'
  };

  const DEPARTMENTS_RAW = [
    { name: 'Khoa Khám bệnh', toa: 'A', floor: 1, blockBase: 10 },
    { name: 'Khoa Cấp cứu', toa: 'A', floor: 1, blockBase: 20 },
    { name: 'Quầy Phát Thuốc Ngoại Trú', toa: 'A', floor: 1, blockBase: 90 },
    { name: 'Khoa Lão', toa: 'B', floor: 1, blockBase: 10 },
    { name: 'Khoa Lọc máu', toa: 'B', floor: 1, blockBase: 20 },
    { name: 'Khoa Dinh dưỡng', toa: 'B', floor: 1, blockBase: 30 },
    { name: 'Khoa Nội hô hấp', toa: 'B', floor: 2, blockBase: 10 },
    { name: 'Khoa Y học cổ truyền', toa: 'B', floor: 2, blockBase: 20 },
    { name: 'Khoa Nội tiết - Thận', toa: 'B', floor: 2, blockBase: 30 },
    { name: 'Khoa Nội Tim mạch', toa: 'B', floor: 3, blockBase: 10 },
    { name: 'Khoa Hồi sức tích cực - Chống độc', toa: 'B', floor: 3, blockBase: 20 },
    { name: 'Khoa Hồi sức tim mạch', toa: 'B', floor: 3, blockBase: 30 },
    { name: 'Khoa Nội Tiêu hóa', toa: 'B', floor: 4, blockBase: 10 },
    { name: 'Khoa Nội Thần kinh', toa: 'B', floor: 4, blockBase: 20 },
    { name: 'Khoa Nội cơ xương khớp', toa: 'B', floor: 4, blockBase: 30 },
    { name: 'Khoa Tổng hợp', toa: 'C', floor: 1, blockBase: 10 },
    { name: 'Khoa Vật lý trị liệu - Phục hồi chức năng', toa: 'C', floor: 1, blockBase: 20 },
    { name: 'Khoa Ngoại thần kinh', toa: 'C', floor: 2, blockBase: 10 },
    { name: 'Khoa Ngoại tiêu hóa', toa: 'C', floor: 2, blockBase: 20 },
    { name: 'Khoa Ngoại Gan - Mật - Tụy', toa: 'C', floor: 2, blockBase: 30 },
    { name: 'Khoa Ngoại chấn thương chỉnh hình', toa: 'C', floor: 3, blockBase: 10 },
    { name: 'Khoa Ngoại Thận - Tiết niệu', toa: 'C', floor: 3, blockBase: 20 },
    { name: 'Khoa Phẫu thuật tim', toa: 'C', floor: 4, blockBase: 10 },
    { name: 'Khoa Gây mê hồi sức', toa: 'C', floor: 4, blockBase: 20 },
    { name: 'Khoa Ngoại lồng ngực - Mạch máu', toa: 'C', floor: 4, blockBase: 30 },
    { name: 'Khoa Sản thường', toa: 'D', floor: 1, blockBase: 10 },
    { name: 'Khoa Sản bệnh', toa: 'D', floor: 1, blockBase: 20 },
    { name: 'Khoa Sản phụ', toa: 'D', floor: 2, blockBase: 10 },
    { name: 'Khoa Sanh', toa: 'D', floor: 2, blockBase: 20 },
    { name: 'Khoa Nhi', toa: 'D', floor: 3, blockBase: 10 },
    { name: 'Khoa Bệnh lý sơ sinh', filterToa: 'D', floor: 3, blockBase: 20 },
    { name: 'Khoa Mắt', toa: 'E', floor: 1, blockBase: 10 },
    { name: 'Khoa Răng Hàm Mặt', toa: 'E', floor: 1, blockBase: 20 },
    { name: 'Khoa Tai Mũi Họng', toa: 'E', floor: 1, blockBase: 30 },
    { name: 'Khoa Chẩn đoán hình ảnh', toa: 'F', floor: 1, blockBase: 10 },
    { name: 'Khoa Sinh hóa Huyết học', toa: 'F', floor: 1, blockBase: 20 },
    { name: 'Khoa Nội soi - Thăm dò chức năng', toa: 'F', floor: 2, blockBase: 10 },
    { name: 'Khoa Dược', toa: 'F', floor: 2, blockBase: 20 },
    { name: 'Khoa Giải phẫu bệnh', toa: 'F', floor: 3, blockBase: 10 },
    { name: 'Khoa Kiểm soát Nhiễm khuẩn', toa: 'F', floor: 3, blockBase: 20 },
    { name: 'Khoa Vi sinh', toa: 'F', floor: 3, blockBase: 30 }
  ];

  // Inject Centralized Testing Labs so the Graphic Engine renders them per floor
  ['B', 'C', 'D', 'E', 'F'].forEach(toa => {
    [1, 2, 3, 4].forEach(floor => {
      DEPARTMENTS_RAW.push({
        name: `Trung tâm Lấy mẫu Xét nghiệm Tầng ${floor}`,
        toa,
        floor,
        blockBase: 95 // Base 95 offset translates mapping rooms +1 to +4 as 96, 97, 98, 99
      });
    });
  });

  DEPARTMENTS_RAW.forEach(d => { if (d.filterToa) d.toa = d.filterToa; });
  const deptsOnFloor = DEPARTMENTS_RAW.filter(d => d.toa === viewToa && d.floor === viewFloor);

  // Precision Linear Strips logic avoiding overlap and maintaining clear V/H corridors
  const isHighDensity = deptsOnFloor.length > 4;
  const canvasHeightStr = isHighDensity ? 'h-[950px]' : 'h-[550px]';
  const horizCorridorTopStr = isHighDensity ? 'top-[390px]' : 'top-[190px]';
  const horizIntersectionHeightStr = isHighDensity ? 'top-[393px]' : 'top-[193px]';

  const getStripConfig = (idx, total) => {
    const slots = [
      { pos: 'top-left', class: 'left-[30px] top-[40px] w-[260px] h-[160px]' },
      { pos: 'top-right', class: 'right-[30px] top-[40px] w-[260px] h-[160px]' },
      { pos: 'bottom-left', class: 'left-[30px] bottom-[40px] w-[260px] h-[160px]' },
      { pos: 'bottom-right', class: 'right-[30px] bottom-[40px] w-[260px] h-[160px]' }
    ];
    if (total <= 2) {
      return [slots[0], slots[2]][idx]; // Top-left, Bottom-left
    }
    if (total === 3) {
      return [slots[0], slots[2], slots[3]][idx]; // Top-left, Bottom-left, Bottom-right
    }
    if (total === 4) {
      return slots[idx]; // All 4 normal slots
    }
    // High-Density Floor Auto-Stacking (Canvas structurally elongated to 950px!)
    return [
      { pos: 'top-left', class: 'left-[30px] top-[40px] w-[260px] h-[160px]' },
      { pos: 'top-right', class: 'right-[30px] top-[40px] w-[260px] h-[160px]' },
      { pos: 'bottom-left-up', class: 'left-[30px] bottom-[210px] w-[260px] h-[160px]' },
      { pos: 'bottom-right-up', class: 'right-[30px] bottom-[210px] w-[260px] h-[160px]' },
      { pos: 'top-left-down', class: 'left-[30px] top-[210px] w-[260px] h-[160px]' },
      { pos: 'top-right-down', class: 'right-[30px] top-[210px] w-[260px] h-[160px]' },
      { pos: 'bottom-left', class: 'left-[30px] bottom-[40px] w-[260px] h-[160px]' },
      { pos: 'bottom-right', class: 'right-[30px] bottom-[40px] w-[260px] h-[160px]' }
    ][idx];
  };

  let navScript = null;
  if (isTargetFloorView && targetRoomCode) {
    const targetDeptIndex = deptsOnFloor.findIndex(d => {
      for (let i = 1; i <= 4; i++) {
        if (`${d.toa}${d.floor}${d.blockBase + i}` === targetRoomCode) return true;
      }
      return false;
    });

    if (targetDeptIndex !== -1) {
      const targetDept = deptsOnFloor[targetDeptIndex];
      const strip = getStripConfig(targetDeptIndex, deptsOnFloor.length);
      const isLeft = strip.pos.includes('left');
      const isTop = strip.pos.includes('top');

      // First turn out of elevator: Left or Right corridor
      const firstTurnIsLeft = isLeft;
      const firstTurnText = isLeft ? 'RẼ TRÁI' : 'RẼ PHẢI';

      // Final turn into the room doorway based on coordinate matrix
      let finalTurnIsLeft = false;
      if (isLeft && isTop) finalTurnIsLeft = false; // Heading West, North is Right
      if (isLeft && !isTop) finalTurnIsLeft = true; // Heading West, South is Left
      if (!isLeft && isTop) finalTurnIsLeft = true; // Heading East, North is Left
      if (!isLeft && !isTop) finalTurnIsLeft = false;// Heading East, South is Right

      const finalTurnText = finalTurnIsLeft ? 'rẽ Trái' : 'rẽ Phải';

      let foundOffset = 1;
      for (let i = 1; i <= 4; i++) {
        if (`${targetDept.toa}${targetDept.floor}${targetDept.blockBase + i}` === targetRoomCode) foundOffset = i;
      }

      // Route Math (Elevator Core to Room Doorway)
      const baseX = isLeft ? 30 : 510; // Left column or Right column
      const roomX = baseX + (foundOffset - 1) * 65 + 32.5; // Centers in 65px room

      const originY = isHighDensity ? 478 : 278; // Elevator Center Y (Central Corridor Axis)
      let roomDoorY = originY;

      const matchesTop = strip.class.match(/top-\[(\d+)px\]/);
      const matchesBottom = strip.class.match(/bottom-\[(\d+)px\]/);
      const canvasHeightNum = isHighDensity ? 950 : 550;

      if (strip.pos.startsWith('bottom') && matchesBottom) {
        roomDoorY = canvasHeightNum - parseInt(matchesBottom[1]) - 160;
      } else if (matchesTop) {
        roomDoorY = parseInt(matchesTop[1]) + 160;
      }

      navScript = {
        firstTurnText,
        firstTurnIsLeft,
        finalTurnText,
        finalTurnIsLeft,
        dept: targetDept.name,
        room: targetRoomCode,
        routeCoords: { startX: 400, startY: originY, midX: roomX, midY: originY, endX: roomX, endY: roomDoorY }
      };
    }
  }

  return (
    <div className="w-full bg-[#f1f5f9] rounded-xl shadow-lg border border-slate-300 overflow-hidden font-sans flex flex-col mt-4">
      <div className="px-3 py-1.5 flex flex-row items-center justify-between bg-[#1e293b] text-white relative z-20 shadow-sm border-b-2 border-slate-600 gap-2">
        <div className="flex items-center gap-1.5 shrink-0">
          <Layers className="w-4 h-4 text-slate-300" />
          <h2 className="text-xs sm:text-sm font-bold tracking-wider uppercase truncate">
            Sơ Đồ Kỹ Thuật
          </h2>
        </div>
        <div className="text-[10px] sm:text-xs font-semibold text-slate-300 truncate text-right">
          <span className="truncate">{isTargetFloorView ? `ĐÍCH: P.${targetRoomCode || roomString.replace('Phòng ', '')}` : `TÒA ${viewToa} TẦNG ${viewFloor}`}</span>
        </div>
      </div>

      {/* HUD Control Bar - COMPACT */}
      <div className="bg-slate-200 border-b border-slate-300 px-3 py-1.5 flex flex-row items-center justify-between z-10 relative shadow-inner overflow-x-auto gap-3">
        <div className="flex gap-1.5 items-center shrink-0">
          <span className="font-bold text-[9px] uppercase tracking-widest text-slate-500">Tòa:</span>
          <div className="flex bg-slate-300 p-0.5 rounded border border-slate-400 gap-0.5">
            {['A', 'B', 'C', 'D', 'E', 'F'].map(t => (
              <button
                key={t} onClick={() => { setViewToa(t); setViewFloor(1); }}
                className={`w-6 h-6 sm:w-7 sm:h-7 font-black text-xs rounded transition-colors shrink-0 flex items-center justify-center ${viewToa === t ? 'bg-slate-800 text-white shadow-sm' : 'bg-white text-slate-700 hover:bg-slate-100'}`}
              >
                {t}
              </button>
            ))}
          </div>
        </div>
        <div className="flex gap-1.5 items-center shrink-0">
          <span className="font-bold text-[9px] uppercase tracking-widest text-slate-500">Tầng:</span>
          <div className="flex bg-slate-300 p-0.5 rounded border border-slate-400 gap-0.5">
            {[4, 3, 2, 1].filter(f => DEPARTMENTS_RAW.some(d => d.toa === viewToa && d.floor === f) || f === 1).map(f => (
              <button
                key={f} onClick={() => { setViewFloor(f); }}
                className={`w-8 h-6 sm:w-9 sm:h-7 font-black text-[10px] sm:text-xs rounded transition-colors shrink-0 flex items-center justify-center ${viewFloor === f ? 'bg-slate-800 text-white shadow-sm' : 'bg-white text-slate-700 hover:bg-slate-100'}`}
              >
                T.{f}
              </button>
            ))}
          </div>
        </div>
      </div>


      {/* GOOGLE MAPS STYLE NAVIGATION SCRIPT BANNER - MOVED OUTSIDE CANVAS */}
      {navScript && (
        <div className="w-full bg-[#f8f9fa] py-4 px-4 sm:px-6 z-20 relative border-b border-slate-200 shadow-sm flex justify-center">
          <div className="w-full flex flex-col pointer-events-none animate-in slide-in-from-top-4 fade-in duration-500 drop-shadow-xl">
            {/* MAIN TOP BLOCK */}
            <div className="bg-[#0b5c42] rounded-2xl flex items-center p-3.5 gap-4 shadow-lg border-b border-[#084b35] relative z-10 w-full">
              <div className="flex flex-col items-center justify-center shrink-0 w-12 h-12 bg-white/10 rounded-full border border-white/20">
                {navScript.firstTurnIsLeft ? <CornerUpLeft className="w-8 h-8 text-white stroke-[2.5]" /> : <CornerUpRight className="w-8 h-8 text-white stroke-[2.5]" />}
              </div>
              <div className="flex flex-col pt-0.5">
                <span className="text-white/80 text-[13px] font-medium leading-tight">Từ vị trí thang máy, hãy {navScript.firstTurnText}</span>
                <span className="text-white font-bold text-[17px] leading-snug tracking-wide line-clamp-2 drop-shadow-sm">{navScript.dept}</span>
              </div>
            </div>
            {/* SUB BLOCK */}
            <div className="bg-[#043d2b] rounded-b-xl px-4 py-2.5 flex items-center gap-2 self-start ml-4 relative -top-3 pt-4 shadow-md z-0 border-[#022c1e] border-b-2">
              <span className="text-white text-[14px] font-bold tracking-wide">Sau đó {navScript.finalTurnText} vào phòng</span>
              {navScript.finalTurnIsLeft ? <CornerUpLeft className="w-5 h-5 text-white stroke-[3] drop-shadow-sm" /> : <CornerUpRight className="w-5 h-5 text-white stroke-[3] drop-shadow-sm" />}
            </div>
          </div>
        </div>
      )}

      <div className={`w-full ${isHighDensity ? 'h-[460px] sm:h-[950px]' : 'h-[280px] sm:h-[550px]'} bg-[#f8f9fa] shadow-inner overflow-hidden flex justify-center items-start pt-6 sm:pt-10 pb-6`}>
        {/* THE CANVAS - EXACT PROPORTIONS PREVENTING ANY CLUSTERING OR OVERLAPS */}
        <div className={`relative w-[800px] ${canvasHeightStr} transform scale-[0.45] sm:scale-[0.55] md:scale-75 lg:scale-100 origin-top shrink-0 border-[6px] border-slate-800 bg-white shadow-[0_15px_50px_rgba(0,0,0,0.2)] rounded-lg`}>

          {/* HORIZONTAL CENTRAL CORRIDOR */}
          <div className={`absolute left-[20px] right-[20px] ${horizCorridorTopStr} h-[170px] bg-gradient-to-b from-slate-200 via-slate-50 to-slate-200 border-[3px] border-slate-500 shadow-inner z-0 flex items-center justify-between px-8`}>
            <div className="absolute inset-x-8 top-1/2 border-t-[3px] border-blue-400 border-dashed transform -translate-y-1/2 rounded-full hidden md:block z-0 opacity-60"></div>
            <div className="flex gap-1 z-10 opacity-80">
              <ArrowLeft className="w-8 h-8 text-blue-500 animate-pulse" />
            </div>
            <div className="flex gap-1 z-10 opacity-80">
              <ArrowRight className="w-8 h-8 text-blue-500 animate-pulse" />
            </div>
          </div>

          {/* VERTICAL CENTRAL CORRIDOR */}
          <div className="absolute left-[280px] w-[240px] top-[30px] bottom-[30px] bg-gradient-to-r from-slate-200 via-slate-50 to-slate-200 border-[3px] border-slate-500 shadow-inner z-0 flex flex-col items-center justify-between py-6">
            <div className="absolute inset-y-8 left-1/2 border-l-[3px] border-blue-400 border-dashed transform -translate-x-1/2 rounded-full hidden md:block z-0 opacity-60"></div>
            <div className="flex flex-col gap-1 z-10 opacity-80">
              <ArrowUp className="w-8 h-8 text-blue-500 animate-pulse" />
            </div>
            <div className="flex flex-col gap-1 z-10 opacity-80">
              <ArrowDown className="w-8 h-8 text-blue-500 animate-pulse" />
            </div>
          </div>

          {/* SEAMLESS INTERSECTION BLENDING */}
          <div className={`absolute left-[283px] ${horizIntersectionHeightStr} w-[234px] h-[164px] bg-slate-50 z-0`}></div>

          {/* --- STATIC AMENITIES: PRETTY ELEVATOR HUB --- */}
          <div className={`absolute left-[330px] ${isHighDensity ? 'top-[428px]' : 'top-[228px]'} w-[140px] h-[100px] border-[3px] border-slate-700 bg-slate-50 flex flex-col shadow-[0_10px_25px_rgba(0,0,0,0.2)] z-20 rounded-lg overflow-hidden`}>
            <div className="bg-gradient-to-r from-slate-800 to-slate-600 w-full text-center text-[9px] text-white font-extrabold py-1 tracking-widest uppercase shadow-sm">
              Thang Máy
            </div>
            <div className="flex-1 flex flex-col items-center justify-center relative bg-slate-200 shadow-inner">
              {/* Elevator Doors Illusion */}
              <div className="w-14 h-12 border-[3px] border-slate-400 bg-slate-300 rounded flex items-center justify-center relative shadow-inner overflow-hidden mb-1">
                <div className="w-[1.5px] h-full bg-slate-500 absolute left-1/2 -translate-x-1/2"></div>
                <div className="w-1 h-3 border border-slate-400 bg-slate-50 rounded-sm absolute left-[30%]"></div>
                <div className="w-1 h-3 border border-slate-400 bg-slate-50 rounded-sm absolute right-[30%]"></div>
              </div>
              <span className="font-bold text-slate-700 tracking-wider text-[8px] bg-white/80 px-2 rounded-full shadow-sm">Sảnh Trung Tâm</span>
            </div>
          </div>

          <div className="absolute left-[340px] bottom-[40px] w-[120px] h-[60px] border-[3px] border-slate-700 bg-slate-50 flex flex-col z-20 shadow-[0_5px_15px_rgba(0,0,0,0.1)] rounded-t-lg overflow-hidden">
            <div className="bg-slate-700 w-full text-center text-[9px] text-white font-extrabold py-0.5 tracking-wider">WC CHUNG</div>
            <div className="flex-1 flex text-[11px] font-black text-slate-600 bg-white">
              <div className="flex-1 border-r-[2px] border-slate-300 flex items-center justify-center bg-blue-50/30 hover:bg-blue-100 transition-colors">NAM</div>
              <div className="flex-1 flex items-center justify-center bg-pink-50/30 hover:bg-pink-100 transition-colors">NỮ</div>
            </div>
          </div>

          {/* GOOGLE MAPS STYLE DEMO ROUTE LINE */}
          {navScript && navScript.routeCoords && (
            <svg className="absolute inset-0 w-full h-full pointer-events-none z-20">
              {/* Base Outline */}
              <path
                d={`M ${navScript.routeCoords.startX} ${navScript.routeCoords.startY} L ${navScript.routeCoords.midX} ${navScript.routeCoords.midY} L ${navScript.routeCoords.endX} ${navScript.routeCoords.endY}`}
                fill="none"
                stroke="#1e40af"
                strokeWidth="12"
                strokeLinejoin="round"
                strokeLinecap="round"
                className="opacity-80"
              />
              {/* Inner Vivid Route */}
              <path
                d={`M ${navScript.routeCoords.startX} ${navScript.routeCoords.startY} L ${navScript.routeCoords.midX} ${navScript.routeCoords.midY} L ${navScript.routeCoords.endX} ${navScript.routeCoords.endY}`}
                fill="none"
                stroke="#3b82f6"
                strokeWidth="8"
                strokeLinejoin="round"
                strokeLinecap="round"
              />
              {/* Dynamic Dashed Highlight */}
              <path
                d={`M ${navScript.routeCoords.startX} ${navScript.routeCoords.startY} L ${navScript.routeCoords.midX} ${navScript.routeCoords.midY} L ${navScript.routeCoords.endX} ${navScript.routeCoords.endY}`}
                fill="none"
                stroke="#93c5fd"
                strokeWidth="4"
                strokeLinejoin="round"
                strokeLinecap="round"
                strokeDasharray="8 8"
                className="animate-[pulse_1.5s_linear_infinite] opacity-60"
              />
            </svg>
          )}

          {/* DYNAMIC REAL-TIME HARDWARE GPS AVATAR ON DETAILED FLOOR MAP */}
          {isTargetFloorView && gpsTracker.active && (() => {
            const originX = 400; // Center of elevator
            const originY = isHighDensity ? 478 : 278; // Center of elevator

            const currentX = Math.max(30, Math.min(770, originX + gpsTracker.x));
            const currentY = Math.max(30, Math.min(isHighDensity ? 920 : 520, originY + gpsTracker.y));

            return (
              <div
                className="absolute z-50 flex items-center justify-center transition-all duration-[600ms] ease-out pointer-events-none drop-shadow-2xl"
                style={{ left: currentX, top: currentY, transform: `translate(-50%, -50%) rotate(${compassAngle}deg)` }}
              >
                {/* Modern Sweeping FOV Cone */}
                <div className="absolute top-[-60px] w-0 h-0 border-l-[40px] border-l-transparent border-r-[40px] border-r-transparent border-b-[80px] border-b-blue-500/40 blur-[2px]"></div>
                {/* Pulsing Aura */}
                <div className="absolute w-24 h-24 bg-blue-500/20 rounded-full animate-ping [animation-duration:1.5s]"></div>

                {/* Inner Metallic GPS Navigator Node */}
                <div className="relative w-12 h-12 bg-gradient-to-br from-slate-50 to-[#e2e8f0] rounded-full flex flex-col items-center justify-center shadow-[0_5px_15px_rgba(59,130,246,0.5)] border-[3px] border-blue-600">
                  <Navigation2 className="w-6 h-6 text-blue-600 fill-blue-600 mb-0.5" />
                </div>
              </div>
            );
          })()}

          {/* --- ARCHITECTURAL FILLERS FOR EMPTY QUADRANTS --- */}
          {!isHighDensity && deptsOnFloor.length <= 3 && (
            <div className="absolute right-[30px] top-[40px] w-[260px] h-[160px] border-[3px] border-dashed border-slate-300 bg-slate-50 flex flex-col items-center justify-center z-0 opacity-70">
              <Building className="w-10 h-10 text-slate-300 mb-2" />
              <span className="text-xs font-black text-slate-400 tracking-widest uppercase">KHU VỰC HÀNH CHÍNH</span>
              <span className="text-[10px] uppercase font-bold text-slate-400 mt-1">Nghiệp vụ Y Bác sỹ</span>
            </div>
          )}
          {!isHighDensity && deptsOnFloor.length <= 2 && (
            <div className="absolute right-[30px] bottom-[40px] w-[260px] h-[160px] border-[3px] border-dashed border-slate-300 bg-slate-50 flex flex-col items-center justify-center z-0 opacity-70">
              <Layers className="w-10 h-10 text-slate-300 mb-2" />
              <span className="text-xs font-black text-slate-400 tracking-widest uppercase">KHO VẬT TƯ LÂM SÀNG</span>
              <span className="text-[10px] uppercase font-bold text-slate-400 mt-1">Cầu thang thoát hiểm</span>
            </div>
          )}

          {/* GRAND TEXT DISPLAY IN WIDE VERTICAL CORRIDOR */}
          <div className={`absolute left-[290px] ${isHighDensity ? 'top-[220px]' : 'top-[40px]'} w-[220px] h-[140px] flex flex-col justify-center items-center pointer-events-none text-center bg-transparent z-10 px-2`}>
            <h1 className="text-[26px] font-black text-[#c5221f] uppercase tracking-widest drop-shadow-sm leading-tight text-center">
              SƠ ĐỒ TÒA {viewToa}
            </h1>
            <h2 className="text-[13px] font-bold text-slate-800 uppercase tracking-wider mt-1 border-b-[3px] border-slate-400 pb-1 text-center w-full">
              {TOA_NAMES[viewToa]}<br />{viewFloor === 1 ? 'TẦNG TRỆT' : `LẦU ${viewFloor - 1} (TẦNG ${viewFloor})`}
            </h2>
            <div className="mt-2 text-[10px] font-bold text-slate-500 tracking-widest">HÀNH LANG LÕI</div>
          </div>


          {/* --- RENDER THE PROFESSIONAL LINEAR WING STRIPS WITH EXPLICIT DOORS --- */}
          {deptsOnFloor.map((dept, idx) => {
            const strip = getStripConfig(idx, deptsOnFloor.length);
            const isBottom = strip.pos.startsWith('bottom');

            return (
              <div
                key={dept.name}
                // Use flex-col-reverse for bottom blocks so Header is on the outer wall, and Rooms touch the Corridor!
                className={`absolute border-[4px] border-slate-800 bg-white flex ${isBottom ? 'flex-col-reverse' : 'flex-col'} shadow-sm z-20 ${strip.class}`}
              >
                {/* Department Continuous Outer Header Wall */}
                <div className={`w-full flex-shrink-0 h-[36px] bg-[#e2e8f0] ${isBottom ? 'border-t-[3px]' : 'border-b-[3px]'} border-slate-800 flex items-center justify-center overflow-hidden px-4`}>
                  <span className="font-black uppercase text-[12px] sm:text-[13px] text-slate-800 tracking-widest line-clamp-1 truncate">{dept.name}</span>
                </div>

                {/* Continuous Ribbon of Rooms abutting the Main Corridor */}
                <div className="flex-1 flex flex-row">
                  {[1, 2, 3, 4].map((offset) => {
                    const currentRoomCode = `${dept.toa}${dept.floor}${dept.blockBase + offset}`;
                    const isExact = currentRoomCode === targetRoomCode;

                    return (
                      <div
                        key={currentRoomCode}
                        className={`relative flex flex-col flex-1 last:border-r-0 transition-all ${isExact
                          ? 'bg-gradient-to-br from-indigo-500 via-blue-600 to-indigo-700 z-30 shadow-[0_15px_35px_rgba(59,130,246,0.5)] ring-4 ring-offset-2 ring-offset-slate-100 ring-indigo-500 scale-[1.03] rounded-sm'
                          : 'bg-white hover:bg-slate-50 border-r-[3px] border-slate-800'
                          }`}
                      >
                        {/* Inner Shimmer/Glass Flare */}
                        {isExact && <div className="absolute inset-0 bg-[linear-gradient(110deg,rgba(255,255,255,0)_30%,rgba(255,255,255,0.2)_50%,rgba(255,255,255,0)_70%)] animate-pulse pointer-events-none"></div>}

                        {/* Room Code on the back wall */}
                        <span className={`absolute ${isBottom ? 'bottom-1' : 'top-1'} left-1.5 font-black text-[12px] sm:text-[14px] leading-none tracking-tight z-10 ${isExact ? 'text-white drop-shadow-md' : 'text-[#4338ca]'}`}>
                          P.{currentRoomCode}
                        </span>

                        {/* Room Function Label */}
                        <div className={`flex-1 flex flex-col items-center justify-center text-center mt-1 px-1 font-bold text-[9px] uppercase leading-tight ${isExact ? 'text-white drop-shadow-md' : 'text-slate-700'}`}>
                          {getRoomLabel(dept.name, offset).split(' ').map((word, i) => (
                            <span key={i} className="block">{word}</span>
                          ))}
                        </div>

                        {/* --- DOORWAY CUTOUT FACING CORRIDOR --- */}
                        <div className={`absolute left-1/2 -translate-x-1/2 w-[36px] h-[6px] z-40 ${isBottom ? 'top-[-5px]' : 'bottom-[-5px]'} flex justify-center ${isExact ? 'bg-indigo-500 shadow-[0_0_15px_rgba(99,102,241,0.9)]' : 'bg-white'}`}>
                          <div className={`w-[24px] h-full ${isBottom ? 'border-b-[3px]' : 'border-t-[3px]'} ${isExact ? 'border-yellow-300 bg-yellow-200 animate-pulse' : 'border-blue-400 bg-blue-100/40'}`}></div>
                        </div>

                        {/* Navigation Destination Pin */}
                        {isExact && (
                          <div className={`absolute left-1/2 -translate-x-1/2 z-50 animate-bounce ${isBottom ? '-top-11' : '-bottom-11'} flex flex-col items-center`}>
                            <MapPin className="w-10 h-10 text-indigo-600 drop-shadow-xl fill-white" />
                            <div className="absolute -bottom-2 w-5 h-2 bg-indigo-600/50 rounded-full blur-[2px]"></div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <style>{`
        .css-scrollbar::-webkit-scrollbar { width: 14px; height: 14px; }
        .css-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .css-scrollbar::-webkit-scrollbar-thumb { background: rgba(15, 23, 42, 0.2); border-radius: 4px; border: 3px solid #f8f9fa; }
        .css-scrollbar::-webkit-scrollbar-thumb:hover { background: rgba(15, 23, 42, 0.4); }
      `}</style>
    </div>
  );

  function getRoomLabel(deptName, offset) {
    if (deptName.includes('Thuốc')) {
      return ['Quầy A', 'Quầy B', 'Quầy C', 'Quầy D'][offset - 1];
    }
    if (deptName.includes('Xét nghiệm') || deptName.includes('Cận Lâm Sàng') || deptName.includes('Kiểm soát') || deptName.includes('Giải phẫu') || deptName.includes('Vi sinh') || deptName.includes('Dược') || deptName.includes('Huyết học') || deptName.includes('Chẩn đoán hình ảnh')) {
      return ['Đăng ký_Khai báo', 'Khu vực_Chờ', 'Lấy Máu_Phân Tích', 'Nhận_Kết Quả'][offset - 1].replace('_', ' ');
    }
    return ['Đo Sinh_Hiệu', 'Khám Lâm_Sàng', 'Phòng Tiền_Chẩn', 'Lưu & Chờ'][offset - 1].replace('_', ' ');
  }
}
