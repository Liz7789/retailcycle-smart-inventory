import React, { useRef, useState, useEffect, useMemo } from 'react';
import { InventoryTask } from '../types';
import { ChevronLeft, Check, X, Maximize2, HelpCircle } from 'lucide-react';

interface SignatureScreenProps {
  task: InventoryTask;
  onClose: () => void;
  onFinish: () => void;
}

const SignatureScreen: React.FC<SignatureScreenProps> = ({ task, onClose, onFinish }) => {
  const [step, setStep] = useState<'REVIEW' | 'SIGNING' | 'SUCCESS'>('REVIEW');
  const [signatureImg, setSignatureImg] = useState<string | null>(null);
  const [showLandscape, setShowLandscape] = useState(false);
  const [showHelpModal, setShowHelpModal] = useState(false);

  // --- Optimization: Memoize Aggregation ---
  const skuList = useMemo(() => {
    const skuMap = new Map<string, { 
        sku: string; 
        name: string; 
        expected: number; 
        actual: number; 
        price: number; 
    }>();

    task.items.forEach(item => {
        if (!skuMap.has(item.sku)) {
        skuMap.set(item.sku, { 
            sku: item.sku, 
            name: item.name, 
            expected: 0, 
            actual: 0,
            price: item.price
        });
        }
        const entry = skuMap.get(item.sku)!;
        entry.expected += 1; 

        if (item.countMethod === 'SCAN') {
        if (task.scannedImeis.has(item.imei)) {
            entry.actual += 1;
        }
        } else {
        entry.actual += (item.manualCount ?? (task.scannedImeis.has(item.imei) ? 1 : 0));
        }
    });

    return Array.from(skuMap.values());
  }, [task.items, task.scannedImeis]);

  const skuCount = skuList.length;
  const totalInventoryValue = task.items.reduce((acc, curr) => acc + curr.price, 0);
  const employeeName = "唐亚茹"; 
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // --- SIGNING LOGIC ---
  useEffect(() => {
    if (step === 'SIGNING') {
      const canvas = canvasRef.current;
      if (canvas) {
        const ctx = canvas.getContext('2d');
        if (ctx) {
          canvas.width = window.innerWidth;
          canvas.height = window.innerHeight * 0.8;
          ctx.strokeStyle = '#000';
          ctx.lineWidth = 4;
          ctx.lineCap = 'round';
        }
      }
    }
  }, [step]);

  const handleStartDraw = (e: any) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const rect = canvas.getBoundingClientRect();
    const x = (e.touches ? e.touches[0].clientX : e.clientX) - rect.left;
    const y = (e.touches ? e.touches[0].clientY : e.clientY) - rect.top;
    ctx.beginPath();
    ctx.moveTo(x, y);
  };

  const handleDraw = (e: any) => {
    if (e.buttons !== 1 && !e.touches) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const rect = canvas.getBoundingClientRect();
    const x = (e.touches ? e.touches[0].clientX : e.clientX) - rect.left;
    const y = (e.touches ? e.touches[0].clientY : e.clientY) - rect.top;
    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    ctx?.clearRect(0, 0, canvas!.width, canvas!.height);
  };

  const saveSignature = () => {
    const canvas = canvasRef.current;
    if (canvas) {
        task.signature = canvas.toDataURL(); 
        setSignatureImg(task.signature);
        setStep('REVIEW');
    }
  };

  // --- SUB-COMPONENT: LANDSCAPE MODAL ---
  const LandscapeModal = () => (
    <div className="fixed inset-0 bg-white z-[60] flex items-center justify-center overflow-hidden">
       {/* Container rotated 90deg to simulate landscape on portrait phone */}
       <div className="w-[100vh] h-[100vw] rotate-90 origin-center bg-slate-50 flex flex-col">
          <div className="bg-white p-4 shadow-sm flex items-center justify-between shrink-0">
             <button onClick={() => setShowLandscape(false)} className="p-2"><ChevronLeft size={24}/></button>
             <span className="font-bold text-lg">日盘商品明细</span>
             <div className="w-8"></div>
          </div>
          <div className="flex-1 overflow-auto p-4">
             <table className="w-full text-left border-collapse">
                <thead>
                   <tr className="text-sm text-slate-500 border-b border-slate-200">
                      <th className="p-3 font-medium">序号</th>
                      <th className="p-3 font-medium">商品名称</th>
                      <th className="p-3 font-medium text-center">SKU ID</th>
                      <th className="p-3 font-medium text-center">实盘</th>
                      <th className="p-3 font-medium text-center">
                          <div className="flex items-center justify-center gap-1">
                             差异
                             <button onClick={() => setShowHelpModal(true)} className="text-slate-300 active:text-slate-500">
                                <HelpCircle size={14} />
                             </button>
                          </div>
                      </th>
                      <th className="p-3 font-medium text-center">盘点人</th>
                   </tr>
                </thead>
                <tbody>
                   {skuList.map((item, idx) => {
                      const diff = item.actual - item.expected;
                      return (
                        <tr key={item.sku} className="border-b border-slate-100 text-sm">
                            <td className="p-3 text-slate-400 font-mono">{String(idx + 1).padStart(2, '0')}</td>
                            <td className="p-3 font-bold text-slate-800">{item.name}</td>
                            <td className="p-3 text-center text-slate-500">{item.sku}</td>
                            <td className="p-3 text-center font-bold text-slate-800 text-lg">{item.actual}</td>
                            <td className={`p-3 text-center font-bold text-lg ${diff === 0 ? 'text-slate-300' : (diff > 0 ? 'text-orange-500' : 'text-red-500')}`}>
                                {diff > 0 ? `+${diff}` : diff}
                            </td>
                            <td className="p-3 text-center text-slate-600">{employeeName}</td>
                        </tr>
                      );
                   })}
                </tbody>
             </table>
          </div>
       </div>
    </div>
  );

  // --- RENDER VIEWS ---

  if (step === 'SUCCESS') {
      return (
        <div className="flex flex-col h-full bg-slate-50 relative">
            <div className="bg-white pb-2 shadow-sm sticky top-0 z-20">
                <div className="flex items-center p-4">
                    <button onClick={onFinish} className="p-1 -ml-2 text-slate-600"><ChevronLeft size={24}/></button>
                    <div className="flex-1 text-center font-bold text-slate-800 text-lg">MIDE00003</div>
                    <div className="w-8"></div>
                </div>
                <div className="flex justify-between items-center px-8 mb-2">
                 {[1,2,3,4].map(id => (
                     <div key={id} className="flex-1 flex flex-col items-center relative">
                        {id < 4 && <div className="absolute top-3 left-1/2 w-full h-[1px] -z-10 bg-blue-500"></div>}
                        <div className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold mb-1 bg-blue-500 text-white shadow-blue-200">
                            <Check size={14}/>
                        </div>
                     </div>
                 ))}
                </div>
            </div>

            <div className="flex-1 flex flex-col items-center justify-center p-8">
                <div className="w-20 h-20 bg-emerald-500 rounded-full flex items-center justify-center text-white mb-6 shadow-xl shadow-emerald-200">
                    <Check size={40} strokeWidth={3} />
                </div>
                <h2 className="text-xl font-bold text-slate-800 mb-2">日盘差异成功提交</h2>
                
                <div className="w-full bg-white border border-red-200 p-4 text-center text-sm text-slate-500 mb-8 rounded-lg">
                    日盘差异单已发送到邮箱 tang***@xiaomi.com 请注意查收。
                </div>
            </div>

            <div className="p-4 bg-white border-t border-slate-100 pb-8">
                <button onClick={onFinish} className="w-full py-3 bg-blue-600 text-white rounded-full font-bold shadow-lg shadow-blue-200">
                    完成
                </button>
            </div>
        </div>
      )
  }

  if (step === 'SIGNING') {
      return (
        <div className="fixed inset-0 bg-white z-50 flex flex-col">
            <div className="flex justify-between items-center p-4 border-b border-slate-100">
                <div className="text-sm text-slate-500 rotate-90 origin-left translate-y-8">请在上方空白处书写您的姓名</div>
                <button onClick={() => setStep('REVIEW')} className="p-2"><X size={24}/></button>
            </div>
            
            <div className="flex-1 bg-slate-50 relative overflow-hidden">
                <canvas 
                    ref={canvasRef}
                    className="touch-none w-full h-full"
                    onMouseDown={handleStartDraw}
                    onMouseMove={handleDraw}
                    onTouchStart={handleStartDraw}
                    onTouchMove={handleDraw}
                />
            </div>

            <div className="p-4 border-t border-slate-100 flex justify-between items-center bg-white pb-8">
                 <button onClick={clearCanvas} className="px-6 py-2 border border-slate-300 rounded-full text-slate-600 text-sm">清除重写</button>
                 <button onClick={saveSignature} className="px-8 py-2 bg-blue-600 text-white rounded-full font-bold shadow-lg shadow-blue-200">提交签字</button>
            </div>
        </div>
      );
  }

  // REVIEW PAGE (Default)
  return (
    <div className="flex flex-col h-full bg-slate-50 relative">
       {showLandscape && <LandscapeModal />}
       
       {/* Help Modal */}
       {showHelpModal && (
        <div className="absolute inset-0 z-[70] flex items-center justify-center bg-black/50 p-6 backdrop-blur-sm animate-in fade-in">
           <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-2xl animate-in zoom-in-95 duration-200 relative">
               <button 
                 onClick={() => setShowHelpModal(false)}
                 className="absolute top-4 right-4 p-2 text-slate-400 active:text-slate-800"
               >
                   <X size={20} />
               </button>
               
               <h3 className="text-lg font-bold text-slate-800 mb-6">名词解释</h3>
               
               <div>
                  <div className="flex items-center gap-2 mb-2">
                      <div className="w-1 h-4 bg-blue-600 rounded-full"></div>
                      <h4 className="font-bold text-slate-700">差异数量 (Variance Qty)</h4>
                  </div>
                  <p className="text-sm text-slate-500 mb-2 leading-relaxed">
                      反映单个SKU实盘与账面的数量差额。
                  </p>
                  <div className="bg-slate-50 p-2 rounded border border-slate-100 text-xs font-mono text-slate-600">
                      公式: 实盘数 - 账面数
                  </div>
                  <ul className="text-xs text-slate-400 mt-2 list-disc pl-4 space-y-1">
                      <li>正数 (+): 盘盈，实盘多于账面</li>
                      <li>负数 (-): 盘亏，实盘少于账面</li>
                      <li>零 (0): 账实相符</li>
                  </ul>
               </div>

               <button 
                  onClick={() => setShowHelpModal(false)}
                  className="w-full mt-8 py-3 bg-slate-100 text-slate-700 font-bold rounded-xl"
               >
                   我知道了
               </button>
           </div>
        </div>
       )}

       {/* Header with Stepper (Step 3) */}
       <div className="bg-white pb-2 shadow-sm sticky top-0 z-20">
        <div className="flex items-center p-4">
          <button onClick={onClose} className="p-1 -ml-2 text-slate-600">
            <ChevronLeft size={24} />
          </button>
          <div className="flex-1 text-center font-bold text-slate-800 text-lg">
             {task.id.split(' ').pop()}
          </div>
          <div className="w-8"></div>
        </div>

        <div className="flex justify-between items-center px-8 mb-2">
          {[
            { id: 1, label: '扫码', active: true },
            { id: 2, label: '确认', active: true },
            { id: 3, label: '签字', active: true },
            { id: 4, label: '提交', active: false }
          ].map((step, idx, arr) => (
            <div key={step.id} className="flex-1 flex flex-col items-center relative">
              {idx !== arr.length - 1 && (
                <div className={`absolute top-3 left-1/2 w-full h-[1px] -z-10 ${step.active ? 'bg-blue-500' : 'bg-slate-200'}`}></div>
              )}
              <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold mb-1 ${
                step.active ? 'bg-blue-500 text-white shadow-blue-200 shadow-md' : 'bg-slate-100 text-slate-400'
              }`}>
                {step.id}
              </div>
              <span className={`text-[10px] ${step.active ? 'text-blue-600 font-medium' : 'text-slate-400'}`}>
                {step.label}
              </span>
            </div>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
         {/* Store Info Card */}
         <div className="bg-white p-4 rounded-xl shadow-sm">
             <h3 className="font-bold text-slate-800 text-lg mb-4">德国门牌号</h3>
             <div className="space-y-2 text-xs text-slate-500">
                 <div className="flex"><span className="w-20 text-slate-400">日盘日期:</span> 09-12-2025 08:10:22</div>
                 <div className="flex"><span className="w-20 text-slate-400">库存类型:</span> 商品良品</div>
                 <div className="flex"><span className="w-20 text-slate-400">SKU数量:</span> {skuCount}</div>
                 <div className="flex"><span className="w-20 text-slate-400">库存金额:</span> {totalInventoryValue.toLocaleString()}</div>
                 <div className="flex"><span className="w-20 text-slate-400">盘点单号:</span> {task.id.replace('TASK-', 'PDD')}</div>
             </div>
         </div>

         {/* SKU Preview List */}
         <div className="bg-white rounded-xl shadow-sm overflow-hidden">
             <div className="flex bg-slate-50 p-3 text-xs text-slate-400 border-b border-slate-100">
                 <div className="w-10 text-center">序号</div>
                 <div className="flex-1">商品名称</div>
                 <div className="w-14 text-center">实盘</div>
                 <div className="w-14 text-center">
                     <div className="flex items-center justify-center gap-1">
                        差异
                        <button onClick={() => setShowHelpModal(true)} className="text-slate-300 active:text-slate-500">
                            <HelpCircle size={14} />
                        </button>
                     </div>
                 </div>
                 <div className="w-14 text-center">盘点人</div>
             </div>
             {skuList.slice(0, 5).map((d, i) => {
                 const diff = d.actual - d.expected;
                 return (
                    <div key={i} className="flex p-3 text-xs border-b border-slate-50 last:border-0 items-center">
                        <div className="w-10 text-center text-slate-300 font-mono">0{i+1}</div>
                        <div className="flex-1 pr-2">
                            <div className="text-slate-600 mb-0.5">({d.sku}){d.name}</div>
                        </div>
                        <div className="w-14 text-center font-bold text-slate-800">{d.actual}</div>
                        <div className={`w-14 text-center font-bold ${diff === 0 ? 'text-slate-300' : (diff > 0 ? 'text-orange-500' : 'text-red-500')}`}>
                            {diff > 0 ? `+${diff}` : (diff === 0 ? '-' : diff)}
                        </div>
                        <div className="w-14 text-center text-slate-500">{employeeName}</div>
                    </div>
                 );
             })}
             <button 
                onClick={() => setShowLandscape(true)}
                className="w-full p-3 text-center text-xs text-slate-500 flex items-center justify-center gap-1 border-t border-slate-100 active:bg-slate-50"
             >
                查看全部 <Maximize2 size={12} />
             </button>
         </div>

         {/* Signature Section */}
         <div className="mt-4">
             <p className="text-xs text-slate-400 mb-2">说明：若有代签或签字错误情况，责任后果自负<br/>当前账号：{employeeName}，请 {employeeName} 本人签署姓名</p>
             
             <div 
                onClick={() => setStep('SIGNING')}
                className="w-full h-32 bg-white border border-slate-200 rounded-xl flex items-center justify-center cursor-pointer active:bg-slate-50 overflow-hidden"
             >
                {signatureImg ? (
                    <img src={signatureImg} alt="Signature" className="h-full object-contain" />
                ) : (
                    <span className="text-slate-300 text-lg">点击签署姓名</span>
                )}
             </div>
         </div>
      </div>

      <div className="bg-white border-t border-slate-100 p-4 pb-8 flex gap-3 shadow-lg z-20">
        <button 
          onClick={() => setStep('SUCCESS')}
          disabled={!signatureImg}
          className={`w-full py-3 rounded-full font-bold text-white shadow-md flex items-center justify-center gap-2 ${!signatureImg ? 'bg-slate-300' : 'bg-blue-600 active:bg-blue-700 shadow-blue-200'}`}
        >
           签字完成，去提交
        </button>
      </div>
    </div>
  );
};

export default SignatureScreen;