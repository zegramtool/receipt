import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'dart:io' as io;
import 'package:image_picker/image_picker.dart';
import 'package:path_provider/path_provider.dart';
import '../models/issuer.dart';

class IssuerFormDialog extends StatefulWidget {
  final Issuer? issuer;

  const IssuerFormDialog({super.key, this.issuer});

  @override
  State<IssuerFormDialog> createState() => _IssuerFormDialogState();
}

class _IssuerFormDialogState extends State<IssuerFormDialog> {
  final _formKey = GlobalKey<FormState>();
  final _nameController = TextEditingController();
  final _postalCodeController = TextEditingController();
  final _addressController = TextEditingController();
  final _phoneController = TextEditingController();
  final _invoiceNumberController = TextEditingController();
  String? _hankoImagePath; // 端末内に保存した印影のパス

  @override
  void initState() {
    super.initState();
    if (widget.issuer != null) {
      _nameController.text = widget.issuer!.name;
      _postalCodeController.text = widget.issuer!.postalCode;
      _addressController.text = widget.issuer!.address;
      _phoneController.text = widget.issuer!.phone;
      _invoiceNumberController.text = widget.issuer!.invoiceNumber;
      _hankoImagePath = widget.issuer!.hankoImagePath;
    }
  }

  @override
  void dispose() {
    _nameController.dispose();
    _postalCodeController.dispose();
    _addressController.dispose();
    _phoneController.dispose();
    _invoiceNumberController.dispose();
    super.dispose();
  }

  void _save() {
    if (_formKey.currentState!.validate()) {
      final issuer = Issuer(
        id: widget.issuer?.id ?? 0, // StorageServiceで新しいIDが割り当てられる
        name: _nameController.text.trim(),
        postalCode: _postalCodeController.text.trim(),
        address: _addressController.text.trim(),
        phone: _phoneController.text.trim(),
        invoiceNumber: _invoiceNumberController.text.trim(),
        hankoImagePath: _hankoImagePath ?? widget.issuer?.hankoImagePath,
      );
      
      Navigator.of(context).pop(issuer);
    }
  }

  Future<void> _pickHankoImage() async {
    try {
      final picker = ImagePicker();
      final XFile? picked = await picker.pickImage(source: ImageSource.gallery, maxWidth: 1200, imageQuality: 95);
      if (picked == null) return;

      final dir = await getApplicationDocumentsDirectory();
      final ext = picked.path.split('.').last;
      final fileName = 'hanko_${DateTime.now().millisecondsSinceEpoch}.$ext';
      final destPath = '${dir.path}/$fileName';

      final bytes = await picked.readAsBytes();
      final file = io.File(destPath);
      await file.writeAsBytes(bytes, flush: true);

      setState(() {
        _hankoImagePath = destPath;
      });
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('印影の読み込みに失敗しました: $e')),
      );
    }
  }

  void _clearHankoImage() {
    setState(() {
      _hankoImagePath = null;
    });
  }

  @override
  Widget build(BuildContext context) {
    return AlertDialog(
      title: Text(widget.issuer == null ? '発行者を追加' : '発行者を編集'),
      content: SizedBox(
        width: double.maxFinite,
        child: Form(
          key: _formKey,
          child: SingleChildScrollView(
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                TextFormField(
                  controller: _nameController,
                  decoration: const InputDecoration(
                    labelText: '会社名・氏名 *',
                    hintText: '株式会社サンプル',
                  ),
                  validator: (value) {
                    if (value == null || value.trim().isEmpty) {
                      return '会社名・氏名を入力してください';
                    }
                    return null;
                  },
                ),
                const SizedBox(height: 16),
                // 印影画像の選択
                Align(
                  alignment: Alignment.centerLeft,
                  child: Text(
                    '印影画像',
                    style: Theme.of(context).textTheme.labelLarge,
                  ),
                ),
                const SizedBox(height: 8),
                Row(
                  crossAxisAlignment: CrossAxisAlignment.center,
                  children: [
                    Container(
                      width: 72,
                      height: 72,
                      decoration: BoxDecoration(
                        border: Border.all(color: Colors.grey.shade300),
                        borderRadius: BorderRadius.circular(8),
                        color: Colors.grey.shade50,
                      ),
                      child: _hankoImagePath != null && _hankoImagePath!.isNotEmpty
                          ? ClipRRect(
                              borderRadius: BorderRadius.circular(8),
                              child: Image(
                                image: _hankoImagePath!.startsWith('assets/')
                                    ? AssetImage(_hankoImagePath!) as ImageProvider
                                    : FileImage(io.File(_hankoImagePath!)),
                                fit: BoxFit.contain,
                              ),
                            )
                          : const Icon(Icons.image, color: Colors.grey),
                    ),
                    const SizedBox(width: 12),
                    Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        ElevatedButton.icon(
                          onPressed: _pickHankoImage,
                          icon: const Icon(Icons.photo_library),
                          label: const Text('画像を選択'),
                        ),
                        if (_hankoImagePath != null && _hankoImagePath!.isNotEmpty)
                          TextButton(
                            onPressed: _clearHankoImage,
                            child: const Text('クリア'),
                          ),
                      ],
                    ),
                  ],
                ),
                const SizedBox(height: 16),
                
                TextFormField(
                  controller: _postalCodeController,
                  decoration: const InputDecoration(
                    labelText: '郵便番号 *',
                    hintText: '100-0001',
                  ),
                  keyboardType: TextInputType.text,
                  inputFormatters: [
                    FilteringTextInputFormatter.allow(RegExp(r'[0-9-]')),
                  ],
                  validator: (value) {
                    if (value == null || value.trim().isEmpty) {
                      return '郵便番号を入力してください';
                    }
                    if (!RegExp(r'^\d{3}-\d{4}$').hasMatch(value.trim())) {
                      return '郵便番号は000-0000の形式で入力してください';
                    }
                    return null;
                  },
                ),
                const SizedBox(height: 16),
                
                TextFormField(
                  controller: _addressController,
                  decoration: const InputDecoration(
                    labelText: '住所 *',
                    hintText: '東京都千代田区千代田1-1-1',
                  ),
                  maxLines: 2,
                  validator: (value) {
                    if (value == null || value.trim().isEmpty) {
                      return '住所を入力してください';
                    }
                    return null;
                  },
                ),
                const SizedBox(height: 16),
                
                TextFormField(
                  controller: _phoneController,
                  decoration: const InputDecoration(
                    labelText: '電話番号 *',
                    hintText: '03-1234-5678',
                  ),
                  keyboardType: TextInputType.phone,
                  inputFormatters: [
                    FilteringTextInputFormatter.allow(RegExp(r'[0-9-]')),
                  ],
                  validator: (value) {
                    if (value == null || value.trim().isEmpty) {
                      return '電話番号を入力してください';
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
                    helperText: 'インボイス制度対応の場合に入力してください',
                  ),
                  inputFormatters: [
                    FilteringTextInputFormatter.allow(RegExp(r'[A-Za-z0-9]')),
                    LengthLimitingTextInputFormatter(14),
                  ],
                  validator: (value) {
                    if (value != null && value.trim().isNotEmpty) {
                      if (!RegExp(r'^T\d{13}$').hasMatch(value.trim())) {
                        return 'インボイス番号はT+13桁の数字で入力してください';
                      }
                    }
                    return null;
                  },
                ),
                
                const SizedBox(height: 8),
                const Align(
                  alignment: Alignment.centerLeft,
                  child: Text(
                    '* 必須項目',
                    style: TextStyle(
                      fontSize: 12,
                      color: Colors.grey,
                    ),
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
      actions: [
        TextButton(
          onPressed: () => Navigator.of(context).pop(),
          child: const Text('キャンセル'),
        ),
        ElevatedButton(
          onPressed: _save,
          child: Text(widget.issuer == null ? '追加' : '更新'),
        ),
      ],
    );
  }
}
