import React from "react";
import {
  View,
  Text,
  StyleSheet,
  Modal,
  Pressable,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme, radius } from "@/theme";
import { useI18n, type Language } from "@/i18n";

export function LanguageSelectModal({
  visible,
  onClose,
  title,
  subtitle,
}: {
  visible: boolean;
  onClose: () => void;
  title?: string;
  subtitle?: string;
}) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { lang, setLang, languages, t } = useI18n();

  const handleSelect = async (code: Language) => {
    await setLang(code);
    onClose();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <Pressable style={styles.overlay} onPress={onClose}>
        <Pressable
          style={[
            styles.sheet,
            {
              backgroundColor: colors.card,
              paddingBottom: insets.bottom + 20,
            },
          ]}
          onPress={(e) => e.stopPropagation()}
        >
          {/* Top handle bar */}
          <View style={styles.handleWrap}>
            <View style={[styles.handle, { backgroundColor: colors.line }]} />
          </View>

          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerTitleRow}>
              <View style={[styles.iconBox, { backgroundColor: colors.brand + "22" }]}>
                <Ionicons name="globe-outline" size={22} color={colors.brandDark} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.title, { color: colors.ink }]}>
                  {title || t("lang.chooseLanguage")}
                </Text>
                <Text style={[styles.subtitle, { color: colors.inkMuted }]}>
                  {subtitle || t("lang.selectPrompt")}
                </Text>
              </View>
            </View>
            <Pressable onPress={onClose} hitSlop={10} style={styles.closeBtn}>
              <Ionicons name="close-circle" size={26} color={colors.inkMuted} />
            </Pressable>
          </View>

          {/* Languages list */}
          <View style={styles.list}>
            {languages.map((item) => {
              const selected = item.code === lang;
              return (
                <Pressable
                  key={item.code}
                  onPress={() => handleSelect(item.code)}
                  style={[
                    styles.item,
                    {
                      backgroundColor: selected ? colors.brand + "18" : colors.cardAlt,
                      borderColor: selected ? colors.brand : colors.line,
                    },
                  ]}
                >
                  <View style={styles.itemLeft}>
                    <Text style={styles.flag}>{item.flag}</Text>
                    <View>
                      <Text
                        style={[
                          styles.itemLabel,
                          {
                            color: selected ? colors.ink : colors.ink,
                            fontWeight: selected ? "900" : "700",
                          },
                        ]}
                      >
                        {item.nativeLabel}
                      </Text>
                      <Text style={[styles.itemSub, { color: colors.inkMuted }]}>
                        {item.label !== item.nativeLabel ? item.label : item.short}
                      </Text>
                    </View>
                  </View>

                  <View
                    style={[
                      styles.radio,
                      {
                        borderColor: selected ? colors.brand : colors.line,
                        backgroundColor: selected ? colors.brand : "transparent",
                      },
                    ]}
                  >
                    {selected ? (
                      <Ionicons name="checkmark" size={14} color="#0F1216" />
                    ) : null}
                  </View>
                </Pressable>
              );
            })}
          </View>

          <Text style={[styles.notice, { color: colors.inkMuted }]}>
            {t("lang.selectDesc")}
          </Text>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

/**
 * Loginda yoki Headerda turadigan ixcham UZ | RU | EN segmented switcher
 */
export function LanguageSwitchPill({
  style,
}: {
  style?: any;
}) {
  const { colors } = useTheme();
  const { lang, setLang, languages } = useI18n();

  return (
    <View
      style={[
        styles.pillContainer,
        { backgroundColor: colors.cardAlt, borderColor: colors.line },
        style,
      ]}
    >
      {languages.map((item) => {
        const selected = item.code === lang;
        return (
          <Pressable
            key={item.code}
            onPress={() => setLang(item.code)}
            style={[
              styles.pillButton,
              selected && [
                styles.pillButtonActive,
                { backgroundColor: colors.brand },
              ],
            ]}
          >
            <Text style={styles.pillFlag}>{item.flag}</Text>
            <Text
              style={[
                styles.pillText,
                {
                  color: selected ? "#0F1216" : colors.inkMuted,
                  fontWeight: selected ? "900" : "700",
                },
              ]}
            >
              {item.short}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "flex-end",
  },
  sheet: {
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    paddingHorizontal: 20,
    paddingTop: 10,
  },
  handleWrap: {
    alignItems: "center",
    paddingVertical: 8,
  },
  handle: {
    width: 44,
    height: 5,
    borderRadius: 3,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 4,
    marginBottom: 16,
  },
  headerTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    flex: 1,
  },
  iconBox: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    fontSize: 18,
    fontWeight: "900",
  },
  subtitle: {
    fontSize: 12,
    marginTop: 2,
  },
  closeBtn: {
    padding: 4,
  },
  list: {
    gap: 10,
    marginVertical: 6,
  },
  item: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: radius.md,
    borderWidth: 1.5,
  },
  itemLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
  },
  flag: {
    fontSize: 26,
  },
  itemLabel: {
    fontSize: 15,
  },
  itemSub: {
    fontSize: 11,
    marginTop: 1,
  },
  radio: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
  },
  notice: {
    fontSize: 12,
    textAlign: "center",
    marginTop: 14,
    lineHeight: 16,
  },
  pillContainer: {
    flexDirection: "row",
    padding: 3,
    borderRadius: radius.full,
    borderWidth: 1,
    alignSelf: "center",
  },
  pillButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: radius.full,
  },
  pillButtonActive: {
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  pillFlag: {
    fontSize: 13,
  },
  pillText: {
    fontSize: 12,
  },
});
