// المستخدمين
export type UserRole =
  | 'factory_manager'
  | 'supervisor'
  | 'maintenance_technician';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  department?: string;
  avatar?: string;
}

// الماكينات
export type MachineStatus =
  | 'running'
  | 'stopped'
  | 'maintenance';

export interface Machine {
  id: string;
  name: string;
  department: string;
  status: MachineStatus;
  lastUpdated: string;
  type?: string;
  image?: string;
}

// الورديات
export interface Shift {
  id:               string;
  shiftType:        string;
  shiftTypeDisplay: string;
  supervisorId:     string;
  supervisorName:   string;
  startTime:        string;
  endTime?:         string;
  isActive:         boolean;
  startPhoto:       string;
}

// الأعطال
export type FaultStatus =
  | 'pending'
  | 'in_progress'
  | 'resolved';

export interface Fault {
  id:              string;
  machineId:       string;
  machineName:     string;
  shiftId:         string;
  reportedById:    string;
  reportedByName:  string;
  assignedToId?:   string;
  assignedToName?: string;
  description:     string;
  status:          FaultStatus;
  reportedAt:      string;
  acceptedAt?:     string;
  resolvedAt?:     string;
  beforePhoto:     string;
  afterPhoto?:     string;
  resolutionNotes: string;
  department?:     string;
  downtimeMinutes?: number;
}

// المواد الخام المستخدمة في الإنتاج
export interface RawMaterialUsed {
  name: string;
  quantity: number;
  unit: string;
}

export interface Production {
  id: string;
  shiftId: string;
  supervisorId: string;
  supervisorName: string;
  date: string;
  targetQuantity: number;
  actualQuantity: number;
  rejectedQuantity: number;
  achievementRate: number;
  photo?: string;
  photoUrl?: string;
  notes: string;
  rawMaterialsUsed?: RawMaterialUsed[];
}

// التقارير
export interface ProductionReport {
  period: string;
  department: string;
  totalTarget: number;
  totalActual: number;
  totalRejected: number;
  achievementRate: number;
  dailyBreakdown: {
    date: string;
    target: number;
    actual: number;
    rejected: number;
  }[];
  rawMaterialsUsed?: {
    name: string;
    unit: string;
    totalQuantity: number;
  }[];
}

export interface MachineReport {
  period: string;
  avgAvailability?: number;
  totalFaults?: number;
  avgResolutionTime?: number;
  machines: {
    machineId: string;
    machineName: string;
    department?: string;
    totalRunningHours: number;
    totalDowntimeHours: number;
    faultCount: number;
    avgResolutionTime?: number;
  }[];
}

export interface FaultReport {
  period: string;
  totalFaults: number;
  avgResolutionTimeMinutes: number;
  resolvedCount?: number;
  byStatus?: {
    pending?: number;
    in_progress?: number;
    resolved?: number;
  };
  mostFrequentFaults: {
    machineName: string;
    department?: string;
    count: number;
  }[];
}