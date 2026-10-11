import React, { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as ImagePicker from 'expo-image-picker';

const STORAGE_KEY = 'motivationGoals.state.v1';

const COLORS = {
  bg: '#070A0F',
  panel: '#101620',
  panel2: '#151D29',
  border: '#222D3C',
  text: '#F4F7FB',
  muted: '#8490A3',
  gold: '#D7AE55',
  goldSoft: '#8B6F35',
  blue: '#5D83FF',
  green: '#38C982',
  red: '#FF6670',
};

const DEFAULT_GOALS = [
  ['eval', 'Eval zdany'],
  ['funded', 'Funded konto'],
  ['payout', 'Pierwszy payout'],
  ['1k', '$1k miesięcznie'],
  ['10k', '$10k miesięcznie'],
  ['six', 'Six figures'],
  ['mom', 'Mama na emeryturze'],
  ['m4', 'BMW M4'],
].map(([id, label]) => ({ id, label, done: false }));

const QUOTES = [
  'Nie potrzebujesz idealnego dnia. Potrzebujesz konsekwentnego procesu.',
  'Rynek nie płaci za emocje. Płaci za egzekucję.',
  'Jedna dobra decyzja nie buduje kariery. Tysiąc powtarzalnych decyzji — tak.',
  'Dyscyplina jest przewagą wtedy, gdy nikt jej nie widzi.',
  'Nie ścigaj pieniędzy. Ścigaj jakość wykonania.',
  'Najlepszy trade to czasem ten, którego nie wziąłeś.',
  'Twoim zadaniem nie jest przewidzieć rynek. Twoim zadaniem jest wykonać plan.',
  'Małe przewagi, powtarzane wystarczająco długo, zmieniają wszystko.',
  'Kapitał rośnie wolniej niż ego chce — i szybciej niż brak dyscypliny pozwala.',
  'Zysk jest efektem procesu. Proces jest pod twoją kontrolą.',
  'Nie oceniaj dnia po P&L. Oceń go po jakości decyzji.',
  'Cierpliwość przed wejściem jest częścią setupu.',
  'Profesjonalizm zaczyna się wtedy, gdy przestajesz negocjować z własnymi zasadami.',
  'Nie musisz wygrać dzisiaj. Musisz zostać w grze wystarczająco długo.',
  'Największy edge często wygląda jak nuda: czekanie, selekcja i brak FOMO.',
  'Każdy dzień zgodny z planem to głos oddany na tradera, którym chcesz zostać.',
  'Strata zgodna z planem jest tańsza niż zysk zbudowany na złym nawyku.',
  'Twoja przyszłość nie potrzebuje motywacji co godzinę. Potrzebuje systemu.',
  'Nie porównuj swojego rozdziału pierwszego do czyjegoś rozdziału dziesiątego.',
  'Cel jest duży. Dzisiejsze zadanie ma być proste.',
];

const INITIAL_STATE = {
  startDate: '2026-02-01',
  goals: DEFAULT_GOALS,
  whyText: 'Buduję wolność, niezależność i życie, w którym mogę zadbać o rodzinę. Każdy dzień procesu ma znaczenie.',
  whyImage: null,
  checkins: {},
};

function localDateKey(date = new Date()) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function fromDateKey(key) {
  const [y, m, d] = String(key).split('-').map(Number);
  return new Date(y, (m || 1) - 1, d || 1);
}

function addDays(date, amount) {
  const next = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  next.setDate(next.getDate() + amount);
  return next;
}

function daysBetweenInclusive(startKey, end = new Date()) {
  const [y, m, d] = String(startKey).split('-').map(Number);
  if (!y || !m || !d) return 0;
  const startUtc = Date.UTC(y, m - 1, d);
  const endUtc = Date.UTC(end.getFullYear(), end.getMonth(), end.getDate());
  return Math.max(0, Math.floor((endUtc - startUtc) / 86400000) + 1);
}

function currentStreak(checkins) {
  const today = new Date();
  let cursor = checkins[localDateKey(today)] ? today : addDays(today, -1);
  let streak = 0;
  for (let guard = 0; guard < 5000; guard += 1) {
    if (!checkins[localDateKey(cursor)]) break;
    streak += 1;
    cursor = addDays(cursor, -1);
  }
  return streak;
}

function quoteForToday() {
  const now = new Date();
  const start = new Date(now.getFullYear(), 0, 0);
  const dayOfYear = Math.floor((now - start) / 86400000);
  const index = (now.getFullYear() * 397 + dayOfYear * 17) % QUOTES.length;
  return QUOTES[index];
}

function formatPolishDate(date) {
  return new Intl.DateTimeFormat('pl-PL', {
    day: '2-digit',
    month: 'short',
  }).format(date);
}

function dayShort(date) {
  return new Intl.DateTimeFormat('pl-PL', { weekday: 'short' })
    .format(date)
    .replace('.', '')
    .slice(0, 2)
    .toUpperCase();
}

export default function App() {
  const [data, setData] = useState(INITIAL_STATE);
  const [loaded, setLoaded] = useState(false);
  const [tab, setTab] = useState('home');

  useEffect(() => {
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(STORAGE_KEY);
        if (raw) {
          const parsed = JSON.parse(raw);
          setData({
            ...INITIAL_STATE,
            ...parsed,
            goals: DEFAULT_GOALS.map((goal) => {
              const saved = parsed.goals?.find((item) => item.id === goal.id);
              return saved ? { ...goal, done: Boolean(saved.done) } : goal;
            }),
            checkins: parsed.checkins || {},
          });
        }
      } catch (error) {
        console.warn('Nie udało się wczytać danych', error);
      } finally {
        setLoaded(true);
      }
    })();
  }, []);

  useEffect(() => {
    if (!loaded) return;
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(data)).catch(() => {});
  }, [data, loaded]);

  const daysInGame = useMemo(() => daysBetweenInclusive(data.startDate), [data.startDate]);
  const streak = useMemo(() => currentStreak(data.checkins), [data.checkins]);
  const doneGoals = data.goals.filter((goal) => goal.done).length;
  const progress = data.goals.length ? doneGoals / data.goals.length : 0;
  const todayKey = localDateKey();

  const toggleGoal = (id) => {
    setData((current) => ({
      ...current,
      goals: current.goals.map((goal) => goal.id === id ? { ...goal, done: !goal.done } : goal),
    }));
  };

  const toggleCheckin = (key) => {
    setData((current) => ({
      ...current,
      checkins: {
        ...current.checkins,
        [key]: !current.checkins[key],
      },
    }));
  };

  const pickWhyImage = async () => {
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        Alert.alert('Brak dostępu', 'Zezwól aplikacji na dostęp do zdjęć, aby ustawić obraz.');
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.55,
        base64: true,
      });
      if (!result.canceled && result.assets?.[0]?.base64) {
        const asset = result.assets[0];
        const type = asset.mimeType || 'image/jpeg';
        setData((current) => ({
          ...current,
          whyImage: `data:${type};base64,${asset.base64}`,
        }));
      }
    } catch (error) {
      Alert.alert('Błąd', 'Nie udało się wczytać zdjęcia.');
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.bg} />
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.app}>
          <View style={styles.header}>
            <View>
              <Text style={styles.eyebrow}>TRADER JOURNEY</Text>
              <Text style={styles.brand}>Motivation & Goals</Text>
            </View>
            <View style={styles.headerDot} />
          </View>

          <ScrollView
            style={styles.flex}
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {tab === 'home' && (
              <HomeScreen
                daysInGame={daysInGame}
                streak={streak}
                progress={progress}
                doneGoals={doneGoals}
                totalGoals={data.goals.length}
                todayDone={Boolean(data.checkins[todayKey])}
                toggleToday={() => toggleCheckin(todayKey)}
                quote={quoteForToday()}
                startDate={data.startDate}
              />
            )}

            {tab === 'goals' && (
              <GoalsScreen
                goals={data.goals}
                doneGoals={doneGoals}
                progress={progress}
                onToggle={toggleGoal}
              />
            )}

            {tab === 'why' && (
              <WhyScreen
                whyText={data.whyText}
                whyImage={data.whyImage}
                startDate={data.startDate}
                setWhyText={(whyText) => setData((current) => ({ ...current, whyText }))}
                setStartDate={(startDate) => setData((current) => ({ ...current, startDate }))}
                pickImage={pickWhyImage}
                removeImage={() => setData((current) => ({ ...current, whyImage: null }))}
              />
            )}

            {tab === 'streak' && (
              <StreakScreen
                streak={streak}
                checkins={data.checkins}
                onToggle={toggleCheckin}
              />
            )}
          </ScrollView>

          <BottomNav tab={tab} setTab={setTab} />
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function HomeScreen({ daysInGame, streak, progress, doneGoals, totalGoals, todayDone, toggleToday, quote, startDate }) {
  return (
    <View style={styles.stack}>
      <View style={[styles.card, styles.heroCard]}>
        <Text style={styles.heroLabel}>DNI W GRZE</Text>
        <Text style={styles.heroNumber}>{daysInGame}</Text>
        <Text style={styles.heroSub}>od {startDate}</Text>
        <View style={styles.goldLine} />
        <Text style={styles.heroFooter}>Nie licz dni. Spraw, żeby dni się liczyły.</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardKicker}>DZISIEJSZA MYŚL</Text>
        <Text style={styles.quote}>“{quote}”</Text>
        <Text style={styles.quoteMeta}>Nowy cytat każdego dnia</Text>
      </View>

      <View style={styles.twoColumns}>
        <View style={[styles.card, styles.halfCard]}>
          <Text style={styles.cardKicker}>CELE</Text>
          <Text style={styles.metricLarge}>{doneGoals}/{totalGoals}</Text>
          <Text style={styles.muted}>ukończonych etapów</Text>
          <ProgressBar value={progress} />
        </View>
        <View style={[styles.card, styles.halfCard]}>
          <Text style={styles.cardKicker}>STREAK</Text>
          <Text style={styles.metricLarge}>{streak}</Text>
          <Text style={styles.muted}>dni z zasadami</Text>
          <View style={styles.streakAccent} />
        </View>
      </View>

      <Pressable
        onPress={toggleToday}
        style={({ pressed }) => [
          styles.todayButton,
          todayDone && styles.todayButtonDone,
          pressed && styles.pressed,
        ]}
      >
        <View style={[styles.checkCircle, todayDone && styles.checkCircleDone]}>
          <Text style={styles.checkMark}>{todayDone ? '✓' : ''}</Text>
        </View>
        <View style={styles.flex}>
          <Text style={styles.todayButtonTitle}>{todayDone ? 'Dzisiaj zasady trzymane' : 'Dzisiaj trzymałem zasady'}</Text>
          <Text style={styles.todayButtonSub}>{todayDone ? 'Dobry proces. Zapisane.' : 'Kliknij, gdy dzień był zgodny z planem.'}</Text>
        </View>
      </Pressable>
    </View>
  );
}

function GoalsScreen({ goals, doneGoals, progress, onToggle }) {
  return (
    <View style={styles.stack}>
      <View style={styles.screenTitleWrap}>
        <Text style={styles.screenKicker}>ROADMAP</Text>
        <Text style={styles.screenTitle}>Twoje etapy</Text>
        <Text style={styles.screenSubtitle}>{doneGoals} z {goals.length} celów ukończonych</Text>
      </View>

      <View style={styles.card}>
        <View style={styles.progressHeader}>
          <Text style={styles.progressPercent}>{Math.round(progress * 100)}%</Text>
          <Text style={styles.muted}>całej drogi</Text>
        </View>
        <ProgressBar value={progress} large />
      </View>

      <View style={styles.goalsList}>
        {goals.map((goal, index) => (
          <Pressable
            key={goal.id}
            onPress={() => onToggle(goal.id)}
            style={({ pressed }) => [styles.goalRow, goal.done && styles.goalRowDone, pressed && styles.pressed]}
          >
            <Text style={styles.goalIndex}>{String(index + 1).padStart(2, '0')}</Text>
            <View style={styles.flex}>
              <Text style={[styles.goalText, goal.done && styles.goalTextDone]}>{goal.label}</Text>
              <Text style={styles.goalStatus}>{goal.done ? 'ETAP ZALICZONY' : 'PRZED TOBĄ'}</Text>
            </View>
            <View style={[styles.goalCheck, goal.done && styles.goalCheckDone]}>
              <Text style={styles.goalCheckText}>{goal.done ? '✓' : ''}</Text>
            </View>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

function WhyScreen({ whyText, whyImage, startDate, setWhyText, setStartDate, pickImage, removeImage }) {
  return (
    <View style={styles.stack}>
      <View style={styles.screenTitleWrap}>
        <Text style={styles.screenKicker}>FUNDAMENT</Text>
        <Text style={styles.screenTitle}>Moje dlaczego</Text>
        <Text style={styles.screenSubtitle}>Wróć tutaj, gdy motywacja spadnie.</Text>
      </View>

      <View style={styles.whyImageCard}>
        {whyImage ? (
          <Image source={{ uri: whyImage }} style={styles.whyImage} resizeMode="cover" />
        ) : (
          <View style={styles.imagePlaceholder}>
            <Text style={styles.imagePlaceholderSymbol}>◎</Text>
            <Text style={styles.imagePlaceholderTitle}>Dodaj zdjęcie</Text>
            <Text style={styles.imagePlaceholderSub}>Rodzina, cel, auto, miejsce — coś, co przypomina po co to robisz.</Text>
          </View>
        )}
        <View style={styles.imageActions}>
          <Pressable onPress={pickImage} style={styles.secondaryButton}>
            <Text style={styles.secondaryButtonText}>{whyImage ? 'Zmień zdjęcie' : 'Wybierz zdjęcie'}</Text>
          </Pressable>
          {whyImage && (
            <Pressable onPress={removeImage} style={styles.dangerGhostButton}>
              <Text style={styles.dangerGhostText}>Usuń</Text>
            </Pressable>
          )}
        </View>
      </View>

      <View style={styles.card}>
        <Text style={styles.inputLabel}>MOJE DLACZEGO</Text>
        <TextInput
          value={whyText}
          onChangeText={setWhyText}
          multiline
          maxLength={1800}
          placeholder="Napisz, po co to robisz..."
          placeholderTextColor="#5D6878"
          style={styles.whyInput}
          textAlignVertical="top"
        />
        <Text style={styles.inputHint}>Zapisuje się automatycznie.</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.inputLabel}>DATA STARTU</Text>
        <Text style={styles.muted}>Domyślnie ustawiona na początek lutego 2026. Format: RRRR-MM-DD.</Text>
        <TextInput
          value={startDate}
          onChangeText={setStartDate}
          placeholder="2026-02-01"
          placeholderTextColor="#5D6878"
          style={styles.dateInput}
          autoCapitalize="none"
          keyboardType="numbers-and-punctuation"
          maxLength={10}
        />
      </View>
    </View>
  );
}

function StreakScreen({ streak, checkins, onToggle }) {
  const days = Array.from({ length: 14 }, (_, index) => addDays(new Date(), index - 13));
  const todayKey = localDateKey();

  return (
    <View style={styles.stack}>
      <View style={styles.screenTitleWrap}>
        <Text style={styles.screenKicker}>DYSCYPLINA</Text>
        <Text style={styles.screenTitle}>Trading rules streak</Text>
        <Text style={styles.screenSubtitle}>Seria mierzy proces, nie wynik finansowy.</Text>
      </View>

      <View style={[styles.card, styles.streakHero]}>
        <Text style={styles.streakHeroNumber}>{streak}</Text>
        <Text style={styles.streakHeroLabel}>DNI Z RZĘDU</Text>
        <Text style={styles.streakHeroText}>Każdy dzień zgodny z zasadami buduje tożsamość profesjonalisty.</Text>
      </View>

      <Pressable
        onPress={() => onToggle(todayKey)}
        style={({ pressed }) => [styles.ruleButton, checkins[todayKey] && styles.ruleButtonActive, pressed && styles.pressed]}
      >
        <Text style={styles.ruleButtonIcon}>{checkins[todayKey] ? '✓' : '○'}</Text>
        <View style={styles.flex}>
          <Text style={styles.ruleButtonTitle}>{checkins[todayKey] ? 'Dzisiaj zaliczone' : 'Zalicz dzisiejszy dzień'}</Text>
          <Text style={styles.ruleButtonSub}>Liczy się trzymanie zasad, nie TP czy SL.</Text>
        </View>
      </Pressable>

      <View style={styles.card}>
        <Text style={styles.cardKicker}>OSTATNIE 14 DNI</Text>
        <Text style={[styles.muted, { marginTop: 6 }]}>Możesz dotknąć wcześniejszego dnia, jeśli chcesz poprawić wpis.</Text>
        <View style={styles.dayGrid}>
          {days.map((date) => {
            const key = localDateKey(date);
            const done = Boolean(checkins[key]);
            return (
              <Pressable
                key={key}
                onPress={() => onToggle(key)}
                style={({ pressed }) => [styles.dayCell, done && styles.dayCellDone, pressed && styles.pressed]}
              >
                <Text style={[styles.dayShort, done && styles.dayTextDone]}>{dayShort(date)}</Text>
                <Text style={[styles.dayNumber, done && styles.dayTextDone]}>{date.getDate()}</Text>
                <Text style={[styles.dayDot, done && styles.dayDotDone]}>{done ? '●' : '·'}</Text>
              </Pressable>
            );
          })}
        </View>
      </View>
    </View>
  );
}

function ProgressBar({ value, large = false }) {
  const percent = `${Math.max(0, Math.min(1, value)) * 100}%`;
  return (
    <View style={[styles.progressTrack, large && styles.progressTrackLarge]}>
      <View style={[styles.progressFill, { width: percent }]} />
    </View>
  );
}

function BottomNav({ tab, setTab }) {
  const items = [
    ['home', 'START', '◆'],
    ['goals', 'CELE', '✓'],
    ['why', 'DLACZEGO', '◎'],
    ['streak', 'STREAK', '↗'],
  ];

  return (
    <View style={styles.bottomNav}>
      {items.map(([id, label, symbol]) => {
        const active = tab === id;
        return (
          <Pressable key={id} onPress={() => setTab(id)} style={styles.navItem}>
            <Text style={[styles.navSymbol, active && styles.navActive]}>{symbol}</Text>
            <Text style={[styles.navLabel, active && styles.navActive]}>{label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  safeArea: { flex: 1, backgroundColor: COLORS.bg },
  app: { flex: 1, backgroundColor: COLORS.bg },
  header: {
    minHeight: 70,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: COLORS.border,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  eyebrow: { color: COLORS.gold, fontSize: 10, fontWeight: '900', letterSpacing: 2.2 },
  brand: { color: COLORS.text, fontSize: 22, fontWeight: '900', letterSpacing: -0.7, marginTop: 3 },
  headerDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: COLORS.gold },
  scrollContent: { padding: 16, paddingBottom: 118 },
  stack: { gap: 12 },
  card: {
    backgroundColor: COLORS.panel,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 20,
    padding: 18,
  },
  heroCard: { paddingVertical: 24, alignItems: 'center' },
  heroLabel: { color: COLORS.gold, fontSize: 11, fontWeight: '900', letterSpacing: 3 },
  heroNumber: { color: COLORS.text, fontSize: 88, fontWeight: '900', letterSpacing: -5, lineHeight: 98, marginTop: 6 },
  heroSub: { color: COLORS.muted, fontSize: 12 },
  goldLine: { height: 2, width: 60, backgroundColor: COLORS.gold, marginVertical: 18 },
  heroFooter: { color: '#B7C0CE', fontSize: 13, fontWeight: '600', textAlign: 'center' },
  cardKicker: { color: COLORS.gold, fontSize: 10, fontWeight: '900', letterSpacing: 1.8 },
  quote: { color: COLORS.text, fontSize: 21, fontWeight: '800', lineHeight: 30, marginTop: 10, letterSpacing: -0.4 },
  quoteMeta: { color: COLORS.muted, fontSize: 11, marginTop: 12 },
  twoColumns: { flexDirection: 'row', gap: 12 },
  halfCard: { flex: 1, minHeight: 154 },
  metricLarge: { color: COLORS.text, fontSize: 38, fontWeight: '900', marginTop: 10, letterSpacing: -1.6 },
  muted: { color: COLORS.muted, fontSize: 12, lineHeight: 18 },
  progressTrack: { height: 6, borderRadius: 99, backgroundColor: '#202938', overflow: 'hidden', marginTop: 14 },
  progressTrackLarge: { height: 10, marginTop: 18 },
  progressFill: { height: '100%', backgroundColor: COLORS.gold, borderRadius: 99 },
  streakAccent: { width: 34, height: 4, borderRadius: 99, backgroundColor: COLORS.blue, marginTop: 15 },
  todayButton: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: COLORS.panel2, borderWidth: 1, borderColor: COLORS.border,
    borderRadius: 18, padding: 16,
  },
  todayButtonDone: { borderColor: '#285F48', backgroundColor: '#0F211B' },
  checkCircle: { width: 34, height: 34, borderRadius: 17, borderWidth: 1.5, borderColor: '#566275', alignItems: 'center', justifyContent: 'center' },
  checkCircleDone: { backgroundColor: COLORS.green, borderColor: COLORS.green },
  checkMark: { color: '#07120D', fontSize: 19, fontWeight: '900' },
  todayButtonTitle: { color: COLORS.text, fontSize: 15, fontWeight: '800' },
  todayButtonSub: { color: COLORS.muted, fontSize: 11, marginTop: 3 },
  pressed: { opacity: 0.72 },

  screenTitleWrap: { marginBottom: 4, paddingHorizontal: 2 },
  screenKicker: { color: COLORS.gold, fontSize: 10, fontWeight: '900', letterSpacing: 2 },
  screenTitle: { color: COLORS.text, fontSize: 31, fontWeight: '900', letterSpacing: -1.2, marginTop: 4 },
  screenSubtitle: { color: COLORS.muted, fontSize: 13, lineHeight: 19, marginTop: 4 },
  progressHeader: { flexDirection: 'row', alignItems: 'baseline', gap: 8 },
  progressPercent: { color: COLORS.text, fontSize: 44, fontWeight: '900', letterSpacing: -2 },
  goalsList: { gap: 9 },
  goalRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: COLORS.panel, borderWidth: 1, borderColor: COLORS.border,
    borderRadius: 17, paddingVertical: 15, paddingHorizontal: 14,
  },
  goalRowDone: { backgroundColor: '#111E1A', borderColor: '#254F3E' },
  goalIndex: { color: '#536073', fontSize: 11, fontWeight: '900', letterSpacing: 1 },
  goalText: { color: COLORS.text, fontSize: 16, fontWeight: '800' },
  goalTextDone: { color: '#B7C9C0' },
  goalStatus: { color: COLORS.muted, fontSize: 9, fontWeight: '800', letterSpacing: 1.2, marginTop: 4 },
  goalCheck: { width: 30, height: 30, borderRadius: 9, borderWidth: 1.5, borderColor: '#475367', alignItems: 'center', justifyContent: 'center' },
  goalCheckDone: { backgroundColor: COLORS.green, borderColor: COLORS.green },
  goalCheckText: { color: '#07120D', fontWeight: '900', fontSize: 16 },

  whyImageCard: { backgroundColor: COLORS.panel, borderWidth: 1, borderColor: COLORS.border, borderRadius: 20, overflow: 'hidden' },
  whyImage: { width: '100%', aspectRatio: 4 / 3 },
  imagePlaceholder: { aspectRatio: 4 / 3, alignItems: 'center', justifyContent: 'center', padding: 28, backgroundColor: '#0D121A' },
  imagePlaceholderSymbol: { color: COLORS.gold, fontSize: 48, marginBottom: 8 },
  imagePlaceholderTitle: { color: COLORS.text, fontSize: 18, fontWeight: '900' },
  imagePlaceholderSub: { color: COLORS.muted, fontSize: 12, lineHeight: 18, textAlign: 'center', marginTop: 7 },
  imageActions: { flexDirection: 'row', gap: 10, padding: 12 },
  secondaryButton: { flex: 1, backgroundColor: '#192232', borderRadius: 13, paddingVertical: 12, alignItems: 'center' },
  secondaryButtonText: { color: COLORS.text, fontWeight: '800', fontSize: 13 },
  dangerGhostButton: { paddingHorizontal: 16, justifyContent: 'center', borderRadius: 13, borderWidth: 1, borderColor: '#503039' },
  dangerGhostText: { color: COLORS.red, fontWeight: '800', fontSize: 13 },
  inputLabel: { color: COLORS.gold, fontSize: 10, fontWeight: '900', letterSpacing: 1.8, marginBottom: 10 },
  whyInput: { minHeight: 150, color: COLORS.text, fontSize: 16, lineHeight: 24, padding: 0 },
  inputHint: { color: COLORS.muted, fontSize: 10, marginTop: 10 },
  dateInput: { marginTop: 12, backgroundColor: '#0A0E15', borderWidth: 1, borderColor: COLORS.border, color: COLORS.text, borderRadius: 12, paddingHorizontal: 13, paddingVertical: 12, fontSize: 15, fontWeight: '700' },

  streakHero: { alignItems: 'center', paddingVertical: 26 },
  streakHeroNumber: { color: COLORS.gold, fontSize: 92, lineHeight: 102, fontWeight: '900', letterSpacing: -5 },
  streakHeroLabel: { color: COLORS.text, fontSize: 12, fontWeight: '900', letterSpacing: 2.8 },
  streakHeroText: { color: COLORS.muted, fontSize: 12, lineHeight: 18, textAlign: 'center', maxWidth: 280, marginTop: 12 },
  ruleButton: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: COLORS.panel2, borderWidth: 1, borderColor: COLORS.border, borderRadius: 18, padding: 16 },
  ruleButtonActive: { backgroundColor: '#0F211B', borderColor: '#285F48' },
  ruleButtonIcon: { color: COLORS.gold, fontSize: 30, width: 34, textAlign: 'center' },
  ruleButtonTitle: { color: COLORS.text, fontSize: 15, fontWeight: '800' },
  ruleButtonSub: { color: COLORS.muted, fontSize: 11, marginTop: 3 },
  dayGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 7, marginTop: 15 },
  dayCell: { width: '13.7%', minWidth: 42, flexGrow: 1, maxWidth: 54, backgroundColor: '#0B1017', borderWidth: 1, borderColor: COLORS.border, borderRadius: 12, alignItems: 'center', paddingVertical: 9 },
  dayCellDone: { backgroundColor: '#172116', borderColor: '#556B35' },
  dayShort: { color: COLORS.muted, fontSize: 9, fontWeight: '900' },
  dayNumber: { color: COLORS.text, fontSize: 16, fontWeight: '900', marginTop: 3 },
  dayDot: { color: '#3F4957', fontSize: 15, lineHeight: 14, marginTop: 1 },
  dayTextDone: { color: '#DDE7C8' },
  dayDotDone: { color: COLORS.gold },

  bottomNav: {
    position: 'absolute', left: 0, right: 0, bottom: 0,
    flexDirection: 'row', backgroundColor: '#0A0E14EE',
    borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: COLORS.border,
    paddingVertical: 8, paddingBottom: Platform.OS === 'android' ? 10 : 14,
  },
  navItem: { flex: 1, alignItems: 'center', justifyContent: 'center', minHeight: 52 },
  navSymbol: { color: '#596577', fontSize: 17, fontWeight: '900' },
  navLabel: { color: '#596577', fontSize: 9, fontWeight: '900', letterSpacing: 0.8, marginTop: 3 },
  navActive: { color: COLORS.gold },
});
