import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../../contexts/AuthContext';
import { checkUserExists, createUser } from '../../lib/api/user';
import { getUserLocation } from '../../lib/services/location';
import { supabase } from '../../lib/supabase';

interface User {
  id: string;
  phoneNumber: string;
  name: string;
  email?: string;
  latitude?: number;
  longitude?: number;
}

export default function AuthScreen() {
  const { session, user, refreshUser } = useAuth();
  const [phoneNumber, setPhoneNumber] = useState('');
  const [otp, setOtp] = useState('');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [step, setStep] = useState<'phone' | 'otp' | 'signup' | 'driver-signup'>('phone');
  const [loading, setLoading] = useState(false);
  
  // Driver signup fields
  const [driverName, setDriverName] = useState('');
  const [driverLicense, setDriverLicense] = useState('');

  useEffect(() => {
    console.log('AuthScreen: session exists:', !!session, 'user exists:', !!user);
    
    // Only go to signup if user is authenticated but doesn't exist in our database
    if (session && !user) {
      console.log('AuthScreen: Session exists but no user, going to signup');
      setPhoneNumber(session.user.phone || '');
      setStep('signup');
    } else if (!session) {
      // If no session, start with phone input
      console.log('AuthScreen: No session, starting with phone input');
      setStep('phone');
    } else if (session && user) {
      console.log('AuthScreen: Both session and user exist, should redirect to dashboard');
      // This should trigger a redirect to the user dashboard
    }
  }, [session, user]);

  const handleSendOTP = async () => {
    if (!phoneNumber || phoneNumber.length < 10) {
      Alert.alert('Invalid Phone Number', 'Please enter a valid phone number');
      return;
    }

    console.log("Sending OTP to", phoneNumber);
    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithOtp({
        phone: phoneNumber,
      });

      if (error) {
        Alert.alert('Error', error.message);
      } else {
        setStep('otp');
        Alert.alert('OTP Sent', 'Please check your phone for the verification code');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to send OTP. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOTP = async () => {
    if (!otp || otp.length < 4) {
      Alert.alert('Invalid OTP', 'Please enter the 6-digit verification code');
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.auth.verifyOtp({
        phone: phoneNumber,
        token: otp,
        type: 'sms',
      });

      if (error) {
        Alert.alert('Error', error.message);
      } else if (data.session) {
        // Check if user exists in our database
        const existingUser = await checkUserExists(phoneNumber);
        if (existingUser) {
          // User exists, refresh user state and let AuthProvider handle redirect
          await refreshUser();
        } else {
          // New user, go to signup
          setStep('signup');
        }
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to verify OTP. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleSignup = async () => {
    if (!name.trim()) {
      Alert.alert('Error', 'Please enter your name');
      return;
    }

    setLoading(true);
    try {
      // Get user location
      const location = await getUserLocation(true);
      
      // Create user in our database
      const userData = await createUser({
        phoneNumber: phoneNumber,
        name: name.trim(),
        email: email.trim() || undefined,
        latitude: location?.latitude,
        longitude: location?.longitude,
        location: location ? `POINT(${location.longitude} ${location.latitude})` : undefined,
      });

      if (userData) {
        // Refresh the user state in AuthProvider
        await refreshUser();
        
        Alert.alert('Success', 'Account created successfully!', [
          {
            text: 'OK',
            onPress: () => {
              // The AuthProvider will automatically redirect to the user dashboard
              // when the user is created and session is established
            },
          },
        ]);
      } else {
        Alert.alert('Error', 'Failed to create account. Please try again.');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to create account. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleDriverSignup = async () => {
    if (!driverName.trim()) {
      Alert.alert('Error', 'Please enter your name');
      return;
    }

    if (!driverLicense.trim()) {
      Alert.alert('Error', 'Please enter your driver license number');
      return;
    }

    setLoading(true);
    try {
      // Get user location
      const location = await getUserLocation(true);
      
      // First create a user record (required for auth context)
      const userData = await createUser({
        phoneNumber: phoneNumber,
        name: driverName.trim(),
        email: undefined,
        latitude: location?.latitude,
        longitude: location?.longitude,
        location: location ? `POINT(${location.longitude} ${location.latitude})` : undefined,
      });

      if (!userData) {
        throw new Error('Failed to create user record');
      }

      // Then create driver record
      const { data: driverData, error: driverError } = await supabase
        .from('Driver')
        .insert({
          phoneNumber: phoneNumber,
          name: driverName.trim(),
          driverLicense: driverLicense.trim(),
          isVerified: false,
          isAvailable: true,
          latitude: location?.latitude,
          longitude: location?.longitude,
          location: location ? `POINT(${location.longitude} ${location.latitude})` : null,
        })
        .select()
        .single();

      if (driverError) {
        throw driverError;
      }

      if (driverData) {
        // Refresh the user state in AuthProvider to trigger routing
        await refreshUser();
        
        Alert.alert('Success', 'Driver account created successfully! Please wait for verification.', [
          {
            text: 'OK',
            onPress: () => {
              // The AuthProvider will automatically redirect to the driver dashboard
            },
          },
        ]);
      } else {
        Alert.alert('Error', 'Failed to create driver account. Please try again.');
      }
    } catch (error) {
      console.error('Driver signup error:', error);
      Alert.alert('Error', 'Failed to create driver account. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const clearSession = async () => {
    try {
      await supabase.auth.signOut();
      setStep('phone');
      setPhoneNumber('');
      setOtp('');
      setName('');
      setEmail('');
      setDriverName('');
      setDriverLicense('');
    } catch (error) {
      console.error('Error clearing session:', error);
    }
  };

  const renderPhoneStep = () => (
    <View className="flex-1 justify-center px-6">
      <View className="bg-white p-6 rounded-2xl shadow-lg">
        <Text className="text-2xl font-bold text-gray-900 text-center mb-2">
          Welcome to FastAID
        </Text>
        <Text className="text-gray-600 text-center mb-8">
          Enter your phone number to get started
        </Text>
        
        <TextInput
          className="border border-gray-300 rounded-xl px-4 py-3 mb-6 text-lg"
          placeholder="Phone Number"
          value={phoneNumber}
          onChangeText={setPhoneNumber}
          keyboardType="phone-pad"
          maxLength={15}
        />
        
        <TouchableOpacity
          className={`rounded-xl py-3 ${loading ? 'bg-gray-400' : 'bg-red-500'}`}
          onPress={handleSendOTP}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="white" />
          ) : (
            <Text className="text-white font-bold text-center text-lg">
              Send OTP
            </Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderOTPStep = () => (
    <View className="flex-1 justify-center px-6">
      <View className="bg-white p-6 rounded-2xl shadow-lg">
        <Text className="text-2xl font-bold text-gray-900 text-center mb-2">
          Verify OTP
        </Text>
        <Text className="text-gray-600 text-center mb-8">
          Enter the 6-digit code sent to {phoneNumber}
        </Text>
        
        <TextInput
          className="border border-gray-300 rounded-xl px-4 py-3 mb-6 text-lg text-center"
          placeholder="Enter OTP"
          value={otp}
          onChangeText={setOtp}
          keyboardType="number-pad"
          maxLength={6}
        />
        
        <TouchableOpacity
          className={`rounded-xl py-3 mb-4 ${loading ? 'bg-gray-400' : 'bg-red-500'}`}
          onPress={handleVerifyOTP}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="white" />
          ) : (
            <Text className="text-white font-bold text-center text-lg">
              Verify OTP
            </Text>
          )}
        </TouchableOpacity>
        
        <TouchableOpacity
          className="rounded-xl py-3 border border-gray-300"
          onPress={() => setStep('phone')}
          disabled={loading}
        >
          <Text className="text-gray-600 font-bold text-center">
            Change Phone Number
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderSignupStep = () => (
    <View className="flex-1 justify-center px-6">
      <View className="bg-white p-6 rounded-2xl shadow-lg">
        <Text className="text-2xl font-bold text-gray-900 text-center mb-2">
          Complete Your Profile
        </Text>
        <Text className="text-gray-600 text-center mb-8">
          Please provide your details to complete registration
        </Text>
        
        <TextInput
          className="border border-gray-300 rounded-xl px-4 py-3 mb-4 text-lg"
          placeholder="Full Name"
          value={name}
          onChangeText={setName}
        />
        
        <TextInput
          className="border border-gray-300 rounded-xl px-4 py-3 mb-6 text-lg"
          placeholder="Email (Optional)"
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
        />
        
        <TouchableOpacity
          className={`rounded-xl py-3 mb-4 ${loading ? 'bg-gray-400' : 'bg-red-500'}`}
          onPress={handleSignup}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="white" />
          ) : (
            <Text className="text-white font-bold text-center text-lg">
              Create Account
            </Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          className="rounded-xl py-3 mb-4 border border-blue-500 bg-blue-50"
          onPress={() => setStep('driver-signup')}
          disabled={loading}
        >
          <Text className="text-blue-600 font-bold text-center text-lg">
            Sign up as Driver
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          className="rounded-xl py-3 border border-gray-300"
          onPress={clearSession}
          disabled={loading}
        >
          <Text className="text-gray-600 font-bold text-center">
            Start Over
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderDriverSignupStep = () => (
    <View className="flex-1 justify-center px-6">
      <View className="bg-white p-6 rounded-2xl shadow-lg">
        <Text className="text-2xl font-bold text-gray-900 text-center mb-2">
          Driver Registration
        </Text>
        <Text className="text-gray-600 text-center mb-8">
          Complete your driver profile to start accepting rides
        </Text>
        
        <TextInput
          className="border border-gray-300 rounded-xl px-4 py-3 mb-4 text-lg"
          placeholder="Full Name"
          value={driverName}
          onChangeText={setDriverName}
        />
        
        <TextInput
          className="border border-gray-300 rounded-xl px-4 py-3 mb-6 text-lg"
          placeholder="Driver License Number"
          value={driverLicense}
          onChangeText={setDriverLicense}
          autoCapitalize="characters"
        />
        
        <TouchableOpacity
          className={`rounded-xl py-3 mb-4 ${loading ? 'bg-gray-400' : 'bg-blue-500'}`}
          onPress={handleDriverSignup}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="white" />
          ) : (
            <Text className="text-white font-bold text-center text-lg">
              Register as Driver
            </Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          className="rounded-xl py-3 border border-gray-300"
          onPress={() => setStep('signup')}
          disabled={loading}
        >
          <Text className="text-gray-600 font-bold text-center">
            Back to User Signup
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        className="flex-1"
      >
        <ScrollView contentContainerStyle={{ flexGrow: 1 }}>
          {step === 'phone' && renderPhoneStep()}
          {step === 'otp' && renderOTPStep()}
          {step === 'signup' && renderSignupStep()}
          {step === 'driver-signup' && renderDriverSignupStep()}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
