import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar, BookOpen, Presentation, Award } from "lucide-react";

interface PerformanceBoxProps {
  type: "attendance" | "assignments" | "presentations" | "overall";
  title: string;
  data: {
    percentage?: number;
    completion?: number;
    score?: number;
    pending?: any[];
    upcoming?: any[];
    total?: number;
    submitted?: number;
    completed?: number;
  };
  alertThreshold?: number;
  onClick?: () => void;
  compact?: boolean;
}

const getIconForType = (type: string) => {
  switch (type) {
    case "attendance":
      return <Calendar className="h-5 w-5 text-blue-500" />;
    case "assignments":
      return <BookOpen className="h-5 w-5 text-green-500" />;
    case "presentations":
      return <Presentation className="h-5 w-5 text-purple-500" />;
    case "overall":
      return <Award className="h-5 w-5 text-orange-500" />;
    default:
      return <Award className="h-5 w-5" />;
  }
};

const getStatusColor = (value: number, threshold: number = 70) => {
  if (value >= 85) return "text-green-600";
  if (value >= threshold) return "text-blue-600";
  if (value >= 50) return "text-orange-600";
  return "text-red-600";
};

const PerformanceBox: React.FC<PerformanceBoxProps> = ({
  type,
  title,
  data,
  alertThreshold = 70,
  onClick,
  compact = false,
}) => {
  const primaryValue = data.percentage || data.completion || data.score || 0;
  const isLowPerformance = primaryValue < alertThreshold;

  const renderValue = () => {
    switch (type) {
      case "attendance":
        return `${primaryValue.toFixed(0)}%`;
      case "assignments":
        return `${primaryValue.toFixed(0)}%`;
      case "presentations":
        return `${primaryValue.toFixed(0)}%`;
      case "overall":
        return primaryValue.toFixed(0);
      default:
        return primaryValue.toFixed(0);
    }
  };

  const getSecondaryInfo = () => {
    switch (type) {
      case "assignments":
        if (data.total !== undefined && data.submitted !== undefined) {
          return `${data.submitted}/${data.total}`;
        }
        return data.pending?.length || 0;
      case "presentations":
        if (data.total !== undefined && data.completed !== undefined) {
          return `${data.completed}/${data.total}`;
        }
        // Show both pending and upcoming presentations
        const pendingCount = (data as any).pending?.length || 0;
        const upcomingCount = data.upcoming?.length || 0;
        return pendingCount + upcomingCount;
      default:
        return null;
    }
  };

  const getSecondaryLabel = () => {
    switch (type) {
      case "assignments":
        if (data.total !== undefined && data.submitted !== undefined) {
          return "completed";
        }
        return "pending";
      case "presentations":
        if (data.total !== undefined && data.completed !== undefined) {
          return "completed";
        }
        // Show label for total pending + upcoming
        const pendingCount = (data as any).pending?.length || 0;
        const upcomingCount = data.upcoming?.length || 0;
        const total = pendingCount + upcomingCount;
        if (total === 0) return "none";
        return total === 1 ? "to do" : "to do";
      default:
        return "";
    }
  };

  return (
    <Card
      className={`hover:shadow-md transition-shadow ${
        onClick
          ? "cursor-pointer hover:shadow-lg hover:scale-105 transform transition-all duration-200"
          : ""
      }`}
      onClick={onClick}
    >
      <CardHeader className={`flex flex-row items-center justify-between space-y-0 ${compact ? 'pb-1 p-3' : 'pb-2'}`}>
        <CardTitle className={`${compact ? 'text-[11px]' : 'text-sm'} font-medium text-gray-600 truncate mr-1`}>
          {title}
        </CardTitle>
        <div className="flex items-center space-x-1.5">
          {getIconForType(type)}
          {onClick && (
            <span className="text-[10px] text-gray-400">View</span>
          )}
        </div>
      </CardHeader>
      <CardContent className={compact ? 'p-3 pt-0' : ''}>
        <div className={`flex items-center ${compact ? 'justify-center' : 'justify-between'}`}>
          <div className="flex items-baseline space-x-2">
            <span
              className={`${compact ? 'text-2xl' : 'text-3xl'} font-bold ${getStatusColor(
                primaryValue,
                alertThreshold
              )}`}
            >
              {renderValue()}
            </span>
          </div>

          {!compact && getSecondaryInfo() !== null && (
            <Badge
              variant={
                typeof getSecondaryInfo() === "number" &&
                (getSecondaryInfo() as number) > 0
                  ? "destructive"
                  : "secondary"
              }
              className="text-xs"
            >
              {getSecondaryInfo()} {getSecondaryLabel()}
            </Badge>
          )}
        </div>

        {isLowPerformance && (
          <div className={`mt-2 text-xs text-red-600 ${compact ? 'text-center' : ''}`}>Needs improvement</div>
        )}
      </CardContent>
    </Card>
  );
};

export default PerformanceBox;
