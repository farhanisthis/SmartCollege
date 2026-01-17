import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import {
  LayoutGrid,
  ClipboardList,
  StickyNote,
  Presentation,
  Megaphone,
  FileText,
  Clock,
} from "lucide-react";
import { DashboardStats } from "@shared/schema";

interface SidebarProps {
  selectedCategory: string;
  onCategoryChange: (category: string) => void;
  stats?: DashboardStats;
}

const categoryConfig = {
  all: {
    icon: LayoutGrid,
    label: "All Updates",
    color: "bg-[#f54c4c]",
    iconColor: "white",
  },
  assignments: {
    icon: ClipboardList,
    label: "Assignments",
    color: "bg-[#f3e8ff]",
    iconColor: "#a855f7",
  },
  notes: {
    icon: StickyNote,
    label: "Notes",
    color: "bg-[#e0f2fe]",
    iconColor: "#3b82f6",
  },
  presentations: {
    icon: Presentation,
    label: "Presentations",
    color: "bg-[#fef9c3]",
    iconColor: "#ca8a04",
  },
  general: {
    icon: Megaphone,
    label: "General Updates",
    color: "bg-[#fee2e2]",
    iconColor: "#f54c4c",
  },
};

export default function Sidebar({
  selectedCategory,
  onCategoryChange,
  stats,
}: SidebarProps) {
  const getCategoryCount = (category: string) => {
    if (!stats) return 0;
    return stats.counts[category as keyof typeof stats.counts] || 0;
  };

  return (
    <aside
      className="hidden lg:block w-64 bg-card border-r border-border h-[calc(100vh-4rem)] sticky top-16"
      data-testid="sidebar"
    >
      <div className="p-6">
        {/* Quick Stats */}
        <div className="mb-6 space-y-3">
          <Card className="bg-muted p-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">
                Total Updates
              </span>
              <span
                className="text-lg font-semibold text-foreground"
                data-testid="stat-total"
              >
                {stats?.totalUpdates || 0}
              </span>
            </div>
          </Card>
          <Card className="bg-muted p-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">This Week</span>
              <span
                className="text-lg font-semibold text-primary"
                data-testid="stat-week"
              >
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
                className={`w-full justify-start space-x-3 mb-2 rounded-2xl h-12 transition-all ${
                  isSelected
                    ? "bg-[#f54c4c] text-white shadow-lg font-bold"
                    : "text-muted-foreground hover:text-foreground hover:bg-[#f1f3f5]"
                }`}
                onClick={() => onCategoryChange(category)}
              >
                <div className={`p-1.5 rounded-lg ${isSelected ? "bg-white/20" : "bg-muted"}`}>
                    <Icon className="h-4 w-4" />
                </div>
                <span className="flex-1 text-left">{config.label}</span>
                <Badge
                  variant={isSelected ? "secondary" : "outline"}
                  className={
                    isSelected ? "bg-primary-foreground text-primary" : ""
                  }
                  data-testid={`count-${category}`}
                >
                  {count}
                </Badge>
              </Button>
            );
          })}
        </nav>

        {/* Recent Files section removed - was hardcoded placeholder */}
      </div>
    </aside>
  );
}
