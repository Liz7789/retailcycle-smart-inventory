import React from 'react';
import { InventoryTask } from '../types';
import { exportToExcel } from '../services/inventoryService';
import { FileSpreadsheet, CheckCircle2, ChevronLeft } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';

interface ReportProps {
  task: InventoryTask;
  onClose: () => void;
}

const Report: React.FC<ReportProps> = ({ task, onClose }) => {
  const overage = task.discrepancies.filter(d => d.type === 'OVERAGE');
  const shortage = task.discrepancies.filter(d => d.type === 'SHORTAGE');

  const overageVal = overage.reduce((acc, curr) => acc + curr.price, 0);
  const shortageVal = shortage.reduce((acc, curr) => acc + curr.price, 0);

  const data = [
    { name: 'Gain', amount: overageVal, count: overage.length, color: '#f97316' },
    { name: 'Loss', amount: shortageVal, count: shortage.length, color: '#ef4444' },
  ];

  return (
    <div className="flex flex-col h-full bg-slate-50">
      {/* Header with Stepper */}
      <div className="bg-white pb-2 shadow-sm sticky top-0 z-20">
        <div className="flex items-center p-4">
          <button onClick={onClose} className="p-1 -ml-2 text-slate-600">
             <ChevronLeft size={24}/>
          </button>
          <div className="flex-1 text-center font-bold text-slate-800 text-lg">
            Result
          </div>
          <div className="w-8"></div>
        </div>

        {/* Stepper (Step 4 Active) */}
        <div className="flex justify-between items-center px-8 mb-2">
          {[
            { id: 1, label: 'Scan', active: true },
            { id: 2, label: 'Check', active: true },
            { id: 3, label: 'Sign', active: true },
            { id: 4, label: 'Submit', active: true }
          ].map((step, idx, arr) => (
            <div key={step.id} className="flex-1 flex flex-col items-center relative">
              {idx !== arr.length - 1 && (
                <div className={`absolute top-3 left-1/2 w-full h-[1px] -z-10 bg-blue-500`}></div>
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

      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        
        {/* Success Banner */}
        <div className="bg-white p-6 rounded-2xl text-center shadow-sm border border-slate-100">
           <div className="inline-flex p-3 bg-green-50 text-green-600 rounded-full mb-3">
             <CheckCircle2 size={32} />
           </div>
           <h2 className="text-xl font-bold text-slate-800">Inventory Submitted</h2>
           <p className="text-slate-500 text-sm mt-1">
             Task {task.id} has been successfully recorded.
           </p>
           {task.signature && (
             <div className="mt-4 inline-block px-3 py-1 bg-slate-50 border border-slate-200 rounded text-xs text-slate-500">
               Digitally Signed by Manager
             </div>
           )}
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-4">
          <div className="p-4 bg-white rounded-xl border border-orange-100 shadow-sm">
            <div className="text-xs text-orange-500 font-bold uppercase mb-1">Overage (Gain)</div>
            <div className="text-2xl font-bold text-slate-800">{overage.length}</div>
            <div className="text-xs font-mono text-slate-400 mt-1">+${overageVal.toLocaleString()}</div>
          </div>
          <div className="p-4 bg-white rounded-xl border border-red-100 shadow-sm">
            <div className="text-xs text-red-500 font-bold uppercase mb-1">Shortage (Loss)</div>
            <div className="text-2xl font-bold text-slate-800">{shortage.length}</div>
            <div className="text-xs font-mono text-slate-400 mt-1">-${shortageVal.toLocaleString()}</div>
          </div>
        </div>

        {/* Chart */}
        <div className="h-56 w-full bg-white rounded-xl border border-slate-100 p-4 shadow-sm">
          <h3 className="text-sm font-bold text-slate-800 mb-4">Financial Impact</h3>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data}>
              <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 12, fill: '#64748b'}} />
              <YAxis hide />
              <Tooltip 
                cursor={{fill: '#f1f5f9'}} 
                contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'}}
              />
              <Bar dataKey="amount" radius={[6, 6, 0, 0]} barSize={40}>
                {data.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="bg-white border-t border-slate-100 p-4 pb-8 flex gap-3 shadow-lg z-20">
        <button 
          onClick={() => exportToExcel(task)}
          className="flex-1 py-3 bg-emerald-600 text-white rounded-full font-bold flex items-center justify-center gap-2 shadow-lg shadow-emerald-200 hover:bg-emerald-700"
        >
          <FileSpreadsheet size={18} /> Export Excel
        </button>
        <button 
           onClick={onClose}
           className="px-8 py-3 bg-slate-100 text-slate-600 rounded-full font-bold hover:bg-slate-200"
        >
           Close
        </button>
      </div>
    </div>
  );
};

export default Report;