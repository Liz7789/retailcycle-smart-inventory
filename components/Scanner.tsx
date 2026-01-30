import React, { useState, useMemo, useEffect } from 'react';
import { InventoryTask } from '../types';
import { ScanBarcode, ChevronLeft, Search, PenLine, CheckCircle2, AlertTriangle, AlertCircle, History } from 'lucide-react';

interface ScannerProps {
  task: InventoryTask;
  onScan: (imei: string) => void;
  onQuantityUpdate?: (sku: string, count: number) => void;
  onFinish: () => void;
  onBack: () => void;
}

const Scanner: React.FC<ScannerProps> = ({ task, onScan, onQuantityUpdate, onFinish, onBack }) => {
  const [activeTab, setActiveTab] = useState<'scanned' | 'unscanned'>('unscanned');
  const [showCamera, setShowCamera] = useState(false);
  const [cameraMode, setCameraMode] = useState<'VIEWFINDER' | 'MANUAL'>('VIEWFINDER');
  const [manualInput, setManualInput] = useState('');
  const [scanResult, setScanResult] = useState<{ code: string; isDuplicate: boolean } | null>(null);
  
  // Search State
  const [searchQuery, setSearchQuery] = useState('');

  // Zero Confirmation State
  const [zeroConfirmSku, setZeroConfirmSku] = useState<string | null>(null);

  // --- Optimization: Memoize List Calculations ---
  const { unscannedItems, scannedItems, overageImeis, progressPercent } = useMemo(() => {
      const scannedSet = task.scannedImeis;
      
      // Separate items
      const unscanned = task.items.filter(i => !scannedSet.has(i.imei));
      const scanned = task.items.filter(i => scannedSet.has(i.imei));
      
      // Identify Overage
      const overage = Array.from(scannedSet).filter(id => !task.items.find(i => i.imei === id));
      
      // Sort unscanned: SCAN items first
      unscanned.sort((a, b) => {
          if (a.countMethod === b.countMethod) return 0;
          return a.countMethod === 'SCAN' ? -1 : 1;
      });

      // Calculate Progress (Based on Expected Items found)
      const totalExpected = task.items.length;
      const foundExpected = scanned.length;
      const percent = totalExpected > 0 ? (foundExpected / totalExpected) * 100 : 0;

      return {
          unscannedItems: unscanned,
          scannedItems: scanned,
          overageImeis: overage,
          progressPercent: percent
      };
  }, [task.items, task.scannedImeis]);

  // Apply Search Filter
  const baseList = activeTab === 'unscanned' ? unscannedItems : scannedItems;
  const displayList = useMemo(() => {
    if (!searchQuery.trim()) return baseList;
    const lowerQ = searchQuery.toLowerCase();
    return baseList.filter(item => 
      item.sku.toLowerCase().includes(lowerQ) || 
      item.name.toLowerCase().includes(lowerQ) ||
      item.imei.toLowerCase().includes(lowerQ)
    );
  }, [baseList, searchQuery, activeTab]); 

  const handleManualScan = (e: React.FormEvent) => {
    e.preventDefault();
    if (manualInput.length > 4) {
      processScan(manualInput);
      setManualInput('');
      setCameraMode('VIEWFINDER');
    }
  };

  const processScan = (code: string) => {
      // Haptic Feedback
      if (navigator.vibrate) navigator.vibrate(50);

      if (task.scannedImeis.has(code)) {
          setScanResult({ code, isDuplicate: true });
          if (navigator.vibrate) navigator.vibrate([50, 50, 50]); 
      } else {
          onScan(code);
          setScanResult({ code, isDuplicate: false });
          // Note: Last Scanned Info is now updated in App.tsx via onScan
      }
  };

  // Simulate scanning a random unscanned item when clicking the viewfinder
  const handleSimulatedCameraScan = () => {
      const target = unscannedItems.find(i => i.countMethod === 'SCAN') || unscannedItems[0];
      const codeToScan = target ? target.imei : '86542105100016';
      processScan(codeToScan);
  };

  const handleQuantityChange = (sku: string, val: string) => {
    const num = parseInt(val);
    if (val === '' || num === 0) {
        setZeroConfirmSku(sku);
    } else if (!isNaN(num) && onQuantityUpdate) {
        onQuantityUpdate(sku, num);
    }
  };

  const confirmZeroQuantity = () => {
      if (zeroConfirmSku && onQuantityUpdate) {
          onQuantityUpdate(zeroConfirmSku, 0);
          setZeroConfirmSku(null);
      }
  };

  const incrementQuantity = (sku: string, current: number) => {
    if (onQuantityUpdate) onQuantityUpdate(sku, current + 1);
  };

  const decrementQuantity = (sku: string, current: number) => {
    if (current - 1 <= 0) {
        setZeroConfirmSku(sku);
    } else {
        if (onQuantityUpdate) onQuantityUpdate(sku, current - 1);
    }
  };

  return (
    <div className="flex flex-col h-full bg-slate-50 relative">
      {/* 1. Header with Stepper */}
      <div className="bg-white pb-0 shadow-sm sticky top-0 z-20">
        <div className="flex items-center p-4">
          <button onClick={onBack} className="p-1 -ml-2 text-slate-600">
            <ChevronLeft size={24} />
          </button>
          <div className="flex-1 text-center font-bold text-slate-800 text-lg">
            {task.id.split(' ').pop()}
          </div>
          <div className="w-8"></div>
        </div>

        {/* Stepper - Optimized for I18n */}
        <div className="flex justify-between items-start px-4 mb-4">
          {[
            { id: 1, label: '扫码', active: true },
            { id: 2, label: '确认', active: false },
            { id: 3, label: '签字', active: false },
            { id: 4, label: '提交', active: false }
          ].map((step, idx, arr) => (
            <div key={step.id} className="flex-1 flex flex-col items-center relative z-10">
              {idx !== arr.length - 1 && (
                <div className={`absolute top-3 left-1/2 w-full h-[1px] -z-10 ${step.active ? 'bg-blue-500' : 'bg-slate-200'}`}></div>
              )}
              <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold mb-1 shrink-0 ${
                step.active ? 'bg-blue-500 text-white shadow-blue-200 shadow-md' : 'bg-slate-100 text-slate-400'
              }`}>
                {step.id}
              </div>
              {/* Allow text to wrap if long */}
              <span className={`text-[10px] text-center w-full break-words leading-tight px-0.5 ${step.active ? 'text-blue-600 font-medium' : 'text-slate-400'}`}>
                {step.label}
              </span>
            </div>
          ))}
        </div>

        {/* Progress Bar */}
        <div className="w-full h-1 bg-slate-100">
            <div 
                className="h-full bg-green-500 transition-all duration-500 ease-out" 
                style={{ width: `${progressPercent}%` }}
            ></div>
        </div>

        {/* Control Bar: Search on Top, Tabs Below */}
        <div className="px-4 mt-3">
             <div className="relative">
                 <Search className="absolute left-3 top-2.5 text-slate-400" size={16} />
                 <input 
                   type="search" 
                   enterKeyHint="search"
                   value={searchQuery}
                   onChange={(e) => setSearchQuery(e.target.value)}
                   placeholder="输入SKU/名称搜索..." 
                   className="w-full bg-slate-100 rounded-xl py-2.5 pl-9 pr-3 text-sm outline-none focus:ring-2 focus:ring-blue-100 focus:bg-white border border-transparent focus:border-blue-200 transition-all"
                 />
             </div>
        </div>

        <div className="px-4 mt-3 border-b border-slate-100 pb-2">
           <div className="flex bg-slate-100 rounded-lg p-1">
              <button 
                onClick={() => setActiveTab('unscanned')}
                className={`flex-1 py-1.5 text-xs font-bold rounded-md transition-all ${activeTab === 'unscanned' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'}`}
              >
                未盘 ({unscannedItems.length})
              </button>
              <button 
                onClick={() => setActiveTab('scanned')}
                className={`flex-1 py-1.5 text-xs font-bold rounded-md transition-all ${activeTab === 'scanned' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'}`}
              >
                已盘 ({task.scannedImeis.size})
              </button>
           </div>
        </div>
      </div>

      {/* 2. List Content */}
      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        
        {/* --- Persistent "Last Scanned" Banner (Reads from Task Prop) --- */}
        {task.lastAction && (
            <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-3 flex items-center justify-between shadow-sm animate-in slide-in-from-top-2">
                <div className="flex items-center gap-3 overflow-hidden">
                    <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600 shrink-0">
                        <History size={16} />
                    </div>
                    <div className="min-w-0">
                        <div className="text-[10px] text-emerald-600 font-bold uppercase tracking-wide">刚刚盘过</div>
                        <div className="text-sm font-bold text-slate-800 truncate">{task.lastAction.name}</div>
                    </div>
                </div>
                <div className="text-xs font-mono text-slate-400 shrink-0">
                    {task.lastAction.time}
                </div>
            </div>
        )}

        {/* Instructions (Only show if no last scanned info to save space, or keep it) */}
        {!task.lastAction && (
            <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-100">
            <h3 className="text-slate-800 font-bold mb-2">日盘操作说明</h3>
            <ul className="text-xs text-slate-500 space-y-1 list-disc pl-4">
                <li>支持多人同时盘点，每人一次只能操作一个SKU</li>
                <li>日盘期间库存不锁定，不影响正常销售</li>
                <li><span className="font-bold text-orange-600">模拟扫码：</span> 点击取景框内红色激光线。</li>
            </ul>
            </div>
        )}

        {/* Overage Items (Only show in Scanned tab) */}
        {activeTab === 'scanned' && overageImeis.map(imei => (
           <div key={imei} className="bg-white rounded-xl p-3 shadow-sm border border-slate-100 flex gap-3">
             <div className="w-16 h-16 bg-slate-100 rounded-lg flex items-center justify-center shrink-0">
               <ScanBarcode size={24} className="text-slate-400"/>
             </div>
             <div className="flex-1 min-w-0">
               <div className="flex justify-between items-start">
                   <div className="text-slate-800 font-bold text-sm truncate">Extra Item (盘盈)</div>
                   <div className="text-[10px] bg-orange-50 text-orange-600 px-2 py-0.5 rounded font-bold border border-orange-100">
                      SCAN
                   </div>
               </div>
               <div className="text-slate-500 text-xs mt-1">SN: {imei}</div>
             </div>
           </div>
        ))}

        {displayList.length === 0 && overageImeis.length === 0 ? (
          <div className="text-center py-12 text-slate-400 text-sm">
             {searchQuery ? '未找到相关商品' : (activeTab === 'unscanned' ? '已全部盘点' : '暂无已盘数据')}
          </div>
        ) : (
          displayList.map(item => (
            <div key={item.imei} className="bg-white rounded-xl p-3 shadow-sm border border-slate-100 flex gap-3 items-start">
              {/* Product Thumbnail */}
              <div className="w-20 h-20 bg-slate-100 rounded-lg overflow-hidden shrink-0 border border-slate-200">
                 {item.imageUrl ? <img src={item.imageUrl} alt="" className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-xs text-slate-400">No Img</div>}
              </div>
              
              <div className="flex-1 min-w-0">
                <div className="flex justify-between items-start">
                   <div className="text-xs text-slate-400 mb-0.5">({item.sku}){item.name}</div>
                </div>
                
                <div className="flex items-center justify-between mt-4">
                   {/* Count Method Logic */}
                   {item.countMethod === 'SCAN' ? (
                       <div className="flex items-center justify-between w-full">
                           <div className="text-[10px] bg-blue-50 text-blue-600 px-2 py-0.5 rounded font-bold border border-blue-100">
                              SCAN
                           </div>
                           {/* Show quantity x1 if in scanned tab */}
                           {activeTab === 'scanned' && (
                               <span className="text-lg font-bold text-slate-800">x1</span>
                           )}
                       </div>
                   ) : (
                      <div className="flex items-center justify-between w-full">
                         <div className="text-[10px] bg-emerald-50 text-emerald-600 px-2 py-0.5 rounded font-bold border border-emerald-100 shrink-0 mr-2">
                              填数
                         </div>
                         <div className="flex items-center gap-1 border border-slate-300 rounded-lg px-2 py-1 bg-white shadow-sm flex-1 max-w-[140px]">
                             <button 
                               className="text-slate-500 text-xl leading-none w-8 h-8 flex items-center justify-center active:bg-slate-100 rounded" 
                               onClick={() => decrementQuantity(item.sku, item.manualCount || 0)}
                             >-</button>
                             <input 
                                type="text"
                                inputMode="numeric"
                                pattern="[0-9]*"
                                className="text-sm font-bold w-full text-center outline-none p-0 appearance-none m-0"
                                value={item.manualCount ?? (task.scannedImeis.has(item.imei) ? 1 : 0)}
                                onChange={(e) => handleQuantityChange(item.sku, e.target.value)}
                             />
                             <button 
                                className="text-blue-600 text-xl leading-none w-8 h-8 flex items-center justify-center active:bg-blue-50 rounded" 
                                onClick={() => incrementQuantity(item.sku, item.manualCount || 0)}
                             >+</button>
                         </div>
                      </div>
                   )}
                </div>
              </div>
            </div>
          ))
        )}
        <div className="text-center text-xs text-slate-300 py-2">没有更多了</div>
      </div>

      {/* 3. Bottom Action Bar */}
      <div className="bg-white border-t border-slate-100 p-4 pb-8 flex gap-3 shadow-lg z-20">
        <button 
          onClick={() => {
            setCameraMode('VIEWFINDER');
            setShowCamera(true);
          }}
          className="flex-1 py-3 rounded-full border border-slate-800 text-slate-800 font-bold flex items-center justify-center gap-2 active:bg-slate-50"
        >
          <ScanBarcode size={20} /> 扫码盘点
        </button>
        <button 
          onClick={onFinish}
          className="flex-1 py-3 rounded-full bg-blue-600 text-white font-bold shadow-blue-200 shadow-md active:bg-blue-700"
        >
          提交盘点
        </button>
      </div>

      {/* 4. Camera Overlay / Manual Input Modal */}
      {showCamera && (
        <div className="fixed inset-0 bg-black z-50 flex flex-col">
          {/* Header */}
          <div className="p-4 flex justify-between items-center text-white relative">
            <button onClick={() => setShowCamera(false)}>
               <ChevronLeft size={28} />
            </button>
            <span className="font-medium">
               {cameraMode === 'VIEWFINDER' ? '扫码盘点' : '手动输入条码'}
            </span>
            {/* Pen Icon for Manual Input switching */}
            <button 
               className={`p-2 rounded-full ${cameraMode === 'MANUAL' ? 'bg-white text-black' : 'bg-white/20 text-white'}`}
               onClick={() => setCameraMode(cameraMode === 'VIEWFINDER' ? 'MANUAL' : 'VIEWFINDER')}
            >
                <PenLine size={20} />
            </button>
          </div>

          {cameraMode === 'VIEWFINDER' ? (
            /* Viewfinder Mode */
            <div className="flex-1 relative flex flex-col items-center justify-center animate-in fade-in">
                <div 
                    onClick={handleSimulatedCameraScan}
                    className="w-72 h-40 border-2 border-white/80 rounded-lg relative cursor-pointer active:scale-95 transition-transform"
                >
                    <div className="absolute top-0 left-0 w-4 h-4 border-t-4 border-l-4 border-white -mt-1 -ml-1"></div>
                    <div className="absolute top-0 right-0 w-4 h-4 border-t-4 border-r-4 border-white -mt-1 -mr-1"></div>
                    <div className="absolute bottom-0 left-0 w-4 h-4 border-b-4 border-l-4 border-white -mb-1 -ml-1"></div>
                    <div className="absolute bottom-0 right-0 w-4 h-4 border-b-4 border-r-4 border-white -mb-1 -mr-1"></div>
                    <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-full h-[1px] bg-red-500/50 shadow-[0_0_8px_rgba(239,68,68,0.8)]"></div>
                    </div>
                    <p className="absolute -top-8 w-full text-center text-yellow-400 text-xs">请对准一个条码，或遮挡其他条码</p>
                    <p className="absolute top-2 w-full text-center text-white/50 text-xs">请将SN/IMEI置于框内</p>
                    <p className="absolute bottom-2 w-full text-center text-white/30 text-[10px]">(点击方框模拟扫码)</p>
                </div>
            </div>
          ) : (
            /* Manual Input Mode */
            <div className="flex-1 flex flex-col items-center pt-20 px-8 animate-in slide-in-from-right duration-300">
                <h3 className="text-white text-lg font-bold mb-6">请输入商品条码/SN</h3>
                <form onSubmit={handleManualScan} className="w-full max-w-sm">
                   <div className="bg-white rounded-xl p-2 flex items-center mb-6">
                      <input 
                        autoFocus
                        type="text" 
                        inputMode="numeric"
                        pattern="[0-9]*"
                        autoComplete="off"
                        value={manualInput}
                        onChange={e => setManualInput(e.target.value)}
                        placeholder="点击输入..." 
                        className="flex-1 bg-transparent text-slate-900 text-lg px-2 outline-none"
                      />
                      {manualInput && (
                          <button type="button" onClick={() => setManualInput('')} className="p-2 text-slate-400">
                              <CheckCircle2 className="rotate-45" />
                          </button>
                      )}
                   </div>
                   <button 
                     type="submit" 
                     className="w-full py-4 bg-blue-600 text-white font-bold rounded-xl shadow-lg shadow-blue-900/50 active:scale-95 transition-transform"
                   >
                     确认
                   </button>
                </form>
            </div>
          )}

          {/* Result Popup with Duplicate Check */}
          {scanResult && (
             <div className="fixed bottom-0 left-0 right-0 bg-white rounded-t-2xl p-6 animate-in slide-in-from-bottom duration-300 z-50">
                <div className="flex items-start gap-4 mb-4">
                  <div className={`p-2 rounded-full ${scanResult.isDuplicate ? 'bg-orange-100 text-orange-500' : 'bg-green-100 text-green-600'}`}>
                    {scanResult.isDuplicate ? <AlertCircle size={24} /> : <CheckCircle2 size={24} />}
                  </div>
                  <div>
                    <h3 className={`font-bold ${scanResult.isDuplicate ? 'text-orange-600' : 'text-slate-800'}`}>
                        {scanResult.isDuplicate ? '重复扫描 (Duplicate)' : '扫描成功'}
                    </h3>
                    <p className="text-slate-800 font-medium mt-1 text-sm">{scanResult.isDuplicate ? '该商品已在已盘列表中' : '商品已添加'}</p>
                    <p className="text-slate-400 text-xs">SN: {scanResult.code}</p>
                  </div>
                </div>
                <button 
                  onClick={() => {
                    setScanResult(null);
                    setShowCamera(false);
                    setCameraMode('VIEWFINDER');
                  }}
                  className={`w-full py-3 rounded-full font-bold text-white ${scanResult.isDuplicate ? 'bg-orange-500' : 'bg-blue-600'}`}
                >
                  继续扫码
                </button>
             </div>
          )}
        </div>
      )}

      {/* Zero Quantity Confirmation Modal */}
      {zeroConfirmSku && (
          <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/50 p-6 backdrop-blur-sm animate-in fade-in">
              <div className="bg-white rounded-2xl p-6 w-full max-w-xs shadow-2xl scale-100 animate-in zoom-in-95 duration-200">
                  <div className="flex flex-col items-center text-center">
                      <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center mb-4">
                          <AlertTriangle className="text-orange-500" size={24}/>
                      </div>
                      <h3 className="text-lg font-bold text-slate-800 mb-2">确认数量为 0 ?</h3>
                      <p className="text-sm text-slate-500 mb-6">
                          确认后，该商品实盘数量将记为 0。
                      </p>
                      <div className="flex gap-3 w-full">
                          <button 
                             onClick={() => setZeroConfirmSku(null)}
                             className="flex-1 py-2.5 bg-slate-100 text-slate-600 font-bold rounded-xl"
                          >
                              取消
                          </button>
                          <button 
                             onClick={confirmZeroQuantity}
                             className="flex-1 py-2.5 bg-orange-500 text-white font-bold rounded-xl shadow-lg shadow-orange-200"
                          >
                              确认
                          </button>
                      </div>
                  </div>
              </div>
          </div>
      )}
    </div>
  );
};

export default Scanner;