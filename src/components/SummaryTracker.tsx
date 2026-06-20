import React, { useState, useMemo } from "react";
import { SOADoc, SOAStatus, Stakeholder, SLASettings, DEFAULT_SLA_SETTINGS, UserProfile } from "../types";
import { 
  Building2, 
  HeartPulse, 
  FlaskConical,
  Activity, 
  Layers, 
  CheckCircle2, 
  XCircle, 
  Hourglass, 
  AlertTriangle,
  Compass, 
  Search, 
  ArrowRight, 
  Workflow, 
  Calendar, 
  FileText, 
  MapPin, 
  ShieldCheck, 
  Sparkles,
  RefreshCw,
  FolderOpen,
  ChevronDown,
  Plus,
  Minus,
  AlertCircle
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

interface SummaryTrackerProps {
  soas: SOADoc[];
  stakeholders: Stakeholder[];
  currentUser?: UserProfile | null;
  slaSettings: SLASettings | null;
  selectedStakeholderName: string | null;
  selectedViewType: "batch" | "stakeholder";
  selectedSOAId: string | null;
  setSelectedSOAId: (id: string | null) => void;
  setSelectedStakeholderName: (name: string | null) => void;
  setSelectedViewType: (type: "batch" | "stakeholder") => void;
}

export default function SummaryTracker({ 
  soas, 
  stakeholders,
  currentUser,
  slaSettings,
  selectedStakeholderName,
  selectedViewType,
  selectedSOAId,
  setSelectedSOAId,
  setSelectedStakeholderName,
  setSelectedViewType
}: SummaryTrackerProps) {

  const isOverdue = (doc: SOADoc) => {
    if (doc.status === "Released") return false;
    
    // Mapping currentStep to SLA setting keys
    const stepKeys: { [key: number]: keyof SLASettings } = {
      1: 'receiving',
      2: 'verification',
      3: 'sorting',
      4: 'checklist',
      5: 'accounting',
      6: 'release'
    };

    const settings = slaSettings || DEFAULT_SLA_SETTINGS;
    const targetDays = settings[stepKeys[doc.currentStep]] as number;
    if (!targetDays) return false;

    const lastUpdate = new Date(doc.updatedAt).getTime();
    const now = Date.now();
    const diffDays = (now - lastUpdate) / (1000 * 60 * 60 * 24);

    return diffDays > targetDays;
  };

  const getOverdueDays = (doc: SOADoc) => {
    if (doc.status === "Released") return 0;
    
    const stepKeys: { [key: number]: keyof SLASettings } = {
      1: 'receiving',
      2: 'verification',
      3: 'sorting',
      4: 'checklist',
      5: 'accounting',
      6: 'release'
    };

    const settings = slaSettings || DEFAULT_SLA_SETTINGS;
    const targetDays = settings[stepKeys[doc.currentStep]] as number;
    if (!targetDays) return 0;

    const lastUpdate = new Date(doc.updatedAt).getTime();
    const now = Date.now();
    const diffDays = (now - lastUpdate) / (1000 * 60 * 60 * 24);

    if (diffDays > targetDays) {
      const value = Math.floor(diffDays - targetDays);
      return value === 0 ? 1 : value;
    }
    return 0;
  };

  const renderCategoryMiniIcon = (category?: string) => {
    const cat = (category || "").toLowerCase();
    if (cat === "hospital" || cat === "health") {
      return (
        <span className="p-1.5 bg-rose-50 border border-rose-100 text-rose-500 rounded-lg shrink-0 flex items-center justify-center">
          <HeartPulse className="h-3.5 w-3.5" />
        </span>
      );
    } else if (cat === "laboratories" || cat === "laboratory" || cat === "lab") {
      return (
        <span className="p-1.5 bg-purple-50 border border-purple-100 text-purple-500 rounded-lg shrink-0 flex items-center justify-center">
          <FlaskConical className="h-3.5 w-3.5" />
        </span>
      );
    } else if (cat === "funeral") {
      return (
        <span className="p-1.5 bg-amber-50 border border-amber-100 text-amber-500 rounded-lg shrink-0 flex items-center justify-center">
          <Building2 className="h-3.5 w-3.5" />
        </span>
      );
    }
    return (
      <span className="p-1.5 bg-slate-50 border border-slate-100 text-slate-400 rounded-lg shrink-0 flex items-center justify-center">
        <Building2 className="h-3.5 w-3.5" />
      </span>
    );
  };

  // Group stakeholders & compute info
  const categorizedData = useMemo(() => {
    // Group SOAs by stakeholder name
    const grouped: { [name: string]: { name: string; category: Stakeholder['category']; docCount: number; amount: number; lastUpdated: string; activeDoc: SOADoc | null; allDocs: SOADoc[] } } = {};

    // Seed with explicitly defined stakeholders from database
    stakeholders.forEach(st => {
      grouped[st.name] = {
        name: st.name,
        category: st.category,
        docCount: 0,
        amount: 0,
        lastUpdated: st.createdAt || new Date().toISOString(),
        activeDoc: null,
        allDocs: []
      };
    });

    soas.forEach(soa => {
      const name = soa.stakeholderName;
      
      // If not in grouped (unregistered), add it temporarily
      if (!grouped[name]) {
        grouped[name] = {
          name: name,
          category: "hospital", // Default placeholder
          docCount: 0,
          amount: 0,
          lastUpdated: soa.updatedAt,
          activeDoc: null,
          allDocs: []
        };
      }

      const group = grouped[name];
      group.docCount += 1;
      group.amount += soa.totalAmount;
      group.allDocs.push(soa);

      // Save newest updated at text
      if (new Date(soa.updatedAt) > new Date(group.lastUpdated)) {
        group.lastUpdated = soa.updatedAt;
      }

      // Check for active (in-progress) document first, or just the latest one
      if (!group.activeDoc) {
        group.activeDoc = soa;
      } else {
        const isCurrentActive = !["Released"].includes(soa.status);
        const isSavedActive = !["Released"].includes(group.activeDoc.status);
        if (isCurrentActive && !isSavedActive) {
          group.activeDoc = soa;
        } else if (new Date(soa.updatedAt) > new Date(group.activeDoc.updatedAt)) {
          group.activeDoc = soa;
        }
      }
    });

    // Sort alphabetically by name
    return Object.values(grouped).sort((a, b) => a.name.localeCompare(b.name));
  }, [soas, stakeholders]);

  const groupedStakeholders = useMemo(() => {
    const sorted = [...stakeholders].sort((a, b) => a.name.localeCompare(b.name));
    
    return {
      hospitals: sorted.filter(s => s.category === 'hospital' || s.category === 'health'),
      funerals: sorted.filter(s => s.category === 'funeral'),
      laboratories: sorted.filter(s => s.category === 'laboratories' || s.category === 'laboratory' || s.category === 'lab'),
      others: sorted.filter(s => 
        s.category !== 'hospital' && 
        s.category !== 'health' && 
        s.category !== 'funeral' && 
        s.category !== 'laboratories' && 
        s.category !== 'laboratory' && 
        s.category !== 'lab'
      )
    };
  }, [stakeholders]);

  // Find currently selected SOA
  const selectedSOA = useMemo(() => {
    if (selectedSOAId) {
      return soas.find(s => s.id === selectedSOAId) || null;
    }
    // Default to the first in progress document if none is selected
    const inProgress = soas.find(s => s.status !== "Released");
    return inProgress || soas[0] || null;
  }, [soas, selectedSOAId]);

  // Find currently selected Group
  const selectedStakeholderGroup = useMemo(() => {
    return categorizedData.find(g => g.name === selectedStakeholderName) || null;
  }, [categorizedData, selectedStakeholderName]);

  // Aggregate numbers
  const stats = useMemo(() => {
    let healthCount = 0;
    let funeralCount = 0;
    let otherCount = 0;
    let inProgressCount = 0;
    let withIssueCount = 0;
    let completedCount = 0;

    let hospitalSOAs = 0;
    let funeralSOAs = 0;
    let laboratorySOAs = 0;

    categorizedData.forEach(item => {
      if (item.category === "hospital" || item.category === "health") healthCount++;
      else if (item.category === "funeral") funeralCount++;
      else otherCount++;
    });

    soas.forEach(s => {
      // Category count of SOAs
      const cat = s.stakeholderCategory;
      if (cat === "hospital") {
        hospitalSOAs++;
      } else if (cat === "funeral") {
        funeralSOAs++;
      } else if (cat === "laboratories") {
        laboratorySOAs++;
      }

      // Lifecycle status
      if (s.status === "Released") {
        completedCount++;
      } else if (s.status === "With Issue") {
        withIssueCount++;
      } else {
        inProgressCount++;
      }
    });

    return {
      healthCount,
      funeralCount,
      otherCount,
      hospitalSOAs,
      funeralSOAs,
      laboratorySOAs,
      inProgressCount,
      withIssueCount,
      completedCount,
      totalCount: soas.length
    };
  }, [soas, categorizedData]);

  // Helper for roadmap step information
  const getStepStatus = (stepIndex: number, currentStep: number, hasIssue: boolean) => {
    if (hasIssue && currentStep === stepIndex) {
      return { status: "issue", label: "HALTED & RETURNED", color: "text-amber-600 bg-amber-50 border-amber-200/80" };
    }
    if (currentStep > stepIndex) {
      return { status: "completed", label: "COMPLETED & COMMITTED", color: "text-emerald-600 bg-emerald-50 border-emerald-200/80" };
    }
    if (currentStep === stepIndex) {
      return { status: "active", label: "CURRENT PIPELINE", color: "text-blue-600 bg-blue-50 border-blue-200/80 animate-pulse" };
    }
    return { status: "pending", label: "QUEUED STAGE", color: "text-slate-400 bg-slate-50 border-slate-100" };
  };

  // Human readable format step names
  const stepsDefinition = [
    {
      index: 1,
      title: "Receiving",
      desc: "Receipt of incoming Statement of Account from representative with batch verification.",
      badge: "LOGGED",
      icon: FolderOpen,
      getLog: (soa: SOADoc) => ({
        date: soa.dateReceived,
        notes: "Intake registered in database tracking list.",
        badge: "Submission Confirmed"
      })
    },
    {
      index: 2,
      title: "Verification",
      desc: "Double checks authenticity, dates, total amounts, and signatures index.",
      badge: "VERIFIED",
      icon: ShieldCheck,
      getLog: (soa: SOADoc) => ({
        date: soa.verificationDate || soa.updatedAt,
        notes: soa.verificationDate 
          ? (soa.verificationNotes || "Verification stage completed without complaints.") 
          : "Documents queueing for intake verify step.",
        badge: soa.hasIssue ? "Returned for Correction" : "Passed Verification"
      })
    },
    {
      index: 3,
      title: "Sorting",
      desc: "Sorting of documents to their respective municipal basket index.",
      badge: "SORTED",
      icon: Compass,
      getLog: (soa: SOADoc) => ({
        date: soa.sortationDate || soa.createdAt,
        notes: soa.sortationNotes || "Assigned appropriate filing identifier folder.",
        badge: "Routing Finished"
      })
    },
    {
      index: 4,
      title: "Checklist",
      desc: "Performs strict audits of required attachments including Letter request, Accomplishment Reports, and ID photocopies.",
      badge: "AUDITED",
      icon: CheckCircle2,
      getLog: (soa: SOADoc) => {
        const counts = soa.checklist ? Object.values(soa.checklist).filter(Boolean).length : 0;
        return {
          date: soa.checklistDate || soa.updatedAt,
          notes: soa.checklistNotes || `Attachment status: verified ${counts}/7 verified checklists.`,
          badge: counts === 7 ? "Auditing Passed" : "Checklist Open"
        };
      }
    },
    {
      index: 5,
      title: "Accounting",
      desc: "Approved sheets moved to CSWDO Accounting team for invoice processing.",
      badge: "ACCOUNTED",
      icon: FileText,
      getLog: (soa: SOADoc) => ({
        date: soa.processingDate || soa.updatedAt,
        notes: soa.processingNotes || "Approved voucher compiled into accounting processing.",
        badge: "Accounting Clearance"
      })
    },
    {
      index: 6,
      title: "Release",
      desc: "Statement is cleared, finalized, and processed towards Release & Treasury payout.",
      badge: "RELEASED",
      icon: Sparkles,
      getLog: (soa: SOADoc) => ({
        date: soa.manualStatusDate || soa.updatedAt,
        notes: soa.manualStatusNotes || "Document logged fully dispensed to designated stakeholder.",
        badge: "Released & Signed"
      })
    }
  ];

  const [showAllGlobal, setShowAllGlobal] = useState(false);
  const [expandedBatchIds, setExpandedBatchIds] = useState<string[]>([]);

  const toggleBatchExpansion = (id: string) => {
    setExpandedBatchIds(prev => 
      prev.includes(id) ? [] : [id]
    );
  };

  const renderRoadmapStepper = (doc: SOADoc, isCompact: boolean = false) => {
    const isIssue = doc.status === "With Issue";
    const overdue = isOverdue(doc);
    const progressPct = Math.min(100, Math.max(0, ((doc.currentStep - 1) / 5) * 85));

    return (
      <div className={`relative pt-2 pb-1 select-none overflow-x-auto hide-scrollbar ${isCompact ? "px-0" : "px-0"}`}>
        <div className={`${isCompact ? "min-w-[400px] sm:min-w-[500px]" : "min-w-[600px] lg:min-w-full"} flex items-start justify-between relative px-4`}>
          {/* Back Line */}
          <div className={`absolute ${isCompact ? "top-4" : "top-5 sm:top-6"} left-10 right-10 ${isCompact ? "h-0.5 sm:h-1" : "h-1 sm:h-1.5"} bg-slate-100 rounded-full -z-10`} />
          
          {/* Progress Line */}
          <div 
            className={`absolute ${isCompact ? "top-4" : "top-5 sm:top-6"} left-10 ${isCompact ? "h-0.5 sm:h-1" : "h-1 sm:h-1.5"} bg-emerald-500 rounded-full transition-all duration-1000 -z-0 shadow-[0_0_10px_rgba(16,185,129,0.3)]`} 
            style={{ width: `${progressPct}%` }}
          />

          {stepsDefinition.map((step) => {
            const metric = getStepStatus(step.index, doc.currentStep, isIssue);
            const StepIcon = step.icon;
            
            return (
              <div key={step.index} className={`flex flex-col items-center relative z-10 ${isCompact ? "w-16 sm:w-20" : "w-20 sm:w-28"} gap-2 sm:gap-3 text-center group/step`}>
                {/* Step Circle */}
                <div className={`${isCompact ? "h-7 w-7 sm:h-9 sm:w-9 border-2" : "h-10 w-10 sm:h-12 sm:w-12 border-[3px] sm:border-[4px]"} rounded-full flex items-center justify-center transition-all duration-500 shadow-sm ${
                  metric.status === 'completed' ? "bg-emerald-500 border-white text-white shadow-emerald-500/30 scale-105" :
                  metric.status === 'active' ? (overdue ? "bg-rose-600 border-white text-white shadow-rose-500/50 animate-pulse scale-110" : "bg-blue-600 border-white text-white shadow-blue-500/30 animate-pulse scale-105") :
                  metric.status === 'issue' ? "bg-rose-500 border-white text-white shadow-rose-500/30 scale-105" :
                  "bg-white border-slate-200 text-slate-300"
                }`}>
                  {overdue && metric.status === 'active' ? <AlertCircle className={`${isCompact ? "h-3 w-3 sm:h-4 sm:w-4" : "h-5 w-5 sm:h-6 sm:w-6"}`} /> :
                   metric.status === 'completed' ? <CheckCircle2 className={`${isCompact ? "h-3 w-3 sm:h-4 sm:w-4" : "h-5 w-5 sm:h-6 sm:w-6"}`} /> : 
                   metric.status === 'issue' ? <AlertTriangle className={`${isCompact ? "h-3 w-3 sm:h-4 sm:w-4" : "h-5 w-5 sm:h-6 sm:w-6"}`} /> :
                   <StepIcon className={`${isCompact ? "h-3 w-3 sm:h-4 sm:w-4" : "h-4 w-4 sm:h-5 sm:w-5"}`} />}
                </div>
                
                {/* Labeling Container */}
                <div className="flex flex-col items-center">
                  <span className={`${isCompact ? "text-[8px]" : "text-[10px]"} font-black uppercase tracking-widest ${
                    metric.status === 'completed' ? "text-emerald-600" :
                    metric.status === 'active' ? (overdue ? "text-rose-600" : "text-blue-600") :
                    metric.status === 'issue' ? "text-rose-600" : "text-slate-400"
                  }`}>
                    {step.title}
                  </span>
                  <span className={`${isCompact ? "text-[7px]" : "text-[8px]"} font-bold uppercase tracking-widest mt-1 ${
                    metric.status === 'completed' ? "text-emerald-500/70" :
                    metric.status === 'active' ? (overdue ? "text-rose-500/70" : "text-blue-500/70") :
                    metric.status === 'issue' ? "text-rose-500/70" : "text-slate-300"
                  }`}>
                    {metric.status === 'completed' ? "Completed" : metric.status === 'active' ? (overdue ? "OVERDUE" : "In Progress") : metric.status === 'issue' ? "Halted" : "Pending"}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  const renderDocRoadmap = (doc: SOADoc, options: { hideHeader?: boolean; hideRoadmap?: boolean; hideLogHeader?: boolean } = {}) => {
    const isComplete = doc.status === "Released";
    const isIssue = doc.status === "With Issue";
    const overdue = isOverdue(doc);
    
    return (
      <div className={`space-y-6 py-2 ${options.hideHeader && options.hideRoadmap ? "mt-0" : "space-y-10"}`}>
        {/* Trace Header Info */}
        {!options.hideHeader && (
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-8">
             <div className="space-y-1.5">
               <span className={`text-[10px] font-black uppercase tracking-widest flex items-center gap-1 ${overdue ? "text-rose-600" : "text-blue-600"}`}>
                 <span className={`h-1.5 w-1.5 rounded-full animate-ping ${overdue ? "bg-rose-500" : "bg-blue-500"}`} />
                 {overdue ? `Strategic SLA Breach Alert (${getOverdueDays(doc)} Days Delayed)` : "Trace Routing Coordinates"}
               </span>
               <h3 className="text-base font-black text-slate-800 uppercase tracking-widest flex items-center gap-2">
                  Roadmap: STAKEHOLDER {doc.stakeholderName}
                  {overdue && <AlertCircle className="h-4 w-4 text-rose-500 animate-bounce" />}
               </h3>
               <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-slate-500 font-bold select-none mt-1">
                  <span className="flex items-center gap-1">
                     <Calendar className="h-3.5 w-3.5 text-slate-400" /> Received: {doc.dateReceived}
                  </span>
                  <span className="h-1 w-1 bg-slate-300 rounded-full" />
                  <span>Batch Identifier: <strong className="text-slate-800">{doc.batchNumber}</strong></span>
                  <span className="h-1 w-1 bg-slate-300 rounded-full" />
                  <span className="text-blue-600 font-extrabold uppercase">Amount: ₱{doc.totalAmount.toLocaleString("en-US", { minimumFractionDigits: 2 })}</span>
               </div>
             </div>
             
             <div className="shrink-0">
                <span className={`inline-flex items-center gap-2 px-4 py-1.5 rounded-2xl text-[10px] tracking-widest font-black uppercase border-2 transition-all hover:scale-105 ${
                  isIssue ? "bg-rose-50 border-rose-200 text-rose-600" :
                  isComplete ? "bg-emerald-50 border-emerald-200 text-emerald-600" :
                  "bg-blue-50 border-blue-200 text-blue-600"
                }`}>
                  {isIssue ? <AlertTriangle className="h-3.5 w-3.5" /> : isComplete ? <CheckCircle2 className="h-3.5 w-3.5" /> : <Activity className="h-3.5 w-3.5 animate-pulse" />}
                  {isComplete ? "Released" : isIssue ? "Halted" : "Verified"}
                </span>
             </div>
          </div>
        )}

        {/* Visual Roadmap Stepper */}
        {!options.hideRoadmap && renderRoadmapStepper(doc)}

        {/* Status Chronology Logs */}
        {doc.statusHistory && doc.statusHistory.length > 0 && (
          <div className={`${!options.hideLogHeader ? "border-t border-slate-100 pt-10" : ""} space-y-5`}>
            {!options.hideLogHeader && (
              <h4 className="text-[11px] font-black text-slate-800 uppercase tracking-widest flex items-center gap-2">
                <RefreshCw className="h-4 w-4 text-slate-400 animate-spin-slow" />
                Status Disposition Chronology Log
              </h4>
            )}
            <div className="grid grid-cols-1 gap-3 max-h-72 overflow-y-auto pr-2 custom-scrollbar">
              {doc.statusHistory.slice().reverse().map(h => (
                <div key={h.id} className="bg-slate-50/50 border border-slate-100 p-4 rounded-2xl flex items-start gap-4 hover:bg-slate-50 transition-colors">
                  <div className="h-6 w-6 bg-slate-200 text-slate-500 rounded-full flex items-center justify-center font-bold text-[10px] shrink-0 mt-0.5">H</div>
                  <div className="flex-grow">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-1.5">
                      <span className="font-black text-slate-900 uppercase text-[10px] tracking-widest">STEP {doc.statusHistory.indexOf(h) + 1}: {h.stage} ➔ {h.status}</span>
                      <span className="text-[9px] font-bold text-slate-400 uppercase font-mono">
                        {new Date(h.updatedAt).toLocaleDateString()} {new Date(h.updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    <p className="text-slate-500 text-[11px] font-bold leading-relaxed">{h.notes || "No additional audit notes provided."}</p>
                    <span className="text-[9px] text-blue-500 font-black uppercase mt-2 block">PROCESSED BY: {h.updatedBy}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-8 select-none">
      
      {/* Visual Top Headline */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 bg-gradient-to-tr from-slate-900 via-slate-950 to-slate-900 rounded-3xl p-5 sm:p-8 text-white relative overflow-hidden shadow-2xl border border-slate-800/80">
        <div className="absolute top-0 right-0 w-80 h-80 bg-blue-500/10 rounded-full blur-3xl pointer-events-none select-none" />
        <div className="relative z-10 space-y-3 w-full lg:max-w-2xl">
          <div className="inline-flex items-center gap-2 bg-blue-500/20 border border-blue-500/25 px-3 py-1 rounded-full text-[9px] sm:text-[10px] uppercase font-black tracking-widest text-blue-400">
            <Workflow className="h-3 sm:h-3.5 w-3 sm:h-3.5 animate-spin-slow" />
            Tactical Monitoring
          </div>
          <h2 className="text-lg sm:text-2xl font-black uppercase tracking-tight text-white leading-tight">
            SOA TRACKING PIPELINE
          </h2>
          
          {/* Stakeholder Selector */}
          <div className="relative mt-2">
              <select 
                className="bg-slate-950/80 backdrop-blur-md border border-slate-700 text-white text-[11px] sm:text-xs font-bold p-3 rounded-xl w-full sm:w-80 cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-xl"
                value={selectedStakeholderName || ""}
                onChange={(e) => {
                    const name = e.target.value;
                    if (name) {
                        setSelectedStakeholderName(name);
                        setSelectedViewType("stakeholder");
                    } else {
                        setSelectedStakeholderName(null);
                        setSelectedViewType("batch");
                    }
                }}
              >
                  <option value="" className="bg-slate-900 text-white">SELECT STAKEHOLDER PARTNER...</option>
                  
                  {groupedStakeholders.hospitals.length > 0 && (
                    <optgroup label="HOSPITALS & HEALTH FACILITIES" className="bg-slate-900 text-blue-400 font-bold uppercase text-[10px]">
                      {groupedStakeholders.hospitals.map(st => (
                        <option key={st.name} value={st.name} className="bg-slate-900 text-white font-normal text-xs">{st.name}</option>
                      ))}
                    </optgroup>
                  )}

                  {groupedStakeholders.funerals.length > 0 && (
                    <optgroup label="FUNERAL SERVICES" className="bg-slate-900 text-emerald-400 font-bold uppercase text-[10px]">
                      {groupedStakeholders.funerals.map(st => (
                        <option key={st.name} value={st.name} className="bg-slate-900 text-white font-normal text-xs">{st.name}</option>
                      ))}
                    </optgroup>
                  )}

                  {groupedStakeholders.laboratories.length > 0 && (
                    <optgroup label="LABORATORIES & DIAGNOSTICS" className="bg-slate-900 text-amber-400 font-bold uppercase text-[10px]">
                      {groupedStakeholders.laboratories.map(st => (
                        <option key={st.name} value={st.name} className="bg-slate-900 text-white font-normal text-xs">{st.name}</option>
                      ))}
                    </optgroup>
                  )}

                  {groupedStakeholders.others.length > 0 && (
                    <optgroup label="OTHER CATEGORIES" className="bg-slate-900 text-slate-400 font-bold uppercase text-[10px]">
                      {groupedStakeholders.others.map(st => (
                        <option key={st.name} value={st.name} className="bg-slate-900 text-white font-normal text-xs">{st.name}</option>
                      ))}
                    </optgroup>
                  )}
              </select>
          </div>
        </div>

        {/* Dynamic visual numbers */}
        <div className="grid grid-cols-3 gap-2 sm:gap-3 shrink-0">
          {(!currentUser || currentUser.role === "System Administrator" || currentUser.role === "Admin" || currentUser.category === "Hospital") && (
            <div className="bg-white/5 border border-white/10 rounded-xl sm:rounded-2xl p-3 sm:p-4 text-center select-none">
              <span className="block text-[8px] sm:text-[10px] text-slate-400 uppercase font-black tracking-widest">Hospital</span>
              <span className="block text-base sm:text-2xl font-black text-rose-400 mt-1">{stats.hospitalSOAs}</span>
            </div>
          )}
          {(!currentUser || currentUser.role === "System Administrator" || currentUser.role === "Admin" || currentUser.category === "Laboratory") && (
            <div className="bg-white/5 border border-white/10 rounded-xl sm:rounded-2xl p-3 sm:p-4 text-center select-none">
              <span className="block text-[8px] sm:text-[10px] text-slate-400 uppercase font-black tracking-widest">Laboratory</span>
              <span className="block text-base sm:text-2xl font-black text-blue-400 mt-1">{stats.laboratorySOAs}</span>
            </div>
          )}
          {(!currentUser || currentUser.role === "System Administrator" || currentUser.role === "Admin" || currentUser.category === "Funeral") && (
            <div className="bg-white/5 border border-white/10 rounded-xl sm:rounded-2xl p-3 sm:p-4 text-center select-none">
              <span className="block text-[8px] sm:text-[10px] text-slate-400 uppercase font-black tracking-widest">Funeral</span>
              <span className="block text-base sm:text-2xl font-black text-amber-400 mt-1">{stats.funeralSOAs}</span>
            </div>
          )}
        </div>
      </div>

      {/* Main Grid: Real-time Roadmap Tracking */}
      <div className="grid grid-cols-1 gap-8 items-start">
        
        {/* Visual Roadmap Tracking (Full Width) */}
        <div className="col-span-1 border border-slate-100 rounded-3xl p-6 sm:p-8 shadow-sm space-y-8 bg-white">
            
            {selectedViewType === "stakeholder" && selectedStakeholderGroup ? (
              <>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-6 shrink-0">
                  <div className="space-y-1.5">
                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-1">
                      <Layers className="h-3.5 w-3.5 text-slate-400" />
                      Stakeholder Summary
                    </span>
                    <h3 className="text-xl font-black text-slate-800 uppercase tracking-widest">
                      {selectedStakeholderGroup.name}
                    </h3>
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500 font-semibold select-none mt-1">
                      <span className="flex items-center gap-1">
                        <FolderOpen className="h-3.5 w-3.5 text-slate-400" /> {selectedStakeholderGroup.docCount} Total Batches
                      </span>
                      <span className="h-1 w-1 bg-slate-300 rounded-full" />
                      <span className="text-blue-600 font-extrabold text-sm">Total: ₱{selectedStakeholderGroup.amount.toLocaleString("en-US", { minimumFractionDigits: 2 })}</span>
                    </div>
                  </div>
                </div>

                <div className="pt-2">
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="text-sm font-black text-slate-800 uppercase tracking-widest">Tracking History & Archives</h4>
                  </div>
                  <div className="space-y-3 max-h-[600px] overflow-y-auto pr-2 custom-scrollbar">
                    {selectedStakeholderGroup.allDocs
                      .sort((a,b) => b.batchNumber - a.batchNumber)
                      .map((doc) => {
                      const isComplete = doc.status === "Released";
                      const isIssue = doc.status === "With Issue";
                      const progressPct = Math.min(100, Math.max(0, ((doc.currentStep - 1) / 5) * 100));
                      const isExpanded = expandedBatchIds.includes(doc.id);
                      const overdue = isOverdue(doc);
                      
                      return (
                        <div 
                          key={doc.id} 
                          className={`rounded-2xl border transition-all duration-300 ${
                            isExpanded 
                              ? 'border-blue-500 bg-white shadow-sm ring-4 ring-blue-50' 
                              : overdue 
                                ? 'border-rose-200 bg-rose-50/70 animate-pulse'
                                : 'border-slate-100 bg-slate-50/50 hover:border-slate-200'
                          }`}
                        >
                          <div 
                            className="p-4 cursor-pointer group"
                            onClick={() => toggleBatchExpansion(doc.id)}
                          >
                            <div className="flex items-center justify-between mb-4">
                              <div className="flex items-center gap-4">
                                <span className={`text-sm font-black uppercase tracking-wider ${overdue ? "text-rose-600" : "text-slate-900"}`}>
                                  BATCH {doc.batchNumber}
                                  {overdue && ` (SLA BREACH: ${getOverdueDays(doc)}d DELAY)`}
                                </span>
                                <span className="text-xs font-black text-blue-600">₱{doc.totalAmount.toLocaleString("en-US", { minimumFractionDigits: 2 })}</span>
                              </div>
                              <div className="flex items-center gap-3">
                                <span className={`inline-flex items-center px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-widest border transition-colors ${
                                  isComplete ? "bg-emerald-100 text-emerald-700 border-emerald-200" :
                                  isIssue ? "bg-rose-100 text-rose-700 border-rose-200" :
                                  "bg-blue-100 text-blue-700 border-blue-200"
                                }`}>
                                  {doc.status}
                                </span>
                                <div className="bg-white border border-slate-100 rounded-lg p-1 group-hover:border-blue-200 transition-colors">
                                  {isExpanded ? (
                                    <Minus className="h-3 w-3 text-slate-400" />
                                  ) : (
                                    <Plus className="h-3 w-3 text-slate-400" />
                                  )}
                                </div>
                              </div>
                            </div>

                            {/* COMPACT TACTICAL ROADMAP */}
                            <div className="bg-white/50 border border-slate-100/50 rounded-2xl p-3 pt-4">
                               {renderRoadmapStepper(doc, true)}
                            </div>
                          </div>

                          <AnimatePresence>
                            {isExpanded && (
                              <motion.div
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: "auto", opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                className="overflow-hidden"
                              >
                                <div className="pt-4 space-y-4">
                                  {renderDocRoadmap(doc, { hideHeader: true, hideRoadmap: true, hideLogHeader: true })}
                                  
                                  <button 
                                    onClick={() => {
                                      setSelectedSOAId(doc.id);
                                      setSelectedViewType("batch");
                                    }}
                                    className="w-full py-2 bg-blue-50 text-blue-600 rounded-xl text-[9px] font-black uppercase tracking-widest hover:bg-blue-100 transition-colors flex items-center justify-center gap-2"
                                  >
                                    View Detailed Tactical Trace
                                    <ArrowRight className="h-3 w-3" />
                                  </button>
                                </div>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </>
            ) : selectedViewType === "batch" && selectedSOA ? (
              <>
                {renderDocRoadmap(selectedSOA)}
              </>
            ) : (
              <div className="space-y-8">
                {/* Global Active Missions Feed */}
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <h4 className="text-sm font-black text-slate-800 uppercase tracking-widest flex items-center gap-2">
                       <Activity className="h-4 w-4 text-emerald-500 animate-pulse" />
                       Live Tactical Tracking Feed
                    </h4>
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Real-time status movement across all municipal partners</p>
                  </div>
                  <div className="bg-slate-50 border border-slate-100 rounded-xl px-3 py-1.5 flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-emerald-500 animate-ping" />
                    <span className="text-[10px] font-black text-slate-600 tracking-wider font-mono uppercase">{stats.inProgressCount} Assets in Transit</span>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {soas
                    .sort((a,b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
                    .slice(0, showAllGlobal ? undefined : 3)
                    .map((doc) => {
                    const isIssue = doc.status === "With Issue";
                    const overdue = isOverdue(doc);
                    const progressPct = Math.min(100, Math.max(0, ((doc.currentStep - 1) / 5) * 100));
                    
                    return (
                      <motion.div 
                        key={doc.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className={`border rounded-3xl p-5 space-y-4 hover:shadow-md transition-all cursor-pointer group ${
                          overdue ? "bg-rose-50 border-rose-200 animate-pulse" : "bg-slate-50 border-slate-100 hover:border-blue-200"
                        }`}
                        onClick={() => {
                          setSelectedSOAId(doc.id);
                          setSelectedViewType("batch");
                        }}
                      >
                        <div className="flex justify-between items-start">
                          <div className="flex items-center gap-2.5">
                            {renderCategoryMiniIcon(doc.stakeholderCategory)}
                            <div className="space-y-0.5">
                              <h5 className="text-[11px] font-black uppercase text-slate-900 tracking-tight group-hover:text-blue-600 transition-colors">
                                {doc.stakeholderName}
                                {overdue && (
                                  <span className="ml-1.5 text-[8.5px] text-rose-600 font-extrabold uppercase">
                                    ({getOverdueDays(doc)}d overdue)
                                  </span>
                                )}
                              </h5>
                              <p className="text-[10px] text-slate-500 font-bold font-mono">BATCH: {doc.batchNumber}</p>
                            </div>
                          </div>
                          <span className={`px-2 py-0.5 rounded-md text-[8px] font-black uppercase tracking-widest shrink-0 ${
                             isIssue ? "bg-rose-100 text-rose-700" : "bg-blue-100 text-blue-700"
                          }`}>
                            {doc.status}
                          </span>
                        </div>
                        
                        <div className="flex justify-between items-center pt-2 border-t border-slate-100/50">
                           <div className="flex flex-col">
                             <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Pipeline Coordination</span>
                             <span className="text-[10px] font-extrabold text-blue-600 block mt-0.5">{getStepStatus(doc.currentStep, doc.currentStep, doc.status === "With Issue").label}</span>
                           </div>
                           <ArrowRight className="h-3.5 w-3.5 text-slate-300 group-hover:text-blue-500 group-hover:translate-x-1 transition-all" />
                        </div>
                      </motion.div>
                    );
                  })}
                </div>

                {soas.length > 3 && (
                  <button 
                    onClick={() => setShowAllGlobal(!showAllGlobal)}
                    className="w-full py-4 border border-dashed border-slate-200 rounded-3xl text-[10px] font-black uppercase tracking-widest text-slate-400 hover:border-slate-300 hover:text-slate-600 transition-all bg-slate-50/30 flex items-center justify-center gap-2 cursor-pointer"
                  >
                    {showAllGlobal ? <ChevronDown className="h-3.5 w-3.5 rotate-180 transition-transform" /> : <Plus className="h-3.5 w-3.5" />}
                    {showAllGlobal ? "Minimize archives" : `Expand to view ${soas.length - 3} more statements`}
                  </button>
                )}

                {soas.filter(s => s.status !== "Released").length === 0 && (
                  <div className="text-center py-20 bg-slate-50/50 rounded-3xl border border-dashed border-slate-200">
                    <Compass className="h-12 w-12 text-slate-350 mx-auto stroke-1 animate-pulse" />
                    <h4 className="text-sm font-bold text-slate-500 uppercase tracking-wider mt-4">No Active Tracking Assets Found</h4>
                    <p className="text-xs text-slate-400 max-w-sm mx-auto mt-2 leading-relaxed">
                      All Statement of Accounts are currently at rest. When fresh documentation is registered, it will appear here for live movement monitoring.
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

    </div>
  );
}
