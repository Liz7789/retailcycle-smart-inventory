import React from 'react';
import { InventoryTask } from '../types';
import { ChevronLeft, Download } from 'lucide-react';
import * as XLSX from 'xlsx';

interface DiscrepancyReportProps {
  task: InventoryTask;
  onBack: () => void;
}

const DiscrepancyReport: React.FC<DiscrepancyReportProps> = ({ task, onBack }) => {
  const operator = "唐亚茹"; // Hardcoded for demo

  const handleDownload = () => {
     const ws = XLSX.utils.json_to_sheet(task.discrepancies.map(d => ({
         SKU: d.sku,
         Name: d.name,
         Type: d.type,
         Qty: d.type === 'SHORTAGE' ? -1 : 1,
         Amount: d.price,
         Reason: d.reason || 'N/A'
     })));
     const wb = XLSX.utils.book_new();
     XLSX.utils.book_append_sheet(wb, ws, "Discrepancies");
     XLSX.writeFile(wb, `Discrepancy_Report_${task.id}.xlsx`);
  };

  return (
    <div className="flex flex-col h-full bg-slate-50">
      {/* Header */}
      <div className="bg-white px-4 py-3 shadow-sm sticky top-0 z-10 flex items-center">
        <button onClick={onBack} className="p-1 -ml-2 text-slate-600">
          <ChevronLeft size={24} />
        </button>
        <div className="flex-1 text-center font-bold text-slate-800 text-lg">
          日盘差异单
        </div>
        <div className="w-8"></div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
         {/* Info Card */}
         <div className="bg-white rounded-xl p-4 shadow-sm">
             <h2 className="text-lg font-bold text-slate-900 mb-4">德国门牌号</h2>
             <div className="space-y-2 text-xs text-slate-500">
                 <div className="flex"><span className="w-20 text-slate-400">盘点日期:</span> {task.date} 09:18:30</div>
                 <div className="flex"><span className="w-20 text-slate-400">库存类型:</span> 商品坏品</div> 
                 <div className="flex"><span className="w-20 text-slate-400">SKU数量:</span> {task.discrepancies.length}</div>
                 <div className="flex"><span className="w-20 text-slate-400">库存金额:</span> {(task.discrepancies.reduce((acc,d) => acc + d.price, 0)).toLocaleString()}</div>
                 <div className="flex"><span className="w-20 text-slate-400">盘点单号:</span> {task.id}</div>
             </div>
         </div>

         {/* Discrepancy List Header */}
         <div className="flex bg-slate-50 px-4 py-2 text-xs text-slate-400 font-medium">
             <div className="w-10">序号</div>
             <div className="flex-1">商品名称</div>
             <div className="w-16 text-right">实盘数量</div>
             <div className="w-16 text-right">盘点人</div>
         </div>

         {/* Discrepancy List */}
         <div className="bg-white rounded-xl shadow-sm overflow-hidden min-h-[200px]">
             {task.discrepancies.length === 0 ? (
                 <div className="p-8 text-center text-slate-400 text-sm">无差异数据</div>
             ) : (
                 task.discrepancies.map((item, idx) => (
                    <div key={idx} className="border-b border-slate-50 last:border-0 p-4">
                        <div className="flex items-start text-xs mb-2">
                           <div className="w-10 text-slate-300 font-mono pt-0.5">{String(idx+1).padStart(2, '0')}</div>
                           <div className="flex-1 pr-2">
                              <div className="text-slate-500 mb-0.5">({item.sku})</div>
                              <div className="text-slate-800 font-medium mb-1 line-clamp-2">{item.name}</div>
                              <div className="text-orange-500 bg-orange-50 inline-block px-1.5 py-0.5 rounded text-[10px]">
                                {item.reason || "未填写原因"}
                              </div>
                           </div>
                           <div className="w-16 text-right font-bold text-slate-800 text-sm">
                              {item.type === 'SHORTAGE' ? -1 : '+1'}
                           </div>
                           <div className="w-16 text-right text-slate-500">
                              {operator}
                           </div>
                        </div>
                    </div>
                 ))
             )}
             <div className="p-4 text-center text-xs text-slate-300">没有更多了</div>
         </div>
      </div>

      {/* Footer Actions */}
      <div className="bg-white border-t border-slate-100 p-4 pb-8 flex gap-3 shadow-lg z-20">
         <button 
           onClick={onBack}
           className="flex-1 py-3 bg-white border border-slate-300 text-slate-600 rounded-full font-bold"
         >
           返回
         </button>
         <button 
           onClick={handleDownload}
           className="flex-1 py-3 bg-blue-600 text-white rounded-full font-bold shadow-lg shadow-blue-200 flex items-center justify-center gap-2"
         >
           <Download size={18} /> 下载
         </button>
      </div>
    </div>
  );
};

export default DiscrepancyReport;