import React from 'react';

export const Logo: React.FC<{ className?: string }> = ({ className = "" }) => {
  return (
    <div className={`flex flex-col items-center justify-center select-none ${className}`}>
      {/* The 'R' Icon */}
      <div className="relative w-16 h-16 bg-white flex items-center justify-center mb-2">
        <svg viewBox="0 0 100 100" className="w-12 h-12 fill-black">
          <path d="M 20 10 L 20 90 L 45 90 L 55 60 L 70 90 L 90 90 L 65 50 C 80 45 80 20 50 10 Z M 45 35 L 45 45 L 50 45 C 60 45 60 35 50 35 Z" />
        </svg>
      </div>
      
      {/* Text Brand */}
      <div className="relative">
        <h1 className="text-3xl font-bold tracking-[0.2em] text-white leading-none font-sans">
          INNOXR LABS
        </h1>
        
        {/* Horizontal Lines and Stars */}
        <div className="absolute top-1/2 -left-8 w-6 h-[2px] bg-white"></div>
        <div className="absolute top-1/2 -right-8 w-6 h-[2px] bg-white"></div>
        
        {/* Star Left */}
        <div className="absolute -left-12 top-1/2 -translate-y-1/2">
           <svg width="20" height="20" viewBox="0 0 24 24" className="fill-white">
             <path d="M12 0L14 10L24 12L14 14L12 24L10 14L0 12L10 10Z" />
           </svg>
        </div>
         {/* Star Right - lower */}
        <div className="absolute -right-12 top-full -translate-y-1/2">
           <svg width="24" height="24" viewBox="0 0 24 24" className="fill-white">
             <path d="M12 0L14 10L24 12L14 14L12 24L10 14L0 12L10 10Z" />
           </svg>
        </div>
      </div>

      <p className="text-[10px] uppercase tracking-[0.3em] mt-3 text-gray-400 font-mono">
        Your Vision, Our Technology
      </p>
    </div>
  );
};
