import { useState, useEffect } from "react";
import { View, Text, TextInput, TouchableOpacity, KeyboardAvoidingView, Platform, ActivityIndicator, Alert } from "react-native";
import { useAuth } from "../../src/lib/auth";
import { Stack } from "expo-router";
import { getApiUrl, setApiUrl, loadApiUrl } from "../../src/lib/api";

export default function LoginScreen() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const { login } = useAuth();
  const [loading, setLoading] = useState(false);
  
  // IP Config State
  const [showIpConfig, setShowIpConfig] = useState(false);
  const [customIp, setCustomIp] = useState("");

  // Health Check State
  const [serverStatus, setServerStatus] = useState<{ status: string; color: string; ip?: string }>({ 
      status: "Checking connection...", 
      color: "text-yellow-500" 
  });

  const checkHealth = async () => {
      await loadApiUrl(); // ensure latest is loaded
      const baseUrl = getApiUrl();
      try {
          console.log(`Checking health at ${baseUrl}/api/health`);
          setServerStatus({ status: "Checking...", color: "text-yellow-500", ip: baseUrl });
          
          const res = await fetch(`${baseUrl}/api/health`, {
              headers: { 
                  'Cache-Control': 'no-cache',
                  'Bypass-Tunnel-Reminder': 'true'
              }
          });
          if (res.ok) {
              const data = await res.json();
              setServerStatus({ status: "Online", color: "text-green-500", ip: baseUrl });
          } else {
              const text = await res.text();
              setServerStatus({ status: `Err: ${res.status}`, color: "text-red-500", ip: `${baseUrl} - ${text.slice(0, 20)}` });
          }
      } catch (e: any) {
          setServerStatus({ 
              status: "Failed", 
              color: "text-red-500", 
              ip: `${baseUrl}\n${e.message}` 
          });
      }
  };

  const testInternet = async () => {
      try {
          const res = await fetch('https://www.google.com');
          if (res.ok) Alert.alert("Internet OK", "Can reach Google.com");
          else Alert.alert("Internet Error", `Google returned ${res.status}`);
      } catch (e: any) {
          Alert.alert("No Internet", e.message);
      }
  };

  useEffect(() => {
      checkHealth();
  }, []);
  
  const saveNewIp = async () => {
      if (!customIp) {
           setShowIpConfig(false);
           return;
      }
      const newUrl = await setApiUrl(customIp);
      setShowIpConfig(false);
      setCustomIp("");
      checkHealth(); // recheck with new IP
      Alert.alert("Server Updated", `Now connecting to: ${newUrl}`);
  };

  const handleLogin = async () => {
    if (!username || !password) {
      setError("Please enter both username and password");
      return;
    }

    try {
      setLoading(true);
      setError("");
      await login(username, password);
    } catch (e: any) {
      setError(e.message || "Invalid credentials");
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView 
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      className="flex-1 bg-background justify-center px-6"
      style={{ flex: 1, backgroundColor: '#0a0a0a' }}
    >
      <Stack.Screen options={{ headerShown: false }} />
      
      {/* Network Status Indicator */}
      <View className="absolute top-12 left-0 right-0 items-center z-50 px-4">
          <TouchableOpacity 
            onPress={() => setShowIpConfig(!showIpConfig)}
            className="bg-card/90 px-4 py-2 rounded-xl border border-border w-full items-center"
          >
              <Text className={`text-xs font-bold ${serverStatus.color} text-center`}>
                  {serverStatus.status}
              </Text>
              <Text className="text-[10px] text-muted-foreground text-center mt-1">
                  {serverStatus.ip}
              </Text>
          </TouchableOpacity>

          {showIpConfig && (
              <View className="mt-2 bg-card p-4 rounded-xl border border-border w-3/4 shadow-lg">
                  <Text className="text-foreground text-sm font-bold mb-2">Set Server IP Address</Text>
                  <Text className="text-muted-foreground text-xs mb-2">Enter your PC's IP (e.g., 192.168.1.5)</Text>
                  <TextInput 
                      className="bg-input text-foreground p-2 rounded border border-border mb-2"
                      placeholder="e.g. 192.168.1.5"
                      placeholderTextColor="#a3a3a3"
                      value={customIp}
                      onChangeText={setCustomIp}
                      keyboardType="numeric" 
                  />
                  <View className="flex-row justify-end space-x-2">
                       <TouchableOpacity onPress={testInternet} className="px-3 py-2 mr-auto">
                           <Text className="text-blue-500 text-xs">Test Google</Text>
                       </TouchableOpacity>
                       <TouchableOpacity onPress={() => setShowIpConfig(false)} className="px-3 py-2">
                           <Text className="text-muted-foreground">Cancel</Text>
                       </TouchableOpacity>
                       <TouchableOpacity onPress={saveNewIp} className="bg-primary px-3 py-2 rounded">
                           <Text className="text-primary-foreground font-bold">Save</Text>
                       </TouchableOpacity>
                  </View>
              </View>
          )}
      </View>
      
      <View className="mb-10 items-center">
        <View className="h-16 w-16 bg-primary rounded-xl items-center justify-center mb-4">
           <Text className="text-primary-foreground text-3xl font-bold">S</Text>
        </View>
        <Text className="text-3xl font-bold text-foreground mb-2">SmartCollege</Text>
        <Text className="text-muted-foreground text-center">
          Academic Management System
        </Text>
      </View>

      <View className="space-y-4">
        <View>
          <Text className="text-foreground mb-2 font-medium">Username</Text>
          <TextInput
            className="w-full bg-input text-foreground border border-border rounded-lg p-4 text-base"
            placeholder="Enter username"
            placeholderTextColor="#9CA3AF"
            value={username}
            onChangeText={setUsername}
            autoCapitalize="none"
          />
        </View>

        <View>
          <Text className="text-foreground mb-2 font-medium">Password</Text>
          <TextInput
            className="w-full bg-input text-foreground border border-border rounded-lg p-4 text-base"
            placeholder="Enter password"
            placeholderTextColor="#9CA3AF"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
          />
        </View>

        {error ? (
          <Text className="text-destructive text-sm">{error}</Text>
        ) : null}

        <TouchableOpacity 
          className={`w-full bg-primary p-4 rounded-lg items-center mt-4 ${loading ? 'opacity-70' : ''}`}
          onPress={handleLogin}
          disabled={loading}
        >
          {loading ? (
             <ActivityIndicator color="#fff" />
          ) : (
            <Text className="text-primary-foreground font-bold text-lg">
              Sign In
            </Text>
          )}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}
