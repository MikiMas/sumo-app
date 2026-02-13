import { ReactNode, useEffect, useRef } from "react";
import { ActivityIndicator, Animated, Easing, Pressable, StyleSheet, Text, TextInput, View, ViewStyle } from "react-native";
import { theme } from "@/lib/theme";

export function Screen({ children }: { children: ReactNode }) {
  return (
    <View style={styles.screen}>
      <View style={styles.content}>{children}</View>
    </View>
  );
}

export function Card({ children, style }: { children: ReactNode; style?: ViewStyle }) {
  return <View style={[styles.card, style]}>{children}</View>;
}

export function ShimmerBlock({ height, width = "100%", radius = 10, style }: { height: number; width?: number | `${number}%`; radius?: number; style?: ViewStyle }) {
  const progress = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.timing(progress, {
        toValue: 1,
        duration: 1300,
        easing: Easing.inOut(Easing.ease),
        useNativeDriver: true
      })
    );
    loop.start();
    return () => loop.stop();
  }, [progress]);

  const shimmerTranslate = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [-160, 260]
  });

  return (
    <View style={[styles.shimmerBase, { height, width, borderRadius: radius }, style]}>
      <Animated.View style={[styles.shimmerGlow, { transform: [{ translateX: shimmerTranslate }] }]} />
    </View>
  );
}

export function ShimmerCard({ lines = 3 }: { lines?: number }) {
  return (
    <Card style={styles.shimmerCard}>
      <ShimmerBlock height={16} width="52%" />
      <ShimmerBlock height={12} width="88%" />
      {Array.from({ length: Math.max(1, lines - 2) }).map((_, index) => (
        <ShimmerBlock key={index} height={12} width={index % 2 === 0 ? "76%" : "64%"} />
      ))}
    </Card>
  );
}

export function MapShimmer({ height = 260 }: { height?: number }) {
  return (
    <View style={[styles.mapShimmerWrap, { height }]}>
      <View style={styles.mapGrid}>
        {Array.from({ length: 6 }).map((_, row) => (
          <View key={`r-${row}`} style={styles.mapRow}>
            {Array.from({ length: 4 }).map((__, col) => (
              <ShimmerBlock key={`c-${row}-${col}`} height={40} width="24%" radius={8} />
            ))}
          </View>
        ))}
      </View>
      <View style={styles.mapOverlayCard}>
        <ShimmerBlock height={14} width="48%" />
        <ShimmerBlock height={10} width="88%" />
      </View>
    </View>
  );
}

type InputProps = React.ComponentProps<typeof TextInput> & {
  label: string;
};

export function LabeledInput({ label, ...props }: InputProps) {
  return (
    <View style={styles.inputWrap}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        placeholderTextColor={theme.colors.textSecondary}
        style={styles.input}
        autoCapitalize="none"
        autoCorrect={false}
        {...props}
      />
    </View>
  );
}

type ButtonProps = {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  loading?: boolean;
  variant?: "primary" | "danger" | "secondary";
};

export function AppButton({ label, onPress, disabled = false, loading = false, variant = "primary" }: ButtonProps) {
  const palette = buttonVariants[variant];
  const isDisabled = disabled || loading;

  return (
    <Pressable
      onPress={onPress}
      disabled={isDisabled}
      style={({ pressed }) => [
        styles.button,
        {
          backgroundColor: palette.bg,
          borderColor: palette.border,
          borderWidth: palette.border ? 1 : 0,
          opacity: isDisabled ? 0.5 : pressed ? 0.85 : 1
        }
      ]}
    >
      {loading ? <ActivityIndicator color={palette.fg} /> : <Text style={[styles.buttonText, { color: palette.fg }]}>{label}</Text>}
    </Pressable>
  );
}

const buttonVariants = {
  primary: { bg: theme.colors.primary, fg: theme.colors.white, border: undefined as string | undefined },
  danger: { bg: theme.colors.danger, fg: theme.colors.white, border: undefined as string | undefined },
  secondary: { bg: theme.colors.secondary, fg: "#111111", border: "#D0D4DB" }
};

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: theme.colors.bg
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 14
  },
  card: {
    backgroundColor: theme.colors.card,
    borderWidth: 1,
    borderColor: "#D5DAE1",
    borderRadius: 18,
    padding: 14,
    shadowColor: "#000000",
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 3
  },
  inputWrap: {
    gap: 6
  },
  label: {
    color: theme.colors.textSecondary,
    fontSize: 13,
    fontFamily: "BebasNeue"
  },
  input: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#CBD2DC",
    borderRadius: 12,
    color: "#111827",
    fontFamily: "BebasNeue",
    paddingHorizontal: 12,
    paddingVertical: 10
  },
  button: {
    minHeight: 46,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 14,
    shadowColor: "#000000",
    shadowOpacity: 0.12,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3
  },
  buttonText: {
    fontFamily: "BebasNeue",
    letterSpacing: 0.2
  },
  shimmerBase: {
    overflow: "hidden",
    backgroundColor: "#E6EAF1",
    borderWidth: 1,
    borderColor: "#DCE2EB"
  },
  shimmerGlow: {
    width: "42%",
    height: "100%",
    backgroundColor: "#F8FAFC",
    opacity: 0.8
  },
  shimmerCard: {
    gap: 10
  },
  mapShimmerWrap: {
    width: "100%",
    borderRadius: 14,
    overflow: "hidden",
    backgroundColor: "#E8EDF5",
    borderWidth: 1,
    borderColor: "#D8DEE8",
    justifyContent: "space-between"
  },
  mapGrid: {
    padding: 10,
    gap: 8
  },
  mapRow: {
    flexDirection: "row",
    justifyContent: "space-between"
  },
  mapOverlayCard: {
    margin: 10,
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#D3DBE7",
    backgroundColor: "rgba(255, 255, 255, 0.9)",
    gap: 8
  }
});
