import { View, Text, ScrollView, ActivityIndicator, Dimensions, TouchableOpacity, Alert, Modal } from "react-native";
import { useQuery } from "@tanstack/react-query";
import { Stack, useRouter } from "expo-router";
import { LineChart, BarChart } from "react-native-chart-kit";
import { fetchWithCookie } from "../../src/lib/api";
import AttendanceTracker from "../../components/AttendanceTracker";
import AttendanceManager from "../../components/AttendanceManager";
import StudentAttendanceTracker from "../../components/StudentAttendanceTracker";
import PerformanceCard from "../../components/PerformanceCard";
import { useAuth } from "../../src/lib/auth";
import { useState } from "react";
import { Sparkles, X } from "lucide-react-native";

import { useColorScheme } from "nativewind";
import { Calendar, BookOpen, Presentation as PresentationIcon, Award, Search, CheckCircle2, LayoutDashboard, ChevronRight } from "lucide-react-native";

// Color palette from screenshot
const COLORS = {
  attendance: "#00c853",
  assignments: "#2979ff",
  presentations: "#6200ea",
  score: "#fb8c00",
  bgGrid: {
    assignments: "#e8f5e9", // light green
    presentations: "#f3e5f5", // light purple
    attendance: "#e3f2fd",    // light blue
    score: "#fff3e0"          // light orange
  }
};

export default function PerformanceScreen() {
    const { user } = useAuth();
    const router = useRouter();
    const { colorScheme } = useColorScheme();
    const [viewMode, setViewMode] = useState<'student' | 'cr'>('student');
    
    // AI State
    const [aiLoading, setAiLoading] = useState(false);
    const [aiInsight, setAiInsight] = useState<string | null>(null);

    const { data: stats, isLoading } = useQuery({
        queryKey: ["api", "performance", "dashboard"],
        queryFn: async () => {
             const res = await fetchWithCookie("/api/performance/dashboard");
             if (!res.ok) throw new Error("Failed");
             return res.json();
        },
        enabled: viewMode === 'student'
    });

    const handleAskAI = async () => {
        setAiLoading(true);
        try {
            console.log("[AI] Requesting insight...");
            const res = await fetchWithCookie("/api/ai/performance-insight", {
                method: "POST",
                body: JSON.stringify({ 
                    stats,
                    userClass: user?.class,
                    role: user?.role
                })
            });
            console.log(`[AI] Response Status: ${res.status}`);

            if (res.status === 401) {
                Alert.alert("Session Expired", "Please logout and login again.");
                setAiLoading(false);
                return;
            }

            if (!res.ok) {
                const text = await res.text();
                // Try to parse JSON error
                try {
                    const json = JSON.parse(text);
                    Alert.alert("AI Error", json.message || "Unknown error");
                } catch {
                    Alert.alert("Server Error", `Status: ${res.status}\n${text.slice(0, 50)}`);
                }
                setAiLoading(false);
                return;
            }
            
            const data = await res.json();
            console.log("[AI] Response Data:", data);

            if (data.insight) {
                setAiInsight(data.insight);
            } else {
                Alert.alert("AI Error", data.message || "No insight generated");
            }
        } catch (e: any) {
            console.error("[AI] Error:", e);
            Alert.alert("Connection Error", e.message || "Failed to connect");
        } finally {
            setAiLoading(false);
        }
    };

    const screenWidth = Dimensions.get("window").width;
    const isCR = user?.role === 'cr';
    
    // Chart Colors
    const chartBg = colorScheme === 'dark' ? "#0a0a0a" : "#ffffff";
    const labelColor = (opacity = 1) => colorScheme === 'dark' 
        ? `rgba(163, 163, 163, ${opacity})` 
        : `rgba(82, 82, 82, ${opacity})`;


    const [selectedMetric, setSelectedMetric] = useState<{ title: string; details: any[] } | null>(null);

    const handleChartClick = (data: any) => {
        // Mock drill down logic for chart points
        const month = ["Jan", "Feb", "Mar", "Apr", "May", "Jun"][data.index];
        const detail = {
            title: `${month} Performance`,
            details: [
                { label: "Attendance Score", value: `${data.value}%` },
                { label: "Classes Attended", value: "18/20" },
                { label: "Assignments", value: "All Submitted" }
            ]
        };
        setSelectedMetric(detail);
    };

    const handleCardClick = (type: string, value: any) => {
        let details = [];
        let title = "";

        switch(type) {
            case 'assignments':
                title = "Assignment Details";
                details = [
                    { label: "Data Structures", value: "Completed (10/10)" },
                    { label: "Algorithms", value: "Pending" },
                    { label: "Database", value: "Completed (9/10)" }
                ];
                break;
            case 'presentations':
                title = "Presentation History";
                details = [
                    { label: "Project Alpha", value: "Done (A+)" },
                    { label: "Research Paper", value: "Scheduled" }
                ];
                break;
            default:
                title = "Metric Details";
                details = [{ label: "Current Value", value: value }];
        }
        setSelectedMetric({ title, details });
    };

    return (
        <View className="flex-1 bg-background px-6">
             <Stack.Screen options={{ 
                headerShown: false
             }} />

             {/* Custom Header */}
             <View className="flex-row items-center justify-between py-6">
                 <View>
                     <View className="flex-row items-center gap-2">
                         <View className="w-8 h-8 bg-blue-600 rounded-full items-center justify-center">
                             <Text className="text-white font-bold">SC</Text>
                         </View>
                         <Text className="text-blue-600 font-bold tracking-widest text-xs uppercase">Smart College</Text>
                     </View>
                     <Text className="text-3xl font-black text-foreground mt-1">Performance</Text>
                     <Text className="text-muted-foreground font-medium text-xs">Semester 5 • Computer Science</Text>
                 </View>
                 <View className="w-10 h-10 rounded-full border border-blue-600/20 items-center justify-center">
                      <Text className="text-blue-600 font-bold">FA</Text>
                 </View>
             </View>

             {/* Tab Switcher (Visual) */}
             <View className="flex-row mb-6 gap-6 border-b border-gray-100 pb-1">
                 <TouchableOpacity onPress={() => router.push("/")}>
                     <Text className="text-muted-foreground font-bold tracking-widest uppercase text-xs pb-2">UPDATES</Text>
                 </TouchableOpacity>
                 <View className="border-b-2 border-blue-600 pb-2">
                     <Text className="text-blue-600 font-black tracking-widest uppercase text-xs">PERFORMANCE</Text>
                 </View>
             </View>

             <View className="flex-row bg-secondary/30 p-1.5 rounded-2xl mb-6 hidden"> 
                 {/* Old Tab Switcher hidden, kept structure just in case logic relies on viewMode, actually I can just remove it or keep the logic 
                     Wait, viewMode 'cr' vs 'student' is internal state for this screen. 
                     The top tabs are for navigation between screens. 
                     The 'Updates | Performance' in the new design likely refers to the main screens.
                     So this internal switcher might be redundant or valid for CR. 
                     If CR, maybe they want to see "My Performance" vs "Class Attendance".
                     Let's keep the internal switcher but style it better if needed, or maybe the user wants the internal one to look like the image?
                     The image shows "UPDATES   PERFORMANCE" at the top.
                     So I should probably replace the internal switcher with something else if it conflicts, but the code handles user role.
                     Let's keep the internal switcher for function but maybe move it down or rename. 
                     Actually, for CR, the "Performance" screen IS the "Attendance Manager".
                     So viewMode 'cr' should be the default if role is CR?
                     Let's leave internal logic as is for now, just fix the top nav.
                  */}
                 <TouchableOpacity 
                    className={`flex-1 py-3 rounded-xl items-center ${viewMode === 'cr' ? 'bg-white shadow-sm' : ''}`}
                    onPress={() => setViewMode('cr')}
                 >
                     <Text className={`font-bold ${viewMode === 'cr' ? 'text-foreground' : 'text-muted-foreground'}`}>Manage Attendance</Text>
                 </TouchableOpacity>
                 <TouchableOpacity 
                    className={`flex-1 py-3 rounded-xl items-center ${viewMode === 'student' ? 'bg-white shadow-sm' : ''}`}
                    onPress={() => setViewMode('student')}
                 >
                     <Text className={`font-bold ${viewMode === 'student' ? 'text-foreground' : 'text-muted-foreground'}`}>My Statistics</Text>
                 </TouchableOpacity>
             </View>

             {/* Metric Details Modal */}
            <Modal
                animationType="slide"
                transparent={true}
                visible={!!selectedMetric}
                onRequestClose={() => setSelectedMetric(null)}
            >
                <View className="flex-1 justify-end">
                    <TouchableOpacity 
                        className="flex-1 bg-black/50" 
                        activeOpacity={1} 
                        onPress={() => setSelectedMetric(null)}
                    />
                    <View className="bg-card w-full p-6 rounded-t-3xl border-t border-border shadow-2xl">
                        <View className="w-12 h-1.5 bg-muted rounded-full self-center mb-6" />
                        <View className="flex-row justify-between items-center mb-6">
                            <Text className="text-2xl font-bold text-foreground">{selectedMetric?.title}</Text>
                            <TouchableOpacity onPress={() => setSelectedMetric(null)}>
                                <View className="bg-secondary p-2 rounded-full">
                                    <X size={20} className="text-foreground" />
                                </View>
                            </TouchableOpacity>
                        </View>
                        
                        <ScrollView className="mb-6 max-h-96">
                            {selectedMetric?.details.map((item, i) => (
                                <View key={i} className="flex-row justify-between items-center py-4 border-b border-border">
                                    <Text className="text-muted-foreground text-base font-medium">{item.label}</Text>
                                    <Text className="text-foreground text-lg font-bold">{item.value}</Text>
                                </View>
                            ))}
                        </ScrollView>
                        
                        <TouchableOpacity 
                            className="bg-primary py-4 rounded-xl items-center"
                            onPress={() => setSelectedMetric(null)}
                        >
                            <Text className="text-primary-foreground font-bold text-lg">Close</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>

             {/* AI Insight Modal */}
             <Modal
                animationType="fade"
                transparent={true}
                visible={!!aiInsight}
                onRequestClose={() => setAiInsight(null)}
             >
                <View className="flex-1 justify-center items-center bg-black/50 p-4">
                    <View className="bg-card w-full p-6 rounded-2xl border border-primary/20 shadow-lg">
                        <View className="flex-row justify-between items-center mb-4">
                             <View className="flex-row items-center">
                                 <Sparkles size={24} color="#a855f7" />
                                 <Text className="text-xl font-bold text-foreground ml-2">AI Coach Says</Text>
                             </View>
                             <TouchableOpacity onPress={() => setAiInsight(null)}>
                                 <X size={24} className="text-muted-foreground" />
                             </TouchableOpacity>
                        </View>
                        <Text className="text-foreground text-base leading-6">{aiInsight}</Text>
                        <TouchableOpacity 
                            className="mt-6 bg-primary py-3 rounded-lg items-center"
                            onPress={() => setAiInsight(null)}
                        >
                            <Text className="text-primary-foreground font-bold">Got it!</Text>
                        </TouchableOpacity>
                    </View>
                </View>
             </Modal>


             
             {viewMode === 'cr' ? (
                 <AttendanceManager />
             ) : (
                <View className="flex-1">
                    <StudentAttendanceTracker />
                </View>
             )}
        </View>
    );
}
