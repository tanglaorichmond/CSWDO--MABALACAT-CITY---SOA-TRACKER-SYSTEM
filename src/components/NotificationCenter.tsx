import React, { useState, useMemo, useRef, useEffect } from "react";
import { SOADoc, StatusHistoryItem, SLASettings, DEFAULT_SLA_SETTINGS } from "../types";
import { 
  Bell, 
  X, 
  Clock, 
  AlertCircle, 
  CheckCircle2, 
  Layers, 
  Search, 
  SlidersHorizontal,
  ChevronRight,
  ArrowRight,
  Sparkles,
  Info
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

interface NotificationCenterProps {
  soas: SOADoc[];
  slaSettings: SLASettings | null;
  onSelectSOA: (soa: SOADoc) => void;
  showToast: (message: string, type?: "success" | "error" | "info" | "warning") => void;
}

interface ComputedNotification {
  id: string; // soaId_historyId or soaId_overdue
  soa: SOADoc;
  historyItem?: StatusHistoryItem;
  timestamp: Date;
  type: "issue" | "success" | "info" | "transition" | "breach";
  daysDelayed?: number;
}

export default function NotificationCenter({
  soas,
  slaSettings,
  onSelectSOA,
  showToast
}: NotificationCenterProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [lastViewedTime, setLastViewedTime] = useState<number>(() => {
    const saved = localStorage.getItem("last_viewed_notifications");
    return saved ? parseInt(saved, 10) : Date.now() - 3600000; // default 1 hour ago if first visit
  });

  const buttonRef = useRef<HTMLButtonElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        isOpen &&
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node) &&
        buttonRef.current &&
        !buttonRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen]);

  // Compute notifications list from status histories + active breaches
  const notifications = useMemo(() => {
    const list: ComputedNotification[] = [];

    const getOverdueInfo = (doc: SOADoc) => {
      if (doc.status === "Released") return null;
      
      const stepKeys: { [key: number]: keyof SLASettings } = {
        1: 'receiving', 2: 'verification', 3: 'sorting', 
        4: 'checklist', 5: 'accounting', 6: 'release'
      };

      const settings = slaSettings || DEFAULT_SLA_SETTINGS;
      const targetDays = settings[stepKeys[doc.currentStep]] as number;
      if (!targetDays) return null;

      const lastUpdate = new Date(doc.updatedAt).getTime();
      const diffDays = (Date.now() - lastUpdate) / (1000 * 60 * 60 * 24);
      if (diffDays > targetDays) {
        // Calculate the exact date & time the document breached the SLA target limit
        const breachTime = new Date(lastUpdate + targetDays * 24 * 60 * 60 * 1000);
        const value = Math.floor(diffDays - targetDays);
        const daysDelayed = value === 0 ? 1 : value;
        return { breachTime, daysDelayed };
      }
      return null;
    };

    soas.forEach((soa) => {
      // Only focus on delayed / overdue SOAs for notifications
      const overdueInfo = getOverdueInfo(soa);
      if (overdueInfo) {
        list.push({
          id: `${soa.id}_overdue`,
          soa,
          timestamp: overdueInfo.breachTime, // The actual time they breached SLA limits
          type: "breach",
          daysDelayed: overdueInfo.daysDelayed
        });
      }
    });

    // Sort newest first
    return list.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  }, [soas, slaSettings]);

  // Filter notifications based on tab and searching
  const filteredNotifications = useMemo(() => {
    return notifications.filter((notif) => {
      const matchesSearch = 
        notif.soa.stakeholderName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        notif.soa.batchNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (notif.historyItem?.notes?.toLowerCase().includes(searchQuery.toLowerCase()) || false) ||
        (notif.historyItem?.updatedBy?.toLowerCase().includes(searchQuery.toLowerCase()) || false) ||
        (notif.historyItem?.status?.toLowerCase().includes(searchQuery.toLowerCase()) || false);

      return matchesSearch;
    });
  }, [notifications, searchQuery]);

  // Count unread notifications based on lastViewedTime
  const unreadCount = useMemo(() => {
    // For SLA breaches, never remove the notification badge until it is updated (i.e. no longer overdue)
    return notifications.filter((n) => n.type === "breach" || n.timestamp.getTime() > lastViewedTime).length;
  }, [notifications, lastViewedTime]);

  const handleToggleOpen = () => {
    if (!isOpen) {
      // Mark as read when opening
      const now = Date.now();
      setLastViewedTime(now);
      localStorage.setItem("last_viewed_notifications", now.toString());
    }
    setIsOpen(!isOpen);
  };

  // Group notifications by relative date
  const groupedNotifications = useMemo(() => {
    const today: ComputedNotification[] = [];
    const yesterday: ComputedNotification[] = [];
    const earlier: ComputedNotification[] = [];

    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const startOfYesterday = startOfToday - 24 * 60 * 60 * 1000;

    filteredNotifications.forEach((n) => {
      const t = n.timestamp.getTime();
      if (t >= startOfToday) {
        today.push(n);
      } else if (t >= startOfYesterday) {
        yesterday.push(n);
      } else {
        earlier.push(n);
      }
    });

    return { today, yesterday, earlier };
  }, [filteredNotifications]);

  const formatRelativeTime = (date: Date) => {
    const seconds = Math.floor((new Date().getTime() - date.getTime()) / 1000);
    
    if (seconds < 60) return "just now";
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    
    return date.toLocaleDateString("en-PH", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    });
  };

  const handleNotificationClick = (notif: ComputedNotification) => {
    onSelectSOA(notif.soa);
    setIsOpen(false);
  };

  const markAllAsRead = () => {
    const now = Date.now();
    setLastViewedTime(now);
    localStorage.setItem("last_viewed_notifications", now.toString());
    showToast("All dispatch tracking alerts marked as read.", "success");
  };

  return (
    <div className="relative">
      {/* Trigger Button with Badge Indicator */}
      <button
        ref={buttonRef}
        onClick={handleToggleOpen}
        className={`relative p-2.5 rounded-xl border transition-all duration-300 flex items-center justify-center cursor-pointer ${
          isOpen
            ? "bg-blue-600 border-blue-600 text-white shadow-md shadow-blue-500/10 scale-105"
            : "bg-white border-slate-100 text-slate-600 hover:text-slate-900 hover:border-slate-200 hover:shadow-sm"
        }`}
        title="Tracking Movements Feed"
      >
        <Bell className={`h-5 w-5 ${unreadCount > 0 && !isOpen ? "animate-[swing_1s_ease-in-out_infinite]" : ""}`} />
        
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-5 w-5 bg-rose-500 text-[10px] font-black text-white items-center justify-center shadow-sm select-none">
              {unreadCount}
            </span>
          </span>
        )}
      </button>

      {/* Styled Dropdown Panel overlay */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            ref={dropdownRef}
            initial={{ opacity: 0, y: 12, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: 0.95, transition: { duration: 0.15 } }}
            className="absolute right-0 mt-3.5 w-[calc(100vw-2rem)] sm:w-112 bg-white rounded-3xl shadow-2xl border border-slate-100 z-[100] overflow-hidden flex flex-col max-h-[580px]"
          >
            {/* Header portion */}
            <div className="p-4 bg-slate-950 text-white flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <div className="p-1.5 bg-blue-600/20 text-blue-400 rounded-lg">
                  <Layers className="h-4.5 w-4.5" />
                </div>
                <div>
                  <h4 className="text-sm font-extrabold tracking-tight">Movements Feed</h4>
                  <p className="text-[10px] text-slate-400 font-medium">Real-time tracking notifications</p>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                {unreadCount > 0 && (
                  <button
                    onClick={markAllAsRead}
                    className="text-[10px] font-bold text-blue-400 hover:text-blue-300 hover:underline transition-colors shrink-0 cursor-pointer"
                  >
                    Mark read
                  </button>
                )}
                <button
                  onClick={() => setIsOpen(false)}
                  className="p-1 rounded-lg hover:bg-slate-900 transition-colors text-slate-400 hover:text-white cursor-pointer"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* Quick Filter Section */}
            <div className="px-4 py-3 bg-slate-50/80 border-b border-slate-100 space-y-2">
              <div className="relative">
                <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Filter alerts by name, note..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 w-full rounded-xl border border-slate-200/65 py-1.5 px-3 text-[11px] focus:outline-none bg-white focus:ring-1 focus:ring-blue-500/10 focus:border-blue-500 font-medium"
                />
              </div>

              {/* Badges tab buttons (removed since all alerts are now breaches) */}
              <div className="flex items-center gap-1 overflow-x-auto no-scrollbar pt-0.5">
                <div className="px-3 py-1 rounded-lg text-[10px] font-bold shrink-0 bg-slate-900 text-white shadow-sm flex items-center gap-1.5 cursor-default">
                  <span className="h-1.5 w-1.5 rounded-full bg-rose-500 animate-pulse" />
                  Delayed Alerts ({notifications.length})
                </div>
              </div>
            </div>

            {/* Notifications Stream Area */}
            <div className="flex-grow overflow-y-auto divide-y divide-slate-100">
              {filteredNotifications.length === 0 ? (
                <div className="text-center py-12 px-4 space-y-2">
                  <SlidersHorizontal className="h-7 w-7 text-slate-300 mx-auto" />
                  <p className="text-[11px] font-bold text-slate-500">No matching updates</p>
                  <p className="text-[10px] text-slate-400">Try adjusting your filters or search terms.</p>
                </div>
              ) : (
                <div className="space-y-4 p-4">
                  {/* Today Section */}
                  {groupedNotifications.today.length > 0 && (
                    <div className="space-y-2">
                      <div className="text-[9px] font-extrabold text-blue-600 uppercase tracking-wider bg-blue-50/50 px-2 py-0.5 rounded-md w-max">
                        Today
                      </div>
                      <div className="space-y-2">
                        {groupedNotifications.today.map((notif) => (
                          <NotificationRow
                            key={notif.id}
                            notif={notif}
                            onClick={handleNotificationClick}
                            formatTime={formatRelativeTime}
                          />
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Yesterday Section */}
                  {groupedNotifications.yesterday.length > 0 && (
                    <div className="space-y-2">
                      <div className="text-[9px] font-extrabold text-slate-500 uppercase tracking-wider bg-slate-100 px-2 py-0.5 rounded-md w-max">
                        Yesterday
                      </div>
                      <div className="space-y-2">
                        {groupedNotifications.yesterday.map((notif) => (
                          <NotificationRow
                            key={notif.id}
                            notif={notif}
                            onClick={handleNotificationClick}
                            formatTime={formatRelativeTime}
                          />
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Earlier Section */}
                  {groupedNotifications.earlier.length > 0 && (
                    <div className="space-y-2">
                      <div className="text-[9px] font-extrabold text-slate-500 uppercase tracking-wider bg-slate-100 px-2 py-0.5 rounded-md w-max">
                        Earlier
                      </div>
                      <div className="space-y-2">
                        {groupedNotifications.earlier.map((notif) => (
                          <NotificationRow
                            key={notif.id}
                            notif={notif}
                            onClick={handleNotificationClick}
                            formatTime={formatRelativeTime}
                          />
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Footer summary metrics */}
            <div className="p-3 bg-slate-50/80 border-t border-slate-150 text-center text-[10px] text-slate-400 font-bold">
              Showing {filteredNotifications.length} tracking records in log history.
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* Individual Alert Row sub-component */
interface NotificationRowProps {
  key?: string;
  notif: ComputedNotification;
  onClick: (notif: ComputedNotification) => void;
  formatTime: (date: Date) => string;
}

function NotificationRow({ notif, onClick, formatTime }: NotificationRowProps) {
  // Styles based on notification item category
  const getColors = () => {
    switch (notif.type) {
      case "breach":
        return {
          bg: "bg-rose-50 border-rose-200 shadow-sm shadow-rose-100",
          badge: "bg-rose-600 text-white animate-pulse",
          icon: AlertCircle
        };
      case "issue":
        return {
          bg: "bg-rose-50/90 hover:bg-rose-100/60 border-rose-100/60",
          badge: "bg-rose-100 text-rose-700",
          icon: AlertCircle
        };
      case "success":
        return {
          bg: "bg-emerald-50/50 hover:bg-emerald-50 border-emerald-100/40",
          badge: "bg-emerald-100 text-emerald-700",
          icon: CheckCircle2
        };
      case "info":
        return {
          bg: "bg-sky-50/40 hover:bg-sky-50 border-sky-100/30",
          badge: "bg-sky-100 text-sky-700",
          icon: Info
        };
      default:
        return {
          bg: "bg-slate-50/40 hover:bg-slate-50 border-slate-100",
          badge: "bg-slate-150 text-slate-700",
          icon: Clock
        };
    }
  };

  const colors = getColors();
  const Icon = colors.icon;

  return (
    <div
      onClick={() => onClick(notif)}
      className={`p-3 rounded-2xl border transition-all cursor-pointer flex gap-3 text-left ${colors.bg}`}
    >
      <div className={`p-2 rounded-xl h-9 w-9 flex items-center justify-center shrink-0 ${colors.badge}`}>
        <Icon className="h-4.5 w-4.5" />
      </div>

      <div className="flex-grow space-y-1 min-w-0">
        <div className="flex items-center justify-between gap-2">
          {/* Stakeholder label */}
          <span className="text-[11px] font-extrabold text-slate-900 truncate">
            {notif.soa.stakeholderName}
          </span>
          {/* Relative elapsed time */}
          <span className="text-[9px] text-slate-400 font-bold shrink-0 whitespace-nowrap">
            {formatTime(notif.timestamp)}
          </span>
        </div>

        {/* Tracking status transition */}
        <p className="text-[10px] text-slate-500 font-medium line-clamp-2 leading-relaxed">
          {notif.type === "breach" ? (
            <span className="text-rose-700 font-black uppercase tracking-tight">
              SLA Timeline Breach: Document is stalled in stage {notif.soa.status} and is delayed by {notif.daysDelayed} day{notif.daysDelayed === 1 ? "" : "s"}. Needs immediate priority.
            </span>
          ) : (
            <>
              Moved to <strong className="text-slate-800 font-bold">{notif.historyItem?.status}</strong> 
              {notif.historyItem?.notes ? ` — "${notif.historyItem.notes}"` : ""}
            </>
          )}
        </p>

        {/* Audit tag credentials */}
        <div className="flex items-center justify-between text-[8.5px] text-slate-400 font-bold pt-1">
          <span className="truncate">{notif.type === "breach" ? "Strategic Priority Alert" : `By ${notif.historyItem?.updatedBy}`}</span>
          <span className="font-mono text-[8px] bg-white border border-slate-200/50 px-1 py-0.2 rounded shrink-0">
            {notif.soa.batchNumber}
          </span>
        </div>
      </div>

      {/* Chevron indicator */}
      <div className="flex items-center shrink-0 opacity-0 hover:opacity-100 group-hover:opacity-100 transition-opacity">
        <ChevronRight className="h-4 w-4 text-slate-400" />
      </div>
    </div>
  );
}
