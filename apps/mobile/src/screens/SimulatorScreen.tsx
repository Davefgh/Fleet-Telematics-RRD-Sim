import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Keyboard,
  Platform,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import {
  formatBatteryState,
  isAssessmentOutdated,
  parseSimulationInputs,
  simulationNumericFields,
} from "@fleet/api-client";
import type {
  BatchSimulationResult,
  DrivingStyle,
  HvacMode,
  RegenLevel,
  RiskLevel,
  RoadType,
  SimulationAssessment,
  SimulationNumericDraft,
  SimulationRecord,
  SimulationRequest,
  SimulationResponse,
  Vehicle,
} from "@fleet/api-client";
import { colors } from "../constants/theme";
import { Header, SimulationResult, ErrorBanner } from "../components";

// ─── Types ────────────────────────────────────────────────────────────────────

interface SimulatorScreenProps {
  vehicles: Vehicle[];
  selectedVehicle: Vehicle | null;
  onSelectVehicle: (vehicle: Vehicle) => void;
  onRunSimulation: (params: Required<SimulationRequest>) => Promise<SimulationResponse | null>;
  onRunBatchSimulation: (params: Omit<Required<SimulationRequest>, "vehicle_id">, vehicleIds: string[]) => Promise<BatchSimulationResult[]>;
  onLoadSimHistory: () => Promise<SimulationRecord[]>;
  assessment: SimulationAssessment | null;
  loading: boolean;
  error: string | null;
  refreshing?: boolean;
  onRefresh?: () => void;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const OPTION_LABELS: Record<string, string> = {
  ECO: "Eco", NORMAL: "Normal", AGGRESSIVE: "Sporty",
  OFF: "Off", LOW: "Low", MEDIUM: "Medium", HIGH: "High",
  URBAN: "City", HIGHWAY: "Highway", MIXED: "Mixed",
};

const label = (key: string) => OPTION_LABELS[key] ?? key;

const FIELD_COPY: Record<string, { label: string; hint: string }> = {
  route_distance_km: { label: "Trip distance (km)", hint: "How far you are driving" },
  elevation_gain_m:  { label: "Total uphill (m)",    hint: "Climbing uses more battery" },
  elevation_loss_m:  { label: "Total downhill (m)",  hint: "Some energy is recovered" },
  ambient_temp_c:    { label: "Outside temp (°C)",   hint: "Cold weather reduces range" },
  payload_kg:        { label: "Cargo & passengers (kg)", hint: "Extra weight on board" },
  reserve_soc_target_pct: { label: "Keep on arrival (%)", hint: "Safety margin 0–50" },
};

interface Preset {
  label: string; distanceKm: number; gainM: number; lossM: number; roadType: RoadType;
}

const PRESETS: Preset[] = [
  { label: "City sprint",    distanceKm: 25,  gainM: 40,  lossM: 40,  roadType: "URBAN" },
  { label: "Metro commute",  distanceKm: 60,  gainM: 120, lossM: 110, roadType: "MIXED" },
  { label: "Highway haul",   distanceKm: 180, gainM: 200, lossM: 190, roadType: "HIGHWAY" },
  { label: "Mountain run",   distanceKm: 90,  gainM: 800, lossM: 800, roadType: "MIXED" },
];

function riskColor(level: RiskLevel) {
  if (level === "SAFE") return colors.accentPrimary;
  if (level === "CAUTION") return colors.riskCautionText;
  return colors.riskDangerText;
}

function fmtTs(ts: string) {
  try { return new Date(ts).toLocaleString(); } catch { return ts; }
}

// ─── StepHeader ───────────────────────────────────────────────────────────────

function StepHeader({ num, title }: { num: number; title: string }) {
  return (
    <View style={step.wrap}>
      <View style={step.num}><Text style={step.numTxt}>{num}</Text></View>
      <Text style={step.title}>{title}</Text>
    </View>
  );
}
const step = StyleSheet.create({
  wrap: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 14 },
  num: { width: 24, height: 24, borderRadius: 12, backgroundColor: colors.accentPrimary, alignItems: "center", justifyContent: "center" },
  numTxt: { color: "#000", fontSize: 12, fontWeight: "900" },
  title: { color: colors.textPrimary, fontSize: 16, fontWeight: "700" },
});

// ─── ChoiceGroup ──────────────────────────────────────────────────────────────

function ChoiceGroup<T extends string>({ legend, hint, options, value, onChange }: {
  legend: string; hint: string; options: readonly T[]; value: T; onChange: (v: T) => void;
}) {
  return (
    <View style={cg.wrap} accessibilityRole="radiogroup" accessibilityLabel={legend}>
      <Text style={cg.legend}>{legend}</Text>
      <View style={cg.row}>
        {options.map((opt) => (
          <TouchableOpacity key={opt} accessibilityRole="radio" accessibilityState={{ checked: value === opt }}
            style={[cg.btn, value === opt && cg.btnActive]} onPress={() => onChange(opt)}>
            <Text style={[cg.btnTxt, value === opt && cg.btnTxtActive]}>{label(opt)}</Text>
          </TouchableOpacity>
        ))}
      </View>
      <Text style={cg.hint}>{hint}</Text>
    </View>
  );
}
const cg = StyleSheet.create({
  wrap: { marginBottom: 14 },
  legend: { color: colors.textSecondary, fontSize: 12, fontWeight: "600", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 8 },
  row: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  btn: { paddingVertical: 7, paddingHorizontal: 14, borderRadius: 8, backgroundColor: colors.bgSurfaceAlt, borderWidth: 1, borderColor: colors.border },
  btnActive: { backgroundColor: colors.badgeBg, borderColor: colors.accentPrimary },
  btnTxt: { fontSize: 13, color: colors.textSecondary, fontWeight: "500" },
  btnTxtActive: { color: colors.accentPrimary, fontWeight: "700" },
  hint: { color: colors.textMuted, fontSize: 11, marginTop: 4 },
});

// ─── HistoryRow ───────────────────────────────────────────────────────────────

function HistoryRow({ record, expanded, onToggle }: { record: SimulationRecord; expanded: boolean; onToggle: () => void }) {
  const risk = record.response.risk_level;
  return (
    <TouchableOpacity style={hr.row} onPress={onToggle} activeOpacity={0.8}>
      <View style={hr.top}>
        <View style={{ flex: 1 }}>
          <Text style={hr.vehicleId}>{record.request.vehicle_id}</Text>
          <Text style={hr.timestamp}>{fmtTs(record.timestamp)}</Text>
          <Text style={hr.dist}>{record.request.route_distance_km} km</Text>
        </View>
        <View style={[hr.badge, { borderColor: riskColor(risk) }]}>
          <Text style={[hr.badgeTxt, { color: riskColor(risk) }]}>{risk}</Text>
        </View>
        <MaterialCommunityIcons name={expanded ? "chevron-up" : "chevron-down"} size={18} color={colors.textMuted} style={{ marginLeft: 6 }} />
      </View>
      {expanded && (
        <View style={hr.detail}>
          <View style={hr.detailRow}><Text style={hr.detailLabel}>Arrival SOC</Text><Text style={[hr.detailVal, { color: riskColor(risk) }]}>{record.response.projected_arrival_soc_pct.toFixed(1)}%</Text></View>
          <View style={hr.detailRow}><Text style={hr.detailLabel}>Energy used</Text><Text style={hr.detailVal}>{record.response.estimated_energy_consumption_kwh.toFixed(1)} kWh</Text></View>
          <View style={hr.detailRow}><Text style={hr.detailLabel}>Remaining range</Text><Text style={hr.detailVal}>{record.response.remaining_range_km.toFixed(0)} km</Text></View>
          <View style={hr.detailRow}><Text style={hr.detailLabel}>Confidence</Text><Text style={hr.detailVal}>{record.response.confidence_score_pct}%</Text></View>
          {record.response.recommendations.map((rec, i) => <Text key={i} style={hr.rec}>· {rec}</Text>)}
        </View>
      )}
    </TouchableOpacity>
  );
}
const hr = StyleSheet.create({
  row: { backgroundColor: colors.bgSurface, borderRadius: 10, padding: 12, borderWidth: 1, borderColor: colors.border, marginBottom: 10 },
  top: { flexDirection: "row", alignItems: "center" },
  vehicleId: { fontSize: 13, fontWeight: "700", color: colors.textPrimary },
  timestamp: { fontSize: 11, color: colors.textMuted, marginTop: 2 },
  dist: { fontSize: 11, color: colors.textSecondary, marginTop: 1 },
  badge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, borderWidth: 1, backgroundColor: "transparent" },
  badgeTxt: { fontSize: 10, fontWeight: "700" },
  detail: { marginTop: 10, paddingTop: 10, borderTopWidth: 1, borderTopColor: colors.border },
  detailRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 4 },
  detailLabel: { fontSize: 12, color: colors.textSecondary },
  detailVal: { fontSize: 12, fontWeight: "600", color: colors.textPrimary },
  rec: { fontSize: 11, color: colors.textMuted, marginTop: 4 },
});

// ─── CompareRow ───────────────────────────────────────────────────────────────

function CompareRow({ rank, result, vehicleName }: { rank: number; result: BatchSimulationResult; vehicleName: string }) {
  if (result.error || !result.response) {
    return (
      <View style={cr.row}>
        <Text style={cr.rank}>#{rank}</Text>
        <View style={{ flex: 1 }}><Text style={cr.name}>{vehicleName}</Text><Text style={cr.error}>{result.error ?? "No result"}</Text></View>
      </View>
    );
  }
  const risk = result.response.risk_level;
  const soc = result.response.projected_arrival_soc_pct;
  return (
    <View style={cr.row}>
      <Text style={cr.rank}>#{rank}</Text>
      <View style={{ flex: 1 }}><Text style={cr.name}>{vehicleName}</Text><Text style={cr.sub}>{result.vehicle_id}</Text></View>
      <View style={{ alignItems: "flex-end" }}>
        <Text style={[cr.soc, { color: riskColor(risk) }]}>{soc.toFixed(1)}% SOC</Text>
        <View style={[cr.badge, { borderColor: riskColor(risk) }]}><Text style={[cr.badgeTxt, { color: riskColor(risk) }]}>{risk}</Text></View>
      </View>
    </View>
  );
}
const cr = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", backgroundColor: colors.bgSurface, borderRadius: 10, padding: 12, borderWidth: 1, borderColor: colors.border, marginBottom: 8, gap: 10 },
  rank: { fontSize: 14, fontWeight: "900", color: colors.textMuted, width: 24 },
  name: { fontSize: 13, fontWeight: "700", color: colors.textPrimary },
  sub: { fontSize: 11, color: colors.textMuted, marginTop: 1 },
  soc: { fontSize: 14, fontWeight: "700" },
  badge: { paddingHorizontal: 7, paddingVertical: 2, borderRadius: 5, borderWidth: 1, marginTop: 3, backgroundColor: "transparent" },
  badgeTxt: { fontSize: 9, fontWeight: "700" },
  error: { fontSize: 11, color: colors.riskDangerText, marginTop: 2 },
});

// ─── SimulatorScreen ──────────────────────────────────────────────────────────

type ScreenTab = "assess" | "history" | "compare";

export const SimulatorScreen: React.FC<SimulatorScreenProps> = ({
  vehicles, selectedVehicle, onSelectVehicle,
  onRunSimulation, onRunBatchSimulation, onLoadSimHistory,
  assessment, loading, error, refreshing = false, onRefresh,
}) => {
  const [screenTab, setScreenTab] = useState<ScreenTab>("assess");
  const [values, setValues] = useState<SimulationNumericDraft>({
    route_distance_km: "120", elevation_gain_m: "350", elevation_loss_m: "0",
    ambient_temp_c: "31", payload_kg: "250", reserve_soc_target_pct: "15",
  });
  const [roadType, setRoadType] = useState<RoadType>("MIXED");
  const [hvacMode, setHvacMode] = useState<HvacMode>("LOW");
  const [drivingStyle, setDrivingStyle] = useState<DrivingStyle>("NORMAL");
  const [regenLevel, setRegenLevel] = useState<RegenLevel>("MEDIUM");
  const [activePreset, setActivePreset] = useState<string>("");
  const [showErrors, setShowErrors] = useState(false);

  const [simHistory, setSimHistory] = useState<SimulationRecord[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const [compareResults, setCompareResults] = useState<BatchSimulationResult[]>([]);
  const [compareLoading, setCompareLoading] = useState(false);
  const [compareError, setCompareError] = useState<string | null>(null);

  const { parameters, errors } = parseSimulationInputs(values);
  const activeVehicle = selectedVehicle || vehicles[0];

  const currentRequest =
    parameters && activeVehicle
      ? { ...parameters, vehicle_id: activeVehicle.id, road_type: roadType, hvac_mode: hvacMode, driving_style: drivingStyle, regen_level: regenLevel }
      : null;

  const applyPreset = (preset: Preset) => {
    setActivePreset(preset.label);
    setValues((prev) => ({ ...prev, route_distance_km: String(preset.distanceKm), elevation_gain_m: String(preset.gainM), elevation_loss_m: String(preset.lossM) }));
    setRoadType(preset.roadType);
  };

  const handleSimulate = async () => {
    setShowErrors(true);
    if (!currentRequest || loading) return;
    Keyboard.dismiss();
    await onRunSimulation(currentRequest);
  };

  const loadHistory = useCallback(async () => {
    setHistoryLoading(true);
    try { setSimHistory(await onLoadSimHistory()); }
    catch { setSimHistory([]); }
    finally { setHistoryLoading(false); }
  }, [onLoadSimHistory]);

  useEffect(() => { if (screenTab === "history") void loadHistory(); }, [screenTab, loadHistory]);

  const handleCompare = async () => {
    if (!parameters || vehicles.length === 0 || compareLoading) return;
    setCompareLoading(true); setCompareError(null);
    try {
      const results = await onRunBatchSimulation(
        { route_distance_km: parameters.route_distance_km, elevation_gain_m: parameters.elevation_gain_m, elevation_loss_m: parameters.elevation_loss_m, road_type: roadType, ambient_temp_c: parameters.ambient_temp_c, payload_kg: parameters.payload_kg, hvac_mode: hvacMode, driving_style: drivingStyle, regen_level: regenLevel, reserve_soc_target_pct: parameters.reserve_soc_target_pct },
        vehicles.map((v) => v.id),
      );
      setCompareResults([...results].sort((a, b) => (b.response?.projected_arrival_soc_pct ?? -Infinity) - (a.response?.projected_arrival_soc_pct ?? -Infinity)));
    } catch (e) { setCompareError(e instanceof Error ? e.message : "Compare failed"); }
    finally { setCompareLoading(false); }
  };

  const vehicleNameById = (id: string) => vehicles.find((v) => v.id === id)?.name ?? id;

  const TAB_OPTIONS: { key: ScreenTab; label: string; icon: string }[] = [
    { key: "assess",  label: "Assess",  icon: "play-circle-outline" },
    { key: "history", label: "History", icon: "history" },
    { key: "compare", label: "Compare", icon: "compare" },
  ];

  return (
    <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag" showsVerticalScrollIndicator={false}
      refreshControl={onRefresh ? <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.accentPrimary} colors={[colors.accentPrimary]} progressBackgroundColor={colors.bgSurface} /> : undefined}>
      <Header title="Route Simulator" subtitle="Will this trip make it?" />

      {/* Tab Bar */}
      <View style={styles.tabBar}>
        {TAB_OPTIONS.map((t) => (
          <TouchableOpacity key={t.key} style={[styles.tabBtn, screenTab === t.key && styles.tabBtnActive]} onPress={() => setScreenTab(t.key)}>
            <MaterialCommunityIcons name={t.icon as any} size={16} color={screenTab === t.key ? colors.accentPrimary : colors.textMuted} />
            <Text style={[styles.tabLabel, screenTab === t.key && styles.tabLabelActive]}>{t.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* ── ASSESS TAB ─────────────────────────────────────────────────── */}
      {screenTab === "assess" && (
        <>
          {error && <ErrorBanner message={error} onRetry={handleSimulate} />}

          <View style={styles.card}>
            <StepHeader num={1} title="Vehicle & route" />
            <Text style={styles.fieldLabel}>Which vehicle?</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.vehicleScroll}>
              {vehicles.map((v) => {
                const chosen = activeVehicle?.id === v.id;
                return (
                  <TouchableOpacity key={v.id} style={[styles.vehicleOption, chosen && styles.vehicleOptionActive]} onPress={() => onSelectVehicle(v)}>
                    <Text style={[styles.vehicleOptionName, chosen && styles.vehicleOptionNameActive]}>{v.name}</Text>
                    <Text style={styles.vehicleOptionSub}>{v.battery_capacity_kwh} kWh · {v.current_soc}% SOC</Text>
                    <Text style={styles.vehicleOptionSub}>{formatBatteryState(v)}</Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
            <Text style={styles.fieldHint}>Also selectable from the Fleet page</Text>
            <ChoiceGroup legend="Start from an example trip" hint="Fills distance, hills and road type. You can still edit them."
              options={PRESETS.map((p) => p.label) as string[] as readonly string[]} value={activePreset}
              onChange={(lbl) => { const p = PRESETS.find((p) => p.label === lbl); if (p) applyPreset(p); }} />
          </View>

          <View style={styles.card}>
            <StepHeader num={2} title="Trip" />
            <View style={styles.numericGrid}>
              {simulationNumericFields.map((field) => {
                const fieldError = showErrors ? errors[field.key] : undefined;
                const copy = FIELD_COPY[field.key] ?? { label: field.label, hint: "" };
                return (
                  <View key={field.key} style={styles.numericField}>
                    <Text style={styles.fieldLabel}>{copy.label}</Text>
                    <Text style={styles.fieldHint}>{copy.hint}</Text>
                    <TextInput accessibilityLabel={copy.label} value={values[field.key]}
                      onChangeText={(v) => { setValues((prev) => ({ ...prev, [field.key]: v })); setActivePreset(""); }}
                      keyboardType={field.key === "ambient_temp_c" ? (Platform.OS === "ios" ? "numbers-and-punctuation" : "default") : "decimal-pad"}
                      style={[styles.numericInput, fieldError && styles.numericInputInvalid]} />
                    {fieldError && <Text accessibilityRole="alert" style={styles.fieldError}>{fieldError}</Text>}
                  </View>
                );
              })}
            </View>
            <ChoiceGroup legend="Road type" hint="Mostly city, highway, or both" options={["URBAN", "HIGHWAY", "MIXED"] as const} value={roadType} onChange={setRoadType} />
          </View>

          <View style={styles.card}>
            <StepHeader num={3} title="Driving" />
            <ChoiceGroup legend="Driving style" hint="Sporty driving drains the battery faster" options={["ECO", "NORMAL", "AGGRESSIVE"] as const} value={drivingStyle} onChange={setDrivingStyle} />
            <ChoiceGroup legend="Heating / A/C" hint="Climate control uses battery" options={["OFF", "LOW", "MEDIUM", "HIGH"] as const} value={hvacMode} onChange={setHvacMode} />
            <ChoiceGroup legend="Energy recovery when braking" hint="Higher recovers more energy downhill" options={["OFF", "LOW", "MEDIUM", "HIGH"] as const} value={regenLevel} onChange={setRegenLevel} />
          </View>

          <TouchableOpacity accessibilityRole="button" accessibilityState={{ disabled: loading || !activeVehicle }}
            style={[styles.runButton, (loading || !activeVehicle) && styles.runButtonDisabled]}
            onPress={handleSimulate} disabled={loading || !activeVehicle} activeOpacity={0.8}>
            <MaterialCommunityIcons name={loading ? "loading" : "play-circle-outline"} size={20} color="#000" style={{ marginRight: 8 }} />
            <Text style={styles.runButtonText}>{loading ? "Assessing route…" : "Simulate trip"}</Text>
          </TouchableOpacity>

          {!activeVehicle && <Text style={styles.noVehicleHint}>Choose a vehicle first.</Text>}

          {assessment && (
            <View style={styles.resultWrapper}>
              <SimulationResult assessment={assessment} isOutdated={isAssessmentOutdated(assessment, currentRequest, activeVehicle)} />
            </View>
          )}
        </>
      )}

      {/* ── HISTORY TAB ────────────────────────────────────────────────── */}
      {screenTab === "history" && (
        <View style={styles.card}>
          <View style={styles.historyHeader}>
            <Text style={styles.historyTitle}>Simulation History</Text>
            <TouchableOpacity onPress={loadHistory} disabled={historyLoading}>
              <MaterialCommunityIcons name="refresh" size={20} color={historyLoading ? colors.textMuted : colors.accentPrimary} />
            </TouchableOpacity>
          </View>
          {historyLoading && <ActivityIndicator color={colors.accentPrimary} style={{ marginVertical: 20 }} />}
          {!historyLoading && simHistory.length === 0 && (
            <View style={styles.emptyBox}>
              <MaterialCommunityIcons name="history" size={36} color={colors.textMuted} />
              <Text style={styles.emptyText}>No simulation history yet.</Text>
              <Text style={styles.emptyHint}>Run a simulation first.</Text>
            </View>
          )}
          {simHistory.map((record) => (
            <HistoryRow key={record.id} record={record} expanded={expandedId === record.id} onToggle={() => setExpandedId(expandedId === record.id ? null : record.id)} />
          ))}
        </View>
      )}

      {/* ── COMPARE TAB ────────────────────────────────────────────────── */}
      {screenTab === "compare" && (
        <View style={styles.card}>
          <Text style={styles.historyTitle}>Fleet Comparison</Text>
          <Text style={styles.compareHint}>
            Runs the current route settings against all {vehicles.length} vehicles and ranks them by estimated arrival SOC.
          </Text>
          {compareError && <ErrorBanner message={compareError} onRetry={handleCompare} />}
          <TouchableOpacity style={[styles.runButton, compareLoading && styles.runButtonDisabled]}
            onPress={handleCompare} disabled={compareLoading || vehicles.length === 0} activeOpacity={0.8}>
            <MaterialCommunityIcons name={compareLoading ? "loading" : "compare"} size={20} color="#000" style={{ marginRight: 8 }} />
            <Text style={styles.runButtonText}>{compareLoading ? "Comparing fleet…" : `Compare All ${vehicles.length} Vehicles`}</Text>
          </TouchableOpacity>
          {compareLoading && <ActivityIndicator color={colors.accentPrimary} style={{ marginVertical: 16 }} />}
          {compareResults.length > 0 && !compareLoading && (
            <View style={{ marginTop: 12 }}>
              <Text style={styles.fieldLabel}>Results — ranked by arrival SOC</Text>
              {compareResults.map((r, i) => <CompareRow key={r.vehicle_id} rank={i + 1} result={r} vehicleName={vehicleNameById(r.vehicle_id)} />)}
            </View>
          )}
          {compareResults.length === 0 && !compareLoading && (
            <View style={styles.emptyBox}>
              <MaterialCommunityIcons name="compare" size={36} color={colors.textMuted} />
              <Text style={styles.emptyText}>No comparison run yet.</Text>
              <Text style={styles.emptyHint}>Configure a route in Assess, then press Compare.</Text>
            </View>
          )}
        </View>
      )}
    </ScrollView>
  );
};

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  scrollContent: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 40 },
  tabBar: { flexDirection: "row", backgroundColor: colors.bgSurface, borderRadius: 10, borderWidth: 1, borderColor: colors.border, marginBottom: 16, overflow: "hidden" },
  tabBtn: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 5, paddingVertical: 10 },
  tabBtnActive: { borderBottomWidth: 2, borderBottomColor: colors.accentPrimary },
  tabLabel: { fontSize: 12, color: colors.textMuted, fontWeight: "500" },
  tabLabelActive: { color: colors.accentPrimary, fontWeight: "700" },
  card: { backgroundColor: colors.bgSurface, borderRadius: 12, padding: 16, borderWidth: 1, borderColor: colors.border, marginBottom: 16 },
  vehicleScroll: { gap: 8, paddingBottom: 4 },
  vehicleOption: { paddingVertical: 8, paddingHorizontal: 14, borderRadius: 8, backgroundColor: colors.bgSurfaceAlt, borderWidth: 1, borderColor: colors.border, minWidth: 160 },
  vehicleOptionActive: { backgroundColor: colors.badgeBg, borderColor: colors.accentPrimary },
  vehicleOptionName: { fontSize: 13, fontWeight: "600", color: colors.textPrimary },
  vehicleOptionNameActive: { color: colors.accentPrimary },
  vehicleOptionSub: { fontSize: 11, color: colors.textMuted, marginTop: 2 },
  fieldLabel: { fontSize: 12, fontWeight: "600", color: colors.textSecondary, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 2, marginTop: 4 },
  fieldHint: { color: colors.textMuted, fontSize: 11, marginBottom: 6 },
  fieldError: { color: colors.errorText, fontSize: 12, marginTop: 4 },
  numericGrid: { flexDirection: "row", flexWrap: "wrap", gap: 12, marginBottom: 12 },
  numericField: { flexGrow: 1, flexBasis: "46%", minWidth: 130 },
  numericInput: { color: colors.textPrimary, backgroundColor: colors.bgSurfaceAlt, borderColor: colors.border, borderWidth: 1, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, minHeight: 44, fontSize: 16 },
  numericInputInvalid: { borderColor: colors.riskDanger },
  runButton: { backgroundColor: colors.accentPrimary, flexDirection: "row", alignItems: "center", justifyContent: "center", paddingVertical: 15, borderRadius: 10, marginBottom: 8 },
  runButtonDisabled: { opacity: 0.5 },
  runButtonText: { color: "#000", fontSize: 15, fontWeight: "900" },
  noVehicleHint: { color: colors.textMuted, fontSize: 12, textAlign: "center", marginBottom: 12 },
  resultWrapper: { marginBottom: 16 },
  historyHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 },
  historyTitle: { fontSize: 15, fontWeight: "700", color: colors.textPrimary },
  compareHint: { fontSize: 12, color: colors.textMuted, marginBottom: 14 },
  emptyBox: { alignItems: "center", paddingVertical: 32 },
  emptyText: { color: colors.textSecondary, fontSize: 14, marginTop: 10, fontWeight: "600" },
  emptyHint: { color: colors.textMuted, fontSize: 12, marginTop: 4 },
});
