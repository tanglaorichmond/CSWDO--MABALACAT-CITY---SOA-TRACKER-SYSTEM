import { useState } from "react";
import { SOADoc, SOAStatus, StatusHistoryItem, UserProfile } from "../types";
import { 
  X, 
  Calendar, 
  User as UserIcon, 
  Layers, 
  AlertTriangle, 
  CheckSquare, 
  FileCheck, 
  RotateCcw,
  Clock,
  ExternalLink,
  Briefcase,
  Paperclip,
  Check,
  Send,
  Building
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

interface SOADetailsModalProps {
  soa: SOADoc | null;
  isOpen: boolean;
  onClose: () => void;
  currentUser: UserProfile | null;
  onVerify: (id: string, hasIssue: boolean, issueDetails: string, notes: string) => Promise<void>;
  onSort: (id: string, notes: string) => Promise<void>;
  onChecklist: (id: string, checklist: SOADoc["checklist"], notes: string) => Promise<void>;
  onProcess: (id: string, notes: string) => Promise<void>;
  onManualStatus: (id: string, status: "Forwarded to Accounting" | "Forwarded to Treasury" | "For Releasing" | "Released", notes: string) => Promise<void>;
  onResubmit: (id: string, newDate: string, notes: string) => Promise<void>;
  showToast: (message: string, type?: "success" | "error" | "info" | "warning") => void;
}

export default function SOADetailsModal({
  soa,
  isOpen,
  onClose,
  currentUser,
  onVerify,
  onSort,
  onChecklist,
  onProcess,
  onManualStatus,
  onResubmit,
  showToast
}: SOADetailsModalProps) {
  // Local form states
  const [issueDetails, setIssueDetails] = useState("");
  const [stepNotes, setStepNotes] = useState("");
  const [validationError, setValidationError] = useState<string | null>(null);
  
  // Resubmission state
  const [resubmitDate, setResubmitDate] = useState(new Date().toISOString().split("T")[0]);
  const [resubmitNotes, setResubmitNotes] = useState("");

  // Checklist values
  const [checklistState, setChecklistState] = useState<SOADoc["checklist"]>({
    letterRequest: false,
    accomplishmentReport: false,
    accomplishmentPhotos: false,
    payrollBeneficiaries: false,
    photocopyId: false,
    certOfNoLiquidation: false,
    soaInvoice: false
  });

  // Keep track of loaded soa checklist when modal opens or soa changes
  const [loadedId, setLoadedId] = useState("");
  if (soa && soa.id !== loadedId) {
    setChecklistState(soa.checklist || {
      letterRequest: false,
      accomplishmentReport: false,
      accomplishmentPhotos: false,
      payrollBeneficiaries: false,
      photocopyId: false,
      certOfNoLiquidation: false,
      soaInvoice: false
    });
    setLoadedId(soa.id);
    setIssueDetails("");
    setStepNotes("");
    setResubmitNotes("");
    setResubmitDate(new Date().toISOString().split("T")[0]);
    setValidationError(null);
  }

  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen || !soa) return null;

  const isGuest = currentUser?.role === "Guest" || currentUser?.canEdit === false;

  // Form wrappers with indicators
  const handleVerifySubmit = async (hasIssue: boolean) => {
    if (hasIssue && !issueDetails.trim()) {
      const msg = "Please specify what Issue was found so the stakeholder knows why it was returned.";
      setValidationError(msg);
      showToast(msg, "warning");
      return;
    }
    setValidationError(null);
    setIsSubmitting(true);
    try {
      await onVerify(soa.id, hasIssue, issueDetails, stepNotes);
      setStepNotes("");
      setIssueDetails("");
    } catch (e) {
      console.error(e);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSortSubmit = async () => {
    setIsSubmitting(true);
    try {
      await onSort(soa.id, stepNotes);
      setStepNotes("");
    } catch (e) {
      console.error(e);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleChecklistSubmit = async () => {
    setIsSubmitting(true);
    try {
      const simplifiedChecklist = {
        letterRequest: true,
        accomplishmentReport: true,
        accomplishmentPhotos: true,
        payrollBeneficiaries: true,
        photocopyId: true,
        certOfNoLiquidation: true,
        soaInvoice: true
      };
      await onChecklist(soa.id, simplifiedChecklist, stepNotes);
      setStepNotes("");
    } catch (e) {
      console.error(e);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleProcessSubmit = async () => {
    setIsSubmitting(true);
    try {
      await onProcess(soa.id, stepNotes);
      setStepNotes("");
    } catch (e) {
      console.error(e);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleManualStatusSubmit = async (status: "Forwarded to Accounting" | "Forwarded to Treasury" | "For Releasing" | "Released") => {
    setIsSubmitting(true);
    try {
      await onManualStatus(soa.id, status, stepNotes);
      setStepNotes("");
    } catch (e) {
      console.error(e);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResubmitSubmit = async () => {
    if (!resubmitDate) {
      const msg = "Please input the corrected Date Received.";
      setValidationError(msg);
      showToast(msg, "warning");
      return;
    }
    setValidationError(null);
    setIsSubmitting(true);
    try {
      await onResubmit(soa.id, resubmitDate, resubmitNotes);
      setResubmitNotes("");
    } catch (e) {
      console.error(e);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Checklist helper render
  const toggleChecklistItem = (key: keyof SOADoc["checklist"]) => {
    if (isGuest) return;
    setChecklistState(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  const isChecklistFullyChecked = Object.values(checklistState).every(Boolean);

  // Get current step name
  const getStepLabel = (step: number) => {
    switch (step) {
      case 1: return "Intake Logging";
      case 2: return "Verification Check";
      case 3: return "Docket Sortation";
      case 4: return "Checklist Auditing";
      case 5: return "Forwarded to Accounting";
      case 6: return "Forwarded to Treasury";
      case 7: return "Releasing of Check";
      default: return `Step ${step}`;
    }
  };

  // Format currency
  const formatPHP = (val: number) => {
    return new Intl.NumberFormat("en-PH", {
      style: "currency",
      currency: "PHP"
    }).format(val);
  };

  const formatDateTime = (isoStr: string) => {
    return new Date(isoStr).toLocaleString("en-PH", {
      dateStyle: "medium",
      timeStyle: "short"
    });
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[100] flex items-center justify-center p-0 sm:p-4 overflow-y-auto">
      <div className="bg-white w-full max-w-4xl h-full sm:h-auto sm:rounded-3xl border border-slate-100 shadow-2xl overflow-hidden animate-scale-up sm:my-8 sm:max-h-[90vh] flex flex-col">
        
        {/* Banner Title */}
        <div className="bg-slate-900 text-white p-5 sm:p-6 border-b border-slate-800 flex justify-between items-center shrink-0">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-blue-600 rounded-lg hidden sm:block">
              <Building className="h-6 w-6 text-white" />
            </div>
            <div>
              <h3 className="text-base sm:text-xl font-extrabold tracking-tight uppercase">Audit Trail Details</h3>
              <p className="text-[10px] sm:text-xs text-slate-400 mt-0.5 font-bold">
                BATCH: <span className="font-mono text-white">{soa.batchNumber}</span> • {soa.stakeholderName}
              </p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Scrollable Container */}
        <div className="overflow-y-auto p-6 sm:p-8 space-y-8 flex-1">
          
          <AnimatePresence>
            {validationError && (
              <motion.div
                initial={{ opacity: 0, height: 0, y: -15 }}
                animate={{ opacity: 1, height: "auto", y: 0 }}
                exit={{ opacity: 0, height: 0, y: -15 }}
                transition={{ duration: 0.2 }}
                className="overflow-hidden"
              >
                <div className="bg-rose-50 border border-rose-200/60 rounded-2xl p-4 flex items-start gap-3.5 text-rose-800 text-xs font-semibold shadow-sm relative pr-10">
                  <AlertTriangle className="h-5 w-5 text-rose-500 shrink-0 mt-0.5 animate-bounce" />
                  <div className="flex-grow leading-relaxed">
                    <span className="font-black block text-rose-950 mb-0.5 tracking-tight">VERIFICATION ALERT</span>
                    {validationError}
                  </div>
                  <button
                    type="button"
                    onClick={() => setValidationError(null)}
                    className="absolute top-3.5 right-3.5 text-rose-400 hover:text-rose-700 hover:bg-rose-100 p-1.5 rounded-xl transition-all cursor-pointer"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
          
          {/* Quick Info Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 bg-slate-50 p-4 sm:p-5 rounded-2xl border border-slate-100">
            <div className="col-span-1">
              <span className="text-[8px] sm:text-[10px] uppercase font-black tracking-widest text-slate-400 block">Date Received</span>
              <span className="text-xs sm:text-sm font-black text-slate-900 mt-0.5 block flex items-center">
                <Calendar className="h-3.5 w-3.5 text-slate-400 mr-1" />
                {soa.dateReceived}
              </span>
            </div>
            <div className="col-span-1">
              <span className="text-[8px] sm:text-[10px] uppercase font-black tracking-widest text-slate-400 block">Stakeholder</span>
              <span className="text-xs sm:text-sm font-black text-slate-900 mt-0.5 block truncate uppercase" title={soa.stakeholderName}>
                {soa.stakeholderName}
              </span>
            </div>
            <div className="col-span-1">
              <span className="text-[8px] sm:text-[10px] uppercase font-black tracking-widest text-slate-400 block">Status Panel</span>
              <span className="text-xs sm:text-sm font-black text-blue-600 mt-0.5 block uppercase truncate">
                {soa.status}
              </span>
            </div>
            <div className="col-span-1">
              <span className="text-[8px] sm:text-[10px] uppercase font-black tracking-widest text-slate-400 block">Total Amount</span>
              <span className="text-xs sm:text-sm font-black text-slate-900 mt-0.5 block truncate">
                {formatPHP(soa.totalAmount)}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            
            {/* Left Column: Movement Advancer Actions (60%) */}
            <div className="lg:col-span-7 space-y-6">
              <h4 className="text-sm font-extrabold text-slate-800 uppercase tracking-widest border-b pb-2 flex items-center space-x-2">
                <CheckSquare className="h-4 w-4 text-blue-600" />
                <span>Active Track Options</span>
              </h4>

              {/* GUEST WARNING / VIEW ONLY LIMITS */}
              {isGuest && (
                <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl text-xs text-slate-600">
                  <p className="font-bold text-slate-800 mb-1 flex items-center">
                    <Clock className="h-4 w-4 mr-1 text-slate-500" />
                    Read-Only View Mode
                  </p>
                  You are exploring in Read-Only Mode. You can trace audit timelines, monitor active stages, and view checklists, but advancing movements requires a logged account with active Edit permissions.
                </div>
              )}

              {/* TRANSITIONS LOGIC TRIGGER */}
              {!isGuest && (
                <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm space-y-5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-400 uppercase">Current Phase</span>
                    <span className="text-xs bg-slate-900 text-white font-extrabold px-3 py-1 rounded-full">
                      Step {soa.currentStep} of 7 - {soa.status === "With Issue" ? "Issue Alert" : getStepLabel(soa.currentStep)}
                    </span>
                  </div>

                  {/* STEP 1: INITIAL LOG / REDIRECT ON "WITH ISSUE" */}
                  {soa.status === "With Issue" && (
                    <div className="bg-rose-50 border border-rose-200/50 p-4 rounded-xl space-y-4 font-medium animate-pulse">
                      <div className="flex items-start space-x-2 text-rose-800">
                        <AlertTriangle className="h-5 w-5 shrink-0" />
                        <div>
                          <p className="font-bold text-rose-900 text-sm">Statement returned to Stakeholder with issues</p>
                          <p className="text-xs mt-1 text-rose-700 font-semibold">Reason: {soa.verificationIssueDetails || "None specified"}</p>
                        </div>
                      </div>
                      
                      <div className="pt-3 border-t border-rose-200/50 space-y-3">
                        <p className="text-[11px] text-slate-600 font-bold uppercase tracking-wider block">Perform Stakeholder Re-submission &amp; Reset Date:</p>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          <div>
                            <label className="text-[10px] text-slate-500 font-bold block mb-1">Corrected Date Received</label>
                            <input 
                              type="date"
                              value={resubmitDate}
                              onChange={(e) => setResubmitDate(e.target.value)}
                              className="w-full text-xs font-semibold rounded-lg border border-slate-200 p-2 focus:ring-1 focus:ring-blue-500 bg-white"
                            />
                          </div>
                          <div>
                            <label className="text-[10px] text-slate-500 font-bold block mb-1">Re-submission Notes</label>
                            <input 
                              type="text"
                              placeholder="e.g. Corrected documents attached"
                              value={resubmitNotes}
                              onChange={(e) => setResubmitNotes(e.target.value)}
                              className="w-full text-xs font-semibold rounded-lg border border-slate-200 p-2 focus:ring-1 focus:ring-blue-500 bg-white"
                            />
                          </div>
                        </div>

                        <button
                          onClick={handleResubmitSubmit}
                          disabled={isSubmitting}
                          className="w-full bg-rose-600 hover:bg-rose-500 text-white font-extrabold text-xs py-2 px-3 rounded-lg flex items-center justify-center space-x-1.5 shadow-md shadow-rose-600/10 transition-colors"
                        >
                          <RotateCcw className="h-3.5 w-3.5" />
                          <span>Clear Issue &amp; Re-submit SOA</span>
                        </button>
                      </div>
                    </div>
                  )}

                  {/* STEP 2: VERIFICATION CHECK (when status is Submitted) */}
                  {soa.currentStep === 1 && soa.status === "Submitted" && (
                    <div className="space-y-4">
                      <div>
                        <h5 className="text-sm font-bold text-slate-900">Step 2: Verification Review</h5>
                        <p className="text-xs text-slate-500 mt-1">Review the folder contents. Determine if document has clearance issues or can proceed.</p>
                      </div>

                      <div className="space-y-3">
                        <div>
                          <label className="text-[10px] text-slate-400 uppercase font-bold block mb-1">Audit Notes / Comments</label>
                          <textarea
                            placeholder="Add relevant checklist or auditing notes here..."
                            value={stepNotes}
                            onChange={(e) => setStepNotes(e.target.value)}
                            className="w-full text-xs rounded-xl border border-slate-200 p-3 bg-slate-50/50 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                            rows={2}
                          />
                        </div>

                        {/* Issue Details (Only shows if typing details or clicking issue) */}
                        <div className="bg-amber-50 p-3.5 rounded-xl border border-amber-200/50 space-y-2">
                          <label className="text-[10px] text-amber-800 uppercase font-bold block">Flag with Issue &amp; Return Details (Required for returns)</label>
                          <input
                            type="text"
                            placeholder="e.g. Missing signature, wrong batch list details..."
                            value={issueDetails}
                            onChange={(e) => setIssueDetails(e.target.value)}
                            className="w-full text-xs rounded-lg border border-amber-200 p-2.5 focus:outline-none focus:ring-2 focus:ring-amber-500/20 bg-white"
                          />
                        </div>

                          <div className="flex flex-col sm:flex-row gap-3">
                            <button
                              onClick={() => handleVerifySubmit(true)}
                              disabled={isSubmitting}
                              className="flex-1 bg-amber-600 hover:bg-amber-700 text-white text-[10px] sm:text-xs font-black uppercase tracking-widest py-3 sm:py-2.5 px-4 rounded-xl flex items-center justify-center space-x-1.5 transition-all text-center"
                            >
                              <AlertTriangle className="h-4 w-4" />
                              <span>Return Booklet (With Issue)</span>
                            </button>
                            
                            <button
                              onClick={() => handleVerifySubmit(false)}
                              disabled={isSubmitting}
                              className="flex-1 bg-blue-600 hover:bg-blue-500 text-white text-[10px] sm:text-xs font-black uppercase tracking-widest py-3 sm:py-2.5 px-4 rounded-xl flex items-center justify-center space-x-1.5 transition-all shadow-md shadow-blue-600/20 text-center"
                            >
                              <Check className="h-4 w-4" />
                              <span>Verified (Pass to Sortation)</span>
                            </button>
                          </div>
                      </div>
                    </div>
                  )}

                  {/* STEP 3: SORTATION (when status is Verified) */}
                  {soa.currentStep === 3 && soa.status === "Verified" && (
                    <div className="space-y-4">
                      <div>
                        <h5 className="text-sm font-bold text-slate-900">Step 3: Docket Sortation</h5>
                        <p className="text-xs text-slate-500 mt-1">Categorize and bundle the account folders with specific office classifications.</p>
                      </div>

                      <div className="space-y-3">
                        <div>
                          <label className="text-[10px] text-slate-400 uppercase font-bold block mb-1">Sortation Audit Notes</label>
                          <textarea
                            placeholder="Input details about documents grouping/classification..."
                            value={stepNotes}
                            onChange={(e) => setStepNotes(e.target.value)}
                            className="w-full text-xs rounded-xl border border-slate-200 p-3 bg-slate-50/50 focus:outline-none"
                            rows={3}
                          />
                        </div>

                        <button
                          onClick={handleSortSubmit}
                          disabled={isSubmitting}
                          className="w-full bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold py-3 px-4 rounded-xl flex items-center justify-center space-x-1 shadow-md shadow-blue-500/10 transition-colors"
                        >
                          <Check className="h-4 w-4" />
                          <span>Approve Sortation &amp; Proceed to Checklist</span>
                        </button>
                      </div>
                    </div>
                  )}

                  {/* STEP 4: CHECKLISTS (when status is Sorted) */}
                  {soa.currentStep === 4 && soa.status === "Sorted" && (
                    <div className="space-y-4">
                      <div>
                        <h5 className="text-sm font-bold text-slate-900">Step 4: Checklists of documents</h5>
                        <p className="text-xs text-slate-500 mt-1">Confirm that mandatory folder requirements are verified to move forward.</p>
                      </div>

                      {/* Informational verified requirement banner */}
                      <div className="bg-blue-50/50 rounded-2xl p-4.5 border border-blue-100 flex items-start space-x-3 text-xs text-slate-600">
                        <Check className="h-5 w-5 text-blue-600 shrink-0 mt-0.5 bg-blue-100 rounded-full p-1" />
                        <div>
                          <span className="font-bold text-slate-800 block mb-1">Standard Document Verification Checklist Includes:</span>
                          <ul className="list-disc list-inside space-y-1 text-slate-500 font-medium">
                            <li>1. Letter of Request / Letter of Intent</li>
                            <li>2. Accomplishment Report &amp; Activites Photos</li>
                            <li>3. Payroll / Registry of official beneficiaries</li>
                            <li>4. Valid Photocopy of Beneficiary IDs</li>
                            <li>5. Certificate of No Outstanding Liquidation</li>
                            <li>6. Physical Statement of Account / Billing Statement</li>
                          </ul>
                        </div>
                      </div>

                      {/* Completion Notes */}
                      <div className="space-y-3">
                        <div>
                          <label className="text-[10px] text-slate-400 uppercase font-bold block mb-1">Checklist Notes</label>
                          <input
                            type="text"
                            placeholder="Add memo about checklist files (e.g. All clear)"
                            value={stepNotes}
                            onChange={(e) => setStepNotes(e.target.value)}
                            className="w-full text-xs rounded-xl border border-slate-200 p-2.5 focus:outline-none focus:ring-1 focus:ring-blue-500 bg-slate-50/50"
                          />
                        </div>

                        <button
                          onClick={handleChecklistSubmit}
                          disabled={isSubmitting}
                          className="w-full text-white bg-blue-600 hover:bg-blue-500 text-xs font-bold py-3.5 px-4 rounded-xl flex items-center justify-center space-x-1 shadow-md shadow-blue-500/10 transition-all hover:scale-[1.01] active:scale-[0.99]"
                        >
                          <Check className="h-4 w-4" />
                          <span>Complete Document Checklist</span>
                        </button>
                      </div>
                    </div>
                  )}

                  {/* STEP 5: ACTION TO ACCOUNTING (when status is Forwarded to Accounting) */}
                  {soa.currentStep === 5 && (soa.status === "Forwarded to Accounting" || soa.status === "Checklist Completed") && (
                    <div className="space-y-4">
                      <div>
                        <h5 className="text-sm font-bold text-slate-900">Step 5: Forwarded to Accounting</h5>
                        <p className="text-xs text-slate-500 mt-1">Review statement details and authorize forwarding the folder packet to Treasury.</p>
                      </div>

                      <div className="space-y-3">
                        <div>
                          <label className="text-[10px] text-slate-400 uppercase font-bold block mb-1">Accounting Progress Notes</label>
                          <textarea
                            placeholder="Provide details about accounting approval..."
                            value={stepNotes}
                            onChange={(e) => setStepNotes(e.target.value)}
                            className="w-full text-xs rounded-xl border border-slate-200 p-3 bg-slate-50/50 focus:outline-none"
                            rows={3}
                          />
                        </div>

                        <button
                          onClick={() => handleManualStatusSubmit("Forwarded to Treasury")}
                          disabled={isSubmitting}
                          className="w-full bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold py-3.5 px-4 rounded-xl flex items-center justify-center space-x-1 shadow-md shadow-blue-500/10 transition-colors cursor-pointer"
                        >
                          <Send className="h-4 w-4" />
                          <span>Forward to Treasury</span>
                        </button>
                      </div>
                    </div>
                  )}

                  {/* STEP 6: FORWARDED TO TREASURY */}
                  {soa.currentStep === 6 && soa.status === "Forwarded to Treasury" && (
                    <div className="space-y-4">
                      <div>
                        <h5 className="text-sm font-bold text-slate-900">Step 6: Forwarded to Treasury</h5>
                        <p className="text-xs text-slate-500 mt-1">Review statement details. Authorize releasing of the check within Treasury.</p>
                      </div>

                      <div className="space-y-3">
                        <div>
                          <label className="text-[10px] text-slate-400 uppercase font-bold block mb-1">Treasury Verification Notes</label>
                          <textarea
                            placeholder="Provide details about treasury validation..."
                            value={stepNotes}
                            onChange={(e) => setStepNotes(e.target.value)}
                            className="w-full text-xs rounded-xl border border-slate-200 p-3 bg-slate-50/50 focus:outline-none"
                            rows={3}
                          />
                        </div>

                        <button
                          onClick={() => handleManualStatusSubmit("For Releasing")}
                          disabled={isSubmitting}
                          className="w-full bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold py-3.5 px-4 rounded-xl flex items-center justify-center space-x-1 shadow-md shadow-blue-500/10 transition-colors cursor-pointer"
                        >
                          <Send className="h-4 w-4" />
                          <span>Advance to Check Releasing</span>
                        </button>
                      </div>
                    </div>
                  )}

                  {/* STEP 7: RELEASING OF CHECK IN TREASURY */}
                  {soa.currentStep === 7 && soa.status === "For Releasing" && (
                    <div className="space-y-4">
                      <div>
                        <h5 className="text-sm font-bold text-slate-900">Step 7: Releasing of Check in Treasury</h5>
                        <p className="text-xs text-slate-500 mt-1">The check is prepared in Treasury. Complete the disbursal pipeline by marking the check as fully released.</p>
                      </div>

                      <div className="space-y-3">
                        <div>
                          <label className="text-[10px] text-slate-400 uppercase font-bold block mb-1">Disbursal &amp; Release Notes</label>
                          <textarea
                            placeholder="Provide release details (e.g., check number, beneficiary name, signature details)..."
                            value={stepNotes}
                            onChange={(e) => setStepNotes(e.target.value)}
                            className="w-full text-xs rounded-xl border border-slate-200 p-3 bg-slate-50/50 focus:outline-none"
                            rows={3}
                          />
                        </div>

                        <button
                          onClick={() => handleManualStatusSubmit("Released")}
                          disabled={isSubmitting}
                          className="w-full bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold py-3.5 px-4 rounded-xl flex items-center justify-center space-x-1 shadow-md shadow-emerald-500/10 transition-colors cursor-pointer"
                        >
                          <Check className="h-4 w-4" />
                          <span>Mark Check as Fully Released</span>
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Option to return with issue on any active stage past Step 2 */}
                  {soa.status !== "With Issue" && soa.status !== "Released" && soa.currentStep > 1 && (
                    <div className="pt-4 border-t border-slate-100 mt-4">
                      <details className="group">
                        <summary className="flex items-center justify-between text-xs font-bold text-amber-700 cursor-pointer list-none select-none hover:text-amber-800">
                          <span className="flex items-center gap-1.5 font-bold">
                            <AlertTriangle className="h-4 w-4 text-amber-650 shrink-0" />
                            <span>Found an Issue? Return to Stakeholder</span>
                          </span>
                          <span className="text-[10px] bg-amber-50 text-amber-800 px-2 py-0.5 rounded font-extrabold group-open:hidden">
                            Show Option
                          </span>
                          <span className="text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded font-extrabold hidden group-open:inline">
                            Hide Option
                          </span>
                        </summary>
                        
                        <div className="mt-3.5 space-y-3.5 bg-amber-50/40 p-4 rounded-xl border border-amber-100/60 transition-all">
                          <p className="text-[11px] text-slate-500 font-medium leading-relaxed">
                            If you discover any issues regarding documentation, compliance or signatures during this stage, you may return the booklet file to the stakeholder. They will be notified to correct and re-submit.
                          </p>
                          <div>
                            <label className="text-[10px] text-amber-900 uppercase font-bold block mb-1">Issue / Return Reason (Required)</label>
                            <input
                              type="text"
                              placeholder="e.g. Missing signature, wrong budget details, unreadable attachment..."
                              value={issueDetails}
                              onChange={(e) => setIssueDetails(e.target.value)}
                              className="w-full text-xs rounded-xl border border-slate-200 p-2.5 bg-white focus:outline-none focus:ring-2 focus:ring-amber-500/20"
                            />
                          </div>
                          <div>
                            <label className="text-[10px] text-slate-500 uppercase font-bold block mb-1">Additional Internal Audit Notes</label>
                            <textarea
                              placeholder="Describe internal audit findings..."
                              value={stepNotes}
                              onChange={(e) => setStepNotes(e.target.value)}
                              className="w-full text-xs rounded-xl border border-slate-200 p-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500/10 bg-white"
                              rows={2}
                            />
                          </div>
                          <button
                            type="button"
                            onClick={() => handleVerifySubmit(true)}
                            disabled={isSubmitting}
                            className="w-full bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold py-2.5 px-4 rounded-xl flex items-center justify-center space-x-1.5 transition-colors cursor-pointer"
                          >
                            <AlertTriangle className="h-4 w-4" />
                            <span>Confirm &amp; Return Booklet File</span>
                          </button>
                        </div>
                      </details>
                    </div>
                  )}

                </div>
              )}

            </div>

            {/* Right Column: Complete Timeline Audit Logs (40%) */}
            <div className="lg:col-span-12 xl:col-span-5 space-y-6">
              <h4 className="text-sm font-extrabold text-slate-800 uppercase tracking-widest border-b pb-2 flex items-center space-x-2">
                <Clock className="h-4 w-4 text-slate-500" />
                <span>Audit Logs trail</span>
              </h4>

              {/* Timeline layout list */}
              <div className="relative border-l border-slate-200 pl-4 ml-2 space-y-6 max-h-[460px] overflow-y-auto pr-2">
                {(soa.statusHistory || []).map((history: StatusHistoryItem, index: number) => {
                  const isLast = index === (soa.statusHistory?.length || 0) - 1;
                  return (
                    <div key={history.id} className="relative">
                      {/* Timeline Dot */}
                      <span className={`absolute -left-6 top-1.5 h-3.5 w-3.5 rounded-full border-2 ${
                        isLast 
                          ? "bg-blue-600 border-blue-600 shadow-sm animate-ping-once" 
                          : "bg-white border-slate-300"
                      }`}></span>

                      <div>
                        {/* Header event name */}
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between text-xs gap-1">
                          <span className="font-extrabold text-slate-900">{history.stage}</span>
                          <span className="text-[10px] text-slate-400 font-bold">{formatDateTime(history.updatedAt)}</span>
                        </div>
                        {/* Status check */}
                        <div className="mt-1 flex items-center space-x-2">
                          <span className="text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded-md font-bold">
                            {history.status}
                          </span>
                          <span className="text-[10px] text-slate-500">
                            By: <span className="font-bold">{history.updatedBy}</span>
                          </span>
                        </div>
                        {/* Message description text */}
                        <p className="text-xs text-slate-600 mt-1.5 bg-slate-50 p-2.5 rounded-xl leading-relaxed italic border border-slate-100">
                          {history.notes || "No notes logged for this entry."}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>

            </div>

          </div>

        </div>

        {/* Foot lock */}
        <div className="bg-slate-50 p-4 border-t border-slate-100 flex justify-end shrink-0 sm:rounded-b-3xl">
          <button
            onClick={onClose}
            className="w-full sm:w-auto bg-slate-900 hover:bg-slate-800 text-white font-black uppercase tracking-widest text-[10px] sm:text-xs py-3.5 sm:py-2.5 px-6 rounded-xl transition-all"
          >
            Close Audit Panel
          </button>
        </div>

      </div>
    </div>
  );
}
