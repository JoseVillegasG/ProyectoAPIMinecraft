import { Tabs } from 'expo-router';

export default function TabLayout() {
  return (
    <Tabs screenOptions={{ headerShown: false, tabBarStyle: {display: 'none'}}}>
      <Tabs.Screen 
        name="auth" 
        options={{ 
          title: 'Profile',
        }} 
      />
      <Tabs.Screen 
        name="home" 
        options={{ 
          title: 'Home' 
        }} 
      />
    </Tabs>
  );
}