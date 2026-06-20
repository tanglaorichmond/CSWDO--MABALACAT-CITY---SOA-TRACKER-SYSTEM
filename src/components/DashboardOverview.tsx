import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, PieChart, Pie, Cell, Legend } from "recharts";
import { SOADoc, UserProfile } from "../types";
import { 
  TrendingUp, 
  AlertTriangle, 
  CheckCircle, 
  ArrowRight, 
  FileText 
} from "lucide-react";

interface DashboardOverviewProps {
  soas: SOADoc[];
  currentUser?: UserProfile | null;
  onNavigateToTracking: (statusFilter?: string) => void;
}

export default function DashboardOverview({ soas, currentUser, onNavigateToTracking }: DashboardOverviewProps) {
  // 1. Calculate General Aggregations
  const totalCount = soas.length;
  
  const issueSOAs = soas.filter(s => s.status === "With Issue");
  const verifiedSOAs = soas.filter(s => s.status === "Verified");
  const processedSOAs = soas.filter(s => s.status === "Processing to Accounting" || s.status === "Forwarded to Accounting");
  const treasurySOAs = soas.filter(s => s.status === "Forwarded to Treasury");
  const releasingSOAs = soas.filter(s => s.status === "For Releasing");
  const completedSOAs = soas.filter(s => s.status === "Released");

  const totalAmountValue = soas.reduce((sum, item) => sum + item.totalAmount, 0);
  const totalReleasedAmount = completedSOAs.reduce((sum, item) => sum + item.totalAmount, 0);

  // Status mapping for counting
  const statusCounts = soas.reduce((acc: { [key: string]: number }, item) => {
    acc[item.status] = (acc[item.status] || 0) + 1;
    return acc;
  }, {});

  // 2. Prepare Data for Stakeholder Breakdown
  const stakeholderGroups = [
    { name: "Health & Hospitals", type: "hospital", color: "#3b82f6", icon: "🏥" },
    { name: "Funeral Services", type: "funeral", color: "#6366f1", icon: "🕯️" },
    { name: "Diagnostic & Labs", type: "laboratories", color: "#8b5cf6", icon: "🔬" }
  ].filter(group => {
    if (!currentUser || currentUser.role === "System Administrator" || currentUser.role === "Admin") return true;
    const userCat = currentUser.category?.toLowerCase();
    if (!userCat) return true;
    const normalizedGroupType = group.type === "laboratories" ? "laboratory" : group.type;
    const normalizedUserCat = userCat === "laboratories" ? "laboratory" : userCat;
    return normalizedGroupType === normalizedUserCat;
  });

  const stakeholderData = stakeholderGroups.map(group => {
    const groupSOAs = soas.filter(s => s.stakeholderCategory === group.type);
    const active = groupSOAs.filter(s => s.status !== "Released").length;
    const released = groupSOAs.filter(s => s.status === "Released").length;
    const totalValue = groupSOAs.reduce((sum, s) => sum + s.totalAmount, 0);
    return { ...group, active, released, totalValue, count: groupSOAs.length };
  });

  // 3. Prepare Data for Volume per Category bar charts
  const barChartData = stakeholderData.map(group => ({
    name: group.type === 'hospital' ? 'Hospital' : group.type === 'funeral' ? 'Funeral' : 'Laboratory',
    displayName: group.name,
    count: group.count,
    color: group.color
  }));

  // Pie chart data by step group
  const pieChartData = stakeholderData
    .filter(d => d.count > 0)
    .map(d => ({ name: d.name, value: d.count, color: d.color }));

  // Helper format currency
  const formatPHP = (val: number) => {
    return new Intl.NumberFormat("en-PH", {
      style: "currency",
      currency: "PHP",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(val);
  };

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Welcome Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-blue-900 rounded-2xl sm:rounded-3xl p-5 sm:p-8 text-white shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-5 border border-slate-700/50">
        <div className="space-y-2">
          <h2 className="text-xl sm:text-2xl lg:text-3xl font-extrabold tracking-tight uppercase">SOA TRACKING SYSTEM</h2>
          <p className="text-slate-300 max-w-xl text-xs sm:text-base leading-relaxed font-medium">
            Real-time movement tracking and automated pipeline audit of Statement of Accounts (SOA). Maintain strict transparency and accelerate payment releasing workflow.
          </p>
        </div>
        <div className="bg-white/10 backdrop-blur-md border border-white/10 p-3 sm:p-4 rounded-xl sm:rounded-2xl flex items-center space-x-3 self-start md:self-auto shadow-inner">
          <TrendingUp className="h-8 w-8 sm:h-10 sm:w-10 text-blue-400" />
          <div>
            <div className="text-[9px] sm:text-xs text-slate-400 font-semibold uppercase tracking-wider">System-wide Volume</div>
            <div className="text-xl sm:text-2xl font-black">{totalCount} SOAs</div>
          </div>
        </div>
      </div>

      {/* Per Stakeholder Display Section */}
      <div className="space-y-4">
        <div className="flex items-center space-x-2">
          <div className="h-1 w-8 bg-blue-600 rounded-full"></div>
          <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest">STAKEHOLDER TRACKING SPECS</h3>
        </div>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
          {stakeholderData.map((group, idx) => (
            <div key={idx} className="bg-white rounded-2xl sm:rounded-3xl p-5 sm:p-6 border border-slate-100 shadow-sm relative overflow-hidden group hover:border-blue-200 transition-all">
              {/* Decorative Icon */}
              <div className="absolute -right-4 -top-4 text-5xl sm:text-6xl opacity-[0.03] group-hover:opacity-[0.08] transition-all">
                {group.icon}
              </div>
              
              <div className="flex items-center space-x-3 mb-4">
                <div className="text-xl sm:text-2xl" style={{ textShadow: '0 0 10px rgba(0,0,0,0.1)' }}>{group.icon}</div>
                <h4 className="font-black text-slate-800 text-xs sm:text-sm uppercase tracking-tight">{group.name}</h4>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="bg-slate-50 p-3 rounded-2xl">
                  <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Active Trace</div>
                  <div className="text-xl font-black text-slate-900">{group.active}</div>
                </div>
                <div className="bg-emerald-50/50 p-3 rounded-2xl">
                  <div className="text-[10px] font-black text-emerald-600 uppercase tracking-widest mb-1">Total Released</div>
                  <div className="text-xl font-black text-emerald-700">{group.released}</div>
                </div>
              </div>

              <div className="mt-6">
                <div className="flex justify-between items-end mb-2">
                  <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Disbursment Value</div>
                  <div className="text-sm font-black text-blue-600">{formatPHP(group.totalValue)}</div>
                </div>
                <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-blue-500 rounded-full" 
                    style={{ width: `${group.count > 0 ? (group.released / group.count) * 100 : 0}%` }}
                  ></div>
                </div>
                <div className="mt-2 text-[10px] font-bold text-slate-400 flex justify-between uppercase">
                  <span>Release Rate</span>
                  <span>{group.count > 0 ? Math.round((group.released / group.count) * 100) : 0}%</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Visual Analytics Sections (Charts) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 pb-4">
        
        {/* Category Volume Audit Chart (Bar) */}
        <div className="bg-white rounded-2xl sm:rounded-3xl p-5 sm:p-8 border border-slate-100 shadow-sm lg:col-span-2">
          <div className="mb-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h4 className="text-base sm:text-lg font-black text-slate-900 uppercase tracking-tight">Voucher Volume audit</h4>
              <p className="text-[10px] sm:text-xs font-bold text-slate-400 mt-1 uppercase tracking-wider">Statement distribution across primary stakeholder categories</p>
            </div>
          </div>
          
          <div className="h-64 sm:h-80 w-full">
            {totalCount === 0 ? (
              <div className="h-full flex items-center justify-center text-slate-400 bg-slate-50/55 rounded-2xl sm:rounded-3xl border border-dashed border-slate-200">
                <p className="text-xs sm:text-sm font-medium text-center px-4">Logged Statements of Account will generate charts automatically.</p>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={barChartData} margin={{ top: 10, right: 10, left: -30, bottom: 0 }}>
                  <XAxis 
                    dataKey="name" 
                    fontSize={10} 
                    tickLine={false} 
                    axisLine={false} 
                    fontWeight={900} 
                  />
                  <YAxis tickLine={false} axisLine={false} fontSize={10} allowDecimals={false} fontWeight={900} />
                  <Tooltip 
                    contentStyle={{ borderRadius: '20px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', fontWeight: '900', fontSize: '12px' }}
                    cursor={{ fill: '#f8fafc', radius: 10 }}
                  />
                  <Bar dataKey="count" radius={[10, 10, 0, 0]} barSize={48}>
                    {
                      barChartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))
                    }
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Status Breakdown (Pie) */}
        <div className="bg-white rounded-2xl sm:rounded-3xl p-5 sm:p-8 border border-slate-100 shadow-sm">
          <h4 className="text-base sm:text-lg font-black text-slate-900 uppercase tracking-tight mb-2">Category Distribution</h4>
          <p className="text-[10px] sm:text-xs font-bold text-slate-400 mb-6 uppercase tracking-widest">Share of capture by volume</p>
          
          <div className="h-48 sm:h-60 w-full flex items-center justify-center">
            {pieChartData.length === 0 ? (
              <div className="h-full w-full flex items-center justify-center text-slate-400 bg-slate-50/55 rounded-2xl sm:rounded-3xl border border-dashed border-slate-200">
                <p className="text-xs sm:text-sm font-medium text-center px-4 uppercase font-black text-slate-300">No categories logged</p>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieChartData}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={window.innerWidth < 640 ? 70 : 90}
                    paddingAngle={8}
                    dataKey="value"
                  >
                    {pieChartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} strokeWidth={0} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => `${value} Documents`} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
          
          {/* Pie Legends */}
          <div className="mt-6 space-y-3">
            {pieChartData.map((item, id) => (
              <div key={id} className="flex items-center justify-between text-[11px] font-black uppercase tracking-wider">
                <div className="flex items-center space-x-2">
                  <div className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: item.color }}></div>
                  <span className="text-slate-500">{item.name}</span>
                </div>
                <span className="text-slate-900">{Math.round((item.value / totalCount) * 100)}%</span>
              </div>
            ))}
          </div>

        </div>

      </div>

      {/* CSWDO Internal Tracking pipeline flow sheet explanation */}
      <div className="bg-blue-50/60 rounded-2xl p-6 border border-blue-100/50">
        <h4 className="text-sm font-bold text-blue-900 uppercase tracking-widest mb-4">CSWDO Mabalacat Payment Tracking Flow Index</h4>
        <div className="grid grid-cols-2 md:grid-cols-6 gap-4 text-xs font-medium text-slate-600">
          <div className="p-3 bg-white rounded-xl border border-blue-100">
            <span className="font-bold text-blue-600 block mb-1">Step 1</span> Log fresh SOA & received date
          </div>
          <div className="p-3 bg-white rounded-xl border border-blue-100">
            <span className="font-bold text-blue-600 block mb-1">Step 2</span> Verification: approve or flag "With Issue"
          </div>
          <div className="p-3 bg-white rounded-xl border border-blue-100">
            <span className="font-bold text-blue-600 block mb-1">Step 3</span> Complete Sorting validation
          </div>
          <div className="p-3 bg-white rounded-xl border border-blue-100">
            <span className="font-bold text-blue-600 block mb-1">Step 4</span> Cross-verify docs checklist
          </div>
          <div className="p-3 bg-white rounded-xl border border-blue-100">
            <span className="font-bold text-blue-600 block mb-1">Step 5</span> Dispatch internal file to Accounting
          </div>
          <div className="p-3 bg-white rounded-xl border border-blue-100">
            <span className="font-bold text-blue-600 block mb-1">Step 6</span> Treasury forwarding & final Release
          </div>
        </div>
      </div>
    </div>
  );
}
