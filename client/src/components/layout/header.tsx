import { GraduationCap, ChevronDown, Wifi, WifiOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useAuth } from "@/hooks/use-auth";
import { useIsMobile } from "@/hooks/use-mobile";
import { useWebSocket } from "@/contexts/WebSocketContext";
import { useLocation } from "wouter";

interface HeaderProps {
  onCreateUpdate?: () => void;
}

export default function Header({ onCreateUpdate }: HeaderProps) {
  const { user, logout } = useAuth();
  const isMobile = useIsMobile();
  const { connected } = useWebSocket();
  const [, setLocation] = useLocation();

  const handleLogout = async () => {
    await logout();
  };

  const navigateToProfile = () => {
    setLocation("/profile");
  };

  const navigateToPreferences = () => {
    setLocation("/preferences");
  };

  return (
    <header
      className="bg-card border-b border-border sticky top-0 z-50"
      data-testid="header"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center space-x-4 ">
            <div className="flex items-center  space-x-2">
              <GraduationCap
                className="text-primary text-2xl"
                data-testid="logo"
              />
              <h1
                className="text-xl font-bold text-foreground"
                data-testid="app-name"
              >
                SmartUpdates
              </h1>
            </div>

            {user && !isMobile && (
              <div className="hidden sm:flex items-center space-x-2 bg-accent px-3 py-1 rounded-full">
                <span
                  className="text-sm text-accent-foreground font-medium"
                  data-testid="user-role"
                >
                  {user.role === "cr" ? "Class Representative" : "Student"}
                </span>
                <div className="w-2 h-2 bg-primary rounded-full"></div>
              </div>
            )}
          </div>

          <div className="flex items-center space-x-2">
            {/* WebSocket Connection Status */}
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className={`h-8 w-8 ${
                    connected ? "text-green-500" : "text-red-500"
                  }`}
                  data-testid="websocket-status"
                >
                  {connected ? (
                    <Wifi className="h-4 w-4" />
                  ) : (
                    <WifiOff className="h-4 w-4" />
                  )}
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>
                  {connected
                    ? "Real-time updates connected"
                    : "Real-time updates disconnected"}
                </p>
              </TooltipContent>
            </Tooltip>

            {/* Theme Toggle - hidden on mobile to save space */}
            {!isMobile && <ThemeToggle />}

            {/* User Menu */}
            {user && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    className="flex items-center space-x-2"
                    data-testid="button-user-menu"
                  >
                    <Avatar className="h-8 w-8">
                      <AvatarImage src="" alt={user.name} />
                      <AvatarFallback data-testid="user-avatar">
                        {user.name
                          .split(" ")
                          .map((n) => n[0])
                          .join("")}
                      </AvatarFallback>
                    </Avatar>
                    <span
                      className="hidden sm:block text-sm font-medium"
                      data-testid="user-name"
                    >
                      {user.name}
                    </span>
                    <ChevronDown className="h-4 w-4 text-muted-foreground" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  {isMobile && (
                    <>
                      <div className="px-2 py-1.5">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium">Theme</span>
                          <ThemeToggle />
                        </div>
                      </div>
                      <DropdownMenuSeparator />
                    </>
                  )}
                  <DropdownMenuItem
                    onClick={navigateToProfile}
                    data-testid="menu-profile"
                  >
                    <span>Profile Settings</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={navigateToPreferences}
                    data-testid="menu-preferences"
                  >
                    <span>Preferences</span>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={handleLogout}
                    data-testid="menu-logout"
                  >
                    <span>Log out</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
