import React, { useState } from "react";
import { UserProfile, UserRole } from "../types";
import { Building2, ShieldCheck, UserCheck, Star, Sparkles } from "lucide-react";

interface OnboardingProps {
  googleUser: { uid: string; email: string; displayName: string };
  isFirst: boolean;
  onOnboardComplete: (profile: Omit<UserProfile, "createdAt" | "updatedAt">) => void;
}

export default function Onboarding({ googleUser, isFirst, onOnboardComplete }: OnboardingProps) {
  const [displayName, setDisplayName] = useState(googleUser.displayName || "");
  const [position, setPosition] = useState("");
  const [role, setRole] = useState<UserRole>(isFirst ? "System Administrator" : "Guest");
  const [error, setError] = useState("");

  const suggestedPositions = [
    "Social Welfare Officer I",
    "Social Welfare Officer II",
    "Social Welfare Officer III",
    "Administrative Assistant",
    "Administrative Aide",
    "Accounting Specialist",
    "Treasury Officer",
    "CSWDO Department Head"
  ];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!displayName.trim()) {
      setError("Please confirm your display full name.");
      return;
    }
    if (!position.trim()) {
      setError("Please input or select your official Job Position / Title.");
      return;
    }

    onOnboardComplete({
      uid: googleUser.uid,
      email: googleUser.email,
      displayName: displayName.trim(),
      position: position.trim(),
      role: isFirst ? "System Administrator" : role
    });
  };

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col justify-center py-8 sm:py-12 sm:px-6 lg:px-8 px-4 font-sans select-none animate-fade-in">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        
        {/* Brand logo header */}
        <div className="flex justify-center flex-col items-center">
          <div className="h-14 w-14 sm:h-16 sm:w-16 bg-white rounded-2xl flex items-center justify-center p-1.5 shadow-xl shadow-blue-500/10 mb-4 animate-bounce-slow overflow-hidden">
            <img 
              src="https://raw.githubusercontent.com/tanglaorichmondcswd-svg/MABALACAT-CITY-LOGO/787904c28a569b18cc4e23d3f6f16d7aaa024907/image.png" 
              alt="Mabalacat City Logo" 
              className="h-full w-full object-contain"
              referrerPolicy="no-referrer"
              onError={(e) => {
                e.currentTarget.style.display = 'none';
                const parent = e.currentTarget.parentElement;
                if (parent) {
                  parent.className = "p-3 bg-blue-600 rounded-2xl text-white shadow-xl shadow-blue-500/20 mb-4 animate-bounce-slow h-14 w-14 sm:h-16 sm:w-16 flex items-center justify-center";
                  parent.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-building-2 h-8 w-8 sm:h-10 sm:w-10"><path d="M6 22V4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v18Z"/><path d="M6 12H4a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h2"/><path d="M18 9h2a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2h-2"/><path d="M10 6h4"/><path d="M10 10h4"/><path d="M10 14h4"/><path d="M10 18h4"/></svg>`;
                }
              }}
            />
          </div>
          <span className="text-[9px] sm:text-[10px] uppercase tracking-widest text-blue-400 font-black">City of Mabalacat</span>
          <h2 className="text-center text-xl sm:text-2xl font-black text-white tracking-tight mt-1">CSWDO Onboarding</h2>
          <p className="text-[10px] sm:text-xs text-slate-400 text-center mt-1">Official account profile configuration</p>
        </div>
      </div>

      <div className="mt-6 sm:mt-8 sm:mx-auto sm:w-full sm:max-w-lg">
        <div className="bg-white py-6 px-5 sm:py-8 sm:px-10 rounded-3xl shadow-2xl border border-slate-100">
          
          {/* SPECIAL BANNER: FIRST SYSTEM USER */}
          {isFirst ? (
            <div className="mb-6 bg-violet-50 rounded-2xl p-4.5 border border-violet-200 flex items-start space-x-3 text-violet-800 font-medium">
              <Star className="h-5 w-5 text-violet-600 shrink-0 mt-0.5 animate-pulse" />
              <div className="text-xs">
                <span className="font-extrabold text-violet-900 block mb-0.5">🔑 Privilege: First Administrator Setup</span>
                No other user profile exists in this workspace yet. You are initialized automatically as the **System Administrator** to activate security and coordinate other user positions.
              </div>
            </div>
          ) : (
            <div className="mb-6 bg-blue-50 rounded-2xl p-4.5 border border-blue-100 flex items-start space-x-3 text-blue-800 font-medium">
              <ShieldCheck className="h-5 w-5 text-blue-600 shrink-0 mt-0.5" />
              <div className="text-xs">
                <span className="font-extrabold text-blue-950 block mb-0.5">Approval process index code</span>
                Your initial access level will be registered as **Guest** (View Only tracking). An existing System Administrator can upgrade you to **User** (add/update movements) upon verifying your identity.
              </div>
            </div>
          )}

          {error && (
            <div className="mb-5 bg-red-50 text-red-700 p-3 rounded-xl text-xs font-bold border border-red-200">
              {error}
            </div>
          )}

          <form className="space-y-5" onSubmit={handleSubmit}>
            
            {/* Email (Disabled indicator) */}
            <div>
              <label className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block mb-1">Google Credentials Auth</label>
              <input
                type="text"
                disabled
                value={googleUser.email}
                className="w-full text-xs font-semibold rounded-xl border border-slate-200 p-3 bg-slate-100 text-slate-500 cursor-not-allowed select-none focus:outline-none"
              />
            </div>

            {/* Display name */}
            <div>
              <label className="text-[10px] uppercase font-bold text-slate-700 tracking-wider block mb-1">Confirm Full Name</label>
              <input
                type="text"
                value={displayName}
                onChange={(e) => { setDisplayName(e.target.value); setError(""); }}
                className="w-full text-sm font-semibold rounded-xl border border-slate-200 p-3 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 bg-slate-50/20"
                placeholder="Juan dela Cruz"
              />
            </div>

            {/* Job Position */}
            <div>
              <label className="text-[10px] uppercase font-bold text-slate-700 tracking-wider block mb-1">Official Job Position / Title</label>
              <input
                type="text"
                value={position}
                onChange={(e) => { setPosition(e.target.value); setError(""); }}
                className="w-full text-sm font-semibold rounded-xl border border-slate-200 p-3 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 bg-slate-50/20"
                placeholder="e.g. Social Welfare Aide, Administrative Assistant I"
              />
              
              {/* Quick-select Helper */}
              <div className="mt-3.5 space-y-1">
                <span className="text-[10px] font-bold text-slate-400 block uppercase">Suggestion clicks:</span>
                <div className="flex flex-wrap gap-1.5 pt-1.5">
                  {suggestedPositions.map((pos) => (
                    <button
                      key={pos}
                      type="button"
                      onClick={() => { setPosition(pos); setError(""); }}
                      className={`text-[10px] px-2 py-1 rounded-md border font-semibold transition-all ${
                        position === pos 
                          ? "bg-blue-600 border-blue-600 text-white" 
                          : "bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-600"
                      }`}
                    >
                      {pos}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* If NOT first, let them request user role */}
            {!isFirst && (
              <div>
                <label className="text-[10px] uppercase font-bold text-slate-700 tracking-wider block mb-1">Requested Access Level Authority</label>
                <div className="grid grid-cols-2 gap-3 pt-1">
                  <div 
                    onClick={() => setRole("Guest")}
                    className={`p-3.5 rounded-xl border-2 flex flex-col cursor-pointer transition-all ${
                      role === "Guest" 
                        ? "bg-slate-900 border-slate-900 text-white" 
                        : "bg-white border-slate-200 text-slate-700 hover:border-slate-300"
                    }`}
                  >
                    <span className="font-extrabold text-xs">Guest Account</span>
                    <span className="text-[10px] text-slate-400 mt-0.5">Read-Only tracking views</span>
                  </div>

                  <div 
                    onClick={() => setRole("User")}
                    className={`p-3.5 rounded-xl border-2 flex flex-col cursor-pointer transition-all ${
                      role === "User" 
                        ? "bg-blue-50 border-blue-600 text-blue-900" 
                        : "bg-white border-slate-200 text-slate-700 hover:border-slate-300"
                    }`}
                  >
                    <span className="font-extrabold text-xs flex items-center gap-1">
                      User Account
                      <Sparkles className="h-3 w-3 text-blue-500" />
                    </span>
                    <span className="text-[10px] text-slate-400 mt-0.5">Update tracking stages (Needs Admin Approval)</span>
                  </div>
                </div>
              </div>
            )}

            {/* Onboard CTA */}
            <button
              type="submit"
              className="w-full bg-blue-600 hover:bg-blue-500 text-white p-3.5 rounded-xl font-bold text-sm transition-all shadow-xl shadow-blue-500/15 hover:scale-[1.01] active:scale-[0.99] mt-3"
            >
              Initialize Account Profile
            </button>

          </form>
        </div>
      </div>
    </div>
  );
}
