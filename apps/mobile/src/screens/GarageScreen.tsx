import React, { useCallback, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  FlatList,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { formatBatteryState } from "@fleet/api-client";
import type { Vehicle, VehicleCreate } from "@fleet/api-client";
import { colors } from "../constants/theme";
import { EV_MODELS, formatEvSpecs, type EvModel } from "../constants/evModels";

// ─── Types ───────────────────────────────────────────────────────────────────

type ViewMode = "HERO" | "SIDE" | "REAR" | "ABOVE" | "TURNTABLE";

export interface GarageScreenProps {
  vehicles: Vehicle[];
  selectedId: string | null;
  onSelect: (vehicleId: string) => void;
  /** Adds a "New vehicle" bay: pick a known EV from the row, then register it. */
  onCreate?: (payload: VehicleCreate) => Promise<Vehicle>;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const pad = (n: number) => String(n).padStart(2, "0");

function clamp(val: number, min: number, max: number) {
  return Math.min(max, Math.max(min, val));
}

function bodyLabel(model: string): string {
  const m = model.toLowerCase();
  if (m.includes("van") || m.includes("transit") || m.includes("sprinter") || m.includes("edv"))
    return "Van";
  if (m.includes("suv") || m.includes("crossover")) return "SUV / Crossover";
  if (m.includes("truck") || m.includes("pickup") || m.includes("lightning") || m.includes("silverado") || m.includes("r1t"))
    return "Truck";
  if (m.includes("sedan") || m.includes("model 3")) return "Sedan";
  if (m.includes("hatch") || m.includes("leaf") || m.includes("bolt")) return "Hatchback";
  return "EV";
}

function vehicleIcon(model: string): keyof typeof MaterialCommunityIcons.glyphMap {
  const m = model.toLowerCase();
  if (m.includes("van") || m.includes("transit") || m.includes("sprinter") || m.includes("edv"))
    return "van-utility";
  if (m.includes("truck") || m.includes("pickup") || m.includes("lightning") || m.includes("silverado") || m.includes("r1t"))
    return "truck";
  if (m.includes("bus")) return "bus-electric";
  return "car-electric";
}

function socColor(soc: number) {
  if (soc >= 60) return colors.riskSafe;
  if (soc >= 30) return colors.riskCautionText;
  return colors.riskDanger;
}

const STATUSES = ["AVAILABLE", "IN_USE", "CHARGING", "MAINTENANCE"];

// ─── Animated Stage (vehicle artwork) ────────────────────────────────────────

function VehicleStage({
  model,
  plate,
  soc = 80,
}: {
  model: string | null;
  plate: string;
  soc?: number;
}) {
  const pulse = useRef(new Animated.Value(1)).current;

  React.useEffect(() => {
    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1.05, duration: 2000, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 1, duration: 2000, useNativeDriver: true }),
      ])
    );
    anim.start();
    return () => anim.stop();
  }, [pulse]);

  if (!model) {
    return (
      <View style={stage.wrap}>
        <MaterialCommunityIcons name="car-off" size={72} color="#2A2A2A" />
      </View>
    );
  }

  const glowColor = socColor(soc);

  return (
    <View style={stage.wrap}>
      {/* Turntable ring */}
      <View style={[stage.ring, stage.ringOuter]} />
      <View style={[stage.ring, stage.ringInner]} />

      {/* Grid lines under vehicle */}
      <View style={stage.grid} />

      {/* SOC glow */}
      <View style={[stage.glow, { borderColor: glowColor }]} />

      {/* Vehicle icon */}
      <Animated.View style={[stage.iconWrap, { transform: [{ scale: pulse }] }]}>
        <MaterialCommunityIcons
          name={vehicleIcon(model)}
          size={110}
          color="#DADDD8"
        />
        {/* Plate */}
        <View style={stage.plate}>
          <Text style={stage.plateText}>{plate.toUpperCase()}</Text>
        </View>
      </Animated.View>
    </View>
  );
}

const stage = StyleSheet.create({
  wrap: {
    height: 180,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  ring: {
    position: "absolute",
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#1E1E1E",
  },
  ringOuter: { width: 220, height: 220 },
  ringInner: { width: 140, height: 140, borderColor: "#181818" },
  grid: {
    position: "absolute",
    bottom: 10,
    width: 180,
    height: 40,
    borderTopWidth: 1,
    borderTopColor: "#1E3A2A",
  },
  glow: {
    position: "absolute",
    width: 200,
    height: 200,
    borderRadius: 100,
    borderWidth: 2,
    opacity: 0.15,
  },
  iconWrap: { alignItems: "center", gap: 6 },
  plate: {
    backgroundColor: "#181818",
    borderWidth: 1,
    borderColor: "#2A2A2A",
    paddingHorizontal: 10,
    paddingVertical: 2,
    borderRadius: 3,
  },
  plateText: {
    color: "#888",
    fontSize: 9,
    fontWeight: "700",
    letterSpacing: 2,
  },
});

// ─── Stat Row (one spec line in the sheet) ────────────────────────────────────

function StatRow({
  label,
  value,
  unit,
  fraction,
}: {
  label: string;
  value: string;
  unit: string;
  fraction: number;
}) {
  const clamped = clamp(fraction, 0.04, 1);
  const fillColor =
    clamped > 0.6 ? colors.riskSafe : clamped > 0.3 ? colors.riskCautionText : colors.riskDanger;
  return (
    <View style={stat.row}>
      <View style={stat.top}>
        <Text style={stat.label}>{label}</Text>
        <Text style={stat.value}>
          {value}
          <Text style={stat.unit}> {unit}</Text>
        </Text>
      </View>
      <View style={stat.track}>
        <View style={[stat.fill, { width: `${(clamped * 100).toFixed(1)}%`, backgroundColor: fillColor }]} />
      </View>
    </View>
  );
}

const stat = StyleSheet.create({
  row: { gap: 4, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: "#1E1E1E" },
  top: { flexDirection: "row", justifyContent: "space-between", alignItems: "baseline" },
  label: { color: "#888", fontSize: 10, textTransform: "uppercase", letterSpacing: 0.6 },
  value: { color: "#F0ECE0", fontSize: 15, fontWeight: "700" },
  unit: { color: "#666", fontSize: 9, fontWeight: "400" },
  track: { height: 3, backgroundColor: "#222", borderRadius: 2, overflow: "hidden" },
  fill: { height: 3, borderRadius: 2 },
});

// ─── Garage Screen ────────────────────────────────────────────────────────────

export const GarageScreen: React.FC<GarageScreenProps> = ({
  vehicles,
  selectedId,
  onSelect,
  onCreate,
}) => {
  const [idx, setIdx] = useState(() =>
    Math.max(0, vehicles.findIndex((v) => v.id === selectedId))
  );
  const [adding, setAdding] = useState(false);
  const [pick, setPick] = useState<number | null>(0);
  const [activeView, setActiveView] = useState<ViewMode>("HERO");
  const [spin, setSpin] = useState(true);

  // Form State
  const [formId, setFormId] = useState("");
  const [formName, setFormName] = useState("");
  const [formStatus, setFormStatus] = useState("AVAILABLE");
  const [formSoc, setFormSoc] = useState("80");
  const [formSoh, setFormSoh] = useState("100");
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const fleetRailRef = useRef<FlatList>(null);
  const modelRailRef = useRef<FlatList>(null);

  const showForm = Boolean(onCreate && (adding || vehicles.length === 0));
  const vehicle = vehicles[idx] ?? null;
  const spec: EvModel | null = pick !== null ? EV_MODELS[pick] : null;

  const goTo = useCallback(
    (i: number) => {
      if (vehicles.length === 0) return;
      const next = ((i % vehicles.length) + vehicles.length) % vehicles.length;
      setIdx(next);
      fleetRailRef.current?.scrollToIndex({
        index: next,
        animated: true,
        viewPosition: 0.5,
      });
    },
    [vehicles.length]
  );

  const pickModel = useCallback((i: number) => {
    const next = ((i % EV_MODELS.length) + EV_MODELS.length) % EV_MODELS.length;
    setPick(next);
    modelRailRef.current?.scrollToIndex({
      index: next,
      animated: true,
      viewPosition: 0.5,
    });
  }, []);

  const handleRailScroll = useCallback(
    (e: NativeSyntheticEvent<NativeScrollEvent>) => {
      const offset = e.nativeEvent.contentOffset.x;
      const slotW = 108;
      const nearest = Math.round(offset / slotW);
      if (nearest !== idx && nearest >= 0 && nearest < vehicles.length) {
        setIdx(nearest);
      }
    },
    [idx, vehicles.length]
  );

  const handleModelRailScroll = useCallback(
    (e: NativeSyntheticEvent<NativeScrollEvent>) => {
      const offset = e.nativeEvent.contentOffset.x;
      const slotW = 108;
      const nearest = Math.round(offset / slotW);
      if (nearest !== pick && nearest >= 0 && nearest < EV_MODELS.length) {
        setPick(nearest);
      }
    },
    [pick]
  );

  const handleAddVehicle = async () => {
    setFormError(null);
    if (!formId.trim()) {
      setFormError("Vehicle ID is required.");
      return;
    }
    if (!formName.trim()) {
      setFormError("Name is required.");
      return;
    }
    if (vehicles.some((v) => v.id.toLowerCase() === formId.trim().toLowerCase())) {
      setFormError("A vehicle with this ID already exists.");
      return;
    }
    if (!spec) {
      setFormError("Please select a model from the EV models row.");
      return;
    }
    const soc = parseFloat(formSoc);
    const soh = parseFloat(formSoh);
    if (isNaN(soc) || soc < 0 || soc > 100) {
      setFormError("State of charge must be between 0 and 100.");
      return;
    }
    if (isNaN(soh) || soh < 0 || soh > 100) {
      setFormError("Battery health must be between 0 and 100.");
      return;
    }

    if (!onCreate) return;

    setSubmitting(true);
    try {
      const payload: VehicleCreate = {
        id: formId.trim(),
        name: formName.trim(),
        model: spec.model,
        battery_capacity_kwh: spec.battery_capacity_kwh,
        baseline_efficiency_wh_km: spec.baseline_efficiency_wh_km,
        curb_mass_kg: spec.curb_mass_kg,
        current_soc: soc,
        current_soh: soh,
        status: formStatus,
      };
      const created = await onCreate(payload);
      setFormId("");
      setFormName("");
      setAdding(false);
      onSelect(created.id);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Failed to register vehicle");
    } finally {
      setSubmitting(false);
    }
  };

  const VIEWS: { id: ViewMode; label: string }[] = [
    { id: "HERO", label: "Hero" },
    { id: "SIDE", label: "Side" },
    { id: "REAR", label: "Rear" },
    { id: "ABOVE", label: "Above" },
    { id: "TURNTABLE", label: "Turntable" },
  ];

  const specs = !vehicle
    ? []
    : ([
        ["State of charge", vehicle.current_soc.toFixed(0), "%", vehicle.current_soc / 100],
        ["Battery health", vehicle.current_soh.toFixed(1), "%", vehicle.current_soh / 100],
        ["Battery capacity", String(vehicle.battery_capacity_kwh), "kWh", vehicle.battery_capacity_kwh / 200],
        ["Efficiency", String(vehicle.baseline_efficiency_wh_km), "Wh/km", vehicle.baseline_efficiency_wh_km / 300],
        ...(vehicle.curb_mass_kg != null
          ? [["Curb mass", vehicle.curb_mass_kg.toLocaleString("en-US"), "kg", vehicle.curb_mass_kg / 3500] as [string, string, string, number]]
          : []),
      ] as [string, string, string, number][]);

  // Headline metadata
  const ident = showForm
    ? spec
      ? {
          marque: "NEW VEHICLE",
          name: spec.model,
          tagline: "Add an ID and name to register it.",
          chips: [
            bodyLabel(spec.model),
            `${spec.battery_capacity_kwh} kWh`,
            `${spec.baseline_efficiency_wh_km} Wh/km`,
            `${spec.curb_mass_kg.toLocaleString("en-US")} kg`,
          ],
        }
      : {
          marque: vehicles.length ? "NEW VEHICLE" : "EMPTY GARAGE",
          name: "CHOOSE A MODEL",
          tagline: "Pick an EV from the row below to bring it up on the lift.",
          chips: [],
        }
    : vehicle
    ? {
        marque: `${vehicle.id} · ${vehicle.status.replace("_", " ")}`,
        name: vehicle.name,
        tagline: vehicle.model,
        chips: [
          bodyLabel(vehicle.model),
          `${vehicle.battery_capacity_kwh} kWh`,
          vehicle.status.replace("_", " "),
        ],
      }
    : {
        marque: "EMPTY GARAGE",
        name: "NO VEHICLES YET",
        tagline: "Connect to the fleet backend to register one.",
        chips: [],
      };

  return (
    <View style={s.root}>
      {/* ── Top bar ─────────────────────────────────────────────── */}
      <View style={s.topBar}>
        <View style={s.brandMark}>
          <Text style={s.brandNum}>09</Text>
        </View>
        <View style={s.brandTxt}>
          <Text style={s.brandTitle}>FLEET GARAGE</Text>
          <Text style={s.brandSub}>
            {showForm
              ? `Register a vehicle · ${EV_MODELS.length} models`
              : `${onCreate ? "Choose or add a vehicle" : "Choose a vehicle"} · ${vehicles.length} bays`}
          </Text>
        </View>
        <Text style={s.counter}>
          {showForm
            ? `${pad(pick === null ? 0 : pick + 1)} / ${pad(EV_MODELS.length)}`
            : `${pad(vehicle ? idx + 1 : 0)} / ${pad(vehicles.length)}`}
        </Text>
      </View>

      <ScrollView
        style={s.scroll}
        contentContainerStyle={s.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* ── Ident ─────────────────────────────────────────────── */}
        <View style={s.ident}>
          <Text style={s.marque}>{ident.marque}</Text>
          <Text style={s.carName} numberOfLines={2}>
            {ident.name}
          </Text>
          <Text style={s.tagline}>{ident.tagline}</Text>
          {ident.chips.length > 0 && (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={s.chips}
            >
              {ident.chips.map((chip) => (
                <View key={chip} style={s.chip}>
                  <Text style={s.chipText}>{chip}</Text>
                </View>
              ))}
            </ScrollView>
          )}
        </View>

        {/* ── Stage + hint ──────────────────────────────────────── */}
        <VehicleStage
          model={showForm ? spec?.model ?? null : vehicle?.model ?? null}
          plate={showForm ? formId || "NEW EV" : vehicle?.id ?? ""}
          soc={showForm ? parseFloat(formSoc) || 80 : vehicle?.current_soc ?? 80}
        />
        <Text style={s.hint}>Drag to look around · scroll to zoom · ← → to swap</Text>

        {/* ── Camera views ──────────────────────────────────────── */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={s.viewRow}
        >
          {VIEWS.map((v) => {
            const isActive =
              v.id === "TURNTABLE"
                ? spin
                : activeView === v.id && !spin;
            return (
              <Pressable
                key={v.id}
                style={[s.viewBtn, isActive && s.viewBtnActive]}
                onPress={() => {
                  if (v.id === "TURNTABLE") {
                    setSpin((prev) => !prev);
                    setActiveView("TURNTABLE");
                  } else {
                    setSpin(false);
                    setActiveView(v.id);
                  }
                }}
              >
                <Text style={[s.viewBtnTxt, isActive && s.viewBtnTxtActive]}>
                  {v.label}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>

        {/* ── Vehicle Sheet OR Garage Form ──────────────────────── */}
        {showForm ? (
          <View style={s.formSheet}>
            <View style={s.formHeader}>
              <Text style={s.formTitle}>ADD A VEHICLE</Text>
              <Text style={s.formHint}>
                Register an EV so it appears on the dashboard and in trip planning.
              </Text>
            </View>

            {formError && (
              <View style={s.errorAlert}>
                <MaterialCommunityIcons name="alert-circle-outline" size={16} color={colors.riskDanger} />
                <Text style={s.errorAlertTxt}>{formError}</Text>
              </View>
            )}

            {/* Vehicle ID */}
            <View style={s.fieldGroup}>
              <Text style={s.fieldLabel}>VEHICLE ID</Text>
              <TextInput
                style={s.fieldInput}
                value={formId}
                onChangeText={setFormId}
                placeholder="Unique, e.g. EV-101"
                placeholderTextColor="#555"
                autoCapitalize="characters"
              />
              <Text style={s.fieldSubHint}>Unique identifier across the fleet</Text>
            </View>

            {/* Display Name */}
            <View style={s.fieldGroup}>
              <Text style={s.fieldLabel}>NAME</Text>
              <TextInput
                style={s.fieldInput}
                value={formName}
                onChangeText={setFormName}
                placeholder="Display name, e.g. Delivery van 1"
                placeholderTextColor="#555"
              />
              <Text style={s.fieldSubHint}>Fleet nickname or operational name</Text>
            </View>

            {/* Make & Model preview */}
            <View style={s.fieldGroup}>
              <Text style={s.fieldLabel}>MAKE & MODEL</Text>
              <View style={s.modelDisplay}>
                <Text style={s.modelDisplayTxt}>{spec ? spec.model : "None picked yet"}</Text>
              </View>
              <Text style={s.fieldSubHint}>
                {spec
                  ? formatEvSpecs(spec)
                  : "Pick one from the EV models row below; it sets battery size and efficiency."}
              </Text>
            </View>

            {/* Status selection */}
            <View style={s.fieldGroup}>
              <Text style={s.fieldLabel}>STATUS</Text>
              <View style={s.statusChips}>
                {STATUSES.map((st) => (
                  <TouchableOpacity
                    key={st}
                    style={[s.statusChip, formStatus === st && s.statusChipActive]}
                    onPress={() => setFormStatus(st)}
                  >
                    <Text style={[s.statusChipTxt, formStatus === st && s.statusChipTxtActive]}>
                      {st.replace("_", " ")}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* SOC & SOH */}
            <View style={s.fieldRow}>
              <View style={[s.fieldGroup, { flex: 1 }]}>
                <Text style={s.fieldLabel}>CURRENT CHARGE (%)</Text>
                <TextInput
                  style={s.fieldInput}
                  value={formSoc}
                  onChangeText={setFormSoc}
                  keyboardType="decimal-pad"
                />
              </View>
              <View style={[s.fieldGroup, { flex: 1 }]}>
                <Text style={s.fieldLabel}>BATTERY HEALTH (%)</Text>
                <TextInput
                  style={s.fieldInput}
                  value={formSoh}
                  onChangeText={setFormSoh}
                  keyboardType="decimal-pad"
                />
              </View>
            </View>

            {/* Submit button */}
            <TouchableOpacity
              style={[s.submitBtn, submitting && { opacity: 0.6 }]}
              onPress={handleAddVehicle}
              disabled={submitting}
              activeOpacity={0.8}
            >
              {submitting ? (
                <ActivityIndicator color="#000" />
              ) : (
                <Text style={s.submitBtnTxt}>ADD VEHICLE</Text>
              )}
            </TouchableOpacity>
          </View>
        ) : (
          vehicle && (
            <View style={s.sheet}>
              <View style={s.sheetHeader}>
                <Text style={s.sheetTitle}>VEHICLE SHEET</Text>
                <View style={s.sheetMeta}>
                  <Text style={s.sheetMetaText}>{vehicle.id}</Text>
                  <Text style={s.sheetMetaText}>Bay {pad(idx + 1)}</Text>
                </View>
              </View>

              {specs.map(([label, value, unit, frac]) => (
                <StatRow key={label} label={label} value={value} unit={unit} fraction={frac} />
              ))}

              <Text style={s.sheetFoot}>{formatBatteryState(vehicle)}</Text>
            </View>
          )
        )}
      </ScrollView>

      {/* ── Vehicle Rail (Fleet or EV Models) ───────────────────── */}
      <View style={s.railWrap}>
        <TouchableOpacity
          style={[s.arrow, (showForm ? (pick === 0 || pick === null) : idx === 0) && s.arrowOff]}
          disabled={showForm ? (pick === 0 || pick === null) : idx === 0}
          onPress={() => (showForm ? pickModel((pick ?? 0) - 1) : goTo(idx - 1))}
        >
          <MaterialCommunityIcons
            name="chevron-left"
            size={22}
            color={(showForm ? (pick === 0 || pick === null) : idx === 0) ? "#2A2A2A" : colors.textSecondary}
          />
        </TouchableOpacity>

        {showForm ? (
          <FlatList
            ref={modelRailRef}
            data={EV_MODELS}
            keyExtractor={(m) => m.model}
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={s.railContent}
            onMomentumScrollEnd={handleModelRailScroll}
            getItemLayout={(_, i) => ({ length: 116, offset: 116 * i, index: i })}
            renderItem={({ item: m, index: i }) => (
              <TouchableOpacity
                style={[s.slot, i === pick && s.slotActive]}
                onPress={() => pickModel(i)}
                activeOpacity={0.75}
              >
                <Text style={s.slotN}>{pad(i + 1)}</Text>
                <View style={s.slotIcon}>
                  <MaterialCommunityIcons
                    name={vehicleIcon(m.model)}
                    size={34}
                    color={i === pick ? "#F0ECE0" : "#444"}
                  />
                </View>
                <Text style={s.slotName} numberOfLines={1}>{m.model}</Text>
                <Text style={s.slotSub} numberOfLines={1}>
                  {m.battery_capacity_kwh} kWh · {bodyLabel(m.model)}
                </Text>
              </TouchableOpacity>
            )}
          />
        ) : (
          <FlatList
            ref={fleetRailRef}
            data={vehicles}
            keyExtractor={(v) => v.id}
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={s.railContent}
            onMomentumScrollEnd={handleRailScroll}
            getItemLayout={(_, i) => ({ length: 116, offset: 116 * i, index: i })}
            renderItem={({ item: v, index: i }) => (
              <TouchableOpacity
                style={[s.slot, i === idx && s.slotActive]}
                onPress={() => goTo(i)}
                activeOpacity={0.75}
              >
                <Text style={s.slotN}>{pad(i + 1)}</Text>
                <View style={s.slotIcon}>
                  <MaterialCommunityIcons
                    name={vehicleIcon(v.model)}
                    size={34}
                    color={i === idx ? "#F0ECE0" : "#444"}
                  />
                </View>
                <Text style={s.slotName} numberOfLines={1}>{v.name}</Text>
                <Text style={s.slotSub} numberOfLines={1}>
                  {v.id} · {v.model.split(" ").slice(0, 2).join(" ")}
                </Text>
              </TouchableOpacity>
            )}
            ListFooterComponent={
              onCreate ? (
                <TouchableOpacity
                  style={[s.slot, s.slotNew]}
                  onPress={() => {
                    setAdding(true);
                    setPick(0);
                  }}
                  activeOpacity={0.75}
                >
                  <Text style={s.slotN}>{pad(vehicles.length + 1)}</Text>
                  <View style={s.slotIcon}>
                    <Text style={s.plusIcon}>+</Text>
                  </View>
                  <Text style={[s.slotName, { color: colors.accentPrimary }]}>New vehicle</Text>
                  <Text style={s.slotSub}>Register an EV</Text>
                </TouchableOpacity>
              ) : undefined
            }
          />
        )}

        <TouchableOpacity
          style={[
            s.arrow,
            (showForm ? pick === EV_MODELS.length - 1 : idx === vehicles.length - 1) && s.arrowOff,
          ]}
          disabled={showForm ? pick === EV_MODELS.length - 1 : idx === vehicles.length - 1}
          onPress={() => (showForm ? pickModel((pick ?? 0) + 1) : goTo(idx + 1))}
        >
          <MaterialCommunityIcons
            name="chevron-right"
            size={22}
            color={
              (showForm ? pick === EV_MODELS.length - 1 : idx === vehicles.length - 1)
                ? "#2A2A2A"
                : colors.textSecondary
            }
          />
        </TouchableOpacity>
      </View>

      {/* ── Dock / Select or Back to fleet ─────────────────────── */}
      <View style={s.dock}>
        {showForm && vehicles.length > 0 ? (
          <TouchableOpacity
            style={s.backBtn}
            onPress={() => {
              setAdding(false);
              setFormError(null);
            }}
            activeOpacity={0.8}
          >
            <Text style={s.backBtnTxt}>BACK TO FLEET</Text>
          </TouchableOpacity>
        ) : (
          vehicle && (
            <TouchableOpacity
              style={[s.selectBtn, vehicle.id === selectedId && s.selectBtnDone]}
              onPress={() => onSelect(vehicle.id)}
              disabled={vehicle.id === selectedId}
              activeOpacity={0.8}
            >
              <Text
                style={[s.selectBtnTxt, vehicle.id === selectedId && s.selectBtnTxtDone]}
              >
                {vehicle.id === selectedId
                  ? `${vehicle.name.toUpperCase()} SELECTED`
                  : `SELECT ${vehicle.name.toUpperCase()}`}
              </Text>
            </TouchableOpacity>
          )
        )}
      </View>
    </View>
  );
};

// ─── Styles ───────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: "#0A0A0A",
  },

  // Top bar
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingTop: 12,
    paddingBottom: 10,
    gap: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#181818",
  },
  brandMark: {
    width: 36,
    height: 36,
    backgroundColor: "#0F0F0F",
    borderWidth: 1,
    borderColor: "#F0ECE0",
    alignItems: "center",
    justifyContent: "center",
  },
  brandNum: { color: "#F0ECE0", fontSize: 14, fontWeight: "900", letterSpacing: 1 },
  brandTxt: { flex: 1 },
  brandTitle: { color: "#F0ECE0", fontSize: 11, fontWeight: "900", letterSpacing: 2 },
  brandSub: { color: "#555", fontSize: 9, letterSpacing: 0.5, marginTop: 1 },
  counter: { color: "#555", fontSize: 12, fontWeight: "700", letterSpacing: 1 },

  // Scrollable body
  scroll: { flex: 1 },
  scrollContent: { paddingBottom: 16 },

  // Ident
  ident: { paddingHorizontal: 14, paddingTop: 10, paddingBottom: 6 },
  marque: { color: "#555", fontSize: 9, letterSpacing: 1, textTransform: "uppercase" },
  carName: {
    color: "#F0ECE0",
    fontSize: 24,
    fontWeight: "900",
    letterSpacing: 2,
    textTransform: "uppercase",
    marginTop: 2,
  },
  tagline: { color: "#888", fontSize: 12, marginTop: 2 },
  chips: { flexDirection: "row", gap: 6, marginTop: 8 },
  chip: {
    backgroundColor: "#141414",
    borderWidth: 1,
    borderColor: "#2A2A2A",
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 3,
  },
  chipText: {
    color: "#888",
    fontSize: 10,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },

  // Hint
  hint: {
    color: "#2A2A2A",
    fontSize: 9,
    textAlign: "center",
    letterSpacing: 0.5,
    paddingVertical: 4,
  },

  // Camera view buttons
  viewRow: { paddingHorizontal: 14, gap: 6, paddingVertical: 8 },
  viewBtn: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderWidth: 1,
    borderColor: "#1E1E1E",
    borderRadius: 3,
    backgroundColor: "#0F0F0F",
  },
  viewBtnActive: { borderColor: "#F0ECE0", backgroundColor: "#1A1A1A" },
  viewBtnTxt: {
    color: "#444",
    fontSize: 10,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  viewBtnTxtActive: { color: "#F0ECE0" },

  // Vehicle Sheet
  sheet: {
    marginHorizontal: 14,
    marginTop: 4,
    backgroundColor: "#111",
    borderWidth: 1,
    borderColor: "#1E1E1E",
    borderRadius: 4,
    padding: 14,
  },
  sheetHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    paddingBottom: 10,
    marginBottom: 2,
    borderBottomWidth: 1,
    borderBottomColor: "#1E1E1E",
  },
  sheetTitle: {
    color: "#F0ECE0",
    fontSize: 11,
    fontWeight: "900",
    letterSpacing: 2,
  },
  sheetMeta: { alignItems: "flex-end" },
  sheetMetaText: { color: "#555", fontSize: 9 },
  sheetFoot: { color: "#555", fontSize: 10, marginTop: 10, fontStyle: "italic" },

  // Garage Registration Form
  formSheet: {
    marginHorizontal: 14,
    marginTop: 6,
    backgroundColor: "rgba(10, 12, 15, 0.95)",
    borderWidth: 1,
    borderColor: "#222",
    borderRadius: 8,
    padding: 16,
  },
  formHeader: {
    marginBottom: 14,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#1A1A1A",
  },
  formTitle: {
    color: "#F0ECE0",
    fontSize: 13,
    fontWeight: "900",
    letterSpacing: 1.5,
  },
  formHint: {
    color: "#888",
    fontSize: 11,
    marginTop: 4,
  },
  errorAlert: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.errorBg,
    borderWidth: 1,
    borderColor: colors.riskDanger,
    borderRadius: 6,
    padding: 8,
    gap: 6,
    marginBottom: 12,
  },
  errorAlertTxt: {
    color: colors.errorText,
    fontSize: 12,
    flex: 1,
  },
  fieldGroup: {
    marginBottom: 12,
  },
  fieldRow: {
    flexDirection: "row",
    gap: 10,
  },
  fieldLabel: {
    color: "#888",
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 0.8,
    marginBottom: 4,
  },
  fieldInput: {
    backgroundColor: "#111",
    borderWidth: 1,
    borderColor: "#2A2A2A",
    borderRadius: 6,
    color: "#F0ECE0",
    fontSize: 14,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  fieldSubHint: {
    color: "#555",
    fontSize: 10,
    marginTop: 3,
  },
  modelDisplay: {
    backgroundColor: "#111",
    borderWidth: 1,
    borderColor: "#2A2A2A",
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 10,
  },
  modelDisplayTxt: {
    color: colors.accentPrimary,
    fontSize: 13,
    fontWeight: "700",
  },
  statusChips: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginTop: 4,
  },
  statusChip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 4,
    backgroundColor: "#111",
    borderWidth: 1,
    borderColor: "#2A2A2A",
  },
  statusChipActive: {
    borderColor: colors.accentPrimary,
    backgroundColor: colors.badgeBg,
  },
  statusChipTxt: {
    color: "#888",
    fontSize: 10,
    fontWeight: "600",
  },
  statusChipTxtActive: {
    color: colors.accentPrimary,
    fontWeight: "700",
  },
  submitBtn: {
    backgroundColor: colors.accentPrimary,
    borderRadius: 6,
    paddingVertical: 12,
    alignItems: "center",
    marginTop: 6,
  },
  submitBtnTxt: {
    color: "#000",
    fontSize: 12,
    fontWeight: "900",
    letterSpacing: 1.5,
  },

  // Rail
  railWrap: {
    flexDirection: "row",
    alignItems: "center",
    borderTopWidth: 1,
    borderTopColor: "#181818",
    paddingVertical: 6,
    backgroundColor: "#0A0A0A",
  },
  railContent: { paddingHorizontal: 4, gap: 8 },
  slot: {
    width: 108,
    backgroundColor: "#0F0F0F",
    borderWidth: 1,
    borderColor: "#1A1A1A",
    borderRadius: 4,
    padding: 8,
    gap: 3,
  },
  slotActive: { borderColor: "#F0ECE0", backgroundColor: "#141414" },
  slotNew: {
    borderColor: "#3A3520",
    borderStyle: "dashed",
    backgroundColor: "#11100A",
  },
  slotN: { color: "#333", fontSize: 9, fontWeight: "700", letterSpacing: 1 },
  slotIcon: { width: "100%", alignItems: "center", paddingVertical: 4 },
  plusIcon: { color: colors.accentPrimary, fontSize: 26, fontWeight: "900", lineHeight: 30 },
  slotName: { color: "#ccc", fontSize: 10, fontWeight: "700" },
  slotSub: { color: "#444", fontSize: 8 },
  arrow: { paddingHorizontal: 4, alignSelf: "stretch", justifyContent: "center" },
  arrowOff: { opacity: 0.3 },

  // Dock
  dock: {
    padding: 10,
    borderTopWidth: 1,
    borderTopColor: "#181818",
    backgroundColor: "#0A0A0A",
  },
  selectBtn: {
    backgroundColor: "#F0ECE0",
    borderRadius: 4,
    paddingVertical: 13,
    alignItems: "center",
  },
  selectBtnDone: {
    backgroundColor: "transparent",
    borderWidth: 1,
    borderColor: "#F0ECE0",
  },
  selectBtnTxt: {
    fontSize: 11,
    fontWeight: "900",
    letterSpacing: 2,
    color: "#111",
  },
  selectBtnTxtDone: { color: "#F0ECE0" },
  backBtn: {
    backgroundColor: "transparent",
    borderWidth: 1,
    borderColor: "#444",
    borderRadius: 4,
    paddingVertical: 13,
    alignItems: "center",
  },
  backBtnTxt: {
    fontSize: 11,
    fontWeight: "900",
    letterSpacing: 2,
    color: "#F0ECE0",
  },
});
