import 'dart:convert';
import 'package:shared_preferences/shared_preferences.dart';
import '../models/issuer.dart';
import '../models/receipt.dart';

class StorageService {
  static SharedPreferences? _prefs;
  
  static const String _issuersKey = 'issuers';
  static const String _receiptsKey = 'receipts';
  static const String _lastIssuerIdKey = 'last_issuer_id';
  
  static void initialize(SharedPreferences prefs) {
    _prefs = prefs;
  }
  
  static SharedPreferences get prefs {
    if (_prefs == null) {
      throw Exception('StorageService not initialized');
    }
    return _prefs!;
  }

  // 発行者データの管理
  static Future<List<Issuer>> getIssuers() async {
    final String? issuersJson = prefs.getString(_issuersKey);
    if (issuersJson == null) {
      return _getDefaultIssuers();
    }
    
    try {
      final List<dynamic> issuersData = jsonDecode(issuersJson);
      return issuersData.map((data) => Issuer.fromJson(data)).toList();
    } catch (e) {
      print('Error loading issuers: $e');
      return _getDefaultIssuers();
    }
  }
  
  static Future<void> saveIssuers(List<Issuer> issuers) async {
    final String issuersJson = jsonEncode(issuers.map((i) => i.toJson()).toList());
    await prefs.setString(_issuersKey, issuersJson);
  }
  
  static Future<void> addIssuer(Issuer issuer) async {
    final List<Issuer> issuers = await getIssuers();
    final int newId = await _getNextIssuerId();
    final Issuer newIssuer = issuer.copyWith(id: newId);
    
    issuers.add(newIssuer);
    await saveIssuers(issuers);
  }
  
  static Future<void> updateIssuer(Issuer updatedIssuer) async {
    final List<Issuer> issuers = await getIssuers();
    final int index = issuers.indexWhere((i) => i.id == updatedIssuer.id);
    
    if (index != -1) {
      issuers[index] = updatedIssuer;
      await saveIssuers(issuers);
    }
  }
  
  static Future<void> deleteIssuer(int issuerId) async {
    final List<Issuer> issuers = await getIssuers();
    issuers.removeWhere((i) => i.id == issuerId);
    await saveIssuers(issuers);
  }

  // 領収書履歴の管理
  static Future<List<Receipt>> getReceipts() async {
    final String? receiptsJson = prefs.getString(_receiptsKey);
    if (receiptsJson == null) {
      return [];
    }
    
    try {
      final List<dynamic> receiptsData = jsonDecode(receiptsJson);
      return receiptsData.map((data) => Receipt.fromJson(data)).toList();
    } catch (e) {
      print('Error loading receipts: $e');
      return [];
    }
  }
  
  static Future<void> saveReceipts(List<Receipt> receipts) async {
    final String receiptsJson = jsonEncode(receipts.map((r) => r.toJson()).toList());
    await prefs.setString(_receiptsKey, receiptsJson);
  }
  
  static Future<void> addReceipt(Receipt receipt) async {
    final List<Receipt> receipts = await getReceipts();
    receipts.insert(0, receipt); // 最新を先頭に
    await saveReceipts(receipts);
  }
  
  static Future<void> deleteReceipt(Receipt receipt) async {
    final List<Receipt> receipts = await getReceipts();
    receipts.removeWhere((r) => r.receiptNumber == receipt.receiptNumber);
    await saveReceipts(receipts);
  }

  // ヘルパーメソッド
  static Future<int> _getNextIssuerId() async {
    final int lastId = prefs.getInt(_lastIssuerIdKey) ?? 0;
    final int nextId = lastId + 1;
    await prefs.setInt(_lastIssuerIdKey, nextId);
    return nextId;
  }
  
  static List<Issuer> _getDefaultIssuers() {
    return [
      const Issuer(
        id: 1,
        name: "株式会社サンプル",
        postalCode: "100-0001",
        address: "東京都千代田区千代田1-1-1",
        phone: "03-1234-5678",
        invoiceNumber: "T1234567890123",
        hankoImagePath: 'assets/icons/sample-hanko.png',
      ),
    ];
  }
  
  // データクリア（開発・テスト用）
  static Future<void> clearAllData() async {
    await prefs.remove(_issuersKey);
    await prefs.remove(_receiptsKey);
    await prefs.remove(_lastIssuerIdKey);
  }
}
