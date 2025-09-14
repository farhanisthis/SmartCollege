import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { 
  LayoutGrid, 
  ClipboardList, 
  StickyNote, 
  Presentation, 
  Megaphone,
  FileText,
  Clock
} from 'lucide-react';
import { DashboardStats } from '@shared/schema';

interface SidebarProps {
  selectedCategory: string;
  onCategoryChange: (category: string) => void;
  stats?: DashboardStats;
}

const categoryConfig = {
  all: { icon: LayoutGrid, label: 'All Updates', color: 'bg-primary text-primary-foreground' },
  assignments: { icon: ClipboardList, label: 'Assignments', color: 'bg-chart-1/20 text-chart-1' },
  notes: { icon: StickyNote, label: 'Notes', color: 'bg-chart-2/20 text-chart-2' },
  presentations: { icon: Presentation, label: 'Presentations', color: 'bg-chart-3/20 text-chart-3' },
  general: { icon: Megaphone, label: 'General Updates', color: 'bg-chart-5/20 text-chart-5' },
};

export default function Sidebar({ selectedCategory, onCategoryChange, stats }: SidebarProps) {
  const getCategoryCount = (category: string) => {
    if (!stats) return 0;
    return stats.counts[category as keyof typeof stats.counts] || 0;
  };

  return (
    <aside className="hidden lg:block w-64 bg-card border-r border-border h-[calc(100vh-4rem)] sticky top-16" data-testid="sidebar">
      <div className="p-6">
        {/* Quick Stats */}
        <div className="mb-6 space-y-3">
          <Card className="bg-muted p-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Total Updates</span>
              <span className="text-lg font-semibold text-foreground" data-testid="stat-total">
                {stats?.totalUpdates || 0}
              </span>
            </div>
          </Card>
          <Card className="bg-muted p-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">This Week</span>
              <span className="text-lg font-semibold text-primary" data-testid="stat-week">
                {stats?.thisWeek || 0}
              </span>
            </div>
          </Card>
        </div>

        {/* Category Navigation */}
        <nav className="space-y-1" data-testid="category-nav">
          {Object.entries(categoryConfig).map(([category, config]) => {
            const Icon = config.icon;
            const isSelected = selectedCategory === category;
            const count = getCategoryCount(category);

            return (
              <Button
                key={category}
                variant="ghost"
                className={`w-full justify-start space-x-3 ${
                  isSelected
                    ? 'bg-primary text-primary-foreground font-medium'
                    : 'text-muted-foreground hover:text-foreground hover:bg-accent'
                }`}
                onClick={() => onCategoryChange(category)}
                data-testid={`category-${category}`}
              >
                <Icon className="h-4 w-4" />
                <span className="flex-1 text-left">{config.label}</span>
                <Badge
                  variant={isSelected ? "secondary" : "outline"}
                  className={isSelected ? "bg-primary-foreground text-primary" : ""}
                  data-testid={`count-${category}`}
                >
                  {count}
                </Badge>
              </Button>
            );
          })}
        </nav>

        {/* Recent Files */}
        <div className="mt-8">
          <h3 className="text-sm font-medium text-muted-foreground mb-3" data-testid="recent-files-title">
            Recent Files
          </h3>
          <div className="space-y-2" data-testid="recent-files-list">
            {/* Placeholder for recent files - in a real app this would come from an API */}
            <div className="flex items-center space-x-3 p-2 hover:bg-muted rounded-lg transition-colors cursor-pointer">
              <FileText className="h-4 w-4 text-destructive" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground truncate">Assignment_3.pdf</p>
                <p className="text-xs text-muted-foreground flex items-center">
                  <Clock className="h-3 w-3 mr-1" />
                  2 hours ago
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
}
