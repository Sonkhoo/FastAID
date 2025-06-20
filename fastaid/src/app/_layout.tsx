import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as React from 'react';
import { StatusBar } from 'react-native';
import { AuthProvider } from '../contexts/AuthContext'
import '../../global.css';

export default function RootLayout() {
  const [loaded] = useFonts({
    SpaceMono: require('../../assets/fonts/SpaceMono-Regular.ttf'),
  });

  if (!loaded) {
    return null;
  }

  return (
      <AuthProvider>
      <ThemeProvider value={DefaultTheme}>
      <Stack
        screenOptions={{
          headerShown: false,
          navigationBarHidden: true,
        }}
        initialRouteName="(auth)"
      >
        <Stack.Screen
          name="(auth)"
          options={{
            headerShown: false,
            navigationBarHidden: true,
          }}
        />
        <Stack.Screen
          name="(user)"
          options={{
            headerShown: false,
            navigationBarHidden: true,
          }}
        />
        <Stack.Screen
          name="(driver)"
          options={{
            headerShown: false,
            navigationBarHidden: true,
          }}
        />
        <Stack.Screen name="+not-found" />
      </Stack>
      <StatusBar barStyle="dark-content" />
    </ThemeProvider>
    </AuthProvider>
  );
}