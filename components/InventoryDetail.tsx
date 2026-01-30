import React, { useState } from 'react';
import { InventoryTask } from '../types';
import { ChevronLeft, Download, CheckCircle2, HelpCircle, X } from 'lucide-react';

interface InventoryDetailProps {
  task: InventoryTask;
  onBack: () => void;
}

const InventoryDetail: React.FC<InventoryDetailProps> = ({ task, onBack }) => {
  const operator = "唐亚茹"; 
  const [showToast, setShowToast] = useState(false);
  const [showHelpModal, setShowHelpModal] = useState(false);

  const handleDownload = () => {
      setShowToast(true);
      setTimeout(() => setShowToast(false), 2000);
  };

  // Aggregation Logic (Similar to Signature Modal but with Diff Amount/Value)
  const aggregatedData = (() => {
      const map = new Map<string, {
          sku: string;
          name: string;
          actualQty: number;
          expectedQty: number; // For diff calculation
          price: number;
      }>();

      // 1. Initialize with Expected Items
      task.items.forEach(item => {
          if (!map.has(item.sku)) {
              map.set(item.sku, { 
                  sku: item.sku, 
                  name: item.name, 
                  actualQty: 0, 
                  expectedQty: 0, 
                  price: item.price 
              });
          }
          map.get(item.sku)!.expectedQty += 1; // Assuming each item in task.items is 1 unit
      });

      // 2. Count Actuals (Scanned + Manual)
      // Check scanned Set
      task.items.forEach(item => {
          if (item.countMethod === 'SCAN' && task.scannedImeis.has(item.imei)) {
              map.get(item.sku)!.actualQty += 1;
          } else if (item.countMethod === 'QUANTITY') {
              // Manual count defaults to 0 if undefined, but if scannedImeis has it, it might be 1 (for mixed logic), 
              // but here we rely on manualCount
              map.get(item.sku)!.actualQty += (item.manualCount || 0);
          }
      });

      // 3. Handle Overages (Items in discrepancies as OVERAGE that might not be in initial list or extra counts)
      task.discrepancies.forEach(d => {
          if (d.type === 'OVERAGE') {
              if (!map.has(d.sku)) {
                  map.set(d.sku, {
                      sku: d.sku,
                      name: d.name,
                      actualQty: 0,
                      expectedQty: 0,
                      price: d.price
                  });
              }
              // Add 1 for each overage discrepancy found
              map.get(d.sku)!.actualQty += 1; 
          }
      });

      // Convert to Array and Calculate Diffs
      const rows = Array.from(map.values()).map(r => {
          const diffQty = r.actualQty - r.expectedQty;
          return {
              ...r,
              diffQty,
              actualAmt: r.actualQty * r.price,
              diffAmt: diffQty * r.price
          };
      });

      // Sort: Highlighting logic - Diffs first, then others
      return rows.sort((a, b) => {
          const aHasDiff = a.diffQty !== 0;
          const bHasDiff = b.diffQty !== 0;
          if (aHasDiff && !bHasDiff) return -1;
          if (!aHasDiff && bHasDiff) return 1;
          return 0; 
      });
  })();

  const totalDiffAmount = aggregatedData.reduce((acc, r) => acc + Math.abs(r.diffAmt), 0);
  // Simple Diff Rate: Total Diff Qty / Total Expected Qty (Just an approximation for demo)
  const totalExpected = aggregatedData.reduce((acc, r) => acc + r.expectedQty, 0);
  const totalDiffQty = aggregatedData.reduce((acc, r) => acc + Math.abs(r.diffQty), 0);
  const diffRate = totalExpected > 0 ? ((totalDiffQty / totalExpected) * 100).toFixed(2) : '0.00';

  return (
    <div className="flex flex-col h-full bg-slate-50 font-sans relative">
      {/* Toast Notification */}
      {showToast && (
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 animate-in fade-in zoom-in duration-200">
            <div className="bg-black/80 backdrop-blur-sm text-white px-6 py-4 rounded-2xl shadow-xl flex flex-col items-center gap-2 min-w-[140px]">
                <CheckCircle2 size={32} className="text-emerald-400" />
                <span className="font-bold text-sm">下载成功</span>
            </div>
        </div>
      )}

      {/* Help Modal */}
      {showHelpModal && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/50 p-6 backdrop-blur-sm animate-in fade-in">
           <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-2xl animate-in zoom-in-95 duration-200 relative">
               <button 
                 onClick={() => setShowHelpModal(false)}
                 className="absolute top-4 right-4 p-2 text-slate-400 active:text-slate-800"
               >
                   <X size={20} />
               </button>
               
               <h3 className="text-lg font-bold text-slate-800 mb-6">名词解释</h3>
               
               <div className="space-y-6">
                  <div>
                      <div className="flex items-center gap-2 mb-2">
                          <div className="w-1 h-4 bg-blue-600 rounded-full"></div>
                          <h4 className="font-bold text-slate-700">差异金额 (Variance Amount)</h4>
                      </div>
                      <p className="text-sm text-slate-500 mb-2 leading-relaxed">
                          反映门店库存管理的准确度，绝对值累加，不抵消盈亏。
                      </p>
                      <div className="bg-slate-50 p-2 rounded border border-slate-100 text-xs font-mono text-slate-600">
                          公式: ∑ |实盘数 - 账面数| × 单价
                      </div>
                  </div>

                  <div>
                      <div className="flex items-center gap-2 mb-2">
                          <div className="w-1 h-4 bg-blue-600 rounded-full"></div>
                          <h4 className="font-bold text-slate-700">差异率 (Variance Rate)</h4>
                      </div>
                      <p className="text-sm text-slate-500 mb-2 leading-relaxed">
                          反映盘点作业的误差比例。
                      </p>
                      <div className="bg-slate-50 p-2 rounded border border-slate-100 text-xs font-mono text-slate-600">
                          公式: (差异商品总数 / 账面商品总数) × 100%
                      </div>
                      <p className="text-[10px] text-slate-400 mt-1 italic">
                          * 此处采用商品<span className="font-bold">数量</span>计算
                      </p>
                  </div>
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

      {/* Header */}
      <div className="bg-white px-4 py-3 shadow-sm sticky top-0 z-10 flex items-center">
        <button onClick={onBack} className="p-1 -ml-2 text-slate-600">
          <ChevronLeft size={24} />
        </button>
        <div className="flex-1 text-center font-bold text-slate-800 text-lg">
          {task.id}
        </div>
        <div className="w-8"></div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
         {/* Top Info Card */}
         <div className="bg-white rounded-xl p-5 shadow-sm">
             <h2 className="text-lg font-bold text-slate-900 mb-4">德国门牌号</h2>
             <div className="space-y-2 text-xs text-slate-500">
                 <div className="flex"><span className="w-20 text-slate-400">盘点日期:</span> {task.date} 09:18:30</div>
                 <div className="flex"><span className="w-20 text-slate-400">盘点单号:</span> {task.id}</div>
                 <div className="flex"><span className="w-20 text-slate-400">库存类型:</span> 良品手机+PAD</div>
                 <div className="flex"><span className="w-20 text-slate-400">SKU数量:</span> {aggregatedData.length}</div>
                 <div className="flex"><span className="w-20 text-slate-400">库存金额:</span> {(aggregatedData.reduce((a,b)=>a+b.actualAmt,0)).toLocaleString()}</div>
                 
                 {/* Stats with Help Icons */}
                 <div className="flex items-center">
                     <span className="w-20 text-slate-400 flex items-center gap-1">
                         差异金额
                         <button onClick={() => setShowHelpModal(true)} className="text-slate-300 active:text-slate-500">
                            <HelpCircle size={12} />
                         </button>:
                     </span> 
                     <span className="text-red-500 font-bold">{totalDiffAmount.toLocaleString()}</span>
                 </div>
                 <div className="flex items-center">
                     <span className="w-20 text-slate-400 flex items-center gap-1">
                         差异率
                         <button onClick={() => setShowHelpModal(true)} className="text-slate-300 active:text-slate-500">
                            <HelpCircle size={12} />
                         </button>:
                     </span> 
                     {diffRate}%
                 </div>
             </div>
         </div>

         {/* SKU List */}
         <div className="bg-white rounded-xl shadow-sm overflow-hidden min-h-[300px]">
             {/* Table Header - Optimized for I18n */}
             <div className="flex bg-slate-50 p-3 text-xs text-slate-400 border-b border-slate-100">
                 <div className="w-10 min-w-[2.5rem] text-center">序号</div>
                 <div className="flex-[2] min-w-[8rem]">商品名称</div>
                 <div className="w-14 min-w-[3.5rem] text-center">实盘</div>
                 <div className="w-14 min-w-[3.5rem] text-center">差异</div>
                 <div className="w-14 min-w-[3.5rem] text-center">盘点人</div>
             </div>

             {/* Rows */}
             {aggregatedData.map((row, idx) => {
                 const hasDiff = row.diffQty !== 0;
                 return (
                    <div key={idx} className={`p-4 border-b border-slate-50 last:border-0 ${hasDiff ? 'bg-orange-50/50' : 'bg-white'}`}>
                        {/* Row Top: Basic Info */}
                        <div className="flex items-start text-xs mb-2">
                           <div className="w-10 min-w-[2.5rem] text-center text-slate-300 font-mono pt-0.5">{String(idx+1).padStart(2, '0')}</div>
                           <div className="flex-[2] min-w-[8rem] pr-2 min-w-0">
                               <div className="text-slate-400 mb-0.5">({row.sku})</div>
                               <div className="text-slate-800 font-medium line-clamp-2">{row.name}</div>
                           </div>
                           <div className="w-14 min-w-[3.5rem] text-center font-bold text-sm text-slate-800">
                               {row.actualQty}
                           </div>
                           <div className={`w-14 min-w-[3.5rem] text-center font-bold text-sm ${hasDiff ? (row.diffQty > 0 ? 'text-orange-600' : 'text-red-600') : 'text-slate-300'}`}>
                               {hasDiff ? (row.diffQty > 0 ? `+${row.diffQty}` : row.diffQty) : '-'}
                           </div>
                           <div className="w-14 min-w-[3.5rem] text-center text-slate-500">
                               {operator}
                           </div>
                        </div>

                        {/* Row Bottom: Financials (Only show if useful or typically in detailed view) */}
                        <div className="pl-10 flex gap-4 text-[10px] text-slate-400">
                             <div>实盘金额: {row.actualAmt.toLocaleString()}</div>
                             {hasDiff && (
                                 <div className="text-red-400">差异金额: {row.diffAmt.toLocaleString()}</div>
                             )}
                        </div>
                    </div>
                 );
             })}
             <div className="p-4 text-center text-xs text-slate-300">没有更多了</div>
         </div>
      </div>

      <div className="bg-white border-t border-slate-100 p-4 pb-8 flex gap-3 shadow-lg z-20">
          <button 
             onClick={onBack}
             className="flex-1 py-3 bg-white border border-slate-300 text-slate-600 font-bold rounded-full"
          >
              返回
          </button>
          <button 
             onClick={handleDownload}
             className="flex-1 py-3 bg-blue-600 text-white font-bold rounded-full shadow-lg shadow-blue-200"
          >
              下载
          </button>
      </div>
    </div>
  );
};

export default InventoryDetail;