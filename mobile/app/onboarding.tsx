import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Image,
  Animated,
  Easing,
  useWindowDimensions,
  NativeSyntheticEvent,
  NativeScrollEvent,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "@/theme";
import { shadow } from "@/theme/shadow";
import { useAuth } from "@/store/auth";
import { useI18n, type Language } from "@/i18n";
import { Logo } from "@/components/ui/Header";

interface Slide {
  image: any;
  title: string;
  text: string;
}

/**
 * Har bir til uchun toza mini-bayroqchalar
 */
function CircularFlag({ code }: { code: Language }) {
  if (code === "uz") {
    return (
      <View style={styles.flagCircle}>
        <View style={[styles.flagStrip, { backgroundColor: "#0099B5", height: 6 }]} />
        <View style={[styles.flagStrip, { backgroundColor: "#FFFFFF", height: 5, borderTopWidth: 0.7, borderBottomWidth: 0.7, borderColor: "#CE1126" }]} />
        <View style={[styles.flagStrip, { backgroundColor: "#1EB53A", height: 6 }]} />
      </View>
    );
  }
  if (code === "ru") {
    return (
      <View style={styles.flagCircle}>
        <View style={[styles.flagStrip, { backgroundColor: "#FFFFFF", height: 6 }]} />
        <View style={[styles.flagStrip, { backgroundColor: "#0039A6", height: 5 }]} />
        <View style={[styles.flagStrip, { backgroundColor: "#D52B1E", height: 6 }]} />
      </View>
    );
  }
  return (
    <View style={styles.flagCircle}>
      <Text style={{ fontSize: 14, textAlign: "center", lineHeight: 18 }}>🇬🇧</Text>
    </View>
  );
}

export default function Onboarding() {
  const router = useRouter();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const completeOnboarding = useAuth((s) => s.completeOnboarding);
  const { t, lang, setLang, languages } = useI18n();
  const { width } = useWindowDimensions();

  const scrollRef = useRef<ScrollView>(null);
  const [index, setIndex] = useState(0);
  const [displayIndex, setDisplayIndex] = useState(0);

  // 1. Slayd almashganda rasmni silliq fade & zoom qilish animatsiyasi
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const scaleAnim = useRef(new Animated.Value(1)).current;

  // 2. Rasmning havoda sekin suzib turish (float / breathing) animatsiyasi
  const floatAnim = useRef(new Animated.Value(0)).current;

  const slides: Slide[] = useMemo(
    () => [
      {
        image: require("@/assets/onboarding_globe.jpg"),
        title: t("onboarding.slide1Title"),
        text: t("onboarding.slide1Text"),
      },
      {
        image: require("@/assets/onboarding_prices.jpg"),
        title: t("onboarding.slide2Title"),
        text: t("onboarding.slide2Text"),
      },
      {
        image: require("@/assets/onboarding_savings.jpg"), // Yangilangan toza tejamkorlik rasmi (skidkasiz)
        title: t("onboarding.slide3Title"),
        text: t("onboarding.slide3Text"),
      },
      {
        image: require("@/assets/onboarding_ready.jpg"),
        title: t("onboarding.slide4Title"),
        text: t("onboarding.slide4Text"),
      },
    ],
    [t]
  );

  // Floating animatsiyasini ishga tushirish
  useEffect(() => {
    const floatLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(floatAnim, {
          toValue: -5,
          duration: 1800,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(floatAnim, {
          toValue: 5,
          duration: 1800,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ])
    );
    floatLoop.start();
    return () => floatLoop.stop();
  }, [floatAnim]);

  // Index o'zgarganda rasmni silliq almashtirish animatsiyasi
  useEffect(() => {
    if (index === displayIndex) return;

    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 140,
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnim, {
        toValue: 0.9,
        duration: 140,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setDisplayIndex(index);
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 220,
          useNativeDriver: true,
        }),
        Animated.spring(scaleAnim, {
          toValue: 1,
          friction: 6,
          tension: 40,
          useNativeDriver: true,
        }),
      ]).start();
    });
  }, [index, displayIndex, fadeAnim, scaleAnim]);

  const isLast = index === slides.length - 1;

  const onScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const i = Math.round(e.nativeEvent.contentOffset.x / width);
    if (i !== index && i >= 0 && i < slides.length) {
      setIndex(i);
    }
  };

  const finish = async () => {
    await completeOnboarding();
    router.replace("/(auth)/login");
  };

  const goToSlide = (targetIndex: number) => {
    scrollRef.current?.scrollTo({ x: width * targetIndex, animated: true });
    setIndex(targetIndex);
  };

  const next = () => {
    if (isLast) {
      finish();
      return;
    }
    goToSlide(index + 1);
  };

  const currentSlide = slides[displayIndex] || slides[0];

  return (
    <View style={[styles.flex, { backgroundColor: "#FFFFFF" }]}>
      {/* 1. Tepa qism: Logo + O'tkazib yuborish */}
      <View style={[styles.topBar, { paddingTop: insets.top + 8 }]}>
        <Logo size={28} />
        {!isLast ? (
          <Pressable onPress={finish} hitSlop={12} style={styles.skipBtn}>
            <Text style={styles.skipText}>{t("onboarding.skip")}</Text>
          </Pressable>
        ) : (
          <View style={{ width: 40 }} />
        )}
      </View>

      {/* 2. Markaziy qism: Rasm, Til tanlash, Slayd matnlari va Dots (ekranning qoq o'rtasida) */}
      <View style={styles.contentWrap}>
        {/* Animatsiyali 3D Rasm */}
        <Animated.View
          style={[
            styles.globeSection,
            {
              opacity: fadeAnim,
              transform: [{ translateY: floatAnim }, { scale: scaleAnim }],
            },
          ]}
        >
          <View style={styles.globeAura}>
            <Image
              source={currentSlide.image}
              style={styles.globeImage}
              resizeMode="cover"
            />
          </View>
        </Animated.View>

        {/* Til tanlash tugmalari — faqat 1-slaydda ko'rinadi */}
        {index === 0 ? (
          <View style={styles.langRow}>
            {languages.map((item) => {
              const selected = item.code === lang;
              return (
                <Pressable
                  key={item.code}
                  onPress={() => setLang(item.code)}
                  style={({ pressed }) => [
                    styles.langPill,
                    selected ? styles.langPillActive : styles.langPillInactive,
                    pressed && { opacity: 0.8 },
                  ]}
                >
                  <CircularFlag code={item.code} />
                  <Text
                    style={[
                      styles.langLabel,
                      selected ? styles.langLabelActive : styles.langLabelInactive,
                    ]}
                  >
                    {item.nativeLabel}
                  </Text>
                  {selected ? (
                    <Ionicons
                      name="checkmark"
                      size={15}
                      color="#BA8504"
                      style={styles.checkIcon}
                    />
                  ) : null}
                </Pressable>
              );
            })}
          </View>
        ) : (
          <View style={styles.langPlaceholder} />
        )}

        {/* Slayd matnlari (Gorizontal suriluvchi) */}
        <View style={styles.sliderContainer}>
          <ScrollView
            ref={scrollRef}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            onMomentumScrollEnd={onScroll}
            scrollEventThrottle={16}
            style={styles.flex}
          >
            {slides.map((s, i) => (
              <View key={i} style={[styles.slide, { width }]}>
                <Text style={styles.title}>{s.title}</Text>
                <Text style={styles.description}>{s.text}</Text>
              </View>
            ))}
          </ScrollView>
        </View>

        {/* Pagination indikatorlari */}
        <View style={styles.dotsRow}>
          {slides.map((_, i) => {
            const isActive = i === index;
            return (
              <Pressable
                key={i}
                onPress={() => goToSlide(i)}
                hitSlop={8}
                style={[
                  styles.dot,
                  isActive ? styles.dotActive : styles.dotInactive,
                ]}
              />
            );
          })}
        </View>
      </View>

      {/* 3. Pastki qism: "Keyingisi" tugmasi pastda mustahkam turadi */}
      <View style={[styles.bottomSection, { paddingBottom: Math.max(insets.bottom, 16) + 12 }]}>
        <Pressable
          onPress={next}
          style={({ pressed }) => [
            styles.ctaButton,
            pressed && { opacity: 0.9, transform: [{ scale: 0.99 }] },
          ]}
        >
          <Ionicons
            name={isLast ? "checkmark" : "arrow-forward"}
            size={19}
            color="#FFFFFF"
          />
          <Text style={styles.ctaText}>
            {isLast ? t("onboarding.start") : t("onboarding.next")}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingBottom: 6,
  },
  skipBtn: {
    paddingVertical: 6,
    paddingHorizontal: 8,
  },
  skipText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#5C6772",
  },
  contentWrap: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    width: "100%",
  },
  globeSection: {
    alignItems: "center",
    justifyContent: "center",
    marginTop: 4,
    marginBottom: 16,
  },
  globeAura: {
    width: 216,
    height: 216,
    borderRadius: 108,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFF9EA",
    borderWidth: 3,
    borderColor: "#FFFFFF",
    ...shadow({ color: "#BA8504", opacity: 0.24, radius: 16, offsetY: 6 }),
    elevation: 7,
  },
  globeImage: {
    width: 210,
    height: 210,
    borderRadius: 105,
  },
  langRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  langPlaceholder: {
    height: 16,
  },
  langPill: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 22,
  },
  langPillActive: {
    backgroundColor: "#FDF8E8",
    borderWidth: 1.5,
    borderColor: "#BA8504",
  },
  langPillInactive: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E5E8EC",
  },
  flagCircle: {
    width: 18,
    height: 18,
    borderRadius: 9,
    overflow: "hidden",
    justifyContent: "center",
    marginRight: 6,
  },
  flagStrip: {
    width: "100%",
  },
  langLabel: {
    fontSize: 13.5,
    letterSpacing: 0.1,
  },
  langLabelActive: {
    color: "#0F1216",
    fontWeight: "700",
  },
  langLabelInactive: {
    color: "#5C6772",
    fontWeight: "600",
  },
  checkIcon: {
    marginLeft: 5,
  },
  sliderContainer: {
    height: 120,
    width: "100%",
    justifyContent: "center",
  },
  slide: {
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 26,
  },
  title: {
    fontSize: 23,
    fontWeight: "800",
    color: "#0F1216",
    textAlign: "center",
    marginBottom: 10,
    letterSpacing: -0.3,
  },
  description: {
    fontSize: 14.5,
    lineHeight: 22,
    color: "#5C6772",
    textAlign: "center",
    maxWidth: 340,
  },
  dotsRow: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 6,
    marginVertical: 14,
  },
  dot: {
    height: 6,
    borderRadius: 3,
  },
  dotActive: {
    width: 22,
    backgroundColor: "#BA8504",
  },
  dotInactive: {
    width: 6,
    backgroundColor: "#D9DDE2",
  },
  bottomSection: {
    width: "100%",
    paddingHorizontal: 20,
    paddingTop: 8,
  },
  ctaButton: {
    backgroundColor: "#BA8504",
    height: 52,
    borderRadius: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    ...shadow({ color: "#BA8504", opacity: 0.28, radius: 10, offsetY: 4 }),
    elevation: 4,
  },
  ctaText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700",
  },
});
