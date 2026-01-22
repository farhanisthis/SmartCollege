import React, { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Button } from "../ui/button";
import { Badge } from "../ui/badge";
import { getApiUrl } from "@/lib/queryClient";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "../ui/dialog";
import { Calendar } from "../ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "../ui/popover";
import {
  CalendarIcon,
  TrendingUp,
  TrendingDown,
  Minus,
  Clock,
  Award,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Calendar as CalendarDays,
  BarChart3,
  Filter,
  X,
} from "lucide-react";
import {
  format,
  parseISO,
  isToday,
  isYesterday,
  subDays,
  startOfWeek,
  endOfWeek,
} from "date-fns";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";
import type { DateRange } from "react-day-picker";
import { useAuth } from "../../hooks/use-auth";

interface AttendanceRecord {
  date: string;
  subject: string;
  status: "present" | "absent";
  timestamp: string;
  markedBy: string;
  dayOfWeek: string;
}

interface AttendanceStats {
  totalClasses: number;
  totalPresent: number;
  totalAbsent: number;
  overallPercentage: number;
  trend: "improving" | "declining" | "stable";
  currentStreak: number;
  maxStreak: number;
  subjectWiseStats: Record<
    string,
    {
      present: number;
      total: number;
      percentage: number;
    }
  >;
}

interface AttendanceInsights {
  last7DaysPercentage: number;
  previous7DaysPercentage: number;
  needsImprovement: boolean;
  excellentAttendance: boolean;
  riskSubjects: Array<{
    subject: string;
    percentage: number;
  }>;
}

interface AttendanceData {
  attendanceHistory: AttendanceRecord[];
  statistics: AttendanceStats;
  insights: AttendanceInsights;
}

export default function StudentAttendanceTracker() {
  const { user } = useAuth();
  const [attendanceData, setAttendanceData] = useState<AttendanceData | null>(
    null,
  );
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dateRange, setDateRange] = useState<DateRange | undefined>();
  const [selectedSubject, setSelectedSubject] = useState<string>("all");
  const [viewMode, setViewMode] = useState<
    "overview" | "detailed" | "calendar"
  >("overview");
  const [selectedSubjectForDetail, setSelectedSubjectForDetail] = useState<
    string | null
  >(null);
  const [subjectDetailView, setSubjectDetailView] = useState(false);

  // Process raw attendance history into student-focused format
  const processAttendanceHistory = (rawData: any[]): AttendanceData => {
    const studentAttendanceHistory: AttendanceRecord[] = [];
    let totalClassesTaken = 0;
    let totalPresent = 0;
    const subjectStats: Record<
      string,
      { present: number; total: number; percentage: number }
    > = {};

    // Get current user ID from auth context
    // @ts-ignore
    const currentUserId = user?.id;
    // @ts-ignore
    const enrollment = user?.enrollment || user?.username; // Fallback to username for E1

    console.log("[Attendance Tracker] User info:", {
      userId: currentUserId,
      enrollment: enrollment,
      name: user?.name,
    });

    if (!currentUserId && !enrollment) {
      console.error("No user ID or enrollment available");
      return {
        attendanceHistory: [],
        statistics: {
          totalClasses: 0,
          totalPresent: 0,
          totalAbsent: 0,
          overallPercentage: 0,
          trend: "stable",
          currentStreak: 0,
          maxStreak: 0,
          subjectWiseStats: {},
        },
        insights: {
          last7DaysPercentage: 0,
          previous7DaysPercentage: 0,
          needsImprovement: true,
          excellentAttendance: false,
          riskSubjects: [],
        },
      };
    }

    for (const record of rawData) {
      // Find student record matching either ID or Enrollment
      const studentRecord = record.students?.find(
        (s: any) =>
          s.studentId === currentUserId ||
          s.studentId === enrollment ||
          (s.enrollment && s.enrollment === enrollment),
      );

      if (studentRecord) {
        for (const subjectRecord of studentRecord.subjects) {
          // Data should now be properly formatted after cleanup
          const normalizedSubject = subjectRecord.subjectName;
          const normalizedStatus = subjectRecord.status;

          // Basic validation - skip invalid entries
          if (
            !normalizedSubject ||
            typeof normalizedSubject !== "string" ||
            normalizedSubject.length === 0 ||
            (normalizedStatus !== "present" && normalizedStatus !== "absent")
          ) {
            console.log(
              `Skipping invalid data: subject=${normalizedSubject}, status=${normalizedStatus}`,
            );
            continue;
          }

          const isPresent = normalizedStatus === "present";

          // Add to history
          studentAttendanceHistory.push({
            date: record.date,
            subject: normalizedSubject,
            status: normalizedStatus,
            timestamp: subjectRecord.timestamp,
            markedBy: record.markedBy,
            dayOfWeek: format(new Date(record.date), "EEEE"),
          });

          // Update statistics
          totalClassesTaken++;
          if (isPresent) totalPresent++;

          // Update subject-wise stats
          if (!subjectStats[normalizedSubject]) {
            subjectStats[normalizedSubject] = {
              present: 0,
              total: 0,
              percentage: 0,
            };
          }
          subjectStats[normalizedSubject].total++;
          if (isPresent) {
            subjectStats[normalizedSubject].present++;
          }
        }
      }
    }

    // Calculate percentages for each subject
    Object.keys(subjectStats).forEach((subjectName) => {
      const stats = subjectStats[subjectName];
      stats.percentage =
        stats.total > 0 ? (stats.present / stats.total) * 100 : 0;
    });

    // Calculate overall attendance percentage
    const overallPercentage =
      totalClassesTaken > 0 ? (totalPresent / totalClassesTaken) * 100 : 0;

    // Calculate attendance trend (last 7 days vs previous 7 days)
    const last7Days = studentAttendanceHistory.filter((record) => {
      const recordDate = new Date(record.date);
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      return recordDate >= sevenDaysAgo;
    });

    const previous7Days = studentAttendanceHistory.filter((record) => {
      const recordDate = new Date(record.date);
      const fourteenDaysAgo = new Date();
      fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14);
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      return recordDate >= fourteenDaysAgo && recordDate < sevenDaysAgo;
    });

    const last7DaysPercentage =
      last7Days.length > 0
        ? (last7Days.filter((r) => r.status === "present").length /
            last7Days.length) *
          100
        : 0;
    const previous7DaysPercentage =
      previous7Days.length > 0
        ? (previous7Days.filter((r) => r.status === "present").length /
            previous7Days.length) *
          100
        : 0;

    const trend =
      last7DaysPercentage > previous7DaysPercentage
        ? "improving"
        : last7DaysPercentage < previous7DaysPercentage
          ? "declining"
          : "stable";

    // Find attendance streak (consecutive days with at least one present subject)
    const dailyAttendance = new Map();
    studentAttendanceHistory.forEach((record) => {
      const dateStr = format(new Date(record.date), "yyyy-MM-dd");
      if (!dailyAttendance.has(dateStr)) {
        dailyAttendance.set(dateStr, []);
      }
      dailyAttendance.get(dateStr).push(record);
    });

    let currentStreak = 0;
    let maxStreak = 0;
    const sortedDates = Array.from(dailyAttendance.keys()).sort().reverse();

    for (const dateStr of sortedDates) {
      const dayRecords = dailyAttendance.get(dateStr);
      const hasPresentClass = dayRecords.some(
        (r: any) => r.status === "present",
      );

      if (hasPresentClass) {
        currentStreak++;
        maxStreak = Math.max(maxStreak, currentStreak);
      } else {
        if (currentStreak > 0) break; // Only break current streak, don't reset max
        currentStreak = 0;
      }
    }

    return {
      attendanceHistory: studentAttendanceHistory,
      statistics: {
        totalClasses: totalClassesTaken,
        totalPresent: totalPresent,
        totalAbsent: totalClassesTaken - totalPresent,
        overallPercentage: Math.round(overallPercentage * 100) / 100,
        trend: trend,
        currentStreak: currentStreak,
        maxStreak: maxStreak,
        subjectWiseStats: subjectStats,
      },
      insights: {
        last7DaysPercentage: Math.round(last7DaysPercentage * 100) / 100,
        previous7DaysPercentage:
          Math.round(previous7DaysPercentage * 100) / 100,
        needsImprovement: overallPercentage < 75,
        excellentAttendance: overallPercentage >= 90,
        riskSubjects: Object.entries(subjectStats)
          .filter(([_, stats]) => stats.percentage < 75)
          .map(([subject, stats]) => ({
            subject,
            percentage: stats.percentage,
          })),
      },
    };
  };

  // Fetch attendance data using useQuery
  const {
    data: rawAttendanceData,
    isLoading: queryLoading,
    error: queryError,
  } = useQuery({
    queryKey: ["attendance", "student", dateRange, selectedSubject],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (dateRange?.from) {
        params.append("startDate", format(dateRange.from, "yyyy-MM-dd"));
      }
      if (dateRange?.to) {
        params.append("endDate", format(dateRange.to, "yyyy-MM-dd"));
      }
      if (selectedSubject !== "all") {
        params.append("subject", selectedSubject);
      }

      const response = await fetch(
        getApiUrl(`/api/attendance/history?${params.toString()}`),
        {
          credentials: "include",
        },
      );

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      if (!result.success || !result.data) {
        throw new Error(result.message || "Failed to fetch attendance data");
      }

      return result.data;
    },
  });

  // Process the raw data when it's available
  useEffect(() => {
    if (rawAttendanceData) {
      try {
        const processedData = processAttendanceHistory(rawAttendanceData);
        setAttendanceData(processedData);
        setError(null);
      } catch (error) {
        console.error("Error processing attendance data:", error);
        setError("Failed to process attendance data");
      }
    }
    setIsLoading(queryLoading);
  }, [rawAttendanceData, queryLoading]);

  // Handle query errors
  useEffect(() => {
    if (queryError) {
      setError(queryError.message || "Failed to fetch attendance data");
      setIsLoading(false);
    }
  }, [queryError]);

  // Helper functions
  const formatDate = (dateString: string) => {
    const date = parseISO(dateString);
    if (isToday(date)) return "Today";
    if (isYesterday(date)) return "Yesterday";
    return format(date, "MMM d, yyyy");
  };

  // Get subject-wise attendance details
  const getSubjectAttendanceDetails = (subjectName: string) => {
    if (!attendanceData) return [];

    return attendanceData.attendanceHistory
      .filter((record) => record.subject === subjectName)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .map((record) => ({
        ...record,
        formattedDate: formatDate(record.date),
        dayName: format(parseISO(record.date), "EEEE"),
      }));
  };

  // Handle subject click for detailed view
  const handleSubjectClick = (subjectName: string) => {
    setSelectedSubjectForDetail(subjectName);
    setSubjectDetailView(true);
  };

  const getStatusIcon = (status: "present" | "absent") => {
    return status === "present" ? (
      <CheckCircle className="h-4 w-4 text-green-500" />
    ) : (
      <XCircle className="h-4 w-4 text-red-500" />
    );
  };

  const getStatusBadge = (status: "present" | "absent") => {
    return (
      <Badge
        variant={status === "present" ? "default" : "destructive"}
        className={
          status === "present"
            ? "bg-green-100 text-green-800"
            : "bg-red-100 text-red-800"
        }
      >
        {status === "present" ? "Present" : "Absent"}
      </Badge>
    );
  };

  const getTrendIcon = (trend: "improving" | "declining" | "stable") => {
    switch (trend) {
      case "improving":
        return <TrendingUp className="h-4 w-4 text-green-500" />;
      case "declining":
        return <TrendingDown className="h-4 w-4 text-red-500" />;
      default:
        return <Minus className="h-4 w-4 text-gray-500" />;
    }
  };

  const getAttendanceColor = (percentage: number) => {
    if (percentage >= 90) return "text-green-600";
    if (percentage >= 75) return "text-yellow-600";
    return "text-red-600";
  };

  const getAttendanceBgColor = (percentage: number) => {
    if (percentage >= 90) return "bg-green-100";
    if (percentage >= 75) return "bg-yellow-100";
    return "bg-red-100";
  };

  // Get unique subjects for filter
  const subjects = attendanceData
    ? Array.from(
        new Set(
          attendanceData.attendanceHistory.map((record) => record.subject),
        ),
      )
    : [];

  // Handle user not authenticated
  if (!user) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <AlertTriangle className="h-12 w-12 text-yellow-500 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-600 mb-2">
            Authentication Required
          </h3>
          <p className="text-gray-500">
            Please log in to view your attendance records.
          </p>
        </CardContent>
      </Card>
    );
  }

  // Handle error state
  if (error) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <XCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-600 mb-2">
            Error Loading Attendance
          </h3>
          <p className="text-gray-500 mb-4">{error}</p>
          <Button onClick={() => window.location.reload()} variant="outline">
            Retry
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/3 mb-4"></div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-24 bg-gray-200 rounded"></div>
            ))}
          </div>
          <div className="h-96 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  if (!attendanceData) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <AlertTriangle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-600 mb-2">
            No Attendance Data Found
          </h3>
          <p className="text-gray-500">
            Your attendance records will appear here once your CR starts marking
            attendance.
          </p>
        </CardContent>
      </Card>
    );
  }

  const { attendanceHistory, statistics, insights } = attendanceData;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl md:text-2xl font-bold text-gray-900">
            My Attendance Tracker
          </h2>
          <p className="text-sm md:text-base text-gray-600">
            Track your attendance and academic progress
          </p>
        </div>

        <div className="flex flex-col md:flex-row items-stretch md:items-center gap-2 md:gap-4 w-full md:w-auto">
          {/* View Mode Toggle */}
          <Select
            value={viewMode}
            onValueChange={(value: any) => setViewMode(value)}
          >
            <SelectTrigger className="w-full md:w-[140px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="overview">Overview</SelectItem>
              <SelectItem value="detailed">Detailed</SelectItem>
              <SelectItem value="calendar">Calendar</SelectItem>
            </SelectContent>
          </Select>

          {/* Subject Filter */}
          <Select value={selectedSubject} onValueChange={setSelectedSubject}>
            <SelectTrigger className="w-full md:w-[160px]">
              <Filter className="h-4 w-4 mr-2" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Subjects</SelectItem>
              {subjects.map((subject) => (
                <SelectItem key={subject} value={subject}>
                  {subject}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Date Range Picker */}
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className="w-full md:w-[240px] justify-start text-left font-normal"
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {dateRange?.from ? (
                  dateRange.to ? (
                    <>
                      {format(dateRange.from, "LLL dd, y")} -{" "}
                      {format(dateRange.to, "LLL dd, y")}
                    </>
                  ) : (
                    format(dateRange.from, "LLL dd, y")
                  )
                ) : (
                  <span>Pick a date range</span>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                initialFocus
                mode="range"
                defaultMonth={dateRange?.from}
                selected={dateRange}
                onSelect={setDateRange}
                numberOfMonths={2}
              />
            </PopoverContent>
          </Popover>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">
                  Overall Attendance
                </p>
                <p
                  className={`text-2xl font-bold ${getAttendanceColor(
                    statistics.overallPercentage,
                  )}`}
                >
                  {statistics.overallPercentage.toFixed(1)}%
                </p>
              </div>
              <div
                className={`p-3 rounded-full ${getAttendanceBgColor(
                  statistics.overallPercentage,
                )}`}
              >
                <BarChart3
                  className={`h-6 w-6 ${getAttendanceColor(
                    statistics.overallPercentage,
                  )}`}
                />
              </div>
            </div>
            <div className="flex items-center mt-2">
              {getTrendIcon(statistics.trend)}
              <span className="text-sm text-gray-600 ml-1 capitalize">
                {statistics.trend}
              </span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">
                  Classes Attended
                </p>
                <p className="text-2xl font-bold text-blue-600">
                  {statistics.totalPresent}/{statistics.totalClasses}
                </p>
              </div>
              <div className="p-3 rounded-full bg-blue-100">
                <CheckCircle className="h-6 w-6 text-blue-600" />
              </div>
            </div>
            <p className="text-sm text-gray-500 mt-2">
              {statistics.totalAbsent} classes missed
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">
                  Current Streak
                </p>
                <p className="text-2xl font-bold text-orange-600">
                  {statistics.currentStreak}
                </p>
              </div>
              <div className="p-3 rounded-full bg-orange-100">
                <Award className="h-6 w-6 text-orange-600" />
              </div>
            </div>
            <p className="text-sm text-gray-500 mt-2">
              Max streak: {statistics.maxStreak} days
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">
                  Weekly Progress
                </p>
                <p
                  className={`text-2xl font-bold ${getAttendanceColor(
                    insights.last7DaysPercentage,
                  )}`}
                >
                  {insights.last7DaysPercentage.toFixed(1)}%
                </p>
              </div>
              <div
                className={`p-3 rounded-full ${getAttendanceBgColor(
                  insights.last7DaysPercentage,
                )}`}
              >
                <CalendarDays
                  className={`h-6 w-6 ${getAttendanceColor(
                    insights.last7DaysPercentage,
                  )}`}
                />
              </div>
            </div>
            <div className="flex items-center mt-2">
              {insights.last7DaysPercentage >
              insights.previous7DaysPercentage ? (
                <>
                  <TrendingUp className="h-3 w-3 text-green-500" />
                  <span className="text-sm text-green-600 ml-1">
                    +
                    {(
                      insights.last7DaysPercentage -
                      insights.previous7DaysPercentage
                    ).toFixed(1)}
                    %
                  </span>
                </>
              ) : insights.last7DaysPercentage <
                insights.previous7DaysPercentage ? (
                <>
                  <TrendingDown className="h-3 w-3 text-red-500" />
                  <span className="text-sm text-red-600 ml-1">
                    {(
                      insights.last7DaysPercentage -
                      insights.previous7DaysPercentage
                    ).toFixed(1)}
                    %
                  </span>
                </>
              ) : (
                <span className="text-sm text-gray-500">No change</span>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Insights Section */}
      {(insights.needsImprovement ||
        insights.riskSubjects.length > 0 ||
        insights.excellentAttendance) && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {insights.excellentAttendance && (
            <Card className="border-green-200 bg-green-50">
              <CardContent className="p-4">
                <div className="flex items-center gap-2">
                  <Award className="h-5 w-5 text-green-600" />
                  <h3 className="font-semibold text-green-800">
                    Excellent Attendance!
                  </h3>
                </div>
                <p className="text-sm text-green-700 mt-1">
                  You're maintaining excellent attendance above 90%. Keep it up!
                </p>
              </CardContent>
            </Card>
          )}

          {insights.needsImprovement && (
            <Card className="border-yellow-200 bg-yellow-50">
              <CardContent className="p-4">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-yellow-600" />
                  <h3 className="font-semibold text-yellow-800">
                    Needs Improvement
                  </h3>
                </div>
                <p className="text-sm text-yellow-700 mt-1">
                  Your attendance is below 75%. Try to attend more classes to
                  improve your percentage.
                </p>
              </CardContent>
            </Card>
          )}

          {insights.riskSubjects.length > 0 && (
            <Card className="border-red-200 bg-red-50">
              <CardContent className="p-4">
                <div className="flex items-center gap-2">
                  <XCircle className="h-5 w-5 text-red-600" />
                  <h3 className="font-semibold text-red-800">
                    At-Risk Subjects
                  </h3>
                </div>
                <p className="text-sm text-red-700 mt-1">
                  Focus on:{" "}
                  {insights.riskSubjects.map((s) => s.subject).join(", ")}
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Subject-wise Performance */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            Subject-wise Performance
            <span className="text-sm text-gray-500 font-normal">
              Click any subject for details
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {Object.entries(statistics.subjectWiseStats).map(
              ([subject, stats]) => (
                <Card
                  key={subject}
                  className="p-4 cursor-pointer hover:shadow-md transition-shadow duration-200 hover:bg-gray-50"
                  onClick={() => handleSubjectClick(subject)}
                >
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-medium text-gray-800">{subject}</h4>
                    <Badge
                      variant={
                        stats.percentage >= 75 ? "default" : "destructive"
                      }
                      className={
                        stats.percentage >= 75
                          ? "bg-green-100 text-green-800"
                          : "bg-red-100 text-red-800"
                      }
                    >
                      {stats.percentage.toFixed(1)}%
                    </Badge>
                  </div>
                  <div className="flex justify-between text-sm text-gray-600">
                    <span>Present: {stats.present}</span>
                    <span>Total: {stats.total}</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
                    <div
                      className={`h-2 rounded-full ${
                        stats.percentage >= 75 ? "bg-green-500" : "bg-red-500"
                      }`}
                      style={{ width: `${Math.min(stats.percentage, 100)}%` }}
                    ></div>
                  </div>
                </Card>
              ),
            )}
          </div>
        </CardContent>
      </Card>

      {/* Attendance History */}
      {viewMode === "detailed" && (
        <Card>
          <CardHeader>
            <CardTitle>Recent Attendance History</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {attendanceHistory.length > 0 ? (
                attendanceHistory.slice(0, 20).map((record, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-3 border rounded-lg"
                  >
                    <div className="flex items-center gap-3">
                      {getStatusIcon(record.status)}
                      <div>
                        <p className="font-medium">{record.subject}</p>
                        <p className="text-sm text-gray-600">
                          {formatDate(record.date)} ({record.dayOfWeek})
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {getStatusBadge(record.status)}
                      <div className="text-right">
                        <p className="text-xs text-gray-500">
                          {format(parseISO(record.timestamp), "h:mm a")}
                        </p>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-8">
                  <Clock className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600">
                    No attendance records found for the selected period.
                  </p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Calendar View */}
      {viewMode === "calendar" && (
        <Card>
          <CardHeader>
            <CardTitle>Attendance Calendar</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center py-8">
              <CalendarDays className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600">Calendar view coming soon...</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Subject Detail Dialog */}
      <Dialog open={subjectDetailView} onOpenChange={setSubjectDetailView}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto w-[95vw] sm:w-full">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between">
              <span>{selectedSubjectForDetail} - Attendance Details</span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSubjectDetailView(false)}
              >
                <X className="h-4 w-4" />
              </Button>
            </DialogTitle>
            <DialogDescription>
              Complete attendance history for {selectedSubjectForDetail}
            </DialogDescription>
          </DialogHeader>

          {selectedSubjectForDetail && attendanceData && (
            <div className="space-y-4">
              {/* Subject Summary */}
              <Card>
                <CardContent className="pt-6">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                    {(() => {
                      const subjectDetails = getSubjectAttendanceDetails(
                        selectedSubjectForDetail,
                      );
                      const totalClasses = subjectDetails.length;
                      const presentCount = subjectDetails.filter(
                        (record) => record.status === "present",
                      ).length;
                      const absentCount = totalClasses - presentCount;
                      const percentage =
                        totalClasses > 0
                          ? (presentCount / totalClasses) * 100
                          : 0;

                      return (
                        <>
                          <div>
                            <div className="text-2xl font-bold text-blue-600">
                              {totalClasses}
                            </div>
                            <div className="text-sm text-gray-600">
                              Total Classes
                            </div>
                          </div>
                          <div>
                            <div className="text-2xl font-bold text-green-600">
                              {presentCount}
                            </div>
                            <div className="text-sm text-gray-600">Present</div>
                          </div>
                          <div>
                            <div className="text-2xl font-bold text-red-600">
                              {absentCount}
                            </div>
                            <div className="text-sm text-gray-600">Absent</div>
                          </div>
                          <div>
                            <div className="text-2xl font-bold text-purple-600">
                              {percentage.toFixed(1)}%
                            </div>
                            <div className="text-sm text-gray-600">
                              Attendance
                            </div>
                          </div>
                        </>
                      );
                    })()}
                  </div>
                </CardContent>
              </Card>

              {/* Attendance History */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Attendance History</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 max-h-96 overflow-y-auto">
                    {getSubjectAttendanceDetails(selectedSubjectForDetail).map(
                      (record, index) => (
                        <div
                          key={`${record.date}-${record.subject}`}
                          className={`flex items-center justify-between p-3 rounded-lg border transition-all duration-200 hover:shadow-sm ${
                            record.status === "present"
                              ? "bg-green-50 border-green-200 hover:bg-green-100"
                              : "bg-red-50 border-red-200 hover:bg-red-100"
                          }`}
                        >
                          <div className="flex items-center space-x-3">
                            {getStatusIcon(record.status)}
                            <div>
                              <div className="font-medium">
                                {record.formattedDate} ({record.dayName})
                              </div>
                              <div className="text-sm text-gray-600">
                                {format(parseISO(record.date), "dd/MM/yyyy")}
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center space-x-2">
                            {getStatusBadge(record.status)}
                            <div className="text-xs text-gray-500">
                              {format(parseISO(record.timestamp), "HH:mm")}
                            </div>
                          </div>
                        </div>
                      ),
                    )}

                    {getSubjectAttendanceDetails(selectedSubjectForDetail)
                      .length === 0 && (
                      <div className="text-center py-8 text-gray-500">
                        <Calendar className="h-12 w-12 mx-auto mb-2 text-gray-300" />
                        <p>No attendance records found for this subject</p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
