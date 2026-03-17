"use client";

import { useEffect, useState } from "react";
import { Plus, Users, Pencil, Trash2 } from "lucide-react";
import { householdsApi } from "@/lib/api/admin.api";
import { useHouseholds, useDigesters, useOperators } from "@/lib/hooks/useSWR";
import { shortId } from "@/lib/utils/shortId";
import {
  Card,
  Heading,
  Tag,
  Btn,
  Field,
  TI,
  SI,
  FuelMultiSelect,
  THead,
  Paginator,
  AlertBox,
} from "@/components/ui";
import { C } from "@/lib/utils/tokens";
import HouseholdsLoading from "./loading";

const PAGE_SIZE = 10;

interface Household {
  id: string;
  headName: string;
  phone: string;
  address: string | null;
  members: number;
  fuelReplaced: string[];
  joinedAt: string;
  digesterId: string;
}

function fmtDate(d: string) {
  return new Date(d.slice(0, 10) + "T00:00:00").toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export default function HouseholdsPage() {
  const {
    data: households = [],
    isLoading: hhLoading,
    mutate: mutateHH,
  } = useHouseholds();
  const { data: digesters = [], isLoading: digLoading } = useDigesters();
  const { data: operators = [], isLoading: opLoading } = useOperators();
  const loading = hhLoading || digLoading || opLoading;
  const [sel, setSel] = useState("");
  const [showAdd, setShowAdd] = useState(false);
  const [editHH, setEditHH] = useState<Household | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [form, setForm] = useState({
    headName: "",
    phone: "",
    address: "",
    members: "",
    fuelReplaced: [] as string[],
  });
  const [formError, setFormError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState("");
  const [page, setPage] = useState(1);

  useEffect(() => {
    if (digesters.length > 0 && !sel) setSel(digesters[0].id);
  }, [digesters, sel]);

  const filtered = (households as Household[]).filter(
    (h) => h.digesterId === sel,
  );
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const paginated = filtered.slice(
    (safePage - 1) * PAGE_SIZE,
    safePage * PAGE_SIZE,
  );

  const digOp = operators.find((op) => op.digesterId === sel);

  const resetForm = () => {
    setForm({
      headName: "",
      phone: "",
      address: "",
      members: "",
      fuelReplaced: [],
    });
    setFormError("");
  };

  const handleAdd = async () => {
    if (!form.headName || !form.phone) {
      setFormError("Head name and phone are required");
      return;
    }
    setSubmitting(true);
    setFormError("");
    try {
      await householdsApi.create({
        headName: form.headName,
        phone: form.phone,
        address: form.address || undefined,
        members: parseInt(form.members) || 0,
        fuelReplaced: form.fuelReplaced,
        digesterId: sel,
      });
      mutateHH();
      resetForm();
      setShowAdd(false);
      setToast("Household added successfully");
      setTimeout(() => setToast(""), 4000);
    } catch (err: any) {
      setFormError(err?.response?.data?.message ?? "Failed to add household");
    } finally {
      setSubmitting(false);
    }
  };

  const startEdit = (hh: Household) => {
    setEditHH(hh);
    setForm({
      headName: hh.headName,
      phone: hh.phone,
      address: hh.address ?? "",
      members: String(hh.members),
      fuelReplaced: hh.fuelReplaced,
    });
    setShowAdd(false);
    setFormError("");
  };

  const handleUpdate = async () => {
    if (!editHH) return;
    if (!form.headName || !form.phone) {
      setFormError("Head name and phone are required");
      return;
    }
    setSubmitting(true);
    setFormError("");
    try {
      await householdsApi.update(editHH.id, {
        headName: form.headName,
        phone: form.phone,
        address: form.address || null,
        members: parseInt(form.members) || 0,
        fuelReplaced: form.fuelReplaced,
      });
      mutateHH();
      setEditHH(null);
      resetForm();
      setToast("Household updated successfully");
      setTimeout(() => setToast(""), 4000);
    } catch (err: any) {
      setFormError(
        err?.response?.data?.message ?? "Failed to update household",
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    setSubmitting(true);
    try {
      await householdsApi.delete(id);
      mutateHH();
      setDeleteConfirm(null);
      setToast("Household removed successfully");
      setTimeout(() => setToast(""), 4000);
    } catch (err: any) {
      setToast(err?.response?.data?.message ?? "Failed to delete household");
      setTimeout(() => setToast(""), 4000);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <HouseholdsLoading />;

  return (
    <div
      style={{ display: "flex", flexDirection: "column", gap: 20 }}
      className="fade-in"
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <Heading size="xl">Households</Heading>
        <Btn
          icon={Plus}
          onClick={() => {
            setShowAdd(true);
            setEditHH(null);
            resetForm();
          }}
          disabled={!sel}
        >
          Add HH
        </Btn>
      </div>

      {toast && (
        <AlertBox
          type={
            toast.includes("Failed") || toast.includes("failed")
              ? "error"
              : "success"
          }
        >
          {toast}
        </AlertBox>
      )}

      {/* Digester selector */}
      <div
        style={{
          display: "flex",
          gap: 16,
          alignItems: "flex-end",
          flexWrap: "wrap",
        }}
      >
        <div style={{ minWidth: 280 }}>
          <Field label="Select Digester">
            <SI
              value={sel}
              onChange={(e) => {
                setSel(e.target.value);
                setPage(1);
              }}
              options={digesters.map((d) => ({
                value: d.id,
                label: `${d.id} – ${d.location}`,
              }))}
            />
          </Field>
        </div>
        {digOp && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              background: C.card,
              border: `1.5px solid ${C.border}`,
              borderRadius: 10,
              padding: "8px 14px",
            }}
          >
            <div
              style={{
                width: 32,
                height: 32,
                borderRadius: 8,
                background: C.success + "18",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
              }}
            >
              <Users size={15} color={C.success} />
            </div>
            <div>
              <div
                style={{
                  fontSize: 9,
                  color: C.muted,
                  textTransform: "uppercase",
                  letterSpacing: 1,
                  fontWeight: 600,
                }}
              >
                Operator
              </div>
              <div style={{ fontSize: 13, fontWeight: 600, color: C.text }}>
                {digOp.name}
              </div>
            </div>
            <Tag color="green">{digOp.id}</Tag>
          </div>
        )}
      </div>

      {/* Add / Edit form */}
      {(showAdd || editHH) && (
        <Card
          style={{ border: `2px solid ${editHH ? C.accent : C.primary}` }}
          className="fade-in"
        >
          <Heading size="md" style={{ marginBottom: 16 }}>
            {editHH
              ? `Edit Household — ${shortId(editHH.id)}`
              : `Add Household to ${sel}`}
          </Heading>
          <div
            style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}
          >
            <Field label="Head of Household" required>
              <TI
                value={form.headName}
                onChange={(e) =>
                  setForm((f) => ({ ...f, headName: e.target.value }))
                }
                placeholder="Full name"
              />
            </Field>
            <Field label="Phone" required>
              <TI
                value={form.phone}
                onChange={(e) =>
                  setForm((f) => ({ ...f, phone: e.target.value }))
                }
                type="tel"
                placeholder="10-digit"
              />
            </Field>
            <Field label="Address">
              <TI
                value={form.address}
                onChange={(e) =>
                  setForm((f) => ({ ...f, address: e.target.value }))
                }
                placeholder="House / Plot / Lane"
              />
            </Field>
            <Field label="Members">
              <TI
                value={form.members}
                onChange={(e) =>
                  setForm((f) => ({ ...f, members: e.target.value }))
                }
                type="number"
                placeholder="e.g. 4"
              />
            </Field>
            <div style={{ gridColumn: "1 / -1" }}>
              <Field label="Fuels Being Replaced" note="Select all that apply">
                <FuelMultiSelect
                  value={form.fuelReplaced}
                  onChange={(v) => setForm((f) => ({ ...f, fuelReplaced: v }))}
                />
              </Field>
            </div>
          </div>
          {formError && (
            <div style={{ marginTop: 10, color: C.danger, fontSize: 13 }}>
              {formError}
            </div>
          )}
          <div style={{ display: "flex", gap: 10, marginTop: 16 }}>
            {editHH ? (
              <Btn
                variant="accent"
                onClick={handleUpdate}
                disabled={submitting}
              >
                {submitting ? "Saving…" : "Save Changes"}
              </Btn>
            ) : (
              <Btn onClick={handleAdd} disabled={submitting}>
                {submitting ? "Adding…" : "Add"}
              </Btn>
            )}
            <Btn
              variant="secondary"
              onClick={() => {
                setShowAdd(false);
                setEditHH(null);
                resetForm();
              }}
            >
              Cancel
            </Btn>
          </div>
        </Card>
      )}

      {/* Delete confirmation */}
      {deleteConfirm && (
        <Card
          style={{ border: `2px solid ${C.danger}`, background: "#FFF8F8" }}
          className="fade-in"
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <div>
              <div
                style={{
                  fontWeight: 600,
                  fontSize: 14,
                  color: C.danger,
                  marginBottom: 4,
                }}
              >
                Remove household {deleteConfirm}?
              </div>
              <div style={{ fontSize: 12, color: C.muted }}>
                This will also delete all gas distribution records for this
                household. This action cannot be undone.
              </div>
            </div>
            <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
              <Btn
                variant="danger"
                size="sm"
                onClick={() => handleDelete(deleteConfirm)}
                disabled={submitting}
              >
                {submitting ? "Removing…" : "Yes, Remove"}
              </Btn>
              <Btn
                variant="secondary"
                size="sm"
                onClick={() => setDeleteConfirm(null)}
              >
                Cancel
              </Btn>
            </div>
          </div>
        </Card>
      )}

      <Card style={{ padding: 0, overflow: "auto" }}>
        <table
          style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}
        >
          <THead
            cols={[
              "HH ID",
              "Head Name",
              "Phone",
              "Members",
              "Fuel Replaced",
              "Joined",
              "Actions",
            ]}
          />
          <tbody>
            {paginated.map((hh, i) => (
              <tr
                key={hh.id}
                style={{
                  borderBottom:
                    i < paginated.length - 1 ? `1px solid ${C.border}` : "none",
                }}
              >
                <td
                  style={{
                    padding: "11px 14px",
                  }}
                >
                  <Tag color="purple">{shortId(hh.id)}</Tag>
                </td>
                <td style={{ padding: "11px 14px" }}>{hh.headName}</td>
                <td style={{ padding: "11px 14px", fontFamily: C.mono }}>
                  {hh.phone}
                </td>
                <td style={{ padding: "11px 14px", textAlign: "center" }}>
                  {hh.members}
                </td>
                <td style={{ padding: "11px 14px" }}>
                  <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                    {hh.fuelReplaced.map((f: string) => (
                      <Tag key={f} color="amber">
                        {f}
                      </Tag>
                    ))}
                  </div>
                </td>
                <td style={{ padding: "11px 14px", color: C.muted }}>
                  {fmtDate(hh.joinedAt)}
                </td>
                <td style={{ padding: "11px 14px" }}>
                  <div style={{ display: "flex", gap: 8 }}>
                    <Btn
                      size="sm"
                      variant="secondary"
                      icon={Pencil}
                      onClick={() => startEdit(hh)}
                    >
                      Edit
                    </Btn>
                    <Btn
                      size="sm"
                      variant="danger"
                      icon={Trash2}
                      onClick={() => {
                        setDeleteConfirm(hh.id);
                        setEditHH(null);
                        setShowAdd(false);
                      }}
                    >
                      Remove
                    </Btn>
                  </div>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td
                  colSpan={7}
                  style={{ padding: 40, textAlign: "center", color: C.muted }}
                >
                  No households for this digester.
                </td>
              </tr>
            )}
          </tbody>
        </table>
        <Paginator
          page={safePage}
          totalPages={totalPages}
          setPage={setPage}
          total={filtered.length}
        />
      </Card>
    </div>
  );
}
