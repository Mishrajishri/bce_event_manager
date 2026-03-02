import sys
import os

# Add the backend directory to python path so we can import app modules
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app.supabase import supabase_admin

def confirm_users():
    try:
        users = supabase_admin.auth.admin.list_users()
        for user in users:
            if not user.email_confirmed_at:
                print(f"Confirming user: {user.email}")
                supabase_admin.auth.admin.update_user_by_id(
                    user.id,
                    email_confirm=True
                )
        print("Done confirming users.")
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    confirm_users()
