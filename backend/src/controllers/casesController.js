import { asyncHandler } from '../middleware/errorHandler.js';
import { supabase } from '../config/supabase.js';
import { assessImageBuffer } from '../services/assessmentService.js';
import { findNearestTeamForLocation, findNearbyActiveCases } from '../services/dispatchService.js';
import { classifyAgainstExisting } from '../services/dedupService.js';

export const createCase = asyncHandler(async (req, res) => {
  const { lat, lng, landmark, description, reporterContact } = req.body;

  if (!req.file) {
    return res.status(400).json({ error: 'image file is required' });
  }

  if (!lat || !lng) {
    return res.status(400).json({ error: 'lat and lng are required' });
  }

  const parsedLat = Number(lat);
  const parsedLng = Number(lng);

  if (Number.isNaN(parsedLat) || Number.isNaN(parsedLng)) {
    return res.status(400).json({ error: 'lat and lng must be valid numbers' });
  }

  // 1. AI image assessment
  const assessment = await assessImageBuffer(req.file.buffer, req.file.mimetype);
  const reportText = description ?? assessment.injurySummary;


  // 2. Check for nearby active cases (dedup/escalation check)
  const nearbyCases = await findNearbyActiveCases(parsedLat, parsedLng);

  if (nearbyCases.length > 0) {
    const existingCase = nearbyCases[0]; // closest one
    
    const classification = await classifyAgainstExisting(reportText, existingCase);

    if (classification.classification === 'duplicate') {
      const isSameReporter = existingCase.reporter_id && existingCase.reporter_id === req.user.id;

      // Increment report_count, no new case created
      const { data: updatedCase, error: updateError } = await supabase
        .from('rescue_cases')
        .update({
          report_count: existingCase.report_count + 1,
          updated_at: new Date().toISOString(),
        })
        .eq('id', existingCase.id)
        .select()
        .single();

      if (updateError) {
        throw Object.assign(new Error(updateError.message), { status: 500 });
      }

      await supabase.from('rescue_updates').insert({
        case_id: existingCase.id,
        status: updatedCase.status,
        note: `${isSameReporter ? 'Same reporter resubmitted' : 'New reporter confirms'}: ${classification.reasoning}`,
        updated_by: req.user.id,
      });

      return res.status(200).json({
        case: updatedCase,
        assessment,
        classification,
        action: 'duplicate_merged',
      });
    }

    if (classification.classification === 'escalation') {
      const isSameReporter = existingCase.reporter_id && existingCase.reporter_id === req.user.id;
      const escalatedStatus = existingCase.assigned_team_id ? 'dispatched' : 'triaged';

      const { data: updatedCase, error: updateError } = await supabase
        .from('rescue_cases')
        .update({
          urgency_score: classification.updatedUrgencyScore,
          description: reportText,
          status: escalatedStatus,
          report_count: existingCase.report_count + 1,
          updated_at: new Date().toISOString(),
        })
        .eq('id', existingCase.id)
        .select()
        .single();

      if (updateError) {
        throw Object.assign(new Error(updateError.message), { status: 500 });
      }

      await supabase.from('rescue_updates').insert({
        case_id: existingCase.id,
        status: escalatedStatus,
        note: `ESCALATION (${isSameReporter ? 'same reporter' : 'new reporter'}): ${classification.reasoning}`,
        updated_by: req.user.id,
      });

      return res.status(200).json({
        case: updatedCase,
        assessment,
        classification,
        action: 'escalated',
      });
    }
  }

  // 3. No nearby case -- create a new baseline case
  const teams = await findNearestTeamForLocation(parsedLat, parsedLng);
  const nearestTeam = teams[0] ?? null;

  const { data: caseRow, error: caseError } = await supabase
    .from('rescue_cases')
    .insert({
      reporter_id: req.user?.id ?? null,
      reporter_contact: reporterContact ?? null,
      animal_type:
        assessment.visibleAnimalType && assessment.visibleAnimalType !== 'unclear'
          ? assessment.visibleAnimalType
          : 'other',
      description: reportText,
      urgency_score: assessment.urgencyScore,
      status: nearestTeam ? 'dispatched' : 'triaged',
      location: `SRID=4326;POINT(${parsedLng} ${parsedLat})`,
      landmark: landmark ?? null,
      assigned_team_id: nearestTeam?.team_id ?? null,
    })
    .select()
    .single();

  if (caseError) {
    throw Object.assign(new Error(caseError.message), { status: 500 });
  }

  await supabase.from('rescue_updates').insert({
    case_id: caseRow.id,
    status: caseRow.status,
    note: nearestTeam
      ? `Auto-assigned to ${nearestTeam.team_name} (${(nearestTeam.distance_meters / 1000).toFixed(2)}km away)`
      : 'No available team found within radius',
    updated_by: req.user?.id ?? null,
  });
res.status(201).json({
    case: caseRow,
    assessment,
    nearestTeam,
    action: 'new_case',
  });
});