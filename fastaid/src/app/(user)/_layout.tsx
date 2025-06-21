import { Redirect, Stack } from "expo-router";
import { useAuth } from "../../contexts/AuthContext";
import { useEffect, useState } from "react";

export default function pLayout() {
    const { session } = useAuth();
    const [isLoading, setIsLoading] = useState(true);
    console.log('session at user layout',session)
    useEffect(() => {
        if (session) {
            setIsLoading(false);
        }
    }, [session]);
    if (isLoading) {
        return null;
    }
    if (!session) {
        return <Redirect href="/(auth)/SignUp" />;
    }

  return <Stack />;
}