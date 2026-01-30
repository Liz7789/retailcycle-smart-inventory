import React from 'react';
import { InventoryTask } from '../types';
import { ChevronLeft } from 'lucide-react';

interface ViewSignatureProps {
  task: InventoryTask;
  onBack: () => void;
}

const ViewSignature: React.FC<ViewSignatureProps> = ({ task, onBack }) => {
  return (
    <div className="flex flex-col h-full bg-slate-50">
       <header className="bg-white px-4 py-3 shadow-sm sticky top-0 z-10 flex items-center">
           <button onClick={onBack} className="p-1 -ml-2 text-slate-600">
             <ChevronLeft size={24} />
           </button>
           <div className="flex-1 text-center font-bold text-slate-800 text-lg">
             {task.id}
           </div>
           <div className="w-8"></div>
       </header>

       <div className="flex-1 p-4 space-y-6">
          <div className="bg-white rounded-xl p-6 shadow-sm">
             <h3 className="text-lg font-bold text-slate-900 mb-4 border-l-4 border-blue-600 pl-3">日盘提交签字照片</h3>
             
             <div className="border border-slate-200 rounded-lg p-2 mb-2">
                {task.signature ? (
                    <img src={task.signature} alt="Digital Signature" className="w-full h-40 object-contain" />
                ) : (
                    <div className="w-full h-40 flex items-center justify-center text-slate-300">无签名</div>
                )}
             </div>
             
             <div className="bg-slate-700 text-white text-center py-2 rounded mb-2">
                 唐亚茹
             </div>
             <div className="text-center text-slate-400 font-mono text-sm mb-2">
                 3150492689
             </div>
             <div className="text-center text-slate-300 text-xs border-t border-slate-100 pt-2">
                 签名时间：{task.date} 09:45:00
             </div>
          </div>
       </div>
    </div>
  );
};

export default ViewSignature;