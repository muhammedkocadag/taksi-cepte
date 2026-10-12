import { useEffect, useRef, type ReactNode } from 'react';
import { Animated, KeyboardAvoidingView, Modal, Platform, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useTheme } from '@/theme/ThemeProvider';

// Alttan açılan pencere. Arka plana dokununca kapanır (dismissable false değilse).
export function Sheet({
  visible,
  onClose,
  dismissable = true,
  children,
}: {
  visible: boolean;
  onClose: () => void;
  dismissable?: boolean;
  children: ReactNode;
}) {
  const { c } = useTheme();
  const insets = useSafeAreaInsets();
  const slide = useRef(new Animated.Value(60)).current;

  useEffect(() => {
    if (!visible) return;
    slide.setValue(60);
    Animated.timing(slide, { toValue: 0, duration: 220, useNativeDriver: true }).start();
  }, [visible, slide]);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={dismissable ? onClose : undefined}>
      <KeyboardAvoidingView style={styles.fill} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <Pressable style={styles.backdrop} onPress={dismissable ? onClose : undefined} accessibilityLabel="Kapat" />
        <Animated.View
          style={[
            styles.sheet,
            {
              backgroundColor: c.surface,
              borderTopColor: c.line,
              paddingBottom: Math.max(insets.bottom, 16) + 8,
              transform: [{ translateY: slide }],
            },
          ]}
        >
          <View style={[styles.grab, { backgroundColor: c.line }]} />
          {children}
        </Animated.View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1, justifyContent: 'flex-end' },
  backdrop: { ...StyleSheet.absoluteFill, backgroundColor: 'rgba(0,0,0,0.55)' },
  sheet: {
    borderTopLeftRadius: 26,
    borderTopRightRadius: 26,
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 20,
    paddingTop: 10,
    gap: 16,
  },
  grab: { width: 42, height: 5, borderRadius: 3, alignSelf: 'center', marginBottom: 2 },
});
