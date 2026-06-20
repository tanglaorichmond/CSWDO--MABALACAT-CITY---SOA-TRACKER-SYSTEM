import React, { useState, useMemo } from "react";
import { SOADoc, Stakeholder, UserProfile } from "../types";
import { 
  DollarSign, 
  Search, 
  Building2, 
  Download, 
  Printer, 
  Building, 
  HeartPulse, 
  FlaskConical, 
  Flower, 
  Filter, 
  TrendingUp, 
  Clock, 
  CheckCircle,
  Sparkles,
  ChevronDown
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

interface FinancialReportProps {
  soas: SOADoc[];
  stakeholders: Stakeholder[];
  currentUser: UserProfile;
  showToast: (message: string, type: "success" | "error" | "warning" | "info") => void;
}

interface StakeholderFinancialRow {
  name: string;
  category: string;
  releasedAmount: number;
  releasedCount: number;
  pendingAmount: number;
  pendingCount: number;
  totalAmount: number;
  totalCount: number;
}

export default function FinancialReport({ soas, stakeholders, currentUser, showToast }: FinancialReportProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [amountTypeFilter, setAmountTypeFilter] = useState<"all" | "released" | "pending">("all");
  const [sortBy, setSortBy] = useState<"name" | "released" | "pending" | "total">("total");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");

  // Determine standard icon details for categories
  const getCategoryIcon = (category?: string) => {
    const cat = (category || "").toLowerCase();
    if (cat === "hospital" || cat === "health") {
      return (
        <span className="p-2 bg-blue-50 border border-blue-100 text-blue-600 rounded-xl shrink-0 flex items-center justify-center">
          <HeartPulse className="h-4 w-4" />
        </span>
      );
    } else if (cat === "laboratories" || cat === "laboratory" || cat === "lab") {
      return (
        <span className="p-2 bg-rose-50 border border-rose-100 text-rose-500 rounded-xl shrink-0 flex items-center justify-center">
          <FlaskConical className="h-4 w-4" />
        </span>
      );
    } else if (cat === "funeral") {
      return (
        <span className="p-2 bg-amber-50 border border-amber-100 text-amber-500 rounded-xl shrink-0 flex items-center justify-center">
          <Flower className="h-4 w-4" />
        </span>
      );
    }
    return (
      <span className="p-2 bg-slate-55 text-slate-500 border border-slate-100 rounded-xl shrink-0 flex items-center justify-center">
        <Building className="h-4 w-4" />
      </span>
    );
  };

  // Compile stakeholder financials
  const financialData = useMemo(() => {
    // Collect all valid unique stakeholder names from both database and referenced SOAs
    const allStakeholderNames = new Set<string>();
    stakeholders.forEach(s => allStakeholderNames.add(s.name));
    soas.forEach(s => {
      if (s.stakeholderName) allStakeholderNames.add(s.stakeholderName);
    });

    const results: StakeholderFinancialRow[] = Array.from(allStakeholderNames).map(name => {
      // Find stakeholder category from metadata, or fall back to matching SOAs, or default placeholder
      const stakeholderObj = stakeholders.find(s => s.name === name);
      let category = stakeholderObj?.category || "hospital";
      if (!stakeholderObj) {
        const matchingSoa = soas.find(s => s.stakeholderName === name);
        if (matchingSoa) {
          category = matchingSoa.stakeholderCategory || "hospital";
        }
      }

      const stakeholderSoas = soas.filter(s => s.stakeholderName === name);
      
      let releasedAmount = 0;
      let releasedCount = 0;
      let pendingAmount = 0;
      let pendingCount = 0;

      stakeholderSoas.forEach(soa => {
        const amt = soa.totalAmount || 0;
        if (soa.status === "Released") {
          releasedAmount += amt;
          releasedCount += 1;
        } else {
          pendingAmount += amt;
          pendingCount += 1;
        }
      });

      return {
        name,
        category,
        releasedAmount,
        releasedCount,
        pendingAmount,
        pendingCount,
        totalAmount: releasedAmount + pendingAmount,
        totalCount: releasedCount + pendingCount
      };
    });

    return results;
  }, [soas, stakeholders]);

  // Overall Financial stats calculated inside the report
  const summaryStats = useMemo(() => {
    let totalReleased = 0;
    let totalPending = 0;
    let releasedCount = 0;
    let pendingCount = 0;

    financialData.forEach(row => {
      totalReleased += row.releasedAmount;
      totalPending += row.pendingAmount;
      releasedCount += row.releasedCount;
      pendingCount += row.pendingCount;
    });

    return {
      totalReleased,
      totalPending,
      releasedCount,
      pendingCount,
      totalOverall: totalReleased + totalPending,
      stakeholdersCount: financialData.length
    };
  }, [financialData]);

  // Filter and sort compiled data rows
  const sortedAndFilteredData = useMemo(() => {
    return financialData
      .filter(row => {
        // Search Filter
        const matchesSearch = row.name.toLowerCase().includes(searchTerm.toLowerCase());
        
        // Category Filter
        let matchesCategory = true;
        if (categoryFilter === "hospital") {
          matchesCategory = row.category === "hospital" || row.category === "health";
        } else if (categoryFilter === "funeral") {
          matchesCategory = row.category === "funeral";
        } else if (categoryFilter === "laboratories") {
          matchesCategory = row.category === "laboratories" || row.category === "laboratory" || row.category === "lab";
        }

        // Amount Type Filter: "released" shows rows having released > 0, "pending" shows rows having pending > 0, "all" shows any active records
        let matchesAmountType = true;
        if (amountTypeFilter === "released") {
          matchesAmountType = row.releasedAmount > 0;
        } else if (amountTypeFilter === "pending") {
          matchesAmountType = row.pendingAmount > 0;
        }

        return matchesSearch && matchesCategory && matchesAmountType;
      })
      .sort((a, b) => {
        let comparison = 0;
        if (sortBy === "name") {
          comparison = a.name.localeCompare(b.name);
        } else if (sortBy === "released") {
          comparison = a.releasedAmount - b.releasedAmount;
        } else if (sortBy === "pending") {
          comparison = a.pendingAmount - b.pendingAmount;
        } else if (sortBy === "total") {
          comparison = a.totalAmount - b.totalAmount;
        }

        return sortOrder === "asc" ? comparison : -comparison;
      });
  }, [financialData, searchTerm, categoryFilter, amountTypeFilter, sortBy, sortOrder]);

  const toggleSort = (field: "name" | "released" | "pending" | "total") => {
    if (sortBy === field) {
      setSortOrder(prev => prev === "asc" ? "desc" : "asc");
    } else {
      setSortBy(field);
      setSortOrder("desc");
    }
  };

  const handleExportCSV = () => {
    if (sortedAndFilteredData.length === 0) {
      showToast("No records available to export.", "warning");
      return;
    }

    const headers = [
      "Stakeholder Name",
      "Category",
      "Released Count",
      "Released Amount (PHP)",
      "Pending Count",
      "Pending Amount (PHP)",
      "Total Count",
      "Total Amount (PHP)"
    ];

    const escapeCSV = (val: any) => {
      const str = String(val === undefined || val === null ? "" : val);
      return `"${str.replace(/"/g, '""')}"`;
    };

    const csvRows = [headers.join(",")];
    sortedAndFilteredData.forEach(row => {
      csvRows.push([
        escapeCSV(row.name),
        escapeCSV(row.category),
        escapeCSV(row.releasedCount),
        escapeCSV(row.releasedAmount),
        escapeCSV(row.pendingCount),
        escapeCSV(row.pendingAmount),
        escapeCSV(row.totalCount),
        escapeCSV(row.totalAmount)
      ].join(","));
    });

    const csvContent = "\uFEFF" + csvRows.join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `Stakeholder_Financial_Summary_${amountTypeFilter}_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    showToast("CSV file exported successfully!", "success");
  };

  const handlePrint = () => {
    if (sortedAndFilteredData.length === 0) {
      showToast("No records available to print.", "warning");
      return;
    }

    const printWindow = window.open("", "_blank");
    if (!printWindow) {
      showToast("Pop-up blocked. Please enable pop-ups to print.", "error");
      return;
    }

    // Organize by category for the print layout
    const printedSections = [
      { key: "hospital", label: "Hospitals & Medical Centers", rows: [] as StakeholderFinancialRow[] },
      { key: "funeral", label: "Funeral Services & Chapels", rows: [] as StakeholderFinancialRow[] },
      { key: "laboratories", label: "Laboratories & Diagnostics", rows: [] as StakeholderFinancialRow[] },
      { key: "other", label: "Other Entities", rows: [] as StakeholderFinancialRow[] }
    ];

    sortedAndFilteredData.forEach(row => {
      const cat = (row.category || "").toLowerCase();
      if (cat === "hospital" || cat === "health") {
        printedSections[0].rows.push(row);
      } else if (cat === "funeral") {
        printedSections[1].rows.push(row);
      } else if (cat === "laboratories" || cat === "laboratory" || cat === "lab") {
        printedSections[2].rows.push(row);
      } else {
        printedSections[3].rows.push(row);
      }
    });

    const activeSections = printedSections.filter(sec => sec.rows.length > 0);

    printWindow.document.write(`
      <html>
        <head>
          <title>Stakeholder Financial Summary - CSWDO Mabalacat City</title>
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
              font-size: 20px;
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
              font-size: 12px;
              color: #475569;
              margin-bottom: 24px;
              background: #f8fafc;
              border: 1px solid #e2e8f0;
              padding: 16px;
              border-radius: 8px;
              display: grid;
              grid-template-columns: repeat(3, 1fr);
              gap: 16px;
            }
            .meta-card h5 {
              margin: 0 0 4px 0;
              font-size: 10px;
              color: #64748b;
              text-transform: uppercase;
              letter-spacing: 0.05em;
            }
            .meta-card p {
              margin: 0;
              font-size: 16px;
              font-weight: 800;
              color: #0f172a;
            }
            .category-section-title {
              margin-top: 28px;
              margin-bottom: 12px;
              font-size: 13px;
              font-weight: 800;
              color: #1e3a8a;
              text-transform: uppercase;
              letter-spacing: 0.05em;
              border-bottom: 2px solid #3b82f6;
              padding-bottom: 6px;
              display: flex;
              justify-content: space-between;
              align-items: center;
            }
            .category-section-title span.totals {
              font-size: 9px;
              font-weight: 700;
              color: #475569;
              text-transform: none;
              letter-spacing: 0;
            }
            table {
              width: 100%;
              border-collapse: collapse;
              font-size: 11px;
              margin-top: 4px;
              margin-bottom: 24px;
            }
            th {
              background-color: #f1f5f9;
              color: #334155;
              font-weight: 700;
              text-align: left;
              padding: 10px 12px;
              border-bottom: 1px solid #cbd5e1;
              text-transform: uppercase;
              font-size: 9px;
              letter-spacing: 0.05em;
            }
            td {
              padding: 10px 12px;
              border-bottom: 1px solid #e2e8f0;
            }
            tr:nth-child(even) td {
              background-color: #f8fafc;
            }
            .amount {
              font-family: monospace;
              font-weight: 700;
              text-align: right;
            }
            .count-badge {
              font-size: 10px;
              color: #64748b;
              font-style: italic;
            }
            .footer {
              margin-top: 40px;
              font-size: 10px;
              color: #94a3b8;
              text-align: center;
              border-top: 1px dashed #cbd5e1;
              padding-top: 16px;
            }
          </style>
        </head>
        <body>
          <div class="header">
            <div>
              <h1>Stakeholder Financial Summary</h1>
              <p>City Social Welfare and Development Office (CSWDO) of Mabalacat City</p>
            </div>
            <div style="text-align: right;">
              <p style="margin: 0; font-size: 11px; color: #475569;">Generated: ${new Date().toLocaleString()}</p>
            </div>
          </div>
          
          <div class="meta-info">
            <div class="meta-card">
              <h5>Total Released Funds</h5>
              <p>₱${summaryStats.totalReleased.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} (${summaryStats.releasedCount} SOAs)</p>
            </div>
            <div class="meta-card">
              <h5>Total In-Pipeline (Pending)</h5>
              <p style="color: #2563eb;">₱${summaryStats.totalPending.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} (${summaryStats.pendingCount} SOAs)</p>
            </div>
            <div class="meta-card">
              <h5>Total Stakeholders</h5>
              <p>${summaryStats.stakeholdersCount} registered</p>
            </div>
          </div>

          ${activeSections.map(section => {
            const secReleased = section.rows.reduce((sum, r) => sum + r.releasedAmount, 0);
            const secPending = section.rows.reduce((sum, r) => sum + r.pendingAmount, 0);
            const secTotal = secReleased + secPending;
            const secReleaseCount = section.rows.reduce((sum, r) => sum + r.releasedCount, 0);
            const secPendingCount = section.rows.reduce((sum, r) => sum + r.pendingCount, 0);

            return `
              <div class="category-section-title">
                <span>${section.label}</span>
                <span class="totals">
                  Entities: ${section.rows.length} | 
                  Released: ₱${secReleased.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} (${secReleaseCount}) | 
                  Pending: ₱${secPending.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} (${secPendingCount}) | 
                  Total: ₱${secTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>
              <table>
                <thead>
                  <tr>
                    <th style="width: 40%">Stakeholder Name</th>
                    <th style="width: 20%; text-align: right;">Released Count / Amount</th>
                    <th style="width: 20%; text-align: right;">Pending Count / Amount</th>
                    <th style="width: 20%; text-align: right;">Combined Balance (PHP)</th>
                  </tr>
                </thead>
                <tbody>
                  ${section.rows.map(row => `
                    <tr>
                      <td><strong>${row.name}</strong></td>
                      <td class="amount">
                        <div>₱${row.releasedAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                        <div class="count-badge">${row.releasedCount} released</div>
                      </td>
                      <td class="amount" style="color: #2563eb;">
                        <div>₱${row.pendingAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                        <div class="count-badge">${row.pendingCount} pending</div>
                      </td>
                      <td class="amount" style="font-size: 11px; color: #0f172a;">
                        ₱${row.totalAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
            `;
          }).join('')}

          <div class="footer">
            <p>CONFIDENTIAL &amp; PROPRIETARY — CITY SOCIAL WELFARE AND DEVELOPMENT OFFICE (CSWDO), MABALACAT CITY</p>
            <p>This is a computer-generated summary report. End of sheet.</p>
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
      
      {/* Title Header with Export controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-blue-600" />
            <h2 className="text-sm font-black text-slate-800 uppercase tracking-widest leading-none">Financial Summary Report</h2>
          </div>
          <p className="mt-1.5 text-xs text-slate-400 font-medium">
            Real-time calculation of processed payments, pending vouchers, and released funds per stakeholder.
          </p>
        </div>

        {/* Action triggers */}
        <div className="flex items-center gap-2 self-start sm:self-auto">
          <button
            onClick={handleExportCSV}
            className="bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 rounded-xl px-4 py-2.5 text-xs font-bold transition-all flex items-center gap-2 cursor-pointer shadow-sm"
            title="Download CSV database of financial data"
          >
            <Download className="h-4 w-4" />
            <span>Export CSV</span>
          </button>

          <button
            onClick={handlePrint}
            className="bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 rounded-xl px-4 py-2.5 text-xs font-bold transition-all flex items-center gap-2 cursor-pointer shadow-sm"
            title="Print report overview sheet"
          >
            <Printer className="h-4 w-4" />
            <span>Print Report</span>
          </button>
        </div>
      </div>

      {/* Primary KPI Mini-Dashboard */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        
        {/* KPI 1: All time Released */}
        <div className="bg-gradient-to-tr from-emerald-50/50 to-emerald-100/10 border border-emerald-100/80 rounded-2xl p-5 relative overflow-hidden flex items-center gap-4">
          <div className="bg-emerald-500/10 text-emerald-600 p-3 rounded-xl border border-emerald-500/10 shrink-0">
            <CheckCircle className="h-6 w-6" />
          </div>
          <div>
            <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Released Funds</span>
            <h3 className="text-lg sm:text-xl font-bold text-slate-800 font-mono mt-0.5">
              ₱{summaryStats.totalReleased.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </h3>
            <p className="text-[10px] text-emerald-600 font-semibold mt-1 flex items-center gap-0.5">
              <span>{summaryStats.releasedCount} Statements Released</span>
            </p>
          </div>
        </div>

        {/* KPI 2: Current In-pipeline */}
        <div className="bg-gradient-to-tr from-blue-50/50 to-blue-100/10 border border-blue-100/80 rounded-2xl p-5 relative overflow-hidden flex items-center gap-4">
          <div className="bg-blue-500/10 text-blue-600 p-3 rounded-xl border border-blue-500/10 shrink-0">
            <Clock className="h-6 w-6" />
          </div>
          <div>
            <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider">In Pipeline (Pending)</span>
            <h3 className="text-lg sm:text-xl font-bold text-blue-600 font-mono mt-0.5">
              ₱{summaryStats.totalPending.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </h3>
            <p className="text-[10px] text-blue-600 font-semibold mt-1 flex items-center gap-0.5">
              <span>{summaryStats.pendingCount} Documents Processing</span>
            </p>
          </div>
        </div>

        {/* KPI 3: Combined volume */}
        <div className="bg-gradient-to-tr from-slate-50 to-slate-100/40 border border-slate-200/60 rounded-2xl p-5 relative overflow-hidden flex items-center gap-4">
          <div className="bg-slate-500/10 text-slate-600 p-3 rounded-xl border border-slate-500/10 shrink-0">
            <Building2 className="h-6 w-6" />
          </div>
          <div>
            <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Total Combined Portfolio</span>
            <h3 className="text-lg sm:text-xl font-bold text-slate-800 font-mono mt-0.5">
              ₱{summaryStats.totalOverall.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </h3>
            <p className="text-[10px] text-slate-500 font-semibold mt-1 flex items-center gap-0.5">
              <span>Over {summaryStats.stakeholdersCount} Active Entities</span>
            </p>
          </div>
        </div>

      </div>

      {/* Filter and Search Bar Section */}
      <div className="bg-slate-50/50 border border-slate-200/50 rounded-2xl p-4 sm:p-5 flex flex-col gap-4">
        
        {/* Search Input, Category filter, Amount state filter */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3.5">
          
          <div className="md:col-span-4 relative">
            <Search className="absolute left-3.5 top-3.5 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search stakeholder name..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-white border border-slate-200 rounded-xl pl-10 pr-4 py-3 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-blue-500/15 focus:border-blue-500 placeholder-slate-400 text-slate-700 shadow-sm"
            />
          </div>

          {/* Category Filter */}
          <div className="md:col-span-3">
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="w-full bg-white border border-slate-200 border-solid rounded-xl px-4 py-3 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-blue-500/15 focus:border-blue-500 text-slate-700 shadow-sm cursor-pointer"
            >
              <option value="all">Filter: All Stakeholder Categories</option>
              <option value="hospital">Hospitals &amp; Medical Centers</option>
              <option value="funeral">Funeral Services &amp; Chapels</option>
              <option value="laboratories">Laboratories &amp; Diagnostics</option>
            </select>
          </div>

          {/* Amount Presence quick toggle (filtering Release and Pending as requested) */}
          <div className="md:col-span-5 flex rounded-xl border border-slate-200/80 p-1 bg-white shadow-sm shrink-0">
            <button
              onClick={() => setAmountTypeFilter("all")}
              className={`flex-1 py-2 text-center rounded-lg text-xs font-black uppercase tracking-wider transition-all cursor-pointer ${
                amountTypeFilter === "all"
                  ? "bg-blue-600 text-white shadow-sm"
                  : "text-slate-500 hover:text-slate-800"
              }`}
            >
              All Assets
            </button>
            <button
              onClick={() => setAmountTypeFilter("released")}
              className={`flex-1 py-2 text-center rounded-lg text-xs font-black uppercase tracking-wider transition-all cursor-pointer ${
                amountTypeFilter === "released"
                  ? "bg-emerald-600 text-white shadow-sm"
                  : "text-slate-500 hover:text-slate-800"
              }`}
            >
              With Released
            </button>
            <button
              onClick={() => setAmountTypeFilter("pending")}
              className={`flex-1 py-2 text-center rounded-lg text-xs font-black uppercase tracking-wider transition-all cursor-pointer ${
                amountTypeFilter === "pending"
                  ? "bg-blue-600 text-white shadow-sm shrink-0"
                  : "text-slate-500 hover:text-slate-800"
              }`}
            >
              With Pending
            </button>
          </div>

        </div>

        {/* Results badge panel */}
        <div className="flex items-center justify-between text-xs font-bold text-slate-500 py-2.5 px-3 bg-white rounded-xl border border-slate-200/50 shadow-sm">
          <div className="flex items-center gap-1.5 font-sans">
            <span className="p-1 bg-slate-100 rounded-md text-slate-700 font-mono text-[10px] uppercase font-black">
              {sortedAndFilteredData.length}
            </span>
            <span className="text-slate-400 text-[10px] font-black uppercase tracking-wider">Entities match filters</span>
          </div>

          <div className="text-[10px] text-slate-400 font-normal italic font-sans flex items-center gap-1">
            <Sparkles className="h-3 w-3 text-blue-500 animate-pulse" />
            <span>Values update dynamically from database feeds.</span>
          </div>
        </div>

      </div>

      {/* Main Report Table Container */}
      <div className="border border-slate-100 rounded-3xl overflow-hidden shadow-sm bg-white overflow-x-auto min-w-full">
        <table className="min-w-full divide-y divide-slate-100 table-fixed sm:table-auto">
          <thead className="bg-slate-50/75 border-b border-slate-100">
            <tr>
              <th 
                onClick={() => toggleSort("name")}
                className="px-6 py-4 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest cursor-pointer hover:bg-slate-100/50 transition-all select-none w-1/3"
              >
                <div className="flex items-center gap-1.5">
                  <span>Stakeholder Name</span>
                  <ChevronDown className={`h-3.5 w-3.5 text-slate-400 transform transition-transform ${
                    sortBy === "name" ? (sortOrder === "desc" ? "rotate-180 text-blue-600" : "text-blue-600") : "opacity-30"
                  }`} />
                </div>
              </th>
              <th className="px-6 py-4 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest w-1/6">
                Category
              </th>
              <th 
                onClick={() => toggleSort("released")}
                className="px-6 py-4 text-right text-[10px] font-black text-slate-400 uppercase tracking-widest cursor-pointer hover:bg-slate-100/50 transition-all select-none w-1/5"
              >
                <div className="flex items-center justify-end gap-1.5">
                  <span className="text-emerald-700">Released Amount</span>
                  <ChevronDown className={`h-3.5 w-3.5 text-slate-400 transform transition-transform ${
                    sortBy === "released" ? (sortOrder === "desc" ? "rotate-180 text-emerald-600" : "text-emerald-600") : "opacity-30"
                  }`} />
                </div>
              </th>
              <th 
                onClick={() => toggleSort("pending")}
                className="px-6 py-4 text-right text-[10px] font-black text-slate-400 uppercase tracking-widest cursor-pointer hover:bg-slate-100/50 transition-all select-none w-1/5"
              >
                <div className="flex items-center justify-end gap-1.5">
                  <span className="text-blue-600">Pending Amount</span>
                  <ChevronDown className={`h-3.5 w-3.5 text-slate-400 transform transition-transform ${
                    sortBy === "pending" ? (sortOrder === "desc" ? "rotate-180 text-blue-600" : "text-blue-600") : "opacity-30"
                  }`} />
                </div>
              </th>
              <th 
                onClick={() => toggleSort("total")}
                className="px-6 py-4 text-right text-[10px] font-black text-slate-400 uppercase tracking-widest cursor-pointer hover:bg-slate-100/50 transition-all select-none w-1/5"
              >
                <div className="flex items-center justify-end gap-1.5">
                  <span className="text-slate-800">Total Portfolio</span>
                  <ChevronDown className={`h-3.5 w-3.5 text-slate-400 transform transition-transform ${
                    sortBy === "total" ? (sortOrder === "desc" ? "rotate-180 text-slate-800" : "text-slate-800") : "opacity-30"
                  }`} />
                </div>
              </th>
            </tr>
          </thead>
          
          <tbody className="divide-y divide-slate-100 bg-white">
            <AnimatePresence mode="popLayout">
              {sortedAndFilteredData.map((row, index) => (
                <motion.tr
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.15, delay: Math.min(index * 0.02, 0.2) }}
                  key={row.name}
                  className="hover:bg-slate-50/60 transition-colors"
                >
                  {/* Name cell */}
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      {getCategoryIcon(row.category)}
                      <div className="min-w-0">
                        <span className="block text-xs font-bold text-slate-800 leading-snug truncate max-w-[200px] sm:max-w-none">
                          {row.name}
                        </span>
                        <span className="block text-[10px] text-slate-400 font-sans mt-0.5 font-medium uppercase tracking-wider">
                          {row.totalCount} statements logged
                        </span>
                      </div>
                    </div>
                  </td>

                  {/* Category badge */}
                  <td className="px-6 py-4">
                    <span className="inline-flex items-center px-2 py-1 rounded-lg text-[9px] font-black uppercase tracking-wider bg-slate-50 text-slate-500 border border-slate-150">
                      {row.category}
                    </span>
                  </td>

                  {/* Released Funds cell */}
                  <td className="px-6 py-4 text-right">
                    <span className="block text-xs font-bold text-emerald-600 font-mono">
                      ₱{row.releasedAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                    <span className="block text-[9px] font-bold text-emerald-500/70 font-sans mt-0.5 uppercase tracking-wide">
                      {row.releasedCount} released SOAs
                    </span>
                  </td>

                  {/* Pending Funds cell (with custom style) */}
                  <td className="px-6 py-4 text-right">
                    <span className="block text-xs font-bold text-blue-600 font-mono">
                      ₱{row.pendingAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                    <span className="block text-[9px] font-bold text-blue-500/70 font-sans mt-0.5 uppercase tracking-wide">
                      {row.pendingCount} pending SOAs
                    </span>
                  </td>

                  {/* Total Portfolio cell */}
                  <td className="px-6 py-4 text-right">
                    <span className="block text-xs font-black text-slate-800 font-mono">
                      ₱{row.totalAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                    <span className="block text-[9px] text-slate-400 font-sans mt-0.5 uppercase tracking-widest font-black">
                      Combined Sum
                    </span>
                  </td>

                </motion.tr>
              ))}
            </AnimatePresence>

            {sortedAndFilteredData.length === 0 && (
              <tr>
                <td colSpan={5} className="py-12 text-center text-slate-400">
                  <div className="flex flex-col items-center justify-center space-y-2">
                    <Building className="h-8 w-8 text-slate-300 animate-bounce" />
                    <span className="text-xs font-bold">No financials matched your search criteria</span>
                    <p className="text-[10px] text-slate-400 max-w-xs font-medium font-sans">
                      Try resetting your search filters or check different categories.
                    </p>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

    </div>
  );
}
