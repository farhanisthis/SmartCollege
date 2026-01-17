
import React, { useState, useEffect, useMemo, useCallback } from "react";
import { View, Text, TouchableOpacity, ScrollView, FlatList, ActivityIndicator, Alert } from "react-native";
import { format, addDays, subDays } from "date-fns";
import { fetchWithCookie } from "../src/lib/api";
import { Calendar, Check, X, Search, ChevronRight, ChevronLeft, Save, Users, RefreshCw } from "lucide-react-native";
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system';

interface Student {
  id: string;
  name: string;
  enrollment: string;
}

interface AttendanceStatus {
  [studentId: string]: {
    [subject: string]: "present" | "absent" | undefined;
  };
}

// Helper to calc stats
const getAttendanceStats = (students: Student[], attendance: AttendanceStatus, activeSubject: string | null) => {
    if (!activeSubject) return { present: 0, absent: 0, percentage: 0 };
    let present = 0;
    let totalMarked = 0;
    students.forEach(s => {
        const status = attendance[s.id]?.[activeSubject];
        if (status === 'present') present++;
        if (status) totalMarked++;
    });
    return {
        present,
        absent: totalMarked - present,
        percentage: totalMarked > 0 ? Math.round((present / totalMarked) * 100) : 0
    };
};

export default function AttendanceManager() {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [attendance, setAttendance] = useState<AttendanceStatus>({});
  const [activeSubject, setActiveSubject] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [loading, setLoading] = useState(false);
  
  // Dynamic Data
  const [students, setStudents] = useState<Student[]>([]);
  const [dailySubjects, setDailySubjects] = useState<string[]>([]);
  const [loadingConfig, setLoadingConfig] = useState(true);

  const dayName = format(selectedDate, "EEEE");

  // Load students once on mount
  useEffect(() => {
    loadStudents();
  }, []);

  // Load timetable and attendance when date changes
  useEffect(() => {
    loadTimetableAndAttendance();
  }, [selectedDate]); 

  const loadStudents = async () => {
    try {
      const res = await fetchWithCookie("/api/bulk-users/e1-students");
      if (res.ok) {
        const result = await res.json();
        if (result.success && result.students) {
          const mappedStudents = result.students.map((s: any) => ({
            id: s._id,
            name: s.name,
            enrollment: s.enrollment || s.username || "N/A"
          }));
          setStudents(mappedStudents);
        }
      }
    } catch (e) { 
      console.error("Failed to load students:", e);
      Alert.alert("Error", "Failed to load student list.");
    } finally {
      setLoadingConfig(false);
    }
  };

  const loadTimetableAndAttendance = async () => {
    setLoading(true);
    try {
      // 1. Load Timetable
      const dateStr = format(selectedDate, "yyyy-MM-dd");
      const timeRes = await fetchWithCookie(`/api/attendance/timetable?date=${dateStr}`);
      
      let subjectsForDay: string[] = [];
      if (timeRes.ok) {
        const timeData = await timeRes.json();
        if (Array.isArray(timeData)) subjectsForDay = timeData;
        else if (timeData.success && Array.isArray(timeData.data)) subjectsForDay = timeData.data;
        else if (Array.isArray(timeData.data)) subjectsForDay = timeData.data;
      }
      setDailySubjects(subjectsForDay);
      
      if (subjectsForDay.length > 0) {
        if (!subjectsForDay.includes(activeSubject || '')) setActiveSubject(subjectsForDay[0]);
      } else {
        setActiveSubject(null);
      }

      // 2. Load Attendance
      const attRes = await fetchWithCookie(`/api/attendance/daily?date=${dateStr}`);
      if(attRes.ok) {
        const result = await attRes.json();
        if(result.success && result.data) {
            const loaded: AttendanceStatus = {};
            students.forEach((student) => loaded[student.id] = {});
            result.data.students.forEach((rec: any) => {
                const studentId = rec.studentId;
                if (!loaded[studentId]) loaded[studentId] = {};
                rec.subjects.forEach((sub: any) => loaded[studentId][sub.subjectName] = sub.status);
            });
            setAttendance(loaded);
        } else {
            setAttendance({});
        }
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const markAllPresent = () => {
      if(!activeSubject) return;
      setAttendance(prev => {
          const updated = { ...prev };
          students.forEach(student => {
              if(!updated[student.id]) updated[student.id] = {};
              updated[student.id][activeSubject] = 'present';
          });
          return updated;
      });
  };

  const saveAttendance = async () => {
      setIsSaving(true);
      try {
        const res = await fetchWithCookie("/api/attendance/save-day", {
            method: "POST",
            body: JSON.stringify({
                date: format(selectedDate, "yyyy-MM-dd"),
                attendance
            })
        });
        if(res.ok) Alert.alert("Success", "Attendance saved!");
        else Alert.alert("Error", "Failed to save.");
      } catch(e) {
          Alert.alert("Error", "Network error");
      }
      setIsSaving(false);
  };

  const nextDay = () => setSelectedDate(d => addDays(d, 1));
  const prevDay = () => setSelectedDate(d => subDays(d, 1));

  // Placeholder for file import (requires backend support + native setup)
  const handleImport = async () => {
      Alert.alert("Info", "Excel import is currently mobile-limited. Please use web version for bulk uploads.");
  };

  if (loadingConfig) {
      return (
          <View className="flex-1 items-center justify-center">
              <ActivityIndicator size="large" color="#fff" />
          </View>
      );
  }

  const stats = getAttendanceStats(students, attendance, activeSubject);

  return (
    <View className="flex-1 bg-white">
        {/* Header Branding */}
        <View className="flex-row items-center justify-between mb-4">
             <View className="flex-row items-center gap-3">
                 <View className="w-10 h-10 bg-orange-500 rounded-full items-center justify-center shadow-md shadow-orange-200">
                     <Text className="text-white font-black text-xs">SC</Text>
                 </View>
                 <View>
                     <Text className="text-xl font-black text-gray-900 leading-none">SmartCollege</Text>
                     <Text className="text-[10px] font-bold text-gray-400 tracking-widest uppercase mt-0.5">CR DASHBOARD</Text>
                 </View>
             </View>
             <View className="w-10 h-10 bg-orange-50 rounded-full items-center justify-center border border-orange-100">
                  <Text className="text-orange-500 font-bold">FA</Text>
             </View>
        </View>

        {/* Section Title & Date Controls */}
        <View className="mb-6">
            <Text className="text-3xl font-black text-gray-900 mb-4">E1 Section</Text>
            
            {/* Subject Chips */}
            <ScrollView horizontal showsHorizontalScrollIndicator={false} className="flex-row gap-3 mb-4 -mx-1 px-1">
                {dailySubjects.length === 0 ? (
                    <Text className="text-gray-400 italic">No classes today</Text>
                ) : dailySubjects.map(sub => {
                    const isActive = activeSubject === sub;
                    return (
                    <TouchableOpacity 
                        key={sub}
                        onPress={() => setActiveSubject(sub)}
                        className={`px-5 py-3 rounded-2xl border ${isActive ? 'bg-gray-900 border-gray-900' : 'bg-white border-gray-100 shadow-sm'}`}
                    >
                        <Text className={`font-bold ${isActive ? 'text-white' : 'text-gray-900'}`}>{sub}</Text>
                    </TouchableOpacity>
                )})}
            </ScrollView>

            {/* Date Navigator */}
            <View className="flex-row items-center justify-between bg-gray-50 p-2 rounded-2xl border border-gray-100">
                 <TouchableOpacity onPress={prevDay} className="w-10 h-10 bg-white rounded-xl items-center justify-center shadow-sm">
                     <ChevronLeft size={20} color="#000" />
                 </TouchableOpacity>
                 <View className="flex-1 items-center">
                     <Text className="text-lg font-black text-gray-900">{format(selectedDate, "MMM d")}</Text>
                     <Text className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{format(selectedDate, "EEEE")}</Text>
                 </View>
                 <TouchableOpacity onPress={nextDay} className="w-10 h-10 bg-white rounded-xl items-center justify-center shadow-sm">
                     <ChevronRight size={20} color="#000" />
                 </TouchableOpacity>
            </View>
        </View>

        {/* Action Bar & Stats */}
        {activeSubject && (
            <View className="mb-6">
                <View className="bg-blue-600 rounded-[28px] p-2 pr-3 flex-row items-center justify-between mb-4 shadow-lg shadow-blue-200">
                    <View className="flex-1 px-3">
                        <Text className="text-white font-black text-lg max-w-[150px]" numberOfLines={1}>{activeSubject}</Text>
                        <Text className="text-blue-200 text-[9px] font-bold uppercase tracking-wider">Attendance</Text>
                    </View>
                    <View className="flex-row gap-2">
                        <TouchableOpacity onPress={markAllPresent} className="bg-[#00c853] px-5 py-3 rounded-2xl">
                            <Text className="text-white font-bold text-xs">Present All</Text>
                        </TouchableOpacity>
                        <TouchableOpacity onPress={saveAttendance} className="bg-[#ff3d00] px-5 py-3 rounded-2xl flex-row items-center gap-2">
                             {isSaving ? <ActivityIndicator color="#fff" size="small" /> : (
                                <>
                                <Save size={16} color="#fff" />
                                <Text className="text-white font-bold text-xs">Save</Text>
                                </>
                             )}
                        </TouchableOpacity>
                    </View>
                </View>
                
                {/* Stats Pill */}
                <View className="flex-row gap-3">
                    <View className="flex-1 bg-green-50 p-3 rounded-xl border border-green-100 flex-row items-center justify-center gap-2">
                        <View className="w-2 h-2 rounded-full bg-green-500" />
                        <Text className="font-bold text-green-700">{stats.present} Present ({stats.percentage}%)</Text>
                    </View>
                    <View className="flex-1 bg-red-50 p-3 rounded-xl border border-red-100 flex-row items-center justify-center gap-2">
                         <View className="w-2 h-2 rounded-full bg-red-500" />
                        <Text className="font-bold text-red-700">{stats.absent} Absent</Text>
                    </View>
                </View>
            </View>
        )}

        {/* Student List */}
        {loading ? (
            <View className="flex-1 items-center justify-center mt-10">
                <ActivityIndicator size="large" color="#ea580c" />
            </View>
        ) : (
            <FlatList
                data={students}
                keyExtractor={item => item.id}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{ paddingBottom: 100 }}
                renderItem={({ item, index }) => {
                    const status = attendance[item.id]?.[activeSubject || ''];
                    
                    return (
                        <View className="flex-row items-center justify-between mb-4">
                            <View className="flex-row items-center gap-3 flex-1">
                                <View className={`w-12 h-12 rounded-full items-center justify-center ${index % 2 === 0 ? 'bg-orange-100' : 'bg-blue-100'}`}>
                                     <Text className={`font-bold text-lg ${index % 2 === 0 ? 'text-orange-600' : 'text-blue-600'}`}>
                                         {item.name.charAt(0)}
                                     </Text>
                                </View>
                                <View className="flex-1">
                                    <Text className="font-bold text-gray-900 text-base" numberOfLines={1}>{item.name}</Text>
                                    <Text className="text-gray-400 text-xs font-medium">{item.enrollment}</Text>
                                </View>
                            </View>

                            {activeSubject && (
                                <View className="flex-row gap-3">
                                    <TouchableOpacity 
                                        onPress={() => {
                                            if(!activeSubject) return;
                                            setAttendance(prev => ({
                                                ...prev,
                                                [item.id]: { ...prev[item.id], [activeSubject]: "present" }
                                            }))
                                        }}
                                        className={`w-10 h-10 rounded-full items-center justify-center border-2 transition-all ${status === 'present' ? 'bg-green-500 border-green-500 shadow-md shadow-green-200' : 'bg-white border-green-100'}`}
                                    >
                                        <Check size={18} color={status === 'present' ? '#fff' : '#22c55e'} strokeWidth={3} />
                                    </TouchableOpacity>

                                    <TouchableOpacity 
                                        onPress={() => {
                                            if(!activeSubject) return;
                                            setAttendance(prev => ({
                                                ...prev,
                                                [item.id]: { ...prev[item.id], [activeSubject]: "absent" }
                                            }))
                                        }}
                                        className={`w-10 h-10 rounded-full items-center justify-center border-2 transition-all ${status === 'absent' ? 'bg-red-500 border-red-500 shadow-md shadow-red-200' : 'bg-white border-red-100'}`}
                                    >
                                        <X size={18} color={status === 'absent' ? '#fff' : '#ef4444'} strokeWidth={3} />
                                    </TouchableOpacity>
                                </View>
                            )}
                        </View>
                    );
                }}
            />
        )}
    </View>
  );
}
