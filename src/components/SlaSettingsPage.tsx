import React, { useState, useEffect } from "react";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { db } from "../firebase/firebase";
import { SLASettings, UserProfile } from "../types";
import { 
  Settings, 
  Save, 
  Clock, 
  Loader2, 
  AlertCircle,
  CheckCircle2,
  Calendar,
  Hourglass,
  Activity,
  History
} from "lucide-react";
import { motion } from "motion/react";

interface SlaSettingsPageProps {
  user: UserProfile;
}

const DEFAULT_SLA: SLASettings = {
  receiving: 1,
  verification: 4,
  sorting: 2,
  checklist: 3,
  accounting: 5,
  release: 2,
  updatedAt: new Date().toISOString(),
  updatedBy: "System Default",
  showDirectoryToAll: true,
  showUsersToAll: false,
  showSettingsToAll: false
};

export default function SlaSettingsPage({ user }: SlaSettingsPageProps) {
  const [settings, setSettings] = useState<SLASettings>(DEFAULT_SLA);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  useEffect(() => {
    async function fetchSettings() {
      try {
        const docRef = doc(db, "settings", "sla");
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          setSettings({
            ...DEFAULT_SLA,
            ...docSnap.data()
          } as SLASettings);
        } else {
          // Document doesn't exist yet, we'll use defaults and show a notice
          console.log("SLA settings document not found, using defaults.");
        }
      } catch (err) {
        console.error("Error fetching SLA settings:", err);
        // Fallback to default if there's a permission error or other issue
      } finally {
        setLoading(false);
      }
    }
    fetchSettings();
  }, []);

  const handleSave = async () => {
    setSaving(true);
    setMessage(null);
    try {
      const updatedSettings = {
        ...settings,
        updatedAt: new Date().toISOString(),
        updatedBy: `${user.displayName} (${user.position})`
      };
      await setDoc(doc(db, "settings", "sla"), updatedSettings);
      setSettings(updatedSettings);
      setMessage({ type: 'success', text: 'SLA Timeline Settings updated successfully.' });
    } catch (err) {
      console.error("Error saving settings:", err);
      setMessage({ type: 'error', text: 'Failed to save settings. Please check permissions.' });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="h-[60vh] flex flex-col items-center justify-center space-y-4">
        <Loader2 className="h-10 w-10 text-blue-600 animate-spin" />
        <p className="text-slate-500 font-bold uppercase tracking-widest text-xs">Syncing System Configurations...</p>
      </div>
    );
  }

  const steps = [
    { key: 'receiving', label: 'Receiving', icon: Clock, desc: 'Initial intake and document check-in.' },
    { key: 'verification', label: 'Verification', icon: Activity, desc: 'Detailed document review and validation.' },
    { key: 'sorting', icon: Calendar, label: 'Sorting', desc: 'Categorizing and routing to proper municipal baskets.' },
    { key: 'checklist', icon: CheckCircle2, label: 'Checklist', desc: 'Auditing of all 7 mandatory attachments.' },
    { key: 'accounting', icon: Settings, label: 'Accounting', desc: 'Voucher processing and city account clearance.' },
    { key: 'release', icon: Hourglass, label: 'Release', desc: 'Finalizing payout and physical release.' }
  ];

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-20">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div className="space-y-1.5 text-center lg:text-left">
          <div className="flex flex-col lg:flex-row items-center gap-2">
            <div className="p-2 bg-blue-600 rounded-lg shadow-lg">
              <Settings className="h-5 w-5 text-white" />
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-slate-800 uppercase tracking-tight">System SLA Timelines</h1>
          </div>
          <p className="text-slate-500 font-medium text-xs sm:text-sm">Define target resolution times for each workflow stage to monitor delays.</p>
        </div>
        
        <button
          onClick={handleSave}
          disabled={saving}
          className="w-full lg:w-auto flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-black uppercase tracking-widest px-6 py-4 lg:py-3 rounded-2xl shadow-xl shadow-blue-600/20 transition-all active:scale-95"
        >
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          {saving ? 'Saving...' : 'Apply Changes'}
        </button>
      </div>

      {message && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className={`p-4 rounded-2xl border flex items-center gap-3 ${
            message.type === 'success' ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-rose-50 border-rose-200 text-rose-800'
          }`}
        >
          {message.type === 'success' ? <CheckCircle2 className="h-5 w-5" /> : <AlertCircle className="h-5 w-5" />}
          <span className="text-xs font-bold uppercase tracking-wide">{message.text}</span>
        </motion.div>
      )}

      {/* SLA Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-8">
        {steps.map((step) => (
          <div 
            key={step.key}
            className="bg-white border border-slate-100 rounded-3xl p-6 shadow-sm hover:shadow-md transition-all group"
          >
            <div className="flex items-start justify-between mb-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <step.icon className="h-4 w-4 text-blue-600" />
                  <h3 className="font-black text-slate-800 uppercase tracking-widest text-sm">{step.label}</h3>
                </div>
                <p className="text-[10px] text-slate-400 font-bold uppercase leading-tight">{step.desc}</p>
              </div>
              <div className="bg-slate-50 px-3 py-1 rounded-xl border border-slate-100">
                <span className="text-[10px] font-black text-slate-600 uppercase tracking-tighter">Target Step SLA</span>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <div className="relative flex-grow">
                <input
                  type="number"
                  min="1"
                  max="30"
                  value={settings[step.key as keyof SLASettings] as number}
                  onChange={(e) => setSettings({ ...settings, [step.key]: parseInt(e.target.value) || 1 })}
                  className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-5 py-3.5 text-lg font-black text-slate-800 focus:outline-none focus:border-blue-600 transition-colors"
                />
                <span className="absolute right-5 top-1/2 -translate-y-1/2 text-xs font-black text-slate-400 uppercase tracking-widest">Days</span>
              </div>
            </div>
            
            <div className="mt-4 flex items-center justify-between text-[10px] font-bold text-slate-400">
              <div className="flex items-center gap-1">
                <div className={`h-2 w-2 rounded-full ${settings[step.key as keyof SLASettings] as number > 7 ? 'bg-amber-400' : 'bg-blue-400'}`} />
                <span>Impact: {settings[step.key as keyof SLASettings] as number > 7 ? 'Critical Pacing' : 'Normal Stream'}</span>
              </div>
              <div className="flex gap-1">
                {[1, 2, 3].map(i => (
                  <div key={i} className={`h-1 w-4 rounded-full ${i <= ((settings[step.key as keyof SLASettings] as number) / 5) ? 'bg-blue-600' : 'bg-slate-100'}`} />
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Tab Access Settings */}
      <div className="bg-white border border-slate-100 rounded-3xl p-6 sm:p-8 shadow-sm space-y-6">
        <div>
          <h2 className="text-sm font-black text-slate-800 uppercase tracking-widest flex items-center gap-2">
            <span className="p-1 px-1.5 bg-blue-100 text-blue-700 rounded-md">🔒</span>
            System Navigation Access Settings
          </h2>
          <p className="text-[11px] text-slate-400 font-bold uppercase mt-1 leading-relaxed">
            Allow non-administrators (standard users) to view these system workspace views.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-3">
          {/* Toggle for Stakeholders Directory */}
          <div className="bg-slate-50 border border-slate-100 p-4.5 rounded-2xl flex flex-col justify-between space-y-4">
            <div>
              <span className="block text-[10px] uppercase font-black tracking-widest text-slate-400 mb-1">Stakeholders Directory</span>
              <p className="text-[10px] font-semibold text-slate-600 uppercase leading-snug">
                Permit standard workspace users to view the verified hospital/funeral directory list.
              </p>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-black uppercase text-slate-700">
                {settings.showDirectoryToAll ? "🟢 Visible to Users" : "🔴 Admin-Only"}
              </span>
              <button
                type="button"
                id="toggle-directory-button"
                disabled={user.role !== "System Administrator"}
                onClick={() => setSettings({ ...settings, showDirectoryToAll: !settings.showDirectoryToAll })}
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${user.role !== "System Administrator" ? "opacity-30 cursor-not-allowed" : ""} ${
                  settings.showDirectoryToAll ? "bg-blue-600" : "bg-slate-200"
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                    settings.showDirectoryToAll ? "translate-x-5" : "translate-x-0"
                  }`}
                />
              </button>
            </div>
          </div>

          {/* Toggle for Workspace Users */}
          <div className="bg-slate-50 border border-slate-100 p-4.5 rounded-2xl flex flex-col justify-between space-y-4">
            <div>
              <span className="block text-[10px] uppercase font-black tracking-widest text-slate-400 mb-1">Workspace Users</span>
              <p className="text-[10px] font-semibold text-slate-600 uppercase leading-snug">
                Permit standard workspace users to browse authorized personnel roles of the agency.
              </p>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-black uppercase text-slate-700">
                {settings.showUsersToAll ? "🟢 Visible to Users" : "🔴 Admin-Only"}
              </span>
              <button
                type="button"
                id="toggle-users-button"
                disabled={user.role !== "System Administrator"}
                onClick={() => setSettings({ ...settings, showUsersToAll: !settings.showUsersToAll })}
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${user.role !== "System Administrator" ? "opacity-30 cursor-not-allowed" : ""} ${
                  settings.showUsersToAll ? "bg-blue-600" : "bg-slate-200"
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                    settings.showUsersToAll ? "translate-x-5" : "translate-x-0"
                  }`}
                />
              </button>
            </div>
          </div>

          {/* Toggle for System Settings */}
          <div className="bg-slate-50 border border-slate-100 p-4.5 rounded-2xl flex flex-col justify-between space-y-4">
            <div>
              <span className="block text-[10px] uppercase font-black tracking-widest text-slate-400 mb-1">System Settings</span>
              <p className="text-[10px] font-semibold text-slate-600 uppercase leading-snug">
                Permit standard workspace users to view current SLA workflows and city pacing values.
              </p>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-black uppercase text-slate-700">
                {settings.showSettingsToAll ? "🟢 Visible to Users" : "🔴 Admin-Only"}
              </span>
              <button
                type="button"
                id="toggle-settings-button"
                disabled={user.role !== "System Administrator"}
                onClick={() => setSettings({ ...settings, showSettingsToAll: !settings.showSettingsToAll })}
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${user.role !== "System Administrator" ? "opacity-30 cursor-not-allowed" : ""} ${
                  settings.showSettingsToAll ? "bg-blue-600" : "bg-slate-200"
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                    settings.showSettingsToAll ? "translate-x-5" : "translate-x-0"
                  }`}
                />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Revision History Footer */}
      <div className="bg-slate-50/80 border border-slate-100 rounded-3xl p-5 sm:p-6 flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-slate-200 rounded-xl text-slate-500">
            <History className="h-4 w-4" />
          </div>
          <div className="space-y-0.5 text-center sm:text-left">
            <span className="text-[9px] sm:text-[10px] font-black text-slate-400 uppercase tracking-widest block">Audit Disposition Log</span>
            <p className="text-[10px] sm:text-[11px] font-bold text-slate-600">Last updated by <span className="text-blue-600">{settings.updatedBy}</span></p>
          </div>
        </div>
        <div className="text-center sm:text-right">
          <span className="text-[9px] sm:text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-0.5">Timeline Modified</span>
          <span className="text-[10px] sm:text-[11px] font-bold text-slate-800">{new Date(settings.updatedAt).toLocaleString()}</span>
        </div>
      </div>
    </div>
  );
}
