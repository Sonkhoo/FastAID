import { router } from "expo-router";
import { useState } from "react";
import { Text, TextInput, TouchableOpacity, View } from "react-native";

export default function SignIn() {
    const [isLoading, setIsLoading] = useState(false);
    const [name, setName] = useState('');
    const [inputPhone, setPhone] = useState('');

    const handleGoogleSignIn = () => {
        
    }

    const handleContinue = () => {
        console.log('Name:', name);
        console.log('Phone:', inputPhone);
    }

  return (
    <View className="flex-1 items-center justify-center bg-gray-50 px-6">
      <Text className="text-2xl font-bold mb-8">Sign In</Text>
      
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
        value={inputPhone}
        onChangeText={setPhone}
        keyboardType="phone-pad"
        className="border w-full border-gray-300 rounded-lg px-4 py-3 mb-6"
      />

      <TouchableOpacity 
        onPress={handleContinue}
        className="bg-green-500 px-6 py-3 rounded-full w-full"
      >
        <Text className="text-white text-lg font-semibold text-center">Continue</Text>
      </TouchableOpacity>

      <TouchableOpacity 
        onPress={() => router.push('/(auth)/SignUp')}>
        <Text className="text-blue-500 text-lg font-semibold text-center">Sign Up</Text>
      </TouchableOpacity>
   </View>
);
}