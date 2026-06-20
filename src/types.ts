export type UserRole = "System Administrator" | "User" | "Guest";

export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  position: string;
  role: UserRole;
  canEdit?: boolean;
  canDelete?: boolean;
  status?: "pending" | "active" | "rejected";
  category?: "Hospital" | "Funeral" | "Laboratory";
  createdAt: string;
  updatedAt: string;
}

export interface Stakeholder {
  id: string;
  name: string;
  category: "hospital" | "funeral" | "laboratories" | "health" | string;
  createdAt: string;
}

export type SOAStatus =
  | "Submitted"
  | "With Issue"
  | "Verified"
  | "Sorted"
  | "Checklist Completed"
  | "Processing to Accounting"
  | "Forwarded to Accounting"
  | "Forwarded to Treasury"
  | "For Releasing"
  | "Released";

export interface StatusHistoryItem {
  id: string;
  stage: string;
  status: SOAStatus;
  updatedBy: string; // name (position)
  updatedAt: string;
  notes: string;
}

export interface SOADoc {
  id: string;
  dateReceived: string; // YYYY-MM-DD
  stakeholderName: string;
  stakeholderCategory: "hospital" | "funeral" | "laboratories";
  batchNumber: string;
  totalAmount: number;
  submissionOfSoa: boolean; // true if submitted
  status: SOAStatus;
  currentStep: number; // 1, 2, 3, 4, 5, 6
  hasIssue: boolean;
  
  // Verification Stage info (Step 2)
  verificationNotes: string;
  verificationIssueDetails: string;
  verificationDate?: string;
  
  // Sortation Stage info (Step 3)
  sortationNotes: string;
  sortationDate?: string;
  
  // Checklist Stage info (Step 4)
  checklist: {
    letterRequest: boolean;
    accomplishmentReport: boolean;
    accomplishmentPhotos: boolean;
    payrollBeneficiaries: boolean;
    photocopyId: boolean;
    certOfNoLiquidation: boolean;
    soaInvoice: boolean;
  };
  checklistNotes: string;
  checklistDate?: string;
  
  // Processing Stage info (Step 5)
  processingNotes: string;
  processingDate?: string;
  
  // Manual Stage info (Step 6)
  manualStatusNotes: string;
  manualStatusDate?: string;
  
  // Counters
  dateResetCount: number; // How many times it was returned and date reset
  
  createdAt: string;
  updatedAt: string;
  createdBy: {
    uid: string;
    displayName: string;
    position: string;
  };
  statusHistory: StatusHistoryItem[];
}

export interface SLASettings {
  receiving: number;
  verification: number;
  sorting: number;
  checklist: number;
  accounting: number;
  release: number;
  updatedAt: string;
  updatedBy: string;
  showDirectoryToAll?: boolean;
  showUsersToAll?: boolean;
  showSettingsToAll?: boolean;
}

export const DEFAULT_SLA_SETTINGS: SLASettings = {
  receiving: 1,
  verification: 4,
  sorting: 2,
  checklist: 3,
  accounting: 5,
  release: 2,
  updatedAt: new Date(0).toISOString(),
  updatedBy: "System Default",
  showDirectoryToAll: false,
  showUsersToAll: false,
  showSettingsToAll: false
};
