import { useState } from "react";
import { Text, TextInput, TouchableOpacity, View } from "react-native";
import { useLocalSearchParams } from "expo-router";
import supabase from '@/src/lib/supabaseClient';
import { router } from 'expo-router';
import { addUser } from '@/src/lib/api/user';

export default function OtpScreen() {
    const { name, phone } = useLocalSearchParams<{ name: string; phone: string }>()
    const [isLoading, setIsLoading] = useState(false);
    const [otp, setOtp] = useState('');
    const [showOtpInput, setShowOtpInput] = useState(false);
    
    const handleVerifyOTP = async () => {
        console.log('OTP:', otp);
        console.log('Name:', name);
        console.log('Phone:', phone);

        try {
            setIsLoading(true);
            const { data: session, error } = await supabase.auth.verifyOtp({
              phone: phone,
              token: otp,
              type: 'sms',
            })
            if (error) throw error;
            console.log('Session:', session);
          } catch (error) {
            console.error('Error:', error);
          } finally {
            setIsLoading(false);
          }
          const { data: { user } } = await supabase.auth.getUser();
          if (!user) throw new Error('User not found');
          await addUser(user.id, name, phone);
          router.push('/(user)/index');
    };
    
    return (
        <>
        <View className="flex-1 items-center justify-center bg-gray-50 px-6">
        <TextInput
                    placeholder="Enter OTP"
                    value={otp}
                    onChangeText={setOtp}
                    keyboardType="number-pad"
                    className="border w-full border-gray-300 rounded-lg px-4 py-3 mb-6 text-base"
                  />
        
                  <TouchableOpacity
                    onPress={handleVerifyOTP}
                    className="bg-green-500 px-6 py-3 rounded-full w-full"
                  >
                    <Text className="text-white text-lg font-semibold text-center">Verify OTP</Text>
                  </TouchableOpacity>
        
                  <TouchableOpacity
                    onPress={() => {
                      setShowOtpInput(false);
                      setOtp('');
                    }}
                    className="text-center mt-4"
                  >
                    <Text className="text-blue-500">Resend OTP</Text>
                
                  </TouchableOpacity>
        </View>
        </>
    );
}