import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { GraduationCap } from "lucide-react";

export default function Login() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { login, user } = useAuth();
  const [, setLocation] = useLocation();

  // Redirect if already logged in
  if (user) {
    setLocation("/");
    return null;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      await login(username, password);
      setLocation("/");
    } catch (err: any) {
      setError(err.message || "Login failed");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-md">
        <div className="flex items-center justify-center mb-12">
          <div className="flex items-center space-x-3">
            <div className="bg-[#f54c4c] p-3 rounded-2xl shadow-lg">
              <GraduationCap className="h-8 w-8 text-white" />
            </div>
            <div className="flex flex-col">
              <h1 className="text-2xl font-black text-foreground leading-none tracking-tight">Smart College</h1>
              <span className="text-[10px] font-black text-[#f54c4c] uppercase tracking-widest mt-1">Student Portal</span>
            </div>
          </div>
        </div>

        <Card data-testid="login-card">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl font-black tracking-tight" data-testid="login-title">Welcome Back</CardTitle>
            <CardDescription className="font-bold text-muted-foreground/60" data-testid="login-description">
              Sign in to access your class updates
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <Alert variant="destructive" data-testid="login-error">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <div className="space-y-2">
                <Label htmlFor="username" className="font-black text-[11px] uppercase tracking-widest text-muted-foreground ml-4">Username</Label>
                <Input
                  id="username"
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Enter your username"
                  required
                  className="h-14 rounded-2xl px-6 font-bold bg-[#f8f9fa] border-transparent focus:bg-white focus:border-[#f54c4c]/20 transition-all"
                  data-testid="input-username"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password" className="font-black text-[11px] uppercase tracking-widest text-muted-foreground ml-4">Password</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  required
                  className="h-14 rounded-2xl px-6 font-bold bg-[#f8f9fa] border-transparent focus:bg-white focus:border-[#f54c4c]/20 transition-all"
                  data-testid="input-password"
                />
              </div>

              <Button
                type="submit"
                className="w-full"
                disabled={isLoading}
                data-testid="button-login"
              >
                {isLoading ? "Signing in..." : "Sign In"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
