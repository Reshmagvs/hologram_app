import React, { useState, useRef, useCallback } from 'react';
import { createRoot } from 'react-dom/client';
import { Camera, Upload, Download, Activity, Cpu, ShieldAlert, LogOut } from 'lucide-react';
import { Logo } from './components/Logo';
import { Terminal } from './components/Terminal';
import { analyzeFrame } from './services/geminiService';
import { User, ProcessingStatus, LogEntry, FrameData } from './types';


const MOCK_USER: User = {
  id: 'google-uid-123',
  name: 'Researcher Alpha',
  email: 'researcher@innoxr.labs',
  picture: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Felix'
};

const App: React.FC = () => {

  const [user, setUser] = useState<User | null>(null);
  const [status, setStatus] = useState<ProcessingStatus>(ProcessingStatus.IDLE);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [progress, setProgress] = useState(0);
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [resultImage, setResultImage] = useState<string | null>(null);
  const [analysisData, setAnalysisData] = useState<any>(null);


  const videoRef = useRef<HTMLVideoElement>(document.createElement('video'));
  const canvasRef = useRef<HTMLCanvasElement>(document.createElement('canvas'));
  const splatCanvasRef = useRef<HTMLCanvasElement>(document.createElement('canvas'));

  const addLog = useCallback((message: string, type: LogEntry['type'] = 'info') => {
    const entry: LogEntry = {
      id: Math.random().toString(36).substr(2, 9),
      timestamp: new Date().toLocaleTimeString('en-US', { hour12: false }),
      message,
      type
    };
    setLogs(prev => [...prev, entry]);
  }, []);

  const handleSignIn = () => {
    addLog("Initiating OAuth 2.0 handshake...", "info");
    setTimeout(() => {
      setUser(MOCK_USER);
      addLog(`Authenticated: ${MOCK_USER.email}`, "success");
    }, 1000);
  };


  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 50 * 1024 * 1024) { // 50MB limit
      addLog("Error: File size exceeds protocol limit.", "error");
      return;
    }

    if (!file.type.startsWith('video/')) {
       addLog("Error: Invalid media type. Video required.", "error");
       return;
    }

    setVideoFile(file);
    setResultImage(null);
    setProgress(0);
    setStatus(ProcessingStatus.IDLE);
    addLog(`File loaded: ${file.name} (${(file.size / 1024 / 1024).toFixed(2)} MB)`, "info");
  };

  const processVideo = async () => {
    if (!videoFile) return;

    setStatus(ProcessingStatus.EXTRACTING);
    addLog("Initializing 3D Reconstruction Pipeline...", "info");

    const video = videoRef.current;
    const url = URL.createObjectURL(videoFile);
    video.src = url;
    video.muted = true;
    video.playsInline = true;

    video.onloadedmetadata = async () => {
      if (video.duration > 61) {
        addLog("Error: Video duration exceeds 60s limit.", "error");
        setStatus(ProcessingStatus.ERROR);
        URL.revokeObjectURL(url);
        return;
      }

      addLog(`Metadata: ${video.videoWidth}x${video.videoHeight} @ ${video.duration.toFixed(1)}s`, "info");
      
      const width = 640; 
      const height = (video.videoHeight / video.videoWidth) * width;
      
      const canvas = canvasRef.current;
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d', { willReadFrequently: true });
      
      if (!ctx) return;

      const framesToExtract = 60;
      const frames: FrameData[] = [];
      const interval = video.duration / framesToExtract;

      try {
        for (let i = 0; i < framesToExtract; i++) {
          video.currentTime = i * interval;
          await new Promise(resolve => {
            const onSeek = () => {
              video.removeEventListener('seeked', onSeek);
              resolve(null);
            };
            video.addEventListener('seeked', onSeek);
          });
          
          ctx.drawImage(video, 0, 0, width, height);
          frames.push({
            index: i,
            image: ctx.getImageData(0, 0, width, height),
            timestamp: i * interval
          });
          
          setProgress(Math.round(((i + 1) / framesToExtract) * 30));
        }
        addLog(`Extracted ${frames.length} keyframes for splatting.`, "success");
      } catch (err) {
        addLog("Frame extraction failed.", "error");
        setStatus(ProcessingStatus.ERROR);
        return;
      }

      setStatus(ProcessingStatus.ANALYZING);
      addLog("Sending keyframe to Neural Engine (Gemini) for classification...", "warning");
      
      const middleFrameIdx = Math.floor(frames.length / 2);

      ctx.putImageData(frames[middleFrameIdx].image, 0, 0);
      const base64Image = canvas.toDataURL('image/png').split(',')[1];
      
      let analysisResult = null;
      try {
        analysisResult = await analyzeFrame(base64Image);
        setAnalysisData(analysisResult);
        addLog(`Target Identified: ${analysisResult?.subject || "Unknown"}`, "success");
      } catch (e) {
        addLog("Neural analysis subsystem offline.", "warning");
      }
      setProgress(50);

      setStatus(ProcessingStatus.RECONSTRUCTING);
      addLog("Running Gaussian Splatting approximation...", "info");
      
      await renderHologram(frames, analysisResult);

      URL.revokeObjectURL(url);
    };
  };

  const renderHologram = async (frames: FrameData[], analysis: any) => {
    const canvas = splatCanvasRef.current;
    const width = frames[0].image.width;
    const height = frames[0].image.height;
  
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.fillStyle = '#050505';
    ctx.fillRect(0, 0, width, height);

    ctx.globalCompositeOperation = 'screen';

    const stride = 5;
    
    for (let i = 0; i < frames.length; i += stride) {
 
      const tempCanvas = document.createElement('canvas');
      tempCanvas.width = width;
      tempCanvas.height = height;
      const tempCtx = tempCanvas.getContext('2d');
      if(!tempCtx) continue;

      tempCtx.putImageData(frames[i].image, 0, 0);

      const depthFactor = i / frames.length;

      ctx.save();

      ctx.globalAlpha = 0.15 - (Math.abs(0.5 - depthFactor) * 0.1); 

      ctx.drawImage(tempCanvas, 0, 0);

      ctx.globalCompositeOperation = 'source-atop';
      ctx.fillStyle = depthFactor < 0.5 ? '#00f0ff' : '#0066ff'; 
      ctx.fillRect(0, 0, width, height);

      ctx.restore();
      
      setProgress(50 + Math.round((i / frames.length) * 40));
      await new Promise(r => setTimeout(r, 10)); 
    }

    addLog("Synthesizing final composition...", "info");
    
    ctx.globalCompositeOperation = 'source-over';

    ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
    for(let y=0; y<height; y+=4) {
      ctx.fillRect(0, y, width, 2);
    }

    const gradient = ctx.createRadialGradient(width/2, height/2, width/4, width/2, height/2, width/1.5);
    gradient.addColorStop(0, 'transparent');
    gradient.addColorStop(1, '#000000');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);

    drawHUD(ctx, width, height, analysis);

    setResultImage(canvas.toDataURL('image/png'));
    setStatus(ProcessingStatus.COMPLETED);
    setProgress(100);
    addLog("Hologram generated successfully.", "success");
  };

  const drawHUD = (ctx: CanvasRenderingContext2D, w: number, h: number, data: any) => {
    ctx.font = '14px "JetBrains Mono"';
    ctx.textBaseline = 'top';
    
    const pad = 40;

    ctx.strokeStyle = '#00f0ff';
    ctx.lineWidth = 2;
    ctx.strokeRect(pad, pad, w - (pad*2), h - (pad*2));
 
    ctx.fillStyle = '#00f0ff';
    const cornerSize = 10;
    ctx.fillRect(pad-2, pad-2, cornerSize, 4); 
    ctx.fillRect(pad-2, pad-2, 4, cornerSize);
    
    ctx.fillRect(w-pad-cornerSize+2, pad-2, cornerSize, 4);
    ctx.fillRect(w-pad+2, pad-2, -4, cornerSize); 
    
    ctx.fillRect(pad-2, h-pad-2, cornerSize, 4);
    ctx.fillRect(pad-2, h-pad-cornerSize+2, 4, cornerSize);

    if (data) {
      let y = pad + 20;
      const lineHeight = 20;
      
      ctx.fillStyle = '#00f0ff';
      ctx.fillText(`SUBJECT: ${data.subject?.toUpperCase()}`, pad + 20, y); y += lineHeight;
      ctx.fillText(`STRUCT:  ${data.structure?.substring(0, 30)}...`, pad + 20, y); y += lineHeight;
      
      y += 10;
      ctx.fillStyle = data.threat_level === 'HIGH' ? '#ff003c' : '#00ff00';
      ctx.fillText(`THREAT:  ${data.threat_level}`, pad + 20, y); y += lineHeight;
      
      ctx.fillStyle = '#ffffff';
      ctx.font = '10px "JetBrains Mono"';
      ctx.fillText(`COMP: ${data.estimated_composition}`, pad + 20, y);
    }

    ctx.font = 'bold 24px "Inter"';
    ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
    ctx.textAlign = 'right';
    ctx.fillText("INNOXR LABS", w - pad - 20, h - pad - 50);
  };

  return (
    <div className="min-h-screen bg-innoxr-black text-innoxr-light font-sans selection:bg-innoxr-accent selection:text-black">
      {/* Navbar */}
      <nav className="border-b border-innoxr-gray bg-innoxr-dark/80 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="font-bold text-xl tracking-wider text-white">INNOXR<span className="text-innoxr-accent">.</span>LABS</span>
          </div>
          
          {user ? (
            <div className="flex items-center gap-4">
              <div className="hidden md:flex flex-col text-right">
                <span className="text-sm font-bold text-white">{user.name}</span>
                <span className="text-xs text-innoxr-accent">{user.email}</span>
              </div>
              <img src={user.picture} alt="Profile" className="w-10 h-10 rounded-full border-2 border-innoxr-gray" />
              <button 
                onClick={() => setUser(null)}
                className="p-2 hover:text-innoxr-secondary transition-colors"
              >
                <LogOut size={20} />
              </button>
            </div>
          ) : (
             <button 
               onClick={handleSignIn}
               className="bg-white text-black px-6 py-2 rounded font-bold hover:bg-innoxr-accent transition-colors flex items-center gap-2"
             >
               <svg className="w-4 h-4" viewBox="0 0 24 24"><path fill="currentColor" d="M21.35 11.1h-9.17v2.73h6.51c-.33 3.81-3.5 5.44-6.5 5.44C8.36 19.27 5 16.25 5 12c0-4.1 3.2-7.27 7.2-7.27c3.09 0 4.9 1.97 4.9 1.97L19 4.72S16.56 2 12.1 2C6.42 2 2.03 6.8 2.03 12.5S6.42 23 12.05 23c5.85 0 10.45-4.34 10.45-10.45c0-.83-.15-1.45-.15-1.45Z"/></svg>
               Sign in with Google
             </button>
          )}
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 py-12">
        {!user ? (
          <div className="flex flex-col items-center justify-center min-h-[60vh] animate-fade-in">
            <Logo className="mb-12 transform scale-150" />
            <div className="max-w-md text-center space-y-6">
              <h2 className="text-2xl font-bold text-white">Restricted Access</h2>
              <p className="text-gray-400">
                Advanced Gaussian Splatting and Holographic Reconstruction tools are available only to authorized personnel.
              </p>
              <div className="p-4 border border-innoxr-secondary/30 bg-innoxr-secondary/5 rounded text-sm text-innoxr-secondary flex items-start gap-2 text-left">
                <ShieldAlert className="shrink-0" size={18} />
                <span>
                  Secure Connection Required. Please sign in to access the GPU cluster.
                </span>
              </div>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Left Column: Controls & Input */}
            <div className="space-y-8">
              <div>
                <h1 className="text-3xl font-bold mb-2">Holographic Reconstruction</h1>
                <p className="text-gray-400">
                  Upload a subject video to generate a volumetric point-cloud estimation.
                </p>
              </div>

              {/* Upload Zone */}
              <div className="border-2 border-dashed border-innoxr-gray hover:border-innoxr-accent transition-colors rounded-xl p-8 bg-innoxr-dark relative group cursor-pointer">
                <input 
                  type="file" 
                  accept="video/*" 
                  onChange={handleFileChange} 
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                  disabled={status === ProcessingStatus.EXTRACTING || status === ProcessingStatus.ANALYZING}
                />
                <div className="flex flex-col items-center justify-center text-center space-y-4">
                  <div className="w-16 h-16 rounded-full bg-innoxr-gray/50 flex items-center justify-center group-hover:scale-110 transition-transform">
                    <Upload className="text-innoxr-accent" size={32} />
                  </div>
                  <div>
                    <h3 className="font-bold text-white">Drop video file here</h3>
                    <p className="text-sm text-gray-500 mt-1">MP4, WEBM (Max 60s, 50MB)</p>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              {videoFile && (
                <div className="bg-innoxr-dark border border-innoxr-gray p-4 rounded-lg flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Activity className="text-green-500" size={20} />
                    <span className="text-sm font-mono truncate max-w-[200px]">{videoFile.name}</span>
                  </div>
                  <button
                    onClick={processVideo}
                    disabled={status !== ProcessingStatus.IDLE && status !== ProcessingStatus.COMPLETED}
                    className="bg-innoxr-accent text-black px-6 py-2 rounded font-bold hover:bg-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                  >
                    {status === ProcessingStatus.IDLE || status === ProcessingStatus.COMPLETED ? (
                      <>
                        <Cpu size={18} /> PROCESS
                      </>
                    ) : (
                      <span className="animate-pulse">PROCESSING...</span>
                    )}
                  </button>
                </div>
              )}

              {/* Terminal Log */}
              <Terminal logs={logs} />
            </div>

            {/* Right Column: Visualization */}
            <div className="space-y-6">
              <div className="aspect-square bg-black rounded-xl border border-innoxr-gray relative overflow-hidden shadow-2xl shadow-innoxr-accent/10 flex items-center justify-center group">
                
                {/* Background Grid */}
                <div className="absolute inset-0 opacity-20 pointer-events-none" 
                     style={{backgroundImage: 'radial-gradient(#333 1px, transparent 1px)', backgroundSize: '20px 20px'}}>
                </div>

                {/* Scanline Effect */}
                {status !== ProcessingStatus.IDLE && status !== ProcessingStatus.COMPLETED && (
                  <div className="absolute inset-0 z-20 pointer-events-none bg-gradient-to-b from-transparent via-innoxr-accent/20 to-transparent h-[10%] w-full animate-scan"></div>
                )}

                {/* Content */}
                {resultImage ? (
                  <img src={resultImage} alt="Hologram Result" className="w-full h-full object-contain p-4" />
                ) : (
                  <div className="text-center p-8 opacity-50">
                    <Camera size={48} className="mx-auto mb-4 text-gray-600" />
                    <p className="font-mono text-sm">WAITING FOR INPUT STREAM...</p>
                  </div>
                )}

                {/* Progress Overlay */}
                {(status === ProcessingStatus.EXTRACTING || status === ProcessingStatus.ANALYZING || status === ProcessingStatus.RECONSTRUCTING) && (
                  <div className="absolute inset-0 bg-black/80 z-30 flex flex-col items-center justify-center p-8">
                    <div className="w-full max-w-xs space-y-2">
                       <div className="flex justify-between text-xs font-mono text-innoxr-accent">
                         <span>{status}</span>
                         <span>{progress}%</span>
                       </div>
                       <div className="h-1 bg-gray-800 rounded-full overflow-hidden">
                         <div className="h-full bg-innoxr-accent transition-all duration-300" style={{width: `${progress}%`}}></div>
                       </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Download Actions */}
              {resultImage && (
                <div className="flex justify-end">
                   <a 
                     href={resultImage} 
                     download={`innoxr_hologram_${Date.now()}.png`}
                     className="bg-white/10 border border-white/20 text-white px-6 py-3 rounded hover:bg-white/20 transition-all flex items-center gap-2 group"
                   >
                     <Download size={18} className="group-hover:-translate-y-1 transition-transform" />
                     <span>DOWNLOAD SCHEMATIC</span>
                   </a>
                </div>
              )}
            </div>
          </div>
        )}
      </main>

      <footer className="border-t border-innoxr-gray mt-12 py-8 bg-black">
        <div className="max-w-7xl mx-auto px-4 text-center text-gray-600 text-sm">
           <p>&copy; {new Date().getFullYear()} INNOXR LABS. CONFIDENTIAL. AUTHORIZED USE ONLY.</p>
        </div>
      </footer>
    </div>
  );
};

const root = createRoot(document.getElementById('root')!);
root.render(<App />);
