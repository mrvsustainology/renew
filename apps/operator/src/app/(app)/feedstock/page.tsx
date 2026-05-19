"use client";

import { useState, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle } from "lucide-react";
import {
  Btn,
  Field,
  TI,
  TA,
  AlertBox,
  Card,
  Heading,
  ConfirmSheet,
} from "@/components/ui";
import { PhotoUploader } from "@/components/forms/PhotoUploader";
import { feedstockApi } from "@/lib/api/feedstock.api";
import { useOnlineStatus } from "@/hooks/useOnlineStatus";
import { useAuthStore } from "@/store/authStore";
import { C } from "@/lib/utils/tokens";

// ─── Constants ───────────────────────────────────────────────────────────────
const FEEDSTOCK_TYPES = [
  "Animal Dung (Cow)",
  "Water Hyacinth",
  "Mango Peels",
  "Other Organic Waste",
] as const;

const MAX_PHOTO_BYTES = 10 * 1024 * 1024;

type FeedstockType = (typeof FEEDSTOCK_TYPES)[number];

// ─── Types ───────────────────────────────────────────────────────────────────
interface FormState {
  date: string;
  type: FeedstockType | "";
  weight: string;
  type2: FeedstockType | "";
  weight2: string;
  waterLitres: string;
  notes: string;
  photo: File | null;
  photoPreview?: string;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────
function todayISO() {
  return new Date().toLocaleDateString("en-CA");
}

function fmtDate(d: string) {
  return new Date(d + "T00:00:00").toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

const EMPTY_FORM: FormState = {
  date: "",
  type: "",
  weight: "",
  type2: "",
  weight2: "",
  waterLitres: "",
  notes: "",
  photo: null,
  photoPreview: undefined,
};

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function FeedstockPage() {
  const { isOnline } = useOnlineStatus();
  const { user } = useAuthStore();
  const router = useRouter();

  const [form, setForm] = useState<FormState>({
    ...EMPTY_FORM,
    date: todayISO(),
  });

  const [confirm, setConfirm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [offline, setOffline] = useState(false);
  const [generalError, setGeneralError] = useState<string | null>(null);
  const [photoError, setPhotoError] = useState<string | null>(null);

  const twoSelected = !!form.type && !!form.type2;
  const canSubmit =
    !!form.type &&
    !!form.weight &&
    !!form.photo &&
    (!form.type2 || !!form.weight2);

  // ── Field updater ──────────────────────────────────────────────────────────
  const set = useCallback(
    <K extends keyof FormState>(key: K, val: FormState[K]) => {
      setForm((f) => ({ ...f, [key]: val }));
    },
    [],
  );

  // ── Type chip toggle (max 2 selections) ───────────────────────────────────
  function toggleType(t: FeedstockType) {
    setForm((f) => {
      if (f.type === t) {
        // Deselect slot 1 — promote slot 2 to slot 1
        return { ...f, type: f.type2, weight: f.weight2, type2: "", weight2: "" };
      }
      if (f.type2 === t) {
        // Deselect slot 2
        return { ...f, type2: "", weight2: "" };
      }
      if (!f.type) {
        return { ...f, type: t };
      }
      if (!f.type2) {
        return { ...f, type2: t };
      }
      // Both slots filled — no-op
      return f;
    });
  }

  // ── Submit ──────────────────────────────────────────────────────────────────
  const submittingRef = useRef(false);
  async function handleSubmit() {
    if (submittingRef.current) return;
    submittingRef.current = true;
    setSubmitting(true);
    setGeneralError(null);
    try {
      const status = await feedstockApi.submit(
        {
          date: form.date,
          type: form.type as FeedstockType,
          weight: Number(form.weight),
          type2: form.type2 || undefined,
          weight2: form.type2 && form.weight2 ? Number(form.weight2) : undefined,
          waterLitres: form.waterLitres !== "" ? Number(form.waterLitres) : 0,
          notes: form.notes.trim() || undefined,
        },
        form.photo!,
        isOnline,
      );
      setOffline(!status.synced);
      setConfirm(false);
      setDone(true);
    } catch (err: unknown) {
      setConfirm(false);
      setGeneralError(
        err instanceof Error ? err.message : "Something went wrong",
      );
    } finally {
      submittingRef.current = false;
      setSubmitting(false);
    }
  }

  // ── Success screen ──────────────────────────────────────────────────────────
  if (done) {
    return (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 16,
          padding: 64,
          minHeight: "60dvh",
        }}
      >
        <div
          style={{
            background: offline ? C.accent + "18" : C.success + "18",
            borderRadius: 50,
            padding: 20,
          }}
        >
          <CheckCircle size={42} color={offline ? C.accent : C.success} />
        </div>
        <Heading size="lg">Entry Submitted!</Heading>
        <p
          style={{
            color: C.muted,
            fontSize: 13,
            textAlign: "center",
            maxWidth: 280,
            lineHeight: 1.6,
          }}
        >
          {offline
            ? "Saved offline. Will sync when connected."
            : "Feedstock log saved. You can add another entry for today."}
        </p>
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 10,
            width: "100%",
            maxWidth: 320,
            marginTop: 8,
          }}
        >
          <Btn
            fullWidth
            size="lg"
            onClick={() => {
              setForm({ ...EMPTY_FORM, date: todayISO() });
              setDone(false);
              setGeneralError(null);
            }}
          >
            + Log Another
          </Btn>
          <Btn
            fullWidth
            size="lg"
            variant="secondary"
            onClick={() => router.push("/dashboard")}
          >
            ← Back to Dashboard
          </Btn>
        </div>
      </div>
    );
  }

  // ── Form ────────────────────────────────────────────────────────────────────
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
      <div>
        <Heading size="xl">Log Feedstock</Heading>
        <p style={{ color: C.muted, fontSize: 13, marginTop: 4 }}>
          Multiple entries per day are allowed.
        </p>
      </div>

      {!isOnline && (
        <AlertBox type="warning">Offline — will sync on reconnect.</AlertBox>
      )}
      {generalError && <AlertBox type="error">{generalError}</AlertBox>}

      <Card>
        <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>

          {/* Date + Digester */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
              gap: 14,
            }}
          >
            <Field label="Date" required>
              <TI
                type="date"
                value={form.date}
                max={todayISO()}
                onChange={(e) => set("date", e.target.value)}
              />
            </Field>
            <Field label="Digester">
              <TI value={user?.digesterId ?? "—"} onChange={() => {}} disabled />
            </Field>
          </div>

          {/* Feedstock Type multi-select chips */}
          <Field
            label="Feedstock Type"
            required
            note="Select 1 or 2 types"
          >
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: 8,
                marginTop: 4,
              }}
            >
              {FEEDSTOCK_TYPES.map((t) => {
                const slotIdx = form.type === t ? 1 : form.type2 === t ? 2 : 0;
                const isSelected = slotIdx > 0;
                const isFull = twoSelected && !isSelected;

                return (
                  <button
                    key={t}
                    type="button"
                    onClick={() => toggleType(t)}
                    disabled={isFull}
                    style={{
                      padding: "10px 12px",
                      borderRadius: 10,
                      border: `1.5px solid ${isSelected ? C.primary : C.border}`,
                      background: isSelected ? C.primary + "12" : "#fff",
                      color: isFull ? C.muted : C.text,
                      fontSize: 12.5,
                      fontFamily: C.sans,
                      fontWeight: isSelected ? 600 : 400,
                      cursor: isFull ? "not-allowed" : "pointer",
                      opacity: isFull ? 0.45 : 1,
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                      textAlign: "left",
                      width: "100%",
                      lineHeight: 1.3,
                    }}
                  >
                    <span
                      style={{
                        minWidth: 20,
                        height: 20,
                        borderRadius: 5,
                        border: `1.5px solid ${isSelected ? C.primary : C.border}`,
                        background: isSelected ? C.primary : "transparent",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        flexShrink: 0,
                        fontSize: 10,
                        color: "#fff",
                        fontWeight: 700,
                      }}
                    >
                      {isSelected ? slotIdx : ""}
                    </span>
                    {t}
                  </button>
                );
              })}
            </div>
            {twoSelected && (
              <p style={{ fontSize: 11, color: C.muted, marginTop: 6 }}>
                Max 2 types selected. Tap a selected type to deselect it.
              </p>
            )}
          </Field>

          {/* Weight(s) — 2-col when two types selected, full-width otherwise */}
          {form.type && (
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: twoSelected ? "1fr 1fr" : "1fr",
                  gap: 14,
                  alignItems: "end",
                }}
              >
                <Field
                  label={twoSelected ? `Weight 1 — ${form.type}` : "Weight (kg)"}
                  required
                >
                  <TI
                    type="number"
                    value={form.weight}
                    onChange={(e) => set("weight", e.target.value)}
                    placeholder="e.g. 45"
                    step="0.1"
                    min="0"
                    inputMode="decimal"
                  />
                </Field>

                {twoSelected && (
                  <Field label={`Weight 2 — ${form.type2}`} required>
                    <TI
                      type="number"
                      value={form.weight2}
                      onChange={(e) => set("weight2", e.target.value)}
                      placeholder="e.g. 30"
                      step="0.1"
                      min="0"
                      inputMode="decimal"
                    />
                  </Field>
                )}
              </div>

              {/* Water added — always below weights */}
              <Field label="Water Added (litres)" note="Dilution water added">
                <TI
                  type="number"
                  value={form.waterLitres}
                  onChange={(e) => set("waterLitres", e.target.value)}
                  placeholder="e.g. 20"
                  step="1"
                  min="0"
                  inputMode="decimal"
                />
              </Field>
            </div>
          )}

          {/* Photo */}
          <Field
            label="Photo of Feedstock"
            required
            note="Required for audit record"
          >
            <PhotoUploader
              photo={form.photoPreview}
              photoName={form.photo?.name}
              onPhotoChange={(file, preview) => {
                if (file && file.size > MAX_PHOTO_BYTES) {
                  setPhotoError(
                    "Image too large. Please upload a photo under 10MB.",
                  );
                  set("photo", null);
                  set("photoPreview", undefined);
                  return;
                }
                setPhotoError(null);
                set("photo", file);
                set("photoPreview", preview);
              }}
            />
          </Field>

          {photoError && <AlertBox type="warning">{photoError}</AlertBox>}
          {!photoError && (
            <p style={{ fontSize: 11, color: C.muted, textAlign: "center" }}>
              Max image size: 10MB.
            </p>
          )}

          {/* Notes */}
          <Field label="Notes / Observations">
            <TA
              value={form.notes}
              onChange={(e) => set("notes", e.target.value)}
              placeholder="Moisture level, odour, slurry condition..."
            />
          </Field>

          <Btn
            fullWidth
            size="lg"
            onClick={() => setConfirm(true)}
            disabled={!canSubmit}
          >
            Review &amp; Submit →
          </Btn>

          {!canSubmit && (
            <p style={{ fontSize: 11, color: C.muted, textAlign: "center" }}>
              Select a type, fill weight(s), and attach a photo to continue.
            </p>
          )}
        </div>
      </Card>

      {confirm && (
        <ConfirmSheet
          title="Confirm Feedstock Entry"
          rows={[
            { label: "Date", value: fmtDate(form.date) },
            { label: form.type2 ? "Type 1" : "Type", value: form.type },
            { label: form.type2 ? "Weight 1" : "Weight", value: `${form.weight} kg` },
            ...(form.type2
              ? [
                  { label: "Type 2", value: form.type2 },
                  { label: "Weight 2", value: `${form.weight2} kg` },
                ]
              : []),
            { label: "Water Added", value: `${form.waterLitres || 0} L` },
            { label: "Photo", value: "✓ Attached" },
            { label: "Notes", value: form.notes || "—" },
            { label: "Digester", value: user?.digesterId ?? "—" },
          ]}
          onConfirm={handleSubmit}
          onCancel={() => setConfirm(false)}
          offline={!isOnline}
          submitting={submitting}
        />
      )}
    </div>
  );
}
