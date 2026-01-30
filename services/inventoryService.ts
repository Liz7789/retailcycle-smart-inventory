import { Product, ProductType, InventoryTask, Discrepancy, DiscrepancyReason } from '../types';
import * as XLSX from 'xlsx';

// Mock Data Database
const MOCK_PRODUCTS: Product[] = Array.from({ length: 30 }).map((_, i) => {
  const isPhone = i < 10; 
  const price = isPhone ? 3000 + (i * 100) : 150 + (i * 10);
  
  // Logic: Phones use SCAN, Accessories use QUANTITY
  const countMethod = isPhone ? 'SCAN' : 'QUANTITY'; 

  return {
    sku: `${1000 + i}`,
    name: isPhone ? `Xiaomi 15 Pro ${128 + (i*64)}GB Black` : `Xiaomi Earbuds Basic ${i}`,
    type: isPhone ? ProductType.PHONE : ProductType.PAD, 
    price,
    imei: `86542105${100000 + i}`, 
    lastCounted: new Date().toISOString(),
    priority: 'HIGH',
    countMethod: countMethod,
    imageUrl: isPhone 
      ? "https://fdn2.gsmarena.com/vv/bigpic/xiaomi-14-pro.jpg" 
      : "https://fdn2.gsmarena.com/vv/bigpic/xiaomi-redmi-buds-5-pro.jpg"
  };
});

export const getDailyTask = (dateStr: string): InventoryTask => {
  // Return exactly 10 items: 4 Phones (SCAN) + 6 Accessories (QUANTITY)
  const taskItems = [
      ...MOCK_PRODUCTS.slice(0, 4),  // 4 Phones
      ...MOCK_PRODUCTS.slice(10, 16) // 6 Accessories
  ].map(item => ({...item}));
  
  return {
    id: `PDD${dateStr.replace(/-/g, '')}0001`,
    date: dateStr,
    items: taskItems, 
    status: 'PENDING',
    scannedImeis: new Set(),
    discrepancies: []
  };
};

// --- NEW: Generate History Tasks ---
export const getHistoryTasks = (): InventoryTask[] => {
    return [
        {
            id: 'PDD20251214000001',
            date: '12-14-2025',
            items: [], // Empty for summary view
            status: 'PENDING', // Using PENDING to simulate expired/unfinished in UI logic
            scannedImeis: new Set(),
            discrepancies: [],
            endTime: '10:00:00' 
        },
        {
            id: 'PDD20251212000001',
            date: '12-12-2025',
            items: MOCK_PRODUCTS.slice(0, 20), // Simulate a larger previous task
            status: 'COMPLETED',
            scannedImeis: new Set(),
            discrepancies: [
                { imei: '1', sku: '1001', name: 'Item A', type: 'SHORTAGE', price: 4000, autoResolved: false }
            ],
            endTime: '09:47:21'
        }
    ];
};

export const getProductByImei = (imei: string): Product | undefined => {
  return MOCK_PRODUCTS.find(p => p.imei === imei);
};

// Simulate Dynamic Reconciliation with specific reasons
export const checkDynamicStatus = (imei: string): DiscrepancyReason | null => {
  try {
    const lastDigit = parseInt(imei.slice(-1));
    
    // Simulate finding different system logs based on IMEI
    if (lastDigit === 0) return DiscrepancyReason.SALES_FLOW; // Sold
    if (lastDigit === 1) return DiscrepancyReason.TRANSFER_OUT; // Transferred out
    if (lastDigit === 2) return DiscrepancyReason.RETURN_WAREHOUSE; // Returned to warehouse
    
    return null;
  } catch (e) {
    return null;
  }
};

export const exportToExcel = (task: InventoryTask) => {
  const ws = XLSX.utils.json_to_sheet(task.discrepancies);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Discrepancies");
  XLSX.writeFile(wb, `Report_${task.date}.xlsx`);
};