import { useState } from 'react';
import { BrainCircuit, Sparkles } from 'lucide-react';

interface AppLogoProps {
  size?: 'sm' | 'md' | 'lg';
  showTagline?: boolean;
  className?: string;
}

export default function AppLogo({ size = 'md', showTagline = true, className = '' }: AppLogoProps) {
  const [imgSrc, setImgSrc] = useState<string>('/app_logo.jpg');
  const [imgError, setImgError] = useState<boolean>(false);

  const handleImgError = () => {
    if (imgSrc === '/app_logo.jpg') {
      setImgSrc('/app_logo.png');
    } else if (imgSrc === '/app_logo.png') {
      setImgSrc('/logo.jpg');
    } else {
      setImgError(true);
    }
  };

  const dimensions = {
    sm: { box: 'w-16 h-16', title: 'text-lg', icon: 'w-8 h-8' },
    md: { box: 'w-28 h-28', title: 'text-2xl', icon: 'w-12 h-12' },
    lg: { box: 'w-36 h-36', title: 'text-3xl', icon: 'w-16 h-16' },
  }[size];

  return (
    <div className={`flex flex-col items-center text-center ${className}`}>
      <div className="relative group mb-3">
        {/* Glow backdrop */}
        <div className="absolute -inset-1.5 bg-gradient-to-r from-violet-600/50 via-indigo-500/50 to-amber-500/50 rounded-3xl blur-md opacity-75 group-hover:opacity-100 transition duration-500 animate-pulse"></div>
        
        <div className={`relative ${dimensions.box} rounded-2xl border-2 border-amber-500/30 bg-zinc-900 shadow-2xl overflow-hidden flex items-center justify-center`}>
          {!imgError ? (
            <img 
              src={imgSrc} 
              alt="Academix Aletheon Logo" 
              onError={handleImgError}
              referrerPolicy="no-referrer"
              className="w-full h-full object-cover rounded-2xl"
            />
          ) : (
            <div className="flex flex-col items-center justify-center p-2 bg-gradient-to-br from-indigo-950 via-zinc-900 to-amber-950 w-full h-full">
              <BrainCircuit className={`${dimensions.icon} text-amber-400 mb-1`} />
              <span className="text-[10px] font-black tracking-widest text-indigo-300 uppercase">ACADEMIX</span>
            </div>
          )}
        </div>
      </div>

      {/* Main Title Heading */}
      <h1 className={`${dimensions.title} font-black tracking-tight text-white flex items-center justify-center gap-2 drop-shadow-md`}>
        <span className="bg-gradient-to-r from-amber-300 via-indigo-200 to-purple-300 bg-clip-text text-transparent">
          Academix Aletheon
        </span>
        <Sparkles className="w-5 h-5 text-amber-400 animate-spin" style={{ animationDuration: '6s' }} />
      </h1>

      {showTagline && (
        <p className="text-zinc-400 text-[11px] tracking-widest uppercase font-semibold mt-1">
          learn.play.enjoy.repeat
        </p>
      )}
    </div>
  );
}
