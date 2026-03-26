import { Redirect, Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { useAuthContext } from '@/src/features/auth/AuthProvider';

function TabIcon({ name, color, size }: { name: any; color: string; size: number }) {
  return <Ionicons name={name} size={size} color={color} />;
}

export default function AppLayout() {
  const { status } = useAuthContext();

  if (status === 'loading') {
    return null;
  }

  if (status !== 'signed_in') {
    return <Redirect href='/(public)/welcome' />;
  }

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        sceneStyle: { backgroundColor: '#08111F' },
        tabBarActiveTintColor: '#FFFFFF',
        tabBarInactiveTintColor: '#8FA1CC',
        tabBarShowLabel: true,
        tabBarHideOnKeyboard: true,
        tabBarStyle: {
          position: 'absolute',
          left: 14,
          right: 14,
          bottom: 14,
          height: 72,
          paddingTop: 8,
          paddingBottom: 10,
          backgroundColor: '#111C33',
          borderTopWidth: 1,
          borderTopColor: '#27385F',
          borderRadius: 22,
          shadowColor: '#020617',
          shadowOpacity: 0.26,
          shadowRadius: 18,
          shadowOffset: { width: 0, height: 10 },
          elevation: 10,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '700',
        },
      }}
    >
      <Tabs.Screen
        name='home'
        options={{
          title: 'Home',
          href: '/(app)/home',
          tabBarIcon: ({ color, size }) => <TabIcon name='home' color={color} size={size} />,
        }}
      />

      <Tabs.Screen
        name='career-path'
        options={{
          title: 'Path',
          href: '/(app)/career-path',
          tabBarIcon: ({ color, size }) => <TabIcon name='map' color={color} size={size} />,
        }}
      />

      <Tabs.Screen
        name='resume'
        options={{
          title: 'Resume',
          href: '/(app)/resume',
          tabBarIcon: ({ color, size }) => <TabIcon name='document-text' color={color} size={size} />,
        }}
      />

      <Tabs.Screen
        name='tracker'
        options={{
          title: 'Tracker',
          href: '/(app)/tracker',
          tabBarIcon: ({ color, size }) => <TabIcon name='briefcase' color={color} size={size} />,
        }}
      />

      <Tabs.Screen
        name='profile'
        options={{
          title: 'Profile',
          href: '/(app)/profile',
          tabBarIcon: ({ color, size }) => <TabIcon name='person' color={color} size={size} />,
        }}
      />

      <Tabs.Screen name='resources' options={{ href: null }} />
      <Tabs.Screen name='settings' options={{ href: null }} />
      <Tabs.Screen name='subscriptions' options={{ href: null }} />
      <Tabs.Screen name='applications' options={{ href: null }} />
      <Tabs.Screen name='career-coach' options={{ href: null }} />
      <Tabs.Screen name='growth' options={{ href: null }} />
      <Tabs.Screen name='interview' options={{ href: null }} />
      <Tabs.Screen name='jobs' options={{ href: null }} />
      <Tabs.Screen name='edit-profile' options={{ href: null }} />
    </Tabs>
  );
}
