import 'package:flutter/material.dart';
import 'scan_screen.dart';
import 'result_screen.dart';
import '../services/api_service.dart';

class HomeScreen extends StatefulWidget {
  const HomeScreen({super.key});

  @override
  State<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen> {
  final TextEditingController _urlController = TextEditingController();
  bool _isLoading = false;

  void _analyzeInputUrl() async {
    final text = _urlController.text.trim();
    if (text.isEmpty) return;

    setState(() => _isLoading = true);
    final result = await ApiService.analyzeUrl(text);
    setState(() => _isLoading = false);

    if (mounted) {
      Navigator.push(
        context,
        MaterialPageRoute(
          builder: (ctx) => ResultScreen(result: result),
        ),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Scanzo Mobile'),
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.symmetric(horizontal: 24.0, vertical: 30.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            // Hero Badge
            Center(
              child: Container(
                padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 6),
                decoration: BoxDecoration(
                  color: const Color(0xFFECFDF5),
                  borderRadius: BorderRadius.circular(20),
                  border: Border.all(color: const Color(0xFF10B981).withOpacity(0.3)),
                ),
                child: const Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Icon(Icons.shield, size: 14, color: Color(0xFF059669)),
                    SizedBox(width: 6),
                    Text(
                      'Community Digital Safety Gateway',
                      style: TextStyle(color: Color(0xFF059669), fontSize: 12, fontWeight: FontWeight.w700),
                    ),
                  ],
                ),
              ),
            ),

            const SizedBox(height: 20),

            const Text(
              'Scan it. Check it.\nThen open it.',
              textAlign: TextAlign.center,
              style: TextStyle(
                fontSize: 28,
                fontWeight: FontWeight.w900,
                color: Color(0xFF090D16),
                height: 1.2,
              ),
            ),

            const SizedBox(height: 12),

            const Text(
              'Scanzo checks QR codes and suspicious links before you visit them to protect you from phishing, scams, and malware.',
              textAlign: TextAlign.center,
              style: TextStyle(fontSize: 14, color: Color(0xFF64748B), height: 1.5),
            ),

            const SizedBox(height: 36),

            // Scan QR Button (Main Action)
            ElevatedButton.icon(
              style: ElevatedButton.styleFrom(
                backgroundColor: const Color(0xFF059669),
                foregroundColor: Colors.white,
                padding: const EdgeInsets.symmetric(vertical: 18),
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
                elevation: 4,
                shadowColor: const Color(0xFF059669).withOpacity(0.4),
              ),
              icon: const Icon(Icons.qr_code_scanner, size: 24),
              label: const Text('SCAN QR CODE', style: TextStyle(fontSize: 16, fontWeight: FontWeight.w800)),
              onPressed: () {
                Navigator.push(
                  context,
                  MaterialPageRoute(builder: (ctx) => const ScanScreen()),
                );
              },
            ),

            const SizedBox(height: 24),

            // Check Link Input
            const Row(
              children: [
                Expanded(child: Divider()),
                Padding(
                  padding: EdgeInsets.symmetric(horizontal: 12),
                  child: Text('OR CHECK LINK', style: TextStyle(fontSize: 12, fontWeight: FontWeight.w700, color: Color(0xFF94A3B8))),
                ),
                Expanded(child: Divider()),
              ],
            ),

            const SizedBox(height: 20),

            TextField(
              controller: _urlController,
              decoration: InputDecoration(
                hintText: 'Paste suspicious link (e.g. https://...)',
                filled: true,
                fillColor: Colors.white,
                prefixIcon: const Icon(Icons.link, color: Color(0xFF059669)),
                suffixIcon: IconButton(
                  icon: _isLoading ? const SizedBox(width: 18, height: 18, child: CircularProgressIndicator(strokeWidth: 2)) : const Icon(Icons.arrow_forward),
                  onPressed: _analyzeInputUrl,
                ),
                border: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(14),
                  borderSide: const BorderSide(color: Color(0xFFCBD5E1)),
                ),
                enabledBorder: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(14),
                  borderSide: const BorderSide(color: Color(0xFFE2E8F0)),
                ),
                focusedBorder: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(14),
                  borderSide: const BorderSide(color: Color(0xFF059669), width: 2),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
