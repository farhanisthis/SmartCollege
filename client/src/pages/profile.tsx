import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import {
  User,
  Mail,
  Phone,
  MapPin,
  Calendar,
  GraduationCap,
  ArrowLeft,
  Camera,
  Save,
  Edit3,
  Loader2,
} from "lucide-react";
import { useLocation } from "wouter";

interface ProfileData {
  user: {
    id: string;
    username: string;
    name: string;
    role: string;
    class: string;
    phone?: string;
    location?: string;
    bio?: string;
    department?: string;
    year?: string;
    rollNumber?: string;
    createdAt: string;
  };
  stats: {
    assignmentsCompleted: number;
    presentationsDelivered: number;
    attendancePercentage: number;
  };
}

export default function Profile() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [isEditing, setIsEditing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [profileData, setProfileData] = useState<ProfileData | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    phone: "",
    location: "",
    bio: "",
    department: "",
    year: "",
    rollNumber: "",
  });

  // Load profile data on component mount
  useEffect(() => {
    const loadProfileData = async () => {
      try {
        const response = await fetch("/api/profile", {
          credentials: "include",
        });

        if (response.ok) {
          const data: ProfileData = await response.json();
          setProfileData(data);
          setFormData({
            name: data.user.name || "",
            phone: data.user.phone || "",
            location: data.user.location || "",
            bio: data.user.bio || "",
            department: data.user.department || "",
            year: data.user.year || "",
            rollNumber: data.user.rollNumber || "",
          });
        } else {
          throw new Error("Failed to load profile");
        }
      } catch (error) {
        console.error("Error loading profile:", error);
        toast({
          title: "Error",
          description: "Failed to load profile data. Please refresh the page.",
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    };

    loadProfileData();
  }, [toast]);

  const handleInputChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const response = await fetch("/api/profile", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        const updatedData = await response.json();
        // Update local profile data
        if (profileData) {
          setProfileData({
            ...profileData,
            user: { ...profileData.user, ...updatedData.user },
          });
        }
        toast({
          title: "Profile Updated",
          description: "Your profile has been successfully updated.",
        });
        setIsEditing(false);
      } else {
        throw new Error("Failed to update profile");
      }
    } catch (error) {
      console.error("Error updating profile:", error);
      toast({
        title: "Error",
        description: "Failed to update profile. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const goBack = () => {
    setLocation("/");
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex items-center space-x-2">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span>Loading profile...</span>
        </div>
      </div>
    );
  }

  if (!profileData) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-lg font-semibold">Failed to load profile</h2>
          <p className="text-muted-foreground">
            Please refresh the page to try again.
          </p>
          <Button onClick={() => window.location.reload()} className="mt-4">
            Refresh Page
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="bg-card border-b border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-4">
              <Button
                variant="ghost"
                size="icon"
                onClick={goBack}
                className="h-8 w-8"
              >
                <ArrowLeft className="h-4 w-4" />
              </Button>
              <h1 className="text-xl font-semibold">Profile Settings</h1>
            </div>
            <div className="flex items-center space-x-2">
              {isEditing ? (
                <>
                  <Button
                    variant="outline"
                    onClick={() => setIsEditing(false)}
                    disabled={isSaving}
                  >
                    Cancel
                  </Button>
                  <Button onClick={handleSave} disabled={isSaving}>
                    {isSaving ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      <>
                        <Save className="h-4 w-4 mr-2" />
                        Save Changes
                      </>
                    )}
                  </Button>
                </>
              ) : (
                <Button onClick={() => setIsEditing(true)}>
                  <Edit3 className="h-4 w-4 mr-2" />
                  Edit Profile
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Profile Overview */}
          <div className="lg:col-span-1">
            <Card>
              <CardContent className="pt-6">
                <div className="flex flex-col items-center text-center">
                  <div className="relative">
                    <Avatar className="h-24 w-24">
                      <AvatarImage src="" alt={profileData.user.name} />
                      <AvatarFallback className="text-2xl">
                        {profileData.user.name
                          ?.split(" ")
                          .map((n) => n[0])
                          .join("")}
                      </AvatarFallback>
                    </Avatar>
                    {isEditing && (
                      <Button
                        size="icon"
                        variant="secondary"
                        className="absolute -bottom-2 -right-2 h-8 w-8 rounded-full"
                      >
                        <Camera className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                  <h2 className="mt-4 text-xl font-semibold">
                    {profileData.user.name}
                  </h2>
                  <p className="text-muted-foreground">
                    {profileData.user.username}
                  </p>
                  <div className="mt-3">
                    <Badge variant="secondary" className="capitalize">
                      {profileData.user.role === "cr"
                        ? "Class Representative"
                        : "Student"}
                    </Badge>
                  </div>
                </div>

                <Separator className="my-6" />

                <div className="space-y-4">
                  <div className="flex items-center space-x-3 text-sm">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    <span>{profileData.user.username}</span>
                  </div>
                  <div className="flex items-center space-x-3 text-sm">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <span>
                      Joined{" "}
                      {new Date(profileData.user.createdAt).toLocaleDateString(
                        "en-US",
                        { month: "long", year: "numeric" }
                      )}
                    </span>
                  </div>
                  <div className="flex items-center space-x-3 text-sm">
                    <GraduationCap className="h-4 w-4 text-muted-foreground" />
                    <span>
                      {profileData.user.department || profileData.user.class}
                    </span>
                  </div>
                  {profileData.user.phone && (
                    <div className="flex items-center space-x-3 text-sm">
                      <Phone className="h-4 w-4 text-muted-foreground" />
                      <span>{profileData.user.phone}</span>
                    </div>
                  )}
                  {profileData.user.location && (
                    <div className="flex items-center space-x-3 text-sm">
                      <MapPin className="h-4 w-4 text-muted-foreground" />
                      <span>{profileData.user.location}</span>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Quick Stats */}
            <Card className="mt-6">
              <CardHeader>
                <CardTitle className="text-lg">Quick Stats</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Assignments</span>
                    <span className="font-medium">
                      {profileData.stats.assignmentsCompleted} completed
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Presentations</span>
                    <span className="font-medium">
                      {profileData.stats.presentationsDelivered} delivered
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Attendance</span>
                    <span className="font-medium">
                      {profileData.stats.attendancePercentage}%
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Profile Details */}
          <div className="lg:col-span-2">
            <div className="space-y-6">
              {/* Personal Information */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <User className="h-5 w-5" />
                    <span>Personal Information</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="name">Full Name</Label>
                      <Input
                        id="name"
                        value={formData.name}
                        onChange={(e) =>
                          handleInputChange("name", e.target.value)
                        }
                        disabled={!isEditing}
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <Label htmlFor="username">Username</Label>
                      <Input
                        id="username"
                        value={profileData.user.username}
                        disabled
                        className="mt-1 bg-muted"
                      />
                    </div>
                    <div>
                      <Label htmlFor="phone">Phone Number</Label>
                      <Input
                        id="phone"
                        value={formData.phone}
                        onChange={(e) =>
                          handleInputChange("phone", e.target.value)
                        }
                        disabled={!isEditing}
                        placeholder="Enter your phone number"
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <Label htmlFor="location">Location</Label>
                      <Input
                        id="location"
                        value={formData.location}
                        onChange={(e) =>
                          handleInputChange("location", e.target.value)
                        }
                        disabled={!isEditing}
                        placeholder="City, Country"
                        className="mt-1"
                      />
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="bio">Bio</Label>
                    <Textarea
                      id="bio"
                      value={formData.bio}
                      onChange={(e) => handleInputChange("bio", e.target.value)}
                      disabled={!isEditing}
                      placeholder="Tell us about yourself..."
                      className="mt-1"
                      rows={3}
                    />
                  </div>
                </CardContent>
              </Card>

              {/* Academic Information */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <GraduationCap className="h-5 w-5" />
                    <span>Academic Information</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="department">Department</Label>
                      <Input
                        id="department"
                        value={formData.department}
                        onChange={(e) =>
                          handleInputChange("department", e.target.value)
                        }
                        disabled={!isEditing}
                        placeholder="e.g., Computer Science"
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <Label htmlFor="year">Academic Year</Label>
                      <Input
                        id="year"
                        value={formData.year}
                        onChange={(e) =>
                          handleInputChange("year", e.target.value)
                        }
                        disabled={!isEditing}
                        placeholder="e.g., 3rd Year"
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <Label htmlFor="rollNumber">Roll Number</Label>
                      <Input
                        id="rollNumber"
                        value={formData.rollNumber}
                        onChange={(e) =>
                          handleInputChange("rollNumber", e.target.value)
                        }
                        disabled={!isEditing}
                        placeholder="Your roll number"
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <Label htmlFor="role">Role</Label>
                      <Input
                        id="role"
                        value={
                          profileData.user.role === "cr"
                            ? "Class Representative"
                            : "Student"
                        }
                        disabled
                        className="mt-1 bg-muted"
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Account Security */}
              <Card>
                <CardHeader>
                  <CardTitle>Account Security</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex justify-between items-center">
                    <div>
                      <h4 className="font-medium">Password</h4>
                      <p className="text-sm text-muted-foreground">
                        Last changed 2 months ago
                      </p>
                    </div>
                    <Button variant="outline">Change Password</Button>
                  </div>
                  <Separator />
                  <div className="flex justify-between items-center">
                    <div>
                      <h4 className="font-medium">Two-Factor Authentication</h4>
                      <p className="text-sm text-muted-foreground">
                        Add an extra layer of security to your account
                      </p>
                    </div>
                    <Button variant="outline">Enable 2FA</Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
