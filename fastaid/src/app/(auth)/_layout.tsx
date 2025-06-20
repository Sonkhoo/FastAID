import { AuthProvider } from "@/src/contexts/AuthContext";
import { Stack } from "expo-router";
import { useAuth } from "@/src/contexts/AuthContext";
export default function AuthLayout() {
    const { user } = useAuth();
    
    if (user) {
        return <Stack.Screen name="(user)/index" />;
    }
    
  return (
         <Stack
      screenOptions={{
        headerShown: false,
        navigationBarHidden: true,
      }}
    >
      <Stack.Screen name="SignUp" />
      <Stack.Screen name="SignIn" />
      <Stack.Screen name="OtpScreen" />
    </Stack>
  );
}