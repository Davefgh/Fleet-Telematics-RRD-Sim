import React, { useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { colors } from "../constants/theme";

export type UserRole = "Fleet Manager" | "Dispatcher" | "EV Driver";

export interface AuthUser {
  name: string;
  email: string;
  role: UserRole;
  fleetName: string;
}

interface AuthScreenProps {
  onLogin: (user: AuthUser) => void;
}

export const AuthScreen: React.FC<AuthScreenProps> = ({ onLogin }) => {
  const [authMode, setAuthMode] = useState<"signin" | "signup">("signin");

  // Sign In State
  const [signInEmail, setSignInEmail] = useState("");
  const [signInPassword, setSignInPassword] = useState("");
  const [showSignInPassword, setShowSignInPassword] = useState(false);

  // Sign Up State
  const [fullName, setFullName] = useState("");
  const [fleetName, setFleetName] = useState("");
  const [selectedRole, setSelectedRole] = useState<UserRole>("Fleet Manager");
  const [signUpEmail, setSignUpEmail] = useState("");
  const [signUpPassword, setSignUpPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showSignUpPassword, setShowSignUpPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // UI State
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const roles: UserRole[] = ["Fleet Manager", "Dispatcher", "EV Driver"];

  const validateEmail = (email: string): boolean => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
  };

  const handleSignIn = async () => {
    setErrorMessage(null);

    if (!signInEmail.trim()) {
      setErrorMessage("Please enter your work email or username.");
      return;
    }
    if (!signInPassword) {
      setErrorMessage("Please enter your password.");
      return;
    }
    if (!validateEmail(signInEmail)) {
      setErrorMessage("Please enter a valid email address.");
      return;
    }

    setIsLoading(true);
    // Simulate authentication delay for smooth UX
    setTimeout(() => {
      setIsLoading(false);
      onLogin({
        name: signInEmail.split("@")[0].replace(/[._]/g, " ").toUpperCase() || "Fleet Specialist",
        email: signInEmail.trim().toLowerCase(),
        role: "Fleet Manager",
        fleetName: "Apex Logistics EV Fleet",
      });
    }, 600);
  };

  const handleSignUp = async () => {
    setErrorMessage(null);

    if (!fullName.trim()) {
      setErrorMessage("Please enter your full name.");
      return;
    }
    if (!fleetName.trim()) {
      setErrorMessage("Please enter your fleet or organization name.");
      return;
    }
    if (!signUpEmail.trim() || !validateEmail(signUpEmail)) {
      setErrorMessage("Please enter a valid work email.");
      return;
    }
    if (signUpPassword.length < 6) {
      setErrorMessage("Password must be at least 6 characters.");
      return;
    }
    if (signUpPassword !== confirmPassword) {
      setErrorMessage("Passwords do not match.");
      return;
    }

    setIsLoading(true);
    setTimeout(() => {
      setIsLoading(false);
      onLogin({
        name: fullName.trim(),
        email: signUpEmail.trim().toLowerCase(),
        role: selectedRole,
        fleetName: fleetName.trim(),
      });
    }, 600);
  };

  const handleQuickDemo = (role: UserRole = "Fleet Manager") => {
    setErrorMessage(null);
    setIsLoading(true);
    setTimeout(() => {
      setIsLoading(false);
      if (role === "Fleet Manager") {
        onLogin({
          name: "Marcus Vance",
          email: "m.vance@apexlogistics.com",
          role: "Fleet Manager",
          fleetName: "Apex Metro Logistics",
        });
      } else {
        onLogin({
          name: "Elena Rostova",
          email: "e.rostova@apexlogistics.com",
          role: "EV Driver",
          fleetName: "Apex Metro Logistics",
        });
      }
    }, 300);
  };

  return (
    <KeyboardAvoidingView
      style={styles.keyboardContainer}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Brand Header */}
        <View style={styles.brandContainer}>
          <View style={styles.iconCircle}>
            <MaterialCommunityIcons
              name="shield-car"
              size={36}
              color={colors.accentPrimary}
            />
          </View>
          <Text style={styles.brandTitle}>EV Telematics</Text>
          <Text style={styles.brandSubtitle}>
            Range & Route Dispatch Simulator
          </Text>
        </View>

        {/* Tab Switcher */}
        <View style={styles.tabContainer}>
          <TouchableOpacity
            style={[
              styles.tabButton,
              authMode === "signin" && styles.tabButtonActive,
            ]}
            onPress={() => {
              setAuthMode("signin");
              setErrorMessage(null);
            }}
            activeOpacity={0.8}
          >
            <Text
              style={[
                styles.tabText,
                authMode === "signin" && styles.tabTextActive,
              ]}
            >
              Sign In
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.tabButton,
              authMode === "signup" && styles.tabButtonActive,
            ]}
            onPress={() => {
              setAuthMode("signup");
              setErrorMessage(null);
            }}
            activeOpacity={0.8}
          >
            <Text
              style={[
                styles.tabText,
                authMode === "signup" && styles.tabTextActive,
              ]}
            >
              Create Account
            </Text>
          </TouchableOpacity>
        </View>

        {/* Error Banner */}
        {errorMessage && (
          <View style={styles.errorBox}>
            <MaterialCommunityIcons
              name="alert-circle-outline"
              size={20}
              color={colors.riskDanger}
            />
            <Text style={styles.errorText}>{errorMessage}</Text>
          </View>
        )}

        {/* Form Card */}
        <View style={styles.formCard}>
          {authMode === "signin" ? (
            /* --- SIGN IN FORM --- */
            <View>
              <Text style={styles.inputLabel}>Work Email</Text>
              <View style={styles.inputWrapper}>
                <MaterialCommunityIcons
                  name="email-outline"
                  size={20}
                  color={colors.textSecondary}
                  style={styles.inputIcon}
                />
                <TextInput
                  style={styles.input}
                  placeholder="admin@fleetlogistics.com"
                  placeholderTextColor={colors.textMuted}
                  value={signInEmail}
                  onChangeText={setSignInEmail}
                  autoCapitalize="none"
                  keyboardType="email-address"
                  autoComplete="email"
                />
              </View>

              <Text style={styles.inputLabel}>Password</Text>
              <View style={styles.inputWrapper}>
                <MaterialCommunityIcons
                  name="lock-outline"
                  size={20}
                  color={colors.textSecondary}
                  style={styles.inputIcon}
                />
                <TextInput
                  style={styles.input}
                  placeholder="••••••••••••"
                  placeholderTextColor={colors.textMuted}
                  value={signInPassword}
                  onChangeText={setSignInPassword}
                  secureTextEntry={!showSignInPassword}
                />
                <TouchableOpacity
                  onPress={() => setShowSignInPassword(!showSignInPassword)}
                  style={styles.eyeIcon}
                >
                  <MaterialCommunityIcons
                    name={showSignInPassword ? "eye-off-outline" : "eye-outline"}
                    size={20}
                    color={colors.textSecondary}
                  />
                </TouchableOpacity>
              </View>

              <TouchableOpacity
                style={[styles.primaryButton, isLoading && styles.buttonDisabled]}
                onPress={handleSignIn}
                disabled={isLoading}
                activeOpacity={0.8}
              >
                {isLoading ? (
                  <ActivityIndicator color="#0D0D0D" size="small" />
                ) : (
                  <>
                    <MaterialCommunityIcons
                      name="login"
                      size={20}
                      color="#0D0D0D"
                      style={{ marginRight: 8 }}
                    />
                    <Text style={styles.primaryButtonText}>Sign In to Fleet</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          ) : (
            /* --- SIGN UP FORM --- */
            <View>
              <Text style={styles.inputLabel}>Full Name</Text>
              <View style={styles.inputWrapper}>
                <MaterialCommunityIcons
                  name="account-outline"
                  size={20}
                  color={colors.textSecondary}
                  style={styles.inputIcon}
                />
                <TextInput
                  style={styles.input}
                  placeholder="Alex Mercer"
                  placeholderTextColor={colors.textMuted}
                  value={fullName}
                  onChangeText={setFullName}
                  autoCapitalize="words"
                />
              </View>

              <Text style={styles.inputLabel}>Fleet / Organization</Text>
              <View style={styles.inputWrapper}>
                <MaterialCommunityIcons
                  name="domain"
                  size={20}
                  color={colors.textSecondary}
                  style={styles.inputIcon}
                />
                <TextInput
                  style={styles.input}
                  placeholder="Pacific Express Freight"
                  placeholderTextColor={colors.textMuted}
                  value={fleetName}
                  onChangeText={setFleetName}
                />
              </View>

              <Text style={styles.inputLabel}>Role</Text>
              <View style={styles.rolesRow}>
                {roles.map((r) => {
                  const isSelected = selectedRole === r;
                  return (
                    <TouchableOpacity
                      key={r}
                      style={[
                        styles.roleChip,
                        isSelected && styles.roleChipSelected,
                      ]}
                      onPress={() => setSelectedRole(r)}
                      activeOpacity={0.7}
                    >
                      <Text
                        style={[
                          styles.roleChipText,
                          isSelected && styles.roleChipTextSelected,
                        ]}
                      >
                        {r}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              <Text style={styles.inputLabel}>Work Email</Text>
              <View style={styles.inputWrapper}>
                <MaterialCommunityIcons
                  name="email-outline"
                  size={20}
                  color={colors.textSecondary}
                  style={styles.inputIcon}
                />
                <TextInput
                  style={styles.input}
                  placeholder="a.mercer@organization.com"
                  placeholderTextColor={colors.textMuted}
                  value={signUpEmail}
                  onChangeText={setSignUpEmail}
                  autoCapitalize="none"
                  keyboardType="email-address"
                />
              </View>

              <Text style={styles.inputLabel}>Password</Text>
              <View style={styles.inputWrapper}>
                <MaterialCommunityIcons
                  name="lock-outline"
                  size={20}
                  color={colors.textSecondary}
                  style={styles.inputIcon}
                />
                <TextInput
                  style={styles.input}
                  placeholder="Min. 6 characters"
                  placeholderTextColor={colors.textMuted}
                  value={signUpPassword}
                  onChangeText={setSignUpPassword}
                  secureTextEntry={!showSignUpPassword}
                />
                <TouchableOpacity
                  onPress={() => setShowSignUpPassword(!showSignUpPassword)}
                  style={styles.eyeIcon}
                >
                  <MaterialCommunityIcons
                    name={showSignUpPassword ? "eye-off-outline" : "eye-outline"}
                    size={20}
                    color={colors.textSecondary}
                  />
                </TouchableOpacity>
              </View>

              <Text style={styles.inputLabel}>Confirm Password</Text>
              <View style={styles.inputWrapper}>
                <MaterialCommunityIcons
                  name="lock-check-outline"
                  size={20}
                  color={colors.textSecondary}
                  style={styles.inputIcon}
                />
                <TextInput
                  style={styles.input}
                  placeholder="Re-enter password"
                  placeholderTextColor={colors.textMuted}
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  secureTextEntry={!showConfirmPassword}
                />
                <TouchableOpacity
                  onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                  style={styles.eyeIcon}
                >
                  <MaterialCommunityIcons
                    name={showConfirmPassword ? "eye-off-outline" : "eye-outline"}
                    size={20}
                    color={colors.textSecondary}
                  />
                </TouchableOpacity>
              </View>

              <TouchableOpacity
                style={[styles.primaryButton, isLoading && styles.buttonDisabled]}
                onPress={handleSignUp}
                disabled={isLoading}
                activeOpacity={0.8}
              >
                {isLoading ? (
                  <ActivityIndicator color="#0D0D0D" size="small" />
                ) : (
                  <>
                    <MaterialCommunityIcons
                      name="account-plus-outline"
                      size={20}
                      color="#0D0D0D"
                      style={{ marginRight: 8 }}
                    />
                    <Text style={styles.primaryButtonText}>
                      Create Fleet Account
                    </Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          )}

          {/* Divider */}
          <View style={styles.dividerRow}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>QUICK ACCESS</Text>
            <View style={styles.dividerLine} />
          </View>

          {/* Demo Quick Access */}
          <TouchableOpacity
            style={styles.demoButton}
            onPress={() => handleQuickDemo("Fleet Manager")}
            disabled={isLoading}
            activeOpacity={0.7}
          >
            <MaterialCommunityIcons
              name="shield-account-outline"
              size={18}
              color={colors.accentPrimary}
              style={{ marginRight: 8 }}
            />
            <Text style={styles.demoButtonText}>
              1-Tap Demo: Sign In as Fleet Manager
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.demoButton, { marginTop: 8 }]}
            onPress={() => handleQuickDemo("EV Driver")}
            disabled={isLoading}
            activeOpacity={0.7}
          >
            <MaterialCommunityIcons
              name="steering"
              size={18}
              color={colors.info}
              style={{ marginRight: 8 }}
            />
            <Text style={[styles.demoButtonText, { color: colors.info }]}>
              1-Tap Demo: Sign In as EV Driver
            </Text>
          </TouchableOpacity>
        </View>

        {/* Footer Note */}
        <View style={styles.footerNote}>
          <Text style={styles.footerNoteText}>
            Secured Fleet Gateway • ISO 27001 & SOC-2 Compliant
          </Text>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  keyboardContainer: {
    flex: 1,
    backgroundColor: colors.bgBase,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 28,
    paddingBottom: 40,
  },
  brandContainer: {
    alignItems: "center",
    marginBottom: 24,
  },
  iconCircle: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: colors.accentPrimarySubtle,
    borderWidth: 2,
    borderColor: colors.accentPrimary,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  brandTitle: {
    fontSize: 24,
    fontWeight: "800",
    color: colors.textPrimary,
    letterSpacing: 0.5,
  },
  brandSubtitle: {
    fontSize: 13,
    color: colors.textSecondary,
    marginTop: 4,
    textAlign: "center",
  },
  tabContainer: {
    flexDirection: "row",
    backgroundColor: colors.bgSurface,
    borderRadius: 12,
    padding: 4,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: colors.border,
  },
  tabButton: {
    flex: 1,
    paddingVertical: 10,
    alignItems: "center",
    borderRadius: 8,
  },
  tabButtonActive: {
    backgroundColor: colors.accentPrimarySubtle,
    borderWidth: 1,
    borderColor: colors.accentPrimary,
  },
  tabText: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.textMuted,
  },
  tabTextActive: {
    color: colors.accentPrimary,
    fontWeight: "700",
  },
  errorBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.errorBg,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.riskDanger,
    marginBottom: 16,
  },
  errorText: {
    fontSize: 13,
    color: colors.errorText,
    marginLeft: 8,
    flex: 1,
  },
  formCard: {
    backgroundColor: colors.bgSurface,
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: colors.border,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: colors.textSecondary,
    marginBottom: 6,
    marginTop: 10,
  },
  inputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.bgSurfaceAlt,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    paddingHorizontal: 12,
  },
  inputIcon: {
    marginRight: 8,
  },
  input: {
    flex: 1,
    height: 46,
    color: colors.textPrimary,
    fontSize: 14,
  },
  eyeIcon: {
    padding: 6,
  },
  rolesRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 4,
  },
  roleChip: {
    flex: 1,
    paddingVertical: 8,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.bgSurfaceAlt,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
  },
  roleChipSelected: {
    backgroundColor: colors.badgeBg,
    borderColor: colors.accentPrimary,
  },
  roleChipText: {
    fontSize: 11,
    fontWeight: "600",
    color: colors.textSecondary,
  },
  roleChipTextSelected: {
    color: colors.accentPrimary,
  },
  primaryButton: {
    backgroundColor: colors.accentPrimary,
    borderRadius: 10,
    height: 48,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 20,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  primaryButtonText: {
    color: "#0D0D0D",
    fontSize: 15,
    fontWeight: "700",
  },
  dividerRow: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: 20,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: colors.border,
  },
  dividerText: {
    fontSize: 10,
    color: colors.textMuted,
    marginHorizontal: 12,
    letterSpacing: 1,
    fontWeight: "700",
  },
  demoButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.bgSurfaceAlt,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    paddingVertical: 12,
  },
  demoButtonText: {
    color: colors.accentPrimary,
    fontSize: 13,
    fontWeight: "600",
  },
  footerNote: {
    marginTop: 24,
    alignItems: "center",
  },
  footerNoteText: {
    fontSize: 11,
    color: colors.textMuted,
  },
});
