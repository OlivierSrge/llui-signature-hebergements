import 'package:flutter/material.dart';
import 'package:geolocator/geolocator.dart';
import 'package:image_picker/image_picker.dart';
import 'dart:io';
import '../models/trip.dart';

// =============================================================================
// Dialog : Check-in chauffeur (manuel ou incident)
// =============================================================================

enum CheckinStatus { ok, incident }

class CheckinResult {
  final CheckinStatus status;
  final int? kmTraveled;
  final String? note;
  final String? photoPath;

  const CheckinResult({
    required this.status,
    this.kmTraveled,
    this.note,
    this.photoPath,
  });
}

class CheckinDialog extends StatefulWidget {
  final ActiveTrip trip;
  final Position? currentPosition;
  final int kmTraveled;
  final bool isIncident;

  const CheckinDialog({
    super.key,
    required this.trip,
    this.currentPosition,
    required this.kmTraveled,
    this.isIncident = false,
  });

  @override
  State<CheckinDialog> createState() => _CheckinDialogState();
}

class _CheckinDialogState extends State<CheckinDialog> {
  final _formKey = GlobalKey<FormState>();
  final _kmController = TextEditingController();
  final _noteController = TextEditingController();

  CheckinStatus _status = CheckinStatus.ok;
  File? _photoFile;
  bool _isSubmitting = false;

  @override
  void initState() {
    super.initState();
    _kmController.text = widget.kmTraveled.toString();
    if (widget.isIncident) _status = CheckinStatus.incident;
  }

  Future<void> _pickPhoto() async {
    final picker = ImagePicker();
    final picked = await picker.pickImage(
      source: ImageSource.camera,
      maxWidth: 1200,
      imageQuality: 80,
    );
    if (picked != null) {
      setState(() => _photoFile = File(picked.path));
    }
  }

  void _submit() {
    if (!_formKey.currentState!.validate()) return;

    setState(() => _isSubmitting = true);

    final km = int.tryParse(_kmController.text.trim());

    Navigator.of(context).pop(
      CheckinResult(
        status:      _status,
        kmTraveled:  km,
        note:        _noteController.text.trim().isNotEmpty
                         ? _noteController.text.trim()
                         : null,
        photoPath:   _photoFile?.path,
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return AlertDialog(
      title: Row(
        children: [
          Icon(
            _status == CheckinStatus.incident
                ? Icons.warning_amber
                : Icons.location_on,
            color: _status == CheckinStatus.incident
                ? Colors.red
                : Colors.green,
          ),
          const SizedBox(width: 8),
          Text(
            _status == CheckinStatus.incident
                ? 'Signaler un incident'
                : 'Check-in',
          ),
        ],
      ),
      content: SingleChildScrollView(
        child: Form(
          key: _formKey,
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Statut
              Text(
                'Statut du voyage',
                style: Theme.of(context).textTheme.labelLarge,
              ),
              const SizedBox(height: 8),
              SegmentedButton<CheckinStatus>(
                segments: const [
                  ButtonSegment(
                    value: CheckinStatus.ok,
                    label: Text('Tout va bien'),
                    icon: Icon(Icons.check_circle),
                  ),
                  ButtonSegment(
                    value: CheckinStatus.incident,
                    label: Text('Incident'),
                    icon: Icon(Icons.warning),
                  ),
                ],
                selected: {_status},
                onSelectionChanged: (s) => setState(() => _status = s.first),
              ),

              const SizedBox(height: 16),

              // Kilomètre actuel
              TextFormField(
                controller: _kmController,
                keyboardType: TextInputType.number,
                decoration: const InputDecoration(
                  labelText: 'Kilomètre actuel',
                  suffixText: 'km',
                  prefixIcon: Icon(Icons.speed),
                  border: OutlineInputBorder(),
                ),
                validator: (v) {
                  if (v == null || v.isEmpty) return null; // Optionnel
                  final n = int.tryParse(v);
                  if (n == null || n < 0) return 'Nombre invalide';
                  if (n > widget.trip.roadbook.totalDistanceKm) {
                    return 'Dépasse la distance totale (${widget.trip.roadbook.totalDistanceKm} km)';
                  }
                  return null;
                },
              ),

              const SizedBox(height: 12),

              // Position GPS courante
              if (widget.currentPosition != null)
                Container(
                  padding: const EdgeInsets.all(8),
                  decoration: BoxDecoration(
                    color: Colors.green.shade50,
                    borderRadius: BorderRadius.circular(6),
                  ),
                  child: Row(
                    children: [
                      const Icon(Icons.gps_fixed, size: 16, color: Colors.green),
                      const SizedBox(width: 6),
                      Text(
                        '${widget.currentPosition!.latitude.toStringAsFixed(4)}, '
                        '${widget.currentPosition!.longitude.toStringAsFixed(4)}',
                        style: const TextStyle(fontSize: 12, fontFamily: 'monospace'),
                      ),
                    ],
                  ),
                )
              else
                Container(
                  padding: const EdgeInsets.all(8),
                  decoration: BoxDecoration(
                    color: Colors.orange.shade50,
                    borderRadius: BorderRadius.circular(6),
                  ),
                  child: const Row(
                    children: [
                      Icon(Icons.gps_off, size: 16, color: Colors.orange),
                      SizedBox(width: 6),
                      Text('Position GPS non disponible', style: TextStyle(fontSize: 12)),
                    ],
                  ),
                ),

              const SizedBox(height: 12),

              // Note (obligatoire si incident)
              TextFormField(
                controller: _noteController,
                maxLines: 3,
                decoration: InputDecoration(
                  labelText: _status == CheckinStatus.incident
                      ? 'Description de l\'incident *'
                      : 'Note (optionnel)',
                  prefixIcon: const Icon(Icons.note),
                  border: const OutlineInputBorder(),
                  hintText: _status == CheckinStatus.incident
                      ? 'Décrivez l\'incident...'
                      : 'Remarque sur le trajet...',
                ),
                validator: (v) {
                  if (_status == CheckinStatus.incident &&
                      (v == null || v.trim().isEmpty)) {
                    return 'Description requise pour un incident';
                  }
                  return null;
                },
              ),

              const SizedBox(height: 12),

              // Photo
              Row(
                children: [
                  Expanded(
                    child: OutlinedButton.icon(
                      onPressed: _pickPhoto,
                      icon: const Icon(Icons.camera_alt),
                      label: Text(
                        _photoFile != null ? 'Photo ajoutée ✓' : 'Ajouter une photo',
                      ),
                      style: OutlinedButton.styleFrom(
                        foregroundColor: _photoFile != null ? Colors.green : null,
                      ),
                    ),
                  ),
                  if (_photoFile != null) ...[
                    const SizedBox(width: 8),
                    ClipRRect(
                      borderRadius: BorderRadius.circular(6),
                      child: Image.file(
                        _photoFile!,
                        width: 50,
                        height: 50,
                        fit: BoxFit.cover,
                      ),
                    ),
                  ],
                ],
              ),

              // Zone blanche : indication SMS fallback
              const SizedBox(height: 8),
              const Text(
                'Sans réseau, envoyez : CHECKIN [CODE] OK|INCIDENT',
                style: TextStyle(fontSize: 11, color: Colors.grey),
              ),
            ],
          ),
        ),
      ),
      actions: [
        TextButton(
          onPressed: () => Navigator.of(context).pop(),
          child: const Text('ANNULER'),
        ),
        FilledButton(
          onPressed: _isSubmitting ? null : _submit,
          style: FilledButton.styleFrom(
            backgroundColor: _status == CheckinStatus.incident
                ? Colors.red
                : Colors.green.shade700,
          ),
          child: _isSubmitting
              ? const SizedBox(
                  width: 20,
                  height: 20,
                  child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white),
                )
              : Text(
                  _status == CheckinStatus.incident ? 'SIGNALER' : 'VALIDER',
                ),
        ),
      ],
    );
  }

  @override
  void dispose() {
    _kmController.dispose();
    _noteController.dispose();
    super.dispose();
  }
}
