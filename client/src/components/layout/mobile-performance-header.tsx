import React from "react";
import { Button } from "@/components/ui/button";
import { Bell, User, TrendingUp } from "lucide-react";
import PerformanceBox from "@/components/performance/performance-box";

interface MobilePerformanceHeaderProps {
  stats: {
    cgpa: number;
    attendance: number;
    totalCredits: number;
  };
  dashboardData: any;
  onAttendanceClick: () => void;
  onAssignmentsClick: () => void;
  onPresentationsClick: () => void;
}

export function MobilePerformanceHeader({ 
  stats, 
  dashboardData,
  onAttendanceClick,
  onAssignmentsClick,
  onPresentationsClick
}: MobilePerformanceHeaderProps) {
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

      {/* 2x2 Grid of Performance Boxes */}
      <div className="grid grid-cols-2 gap-3">
        <PerformanceBox
            type="attendance"
            title="Attendance"
            data={{ percentage: dashboardData.attendance.percentage }}
            alertThreshold={75}
            onClick={onAttendanceClick}
            compact={true}
        />
        <PerformanceBox
            type="assignments"
            title="Assignments"
            data={{
                completion: dashboardData.assignments.completion,
                submitted: dashboardData.assignments.submitted,
                total: dashboardData.assignments.total
            }}
            alertThreshold={80}
            onClick={onAssignmentsClick}
            compact={true}
        />
        <PerformanceBox
            type="presentations"
            title="Pres"
             data={{
                completion: dashboardData.presentations.completion,
                completed: dashboardData.presentations.completed,
                total: dashboardData.presentations.total
             }}
            alertThreshold={80}
            onClick={onPresentationsClick}
            compact={true}
        />
        <PerformanceBox
            type="overall"
            title="Overall"
            data={{ score: dashboardData.overall.score }}
            alertThreshold={70}
            compact={true}
        />
      </div>
    </div>
  );
}
