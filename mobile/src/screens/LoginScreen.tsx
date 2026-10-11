import { useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { supabase } from "../lib/supabase";
import { colors } from "../theme";

export function LoginScreen() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function signIn() {
    if (!supabase) return;
    setError(null);
    setPending(true);
    const result = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });
    if (result.error) {
      setError(result.error.message);
      setPending(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.screen}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <View style={styles.card}>
        <Text style={styles.brand}>AquaOS</Text>
        <Text style={styles.title}>Resident sign in</Text>
        <Text style={styles.hint}>Use the email and password from your society.</Text>
        <Text style={styles.label}>Email</Text>
        <TextInput
          autoCapitalize="none"
          autoComplete="email"
          autoCorrect={false}
          keyboardType="email-address"
          value={email}
          onChangeText={setEmail}
          style={styles.input}
        />
        <Text style={styles.label}>Password</Text>
        <TextInput
          secureTextEntry
          autoComplete="password"
          value={password}
          onChangeText={setPassword}
          style={styles.input}
        />
        {error ? <Text style={styles.error}>{error}</Text> : null}
        <Pressable
          accessibilityRole="button"
          disabled={pending}
          onPress={signIn}
          style={[styles.button, pending ? styles.buttonDisabled : null]}
        >
          {pending ? (
            <ActivityIndicator color={colors.primaryText} />
          ) : (
            <Text style={styles.buttonText}>Sign in</Text>
          )}
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
    justifyContent: "center",
    padding: 20,
  },
  card: {
    backgroundColor: colors.card,
    borderColor: colors.border,
    borderRadius: 12,
    borderWidth: 1,
    padding: 20,
  },
  brand: {
    color: colors.primary,
    fontSize: 14,
    fontWeight: "700",
  },
  title: {
    color: colors.text,
    fontSize: 28,
    fontWeight: "700",
    marginTop: 4,
  },
  hint: {
    color: colors.muted,
    fontSize: 16,
    marginBottom: 16,
    marginTop: 8,
  },
  label: {
    color: colors.text,
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 6,
  },
  input: {
    backgroundColor: colors.card,
    borderColor: colors.border,
    borderRadius: 8,
    borderWidth: 1,
    color: colors.text,
    fontSize: 18,
    height: 48,
    marginBottom: 14,
    paddingHorizontal: 12,
  },
  error: {
    color: colors.danger,
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 12,
  },
  button: {
    alignItems: "center",
    backgroundColor: colors.primary,
    borderRadius: 8,
    height: 48,
    justifyContent: "center",
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  buttonText: {
    color: colors.primaryText,
    fontSize: 18,
    fontWeight: "700",
  },
});
