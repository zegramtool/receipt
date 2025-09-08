import 'issuer.dart';

class Receipt {
  final String customerName;
  final String customerType;
  final double productAmount;
  final double shippingAmount;
  final String description;
  final String receiptNumber;
  final bool isElectronicReceipt;
  final Issuer issuer;
  // 画面で上書きされたインボイス番号（指定があればこちらを優先）
  final String? invoiceNumber;
  // 消費税率（例: 0.10, 0.08）
  final double taxRate;
  final DateTime timestamp;
  final DateTime date;

  const Receipt({
    required this.customerName,
    required this.customerType,
    required this.productAmount,
    required this.shippingAmount,
    required this.description,
    required this.receiptNumber,
    required this.isElectronicReceipt,
    required this.issuer,
    this.invoiceNumber,
    this.taxRate = 0.10,
    required this.timestamp,
    required this.date,
  });

  // 計算プロパティ
  double get totalAmount => productAmount + shippingAmount;
  
  double get taxAmount => (totalAmount * taxRate).roundToDouble();
  
  double get totalWithTax => totalAmount + taxAmount;
  
  double get stampDuty {
    // 印紙税計算（電子領収書は不要）
    if (isElectronicReceipt) return 0;
    
    if (totalWithTax >= 50000000) return 600;
    if (totalWithTax >= 10000000) return 400;
    if (totalWithTax >= 5000000) return 200;
    if (totalWithTax >= 1000000) return 200;
    if (totalWithTax >= 500000) return 200;
    if (totalWithTax >= 100000) return 200;
    if (totalWithTax >= 50000) return 200;
    
    return 0; // 5万円未満は印紙不要
  }

  // JSON変換用
  factory Receipt.fromJson(Map<String, dynamic> json) {
    return Receipt(
      customerName: json['customerName'] ?? '',
      customerType: json['customerType'] ?? '様',
      productAmount: (json['productAmount'] ?? 0).toDouble(),
      shippingAmount: (json['shippingAmount'] ?? 0).toDouble(),
      description: json['description'] ?? '',
      receiptNumber: json['receiptNumber'] ?? '',
      isElectronicReceipt: json['isElectronicReceipt'] ?? false,
      issuer: Issuer.fromJson(json['issuer'] ?? {}),
      invoiceNumber: json['invoiceNumber'],
      taxRate: (json['taxRate'] ?? 0.10).toDouble(),
      timestamp: DateTime.parse(json['timestamp'] ?? DateTime.now().toIso8601String()),
      date: DateTime.parse(json['date'] ?? DateTime.now().toIso8601String()),
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'customerName': customerName,
      'customerType': customerType,
      'productAmount': productAmount,
      'shippingAmount': shippingAmount,
      'description': description,
      'receiptNumber': receiptNumber,
      'isElectronicReceipt': isElectronicReceipt,
      'issuer': issuer.toJson(),
      'invoiceNumber': invoiceNumber,
      'taxRate': taxRate,
      'timestamp': timestamp.toIso8601String(),
      'date': date.toIso8601String(),
    };
  }

  @override
  String toString() {
    return 'Receipt(customerName: $customerName, receiptNumber: $receiptNumber, total: $totalWithTax)';
  }
}
