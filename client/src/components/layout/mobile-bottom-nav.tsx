import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  LayoutGrid,
  ClipboardList,
  StickyNote,
  Presentation,
  Megaphone,
  Plus,
} from "lucide-react";
import { DashboardStats } from "@shared/schema";
import { useAuth } from "@/hooks/use-auth";

interface MobileBottomNavProps {
  selectedCategory: string;
  onCategoryChange: (category: string) => void;
  onCreateUpdate?: () => void;
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
  onCreateUpdate,
  stats,
}: MobileBottomNavProps) {
  const { user } = useAuth();
  const isCR = user?.role === "cr";

  const getCategoryCount = (category: string) => {
    if (!stats) return 0;
    return stats.counts[category as keyof typeof stats.counts] || 0;
  };

  const categoryEntries = Object.entries(categoryConfig);
  const midPoint = Math.ceil(categoryEntries.length / 2);
  const firstHalf = categoryEntries.slice(0, midPoint);
  const secondHalf = categoryEntries.slice(midPoint);

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
        {/* First half of categories */}
        {firstHalf.map(renderCategoryButton)}

        {/* Create Button for CR users - centered */}
        {isCR && (
          <Button
            size="sm"
            className="flex flex-col items-center justify-center p-3 min-w-0 bg-primary text-primary-foreground rounded-full w-14 h-14 shadow-lg"
            onClick={onCreateUpdate}
            data-testid="mobile-create-update"
          >
            <Plus className="h-6 w-6" />
          </Button>
        )}

        {/* Second half of categories */}
        {secondHalf.map(renderCategoryButton)}
      </div>
    </div>
  );
}
