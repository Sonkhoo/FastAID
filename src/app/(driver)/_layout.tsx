import { Stack } from "expo-router";

export default function DriverLayout({ children }: { children: React.ReactNode }) {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      {children}
    </Stack>
  );
}