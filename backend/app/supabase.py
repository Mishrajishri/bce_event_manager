"""Supabase client configuration and helper functions."""
from supabase import create_client, Client
from app.config import settings


def get_supabase_client() -> Client:
    """
    Get the Supabase client instance.
    
    Returns:
        Client: Supabase client configured with URL and anon key
    """
    return create_client(
        supabase_url=settings.supabase_url,
        supabase_key=settings.supabase_anon_key
    )


def get_supabase_admin_client() -> Client:
    """
    Get the Supabase admin client with service role key.
    This should only be used in server-side operations that need elevated privileges.
    
    Returns:
        Client: Supabase client configured with service role key
    """
    return create_client(
        supabase_url=settings.supabase_url,
        supabase_key=settings.supabase_service_role_key
    )


# Singleton instances
supabase: Client = get_supabase_client()
supabase_admin: Client = get_supabase_admin_client()
