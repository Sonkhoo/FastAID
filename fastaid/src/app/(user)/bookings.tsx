import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StatusBar,
} from 'react-native';
import {
  Calendar,
  Clock,
  MapPin,
  User,
  Phone,
  CheckCircle,
  AlertCircle,
  Plus,
  Filter,
  Search,
  Activity,
  ChevronRight,
} from 'lucide-react-native';

export default function Bookings() {
  const [selectedTab, setSelectedTab] = useState('all');

  const bookings = [
    {
      id: 1,
      status: 'completed',
      date: '2024-01-15',
      time: '14:30',
      patient: 'John Smith',
      pickup: '123 Main St',
      destination: 'City General Hospital',
      ambulanceId: 'AMB-001',
      type: 'Emergency',
      cost: '$450',
    },
    {
      id: 2,
      status: 'active',
      date: '2024-01-16',
      time: '09:15',
      patient: 'Maria Johnson',
      pickup: '456 Oak Ave',
      destination: 'Metro Medical Center',
      ambulanceId: 'AMB-003',
      type: 'Scheduled',
      eta: '15 min',
    },
    {
      id: 3,
      status: 'scheduled',
      date: '2024-01-17',
      time: '10:00',
      patient: 'Robert Davis',
      pickup: '789 Pine St',
      destination: 'Downtown Clinic',
      ambulanceId: 'Pending',
      type: 'Appointment',
      cost: '$320',
    },
    {
      id: 4,
      status: 'cancelled',
      date: '2024-01-14',
      time: '16:45',
      patient: 'Sarah Wilson',
      pickup: '321 Elm St',
      destination: 'Regional Hospital',
      ambulanceId: 'N/A',
      type: 'Emergency',
      reason: 'Patient cancelled',
    },
  ];

  const tabs = [
    { id: 'all', label: 'All Bookings', count: bookings.length },
    { id: 'active', label: 'Active', count: bookings.filter(b => b.status === 'active').length },
    { id: 'scheduled', label: 'Scheduled', count: bookings.filter(b => b.status === 'scheduled').length },
    { id: 'completed', label: 'Completed', count: bookings.filter(b => b.status === 'completed').length },
  ];

  const filteredBookings = selectedTab === 'all' ? bookings : bookings.filter(b => b.status === selectedTab);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return '#16a34a';
      case 'active': return '#f59e0b';
      case 'scheduled': return '#2563eb';
      case 'cancelled': return '#dc2626';
      default: return '#6b7280';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed': return CheckCircle;
      case 'active': return Activity;
      case 'scheduled': return Calendar;
      case 'cancelled': return AlertCircle;
      default: return Clock;
    }
  };

  return (
    <View className="flex-1 bg-gray-50">
      <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />
      
      {/* Header */}
      <View className="bg-white pt-12 pb-4 px-6 shadow-sm">
        <View className="flex-row items-center justify-between mb-4">
          <View>
            <Text className="text-2xl font-bold text-gray-900">My Bookings</Text>
            <Text className="text-gray-600 mt-1">Manage your ambulance requests</Text>
          </View>
          <TouchableOpacity className="bg-emergency-50 p-3 rounded-full">
            <Plus size={24} color="#dc2626" />
          </TouchableOpacity>
        </View>

        {/* Search and Filter */}
        <View className="flex-row space-x-3">
          <View className="flex-1 bg-gray-100 rounded-xl px-4 py-3 flex-row items-center">
            <Search size={20} color="#6b7280" />
            <Text className="text-gray-500 ml-2">Search bookings...</Text>
          </View>
          <TouchableOpacity className="bg-gray-100 p-3 rounded-xl">
            <Filter size={20} color="#6b7280" />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} className="flex-1">
        {/* Stats Cards */}
        <View className="px-6 mt-6">
          <ScrollView horizontal showsHorizontalScrollIndicator={false} className="space-x-4">
            <View className="bg-white rounded-xl p-4 shadow-sm min-w-32">
              <Text className="text-2xl font-bold text-emergency-600">5</Text>
              <Text className="text-gray-600 text-sm">Total Trips</Text>
            </View>
            <View className="bg-white rounded-xl p-4 shadow-sm min-w-32">
              <Text className="text-2xl font-bold text-green-600">4</Text>
              <Text className="text-gray-600 text-sm">Completed</Text>
            </View>
            <View className="bg-white rounded-xl p-4 shadow-sm min-w-32">
              <Text className="text-2xl font-bold text-yellow-600">1</Text>
              <Text className="text-gray-600 text-sm">In Progress</Text>
            </View>
            <View className="bg-white rounded-xl p-4 shadow-sm min-w-32">
              <Text className="text-2xl font-bold text-medical-600">2</Text>
              <Text className="text-gray-600 text-sm">Scheduled</Text>
            </View>
          </ScrollView>
        </View>

        {/* Filter Tabs */}
        <View className="px-6 mt-6">
          <ScrollView horizontal showsHorizontalScrollIndicator={false} className="space-x-3">
            {tabs.map((tab) => (
              <TouchableOpacity
                key={tab.id}
                onPress={() => setSelectedTab(tab.id)}
                className={`px-4 py-2 rounded-full mr-3 ${
                  selectedTab === tab.id ? 'bg-emergency-600' : 'bg-white'
                }`}
              >
                <Text className={`font-medium ${
                  selectedTab === tab.id ? 'text-white' : 'text-gray-700'
                }`}>
                  {tab.label} ({tab.count})
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Bookings List */}
        <View className="px-6 mt-6 mb-8">
          <Text className="text-xl font-bold text-gray-900 mb-4">Recent Bookings</Text>
          <View className="space-y-4">
            {filteredBookings.map((booking) => {
              const StatusIcon = getStatusIcon(booking.status);
              const statusColor = getStatusColor(booking.status);
              
              return (
                <TouchableOpacity key={booking.id} className="bg-white rounded-xl p-4 shadow-sm">
                  <View className="flex-row items-start justify-between mb-3">
                    <View className="flex-row items-center">
                      <View className="p-2 rounded-full" style={{ backgroundColor: statusColor + '20' }}>
                        <StatusIcon size={18} color={statusColor} />
                      </View>
                      <View className="ml-3">
                        <Text className="font-semibold text-gray-900">Booking #{booking.id}</Text>
                        <Text className="text-gray-600 text-sm">{booking.type}</Text>
                      </View>
                    </View>
                    <View className="items-end">
                      <View className="px-2 py-1 rounded-full" style={{ backgroundColor: statusColor + '20' }}>
                        <Text className="text-xs font-medium" style={{ color: statusColor }}>
                          {booking.status.toUpperCase()}
                        </Text>
                      </View>
                      {booking.eta && (
                        <Text className="text-gray-500 text-xs mt-1">ETA: {booking.eta}</Text>
                      )}
                    </View>
                  </View>

                  <View className="space-y-2">
                    <View className="flex-row items-center">
                      <User size={16} color="#6b7280" />
                      <Text className="text-gray-700 ml-2">{booking.patient}</Text>
                    </View>
                    
                    <View className="flex-row items-center">
                      <Clock size={16} color="#6b7280" />
                      <Text className="text-gray-700 ml-2">{booking.date} at {booking.time}</Text>
                    </View>
                    
                    <View className="flex-row items-start">
                      <MapPin size={16} color="#6b7280" className="mt-0.5" />
                      <View className="ml-2 flex-1">
                        <Text className="text-gray-700 text-sm">From: {booking.pickup}</Text>
                        <Text className="text-gray-700 text-sm">To: {booking.destination}</Text>
                      </View>
                    </View>
                  </View>

                  <View className="flex-row items-center justify-between mt-4 pt-3 border-t border-gray-100">
                    <View className="flex-row items-center">
                      <Text className="text-gray-600 text-sm">Unit: {booking.ambulanceId}</Text>
                      {booking.cost && (
                        <Text className="text-gray-600 text-sm ml-4">Cost: {booking.cost}</Text>
                      )}
                    </View>
                    <ChevronRight size={16} color="#9ca3af" />
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* New Booking Button */}
        <View className="px-6 mb-8">
          <TouchableOpacity className="bg-emergency-600 rounded-xl p-4 flex-row items-center justify-center">
            <Plus size={24} color="#ffffff" />
            <Text className="text-white font-semibold text-lg ml-2">Book New Ambulance</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}