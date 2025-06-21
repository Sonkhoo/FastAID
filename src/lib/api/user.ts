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
