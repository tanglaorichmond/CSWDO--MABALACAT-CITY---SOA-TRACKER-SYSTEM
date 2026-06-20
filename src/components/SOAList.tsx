import React, { useState, useMemo } from "react";
import { SOADoc, SOAStatus, UserProfile, SLASettings, DEFAULT_SLA_SETTINGS } from "../types";
import { 
  Search, 
  Plus, 
  Trash2, 
  Layers, 
  Info, 
  AlertCircle, 
  RotateCcw,
  Check,
  Calendar,
  Sparkles,
  ArrowUpDown,
  ChevronDown,
  ChevronUp,
  LayoutGrid,
  List,
  Building2
} from "lucide-react";
import ConfirmationModal from "./ConfirmationModal";

interface SOAListProps {
  soas: SOADoc[];
  onSelectSOA: (soa: SOADoc) => void;
  onOpenNewSOAModal: () => void;
  onDeleteSOA: (id: string) => void;
  currentUser: UserProfile;
  initialStatusFilter?: string;
  showToast: (message: string, type?: "success" | "error" | "info" | "warning") => void;
  slaSettings: SLASettings | null;
}

export default function SOAList({
  soas,
  onSelectSOA,
  onOpenNewSOAModal,
  onDeleteSOA,
  currentUser,
  initialStatusFilter = "",
  showToast,
  slaSettings
}: SOAListProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState(initialStatusFilter);
  const [categoryFilter, setCategoryFilter] = useState<string>("");
  const [sortBy, setSortBy] = useState<"date" | "amount" | "name">("date");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  
  // Segmented control: by default grouped by stakeholder
  const [viewMode, setViewMode] = useState<"flat" | "grouped">("grouped");

  // Dynamic category counts
  const categoryCounts = useMemo(() => {
    const counts = {
      all: soas.length,
      hospital: 0,
      laboratories: 0,
      funeral: 0,
    };
    soas.forEach((s) => {
      const cat = s.stakeholderCategory;
      if (cat === "hospital") counts.hospital++;
      else if (cat === "laboratories") counts.laboratories++;
      else if (cat === "funeral") counts.funeral++;
    });
    return counts;
  }, [soas]);

  // Expanded accordion sections state (mapped lowercase name -> boolean)
  const [expandedStakeholders, setExpandedStakeholders] = useState<Record<string, boolean>>({});

  // State for customized confirmation dialog
  const [deleteConfirmation, setDeleteConfirmation] = useState<{
    isOpen: boolean;
    soaId: string;
    soaName: string;
  }>({
    isOpen: false,
    soaId: "",
    soaName: ""
  });

  const isOverdue = (doc: SOADoc) => {
    if (doc.status === "Released") return false;
    
    const stepKeys: { [key: number]: keyof SLASettings } = {
      1: 'receiving', 2: 'verification', 3: 'sorting', 
      4: 'checklist', 5: 'accounting', 6: 'release'
    };

    const settings = slaSettings || DEFAULT_SLA_SETTINGS;
    const targetDays = settings[stepKeys[doc.currentStep]] as number;
    if (!targetDays) return false;

    const lastUpdate = new Date(doc.updatedAt).getTime();
    const diffDays = (Date.now() - lastUpdate) / (1000 * 60 * 60 * 24);
    return diffDays > targetDays;
  };

  // Format currency
  const formatPHP = (val: number) => {
    return new Intl.NumberFormat("en-PH", {
      style: "currency",
      currency: "PHP"
    }).format(val);
  };

  // Status badges colors
  const getStatusBadgeStyle = (status: SOAStatus) => {
    switch (status) {
      case "Submitted":
        return "bg-sky-50 text-sky-700 border-sky-200";
      case "With Issue":
        return "bg-rose-50 text-rose-700 border-rose-200 animate-pulse";
      case "Verified":
        return "bg-teal-50 text-teal-700 border-teal-200";
      case "Sorted":
        return "bg-cyan-50 text-cyan-700 border-cyan-200";
      case "Checklist Completed":
        return "bg-amber-50 text-amber-700 border-amber-200";
      case "Processing to Accounting":
        return "bg-indigo-50 text-indigo-700 border-indigo-200";
      case "Forwarded to Accounting":
        return "bg-blue-50 text-blue-700 border-blue-200";
      case "Forwarded to Treasury":
        return "bg-violet-50 text-violet-700 border-violet-200";
      case "For Releasing":
        return "bg-fuchsia-50 text-fuchsia-800 border-fuchsia-200";
      case "Released":
        return "bg-emerald-50 text-emerald-700 border-emerald-200";
      default:
        return "bg-slate-50 text-slate-700 border-slate-200";
    }
  };

  // Get current step name
  const getStepLabel = (step: number) => {
    switch (step) {
      case 1: return "Intake Logging";
      case 2: return "Verification Check";
      case 3: return "Docket Sortation";
      case 4: return "Checklist Auditing";
      case 5: return "Proc. to Accounting";
      case 6: return "Finance releasing pipeline";
      default: return `Step ${step}`;
    }
  };

  // Handle delete click with customized safety check
  const handleDelete = (id: string, stakeholderName: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setDeleteConfirmation({
      isOpen: true,
      soaId: id,
      soaName: stakeholderName
    });
  };

  // Filter SOAs based on user inputs
  const filteredSOAs = useMemo(() => {
    return soas
      .filter((soa) => {
        const matchSearch =
          soa.stakeholderName.toLowerCase().includes(searchTerm.toLowerCase()) ||
          soa.batchNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
          (soa.createdBy?.displayName || "").toLowerCase().includes(searchTerm.toLowerCase());
        
        const matchStatus = statusFilter === "" || soa.status === statusFilter;
        
        const matchCategory = categoryFilter === "" || soa.stakeholderCategory === categoryFilter;
        
        return matchSearch && matchStatus && matchCategory;
      })
      .sort((a, b) => {
        let comparison = 0;
        if (sortBy === "date") {
          comparison = new Date(a.dateReceived).getTime() - new Date(b.dateReceived).getTime();
        } else if (sortBy === "amount") {
          comparison = a.totalAmount - b.totalAmount;
        } else if (sortBy === "name") {
          comparison = a.stakeholderName.localeCompare(b.stakeholderName);
        }
        return sortOrder === "asc" ? comparison : -comparison;
      });
  }, [soas, searchTerm, statusFilter, categoryFilter, sortBy, sortOrder]);

  // Group filtered SOAs by Stakeholders
  const stakeholderGroups = useMemo(() => {
    const groupsMap: Record<string, { name: string; soas: SOADoc[]; totalAmount: number }> = {};
    
    filteredSOAs.forEach((soa) => {
      const key = soa.stakeholderName.trim().toLowerCase();
      if (!groupsMap[key]) {
        groupsMap[key] = {
          name: soa.stakeholderName.trim(),
          soas: [],
          totalAmount: 0
        };
      }
      groupsMap[key].soas.push(soa);
      groupsMap[key].totalAmount += soa.totalAmount;
    });

    const groupsArray = Object.values(groupsMap);

    // Sort the groups
    return groupsArray.sort((a, b) => {
      if (sortBy === "name") {
        return sortOrder === "asc" ? a.name.localeCompare(b.name) : b.name.localeCompare(a.name);
      } else if (sortBy === "amount") {
        return sortOrder === "asc" ? a.totalAmount - b.totalAmount : b.totalAmount - a.totalAmount;
      } else {
        // Default group order: date (by newest/oldest item in group)
        const timeA = Math.max(...a.soas.map(s => new Date(s.dateReceived || 0).getTime()));
        const timeB = Math.max(...b.soas.map(s => new Date(s.dateReceived || 0).getTime()));
        return sortOrder === "asc" ? timeA - timeB : timeB - timeA;
      }
    });
  }, [filteredSOAs, sortBy, sortOrder]);

  // Bulk toggles
  const handleBulkExpand = (expand: boolean) => {
    const updated: Record<string, boolean> = {};
    if (expand) {
      stakeholderGroups.forEach((group) => {
        updated[group.name.toLowerCase()] = true;
      });
    }
    setExpandedStakeholders(updated);
  };

  const toggleSort = (type: "date" | "amount" | "name") => {
    if (sortBy === type) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortBy(type);
      setSortOrder("desc");
    }
  };

  return (
    <div className="bg-white rounded-3xl border border-slate-100 shadow-md p-6 sm:p-8 animate-fade-in space-y-6 select-none">
      
      {/* Header Panel with Quick Search / Creation controls */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-6 border-b border-slate-100">
        <div>
          <h3 className="text-lg sm:text-xl font-extrabold text-slate-900 flex items-center space-x-2">
            <Layers className="h-5 w-5 text-blue-600" />
            <span>SOA Tracking Movements</span>
          </h3>
          <p className="text-[10px] sm:text-xs text-slate-500 mt-1 uppercase font-bold tracking-wider">
            Showing {filteredSOAs.length} statement files of {soas.length} absolute entries.
          </p>
        </div>

        {/* View toggles & Creation button block */}
        <div className="flex flex-wrap items-center gap-3">
          {/* View mode segmented picker */}
          <div className="flex items-center bg-slate-100 p-1 rounded-xl text-xs font-semibold">
            <button
              type="button"
              onClick={() => setViewMode("grouped")}
              className={`px-3.5 py-1.5 rounded-lg flex items-center gap-1.5 transition-all cursor-pointer ${
                viewMode === "grouped"
                  ? "bg-white text-slate-950 shadow-sm"
                  : "text-slate-500 hover:text-slate-800"
              }`}
            >
              <LayoutGrid className="h-3.5 w-3.5" />
              <span>By Stakeholder</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode("flat")}
              className={`px-3.5 py-1.5 rounded-lg flex items-center gap-1.5 transition-all cursor-pointer ${
                viewMode === "flat"
                  ? "bg-white text-slate-950 shadow-sm"
                  : "text-slate-500 hover:text-slate-800"
              }`}
            >
              <List className="h-3.5 w-3.5" />
              <span>Flat List</span>
            </button>
          </div>

          {/* Creation button for user and admins */}
          {currentUser.role !== "Guest" && currentUser.canEdit !== false && (
            <button
              type="button"
              onClick={onOpenNewSOAModal}
              className="flex items-center space-x-2 bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-xl font-semibold text-sm transition-all hover:scale-[1.02] active:scale-[0.98] shadow-md shadow-blue-500/10 cursor-pointer"
            >
              <Plus className="h-4 w-4" />
              <span>Log New Statement</span>
            </button>
          )}
        </div>
      </div>

      {/* Category Tabs view buttons */}
      <div className="flex flex-wrap gap-2 pb-1 border-b border-slate-100 select-none">
        <button
          type="button"
          onClick={() => setCategoryFilter("")}
          className={`px-4 py-2.5 rounded-2xl text-[10px] sm:text-xs font-black uppercase tracking-widest transition-all cursor-pointer flex items-center gap-2 border shadow-sm ${
            categoryFilter === ""
              ? "bg-slate-900 border-slate-900 text-white shadow-md shadow-slate-900/10"
              : "bg-slate-50 border-slate-200 text-slate-500 hover:text-slate-800 hover:bg-slate-100"
          }`}
        >
          <span>All Categories</span>
          <span className={`px-1.5 py-0.5 rounded-lg text-[9px] font-black ${
            categoryFilter === "" ? "bg-white/20 text-white" : "bg-slate-200 text-slate-700"
          }`}>
            {categoryCounts.all}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setCategoryFilter("hospital")}
          className={`px-4 py-2.5 rounded-2xl text-[10px] sm:text-xs font-black uppercase tracking-widest transition-all cursor-pointer flex items-center gap-2 border shadow-sm ${
            categoryFilter === "hospital"
              ? "bg-rose-600 border-rose-600 text-white shadow-md shadow-rose-600/10"
              : "bg-slate-50 border-slate-200 text-slate-500 hover:text-rose-600 hover:bg-rose-50"
          }`}
        >
          <span>🏥 Hospital</span>
          <span className={`px-1.5 py-0.5 rounded-lg text-[9px] font-black ${
            categoryFilter === "hospital" ? "bg-white/20 text-white" : "bg-slate-200 text-slate-700"
          }`}>
            {categoryCounts.hospital}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setCategoryFilter("laboratories")}
          className={`px-4 py-2.5 rounded-2xl text-[10px] sm:text-xs font-black uppercase tracking-widest transition-all cursor-pointer flex items-center gap-2 border shadow-sm ${
            categoryFilter === "laboratories"
              ? "bg-blue-600 border-blue-600 text-white shadow-md shadow-blue-600/10"
              : "bg-slate-50 border-slate-200 text-slate-500 hover:text-blue-600 hover:bg-blue-50"
          }`}
        >
          <span>🔬 Laboratory</span>
          <span className={`px-1.5 py-0.5 rounded-lg text-[9px] font-black ${
            categoryFilter === "laboratories" ? "bg-white/20 text-white" : "bg-slate-200 text-slate-700"
          }`}>
            {categoryCounts.laboratories}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setCategoryFilter("funeral")}
          className={`px-4 py-2.5 rounded-2xl text-[10px] sm:text-xs font-black uppercase tracking-widest transition-all cursor-pointer flex items-center gap-2 border shadow-sm ${
            categoryFilter === "funeral"
              ? "bg-amber-600 border-amber-600 text-white shadow-md shadow-amber-600/10"
              : "bg-slate-50 border-slate-200 text-slate-500 hover:text-amber-600 hover:bg-amber-50"
          }`}
        >
          <span>⚰️ Funeral</span>
          <span className={`px-1.5 py-0.5 rounded-lg text-[9px] font-black ${
            categoryFilter === "funeral" ? "bg-white/20 text-white" : "bg-slate-200 text-slate-700"
          }`}>
            {categoryCounts.funeral}
          </span>
        </button>
      </div>

      {/* Inputs Filters */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3.5 top-3.5 h-4.5 w-4.5 text-slate-400" />
          <input
            type="text"
            placeholder="Filter by Stakeholder, ID, Logger..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 w-full rounded-xl border border-slate-200 p-3 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 bg-slate-50/50 font-bold"
          />
        </div>

        {/* Status Filter Dropdown */}
        <div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="w-full rounded-xl border border-slate-200 p-3 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 bg-slate-50/50 font-bold"
          >
            <option value="">All Audit Pipeline Stages</option>
            <option value="Submitted">Step 1: Submitted / Intake</option>
            <option value="With Issue">Step 2: Tagged WITH ISSUE (Returned)</option>
            <option value="Verified">Step 2: Verified (Proceed to Sortation)</option>
            <option value="Sorted">Step 3: Document Sorted</option>
            <option value="Checklist Completed">Step 4: Checklist Completed</option>
            <option value="Processing to Accounting">Step 5: Processing to Accounting</option>
            <option value="Forwarded to Accounting">Step 6: Forwarded to Accounting</option>
            <option value="Forwarded to Treasury">Step 6: Forwarded to Treasury</option>
            <option value="For Releasing">Step 6: For Releasing</option>
            <option value="Released">Step 6: Fully Released</option>
          </select>
        </div>

        {/* Sorters Selection */}
        <div className="flex space-x-2">
          <button
            onClick={() => toggleSort("date")}
            className={`flex-1 flex items-center justify-center space-x-1 px-3 py-2 border rounded-xl text-xs font-semibold select-none transition-all cursor-pointer ${
              sortBy === "date" 
                ? "bg-slate-900 border-slate-900 text-white" 
                : "border-slate-200 text-slate-600 hover:bg-slate-50"
            }`}
          >
            <span>Date Received</span>
            <ArrowUpDown className="h-3 w-3" />
          </button>
          <button
            onClick={() => toggleSort("amount")}
            className={`flex-1 flex items-center justify-center space-x-1 px-3 py-2 border rounded-xl text-xs font-semibold select-none transition-all cursor-pointer ${
              sortBy === "amount" 
                ? "bg-slate-900 border-slate-900 text-white" 
                : "border-slate-200 text-slate-600 hover:bg-slate-50"
            }`}
          >
            <span>Amount</span>
            <ArrowUpDown className="h-3 w-3" />
          </button>
          <button
            onClick={() => toggleSort("name")}
            className={`flex-1 flex items-center justify-center space-x-1 px-3 py-2 border rounded-xl text-xs font-semibold select-none transition-all cursor-pointer ${
              sortBy === "name" 
                ? "bg-slate-900 border-slate-900 text-white" 
                : "border-slate-200 text-slate-600 hover:bg-slate-50"
            }`}
          >
            <span>Stakeholder</span>
            <ArrowUpDown className="h-3 w-3" />
          </button>
        </div>
      </div>

      {/* Bulk Collapsible triggers if view mode is grouped */}
      {viewMode === "grouped" && stakeholderGroups.length > 0 && (
        <div className="flex items-center justify-between text-xs font-bold text-slate-500 py-2.5 bg-slate-50/50 px-4 rounded-xl border border-dashed border-slate-200/60">
          <div className="flex items-center gap-1.5 text-blue-700">
            <Sparkles className="h-4 w-4" />
            <span>Organized into {stakeholderGroups.length} Active Stakeholders</span>
          </div>
          <div className="flex items-center gap-3">
            <button 
              type="button" 
              onClick={() => handleBulkExpand(true)}
              className="hover:text-blue-600 hover:underline transition-all text-[11px] cursor-pointer"
            >
              Expand All
            </button>
            <span className="text-slate-300">•</span>
            <button 
              type="button" 
              onClick={() => handleBulkExpand(false)}
              className="hover:text-amber-600 hover:underline transition-all text-[11px] cursor-pointer"
            >
              Collapse All
            </button>
          </div>
        </div>
      )}

      {/* Main Track Presentation Area */}
      <div>
        {filteredSOAs.length === 0 ? (
          <div className="text-center py-20 px-4 bg-slate-50/50 rounded-2xl border border-slate-100">
            <AlertCircle className="h-10 w-10 text-slate-300 mx-auto mb-3" />
            <p className="text-sm font-black text-slate-700 uppercase tracking-widest">No Statements of Account Found</p>
            <p className="text-xs text-slate-400 mt-2 font-bold max-w-xs mx-auto">Try adjusting your filters or record search term to find archived entries.</p>
          </div>
        ) : viewMode === "flat" ? (
          /* Flat Table Layout View (Full Columns) */
          <div className="space-y-4">
            {/* Desktop Table */}
            <div className="hidden lg:block overflow-x-auto rounded-2xl border border-slate-100 shadow-sm">
              <table className="min-w-full divide-y divide-slate-100 text-left text-sm">
                <thead className="bg-slate-50 text-[10px] text-slate-500 uppercase tracking-widest font-black">
                  <tr>
                    <th className="px-6 py-4">Received Date</th>
                    <th className="px-6 py-4">Stakeholder / Partner</th>
                    <th className="px-6 py-4">Batch ID</th>
                    <th className="px-6 py-4 text-right">Amount (PHP)</th>
                    <th className="px-6 py-4">Live Track Status</th>
                    <th className="px-6 py-4">Pipeline</th>
                    <th className="px-6 py-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {filteredSOAs.map((soa) => (
                    <tr
                      key={soa.id}
                      onClick={() => onSelectSOA(soa)}
                      className="hover:bg-blue-50/20 cursor-pointer group transition-all"
                    >
                      {/* Received Date */}
                      <td className="px-6 py-4.5 whitespace-nowrap">
                        <div className="flex items-center space-x-2 text-slate-900">
                          <Calendar className="h-4 w-4 text-slate-400" />
                          <span className="font-bold">{soa.dateReceived}</span>
                        </div>
                        {soa.dateResetCount > 0 && (
                          <span className="inline-flex mt-1 text-[9px] bg-amber-50 text-amber-700 border border-amber-200 px-1.5 py-0.5 rounded font-black flex-row items-center gap-0.5" title="Resubmission Count">
                            <RotateCcw className="h-2.5 w-2.5" />
                            Returned ({soa.dateResetCount})
                          </span>
                        )}
                      </td>

                      {/* Stakeholder Info */}
                      <td className="px-6 py-4.5">
                        <div className="font-black text-slate-900 group-hover:text-blue-600 transition-colors uppercase text-xs tracking-tight">
                          {soa.stakeholderName}
                        </div>
                        <div className="text-[10px] text-slate-400 mt-0.5 flex items-center space-x-1 font-bold">
                          <span>Logger: {soa.createdBy?.displayName || "System"}</span>
                        </div>
                      </td>

                      {/* Batch Ref */}
                      <td className="px-6 py-4.5 whitespace-nowrap font-mono text-[11px] font-black text-slate-500 bg-slate-50/30">
                        {soa.batchNumber}
                      </td>

                      {/* Amount / Budget */}
                      <td className="px-6 py-4.5 whitespace-nowrap text-slate-950 font-black text-sm text-right">
                        {formatPHP(soa.totalAmount)}
                      </td>

                      {/* Status Badging */}
                      <td className="px-6 py-4.5 whitespace-nowrap">
                        <div className="flex flex-col items-start gap-1">
                          <span className={`inline-flex px-3 py-1 text-[10px] font-black uppercase tracking-widest border-2 rounded-full transition-all ${getStatusBadgeStyle(soa.status)}`}>
                            {soa.status}
                          </span>
                          {isOverdue(soa) && (
                            <span className="inline-flex px-2 py-0.5 text-[9px] bg-rose-50 text-rose-700 border border-rose-200 font-extrabold uppercase tracking-widest rounded-md animate-pulse shadow-sm shadow-rose-100 mt-0.5">
                              ⚠️ Delayed
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Progress visualization */}
                      <td className="px-6 py-4.5 whitespace-nowrap">
                        <div className="w-32">
                          <div className="flex justify-between text-[9px] text-slate-400 font-black mb-1 uppercase">
                            <span>Step {soa.currentStep}/6</span>
                          </div>
                          <div className="w-full bg-slate-100 rounded-full h-1">
                            <div 
                              className={`h-1 rounded-full transition-all duration-500 ${
                                soa.status === "With Issue" 
                                  ? "bg-rose-500" 
                                  : soa.status === "Released" 
                                  ? "bg-emerald-500" 
                                  : "bg-blue-600"
                              }`}
                              style={{ width: `${(soa.currentStep / 6) * 100}%` }}
                            ></div>
                          </div>
                        </div>
                      </td>

                      {/* Interaction Items */}
                      <td className="px-6 py-4.5 whitespace-nowrap text-right text-xs font-medium space-x-2">
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); onSelectSOA(soa); }}
                          className="inline-flex items-center space-x-1 bg-white hover:bg-slate-50 text-slate-700 px-2.5 py-1.5 rounded-lg border border-slate-200 font-extrabold transition-all cursor-pointer"
                        >
                          <Info className="h-3.5 w-3.5" />
                          <span>Audit</span>
                        </button>
                        
                        {(currentUser.role === "System Administrator" || currentUser.canDelete === true) && (
                          <button
                            type="button"
                            onClick={(e) => handleDelete(soa.id, soa.stakeholderName, e)}
                            className="inline-flex items-center p-1.5 bg-red-50 text-red-600 hover:bg-red-600 hover:text-white rounded-lg border border-red-200 transition-all cursor-pointer"
                            title="Delete Record"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile Cards for Flat View */}
            <div className="lg:hidden grid grid-cols-1 gap-4">
              {filteredSOAs.map((soa) => (
                <div 
                  key={soa.id}
                  onClick={() => onSelectSOA(soa)}
                  className="bg-slate-50/50 border border-slate-100 rounded-2xl p-5 hover:border-blue-200 transition-all active:scale-[0.98] group"
                >
                  <div className="flex justify-between items-start mb-4">
                    <div className="space-y-1">
                      <h4 className="text-xs font-black text-slate-900 uppercase tracking-tight group-hover:text-blue-600 transition-colors">{soa.stakeholderName}</h4>
                      <p className="text-[10px] font-black text-slate-400 font-mono">BATCH: {soa.batchNumber}</p>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <span className={`inline-flex px-2 py-0.5 text-[9px] font-black uppercase tracking-widest border rounded-md ${getStatusBadgeStyle(soa.status)}`}>
                        {soa.status}
                      </span>
                      {isOverdue(soa) && (
                        <span className="inline-flex px-2 py-0.5 text-[8px] bg-rose-50 text-rose-700 border border-rose-200 font-black uppercase tracking-widest rounded animate-pulse">
                          ⚠️ Delayed
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div>
                      <span className="block text-[8px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Disbursement</span>
                      <span className="text-sm font-black text-slate-900">{formatPHP(soa.totalAmount)}</span>
                    </div>
                    <div>
                      <span className="block text-[8px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Date In</span>
                      <span className="text-sm font-bold text-slate-700">{soa.dateReceived}</span>
                    </div>
                  </div>

                  <div className="pt-4 border-t border-slate-100">
                    <div className="flex justify-between text-[9px] font-black text-slate-400 items-center uppercase tracking-widest mb-1.5">
                      <span>Pipeline Flow Progress</span>
                      <span className="text-blue-600">STEP {soa.currentStep}/6</span>
                    </div>
                    <div className="w-full bg-slate-200 rounded-full h-1.5 overflow-hidden">
                      <div 
                        className={`h-full transition-all duration-700 ${
                          soa.status === "With Issue" ? "bg-rose-500" : soa.status === "Released" ? "bg-emerald-500" : "bg-blue-600"
                        }`}
                        style={{ width: `${(soa.currentStep / 6) * 100}%` }}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          /* Organized Grouped Accordions View */
          <div className="space-y-4">
            {stakeholderGroups.map((group) => {
              const isExpanded = !!expandedStakeholders[group.name.toLowerCase()];
              const issueCount = group.soas.filter((s) => s.status === "With Issue").length;
              const completedCount = group.soas.filter((s) => s.status === "Released").length;
              const delayedCount = group.soas.filter((s) => isOverdue(s)).length;
              
              return (
                <div 
                  key={group.name} 
                  className="border border-slate-100 rounded-2xl shadow-sm bg-white overflow-hidden hover:border-slate-200/50 transition-all"
                >
                  {/* Category Action Box */}
                  <div
                    onClick={() => {
                      setExpandedStakeholders((prev) => ({
                        ...prev,
                        [group.name.toLowerCase()]: !prev[group.name.toLowerCase()]
                      }));
                    }}
                    className={`p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 cursor-pointer select-none transition-all border-b ${delayedCount > 0 ? "bg-rose-50/20 hover:bg-rose-50/40 border-rose-100" : "bg-slate-50/30 hover:bg-slate-50 border-slate-50"}`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`p-3 rounded-xl shrink-0 ${delayedCount > 0 ? "bg-rose-100 text-rose-600" : "bg-blue-50 text-blue-600"}`}>
                        <Building2 className="h-5 w-5" />
                      </div>
                      <div>
                        <h4 className="font-extrabold text-slate-800 text-sm tracking-tight flex items-center gap-2">
                          {group.name}
                          {delayedCount > 0 && <AlertCircle className="h-4 w-4 text-rose-500 animate-pulse" />}
                        </h4>
                        <div className="flex flex-wrap items-center gap-2 mt-1">
                          <span className="text-[10px] bg-slate-100 text-slate-600 px-2.5 py-0.5 rounded-lg font-bold">
                            {group.soas.length} {group.soas.length === 1 ? "document" : "documents"} log
                          </span>
                          {delayedCount > 0 && (
                            <span className="text-[10px] bg-rose-50 text-rose-600 border border-rose-200 px-2.5 py-0.5 rounded-lg font-bold animate-pulse shadow-sm shadow-rose-100">
                              ⚠️ {delayedCount} Delayed
                            </span>
                          )}
                          {issueCount > 0 && (
                            <span className="text-[10px] bg-amber-50 text-amber-700 border border-amber-200 px-2.5 py-0.5 rounded-lg font-bold">
                              {issueCount} with issue
                            </span>
                          )}
                          {completedCount > 0 && (
                            <span className="text-[10px] bg-emerald-50 text-emerald-600 border border-emerald-200 px-2.5 py-0.5 rounded-lg font-bold">
                              {completedCount} fully released
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between sm:justify-end gap-6 border-t sm:border-t-0 pt-3 sm:pt-0 border-slate-100">
                      <div className="text-left sm:text-right">
                        <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Cumulative Ledger Value</div>
                        <div className="text-base font-black text-slate-900 mt-0.5">{formatPHP(group.totalAmount)}</div>
                      </div>
                      <div className="p-1 px-2 hover:bg-slate-200/50 rounded-lg shrink-0 transition-colors">
                        {isExpanded ? (
                          <ChevronUp className="h-5 w-5 text-slate-500" />
                        ) : (
                          <ChevronDown className="h-5 w-5 text-slate-500" />
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Accompanying contents if expanded */}
                  {isExpanded && (
                    <div className="overflow-x-auto bg-white border-t border-slate-50 p-2">
                      <table className="min-w-full divide-y divide-slate-100 text-left text-xs">
                        <thead className="bg-slate-50 text-[10px] text-slate-500 uppercase tracking-widest font-extrabold">
                          <tr>
                            <th className="px-5 py-3">Batch Number</th>
                            <th className="px-5 py-3">Received Date</th>
                            <th className="px-5 py-3">Amount</th>
                            <th className="px-5 py-3">Flow Status</th>
                            <th className="px-5 py-3">Tracking Steps</th>
                            <th className="px-5 py-3 text-right">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 font-sans">
                          {group.soas.map((soa) => (
                            <tr
                              key={soa.id}
                              onClick={() => onSelectSOA(soa)}
                              className="hover:bg-blue-50/15 cursor-pointer group/row transition-all"
                            >
                              <td className="px-5 py-3.5 whitespace-nowrap font-mono font-bold text-slate-500">
                                {soa.batchNumber}
                              </td>
                              <td className="px-5 py-3.5 whitespace-nowrap">
                                <div className="flex items-center gap-1.5 text-slate-700 font-medium">
                                  <Calendar className="h-3.5 w-3.5 text-slate-400" />
                                  <span>{soa.dateReceived}</span>
                                  {soa.dateResetCount > 0 && (
                                    <span className="inline-flex text-[9px] bg-amber-50 text-amber-700 border border-amber-200 px-1 py-0.5 rounded font-extrabold">
                                      +{soa.dateResetCount}
                                    </span>
                                  )}
                                </div>
                              </td>
                              <td className="px-5 py-3.5 whitespace-nowrap font-black text-slate-900 text-sm">
                                {formatPHP(soa.totalAmount)}
                              </td>
                              <td className="px-5 py-3.5 whitespace-nowrap">
                                <div className="flex flex-col items-start gap-1">
                                  <span className={`inline-flex px-2 py-0.5 text-[10px] font-bold border rounded-full ${getStatusBadgeStyle(soa.status)}`}>
                                    {soa.status}
                                  </span>
                                  {isOverdue(soa) && (
                                    <span className="inline-flex px-1.5 py-0.5 text-[8px] bg-rose-50 text-rose-700 border border-rose-200 font-black uppercase tracking-widest rounded animate-pulse">
                                      ⚠️ Delayed
                                    </span>
                                  )}
                                </div>
                              </td>
                              <td className="px-5 py-3.5 whitespace-nowrap">
                                <div className="w-28">
                                  <div className="flex justify-between text-[9px] text-slate-400 font-bold mb-0.5">
                                    <span>Step {soa.currentStep} of 6</span>
                                    <span>{getStepLabel(soa.currentStep)}</span>
                                  </div>
                                  <div className="w-full bg-slate-100 rounded-full h-1">
                                    <div 
                                      className={`h-1 rounded-full transition-all duration-300 ${
                                        soa.status === "With Issue" 
                                          ? "bg-rose-500" 
                                          : soa.status === "Released" 
                                          ? "bg-emerald-500" 
                                          : "bg-blue-600"
                                      }`}
                                      style={{ width: `${(soa.currentStep / 6) * 100}%` }}
                                    />
                                  </div>
                                </div>
                              </td>
                              <td className="px-5 py-3.5 whitespace-nowrap text-right font-medium">
                                <div className="flex justify-end gap-1.5">
                                  <button
                                    type="button"
                                    onClick={(e) => { e.stopPropagation(); onSelectSOA(soa); }}
                                    className="bg-slate-50 hover:bg-slate-100 text-slate-700 px-2 py-1 rounded text-[10px] font-bold border border-slate-200 flex items-center gap-1 transition-all cursor-pointer"
                                  >
                                    <Info className="h-3 w-3" />
                                    <span>Details</span>
                                  </button>
                                  {(currentUser.role === "System Administrator" || currentUser.canDelete === true) && (
                                    <button
                                      type="button"
                                      onClick={(e) => handleDelete(soa.id, soa.stakeholderName, e)}
                                      className="bg-red-50 hover:bg-red-600 text-red-600 hover:text-white p-1 rounded border border-red-200 transition-all cursor-pointer"
                                      title="Delete Record"
                                    >
                                      <Trash2 className="h-3 w-3" />
                                    </button>
                                  )}
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      <ConfirmationModal
        isOpen={deleteConfirmation.isOpen}
        title="Delete Statement of Account Tracker"
        message={`Are you completely certain you want to delete the tracker record for "${deleteConfirmation.soaName}"? This action removes history logs permanently and cannot be undone.`}
        confirmText="Confirm Delete"
        onConfirm={() => onDeleteSOA(deleteConfirmation.soaId)}
        onClose={() => setDeleteConfirmation({ isOpen: false, soaId: "", soaName: "" })}
      />
    </div>
  );
}
