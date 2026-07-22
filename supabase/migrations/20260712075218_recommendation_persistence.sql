BEGIN;

ALTER TABLE public.bookmarks ADD COLUMN place_name_at_save text;
ALTER TABLE public.bookmarks ADD COLUMN region_at_save text;
UPDATE public.bookmarks
SET place_name_at_save = place_id
WHERE place_name_at_save IS NULL;
ALTER TABLE public.bookmarks ALTER COLUMN place_name_at_save SET NOT NULL;
CREATE TABLE public.recommendation_feedback (id uuid DEFAULT gen_random_uuid() NOT NULL, user_id uuid NOT NULL, recommendation_id uuid NOT NULL, place_id text NOT NULL, feedback_type text NOT NULL, reason_code text, reason_text text, created_at timestamp with time zone DEFAULT now() NOT NULL, updated_at timestamp with time zone DEFAULT now() NOT NULL);
ALTER TABLE public.recommendation_feedback ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recommendation_feedback ADD CONSTRAINT recommendation_feedback_feedback_type_check CHECK (feedback_type = ANY (ARRAY['LIKE'::text, 'DISLIKE'::text]));
ALTER TABLE public.recommendation_feedback ADD CONSTRAINT recommendation_feedback_pkey PRIMARY KEY (id);
ALTER TABLE public.recommendation_feedback ADD CONSTRAINT recommendation_feedback_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;
ALTER TABLE public.recommendation_feedback ADD CONSTRAINT recommendation_feedback_user_id_recommendation_id_place_id_key UNIQUE (user_id, recommendation_id, place_id);
GRANT MAINTAIN, REFERENCES, TRIGGER, TRUNCATE ON public.recommendation_feedback TO service_role;
CREATE INDEX recommendation_feedback_recommendation_idx ON public.recommendation_feedback (recommendation_id);
CREATE INDEX recommendation_feedback_user_place_idx ON public.recommendation_feedback (user_id, place_id);
CREATE TABLE public.recommendation_requests (id uuid DEFAULT gen_random_uuid() NOT NULL, user_id uuid NOT NULL, idempotency_key uuid NOT NULL, request_hash text NOT NULL, status text DEFAULT 'PROCESSING'::text NOT NULL, recommendation_id uuid, error_code text, created_at timestamp with time zone DEFAULT now() NOT NULL, updated_at timestamp with time zone DEFAULT now() NOT NULL);
ALTER TABLE public.recommendation_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recommendation_requests ADD CONSTRAINT recommendation_requests_pkey PRIMARY KEY (id);
ALTER TABLE public.recommendation_requests ADD CONSTRAINT recommendation_requests_status_check CHECK (status = ANY (ARRAY['PROCESSING'::text, 'COMPLETED'::text, 'FAILED'::text]));
ALTER TABLE public.recommendation_requests ADD CONSTRAINT recommendation_requests_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;
ALTER TABLE public.recommendation_requests ADD CONSTRAINT recommendation_requests_user_id_idempotency_key_key UNIQUE (user_id, idempotency_key);
GRANT MAINTAIN, REFERENCES, TRIGGER, TRUNCATE ON public.recommendation_requests TO service_role;
CREATE INDEX recommendation_requests_recommendation_idx ON public.recommendation_requests (recommendation_id);
CREATE TABLE public.recommendation_session_places (id uuid DEFAULT gen_random_uuid() NOT NULL, recommendation_id uuid NOT NULL, place_id text NOT NULL, place_name_at_recommendation text NOT NULL, region_at_recommendation text, rank integer NOT NULL, role text NOT NULL, score integer NOT NULL, score_details jsonb NOT NULL, reasons jsonb NOT NULL, created_at timestamp with time zone DEFAULT now() NOT NULL);
ALTER TABLE public.recommendation_session_places ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recommendation_session_places ADD CONSTRAINT recommendation_session_places_pkey PRIMARY KEY (id);
ALTER TABLE public.recommendation_session_places ADD CONSTRAINT recommendation_session_places_rank_check CHECK (rank >= 1 AND rank <= 3);
ALTER TABLE public.recommendation_session_places ADD CONSTRAINT recommendation_session_places_recommendation_id_place_id_key UNIQUE (recommendation_id, place_id);
ALTER TABLE public.recommendation_session_places ADD CONSTRAINT recommendation_session_places_recommendation_id_rank_key UNIQUE (recommendation_id, rank);
GRANT MAINTAIN, REFERENCES, TRIGGER, TRUNCATE ON public.recommendation_session_places TO service_role;
CREATE INDEX recommendation_session_places_recommendation_idx ON public.recommendation_session_places (recommendation_id);
CREATE TABLE public.recommendation_sessions (id uuid DEFAULT gen_random_uuid() NOT NULL, user_id uuid NOT NULL, conditions jsonb NOT NULL, created_at timestamp with time zone DEFAULT now() NOT NULL, updated_at timestamp with time zone DEFAULT now() NOT NULL);
ALTER TABLE public.recommendation_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recommendation_sessions ADD CONSTRAINT recommendation_sessions_pkey PRIMARY KEY (id);
ALTER TABLE public.recommendation_feedback ADD CONSTRAINT recommendation_feedback_recommendation_id_fkey FOREIGN KEY (recommendation_id) REFERENCES public.recommendation_sessions(id) ON DELETE CASCADE;
ALTER TABLE public.recommendation_requests ADD CONSTRAINT recommendation_requests_recommendation_id_fkey FOREIGN KEY (recommendation_id) REFERENCES public.recommendation_sessions(id) ON DELETE SET NULL;
ALTER TABLE public.recommendation_session_places ADD CONSTRAINT recommendation_session_places_recommendation_id_fkey FOREIGN KEY (recommendation_id) REFERENCES public.recommendation_sessions(id) ON DELETE CASCADE;
ALTER TABLE public.recommendation_sessions ADD CONSTRAINT recommendation_sessions_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;
GRANT MAINTAIN, REFERENCES, TRIGGER, TRUNCATE ON public.recommendation_sessions TO service_role;
CREATE INDEX recommendation_sessions_user_created_at_idx ON public.recommendation_sessions (user_id, created_at DESC);
CREATE TABLE public.recommended_courses (id uuid DEFAULT gen_random_uuid() NOT NULL, recommendation_id uuid NOT NULL, selected_place_id text NOT NULL, title text NOT NULL, summary text, mode text NOT NULL, course jsonb NOT NULL, created_at timestamp with time zone DEFAULT now() NOT NULL, updated_at timestamp with time zone DEFAULT now() NOT NULL);
ALTER TABLE public.recommended_courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recommended_courses ADD CONSTRAINT recommended_courses_pkey PRIMARY KEY (id);
ALTER TABLE public.recommended_courses ADD CONSTRAINT recommended_courses_recommendation_id_fkey FOREIGN KEY (recommendation_id) REFERENCES public.recommendation_sessions(id) ON DELETE CASCADE;
ALTER TABLE public.recommended_courses ADD CONSTRAINT recommended_courses_recommendation_id_key UNIQUE (recommendation_id);
GRANT MAINTAIN, REFERENCES, TRIGGER, TRUNCATE ON public.recommended_courses TO service_role;

REVOKE ALL ON TABLE public.recommendation_sessions FROM anon, authenticated;
REVOKE ALL ON TABLE public.recommendation_requests FROM anon, authenticated;
REVOKE ALL ON TABLE public.recommendation_session_places FROM anon, authenticated;
REVOKE ALL ON TABLE public.recommended_courses FROM anon, authenticated;
REVOKE ALL ON TABLE public.recommendation_feedback FROM anon, authenticated;

COMMIT;
