import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  KeyboardAvoidingView,
  Modal,
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
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';

const STORAGE_KEY = 'motivationGoals.state.v1';
const BACKUP_VERSION = 3;
const WIDGET_FILE = 'widget_state.json';

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
  yellow: '#E7BC59',
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

const DEFAULT_RULES = [
  { id: 'risk', label: 'Trzymałem ustalony risk', archived: false },
  { id: 'setup', label: 'Wziąłem tylko mój setup', archived: false },
  { id: 'patience', label: 'Czekałem na potwierdzenie', archived: false },
  { id: 'overtrade', label: 'Nie overtradowałem', archived: false },
  { id: 'revenge', label: 'Nie zrobiłem revenge trade', archived: false },
];

const DEFAULT_PROCESS_TARGETS = {
  perfect: 10,
  logged: 30,
  noTrade: 10,
  bestStreak: 10,
};

const PROCESS_GOALS = [
  { id: 'perfect', label: 'Sesje 100% dyscypliny', suffix: 'sesji' },
  { id: 'logged', label: 'Zapisane sesje', suffix: 'sesji' },
  { id: 'noTrade', label: 'Dobre decyzje NO TRADE', suffix: 'dni' },
  { id: 'bestStreak', label: 'Najlepszy streak', suffix: 'dni' },
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
  'Brak setupu też jest informacją. Nie musisz wymuszać transakcji.',
  'Spokój przed kliknięciem jest częścią przewagi.',
  'Nie odbieraj sobie jutra próbując odrobić dzisiaj.',
  'Dobry trader potrafi nic nie zrobić, kiedy rynek nic nie daje.',
  'Najpierw przetrwaj. Potem bądź konsekwentny. Dopiero potem skaluj.',
  'Twoja przewaga nie potrzebuje więcej trade’ów. Potrzebuje lepszej selekcji.',
  'Dzień bez trade’u może być perfekcyjnie wykonanym dniem.',
  'Proces nie obiecuje zysku dziś. Daje szansę na wynik w długim terminie.',
  'Najdroższy trade to ten, który bierzesz tylko dlatego, że chcesz coś poczuć.',
  'Nie walcz z rynkiem. Zarządzaj sobą.',
  'Jakość wejścia zaczyna się od jakości czekania.',
  'Prawdziwy progres jest nudny: zasada po zasadzie, dzień po dniu.',
  'Nie potrzebujesz zemsty na rynku. Potrzebujesz następnej dobrej decyzji.',
  'Rynek będzie jutro. Kapitał i głowa też muszą tam dotrzeć.',
  'Konsekwencja nie wygląda spektakularnie, dopóki nie zobaczysz jej efektów.',
  'Jeśli nie ma twojego setupu, twoim setupem jest brak pozycji.',
  'Nie zwiększaj aktywności tylko dlatego, że wynik ci się nie podoba.',
  'Najlepsza pewność siebie pochodzi z dotrzymanych sobie zasad.',
  'Nie kontrolujesz wyniku pojedynczego trade’u. Kontrolujesz sposób, w jaki go bierzesz.',
  'Zanim klikniesz, zapytaj: czy to mój plan, czy moja emocja?',
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
  rules: DEFAULT_RULES,
  processGoalTargets: DEFAULT_PROCESS_TARGETS,
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

function entryRuleIds(entry) {
  if (Array.isArray(entry?.ruleIds) && entry.ruleIds.length) return entry.ruleIds;
  return DEFAULT_RULES.map((rule) => rule.id);
}

function isLoggedEntry(entry) {
  return Boolean(entry && typeof entry === 'object');
}

function allRulesDone(entry) {
  if (!isLoggedEntry(entry)) return false;
  if (entry.noTrade) return true;
  const ids = entryRuleIds(entry);
  return ids.length > 0 && ids.every((id) => Boolean(entry[id]));
}

function disciplineScore(entry) {
  if (!isLoggedEntry(entry)) return 0;
  if (entry.noTrade) return 100;
  const ids = entryRuleIds(entry);
  if (!ids.length) return 0;
  const done = ids.filter((id) => Boolean(entry[id])).length;
  return Math.round((done / ids.length) * 100);
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
  const entries = days.map((date) => disciplineLog[localDateKey(date)]).filter(isLoggedEntry);
  const scores = entries.map(disciplineScore);
  const average = scores.length ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0;
  const perfect = entries.filter(allRulesDone).length;
  const noTrade = entries.filter((entry) => entry.noTrade).length;
  return { average, perfect, logged: entries.length, noTrade, days };
}

function processMetrics(disciplineLog) {
  const entries = Object.values(disciplineLog).filter(isLoggedEntry);
  return {
    perfect: entries.filter(allRulesDone).length,
    logged: entries.length,
    noTrade: entries.filter((entry) => entry.noTrade).length,
    bestStreak: bestStreak(disciplineLog),
  };
}

function quoteIndexForDate(date = new Date()) {
  const start = new Date(date.getFullYear(), 0, 0);
  const dayOfYear = Math.floor((date - start) / 86400000);
  return Math.abs(date.getFullYear() * 397 + dayOfYear * 37) % QUOTES.length;
}

function quoteForDate(date = new Date()) {
  let index = quoteIndexForDate(date);
  const yesterday = addDays(date, -1);
  if (index === quoteIndexForDate(yesterday)) index = (index + 1) % QUOTES.length;
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

function formatFullPolishDate(date) {
  return new Intl.DateTimeFormat('pl-PL', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(date);
}

function dayShort(date) {
  return new Intl.DateTimeFormat('pl-PL', { weekday: 'short' })
    .format(date)
    .replace('.', '')
    .slice(0, 2)
    .toUpperCase();
}

function monthTitle(date) {
  const text = new Intl.DateTimeFormat('pl-PL', { month: 'long', year: 'numeric' }).format(date);
  return text.charAt(0).toUpperCase() + text.slice(1);
}

function monthGrid(offset = 0) {
  const now = new Date();
  const first = new Date(now.getFullYear(), now.getMonth() + offset, 1);
  const last = new Date(first.getFullYear(), first.getMonth() + 1, 0);
  const leading = (first.getDay() + 6) % 7;
  const cells = Array.from({ length: leading }, () => null);
  for (let day = 1; day <= last.getDate(); day += 1) {
    cells.push(new Date(first.getFullYear(), first.getMonth(), day));
  }
  while (cells.length % 7 !== 0) cells.push(null);
  return { month: first, cells };
}

function normalizeState(parsed) {
  const rules = Array.isArray(parsed?.rules) && parsed.rules.length
    ? parsed.rules.map((rule) => ({
      id: String(rule.id),
      label: String(rule.label || 'Zasada'),
      archived: Boolean(rule.archived),
    }))
    : DEFAULT_RULES;

  const disciplineLog = {};
  Object.entries(parsed?.disciplineLog || {}).forEach(([key, entry]) => {
    if (!entry || typeof entry !== 'object') return;
    disciplineLog[key] = {
      ...entry,
      ruleIds: Array.isArray(entry.ruleIds) && entry.ruleIds.length
        ? entry.ruleIds
        : DEFAULT_RULES.map((rule) => rule.id),
    };
  });

  Object.entries(parsed?.checkins || {}).forEach(([key, done]) => {
    if (done && !disciplineLog[key]) {
      disciplineLog[key] = {
        ruleIds: DEFAULT_RULES.map((rule) => rule.id),
        ...Object.fromEntries(DEFAULT_RULES.map((rule) => [rule.id, true])),
      };
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
    rules,
    disciplineLog,
    visionImages: legacyImages,
    financialProgress: {
      ...INITIAL_STATE.financialProgress,
      ...(parsed?.financialProgress || {}),
    },
    processGoalTargets: {
      ...DEFAULT_PROCESS_TARGETS,
      ...(parsed?.processGoalTargets || {}),
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

async function writeWidgetState(score, streak) {
  if (Platform.OS !== 'android' || !FileSystem.documentDirectory) return;
  try {
    const uri = `${FileSystem.documentDirectory}${WIDGET_FILE}`;
    await FileSystem.writeAsStringAsync(uri, JSON.stringify({
      score,
      streak,
      updatedAt: new Date().toISOString(),
    }), { encoding: FileSystem.EncodingType.UTF8 });
  } catch (error) {
    console.warn('Nie udało się zaktualizować danych widgetu', error);
  }
}

export default function App() {
  const [data, setData] = useState(INITIAL_STATE);
  const [loaded, setLoaded] = useState(false);
  const [tab, setTab] = useState('home');
  const [resetVisible, setResetVisible] = useState(false);

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
  }, [loaded, data.notifications.enabled, data.notifications.hour, data.whyText]);

  const daysInGame = useMemo(() => daysBetweenInclusive(data.startDate), [data.startDate]);
  const streak = useMemo(() => currentStreak(data.disciplineLog), [data.disciplineLog]);
  const recordStreak = useMemo(() => bestStreak(data.disciplineLog), [data.disciplineLog]);
  const doneGoals = data.goals.filter((goal) => goal.done).length;
  const progress = data.goals.length ? doneGoals / data.goals.length : 0;
  const todayKey = localDateKey();
  const todayScore = disciplineScore(data.disciplineLog[todayKey]);
  const thisWeek = useMemo(() => weeklyStats(data.disciplineLog, 0), [data.disciplineLog]);
  const lastWeek = useMemo(() => weeklyStats(data.disciplineLog, -1), [data.disciplineLog]);
  const metrics = useMemo(() => processMetrics(data.disciplineLog), [data.disciplineLog]);
  const activeRules = data.rules.filter((rule) => !rule.archived);

  useEffect(() => {
    if (!loaded) return;
    writeWidgetState(todayScore, streak);
  }, [loaded, todayScore, streak]);

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
      const currentEntry = current.disciplineLog[key];
      const snapshot = currentEntry?.ruleIds?.length
        ? currentEntry.ruleIds
        : current.rules.filter((rule) => !rule.archived).map((rule) => rule.id);
      const nextRuleIds = snapshot.includes(ruleId) ? snapshot : [...snapshot, ruleId];
      const nextEntry = {
        ...(currentEntry || {}),
        ruleIds: nextRuleIds,
        noTrade: false,
        [ruleId]: !currentEntry?.[ruleId],
      };
      return {
        ...current,
        disciplineLog: { ...current.disciplineLog, [key]: nextEntry },
        checkins: { ...current.checkins, [key]: allRulesDone(nextEntry) },
      };
    });
  };

  const toggleNoTrade = (key) => {
    setData((current) => {
      const currentEntry = current.disciplineLog[key];
      const snapshot = currentEntry?.ruleIds?.length
        ? currentEntry.ruleIds
        : current.rules.filter((rule) => !rule.archived).map((rule) => rule.id);
      const nextEntry = {
        ...(currentEntry || {}),
        ruleIds: snapshot,
        noTrade: !currentEntry?.noTrade,
      };
      return {
        ...current,
        disciplineLog: { ...current.disciplineLog, [key]: nextEntry },
        checkins: { ...current.checkins, [key]: allRulesDone(nextEntry) },
      };
    });
  };

  const updateRuleLabel = (id, label) => {
    setData((current) => ({
      ...current,
      rules: current.rules.map((rule) => (rule.id === id ? { ...rule, label } : rule)),
    }));
  };

  const addRule = (label) => {
    const clean = String(label || '').trim();
    if (!clean) return false;
    if (activeRules.length >= 8) {
      Alert.alert('Zasady', 'Maksymalnie 8 aktywnych zasad.');
      return false;
    }
    const id = `custom_${Date.now().toString(36)}`;
    setData((current) => ({
      ...current,
      rules: [...current.rules, { id, label: clean, archived: false }],
    }));
    return true;
  };

  const archiveRule = (id) => {
    if (activeRules.length <= 1) {
      Alert.alert('Zasady', 'Zostaw przynajmniej jedną aktywną zasadę.');
      return;
    }
    setData((current) => ({
      ...current,
      rules: current.rules.map((rule) => (rule.id === id ? { ...rule, archived: true } : rule)),
    }));
  };

  const updateProcessTarget = (id, raw) => {
    const value = Math.max(1, Math.min(9999, Number(String(raw).replace(/\D/g, '')) || 1));
    setData((current) => ({
      ...current,
      processGoalTargets: { ...current.processGoalTargets, [id]: value },
    }));
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
      Alert.alert('Trading Journal', 'Nie udało się otworzyć SMC Trading Journal. Sprawdź, czy aplikacja jest zainstalowana.');
    }
  };

  const exportBackup = async () => {
    try {
      if (!FileSystem.cacheDirectory) throw new Error('Brak katalogu cache');
      const payload = {
        app: 'Motivation & Goals',
        backupVersion: BACKUP_VERSION,
        exportedAt: new Date().toISOString(),
        state: data,
      };
      const uri = `${FileSystem.cacheDirectory}motivation-goals-backup-${localDateKey()}.json`;
      await FileSystem.writeAsStringAsync(uri, JSON.stringify(payload), { encoding: FileSystem.EncodingType.UTF8 });
      const available = await Sharing.isAvailableAsync();
      if (!available) {
        Alert.alert('Backup', 'Udostępnianie plików nie jest dostępne na tym urządzeniu.');
        return;
      }
      await Sharing.shareAsync(uri, {
        mimeType: 'application/json',
        dialogTitle: 'Zapisz backup Motivation & Goals',
      });
    } catch (error) {
      console.warn('Backup export error', error);
      Alert.alert('Błąd', 'Nie udało się utworzyć backupu.');
    }
  };

  const importBackup = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: 'application/json',
        copyToCacheDirectory: true,
        multiple: false,
      });
      if (result.canceled || !result.assets?.[0]?.uri) return;
      const raw = await FileSystem.readAsStringAsync(result.assets[0].uri, { encoding: FileSystem.EncodingType.UTF8 });
      const parsed = JSON.parse(raw);
      const candidate = parsed?.state || parsed;
      if (!candidate || typeof candidate !== 'object') throw new Error('Nieprawidłowy backup');
      const restored = normalizeState(candidate);
      Alert.alert(
        'Przywrócić backup?',
        'Obecne dane w aplikacji zostaną zastąpione danymi z wybranego pliku.',
        [
          { text: 'Anuluj', style: 'cancel' },
          {
            text: 'Przywróć',
            style: 'destructive',
            onPress: () => {
              setData(restored);
              Alert.alert('Gotowe', 'Backup został przywrócony.');
            },
          },
        ],
      );
    } catch (error) {
      console.warn('Backup import error', error);
      Alert.alert('Błąd', 'Nie udało się odczytać tego pliku backupu.');
    }
  };

  if (!loaded) {
    return (
      <SafeAreaView style={[styles.safeArea, styles.loader]}>
        <StatusBar barStyle="light-content" backgroundColor={COLORS.bg} />
        <ActivityIndicator size="large" color={COLORS.gold} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.bg} />
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
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
                todayEntry={data.disciplineLog[todayKey]}
                thisWeek={thisWeek}
                lastWeek={lastWeek}
                onOpenJournal={openTradingJournal}
                goDiscipline={() => setTab('streak')}
                openReset={() => setResetVisible(true)}
              />
            )}

            {tab === 'goals' && (
              <GoalsScreen
                goals={data.goals}
                doneGoals={doneGoals}
                progress={progress}
                financialProgress={data.financialProgress}
                processTargets={data.processGoalTargets}
                processMetrics={metrics}
                onToggle={toggleGoal}
                onFinancialChange={updateFinancialProgress}
                onProcessTargetChange={updateProcessTarget}
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
                exportBackup={exportBackup}
                importBackup={importBackup}
              />
            )}

            {tab === 'streak' && (
              <DisciplineScreen
                streak={streak}
                recordStreak={recordStreak}
                disciplineLog={data.disciplineLog}
                rules={data.rules}
                onToggleRule={toggleRule}
                onToggleNoTrade={toggleNoTrade}
                onUpdateRule={updateRuleLabel}
                onAddRule={addRule}
                onArchiveRule={archiveRule}
                openReset={() => setResetVisible(true)}
              />
            )}
          </ScrollView>

          <BottomNav tab={tab} setTab={setTab} />
        </View>
      </KeyboardAvoidingView>

      <ResetModeModal
        visible={resetVisible}
        onClose={() => setResetVisible(false)}
        whyText={data.whyText}
        rules={activeRules}
      />
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
  todayEntry,
  thisWeek,
  lastWeek,
  onOpenJournal,
  goDiscipline,
  openReset,
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
        <Text style={styles.quoteMeta}>Losowany raz dziennie — jutro pojawi się inny.</Text>
      </View>

      <View style={styles.twoColumns}>
        <Pressable onPress={goDiscipline} style={[styles.card, styles.halfCard]}>
          <Text style={styles.cardKicker}>DYSCYPLINA</Text>
          <Text style={[styles.metricLarge, { color: todayScore === 100 ? COLORS.green : COLORS.text }]}>{todayScore}%</Text>
          <Text style={styles.muted}>{todayEntry?.noTrade ? 'NO TRADE = dobra decyzja' : 'dzisiejszy score'}</Text>
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

      <Pressable onPress={openReset} style={styles.resetQuickButton}>
        <View style={styles.resetQuickIcon}><Text style={styles.resetQuickIconText}>!</Text></View>
        <View style={styles.flex}>
          <Text style={styles.resetQuickTitle}>ZŁAMAŁEM ZASADY / CZUJĘ TILT</Text>
          <Text style={styles.resetQuickSub}>Uruchom szybki reset. Bez odrabiania, bez revenge.</Text>
        </View>
        <Text style={styles.resetQuickArrow}>›</Text>
      </Pressable>

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
        <View style={styles.flex}>
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
          <Text style={styles.weekStatValue}>{thisWeek.perfect}</Text>
          <Text style={styles.weekStatLabel}>perfekcyjne dni</Text>
        </View>
        <View style={styles.weekStat}>
          <Text style={styles.weekStatValue}>{thisWeek.noTrade}</Text>
          <Text style={styles.weekStatLabel}>dobre NO TRADE</Text>
        </View>
      </View>
      <View style={styles.weekCompare}>
        <Text style={styles.muted}>Poprzedni tydzień: {lastWeek.average}% dyscypliny · zapisane dni teraz: {thisWeek.logged}</Text>
      </View>
    </View>
  );
}

function GoalsScreen({
  goals,
  doneGoals,
  progress,
  financialProgress,
  processTargets,
  processMetrics: metrics,
  onToggle,
  onFinancialChange,
  onProcessTargetChange,
}) {
  const timeline = goals
    .filter((goal) => goal.done)
    .sort((a, b) => String(b.completedAt || '').localeCompare(String(a.completedAt || '')));

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
        <Text style={styles.cardKicker}>CELE PROCESOWE</Text>
        <Text style={[styles.muted, { marginTop: 6 }]}>Bez dat. Cel rośnie automatycznie z historią dyscypliny. Możesz zmienić tylko liczbę docelową.</Text>
        <View style={styles.processGoalsList}>
          {PROCESS_GOALS.map((goal) => {
            const target = Number(processTargets[goal.id] || 1);
            const current = Number(metrics[goal.id] || 0);
            const ratio = Math.min(1, current / target);
            return (
              <View key={goal.id} style={styles.processGoalRow}>
                <View style={styles.processGoalTop}>
                  <View style={styles.flex}>
                    <Text style={styles.processGoalTitle}>{goal.label}</Text>
                    <Text style={styles.processGoalValue}>{current} / {target} {goal.suffix}</Text>
                  </View>
                  <TextInput
                    value={String(target)}
                    onChangeText={(value) => onProcessTargetChange(goal.id, value)}
                    keyboardType="number-pad"
                    maxLength={4}
                    style={styles.processTargetInput}
                    selectTextOnFocus
                  />
                </View>
                <ProgressBar value={ratio} />
              </View>
            );
          })}
        </View>
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
  exportBackup,
  importBackup,
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
            <Text style={styles.muted}>Codziennie inny cytat + fragment Twojego „dlaczego”.</Text>
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
        <Text style={styles.inputLabel}>BACKUP DANYCH</Text>
        <Text style={styles.muted}>Backup zawiera cele, historię dyscypliny, zasady, „dlaczego” i zdjęcia z Vision Board.</Text>
        <View style={styles.backupButtons}>
          <Pressable onPress={exportBackup} style={styles.primaryButton}>
            <Text style={styles.primaryButtonText}>EKSPORTUJ BACKUP</Text>
          </Pressable>
          <Pressable onPress={importBackup} style={styles.secondaryButton}>
            <Text style={styles.secondaryButtonText}>PRZYWRÓĆ BACKUP</Text>
          </Pressable>
        </View>
      </View>

      <View style={styles.card}>
        <Text style={styles.inputLabel}>WIDGET NA EKRAN GŁÓWNY</Text>
        <Text style={styles.muted}>Po aktualizacji możesz dodać widget „Motivation & Goals”. Pokazuje dzisiejszy cytat, Discipline Score i streak. Android odświeża go okresowo.</Text>
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

function DisciplineScreen({
  streak,
  recordStreak,
  disciplineLog,
  rules,
  onToggleRule,
  onToggleNoTrade,
  onUpdateRule,
  onAddRule,
  onArchiveRule,
  openReset,
}) {
  const today = new Date();
  const todayKey = localDateKey(today);
  const [selectedKey, setSelectedKey] = useState(todayKey);
  const [monthOffset, setMonthOffset] = useState(0);
  const [newRule, setNewRule] = useState('');

  const selectedDate = fromDateKey(selectedKey);
  const selectedEntry = disciplineLog[selectedKey];
  const selectedScore = disciplineScore(selectedEntry);
  const futureSelected = selectedDate > new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const selectedRuleIds = selectedEntry?.ruleIds?.length
    ? selectedEntry.ruleIds
    : rules.filter((rule) => !rule.archived).map((rule) => rule.id);
  const selectedRules = selectedRuleIds.map((id) => rules.find((rule) => rule.id === id)).filter(Boolean);
  const activeRules = rules.filter((rule) => !rule.archived);

  const days = [];
  let cursor = today;
  while (days.length < 10) {
    if (isTradingDay(cursor)) days.unshift(new Date(cursor));
    cursor = addDays(cursor, -1);
  }

  const calendar = monthGrid(monthOffset);

  const submitRule = () => {
    if (onAddRule(newRule)) setNewRule('');
  };

  return (
    <View style={styles.stack}>
      <View style={styles.screenTitleWrap}>
        <Text style={styles.screenKicker}>DYSCYPLINA</Text>
        <Text style={styles.screenTitle}>Daily Discipline Score</Text>
        <Text style={styles.screenSubtitle}>Mierz proces, nie P&L. NO TRADE z powodu braku setupu liczy się jako dobry dzień.</Text>
      </View>

      <View style={styles.twoColumns}>
        <View style={[styles.card, styles.halfCard, styles.scoreCard]}>
          <Text style={styles.cardKicker}>DZISIAJ</Text>
          <Text style={[styles.scoreNumber, disciplineScore(disciplineLog[todayKey]) === 100 && { color: COLORS.green }]}>{disciplineScore(disciplineLog[todayKey])}%</Text>
          <Text style={styles.muted}>{disciplineLog[todayKey]?.noTrade ? 'NO TRADE ✓' : 'discipline score'}</Text>
        </View>
        <View style={[styles.card, styles.halfCard]}>
          <Text style={styles.cardKicker}>SERIA</Text>
          <Text style={styles.metricLarge}>{streak}</Text>
          <Text style={styles.muted}>rekord: {recordStreak} dni</Text>
        </View>
      </View>

      <Pressable onPress={openReset} style={styles.resetQuickButton}>
        <View style={styles.resetQuickIcon}><Text style={styles.resetQuickIconText}>!</Text></View>
        <View style={styles.flex}>
          <Text style={styles.resetQuickTitle}>TRYB RESET PO BŁĘDZIE / TILCIE</Text>
          <Text style={styles.resetQuickSub}>Przypomnij sobie po co to robisz i wróć do zasad.</Text>
        </View>
        <Text style={styles.resetQuickArrow}>›</Text>
      </Pressable>

      <View style={styles.card}>
        <View style={styles.calendarHeader}>
          <Pressable onPress={() => setMonthOffset((value) => value - 1)} style={styles.calendarArrow}>
            <Text style={styles.calendarArrowText}>‹</Text>
          </Pressable>
          <View style={styles.flex}>
            <Text style={[styles.cardKicker, { textAlign: 'center' }]}>KALENDARZ DYSCYPLINY</Text>
            <Text style={styles.calendarMonth}>{monthTitle(calendar.month)}</Text>
          </View>
          <Pressable
            disabled={monthOffset >= 0}
            onPress={() => setMonthOffset((value) => Math.min(0, value + 1))}
            style={[styles.calendarArrow, monthOffset >= 0 && styles.calendarArrowDisabled]}
          >
            <Text style={styles.calendarArrowText}>›</Text>
          </Pressable>
        </View>
        <View style={styles.weekdayRow}>
          {['PN', 'WT', 'ŚR', 'CZ', 'PT', 'SB', 'ND'].map((day) => <Text key={day} style={styles.weekdayText}>{day}</Text>)}
        </View>
        <View style={styles.calendarGrid}>
          {calendar.cells.map((date, index) => {
            if (!date) return <View key={`empty-${index}`} style={styles.calendarCellWrap} />;
            const key = localDateKey(date);
            const entry = disciplineLog[key];
            const score = disciplineScore(entry);
            const weekend = !isTradingDay(date);
            const future = date > new Date(today.getFullYear(), today.getMonth(), today.getDate());
            const selected = key === selectedKey;
            const colorStyle = !entry
              ? styles.calendarEmpty
              : score === 100
                ? styles.calendarGreen
                : score >= 60
                  ? styles.calendarYellow
                  : styles.calendarRed;
            return (
              <View key={key} style={styles.calendarCellWrap}>
                <Pressable
                  disabled={weekend || future}
                  onPress={() => setSelectedKey(key)}
                  style={[
                    styles.calendarCell,
                    colorStyle,
                    weekend && styles.calendarWeekend,
                    future && styles.calendarFuture,
                    selected && styles.calendarSelected,
                  ]}
                >
                  <Text style={[styles.calendarDay, (weekend || future) && styles.calendarDayMuted]}>{date.getDate()}</Text>
                  {entry?.noTrade ? <Text style={styles.calendarNoTrade}>N</Text> : null}
                </Pressable>
              </View>
            );
          })}
        </View>
        <View style={styles.calendarLegend}>
          <LegendDot color={COLORS.green} label="100%" />
          <LegendDot color={COLORS.yellow} label="60–99%" />
          <LegendDot color={COLORS.red} label="0–59%" />
          <LegendDot color="#273140" label="brak wpisu" />
        </View>
      </View>

      <View style={styles.card}>
        <View style={styles.selectedDayHeader}>
          <View style={styles.flex}>
            <Text style={styles.cardKicker}>{selectedKey === todayKey ? 'DZISIAJ' : 'WYBRANY DZIEŃ'}</Text>
            <Text style={styles.selectedDayTitle}>{formatFullPolishDate(selectedDate)}</Text>
          </View>
          <Text style={[styles.selectedScore, selectedScore === 100 && { color: COLORS.green }]}>{selectedScore}%</Text>
        </View>

        {!isTradingDay(selectedDate) ? (
          <Text style={[styles.muted, { marginTop: 12 }]}>Weekend nie jest liczony do streaku tradingowego.</Text>
        ) : futureSelected ? (
          <Text style={[styles.muted, { marginTop: 12 }]}>Nie można uzupełniać przyszłych dni.</Text>
        ) : (
          <>
            <Pressable
              onPress={() => onToggleNoTrade(selectedKey)}
              style={[styles.noTradeButton, selectedEntry?.noTrade && styles.noTradeButtonActive]}
            >
              <View style={[styles.ruleCheck, selectedEntry?.noTrade && styles.ruleCheckDone]}>
                <Text style={styles.ruleCheckText}>{selectedEntry?.noTrade ? '✓' : ''}</Text>
              </View>
              <View style={styles.flex}>
                <Text style={[styles.noTradeTitle, selectedEntry?.noTrade && { color: COLORS.green }]}>NO TRADE — nie było mojego setupu</Text>
                <Text style={styles.noTradeSub}>Świadomy brak pozycji = 100% dyscypliny.</Text>
              </View>
            </Pressable>

            <View style={[styles.rulesList, selectedEntry?.noTrade && styles.disabledRules]}>
              {selectedRules.map((rule) => {
                const done = Boolean(selectedEntry?.[rule.id]);
                return (
                  <Pressable
                    key={rule.id}
                    disabled={Boolean(selectedEntry?.noTrade)}
                    onPress={() => onToggleRule(selectedKey, rule.id)}
                    style={[styles.ruleRow, done && styles.ruleRowDone]}
                  >
                    <View style={[styles.ruleCheck, done && styles.ruleCheckDone]}>
                      <Text style={styles.ruleCheckText}>{done ? '✓' : ''}</Text>
                    </View>
                    <Text style={[styles.ruleText, done && styles.ruleTextDone]}>{rule.label}</Text>
                  </Pressable>
                );
              })}
            </View>
          </>
        )}
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
                <View style={[
                  styles.scoreBar,
                  { height: Math.max(4, score * 0.42) },
                  score === 100 && styles.scoreBarPerfect,
                  score > 0 && score < 60 && styles.scoreBarBad,
                ]} />
                <Text style={styles.scoreDayValue}>{score}%</Text>
              </View>
            );
          })}
        </View>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardKicker}>MOJE ZASADY TRADINGOWE</Text>
        <Text style={[styles.muted, { marginTop: 6 }]}>Edytuj je pod swój plan. Zmiana nie psuje starych wyników — historia pamięta zestaw zasad użyty danego dnia.</Text>
        <View style={styles.rulesEditor}>
          {activeRules.map((rule, index) => (
            <View key={rule.id} style={styles.ruleEditRow}>
              <Text style={styles.ruleEditIndex}>{index + 1}</Text>
              <TextInput
                value={rule.label}
                onChangeText={(text) => onUpdateRule(rule.id, text)}
                style={styles.ruleEditInput}
                maxLength={90}
                placeholder="Treść zasady"
                placeholderTextColor="#5D6878"
              />
              <Pressable onPress={() => onArchiveRule(rule.id)} style={styles.ruleDeleteButton}>
                <Text style={styles.ruleDeleteText}>×</Text>
              </Pressable>
            </View>
          ))}
        </View>
        <View style={styles.addRuleRow}>
          <TextInput
            value={newRule}
            onChangeText={setNewRule}
            onSubmitEditing={submitRule}
            returnKeyType="done"
            style={styles.addRuleInput}
            placeholder="Dodaj własną zasadę..."
            placeholderTextColor="#5D6878"
            maxLength={90}
          />
          <Pressable onPress={submitRule} style={styles.smallGoldButton}>
            <Text style={styles.smallGoldButtonText}>DODAJ</Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

function LegendDot({ color, label }) {
  return (
    <View style={styles.legendItem}>
      <View style={[styles.legendDot, { backgroundColor: color }]} />
      <Text style={styles.legendText}>{label}</Text>
    </View>
  );
}

function ResetModeModal({ visible, onClose, whyText, rules }) {
  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.modalBackdrop}>
        <SafeAreaView style={styles.modalSheet}>
          <ScrollView contentContainerStyle={styles.modalContent} showsVerticalScrollIndicator={false}>
            <Text style={styles.resetEyebrow}>RESET</Text>
            <Text style={styles.resetTitle}>Nie musisz niczego odrabiać.</Text>
            <Text style={styles.resetLead}>Rynek nie wymaga od Ciebie kolejnego trade’u. Wymaga od Ciebie ochrony procesu.</Text>

            <View style={styles.resetStatement}>
              <Text style={styles.resetStatementBig}>NASTĘPNA DOBRA DECYZJA &gt; POPRZEDNI BŁĄD</Text>
              <Text style={styles.resetStatementSub}>Jeśli jesteś w tilcie, najlepszą decyzją może być zamknięcie platformy i powrót dopiero wtedy, gdy jesteś w stanie wykonać plan.</Text>
            </View>

            <View style={styles.card}>
              <Text style={styles.cardKicker}>PO CO TO ROBIĘ</Text>
              <Text style={styles.resetWhy}>{whyText || 'Uzupełnij swoje „dlaczego” w aplikacji.'}</Text>
            </View>

            <View style={styles.card}>
              <Text style={styles.cardKicker}>MOJE ZASADY</Text>
              <View style={styles.resetRules}>
                {rules.map((rule, index) => (
                  <View key={rule.id} style={styles.resetRuleRow}>
                    <Text style={styles.resetRuleNumber}>{index + 1}</Text>
                    <Text style={styles.resetRuleText}>{rule.label}</Text>
                  </View>
                ))}
              </View>
            </View>

            <Pressable onPress={onClose} style={styles.resetCloseButton}>
              <Text style={styles.resetCloseText}>WRACAM DO PROCESU</Text>
            </Pressable>
          </ScrollView>
        </SafeAreaView>
      </View>
    </Modal>
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
  loader: { alignItems: 'center', justifyContent: 'center' },
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

  resetQuickButton: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    borderWidth: 1, borderColor: '#71343A', backgroundColor: '#1B1115',
    borderRadius: 18, padding: 15,
  },
  resetQuickIcon: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#3A171C', alignItems: 'center', justifyContent: 'center' },
  resetQuickIconText: { color: COLORS.red, fontSize: 20, fontWeight: '900' },
  resetQuickTitle: { color: '#FFD3D6', fontSize: 11, fontWeight: '900', letterSpacing: 0.6 },
  resetQuickSub: { color: '#A98186', fontSize: 10, lineHeight: 15, marginTop: 3 },
  resetQuickArrow: { color: COLORS.red, fontSize: 28, fontWeight: '700' },

  screenTitleWrap: { marginBottom: 4, paddingHorizontal: 2 },
  screenKicker: { color: COLORS.gold, fontSize: 10, fontWeight: '900', letterSpacing: 2 },
  screenTitle: { color: COLORS.text, fontSize: 31, fontWeight: '900', letterSpacing: -1.2, marginTop: 4 },
  screenSubtitle: { color: COLORS.muted, fontSize: 13, lineHeight: 19, marginTop: 4 },
  progressHeader: { flexDirection: 'row', alignItems: 'baseline', gap: 8 },
  progressPercent: { color: COLORS.text, fontSize: 44, fontWeight: '900', letterSpacing: -2 },
  goalsList: { gap: 9 },
  goalRow: { backgroundColor: COLORS.panel, borderWidth: 1, borderColor: COLORS.border, borderRadius: 17, overflow: 'hidden' },
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

  processGoalsList: { marginTop: 15, gap: 12 },
  processGoalRow: { backgroundColor: '#0B1017', borderWidth: 1, borderColor: COLORS.border, borderRadius: 14, padding: 12 },
  processGoalTop: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  processGoalTitle: { color: COLORS.text, fontSize: 13, fontWeight: '800' },
  processGoalValue: { color: COLORS.muted, fontSize: 10, marginTop: 3 },
  processTargetInput: { width: 54, backgroundColor: '#151D29', color: COLORS.gold, borderRadius: 10, paddingVertical: 8, paddingHorizontal: 7, textAlign: 'center', fontSize: 14, fontWeight: '900' },

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
  backupButtons: { marginTop: 14, gap: 8 },
  primaryButton: { backgroundColor: COLORS.gold, borderRadius: 12, paddingVertical: 13, alignItems: 'center' },
  primaryButtonText: { color: '#151108', fontSize: 11, fontWeight: '900', letterSpacing: 0.6 },
  secondaryButton: { borderWidth: 1, borderColor: COLORS.border, backgroundColor: '#0B1017', borderRadius: 12, paddingVertical: 13, alignItems: 'center' },
  secondaryButtonText: { color: COLORS.text, fontSize: 11, fontWeight: '900', letterSpacing: 0.6 },

  scoreCard: { justifyContent: 'center' },
  scoreNumber: { color: COLORS.text, fontSize: 48, fontWeight: '900', letterSpacing: -2, marginTop: 8 },
  rulesList: { gap: 8, marginTop: 14 },
  disabledRules: { opacity: 0.36 },
  ruleRow: { flexDirection: 'row', alignItems: 'center', gap: 11, backgroundColor: '#0B1017', borderWidth: 1, borderColor: COLORS.border, borderRadius: 14, padding: 13 },
  ruleRowDone: { backgroundColor: '#102019', borderColor: '#285F48' },
  ruleCheck: { width: 28, height: 28, borderRadius: 9, borderWidth: 1.5, borderColor: '#4A5668', alignItems: 'center', justifyContent: 'center' },
  ruleCheckDone: { backgroundColor: COLORS.green, borderColor: COLORS.green },
  ruleCheckText: { color: '#07120D', fontSize: 15, fontWeight: '900' },
  ruleText: { color: COLORS.text, fontSize: 14, fontWeight: '700', flex: 1 },
  ruleTextDone: { color: '#C6D9CF' },
  noTradeButton: { flexDirection: 'row', alignItems: 'center', gap: 11, borderWidth: 1, borderColor: '#31404F', borderRadius: 14, padding: 13, marginTop: 14, backgroundColor: '#0A1017' },
  noTradeButtonActive: { borderColor: '#285F48', backgroundColor: '#102019' },
  noTradeTitle: { color: COLORS.text, fontSize: 13, fontWeight: '900' },
  noTradeSub: { color: COLORS.muted, fontSize: 10, marginTop: 3 },
  selectedDayHeader: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  selectedDayTitle: { color: COLORS.text, fontSize: 18, fontWeight: '900', marginTop: 4 },
  selectedScore: { color: COLORS.text, fontSize: 28, fontWeight: '900' },

  calendarHeader: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  calendarArrow: { width: 36, height: 36, borderRadius: 12, backgroundColor: '#0B1017', borderWidth: 1, borderColor: COLORS.border, alignItems: 'center', justifyContent: 'center' },
  calendarArrowDisabled: { opacity: 0.25 },
  calendarArrowText: { color: COLORS.text, fontSize: 26, lineHeight: 28 },
  calendarMonth: { color: COLORS.text, textAlign: 'center', fontSize: 16, fontWeight: '900', marginTop: 4 },
  weekdayRow: { flexDirection: 'row', marginTop: 16, marginBottom: 6 },
  weekdayText: { width: '14.2857%', textAlign: 'center', color: COLORS.muted, fontSize: 8, fontWeight: '900' },
  calendarGrid: { flexDirection: 'row', flexWrap: 'wrap' },
  calendarCellWrap: { width: '14.2857%', aspectRatio: 1 },
  calendarCell: { flex: 1, margin: 2, borderRadius: 10, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#273140', backgroundColor: '#121923' },
  calendarEmpty: { backgroundColor: '#121923', borderColor: '#273140' },
  calendarGreen: { backgroundColor: '#133426', borderColor: '#2E7655' },
  calendarYellow: { backgroundColor: '#392F17', borderColor: '#80692C' },
  calendarRed: { backgroundColor: '#36181C', borderColor: '#7D333A' },
  calendarWeekend: { backgroundColor: '#0B0F15', borderColor: '#171E28' },
  calendarFuture: { opacity: 0.35 },
  calendarSelected: { borderColor: COLORS.blue, borderWidth: 2 },
  calendarDay: { color: COLORS.text, fontSize: 12, fontWeight: '900' },
  calendarDayMuted: { color: '#515D6E' },
  calendarNoTrade: { color: COLORS.green, fontSize: 7, fontWeight: '900', marginTop: 1 },
  calendarLegend: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 12 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  legendDot: { width: 8, height: 8, borderRadius: 4 },
  legendText: { color: COLORS.muted, fontSize: 9 },

  scoreHistory: { flexDirection: 'row', alignItems: 'flex-end', gap: 5, height: 105, marginTop: 18 },
  scoreDay: { flex: 1, alignItems: 'center', justifyContent: 'flex-end' },
  scoreDayName: { color: COLORS.muted, fontSize: 8, fontWeight: '900' },
  scoreDayDate: { color: COLORS.text, fontSize: 10, fontWeight: '800', marginTop: 2 },
  scoreBar: { width: 12, borderRadius: 6, backgroundColor: COLORS.yellow, marginVertical: 5 },
  scoreBarPerfect: { backgroundColor: COLORS.green },
  scoreBarBad: { backgroundColor: COLORS.red },
  scoreDayValue: { color: COLORS.muted, fontSize: 8 },

  rulesEditor: { gap: 8, marginTop: 14 },
  ruleEditRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  ruleEditIndex: { color: COLORS.gold, width: 18, textAlign: 'center', fontSize: 10, fontWeight: '900' },
  ruleEditInput: { flex: 1, color: COLORS.text, backgroundColor: '#0B1017', borderWidth: 1, borderColor: COLORS.border, borderRadius: 11, paddingHorizontal: 11, paddingVertical: 10, fontSize: 12, fontWeight: '700' },
  ruleDeleteButton: { width: 34, height: 34, borderRadius: 10, backgroundColor: '#251317', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#5E2B31' },
  ruleDeleteText: { color: COLORS.red, fontSize: 20, lineHeight: 21, fontWeight: '900' },
  addRuleRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 12 },
  addRuleInput: { flex: 1, color: COLORS.text, backgroundColor: '#0B1017', borderWidth: 1, borderColor: COLORS.border, borderRadius: 11, paddingHorizontal: 11, paddingVertical: 10, fontSize: 12 },

  modalBackdrop: { flex: 1, backgroundColor: '#000000CC', justifyContent: 'flex-end' },
  modalSheet: { maxHeight: '92%', backgroundColor: COLORS.bg, borderTopLeftRadius: 26, borderTopRightRadius: 26, borderWidth: 1, borderColor: '#3B2025' },
  modalContent: { padding: 20, paddingBottom: 34, gap: 12 },
  resetEyebrow: { color: COLORS.red, fontSize: 11, fontWeight: '900', letterSpacing: 3 },
  resetTitle: { color: COLORS.text, fontSize: 32, lineHeight: 37, fontWeight: '900', letterSpacing: -1.2 },
  resetLead: { color: '#B7C0CE', fontSize: 14, lineHeight: 21 },
  resetStatement: { backgroundColor: '#1D1115', borderWidth: 1, borderColor: '#673038', borderRadius: 18, padding: 16 },
  resetStatementBig: { color: '#FFD0D4', fontSize: 15, lineHeight: 22, fontWeight: '900' },
  resetStatementSub: { color: '#A98186', fontSize: 12, lineHeight: 18, marginTop: 8 },
  resetWhy: { color: COLORS.text, fontSize: 15, lineHeight: 23, fontWeight: '700', marginTop: 10 },
  resetRules: { gap: 9, marginTop: 12 },
  resetRuleRow: { flexDirection: 'row', gap: 10, alignItems: 'flex-start' },
  resetRuleNumber: { width: 24, height: 24, borderRadius: 12, textAlign: 'center', textAlignVertical: 'center', color: '#151108', backgroundColor: COLORS.gold, fontSize: 10, fontWeight: '900' },
  resetRuleText: { flex: 1, color: COLORS.text, fontSize: 13, lineHeight: 19, fontWeight: '700' },
  resetCloseButton: { backgroundColor: COLORS.gold, borderRadius: 14, paddingVertical: 15, alignItems: 'center', marginTop: 4 },
  resetCloseText: { color: '#151108', fontSize: 12, fontWeight: '900', letterSpacing: 0.8 },

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
