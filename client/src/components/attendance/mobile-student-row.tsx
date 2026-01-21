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
  profilePicture?: string;
}

export function MobileStudentRow({
  name,
  enrollment,
  status,
  onMarkPresent,
  onMarkAbsent,
  profilePicture,
}: MobileStudentRowProps) {
  return (
    <div className="flex items-center justify-between p-2 bg-white border-b border-gray-100 last:border-0">
      <div className="flex items-center gap-2.5">
        <Avatar className="h-8 w-8 bg-gray-50 border border-gray-100">
          <AvatarImage src={profilePicture || `https://api.dicebear.com/7.x/avataaars/svg?seed=${enrollment}`} className="object-cover" />
          <AvatarFallback className="text-gray-400 font-medium text-[10px]">
            {name.charAt(0)}
          </AvatarFallback>
        </Avatar>
        <div>
          <h4 className="font-bold text-gray-900 text-[11px] leading-tight">{name}</h4>
          <p className="text-[9px] text-gray-400 font-medium truncate max-w-[90px] leading-tight mt-0.5">
            {enrollment}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-1.5">
        {/* Present Button */}
        <Button
          variant="ghost"
          size="icon"
          className={cn(
            "h-7 w-7 rounded-full transition-all duration-200 border",
            status === "present"
              ? "bg-green-500 border-green-500 text-white shadow-sm shadow-green-200"
              : "bg-white border-gray-200 text-gray-300 hover:border-green-400 hover:bg-green-50"
          )}
          onClick={onMarkPresent}
        >
          <Check className="h-3.5 w-3.5 font-bold" strokeWidth={3} />
        </Button>

        {/* Absent Button */}
        <Button
          variant="ghost"
          size="icon"
          className={cn(
            "h-7 w-7 rounded-full transition-all duration-200 border",
            status === "absent"
              ? "bg-red-500 border-red-500 text-white shadow-sm shadow-red-200"
              : "bg-white border-gray-200 text-gray-300 hover:border-red-400 hover:bg-red-50"
          )}
          onClick={onMarkAbsent}
        >
            <div className={cn("h-2.5 w-2.5 rounded-full border-2", status === "absent" ? "border-white bg-white" : "border-current")} />
        </Button>
      </div>
    </div>
  );
}
