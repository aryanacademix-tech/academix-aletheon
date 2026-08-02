import React, { useState, useRef, useEffect } from 'react';

interface ClockTimePickerProps {
  initialTime?: string; // "HH:mm" in 24h format
  onSave: (timeStr: string) => void;
  onCancel: () => void;
  title: string;
}

export default function ClockTimePicker({ initialTime = "12:00", onSave, onCancel, title }: ClockTimePickerProps) {
  const [activeTab, setActiveTab] = useState<'hours' | 'minutes'>('hours');
  
  const [h, m] = (initialTime || "12:00").split(':').map(Number);
  
  const [hours, setHours] = useState(h % 12 || 12);
  const [minutes, setMinutes] = useState(isNaN(m) ? 0 : m);
  const [period, setPeriod] = useState<'AM' | 'PM'>(h >= 12 ? 'PM' : 'AM');

  const [isDragging, setIsDragging] = useState(false);
  const dialRef = useRef<HTMLDivElement>(null);
  
  const radius = 100;

  const handleInteraction = (e: React.MouseEvent | React.TouchEvent | MouseEvent | TouchEvent) => {
    if (!dialRef.current) return;
    
    const rect = dialRef.current.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    
    let clientX, clientY;
    if ('touches' in e) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = (e as React.MouseEvent | MouseEvent).clientX;
      clientY = (e as React.MouseEvent | MouseEvent).clientY;
    }
    
    const dx = clientX - centerX;
    const dy = clientY - centerY;
    
    let angle = Math.atan2(dy, dx) * (180 / Math.PI) + 90;
    if (angle < 0) angle += 360;
    
    if (activeTab === 'hours') {
      let h = Math.round(angle / 30);
      if (h === 0) h = 12;
      setHours(h);
    } else {
      let m = Math.round(angle / 6);
      if (m === 60) m = 0;
      setMinutes(m);
    }
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (isDragging) handleInteraction(e);
    };
    const handleMouseUp = () => {
      if (isDragging) {
        setIsDragging(false);
        if (activeTab === 'hours') {
          setActiveTab('minutes');
        }
      }
    };
    const handleTouchMove = (e: TouchEvent) => {
      if (isDragging) {
        handleInteraction(e);
      }
    };
    const handleTouchEnd = () => {
      if (isDragging) {
        setIsDragging(false);
        if (activeTab === 'hours') {
          setActiveTab('minutes');
        }
      }
    };

    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      window.addEventListener('touchmove', handleTouchMove, { passive: false });
      window.addEventListener('touchend', handleTouchEnd);
    }

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('touchend', handleTouchEnd);
    };
  }, [isDragging, activeTab]);

  const handleSave = () => {
    let finalHour = hours;
    if (period === 'PM' && finalHour !== 12) finalHour += 12;
    if (period === 'AM' && finalHour === 12) finalHour = 0;
    
    const hStr = finalHour.toString().padStart(2, '0');
    const mStr = minutes.toString().padStart(2, '0');
    onSave(`${hStr}:${mStr}`);
  };

  let angleRad = 0;
  if (activeTab === 'hours') {
    angleRad = (hours * 30 - 90) * (Math.PI / 180);
  } else {
    angleRad = (minutes * 6 - 90) * (Math.PI / 180);
  }
  
  const thumbRadius = radius - 15;
  const thumbX = thumbRadius * Math.cos(angleRad);
  const thumbY = thumbRadius * Math.sin(angleRad);

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
      <div className="bg-zinc-900 border border-zinc-800 rounded-3xl w-full max-w-sm overflow-hidden shadow-2xl font-sans" onClick={e => e.stopPropagation()}>
        <div className="p-6">
          <h2 className="text-xs font-bold text-emerald-400 uppercase tracking-widest mb-6 flex items-center gap-2">
            <span>⏰</span> {title}
          </h2>
          
          <div className="flex justify-center space-x-2 mb-4 items-center">
            <div 
              onClick={() => setActiveTab('hours')}
              className={`text-5xl font-light rounded-2xl px-3 py-2 w-20 text-center cursor-pointer transition-all border ${
                activeTab === 'hours' 
                  ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/50 shadow-inner' 
                  : 'bg-zinc-950 text-zinc-300 border-zinc-800 hover:border-zinc-700'
              }`}
            >
              {hours}
            </div>
            
            <div className="text-5xl font-light text-zinc-500 pb-2">:</div>
            
            <div 
              onClick={() => setActiveTab('minutes')}
              className={`text-5xl font-light rounded-2xl px-3 py-2 w-20 text-center cursor-pointer transition-all border ${
                activeTab === 'minutes' 
                  ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/50 shadow-inner' 
                  : 'bg-zinc-950 text-zinc-300 border-zinc-800 hover:border-zinc-700'
              }`}
            >
              {minutes.toString().padStart(2, '0')}
            </div>
            
            <div className="flex flex-col space-y-1.5 ml-2">
              <button 
                type="button"
                onClick={() => setPeriod('AM')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all border ${
                  period === 'AM' 
                    ? 'bg-emerald-500 text-zinc-950 border-emerald-400' 
                    : 'bg-zinc-950 text-zinc-400 border-zinc-800 hover:bg-zinc-800'
                }`}
              >
                AM
              </button>
              <button 
                type="button"
                onClick={() => setPeriod('PM')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all border ${
                  period === 'PM' 
                    ? 'bg-emerald-500 text-zinc-950 border-emerald-400' 
                    : 'bg-zinc-950 text-zinc-400 border-zinc-800 hover:bg-zinc-800'
                }`}
              >
                PM
              </button>
            </div>
          </div>
          
          <div className="flex justify-center mb-6 mt-6">
            <div 
              ref={dialRef}
              className="relative bg-zinc-950 border border-zinc-800 rounded-full w-[240px] h-[240px] cursor-pointer touch-none shadow-inner"
              onMouseDown={(e) => { setIsDragging(true); handleInteraction(e); }}
              onTouchStart={(e) => { setIsDragging(true); handleInteraction(e); }}
            >
              <div className="absolute top-1/2 left-1/2 w-2.5 h-2.5 bg-emerald-400 rounded-full -translate-x-1/2 -translate-y-1/2 z-10 shadow-[0_0_10px_#34d399]" />
              
              {/* Needle Line */}
              <div 
                className="absolute top-1/2 left-1/2 bg-emerald-500 origin-bottom"
                style={{
                  width: 2.5,
                  height: thumbRadius,
                  transform: `translateX(-50%) translateY(-100%) rotate(${activeTab === 'hours' ? hours * 30 : minutes * 6}deg)`
                }}
              />

              {/* Dial Thumb */}
              <div 
                className="absolute top-1/2 left-1/2 w-10 h-10 bg-emerald-500 rounded-full flex items-center justify-center text-zinc-950 font-bold text-base -translate-x-1/2 -translate-y-1/2 shadow-lg transition-transform duration-75 border border-emerald-300"
                style={{
                  transform: `translate(calc(-50% + ${thumbX}px), calc(-50% + ${thumbY}px))`
                }}
              >
                {activeTab === 'hours' ? hours : minutes}
              </div>

              {/* Numbers on Clock Dial */}
              {activeTab === 'hours' ? (
                [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map(num => {
                  const numAngle = (num * 30 - 90) * (Math.PI / 180);
                  const nx = (radius - 15) * Math.cos(numAngle);
                  const ny = (radius - 15) * Math.sin(numAngle);
                  const isSelected = hours === num;
                  return (
                    <div 
                      key={`hour-${num}`}
                      className="absolute top-1/2 left-1/2 text-zinc-400 text-sm font-semibold -translate-x-1/2 -translate-y-1/2 pointer-events-none transition-opacity"
                      style={{
                        transform: `translate(calc(-50% + ${nx}px), calc(-50% + ${ny}px))`,
                        opacity: isSelected ? 0 : 1
                      }}
                    >
                      {num}
                    </div>
                  );
                })
              ) : (
                [0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55].map(num => {
                  const numAngle = (num * 6 - 90) * (Math.PI / 180);
                  const nx = (radius - 15) * Math.cos(numAngle);
                  const ny = (radius - 15) * Math.sin(numAngle);
                  return (
                    <div 
                      key={`min-${num}`}
                      className="absolute top-1/2 left-1/2 text-zinc-400 text-sm font-semibold -translate-x-1/2 -translate-y-1/2 pointer-events-none transition-opacity"
                      style={{
                        transform: `translate(calc(-50% + ${nx}px), calc(-50% + ${ny}px))`,
                        opacity: minutes === num ? 0 : 1
                      }}
                    >
                      {num.toString().padStart(2, '0')}
                    </div>
                  );
                })
              )}
            </div>
          </div>

          <div className="flex justify-end space-x-3 pt-2">
            <button 
              type="button" 
              onClick={onCancel} 
              className="px-4 py-2 rounded-xl text-zinc-400 hover:text-white hover:bg-zinc-800 text-xs font-bold transition-colors"
            >
              CANCEL
            </button>
            <button 
              type="button" 
              onClick={handleSave} 
              className="px-5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-zinc-950 text-xs font-extrabold transition-colors shadow-lg shadow-emerald-500/20"
            >
              SET TIME
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
