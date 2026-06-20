import React, { useState, useEffect } from "react";
import { UserProfile, UserRole } from "../types";
import { subscribeToUsers, updateUserProfileFields, registerPreUser, deleteUserProfile, subscribeToRegistrationRequests, deleteRegistrationRequest, saveUserProfile } from "../firebase/userDb";
import { Shield, User as UserIcon, Check, Users, ShieldAlert, Award, Plus, Trash2, Mail, Keyboard, ChevronDown, ChevronUp } from "lucide-react";
import ConfirmationModal from "./ConfirmationModal";

interface UserManagementProps {
  showToast: (message: string, type?: "success" | "error" | "info" | "warning") => void;
}

export default function UserManagement({ showToast }: UserManagementProps) {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [editingUid, setEditingUid] = useState<string | null>(null);
  const [positionInput, setPositionInput] = useState("");
  const [categoryInput, setCategoryInput] = useState<"Hospital" | "Funeral" | "Laboratory" | "">("");
  const [roleInput, setRoleInput] = useState<UserRole>("Guest");
  const [canEditInput, setCanEditInput] = useState(true);
  const [canDeleteInput, setCanDeleteInput] = useState(false);
  const [loading, setLoading] = useState(true);

  // Pre-registration state
  const [showPreRegister, setShowPreRegister] = useState(false);
  const [preEmail, setPreEmail] = useState("");
  const [preName, setPreName] = useState("");
  const [prePosition, setPrePosition] = useState("");
  const [preCategory, setPreCategory] = useState<"Hospital" | "Funeral" | "Laboratory">("Hospital");
  const [preRole, setPreRole] = useState<UserRole>("User");
  const [preCanEdit, setPreCanEdit] = useState(true);
  const [preCanDelete, setPreCanDelete] = useState(false);
  const [registering, setRegistering] = useState(false);

  // States for user deletion confirmation
  const [deleteConfirmation, setDeleteConfirmation] = useState<{
    isOpen: boolean;
    uid: string;
    userName: string;
  }>({
    isOpen: false,
    uid: "",
    userName: ""
  });

  // Subscribe to real-time users collection
  const [registrationRequests, setRegistrationRequests] = useState<any[]>([]);

  useEffect(() => {
    const unsubscribeUsers = subscribeToUsers((updatedUsers) => {
      setUsers(updatedUsers);
      setLoading(false);
    });
    const unsubscribeRequests = subscribeToRegistrationRequests((updatedRequests) => {
      setRegistrationRequests(updatedRequests);
    });
    return () => {
        unsubscribeUsers();
        unsubscribeRequests();
    }
  }, []);

  const handleEditClick = (user: UserProfile) => {
    setEditingUid(user.uid);
    setPositionInput(user.position || "");
    setCategoryInput(user.category || "");
    setRoleInput(user.role);
    setCanEditInput(user.canEdit !== false); // default to true
    setCanDeleteInput(!!user.canDelete); // default to false
  };

  const handleSaveClick = async (uid: string) => {
    try {
      await updateUserProfileFields(uid, {
        position: positionInput || "Staff",
        category: categoryInput as any,
        role: roleInput,
        canEdit: canEditInput,
        canDelete: canDeleteInput
      });
      setEditingUid(null);
      showToast("User profile and system permissions updated.", "success");
    } catch (e) {
      showToast("Failed to update user. Please try again.", "error");
    }
  };

  const handlePreRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!preEmail.trim() || !preName.trim()) {
      showToast("Please fill in both Google Email and Full Name.", "warning");
      return;
    }
    const duplicate = users.some(u => u.email.toLowerCase().trim() === preEmail.toLowerCase().trim());
    if (duplicate) {
      showToast("This Google Email address is already registered or invited.", "warning");
      return;
    }
    setRegistering(true);
    try {
      const newUser: UserProfile = {
        uid: "pre-" + Math.random().toString(36).substr(2, 9),
        email: preEmail.toLowerCase().trim(),
        displayName: preName,
        position: prePosition || "Staff",
        category: preCategory,
        role: preRole,
        canEdit: preCanEdit,
        canDelete: preCanDelete,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      await saveUserProfile(newUser);
      setPreEmail("");
      setPreName("");
      setPrePosition("");
      setPreCategory("Hospital");
      setPreRole("User");
      setPreCanEdit(true);
      setPreCanDelete(false);
      setShowPreRegister(false);
      showToast("Account pre-registered successfully! This user is now authorized to log in via Google.", "success");
    } catch (err) {
      showToast("Failed to pre-register Google account.", "error");
    } finally {
      setRegistering(false);
    }
  };

  const handleDeleteUserClick = (uid: string, name: string) => {
    setDeleteConfirmation({
      isOpen: true,
      uid,
      userName: name
    });
  };

  const handleConfirmDeleteUser = async () => {
    try {
      await deleteUserProfile(deleteConfirmation.uid);
      showToast(`Access revoked. User profile for "${deleteConfirmation.userName}" was successfully deleted.`, "success");
    } catch (err) {
      showToast("Failed to delete user profile.", "error");
    }
  };

  // Summarize counts
  const adminCount = users.filter(u => u.role === "System Administrator" || u.role === "Admin").length;
  const userCount = users.filter(u => u.role === "User").length;
  const guestCount = users.filter(u => u.role === "Guest").length;

  const [pendingRoles, setPendingRoles] = useState<Record<string, UserRole>>({});

  const handleApproveRegistration = async (request: any) => {
    try {
      const role = pendingRoles[request.uid] || "User";
      const now = new Date().toISOString();
      const profile: UserProfile = {
        uid: request.uid,
        email: request.email,
        displayName: request.displayName,
        position: request.position,
        role: role,
        category: request.category,
        createdAt: now,
        updatedAt: now
      };
      await saveUserProfile(profile);
      await deleteRegistrationRequest(request.uid);
      showToast(`Registration for ${request.displayName} approved as ${role}.`, "success");
    } catch (e) {
      showToast("Failed to approve registration.", "error");
    }
  };

  return (
    <div className="bg-white rounded-3xl border border-slate-100 shadow-md p-4 sm:p-8 animate-fade-in space-y-6">
      
      {/* Title banner */}
      <div className="border-b border-slate-100 pb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h3 className="text-lg sm:text-xl font-extrabold text-slate-900 flex items-center space-x-2 uppercase tracking-tight">
            <Shield className="h-5.5 w-5.5 text-violet-600" />
            <span>Workspace Personnel & Registrations</span>
          </h3>
          <p className="text-[10px] sm:text-xs text-slate-500 mt-1 font-medium leading-relaxed">
            Manage authorized personnel, set Job Positions, change clearance levels, and review registration requests.
          </p>
        </div>

        {/* Permissions tally pills */}
        <div className="flex flex-wrap gap-2">
          {registrationRequests.length > 0 && (
            <div className="bg-amber-50 text-amber-700 px-3 py-1.5 rounded-xl text-xs font-bold border border-amber-100 flex items-center space-x-1">
              <ShieldAlert className="h-3.5 w-3.5" />
              <span>{registrationRequests.length} Pending Approval</span>
            </div>
          )}
          <div className="bg-violet-50 text-violet-700 px-3 py-1.5 rounded-xl text-xs font-bold border border-violet-100 flex items-center space-x-1">
            <Shield className="h-3.5 w-3.5" />
            <span>{adminCount} Admins</span>
          </div>
          <div className="bg-blue-50 text-blue-700 px-3 py-1.5 rounded-xl text-xs font-bold border border-blue-100 flex items-center space-x-1">
            <Award className="h-3.5 w-3.5" />
            <span>{userCount} Users</span>
          </div>
        </div>
      </div>

      {registrationRequests.length > 0 && (
        <div className="bg-amber-50 rounded-2xl p-6 border border-amber-100">
           <h4 className="text-sm font-bold text-amber-900 mb-4 flex items-center gap-2">
              <Mail className="h-4 w-4" /> Registration Requests
           </h4>
           <div className="space-y-4">
              {registrationRequests.map(request => (
                <div key={request.uid} className="bg-white p-4 rounded-xl shadow-sm border border-amber-100 flex items-center justify-between">
                  <div>
                    <div className="font-bold text-slate-900">{request.displayName}</div>
                    <div className="text-xs text-slate-500">
                      {request.email} - {request.position} 
                      <span className="ml-2 inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-black uppercase tracking-tighter bg-amber-100 text-amber-800 border border-amber-200">
                        Requested: {request.category || "Not Set"}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <select
                      className="text-xs font-bold p-2 border border-slate-200 rounded-lg bg-slate-50"
                      value={pendingRoles[request.uid] || "User"}
                      onChange={(e) => setPendingRoles({...pendingRoles, [request.uid]: e.target.value as UserRole})}
                    >
                      <option value="User">User</option>
                      <option value="System Administrator">System Administrator</option>
                      <option value="Admin">Admin</option>
                      <option value="Guest">Guest</option>
                    </select>
                    <button
                      onClick={() => handleApproveRegistration(request)}
                      className="bg-emerald-600 text-white font-bold text-xs py-2 px-4 rounded-lg hover:bg-emerald-500 transition-colors"
                    >
                      Approve
                    </button>
                  </div>
                </div>
              ))}
           </div>
        </div>
      )}

      {/* Pre-registration Toggle section */}
      <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Mail className="h-5 w-5 text-blue-600" />
            <div>
              <h4 className="text-sm font-bold text-slate-900">Authorize Google Accounts</h4>
              <p className="text-[11px] text-slate-400">Only authorized Google Emails can sign in to the full tracking platform.</p>
            </div>
          </div>
          <button
            onClick={() => setShowPreRegister(!showPreRegister)}
            className="flex items-center space-x-1 text-xs bg-white border border-slate-200 px-3.5 py-2 rounded-xl font-semibold shadow-sm hover:bg-slate-50 transition-colors"
          >
            <Plus className="h-3.5 w-3.5 text-blue-600" />
            <span>Pre-register User</span>
            {showPreRegister ? <ChevronUp className="h-3.5 w-3.5 text-slate-400" /> : <ChevronDown className="h-3.5 w-3.5 text-slate-400" />}
          </button>
        </div>

        {/* Pre-registration Form */}
        {showPreRegister && (
          <form onSubmit={handlePreRegisterSubmit} className="mt-4 pt-4 border-t border-slate-200/50 space-y-4 animate-fade-in">
            {/* Row 1: Basic Information Fields */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
              <div>
                <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1">Google Email Address *</label>
                <input
                  type="email"
                  required
                  value={preEmail}
                  onChange={e => setPreEmail(e.target.value)}
                  placeholder="example@gmail.com"
                  className="w-full text-xs p-2.5 rounded-xl border border-slate-200 bg-white"
                />
              </div>
              <div>
                <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1">Full Name *</label>
                <input
                  type="text"
                  required
                  value={preName}
                  onChange={e => setPreName(e.target.value)}
                  placeholder="John Doe"
                  className="w-full text-xs p-2.5 rounded-xl border border-slate-200 bg-white"
                />
              </div>
              <div>
                <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1">Job Position</label>
                <input
                  type="text"
                  value={prePosition}
                  onChange={e => setPrePosition(e.target.value)}
                  placeholder="E.g., Intake Clerk"
                  className="w-full text-xs p-2.5 rounded-xl border border-slate-200 bg-white"
                />
              </div>
              <div>
                <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1">Clearance Level</label>
                <select
                  value={preRole}
                  onChange={e => {
                    const selectedRole = e.target.value as UserRole;
                    setPreRole(selectedRole);
                    if (selectedRole === "Guest") {
                      setPreCanEdit(false);
                      setPreCanDelete(false);
                    } else if (selectedRole === "System Administrator") {
                      setPreCanEdit(true);
                      setPreCanDelete(true);
                    } else if (selectedRole === "Admin") {
                      setPreCanEdit(true);
                      setPreCanDelete(true);
                    } else {
                      setPreCanEdit(true);
                      setPreCanDelete(false);
                    }
                  }}
                  className="w-full text-xs p-2.5 rounded-xl border border-slate-200 bg-white"
                >
                  <option value="User">User Account</option>
                  <option value="System Administrator">System Administrator</option>
                  <option value="Admin">Admin Account</option>
                  <option value="Guest">Guest Viewer</option>
                </select>
              </div>

              {/* Pre-register Category */}
              <div>
                <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1">Entity Category</label>
                <select
                  value={preCategory}
                  onChange={(e) => setPreCategory(e.target.value as any)}
                  className="w-full text-xs p-2.5 rounded-xl border border-slate-200 bg-white"
                >
                  <option value="Hospital">Hospital</option>
                  <option value="Funeral">Funeral</option>
                  <option value="Laboratory">Laboratory</option>
                </select>
              </div>
            </div>

            {/* Row 2: Toggles & Button */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-3 border-t border-slate-200/40">
              <div className="flex items-center space-x-6">
                <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">Configure Actions allowed:</span>
                
                {/* Can Edit Toggle */}
                <label className="inline-flex items-center space-x-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={preCanEdit}
                    disabled={preRole === "Guest"}
                    onChange={(e) => setPreCanEdit(e.target.checked)}
                    className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500/20 cursor-pointer disabled:opacity-50"
                  />
                  <span className={`text-xs font-bold ${preRole === "Guest" ? "text-slate-400" : "text-slate-700"}`}>Can Edit/Advance Movements</span>
                </label>

                {/* Can Delete Toggle */}
                <label className="inline-flex items-center space-x-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={preCanDelete}
                    disabled={preRole === "Guest"}
                    onChange={(e) => setPreCanDelete(e.target.checked)}
                    className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500/20 cursor-pointer disabled:opacity-50"
                  />
                  <span className={`text-xs font-bold ${preRole === "Guest" ? "text-slate-400" : "text-slate-700"}`}>Can Delete Records</span>
                </label>
              </div>

              <button
                type="submit"
                disabled={registering}
                className="bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs py-2.5 px-6 rounded-xl transition-all shadow-sm shrink-0 hover:scale-[1.01] active:scale-[0.99]"
              >
                {registering ? "Adding..." : "Complete Pre-register"}
              </button>
            </div>
          </form>
        )}
      </div>

      {loading ? (
        <div className="space-y-3 py-6">
          <div className="h-10 bg-slate-100 animate-pulse rounded-xl w-full"></div>
          <div className="h-10 bg-slate-100 animate-pulse rounded-xl w-3/4"></div>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Mobile Grid View (Cards) */}
          <div className="grid grid-cols-1 gap-4 md:hidden">
            {users.map((profile) => {
              const isEditing = editingUid === profile.uid;
              const isPending = profile.uid.startsWith("pre-");
              return (
                <div key={profile.uid} className="bg-slate-50/50 border border-slate-100 p-4 rounded-2xl space-y-4 transition-all hover:bg-white hover:shadow-sm">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className={`h-10 w-10 rounded-xl flex items-center justify-center font-black text-xs shadow-sm ${
                        isPending ? "bg-amber-100 text-amber-700" : "bg-violet-100 text-violet-700"
                      }`}>
                        {profile.displayName ? profile.displayName.charAt(0) : "U"}
                      </div>
                      <div>
                        <div className="font-extrabold text-slate-900 text-xs uppercase tracking-tight">{profile.displayName}</div>
                        <div className="text-[10px] text-slate-400 font-bold font-mono">{profile.email}</div>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <span className={`inline-flex px-2 py-0.5 rounded-lg text-[8px] uppercase font-black tracking-widest ${
                        profile.role === "System Administrator" 
                          ? "bg-violet-100 text-violet-800" 
                          : profile.role === "Admin"
                          ? "bg-purple-100 text-purple-800 border border-purple-200"
                          : profile.role === "User" 
                          ? "bg-blue-100 text-blue-800" 
                          : "bg-slate-100 text-slate-600"
                      }`}>
                        {profile.role}
                      </span>
                      {isPending && (
                        <span className="text-[7px] font-black uppercase tracking-widest text-amber-600">Pending Login</span>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4 pt-3 border-t border-slate-100">
                    <div>
                      <span className="text-[8px] uppercase font-black tracking-widest text-slate-400 block mb-1">Job Position</span>
                      {isEditing ? (
                        <input
                          type="text"
                          value={positionInput}
                          onChange={(e) => setPositionInput(e.target.value)}
                          className="w-full text-[10px] font-bold rounded-lg border border-slate-200 p-2 focus:ring-1 focus:ring-blue-500 bg-white"
                        />
                      ) : (
                        <span className="text-[10px] font-bold text-slate-800 uppercase tracking-tight truncate block">
                          {profile.position || "--"}
                        </span>
                      )}
                    </div>
                    <div>
                      <span className="text-[8px] uppercase font-black tracking-widest text-slate-400 block mb-1">Entity Category</span>
                      {isEditing ? (
                        <select
                          value={categoryInput}
                          onChange={(e) => setCategoryInput(e.target.value as any)}
                          className="w-full text-[10px] font-bold rounded-lg border border-slate-200 p-2 focus:ring-1 focus:ring-blue-500 bg-white"
                        >
                          <option value="">-- None --</option>
                          <option value="Hospital">Hospital</option>
                          <option value="Funeral">Funeral</option>
                          <option value="Laboratory">Laboratory</option>
                        </select>
                      ) : (
                        <span className="text-[10px] font-bold text-slate-800 uppercase tracking-tight truncate block">
                          {profile.category || "--"}
                        </span>
                      )}
                    </div>
                    <div>
                      <span className="text-[8px] uppercase font-black tracking-widest text-slate-400 block mb-1">Authority</span>
                      {isEditing ? (
                        <select
                          value={roleInput}
                          onChange={(e) => setRoleInput(e.target.value as UserRole)}
                          className="w-full text-[10px] font-bold rounded-lg border border-slate-200 p-2 focus:ring-1 focus:ring-blue-500 bg-white"
                        >
                          <option value="System Administrator">System Administrator</option>
                          <option value="Admin">Admin</option>
                          <option value="User">User</option>
                          <option value="Guest">Guest</option>
                        </select>
                      ) : (
                        <div className="flex gap-1 flex-wrap">
                          <span className={`text-[8px] font-black uppercase px-1.5 py-0.5 rounded ${profile.canEdit !== false ? 'text-emerald-600 bg-emerald-50' : 'text-slate-400 bg-slate-50'}`}>Edit</span>
                          <span className={`text-[8px] font-black uppercase px-1.5 py-0.5 rounded ${profile.canDelete ? 'text-rose-600 bg-rose-50' : 'text-slate-400 bg-slate-50'}`}>Delete</span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex gap-2 pt-3">
                    {isEditing ? (
                      <button
                        onClick={() => handleSaveClick(profile.uid)}
                        className="flex-1 bg-emerald-600 text-white font-black text-[9px] uppercase tracking-widest py-2 rounded-xl flex items-center justify-center gap-1 shadow-lg shadow-emerald-600/20"
                      >
                        <Check className="h-3 w-3" />
                        Save Changes
                      </button>
                    ) : (
                      <>
                        <button
                          onClick={() => handleEditClick(profile)}
                          className="flex-1 bg-white border border-slate-200 text-slate-600 font-black text-[9px] uppercase tracking-widest py-2 rounded-xl transition-colors hover:bg-slate-50"
                        >
                          Modify Access
                        </button>
                        <button
                          onClick={() => handleDeleteUserClick(profile.uid, profile.displayName)}
                          className="px-4 text-slate-400 border border-slate-200 rounded-xl hover:text-rose-600 hover:bg-rose-50 hover:border-rose-100 transition-all"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Desktop Table View */}
          <div className="hidden md:block overflow-x-auto rounded-2xl border border-slate-100">
            <table className="min-w-full divide-y divide-slate-100 text-left text-sm">
            <thead className="bg-slate-50 text-xs text-slate-500 uppercase tracking-widest font-semibold text-center sm:text-left">
              <tr>
                <th className="px-6 py-4">Google User Identity</th>
                <th className="px-6 py-4">Organizational Position</th>
                <th className="px-6 py-4">Assigned Category</th>
                <th className="px-6 py-4">Access Authority Level</th>
                <th className="px-6 py-4">Workflow Actions</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white uppercase">
              {users.map((profile) => {
                const isEditing = editingUid === profile.uid;
                const isPending = profile.uid.startsWith("pre-");
                return (
                  <tr key={profile.uid} className="hover:bg-slate-50/50 transition-colors">
                    
                    {/* Google User Identity */}
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center space-x-3">
                        <div className={`h-9 w-9 rounded-full flex items-center justify-center font-bold text-sm shadow-sm ${
                          isPending ? "bg-amber-100 text-amber-700" : "bg-violet-100 text-violet-700"
                        }`}>
                          {profile.displayName ? profile.displayName.charAt(0) : "U"}
                        </div>
                        <div>
                          <div className="font-bold text-slate-900 flex items-center space-x-2">
                            <span>{profile.displayName}</span>
                          </div>
                          <div className="text-xs text-slate-400 mt-0.5">{profile.email}</div>
                        </div>
                      </div>
                    </td>

                    {/* Organizational Job Position */}
                    <td className="px-6 py-4">
                      {isEditing ? (
                        <input
                          type="text"
                          value={positionInput}
                          onChange={(e) => setPositionInput(e.target.value)}
                          className="w-full text-xs font-semibold rounded-lg border border-slate-200 p-2 focus:ring-1 focus:ring-blue-500"
                        />
                      ) : (
                        <span className="text-sm font-semibold text-slate-700">
                          {profile.position || "-- Not Specified --"}
                        </span>
                      )}
                    </td>

                    {/* Entity Category */}
                    <td className="px-6 py-4">
                      {isEditing ? (
                        <select
                          value={categoryInput}
                          onChange={(e) => setCategoryInput(e.target.value as any)}
                          className="w-full text-xs font-semibold rounded-lg border border-slate-200 p-2 focus:ring-1 focus:ring-blue-500"
                        >
                          <option value="">-- None --</option>
                          <option value="Hospital">Hospital</option>
                          <option value="Funeral">Funeral</option>
                          <option value="Laboratory">Laboratory</option>
                        </select>
                      ) : (
                        <span className="text-sm font-semibold text-slate-700">
                          {profile.category || "--"}
                        </span>
                      )}
                    </td>

                    {/* Authority level */}
                    <td className="px-6 py-4 whitespace-nowrap">
                      {isEditing ? (
                        <select
                          value={roleInput}
                          onChange={(e) => {
                            const newRole = e.target.value as UserRole;
                            setRoleInput(newRole);
                            if (newRole === "Guest") {
                              setCanEditInput(false);
                              setCanDeleteInput(false);
                            } else if (newRole === "System Administrator") {
                              setCanEditInput(true);
                              setCanDeleteInput(true);
                            } else if (newRole === "Admin") {
                              setCanEditInput(true);
                              setCanDeleteInput(true);
                            } else {
                              setCanEditInput(true);
                              setCanDeleteInput(false);
                            }
                          }}
                          className="text-xs font-semibold rounded-lg border border-slate-200 p-2 focus:ring-1 focus:ring-blue-500"
                        >
                          <option value="System Administrator">System Administrator</option>
                          <option value="Admin">Admin</option>
                          <option value="User">User</option>
                          <option value="Guest">Guest</option>
                        </select>
                      ) : (
                        <span className={`inline-flex px-2.5 py-0.5 rounded-full text-[10px] uppercase font-bold tracking-wider ${
                          profile.role === "System Administrator" 
                            ? "bg-violet-100 text-violet-800" 
                            : profile.role === "Admin"
                            ? "bg-purple-100 text-purple-800 border border-purple-200"
                            : profile.role === "User" 
                            ? "bg-blue-100 text-blue-800" 
                            : "bg-slate-100 text-slate-600"
                        }`}>
                          {profile.role}
                        </span>
                      )}
                    </td>

                    {/* Workflow Actions allowed */}
                    <td className="px-6 py-4 whitespace-nowrap">
                      {isEditing ? (
                        <div className="flex flex-col space-y-1.5 bg-slate-50 p-2 rounded-xl border border-slate-200 text-left">
                          <label className="inline-flex items-center space-x-1.5 cursor-pointer text-xs font-semibold select-none">
                            <input
                              type="checkbox"
                              checked={canEditInput}
                              disabled={roleInput === "Guest"}
                              onChange={(e) => setCanEditInput(e.target.checked)}
                              className="h-3.5 w-3.5 rounded border-slate-300 text-blue-600 focus:ring-blue-500/20 cursor-pointer disabled:opacity-50"
                            />
                            <span className={roleInput === "Guest" ? "text-slate-400" : "text-slate-700"}>Can Edit/Advance</span>
                          </label>
                          <label className="inline-flex items-center space-x-1.5 cursor-pointer text-xs font-semibold select-none">
                            <input
                              type="checkbox"
                              checked={canDeleteInput}
                              disabled={roleInput === "Guest"}
                              onChange={(e) => setCanDeleteInput(e.target.checked)}
                              className="h-3.5 w-3.5 rounded border-slate-300 text-blue-600 focus:ring-blue-500/20 cursor-pointer disabled:opacity-50"
                            />
                            <span className={roleInput === "Guest" ? "text-slate-400" : "text-slate-700"}>Can Delete</span>
                          </label>
                        </div>
                      ) : (
                        <div className="flex flex-col space-y-1">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold w-max ${
                            profile.canEdit !== false && profile.role !== "Guest" 
                              ? "bg-emerald-50 text-emerald-700 border border-emerald-100" 
                              : "bg-rose-50 text-rose-700 border border-rose-100"
                          }`}>
                            <span>Edit: {profile.canEdit !== false && profile.role !== "Guest" ? "Allowed" : "Restricted"}</span>
                          </span>
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold w-max ${
                            profile.canDelete && profile.role !== "Guest"
                              ? "bg-emerald-50 text-emerald-700 border border-emerald-100" 
                              : "bg-rose-50 text-rose-700 border border-rose-100"
                          }`}>
                            <span>Delete: {profile.canDelete && profile.role !== "Guest" ? "Allowed" : "Restricted"}</span>
                          </span>
                        </div>
                      )}
                    </td>

                    {/* Registration status info */}
                    <td className="px-6 py-4 whitespace-nowrap">
                      {isPending ? (
                        <span className="inline-flex px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200 uppercase tracking-wider">
                          Invited / Pending login
                        </span>
                      ) : (
                        <span className="inline-flex px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 uppercase tracking-wider">
                          Active State
                        </span>
                      )}
                    </td>

                    {/* Actions toggles */}
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <div className="flex items-center justify-end space-x-2">
                        {isEditing ? (
                          <button
                            onClick={() => handleSaveClick(profile.uid)}
                            className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-[11px] py-1.5 px-3 rounded-lg flex items-center space-x-1 hover:scale-[1.02] active:scale-[0.98] transition-all shadow-sm"
                          >
                            <Check className="h-3 w-3" />
                            <span>Save Changes</span>
                          </button>
                        ) : (
                          <>
                            <button
                              onClick={() => handleEditClick(profile)}
                              className="text-blue-600 hover:text-blue-800 font-bold text-xs hover:underline transition-colors mr-2"
                            >
                              Modify Access
                            </button>

                            <button
                              onClick={() => handleDeleteUserClick(profile.uid, profile.displayName)}
                              className="text-slate-400 hover:text-red-600 p-1 rounded-lg hover:bg-slate-100 transition-colors"
                              title="Delete User Permission"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </>
                        )}
                      </div>
                    </td>

                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    )}

      {/* Safety Notice block */}
      <div className="bg-slate-50 rounded-2xl p-4.5 border border-slate-200/50 flex items-start space-x-3 text-xs text-slate-500">
        <ShieldAlert className="h-5 w-5 text-violet-600 shrink-0 mt-0.5" />
        <div>
          <span className="font-bold text-slate-800 block mb-0.5">Workspace Security Safeguard</span>
          Changes to access role types and administrative position indices take effect immediately on next real-time listener call on respective terminals. Only pre-registered Google accounts can log into full actions.
        </div>
      </div>

      <ConfirmationModal
        isOpen={deleteConfirmation.isOpen}
        title="Revoke Access & Delete User"
        message={`Are you absolutely sure you want to completely delete the user profile and revoke system access permissions for "${deleteConfirmation.userName}"?`}
        confirmText="Confirm Revocation"
        onConfirm={handleConfirmDeleteUser}
        onClose={() => setDeleteConfirmation({ isOpen: false, uid: "", userName: "" })}
      />

    </div>
  );
}
