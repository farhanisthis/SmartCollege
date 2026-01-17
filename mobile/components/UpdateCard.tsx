import { View, Text, TouchableOpacity, Linking } from "react-native";
import { format } from "date-fns";
import { 
  ClipboardList, StickyNote, Presentation, Megaphone, 
  FileText, Eye, Download, Trash
} from "lucide-react-native";
import { UpdateWithAuthor } from "../src/shared/schema";
import { useAuth } from "../src/lib/auth";
import { getApiUrl } from "../src/lib/api";

interface UpdateCardProps {
  update: UpdateWithAuthor;
  onRefresh?: () => void;
}

const categoryConfig = {
  assignments: {
    icon: ClipboardList,
    bg: "bg-purple-100",
    color: "#a855f7",
    label: "Exam",
  },
  notes: {
    icon: StickyNote,
    bg: "bg-blue-100",
    color: "#3b82f6",
    label: "Notes",
  },
  presentations: {
    icon: Presentation,
    bg: "bg-yellow-100",
    color: "#ca8a04",
    label: "Presentation",
  },
  general: {
    icon: Megaphone,
    bg: "bg-red-100",
    color: "#f54c4c",
    label: "General",
  },
};

export default function UpdateCard({ update }: UpdateCardProps) {
  const { user } = useAuth();
  const config = categoryConfig[update.category] || categoryConfig.general;
  const Icon = config.icon;

  const handleFilePress = (filename: string) => {
    // Open in browser to let OS handle it
    const url = `${getApiUrl()}/uploads/${filename}`;
    Linking.openURL(url);
  };

  return (
    <View className="bg-card border border-border rounded-xl p-4 mb-4 shadow-sm">
        {/* Header */}
        <View className="flex-row justify-between items-start mb-3">
            <View className="flex-row flex-1">
                <View className={`w-10 h-10 ${config.bg} rounded-full items-center justify-center mr-3`}>
                    <Icon size={20} color={config.color} />
                </View>
                <View className="flex-1">
                     <View className="flex-row items-center flex-wrap gap-2 mb-1">
                        <View className={`px-2 py-0.5 rounded-full ${config.bg}`}>
                             <Text style={{ color: config.color }} className="text-xs font-medium">{config.label}</Text>
                        </View>
                         {update.dueDate && (
                             <View className="px-2 py-0.5 rounded-full bg-red-500/10 border border-red-500/20">
                                 <Text className="text-xs text-red-500 font-medium">
                                     Due {format(new Date(update.dueDate), "MMM d")}
                                 </Text>
                             </View>
                         )}
                     </View>
                     <Text className="text-lg font-bold text-foreground leading-6">{update.title}</Text>
                </View>
            </View>
        </View>

        {/* Content */}
        <Text className="text-muted-foreground mb-4 leading-5 text-sm">
            {update.description || update.content}
        </Text>

        {/* Files */}
        {update.files && update.files.length > 0 && (
            <View className="flex-row flex-wrap gap-2 mb-4">
                {update.files.map((file: any) => (
                    <TouchableOpacity 
                        key={file.id}
                        className="flex-row items-center bg-secondary rounded-lg px-3 py-2 border border-border"
                        onPress={() => handleFilePress(file.filename)}
                    >
                        <FileText size={14} color="#a3a3a3" />
                        <Text className="text-sm text-foreground ml-2">{file.originalName}</Text>
                    </TouchableOpacity>
                ))}
            </View>
        )}

        {/* Footer */}
        <View className="flex-row justify-between items-center pt-3 border-t border-border">
            <View className="flex-row items-center">
                 <View className="w-6 h-6 rounded-full bg-primary/10 items-center justify-center mr-2">
                     <Text className="text-xs font-bold text-foreground">
                         {update.author.name.charAt(0)}
                     </Text>
                 </View>
                     <Text className="text-xs text-muted-foreground font-medium">
                     {update.author.name} • {update.createdAt ? format(new Date(update.createdAt), "MMM d") : "Just now"}
                 </Text>
            </View>
            
            <View className="flex-row items-center gap-3">
                 <View className="flex-row items-center">
                     <Eye size={14} color="#a3a3a3" />
                     <Text className="text-xs text-muted-foreground ml-1">{update.viewCount}</Text>
                 </View>
            </View>
        </View>
    </View>
  );
}
