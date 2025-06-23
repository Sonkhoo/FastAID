import { supabase } from "../supabase";

export interface User {
  id: string;
  phoneNumber: string;
  name: string;
  email?: string;
  latitude?: number;
  longitude?: number;
  location?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface MedicalRecord {
  id: string;
  userId: string;
  fileName: string;
  fileUrl: string;
  fileType: string;
  fileSize: number;
  uploadedAt: string;
  description?: string;
}

/*
 add new user to db
 */
export const addUser = async (userId: string, name: string, phone: string) => {
    try {
        console.log('Adding user:', userId, name, phone);
        const { data, error } = await supabase
            .from('User')
            .insert({
                id: userId,  // This should match the user's auth ID
                name,
                phoneNumber: phone,
            });
        if (error) throw error;
        return data;
    } catch (error) {
        console.error('Error adding user:', error);
        throw error;
    }
}

export const checkUserExists = async (phoneNumber: string): Promise<User | null> => {
  try {
    const { data, error } = await supabase
      .from('User')
      .select('*')
      .eq('phoneNumber', phoneNumber)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        // No rows returned - user doesn't exist
        return null;
      }
      throw error;
    }

    return data;
  } catch (error) {
    console.error('Error checking user existence:', error);
    return null;
  }
};

export const createUser = async (userData: {
  phoneNumber: string;
  name: string;
  email?: string;
  latitude?: number;
  longitude?: number;
  location?: string;
}): Promise<User | null> => {
  try {
    const { data, error } = await supabase
      .from('User')
      .insert(userData)
      .select()
      .single();

    if (error) {
      console.error('Error creating user:', error);
      return null;
    }

    return data;
  } catch (error) {
    console.error('Error creating user:', error);
    return null;
  }
};

export const getCurrentUserProfile = async (): Promise<User | null> => {
  try {
    const { data, error } = await supabase.rpc('get_current_user_profile');
    
    if (error) {
      console.error('Error getting current user profile:', error);
      return null;
    }

    return data?.[0] || null;
  } catch (error) {
    console.error('Error getting current user profile:', error);
    return null;
  }
};

export const updateUserLocation = async (
  latitude: number,
  longitude: number
): Promise<User | null> => {
  try {
    const { data, error } = await supabase.rpc('update_current_user_location', {
      new_latitude: latitude,
      new_longitude: longitude
    });

    if (error) {
      console.error('Error updating user location:', error);
      return null;
    }

    return data?.[0] || null;
  } catch (error) {
    console.error('Error updating user location:', error);
    return null;
  }
};

export const updateUserProfile = async (updates: {
  name?: string;
  email?: string;
}): Promise<User | null> => {
  try {
    const { data, error } = await supabase
      .from('User')
      .update(updates)
      .select()
      .single();

    if (error) {
      console.error('Error updating user profile:', error);
      return null;
    }

    return data;
  } catch (error) {
    console.error('Error updating user profile:', error);
    return null;
  }
};

// Test CORS and network connectivity to Supabase
export const testSupabaseConnection = async (): Promise<boolean> => {
  try {
    console.log('Testing Supabase connection...');
    
    // Test basic connectivity to Supabase
    const response = await fetch(`${process.env.EXPO_PUBLIC_SUPABASE_URL || 'https://gfqlmgtpfwakwzysomuc.supabase.co'}/rest/v1/`, {
      method: 'GET',
      headers: {
        'apikey': process.env.EXPO_PUBLIC_SUPABASE_API_KEY || '',
        'Authorization': `Bearer ${process.env.EXPO_PUBLIC_SUPABASE_API_KEY || ''}`,
        'Content-Type': 'application/json',
      }
    });
    
    console.log('Supabase connection test response status:', response.status);
    
    if (response.ok) {
      console.log('Supabase connection test successful');
      return true;
    } else {
      console.error('Supabase connection test failed with status:', response.status);
      const errorText = await response.text();
      console.error('Error response:', errorText);
      return false;
    }
  } catch (error) {
    console.error('Supabase connection test error:', error);
    return false;
  }
};

// Test if storage bucket is accessible
export const testStorageAccess = async (): Promise<boolean> => {
  try {
    console.log('Testing storage access...');
    
    const { data, error } = await supabase.storage
      .from('medicalrecords')
      .list('', { limit: 1 });
    
    if (error) {
      console.error('Storage access test failed:', error);
      
      // Check for specific error types
      if (error.message.includes('bucket') || error.message.includes('not found') || error.message.includes('does not exist')) {
        console.error('Storage bucket "medical-records" does not exist. Please create it in your Supabase dashboard.');
        return false;
      }
      
      if (error.message.includes('permission') || error.message.includes('access') || error.message.includes('unauthorized')) {
        console.error('No permission to access storage bucket. Check RLS policies.');
        return false;
      }
      
      if (error.message.includes('Network request failed') || error.message.includes('fetch')) {
        console.error('Network error during storage test. Check internet connection and API key.');
        return false;
      }
      
      return false;
    }
    
    console.log('Storage access test successful');
    return true;
  } catch (error) {
    console.error('Storage access test error:', error);
    return false;
  }
};

export const uploadMedicalRecord = async (
  file: any,
  fileName: string,
  description?: string
): Promise<MedicalRecord | null> => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      throw new Error('User not authenticated');
    }

    const userId = user.id;
    const timestamp = Date.now();
    const fileExtension = fileName.split('.').pop() || 'jpg';
    const uniqueFileName = `medical_records/${userId}/${timestamp}_${fileName}`;

    console.log('Starting upload process for:', uniqueFileName);

    // Upload file to Supabase Storage with better error handling
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('medicalrecords')
      .upload(uniqueFileName, file);

    if (uploadError) {
      console.error('Storage upload error:', uploadError);
      
      // Check if it's a bucket not found error
      if (uploadError.message.includes('bucket') || uploadError.message.includes('not found')) {
        throw new Error('Storage bucket not configured. Please contact support.');
      }
      
      // Check if it's a network error
      if (uploadError.message.includes('Network request failed') || uploadError.message.includes('fetch')) {
        throw new Error('Network error during upload. Please check your connection and try again.');
      }
      
      throw new Error(`Upload failed: ${uploadError.message}`);
    }

    console.log('File uploaded successfully:', uploadData);

    // Get the public URL
    const { data: urlData } = supabase.storage
      .from('medicalrecords')
      .getPublicUrl(uniqueFileName);

    console.log('Public URL generated:', urlData.publicUrl);

    // Save record to database
    const { data: recordData, error: recordError } = await supabase
      .from('MedicalRecords')
      .insert({
        userId: userId,
        fileName: fileName,
        fileUrl: urlData.publicUrl,
        fileType: fileExtension,
        fileSize: file.size || 0,
        description: description
      })
      .select()
      .single();

    if (recordError) {
      console.error('Database save error:', recordError);
      
      // Try to clean up the uploaded file if database save fails
      try {
        await supabase.storage.from('MedicalRecords').remove([uniqueFileName]);
        console.log('Cleaned up uploaded file after database error');
      } catch (cleanupError) {
        console.error('Failed to cleanup uploaded file:', cleanupError);
      }
      
      throw new Error(`Failed to save record: ${recordError.message}`);
    }

    console.log('Medical record saved successfully:', recordData);
    return recordData;
  } catch (error) {
    console.error('Error uploading medical record:', error);
    
    // Provide more specific error messages
    if (error instanceof Error) {
      if (error.message.includes('Network request failed')) {
        throw new Error('Network connection failed. Please check your internet connection and try again.');
      } else if (error.message.includes('bucket not configured')) {
        throw new Error('Storage service not configured. Please contact support.');
      } else if (error.message.includes('not authenticated')) {
        throw new Error('Please log in again to upload files.');
      }
    }
    
    throw error;
  }
};

// Fallback upload method that saves file data directly to database
export const uploadMedicalRecordFallback = async (
  file: any,
  fileName: string,
  description?: string
): Promise<MedicalRecord | null> => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      throw new Error('User not authenticated');
    }

    const userId = user.id;
    const timestamp = Date.now();
    const fileExtension = fileName.split('.').pop() || 'jpg';

    console.log('Using fallback upload method for:', fileName);
    console.log('File size:', file.size, 'bytes');

    // Check file size limit (5MB for base64 storage)
    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
      throw new Error('File too large for fallback storage. Please use a smaller image or check your connection.');
    }

    // Convert blob to base64 for storage in database
    const arrayBuffer = await file.arrayBuffer();
    const base64 = btoa(String.fromCharCode(...new Uint8Array(arrayBuffer)));
    const dataUrl = `data:image/${fileExtension};base64,${base64}`;

    console.log('File converted to base64, size:', dataUrl.length, 'characters');

    // Save record to database with base64 data
    const { data: recordData, error: recordError } = await supabase
      .from('MedicalRecords')
      .insert({
        userId: userId,
        fileName: fileName,
        fileUrl: dataUrl, // Store base64 data as URL
        fileType: fileExtension,
        fileSize: file.size || 0,
        description: description
      })
      .select()
      .single();

    if (recordError) {
      console.error('Database save error (fallback):', recordError);
      
      // Check if it's a size limit error
      if (recordError.message.includes('value too long') || recordError.message.includes('size')) {
        throw new Error('File too large for storage. Please use a smaller image.');
      }
      
      throw new Error(`Failed to save record: ${recordError.message}`);
    }

    console.log('Medical record saved successfully (fallback):', recordData);
    return recordData;
  } catch (error) {
    console.error('Error in fallback upload:', error);
    throw error;
  }
};

export const getMedicalRecords = async (): Promise<MedicalRecord[]> => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      throw new Error('User not authenticated');
    }

    const { data, error } = await supabase
      .from('MedicalRecords')
      .select('*')
      .eq('userId', user.id)
      .order('uploadedAt', { ascending: false });

    if (error) {
      console.error('Error fetching medical records:', error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error('Error fetching medical records:', error);
    return [];
  }
};

export const deleteMedicalRecord = async (recordId: string): Promise<boolean> => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      throw new Error('User not authenticated');
    }

    // Get the record to find the file path
    const { data: record, error: fetchError } = await supabase
      .from('MedicalRecords')
      .select('*')
      .eq('id', recordId)
      .eq('userId', user.id)
      .single();

    if (fetchError || !record) {
      console.error('Error fetching record for deletion:', fetchError);
      return false;
    }

    // Delete from database
    const { error: deleteError } = await supabase
      .from('MedicalRecords')
      .delete()
      .eq('id', recordId)
      .eq('userId', user.id);

    if (deleteError) {
      console.error('Error deleting medical record:', deleteError);
      return false;
    }

    // Delete from storage (optional - you might want to keep files for audit)
    // const { error: storageError } = await supabase.storage
    //   .from('medical-records')
    //   .remove([record.fileUrl]);

    return true;
  } catch (error) {
    console.error('Error deleting medical record:', error);
    return false;
  }
};

// Legacy function - keeping for backward compatibility
export const uploadFile = async (file: any, fileName?: string) => {
  try {
    const { data, error } = await supabase.storage
      .from('MedicalRecords')
      .upload(`temp/${Date.now()}_${fileName || 'file'}`, file,{
        cacheControl: '3600',
        upsert: false
      });
    
    if (error) {
      console.error('Error uploading file:', error);
      return null;
    } else {
      console.log('File uploaded successfully:', data);
      return data;
    }
  } catch (error) {
    console.error('Error uploading file:', error);
    return null;
  }
};

export const checkIfUserIsDriver = async (phoneNumber: string): Promise<boolean> => {
  try {
    const { data, error } = await supabase
      .from('Driver')
      .select('id')
      .eq('phoneNumber', phoneNumber)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        // No rows returned - user is not a driver
        return false;
      }
      throw error;
    }

    return !!data; // Return true if driver exists
  } catch (error) {
    console.error('Error checking if user is driver:', error);
    return false;
  }
};

export const getCurrentDriverProfile = async (): Promise<any> => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user?.phone) {
      console.error('No authenticated user or phone number');
      return null;
    }

    const { data, error } = await supabase
      .from('Driver')
      .select('*')
      .eq('phoneNumber', user.phone)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        // No rows returned - driver doesn't exist
        console.log('No driver profile found for phone:', user.phone);
        return null;
      }
      console.error('Error getting current driver profile:', error);
      return null;
    }

    return data;
  } catch (error) {
    console.error('Error getting current driver profile:', error);
    return null;
  }
};