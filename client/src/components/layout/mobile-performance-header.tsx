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
    <div className="space-y-4">
      {/* Top Bar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 bg-indigo-600 rounded-lg flex items-center justify-center shadow-lg shadow-indigo-200">
             <TrendingUp className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="text-lg font-black text-slate-900 tracking-tight leading-none">
              Performance
            </h1>
          </div>
        </div>
        <div className="flex items-center gap-2">
           <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full bg-white border border-slate-100 shadow-sm text-slate-400">
             <Bell className="h-4 w-4" />
           </Button>
           <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center border border-blue-200">
             <User className="h-4 w-4 text-blue-600" />
           </div>
        </div>
      </div>

      {/* Greeting - Compact */}
       <div>
        <h2 className="text-2xl font-black text-slate-900 tracking-tight">Your Progress</h2>
      </div>

      {/* Stats Grid - Compact */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-[#eff6ff] p-4 rounded-3xl border border-blue-50/50">
          <div className="flex items-center gap-2 mb-1">
            <div className="p-1 bg-blue-100 rounded-md">
                <Award className="h-3 w-3 text-blue-600" />
            </div>
            <p className="text-[9px] font-black text-blue-500 uppercase tracking-widest">
                CGPA
            </p>
          </div>
          <div className="flex items-baseline gap-1">
            <span className="text-3xl font-black text-blue-600">{stats.cgpa}</span>
            <span className="text-[10px] font-bold text-blue-400">/ 10</span>
          </div>
        </div>
        
        <div className="bg-[#f0fdf4] p-4 rounded-3xl border border-green-50/50">
           <div className="flex items-center gap-2 mb-1">
            <div className="p-1 bg-green-100 rounded-md">
                <TrendingUp className="h-3 w-3 text-green-600" />
            </div>
            <p className="text-[9px] font-black text-green-500 uppercase tracking-widest">
                Attendance
            </p>
          </div>
          <div className="flex items-baseline gap-1">
            <span className="text-3xl font-black text-green-600">{stats.attendance}%</span>
          </div>
        </div>
      </div>
    </div>
  );
}
