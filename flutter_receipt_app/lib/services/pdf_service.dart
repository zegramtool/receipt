import 'package:pdf/pdf.dart';
import 'package:pdf/widgets.dart' as pw;
import 'package:printing/printing.dart';
import 'package:intl/intl.dart';
import '../models/receipt.dart';
import 'package:flutter/services.dart' show rootBundle; // for asset fallback if needed
import 'dart:io' as io;
import 'dart:typed_data';

class PdfService {
  static Future<void> generateReceipt(Receipt receipt) async {
    final pdf = pw.Document();

    // 日本語フォント
    final font = await PdfGoogleFonts.notoSansJapaneseRegular();
    final boldFont = await PdfGoogleFonts.notoSansJapaneseBold();

    // 印影画像（あれば読み込み）
    pw.ImageProvider? hankoImage;
    final hankoPath = receipt.issuer.hankoImagePath;
    if (hankoPath != null && hankoPath.isNotEmpty) {
      try {
        if (hankoPath.startsWith('assets/')) {
          hankoImage = await imageFromAssetBundle(hankoPath);
        } else {
          final file = io.File(hankoPath);
          if (await file.exists()) {
            final Uint8List bytes = await file.readAsBytes();
            hankoImage = pw.MemoryImage(bytes);
          }
        }
      } catch (_) {
        // 読み込み失敗は無視
      }
    }

    pdf.addPage(
      pw.Page(
        pageFormat: PdfPageFormat.a4,
        margin: pw.EdgeInsets.all(16 * PdfPageFormat.mm),
        build: (pw.Context context) {
          // 共通テキストスタイル
          final titleStyle = pw.TextStyle(font: boldFont, fontSize: 22);
          final labelStyle = pw.TextStyle(font: font, fontSize: 11);
          final valueStyle = pw.TextStyle(font: boldFont, fontSize: 11);

          // 顧客名
          final customer = pw.Container(
            padding: const pw.EdgeInsets.all(8),
            decoration: pw.BoxDecoration(
              border: pw.Border.all(color: PdfColors.black, width: 1),
            ),
            child: pw.Text(
              '${receipt.customerName} ${receipt.customerType}',
              style: pw.TextStyle(font: boldFont, fontSize: 14),
            ),
          );

          // 情報行（発行日/番号/但し）
          final infoRows = pw.Column(
            children: [
              _kvRow('発行日', DateFormat('yyyy年MM月dd日').format(receipt.date), labelStyle, valueStyle),
              _kvRow('領収書番号', receipt.receiptNumber, labelStyle, valueStyle),
              _kvRow('但し', receipt.description, labelStyle, valueStyle),
            ],
          );

          // 金額行
          final subtotal = receipt.totalAmount;
          final tax = receipt.taxAmount;
          final total = receipt.totalWithTax;
          final amountRows = pw.Column(
            children: [
              _kvRow('小計', _yen(subtotal), labelStyle, valueStyle),
              _kvRow('消費税（${(receipt.taxRate * 100).toInt()}%）', _yen(tax), labelStyle, valueStyle),
              _kvRow('合計', _yen(total), labelStyle.copyWith(font: boldFont, fontSize: 12), valueStyle.copyWith(fontSize: 12)),
            ],
          );

          // 発行者左、右に印影＋印紙枠
          final invoiceToShow = (receipt.invoiceNumber?.isNotEmpty ?? false)
              ? receipt.invoiceNumber!
              : receipt.issuer.invoiceNumber;

          final issuerLeft = pw.Column(
            crossAxisAlignment: pw.CrossAxisAlignment.start,
            children: [
              pw.Text(receipt.issuer.name, style: pw.TextStyle(font: boldFont, fontSize: 12)),
              pw.Text('〒${receipt.issuer.postalCode}', style: labelStyle),
              pw.Text(receipt.issuer.address, style: labelStyle),
              if (receipt.issuer.phone.trim().isNotEmpty)
                pw.Text('TEL: ${receipt.issuer.phone}', style: labelStyle),
              if (invoiceToShow.isNotEmpty)
                pw.Text('インボイス番号: $invoiceToShow', style: pw.TextStyle(font: font, fontSize: 10)),
            ],
          );

          final inshiBox = pw.Container(
            width: 64,
            height: 52,
            decoration: pw.BoxDecoration(
              border: pw.Border.all(color: PdfColors.black, width: 2),
            ),
            child: pw.Center(
              child: pw.Column(
                mainAxisSize: pw.MainAxisSize.min,
                children: [
                  pw.Text(
                    receipt.isElectronicReceipt ? '電子発行のため' : '収入印紙',
                    style: pw.TextStyle(font: font, fontSize: 8),
                  ),
                  pw.SizedBox(height: 2),
                  pw.Text(
                    receipt.isElectronicReceipt ? '印紙税不要' : _yen(receipt.stampDuty),
                    style: pw.TextStyle(font: boldFont, fontSize: 11),
                  ),
                ],
              ),
            ),
          );

          final rightStampCol = pw.Column(
            crossAxisAlignment: pw.CrossAxisAlignment.end,
            children: [
              if (hankoImage != null)
                pw.Container(
                  width: 80,
                  height: 80,
                  alignment: pw.Alignment.centerRight,
                  child: pw.Image(hankoImage!, width: 80, height: 80, fit: pw.BoxFit.contain),
                ),
              pw.SizedBox(height: 6),
              inshiBox,
            ],
          );

          return pw.Column(
            crossAxisAlignment: pw.CrossAxisAlignment.stretch,
            children: [
              pw.Center(child: pw.Text('領収書', style: titleStyle)),
              pw.SizedBox(height: 12),
              customer,
              pw.SizedBox(height: 12),
              infoRows,
              pw.SizedBox(height: 8),
              amountRows,
              pw.SizedBox(height: 12),
              pw.Row(
                crossAxisAlignment: pw.CrossAxisAlignment.start,
                mainAxisAlignment: pw.MainAxisAlignment.spaceBetween,
                children: [
                  pw.Expanded(child: issuerLeft),
                  pw.SizedBox(width: 12),
                  rightStampCol,
                ],
              ),
            ],
          );
        },
      ),
    );

    await Printing.layoutPdf(onLayout: (format) async => pdf.save());
  }
  
  // キー・値 行
  static pw.Widget _kvRow(String k, String v, pw.TextStyle kStyle, pw.TextStyle vStyle) {
    return pw.Padding(
      padding: const pw.EdgeInsets.symmetric(vertical: 2),
      child: pw.Row(
        mainAxisAlignment: pw.MainAxisAlignment.spaceBetween,
        children: [
          pw.Text(k, style: kStyle),
          pw.Text(v, style: vStyle),
        ],
      ),
    );
  }
  
  static String _yen(double v) => '¥${NumberFormat('#,###').format(v)}';
  
  static pw.Widget _buildAmountDetailRow(String label, double amount, pw.Font font) {
    return pw.Padding(
      padding: const pw.EdgeInsets.symmetric(vertical: 2),
      child: pw.Row(
        mainAxisAlignment: pw.MainAxisAlignment.spaceBetween,
        children: [
          pw.Text(label, style: pw.TextStyle(font: font, fontSize: 12)),
          pw.Text(
            '¥${NumberFormat('#,###').format(amount)}',
            style: pw.TextStyle(font: font, fontSize: 12),
          ),
        ],
      ),
    );
  }
  
  // 旧レイアウトヘルパー削除・置換
  
  // 旧発行者セクション削除（新レイアウトへ統合）
  
  // フッターは不要（プレビューと同一レイアウト）
}
