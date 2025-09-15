import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  LayoutGrid,
  ClipboardList,
  StickyNote,
  Presentation,
  Megaphone,
} from "lucide-react";
import { DashboardStats } from "@shared/schema";

interface MobileBottomNavProps {
  selectedCategory: string;
  onCategoryChange: (category: string) => void;
  stats?: DashboardStats;
}

const categoryConfig = {
  all: {
    icon: LayoutGrid,
    label: "All",
    color: "bg-primary text-primary-foreground",
  },
  assignments: {
    icon: ClipboardList,
    label: "Tasks",
    color: "bg-chart-1/20 text-chart-1",
  },
  notes: {
    icon: StickyNote,
    label: "Notes",
    color: "bg-chart-2/20 text-chart-2",
  },
  presentations: {
    icon: Presentation,
    label: "Events",
    color: "bg-chart-3/20 text-chart-3",
  },
  general: {
    icon: Megaphone,
    label: "General",
    color: "bg-chart-5/20 text-chart-5",
  },
};

export default function MobileBottomNav({
  selectedCategory,
  onCategoryChange,
  stats,
}: MobileBottomNavProps) {
  const getCategoryCount = (category: string) => {
    if (!stats) return 0;
    return stats.counts[category as keyof typeof stats.counts] || 0;
  };

  const renderCategoryButton = ([category, config]: [string, any]) => {
    const Icon = config.icon;
    const isSelected = selectedCategory === category;
    const count = getCategoryCount(category);

    return (
      <Button
        key={category}
        variant="ghost"
        size="sm"
        className={`flex flex-col items-center justify-center p-2 h-auto min-w-0 space-y-1 ${
          isSelected ? "text-primary bg-primary/10" : "text-muted-foreground"
        }`}
        onClick={() => onCategoryChange(category)}
        data-testid={`mobile-category-${category}`}
      >
        <div className="relative">
          <Icon className="h-4 w-4" />
          {count > 0 && (
            <Badge
              variant="destructive"
              className="absolute -top-2 -right-2 h-4 w-4 p-0 flex items-center justify-center text-xs"
              data-testid={`mobile-count-${category}`}
            >
              {count > 99 ? "99+" : count}
            </Badge>
          )}
        </div>
        <span className="text-xs font-medium truncate">{config.label}</span>
      </Button>
    );
  };

  return (
    <div className="lg:hidden fixed bottom-0 left-0 right-0 z-50 bg-card border-t border-border safe-area-padding-bottom">
      <div className="flex items-center justify-around px-2 py-2">
        {/* All categories in a single row */}
        {Object.entries(categoryConfig).map(renderCategoryButton)}
      </div>
    </div>
  );
}
