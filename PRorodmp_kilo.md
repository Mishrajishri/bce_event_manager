# BCE Event Manager - Comprehensive Implementation Roadmap

**Project:** Unified Sports, Hackathon & College Events Management Platform  
**Timeline:** 12 Weeks (Extendable based on team capacity)  
**Last Updated:** 2026-03-03  
**Status:** Phase 1 & 2 In Progress

---

## Executive Summary

Transform the existing sports-focused BCE Event Manager into a comprehensive college events ecosystem supporting:
- **Sports** (tournaments, matches, live scoring, brackets)
- **Technical** (hackathons, coding competitions, project submissions)
- **Cultural** (fests, performances, auditions, rounds)
- **Academic** (workshops, seminars, paper presentations)

---

## Phase 1: Foundation & Event Type Architecture [IN PROGRESS]
**Duration:** Week 1-2  
**Priority:** P0 - Critical Path  
**Dependencies:** None (Base Layer)

### 1.1 Database Schema Extensions
| ID | Task | Status | Effort | Assignee | Dependencies |
|----|------|--------|--------|----------|--------------|
| 1.1.1 | Extend EventType enum: hackathon, coding_competition, cultural, workshop, paper_presentation | [x] Complete | 2h | Backend | - |
| 1.1.2 | Add category field to events table (sports/technical/cultural/academic/general) | [x] Complete | 1h | Backend | - |
| 1.1.3 | Create event_type_configs table for flexible per-type JSON configuration | [x] Complete | 3h | Backend | 1.1.1 |
| 1.1.4 | Add Row Level Security (RLS) policies for event_type_configs | [ ] Pending | 2h | Backend | 1.1.3 |
| 1.1.5 | Create database migration file: `20240302_phase1_foundation.sql` | [x] Complete | 1h | Backend | All above |
| 1.1.6 | Run migrations on development Supabase instance | [ ] Pending | 30m | DevOps | 1.1.5 |
| 1.1.7 | Verify Phase 1 schema with `verify_phase1.py` script | [x] Complete | 30m | QA | 1.1.6 |

### 1.2 Backend API - Schemas & Models
| ID | Task | Status | Effort | Assignee | Dependencies |
|----|------|--------|--------|----------|--------------|
| 1.2.1 | Update EventType enum in schemas.py with new event types | [x] Complete | 1h | Backend | 1.1.1 |
| 1.2.2 | Add EventTypeConfig Pydantic models (ConfigBase, ConfigCreate, ConfigResponse) | [x] Complete | 2h | Backend | 1.1.3 |
| 1.2.3 | Update EventCreate/EventUpdate schemas with category field | [x] Complete | 1h | Backend | 1.1.2 |
| 1.2.4 | Add validation logic for event_type-specific required fields | [ ] Pending | 3h | Backend | 1.2.1 |
| 1.2.5 | Create utility functions for config serialization/deserialization | [ ] Pending | 2h | Backend | 1.2.2 |
| 1.2.6 | Update __init__.py exports for new models | [x] Complete | 30m | Backend | All above |

### 1.3 Backend API - Router Modifications
| ID | Task | Status | Effort | Assignee | Dependencies |
|----|------|--------|--------|----------|--------------|
| 1.3.1 | Update events.py router to handle category in CRUD operations | [x] Complete | 2h | Backend | 1.2.3 |
| 1.3.2 | Add GET /events/by-category/{category} endpoint | [ ] Pending | 1h | Backend | 1.3.1 |
| 1.3.3 | Add GET /events/by-type/{event_type} endpoint | [ ] Pending | 1h | Backend | 1.3.1 |
| 1.3.4 | Create event_type_configs router with full CRUD | [ ] Pending | 3h | Backend | 1.2.2 |
| 1.3.5 | Integrate event_type_configs router into main.py | [ ] Pending | 30m | Backend | 1.3.4 |
| 1.3.6 | Update filter endpoints to support combined category + type filters | [ ] Pending | 2h | Backend | 1.3.2, 1.3.3 |

### 1.4 Frontend - Type Definitions
| ID | Task | Status | Effort | Assignee | Dependencies |
|----|------|--------|--------|----------|--------------|
| 1.4.1 | Update EventType enum in types/index.ts | [x] Complete | 30m | Frontend | 1.2.1 |
| 1.4.2 | Add EventCategory type definition | [x] Complete | 30m | Frontend | 1.1.2 |
| 1.4.3 | Create EventTypeConfig interface with type-specific configs | [ ] Pending | 1h | Frontend | 1.2.2 |
| 1.4.4 | Update Event interface to include category and config fields | [x] Complete | 1h | Frontend | 1.4.1, 1.4.2 |
| 1.4.5 | Add config type guards for type-safe config access | [ ] Pending | 2h | Frontend | 1.4.3 |

### 1.5 Frontend - Event Creation Form
| ID | Task | Status | Effort | Assignee | Dependencies |
|----|------|--------|--------|----------|--------------|
| 1.5.1 | Add category selector dropdown to CreateEvent.tsx | [x] Complete | 1h | Frontend | 1.4.2 |
| 1.5.2 | Update event type selector with new event types | [x] Complete | 30m | Frontend | 1.4.1 |
| 1.5.3 | Create conditional form sections for each event type | [x] Complete | 4h | Frontend | 1.5.2 |
| 1.5.4 | Build SportsConfigSection component (scoring system, periods, duration) | [x] Complete | 2h | Frontend | 1.5.3 |
| 1.5.5 | Build HackathonConfigSection component (tracks, max_team_size, submission_deadline) | [x] Complete | 2h | Frontend | 1.5.3 |
| 1.5.6 | Build CulturalConfigSection component (rounds, audition_required, performance_duration) | [ ] Pending | 2h | Frontend | 1.5.3 |
| 1.5.7 | Build WorkshopConfigSection component (materials_upload, attendance_required) | [ ] Pending | 2h | Frontend | 1.5.3 |
| 1.5.8 | Update form validation schema with type-specific rules | [ ] Pending | 2h | Frontend | 1.5.4-1.5.7 |
| 1.5.9 | Test CreateEvent form with all event types | [ ] Pending | 2h | QA | 1.5.8 |

### 1.6 Frontend - Event Display Components
| ID | Task | Status | Effort | Assignee | Dependencies |
|----|------|--------|--------|----------|--------------|
| 1.6.1 | Update EventCard to show category badge | [x] Complete | 1h | Frontend | 1.4.2 |
| 1.6.2 | Add event type icon mapping in EventCard | [x] Complete | 1h | Frontend | 1.4.1 |
| 1.6.3 | Display type-specific details in EventCard (duration for sports, tracks for hackathon) | [ ] Pending | 2h | Frontend | 1.6.2 |
| 1.6.4 | Update EventDetail.tsx with category-specific layouts | [ ] Pending | 3h | Frontend | 1.6.3 |
| 1.6.5 | Add category filter chips to Events list page | [ ] Pending | 2h | Frontend | 1.6.1 |
| 1.6.6 | Add event type filter dropdown to Events list | [ ] Pending | 1h | Frontend | 1.6.5 |

### Phase 1 Deliverables
- [x] Extended EventType enum with 7 types
- [x] Category taxonomy (sports/technical/cultural/academic/general)
- [x] event_type_configs table with JSON schema
- [x] Updated backend schemas with validation
- [x] Frontend type definitions
- [x] Conditional CreateEvent form
- [ ] Category/type filtering on Events page
- [ ] RLS policies for configs

---

## Phase 2: Hackathon & Technical Event Features [IN PROGRESS]
**Duration:** Week 3-5  
**Priority:** P0 - Critical Path  
**Dependencies:** Phase 1 Complete

### 2.1 Database Schema - Project Submissions
| ID | Task | Status | Effort | Assignee | Dependencies |
|----|------|--------|--------|----------|--------------|
| 2.1.1 | Create project_submissions table | [x] Complete | 2h | Backend | 1.1.5 |
| 2.1.2 | Add submission_status enum (submitted, under_review, qualified, rejected, winner) | [x] Complete | 1h | Backend | 2.1.1 |
| 2.1.3 | Create RLS policies for project_submissions | [x] Complete | 2h | Backend | 2.1.1 |
| 2.1.4 | Add indexes on event_id and team_id for performance | [x] Complete | 1h | Backend | 2.1.1 |
| 2.1.5 | Create migration: `20240303_phase2_tech_events.sql` | [x] Complete | 1h | Backend | All above |

### 2.2 Database Schema - Judging System
| ID | Task | Status | Effort | Assignee | Dependencies |
|----|------|--------|--------|----------|--------------|
| 2.2.1 | Create judging_rubrics table with criteria and weights | [x] Complete | 2h | Backend | 2.1.1 |
| 2.2.2 | Create submission_scores table for judge scoring | [x] Complete | 2h | Backend | 2.1.1, 2.2.1 |
| 2.2.3 | Add unique constraint: one score per judge per rubric per submission | [x] Complete | 1h | Backend | 2.2.2 |
| 2.2.4 | Create RLS policies for judging tables | [x] Complete | 2h | Backend | 2.2.1, 2.2.2 |
| 2.2.5 | Add trigger for automatic score aggregation | [x] Complete | 3h | Backend | 2.2.2 |

### 2.3 Database Schema - Team Formation
| ID | Task | Status | Effort | Assignee | Dependencies |
|----|------|--------|--------|----------|--------------|
| 2.3.1 | Create team_requests table for "Find a Team" feature | [x] Complete | 2h | Backend | 1.1.5 |
| 2.3.2 | Add request_status enum (pending, accepted, declined, cancelled) | [x] Complete | 1h | Backend | 2.3.1 |
| 2.3.3 | Create RLS policies for team_requests | [x] Complete | 2h | Backend | 2.3.1 |
| 2.3.4 | Add indexes for request lookups | [x] Complete | 1h | Backend | 2.3.1 |

### 2.4 Database Schema - Mentorship
| ID | Task | Status | Effort | Assignee | Dependencies |
|----|------|--------|--------|----------|--------------|
| 2.4.1 | Create mentors table (event_id, user_id, expertise_areas) | [x] Complete | 2h | Backend | 1.1.5 |
| 2.4.2 | Create mentorship_slots table (mentor_id, start_time, duration, is_booked) | [x] Complete | 2h | Backend | 2.4.1 |
| 2.4.3 | Create mentorship_bookings table (slot_id, team_id, notes) | [x] Complete | 2h | Backend | 2.4.2 |
| 2.4.4 | Add RLS policies for mentorship tables | [x] Complete | 2h | Backend | 2.4.1-2.4.3 |

### 2.5 Backend API - Tech Router
| ID | Task | Status | Effort | Assignee | Dependencies |
|----|------|--------|--------|----------|--------------|
| 2.5.1 | Create tech.py router file | [x] Complete | 30m | Backend | - |
| 2.5.2 | Implement POST /tech/submissions endpoint | [x] Complete | 2h | Backend | 2.1.1 |
| 2.5.3 | Implement GET /tech/submissions/{event_id} endpoint | [x] Complete | 1h | Backend | 2.5.2 |
| 2.5.4 | Implement PUT /tech/submissions/{id} endpoint | [x] Complete | 1h | Backend | 2.5.2 |
| 2.5.5 | Implement DELETE /tech/submissions/{id} endpoint | [x] Complete | 1h | Backend | 2.5.2 |
| 2.5.6 | Implement POST /tech/rubrics endpoint for organizers | [x] Complete | 2h | Backend | 2.2.1 |
| 2.5.7 | Implement GET /tech/rubrics/{event_id} endpoint | [x] Complete | 1h | Backend | 2.5.6 |
| 2.5.8 | Implement POST /tech/scores endpoint for judges | [x] Complete | 2h | Backend | 2.2.2 |
| 2.5.9 | Implement GET /tech/leaderboard/{event_id} endpoint | [x] Complete | 2h | Backend | 2.2.2 |
| 2.5.10 | Implement GET /tech/team-board/{event_id} endpoint | [x] Complete | 2h | Backend | 2.3.1 |
| 2.5.11 | Implement POST /tech/team-requests endpoint | [x] Complete | 2h | Backend | 2.3.1 |
| 2.5.12 | Implement GET /tech/mentors/{event_id} endpoint | [x] Complete | 1h | Backend | 2.4.1 |
| 2.5.13 | Implement POST /tech/book-mentor endpoint | [x] Complete | 2h | Backend | 2.4.3 |
| 2.5.14 | Integrate tech router into main.py | [x] Complete | 30m | Backend | 2.5.1 |

### 2.6 Backend API - Schemas
| ID | Task | Status | Effort | Assignee | Dependencies |
|----|------|--------|--------|----------|--------------|
| 2.6.1 | Create ProjectSubmission Pydantic models | [x] Complete | 2h | Backend | 2.1.1 |
| 2.6.2 | Create JudgingRubric Pydantic models | [x] Complete | 1h | Backend | 2.2.1 |
| 2.6.3 | Create SubmissionScore Pydantic models | [x] Complete | 1h | Backend | 2.2.2 |
| 2.6.4 | Create TeamRequest Pydantic models | [x] Complete | 1h | Backend | 2.3.1 |
| 2.6.5 | Create Mentorship Pydantic models | [x] Complete | 1h | Backend | 2.4.1 |
| 2.6.6 | Add GitHub URL validation in submissions | [x] Complete | 1h | Backend | 2.6.1 |
| 2.6.7 | Add score normalization logic | [x] Complete | 2h | Backend | 2.6.3 |

### 2.7 Frontend - Project Submission Portal
| ID | Task | Status | Effort | Assignee | Dependencies |
|----|------|--------|--------|----------|--------------|
| 2.7.1 | Create SubmitProject.tsx page | [x] Complete | 4h | Frontend | 2.6.1 |
| 2.7.2 | Build submission form with GitHub URL validation | [x] Complete | 2h | Frontend | 2.7.1 |
| 2.7.3 | Add demo video URL field with YouTube embed preview | [ ] Pending | 2h | Frontend | 2.7.1 |
| 2.7.4 | Add pitch deck PDF upload via Supabase Storage | [ ] Pending | 3h | Frontend | 2.7.1 |
| 2.7.5 | Add tech stack multi-select with predefined options | [x] Complete | 2h | Frontend | 2.7.1 |
| 2.7.6 | Implement submission deadline validation | [ ] Pending | 1h | Frontend | 2.7.1 |
| 2.7.7 | Add edit submission functionality | [ ] Pending | 2h | Frontend | 2.7.2 |
| 2.7.8 | Show submission status to teams | [ ] Pending | 1h | Frontend | 2.7.1 |

### 2.8 Frontend - Judging Dashboard
| ID | Task | Status | Effort | Assignee | Dependencies |
|----|------|--------|--------|----------|--------------|
| 2.8.1 | Create JudgingDashboard.tsx page | [x] Complete | 4h | Frontend | 2.6.2, 2.6.3 |
| 2.8.2 | Build rubric builder for organizers | [x] Complete | 3h | Frontend | 2.8.1 |
| 2.8.3 | Create judge assignment interface | [ ] Pending | 3h | Frontend | 2.8.1 |
| 2.8.4 | Build scoring interface with criteria sliders/inputs | [ ] Pending | 3h | Frontend | 2.8.1 |
| 2.8.5 | Add comments field per criteria | [ ] Pending | 1h | Frontend | 2.8.4 |
| 2.8.6 | Create real-time leaderboard view | [ ] Pending | 3h | Frontend | 2.5.9 |
| 2.8.7 | Add project gallery for browsing submissions | [ ] Pending | 3h | Frontend | 2.7.1 |
| 2.8.8 | Implement conflict-of-interest checking | [ ] Pending | 2h | Frontend | 2.8.3 |

### 2.9 Frontend - Team Board
| ID | Task | Status | Effort | Assignee | Dependencies |
|----|------|--------|--------|----------|--------------|
| 2.9.1 | Create TeamBoard.tsx page | [x] Complete | 4h | Frontend | 2.6.4 |
| 2.9.2 | Build "Post Request" form with skill tags | [x] Complete | 2h | Frontend | 2.9.1 |
| 2.9.3 | Create team request listing with filters | [x] Complete | 2h | Frontend | 2.9.1 |
| 2.9.4 | Implement request-to-join flow | [ ] Pending | 3h | Frontend | 2.9.3 |
| 2.9.5 | Add team lead approval interface | [ ] Pending | 2h | Frontend | 2.9.4 |
| 2.9.6 | Show team composition on cards | [ ] Pending | 1h | Frontend | 2.9.3 |

### 2.10 Frontend - Mentorship Booking
| ID | Task | Status | Effort | Assignee | Dependencies |
|----|------|--------|--------|----------|--------------|
| 2.10.1 | Create MentorshipBooking.tsx page | [x] Complete | 4h | Frontend | 2.6.5 |
| 2.10.2 | Build mentor directory with expertise filters | [x] Complete | 2h | Frontend | 2.10.1 |
| 2.10.3 | Create calendar view for available slots | [x] Complete | 3h | Frontend | 2.10.2 |
| 2.10.4 | Implement booking confirmation flow | [x] Complete | 2h | Frontend | 2.10.3 |
| 2.10.5 | Add Google Meet link integration | [x] Complete | 2h | Frontend | 2.10.4 |
| 2.10.6 | Build mentor dashboard for managing slots | [x] Complete | 3h | Frontend | 2.10.1 |

### 2.11 Frontend - Hackathon Timer
| ID | Task | Status | Effort | Assignee | Dependencies |
|----|------|--------|--------|----------|--------------|
| 2.11.1 | Create HackathonTimer component | [x] Complete | 3h | Frontend | - |
| 2.11.2 | Implement countdown timer with days/hours/minutes/seconds | [x] Complete | 1h | Frontend | 2.11.1 |
| 2.11.3 | Add checkpoint reminders (24h, 12h, 6h, 1h remaining) | [x] Complete | 2h | Frontend | 2.11.2 |
| 2.11.4 | Integrate timer into EventDetail for hackathons | [x] Complete | 1h | Frontend | 2.11.3 |
| 2.11.5 | Add browser notification for checkpoints | [ ] Pending | 2h | Frontend | 2.11.3 |

### Phase 2 Deliverables
- [x] project_submissions table with full schema
- [x] judging_rubrics and submission_scores tables
- [x] team_requests table (Find a Team)
- [x] Mentorship booking system
- [x] Tech router with submissions and rubrics endpoints
- [x] SubmitProject.tsx page
- [x] JudgingDashboard.tsx page
- [x] TeamBoard.tsx page
- [x] MentorshipBooking.tsx page
- [x] Hackathon countdown timer
- [ ] Project gallery

---

## Phase 3: Sports Enhancement & Real-Time Features
**Duration:** Week 6  
**Priority:** P1 - High  
**Dependencies:** Phase 1 Complete

### 3.1 WebSocket Infrastructure
| ID | Task | Status | Effort | Assignee | Dependencies |
|----|------|--------|--------|----------|--------------|
| 3.1.1 | Set up Socket.io server in FastAPI | [ ] Pending | 3h | Backend | - |
| 3.1.2 | Create WebSocket connection manager | [ ] Pending | 2h | Backend | 3.1.1 |
| 3.1.3 | Implement room-based channels per match | [ ] Pending | 2h | Backend | 3.1.2 |
| 3.1.4 | Add authentication middleware for WebSocket | [ ] Pending | 2h | Backend | 3.1.2 |
| 3.1.5 | Create socket events: score_update, timer_update, commentary | [ ] Pending | 2h | Backend | 3.1.3 |

### 3.2 Real-Time Scoring Backend
| ID | Task | Status | Effort | Assignee | Dependencies |
|----|------|--------|--------|----------|--------------|
| 3.2.1 | Update matches.py to emit WebSocket events on score changes | [ ] Pending | 2h | Backend | 3.1.5 |
| 3.2.2 | Implement match timer with start/pause/resume | [ ] Pending | 3h | Backend | 3.1.5 |
| 3.2.3 | Create commentary log table for match events | [ ] Pending | 2h | Backend | 3.1.5 |
| 3.2.4 | Add commentary broadcast via WebSocket | [ ] Pending | 1h | Backend | 3.2.3 |
| 3.2.5 | Implement score history/audit trail | [ ] Pending | 2h | Backend | 3.2.1 |

### 3.3 Tournament Brackets
| ID | Task | Status | Effort | Assignee | Dependencies |
|----|------|--------|--------|----------|--------------|
| 3.3.1 | Extend BracketType enum: single_elimination, double_elimination, round_robin | [ ] Pending | 1h | Backend | 1.2.1 |
| 3.3.2 | Create bracket_generation.py utility | [ ] Pending | 4h | Backend | 3.3.1 |
| 3.3.3 | Implement single elimination bracket generator | [ ] Pending | 3h | Backend | 3.3.2 |
| 3.3.4 | Implement double elimination bracket generator | [ ] Pending | 4h | Backend | 3.3.2 |
| 3.3.5 | Implement round-robin fixture generator | [ ] Pending | 3h | Backend | 3.3.2 |
| 3.3.6 | Create bracket visualization data endpoint | [ ] Pending | 2h | Backend | 3.3.3-3.3.5 |
| 3.3.7 | Add automatic advancement logic | [ ] Pending | 3h | Backend | 3.3.2 |

### 3.4 Player Statistics
| ID | Task | Status | Effort | Assignee | Dependencies |
|----|------|--------|--------|----------|--------------|
| 3.4.1 | Create player_statistics table | [ ] Pending | 2h | Backend | - |
| 3.4.2 | Add statistics aggregation triggers | [ ] Pending | 3h | Backend | 3.4.1 |
| 3.4.3 | Create statistics endpoints | [ ] Pending | 2h | Backend | 3.4.1 |
| 3.4.4 | Build team statistics aggregation | [ ] Pending | 2h | Backend | 3.4.1 |

### 3.5 Frontend - Live Scoring UI
| ID | Task | Status | Effort | Assignee | Dependencies |
|----|------|--------|--------|----------|--------------|
| 3.5.1 | Set up Socket.io client in React | [ ] Pending | 2h | Frontend | 3.1.1 |
| 3.5.2 | Create LiveScoreboard component | [ ] Pending | 4h | Frontend | 3.5.1 |
| 3.5.3 | Build scorekeeper interface with increment/decrement buttons | [ ] Pending | 3h | Frontend | 3.5.2 |
| 3.5.4 | Add match timer controls (start/pause/resume) | [ ] Pending | 2h | Frontend | 3.5.2 |
| 3.5.5 | Create commentary feed component | [ ] Pending | 2h | Frontend | 3.5.1 |
| 3.5.6 | Build spectator view (read-only) | [ ] Pending | 2h | Frontend | 3.5.2 |
| 3.5.7 | Add sound effects for score changes | [ ] Pending | 1h | Frontend | 3.5.2 |

### 3.6 Frontend - Tournament Brackets
| ID | Task | Status | Effort | Assignee | Dependencies |
|----|------|--------|--------|----------|--------------|
| 3.6.1 | Create BracketVisualization component | [ ] Pending | 4h | Frontend | 3.3.6 |
| 3.6.2 | Build single elimination bracket SVG/Canvas renderer | [ ] Pending | 4h | Frontend | 3.6.1 |
| 3.6.3 | Build double elimination bracket renderer | [ ] Pending | 4h | Frontend | 3.6.1 |
| 3.6.4 | Build round-robin standings table | [ ] Pending | 2h | Frontend | 3.6.1 |
| 3.6.5 | Add match result entry on bracket nodes | [ ] Pending | 2h | Frontend | 3.6.2-3.6.4 |
| 3.6.6 | Implement bracket zoom/pan for large tournaments | [ ] Pending | 3h | Frontend | 3.6.2 |

### 3.7 Frontend - Statistics Dashboard
| ID | Task | Status | Effort | Assignee | Dependencies |
|----|------|--------|--------|----------|--------------|
| 3.7.1 | Create PlayerStats component | [ ] Pending | 3h | Frontend | 3.4.3 |
| 3.7.2 | Build individual player statistics view | [ ] Pending | 2h | Frontend | 3.7.1 |
| 3.7.3 | Create TeamStats component | [ ] Pending | 3h | Frontend | 3.4.4 |
| 3.7.4 | Add charts for performance trends | [ ] Pending | 2h | Frontend | 3.7.3 |
| 3.7.5 | Build tournament MVP calculation | [ ] Pending | 2h | Frontend | 3.7.1 |

### Phase 3 Deliverables
- [ ] WebSocket infrastructure for real-time updates
- [ ] Live scoring with timer and commentary
- [ ] Tournament bracket generation (single/double/round-robin)
- [ ] Player and team statistics tracking
- [ ] Bracket visualization components
- [ ] Scorekeeper and spectator interfaces

---

## Phase 4: Cultural & Academic Events
**Duration:** Week 7  
**Priority:** P1 - High  
**Dependencies:** Phase 1 Complete

### 4.1 Database - Performance Management
| ID | Task | Status | Effort | Assignee | Dependencies |
|----|------|--------|--------|----------|--------------|
| 4.1.1 | Create performance_slots table | [ ] Pending | 2h | Backend | 1.1.5 |
| 4.1.2 | Add round_number and slot_number fields | [ ] Pending | 1h | Backend | 4.1.1 |
| 4.1.3 | Create backstage_queue table | [ ] Pending | 2h | Backend | 4.1.1 |
| 4.1.4 | Add RLS policies for performance tables | [ ] Pending | 2h | Backend | 4.1.1-4.1.3 |

### 4.2 Database - Paper Submissions
| ID | Task | Status | Effort | Assignee | Dependencies |
|----|------|--------|--------|----------|--------------|
| 4.2.1 | Create paper_submissions table (abstract, full_paper, status) | [ ] Pending | 2h | Backend | 1.1.5 |
| 4.2.2 | Add review_status enum (pending, under_review, accepted, rejected, revision_needed) | [ ] Pending | 1h | Backend | 4.2.1 |
| 4.2.3 | Create paper_reviews table for faculty feedback | [ ] Pending | 2h | Backend | 4.2.1 |
| 4.2.4 | Add RLS policies for paper tables | [ ] Pending | 2h | Backend | 4.2.1-4.2.3 |

### 4.3 Database - Workshop Materials
| ID | Task | Status | Effort | Assignee | Dependencies |
|----|------|--------|--------|----------|--------------|
| 4.3.1 | Create workshop_materials table | [ ] Pending | 2h | Backend | 1.1.5 |
| 4.3.2 | Add material_type enum (pdf, video, code, link) | [ ] Pending | 1h | Backend | 4.3.1 |
| 4.3.3 | Create attendee_material_access table for tracking | [ ] Pending | 2h | Backend | 4.3.1 |
| 4.3.4 | Add RLS policies for materials | [ ] Pending | 2h | Backend | 4.3.1 |

### 4.4 Backend - Cultural & Academic Routers
| ID | Task | Status | Effort | Assignee | Dependencies |
|----|------|--------|--------|----------|--------------|
| 4.4.1 | Create cultural.py router | [ ] Pending | 1h | Backend | - |
| 4.4.2 | Implement performance slot CRUD endpoints | [ ] Pending | 3h | Backend | 4.1.1 |
| 4.4.3 | Implement backstage queue endpoints | [ ] Pending | 2h | Backend | 4.1.3 |
| 4.4.4 | Create academic.py router | [ ] Pending | 1h | Backend | - |
| 4.4.5 | Implement paper submission endpoints | [ ] Pending | 3h | Backend | 4.2.1 |
| 4.4.6 | Implement paper review workflow endpoints | [ ] Pending | 3h | Backend | 4.2.3 |
| 4.4.7 | Implement workshop materials endpoints | [ ] Pending | 3h | Backend | 4.3.1 |
| 4.4.8 | Integrate routers into main.py | [ ] Pending | 30m | Backend | 4.4.1, 4.4.4 |

### 4.5 Frontend - Cultural Events
| ID | Task | Status | Effort | Assignee | Dependencies |
|----|------|--------|--------|----------|--------------|
| 4.5.1 | Create PerformanceSchedule.tsx page | [ ] Pending | 4h | Frontend | 4.4.2 |
| 4.5.2 | Build round-based event flow UI | [ ] Pending | 3h | Frontend | 4.5.1 |
| 4.5.3 | Create slot allocation interface for organizers | [ ] Pending | 3h | Frontend | 4.5.2 |
| 4.5.4 | Build backstage queue display | [ ] Pending | 3h | Frontend | 4.4.3 |
| 4.5.5 | Add "Now Performing" and "Up Next" indicators | [ ] Pending | 2h | Frontend | 4.5.4 |
| 4.5.6 | Create voting interface for audience/judges | [ ] Pending | 3h | Frontend | 4.5.1 |

### 4.6 Frontend - Academic Events
| ID | Task | Status | Effort | Assignee | Dependencies |
|----|------|--------|--------|----------|--------------|
| 4.6.1 | Create PaperSubmission.tsx page | [ ] Pending | 4h | Frontend | 4.4.5 |
| 4.6.2 | Build abstract upload form | [ ] Pending | 2h | Frontend | 4.6.1 |
| 4.6.3 | Add full paper upload functionality | [ ] Pending | 2h | Frontend | 4.6.1 |
| 4.6.4 | Create faculty review dashboard | [ ] Pending | 4h | Frontend | 4.4.6 |
| 4.6.5 | Build accept/revise/reject workflow | [ ] Pending | 3h | Frontend | 4.6.4 |
| 4.6.6 | Create WorkshopMaterials.tsx page | [ ] Pending | 3h | Frontend | 4.4.7 |
| 4.6.7 | Build material download interface | [ ] Pending | 2h | Frontend | 4.6.6 |

### Phase 4 Deliverables
- [ ] Performance slot management for cultural events
- [ ] Backstage queue system
- [ ] Paper submission and review workflow
- [ ] Workshop materials upload/download
- [ ] Round-based progression for cultural events
- [ ] Faculty review dashboard

---

## Phase 5: Cross-Platform Features
**Duration:** Week 8  
**Priority:** P2 - Medium  
**Dependencies:** Phases 1-4 Complete

### 5.1 Unified Analytics
| ID | Task | Status | Effort | Assignee | Dependencies |
|----|------|--------|--------|----------|--------------|
| 5.1.1 | Create unified_analytics.py router | [ ] Pending | 2h | Backend | - |
| 5.1.2 | Implement cross-event participation metrics | [ ] Pending | 3h | Backend | 5.1.1 |
| 5.1.3 | Add category-wise revenue tracking | [ ] Pending | 2h | Backend | 5.1.1 |
| 5.1.4 | Create participant engagement analytics | [ ] Pending | 3h | Backend | 5.1.1 |
| 5.1.5 | Update AdminDashboard with category filters | [ ] Pending | 3h | Frontend | 5.1.1-5.1.4 |

### 5.2 Gamification System
| ID | Task | Status | Effort | Assignee | Dependencies |
|----|------|--------|--------|----------|--------------|
| 5.2.1 | Create user_points table | [ ] Pending | 2h | Backend | - |
| 5.2.2 | Create badges table with badge definitions | [ ] Pending | 2h | Backend | 5.2.1 |
| 5.2.3 | Create user_badges junction table | [ ] Pending | 1h | Backend | 5.2.2 |
| 5.2.4 | Implement point calculation triggers | [ ] Pending | 3h | Backend | 5.2.1 |
| 5.2.5 | Create badge award logic | [ ] Pending | 3h | Backend | 5.2.3 |
| 5.2.6 | Build Leaderboard.tsx page | [ ] Pending | 4h | Frontend | 5.2.1 |
| 5.2.7 | Create user profile badges display | [ ] Pending | 2h | Frontend | 5.2.3 |
| 5.2.8 | Add point history view | [ ] Pending | 2h | Frontend | 5.2.1 |

### 5.3 Social Feed
| ID | Task | Status | Effort | Assignee | Dependencies |
|----|------|--------|--------|----------|--------------|
| 5.3.1 | Create activity_logs table | [ ] Pending | 2h | Backend | - |
| 5.3.2 | Implement activity creation triggers | [ ] Pending | 3h | Backend | 5.3.1 |
| 5.3.3 | Create activity feed endpoint | [ ] Pending | 2h | Backend | 5.3.2 |
| 5.3.4 | Build SocialFeed.tsx component | [ ] Pending | 4h | Frontend | 5.3.3 |
| 5.3.5 | Add event type icons to feed items | [ ] Pending | 1h | Frontend | 5.3.4 |
| 5.3.6 | Implement infinite scroll for feed | [ ] Pending | 2h | Frontend | 5.3.4 |

### 5.4 Unified Calendar
| ID | Task | Status | Effort | Assignee | Dependencies |
|----|------|--------|--------|----------|--------------|
| 5.4.1 | Extend EventCalendar to support all event types | [ ] Pending | 3h | Frontend | - |
| 5.4.2 | Add event type color coding | [ ] Pending | 1h | Frontend | 5.4.1 |
| 5.4.3 | Create category filter for calendar | [ ] Pending | 2h | Frontend | 5.4.1 |
| 5.4.4 | Add event detail modal on calendar click | [ ] Pending | 2h | Frontend | 5.4.1 |
| 5.4.5 | Implement calendar export (ICS format) | [ ] Pending | 3h | Frontend | 5.4.1 |

### Phase 5 Deliverables
- [ ] Cross-event analytics dashboard
- [ ] Gamification with points and badges
- [ ] Social activity feed
- [ ] Unified calendar with all event types
- [ ] Participant leaderboard

---

## Phase 6: Polish & Production Readiness
**Duration:** Week 9-10  
**Priority:** P1 - High  
**Dependencies:** Phases 1-5 Complete

### 6.1 Error Handling & UX
| ID | Task | Status | Effort | Assignee | Dependencies |
|----|------|--------|--------|----------|--------------|
| 6.1.1 | Add global error boundary improvements | [ ] Pending | 2h | Frontend | - |
| 6.1.2 | Implement consistent loading states across all pages | [ ] Pending | 4h | Frontend | - |
| 6.1.3 | Add skeleton screens for data fetching | [ ] Pending | 3h | Frontend | 6.1.2 |
| 6.1.4 | Create toast notification system | [ ] Pending | 2h | Frontend | - |
| 6.1.5 | Add form validation error messages | [ ] Pending | 3h | Frontend | - |
| 6.1.6 | Implement 404 and error pages | [ ] Pending | 2h | Frontend | - |

### 6.2 Email Notifications
| ID | Task | Status | Effort | Assignee | Dependencies |
|----|------|--------|--------|----------|--------------|
| 6.2.1 | Set up SendGrid/Resend integration | [ ] Pending | 2h | Backend | - |
| 6.2.2 | Create email templates for registration confirmation | [ ] Pending | 2h | Backend | 6.2.1 |
| 6.2.3 | Create email templates for event reminders | [ ] Pending | 2h | Backend | 6.2.1 |
| 6.2.4 | Create email templates for hackathon submissions | [ ] Pending | 2h | Backend | 6.2.1 |
| 6.2.5 | Create email templates for judging results | [ ] Pending | 2h | Backend | 6.2.1 |
| 6.2.6 | Implement email queue system | [ ] Pending | 3h | Backend | 6.2.1 |
| 6.2.7 | Add email preferences to user settings | [ ] Pending | 2h | Frontend | 6.2.1 |

### 6.3 Export Functionality
| ID | Task | Status | Effort | Assignee | Dependencies |
|----|------|--------|--------|----------|--------------|
| 6.3.1 | Create CSV export utility | [ ] Pending | 2h | Backend | - |
| 6.3.2 | Add attendance export endpoint | [ ] Pending | 2h | Backend | 6.3.1 |
| 6.3.3 | Add scores export endpoint | [ ] Pending | 2h | Backend | 6.3.1 |
| 6.3.4 | Add submissions export endpoint | [ ] Pending | 2h | Backend | 6.3.1 |
| 6.3.5 | Create PDF certificate generation | [ ] Pending | 4h | Backend | - |
| 6.3.6 | Add export buttons to admin dashboard | [ ] Pending | 2h | Frontend | 6.3.2-6.3.4 |

### 6.4 Mobile Responsiveness
| ID | Task | Status | Effort | Assignee | Dependencies |
|----|------|--------|--------|----------|--------------|
| 6.4.1 | Audit all pages for mobile compatibility | [ ] Pending | 3h | Frontend | - |
| 6.4.2 | Fix layout issues on small screens | [ ] Pending | 6h | Frontend | 6.4.1 |
| 6.4.3 | Optimize touch interactions | [ ] Pending | 3h | Frontend | 6.4.2 |
| 6.4.4 | Test on iOS Safari and Android Chrome | [ ] Pending | 3h | QA | 6.4.3 |

### 6.5 Documentation
| ID | Task | Status | Effort | Assignee | Dependencies |
|----|------|--------|--------|----------|--------------|
| 6.5.1 | Write API documentation with examples | [ ] Pending | 6h | Backend | - |
| 6.5.2 | Create user manual for participants | [ ] Pending | 4h | Docs | - |
| 6.5.3 | Create admin guide for organizers | [ ] Pending | 4h | Docs | - |
| 6.5.4 | Document deployment procedures | [ ] Pending | 2h | DevOps | - |
| 6.5.5 | Update README with new features | [ ] Pending | 2h | Docs | - |

### Phase 6 Deliverables
- [ ] Consistent error handling and loading states
- [ ] Email notification system
- [ ] CSV/PDF export functionality
- [ ] Mobile-responsive design
- [ ] Complete documentation

---

## Phase 7: Testing & Deployment
**Duration:** Week 11-12  
**Priority:** P0 - Critical Path  
**Dependencies:** All Previous Phases

### 7.1 Testing
| ID | Task | Status | Effort | Assignee | Dependencies |
|----|------|--------|--------|----------|--------------|
| 7.1.1 | Write unit tests for backend schemas | [ ] Pending | 6h | Backend | - |
| 7.1.2 | Write API integration tests | [ ] Pending | 8h | Backend | 7.1.1 |
| 7.1.3 | Write frontend component tests | [ ] Pending | 6h | Frontend | - |
| 7.1.4 | Perform end-to-end testing | [ ] Pending | 8h | QA | 7.1.2, 7.1.3 |
| 7.1.5 | Load testing with 1000+ concurrent users | [ ] Pending | 4h | DevOps | 7.1.4 |
| 7.1.6 | Security audit and penetration testing | [ ] Pending | 6h | Security | 7.1.4 |
| 7.1.7 | User acceptance testing with real organizers | [ ] Pending | 8h | QA | 7.1.4 |

### 7.2 Production Deployment
| ID | Task | Status | Effort | Assignee | Dependencies |
|----|------|--------|--------|----------|--------------|
| 7.2.1 | Set up production Supabase project | [ ] Pending | 1h | DevOps | - |
| 7.2.2 | Run production database migrations | [ ] Pending | 2h | DevOps | 7.2.1 |
| 7.2.3 | Deploy backend to Render/Railway | [ ] Pending | 2h | DevOps | 7.2.2 |
| 7.2.4 | Deploy frontend to Vercel | [ ] Pending | 1h | DevOps | 7.2.3 |
| 7.2.5 | Configure production environment variables | [ ] Pending | 1h | DevOps | 7.2.4 |
| 7.2.6 | Set up monitoring (Sentry, LogRocket) | [ ] Pending | 2h | DevOps | 7.2.4 |
| 7.2.7 | Configure automated backups | [ ] Pending | 1h | DevOps | 7.2.1 |

### 7.3 Post-Deployment
| ID | Task | Status | Effort | Assignee | Dependencies |
|----|------|--------|--------|----------|--------------|
| 7.3.1 | Create demo video walkthrough | [ ] Pending | 6h | Design | - |
| 7.3.2 | Write project showcase documentation | [ ] Pending | 4h | Docs | - |
| 7.3.3 | Prepare portfolio presentation | [ ] Pending | 4h | Design | 7.3.1 |
| 7.3.4 | Collect user feedback | [ ] Pending | Ongoing | PM | 7.2.4 |
| 7.3.5 | Create bug fix backlog from feedback | [ ] Pending | Ongoing | PM | 7.3.4 |

### Phase 7 Deliverables
- [ ] Comprehensive test coverage
- [ ] Production deployment
- [ ] Monitoring and logging
- [ ] Demo video and portfolio materials

---

## Technical Stack Reference

| Layer | Technology | Purpose |
|-------|------------|---------|
| Backend | FastAPI (Python) | REST API, WebSocket |
| Database | Supabase (PostgreSQL) | Data persistence, Auth |
| Frontend | React 18 + TypeScript | UI components |
| Build Tool | Vite | Development & bundling |
| UI Library | Material UI (MUI) | Component library |
| State Management | Zustand + React Query | Global & server state |
| Charts | Recharts | Data visualization |
| Real-time | Socket.io | Live scoring, notifications |
| File Storage | Supabase Storage | Documents, images |
| Email | SendGrid / Resend | Notifications |
| Deployment | Vercel (FE) + Render (BE) | Hosting |

---

## Risk Mitigation

| Risk | Impact | Mitigation |
|------|--------|------------|
| WebSocket complexity | High | Start with polling fallback, upgrade to WS |
| File upload limits | Medium | Use chunked uploads, compression |
| Database performance | Medium | Add indexes, implement caching |
| Scope creep | High | Strict phase gates, MVP first |
| Third-party API failures | Low | Implement fallbacks, retries |

---

## Definition of Done

Each task is considered complete when:
- [ ] Code is written and follows project conventions
- [ ] Unit tests pass (where applicable)
- [ ] Feature is tested manually
- [ ] No console errors or warnings
- [ ] Responsive on mobile and desktop
- [ ] Documentation updated (if needed)
- [ ] Code reviewed and merged

---

## Current Status Summary

| Phase | Status | Completion |
|-------|--------|------------|
| Phase 1: Foundation | In Progress | ~70% |
| Phase 2: Tech Events | In Progress | ~50% |
| Phase 3: Sports Enhancement | Not Started | 0% |
| Phase 4: Cultural & Academic | Not Started | 0% |
| Phase 5: Cross-Platform | Not Started | 0% |
| Phase 6: Polish | Not Started | 0% |
| Phase 7: Testing & Deploy | Not Started | 0% |

**Overall Project Completion: ~25%**

---

*Last updated: 2026-03-03*  
*Next review: Weekly on Mondays*