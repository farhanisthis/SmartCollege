import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import AttendanceManager from "@/components/attendance/attendance-manager";
import TimetableDisplay from "@/components/timetable/timetable-display";
import { UserCheck, CalendarDays, AlertCircle } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";

const CRDashboard: React.FC = () => {
  const [activeTab, setActiveTab] = useState<"new-attendance" | "timetable">(
    "new-attendance"
  );
  const { user } = useAuth();

  if (user?.role !== "cr") {
    return (
      <div className="text-center p-8">
        <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">
          Access Denied
        </h3>
        <p className="text-gray-600">
          This dashboard is only available for Class Representatives.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">CR Dashboard</h1>
        <p className="text-gray-600">
          Manage class attendance, assignments, and performance
        </p>
      </div>

      {/* Tabs */}
      <div className="flex space-x-1 bg-gray-100 p-1 rounded-lg w-fit overflow-x-auto">
        <button
          onClick={() => setActiveTab("new-attendance")}
          className={`px-4 py-2 rounded-md text-sm font-medium transition-colors whitespace-nowrap ${
            activeTab === "new-attendance"
              ? "bg-white text-blue-600 shadow-sm"
              : "text-gray-600 hover:text-gray-900"
          }`}
        >
          <UserCheck className="h-4 w-4 inline mr-2" />
          Attendance Manager
        </button>
        <button
          onClick={() => setActiveTab("timetable")}
          className={`px-4 py-2 rounded-md text-sm font-medium transition-colors whitespace-nowrap ${
            activeTab === "timetable"
              ? "bg-white text-blue-600 shadow-sm"
              : "text-gray-600 hover:text-gray-900"
          }`}
        >
          <CalendarDays className="h-4 w-4 inline mr-2" />
          Timetable
        </button>
      </div>

      {activeTab === "new-attendance" && (
        <div className="space-y-6">
          <AttendanceManager />
        </div>
      )}

      {activeTab === "timetable" && (
        <div className="space-y-6">
          <TimetableDisplay />
        </div>
      )}
    </div>
  );
};

export default CRDashboard;
