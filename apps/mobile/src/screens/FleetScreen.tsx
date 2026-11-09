import React, { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Modal,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { formatBatteryHistory } from "@fleet/api-client";
import type {
  TelemetryEvent,
  Vehicle,
  VehicleCreate,
  VehicleHistoryEntry,
} from "@fleet/api-client";
import { client } from "../config/api";
import { colors } from "../constants/theme";
import { Header, VehicleList, VehicleDetails, ErrorBanner } from "../components";

function historyStressColor(vehicle: Vehicle): string {
  switch (vehicle.battery_history?.stress_class) {
    case "HIGH": return colors.riskDangerText;
    case "ELEVATED": return colors.riskCautionText;
    default: return colors.textPrimary;
  }
}

function fmtTs(ts: string | null | undefined) {
  if (!ts) return "—";
  try { return new Date(ts).toLocaleString(); } catch { return ts; }
}

// ─── Vehicle Form Modal ───────────────────────────────────────────────────────

interface VehicleFormDraft {
  id: string; name: string; model: string;
  battery_capacity_kwh: string; baseline_efficiency_wh_km: string;
  current_soc: string; current_soh: string; status: string;
}

const EMPTY_DRAFT: VehicleFormDraft = {
  id: "", name: "", model: "",
  battery_capacity_kwh: "", baseline_efficiency_wh_km: "",
  current_soc: "80", current_soh: "100", status: "ACTIVE",
};

function vehicleToDraft(v: Vehicle): VehicleFormDraft {
  return {
    id: v.id, name: v.name, model: v.model,
    battery_capacity_kwh: String(v.battery_capacity_kwh),
    baseline_efficiency_wh_km: String(v.baseline_efficiency_wh_km),
    current_soc: String(v.current_soc),
    current_soh: String(v.current_soh),
    status: v.status ?? "ACTIVE",
  };
}

interface VehicleFormModalProps {
  visible: boolean;
  mode: "create" | "edit";
  draft: VehicleFormDraft;
  onChangeDraft: (d: VehicleFormDraft) => void;
  onSave: () => void;
  onCancel: () => void;
  saving: boolean;
  saveError: string | null;
}

function FormField({ label, value, onChange, placeholder, keyboardType = "default" }: {
  label: string; value: string; onChange: (v: string) => void; placeholder?: string; keyboardType?: "default" | "decimal-pad" | "numeric";
}) {
  return (
    <View style={fm.field}>
      <Text style={fm.label}>{label}</Text>
      <TextInput style={fm.input} value={value} onChangeText={onChange} placeholder={placeholder ?? label}
        placeholderTextColor={colors.textMuted} keyboardType={keyboardType} />
    </View>
  );
}

function VehicleFormModal({ visible, mode, draft, onChangeDraft, onSave, onCancel, saving, saveError }: VehicleFormModalProps) {
  const set = (k: keyof VehicleFormDraft) => (v: string) => onChangeDraft({ ...draft, [k]: v });
  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onCancel}>
      <View style={fm.container}>
        <View style={fm.header}>
          <Text style={fm.title}>{mode === "create" ? "Register Vehicle" : "Edit Vehicle"}</Text>
          <TouchableOpacity onPress={onCancel}><MaterialCommunityIcons name="close" size={22} color={colors.textPrimary} /></TouchableOpacity>
        </View>
        <ScrollView contentContainerStyle={fm.scroll} keyboardShouldPersistTaps="handled">
          {saveError && (
            <View style={fm.errBox}><Text style={fm.errTxt}>{saveError}</Text></View>
          )}
          {mode === "create" && <FormField label="Vehicle ID" value={draft.id} onChange={set("id")} placeholder="v-example-01" />}
          <FormField label="Name" value={draft.name} onChange={set("name")} placeholder="Transit Van Alpha" />
          <FormField label="Model" value={draft.model} onChange={set("model")} placeholder="Ford E-Transit" />
          <FormField label="Battery capacity (kWh)" value={draft.battery_capacity_kwh} onChange={set("battery_capacity_kwh")} keyboardType="decimal-pad" />
          <FormField label="Efficiency (Wh/km)" value={draft.baseline_efficiency_wh_km} onChange={set("baseline_efficiency_wh_km")} keyboardType="decimal-pad" />
          <FormField label="Current SOC (%)" value={draft.current_soc} onChange={set("current_soc")} keyboardType="decimal-pad" />
          <FormField label="Current SOH (%)" value={draft.current_soh} onChange={set("current_soh")} keyboardType="decimal-pad" />
          <FormField label="Status" value={draft.status} onChange={set("status")} placeholder="ACTIVE / IDLE / MAINTENANCE" />
        </ScrollView>
        <TouchableOpacity style={[fm.saveBtn, saving && { opacity: 0.6 }]} onPress={onSave} disabled={saving}>
          {saving ? <ActivityIndicator color="#000" /> : <Text style={fm.saveBtnTxt}>{mode === "create" ? "Register" : "Save Changes"}</Text>}
        </TouchableOpacity>
      </View>
    </Modal>
  );
}

const fm = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bgBase },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", padding: 16, borderBottomWidth: 1, borderBottomColor: colors.border },
  title: { fontSize: 18, fontWeight: "700", color: colors.textPrimary },
  scroll: { padding: 16, paddingBottom: 32 },
  field: { marginBottom: 14 },
  label: { fontSize: 12, fontWeight: "600", color: colors.textSecondary, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 4 },
  input: { backgroundColor: colors.bgSurface, borderWidth: 1, borderColor: colors.border, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, color: colors.textPrimary, fontSize: 15 },
  saveBtn: { margin: 16, backgroundColor: colors.accentPrimary, borderRadius: 10, paddingVertical: 14, alignItems: "center" },
  saveBtnTxt: { color: "#000", fontSize: 15, fontWeight: "900" },
  errBox: { backgroundColor: colors.errorBg, borderRadius: 8, padding: 12, marginBottom: 12, borderWidth: 1, borderColor: colors.riskDanger },
  errTxt: { color: colors.errorText, fontSize: 13 },
});

// ─── Props ────────────────────────────────────────────────────────────────────

interface FleetScreenProps {
  vehicles: Vehicle[];
  selectedVehicle: Vehicle | null;
  loading: boolean;
  error: string | null;
  onSelectVehicle: (vehicle: Vehicle) => void;
  onRefresh: () => void;
  onSimulateWithVehicle: (vehicle: Vehicle) => void;
  refreshing?: boolean;
}

// ─── FleetScreen ──────────────────────────────────────────────────────────────

export const FleetScreen: React.FC<FleetScreenProps> = ({
  vehicles, selectedVehicle, loading, error,
  onSelectVehicle, onRefresh, onSimulateWithVehicle, refreshing = false,
}) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState<"ALL" | "ACTIVE" | "IDLE">("ALL");

  // Create / Edit modal state
  const [formVisible, setFormVisible] = useState(false);
  const [formMode, setFormMode] = useState<"create" | "edit">("create");
  const [formDraft, setFormDraft] = useState<VehicleFormDraft>(EMPTY_DRAFT);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  // Vehicle history state
  const [vehicleHistory, setVehicleHistory] = useState<VehicleHistoryEntry[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyVehicleId, setHistoryVehicleId] = useState<string | null>(null);

  // Telemetry history state
  const [telemetryHistory, setTelemetryHistory] = useState<TelemetryEvent[]>([]);
  const [telemetryLoading, setTelemetryLoading] = useState(false);
  const [telemetryVehicleId, setTelemetryVehicleId] = useState<string | null>(null);

  const filteredVehicles = vehicles.filter((v) => {
    const q = searchQuery.toLowerCase();
    const matchesSearch = v.name.toLowerCase().includes(q) || v.model.toLowerCase().includes(q);
    const matchesStatus = filterStatus === "ALL" || (v.status || "ACTIVE") === filterStatus;
    return matchesSearch && matchesStatus;
  });

  // ── Create vehicle ─────────────────────────────────────────────────────────

  const openCreate = () => {
    setFormDraft(EMPTY_DRAFT);
    setFormMode("create");
    setSaveError(null);
    setFormVisible(true);
  };

  // ── Edit vehicle ───────────────────────────────────────────────────────────

  const openEdit = (vehicle: Vehicle) => {
    setFormDraft(vehicleToDraft(vehicle));
    setFormMode("edit");
    setSaveError(null);
    setFormVisible(true);
  };

  // ── Save (create or update) ────────────────────────────────────────────────

  const handleSave = async () => {
    setSaving(true); setSaveError(null);
    try {
      const capKwh = parseFloat(formDraft.battery_capacity_kwh);
      const effWhKm = parseFloat(formDraft.baseline_efficiency_wh_km);
      const soc = parseFloat(formDraft.current_soc);
      const soh = parseFloat(formDraft.current_soh);
      if (!formDraft.name.trim() || !formDraft.model.trim() || isNaN(capKwh) || isNaN(effWhKm) || isNaN(soc) || isNaN(soh)) {
        setSaveError("Please fill all required fields with valid numbers.");
        return;
      }
      if (formMode === "create") {
        if (!formDraft.id.trim()) { setSaveError("Vehicle ID is required."); return; }
        const payload: VehicleCreate = { id: formDraft.id.trim(), name: formDraft.name.trim(), model: formDraft.model.trim(), battery_capacity_kwh: capKwh, baseline_efficiency_wh_km: effWhKm, current_soc: soc, current_soh: soh, status: formDraft.status || "ACTIVE" };
        await client.createVehicle(payload);
      } else {
        await client.updateVehicle(formDraft.id, { name: formDraft.name.trim(), model: formDraft.model.trim(), battery_capacity_kwh: capKwh, baseline_efficiency_wh_km: effWhKm, current_soc: soc, current_soh: soh, status: formDraft.status || "ACTIVE" });
      }
      setFormVisible(false);
      onRefresh();
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : "Save failed");
    } finally {
      setSaving(false);
    }
  };

  // ── Delete vehicle ─────────────────────────────────────────────────────────

  const handleDelete = (vehicle: Vehicle) => {
    Alert.alert(
      "Delete vehicle?",
      `This will permanently remove "${vehicle.name}" from the fleet. This cannot be undone.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete", style: "destructive",
          onPress: async () => {
            try {
              await client.deleteVehicle(vehicle.id);
              onRefresh();
            } catch (e) {
              Alert.alert("Delete failed", e instanceof Error ? e.message : "Unknown error");
            }
          },
        },
      ],
    );
  };

  // ── Vehicle history ────────────────────────────────────────────────────────

  const loadVehicleHistory = useCallback(async (vehicleId: string) => {
    if (historyVehicleId === vehicleId) {
      setHistoryVehicleId(null); setVehicleHistory([]); return;
    }
    setHistoryLoading(true); setHistoryVehicleId(vehicleId);
    try { setVehicleHistory(await client.getVehicleHistory(vehicleId)); }
    catch { setVehicleHistory([]); }
    finally { setHistoryLoading(false); }
  }, [historyVehicleId]);

  // ── Telemetry history ──────────────────────────────────────────────────────

  const loadTelemetryHistory = useCallback(async (vehicleId: string) => {
    if (telemetryVehicleId === vehicleId) {
      setTelemetryVehicleId(null); setTelemetryHistory([]); return;
    }
    setTelemetryLoading(true); setTelemetryVehicleId(vehicleId);
    try { setTelemetryHistory(await client.getTelemetryHistory(vehicleId)); }
    catch { setTelemetryHistory([]); }
    finally { setTelemetryLoading(false); }
  }, [telemetryVehicleId]);

  return (
    <>
      <VehicleFormModal
        visible={formVisible} mode={formMode} draft={formDraft}
        onChangeDraft={setFormDraft} onSave={handleSave} onCancel={() => setFormVisible(false)}
        saving={saving} saveError={saveError}
      />

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.accentPrimary} colors={[colors.accentPrimary]} progressBackgroundColor={colors.bgSurface} />}>
        <Header title="Fleet Management" subtitle="Registered Vehicles · See Battery Source and Reading Age" />

        {error && <ErrorBanner message={error} onRetry={onRefresh} />}

        {/* Search Bar + Add Vehicle Button */}
        <View style={styles.searchRow}>
          <View style={[styles.searchBar, { flex: 1 }]}>
            <MaterialCommunityIcons name="magnify" size={20} color={colors.textMuted} style={styles.searchIcon} />
            <TextInput style={styles.searchInput} placeholder="Search fleet by name or model..." placeholderTextColor={colors.textMuted} value={searchQuery} onChangeText={setSearchQuery} />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery("")}>
                <MaterialCommunityIcons name="close-circle" size={18} color={colors.textMuted} />
              </TouchableOpacity>
            )}
          </View>
          <TouchableOpacity style={styles.addBtn} onPress={openCreate}>
            <MaterialCommunityIcons name="plus" size={22} color="#000" />
          </TouchableOpacity>
        </View>

        {/* Filter Chips */}
        <View style={styles.filterRow}>
          {(["ALL", "ACTIVE", "IDLE"] as const).map((status) => (
            <TouchableOpacity key={status} style={[styles.filterChip, filterStatus === status && styles.filterChipActive]} onPress={() => setFilterStatus(status)}>
              <Text style={[styles.filterChipText, filterStatus === status && styles.filterChipTextActive]}>{status === "ALL" ? "All Fleet" : status}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Vehicle List */}
        <VehicleList vehicles={filteredVehicles} selectedVehicle={selectedVehicle} loading={loading} onSelectVehicle={onSelectVehicle} />

        {/* Selected Vehicle */}
        {selectedVehicle ? (
          <View style={styles.selectedWrapper}>
            <VehicleDetails vehicle={selectedVehicle} loading={loading} onRunSimulation={onSimulateWithVehicle} />

            {/* Edit & Delete Actions */}
            <View style={styles.actionRow}>
              <TouchableOpacity style={styles.editBtn} onPress={() => openEdit(selectedVehicle)}>
                <MaterialCommunityIcons name="pencil" size={16} color={colors.accentPrimary} />
                <Text style={styles.editBtnTxt}>Edit Vehicle</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.deleteBtn} onPress={() => handleDelete(selectedVehicle)}>
                <MaterialCommunityIcons name="trash-can-outline" size={16} color={colors.riskDangerText} />
                <Text style={styles.deleteBtnTxt}>Delete</Text>
              </TouchableOpacity>
            </View>

            {/* Additional Specs Card */}
            <View style={styles.specCard}>
              <Text style={styles.specTitle}>Powertrain & Battery Health</Text>
              {[
                { label: "Current State of Charge", value: `${selectedVehicle.current_soc}%`, accent: true },
                { label: "Battery Capacity", value: `${selectedVehicle.battery_capacity_kwh} kWh` },
                { label: "Baseline Efficiency", value: `${selectedVehicle.baseline_efficiency_wh_km} Wh/km` },
                { label: "Nominal Full Range (est.)", value: `${Math.round((selectedVehicle.battery_capacity_kwh * 1000) / (selectedVehicle.baseline_efficiency_wh_km || 250))} km` },
                { label: "Operational Status", value: selectedVehicle.status || "ACTIVE" },
                { label: "Reported Operating History", value: selectedVehicle.cycle_count == null ? "Not reported" : `${selectedVehicle.cycle_count} cycles` },
                { label: "Average Depth of Discharge", value: selectedVehicle.avg_dod_pct == null ? "Not reported" : `${selectedVehicle.avg_dod_pct}%` },
                { label: "Fast-Charge Share", value: selectedVehicle.fast_charge_share_pct == null ? "Not reported" : `${selectedVehicle.fast_charge_share_pct}%` },
                { label: "Thermal Stress Index", value: selectedVehicle.thermal_stress_index == null ? "Not reported" : `${selectedVehicle.thermal_stress_index}/100` },
                { label: "History Stress", value: formatBatteryHistory(selectedVehicle.battery_history), stressColor: historyStressColor(selectedVehicle) },
              ].map((row) => (
                <View key={row.label} style={styles.specRow}>
                  <Text style={styles.specLabel}>{row.label}</Text>
                  <Text style={[styles.specVal, row.accent ? { color: colors.accentPrimary } : {}, row.stressColor ? { color: row.stressColor } : {}]}>{row.value}</Text>
                </View>
              ))}
            </View>

            {/* Vehicle History Panel */}
            <View style={styles.specCard}>
              <View style={styles.panelHeader}>
                <Text style={styles.specTitle}>Vehicle State History</Text>
                <TouchableOpacity onPress={() => loadVehicleHistory(selectedVehicle.id)} disabled={historyLoading && historyVehicleId === selectedVehicle.id}>
                  <MaterialCommunityIcons name={historyVehicleId === selectedVehicle.id ? "chevron-up" : "chevron-down"} size={20} color={colors.accentPrimary} />
                </TouchableOpacity>
              </View>

              {historyVehicleId === selectedVehicle.id && (
                <>
                  {historyLoading && <ActivityIndicator color={colors.accentPrimary} style={{ marginVertical: 12 }} />}
                  {!historyLoading && vehicleHistory.length === 0 && <Text style={styles.emptyPanelTxt}>No history records found.</Text>}
                  {!historyLoading && vehicleHistory.map((entry, i) => (
                    <View key={i} style={styles.historyEntryRow}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.historyEntryTs}>{fmtTs(entry.timestamp)}</Text>
                        <Text style={styles.historyEntrySub}>{entry.status}</Text>
                      </View>
                      <View style={{ alignItems: "flex-end" }}>
                        <Text style={[styles.historyEntryVal, { color: colors.accentPrimary }]}>SOC {entry.current_soc}%</Text>
                        <Text style={styles.historyEntrySub}>SOH {entry.current_soh}%</Text>
                      </View>
                    </View>
                  ))}
                </>
              )}
            </View>

            {/* Telemetry History Panel */}
            <View style={styles.specCard}>
              <View style={styles.panelHeader}>
                <Text style={styles.specTitle}>Telemetry History</Text>
                <TouchableOpacity onPress={() => loadTelemetryHistory(selectedVehicle.id)} disabled={telemetryLoading && telemetryVehicleId === selectedVehicle.id}>
                  <MaterialCommunityIcons name={telemetryVehicleId === selectedVehicle.id ? "chevron-up" : "chevron-down"} size={20} color={colors.accentPrimary} />
                </TouchableOpacity>
              </View>

              {telemetryVehicleId === selectedVehicle.id && (
                <>
                  {telemetryLoading && <ActivityIndicator color={colors.accentPrimary} style={{ marginVertical: 12 }} />}
                  {!telemetryLoading && telemetryHistory.length === 0 && <Text style={styles.emptyPanelTxt}>No telemetry events found.</Text>}
                  {!telemetryLoading && telemetryHistory.map((ev, i) => (
                    <View key={i} style={styles.historyEntryRow}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.historyEntryTs}>{fmtTs(ev.timestamp ?? null)}</Text>
                        <Text style={styles.historyEntrySub}>{ev.speed_kph} kph · {ev.ambient_temp_c}°C · pack {ev.pack_temp_c}°C</Text>
                      </View>
                      <View style={{ alignItems: "flex-end" }}>
                        <Text style={[styles.historyEntryVal, { color: colors.accentPrimary }]}>SOC {ev.soc}%</Text>
                        <Text style={styles.historyEntrySub}>SOH {ev.soh}%</Text>
                      </View>
                    </View>
                  ))}
                </>
              )}
            </View>
          </View>
        ) : (
          <View style={styles.emptyCard}>
            <MaterialCommunityIcons name="car-off" size={40} color={colors.textMuted} />
            <Text style={styles.emptyText}>No vehicles match the selected filter</Text>
          </View>
        )}
      </ScrollView>
    </>
  );
};

const styles = StyleSheet.create({
  scrollContent: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 32 },
  searchRow: { flexDirection: "row", gap: 8, marginBottom: 12, alignItems: "center" },
  searchBar: { flexDirection: "row", alignItems: "center", backgroundColor: colors.bgSurface, borderRadius: 10, borderWidth: 1, borderColor: colors.border, paddingHorizontal: 12, height: 44 },
  searchIcon: { marginRight: 8 },
  searchInput: { flex: 1, color: colors.textPrimary, fontSize: 14 },
  addBtn: { width: 44, height: 44, backgroundColor: colors.accentPrimary, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  filterRow: { flexDirection: "row", gap: 8, marginBottom: 16 },
  filterChip: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20, backgroundColor: colors.bgSurface, borderWidth: 1, borderColor: colors.border },
  filterChipActive: { backgroundColor: colors.badgeBg, borderColor: colors.accentPrimary },
  filterChipText: { fontSize: 12, color: colors.textSecondary, fontWeight: "500" },
  filterChipTextActive: { color: colors.accentPrimary, fontWeight: "700" },
  selectedWrapper: { marginTop: 8 },
  actionRow: { flexDirection: "row", gap: 10, marginVertical: 8 },
  editBtn: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, backgroundColor: colors.bgSurface, borderWidth: 1, borderColor: colors.accentPrimary, borderRadius: 8, paddingVertical: 10 },
  editBtnTxt: { color: colors.accentPrimary, fontSize: 13, fontWeight: "700" },
  deleteBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, backgroundColor: colors.errorBg, borderWidth: 1, borderColor: colors.riskDanger, borderRadius: 8, paddingVertical: 10, paddingHorizontal: 16 },
  deleteBtnTxt: { color: colors.riskDangerText, fontSize: 13, fontWeight: "700" },
  specCard: { backgroundColor: colors.bgSurface, borderRadius: 12, padding: 16, borderWidth: 1, borderColor: colors.border, marginTop: 4, marginBottom: 8 },
  specTitle: { fontSize: 15, fontWeight: "700", color: colors.textPrimary, marginBottom: 12 },
  specRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: colors.border },
  specLabel: { fontSize: 13, color: colors.textSecondary },
  specVal: { fontSize: 13, fontWeight: "600", color: colors.textPrimary },
  panelHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 4 },
  emptyPanelTxt: { color: colors.textMuted, fontSize: 13, textAlign: "center", paddingVertical: 12 },
  historyEntryRow: { flexDirection: "row", alignItems: "center", paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: colors.border },
  historyEntryTs: { fontSize: 12, color: colors.textPrimary, fontWeight: "600" },
  historyEntrySub: { fontSize: 11, color: colors.textMuted, marginTop: 2 },
  historyEntryVal: { fontSize: 13, fontWeight: "700" },
  emptyCard: { backgroundColor: colors.bgSurface, borderRadius: 12, padding: 32, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: colors.border, marginTop: 20 },
  emptyText: { color: colors.textMuted, fontSize: 14, marginTop: 10 },
});
