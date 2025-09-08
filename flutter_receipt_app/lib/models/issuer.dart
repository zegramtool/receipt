class Issuer {
  final int id;
  final String name;
  final String postalCode;
  final String address;
  final String phone;
  final String invoiceNumber;
  final String? hankoImagePath;

  const Issuer({
    required this.id,
    required this.name,
    required this.postalCode,
    required this.address,
    required this.phone,
    required this.invoiceNumber,
    this.hankoImagePath,
  });

  // JSON変換用
  factory Issuer.fromJson(Map<String, dynamic> json) {
    return Issuer(
      id: json['id'] ?? 0,
      name: json['name'] ?? '',
      postalCode: json['postalCode'] ?? '',
      address: json['address'] ?? '',
      phone: json['phone'] ?? '',
      invoiceNumber: json['invoiceNumber'] ?? '',
      hankoImagePath: json['hankoImagePath'],
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'name': name,
      'postalCode': postalCode,
      'address': address,
      'phone': phone,
      'invoiceNumber': invoiceNumber,
      'hankoImagePath': hankoImagePath,
    };
  }

  // コピー用メソッド
  Issuer copyWith({
    int? id,
    String? name,
    String? postalCode,
    String? address,
    String? phone,
    String? invoiceNumber,
    String? hankoImagePath,
  }) {
    return Issuer(
      id: id ?? this.id,
      name: name ?? this.name,
      postalCode: postalCode ?? this.postalCode,
      address: address ?? this.address,
      phone: phone ?? this.phone,
      invoiceNumber: invoiceNumber ?? this.invoiceNumber,
      hankoImagePath: hankoImagePath ?? this.hankoImagePath,
    );
  }

  @override
  String toString() {
    return 'Issuer(id: $id, name: $name, invoiceNumber: $invoiceNumber)';
  }
}