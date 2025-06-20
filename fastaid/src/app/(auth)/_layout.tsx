import { Stack } from "expo-router";

export default function AuthLayout() {
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