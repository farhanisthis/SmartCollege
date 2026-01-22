import React, { useState, useEffect, useMemo } from "react";
import { Button } from "../ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Calendar } from "../ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "../ui/popover";
import { AttendanceSheetUploader } from "./attendance-sheet-uploader";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../ui/tabs";
import {
  CalendarIcon,
  Users,
  Save,
  RotateCcw,
  Search,
  Download,
  Upload,
  Zap,
} from "lucide-react";
import { Input } from "../ui/input";

import { format, addDays } from "date-fns";
import { useIsMobile } from "@/hooks/use-mobile";
import { MobileAttendanceCard } from "./mobile-attendance-card";
import { MobileAttendanceHeader } from "./mobile-attendance-header";
import { MobileStudentRow } from "./mobile-student-row";
import { cn } from "@/lib/utils";
import * as XLSX from "xlsx";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "../ui/dialog";
import { Label } from "../ui/label";
import { Edit, Plus, Trash2 } from "lucide-react";

// E1 Timetable Data
const E1Schedule = {
  "10:30 AM\n—\n11:30 AM": {
    Monday: { text: "CG", bg: "from-green-600 via-green-500 to-green-400" },
    Thursday: { text: "CC", bg: "from-blue-600 via-blue-500 to-blue-400" },
  },
  "11:30 AM\n—\n12:30 PM": {
    Monday: { text: "CC", bg: "from-blue-600 via-blue-500 to-blue-400" },
    Tuesday: { text: "CG", bg: "from-green-600 via-green-500 to-green-400" },
    Wednesday: {
      text: "OS",
      bg: "from-purple-600 via-purple-500 to-purple-400",
    },
    Thursday: {
      text: "OS",
      bg: "from-purple-600 via-purple-500 to-purple-400",
    },
    Friday: { text: "OS", bg: "from-purple-600 via-purple-500 to-purple-400" },
  },
  "12:30 PM\n—\n01:30 PM": {
    Monday: { text: "OS", bg: "from-purple-600 via-purple-500 to-purple-400" },
    Tuesday: { text: "CC", bg: "from-blue-600 via-blue-500 to-blue-400" },
    Wednesday: { text: "CG", bg: "from-green-600 via-green-500 to-green-400" },
    Thursday: { text: "CG", bg: "from-green-600 via-green-500 to-green-400" },
    Friday: { text: "CC", bg: "from-blue-600 via-blue-500 to-blue-400" },
  },
  "01:30 PM\n—\n02:30 PM": {
    Monday: { text: "BREAK", bg: "from-red-500 via-red-400 to-red-300" },
    Tuesday: { text: "BREAK", bg: "from-red-500 via-red-400 to-red-300" },
    Wednesday: {
      text: "CG Lab 4",
      bg: "from-green-700 via-green-600 to-green-500",
    },
    Thursday: { text: "BREAK", bg: "from-red-500 via-red-400 to-red-300" },
    Friday: { text: "BREAK", bg: "from-red-500 via-red-400 to-red-300" },
  },
  "02:30 PM\n—\n03:30 PM": {
    Monday: {
      text: "CG Lab 4",
      bg: "from-green-700 via-green-600 to-green-500",
    },
    Tuesday: {
      text: "CG Lab 4",
      bg: "from-green-700 via-green-600 to-green-500",
    },
    Wednesday: { text: "BREAK", bg: "from-red-500 via-red-400 to-red-300" },
    Thursday: {
      text: "CG Lab 4",
      bg: "from-green-700 via-green-600 to-green-500",
    },
    Friday: {
      text: "ML Lab 4",
      bg: "from-orange-600 via-orange-500 to-orange-400",
    },
  },
  "03:30 PM\n—\n04:30 PM": {
    Monday: { text: "ML", bg: "from-orange-600 via-orange-500 to-orange-400" },
    Tuesday: {
      text: "Linux Lab 4",
      bg: "from-blue-700 via-blue-600 to-blue-500",
    },
    Wednesday: {
      text: "Linux Lab 4",
      bg: "from-blue-700 via-blue-600 to-blue-500",
    },
    Thursday: {
      text: "ML",
      bg: "from-orange-600 via-orange-500 to-orange-400",
    },
    Friday: {
      text: "Linux Lab 4",
      bg: "from-blue-700 via-blue-600 to-blue-500",
    },
  },
  "04:30 PM\n—\n05:30 PM": {
    Monday: {
      text: "ML Lab 4",
      bg: "from-orange-600 via-orange-500 to-orange-400",
    },
    Tuesday: { text: "", bg: "from-gray-800 to-gray-700" },
    Wednesday: {
      text: "ML",
      bg: "from-orange-600 via-orange-500 to-orange-400",
    },
    Thursday: {
      text: "Linux Lab 4",
      bg: "from-blue-700 via-blue-600 to-blue-500",
    },
    Friday: { text: "ML", bg: "from-orange-600 via-orange-500 to-orange-400" },
  },
};

interface Student {
  id: string;
  name: string;
  email: string;
  enrollment: string;
  profilePicture?: string;
}

// Extract subjects for a specific day
const getSubjectsForDay = (schedule: any, dayName: string) => {
  const subjects: Array<{ time: string; subject: string; bg: string }> = [];

  Object.entries(schedule).forEach(([timeSlot, scheduleData]: [string, any]) => {
    const daySchedule = scheduleData[dayName];
    if (
      daySchedule &&
      daySchedule.text &&
      daySchedule.text !== "" &&
      daySchedule.text !== "" &&
      daySchedule.text !== "-" && // Only skip empty slots marked with "-"
      daySchedule.text !== "BREAK" // Skip BREAK slots for attendance
    ) {
      subjects.push({
        time: timeSlot,
        subject: daySchedule.text,
        bg: daySchedule.bg,
      });
    }
  });

  return subjects;
};

interface AttendanceStatus {
  [studentId: string]: {
    [subject: string]: "present" | "absent" | undefined;
  };
}

export default function AttendanceManager() {
  const [date, setDate] = useState<Date>(new Date());
  const [students, setStudents] = useState<Student[]>([]);
  const [attendance, setAttendance] = useState<AttendanceStatus>({});
  const [searchQuery, setSearchQuery] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const isMobile = useIsMobile();
  const [timetableSlots, setTimetableSlots] = useState<any[]>([]);
  const [timetableSchedule, setTimetableSchedule] = useState<any>(E1Schedule); // Fallback to hardcoded

  // Fetch timetable from API
  useEffect(() => {
    const fetchTimetable = async () => {
      try {
        const response = await fetch("/api/timetable/E1", {
          credentials: "include",
        });
        
        if (response.ok) {
          const data = await response.json();
          if (data.success && data.data) {
            setTimetableSlots(data.data);
            
            // Build schedule object from API data
            const schedule: Record<string, Record<string, { text: string; bg: string }>> = {};
            
            data.data.forEach((slot: any) => {
              const timeKey = slot.timeSlot.replace(/ - /, "\n—\n");
              
              if (!schedule[timeKey]) {
                schedule[timeKey] = {};
              }
              
              schedule[timeKey][slot.day] = {
                text: slot.subjectCode === "-" ? "" : slot.subjectCode,
                bg: slot.subject?.color || "from-gray-600 via-gray-500 to-gray-400",
              };
            });
            
            setTimetableSchedule(schedule);
          }
        }
      } catch (error) {
        console.error("Failed to fetch timetable:", error);
        // Keep using hardcoded E1Schedule as fallback
      }
    };

    fetchTimetable();
  }, []);
  const [studentsLoaded, setStudentsLoaded] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  // Custom Subjects Management
  const [isEditSubjectsOpen, setIsEditSubjectsOpen] = useState(false);
  const [customSchedule, setCustomSchedule] = useState<Record<string, Array<{ time: string; subject: string; bg: string }>>>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem("attendanceCustomSchedule");
      return saved ? JSON.parse(saved) : {};
    }
    return {};
  });

  // Persist custom schedule
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem("attendanceCustomSchedule", JSON.stringify(customSchedule));
    }
  }, [customSchedule]);
  
  const dayName = format(date, "EEEE"); // Monday, Tuesday, etc.

  // Merge default schedule with custom overrides
  const subjectsForDay = useMemo(() => {
    // If we have a custom schedule for this specific date string (YYYY-MM-DD), use it
    const dateKey = format(date, "yyyy-MM-dd");
    if (customSchedule[dateKey]) {
      return customSchedule[dateKey];
    }
    // Fallback to day-of-week based default schedule or custom day-of-week override if we implemented that
    // Fallback to day-of-week based default schedule
    const subjects = getSubjectsForDay(timetableSchedule, dayName);

    // Sort subjects chronologically
    return subjects.sort((a, b) => {
      const getStartTime = (timeStr: string) => {
        const match = timeStr.match(/(\d{1,2}):(\d{2})\s*(AM|PM)/);
        if (!match) return 0;
        
        let hours = parseInt(match[1]);
        const minutes = parseInt(match[2]);
        const period = match[3];
        
        if (period === 'PM' && hours !== 12) hours += 12;
        if (period === 'AM' && hours === 12) hours = 0;
        
        return hours * 60 + minutes;
      };
      
      return getStartTime(a.time) - getStartTime(b.time);
    });
  }, [dayName, date, customSchedule, timetableSchedule]);


  // Temp state for editing
  const [editingSubjects, setEditingSubjects] = useState<Array<{ time: string; subject: string; bg: string }>>([]);

  const handleOpenEditSubjects = () => {
    setEditingSubjects([...subjectsForDay]);
    setIsEditSubjectsOpen(true);
  };

  const handleSaveSubjects = () => {
    const dateKey = format(date, "yyyy-MM-dd");
    setCustomSchedule(prev => ({
      ...prev,
      [dateKey]: editingSubjects
    }));
    setIsEditSubjectsOpen(false);
    
    // Reset attendance for this day since subjects changed to avoid mismatches?
    // Or keep existing and just add new keys. 
    // Ideally we should keep common subjects.
  };

  const handleAddSubject = () => {
    setEditingSubjects([
      ...editingSubjects, 
      { time: "00:00 - 00:00", subject: "New Subject", bg: "from-gray-500 to-gray-600" }
    ]);
  };

  const handleRemoveSubject = (index: number) => {
    const newSubjects = [...editingSubjects];
    newSubjects.splice(index, 1);
    setEditingSubjects(newSubjects);
  };

  const handleSubjectChange = (index: number, field: keyof typeof editingSubjects[0], value: string) => {
    const newSubjects = [...editingSubjects];
    newSubjects[index] = { ...newSubjects[index], [field]: value };
    setEditingSubjects(newSubjects);
  };

  // Load students on mount
  useEffect(() => {
    const fetchStudents = async () => {
      try {
        // Fetch students for the user's section
        const response = await fetch("/api/bulk-users/e1-students", {
           credentials: "include" 
        });
        
        const contentType = response.headers.get("content-type");
        if (contentType && contentType.includes("application/json")) {
           if (response.ok) {
            const data = await response.json();
            if (data.success && data.students) {
              // Map backend user to Student interface (id mapped to _id)
              const mappedStudents = data.students.map((s: any) => ({
                 id: s._id,
                 name: s.name,
                 email: s.email,
                 enrollment: s.enrollment || s.username, // fallback if enrollment missing
                 profilePicture: s.profilePicture,
              }));
              setStudents(mappedStudents);
            }
          } else {
             console.error("Fetch failed with status:", response.status);
          }
        } else {
           const text = await response.text();
           console.error("Received non-JSON response:", text.substring(0, 500)); // Log first 500 chars
           throw new Error("Expected JSON but received " + contentType);
        }

      } catch (err) {
        console.error("Failed to fetch students", err);
      } finally {
        setStudentsLoaded(true);
      }
    };
    fetchStudents();
  }, []);

  // Filter students based on search term
  const filteredStudents = students.filter(
    (student) =>
      student.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      student.enrollment.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Load existing attendance for selected date
  useEffect(() => {
    // Wait for students to be loaded before loading attendance
    if (!studentsLoaded) return;

    const loadExistingAttendance = async () => {
      setIsLoading(true);
      try {
        const response = await fetch(
          `/api/attendance/daily?date=${format(date, "yyyy-MM-dd")}`,
          {
            credentials: "include",
          }
        );

        if (response.ok) {
          const result = await response.json();
          if (result.success && result.data) {
            // Transform database format to UI format
            const loadedAttendance: AttendanceStatus = {};

            // Initialize all students and subjects
            students.forEach((student) => {
              loadedAttendance[student.id] = {};
              subjectsForDay.forEach(({ subject }) => {
                loadedAttendance[student.id][subject] = undefined;
              });
            });

            // Apply loaded data
            // Note: result.data is now array of normalized records if using new API, 
            // OR if using legacy response format wrapper, it mimics old structure.
            // Let's assume the GET /daily route maintained legacy structure: { students: [...] }
            if (result.data.students) {
               // Create a map of Enrollment -> Student ID for lookup
               const enrollmentToIdMap = new Map<string, string>();
               students.forEach(s => {
                   if (s.enrollment) enrollmentToIdMap.set(s.enrollment, s.id);
                   // Also map ID to ID just in case
                   enrollmentToIdMap.set(s.id, s.id);
               });

               result.data.students.forEach((studentRecord: any) => {
                // Resolve the correct ID (studentRecord.studentId might be enrollment OR id)
                const targetId = enrollmentToIdMap.get(studentRecord.studentId) || studentRecord.studentId;

                if (loadedAttendance[targetId]) {
                  studentRecord.subjects.forEach((subjectRecord: any) => {
                    loadedAttendance[targetId][
                      subjectRecord.subjectName
                    ] = subjectRecord.status as "present" | "absent" | undefined;
                  });
                }
               });
            } else if (Array.isArray(result.data)) {
               // Handle normalized array format if that's what returns
               // But our refactor of GET /daily tried to match legacy format.
               // Let's assume legacy format for now as per our previous work.
            }
            
            setAttendance(loadedAttendance);
          } else {
            // Initialize empty attendance for new date
            initializeEmptyAttendance();
          }
        } else {
          initializeEmptyAttendance();
        }
      } catch (error) {
        console.error("Error loading attendance:", error);
        initializeEmptyAttendance();
      } finally {
        setIsLoading(false);
      }
    };

    const initializeEmptyAttendance = () => {
      const initialAttendance: AttendanceStatus = {};
      students.forEach((student) => {
        initialAttendance[student.id] = {};
        subjectsForDay.forEach(({ subject }) => {
          initialAttendance[student.id][subject] = undefined;
        });
      });
      setAttendance(initialAttendance);
    };

    loadExistingAttendance();
  }, [date, subjectsForDay, students, studentsLoaded]);

  // Toggle attendance status: undefined -> present -> absent -> undefined
  const toggleAttendance = (studentId: string, subject: string) => {
    setAttendance((prev) => {
      const currentStatus = prev[studentId]?.[subject];
      let newStatus: "present" | "absent" | undefined;

      if (currentStatus === undefined) {
        newStatus = "present";
      } else if (currentStatus === "present") {
        newStatus = "absent";
      } else {
        newStatus = undefined;
      }

      return {
        ...prev,
        [studentId]: {
          ...prev[studentId],
          [subject]: newStatus,
        },
      };
    });
  };

  // Mark all students as present for a subject
  const markAllPresent = (subject: string) => {
    setAttendance((prev) => {
      const updated = { ...prev };
      students.forEach((student) => {
        if (!updated[student.id]) {
          updated[student.id] = {};
        }
        updated[student.id][subject] = "present";
      });
      return updated;
    });
  };

  // Mark all students as absent for a subject
  const markAllAbsent = (subject: string) => {
    setAttendance((prev) => {
      const updated = { ...prev };
      students.forEach((student) => {
        if (!updated[student.id]) {
          updated[student.id] = {};
        }
        updated[student.id][subject] = "absent";
      });
      return updated;
    });
  };

  // Get attendance button styling
  const getAttendanceButtonStyle = (
    status: "present" | "absent" | undefined
  ) => {
    switch (status) {
      case "present":
        return "bg-green-500 hover:bg-green-600 text-white border-green-600";
      case "absent":
        return "bg-red-500 hover:bg-red-600 text-white border-red-600";
      default:
        return "bg-gray-200 hover:bg-gray-300 text-gray-600 border-gray-300";
    }
  };

  // Get attendance display text
  const getAttendanceText = (status: "present" | "absent" | undefined) => {
    switch (status) {
      case "present":
        return "✓";
      case "absent":
        return "✗";
      default:
        return "○";
      }
  };

  // Save attendance
  const handleSaveAttendance = async () => {
    setIsSaving(true);
    try {
      // Map attendance from ID keys to Enrollment keys
      const attendancePayload: Record<string, any> = {};
      Object.entries(attendance).forEach(([studentId, data]) => {
        const student = students.find(s => s.id === studentId);
        if (student && student.enrollment) {
          attendancePayload[student.enrollment] = data;
        } else {
           // Fallback or skip? If enrollment missing, maybe use ID, but likely safer to skip or warn.
           // For now, let's use ID as fallback but log it.
           console.warn(`Enrollment missing for student ${studentId}`);
           attendancePayload[studentId] = data;
        }
      });

      const response = await fetch("/api/attendance/save-day", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          date: format(date, "yyyy-MM-dd"),
          attendance: attendancePayload,
        }),
      });

      if (response.ok) {
        console.log("Attendance saved successfully");
        // You could add a toast notification here
      } else {
        console.error("Failed to save attendance");
      }
    } catch (error) {
      console.error("Error saving attendance:", error);
    } finally {
      setIsSaving(false);
    }
  };

  // Reset attendance for the day
  const resetAttendance = () => {
    const resetAttendance: AttendanceStatus = {};
    students.forEach((student) => {
      resetAttendance[student.id] = {};
      subjectsForDay.forEach(({ subject }) => {
        resetAttendance[student.id][subject] = undefined;
      });
    });
    setAttendance(resetAttendance);
  };

  // Calculate attendance statistics
  const getAttendanceStats = () => {
    let totalMarked = 0;
    let totalPresent = 0;
    let totalPossible = students.length * subjectsForDay.length;

    Object.values(attendance).forEach((studentAttendance) => {
      Object.values(studentAttendance || {}).forEach((status) => {
        if (status !== undefined) {
          totalMarked++;
          if (status === "present") {
            totalPresent++;
          }
        }
      });
    });

    return {
      totalMarked,
      totalPresent,
      totalPossible,
      percentageComplete:
        totalPossible > 0 ? (totalMarked / totalPossible) * 100 : 0,
      attendanceRate: totalMarked > 0 ? (totalPresent / totalMarked) * 100 : 0,
    };
  };

  // Export attendance to CSV
  const exportToCSV = () => {
    let csvContent = "Name,Enrollment Number";
    subjectsForDay.forEach(({ subject }) => {
      csvContent += `,${subject}`;
    });
    csvContent += "\n";

    students.forEach((student) => {
      csvContent += `"${student.name}","${student.enrollment}"`;
      subjectsForDay.forEach(({ subject }) => {
        const status = attendance[student.id]?.[subject];
        csvContent += `,${
          status === "present"
            ? "Present"
            : status === "absent"
            ? "Absent"
            : "Not Marked"
        }`;
      });
      csvContent += "\n";
    });

    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `attendance-${format(date, "yyyy-MM-dd")}.csv`;
    link.click();
    window.URL.revokeObjectURL(url);
  };

  const stats = getAttendanceStats();

  // Handle upload completion callback
  const handleUploadComplete = (result: any) => {
    if (result.success && result.data) {
      // Refresh attendance data after upload
      const uploadDate = new Date(result.data.date);
      setDate(uploadDate);
      // Reload attendance data will be triggered by useEffect when date changes
    }
  };

  // Helpers for Mobile View
  const [currentSubjectIndex, setCurrentSubjectIndex] = useState(0);
  const [activeTab, setActiveTab] = useState<"attendance" | "timetable" | "assignments">("attendance");
  const currentActiveSubject = subjectsForDay[currentSubjectIndex];

  const prevDay = () => setDate((date) => addDays(date, -1));
  const nextDay = () => setDate((date) => addDays(date, 1));

  const handleNextSubject = () => {
    if (currentSubjectIndex < subjectsForDay.length - 1) {
      setCurrentSubjectIndex(prev => prev + 1);
    }
  };

  const handlePrevSubject = () => {
    if (currentSubjectIndex > 0) {
      setCurrentSubjectIndex(prev => prev - 1);
    }
  };
  
  const handleMobileMarkPresent = (studentId: string) => {
    if (!currentActiveSubject) return;
    setAttendance(prev => ({
        ...prev,
        [studentId]: {
            ...prev[studentId],
            [currentActiveSubject.subject]: "present"
        }
    }));
  };

  const handleMobileMarkAbsent = (studentId: string) => {
    if (!currentActiveSubject) return;
    setAttendance(prev => ({
        ...prev,
        [studentId]: {
            ...prev[studentId],
            [currentActiveSubject.subject]: "absent"
        }
    }));
  };

  const handleExport = () => {
    // Flatten data for export
    const exportData = students.map(student => {
      const studentAttendance = attendance[student.id] || {};
      const row: any = {
        "Student Name": student.name,
        "Enrollment": student.enrollment,
      };
      
      // Add columns for each subject
      subjectsForDay.forEach(sub => {
        row[sub.subject] = (studentAttendance[sub.subject] as string) || "Unmarked";
      });
      
      return row;
    });

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Attendance");
    XLSX.writeFile(wb, `Attendance_${format(date, "yyyy-MM-dd")}.xlsx`);
  };

  if (isMobile) {
    return (
      <div className="min-h-screen bg-white pb-24">
        <div className="px-4 pt-4 space-y-4">
          <MobileAttendanceHeader
            dayName={dayName}
            selectedDate={date}
            stats={stats}
            totalStudents={students.length}
            currentSubject={currentActiveSubject}
            onMarkAllPresent={() => currentActiveSubject && markAllPresent(currentActiveSubject.subject)}
            onMarkAllAbsent={() => currentActiveSubject && markAllAbsent(currentActiveSubject.subject)}
            onNextSubject={handleNextSubject}
            onPrevSubject={handlePrevSubject}
            onEditSubjects={handleOpenEditSubjects}
            hasNext={currentSubjectIndex < subjectsForDay.length - 1}
            hasPrev={currentSubjectIndex > 0}
            activeTab={activeTab}
            onTabChange={setActiveTab}
            onDateSelect={setDate}
            onPrevDay={prevDay}
            onNextDay={nextDay}
          />


          {activeTab === "attendance" && (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
              {/* Student List */}
              <div className="space-y-0 divide-y divide-gray-50">
                {filteredStudents.map((student) => {
                  const status = currentActiveSubject 
                    ? attendance[student.id]?.[currentActiveSubject.subject] 
                    : undefined;
                  
                  return (
                    <MobileStudentRow
                      key={student.id}
                      name={student.name}
                      enrollment={student.enrollment}
                      status={status}
                      onMarkPresent={() => handleMobileMarkPresent(student.id)}
                      onMarkAbsent={() => handleMobileMarkAbsent(student.id)}
                      profilePicture={student.profilePicture}
                    />
                  );
                })}
              </div>
            </div>
          )}

          {activeTab === "timetable" && (
             <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
               <div className="flex items-center justify-between px-2">
                 <h3 className="font-bold text-lg text-gray-900">Today's Schedule</h3>
                 <Button size="sm" variant="ghost" onClick={handleOpenEditSubjects} className="text-[#ea580c] hover:text-[#c2410c] hover:bg-orange-50">
                    <Edit className="h-4 w-4 mr-1" />
                    Edit
                 </Button>
               </div>
               {subjectsForDay.map((subject, idx) => (
                 <div key={idx} className="flex gap-4 p-4 bg-white border border-gray-100 rounded-2xl shadow-sm items-center">
                    <div className={cn("h-16 w-16 rounded-xl bg-gradient-to-br flex items-center justify-center text-white font-bold text-xl shadow-lg", subject.bg && subject.bg.includes("from-") ? subject.bg : "bg-blue-500 from-blue-500 to-blue-600")}>
                      {subject.subject.substring(0, 2)}
                    </div>
                    <div>
                      <h4 className="font-bold text-gray-900 text-lg">{subject.subject}</h4>
                      <p className="text-gray-500 font-medium">{subject.time.replace('\n—\n', ' - ')}</p>
                    </div>
                 </div>
               ))}
               {subjectsForDay.length === 0 && (
                 <div className="text-center py-10 text-gray-400">
                   No classes scheduled for today.
                 </div>
               )}
             </div>
          )}

          {activeTab === "assignments" && (
             <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="p-8 text-center bg-gray-50 rounded-3xl border border-dashed border-gray-200">
                  <div className="h-16 w-16 bg-orange-100 text-orange-500 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Zap className="h-8 w-8" />
                  </div>
                  <h3 className="font-bold text-gray-900 mb-2">No Active Assignments</h3>
                  <p className="text-gray-500 text-sm">Great job! You're all caught up for {dayName}.</p>
                </div>
             </div>
          )}
        </div>

        {/* Sticky Footer */}
        <div className="fixed bottom-0 left-0 right-0 p-2 bg-white/80 backdrop-blur-xl border-t border-gray-100 shadow-[0_-10px_40px_-15px_rgba(0,0,0,0.1)] z-50">
           <div className="flex items-center gap-2">
             <Button 
                onClick={handleSaveAttendance}
                disabled={isSaving}
                className="flex-1 h-10 bg-[#ea580c] hover:bg-[#c2410c] text-white rounded-lg shadow-sm shadow-orange-200 font-bold text-sm flex items-center justify-center gap-2 active:scale-95 transition-all"
             >
               <Save className="h-4 w-4" />
               {isSaving ? "Saving..." : "Save attendance"}
             </Button>
             <Button 
                variant="secondary" 
                className="h-10 w-10 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-500"
                onClick={handleExport}
             >
               <Download className="h-4 w-4" />
             </Button>
           </div>
           
           {/* Visual Bottom Nav Indicator (as per mock) */}
           <div className="flex justify-center mt-1.5 mb-0.5">
             <div className="w-20 h-1 bg-slate-200 rounded-full" />
           </div>
        </div>

      <Dialog open={isEditSubjectsOpen} onOpenChange={setIsEditSubjectsOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto w-[90vw] rounded-xl z-[60]">
          <DialogHeader>
            <DialogTitle>Edit Subjects</DialogTitle>
            <DialogDescription>
              {format(date, "PPP")}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            {editingSubjects.map((subject, index) => (
              <div key={index} className="flex flex-col gap-3 p-3 border rounded-lg bg-gray-50">
                <div className="grid gap-2 text-sm">
                  <Label>Time Slot</Label>
                  <Input 
                    value={subject.time} 
                    onChange={(e) => handleSubjectChange(index, "time", e.target.value)}
                    placeholder="e.g. 10:30 AM"
                    className="h-9"
                  />
                </div>
                <div className="grid gap-2 text-sm">
                  <Label>Subject Name</Label>
                  <Input 
                    value={subject.subject} 
                    onChange={(e) => handleSubjectChange(index, "subject", e.target.value)}
                    placeholder="Subject"
                    className="h-9"
                  />
                </div>
                <Button 
                  variant="ghost" 
                  size="sm"
                  className="text-red-500 hover:text-red-700 hover:bg-red-50 self-end"
                  onClick={() => handleRemoveSubject(index)}
                >
                  <Trash2 className="h-4 w-4 mr-1" /> Remove
                </Button>
              </div>
            ))}
            
            <Button variant="outline" onClick={handleAddSubject} className="w-full border-dashed h-12">
              <Plus className="h-4 w-4 mr-2" />
              Add Subject Slot
            </Button>
          </div>

          <DialogFooter className="flex-col gap-2 sm:flex-col">
             {/* Mobile optimized footer */}
            <Button className="w-full" onClick={handleSaveSubjects}>Save Changes</Button>
            <Button variant="outline" className="w-full mt-2 sm:mt-0" onClick={() => setIsEditSubjectsOpen(false)}>Cancel</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}

      {/* Header Section - Mobile Optimized */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div>
          <h2 className="text-2xl font-black text-gray-900 tracking-tight">
            Attendance Management
          </h2>
          <p className="text-gray-500 font-medium">E1 Section • {dayName}</p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Popover open={isCalendarOpen} onOpenChange={setIsCalendarOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  "justify-start text-left font-normal w-full md:w-[240px]", // Full width on mobile
                  !date && "text-muted-foreground"
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {date ? format(date, "PPP") : <span>Pick a date</span>}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="end">
              <Calendar
                mode="single"
                selected={date}
                onSelect={(date) => {
                  if (date) {
                    setDate(date);
                    setIsCalendarOpen(false);
                  }
                }}
                initialFocus
              />
            </PopoverContent>
          </Popover>

          <Button
            variant="outline"
            onClick={exportToCSV}
            className="flex items-center gap-2 flex-1 md:flex-none" // Flex-1 for equal width
            disabled={subjectsForDay.length === 0}
          >
            <Download className="h-4 w-4" />
            Export CSV
          </Button>

          <Button
            variant="outline"
            onClick={resetAttendance}
            className="flex items-center gap-2 flex-1 md:flex-none"
            disabled={isLoading}
          >
            <RotateCcw className="h-4 w-4" />
            Reset
          </Button>

          <Button
            variant="outline"
            onClick={handleOpenEditSubjects}
            className="flex items-center gap-2 flex-1 md:flex-none"
          >
            <Edit className="h-4 w-4" />
            Edit Subjects
          </Button>

          <Button
            onClick={handleSaveAttendance}
            disabled={isSaving || isLoading || subjectsForDay.length === 0}
            className="flex items-center gap-2 flex-1 md:flex-none w-full md:w-auto" // Full width save button
          >
            <Save className="h-4 w-4" />
            {isSaving ? "Saving..." : "Save Attendance"}
          </Button>
        </div>
      </div>

      <Dialog open={isEditSubjectsOpen} onOpenChange={setIsEditSubjectsOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Subjects for {format(date, "PPP")}</DialogTitle>
            <DialogDescription>
              Customize the subjects and time slots for this specific date. Changes apply only to this day.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            {editingSubjects.map((subject, index) => (
              <div key={index} className="flex items-end gap-3 p-3 border rounded-lg bg-gray-50">
                <div className="grid gap-2 flex-1">
                  <Label>Time Slot</Label>
                  <Input 
                    value={subject.time} 
                    onChange={(e) => handleSubjectChange(index, "time", e.target.value)}
                    placeholder="e.g. 10:30 AM - 11:30 AM"
                  />
                </div>
                <div className="grid gap-2 flex-1">
                  <Label>Subject Name</Label>
                  <Input 
                    value={subject.subject} 
                    onChange={(e) => handleSubjectChange(index, "subject", e.target.value)}
                    placeholder="e.g. Machine Learning"
                  />
                </div>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="text-red-500 hover:text-red-700 hover:bg-red-50"
                  onClick={() => handleRemoveSubject(index)}
                >
                  <Trash2 className="h-5 w-5" />
                </Button>
              </div>
            ))}
            
            <Button variant="outline" onClick={handleAddSubject} className="w-full border-dashed">
              <Plus className="h-4 w-4 mr-2" />
              Add Subject Slot
            </Button>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditSubjectsOpen(false)}>Cancel</Button>
            <Button onClick={handleSaveSubjects}>Save Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>


      {/* Main Content with Tabs */}
      <Tabs defaultValue="manual" className="w-full">
        <TabsList className="grid w-full grid-cols-2 max-w-md">
          <TabsTrigger value="manual" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            Manual Entry
          </TabsTrigger>
          <TabsTrigger value="ai-upload" className="flex items-center gap-2">
            <Zap className="h-4 w-4" />
            AI Upload
          </TabsTrigger>
        </TabsList>

        {/* Manual Attendance Entry Tab */}
        <TabsContent value="manual" className="space-y-6">
          {/* Statistics */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <Card>
              <CardContent className="p-4">
                <div className="text-2xl font-bold text-blue-600">
                  {students.length}
                </div>
                <div className="text-sm text-gray-600">Total Students</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="text-2xl font-bold text-green-600">
                  {subjectsForDay.length}
                </div>
                <div className="text-sm text-gray-600">Subjects Today</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="text-2xl font-bold text-purple-600">
                  {stats.percentageComplete.toFixed(1)}%
                </div>
                <div className="text-sm text-gray-600">Completed</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="text-2xl font-bold text-orange-600">
                  {stats.attendanceRate.toFixed(1)}%
                </div>
                <div className="text-sm text-gray-600">Present Rate</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="text-2xl font-bold text-red-600">
                  {stats.totalMarked}
                </div>
                <div className="text-sm text-gray-600">Marked Entries</div>
              </CardContent>
            </Card>
          </div>

          {/* Search Bar */}
          <div className="flex items-center gap-4">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                placeholder="Search students by name or enrollment..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <div className="text-sm text-gray-600">
              Showing {filteredStudents.length} of {students.length} students
            </div>
          </div>

          {/* No subjects message */}
          {subjectsForDay.length === 0 && (
            <Card>
              <CardContent className="p-8 text-center">
                <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-600 mb-2">
                  No Classes Scheduled
                </h3>
                <p className="text-gray-500">
                  There are no classes scheduled for {dayName}.
                </p>
              </CardContent>
            </Card>
          )}

          {/* Loading state */}
          {isLoading && (
            <Card>
              <CardContent className="p-8 text-center">
                <div className="animate-pulse">Loading attendance data...</div>
              </CardContent>
            </Card>
          )}

          {/* Attendance Grid */}
          {subjectsForDay.length > 0 && !isLoading && (
            isMobile ?
              <div className="space-y-4 pb-20">
                <div className="flex items-center justify-between px-2 mb-2">
                   <h3 className="font-bold text-gray-700">Student List ({filteredStudents.length})</h3>
                   <span className="text-xs text-muted-foreground bg-gray-100 px-2 py-1 rounded">
                      Swipe cards for subjects
                   </span>
                </div>
                
                {filteredStudents.map((student) => (
                  <MobileAttendanceCard
                    key={student.id}
                    student={student}
                    subjects={subjectsForDay}
                    attendance={attendance[student.id] || {}}
                    onToggleAttendance={toggleAttendance}
                    getAttendanceButtonStyle={getAttendanceButtonStyle}
                  />
                ))}
              </div>
            :
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Attendance Sheet - {dayName} ({filteredStudents.length}{" "}
                  students)
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse">
                    <thead>
                      <tr className="border-b-2 border-gray-200">
                        <th className="text-left p-4 font-semibold text-gray-700 bg-gray-50 sticky left-0 z-10">
                          Student Details
                        </th>
                        {subjectsForDay.map(({ time, subject, bg }) => (
                          <th
                            key={`${time}-${subject}`}
                            className="text-center p-4 font-semibold text-white relative min-w-[120px]"
                          >
                            <div
                              className={`absolute inset-0 bg-gradient-to-br ${bg} rounded-lg mx-1`}
                            />
                            <div className="relative z-10">
                              <div className="text-sm font-bold">{subject}</div>
                              <div className="text-xs opacity-90 whitespace-pre-line">
                                {time}
                              </div>
                              <div className="flex gap-1 justify-center mt-2">
                                <button
                                  onClick={() => markAllPresent(subject)}
                                  className="px-2 py-1 text-xs bg-white/20 hover:bg-white/30 rounded text-white transition-colors"
                                  title="Mark all present"
                                >
                                  All ✓
                                </button>
                                <button
                                  onClick={() => markAllAbsent(subject)}
                                  className="px-2 py-1 text-xs bg-white/20 hover:bg-white/30 rounded text-white transition-colors"
                                  title="Mark all absent"
                                >
                                  All ✗
                                </button>
                              </div>
                            </div>
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {filteredStudents.map((student, index) => (
                        <tr
                          key={student.id}
                          className={`border-b ${
                            index % 2 === 0 ? "bg-white" : "bg-gray-50"
                          } hover:bg-blue-50 transition-colors`}
                        >
                          <td className="p-4 sticky left-0 bg-inherit z-10">
                            <div>
                              <div className="font-semibold text-gray-900">
                                {student.name}
                              </div>
                              <div className="text-sm text-gray-500">
                                {student.enrollment}
                              </div>
                              <div className="text-xs text-gray-400 truncate">
                                {student.email}
                              </div>
                            </div>
                          </td>
                          {subjectsForDay.map(({ subject }) => (
                            <td
                              key={`${student.id}-${subject}`}
                              className="p-4 text-center"
                            >
                              <button
                                onClick={() =>
                                  toggleAttendance(student.id, subject)
                                }
                                className={`w-12 h-12 rounded-full border-2 font-bold text-lg transition-all duration-200 transform hover:scale-110 ${getAttendanceButtonStyle(
                                  attendance[student.id]?.[subject]
                                )}`}
                                title={`Click to mark ${student.name} as ${
                                  attendance[student.id]?.[subject] ===
                                  undefined
                                    ? "present"
                                    : attendance[student.id]?.[subject] ===
                                      "present"
                                    ? "absent"
                                    : "unmarked"
                                }`}
                              >
                                {getAttendanceText(
                                  attendance[student.id]?.[subject]
                                )}
                              </button>
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Legend */}
                <div className="mt-6 flex items-center justify-center gap-6 p-4 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-green-500 flex items-center justify-center text-white text-sm font-bold">
                      ✓
                    </div>
                    <span className="text-sm text-gray-600">Present</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-red-500 flex items-center justify-center text-white text-sm font-bold">
                      ✗
                    </div>
                    <span className="text-sm text-gray-600">Absent</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-gray-200 flex items-center justify-center text-gray-600 text-sm font-bold">
                      ○
                    </div>
                    <span className="text-sm text-gray-600">Not Marked</span>
                  </div>
                </div>
              </CardContent>
            </Card>

          )}
        </TabsContent>

        {/* AI Upload Tab */}
        <TabsContent value="ai-upload">
          <AttendanceSheetUploader onUploadComplete={handleUploadComplete} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
