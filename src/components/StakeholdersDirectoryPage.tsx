import React, { useState, useMemo } from "react";
import { Stakeholder, SOADoc, UserProfile } from "../types";
import { 
  Building2, HeartPulse, FileText, Search, Plus, X, BookUser, Edit2, Trash2, Sparkles, Flower
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { updateStakeholder, deleteStakeholder, clearAllStakeholders } from "../firebase/stakeholdersDb";

interface StakeholdersDirectoryPageProps {
  stakeholders: Stakeholder[];
  currentUser?: UserProfile | null;
  soas?: SOADoc[];
  onSelectStakeholder?: (name: string) => void;
  onCreateStakeholder: (data: Omit<Stakeholder, "id" | "createdAt">) => Promise<void>;
}

export default function StakeholdersDirectoryPage({
  stakeholders,
  currentUser,
  onCreateStakeholder
}: StakeholdersDirectoryPageProps) {
  const getDefaultSelectedCategory = () => {
    if (!currentUser || currentUser.role === "System Administrator" || currentUser.role === "Admin") return "all";
    const cat = currentUser.category?.toLowerCase();
    if (cat === "hospital") return "hospital";
    if (cat === "funeral") return "funeral";
    if (cat === "laboratory" || cat === "laboratories") return "laboratories";
    return "all";
  };

  const [selectedCategory, setSelectedCategory] = useState<"all" | "hospital" | "funeral" | "laboratories">("all");
  const [searchQuery, setSearchQuery] = useState("");
  
  // Add Modal State
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newOrgName, setNewOrgName] = useState("");

  const getDefaultNewCategory = () => {
    if (!currentUser) return "hospital";
    const cat = currentUser.category?.toLowerCase();
    if (cat === "hospital") return "hospital";
    if (cat === "funeral") return "funeral";
    if (cat === "laboratory" || cat === "laboratories") return "laboratories";
    return "hospital";
  };
  const [newOrgCategory, setNewOrgCategory] = useState<"hospital" | "funeral" | "laboratories">("hospital");

  // Edit State
  const [editingStakeholder, setEditingStakeholder] = useState<Stakeholder | null>(null);

  React.useEffect(() => {
    setSelectedCategory(getDefaultSelectedCategory());
  }, [currentUser]);

  React.useEffect(() => {
    if (isAddModalOpen && !editingStakeholder) {
      setNewOrgCategory(getDefaultNewCategory());
    }
  }, [isAddModalOpen, currentUser, editingStakeholder]);

  const sortedStakeholders = useMemo(() => {
    return [...stakeholders].sort((a, b) => a.name.localeCompare(b.name));
  }, [stakeholders]);

  const filteredStakeholders = useMemo(() => {
    return sortedStakeholders.filter(item => {
      const isHospital = item.category === "hospital" || item.category === "health";
      const categoryMatch = selectedCategory === "all" || 
                           (selectedCategory === "hospital" ? isHospital : item.category === selectedCategory);
      const searchMatch = item.name.toLowerCase().includes(searchQuery.toLowerCase());
      return categoryMatch && searchMatch;
    });
  }, [sortedStakeholders, selectedCategory, searchQuery]);

  const handleDelete = async (id: string) => {
    if (confirm("Are you sure you want to delete this stakeholder?")) {
      await deleteStakeholder(id);
    }
  };

  const handleEdit = (st: Stakeholder) => {
    setEditingStakeholder(st);
    setNewOrgName(st.name);
    setNewOrgCategory(st.category);
    setIsAddModalOpen(true);
  };

  // Aggregate numbers
  const stats = useMemo(() => {
    let healthCount = 0;
    let funeralCount = 0;
    let laboratoriesCount = 0;

    sortedStakeholders.forEach(item => {
      if (item.category === "hospital" || item.category === "health") healthCount++;
      else if (item.category === "funeral") funeralCount++;
      else laboratoriesCount++;
    });

    return { healthCount, funeralCount, laboratoriesCount, totalCount: sortedStakeholders.length };
  }, [sortedStakeholders]);

  const handleInitializeDefaults = async () => {
    const defaultStakeholders: Omit<Stakeholder, "id" | "createdAt">[] = [
      { name: "Mabalacat District Hospital", category: "hospital" },
      { name: "St. Raphael Foundation Medical Center", category: "hospital" },
      { name: "JBL Regional Memorial Hospital", category: "hospital" },
      { name: "Tiglao Medical Center Foundation", category: "hospital" },
      { name: "Mabalacat City Health Office", category: "hospital" },
      { name: "Philippine Red Cross - Clark", category: "hospital" },
      { name: "TGN Funeral Services", category: "funeral" },
      { name: "La Pieta Memorial Park", category: "funeral" },
      { name: "Mabalacat Memorial Chapel", category: "funeral" },
      { name: "Hi-Precision Diagnostics - Mabalacat", category: "laboratories" },
      { name: "QualiMed Hospital - San Fernando", category: "hospital" }
    ];
    
    if (confirm("Populate directory with default Mabalacat City partner stakeholders?")) {
      for (const st of defaultStakeholders) {
        await onCreateStakeholder(st);
      }
    }
  };

  return (
    <div className="space-y-6">
      {/* Visual Header */}
      <div className="bg-white border border-slate-100 rounded-2xl sm:rounded-3xl p-5 sm:p-8 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-2">
          <div className="inline-flex items-center gap-2 bg-slate-100 px-3 py-1 rounded-full text-[9px] sm:text-[10px] uppercase font-black tracking-widest text-slate-600">
            <BookUser className="h-3 sm:h-3.5 w-3 sm:h-3.5" />
            Registry
          </div>
          <h2 className="text-lg sm:text-2xl font-black uppercase tracking-tight text-slate-800 leading-tight">
            Stakeholders Directory
          </h2>
          <p className="text-slate-500 text-[11px] sm:text-xs font-semibold leading-relaxed max-w-xl">
            Centralized registry of all partner entities. Browse health providers, funeral services, and diagnostic laboratories affiliated with the tracking system.
          </p>
          <button 
            onClick={handleInitializeDefaults}
            className="text-[9px] sm:text-[10px] text-blue-500 font-bold uppercase tracking-wider hover:underline mt-2 flex items-center gap-1 cursor-pointer"
          >
            <Sparkles className="h-2.5 sm:h-3 w-2.5 sm:h-3" />
            Initialize Mabalacat Partners
          </button>
        </div>
        
        {/* Dynamic visual numbers */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 sm:gap-3 shrink-0">
          <div className="bg-slate-50 border border-slate-100 rounded-xl sm:rounded-2xl p-3 sm:p-4 text-center">
            <span className="block text-[8px] sm:text-[10px] text-slate-400 uppercase font-black tracking-widest leading-none">Hospital</span>
            <span className="block text-xl sm:text-2xl font-black text-rose-500 mt-1">{stats.healthCount}</span>
          </div>
          <div className="bg-slate-50 border border-slate-100 rounded-xl sm:rounded-2xl p-3 sm:p-4 text-center">
            <span className="block text-[8px] sm:text-[10px] text-slate-400 uppercase font-black tracking-widest leading-none">Funeral</span>
            <span className="block text-xl sm:text-2xl font-black text-amber-500 mt-1">{stats.funeralCount}</span>
          </div>
          <div className="bg-slate-50 border border-slate-100 rounded-xl sm:rounded-2xl p-3 sm:p-4 text-center col-span-2 sm:col-span-1">
            <span className="block text-[8px] sm:text-[10px] text-slate-400 uppercase font-black tracking-widest leading-none">LABORATORY</span>
            <span className="block text-xl sm:text-2xl font-black text-blue-500 mt-1">{stats.laboratoriesCount}</span>
          </div>
        </div>
      </div>

      <div className="bg-white border border-slate-100 rounded-2xl sm:rounded-3xl p-5 sm:p-6 shadow-sm space-y-6">
        {/* Controls */}
        <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4">
          <div className="flex flex-wrap bg-slate-50 border border-slate-100 rounded-2xl p-1 select-none w-full xl:w-auto">
            {(["all", "hospital", "funeral", "laboratories"] as const).map(cat => {
              const userCategory = currentUser?.category?.toLowerCase();
              const isRestricted = currentUser?.role !== "System Administrator" && currentUser?.role !== "Admin" && !!userCategory;
              if (isRestricted && cat !== "all") {
                 const normalizedCat = cat === "laboratories" ? "laboratory" : cat;
                 const normalizedUserCat = userCategory === "laboratories" ? "laboratory" : userCategory;
                 if (normalizedCat !== normalizedUserCat) return null;
              }

              return (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`flex-1 sm:flex-none py-2 px-3 sm:px-4 text-[9px] sm:text-[10px] font-black uppercase tracking-wider rounded-xl transition-all cursor-pointer ${
                    selectedCategory === cat 
                      ? "bg-slate-900 text-white shadow-sm" 
                      : "text-slate-500 hover:text-slate-900 hover:bg-slate-100"
                  }`}
                >
                  {cat === 'laboratories' ? 'laboratory' : cat}
                </button>
              );
            })}
          </div>
          
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full xl:w-auto">
            <div className="relative flex-grow min-w-0 sm:min-w-[240px]">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search partner registry..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 pl-11 pr-4 py-3 rounded-2xl text-[11px] sm:text-xs font-bold text-slate-800 placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:bg-white transition-all shadow-inner"
              />
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={async () => {
                  if (confirm("Are you sure you want to clear ALL stakeholders?")) {
                    await clearAllStakeholders();
                  }
                }}
                className="flex-1 sm:flex-none px-4 h-11 bg-slate-50 text-slate-500 border border-slate-200 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-rose-50 hover:text-rose-600 hover:border-rose-100 transition-all"
              >
                  Clear All
              </button>
              <button
                onClick={() => {
                  setEditingStakeholder(null);
                  setNewOrgName("");
                  setNewOrgCategory("hospital");
                  setIsAddModalOpen(true);
                }}
                className="flex-[2] sm:flex-none flex items-center justify-center gap-2 h-11 px-6 bg-blue-600 text-white rounded-2xl border border-blue-500 hover:bg-blue-700 transition-all shadow-md shadow-blue-500/10"
              >
                <Plus className="h-4 w-4" />
                <span className="text-[10px] font-black uppercase tracking-wider">Add Partner</span>
              </button>
            </div>
          </div>
        </div>

        {/* Directory Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredStakeholders.length === 0 ? (
            <div className="col-span-full py-16 text-center border-2 border-dashed border-slate-100 rounded-3xl">
              <Building2 className="h-10 w-10 text-slate-300 mx-auto stroke-1" />
              <h4 className="text-sm font-bold text-slate-500 uppercase tracking-wider mt-4">No Stakeholders Found</h4>
              <p className="text-xs text-slate-400 mt-2">Try clearing your filters or adding a new organization.</p>
            </div>
          ) : (
            filteredStakeholders.map(group => (
              <div 
                key={group.id}
                className="group flex flex-col bg-white border border-slate-200 rounded-2xl p-5 hover:border-blue-300 hover:shadow-lg hover:shadow-blue-500/5 transition-all relative"
              >
                <div className="absolute top-3 right-3 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button 
                    onClick={() => handleEdit(group)}
                    className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                  >
                    <Edit2 className="h-3.5 w-3.5" />
                  </button>
                  <button 
                    onClick={() => handleDelete(group.id)}
                    className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
                <div className="flex items-start gap-4 flex-grow">
                  <div className={`p-3 rounded-xl shrink-0 ${
                    group.category === "hospital" || group.category === "health" 
                      ? "bg-rose-50 text-rose-500" 
                      : group.category === "funeral" 
                      ? "bg-amber-50 text-amber-500" 
                      : "bg-slate-100 text-slate-500"
                  }`}>
                    {group.category === "hospital" || group.category === "health" ? (
                      <HeartPulse className="h-5 w-5" />
                    ) : group.category === "funeral" ? (
                      <Flower className="h-5 w-5" />
                    ) : (
                      <FileText className="h-5 w-5" />
                    )}
                  </div>
                  <div className="min-w-0">
                    <h4 className="text-sm font-black text-slate-800 uppercase tracking-wider leading-tight">
                      {group.name}
                    </h4>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mt-1">
                      {group.category} Entity
                    </span>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Add Stakeholder Modal */}
      <AnimatePresence>
        {isAddModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              exit={{ opacity: 0 }} 
              className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
              onClick={() => setIsAddModalOpen(false)}
            />
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 10 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 10 }}
              className="relative w-full max-w-md bg-white rounded-3xl shadow-xl border border-slate-100 overflow-hidden"
            >
              <div className="flex items-center justify-between p-6 border-b border-slate-100 bg-slate-50/50">
                <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest flex items-center gap-2">
                  <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 shrink-0">
                    <Building2 className="h-4 w-4" />
                  </div>
                  {editingStakeholder ? "Edit Stakeholder" : "Add New Stakeholder"}
                </h3>
                <button
                  onClick={() => setIsAddModalOpen(false)}
                  className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="p-6 space-y-5">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Stakeholder Name</label>
                  <input
                    type="text"
                    value={newOrgName}
                    onChange={e => setNewOrgName(e.target.value)}
                    placeholder="Enter organization or provider name..."
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-semibold text-slate-800 focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 placeholder-slate-400"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Stakeholder Category {(currentUser?.role !== "System Administrator" && currentUser?.role !== "Admin" && !!currentUser?.category) && "(Restricted)"}</label>
                  <div className="grid grid-cols-3 gap-2">
                    {(["hospital", "funeral", "laboratories"] as const).map(cat => {
                       const userCategory = currentUser?.category?.toLowerCase();
                       const isRestricted = currentUser?.role !== "System Administrator" && currentUser?.role !== "Admin" && !!userCategory;
                       const normalizedCat = cat === "laboratories" ? "laboratory" : cat;
                       const normalizedUserCat = userCategory === "laboratories" ? "laboratory" : userCategory;
                       const disabled = isRestricted && normalizedCat !== normalizedUserCat;

                       return (
                        <button
                          key={cat}
                          disabled={disabled}
                          onClick={() => setNewOrgCategory(cat)}
                          className={`py-3 px-2 rounded-xl border text-[11px] uppercase tracking-wider font-bold transition-all flex flex-col items-center gap-1.5 ${
                            newOrgCategory === cat 
                              ? "bg-slate-900 border-slate-900 text-white shadow-sm" 
                              : disabled
                                ? "bg-slate-50 border-slate-100 text-slate-300 opacity-50 cursor-not-allowed"
                                : "bg-white border-slate-200 text-slate-500 hover:border-slate-300 hover:bg-slate-50"
                          }`}
                        >
                          {cat === "hospital" ? <HeartPulse className="h-4 w-4" /> : cat === "funeral" ? <Building2 className="h-4 w-4" /> : <FileText className="h-4 w-4" />}
                          {cat}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              <div className="p-6 border-t border-slate-100 bg-slate-50/50 flex justify-end gap-3 text-black">
                <button
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-5 py-2.5 rounded-xl text-xs font-bold text-slate-500 hover:text-slate-700 hover:bg-slate-200/50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={async () => {
                    if (!newOrgName.trim()) return;
                    if (editingStakeholder) {
                      await updateStakeholder(editingStakeholder.id, { name: newOrgName.trim(), category: newOrgCategory });
                    } else {
                      await onCreateStakeholder({ name: newOrgName.trim(), category: newOrgCategory });
                    }
                    setNewOrgName("");
                    setNewOrgCategory("hospital");
                    setEditingStakeholder(null);
                    setIsAddModalOpen(false);
                  }}
                  disabled={!newOrgName.trim()}
                  className="px-6 py-2.5 rounded-xl bg-blue-600 text-white text-xs font-black uppercase tracking-widest hover:bg-blue-700 disabled:opacity-50 transition-colors shadow-sm shadow-blue-600/20"
                >
                  {editingStakeholder ? "Save Changes" : "Save Stakeholder"}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
