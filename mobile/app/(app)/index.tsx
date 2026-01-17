import { useState } from "react";
import { View, FlatList, ActivityIndicator, Text, TouchableOpacity, RefreshControl, TextInput, ScrollView } from "react-native";
import { useQuery } from "@tanstack/react-query";
import { Stack, useRouter } from "expo-router";
import { Plus, Search } from "lucide-react-native";
import { useAuth } from "../../src/lib/auth";
import UpdateCard from "../../components/UpdateCard";
import { UpdateWithAuthor } from "../../src/shared/schema";
import { fetchWithCookie } from "../../src/lib/api";

import { useColorScheme } from "nativewind";

export default function UpdatesScreen() {
  const { user } = useAuth();
  const router = useRouter();
  const { colorScheme } = useColorScheme();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  
  const { data: updates, isLoading, refetch, isRefetching } = useQuery<UpdateWithAuthor[]>({
    queryKey: ["api", "updates"],
    queryFn: async () => {
        const res = await fetchWithCookie("/api/updates");
        if (!res.ok) throw new Error("Failed to fetch");
        return res.json();
    }
  });

  const categories = ["all", "assignments", "notes", "presentations", "general"];

  const filteredUpdates = updates?.filter(update => {
      const matchesCategory = selectedCategory === "all" || update.category === selectedCategory;
      const query = searchQuery.toLowerCase();
      const matchesSearch = !searchQuery || 
          update.title.toLowerCase().includes(query) || 
          update.content.toLowerCase().includes(query) ||
          update.author.name.toLowerCase().includes(query);
      
      return matchesCategory && matchesSearch;
  });

  return (
    <View className="flex-1 bg-background pt-12">
      <Stack.Screen options={{ headerShown: false }} />
      
      {/* Custom Header */}
      <View className="px-6 pb-4">
        <View className="flex-row justify-between items-start">
            <View>
                <View className="flex-row items-center gap-2">
                    <View className="w-8 h-8 bg-red-500 rounded-full items-center justify-center">
                        <Text className="text-white font-bold">SC</Text>
                    </View>
                    <Text className="text-red-500 font-bold tracking-widest text-xs uppercase">Smart College</Text>
                </View>
                <Text className="text-4xl font-black text-foreground mt-1">Updates</Text>
                <Text className="text-muted-foreground font-medium text-xs">Semester 5 • Computer Science</Text>
            </View>
            <View className="w-10 h-10 rounded-full border border-red-500/20 items-center justify-center">
                 <Text className="text-red-500 font-bold">FA</Text>
            </View>
        </View>

        {/* Tab Switcher (Visual) */}
        <View className="flex-row mt-6 gap-6 border-b border-gray-100 pb-1">
            <View className="border-b-2 border-red-500 pb-2">
                <Text className="text-red-500 font-black tracking-widest uppercase text-xs">UPDATES</Text>
            </View>
            <TouchableOpacity onPress={() => router.push("/performance")}>
                <Text className="text-muted-foreground font-bold tracking-widest uppercase text-xs pb-2">PERFORMANCE</Text>
            </TouchableOpacity>
        </View>
      </View>
      
      {/* Category Pills */}
      <View className="px-6 mb-4">
          <ScrollView horizontal showsHorizontalScrollIndicator={false} className="flex-row gap-3 overflow-visible">
              {categories.map(cat => {
                  let label = cat;
                  if (cat === "all") label = "All Updates";
                  if (cat === "assignments") label = "Assignments";
                  if (cat === "presentations") label = "Presentations";
                  
                  const isSelected = selectedCategory === cat;
                  return (
                  <TouchableOpacity 
                    key={cat}
                    onPress={() => setSelectedCategory(cat)}
                    className={`px-5 py-2.5 rounded-full border ${isSelected ? 'bg-red-500 border-red-500 shadow-sm shadow-red-200' : 'bg-white border-gray-200'}`}
                  >
                      <Text className={`capitalize font-bold text-xs ${isSelected ? 'text-white' : 'text-gray-500'}`}>
                          {label}
                      </Text>
                  </TouchableOpacity>
              )})}
          </ScrollView>
      </View>

      <View className="flex-row justify-between items-center px-6 mb-2">
          <Text className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Recent Feed</Text>
          <Text className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{filteredUpdates?.length || 0} Total</Text>
      </View>

      {isLoading ? (
        <View className="flex-1 justify-center items-center">
            <ActivityIndicator size="large" color="#ef4444" />
        </View>
      ) : (
        <FlatList
          data={filteredUpdates}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => <UpdateCard update={item} />}
          contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 100, paddingTop: 8 }}
          refreshControl={
              <RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor="#ef4444" />
          }
          ListEmptyComponent={
              <View className="mt-10 items-center">
                  <Text className="text-muted-foreground font-medium">No updates found</Text>
              </View>
          }
        />
      )}

      {/* FAB for CR */}
      {user?.role === "cr" && (
        <TouchableOpacity 
            className="absolute bottom-6 right-6 w-14 h-14 bg-red-500 rounded-full items-center justify-center shadow-xl shadow-red-300 z-50 elevation-5"
            activeOpacity={0.8}
            onPress={() => router.push("/create-update")}
        >
            <Plus color="#ffffff" size={24} />
        </TouchableOpacity>
      )}
    </View>
  );
}
