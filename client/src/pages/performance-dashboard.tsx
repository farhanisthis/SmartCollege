import React from "react";
import { useAuth } from "@/hooks/use-auth";
import StudentDashboard from "./student-dashboard";
import CRDashboard from "./cr-dashboard";

const PerformanceDashboard: React.FC = () => {
  const { user } = useAuth();

  // Show CR dashboard for Class Representatives, student dashboard for students
  if (user?.role === "cr") {
    return <CRDashboard />;
  }

  return <StudentDashboard />;
};

export default PerformanceDashboard;
