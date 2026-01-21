import { useState, useCallback, useRef, useEffect, useMemo } from "react";
import { useInfiniteQuery, useQuery, useQueryClient, InfiniteData } from "@tanstack/react-query";
import { getApiUrl } from "@/lib/queryClient";
import { useWebSocket } from "@/contexts/WebSocketContext";
import { useToast } from "@/hooks/use-toast";
import Header from "@/components/layout/header";
import Sidebar from "@/components/layout/sidebar";

import MobileCreateFab from "@/components/layout/mobile-create-fab";
import UpdateCard from "@/components/updates/update-card";
import PerformanceDashboard from "./performance-dashboard";
import { ErrorBoundary } from "@/components/ui/error-boundary";
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
import { Plus, Search, BarChart, BookOpen, Loader2, Megaphone, ClipboardList, StickyNote } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useIsMobile } from "@/hooks/use-mobile";

import { UpdateWithAuthor, DashboardStats } from "@shared/schema";

const PAGE_SIZE = 50;

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
    data,
    isLoading: updatesLoading,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    refetch: refetchUpdates,
  } = useInfiniteQuery<UpdateWithAuthor[]>({
    queryKey: ["/api/updates", selectedCategory, searchQuery],
    queryFn: async ({ pageParam = 0 }) => {
      const params = new URLSearchParams();
      if (selectedCategory !== "all") {
        params.append("category", selectedCategory);
      }
      params.append("limit", PAGE_SIZE.toString());
      params.append("offset", (pageParam as number).toString());
      if (searchQuery) {
        params.append("search", searchQuery);
      }

      const response = await fetch(getApiUrl(`/api/updates?${params}`), {
        credentials: "include",
      });
      if (!response.ok) throw new Error("Failed to fetch updates");
      return response.json();
    },
    initialPageParam: 0,
    getNextPageParam: (lastPage, allPages) => {
      // If the last page has fewer items than PAGE_SIZE, we've reached the end
      if (lastPage.length < PAGE_SIZE) return undefined;
      // Otherwise, the next offset is the number of pages * PAGE_SIZE
      return allPages.length * PAGE_SIZE;
    },
  });

  const updates = useMemo(() => {
    return data?.pages.flatMap((page) => page) ?? [];
  }, [data]);

  // Group updates by category for desktop view
  const desktopGroupedUpdates = useMemo(() => {
    if (isMobile) return {};
    
    const groups: Record<string, UpdateWithAuthor[]> = {
      assignments: [],
      notes: [],
      presentations: [],
      general: []
    };

    updates.forEach(update => {
      const category = update.category?.toLowerCase() || 'general';
      if (groups[category]) {
        groups[category].push(update);
      } else {
        groups.general.push(update);
      }
    });

    return groups;
  }, [updates, isMobile]);

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

      const updateCache = (category: string) => {
        queryClient.setQueryData<InfiniteData<UpdateWithAuthor[]>>(
          ["/api/updates", category],
          (oldData) => {
            if (!oldData) {
              return {
                pages: [[newUpdate]],
                pageParams: [0],
              };
            }

            // Check if update already exists to prevent duplicates
            const exists = oldData.pages.some((page) =>
              page.some((update) => update.id === newUpdate.id)
            );
            if (exists) return oldData;

            // Add to the first page
            const newPages = [...oldData.pages];
            if (newPages.length > 0) {
              newPages[0] = [newUpdate, ...newPages[0]];
            } else {
              newPages[0] = [newUpdate];
            }

            return {
              ...oldData,
              pages: newPages,
            };
          }
        );
      };

      // Update current category cache
      updateCache(selectedCategory);

      // Also update the 'all' category cache if we're not already viewing it
      if (selectedCategory !== "all") {
        updateCache("all");
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
        queryClient.setQueryData<InfiniteData<UpdateWithAuthor[]>>(
          ["/api/updates", category],
          (oldData) => {
            if (!oldData) return oldData;

            const newPages = oldData.pages.map((page) =>
              page.filter((update) => update.id !== deletedUpdate.id)
            );

            return {
              ...oldData,
              pages: newPages,
            };
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
        queryClient.setQueryData<InfiniteData<UpdateWithAuthor[]>>(
          ["/api/updates", category],
          (oldData) => {
            if (!oldData) return oldData;

            const newPages = oldData.pages.map((page) =>
              page.map((update) =>
                update.id === updatedUpdate.id ? updatedUpdate : update
              )
            );

            return {
              ...oldData,
              pages: newPages,
            };
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



  const isCR = user?.role === "cr";

  return (
    <ErrorBoundary>
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

        <main className={`flex-1 overflow-x-hidden ${isMobile ? "pb-20" : "lg:pl-8"}`}>
          <div
            className={`${
              isMobile ? "max-w-[100vw] px-4 sm:px-6 lg:px-8" : "p-6"
            }`}
          >
            {/* Page Header */}
            <div className="flex items-center justify-between mb-8 pt-4">
              <div>
                <h2 className="text-4xl font-black text-foreground tracking-tight">Updates</h2>
                <p className="text-sm text-muted-foreground font-black mt-1">
                  Semester 5 • Computer Science
                </p>
              </div>

              {isCR && (
                <Button
                    onClick={() => setIsCreateModalOpen(true)}
                    className="bg-[#f54c4c] hover:bg-[#d43f3f] h-14 w-14 rounded-2xl shadow-lg flex items-center justify-center p-0 transition-all active:scale-95"
                >
                    <Plus className="h-8 w-8 text-white" />
                </Button>
              )}
            </div>

            {/* Top Navigation Tabs */}
            <div className="flex items-center gap-6 mb-8 border-b border-border/50">
              <button 
                onClick={() => setActiveTab("updates")}
                className={`pb-4 text-sm font-black uppercase tracking-widest transition-all relative ${activeTab === "updates" ? "text-[#f54c4c]" : "text-muted-foreground/40 hover:text-muted-foreground"}`}
              >
                Updates
                {activeTab === "updates" && <div className="absolute bottom-0 left-0 right-0 h-1 bg-[#f54c4c] rounded-t-full" />}
              </button>
              <button 
                onClick={() => setActiveTab("performance")}
                className={`pb-4 text-sm font-black uppercase tracking-widest transition-all relative ${activeTab === "performance" ? "text-[#f54c4c]" : "text-muted-foreground/40 hover:text-muted-foreground"}`}
              >
                Performance
                {activeTab === "performance" && <div className="absolute bottom-0 left-0 right-0 h-1 bg-[#f54c4c] rounded-t-full" />}
              </button>
            </div>

            {activeTab === "updates" ? (
              <>
                {isMobile ? (
                  /* Mobile View: Simple List with Pill Filters */
                  <>
                    {/* Pill Filters */}
                    <div className="flex items-center gap-3 mb-10 overflow-x-auto pb-2 scrollbar-hide">
                      <Button 
                        variant={selectedCategory === "all" ? "default" : "outline"}
                        className={`flex items-center gap-2 ${selectedCategory === "all" ? "bg-[#f54c4c] border-transparent" : "bg-white text-foreground border-border"}`}
                        onClick={() => setSelectedCategory("all")}
                      >
                        <Megaphone className="h-4 w-4" />
                        All Updates
                      </Button>
                      <Button 
                        variant={selectedCategory === "assignments" ? "default" : "outline"}
                        className={`flex items-center gap-2 ${selectedCategory === "assignments" ? "bg-[#f54c4c] border-transparent" : "bg-white text-muted-foreground border-border"}`}
                        onClick={() => setSelectedCategory("assignments")}
                      >
                        <ClipboardList className="h-4 w-4" />
                        Assignments
                      </Button>
                      <Button 
                        variant={selectedCategory === "notes" ? "default" : "outline"}
                        className={`flex items-center gap-2 ${selectedCategory === "notes" ? "bg-[#f54c4c] border-transparent" : "bg-white text-muted-foreground border-border"}`}
                        onClick={() => setSelectedCategory("notes")}
                      >
                        <StickyNote className="h-4 w-4" />
                        Notes
                      </Button>
                    </div>

                    {/* Feed Section Header */}
                    <div className="flex items-center justify-between mb-4 px-1">
                      <span className="text-[11px] font-black text-muted-foreground uppercase tracking-widest">Recent Feed</span>
                      <span className="text-[11px] font-black text-muted-foreground uppercase tracking-widest">{updates.length} Total</span>
                    </div>

                    {/* Updates List */}
                    <div className="space-y-4 pb-32" data-testid="updates-grid">
                      {updatesLoading ? (
                        <div className="flex items-center justify-center py-12">
                          <Loader2 className="h-8 w-8 animate-spin text-primary" />
                        </div>
                      ) : updates.length === 0 ? (
                        <Card className="p-12 text-center rounded-3xl border-dashed">
                          <div className="text-muted-foreground">
                            <h3 className="text-lg font-black mb-2">No updates found</h3>
                            <p className="font-medium text-sm">
                              {searchQuery
                                ? "Try adjusting your search terms or filters."
                                : selectedCategory === "all"
                                ? "No updates have been posted yet."
                                : `No ${selectedCategory} updates found.`}
                            </p>
                          </div>
                        </Card>
                      ) : (
                        <div className="space-y-4">
                            {updates.map((update) => (
                                <UpdateCard
                                key={update.id}
                                update={update}
                                onRefresh={refetchUpdates}
                                />
                            ))}
                        </div>
                      )}
                    </div>
                  </>
                ) : (
                  /* Desktop View: Accordion Grouping */
                  <Accordion type="multiple" defaultValue={["assignments", "notes", "general"]} className="space-y-6 pb-32">
                    {/* Assignments Section */}
                    {(desktopGroupedUpdates.assignments?.length ?? 0) > 0 && (
                      <AccordionItem value="assignments" className="border-none">
                        <AccordionTrigger className="hover:no-underline py-4 px-2 hover:bg-slate-50/50 rounded-xl transition-all">
                          <div className="flex items-center gap-3">
                            <div className="bg-[#f3e8ff] p-2 rounded-lg">
                              <ClipboardList className="h-5 w-5 text-[#a855f7]" />
                            </div>
                            <h3 className="text-lg font-black tracking-tight text-foreground">Assignments</h3>
                            <Badge variant="secondary" className="bg-[#f3e8ff] text-[#a855f7] border-transparent font-bold">
                              {desktopGroupedUpdates.assignments?.length}
                            </Badge>
                          </div>
                        </AccordionTrigger>
                        <AccordionContent className="pt-4 px-2">
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {desktopGroupedUpdates.assignments?.map((update) => (
                              <UpdateCard
                                key={update.id}
                                update={update}
                                onRefresh={refetchUpdates}
                              />
                            ))}
                          </div>
                        </AccordionContent>
                      </AccordionItem>
                    )}

                    {/* Notes Section */}
                    {(desktopGroupedUpdates.notes?.length ?? 0) > 0 && (
                      <AccordionItem value="notes" className="border-none">
                        <AccordionTrigger className="hover:no-underline py-4 px-2 hover:bg-slate-50/50 rounded-xl transition-all">
                          <div className="flex items-center gap-3">
                            <div className="bg-[#e0f2fe] p-2 rounded-lg">
                              <StickyNote className="h-5 w-5 text-[#3b82f6]" />
                            </div>
                            <h3 className="text-lg font-black tracking-tight text-foreground">Study Notes</h3>
                            <Badge variant="secondary" className="bg-[#e0f2fe] text-[#3b82f6] border-transparent font-bold">
                              {desktopGroupedUpdates.notes?.length}
                            </Badge>
                          </div>
                        </AccordionTrigger>
                        <AccordionContent className="pt-4 px-2">
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {desktopGroupedUpdates.notes?.map((update) => (
                              <UpdateCard
                                key={update.id}
                                update={update}
                                onRefresh={refetchUpdates}
                              />
                            ))}
                          </div>
                        </AccordionContent>
                      </AccordionItem>
                    )}

                    {/* General Section */}
                    {(desktopGroupedUpdates.general?.length ?? 0) > 0 && (
                      <AccordionItem value="general" className="border-none">
                        <AccordionTrigger className="hover:no-underline py-4 px-2 hover:bg-slate-50/50 rounded-xl transition-all">
                          <div className="flex items-center gap-3">
                            <div className="bg-[#fee2e2] p-2 rounded-lg">
                              <Megaphone className="h-5 w-5 text-[#f54c4c]" />
                            </div>
                            <h3 className="text-lg font-black tracking-tight text-foreground">Announcements</h3>
                            <Badge variant="secondary" className="bg-[#fee2e2] text-[#f54c4c] border-transparent font-bold">
                              {desktopGroupedUpdates.general?.length}
                            </Badge>
                          </div>
                        </AccordionTrigger>
                        <AccordionContent className="pt-4 px-2">
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {desktopGroupedUpdates.general?.map((update) => (
                              <UpdateCard
                                key={update.id}
                                update={update}
                                onRefresh={refetchUpdates}
                              />
                            ))}
                          </div>
                        </AccordionContent>
                      </AccordionItem>
                    )}

                    {updates.length === 0 && (
                      <Card className="p-12 text-center rounded-3xl border-dashed">
                        <div className="text-muted-foreground">
                          <h3 className="text-lg font-black mb-2">No updates found</h3>
                          <p className="font-medium text-sm">
                            No updates have been posted yet.
                          </p>
                        </div>
                      </Card>
                    )}
                  </Accordion>
                )}
                
                {/* Load More Button */}
                {updates.length > 0 && hasNextPage && isMobile && (
                  <div className="mt-8 mb-16 text-center">
                    <Button
                      variant="outline"
                      className="bg-[#f1f5f9] border-transparent text-muted-foreground font-black text-xs h-14 px-8 rounded-2xl active:scale-95"
                      onClick={() => fetchNextPage()}
                      disabled={isFetchingNextPage}
                    >
                      {isFetchingNextPage ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Loading...
                        </>
                      ) : (
                        "LOAD MORE UPDATES"
                      )}
                    </Button>
                  </div>
                )}
              </>
            ) : (
              <div className="pb-32">
                <PerformanceDashboard />
              </div>
            )}
          </div>
        </main>
      </div>

      {/* Bottom Action Bar */}
      <div className="hidden md:flex fixed bottom-6 left-1/2 -translate-x-1/2 w-[90%] max-w-lg z-50 items-center gap-3">
        <div className="flex-1 bg-white border border-border shadow-2xl rounded-3xl h-16 flex items-center px-6 gap-3 group focus-within:ring-2 focus-within:ring-[#f54c4c]/50 transition-all">
          <Search className="h-5 w-5 text-muted-foreground/60" />
          <input 
            type="text" 
            placeholder="Search" 
            className="flex-1 outline-none font-black text-foreground placeholder:text-muted-foreground/40 bg-transparent"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <Button className="hidden md:flex bg-[#f54c4c] hover:bg-[#d43f3f] text-white font-black h-16 px-8 rounded-3xl shadow-2xl items-center gap-2 active:scale-95 transition-all">
          <Megaphone className="h-5 w-5 fill-current" />
          Manage Alerts
        </Button>
      </div>

      {/* Mobile Bottom Navigation - removed for this high-fidelity view or moved */}
      {/* {isMobile && (
        <MobileBottomNav
          selectedCategory={selectedCategory}
          onCategoryChange={setSelectedCategory}
          stats={stats}
        />
      )} */}

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
    </ErrorBoundary>
  );
}
