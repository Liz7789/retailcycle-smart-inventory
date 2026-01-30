export enum ProductType {
  PHONE = 'PHONE',
  PAD = 'PAD'
}

export interface Product {
  sku: string;
  name: string;
  type: ProductType;
  price: number;
  imageUrl?: string;
  imei: string; // Serialized inventory
  lastCounted: string; // ISO Date
  priority: 'HIGH' | 'MEDIUM' | 'LOW';
  countMethod: 'SCAN' | 'QUANTITY'; // New field for UI distinction
  manualCount?: number; // Field to store manually entered count for QUANTITY items
}

export interface InventoryTask {
  id: string;
  date: string;
  items: Product[]; // The snapshot of items expected to be found
  status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED';
  scannedImeis: Set<string>;
  discrepancies: Discrepancy[];
  signature?: string; // Base64 signature
  signedBy?: string;
  startTime?: string;
  endTime?: string;
  // New field to persist the last scanned item across view changes
  lastAction?: {
    name: string;
    time: string;
    code: string;
  };
}

export interface Discrepancy {
  imei: string;
  sku: string;
  name: string;
  type: 'OVERAGE' | 'SHORTAGE';
  price: number;
  reason?: DiscrepancyReason;
  autoResolved: boolean; // True if fixed by dynamic comparison
}

export enum DiscrepancyReason {
  // Manual Reasons
  DAMAGE = "损耗（Damage/Loss）",
  COUNTING_ERROR = "清点错误（Counting Error）",
  OTHER = "其他（Other）",
  
  // System Auto-Detected Reasons
  SALES_FLOW = "销售流水（Sales Flow）",
  TRANSFER_OUT = "店间调拨出库（Transfer Out）",
  TRANSFER_IN = "店间调拨入库（Transfer In）",
  RETURN_WAREHOUSE = "返仓出库（Return to Warehouse）",
  WRONG_DELIVERY = "错发（Wrong Delivery）",
  NOT_RECEIVED = "未入库（Not Received）"
}

export interface DashboardStats {
  completionRate: number;
  totalTasks: number;
  completedTasks: number;
  totalOverageValue: number;
  totalShortageValue: number;
}