import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:intl/intl.dart';
import '../models/issuer.dart';
import '../models/receipt.dart';
import '../services/storage_service.dart';
import '../services/pdf_service.dart';

class ReceiptCreateScreen extends StatefulWidget {
  const ReceiptCreateScreen({super.key});

  @override
  State<ReceiptCreateScreen> createState() => _ReceiptCreateScreenState();
}

class _ReceiptCreateScreenState extends State<ReceiptCreateScreen> {
  final _formKey = GlobalKey<FormState>();
  final _customerNameController = TextEditingController();
  final _productAmountController = TextEditingController();
  final _shippingAmountController = TextEditingController();
  final _descriptionController = TextEditingController();
  final _invoiceNumberController = TextEditingController();
  
  List<Issuer> _issuers = [];
  Issuer? _selectedIssuer;
  String _customerType = '様';
  bool _isElectronicReceipt = true;
  double _totalAmount = 0;
  double _taxAmount = 0;
  double _totalWithTax = 0;
  double _stampDuty = 0;
  
  @override
  void initState() {
    super.initState();
    _loadIssuers();
    _generateReceiptNumber();
    
    // 金額変更時の計算
    _productAmountController.addListener(_calculateTax);
    _shippingAmountController.addListener(_calculateTax);
  }

  @override
  void dispose() {
    _customerNameController.dispose();
    _productAmountController.dispose();
    _shippingAmountController.dispose();
    _descriptionController.dispose();
    _invoiceNumberController.dispose();
    super.dispose();
  }

  Future<void> _loadIssuers() async {
    final issuers = await StorageService.getIssuers();
    setState(() {
      _issuers = issuers;
      if (_issuers.isNotEmpty) {
        _selectedIssuer = _issuers.first;
        if (_invoiceNumberController.text.trim().isEmpty) {
          _invoiceNumberController.text = _selectedIssuer!.invoiceNumber;
        }
      }
    });
  }

  void _generateReceiptNumber() {
    final now = DateTime.now();
    final formatter = DateFormat('yyyyMMdd-HHmmss');
    final receiptNumber = formatter.format(now);
    // 領収書番号は自動生成なので、フォームには含めない
  }

  void _calculateTax() {
    final productAmount = double.tryParse(_productAmountController.text) ?? 0;
    final shippingAmount = double.tryParse(_shippingAmountController.text) ?? 0;
    
    setState(() {
      _totalAmount = productAmount + shippingAmount;
      _taxAmount = (_totalAmount * 0.1).roundToDouble();
      _totalWithTax = _totalAmount + _taxAmount;
      
      // 印紙税計算
      if (_isElectronicReceipt) {
        _stampDuty = 0;
      } else {
        if (_totalWithTax >= 50000000) _stampDuty = 600;
        else if (_totalWithTax >= 10000000) _stampDuty = 400;
        else if (_totalWithTax >= 5000000) _stampDuty = 200;
        else if (_totalWithTax >= 1000000) _stampDuty = 200;
        else if (_totalWithTax >= 500000) _stampDuty = 200;
        else if (_totalWithTax >= 100000) _stampDuty = 200;
        else if (_totalWithTax >= 50000) _stampDuty = 200;
        else _stampDuty = 0;
      }
    });
  }

  Future<void> _createReceipt() async {
    if (!_formKey.currentState!.validate() || _selectedIssuer == null) {
      return;
    }

    final now = DateTime.now();
    final receiptNumber = DateFormat('yyyyMMdd-HHmmss').format(now);
    
    final receipt = Receipt(
      customerName: _customerNameController.text.trim(),
      customerType: _customerType,
      productAmount: double.tryParse(_productAmountController.text) ?? 0,
      shippingAmount: double.tryParse(_shippingAmountController.text) ?? 0,
      description: _descriptionController.text.trim(),
      receiptNumber: receiptNumber,
      isElectronicReceipt: _isElectronicReceipt,
      issuer: _selectedIssuer!,
      invoiceNumber: _invoiceNumberController.text.trim().isNotEmpty
          ? _invoiceNumberController.text.trim()
          : null,
      timestamp: now,
      date: now,
    );

    try {
      // PDF生成
      await PdfService.generateReceipt(receipt);
      
      // 履歴に保存
      await StorageService.addReceipt(receipt);
      
      // フォームをクリア
      _clearForm();
      
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('領収書を作成しました')),
        );
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('エラーが発生しました: $e')),
        );
      }
    }
  }

  void _clearForm() {
    _customerNameController.clear();
    _productAmountController.clear();
    _shippingAmountController.clear();
    _descriptionController.clear();
    _generateReceiptNumber();
    setState(() {
      _customerType = '様';
      _isElectronicReceipt = true;
    });
    _calculateTax();
  }

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.all(16.0),
      child: Form(
        key: _formKey,
        child: ListView(
          children: [
            // 顧客情報
            Card(
              child: Padding(
                padding: const EdgeInsets.all(16.0),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      '顧客情報',
                      style: Theme.of(context).textTheme.titleMedium,
                    ),
                    const SizedBox(height: 16),
                    Row(
                      children: [
                        Expanded(
                          flex: 3,
                          child: TextFormField(
                            controller: _customerNameController,
                            decoration: const InputDecoration(
                              labelText: '顧客名',
                              hintText: '顧客名を入力',
                            ),
                            validator: (value) {
                              if (value == null || value.trim().isEmpty) {
                                return '顧客名を入力してください';
                              }
                              return null;
                            },
                          ),
                        ),
                        const SizedBox(width: 8),
                        Expanded(
                          child: DropdownButtonFormField<String>(
                            value: _customerType,
                            decoration: const InputDecoration(labelText: '敬称'),
                            items: ['様', '御中'].map((String value) {
                              return DropdownMenuItem<String>(
                                value: value,
                                child: Text(value),
                              );
                            }).toList(),
                            onChanged: (String? value) {
                              setState(() {
                                _customerType = value ?? '様';
                              });
                            },
                          ),
                        ),
                      ],
                    ),
                  ],
                ),
              ),
            ),
            
            const SizedBox(height: 16),
            
            // 発行者選択
            Card(
              child: Padding(
                padding: const EdgeInsets.all(16.0),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      '発行者',
                      style: Theme.of(context).textTheme.titleMedium,
                    ),
                    const SizedBox(height: 16),
                    DropdownButtonFormField<Issuer>(
                      value: _selectedIssuer,
                      decoration: const InputDecoration(labelText: '発行者を選択'),
                      items: _issuers.map((Issuer issuer) {
                        return DropdownMenuItem<Issuer>(
                          value: issuer,
                          child: Text(issuer.name),
                        );
                      }).toList(),
                      onChanged: (Issuer? value) {
                        setState(() {
                          _selectedIssuer = value;
                          if (_invoiceNumberController.text.trim().isEmpty) {
                            _invoiceNumberController.text = value?.invoiceNumber ?? '';
                          }
                        });
                      },
                      validator: (value) {
                        if (value == null) {
                          return '発行者を選択してください';
                        }
                        return null;
                      },
                    ),
                    const SizedBox(height: 16),
                    TextFormField(
                      controller: _invoiceNumberController,
                      decoration: const InputDecoration(
                        labelText: 'インボイス番号',
                        hintText: 'T1234567890123',
                      ),
                    ),
                  ],
                ),
              ),
            ),
            
            const SizedBox(height: 16),
            
            // 金額情報
            Card(
              child: Padding(
                padding: const EdgeInsets.all(16.0),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      '金額情報',
                      style: Theme.of(context).textTheme.titleMedium,
                    ),
                    const SizedBox(height: 16),
                    TextFormField(
                      controller: _productAmountController,
                      decoration: const InputDecoration(
                        labelText: '商品金額',
                        hintText: '0',
                        suffixText: '円',
                      ),
                      keyboardType: TextInputType.number,
                      inputFormatters: [FilteringTextInputFormatter.digitsOnly],
                      validator: (value) {
                        if (value == null || value.isEmpty) {
                          return '商品金額を入力してください';
                        }
                        final amount = double.tryParse(value);
                        if (amount == null || amount < 0) {
                          return '正しい金額を入力してください';
                        }
                        return null;
                      },
                    ),
                    const SizedBox(height: 16),
                    TextFormField(
                      controller: _shippingAmountController,
                      decoration: const InputDecoration(
                        labelText: '送料',
                        hintText: '0',
                        suffixText: '円',
                      ),
                      keyboardType: TextInputType.number,
                      inputFormatters: [FilteringTextInputFormatter.digitsOnly],
                    ),
                    const SizedBox(height: 16),
                    TextFormField(
                      controller: _descriptionController,
                      decoration: const InputDecoration(
                        labelText: '但し書き',
                        hintText: '商品代として',
                      ),
                      maxLines: 2,
                      validator: (value) {
                        if (value == null || value.trim().isEmpty) {
                          return '但し書きを入力してください';
                        }
                        return null;
                      },
                    ),
                  ],
                ),
              ),
            ),
            
            const SizedBox(height: 16),
            
            // 計算結果
            Card(
              child: Padding(
                padding: const EdgeInsets.all(16.0),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      '計算結果',
                      style: Theme.of(context).textTheme.titleMedium,
                    ),
                    const SizedBox(height: 16),
                    Row(
                      children: [
                        const Text('電子領収書'),
                        Switch(
                          value: _isElectronicReceipt,
                          onChanged: (value) {
                            setState(() {
                              _isElectronicReceipt = value;
                            });
                            _calculateTax();
                          },
                        ),
                      ],
                    ),
                    const SizedBox(height: 8),
                    _buildAmountRow('小計', _totalAmount),
                    _buildAmountRow('消費税（10%）', _taxAmount),
                    _buildAmountRow('合計', _totalWithTax),
                    if (_stampDuty > 0) _buildAmountRow('印紙税', _stampDuty),
                  ],
                ),
              ),
            ),
            
            const SizedBox(height: 24),
            
            // ボタン
            Row(
              children: [
                Expanded(
                  child: OutlinedButton(
                    onPressed: _clearForm,
                    child: const Text('クリア'),
                  ),
                ),
                const SizedBox(width: 16),
                Expanded(
                  flex: 2,
                  child: ElevatedButton(
                    onPressed: _createReceipt,
                    child: const Text('領収書作成'),
                  ),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildAmountRow(String label, double amount) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 4.0),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(label),
          Text(
            '¥${NumberFormat('#,###').format(amount)}',
            style: const TextStyle(fontWeight: FontWeight.bold),
          ),
        ],
      ),
    );
  }
}
