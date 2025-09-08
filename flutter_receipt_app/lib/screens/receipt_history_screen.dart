import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import '../models/receipt.dart';
import '../services/storage_service.dart';
import '../services/pdf_service.dart';

class ReceiptHistoryScreen extends StatefulWidget {
  const ReceiptHistoryScreen({super.key});

  @override
  State<ReceiptHistoryScreen> createState() => _ReceiptHistoryScreenState();
}

class _ReceiptHistoryScreenState extends State<ReceiptHistoryScreen> {
  List<Receipt> _receipts = [];
  bool _isLoading = true;
  String _searchQuery = '';
  final TextEditingController _searchController = TextEditingController();

  @override
  void initState() {
    super.initState();
    _loadReceipts();
    _searchController.addListener(() {
      setState(() {
        _searchQuery = _searchController.text.toLowerCase();
      });
    });
  }

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  Future<void> _loadReceipts() async {
    setState(() => _isLoading = true);
    
    try {
      final receipts = await StorageService.getReceipts();
      setState(() {
        _receipts = receipts;
        _isLoading = false;
      });
    } catch (e) {
      setState(() => _isLoading = false);
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('履歴の読み込みに失敗しました: $e')),
        );
      }
    }
  }

  List<Receipt> get _filteredReceipts {
    if (_searchQuery.isEmpty) {
      return _receipts;
    }
    
    return _receipts.where((receipt) {
      return receipt.customerName.toLowerCase().contains(_searchQuery) ||
             receipt.description.toLowerCase().contains(_searchQuery) ||
             receipt.receiptNumber.toLowerCase().contains(_searchQuery) ||
             receipt.issuer.name.toLowerCase().contains(_searchQuery);
    }).toList();
  }

  Future<void> _deleteReceipt(Receipt receipt) async {
    final result = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('履歴を削除'),
        content: Text('${receipt.customerName}${receipt.customerType}の領収書を削除しますか？\nこの操作は取り消せません。'),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(context).pop(false),
            child: const Text('キャンセル'),
          ),
          TextButton(
            onPressed: () => Navigator.of(context).pop(true),
            style: TextButton.styleFrom(foregroundColor: Colors.red),
            child: const Text('削除'),
          ),
        ],
      ),
    );

    if (result == true) {
      try {
        await StorageService.deleteReceipt(receipt);
        _loadReceipts();
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(content: Text('履歴を削除しました')),
          );
        }
      } catch (e) {
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(content: Text('削除に失敗しました: $e')),
          );
        }
      }
    }
  }

  Future<void> _regenerateReceipt(Receipt receipt) async {
    try {
      await PdfService.generateReceipt(receipt);
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('領収書を再生成しました')),
        );
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('再生成に失敗しました: $e')),
        );
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: Column(
        children: [
          // 検索バー
          Padding(
            padding: const EdgeInsets.all(16.0),
            child: TextField(
              controller: _searchController,
              decoration: InputDecoration(
                hintText: '顧客名、内容、領収書番号で検索...',
                prefixIcon: const Icon(Icons.search),
                suffixIcon: _searchQuery.isNotEmpty
                    ? IconButton(
                        icon: const Icon(Icons.clear),
                        onPressed: () {
                          _searchController.clear();
                        },
                      )
                    : null,
                border: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(8),
                ),
              ),
            ),
          ),
          
          // リスト
          Expanded(
            child: _isLoading
                ? const Center(child: CircularProgressIndicator())
                : _filteredReceipts.isEmpty
                    ? _buildEmptyState()
                    : _buildReceiptList(),
          ),
        ],
      ),
    );
  }

  Widget _buildEmptyState() {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Icon(
            _searchQuery.isNotEmpty ? Icons.search_off : Icons.receipt_long,
            size: 64,
            color: Colors.grey[400],
          ),
          const SizedBox(height: 16),
          Text(
            _searchQuery.isNotEmpty 
                ? '検索結果がありません'
                : '領収書履歴がありません',
            style: TextStyle(
              fontSize: 18,
              color: Colors.grey[600],
            ),
          ),
          const SizedBox(height: 8),
          Text(
            _searchQuery.isNotEmpty
                ? '検索条件を変更してください'
                : '領収書を作成すると履歴が表示されます',
            style: TextStyle(
              fontSize: 14,
              color: Colors.grey[500],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildReceiptList() {
    return RefreshIndicator(
      onRefresh: _loadReceipts,
      child: ListView.builder(
        padding: const EdgeInsets.symmetric(horizontal: 16),
        itemCount: _filteredReceipts.length,
        itemBuilder: (context, index) {
          final receipt = _filteredReceipts[index];
          return Card(
            margin: const EdgeInsets.only(bottom: 12),
            child: ListTile(
              contentPadding: const EdgeInsets.all(16),
              leading: CircleAvatar(
                backgroundColor: receipt.isElectronicReceipt 
                    ? Colors.green 
                    : Colors.blue,
                child: Icon(
                  receipt.isElectronicReceipt 
                      ? Icons.computer 
                      : Icons.description,
                  color: Colors.white,
                ),
              ),
              title: Text(
                '${receipt.customerName} ${receipt.customerType}',
                style: const TextStyle(
                  fontWeight: FontWeight.bold,
                ),
              ),
              subtitle: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const SizedBox(height: 4),
                  Text(
                    '¥${NumberFormat('#,###').format(receipt.totalWithTax)}',
                    style: const TextStyle(
                      fontSize: 16,
                      fontWeight: FontWeight.bold,
                      color: Colors.green,
                    ),
                  ),
                  Text(receipt.description),
                  Text(
                    '${DateFormat('yyyy/MM/dd HH:mm').format(receipt.timestamp)} - ${receipt.receiptNumber}',
                    style: TextStyle(
                      fontSize: 12,
                      color: Colors.grey[600],
                    ),
                  ),
                  Text(
                    '発行者: ${receipt.issuer.name}',
                    style: TextStyle(
                      fontSize: 12,
                      color: Colors.grey[600],
                    ),
                  ),
                ],
              ),
              trailing: PopupMenuButton<String>(
                onSelected: (value) {
                  switch (value) {
                    case 'regenerate':
                      _regenerateReceipt(receipt);
                      break;
                    case 'delete':
                      _deleteReceipt(receipt);
                      break;
                  }
                },
                itemBuilder: (context) => [
                  const PopupMenuItem(
                    value: 'regenerate',
                    child: ListTile(
                      leading: Icon(Icons.print),
                      title: Text('再印刷'),
                      contentPadding: EdgeInsets.zero,
                    ),
                  ),
                  const PopupMenuItem(
                    value: 'delete',
                    child: ListTile(
                      leading: Icon(Icons.delete, color: Colors.red),
                      title: Text('削除', style: TextStyle(color: Colors.red)),
                      contentPadding: EdgeInsets.zero,
                    ),
                  ),
                ],
              ),
              onTap: () => _showReceiptDetails(receipt),
            ),
          );
        },
      ),
    );
  }

  void _showReceiptDetails(Receipt receipt) {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: Text('${receipt.customerName} ${receipt.customerType}'),
        content: SizedBox(
          width: double.maxFinite,
          child: SingleChildScrollView(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              mainAxisSize: MainAxisSize.min,
              children: [
                _buildDetailRow('領収書番号', receipt.receiptNumber),
                _buildDetailRow('発行日', DateFormat('yyyy年MM月dd日').format(receipt.date)),
                _buildDetailRow('発行時刻', DateFormat('HH時mm分').format(receipt.timestamp)),
                const Divider(),
                _buildDetailRow('商品金額', '¥${NumberFormat('#,###').format(receipt.productAmount)}'),
                _buildDetailRow('送料', '¥${NumberFormat('#,###').format(receipt.shippingAmount)}'),
                _buildDetailRow('小計', '¥${NumberFormat('#,###').format(receipt.totalAmount)}'),
                _buildDetailRow('消費税（${(receipt.taxRate * 100).toStringAsFixed(0)}%）', '¥${NumberFormat('#,###').format(receipt.taxAmount)}'),
                if (receipt.stampDuty > 0)
                  _buildDetailRow('印紙税', '¥${NumberFormat('#,###').format(receipt.stampDuty)}'),
                _buildDetailRow('合計', '¥${NumberFormat('#,###').format(receipt.totalWithTax)}', isTotal: true),
                const Divider(),
                _buildDetailRow('但し書き', receipt.description),
                _buildDetailRow('種別', receipt.isElectronicReceipt ? '電子領収書' : '紙の領収書'),
                const Divider(),
                _buildDetailRow('発行者', receipt.issuer.name),
                _buildDetailRow('住所', '〒${receipt.issuer.postalCode} ${receipt.issuer.address}'),
                _buildDetailRow('電話', receipt.issuer.phone),
                if (receipt.issuer.invoiceNumber.isNotEmpty)
                  _buildDetailRow('インボイス番号', receipt.issuer.invoiceNumber),
              ],
            ),
          ),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(context).pop(),
            child: const Text('閉じる'),
          ),
          ElevatedButton(
            onPressed: () {
              Navigator.of(context).pop();
              _regenerateReceipt(receipt);
            },
            child: const Text('再印刷'),
          ),
        ],
      ),
    );
  }

  Widget _buildDetailRow(String label, String value, {bool isTotal = false}) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 4.0),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          SizedBox(
            width: 100,
            child: Text(
              '$label:',
              style: TextStyle(
                fontWeight: isTotal ? FontWeight.bold : FontWeight.normal,
                color: Colors.grey[600],
              ),
            ),
          ),
          Expanded(
            child: Text(
              value,
              style: TextStyle(
                fontWeight: isTotal ? FontWeight.bold : FontWeight.normal,
                fontSize: isTotal ? 16 : 14,
              ),
            ),
          ),
        ],
      ),
    );
  }
}
