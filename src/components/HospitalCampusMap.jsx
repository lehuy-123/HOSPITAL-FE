import React, { useState, useEffect } from 'react';
import { Building, MapPin, Navigation2, Info, ArrowRight, ArrowLeft, ArrowUp, Baby, Stethoscope, Microscope, HeartPulse, Activity, Scissors } from 'lucide-react';

export default function HospitalCampusMap({ currentToa = 'Tòa A', targetToa = 'Tòa B' }) {
   const tToaCode = targetToa.length > 1 ? targetToa.substring(4, 5) : targetToa;
   const parsedCurrentToa = currentToa.length > 1 ? currentToa.substring(4, 5) : currentToa;

   // Lấy "Quầy tiếp nhận (Tòa A)" làm điểm xuất phát mặc định. Có thể di chuyển bằng cách click!
   const [cToaCode, setCToaCode] = useState(parsedCurrentToa);

   useEffect(() => {
      if (parsedCurrentToa !== cToaCode) {
         setCToaCode(parsedCurrentToa);
      }
   }, [parsedCurrentToa]);

   // HARDWARE REAL-TIME GPS TRACKING - ALWAYS ACTIVE
   const [gpsTracker, setGpsTracker] = useState({ active: true, x: 0, y: 0, baseLat: null, baseLng: null });

   // Sync state if target changes completely automatically
   useEffect(() => {
      setGpsTracker({ active: true, x: 0, y: 0, baseLat: null, baseLng: null });
   }, [cToaCode, tToaCode]);

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
                  // Map real-world geographic deltas to Map Pixels
                  // 1 degree ~ 111,320 meters. We amplify visually: 1 pixel on map = 0.75 physical meter -> scale = 1.333
                  const deltaY_m = (latitude - prev.baseLat) * 111320;
                  const deltaX_m = (longitude - prev.baseLng) * 111320 * Math.cos(latitude * Math.PI / 180);
                  return { ...prev, x: deltaX_m * 1.33, y: -deltaY_m * 1.33 };
               });
            },
            (err) => console.warn("GPS Tracking Error: ", err),
            { enableHighAccuracy: true, maximumAge: 0, timeout: 5000 }
         );
      }

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

   const buildings = [
      { id: 'D', name: 'TÒA D', subtitle: 'SẢN NHI', x: 80, y: 60, w: 220, h: 140, icon: Baby, avatar: '/toa_3.png?v=2' },
      { id: 'E', name: 'TÒA E', subtitle: 'CHUYÊN KHOA', x: 500, y: 60, w: 220, h: 140, icon: Activity, avatar: '/toa_2.png?v=2' },
      { id: 'F', name: 'TÒA F', subtitle: 'CẬN LÂM SÀNG', x: 290, y: 220, w: 220, h: 140, icon: Microscope, avatar: '/toa_1.png?v=2' },
      { id: 'B', name: 'TÒA B', subtitle: 'NỘI KHOA', x: 80, y: 380, w: 220, h: 140, icon: Stethoscope, avatar: '/toa_2.png?v=2' },
      { id: 'C', name: 'TÒA C', subtitle: 'NGOẠI KHOA', x: 500, y: 380, w: 220, h: 140, icon: Scissors, avatar: '/toa_3.png?v=2' },
      { id: 'A', name: 'TÒA A', subtitle: 'QUẦY CẤP THUỐC', x: 290, y: 540, w: 220, h: 140, icon: HeartPulse, avatar: '/toa_4.png?v=2' }
   ];

   function getBuildingCenter(id) {
      const b = buildings.find(b => b.id === id);
      return { x: b.x + b.w / 2, y: b.y + b.h / 2 };
   }

   function getRouteData(startId, endId) {
      const p1 = getBuildingCenter(startId);
      const p2 = getBuildingCenter(endId);
      const d1 = Math.abs(400 - p1.x);
      const d2 = Math.abs(p2.y - p1.y);
      const d3 = Math.abs(p2.x - 400);
      const totalDist = d1 + d2 + d3;
      return { p1, p2, d1, d2, d3, totalDist };
   }

   function getPosAtProgress(route, progress) {
      if (route.totalDist === 0) return { x: route.p1.x, y: route.p1.y, angle: 0 };
      const d = progress * route.totalDist;

      if (d <= route.d1) {
         const r = route.d1 === 0 ? 0 : d / route.d1;
         const x = route.p1.x + (400 - route.p1.x) * r;
         return { x, y: route.p1.y, angle: 400 >= route.p1.x ? 90 : -90 };
      } else if (d <= route.d1 + route.d2) {
         const r = route.d2 === 0 ? 0 : (d - route.d1) / route.d2;
         const y = route.p1.y + (route.p2.y - route.p1.y) * r;
         return { x: 400, y, angle: route.p2.y >= route.p1.y ? 180 : 0 };
      } else {
         const r = route.d3 === 0 ? 0 : (d - route.d1 - route.d2) / route.d3;
         const x = 400 + (route.p2.x - 400) * r;
         return { x, y: route.p2.y, angle: route.p2.x >= 400 ? 90 : -90 };
      }
   }

   const isNavigating = cToaCode !== tToaCode;
   let currentRoute = null;
   if (isNavigating) {
      currentRoute = getRouteData(cToaCode, tToaCode);
   }

   return (
      <div className="w-full bg-slate-50 border border-slate-200 rounded-2xl overflow-hidden shadow-inner flex flex-col mb-4">
         <div className="bg-[#1e293b] px-4 py-2 border-b border-slate-700 flex justify-between items-center relative z-40">
            <h3 className="font-black text-white text-sm tracking-widest uppercase flex items-center gap-2">
               <Building className="w-4 h-4 text-blue-400" /> Bản Đồ Khuôn Viên Tổng Thể
            </h3>
            <span className="text-xs font-bold text-slate-300 bg-slate-800 px-2 py-1 rounded">Mặt Đất (G)</span>
         </div>

         {/* GREEN HARDWARE GPS HUD (Like user screenshot) */}
         {gpsTracker.active && isNavigating && (() => {
            const targetBldg = buildings.find(b => b.id === tToaCode);
            const isLeft = currentRoute.p2.x < 400;
            const isRight = currentRoute.p2.x > 400;

            const c1 = currentRoute.p1;
            const c2 = currentRoute.p2;
            const SPINE_X = 400;
            const dy = c2.y - c1.y;
            let instructions = [];

            if (Math.abs(c1.x - SPINE_X) > 10) {
               const distToSpine = Math.round(Math.abs(c1.x - SPINE_X) * 0.75);
               if (Math.abs(c2.x - SPINE_X) > 10 && Math.abs(dy) < 10) {
                  instructions.push(`đi thẳng xuyên Hành lang khoảng ${distToSpine * 2} mét`);
               } else {
                  instructions.push(`đi thẳng ${distToSpine}m ra đường chính`);
                  if (Math.abs(dy) > 10) {
                     const distSpine = Math.round(Math.abs(dy) * 0.75);
                     const cameFromRight = c1.x > SPINE_X;
                     const goingSouth = dy > 0;
                     let turn = (cameFromRight && goingSouth) || (!cameFromRight && !goingSouth) ? 'rẽ Trái' : 'rẽ Phải';

                     if (Math.abs(c2.x - SPINE_X) <= 10) {
                        instructions.push(`${turn} ${distSpine} mét`);
                     } else {
                        instructions.push(`${turn} ${distSpine} mét`);
                        const goingToRight = c2.x > SPINE_X;
                        let finalTurn = (goingSouth && goingToRight) || (!goingSouth && !goingToRight) ? 'rẽ Trái' : 'rẽ Phải';
                        const distToWing = Math.round(Math.abs(c2.x - SPINE_X) * 0.75);
                        instructions.push(`sau đó ${finalTurn} vào ${distToWing} mét`);
                     }
                  }
               }
            } else {
               const distSpine = Math.round(Math.abs(dy) * 0.75);
               instructions.push(`đi dọc tuyến giữa ${distSpine} mét`);
               if (Math.abs(c2.x - SPINE_X) > 10) {
                  const goingSouth = dy > 0;
                  const goingToRight = c2.x > SPINE_X;
                  let turn = (!goingSouth && goingToRight) || (goingSouth && !goingToRight) ? 'rẽ Phải' : 'rẽ Trái';
                  const distToWing = Math.round(Math.abs(c2.x - SPINE_X) * 0.75);
                  instructions.push(`${turn} ${distToWing} mét`);
               }
            }

            const rawInstruction = instructions.join(' và ');
            const navInstruction = rawInstruction.charAt(0).toUpperCase() + rawInstruction.slice(1);

            let TurnIcon = ArrowUp;
            if (rawInstruction.includes('rẽ Trái')) TurnIcon = ArrowLeft;
            else if (rawInstruction.includes('rẽ Phải')) TurnIcon = ArrowRight;

            return (
               <div className="bg-[#0f9d58] text-white px-5 py-3 z-50 flex items-center gap-4 shadow-lg border-b-4 border-[#0b8043]">
                  <div className="flex flex-col items-center justify-center shrink-0 w-[50px]">
                     <TurnIcon className="w-8 h-8 text-white drop-shadow-md mb-0.5" />
                     <span className="font-black text-xs">{(Math.abs(gpsTracker.x) + Math.abs(gpsTracker.y)).toFixed(0)}m</span>
                  </div>
                  <div className="flex flex-col border-l border-white/30 pl-4 w-full">
                     <span className="font-extrabold text-[15px] sm:text-[17px] tracking-wide">{navInstruction}</span>
                     <span className="text-[11px] sm:text-xs font-medium opacity-90 mt-0.5">Tiến về {targetBldg?.name} - Để đến {targetBldg?.subtitle}</span>
                  </div>
               </div>
            );
         })()}

         <div className="relative w-full overflow-hidden flex justify-center bg-[#f8fafc] h-[380px] sm:h-[460px] md:h-[600px] lg:h-[760px] pt-6 shrink-0 border-y border-slate-200 shadow-inner">
            <div className="relative w-[800px] h-[720px] transform scale-[0.45] xs:scale-50 sm:scale-[0.6] md:scale-[0.8] lg:scale-100 origin-top shrink-0">
               {/* Aesthetic Background Watermark Grid */}
               <div className="absolute inset-0 z-0 pointer-events-none opacity-[0.3] bg-[radial-gradient(#94a3b8_1.5px,transparent_1.5px)] [background-size:24px_24px]"></div>
               {/* CAMPUS LANDSCAPING & ENVIRONMENT DECORATIONS */}
               {/* Large Grass Parks */}
               <div className="absolute left-[20px] top-[20px] w-[340px] h-[280px] bg-gradient-to-br from-emerald-50/60 to-emerald-100/40 border border-emerald-100/50 rounded-3xl z-0"></div>
               <div className="absolute right-[20px] top-[20px] w-[340px] h-[280px] bg-gradient-to-bl from-emerald-50/60 to-emerald-100/40 border border-emerald-100/50 rounded-3xl z-0"></div>
               <div className="absolute left-[20px] bottom-[80px] w-[340px] h-[220px] bg-gradient-to-tr from-emerald-50/60 to-emerald-100/40 border border-emerald-100/50 rounded-3xl z-0"></div>
               <div className="absolute right-[20px] bottom-[80px] w-[340px] h-[220px] bg-gradient-to-tl from-emerald-50/60 to-emerald-100/40 border border-emerald-100/50 rounded-3xl z-0"></div>

               {/* Central Fountain Roundabout */}
               <div className="absolute left-[310px] top-[230px] w-[180px] h-[180px] border-[12px] border-slate-100/80 rounded-full flex items-center justify-center z-0">
                  <div className="w-[120px] h-[120px] bg-sky-50/80 border-[4px] border-sky-100 rounded-full flex items-center justify-center shadow-inner">
                     <div className="w-16 h-16 bg-sky-200/50 rounded-full animate-ping [animation-duration:3s]"></div>
                     <div className="absolute w-8 h-8 bg-sky-300 rounded-full shadow-inner blur-[1px]"></div>
                  </div>
               </div>

               {/* Trauma/Emergency Helipad (Top Left) */}
               <div className="absolute left-[50px] top-[50px] w-[120px] h-[120px] border-[6px] border-slate-300 bg-slate-100/70 rounded-full flex items-center justify-center z-0 shadow-sm">
                  <div className="w-[90px] h-[90px] border-[3px] border-dashed border-red-300 rounded-full flex items-center justify-center">
                     <span className="font-black text-5xl text-red-500 opacity-60">H</span>
                  </div>
               </div>

               {/* Ambulance Parking Bay (Bottom Left) */}
               <div className="absolute left-[60px] bottom-[110px] w-[160px] h-[80px] border-[4px] border-amber-200 bg-amber-50/80 rounded-xl z-0 flex flex-col justify-center items-center shadow-sm">
                  <div className="w-full border-t-[3px] border-dashed border-amber-300 absolute top-1/2 -translate-y-1/2"></div>
                  <span className="text-amber-500/70 font-black text-xl tracking-[0.2em] uppercase z-10 pointer-events-none">A.E.D RESCUE</span>
               </div>

               {/* Staff Parking (Right Side) */}
               <div className="absolute right-[60px] top-[150px] w-[100px] h-[90px] border-[3px] border-slate-300 bg-white/70 rounded-lg flex gap-2 justify-center py-2 z-0 shadow-sm">
                  <div className="w-[20px] h-full border-[2px] border-slate-200 rounded-sm bg-slate-100/50"></div>
                  <div className="w-[20px] h-full border-[2px] border-slate-200 rounded-sm bg-slate-100/50"></div>
                  <div className="w-[20px] h-full border-[2px] border-slate-200 rounded-sm bg-slate-100/50 relative flex items-center justify-center">
                     <span className="font-bold text-slate-400/80 text-[10px]">P</span>
                  </div>
               </div>

               {/* Decorative Scattered Trees */}
               <div className="absolute left-[330px] top-[70px] w-6 h-6 bg-emerald-200/80 rounded-full border border-emerald-300 shadow-sm z-0"></div>
               <div className="absolute left-[460px] top-[140px] w-8 h-8 bg-emerald-200/80 rounded-full border border-emerald-300 shadow-sm z-0"></div>
               <div className="absolute left-[340px] top-[450px] w-5 h-5 bg-emerald-200/80 rounded-full border border-emerald-300 shadow-sm z-0"></div>
               <div className="absolute left-[450px] top-[600px] w-7 h-7 bg-emerald-200/80 rounded-full border border-emerald-300 shadow-sm z-0"></div>
               <div className="absolute right-[190px] bottom-[280px] w-9 h-9 bg-emerald-200/80 rounded-full border border-emerald-300 shadow-sm z-0"></div>
               <div className="absolute left-[200px] bottom-[320px] w-6 h-6 bg-emerald-200/80 rounded-full border border-emerald-300 shadow-sm z-0"></div>
               <div className="absolute right-[50px] bottom-[120px] w-12 h-12 bg-emerald-200/80 rounded-full border border-emerald-300 shadow-sm z-0"></div>

               {/* Central Vertical Spine Walkway */}
               <div className="absolute left-[380px] top-[115px] w-[40px] h-[435px] bg-sky-50/50 border-x-2 border-slate-300 shadow-inner z-0 flex justify-center">
                  <div className="w-[4px] h-full border-l-2 border-slate-400 border-dashed opacity-50"></div>
               </div>

               {/* Top Branch Walkway (D - E) */}
               <div className="absolute left-[190px] top-[100px] w-[420px] h-[30px] bg-sky-50/50 border-y-2 border-slate-300 shadow-inner z-0 items-center flex">
                  <div className="w-full h-[4px] border-t-2 border-slate-400 border-dashed mx-4 opacity-50"></div>
               </div>

               {/* Bottom Branch Walkway (B - C) */}
               <div className="absolute left-[190px] top-[420px] w-[420px] h-[30px] bg-sky-50/50 border-y-2 border-slate-300 shadow-inner z-0 items-center flex">
                  <div className="w-full h-[4px] border-t-2 border-slate-400 border-dashed mx-4 opacity-50"></div>
               </div>

               {/* Road/Entrance Decor */}
               <div className="absolute left-[250px] top-[660px] w-[300px] h-[60px] bg-slate-200 border-t-8 border-slate-400 rounded-t-3xl flex justify-center pt-3 shadow-[inset_0_10px_20px_rgba(0,0,0,0.05)] z-0">
                  <span className="text-slate-500 font-extrabold tracking-[0.3em] uppercase text-[10px]">CỔNG CHÍNH BỆNH VIỆN</span>
               </div>

               {/* Outpatient Pharmacy / Quầy Phát Thuốc Ngoại Trú (Annex Attached to Tòa A) */}
               <div className="absolute left-[490px] top-[575px] w-[140px] h-[70px] border-[4px] border-l-0 border-emerald-300 bg-emerald-50 rounded-r-2xl z-0 flex flex-col justify-center items-center shadow-md pl-4 group hover:bg-emerald-100 transition-colors duration-300 cursor-pointer">
                  <div className="px-2.5 py-0.5 rounded-full bg-emerald-200 flex items-center justify-center mb-0.5 group-hover:bg-emerald-300 transition-colors shadow-inner">
                     <span className="font-extrabold text-emerald-700 text-[10px] tracking-wide uppercase">Medicine</span>
                  </div>
                  <span className="text-emerald-700 font-black text-[9px] tracking-widest uppercase">QUẦY PHÁT THUỐC</span>
               </div>

               {/* Seamless Junction Overlays to cover cross-border overlaps */}
               <div className="absolute left-[382px] top-[102px] w-[36px] h-[26px] bg-sky-50/80 z-0"></div>
               <div className="absolute left-[382px] top-[422px] w-[36px] h-[26px] bg-sky-50/80 z-0"></div>

               {/* Render Buildings */}
               {buildings.map(b => {
                  const isTarget = b.id === tToaCode;
                  const isCurrent = b.id === cToaCode;

                  return (
                     <div
                        key={b.id}
                        onClick={() => { if (!isTarget) setCToaCode(b.id); }}
                        className={`absolute rounded-2xl flex flex-col overflow-hidden transition-all duration-500 z-10 ${isTarget ? 'cursor-default' : 'cursor-pointer hover:scale-105'} ${isTarget ? 'bg-white border-2 border-red-200 border-b-[8px] border-b-red-500 shadow-[0_15px_40px_rgba(239,68,68,0.3)] scale-[1.05] z-30' :
                           isCurrent ? 'bg-blue-50 border-2 border-blue-200 border-b-[8px] border-b-blue-500 shadow-[0_15px_30px_rgba(59,130,246,0.3)] z-20' :
                              'bg-white border-2 border-slate-200 border-b-[8px] border-b-slate-300 shadow-[0_10px_20px_rgba(0,0,0,0.04)] hover:border-b-slate-400'
                           }`}
                        style={{ left: b.x, top: b.y, width: b.w, height: b.h }}
                     >
                        {/* Photographic Premium Identity Header */}
                        <div className={`w-full h-[65px] relative shrink-0 overflow-hidden ${isCurrent || isTarget ? 'grayscale-0' : 'grayscale-[20%] opacity-90'}`}>
                           <img src={b.avatar} className="w-full h-full object-cover" alt={b.name} />
                           <div className="absolute inset-0 bg-gradient-to-t from-slate-900/60 to-transparent"></div>
                           <div className="absolute bottom-2 right-3 p-1 rounded-md bg-white/20 backdrop-blur-md border border-white/40 text-white shadow-sm">
                              {b.icon && <b.icon className="w-4 h-4 stroke-[3]" />}
                           </div>
                        </div>

                        {/* Title Context Data */}
                        <div className="flex flex-col items-center justify-center flex-1 w-full bg-white relative z-10 pb-1">
                           <span className={`font-black text-2xl tracking-[0.2em] -mt-1 transition-colors ${isTarget ? 'text-[#c5221f]' : isCurrent ? 'text-blue-700' : 'text-slate-800'}`}>
                              {b.name}
                           </span>
                           <div className={`w-[40px] h-[3px] my-1 rounded-full ${isTarget ? 'bg-red-500' : isCurrent ? 'bg-blue-500' : 'bg-slate-300'}`}></div>
                           <span className={`font-bold text-[11px] uppercase tracking-widest text-center px-4 ${isTarget ? 'text-red-500' : 'text-slate-500'}`}>
                              {b.subtitle}
                           </span>
                        </div>

                        {/* Target Map Pin */}
                        {isTarget && (
                           <div className="absolute -top-12 left-1/2 -translate-x-1/2 flex flex-col items-center animate-bounce z-40 pointer-events-none">
                              <MapPin className="w-12 h-12 text-red-600 drop-shadow-xl fill-red-100" />
                           </div>
                        )}
                     </div>
                  );
               })}

               {/* GOOGLE MAPS STYLE SOLID BLUE ROUTE PATH */}
               {isNavigating && currentRoute && (
                  <svg className="absolute inset-0 w-full h-full pointer-events-none z-30">
                     <path
                        d={`M ${currentRoute.p1.x} ${currentRoute.p1.y} L 400 ${currentRoute.p1.y} L 400 ${currentRoute.p2.y} L ${currentRoute.p2.x} ${currentRoute.p2.y}`}
                        fill="none"
                        stroke="#bfdbfe"
                        strokeWidth="14"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                     />
                     <path
                        d={`M ${currentRoute.p1.x} ${currentRoute.p1.y} L 400 ${currentRoute.p1.y} L 400 ${currentRoute.p2.y} L ${currentRoute.p2.x} ${currentRoute.p2.y}`}
                        fill="none"
                        stroke="#3b82f6"
                        strokeWidth="8"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className="shadow-sm"
                     />
                  </svg>
               )}

               {/* DYNAMIC REAL-TIME HARDWARE GPS AVATAR */}
               {isNavigating && gpsTracker.active && (() => {
                  const origin = getBuildingCenter(cToaCode);
                  const currentX = Math.max(20, Math.min(780, origin.x + gpsTracker.x));
                  const currentY = Math.max(20, Math.min(780, origin.y + gpsTracker.y));
                  return (
                     <div
                        className="absolute z-40 flex items-center justify-center transition-all duration-[600ms] ease-out pointer-events-none drop-shadow-2xl"
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

            </div>


         </div>
      </div>
   );
}
