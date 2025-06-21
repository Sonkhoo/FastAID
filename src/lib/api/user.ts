import { supabase } from "../supabase";
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
