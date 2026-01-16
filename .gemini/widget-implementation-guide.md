# 📱 Widget de Próximo Jogo - Implementação

Este documento explica como implementar o widget nativo de próximo jogo para Android e iOS.

## 🤖 Android Implementation

### 1. Adicionar dependências no `android/app/build.gradle`:

```gradle
dependencies {
    // Widget dependencies
    implementation 'androidx.work:work-runtime-ktx:2.8.1'
    implementation 'com.google.code.gson:gson:2.10.1'
}
```

### 2. Criar o Widget Provider (`android/app/src/main/java/.../NextMatchWidget.kt`):

```kotlin
package com.futscore

import android.appwidget.AppWidgetManager
import android.appwidget.AppWidgetProvider
import android.content.Context
import android.widget.RemoteViews
import android.content.SharedPreferences
import com.google.gson.Gson

data class WidgetData(
    val homeTeamName: String,
    val homeTeamLogo: String,
    val awayTeamName: String,
    val awayTeamLogo: String,
    val matchDate: String,
    val matchTime: String,
    val countdown: String,
    val competitionName: String
)

class NextMatchWidget : AppWidgetProvider() {
    override fun onUpdate(
        context: Context,
        appWidgetManager: AppWidgetManager,
        appWidgetIds: IntArray
    ) {
        for (appWidgetId in appWidgetIds) {
            updateAppWidget(context, appWidgetManager, appWidgetId)
        }
    }

    companion object {
        fun updateAppWidget(
            context: Context,
            appWidgetManager: AppWidgetManager,
            appWidgetId: Int
        ) {
            val prefs = context.getSharedPreferences(
                "com.futscore.widget", 
                Context.MODE_PRIVATE
            )
            
            val dataJson = prefs.getString("widget_data", null)
            val views = RemoteViews(context.packageName, R.layout.widget_next_match)
            
            if (dataJson != null) {
                val data = Gson().fromJson(dataJson, WidgetData::class.java)
                
                views.setTextViewText(R.id.home_team_name, data.homeTeamName)
                views.setTextViewText(R.id.away_team_name, data.awayTeamName)
                views.setTextViewText(R.id.match_time, data.matchTime)
                views.setTextViewText(R.id.countdown_text, data.countdown)
                views.setTextViewText(R.id.match_date, data.matchDate)
                
                // Load images using Glide or Coil
                // views.setImageViewUri(R.id.home_team_logo, Uri.parse(data.homeTeamLogo))
            } else {
                views.setTextViewText(R.id.countdown_text, "Sem jogos")
            }
            
            appWidgetManager.updateAppWidget(appWidgetId, views)
        }
    }
}
```

### 3. Criar o layout do widget (`android/app/src/main/res/layout/widget_next_match.xml`):

```xml
<?xml version="1.0" encoding="utf-8"?>
<LinearLayout xmlns:android="http://schemas.android.com/apk/res/android"
    android:layout_width="match_parent"
    android:layout_height="match_parent"
    android:background="@drawable/widget_background"
    android:orientation="vertical"
    android:padding="16dp">

    <!-- Countdown Badge -->
    <TextView
        android:id="@+id/countdown_text"
        android:layout_width="wrap_content"
        android:layout_height="wrap_content"
        android:background="@drawable/countdown_badge"
        android:paddingHorizontal="12dp"
        android:paddingVertical="4dp"
        android:text="2d 5h"
        android:textColor="#22c55e"
        android:textSize="14sp"
        android:textStyle="bold" />

    <!-- Teams Row -->
    <LinearLayout
        android:layout_width="match_parent"
        android:layout_height="wrap_content"
        android:layout_marginTop="12dp"
        android:gravity="center"
        android:orientation="horizontal">

        <!-- Home Team -->
        <LinearLayout
            android:layout_width="0dp"
            android:layout_height="wrap_content"
            android:layout_weight="1"
            android:gravity="center"
            android:orientation="vertical">

            <ImageView
                android:id="@+id/home_team_logo"
                android:layout_width="48dp"
                android:layout_height="48dp" />

            <TextView
                android:id="@+id/home_team_name"
                android:layout_width="wrap_content"
                android:layout_height="wrap_content"
                android:layout_marginTop="4dp"
                android:text="FLA"
                android:textColor="#FFFFFF"
                android:textSize="14sp"
                android:textStyle="bold" />
        </LinearLayout>

        <!-- VS -->
        <LinearLayout
            android:layout_width="wrap_content"
            android:layout_height="wrap_content"
            android:gravity="center"
            android:orientation="vertical">

            <TextView
                android:layout_width="wrap_content"
                android:layout_height="wrap_content"
                android:text="VS"
                android:textColor="#666666"
                android:textSize="12sp" />

            <TextView
                android:id="@+id/match_time"
                android:layout_width="wrap_content"
                android:layout_height="wrap_content"
                android:text="16:00"
                android:textColor="#FFFFFF"
                android:textSize="18sp"
                android:textStyle="bold" />
        </LinearLayout>

        <!-- Away Team -->
        <LinearLayout
            android:layout_width="0dp"
            android:layout_height="wrap_content"
            android:layout_weight="1"
            android:gravity="center"
            android:orientation="vertical">

            <ImageView
                android:id="@+id/away_team_logo"
                android:layout_width="48dp"
                android:layout_height="48dp" />

            <TextView
                android:id="@+id/away_team_name"
                android:layout_width="wrap_content"
                android:layout_height="wrap_content"
                android:layout_marginTop="4dp"
                android:text="PAL"
                android:textColor="#FFFFFF"
                android:textSize="14sp"
                android:textStyle="bold" />
        </LinearLayout>
    </LinearLayout>

    <!-- Date -->
    <TextView
        android:id="@+id/match_date"
        android:layout_width="wrap_content"
        android:layout_height="wrap_content"
        android:layout_gravity="center"
        android:layout_marginTop="12dp"
        android:text="Dom, 19 Jan"
        android:textColor="#888888"
        android:textSize="12sp" />

</LinearLayout>
```

### 4. Registrar no AndroidManifest.xml:

```xml
<receiver android:name=".NextMatchWidget">
    <intent-filter>
        <action android:name="android.appwidget.action.APPWIDGET_UPDATE" />
    </intent-filter>
    <meta-data
        android:name="android.appwidget.provider"
        android:resource="@xml/widget_next_match_info" />
</receiver>
```

### 5. Widget info (`android/app/src/main/res/xml/widget_next_match_info.xml`):

```xml
<?xml version="1.0" encoding="utf-8"?>
<appwidget-provider xmlns:android="http://schemas.android.com/apk/res/android"
    android:minWidth="250dp"
    android:minHeight="110dp"
    android:updatePeriodMillis="1800000"
    android:previewImage="@drawable/widget_preview"
    android:initialLayout="@layout/widget_next_match"
    android:resizeMode="horizontal|vertical"
    android:widgetCategory="home_screen" />
```

---

## 🍎 iOS Implementation (WidgetKit)

### 1. Adicionar Widget Extension no Xcode:
- File > New > Target > Widget Extension
- Name: "FutScoreWidget"

### 2. Criar o widget (`FutScoreWidget.swift`):

```swift
import WidgetKit
import SwiftUI

struct NextMatchEntry: TimelineEntry {
    let date: Date
    let homeTeam: String
    let awayTeam: String
    let matchTime: String
    let countdown: String
}

struct Provider: TimelineProvider {
    func placeholder(in context: Context) -> NextMatchEntry {
        NextMatchEntry(
            date: Date(),
            homeTeam: "FLA",
            awayTeam: "PAL",
            matchTime: "16:00",
            countdown: "2d 5h"
        )
    }

    func getSnapshot(in context: Context, completion: @escaping (NextMatchEntry) -> ()) {
        let entry = placeholder(in: context)
        completion(entry)
    }

    func getTimeline(in context: Context, completion: @escaping (Timeline<Entry>) -> ()) {
        // Read from App Groups shared storage
        if let data = loadWidgetData() {
            let entry = NextMatchEntry(
                date: Date(),
                homeTeam: data.homeTeam,
                awayTeam: data.awayTeam,
                matchTime: data.matchTime,
                countdown: data.countdown
            )
            let timeline = Timeline(entries: [entry], policy: .after(Date().addingTimeInterval(300)))
            completion(timeline)
        }
    }
    
    func loadWidgetData() -> WidgetData? {
        let userDefaults = UserDefaults(suiteName: "group.com.futscore.widget")
        guard let jsonString = userDefaults?.string(forKey: "widget_data"),
              let data = jsonString.data(using: .utf8) else {
            return nil
        }
        return try? JSONDecoder().decode(WidgetData.self, from: data)
    }
}

struct FutScoreWidgetEntryView : View {
    var entry: Provider.Entry

    var body: some View {
        ZStack {
            LinearGradient(
                gradient: Gradient(colors: [Color(hex: "#1a1a2e"), Color(hex: "#0f0f1a")]),
                startPoint: .top,
                endPoint: .bottom
            )
            
            VStack(spacing: 8) {
                // Countdown
                HStack {
                    Image(systemName: "clock.fill")
                        .foregroundColor(Color(hex: "#22c55e"))
                    Text(entry.countdown)
                        .font(.caption)
                        .bold()
                        .foregroundColor(Color(hex: "#22c55e"))
                }
                .padding(.horizontal, 8)
                .padding(.vertical, 4)
                .background(Color(hex: "#22c55e").opacity(0.2))
                .cornerRadius(8)
                
                // Teams
                HStack {
                    Text(entry.homeTeam)
                        .font(.headline)
                        .foregroundColor(.white)
                    
                    Text(entry.matchTime)
                        .font(.title3)
                        .bold()
                        .foregroundColor(.white)
                    
                    Text(entry.awayTeam)
                        .font(.headline)
                        .foregroundColor(.white)
                }
            }
        }
    }
}

@main
struct FutScoreWidget: Widget {
    let kind: String = "FutScoreWidget"

    var body: some WidgetConfiguration {
        StaticConfiguration(kind: kind, provider: Provider()) { entry in
            FutScoreWidgetEntryView(entry: entry)
        }
        .configurationDisplayName("Próximo Jogo")
        .description("Veja o próximo jogo do seu time favorito")
        .supportedFamilies([.systemSmall, .systemMedium])
    }
}
```

---

## 🔗 Native Module para Comunicação

Crie um módulo nativo para atualizar os widgets do React Native:

### Android (`android/app/src/main/java/.../WidgetModule.kt`):

```kotlin
package com.futscore

import android.appwidget.AppWidgetManager
import android.content.ComponentName
import android.content.Context
import android.content.Intent
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod

class WidgetModule(reactContext: ReactApplicationContext) : 
    ReactContextBaseJavaModule(reactContext) {
    
    override fun getName() = "WidgetModule"
    
    @ReactMethod
    fun updateWidget() {
        val context = reactApplicationContext
        val intent = Intent(context, NextMatchWidget::class.java)
        intent.action = AppWidgetManager.ACTION_APPWIDGET_UPDATE
        
        val ids = AppWidgetManager.getInstance(context)
            .getAppWidgetIds(ComponentName(context, NextMatchWidget::class.java))
        intent.putExtra(AppWidgetManager.EXTRA_APPWIDGET_IDS, ids)
        
        context.sendBroadcast(intent)
    }
}
```

---

## 📦 Próximos Passos

1. Implementar os arquivos nativos acima
2. Registrar o módulo nativo no React Native
3. Configurar App Groups no iOS para compartilhar dados
4. Testar o widget em diferentes tamanhos
5. Adicionar imagens dos escudos (requer caching nativo)
