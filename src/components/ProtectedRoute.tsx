import React from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useRouter } from 'expo-router';
import { ActivityIndicator } from 'react-native';
import { View } from 'react-native';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const { user, loading } = useAuth();
  const router = useRouter();

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center">
        <ActivityIndicator size="large" color="#0000ff" />
      </View>
    );
  }

  if (!user) {
    router.replace('/(auth)/login-screen');
    return null;
  }

  return <>{children}</>;
};
