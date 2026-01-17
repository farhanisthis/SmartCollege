import React from "react";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ChevronLeft, ChevronRight, Bell, User, Calendar as CalendarIcon } from "lucide-react";
import { format, addDays, startOfWeek } from "date-fns";
import { cn } from "@/lib/utils";

interface Subject {
  time: string;
  subject: string;
  bg: string;
}

interface MobileAttendanceHeaderProps {
  dayName: string;
  selectedDate: Date;
  stats: {
    totalMarked: number;
    totalPresent: number;
    totalPossible: number;
    attendanceRate: number;
  };
  totalStudents: number;
  currentSubject?: Subject;
  onMarkAllPresent: () => void;
  onMarkAllAbsent: () => void;
  onPrevSubject: () => void;
  hasNext: boolean;
  hasPrev: boolean;
  activeTab: "attendance" | "timetable" | "assignments";
  onTabChange: (tab: "attendance" | "timetable" | "assignments") => void;
  onDateSelect: (date: Date) => void;
  onPrevDay: () => void;
  onNextDay: () => void;
  onNextSubject: () => void;
}

export function MobileAttendanceHeader({
  dayName,
  selectedDate,
  stats,
  totalStudents,
  currentSubject,
  onMarkAllPresent,
  onMarkAllAbsent,
  onNextSubject,
  onPrevSubject,
  hasNext,
  hasPrev,
  activeTab,
  onTabChange,
  onDateSelect,
  onPrevDay,
  onNextDay,
}: MobileAttendanceHeaderProps) {
  // Generate week days for slider
  const weekStart = startOfWeek(selectedDate, { weekStartsOn: 1 }); // Monday start
  const weekDays = Array.from({ length: 6 }).map((_, i) => addDays(weekStart, i)); // Mon-Sat

  return (
    <div className="space-y-6">
      {/* Top Bar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 bg-orange-500 rounded-xl flex items-center justify-center shadow-lg shadow-orange-200">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              className="w-6 h-6 text-white"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 14l9-5-9-5-9 5 9 5z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 14l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14z" />
            </svg>
          </div>
          <div>
            <h1 className="text-xl font-black text-slate-900 tracking-tight leading-none">
              SmartUpdates
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
           <div className="h-10 w-10 rounded-full bg-orange-100 flex items-center justify-center border border-orange-200">
             <User className="h-5 w-5 text-orange-500" />
           </div>
        </div>
      </div>

      {/* Date & Title */}
      <div>
        <div className="flex items-center justify-between mb-2">
            <div>
                 <h2 className="text-3xl font-black text-slate-900 tracking-tight">E1 Section</h2>
                 <Popover>
                    <PopoverTrigger asChild>
                        <Button variant="ghost" className="p-0 h-auto hover:bg-transparent justify-start text-slate-500 font-medium mt-1">
                            <CalendarIcon className="w-4 h-4 mr-2" />
                            {dayName}, {format(selectedDate, "MMMM d, yyyy")}
                        </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                            mode="single"
                            selected={selectedDate}
                            onSelect={(date) => date && onDateSelect(date)}
                            initialFocus
                        />
                    </PopoverContent>
                 </Popover>
            </div>
            <div className="flex gap-1">
                <Button variant="outline" size="icon" className="h-8 w-8 rounded-full" onClick={onPrevDay}>
                    <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button variant="outline" size="icon" className="h-8 w-8 rounded-full" onClick={onNextDay}>
                    <ChevronRight className="h-4 w-4" />
                </Button>
            </div>
        </div>

        {/* Day Slider */}
        <div className="flex gap-2 overflow-x-auto pb-4 -mx-4 px-4 scrollbar-hide">
            {weekDays.map((date) => {
                const isSelected = format(date, 'yyyy-MM-dd') === format(selectedDate, 'yyyy-MM-dd');
                return (
                    <button
                        key={date.toString()}
                        onClick={() => onDateSelect(date)}
                        className={cn(
                            "flex flex-col items-center justify-center min-w-[3.5rem] h-16 rounded-2xl border transition-all",
                            isSelected 
                                ? "bg-slate-900 border-slate-900 text-white shadow-lg shadow-slate-200" 
                                : "bg-white border-slate-100 text-slate-400 hover:border-slate-300"
                        )}
                    >
                        <span className="text-[10px] font-bold uppercase tracking-wider mb-1">
                            {format(date, 'EEE')}
                        </span>
                        <span className={cn("text-lg font-black", isSelected ? "text-white" : "text-slate-900")}>
                            {format(date, 'd')}
                        </span>
                    </button>
                )
            })}
        </div>
      </div>

      {/* Navigation Pills */}
      <div className="flex items-center gap-3 overflow-x-auto pb-2 scrollbar-hide -mx-4 px-4">
        <Button 
          onClick={() => onTabChange("attendance")}
          className={cn("rounded-full px-6 font-bold transition-all", activeTab === "attendance" ? "bg-orange-500 hover:bg-orange-600 text-white shadow-lg shadow-orange-200 border-none" : "bg-white border-slate-200 text-slate-500 hover:bg-slate-50 border")} 
          variant={activeTab === "attendance" ? "default" : "outline"}
        >
          Attendance
        </Button>
        <Button 
          onClick={() => onTabChange("timetable")}
          className={cn("rounded-full px-6 font-bold transition-all", activeTab === "timetable" ? "bg-orange-500 hover:bg-orange-600 text-white shadow-lg shadow-orange-200 border-none" : "bg-white border-slate-200 text-slate-500 hover:bg-slate-50 border")}
          variant={activeTab === "timetable" ? "default" : "outline"}
        >
          Timetable
        </Button>
        <Button 
          onClick={() => onTabChange("assignments")}
          className={cn("rounded-full px-6 font-bold transition-all", activeTab === "assignments" ? "bg-orange-500 hover:bg-orange-600 text-white shadow-lg shadow-orange-200 border-none" : "bg-white border-slate-200 text-slate-500 hover:bg-slate-50 border")}
          variant={activeTab === "assignments" ? "default" : "outline"}
        >
          Assignments
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-[#eff6ff] p-5 rounded-[2rem] border border-blue-50/50">
          <p className="text-[10px] font-black text-blue-500 uppercase tracking-widest mb-2">
            Total Students
          </p>
          <div className="flex items-baseline gap-1">
            <span className="text-3xl font-black text-blue-600">{totalStudents}</span>
            <span className="text-xs font-bold text-blue-400">Active</span>
          </div>
        </div>
        <div className="bg-[#f0fdf4] p-5 rounded-[2rem] border border-green-50/50">
           <p className="text-[10px] font-black text-green-500 uppercase tracking-widest mb-2">
            Present Rate
          </p>
          <div className="flex items-baseline gap-1">
            <span className="text-3xl font-black text-green-600">{Math.round(stats.attendanceRate)}%</span>
            <span className="text-xs font-bold text-green-500">↗</span>
          </div>
        </div>
      </div>

      {/* Current Class Card */}
      <div className="bg-[#3b82f6] rounded-[2.5rem] p-6 text-white shadow-xl shadow-blue-200 relative overflow-hidden">
        {/* Background Pattern */}
         <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-2xl -mr-10 -mt-10" />
         <div className="absolute bottom-0 left-0 w-24 h-24 bg-black/10 rounded-full blur-xl -ml-10 -mb-10" />

        <div className="relative z-10">
          <div className="flex items-center justify-between mb-2">
             <Button 
               size="icon" 
               onClick={onPrevSubject}
               disabled={!hasPrev}
               className={cn("h-10 w-10 rounded-full bg-white/20 hover:bg-white/30 text-white border-none backdrop-blur-sm disabled:opacity-30")}
             >
               <ChevronLeft className="h-6 w-6" />
             </Button>
             <div className="text-center">
               <p className="text-[10px] font-bold text-blue-100 uppercase tracking-widest mb-1">
                 Current Class
               </p>
               <h3 className="text-xl font-black tracking-tight">
                 {currentSubject?.subject || "No Class"}
               </h3>
               <p className="text-sm font-medium text-blue-100 mt-1 opacity-90">
                 {currentSubject?.time?.replace('\n—\n', ' — ') || "Free Period"}
               </p>
             </div>
             <Button 
               size="icon" 
               onClick={onNextSubject}
               disabled={!hasNext}
               className={cn("h-10 w-10 rounded-full bg-white/20 hover:bg-white/30 text-white border-none backdrop-blur-sm disabled:opacity-30")}
             >
               <ChevronRight className="h-6 w-6" />
             </Button>
          </div>
        </div>
      </div>

      {/* Quick Acts */}
      <div className="flex items-center gap-3 py-2">
        <Button 
          onClick={onMarkAllPresent}
          className="flex-1 bg-[#10b981] hover:bg-[#059669] text-white rounded-xl shadow-lg shadow-green-200 font-bold h-12"
        >
          All Present
        </Button>
        <Button 
          onClick={onMarkAllAbsent}
          className="flex-1 bg-[#ef4444] hover:bg-[#dc2626] text-white rounded-xl shadow-lg shadow-red-200 font-bold h-12"
        >
          All Absent
        </Button>
        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest whitespace-nowrap ml-2">
          {stats.totalMarked} of {stats.totalPossible} Loaded
        </span>
      </div>
    </div>
  );
}
