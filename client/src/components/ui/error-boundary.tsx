import React, { Component, ErrorInfo, ReactNode } from "react";
import { AlertCircle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, errorInfo: null };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught error:", error, errorInfo);
    this.setState({ errorInfo });
  }

  private handleReload = () => {
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center p-4 bg-gray-50">
          <Card className="max-w-md w-full shadow-lg border-red-100">
            <CardHeader className="text-center pb-2">
              <div className="mx-auto w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mb-4">
                <AlertCircle className="h-6 w-6 text-red-600" />
              </div>
              <CardTitle className="text-xl font-bold text-gray-900">
                Something went wrong
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-center text-gray-600 text-sm">
                We encountered an unexpected error while loading this page.
              </p>
              
              {import.meta.env.DEV && this.state.error && (
                <div className="bg-slate-900 text-slate-50 p-4 rounded-md text-xs font-mono overflow-auto max-h-48 my-4 text-left">
                  <p className="font-bold text-red-400 mb-2">{this.state.error.toString()}</p>
                  <p className="opacity-70 whitespace-pre-wrap">
                    {this.state.errorInfo?.componentStack}
                  </p>
                </div>
              )}

              <div className="flex justify-center pt-2">
                <Button 
                  onClick={this.handleReload}
                  className="bg-primary hover:bg-primary/90 text-white gap-2"
                >
                  <RefreshCw className="h-4 w-4" />
                  Reload Page
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      );
    }

    return this.props.children;
  }
}
