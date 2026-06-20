import { useState } from "react";
import { 
  Building2, 
  Layers, 
  ShieldAlert, 
  LogOut, 
  Menu, 
  X, 
  Landmark,
  Compass,
  Workflow,
  BookUser,
  Settings
} from "lucide-react";
import { UserProfile, SLASettings } from "../types";
import { motion, AnimatePresence } from "motion/react";

interface SidebarProps {
  user: UserProfile | null;
  slaSettings: SLASettings | null;
  onLogout: () => void;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
}

export default function Sidebar({
  user,
  slaSettings,
  onLogout,
  activeTab,
  setActiveTab,
  isOpen,
  setIsOpen
}: SidebarProps) {
  if (!user) return null;

  const isGuest = user.role === "Guest";
  const isAdmin = user.role === "System Administrator";

  // Sidebar Menu Items based on user role and settings
  const menuItems = [
    {
      id: "dashboard",
      label: "Dashboard Specs",
      icon: Compass,
      roles: ["System Administrator", "Admin", "User"]
    },
    {
      id: "tracking",
      label: "SOA Tracker Report",
      icon: Layers,
      roles: ["System Administrator", "Admin", "User"]
    },
    {
      id: "directory",
      label: "Stakeholders Directory",
      icon: BookUser,
      roles: ["System Administrator", "Admin", "User"],
      visible: isAdmin || user.role === "Admin"
    },
    {
      id: "summary",
      label: "Roadmap Tracker",
      icon: Workflow,
      roles: ["System Administrator", "Admin", "User", "Guest"]
    },
    {
      id: "users",
      label: "Workspace Users",
      icon: ShieldAlert,
      roles: ["System Administrator"],
      visible: isAdmin
    },
    {
      id: "settings",
      label: "System Settings",
      icon: Settings,
      roles: ["System Administrator"],
      visible: isAdmin
    }
  ].filter(item => item.roles.includes(user.role) && (item.visible !== false));

  const toggleSidebar = () => setIsOpen(!isOpen);

  return (
    <>
      {/* Sidebar background drawer wrapper for Mobile */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsOpen(false)}
            className="fixed inset-0 bg-black/60 z-40 md:hidden"
          />
        )}
      </AnimatePresence>

      {/* Navigation panel */}
      <aside
        className={`fixed top-0 bottom-0 left-0 bg-slate-950 text-white w-70 border-r border-slate-900 flex flex-col z-50 transition-transform duration-300 md:relative md:translate-x-0 shrink-0 ${
          isOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {/* Header Branding section */}
        <div className="p-6 border-b border-slate-900 space-y-4">
          <div className="flex items-center space-x-3.5">
            <div className="h-11 w-11 bg-white rounded-xl flex items-center justify-center p-1 shadow-lg overflow-hidden shrink-0">
              <img 
                src="https://raw.githubusercontent.com/tanglaorichmondcswd-svg/MABALACAT-CITY-LOGO/787904c28a569b18cc4e23d3f6f16d7aaa024907/image.png" 
                alt="Mabalacat City Logo" 
                className="h-full w-full object-contain"
                referrerPolicy="no-referrer"
                onError={(e) => {
                  e.currentTarget.style.display = 'none';
                  const parent = e.currentTarget.parentElement;
                  if (parent) {
                    parent.className = "p-2.5 bg-gradient-to-tr from-blue-600 to-blue-500 rounded-xl text-white shadow-lg shadow-blue-600/20 h-11 w-11 flex items-center justify-center";
                    parent.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-building-2 h-6 w-6"><path d="M6 22V4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v18Z"/><path d="M6 12H4a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h2"/><path d="M18 9h2a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2h-2"/><path d="M10 6h4"/><path d="M10 10h4"/><path d="M10 14h4"/><path d="M10 18h4"/></svg>`;
                  }
                }}
              />
            </div>
            <div>
              <span className="text-sm uppercase tracking-widest text-blue-400 font-black block">CSWDO</span>
              <h2 className="text-[13px] font-black tracking-tight text-white leading-tight">Mabalacat City</h2>
            </div>
          </div>
          
          <div className="bg-slate-900/50 rounded-xl p-3 border border-slate-900">
            <div className="flex items-center space-x-1">
              <Landmark className="h-3 w-3 text-slate-400" />
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Mabalacat City</span>
            </div>
            <p className="text-[11px] text-slate-500 font-medium mt-1">Official Statements accounts pipeline monitoring console.</p>
          </div>
        </div>

        {/* Navigation list */}
        <nav className="flex-grow p-4 space-y-2 mt-4 overflow-y-auto custom-scrollbar">
          <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500 px-3.5 block mb-3">Monitoring Navigation</span>
          
          {menuItems.map((item) => {
            const IconComponent = item.icon;
            const isActive = activeTab === item.id;
            
            return (
              <button
                key={item.id}
                onClick={() => {
                  setActiveTab(item.id);
                  setIsOpen(false);
                }}
                className={`w-full text-left relative flex items-center space-x-3 px-4 py-3 rounded-xl text-xs font-bold transition-all group overflow-hidden`}
              >
                {/* Active motion background pill */}
                {isActive && (
                  <motion.div
                    layoutId="active-sidebar-pill"
                    transition={{ type: "spring", stiffness: 380, damping: 30 }}
                    className="absolute inset-0 bg-blue-600 rounded-xl"
                  />
                )}

                <span className="relative z-10">
                  <IconComponent className={`h-4.5 w-4.5 transition-colors ${
                    isActive ? "text-white" : "text-slate-400 group-hover:text-white"
                  }`} />
                </span>

                <span className={`relative z-10 transition-colors uppercase tracking-wider ${
                  isActive ? "text-white" : "text-slate-300 group-hover:text-white"
                }`}>
                  {item.label}
                </span>
              </button>
            );
          })}

          {/* Locked indicators for Guests */}
          {isGuest && (
            <div className="mt-8 px-3.5 py-4 bg-slate-900/20 border border-slate-900/50 rounded-xl space-y-2 text-slate-400">
              <p className="text-[10px] font-extrabold uppercase text-amber-500 tracking-wider flex items-center">
                <ShieldAlert className="h-3.5 w-3.5 mr-1" />
                Guest Limits Active
              </p>
              <p className="text-[10px] leading-relaxed">
                Google account auth is pending or restricted inside the workspace container. View tracking details only.
              </p>
            </div>
          )}
        </nav>

        {/* User profile footer controls */}
        <div className="p-4 border-t border-slate-900 mt-auto bg-slate-950">
          <div className="flex items-center justify-between gap-3 bg-slate-900 p-3.5 rounded-2xl border border-slate-900">
            <div className="flex items-center space-x-2.5 min-w-0">
              {/* User badge */}
              <div className="h-8 w-8 rounded-full bg-blue-600/20 text-blue-400 flex items-center justify-center font-bold text-xs shrink-0 select-none">
                {user.displayName.charAt(0)}
              </div>
              <div className="min-w-0">
                <h4 className="text-xs font-extrabold text-white truncate leading-none">{user.displayName}</h4>
                <div className="flex items-center space-x-1 mt-1">
                  <span className={`px-1.5 py-0.5 rounded-full text-[8px] uppercase tracking-wider font-extrabold shrink-0 truncate ${
                    user.role === "System Administrator" 
                      ? "bg-violet-500/10 text-violet-400" 
                      : user.role === "Admin"
                      ? "bg-purple-500/15 text-purple-400 border border-purple-500/10 animate-pulse"
                      : user.role === "User" 
                      ? "bg-blue-500/10 text-blue-400" 
                      : "bg-slate-500/20 text-slate-400"
                  }`}>
                    {user.role}
                  </span>
                </div>
              </div>
            </div>

            {/* Logout trigger */}
            <button
              onClick={onLogout}
              className="p-2 text-slate-400 hover:text-red-400 hover:bg-slate-850/50 rounded-xl transition-all border border-slate-850 hover:border-slate-800"
              title="Sign Out Account"
            >
              <LogOut className="h-4.5 w-4.5" />
            </button>
          </div>
          
          <div className="text-center text-[9px] text-slate-600 mt-3 font-semibold">
            <span>CSWDO Portal V1.2.0</span>
          </div>
        </div>
      </aside>
    </>
  );
}

