import { View, Text, TouchableOpacity, ScrollView, Switch } from "react-native";
import { Stack } from "expo-router";
import { useAuth } from "../../src/lib/auth";
import { LogOut, User as UserIcon, Book, Hash, Moon, Sun } from "lucide-react-native";
import { useColorScheme } from "nativewind";

export default function ProfileScreen() {
  const { user, logout } = useAuth();
  const { colorScheme, toggleColorScheme } = useColorScheme();

  if (!user) return null;

  return (
    <ScrollView className="flex-1 bg-background">
      <Stack.Screen options={{ 
          title: "Profile",
          headerTitleStyle: { color: colorScheme === 'dark' ? "#ffffff" : "#09090b", fontWeight: 'bold' },
          headerStyle: { backgroundColor: colorScheme === 'dark' ? "#0a0a0a" : "#ffffff" },
          headerShadowVisible: false,
       }} 
      />

      <View className="items-center py-8 bg-card mb-6 border-b border-border">
          <View className="w-24 h-24 bg-primary/20 rounded-full items-center justify-center mb-4">
              <Text className="text-4xl font-bold text-primary">{user.name.charAt(0)}</Text>
          </View>
          <Text className="text-2xl font-bold text-foreground mb-1">{user.name}</Text>
          <Text className="text-muted-foreground">{user.role === 'cr' ? 'Class Representative' : 'Student'}</Text>
      </View>
      
      <View className="px-4 space-y-4">
          <View className="bg-card p-4 rounded-lg border border-border">
              <View className="flex-row items-center mb-4">
                  <UserIcon size={20} className="text-muted-foreground" />
                  <Text className="text-muted-foreground ml-3 w-24 font-medium">Username</Text>
                  <Text className="text-foreground font-medium flex-1 text-right">{user.username}</Text>
              </View>
              <View className="h-[1px] bg-border my-2" />
              <View className="flex-row items-center mb-4 pt-2">
                  <Book size={20} className="text-muted-foreground" />
                  <Text className="text-muted-foreground ml-3 w-24 font-medium">Class</Text>
                  <Text className="text-foreground font-medium flex-1 text-right">{user.class}</Text>
              </View>
              <View className="h-[1px] bg-border my-2" />
              <View className="flex-row items-center pt-2">
                  <Hash size={20} className="text-muted-foreground" />
                  <Text className="text-muted-foreground ml-3 w-24 font-medium">Roll No</Text>
                  <Text className="text-foreground font-medium flex-1 text-right">{user.rollNumber || "N/A"}</Text>
              </View>
          </View>

          {/* Theme Toggle */}
          <View className="bg-card p-4 rounded-lg border border-border flex-row items-center justify-between">
              <View className="flex-row items-center">
                  {colorScheme === 'dark' ? <Moon size={20} className="text-muted-foreground" /> : <Sun size={20} className="text-muted-foreground" />}
                  <Text className="text-muted-foreground ml-3 font-medium">Dark Mode</Text>
              </View>
              <Switch 
                  value={colorScheme === 'dark'} 
                  onValueChange={toggleColorScheme}
                  trackColor={{ false: '#767577', true: '#262626' }}
                  thumbColor={colorScheme === 'dark' ? '#ffffff' : '#f4f3f4'}
              />
          </View>
          
          <TouchableOpacity 
              className="mt-8 bg-destructive/10 border border-destructive/20 p-4 rounded-lg flex-row items-center justify-center"
              onPress={logout}
          >
              <LogOut size={20} color="#ef4444" />
              <Text className="text-destructive font-bold ml-2">Sign Out</Text>
          </TouchableOpacity>
      </View>
    </ScrollView>
  );
}
