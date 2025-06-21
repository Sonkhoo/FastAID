import { supabase } from '../supabase';

export const updateUserLocation = async (latitude: number, longitude: number) => {
    const userID = '343a7204-e051-4513-b856-450cd7ebf588'; // TODO: auth user
    const {data: user, error: userError} = await supabase
        .from('User')
        .select('id')
        .eq('id', userID);
      
    if (userError) {
        console.error('Error fetching user:', {
          message: userError.message,
          code: userError.code,
          details: userError.details,
          hint: userError.hint
        });
        return;
      }
      
    if (!user || user.length === 0) {
        console.log('User not found in the database');
        return;
      }
      console.log('Attempting to update location for userID:', userID);
      // Step 1: Verify we can read the user row first to debug RLS issues.
      console.log(`Verifying user with ID: ${userID}`);
      const { data: existingUser, error: selectError } = await supabase
        .from('User')
        .select('id')
        .eq('id', userID)
        .single();

    if (selectError || !existingUser) {
        console.error('Error fetching user before update, or user not found:', selectError);
        return;
      }

    console.log('Successfully fetched user, proceeding with update.');

      // Step 2: Try to update the user's location
    const { data: updatedUser, error: updateError } = await supabase
        .from('User')
        .update({ 
            location: `POINT(${longitude} ${latitude})`
        })
        .eq('id', userID)
        .select()
        .single();

    if (updateError) {
        console.error('Error updating user location:', updateError);
        return;
      }

    if (!updatedUser) {
        console.error('Update failed: No rows were updated.');
        return;
      }
    return updatedUser;
}