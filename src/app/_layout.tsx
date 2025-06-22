import { Stack } from "expo-router";
import { ActivityIndicator, View } from "react-native";
import { AuthProvider, useAuth } from "../contexts/AuthContext";

function RootLayoutNav() {
  const { session, user, isDriver, loading } = useAuth();

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#DC2626" />
      </View>
    );
  }

  return (
    <Stack screenOptions={{ headerShown: false }}>
      {session && user ? (
        // User is authenticated and exists in database
        isDriver ? (
          // User is a driver
          <Stack.Screen name="(driver)" />
        ) : (
          // User is a regular user
          <Stack.Screen name="(user)" />
        )
      ) : (
       // User is not authenticated or doesn't exist in database
        <Stack.Screen name="(auth)" />
      )}
    </Stack>
  );
}

export default function RootLayout() {
  return (
    <AuthProvider>
      <RootLayoutNav />
    </AuthProvider>
  );
}
