import 'package:flutter/material.dart';
import 'dart:io' as io;
import 'package:flutter/services.dart';
import '../models/issuer.dart';
import '../services/storage_service.dart';
import '../widgets/issuer_form_dialog.dart';

class IssuerManageScreen extends StatefulWidget {
  const IssuerManageScreen({super.key});

  @override
  State<IssuerManageScreen> createState() => _IssuerManageScreenState();
}

class _IssuerManageScreenState extends State<IssuerManageScreen> {
  List<Issuer> _issuers = [];
  bool _isLoading = true;

  @override
  void initState() {
    super.initState();
    _loadIssuers();
  }

  Future<void> _loadIssuers() async {
    setState(() => _isLoading = true);
    
    try {
      final issuers = await StorageService.getIssuers();
      setState(() {
        _issuers = issuers;
        _isLoading = false;
      });
    } catch (e) {
      setState(() => _isLoading = false);
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('データの読み込みに失敗しました: $e')),
        );
      }
    }
  }

  Future<void> _addIssuer() async {
    final result = await showDialog<Issuer>(
      context: context,
      builder: (context) => const IssuerFormDialog(),
    );

    if (result != null) {
      try {
        await StorageService.addIssuer(result);
        _loadIssuers();
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(content: Text('発行者を追加しました')),
          );
        }
      } catch (e) {
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(content: Text('追加に失敗しました: $e')),
          );
        }
      }
    }
  }

  Future<void> _editIssuer(Issuer issuer) async {
    final result = await showDialog<Issuer>(
      context: context,
      builder: (context) => IssuerFormDialog(issuer: issuer),
    );

    if (result != null) {
      try {
        await StorageService.updateIssuer(result);
        _loadIssuers();
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(content: Text('発行者を更新しました')),
          );
        }
      } catch (e) {
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(content: Text('更新に失敗しました: $e')),
          );
        }
      }
    }
  }

  Future<void> _deleteIssuer(Issuer issuer) async {
    final result = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('発行者を削除'),
        content: Text('${issuer.name}を削除しますか？\nこの操作は取り消せません。'),
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
        await StorageService.deleteIssuer(issuer.id);
        _loadIssuers();
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(content: Text('発行者を削除しました')),
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

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: _isLoading
          ? const Center(child: CircularProgressIndicator())
          : _issuers.isEmpty
              ? _buildEmptyState()
              : _buildIssuerList(),
      floatingActionButton: FloatingActionButton(
        onPressed: _addIssuer,
        child: const Icon(Icons.add),
      ),
    );
  }

  Widget _buildEmptyState() {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Icon(
            Icons.business,
            size: 64,
            color: Colors.grey[400],
          ),
          const SizedBox(height: 16),
          Text(
            '発行者が登録されていません',
            style: TextStyle(
              fontSize: 18,
              color: Colors.grey[600],
            ),
          ),
          const SizedBox(height: 8),
          Text(
            '右下の + ボタンで発行者を追加してください',
            style: TextStyle(
              fontSize: 14,
              color: Colors.grey[500],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildIssuerList() {
    return RefreshIndicator(
      onRefresh: _loadIssuers,
      child: ListView.builder(
        padding: const EdgeInsets.all(16),
        itemCount: _issuers.length,
        itemBuilder: (context, index) {
          final issuer = _issuers[index];
          return Card(
            margin: const EdgeInsets.only(bottom: 12),
            child: ListTile(
              contentPadding: const EdgeInsets.all(16),
              leading: _buildLeadingAvatar(issuer),
              title: Text(
                issuer.name,
                style: const TextStyle(
                  fontWeight: FontWeight.bold,
                  fontSize: 16,
                ),
              ),
              subtitle: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const SizedBox(height: 4),
                  Text('〒${issuer.postalCode}'),
                  Text(issuer.address),
                  if (issuer.phone.trim().isNotEmpty) Text('TEL: ${issuer.phone}'),
                  if (issuer.invoiceNumber.isNotEmpty)
                    Text(
                      'インボイス: ${issuer.invoiceNumber}',
                      style: TextStyle(
                        fontSize: 12,
                        color: Theme.of(context).primaryColor,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                ],
              ),
              trailing: PopupMenuButton<String>(
                onSelected: (value) {
                  switch (value) {
                    case 'edit':
                      _editIssuer(issuer);
                      break;
                    case 'delete':
                      _deleteIssuer(issuer);
                      break;
                    case 'copy_invoice':
                      _copyToClipboard(issuer.invoiceNumber);
                      break;
                  }
                },
                itemBuilder: (context) => [
                  const PopupMenuItem(
                    value: 'edit',
                    child: ListTile(
                      leading: Icon(Icons.edit),
                      title: Text('編集'),
                      contentPadding: EdgeInsets.zero,
                    ),
                  ),
                  if (issuer.invoiceNumber.isNotEmpty)
                    const PopupMenuItem(
                      value: 'copy_invoice',
                      child: ListTile(
                        leading: Icon(Icons.copy),
                        title: Text('インボイス番号をコピー'),
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
              onTap: () => _editIssuer(issuer),
            ),
          );
        },
      ),
    );
  }

  Widget _buildLeadingAvatar(Issuer issuer) {
    final path = issuer.hankoImagePath;
    if (path != null && path.isNotEmpty) {
      ImageProvider? img;
      if (path.startsWith('assets/')) {
        img = AssetImage(path);
      } else {
        img = FileImage(io.File(path));
      }
      return CircleAvatar(
        backgroundImage: img,
        backgroundColor: Colors.transparent,
      );
    }
    return CircleAvatar(
      backgroundColor: Theme.of(context).primaryColor,
      child: Text(
        issuer.name.isNotEmpty ? issuer.name[0] : '?',
        style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold),
      ),
    );
  }

  void _copyToClipboard(String text) {
    Clipboard.setData(ClipboardData(text: text));
    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(content: Text('インボイス番号をクリップボードにコピーしました')),
    );
  }
}
