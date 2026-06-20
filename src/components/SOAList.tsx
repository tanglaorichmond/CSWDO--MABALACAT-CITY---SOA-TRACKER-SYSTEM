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
  Building2,
  HeartPulse,
  FlaskConical,
  Flower,
  X,
  Download,
  Printer
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
  const [activeInactiveFilter, setActiveInactiveFilter] = useState<"active" | "inactive" | "all">("active");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  
  // Segmented control: by default grouped by stakeholder
  const [viewMode, setViewMode] = useState<"flat" | "grouped">("grouped");

  // Dynamic category counts
  const categoryCounts = useMemo(() => {
    const counts = {
      all: 0,
      hospital: 0,
      laboratories: 0,
      funeral: 0,
    };
    soas.forEach((s) => {
      // Respect the activeInactive filter for category counts
      const statusMatches = statusFilter === "" || s.status === statusFilter;
      const activeInactiveMatches = statusFilter !== "" ? true : (
        activeInactiveFilter === "active" ? s.status !== "Released" :
        activeInactiveFilter === "inactive" ? s.status === "Released" : true
      );
      
      if (statusMatches && activeInactiveMatches) {
        counts.all++;
        const cat = s.stakeholderCategory;
        if (cat === "hospital") counts.hospital++;
        else if (cat === "laboratories") counts.laboratories++;
        else if (cat === "funeral") counts.funeral++;
      }
    });
    return counts;
  }, [soas, statusFilter, activeInactiveFilter]);

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

  const getOverdueDays = (doc: SOADoc) => {
    if (doc.status === "Released") return 0;
    
    const stepKeys: { [key: number]: keyof SLASettings } = {
      1: 'receiving', 2: 'verification', 3: 'sorting', 
      4: 'checklist', 5: 'accounting', 6: 'release'
    };

    const settings = slaSettings || DEFAULT_SLA_SETTINGS;
    const targetDays = settings[stepKeys[doc.currentStep]] as number;
    if (!targetDays) return 0;

    const lastUpdate = new Date(doc.updatedAt).getTime();
    const diffDays = (Date.now() - lastUpdate) / (1000 * 60 * 60 * 24);
    if (diffDays > targetDays) {
      const value = Math.floor(diffDays - targetDays);
      return value === 0 ? 1 : value;
    }
    return 0;
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
      case 5: return "Forwarded to Accounting";
      case 6: return "Forwarded to Treasury";
      case 7: return "Releasing of Check";
      default: return `Step ${step}`;
    }
  };

  // Get Category Icon Details (Design base on category)
  const getCategoryIconDetails = (category?: string, hasDelay?: boolean) => {
    const cat = (category || "").toLowerCase();
    
    if (cat === "hospital" || cat === "health") {
      return {
        icon: <HeartPulse className="h-5 w-5" />,
        bgColor: hasDelay ? "bg-rose-100 text-rose-600 border border-rose-200" : "bg-rose-50 text-rose-500 border border-rose-100",
        label: "Hospital",
        textColor: "text-rose-600"
      };
    } else if (cat === "laboratories" || cat === "laboratory" || cat === "lab") {
      return {
        icon: <FlaskConical className="h-5 w-5" />,
        bgColor: hasDelay ? "bg-purple-100 text-purple-600 border border-purple-200" : "bg-purple-50 text-purple-500 border border-purple-100",
        label: "Laboratory",
        textColor: "text-purple-600"
      };
    } else if (cat === "funeral") {
      return {
        icon: <Flower className="h-5 w-5" />,
        bgColor: hasDelay ? "bg-amber-100 text-amber-700 border border-amber-200" : "bg-amber-50 text-amber-500 border border-amber-100",
        label: "Funeral",
        textColor: "text-amber-500"
      };
    }
    
    // Default fallback
    return {
      icon: <Building2 className="h-5 w-5" />,
      bgColor: hasDelay ? "bg-slate-100 text-slate-500 border border-slate-200" : "bg-slate-50 text-slate-400 border border-slate-100",
      label: "Other Partner",
      textColor: "text-slate-400"
    };
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
          <Flower className="h-3.5 w-3.5" />
        </span>
      );
    }
    return (
      <span className="p-1.5 bg-slate-50 border border-slate-100 text-slate-400 rounded-lg shrink-0 flex items-center justify-center">
        <Building2 className="h-3.5 w-3.5" />
      </span>
    );
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
        
        // Exclude Released (completed/inactive) by default or do a strict active/inactive match
        const matchActiveInactive = statusFilter !== "" ? true : (
          activeInactiveFilter === "active" ? soa.status !== "Released" :
          activeInactiveFilter === "inactive" ? soa.status === "Released" : true
        );
        
        const matchCategory = categoryFilter === "" || soa.stakeholderCategory === categoryFilter;
        
        const matchDate = (!startDate || soa.dateReceived >= startDate) && 
                          (!endDate || soa.dateReceived <= endDate);
        
        return matchSearch && matchStatus && matchActiveInactive && matchCategory && matchDate;
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
  }, [soas, searchTerm, statusFilter, activeInactiveFilter, categoryFilter, sortBy, sortOrder, startDate, endDate]);

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

  const escapeCSVString = (val: any) => {
    if (val === undefined || val === null) return "";
    const str = String(val);
    return `"${str.replace(/"/g, '""')}"`;
  };

  const handleExportCSV = () => {
    if (filteredSOAs.length === 0) {
      showToast("No records to export in the selected range.", "warning");
      return;
    }
    
    const headers = [
      "Batch/Control No",
      "Stakeholder",
      "Category",
      "Amount (PHP)",
      "Date Received",
      "Current Step",
      "Status",
      "Last Updated"
    ];
    
    const csvRows = [headers.join(",")];
    
    filteredSOAs.forEach(soa => {
      const row = [
        escapeCSVString(soa.batchId || ''),
        escapeCSVString(soa.stakeholderName || ''),
        escapeCSVString(soa.stakeholderCategory || ''),
        escapeCSVString(soa.totalAmount || 0),
        escapeCSVString(soa.dateReceived || ''),
        escapeCSVString(`Step ${soa.currentStep} of 7`),
        escapeCSVString(soa.status || ''),
        escapeCSVString(soa.updatedAt ? new Date(soa.updatedAt).toLocaleDateString() : '')
      ];
      csvRows.push(row.join(","));
    });
    
    const csvContent = "\uFEFF" + csvRows.join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    
    const dateStr = (startDate && endDate) 
      ? `${startDate}_to_${endDate}` 
      : (startDate ? `from_${startDate}` : (endDate ? `to_${endDate}` : 'all'));
    
    link.setAttribute("href", url);
    link.setAttribute("download", `SOA_Tracker_Report_${dateStr}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast("CSV exported successfully!", "success");
  };

  const handlePrint = () => {
    if (filteredSOAs.length === 0) {
      showToast("No records to print in the selected range.", "warning");
      return;
    }
    
    const printWindow = window.open("", "_blank");
    if (!printWindow) {
      showToast("Pop-up blocked. Please allow popups to print report.", "error");
      return;
    }
    
    const dateRangeStr = (startDate || endDate) 
      ? `Date Range: ${startDate || 'Anytime'} to ${endDate || 'Anytime'}` 
      : "All Records";

    printWindow.document.write(`
      <html>
        <head>
          <title>SOA Tracker Report - CSWDO Mabalacat City</title>
          <style>
            body {
              font-family: 'Inter', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
              color: #1e293b;
              padding: 40px;
              margin: 0;
            }
            .header {
              border-bottom: 2px solid #e2e8f0;
              padding-bottom: 16px;
              margin-bottom: 24px;
              display: flex;
              justify-content: space-between;
              align-items: flex-end;
            }
            .header h1 {
              margin: 0;
              font-size: 24px;
              font-weight: 800;
              color: #0f172a;
              text-transform: uppercase;
              letter-spacing: -0.025em;
            }
            .header p {
              margin: 4px 0 0 0;
              font-size: 11px;
              color: #64748b;
              font-weight: 600;
              text-transform: uppercase;
              letter-spacing: 0.1em;
            }
            .meta-info {
              font-size: 13px;
              color: #475569;
              margin-bottom: 24px;
              background: #f8fafc;
              border: 1px solid #e2e8f0;
              padding: 12px 16px;
              border-radius: 8px;
              display: flex;
              justify-content: space-between;
            }
            table {
              width: 100%;
              border-collapse: collapse;
              font-size: 11px;
            }
            th {
              background-color: #f1f5f9;
              color: #334155;
              font-weight: 700;
              text-align: left;
              padding: 10px 12px;
              border-bottom: 1px solid #cbd5e1;
              text-transform: uppercase;
              font-size: 10px;
              letter-spacing: 0.05em;
            }
            td {
              padding: 10px 12px;
              border-bottom: 1px solid #e2e8f0;
            }
            tr:nth-child(even) td {
              background-color: #f8fafc;
            }
            .footer {
              margin-top: 40px;
              font-size: 10px;
              color: #94a3b8;
              text-align: center;
              border-top: 1px dashed #cbd5e1;
              padding-top: 16px;
            }
            .amount {
              font-family: monospace;
              font-weight: 700;
              text-align: right;
            }
            .status-badge {
              display: inline-block;
              padding: 2px 6px;
              border-radius: 4px;
              font-weight: 700;
              font-size: 9px;
              text-transform: uppercase;
            }
            .badge-released { background-color: #dcfce7; color: #15803d; }
            .badge-issue { background-color: #fee2e2; color: #b91c1c; }
            .badge-pending { background-color: #fef9c3; color: #a16207; }
            .badge-step { background-color: #e0f2fe; color: #0369a1; }
          </style>
        </head>
        <body>
          <div class="header">
            <div>
              <h1>SOA Tracker Report</h1>
              <p>CSWDO Mabalacat City</p>
            </div>
            <div style="text-align: right;">
              <p style="margin: 0; font-size: 12px; color: #475569;">Generated on: ${new Date().toLocaleString()}</p>
            </div>
          </div>
          
          <div class="meta-info">
            <div><strong>Date Range Filter:</strong> ${dateRangeStr}</div>
            <div><strong>Total Statements:</strong> ${filteredSOAs.length}</div>
          </div>

          <table>
            <thead>
              <tr>
                <th style="width: 15%">Batch ID</th>
                <th style="width: 25%">Stakeholder Name</th>
                <th style="width: 15%">Category</th>
                <th style="width: 15%; text-align: right;">Amount (PHP)</th>
                <th style="width: 12%">Date Received</th>
                <th style="width: 10%">Current Step</th>
                <th style="width: 8%">Status</th>
              </tr>
            </thead>
            <tbody>
              ${filteredSOAs.map(soa => {
                let badgeClass = "badge-step";
                if (soa.status === "Released") badgeClass = "badge-released";
                else if (soa.status === "With Issue") badgeClass = "badge-issue";
                else if (soa.status === "Pending") badgeClass = "badge-pending";

                return `
                  <tr>
                    <td><strong>${soa.batchId || 'N/A'}</strong></td>
                    <td>${soa.stakeholderName || ''}</td>
                    <td><span style="text-transform: capitalize;">${soa.stakeholderCategory || ''}</span></td>
                    <td class="amount">₱${(soa.totalAmount || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                    <td>${soa.dateReceived || ''}</td>
                    <td>Step ${soa.currentStep} of 7</td>
                    <td><span class="status-badge ${badgeClass}">${soa.status || ''}</span></td>
                  </tr>
                `;
              }).join('')}
            </tbody>
          </table>

          <div class="footer">
            <p>CONFIDENTIAL &amp; PROPRIETARY — CITY SOCIAL WELFARE AND DEVELOPMENT OFFICE (CSWDO), MABALACAT CITY</p>
            <p>This is a computer-generated report. End of document.</p>
          </div>
          
          <script>
            window.onload = function() {
              window.print();
            }
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
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
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
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

        {/* Active vs Inactive (Released) Filter Segment */}
        <div className="flex bg-slate-100 p-1 rounded-xl text-xs font-semibold h-[48px] items-center border border-slate-200/40 select-none">
          <button
            type="button"
            onClick={() => {
              setActiveInactiveFilter("active");
              if (statusFilter === "Released") setStatusFilter("");
            }}
            className={`flex-1 py-1.5 rounded-lg flex items-center justify-center gap-1.5 transition-all cursor-pointer h-[38px] ${
              activeInactiveFilter === "active"
                ? "bg-white text-slate-900 shadow-sm border border-slate-200/50 font-extrabold"
                : "text-slate-500 hover:text-slate-700"
            }`}
          >
            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse shrink-0" />
            <span className="truncate">Active Only</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setActiveInactiveFilter("inactive");
            }}
            className={`flex-1 py-1.5 rounded-lg flex items-center justify-center gap-1.5 transition-all cursor-pointer h-[38px] ${
              activeInactiveFilter === "inactive"
                ? "bg-white text-rose-600 shadow-sm border border-slate-200/50 font-extrabold"
                : "text-slate-500 hover:text-rose-600"
            }`}
          >
            <span className="h-2 w-2 rounded-full bg-rose-400 shrink-0" />
            <span className="truncate">Released</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveInactiveFilter("all")}
            className={`flex-1 py-1.5 rounded-lg flex items-center justify-center transition-all cursor-pointer h-[38px] ${
              activeInactiveFilter === "all"
                ? "bg-white text-slate-800 shadow-sm border border-slate-200/50 font-extrabold"
                : "text-slate-500 hover:text-slate-700"
            }`}
          >
            <span className="truncate font-bold">Show All</span>
          </button>
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

      {/* Date Range Filter Row */}
      <div className="bg-slate-50/50 border border-slate-200/60 rounded-2xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 mt-3">
        <div className="flex items-center gap-2.5">
          <div className="bg-blue-500/10 text-blue-600 p-2 rounded-xl border border-blue-500/10 shrink-0">
            <Calendar className="h-4 w-4" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-slate-800">Filter By Date Received</h4>
            <p className="text-[10px] text-slate-400 font-medium font-sans">Filter records matching specific Statements of Account receipt dates.</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 select-none">From:</span>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="bg-white border border-slate-200 rounded-xl p-2.5 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-slate-700 shadow-sm cursor-pointer"
            />
          </div>

          <div className="flex items-center gap-2">
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 select-none">To:</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="bg-white border border-slate-200 rounded-xl p-2.5 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-slate-700 shadow-sm cursor-pointer"
            />
          </div>

          {(startDate || endDate) && (
            <button
              onClick={() => {
                setStartDate("");
                setEndDate("");
              }}
              className="px-3.5 py-2.5 bg-rose-50 border border-rose-100 hover:bg-rose-100 text-rose-600 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 shadow-sm shrink-0"
              title="Clear date filter"
            >
              <X className="h-3.5 w-3.5 shrink-0" />
              <span>Clear Date</span>
            </button>
          )}

          <div className="flex items-center gap-2 border-l border-slate-200/80 pl-1 md:pl-3 md:ml-1 shrink-0">
            <button
              onClick={handleExportCSV}
              className="bg-emerald-50 text-emerald-700 border border-emerald-200/60 hover:bg-emerald-100/80 rounded-xl px-3 py-2.5 text-xs font-bold cursor-pointer transition-all flex items-center gap-1.5 shadow-sm"
              title="Export filtered records to CSV"
            >
              <Download className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Export CSV</span>
              <span className="sm:hidden">CSV</span>
            </button>

            <button
              onClick={handlePrint}
              className="bg-slate-100 hover:bg-slate-200/80 text-slate-700 border border-slate-200/60 rounded-xl px-3 py-2.5 text-xs font-bold cursor-pointer transition-all flex items-center gap-1.5 shadow-sm"
              title="Print filtered report"
            >
              <Printer className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Print Report</span>
              <span className="sm:hidden">Print</span>
            </button>
          </div>
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
                        <div className="flex items-center gap-2.5">
                          {renderCategoryMiniIcon(soa.stakeholderCategory)}
                          <div>
                            <div className="font-black text-slate-900 group-hover:text-blue-600 transition-colors uppercase text-xs tracking-tight">
                              {soa.stakeholderName}
                            </div>
                            <div className="text-[10px] text-slate-400 mt-0.5 flex items-center space-x-1 font-bold">
                              <span>Logger: {soa.createdBy?.displayName || "System"}</span>
                            </div>
                          </div>
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
                              ⚠️ Delayed ({getOverdueDays(soa)} days)
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Progress visualization */}
                      <td className="px-6 py-4.5 whitespace-nowrap">
                        <div className="w-32">
                          <div className="flex justify-between text-[9px] text-slate-400 font-black mb-1 uppercase">
                            <span>Step {soa.currentStep}/7</span>
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
                              style={{ width: `${(soa.currentStep / 7) * 100}%` }}
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
                        
                        {(currentUser.role === "System Administrator" || currentUser.role === "Admin" || currentUser.canDelete === true) && (
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
                    <div className="flex items-center gap-2.5">
                      {renderCategoryMiniIcon(soa.stakeholderCategory)}
                      <div className="space-y-1">
                        <h4 className="text-xs font-black text-slate-900 uppercase tracking-tight group-hover:text-blue-600 transition-colors">{soa.stakeholderName}</h4>
                        <p className="text-[10px] font-black text-slate-400 font-mono">BATCH: {soa.batchNumber}</p>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <span className={`inline-flex px-2 py-0.5 text-[9px] font-black uppercase tracking-widest border rounded-md ${getStatusBadgeStyle(soa.status)}`}>
                        {soa.status}
                      </span>
                      {isOverdue(soa) && (
                        <span className="inline-flex px-2 py-0.5 text-[8px] bg-rose-50 text-rose-700 border border-rose-200 font-black uppercase tracking-widest rounded animate-pulse">
                          ⚠️ Delayed ({getOverdueDays(soa)}d)
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
                      <span className="text-blue-600">STEP {soa.currentStep}/7</span>
                    </div>
                    <div className="w-full bg-slate-200 rounded-full h-1.5 overflow-hidden">
                      <div 
                        className={`h-full transition-all duration-700 ${
                          soa.status === "With Issue" ? "bg-rose-500" : soa.status === "Released" ? "bg-emerald-500" : "bg-blue-600"
                        }`}
                        style={{ width: `${(soa.currentStep / 7) * 100}%` }}
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
              const maxDelayedDays = group.soas.reduce((max, s) => {
                const od = getOverdueDays(s);
                return od > max ? od : max;
              }, 0);
              
              const groupCategory = group.soas[0]?.stakeholderCategory;
              const catDetails = getCategoryIconDetails(groupCategory, delayedCount > 0);
              
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
                      <div className={`p-3 rounded-xl shrink-0 ${catDetails.bgColor}`}>
                        {catDetails.icon}
                      </div>
                      <div>
                        <h4 className="font-extrabold text-slate-800 text-sm tracking-tight flex items-center gap-2">
                          {group.name}
                          {delayedCount > 0 && <AlertCircle className="h-4 w-4 text-rose-500 animate-pulse" />}
                        </h4>
                        <div className="flex flex-wrap items-center gap-2 mt-1">
                          <span className={`text-[9.5px] font-black uppercase tracking-widest px-2 py-0.5 rounded-md ${catDetails.bgColor}`}>
                            {catDetails.label}
                          </span>
                          <span className="text-[10px] bg-slate-100 text-slate-600 px-2.5 py-0.5 rounded-lg font-bold">
                            {group.soas.length} {group.soas.length === 1 ? "document" : "documents"} log
                          </span>
                          {delayedCount > 0 && (
                            <span className="text-[10px] bg-rose-50 text-rose-600 border border-rose-200 px-2.5 py-0.5 rounded-lg font-bold animate-pulse shadow-sm shadow-rose-100">
                              ⚠️ {delayedCount} Delayed (up to {maxDelayedDays} days)
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
                                      ⚠️ Delayed ({getOverdueDays(soa)} days)
                                    </span>
                                  )}
                                </div>
                              </td>
                              <td className="px-5 py-3.5 whitespace-nowrap">
                                <div className="w-28">
                                  <div className="flex justify-between text-[9px] text-slate-400 font-bold mb-0.5">
                                    <span>Step {soa.currentStep} of 7</span>
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
                                      style={{ width: `${(soa.currentStep / 7) * 100}%` }}
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
                                  {(currentUser.role === "System Administrator" || currentUser.role === "Admin" || currentUser.canDelete === true) && (
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
