import React, { useState, useEffect } from 'react';
import { InventoryTask, Discrepancy } from './types';
import { getDailyTask, getHistoryTasks } from './services/inventoryService';
import Scanner from './components/Scanner';
import Reconciliation from './components/Reconciliation';
import SignatureScreen from './components/SignatureModal'; 
import DiscrepancyReport from './components/DiscrepancyReport';
import ViewSignature from './components/ViewSignature';
import InventoryDetail from './components/InventoryDetail';
import { ChevronLeft, Clock, Info, CheckCircle2, PlayCircle, AlertCircle, Package, Timer } from 'lucide-react';

export enum AppView {
  DASHBOARD,
  SCANNER,      
  RECONCILIATION, 
  SIGNATURE,    
  REPORT_DETAIL, 
  SIGNATURE_VIEW,
  INVENTORY_DETAIL 
}

// --- Persistence Helpers ---
const TASK_STORAGE_KEY = 'retail_cycle_current_task_v1';

const saveTaskToStorage = (task: InventoryTask | null) => {
  if (!task) {
    localStorage.removeItem(TASK_STORAGE_KEY);
    return;
  }
  try {
    // Custom replacer to handle Set serialization (JSON doesn't support Set natively)
    const serialized = JSON.stringify(task, (key, value) => {
      if (key === 'scannedImeis' && value instanceof Set) {
        return Array.from(value);
      }
      return value;
    });
    localStorage.setItem(TASK_STORAGE_KEY, serialized);
  } catch (e) {
    console.error("Failed to save task", e);
  }
};

const loadTaskFromStorage = (): InventoryTask | null => {
  const stored = localStorage.getItem(TASK_STORAGE_KEY);
  if (!stored) return null;
  try {
    // Custom reviver to restore Set
    return JSON.parse(stored, (key, value) => {
      if (key === 'scannedImeis' && Array.isArray(value)) {
        return new Set(value);
      }
      return value;
    });
  } catch (e) {
    console.error("Failed to load task from storage", e);
    return null;
  }
};

export const App: React.FC = () => {
  // Initialize from storage immediately to prevent flicker
  const [currentTask, setCurrentTask] = useState<InventoryTask | null>(() => loadTaskFromStorage());
  
  // If we found a stored task that is IN_PROGRESS, strictly speaking we could jump to SCANNER.
  // But keeping it on DASHBOARD with "Resume" button is safer UX to avoid disorientation.
  const [view, setView] = useState<AppView>(AppView.DASHBOARD);
  
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [activeTab, setActiveTab] = useState('DAILY');

  // Effect: Auto-save whenever currentTask changes
  useEffect(() => {
    saveTaskToStorage(currentTask);
  }, [currentTask]);

  // Simulate "Today"
  const today = new Date().toISOString().split('T')[0];
  
  // Get History Tasks
  const historyTasks = getHistoryTasks();

  const prepareDailyTask = () => {
    // If we already have a loaded task (even if pending), use it. 
    // Otherwise create a fresh daily task.
    if (!currentTask) {
        const task = getDailyTask(today);
        setCurrentTask(task);
    }
    setShowConfirmModal(true);
  };

  const startTask = () => {
    setShowConfirmModal(false);
    if (currentTask && currentTask.status === 'COMPLETED') {
        // Do nothing for now
    } else {
        // Change status to IN_PROGRESS if it was PENDING
        if (currentTask && currentTask.status === 'PENDING') {
            setCurrentTask({ ...currentTask, status: 'IN_PROGRESS' });
        }
        setView(AppView.SCANNER);
    }
  };

  const handleScan = (imei: string) => {
    if (!currentTask) return;
    const newSet = new Set(currentTask.scannedImeis);
    newSet.add(imei);

    // Identify item for Last Action Banner
    const item = currentTask.items.find(i => i.imei === imei);
    const itemName = item ? item.name : 'Unknown/Extra Item';
    const timeStr = new Date().toLocaleTimeString('en-US', { hour12: false, hour: "2-digit", minute: "2-digit", second: "2-digit" });

    setCurrentTask({ 
        ...currentTask, 
        scannedImeis: newSet,
        lastAction: {
            name: itemName,
            time: timeStr,
            code: imei
        }
    });
  };

  const handleQuantityUpdate = (sku: string, count: number) => {
    if (!currentTask) return;
    
    // 1. Update the items array with the new manual count
    const updatedItems = currentTask.items.map(item => {
      if (item.sku === sku) {
        return { ...item, manualCount: count };
      }
      return item;
    });

    // 2. Manage the "Scanned" status based on count
    const newSet = new Set(currentTask.scannedImeis);
    const item = currentTask.items.find(i => i.sku === sku);
    
    let lastAction = currentTask.lastAction;

    if (item) {
        if (count > 0) {
            newSet.add(item.imei); // Add to scanned set
            // Update Last Action for Manual Entry too
            const timeStr = new Date().toLocaleTimeString('en-US', { hour12: false, hour: "2-digit", minute: "2-digit", second: "2-digit" });
            lastAction = {
                name: item.name,
                time: timeStr,
                code: item.imei
            };
        } else {
            newSet.delete(item.imei); // Remove from scanned set if count is 0 (Moves back to Unscanned)
        }
    }
    
    setCurrentTask({ 
        ...currentTask, 
        items: updatedItems,
        scannedImeis: newSet,
        lastAction: lastAction
    });
  };

  const handleReconciliationFinish = (discrepancies: Discrepancy[]) => {
    if (!currentTask) return;
    setCurrentTask({ ...currentTask, discrepancies });
    setView(AppView.SIGNATURE);
  };

  const handleSignatureFinish = () => {
      if (!currentTask) return;
      // Mark as completed
      const finalTask = { ...currentTask, status: 'COMPLETED' as const };
      setCurrentTask(finalTask);
      
      // Update storage with completed status
      saveTaskToStorage(finalTask);
      
      setView(AppView.DASHBOARD);
  };

  // Dashboard View
  if (view === AppView.DASHBOARD) {
    // Stats for Completed Task
    const completedDiffAmount = currentTask?.discrepancies.reduce((acc, d) => acc + Math.abs(d.price), 0) || 0;
    const completedShortageAmount = currentTask?.discrepancies.filter(d => d.type === 'SHORTAGE').reduce((a, b) => a + b.price, 0) || 0;
    const completedOverageAmount = currentTask?.discrepancies.filter(d => d.type === 'OVERAGE').reduce((a, b) => a + b.price, 0) || 0;
    
    // Percentages
    const totalValue = currentTask?.items.reduce((acc, i) => acc + i.price, 0) || 1; 
    const shortageRate = (completedShortageAmount / totalValue * 100).toFixed(2);
    const overageRate = (completedOverageAmount / totalValue * 100).toFixed(2);
    const diffRate = (completedDiffAmount / totalValue * 100).toFixed(2);

    // Stats for Pending/In-Progress Task (Forecast)
    const pendingTaskRef = currentTask || getDailyTask(today);
    const pendingCount = pendingTaskRef.items.length;
    // Estimate: 3 items per minute
    const estMinutes = Math.ceil(pendingCount / 3);

    // Dynamic Progress for In-Progress Task
    const getProgressStats = () => {
        if (!currentTask) return { current: 0, total: 0 };
        const total = currentTask.items.length;
        const current = currentTask.items.filter(i => currentTask.scannedImeis.has(i.imei)).length;
        return { current, total };
    };
    const progress = getProgressStats();

    return (
      <div className="min-h-screen bg-slate-50 flex flex-col font-sans text-slate-900 relative">
        <header className="bg-white px-4 py-3 shadow-sm sticky top-0 z-10 flex items-center">
             <ChevronLeft size={24} className="text-slate-600 mr-2" />
             <h1 className="text-lg font-medium text-slate-800">门店盘点</h1>
        </header>
        
        {/* Top Notice Banner - Scrolling Marquee */}
        <div className="bg-blue-50 py-3 flex items-center border-b border-blue-100 shadow-sm overflow-hidden relative">
           {/* Fixed Icon Container with gradient to mask text fade */}
           <div className="shrink-0 pl-4 pr-3 z-10 bg-gradient-to-r from-blue-50 via-blue-50 to-transparent">
             <Info size={18} className="text-blue-600" />
           </div>
           
           {/* Scrolling Content */}
           <div className="flex-1 overflow-hidden relative h-5">
             <div className="absolute animate-marquee whitespace-nowrap text-sm text-blue-800 leading-snug flex items-center h-full">
                日盘任务在每日 00:00:00 创建生效，每日 23:59:59 截止。请务必在截止时间前完成提交，否则任务将视为未完成。
             </div>
           </div>
        </div>
        
        {/* Top Tabs - Scrollable for I18n Safety */}
        <div className="bg-white flex overflow-x-auto no-scrollbar border-b border-slate-100 pt-2 px-2 gap-2">
            {['DAILY', 'GOOD', 'BAD', 'DISPLAY'].map(tab => (
                <button 
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`pb-3 px-4 text-sm font-bold relative shrink-0 whitespace-nowrap ${activeTab === tab ? 'text-blue-600' : 'text-slate-500'}`}
                >
                  {tab === 'DAILY' ? '日盘' : (tab === 'GOOD' ? '良品盘点' : (tab === 'BAD' ? '坏品盘点' : '样机盘点'))}
                  {activeTab === tab && <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-4 h-1 bg-blue-600 rounded-t-full"></div>}
                </button>
            ))}
        </div>

        <main className="flex-1 p-4 space-y-4">
          
          {/* Active / Completed Task Card */}
          {currentTask && currentTask.status === 'COMPLETED' ? (
             /* COMPLETED STATE CARD */
             <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-100">
                <div className="flex justify-between items-start mb-2">
                    <h2 className="text-sm font-bold text-slate-900">MIDE00003 MIDE00003-1215-02</h2>
                    <div className="flex items-center gap-1 text-[10px] text-emerald-500 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-100 shrink-0">
                      <CheckCircle2 size={10} />
                      <span>已完成</span>
                    </div>
                </div>
                <div className="text-xs text-slate-400 space-y-1 mb-3 font-mono">
                    <p>盘点单号 {currentTask.id}</p>
                    <p>盘点时间 {currentTask.date} 09:18:30</p>
                </div>

                <div className="bg-slate-50 rounded-lg p-3 grid grid-cols-3 gap-2 mb-4">
                    <div>
                        <div className="text-[10px] text-slate-400">盘亏金额</div>
                        <div className="text-sm font-bold text-slate-800">{completedShortageAmount.toLocaleString()}</div>
                        <div className="text-[10px] text-slate-300">占比 {shortageRate}%</div>
                    </div>
                    <div>
                        <div className="text-[10px] text-slate-400">盘盈金额</div>
                        <div className="text-sm font-bold text-slate-800">{completedOverageAmount.toLocaleString()}</div>
                         <div className="text-[10px] text-slate-300">占比 {overageRate}%</div>
                    </div>
                    <div>
                        <div className="text-[10px] text-slate-400">差异金额</div>
                        <div className="text-sm font-bold text-slate-800">{completedDiffAmount.toLocaleString()}</div>
                        <div className="text-[10px] text-slate-300">差异率 {diffRate}%</div>
                    </div>
                </div>

                <div className="space-y-3">
                   <button 
                       onClick={() => setView(AppView.SIGNATURE_VIEW)}
                       className="w-full py-2.5 border border-slate-300 text-slate-600 font-bold rounded-full"
                   >
                       查看签字
                   </button>
                   <button 
                       onClick={() => setView(AppView.INVENTORY_DETAIL)}
                       className="w-full py-2.5 border border-slate-300 text-slate-600 font-bold rounded-full"
                   >
                       查看盘点单
                   </button>
                </div>
             </div>
          ) : (
             /* PENDING / IN_PROGRESS STATE CARD */
             <div className="bg-white rounded-xl p-5 shadow-sm border border-slate-100 relative overflow-hidden">
                
                {/* Reference Style Header */}
                <div className="mb-6 relative z-10">
                   <h2 className="text-lg font-bold text-slate-800 mb-3 pr-20">MIDE00003 MIDE00003-1215-02</h2>
                   <div className="space-y-1">
                      <div className="flex text-xs font-mono">
                         <span className="text-slate-400 w-20 shrink-0">盘点单号</span>
                         <span className="text-slate-500 font-medium truncate">PDD{today.replace(/-/g,'')}0003</span>
                      </div>
                      <div className="flex text-xs font-mono">
                         <span className="text-slate-400 w-20 shrink-0">盘点时间</span>
                         <span className="text-slate-500 font-medium">{today} 10:00:00</span>
                      </div>
                      <div className="flex text-xs font-mono">
                         <span className="text-slate-400 w-20 shrink-0">盘点截止</span>
                         <span className="text-slate-500 font-medium">{today} 23:59:59</span>
                      </div>
                   </div>
                   
                   {/* Status Badge Positioned Top Right */}
                   <div className={`absolute top-0 right-0 flex items-center gap-1 text-[10px] px-3 py-1 rounded-full border ${
                        currentTask && currentTask.status === 'IN_PROGRESS' 
                        ? 'text-orange-500 bg-orange-50 border-orange-100' 
                        : 'text-blue-500 bg-blue-50 border-blue-100'
                    }`}>
                        {currentTask && currentTask.status === 'IN_PROGRESS' ? <PlayCircle size={10} /> : <Clock size={10} />}
                        <span className="font-bold whitespace-nowrap">{currentTask && currentTask.status === 'IN_PROGRESS' ? '盘点中' : '待盘点'}</span>
                    </div>
                </div>
                
                {/* 2 CORE METRICS GRID */}
                <div className="grid grid-cols-2 divide-x divide-slate-100 mb-6 bg-slate-50/50 rounded-xl py-4">
                    <div className="flex flex-col items-center px-2">
                        <div className="text-xl font-bold text-slate-800">{pendingCount}<span className="text-xs font-normal text-slate-400 ml-0.5">件</span></div>
                        <div className="text-[10px] text-slate-400 mt-1 text-center">待盘商品</div>
                    </div>
                    <div className="flex flex-col items-center px-2">
                        <div className="text-xl font-bold text-slate-800">{estMinutes}<span className="text-xs font-normal text-slate-400 ml-0.5">分钟</span></div>
                        <div className="text-[10px] text-slate-400 mt-1 text-center">预估耗时</div>
                    </div>
                </div>

                {/* Progress Stats Display for In-Progress Tasks */}
                {currentTask && currentTask.status === 'IN_PROGRESS' && (
                    <div className="mb-4 bg-slate-50 p-3 rounded-xl">
                        <div className="flex justify-between items-center mb-2">
                            <span className="text-xs text-slate-500 font-bold">已盘进度</span>
                            <span className="text-xs text-blue-600 font-bold">{Math.round((progress.current / progress.total) * 100)}%</span>
                        </div>
                        <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden">
                             <div className="h-full bg-blue-500 transition-all duration-500" style={{width: `${(progress.current / progress.total) * 100}%`}}></div>
                        </div>
                        <div className="text-right text-[10px] text-slate-400 mt-1">
                            已盘 {progress.current} / 总计 {progress.total}
                        </div>
                    </div>
                )}

                <button 
                    onClick={prepareDailyTask}
                    className="w-full py-3.5 bg-blue-600 text-white rounded-full text-sm font-bold shadow-lg shadow-blue-200 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
                >
                    {currentTask && currentTask.status === 'IN_PROGRESS' ? (
                        <>继续盘点 <PlayCircle size={16} /></>
                    ) : (
                        <>开始盘点 <PlayCircle size={16} /></>
                    )}
                </button>
             </div>
          )}

          {/* History Items - Dynamic Rendering from Service */}
          {historyTasks.map((task) => (
              task.status === 'COMPLETED' ? (
                <div key={task.id} className="bg-white rounded-xl p-4 shadow-sm border border-slate-100 opacity-60">
                    <div className="flex justify-between items-start mb-2">
                        <h2 className="text-sm font-bold text-slate-900">MIDE00003 {task.id.slice(-8)}</h2>
                        <span className="text-xs text-slate-400 shrink-0">已完成</span>
                    </div>
                    <div className="text-xs text-slate-400 space-y-1 mb-3 font-mono">
                        <p>盘点单号 {task.id}</p>
                        <p>盘点时间 {task.date} {task.endTime}</p>
                    </div>
                    
                    {/* Simplified stats for history card */}
                    <div className="bg-slate-50 rounded-lg p-3 grid grid-cols-3 gap-2 mb-3">
                        <div>
                            <div className="text-[10px] text-slate-400">盘亏金额</div>
                            <div className="text-sm font-bold text-slate-800">4,000</div>
                            <div className="text-[10px] text-slate-300">占比 2.00%</div>
                        </div>
                        <div>
                            <div className="text-[10px] text-slate-400">盘盈金额</div>
                            <div className="text-sm font-bold text-slate-800">0</div>
                            <div className="text-[10px] text-slate-300">占比 0.00%</div>
                        </div>
                        <div>
                            <div className="text-[10px] text-slate-400">差异金额</div>
                            <div className="text-sm font-bold text-slate-800">4,000</div>
                            <div className="text-[10px] text-slate-300">差异率 2.00%</div>
                        </div>
                    </div>

                    <div className="flex justify-between gap-2">
                        <button className="flex-1 py-1.5 border border-slate-300 rounded-full text-xs text-slate-600">查看签字</button>
                        <button className="flex-1 py-1.5 border border-slate-300 rounded-full text-xs text-slate-600">查看盘点单</button>
                    </div>
                </div>
              ) : (
                <div key={task.id} className="bg-white rounded-xl p-4 shadow-sm border border-slate-100 opacity-80">
                    <div className="flex justify-between items-start mb-2">
                        <h2 className="text-sm font-bold text-slate-900">MIDE00003 {task.id.slice(-8)}</h2>
                        <div className="flex items-center gap-1 text-[10px] text-red-500 bg-red-50 px-2 py-0.5 rounded border border-red-100 shrink-0">
                            <AlertCircle size={10} />
                            <span>未完成</span>
                        </div>
                    </div>
                    <div className="text-xs text-slate-400 space-y-1 mb-3 font-mono">
                        <p>盘点单号 {task.id}</p>
                        <p>盘点时间 {task.date} {task.endTime}</p>
                    </div>
                    <div className="bg-slate-50 rounded-lg p-3 text-center text-xs text-slate-400 mb-3">
                        该任务已过期失效
                    </div>
                </div>
              )
          ))}

        </main>

        {/* Confirmation Modal */}
        {showConfirmModal && (
          <div className="absolute inset-0 z-50 flex items-end justify-center sm:items-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div className="bg-white w-full max-w-sm rounded-2xl p-6 shadow-2xl animate-in slide-in-from-bottom-10 duration-300">
               <h3 className="text-lg font-bold text-slate-900 text-center mb-2">确认开始盘点吗?</h3>
               <p className="text-slate-500 text-sm text-center mb-6">
                 日盘任务支持多人同时作业。<br/>
                 <span className="text-blue-600 font-bold">日盘期间不锁定库存</span>，不影响正常销售。
               </p>
               <div className="flex gap-3">
                 <button 
                   onClick={() => setShowConfirmModal(false)}
                   className="flex-1 py-3 bg-slate-100 text-slate-700 font-bold rounded-xl active:bg-slate-200"
                 >
                   取消
                 </button>
                 <button 
                   onClick={startTask}
                   className="flex-1 py-3 bg-blue-600 text-white font-bold rounded-xl shadow-lg shadow-blue-200 active:bg-blue-700"
                 >
                   确认
                 </button>
               </div>
            </div>
          </div>
        )}

        {/* --- Render Other Views conditionally --- */}
        {view === AppView.SCANNER && currentTask && (
            <div className="fixed inset-0 z-50 bg-slate-50">
               <Scanner 
                  task={currentTask}
                  onScan={handleScan}
                  onQuantityUpdate={handleQuantityUpdate}
                  onBack={() => setView(AppView.DASHBOARD)}
                  onFinish={() => setView(AppView.RECONCILIATION)}
               />
            </div>
        )}

        {view === AppView.RECONCILIATION && currentTask && (
            <div className="fixed inset-0 z-50 bg-slate-50">
                <Reconciliation 
                   task={currentTask}
                   onConfirm={handleReconciliationFinish}
                   onBack={() => setView(AppView.SCANNER)}
                />
            </div>
        )}

        {view === AppView.SIGNATURE && currentTask && (
            <div className="fixed inset-0 z-50 bg-slate-50">
                <SignatureScreen 
                   task={currentTask}
                   onClose={() => setView(AppView.RECONCILIATION)}
                   onFinish={handleSignatureFinish}
                />
            </div>
        )}

        {view === AppView.SIGNATURE_VIEW && currentTask && (
             <div className="fixed inset-0 z-50 bg-slate-50">
                 <ViewSignature 
                    task={currentTask}
                    onBack={() => setView(AppView.DASHBOARD)}
                 />
             </div>
        )}

        {view === AppView.INVENTORY_DETAIL && currentTask && (
            <div className="fixed inset-0 z-50 bg-slate-50">
                <InventoryDetail 
                   task={currentTask}
                   onBack={() => setView(AppView.DASHBOARD)}
                />
            </div>
        )}

      </div>
    );
  }

  // Return null for other views (they are rendered as overlays in Dashboard)
  return null;
};