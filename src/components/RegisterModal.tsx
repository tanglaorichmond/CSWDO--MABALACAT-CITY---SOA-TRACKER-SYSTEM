import React, { useState } from "react";
import { X, Mail, User, Briefcase } from "lucide-react";

interface RegisterModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (email: string, name: string, position: string, category: "Hospital" | "Funeral" | "Laboratory") => Promise<void>;
}

export default function RegisterModal({ isOpen, onClose, onSubmit }: RegisterModalProps) {
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [position, setPosition] = useState("");
  const [category, setCategory] = useState<"Hospital" | "Funeral" | "Laboratory">("Hospital");
  const [submitting, setSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    await onSubmit(email, name, position, category);
    setSubmitting(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-[300] flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-700 rounded-3xl p-8 max-w-sm w-full shadow-2xl">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-lg font-black text-white uppercase tracking-widest">Request Registration</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-white">
            <X className="h-5 w-5" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1">Full Name</label>
            <div className="flex bg-slate-950 border border-slate-700 rounded-xl overflow-hidden">
                <span className="p-3 text-slate-500"><User className="h-4 w-4"/></span>
                <input type="text" required value={name} onChange={e => setName(e.target.value)} className="w-full bg-transparent p-3 text-white text-sm" placeholder="John Doe" />
            </div>
          </div>
          <div>
            <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1">Google Email</label>
            <div className="flex bg-slate-950 border border-slate-700 rounded-xl overflow-hidden">
                <span className="p-3 text-slate-500"><Mail className="h-4 w-4"/></span>
                <input type="email" required value={email} onChange={e => setEmail(e.target.value)} className="w-full bg-transparent p-3 text-white text-sm" placeholder="example@gmail.com" />
            </div>
          </div>
          <div>
            <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1">Job Position</label>
            <div className="flex bg-slate-950 border border-slate-700 rounded-xl overflow-hidden">
                <span className="p-3 text-slate-500"><Briefcase className="h-4 w-4"/></span>
                <input type="text" required value={position} onChange={e => setPosition(e.target.value)} className="w-full bg-transparent p-3 text-white text-sm" placeholder="Staff" />
            </div>
          </div>
          <div>
            <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1">Assigned Category</label>
            <div className="flex bg-slate-950 border border-slate-700 rounded-xl overflow-hidden">
                <select value={category} onChange={e => setCategory(e.target.value as "Hospital" | "Funeral" | "Laboratory")} className="w-full bg-transparent p-3 text-white text-sm">
                    <option value="Hospital">Hospital</option>
                    <option value="Funeral">Funeral</option>
                    <option value="Laboratory">Laboratory</option>
                </select>
            </div>
          </div>
          <button type="submit" disabled={submitting} className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold text-sm py-3 px-6 rounded-xl transition-all">
            {submitting ? "Submitting..." : "Send Request to Admin"}
          </button>
        </form>
      </div>
    </div>
  );
}
