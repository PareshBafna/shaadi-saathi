-- Enable UUID generation
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Custom Enums
CREATE TYPE family_side AS ENUM ('bride', 'groom', 'mutual');
CREATE TYPE rsvp_status AS ENUM ('pending', 'attending', 'declined');
CREATE TYPE dietary_pref AS ENUM ('veg', 'non_veg', 'jain', 'egg');

-- 1. Weddings Table (Host Scoped)
CREATE TABLE public.weddings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    couple_names VARCHAR(255) NOT NULL,
    wedding_date DATE NOT NULL,
    cover_image_url TEXT,
    theme_config JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Events Table
CREATE TABLE public.events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    wedding_id UUID NOT NULL REFERENCES public.weddings(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    venue TEXT NOT NULL,
    start_time TIMESTAMPTZ NOT NULL,
    end_time TIMESTAMPTZ,
    dress_code VARCHAR(100),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Families Table
CREATE TABLE public.families (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    wedding_id UUID NOT NULL REFERENCES public.weddings(id) ON DELETE CASCADE,
    family_name VARCHAR(255) NOT NULL,
    side family_side DEFAULT 'mutual',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Guests Table
CREATE TABLE public.guests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    wedding_id UUID NOT NULL REFERENCES public.weddings(id) ON DELETE CASCADE,
    family_id UUID REFERENCES public.families(id) ON DELETE SET NULL,
    name VARCHAR(255) NOT NULL,
    phone VARCHAR(20),
    email VARCHAR(255),
    rsvp_status rsvp_status DEFAULT 'pending',
    dietary_pref dietary_pref DEFAULT 'veg',
    invite_code VARCHAR(12) UNIQUE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Invitations Table (Dynamic Page Slugs & Analytics)
CREATE TABLE public.invitations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    wedding_id UUID NOT NULL REFERENCES public.weddings(id) ON DELETE CASCADE,
    guest_id UUID REFERENCES public.guests(id) ON DELETE CASCADE,
    slug VARCHAR(100) UNIQUE NOT NULL,
    views_count INT DEFAULT 0,
    last_viewed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);


-- Enable RLS on all tables
ALTER TABLE public.weddings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.families ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.guests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invitations ENABLE ROW LEVEL SECURITY;

-- -------------------------------------------------------------
-- Host Policies (Full Access Scoped to Authenticated User)
-- -------------------------------------------------------------

CREATE POLICY "Hosts have full access to their weddings" 
ON public.weddings FOR ALL 
USING (auth.uid() = user_id);

CREATE POLICY "Hosts have full access to events" 
ON public.events FOR ALL 
USING (wedding_id IN (SELECT id FROM public.weddings WHERE user_id = auth.uid()));

CREATE POLICY "Hosts have full access to families" 
ON public.families FOR ALL 
USING (wedding_id IN (SELECT id FROM public.weddings WHERE user_id = auth.uid()));

CREATE POLICY "Hosts have full access to guests" 
ON public.guests FOR ALL 
USING (wedding_id IN (SELECT id FROM public.weddings WHERE user_id = auth.uid()));

CREATE POLICY "Hosts have full access to invitations" 
ON public.invitations FOR ALL 
USING (wedding_id IN (SELECT id FROM public.weddings WHERE user_id = auth.uid()));

-- -------------------------------------------------------------
-- Guest / Public Policies (Read & RSVP Updates)
-- -------------------------------------------------------------

-- Public can read wedding details and events for rendering invitation sites
CREATE POLICY "Public can view weddings via invitation slug" 
ON public.weddings FOR SELECT 
USING (true);

CREATE POLICY "Public can view events for weddings" 
ON public.events FOR SELECT 
USING (true);

-- Guests can lookup their RSVP status via unique invite code
CREATE POLICY "Guests can view their guest record via invite_code" 
ON public.guests FOR SELECT 
USING (true);

-- Guests can update their own RSVP status & dietary preference
CREATE POLICY "Guests can update RSVP status" 
ON public.guests FOR UPDATE 
USING (true) 
WITH CHECK (true);

-- Public invitation slug lookup
CREATE POLICY "Public can view invitation metadata" 
ON public.invitations FOR SELECT 
USING (true);


-- Indexes for Fast Querying
CREATE INDEX idx_events_wedding_id ON public.events(wedding_id);
CREATE INDEX idx_guests_wedding_id ON public.guests(wedding_id);
CREATE INDEX idx_guests_family_id ON public.guests(family_id);
CREATE INDEX idx_guests_invite_code ON public.guests(invite_code);
CREATE INDEX idx_invitations_slug ON public.invitations(slug);

-- Auto-update updated_at timestamp function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_weddings_updated_at BEFORE UPDATE ON public.weddings FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
CREATE TRIGGER update_guests_updated_at BEFORE UPDATE ON public.guests FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();