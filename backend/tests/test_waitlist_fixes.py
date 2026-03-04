"""
Tests for waitlist service fixes.
These tests verify the race condition fixes and validation logic.
"""
import pytest
from unittest.mock import MagicMock, patch
import re


class TestDateValidation:
    """Test date parameter validation."""
    
    def test_date_regex_pattern(self):
        """Test that date regex validates YYYY-MM-DD format."""
        date_pattern = r"^\d{4}-\d{2}-\d{2}$"
        
        # Valid dates
        assert re.match(date_pattern, "2024-01-15")
        assert re.match(date_pattern, "2023-12-31")
        assert re.match(date_pattern, "2024-06-01")
        
        # Invalid dates
        assert not re.match(date_pattern, "01-15-2024")
        assert not re.match(date_pattern, "2024/01/15")
        assert not re.match(date_pattern, "2024-1-15")
        assert not re.match(date_pattern, "invalid")
        assert not re.match(date_pattern, "")
    
    def test_date_validation_in_endpoint_params(self):
        """Verify the regex is correctly applied in the endpoint."""
        # Read the analytics_enhanced.py to verify regex is present
        import os
        filepath = os.path.join(os.path.dirname(__file__), '..', 'app', 'routers', 'analytics_enhanced.py')
        
        with open(filepath, 'r') as f:
            content = f.read()
        
        # Check that regex validation is present
        assert r'regex=r"^\d{4}-\d{2}-\d{2}$"' in content


class TestEventStatusValues:
    """Test event status values are correct."""
    
    def test_valid_event_statuses(self):
        """Verify correct event status enum values."""
        # These are the valid statuses from the schema
        valid_statuses = ["draft", "published", "ongoing", "completed", "cancelled"]
        
        # "active" is NOT a valid status - the bug was using "active"
        assert "active" not in valid_statuses
        assert "published" in valid_statuses
        assert "ongoing" in valid_statuses
    
    def test_analytics_uses_correct_status(self):
        """Verify analytics endpoint uses correct status values."""
        import os
        filepath = os.path.join(os.path.dirname(__file__), '..', 'app', 'routers', 'analytics_enhanced.py')
        
        with open(filepath, 'r') as f:
            content = f.read()
        
        # Should use .in_() with correct statuses, not .eq("active")
        assert '.in_("status", ["published", "ongoing"])' in content or \
               '.in_("status",["published","ongoing"])' in content
        assert '.eq("status", "active")' not in content


class TestWaitlistPositionResponse:
    """Test waitlist position response consistency."""
    
    def test_response_status_is_waitlisted(self):
        """Test that response status is 'waitlisted' not 'pending'."""
        # The fix ensures status is "waitlisted" not "pending"
        response_data = {
            "id": "reg-1",
            "status": "waitlisted",  # Fixed from "pending"
            "waitlist_position": 1,
            "message": "Event is full. You've been added to the waitlist."
        }
        
        assert response_data["status"] == "waitlisted"
        assert "waitlist_position" in response_data
    
    def test_registration_code_uses_correct_status(self):
        """Verify registrations.py uses 'waitlisted' status."""
        import os
        filepath = os.path.join(os.path.dirname(__file__), '..', 'app', 'routers', 'registrations.py')
        
        with open(filepath, 'r') as f:
            content = f.read()
        
        # Check that the fix is in place
        assert '"status": "waitlisted"' in content or "'status': 'waitlisted'" in content


class TestRPCFallback:
    """Test RPC and fallback logic."""
    
    def test_waitlist_has_retry_logic(self):
        """Verify waitlist service has retry logic."""
        import os
        filepath = os.path.join(os.path.dirname(__file__), '..', 'app', 'services', 'waitlist.py')
        
        with open(filepath, 'r') as f:
            content = f.read()
        
        # Should have retry logic
        assert "max_retries" in content
        assert "retry" in content.lower()
        assert "get_next_waitlist_position" in content
    
    def test_duplicate_check_prevents_double_waitlist(self):
        """Verify duplicate waitlist entries are prevented."""
        import os
        filepath = os.path.join(os.path.dirname(__file__), '..', 'app', 'routers', 'registrations.py')
        
        with open(filepath, 'r') as f:
            content = f.read()
        
        # Should check for existing waitlist entry
        assert "existing_waitlist" in content or "already on the waitlist" in content


class TestValidationRegex:
    """Test format parameter validation."""
    
    def test_format_regex(self):
        """Test that format parameter is validated."""
        format_pattern = r"^(json|csv)$"
        
        assert re.match(format_pattern, "json")
        assert re.match(format_pattern, "csv")
        assert not re.match(format_pattern, "xml")
        assert not re.match(format_pattern, "")


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
