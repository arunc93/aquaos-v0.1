import { useEffect, useState } from "react";
import { ActivityIndicator, SafeAreaView, StyleSheet, Text, View } from "react-native";
import { StatusBar } from "expo-status-bar";
import type { Session } from "@supabase/supabase-js";
import { HomeScreen } from "./src/screens/HomeScreen";
import { LoginScreen } from "./src/screens/LoginScreen";
import { UseWebsiteScreen } from "./src/screens/UseWebsiteScreen";
import { registerResidentPush } from "./src/lib/register-push";
import { supabase, supabaseConfigError } from "./src/lib/supabase";
import { colors } from "./src/theme";

type Profile = {
  id: string;
  role: string;
  society_id: string | null;
};

export default function App() {
  const [ready, setReady] = useState(false);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [profileError, setProfileError] = useState<string | null>(null);

  useEffect(() => {
    if (!supabase) {
      setReady(true);
      return;
    }
    let active = true;
    supabase.auth.getSession().then(({ data }) => {
      if (!active) return;
      setSession(data.session);
      setReady(true);
    });
    const { data } = supabase.auth.onAuthStateChange((_event, next) => {
      setSession(next);
      setProfile(null);
    });
    return () => {
      active = false;
      data.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!supabase || !session) {
      setProfile(null);
      return;
    }
    let active = true;
    supabase
      .from("profiles")
      .select("id, role, society_id")
      .eq("id", session.user.id)
      .single()
      .then(({ data, error }) => {
        if (!active) return;
        if (error || !data) {
          setProfileError(error?.message ?? "Could not load your profile.");
          setProfile(null);
          return;
        }
        setProfileError(null);
        setProfile(data as Profile);
      });
    return () => {
      active = false;
    };
  }, [session]);

  useEffect(() => {
    if (!profile || profile.role !== "resident" || !profile.society_id) return;
    registerResidentPush(profile.id).catch(() => undefined);
  }, [profile]);

  let body = <LoginScreen />;
  if (supabaseConfigError) {
    body = (
      <View style={styles.center}>
        <Text style={styles.message}>{supabaseConfigError}</Text>
      </View>
    );
  } else if (!ready || (session && !profile && !profileError)) {
    body = (
      <View style={styles.center}>
        <ActivityIndicator color={colors.primary} size="large" />
      </View>
    );
  } else if (profileError) {
    body = (
      <View style={styles.center}>
        <Text style={styles.message}>{profileError}</Text>
      </View>
    );
  } else if (session && profile) {
    body =
      profile.role === "resident" && profile.society_id ? (
        <HomeScreen userId={profile.id} societyId={profile.society_id} />
      ) : (
        <UseWebsiteScreen />
      );
  }

  return (
    <SafeAreaView style={styles.app}>
      <StatusBar style="dark" />
      {body}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  app: { backgroundColor: colors.background, flex: 1 },
  center: {
    alignItems: "center",
    backgroundColor: colors.background,
    flex: 1,
    justifyContent: "center",
    padding: 24,
  },
  message: { color: colors.text, fontSize: 18, textAlign: "center" },
});
