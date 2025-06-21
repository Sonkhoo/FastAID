import { Redirect, Stack } from "expo-router";
import { useAuth } from "../../contexts/AuthContext";
import { useEffect, useState } from "react";
export default function AuthLayout() {

    const [isLoading, setIsLoading] = useState(true);
    const { session } = useAuth();
    console.log('session at auth layout',session)
    useEffect(() => {
        if (session && session.user) {
            setIsLoading(false);
        }
    }, [session]);
    if (isLoading) {
        return null;
    }
    if (session) {
        return <Redirect href="/(user)" />;
    }
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        navigationBarHidden: true,
      }}
      initialRouteName="SignUp"
    >
   </Stack>
);
}