import * as ImagePicker from 'expo-image-picker';
import {
    Calendar,
    Eye,
    FileImage,
    FileText,
    Plus,
    Trash2,
    Upload,
    X,
} from 'lucide-react-native';
import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Image,
    Modal,
    ScrollView,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
    deleteMedicalRecord,
    getMedicalRecords,
    testStorageAccess,
    testSupabaseConnection,
    uploadMedicalRecord,
    uploadMedicalRecordFallback,
    type MedicalRecord
} from '../lib/api/user';

interface MedicalRecordsProps {
  visible: boolean;
  onClose: () => void;
}

export default function MedicalRecords({ visible, onClose }: MedicalRecordsProps) {
  const [records, setRecords] = useState<MedicalRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [description, setDescription] = useState('');
  const [isOnline, setIsOnline] = useState(true);

  useEffect(() => {
    if (visible) {
      loadMedicalRecords();
      
      // Check network status periodically
      const networkCheckInterval = setInterval(() => {
        testNetworkConnection();
      }, 30000); // Check every 30 seconds
      
      return () => clearInterval(networkCheckInterval);
    }
  }, [visible]);

  const loadMedicalRecords = async () => {
    try {
      setLoading(true);
      
      const medicalRecords = await getMedicalRecords();
      setRecords(medicalRecords);
      setIsOnline(true); // Assume online if request succeeds
    } catch (error) {
      console.error('Error loading medical records:', error);
      
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      if (errorMessage.includes('Network request failed') || errorMessage.includes('fetch')) {
        setIsOnline(false);
        Alert.alert(
          'Network Error', 
          'Unable to load medical records. Please check your internet connection and try again.'
        );
      } else {
        Alert.alert('Error', 'Failed to load medical records');
      }
    } finally {
      setLoading(false);
    }
  };

  const testNetworkConnection = async () => {
    try {
      // Test general internet connectivity
      const response = await fetch('https://httpbin.org/get', {
        method: 'GET'
      });
      
      if (response.ok) {
        setIsOnline(true);
        console.log('General network connection test successful');
        
        // Test Supabase connectivity
        const supabaseConnected = await testSupabaseConnection();
        if (supabaseConnected) {
          console.log('Supabase connection test successful');
        } else {
          console.log('Supabase connection test failed');
        }
      } else {
        setIsOnline(false);
        console.log('Network connection test failed - non-OK response');
      }
    } catch (error) {
      console.error('Network connection test failed:', error);
      setIsOnline(false);
    }
  };

  const pickImage = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        setSelectedImage(result.assets[0].uri);
      }
    } catch (error) {
      console.error('Error picking image:', error);
      Alert.alert('Error', 'Failed to pick image');
    }
  };

  const takePhoto = async () => {
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission needed', 'Camera permission is required to take photos');
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        setSelectedImage(result.assets[0].uri);
      }
    } catch (error) {
      console.error('Error taking photo:', error);
      Alert.alert('Error', 'Failed to take photo');
    }
  };

  const uploadImage = async () => {
    if (!selectedImage) {
      Alert.alert('Error', 'Please select an image first');
      return;
    }

    // Check network connectivity first
    if (!isOnline) {
      Alert.alert(
        'No Internet Connection',
        'Please check your internet connection and try again.'
      );
      return;
    }

    const performUpload = async (retryCount = 0) => {
      try {
        setUploading(true);

        const response = await fetch(selectedImage);
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const blob = await response.blob();
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const fileName = `medical_record_${timestamp}.jpg`;

        console.log('Starting upload process...');
        
        // Test if storage is accessible
        const storageAccessible = await testStorageAccess();
        let record;
        
        if (storageAccessible) {
          console.log('Storage accessible, using main upload method');
          record = await uploadMedicalRecord(blob, fileName, description);
        } else {
          console.log('Storage not accessible, using fallback method');
          record = await uploadMedicalRecordFallback(blob, fileName, description);
        }

        if (record) {
          Alert.alert('Success', 'Medical record uploaded successfully');
          setSelectedImage(null);
          setDescription('');
          setShowUploadModal(false);
          loadMedicalRecords();
          setIsOnline(true); // Assume online if upload succeeds
        } else {
          Alert.alert('Error', 'Failed to upload medical record. Please try again.');
        }
      } catch (error) {
        console.error('Error uploading image:', error);
        
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        
        // Handle specific error types
        if (errorMessage.includes('Network request failed') || errorMessage.includes('fetch') || errorMessage.includes('Network connection failed')) {
          setIsOnline(false);
          
          // Retry logic for network errors
          if (retryCount < 2) {
            console.log(`Retrying upload (attempt ${retryCount + 1}/3)...`);
            setTimeout(() => {
              performUpload(retryCount + 1);
            }, 2000); // Wait 2 seconds before retry
            return;
          }
          
          Alert.alert(
            'Network Error', 
            'Unable to upload image after multiple attempts. Please check your internet connection and try again.'
          );
        } else if (errorMessage.includes('bucket not configured') || errorMessage.includes('Storage service not configured')) {
          Alert.alert(
            'Configuration Error',
            'File upload service is not properly configured. Please contact support.'
          );
        } else if (errorMessage.includes('not authenticated') || errorMessage.includes('log in again')) {
          Alert.alert(
            'Authentication Error',
            'Please log in again to upload files.'
          );
        } else {
          Alert.alert('Upload Error', errorMessage);
        }
      } finally {
        setUploading(false);
      }
    };

    await performUpload();
  };

  const deleteRecord = async (recordId: string) => {
    Alert.alert(
      'Delete Record',
      'Are you sure you want to delete this medical record?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const success = await deleteMedicalRecord(recordId);
              if (success) {
                Alert.alert('Success', 'Medical record deleted successfully');
                loadMedicalRecords(); // Refresh the list
              } else {
                Alert.alert('Error', 'Failed to delete medical record');
              }
            } catch (error) {
              console.error('Error deleting record:', error);
              Alert.alert('Error', 'Failed to delete medical record');
            }
          },
        },
      ]
    );
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <SafeAreaView className="flex-1 bg-gray-50">
        {/* Header */}
        <View className="bg-white px-6 py-4 border-b border-gray-200">
          <View className="flex-row items-center justify-between">
            <View className="flex-1">
              <Text className="text-xl font-bold text-gray-900">Medical Records</Text>
              {!isOnline && (
                <Text className="text-red-500 text-sm mt-1">You are offline</Text>
              )}
            </View>
            <View className="flex-row items-center space-x-3">
              <TouchableOpacity
                onPress={() => setShowUploadModal(true)}
                disabled={!isOnline}
                className={`p-2 rounded-full ${isOnline ? 'bg-red-500' : 'bg-gray-300'}`}
              >
                <Plus size={20} color="white" />
              </TouchableOpacity>
              <TouchableOpacity onPress={onClose} className="p-2">
                <X size={24} color="#6B7280" />
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* Content */}
        <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
          {loading ? (
            <View className="flex-1 justify-center items-center py-20">
              <ActivityIndicator size="large" color="#DC2626" />
              <Text className="text-gray-600 mt-4">Loading medical records...</Text>
            </View>
          ) : records.length === 0 ? (
            <View className="flex-1 justify-center items-center py-20">
              <FileText size={64} color="#9CA3AF" />
              <Text className="text-xl font-semibold text-gray-900 mt-4">
                No Medical Records
              </Text>
              <Text className="text-gray-600 text-center mt-2 px-8">
                Upload your medical documents for quick access during emergencies.
              </Text>
              <View className="flex-row space-x-3 mt-6">
                <TouchableOpacity
                  onPress={() => setShowUploadModal(true)}
                  className="bg-red-500 px-6 py-3 rounded-full"
                >
                  <Text className="text-white font-semibold">Upload First Record</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={testNetworkConnection}
                  className="bg-gray-500 px-6 py-3 rounded-full"
                >
                  <Text className="text-white font-semibold">Retry</Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            <View className="p-6 space-y-4">
              {records.map((record) => (
                <View key={record.id} className="bg-white rounded-xl p-4 shadow-sm">
                  <View className="flex-row items-start justify-between">
                    <View className="flex-row items-center flex-1">
                      <View className="w-12 h-12 bg-red-100 rounded-full items-center justify-center mr-3">
                        <FileImage size={24} color="#DC2626" />
                      </View>
                      <View className="flex-1">
                        <Text className="font-semibold text-gray-900">{record.fileName}</Text>
                        <Text className="text-gray-600 text-sm">
                          {formatFileSize(record.fileSize)} • {record.fileType.toUpperCase()}
                        </Text>
                        {record.description && (
                          <Text className="text-gray-500 text-sm mt-1">{record.description}</Text>
                        )}
                        <View className="flex-row items-center mt-1">
                          <Calendar size={14} color="#9CA3AF" />
                          <Text className="text-gray-500 text-xs ml-1">
                            {formatDate(record.uploadedAt)}
                          </Text>
                        </View>
                      </View>
                    </View>
                    <View className="flex-row items-center space-x-2">
                      <TouchableOpacity
                        onPress={() => {
                          // Open image in full screen or download
                          Alert.alert('View Record', 'Open in browser?', [
                            { text: 'Cancel', style: 'cancel' },
                            { text: 'Open', onPress: () => console.log('Open:', record.fileUrl) },
                          ]);
                        }}
                        className="p-2 bg-blue-100 rounded-full"
                      >
                        <Eye size={16} color="#2563EB" />
                      </TouchableOpacity>
                      <TouchableOpacity
                        onPress={() => deleteRecord(record.id)}
                        className="p-2 bg-red-100 rounded-full"
                      >
                        <Trash2 size={16} color="#DC2626" />
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>
              ))}
            </View>
          )}
        </ScrollView>

        {/* Upload Modal */}
        <Modal visible={showUploadModal} animationType="slide" transparent>
          <View className="flex-1 bg-black bg-opacity-50 justify-end">
            <View className="bg-white rounded-t-3xl p-6">
              <View className="flex-row items-center justify-between mb-6">
                <Text className="text-xl font-bold text-gray-900">Upload Medical Record</Text>
                <TouchableOpacity onPress={() => setShowUploadModal(false)}>
                  <X size={24} color="#6B7280" />
                </TouchableOpacity>
              </View>

              {selectedImage ? (
                <View className="mb-4">
                  <Image source={{ uri: selectedImage }} className="w-full h-48 rounded-xl" />
                  <TouchableOpacity
                    onPress={() => setSelectedImage(null)}
                    className="absolute top-2 right-2 bg-black bg-opacity-50 p-1 rounded-full"
                  >
                    <X size={16} color="white" />
                  </TouchableOpacity>
                </View>
              ) : (
                <View className="mb-4">
                  <TouchableOpacity
                    onPress={pickImage}
                    disabled={!isOnline}
                    className={`border-2 border-dashed rounded-xl p-8 items-center mb-4 ${
                      isOnline ? 'border-gray-300' : 'border-gray-200 bg-gray-50'
                    }`}
                  >
                    <Upload size={48} color={isOnline ? "#9CA3AF" : "#D1D5DB"} />
                    <Text className={`mt-4 text-center ${isOnline ? 'text-gray-600' : 'text-gray-400'}`}>
                      {isOnline ? 'Tap to select an image' : 'Upload disabled - you are offline'}
                    </Text>
                  </TouchableOpacity>
                </View>
              )}

              <TextInput
                placeholder="Description (optional)"
                value={description}
                onChangeText={setDescription}
                className="border border-gray-300 rounded-xl p-4 mb-4"
                multiline
                numberOfLines={3}
              />

              <View className="flex-row space-x-3 mb-4">
                <TouchableOpacity
                  onPress={pickImage}
                  className="flex-1 bg-blue-500 py-3 rounded-xl"
                >
                  <Text className="text-white font-semibold text-center">Choose from Gallery</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={takePhoto}
                  className="flex-1 bg-green-500 py-3 rounded-xl"
                >
                  <Text className="text-white font-semibold text-center">Take Photo</Text>
                </TouchableOpacity>
              </View>

              <TouchableOpacity
                onPress={uploadImage}
                disabled={!selectedImage || uploading}
                className={`py-3 rounded-xl ${
                  selectedImage && !uploading ? 'bg-red-500' : 'bg-gray-300'
                }`}
              >
                {uploading ? (
                  <View className="flex-row items-center justify-center">
                    <ActivityIndicator size="small" color="white" />
                    <Text className="text-white font-semibold ml-2">Uploading...</Text>
                  </View>
                ) : (
                  <Text className="text-white font-semibold text-center">
                    Upload Medical Record
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      </SafeAreaView>
    </Modal>
  );
} 