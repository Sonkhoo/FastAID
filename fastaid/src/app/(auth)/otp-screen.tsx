import { useState } from "react";
import { Alert, Text, TextInput, TouchableOpacity, View } from "react-native";
import { useLocalSearchParams } from "expo-router";
import { supabase } from '@/src/lib/supabase';
import { router } from 'expo-router';
import { addUser } from '@/src/lib/api/user';

export default function OtpScreen() {
    const { name, phone } = useLocalSearchParams<{ name: string; phone: string }>()
    const [isLoading, setIsLoading] = useState(false);
    const [otp, setOtp] = useState('');
    const [showOtpInput, setShowOtpInput] = useState(false);
    
    const handleVerifyOTP = async () => {
        if (!otp || otp.length < 6) {
            Alert.alert('Error', 'Please enter a valid OTP');
            return;
        }

        try {
            setIsLoading(true);
            
            // Verify the OTP
            const { data: { session }, error } = await supabase.auth.verifyOtp({
                phone: phone,
                token: otp,
                type: 'sms',
            });

            if (error) throw error;
            
            if (session) {
                // Get the user from the session
                const { data: { user } } = await supabase.auth.getUser();
                
                if (!user) {
                    throw new Error('User not found after OTP verification');
                }
                
                // Add user to your database
                await addUser(user.id, name, phone);
                
                // Only navigate after successful verification and user creation
                router.replace('../(user)/index');
            }
        } catch (error) {
            console.error('Error:', error);
            const errorMessage = error instanceof Error ? error.message : 'Failed to verify OTP';
            Alert.alert('Error', errorMessage);
        } finally {
            setIsLoading(false);
        }
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