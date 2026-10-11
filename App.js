import React, { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Image,
  KeyboardAvoidingView,
  Linking,
  Platform,
  Pressable,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as ImagePicker from 'expo-image-picker';
import * as Notifications from 'expo-notifications';
import * as IntentLauncher from 'expo-intent-launcher';

const STORAGE_KEY = 'motivationGoals.state.v1';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
  }),
});

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
].map(([id, label]) => ({ id, label, done: false, completedAt: null }));

const FINANCIAL_TARGETS = {
  '1k': 1000,
  '10k': 10000,
  six: 100000,
};

const TRADING_RULES = [
  ['risk', 'Trzymałem ustalony risk'],
  ['setup', 'Wziąłem tylko mój setup'],
  ['patience', 'Czekałem na potwierdzenie'],
  ['overtrade', 'Nie overtradowałem'],
  ['revenge', 'Nie zrobiłem revenge trade'],
];

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
  financialProgress: { '1k': 0, '10k': 0, six: 0 },
  whyText: 'Buduję wolność, niezależność i życie, w którym mogę zadbać o rodzinę. Każdy dzień procesu ma znaczenie.',
  whyImage: null,
  visionImages: [],
  checkins: {},
  disciplineLog: {},
  notifications: { enabled: false, hour: 8 },
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

function isTradingDay(date) {
  const day = date.getDay();
  return day !== 0 && day !== 6;
}

function previousTradingDay(date) {
  let cursor = addDays(date, -1);
  while (!isTradingDay(cursor)) cursor = addDays(cursor, -1);
  return cursor;
}

function daysBetweenInclusive(startKey, end = new Date()) {
  const [y, m, d] = String(startKey).split('-').map(Number);
  if (!y || !m || !d) return 0;
  const startUtc = Date.UTC(y, m - 1, d);
  const endUtc = Date.UTC(end.getFullYear(), end.getMonth(), end.getDate());
  return Math.max(0, Math.floor((endUtc - startUtc) / 86400000) + 1);
}

function allRulesDone(entry) {
  if (!entry) return false;
  return TRADING_RULES.every(([id]) => Boolean(entry[id]));
}

function disciplineScore(entry) {
  if (!entry) return 0;
  const done = TRADING_RULES.filter(([id]) => Boolean(entry[id])).length;
  return Math.round((done / TRADING_RULES.length) * 100);
}

function currentStreak(disciplineLog) {
  const today = new Date();
  let cursor = isTradingDay(today) ? today : previousTradingDay(addDays(today, 1));
  if (!allRulesDone(disciplineLog[localDateKey(cursor)])) cursor = previousTradingDay(cursor);

  let streak = 0;
  for (let guard = 0; guard < 3000; guard += 1) {
    if (!allRulesDone(disciplineLog[localDateKey(cursor)])) break;
    streak += 1;
    cursor = previousTradingDay(cursor);
  }
  return streak;
}

function bestStreak(disciplineLog) {
  const keys = Object.keys(disciplineLog).sort();
  if (!keys.length) return 0;
  let cursor = fromDateKey(keys[0]);
  const end = new Date();
  let current = 0;
  let best = 0;

  while (cursor <= end) {
    if (isTradingDay(cursor)) {
      if (allRulesDone(disciplineLog[localDateKey(cursor)])) {
        current += 1;
        best = Math.max(best, current);
      } else {
        current = 0;
      }
    }
    cursor = addDays(cursor, 1);
  }
  return best;
}

function weekStart(date = new Date(), offsetWeeks = 0) {
  const day = date.getDay() || 7;
  const monday = addDays(date, 1 - day + offsetWeeks * 7);
  return new Date(monday.getFullYear(), monday.getMonth(), monday.getDate());
}

function weeklyStats(disciplineLog, offsetWeeks = 0) {
  const start = weekStart(new Date(), offsetWeeks);
  const days = Array.from({ length: 5 }, (_, i) => addDays(start, i));
  const entries = days.map((date) => disciplineLog[localDateKey(date)]).filter(Boolean);
  const scores = entries.map(disciplineScore);
  const average = scores.length ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0;
  const perfect = entries.filter(allRulesDone).length;
  return { average, perfect, logged: entries.length, days };
}

function quoteForDate(date = new Date()) {
  const start = new Date(date.getFullYear(), 0, 0);
  const dayOfYear = Math.floor((date - start) / 86400000);
  const index = (date.getFullYear() * 397 + dayOfYear * 17) % QUOTES.length;
  return QUOTES[index];
}

function quoteForToday() {
  return quoteForDate(new Date());
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

function normalizeState(parsed) {
  const disciplineLog = { ...(parsed?.disciplineLog || {}) };
  Object.entries(parsed?.checkins || {}).forEach(([key, done]) => {
    if (done && !disciplineLog[key]) {
      disciplineLog[key] = Object.fromEntries(TRADING_RULES.map(([id]) => [id, true]));
    }
  });

  const goals = DEFAULT_GOALS.map((goal) => {
    const saved = parsed?.goals?.find((item) => item.id === goal.id);
    return saved ? {
      ...goal,
      done: Boolean(saved.done),
      completedAt: saved.completedAt || null,
    } : goal;
  });

  const legacyImages = parsed?.visionImages?.length
    ? parsed.visionImages
    : parsed?.whyImage
      ? [parsed.whyImage]
      : [];

  return {
    ...INITIAL_STATE,
    ...(parsed || {}),
    goals,
    disciplineLog,
    visionImages: legacyImages,
    financialProgress: {
      ...INITIAL_STATE.financialProgress,
      ...(parsed?.financialProgress || {}),
    },
    notifications: {
      ...INITIAL_STATE.notifications,
      ...(parsed?.notifications || {}),
    },
  };
}

async function scheduleMorningReminders(settings, whyText) {
  try {
    await Notifications.cancelAllScheduledNotificationsAsync();
    if (!settings?.enabled) return;

    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('motivation', {
        name: 'Codzienna motywacja',
        importance: Notifications.AndroidImportance.DEFAULT,
      });
    }

    const now = new Date();
    for (let i = 0; i < 7; i += 1) {
      const date = addDays(now, i);
      date.setHours(Number(settings.hour || 8), 0, 0, 0);
      if (date <= now) continue;
      await Notifications.scheduleNotificationAsync({
        content: {
          title: 'Proces > wynik',
          body: `${quoteForDate(date)}\n${String(whyText || '').slice(0, 90)}`,
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DATE,
          date,
          ...(Platform.OS === 'android' ? { channelId: 'motivation' } : {}),
        },
      });
    }
  } catch (error) {
    console.warn('Nie udało się ustawić przypomnień', error);
  }
}

export default function App() {
  const [data, setData] = useState(INITIAL_STATE);
  const [loaded, setLoaded] = useState(false);
  const [tab, setTab] = useState('home');

  useEffect(() => {
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(STORAGE_KEY);
        setData(normalizeState(raw ? JSON.parse(raw) : null));
      } catch (error) {
        console.warn('Nie udało się wczytać danych', error);
        setData(INITIAL_STATE);
      } finally {
        setLoaded(true);
      }
    })();
  }, []);

  useEffect(() => {
    if (!loaded) return;
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(data)).catch(() => {});
  }, [data, loaded]);

  useEffect(() => {
    if (!loaded) return;
    scheduleMorningReminders(data.notifications, data.whyText);
  }, [loaded, data.notifications.enabled, data.notifications.hour]);

  const daysInGame = useMemo(() => daysBetweenInclusive(data.startDate), [data.startDate]);
  const streak = useMemo(() => currentStreak(data.disciplineLog), [data.disciplineLog]);
  const recordStreak = useMemo(() => bestStreak(data.disciplineLog), [data.disciplineLog]);
  const doneGoals = data.goals.filter((goal) => goal.done).length;
  const progress = data.goals.length ? doneGoals / data.goals.length : 0;
  const todayKey = localDateKey();
  const todayScore = disciplineScore(data.disciplineLog[todayKey]);
  const thisWeek = useMemo(() => weeklyStats(data.disciplineLog, 0), [data.disciplineLog]);
  const lastWeek = useMemo(() => weeklyStats(data.disciplineLog, -1), [data.disciplineLog]);

  const toggleGoal = (id) => {
    setData((current) => ({
      ...current,
      goals: current.goals.map((goal) => {
        if (goal.id !== id) return goal;
        const nextDone = !goal.done;
        return {
          ...goal,
          done: nextDone,
          completedAt: nextDone ? (goal.completedAt || localDateKey()) : null,
        };
      }),
    }));
  };

  const updateFinancialProgress = (id, raw) => {
    const value = Math.max(0, Number(String(raw).replace(/[^0-9.]/g, '')) || 0);
    const target = FINANCIAL_TARGETS[id];
    setData((current) => ({
      ...current,
      financialProgress: { ...current.financialProgress, [id]: value },
      goals: current.goals.map((goal) => {
        if (goal.id !== id || !target || value < target || goal.done) return goal;
        return { ...goal, done: true, completedAt: goal.completedAt || localDateKey() };
      }),
    }));
  };

  const toggleRule = (key, ruleId) => {
    setData((current) => {
      const currentEntry = current.disciplineLog[key] || {};
      const nextEntry = { ...currentEntry, [ruleId]: !currentEntry[ruleId] };
      const nextLog = { ...current.disciplineLog, [key]: nextEntry };
      const perfect = allRulesDone(nextEntry);
      return {
        ...current,
        disciplineLog: nextLog,
        checkins: { ...current.checkins, [key]: perfect },
      };
    });
  };

  const pickVisionImage = async () => {
    if (data.visionImages.length >= 6) {
      Alert.alert('Vision Board', 'Możesz dodać maksymalnie 6 zdjęć.');
      return;
    }
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        Alert.alert('Brak dostępu', 'Zezwól aplikacji na dostęp do zdjęć.');
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.42,
        base64: true,
      });
      if (!result.canceled && result.assets?.[0]?.base64) {
        const asset = result.assets[0];
        const type = asset.mimeType || 'image/jpeg';
        const uri = `data:${type};base64,${asset.base64}`;
        setData((current) => ({
          ...current,
          visionImages: [...current.visionImages, uri].slice(0, 6),
        }));
      }
    } catch (error) {
      Alert.alert('Błąd', 'Nie udało się wczytać zdjęcia.');
    }
  };

  const removeVisionImage = (index) => {
    setData((current) => ({
      ...current,
      visionImages: current.visionImages.filter((_, i) => i !== index),
    }));
  };

  const toggleNotifications = async () => {
    if (data.notifications.enabled) {
      setData((current) => ({ ...current, notifications: { ...current.notifications, enabled: false } }));
      return;
    }
    const permission = await Notifications.requestPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Powiadomienia wyłączone', 'Zezwól na powiadomienia, żeby dostać poranne przypomnienie.');
      return;
    }
    setData((current) => ({ ...current, notifications: { ...current.notifications, enabled: true } }));
  };

  const openTradingJournal = async () => {
    try {
      if (Platform.OS !== 'android') {
        Alert.alert('Trading Journal', 'Ten skrót jest dostępny na Androidzie.');
        return;
      }
      await IntentLauncher.openApplication('pl.smcjournal.app');
    } catch (error) {
      console.warn('Nie udało się otworzyć Trading Journal:', error);
      Alert.alert(
        'Trading Journal',
        'Nie udało się otworzyć SMC Trading Journal. Sprawdź, czy aplikacja jest zainstalowana.'
      );
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
                recordStreak={recordStreak}
                progress={progress}
                doneGoals={doneGoals}
                totalGoals={data.goals.length}
                quote={quoteForToday()}
                startDate={data.startDate}
                todayScore={todayScore}
                thisWeek={thisWeek}
                lastWeek={lastWeek}
                onOpenJournal={openTradingJournal}
                goDiscipline={() => setTab('streak')}
              />
            )}

            {tab === 'goals' && (
              <GoalsScreen
                goals={data.goals}
                doneGoals={doneGoals}
                progress={progress}
                financialProgress={data.financialProgress}
                onToggle={toggleGoal}
                onFinancialChange={updateFinancialProgress}
              />
            )}

            {tab === 'why' && (
              <WhyScreen
                whyText={data.whyText}
                visionImages={data.visionImages}
                startDate={data.startDate}
                notifications={data.notifications}
                setWhyText={(whyText) => setData((current) => ({ ...current, whyText }))}
                setStartDate={(startDate) => setData((current) => ({ ...current, startDate }))}
                pickImage={pickVisionImage}
                removeImage={removeVisionImage}
                toggleNotifications={toggleNotifications}
                setNotificationHour={(hour) => setData((current) => ({
                  ...current,
                  notifications: { ...current.notifications, hour },
                }))}
              />
            )}

            {tab === 'streak' && (
              <DisciplineScreen
                streak={streak}
                recordStreak={recordStreak}
                disciplineLog={data.disciplineLog}
                onToggleRule={toggleRule}
              />
            )}
          </ScrollView>

          <BottomNav tab={tab} setTab={setTab} />
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function HomeScreen({
  daysInGame,
  streak,
  recordStreak,
  progress,
  doneGoals,
  totalGoals,
  quote,
  startDate,
  todayScore,
  thisWeek,
  lastWeek,
  onOpenJournal,
  goDiscipline,
}) {
  const weekDelta = thisWeek.average - lastWeek.average;
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
        <Pressable onPress={goDiscipline} style={[styles.card, styles.halfCard]}>
          <Text style={styles.cardKicker}>DYSCYPLINA</Text>
          <Text style={[styles.metricLarge, { color: todayScore === 100 ? COLORS.green : COLORS.text }]}>{todayScore}%</Text>
          <Text style={styles.muted}>dzisiejszy score</Text>
          <ProgressBar value={todayScore / 100} />
        </Pressable>
        <View style={[styles.card, styles.halfCard]}>
          <Text style={styles.cardKicker}>STREAK</Text>
          <Text style={styles.metricLarge}>{streak}</Text>
          <Text style={styles.muted}>rekord: {recordStreak} dni</Text>
          <View style={styles.streakAccent} />
        </View>
      </View>

      <WeeklyDashboard thisWeek={thisWeek} lastWeek={lastWeek} weekDelta={weekDelta} />

      <View style={styles.twoColumns}>
        <View style={[styles.card, styles.halfCard]}>
          <Text style={styles.cardKicker}>CELE</Text>
          <Text style={styles.metricLarge}>{doneGoals}/{totalGoals}</Text>
          <Text style={styles.muted}>ukończonych etapów</Text>
          <ProgressBar value={progress} />
        </View>
        <Pressable onPress={onOpenJournal} style={[styles.card, styles.halfCard, styles.journalCard]}>
          <Text style={styles.cardKicker}>TRADING JOURNAL</Text>
          <Text style={styles.journalArrow}>↗</Text>
          <Text style={styles.muted}>Otwórz journal</Text>
        </Pressable>
      </View>
    </View>
  );
}

function WeeklyDashboard({ thisWeek, lastWeek, weekDelta }) {
  return (
    <View style={styles.card}>
      <View style={styles.weekHeader}>
        <View>
          <Text style={styles.cardKicker}>TYGODNIOWY DASHBOARD</Text>
          <Text style={styles.weekTitle}>Proces w tym tygodniu</Text>
        </View>
        <Text style={[styles.weekDelta, weekDelta >= 0 ? styles.positive : styles.negative]}>
          {weekDelta >= 0 ? '+' : ''}{weekDelta} pp
        </Text>
      </View>
      <View style={styles.weekStats}>
        <View style={styles.weekStat}>
          <Text style={styles.weekStatValue}>{thisWeek.average}%</Text>
          <Text style={styles.weekStatLabel}>średnia dyscyplina</Text>
        </View>
        <View style={styles.weekStat}>
          <Text style={styles.weekStatValue}>{thisWeek.perfect}/{Math.max(5, thisWeek.logged)}</Text>
          <Text style={styles.weekStatLabel}>perfekcyjne dni</Text>
        </View>
        <View style={styles.weekStat}>
          <Text style={styles.weekStatValue}>{thisWeek.logged}</Text>
          <Text style={styles.weekStatLabel}>dni zapisanych</Text>
        </View>
      </View>
      <View style={styles.weekCompare}>
        <Text style={styles.muted}>Poprzedni tydzień: {lastWeek.average}% dyscypliny</Text>
      </View>
    </View>
  );
}

function GoalsScreen({ goals, doneGoals, progress, financialProgress, onToggle, onFinancialChange }) {
  const timeline = goals.filter((goal) => goal.done).sort((a, b) => String(b.completedAt || '').localeCompare(String(a.completedAt || '')));

  return (
    <View style={styles.stack}>
      <View style={styles.screenTitleWrap}>
        <Text style={styles.screenKicker}>ROADMAP</Text>
        <Text style={styles.screenTitle}>Twoje etapy</Text>
        <Text style={styles.screenSubtitle}>{doneGoals} z {goals.length} celów ukończonych. Bez deadline'ów — liczy się kierunek.</Text>
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
          <View key={goal.id} style={[styles.goalRow, goal.done && styles.goalRowDone]}>
            <Pressable onPress={() => onToggle(goal.id)} style={styles.goalMainPress}>
              <Text style={styles.goalIndex}>{String(index + 1).padStart(2, '0')}</Text>
              <View style={styles.flex}>
                <Text style={[styles.goalText, goal.done && styles.goalTextDone]}>{goal.label}</Text>
                <Text style={styles.goalStatus}>{goal.done ? 'ETAP ZALICZONY' : 'PRZED TOBĄ'}</Text>
              </View>
              <View style={[styles.goalCheck, goal.done && styles.goalCheckDone]}>
                <Text style={styles.goalCheckText}>{goal.done ? '✓' : ''}</Text>
              </View>
            </Pressable>

            {FINANCIAL_TARGETS[goal.id] && (
              <FinancialProgress
                value={financialProgress[goal.id] || 0}
                target={FINANCIAL_TARGETS[goal.id]}
                onChange={(value) => onFinancialChange(goal.id, value)}
              />
            )}
          </View>
        ))}
      </View>

      <View style={styles.card}>
        <Text style={styles.cardKicker}>TIMELINE OSIĄGNIĘĆ</Text>
        {timeline.length === 0 ? (
          <Text style={[styles.muted, { marginTop: 10 }]}>Pierwszy zaliczony etap pojawi się tutaj.</Text>
        ) : (
          <View style={styles.timeline}>
            {timeline.map((goal) => (
              <View key={goal.id} style={styles.timelineRow}>
                <View style={styles.timelineDot} />
                <View style={styles.flex}>
                  <Text style={styles.timelineTitle}>{goal.label}</Text>
                  <Text style={styles.timelineDate}>{goal.completedAt || 'ukończone wcześniej'}</Text>
                </View>
              </View>
            ))}
          </View>
        )}
      </View>
    </View>
  );
}

function FinancialProgress({ value, target, onChange }) {
  const ratio = Math.min(1, Number(value || 0) / target);
  return (
    <View style={styles.financialWrap}>
      <View style={styles.financialHeader}>
        <Text style={styles.financialLabel}>PROGRES FINANSOWY</Text>
        <Text style={styles.financialPercent}>{Math.round(ratio * 100)}%</Text>
      </View>
      <View style={styles.financialInputRow}>
        <Text style={styles.dollar}>$</Text>
        <TextInput
          value={String(value || '')}
          onChangeText={onChange}
          keyboardType="decimal-pad"
          placeholder="0"
          placeholderTextColor="#5D6878"
          style={styles.moneyInput}
        />
        <Text style={styles.targetText}>/ ${target.toLocaleString('en-US')}</Text>
      </View>
      <ProgressBar value={ratio} />
    </View>
  );
}

function WhyScreen({
  whyText,
  visionImages,
  startDate,
  notifications,
  setWhyText,
  setStartDate,
  pickImage,
  removeImage,
  toggleNotifications,
  setNotificationHour,
}) {
  return (
    <View style={styles.stack}>
      <View style={styles.screenTitleWrap}>
        <Text style={styles.screenKicker}>FUNDAMENT</Text>
        <Text style={styles.screenTitle}>Moje dlaczego</Text>
        <Text style={styles.screenSubtitle}>Wróć tutaj, gdy motywacja spadnie.</Text>
      </View>

      <View style={styles.card}>
        <View style={styles.visionHeader}>
          <View style={styles.flex}>
            <Text style={styles.cardKicker}>VISION BOARD</Text>
            <Text style={[styles.muted, { marginTop: 5 }]}>Do 6 zdjęć. Bez terminów — tylko kierunek.</Text>
          </View>
          <Pressable onPress={pickImage} style={styles.smallGoldButton}>
            <Text style={styles.smallGoldButtonText}>+ ZDJĘCIE</Text>
          </Pressable>
        </View>

        {visionImages.length ? (
          <View style={styles.visionGrid}>
            {visionImages.map((uri, index) => (
              <View key={`${index}-${uri.slice(-12)}`} style={styles.visionItem}>
                <Image source={{ uri }} style={styles.visionImage} resizeMode="cover" />
                <Pressable onPress={() => removeImage(index)} style={styles.visionRemove}>
                  <Text style={styles.visionRemoveText}>×</Text>
                </Pressable>
              </View>
            ))}
          </View>
        ) : (
          <Pressable onPress={pickImage} style={styles.imagePlaceholder}>
            <Text style={styles.imagePlaceholderSymbol}>◎</Text>
            <Text style={styles.imagePlaceholderTitle}>Zbuduj Vision Board</Text>
            <Text style={styles.imagePlaceholderSub}>Rodzina, auto, miejsce, wolność — rzeczy, które przypominają po co to robisz.</Text>
          </Pressable>
        )}
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
        <View style={styles.reminderRow}>
          <View style={styles.flex}>
            <Text style={styles.inputLabel}>PORANNE PRZYPOMNIENIE</Text>
            <Text style={styles.muted}>Cytat + fragment Twojego „dlaczego”.</Text>
          </View>
          <Switch
            value={notifications.enabled}
            onValueChange={toggleNotifications}
            trackColor={{ false: '#2B3442', true: COLORS.goldSoft }}
            thumbColor={notifications.enabled ? COLORS.gold : '#A3ADBC'}
          />
        </View>
        <View style={styles.hourRow}>
          {[7, 8, 9, 10].map((hour) => (
            <Pressable
              key={hour}
              onPress={() => setNotificationHour(hour)}
              style={[styles.hourChip, notifications.hour === hour && styles.hourChipActive]}
            >
              <Text style={[styles.hourText, notifications.hour === hour && styles.hourTextActive]}>{String(hour).padStart(2, '0')}:00</Text>
            </Pressable>
          ))}
        </View>
      </View>

      <View style={styles.card}>
        <Text style={styles.inputLabel}>DATA STARTU</Text>
        <Text style={styles.muted}>Format: RRRR-MM-DD.</Text>
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

function DisciplineScreen({ streak, recordStreak, disciplineLog, onToggleRule }) {
  const today = new Date();
  const todayKey = localDateKey(today);
  const todayEntry = disciplineLog[todayKey] || {};
  const todayScore = disciplineScore(todayEntry);

  const days = [];
  let cursor = today;
  while (days.length < 10) {
    if (isTradingDay(cursor)) days.unshift(new Date(cursor));
    cursor = addDays(cursor, -1);
  }

  return (
    <View style={styles.stack}>
      <View style={styles.screenTitleWrap}>
        <Text style={styles.screenKicker}>DYSCYPLINA</Text>
        <Text style={styles.screenTitle}>Daily Discipline Score</Text>
        <Text style={styles.screenSubtitle}>Mierz proces, nie P&L.</Text>
      </View>

      <View style={styles.twoColumns}>
        <View style={[styles.card, styles.halfCard, styles.scoreCard]}>
          <Text style={styles.cardKicker}>DZISIAJ</Text>
          <Text style={[styles.scoreNumber, todayScore === 100 && { color: COLORS.green }]}>{todayScore}%</Text>
          <Text style={styles.muted}>discipline score</Text>
        </View>
        <View style={[styles.card, styles.halfCard]}>
          <Text style={styles.cardKicker}>SERIA</Text>
          <Text style={styles.metricLarge}>{streak}</Text>
          <Text style={styles.muted}>rekord: {recordStreak} dni</Text>
        </View>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardKicker}>DZISIEJSZE ZASADY</Text>
        <View style={styles.rulesList}>
          {TRADING_RULES.map(([id, label]) => {
            const done = Boolean(todayEntry[id]);
            return (
              <Pressable
                key={id}
                onPress={() => onToggleRule(todayKey, id)}
                style={[styles.ruleRow, done && styles.ruleRowDone]}
              >
                <View style={[styles.ruleCheck, done && styles.ruleCheckDone]}>
                  <Text style={styles.ruleCheckText}>{done ? '✓' : ''}</Text>
                </View>
                <Text style={[styles.ruleText, done && styles.ruleTextDone]}>{label}</Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardKicker}>OSTATNIE 10 DNI TRADINGOWYCH</Text>
        <View style={styles.scoreHistory}>
          {days.map((date) => {
            const key = localDateKey(date);
            const score = disciplineScore(disciplineLog[key]);
            return (
              <View key={key} style={styles.scoreDay}>
                <Text style={styles.scoreDayName}>{dayShort(date)}</Text>
                <Text style={styles.scoreDayDate}>{date.getDate()}</Text>
                <View style={[styles.scoreBar, { height: Math.max(4, score * 0.42) }, score === 100 && styles.scoreBarPerfect]} />
                <Text style={styles.scoreDayValue}>{score}%</Text>
              </View>
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
    ['streak', 'DYSCYPLINA', '↗'],
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
  pressed: { opacity: 0.72 },

  weekHeader: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 },
  weekTitle: { color: COLORS.text, fontSize: 20, fontWeight: '900', marginTop: 6, letterSpacing: -0.5 },
  weekDelta: { fontSize: 13, fontWeight: '900', marginTop: 2 },
  positive: { color: COLORS.green },
  negative: { color: COLORS.red },
  weekStats: { flexDirection: 'row', gap: 8, marginTop: 18 },
  weekStat: { flex: 1, backgroundColor: '#0B1017', borderRadius: 14, padding: 11, borderWidth: 1, borderColor: COLORS.border },
  weekStatValue: { color: COLORS.text, fontSize: 22, fontWeight: '900' },
  weekStatLabel: { color: COLORS.muted, fontSize: 9, lineHeight: 13, marginTop: 3 },
  weekCompare: { marginTop: 12 },
  journalCard: { justifyContent: 'center' },
  journalArrow: { color: COLORS.gold, fontSize: 34, fontWeight: '900', marginVertical: 8 },

  screenTitleWrap: { marginBottom: 4, paddingHorizontal: 2 },
  screenKicker: { color: COLORS.gold, fontSize: 10, fontWeight: '900', letterSpacing: 2 },
  screenTitle: { color: COLORS.text, fontSize: 31, fontWeight: '900', letterSpacing: -1.2, marginTop: 4 },
  screenSubtitle: { color: COLORS.muted, fontSize: 13, lineHeight: 19, marginTop: 4 },
  progressHeader: { flexDirection: 'row', alignItems: 'baseline', gap: 8 },
  progressPercent: { color: COLORS.text, fontSize: 44, fontWeight: '900', letterSpacing: -2 },
  goalsList: { gap: 9 },
  goalRow: {
    backgroundColor: COLORS.panel,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 17,
    overflow: 'hidden',
  },
  goalRowDone: { backgroundColor: '#111E1A', borderColor: '#254F3E' },
  goalMainPress: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 15, paddingHorizontal: 14 },
  goalIndex: { color: '#536073', fontSize: 11, fontWeight: '900', letterSpacing: 1 },
  goalText: { color: COLORS.text, fontSize: 16, fontWeight: '800' },
  goalTextDone: { color: '#B7C9C0' },
  goalStatus: { color: COLORS.muted, fontSize: 9, fontWeight: '800', letterSpacing: 1.2, marginTop: 4 },
  goalCheck: { width: 30, height: 30, borderRadius: 9, borderWidth: 1.5, borderColor: '#475367', alignItems: 'center', justifyContent: 'center' },
  goalCheckDone: { backgroundColor: COLORS.green, borderColor: COLORS.green },
  goalCheckText: { color: '#07120D', fontWeight: '900', fontSize: 16 },

  financialWrap: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: COLORS.border, padding: 14, paddingTop: 11 },
  financialHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  financialLabel: { color: COLORS.muted, fontSize: 9, fontWeight: '900', letterSpacing: 1.2 },
  financialPercent: { color: COLORS.gold, fontSize: 11, fontWeight: '900' },
  financialInputRow: { flexDirection: 'row', alignItems: 'center', marginTop: 8 },
  dollar: { color: COLORS.gold, fontSize: 18, fontWeight: '900' },
  moneyInput: { color: COLORS.text, fontSize: 18, fontWeight: '900', minWidth: 80, paddingVertical: 3, paddingHorizontal: 6 },
  targetText: { color: COLORS.muted, fontSize: 12 },
  timeline: { marginTop: 12, gap: 12 },
  timelineRow: { flexDirection: 'row', alignItems: 'center', gap: 11 },
  timelineDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: COLORS.gold },
  timelineTitle: { color: COLORS.text, fontSize: 14, fontWeight: '800' },
  timelineDate: { color: COLORS.muted, fontSize: 10, marginTop: 2 },

  visionHeader: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  smallGoldButton: { backgroundColor: COLORS.gold, paddingHorizontal: 11, paddingVertical: 9, borderRadius: 11 },
  smallGoldButtonText: { color: '#151108', fontSize: 10, fontWeight: '900' },
  visionGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 14 },
  visionItem: { width: '48%', aspectRatio: 4 / 3, borderRadius: 14, overflow: 'hidden', backgroundColor: '#0D121A' },
  visionImage: { width: '100%', height: '100%' },
  visionRemove: { position: 'absolute', top: 6, right: 6, width: 28, height: 28, borderRadius: 14, backgroundColor: '#05070ACF', alignItems: 'center', justifyContent: 'center' },
  visionRemoveText: { color: COLORS.text, fontSize: 19, fontWeight: '900', lineHeight: 20 },
  imagePlaceholder: { minHeight: 190, alignItems: 'center', justifyContent: 'center', padding: 28, backgroundColor: '#0D121A', borderRadius: 16, marginTop: 14 },
  imagePlaceholderSymbol: { color: COLORS.gold, fontSize: 48, marginBottom: 8 },
  imagePlaceholderTitle: { color: COLORS.text, fontSize: 18, fontWeight: '900' },
  imagePlaceholderSub: { color: COLORS.muted, fontSize: 12, lineHeight: 18, textAlign: 'center', marginTop: 7 },
  inputLabel: { color: COLORS.gold, fontSize: 10, fontWeight: '900', letterSpacing: 1.8, marginBottom: 10 },
  whyInput: { minHeight: 150, color: COLORS.text, fontSize: 16, lineHeight: 24, padding: 0 },
  inputHint: { color: COLORS.muted, fontSize: 10, marginTop: 10 },
  dateInput: { marginTop: 12, backgroundColor: '#0A0E15', borderWidth: 1, borderColor: COLORS.border, color: COLORS.text, borderRadius: 12, paddingHorizontal: 13, paddingVertical: 12, fontSize: 15, fontWeight: '700' },
  reminderRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  hourRow: { flexDirection: 'row', gap: 8, marginTop: 14 },
  hourChip: { flex: 1, borderWidth: 1, borderColor: COLORS.border, borderRadius: 11, alignItems: 'center', paddingVertical: 10, backgroundColor: '#0B1017' },
  hourChipActive: { borderColor: COLORS.goldSoft, backgroundColor: '#221C10' },
  hourText: { color: COLORS.muted, fontSize: 11, fontWeight: '800' },
  hourTextActive: { color: COLORS.gold },

  scoreCard: { justifyContent: 'center' },
  scoreNumber: { color: COLORS.text, fontSize: 48, fontWeight: '900', letterSpacing: -2, marginTop: 8 },
  rulesList: { gap: 8, marginTop: 14 },
  ruleRow: { flexDirection: 'row', alignItems: 'center', gap: 11, backgroundColor: '#0B1017', borderWidth: 1, borderColor: COLORS.border, borderRadius: 14, padding: 13 },
  ruleRowDone: { backgroundColor: '#102019', borderColor: '#285F48' },
  ruleCheck: { width: 28, height: 28, borderRadius: 9, borderWidth: 1.5, borderColor: '#4A5668', alignItems: 'center', justifyContent: 'center' },
  ruleCheckDone: { backgroundColor: COLORS.green, borderColor: COLORS.green },
  ruleCheckText: { color: '#07120D', fontSize: 15, fontWeight: '900' },
  ruleText: { color: COLORS.text, fontSize: 14, fontWeight: '700', flex: 1 },
  ruleTextDone: { color: '#C6D9CF' },
  scoreHistory: { flexDirection: 'row', alignItems: 'flex-end', gap: 5, height: 105, marginTop: 18 },
  scoreDay: { flex: 1, alignItems: 'center', justifyContent: 'flex-end' },
  scoreDayName: { color: COLORS.muted, fontSize: 8, fontWeight: '900' },
  scoreDayDate: { color: COLORS.text, fontSize: 10, fontWeight: '800', marginTop: 2 },
  scoreBar: { width: 12, borderRadius: 6, backgroundColor: COLORS.blue, marginVertical: 5 },
  scoreBarPerfect: { backgroundColor: COLORS.green },
  scoreDayValue: { color: COLORS.muted, fontSize: 8 },

  bottomNav: {
    position: 'absolute', left: 0, right: 0, bottom: 0,
    flexDirection: 'row', backgroundColor: '#0A0E14EE',
    borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: COLORS.border,
    paddingVertical: 8, paddingBottom: Platform.OS === 'android' ? 10 : 14,
  },
  navItem: { flex: 1, alignItems: 'center', justifyContent: 'center', minHeight: 52 },
  navSymbol: { color: '#596577', fontSize: 17, fontWeight: '900' },
  navLabel: { color: '#596577', fontSize: 8, fontWeight: '900', letterSpacing: 0.5, marginTop: 3 },
  navActive: { color: COLORS.gold },
});
