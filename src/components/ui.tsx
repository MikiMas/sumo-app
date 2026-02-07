import { ReactNode } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View, ViewStyle } from "react-native";

export function Screen({ children }: { children: ReactNode }) {
  return <View style={styles.screen}>{children}</View>;
}

export function Card({ children, style }: { children: ReactNode; style?: ViewStyle }) {
  return <View style={[styles.card, style]}>{children}</View>;
}

type InputProps = React.ComponentProps<typeof TextInput> & {
  label: string;
};

export function LabeledInput({ label, ...props }: InputProps) {
  return (
    <View style={styles.inputWrap}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        placeholderTextColor="#6e7b8b"
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
        { backgroundColor: palette.bg, opacity: isDisabled ? 0.5 : pressed ? 0.85 : 1 }
      ]}
    >
      {loading ? <ActivityIndicator color={palette.fg} /> : <Text style={[styles.buttonText, { color: palette.fg }]}>{label}</Text>}
    </Pressable>
  );
}

const buttonVariants = {
  primary: { bg: "#ff6d00", fg: "#101418" },
  danger: { bg: "#d62828", fg: "#fff" },
  secondary: { bg: "#26303c", fg: "#fff" }
};

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#0b1118",
    paddingHorizontal: 16,
    paddingTop: 14
  },
  card: {
    backgroundColor: "#111b25",
    borderWidth: 1,
    borderColor: "#243244",
    borderRadius: 14,
    padding: 14
  },
  inputWrap: {
    gap: 6
  },
  label: {
    color: "#9eb4cd",
    fontSize: 13
  },
  input: {
    backgroundColor: "#0b1118",
    borderWidth: 1,
    borderColor: "#2b3f56",
    borderRadius: 10,
    color: "#f8fbff",
    paddingHorizontal: 12,
    paddingVertical: 10
  },
  button: {
    minHeight: 44,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 14
  },
  buttonText: {
    fontWeight: "700"
  }
});
