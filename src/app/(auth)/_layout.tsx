// 

//chatgpt


// app/auth/_layout.tsx
import { Redirect, Stack, useRouter } from 'expo-router';
import { useAuth } from '../../contexts/AuthContext';

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  const { session, user, isDriver, loading } = useAuth();
  const router = useRouter();

  // As soon as we have both session + user, send them to /
//   useEffect(() => {
//     if (!loading && session && user) {
//       // Replace the auth stack with the home route
//       router.replace('./(user)/index');
//     }
//   }, [loading, session, user]);

  // If you want a declarative version instead of useEffect, you can do:


  if(isDriver && !loading && session && user) {
    return <Redirect href="./(driver)/" />;
  }

  if (!loading && session && user) {
    return <Redirect href="./(user)/" />;
  }

  return (
    <Stack screenOptions={{ headerShown: false }}>
      {children}
    </Stack>
  );
}
