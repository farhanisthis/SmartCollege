import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import AttendanceManager from "@/components/attendance/attendance-manager";
import TimetableDisplay from "@/components/timetable/timetable-display";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Users,
  Calendar,
  BookOpen,
  Presentation,
  CheckCircle2,
  Clock,
  AlertCircle,
  FileText,
  UserCheck,
  CalendarDays,
} from "lucide-react";
import { useAuth } from "@/hooks/use-auth";

interface Student {
  id: string;
  name: string;
  username: string;
}

interface AttendanceRecord {
  student: Student;
  status: "present" | "absent" | "late" | "not_marked";
}

interface AssignmentSubmission {
  _id: string;
  userId: string;
  submittedAt: string;
  status: "submitted" | "late" | "pending";
  score?: number;
  feedback?: string;
  user: {
    name: string;
    username: string;
  };
}

const CRDashboard: React.FC = () => {
  const [activeTab, setActiveTab] = useState<
    | "attendance"
    | "assignments"
    | "presentations"
    | "new-attendance"
    | "timetable"
  >("new-attendance");
  const [attendanceDate, setAttendanceDate] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [selectedSubject, setSelectedSubject] = useState("all");
  const [attendanceData, setAttendanceData] = useState<AttendanceRecord[]>([]);
  const [assignments, setAssignments] = useState<any[]>([]);
  const [selectedAssignment, setSelectedAssignment] = useState<string>("");
  const [submissions, setSubmissions] = useState<AssignmentSubmission[]>([]);
  const [loading, setLoading] = useState(false);
  const { user } = useAuth();

  // Fetch class attendance for a specific date
  const fetchClassAttendance = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        date: attendanceDate,
        ...(selectedSubject &&
          selectedSubject !== "all" && { subject: selectedSubject }),
      });

      const response = await fetch(
        `/api/performance/attendance/class?${params}`,
        {
          credentials: "include",
        }
      );
      if (response.ok) {
        const data = await response.json();
        setAttendanceData(data);
      } else {
        console.error(
          "Failed to fetch attendance:",
          response.status,
          response.statusText
        );
        setAttendanceData([]);
      }
    } catch (error) {
      console.error("Error fetching attendance:", error);
      setAttendanceData([]);
    } finally {
      setLoading(false);
    }
  };

  // Fetch assignments for submission tracking
  const fetchAssignments = async () => {
    try {
      const response = await fetch("/api/updates?category=assignments", {
        credentials: "include",
      });
      if (response.ok) {
        const data = await response.json();
        setAssignments(data);
        if (data.length > 0 && !selectedAssignment) {
          setSelectedAssignment(data[0].id);
        }
      } else {
        console.error(
          "Failed to fetch assignments:",
          response.status,
          response.statusText
        );
        setAssignments([]);
      }
    } catch (error) {
      console.error("Error fetching assignments:", error);
      setAssignments([]);
    }
  };

  // Fetch assignment submissions
  const fetchSubmissions = async () => {
    if (!selectedAssignment) return;

    try {
      setLoading(true);
      const response = await fetch(
        `/api/performance/assignments/${selectedAssignment}/submissions`,
        {
          credentials: "include",
        }
      );
      if (response.ok) {
        const data = await response.json();
        setSubmissions(data);
      } else {
        console.error(
          "Failed to fetch submissions:",
          response.status,
          response.statusText
        );
        setSubmissions([]);
      }
    } catch (error) {
      console.error("Error fetching submissions:", error);
      setSubmissions([]);
    } finally {
      setLoading(false);
    }
  };

  // Mark attendance for a student
  const markAttendance = async (
    studentId: string,
    status: "present" | "absent" | "late"
  ) => {
    try {
      const response = await fetch("/api/performance/attendance", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          userId: studentId,
          date: attendanceDate,
          status,
          subject: selectedSubject === "all" ? undefined : selectedSubject,
        }),
      });

      if (response.ok) {
        // Update local state
        setAttendanceData((prev) =>
          prev.map((record) =>
            record.student.id === studentId ? { ...record, status } : record
          )
        );
      } else {
        const error = await response.json();
        alert(error.error || "Failed to mark attendance");
      }
    } catch (error) {
      console.error("Error marking attendance:", error);
      alert("Failed to mark attendance");
    }
  };

  // Score assignment submission
  const scoreSubmission = async (
    submissionId: string,
    score: number,
    feedback: string
  ) => {
    try {
      const response = await fetch(
        `/api/performance/presentations/${submissionId}/score`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          credentials: "include",
          body: JSON.stringify({ score, feedback }),
        }
      );

      if (response.ok) {
        fetchSubmissions(); // Refresh submissions
      } else {
        const error = await response.json();
        alert(error.error || "Failed to score submission");
      }
    } catch (error) {
      console.error("Error scoring submission:", error);
      alert("Failed to score submission");
    }
  };

  useEffect(() => {
    if (activeTab === "attendance") {
      fetchClassAttendance();
    } else if (activeTab === "assignments") {
      fetchAssignments();
    }
  }, [activeTab, attendanceDate, selectedSubject]);

  useEffect(() => {
    if (selectedAssignment) {
      fetchSubmissions();
    }
  }, [selectedAssignment]);

  const getAttendanceStats = () => {
    const total = attendanceData.length;
    const present = attendanceData.filter((r) => r.status === "present").length;
    const absent = attendanceData.filter((r) => r.status === "absent").length;
    const late = attendanceData.filter((r) => r.status === "late").length;
    const notMarked = attendanceData.filter(
      (r) => r.status === "not_marked"
    ).length;

    return { total, present, absent, late, notMarked };
  };

  const getSubmissionStats = () => {
    const total = submissions.length;
    const submitted = submissions.filter(
      (s) => s.status === "submitted"
    ).length;
    const late = submissions.filter((s) => s.status === "late").length;
    const pending = submissions.filter((s) => s.status === "pending").length;

    return { total, submitted, late, pending };
  };

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
        <button
          onClick={() => setActiveTab("attendance")}
          className={`px-4 py-2 rounded-md text-sm font-medium transition-colors whitespace-nowrap ${
            activeTab === "attendance"
              ? "bg-white text-blue-600 shadow-sm"
              : "text-gray-600 hover:text-gray-900"
          }`}
        >
          <Calendar className="h-4 w-4 inline mr-2" />
          Old Attendance
        </button>
        <button
          onClick={() => setActiveTab("assignments")}
          className={`px-4 py-2 rounded-md text-sm font-medium transition-colors whitespace-nowrap ${
            activeTab === "assignments"
              ? "bg-white text-blue-600 shadow-sm"
              : "text-gray-600 hover:text-gray-900"
          }`}
        >
          <BookOpen className="h-4 w-4 inline mr-2" />
          Assignments
        </button>
        <button
          onClick={() => setActiveTab("presentations")}
          className={`px-4 py-2 rounded-md text-sm font-medium transition-colors whitespace-nowrap ${
            activeTab === "presentations"
              ? "bg-white text-blue-600 shadow-sm"
              : "text-gray-600 hover:text-gray-900"
          }`}
        >
          <Presentation className="h-4 w-4 inline mr-2" />
          Presentations
        </button>
      </div>

      {/* Attendance Tab */}
      {activeTab === "attendance" && (
        <div className="space-y-6">
          {/* Controls */}
          <Card>
            <CardHeader>
              <CardTitle>Attendance Management (Legacy)</CardTitle>
              <p className="text-sm text-gray-600">
                Note: For the new timetable-based attendance system, please use
                the "Attendance Manager" tab.
              </p>
            </CardHeader>
            <CardContent>
              <div className="flex space-x-4 items-end">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Date
                  </label>
                  <Input
                    type="date"
                    value={attendanceDate}
                    onChange={(e) => setAttendanceDate(e.target.value)}
                    className="w-40"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Subject
                  </label>
                  <Select
                    value={selectedSubject}
                    onValueChange={setSelectedSubject}
                  >
                    <SelectTrigger className="w-48">
                      <SelectValue placeholder="Select subject" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Subjects</SelectItem>
                      <SelectItem value="Cloud Computing">
                        Cloud Computing
                      </SelectItem>
                      <SelectItem value="Database Systems">
                        Database Systems
                      </SelectItem>
                      <SelectItem value="Web Development">
                        Web Development
                      </SelectItem>
                      <SelectItem value="Data Structures">
                        Data Structures
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Button onClick={fetchClassAttendance} disabled={loading}>
                  {loading ? "Loading..." : "Refresh"}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Attendance Stats */}
          {attendanceData.length > 0 && (
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              {Object.entries(getAttendanceStats()).map(([key, value]) => (
                <Card key={key}>
                  <CardContent className="pt-6">
                    <div className="text-2xl font-bold">{value}</div>
                    <p className="text-xs text-muted-foreground capitalize">
                      {key === "notMarked" ? "Not Marked" : key}
                    </p>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {/* Attendance Table */}
          <Card>
            <CardHeader>
              <CardTitle>Class Attendance</CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="text-center py-8">Loading...</div>
              ) : attendanceData.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  No students found
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Student</TableHead>
                      <TableHead>Username</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {attendanceData.map((record) => (
                      <TableRow key={record.student.id}>
                        <TableCell className="font-medium">
                          {record.student.name}
                        </TableCell>
                        <TableCell>{record.student.username}</TableCell>
                        <TableCell>
                          <Badge
                            variant={
                              record.status === "present"
                                ? "default"
                                : record.status === "late"
                                ? "secondary"
                                : record.status === "absent"
                                ? "destructive"
                                : "outline"
                            }
                          >
                            {record.status === "not_marked"
                              ? "Not Marked"
                              : record.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex space-x-1">
                            <Button
                              size="sm"
                              variant={
                                record.status === "present"
                                  ? "default"
                                  : "outline"
                              }
                              onClick={() =>
                                markAttendance(record.student.id, "present")
                              }
                            >
                              Present
                            </Button>
                            <Button
                              size="sm"
                              variant={
                                record.status === "late"
                                  ? "secondary"
                                  : "outline"
                              }
                              onClick={() =>
                                markAttendance(record.student.id, "late")
                              }
                            >
                              Late
                            </Button>
                            <Button
                              size="sm"
                              variant={
                                record.status === "absent"
                                  ? "destructive"
                                  : "outline"
                              }
                              onClick={() =>
                                markAttendance(record.student.id, "absent")
                              }
                            >
                              Absent
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Assignments Tab */}
      {activeTab === "assignments" && (
        <div className="space-y-6">
          {/* Assignment Selection */}
          <Card>
            <CardHeader>
              <CardTitle>Assignment Submissions (Legacy)</CardTitle>
              <p className="text-sm text-gray-600">
                Note: This is the legacy assignment submission tracking system.
              </p>
            </CardHeader>
            <CardContent>
              <div className="flex space-x-4 items-end">
                <div className="flex-1">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Select Assignment
                  </label>
                  <Select
                    value={selectedAssignment}
                    onValueChange={setSelectedAssignment}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select assignment" />
                    </SelectTrigger>
                    <SelectContent>
                      {assignments.map((assignment) => (
                        <SelectItem key={assignment.id} value={assignment.id}>
                          {assignment.title}{" "}
                          {assignment.subject && `(${assignment.subject})`}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <Button onClick={fetchSubmissions} disabled={loading}>
                  {loading ? "Loading..." : "Refresh"}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Submission Stats */}
          {submissions.length > 0 && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {Object.entries(getSubmissionStats()).map(([key, value]) => (
                <Card key={key}>
                  <CardContent className="pt-6">
                    <div className="text-2xl font-bold">{value}</div>
                    <p className="text-xs text-muted-foreground capitalize">
                      {key}
                    </p>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {/* Submissions Table */}
          <Card>
            <CardHeader>
              <CardTitle>Submissions</CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="text-center py-8">Loading...</div>
              ) : submissions.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  {selectedAssignment
                    ? "No submissions yet"
                    : "Select an assignment"}
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Student</TableHead>
                      <TableHead>Submitted At</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Score</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {submissions.map((submission) => (
                      <TableRow key={submission._id}>
                        <TableCell className="font-medium">
                          {submission.user?.name || "Unknown User"}
                        </TableCell>
                        <TableCell>
                          {submission.submittedAt
                            ? new Date(
                                submission.submittedAt
                              ).toLocaleDateString()
                            : "No date"}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={
                              submission.status === "submitted"
                                ? "default"
                                : submission.status === "late"
                                ? "secondary"
                                : "destructive"
                            }
                          >
                            {submission.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {submission.score
                            ? `${submission.score}/100`
                            : "Not scored"}
                        </TableCell>
                        <TableCell>
                          <ScoreSubmissionDialog
                            submission={submission}
                            onScore={(score, feedback) =>
                              scoreSubmission(submission._id, score, feedback)
                            }
                          />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Presentations Tab */}
      {activeTab === "presentations" && (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Presentation Management (Legacy)</CardTitle>
              <p className="text-sm text-gray-600">
                This feature is not yet implemented. For now, use the assignment
                system for presentation tracking.
              </p>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="text-center py-8 text-gray-500">
                Presentation management coming soon...
              </div>
            </CardContent>
          </Card>
        </div>
      )}

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

// Score Submission Dialog Component
interface ScoreSubmissionDialogProps {
  submission: AssignmentSubmission;
  onScore: (score: number, feedback: string) => void;
}

const ScoreSubmissionDialog: React.FC<ScoreSubmissionDialogProps> = ({
  submission,
  onScore,
}) => {
  const [score, setScore] = useState(submission.score?.toString() || "");
  const [feedback, setFeedback] = useState(submission.feedback || "");
  const [isOpen, setIsOpen] = useState(false);

  const handleSubmit = () => {
    const scoreValue = parseInt(score);
    if (isNaN(scoreValue) || scoreValue < 0 || scoreValue > 100) {
      alert("Please enter a valid score between 0 and 100");
      return;
    }

    onScore(scoreValue, feedback);
    setIsOpen(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline">
          {submission.score ? "Edit Score" : "Score"}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Score Submission</DialogTitle>
          <DialogDescription>
            Score the submission by {submission.user?.name || "Unknown User"}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Score (0-100)
            </label>
            <Input
              type="number"
              min="0"
              max="100"
              value={score}
              onChange={(e) => setScore(e.target.value)}
              placeholder="Enter score"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Feedback
            </label>
            <Textarea
              value={feedback}
              onChange={(e) => setFeedback(e.target.value)}
              placeholder="Enter feedback for the student"
              rows={3}
            />
          </div>

          <div className="flex justify-end space-x-2">
            <Button variant="outline" onClick={() => setIsOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSubmit}>Save Score</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default CRDashboard;
