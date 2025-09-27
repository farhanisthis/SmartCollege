import React, { useState, useEffect, useMemo } from "react";
import { Button } from "../ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Calendar } from "../ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "../ui/popover";
import {
  CalendarIcon,
  Users,
  Save,
  RotateCcw,
  Search,
  Download,
} from "lucide-react";
import { Input } from "../ui/input";
import { format } from "date-fns";

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

// Real E1 Students Data
const E1Students = [
  {
    id: "00124402023",
    name: "Mohammad Asad",
    email: "mohammadasad@example.com",
    enrollment: "00124402023",
  },
  {
    id: "00224402023",
    name: "Shiven Sharma",
    email: "shivensharma@example.com",
    enrollment: "00224402023",
  },
  {
    id: "00424402023",
    name: "TANYA SINHA",
    email: "tanyasinha@example.com",
    enrollment: "00424402023",
  },
  {
    id: "00524402023",
    name: "Madhav Wadhwa",
    email: "madhavwadhwa@example.com",
    enrollment: "00524402023",
  },
  {
    id: "00624402023",
    name: "POSHIKA PAL",
    email: "poshikapal@example.com",
    enrollment: "00624402023",
  },
  {
    id: "00724402023",
    name: "Ranveer Singh",
    email: "ranveersingh@example.com",
    enrollment: "00724402023",
  },
  {
    id: "00824402023",
    name: "Devang bisht",
    email: "devangbisht@example.com",
    enrollment: "00824402023",
  },
  {
    id: "00924402023",
    name: "Vaibhav Kumar",
    email: "vaibhavkumar@example.com",
    enrollment: "00924402023",
  },
  {
    id: "01024402023",
    name: "Kkavya Sahni",
    email: "kkavyasahni@example.com",
    enrollment: "01024402023",
  },
  {
    id: "01124402023",
    name: "DEEPALI JAIN",
    email: "deepalijain@example.com",
    enrollment: "01124402023",
  },
  {
    id: "01224402023",
    name: "HARSH MAGGO",
    email: "harshmaggo@example.com",
    enrollment: "01224402023",
  },
  {
    id: "01324402023",
    name: "Vibhuti Panwar",
    email: "vibhutipanwar@example.com",
    enrollment: "01324402023",
  },
  {
    id: "01424402023",
    name: "Aryan verma",
    email: "aryanverma@example.com",
    enrollment: "01424402023",
  },
  {
    id: "01524402023",
    name: "Jai Malik",
    email: "jaimalik@example.com",
    enrollment: "01524402023",
  },
  {
    id: "01624402023",
    name: "NIHARIKA SHARMA",
    email: "niharikasharma@example.com",
    enrollment: "01624402023",
  },
  {
    id: "01724402023",
    name: "Siddharth Shrestha",
    email: "siddharthshrestha@example.com",
    enrollment: "01724402023",
  },
  {
    id: "01824402023",
    name: "ARYAN THAKUR",
    email: "aryanthakur@example.com",
    enrollment: "01824402023",
  },
  {
    id: "01924402023",
    name: "Aditya Kant Pathak",
    email: "adityakantpathak@example.com",
    enrollment: "01924402023",
  },
  {
    id: "02024402023",
    name: "Gursaibh Singh",
    email: "gursaibhsingh@example.com",
    enrollment: "02024402023",
  },
  {
    id: "02124402023",
    name: "brahmjot singh",
    email: "brahmjotsingh@example.com",
    enrollment: "02124402023",
  },
  {
    id: "02224402023",
    name: "HARSHITA SALUJA",
    email: "harshitasaluja@example.com",
    enrollment: "02224402023",
  },
  {
    id: "02324402023",
    name: "Sanskriti Singhal",
    email: "sanskritisinghal@example.com",
    enrollment: "02324402023",
  },
  {
    id: "02424402023",
    name: "SANDEEP KUMAR",
    email: "sandeepkumar@example.com",
    enrollment: "02424402023",
  },
  {
    id: "02524402023",
    name: "Vishnu Narayan Khanna",
    email: "vishnunarayankhanna@example.com",
    enrollment: "02524402023",
  },
  {
    id: "02624402023",
    name: "VAJIPAYAJULA ADITYA",
    email: "vajipayajulaaditya@example.com",
    enrollment: "02624402023",
  },
  {
    id: "02724402023",
    name: "Akshita",
    email: "akshita@example.com",
    enrollment: "02724402023",
  },
  {
    id: "02824402023",
    name: "Mishti sehgal",
    email: "mishtisehgal@example.com",
    enrollment: "02824402023",
  },
  {
    id: "02924402023",
    name: "TWINKLE SHARMA",
    email: "twinklesharma@example.com",
    enrollment: "02924402023",
  },
  {
    id: "03024402023",
    name: "DHRUV SHARMA",
    email: "dhruvsharma@example.com",
    enrollment: "03024402023",
  },
  {
    id: "03124402023",
    name: "Saif Siddiqui",
    email: "saifsiddiqui@example.com",
    enrollment: "03124402023",
  },
  {
    id: "03224402023",
    name: "Aman kumar",
    email: "amankumar@example.com",
    enrollment: "03224402023",
  },
  {
    id: "03324402023",
    name: "Muskan sharma",
    email: "muskansharma@example.com",
    enrollment: "03324402023",
  },
  {
    id: "03424402023",
    name: "Vansh Khatri",
    email: "vanshkhatri@example.com",
    enrollment: "03424402023",
  },
  {
    id: "03524402023",
    name: "Pansul Saxena",
    email: "pansulsaxena@example.com",
    enrollment: "03524402023",
  },
  {
    id: "03624402023",
    name: "Niyati Mittal",
    email: "niyatimittal@example.com",
    enrollment: "03624402023",
  },
  {
    id: "03724402023",
    name: "Jiya Basra",
    email: "jiyabasra@example.com",
    enrollment: "03724402023",
  },
  {
    id: "03824402023",
    name: "Aditya S. Bhandari",
    email: "adityas.bhandari@example.com",
    enrollment: "03824402023",
  },
  {
    id: "03924402023",
    name: "Krish Aggarwal",
    email: "krishaggarwal@example.com",
    enrollment: "03924402023",
  },
  {
    id: "04024402023",
    name: "Mohit Kumar Rawat",
    email: "mohitkumarrawat@example.com",
    enrollment: "04024402023",
  },
  {
    id: "04124402023",
    name: "Sunveen Kaur",
    email: "sunveenkaur@example.com",
    enrollment: "04124402023",
  },
  {
    id: "04224402023",
    name: "Priyanshu Shekhar Singh",
    email: "priyanshushekharsingh@example.com",
    enrollment: "04224402023",
  },
  {
    id: "04324402023",
    name: "Manas Sharma",
    email: "manassharma@example.com",
    enrollment: "04324402023",
  },
  {
    id: "04424402023",
    name: "Muskan Thapa",
    email: "muskanthapa@example.com",
    enrollment: "04424402023",
  },
  {
    id: "04524402023",
    name: "SHIVAN TIWARI",
    email: "shivantiwari@example.com",
    enrollment: "04524402023",
  },
  {
    id: "04624402023",
    name: "Megha Chakraborty",
    email: "meghachakraborty@example.com",
    enrollment: "04624402023",
  },
  {
    id: "04724402023",
    name: "Aryan Bhardwaj",
    email: "aryanbhardwaj@example.com",
    enrollment: "04724402023",
  },
  {
    id: "04824402023",
    name: "Manish Nainwal",
    email: "manishnainwal@example.com",
    enrollment: "04824402023",
  },
  {
    id: "04924402023",
    name: "Nitin Kamia",
    email: "nitinkamia@example.com",
    enrollment: "04924402023",
  },
  {
    id: "05024402023",
    name: "Krishna goyal",
    email: "krishnagoyal@example.com",
    enrollment: "05024402023",
  },
  {
    id: "05124402023",
    name: "Ashish Luthra",
    email: "ashishluthra@example.com",
    enrollment: "05124402023",
  },
  {
    id: "3rd-year-E1",
    name: "Farhan Ali",
    email: "farhanandfarhanali@gmail.com",
    enrollment: "05524402023",
  },
  {
    id: "05324402023",
    name: "Jashandeep singh",
    email: "jashandeepsingh@example.com",
    enrollment: "05324402023",
  },
  {
    id: "05424402023",
    name: "Aditiya Bhardwaj",
    email: "aditiyabhardwaj@example.com",
    enrollment: "05424402023",
  },
  {
    id: "05624402023",
    name: "Shreeyansh Srivastava",
    email: "shreeyanshsrivastava@example.com",
    enrollment: "05624402023",
  },
  {
    id: "05724402023",
    name: "Priyanshu sharma",
    email: "priyanshusharma@example.com",
    enrollment: "05724402023",
  },
];

// Extract subjects for a specific day
const getSubjectsForDay = (dayName: string) => {
  const subjects: Array<{ time: string; subject: string; bg: string }> = [];

  Object.entries(E1Schedule).forEach(([timeSlot, schedule]) => {
    const daySchedule = schedule[dayName as keyof typeof schedule];
    if (
      daySchedule &&
      daySchedule.text &&
      daySchedule.text !== "BREAK" &&
      daySchedule.text !== ""
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
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [attendance, setAttendance] = useState<AttendanceStatus>({});
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const dayName = format(selectedDate, "EEEE"); // Monday, Tuesday, etc.
  const subjectsForDay = useMemo(() => getSubjectsForDay(dayName), [dayName]);

  // Filter students based on search term
  const filteredStudents = E1Students.filter(
    (student) =>
      student.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      student.enrollment.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Load existing attendance for selected date
  useEffect(() => {
    const loadExistingAttendance = async () => {
      setIsLoading(true);
      try {
        const response = await fetch(
          `/api/attendance/daily?date=${format(selectedDate, "yyyy-MM-dd")}`,
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
            E1Students.forEach((student) => {
              loadedAttendance[student.id] = {};
              subjectsForDay.forEach(({ subject }) => {
                loadedAttendance[student.id][subject] = undefined;
              });
            });

            // Apply loaded data
            result.data.students.forEach((studentRecord: any) => {
              if (loadedAttendance[studentRecord.studentId]) {
                studentRecord.subjects.forEach((subjectRecord: any) => {
                  loadedAttendance[studentRecord.studentId][
                    subjectRecord.subjectName
                  ] = subjectRecord.status;
                });
              }
            });

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
      E1Students.forEach((student) => {
        initialAttendance[student.id] = {};
        subjectsForDay.forEach(({ subject }) => {
          initialAttendance[student.id][subject] = undefined;
        });
      });
      setAttendance(initialAttendance);
    };

    loadExistingAttendance();
  }, [selectedDate, subjectsForDay]);

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
      E1Students.forEach((student) => {
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
      E1Students.forEach((student) => {
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
      const response = await fetch("/api/attendance/save-day", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          date: format(selectedDate, "yyyy-MM-dd"),
          attendance: attendance,
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
    E1Students.forEach((student) => {
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
    let totalPossible = E1Students.length * subjectsForDay.length;

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

    E1Students.forEach((student) => {
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
    link.download = `attendance-${format(selectedDate, "yyyy-MM-dd")}.csv`;
    link.click();
    window.URL.revokeObjectURL(url);
  };

  const stats = getAttendanceStats();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">
            Attendance Management - E1 Section
          </h2>
          <p className="text-gray-600">
            Mark attendance for {dayName},{" "}
            {format(selectedDate, "MMMM d, yyyy")}
          </p>
        </div>

        <div className="flex items-center gap-4">
          {/* Date Picker */}
          <Popover open={isCalendarOpen} onOpenChange={setIsCalendarOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className="w-[240px] justify-start text-left font-normal"
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {format(selectedDate, "PPP")}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={(date) => {
                  if (date) {
                    setSelectedDate(date);
                    setIsCalendarOpen(false);
                  }
                }}
                initialFocus
              />
            </PopoverContent>
          </Popover>

          {/* Action Buttons */}
          <Button
            variant="outline"
            onClick={exportToCSV}
            className="flex items-center gap-2"
            disabled={subjectsForDay.length === 0}
          >
            <Download className="h-4 w-4" />
            Export CSV
          </Button>

          <Button
            variant="outline"
            onClick={resetAttendance}
            className="flex items-center gap-2"
            disabled={isLoading}
          >
            <RotateCcw className="h-4 w-4" />
            Reset
          </Button>

          <Button
            onClick={handleSaveAttendance}
            disabled={isSaving || isLoading || subjectsForDay.length === 0}
            className="flex items-center gap-2"
          >
            <Save className="h-4 w-4" />
            {isSaving ? "Saving..." : "Save Attendance"}
          </Button>
        </div>
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-5 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-blue-600">
              {E1Students.length}
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
          Showing {filteredStudents.length} of {E1Students.length} students
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
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Attendance Sheet - {dayName} ({filteredStudents.length} students)
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
                          className={`absolute inset-0 bg-gradient-to-br ${bg} rounded-t-lg`}
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
                              attendance[student.id]?.[subject] === undefined
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
    </div>
  );
}
