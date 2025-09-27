import { useState, useCallback, useRef, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useWebSocket } from "@/contexts/WebSocketContext";
import { useToast } from "@/hooks/use-toast";
import Header from "@/components/layout/header";
import Sidebar from "@/components/layout/sidebar";
import MobileBottomNav from "@/components/layout/mobile-bottom-nav";
import MobileCreateFab from "@/components/layout/mobile-create-fab";
import UpdateCard from "@/components/updates/update-card";
import PerformanceDashboard from "./performance-dashboard";
import {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from "@/components/ui/accordion";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import CreateUpdateModal from "@/components/updates/create-update-modal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, Search, BarChart, BookOpen } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useIsMobile } from "@/hooks/use-mobile";

import { UpdateWithAuthor, DashboardStats } from "@shared/schema";

export default function Dashboard() {
  const { user } = useAuth();
  const isMobile = useIsMobile();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { connected, joinCategory, leaveCategory } = useWebSocket();

  const [selectedCategory, setSelectedCategory] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [timeFilter, setTimeFilter] = useState("week");
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("updates");

  // Set default tab based on user role
  useEffect(() => {
    if (user?.role === "student") {
      setActiveTab("performance");
    } else {
      setActiveTab("updates");
    }
  }, [user?.role]);

  // Global drag and drop state
  const [isDragOver, setIsDragOver] = useState(false);
  const [draggedFiles, setDraggedFiles] = useState<File[]>([]);
  const dragCounterRef = useRef(0);

  const {
    data: updates = [],
    isLoading: updatesLoading,
    refetch: refetchUpdates,
  } = useQuery<UpdateWithAuthor[]>({
    queryKey: ["/api/updates", selectedCategory],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (selectedCategory !== "all") {
        params.append("category", selectedCategory);
      }
      const response = await fetch(`/api/updates?${params}`, {
        credentials: "include",
      });
      if (!response.ok) throw new Error("Failed to fetch updates");
      return response.json();
    },
  });

  const { data: stats } = useQuery<DashboardStats>({
    queryKey: ["/api/stats/dashboard"],
  });

  // WebSocket real-time updates
  useEffect(() => {
    // Join the current category room
    joinCategory(selectedCategory);

    // Cleanup: leave previous category when changing
    return () => {
      leaveCategory(selectedCategory);
    };
  }, [selectedCategory, joinCategory, leaveCategory]);

  // Get WebSocket instance at the component level (outside of useEffect)
  const { onNewUpdate, onUpdateDeleted, onUpdateUpdated } = useWebSocket();

  // Handle real-time update events
  useEffect(() => {
    const handleNewUpdate = (newUpdate: UpdateWithAuthor) => {
      // Show toast notification
      toast({
        title: "New Update",
        description: `${newUpdate.title} was posted`,
        duration: 3000,
      });

      // Update the query cache
      queryClient.setQueryData(
        ["/api/updates", selectedCategory],
        (oldData: UpdateWithAuthor[] | undefined) => {
          if (!oldData) return [newUpdate];
          // Check if update already exists to prevent duplicates
          const exists = oldData.some((update) => update.id === newUpdate.id);
          if (exists) return oldData;
          return [newUpdate, ...oldData];
        }
      );

      // Also update the 'all' category cache if we're not already viewing it
      if (selectedCategory !== "all") {
        queryClient.setQueryData(
          ["/api/updates", "all"],
          (oldData: UpdateWithAuthor[] | undefined) => {
            if (!oldData) return [newUpdate];
            const exists = oldData.some((update) => update.id === newUpdate.id);
            if (exists) return oldData;
            return [newUpdate, ...oldData];
          }
        );
      }

      // Invalidate dashboard stats
      queryClient.invalidateQueries({ queryKey: ["/api/stats/dashboard"] });
    };

    const handleUpdateDeleted = (deletedUpdate: UpdateWithAuthor) => {
      toast({
        title: "Update Deleted",
        description: `${deletedUpdate.title} was deleted`,
        duration: 3000,
      });

      // Remove from all relevant query caches
      ["all", deletedUpdate.category].forEach((category) => {
        queryClient.setQueryData(
          ["/api/updates", category],
          (oldData: UpdateWithAuthor[] | undefined) => {
            if (!oldData) return [];
            return oldData.filter((update) => update.id !== deletedUpdate.id);
          }
        );
      });

      // Invalidate dashboard stats
      queryClient.invalidateQueries({ queryKey: ["/api/stats/dashboard"] });
    };

    const handleUpdateUpdated = (updatedUpdate: UpdateWithAuthor) => {
      toast({
        title: "Update Modified",
        description: `${updatedUpdate.title} was updated`,
        duration: 3000,
      });

      // Update in all relevant query caches
      ["all", updatedUpdate.category].forEach((category) => {
        queryClient.setQueryData(
          ["/api/updates", category],
          (oldData: UpdateWithAuthor[] | undefined) => {
            if (!oldData) return [updatedUpdate];
            return oldData.map((update) =>
              update.id === updatedUpdate.id ? updatedUpdate : update
            );
          }
        );
      });
    };

    // Set up event listeners
    const unsubscribeNew = onNewUpdate(handleNewUpdate);
    const unsubscribeDeleted = onUpdateDeleted(handleUpdateDeleted);
    const unsubscribeUpdated = onUpdateUpdated(handleUpdateUpdated);

    return () => {
      unsubscribeNew();
      unsubscribeDeleted();
      unsubscribeUpdated();
    };
  }, [
    selectedCategory,
    toast,
    queryClient,
    onNewUpdate,
    onUpdateDeleted,
    onUpdateUpdated,
  ]);

  // Global drag and drop handlers
  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();

    dragCounterRef.current++;

    if (e.dataTransfer.items && e.dataTransfer.items.length > 0) {
      setIsDragOver(true);
    }
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();

    dragCounterRef.current--;

    if (dragCounterRef.current === 0) {
      setIsDragOver(false);
    }
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();

      setIsDragOver(false);
      dragCounterRef.current = 0;

      const files = Array.from(e.dataTransfer.files);
      if (files.length > 0 && user?.role === "cr") {
        setDraggedFiles(files);
        setIsCreateModalOpen(true);
      }
    },
    [user?.role]
  );

  const filteredUpdates = updates.filter((update) => {
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      return (
        update.title.toLowerCase().includes(query) ||
        update.content.toLowerCase().includes(query) ||
        (update.description &&
          update.description.toLowerCase().includes(query)) ||
        update.author.name.toLowerCase().includes(query)
      );
    }
    return true;
  });

  const isCR = user?.role === "cr";

  return (
    <div
      className="min-h-screen bg-background relative"
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      {/* Global Drag Overlay */}
      {isDragOver && (
        <div className="fixed inset-0 z-50 bg-primary/10 backdrop-blur-sm">
          <div className="flex items-center justify-center h-full">
            <div
              className={`border-2 border-dashed rounded-lg p-12 text-center max-w-md mx-4 ${
                user?.role === "cr"
                  ? "bg-primary/20 border-primary text-primary"
                  : "bg-muted/20 border-muted-foreground text-muted-foreground"
              }`}
            >
              <div className="mb-4">
                <svg
                  className="w-16 h-16 mx-auto"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                  />
                </svg>
              </div>
              {user?.role === "cr" ? (
                <>
                  <h3 className="text-xl font-semibold mb-2">
                    Drop Files Here
                  </h3>
                  <p className="text-muted-foreground">
                    Release to create a new update with your files
                  </p>
                </>
              ) : (
                <>
                  <h3 className="text-xl font-semibold mb-2">
                    CR Access Required
                  </h3>
                  <p>Only Class Representatives can create updates</p>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      <Header onCreateUpdate={() => setIsCreateModalOpen(true)} />

      <div className="flex">
        {!isMobile && (
          <Sidebar
            selectedCategory={selectedCategory}
            onCategoryChange={setSelectedCategory}
            stats={stats}
          />
        )}

        <main className={`flex-1 ${isMobile ? "pb-20" : "lg:pl-8"}`}>
          <div
            className={`${
              isMobile ? "max-w-7xl mx-auto px-4 sm:px-6 lg:px-8" : "p-6"
            }`}
          >
            {/* Page Header */}
            <div
              className={`flex flex-col sm:flex-row sm:items-center justify-between mb-8 ${
                isMobile ? "pt-6" : ""
              }`}
            >
              <div>
                <h2
                  className="text-2xl font-bold text-foreground"
                  data-testid="page-title"
                >
                  Smart College Dashboard
                </h2>
                <p
                  className="text-muted-foreground mt-1"
                  data-testid="page-subtitle"
                >
                  {user?.class} • {user?.name}
                </p>
              </div>

              {isCR && (
                <div className="mt-4 sm:mt-0 flex space-x-3">
                  <Button
                    onClick={() => setIsCreateModalOpen(true)}
                    className="flex items-center space-x-2"
                    data-testid="button-new-update"
                  >
                    <Plus className="h-4 w-4" />
                    <span>New Update</span>
                  </Button>
                  <Button
                    variant="secondary"
                    size="icon"
                    data-testid="button-search"
                  >
                    <Search className="h-4 w-4" />
                  </Button>
                </div>
              )}
            </div>

            {/* Main Tabs */}
            <Tabs
              value={activeTab}
              onValueChange={setActiveTab}
              className="space-y-6"
            >
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger
                  value="updates"
                  className="flex items-center space-x-2"
                >
                  <BookOpen className="h-4 w-4" />
                  <span>Updates</span>
                </TabsTrigger>
                <TabsTrigger
                  value="performance"
                  className="flex items-center space-x-2"
                >
                  <BarChart className="h-4 w-4" />
                  <span>Performance</span>
                </TabsTrigger>
              </TabsList>

              {/* Updates Tab */}
              <TabsContent value="updates" className="space-y-6">
                {/* Search and Filters */}
                <Card className="p-4">
                  <div className="flex flex-col sm:flex-row gap-4">
                    <div className="flex-1">
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                        <Input
                          type="text"
                          placeholder="Search updates, files, or content..."
                          className="pl-10"
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          data-testid="input-search"
                        />
                      </div>
                    </div>
                    <div className="flex space-x-2">
                      <Select
                        value={selectedCategory}
                        onValueChange={setSelectedCategory}
                      >
                        <SelectTrigger
                          className="w-40"
                          data-testid="select-category"
                        >
                          <SelectValue placeholder="All Categories" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Categories</SelectItem>
                          <SelectItem value="assignments">
                            Assignments
                          </SelectItem>
                          <SelectItem value="notes">Notes</SelectItem>
                          <SelectItem value="presentations">
                            Presentations
                          </SelectItem>
                          <SelectItem value="general">General</SelectItem>
                        </SelectContent>
                      </Select>
                      <Select value={timeFilter} onValueChange={setTimeFilter}>
                        <SelectTrigger
                          className="w-32"
                          data-testid="select-time"
                        >
                          <SelectValue placeholder="Time" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="week">Last 7 days</SelectItem>
                          <SelectItem value="month">Last 30 days</SelectItem>
                          <SelectItem value="semester">
                            This semester
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </Card>

                {/* Updates Grid */}
                <div className="space-y-4" data-testid="updates-grid">
                  {updatesLoading ? (
                    <div className="flex items-center justify-center py-12">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                    </div>
                  ) : filteredUpdates.length === 0 ? (
                    <Card className="p-12 text-center">
                      <div className="text-muted-foreground">
                        <h3
                          className="text-lg font-medium mb-2"
                          data-testid="no-updates-title"
                        >
                          No updates found
                        </h3>
                        <p data-testid="no-updates-description">
                          {searchQuery
                            ? "Try adjusting your search terms or filters."
                            : selectedCategory === "all"
                            ? "No updates have been posted yet."
                            : `No ${selectedCategory} updates found.`}
                        </p>
                      </div>
                    </Card>
                  ) : (
                    // Show updates based on category
                    (() => {
                      // For "all" and "general" categories, show updates directly without grouping
                      if (
                        selectedCategory === "all" ||
                        selectedCategory === "general"
                      ) {
                        return (
                          <div className="space-y-4">
                            {filteredUpdates.map((update) => (
                              <UpdateCard
                                key={update.id}
                                update={update}
                                onRefresh={refetchUpdates}
                              />
                            ))}
                          </div>
                        );
                      }

                      // For specific categories (assignments, notes, presentations), group by subject
                      const grouped: Record<string, typeof filteredUpdates> =
                        {};
                      filteredUpdates.forEach((update) => {
                        const subject = update.subject || "Other";
                        if (!grouped[subject]) grouped[subject] = [];
                        grouped[subject].push(update);
                      });
                      return (
                        <Accordion type="multiple" defaultValue={[]}>
                          {Object.entries(grouped).map(([subject, updates]) => (
                            <AccordionItem key={subject} value={subject}>
                              <AccordionTrigger className="hover:no-underline">
                                <div className="flex items-center justify-between w-full mr-2">
                                  <span>{subject}</span>
                                  <Badge
                                    variant="secondary"
                                    className="text-xs"
                                  >
                                    {updates.length}
                                  </Badge>
                                </div>
                              </AccordionTrigger>
                              <AccordionContent>
                                <div className="space-y-4">
                                  {updates.map((update) => (
                                    <UpdateCard
                                      key={update.id}
                                      update={update}
                                      onRefresh={refetchUpdates}
                                    />
                                  ))}
                                </div>
                              </AccordionContent>
                            </AccordionItem>
                          ))}
                        </Accordion>
                      );
                    })()
                  )}
                </div>

                {/* Load More Button */}
                {filteredUpdates.length > 0 && (
                  <div className="mt-8 text-center">
                    <Button variant="secondary" data-testid="button-load-more">
                      Load More Updates
                    </Button>
                  </div>
                )}
              </TabsContent>

              {/* Performance Tab */}
              <TabsContent value="performance">
                <PerformanceDashboard />
              </TabsContent>
            </Tabs>
          </div>
        </main>
      </div>

      {/* Mobile Bottom Navigation */}
      {isMobile && (
        <MobileBottomNav
          selectedCategory={selectedCategory}
          onCategoryChange={setSelectedCategory}
          stats={stats}
        />
      )}

      {/* Mobile Floating Action Button */}
      <MobileCreateFab onCreateUpdate={() => setIsCreateModalOpen(true)} />

      {/* Create Update Modal */}
      {isCR && (
        <CreateUpdateModal
          isOpen={isCreateModalOpen}
          onClose={() => {
            setIsCreateModalOpen(false);
            setDraggedFiles([]);
          }}
          onSuccess={() => {
            refetchUpdates();
            setIsCreateModalOpen(false);
            setDraggedFiles([]);
          }}
          preloadedFiles={draggedFiles}
        />
      )}
    </div>
  );
}
