import { useState } from "react";
import { Text, TextInput, TouchableOpacity, View } from "react-native";
import { useLocalSearchParams } from "expo-router";

export default function OtpScreen() {
    const { name, phone } = useLocalSearchParams<{ name: string; phone: string }>()
    const [otp, setOtp] = useState('');
    const [showOtpInput, setShowOtpInput] = useState(false);
    
    const handleVerifyOTP = () => {
        console.log('OTP:', otp);
        console.log('Name:', name);
        console.log('Phone:', phone);
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