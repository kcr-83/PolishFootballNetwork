-- ================================================
-- Polish Football Network - SQL Data Model
-- ================================================
-- Project: Interactive Map of Polish Football Club Fan Connections
-- Database: PostgreSQL 15+
-- Version: 1.0
-- Date: September 3, 2025
-- 
-- This script creates the complete data model for the Polish Football Network
-- application, supporting all features outlined in the feature requirements.
-- ================================================

-- Enable UUID extension for PostgreSQL
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Create dedicated schema for the application
CREATE SCHEMA IF NOT EXISTS football_network;

-- Set search path to use our schema by default
SET search_path TO football_network, public;

-- ================================================
-- ENUMS AND CUSTOM TYPES
-- ================================================

-- League types for Polish football clubs
CREATE TYPE league_type AS ENUM (
    'Ekstraklasa',
    'Fortuna1Liga', 
    'EuropeanClub'
);

-- Connection types between clubs
CREATE TYPE connection_type AS ENUM (
    'Alliance',
    'Rivalry', 
    'Friendship'
);

-- Connection strength levels
CREATE TYPE connection_strength AS ENUM (
    'Weak',
    'Medium',
    'Strong'
);

-- User roles in the system
CREATE TYPE user_role AS ENUM (
    'Admin',
    'SuperAdmin'
);

-- Activity types for audit logging
CREATE TYPE activity_type AS ENUM (
    'CREATE',
    'UPDATE',
    'DELETE',
    'LOGIN',
    'LOGOUT',
    'UPLOAD',
    'DOWNLOAD'
);

-- File types for uploaded content
CREATE TYPE file_type AS ENUM (
    'LOGO_SVG',
    'IMAGE_PNG',
    'IMAGE_JPG',
    'DOCUMENT_PDF'
);

-- Custom point type for club positions on the graph
CREATE TYPE point_2d AS (
    x DECIMAL(10,6),
    y DECIMAL(10,6)
);

-- ================================================
-- CORE TABLES
-- ================================================

-- Clubs table - stores all football club information
CREATE TABLE clubs (
    -- Primary identification
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Basic club information
    name VARCHAR(100) NOT NULL,
    short_name VARCHAR(10),
    slug VARCHAR(100) UNIQUE NOT NULL, -- URL-friendly version of name
    
    -- Classification and location
    league league_type NOT NULL,
    country VARCHAR(50) NOT NULL DEFAULT 'Poland',
    city VARCHAR(50) NOT NULL,
    region VARCHAR(50), -- Voivodeship for Polish clubs
    
    -- Visual and positioning
    logo_path VARCHAR(500), -- Path to uploaded logo file
    logo_url VARCHAR(500), -- Full URL to logo (for CDN)
    position_x DECIMAL(10,6), -- X coordinate on graph
    position_y DECIMAL(10,6), -- Y coordinate on graph
    
    -- Historical and contact information
    founded INTEGER CHECK (founded > 1800 AND founded <= EXTRACT(YEAR FROM CURRENT_DATE)),
    stadium VARCHAR(100),
    stadium_capacity INTEGER CHECK (stadium_capacity > 0),
    website VARCHAR(255),
    official_colors VARCHAR(100), -- e.g., "Red and White"
    
    -- Additional metadata
    description TEXT,
    nickname VARCHAR(50),
    motto VARCHAR(200),
    
    -- Status and flags
    is_active BOOLEAN NOT NULL DEFAULT true,
    is_verified BOOLEAN NOT NULL DEFAULT false, -- Admin verified data
    is_featured BOOLEAN NOT NULL DEFAULT false, -- Featured on homepage
    
    -- SEO and search
    meta_title VARCHAR(200),
    meta_description VARCHAR(500),
    search_keywords TEXT, -- Space-separated keywords for search
    
    -- Audit fields
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by UUID,
    updated_by UUID,
    version INTEGER NOT NULL DEFAULT 1, -- Optimistic locking
    
    -- Constraints
    CONSTRAINT valid_website CHECK (website IS NULL OR website ~* '^https?://.*'),
    CONSTRAINT valid_position CHECK (
        (position_x IS NULL AND position_y IS NULL) OR 
        (position_x IS NOT NULL AND position_y IS NOT NULL)
    )
);

-- Connections table - stores relationships between clubs
CREATE TABLE connections (
    -- Primary identification
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Club relationship
    from_club_id UUID NOT NULL REFERENCES clubs(id) ON DELETE CASCADE,
    to_club_id UUID NOT NULL REFERENCES clubs(id) ON DELETE CASCADE,
    
    -- Connection properties
    connection_type connection_type NOT NULL,
    strength connection_strength NOT NULL DEFAULT 'Medium',
    
    -- Connection details
    title VARCHAR(100), -- Custom title for the connection
    description TEXT,
    historical_context TEXT, -- Background story of the relationship
    
    -- Timeline
    start_date DATE,
    end_date DATE, -- For historical connections
    
    -- Verification and visibility
    is_active BOOLEAN NOT NULL DEFAULT true,
    is_official BOOLEAN NOT NULL DEFAULT false, -- Officially confirmed by clubs
    is_historical BOOLEAN NOT NULL DEFAULT false, -- Historical vs current
    is_public BOOLEAN NOT NULL DEFAULT true, -- Show on public graph
    
    -- Source and credibility
    source_url VARCHAR(500), -- Source of information
    evidence_urls TEXT[], -- Array of evidence URLs
    reliability_score INTEGER CHECK (reliability_score >= 1 AND reliability_score <= 10),
    
    -- Display properties
    display_order INTEGER DEFAULT 0, -- Order for UI display
    color_override VARCHAR(7), -- Hex color code override
    
    -- Audit fields
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by UUID,
    updated_by UUID,
    version INTEGER NOT NULL DEFAULT 1,
    
    -- Constraints
    CONSTRAINT unique_club_connection UNIQUE (from_club_id, to_club_id),
    CONSTRAINT no_self_connection CHECK (from_club_id != to_club_id),
    CONSTRAINT valid_date_range CHECK (start_date IS NULL OR end_date IS NULL OR start_date <= end_date),
    CONSTRAINT valid_color_override CHECK (color_override IS NULL OR color_override ~* '^#[0-9A-Fa-f]{6}$')
);

-- Users table - system administrators and users
CREATE TABLE users (
    -- Primary identification
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Authentication
    username VARCHAR(50) NOT NULL UNIQUE,
    email VARCHAR(255) UNIQUE,
    password_hash VARCHAR(255) NOT NULL, -- bcrypt hash
    password_salt VARCHAR(255), -- Additional salt if needed
    
    -- Profile information
    first_name VARCHAR(50),
    last_name VARCHAR(50),
    display_name VARCHAR(100),
    
    -- Authorization
    role user_role NOT NULL DEFAULT 'Admin',
    permissions TEXT[], -- Array of specific permissions
    
    -- Security
    is_active BOOLEAN NOT NULL DEFAULT true,
    is_verified BOOLEAN NOT NULL DEFAULT false,
    is_locked BOOLEAN NOT NULL DEFAULT false,
    failed_login_attempts INTEGER NOT NULL DEFAULT 0,
    last_failed_login TIMESTAMP WITH TIME ZONE,
    
    -- Session management
    last_login_at TIMESTAMP WITH TIME ZONE,
    last_activity_at TIMESTAMP WITH TIME ZONE,
    current_session_id VARCHAR(255),
    
    -- Security tokens
    password_reset_token VARCHAR(255),
    password_reset_expires TIMESTAMP WITH TIME ZONE,
    email_verification_token VARCHAR(255),
    email_verification_expires TIMESTAMP WITH TIME ZONE,
    
    -- Preferences
    timezone VARCHAR(50) DEFAULT 'UTC',
    locale VARCHAR(10) DEFAULT 'en',
    theme VARCHAR(20) DEFAULT 'light',
    
    -- Audit fields
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by UUID,
    last_password_change TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- Constraints
    CONSTRAINT valid_email CHECK (email IS NULL OR email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'),
    CONSTRAINT valid_failed_attempts CHECK (failed_login_attempts >= 0 AND failed_login_attempts <= 10)
);

-- ================================================
-- FILE MANAGEMENT TABLES
-- ================================================

-- Files table - manages uploaded files (logos, documents, etc.)
CREATE TABLE files (
    -- Primary identification
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- File information
    original_filename VARCHAR(255) NOT NULL,
    stored_filename VARCHAR(255) NOT NULL UNIQUE,
    file_path VARCHAR(500) NOT NULL,
    file_url VARCHAR(500), -- CDN or public URL
    
    -- File properties
    file_type file_type NOT NULL,
    mime_type VARCHAR(100) NOT NULL,
    file_size_bytes BIGINT NOT NULL CHECK (file_size_bytes > 0),
    file_hash VARCHAR(64), -- SHA-256 hash for duplicate detection
    
    -- Image-specific properties
    image_width INTEGER,
    image_height INTEGER,
    image_format VARCHAR(10), -- png, jpg, svg, etc.
    
    -- Association
    entity_type VARCHAR(50), -- 'club', 'user', 'connection', etc.
    entity_id UUID,
    purpose VARCHAR(50), -- 'logo', 'avatar', 'document', etc.
    
    -- Status
    is_active BOOLEAN NOT NULL DEFAULT true,
    is_processed BOOLEAN NOT NULL DEFAULT false, -- For image processing
    is_public BOOLEAN NOT NULL DEFAULT true,
    
    -- Metadata
    alt_text VARCHAR(255), -- For accessibility
    caption TEXT,
    tags TEXT[], -- Array of tags for search
    
    -- Audit fields
    uploaded_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    uploaded_by UUID REFERENCES users(id),
    processed_at TIMESTAMP WITH TIME ZONE,
    
    -- Constraints
    CONSTRAINT valid_file_size CHECK (file_size_bytes <= 10485760), -- 10MB max
    CONSTRAINT valid_image_dimensions CHECK (
        (image_width IS NULL AND image_height IS NULL) OR 
        (image_width > 0 AND image_height > 0)
    )
);

-- ================================================
-- AUDIT AND LOGGING TABLES
-- ================================================

-- Activity logs - comprehensive audit trail
CREATE TABLE activity_logs (
    -- Primary identification
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Activity information
    activity_type activity_type NOT NULL,
    table_name VARCHAR(50) NOT NULL,
    record_id UUID,
    
    -- User context
    user_id UUID REFERENCES users(id),
    session_id VARCHAR(255),
    ip_address INET,
    user_agent TEXT,
    
    -- Change details
    old_values JSONB, -- Previous state (for updates/deletes)
    new_values JSONB, -- New state (for creates/updates)
    changed_fields TEXT[], -- Array of changed field names
    
    -- Context
    description TEXT,
    reason TEXT, -- Why the change was made
    
    -- Technical details
    request_id VARCHAR(255), -- For request correlation
    duration_ms INTEGER, -- How long the operation took
    
    -- Timestamp
    occurred_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    -- Constraints
    CONSTRAINT valid_duration CHECK (duration_ms IS NULL OR duration_ms >= 0)
);

-- System logs - application events and errors
CREATE TABLE system_logs (
    -- Primary identification
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Log classification
    level VARCHAR(20) NOT NULL, -- DEBUG, INFO, WARN, ERROR, FATAL
    category VARCHAR(50) NOT NULL, -- AUTH, API, DATABASE, FILE, etc.
    component VARCHAR(100), -- Specific component/service
    
    -- Message
    message TEXT NOT NULL,
    exception_type VARCHAR(255),
    exception_message TEXT,
    stack_trace TEXT,
    
    -- Context
    request_id VARCHAR(255),
    correlation_id VARCHAR(255),
    user_id UUID,
    
    -- Additional data
    properties JSONB, -- Structured log properties
    
    -- Timestamp
    timestamp TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    -- Performance
    duration_ms INTEGER,
    memory_usage_mb INTEGER,
    
    -- Constraints
    CONSTRAINT valid_log_level CHECK (level IN ('DEBUG', 'INFO', 'WARN', 'ERROR', 'FATAL'))
);

-- ================================================
-- ANALYTICS AND STATISTICS TABLES
-- ================================================

-- Graph metrics - statistics about the network graph
CREATE TABLE graph_metrics (
    -- Primary identification
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Metric information
    metric_name VARCHAR(100) NOT NULL,
    metric_value DECIMAL(15,6) NOT NULL,
    metric_type VARCHAR(50) NOT NULL, -- count, percentage, ratio, etc.
    
    -- Scope
    scope VARCHAR(50) NOT NULL, -- global, league, country, club
    scope_id UUID, -- Reference to specific entity if applicable
    
    -- Time period
    period_type VARCHAR(20) NOT NULL, -- daily, weekly, monthly, yearly
    period_start TIMESTAMP WITH TIME ZONE NOT NULL,
    period_end TIMESTAMP WITH TIME ZONE NOT NULL,
    
    -- Metadata
    description TEXT,
    calculation_method TEXT,
    
    -- Timestamps
    calculated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    -- Constraints
    CONSTRAINT valid_period CHECK (period_start <= period_end),
    CONSTRAINT unique_metric_period UNIQUE (metric_name, scope, scope_id, period_start)
);

-- User sessions - track user sessions for analytics
CREATE TABLE user_sessions (
    -- Primary identification
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Session details
    session_id VARCHAR(255) NOT NULL UNIQUE,
    user_id UUID REFERENCES users(id),
    
    -- Session data
    ip_address INET,
    user_agent TEXT,
    device_type VARCHAR(50), -- desktop, mobile, tablet
    browser VARCHAR(50),
    os VARCHAR(50),
    
    -- Geographic
    country VARCHAR(50),
    city VARCHAR(100),
    timezone VARCHAR(50),
    
    -- Session lifecycle
    started_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    last_activity_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    ended_at TIMESTAMP WITH TIME ZONE,
    duration_seconds INTEGER,
    
    -- Activity counters
    page_views INTEGER NOT NULL DEFAULT 0,
    api_calls INTEGER NOT NULL DEFAULT 0,
    actions_performed INTEGER NOT NULL DEFAULT 0,
    
    -- Status
    is_active BOOLEAN NOT NULL DEFAULT true,
    
    -- Constraints
    CONSTRAINT valid_duration_seconds CHECK (duration_seconds IS NULL OR duration_seconds >= 0)
);

-- ================================================
-- CONFIGURATION AND SETTINGS TABLES
-- ================================================

-- Application settings - system configuration
CREATE TABLE app_settings (
    -- Primary identification
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Setting identification
    setting_key VARCHAR(100) NOT NULL UNIQUE,
    setting_value TEXT,
    setting_type VARCHAR(20) NOT NULL DEFAULT 'string', -- string, number, boolean, json
    
    -- Metadata
    category VARCHAR(50) NOT NULL,
    description TEXT,
    default_value TEXT,
    
    -- Validation
    validation_regex VARCHAR(500),
    allowed_values TEXT[], -- For enum-like settings
    min_value DECIMAL,
    max_value DECIMAL,
    
    -- Security
    is_sensitive BOOLEAN NOT NULL DEFAULT false, -- Hide value in UI
    is_readonly BOOLEAN NOT NULL DEFAULT false,
    
    -- Audit
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_by UUID REFERENCES users(id),
    
    -- Constraints
    CONSTRAINT valid_setting_type CHECK (setting_type IN ('string', 'number', 'boolean', 'json')),
    CONSTRAINT valid_number_range CHECK (
        setting_type != 'number' OR 
        (min_value IS NULL OR max_value IS NULL OR min_value <= max_value)
    )
);

-- ================================================
-- INDEXES FOR PERFORMANCE
-- ================================================

-- Clubs table indexes
CREATE INDEX idx_clubs_league ON clubs(league);
CREATE INDEX idx_clubs_country ON clubs(country);
CREATE INDEX idx_clubs_city ON clubs(city);
CREATE INDEX idx_clubs_active ON clubs(is_active);
CREATE INDEX idx_clubs_featured ON clubs(is_featured);
CREATE INDEX idx_clubs_name_search ON clubs USING gin(to_tsvector('english', name));
CREATE INDEX idx_clubs_keywords_search ON clubs USING gin(to_tsvector('english', search_keywords));
CREATE INDEX idx_clubs_updated_at ON clubs(updated_at);

-- Connections table indexes
CREATE INDEX idx_connections_from_club ON connections(from_club_id);
CREATE INDEX idx_connections_to_club ON connections(to_club_id);
CREATE INDEX idx_connections_type ON connections(connection_type);
CREATE INDEX idx_connections_strength ON connections(strength);
CREATE INDEX idx_connections_active ON connections(is_active);
CREATE INDEX idx_connections_public ON connections(is_public);
CREATE INDEX idx_connections_from_to ON connections(from_club_id, to_club_id);
CREATE INDEX idx_connections_updated_at ON connections(updated_at);

-- Users table indexes
CREATE INDEX idx_users_username ON users(username);
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_active ON users(is_active);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_last_login ON users(last_login_at);

-- Files table indexes
CREATE INDEX idx_files_entity ON files(entity_type, entity_id);
CREATE INDEX idx_files_type ON files(file_type);
CREATE INDEX idx_files_hash ON files(file_hash);
CREATE INDEX idx_files_uploaded_at ON files(uploaded_at);

-- Activity logs indexes
CREATE INDEX idx_activity_logs_table_record ON activity_logs(table_name, record_id);
CREATE INDEX idx_activity_logs_user ON activity_logs(user_id);
CREATE INDEX idx_activity_logs_occurred_at ON activity_logs(occurred_at);
CREATE INDEX idx_activity_logs_activity_type ON activity_logs(activity_type);

-- System logs indexes
CREATE INDEX idx_system_logs_level ON system_logs(level);
CREATE INDEX idx_system_logs_category ON system_logs(category);
CREATE INDEX idx_system_logs_timestamp ON system_logs(timestamp);
CREATE INDEX idx_system_logs_request_id ON system_logs(request_id);

-- Graph metrics indexes
CREATE INDEX idx_graph_metrics_name ON graph_metrics(metric_name);
CREATE INDEX idx_graph_metrics_scope ON graph_metrics(scope, scope_id);
CREATE INDEX idx_graph_metrics_period ON graph_metrics(period_start, period_end);

-- User sessions indexes
CREATE INDEX idx_user_sessions_user_id ON user_sessions(user_id);
CREATE INDEX idx_user_sessions_started_at ON user_sessions(started_at);
CREATE INDEX idx_user_sessions_active ON user_sessions(is_active);

-- ================================================
-- VIEWS FOR COMMON QUERIES
-- ================================================

-- View: Complete club information with connection counts
CREATE VIEW v_clubs_with_stats AS
SELECT 
    c.*,
    COALESCE(conn_stats.total_connections, 0) as total_connections,
    COALESCE(conn_stats.alliances, 0) as alliance_count,
    COALESCE(conn_stats.rivalries, 0) as rivalry_count,
    COALESCE(conn_stats.friendships, 0) as friendship_count,
    f.file_url as logo_url_full
FROM clubs c
LEFT JOIN (
    SELECT 
        club_id,
        COUNT(*) as total_connections,
        COUNT(CASE WHEN connection_type = 'Alliance' THEN 1 END) as alliances,
        COUNT(CASE WHEN connection_type = 'Rivalry' THEN 1 END) as rivalries,
        COUNT(CASE WHEN connection_type = 'Friendship' THEN 1 END) as friendships
    FROM (
        SELECT from_club_id as club_id, connection_type FROM connections WHERE is_active = true
        UNION ALL
        SELECT to_club_id as club_id, connection_type FROM connections WHERE is_active = true
    ) all_connections
    GROUP BY club_id
) conn_stats ON c.id = conn_stats.club_id
LEFT JOIN files f ON c.id = f.entity_id AND f.entity_type = 'club' AND f.purpose = 'logo' AND f.is_active = true
WHERE c.is_active = true;

-- View: Graph data for visualization
CREATE VIEW v_graph_data AS
SELECT 
    'club' as type,
    c.id,
    c.name,
    c.short_name,
    c.league::text as league,
    c.city,
    c.country,
    c.position_x,
    c.position_y,
    f.file_url as logo_url,
    c.is_featured
FROM clubs c
LEFT JOIN files f ON c.id = f.entity_id AND f.entity_type = 'club' AND f.purpose = 'logo' AND f.is_active = true
WHERE c.is_active = true

UNION ALL

SELECT 
    'connection' as type,
    conn.id,
    conn.title as name,
    null as short_name,
    conn.connection_type::text as league,
    null as city,
    null as country,
    null as position_x,
    null as position_y,
    null as logo_url,
    false as is_featured
FROM connections conn
WHERE conn.is_active = true AND conn.is_public = true;

-- View: Connection details with club information
CREATE VIEW v_connections_detailed AS
SELECT 
    conn.*,
    from_club.name as from_club_name,
    from_club.short_name as from_club_short_name,
    from_club.league as from_club_league,
    from_club.city as from_club_city,
    to_club.name as to_club_name,
    to_club.short_name as to_club_short_name,
    to_club.league as to_club_league,
    to_club.city as to_club_city
FROM connections conn
JOIN clubs from_club ON conn.from_club_id = from_club.id
JOIN clubs to_club ON conn.to_club_id = to_club.id
WHERE conn.is_active = true AND from_club.is_active = true AND to_club.is_active = true;

-- View: Admin dashboard statistics
CREATE VIEW v_admin_dashboard_stats AS
SELECT 
    (SELECT COUNT(*) FROM clubs WHERE is_active = true) as total_clubs,
    (SELECT COUNT(*) FROM clubs WHERE is_active = true AND league = 'Ekstraklasa') as ekstraklasa_clubs,
    (SELECT COUNT(*) FROM clubs WHERE is_active = true AND league = 'Fortuna1Liga') as fortuna_liga_clubs,
    (SELECT COUNT(*) FROM clubs WHERE is_active = true AND league = 'EuropeanClub') as european_clubs,
    (SELECT COUNT(*) FROM connections WHERE is_active = true) as total_connections,
    (SELECT COUNT(*) FROM connections WHERE is_active = true AND connection_type = 'Alliance') as alliances,
    (SELECT COUNT(*) FROM connections WHERE is_active = true AND connection_type = 'Rivalry') as rivalries,
    (SELECT COUNT(*) FROM connections WHERE is_active = true AND connection_type = 'Friendship') as friendships,
    (SELECT COUNT(*) FROM users WHERE is_active = true) as total_users,
    (SELECT COUNT(*) FROM files WHERE is_active = true) as total_files,
    (SELECT COUNT(*) FROM activity_logs WHERE occurred_at >= CURRENT_DATE) as today_activities;

-- ================================================
-- FUNCTIONS AND STORED PROCEDURES
-- ================================================

-- Function: Update the updated_at timestamp automatically
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Function: Calculate graph metrics
CREATE OR REPLACE FUNCTION calculate_graph_centrality()
RETURNS TABLE(club_id UUID, centrality_score DECIMAL) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        c.id as club_id,
        COALESCE(
            (SELECT COUNT(*)::DECIMAL / NULLIF((SELECT COUNT(*) FROM clubs WHERE is_active = true) - 1, 0)
             FROM connections conn 
             WHERE (conn.from_club_id = c.id OR conn.to_club_id = c.id) 
             AND conn.is_active = true), 
            0
        ) as centrality_score
    FROM clubs c
    WHERE c.is_active = true;
END;
$$ LANGUAGE plpgsql;

-- Function: Validate connection (business rules)
CREATE OR REPLACE FUNCTION validate_connection(
    p_from_club_id UUID,
    p_to_club_id UUID,
    p_connection_type connection_type
)
RETURNS BOOLEAN AS $$
DECLARE
    from_club_exists BOOLEAN;
    to_club_exists BOOLEAN;
    reverse_connection_exists BOOLEAN;
BEGIN
    -- Check if both clubs exist and are active
    SELECT EXISTS(SELECT 1 FROM clubs WHERE id = p_from_club_id AND is_active = true) INTO from_club_exists;
    SELECT EXISTS(SELECT 1 FROM clubs WHERE id = p_to_club_id AND is_active = true) INTO to_club_exists;
    
    IF NOT from_club_exists OR NOT to_club_exists THEN
        RETURN FALSE;
    END IF;
    
    -- Check if clubs are different
    IF p_from_club_id = p_to_club_id THEN
        RETURN FALSE;
    END IF;
    
    -- Check if reverse connection already exists
    SELECT EXISTS(
        SELECT 1 FROM connections 
        WHERE from_club_id = p_to_club_id 
        AND to_club_id = p_from_club_id 
        AND is_active = true
    ) INTO reverse_connection_exists;
    
    IF reverse_connection_exists THEN
        RETURN FALSE;
    END IF;
    
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- ================================================
-- TRIGGERS
-- ================================================

-- Trigger: Update updated_at on clubs
CREATE TRIGGER trigger_clubs_updated_at
    BEFORE UPDATE ON clubs
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Trigger: Update updated_at on connections
CREATE TRIGGER trigger_connections_updated_at
    BEFORE UPDATE ON connections
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Trigger: Update updated_at on users
CREATE TRIGGER trigger_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Trigger: Audit log for clubs changes
CREATE OR REPLACE FUNCTION audit_clubs_changes()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        INSERT INTO activity_logs (activity_type, table_name, record_id, new_values, user_id)
        VALUES ('CREATE', 'clubs', NEW.id, row_to_json(NEW), NEW.created_by);
        RETURN NEW;
    ELSIF TG_OP = 'UPDATE' THEN
        INSERT INTO activity_logs (activity_type, table_name, record_id, old_values, new_values, user_id)
        VALUES ('UPDATE', 'clubs', NEW.id, row_to_json(OLD), row_to_json(NEW), NEW.updated_by);
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        INSERT INTO activity_logs (activity_type, table_name, record_id, old_values)
        VALUES ('DELETE', 'clubs', OLD.id, row_to_json(OLD));
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_audit_clubs
    AFTER INSERT OR UPDATE OR DELETE ON clubs
    FOR EACH ROW
    EXECUTE FUNCTION audit_clubs_changes();

-- Trigger: Audit log for connections changes
CREATE OR REPLACE FUNCTION audit_connections_changes()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        INSERT INTO activity_logs (activity_type, table_name, record_id, new_values, user_id)
        VALUES ('CREATE', 'connections', NEW.id, row_to_json(NEW), NEW.created_by);
        RETURN NEW;
    ELSIF TG_OP = 'UPDATE' THEN
        INSERT INTO activity_logs (activity_type, table_name, record_id, old_values, new_values, user_id)
        VALUES ('UPDATE', 'connections', NEW.id, row_to_json(OLD), row_to_json(NEW), NEW.updated_by);
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        INSERT INTO activity_logs (activity_type, table_name, record_id, old_values)
        VALUES ('DELETE', 'connections', OLD.id, row_to_json(OLD));
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_audit_connections
    AFTER INSERT OR UPDATE OR DELETE ON connections
    FOR EACH ROW
    EXECUTE FUNCTION audit_connections_changes();

-- ================================================
-- INITIAL DATA / SEEDS
-- ================================================

-- Insert default admin user (password: admin123)
INSERT INTO users (
    id,
    username,
    email,
    password_hash,
    first_name,
    last_name,
    display_name,
    role,
    is_active,
    is_verified
) VALUES (
    uuid_generate_v4(),
    'admin',
    'admin@polishfootballnetwork.com',
    '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', -- bcrypt hash of 'admin123'
    'System',
    'Administrator',
    'Admin',
    'SuperAdmin',
    true,
    true
);

-- Insert sample application settings
INSERT INTO app_settings (setting_key, setting_value, setting_type, category, description) VALUES
('app.name', 'Polish Football Network', 'string', 'general', 'Application name'),
('app.version', '1.0.0', 'string', 'general', 'Application version'),
('graph.max_nodes', '1000', 'number', 'visualization', 'Maximum number of nodes to display'),
('file.max_size_mb', '10', 'number', 'files', 'Maximum file size in megabytes'),
('auth.session_timeout_minutes', '480', 'number', 'security', 'User session timeout in minutes'),
('auth.max_failed_attempts', '5', 'number', 'security', 'Maximum failed login attempts before lockout'),
('graph.default_layout', 'preset', 'string', 'visualization', 'Default graph layout algorithm'),
('ui.theme', 'light', 'string', 'appearance', 'Default UI theme');

-- ================================================
-- SECURITY AND PERMISSIONS
-- ================================================

-- Create roles for different access levels
-- Note: This would typically be done in a separate security script

-- Grant permissions (example - adjust based on actual deployment)
-- GRANT SELECT ON ALL TABLES IN SCHEMA football_network TO readonly_role;
-- GRANT SELECT, INSERT, UPDATE ON clubs, connections TO editor_role;
-- GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA football_network TO admin_role;

-- ================================================
-- MAINTENANCE PROCEDURES
-- ================================================

-- Procedure: Clean up old logs
CREATE OR REPLACE FUNCTION cleanup_old_logs(days_to_keep INTEGER DEFAULT 90)
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    -- Clean up old activity logs
    DELETE FROM activity_logs 
    WHERE occurred_at < CURRENT_DATE - INTERVAL '1 day' * days_to_keep;
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    
    -- Clean up old system logs
    DELETE FROM system_logs 
    WHERE timestamp < CURRENT_DATE - INTERVAL '1 day' * days_to_keep;
    
    -- Clean up old user sessions
    DELETE FROM user_sessions 
    WHERE started_at < CURRENT_DATE - INTERVAL '1 day' * days_to_keep;
    
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Procedure: Update graph metrics
CREATE OR REPLACE FUNCTION update_graph_metrics()
RETURNS VOID AS $$
BEGIN
    -- Insert daily metrics
    INSERT INTO graph_metrics (metric_name, metric_value, metric_type, scope, period_type, period_start, period_end)
    VALUES 
        ('total_clubs', (SELECT COUNT(*) FROM clubs WHERE is_active = true), 'count', 'global', 'daily', CURRENT_DATE, CURRENT_DATE + INTERVAL '1 day'),
        ('total_connections', (SELECT COUNT(*) FROM connections WHERE is_active = true), 'count', 'global', 'daily', CURRENT_DATE, CURRENT_DATE + INTERVAL '1 day'),
        ('network_density', 
         (SELECT COUNT(*)::DECIMAL / NULLIF(((SELECT COUNT(*) FROM clubs WHERE is_active = true) * ((SELECT COUNT(*) FROM clubs WHERE is_active = true) - 1) / 2), 0) 
          FROM connections WHERE is_active = true), 
         'ratio', 'global', 'daily', CURRENT_DATE, CURRENT_DATE + INTERVAL '1 day')
    ON CONFLICT (metric_name, scope, scope_id, period_start) 
    DO UPDATE SET 
        metric_value = EXCLUDED.metric_value,
        calculated_at = CURRENT_TIMESTAMP;
END;
$$ LANGUAGE plpgsql;

-- ================================================
-- COMMENTS ON TABLES AND COLUMNS
-- ================================================

COMMENT ON SCHEMA football_network IS 'Main schema for the Polish Football Network application';

COMMENT ON TABLE clubs IS 'Football clubs with their details and metadata';
COMMENT ON COLUMN clubs.slug IS 'URL-friendly version of club name for routing';
COMMENT ON COLUMN clubs.position_x IS 'X coordinate for positioning club on the interactive graph';
COMMENT ON COLUMN clubs.position_y IS 'Y coordinate for positioning club on the interactive graph';
COMMENT ON COLUMN clubs.search_keywords IS 'Space-separated keywords for enhanced search functionality';

COMMENT ON TABLE connections IS 'Relationships between football clubs (alliances, rivalries, friendships)';
COMMENT ON COLUMN connections.reliability_score IS 'Score from 1-10 indicating the reliability of this connection information';
COMMENT ON COLUMN connections.evidence_urls IS 'Array of URLs supporting the existence of this connection';

COMMENT ON TABLE users IS 'System users with authentication and authorization information';
COMMENT ON COLUMN users.failed_login_attempts IS 'Counter for failed login attempts, reset on successful login';

COMMENT ON TABLE files IS 'File management for uploaded logos and documents';
COMMENT ON COLUMN files.file_hash IS 'SHA-256 hash for duplicate detection and integrity verification';

COMMENT ON TABLE activity_logs IS 'Comprehensive audit trail for all system activities';
COMMENT ON TABLE system_logs IS 'Application logs for monitoring and debugging';

-- ================================================
-- FINAL NOTES
-- ================================================

/*
This data model supports all the features outlined in the feature requirements:

1. PUBLIC FEATURES:
   - View football club network (clubs table with positions)
   - Search and filter clubs (indexed search fields)
   - View club details (comprehensive club information)
   - Interactive graph visualization (position coordinates, connection data)

2. ADMIN FEATURES:
   - Club management (full CRUD on clubs table)
   - Connection management (full CRUD on connections table)
   - File upload and logo management (files table)
   - User authentication and authorization (users table)
   - Activity tracking and audit logs (activity_logs table)

3. TECHNICAL FEATURES:
   - Security (password hashing, session management)
   - Performance (comprehensive indexing strategy)
   - Scalability (partitioning-ready design)
   - Monitoring (system logs and metrics)
   - Data integrity (constraints and validation functions)

4. FUTURE ENHANCEMENTS:
   - The schema is designed to be extensible
   - Additional entity types can be easily added
   - Performance metrics and analytics are built-in
   - File management supports various media types

The model follows PostgreSQL best practices and includes proper normalization,
indexing, constraints, and audit trails to ensure data integrity and performance.
*/
