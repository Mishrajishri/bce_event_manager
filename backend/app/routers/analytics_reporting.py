"""Analytics Reporting Router - Phase 8: Advanced Analytics & Reporting."""
from fastapi import APIRouter, Depends, HTTPException, status, Query
from typing import List, Optional
from datetime import datetime, timedelta, date
from pydantic import BaseModel
from pydantic import Field
import json

from app.supabase import supabase_admin
from app.auth import get_current_user, require_organizer
from app.auth import CurrentUser, require_organizer

router = APIRouter(prefix="/analytics-reporting", tags=["Analytics Reporting"])


# ============================================
# Pydantic Models
# ============================================

class CohortCreate(BaseModel):
    cohort_name: str
    cohort_type: str  # 'registration_date', 'event_type', 'college', 'year'
    start_date: date
    end_date: date


class CohortResponse(BaseModel):
    id: str
    cohort_name: str
    cohort_type: str
    cohort_date: Optional[date] = None
    cohort_period: Optional[str] = None
    user_count: int
    created_at: str


class CohortAnalyticsResponse(BaseModel):
    cohort_id: str
    metric_type: str
    metric_value: float
    period: str


class RevenueForecastCreate(BaseModel):
    event_id: str
    forecast_date: date
    predicted_revenue: float
    confidence_level: Optional[float] = None


class RevenueForecastResponse(BaseModel):
    id: str
    event_id: str
    forecast_date: date
    predicted_revenue: float
    confidence_level: Optional[float]
    actual_revenue: Optional[float]
    variance: Optional[float]
    created_at: str


class ConversionFunnelResponse(BaseModel):
    id: str
    event_id: str
    funnel_name: str
    steps: List[dict]
    total_conversions: int
    conversion_rate: float
    calculated_at: str


class ReportTemplateCreate(BaseModel):
    name: str
    description: Optional[str] = None
    report_type: str
    parameters: Optional[dict] = {}
    columns: Optional[List[dict]] = []
    is_public: bool = False


class ReportTemplateResponse(BaseModel):
    id: str
    name: str
    description: Optional[str]
    report_type: str
    parameters: dict
    columns: List[dict]
    is_public: bool
    created_by: Optional[str]
    created_at: str


class SavedReportCreate(BaseModel):
    template_id: str
    name: str
    parameters: Optional[dict] = {}
    expires_at: Optional[datetime] = None


class ScheduledReportCreate(BaseModel):
    template_id: str
    schedule_type: str  # 'daily', 'weekly', 'monthly'
    schedule_time: str  # HH:MM format
    schedule_day: Optional[int] = None
    recipients: List[str] = []


class DemographicsResponse(BaseModel):
    event_id: str
    event_name: str
    event_type: str
    branch: Optional[str]
    year: Optional[int]
    college_name: Optional[str]
    participant_count: int
    paid_count: int
    total_revenue: float


# ============================================
# 8.1 Cohort Analysis
# ============================================

@router.post("/cohorts", response_model=CohortResponse, status_code=status.HTTP_201_CREATED)
async def create_cohort(
    cohort: CohortCreate,
    current_user: CurrentUser = Depends(require_organizer),
):
    """Create a new user cohort for analysis."""
    # Generate cohort
    response = supabase_admin.rpc("generate_user_cohort", {
        "p_cohort_name": cohort.cohort_name,
        "p_cohort_type": cohort.cohort_type,
        "p_start_date": str(cohort.start_date),
        "p_end_date": str(cohort.end_date),
    }).execute()
    
    if not response.data:
        # Fallback: create directly
        insert_data = {
            "cohort_name": cohort.cohort_name,
            "cohort_type": cohort.cohort_type,
            "cohort_date": cohort.start_date,
            "cohort_period": cohort.start_date.strftime("%Y-%m"),
            "criteria": {"start_date": str(cohort.start_date), "end_date": str(cohort.end_date)},
        }
        result = supabase_admin.table("user_cohorts").insert(insert_data).execute()
        cohort_id = result.data[0]["id"]
    else:
        cohort_id = response.data[0] if isinstance(response.data[0], str) else response.data[0].get("id")
    
    # Get the created cohort
    get_response = supabase_admin.table("user_cohorts").select("*").eq("id", cohort_id).execute()
    if not get_response.data:
        raise HTTPException(status_code=400, detail="Failed to create cohort")
    
    return CohortResponse(**get_response.data[0])


@router.get("/cohorts", response_model=List[CohortResponse])
async def list_cohorts(
    cohort_type: Optional[str] = None,
    current_user: CurrentUser = Depends(require_organizer),
):
    """List all user cohorts."""
    query = supabase_admin.table("user_cohorts").select("*").order("created_at", desc=True)
    
    if cohort_type:
        query = query.eq("cohort_type", cohort_type)
    
    response = query.execute()
    return [CohortResponse(**item) for item in response.data]


@router.get("/cohorts/{cohort_id}/analytics", response_model=List[CohortAnalyticsResponse])
async def get_cohort_analytics(
    cohort_id: str,
    current_user: CurrentUser = Depends(require_organizer),
):
    """Get analytics for a specific cohort."""
    response = supabase_admin.table("cohort_analytics").select("*").eq("cohort_id", cohort_id).execute()
    return [CohortAnalyticsResponse(**item) for item in response.data]


# ============================================
# 8.2 Revenue Forecasting
# ============================================

@router.post("/forecasts", response_model=RevenueForecastResponse, status_code=status.HTTP_201_CREATED)
async def create_forecast(
    forecast: RevenueForecastCreate,
    current_user: CurrentUser = Depends(require_organizer),
):
    """Create a revenue forecast for an event."""
    # Verify organizer has access to the event
    event = supabase_admin.table("events").select("organizer_id").eq("id", forecast.event_id).execute()
    if not event.data:
        raise HTTPException(status_code=404, detail="Event not found")
    
    if event.data[0]["organizer_id"] != current_user.user_id:
        raise HTTPException(status_code=403, detail="Not authorized to forecast for this event")
    
    # Get actual revenue if event is completed
    registrations = supabase_admin.table("registrations").select("payment_amount").eq("event_id", forecast.event_id).eq("payment_status", "paid").execute()
    actual_revenue = sum(r.get("payment_amount", 0) for r in registrations.data) if registrations.data else 0
    
    data = {
        "event_id": forecast.event_id,
        "forecast_date": forecast.forecast_date,
        "predicted_revenue": forecast.predicted_revenue,
        "confidence_level": forecast.confidence_level,
        "actual_revenue": actual_revenue,
        "variance": actual_revenue - forecast.predicted_revenue if actual_revenue else None,
    }
    
    response = supabase_admin.table("revenue_forecasts").insert(data).execute()
    return RevenueForecastResponse(**response.data[0])


@router.get("/events/{event_id}/forecasts", response_model=List[RevenueForecastResponse])
async def get_event_forecasts(
    event_id: str,
    current_user: CurrentUser = Depends(require_organizer),
):
    """Get revenue forecasts for an event."""
    # Verify organizer has access
    event = supabase_admin.table("events").select("organizer_id").eq("id", event_id).execute()
    if not event.data:
        raise HTTPException(status_code=404, detail="Event not found")
    
    if event.data[0]["organizer_id"] != current_user.user_id:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    response = supabase_admin.table("revenue_forecasts").select("*").eq("event_id", event_id).order("forecast_date", desc=True).execute()
    return [RevenueForecastResponse(**item) for item in response.data]


@router.get("/events/{event_id}/forecast-summary")
async def get_forecast_summary(
    event_id: str,
    current_user: CurrentUser = Depends(require_organizer),
):
    """Get forecast vs actual summary."""
    # Verify organizer has access
    event = supabase_admin.table("events").select("organizer_id").eq("id", event_id).execute()
    if not event.data or event.data[0]["organizer_id"] != current_user.user_id:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    forecasts = supabase_admin.table("revenue_forecasts").select("*").eq("event_id", event_id).order("forecast_date", desc=True).limit(5).execute()
    
    if not forecasts.data:
        return {"message": "No forecasts available"}
    
    total_predicted = sum(f.get("predicted_revenue", 0) for f in forecasts.data)
    total_actual = sum(f.get("actual_revenue", 0) for f in forecasts.data if f.get("actual_revenue"))
    
    return {
        "total_predicted": total_predicted,
        "total_actual": total_actual,
        "variance": total_actual - total_predicted,
        "accuracy": ((total_actual / total_predicted * 100) if total_predicted > 0 else 0),
        "forecasts": forecasts.data,
    }


# ============================================
# 8.3 Conversion Funnel
# ============================================

@router.post("/events/{event_id}/funnel", response_model=ConversionFunnelResponse)
async def calculate_funnel(
    event_id: str,
    funnel_name: str = "default",
    current_user: CurrentUser = Depends(require_organizer),
):
    """Calculate conversion funnel for an event."""
    # Verify organizer has access
    event = supabase_admin.table("events").select("organizer_id").eq("id", event_id).execute()
    if not event.data or event.data[0]["organizer_id"] != current_user.user_id:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    # Calculate funnel
    response = supabase_admin.rpc("calculate_conversion_funnel", {
        "p_event_id": event_id,
        "p_funnel_name": funnel_name,
    }).execute()
    
    if not response.data:
        raise HTTPException(status_code=400, detail="Failed to calculate funnel")
    
    # Get the created funnel
    funnel_id = response.data[0] if isinstance(response.data[0], str) else response.data[0].get("id")
    get_response = supabase_admin.table("conversion_funnels").select("*").eq("id", funnel_id).execute()
    
    if not get_response.data:
        raise HTTPException(status_code=400, detail="Failed to get funnel")
    
    return ConversionFunnelResponse(**get_response.data[0])


@router.get("/events/{event_id}/funnels", response_model=List[ConversionFunnelResponse])
async def list_funnels(
    event_id: str,
    current_user: CurrentUser = Depends(require_organizer),
):
    """List conversion funnels for an event."""
    # Verify organizer has access
    event = supabase_admin.table("events").select("organizer_id").eq("id", event_id).execute()
    if not event.data or event.data[0]["organizer_id"] != current_user.user_id:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    response = supabase_admin.table("conversion_funnels").select("*").eq("event_id", event_id).order("calculated_at", desc=True).execute()
    return [ConversionFunnelResponse(**item) for item in response.data]


# ============================================
# 8.4 Demographics
# ============================================

@router.get("/events/{event_id}/demographics", response_model=List[DemographicsResponse])
async def get_event_demographics(
    event_id: str,
    current_user: CurrentUser = Depends(require_organizer),
):
    """Get demographics breakdown for an event."""
    # Verify organizer has access
    event = supabase_admin.table("events").select("organizer_id").eq("id", event_id).execute()
    if not event.data or event.data[0]["organizer_id"] != current_user.user_id:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    # Query the demographics view
    response = supabase_admin.table("event_demographics").select("*").eq("event_id", event_id).execute()
    return [DemographicsResponse(**item) for item in response.data]


@router.get("/demographics/summary")
async def get_demographics_summary(
    event_type: Optional[str] = None,
    current_user: CurrentUser = Depends(require_organizer),
):
    """Get platform-wide demographics summary."""
    query = supabase_admin.table("event_demographics").select("*")
    
    if event_type:
        query = query.eq("event_type", event_type)
    
    response = query.execute()
    
    # Aggregate by branch
    by_branch = {}
    by_college = {}
    by_year = {}
    
    for row in response.data:
        branch = row.get("branch") or "Unknown"
        college = row.get("college_name") or "Unknown"
        year = row.get("year") or "Unknown"
        
        if branch not in by_branch:
            by_branch[branch] = {"name": branch, "count": 0, "revenue": 0}
        by_branch[branch]["count"] += row.get("participant_count", 0)
        by_branch[branch]["revenue"] += row.get("total_revenue", 0)
        
        if college not in by_college:
            by_college[college] = {"name": college, "count": 0, "revenue": 0}
        by_college[college]["count"] += row.get("participant_count", 0)
        by_college[college]["revenue"] += row.get("total_revenue", 0)
        
        if str(year) not in by_year:
            by_year[str(year)] = {"name": str(year), "count": 0, "revenue": 0}
        by_year[str(year)]["count"] += row.get("participant_count", 0)
        by_year[str(year)]["revenue"] += row.get("total_revenue", 0)
    
    return {
        "by_branch": list(by_branch.values()),
        "by_college": list(by_college.values()),
        "by_year": list(by_year.values()),
    }


# ============================================
# 8.5 Custom Reports
# ============================================

@router.post("/reports/templates", response_model=ReportTemplateResponse, status_code=status.HTTP_201_CREATED)
async def create_report_template(
    template: ReportTemplateCreate,
    current_user: CurrentUser = Depends(get_current_user),
):
    """Create a custom report template."""
    data = template.model_dump()
    data["created_by"] = current_user.user_id
    data["created_at"] = datetime.utcnow().isoformat()
    
    response = supabase_admin.table("report_templates").insert(data).execute()
    return ReportTemplateResponse(**response.data[0])


@router.get("/reports/templates", response_model=List[ReportTemplateResponse])
async def list_report_templates(
    report_type: Optional[str] = None,
    current_user: CurrentUser = Depends(get_current_user),
):
    """List available report templates."""
    query = supabase_admin.table("report_templates").select("*")
    
    # Get public templates or user's own
    query = query.or_(f"is_public.eq.true,created_by.eq.{current_user.user_id}")
    
    if report_type:
        query = query.eq("report_type", report_type)
    
    response = query.order("created_at", desc=True).execute()
    return [ReportTemplateResponse(**item) for item in response.data]


@router.get("/reports/templates/{template_id}", response_model=ReportTemplateResponse)
async def get_report_template(
    template_id: str,
    current_user: CurrentUser = Depends(get_current_user),
):
    """Get a specific report template."""
    response = supabase_admin.table("report_templates").select("*").eq("id", template_id).execute()
    
    if not response.data:
        raise HTTPException(status_code=404, detail="Template not found")
    
    template = response.data[0]
    
    # Check access
    if not template.get("is_public") and template.get("created_by") != current_user.user_id:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    return ReportTemplateResponse(**template)


@router.put("/reports/templates/{template_id}", response_model=ReportTemplateResponse)
async def update_report_template(
    template_id: str,
    template: ReportTemplateCreate,
    current_user: CurrentUser = Depends(get_current_user),
):
    """Update a report template."""
    # Verify ownership
    existing = supabase_admin.table("report_templates").select("*").eq("id", template_id).execute()
    if not existing.data:
        raise HTTPException(status_code=404, detail="Template not found")
    
    if existing.data[0].get("created_by") != current_user.user_id:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    data = template.model_dump()
    data["updated_at"] = datetime.utcnow().isoformat()
    
    response = supabase_admin.table("report_templates").update(data).eq("id", template_id).execute()
    return ReportTemplateResponse(**response.data[0])


@router.delete("/reports/templates/{template_id}")
async def delete_report_template(
    template_id: str,
    current_user: CurrentUser = Depends(get_current_user),
):
    """Delete a report template."""
    # Verify ownership
    existing = supabase_admin.table("report_templates").select("created_by").eq("id", template_id).execute()
    if not existing.data:
        raise HTTPException(status_code=404, detail="Template not found")
    
    if existing.data[0].get("created_by") != current_user.user_id:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    supabase_admin.table("report_templates").delete().eq("id", template_id).execute()
    return {"message": "Template deleted"}


# ============================================
# 8.6 Scheduled Reports
# ============================================

@router.post("/reports/scheduled", status_code=status.HTTP_201_CREATED)
async def create_scheduled_report(
    report: ScheduledReportCreate,
    current_user: CurrentUser = Depends(get_current_user),
):
    """Create a scheduled report."""
    # Verify template exists
    template = supabase_admin.table("report_templates").select("*").eq("id", report.template_id).execute()
    if not template.data:
        raise HTTPException(status_code=404, detail="Template not found")
    
    # Calculate next run
    now = datetime.utcnow()
    if report.schedule_type == "daily":
        hour, minute = map(int, report.schedule_time.split(":"))
        next_run = now.replace(hour=hour, minute=minute, second=0)
        if next_run <= now:
            next_run += timedelta(days=1)
    elif report.schedule_type == "weekly":
        hour, minute = map(int, report.schedule_time.split(":"))
        days_ahead = (report.schedule_day or 1) - now.weekday()
        if days_ahead <= 0:
            days_ahead += 7
        next_run = now.replace(hour=hour, minute=minute, second=0) + timedelta(days=days_ahead)
    else:  # monthly
        hour, minute = map(int, report.schedule_time.split(":"))
        day = min(report.schedule_day or 1, 28)
        next_run = now.replace(day=day, hour=hour, minute=minute, second=0)
        if next_run <= now:
            next_run = (next_run + timedelta(days=31)).replace(day=min(report.schedule_day or 1, 28))
    
    data = {
        "template_id": report.template_id,
        "schedule_type": report.schedule_type,
        "schedule_time": report.schedule_time,
        "schedule_day": report.schedule_day,
        "recipients": report.recipients,
        "next_run_at": next_run.isoformat(),
        "created_by": current_user.user_id,
    }
    
    response = supabase_admin.table("scheduled_reports").insert(data).execute()
    return response.data[0]


@router.get("/reports/scheduled", status_code=status.HTTP_201_CREATED)
async def list_scheduled_reports(
    current_user: CurrentUser = Depends(get_current_user),
):
    """List scheduled reports for current user."""
    response = supabase_admin.table("scheduled_reports").select("*").eq("created_by", current_user.user_id).execute()
    return response.data


@router.delete("/reports/scheduled/{report_id}")
async def delete_scheduled_report(
    report_id: str,
    current_user: CurrentUser = Depends(get_current_user),
):
    """Delete a scheduled report."""
    supabase_admin.table("scheduled_reports").delete().eq("id", report_id).eq("created_by", current_user.user_id).execute()
    return {"message": "Scheduled report deleted"}


@router.put("/reports/scheduled/{report_id}/toggle")
async def toggle_scheduled_report(
    report_id: str,
    current_user: CurrentUser = Depends(get_current_user),
):
    """Toggle a scheduled report active/inactive."""
    existing = supabase_admin.table("scheduled_reports").select("is_active").eq("id", report_id).eq("created_by", current_user.user_id).execute()
    if not existing.data:
        raise HTTPException(status_code=404, detail="Scheduled report not found")
    
    new_status = not existing.data[0]["is_active"]
    supabase_admin.table("scheduled_reports").update({"is_active": new_status}).eq("id", report_id).execute()
    return {"is_active": new_status}


# ============================================
# 8.7 Report Generation
# ============================================

@router.post("/reports/generate")
async def generate_report(
    template_id: str,
    parameters: Optional[dict] = {},
    current_user: CurrentUser = Depends(get_current_user),
):
    """Generate a report based on a template."""
    # Get template
    template = supabase_admin.table("report_templates").select("*").eq("id", template_id).execute()
    if not template.data:
        raise HTTPException(status_code=404, detail="Template not found")
    
    tmpl = template.data[0]
    
    # Check access
    if not tmpl.get("is_public") and tmpl.get("created_by") != current_user.user_id:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    # Merge parameters
    params = {**tmpl.get("parameters", {}), **parameters}
    
    # Generate report based on type
    report_type = tmpl.get("report_type")
    data = []
    
    if report_type == "summary":
        # Get summary data
        events = supabase_admin.table("events").select("*").execute()
        for event in events.data:
            regs = supabase_admin.table("registrations").select("id", count="exact").eq("event_id", event["id"]).execute()
            data.append({
                "event_name": event["name"],
                "status": event["status"],
                "registrations": regs.count or 0,
            })
    
    elif report_type == "financial":
        events = supabase_admin.table("events").select("*").execute()
        for event in events.data:
            regs = supabase_admin.table("registrations").select("payment_amount").eq("event_id", event["id"]).eq("payment_status", "paid").execute()
            revenue = sum(r.get("payment_amount", 0) for r in regs.data)
            data.append({
                "event_name": event["name"],
                "revenue": revenue,
            })
    
    elif report_type == "engagement":
        activities = supabase_admin.table("user_activity_log").select("action").execute()
        action_counts = {}
        for a in activities.data:
            action = a.get("action")
            action_counts[action] = action_counts.get(action, 0) + 1
        data = [{"action": k, "count": v} for k, v in action_counts.items()]
    
    # Save the report
    saved = supabase_admin.table("saved_reports").insert({
        "template_id": template_id,
        "name": f"{tmpl['name']} - {datetime.utcnow().strftime('%Y-%m-%d %H:%M')}",
        "parameters": params,
        "generated_at": datetime.utcnow().isoformat(),
        "created_by": current_user.user_id,
    }).execute()
    
    return {
        "template_name": tmpl["name"],
        "report_type": report_type,
        "data": data,
        "columns": tmpl.get("columns", []),
        "generated_at": datetime.utcnow().isoformat(),
    }
