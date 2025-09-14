import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import Header from '@/components/layout/header';
import Sidebar from '@/components/layout/sidebar';
import UpdateCard from '@/components/updates/update-card';
import CreateUpdateModal from '@/components/updates/create-update-modal';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card } from '@/components/ui/card';
import { Plus, Search } from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';
import { UpdateWithAuthor, DashboardStats } from '@shared/schema';

export default function Dashboard() {
  const { user } = useAuth();
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [timeFilter, setTimeFilter] = useState('week');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  const { data: updates = [], isLoading: updatesLoading, refetch: refetchUpdates } = useQuery<UpdateWithAuthor[]>({
    queryKey: ['/api/updates', selectedCategory],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (selectedCategory !== 'all') {
        params.append('category', selectedCategory);
      }
      const response = await fetch(`/api/updates?${params}`, {
        credentials: 'include',
      });
      if (!response.ok) throw new Error('Failed to fetch updates');
      return response.json();
    },
  });

  const { data: stats } = useQuery<DashboardStats>({
    queryKey: ['/api/stats/dashboard'],
  });

  const filteredUpdates = updates.filter(update => {
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      return (
        update.title.toLowerCase().includes(query) ||
        update.content.toLowerCase().includes(query) ||
        update.author.name.toLowerCase().includes(query)
      );
    }
    return true;
  });

  const isCR = user?.role === 'cr';

  return (
    <div className="min-h-screen bg-background">
      <Header onCreateUpdate={() => setIsCreateModalOpen(true)} />
      
      <div className="flex">
        <Sidebar
          selectedCategory={selectedCategory}
          onCategoryChange={setSelectedCategory}
          stats={stats}
        />

        <main className="flex-1 p-6 lg:pl-8">
          {/* Page Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-8">
            <div>
              <h2 className="text-2xl font-bold text-foreground" data-testid="page-title">
                Class Updates Dashboard
              </h2>
              <p className="text-muted-foreground mt-1" data-testid="page-subtitle">
                {user?.class}
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

          {/* Search and Filters */}
          <Card className="p-4 mb-6">
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
                <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                  <SelectTrigger className="w-40" data-testid="select-category">
                    <SelectValue placeholder="All Categories" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Categories</SelectItem>
                    <SelectItem value="assignments">Assignments</SelectItem>
                    <SelectItem value="notes">Notes</SelectItem>
                    <SelectItem value="presentations">Presentations</SelectItem>
                    <SelectItem value="general">General</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={timeFilter} onValueChange={setTimeFilter}>
                  <SelectTrigger className="w-32" data-testid="select-time">
                    <SelectValue placeholder="Time" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="week">Last 7 days</SelectItem>
                    <SelectItem value="month">Last 30 days</SelectItem>
                    <SelectItem value="semester">This semester</SelectItem>
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
                  <h3 className="text-lg font-medium mb-2" data-testid="no-updates-title">
                    No updates found
                  </h3>
                  <p data-testid="no-updates-description">
                    {searchQuery
                      ? "Try adjusting your search terms or filters."
                      : selectedCategory === 'all'
                      ? "No updates have been posted yet."
                      : `No ${selectedCategory} updates found.`}
                  </p>
                </div>
              </Card>
            ) : (
              filteredUpdates.map((update) => (
                <UpdateCard
                  key={update.id}
                  update={update}
                  onRefresh={refetchUpdates}
                />
              ))
            )}
          </div>

          {/* Load More Button */}
          {filteredUpdates.length > 0 && (
            <div className="mt-8 text-center">
              <Button
                variant="secondary"
                data-testid="button-load-more"
              >
                Load More Updates
              </Button>
            </div>
          )}
        </main>
      </div>

      {/* Create Update Modal */}
      {isCR && (
        <CreateUpdateModal
          isOpen={isCreateModalOpen}
          onClose={() => setIsCreateModalOpen(false)}
          onSuccess={() => {
            refetchUpdates();
            setIsCreateModalOpen(false);
          }}
        />
      )}
    </div>
  );
}
