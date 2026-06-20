import { useState, useEffect, useMemo } from "react";
import { onAuthStateChanged, signInWithPopup, signOut, User as FirebaseUser } from "firebase/auth";
import { auth, googleProvider } from "./firebase/firebase";
import { getUserProfile, saveUserProfile, isFirstUser, getUserProfileByEmail, deleteUserProfile } from "./firebase/userDb";
import { 
  subscribeToSOAs, 
  createSOA, 
  verifySOA, 
  sortSOA, 
  updateChecklist, 
  processToAccounting, 
  updateManualStatus, 
  resubmitSOA, 
  deleteSOA 
} from "./firebase/soaDb";
import { subscribeToStakeholders, createStakeholder, bulkAddStakeholders } from "./firebase/stakeholdersDb";
import { UserProfile, SOADoc, Stakeholder, SLASettings } from "./types";

// Component imports
import Sidebar from "./components/Sidebar";
import DashboardOverview from "./components/DashboardOverview";
import SOAList from "./components/SOAList";
import NewSOAModal from "./components/NewSOAModal";
import SOADetailsModal from "./components/SOADetailsModal";
import UserManagement from "./components/UserManagement";
import RegisterModal from "./components/RegisterModal";
import Onboarding from "./components/Onboarding";
import NotificationCenter from "./components/NotificationCenter";
import SummaryTracker from "./components/SummaryTracker";
import StakeholdersDirectoryPage from "./components/StakeholdersDirectoryPage";
import SlaSettingsPage from "./components/SlaSettingsPage";
import { subscribeToSLASettings } from "./firebase/settingsDb";
import { requestRegistration } from "./firebase/userDb";
import { motion, AnimatePresence } from "motion/react";

import { 
  Building2, 
  Landmark, 
  LogIn, 
  Eye, 
  ShieldAlert, 
  CheckCircle2, 
  XCircle, 
  AlertCircle, 
  AlertTriangle, 
  Menu,
  User as UserIcon,
  Info as InfoIcon, 
  X as CloseIcon 
} from "lucide-react";

export default function App() {
  // Toast notifications state
  const [toasts, setToasts] = useState<{
    id: string;
    message: string;
    type: "success" | "error" | "info" | "warning";
  }[]>([]);

  const showToast = (message: string, type: "success" | "error" | "info" | "warning" = "success") => {
    const id = Date.now().toString() + Math.random().toString(36).substring(2, 7);
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 5000);
  };

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  // Authentication states
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [googleAuthUser, setGoogleAuthUser] = useState<{ uid: string; email: string; displayName: string } | null>(null);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [isFirstWorkspaceUser, setIsFirstWorkspaceUser] = useState(false);
  const [authLoading, setAuthLoading] = useState(true);

  // Applet sections states
  const [activeTab, setActiveTab] = useState<string>("tracking");
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [soas, setSoas] = useState<SOADoc[]>([]);
  const [stakeholders, setStakeholders] = useState<Stakeholder[]>([]);
  const [slaSettings, setSlaSettings] = useState<SLASettings | null>(null);
  const [selectedSOA, setSelectedSOA] = useState<SOADoc | null>(null);
  
  // Stakeholder Directory / Summary View states
  const [selectedStakeholderName, setSelectedStakeholderName] = useState<string | null>(null);
  const [selectedViewType, setSelectedViewType] = useState<"batch" | "stakeholder">("batch");
  const [expandedGroups, setExpandedGroups] = useState<string[]>([]);

  // Modals state
  const [isNewSOAModalOpen, setIsNewSOAModalOpen] = useState(false);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [isRegisterModalOpen, setIsRegisterModalOpen] = useState(false);

  // Filter SOAs and Stakeholders based on user category and role
  const filteredSoas = useMemo(() => {
    if (!currentUser || currentUser.role === "System Administrator") return soas;
    const userCategory = currentUser.category?.toLowerCase();
    if (!userCategory) return soas;

    return soas.filter(soa => {
      const soaCategory = soa.stakeholderCategory.toLowerCase();
      // Handle 'laboratories' vs 'laboratory'
      if (userCategory === 'laboratory' || userCategory === 'laboratories') {
        return soaCategory === 'laboratories' || soaCategory === 'laboratory';
      }
      return soaCategory === userCategory;
    });
  }, [soas, currentUser]);

  const filteredStakeholders = useMemo(() => {
    if (!currentUser || currentUser.role === "System Administrator") return stakeholders;
    const userCategory = currentUser.category?.toLowerCase();
    if (!userCategory) return stakeholders;

    return stakeholders.filter(st => {
      const stCategory = st.category.toLowerCase();
      if (userCategory === 'laboratory' || userCategory === 'laboratories') {
        return stCategory === 'laboratories' || stCategory === 'laboratory' || stCategory === 'lab';
      }
      return stCategory === userCategory || (userCategory === 'hospital' && stCategory === 'health');
    });
  }, [stakeholders, currentUser]);

  const handleRequestRegistration = async (email: string, name: string, position: string, category: "Hospital" | "Funeral" | "Laboratory") => {
    try {
      await requestRegistration(email, name, position, category);
      showToast("Access requested. Admin will be notified to review your registration.", "success");
    } catch (e) {
      showToast("Failed to request registration.", "error");
    }
  };

  // Real-time tracking subscriptions
  useEffect(() => {
    if (!currentUser) {
      setSoas([]);
      setStakeholders([]);
      return;
    }
    const unsubscribeSOAs = subscribeToSOAs((updatedSOAs) => {
      setSoas(updatedSOAs);
    });
    
    const unsubscribeStakeholders = subscribeToStakeholders((updatedDocs) => {
      setStakeholders(updatedDocs);
    });

    const unsubscribeSLASettings = subscribeToSLASettings((settings) => {
      setSlaSettings(settings);
    });

    return () => {
      unsubscribeSOAs();
      unsubscribeStakeholders();
      unsubscribeSLASettings();
    };
  }, [currentUser]);

  // Keep selected tracking item live updated on database changes without resetting subscribers
  useEffect(() => {
    if (selectedSOA) {
      const liveVer = soas.find((s) => s.id === selectedSOA.id);
      if (liveVer && JSON.stringify(liveVer) !== JSON.stringify(selectedSOA)) {
        setSelectedSOA(liveVer);
      }
    }
  }, [soas, selectedSOA]);

  // Firebase auth state listener
  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, async (user: FirebaseUser | null) => {
      setAuthLoading(true);
      if (user) {
        const gUser = {
          uid: user.uid,
          email: user.email || "",
          displayName: user.displayName || "CSWDO Staff"
        };
        setGoogleAuthUser(gUser);

        // Fetch user profile from firestore
        let profile = await getUserProfile(user.uid);
        if (!profile) {
          // Check if they were pre-registered by email
          const email = user.email || "";
          profile = await getUserProfileByEmail(email);
          if (profile) {
            // Migrate: delete old pre-registered dummy doc, write actual verified uid doc
            const oldUid = profile.uid;
            profile.uid = user.uid;
            profile.displayName = user.displayName || profile.displayName;
            profile.updatedAt = new Date().toISOString();
            
            await saveUserProfile(profile);
            
            if (oldUid.startsWith("pre-")) {
              await deleteUserProfile(oldUid);
            }
          }
        }

        if (profile) {
          // Set tracking as active tab for default view if user was not logged in yet
          setCurrentUser((prev) => {
            if (!prev) {
              if (profile!.role === "Guest") {
                setActiveTab("summary");
              } else {
                setActiveTab("dashboard");
              }
            }
            return profile;
          });
          setShowOnboarding(false);
          showToast(`Welcome back, ${profile.displayName}!`, "success");
        } else {
          // No profile yet, check if they are the first user to allow bootstrapping of admin
          const first = await isFirstUser();
          if (first) {
            setIsFirstWorkspaceUser(true);
            setShowOnboarding(true);
          } else {
            // Unregistered user tries to sign in. Terminate session.
            await signOut(auth);
            setCurrentUser(null);
            setGoogleAuthUser(null);
            setShowOnboarding(false);
            showToast("Access Denied: This Google Account is not pre-registered in the CSWDO system. Please request your System Administrator to authorize your email address.", "error");
          }
        }
      } else {
        // Clear authenticated state if signed out of Firebase, except if they are using local Guest Mode
        setCurrentUser((prev) => {
          if (prev && prev.uid === "guest-mode") {
            return prev;
          } else {
            setGoogleAuthUser(null);
            setShowOnboarding(false);
            return null;
          }
        });
      }
      setAuthLoading(false);
    });

    return () => unsubscribeAuth();
  }, []);

  // Login handler
  const handleGoogleLogin = async () => {
    setAuthLoading(true);
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (e: any) {
      console.error("Google Auth failed:", e.message);
      showToast("Authentication popup was interrupted. Please try again.", "warning");
    } finally {
      setAuthLoading(false);
    }
  };

  // Guest login handler
  const handleGuestLogin = () => {
    const guestProfile: UserProfile = {
      uid: "guest-mode",
      email: "guest@mabalacat.gov.ph",
      displayName: "Guest Viewport",
      position: "Public Tracker",
      role: "Guest",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    setCurrentUser(guestProfile);
    setActiveTab("summary"); // Guest is locked to tracking only (Roadmap Tracker)
    setGoogleAuthUser(null);
    setShowOnboarding(false);
  };

  // Logout handler
  const handleLogout = async () => {
    setAuthLoading(true);
    try {
      if (currentUser?.uid !== "guest-mode") {
        await signOut(auth);
      }
    } catch (e) {
      console.error(e);
    }
    setCurrentUser(null);
    setGoogleAuthUser(null);
    setShowOnboarding(false);
    setActiveTab("summary");
    setAuthLoading(false);
  };

  // Onboarding Complete Handler
  const handleOnboardComplete = async (profileData: Omit<UserProfile, "createdAt" | "updatedAt">) => {
    setAuthLoading(true);
    const now = new Date().toISOString();
    const profile: UserProfile = {
      ...profileData,
      createdAt: now,
      updatedAt: now
    };

    try {
      await saveUserProfile(profile);
      setCurrentUser(profile);
      setShowOnboarding(false);
      setActiveTab("dashboard");
      showToast("Workspace account verified and configured successfully!", "success");
    } catch (e) {
      showToast("Verification write failed. Please check database configuration.", "error");
    } finally {
      setAuthLoading(false);
    }
  };

  // Create new Tracker SOA Action
  const handleCreateSOA = async (formData: {
    dateReceived: string;
    stakeholderName: string;
    stakeholderCategory: "hospital" | "funeral" | "laboratories";
    batchNumber: string;
    totalAmount: number;
    submissionOfSoa: boolean;
  }) => {
    if (!currentUser) return;
    try {
      await createSOA(formData, {
        uid: currentUser.uid,
        displayName: currentUser.displayName,
        position: currentUser.position
      });
      setActiveTab("tracking");
      showToast("Statement of Account logged successfully!", "success");
    } catch (error) {
      console.error(error);
      showToast("Failed to log statement to Firestore database.", "error");
    }
  };

  // Step 2 Action
  const handleVerifySOA = async (id: string, hasIssue: boolean, issueDetails: string, notes: string) => {
    if (!currentUser) return;
    try {
      await verifySOA(id, hasIssue, issueDetails, notes, {
        displayName: currentUser.displayName,
        position: currentUser.position
      });
      showToast(hasIssue ? "Verification flagged with issue successfully." : "Verification pass checklist validated.", "success");
    } catch (e: any) {
      showToast("Verification submit struggle failed: " + e.message, "error");
    }
  };

  // Step 3 Action
  const handleSortSOA = async (id: string, notes: string) => {
    if (!currentUser) return;
    try {
      await sortSOA(id, notes, {
        displayName: currentUser.displayName,
        position: currentUser.position
      });
      showToast("Document successfully sorted to specific basket index.", "success");
    } catch (e: any) {
      showToast("Failed to complete sorting stage: " + e.message, "error");
    }
  };

  // Step 4 Action
  const handleChecklistUpdate = async (id: string, checklist: SOADoc["checklist"], notes: string) => {
    if (!currentUser) return;
    try {
      await updateChecklist(id, checklist, notes, {
        displayName: currentUser.displayName,
        position: currentUser.position
      });
      showToast("Auditing checklist criteria updated live.", "success");
    } catch (e: any) {
      showToast("Failed to update auditing list: " + e.message, "error");
    }
  };

  // Step 5 Action
  const handleProcessToAccounting = async (id: string, notes: string) => {
    if (!currentUser) return;
    try {
      await processToAccounting(id, notes, {
        displayName: currentUser.displayName,
        position: currentUser.position
      });
      showToast("Document processing advanced to Accounting pipeline.", "success");
    } catch (e: any) {
      showToast("Failed to advance to accounting: " + e.message, "error");
    }
  };

  // Step 6 Action
  const handleManualStatusUpdate = async (
    id: string,
    status: "Forwarded to Accounting" | "Forwarded to Treasury" | "For Releasing" | "Released",
    notes: string
  ) => {
    if (!currentUser) return;
    try {
      await updateManualStatus(id, status, notes, {
        displayName: currentUser.displayName,
        position: currentUser.position
      });
      showToast(`Document flow stage advanced successfully: ${status}`, "success");
    } catch (e: any) {
      showToast("Failed to update document stage: " + e.message, "error");
    }
  };

  // Create Stakeholder Action
  const handleCreateStakeholder = async (data: Omit<Stakeholder, "id" | "createdAt">) => {
    if (!currentUser) return;
    try {
      await createStakeholder(data);
      showToast(`Stakeholder '${data.name}' added successfully to directory!`, "success");
    } catch (e: any) {
      showToast("Failed to add stakeholder: " + e.message, "error");
    }
  };

  // Step 1 Resubmission corrective action (With Issue -> Submitted)
  const handleResubmitIssue = async (id: string, newDate: string, notes: string) => {
    if (!currentUser) return;
    try {
      await resubmitSOA(id, newDate, notes, {
        displayName: currentUser.displayName,
        position: currentUser.position
      });
      showToast("Document successfully resubmitted & reinstated under step 1.", "success");
    } catch (e: any) {
      showToast("Failed to resubmit correcting document: " + e.message, "error");
    }
  };

  // Admin delete record (now supports users with canDelete permission too!)
  const handleDeleteSOA = async (id: string) => {
    if (currentUser?.role !== "System Administrator" && currentUser?.canDelete !== true) {
      showToast("Unauthorized delete attempt.", "error");
      return;
    }
    try {
      await deleteSOA(id);
      showToast("Statement of Account tracker deleted successfully!.", "success");
      if (selectedSOA?.id === id) {
        setIsDetailModalOpen(false);
        setSelectedSOA(null);
      }
    } catch (e) {
      showToast("Failed to delete Statement of Account.", "error");
    }
  };

  const handleSelectSOA = (soa: SOADoc) => {
    setSelectedSOA(soa);
    setIsDetailModalOpen(true);
  };

  const handleNavigateWithFilter = (statusFilter?: string) => {
    setActiveTab("tracking");
  };

  // Premium loading screen override
  if (authLoading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-6 font-sans relative overflow-hidden">
        <style>{`
          @keyframes borderRotate {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
          @keyframes progressAnim {
            0% { width: 0%; }
            50% { width: 70%; }
            100% { width: 100%; }
          }
          @keyframes heartbeat {
            0%, 100% { transform: scale(1); opacity: 0.8; }
            50% { transform: scale(311); /* placeholder to disable native scaling, but let's use exact numbers */ }
          }
          @keyframes shiverGlow {
            0%, 100% { transform: scale(1); opacity: 0.85; }
            50% { transform: scale(1.05); opacity: 1; }
          }
          @keyframes waveGlow {
            0%, 100% { opacity: 0.15; transform: scale(1); }
            50% { opacity: 0.35; transform: scale(1.05); }
          }
        `}</style>

        {/* Ambient atmospheric lighting */}
        <div 
          className="absolute top-1/4 left-1/4 w-[450px] h-[450px] bg-sky-500/10 rounded-full blur-[100px]" 
          style={{ animation: 'waveGlow 8s ease-in-out infinite' }}
        />
        <div 
          className="absolute bottom-1/4 right-1/4 w-[500px] h-[500px] bg-emerald-500/5 rounded-full blur-[120px]" 
          style={{ animation: 'waveGlow 12s ease-in-out infinite 1s' }}
        />
        
        {/* Futuristic Grid Accent Background */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#0f172a_1px,transparent_1px),linear-gradient(to_bottom,#0f172a_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_50%,#000_70%,transparent_100%)] opacity-35" />

        <div className="relative flex flex-col items-center max-w-md text-center z-10">
          
          {/* Dynamic rotating ring engine */}
          <div className="relative mb-10 flex items-center justify-center">
            {/* Soft background glow */}
            <div className="absolute h-36 w-36 rounded-full bg-blue-500/10 blur-xl animate-pulse" />
            
            {/* outer orbiting system */}
            <div 
              className="absolute h-28 w-28 rounded-full border-2 border-dashed border-sky-500/30" 
              style={{ animation: 'borderRotate 15s linear infinite' }}
            />
            <div 
              className="absolute h-28 w-28 rounded-full border border-dashed border-emerald-500/20" 
              style={{ animation: 'borderRotate 8s linear infinite reverse' }}
            />
            
            {/* inner spinning gradient wrapper */}
            <div 
              className="absolute h-24 w-24 rounded-full border-[3px] border-transparent border-t-emerald-500 border-r-blue-500" 
              style={{ animation: 'borderRotate 2s linear infinite' }}
            />

            {/* Core container for logo */}
            <div className="h-22 w-22 bg-slate-900 border border-slate-800 rounded-full flex items-center justify-center p-1.5 shadow-2xl relative">
              <div 
                className="h-full w-full bg-white rounded-full flex items-center justify-center border border-slate-900 shadow-inner overflow-hidden p-1"
                style={{ animation: 'shiverGlow 3s ease-in-out infinite' }}
              >
                <img 
                  src="https://raw.githubusercontent.com/tanglaorichmondcswd-svg/MABALACAT-CITY-LOGO/787904c28a569b18cc4e23d3f6f16d7aaa024907/image.png" 
                  alt="Mabalacat City Logo" 
                  className="h-full w-full object-contain"
                  referrerPolicy="no-referrer"
                  onError={(e) => {
                    e.currentTarget.style.display = 'none';
                    const parent = e.currentTarget.parentElement;
                    if (parent) {
                      parent.classList.add('bg-slate-950');
                      parent.classList.remove('bg-white');
                      const icon = document.createElement('span');
                      icon.className = 'text-sky-400 font-bold text-xs';
                      icon.innerText = 'CSWDO';
                      parent.appendChild(icon);
                    }
                  }}
                />
              </div>
            </div>

            {/* Tiny orbiting dot */}
            <div 
              className="absolute h-2.5 w-2.5 bg-emerald-400 rounded-full border-2 border-slate-950 shadow-md shadow-emerald-400/50"
              style={{
                top: '6px',
                left: '6px',
                transformOrigin: '44px 44px',
                animation: 'borderRotate 3s ease-in-out infinite'
              }}
            />
          </div>

          {/* Typography headers */}
          <h3 className="text-white font-extrabold text-2xl tracking-tight flex items-center gap-2">
            Mabalacat City <span className="bg-gradient-to-r from-sky-400 to-emerald-400 bg-clip-text text-transparent">CSWDO</span>
          </h3>
          <p className="text-slate-400 text-xs font-medium mt-2 max-w-xs px-2">
            Document Routing &amp; Statement of Account Tracker
          </p>
          
          {/* Custom loaded bars */}
          <div className="mt-10 space-y-3 w-64 bg-slate-900/50 border border-slate-800/40 p-4 rounded-2xl backdrop-blur-md">
            <div className="h-1.5 w-full bg-slate-950 rounded-full overflow-hidden p-[2px]">
              <div 
                className="h-full bg-gradient-to-r from-sky-500 via-sky-400 to-emerald-400 rounded-full" 
                style={{ 
                  animation: 'progressAnim 2.5s cubic-bezier(0.4, 0, 0.2, 1) infinite',
                }}
              />
            </div>
            
            <div className="flex items-center justify-between text-[10px] text-slate-500 font-bold px-1 select-none">
              <span className="uppercase tracking-wider text-sky-400/80">Securing environment</span>
              <span className="animate-pulse text-emerald-400">CONNECTING</span>
            </div>
          </div>

          <div className="mt-8 text-[11px] text-slate-500 font-medium tracking-wide flex items-center justify-center gap-2">
            <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-500 animate-ping" />
            <span>Mabalacat IT Security Pipeline Verified</span>
          </div>

        </div>
      </div>
    );
  }

  // Onboarding screens render override
  if (showOnboarding && googleAuthUser) {
    return (
      <Onboarding
        googleUser={googleAuthUser}
        isFirst={isFirstWorkspaceUser}
        onOnboardComplete={handleOnboardComplete}
      />
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col md:flex-row font-sans select-none antialiased">
      
      {/* Auth state renders */}
      {currentUser ? (
        <>
          {/* Side Panel Sidebar Style with Animated active tab capsules */}
          <Sidebar
            user={currentUser}
            slaSettings={slaSettings}
            onLogout={handleLogout}
            activeTab={activeTab}
            setActiveTab={setActiveTab}
            isOpen={isSidebarOpen}
            setIsOpen={setIsSidebarOpen}
          />

          {/* Main workspace contents area */}
          <div className="flex-grow flex flex-col min-w-0 md:h-screen md:overflow-y-auto">
            
            {/* Top Workspace Header Navbar */}
            <header className="bg-white border-b border-slate-100 px-4 sm:px-6 py-4 flex items-center justify-between shrink-0 select-none sticky top-0 md:relative z-[60] md:z-20">
              <div className="flex items-center gap-3">
                <button 
                  onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                  className="md:hidden p-2 bg-slate-50 text-slate-600 rounded-xl hover:bg-slate-100 transition-colors border border-slate-200"
                >
                  <Menu className="h-5 w-5" />
                </button>
                <div className="flex flex-col">
                  <span className="text-[9px] sm:text-[10px] font-black uppercase tracking-widest text-slate-400">
                    {currentUser.role === "Guest" ? "Guest CSWDO Terminal" : "CSWDO Government of Mabalacat City"}
                  </span>
                  <h1 className="text-xs sm:text-sm font-black text-slate-800 uppercase tracking-wider leading-none mt-1 truncate max-w-[160px] sm:max-w-none">
                    {activeTab === "dashboard" && "Dashboard Specs"}
                    {activeTab === "tracking" && "SOA Tracker Report"}
                    {activeTab === "directory" && "Stakeholders Directory"}
                    {activeTab === "summary" && "Roadmap Tracker"}
                    {activeTab === "settings" && "System Configuration & SLA"}
                    {activeTab === "users" && "Workspace Users Administration"}
                  </h1>
                </div>
              </div>

              <div className="flex items-center gap-4">
                {/* Live Digital Clock & Calendar */}
                <div className="hidden sm:flex flex-col text-right border-r border-slate-100 pr-4 select-none">
                  <span className="text-[11px] font-extrabold text-slate-800 tracking-tight">
                    {new Date().toLocaleDateString("en-US", {
                      weekday: "short",
                      month: "short",
                      day: "numeric",
                    })}
                  </span>
                  <span className="text-[9px] text-slate-400 uppercase font-bold tracking-wider mt-0.5 flex items-center justify-end gap-1 select-none font-sans">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse inline-block" />
                    Live Session Active
                  </span>
                </div>

                {/* Tracking movements notification system */}
                {currentUser.role !== "Guest" && currentUser.canEdit !== false && (
                  <NotificationCenter
                    soas={filteredSoas}
                    slaSettings={slaSettings}
                    onSelectSOA={handleSelectSOA}
                    showToast={showToast}
                  />
                )}
              </div>
            </header>

            <main className="flex-grow px-3 sm:px-6 lg:px-8 py-6 sm:py-8 max-w-7xl w-full mx-auto overflow-x-hidden">
              {activeTab === "dashboard" && currentUser.role !== "Guest" && (
                <DashboardOverview
                  soas={filteredSoas}
                  currentUser={currentUser}
                  onNavigateToTracking={handleNavigateWithFilter}
                />
              )}

              {activeTab === "tracking" && currentUser.role !== "Guest" && (
                <SOAList
                  soas={filteredSoas}
                  onSelectSOA={handleSelectSOA}
                  onOpenNewSOAModal={() => setIsNewSOAModalOpen(true)}
                  onDeleteSOA={handleDeleteSOA}
                  currentUser={currentUser}
                  showToast={showToast}
                  slaSettings={slaSettings}
                />
              )}

              {activeTab === "directory" && currentUser.role !== "Guest" && (
                <StakeholdersDirectoryPage
                  soas={filteredSoas}
                  stakeholders={filteredStakeholders}
                  currentUser={currentUser}
                  onSelectStakeholder={(name) => {
                    setSelectedStakeholderName(name);
                    setSelectedViewType("stakeholder");
                    setActiveTab("summary");
                  }}
                  onCreateStakeholder={handleCreateStakeholder}
                />
              )}

              {activeTab === "summary" && (
                <SummaryTracker
                  soas={filteredSoas}
                  stakeholders={filteredStakeholders}
                  currentUser={currentUser}
                  slaSettings={slaSettings}
                  selectedStakeholderName={selectedStakeholderName}
                  selectedViewType={selectedViewType}
                  selectedSOAId={selectedSOA?.id || null}
                  setSelectedSOAId={(id) => {
                    const soa = filteredSoas.find(s => s.id === id);
                    if (soa) setSelectedSOA(soa);
                  }}
                  setSelectedStakeholderName={setSelectedStakeholderName}
                  setSelectedViewType={setSelectedViewType}
                />
              )}

              {activeTab === "settings" && currentUser.role === "System Administrator" && (
                <SlaSettingsPage user={currentUser} />
              )}

              {activeTab === "users" && currentUser.role === "System Administrator" && (
                <UserManagement showToast={showToast} />
              )}
            </main>

            {/* Footer */}
            <footer className="bg-white border-t border-slate-100 py-4 sm:py-6 text-center text-[9px] sm:text-[10px] text-slate-400 font-semibold shrink-0 px-4">
              <p className="leading-relaxed">© {new Date().getFullYear()} Republic of the Philippines • City of Mabalacat, Pampanga. <br className="sm:hidden" />City Social Welfare and Development Office. All rights reserved.</p>
            </footer>
          </div>
        </>
      ) : (
        /* Locked State - requires signing in / Guest choice */
        <div className="flex-grow flex items-center justify-center p-4 sm:p-6 lg:p-8 bg-gradient-to-tr from-slate-900 via-slate-950 to-slate-900 min-h-screen">
          <div className="max-w-md w-full bg-slate-900 border border-slate-800/80 rounded-3xl p-8 sm:p-10 text-center shadow-2xl animate-fade-in relative overflow-hidden">
            {/* Background glowing effects */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-48 h-1 bg-blue-500/30 blur-md rounded-full" />
            
            <div className="h-20 w-20 bg-white rounded-full flex items-center justify-center p-1.5 mx-auto mb-6 border border-slate-800/60 shadow-lg overflow-hidden shrink-0">
              <img 
                src="https://raw.githubusercontent.com/tanglaorichmondcswd-svg/MABALACAT-CITY-LOGO/787904c28a569b18cc4e23d3f6f16d7aaa024907/image.png" 
                alt="Mabalacat City Logo" 
                className="h-full w-full object-contain"
                referrerPolicy="no-referrer"
                onError={(e) => {
                  e.currentTarget.style.display = 'none';
                  const parent = e.currentTarget.parentElement;
                  if (parent) {
                    parent.className = "p-4 bg-blue-500/10 text-blue-400 rounded-2xl w-max mx-auto mb-6 border border-blue-500/15";
                    parent.innerHTML = `<svg xmlns="http://www.w3.org/2500/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-landmark h-10 w-10"><line x1="3" x2="21" y1="22" y2="22"/><line x1="6" x2="6" y1="18" y2="11"/><line x1="10" x2="10" y1="18" y2="11"/><line x1="14" x2="14" y1="18" y2="11"/><line x1="18" x2="18" y1="18" y2="11"/><path d="m12 2-10 9h20z"/></svg>`;
                  }
                }}
              />
            </div>

            <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight uppercase">Documents Pipeline</h2>
            <p className="mt-1.5 text-blue-400 text-[9px] sm:text-[10px] tracking-widest uppercase font-black">CSWDO Mabalacat City</p>
            
            <p className="mt-4 text-slate-400 text-[11px] sm:text-xs leading-relaxed max-w-sm mx-auto font-medium">
              Maintain absolute accountability for municipal Statements of Accounts and disbursements. Access the tracker as guest or log in with verified credentials.
            </p>

            {authLoading ? (
              <div className="mt-8 flex flex-col items-center justify-center">
                <div className="h-8 w-8 border-3 border-t-blue-500 border-slate-700 rounded-full animate-spin"></div>
                <p className="mt-3.5 text-[11px] font-semibold text-slate-500">Checking credentials pipeline...</p>
              </div>
            ) : (
              <div className="mt-8 space-y-3.5">
                {/* 1. Google Workspace Login */}
                <button
                  onClick={handleGoogleLogin}
                  className="w-full flex items-center justify-center space-x-2.5 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs py-3.5 px-6 rounded-2xl shadow-lg shadow-blue-600/10 transition-all hover:scale-[1.01] active:scale-[0.99] cursor-pointer"
                >
                  <LogIn className="h-4 w-4" />
                  <span>Sign In with Google ID</span>
                </button>

                <button
                  onClick={() => setIsRegisterModalOpen(true)}
                  className="w-full flex items-center justify-center space-x-2.5 bg-violet-600 hover:bg-violet-500 text-white font-bold text-xs py-3.5 px-6 rounded-2xl shadow-lg shadow-violet-600/10 transition-all hover:scale-[1.01] active:scale-[0.99] cursor-pointer"
                >
                  <UserIcon className="h-4 w-4" />
                  <span>Request Registration</span>
                </button>

                {/* 2. Guest Tracker mode access */}
                <button
                  onClick={handleGuestLogin}
                  className="w-full flex items-center justify-center space-x-2.5 bg-slate-850 hover:bg-slate-800 text-slate-200 hover:text-white font-bold text-xs py-3.5 px-6 rounded-2xl border border-slate-800 transition-all hover:scale-[1.01] active:scale-[0.99] cursor-pointer"
                >
                  <Eye className="h-4 w-4 text-slate-400" />
                  <span>Access as Guest (Viewer Only)</span>
                </button>
              </div>
            )}

            <div className="mt-8 pt-6 border-t border-slate-850 flex items-center justify-center text-[10px] text-slate-500 gap-1.5 font-medium">
              <span>Security Guideline Compliant</span>
              <span>•</span>
              <span>Mabalacat IT Dept</span>
            </div>
          </div>
        </div>
      )}

      {/* MODALS RENDER */}
      <NewSOAModal
        isOpen={isNewSOAModalOpen}
        stakeholders={filteredStakeholders}
        currentUser={currentUser}
        onClose={() => setIsNewSOAModalOpen(false)}
        onSubmit={handleCreateSOA}
      />

      <RegisterModal
        isOpen={isRegisterModalOpen}
        onClose={() => setIsRegisterModalOpen(false)}
        onSubmit={handleRequestRegistration}
      />

      <SOADetailsModal
        soa={selectedSOA}
        isOpen={isDetailModalOpen}
        onClose={() => setIsDetailModalOpen(false)}
        currentUser={currentUser}
        onVerify={handleVerifySOA}
        onSort={handleSortSOA}
        onChecklist={handleChecklistUpdate}
        onProcess={handleProcessToAccounting}
        onManualStatus={handleManualStatusUpdate}
        onResubmit={handleResubmitIssue}
        showToast={showToast}
      />

      {/* Toast Overlay Stack */}
      <div className="fixed top-5 right-5 z-[200] flex flex-col gap-3 max-w-sm w-full pointer-events-none">
        <AnimatePresence>
          {toasts.map((toast) => (
            <motion.div
              key={toast.id}
              initial={{ opacity: 0, y: -20, scale: 0.9, x: 50 }}
              animate={{ opacity: 1, y: 0, scale: 1, x: 0 }}
              exit={{ opacity: 0, scale: 0.85, x: 50, transition: { duration: 0.2 } }}
              className={`p-4 rounded-2xl shadow-xl border backdrop-blur-md flex items-start gap-3 pointer-events-auto shrink-0 relative overflow-hidden transition-all duration-300 ${
                toast.type === "success"
                  ? "bg-slate-900/95 border-emerald-500/30 text-emerald-200"
                  : toast.type === "error"
                  ? "bg-slate-900/95 border-rose-500/30 text-rose-200"
                  : toast.type === "warning"
                  ? "bg-slate-900/95 border-amber-500/30 text-amber-200"
                  : "bg-slate-900/95 border-slate-700/35 text-slate-200"
              }`}
            >
              <div className="shrink-0 mt-0.5">
                {toast.type === "success" && <CheckCircle2 className="h-5 w-5 text-emerald-400" />}
                {toast.type === "error" && <XCircle className="h-5 w-5 text-rose-400" />}
                {toast.type === "warning" && <AlertTriangle className="h-5 w-5 text-amber-400" />}
                {toast.type === "info" && <InfoIcon className="h-5 w-5 text-sky-400" />}
              </div>
              
              <div className="flex-grow text-xs font-semibold leading-relaxed">
                {toast.message}
              </div>

              <button
                onClick={() => removeToast(toast.id)}
                className="shrink-0 text-slate-400 hover:text-white p-0.5 rounded-lg transition-all cursor-pointer"
              >
                <CloseIcon className="h-4 w-4" />
              </button>

              <div className="absolute bottom-0 left-0 h-[3px] bg-gradient-to-r from-transparent via-white/20 to-white/40 w-full animate-pulse" />
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

    </div>
  );
}
