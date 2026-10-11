import { Pressable, StyleSheet, Text, View } from "react-native";
import { supabase } from "../lib/supabase";
import { colors } from "../theme";

export function UseWebsiteScreen() {
  return (
    <View style={styles.screen}>
      <Text style={styles.title}>Use the website</Text>
      <Text style={styles.body}>
        This phone app is for residents. Society admins and vendors should use the AquaOS website.
      </Text>
      <Pressable
        accessibilityRole="button"
        onPress={() => supabase?.auth.signOut()}
        style={styles.button}
      >
        <Text style={styles.buttonText}>Sign out</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    backgroundColor: colors.background,
    flex: 1,
    justifyContent: "center",
    padding: 24,
  },
  title: {
    color: colors.text,
    fontSize: 28,
    fontWeight: "700",
  },
  body: {
    color: colors.text,
    fontSize: 18,
    lineHeight: 26,
    marginTop: 12,
  },
  button: {
    alignItems: "center",
    backgroundColor: colors.primary,
    borderRadius: 8,
    height: 48,
    justifyContent: "center",
    marginTop: 24,
  },
  buttonText: {
    color: colors.primaryText,
    fontSize: 18,
    fontWeight: "700",
  },
});
