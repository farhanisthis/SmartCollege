
import React, { useState, useEffect } from "react";
import { View, Text, ScrollView, ActivityIndicator, Dimensions, TouchableOpacity } from "react-native";
import { useQuery } from "@tanstack/react-query";
import { format, parseISO, isToday, isYesterday, subDays } from "date-fns";
import { fetchWithCookie } from "../src/lib/api";
import { useAuth } from "../src/lib/auth";
import { LineChart } from "react-native-chart-kit";
import { Calendar, TrendingUp, TrendingDown, Minus, CheckCircle, XCircle, Award, BarChart2, ChevronRight, ChevronDown } from "lucide-react-native";

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
  const [attendanceData, setAttendanceData] = useState<AttendanceData | null>(null);
  const [selectedSubject, setSelectedSubject] = useState<string>("all");
  const [subjectExpanded, setSubjectExpanded] = useState<string | null>(null);

  // Process raw attendance history into student-focused format
  const processAttendanceHistory = (rawData: any[]): AttendanceData => {
    const studentAttendanceHistory: AttendanceRecord[] = [];
    let totalClassesTaken = 0;
    let totalPresent = 0;
    const subjectStats: Record<string, { present: number; total: number; percentage: number }> = {};

    const currentUserId = user?.rollNumber || user?.id;

    if (!currentUserId || !rawData) {
        return {
            attendanceHistory: [],
            statistics: {
                totalClasses: 0, totalPresent: 0, totalAbsent: 0, overallPercentage: 0,
                trend: "stable", currentStreak: 0, maxStreak: 0, subjectWiseStats: {},
            },
            insights: {
                last7DaysPercentage: 0, previous7DaysPercentage: 0, needsImprovement: false,
                excellentAttendance: false, riskSubjects: [],
            },
        };
    }

    for (const record of rawData) {
      const studentRecord = record.students?.find((s: any) => s.studentId === currentUserId);

      if (studentRecord) {
        for (const subjectRecord of studentRecord.subjects) {
          const normalizedSubject = subjectRecord.subjectName;
          const normalizedStatus = subjectRecord.status;

          if (!normalizedSubject || (normalizedStatus !== "present" && normalizedStatus !== "absent")) {
            continue;
          }

          const isPresent = normalizedStatus === "present";

          studentAttendanceHistory.push({
            date: record.date,
            subject: normalizedSubject,
            status: normalizedStatus,
            timestamp: subjectRecord.timestamp,
            markedBy: record.markedBy,
            dayOfWeek: format(new Date(record.date), "EEEE"),
          });

          totalClassesTaken++;
          if (isPresent) totalPresent++;

          if (!subjectStats[normalizedSubject]) {
            subjectStats[normalizedSubject] = { present: 0, total: 0, percentage: 0 };
          }
          subjectStats[normalizedSubject].total++;
          if (isPresent) {
            subjectStats[normalizedSubject].present++;
          }
        }
      }
    }

    // Calculate percentages
    Object.keys(subjectStats).forEach((subjectName) => {
      const stats = subjectStats[subjectName];
      stats.percentage = stats.total > 0 ? (stats.present / stats.total) * 100 : 0;
    });

    const overallPercentage = totalClassesTaken > 0 ? (totalPresent / totalClassesTaken) * 100 : 0;

    // Trend Logic
    const last7Days = studentAttendanceHistory.filter(r => new Date(r.date) >= subDays(new Date(), 7));
    const previous7Days = studentAttendanceHistory.filter(r => {
        const d = new Date(r.date);
        return d >= subDays(new Date(), 14) && d < subDays(new Date(), 7);
    });

    const last7DaysPercentage = last7Days.length > 0 
        ? (last7Days.filter(r => r.status === 'present').length / last7Days.length) * 100 : 0;
    const previous7DaysPercentage = previous7Days.length > 0
        ? (previous7Days.filter(r => r.status === 'present').length / previous7Days.length) * 100 : 0;

    const trend = last7DaysPercentage > previous7DaysPercentage ? "improving" : 
                  (last7DaysPercentage < previous7DaysPercentage ? "declining" : "stable");

    // Streak Logic
    const dailyAttendance = new Map();
    studentAttendanceHistory.forEach(r => {
        const d = format(new Date(r.date), "yyyy-MM-dd");
        if(!dailyAttendance.has(d)) dailyAttendance.set(d, []);
        dailyAttendance.get(d).push(r);
    });

    let currentStreak = 0; 
    let maxStreak = 0;
    const sortedDates = Array.from(dailyAttendance.keys()).sort().reverse();
    
    // Simple streak: consecutive days with at least one present
    for(const d of sortedDates) {
        if(dailyAttendance.get(d).some((r: any) => r.status === 'present')) {
            currentStreak++;
            maxStreak = Math.max(maxStreak, currentStreak);
        } else {
            if(currentStreak > 0) break;
            currentStreak = 0;
        }
    }

    return {
      attendanceHistory: studentAttendanceHistory.sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime()),
      statistics: {
        totalClasses: totalClassesTaken,
        totalPresent: totalPresent,
        totalAbsent: totalClassesTaken - totalPresent,
        overallPercentage: Math.round(overallPercentage * 100) / 100,
        trend,
        currentStreak,
        maxStreak,
        subjectWiseStats: subjectStats,
      },
      insights: {
        last7DaysPercentage: Math.round(last7DaysPercentage * 100) / 100,
        previous7DaysPercentage: Math.round(previous7DaysPercentage * 100) / 100,
        needsImprovement: overallPercentage < 75,
        excellentAttendance: overallPercentage >= 90,
        riskSubjects: Object.entries(subjectStats).filter(([_, s]) => s.percentage < 75).map(([s, stats]) => ({ subject: s, percentage: stats.percentage })),
      },
    };
  };

  const { data: rawData, isLoading } = useQuery({
    queryKey: ["attendance", "history", "all"],
    queryFn: async () => {
       const res = await fetchWithCookie("/api/attendance/history");
       if(!res.ok) throw new Error("Failed");
       const json = await res.json();
       return json.data || [];
    }
  });

  useEffect(() => {
    if (rawData) {
        setAttendanceData(processAttendanceHistory(rawData));
    }
  }, [rawData]);

  if (isLoading || !attendanceData) {
    return <ActivityIndicator size="large" color="#3b82f6" className="mt-10" />;
  }

  const { statistics, insights, attendanceHistory } = attendanceData;
  const screenWidth = Dimensions.get("window").width;

  const getStatusColor = (status: string) => status === 'present' ? 'text-green-600' : 'text-red-500';
  const getPercentageColor = (p: number) => p >= 75 ? 'text-green-600' : (p >= 60 ? 'text-yellow-600' : 'text-red-600');
  const getPercentageBg = (p: number) => p >= 75 ? 'bg-green-100' : (p >= 60 ? 'bg-yellow-100' : 'bg-red-100');

  // Subjects List
  const subjects = Object.entries(statistics.subjectWiseStats).sort(([,a], [,b]) => b.percentage - a.percentage);

  return (
    <View className="mb-20">
        {/* Stats Cards Row */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} className="flex-row mb-6 -mx-4 px-4 overflow-visible">
             {/* Overall Card */}
             <View className="bg-white p-5 rounded-3xl border border-gray-100 w-44 mr-4 shadow-sm">
                <View className="flex-row justify-between items-start mb-2">
                    <View className={`p-2 rounded-xl ${getPercentageBg(statistics.overallPercentage)}`}>
                        <BarChart2 size={20} className={getPercentageColor(statistics.overallPercentage).replace('text-', 'color-')} color={statistics.overallPercentage >= 75 ? '#16a34a' : '#dc2626'} />
                    </View>
                    {statistics.trend === 'improving' && <TrendingUp size={20} color="#16a34a" />}
                    {statistics.trend === 'declining' && <TrendingDown size={20} color="#dc2626" />}
                </View>
                <Text className={`text-3xl font-black ${getPercentageColor(statistics.overallPercentage)}`}>{statistics.overallPercentage}%</Text>
                <Text className="text-gray-400 text-[10px] font-bold uppercase tracking-widest mt-1">Overall Attendance</Text>
             </View>

             {/* Streak Card */}
             <View className="bg-white p-5 rounded-3xl border border-gray-100 w-40 mr-4 shadow-sm">
                <View className="bg-orange-100 p-2 rounded-xl self-start mb-2">
                    <Award size={20} color="#ea580c" />
                </View>
                <Text className="text-3xl font-black text-orange-600">{statistics.currentStreak}</Text>
                <Text className="text-gray-400 text-[10px] font-bold uppercase tracking-widest mt-1">Day Streak</Text>
             </View>

             {/* Total Classes Card */}
             <View className="bg-white p-5 rounded-3xl border border-gray-100 w-40 shadow-sm">
                <View className="bg-blue-100 p-2 rounded-xl self-start mb-2">
                    <CheckCircle size={20} color="#2563eb" />
                </View>
                <Text className="text-3xl font-black text-blue-600">{statistics.totalPresent}<Text className="text-gray-300 text-xl">/{statistics.totalClasses}</Text></Text>
                <Text className="text-gray-400 text-[10px] font-bold uppercase tracking-widest mt-1">Classes Attended</Text>
             </View>
        </ScrollView>

        {/* Weekly Progress Chart (Mocked for now as we calculated monthly points in performance.tsx, but here we can try real if complex) */}
        {/* Keeping it simple with recent history list instead of complex chart for now to match 'web components' request which focused on list and stats */}
        
        {/* Insights Section */}
        {insights.riskSubjects.length > 0 && (
             <View className="bg-red-50 p-4 rounded-2xl border border-red-100 mb-6 flex-row items-start">
                 <XCircle size={20} color="#dc2626" style={{ marginTop: 2 }} />
                 <View className="ml-3 flex-1">
                     <Text className="text-red-800 font-bold mb-1">Attention Needed</Text>
                     <Text className="text-red-600 text-xs leading-5">
                         You are running low on attendance in: {insights.riskSubjects.map(s => s.subject).join(", ")}.
                     </Text>
                 </View>
             </View>
        )}

        {/* Subject wise Breakdown */}
        <View className="bg-white rounded-[32px] p-6 border border-gray-100 mb-6 shadow-sm">
             <Text className="text-xl font-bold text-gray-900 mb-4">Subject Wise</Text>
             {subjects.map(([subject, stats]) => (
                 <View key={subject} className="mb-4">
                     <View className="flex-row justify-between mb-2">
                         <Text className="font-bold text-gray-700 text-sm w-1/2" numberOfLines={1}>{subject}</Text>
                         <Text className={`font-black text-xs ${getPercentageColor(stats.percentage)}`}>{Math.round(stats.percentage)}% <Text className="text-gray-300 font-normal">({stats.present}/{stats.total})</Text></Text>
                     </View>
                     <View className="h-2.5 bg-gray-100 rounded-full overflow-hidden">
                         <View className={`h-full rounded-full ${stats.percentage >= 75 ? 'bg-green-500' : (stats.percentage >= 60 ? 'bg-yellow-500' : 'bg-red-500')}`} style={{ width: `${stats.percentage}%` }} />
                     </View>
                 </View>
             ))}
        </View>

        {/* Recent History */}
        <View className="bg-white rounded-[32px] p-6 border border-gray-100 shadow-sm">
             <Text className="text-xl font-bold text-gray-900 mb-4">Recent History</Text>
             {attendanceHistory.slice(0, 10).map((record, i) => (
                 <View key={i} className="flex-row items-center justify-between py-3 border-b border-gray-50 last:border-0">
                     <View className="flex-row items-center gap-3">
                         <View className={`w-10 h-10 rounded-full items-center justify-center ${record.status === 'present' ? 'bg-green-100' : 'bg-red-100'}`}>
                             {record.status === 'present' ? <CheckCircle size={16} color="#16a34a" /> : <XCircle size={16} color="#dc2626" />}
                         </View>
                         <View>
                             <Text className="font-bold text-gray-900 text-sm">{record.subject}</Text>
                             <Text className="text-gray-400 text-xs">{format(new Date(record.date), "MMM d, h:mm a")}</Text>
                         </View>
                     </View>
                     <View className={`px-3 py-1 rounded-full ${record.status === 'present' ? 'bg-green-50' : 'bg-red-50'}`}>
                         <Text className={`text-[10px] font-bold uppercase tracking-wide ${record.status === 'present' ? 'text-green-600' : 'text-red-500'}`}>
                             {record.status}
                         </Text>
                     </View>
                 </View>
             ))}
        </View>
    </View>
  );
}
