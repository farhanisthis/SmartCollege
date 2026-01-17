import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";
import { cn } from "@/lib/utils";
import { Check, X } from "lucide-react";

interface Subject {
  time: string;
  subject: string;
  bg: string;
}

interface Student {
  id: string;
  name: string;
  email: string;
  enrollment: string;
}

interface MobileAttendanceCardProps {
  student: Student;
  subjects: Subject[];
  attendance: Record<string, "present" | "absent" | undefined>;
  onToggleAttendance: (studentId: string, subject: string) => void;
  getAttendanceButtonStyle: (status: "present" | "absent" | undefined) => string;
}

export function MobileAttendanceCard({
  student,
  subjects,
  attendance,
  onToggleAttendance,
  getAttendanceButtonStyle,
}: MobileAttendanceCardProps) {
  return (
    <Card className="overflow-hidden border-none shadow-sm bg-white/50 backdrop-blur-sm rounded-3xl mb-4">
      {/* Part 1: Top - Fixed Student Details */}
      <div className="p-5 border-b border-gray-100 bg-white/80">
        <div className="flex justify-between items-start">
          <div>
            <h3 className="font-bold text-gray-900 text-lg leading-tight">
              {student.name}
            </h3>
            <p className="text-sm font-medium text-gray-500 mt-1">
              {student.enrollment}
            </p>
          </div>
          <div className="text-xs text-gray-400 bg-gray-50 px-2 py-1 rounded-full px-3">
            {student.email.split('@')[0]}
          </div>
        </div>
      </div>

      {/* Part 2: Bottom - Interactive Subject Carousel */}
      <div className="p-0 bg-white">
        <Carousel className="w-full">
          <CarouselContent>
            {subjects.map((subject, index) => {
              const status = attendance[subject.subject];
              const statusColor = 
                status === 'present' ? 'text-green-600' : 
                status === 'absent' ? 'text-red-600' : 
                'text-gray-400';
              
              const bgColor = 
                status === 'present' ? 'bg-green-50' : 
                status === 'absent' ? 'bg-red-50' : 
                'bg-gray-50';

              return (
                <CarouselItem key={`${student.id}-${subject.subject}`}>
                  <div className="p-6 flex flex-col items-center justify-center min-h-[220px]">
                    {/* Subject Header */}
                    <div className="text-center mb-6 w-full">
                      <div className={`text-base font-black px-4 py-1.5 rounded-full inline-block mb-2 bg-gradient-to-r ${subject.bg} bg-opacity-10 text-white uppercase tracking-wider text-[10px] shadow-sm`}>
                        {subject.time.replace('\n—\n', ' - ')}
                      </div>
                      <h4 className="text-xl font-bold text-gray-800 leading-tight">
                        {subject.subject}
                      </h4>
                    </div>

                    {/* Big Circular Action Button */}
                    <button
                      onClick={() => onToggleAttendance(student.id, subject.subject)}
                      className={cn(
                        "relative group transition-all duration-300 ease-out active:scale-95",
                        "w-20 h-20 rounded-full flex items-center justify-center shadow-lg",
                        status === 'present' ? "bg-green-500 shadow-green-200 ring-4 ring-green-100" :
                        status === 'absent' ? "bg-red-500 shadow-red-200 ring-4 ring-red-100" :
                        "bg-white border-4 border-gray-100 shadow-gray-200"
                      )}
                    >
                        {status === 'present' && <Check className="w-10 h-10 text-white stroke-[3px]" />}
                        {status === 'absent' && <X className="w-10 h-10 text-white stroke-[3px]" />}
                        {status === undefined && <div className="w-4 h-4 rounded-full bg-gray-300 group-hover:bg-gray-400 transition-colors" />}
                        
                        {/* Pulse effect when unmarked */}
                        {status === undefined && (
                          <span className="absolute inset-0 rounded-full border-2 border-gray-200 animate-ping opacity-20"></span>
                        )}
                    </button>
                    
                    <span className={cn(
                      "mt-4 text-xs font-bold uppercase tracking-widest",
                      statusColor
                    )}>
                      {status === 'present' ? 'Marked Present' : 
                       status === 'absent' ? 'Marked Absent' : 
                       'Tap to Mark'}
                    </span>
                  </div>
                </CarouselItem>
              );
            })}
          </CarouselContent>
          
          {/* Navigation Arrows - Positioning them custom inside the card */}
          <div className="absolute top-1/2 -translate-y-1/2 left-2 z-10">
            <CarouselPrevious className="static translate-y-0 h-8 w-8 bg-white/80 backdrop-blur border-gray-100 hover:bg-white text-gray-500 shadow-sm" />
          </div>
          <div className="absolute top-1/2 -translate-y-1/2 right-2 z-10">
            <CarouselNext className="static translate-y-0 h-8 w-8 bg-white/80 backdrop-blur border-gray-100 hover:bg-white text-gray-500 shadow-sm" />
          </div>
        </Carousel>
      </div>
    </Card>
  );
}
