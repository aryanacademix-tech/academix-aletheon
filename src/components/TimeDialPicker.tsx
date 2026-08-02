import React, { useState, useRef, useEffect } from 'react';

interface TimeDialPickerProps {
  initialValue: number; // in minutes
  onSave: (value: number) => void;
  onCancel: () => void;
  title: string;
  maxHours?: number;
}

export default function TimeDialPicker({ initialValue, onSave, onCancel, title, maxHours = 24 }: TimeDialPickerProps) {
  const [hours, setHours] = useState(Math.floor(initialValue / 60));
  const [minutes, setMinutes] = useState(initialValue % 60);
  const [activeTab, setActiveTab] = useState<'hours' | 'minutes'>('hours');
  
  const dialRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  const handleInteraction = (e: React.MouseEvent | React.TouchEvent | MouseEvent | TouchEvent) => {
    if (!dialRef.current) return;
    const rect = dialRef.current.getBoundingClientRect();
    const center = { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
    
    let clientX, clientY;
    if ('touches' in e) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = (e as any).clientX;
      clientY = (e as any).clientY;
    }

    const dx = clientX - center.x;
    const dy = clientY - center.y;
    let angle = Math.atan2(dy, dx) * (180 / Math.PI) + 90;
    if (angle < 0) angle += 360;

    if (activeTab === 'hours') {
      const maxVal = maxHours; // e.g. 24 or 100
      // Calculate based on angle and radius if we want inner/outer, but let's just map 360 degrees to maxVal
      // Actually, if maxHours > 24, a single dial is hard. Let's just do a 12-hour dial and add a multiplier or just let them rotate?
      // Better: standard 12 steps on the dial. If maxHours is large, we might need a different UI.
      // But let's assume 12 steps, each step is maxHours / 12 (approx).
      // If we just want 0-maxHours:
      let numSteps = maxHours <= 24 ? maxHours : 24; 
      // For simplicity, let's just make it a 12-step dial for hours if maxHours is small, or 24-step.
      // Actually, standard clock is 12 steps.
      let stepSize = 360 / 12;
      let val = Math.round(angle / stepSize);
      if (val === 0) val = 12;
      
      // Allow dragging distance from center to select AM/PM (outer vs inner circle) if maxHours is 24
      const dist = Math.sqrt(dx*dx + dy*dy);
      if (maxHours > 12) {
         if (dist < 70) {
            val = val === 12 ? 0 : val + 12;
         } else {
            if (val === 12) val = 0; // 0 for midnight
         }
      }
      setHours(val);
    } else {
      // Minutes: 60 steps
      let stepSize = 360 / 60;
      let val = Math.round(angle / stepSize);
      if (val === 60) val = 0;
      // Snap to 5 minutes
      val = Math.round(val / 5) * 5;
      if (val === 60) val = 0;
      setMinutes(val);
    }
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => { if (isDragging) handleInteraction(e); };
    const handleMouseUp = () => setIsDragging(false);
    const handleTouchMove = (e: TouchEvent) => { if (isDragging) handleInteraction(e); };
    const handleTouchEnd = () => setIsDragging(false);

    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      window.addEventListener('touchmove', handleTouchMove);
      window.addEventListener('touchend', handleTouchEnd);
    }
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('touchend', handleTouchEnd);
    };
  }, [isDragging, activeTab]);

  const radius = 100;
  
  let currentVal = activeTab === 'hours' ? hours : minutes;
  let angleRad = 0;
  if (activeTab === 'hours') {
    let displayHour = hours % 12;
    if (displayHour === 0) displayHour = 12;
    angleRad = (displayHour * 30 - 90) * (Math.PI / 180);
  } else {
    angleRad = (minutes * 6 - 90) * (Math.PI / 180);
  }

  // Adjust thumb radius if inner circle for hours
  let thumbRadius = radius;
  if (activeTab === 'hours' && maxHours > 12) {
    if (hours === 0 || hours > 12) {
       thumbRadius = radius - 40;
    }
  }

  const thumbX = thumbRadius * Math.cos(angleRad);
  const thumbY = thumbRadius * Math.sin(angleRad);

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-[#f0f0f0] rounded-2xl w-full max-w-sm overflow-hidden shadow-2xl font-sans" onClick={e => e.stopPropagation()}>
        <div className="bg-white m-2 rounded-xl p-6 shadow-sm">
          <h2 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-6">{title}</h2>
          
          <div className="flex justify-center space-x-2 mb-8 items-center cursor-pointer">
            <div className="flex flex-col items-center">
              <div 
                onClick={() => setActiveTab('hours')}
                className={`text-6xl font-light rounded-xl px-4 py-2 w-28 text-center flex items-center justify-center transition-colors ${activeTab === 'hours' ? 'bg-indigo-100 text-indigo-700' : 'bg-gray-100 text-gray-800'}`}
              >
                <input 
                  type="number" 
                  value={hours} 
                  onChange={(e) => setHours(Math.max(0, parseInt(e.target.value) || 0))} 
                  className="w-full bg-transparent text-center focus:outline-none" 
                />
              </div>
              <span className="text-xs text-gray-400 mt-2 font-semibold tracking-wider">HOURS</span>
            </div>
            
            <div className="text-6xl font-light text-gray-400 pb-6">:</div>
            
            <div className="flex flex-col items-center">
              <div 
                onClick={() => setActiveTab('minutes')}
                className={`text-6xl font-light rounded-xl px-4 py-2 w-28 text-center flex items-center justify-center transition-colors ${activeTab === 'minutes' ? 'bg-indigo-100 text-indigo-700' : 'bg-gray-100 text-gray-800'}`}
              >
                <input 
                  type="number" 
                  value={minutes} 
                  onChange={(e) => setMinutes(Math.max(0, Math.min(59, parseInt(e.target.value) || 0)))} 
                  className="w-full bg-transparent text-center focus:outline-none" 
                />
              </div>
              <span className="text-xs text-gray-400 mt-2 font-semibold tracking-wider">MINUTES</span>
            </div>
          </div>

          <div className="flex justify-center mb-6">
            <div 
              ref={dialRef}
              className="relative bg-gray-200 rounded-full w-[240px] h-[240px] cursor-pointer touch-none"
              onMouseDown={(e) => { setIsDragging(true); handleInteraction(e); }}
              onTouchStart={(e) => { setIsDragging(true); handleInteraction(e); }}
            >
              <div className="absolute top-1/2 left-1/2 w-2 h-2 bg-indigo-600 rounded-full -translate-x-1/2 -translate-y-1/2 z-10" />
              
              {/* Line */}
              <div 
                className="absolute top-1/2 left-1/2 bg-indigo-600 origin-bottom"
                style={{
                  width: 2,
                  height: thumbRadius,
                  transform: `translateX(-50%) translateY(-100%) rotate(${activeTab === 'hours' ? (hours % 12 || 12) * 30 : minutes * 6}deg)`
                }}
              />

              {/* Thumb */}
              <div 
                className="absolute top-1/2 left-1/2 w-10 h-10 bg-indigo-600 rounded-full flex items-center justify-center text-white font-medium text-lg -translate-x-1/2 -translate-y-1/2 shadow-lg transition-all duration-200"
                style={{
                  transform: `translate(calc(-50% + ${thumbX}px), calc(-50% + ${thumbY}px))`
                }}
              >
                {activeTab === 'hours' ? hours : minutes}
              </div>

              {/* Numbers */}
              {activeTab === 'hours' ? (
                // 1-12 outer
                [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map(num => {
                  const numAngle = (num * 30 - 90) * (Math.PI / 180);
                  const nx = (radius - 15) * Math.cos(numAngle);
                  const ny = (radius - 15) * Math.sin(numAngle);
                  const displayNum = maxHours <= 12 ? num : (num === 12 ? 0 : num); // If 24h, 12 is 0 or 12 depending on preference. Usually outer is 1-12. Let's make outer 1-12.
                  const isSelected = hours === num || (num === 12 && hours === 0 && maxHours <= 12);
                  return (
                    <div 
                      key={`outer-${num}`}
                      className="absolute top-1/2 left-1/2 text-gray-600 text-sm font-medium -translate-x-1/2 -translate-y-1/2 pointer-events-none transition-opacity"
                      style={{
                        transform: `translate(calc(-50% + ${nx}px), calc(-50% + ${ny}px))`,
                        opacity: isSelected ? 0 : 1
                      }}
                    >
                      {num}
                    </div>
                  );
                }).concat(
                  maxHours > 12 ? [13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 0].map(num => {
                    const numVal = num === 0 ? 12 : (num > 12 ? num - 12 : num);
                    const numAngle = (numVal * 30 - 90) * (Math.PI / 180);
                    const nx = (radius - 55) * Math.cos(numAngle);
                    const ny = (radius - 55) * Math.sin(numAngle);
                    const isSelected = hours === num;
                    return (
                      <div 
                        key={`inner-${num}`}
                        className="absolute top-1/2 left-1/2 text-gray-500 text-xs font-medium -translate-x-1/2 -translate-y-1/2 pointer-events-none transition-opacity"
                        style={{
                          transform: `translate(calc(-50% + ${nx}px), calc(-50% + ${ny}px))`,
                          opacity: isSelected ? 0 : 1
                        }}
                      >
                        {num === 0 ? '00' : num}
                      </div>
                    );
                  }) : []
                )
              ) : (
                // Minutes: 0, 5, 10, ...
                [0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55].map(num => {
                  const numAngle = (num * 6 - 90) * (Math.PI / 180);
                  const nx = (radius - 20) * Math.cos(numAngle);
                  const ny = (radius - 20) * Math.sin(numAngle);
                  return (
                    <div 
                      key={`min-${num}`}
                      className="absolute top-1/2 left-1/2 text-gray-600 text-sm font-medium -translate-x-1/2 -translate-y-1/2 pointer-events-none transition-opacity"
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

          <div className="flex justify-between items-center mt-8 px-2">
            <div className="text-gray-400 flex items-center space-x-2">
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div className="space-x-4">
              <button onClick={onCancel} className="text-indigo-600 font-bold px-4 py-2 hover:bg-indigo-50 rounded-lg transition-colors">CANCEL</button>
              <button onClick={() => onSave(hours * 60 + minutes)} className="text-indigo-600 font-bold px-4 py-2 hover:bg-indigo-50 rounded-lg transition-colors">OK</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
