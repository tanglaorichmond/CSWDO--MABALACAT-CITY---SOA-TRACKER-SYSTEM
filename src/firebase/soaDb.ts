import { doc, setDoc, updateDoc, collection, onSnapshot, query, orderBy, deleteDoc, getDoc } from "firebase/firestore";
import { db } from "./firebase";
import { SOADoc, SOAStatus, StatusHistoryItem } from "../types";

const SOAS_COLLECTION = "soas";

// Add a helper to generate quick unique ID
const generateId = () => `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

// 1. Add a new SOA (Step 1)
export async function createSOA(
  soaData: Pick<SOADoc, "dateReceived" | "stakeholderName" | "stakeholderCategory" | "batchNumber" | "totalAmount" | "submissionOfSoa">,
  userProfile: { uid: string; displayName: string; position: string }
): Promise<void> {
  const id = generateId();
  const now = new Date().toISOString();
  
  const initialHistory: StatusHistoryItem = {
    id: generateId(),
    stage: "Step 1: Submission of SOA",
    status: "Submitted",
    updatedBy: `${userProfile.displayName} (${userProfile.position})`,
    updatedAt: now,
    notes: "Initial Statement of Account received and logged."
  };

  const newSOA: SOADoc = {
    ...soaData,
    id,
    status: "Submitted",
    currentStep: 1,
    hasIssue: false,
    dateResetCount: 0,
    createdAt: now,
    updatedAt: now,
    statusHistory: [initialHistory],
    createdBy: userProfile,
    verificationNotes: "",
    verificationIssueDetails: "",
    sortationNotes: "",
    checklist: {
      letterRequest: false,
      accomplishmentReport: false,
      accomplishmentPhotos: false,
      payrollBeneficiaries: false,
      photocopyId: false,
      certOfNoLiquidation: false,
      soaInvoice: false
    },
    checklistNotes: "",
    processingNotes: "",
    manualStatusNotes: "",
  };

  try {
    await setDoc(doc(db, SOAS_COLLECTION, id), newSOA);
  } catch (error) {
    console.error("Error creating SOA:", error);
    throw error;
  }
}

// 2. Verification Stage (Step 2)
export async function verifySOA(
  id: string,
  hasIssue: boolean,
  issueDetails: string,
  notes: string,
  userProfile: { displayName: string; position: string }
): Promise<void> {
  const now = new Date().toISOString();
  let status: SOAStatus;
  let currentStep: number;
  let updateData: Partial<SOADoc> = {};

  if (hasIssue) {
    status = "With Issue";
    currentStep = 2; // Tagged with Issue - returned to stakeholder
    
    // Reset date received & increment reset counter on returned
    updateData = {
      dateReceived: new Date().toISOString().split("T")[0], // Reset date received to current date
      hasIssue: true,
      verificationIssueDetails: issueDetails,
      verificationNotes: notes,
      verificationDate: now,
      status,
      currentStep
    };
  } else {
    status = "Verified";
    currentStep = 3; // Proceed to sortation
    updateData = {
      hasIssue: false,
      verificationNotes: notes,
      verificationIssueDetails: "",
      verificationDate: now,
      status,
      currentStep
    };
  }

  const historyItem: StatusHistoryItem = {
    id: generateId(),
    stage: "Step 2: Verification Stage",
    status,
    updatedBy: `${userProfile.displayName} (${userProfile.position})`,
    updatedAt: now,
    notes: hasIssue 
      ? `Tagged WITH ISSUE. Returned to stakeholder. Reason: ${issueDetails}. Note: Date Received was reset and temporary set to today.`
      : `Verified successfully. ${notes || "No issues detected. Proceeding to Sortation."}`
  };

  try {
    const docRef = doc(db, SOAS_COLLECTION, id);
    // Fetch snapshot first to get prior reset count & build history
    await updateDoc(docRef, {
      ...updateData,
      updatedAt: now,
      // Firebase doesn't make concatenating arrays directly via transaction straightforward without reading,
      // so we will update using standard spread in memory or we can read in transaction.
      // Since it's highly interactive, we will write a general update fields function, or read it first.
    });

    await appendHistoryItem(id, historyItem, hasIssue);
  } catch (error) {
    console.error("Error verifying SOA:", error);
    throw error;
  }
}

// 3. Sortation Stage (Step 3)
export async function sortSOA(
  id: string,
  notes: string,
  userProfile: { displayName: string; position: string }
): Promise<void> {
  const now = new Date().toISOString();
  const status: SOAStatus = "Sorted";
  const currentStep = 4; // Checklist of docs is Step 4

  const historyItem: StatusHistoryItem = {
    id: generateId(),
    stage: "Step 3: Sortation Stage",
    status,
    updatedBy: `${userProfile.displayName} (${userProfile.position})`,
    updatedAt: now,
    notes: `Documents sorted and checked. ${notes || "Proceeding to Checklist verification stage."}`
  };

  try {
    const docRef = doc(db, SOAS_COLLECTION, id);
    await updateDoc(docRef, {
      status,
      currentStep,
      sortationNotes: notes,
      sortationDate: now,
      updatedAt: now
    });
    await appendHistoryItem(id, historyItem);
  } catch (error) {
    console.error("Error sorting SOA:", error);
    throw error;
  }
}

// 4. Checklist Completeness Stage (Step 4)
export async function updateChecklist(
  id: string,
  checklist: SOADoc["checklist"],
  notes: string,
  userProfile: { displayName: string; position: string }
): Promise<void> {
  const now = new Date().toISOString();
  const status: SOAStatus = "Forwarded to Accounting";
  const currentStep = 5; // Proceed to Forwarded to Accounting

  const historyItem: StatusHistoryItem = {
    id: generateId(),
    stage: "Step 4: Checklist of Docs Stage",
    status,
    updatedBy: `${userProfile.displayName} (${userProfile.position})`,
    updatedAt: now,
    notes: `Document checklist completed successfully. ${notes || "Forwarded to Accounting Department."}`
  };

  try {
    const docRef = doc(db, SOAS_COLLECTION, id);
    await updateDoc(docRef, {
      status,
      currentStep,
      checklist,
      checklistNotes: notes,
      checklistDate: now,
      updatedAt: now
    });
    await appendHistoryItem(id, historyItem);
  } catch (error) {
    console.error("Error updating checklist:", error);
    throw error;
  }
}

// 5. Processing Stage (Step 5)
export async function processToAccounting(
  id: string,
  notes: string,
  userProfile: { displayName: string; position: string }
): Promise<void> {
  const now = new Date().toISOString();
  const status: SOAStatus = "Forwarded to Treasury";
  const currentStep = 6; // Move to Step 6 (Forwarded to Treasury)

  const historyItem: StatusHistoryItem = {
    id: generateId(),
    stage: "Step 5: Forwarded to Accounting Stage",
    status,
    updatedBy: `${userProfile.displayName} (${userProfile.position})`,
    updatedAt: now,
    notes: `Processed and approved at Accounting. Forwarded to Treasury. ${notes}`
  };

  try {
    const docRef = doc(db, SOAS_COLLECTION, id);
    await updateDoc(docRef, {
      status,
      currentStep,
      processingNotes: notes,
      processingDate: now,
      updatedAt: now
    });
    await appendHistoryItem(id, historyItem);
  } catch (error) {
    console.error("Error processing to accounting:", error);
    throw error;
  }
}

// 6. Manual Status Adjuster (Step 6 / 7)
export async function updateManualStatus(
  id: string,
  status: "Forwarded to Accounting" | "Forwarded to Treasury" | "For Releasing" | "Released",
  notes: string,
  userProfile: { displayName: string; position: string }
): Promise<void> {
  const now = new Date().toISOString();
  
  let currentStep = 6;
  if (status === "Forwarded to Accounting") currentStep = 5;
  if (status === "Forwarded to Treasury") currentStep = 6;
  if (status === "For Releasing") currentStep = 7;
  if (status === "Released") currentStep = 7;

  const historyItem: StatusHistoryItem = {
    id: generateId(),
    stage: `Step ${currentStep}: Status Movement - ${status}`,
    status,
    updatedBy: `${userProfile.displayName} (${userProfile.position})`,
    updatedAt: now,
    notes: `${notes || `SOA marked as ${status}.`}`
  };

  try {
    const docRef = doc(db, SOAS_COLLECTION, id);
    await updateDoc(docRef, {
      status,
      currentStep,
      manualStatusNotes: notes,
      manualStatusDate: now,
      updatedAt: now
    });
    await appendHistoryItem(id, historyItem);
  } catch (error) {
    console.error("Error updating manual status:", error);
    throw error;
  }
}

// Helper to manually append history log and atomic adjustments
async function appendHistoryItem(id: string, item: StatusHistoryItem, incrementResetCount: boolean = false): Promise<void> {
  try {
    const docRef = doc(db, SOAS_COLLECTION, id);
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
      const data = docSnap.data() as SOADoc;
      const history = data.statusHistory || [];
      const newHistory = [...history, item];
      const resetCount = incrementResetCount 
        ? (data.dateResetCount || 0) + 1 
        : (data.dateResetCount || 0);

      await updateDoc(docRef, {
        statusHistory: newHistory,
        dateResetCount: resetCount
      });
    }
  } catch (err) {
    console.error("Failed to append history log:", err);
  }
}

// Re-submit returned SOA (e.g. Stakeholder provides correct documents and starts fresh)
export async function resubmitSOA(
  id: string,
  newDateReceived: string,
  additionalNotes: string,
  userProfile: { displayName: string; position: string }
): Promise<void> {
  const now = new Date().toISOString();
  const status: SOAStatus = "Submitted";
  
  const historyItem: StatusHistoryItem = {
    id: generateId(),
    stage: "Step 1: Re-Submission",
    status,
    updatedBy: `${userProfile.displayName} (${userProfile.position})`,
    updatedAt: now,
    notes: `Re-submitted by stakeholder. Corrected date received: ${newDateReceived}. Notes: ${additionalNotes}`
  };

  try {
    const docRef = doc(db, SOAS_COLLECTION, id);
    await updateDoc(docRef, {
      status,
      currentStep: 1,
      hasIssue: false,
      dateReceived: newDateReceived,
      verificationIssueDetails: "",
      updatedAt: now
    });
    await appendHistoryItem(id, historyItem);
  } catch (error) {
    console.error("Error resubmitting SOA:", error);
    throw error;
  }
}

// Deleting SOA (Admin only)
export async function deleteSOA(id: string): Promise<void> {
  try {
    const docRef = doc(db, SOAS_COLLECTION, id);
    await deleteDoc(docRef);
  } catch (error) {
    console.error("Error deleting SOA:", error);
    throw error;
  }
}

// Real-time listener for SOAs (ordered by updatedAt desc)
export function subscribeToSOAs(onUpdate: (soas: SOADoc[]) => void) {
  const q = query(collection(db, SOAS_COLLECTION), orderBy("updatedAt", "desc"));
  return onSnapshot(
    q,
    (snapshot) => {
      const soas: SOADoc[] = [];
      snapshot.forEach((doc) => {
        soas.push(doc.data() as SOADoc);
      });
      onUpdate(soas);
    },
    (error) => {
      console.error("Error subscribing to SOAs:", error);
    }
  );
}
