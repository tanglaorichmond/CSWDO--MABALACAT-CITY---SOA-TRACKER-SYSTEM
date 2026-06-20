import React, { useState } from "react";
import { X, Calendar, Tag, FileSpreadsheet } from "lucide-react";
import { Stakeholder, UserProfile } from "../types";

interface NewSOAModalProps {
  isOpen: boolean;
  stakeholders?: Stakeholder[];
  currentUser?: UserProfile | null;
  onClose: () => void;
  onSubmit: (data: {
    dateReceived: string;
    stakeholderName: string;
    stakeholderCategory: "hospital" | "funeral" | "laboratories";
    batchNumber: string;
    totalAmount: number;
    submissionOfSoa: boolean;
  }) => void;
}

export default function NewSOAModal({ isOpen, stakeholders = [], currentUser, onClose, onSubmit }: NewSOAModalProps) {
  const getDefaultCategory = () => {
    if (!currentUser) return "hospital";
    const cat = currentUser.category?.toLowerCase();
    if (cat === "hospital") return "hospital";
    if (cat === "funeral") return "funeral";
    if (cat === "laboratory" || cat === "laboratories") return "laboratories";
    return "hospital";
  };

  const [dateReceived, setDateReceived] = useState(new Date().toISOString().split("T")[0]);
  const [stakeholderName, setStakeholderName] = useState("");
  const [stakeholderCategory, setStakeholderCategory] = useState<"hospital" | "funeral" | "laboratories">("hospital");
  const [showDropdown, setShowDropdown] = useState(false);
  const [batchNumber, setBatchNumber] = useState("");
  const [totalAmount, setTotalAmount] = useState("");
  const [submissionOfSoa, setSubmissionOfSoa] = useState(true); // default true upon logs creation
  const [errors, setErrors] = useState<{ [key: string]: string }>({});

  React.useEffect(() => {
    if (isOpen) {
      setStakeholderCategory(getDefaultCategory());
      setDateReceived(new Date().toISOString().split("T")[0]);
      setStakeholderName("");
      setBatchNumber("");
      setTotalAmount("");
      setSubmissionOfSoa(true);
      setErrors({});
    }
  }, [isOpen, currentUser]);

  const isDisabled = currentUser?.role !== "System Administrator" && !!currentUser?.category;

  if (!isOpen) return null;

  const filteredHealth = stakeholders
    .filter(s => (s.category === "hospital" || s.category === "health") && s.name.toLowerCase().includes(stakeholderName.toLowerCase()))
    .map(s => s.name);

  const filteredFuneral = stakeholders
    .filter(s => s.category === "funeral" && s.name.toLowerCase().includes(stakeholderName.toLowerCase()))
    .map(s => s.name);

  const filteredLaboratories = stakeholders
    .filter(s => (s.category === "laboratories" || s.category === "laboratory" || s.category === "lab") && s.name.toLowerCase().includes(stakeholderName.toLowerCase()))
    .map(s => s.name);

  const hasSuggestions = filteredHealth.length > 0 || filteredFuneral.length > 0 || filteredLaboratories.length > 0;

  const formatAmount = (val: string) => {
    // Remove all non-numeric except decimal
    const clean = val.replace(/[^0-9.]/g, "");
    const parts = clean.split(".");
    // Only allow one decimal point
    if (parts.length > 2) return totalAmount;
    
    // Format integer part with commas
    parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ",");
    return parts.join(".");
  };

  const validate = () => {
    const newErrors: { [key: string]: string } = {};
    if (!dateReceived) newErrors.dateReceived = "Received Date is required";
    if (!stakeholderName.trim()) newErrors.stakeholderName = "Stakeholder name is required";
    if (!batchNumber.trim()) newErrors.batchNumber = "Batch identifier number is required";
    
    const numericAmount = parseFloat(totalAmount.replace(/,/g, ""));
    if (totalAmount === "" || isNaN(numericAmount) || numericAmount <= 0) {
      newErrors.totalAmount = "Please input a positive numeric Amount";
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (validate()) {
      onSubmit({
        dateReceived,
        stakeholderName,
        stakeholderCategory,
        batchNumber,
        totalAmount: parseFloat(totalAmount.replace(/,/g, "")),
        submissionOfSoa
      });
      // Reset state form inputs
      setDateReceived(new Date().toISOString().split("T")[0]);
      setStakeholderName("");
      setBatchNumber("");
      setTotalAmount("");
      setSubmissionOfSoa(true);
      setErrors({});
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/65 backdrop-blur-md z-[100] flex items-center justify-center p-0 sm:p-4">
      <div className="bg-white w-full max-w-lg h-full sm:h-auto sm:rounded-3xl border border-slate-100 shadow-2xl overflow-hidden flex flex-col animate-scale-up">
        {/* Title head banner */}
        <div className="bg-slate-900 text-white p-5 sm:p-6 border-b border-slate-800 flex justify-between items-center shrink-0">
          <div>
            <h3 className="text-base sm:text-lg font-bold tracking-tight uppercase">Step 1: Log Intake SOA</h3>
            <p className="text-[10px] sm:text-xs text-slate-400 mt-0.5 font-bold uppercase tracking-widest">Register incoming file into tracking ledger</p>
          </div>
          <button 
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content body Form */}
        <form onSubmit={handleFormSubmit} className="flex-grow overflow-y-auto p-5 sm:p-6 space-y-6 sm:space-y-5 hide-scrollbar">
          
          {/* Stakeholder Category Selector */}
          <div className="space-y-2">
            <label className="text-[10px] sm:text-xs font-black text-slate-700 uppercase tracking-widest block">1. Select Target Category {isDisabled && "(Restricted to your Assigned Category)"}</label>
            <div className="grid grid-cols-3 gap-2">
              {(["hospital", "funeral", "laboratories"] as const).map((cat) => (
                <button
                  key={cat}
                  type="button"
                  disabled={isDisabled && stakeholderCategory !== cat}
                  onClick={() => {
                    setStakeholderCategory(cat);
                    setStakeholderName(""); // Clear name when switching categories to avoid confusion
                  }}
                  className={`py-3 sm:py-2 px-1 rounded-xl border text-[9px] sm:text-[10px] font-black uppercase tracking-tight transition-all flex flex-col items-center gap-1.5 sm:gap-1 shadow-sm ${
                    stakeholderCategory === cat 
                      ? "bg-slate-900 border-slate-900 text-white shadow-md shadow-slate-900/10" 
                      : isDisabled 
                        ? "bg-slate-50 border-slate-100 text-slate-300 opacity-50 cursor-not-allowed"
                        : "bg-white border-slate-200 text-slate-500 hover:border-slate-300 hover:bg-slate-50"
                  }`}
                >
                  <span className="text-base sm:text-lg">{cat === "hospital" ? "🏥" : cat === "funeral" ? "⚰️" : "🔬"}</span>
                  <span className="truncate w-full block">{cat}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Date Received */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">Date Received by CSWDO</label>
            <div className="relative">
              <Calendar className="absolute left-3.5 top-3.5 h-4.5 w-4.5 text-slate-400" />
              <input
                type="date"
                value={dateReceived}
                onChange={(e) => setDateReceived(e.target.value)}
                className={`w-full rounded-xl border p-3 pl-11 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 bg-slate-50/50 ${
                  errors.dateReceived ? "border-red-300 focus:border-red-500 focus:ring-red-500/20" : "border-slate-200 focus:border-blue-500"
                }`}
              />
            </div>
            {errors.dateReceived && <p className="text-xs text-red-500 font-medium">{errors.dateReceived}</p>}
          </div>

          {/* Stakeholder Name */}
          <div className="space-y-1.5 relative">
            <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">2. Stakeholder / Payee Name</label>
            <div className="relative z-10">
              <Tag className="absolute left-3.5 top-3.5 h-4.5 w-4.5 text-slate-400" />
              <input
                type="text"
                placeholder={
                  stakeholderCategory === "hospital" ? "Search hospitals..." :
                  stakeholderCategory === "funeral" ? "Search funeral homes..." : "Search laboratories..."
                }
                value={stakeholderName}
                onFocus={() => setShowDropdown(true)}
                onChange={(e) => {
                  setStakeholderName(e.target.value);
                  setShowDropdown(true);
                }}
                className={`w-full rounded-xl border p-3 pl-11 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 bg-slate-50/50 ${
                  errors.stakeholderName ? "border-red-300 focus:border-red-500 focus:ring-red-500/20" : "border-slate-200 focus:border-blue-500"
                }`}
              />
            </div>

            {showDropdown && (
              <>
                <div 
                  className="fixed inset-0 z-20 cursor-default" 
                  onClick={() => setShowDropdown(false)} 
                />
                <div className="absolute left-0 right-0 top-full mt-1.5 bg-slate-900 border border-slate-700/50 rounded-2xl shadow-2xl z-40 max-h-68 overflow-y-auto divide-y divide-slate-800">
                  {/* Hospital Section */}
                  {stakeholderCategory === "hospital" && filteredHealth.length > 0 && (
                    <div className="p-2.5">
                      <div className="px-2.5 py-1 text-[10px] font-extrabold text-blue-400 bg-blue-400/10 rounded-md uppercase tracking-wider mb-1.5 border border-blue-400/20">
                        🏥 Registered Hospital List
                      </div>
                      <div className="grid grid-cols-1 gap-0.5">
                        {filteredHealth.map((name) => (
                          <button
                            key={name}
                            type="button"
                            onClick={() => {
                              setStakeholderName(name);
                              setShowDropdown(false);
                            }}
                            className="w-full text-left px-2.5 py-2 text-xs font-bold text-slate-300 hover:bg-slate-800 hover:text-white rounded-lg transition-colors border border-transparent hover:border-slate-700"
                          >
                            {name}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Funeral Section */}
                  {stakeholderCategory === "funeral" && filteredFuneral.length > 0 && (
                    <div className="p-2.5">
                      <div className="px-2.5 py-1 text-[10px] font-extrabold text-emerald-400 bg-emerald-400/10 rounded-md uppercase tracking-wider mb-1.5 border border-emerald-400/20">
                        ⚰️ Funeral Homes &amp; Memorials
                      </div>
                      <div className="grid grid-cols-1 gap-0.5">
                        {filteredFuneral.map((name) => (
                          <button
                            key={name}
                            type="button"
                            onClick={() => {
                              setStakeholderName(name);
                              setShowDropdown(false);
                            }}
                            className="w-full text-left px-2.5 py-2 text-xs font-bold text-slate-300 hover:bg-slate-800 hover:text-white rounded-lg transition-colors border border-transparent hover:border-slate-700"
                          >
                            {name}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Laboratories Section */}
                  {stakeholderCategory === "laboratories" && filteredLaboratories.length > 0 && (
                    <div className="p-2.5">
                      <div className="px-2.5 py-1 text-[10px] font-extrabold text-amber-400 bg-amber-400/10 rounded-md uppercase tracking-wider mb-1.5 border border-amber-400/20">
                        🔬 Laboratories
                      </div>
                      <div className="grid grid-cols-1 gap-0.5">
                        {filteredLaboratories.map((name) => (
                          <button
                            key={name}
                            type="button"
                            onClick={() => {
                              setStakeholderName(name);
                              setShowDropdown(false);
                            }}
                            className="w-full text-left px-2.5 py-2 text-xs font-bold text-slate-300 hover:bg-slate-800 hover:text-white rounded-lg transition-colors border border-transparent hover:border-slate-700"
                          >
                            {name}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {!hasSuggestions && (
                    <div className="p-4 text-center text-xs text-slate-500 font-semibold italic">
                      No matching {stakeholderCategory === "laboratories" ? "laboratories" : stakeholderCategory} found. 
                      <span className="block mt-1 text-[10px] not-italic text-slate-600 font-normal">Add to directory first or type manually.</span>
                    </div>
                  )}
                </div>
              </>
            )}

            {errors.stakeholderName && <p className="text-xs text-red-500 font-medium">{errors.stakeholderName}</p>}
          </div>

          {/* Batch Number */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">3. Batch ID / Reference Number</label>
            <div className="relative">
              <FileSpreadsheet className="absolute left-3.5 top-3.5 h-4.5 w-4.5 text-slate-400" />
              <input
                type="text"
                placeholder="e.g. BATCH-2026-6A, SOA-77983"
                value={batchNumber}
                onChange={(e) => setBatchNumber(e.target.value)}
                className={`w-full rounded-xl border p-3 pl-11 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 bg-slate-50/50 ${
                  errors.batchNumber ? "border-red-300 focus:border-red-500 focus:ring-red-500/20" : "border-slate-200 focus:border-blue-500"
                }`}
              />
            </div>
            {errors.batchNumber && <p className="text-xs text-red-500 font-medium">{errors.batchNumber}</p>}
          </div>

          {/* Total Amount */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">4. Total Amount (PHP)</label>
            <div className="relative">
              <span className="absolute left-3.5 top-3 text-sm font-bold text-slate-500">₱</span>
              <input
                type="text"
                placeholder="0.00"
                value={totalAmount}
                onChange={(e) => setTotalAmount(formatAmount(e.target.value))}
                className={`w-full rounded-xl border p-3 pl-8 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500/20 bg-slate-50/50 ${
                  errors.totalAmount ? "border-red-300 focus:border-red-500 focus:ring-red-500/20" : "border-slate-200 focus:border-blue-500"
                }`}
              />
            </div>
            {errors.totalAmount && <p className="text-xs text-red-500 font-medium">{errors.totalAmount}</p>}
          </div>

          {/* Checklist validation tag (Auto checkmark submission of SOA) */}
          <div className="bg-slate-50 border border-slate-100 p-4 rounded-xl flex items-start space-x-3">
            <input
              type="checkbox"
              id="submissionOfSoa"
              checked={submissionOfSoa}
              onChange={(e) => setSubmissionOfSoa(e.target.checked)}
              className="mt-1 h-4 w-4 rounded text-blue-600 focus:ring-blue-500"
            />
            <div className="text-xs text-slate-600">
              <label htmlFor="submissionOfSoa" className="font-bold text-slate-800 block cursor-pointer">
                Confirm initial Statement of Account Submission
              </label>
              Checking this acknowledges physically receiving the folder, with logged date, stakeholder payload and total billing currency ready for internal auditing.
            </div>
          </div>

          {/* Active Buttons CTA */}
          <div className="flex flex-col sm:flex-row gap-3 pt-6 border-t border-slate-100 shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="sm:flex-1 border-2 border-slate-100 text-slate-500 py-4 sm:py-3 rounded-2xl text-[10px] sm:text-xs font-black uppercase tracking-widest hover:bg-slate-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="sm:flex-[2] bg-blue-600 text-white py-4 sm:py-3 rounded-2xl text-[10px] sm:text-xs font-black uppercase tracking-widest hover:bg-blue-700 hover:scale-[1.01] active:scale-[0.99] transition-all shadow-lg shadow-blue-600/20"
            >
              Log to Movement Tracker
            </button>
          </div>

        </form>
      </div>
    </div>
  );
}
