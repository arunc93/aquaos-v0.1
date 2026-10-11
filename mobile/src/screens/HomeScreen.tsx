import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  AppState,
  Image,
  Linking,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { BOOKING_STATUSES, STATUS_LABEL, type BookingStatus } from "../lib/booking";
import { formatWhen } from "../lib/format";
import { signOutAndClearPush } from "../lib/register-push";
import { supabase } from "../lib/supabase";
import { announcementMessage, deliveryMessage, whatsappShareUrl } from "../lib/whatsapp";
import { colors, statusColor } from "../theme";

type Delivery = {
  id: string;
  vendor_name: string;
  capacity_kl: number;
  status: BookingStatus;
  scheduled_at: string;
  slot_label: string;
  proof_path: string | null;
};

type Announcement = {
  id: string;
  title: string;
  message: string;
  created_at: string;
};

function isStatus(value: string): value is BookingStatus {
  return (BOOKING_STATUSES as readonly string[]).includes(value);
}

async function openWhatsApp(text: string) {
  await Linking.openURL(whatsappShareUrl(text));
}

export function HomeScreen({ userId, societyId }: { userId: string; societyId: string }) {
  const [societyName, setSocietyName] = useState("Your society");
  const [deliveries, setDeliveries] = useState<Delivery[]>([]);
  const [photos, setPhotos] = useState<Record<string, string>>({});
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [message, setMessage] = useState("");
  const [bookingId, setBookingId] = useState("");
  const [tds, setTds] = useState("");
  const [rating, setRating] = useState<number | null>(null);
  const [feedbackError, setFeedbackError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [sending, setSending] = useState(false);

  const load = useCallback(async () => {
    if (!supabase) return;
    setError(null);
    const [society, deliveryResult, announcementResult] = await Promise.all([
      supabase.from("societies").select("name").eq("id", societyId).single(),
      supabase.rpc("my_deliveries"),
      supabase
        .from("announcements")
        .select("id, title, message, created_at")
        .eq("society_id", societyId)
        .order("created_at", { ascending: false }),
    ]);
    if (society.error || deliveryResult.error || announcementResult.error) {
      setError(society.error?.message ?? deliveryResult.error?.message ?? announcementResult.error?.message ?? "Could not load.");
      return;
    }
    if (society.data?.name) setSocietyName(society.data.name);
    const rows: Delivery[] = [];
    for (const row of deliveryResult.data ?? []) {
      const record = row as Record<string, unknown>;
      const status = String(record.status ?? "");
      if (!isStatus(status)) continue;
      rows.push({
        id: String(record.id),
        vendor_name: String(record.vendor_name ?? ""),
        capacity_kl: Number(record.capacity_kl),
        status,
        scheduled_at: String(record.scheduled_at),
        slot_label: String(record.slot_label ?? ""),
        proof_path: record.proof_path ? String(record.proof_path) : null,
      });
    }
    setDeliveries(rows);
    setAnnouncements((announcementResult.data ?? []) as Announcement[]);
    const nextPhotos: Record<string, string> = {};
    await Promise.all(
      rows.map(async (row) => {
        if (!row.proof_path || !supabase) return;
        const signed = await supabase.storage.from("delivery-proofs").createSignedUrl(row.proof_path, 60 * 30);
        if (signed.data?.signedUrl) nextPhotos[row.id] = signed.data.signedUrl;
      }),
    );
    setPhotos(nextPhotos);
  }, [societyId]);

  useEffect(() => {
    load().catch((reason: unknown) => {
      setError(reason instanceof Error ? reason.message : "Could not load.");
    });
  }, [load]);

  useEffect(() => {
    const subscription = AppState.addEventListener("change", (state) => {
      if (state === "active") {
        load().catch(() => undefined);
      }
    });
    return () => subscription.remove();
  }, [load]);

  const nextDelivery = [...deliveries]
    .filter((row) => row.status !== "cancelled" && row.status !== "delivered")
    .sort((a, b) => a.scheduled_at.localeCompare(b.scheduled_at))[0];

  async function sendFeedback() {
    if (!supabase) return;
    const text = message.trim();
    if (text.length < 4 || text.length > 1000) {
      setFeedbackError("Describe the issue in a few words.");
      setNotice(null);
      return;
    }
    const tdsValue = tds.trim() ? Number(tds) : null;
    if (tdsValue !== null && (!Number.isFinite(tdsValue) || tdsValue < 0 || tdsValue > 5000)) {
      setFeedbackError("Enter a TDS number.");
      setNotice(null);
      return;
    }
    setSending(true);
    setFeedbackError(null);
    setNotice(null);
    const inserted = await supabase.from("complaints").insert({
      society_id: societyId,
      booking_id: bookingId || null,
      created_by: userId,
      message: text,
      tds: tdsValue,
      rating,
      status: "open",
    });
    setSending(false);
    if (inserted.error) {
      setFeedbackError(inserted.error.message);
      return;
    }
    setMessage("");
    setTds("");
    setRating(null);
    setBookingId("");
    setNotice("Feedback sent to the society admin.");
  }

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={() => {
            setRefreshing(true);
            load()
              .catch(() => undefined)
              .finally(() => setRefreshing(false));
          }}
        />
      }
    >
      <View style={styles.header}>
        <Text style={styles.eyebrow}>{societyName}</Text>
        <Pressable accessibilityRole="button" onPress={() => signOutAndClearPush()}>
          <Text style={styles.signOut}>Sign out</Text>
        </Pressable>
      </View>
      {error ? <Text style={styles.error}>{error}</Text> : null}

      <Text style={styles.heading}>Next delivery</Text>
      {nextDelivery ? (
        <View style={styles.card}>
          <View style={styles.row}>
            <Text style={styles.cardTitle}>{nextDelivery.vendor_name}</Text>
            <Text style={[styles.status, { color: statusColor[nextDelivery.status] }]}>
              {STATUS_LABEL[nextDelivery.status]}
            </Text>
          </View>
          <Text style={styles.body}>
            {nextDelivery.capacity_kl} KL · {nextDelivery.slot_label}
          </Text>
          <Text style={styles.muted}>{formatWhen(nextDelivery.scheduled_at)}</Text>
          <ShareButton
            onPress={() =>
              openWhatsApp(
                deliveryMessage({
                  societyName,
                  status: nextDelivery.status,
                  vendorName: nextDelivery.vendor_name,
                  capacityKl: nextDelivery.capacity_kl,
                  slotLabel: nextDelivery.slot_label,
                  scheduledAt: nextDelivery.scheduled_at,
                }),
              )
            }
          />
        </View>
      ) : (
        <Text style={styles.body}>No tanker is booked right now.</Text>
      )}

      <Text style={styles.heading}>Deliveries</Text>
      {deliveries.length === 0 ? <Text style={styles.muted}>None yet.</Text> : null}
      {deliveries.map((row) => (
        <View key={row.id} style={styles.card}>
          <View style={styles.row}>
            <Text style={styles.cardTitle}>{row.vendor_name}</Text>
            <Text style={[styles.status, { color: statusColor[row.status] }]}>{STATUS_LABEL[row.status]}</Text>
          </View>
          <Text style={styles.body}>
            {row.slot_label} · {formatWhen(row.scheduled_at)} · {row.capacity_kl} KL
          </Text>
          {photos[row.id] ? (
            <Image source={{ uri: photos[row.id] }} style={styles.photo} accessibilityLabel="Delivery proof" />
          ) : null}
        </View>
      ))}

      <Text style={styles.heading}>Announcements</Text>
      {announcements.length === 0 ? <Text style={styles.muted}>No announcements.</Text> : null}
      {announcements.map((item) => (
        <View key={item.id} style={styles.card}>
          <Text style={styles.cardTitle}>{item.title}</Text>
          <Text style={styles.body}>{item.message}</Text>
          <Text style={styles.muted}>{formatWhen(item.created_at)}</Text>
          <ShareButton
            onPress={() =>
              openWhatsApp(
                announcementMessage({
                  societyName,
                  title: item.title,
                  message: item.message,
                }),
              )
            }
          />
        </View>
      ))}

      <Text style={styles.heading}>Report an issue</Text>
      <Text style={styles.label}>What is wrong?</Text>
      <TextInput
        multiline
        value={message}
        onChangeText={setMessage}
        style={[styles.input, styles.area]}
      />
      <Text style={styles.label}>Related delivery</Text>
      <Text style={styles.hint}>Optional.</Text>
      <Choice
        selected={bookingId === ""}
        label="Not about a specific delivery"
        onPress={() => setBookingId("")}
      />
      {deliveries.map((row) => (
        <Choice
          key={row.id}
          selected={bookingId === row.id}
          label={`${row.vendor_name} · ${formatWhen(row.scheduled_at)}`}
          onPress={() => setBookingId(row.id)}
        />
      ))}
      <Text style={styles.label}>TDS, if you measured it</Text>
      <Text style={styles.hint}>Optional.</Text>
      <TextInput
        keyboardType="decimal-pad"
        value={tds}
        onChangeText={setTds}
        style={styles.input}
      />
      <Text style={styles.label}>Rating</Text>
      <Text style={styles.hint}>Optional. 1 is poor and 5 is good.</Text>
      <View style={styles.ratings}>
        {[1, 2, 3, 4, 5].map((score) => (
          <Pressable
            key={score}
            accessibilityRole="button"
            onPress={() => setRating(rating === score ? null : score)}
            style={[styles.rating, rating === score ? styles.ratingSelected : null]}
          >
            <Text style={[styles.ratingText, rating === score ? styles.ratingTextSelected : null]}>{score}</Text>
          </Pressable>
        ))}
      </View>
      {feedbackError ? <Text style={styles.error}>{feedbackError}</Text> : null}
      {notice ? <Text style={styles.notice}>{notice}</Text> : null}
      <Pressable
        accessibilityRole="button"
        disabled={sending}
        onPress={sendFeedback}
        style={[styles.primary, sending ? styles.disabled : null]}
      >
        {sending ? (
          <ActivityIndicator color={colors.primaryText} />
        ) : (
          <Text style={styles.primaryText}>Send feedback</Text>
        )}
      </Pressable>
    </ScrollView>
  );
}

function ShareButton({ onPress }: { onPress: () => void }) {
  return (
    <Pressable accessibilityRole="button" onPress={onPress} style={styles.share}>
      <Text style={styles.shareText}>Share on WhatsApp</Text>
    </Pressable>
  );
}

function Choice({ selected, label, onPress }: { selected: boolean; label: string; onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      onPress={onPress}
      style={[styles.choice, selected ? styles.choiceSelected : null]}
    >
      <Text style={styles.body}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: { backgroundColor: colors.background, flex: 1 },
  content: { padding: 20, paddingBottom: 40 },
  header: { alignItems: "center", flexDirection: "row", justifyContent: "space-between" },
  eyebrow: { color: colors.primary, flex: 1, fontSize: 16, fontWeight: "700", marginRight: 12 },
  signOut: { color: colors.primary, fontSize: 16, fontWeight: "700" },
  heading: { color: colors.text, fontSize: 22, fontWeight: "700", marginBottom: 8, marginTop: 24 },
  card: {
    backgroundColor: colors.card,
    borderColor: colors.border,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 12,
    padding: 14,
  },
  row: { alignItems: "center", flexDirection: "row", justifyContent: "space-between", gap: 8 },
  cardTitle: { color: colors.text, flex: 1, fontSize: 18, fontWeight: "700" },
  status: { fontSize: 15, fontWeight: "700" },
  body: { color: colors.text, fontSize: 16, marginTop: 4 },
  muted: { color: colors.muted, fontSize: 15, marginTop: 4 },
  hint: { color: colors.muted, fontSize: 14, marginBottom: 6 },
  photo: { borderRadius: 8, height: 140, marginTop: 10, width: "100%" },
  label: { color: colors.text, fontSize: 16, fontWeight: "700", marginTop: 12 },
  input: {
    backgroundColor: colors.card,
    borderColor: colors.border,
    borderRadius: 8,
    borderWidth: 1,
    color: colors.text,
    fontSize: 18,
    marginTop: 6,
    minHeight: 48,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  area: { minHeight: 96, textAlignVertical: "top" },
  choice: {
    backgroundColor: colors.card,
    borderColor: colors.border,
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 8,
    minHeight: 48,
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  choiceSelected: { borderColor: colors.primary, borderWidth: 2 },
  ratings: { flexDirection: "row", gap: 8, marginTop: 8 },
  rating: {
    alignItems: "center",
    backgroundColor: colors.card,
    borderColor: colors.border,
    borderRadius: 8,
    borderWidth: 1,
    height: 48,
    justifyContent: "center",
    width: 48,
  },
  ratingSelected: { backgroundColor: colors.primary, borderColor: colors.primary },
  ratingText: { color: colors.text, fontSize: 18, fontWeight: "700" },
  ratingTextSelected: { color: colors.primaryText },
  share: {
    alignItems: "center",
    borderColor: colors.border,
    borderRadius: 8,
    borderWidth: 1,
    height: 48,
    justifyContent: "center",
    marginTop: 12,
  },
  shareText: { color: colors.text, fontSize: 16, fontWeight: "700" },
  primary: {
    alignItems: "center",
    backgroundColor: colors.primary,
    borderRadius: 8,
    height: 48,
    justifyContent: "center",
    marginTop: 16,
  },
  primaryText: { color: colors.primaryText, fontSize: 18, fontWeight: "700" },
  disabled: { opacity: 0.7 },
  error: { color: colors.danger, fontSize: 16, fontWeight: "600", marginTop: 8 },
  notice: { color: colors.success, fontSize: 16, fontWeight: "600", marginTop: 8 },
});
