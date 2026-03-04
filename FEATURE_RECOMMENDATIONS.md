# Feature Recommendations - BCE Event Manager

This document provides detailed specifications for 8 high-value features that would enhance the BCE Event Manager platform.

---

## 1. Real-time Notifications System ⭐⭐⭐

### Overview
A comprehensive notification system to keep users engaged and informed about event updates, reducing no-shows and improving user experience.

### Database Schema
```sql
-- Notifications table
CREATE TABLE notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    type VARCHAR(50) NOT NULL, -- registration, reminder, announcement, match_update
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    data JSONB, -- flexible payload for different notification types
    is_read BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    read_at TIMESTAMP WITH TIME ZONE
);

-- User notification preferences
CREATE TABLE notification_preferences (
    user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email_enabled BOOLEAN DEFAULT true,
    push_enabled BOOLEAN DEFAULT true,
    sms_enabled BOOLEAN DEFAULT false,
    preferences JSONB DEFAULT '{
        "registration": {"email": true, "push": true},
        "reminder": {"email": true, "push": true},
        "announcement": {"email": true, "push": false},
        "match_update": {"email": false, "push": true}
    }'::jsonb
);

-- Push notification subscriptions
CREATE TABLE push_subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    endpoint TEXT NOT NULL,
    p256dh TEXT NOT NULL,
    auth TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### API Endpoints
```python
# GET /api/notifications - Get user notifications
# POST /api/notifications/{id}/read - Mark as read
# POST /api/notifications/read-all - Mark all as read
# DELETE /api/notifications/{id} - Delete notification
# GET /api/notifications/preferences - Get preferences
# PUT /api/notifications/preferences - Update preferences
# POST /api/notifications/subscribe - Subscribe to push notifications
```

### Frontend Components
1. **NotificationBell** - Header component with badge showing unread count
2. **NotificationPanel** - Dropdown panel showing recent notifications
3. **NotificationList** - Full page view of all notifications
4. **NotificationPreferences** - Settings page for notification preferences

### Implementation Steps
1. Create database tables with RLS policies
2. Set up Supabase Realtime for live notifications
3. Implement Web Push API for browser notifications
4. Create notification service in backend
5. Build frontend notification components
6. Add notification triggers at key events (registration, check-in, etc.)

---

## 2. Email Templates & Automation ⭐⭐⭐

### Overview
Automated email system with customizable templates for professional communication with participants.

### Database Schema
```sql
-- Email templates
CREATE TABLE email_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) UNIQUE NOT NULL,
    subject VARCHAR(255) NOT NULL,
    body_html TEXT NOT NULL,
    body_text TEXT NOT NULL,
    variables JSONB, -- ["event_name", "user_name", "registration_id"]
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Email queue for async sending
CREATE TABLE email_queue (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    template_id UUID REFERENCES email_templates(id),
    to_email VARCHAR(255) NOT NULL,
    to_name VARCHAR(255),
    subject VARCHAR(255) NOT NULL,
    body_html TEXT,
    body_text TEXT,
    variables JSONB,
    status VARCHAR(20) DEFAULT 'pending', -- pending, sent, failed
    retry_count INTEGER DEFAULT 0,
    error_message TEXT,
    scheduled_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    sent_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Email logs
CREATE TABLE email_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    queue_id UUID REFERENCES email_queue(id),
    event_type VARCHAR(50), -- send, open, click, bounce
    metadata JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### Default Templates
1. **welcome** - Welcome email after registration
2. **registration_confirmation** - Confirm event registration
3. **event_reminder_24h** - 24-hour reminder before event
4. **event_reminder_1h** - 1-hour reminder before event
5. **payment_confirmation** - Payment received confirmation
6. **certificate_delivery** - Certificate ready for download
7. **password_reset** - Password reset link
8. **waitlist_promotion** - Moved from waitlist to confirmed

### API Endpoints
```python
# GET /api/admin/email-templates - List templates
# POST /api/admin/email-templates - Create template
# PUT /api/admin/email-templates/{id} - Update template
# DELETE /api/admin/email-templates/{id} - Delete template
# POST /api/admin/email-templates/{id}/preview - Preview with variables
# POST /api/admin/email/send-bulk - Send bulk emails
```

### Email Service Provider Options
- **SendGrid** - Good free tier (100 emails/day)
- **AWS SES** - Cost-effective for high volume
- **Resend** - Developer-friendly, good deliverability
- **Mailgun** - Reliable with good analytics

---

## 3. Waitlist System ⭐⭐⭐

### Overview
Automatic waitlist management when events reach capacity, with auto-promotion when spots open up.

### Database Schema Updates
```sql
-- Add waitlist fields to registrations
ALTER TABLE registrations ADD COLUMN waitlist_position INTEGER;
ALTER TABLE registrations ADD COLUMN waitlisted_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE registrations ADD COLUMN promoted_at TIMESTAMP WITH TIME ZONE;

-- Update status enum to include 'waitlisted'
-- Status: pending, waitlisted, confirmed, cancelled

-- Waitlist history log
CREATE TABLE waitlist_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    registration_id UUID NOT NULL REFERENCES registrations(id) ON DELETE CASCADE,
    action VARCHAR(20) NOT NULL, -- added, promoted, cancelled
    old_position INTEGER,
    new_position INTEGER,
    triggered_by UUID REFERENCES auth.users(id), -- null for auto-promotion
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### Logic Implementation

#### Auto-Waitlist on Registration
```python
async def register_for_event(event_id: str, user_id: str):
    event = get_event(event_id)
    current_registrations = count_confirmed_registrations(event_id)
    
    if current_registrations >= event.max_participants:
        # Add to waitlist
        waitlist_count = count_waitlisted_registrations(event_id)
        registration = create_registration(
            event_id=event_id,
            user_id=user_id,
            status='waitlisted',
            waitlist_position=waitlist_count + 1
        )
        send_waitlist_confirmation_email(registration)
    else:
        # Confirm immediately
        registration = create_registration(
            event_id=event_id,
            user_id=user_id,
            status='confirmed'
        )
        send_confirmation_email(registration)
```

#### Auto-Promotion on Cancellation
```python
async def cancel_registration(registration_id: str):
    registration = get_registration(registration_id)
    event_id = registration.event_id
    
    # Cancel the registration
    update_registration_status(registration_id, 'cancelled')
    
    # Check if we can promote from waitlist
    if registration.status == 'confirmed':
        promote_next_from_waitlist(event_id)

async def promote_next_from_waitlist(event_id: str):
    next_in_line = get_first_waitlisted(event_id)
    if next_in_line:
        update_registration_status(next_in_line.id, 'confirmed')
        next_in_line.waitlist_position = None
        next_in_line.promoted_at = now()
        
        # Reorder remaining waitlist
        reorder_waitlist_positions(event_id)
        
        # Send notification
        send_waitlist_promotion_email(next_in_line)
        send_push_notification(next_in_line.user_id, "You've been promoted from waitlist!")
```

### Frontend Changes
1. **EventCard** - Show "Waitlist Available" or "X spots left"
2. **EventDetail** - Show waitlist position if waitlisted
3. **MyRegistrations** - Display waitlist status and position
4. **Organizer Dashboard** - View/manage waitlist for each event

---

## 4. Multi-Currency & Payment Integration ⭐⭐

### Overview
Full payment processing with multi-currency support, refunds, and invoice generation.

### Database Schema
```sql
-- Add currency to events
ALTER TABLE events ADD COLUMN currency VARCHAR(3) DEFAULT 'INR';
ALTER TABLE events ADD COLUMN registration_fee DECIMAL(10, 2) DEFAULT 0;

-- Enhanced payments table
CREATE TABLE payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    registration_id UUID NOT NULL REFERENCES registrations(id) ON DELETE CASCADE,
    amount DECIMAL(10, 2) NOT NULL,
    currency VARCHAR(3) NOT NULL,
    gateway VARCHAR(20) NOT NULL, -- razorpay, stripe
    gateway_payment_id VARCHAR(255),
    gateway_order_id VARCHAR(255),
    status VARCHAR(20) DEFAULT 'pending', -- pending, captured, failed, refunded
    metadata JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    captured_at TIMESTAMP WITH TIME ZONE,
    refunded_at TIMESTAMP WITH TIME ZONE,
    refund_amount DECIMAL(10, 2)
);

-- Invoices
CREATE TABLE invoices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    invoice_number VARCHAR(50) UNIQUE NOT NULL,
    payment_id UUID REFERENCES payments(id),
    user_id UUID NOT NULL REFERENCES auth.users(id),
    event_id UUID NOT NULL REFERENCES events(id),
    amount DECIMAL(10, 2) NOT NULL,
    currency VARCHAR(3) NOT NULL,
    tax_amount DECIMAL(10, 2) DEFAULT 0,
    total_amount DECIMAL(10, 2) NOT NULL,
    status VARCHAR(20) DEFAULT 'draft', -- draft, sent, paid, cancelled
    invoice_pdf_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    sent_at TIMESTAMP WITH TIME ZONE,
    paid_at TIMESTAMP WITH TIME ZONE
);
```

### Payment Flow
1. User registers for paid event
2. Backend creates Razorpay/Stripe order
3. Frontend shows payment modal
4. User completes payment
5. Gateway webhook confirms payment
6. Registration status updated to confirmed
7. Invoice generated and sent

### Refund Flow
1. Organizer initiates refund from dashboard
2. Full or partial refund processed
3. Gateway webhook confirms refund
4. Registration status updated (optional)
5. Refund email sent to user

### API Endpoints
```python
# POST /api/payments/create-order - Create payment order
# POST /api/payments/verify - Verify payment signature
# POST /api/payments/{id}/refund - Process refund (organizer)
# GET /api/payments/{id}/invoice - Download invoice
# POST /api/webhooks/razorpay - Razorpay webhook
# POST /api/webhooks/stripe - Stripe webhook
```

---

## 5. Advanced Analytics ⭐⭐

### Overview
Deeper insights into event performance, user behavior, and revenue trends.

### Analytics Categories

#### A. Cohort Analysis
```sql
-- Track user retention across events
CREATE VIEW cohort_analysis AS
SELECT 
    DATE_TRUNC('month', first_event_date) as cohort_month,
    COUNT(DISTINCT user_id) as cohort_size,
    -- Return rate after 1 month, 3 months, 6 months
    COUNT(DISTINCT CASE WHEN months_since_first = 1 THEN user_id END) * 100.0 / COUNT(DISTINCT user_id) as retention_1m,
    COUNT(DISTINCT CASE WHEN months_since_first = 3 THEN user_id END) * 100.0 / COUNT(DISTINCT user_id) as retention_3m
FROM user_cohorts
GROUP BY DATE_TRUNC('month', first_event_date);
```

#### B. Revenue Forecasting
- Linear regression on registration trends
- Seasonal adjustments
- Confidence intervals

#### C. Conversion Funnel
- Landing page view → Event detail view → Registration start → Payment → Confirmation
- Drop-off analysis at each stage

#### D. Demographics Deep Dive
- Age distribution
- Geographic heatmap
- Registration source (organic, social, referral)

### New API Endpoints
```python
# GET /api/analytics/cohort - Cohort retention data
# GET /api/analytics/forecast - Revenue predictions
# GET /api/analytics/funnel - Conversion funnel
# GET /api/analytics/demographics - Detailed demographics
# GET /api/analytics/export - Export data (CSV, Excel, PDF)
```

### Frontend Components
1. **CohortRetentionChart** - Line chart showing retention over time
2. **RevenueForecastChart** - Line chart with confidence bands
3. **FunnelChart** - Visual funnel showing drop-offs
4. **Heatmap** - Geographic distribution of participants
5. **ExportButton** - Download reports in various formats

---

## 6. Social Features ⭐⭐

### Overview
Social sharing and engagement features to increase organic growth and community building.

### Features

#### A. Social Sharing
```typescript
// Share event with Open Graph meta tags
interface ShareData {
    title: string;
    description: string;
    image: string;
    url: string;
}

// Generate shareable link with referral tracking
// /event/{id}?ref=user_123
```

#### B. Team Invite System
```sql
-- Team invite tokens
CREATE TABLE team_invites (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
    token VARCHAR(255) UNIQUE NOT NULL,
    email VARCHAR(255), -- optional, for email invites
    max_uses INTEGER DEFAULT 1,
    used_count INTEGER DEFAULT 0,
    expires_at TIMESTAMP WITH TIME ZONE,
    created_by UUID NOT NULL REFERENCES auth.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

#### C. Event Reviews & Ratings
```sql
CREATE TABLE event_reviews (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id),
    rating INTEGER CHECK (rating >= 1 AND rating <= 5),
    review TEXT,
    is_verified BOOLEAN DEFAULT false, -- only if user attended
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(event_id, user_id)
);
```

#### D. Photo Gallery
```sql
CREATE TABLE event_photos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    uploaded_by UUID NOT NULL REFERENCES auth.users(id),
    url TEXT NOT NULL,
    caption TEXT,
    is_approved BOOLEAN DEFAULT false, -- moderation
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

---

## 7. Bulk Operations ⭐⭐

### Overview
Time-saving features for organizers to perform actions on multiple records at once.

### Features

#### A. Bulk Import Participants (CSV)
```typescript
interface CSVColumns {
    name: string;
    email: string;
    phone?: string;
    team_name?: string;
    payment_status?: 'paid' | 'unpaid';
    payment_amount?: number;
}

// Upload CSV → Preview → Validate → Import
```

#### B. Bulk Check-in
```typescript
// Rapid QR code scanning mode
// Continuous scan with audio/visual feedback
// Auto-mark as checked in
// Show real-time count: "45 of 100 checked in"
```

#### C. Bulk Email
```typescript
// Select participants by filter
// Compose email with template variables
// Preview before sending
// Track delivery status
```

#### D. Bulk Certificate Generation
```typescript
// Generate certificates for all confirmed participants
// Background job with progress bar
// Zip download of all PDFs
```

### API Endpoints
```python
# POST /api/events/{id}/import-csv - Import participants
# POST /api/events/{id}/bulk-checkin - Bulk check-in endpoint
# POST /api/events/{id}/bulk-email - Send bulk emails
# POST /api/events/{id}/bulk-certificates - Generate certificates
# GET /api/jobs/{id}/status - Check async job status
```

---

## 8. Resource/Inventory Management ⭐⭐

### Overview
Track physical resources, equipment, and venue rooms to prevent conflicts and ensure availability.

### Database Schema
```sql
-- Resources
CREATE TABLE resources (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    type VARCHAR(50) NOT NULL, -- equipment, room, vehicle, other
    description TEXT,
    total_quantity INTEGER NOT NULL DEFAULT 1,
    location VARCHAR(255),
    condition VARCHAR(50) DEFAULT 'good', -- excellent, good, fair, poor
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Resource bookings
CREATE TABLE resource_bookings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    resource_id UUID NOT NULL REFERENCES resources(id),
    event_id UUID NOT NULL REFERENCES events(id),
    quantity INTEGER NOT NULL DEFAULT 1,
    start_time TIMESTAMP WITH TIME ZONE NOT NULL,
    end_time TIMESTAMP WITH TIME ZONE NOT NULL,
    booked_by UUID NOT NULL REFERENCES auth.users(id),
    notes TEXT,
    status VARCHAR(20) DEFAULT 'confirmed', -- confirmed, cancelled
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    -- Prevent double booking
    CONSTRAINT no_overlap EXCLUDE USING gist (
        resource_id WITH =,
        tstzrange(start_time, end_time) WITH &&
    )
);

-- Maintenance logs
CREATE TABLE resource_maintenance (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    resource_id UUID NOT NULL REFERENCES resources(id),
    maintenance_type VARCHAR(50) NOT NULL, -- repair, inspection, cleaning
    description TEXT,
    cost DECIMAL(10, 2),
    performed_by VARCHAR(255),
    performed_at TIMESTAMP WITH TIME ZONE,
    next_maintenance_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### Features
1. **Resource Calendar** - View availability in calendar format
2. **Conflict Detection** - Automatic detection of double-booking
3. **Availability Check** - Check resource availability before event creation
4. **Maintenance Scheduling** - Track maintenance history and upcoming needs
5. **Usage Reports** - Most/least used resources, utilization rates

### Frontend Components
1. **ResourceCalendar** - FullCalendar integration showing bookings
2. **ResourceList** - Manage resources with availability status
3. **BookingForm** - Book resources with conflict warnings
4. **AvailabilityChecker** - Quick check before event scheduling

---

## Implementation Priority Matrix

| Feature | Impact | Effort | Priority |
|---------|--------|--------|----------|
| Notifications System | High | Medium | P1 |
| Email Automation | High | Medium | P1 |
| Waitlist System | High | Low | P1 |
| Payment Integration | High | High | P2 |
| Advanced Analytics | Medium | Medium | P2 |
| Social Features | Medium | Low | P3 |
| Bulk Operations | Medium | Medium | P2 |
| Resource Management | Low | High | P3 |

---

## Next Steps

1. **Pick your top 2-3 features** based on immediate needs
2. **Switch to Architect mode** for detailed technical planning
3. **Create implementation roadmap** with milestones
4. **Switch to Code mode** to start building

Which features would you like to implement first?
