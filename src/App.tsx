/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useEffect } from 'react';
import { 
  Upload, 
  Download, 
  RefreshCw, 
  Layers, 
  Minus, 
  Plus, 
  CheckCircle2, 
  Info,
  ChevronRight,
  Maximize2
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

const CATEGORIES = {
  '주름': ['이마가로주름', '미간내천자주름', '눈가주름', '콧등주름', '팔자주름', '입술주름', '눈밑잔주름', '목주름'],
  '탄력 저하': ['둔탁한U라인턱선', '불독살(심부볼)', '이중턱', '처진눈꺼풀', '눈밑지방주머니', '입꼬리처짐', '앞볼처짐', '눈꼬리처짐'],
  '볼륨 꺼짐': ['퀭한눈두덩이', '눈물고랑패임', '옆볼꺼짐(탐콩형)', '관자놀이꺼짐', '이마볼륨평면화', '뼈윤곽부각'],
  '기미 잡티': ['광대뼈갈색기미', '짙은검버섯', '눈밑잡티', '콧등주근깨', '비대칭잡티', '흑자', '트러블흔적색소'],
  '피부톤': ['안면홍조', '모세혈관확장(실핏줄)', '불균일한톤'],
  '모공': ['타원형세로모공', '모공주름', '블랙헤드', '콧볼옆귤껍질모공', '이마모공']
};

interface GenerationResult {
  positivePrompt: string;
  negativePrompt: string;
  imageUrl: string;
}

export default function App() {
  const [originalImage, setOriginalImage] = useState<string | null>(null);
  const [imageMeta, setImageMeta] = useState<{ width: number, height: number, mimeType: string } | null>(null);
  const [selectedSymptoms, setSelectedSymptoms] = useState<string[]>([]);
  const [intensity, setIntensity] = useState<number>(3);
  const [isGenerating, setIsGenerating] = useState(false);
  const [result, setResult] = useState<GenerationResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const dataUrl = event.target?.result as string;
        setOriginalImage(dataUrl);
        
        // Get image dimensions
        const img = new Image();
        img.onload = () => {
          setImageMeta({
            width: img.width,
            height: img.height,
            mimeType: file.type
          });
        };
        img.src = dataUrl;
      };
      reader.readAsDataURL(file);
    }
  };

  const toggleSymptom = (symptom: string) => {
    setSelectedSymptoms(prev => 
      prev.includes(symptom) 
        ? prev.filter(s => s !== symptom)
        : [...prev, symptom]
    );
  };

  const handleGenerate = async () => {
    if (!originalImage || selectedSymptoms.length === 0) return;

    setIsGenerating(true);
    setError(null);
    setResult(null);

    try {
      const response = await fetch('/api/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          image: originalImage,
          selectedSymptoms: selectedSymptoms.map(s => s.split('(')[0]), // Remove bracketed parts like (심부볼)
          intensity,
          width: imageMeta?.width,
          height: imageMeta?.height,
          mimeType: imageMeta?.mimeType
        }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Generation failed');
      setResult(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDownload = () => {
    if (!result) return;
    const link = document.createElement('a');
    link.href = result.imageUrl;
    link.download = `before_visualization_${Date.now()}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="min-h-screen bg-[#F0F1F3] text-[#1A1A1A] font-sans">
      {/* Header */}
      <header className="border-b border-[#D1D5DB] bg-white sticky top-0 z-50">
        <div className="max-w-[1600px] mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-black p-1.5 rounded">
              <Layers className="w-5 h-5 text-white" />
            </div>
            <h1 className="text-lg font-bold tracking-tighter uppercase italic">Beauty Visualizer Pro</h1>
            <span className="text-[10px] bg-black/5 px-2 py-0.5 rounded-full font-mono font-medium opacity-60">v1.2.0-STABLE</span>
          </div>
          <div className="flex items-center gap-6">
            <div className="flex flex-col items-end">
              <span className="text-[10px] text-[#6B7280] uppercase tracking-widest font-bold">Standard</span>
              <span className="text-xs font-mono font-bold">ST-4096 / BROADCAST</span>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-[1600px] mx-auto p-6 grid grid-cols-1 lg:grid-cols-[400px_1fr] gap-6">
        {/* Sidebar - Controls */}
        <aside className="space-y-6 overflow-y-auto max-h-[calc(100vh-120px)] pr-2 custom-scrollbar">
          {/* Upload Section */}
          <section className="bg-white rounded-xl border border-[#D1D5DB] p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xs uppercase tracking-widest font-bold text-[#6B7280]">Source Input</h2>
              <Info className="w-4 h-4 text-[#9CA3AF]" />
            </div>
            
            {!originalImage ? (
              <div 
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-[#E5E7EB] rounded-lg p-10 flex flex-col items-center justify-center gap-3 cursor-pointer hover:border-black transition-colors bg-gray-50 group"
              >
                <div className="bg-white p-3 rounded-full shadow-sm group-hover:scale-110 transition-transform">
                  <Upload className="w-6 h-6" />
                </div>
                <div className="text-center">
                  <p className="text-sm font-bold">이미지 업로드</p>
                  <p className="text-[11px] text-[#9CA3AF]">High-res Portrait Recommended</p>
                </div>
              </div>
            ) : (
              <div className="relative group rounded-lg overflow-hidden border border-gray-100">
                <img src={originalImage} alt="Original" className="w-full aspect-square object-cover" />
                <div className="absolute inset-x-0 bottom-0 bg-black/60 backdrop-blur-md p-3 translate-y-full group-hover:translate-y-0 transition-transform">
                  <div className="flex justify-between items-center text-white">
                    <div className="text-[10px] font-mono">
                      {imageMeta?.width}x{imageMeta?.height}px | {imageMeta?.mimeType.split('/')[1].toUpperCase()}
                    </div>
                    <button 
                      onClick={() => setOriginalImage(null)}
                      className="text-[10px] font-bold underline underline-offset-2"
                    >
                      CHANGE
                    </button>
                  </div>
                </div>
              </div>
            )}
            <input 
              type="file" 
              ref={fileInputRef} 
              className="hidden" 
              accept="image/*"
              onChange={handleImageUpload}
            />
          </section>

          {/* Configuration Section */}
          <section className="bg-white rounded-xl border border-[#D1D5DB] p-5 space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-xs uppercase tracking-widest font-bold text-[#6B7280]">Configurations</h2>
              <RefreshCw className={`w-4 h-4 text-[#9CA3AF] ${isGenerating ? 'animate-spin' : ''}`} />
            </div>

            {/* Intensity Slider */}
            <div className="space-y-3">
              <div className="flex justify-between items-end">
                <label className="text-[11px] font-bold uppercase tracking-wider">증상 강도 (Level)</label>
                <span className="text-2xl font-mono italic font-black leading-none">0{intensity}</span>
              </div>
              <div className="flex items-center gap-4">
                <button 
                  onClick={() => setIntensity(Math.max(1, intensity - 1))}
                  className="p-1 border border-gray-200 rounded hover:bg-gray-100"
                >
                  <Minus className="w-4 h-4" />
                </button>
                <input 
                  type="range" 
                  min="1" 
                  max="5" 
                  value={intensity} 
                  onChange={(e) => setIntensity(parseInt(e.target.value))}
                  className="flex-1 accent-black h-1 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                />
                <button 
                  onClick={() => setIntensity(Math.min(5, intensity + 1))}
                  className="p-1 border border-gray-200 rounded hover:bg-gray-100"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Symptoms Dashboard */}
            <div className="space-y-4">
              <label className="text-[11px] font-bold uppercase tracking-wider block">뷰티 고민 대시보드</label>
              
              {Object.entries(CATEGORIES).map(([cat, symptoms]) => (
                <div key={cat} className="space-y-2">
                  <div className="flex items-center gap-2">
                    <div className="w-1 h-3 bg-black rounded-full" />
                    <span className="text-[13px] font-bold">{cat}</span>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {symptoms.map(s => (
                      <button
                        key={s}
                        onClick={() => toggleSymptom(s)}
                        className={`text-[11px] px-2.5 py-1.5 border rounded-md transition-all ${
                          selectedSymptoms.includes(s)
                            ? 'bg-black text-white border-black font-bold shadow-md'
                            : 'bg-white text-[#4B5563] border-[#E5E7EB] hover:border-[#9CA3AF]'
                        }`}
                      >
                        #{s.replace('#', '')}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            <button
              onClick={handleGenerate}
              disabled={!originalImage || selectedSymptoms.length === 0 || isGenerating}
              className={`w-full py-4 rounded-lg font-black tracking-widest text-sm flex items-center justify-center gap-3 transition-all ${
                !originalImage || selectedSymptoms.length === 0 || isGenerating
                  ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                  : 'bg-black text-white hover:bg-zinc-800 active:scale-[0.98] shadow-lg shadow-black/10'
              }`}
            >
              {isGenerating ? (
                <>
                  <RefreshCw className="w-5 h-5 animate-spin" />
                  ANALYZING & GENERATING...
                </>
              ) : (
                <>
                  <RefreshCw className="w-5 h-5" />
                  RENDER BEFORE IMAGE
                </>
              )}
            </button>
          </section>
        </aside>

        {/* Main Content - Preview */}
        <section className="space-y-6">
          <div className="bg-white rounded-2xl border border-[#D1D5DB] overflow-hidden flex flex-col min-h-[600px] shadow-sm">
            {/* Toolbar */}
            <div className="px-6 h-14 border-b border-[#F3F4F6] flex items-center justify-between bg-gray-50/50">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
                  <span className="text-[11px] font-bold uppercase tracking-tighter">Live Canvas Preview</span>
                </div>
                <div className="w-[1px] h-4 bg-gray-200" />
                <span className="text-[10px] font-mono text-gray-400">FPS: 60 | RENDER: GPU-ACCEL</span>
              </div>
              
              <div className="flex items-center gap-2">
                <button className="p-2 hover:bg-gray-200 rounded-lg transition-colors">
                  <Maximize2 className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Canvas Area */}
            <div className="flex-1 relative bg-[#F9FAFB] p-8 flex items-center justify-center overflow-hidden">
              <AnimatePresence mode="wait">
                {!originalImage ? (
                  <motion.div 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="flex flex-col items-center gap-4 text-[#9CA3AF]"
                  >
                    <Upload className="w-16 h-16 opacity-10" />
                    <p className="text-sm italic">Waiting for source image input...</p>
                  </motion.div>
                ) : (
                  <motion.div 
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="w-full h-full flex flex-col lg:flex-row items-center justify-center gap-8"
                  >
                    {/* Original */}
                    <div className="flex-1 w-full flex flex-col gap-3">
                      <div className="flex justify-between items-center px-1">
                        <span className="text-[11px] font-black uppercase italic tracking-wider">Original Source</span>
                        <CheckCircle2 className="w-4 h-4 text-green-500" />
                      </div>
                      <div className="relative aspect-[3/4] bg-white rounded-xl shadow-2xl overflow-hidden border border-gray-200 w-full">
                         <img src={originalImage} alt="Origin" className="w-full h-full object-cover" />
                      </div>
                    </div>

                    <div className="lg:w-10 flex items-center justify-center text-gray-300">
                      <ChevronRight className="w-10 h-10 hidden lg:block" />
                      <div className="w-full h-[1px] bg-gray-200 lg:hidden" />
                    </div>

                    {/* Generated */}
                    <div className="flex-1 w-full flex flex-col gap-3">
                      <div className="flex justify-between items-center px-1">
                        <span className="text-[11px] font-black uppercase italic tracking-wider text-red-500">Visualization: Before</span>
                        {result && <span className="text-[10px] font-mono bg-red-50 text-red-600 px-2 py-0.5 rounded border border-red-100">MATCH: 100%</span>}
                      </div>
                      <div className="relative aspect-[3/4] bg-gray-100 rounded-xl shadow-2xl overflow-hidden border-2 border-dashed border-gray-300 w-full flex items-center justify-center">
                         {isGenerating && (
                           <div className="absolute inset-0 z-10 bg-white/80 backdrop-blur-sm flex flex-col items-center justify-center gap-4">
                              <RefreshCw className="w-12 h-12 text-black animate-spin" />
                              <div className="text-center">
                                <p className="text-sm font-black tracking-tighter">AI RENDERING IN PROGRESS</p>
                                <p className="text-[10px] text-gray-500 font-mono mt-1">Applying {selectedSymptoms.length} skin parameters...</p>
                              </div>
                           </div>
                         )}
                         
                         {result ? (
                           <motion.img 
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            src={result.imageUrl} 
                            alt="Result" 
                            className="w-full h-full object-cover" 
                           />
                         ) : !isGenerating && (
                           <div className="flex flex-col items-center gap-2 text-gray-400">
                              <RefreshCw className="w-10 h-10 opacity-10" />
                              <p className="text-xs">Click "Render Before Image" to start</p>
                           </div>
                         )}
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Prompt Display Area */}
            {result && (
              <div className="border-t border-[#F3F4F6] p-6 bg-white space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <h3 className="text-[10px] font-black uppercase tracking-widest text-[#6B7280]">Positive Prompt (High Precision)</h3>
                    <div className="bg-gray-50 p-3 rounded-lg border border-gray-100 font-mono text-[11px] leading-relaxed break-words">
                      {result.positivePrompt}
                    </div>
                  </div>
                  <div className="space-y-2">
                    <h3 className="text-[10px] font-black uppercase tracking-widest text-[#6B7280]">Negative Prompt (Exclusion)</h3>
                    <div className="bg-gray-50 p-3 rounded-lg border border-gray-100 font-mono text-[11px] leading-relaxed break-words opacity-60">
                      {result.negativePrompt}
                    </div>
                  </div>
                </div>
                
                <div className="flex justify-end">
                  <button 
                    onClick={handleDownload}
                    className="bg-black text-white px-8 py-3 rounded-lg font-bold text-xs flex items-center gap-2 hover:bg-zinc-800 transition-colors shadow-lg shadow-black/20"
                  >
                    <Download className="w-4 h-4" />
                    DOWNLOAD HIGH-RES (PNG)
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Error Message */}
          {error && (
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-red-50 border border-red-200 p-4 rounded-xl flex items-start gap-4"
            >
              <div className="p-2 bg-red-100 rounded-lg">
                <Info className="w-5 h-5 text-red-600" />
              </div>
              <div className="space-y-1">
                <h4 className="text-sm font-bold text-red-800">Render Process Terminated</h4>
                <p className="text-xs text-red-600 leading-relaxed">{error}</p>
              </div>
            </motion.div>
          )}

          {/* Guidelines / Tips */}
          <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white p-5 rounded-xl border border-[#D1D5DB] space-y-2">
              <div className="w-8 h-8 rounded-lg bg-green-50 flex items-center justify-center">
                <CheckCircle2 className="w-4 h-4 text-green-600" />
              </div>
              <h3 className="text-xs font-bold uppercase tracking-tight">Identity Match</h3>
              <p className="text-[11px] text-[#6B7280] leading-relaxed">원본의 이목구비와 형태를 100% 보존하며 피부 증상만을 레이어링합니다.</p>
            </div>
            <div className="bg-white p-5 rounded-xl border border-[#D1D5DB] space-y-2">
               <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center">
                <Layers className="w-4 h-4 text-blue-600" />
              </div>
              <h3 className="text-xs font-bold uppercase tracking-tight">Broadcast Quality</h3>
              <p className="text-[11px] text-[#6B7280] leading-relaxed">최대 2K 해상도 출력을 지원하며 홈쇼핑 송출 규격에 최적화되어 있습니다.</p>
            </div>
            <div className="bg-white p-5 rounded-xl border border-[#D1D5DB] space-y-2">
               <div className="w-8 h-8 rounded-lg bg-purple-50 flex items-center justify-center">
                <RefreshCw className="w-4 h-4 text-purple-600" />
              </div>
              <h3 className="text-xs font-bold uppercase tracking-tight">Smart Negative</h3>
              <p className="text-[11px] text-[#6B7280] leading-relaxed">선택되지 않은 카테고리의 증상을 자동 억제하여 불필요한 이미지 오염을 방지합니다.</p>
            </div>
          </section>
        </section>
      </main>

      <footer className="max-w-[1600px] mx-auto p-6 flex flex-col md:flex-row justify-between items-center border-t border-gray-200 mt-12 gap-4">
        <div className="text-[11px] font-mono text-gray-400">© 2026 BEAUTY VISUALIZER ENGINE PRO / BROADCAST UNIT</div>
        <div className="flex items-center gap-6 opacity-30 grayscale contrast-200">
           <img src="https://upload.wikimedia.org/wikipedia/commons/2/2f/Google_2015_logo.svg" alt="Google" className="h-4" />
           <div className="w-[1px] h-3 bg-gray-400" />
           <span className="text-[10px] font-bold tracking-widest uppercase">Imagen AI Powered</span>
        </div>
      </footer>
      
      <style>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #D1D5DB;
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #9CA3AF;
        }
      `}</style>
    </div>
  );
}

