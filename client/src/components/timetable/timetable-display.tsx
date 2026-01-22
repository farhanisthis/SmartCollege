import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Loader2 } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";
import { getApiUrl } from "@/lib/queryClient";

// Safelist for Tailwind JIT to pick up dynamic database colors
export const _colorSafelist = [
  "from-violet-600 via-violet-500 to-purple-400",
  "from-emerald-600 via-teal-500 to-cyan-400",
  "from-sky-600 via-blue-500 to-indigo-400",
  "from-sky-700 via-blue-600 to-indigo-500",
  "from-lime-600 via-green-500 to-emerald-400",
  "from-lime-700 via-green-600 to-emerald-500",
  "from-purple-600 via-indigo-500 to-blue-400",
  "from-purple-700 via-indigo-600 to-blue-500",
  "from-purple-800 via-indigo-700 to-blue-600",
  "from-amber-600 via-orange-500 to-red-400",
  "from-amber-700 via-orange-600 to-red-500",
  "from-rose-500 via-pink-400 to-red-300",
];

// Fallback hardcoded schedule (kept for backwards compatibility)
const E1ScheduleFallback = {
  "10:30 AM\n—\n11:30 AM": {
    Tuesday: {
      text: "IOT Lab1",
      bg: "from-sky-700 via-blue-600 to-indigo-500",
    },
    Wednesday: {
      text: "IOT",
      bg: "from-lime-700 via-green-600 to-emerald-500",
    },
    Thursday: {
      text: "IOT Lab1",
      bg: "from-sky-700 via-blue-600 to-indigo-500",
    },
  },

  "11:30 AM\n—\n12:30 PM": {
    Monday: {
      text: "DVA 311\nDL 312",
      bg: "from-purple-700 via-indigo-600 to-blue-500",
    },
    Tuesday: {
      text: "DVA 311\nDL 312",
      bg: "from-purple-700 via-indigo-600 to-blue-500",
    },
    Wednesday: {
      text: "DVA 311\nDL 312",
      bg: "from-purple-700 via-indigo-600 to-blue-500",
    },
    Thursday: {
      text: "DVA 311\nDL 312",
      bg: "from-purple-700 via-indigo-600 to-blue-500",
    },
    Friday: { text: "IOT Lab1", bg: "from-sky-700 via-blue-600 to-indigo-500" },
  },

  "12:30 PM\n—\n01:30 PM": {
    Monday: { text: "IOT", bg: "from-lime-700 via-green-600 to-emerald-500" },
    Tuesday: { text: "BREAK", bg: "from-rose-500 via-pink-400 to-red-300" },
    Wednesday: { text: "BREAK", bg: "from-rose-500 via-pink-400 to-red-300" },
    Thursday: { text: "BREAK", bg: "from-rose-500 via-pink-400 to-red-300" },
    Friday: { text: "IOT", bg: "from-lime-700 via-green-600 to-emerald-500" },
  },

  "01:30 PM\n—\n02:30 PM": {
    Monday: { text: "BREAK", bg: "from-rose-500 via-pink-400 to-red-300" },
    Tuesday: { text: "IOT", bg: "from-lime-700 via-green-600 to-emerald-500" },
    Wednesday: {
      text: "DVA Lab 4\nDL Lab 5",
      bg: "from-amber-700 via-orange-600 to-red-500",
    },
    Thursday: {
      text: "DWDM",
      bg: "from-violet-700 via-purple-600 to-indigo-500",
    },
    Friday: {
      text: "DVA Lab 4\nDL Lab 5",
      bg: "from-amber-700 via-orange-600 to-red-500",
    },
  },

  "02:30 PM\n—\n03:30 PM": {
    Monday: { text: "IOT Lab1", bg: "from-sky-700 via-blue-600 to-indigo-500" },
    Tuesday: {
      text: "DWDM",
      bg: "from-violet-700 via-purple-600 to-indigo-500",
    },
    Wednesday: {
      text: "DWDM",
      bg: "from-violet-700 via-purple-600 to-indigo-500",
    },
    Thursday: {
      text: "e-com",
      bg: "from-emerald-600 via-teal-500 to-cyan-400",
    },
    Friday: {
      text: "DWDM",
      bg: "from-violet-700 via-purple-600 to-indigo-500",
    },
  },

  "03:30 PM\n—\n04:30 PM": {
    Monday: { text: "e-com", bg: "from-emerald-600 via-teal-500 to-cyan-400" },
    Tuesday: { text: "e-com", bg: "from-emerald-600 via-teal-500 to-cyan-400" },
    Wednesday: {
      text: "e-com",
      bg: "from-emerald-600 via-teal-500 to-cyan-400",
    },
    Thursday: {
      text: "MP Lab1",
      bg: "from-purple-800 via-indigo-700 to-blue-600",
    },
    Friday: {
      text: "MP 212",
      bg: "from-purple-600 via-indigo-500 to-blue-400",
    },
  },
};

export default function TimetableDisplay() {
  const [timetableSchedule, setTimetableSchedule] =
    useState<any>(E1ScheduleFallback);
  const [isLoading, setIsLoading] = useState(true);
  const [subjects, setSubjects] = useState<any[]>([]);
  const days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];

  // Fetch timetable from API
  useEffect(() => {
    const fetchTimetable = async () => {
      try {
        const response = await fetch(getApiUrl("/api/timetable/E1"), {
          credentials: "include",
        });

        if (response.ok) {
          const data = await response.json();
          if (data.success && data.data) {
            // Build schedule object from API data
            const schedule: Record<
              string,
              Record<string, { text: string; bg: string }>
            > = {};
            const uniqueSubjects = new Map<
              string,
              { name: string; color: string }
            >();

            data.data.forEach((slot: any) => {
              const timeKey = slot.timeSlot.replace(/ - /, "\n—\n");

              if (!schedule[timeKey]) {
                schedule[timeKey] = {};
              }

              schedule[timeKey][slot.day] = {
                text: slot.subjectCode === "-" ? "" : slot.subjectCode,
                bg:
                  slot.subject?.color ||
                  "from-gray-600 via-gray-500 to-gray-400",
              };

              // Collect unique subjects for legend
              if (slot.subject && slot.subjectCode !== "-") {
                uniqueSubjects.set(slot.subjectCode, {
                  name: slot.subject.name,
                  color: slot.subject.color,
                });
              }
            });

            setTimetableSchedule(schedule);
            setSubjects(
              Array.from(uniqueSubjects.entries()).map(([code, data]) => ({
                code,
                ...data,
              })),
            );
          }
        }
      } catch (error) {
        console.error("Failed to fetch timetable:", error);
        // Keep using fallback schedule
      } finally {
        setIsLoading(false);
      }
    };

    fetchTimetable();
  }, []);

  // Sort time slots chronologically
  const sortTimeSlots = (slots: string[]) => {
    return slots.sort((a, b) => {
      // Extract start time from "HH:MM AM/PM - HH:MM AM/PM" format
      const getStartTime = (slot: string) => {
        const match = slot.match(/(\d{1,2}):(\d{2})\s*(AM|PM)/);
        if (!match) return 0;

        let hours = parseInt(match[1]);
        const minutes = parseInt(match[2]);
        const period = match[3];

        // Convert to 24-hour format
        if (period === "PM" && hours !== 12) hours += 12;
        if (period === "AM" && hours === 12) hours = 0;

        return hours * 60 + minutes;
      };

      return getStartTime(a) - getStartTime(b);
    });
  };

  const timeSlots = sortTimeSlots(Object.keys(timetableSchedule));

  const isMobile = useIsMobile();

  // Format time short for mobile
  const formatTimeForMobile = (timeSlot: string) => {
    if (!isMobile) return timeSlot;
    // Extract times "10:30 AM\n—\n11:30 AM" -> "10:30\n11:30"
    return timeSlot.replace(/ AM| PM/g, "").replace(/\n—\n/g, "\n");
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-gray-500" />
        <span className="ml-2 text-gray-600">Loading timetable...</span>
      </div>
    );
  }

  return (
    <div className="space-y-4 md:space-y-6">
      <Card className="w-full shadow-none border-0 md:border md:shadow-sm">
        <CardHeader className="px-2 py-4 md:p-6">
          <CardTitle className="text-lg md:text-2xl font-bold text-center leading-tight">
            Class Schedule E1
            <span className="block text-sm md:text-lg font-normal text-muted-foreground mt-1">
              Computer Science Semester 5
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent className="px-0 md:p-6">
          <div className="grid grid-cols-6 gap-1 md:gap-2 rounded-xl overflow-hidden">
            {/* Header - Time slot */}
            <div className="p-1 md:p-3 font-bold text-white bg-gray-800 rounded-[15px] md:rounded-lg text-[10px] md:text-lg shadow-inner flex items-center justify-center h-12 md:h-20">
              Time
            </div>

            {/* Headers - Days */}
            {days.map((day) => (
              <div
                key={day}
                className="p-1 md:p-3 font-bold text-white text-center bg-gray-800 rounded-[15px] md:rounded-lg text-[10px] md:text-lg shadow-inner flex items-center justify-center h-12 md:h-20"
              >
                {isMobile ? day.substring(0, 3) : day}
              </div>
            ))}

            {/* Time slots and schedule */}
            {timeSlots.map((timeSlot) => (
              <React.Fragment key={timeSlot}>
                {/* Time slot */}
                <div className="p-1 md:p-3 font-semibold text-white bg-gray-800 rounded-[15px] md:rounded-lg text-[9px] md:text-sm shadow-inner flex flex-col items-center justify-center h-12 md:h-20 whitespace-pre-line leading-tight text-center">
                  {formatTimeForMobile(timeSlot)}
                </div>

                {/* Schedule cells */}
                {days.map((day) => {
                  const daySchedule = timetableSchedule[timeSlot]?.[day];
                  const cellBg = daySchedule?.bg || "from-gray-800 to-gray-700";
                  const cellText = daySchedule?.text || "";

                  return (
                    <div
                      key={`${timeSlot}-${day}`}
                      className={`p-0.5 md:p-2 flex flex-col items-center justify-center rounded-[15px] md:rounded-lg shadow-sm md:shadow-lg transition-all bg-gradient-to-br ${cellBg} h-12 md:h-20 overflow-hidden active:scale-95 md:hover:scale-105 cursor-pointer`}
                      title={
                        cellText
                          ? `${cellText} - ${timeSlot.replace("\n", " ")}`
                          : "Free Period"
                      }
                    >
                      <span className="text-[10px] md:text-lg font-bold text-white text-center drop-shadow-md leading-none whitespace-pre-line">
                        {isMobile
                          ? cellText.includes("Lab")
                            ? cellText.replace(" ", "\n")
                            : cellText.length > 5
                              ? cellText.substring(0, 4) + "."
                              : cellText
                          : cellText}
                      </span>
                    </div>
                  );
                })}
              </React.Fragment>
            ))}
          </div>

          {/* Subject Legend */}
          {subjects.length > 0 && (
            <div className="mt-6 space-y-3 px-2">
              <h3 className="text-sm md:text-lg font-semibold text-gray-800">
                Subject Legend
              </h3>
              <div className="grid grid-cols-2 gap-2 md:gap-4">
                {subjects.map((subject) => (
                  <div
                    key={subject.code}
                    className="flex items-center gap-2 md:gap-3 bg-slate-50 p-2 rounded-lg border border-slate-100"
                  >
                    <div
                      className={`w-3 h-3 md:w-6 md:h-6 rounded-full md:rounded bg-gradient-to-br ${subject.color} shrink-0`}
                    ></div>
                    <span className="text-[10px] md:text-sm font-medium leading-tight line-clamp-2">
                      <span className="font-bold">{subject.code}</span> -{" "}
                      {subject.name}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Weekly Summary */}
          <div className="mt-6 p-3 md:p-4 bg-gray-50 rounded-xl mx-2 md:mx-0">
            <h3 className="text-sm md:text-lg font-semibold text-gray-800 mb-3">
              Weekly Summary
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
              <div className="bg-white p-3 rounded-xl shadow-sm border border-slate-100">
                <div className="font-semibold text-gray-700 text-xs md:text-base">
                  Total Classes
                </div>
                <div className="text-xl md:text-2xl font-bold text-blue-600">
                  {timeSlots.length * days.length}
                </div>
                <div className="text-[10px] md:text-xs text-gray-500">
                  per week
                </div>
              </div>
              <div className="bg-white p-3 rounded-xl shadow-sm border border-slate-100">
                <div className="font-semibold text-gray-700 text-xs md:text-base">
                  Subjects
                </div>
                <div className="text-xl md:text-2xl font-bold text-green-600">
                  {subjects.length}
                </div>
                <div className="text-[10px] md:text-xs text-gray-500">
                  different subjects
                </div>
              </div>
              <div className="bg-white p-3 rounded-xl shadow-sm border border-slate-100">
                <div className="font-semibold text-gray-700 text-xs md:text-base">
                  Lab Sessions
                </div>
                <div className="text-xl md:text-2xl font-bold text-purple-600">
                  {subjects.filter((s) => s.code.includes("Lab")).length * 5}
                </div>
                <div className="text-[10px] md:text-xs text-gray-500">
                  per week
                </div>
              </div>
              <div className="bg-white p-3 rounded-xl shadow-sm border border-slate-100">
                <div className="font-semibold text-gray-700 text-xs md:text-base">
                  Class Hours
                </div>
                <div className="text-xl md:text-2xl font-bold text-orange-600">
                  {timeSlots.length * days.length}
                </div>
                <div className="text-[10px] md:text-xs text-gray-500">
                  per week
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
