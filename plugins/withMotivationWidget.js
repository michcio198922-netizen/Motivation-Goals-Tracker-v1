const { withAndroidManifest, withDangerousMod } = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');

const PACKAGE_NAME = 'pl.trader.motivationgoals';

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

function writeFile(file, contents) {
  ensureDir(path.dirname(file));
  fs.writeFileSync(file, contents, 'utf8');
}

function addManifestReceiver(config) {
  return withAndroidManifest(config, (config) => {
    const manifest = config.modResults.manifest;
    const application = manifest.application?.[0];
    if (!application) return config;

    application.receiver = application.receiver || [];
    const receiverName = '.MotivationWidgetProvider';
    const exists = application.receiver.some((receiver) => receiver?.$?.['android:name'] === receiverName);
    if (!exists) {
      application.receiver.push({
        $: {
          'android:name': receiverName,
          'android:exported': 'true',
          'android:label': 'Motivation & Goals',
        },
        'intent-filter': [
          {
            action: [
              { $: { 'android:name': 'android.appwidget.action.APPWIDGET_UPDATE' } },
            ],
          },
        ],
        'meta-data': [
          {
            $: {
              'android:name': 'android.appwidget.provider',
              'android:resource': '@xml/motivation_widget_info',
            },
          },
        ],
      });
    }
    return config;
  });
}

function addNativeFiles(config) {
  return withDangerousMod(config, ['android', async (config) => {
    const projectRoot = config.modRequest.projectRoot;
    const androidRoot = path.join(projectRoot, 'android');
    const javaDir = path.join(androidRoot, 'app', 'src', 'main', 'java', ...PACKAGE_NAME.split('.'));
    const resDir = path.join(androidRoot, 'app', 'src', 'main', 'res');

    writeFile(path.join(javaDir, 'MotivationWidgetProvider.java'), `package ${PACKAGE_NAME};

import android.app.PendingIntent;
import android.appwidget.AppWidgetManager;
import android.appwidget.AppWidgetProvider;
import android.content.Context;
import android.content.Intent;
import android.widget.RemoteViews;

import org.json.JSONObject;

import java.io.BufferedReader;
import java.io.File;
import java.io.FileReader;
import java.util.Calendar;

public class MotivationWidgetProvider extends AppWidgetProvider {
  private static final String[] QUOTES = new String[] {
    "Nie potrzebujesz idealnego dnia. Potrzebujesz konsekwentnego procesu.",
    "Rynek nie płaci za emocje. Płaci za egzekucję.",
    "Jedna dobra decyzja nie buduje kariery. Tysiąc powtarzalnych decyzji — tak.",
    "Dyscyplina jest przewagą wtedy, gdy nikt jej nie widzi.",
    "Nie ścigaj pieniędzy. Ścigaj jakość wykonania.",
    "Najlepszy trade to czasem ten, którego nie wziąłeś.",
    "Twoim zadaniem nie jest przewidzieć rynek. Twoim zadaniem jest wykonać plan.",
    "Małe przewagi, powtarzane wystarczająco długo, zmieniają wszystko.",
    "Kapitał rośnie wolniej niż ego chce — i szybciej niż brak dyscypliny pozwala.",
    "Zysk jest efektem procesu. Proces jest pod twoją kontrolą.",
    "Nie oceniaj dnia po P&L. Oceń go po jakości decyzji.",
    "Cierpliwość przed wejściem jest częścią setupu.",
    "Profesjonalizm zaczyna się wtedy, gdy przestajesz negocjować z własnymi zasadami.",
    "Nie musisz wygrać dzisiaj. Musisz zostać w grze wystarczająco długo.",
    "Największy edge często wygląda jak nuda: czekanie, selekcja i brak FOMO.",
    "Każdy dzień zgodny z planem to głos oddany na tradera, którym chcesz zostać.",
    "Strata zgodna z planem jest tańsza niż zysk zbudowany na złym nawyku.",
    "Twoja przyszłość nie potrzebuje motywacji co godzinę. Potrzebuje systemu.",
    "Nie porównuj swojego rozdziału pierwszego do czyjegoś rozdziału dziesiątego.",
    "Cel jest duży. Dzisiejsze zadanie ma być proste.",
    "Brak setupu też jest informacją. Nie musisz wymuszać transakcji.",
    "Spokój przed kliknięciem jest częścią przewagi.",
    "Nie odbieraj sobie jutra próbując odrobić dzisiaj.",
    "Dobry trader potrafi nic nie zrobić, kiedy rynek nic nie daje.",
    "Najpierw przetrwaj. Potem bądź konsekwentny. Dopiero potem skaluj.",
    "Twoja przewaga nie potrzebuje więcej trade’ów. Potrzebuje lepszej selekcji.",
    "Dzień bez trade’u może być perfekcyjnie wykonanym dniem.",
    "Proces nie obiecuje zysku dziś. Daje szansę na wynik w długim terminie.",
    "Najdroższy trade to ten, który bierzesz tylko dlatego, że chcesz coś poczuć.",
    "Nie walcz z rynkiem. Zarządzaj sobą.",
    "Jakość wejścia zaczyna się od jakości czekania.",
    "Prawdziwy progres jest nudny: zasada po zasadzie, dzień po dniu.",
    "Nie potrzebujesz zemsty na rynku. Potrzebujesz następnej dobrej decyzji.",
    "Rynek będzie jutro. Kapitał i głowa też muszą tam dotrzeć.",
    "Konsekwencja nie wygląda spektakularnie, dopóki nie zobaczysz jej efektów.",
    "Jeśli nie ma twojego setupu, twoim setupem jest brak pozycji.",
    "Nie zwiększaj aktywności tylko dlatego, że wynik ci się nie podoba.",
    "Najlepsza pewność siebie pochodzi z dotrzymanych sobie zasad.",
    "Nie kontrolujesz wyniku pojedynczego trade’u. Kontrolujesz sposób, w jaki go bierzesz.",
    "Zanim klikniesz, zapytaj: czy to mój plan, czy moja emocja?"
  };

  @Override
  public void onUpdate(Context context, AppWidgetManager appWidgetManager, int[] appWidgetIds) {
    for (int appWidgetId : appWidgetIds) {
      updateWidget(context, appWidgetManager, appWidgetId);
    }
  }

  private static int quoteIndex(Calendar cal) {
    int year = cal.get(Calendar.YEAR);
    int day = cal.get(Calendar.DAY_OF_YEAR);
    long value = ((long) year * 397L) + ((long) day * 37L);
    return (int) (Math.abs(value) % QUOTES.length);
  }

  private static String quoteForToday() {
    Calendar today = Calendar.getInstance();
    int index = quoteIndex(today);
    Calendar yesterday = (Calendar) today.clone();
    yesterday.add(Calendar.DAY_OF_YEAR, -1);
    if (index == quoteIndex(yesterday)) index = (index + 1) % QUOTES.length;
    return QUOTES[index];
  }

  private static JSONObject readState(Context context) {
    File file = new File(context.getFilesDir(), "widget_state.json");
    if (!file.exists()) return null;
    try {
      StringBuilder builder = new StringBuilder();
      BufferedReader reader = new BufferedReader(new FileReader(file));
      String line;
      while ((line = reader.readLine()) != null) builder.append(line);
      reader.close();
      return new JSONObject(builder.toString());
    } catch (Exception ignored) {
      return null;
    }
  }

  private static void updateWidget(Context context, AppWidgetManager manager, int appWidgetId) {
    RemoteViews views = new RemoteViews(context.getPackageName(), R.layout.motivation_widget);
    JSONObject state = readState(context);

    String score = "—";
    String streak = "—";
    if (state != null) {
      score = state.optInt("score", 0) + "%";
      streak = String.valueOf(state.optInt("streak", 0));
    }

    views.setTextViewText(R.id.widget_quote, quoteForToday());
    views.setTextViewText(R.id.widget_score, score);
    views.setTextViewText(R.id.widget_streak, streak);

    Intent launchIntent = context.getPackageManager().getLaunchIntentForPackage(context.getPackageName());
    if (launchIntent != null) {
      launchIntent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP);
      PendingIntent pendingIntent = PendingIntent.getActivity(
        context,
        0,
        launchIntent,
        PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
      );
      views.setOnClickPendingIntent(R.id.widget_root, pendingIntent);
    }

    manager.updateAppWidget(appWidgetId, views);
  }
}
`);

    writeFile(path.join(resDir, 'layout', 'motivation_widget.xml'), `<?xml version="1.0" encoding="utf-8"?>
<LinearLayout xmlns:android="http://schemas.android.com/apk/res/android"
    android:id="@+id/widget_root"
    android:layout_width="match_parent"
    android:layout_height="match_parent"
    android:orientation="vertical"
    android:padding="14dp"
    android:gravity="center_vertical"
    android:background="@drawable/motivation_widget_background">

    <TextView
        android:layout_width="wrap_content"
        android:layout_height="wrap_content"
        android:text="MOTIVATION &amp; GOALS"
        android:textColor="#D7AE55"
        android:textSize="10sp"
        android:textStyle="bold"
        android:letterSpacing="0.10" />

    <TextView
        android:id="@+id/widget_quote"
        android:layout_width="match_parent"
        android:layout_height="wrap_content"
        android:layout_marginTop="7dp"
        android:maxLines="3"
        android:ellipsize="end"
        android:textColor="#F4F7FB"
        android:textSize="14sp"
        android:textStyle="bold" />

    <LinearLayout
        android:layout_width="match_parent"
        android:layout_height="wrap_content"
        android:layout_marginTop="10dp"
        android:orientation="horizontal">

        <LinearLayout
            android:layout_width="0dp"
            android:layout_height="wrap_content"
            android:layout_weight="1"
            android:orientation="vertical">
            <TextView
                android:layout_width="wrap_content"
                android:layout_height="wrap_content"
                android:text="DYSCYPLINA"
                android:textColor="#8490A3"
                android:textSize="9sp"
                android:textStyle="bold" />
            <TextView
                android:id="@+id/widget_score"
                android:layout_width="wrap_content"
                android:layout_height="wrap_content"
                android:layout_marginTop="1dp"
                android:textColor="#38C982"
                android:textSize="22sp"
                android:textStyle="bold" />
        </LinearLayout>

        <LinearLayout
            android:layout_width="0dp"
            android:layout_height="wrap_content"
            android:layout_weight="1"
            android:orientation="vertical">
            <TextView
                android:layout_width="wrap_content"
                android:layout_height="wrap_content"
                android:text="STREAK"
                android:textColor="#8490A3"
                android:textSize="9sp"
                android:textStyle="bold" />
            <TextView
                android:id="@+id/widget_streak"
                android:layout_width="wrap_content"
                android:layout_height="wrap_content"
                android:layout_marginTop="1dp"
                android:textColor="#F4F7FB"
                android:textSize="22sp"
                android:textStyle="bold" />
        </LinearLayout>
    </LinearLayout>
</LinearLayout>
`);

    writeFile(path.join(resDir, 'drawable', 'motivation_widget_background.xml'), `<?xml version="1.0" encoding="utf-8"?>
<shape xmlns:android="http://schemas.android.com/apk/res/android" android:shape="rectangle">
    <solid android:color="#101620" />
    <corners android:radius="20dp" />
    <stroke android:width="1dp" android:color="#263244" />
</shape>
`);

    writeFile(path.join(resDir, 'xml', 'motivation_widget_info.xml'), `<?xml version="1.0" encoding="utf-8"?>
<appwidget-provider xmlns:android="http://schemas.android.com/apk/res/android"
    android:minWidth="250dp"
    android:minHeight="110dp"
    android:minResizeWidth="180dp"
    android:minResizeHeight="90dp"
    android:updatePeriodMillis="1800000"
    android:initialLayout="@layout/motivation_widget"
    android:resizeMode="horizontal|vertical"
    android:widgetCategory="home_screen"
    android:description="@string/motivation_widget_description" />
`);

    const stringsPath = path.join(resDir, 'values', 'strings.xml');
    if (fs.existsSync(stringsPath)) {
      let strings = fs.readFileSync(stringsPath, 'utf8');
      if (!strings.includes('motivation_widget_description')) {
        strings = strings.replace('</resources>', '  <string name="motivation_widget_description">Cytat dnia, dyscyplina i streak</string>\n</resources>');
        fs.writeFileSync(stringsPath, strings, 'utf8');
      }
    } else {
      writeFile(stringsPath, `<?xml version="1.0" encoding="utf-8"?>\n<resources>\n  <string name="motivation_widget_description">Cytat dnia, dyscyplina i streak</string>\n</resources>\n`);
    }

    return config;
  }]);
}

module.exports = function withMotivationWidget(config) {
  config = addManifestReceiver(config);
  config = addNativeFiles(config);
  return config;
};
