import React, { useState, useEffect } from "react";
import { View, Text, ActivityIndicator, TouchableOpacity, ScrollView, TextInput } from "react-native";
import { useQuery } from "@tanstack/react-query";
import { fetchWithCookie } from "../src/lib/api";
import { useAuth } from "../src/lib/auth";
import { 
    TrendingUp, AlertTriangle, Search, Filter, CheckCircle2, XCircle 
} from "lucide-react-native";

interface AttendanceStats {
  totalClasses: number;
  totalPresent: number;
  totalAbsent: number;
  overallPercentage: number;
  currentStreak: number;
  subjectWiseStats?: Record<string, SubjectStat>;
}

interface SubjectStat {
    present: number;
    total: number;
    percentage: number;
    status: 'safe' | 'risk' | 'critical';
}

interface AttendanceData {
  statistics: AttendanceStats;
  attendanceHistory: any[];
}

export default function AttendanceTracker() {
  const { user } = useAuth();
  const [attendanceData, setAttendanceData] = useState<AttendanceData | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [filter, setFilter] = useState<'all' | 'risk' | 'safe'>('all');

  const { data: rawAttendanceData, isLoading } = useQuery({
    queryKey: ["attendance", "student"],
    queryFn: async () => {
      const res = await fetchWithCookie(`/api/attendance/history`);
      if (!res.ok) throw new Error("Failed");
      const json = await res.json();
      return json.data;
    }
  });

  useEffect(() => {
    if (rawAttendanceData && user) {
        const currentUserId = user.rollNumber || user.id;
        let totalClasses = 0;
        let totalPresent = 0;
        let currentStreak = 0;
        const subjectStats: Record<string, SubjectStat> = {};

        rawAttendanceData.forEach((record: any) => {
             const studentRecord = record.students?.find((s: any) => s.studentId === currentUserId);
             if (studentRecord) {
                 studentRecord.subjects.forEach((sub: any) => {
                     const subName = sub.subjectName;
                     if (!subjectStats[subName]) subjectStats[subName] = { present: 0, total: 0, percentage: 0, status: 'safe' };
                     
                     subjectStats[subName].total++;
                     totalClasses++;
                     
                     if (sub.status === 'present') {
                         subjectStats[subName].present++;
                         totalPresent++;
                         currentStreak++;
                     } else {
                         currentStreak = 0;
                     }
                 });
             }
        });

        // Calculate stats
        Object.keys(subjectStats).forEach(key => {
            const s = subjectStats[key];
            s.percentage = s.total > 0 ? (s.present / s.total) * 100 : 0;
            if (s.percentage < 75) s.status = 'risk';
            else s.status = 'safe';
        });

        const percentage = totalClasses > 0 ? (totalPresent / totalClasses) * 100 : 0;

        setAttendanceData({
            statistics: {
                totalClasses,
                totalPresent,
                totalAbsent: totalClasses - totalPresent,
                overallPercentage: percentage,
                currentStreak,
                subjectWiseStats: subjectStats
            },
            attendanceHistory: [] 
        });
    }
  }, [rawAttendanceData, user]);

  const getSafetyMargin = (present: number, total: number) => {
      // Logic:
      // If < 75%: How many consecutive presents needed?
      // (P + x) / (T + x) >= 0.75  =>  x >= 3T - 4P
      // If >= 75%: How many skips allowed?
      // P / (T + y) >= 0.75  =>  y <= (4P - 3T) / 3

      const current = total > 0 ? (present/total) : 0;
      if (current < 0.75) {
          const needed = Math.ceil(3*total - 4*present);
          return { type: 'need', count: Math.max(0, needed) };
      } else {
          const safeSkips = Math.floor((4*present - 3*total) / 3);
          return { type: 'skip', count: Math.max(0, safeSkips) };
      }
  };

  const getStatusColor = (percentage: number) => {
      if (percentage >= 75) return "text-green-500";
      return "text-red-500";
  };
  
  const getProgressColor = (percentage: number) => {
      if (percentage >= 75) return "bg-green-500";
      return "bg-red-500";
  };

  if (isLoading) return <ActivityIndicator size="large" color="#a855f7" />;
  if (!user) return <Text className="text-muted-foreground">Please log in</Text>;
  if (!attendanceData) return <Text className="text-muted-foreground">No data available</Text>;

  const stats = attendanceData.statistics;
  const subjects = stats.subjectWiseStats || {};
  
  // Filtering
  const filteredSubjects = Object.entries(subjects).filter(([name, data]) => {
      const matchesSearch = name.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesFilter = filter === 'all' 
          || (filter === 'risk' && data.percentage < 75)
          || (filter === 'safe' && data.percentage >= 75);
      return matchesSearch && matchesFilter;
  });

  return (
    <View className="space-y-6 mb-8">
        {/* Header Stats */}
        <View className="flex-row items-center justify-between bg-card p-5 rounded-2xl border border-border shadow-sm">
             <View>
                 <Text className="text-muted-foreground text-xs font-medium uppercase tracking-wider">Overall Attendance</Text>
                 <View className="flex-row items-baseline mt-1">
                     <Text className={`text-4xl font-bold ${getStatusColor(stats.overallPercentage)}`}>
                         {stats.overallPercentage.toFixed(1)}%
                     </Text>
                 </View>
                 <View className="flex-row items-center mt-2 bg-secondary/50 self-start px-2 py-1 rounded-md">
                     <TrendingUp size={12} color={stats.overallPercentage >= 75 ? "#22c55e" : "#ef4444"} />
                     <Text className="text-foreground text-xs ml-1.5 font-medium">
                         {stats.totalPresent}/{stats.totalClasses} Classes
                     </Text>
                 </View>
             </View>
             
             {/* Ring Chart Placeholder or Streak */}
             <View className="items-end">
                 <Text className="text-muted-foreground text-xs font-medium mb-1">Current Streak</Text>
                 <View className="bg-orange-500/10 px-3 py-2 rounded-xl border border-orange-500/20">
                     <Text className="text-orange-500 font-bold text-xl text-center">{stats.currentStreak} 🔥</Text>
                 </View>
             </View>
        </View>

        {/* Search & Filter */}
        <View className="space-y-3">
            <View className="flex-row bg-card border border-border rounded-xl px-3 py-2.5 items-center">
                <Search size={18} className="text-muted-foreground mr-2" />
                <TextInput 
                    placeholder="Search subjects..." 
                    className="flex-1 text-foreground font-medium" 
                    placeholderTextColor="#9ca3af"
                    value={searchQuery}
                    onChangeText={setSearchQuery}
                />
            </View>

            <ScrollView horizontal showsHorizontalScrollIndicator={false} className="flex-row gap-2">
                {(['all', 'risk', 'safe'] as const).map(f => (
                    <TouchableOpacity 
                        key={f}
                        onPress={() => setFilter(f)}
                        className={`px-4 py-2 rounded-full border ${
                            filter === f 
                            ? 'bg-primary border-primary' 
                            : 'bg-card border-border'
                        }`}
                    >
                        <Text className={`capitalize font-bold ${
                            filter === f ? 'text-primary-foreground' : 'text-muted-foreground'
                        }`}>
                            {f === 'risk' ? '⚠️ At Risk' : f === 'safe' ? '✅ Safe' : 'All'}
                        </Text>
                    </TouchableOpacity>
                ))}
            </ScrollView>
        </View>

        {/* Lists */}
        <View className="space-y-3">
            {filteredSubjects.length === 0 ? (
                <View className="items-center py-8">
                    <Text className="text-muted-foreground">No subjects found.</Text>
                </View>
            ) : (
                filteredSubjects.map(([subject, subStats]) => {
                    const margin = getSafetyMargin(subStats.present, subStats.total);
                    const isRisk = subStats.percentage < 75;

                    return (
                        <View key={subject} className="bg-card p-4 rounded-xl border border-border shadow-sm">
                            <View className="flex-row justify-between items-start mb-3">
                                <View className="flex-1 mr-4">
                                    <Text className="text-foreground font-bold text-base mb-1">{subject}</Text>
                                    <View className="flex-row items-center">
                                        <View className={`w-2 h-2 rounded-full mr-2 ${isRisk ? 'bg-red-500' : 'bg-green-500'}`} />
                                        <Text className="text-muted-foreground text-xs">
                                            {subStats.present}/{subStats.total} Attended
                                        </Text>
                                    </View>
                                </View>
                                <View className="items-end">
                                    <Text className={`text-2xl font-bold ${getStatusColor(subStats.percentage)}`}>
                                        {subStats.percentage.toFixed(0)}%
                                    </Text>
                                </View>
                            </View>

                            {/* Progress Bar */}
                            <View className="h-2.5 bg-secondary rounded-full overflow-hidden mb-3">
                                <View 
                                    className={`h-full ${getProgressColor(subStats.percentage)}`} 
                                    style={{ width: `${subStats.percentage}%` }} 
                                />
                            </View>

                            {/* Insight / Action */}
                            <View className={`flex-row items-center p-2.5 rounded-lg ${
                                isRisk ? 'bg-red-500/10' : 'bg-green-500/10'
                            }`}>
                                {isRisk ? (
                                    <AlertTriangle size={16} className="text-red-500 mr-2" />
                                ) : (
                                    <CheckCircle2 size={16} className="text-green-500 mr-2" />
                                )}
                                <Text className={`text-xs flex-1 font-bold ${
                                    isRisk ? 'text-red-500' : 'text-green-500'
                                }`}>
                                    {margin.type === 'need' 
                                        ? `Attend next ${margin.count} classes to reach 75%` 
                                        : `Safe! You can bunk ${margin.count} classes`
                                    }
                                </Text>
                            </View>
                        </View>
                    );
                })
            )}
        </View>
    </View>
  );
}
