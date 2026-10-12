import { TabList, TabSlot, TabTrigger, Tabs } from 'expo-router/ui';
import { View } from 'react-native';

import { SettingsButton } from '@/components/SettingsButton';
import { TABS, TabBar } from '@/components/TabBar';
import { useTheme } from '@/theme/ThemeProvider';

export default function TabsLayout() {
  const { c } = useTheme();
  return (
    <Tabs>
      {/* Sekme çubuğu içeriğin üstünde durur (buzlu cam); ekranlar tam yükseklik. */}
      <View style={{ flex: 1, backgroundColor: c.bg }}>
        <TabSlot />
        <SettingsButton />
      </View>
      <TabBar />
      {/* Sekmelerin tanımı burada; görünen çubuk TabBar. */}
      <TabList style={{ display: 'none' }}>
        {TABS.map((t) => (
          <TabTrigger key={t.name} name={t.name} href={t.href} />
        ))}
      </TabList>
    </Tabs>
  );
}
