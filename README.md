# Motivation & Goals Tracker — Android / React Native

Ciemna, minimalistyczna aplikacja motywacyjna dla młodego tradera. Projekt korzysta z **React Native przez Expo SDK 57** i zapisuje dane lokalnie przez AsyncStorage.

## Funkcje

- duży licznik dni w grze od daty startu (domyślnie 2026-02-01, edytowalny)
- roadmapa celów z checkboxami:
  - Eval zdany
  - Funded konto
  - Pierwszy payout
  - $1k miesięcznie
  - $10k miesięcznie
  - Six figures
  - Mama na emeryturze
  - BMW M4
- stabilny cytat motywacyjny zmieniający się raz dziennie
- ekran **Moje dlaczego** z edytowalnym tekstem i zdjęciem
- streak dni, w których trzymane były zasady tradingowe
- możliwość poprawienia check-in z ostatnich 14 dni
- dane zapisują się lokalnie na urządzeniu

## Normalne aktualizacje APK

Projekt jest przygotowany od początku do **stałego podpisu release**. Dzięki temu kolejne wersje mogą instalować się na poprzednią bez kasowania danych.

Ważne: zachowaj prywatną paczkę `MOTIVATION_SIGNING_PRIVATE.zip`. Klucza nie wolno zgubić ani publikować.

### 1. Wrzuć projekt do nowego repo GitHub

Wgraj wszystkie pliki z tego folderu. Jeśli Windows/GitHub nie przeniesie ukrytego folderu `.github`, utwórz ręcznie:

`.github/workflows/build-apk.yml`

i wklej treść z widocznego pliku `BUILD_APK_YAML.txt`.

### 2. Dodaj 2 GitHub Secrets

W repo:

`Settings -> Secrets and variables -> Actions -> New repository secret`

Dodaj:

- `MOTIVATION_KEYSTORE_BASE64` — wartość z prywatnego pliku `MOTIVATION_KEYSTORE_BASE64.txt`
- `MOTIVATION_KEYSTORE_PASSWORD` — wartość z prywatnego pliku `MOTIVATION_KEYSTORE_PASSWORD.txt`

### 3. Zbuduj APK

Po commicie workflow uruchomi się automatycznie. W `Actions` otwórz zielony build i pobierz artifact:

`Motivation-Goals-APK`

W środku będzie `app-release.apk`.

### 4. Kolejne wersje

Nie zmieniaj package ID `pl.trader.motivationgoals` ani klucza podpisu. Workflow nadaje automatycznie rosnący `versionCode`, więc przyszłe APK będą normalnymi aktualizacjami.
