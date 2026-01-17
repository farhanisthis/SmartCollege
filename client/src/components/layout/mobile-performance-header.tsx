import React from "react";
import { Button } from "@/components/ui/button";
import { Bell, User, TrendingUp, Award } from "lucide-react";
import { format } from "date-fns";

interface MobilePerformanceHeaderProps {
  stats: {
    cgpa: number;
    attendance: number;
    totalCredits: number;
  };
}

export function MobilePerformanceHeader({ stats }: MobilePerformanceHeaderProps) {
  return (
    <div className="space-y-6">
      {/* Top Bar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 bg-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-200">
             <TrendingUp className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-black text-slate-900 tracking-tight leading-none">
              Performance
            </h1>
            <p className="text-[10px] font-bold text-slate-400 tracking-widest uppercase mt-1">
              Analytics
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
           <Button variant="ghost" size="icon" className="rounded-full bg-white border border-slate-100 shadow-sm text-slate-400">
             <Bell className="h-5 w-5" />
           </Button>
           <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center border border-blue-200">
             <User className="h-5 w-5 text-blue-600" />
           </div>
        </div>
      </div>

      {/* Greeting */}
       <div>
        <h2 className="text-3xl font-black text-slate-900 tracking-tight">Your Progress</h2>
        <p className="text-slate-500 font-medium mt-1">
          Make every grade count!
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-[#eff6ff] p-5 rounded-[2rem] border border-blue-50/50">
          <div className="flex items-center gap-2 mb-2">
            <div className="p-1.5 bg-blue-100 rounded-lg">
                <Award className="h-3 w-3 text-blue-600" />
            </div>
            <p className="text-[10px] font-black text-blue-500 uppercase tracking-widest">
                Current CGPA
            </p>
          </div>
          <div className="flex items-baseline gap-1">
            <span className="text-4xl font-black text-blue-600">{stats.cgpa}</span>
            <span className="text-xs font-bold text-blue-400">/ 10.0</span>
          </div>
        </div>
        
        <div className="bg-[#f0fdf4] p-5 rounded-[2rem] border border-green-50/50">
           <div className="flex items-center gap-2 mb-2">
            <div className="p-1.5 bg-green-100 rounded-lg">
                <TrendingUp className="h-3 w-3 text-green-600" />
            </div>
            <p className="text-[10px] font-black text-green-500 uppercase tracking-widest">
                Attendance
            </p>
          </div>
          <div className="flex items-baseline gap-1">
            <span className="text-4xl font-black text-green-600">{stats.attendance}%</span>
             <span className="text-xs font-bold text-green-500">Avg</span>
          </div>
        </div>
      </div>
    </div>
  );
}
