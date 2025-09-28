import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";

import { Progress } from "@/components/ui/progress";
import PerformanceBox from "@/components/performance/performance-box";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import StudentAttendanceTracker from "@/components/attendance/student-attendance-tracker";
import {
  AlertCircle,
  CheckCircle,
  Clock,
  BookOpen,
  BarChart3,
  Target,
  TrendingUp,
  Calendar,
  FileText,
  ChevronRight,
} from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  BarChart,
  Bar,
} from "recharts";

interface DashboardData {
  attendance: {
    recent: Array<{
      date: string;
      status: "present" | "absent" | "late";
      subject?: string;
    }>;
    percentage: number;
  };
  assignments: {
    pending: Array<{
      _id: string;
      title: string;
      subject?: string;
      dueDate?: string;
      category: string;
      isUrgent: boolean;
    }>;
    completion: number;
    total: number;
    submitted: number;
  };
  presentations: {
    pending: Array<{
      _id: string;
      title: string;
      subject?: string;
      category: string;
      isUrgent?: boolean;
      deadlineDate?: string;
    }>;
    upcoming: Array<{
      _id: string;
      scheduledDate: string;
      updateId: string;
      status: string;
      title?: string;
    }>;
    completion: number;
    total: number;
    completed: number;
  };
  overall: {
    score: number;
    trend: "up" | "down" | "stable";
    streak?: number;
  };
  monthlyProgress?: Array<{
    month: string;
    assignments: number;
    presentations: number;
    attendance: number;
  }>;
  subjectPerformance?: Array<{
    subject: string;
    score: number;
    total: number;
    completed: number;
    assignments: number;
    presentations: number;
  }>;
}

interface SubmissionModalProps {
  item: any;
  type: "assignment" | "presentation";
  isOpen: boolean;
  onClose: () => void;
  onSubmit: () => void;
}

const SubmissionModal: React.FC<SubmissionModalProps> = ({
  item,
  type,
  isOpen,
  onClose,
  onSubmit,
}) => {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      let endpoint, method;

      if (type === "assignment") {
        endpoint = `/api/performance/assignments/${item._id}/submit`;
        method = "POST";
      } else {
        // For presentations, check if it's a pending presentation (updateId) or scheduled presentation (presentationId)
        if (item.category === "presentations") {
          // Pending presentation - use submit endpoint with updateId
          endpoint = `/api/performance/presentations/${item._id}/submit`;
          method = "POST";
        } else {
          // Scheduled presentation - use complete endpoint with presentationId
          endpoint = `/api/performance/presentations/${item._id}/complete`;
          method = "PUT";
        }
      }

      const response = await fetch(endpoint, {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        ...(type === "presentation" &&
          method === "PUT" && {
            body: JSON.stringify({ status: "completed" }),
          }),
        credentials: "include",
      });

      if (response.ok) {
        onSubmit();
        onClose();
      } else {
        const error = await response.json();
        alert(error.error || `Failed to submit ${type}`);
      }
    } catch (error) {
      console.error(`Error submitting ${type}:`, error);
      alert(`Failed to submit ${type}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const getTitle = () => {
    return type === "assignment"
      ? "Submit Assignment"
      : "Mark Presentation Complete";
  };

  const getDescription = () => {
    return type === "assignment"
      ? "Are you sure you want to mark this assignment as submitted?"
      : "Are you sure you want to mark this presentation as completed?";
  };

  const getButtonText = () => {
    if (isSubmitting) {
      return type === "assignment" ? "Submitting..." : "Marking Complete...";
    }
    return type === "assignment" ? "Mark as Submitted" : "Mark as Completed";
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{getTitle()}</DialogTitle>
          <DialogDescription>{getDescription()}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <h4 className="font-medium">{item.title}</h4>
            {item.subject && (
              <p className="text-sm text-gray-600">{item.subject}</p>
            )}
            {(item.dueDate || item.scheduledDate) && (
              <p className="text-sm text-gray-500">
                {type === "assignment" ? "Due" : "Scheduled"}:{" "}
                {new Date(
                  item.dueDate || item.scheduledDate
                ).toLocaleDateString()}
              </p>
            )}
          </div>

          <div className="flex justify-end space-x-2">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="bg-green-600 hover:bg-green-700"
            >
              {getButtonText()}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

const StudentDashboard: React.FC = () => {
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(
    null
  );
  const [loading, setLoading] = useState(true);
  const [selectedAssignment, setSelectedAssignment] = useState<any>(null);
  const [selectedPresentation, setSelectedPresentation] = useState<any>(null);
  const [isSubmissionModalOpen, setIsSubmissionModalOpen] = useState(false);
  const [isPresentationModalOpen, setIsPresentationModalOpen] = useState(false);
  const [activeDetailView, setActiveDetailView] = useState<
    "assignments" | "presentations" | "progress" | null
  >(null);
  const [isAttendanceDialogOpen, setIsAttendanceDialogOpen] = useState(false);
  const { user } = useAuth();

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/performance/dashboard`);

      if (response.ok) {
        const data = await response.json();
        setDashboardData(data);
      } else {
        console.error("Failed to fetch dashboard data");
      }
    } catch (error) {
      console.error("Error fetching dashboard data:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const handleAssignmentSubmit = () => {
    fetchDashboardData(); // Refresh data after submission
  };

  const handlePresentationSubmit = () => {
    fetchDashboardData(); // Refresh data after presentation completion
  };

  const openSubmissionModal = (assignment: any) => {
    setSelectedAssignment(assignment);
    setIsSubmissionModalOpen(true);
  };

  const openPresentationModal = (presentation: any) => {
    setSelectedPresentation(presentation);
    setIsPresentationModalOpen(true);
  };

  const getUrgentAssignments = () => {
    if (!dashboardData?.assignments.pending) return [];
    return dashboardData.assignments.pending.filter(
      (a) =>
        a.isUrgent ||
        (a.dueDate &&
          new Date(a.dueDate) <= new Date(Date.now() + 3 * 24 * 60 * 60 * 1000))
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-2 text-gray-600">Loading performance data...</p>
        </div>
      </div>
    );
  }

  if (!dashboardData) {
    return (
      <div className="text-center p-8">
        <AlertCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">
          No Data Available
        </h3>
        <p className="text-gray-600">
          Unable to load performance data at this time.
        </p>
      </div>
    );
  }

  const urgentAssignments = getUrgentAssignments();

  // Prepare chart data
  const pieData = [
    {
      name: "Completed",
      value: dashboardData.assignments.submitted,
      color: "#10b981",
    },
    {
      name: "Pending",
      value: dashboardData.assignments.pending.length,
      color: "#f59e0b",
    },
  ];

  const presentationPieData = [
    {
      name: "Completed",
      value: dashboardData.presentations.completed,
      color: "#8b5cf6",
    },
    {
      name: "Pending",
      value: dashboardData.presentations.pending?.length || 0,
      color: "#f59e0b",
    },
  ];

  // Use dynamic data from API response
  const monthlyProgress = dashboardData?.monthlyProgress || [];
  const subjectPerformance = dashboardData?.subjectPerformance || [];

  // If a detailed view is active, show it instead of the main dashboard
  if (activeDetailView === "assignments") {
    return (
      <div className="space-y-6">
        {/* Header with Back Button */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Button
              variant="outline"
              onClick={() => setActiveDetailView(null)}
              className="flex items-center space-x-2"
            >
              <ChevronRight className="h-4 w-4 rotate-180" />
              <span>Back to Dashboard</span>
            </Button>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                Assignments Details
              </h1>
              <p className="text-gray-600">
                Complete overview of all your assignments
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <BookOpen className="h-5 w-5" />
                    <span>All Assignments</span>
                  </div>
                  <div className="text-right">
                    <div className="text-sm text-gray-600">
                      {dashboardData.assignments.submitted} of{" "}
                      {dashboardData.assignments.total} completed
                    </div>
                    <Progress
                      value={
                        (dashboardData.assignments.submitted /
                          dashboardData.assignments.total) *
                        100
                      }
                      className="w-32 mt-1"
                    />
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {dashboardData.assignments.pending.length === 0 ? (
                  <div className="text-center py-12">
                    <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
                    <h3 className="text-lg font-medium mb-2">
                      All Assignments Completed!
                    </h3>
                    <p className="text-gray-600">
                      Great job! You're up to date with all assignments.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {dashboardData.assignments.pending.map((assignment) => (
                      <div
                        key={assignment._id}
                        className="p-4 border rounded-lg hover:shadow-md transition-shadow"
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center space-x-3 mb-2">
                              <h3 className="font-medium text-lg">
                                {assignment.title}
                              </h3>
                              {assignment.isUrgent && (
                                <Badge variant="destructive">Urgent</Badge>
                              )}
                              <Badge variant="outline">
                                {assignment.category}
                              </Badge>
                            </div>
                            {assignment.subject && (
                              <div className="flex items-center space-x-2 mb-2">
                                <Target className="h-4 w-4 text-gray-400" />
                                <span className="text-sm font-medium text-gray-600">
                                  {assignment.subject}
                                </span>
                              </div>
                            )}
                            {assignment.dueDate && (
                              <div className="flex items-center space-x-2 text-sm text-gray-500">
                                <Calendar className="h-4 w-4" />
                                <span>
                                  Due{" "}
                                  {new Date(
                                    assignment.dueDate
                                  ).toLocaleDateString()}
                                </span>
                                <span className="text-xs">
                                  (
                                  {Math.ceil(
                                    (new Date(assignment.dueDate).getTime() -
                                      Date.now()) /
                                      (1000 * 60 * 60 * 24)
                                  )}{" "}
                                  days left)
                                </span>
                              </div>
                            )}
                          </div>
                          <Button
                            onClick={() => openSubmissionModal(assignment)}
                            className="bg-green-600 hover:bg-green-700"
                          >
                            Mark as Complete
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          <div className="space-y-6">
            {/* Assignment Progress Chart */}
            <Card>
              <CardHeader>
                <CardTitle>Assignment Progress</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie
                      dataKey="value"
                      data={pieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={40}
                      outerRadius={80}
                      paddingAngle={5}
                    >
                      {pieData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
                <div className="flex justify-center space-x-4 mt-4">
                  <div className="flex items-center space-x-1">
                    <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                    <span className="text-sm">
                      Completed ({dashboardData.assignments.submitted})
                    </span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                    <span className="text-sm">
                      Pending ({dashboardData.assignments.pending.length})
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Assignment Summary */}
            <Card>
              <CardHeader>
                <CardTitle>Summary Statistics</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between">
                  <span className="text-gray-600">Total Assignments</span>
                  <span className="font-medium">
                    {dashboardData.assignments.total}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Completed</span>
                  <span className="font-medium text-green-600">
                    {dashboardData.assignments.submitted}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Pending</span>
                  <span className="font-medium text-yellow-600">
                    {dashboardData.assignments.pending.length}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Success Rate</span>
                  <span className="font-medium text-blue-600">
                    {Math.round(dashboardData.assignments.completion)}%
                  </span>
                </div>
                <div className="flex justify-between border-t pt-2">
                  <span className="font-medium">Overall Progress</span>
                  <span className="font-bold text-lg">
                    {Math.round(
                      (dashboardData.assignments.submitted /
                        dashboardData.assignments.total) *
                        100
                    )}
                    %
                  </span>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Submission Modals */}
        {selectedAssignment && (
          <SubmissionModal
            item={selectedAssignment}
            type="assignment"
            isOpen={isSubmissionModalOpen}
            onClose={() => setIsSubmissionModalOpen(false)}
            onSubmit={handleAssignmentSubmit}
          />
        )}

        {selectedPresentation && (
          <SubmissionModal
            item={selectedPresentation}
            type="presentation"
            isOpen={isPresentationModalOpen}
            onClose={() => setIsPresentationModalOpen(false)}
            onSubmit={handlePresentationSubmit}
          />
        )}
      </div>
    );
  }

  if (activeDetailView === "presentations") {
    return (
      <div className="space-y-6">
        {/* Header with Back Button */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Button
              variant="outline"
              onClick={() => setActiveDetailView(null)}
              className="flex items-center space-x-2"
            >
              <ChevronRight className="h-4 w-4 rotate-180" />
              <span>Back to Dashboard</span>
            </Button>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                Presentations Details
              </h1>
              <p className="text-gray-600">
                Complete overview of all your presentations
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <FileText className="h-5 w-5" />
                    <span>All Presentations</span>
                  </div>
                  <div className="text-right">
                    <div className="text-sm text-gray-600">
                      {dashboardData.presentations.completed} of{" "}
                      {dashboardData.presentations.total} completed
                    </div>
                    <Progress
                      value={
                        (dashboardData.presentations.completed /
                          dashboardData.presentations.total) *
                        100
                      }
                      className="w-32 mt-1"
                    />
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {/* Pending Presentations */}
                  {dashboardData.presentations.pending?.map((presentation) => (
                    <div
                      key={presentation._id}
                      className="p-4 border border-orange-200 bg-orange-50 rounded-lg"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center space-x-3 mb-2">
                            <h3 className="font-medium text-lg">
                              {presentation.title}
                            </h3>
                            <Badge
                              variant="outline"
                              className="bg-orange-100 text-orange-800"
                            >
                              Pending
                            </Badge>
                            {presentation.isUrgent && (
                              <Badge variant="destructive">Urgent</Badge>
                            )}
                          </div>
                          {presentation.subject && (
                            <div className="flex items-center space-x-2 mb-2">
                              <Target className="h-4 w-4 text-gray-400" />
                              <span className="text-sm font-medium text-gray-600">
                                {presentation.subject}
                              </span>
                            </div>
                          )}
                          {presentation.deadlineDate && (
                            <div className="flex items-center space-x-2 text-sm text-gray-500">
                              <Calendar className="h-4 w-4" />
                              <span>
                                Due{" "}
                                {new Date(
                                  presentation.deadlineDate
                                ).toLocaleDateString()}
                              </span>
                            </div>
                          )}
                        </div>
                        <Button
                          onClick={() => openPresentationModal(presentation)}
                          className="bg-orange-600 hover:bg-orange-700"
                        >
                          Start Working
                        </Button>
                      </div>
                    </div>
                  ))}

                  {/* Upcoming/Scheduled Presentations */}
                  {dashboardData.presentations.upcoming?.map((presentation) => (
                    <div
                      key={presentation._id}
                      className="p-4 border border-purple-200 bg-purple-50 rounded-lg"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center space-x-3 mb-2">
                            <h3 className="font-medium text-lg">
                              {presentation.title || "Presentation"}
                            </h3>
                            <Badge
                              variant="outline"
                              className="bg-purple-100 text-purple-800"
                            >
                              {presentation.status}
                            </Badge>
                          </div>
                          <div className="flex items-center space-x-2 text-sm text-gray-500">
                            <Calendar className="h-4 w-4" />
                            <span>
                              Scheduled{" "}
                              {new Date(
                                presentation.scheduledDate
                              ).toLocaleDateString()}
                            </span>
                          </div>
                        </div>
                        <Button
                          onClick={() => openPresentationModal(presentation)}
                          className="bg-purple-600 hover:bg-purple-700"
                        >
                          Mark Complete
                        </Button>
                      </div>
                    </div>
                  ))}

                  {(dashboardData.presentations.pending?.length || 0) === 0 &&
                    (dashboardData.presentations.upcoming?.length || 0) ===
                      0 && (
                      <div className="text-center py-12">
                        <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
                        <h3 className="text-lg font-medium mb-2">
                          All Presentations Completed!
                        </h3>
                        <p className="text-gray-600">
                          Excellent work! You're up to date with all
                          presentations.
                        </p>
                      </div>
                    )}
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="space-y-6">
            {/* Presentation Progress Chart */}
            <Card>
              <CardHeader>
                <CardTitle>Presentation Progress</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie
                      dataKey="value"
                      data={presentationPieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={40}
                      outerRadius={80}
                      paddingAngle={5}
                    >
                      {presentationPieData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
                <div className="flex justify-center space-x-4 mt-4">
                  <div className="flex items-center space-x-1">
                    <div className="w-3 h-3 bg-purple-500 rounded-full"></div>
                    <span className="text-sm">
                      Completed ({dashboardData.presentations.completed})
                    </span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                    <span className="text-sm">
                      Pending (
                      {dashboardData.presentations.pending?.length || 0})
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Presentation Summary */}
            <Card>
              <CardHeader>
                <CardTitle>Summary Statistics</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between">
                  <span className="text-gray-600">Total Presentations</span>
                  <span className="font-medium">
                    {dashboardData.presentations.total}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Completed</span>
                  <span className="font-medium text-purple-600">
                    {dashboardData.presentations.completed}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Pending</span>
                  <span className="font-medium text-orange-600">
                    {dashboardData.presentations.pending?.length || 0}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Scheduled</span>
                  <span className="font-medium text-blue-600">
                    {dashboardData.presentations.upcoming?.length || 0}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Success Rate</span>
                  <span className="font-medium text-green-600">
                    {Math.round(dashboardData.presentations.completion)}%
                  </span>
                </div>
                <div className="flex justify-between border-t pt-2">
                  <span className="font-medium">Overall Progress</span>
                  <span className="font-bold text-lg">
                    {Math.round(
                      (dashboardData.presentations.completed /
                        dashboardData.presentations.total) *
                        100
                    )}
                    %
                  </span>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Submission Modals */}
        {selectedAssignment && (
          <SubmissionModal
            item={selectedAssignment}
            type="assignment"
            isOpen={isSubmissionModalOpen}
            onClose={() => setIsSubmissionModalOpen(false)}
            onSubmit={handleAssignmentSubmit}
          />
        )}

        {selectedPresentation && (
          <SubmissionModal
            item={selectedPresentation}
            type="presentation"
            isOpen={isPresentationModalOpen}
            onClose={() => setIsPresentationModalOpen(false)}
            onSubmit={handlePresentationSubmit}
          />
        )}
      </div>
    );
  }

  if (activeDetailView === "progress") {
    return (
      <div className="space-y-6">
        {/* Header with Back Button */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Button
              variant="outline"
              onClick={() => setActiveDetailView(null)}
              className="flex items-center space-x-2"
            >
              <ChevronRight className="h-4 w-4 rotate-180" />
              <span>Back to Dashboard</span>
            </Button>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                Progress Analytics
              </h1>
              <p className="text-gray-600">
                Detailed analysis of your academic performance
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Monthly Progress Chart */}
          <Card>
            <CardHeader>
              <CardTitle>Monthly Progress Trends</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={monthlyProgress}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="assignments"
                    stroke="#10b981"
                    strokeWidth={2}
                    name="Assignments"
                  />
                  <Line
                    type="monotone"
                    dataKey="presentations"
                    stroke="#8b5cf6"
                    strokeWidth={2}
                    name="Presentations"
                  />
                  <Line
                    type="monotone"
                    dataKey="attendance"
                    stroke="#3b82f6"
                    strokeWidth={2}
                    name="Attendance"
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Subject Performance */}
          <Card>
            <CardHeader>
              <CardTitle>Subject Performance</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={subjectPerformance}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="subject" />
                  <YAxis />
                  <Tooltip
                    formatter={(value, name, props) => {
                      if (name === "score") {
                        const data = props.payload;
                        return [
                          `${value}%`,
                          `Score (${data.completed}/${data.total} completed)`,
                        ];
                      }
                      return [value, name];
                    }}
                    labelFormatter={(label) => `Subject: ${label}`}
                  />
                  <Bar dataKey="score" fill="#8884d8" />
                </BarChart>
              </ResponsiveContainer>

              {/* Detailed Subject Breakdown */}
              <div className="mt-6 space-y-4">
                <h4 className="text-sm font-semibold text-gray-700 mb-3">
                  Subject Details
                </h4>
                {subjectPerformance.map((subject, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                  >
                    <div className="flex-1">
                      <h5 className="font-medium text-gray-900">
                        {subject.subject}
                      </h5>
                      <div className="flex items-center space-x-4 mt-1">
                        <span className="text-sm text-gray-600">
                          📚 {subject.assignments} Assignment
                          {subject.assignments !== 1 ? "s" : ""}
                        </span>
                        <span className="text-sm text-gray-600">
                          🎤 {subject.presentations} Presentation
                          {subject.presentations !== 1 ? "s" : ""}
                        </span>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-lg font-bold text-green-600">
                        {subject.score}%
                      </div>
                      <div className="text-sm text-gray-500">
                        {subject.completed}/{subject.total}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Performance Insights */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-center">This Week</CardTitle>
            </CardHeader>
            <CardContent className="text-center">
              <div className="text-3xl font-bold text-green-600 mb-2">
                {
                  dashboardData.assignments.pending.filter(
                    (a) =>
                      a.dueDate &&
                      new Date(a.dueDate) <=
                        new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
                  ).length
                }
              </div>
              <p className="text-gray-600">Tasks Due</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-center">Achievement Rate</CardTitle>
            </CardHeader>
            <CardContent className="text-center">
              <div className="text-3xl font-bold text-blue-600 mb-2">
                {Math.round(
                  ((dashboardData.assignments.submitted +
                    dashboardData.presentations.completed) /
                    (dashboardData.assignments.total +
                      dashboardData.presentations.total)) *
                    100
                )}
                %
              </div>
              <p className="text-gray-600">Tasks Completed</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-center">Streak</CardTitle>
            </CardHeader>
            <CardContent className="text-center">
              <div className="text-3xl font-bold text-purple-600 mb-2">
                {dashboardData?.overall?.streak || 0}
              </div>
              <p className="text-gray-600">Days Active</p>
            </CardContent>
          </Card>
        </div>

        {/* Submission Modals */}
        {selectedAssignment && (
          <SubmissionModal
            item={selectedAssignment}
            type="assignment"
            isOpen={isSubmissionModalOpen}
            onClose={() => setIsSubmissionModalOpen(false)}
            onSubmit={handleAssignmentSubmit}
          />
        )}

        {selectedPresentation && (
          <SubmissionModal
            item={selectedPresentation}
            type="presentation"
            isOpen={isPresentationModalOpen}
            onClose={() => setIsPresentationModalOpen(false)}
            onSubmit={handlePresentationSubmit}
          />
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Performance Dashboard
          </h1>
          <p className="text-gray-600">
            Track your academic progress and upcoming tasks
          </p>
        </div>
      </div>

      {/* Urgent Alerts */}
      {urgentAssignments.length > 0 && (
        <Alert className="border-red-200 bg-red-50">
          <AlertCircle className="h-4 w-4 text-red-600" />
          <AlertDescription className="text-red-800">
            <strong>Urgent:</strong> You have {urgentAssignments.length}{" "}
            assignment(s) due soon or marked as urgent.
          </AlertDescription>
        </Alert>
      )}

      {/* Performance Boxes Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <PerformanceBox
          type="attendance"
          title="Attendance"
          data={{
            percentage: dashboardData.attendance.percentage,
          }}
          alertThreshold={75}
          onClick={() => setIsAttendanceDialogOpen(true)}
        />

        <PerformanceBox
          type="assignments"
          title="Assignments"
          data={{
            completion: dashboardData.assignments.completion,
            pending: dashboardData.assignments.pending,
            total: dashboardData.assignments.total,
            submitted: dashboardData.assignments.submitted,
          }}
          alertThreshold={80}
          onClick={() => setActiveDetailView("assignments")}
        />

        <PerformanceBox
          type="presentations"
          title="Presentations"
          data={{
            completion: dashboardData.presentations.completion,
            pending: dashboardData.presentations.pending,
            upcoming: dashboardData.presentations.upcoming,
            total: dashboardData.presentations.total,
            completed: dashboardData.presentations.completed,
          }}
          alertThreshold={70}
          onClick={() => setActiveDetailView("presentations")}
        />

        <PerformanceBox
          type="overall"
          title="Overall Performance"
          data={{
            score: dashboardData.overall.score,
          }}
          alertThreshold={75}
          onClick={() => setActiveDetailView("progress")}
        />
      </div>

      {/* Recent Activity Overview */}
      <div className="space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Pending Assignments */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <BookOpen className="h-5 w-5" />
                  <span>Recent Activity</span>
                </div>
                <Badge variant="secondary">
                  {dashboardData.assignments.pending.length +
                    (dashboardData.presentations.pending?.length || 0)}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {dashboardData.assignments.pending.length === 0 &&
              (dashboardData.presentations.pending?.length || 0) === 0 ? (
                <div className="text-center py-8">
                  <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
                  <p className="text-gray-600">All tasks completed!</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {dashboardData.assignments.pending
                    .slice(0, 3)
                    .map((assignment) => (
                      <div
                        key={assignment._id}
                        className="flex items-center justify-between p-3 bg-blue-50 rounded-lg border border-blue-200"
                      >
                        <div className="flex-1">
                          <div className="flex items-center space-x-2">
                            <h4 className="font-medium">{assignment.title}</h4>
                            <Badge variant="outline" className="text-xs">
                              Assignment
                            </Badge>
                            {assignment.isUrgent && (
                              <Badge variant="destructive" className="text-xs">
                                Urgent
                              </Badge>
                            )}
                          </div>
                          {assignment.subject && (
                            <p className="text-sm text-gray-600">
                              {assignment.subject}
                            </p>
                          )}
                          {assignment.dueDate && (
                            <p className="text-sm text-gray-500 flex items-center mt-1">
                              <Clock className="h-3 w-3 mr-1" />
                              Due{" "}
                              {new Date(
                                assignment.dueDate
                              ).toLocaleDateString()}
                            </p>
                          )}
                        </div>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => openSubmissionModal(assignment)}
                        >
                          Complete
                        </Button>
                      </div>
                    ))}

                  {dashboardData.presentations.pending
                    ?.slice(0, 2)
                    .map((presentation) => (
                      <div
                        key={presentation._id}
                        className="flex items-center justify-between p-3 bg-purple-50 rounded-lg border border-purple-200"
                      >
                        <div className="flex-1">
                          <div className="flex items-center space-x-2">
                            <h4 className="font-medium">
                              {presentation.title}
                            </h4>
                            <Badge
                              variant="outline"
                              className="text-xs bg-purple-100 text-purple-800"
                            >
                              Presentation
                            </Badge>
                          </div>
                          {presentation.subject && (
                            <p className="text-sm text-gray-600">
                              {presentation.subject}
                            </p>
                          )}
                        </div>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => openPresentationModal(presentation)}
                          className="bg-purple-600 text-white hover:bg-purple-700"
                        >
                          Start
                        </Button>
                      </div>
                    ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Quick Stats */}
          <Card>
            <CardHeader>
              <CardTitle>Quick Statistics</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="text-center p-4 bg-green-50 rounded-lg">
                  <div className="text-2xl font-bold text-green-600">
                    {dashboardData.assignments.submitted}
                  </div>
                  <div className="text-sm text-gray-600">Assignments Done</div>
                </div>
                <div className="text-center p-4 bg-purple-50 rounded-lg">
                  <div className="text-2xl font-bold text-purple-600">
                    {dashboardData.presentations.completed}
                  </div>
                  <div className="text-sm text-gray-600">
                    Presentations Done
                  </div>
                </div>
                <div className="text-center p-4 bg-blue-50 rounded-lg">
                  <div className="text-2xl font-bold text-blue-600">
                    {Math.round(dashboardData.attendance.percentage)}%
                  </div>
                  <div className="text-sm text-gray-600">Attendance Rate</div>
                </div>
                <div className="text-center p-4 bg-yellow-50 rounded-lg">
                  <div className="text-2xl font-bold text-yellow-600">
                    {Math.round(dashboardData.overall.score)}%
                  </div>
                  <div className="text-sm text-gray-600">Overall Score</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <BookOpen className="h-5 w-5" />
                  <span>All Assignments</span>
                </div>
                <div className="text-right">
                  <div className="text-sm text-gray-600">
                    {dashboardData.assignments.submitted} of{" "}
                    {dashboardData.assignments.total} completed
                  </div>
                  <Progress
                    value={
                      (dashboardData.assignments.submitted /
                        dashboardData.assignments.total) *
                      100
                    }
                    className="w-32 mt-1"
                  />
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {dashboardData.assignments.pending.length === 0 ? (
                <div className="text-center py-12">
                  <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
                  <h3 className="text-lg font-medium mb-2">
                    All Assignments Completed!
                  </h3>
                  <p className="text-gray-600">
                    Great job! You're up to date with all assignments.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {dashboardData.assignments.pending.map((assignment) => (
                    <div
                      key={assignment._id}
                      className="p-4 border rounded-lg hover:shadow-md transition-shadow"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center space-x-3 mb-2">
                            <h3 className="font-medium text-lg">
                              {assignment.title}
                            </h3>
                            {assignment.isUrgent && (
                              <Badge variant="destructive">Urgent</Badge>
                            )}
                            <Badge variant="outline">
                              {assignment.category}
                            </Badge>
                          </div>
                          {assignment.subject && (
                            <div className="flex items-center space-x-2 mb-2">
                              <Target className="h-4 w-4 text-gray-400" />
                              <span className="text-sm font-medium text-gray-600">
                                {assignment.subject}
                              </span>
                            </div>
                          )}
                          {assignment.dueDate && (
                            <div className="flex items-center space-x-2 text-sm text-gray-500">
                              <Calendar className="h-4 w-4" />
                              <span>
                                Due{" "}
                                {new Date(
                                  assignment.dueDate
                                ).toLocaleDateString()}
                              </span>
                              <span className="text-xs">
                                (
                                {Math.ceil(
                                  (new Date(assignment.dueDate).getTime() -
                                    Date.now()) /
                                    (1000 * 60 * 60 * 24)
                                )}{" "}
                                days left)
                              </span>
                            </div>
                          )}
                        </div>
                        <Button
                          onClick={() => openSubmissionModal(assignment)}
                          className="bg-green-600 hover:bg-green-700"
                        >
                          Mark as Complete
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          {/* Assignment Progress Chart */}
          <Card>
            <CardHeader>
              <CardTitle>Assignment Progress</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie
                    dataKey="value"
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={40}
                    outerRadius={80}
                    paddingAngle={5}
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
              <div className="flex justify-center space-x-4 mt-4">
                <div className="flex items-center space-x-1">
                  <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                  <span className="text-sm">
                    Completed ({dashboardData.assignments.submitted})
                  </span>
                </div>
                <div className="flex items-center space-x-1">
                  <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                  <span className="text-sm">
                    Pending ({dashboardData.assignments.pending.length})
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Assignment Summary */}
          <Card>
            <CardHeader>
              <CardTitle>Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-between">
                <span className="text-gray-600">Total Assignments</span>
                <span className="font-medium">
                  {dashboardData.assignments.total}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Completed</span>
                <span className="font-medium text-green-600">
                  {dashboardData.assignments.submitted}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Pending</span>
                <span className="font-medium text-yellow-600">
                  {dashboardData.assignments.pending.length}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Success Rate</span>
                <span className="font-medium text-blue-600">
                  {Math.round(dashboardData.assignments.completion)}%
                </span>
              </div>
              <div className="flex justify-between border-t pt-2">
                <span className="font-medium">Overall Progress</span>
                <span className="font-bold text-lg">
                  {Math.round(
                    (dashboardData.assignments.submitted /
                      dashboardData.assignments.total) *
                      100
                  )}
                  %
                </span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <FileText className="h-5 w-5" />
                  <span>All Presentations</span>
                </div>
                <div className="text-right">
                  <div className="text-sm text-gray-600">
                    {dashboardData.presentations.completed} of{" "}
                    {dashboardData.presentations.total} completed
                  </div>
                  <Progress
                    value={
                      (dashboardData.presentations.completed /
                        dashboardData.presentations.total) *
                      100
                    }
                    className="w-32 mt-1"
                  />
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {/* Pending Presentations */}
                {dashboardData.presentations.pending?.map((presentation) => (
                  <div
                    key={presentation._id}
                    className="p-4 border border-orange-200 bg-orange-50 rounded-lg"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-3 mb-2">
                          <h3 className="font-medium text-lg">
                            {presentation.title}
                          </h3>
                          <Badge
                            variant="outline"
                            className="bg-orange-100 text-orange-800"
                          >
                            Pending
                          </Badge>
                          {presentation.isUrgent && (
                            <Badge variant="destructive">Urgent</Badge>
                          )}
                        </div>
                        {presentation.subject && (
                          <div className="flex items-center space-x-2 mb-2">
                            <Target className="h-4 w-4 text-gray-400" />
                            <span className="text-sm font-medium text-gray-600">
                              {presentation.subject}
                            </span>
                          </div>
                        )}
                        {presentation.deadlineDate && (
                          <div className="flex items-center space-x-2 text-sm text-gray-500">
                            <Calendar className="h-4 w-4" />
                            <span>
                              Due{" "}
                              {new Date(
                                presentation.deadlineDate
                              ).toLocaleDateString()}
                            </span>
                          </div>
                        )}
                      </div>
                      <Button
                        onClick={() => openPresentationModal(presentation)}
                        className="bg-orange-600 hover:bg-orange-700"
                      >
                        Start Working
                      </Button>
                    </div>
                  </div>
                ))}

                {/* Upcoming/Scheduled Presentations */}
                {dashboardData.presentations.upcoming?.map((presentation) => (
                  <div
                    key={presentation._id}
                    className="p-4 border border-purple-200 bg-purple-50 rounded-lg"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-3 mb-2">
                          <h3 className="font-medium text-lg">
                            {presentation.title || "Presentation"}
                          </h3>
                          <Badge
                            variant="outline"
                            className="bg-purple-100 text-purple-800"
                          >
                            {presentation.status}
                          </Badge>
                        </div>
                        <div className="flex items-center space-x-2 text-sm text-gray-500">
                          <Calendar className="h-4 w-4" />
                          <span>
                            Scheduled{" "}
                            {new Date(
                              presentation.scheduledDate
                            ).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                      <Button
                        onClick={() => openPresentationModal(presentation)}
                        className="bg-purple-600 hover:bg-purple-700"
                      >
                        Mark Complete
                      </Button>
                    </div>
                  </div>
                ))}

                {(dashboardData.presentations.pending?.length || 0) === 0 &&
                  (dashboardData.presentations.upcoming?.length || 0) === 0 && (
                    <div className="text-center py-12">
                      <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
                      <h3 className="text-lg font-medium mb-2">
                        All Presentations Completed!
                      </h3>
                      <p className="text-gray-600">
                        Excellent work! You're up to date with all
                        presentations.
                      </p>
                    </div>
                  )}
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          {/* Presentation Progress Chart */}
          <Card>
            <CardHeader>
              <CardTitle>Presentation Progress</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie
                    dataKey="value"
                    data={presentationPieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={40}
                    outerRadius={80}
                    paddingAngle={5}
                  >
                    {presentationPieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
              <div className="flex justify-center space-x-4 mt-4">
                <div className="flex items-center space-x-1">
                  <div className="w-3 h-3 bg-purple-500 rounded-full"></div>
                  <span className="text-sm">
                    Completed ({dashboardData.presentations.completed})
                  </span>
                </div>
                <div className="flex items-center space-x-1">
                  <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                  <span className="text-sm">
                    Pending ({dashboardData.presentations.pending?.length || 0})
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Presentation Summary */}
          <Card>
            <CardHeader>
              <CardTitle>Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-between">
                <span className="text-gray-600">Total Presentations</span>
                <span className="font-medium">
                  {dashboardData.presentations.total}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Completed</span>
                <span className="font-medium text-purple-600">
                  {dashboardData.presentations.completed}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Pending</span>
                <span className="font-medium text-orange-600">
                  {dashboardData.presentations.pending?.length || 0}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Scheduled</span>
                <span className="font-medium text-blue-600">
                  {dashboardData.presentations.upcoming?.length || 0}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Success Rate</span>
                <span className="font-medium text-green-600">
                  {Math.round(dashboardData.presentations.completion)}%
                </span>
              </div>
              <div className="flex justify-between border-t pt-2">
                <span className="font-medium">Overall Progress</span>
                <span className="font-bold text-lg">
                  {Math.round(
                    (dashboardData.presentations.completed /
                      dashboardData.presentations.total) *
                      100
                  )}
                  %
                </span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Monthly Progress Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Monthly Progress Trends</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={monthlyProgress}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="assignments"
                  stroke="#10b981"
                  strokeWidth={2}
                  name="Assignments"
                />
                <Line
                  type="monotone"
                  dataKey="presentations"
                  stroke="#8b5cf6"
                  strokeWidth={2}
                  name="Presentations"
                />
                <Line
                  type="monotone"
                  dataKey="attendance"
                  stroke="#3b82f6"
                  strokeWidth={2}
                  name="Attendance"
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Subject Performance */}
        <Card>
          <CardHeader>
            <CardTitle>Subject Performance</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={subjectPerformance}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="subject" />
                <YAxis />
                <Tooltip
                  formatter={(value, name, props) => {
                    if (name === "score") {
                      const data = props.payload;
                      return [
                        `${value}%`,
                        `Score (${data.completed}/${data.total} completed)`,
                      ];
                    }
                    return [value, name];
                  }}
                  labelFormatter={(label) => `Subject: ${label}`}
                />
                <Bar dataKey="score" fill="#8884d8" />
              </BarChart>
            </ResponsiveContainer>

            {/* Detailed Subject Breakdown */}
            <div className="mt-6 space-y-4">
              <h4 className="text-sm font-semibold text-gray-700 mb-3">
                Subject Details
              </h4>
              {subjectPerformance.map((subject, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                >
                  <div className="flex-1">
                    <h5 className="font-medium text-gray-900">
                      {subject.subject}
                    </h5>
                    <div className="flex items-center space-x-4 mt-1">
                      <span className="text-sm text-gray-600">
                        📚 {subject.assignments} Assignment
                        {subject.assignments !== 1 ? "s" : ""}
                      </span>
                      <span className="text-sm text-gray-600">
                        🎤 {subject.presentations} Presentation
                        {subject.presentations !== 1 ? "s" : ""}
                      </span>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-lg font-bold text-green-600">
                      {subject.score}%
                    </div>
                    <div className="text-sm text-gray-500">
                      {subject.completed}/{subject.total}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Performance Insights */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-center">This Week</CardTitle>
          </CardHeader>
          <CardContent className="text-center">
            <div className="text-3xl font-bold text-green-600 mb-2">
              {
                dashboardData.assignments.pending.filter(
                  (a) =>
                    a.dueDate &&
                    new Date(a.dueDate) <=
                      new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
                ).length
              }
            </div>
            <p className="text-gray-600">Tasks Due</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-center">Achievement Rate</CardTitle>
          </CardHeader>
          <CardContent className="text-center">
            <div className="text-3xl font-bold text-blue-600 mb-2">
              {Math.round(
                ((dashboardData.assignments.submitted +
                  dashboardData.presentations.completed) /
                  (dashboardData.assignments.total +
                    dashboardData.presentations.total)) *
                  100
              )}
              %
            </div>
            <p className="text-gray-600">Tasks Completed</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-center">Streak</CardTitle>
          </CardHeader>
          <CardContent className="text-center">
            <div className="text-3xl font-bold text-purple-600 mb-2">
              {dashboardData?.overall?.streak || 0}
            </div>
            <p className="text-gray-600">Days Active</p>
          </CardContent>
        </Card>
      </div>

      {/* Submission Modals */}
      {selectedAssignment && (
        <SubmissionModal
          item={selectedAssignment}
          type="assignment"
          isOpen={isSubmissionModalOpen}
          onClose={() => setIsSubmissionModalOpen(false)}
          onSubmit={handleAssignmentSubmit}
        />
      )}

      {selectedPresentation && (
        <SubmissionModal
          item={selectedPresentation}
          type="presentation"
          isOpen={isPresentationModalOpen}
          onClose={() => setIsPresentationModalOpen(false)}
          onSubmit={handlePresentationSubmit}
        />
      )}

      {/* Attendance Tracker Dialog */}
      <Dialog
        open={isAttendanceDialogOpen}
        onOpenChange={setIsAttendanceDialogOpen}
      >
        <DialogContent className="max-w-7xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>My Attendance Tracker</DialogTitle>
            <DialogDescription>
              Comprehensive view of your attendance records and performance
            </DialogDescription>
          </DialogHeader>
          <StudentAttendanceTracker />
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default StudentDashboard;
