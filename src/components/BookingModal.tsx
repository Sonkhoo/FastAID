import { Clock, CreditCard, MapPin, Phone, Truck, User, X } from 'lucide-react-native';
import React from 'react';
import {
  Alert,
  Modal,
  ScrollView,
  Text,
  TouchableOpacity,
  View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

interface Driver {
  id: string;
  name: string;
  phone?: string;
  rating?: number;
  experience?: string;
  vehicleNumber?: string;
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
  const handleConfirmBooking = () => {
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
          onPress: () => {
            onConfirmBooking();
            onClose();
          },
        },
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
            <Text className="text-xl font-bold text-gray-900">Confirm Booking</Text>
            <TouchableOpacity onPress={onClose} className="p-2">
              <X color="#6B7280" size={24} />
            </TouchableOpacity>
          </View>
        </View>

        <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
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

              <View className="space-y-3">
                {driver.phone && (
                  <View className="flex-row items-center">
                    <Phone color="#6B7280" size={16} />
                    <Text className="text-gray-600 ml-2">{driver.phone}</Text>
                  </View>
                )}
                
                {driver.vehicleNumber && (
                  <View className="flex-row items-center">
                    <Truck color="#6B7280" size={16} />
                    <Text className="text-gray-600 ml-2">{driver.vehicleType} - {driver.vehicleNumber}</Text>
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
          <View className="bg-white mx-6 mt-4 rounded-2xl shadow-sm">
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
          <View className="bg-white mx-6 mt-4 rounded-2xl shadow-sm">
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
          <View className="bg-white mx-6 mt-4 rounded-2xl shadow-sm">
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
              className="bg-red-500 py-4 rounded-xl"
              onPress={handleConfirmBooking}
            >
              <Text className="text-white font-bold text-center text-lg">
                Confirm Booking
              </Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              className="bg-gray-200 py-4 rounded-xl"
              onPress={handleCancel}
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