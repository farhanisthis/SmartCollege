import React from "react";
import { View, Text, TouchableOpacity } from "react-native";
import { Calendar, BookOpen, Presentation, Award, TrendingUp, AlertCircle } from "lucide-react-native";

interface PerformanceCardProps {
  type: "attendance" | "assignments" | "presentations" | "overall";
  title: string;
  value: number;
  total?: number;
  completed?: number;
  suffix?: string;
  onClick?: () => void;
}

const getIconForType = (type: string) => {
  switch (type) {
    case "attendance":
      return <Calendar size={20} color="#3b82f6" />; // blue-500
    case "assignments":
      return <BookOpen size={20} color="#22c55e" />; // green-500
    case "presentations":
      return <Presentation size={20} color="#a855f7" />; // purple-500
    case "overall":
      return <Award size={20} color="#f97316" />; // orange-500
    default:
      return <Award size={20} color="#a3a3a3" />;
  }
};

const getStatusColor = (value: number, threshold: number = 70) => {
  if (value >= 85) return "text-green-500";
  if (value >= threshold) return "text-blue-500";
  if (value >= 50) return "text-orange-500";
  return "text-red-500";
};

export default function PerformanceCard({
  type,
  title,
  value,
  total,
  completed,
  suffix = "%",
  onClick,
}: PerformanceCardProps) {
  
  const isLowPerformance = value < 70;
  const statusColor = getStatusColor(value);

  // Badge logic
  let badgeText = "";
  let badgeColor = "bg-secondary";
  let badgeTextColor = "text-muted-foreground";

  if (completed !== undefined && total !== undefined) {
      badgeText = `${completed}/${total}`;
      if (completed < total) {
          badgeColor = "bg-destructive/10";
          badgeTextColor = "text-destructive";
      }
  }

  return (
    <TouchableOpacity 
        onPress={onClick}
        disabled={!onClick}
        className={`bg-card p-4 rounded-xl border border-border flex-1 ${onClick ? 'active:opacity-70' : ''}`}
    >
      <View className="flex-row items-center justify-between mb-2">
        <Text className="text-muted-foreground text-xs font-medium uppercase tracking-wider">{title}</Text>
        {getIconForType(type)}
      </View>
      
      <View className="flex-row items-end justify-between">
          <Text className={`text-3xl font-bold ${statusColor}`}>
            {value.toFixed(0)}<Text className="text-base font-normal text-muted-foreground">{suffix}</Text>
          </Text>
          
          {badgeText ? (
              <View className={`${badgeColor} px-2 py-1 rounded-md`}>
                  <Text className={`${badgeTextColor} text-xs font-bold`}>{badgeText}</Text>
              </View>
          ) : null}
      </View>

      {isLowPerformance && (
          <View className="mt-2 flex-row items-center">
              <AlertCircle size={10} color="#ef4444" />
              <Text className="text-destructive text-[10px] ml-1">Needs work</Text>
          </View>
      )}
    </TouchableOpacity>
  );
}
