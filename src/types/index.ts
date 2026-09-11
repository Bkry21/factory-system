// المستخدمين
export type UserRole = 
  | 'factory_manager'      // مدير المصنع
  | 'operation_manager'    // مدير التشغيل
  | 'production_manager'   // مدير الإنتاج
  | 'supervisor'           // مشرف القسم (تشغيل + إنتاج)
  | 'technician';          // فني صيانة

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
  | 'running'      // شغالة
  | 'stopped'      // متوقفة
  | 'maintenance'; // تحت الصيانة

export interface Machine {
  id: string;
  name: string;
  department: string;
  status: MachineStatus;
  lastUpdated: string;
}

// الأعطال
export type FaultStatus =
  | 'pending'      // في الانتظار
  | 'in_progress'  // جاري الإصلاح
  | 'resolved';    // تم الإصلاح

export interface Fault {
  id: string;
  machineId: string;
  machineName: string;
  description: string;
  reportedBy: string;
  reportedAt: string;
  resolvedAt?: string;
  status: FaultStatus;
  photoUrl?: string;
}

// الإنتاج
export interface Production {
  id: string;
  department: string;
  date: string;
  targetQuantity: number;
  actualQuantity: number;
  rejectedQuantity: number;
  rawMaterialsUsed: string;
  photoUrl?: string;
  supervisorId: string;
}