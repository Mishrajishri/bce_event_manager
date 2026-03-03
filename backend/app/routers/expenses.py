"""Expenses API routes."""
from fastapi import APIRouter, Depends, HTTPException, status
from typing import List
from app.models import (
    ExpenseCreate,
    ExpenseUpdate,
    ExpenseResponse,
)
from app.auth import CurrentUser, get_current_user, require_organizer
from app.supabase import supabase_admin


router = APIRouter(prefix="/events/{event_id}/expenses", tags=["Expenses"])


@router.get("/", response_model=List[ExpenseResponse])
async def list_expenses(
    event_id: str,
    current_user: CurrentUser = Depends(require_organizer),
):
    """
    List all expenses for an event.
    
    Args:
        event_id: Event ID
        current_user: Current authenticated user
        
    Returns:
        List[ExpenseResponse]: List of expenses
        
    Raises:
        HTTPException: If event not found or access denied
    """
    # Verify event exists and user has permission
    event_response = supabase_admin.table("events").select("organizer_id").eq("id", event_id).execute()
    
    if not event_response.data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Event not found"
        )
    
    event = event_response.data[0]
    
    if current_user.role not in ("super_admin", "admin") and event["organizer_id"] != current_user.user_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You don't have permission to view expenses for this event"
        )
    
    response = supabase_admin.table("expenses").select("*").eq("event_id", event_id).order("date", desc=True).execute()
    
    return [ExpenseResponse(**item) for item in response.data]


@router.post("/", response_model=ExpenseResponse, status_code=status.HTTP_201_CREATED)
async def create_expense(
    event_id: str,
    expense_data: ExpenseCreate,
    current_user: CurrentUser = Depends(require_organizer),
):
    """
    Create a new expense.
    
    Args:
        event_id: Event ID
        expense_data: Expense creation data
        current_user: Current authenticated organizer
        
    Returns:
        ExpenseResponse: Created expense
        
    Raises:
        HTTPException: If event not found or access denied
    """
    # Verify event exists and user has permission
    event_response = supabase_admin.table("events").select("organizer_id").eq("id", event_id).execute()
    
    if not event_response.data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Event not found"
        )
    
    event = event_response.data[0]
    
    if current_user.role not in ("super_admin", "admin") and event["organizer_id"] != current_user.user_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You don't have permission to add expenses for this event"
        )
    
    # Create expense
    data = expense_data.model_dump()
    data["event_id"] = event_id
    data["created_by_id"] = current_user.user_id
    
    response = supabase_admin.table("expenses").insert(data).execute()
    
    if not response.data:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Failed to create expense"
        )
    
    return ExpenseResponse(**response.data[0])


@router.put("/{expense_id}", response_model=ExpenseResponse)
async def update_expense(
    event_id: str,
    expense_id: str,
    expense_data: ExpenseUpdate,
    current_user: CurrentUser = Depends(require_organizer),
):
    """
    Update an expense.
    
    Args:
        event_id: Event ID
        expense_id: Expense ID
        expense_data: Expense update data
        current_user: Current authenticated organizer
        
    Returns:
        ExpenseResponse: Updated expense
        
    Raises:
        HTTPException: If expense not found or access denied
    """
    # Verify expense exists
    expense_response = supabase_admin.table("expenses").select("*").eq("id", expense_id).eq("event_id", event_id).execute()
    
    if not expense_response.data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Expense not found"
        )
    
    # Verify event permission
    event_response = supabase_admin.table("events").select("organizer_id").eq("id", event_id).execute()
    
    if not event_response.data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Event not found"
        )
    
    event = event_response.data[0]
    
    if current_user.role not in ("super_admin", "admin") and event["organizer_id"] != current_user.user_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You don't have permission to update expenses for this event"
        )
    
    # Update expense
    update_data = {k: v for k, v in expense_data.model_dump().items() if v is not None}
    
    response = supabase_admin.table("expenses").update(update_data).eq("id", expense_id).execute()
    
    if not response.data:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Failed to update expense"
        )
    
    return ExpenseResponse(**response.data[0])


@router.delete("/{expense_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_expense(
    event_id: str,
    expense_id: str,
    current_user: CurrentUser = Depends(require_organizer),
):
    """
    Delete an expense.
    
    Args:
        event_id: Event ID
        expense_id: Expense ID
        current_user: Current authenticated organizer
        
    Raises:
        HTTPException: If expense not found or access denied
    """
    # Verify expense exists
    expense_response = supabase_admin.table("expenses").select("id").eq("id", expense_id).eq("event_id", event_id).execute()
    
    if not expense_response.data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Expense not found"
        )
    
    # Verify event permission
    event_response = supabase_admin.table("events").select("organizer_id").eq("id", event_id).execute()
    
    if not event_response.data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Event not found"
        )
    
    event = event_response.data[0]
    
    if current_user.role not in ("super_admin", "admin") and event["organizer_id"] != current_user.user_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You don't have permission to delete expenses for this event"
        )
    
    supabase_admin.table("expenses").delete().eq("id", expense_id).execute()
