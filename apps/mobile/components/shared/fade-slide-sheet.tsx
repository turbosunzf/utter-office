/**
 * Bottom sheet: backdrop fades, body slides. RN Modal `animationType="slide"`
 * would move the dimmer with the sheet (brief 调整小队 bug).
 */
import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import {
  Animated,
  Easing,
  Modal,
  Pressable,
  StyleSheet,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColorScheme } from "@/lib/use-color-scheme";
import { THEME } from "@/lib/theme";

export function FadeSlideSheet({
  visible,
  onClose,
  children,
}: {
  visible: boolean;
  onClose: () => void;
  children: ReactNode;
}) {
  const insets = useSafeAreaInsets();
  const { colorScheme } = useColorScheme();
  const t = THEME[colorScheme];

  const [show, setShow] = useState(false);
  const [sheetHeight, setSheetHeight] = useState(0);
  const dismissing = useRef(false);
  const entered = useRef(false);
  const backdropOpacity = useRef(new Animated.Value(0)).current;
  const sheetTranslateY = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      dismissing.current = false;
      entered.current = false;
      backdropOpacity.setValue(0);
      sheetTranslateY.setValue(600);
      setShow(true);
      return;
    }
    setShow(false);
  }, [visible, backdropOpacity, sheetTranslateY]);

  useEffect(() => {
    if (show && sheetHeight > 0 && !entered.current) {
      entered.current = true;
      sheetTranslateY.setValue(sheetHeight);
      Animated.parallel([
        Animated.timing(backdropOpacity, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(sheetTranslateY, {
          toValue: 0,
          duration: 260,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [show, sheetHeight, backdropOpacity, sheetTranslateY]);

  const requestClose = useCallback(() => {
    if (dismissing.current) return;
    dismissing.current = true;
    Animated.parallel([
      Animated.timing(backdropOpacity, {
        toValue: 0,
        duration: 180,
        useNativeDriver: true,
      }),
      Animated.timing(sheetTranslateY, {
        toValue: sheetHeight || 320,
        duration: 220,
        easing: Easing.in(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start(() => {
      setShow(false);
      onClose();
    });
  }, [backdropOpacity, sheetTranslateY, sheetHeight, onClose]);

  if (!show) return null;

  return (
    <Modal
      transparent
      visible={show}
      animationType="none"
      onRequestClose={requestClose}
      statusBarTranslucent
    >
      <View style={styles.root}>
        <Animated.View
          style={[
            StyleSheet.absoluteFill,
            { backgroundColor: "rgba(0,0,0,0.4)", opacity: backdropOpacity },
          ]}
        />
        <Pressable
          style={StyleSheet.absoluteFill}
          onPress={requestClose}
          accessibilityLabel="关闭"
        />
        <Animated.View
          onLayout={(e) => setSheetHeight(e.nativeEvent.layout.height)}
          style={[
            styles.body,
            {
              backgroundColor: t.card,
              paddingBottom: insets.bottom + 12,
              transform: [{ translateY: sheetTranslateY }],
            },
          ]}
        >
          <View style={[styles.grabber, { backgroundColor: t.border }]} />
          {children}
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    justifyContent: "flex-end",
  },
  body: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  grabber: {
    width: 36,
    height: 4,
    borderRadius: 2,
    alignSelf: "center",
    marginBottom: 10,
  },
});
