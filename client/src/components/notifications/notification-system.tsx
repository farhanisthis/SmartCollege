import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Bell,
  AlertTriangle,
  CheckCircle,
  Clock,
  Trophy,
  AlertCircle,
  X,
  Archive,
} from "lucide-react";
import { useAuth } from "@/hooks/use-auth";

interface Notification {
  id: string;
  type: "deadline" | "performance" | "achievement" | "warning";
  title: string;
  message: string;
  priority: "low" | "medium" | "high" | "urgent";
  createdAt: string;
  read: boolean;
  actionRequired?: boolean;
  actionUrl?: string;
  data?: any;
}

interface NotificationSystemProps {
  isCompact?: boolean;
}

const NotificationSystem: React.FC<NotificationSystemProps> = ({
  isCompact = false,
}) => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAll, setShowAll] = useState(false);
  const { user } = useAuth();

  // Fetch notifications from the server
  const fetchNotifications = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/notifications");
      if (response.ok) {
        const data = await response.json();
        setNotifications(data);
      }
    } catch (error) {
      console.error("Error fetching notifications:", error);
      // Generate mock notifications for demonstration
      generateMockNotifications();
    } finally {
      setLoading(false);
    }
  };

  // Generate mock notifications for demo
  const generateMockNotifications = () => {
    const mockNotifications: Notification[] = [
      {
        id: "1",
        type: "deadline",
        title: "Assignment Due Soon",
        message: "Data Structures Implementation is due in 2 days",
        priority: "high",
        createdAt: new Date().toISOString(),
        read: false,
        actionRequired: true,
        actionUrl: "/assignments/ds-impl",
      },
      {
        id: "2",
        type: "performance",
        title: "Attendance Warning",
        message: "Your attendance is below 75%. Current: 72%",
        priority: "urgent",
        createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
        read: false,
        actionRequired: true,
      },
      {
        id: "3",
        type: "achievement",
        title: "Excellent Performance!",
        message: "You scored 95% on Physics Lab Report - Mechanics",
        priority: "medium",
        createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
        read: true,
      },
      {
        id: "4",
        type: "deadline",
        title: "Presentation Tomorrow",
        message:
          "Quantum Mechanics Fundamentals presentation scheduled for tomorrow at 10 AM",
        priority: "high",
        createdAt: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(),
        read: false,
        actionRequired: true,
      },
      {
        id: "5",
        type: "warning",
        title: "Missing Assignment",
        message: "Essay on Modern Literature submission is overdue",
        priority: "urgent",
        createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
        read: false,
        actionRequired: true,
      },
    ];

    // Filter notifications based on user role
    if (user?.role === "cr") {
      mockNotifications.push(
        {
          id: "6",
          type: "warning",
          title: "Students Need Attention",
          message: "3 students have attendance below 75%",
          priority: "medium",
          createdAt: new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString(),
          read: false,
          actionRequired: true,
          actionUrl: "/cr/attendance",
        },
        {
          id: "7",
          type: "deadline",
          title: "Assignment Grading Required",
          message:
            "15 assignments pending grading for Linear Algebra Problem Set",
          priority: "high",
          createdAt: new Date(Date.now() - 18 * 60 * 60 * 1000).toISOString(),
          read: false,
          actionRequired: true,
          actionUrl: "/cr/assignments",
        }
      );
    }

    setNotifications(mockNotifications);
  };

  useEffect(() => {
    fetchNotifications();
  }, [user]);

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case "deadline":
        return <Clock className="h-4 w-4" />;
      case "performance":
        return <AlertTriangle className="h-4 w-4" />;
      case "achievement":
        return <Trophy className="h-4 w-4" />;
      case "warning":
        return <AlertCircle className="h-4 w-4" />;
      default:
        return <Bell className="h-4 w-4" />;
    }
  };

  const getNotificationColor = (type: string, priority: string) => {
    if (priority === "urgent") return "border-red-500 bg-red-50";
    if (priority === "high") return "border-orange-500 bg-orange-50";

    switch (type) {
      case "achievement":
        return "border-green-500 bg-green-50";
      case "deadline":
        return "border-blue-500 bg-blue-50";
      case "performance":
        return "border-yellow-500 bg-yellow-50";
      case "warning":
        return "border-red-500 bg-red-50";
      default:
        return "border-gray-300 bg-gray-50";
    }
  };

  const markAsRead = async (notificationId: string) => {
    try {
      await fetch(`/api/notifications/${notificationId}/read`, {
        method: "PUT",
      });

      setNotifications((prev) =>
        prev.map((n) => (n.id === notificationId ? { ...n, read: true } : n))
      );
    } catch (error) {
      console.error("Error marking notification as read:", error);
      // Optimistically update for demo
      setNotifications((prev) =>
        prev.map((n) => (n.id === notificationId ? { ...n, read: true } : n))
      );
    }
  };

  const dismissNotification = async (notificationId: string) => {
    try {
      await fetch(`/api/notifications/${notificationId}`, {
        method: "DELETE",
      });

      setNotifications((prev) => prev.filter((n) => n.id !== notificationId));
    } catch (error) {
      console.error("Error dismissing notification:", error);
      // Optimistically update for demo
      setNotifications((prev) => prev.filter((n) => n.id !== notificationId));
    }
  };

  const unreadCount = notifications.filter((n) => !n.read).length;
  const displayNotifications = isCompact
    ? notifications.slice(0, showAll ? undefined : 3)
    : notifications;

  if (loading) {
    return (
      <Card className={isCompact ? "" : "w-full"}>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Bell className="h-5 w-5" />
            <span>Notifications</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-4">Loading notifications...</div>
        </CardContent>
      </Card>
    );
  }

  if (isCompact) {
    return (
      <div className="space-y-3">
        {/* Notification Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Bell className="h-4 w-4" />
            <span className="font-medium">Notifications</span>
            {unreadCount > 0 && (
              <Badge variant="destructive" className="text-xs">
                {unreadCount}
              </Badge>
            )}
          </div>
          {notifications.length > 3 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowAll(!showAll)}
            >
              {showAll ? "Show Less" : `+${notifications.length - 3} more`}
            </Button>
          )}
        </div>

        {/* Compact Notification List */}
        <div className="space-y-2">
          {displayNotifications.length === 0 ? (
            <div className="text-center py-4 text-gray-500">
              <CheckCircle className="h-8 w-8 mx-auto mb-2 text-green-500" />
              <p>All caught up!</p>
            </div>
          ) : (
            displayNotifications.map((notification) => (
              <Alert
                key={notification.id}
                className={`${getNotificationColor(
                  notification.type,
                  notification.priority
                )} ${!notification.read ? "border-l-4" : "opacity-75"}`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start space-x-2">
                    {getNotificationIcon(notification.type)}
                    <div className="flex-1">
                      <div className="font-medium text-sm">
                        {notification.title}
                      </div>
                      <div className="text-xs text-gray-600">
                        {notification.message}
                      </div>
                      <div className="text-xs text-gray-400 mt-1">
                        {new Date(notification.createdAt).toLocaleString()}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-1">
                    {!notification.read && (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => markAsRead(notification.id)}
                        className="h-6 w-6 p-0"
                      >
                        <CheckCircle className="h-3 w-3" />
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => dismissNotification(notification.id)}
                      className="h-6 w-6 p-0"
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              </Alert>
            ))
          )}
        </div>
      </div>
    );
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Bell className="h-5 w-5" />
            <span>Notifications</span>
            {unreadCount > 0 && (
              <Badge variant="destructive">{unreadCount} new</Badge>
            )}
          </div>
          <Button variant="ghost" size="sm">
            <Archive className="h-4 w-4" />
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {notifications.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <CheckCircle className="h-12 w-12 mx-auto mb-4 text-green-500" />
            <h3 className="font-medium mb-2">All caught up!</h3>
            <p>No new notifications</p>
          </div>
        ) : (
          <div className="space-y-4">
            {notifications.map((notification) => (
              <div
                key={notification.id}
                className={`p-4 rounded-lg border ${getNotificationColor(
                  notification.type,
                  notification.priority
                )} ${!notification.read ? "border-l-4" : "opacity-75"}`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start space-x-3">
                    <div
                      className={`p-2 rounded-full ${
                        notification.priority === "urgent"
                          ? "bg-red-100"
                          : notification.priority === "high"
                          ? "bg-orange-100"
                          : "bg-blue-100"
                      }`}
                    >
                      {getNotificationIcon(notification.type)}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center space-x-2">
                        <h4 className="font-medium">{notification.title}</h4>
                        <Badge
                          variant={
                            notification.priority === "urgent"
                              ? "destructive"
                              : notification.priority === "high"
                              ? "default"
                              : "secondary"
                          }
                          className="text-xs"
                        >
                          {notification.priority}
                        </Badge>
                      </div>
                      <p className="text-sm text-gray-600 mt-1">
                        {notification.message}
                      </p>
                      <p className="text-xs text-gray-400 mt-2">
                        {new Date(notification.createdAt).toLocaleString()}
                      </p>
                      {notification.actionRequired && (
                        <div className="mt-3">
                          <Button size="sm" variant="outline">
                            Take Action
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    {!notification.read && (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => markAsRead(notification.id)}
                      >
                        <CheckCircle className="h-4 w-4" />
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => dismissNotification(notification.id)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default NotificationSystem;
