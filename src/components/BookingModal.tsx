import { Clock, CreditCard, MapPin, Phone, Truck, User, X } from 'lucide-react-native';
import React, { useState } from 'react';
import {
  Alert,
  Modal,
  Platform,
  ScrollView,
  Text,
  TouchableOpacity,
  View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../contexts/AuthContext';
import { createBookingOrder, updateBookingPaymentStatus, updateDriverAvailability } from '../lib/api/booking';

interface PaymentResponse {
  razorpay_payment_id: string;
  razorpay_order_id: string;
  razorpay_signature: string;
}

// Conditional Razorpay import for Expo compatibility
let RazorpayCheckout: any = null;

console.log('Platform:', Platform.OS);

// Function to create fallback implementation
const createFallbackImplementation = (isSimulation: boolean = true) => {
  return {
    open: async (options: any): Promise<PaymentResponse> => {
      return new Promise((resolve, reject) => {
        const title = isSimulation ? 'Payment Simulation (Expo)' : 'Payment Error';
        const message = isSimulation 
          ? `Amount: ₹${options.amount / 100}\nOrder ID: ${options.order_id}\n\nNote: This is a simulation. For real payments, build with expo run:android/ios`
          : 'Payment gateway is not available. Please try again later or contact support.';
        
        Alert.alert(
          title,
          message,
          [
            {
              text: 'Cancel Payment',
              onPress: () => reject({ code: 'PAYMENT_CANCELLED' }),
              style: 'cancel'
            },
            {
              text: isSimulation ? 'Pay Now' : 'OK',
              onPress: () => {
                if (isSimulation) {
                  resolve({
                    razorpay_payment_id: 'pay_' + Math.random().toString(36).substr(2, 9),
                    razorpay_order_id: options.order_id,
                    razorpay_signature: 'mock_signature'
                  });
                } else {
                  reject({ code: 'PAYMENT_UNAVAILABLE', description: 'Payment gateway not available' });
                }
              }
            }
          ]
        );
      });
    }
  };
};

if (Platform.OS === 'android' || Platform.OS === 'ios') {
  try {
    // Try different import methods
    const razorpayModule = require('react-native-razorpay');
    RazorpayCheckout = razorpayModule.default || razorpayModule;
    console.log('RazorpayCheckout loaded successfully:', !!RazorpayCheckout);
    console.log('RazorpayCheckout type:', typeof RazorpayCheckout);
    
    // Test if the module has the required methods
    if (!RazorpayCheckout || typeof RazorpayCheckout.open !== 'function') {
      console.warn('RazorpayCheckout loaded but missing open method, using fallback');
      RazorpayCheckout = createFallbackImplementation(true);
    }
  } catch (error) {
    console.log('Razorpay native module not available, using fallback:', error);
    RazorpayCheckout = createFallbackImplementation(true);
  }
}

// Fallback implementation for Expo/Web
if (!RazorpayCheckout) {
  console.log('Using fallback RazorpayCheckout implementation');
  RazorpayCheckout = createFallbackImplementation(true);
}

// Ensure RazorpayCheckout is never null
if (!RazorpayCheckout || !RazorpayCheckout.open) {
  console.warn('RazorpayCheckout not properly initialized, using emergency fallback');
  RazorpayCheckout = createFallbackImplementation(false);
}

console.log('Final RazorpayCheckout state:', {
  exists: !!RazorpayCheckout,
  hasOpen: !!(RazorpayCheckout && RazorpayCheckout.open)
});

// Test function to verify Razorpay functionality
const testRazorpayModule = () => {
  try {
    if (RazorpayCheckout && typeof RazorpayCheckout.open === 'function') {
      console.log('✅ Razorpay module is properly initialized');
      return true;
    } else {
      console.log('❌ Razorpay module is not properly initialized');
      return false;
    }
  } catch (error) {
    console.log('❌ Error testing Razorpay module:', error);
    return false;
  }
};

// Test the module on initialization
testRazorpayModule();

// Check environment variables
const checkEnvironmentVariables = () => {
  const apiKey = process.env.EXPO_PUBLIC_RAZORPAY_API_KEY;
  console.log('Environment check:', {
    hasApiKey: !!apiKey,
    apiKeyLength: apiKey ? apiKey.length : 0,
    apiKeyPrefix: apiKey ? apiKey.substring(0, 10) + '...' : 'N/A'
  });
  
  if (!apiKey || apiKey === 'rzp_test_YOUR_KEY_HERE') {
    console.warn('⚠️ Razorpay API key not properly configured');
    return false;
  }
  
  console.log('✅ Razorpay API key is configured');
  return true;
};

checkEnvironmentVariables();

interface Driver {
  id: string;
  name: string;
  phone?: string;
  rating?: number;
  experience?: string;
  driverLicense?: string;
  vehicleType?: string;
}

interface Hospital {
  id: number;
  name: string;
  distance: string;
  speciality: string;
  emergency: boolean;
  phone?: string;
  location: {
    latitude: number;
    longitude: number;
  };
}

interface BookingModalProps {
  visible: boolean;
  onClose: () => void;
  driver: Driver;
  hospital: Hospital;
  estimatedTime: string;
  estimatedCost: string;
  onConfirmBooking: () => void;
  onCancel: () => void;
}

export default function BookingModal({
  visible,
  onClose,
  driver,
  hospital,
  estimatedTime,
  estimatedCost,
  onConfirmBooking,
  onCancel,
}: BookingModalProps) {
  const { user, session } = useAuth();
  const [isProcessing, setIsProcessing] = useState(false);
  
  // Simple mock payment function
  const handleMockPayment = async (bookingResponse: any) => {
    return new Promise<PaymentResponse>((resolve) => {
      setTimeout(() => {
        resolve({
          razorpay_payment_id: 'pay_mock_' + Math.random().toString(36).substr(2, 9),
          razorpay_order_id: bookingResponse.orderId,
          razorpay_signature: 'mock_signature_' + Math.random().toString(36).substr(2, 9)
        });
      }, 2000); // Simulate 2-second payment processing
    });
  };

  // Helper function to process successful payment
  const processPaymentSuccess = async (bookingResponse: any, paymentData: PaymentResponse) => {
    await updateBookingPaymentStatus(bookingResponse.id, paymentData.razorpay_payment_id, 'success');
    await updateDriverAvailability(driver.id, false);
    
    const successMessage = `Booking confirmed! Payment successful.\n\nEstimated Cost: ${estimatedCost}\nEstimated Time: ${estimatedTime}\n\nYour ambulance is on the way!`;
    Alert.alert('Success', successMessage);
    onConfirmBooking();
    onClose();
  };

  // Helper function to handle payment errors
  const handlePaymentError = (error: any) => {
    console.error('Payment error:', error);
    
    if (error.code === 'PAYMENT_CANCELLED') {
      Alert.alert('Cancelled', 'Payment was cancelled');
    } else if (error.code === 'PAYMENT_UNAVAILABLE') {
      Alert.alert('Payment Unavailable', 'Payment gateway is not available. Please try again later.');
    } else if (error.message === 'Payment gateway is not available') {
      Alert.alert('Payment Error', 'Payment gateway is not available. Please try again later or contact support.');
    } else if (error.message && error.message.includes('API key not configured')) {
      Alert.alert('Configuration Error', 'Payment gateway is not properly configured. Please contact support.');
    } else {
      Alert.alert('Error', error.description || error.message || 'Payment failed. Please try again.');
    }
  };

  const handleConfirmBooking = async () => {
    if (!user?.id) {
      Alert.alert('Error', 'User not authenticated');
      return;
    }

    Alert.alert(
      'Confirm Booking',
      'Are you sure you want to proceed with this booking?',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Confirm',
          onPress: async () => {
            try {
              setIsProcessing(true);
              
              // Create booking order
              const bookingResponse = await createBookingOrder({
                userId: user.id,
                driverId: driver.id,
                hospital: hospital.location,
                estimatedCost: parseFloat(estimatedCost.replace('$', '')),
                estimatedTime: estimatedTime,
              });

              // Configure Razorpay options
              const apiKey = process.env.EXPO_PUBLIC_RAZORPAY_API_KEY || 'rzp_test_YOUR_KEY_HERE';
              
              if (!apiKey || apiKey === 'rzp_test_YOUR_KEY_HERE') {
                throw new Error('Razorpay API key not configured. Please set EXPO_PUBLIC_RAZORPAY_API_KEY environment variable.');
              }
              
              const options = {
                description: 'Ambulance booking payment',
                image: 'https://i.imgur.com/3g7nmJC.jpg',
                currency: 'INR',
                key: apiKey,
                amount: bookingResponse.amount,
                name: 'FastAid',
                order_id: bookingResponse.orderId,
                prefill: {
                  email: 'user@example.com',
                  contact: user?.phoneNumber || '',
                  name: user?.name || 'User'
                },
                theme: {color: '#DC2626'},
                modal: {
                  ondismiss: () => {
                    console.log('Payment modal dismissed');
                  }
                }
              };

              // Open Razorpay checkout
              console.log('About to open Razorpay checkout with options:', options);
              console.log('RazorpayCheckout state before open:', {
                exists: !!RazorpayCheckout,
                hasOpen: !!(RazorpayCheckout && RazorpayCheckout.open),
                type: typeof RazorpayCheckout
              });
              
              if (!RazorpayCheckout || !RazorpayCheckout.open) {
                throw new Error('Payment gateway is not available');
              }
              
              let paymentData: PaymentResponse;
              
              // Show payment options (real vs mock)
              Alert.alert(
                'Choose Payment Method',
                'Select how you want to process the payment:',
                [
                  {
                    text: 'Cancel',
                    style: 'cancel',
                  },
                  {
                    text: 'Payment',
                    onPress: async () => {
                      try {
                        paymentData = await handleMockPayment(bookingResponse);
                        await processPaymentSuccess(bookingResponse, paymentData);
                      } catch (error: any) {
                        handlePaymentError(error);
                      }
                    }
                  }
                ]
              );
              
              return; // Exit early since we're handling payment in the alert callbacks
            } catch (error: any) {
              console.error('Booking error:', error);
              
              if (error.code === 'PAYMENT_CANCELLED') {
                Alert.alert('Cancelled', 'Payment was cancelled');
              } else if (error.code === 'PAYMENT_UNAVAILABLE') {
                Alert.alert('Payment Unavailable', 'Payment gateway is not available. Please try again later.');
              } else if (error.message === 'Payment gateway is not available') {
                Alert.alert('Payment Error', 'Payment gateway is not available. Please try again later or contact support.');
              } else if (error.message && error.message.includes('API key not configured')) {
                Alert.alert('Configuration Error', 'Payment gateway is not properly configured. Please contact support.');
              } else {
                Alert.alert('Error', error.description || error.message || 'Payment failed. Please try again.');
              }
            } finally {
              setIsProcessing(false);
            }
          }
        }
      ]
    );
  };

  const handleCancel = () => {
    Alert.alert(
      'Cancel Booking',
      'Are you sure you want to cancel this booking?',
      [
        {
          text: 'No',
          style: 'cancel',
        },
        {
          text: 'Yes',
          onPress: () => {
            onCancel();
            onClose();
          },
        },
      ]
    );
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <SafeAreaView className="flex-1 bg-gray-50">
        {/* Header */}
        <View className="bg-white px-6 py-4 border-b border-gray-200">
          <View className="flex-row items-center justify-between">
            <View className="flex-1">
              <Text className="text-xl font-bold text-gray-900">
                Confirm Booking
              </Text>
              <Text className="text-xs text-blue-600 font-medium">💳 Mock payment available</Text>
            </View>
            <TouchableOpacity onPress={onClose} className="p-2">
              <X color="#6B7280" size={24} />
            </TouchableOpacity>
          </View>
        </View>

        <ScrollView className="flex-1">
          {/* Driver Profile Section */}
          <View className="bg-white mx-6 mt-6 rounded-2xl shadow-sm">
            <View className="p-6">
              <Text className="text-lg font-bold text-gray-900 mb-4">Driver Details</Text>
              
              <View className="flex-row items-center mb-4">
                <View className="w-16 h-16 bg-gray-200 rounded-full items-center justify-center mr-4">
                  <User color="#6B7280" size={24} />
                </View>
                <View className="flex-1">
                  <Text className="text-lg font-semibold text-gray-900">{driver.name}</Text>
                  <Text className="text-gray-600">Professional Driver</Text>
                  {driver.rating && (
                    <View className="flex-row items-center mt-1">
                      <Text className="text-yellow-500">★</Text>
                      <Text className="text-gray-600 ml-1">{driver.rating}/5</Text>
                    </View>
                  )}
                </View>
              </View>

              <View className="space-y-2">
                {driver.phone && (
                  <View className="flex-row items-center">
                    <Phone color="#6B7280" size={16} />
                    <Text className="text-gray-600 ml-2">{driver.phone}</Text>
                  </View>
                )}
                
                {driver.driverLicense && (
                  <View className="flex-row items-center">
                    <Truck color="#6B7280" size={16} />
                    <Text className="text-gray-600 ml-2">{driver.vehicleType} - {driver.driverLicense}</Text>
                  </View>
                )}
                
                {driver.experience && (
                  <View className="flex-row items-center">
                    <Clock color="#6B7280" size={16} />
                    <Text className="text-gray-600 ml-2">{driver.experience} experience</Text>
                  </View>
                )}
              </View>
            </View>
          </View>

          {/* Hospital Details Section */}
          <View className="bg-white mx-6 mt-6 rounded-2xl shadow-sm">
            <View className="p-6">
              <Text className="text-lg font-bold text-gray-900 mb-4">Destination Hospital</Text>
              
              <View className="space-y-3">
                <View className="flex-row items-center justify-between">
                  <Text className="font-semibold text-gray-900">{hospital.name}</Text>
                  {hospital.emergency && (
                    <View className="bg-red-100 px-2 py-1 rounded-full">
                      <Text className="text-red-600 text-xs font-semibold">Emergency</Text>
                    </View>
                  )}
                </View>
                
                <Text className="text-gray-600">{hospital.speciality}</Text>
                
                <View className="flex-row items-center">
                  <MapPin color="#6B7280" size={16} />
                  <Text className="text-gray-600 ml-2">{hospital.distance} away</Text>
                </View>
                
                {hospital.phone && (
                  <View className="flex-row items-center">
                    <Phone color="#6B7280" size={16} />
                    <Text className="text-gray-600 ml-2">{hospital.phone}</Text>
                  </View>
                )}
              </View>
            </View>
          </View>

          {/* Trip Details Section */}
          <View className="bg-white mx-6 mt-6 rounded-2xl shadow-sm">
            <View className="p-6">
              <Text className="text-lg font-bold text-gray-900 mb-4">Trip Details</Text>
              
              <View className="space-y-4">
                <View className="flex-row items-center justify-between">
                  <View className="flex-row items-center">
                    <Clock color="#6B7280" size={16} />
                    <Text className="text-gray-600 ml-2">Estimated Time</Text>
                  </View>
                  <Text className="font-semibold text-gray-900">{estimatedTime}</Text>
                </View>
                
                <View className="flex-row items-center justify-between">
                  <View className="flex-row items-center">
                    <CreditCard color="#6B7280" size={16} />
                    <Text className="text-gray-600 ml-2">Estimated Cost</Text>
                  </View>
                  <Text className="font-semibold text-gray-900">{estimatedCost}</Text>
                </View>
              </View>
            </View>
          </View>

          {/* Payment Method Section */}
          <View className="bg-white mx-6 mt-6 rounded-2xl shadow-sm">
            <View className="p-6">
              <Text className="text-lg font-bold text-gray-900 mb-4">Payment Method</Text>
              
              <View className="bg-gray-50 p-4 rounded-xl">
                <View className="flex-row items-center justify-between">
                  <View className="flex-row items-center">
                    <CreditCard color="#6B7280" size={20} />
                    <Text className="text-gray-900 ml-3 font-medium">Cash Payment</Text>
                  </View>
                  <Text className="text-gray-600 text-sm">Pay after trip</Text>
                </View>
              </View>
              
              <Text className="text-gray-500 text-sm mt-3">
                Payment will be collected after the trip is completed. You can pay in cash or through the app.
              </Text>
            </View>
          </View>

          {/* Action Buttons */}
          <View className="px-6 mt-6 mb-8 space-y-3">
            <TouchableOpacity
              className={`py-4 rounded-xl ${isProcessing ? 'bg-gray-400' : 'bg-red-500'}`}
              onPress={handleConfirmBooking}
              disabled={isProcessing}
            >
              <Text className="text-white font-bold text-center text-lg">
                {isProcessing ? 'Processing...' : 'Confirm Booking'}
              </Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              className="bg-gray-200 py-4 rounded-xl"
              onPress={handleCancel}
              disabled={isProcessing}
            >
              <Text className="text-gray-700 font-bold text-center text-lg">
                Cancel
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
} 