import 'package:flutter/material.dart';
import 'package:webview_flutter/webview_flutter.dart';
import 'package:url_launcher/url_launcher.dart';
import 'package:share_plus/share_plus.dart';

void main() {
  runApp(const ReceiptWebViewApp());
}

class ReceiptWebViewApp extends StatelessWidget {
  const ReceiptWebViewApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: '領収書アプリ',
      theme: ThemeData(
        primarySwatch: Colors.blue,
        useMaterial3: true,
      ),
      home: const WebViewScreen(),
      debugShowCheckedModeBanner: false,
    );
  }
}

class WebViewScreen extends StatefulWidget {
  const WebViewScreen({super.key});

  @override
  State<WebViewScreen> createState() => _WebViewScreenState();
}

class _WebViewScreenState extends State<WebViewScreen> {
  late final WebViewController _controller;
  bool _isLoading = true;
  String _currentUrl = 'https://zegramtools-receipt.web.app';

  @override
  void initState() {
    super.initState();
    _initializeWebView();
  }

  void _initializeWebView() {
    _controller = WebViewController()
      ..setJavaScriptMode(JavaScriptMode.unrestricted)
      ..setBackgroundColor(const Color(0x00000000))
      ..setNavigationDelegate(
        NavigationDelegate(
          onProgress: (int progress) {
            // Update loading state
          },
          onPageStarted: (String url) {
            setState(() {
              _isLoading = true;
            });
          },
          onPageFinished: (String url) {
            setState(() {
              _isLoading = false;
              _currentUrl = url;
            });
          },
          onWebResourceError: (WebResourceError error) {
            debugPrint('WebView error: ${error.description}');
          },
          onNavigationRequest: (NavigationRequest request) {
            debugPrint('Navigation to ${request.url}');
            return NavigationDecision.navigate;
          },
        ),
      )
      ..loadRequest(Uri.parse(_currentUrl));
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('領収書アプリ'),
        backgroundColor: Theme.of(context).colorScheme.inversePrimary,
        actions: [
          if (_isLoading)
            const Padding(
              padding: EdgeInsets.all(16.0),
              child: SizedBox(
                width: 20,
                height: 20,
                child: CircularProgressIndicator(strokeWidth: 2),
              ),
            ),
          IconButton(
            icon: const Icon(Icons.refresh),
            onPressed: () {
              _controller.reload();
            },
          ),
          IconButton(
            icon: const Icon(Icons.share),
            onPressed: () {
              Share.share(_currentUrl, subject: '領収書アプリ');
            },
          ),
          PopupMenuButton<String>(
            onSelected: (String value) {
              switch (value) {
                case 'open_browser':
                  _openInBrowser();
                  break;
                case 'reload':
                  _controller.reload();
                  break;
              }
            },
            itemBuilder: (BuildContext context) => [
              const PopupMenuItem<String>(
                value: 'open_browser',
                child: Text('ブラウザで開く'),
              ),
              const PopupMenuItem<String>(
                value: 'reload',
                child: Text('再読み込み'),
              ),
            ],
          ),
        ],
      ),
      body: SafeArea(
        child: WebViewWidget(controller: _controller),
      ),
      bottomNavigationBar: BottomAppBar(
        child: Row(
          mainAxisAlignment: MainAxisAlignment.spaceEvenly,
          children: [
            IconButton(
              icon: const Icon(Icons.arrow_back),
              onPressed: () async {
                if (await _controller.canGoBack()) {
                  await _controller.goBack();
                }
              },
            ),
            IconButton(
              icon: const Icon(Icons.arrow_forward),
              onPressed: () async {
                if (await _controller.canGoForward()) {
                  await _controller.goForward();
                }
              },
            ),
            IconButton(
              icon: const Icon(Icons.home),
              onPressed: () {
                _controller.loadRequest(Uri.parse('https://zegramtools-receipt.web.app'));
              },
            ),
          ],
        ),
      ),
    );
  }

  void _openInBrowser() async {
    final Uri url = Uri.parse(_currentUrl);
    if (!await launchUrl(url, mode: LaunchMode.externalApplication)) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('ブラウザで開けませんでした')),
        );
      }
    }
  }
}