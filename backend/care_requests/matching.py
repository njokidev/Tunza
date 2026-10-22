from caregivers.models import CaregiverProfile, requires_nurse
from .models import CareRequest, CareMatch
import math

WEIGHTS = {
    "specialty":    0.30,
    "availability": 0.25,
    "location":     0.15,
    "experience":   0.10,
    "verification": 0.10,
    "rating":       0.05,
    "price":        0.05,
}

def _km(lat1, lon1, lat2, lon2):
    R = 6371
    dlat = math.radians(lat2-lat1)
    dlon = math.radians(lon2-lon1)
    a = (math.sin(dlat/2)**2 +
         math.cos(math.radians(lat1))*math.cos(math.radians(lat2))*math.sin(dlon/2)**2)
    return R*2*math.asin(math.sqrt(a))

def score_caregiver(caregiver, cr):
    score   = 0.0
    reasons = []

    # specialty (30%)
    cg_specs = set(s.lower() for s in caregiver.specializations.values_list("name",flat=True))
    needed   = set(t.lower() for t in (cr.care_types or []))
    overlap  = cg_specs & needed
    if overlap:
        ratio = min(len(overlap)/max(len(needed),1), 1)
        score += ratio * 30
        reasons.append(f"Specializes in {', '.join(t.title() for t in overlap)}")

    # availability (25%)
    avail_days = set(caregiver.availability.values_list("day",flat=True))
    if avail_days or not cr.days_of_week:
        score += 25
        reasons.append("Available on your requested days")

    # location (15%) — the caregiver said they work in this area, or failing that, distance
    areas = {a.strip().lower() for a in (caregiver.work_areas or [])}
    if cr.location_name and cr.location_name.strip().lower() in areas:
        score += 15; reasons.append(f"Works in {cr.location_name}")
    elif caregiver.latitude and caregiver.longitude and cr.latitude and cr.longitude:
        d = _km(caregiver.latitude, caregiver.longitude, cr.latitude, cr.longitude)
        if d <= 5:   score += 15; reasons.append(f"{d:.1f} km from care location")
        elif d <= 15: score += 10; reasons.append(f"{d:.1f} km from care location")
        elif d <= 30: score += 5

    # experience (10%)
    if caregiver.years_exp >= 5:   score += 10; reasons.append(f"{caregiver.years_exp} years experience")
    elif caregiver.years_exp >= 2: score += 6;  reasons.append(f"{caregiver.years_exp} years experience")
    else:                          score += 2

    # verification (10%)
    if caregiver.user.is_verified: score += 7; reasons.append("Background checked")
    if caregiver.nurse_verified:   reasons.append("Verified nurse")
    if caregiver.certificate:      score += 3; reasons.append("Certificate on file")

    # rating (5%)
    if caregiver.rating_count >= 3:
        score += (float(caregiver.rating_avg)/5) * 5
        if caregiver.rating_avg >= 4.5:
            reasons.append(f"⭐ {caregiver.rating_avg} ({caregiver.rating_count} reviews)")

    # price fit (5%)
    rate = float(caregiver.hourly_rate)
    bmin = float(cr.budget_min)
    bmax = float(cr.budget_max)
    if bmax == 0 or bmin <= rate <= bmax:
        score += 5
        if bmax > 0: reasons.append("Rate fits your budget")

    return round(score, 1), reasons

def run_matching(care_request):
    caregivers = CaregiverProfile.objects.filter(
        user__is_verified=True, is_available=True
    ).prefetch_related("specializations","availability")
    if requires_nurse(care_request.care_types):
        # Medication administration: verified nurses only, never ranked in lower down.
        caregivers = caregivers.filter(nurse_verified=True)

    results = []
    for cg in caregivers:
        s, reasons = score_caregiver(cg, care_request)
        if s > 15:
            results.append((cg, s, reasons))

    results.sort(key=lambda x: x[1], reverse=True)

    for cg, s, reasons in results[:10]:
        CareMatch.objects.update_or_create(
            care_request=care_request, caregiver=cg,
            defaults={"match_score": s, "match_reasons": reasons,
                      "status": CareMatch.Status.SUGGESTED}
        )

    care_request.status = CareRequest.Status.MATCHED
    care_request.save(update_fields=["status"])
    return results[:10]
