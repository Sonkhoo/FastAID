import "../../../global.css"
import { SafeAreaView } from "react-native-safe-area-context";
import { useState } from "react";
import { Alert } from "react-native";
import { View } from "react-native";
import { TouchableOpacity } from "react-native";
import { TextInput } from "react-native";
import { router } from 'expo-router';
import supabase from '@/src/lib/supabaseClient';
import { Text } from "react-native";

export default function SignUp() {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleGoogleSignIn = async () => {
    try {
      setIsLoading(true);
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: 'https://your-app-url.com/auth/callback',
        },
      });

      if (error) throw error;
      Alert.alert('Success', 'Google sign-in successful!');
    } catch (error) {
      console.error('Google sign-in error:', error);
      Alert.alert('Error', 'Failed to sign in with Google');
    } finally {
      setIsLoading(false);
    }
  };

  const handleContinue = (name: string, phone: string) => {
    if (!name || !phone) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }
    // Navigate to OTP screen with user info
    router.push({
      pathname: './otp-screen',
      params: { name, phone },
    });
  };

  const handleSignIn = () => {
    router.push({
      pathname: './SignIn'
    });
  }
  return (
    <View className="flex-1 items-center justify-center bg-gray-50 px-6">
      <Text className="text-2xl font-bold mb-8">Sign Up</Text>
      
      <TouchableOpacity 
        onPress={handleGoogleSignIn} 
        disabled={isLoading}
        className="bg-blue-500 px-6 py-3 rounded-full w-full mb-6"
      >
        <Text className="text-white text-lg font-semibold text-center">
          {isLoading ? 'Signing in...' : 'Continue with Google'}
        </Text>
      </TouchableOpacity>

      <Text className="text-gray-600 mb-6">OR</Text>

      <TextInput
        placeholder="Full Name"
        value={name}
        onChangeText={setName}
        className="border w-full border-gray-300 rounded-lg px-4 py-3 mb-4"
      />

      <TextInput
        placeholder="Phone Number"
        value={phone}
        onChangeText={setPhone}
        keyboardType="phone-pad"
        className="border w-full border-gray-300 rounded-lg px-4 py-3 mb-6"
      />

      <TouchableOpacity 
        onPress={() => handleContinue(name, phone)}
        className="bg-green-500 px-6 py-3 rounded-full w-full"
      >
        <Text className="text-white text-lg font-semibold text-center">Continue</Text>
      </TouchableOpacity>
      <TouchableOpacity onPress={handleSignIn}>
        <Text className="text-blue-500">Sign In</Text>
      </TouchableOpacity>
    </View>
  );
};