import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { getApiUrl } from "@/lib/queryClient";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { useTheme } from "@/hooks/use-theme";
import {
  ArrowLeft,
  Save,
  Bell,
  Moon,
  Sun,
  Globe,
  Shield,
  Smartphone,
  Volume2,
  Eye,
  Zap,
  Loader2,
  GraduationCap,
} from "lucide-react";
import { useLocation } from "wouter";

interface PreferencesData {
  preferences: {
    notifications: {
      assignments: boolean;
      presentations: boolean;
      announcements: boolean;
      reminders: boolean;
      emailDigest: boolean;
      pushNotifications: boolean;
      soundEnabled: boolean;
    };
    display: {
      compactMode: boolean;
      showPreviewCards: boolean;
      animationsEnabled: boolean;
      highContrast: boolean;
    };
    privacy: {
      profileVisibility: "public" | "classmates" | "private";
      showOnlineStatus: boolean;
      allowDirectMessages: boolean;
      dataCollection: boolean;
    };
    language: string;
    timezone: string;
  };
}

export default function Preferences() {
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const { theme, setTheme, actualTheme } = useTheme();
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // Notification preferences
  const [notifications, setNotifications] = useState({
    assignments: true,
    presentations: true,
    announcements: true,
    reminders: true,
    emailDigest: false,
    pushNotifications: true,
    soundEnabled: true,
  });

  // Display preferences
  const [display, setDisplay] = useState({
    compactMode: false,
    showPreviewCards: true,
    animationsEnabled: true,
    highContrast: false,
  });

  // Privacy preferences
  const [privacy, setPrivacy] = useState({
    profileVisibility: "public" as "public" | "classmates" | "private",
    showOnlineStatus: true,
    allowDirectMessages: true,
    dataCollection: true,
  });

  // Language and Region
  const [language, setLanguage] = useState("en");
  const [timezone, setTimezone] = useState("UTC");

  // Load preferences data on component mount
  useEffect(() => {
    const loadPreferences = async () => {
      try {
        const response = await fetch(getApiUrl("/api/preferences"), {
          credentials: "include",
        });

        if (response.ok) {
          const data: PreferencesData = await response.json();
          const prefs = data.preferences;

          setNotifications(prefs.notifications);
          setDisplay(prefs.display);
          setPrivacy(prefs.privacy);
          setLanguage(prefs.language);
          setTimezone(prefs.timezone);
        } else {
          throw new Error("Failed to load preferences");
        }
      } catch (error) {
        console.error("Error loading preferences:", error);
        toast({
          title: "Error",
          description: "Failed to load preferences. Using defaults.",
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    };

    loadPreferences();
  }, [toast]);

  const handleNotificationChange = (key: string, value: boolean) => {
    setNotifications((prev) => ({ ...prev, [key]: value }));
  };

  const handleDisplayChange = (key: string, value: boolean) => {
    setDisplay((prev) => ({ ...prev, [key]: value }));
  };

  const handlePrivacyChange = (key: string, value: boolean | string) => {
    setPrivacy((prev) => ({ ...prev, [key]: value }));
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const preferences = {
        notifications,
        display,
        privacy,
        language,
        timezone,
      };

      const response = await fetch(getApiUrl("/api/preferences"), {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({ preferences }),
      });

      if (response.ok) {
        toast({
          title: "Preferences Saved",
          description: "Your preferences have been successfully updated.",
        });
      } else {
        throw new Error("Failed to save preferences");
      }
    } catch (error) {
      console.error("Error saving preferences:", error);
      toast({
        title: "Error",
        description: "Failed to save preferences. Please try again.",
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
          <span>Loading preferences...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="bg-card border-b border-border sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-3">
              <Button
                variant="ghost"
                size="icon"
                onClick={goBack}
                className="h-10 w-10 rounded-xl"
              >
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <div className="flex items-center space-x-2">
                <div className="bg-[#f54c4c] p-1.5 rounded-lg">
                  <GraduationCap className="h-4 w-4 text-white" />
                </div>
                <h1 className="text-base font-black tracking-tight">
                  Preferences
                </h1>
              </div>
            </div>
            <Button
              onClick={handleSave}
              disabled={isSaving}
              className="bg-[#f54c4c] hover:bg-[#d43f3f] text-white rounded-2xl h-11 px-6 font-bold transition-all active:scale-95"
            >
              {isSaving ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Save className="h-4 w-4 mr-2" />
              )}
              Save
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="space-y-6">
          {/* Theme Settings */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                {actualTheme === "light" ? (
                  <Sun className="h-5 w-5" />
                ) : (
                  <Moon className="h-5 w-5" />
                )}
                <span>Appearance</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-base font-medium">Theme</Label>
                  <p className="text-sm text-muted-foreground">
                    Choose how SmartUpdates looks to you
                  </p>
                </div>
                <Select value={theme} onValueChange={setTheme}>
                  <SelectTrigger className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="light">Light</SelectItem>
                    <SelectItem value="dark">Dark</SelectItem>
                    <SelectItem value="system">System</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-base font-medium">Compact Mode</Label>
                  <p className="text-sm text-muted-foreground">
                    Use smaller spacing and condensed layouts
                  </p>
                </div>
                <Switch
                  checked={display.compactMode}
                  onCheckedChange={(value) =>
                    handleDisplayChange("compactMode", value)
                  }
                />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-base font-medium">
                    Show Preview Cards
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    Display content previews in update cards
                  </p>
                </div>
                <Switch
                  checked={display.showPreviewCards}
                  onCheckedChange={(value) =>
                    handleDisplayChange("showPreviewCards", value)
                  }
                />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-base font-medium">Animations</Label>
                  <p className="text-sm text-muted-foreground">
                    Enable smooth transitions and animations
                  </p>
                </div>
                <Switch
                  checked={display.animationsEnabled}
                  onCheckedChange={(value) =>
                    handleDisplayChange("animationsEnabled", value)
                  }
                />
              </div>
            </CardContent>
          </Card>

          {/* Notification Settings */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Bell className="h-5 w-5" />
                <span>Notifications</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-base font-medium">
                    Assignment Notifications
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    Get notified about new assignments and due dates
                  </p>
                </div>
                <Switch
                  checked={notifications.assignments}
                  onCheckedChange={(value) =>
                    handleNotificationChange("assignments", value)
                  }
                />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-base font-medium">
                    Presentation Updates
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    Notifications for presentation schedules and changes
                  </p>
                </div>
                <Switch
                  checked={notifications.presentations}
                  onCheckedChange={(value) =>
                    handleNotificationChange("presentations", value)
                  }
                />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-base font-medium">
                    General Announcements
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    Important announcements from your class representatives
                  </p>
                </div>
                <Switch
                  checked={notifications.announcements}
                  onCheckedChange={(value) =>
                    handleNotificationChange("announcements", value)
                  }
                />
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-base font-medium">
                    Push Notifications
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    Receive notifications even when the app is closed
                  </p>
                </div>
                <Switch
                  checked={notifications.pushNotifications}
                  onCheckedChange={(value) =>
                    handleNotificationChange("pushNotifications", value)
                  }
                />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-base font-medium">Sound Effects</Label>
                  <p className="text-sm text-muted-foreground">
                    Play sounds for notifications and interactions
                  </p>
                </div>
                <Switch
                  checked={notifications.soundEnabled}
                  onCheckedChange={(value) =>
                    handleNotificationChange("soundEnabled", value)
                  }
                />
              </div>
            </CardContent>
          </Card>

          {/* Privacy Settings */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Shield className="h-5 w-5" />
                <span>Privacy & Security</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-base font-medium">
                    Profile Visibility
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    Control who can see your profile information
                  </p>
                </div>
                <Select
                  value={privacy.profileVisibility}
                  onValueChange={(value) =>
                    handlePrivacyChange("profileVisibility", value)
                  }
                >
                  <SelectTrigger className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="public">Public</SelectItem>
                    <SelectItem value="classmates">Classmates</SelectItem>
                    <SelectItem value="private">Private</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-base font-medium">
                    Show Online Status
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    Let others see when you're online
                  </p>
                </div>
                <Switch
                  checked={privacy.showOnlineStatus}
                  onCheckedChange={(value) =>
                    handlePrivacyChange("showOnlineStatus", value)
                  }
                />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-base font-medium">
                    Data Collection
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    Allow collection of usage data to improve the service
                  </p>
                </div>
                <Switch
                  checked={privacy.dataCollection}
                  onCheckedChange={(value) =>
                    handlePrivacyChange("dataCollection", value)
                  }
                />
              </div>
            </CardContent>
          </Card>

          {/* Language & Region */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Globe className="h-5 w-5" />
                <span>Language & Region</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-base font-medium">Language</Label>
                  <p className="text-sm text-muted-foreground">
                    Choose your preferred language
                  </p>
                </div>
                <Select value={language} onValueChange={setLanguage}>
                  <SelectTrigger className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="en">English</SelectItem>
                    <SelectItem value="hi">हिंदी</SelectItem>
                    <SelectItem value="es">Español</SelectItem>
                    <SelectItem value="fr">Français</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-base font-medium">Timezone</Label>
                  <p className="text-sm text-muted-foreground">
                    Set your local timezone for accurate timestamps
                  </p>
                </div>
                <Select value={timezone} onValueChange={setTimezone}>
                  <SelectTrigger className="w-40">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="UTC">UTC (GMT+0)</SelectItem>
                    <SelectItem value="IST">IST (GMT+5:30)</SelectItem>
                    <SelectItem value="PST">PST (GMT-8)</SelectItem>
                    <SelectItem value="EST">EST (GMT-5)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Performance Settings */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Zap className="h-5 w-5" />
                <span>Performance</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-base font-medium">
                    Auto-refresh Updates
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    Automatically refresh the dashboard for new updates
                  </p>
                </div>
                <Switch defaultChecked={true} />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-base font-medium">
                    Preload Images
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    Load images in advance for faster viewing
                  </p>
                </div>
                <Switch defaultChecked={false} />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-base font-medium">Offline Mode</Label>
                  <p className="text-sm text-muted-foreground">
                    Cache updates for offline viewing
                  </p>
                </div>
                <Switch defaultChecked={false} />
              </div>
            </CardContent>
          </Card>

          {/* Danger Zone */}
          <Card className="border-destructive/50">
            <CardHeader>
              <CardTitle className="text-destructive">Danger Zone</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-base font-medium">
                    Reset All Preferences
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    This will reset all your preferences to default values
                  </p>
                </div>
                <Button
                  variant="outline"
                  className="border-destructive text-destructive hover:bg-destructive hover:text-destructive-foreground"
                >
                  Reset
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
