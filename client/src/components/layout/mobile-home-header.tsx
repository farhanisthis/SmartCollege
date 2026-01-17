import React from "react";
import { Button } from "@/components/ui/button";
import { Bell, User } from "lucide-react";
import { format } from "date-fns";

interface MobileHomeHeaderProps {
  stats: {
    totalUpdates: number;
    unreadUpdates: number;
    assignmentsPending: number;
  };
}

export function MobileHomeHeader({ stats }: MobileHomeHeaderProps) {
  const today = new Date();

  return (
    <div className="space-y-6">
      {/* Top Bar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 bg-blue-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-200">
             <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              className="w-6 h-6 text-white"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
            </svg>
          </div>
          <div>
            <h1 className="text-xl font-black text-slate-900 tracking-tight leading-none">
              SmartDashboard
            </h1>
            <p className="text-[10px] font-bold text-slate-400 tracking-widest uppercase mt-1">
              Class Representative
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

      {/* Greeting & Date */}
      <div>
        <h2 className="text-3xl font-black text-slate-900 tracking-tight">Hello, Farhan</h2>
        <p className="text-slate-500 font-medium mt-1">
          {format(today, "EEEE, MMMM d")}
        </p>
      </div>

      {/* Highlight Stats */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-[#eff6ff] p-5 rounded-[2rem] border border-blue-50/50">
          <p className="text-[10px] font-black text-blue-500 uppercase tracking-widest mb-2">
            New Updates
          </p>
          <div className="flex items-baseline gap-1">
            <span className="text-3xl font-black text-blue-600">{stats.unreadUpdates}</span>
            <span className="text-xs font-bold text-blue-400">Today</span>
          </div>
        </div>
        <div className="bg-[#fff7ed] p-5 rounded-[2rem] border border-orange-50/50">
           <p className="text-[10px] font-black text-orange-500 uppercase tracking-widest mb-2">
            Assignments
          </p>
          <div className="flex items-baseline gap-1">
            <span className="text-3xl font-black text-orange-600 w-full truncate">{stats.assignmentsPending}</span>
             <span className="text-xs font-bold text-orange-500">Pending</span>
          </div>
        </div>
      </div>
    </div>
  );
}
