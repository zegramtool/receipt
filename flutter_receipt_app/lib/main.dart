import 'package:flutter/material.dart';
import 'package:flutter_localizations/flutter_localizations.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'screens/home_screen.dart';
import 'services/storage_service.dart';
import 'models/app_theme.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();
  
  // ローカルストレージサービスの初期化
  final prefs = await SharedPreferences.getInstance();
  StorageService.initialize(prefs);
  
  runApp(const ReceiptGeneratorApp());
}

class ReceiptGeneratorApp extends StatelessWidget {
  const ReceiptGeneratorApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: '領収書発行アプリ',
      debugShowCheckedModeBanner: false,
      theme: AppTheme.lightTheme,
      darkTheme: AppTheme.darkTheme,
      themeMode: ThemeMode.system,
      
      // 日本語ローカリゼーション
      localizationsDelegates: const [
        GlobalMaterialLocalizations.delegate,
        GlobalWidgetsLocalizations.delegate,
        GlobalCupertinoLocalizations.delegate,
      ],
      supportedLocales: const [
        Locale('ja', 'JP'),
        Locale('en', 'US'),
      ],
      locale: const Locale('ja', 'JP'),
      
      home: const HomeScreen(),
    );
  }
}