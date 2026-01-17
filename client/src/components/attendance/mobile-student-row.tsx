import React from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Check, Circle } from "lucide-react";

interface MobileStudentRowProps {
  name: string;
  enrollment: string;
  status: "present" | "absent" | undefined;
  onMarkPresent: () => void;
  onMarkAbsent: () => void;
}

export function MobileStudentRow({
  name,
  enrollment,
  status,
  onMarkPresent,
  onMarkAbsent,
}: MobileStudentRowProps) {
  return (
    <div className="flex items-center justify-between p-4 bg-white border-b border-gray-100 last:border-0">
      <div className="flex items-center gap-4">
        <Avatar className="h-12 w-12 bg-gray-50 border border-gray-100">
          <AvatarImage src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${enrollment}`} />
          <AvatarFallback className="text-gray-400 font-medium">
            {name.charAt(0)}
          </AvatarFallback>
        </Avatar>
        <div>
          <h4 className="font-bold text-gray-900 text-sm">{name}</h4>
          <p className="text-xs text-gray-400 font-medium truncate max-w-[120px]">
            {enrollment}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-3">
        {/* Present Button */}
        <Button
          variant="ghost"
          size="icon"
          className={cn(
            "h-10 w-10 rounded-full transition-all duration-200 border",
            status === "present"
              ? "bg-green-500 border-green-500 text-white shadow-md shadow-green-200"
              : "bg-white border-gray-200 text-gray-300 hover:border-green-400 hover:bg-green-50"
          )}
          onClick={onMarkPresent}
        >
          <Check className="h-5 w-5 font-bold" strokeWidth={3} />
        </Button>

        {/* Absent Button */}
        <Button
          variant="ghost"
          size="icon"
          className={cn(
            "h-10 w-10 rounded-full transition-all duration-200 border",
            status === "absent"
              ? "bg-red-500 border-red-500 text-white shadow-md shadow-red-200"
              : "bg-white border-gray-200 text-gray-300 hover:border-red-400 hover:bg-red-50"
          )}
          onClick={onMarkAbsent}
        >
            <div className={cn("h-4 w-4 rounded-full border-2", status === "absent" ? "border-white bg-white" : "border-current")} />
            {/* Or use an X icon? Mockup shows circles but typical 'Absent' is Red. I'll use a visual cue. */}
        </Button>
      </div>
    </div>
  );
}
