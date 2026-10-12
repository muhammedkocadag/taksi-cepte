import { Stack } from 'expo-router';
import { SQLiteProvider } from 'expo-sqlite';
import { StatusBar } from 'expo-status-bar';
import { View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { NotificationSync } from '@/components/NotificationSync';
import { migrate } from '@/store/db';
import { ProfileProvider, useProfile } from '@/store/profile';
import { ShiftProvider } from '@/store/shift';
import { VehicleProvider } from '@/store/vehicle';
import { ThemeProvider, useTheme } from '@/theme/ThemeProvider';

function Screens() {
  const { c, isDark } = useTheme();
  const { profile } = useProfile();
  return (
    <View style={{ flex: 1, backgroundColor: c.bg }}>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <NotificationSync />
      {/* Zemin opak; ışıklı zemin (Backdrop) her ekranın kendi içinde çizilir. iOS, saydam ekranların
          arkasına kendi (açık modda beyaz) zeminini koyduğu için saydamlığa güvenilmez. */}
      <Stack
        screenOptions={{
          headerShown: false,
          animation: 'fade',
          animationDuration: 150,
          contentStyle: { backgroundColor: c.bg },
        }}
      >
        {/* Giriş yapılmamışsa sadece giriş ekranı açılır. */}
        <Stack.Protected guard={!!profile}>
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="kayit" />
          <Stack.Screen name="gecmis" />
          <Stack.Screen name="ayarlar" />
        </Stack.Protected>
        <Stack.Protected guard={!profile}>
          <Stack.Screen name="giris" />
        </Stack.Protected>
      </Stack>
    </View>
  );
}

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <SQLiteProvider databaseName="taksi.db" onInit={async (db) => migrate(db)}>
        <ProfileProvider>
          <ThemeProvider>
            <VehicleProvider>
              <ShiftProvider>
                <Screens />
              </ShiftProvider>
            </VehicleProvider>
          </ThemeProvider>
        </ProfileProvider>
      </SQLiteProvider>
    </SafeAreaProvider>
  );
}
