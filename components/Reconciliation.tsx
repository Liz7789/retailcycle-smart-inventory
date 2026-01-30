import React, { useState } from 'react';
import { InventoryTask, Discrepancy, DiscrepancyReason } from '../types';
import { checkDynamicStatus, getProductByImei } from '../services/inventoryService';
import { RefreshCcw, Check, ChevronLeft, ChevronDown, ChevronRight, PlayCircle, Lightbulb } from 'lucide-react';

interface ReconciliationProps {
  task: InventoryTask;
  onConfirm: (discrepancies: Discrepancy[]) => void;
  onBack: () => void;
}

const Reconciliation: React.FC<ReconciliationProps> = ({ task, onConfirm, onBack }) => {
  const [discrepancies, setDiscrepancies] = useState<Discrepancy[]>(() => {
    // If we already have discrepancies from a previous visit, use them.
    // Otherwise calculate fresh.
    if (task.discrepancies.length > 0) return task.discrepancies;

    const diffs: Discrepancy[] = [];
    
    // Check Shortages
    task.items.forEach(item => {
      if (!task.scannedImeis.has(item.imei)) {
        diffs.push({
          imei: item.imei,
          sku: item.sku,
          name: item.name,
          type: 'SHORTAGE',
          price: item.price,
          autoResolved: false
        });
      }
    });

    // Check Overages
    task.scannedImeis.forEach(imei => {
      if (!task.items.find(i => i.imei === imei)) {
        // Try to find details in global product DB
        const globalProduct = getProductByImei(imei);
        
        diffs.push({
          imei,
          sku: globalProduct ? globalProduct.sku : 'UNKNOWN',
          name: globalProduct ? globalProduct.name : 'Unlisted Item',
          type: 'OVERAGE',
          price: globalProduct ? globalProduct.price : 0, 
          autoResolved: false
        });
      }
    });
    return diffs;
  });

  const [simulating, setSimulating] = useState(false);

  const handleDynamicCheck = () => {
    setSimulating(true);
    setTimeout(() => {
      const updated = discrepancies.map(d => {
        // Only check unresolved items
        if (!d.autoResolved && !d.reason) {
           // Simulate system check logic
           const detectedReason = checkDynamicStatus(d.imei);
           if (detectedReason) {
             return { ...d, autoResolved: true, reason: detectedReason };
           }
        }
        return d;
      });
      setDiscrepancies(updated);
      setSimulating(false);
    }, 1200);
  };

  const handleReasonChange = (imei: string, reason: string) => {
    setDiscrepancies(prev => prev.map(d => 
      d.imei === imei ? { ...d, reason: reason as DiscrepancyReason } : d
    ));
  };

  const handleSubmit = () => {
      const firstUnresolved = discrepancies.find(d => !d.autoResolved && !d.reason);
      if (firstUnresolved) {
          // Auto scroll to element
          const el = document.getElementById(`discrepancy-${firstUnresolved.imei}`);
          el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      } else {
          onConfirm(discrepancies);
      }
  };

  const pendingIssues = discrepancies.filter(d => !d.autoResolved && !d.reason).length;

  return (
    <div className="flex flex-col h-full bg-slate-50">
      {/* Header */}
      <div className="bg-white pb-2 shadow-sm sticky top-0 z-20">
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
        <div className="flex justify-between items-start px-4 mb-2">
          {[
            { id: 1, label: '扫码', active: true },
            { id: 2, label: '确认', active: true },
            { id: 3, label: '签字', active: false },
            { id: 4, label: '提交', active: false }
          ].map((step, idx, arr) => (
            <div key={step.id} className="flex-1 flex flex-col items-center relative z-10">
              {idx !== arr.length - 1 && (
                <div className={`absolute top-3 left-1/2 w-full h-[1px] -z-10 ${step.id < 2 ? 'bg-blue-500' : (step.id === 2 ? 'bg-blue-500' : 'bg-slate-200')}`}></div>
              )}
              <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold mb-1 shrink-0 ${
                step.active ? 'bg-blue-500 text-white shadow-blue-200 shadow-md' : 'bg-slate-100 text-slate-400'
              }`}>
                {step.id}
              </div>
              <span className={`text-[10px] text-center w-full break-words leading-tight px-0.5 ${step.active ? 'text-blue-600 font-medium' : 'text-slate-400'}`}>
                {step.label}
              </span>
            </div>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        
        {/* Dynamic Match Banner with Tip */}
        <div className="bg-white p-3 rounded-xl border border-blue-100 shadow-sm">
          <div className="flex items-center justify-between mb-3">
             <div className="flex items-center gap-3">
               <div className={`p-2 rounded-full ${simulating ? 'bg-blue-50 text-blue-500' : 'bg-blue-100 text-blue-600'}`}>
                 <RefreshCcw size={20} className={simulating ? "animate-spin" : ""} />
               </div>
               <div>
                 <h3 className="font-bold text-slate-800 text-sm">自动复盘</h3>
                 <p className="text-xs text-slate-500">检测销售、调拨、返仓记录</p>
               </div>
             </div>
             <button 
                 onClick={handleDynamicCheck}
                 disabled={simulating}
                 className="text-xs bg-blue-600 text-white px-4 py-2 rounded-lg font-bold hover:bg-blue-700 disabled:opacity-50"
             >
                 {simulating ? '检测中...' : '立即检测'}
             </button>
          </div>
          
          {/* Helpful Tip */}
          <div className="bg-amber-50 rounded-lg p-2.5 flex items-start gap-2 border border-amber-100">
             <Lightbulb size={14} className="text-amber-500 mt-0.5 shrink-0" />
             <p className="text-xs text-amber-800 leading-snug">
                <span className="font-bold">提效建议：</span>请优先点击「立即检测」。系统将自动核对销售与调拨记录，可减少 80% 的人工填写工作量。
             </p>
          </div>
        </div>

        {/* List of Discrepancies */}
        {discrepancies.length === 0 ? (
          <div className="text-center py-10">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-green-100 rounded-full mb-4">
              <Check className="w-8 h-8 text-green-600" />
            </div>
            <h3 className="text-lg font-medium text-slate-900">盘点一致</h3>
            <p className="text-slate-500">无差异商品</p>
          </div>
        ) : (
          discrepancies.map((item) => (
            <div id={`discrepancy-${item.imei}`} key={item.imei} className={`bg-white p-4 rounded-xl border shadow-sm ${(!item.autoResolved && !item.reason) ? 'border-orange-200 ring-1 ring-orange-100' : 'border-slate-100'}`}>
              <div className="flex justify-between items-start mb-2">
                <div className="flex-1">
                   <div className="flex gap-2 mb-1">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase ${
                        item.autoResolved 
                            ? 'bg-slate-100 text-slate-400 border border-slate-200' 
                            : (item.type === 'SHORTAGE' ? 'bg-red-100 text-red-700' : 'bg-orange-100 text-orange-700')
                      }`}>
                        {item.type === 'SHORTAGE' ? '盘亏' : '盘盈'}
                      </span>
                   </div>
                   <div className="text-xs text-slate-500 mb-0.5">({item.sku}) {item.name}</div>
                </div>
                <div className="text-right">
                   <div className="text-sm font-bold text-slate-800">{item.type === 'SHORTAGE' ? '-1' : '+1'}</div>
                   <div className="text-xs text-slate-400">¥{item.price}</div>
                </div>
              </div>

              {item.autoResolved ? (
                <div className="flex flex-col gap-1 text-xs text-green-700 bg-green-50 px-3 py-2 rounded-lg mt-2 border border-green-100">
                  <div className="flex items-center gap-2 font-bold">
                      <PlayCircle size={14} className="fill-green-200"/>
                      <span>系统核对成功</span>
                  </div>
                  <div className="pl-6 text-green-600">
                      原因: {item.reason}
                  </div>
                  <div className="pl-6 text-[10px] text-green-500">
                      该商品不计入盘点损益
                  </div>
                </div>
              ) : (
                <div className="mt-2">
                  <div className="relative">
                    <select 
                      className={`w-full text-xs p-2.5 bg-slate-50 border rounded-lg appearance-none pr-8 outline-none font-medium ${!item.reason ? 'border-orange-300 text-orange-700' : 'border-slate-200 text-slate-700'}`}
                      value={item.reason || ''}
                      onChange={(e) => handleReasonChange(item.imei, e.target.value)}
                    >
                      <option value="">请选择差异原因...</option>
                      {Object.values(DiscrepancyReason).map(reason => (
                        <option key={reason} value={reason}>{reason}</option>
                      ))}
                    </select>
                    <ChevronDown className="absolute right-3 top-2.5 text-slate-400 pointer-events-none" size={14} />
                  </div>
                  {item.reason === DiscrepancyReason.OTHER && (
                      <input 
                         type="text" 
                         placeholder="请输入备注 (必填)" 
                         className="w-full mt-2 text-xs p-2 bg-slate-50 border border-slate-200 rounded-lg outline-none"
                      />
                  )}
                </div>
              )}
            </div>
          ))
        )}
      </div>

      <div className="bg-white border-t border-slate-100 p-4 pb-8 flex gap-3 shadow-lg z-20">
        <button 
          onClick={handleSubmit}
          className={`w-full py-3 rounded-full font-bold text-white shadow-md flex items-center justify-center gap-2 bg-blue-600 active:bg-blue-700 shadow-blue-200`}
        >
           {pendingIssues > 0 ? `还有 ${pendingIssues} 项原因未确认` : '下一步：签字'} <ChevronRight size={18} />
        </button>
      </div>
    </div>
  );
};

export default Reconciliation;