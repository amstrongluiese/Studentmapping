--
-- PostgreSQL database dump
--

\restrict MwnQOHraRo4pDqKyDcmkHsmYBq743GS04Hr95y21deFaPvHHjGaVzObT7xvN8sq

-- Dumped from database version 18.4
-- Dumped by pg_dump version 18.4

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: pg_trgm; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS pg_trgm WITH SCHEMA public;


--
-- Name: EXTENSION pg_trgm; Type: COMMENT; Schema: -; Owner: 
--

COMMENT ON EXTENSION pg_trgm IS 'text similarity measurement and index searching based on trigrams';


SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: imports; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.imports (
    id integer NOT NULL,
    source text DEFAULT 'api'::text NOT NULL,
    status text DEFAULT 'completed'::text NOT NULL,
    imported_count integer DEFAULT 0 NOT NULL,
    failed_count integer DEFAULT 0 NOT NULL,
    started_at timestamp without time zone DEFAULT now() NOT NULL,
    completed_at timestamp without time zone,
    notes text
);


ALTER TABLE public.imports OWNER TO postgres;

--
-- Name: imports_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.imports_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.imports_id_seq OWNER TO postgres;

--
-- Name: imports_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.imports_id_seq OWNED BY public.imports.id;


--
-- Name: mapping_logs; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.mapping_logs (
    id integer NOT NULL,
    import_id integer,
    action text NOT NULL,
    school_registry_id integer,
    student_processed_id integer,
    message text NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.mapping_logs OWNER TO postgres;

--
-- Name: mapping_logs_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.mapping_logs_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.mapping_logs_id_seq OWNER TO postgres;

--
-- Name: mapping_logs_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.mapping_logs_id_seq OWNED BY public.mapping_logs.id;


--
-- Name: referrals; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.referrals (
    id integer NOT NULL,
    referrer_id integer,
    referred_name text NOT NULL,
    relationship text NOT NULL,
    contact_number text,
    notes text,
    status text DEFAULT 'pending'::text NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.referrals OWNER TO postgres;

--
-- Name: referrals_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.referrals_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.referrals_id_seq OWNER TO postgres;

--
-- Name: referrals_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.referrals_id_seq OWNED BY public.referrals.id;


--
-- Name: school_aliases; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.school_aliases (
    id integer NOT NULL,
    school_registry_id integer NOT NULL,
    alias_name text NOT NULL,
    normalized_alias text NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.school_aliases OWNER TO postgres;

--
-- Name: school_aliases_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.school_aliases_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.school_aliases_id_seq OWNER TO postgres;

--
-- Name: school_aliases_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.school_aliases_id_seq OWNED BY public.school_aliases.id;


--
-- Name: school_match_history; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.school_match_history (
    id integer NOT NULL,
    imported_name text NOT NULL,
    official_school_id integer,
    resolved_by text DEFAULT 'Admin'::text NOT NULL,
    occurrences integer DEFAULT 1 NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.school_match_history OWNER TO postgres;

--
-- Name: school_match_history_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.school_match_history_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.school_match_history_id_seq OWNER TO postgres;

--
-- Name: school_match_history_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.school_match_history_id_seq OWNED BY public.school_match_history.id;


--
-- Name: school_registry; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.school_registry (
    id integer NOT NULL,
    school_id text,
    school_name text NOT NULL,
    normalized_school_name text DEFAULT ''::text NOT NULL,
    school_type text,
    sector text,
    municipality text DEFAULT 'Laguna'::text NOT NULL,
    province text DEFAULT 'Laguna'::text NOT NULL,
    address text,
    latitude double precision,
    longitude double precision,
    source text,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.school_registry OWNER TO postgres;

--
-- Name: school_registry_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.school_registry_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.school_registry_id_seq OWNER TO postgres;

--
-- Name: school_registry_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.school_registry_id_seq OWNED BY public.school_registry.id;


--
-- Name: student_imports; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.student_imports (
    id integer NOT NULL,
    student_number text NOT NULL,
    full_name text NOT NULL,
    previous_school text,
    program text,
    scholarship text,
    municipality text DEFAULT 'Laguna'::text NOT NULL,
    imported_at timestamp without time zone DEFAULT now() NOT NULL,
    import_source text NOT NULL,
    import_status text DEFAULT 'Pending'::text NOT NULL,
    matched_school_id integer,
    match_confidence integer,
    match_rule text,
    strand text,
    admission_type text
);


ALTER TABLE public.student_imports OWNER TO postgres;

--
-- Name: student_imports_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.student_imports_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.student_imports_id_seq OWNER TO postgres;

--
-- Name: student_imports_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.student_imports_id_seq OWNED BY public.student_imports.id;


--
-- Name: students; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.students (
    id integer NOT NULL,
    student_number text NOT NULL,
    name text NOT NULL,
    referral_code text NOT NULL
);


ALTER TABLE public.students OWNER TO postgres;

--
-- Name: students_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.students_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.students_id_seq OWNER TO postgres;

--
-- Name: students_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.students_id_seq OWNED BY public.students.id;


--
-- Name: students_processed; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.students_processed (
    id integer NOT NULL,
    raw_id integer,
    student_number text NOT NULL,
    full_name text NOT NULL,
    course text,
    admission_type text,
    last_school_name text NOT NULL,
    last_school_type text,
    school_registry_id integer,
    municipality text DEFAULT 'Laguna'::text NOT NULL,
    province text DEFAULT 'Laguna'::text NOT NULL,
    year_level text,
    enrollment_status text DEFAULT 'Active'::text NOT NULL,
    enrollment_date timestamp without time zone DEFAULT now() NOT NULL,
    imported_source text DEFAULT 'API'::text NOT NULL,
    archived_at timestamp without time zone,
    mapping_status text DEFAULT 'pending'::text NOT NULL,
    synced_at timestamp without time zone DEFAULT now() NOT NULL,
    processed_at timestamp without time zone DEFAULT now() NOT NULL,
    strand text,
    previous_school text,
    contact_number text,
    schedule text,
    iskolar_ni_kap text,
    requirements text
);


ALTER TABLE public.students_processed OWNER TO postgres;

--
-- Name: students_processed_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.students_processed_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.students_processed_id_seq OWNER TO postgres;

--
-- Name: students_processed_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.students_processed_id_seq OWNED BY public.students_processed.id;


--
-- Name: students_raw; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.students_raw (
    id integer NOT NULL,
    import_id integer,
    student_number text NOT NULL,
    full_name text NOT NULL,
    course text,
    last_school_name text NOT NULL,
    last_school_type text,
    student_type text,
    municipality text DEFAULT 'Laguna'::text NOT NULL,
    raw_payload text,
    synced_at timestamp without time zone DEFAULT now() NOT NULL,
    strand text,
    province text DEFAULT 'Laguna'::text NOT NULL,
    previous_school text,
    contact_number text,
    schedule text,
    iskolar_ni_kap text,
    requirements text,
    year_level text
);


ALTER TABLE public.students_raw OWNER TO postgres;

--
-- Name: students_raw_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.students_raw_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.students_raw_id_seq OWNER TO postgres;

--
-- Name: students_raw_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.students_raw_id_seq OWNED BY public.students_raw.id;


--
-- Name: system_settings; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.system_settings (
    key text NOT NULL,
    value text NOT NULL,
    description text,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.system_settings OWNER TO postgres;

--
-- Name: imports id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.imports ALTER COLUMN id SET DEFAULT nextval('public.imports_id_seq'::regclass);


--
-- Name: mapping_logs id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.mapping_logs ALTER COLUMN id SET DEFAULT nextval('public.mapping_logs_id_seq'::regclass);


--
-- Name: referrals id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.referrals ALTER COLUMN id SET DEFAULT nextval('public.referrals_id_seq'::regclass);


--
-- Name: school_aliases id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.school_aliases ALTER COLUMN id SET DEFAULT nextval('public.school_aliases_id_seq'::regclass);


--
-- Name: school_match_history id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.school_match_history ALTER COLUMN id SET DEFAULT nextval('public.school_match_history_id_seq'::regclass);


--
-- Name: school_registry id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.school_registry ALTER COLUMN id SET DEFAULT nextval('public.school_registry_id_seq'::regclass);


--
-- Name: student_imports id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.student_imports ALTER COLUMN id SET DEFAULT nextval('public.student_imports_id_seq'::regclass);


--
-- Name: students id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.students ALTER COLUMN id SET DEFAULT nextval('public.students_id_seq'::regclass);


--
-- Name: students_processed id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.students_processed ALTER COLUMN id SET DEFAULT nextval('public.students_processed_id_seq'::regclass);


--
-- Name: students_raw id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.students_raw ALTER COLUMN id SET DEFAULT nextval('public.students_raw_id_seq'::regclass);


--
-- Data for Name: imports; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.imports (id, source, status, imported_count, failed_count, started_at, completed_at, notes) FROM stdin;
\.


--
-- Data for Name: mapping_logs; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.mapping_logs (id, import_id, action, school_registry_id, student_processed_id, message, created_at) FROM stdin;
\.


--
-- Data for Name: referrals; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.referrals (id, referrer_id, referred_name, relationship, contact_number, notes, status, created_at) FROM stdin;
\.


--
-- Data for Name: school_aliases; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.school_aliases (id, school_registry_id, alias_name, normalized_alias, created_at) FROM stdin;
3	6585	2ND COURSER-TRIMEX COLLEGES	2ND COURSERTRIMEX COLLEGES	2026-07-05 09:03:34.27537
34	5559	The Sisters Of Mary School	SISTERS MARY	2026-07-07 16:16:02.588939
35	6299	Polytechnic University of the Philippines Santa Rosa Campus	POLYTECHNIC PHILIPPINES SANTA ROSA	2026-07-07 16:16:02.588939
36	5477	Juan F. Trivino Memorial High School	JUAN F TRIVINO MEMORIAL HIGH	2026-07-07 16:16:02.588939
37	6012	Laguna Northwestern College San Pedro	LAGUNA NORTHWESTERN SAN PEDRO	2026-07-07 16:16:02.588939
38	6435	GlobTek SHS	GLOBTEK SENIOR HIGH	2026-07-07 16:16:02.588939
39	6435	Sinalhan Integrated National High School	SINALHAN INTEGRATED NATIONAL HIGH	2026-07-07 16:16:02.588939
40	6341	Saint Charles Academy	SAINT CHARLES	2026-07-07 16:16:02.588939
41	6071	Diploma in Information Technology - Computer Technology	DIPLOMA IN INFORMATION TECHNOLOGY COMPUTER TECHNOLOGY	2026-07-07 16:16:02.588939
42	6599	UPHSL GMA	UPHSL GMA	2026-07-07 16:16:02.588939
43	6348	Jayobo NHS- Iloilo	JAYOBO NATIONAL HIGH ILOILO	2026-07-07 16:16:02.588939
44	6447	CVSU	CVSU	2026-07-07 16:16:02.588939
45	6505	STI College Carmona	STI CARMONA	2026-07-07 16:16:02.588939
46	6177	Munting Ilog National High School	MUNTING ILOG NATIONAL HIGH	2026-07-07 16:16:02.588939
47	6188	NCST-IIRT Institute of Industrial Research and Training	NCST IIRT INDUSTRIAL RESEARCH AND TRAINING	2026-07-07 16:16:02.588939
48	6271	Philtech GMA	PHILTECH GMA	2026-07-07 16:16:02.588939
49	5773	City Global Binan	CITY GLOBAL BINAN	2026-07-07 16:16:02.588939
50	6366	Saint Vincent College	SAINT VINCENT	2026-07-07 16:16:02.588939
51	6271	Philippine Technologicalm Institue of Science Arts and Trade Central Inc GMA Cavite	PHILIPPINE TECHNOLOGICALM INSTITUE SCIENCE ARTS AND TRADE CENTRAL GMA CAVITE	2026-07-07 16:16:02.588939
52	6348	Murcia Senior High School	MURCIA SENIOR HIGH	2026-07-07 16:16:02.588939
53	6836	STI Senior High School	STI SENIOR HIGH	2026-07-07 16:16:02.588939
54	6103	Ildefonso Quimson Community High School	ILDEFONSO QUIMSON COMMUNITY HIGH	2026-07-07 16:16:02.588939
55	5805	Cuenca Senior High School Batangas	CUENCA SENIOR HIGH BATANGAS	2026-07-07 16:16:02.588939
56	6129	Computer System Institute	COMPUTER SYSTEM	2026-07-07 16:16:02.588939
57	6196	New Sinai School & Colleges	NEW SINAI COLLEGES	2026-07-07 16:16:02.588939
58	5477	BCSHS Sto Tomas Campus	BCSHS STO TOMAS	2026-07-07 16:16:02.588939
59	5770	Chair Of St. Peter School	CHAIR ST PETER	2026-07-07 16:16:02.588939
60	6447	Lakeshore Inc.	LAKESHORE	2026-07-07 16:16:02.588939
61	5477	Esteban Madrona National High School	ESTEBAN MADRONA NATIONAL HIGH	2026-07-07 16:16:02.588939
62	5603	Maquiling Integrated National High School	MAQUILING INTEGRATED NATIONAL HIGH	2026-07-07 16:16:02.588939
63	6404	St. Louis Anne Colleges of San Pedro Laguna Inc.	ST LOUIS ANNE COLLEGES SAN PEDRO LAGUNA	2026-07-07 16:16:02.588939
64	6435	Ismael Mathay Sr. High School	ISMAEL MATHAY SR HIGH	2026-07-07 16:16:02.588939
65	6464	St.Ignatius Binan Academy	ST IGNATIUS BINAN	2026-07-07 16:16:02.588939
66	6405	San Pedro Relocation Center National High Schol	SAN PEDRO RELOCATION CENTER NATIONAL HIGH SCHOL	2026-07-07 16:16:02.588939
67	5654	Binan San Antonio Campus	BINAN SAN ANTONIO	2026-07-07 16:16:02.588939
68	6405	San Pedro Relocation Center National High Cchool	SAN PEDRO RELOCATION CENTER NATIONAL HIGH CCHOOL	2026-07-07 16:16:02.588939
69	6348	Senior Salvacion Nationa klHigh Scx	SENIOR SALVACION NATIONA KLHIGH SCX	2026-07-07 16:16:02.588939
70	5925	Philippine Normal University	PHILIPPINE NORMAL	2026-07-07 16:16:02.588939
71	5836	Don Jose Integarted High School	DON JOSE INTEGARTED HIGH	2026-07-07 16:16:02.588939
72	5684	San Roque Dau National High School	SAN ROQUE DAU NATIONAL HIGH	2026-07-07 16:16:02.588939
73	5770	CGC Santa Rosa	CGC SANTA ROSA	2026-07-07 16:16:02.588939
74	6464	St Ignatious Binan Campus	ST IGNATIOUS BINAN	2026-07-07 16:16:02.588939
75	5655	BiÃ±an City Senior Highschool West Campus	BIA±AN CITY SENIOR HIGHSCHOOL WEST	2026-07-07 16:16:02.588939
76	5477	Saint Louis Ann Colleges	SAINT LOUIS ANN COLLEGES	2026-07-07 16:16:02.588939
77	6599	University of Perpetual Help Binan Laguna	PERPETUAL HELP BINAN LAGUNA	2026-07-07 16:16:02.588939
78	6599	UPHSL Binan	UPHSL BINAN	2026-07-07 16:16:02.588939
79	5772	Citi Global College Binan Laguna	CITI GLOBAL BINAN LAGUNA	2026-07-07 16:16:02.588939
80	6129	NU Laguna	NU LAGUNA	2026-07-07 16:16:02.588939
81	6348	Biliran Province State University	BILIRAN PROVINCE STATE	2026-07-07 16:16:02.588939
82	5656	Malabon National High School	MALABON NATIONAL HIGH	2026-07-07 16:16:02.588939
83	6249	Pamantasan ng Cabuyao - Senior High School	PAMANTASAN NG CABUYAO SENIOR HIGH	2026-07-07 16:16:02.588939
84	5477	Dr. Filemon C. Aguilar Memorial College of Las PiÃ±as - IT Campus	DR FILEMON C AGUILAR MEMORIAL LAS PIA±AS IT	2026-07-07 16:16:02.588939
85	5907	Lutucan National High School Sariaya Quezon	LUTUCAN NATIONAL HIGH SARIAYA QUEZON	2026-07-07 16:16:02.588939
86	6435	Sinalhan Senior High School	SINALHAN SENIOR HIGH	2026-07-07 16:16:02.588939
87	6435	Don Jesus Gonzales High School Pampanga	DON JESUS GONZALES HIGH PAMPANGA	2026-07-07 16:16:02.588939
88	6435	St. Ignatuis Balibago	ST IGNATUIS BALIBAGO	2026-07-07 16:16:02.588939
89	6447	Southville 5a INHS	SOUTHVILLE 5A INHS	2026-07-07 16:16:02.588939
90	6228	Pacita Complex Senior Highscool	PACITA COMPLEX SENIOR HIGHSCOOL	2026-07-07 16:16:02.588939
91	6442	Southbay Montesorri Sta Cruz	SOUTHBAY MONTESORRI STA CRUZ	2026-07-07 16:16:02.588939
92	6435	Olivarez College ParaÃ±aque	OLIVAREZ PARAA±AQUE	2026-07-07 16:16:02.588939
93	6435	La Huerta National High School	LA HUERTA NATIONAL HIGH	2026-07-07 16:16:02.588939
94	6348	Central Luzon State University	CENTRAL LUZON STATE	2026-07-07 16:16:02.588939
95	5653	West Campus Senior High School	WEST SENIOR HIGH	2026-07-07 16:16:02.588939
\.


--
-- Data for Name: school_match_history; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.school_match_history (id, imported_name, official_school_id, resolved_by, occurrences, created_at, updated_at) FROM stdin;
3	2ND COURSER-TRIMEX COLLEGES	6585	Admin	1	2026-07-05 09:03:34.253265	2026-07-05 09:03:34.253265
\.


--
-- Data for Name: school_registry; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.school_registry (id, school_id, school_name, normalized_school_name, school_type, sector, municipality, province, address, latitude, longitude, source, is_active, created_at, updated_at) FROM stdin;
5465	\N	(S.J.B.) SAINT JOHN BOSCO, I.A.S., INC.	SJB SAINT JOHN BOSCO IAS INC	Grade 11-12	Unknown	Angono	Rizal	Alirey Bldg., Along Baytown Road	14.5330747	121.1473055	Masterlist 2026	t	2026-07-03 16:53:15.964142	2026-07-03 16:53:15.964142
5466	\N	A1.W.M. Learning Academy Inc.	A1WM LEARNING ACADEMY INC	Grade 7-10 & Grade 11-12	Unknown	General Trias	Cavite	Governor's Drive, Brgy. Manggahan, Gen. Trias, Cavite	14.2925605	120.9093699	Masterlist 2026	t	2026-07-03 16:53:15.964142	2026-07-03 16:53:15.964142
5467	\N	ABE INTERNATIONAL BUSINESS COLLEGE QUEZON PROVINCE INC.	ABE INTERNATIONAL BUSINESS COLLEGE QUEZON PROVINCE INC	Grade 11-12	Unknown	Lucena City	Quezon	233 Quezon Avenue, Brgy. 9	13.9320904	121.6127543	Masterlist 2026	t	2026-07-03 16:53:15.964142	2026-07-03 16:53:15.964142
5468	\N	ABE International Business College-Cainta Rizal, Inc.	ABE INTERNATIONAL BUSINESS COLLEGECAINTA RIZAL INC	Grade 11-12	Unknown	Cainta Rizal	Rizal	Carms Bldg. cor V.V Soliven St. Cainta Rizal	14.616747	121.101945	Masterlist 2026	t	2026-07-03 16:53:15.964142	2026-07-03 16:53:15.964142
5469	\N	ABE International Business College-Quezon Province	ABE INTERNATIONAL BUSINESS COLLEGEQUEZON PROVINCE	Grade 11-12	Unknown	Lucena City	Quezon	Rockwell Building Quezon Avenue, Lucena City	13.9320904	121.6127543	Masterlist 2026	t	2026-07-03 16:53:15.964142	2026-07-03 16:53:15.964142
5470	\N	Abeniano Delos Santos Academy, Inc.	ABENIANO DELOS SANTOS ACADEMY INC	Kinder, Grade 1-6, Grade 7-10 & Grade 11-12	Unknown	Naic	Cavite	Ibayo Silangan, Naic, Cavite	14.3193701	120.7686365	Masterlist 2026	t	2026-07-03 16:53:15.964142	2026-07-03 16:53:15.964142
5471	\N	Abuyod National High School	ABUYOD NATIONAL HIGH SCHOOL	Grade 7-10 & Grade 11-12	Unknown	Teresa	Rizal	Sitio Abuyod	14.5842183	121.228499	Masterlist 2026	t	2026-07-03 16:53:15.964142	2026-07-03 16:53:15.964142
5472	\N	Abuyon NHS	ABUYON NHS	Grade 7-10 & Grade 11-12	Unknown	San Narciso	Quezon	Abuyon	13.6068757	122.4863492	Masterlist 2026	t	2026-07-03 16:53:15.964142	2026-07-03 16:53:15.964142
5473	\N	Acacia School Foundation, Inc	ACACIA SCHOOL FOUNDATION INC	Kinder, Grade 1-6, Grade 7-10 & Grade 11-12	Unknown	City of Santa Rosa	Laguna	Hacienda Sta Elena	14.2409589	121.0719318	Masterlist 2026	t	2026-07-03 16:53:15.964142	2026-07-03 16:53:15.964142
5475	\N	ACADEMIA DE LIPA CITY INC	ACADEMIA DE LIPA CITY INC	Kinder, Grade 1-6, Grade 7-10 & Grade 11-12	Unknown	Lipa City	Batangas	SAN SEBASTIAN LIPA CITY	13.9369336	121.1503359	Masterlist 2026	t	2026-07-03 16:53:15.964142	2026-07-03 16:53:15.964142
5476	\N	Academia De Mayuga Inc.	ACADEMIA DE MAYUGA INC	Kinder, Grade 1-6, Grade 7-10 & Grade 11-12	Unknown	Laurel	Batangas	Leviste, Laurel, Batangas	14.0719541	120.9524324	Masterlist 2026	t	2026-07-03 16:53:15.964142	2026-07-03 16:53:15.964142
5477	\N	Academia De San Francisco Javier	ACADEMIA DE SAN FRANCISCO JAVIER	Kinder, Grade 1-6, Grade 7-10 & Grade 11-12	Unknown	Unspecified	Region IV-A	Ruiz Martinez	12.879721	121.774017	Masterlist 2026	t	2026-07-03 16:53:15.964142	2026-07-03 16:53:15.964142
5478	\N	Academia De San Francisco Javier Batangas Inc.	ACADEMIA DE SAN FRANCISCO JAVIER BATANGAS INC	Kinder, Grade 1-6, Grade 7-10 & Grade 11-12	Unknown	Nasugbu	Batangas	Ruiz Martinez	14.0668945	120.6385749	Masterlist 2026	t	2026-07-03 16:53:15.964142	2026-07-03 16:53:15.964142
5479	\N	Academia de San Ignacio de Loyola	ACADEMIA DE SAN IGNACIO DE LOYOLA	Kinder, Grade 1-6, Grade 7-10 & Grade 11-12	Unknown	San Pablo City	Laguna	Schetelig Avenue	14.0717396	121.3317724	Masterlist 2026	t	2026-07-03 16:53:15.964142	2026-07-03 16:53:15.964142
5480	\N	Academia de San Vicente Ferrer-Cavite Inc.	ACADEMIA DE SAN VICENTE FERRERCAVITE INC	Kinder, Grade 1-6, Grade 7-10 & Grade 11-12	Unknown	Indang	Cavite	82 Lumampong Halayhay	14.1605192	120.8585076	Masterlist 2026	t	2026-07-03 16:53:15.964142	2026-07-03 16:53:15.964142
5481	\N	Academy for Christian Education, Inc.	ACADEMY FOR CHRISTIAN EDUCATION INC	Kinder, Grade 1-6, Grade 7-10 & Grade 11-12	Unknown	Unspecified	Region IV-A	B4 L25 Queen's Main Blvd.	12.879721	121.774017	Masterlist 2026	t	2026-07-03 16:53:15.964142	2026-07-03 16:53:15.964142
5482	\N	Academy of Saint John - La Salle Green Hills Supervised	ACADEMY OF SAINT JOHN LA SALLE GREEN HILLS SUPERVISED	Kinder, Grade 1-6, Grade 7-10 & Grade 11-12	Unknown	General Trias	Cavite	Sta. Clara Subdivision, General Trias, Cavite	14.3823443	120.8834106	Masterlist 2026	t	2026-07-03 16:53:15.964142	2026-07-03 16:53:15.964142
5483	\N	Aceba Science & Tech. Institute (ASTI) Inc.	ACEBA SCIENCE TECH INSTITUTE ASTI INC	Grade 11-12	Unknown	Mauban	Quezon	De Vera St., Barangay Daungan, Mauban, Quezon	14.1903648	121.7324626	Masterlist 2026	t	2026-07-03 16:53:15.964142	2026-07-03 16:53:15.964142
5484	\N	ACEBA Science and Technology Institute (ASTI) Inc.	ACEBA SCIENCE AND TECHNOLOGY INSTITUTE ASTI INC	Grade 11-12	Unknown	City of Tayabas	Quezon	26 Legaspi St.	14.0265048	121.5920043	Masterlist 2026	t	2026-07-03 16:53:15.964142	2026-07-03 16:53:15.964142
5485	\N	ACEBA SCIENCE AND TECHNOLOGY INSTITUTE INC.	ACEBA SCIENCE AND TECHNOLOGY INSTITUTE INC	Grade 11-12	Unknown	City of Tayabas	Quezon	De Gracia cor. Mabini St.,	14.0265048	121.5920043	Masterlist 2026	t	2026-07-03 16:53:15.964142	2026-07-03 16:53:15.964142
5487	\N	ACEBA Systems Technology Institute Inc.	ACEBA SYSTEMS TECHNOLOGY INSTITUTE INC	Grade 11-12	Unknown	Unspecified	Region IV-A	FABEMAR Bldg.22 M.L. St cor Castro St.	12.879721	121.774017	Masterlist 2026	t	2026-07-03 16:53:15.964142	2026-07-03 16:53:15.964142
5488	\N	ACLC College of San Pablo	ACLC COLLEGE OF SAN PABLO	Grade 11-12	Unknown	San Pablo City	Laguna	Lynderson Bldg. II, Barleta St., San Pablo City, Laguna	14.0711951	121.3267743	Masterlist 2026	t	2026-07-03 16:53:15.964142	2026-07-03 16:53:15.964142
5489	\N	ACLC College of Taytay	ACLC COLLEGE OF TAYTAY	Grade 11-12	Unknown	Taytay	Rizal	7 El Monteverde Subd. San Juan, Taytay, Rizal	14.5558148	121.1374318	Masterlist 2026	t	2026-07-03 16:53:15.964142	2026-07-03 16:53:15.964142
5490	\N	ACTS Computer College	ACTS COMPUTER COLLEGE	Grade 11-12	Unknown	Santa Cruz	Laguna	P. Guevara Ave., cor A. Bonifacio St., Sta. Cruz, Laguna	14.2833727	121.4147121	Masterlist 2026	t	2026-07-03 16:53:15.964142	2026-07-03 16:53:15.964142
5491	\N	ACTS Computer College-Infanta, Inc.	ACTS COMPUTER COLLEGEINFANTA INC	Grade 11-12	Unknown	Infanta	Quezon	Gen. Luna St., Poblacion 39, Infanta, Quezon	14.746333	121.651389	Masterlist 2026	t	2026-07-03 16:53:15.964142	2026-07-03 16:53:15.964142
5492	\N	ACTS Computer College-Sta. Cruz	ACTS COMPUTER COLLEGESTA CRUZ	Grade 11-12	Unknown	Santa Cruz	Laguna	P. Guevara Avenue Corner A. Bonifacio Street, Sta. Cruz, Laguna	14.2833727	121.4147121	Masterlist 2026	t	2026-07-03 16:53:15.964142	2026-07-03 16:53:15.964142
5493	\N	Adelaido A. Bayot Memorial School, Inc.	ADELAIDO A BAYOT MEMORIAL SCHOOL INC	Kinder, Grade 1-6, Grade 7-10 & Grade 11-12	Unknown	Nasugbu	Batangas	J.P. Laurel St. Nasugbu, Batangas	14.066975	120.6329228	Masterlist 2026	t	2026-07-03 16:53:15.964142	2026-07-03 16:53:15.964142
5494	\N	Advance Treasure College System, Inc.	ADVANCE TREASURE COLLEGE SYSTEM INC	Kinder, Grade 1-6, Grade 7-10 & Grade 11-12	Unknown	Unspecified	Region IV-A	Blk 4 Lot 21 Phase 3 Mary Homes Subd.	12.879721	121.774017	Masterlist 2026	t	2026-07-03 16:53:15.964142	2026-07-03 16:53:15.964142
6517	\N	STI College Sta. Cruz	STI COLLEGE STA CRUZ	Grade 11-12	Unknown	Santa Cruz	Laguna	1522 Lord's Grace Bldg., P. Guevara Avenue, Sta. Cruz, Laguna	14.2784752	121.4158842	Masterlist 2026	t	2026-07-03 16:53:16.107439	2026-07-03 16:53:16.107439
5495	\N	Adventist International Institute of Advanced Studies	ADVENTIST INTERNATIONAL INSTITUTE OF ADVANCED STUDIES	Kinder, Grade 1-6, Grade 7-10 & Grade 11-12	Unknown	Silang	Cavite	Km 45.5 Aguinaldo Highway, Lalaan I, Silang, Cavite	14.2041503	120.9667353	Masterlist 2026	t	2026-07-03 16:53:15.964142	2026-07-03 16:53:15.964142
5496	\N	Adventist University of the Philippines	ADVENTIST UNIVERSITY OF THE PHILIPPINES	Kinder, Grade 1-6, Grade 7-10 & Grade 11-12	Unknown	Silang	Cavite	Puting Kahoy, Silang, Cavite	14.219399	121.0370033	Masterlist 2026	t	2026-07-03 16:53:15.964142	2026-07-03 16:53:15.964142
5497	\N	Adventist University of the Philippines of Seventh-Day Adventists, Inc.	ADVENTIST UNIVERSITY OF THE PHILIPPINES OF SEVENTHDAY ADVENTISTS INC	Kinder, Grade 1-6, Grade 7-10 & Grade 11-12	Unknown	Silang	Cavite	Puting Kahoy, Silang, Cavite	14.219399	121.0370033	Masterlist 2026	t	2026-07-03 16:53:15.964142	2026-07-03 16:53:15.964142
5498	\N	Affordable Private Education Center Inc.	AFFORDABLE PRIVATE EDUCATION CENTER INC	Grade 7-10 & Grade 11-12	Unknown	Taytay	Rizal	Verde Oro East Plaza Bldg., Manila East Rd.	14.562687	121.138639	Masterlist 2026	t	2026-07-03 16:53:15.964142	2026-07-03 16:53:15.964142
5499	\N	Affordable Private Education Center, Inc APEC Schools- Bacoor	AFFORDABLE PRIVATE EDUCATION CENTER INC APEC SCHOOLS BACOOR	Grade 7-10 & Grade 11-12	Unknown	Quezon City	Metro Manila	Marcos Alavarez Ave corner Latero	14.6292864	121.0128184	Masterlist 2026	t	2026-07-03 16:53:15.964142	2026-07-03 16:53:15.964142
5500	\N	AFFORDABLE PRIVATE EDUCATION CENTER, INC. APEC SCHOOLS - DASMARIÃ‘AS	AFFORDABLE PRIVATE EDUCATION CENTER INC APEC SCHOOLS DASMARIA‘AS	Grade 11-12	Unknown	Dasmariñas	Cavite	3175 Aguinaldo Ave., Salitran, DasmariÃ±as City, Cavite	14.3539736	120.9503435	Masterlist 2026	t	2026-07-03 16:53:15.964142	2026-07-03 16:53:15.964142
5501	\N	Agnus Dei Schools System, Inc.	AGNUS DEI SCHOOLS SYSTEM INC	Kinder, Grade 1-6, Grade 7-10 & Grade 11-12	Unknown	Angeles	Pampanga	280 Quezon Street	15.1418921	120.5939278	Masterlist 2026	t	2026-07-03 16:53:15.964142	2026-07-03 16:53:15.964142
5502	\N	Agoncillo Colleges, Inc.	AGONCILLO COLLEGES INC	Kinder, Grade 1-6, Grade 7-10 & Grade 11-12	Unknown	San Pedro	Laguna	R. Mendoza St.	14.3679706	121.0626885	Masterlist 2026	t	2026-07-03 16:53:15.964142	2026-07-03 16:53:15.964142
5503	\N	Agoncillo Senior High School	AGONCILLO SENIOR HIGH SCHOOL	Grade 11-12	Unknown	Agoncillo	Batangas	Pamiga, Agoncillo, Batangas	13.934196	120.9267112	Masterlist 2026	t	2026-07-03 16:53:15.964142	2026-07-03 16:53:15.964142
5504	\N	Agustinian School of Cabuyao	AGUSTINIAN SCHOOL OF CABUYAO	Kinder, Grade 1-6, Grade 7-10 & Grade 11-12	Unknown	Cabuyao City	Laguna	65 Banay-Banay, City of Cabuyao, Laguna	14.2548275	121.1283502	Masterlist 2026	t	2026-07-03 16:53:15.964142	2026-07-03 16:53:15.964142
5506	\N	AITECH (Antipolo City Institute of Technology)	AITECH ANTIPOLO CITY INSTITUTE OF TECHNOLOGY	Grade 11-12	Unknown	Antipolo	Lalawigan ng Rizal	Marcos Highway, Sitio Cabading	14.6292906	121.2251629	Masterlist 2026	t	2026-07-03 16:53:15.964142	2026-07-03 16:53:15.964142
5507	\N	Ajos National High School	AJOS NATIONAL HIGH SCHOOL	Grade 7-10 & Grade 11-12	Unknown	Mulanay	Quezon	Sto. NiÃ±o	13.5487164	122.3664864	Masterlist 2026	t	2026-07-03 16:53:15.964142	2026-07-03 16:53:15.964142
5508	\N	Alabat Island National High School	ALABAT ISLAND NATIONAL HIGH SCHOOL	Grade 7-10 & Grade 11-12	Unknown	Alabat	Quezon	Camagong	14.1025569	122.0166648	Masterlist 2026	t	2026-07-03 16:53:15.964142	2026-07-03 16:53:15.964142
5509	\N	Alaminos Integrated National High School	ALAMINOS INTEGRATED NATIONAL HIGH SCHOOL	Grade 7-10 & Grade 11-12	Unknown	Alaminos	Laguna	D. Fandino St., Brgy. Poblacion 2, Alaminos, Laguna	14.0641803	121.24427	Masterlist 2026	t	2026-07-03 16:53:15.964142	2026-07-03 16:53:15.964142
5510	\N	Alangilan Senior High School	ALANGILAN SENIOR HIGH SCHOOL	Grade 11-12	Unknown	Batangas City	Batangas	BCWD ST.Alangilan	13.7879204	121.0681692	Masterlist 2026	t	2026-07-03 16:53:15.964142	2026-07-03 16:53:15.964142
5511	\N	Alejandro P. Libao National High School	ALEJANDRO P LIBAO NATIONAL HIGH SCHOOL	Grade 7-10 & Grade 11-12	Unknown	Catanauan	Quezon	Tagbacan Ilaya	13.6315084	122.346425	Masterlist 2026	t	2026-07-03 16:53:15.964142	2026-07-03 16:53:15.964142
5512	\N	Alexandria Computer School & Technology Foundation	ALEXANDRIA COMPUTER SCHOOL TECHNOLOGY FOUNDATION	Kinder, Grade 1-6, Grade 7-10 & Grade 11-12	Unknown	Unspecified	Region IV-A	Javea Park Subd.	12.879721	121.774017	Masterlist 2026	t	2026-07-03 16:53:15.964142	2026-07-03 16:53:15.964142
5513	\N	Alexandria Computer School And Technology Foundation	ALEXANDRIA COMPUTER SCHOOL AND TECHNOLOGY FOUNDATION	Kinder, Grade 1-6, Grade 7-10 & Grade 11-12	Unknown	Unspecified	Region IV-A	Javea Park Subd. Sta Cecilia	12.879721	121.774017	Masterlist 2026	t	2026-07-03 16:53:15.964142	2026-07-03 16:53:15.964142
5514	\N	Alfonso Integrated High School	ALFONSO INTEGRATED HIGH SCHOOL	Grade 7-10 & Grade 11-12	Unknown	Naic	Cavite	Montenegro St.	14.3307444	120.8072307	Masterlist 2026	t	2026-07-03 16:53:15.964142	2026-07-03 16:53:15.964142
5515	\N	Alitagtag College, Inc. (High School Department Pinagkurusan Branch)	ALITAGTAG COLLEGE INC HIGH SCHOOL DEPARTMENT PINAGKURUSAN BRANCH	Grade 11-12	Unknown	Alitagtag	Batangas	Pinagkurusan, Alitagtag, Batangas	13.8660155	121.005156	Masterlist 2026	t	2026-07-03 16:53:15.980107	2026-07-03 16:53:15.980107
5516	\N	Alitagtag Senior High School	ALITAGTAG SENIOR HIGH SCHOOL	Grade 11-12	Unknown	Alitagtag	Batangas	Poblacion East, Alitagtag, Batangas	13.8628493	121.0072113	Masterlist 2026	t	2026-07-03 16:53:15.980107	2026-07-03 16:53:15.980107
5517	\N	Almond Academy Foundation, Inc.	ALMOND ACADEMY FOUNDATION INC	Kinder, Grade 1-6, Grade 7-10 & Grade 11-12	Unknown	San Fernando	Pampanga	San Fernando	15.0278121	120.6934882	Masterlist 2026	t	2026-07-03 16:53:15.980107	2026-07-03 16:53:15.980107
5518	\N	Aloneros NHS (Formerly LBS of Fisheries Ext. - Aloneros	ALONEROS NHS FORMERLY LBS OF FISHERIES EXT ALONEROS	Grade 7-10 & Grade 11-12	Unknown	Guinayangan	Quezon	Aloneros	13.9886308	122.3688445	Masterlist 2026	t	2026-07-03 16:53:15.980107	2026-07-03 16:53:15.980107
5519	\N	Alpha Angelicum Academy, Incorporated	ALPHA ANGELICUM ACADEMY INCORPORATED	Kinder, Grade 1-6, Grade 7-10 & Grade 11-12	Unknown	Biñan	Laguna	Westpoint Street	14.3297907	121.0959775	Masterlist 2026	t	2026-07-03 16:53:15.980107	2026-07-03 16:53:15.980107
5520	\N	Alpha Beth Christian Academy, Inc.	ALPHA BETH CHRISTIAN ACADEMY INC	Kinder, Grade 1-6, Grade 7-10 & Grade 11-12	Unknown	Tanay	Rizal	Market Site	14.5484154	121.365769	Masterlist 2026	t	2026-07-03 16:53:15.980107	2026-07-03 16:53:15.980107
5521	\N	Alpha Centauri Educational System, Inc.	ALPHA CENTAURI EDUCATIONAL SYSTEM INC	Grade 11-12	Unknown	Lucena City	Quezon	K18 Diversion Road	13.960213	121.615004	Masterlist 2026	t	2026-07-03 16:53:15.980107	2026-07-03 16:53:15.980107
5522	\N	Alupay Integrated National High School	ALUPAY INTEGRATED NATIONAL HIGH SCHOOL	Grade 7-10 & Grade 11-12	Unknown	Rosario	Batangas	Alupay, Rosario, Batangas	13.8459883	121.2933674	Masterlist 2026	t	2026-07-03 16:53:15.980107	2026-07-03 16:53:15.980107
5523	\N	AMA COLLEGE-CAVITE	AMA COLLEGECAVITE	Grade 11-12	Unknown	General Trias	Cavite	AMA University Town -ARA Vista Subd	14.2818375	120.9133594	Masterlist 2026	t	2026-07-03 16:53:15.980107	2026-07-03 16:53:15.980107
5524	\N	AMA Computer College East Rizal	AMA COMPUTER COLLEGE EAST RIZAL	Grade 11-12	Unknown	Antipolo	Rizal	AMA Building, Marcos Highway	14.6233399	121.1162498	Masterlist 2026	t	2026-07-03 16:53:15.980107	2026-07-03 16:53:15.980107
5526	\N	AMA Computer College Inc. - BiÃ±an Branch	AMA COMPUTER COLLEGE INC BIA±AN BRANCH	Grade 11-12	Unknown	Biñan	Laguna	Km 32 National Highway Canlalay, Binan Laguna	14.3355578	121.0779269	Masterlist 2026	t	2026-07-03 16:53:15.980107	2026-07-03 16:53:15.980107
5527	\N	AMA Computer College-Biñan	AMA COMPUTER COLLEGEBINAN	Grade 11-12	Unknown	Biñan	Laguna	Km. 32, National Highway, Canlalay, Biñan City, Laguna	14.3438821	121.0689402	Masterlist 2026	t	2026-07-03 16:53:15.980107	2026-07-03 16:53:15.980107
5528	\N	AMA Computer College-Calamba	AMA COMPUTER COLLEGECALAMBA	Grade 11-12	Unknown	Calamba	Laguna	Perez Commerical Building, National Highway, Brgy. Parian, Calamba, Laguna	14.217525	121.142131	Masterlist 2026	t	2026-07-03 16:53:15.980107	2026-07-03 16:53:15.980107
5529	\N	AMA Computer College-DasmariÃ±as, Cavite	AMA COMPUTER COLLEGEDASMARIA±AS CAVITE	Grade 11-12	Unknown	Trece Martires City	Cavite	Governor's Tower 1, Governor's Drive Langkaan 1, Dasmarinas, Cavite	14.3002942	120.9563801	Masterlist 2026	t	2026-07-03 16:53:15.980107	2026-07-03 16:53:15.980107
5530	\N	AMA Computer College-Lipa City	AMA COMPUTER COLLEGELIPA CITY	Grade 11-12	Unknown	Lipa City	Batangas	Ayala Hi-way, Balintawak, Lipa City, Batangas	13.9513481	121.1606144	Masterlist 2026	t	2026-07-03 16:53:15.980107	2026-07-03 16:53:15.980107
5531	\N	AMA Computer College-Lucena City	AMA COMPUTER COLLEGELUCENA CITY	Grade 11-12	Unknown	Lucena City	Quezon	Tantuco Bldg., #160 M.L. Tagarao St. Iyam Lucena City, Quezon	13.9344456	121.60358	Masterlist 2026	t	2026-07-03 16:53:15.980107	2026-07-03 16:53:15.980107
5532	\N	AMA Computer College-Sta. Cruz,Laguna	AMA COMPUTER COLLEGESTA CRUZLAGUNA	Grade 11-12	Unknown	Santa Cruz	Laguna	Ng Cha Bldg. P. Guevara Ave., Sta. Cruz Laguna	14.266435	121.4257119	Masterlist 2026	t	2026-07-03 16:53:15.980107	2026-07-03 16:53:15.980107
5533	\N	AMA Computer College-Sta.Cruz	AMA COMPUTER COLLEGESTACRUZ	Grade 11-12	Unknown	Santa Cruz	Laguna	P Guevarra Ave, Sta. Cruz, Laguna	14.266435	121.4257119	Masterlist 2026	t	2026-07-03 16:53:15.980107	2026-07-03 16:53:15.980107
5534	\N	AMA Computer Learning Center College of San Pablo City	AMA COMPUTER LEARNING CENTER COLLEGE OF SAN PABLO CITY	Grade 11-12	Unknown	San Pablo City	Laguna	Lynderson II Bldg. Brgy IV-B, Barleta St. San Pablo City	14.0714317	121.3273561	Masterlist 2026	t	2026-07-03 16:53:15.980107	2026-07-03 16:53:15.980107
5535	\N	AMA Computer Learning Center of Antipolo Inc.	AMA COMPUTER LEARNING CENTER OF ANTIPOLO INC	Grade 11-12	Unknown	Antipolo	Rizal	4F FBM Building, ML Quezon Street	14.5813687	121.1759566	Masterlist 2026	t	2026-07-03 16:53:15.980107	2026-07-03 16:53:15.980107
5536	\N	AMA Computer Learning Center of Bacoor, Inc.	AMA COMPUTER LEARNING CENTER OF BACOOR INC	Grade 11-12	Unknown	Bacoor	Cavite	3F Bacoor Business Center Bldg., Brgy. Salinas 4 Aguinaldo Highway,  Bacoor City, Cavite	14.4371058	120.9484604	Masterlist 2026	t	2026-07-03 16:53:15.980107	2026-07-03 16:53:15.980107
5537	\N	AMA Computer Learning Center of Batangas City	AMA COMPUTER LEARNING CENTER OF BATANGAS CITY	Grade 11-12	Unknown	Batangas City	Batangas	CASA Buena Bldg., P. Burgos St., Batangas City	13.7627407	121.0568049	Masterlist 2026	t	2026-07-03 16:53:15.980107	2026-07-03 16:53:15.980107
5538	\N	AMA Computer Learning Center of DasmariÃ±as, Cavite	AMA COMPUTER LEARNING CENTER OF DASMARIA±AS CAVITE	Grade 11-12	Unknown	Dasmariñas	Cavite	B3 L4 Hernandez Bldg., Pasong Tala Bldg., Zone IV, Aguinaldo Highway, DasmariÃ±as, Cavite	14.3257122	120.9403023	Masterlist 2026	t	2026-07-03 16:53:15.980107	2026-07-03 16:53:15.980107
5539	\N	AMA Computer Learning Center of Sta. Cruz	AMA COMPUTER LEARNING CENTER OF STA CRUZ	Grade 11-12	Unknown	San Pablo City	Laguna	2F E.M Bldg. P.Burgos St. Sta. Cruz Laguna	14.0693636	121.3245846	Masterlist 2026	t	2026-07-03 16:53:15.980107	2026-07-03 16:53:15.980107
5540	\N	AMA Computer Learning College of San Pedro	AMA COMPUTER LEARNING COLLEGE OF SAN PEDRO	Grade 11-12	Unknown	San Pedro	Laguna	33-A Mabini St., San Pedro, Laguna	14.3649399	121.0555192	Masterlist 2026	t	2026-07-03 16:53:15.980107	2026-07-03 16:53:15.980107
5541	\N	Amadeo Integrated School	AMADEO INTEGRATED SCHOOL	Grade 7-10 & Grade 11-12	Unknown	Amadeo	Cavite	Crisanto M. delos Reyes Ave. (Bypass Road)	14.1766528	120.9283994	Masterlist 2026	t	2026-07-03 16:53:15.980107	2026-07-03 16:53:15.980107
5542	\N	Amaya School of Home Industries	AMAYA SCHOOL OF HOME INDUSTRIES	Grade 7-10 & Grade 11-12	Unknown	Tanza	Cavite	Soriano Hi-way	14.3696931	120.8255879	Masterlist 2026	t	2026-07-03 16:53:15.980107	2026-07-03 16:53:15.980107
5543	\N	Amontay National High School	AMONTAY NATIONAL HIGH SCHOOL	Grade 7-10 & Grade 11-12	Unknown	Pitogo	Quezon	Amontay	13.8296994	122.101763	Masterlist 2026	t	2026-07-03 16:53:15.980107	2026-07-03 16:53:15.980107
5544	\N	Amore Academy of TMC Cavite Inc.	AMORE ACADEMY OF TMC CAVITE INC	Kinder, Grade 1-6, Grade 7-10 & Grade 11-12	Unknown	Trece Martires City	Cavite	trece - indang road, Luciano	14.27108	120.8728678	Masterlist 2026	t	2026-07-03 16:53:15.980107	2026-07-03 16:53:15.980107
5546	\N	Ananias A. Diamante Integrated National High School (Formerly Dr. Arsenio C. Nicolas NHS - Dominlog Ext.)	ANANIAS A DIAMANTE INTEGRATED NATIONAL HIGH SCHOOL FORMERLY DR ARSENIO C NICOLAS NHS DOMINLOG EXT	Grade 7-10 & Grade 11-12	Unknown	Calauag	Quezon	Barangay Dominlog	13.9699843	122.2455364	Masterlist 2026	t	2026-07-03 16:53:15.980107	2026-07-03 16:53:15.980107
5547	\N	Angeles Luistro Integrated Senior High School	ANGELES LUISTRO INTEGRATED SENIOR HIGH SCHOOL	Grade 7-10 & Grade 11-12	Unknown	San Juan	Batangas	Bulsa, San Juan, Batangas	13.71136	121.400802	Masterlist 2026	t	2026-07-03 16:53:15.980107	2026-07-03 16:53:15.980107
5548	\N	Angelicum Primarosa Montessori School	ANGELICUM PRIMAROSA MONTESSORI SCHOOL	Kinder, Grade 1-6, Grade 7-10 & Grade 11-12	Unknown	Unspecified	Region IV-A	Primarosa Avenue, Villa de Primarosa Subd.	12.879721	121.774017	Masterlist 2026	t	2026-07-03 16:53:15.980107	2026-07-03 16:53:15.980107
5549	\N	ANGELITA V. DEL MUNDO FOUNDATION (AVM FOUNDATION) INC.	ANGELITA V DEL MUNDO FOUNDATION AVM FOUNDATION INC	Grade 11-12	Unknown	Pagsanjan	Laguna	Rear Entrance Vonwelt Bldg., 3521 Rizal St., Pagsanjan, Laguna	14.2730396	121.4549042	Masterlist 2026	t	2026-07-03 16:53:15.980107	2026-07-03 16:53:15.980107
6628	\N	Carmona National National High School	CARMONA NATIONAL NATIONAL HIGH	Unknown	Unknown	Laguna	Laguna	Malaban Binan Laguna	14.3480943	121.0894002	Geocoding API Import	t	2026-07-07 16:15:36.187696	2026-07-07 16:15:36.187696
6629	\N	Eastern Quezon College Inc.	EASTERN QUEZON	Unknown	Unknown	Laguna	Laguna	Bantad, Gumaca, Quezon	13.9233117	122.0976855	Geocoding API Import	t	2026-07-07 16:15:36.187696	2026-07-07 16:15:36.187696
6630	\N	Casiguran Technical Vocational School Sorsogon Bicol	CASIGURAN TECHNICAL VOCATIONAL SORSOGON BICOL	Unknown	Unknown	Laguna	Laguna	Block 10 Lot 5 San Isidro Village Dela Paz BiÃ±an, Laguna	13.5804605	124.2171472	Geocoding API Import	t	2026-07-07 16:15:36.187696	2026-07-07 16:15:36.187696
6631	\N	Carmona National High School	CARMONA NATIONAL HIGH	Unknown	Unknown	Laguna	Laguna	Blk 30 Lot 23 Carmona Estates, Carmona Cavite	14.3145982	121.0544719	Geocoding API Import	t	2026-07-07 16:15:36.187696	2026-07-07 16:15:36.187696
6632	\N	Nicolas L Galvez Senior High School	NICOLAS L GALVEZ SENIOR HIGH	Unknown	Unknown	Laguna	Laguna	Aquino st, Mayondon Los Banos Laguna	14.1844794	121.2394041	Geocoding API Import	t	2026-07-07 16:15:36.187696	2026-07-07 16:15:36.187696
6633	\N	Punta Integrated School	PUNTA INTEGRATED	Unknown	Unknown	Laguna	Laguna	Kay-Anlog Calamba Laguna	14.1766176	121.1178054	Geocoding API Import	t	2026-07-07 16:15:36.187696	2026-07-07 16:15:36.187696
6634	\N	Philippine Merchant Marine School Inc	PHILIPPINE MERCHANT MARINE	Unknown	Unknown	Laguna	Laguna	Barangay Cupang Muntinlupa	14.4375726	121.0035215	Geocoding API Import	t	2026-07-07 16:15:36.187696	2026-07-07 16:15:36.187696
6635	\N	San Francisco De Sales	SAN FRANCISCO DE SALES	Unknown	Unknown	Laguna	Laguna	Platero	14.3240451	121.095131	Geocoding API Import	t	2026-07-07 16:15:36.187696	2026-07-07 16:15:36.187696
6636	\N	San Francisco De Salles	SAN FRANCISCO DE SALLES	Unknown	Unknown	Laguna	Laguna	Landayan San Pedro,Laguna	14.3535782	121.06934	Geocoding API Import	t	2026-07-07 16:15:36.187696	2026-07-07 16:15:36.187696
6637	\N	Central Bicol State University of Agriculture	CENTRAL BICOL STATE AGRICULTURE	Unknown	Unknown	Laguna	Laguna	Ganado Binan Laguna	14.2864673	121.0829526	Geocoding API Import	t	2026-07-07 16:15:36.187696	2026-07-07 16:15:36.187696
6638	\N	Tomas Cabili National High School	TOMAS CABILI NATIONAL HIGH	Unknown	Unknown	Laguna	Laguna	461 jm loyola st brgy. 4 Carmona Cavite	14.3136914	121.0575861	Geocoding API Import	t	2026-07-07 16:15:36.187696	2026-07-07 16:15:36.187696
6639	\N	Muntinlupa National Highschool	MUNTINLUPA NATIONAL HIGHSCHOOL	Unknown	Unknown	Laguna	Laguna	Poblacion Muntinlupa	14.3890102	121.0278504	Geocoding API Import	t	2026-07-07 16:15:36.187696	2026-07-07 16:15:36.187696
6640	\N	Badiang National High School	BADIANG NATIONAL HIGH	Unknown	Unknown	Laguna	Laguna	Tagapo Sta Rosa	14.3213053	121.1051594	Geocoding API Import	t	2026-07-07 16:15:36.187696	2026-07-07 16:15:36.187696
6641	\N	Pola Catholic School Inc.	POLA CATHOLIC	Unknown	Unknown	Laguna	Laguna	Mabini Street Delapaz Binan Laguna	14.3461097	121.0855604	Geocoding API Import	t	2026-07-07 16:15:36.187696	2026-07-07 16:15:36.187696
6642	\N	JZGMSAT	JZGMSAT	Unknown	Unknown	Laguna	Laguna	703 Ilaya street Malaban Binan	14.3463241	121.0896412	Geocoding API Import	t	2026-07-07 16:15:36.187696	2026-07-07 16:15:36.187696
6643	\N	Manga National High School Tagbiliran Bohol	MANGA NATIONAL HIGH TAGBILIRAN BOHOL	Unknown	Unknown	Laguna	Laguna	San Antonio Binan Laguna	14.3332816	121.0936983	Geocoding API Import	t	2026-07-07 16:15:36.187696	2026-07-07 16:15:36.187696
6644	\N	Zamboanga State Collage of MarinevScience and Technology	ZAMBOANGA STATE COLLAGE MARINEVSCIENCE AND TECHNOLOGY	Unknown	Unknown	Laguna	Laguna	San Vicente Binan Laguna	14.3331078	121.0815198	Geocoding API Import	t	2026-07-07 16:15:36.187696	2026-07-07 16:15:36.187696
6645	\N	JZGMNHS	JZGMNHS	Unknown	Unknown	Laguna	Laguna	1509 Wawa St./Malaban Binan Laguna	14.3499702	121.0879751	Geocoding API Import	t	2026-07-07 16:15:36.187696	2026-07-07 16:15:36.187696
6646	\N	BiÃ±an City Senior High School	BIA±AN CITY SENIOR HIGH	Unknown	Unknown	Laguna	Laguna	Langkiwa, BiÃ±an	10.7221075	121.9942293	Geocoding API Import	t	2026-07-07 16:15:36.187696	2026-07-07 16:15:36.187696
6647	\N	Calaug National High School	CALAUG NATIONAL HIGH	Unknown	Unknown	Laguna	Laguna	Balibago Santa Rosa Laguna	14.2935106	121.1066551	Geocoding API Import	t	2026-07-07 16:15:36.187696	2026-07-07 16:15:36.187696
6648	\N	Looc National School of Fisheries	LOOC NATIONAL FISHERIES	Unknown	Unknown	Laguna	Laguna	BRGY. PLATERO BIÃ‘AN. TOPAZ STREET, BIÃ‘AN	10.7221075	121.9942293	Geocoding API Import	t	2026-07-07 16:15:36.187696	2026-07-07 16:15:36.187696
6649	\N	Pili National Highschool	PILI NATIONAL HIGHSCHOOL	Unknown	Unknown	Laguna	Laguna	Baclaran Cabuyao City	14.2440951	121.1667435	Geocoding API Import	t	2026-07-07 16:15:36.187696	2026-07-07 16:15:36.187696
6650	\N	West Palale National High School Quezon Province	WEST PALALE NATIONAL HIGH QUEZON PROVINCE	Unknown	Unknown	Laguna	Laguna	Brgy Dita Santa Rosa Laguna	14.2846543	121.117405	Geocoding API Import	t	2026-07-07 16:15:36.187696	2026-07-07 16:15:36.187696
6651	\N	Eastern Academy of Science and Technology	EASTERN SCIENCE AND TECHNOLOGY	Unknown	Unknown	Laguna	Laguna	Banaybanay Cabuyao	14.2550305	121.1266458	Geocoding API Import	t	2026-07-07 16:15:36.187696	2026-07-07 16:15:36.187696
6652	\N	Vicente D Trinidad National High School Cagayan	VICENTE D TRINIDAD NATIONAL HIGH CAGAYAN	Unknown	Unknown	Laguna	Laguna	Granados GMA	17.7489696	121.7352433	Geocoding API Import	t	2026-07-07 16:15:36.187696	2026-07-07 16:15:36.187696
6653	\N	St. Matthew Academy of Cavite	ST MATTHEW CAVITE	Unknown	Unknown	Laguna	Laguna	Country Homes Binan Laguna	14.45617	120.957331	Geocoding API Import	t	2026-07-07 16:15:36.187696	2026-07-07 16:15:36.187696
6654	\N	Asia source i college-Pasig	ASIA SOURCE I PASIG	Unknown	Unknown	Laguna	Laguna	Camia st Calamba	14.5622247	121.0759449	Geocoding API Import	t	2026-07-07 16:15:36.187696	2026-07-07 16:15:36.187696
6655	\N	San Pedro Technological Institute	SAN PEDRO TECHNOLOGICAL	Unknown	Unknown	Laguna	Laguna	Langgam San Pedro Laguna	14.3257217	121.0120069	Geocoding API Import	t	2026-07-07 16:15:36.187696	2026-07-07 16:15:36.187696
6656	\N	Obando, Montessori INC Bulacan	OBANDO MONTESSORI BULACAN	Unknown	Unknown	Laguna	Laguna	Purok 1,Ganado, BiÃ±an City	14.8869619	120.8666763	Geocoding API Import	t	2026-07-07 16:15:36.187696	2026-07-07 16:15:36.187696
6657	\N	Matuyatuya National High School	MATUYATUYA NATIONAL HIGH	Unknown	Unknown	Laguna	Laguna	San Francisco Halang Binan Laguna	14.332423	121.0550093	Geocoding API Import	t	2026-07-07 16:15:36.187696	2026-07-07 16:15:36.187696
6658	\N	CGC Binan	CGC BINAN	Unknown	Unknown	Laguna	Laguna	Brgy. Malaban Zone 7 Dulong Wawa	14.3499607	121.0879437	Geocoding API Import	t	2026-07-07 16:15:36.187696	2026-07-07 16:15:36.187696
6659	\N	Camarines Sur International School (CSIS), Inc.	CAMARINES SUR INTERNATIONAL CSIS	Unknown	Unknown	Laguna	Laguna	Zone 5, Colacling Camarines	13.7828976	122.8852784	Geocoding API Import	t	2026-07-07 16:15:36.187696	2026-07-07 16:15:36.187696
6660	\N	Ateneo Casa Famiglia	ATENEO CASA FAMIGLIA	Unknown	Unknown	Laguna	Laguna	Front of Jonelta Sto. Nino Binan	14.3281968	121.0822382	Geocoding API Import	t	2026-07-07 16:15:36.187696	2026-07-07 16:15:36.187696
6661	\N	Eulogio Amang Rodriguez Institute of Science Techonology Cavite	EULOGIO AMANG RODRIGUEZ SCIENCE TECHONOLOGY CAVITE	Unknown	Unknown	Laguna	Laguna	Milagrosa Carmona Cavite	14.3049429	121.0442602	Geocoding API Import	t	2026-07-07 16:15:36.187696	2026-07-07 16:15:36.187696
6662	\N	Lyceum of Alabang	LYCEUM ALABANG	Unknown	Unknown	Laguna	Laguna	726 Purok 3, Cuyab San Pedro	14.3730351	121.0474079	Geocoding API Import	t	2026-07-07 16:15:36.187696	2026-07-07 16:15:36.187696
6663	\N	Sinuknipan National High Scool	SINUKNIPAN NATIONAL HIGH SCOOL	Unknown	Unknown	Laguna	Laguna	Tagapo Sta Rosa	14.3213053	121.1051594	Geocoding API Import	t	2026-07-07 16:15:36.187696	2026-07-07 16:15:36.187696
6664	\N	Pres. Manuel A. Roxas NHS	PRES MANUEL A ROXAS NATIONAL HIGH	Unknown	Unknown	Laguna	Laguna	172 Dr. A. Gonzales St, Brgy. San Jose	8.5183207	123.2327813	Geocoding API Import	t	2026-07-07 16:15:36.187696	2026-07-07 16:15:36.187696
6665	\N	General Mariano Alvarez Senior High School	GENERAL MARIANO ALVAREZ SENIOR HIGH	Unknown	Unknown	Laguna	Laguna	Brgy Memije General Mariano Alvarez	14.3051005	121.014899	Geocoding API Import	t	2026-07-07 16:15:36.187696	2026-07-07 16:15:36.187696
6666	\N	Dalubhasaan ng Lungsod ng Lucena	DALUBHASAAN NG LUNGSOD NG LUCENA	Unknown	Unknown	Laguna	Laguna	Gulang gulang, Quezon	13.955677	121.6083421	Geocoding API Import	t	2026-07-07 16:15:36.187696	2026-07-07 16:15:36.187696
6667	\N	Tayabas Western Academy	TAYABAS WESTERN	Unknown	Unknown	Laguna	Laguna	Sitio Centro Pahinga Sur	13.9074337	121.4084731	Geocoding API Import	t	2026-07-07 16:15:36.187696	2026-07-07 16:15:36.187696
6669	\N	Southern Masbate Roosevelt College	SOUTHERN MASBATE ROOSEVELT	Unknown	Unknown	Laguna	Laguna	Concepcion, Plaridel, Quezon	13.9627798	122.0026896	Geocoding API Import	t	2026-07-07 16:15:36.187696	2026-07-07 16:15:36.187696
6670	\N	Polangui Community College	POLANGUI COMMUNITY	Unknown	Unknown	Laguna	Laguna	540, STA. FELOMINA STREET, CENTRO ORIENTAL, POLANGUI, ALBAY	13.2919246	123.4852109	Geocoding API Import	t	2026-07-07 16:15:36.187696	2026-07-07 16:15:36.187696
6671	\N	Pamantasan ng Lungsod ng Cabuyao	PAMANTASAN NG LUNGSOD NG CABUYAO	Unknown	Unknown	Laguna	Laguna	Blk3 Lot 34 Celestine Ville Gulod	14.2549449	121.1637449	Geocoding API Import	t	2026-07-07 16:15:36.187696	2026-07-07 16:15:36.187696
6672	\N	Sorsogon National High School	SORSOGON NATIONAL HIGH	Unknown	Unknown	Laguna	Laguna	1439 New Society st. Malayan Malaban	12.9788771	123.9847711	Geocoding API Import	t	2026-07-07 16:15:36.187696	2026-07-07 16:15:36.187696
6673	\N	San Francisco De Sales San Pedro	SAN FRANCISCO DE SALES SAN PEDRO	Unknown	Unknown	Laguna	Laguna	Barangay Cuyab San Pedro	14.3601567	121.0588718	Geocoding API Import	t	2026-07-07 16:15:36.187696	2026-07-07 16:15:36.187696
6674	\N	Bahao National High School	BAHAO NATIONAL HIGH	Unknown	Unknown	Laguna	Laguna	Dela Paz Binan Laguna	14.3489761	121.080986	Geocoding API Import	t	2026-07-07 16:15:36.187696	2026-07-07 16:15:36.187696
6675	\N	Jacobo Z. Gonzales Memorial School Arts & Trades	JACOBO Z GONZALES MEMORIAL ARTS TRADES	Unknown	Unknown	Laguna	Laguna	Florante st Poblacion Binan Laguna	14.3403307	121.0846948	Geocoding API Import	t	2026-07-07 16:15:36.187696	2026-07-07 16:15:36.187696
6676	\N	University of Saint Anthony	SAINT ANTHONY	Unknown	Unknown	Laguna	Laguna	Don Jose Santa Rosa City	14.2510595	121.0736389	Geocoding API Import	t	2026-07-07 16:15:36.187696	2026-07-07 16:15:36.187696
6677	\N	Angelo Levardo Loyola Senior Highschool	ANGELO LEVARDO LOYOLA SENIOR HIGHSCHOOL	Unknown	Unknown	Laguna	Laguna	Blk 8 Phase 3 Brgy. Milagrosa Carmona Cavite	14.3049429	121.0442602	Geocoding API Import	t	2026-07-07 16:15:36.187696	2026-07-07 16:15:36.187696
6678	\N	South City Homes Academy	SOUTH CITY HOMES	Unknown	Unknown	Laguna	Laguna	Blk75 Lot19-A Tangub St South City Homes BiÃ±an City Sto Tomas	14.0875359	121.1776402	Geocoding API Import	t	2026-07-07 16:15:36.187696	2026-07-07 16:15:36.187696
6679	\N	Villa Jacinta National Vocational High School	VILLA JACINTA NATIONAL VOCATIONAL HIGH	Unknown	Unknown	Laguna	Laguna	Champaca St. San jose Binan	14.3423058	121.0825944	Geocoding API Import	t	2026-07-07 16:15:36.187696	2026-07-07 16:15:36.187696
6680	\N	Christian Grace School of Cavite	CHRISTIAN GRACE CAVITE	Unknown	Unknown	Laguna	Laguna	Gregoria de jesus, General mariano alvarez	14.284803	120.9970402	Geocoding API Import	t	2026-07-07 16:15:36.187696	2026-07-07 16:15:36.187696
6681	\N	PUP Lopez, Quezon	PUP LOPEZ QUEZON	Unknown	Unknown	Laguna	Laguna	Mabini, Gumaca, Quezon	13.8808624	122.2598807	Geocoding API Import	t	2026-07-07 16:15:36.187696	2026-07-07 16:15:36.187696
6682	\N	Pamantasan ng lunsod ng Muntinlupa	PAMANTASAN NG LUNSOD NG MUNTINLUPA	Unknown	Unknown	Laguna	Laguna	J abad Santos St Katarungan Poblacion Muntinlupa	14.3890715	121.025231	Geocoding API Import	t	2026-07-07 16:15:36.187696	2026-07-07 16:15:36.187696
6683	\N	UPHSL	UPHSL	Unknown	Unknown	Laguna	Laguna	Canlalay, BiÃ±an	10.7221075	121.9942293	Geocoding API Import	t	2026-07-07 16:15:36.187696	2026-07-07 16:15:36.187696
6684	\N	Jesus The Exalted Name School	JESUS EXALTED NAME	Unknown	Unknown	Laguna	Laguna	Barangay Tagapo, Sta Rosa Laguna	14.3166351	121.1105544	Geocoding API Import	t	2026-07-07 16:15:36.187696	2026-07-07 16:15:36.187696
6685	\N	Redlink Institute of Science Technology Calamba	REDLINK SCIENCE TECHNOLOGY CALAMBA	Unknown	Unknown	Laguna	Laguna	Phase 1/Kay-Anlog, Calamba	14.164178	121.1223488	Geocoding API Import	t	2026-07-07 16:15:36.187696	2026-07-07 16:15:36.187696
6686	\N	Davao City National High School	DAVAO CITY NATIONAL HIGH	Unknown	Unknown	Laguna	Laguna	Maduya Carmona	7.064745599999999	125.6088427	Geocoding API Import	t	2026-07-07 16:15:36.187696	2026-07-07 16:15:36.187696
6687	\N	San Pedro Relocation Center National Highschool	SAN PEDRO RELOCATION CENTER NATIONAL HIGHSCHOOL	Unknown	Unknown	Laguna	Laguna	Brgy langgam San Pedro,Laguna	14.3432943	121.0499032	Geocoding API Import	t	2026-07-07 16:15:36.187696	2026-07-07 16:15:36.187696
6688	\N	Maryhill College	MARYHILL	Unknown	Unknown	Laguna	Laguna	Sitio Lagpan Barangay Palale, Tayabas Quezon	14.0421398	121.668877	Geocoding API Import	t	2026-07-07 16:15:36.187696	2026-07-07 16:15:36.187696
6689	\N	Mabini National High School	MABINI NATIONAL HIGH	Unknown	Unknown	Laguna	Laguna	Brgy, Simple Sub	17.094475	121.737259	Geocoding API Import	t	2026-07-07 16:15:36.187696	2026-07-07 16:15:36.187696
6690	\N	Pacita Complex National High School	PACITA COMPLEX NATIONAL HIGH	Unknown	Unknown	Laguna	Laguna	San Pedro Laguna	14.3463289	121.0547259	Geocoding API Import	t	2026-07-07 16:15:36.187696	2026-07-07 16:15:36.187696
6691	\N	Adamson University	ADAMSON	Unknown	Unknown	Laguna	Laguna	Otod, San Fernando, Romblon	12.3207781	122.6305715	Geocoding API Import	t	2026-07-07 16:15:36.187696	2026-07-07 16:15:36.187696
6692	\N	Teresita C Young Memorial High School	TERESITA C YOUNG MEMORIAL HIGH	Unknown	Unknown	Laguna	Laguna	Pook Sta Rosa Laguna	14.3009266	121.1123219	Geocoding API Import	t	2026-07-07 16:15:36.187696	2026-07-07 16:15:36.187696
6693	\N	Trimex Colleges - Alumni	TRIMEX COLLEGES ALUMNI	Unknown	Unknown	Laguna	Laguna	Zapote Binan Laguna	14.3194593	121.0822362	Geocoding API Import	t	2026-07-07 16:15:36.187696	2026-07-07 16:15:36.187696
6694	\N	De La Salle University - DasmariÃ±as	DE LA SALLE DASMARIA±AS	Unknown	Unknown	Laguna	Laguna	Malitlit, Sta. Rosa	14.2708106	121.1065919	Geocoding API Import	t	2026-07-07 16:15:36.187696	2026-07-07 16:15:36.187696
6695	\N	Godofredo M. Tan Integrated School of Arts and Trades	GODOFREDO M TAN INTEGRATED ARTS AND TRADES	Unknown	Unknown	Laguna	Laguna	Barangay Bancal Carmona Cavite	14.2902587	121.0163079	Geocoding API Import	t	2026-07-07 16:15:36.187696	2026-07-07 16:15:36.187696
6696	\N	Camarines Sur Polytechnical Colleges	CAMARINES SUR POLYTECHNICAL COLLEGES	Unknown	Unknown	Laguna	Laguna	Minnesota St, Town and Country Southville, Sto Tomas, BiÃ±an City	14.0875359	121.1776402	Geocoding API Import	t	2026-07-07 16:15:36.187696	2026-07-07 16:15:36.187696
6698	\N	Recto Memorial National High School	RECTO MEMORIAL NATIONAL HIGH	Unknown	Unknown	Laguna	Laguna	Purok 2 Bagong Sitio, Brgy. Caingin, Sta Rosa	14.306395	121.1242586	Geocoding API Import	t	2026-07-07 16:15:36.187696	2026-07-07 16:15:36.187696
6699	\N	STI Sta. Rosa	STI STA ROSA	Unknown	Unknown	Laguna	Laguna	Tatlong Hari St Sta. Rosa	14.3219228	121.1123804	Geocoding API Import	t	2026-07-07 16:15:36.187696	2026-07-07 16:15:36.187696
6700	\N	Eva J. Montilla Farm School- Negros Occ	EVA J MONTILLA FARM NEGROS OCC	Unknown	Unknown	Laguna	Laguna	Soro-Soro Binan Laguna	14.326434	121.0607418	Geocoding API Import	t	2026-07-07 16:15:36.187696	2026-07-07 16:15:36.187696
6701	\N	CGC-Cabuyao	CGC CABUYAO	Unknown	Unknown	Laguna	Laguna	Phase 2, brgy pf caingin Sta. Rosa	14.2988569	121.1266458	Geocoding API Import	t	2026-07-07 16:15:36.187696	2026-07-07 16:15:36.187696
6702	\N	Cieverose College Inc.	CIEVEROSE	Unknown	Unknown	Laguna	Laguna	Florinda, Tubigan, BiÃ±an, Laguna	14.3295245	121.0750718	Geocoding API Import	t	2026-07-07 16:15:36.187696	2026-07-07 16:15:36.187696
6703	\N	Marianum College	MARIANUM	Unknown	Unknown	Laguna	Laguna	Phase 2 Block 30 Lot 18 Southville 3 Poblacion Muntinlupa	14.378704	121.0534014	Geocoding API Import	t	2026-07-07 16:15:36.187696	2026-07-07 16:15:36.187696
6704	\N	Asian Development Foundation College	ASIAN DEVELOPMENT FOUNDATION	Unknown	Unknown	Laguna	Laguna	Purok 2 Brgy. 103 Palanog, Leyte	11.2534569	124.9468545	Geocoding API Import	t	2026-07-07 16:15:36.187696	2026-07-07 16:15:36.187696
6705	\N	St.Mary's University	ST MARY'S	Unknown	Unknown	Laguna	Laguna	Pansol,Batangas	13.8796556	121.2426057	Geocoding API Import	t	2026-07-07 16:15:36.187696	2026-07-07 16:15:36.187696
6706	\N	Jacobo Z. Gonzales Memorial School of Arts and Trades	JACOBO Z GONZALES MEMORIAL ARTS AND TRADES	Unknown	Unknown	Laguna	Laguna	Blk 21 lot 13 Ph1 SV5A Brgy. Langkiwa	14.2958856	121.0578756	Geocoding API Import	t	2026-07-07 16:15:36.187696	2026-07-07 16:15:36.187696
6707	\N	Gawad Kalinga High School Camarines Norte	GAWAD KALINGA HIGH CAMARINES NORTE	Unknown	Unknown	Laguna	Laguna	Baranggay Langkiwa Binan Laguna	14.1390265	122.7633036	Geocoding API Import	t	2026-07-07 16:15:36.187696	2026-07-07 16:15:36.187696
6708	\N	Dr Panfilo Castro National High School Candelaria Quezon	DR PANFILO CASTRO NATIONAL HIGH CANDELARIA QUEZON	Unknown	Unknown	Laguna	Laguna	cataran st. Barangay platero Binan Laguna	14.3207862	121.0922653	Geocoding API Import	t	2026-07-07 16:15:36.187696	2026-07-07 16:15:36.187696
6709	\N	St.Ignatius-Cabuyao Laguna	ST IGNATIUS CABUYAO LAGUNA	Unknown	Unknown	Laguna	Laguna	diamond st. Bryg. Sala Cabuyao Laguna	14.27177	121.1269602	Geocoding API Import	t	2026-07-07 16:15:36.187696	2026-07-07 16:15:36.187696
6710	\N	Pamantasan ng Lungsod ng Muntinlupa	PAMANTASAN NG LUNGSOD NG MUNTINLUPA	Unknown	Unknown	Laguna	Laguna	Putatan, Muntinlupa City	14.3890715	121.025231	Geocoding API Import	t	2026-07-07 16:15:36.187696	2026-07-07 16:15:36.187696
6711	\N	National University	NATIONAL	Unknown	Unknown	Laguna	Laguna	Vierneza San Pedro Laguna	14.3514754	121.0682194	Geocoding API Import	t	2026-07-07 16:15:36.187696	2026-07-07 16:15:36.187696
6712	\N	Tunasan National High School	TUNASAN NATIONAL HIGH	Unknown	Unknown	Laguna	Laguna	Camella Woodhills	14.3877191	121.046875	Geocoding API Import	t	2026-07-07 16:15:36.187696	2026-07-07 16:15:36.187696
6713	\N	BNHS Delapaz annex west	BNHS DELAPAZ ANNEX WEST	Unknown	Unknown	Laguna	Laguna	Blk 1 lot 4 phase 2 Sv5a langkiwa binan city	14.2958856	121.0578756	Geocoding API Import	t	2026-07-07 16:15:36.187696	2026-07-07 16:15:36.187696
6714	\N	Balakan National High School	BALAKAN NATIONAL HIGH	Unknown	Unknown	Laguna	Laguna	Brgy. Timuay Danda, Kabasalan	8.0525516	122.7491218	Geocoding API Import	t	2026-07-07 16:15:36.187696	2026-07-07 16:15:36.187696
6715	\N	CGC Balibago	CGC BALIBAGO	Unknown	Unknown	Laguna	Laguna	Brgy Sinalhan ibaba purok 4 Santa Rosa	14.3305725	121.1101477	Geocoding API Import	t	2026-07-07 16:15:36.187696	2026-07-07 16:15:36.187696
6716	\N	PHINMA - Cagayan De Oro College	PHINMA CAGAYAN DE ORO	Unknown	Unknown	Laguna	Laguna	Block 20 lot 23 phase 2 Brgy. Marinig, Cabuyao, Laguna	14.2739279	121.1410709	Geocoding API Import	t	2026-07-07 16:15:36.187696	2026-07-07 16:15:36.187696
6717	\N	Calamba Manpower Development Center	CALAMBA MANPOWER DEVELOPMENT CENTER	Unknown	Unknown	Laguna	Laguna	Brgy. Mayapa, Calamba City	14.2115834	121.1677006	Geocoding API Import	t	2026-07-07 16:15:36.187696	2026-07-07 16:15:36.187696
6718	\N	TESDA -Bicol	TESDA BICOL	Unknown	Unknown	Laguna	Laguna	Grand riverstone village blk 20 lot 3 Dita Sta. Rosa	14.2797876	121.1141027	Geocoding API Import	t	2026-07-07 16:15:36.187696	2026-07-07 16:15:36.187696
6719	\N	Casiguran Technical Vocational School	CASIGURAN TECHNICAL VOCATIONAL	Unknown	Unknown	Laguna	Laguna	Blk 10, Lot 6 Ph1 Southville V, Timbao	14.28972	121.0514264	Geocoding API Import	t	2026-07-07 16:15:36.187696	2026-07-07 16:15:36.187696
6720	\N	Computer Cite Institute	COMPUTER CITE	Unknown	Unknown	Laguna	Laguna	Centenial San Isidro Cabuyao Laguna	14.2390367	121.1358467	Geocoding API Import	t	2026-07-07 16:15:36.187696	2026-07-07 16:15:36.187696
6721	\N	Ifugao University	IFUGAO	Unknown	Unknown	Laguna	Laguna	Canlalay Binan Laguna	14.3417578	121.070773	Geocoding API Import	t	2026-07-07 16:15:36.187696	2026-07-07 16:15:36.187696
6722	\N	Llano High School	LLANO HIGH	Unknown	Unknown	Laguna	Laguna	Macabling Sta Rosa	14.2971682	121.0936983	Geocoding API Import	t	2026-07-07 16:15:36.187696	2026-07-07 16:15:36.187696
6723	\N	Colegio De San Pedro	COLEGIO DE SAN PEDRO	Unknown	Unknown	Laguna	Laguna	Landayan, San Pedro	14.3535782	121.06934	Geocoding API Import	t	2026-07-07 16:15:36.187696	2026-07-07 16:15:36.187696
6724	\N	Philippines Lyceum of Saint Dominicque Makati	PHILIPPINES LYCEUM SAINT DOMINICQUE MAKATI	Unknown	Unknown	Laguna	Laguna	362 j gonzales brgy san vicente Binan Laguna	14.3291926	121.0791156	Geocoding API Import	t	2026-07-07 16:15:36.187696	2026-07-07 16:15:36.187696
6725	\N	Lagro High School	LAGRO HIGH	Unknown	Unknown	Laguna	Laguna	Timbao Binan Laguna	14.28972	121.0514264	Geocoding API Import	t	2026-07-07 16:15:36.187696	2026-07-07 16:15:36.187696
6726	\N	General Mariano Alvarez Technical High School	GENERAL MARIANO ALVAREZ TECHNICAL HIGH	Unknown	Unknown	Laguna	Laguna	Blck 16 Lot 2 Amenti St Brgy Kapitan Kua Cavite	14.2979858	121.0087338	Geocoding API Import	t	2026-07-07 16:15:36.187696	2026-07-07 16:15:36.187696
6727	\N	Araullo University Bitas Cabanatuan City	ARAULLO BITAS CABANATUAN CITY	Unknown	Unknown	Laguna	Laguna	Tartaro San Miguel Zone 7	15.495358	120.975771	Geocoding API Import	t	2026-07-07 16:15:36.187696	2026-07-07 16:15:36.187696
6728	\N	Naujan Municipal High School Oriental Mindoro	NAUJAN MUNICIPAL HIGH ORIENTAL MINDORO	Unknown	Unknown	Laguna	Laguna	Brgy. Poblacion Street Binan Laguna	13.3239763	121.3026291	Geocoding API Import	t	2026-07-07 16:15:36.211627	2026-07-07 16:15:36.211627
6729	\N	San Mateo Municipal College	SAN MATEO MUNICIPAL	Unknown	Unknown	Laguna	Laguna	646 Nawasa East, Guitnanbayan 1, Rizal	14.696815	121.120915	Geocoding API Import	t	2026-07-07 16:15:36.211627	2026-07-07 16:15:36.211627
6730	\N	Colegio de la Purisima	COLEGIO DE LA PURISIMA	Unknown	Unknown	Laguna	Laguna	Purok 2 , Caingin, Sta. Rosa	14.306395	121.1242586	Geocoding API Import	t	2026-07-07 16:15:36.211627	2026-07-07 16:15:36.211627
6731	\N	Moscoso Rios Natinal High School	MOSCOSO RIOS NATINAL HIGH	Unknown	Unknown	Laguna	Laguna	Adelia 3, Phase 3, Sto Tomas, BiÃ±an	14.0875359	121.1776402	Geocoding API Import	t	2026-07-07 16:15:36.211627	2026-07-07 16:15:36.211627
6732	\N	Yapang National HighSchool	YAPANG NATIONAL HIGHSCHOOL	Unknown	Unknown	Laguna	Laguna	Balibago, Sta Rosa, Laguna	14.2935106	121.1066551	Geocoding API Import	t	2026-07-07 16:15:36.211627	2026-07-07 16:15:36.211627
6733	\N	San Agustin National High School	SAN AGUSTIN NATIONAL HIGH	Unknown	Unknown	Laguna	Laguna	Dulong Kanluran, San Isidro	15.3001376	120.8747453	Geocoding API Import	t	2026-07-07 16:15:36.211627	2026-07-07 16:15:36.211627
6734	\N	Libungan North Cotabato	LIBUNGAN NORTH COTABATO	Unknown	Unknown	Laguna	Laguna	Langkiwa, BiÃ±an	7.2434648	124.516642	Geocoding API Import	t	2026-07-07 16:15:36.211627	2026-07-07 16:15:36.211627
6735	\N	Saint Joseph College of Baggao	SAINT JOSEPH BAGGAO	Unknown	Unknown	Laguna	Laguna	Tubigan Binan	14.3295245	121.0750718	Geocoding API Import	t	2026-07-07 16:15:36.211627	2026-07-07 16:15:36.211627
6736	\N	BCSH - Timbao Campus	BCSH TIMBAO	Unknown	Unknown	Laguna	Laguna	Timbao Binan Laguna	14.28972	121.0514264	Geocoding API Import	t	2026-07-07 16:15:36.211627	2026-07-07 16:15:36.211627
6737	\N	Saint Ignatius Santa Rosa	SAINT IGNATIUS SANTA ROSA	Unknown	Unknown	Laguna	Laguna	Amira Townhomes Barangay Sinalhan Purok 5	14.3305725	121.1101477	Geocoding API Import	t	2026-07-07 16:15:36.211627	2026-07-07 16:15:36.211627
6738	\N	Boot National High School	BOOT NATIONAL HIGH	Unknown	Unknown	Laguna	Laguna	Brgy. Boot, Tanauan City, Batangas	14.0491844	121.0782576	Geocoding API Import	t	2026-07-07 16:15:36.211627	2026-07-07 16:15:36.211627
6739	\N	Pinamalayan Maritine foundation Technological College Institue	PINAMALAYAN MARITINE FOUNDATION TECHNOLOGICAL INSTITUE	Unknown	Unknown	Laguna	Laguna	Lantic Carmona	14.2910617	121.0426844	Geocoding API Import	t	2026-07-07 16:15:36.211627	2026-07-07 16:15:36.211627
6740	\N	Lope De Vega National High School	LOPE DE VEGA NATIONAL HIGH	Unknown	Unknown	Laguna	Laguna	Atlanta st. Sto. Tomas	14.0875359	121.1776402	Geocoding API Import	t	2026-07-07 16:15:36.211627	2026-07-07 16:15:36.211627
6741	\N	Rafael Lentejas Memorial School of Fisheries	RAFAEL LENTEJAS MEMORIAL FISHERIES	Unknown	Unknown	Laguna	Laguna	Atlanta St. Sto. Tomas	14.0875359	121.1776402	Geocoding API Import	t	2026-07-07 16:15:36.211627	2026-07-07 16:15:36.211627
6742	\N	Imus Computer College	IMUS COMPUTER	Unknown	Unknown	Laguna	Laguna	Block 6 Lot 7 Southvill 5A Baranggay Timbao	14.28972	121.0514264	Geocoding API Import	t	2026-07-07 16:15:36.211627	2026-07-07 16:15:36.211627
6743	\N	Occidental Mindoro State College	OCCIDENTAL MINDORO STATE	Unknown	Unknown	Laguna	Laguna	Brgy Pagasa Mamburao	13.2322842	120.588974	Geocoding API Import	t	2026-07-07 16:15:36.211627	2026-07-07 16:15:36.211627
6744	\N	Sta. Catalina College Inc BiÃ±an	STA CATALINA BIA±AN	Unknown	Unknown	Laguna	Laguna	BiÃ±an, City	10.7221075	121.9942293	Geocoding API Import	t	2026-07-07 16:15:36.211627	2026-07-07 16:15:36.211627
6745	\N	Muntinlupa National High School	MUNTINLUPA NATIONAL HIGH	Unknown	Unknown	Laguna	Laguna	San Guillermo St Purok 4 Bayanan	14.409331	121.049961	Geocoding API Import	t	2026-07-07 16:15:36.211627	2026-07-07 16:15:36.211627
6746	\N	Colacling National High School	COLACLING NATIONAL HIGH	Unknown	Unknown	Laguna	Laguna	Wellmanville Blood Stone Blk 11 Lot 11	13.7758587	122.8693101	Geocoding API Import	t	2026-07-07 16:15:36.211627	2026-07-07 16:15:36.211627
6747	\N	Oriental Mindoro National High School	ORIENTAL MINDORO NATIONAL HIGH	Unknown	Unknown	Laguna	Laguna	Southville IV, Brgy. Caingin Sta. Rosa Laguna	14.2935106	121.1066551	Geocoding API Import	t	2026-07-07 16:15:36.211627	2026-07-07 16:15:36.211627
6748	\N	Earist Cavite Campus	EARIST CAVITE	Unknown	Unknown	Laguna	Laguna	Humility st. Carmona Cavite	14.30878	121.0396481	Geocoding API Import	t	2026-07-07 16:15:36.211627	2026-07-07 16:15:36.211627
6749	\N	Colegio De Naujan	COLEGIO DE NAUJAN	Unknown	Unknown	Laguna	Laguna	Maria Jesusa Pook Sta. Rosa Laguna	14.3009266	121.1123219	Geocoding API Import	t	2026-07-07 16:15:36.211627	2026-07-07 16:15:36.211627
6750	\N	BCSHS-San Antonio	BCSHS SAN ANTONIO	Unknown	Unknown	Laguna	Laguna	1281 Ilaya Malaban	14.3396048	121.0933629	Geocoding API Import	t	2026-07-07 16:15:36.211627	2026-07-07 16:15:36.211627
6751	\N	Lumban National Highschool	LUMBAN NATIONAL HIGHSCHOOL	Unknown	Unknown	Laguna	Laguna	Platero Sta. Rosa	14.2935106	121.1066551	Geocoding API Import	t	2026-07-07 16:15:36.211627	2026-07-07 16:15:36.211627
6752	\N	Jose Diva Avelino Jr. National High School	JOSE DIVA AVELINO JR NATIONAL HIGH	Unknown	Unknown	Laguna	Laguna	Brgy. Langkiwa Binan Laguna	14.3489761	121.080986	Geocoding API Import	t	2026-07-07 16:15:36.211627	2026-07-07 16:15:36.211627
6753	\N	Bonifacio D. Borebor Senior High School	BONIFACIO D BOREBOR SENIOR HIGH	Unknown	Unknown	Laguna	Laguna	0156 Purok 6 Courtyard Unit 8 Brgy Soro-Soro Binan Laguna	14.329297	121.0685181	Geocoding API Import	t	2026-07-07 16:15:36.211627	2026-07-07 16:15:36.211627
6754	\N	Upper villages christian academy	UPPER VILLAGES CHRISTIAN	Unknown	Unknown	Laguna	Laguna	B6 L8 Vienna St Binan Laguna	14.3332142	121.0290518	Geocoding API Import	t	2026-07-07 16:15:36.211627	2026-07-07 16:15:36.211627
6757	\N	Tinik National Highschool -Mindoro	TINIK NATIONAL HIGHSCHOOL MINDORO	Unknown	Unknown	Laguna	Laguna	Blk 8, Lot 34, Celina Mansion - Loma Binan Laguna	14.2319593	121.0892145	Geocoding API Import	t	2026-07-07 16:15:36.211627	2026-07-07 16:15:36.211627
6758	\N	Barcelona Comprehensive High School	BARCELONA COMPREHENSIVE HIGH	Unknown	Unknown	Laguna	Laguna	Bacal Carmona Cavite	14.3134999	121.0571183	Geocoding API Import	t	2026-07-07 16:15:36.211627	2026-07-07 16:15:36.211627
6759	\N	Jacobo Z. Gonzales Memorial National High School	JACOBO Z GONZALES MEMORIAL NATIONAL HIGH	Unknown	Unknown	Laguna	Laguna	Labas Sta Rosa Laguna	14.3364874	121.0893335	Geocoding API Import	t	2026-07-07 16:15:36.211627	2026-07-07 16:15:36.211627
6760	\N	Camp Vicente Lim National High School	CAMP VICENTE LIM NATIONAL HIGH	Unknown	Unknown	Laguna	Laguna	80 Rosal St. St. Christopher 2 Mayapa Calamba City	14.2108981	121.1269908	Geocoding API Import	t	2026-07-07 16:15:36.211627	2026-07-07 16:15:36.211627
6761	\N	Lyceum of St Dominic Inc Camarines Norte	LYCEUM ST DOMINIC CAMARINES NORTE	Unknown	Unknown	Laguna	Laguna	Brgy balibago Santa rosa	14.2948448	121.1008616	Geocoding API Import	t	2026-07-07 16:15:36.211627	2026-07-07 16:15:36.211627
6762	\N	CVSU-Indang	CVSU INDANG	Unknown	Unknown	Laguna	Laguna	Brgy. Yakal Bulihan, Silang	14.2695681	120.9995482	Geocoding API Import	t	2026-07-07 16:15:36.211627	2026-07-07 16:15:36.211627
6763	\N	Granja kalinawan national high school	GRANJA KALINAWAN NATIONAL HIGH	Unknown	Unknown	Laguna	Laguna	Brgy Malamig Binan Laguna	14.2734595	121.0471466	Geocoding API Import	t	2026-07-07 16:15:36.211627	2026-07-07 16:15:36.211627
6764	\N	Maribeles Bataan	MARIBELES BATAAN	Unknown	Unknown	Laguna	Laguna	Southwoods Binan	14.4354033	120.4900339	Geocoding API Import	t	2026-07-07 16:15:36.211627	2026-07-07 16:15:36.211627
6765	\N	Mariveles National High School Camaya Bataan	MARIVELES NATIONAL HIGH CAMAYA BATAAN	Unknown	Unknown	Laguna	Laguna	San Francisco Binan Laguna	14.332423	121.0550093	Geocoding API Import	t	2026-07-07 16:15:36.211627	2026-07-07 16:15:36.211627
6766	\N	Colegio de San Juan de Dios Incorporated	COLEGIO DE SAN JUAN DE DIOS	Unknown	Unknown	Laguna	Laguna	Lot 19 Blk 1 Mercado Compound, Brgy. Platero	14.6406696	121.1065122	Geocoding API Import	t	2026-07-07 16:15:36.211627	2026-07-07 16:15:36.211627
6767	\N	Conception National High School Quezon Province	CONCEPTION NATIONAL HIGH QUEZON PROVINCE	Unknown	Unknown	Laguna	Laguna	Block 50 Lot 17, Timbao Binan Laguna	14.28972	121.0514264	Geocoding API Import	t	2026-07-07 16:15:36.211627	2026-07-07 16:15:36.211627
6768	\N	Wellspring of Grace School, Inc.	WELLSPRING GRACE	Unknown	Unknown	Laguna	Laguna	Brgy Laram, San Pedro laguna	14.3314447	121.0200442	Geocoding API Import	t	2026-07-07 16:15:36.211627	2026-07-07 16:15:36.211627
6770	\N	Mariners' Polythecnic Colleges Foundation of Canaman	MARINERS' POLYTHECNIC COLLEGES FOUNDATION CANAMAN	Unknown	Unknown	Laguna	Laguna	San Francisco Binan Laguna	14.332423	121.0550093	Geocoding API Import	t	2026-07-07 16:15:36.211627	2026-07-07 16:15:36.211627
6771	\N	Calabanga National Science High School	CALABANGA NATIONAL SCIENCE HIGH	Unknown	Unknown	Laguna	Laguna	San francisco halang Binan Laguna	13.7076773	123.2144409	Geocoding API Import	t	2026-07-07 16:15:36.211627	2026-07-07 16:15:36.211627
6772	\N	Pantao national high school	PANTAO NATIONAL HIGH	Unknown	Unknown	Laguna	Laguna	Bancal Carmona Cavite	14.2902587	121.0163079	Geocoding API Import	t	2026-07-07 16:15:36.211627	2026-07-07 16:15:36.211627
6773	\N	St.Ignatius Academy	ST IGNATIUS	Unknown	Unknown	Laguna	Laguna	Muntinlupa Metro Politan	14.3945297	121.0448342	Geocoding API Import	t	2026-07-07 16:15:36.211627	2026-07-07 16:15:36.211627
6774	\N	Jacinto Montilla Memorial National High School	JACINTO MONTILLA MEMORIAL NATIONAL HIGH	Unknown	Unknown	Laguna	Laguna	Brgy Sinalhan Sta Rosa Laguna	14.3305725	121.1101477	Geocoding API Import	t	2026-07-07 16:15:36.211627	2026-07-07 16:15:36.211627
6775	\N	St. Igantius, Sta Rosa Branches	ST IGANTIUS STA ROSA BRANCHES	Unknown	Unknown	Laguna	Laguna	South ville 4, Ph 3, Blk 19, Lot 20 Pook Sta. Rosa Laguna	14.2769351	121.1343366	Geocoding API Import	t	2026-07-07 16:15:36.211627	2026-07-07 16:15:36.211627
6776	\N	Saint Ignatius Technical Institue Of Business of Arts	SAINT IGNATIUS TECHNICAL INSTITUE BUSINESS ARTS	Unknown	Unknown	Laguna	Laguna	Belizario San jose Binan Laguna	14.3423058	121.0825944	Geocoding API Import	t	2026-07-07 16:15:36.211627	2026-07-07 16:15:36.211627
6777	\N	Holy Rosary of Las Pinas City	HOLY ROSARY LAS PINAS CITY	Unknown	Unknown	Laguna	Laguna	3714 Sta. Catalina St. Delapaz Binan Laguna	14.3435315	121.0852075	Geocoding API Import	t	2026-07-07 16:15:36.211627	2026-07-07 16:15:36.211627
6778	\N	Puerto Galera National High School	PUERTO GALERA NATIONAL HIGH	Unknown	Unknown	Laguna	Laguna	Pooc Sta Rosa	13.4996502	120.9546328	Geocoding API Import	t	2026-07-07 16:15:36.211627	2026-07-07 16:15:36.211627
6780	\N	CGC Sta Rosa	CGC STA ROSA	Unknown	Unknown	Laguna	Laguna	Blk 7 lot 6 ph 1 mainroad marco polo place tagapo Santa Rosa	14.325559	121.1048451	Geocoding API Import	t	2026-07-07 16:15:36.211627	2026-07-07 16:15:36.211627
6781	\N	Far Eastern University	FAR EASTERN	Unknown	Unknown	Laguna	Laguna	Block 10 Lot 4 Phase 1 Brgy Langkaan Villa Elena Subdivision Dasmarinas	14.313312	120.9647427	Geocoding API Import	t	2026-07-07 16:15:36.211627	2026-07-07 16:15:36.211627
6782	\N	Tayabas Westeren Academy	TAYABAS WESTEREN	Unknown	Unknown	Laguna	Laguna	Blk 9 Lot 32 Phase 1 Celina Plains Subdivision	14.3054992	121.113239	Geocoding API Import	t	2026-07-07 16:15:36.211627	2026-07-07 16:15:36.211627
6783	\N	Lake Shore Colleges	LAKE SHORE COLLEGES	Unknown	Unknown	Laguna	Laguna	886 Casas Street Brgy. San Antonio	14.9481639	120.089654	Geocoding API Import	t	2026-07-07 16:15:36.211627	2026-07-07 16:15:36.211627
6784	\N	Culaba National Vocational School	CULABA NATIONAL VOCATIONAL	Unknown	Unknown	Laguna	Laguna	Macabling Sta. Rosa Laguna	14.2971682	121.0936983	Geocoding API Import	t	2026-07-07 16:15:36.211627	2026-07-07 16:15:36.211627
6785	\N	Angelo Levardo Senior Highschool	ANGELO LEVARDO SENIOR HIGHSCHOOL	Unknown	Unknown	Laguna	Laguna	Carmona Cavite	14.3106272	121.0525897	Geocoding API Import	t	2026-07-07 16:15:36.211627	2026-07-07 16:15:36.211627
6786	\N	St. Ignatuis Academy-Muntinlupa	ST IGNATUIS MUNTINLUPA	Unknown	Unknown	Laguna	Laguna	Alabang Muntinlupa	14.4181972	121.0421102	Geocoding API Import	t	2026-07-07 16:15:36.211627	2026-07-07 16:15:36.211627
6787	\N	Grace Mission College	GRACE MISSION	Unknown	Unknown	Laguna	Laguna	Canlalay Binan	14.3417578	121.070773	Geocoding API Import	t	2026-07-07 16:15:36.211627	2026-07-07 16:15:36.211627
6789	\N	Jacobo -TESDA	JACOBO TESDA	Unknown	Unknown	Laguna	Laguna	San Vicente Binan Laguna	14.3331078	121.0815198	Geocoding API Import	t	2026-07-07 16:15:36.211627	2026-07-07 16:15:36.211627
6790	\N	Godofredo Reyes Sr. National High Scholl	GODOFREDO REYES SR NATIONAL HIGH SCHOLL	Unknown	Unknown	Laguna	Laguna	Brgy. Calabuso Binan Laguna	14.3056352	121.070773	Geocoding API Import	t	2026-07-07 16:15:36.211627	2026-07-07 16:15:36.211627
6791	\N	Godofredo Reyes Sr. National Highschool	GODOFREDO REYES SR NATIONAL HIGHSCHOOL	Unknown	Unknown	Laguna	Laguna	Kaong,Kanluran Cavite	13.8827516	122.6786008	Geocoding API Import	t	2026-07-07 16:15:36.211627	2026-07-07 16:15:36.211627
6792	\N	St. Ignatuis Academy-Binan	ST IGNATUIS BINAN	Unknown	Unknown	Laguna	Laguna	Goldfield st. Brgy Maharlika San Pedro,Laguna	14.3470643	121.0454831	Geocoding API Import	t	2026-07-07 16:15:36.211627	2026-07-07 16:15:36.211627
6793	\N	Carmel National High School Bicol	CARMEL NATIONAL HIGH BICOL	Unknown	Unknown	Laguna	Laguna	Waling waling st. Ph 2 GV 3, Malusak, Sta Rosa	14.310786	121.1171548	Geocoding API Import	t	2026-07-07 16:15:36.211627	2026-07-07 16:15:36.211627
6794	\N	Philippine Christian University	PHILIPPINE CHRISTIAN	Unknown	Unknown	Laguna	Laguna	Bukluran 4 blk 1 lot 5, Bulihan, Silang	14.2793151	120.9951066	Geocoding API Import	t	2026-07-07 16:15:36.211627	2026-07-07 16:15:36.211627
6795	\N	University of the Visayas	VISAYAS	Unknown	Unknown	Laguna	Laguna	Jubay, Liloan	10.4162865	123.9917222	Geocoding API Import	t	2026-07-07 16:15:36.211627	2026-07-07 16:15:36.211627
6796	\N	Northeastern Cebu Colleges	NORTHEASTERN CEBU COLLEGES	Unknown	Unknown	Laguna	Laguna	Centra, Guinsay	10.5412294	124.0167971	Geocoding API Import	t	2026-07-07 16:15:36.211627	2026-07-07 16:15:36.211627
6797	\N	University of Science Technology of Southern Philippines Cagayan De Oro	SCIENCE TECHNOLOGY SOUTHERN PHILIPPINES CAGAYAN DE ORO	Unknown	Unknown	Laguna	Laguna	Calamba Laguna	14.1948762	121.1597364	Geocoding API Import	t	2026-07-07 16:15:36.211627	2026-07-07 16:15:36.211627
6798	\N	Pinamalayan Maritime Foundation and Technological College Inc.,	PINAMALAYAN MARITIME FOUNDATION AND TECHNOLOGICAL	Unknown	Unknown	Laguna	Laguna	Calamba, Laguna	14.1948762	121.1597364	Geocoding API Import	t	2026-07-07 16:15:36.211627	2026-07-07 16:15:36.211627
6799	\N	Upper Bicutan National High Sschool	UPPER BICUTAN NATIONAL HIGH SSCHOOL	Unknown	Unknown	Laguna	Laguna	Central bicutan Taguig	14.4905091	121.0540848	Geocoding API Import	t	2026-07-07 16:15:36.211627	2026-07-07 16:15:36.211627
6800	\N	Banate National High School	BANATE NATIONAL HIGH	Unknown	Unknown	Laguna	Laguna	San Jose Binan Laguna	14.3423058	121.0825944	Geocoding API Import	t	2026-07-07 16:15:36.211627	2026-07-07 16:15:36.211627
6801	\N	Dumaguete City High School	DUMAGUETE CITY HIGH	Unknown	Unknown	Laguna	Laguna	Brgy. Pulong Santa Cruz Sta. Rosa Laguna	14.2730308	121.0822362	Geocoding API Import	t	2026-07-07 16:15:36.211627	2026-07-07 16:15:36.211627
6802	\N	Lakeshore Colleges	LAKESHORE COLLEGES	Unknown	Unknown	Laguna	Laguna	Barangay Malaban Binan Laguna	14.3388122	121.0800761	Geocoding API Import	t	2026-07-07 16:15:36.211627	2026-07-07 16:15:36.211627
6803	\N	BiÃ±an Integrated National Highschool	BIA±AN INTEGRATED NATIONAL HIGHSCHOOL	Unknown	Unknown	Laguna	Laguna	Dela Paz Binan Laguna	14.3489761	121.080986	Geocoding API Import	t	2026-07-07 16:15:36.211627	2026-07-07 16:15:36.211627
6804	\N	Cavite State University - Carmona	CAVITE STATE CARMONA	Unknown	Unknown	Laguna	Laguna	Sto. Tomas	14.3169729	121.0646989	Geocoding API Import	t	2026-07-07 16:15:36.211627	2026-07-07 16:15:36.211627
6805	\N	Philtech Tanay Senior High School	PHILTECH TANAY SENIOR HIGH	Unknown	Unknown	Laguna	Laguna	232, Loma Binan Laguna	14.2839153	121.06934	Geocoding API Import	t	2026-07-07 16:15:36.211627	2026-07-07 16:15:36.211627
6806	\N	Binan Intgerated National Hiigh School	BINAN INTGERATED NATIONAL HIIGH	Unknown	Unknown	Laguna	Laguna	Co!umbia st Brgy. Sto. Tomas	14.3360039	121.0808265	Geocoding API Import	t	2026-07-07 16:15:36.211627	2026-07-07 16:15:36.211627
6807	\N	Redlink Institute Science And Technolgy	REDLINK SCIENCE AND TECHNOLGY	Unknown	Unknown	Laguna	Laguna	Diezlmo Cabuyao Laguna	14.2743276	121.1196096	Geocoding API Import	t	2026-07-07 16:15:36.211627	2026-07-07 16:15:36.211627
6808	\N	Computer Site Institute Inc.	COMPUTER SITE	Unknown	Unknown	Laguna	Laguna	San Pedro Laguna	14.3653546	121.0564069	Geocoding API Import	t	2026-07-07 16:15:36.211627	2026-07-07 16:15:36.211627
6810	\N	Mindoro State University	MINDORO STATE	Unknown	Unknown	Laguna	Laguna	San Francisco Binan Laguna	14.3425951	121.0670825	Geocoding API Import	t	2026-07-07 16:15:36.211627	2026-07-07 16:15:36.211627
6811	\N	FARMARS FIELD SCHOOL	FARMARS FIELD	Unknown	Unknown	Laguna	Laguna	PUROK 3 SAMPAGUITA STREET BRGY,INCHICAN	14.2368641	121.0378102	Geocoding API Import	t	2026-07-07 16:15:36.211627	2026-07-07 16:15:36.211627
6812	\N	Benigno S. Aquino National High School	BENIGNO S AQUINO NATIONAL HIGH	Unknown	Unknown	Laguna	Laguna	Tagapo Santa Rosa Lagauna	14.3213053	121.1051594	Geocoding API Import	t	2026-07-07 16:15:36.211627	2026-07-07 16:15:36.211627
6814	\N	Pulang Daga National Highschool	PULANG DAGA NATIONAL HIGHSCHOOL	Unknown	Unknown	Laguna	Laguna	Sta. Rosa Laguna	14.2935106	121.1066551	Geocoding API Import	t	2026-07-07 16:15:36.211627	2026-07-07 16:15:36.211627
6815	\N	Immaculate Heart of Mary School of San Pedro, Laguna Inc.	IMMACULATE HEART MARY SAN PEDRO LAGUNA	Unknown	Unknown	Laguna	Laguna	San Francisco Binan Laguna	14.332423	121.0550093	Geocoding API Import	t	2026-07-07 16:15:36.211627	2026-07-07 16:15:36.211627
6817	\N	Mater Ecclesiae School	MATER ECCLESIAE	Unknown	Unknown	Laguna	Laguna	Blk 9 Lot 11 Avocado St Southplains 1 Barangay Sto Tomas	14.1876296	121.5163029	Geocoding API Import	t	2026-07-07 16:15:36.211627	2026-07-07 16:15:36.211627
6818	\N	DoÃ±a Francisca Alvarez Rejano Iintegrated-Quezon	DOA±A FRANCISCA ALVAREZ REJANO IINTEGRATED QUEZON	Unknown	Unknown	Laguna	Laguna	Butong, Purok,5 cabuyao laguna	14.2039986	121.0944181	Geocoding API Import	t	2026-07-07 16:15:36.211627	2026-07-07 16:15:36.211627
6819	\N	Mababangbaybay National High School	MABABANGBAYBAY NATIONAL HIGH	Unknown	Unknown	Laguna	Laguna	Blk 9 Lot 24, Phase 1 Southville Langkiwa	14.2958856	121.0578756	Geocoding API Import	t	2026-07-07 16:15:36.211627	2026-07-07 16:15:36.211627
6820	\N	Florentino Galang Sr. National High School	FLORENTINO GALANG SR NATIONAL HIGH	Unknown	Unknown	Laguna	Laguna	Mamplasan Binan Laguna	14.294403	121.0806875	Geocoding API Import	t	2026-07-07 16:15:36.211627	2026-07-07 16:15:36.211627
6821	\N	Mapua Mallayan Colleges	MAPUA MALLAYAN COLLEGES	Unknown	Unknown	Laguna	Laguna	Ph4 Blk9 Lot7 Southville 4 Santa Rosa	14.3167102	121.1015422	Geocoding API Import	t	2026-07-07 16:15:36.211627	2026-07-07 16:15:36.211627
6822	\N	Polytechnic College of La Union	POLYTECHNIC LA UNION	Unknown	Unknown	Laguna	Laguna	B14 L21 Nissan Drive Noel Homes Brgy. San Francisco	16.6158906	120.3209373	Geocoding API Import	t	2026-07-07 16:15:36.211627	2026-07-07 16:15:36.211627
6823	\N	Alabat National High School Quezon Province	ALABAT NATIONAL HIGH QUEZON PROVINCE	Unknown	Unknown	Laguna	Laguna	Malaban Binan Laguna	14.3480943	121.0894002	Geocoding API Import	t	2026-07-07 16:15:36.211627	2026-07-07 16:15:36.211627
6824	\N	Lumil National High School	LUMIL NATIONAL HIGH	Unknown	Unknown	Laguna	Laguna	Pooc 1, Silang	14.177339	121.0056563	Geocoding API Import	t	2026-07-07 16:15:36.211627	2026-07-07 16:15:36.211627
6825	\N	Labas Senior Highschool	LABAS SENIOR HIGHSCHOOL	Unknown	Unknown	Laguna	Laguna	Amira Townhomes, Block 3 Lot 9, Barangay Sinalhan Sta. Rosa Laguna	14.3214866	121.1188281	Geocoding API Import	t	2026-07-07 16:15:36.211627	2026-07-07 16:15:36.211627
6827	\N	Arellano University Juan Sumulong	ARELLANO JUAN SUMULONG	Unknown	Unknown	Laguna	Laguna	Brgy. Santo Tomas	14.1876296	121.5163029	Geocoding API Import	t	2026-07-07 16:15:36.211627	2026-07-07 16:15:36.211627
6828	\N	BCSHS-West Campus	BCSHS WEST	Unknown	Unknown	Laguna	Laguna	sto. niÃ±o biÃ±an city	10.7221075	121.9942293	Geocoding API Import	t	2026-07-07 16:15:36.223327	2026-07-07 16:15:36.223327
6829	\N	Bigaan National High School	BIGAAN NATIONAL HIGH	Unknown	Unknown	Laguna	Laguna	Caingin	13.8888365	121.0714983	Geocoding API Import	t	2026-07-07 16:15:36.223327	2026-07-07 16:15:36.223327
6830	\N	BINHS	BINHS	Unknown	Unknown	Laguna	Laguna	Remedios St. Brgy. San Antonio Binan Laguna	14.32802	121.091703	Geocoding API Import	t	2026-07-07 16:15:36.223327	2026-07-07 16:15:36.223327
6831	\N	Lake Shore College	LAKE SHORE	Unknown	Unknown	Laguna	Laguna	Abraham St. Barangay San Francisco Binan Laguna	14.3283902	121.0467728	Geocoding API Import	t	2026-07-07 16:15:36.223327	2026-07-07 16:15:36.223327
6832	\N	LCC Silvercrest Senior High School	LCC SILVERCREST SENIOR HIGH	Unknown	Unknown	Laguna	Laguna	Denver street, Barangay Batino, Calamba	14.211543	121.1420127	Geocoding API Import	t	2026-07-07 16:15:36.223327	2026-07-07 16:15:36.223327
6833	\N	Phinma Union College	PHINMA UNION	Unknown	Unknown	Laguna	Laguna	Santo Angel Central	14.2846291	121.4063298	Geocoding API Import	t	2026-07-07 16:15:36.223327	2026-07-07 16:15:36.223327
6834	\N	Pedro Guevara Memorial National High School	PEDRO GUEVARA MEMORIAL NATIONAL HIGH	Unknown	Unknown	Laguna	Laguna	Sto. Angel Sur	14.278182	121.416275	Geocoding API Import	t	2026-07-07 16:15:36.223327	2026-07-07 16:15:36.223327
6835	\N	Santa Rosa Educational Institution	SANTA ROSA EDUCATIONAL INSTITUTION	Unknown	Unknown	Laguna	Laguna	Caingin, Sta. Rosa	14.318729	121.1127289	Geocoding API Import	t	2026-07-07 16:15:36.223327	2026-07-07 16:15:36.223327
6836	\N	OLFU Santa Rosa	OLFU SANTA ROSA	Unknown	Unknown	Laguna	Laguna	298 Purok 5 Sta Rosa Laguna	14.2957228	121.1040463	Geocoding API Import	t	2026-07-07 16:15:36.223327	2026-07-07 16:15:36.223327
6837	\N	Westbridge Institutional Technology Inc.	WESTBRIDGE INSTITUTIONAL TECHNOLOGY	Unknown	Unknown	Laguna	Laguna	blk 1 lot 15 Brgy Pooc Ma Jesusa Subd Santa Rosa	14.3009351	121.1098541	Geocoding API Import	t	2026-07-07 16:15:36.223327	2026-07-07 16:15:36.223327
6838	\N	AVM Foundational Inc.	AVM FOUNDATIONAL	Unknown	Unknown	Laguna	Laguna	Brgy. Looc Calamba Laguna	14.226857	121.179188	Geocoding API Import	t	2026-07-07 16:15:36.223327	2026-07-07 16:15:36.223327
6839	\N	Iloilo City National High School	ILOILO CITY NATIONAL HIGH	Unknown	Unknown	Laguna	Laguna	Langkiwa, BiÃ±an	10.7301854	122.5591148	Geocoding API Import	t	2026-07-07 16:15:36.223327	2026-07-07 16:15:36.223327
6840	\N	Educational System Technology Institute	EDUCATIONAL SYSTEM TECHNOLOGY	Unknown	Unknown	Laguna	Laguna	Relocation 5 Block 11 Lot 11 Pulong Sta Cruz Santa Rosa City Laguna	14.2730308	121.0822362	Geocoding API Import	t	2026-07-07 16:15:36.223327	2026-07-07 16:15:36.223327
6841	\N	Binan National High School	BINAN NATIONAL HIGH	Unknown	Unknown	Laguna	Laguna	4966 San Isidro Delapaz	14.3489761	121.080986	Geocoding API Import	t	2026-07-07 16:15:36.223327	2026-07-07 16:15:36.223327
6842	\N	St. Ignatius Technical Institute Academy	ST IGNATIUS TECHNICAL	Unknown	Unknown	Laguna	Laguna	Tagapo Sta. Rosa Laguna	14.3213053	121.1051594	Geocoding API Import	t	2026-07-07 16:15:36.223327	2026-07-07 16:15:36.223327
6843	\N	Perpetual Binan	PERPETUAL BINAN	Unknown	Unknown	Laguna	Laguna	17A Pedro Escueta Casile Binan Laguna	14.3445532	121.087252	Geocoding API Import	t	2026-07-07 16:15:36.223327	2026-07-07 16:15:36.223327
6844	\N	University of Perpetual Help Sytem	PERPETUAL HELP SYTEM	Unknown	Unknown	Laguna	Laguna	Blk20 Lot19 Ormoc st., brgy.Santo Tomas, South City Homes	11.0384275	124.6192702	Geocoding API Import	t	2026-07-07 16:15:36.223327	2026-07-07 16:15:36.223327
6845	\N	Atimonan National Comprehensive High School	ATIMONAN NATIONAL COMPREHENSIVE HIGH	Unknown	Unknown	Laguna	Laguna	Buhangin Atimonan	13.9760941	121.9726519	Geocoding API Import	t	2026-07-07 16:15:36.223327	2026-07-07 16:15:36.223327
6846	\N	Victorious Christian Montessori	VICTORIOUS CHRISTIAN MONTESSORI	Unknown	Unknown	Laguna	Laguna	Barangay Olaes General Mariano Alvarez	14.3101868	121.0131449	Geocoding API Import	t	2026-07-07 16:15:36.223327	2026-07-07 16:15:36.223327
6847	\N	Bula Parochial School, Inc.	BULA PAROCHIAL	Unknown	Unknown	Laguna	Laguna	Bagumbayan Bula	13.4695186	123.2763879	Geocoding API Import	t	2026-07-07 16:15:36.223327	2026-07-07 16:15:36.223327
6848	\N	HD, GM, COG	HD GM COG	Unknown	Unknown	Laguna	Laguna	Salitran IV, DasmariÃ±as	14.3479809	120.956081	Geocoding API Import	t	2026-07-07 16:15:36.223327	2026-07-07 16:15:36.223327
6849	\N	San Vicente High School	SAN VICENTE HIGH	Unknown	Unknown	Laguna	Laguna	Timbao	14.28972	121.0514264	Geocoding API Import	t	2026-07-07 16:15:36.223327	2026-07-07 16:15:36.223327
6850	\N	Muntinlupa Cosmopolitan school	MUNTINLUPA COSMOPOLITAN	Unknown	Unknown	Laguna	Laguna	Putatan Muntinlupa	14.391032	121.0447876	Geocoding API Import	t	2026-07-07 16:15:36.223327	2026-07-07 16:15:36.223327
6851	\N	Cagayan State University Appari Campus	CAGAYAN STATE APPARI	Unknown	Unknown	Laguna	Laguna	San Isidro Rizal Antipolo	14.7566067	121.155972	Geocoding API Import	t	2026-07-07 16:15:36.223327	2026-07-07 16:15:36.223327
6852	\N	Bicol University Main Campus	BICOL MAIN	Unknown	Unknown	Laguna	Laguna	Quezon/Panganiban, Gubat	12.9157051	124.1248915	Geocoding API Import	t	2026-07-07 16:15:36.223327	2026-07-07 16:15:36.223327
6853	\N	Cordillera career development college	CORDILLERA CAREER DEVELOPMENT	Unknown	Unknown	Laguna	Laguna	Silao st. Purok 4 bulanao, tabuk city	17.4156858	121.4380705	Geocoding API Import	t	2026-07-07 16:15:36.223327	2026-07-07 16:15:36.223327
6854	\N	ST. AUGUSTINE COLLEGES FOUNDATION, INC.	ST AUGUSTINE COLLEGES FOUNDATION	Unknown	Unknown	Laguna	Laguna	60B RSS Bldg. Lower Brookside, Baguio City	29.8921835	-81.3139313	Geocoding API Import	t	2026-07-07 16:15:36.223327	2026-07-07 16:15:36.223327
6855	\N	University of Makati	MAKATI	Unknown	Unknown	Laguna	Laguna	Blue Eagle, Taguig	14.5633428	121.0565387	Geocoding API Import	t	2026-07-07 16:15:36.223327	2026-07-07 16:15:36.223327
6856	\N	Ateneo de Naga University	ATENEO DE NAGA	Unknown	Unknown	Laguna	Laguna	Housing Compound, Zone 4, Marupit	13.6284619	123.1702937	Geocoding API Import	t	2026-07-07 16:15:36.223327	2026-07-07 16:15:36.223327
6857	\N	University of the Cordilleras	CORDILLERAS	Unknown	Unknown	Laguna	Laguna	Tangle, Mexico, Pampanga	15.1637013	120.6487508	Geocoding API Import	t	2026-07-07 16:15:36.223327	2026-07-07 16:15:36.223327
6858	\N	UNIVERSITY OF SOUTHERN MINDANAO	SOUTHERN MINDANAO	Unknown	Unknown	Laguna	Laguna	Bagumbayan, Tulunan, North Cotobato	7.115413999999999	124.83668	Geocoding API Import	t	2026-07-07 16:15:36.223327	2026-07-07 16:15:36.223327
6859	\N	ASIAN INSTITUTE OF MARITIME STUDIES	ASIAN MARITIME STUDIES	Unknown	Unknown	Laguna	Laguna	Bangkal, Makati City	14.5461269	120.9922325	Geocoding API Import	t	2026-07-07 16:15:36.223327	2026-07-07 16:15:36.223327
6860	\N	Holy Child Jesus College	HOLY CHILD JESUS	Unknown	Unknown	Laguna	Laguna	Purok3 Progreso	21.2811908	-89.66516279999999	Geocoding API Import	t	2026-07-07 16:15:36.223327	2026-07-07 16:15:36.223327
6861	\N	Pamantasan ng Lungsod ng San Pablo	PAMANTASAN NG LUNGSOD NG SAN PABLO	Unknown	Unknown	Laguna	Laguna	Brgy 1B, San Pablo City	14.0630519	121.3390364	Geocoding API Import	t	2026-07-07 16:15:36.223327	2026-07-07 16:15:36.223327
6862	\N	Cahel National High School	CAHEL NATIONAL HIGH	Unknown	Unknown	Laguna	Laguna	Makina, Calaca, Batangas	13.9940317	120.8226155	Geocoding API Import	t	2026-07-07 16:15:36.223327	2026-07-07 16:15:36.223327
6863	\N	San Andres National High School	SAN ANDRES NATIONAL HIGH	Unknown	Unknown	Laguna	Laguna	Mari Norte, San Andres, Romblon	12.5199925	122.0120803	Geocoding API Import	t	2026-07-07 16:15:36.223327	2026-07-07 16:15:36.223327
6864	\N	Andres Clemente Jr. National High School	ANDRES CLEMENTE JR NATIONAL HIGH	Unknown	Unknown	Laguna	Laguna	Pacita 2 San Pedro Laguna	14.3490714	121.0514264	Geocoding API Import	t	2026-07-07 16:15:36.223327	2026-07-07 16:15:36.223327
6865	\N	Andres Clemente National High School Masbate	ANDRES CLEMENTE NATIONAL HIGH MASBATE	Unknown	Unknown	Laguna	Laguna	Pacita 2, San Pedro	14.3490714	121.0514264	Geocoding API Import	t	2026-07-07 16:15:36.223327	2026-07-07 16:15:36.223327
6866	\N	Our Lady of Lourdes College Foundation	OUR LADY LOURDES FOUNDATION	Unknown	Unknown	Laguna	Laguna	Calaburnay, Paracale	14.237963	122.8140914	Geocoding API Import	t	2026-07-07 16:15:36.223327	2026-07-07 16:15:36.223327
6867	\N	San Pedro Relocate Center National High School	SAN PEDRO RELOCATE CENTER NATIONAL HIGH	Unknown	Unknown	Laguna	Laguna	Blk 5 Lot 2 Dreamland Heights, Brgy. United Bayanihan	14.3362314	121.0297473	Geocoding API Import	t	2026-07-07 16:15:36.223327	2026-07-07 16:15:36.223327
6868	\N	BiÃ±an National High School	BIA±AN NATIONAL HIGH	Unknown	Unknown	Laguna	Laguna	B7 L43 Magallanes Street Saint Francis 7 San Antonio	14.9481639	120.089654	Geocoding API Import	t	2026-07-07 16:15:36.223327	2026-07-07 16:15:36.223327
6869	\N	San Juan High School Pampanga	SAN JUAN HIGH PAMPANGA	Unknown	Unknown	Laguna	Laguna	Malaban Binan Laguna	15.079409	120.6199895	Geocoding API Import	t	2026-07-07 16:15:36.223327	2026-07-07 16:15:36.223327
6870	\N	Tabaco National High School	TABACO NATIONAL HIGH	Unknown	Unknown	Laguna	Laguna	P-2 L-165 Sitio Pagkakaisa Canlalay Binan Laguna	14.3456777	121.0716259	Geocoding API Import	t	2026-07-07 16:15:36.223327	2026-07-07 16:15:36.223327
6871	\N	Oring National High School	ORING NATIONAL HIGH	Unknown	Unknown	Laguna	Laguna	Maligaya Carmona Cavite	14.3134999	121.0571183	Geocoding API Import	t	2026-07-07 16:15:36.223327	2026-07-07 16:15:36.223327
6872	\N	Thy Covenant Montessori School	THY COVENANT MONTESSORI	Unknown	Unknown	Laguna	Laguna	0345 Nabua Street Western Bicutan	14.5213893	121.0361244	Geocoding API Import	t	2026-07-07 16:15:36.223327	2026-07-07 16:15:36.223327
6873	\N	Payao National Highschool	PAYAO NATIONAL HIGHSCHOOL	Unknown	Unknown	Laguna	Laguna	Landayan San Pedro Laguna	14.342774	121.035522	Geocoding API Import	t	2026-07-07 16:15:36.223327	2026-07-07 16:15:36.223327
6874	\N	Vivencio P. Casas Sr. Memorial High School	VIVENCIO P CASAS SR MEMORIAL HIGH	Unknown	Unknown	Laguna	Laguna	Honoria Subdivision Platero Binan Laguna	14.3240451	121.095131	Geocoding API Import	t	2026-07-07 16:15:36.223327	2026-07-07 16:15:36.223327
6876	\N	STI College Alabang	STI ALABANG	Unknown	Unknown	Laguna	Laguna	Farmville Drive Brgy. Alabang Binan Laguna	14.3469736	121.0755761	Geocoding API Import	t	2026-07-07 16:15:36.223327	2026-07-07 16:15:36.223327
6877	\N	Sacred Heart Hign School	SACRED HEART HIGN	Unknown	Unknown	Laguna	Laguna	Platero Binan Laguna	14.3240451	121.095131	Geocoding API Import	t	2026-07-07 16:15:36.223327	2026-07-07 16:15:36.223327
6878	\N	National Unversity- Dasmarinas	NATIONAL UNVERSITY DASMARINAS	Unknown	Unknown	Laguna	Laguna	St. Manalmond/ Aldiano Olaes GMA Cavite	14.3175645	121.0148742	Geocoding API Import	t	2026-07-07 16:15:36.223327	2026-07-07 16:15:36.223327
6879	\N	Dona Pilar M. Alberto -Landayan	DONA PILAR M ALBERTO LANDAYAN	Unknown	Unknown	Laguna	Laguna	San Vicente San Pedro	14.3443057	121.0263428	Geocoding API Import	t	2026-07-07 16:15:36.223327	2026-07-07 16:15:36.223327
6880	\N	SPCBA	SPCBA	Unknown	Unknown	Laguna	Laguna	United Bayanihan Lower San Pedro City	14.3353989	121.0299265	Geocoding API Import	t	2026-07-07 16:15:36.223327	2026-07-07 16:15:36.223327
6881	\N	San Pascual national high school	SAN PASCUAL NATIONAL HIGH	Unknown	Unknown	Laguna	Laguna	Bolod San Pascual Masbate	13.125148	122.9856745	Geocoding API Import	t	2026-07-07 16:15:36.223327	2026-07-07 16:15:36.223327
6882	\N	MARON TECHNICAL CENTER INC	MARON TECHNICAL CENTER	Unknown	Unknown	Laguna	Laguna	Dela Paz Binan Laguna	14.3473069	121.0845045	Geocoding API Import	t	2026-07-07 16:15:36.223327	2026-07-07 16:15:36.223327
6883	\N	Binan National High School - Dela Paz Annex	BINAN NATIONAL HIGH DELA PAZ ANNEX	Unknown	Unknown	Laguna	Laguna	1354 Victoria, Brgy Delapaz	14.3489761	121.080986	Geocoding API Import	t	2026-07-07 16:15:36.223327	2026-07-07 16:15:36.223327
6884	\N	Bicol University College of Arts and Letters	BICOL ARTS AND LETTERS	Unknown	Unknown	Laguna	Laguna	PUROK 8, Labo, Camarines Norte	14.1558191	122.8294174	Geocoding API Import	t	2026-07-07 16:15:36.223327	2026-07-07 16:15:36.223327
6885	\N	Gattaran National Trade School Cagayan Valley	GATTARAN NATIONAL TRADE CAGAYAN VALLEY	Unknown	Unknown	Laguna	Laguna	East poplar st. Brgy Zapote	18.0653206	121.6435857	Geocoding API Import	t	2026-07-07 16:15:36.223327	2026-07-07 16:15:36.223327
6886	\N	Camarines Norte State College-Mercedes Campus	CAMARINES NORTE STATE MERCEDES	Unknown	Unknown	Laguna	Laguna	San Roque Mercedes	14.116932	122.9927037	Geocoding API Import	t	2026-07-07 16:15:36.223327	2026-07-07 16:15:36.223327
6887	\N	Bestlink College of the Philippines	BESTLINK PHILIPPINES	Unknown	Unknown	Laguna	Laguna	Mulawin Street, Landayan	14.3512838	121.0728678	Geocoding API Import	t	2026-07-07 16:15:36.223327	2026-07-07 16:15:36.223327
6888	\N	ICC-Carmona	ICC CARMONA	Unknown	Unknown	Laguna	Laguna	Langkiwa Binan Laguna	14.2987188	121.0583377	Geocoding API Import	t	2026-07-07 16:15:36.223327	2026-07-07 16:15:36.223327
6889	\N	Mabini Colleges	MABINI COLLEGES	Unknown	Unknown	Laguna	Laguna	PUROK 01 CAMAMBUGAN	14.1084786	122.9465838	Geocoding API Import	t	2026-07-07 16:15:36.223327	2026-07-07 16:15:36.223327
6892	\N	San Sebastian College Recoletos, Manila	SAN SEBASTIAN RECOLETOS MANILA	Unknown	Unknown	Laguna	Laguna	Cattleya St. / Brgy. Fatima	14.6007856	120.9898838	Geocoding API Import	t	2026-07-07 16:15:36.223327	2026-07-07 16:15:36.223327
6893	\N	Krus Naligas High school	KRUS NALIGAS HIGH	Unknown	Unknown	Laguna	Laguna	Landayan San Pedro Laguna	14.3535782	121.06934	Geocoding API Import	t	2026-07-07 16:15:36.223327	2026-07-07 16:15:36.223327
6894	\N	Negros Oriental State University	NEGROS ORIENTAL STATE	Unknown	Unknown	Laguna	Laguna	418 Barangay Sto. Nino	9.628208299999999	122.9888319	Geocoding API Import	t	2026-07-07 16:15:36.223327	2026-07-07 16:15:36.223327
6895	\N	Abuyog Academy Inc	ABUYOG	Unknown	Unknown	Laguna	Laguna	Barangay Malamig, Blk 1 Lot 38 Binan Laguna	14.2734595	121.0471466	Geocoding API Import	t	2026-07-07 16:15:36.223327	2026-07-07 16:15:36.223327
6897	\N	St. Luis Anne Colleges	ST LUIS ANNE COLLEGES	Unknown	Unknown	Laguna	Laguna	Landayan San Pedro Laguna	14.3535782	121.06934	Geocoding API Import	t	2026-07-07 16:15:36.223327	2026-07-07 16:15:36.223327
6898	\N	STI West Negros University	STI WEST NEGROS	Unknown	Unknown	Laguna	Laguna	San Antonio Binan Laguna	14.3332816	121.0936983	Geocoding API Import	t	2026-07-07 16:15:36.223327	2026-07-07 16:15:36.223327
6899	\N	Asia Institute of Science and Technology	ASIA SCIENCE AND TECHNOLOGY	Unknown	Unknown	Laguna	Laguna	Brgy Bungahan Binan Laguna	14.2988029	121.0770255	Geocoding API Import	t	2026-07-07 16:15:36.223327	2026-07-07 16:15:36.223327
6901	\N	Santa Rosa Educational Ins Inc	SANTA ROSA EDUCATIONAL INS	Unknown	Unknown	Laguna	Laguna	Barangay Sinalhan Ibaba, Santa Rosa Laguna	14.3134106	121.118496	Geocoding API Import	t	2026-07-07 16:15:36.223327	2026-07-07 16:15:36.223327
6902	\N	Jose Abad Santos High School	JOSE ABAD SANTOS HIGH	Unknown	Unknown	Laguna	Laguna	Blk 9 Lot 1 Phase 1 Brgy Langkiwa Binan Laguna	14.31669	121.1015121	Geocoding API Import	t	2026-07-07 16:15:36.223327	2026-07-07 16:15:36.223327
6903	\N	Hanawan National High School	HANAWAN NATIONAL HIGH	Unknown	Unknown	Laguna	Laguna	Ilaya St. Binan Laguna	13.5664294	123.4243369	Geocoding API Import	t	2026-07-07 16:15:36.223327	2026-07-07 16:15:36.223327
6904	\N	Eulogio Amang Rodriguez Ins Science & Technology	EULOGIO AMANG RODRIGUEZ INS SCIENCE TECHNOLOGY	Unknown	Unknown	Laguna	Laguna	Cuyab San Pedro Laguna	14.3733061	121.0578756	Geocoding API Import	t	2026-07-07 16:15:36.223327	2026-07-07 16:15:36.223327
6905	\N	College of Saint Bernard of Clairvaux	SAINT BERNARD CLAIRVAUX	Unknown	Unknown	Laguna	Laguna	Masipag, Macalelon, Quezon	13.9368076	121.6129591	Geocoding API Import	t	2026-07-07 16:15:36.223327	2026-07-07 16:15:36.223327
6906	\N	ALS -2012	ALS 2012	Unknown	Unknown	Laguna	Laguna	Brgy. Aplaya Sta. Rosa Laguna	14.3112861	121.1229365	Geocoding API Import	t	2026-07-07 16:15:36.223327	2026-07-07 16:15:36.223327
6907	\N	Haluban National High School Bicol	HALUBAN NATIONAL HIGH BICOL	Unknown	Unknown	Laguna	Laguna	Zone 3, Barrera Sr., Lupi	13.8419713	122.9210269	Geocoding API Import	t	2026-07-07 16:15:36.223327	2026-07-07 16:15:36.223327
6908	\N	Tigbinan Camarines Norte	TIGBINAN CAMARINES NORTE	Unknown	Unknown	Laguna	Laguna	Langkiwa BinanLaguna	14.1852703	122.5259596	Geocoding API Import	t	2026-07-07 16:15:36.223327	2026-07-07 16:15:36.223327
6909	\N	Jacobo Z. Gonzales Memorial School of Arts and Trade	JACOBO Z GONZALES MEMORIAL ARTS AND TRADE	Unknown	Unknown	Laguna	Laguna	Santo Angel Central	14.2846291	121.4063298	Geocoding API Import	t	2026-07-07 16:15:36.223327	2026-07-07 16:15:36.223327
6910	\N	Domonic of Science and Technology	DOMONIC SCIENCE AND TECHNOLOGY	Unknown	Unknown	Laguna	Laguna	Dela Paz Binan Laguna	14.3555826	121.0822362	Geocoding API Import	t	2026-07-07 16:15:36.223327	2026-07-07 16:15:36.223327
6912	\N	Asian Caregiving & Technology Education Centers-Apalit, Inc	ASIAN CAREGIVING TECHNOLOGY EDUCATION CENTERS APALIT	Unknown	Unknown	Laguna	Laguna	Macabling Sta Rosa	14.2971682	121.0936983	Geocoding API Import	t	2026-07-07 16:15:36.223327	2026-07-07 16:15:36.223327
6913	\N	Nereo R Joaquin National Highschool	NEREO R JOAQUIN NATIONAL HIGHSCHOOL	Unknown	Unknown	Laguna	Laguna	Ilaya st. Malaban Binan Laguna	14.3403646	121.0929809	Geocoding API Import	t	2026-07-07 16:15:36.223327	2026-07-07 16:15:36.223327
6914	\N	San Francisco De Sales School of San Pedro Laguna	SAN FRANCISCO DE SALES SAN PEDRO LAGUNA	Unknown	Unknown	Laguna	Laguna	#41 Dr. A Gonzales Binan	14.3601567	121.0588718	Geocoding API Import	t	2026-07-07 16:15:36.223327	2026-07-07 16:15:36.223327
6915	\N	Philippine Engineering & Agro-Industrial Colleges Inc	PHILIPPINE ENGINEERING AGRO INDUSTRIAL COLLEGES	Unknown	Unknown	Laguna	Laguna	Brgy.Parian Landmark Calamba Laguna	14.2152422	121.1524244	Geocoding API Import	t	2026-07-07 16:15:36.223327	2026-07-07 16:15:36.223327
6916	\N	Asiatech School of Science and Arts	ASIATECH SCIENCE AND ARTS	Unknown	Unknown	Laguna	Laguna	Purok 6 Caingin	14.2677438	121.1262093	Geocoding API Import	t	2026-07-07 16:15:36.223327	2026-07-07 16:15:36.223327
6917	\N	Camarines Norte State College	CAMARINES NORTE STATE	Unknown	Unknown	Laguna	Laguna	Del Rosario, Mercedes	14.1176421	122.9860159	Geocoding API Import	t	2026-07-07 16:15:36.223327	2026-07-07 16:15:36.223327
6918	\N	Mercedes B. Peralta SHS	MERCEDES B PERALTA SENIOR HIGH	Unknown	Unknown	Laguna	Laguna	Graceland Brgy. San Francisco Binan Laguna	14.332423	121.0550093	Geocoding API Import	t	2026-07-07 16:15:36.223327	2026-07-07 16:15:36.223327
6919	\N	Zacarias C. Aquilizan High School	ZACARIAS C AQUILIZAN HIGH	Unknown	Unknown	Laguna	Laguna	Cama Juan	15.394851	120.7752219	Geocoding API Import	t	2026-07-07 16:15:36.223327	2026-07-07 16:15:36.223327
6920	\N	Victor Bernal Provincial High School	VICTOR BERNAL PROVINCIAL HIGH	Unknown	Unknown	Laguna	Laguna	Banay-Banay Cabuyao	14.2550305	121.1266458	Geocoding API Import	t	2026-07-07 16:15:36.223327	2026-07-07 16:15:36.223327
6921	\N	Notre Dame University	NOTRE DAME	Unknown	Unknown	Laguna	Laguna	Brgy Aldiano Olaes GMA	14.3083438	121.011318	Geocoding API Import	t	2026-07-07 16:15:36.223327	2026-07-07 16:15:36.223327
6922	\N	ASIATECH	ASIATECH	Unknown	Unknown	Laguna	Laguna	Pooc Sta Rosa Laguna	14.3009266	121.1123219	Geocoding API Import	t	2026-07-07 16:15:36.223327	2026-07-07 16:15:36.223327
6924	\N	Philtech Santa Rosa	PHILTECH SANTA ROSA	Unknown	Unknown	Laguna	Laguna	Brgy. Pooc Sta. Rosa	14.30049	121.111913	Geocoding API Import	t	2026-07-07 16:15:36.223327	2026-07-07 16:15:36.223327
6925	\N	IETI Science Technology Inc.	IETI SCIENCE TECHNOLOGY	Unknown	Unknown	Laguna	Laguna	Kiwi St. Brgy. Langgam San Pedro Laguna	14.3487831	121.0477898	Geocoding API Import	t	2026-07-07 16:15:36.223327	2026-07-07 16:15:36.223327
6927	\N	Bachelor of Science in Business Administration	BACHELOR SCIENCE IN BUSINESS ADMINISTRATION	Unknown	Unknown	Laguna	Laguna	Bukal, Tagkawayan	13.973699	122.5966549	Geocoding API Import	t	2026-07-07 16:15:36.223327	2026-07-07 16:15:36.223327
6928	\N	Tenga-Tenga, Cuyo,Palawan	TENGA TENGA CUYO PALAWAN	Unknown	Unknown	Laguna	Laguna	Suba, Cuyo, Palawan	10.8523956	121.0084227	Geocoding API Import	t	2026-07-07 16:15:36.231382	2026-07-07 16:15:36.231382
6929	\N	Baguio Central Unversity	BAGUIO CENTRAL UNVERSITY	Unknown	Unknown	Laguna	Laguna	Wawa Street Malaban Binan Laguna	14.3491489	121.0882322	Geocoding API Import	t	2026-07-07 16:15:36.231382	2026-07-07 16:15:36.231382
6930	\N	Upper Village Christian Academy	UPPER VILLAGE CHRISTIAN	Unknown	Unknown	Laguna	Laguna	blk 9 lot 10 Southern Heights 2 UBL Mt Apo Street. San Pedro	14.3644324	121.0619214	Geocoding API Import	t	2026-07-07 16:15:36.231382	2026-07-07 16:15:36.231382
6931	\N	San Roque Catholic School	SAN ROQUE CATHOLIC	Unknown	Unknown	Laguna	Laguna	Block 7 Lot 11 Acacia Estate Homes Timbao Binan Laguna	14.2827766	121.0549226	Geocoding API Import	t	2026-07-07 16:15:36.231382	2026-07-07 16:15:36.231382
6932	\N	Callejon NHS-Quezon	CALLEJON NATIONAL HIGH QUEZON	Unknown	Unknown	Laguna	Laguna	Celina Mansion, Barangay loma Binan Laguna	14.2841193	121.0679026	Geocoding API Import	t	2026-07-07 16:15:36.231382	2026-07-07 16:15:36.231382
6933	\N	Leuteboro National High School	LEUTEBORO NATIONAL HIGH	Unknown	Unknown	Laguna	Laguna	St Polo Maduya Cavite	14.3176095	121.0593087	Geocoding API Import	t	2026-07-07 16:15:36.231382	2026-07-07 16:15:36.231382
6934	\N	Liceo De San Pedro	LICEO DE SAN PEDRO	Unknown	Unknown	Laguna	Laguna	Calendola	14.3415884	121.0344894	Geocoding API Import	t	2026-07-07 16:15:36.231382	2026-07-07 16:15:36.231382
6935	\N	San Pedro Rellocation Center National High School	SAN PEDRO RELLOCATION CENTER NATIONAL HIGH	Unknown	Unknown	Laguna	Laguna	Estrella San Pedro Laguna	14.3432943	121.0499032	Geocoding API Import	t	2026-07-07 16:15:36.231382	2026-07-07 16:15:36.231382
6936	\N	City Global College Bina Laguna	CITY GLOBAL BINA LAGUNA	Unknown	Unknown	Laguna	Laguna	Malaban Binan Laguna	14.3480943	121.0894002	Geocoding API Import	t	2026-07-07 16:15:36.231382	2026-07-07 16:15:36.231382
6938	\N	Saint Vicent City College Cabuyao	SAINT VICENT CITY CABUYAO	Unknown	Unknown	Laguna	Laguna	Purok 6 1090c	14.2677604	121.1262662	Geocoding API Import	t	2026-07-07 16:15:36.231382	2026-07-07 16:15:36.231382
6940	\N	Colegio De Sta Ana Taguig	COLEGIO DE STA ANA TAGUIG	Unknown	Unknown	Laguna	Laguna	Muntinlupa City	14.5264397	121.0738046	Geocoding API Import	t	2026-07-07 16:15:36.231382	2026-07-07 16:15:36.231382
6941	\N	Bugtong National High School Pangasinan	BUGTONG NATIONAL HIGH PANGASINAN	Unknown	Unknown	Laguna	Laguna	Tartaria, Silang	14.1957533	121.0277763	Geocoding API Import	t	2026-07-07 16:15:36.231382	2026-07-07 16:15:36.231382
6942	\N	Schola De San Jose South Cotobato	SCHOLA DE SAN JOSE SOUTH COTOBATO	Unknown	Unknown	Laguna	Laguna	Mercedes street, blk 11, lot 12 garden villa 1, Cabuyao	14.2743276	121.1196096	Geocoding API Import	t	2026-07-07 16:15:36.231382	2026-07-07 16:15:36.231382
6943	\N	Our Lady Of Lourdes College	OUR LADY LOURDES	Unknown	Unknown	Laguna	Laguna	blk 71, langkiwa, binan, laguna	14.2958856	121.0578756	Geocoding API Import	t	2026-07-07 16:15:36.231382	2026-07-07 16:15:36.231382
6944	\N	Pulong Sta. Cruz Sta. Rosa Laguna	PULONG STA CRUZ STA ROSA LAGUNA	Unknown	Unknown	Laguna	Laguna	Sta. Rosa Laguna	14.2730308	121.0822362	Geocoding API Import	t	2026-07-07 16:15:36.231382	2026-07-07 16:15:36.231382
6945	\N	Binan High School West Campus	BINAN HIGH WEST	Unknown	Unknown	Laguna	Laguna	Baranggay Timbao Binan Laguna	14.28972	121.0514264	Geocoding API Import	t	2026-07-07 16:15:36.231382	2026-07-07 16:15:36.231382
6946	\N	Justino Sevilla High School	JUSTINO SEVILLA HIGH	Unknown	Unknown	Laguna	Laguna	Brgy. Malaban Binan Laguna	14.3457578	121.0874096	Geocoding API Import	t	2026-07-07 16:15:36.231382	2026-07-07 16:15:36.231382
6947	\N	Liceo De Sto. Thomas De Aquinas	LICEO DE STO THOMAS DE AQUINAS	Unknown	Unknown	Laguna	Laguna	Langkiwa Binan Laguna	14.2958856	121.0578756	Geocoding API Import	t	2026-07-07 16:15:36.231382	2026-07-07 16:15:36.231382
6948	\N	JTen School Sta. Rosa Laguna	JTEN STA ROSA LAGUNA	Unknown	Unknown	Laguna	Laguna	Brgy. Aplaya Sta. Rosa Laguna	14.3166351	121.1105544	Geocoding API Import	t	2026-07-07 16:15:36.231382	2026-07-07 16:15:36.231382
6950	\N	Marinduque National High School	MARINDUQUE NATIONAL HIGH	Unknown	Unknown	Laguna	Laguna	Kensington San Nicolas San Pablo Laguna	13.4767171	121.9032192	Geocoding API Import	t	2026-07-07 16:15:36.231382	2026-07-07 16:15:36.231382
6951	\N	ALS	ALS	Unknown	Unknown	Laguna	Laguna	Malamig Binan Laguna	14.2734595	121.0471466	Geocoding API Import	t	2026-07-07 16:15:36.231382	2026-07-07 16:15:36.231382
6952	\N	Perpetual Help System Las Pinas	PERPETUAL HELP SYSTEM LAS PINAS	Unknown	Unknown	Laguna	Laguna	Blk 3 Lot 8 Summer Cypress, Talon 4 Las Pinas City	14.4362085	121.0033132	Geocoding API Import	t	2026-07-07 16:15:36.231382	2026-07-07 16:15:36.231382
6953	\N	Dominican College of Sta Rosa Laguna	DOMINICAN STA ROSA LAGUNA	Unknown	Unknown	Laguna	Laguna	Barangay Pulong Sta. Cruz Santa Rosa	14.2730308	121.0822362	Geocoding API Import	t	2026-07-07 16:15:36.231382	2026-07-07 16:15:36.231382
6954	\N	Camp Vicente Lim National High School Calamba	CAMP VICENTE LIM NATIONAL HIGH CALAMBA	Unknown	Unknown	Laguna	Laguna	Brgy 1 Calamba Laguna	14.2048612	121.1574363	Geocoding API Import	t	2026-07-07 16:15:36.231382	2026-07-07 16:15:36.231382
6955	\N	Region III - Central Luzon School Division Office of Nueva Ecija Ricardo Dizon Canlas Agricultural School	REGION III CENTRAL LUZON DIVISION OFFICE NUEVA ECIJA RICARDO DIZON CANLAS AGRICULTURAL	Unknown	Unknown	Laguna	Laguna	Purok 5 Ganado Binan Laguna	15.578375	121.1112615	Geocoding API Import	t	2026-07-07 16:15:36.231382	2026-07-07 16:15:36.231382
6956	\N	Tanauan Institute-Batangas	TANAUAN BATANGAS	Unknown	Unknown	Laguna	Laguna	Sto. Tomas Batangas	14.106345	121.1596406	Geocoding API Import	t	2026-07-07 16:15:36.231382	2026-07-07 16:15:36.231382
6957	\N	Christ The King College	CHRIST KING	Unknown	Unknown	Laguna	Laguna	Dela Paz Binan Laguna	14.3555826	121.0822362	Geocoding API Import	t	2026-07-07 16:15:36.231382	2026-07-07 16:15:36.231382
6958	\N	University of the East- Caloocan	EAST CALOOCAN	Unknown	Unknown	Laguna	Laguna	G Mauricio St. Bagbaguin	14.7267598	121.0018126	Geocoding API Import	t	2026-07-07 16:15:36.231382	2026-07-07 16:15:36.231382
6959	\N	St. Ignatuis Canlalay	ST IGNATUIS CANLALAY	Unknown	Unknown	Laguna	Laguna	Zone 2 baranggay malaban Binan Laguna	14.341047	121.092483	Geocoding API Import	t	2026-07-07 16:15:36.231382	2026-07-07 16:15:36.231382
6960	\N	System Technology Institute	SYSTEM TECHNOLOGY	Unknown	Unknown	Laguna	Laguna	Kinnari 1 Brgy. Lantic	14.2934009	121.046625	Geocoding API Import	t	2026-07-07 16:15:36.231382	2026-07-07 16:15:36.231382
6961	\N	Saint Francis Naional High School	SAINT FRANCIS NAIONAL HIGH	Unknown	Unknown	Laguna	Laguna	Blk 11 Lot 6, Silcas Village, Kamagong Street, Brgy. San Francisco	14.3448326	121.0585698	Geocoding API Import	t	2026-07-07 16:15:36.231382	2026-07-07 16:15:36.231382
6962	\N	Toboso National High School	TOBOSO NATIONAL HIGH	Unknown	Unknown	Laguna	Laguna	Brgy. Pooc Sta Rosa Laguna	14.3009266	121.1123219	Geocoding API Import	t	2026-07-07 16:15:36.231382	2026-07-07 16:15:36.231382
6963	\N	Villazar National High School Camarines Norte	VILLAZAR NATIONAL HIGH CAMARINES NORTE	Unknown	Unknown	Laguna	Laguna	Balimbing St. San Antonio BiÃ±an City	15.3047698	120.8565122	Geocoding API Import	t	2026-07-07 16:15:36.231382	2026-07-07 16:15:36.231382
6964	\N	Liceo de santo tomas de aquinas	LICEO DE SANTO TOMAS DE AQUINAS	Unknown	Unknown	Laguna	Laguna	Santo NiÃ±o Binan Laguna	14.3093829	121.0634733	Geocoding API Import	t	2026-07-07 16:15:36.231382	2026-07-07 16:15:36.231382
6965	\N	Negros College Incorporated Senior High School	NEGROS SENIOR HIGH	Unknown	Unknown	Laguna	Laguna	Sto Tomas Calabuso	14.3056352	121.070773	Geocoding API Import	t	2026-07-07 16:15:36.231382	2026-07-07 16:15:36.231382
6966	\N	Don Bosco Highschool ParaÃ±aque	DON BOSCO HIGHSCHOOL PARAA±AQUE	Unknown	Unknown	Laguna	Laguna	Barangay Timbao Binan City Laguna	14.280629	121.0534817	Geocoding API Import	t	2026-07-07 16:15:36.231382	2026-07-07 16:15:36.231382
6967	\N	Laguna University- Sta. Cruz	LAGUNA STA CRUZ	Unknown	Unknown	Laguna	Laguna	Balibago Sta. Rosa Laguna	14.2948448	121.1008616	Geocoding API Import	t	2026-07-07 16:15:36.231382	2026-07-07 16:15:36.231382
6969	\N	Marken training foudation inc.	MARKEN TRAINING FOUDATION	Unknown	Unknown	Laguna	Laguna	Pooc Sta. Rosa Laguna	14.2726768	121.1252571	Geocoding API Import	t	2026-07-07 16:15:36.231382	2026-07-07 16:15:36.231382
6970	\N	Bicol University Tabaco Campus	BICOL TABACO	Unknown	Unknown	Laguna	Laguna	Malasugui, Labo	14.1536001	122.8507557	Geocoding API Import	t	2026-07-07 16:15:36.231382	2026-07-07 16:15:36.231382
6971	\N	Mapua University Makati Campus	MAPUA MAKATI	Unknown	Unknown	Laguna	Laguna	Nueva Ecija	15.578375	121.1112615	Geocoding API Import	t	2026-07-07 16:15:36.231382	2026-07-07 16:15:36.231382
6972	\N	Saint Ignatius	SAINT IGNATIUS	Unknown	Unknown	Laguna	Laguna	San Francisco Bina Laguna	14.332423	121.0550093	Geocoding API Import	t	2026-07-07 16:15:36.231382	2026-07-07 16:15:36.231382
6974	\N	Cainta Catholic College	CAINTA CATHOLIC	Unknown	Unknown	Laguna	Laguna	109 L. Wood St., Brgy. Dolores	14.5393407	121.0098332	Geocoding API Import	t	2026-07-07 16:15:36.231382	2026-07-07 16:15:36.231382
6976	\N	Asian Insitute Technology Sciences and the Arts Cabuyao	ASIAN INSITUTE TECHNOLOGY SCIENCES AND ARTS CABUYAO	Unknown	Unknown	Laguna	Laguna	Laguna	14.2743276	121.1196096	Geocoding API Import	t	2026-07-07 16:15:36.231382	2026-07-07 16:15:36.231382
6977	\N	Victorious Christian Montessori SHS	VICTORIOUS CHRISTIAN MONTESSORI SENIOR HIGH	Unknown	Unknown	Laguna	Laguna	San Mateo St. Cabilang Baybay Carmona Cavite	14.3188535	121.0517795	Geocoding API Import	t	2026-07-07 16:15:36.231382	2026-07-07 16:15:36.231382
6978	\N	Talaonga National High School Sorsogon	TALAONGA NATIONAL HIGH SORSOGON	Unknown	Unknown	Laguna	Laguna	Pooc	12.6869995	124.1287383	Geocoding API Import	t	2026-07-07 16:15:36.231382	2026-07-07 16:15:36.231382
6979	\N	Sure Foundation School, Inc.	SURE FOUNDATION	Unknown	Unknown	Laguna	Laguna	Canlubang Calamba	14.1951656	121.067907	Geocoding API Import	t	2026-07-07 16:15:36.231382	2026-07-07 16:15:36.231382
6980	\N	Comillas High School	COMILLAS HIGH	Unknown	Unknown	Laguna	Laguna	Sampaguita St. Binan Laguna	14.3366032	121.0650618	Geocoding API Import	t	2026-07-07 16:15:36.231382	2026-07-07 16:15:36.231382
6981	\N	Computer Arts and Technological College, Inc.	COMPUTER ARTS AND TECHNOLOGICAL	Unknown	Unknown	Laguna	Laguna	Dila, Sta Rosa	14.2946865	121.1108895	Geocoding API Import	t	2026-07-07 16:15:36.231382	2026-07-07 16:15:36.231382
6982	\N	Vinisitahan National High School	VINISITAHAN NATIONAL HIGH	Unknown	Unknown	Laguna	Laguna	1047. P, Vallejo Street	13.2832327	123.8006498	Geocoding API Import	t	2026-07-07 16:15:36.231382	2026-07-07 16:15:36.231382
6983	\N	Perpetual BiÃ±an	PERPETUAL BIA±AN	Unknown	Unknown	Laguna	Laguna	Amihan, Tagapo. Sta Rosa	14.3198648	121.1062843	Geocoding API Import	t	2026-07-07 16:15:36.231382	2026-07-07 16:15:36.231382
6984	\N	Makati High School	MAKATI HIGH	Unknown	Unknown	Laguna	Laguna	st. peter street brgy don jose	14.2556525	121.0652414	Geocoding API Import	t	2026-07-07 16:15:36.231382	2026-07-07 16:15:36.231382
6985	\N	Maximo Estrella Senior High School	MAXIMO ESTRELLA SENIOR HIGH	Unknown	Unknown	Laguna	Laguna	Malaban Binan	14.3480943	121.0894002	Geocoding API Import	t	2026-07-07 16:15:36.231382	2026-07-07 16:15:36.231382
6986	\N	The Tanauan Academy, Inc.	TANAUAN	Unknown	Unknown	Laguna	Laguna	Chrysanthemum St. Brgy. Loma	14.2858433	121.0665838	Geocoding API Import	t	2026-07-07 16:15:36.231382	2026-07-07 16:15:36.231382
6987	\N	Saint Louise Anne College	SAINT LOUISE ANNE	Unknown	Unknown	Laguna	Laguna	Malusak Sta. Rosa Laguna	14.3098729	121.1173355	Geocoding API Import	t	2026-07-07 16:15:36.231382	2026-07-07 16:15:36.231382
6988	\N	University of Cabuyao	CABUYAO	Unknown	Unknown	Laguna	Laguna	Bigaa Cabuyao Laguna	14.2855515	121.1295104	Geocoding API Import	t	2026-07-07 16:15:36.231382	2026-07-07 16:15:36.231382
6989	\N	Tabgon Caramoan	TABGON CARAMOAN	Unknown	Unknown	Laguna	Laguna	Langkiwa Binan Laguna	14.2958856	121.0578756	Geocoding API Import	t	2026-07-07 16:15:36.231382	2026-07-07 16:15:36.231382
6990	\N	Buga National High School Albay	BUGA NATIONAL HIGH ALBAY	Unknown	Unknown	Laguna	Laguna	Laguna	13.1774827	123.5280072	Geocoding API Import	t	2026-07-07 16:15:36.231382	2026-07-07 16:15:36.231382
5550	\N	Angelo L. Loyola Senior High School	ANGELO L LOYOLA SENIOR HIGH SCHOOL	Grade 11-12	Unknown	Carmona	Cavite	Alfonso Macha St.	14.2976929	121.0494114	Masterlist 2026	t	2026-07-03 16:53:15.980107	2026-07-03 16:53:15.980107
5551	\N	ANGELS IN HEAVEN SCHOOL INC.	ANGELS IN HEAVEN SCHOOL INC	Grade 7-10 & Grade 11-12	Unknown	Cabuyao City	Laguna	5035 National Highway, Sala, Cabuyao City, Laguna	14.2659098	121.1269232	Masterlist 2026	t	2026-07-03 16:53:15.980107	2026-07-03 16:53:15.980107
5552	\N	Angono National High School	ANGONO NATIONAL HIGH SCHOOL	Grade 7-10 & Grade 11-12	Unknown	Angono	Rizal		14.5274793	121.146658	Masterlist 2026	t	2026-07-03 16:53:15.980107	2026-07-03 16:53:15.980107
5553	\N	Angono Private High School	ANGONO PRIVATE HIGH SCHOOL	Kinder, Grade 1-6, Grade 7-10 & Grade 11-12	Unknown	Binangonan	Rizal	DoÃ±a Aurora St.	14.5202864	121.1545806	Masterlist 2026	t	2026-07-03 16:53:15.980107	2026-07-03 16:53:15.980107
5554	\N	Anihan Technical School	ANIHAN TECHNICAL SCHOOL	Grade 11-12	Unknown	Calamba	Laguna	294 Purok 6, Brgy. Milagrosa, Calamba City, Lagunana	14.1711924	121.1334729	Masterlist 2026	t	2026-07-03 16:53:15.980107	2026-07-03 16:53:15.980107
5555	\N	Anilao Integrated National High School	ANILAO INTEGRATED NATIONAL HIGH SCHOOL	Grade 7-10 & Grade 11-12	Unknown	Lipa City	Batangas	Anilao, Lipa City	13.9047637	121.1739024	Masterlist 2026	t	2026-07-03 16:53:15.980107	2026-07-03 16:53:15.980107
5556	\N	Ann Arbor Montessori Learning Center Inc.	ANN ARBOR MONTESSORI LEARNING CENTER INC	Grade 11-12	Unknown	Biñan	Laguna	Town & Country Southville Subdivision,	14.3052255	121.0678847	Masterlist 2026	t	2026-07-03 16:53:15.980107	2026-07-03 16:53:15.980107
5557	\N	Ann Marris Montessori School	ANN MARRIS MONTESSORI SCHOOL	Kinder, Grade 1-6, Grade 7-10 & Grade 11-12	Unknown	Quezon City	Metro Manila	# 2 Mercury St. Ph.4 Golden City	14.6721921	121.0357691	Masterlist 2026	t	2026-07-03 16:53:15.980107	2026-07-03 16:53:15.980107
5558	\N	Anselmo A. Sandoval Memorial National High School	ANSELMO A SANDOVAL MEMORIAL NATIONAL HIGH SCHOOL	Grade 7-10 & Grade 11-12	Unknown	Mabini	Batangas	P. Balibaguhan, Mabini, Batangas	13.7432994	120.9376126	Masterlist 2026	t	2026-07-03 16:53:15.980107	2026-07-03 16:53:15.980107
5559	\N	Antipolo City National Science and Technology HS	ANTIPOLO CITY NATIONAL SCIENCE AND TECHNOLOGY HS	Grade 7-10 & Grade 11-12	Unknown	Antipolo	Rizal	Sitio Cabading	14.5846541	121.1757096	Masterlist 2026	t	2026-07-03 16:53:15.980107	2026-07-03 16:53:15.980107
5560	\N	Antipolo City Senior HS	ANTIPOLO CITY SENIOR HS	Grade 11-12	Unknown	Antipolo	Rizal	Olalia Road, Upper Sto. Nino	14.618749	121.1666617	Masterlist 2026	t	2026-07-03 16:53:15.980107	2026-07-03 16:53:15.980107
5561	\N	Antipolo Immaculate Conception School	ANTIPOLO IMMACULATE CONCEPTION SCHOOL	Kinder, Grade 1-6, Grade 7-10 & Grade 11-12	Unknown	Antipolo	Rizal	Sumulong Street, Villa Carmen Subdivision	14.5833899	121.1740236	Masterlist 2026	t	2026-07-03 16:53:15.980107	2026-07-03 16:53:15.980107
5562	\N	Antipolo Lady of Lourdes School	ANTIPOLO LADY OF LOURDES SCHOOL	Kinder, Grade 1-6, Grade 7-10 & Grade 11-12	Unknown	Antipolo	Rizal	Parugan Interior National Road	14.5796701	121.1852755	Masterlist 2026	t	2026-07-03 16:53:15.980107	2026-07-03 16:53:15.980107
5563	\N	Antonio C. Esguerra Mem. NHS	ANTONIO C ESGUERRA MEM NHS	Grade 7-10 & Grade 11-12	Unknown	Taytay	Rizal	Sampaguita	14.5380269	121.1122133	Masterlist 2026	t	2026-07-03 16:53:15.980107	2026-07-03 16:53:15.980107
5564	\N	Anuling Integrated High School	ANULING INTEGRATED HIGH SCHOOL	Grade 7-10 & Grade 11-12	Unknown	Mendez	Cavite	Maglabe Drive	14.1143684	120.8958259	Masterlist 2026	t	2026-07-03 16:53:15.980107	2026-07-03 16:53:15.980107
5565	\N	Apad NHS (Formerly Sto. Domingo NHS - Apad Ext. Classes)	APAD NHS FORMERLY STO DOMINGO NHS APAD EXT CLASSES	Grade 7-10 & Grade 11-12	Unknown	Calauag	Quezon	Apad Lutao	14.041969	122.3165415	Masterlist 2026	t	2026-07-03 16:53:15.997012	2026-07-03 16:53:15.997012
5566	\N	APEC School	APEC SCHOOL	Grade 7-10 & Grade 11-12	Unknown	San Pablo City	Laguna	15 Leonor St.	14.066619	121.324786	Masterlist 2026	t	2026-07-03 16:53:15.997012	2026-07-03 16:53:15.997012
5567	\N	APEC SCHOOLS	APEC SCHOOLS	Grade 7-10 & Grade 11-12	Unknown	Bacoor	Cavite	Blk 2 Lot 17 & 5574 Molino Road	14.4219984	120.9750134	Masterlist 2026	t	2026-07-03 16:53:15.997012	2026-07-03 16:53:15.997012
5568	\N	APEC Schools - Ortigas Ext.	APEC SCHOOLS ORTIGAS EXT	Grade 7-10 & Grade 11-12	Unknown	Cainta	Rizal	Paramount Plaza Building, Km 17 Ortigas Avenue Extension, Brgy. Sto. Domingo, Cainta Rizal	14.5880131	121.1083258	Masterlist 2026	t	2026-07-03 16:53:15.997012	2026-07-03 16:53:15.997012
5569	\N	Aplaya National High School	APLAYA NATIONAL HIGH SCHOOL	Grade 7-10 & Grade 11-12	Unknown	STA. Rosa City	Laguna	Brgy, Aplaya Santa Rosa City	14.3180193	121.1220108	Masterlist 2026	t	2026-07-03 16:53:15.997012	2026-07-03 16:53:15.997012
5570	\N	Ark Technological Institute Education System, Inc.	ARK TECHNOLOGICAL INSTITUTE EDUCATION SYSTEM INC	Grade 11-12	Unknown	Lucena City	Quezon	3rd Floor, J-Seven Building, Magallanes corner Granja Street	13.9336193	121.6124721	Masterlist 2026	t	2026-07-03 16:53:15.997012	2026-07-03 16:53:15.997012
5571	\N	ARMA COLLEGE OF TECHNOLOGY TRAINING AND ASSESSMENT CENTER INC.	ARMA COLLEGE OF TECHNOLOGY TRAINING AND ASSESSMENT CENTER INC	Grade 11-12	Unknown	Antipolo	Rizal	95 Mariwasa St. Brgy. Pipindan, Binangonan, Rizal	14.5872119	121.1735246	Masterlist 2026	t	2026-07-03 16:53:15.997012	2026-07-03 16:53:15.997012
5572	\N	Asia Technological School of Science and Arts	ASIA TECHNOLOGICAL SCHOOL OF SCIENCE AND ARTS	Kinder, Grade 1-6, Grade 7-10 & Grade 11-12	Unknown	City of Santa Rosa	Laguna	1506, National Highway, Dila, Sta. Rosa, Laguna	14.2884054	121.1089016	Masterlist 2026	t	2026-07-03 16:53:15.997012	2026-07-03 16:53:15.997012
5573	\N	Asia Technological School of Science and Arts (ASIATECH)	ASIA TECHNOLOGICAL SCHOOL OF SCIENCE AND ARTS ASIATECH	Grade 11-12	Unknown	City of Santa Rosa	Laguna	#1506 Golden City Entrance, National Hi-way, Sta. Rosa City, Laguna	14.2884054	121.1089016	Masterlist 2026	t	2026-07-03 16:53:15.997012	2026-07-03 16:53:15.997012
5574	\N	Asian Caregiving and Technology Education Centers-Bacoor, Inc.	ASIAN CAREGIVING AND TECHNOLOGY EDUCATION CENTERSBACOOR INC	Grade 11-12	Unknown	Bacoor	Cavite	328 Aguinaldo Highway	14.461074	120.961423	Masterlist 2026	t	2026-07-03 16:53:15.997012	2026-07-03 16:53:15.997012
5575	\N	ASIAN COLLEGE OF COMPUTER AND MARITIME STUDIES (ACCMS) INC.	ASIAN COLLEGE OF COMPUTER AND MARITIME STUDIES ACCMS INC	Grade 11-12	Unknown	Unspecified	Region IV-A	Fueven Bldg., DoÃ±a Carmen De Luna St.	12.879721	121.774017	Masterlist 2026	t	2026-07-03 16:53:15.997012	2026-07-03 16:53:15.997012
5576	\N	Asian Computer College	ASIAN COMPUTER COLLEGE	Kinder, Grade 1-6, Grade 7-10 & Grade 11-12	Unknown	Calamba	Laguna	Doctora St.	14.2096528	121.1295278	Masterlist 2026	t	2026-07-03 16:53:15.997012	2026-07-03 16:53:15.997012
5577	\N	Asian Institute of Computer Studies	ASIAN INSTITUTE OF COMPUTER STUDIES	Grade 11-12	Unknown	General Mariano Alvarez	Cavite	A. Tapia Bldg., Gov. Drive, General Mariano Alvarez, Cavite	14.2831695	120.9998425	Masterlist 2026	t	2026-07-03 16:53:15.997012	2026-07-03 16:53:15.997012
5578	\N	Asian Institute of Computer Studies - Bacoor City	ASIAN INSTITUTE OF COMPUTER STUDIES BACOOR CITY	Grade 11-12	Unknown	Bacoor	Cavite	Ma. Salud Bldg., Km 17 General Emilio Aguinaldo Highway	14.4472292	120.953146	Masterlist 2026	t	2026-07-03 16:53:15.997012	2026-07-03 16:53:15.997012
5579	\N	Asian Institute of Computer Studies - Batangas	ASIAN INSTITUTE OF COMPUTER STUDIES BATANGAS	Grade 11-12	Unknown	Batangas City	Batangas	AICS Bldg., P. Burgos cor. Alegre St., Brgy. 11, Batangas City	13.7611344	121.0574829	Masterlist 2026	t	2026-07-03 16:53:15.997012	2026-07-03 16:53:15.997012
5580	\N	Asian Institute of Computer Studies - Calamba	ASIAN INSTITUTE OF COMPUTER STUDIES CALAMBA	Grade 11-12	Unknown	Calamba	Laguna	Provincial Road, Chinabank Bldg. Brgy. Uno, Calamba, Laguna	14.2043047	121.1567188	Masterlist 2026	t	2026-07-03 16:53:15.997012	2026-07-03 16:53:15.997012
5581	\N	Asian Institute of Computer Studies - Central Inc.,	ASIAN INSTITUTE OF COMPUTER STUDIES CENTRAL INC	Grade 11-12	Unknown	Bacoor	Cavite	3F FYNN Commercial Bldg., Gen. E. Aguinaldo Highway	14.4472292	120.953146	Masterlist 2026	t	2026-07-03 16:53:15.997012	2026-07-03 16:53:15.997012
5582	\N	Asian Institute of Computer Studies - DasmariÃ±as	ASIAN INSTITUTE OF COMPUTER STUDIES DASMARIA±AS	Grade 11-12	Unknown	Emilio Aguinaldo Hwy	Cavite	Leveriza Bldg., E. Aguinaldo Highway, DasmariÃ±as City	14.2914868	120.958642	Masterlist 2026	t	2026-07-03 16:53:15.997012	2026-07-03 16:53:15.997012
5583	\N	Asian Institute of Computer Studies - Lipa	ASIAN INSTITUTE OF COMPUTER STUDIES LIPA	Grade 11-12	Unknown	Lipa City	Batangas	Gen. Luna St.	13.9526487	121.1654878	Masterlist 2026	t	2026-07-03 16:53:15.997012	2026-07-03 16:53:15.997012
5584	\N	Asian Institute of Computer Studies - Montalban	ASIAN INSTITUTE OF COMPUTER STUDIES MONTALBAN	Grade 11-12	Unknown	Rodriguez	Rizal	2nd Flr., Montalban Town Center, E. Rodriguez Highway, Brgy. San Jose, Rodriguez, Montalban, Rizal	14.7294834	121.1393231	Masterlist 2026	t	2026-07-03 16:53:15.997012	2026-07-03 16:53:15.997012
5585	\N	Asian Institute of Computer Studies - San Pedro	ASIAN INSTITUTE OF COMPUTER STUDIES SAN PEDRO	Grade 11-12	Unknown	San Pedro	Laguna	Centro Pacita, Pacita Complex, San Pedro, Laguna	14.3461126	121.062727	Masterlist 2026	t	2026-07-03 16:53:15.997012	2026-07-03 16:53:15.997012
5586	\N	Asian Institute of Computer Studies - Sta. Rosa	ASIAN INSTITUTE OF COMPUTER STUDIES STA ROSA	Grade 11-12	Unknown	City of Santa Rosa	Laguna	Precious Bldg., Old National Highway, Brgy. Dila, Sta. Rosa, Laguna	14.2930276	121.1071872	Masterlist 2026	t	2026-07-03 16:53:15.997012	2026-07-03 16:53:15.997012
5587	\N	Asian Institute of Computer Studies - Tanay	ASIAN INSTITUTE OF COMPUTER STUDIES TANAY	Grade 11-12	Unknown	Tanay	Rizal	Tanay Town Center, F. T. Catapusan cor. Sampaloc Rd., Tanay, Rizal	14.4941007	121.291342	Masterlist 2026	t	2026-07-03 16:53:15.997012	2026-07-03 16:53:15.997012
5588	\N	Asian Institute of Computer Studies - Taytay	ASIAN INSTITUTE OF COMPUTER STUDIES TAYTAY	Grade 11-12	Unknown	Taytay	Rizal	2nd Flr., Marc Square Bldg., Brgy. San Juan, Taytay, Rizal	14.5592936	121.1355818	Masterlist 2026	t	2026-07-03 16:53:15.997012	2026-07-03 16:53:15.997012
5589	\N	Asian Institute of Technology and Education	ASIAN INSTITUTE OF TECHNOLOGY AND EDUCATION	Grade 11-12	Unknown	Tiaong	Quezon	Olinsterg Bldg., Poblacion III, Tiaong, Quezon	13.9588907	121.3240023	Masterlist 2026	t	2026-07-03 16:53:15.997012	2026-07-03 16:53:15.997012
5590	\N	ASIAN INSTITUTE OF TECHNOLOGY SCIENCE AND ARTS (AITSA) INC.	ASIAN INSTITUTE OF TECHNOLOGY SCIENCE AND ARTS AITSA INC	Grade 11-12	Unknown	Cabuyao City	Laguna	2nd Fl. NH, Brgy. Sala, City of Cabuyao	14.2736716	121.1201143	Masterlist 2026	t	2026-07-03 16:53:15.997012	2026-07-03 16:53:15.997012
5591	\N	ASIAN INSTITUTE OF TECHNOLOGY SCIENCES AND THE ARTS (AITSA) INC.	ASIAN INSTITUTE OF TECHNOLOGY SCIENCES AND THE ARTS AITSA INC	Grade 11-12	Unknown	Tanauan City	Batangas	2nd Floor Avelino St., Brgy. Poblacion 5	14.0825117	121.1488444	Masterlist 2026	t	2026-07-03 16:53:15.997012	2026-07-03 16:53:15.997012
5595	\N	Asian Institute Science and Technology College-DasmariÃ±as	ASIAN INSTITUTE SCIENCE AND TECHNOLOGY COLLEGEDASMARIA±AS	Grade 11-12	Unknown	Dasmariñas	Cavite	AISAT Building Emilio Aguinaldo Highway, DasmariÃ±as City	14.3276158	120.9397432	Masterlist 2026	t	2026-07-03 16:53:15.997012	2026-07-03 16:53:15.997012
5596	\N	Asian School of Hospitality Arts	ASIAN SCHOOL OF HOSPITALITY ARTS	Grade 11-12	Unknown	Unspecified	Region IV-A	Hollywood Hills, Sumulong Highway	12.879721	121.774017	Masterlist 2026	t	2026-07-03 16:53:15.997012	2026-07-03 16:53:15.997012
5597	\N	Assumption Antipolo	ASSUMPTION ANTIPOLO	Kinder, Grade 1-6, Grade 7-10 & Grade 11-12	Unknown	Antipolo	Rizal	Assumption Road, Sumulong Highway	14.6027399	121.1801035	Masterlist 2026	t	2026-07-03 16:53:15.997012	2026-07-03 16:53:15.997012
5598	\N	Atheneum School	ATHENEUM SCHOOL	Kinder, Grade 1-6, Grade 7-10 & Grade 11-12	Unknown	Noveleta	Cavite	Seaview Subdivision, San Rafael II, Noveleta, Cavite	14.4336906	120.8759115	Masterlist 2026	t	2026-07-03 16:53:15.997012	2026-07-03 16:53:15.997012
5599	\N	Atimonan NCHS	ATIMONAN NCHS	Grade 7-10 & Grade 11-12	Unknown	Atimonan	Quezon	not applicable	14.0019884	121.920777	Masterlist 2026	t	2026-07-03 16:53:15.997012	2026-07-03 16:53:15.997012
5600	\N	Atty. Celso M. Reyes Integrated National High School (formerly Dr. Panfilo Castro NHS - Masalukot I Annex)	ATTY CELSO M REYES INTEGRATED NATIONAL HIGH SCHOOL FORMERLY DR PANFILO CASTRO NHS MASALUKOT I ANNEX	Grade 7-10 & Grade 11-12	Unknown	Candelaria	Quezon	Masalukot I	13.946321	121.429631	Masterlist 2026	t	2026-07-03 16:53:15.997012	2026-07-03 16:53:15.997012
5601	\N	Augustinian College	AUGUSTINIAN COLLEGE	Grade 11-12	Unknown	Cabuyao City	Laguna	65 Banaybanay, Cabuyao City, Laguna	14.2548275	121.1283502	Masterlist 2026	t	2026-07-03 16:53:15.997012	2026-07-03 16:53:15.997012
5602	\N	AWCI De Le Mar (Amadeo Weste Cavite Instituto de le Mar)	AWCI DE LE MAR AMADEO WESTE CAVITE INSTITUTO DE LE MAR	Grade 7-10 & Grade 11-12	Unknown	Amadeo	Cavite	B. Villanueva St. Brgy 8	14.1678087	120.9213654	Masterlist 2026	t	2026-07-03 16:53:15.997012	2026-07-03 16:53:15.997012
5603	\N	B.N. Calara Integrated National High School	BN CALARA INTEGRATED NATIONAL HIGH SCHOOL	Grade 7-10 & Grade 11-12	Unknown	Los Baños	Laguna	CARBERN VILLAGE ANOS, LOS BAÃ‘OS, LAGUNA	14.1518841	121.2526547	Masterlist 2026	t	2026-07-03 16:53:15.997012	2026-07-03 16:53:15.997012
5604	\N	Bagbag National High School	BAGBAG NATIONAL HIGH SCHOOL	Grade 7-10 & Grade 11-12	Unknown	Unspecified	Region IV-A	Dahlia Street	12.879721	121.774017	Masterlist 2026	t	2026-07-03 16:53:15.997012	2026-07-03 16:53:15.997012
5605	\N	Bagong Nayon II National High School	BAGONG NAYON II NATIONAL HIGH SCHOOL	Grade 7-10 & Grade 11-12	Unknown	Antipolo	Rizal	Bagong Nayon II, Padilla	14.6279416	121.162448	Masterlist 2026	t	2026-07-03 16:53:15.997012	2026-07-03 16:53:15.997012
5606	\N	Bagong Silang NHS	BAGONG SILANG NHS	Grade 7-10 & Grade 11-12	Unknown	Caloocan	Metro Manila	Bagong Silang	14.776898	121.0450627	Masterlist 2026	t	2026-07-03 16:53:15.997012	2026-07-03 16:53:15.997012
5607	\N	Bagumbong National High School	BAGUMBONG NATIONAL HIGH SCHOOL	Grade 7-10 & Grade 11-12	Unknown	Manila	Metro Manila	delos Santos St.	14.6029473	120.9908484	Masterlist 2026	t	2026-07-03 16:53:15.997012	2026-07-03 16:53:15.997012
5608	\N	Bagupaye  Integrated High School	BAGUPAYE INTEGRATED HIGH SCHOOL	Grade 7-10 & Grade 11-12	Unknown	Mulanay	Quezon	Bagupaye	13.5639271	122.415579	Masterlist 2026	t	2026-07-03 16:53:15.997012	2026-07-03 16:53:15.997012
5609	\N	Balayan Senior High School	BALAYAN SENIOR HIGH SCHOOL	Grade 11-12	Unknown	Balayan	Batangas	Caloocan, Balayan, Batangas	13.9520391	120.7183888	Masterlist 2026	t	2026-07-03 16:53:15.997012	2026-07-03 16:53:15.997012
5610	\N	Balesin Integrated School	BALESIN INTEGRATED SCHOOL	Kinder, Grade 1-6, Grade 7-10 & Grade 11-12	Unknown	Polillo	Quezon	Brgy. Balesin	14.4254837	122.0354462	Masterlist 2026	t	2026-07-03 16:53:15.997012	2026-07-03 16:53:15.997012
5611	\N	Balesin IS (Formerly Polillo NHS Extension)	BALESIN IS FORMERLY POLILLO NHS EXTENSION	Grade 7-10 & Grade 11-12	Unknown	Polillo	Quezon	Balesin	14.4254839	122.0354438	Masterlist 2026	t	2026-07-03 16:53:15.997012	2026-07-03 16:53:15.997012
5612	\N	Balete Integrated School	BALETE INTEGRATED SCHOOL	Grade 7-10 & Grade 11-12	Unknown	Balete	Aklan	Balete	11.5572691	122.3783334	Masterlist 2026	t	2026-07-03 16:53:15.997012	2026-07-03 16:53:15.997012
5613	\N	Balian Community College	BALIAN COMMUNITY COLLEGE	Grade 7-10 & Grade 11-12	Unknown	Pangil	Laguna	4018 Pangil, Laguna	14.3945377	121.4747022	Masterlist 2026	t	2026-07-03 16:53:15.997012	2026-07-03 16:53:15.997012
5614	\N	Balian Integrated National High School	BALIAN INTEGRATED NATIONAL HIGH SCHOOL	Grade 7-10 & Grade 11-12	Unknown	Pangil	Laguna		14.3939078	121.4757027	Masterlist 2026	t	2026-07-03 16:53:15.997012	2026-07-03 16:53:15.997012
5615	\N	Balibago Integrated High School	BALIBAGO INTEGRATED HIGH SCHOOL	Grade 7-10 & Grade 11-12	Unknown	Santa Rosa	Laguna	Kabesang Moldes St. Balibago	14.2976274	121.103825	Masterlist 2026	t	2026-07-03 16:53:16.003704	2026-07-03 16:53:16.003704
5616	\N	Bamban National High School	BAMBAN NATIONAL HIGH SCHOOL	Grade 7-10 & Grade 11-12	Unknown	San Clemente	Tarlac	Bamban	15.6789647	120.3339547	Masterlist 2026	t	2026-07-03 16:53:16.003704	2026-07-03 16:53:16.003704
5617	\N	Banaba West Integrated School	BANABA WEST INTEGRATED SCHOOL	Grade 7-10 & Grade 11-12	Unknown	Batangas City	Batangas	Banaba West	13.8056522	121.0544502	Masterlist 2026	t	2026-07-03 16:53:16.003704	2026-07-03 16:53:16.003704
5618	\N	Banahaw Institute	BANAHAW INSTITUTE	Grade 7-10 & Grade 11-12	Unknown	Magdalena	Laguna	J. P. Rizal	14.2008306	121.4300011	Masterlist 2026	t	2026-07-03 16:53:16.003704	2026-07-03 16:53:16.003704
5619	\N	Banahaw Technological College, Inc.	BANAHAW TECHNOLOGICAL COLLEGE INC	Grade 7-10 & Grade 11-12	Unknown	Lucban	Quezon	Lucban, Quezon	14.071684	121.5726295	Masterlist 2026	t	2026-07-03 16:53:16.003704	2026-07-03 16:53:16.003704
5620	\N	Banahaw View Academy, Inc.	BANAHAW VIEW ACADEMY INC	Grade 7-10 & Grade 11-12	Unknown	Lucban	Quezon		14.1088509	121.5540911	Masterlist 2026	t	2026-07-03 16:53:16.003704	2026-07-03 16:53:16.003704
5621	\N	Banca-Banca Integrated National High School	BANCABANCA INTEGRATED NATIONAL HIGH SCHOOL	Grade 7-10 & Grade 11-12	Unknown	Victoria	Laguna	Purok 3	14.2083974	121.351304	Masterlist 2026	t	2026-07-03 16:53:16.003704	2026-07-03 16:53:16.003704
5622	\N	BANNISTER ACADEMY CORP.	BANNISTER ACADEMY CORP	Kinder, Grade 1-6, Grade 7-10 & Grade 11-12	Unknown	Antipolo	Rizal	Brgy. Lot 8 Eastland Heights, Sitio Sapinit, Barangay San Juan, Antipolo City	14.657715	121.210667	Masterlist 2026	t	2026-07-03 16:53:16.003704	2026-07-03 16:53:16.003704
5623	\N	Banoyo Integrated National High School	BANOYO INTEGRATED NATIONAL HIGH SCHOOL	Grade 7-10 & Grade 11-12	Unknown	San Luis	Batangas	Banoyo, San Luis, Batangas	13.830902	120.9166305	Masterlist 2026	t	2026-07-03 16:53:16.003704	2026-07-03 16:53:16.003704
5624	\N	Bantad National High School	BANTAD NATIONAL HIGH SCHOOL	Grade 7-10 & Grade 11-12	Unknown	Gumaca	Quezon	Brgy.Bantad Gumaca,Quezon	13.8271306	122.1622419	Masterlist 2026	t	2026-07-03 16:53:16.003704	2026-07-03 16:53:16.003704
5625	\N	Bantulinao Integrated School	BANTULINAO INTEGRATED SCHOOL	Grade 7-10 & Grade 11-12	Unknown	Calauag	Quezon	Bantulinao	14.068925	122.2810753	Masterlist 2026	t	2026-07-03 16:53:16.003704	2026-07-03 16:53:16.003704
5626	\N	Baptist Voice Bible College	BAPTIST VOICE BIBLE COLLEGE	Kinder, Grade 1-6, Grade 7-10 & Grade 11-12	Unknown	Lucena City	Quezon	Citta Grande	13.9308402	121.6144064	Masterlist 2026	t	2026-07-03 16:53:16.003704	2026-07-03 16:53:16.003704
5627	\N	Barangay Longos Senior High School	BARANGAY LONGOS SENIOR HIGH SCHOOL	Grade 11-12	Unknown	Manila	Metro Manila	Concepcion St., Barangay Longos	14.6509976	120.9606061	Masterlist 2026	t	2026-07-03 16:53:16.003704	2026-07-03 16:53:16.003704
5628	\N	Baras Senior High School	BARAS SENIOR HIGH SCHOOL	Grade 11-12	Unknown	San Juan	Batangas	Kayrumaguit Road, Sitio Ibabaw, Brgy. San Juan	13.8255575	121.3945838	Masterlist 2026	t	2026-07-03 16:53:16.003704	2026-07-03 16:53:16.003704
5629	\N	Baras-Pinugay Integrated High School	BARASPINUGAY INTEGRATED HIGH SCHOOL	Grade 7-10 & Grade 11-12	Unknown	Baras	Rizal	Habitat St.	14.6042242	121.2594484	Masterlist 2026	t	2026-07-03 16:53:16.003704	2026-07-03 16:53:16.003704
5630	\N	Batangan National High School	BATANGAN NATIONAL HIGH SCHOOL	Grade 7-10 & Grade 11-12	Unknown	General Nakar	Quezon	Batangan	14.7254596	121.5993636	Masterlist 2026	t	2026-07-03 16:53:16.003704	2026-07-03 16:53:16.003704
5631	\N	Batangas Christian School	BATANGAS CHRISTIAN SCHOOL	Kinder, Grade 1-6, Grade 7-10 & Grade 11-12	Unknown	Batangas City	Batangas	De Joya Compound	13.7804543	121.0697993	Masterlist 2026	t	2026-07-03 16:53:16.003704	2026-07-03 16:53:16.003704
5632	\N	Batangas City Integrated High School	BATANGAS CITY INTEGRATED HIGH SCHOOL	Grade 7-10 & Grade 11-12	Unknown	Batangas City	Batangas	Rizal Avenue	13.7554667	121.0531781	Masterlist 2026	t	2026-07-03 16:53:16.003704	2026-07-03 16:53:16.003704
5633	\N	Batangas City South Senior High School	BATANGAS CITY SOUTH SENIOR HIGH SCHOOL	Grade 11-12	Unknown	Makati City	Metro Manila	Brgy. 7, Poblacion	14.5656805	121.0320766	Masterlist 2026	t	2026-07-03 16:53:16.003704	2026-07-03 16:53:16.003704
5634	\N	Batangas College of Arts and Sciences, Inc.	BATANGAS COLLEGE OF ARTS AND SCIENCES INC	Kinder, Grade 1-6, Grade 7-10 & Grade 11-12	Unknown	Lipa City	Batangas	-	13.9453372	121.1199493	Masterlist 2026	t	2026-07-03 16:53:16.003704	2026-07-03 16:53:16.003704
5635	\N	Batangas Eastern Colleges	BATANGAS EASTERN COLLEGES	Kinder, Grade 1-6, Grade 7-10 & Grade 11-12	Unknown	San Juan	Batangas	02 Javier	13.8286524	121.3957911	Masterlist 2026	t	2026-07-03 16:53:16.003704	2026-07-03 16:53:16.003704
5636	\N	Batangas Province High School Culture and Arts	BATANGAS PROVINCE HIGH SCHOOL CULTURE AND ARTS	Grade 7-10 & Grade 11-12	Unknown	Batangas City	Batangas	Provincial Sports Complex, Bolbok, Batangas City	13.7759184	121.0453799	Masterlist 2026	t	2026-07-03 16:53:16.003704	2026-07-03 16:53:16.003704
5637	\N	Batangas State University-Apolinario R. Apacible School of Fisheries-Nasugbu	BATANGAS STATE UNIVERSITYAPOLINARIO R APACIBLE SCHOOL OF FISHERIESNASUGBU	Kinder, Grade 1-6, Grade 7-10 & Grade 11-12	Unknown	Nasugbu	Batangas	Bucana	14.0626427	120.6271805	Masterlist 2026	t	2026-07-03 16:53:16.003704	2026-07-03 16:53:16.003704
5638	\N	Bauan Colleges Inc	BAUAN COLLEGES INC	Kinder, Grade 1-6, Grade 7-10 & Grade 11-12	Unknown	Bauan	Batangas	A. Buendia St.	13.7923628	121.0102734	Masterlist 2026	t	2026-07-03 16:53:16.003704	2026-07-03 16:53:16.003704
5640	\N	Bauan National and Vocational Integrated High School	BAUAN NATIONAL AND VOCATIONAL INTEGRATED HIGH SCHOOL	Grade 7-10 & Grade 11-12	Unknown	Bauan	Batangas	San Agustin, Bauan, Batangas	13.7936272	120.9489091	Masterlist 2026	t	2026-07-03 16:53:16.003704	2026-07-03 16:53:16.003704
5641	\N	Bauan Technical Integrated High School	BAUAN TECHNICAL INTEGRATED HIGH SCHOOL	Grade 7-10 & Grade 11-12	Unknown	Bauan	Batangas	Poblacion I, Bauan, Batangas	13.792626	121.00254	Masterlist 2026	t	2026-07-03 16:53:16.003704	2026-07-03 16:53:16.003704
5642	\N	Baybayin Integrated National High School	BAYBAYIN INTEGRATED NATIONAL HIGH SCHOOL	Grade 7-10 & Grade 11-12	Unknown	Rosario	Batangas	Baybayin, Rosario, Batangas	13.8259118	121.2597753	Masterlist 2026	t	2026-07-03 16:53:16.003704	2026-07-03 16:53:16.003704
5643	\N	Bayugo National High School	BAYUGO NATIONAL HIGH SCHOOL	Grade 7-10 & Grade 11-12	Unknown	Jala-jala	Rizal	T. Raagas St.	14.319313	121.3141291	Masterlist 2026	t	2026-07-03 16:53:16.003704	2026-07-03 16:53:16.003704
5644	\N	BBSI Christian Academy	BBSI CHRISTIAN ACADEMY	Kinder, Grade 1-6, Grade 7-10 & Grade 11-12	Unknown	Taytay	Rizal	Ortigas Ave. Ext., Kaytikling	14.5779791	121.1416201	Masterlist 2026	t	2026-07-03 16:53:16.003704	2026-07-03 16:53:16.003704
5645	\N	Beatitudes Technological & Theological College Imus Cavite Inc.	BEATITUDES TECHNOLOGICAL THEOLOGICAL COLLEGE IMUS CAVITE INC	Kinder, Grade 1-6, Grade 7-10 & Grade 11-12	Unknown	Imus	Cavite	680 Anabu I-E Imus City, Cavite	14.3927224	120.9411866	Masterlist 2026	t	2026-07-03 16:53:16.003704	2026-07-03 16:53:16.003704
5646	\N	Bendita Integrated High School	BENDITA INTEGRATED HIGH SCHOOL	Grade 7-10 & Grade 11-12	Unknown	Magallanes	Cavite	Kaytitinga-Magallanes Rd.,	14.1606213	120.7553296	Masterlist 2026	t	2026-07-03 16:53:16.003704	2026-07-03 16:53:16.003704
5647	\N	Benedictine Institute of Learning	BENEDICTINE INSTITUTE OF LEARNING	Kinder, Grade 1-6, Grade 7-10 & Grade 11-12	Unknown	Imus	Cavite	Abad Homes Subdivision	14.4309605	120.9308267	Masterlist 2026	t	2026-07-03 16:53:16.003704	2026-07-03 16:53:16.003704
5648	\N	Benjamin B. Esguerra Integrated School	BENJAMIN B ESGUERRA INTEGRATED SCHOOL	Grade 7-10 & Grade 11-12	Unknown	Taytay	Rizal	14 Camia St. Sta.Ana, Taytay, Rizal	14.566899	121.126547	Masterlist 2026	t	2026-07-03 16:53:16.003704	2026-07-03 16:53:16.003704
5649	\N	Berea Arts and Sciences High School	BEREA ARTS AND SCIENCES HIGH SCHOOL	Kinder, Grade 1-6, Grade 7-10 & Grade 11-12	Unknown	Cainta	Lalawigan ng Rizal	Ponce Street, Phase 7 Vista Verde Executive Village	14.6067455	121.1196276	Masterlist 2026	t	2026-07-03 16:53:16.003704	2026-07-03 16:53:16.003704
5650	\N	Bethel Academy of Gen. Trias Cavite	BETHEL ACADEMY OF GEN TRIAS CAVITE	Kinder, Grade 1-6, Grade 7-10 & Grade 11-12	Unknown	General Trias	Cavite	237	14.3792719	120.8824721	Masterlist 2026	t	2026-07-03 16:53:16.003704	2026-07-03 16:53:16.003704
5651	\N	BIÃ‘AN CITY SENIOR HIGH SCHOOL-TIMBAO CAMPUS	BIA‘AN CITY SENIOR HIGH SCHOOLTIMBAO CAMPUS	Grade 11-12	Unknown	Rodriguez	Rizal	La Solidaridad Estate Homes	14.7498896	121.1574106	Masterlist 2026	t	2026-07-03 16:53:16.003704	2026-07-03 16:53:16.003704
5652	\N	BiÃ±an City Science and Technology High School	BIA±AN CITY SCIENCE AND TECHNOLOGY HIGH SCHOOL	Grade 7-10 & Grade 11-12	Unknown	Unspecified	Region IV-A	Silmer Village	12.879721	121.774017	Masterlist 2026	t	2026-07-03 16:53:16.003704	2026-07-03 16:53:16.003704
5653	\N	BiÃ±an City Senior High School Sto. Tomas Campus	BIA±AN CITY SENIOR HIGH SCHOOL STO TOMAS CAMPUS	Grade 7-10 & Grade 11-12	Unknown	Biñan	Laguna	Tagbilaran St. South City HOmes Sto. Tomas, Binan City	14.3155259	121.0769437	Masterlist 2026	t	2026-07-03 16:53:16.003704	2026-07-03 16:53:16.003704
5654	\N	BiÃ±an City Senior High School-San Antonio Campus	BIA±AN CITY SENIOR HIGH SCHOOLSAN ANTONIO CAMPUS	Grade 11-12	Unknown	Biñan	Laguna	Pedro H. Escueta St. San Antonio, City of BiÃ±an, Laguna	14.3374771	121.0869764	Masterlist 2026	t	2026-07-03 16:53:16.003704	2026-07-03 16:53:16.003704
5655	\N	BiÃ±an City Senior High School-West Campus	BIA±AN CITY SENIOR HIGH SCHOOLWEST CAMPUS	Grade 11-12	Unknown	Biñan	Laguna	Langkiwa, BiÃ±an City	14.2982203	121.0580686	Masterlist 2026	t	2026-07-03 16:53:16.003704	2026-07-03 16:53:16.003704
5656	\N	BiÃ±an Integrated National High School	BIA±AN INTEGRATED NATIONAL HIGH SCHOOL	Grade 7-10 & Grade 11-12	Unknown	Santo Domingo	Ilocos Sur	Sto. Domingo	17.6393321	120.4097693	Masterlist 2026	t	2026-07-03 16:53:16.003704	2026-07-03 16:53:16.003704
5657	\N	BiÃ±an Pagsanjan Senior High School	BIA±AN PAGSANJAN SENIOR HIGH SCHOOL	Grade 11-12	Unknown	Pagsanjan	Laguna	`	14.2430809	121.4464189	Masterlist 2026	t	2026-07-03 16:53:16.003704	2026-07-03 16:53:16.003704
5658	\N	BiÃ±an Senior High School Timbao Campus	BIA±AN SENIOR HIGH SCHOOL TIMBAO CAMPUS	Grade 11-12	Unknown	Biñan	Laguna	La Solidaridad Estates, Timbao Binan City	14.2897252	121.0539079	Masterlist 2026	t	2026-07-03 16:53:16.003704	2026-07-03 16:53:16.003704
5659	\N	Biblica La Delle Academy, Inc.	BIBLICA LA DELLE ACADEMY INC	Kinder, Grade 1-6, Grade 7-10 & Grade 11-12	Unknown	Alfonso	Cavite	Marahan II	14.133964	120.849888	Masterlist 2026	t	2026-07-03 16:53:16.003704	2026-07-03 16:53:16.003704
5660	\N	Bigaa Integrated National High School	BIGAA INTEGRATED NATIONAL HIGH SCHOOL	Grade 7-10 & Grade 11-12	Unknown	Cabuyao City	Laguna	-Purok 5 Bigaa, Cabuyao Laguna	14.291325	121.1289377	Masterlist 2026	t	2026-07-03 16:53:16.003704	2026-07-03 16:53:16.003704
5661	\N	Bigain Integrated School	BIGAIN INTEGRATED SCHOOL	Grade 7-10 & Grade 11-12	Unknown	San Jose	Batangas	Bigain South, San Jose, Batangas	13.8895159	121.0663347	Masterlist 2026	t	2026-07-03 16:53:16.003704	2026-07-03 16:53:16.003704
5662	\N	Bignay National High School	BIGNAY NATIONAL HIGH SCHOOL	Grade 7-10 & Grade 11-12	Unknown	Sariaya	Quezon	Bignay 2	13.8477436	121.4716833	Masterlist 2026	t	2026-07-03 16:53:16.003704	2026-07-03 16:53:16.003704
5663	\N	Bilogo Integrated National High School	BILOGO INTEGRATED NATIONAL HIGH SCHOOL	Grade 7-10 & Grade 11-12	Unknown	Taysan	Batangas	Bilogo, Taysan, Batangas	13.7550667	121.1796292	Masterlist 2026	t	2026-07-03 16:53:16.003704	2026-07-03 16:53:16.003704
5664	\N	Binagbag Integrated High School	BINAGBAG INTEGRATED HIGH SCHOOL	Grade 7-10 & Grade 11-12	Unknown	Angat	Bulacan	Binagbag	14.9509668	121.0235106	Masterlist 2026	t	2026-07-03 16:53:16.003704	2026-07-03 16:53:16.003704
5665	\N	Binahaan Integrated School	BINAHAAN INTEGRATED SCHOOL	Kinder, Grade 1-6, Grade 7-10 & Grade 11-12	Unknown	Pagbilao	Quezon	National Road	13.9889117	121.75756	Masterlist 2026	t	2026-07-03 16:53:16.010065	2026-07-03 16:53:16.010065
5666	\N	Binangonan Catholic College	BINANGONAN CATHOLIC COLLEGE	Kinder, Grade 1-6, Grade 7-10 & Grade 11-12	Unknown	Binangonan	Rizal	Libid	14.4648886	121.1928255	Masterlist 2026	t	2026-07-03 16:53:16.010065	2026-07-03 16:53:16.010065
5668	\N	Binangonan Garden of Learners	BINANGONAN GARDEN OF LEARNERS	Kinder, Grade 1-6, Grade 7-10 & Grade 11-12	Unknown	Binangonan	Rizal	290 Sta. Ursula Subd. Batingan	14.4740131	121.196431	Masterlist 2026	t	2026-07-03 16:53:16.010065	2026-07-03 16:53:16.010065
5669	\N	BINANGONAN INTEGRATED NATIONAL HIGH SCHOOL	BINANGONAN INTEGRATED NATIONAL HIGH SCHOOL	Grade 7-10 & Grade 11-12	Unknown	Binangonan	Rizal	C. Bolado Avenue, Barangay Tatala, Binangonan Rizal	14.4840218	121.2074694	Masterlist 2026	t	2026-07-03 16:53:16.010065	2026-07-03 16:53:16.010065
5670	\N	Binulasan Integrated School	BINULASAN INTEGRATED SCHOOL	Kinder, Grade 1-6, Grade 7-10 & Grade 11-12	Unknown	Infanta	Quezon	Brgy. Binulasan, Infanta, Quezon	14.7316046	121.6984139	Masterlist 2026	t	2026-07-03 16:53:16.010065	2026-07-03 16:53:16.010065
5671	\N	Binulasan IS	BINULASAN IS	Kinder, Grade 1-6, Grade 7-10 & Grade 11-12	Unknown	Infanta	Quezon	Purok Langka	14.7340957	121.6938932	Masterlist 2026	t	2026-07-03 16:53:16.010065	2026-07-03 16:53:16.010065
5672	\N	Bitin NHS	BITIN NHS	Grade 7-10 & Grade 11-12	Unknown	Manila	Metro Manila	Rizal Avenue	14.6143876	120.9826056	Masterlist 2026	t	2026-07-03 16:53:16.010065	2026-07-03 16:53:16.010065
5673	\N	Bixby Knolls Preparatory Academy	BIXBY KNOLLS PREPARATORY ACADEMY	Kinder, Grade 1-6, Grade 7-10 & Grade 11-12	Unknown	San Antonio	Quezon	Brgy. Loob, San Antonio, Quezon	13.8866227	121.2811785	Masterlist 2026	t	2026-07-03 16:53:16.010065	2026-07-03 16:53:16.010065
5674	\N	Blessed Christ Child Montessori Foundation	BLESSED CHRIST CHILD MONTESSORI FOUNDATION	Kinder, Grade 1-6, Grade 7-10 & Grade 11-12	Unknown	Manila	Metro Manila	Brgy. Calzada Ermita	14.5860743	120.9825154	Masterlist 2026	t	2026-07-03 16:53:16.010065	2026-07-03 16:53:16.010065
5675	\N	Blessed Christian School de Sta. Rosa	BLESSED CHRISTIAN SCHOOL DE STA ROSA	Kinder, Grade 1-6, Grade 7-10 & Grade 11-12	Unknown	City of Santa Rosa	Laguna	Rizal Blvd., Balibago	14.297435	121.107278	Masterlist 2026	t	2026-07-03 16:53:16.010065	2026-07-03 16:53:16.010065
5676	\N	Blessed Hope Christian School	BLESSED HOPE CHRISTIAN SCHOOL	Kinder, Grade 1-6, Grade 7-10 & Grade 11-12	Unknown	Tanay	Rizal	M H DEL PILAR ST	14.5049767	121.2817458	Masterlist 2026	t	2026-07-03 16:53:16.010065	2026-07-03 16:53:16.010065
5677	\N	Blessed James Cusmano Academy	BLESSED JAMES CUSMANO ACADEMY	Kinder, Grade 1-6, Grade 7-10 & Grade 11-12	Unknown	Mabitac	Laguna	BRGY. SAN ANTONIO MABITAC, LAGUNA	14.4504123	121.4224521	Masterlist 2026	t	2026-07-03 16:53:16.010065	2026-07-03 16:53:16.010065
5678	\N	Blessed Maria Cristina Brando School	BLESSED MARIA CRISTINA BRANDO SCHOOL	Kinder, Grade 1-6, Grade 7-10 & Grade 11-12	Unknown	General Trias	Cavite	419 Arnaldo Highway	14.3394549	120.9075826	Masterlist 2026	t	2026-07-03 16:53:16.010065	2026-07-03 16:53:16.010065
5679	\N	Blessed Marian Academy Kingsville, Inc.	BLESSED MARIAN ACADEMY KINGSVILLE INC	Kinder & Grade 11-12	Unknown	Unspecified	Region IV-A	Kingsville Subdivision Gate 2, Marcos Highway	12.879721	121.774017	Masterlist 2026	t	2026-07-03 16:53:16.010065	2026-07-03 16:53:16.010065
5680	\N	Blessings in the Word Fellowship School Inc.	BLESSINGS IN THE WORD FELLOWSHIP SCHOOL INC	Kinder, Grade 1-6, Grade 7-10 & Grade 11-	Unknown	Tagaytay City	Cavite	Kaybagal South, Tagaytay City	14.1036003	120.9406598	Masterlist 2026	t	2026-07-03 16:53:16.010065	2026-07-03 16:53:16.010065
5681	\N	Boater's Wheel Educational System and Technology College	BOATER'S WHEEL EDUCATIONAL SYSTEM AND TECHNOLOGY COLLEGE	Grade 7-10 & Grade 11-12	Unknown	Lucena City	Quezon	Gomez Extension, Lucena City, Quezon	13.9380141	121.6128364	Masterlist 2026	t	2026-07-03 16:53:16.010065	2026-07-03 16:53:16.010065
5682	\N	BOLBOK INTEGRATED NATIONAL HIGH SCHOOL	BOLBOK INTEGRATED NATIONAL HIGH SCHOOL	Grade 7-10 & Grade 11-12	Unknown	Lipa City	Batangas		13.9215164	121.1456864	Masterlist 2026	t	2026-07-03 16:53:16.010065	2026-07-03 16:53:16.010065
5683	\N	Bonbon National High School (Formerly Libo NHS-Bonbon Annex)	BONBON NATIONAL HIGH SCHOOL FORMERLY LIBO NHSBONBON ANNEX	Grade 7-10 & Grade 11-12	Unknown	Cebu City	Cebu	Bonbon	10.3676	123.8318886	Masterlist 2026	t	2026-07-03 16:53:16.010065	2026-07-03 16:53:16.010065
5684	\N	Bondoc Peninsula Agri. HS	BONDOC PENINSULA AGRI HS	Grade 7-10 & Grade 11-12	Unknown	City of Santa Rosa	Laguna	Sta. Rosa	14.3147078	121.1123219	Masterlist 2026	t	2026-07-03 16:53:16.010065	2026-07-03 16:53:16.010065
5685	\N	Bondoc Peninsula Institute Inc.	BONDOC PENINSULA INSTITUTE INC	Grade 7-10 & Grade 11-12	Unknown	San Francisco (Aurora)	Quezon	P.Aguila Street, Poblacion San Francisco, Quezon	13.3470576	122.520188	Masterlist 2026	t	2026-07-03 16:53:16.010065	2026-07-03 16:53:16.010065
5686	\N	Bonifacio National High School	BONIFACIO NATIONAL HIGH SCHOOL	Grade 7-10 & Grade 11-12	Unknown	Bonifacio	Misamis Occidental	Bonifacio	8.0497088	123.5658778	Masterlist 2026	t	2026-07-03 16:53:16.010065	2026-07-03 16:53:16.010065
5687	\N	Bubuyan Integrated School	BUBUYAN INTEGRATED SCHOOL	Grade 7-10 & Grade 11-12	Unknown	Calamba	Laguna	Bubuyan Road	14.1721309	121.1043166	Masterlist 2026	t	2026-07-03 16:53:16.010065	2026-07-03 16:53:16.010065
5688	\N	Bucal National Integrated School	BUCAL NATIONAL INTEGRATED SCHOOL	Grade 7-10 & Grade 11-12	Unknown	Maragondon	Cavite	Bucal II, Maragondon,Cavite	14.2734657	120.7538808	Masterlist 2026	t	2026-07-03 16:53:16.010065	2026-07-03 16:53:16.010065
5689	\N	Buenaventura Alandy National High School	BUENAVENTURA ALANDY NATIONAL HIGH SCHOOL	Grade 7-10 & Grade 11-12	Unknown	City of Tayabas	Quezon	Barangay Ibabang Bukal	14.0003207	121.5697859	Masterlist 2026	t	2026-07-03 16:53:16.010065	2026-07-03 16:53:16.010065
5690	\N	Buenaventura E. Fundialan Memorial Integrated National High School	BUENAVENTURA E FUNDIALAN MEMORIAL INTEGRATED NATIONAL HIGH SCHOOL	Grade 7-10 & Grade 11-12	Unknown	Alaminos	Laguna	San Agustin, Alaminos, Laguna	14.0605953	121.2658815	Masterlist 2026	t	2026-07-03 16:53:16.010065	2026-07-03 16:53:16.010065
5691	\N	Buenavista Integrated National High School	BUENAVISTA INTEGRATED NATIONAL HIGH SCHOOL	Grade 7-10 & Grade 11-12	Unknown	Los Baños	Laguna	Cigaras,Magdalena,Laguna	14.1518841	121.2526547	Masterlist 2026	t	2026-07-03 16:53:16.010065	2026-07-03 16:53:16.010065
5692	\N	Buenavista NHS	BUENAVISTA NHS	Grade 7-10 & Grade 11-12	Unknown	Buenavista	Quezon	Lilukin	13.7525803	122.4438929	Masterlist 2026	t	2026-07-03 16:53:16.010065	2026-07-03 16:53:16.010065
5693	\N	Bugarin National High School	BUGARIN NATIONAL HIGH SCHOOL	Grade 7-10 & Grade 11-12	Unknown	Unspecified	Region IV-A	National Road Sitio Bugarin	12.879721	121.774017	Masterlist 2026	t	2026-07-03 16:53:16.010065	2026-07-03 16:53:16.010065
5694	\N	Bugtongnapulo Integrated National High School	BUGTONGNAPULO INTEGRATED NATIONAL HIGH SCHOOL	Grade 7-10 & Grade 11-12	Unknown	Lipa City	Batangas	-	13.9999288	121.1687976	Masterlist 2026	t	2026-07-03 16:53:16.010065	2026-07-03 16:53:16.010065
5695	\N	Buhaynasapa Integrated National High School	BUHAYNASAPA INTEGRATED NATIONAL HIGH SCHOOL	Grade 7-10 & Grade 11-12	Unknown	San Juan	Batangas	Buhay na Sapa, San Juan, Batangas	13.7903575	121.4027574	Masterlist 2026	t	2026-07-03 16:53:16.010065	2026-07-03 16:53:16.010065
5696	\N	Bukal Integrated National High School	BUKAL INTEGRATED NATIONAL HIGH SCHOOL	Grade 7-10 & Grade 11-12	Unknown	Padre Garcia	Batangas	Bukal, Padre Garcia, Batangas	13.8745265	121.2158626	Masterlist 2026	t	2026-07-03 16:53:16.010065	2026-07-03 16:53:16.010065
5697	\N	Bukal Sur National High School	BUKAL SUR NATIONAL HIGH SCHOOL	Grade 7-10 & Grade 11-12	Unknown	Candelaria	Quezon	Buenavista West	13.9124215	121.3916283	Masterlist 2026	t	2026-07-03 16:53:16.010065	2026-07-03 16:53:16.010065
5698	\N	Bulacnin Integrated NHS	BULACNIN INTEGRATED NHS	Grade 7-10 & Grade 11-12	Unknown	Lipa City	Batangas	-	13.9910587	121.1452643	Masterlist 2026	t	2026-07-03 16:53:16.010065	2026-07-03 16:53:16.010065
5699	\N	Bulihan Integrated National High School	BULIHAN INTEGRATED NATIONAL HIGH SCHOOL	Grade 7-10 & Grade 11-12	Unknown	Silang	Cavite		14.2813243	120.9976694	Masterlist 2026	t	2026-07-03 16:53:16.010065	2026-07-03 16:53:16.010065
5700	\N	Bulihan Integrated Senior High School	BULIHAN INTEGRATED SENIOR HIGH SCHOOL	Grade 7-10 & Grade 11-12	Unknown	Rosario	Batangas	Bulihan, Rosario, Batangas	13.8009603	121.2289998	Masterlist 2026	t	2026-07-03 16:53:16.010065	2026-07-03 16:53:16.010065
5701	\N	Bunggo Integrated School	BUNGGO INTEGRATED SCHOOL	Grade 7-10 & Grade 11-12	Unknown	Bunggo		Bunggo Road	14.1568959	121.0664044	Masterlist 2026	t	2026-07-03 16:53:16.010065	2026-07-03 16:53:16.010065
5702	\N	Burdeos NHS (Judith NHS)	BURDEOS NHS JUDITH NHS	Grade 7-10 & Grade 11-12	Unknown	Burdeos	Quezon	Sabang Road	14.8480501	121.9735225	Masterlist 2026	t	2026-07-03 16:53:16.010065	2026-07-03 16:53:16.010065
5703	\N	BURGOS INTEGRATED HIGH SCHOOL	BURGOS INTEGRATED HIGH SCHOOL	Grade 7-10 & Grade 11-12	Unknown	Naic	Cavite	Sitio Inawitan Kanluran	14.3163758	120.7650058	Masterlist 2026	t	2026-07-03 16:53:16.010065	2026-07-03 16:53:16.010065
5704	\N	Busdak NHS (Formerly Busdak NHS - Patnanungan NHS Annex)	BUSDAK NHS FORMERLY BUSDAK NHS PATNANUNGAN NHS ANNEX	Grade 7-10 & Grade 11-12	Unknown	Patnanungan	Quezon	Busdak	14.7933642	122.2114952	Masterlist 2026	t	2026-07-03 16:53:16.010065	2026-07-03 16:53:16.010065
5705	\N	Butanguiad NHS	BUTANGUIAD NHS	Grade 7-10 & Grade 11-12	Unknown	San Francisco (Aurora)	Quezon	Butanguiad	13.2462418	122.531617	Masterlist 2026	t	2026-07-03 16:53:16.010065	2026-07-03 16:53:16.010065
5706	\N	Cabay NHS	CABAY NHS	Grade 7-10 & Grade 11-12	Unknown	Tiaong	Quezon	Cabay	13.8874838	121.3684577	Masterlist 2026	t	2026-07-03 16:53:16.010065	2026-07-03 16:53:16.010065
5707	\N	Cabibihan National High School	CABIBIHAN NATIONAL HIGH SCHOOL	Grade 7-10 & Grade 11-12	Unknown	Tagkawayan	Quezon	Bataller-Mendoza Hill	14.0245116	122.5300252	Masterlist 2026	t	2026-07-03 16:53:16.010065	2026-07-03 16:53:16.010065
5708	\N	Cabong NHS	CABONG NHS	Grade 7-10 & Grade 11-12	Unknown	City of Borongan	Eastern Samar	Cabong	11.5784039	125.4439507	Masterlist 2026	t	2026-07-03 16:53:16.010065	2026-07-03 16:53:16.010065
5709	\N	Cabulihan NHS	CABULIHAN NHS	Grade 7-10 & Grade 11-12	Unknown	Pitogo	Quezon	Cabulihan	13.8019911	122.0354438	Masterlist 2026	t	2026-07-03 16:53:16.010065	2026-07-03 16:53:16.010065
5710	\N	Cabuyao Institute of Technology	CABUYAO INSTITUTE OF TECHNOLOGY	Grade 11-12	Unknown	Cabuyao City	Laguna	Enterprise Park, Banay-banay	14.2551964	121.1384144	Masterlist 2026	t	2026-07-03 16:53:16.010065	2026-07-03 16:53:16.010065
5711	\N	Cabuyao Integrated National High School	CABUYAO INTEGRATED NATIONAL HIGH SCHOOL	Grade 7-10 & Grade 11-12	Unknown	Cabuyao City	Laguna	Limcaoco Subd. Brgy. Tres, Cabuyao City, Laguna	14.275129	121.126703	Masterlist 2026	t	2026-07-03 16:53:16.010065	2026-07-03 16:53:16.010065
5712	\N	Cagbalete Island National High School	CAGBALETE ISLAND NATIONAL HIGH SCHOOL	Grade 7-10 & Grade 11-12	Unknown	Mauban	Quezon	Cagbalete I	14.2574856	121.8218069	Masterlist 2026	t	2026-07-03 16:53:16.010065	2026-07-03 16:53:16.010065
5713	\N	Cagsiay I National High School	CAGSIAY I NATIONAL HIGH SCHOOL	Grade 7-10 & Grade 11-12	Unknown	Mauban	Quezon	Mauban National Road	14.2213656	121.7462664	Masterlist 2026	t	2026-07-03 16:53:16.010065	2026-07-03 16:53:16.010065
5714	\N	Cagsiay III NHS	CAGSIAY III NHS	Grade 7-10 & Grade 11-12	Unknown	Mauban	Quezon	Centro	14.3675176	121.6511258	Masterlist 2026	t	2026-07-03 16:53:16.010065	2026-07-03 16:53:16.010065
5715	\N	Caigdal National High School	CAIGDAL NATIONAL HIGH SCHOOL	Grade 7-10 & Grade 11-12	Unknown	Unisan	Quezon	Brgy. Caigdal	13.8331661	122.0275397	Masterlist 2026	t	2026-07-03 16:53:16.015773	2026-07-03 16:53:16.015773
5716	\N	Cainta Senior High School	CAINTA SENIOR HIGH SCHOOL	Grade 11-12	Unknown	Cainta	Rizal	SITIO VICTORIA	14.5726133	121.1224057	Masterlist 2026	t	2026-07-03 16:53:16.015773	2026-07-03 16:53:16.015773
5717	\N	Calaca Senior High School	CALACA SENIOR HIGH SCHOOL	Grade 11-12	Unknown	Calaca	Batangas	Madalunot, Calaca City, Batangas	13.9400023	120.8174098	Masterlist 2026	t	2026-07-03 16:53:16.015773	2026-07-03 16:53:16.015773
5718	\N	Calamba Bayside  Integrated  School	CALAMBA BAYSIDE INTEGRATED SCHOOL	Grade 7-10 & Grade 11-12	Unknown	Calamba	Laguna	Mt. Halcon St.	14.2156165	121.186161	Masterlist 2026	t	2026-07-03 16:53:16.015773	2026-07-03 16:53:16.015773
5719	\N	Calamba City School for the Arts	CALAMBA CITY SCHOOL FOR THE ARTS	Grade 7-10 & Grade 11-12	Unknown	Calamba	Laguna	Chipeco Ave., Brgy. III, Calamba City	14.2076319	121.1625367	Masterlist 2026	t	2026-07-03 16:53:16.015773	2026-07-03 16:53:16.015773
5720	\N	Calamba City Science Integrated School	CALAMBA CITY SCIENCE INTEGRATED SCHOOL	Grade 7-10 & Grade 11-12	Unknown	Calamba	Laguna	Chipeco Ave, Brgy 3, Calamba City	14.2073689	121.1622332	Masterlist 2026	t	2026-07-03 16:53:16.015773	2026-07-03 16:53:16.015773
5721	\N	Calamba City Senior High School	CALAMBA CITY SENIOR HIGH SCHOOL	Grade 11-12	Unknown	Calamba	Laguna	Chipeco Ave, Brgy 3	14.208536	121.1610876	Masterlist 2026	t	2026-07-03 16:53:16.015773	2026-07-03 16:53:16.015773
5722	\N	Calamba Doctors' College	CALAMBA DOCTORS' COLLEGE	Grade 11-12	Unknown	Calamba	Laguna	Virborough Subdivision, Barangay Parian, Calamba City, Laguna	14.2162461	121.1433805	Masterlist 2026	t	2026-07-03 16:53:16.015773	2026-07-03 16:53:16.015773
5723	\N	Calamba Integrated School	CALAMBA INTEGRATED SCHOOL	Grade 7-10 & Grade 11-12	Unknown	Calamba	Laguna	Gitnang Bukid, Brrgy.  Banadero, Calamba City	14.2200353	121.1646359	Masterlist 2026	t	2026-07-03 16:53:16.015773	2026-07-03 16:53:16.015773
5724	\N	Calangay Integrated High School	CALANGAY INTEGRATED HIGH SCHOOL	Grade 7-10 & Grade 11-12	Unknown	San Nicolas	Batangas	Main Barangay Road	13.9186506	120.9424541	Masterlist 2026	t	2026-07-03 16:53:16.015773	2026-07-03 16:53:16.015773
5725	\N	Calantas NHS	CALANTAS NHS	Grade 7-10 & Grade 11-12	Unknown	Floridablanca	Pampanga	Calantas	15.0133206	120.5120766	Masterlist 2026	t	2026-07-03 16:53:16.015773	2026-07-03 16:53:16.015773
5726	\N	Calantas Senior High School	CALANTAS SENIOR HIGH SCHOOL	Grade 11-12	Unknown	Rosario	Batangas	Calantas, Rosario, Batangas	13.7379949	121.3038992	Masterlist 2026	t	2026-07-03 16:53:16.015773	2026-07-03 16:53:16.015773
5727	\N	Calasumanga NHS (Formerly San Juan NHS - Calasumanga Ext.)	CALASUMANGA NHS FORMERLY SAN JUAN NHS CALASUMANGA EXT	Grade 7-10 & Grade 11-12	Unknown	Panukulan	Quezon	Calasumanga	14.9066777	121.8619539	Masterlist 2026	t	2026-07-03 16:53:16.015773	2026-07-03 16:53:16.015773
5728	\N	Calatagan Senior High School	CALATAGAN SENIOR HIGH SCHOOL	Grade 11-12	Unknown	Calatagan	Batangas	Lacaba St., Poblacion 2, Calatagan, Batangas	13.8332571	120.6301304	Masterlist 2026	t	2026-07-03 16:53:16.015773	2026-07-03 16:53:16.015773
5729	\N	Calauag Central College Inc.	CALAUAG CENTRAL COLLEGE INC	Grade 1-6, Grade 7-10 & Grade 11-12	Unknown	Calauag	Quezon	Rizal St. cor. Arguelles St.	14.1157163	122.2427	Masterlist 2026	t	2026-07-03 16:53:16.015773	2026-07-03 16:53:16.015773
5731	\N	Calauag NHS	CALAUAG NHS	Grade 7-10 & Grade 11-12	Unknown	Santa Maria	Bulacan	Maharlika Highway, Brgy. Sta. Maria	14.7952348	120.94591	Masterlist 2026	t	2026-07-03 16:53:16.015773	2026-07-03 16:53:16.015773
5732	\N	Calauan Community College	CALAUAN COMMUNITY COLLEGE	Grade 11-12	Unknown	Calauan	Laguna	Bgry. Lamot 2, Calauan, Laguna, Calauan, Laguna	14.1661028	121.3347805	Masterlist 2026	t	2026-07-03 16:53:16.015773	2026-07-03 16:53:16.015773
5733	\N	Calawis National High School	CALAWIS NATIONAL HIGH SCHOOL	Grade 7-10 & Grade 11-12	Unknown	Mandaluyong City	Metro Manila	Sitio Paikulan Brgy. Calawis	14.6851389	121.2434444	Masterlist 2026	t	2026-07-03 16:53:16.015773	2026-07-03 16:53:16.015773
5734	\N	California Academy for Lilminius (CAL), Inc.	CALIFORNIA ACADEMY FOR LILMINIUS CAL INC	Kinder & Grade 11-12	Unknown	Unspecified	Region IV-A	2450 Road 1, Inday Subdivision	12.879721	121.774017	Masterlist 2026	t	2026-07-03 16:53:16.015773	2026-07-03 16:53:16.015773
5735	\N	Callejon NHS	CALLEJON NHS	Grade 7-10 & Grade 11-12	Unknown	San Antonio	Quezon	Callejon	13.8753429	121.3455856	Masterlist 2026	t	2026-07-03 16:53:16.015773	2026-07-03 16:53:16.015773
5736	\N	Calminue Integrated National High School	CALMINUE INTEGRATED NATIONAL HIGH SCHOOL	Grade 7-10 & Grade 11-12	Unknown	Unspecified	Region IV-A	Sitio Calminue	12.879721	121.774017	Masterlist 2026	t	2026-07-03 16:53:16.015773	2026-07-03 16:53:16.015773
5737	\N	Calubcub I Senior High School	CALUBCUB I SENIOR HIGH SCHOOL	Grade 11-12	Unknown	San Juan	Batangas	Calubcub 1.0, San Juan, Batangas	13.7517933	121.4215844	Masterlist 2026	t	2026-07-03 16:53:16.015773	2026-07-03 16:53:16.015773
5738	\N	Calumpang Integrated National High School	CALUMPANG INTEGRATED NATIONAL HIGH SCHOOL	Grade 7-10 & Grade 11-12	Unknown	Indang	Cavite	Calumpang Cerca, Indang	14.2105183	120.8699908	Masterlist 2026	t	2026-07-03 16:53:16.015773	2026-07-03 16:53:16.015773
5739	\N	Camohaguin National High School	CAMOHAGUIN NATIONAL HIGH SCHOOL	Grade 7-10 & Grade 11-12	Unknown	Pavia	Iloilo	Purok 2	10.7756095	122.539749	Masterlist 2026	t	2026-07-03 16:53:16.015773	2026-07-03 16:53:16.015773
5740	\N	Camp Vicente Lim Integrated School	CAMP VICENTE LIM INTEGRATED SCHOOL	Grade 7-10 & Grade 11-12	Unknown	Calamba	Laguna	Camp Vicente Lim	14.2155683	121.1231111	Masterlist 2026	t	2026-07-03 16:53:16.015773	2026-07-03 16:53:16.015773
5741	\N	Canda National High School	CANDA NATIONAL HIGH SCHOOL	Grade 7-10 & Grade 11-12	Unknown	Lal-lo	Cagayan	Sitio Centro	18.20141	121.662772	Masterlist 2026	t	2026-07-03 16:53:16.015773	2026-07-03 16:53:16.015773
5742	\N	Canlubang Integrated School	CANLUBANG INTEGRATED SCHOOL	Grade 7-10 & Grade 11-12	Unknown	Calamba	Laguna	Sta Regina Homes Subd. Mangumit II	14.2028283	121.055959	Masterlist 2026	t	2026-07-03 16:53:16.015773	2026-07-03 16:53:16.015773
5743	\N	Canossa Academy	CANOSSA ACADEMY	Grade 11-12	Unknown	Lipa City	Batangas	San Lorenzo Ruiz St., San Carlos, Lipa City, Batangas	13.9468669	121.1470031	Masterlist 2026	t	2026-07-03 16:53:16.015773	2026-07-03 16:53:16.015773
5744	\N	Canossa College - San Pablo City	CANOSSA COLLEGE SAN PABLO CITY	Grade 11-12	Unknown	San Pablo	Laguna	Lakeside Park Subdivision, San Pablo City, Laguna	14.0771471	121.3221388	Masterlist 2026	t	2026-07-03 16:53:16.015773	2026-07-03 16:53:16.015773
5745	\N	Canumay NHS	CANUMAY NHS	Grade 7-10 & Grade 11-12	Unknown	Valenzuela	Metro Manila	Purok Canumay, Sitio San Ysiro	14.7113035	120.9840996	Masterlist 2026	t	2026-07-03 16:53:16.015773	2026-07-03 16:53:16.015773
5746	\N	Capellan Institute of Technology-San Pablo City	CAPELLAN INSTITUTE OF TECHNOLOGYSAN PABLO CITY	Grade 11-12	Unknown	San Pablo City	Laguna	L. Cosico Avenue, Brgy. I-A, San Pablo City, Laguna	14.0737259	121.316432	Masterlist 2026	t	2026-07-03 16:53:16.015773	2026-07-03 16:53:16.015773
5747	\N	CARD-MRI Development Institute	CARDMRI DEVELOPMENT INSTITUTE	Grade 11-12	Unknown	Bay	Laguna	Barangay Tranca, Bay, Laguna	14.1298528	121.2600069	Masterlist 2026	t	2026-07-03 16:53:16.015773	2026-07-03 16:53:16.015773
5749	\N	Cardona Senior High School	CARDONA SENIOR HIGH SCHOOL	Grade 11-12	Unknown	Cardona	Rizal	Estacio Blvd.	14.4829606	121.2332538	Masterlist 2026	t	2026-07-03 16:53:16.015773	2026-07-03 16:53:16.015773
5750	\N	Carlos "Botong"  V. Francisco Memorial National High School	CARLOS "BOTONG" V FRANCISCO MEMORIAL NATIONAL HIGH SCHOOL	Grade 7-10 & Grade 11-12	Unknown	Unspecified	Region IV-A	Grand Valley Phase IV	12.879721	121.774017	Masterlist 2026	t	2026-07-03 16:53:16.015773	2026-07-03 16:53:16.015773
5751	\N	Casay National High School	CASAY NATIONAL HIGH SCHOOL	Grade 7-10 & Grade 11-12	Unknown	Dalaguete	Cebu	Sitio Centro Brgy. Casay	9.8218318	123.5485772	Masterlist 2026	t	2026-07-03 16:53:16.015773	2026-07-03 16:53:16.015773
5752	\N	Casile Integrated National High School	CASILE INTEGRATED NATIONAL HIGH SCHOOL	Grade 7-10 & Grade 11-12	Unknown	Cabuyao City	Laguna	-Purok 2	14.1699734	121.0192557	Masterlist 2026	t	2026-07-03 16:53:16.015773	2026-07-03 16:53:16.015773
5753	\N	CastaÃ±as NHS	CASTAA±AS NHS	Grade 7-10 & Grade 11-12	Unknown	Unspecified	Region IV-A	CastaÃ±as	12.879721	121.774017	Masterlist 2026	t	2026-07-03 16:53:16.015773	2026-07-03 16:53:16.015773
5754	\N	Catalino D. Salazar National High School-Senior High School	CATALINO D SALAZAR NATIONAL HIGH SCHOOLSENIOR HIGH SCHOOL	Grade 7-10 & Grade 11-12	Unknown	Cardona	Rizal	J.P. Rizal Street	14.4029077	121.2296374	Masterlist 2026	t	2026-07-03 16:53:16.015773	2026-07-03 16:53:16.015773
5755	\N	Catanauan National High School	CATANAUAN NATIONAL HIGH SCHOOL	Grade 7-10 & Grade 11-12	Unknown	Catanauan	Quezon	Tagbacan Ibaba	13.5989557	122.3363793	Masterlist 2026	t	2026-07-03 16:53:16.015773	2026-07-03 16:53:16.015773
5756	\N	Cavinti Integrated National High School	CAVINTI INTEGRATED NATIONAL HIGH SCHOOL	Grade 7-10 & Grade 11-12	Unknown	Cavinti	Laguna	Brgy. Duhat Cavinti, Laguna	14.2467579	121.5001328	Masterlist 2026	t	2026-07-03 16:53:16.015773	2026-07-03 16:53:16.015773
5757	\N	Cavite Community Academy, Inc.	CAVITE COMMUNITY ACADEMY INC	Grade 7-10 & Grade 11-12	Unknown	Unspecified	Region IV-A	Public Market Road	14.2456329	120.8785658	Masterlist 2026	t	2026-07-03 16:53:16.015773	2026-07-03 16:53:16.015773
5758	\N	Cavite National High School	CAVITE NATIONAL HIGH SCHOOL	Grade 7-10 & Grade 11-12	Unknown	Cavite	Cavite	Chief E. Martin Street, Caridad, Cavite City	14.4829742	120.8970328	Masterlist 2026	t	2026-07-03 16:53:16.015773	2026-07-03 16:53:16.015773
5759	\N	Cavite School of Life	CAVITE SCHOOL OF LIFE	Grade 11-12	Unknown	Dasmariñas	Cavite	Salawag Crossing, Salawag, DasmariÃ±as City, Cavite	14.3534024	120.9814138	Masterlist 2026	t	2026-07-03 16:53:16.015773	2026-07-03 16:53:16.015773
5760	\N	Cavite Science Integrated School	CAVITE SCIENCE INTEGRATED SCHOOL	Grade 7-10 & Grade 11-12	Unknown	Maragondon	Cavite	Maragondon - Ternate Road,	14.2768441	120.7340793	Masterlist 2026	t	2026-07-03 16:53:16.015773	2026-07-03 16:53:16.015773
5761	\N	Cavite State University - Rosario Secondary Education Laboratory School	CAVITE STATE UNIVERSITY ROSARIO SECONDARY EDUCATION LABORATORY SCHOOL	Grade 7-10 & Grade 11-12	Unknown	Rosario	Cavite		14.4035451	120.8659793	Masterlist 2026	t	2026-07-03 16:53:16.015773	2026-07-03 16:53:16.015773
5762	\N	Cavite State University Science High School	CAVITE STATE UNIVERSITY SCIENCE HIGH SCHOOL	Grade 7-10 & Grade 11-12	Unknown	Indang	Cavite	Bancod Road	14.2189423	120.8742968	Masterlist 2026	t	2026-07-03 16:53:16.015773	2026-07-03 16:53:16.015773
5763	\N	Cavite West Point College - Cavite City, Inc.	CAVITE WEST POINT COLLEGE CAVITE CITY INC	Grade 11-12	Unknown	Cavite	Cavite	Lt Bldg., 485 P. Burgos Ave., 34,	14.4781369	120.894342	Masterlist 2026	t	2026-07-03 16:53:16.015773	2026-07-03 16:53:16.015773
5764	\N	Cavite West Point College, Inc.	CAVITE WEST POINT COLLEGE INC	Grade 11-12	Unknown	Ternate	Cavite	Governor's Drive	14.2803331	120.7271504	Masterlist 2026	t	2026-07-03 16:53:16.015773	2026-07-03 16:53:16.015773
5765	\N	Cayabu Integrated School	CAYABU INTEGRATED SCHOOL	Grade 7-10 & Grade 11-12	Unknown	Tanay	Rizal	AZUCENA STREET	14.6613026	121.3434736	Masterlist 2026	t	2026-07-03 16:53:16.0214	2026-07-03 16:53:16.0214
5766	\N	Center for Positive Futures (Balite)	CENTER FOR POSITIVE FUTURES BALITE	Grade 7-10 & Grade 11-12	Unknown	Rodriguez	Rizal	27 JP Rizal St.	14.7312077	121.145185	Masterlist 2026	t	2026-07-03 16:53:16.0214	2026-07-03 16:53:16.0214
5767	\N	Center for Positive Futures (Banaba)	CENTER FOR POSITIVE FUTURES BANABA	Grade 7-10 & Grade 11-12	Unknown	San Mateo	Rizal	# 10 Pangan Compound	14.6756536	121.1107366	Masterlist 2026	t	2026-07-03 16:53:16.0214	2026-07-03 16:53:16.0214
5768	\N	Central Rizal Institute of Technology Inc.	CENTRAL RIZAL INSTITUTE OF TECHNOLOGY INC	Grade 11-12	Unknown	Cainta	Lalawigan ng Rizal	1024 Felix Ave. Brgy. Sto. Domingo	14.5906955	121.1141208	Masterlist 2026	t	2026-07-03 16:53:16.0214	2026-07-03 16:53:16.0214
5769	\N	Cesar C. Tan Memorial National High School (formerly Cometa NHS Annex)	CESAR C TAN MEMORIAL NATIONAL HIGH SCHOOL FORMERLY COMETA NHS ANNEX	Grade 7-10 & Grade 11-12	Unknown	M+JRX	Quezon	Brgy. 4	14.0116199	122.1845953	Masterlist 2026	t	2026-07-03 16:53:16.0214	2026-07-03 16:53:16.0214
5770	\N	CITI GLOBAL COLLEGE INC.	CITI GLOBAL COLLEGE INC	Grade 11-12	Unknown	City of Santa Rosa	Laguna	Ericted Thereon, Canicosa Ave.,	14.2940456	121.105397	Masterlist 2026	t	2026-07-03 16:53:16.0214	2026-07-03 16:53:16.0214
5771	\N	CITI GLOBAL COLLEGE INC. - BiÃ±an	CITI GLOBAL COLLEGE INC BIA±AN	Grade 11-12	Unknown	Bay	Laguna	PN Building, A. Bonifacio St., City of BiÃ±an, Laguna	14.1813075	121.2834295	Masterlist 2026	t	2026-07-03 16:53:16.0214	2026-07-03 16:53:16.0214
5772	\N	CITI Global College-Biñan	CITI GLOBAL COLLEGEBINAN	Grade 11-12	Unknown	Biñan	Laguna	PN Bldg, A. Bonifacio St., Poblacion, Biñan City, Laguna	14.3389924	121.083196	Masterlist 2026	t	2026-07-03 16:53:16.0214	2026-07-03 16:53:16.0214
5773	\N	CITI Global College-Cabuyao	CITI GLOBAL COLLEGECABUYAO	Grade 11-12	Unknown	Cabuyao City	Laguna	#13 J.P. Rizal St., Bayan Walk Arcade, Cabuyao City, Laguna	14.2786985	121.1237046	Masterlist 2026	t	2026-07-03 16:53:16.0214	2026-07-03 16:53:16.0214
5774	\N	CITI Global College-Calamba	CITI GLOBAL COLLEGECALAMBA	Grade 11-12	Unknown	Calamba	Laguna	M3 Building, Chipeco Ave., Brgy. Tres, Calamba City, Laguna	14.2096424	121.1606326	Masterlist 2026	t	2026-07-03 16:53:16.0214	2026-07-03 16:53:16.0214
5775	\N	CITI Global College-Sta. Rosa	CITI GLOBAL COLLEGESTA ROSA	Grade 11-12	Unknown	Noveleta	Cavite	2F Henry Harvey Sih, Canicosa Ave., Brgy. Balibago, Sta. Rosa City, Laguna	14.2500282	121.0649863	Masterlist 2026	t	2026-07-03 16:53:16.0214	2026-07-03 16:53:16.0214
5777	\N	City College of Calamba	CITY COLLEGE OF CALAMBA	Grade 11-12	Unknown	Calamba	Laguna	Barretto Street, Old Municipal Hall, Calamba City, Laguna	14.2120907	121.1675199	Masterlist 2026	t	2026-07-03 16:53:16.0214	2026-07-03 16:53:16.0214
5778	\N	City College of Tagaytay	CITY COLLEGE OF TAGAYTAY	Grade 11-12	Unknown	Tagaytay City	Cavite	Akle St., Kaybagal St.	14.1013657	120.9386044	Masterlist 2026	t	2026-07-03 16:53:16.0214	2026-07-03 16:53:16.0214
5779	\N	Cogorin Ibaba NHS (Formerly Lopez NCHSl - Cogorin Ibaba Extension)	COGORIN IBABA NHS FORMERLY LOPEZ NCHSL COGORIN IBABA EXTENSION	Grade 7-10 & Grade 11-12	Unknown	Lopez	Quezon	Cogorin Ibaba	13.8258449	122.2909078	Masterlist 2026	t	2026-07-03 16:53:16.0214	2026-07-03 16:53:16.0214
5780	\N	Col. Lauro D. Dizon Memorial Integrated High School	COL LAURO D DIZON MEMORIAL INTEGRATED HIGH SCHOOL	Grade 7-10 & Grade 11-12	Unknown	San Pablo City	Laguna	Mavenida st.	14.0742435	121.322525	Masterlist 2026	t	2026-07-03 16:53:16.0214	2026-07-03 16:53:16.0214
5781	\N	COLEGIO DE AVEDAD INC.	COLEGIO DE AVEDAD INC	Kinder & Grade 11-12	Unknown	San Antonio	Zambales	0459 Purok 3, Balanga, San Antonio I,	14.9509541	120.0626827	Masterlist 2026	t	2026-07-03 16:53:16.0214	2026-07-03 16:53:16.0214
5782	\N	Colegio de Los BaÃ±os	COLEGIO DE LOS BAA±OS	Grade 7-10 & Grade 11-12	Unknown	Los Baños	Laguna	Lopez Avenue, Batong Malake, Los BaÃ±os, Laguna	14.1727407	121.2432701	Masterlist 2026	t	2026-07-03 16:53:16.0214	2026-07-03 16:53:16.0214
5783	\N	Colegio de Los Baños	COLEGIO DE LOS BANOS	Grade 11-12	Unknown	Los Baños	Laguna	Lopez Avenue, Batong Malake, Los Baños, Laguna	14.1731358	121.243355	Masterlist 2026	t	2026-07-03 16:53:16.0214	2026-07-03 16:53:16.0214
5784	\N	Colegio De Porta Vaga Inc.	COLEGIO DE PORTA VAGA INC	Grade 7-10 & Grade 11-12	Unknown	Imus	Cavite	MYP-GBY Bldg., E. Aguinaldo Highway, Imus City, Cavite	14.4079389	120.9403291	Masterlist 2026	t	2026-07-03 16:53:16.0214	2026-07-03 16:53:16.0214
5785	\N	Colegio De San Juan De Letran Calamba	COLEGIO DE SAN JUAN DE LETRAN CALAMBA	Grade 11-12	Unknown	Calamba	Laguna	Ipil-Ipil Street, Brgy. Bucal, Calamba City, Laguna	14.1887239	121.165406	Masterlist 2026	t	2026-07-03 16:53:16.0214	2026-07-03 16:53:16.0214
5786	\N	Colegio de Santo Cristo de Burgos	COLEGIO DE SANTO CRISTO DE BURGOS	Grade 7-10 & Grade 11-12	Unknown	Sariaya	Quezon	Valderas St. cor.Quezon Ave., Brgy. 2, District 2	13.9638981	121.5252331	Masterlist 2026	t	2026-07-03 16:53:16.0214	2026-07-03 16:53:16.0214
5787	\N	Colegio De Santo Domingo De Silos	COLEGIO DE SANTO DOMINGO DE SILOS	Grade 11-12	Unknown	Calatagan	Batangas	Brgy. Gulod, Calatagan, Batangas	13.8744704	120.6324465	Masterlist 2026	t	2026-07-03 16:53:16.0214	2026-07-03 16:53:16.0214
5788	\N	Colegio San Agustin-Biñan	COLEGIO SAN AGUSTINBINAN	Grade 11-12	Unknown	Biñan	Laguna	Southwoods Interchange, Brgy. San Francisco, Biñan City, Laguna	14.3308256	121.0529802	Masterlist 2026	t	2026-07-03 16:53:16.0214	2026-07-03 16:53:16.0214
5789	\N	College of Arts & Sciences of Asia & the Pacific-Rodriguez	COLLEGE OF ARTS SCIENCES OF ASIA THE PACIFICRODRIGUEZ	Grade 11-12	Unknown	Taytay	Rizal	Brgy. San Jose, Rodriguez, Rizal	14.5671911	121.1305191	Masterlist 2026	t	2026-07-03 16:53:16.0214	2026-07-03 16:53:16.0214
5790	\N	College of Arts and Sciences of Asia and the Pacific (CASAP)-Taytay	COLLEGE OF ARTS AND SCIENCES OF ASIA AND THE PACIFIC CASAPTAYTAY	Grade 11-12	Unknown	Taytay	Rizal	CASAP Bldg., 199 JEM Bldg., Rizal Ave., Taytay, Rizal	14.5671911	121.1305191	Masterlist 2026	t	2026-07-03 16:53:16.0214	2026-07-03 16:53:16.0214
5791	\N	COLLEGE OF ARTS AND SCIENCES OF ASIA AND THE PACIFIC RODRIGUEZ RIZAL, INC.	COLLEGE OF ARTS AND SCIENCES OF ASIA AND THE PACIFIC RODRIGUEZ RIZAL INC	Grade 11-12	Unknown	Rodriguez	Metro Manila	85 Payatas Road, Brgy. San Jose, Roadriguez, Rizal	14.7298346	121.1251172	Masterlist 2026	t	2026-07-03 16:53:16.0214	2026-07-03 16:53:16.0214
5792	\N	College of Saint John Paul II Arts and Sciences Inc.	COLLEGE OF SAINT JOHN PAUL II ARTS AND SCIENCES INC	Grade 11-12	Unknown	Cainta	Rizal	Mercedez Bldg. Junction, Ortigas Ave Ext., Brgy. Sto. Domingo, Cainta, Rizal	14.586048	121.115657	Masterlist 2026	t	2026-07-03 16:53:16.0214	2026-07-03 16:53:16.0214
5793	\N	College of San Benildo - Rizal	COLLEGE OF SAN BENILDO RIZAL	Grade 7-10 & Grade 11-12	Unknown	Antipolo	Rizal	Km. 22, Sumulong Highway	14.6203457	121.1474057	Masterlist 2026	t	2026-07-03 16:53:16.0214	2026-07-03 16:53:16.0214
5794	\N	COMMUNITY TECHNOLOGICAL COLLEGE INC.	COMMUNITY TECHNOLOGICAL COLLEGE INC	Grade 11-12	Unknown	Lucena City	Quezon	Pleasantville, Ilayang Iyam	13.9382696	121.6013616	Masterlist 2026	t	2026-07-03 16:53:16.0214	2026-07-03 16:53:16.0214
5795	\N	Computer Site Ins. Inc.	COMPUTER SITE INS INC	Grade 11-12	Unknown	Unspecified	Region IV-A	#15 Sto. NiÃ±o	12.879721	121.774017	Masterlist 2026	t	2026-07-03 16:53:16.0214	2026-07-03 16:53:16.0214
5796	\N	Concepcion National High School	CONCEPCION NATIONAL HIGH SCHOOL	Grade 7-10 & Grade 11-12	Unknown	Concepcion	Romblon	Concepcion	12.9090527	121.7161615	Masterlist 2026	t	2026-07-03 16:53:16.0214	2026-07-03 16:53:16.0214
5797	\N	Conde Labac Integrated School	CONDE LABAC INTEGRATED SCHOOL	Grade 7-10 & Grade 11-12	Unknown	Batangas City	Batangas	Conde Labac	13.7349476	121.1123219	Masterlist 2026	t	2026-07-03 16:53:16.0214	2026-07-03 16:53:16.0214
5798	\N	Cotta National High School	COTTA NATIONAL HIGH SCHOOL	Grade 7-10 & Grade 11-12	Unknown	Lucena City	Quezon		13.9203883	121.6123607	Masterlist 2026	t	2026-07-03 16:53:16.0214	2026-07-03 16:53:16.0214
5799	\N	Crecencia Drucila Lopez Senior High School	CRECENCIA DRUCILA LOPEZ SENIOR HIGH SCHOOL	Grade 11-12	Unknown	San Antonio	Zambales	Purok 4, DLMP Compound	14.9511117	120.0611707	Masterlist 2026	t	2026-07-03 16:53:16.0214	2026-07-03 16:53:16.0214
5800	\N	CRISTO REY INSTITUTE FOR CAREER DEVELOPMENT, INC.	CRISTO REY INSTITUTE FOR CAREER DEVELOPMENT INC	Grade 11-12	Unknown	Batangas City	Batangas	106 Rizal Avenue	13.755171	121.056171	Masterlist 2026	t	2026-07-03 16:53:16.0214	2026-07-03 16:53:16.0214
5801	\N	Cristobal S. Conducto Memorial Integrated National High School	CRISTOBAL S CONDUCTO MEMORIAL INTEGRATED NATIONAL HIGH SCHOOL	Grade 7-10 & Grade 11-12	Unknown	Rizal	Laguna	Subida St.	14.1129933	121.3947492	Masterlist 2026	t	2026-07-03 16:53:16.0214	2026-07-03 16:53:16.0214
5802	\N	CSTC College of Sciences, Technology and Communications, Inc.	CSTC COLLEGE OF SCIENCES TECHNOLOGY AND COMMUNICATIONS INC	Grade 11-12	Unknown	San Jose	Occidental Mindoro	28 Capitol Road, Purok Camia	12.3490177	121.0698358	Masterlist 2026	t	2026-07-03 16:53:16.0214	2026-07-03 16:53:16.0214
5804	\N	Cuenca Institute, Inc.	CUENCA INSTITUTE INC	Grade 7-10 & Grade 11-12	Unknown	Manila	Metro Manila	GEN. MALVAR ST.	14.5743914	120.9883486	Masterlist 2026	t	2026-07-03 16:53:16.0214	2026-07-03 16:53:16.0214
5805	\N	Cuenca Senior High School	CUENCA SENIOR HIGH SCHOOL	Grade 11-12	Unknown	Cuenca	Batangas	Poblacion 2, Cuenca, Batangas	13.8981708	121.0486554	Masterlist 2026	t	2026-07-03 16:53:16.0214	2026-07-03 16:53:16.0214
5806	\N	Cuyab Integrated National High School	CUYAB INTEGRATED NATIONAL HIGH SCHOOL	Grade 7-10 & Grade 11-12	Unknown	San Pedro	Laguna	Quezon St. Brgy. Cuyab, San Pedro City, Laguna	14.3710533	121.0590899	Masterlist 2026	t	2026-07-03 16:53:16.0214	2026-07-03 16:53:16.0214
5807	\N	D'Illumina College	D'ILLUMINA COLLEGE	Grade 11-12	Unknown	Calamba	Laguna	Lot 190 J.P. Rizal St., Calamba City, Laguna	14.2138535	121.1662847	Masterlist 2026	t	2026-07-03 16:53:16.0214	2026-07-03 16:53:16.0214
5808	\N	Dacanlao G. Agoncillo National High School	DACANLAO G AGONCILLO NATIONAL HIGH SCHOOL	Grade 7-10 & Grade 11-12	Unknown	Calaca	Batangas	Dacanlao, Calaca City, Batangas	13.9398562	120.7919935	Masterlist 2026	t	2026-07-03 16:53:16.0214	2026-07-03 16:53:16.0214
5809	\N	Daehan College of Business and Technology, Inc.	DAEHAN COLLEGE OF BUSINESS AND TECHNOLOGY INC	Grade 7-10 & Grade 11-12	Unknown	Taytay	Rizal	Road 20, Sitio Siwang, Damayan Floodway, Siwang, San Juan, Taytay, Rizal	14.5423769	121.1210037	Masterlist 2026	t	2026-07-03 16:53:16.0214	2026-07-03 16:53:16.0214
5810	\N	Dagatan Family Farm School	DAGATAN FAMILY FARM SCHOOL	Grade 7-10 & Grade 11-12	Unknown	Lipa City	Batangas	120 Narra Street	13.9627968	121.1802815	Masterlist 2026	t	2026-07-03 16:53:16.0214	2026-07-03 16:53:16.0214
5811	\N	Dagatan Integrated National High School	DAGATAN INTEGRATED NATIONAL HIGH SCHOOL	Grade 7-10 & Grade 11-12	Unknown	Taysan	Batangas	Dagatan, Taysan, Batangas	13.7416058	121.2025336	Masterlist 2026	t	2026-07-03 16:53:16.0214	2026-07-03 16:53:16.0214
5812	\N	Dagatan National High School	DAGATAN NATIONAL HIGH SCHOOL	Grade 7-10 & Grade 11-12	Unknown	San Antonio	Zambales	Purok 4	14.9511117	120.0611707	Masterlist 2026	t	2026-07-03 16:53:16.0214	2026-07-03 16:53:16.0214
5813	\N	Dalig National High School	DALIG NATIONAL HIGH SCHOOL	Grade 7-10 & Grade 11-12	Unknown	Antipolo	Rizal	National Road, Sitio Parugan	14.5751966	121.1930391	Masterlist 2026	t	2026-07-03 16:53:16.0214	2026-07-03 16:53:16.0214
5814	\N	Dalubhasaan ng Lunsod ng San Pablo	DALUBHASAAN NG LUNSOD NG SAN PABLO	Grade 7-10 & Grade 11-12	Unknown	San Pablo City	Laguna	San Jose, 3rd District, San Pablo City, Laguna	14.0690586	121.3212868	Masterlist 2026	t	2026-07-03 16:53:16.0214	2026-07-03 16:53:16.0214
5815	\N	Danlagan NHS (Formerly Kinagunan Ibaba NHS Ext. Classes)	DANLAGAN NHS FORMERLY KINAGUNAN IBABA NHS EXT CLASSES	Grade 7-10 & Grade 11-12	Unknown	Padre Burgos	Quezon	Danlagan	13.8889288	121.8932592	Masterlist 2026	t	2026-07-03 16:53:16.027475	2026-07-03 16:53:16.027475
5816	\N	Dao National High School (Formerly San Francisco B NHS - San Miguel Dao II Ext.)	DAO NATIONAL HIGH SCHOOL FORMERLY SAN FRANCISCO B NHS SAN MIGUEL DAO II EXT	Grade 7-10 & Grade 11-12	Unknown	Dao	Capiz	Buyaburin	11.390069	122.6804656	Masterlist 2026	t	2026-07-03 16:53:16.027475	2026-07-03 16:53:16.027475
5817	\N	Daraetan Integrated School	DARAETAN INTEGRATED SCHOOL	Grade 7-10 & Grade 11-12	Unknown	Unspecified	Region IV-A	DELA CARZADA ST.	12.879721	121.774017	Masterlist 2026	t	2026-07-03 16:53:16.027475	2026-07-03 16:53:16.027475
5818	\N	DasmariÃ±as East Integrated High School	DASMARIA±AS EAST INTEGRATED HIGH SCHOOL	Grade 7-10 & Grade 11-12	Unknown	Dasmariñas	Cavite	San Simon	14.3191355	120.9725746	Masterlist 2026	t	2026-07-03 16:53:16.027475	2026-07-03 16:53:16.027475
5819	\N	DasmariÃ±as Integrated High School	DASMARIA±AS INTEGRATED HIGH SCHOOL	Grade 7-10 & Grade 11-12	Unknown	Dasmariñas	Cavite	Burol I	14.3282732	120.9591939	Masterlist 2026	t	2026-07-03 16:53:16.027475	2026-07-03 16:53:16.027475
5820	\N	DATACOM INSTITUTE OF COMPUTER TECHNOLOGY	DATACOM INSTITUTE OF COMPUTER TECHNOLOGY	Grade 11-12	Unknown	Unspecified	Region IV-A	DRB Building	12.879721	121.774017	Masterlist 2026	t	2026-07-03 16:53:16.027475	2026-07-03 16:53:16.027475
5822	\N	Dayap National Integrated High School	DAYAP NATIONAL INTEGRATED HIGH SCHOOL	Grade 7-10 & Grade 11-12	Unknown	Calauan	Laguna	Poblacion, Calauan, Laguna-	14.1478328	121.3123287	Masterlist 2026	t	2026-07-03 16:53:16.027475	2026-07-03 16:53:16.027475
5823	\N	De La Salle Medical and Health Sciences Institute	DE LA SALLE MEDICAL AND HEALTH SCIENCES INSTITUTE	Grade 11-12	Unknown	Unspecified	Region IV-A	Governor D. Mangubat Avenue, City of DasmariÃ±as, Cavite	14.2456329	120.8785658	Masterlist 2026	t	2026-07-03 16:53:16.027475	2026-07-03 16:53:16.027475
5824	\N	Deaf Evangelistic Alliance Foundation	DEAF EVANGELISTIC ALLIANCE FOUNDATION	Grade 11-12	Unknown	Cavinti	Laguna	Paowin, Cavinti, Laguna	14.2454	121.508003	Masterlist 2026	t	2026-07-03 16:53:16.027475	2026-07-03 16:53:16.027475
5825	\N	Del Pilar Academy	DEL PILAR ACADEMY	Grade 7-10 & Grade 11-12	Unknown	Imus	Cavite	Gen. E.Topacio Street	14.4283795	120.9391449	Masterlist 2026	t	2026-07-03 16:53:16.027475	2026-07-03 16:53:16.027475
5826	\N	Dela Paz National High School	DELA PAZ NATIONAL HIGH SCHOOL	Grade 7-10 & Grade 11-12	Unknown	Antipolo	Rizal	Ninoy Aquino Avenue, Brgy. Dela Paz	14.5902921	121.1702893	Masterlist 2026	t	2026-07-03 16:53:16.027475	2026-07-03 16:53:16.027475
5827	\N	DGA Training Institute Inc.	DGA TRAINING INSTITUTE INC	Grade 11-12	Unknown	Cainta	Rizal	Blk 4 Lot 18 Ph I-A Rodriguez Ave.,	14.5744565	121.1089307	Masterlist 2026	t	2026-07-03 16:53:16.027475	2026-07-03 16:53:16.027475
5828	\N	Digitech College (Digital Communication and Technological College, Inc.)	DIGITECH COLLEGE DIGITAL COMMUNICATION AND TECHNOLOGICAL COLLEGE INC	Grade 11-12	Unknown	Lucena City	Quezon	Purok Agawin Ibabang Dupay, Lucena City, Quezon	13.9608087	121.5974272	Masterlist 2026	t	2026-07-03 16:53:16.027475	2026-07-03 16:53:16.027475
5829	\N	DMMC Institute of Health Sciences	DMMC INSTITUTE OF HEALTH SCIENCES	Grade 7-10 & Grade 11-12	Unknown	Tanauan City	Batangas	#143 Narra St., Mountview Subd., Brgy. 3, Tanauan City, Batangas	14.080859	121.1539281	Masterlist 2026	t	2026-07-03 16:53:16.027475	2026-07-03 16:53:16.027475
5830	\N	DoÃ±a Francisca Alvarez Rejano Integrated School (Formerly Patabog NHS)	DOA±A FRANCISCA ALVAREZ REJANO INTEGRATED SCHOOL FORMERLY PATABOG NHS	Grade 7-10 & Grade 11-12	Unknown	Mulanay	Quezon	Patabog	13.4480693	122.463708	Masterlist 2026	t	2026-07-03 16:53:16.027475	2026-07-03 16:53:16.027475
5831	\N	DoÃ±a Pilar M. Alberto Integrated High School	DOA±A PILAR M ALBERTO INTEGRATED HIGH SCHOOL	Grade 7-10 & Grade 11-12	Unknown	Unspecified	Region IV-A		12.879721	121.774017	Masterlist 2026	t	2026-07-03 16:53:16.027475	2026-07-03 16:53:16.027475
5832	\N	Dolores Macasaet National High School	DOLORES MACASAET NATIONAL HIGH SCHOOL	Grade 7-10 & Grade 11-12	Unknown	Candelaria	Quezon	Pahinga Norte	13.9102564	121.4140324	Masterlist 2026	t	2026-07-03 16:53:16.027475	2026-07-03 16:53:16.027475
5833	\N	Dominican College Sta. Rosa	DOMINICAN COLLEGE STA ROSA	Grade 11-12	Unknown	City of Santa Rosa	Laguna	San Lorenzo South, Dita, Sta. Rosa City, Laguna	14.281521	121.0991007	Masterlist 2026	t	2026-07-03 16:53:16.027475	2026-07-03 16:53:16.027475
5834	\N	Don Bosco College	DON BOSCO COLLEGE	Grade 11-12	Unknown	Calamba	Laguna	Jose Yulo Sr. Blvd., Brgy. Canlubang, Calamba City, Laguna	14.2107047	121.1153379	Masterlist 2026	t	2026-07-03 16:53:16.027475	2026-07-03 16:53:16.027475
5835	\N	Don Bosco Institute of Arts and Sciences Inc.	DON BOSCO INSTITUTE OF ARTS AND SCIENCES INC	Grade 11-12	Unknown	Makati City	Metro Manila	13 J.P. Rizal St., Bayan Walk Arcade, Poblacion	14.5656805	121.0320766	Masterlist 2026	t	2026-07-03 16:53:16.027475	2026-07-03 16:53:16.027475
5836	\N	Don Jose Integrated High School	DON JOSE INTEGRATED HIGH SCHOOL	Grade 7-10 & Grade 11-12	Unknown	City of Santa Rosa	Laguna	Don Jose	14.2543978	121.064316	Masterlist 2026	t	2026-07-03 16:53:16.027475	2026-07-03 16:53:16.027475
5837	\N	Don Jose M. Ynares, Sr. Memorial National High School	DON JOSE M YNARES SR MEMORIAL NATIONAL HIGH SCHOOL	Grade 7-10 & Grade 11-12	Unknown	Malolos	Bulacan	Luisa St.	14.8413279	120.8363797	Masterlist 2026	t	2026-07-03 16:53:16.027475	2026-07-03 16:53:16.027475
5838	\N	DON MANUEL RIVERA MEMORIAL INTEGRATED NATIONAL HIGH SCHOOL	DON MANUEL RIVERA MEMORIAL INTEGRATED NATIONAL HIGH SCHOOL	Grade 7-10 & Grade 11-12	Unknown	Unspecified	Region IV-A		12.879721	121.774017	Masterlist 2026	t	2026-07-03 16:53:16.027475	2026-07-03 16:53:16.027475
5839	\N	Doongan Ilaya National High School	DOONGAN ILAYA NATIONAL HIGH SCHOOL	Grade 7-10 & Grade 11-12	Unknown	Catanauan	Quezon		13.6776343	122.2991004	Masterlist 2026	t	2026-07-03 16:53:16.027475	2026-07-03 16:53:16.027475
5840	\N	Dr. Apolonio M. Lirio NHS	DR APOLONIO M LIRIO NHS	Grade 7-10 & Grade 11-12	Unknown	Tanauan City	Batangas	Balele, Tanauan City, Batangas	14.0652711	121.0936983	Masterlist 2026	t	2026-07-03 16:53:16.027475	2026-07-03 16:53:16.027475
5841	\N	Dr. Arsenio C. Nicolas Integrated National High School (Formerly Dr. Arsenio C. Nicolas NHS)	DR ARSENIO C NICOLAS INTEGRATED NATIONAL HIGH SCHOOL FORMERLY DR ARSENIO C NICOLAS NHS	Grade 7-10 & Grade 11-12	Unknown	Calauag	Quezon	Pandanan	13.9156665	122.3055557	Masterlist 2026	t	2026-07-03 16:53:16.027475	2026-07-03 16:53:16.027475
5842	\N	Dr. Bonifacio A. Masilungan Integrated National High School	DR BONIFACIO A MASILUNGAN INTEGRATED NATIONAL HIGH SCHOOL	Grade 7-10 & Grade 11-12	Unknown	San Jose	Batangas	Lalayat, San Jose, Batangas	13.8567968	121.0765048	Masterlist 2026	t	2026-07-03 16:53:16.027475	2026-07-03 16:53:16.027475
5843	\N	Dr. Francisco L. Calingasan Memorial Colleges Foundation Inc. - Tuy Campus	DR FRANCISCO L CALINGASAN MEMORIAL COLLEGES FOUNDATION INC TUY CAMPUS	Grade 11-12	Unknown	Tuy	Batangas	Rizal Street, Tuy, Batangas	14.0221988	120.7277884	Masterlist 2026	t	2026-07-03 16:53:16.027475	2026-07-03 16:53:16.027475
5844	\N	Dr. Jose P. Rizal SHS	DR JOSE P RIZAL SHS	Grade 11-12	Unknown	Dasmariñas	Cavite	Brgy. Sto. Cristo	14.3383991	120.9560987	Masterlist 2026	t	2026-07-03 16:53:16.027475	2026-07-03 16:53:16.027475
5845	\N	Dr. Juan A. Pastor Integrated National High School	DR JUAN A PASTOR INTEGRATED NATIONAL HIGH SCHOOL	Grade 7-10 & Grade 11-12	Unknown	Ibaan	Batangas	Talaibon, Ibaan, Batangas	13.8293036	121.1359989	Masterlist 2026	t	2026-07-03 16:53:16.027475	2026-07-03 16:53:16.027475
5846	\N	Dr. Maria D. Pastrana National  High School	DR MARIA D PASTRANA NATIONAL HIGH SCHOOL	Grade 7-10 & Grade 11-12	Unknown	Mauban	Quezon	Quezon Street	14.1855316	121.7287936	Masterlist 2026	t	2026-07-03 16:53:16.027475	2026-07-03 16:53:16.027475
5847	\N	Dr. Panfilo Castro NHS (Formerly Bukal Sur NHS-Mangilag Annex)	DR PANFILO CASTRO NHS FORMERLY BUKAL SUR NHSMANGILAG ANNEX	Grade 7-10 & Grade 11-12	Unknown	Candelaria	Quezon	Mangilag Norte	13.9378465	121.4527751	Masterlist 2026	t	2026-07-03 16:53:16.027475	2026-07-03 16:53:16.027475
5848	\N	Dr. Vivencio B. Villamayor National High School	DR VIVENCIO B VILLAMAYOR NATIONAL HIGH SCHOOL	Grade 7-10 & Grade 11-12	Unknown	Angono	Rizal	8888 Silver St. Medalva Phase III Brgy. San Isidro, Angono, Rizal	14.5445561	121.1584909	Masterlist 2026	t	2026-07-03 16:53:16.027475	2026-07-03 16:53:16.027475
5849	\N	Dr. Vivencio V. Marquez National High School	DR VIVENCIO V MARQUEZ NATIONAL HIGH SCHOOL	Grade 7-10 & Grade 11-12	Unknown	San Francisco (Aurora)	Quezon	Marquez	13.3711925	122.5080496	Masterlist 2026	t	2026-07-03 16:53:16.027475	2026-07-03 16:53:16.027475
5850	\N	Dungawan NHS	DUNGAWAN NHS	Grade 7-10 & Grade 11-12	Unknown	Guinayangan	Quezon	Dungawan Central	13.8625945	122.4212424	Masterlist 2026	t	2026-07-03 16:53:16.027475	2026-07-03 16:53:16.027475
5851	\N	E. ZOBEL FOUNDATION, INC.	E ZOBEL FOUNDATION INC	Grade 11-12	Unknown	Cabuyao City	Laguna	Barangay Gulod	14.2601269	121.1538564	Masterlist 2026	t	2026-07-03 16:53:16.027475	2026-07-03 16:53:16.027475
5852	\N	East Systems Colleges of Rizal	EAST SYSTEMS COLLEGES OF RIZAL	Grade 11-12	Unknown	Morong	Rizal	J. Pascual St., San Pedro, Morong, Rizal	14.5097128	121.2418032	Masterlist 2026	t	2026-07-03 16:53:16.027475	2026-07-03 16:53:16.027475
5853	\N	Eastern Innovative School of Science and Technology, Inc.	EASTERN INNOVATIVE SCHOOL OF SCIENCE AND TECHNOLOGY INC	Grade 11-12	Unknown	Pasig	Rizal	8021 Felix Avenue	14.6176812	121.0992051	Masterlist 2026	t	2026-07-03 16:53:16.027475	2026-07-03 16:53:16.027475
5854	\N	Eastern Tayabas College	EASTERN TAYABAS COLLEGE	Grade 7-10 & Grade 11-12	Unknown	Rosario	Cavite	Rosario	14.416718	120.8547068	Masterlist 2026	t	2026-07-03 16:53:16.027475	2026-07-03 16:53:16.027475
5855	\N	EASTERN VALLEY SCHOOL INC.	EASTERN VALLEY SCHOOL INC	Grade 11-12	Unknown	Rodriguez	Rizal	429 Cacho St. Balite, Rodriguez, Rizal	14.7339357	121.1440127	Masterlist 2026	t	2026-07-03 16:53:16.027475	2026-07-03 16:53:16.027475
5856	\N	Eduardo Barretto, Sr. Integrated School	EDUARDO BARRETTO SR INTEGRATED SCHOOL	Grade 7-10 & Grade 11-12	Unknown	Calamba	Laguna	143 Jalandoni St. Pansol Calamba City	14.1798154	121.1788239	Masterlist 2026	t	2026-07-03 16:53:16.027475	2026-07-03 16:53:16.027475
5857	\N	EDUSTRIA INCORPORATED	EDUSTRIA INCORPORATED	Grade 7-10 & Grade 11-12	Unknown	Lipa City	Batangas	Blk Q, R, S & T, Lima Technology Center	14.0088249	121.1711471	Masterlist 2026	t	2026-07-03 16:53:16.027475	2026-07-03 16:53:16.027475
5858	\N	EL ROYALE HOTELIER TRAINING CENTER INC.	EL ROYALE HOTELIER TRAINING CENTER INC	Grade 11-12	Unknown	City of Tayabas	Quezon	Quezon Avenue corner Trinidad St.	14.0254625	121.5955604	Masterlist 2026	t	2026-07-03 16:53:16.027475	2026-07-03 16:53:16.027475
5859	\N	Elias A. Salvador NHS	ELIAS A SALVADOR NHS	Grade 7-10 & Grade 11-12	Unknown	Cebu City	Cebu	Salvador St.	10.3044192	123.8769701	Masterlist 2026	t	2026-07-03 16:53:16.027475	2026-07-03 16:53:16.027475
5860	\N	Elizabeth Seton School	ELIZABETH SETON SCHOOL	Grade 11-12	Unknown	Imus	Cavite	Anabu II-D, Imus City, Cavite	14.3757914	120.9360382	Masterlist 2026	t	2026-07-03 16:53:16.027475	2026-07-03 16:53:16.027475
5861	\N	Emilia Ambalada Poblete Integrated High School	EMILIA AMBALADA POBLETE INTEGRATED HIGH SCHOOL	Grade 7-10 & Grade 11-12	Unknown	Unspecified	Region IV-A	Camia St., Mary Ann Village	12.879721	121.774017	Masterlist 2026	t	2026-07-03 16:53:16.027475	2026-07-03 16:53:16.027475
5862	\N	Emiliano Tria Tirona Memorial National Integrated High School	EMILIANO TRIA TIRONA MEMORIAL NATIONAL INTEGRATED HIGH SCHOOL	Grade 7-10 & Grade 11-12	Unknown	Kawit	Cavite	-	14.4410469	120.908583	Masterlist 2026	t	2026-07-03 16:53:16.027475	2026-07-03 16:53:16.027475
5863	\N	Emilio Aguinaldo College-Cavite	EMILIO AGUINALDO COLLEGECAVITE	Grade 11-12	Unknown	Dasmariñas	Cavite	Gov. D. Mangubat Ave. Brgy. Burol Main, DasmariÃ±as City, Cavite	14.3281431	120.9503435	Masterlist 2026	t	2026-07-03 16:53:16.027475	2026-07-03 16:53:16.027475
5864	\N	Emilio V. Quizon National High School	EMILIO V QUIZON NATIONAL HIGH SCHOOL	Grade 7-10 & Grade 11-12	Unknown	San Andres	Quezon	Sitio Tubigan, Brgy. Talisay, San Andes, Quezon	13.325187	122.650351	Masterlist 2026	t	2026-07-03 16:53:16.027475	2026-07-03 16:53:16.027475
5865	\N	EMMANUEL JOHN INSTITUTE OF SCIENCE & TECHNOLOGY (RIZAL) INC.	EMMANUEL JOHN INSTITUTE OF SCIENCE TECHNOLOGY RIZAL INC	Grade 11-12	Unknown	Pililla	Rizal	Sitio Bulacan I	14.4724125	121.3163117	Masterlist 2026	t	2026-07-03 16:53:16.033155	2026-07-03 16:53:16.033155
5866	\N	Emmanuel Resurreccion Congressional Integrated High School	EMMANUEL RESURRECCION CONGRESSIONAL INTEGRATED HIGH SCHOOL	Grade 7-10 & Grade 11-12	Unknown	Unspecified	Region IV-A	Poinsettia Street, Via Verde Village	12.879721	121.774017	Masterlist 2026	t	2026-07-03 16:53:16.033155	2026-07-03 16:53:16.033155
5867	\N	EMMANUELA JANE INSTITUTE OF SCIENCE & TECHNOLOGY INC.	EMMANUELA JANE INSTITUTE OF SCIENCE TECHNOLOGY INC	Grade 11-12	Unknown	Antipolo	Rizal	Sitio Tibagan, Brgy. San Jose, Antipolo City	14.5754349	121.1931906	Masterlist 2026	t	2026-07-03 16:53:16.033155	2026-07-03 16:53:16.033155
5868	\N	English Christian Academy (San Jose)	ENGLISH CHRISTIAN ACADEMY SAN JOSE	Grade 7-10 & Grade 11-12	Unknown	Antipolo	Lalawigan ng Rizal	Block 171 Lot 11 All Spice Road, Robinsons Homes East Subd., San Jose, Antipolo City	14.5771604	121.191415	Masterlist 2026	t	2026-07-03 16:53:16.033155	2026-07-03 16:53:16.033155
5869	\N	Escuela Secondaria SeÃ±or de Salinas	ESCUELA SECONDARIA SEA±OR DE SALINAS	Grade 11-12	Unknown	Rosario	Cavite	Greenfields Subd., Bagbag I	14.4233341	120.8680037	Masterlist 2026	t	2026-07-03 16:53:16.033155	2026-07-03 16:53:16.033155
5870	\N	ESRA Technical Training Foundation Inc.	ESRA TECHNICAL TRAINING FOUNDATION INC	Grade 11-12	Unknown	Taytay	Rizal	J.P. Rizal St., Rizal Technopark 2000	14.5503736	121.1276388	Masterlist 2026	t	2026-07-03 16:53:16.033155	2026-07-03 16:53:16.033155
5871	\N	Estanislao Perlas National High School	ESTANISLAO PERLAS NATIONAL HIGH SCHOOL	Grade 7-10 & Grade 11-12	Unknown	Catanauan	Quezon	Tagabas Ibaba	13.6313678	122.2757348	Masterlist 2026	t	2026-07-03 16:53:16.033155	2026-07-03 16:53:16.033155
5872	\N	Evaristo R. Macalintal MNHS (Formerly Cometa NHS)	EVARISTO R MACALINTAL MNHS FORMERLY COMETA NHS	Grade 7-10 & Grade 11-12	Unknown	Quezon	Quezon	Cometa	14.0293406	122.1201793	Masterlist 2026	t	2026-07-03 16:53:16.033155	2026-07-03 16:53:16.033155
5873	\N	Fame Academy of Science & Technology (FAST)	FAME ACADEMY OF SCIENCE TECHNOLOGY FAST	Grade 7-10 & Grade 11-12	Unknown	Unspecified	Region IV-A	Calle A Delas Alas ZONE 5	12.879721	121.774017	Masterlist 2026	t	2026-07-03 16:53:16.033155	2026-07-03 16:53:16.033155
5875	\N	Famy National Integrated High School	FAMY NATIONAL INTEGRATED HIGH SCHOOL	Grade 7-10 & Grade 11-12	Unknown	Famy	Laguna		14.4382352	121.4509133	Masterlist 2026	t	2026-07-03 16:53:16.033155	2026-07-03 16:53:16.033155
5876	\N	Far East Asia Pacific Institute of Tourism Science and Technology	FAR EAST ASIA PACIFIC INSTITUTE OF TOURISM SCIENCE AND TECHNOLOGY	Grade 11-12	Unknown	Tanza	Cavite	2nd Flr., Jackson Heights Bldg., Daang Amaya, Tanza, Cavite	14.3912642	120.8530123	Masterlist 2026	t	2026-07-03 16:53:16.033155	2026-07-03 16:53:16.033155
5877	\N	Far Eastern Polytechnic College	FAR EASTERN POLYTECHNIC COLLEGE	Grade 11-12	Unknown	Dasmariñas	Cavite	Santa Lucia, DBB1, DasmariÃ±as City, Cavite	14.3348638	120.9542357	Masterlist 2026	t	2026-07-03 16:53:16.033155	2026-07-03 16:53:16.033155
5878	\N	FCD CENTRAL INSTITUTE INCORPORATED	FCD CENTRAL INSTITUTE INCORPORATED	Grade 11-12	Unknown	San Pablo City	Laguna	15 Miguel St., Brgy. II-E, San Pablo City	14.066619	121.324786	Masterlist 2026	t	2026-07-03 16:53:16.033155	2026-07-03 16:53:16.033155
5879	\N	FEAPITSAT College of DasmariÃ±as  Inc.	FEAPITSAT COLLEGE OF DASMARIA±AS INC	Grade 11-12	Unknown	Dasmariñas	Cavite	Mangubat Ave., DasmariÃ±as City Cavite	14.3271255	120.9344178	Masterlist 2026	t	2026-07-03 16:53:16.033155	2026-07-03 16:53:16.033155
5880	\N	FEAPITSAT COLLEGE OF MARAGONDON INC.	FEAPITSAT COLLEGE OF MARAGONDON INC	Grade 11-12	Unknown	Maragondon	Cavite	Polar Building Riel St.,	14.276109	120.7374449	Masterlist 2026	t	2026-07-03 16:53:16.033155	2026-07-03 16:53:16.033155
5881	\N	FEAPITSAT Colleges, Inc.	FEAPITSAT COLLEGES INC	Grade 11-12	Unknown	Tanza	Cavite	Overland Bldg.	14.3918445	120.8527223	Masterlist 2026	t	2026-07-03 16:53:16.033155	2026-07-03 16:53:16.033155
5882	\N	Felix Amante Senior High School	FELIX AMANTE SENIOR HIGH SCHOOL	Grade 11-12	Unknown	San Pablo City	Laguna	Brgy. San Ignacio	14.0627472	121.347129	Masterlist 2026	t	2026-07-03 16:53:16.033155	2026-07-03 16:53:16.033155
5883	\N	Fernando Air Base Integrated National High School	FERNANDO AIR BASE INTEGRATED NATIONAL HIGH SCHOOL	Grade 7-10 & Grade 11-12	Unknown	Lipa City	Batangas	-	13.9538525	121.1326444	Masterlist 2026	t	2026-07-03 16:53:16.033155	2026-07-03 16:53:16.033155
5884	\N	FIRST INDUSTRIAL SCIENCE AND TECHNOLOGY COLLEGE, INC.	FIRST INDUSTRIAL SCIENCE AND TECHNOLOGY COLLEGE INC	Grade 11-12	Unknown	Santo Tomas	Batangas	Building FPIP	14.1370935	121.130828	Masterlist 2026	t	2026-07-03 16:53:16.033155	2026-07-03 16:53:16.033155
5885	\N	Five Star Standard College, Inc.	FIVE STAR STANDARD COLLEGE INC	Grade 11-12	Unknown	Bacoor	Cavite	Aguinaldo Highway,3F Conrado Commercial Complex	14.4553727	120.957185	Masterlist 2026	t	2026-07-03 16:53:16.033155	2026-07-03 16:53:16.033155
5886	\N	FMS INSTITUTION INCORPORATED	FMS INSTITUTION INCORPORATED	Grade 11-12	Unknown	Rodriguez	Rizal	44 Canlaon St. Amityville Subd., San Jose, Rodriguez	14.7485193	121.1285809	Masterlist 2026	t	2026-07-03 16:53:16.033155	2026-07-03 16:53:16.033155
5887	\N	Francisco E. Barzaga Integrated High School	FRANCISCO E BARZAGA INTEGRATED HIGH SCHOOL	Grade 7-10 & Grade 11-12	Unknown	San Jose	Occidental Mindoro	Lagmay Compound, Medina Ville, Brgy. San Jose	12.4011916	121.1022942	Masterlist 2026	t	2026-07-03 16:53:16.033155	2026-07-03 16:53:16.033155
5888	\N	Francisco Osorio Integrated Senior High School	FRANCISCO OSORIO INTEGRATED SENIOR HIGH SCHOOL	Grade 7-10 & Grade 11-12	Unknown	Trece Martires City	Cavite	-	14.2918655	120.8803366	Masterlist 2026	t	2026-07-03 16:53:16.033155	2026-07-03 16:53:16.033155
5889	\N	Francisco P. Tolentino Integrated High School	FRANCISCO P TOLENTINO INTEGRATED HIGH SCHOOL	Grade 7-10 & Grade 11-12	Unknown	Tagaytay City	Cavite	Lagusan Drive	14.1317201	120.9761082	Masterlist 2026	t	2026-07-03 16:53:16.033155	2026-07-03 16:53:16.033155
5890	\N	Frere (Saint) Benilde Romancon Education Foundation (De La Salle University-DasmariÃ±as), Inc	FRERE SAINT BENILDE ROMANCON EDUCATION FOUNDATION DE LA SALLE UNIVERSITYDASMARIA±AS INC	Grade 7-10 & Grade 11-12	Unknown	Unspecified	Region IV-A	West Ave., City of DasmariÃ±as	12.879721	121.774017	Masterlist 2026	t	2026-07-03 16:53:16.033155	2026-07-03 16:53:16.033155
5891	\N	Full Aces International School for Skills and Technical Development. Inc.	FULL ACES INTERNATIONAL SCHOOL FOR SKILLS AND TECHNICAL DEVELOPMENT INC	Grade 11-12	Unknown	Kawit	Cavite	FAIS Bldg., Moonstone Ave., Centennial Town Plaza, Kawit, Cavite	14.4257879	120.8939856	Masterlist 2026	t	2026-07-03 16:53:16.033155	2026-07-03 16:53:16.033155
5892	\N	Galalan Integrated National High School	GALALAN INTEGRATED NATIONAL HIGH SCHOOL	Grade 7-10 & Grade 11-12	Unknown	Pangil	Laguna	D.V. Manzana Avenue, Brgy. Galalan, Pangil, Laguna	14.4430148	121.5054639	Masterlist 2026	t	2026-07-03 16:53:16.033155	2026-07-03 16:53:16.033155
5893	\N	Gardner College Cainta, Inc.	GARDNER COLLEGE CAINTA INC	Grade 11-12	Unknown	Unspecified	Region IV-A	RDS Bldg., Felix Ave., Brgy. San Isidro, Cainta, Rizal	14.6024419	121.1063758	Masterlist 2026	t	2026-07-03 16:53:16.033155	2026-07-03 16:53:16.033155
5894	\N	Gateways Institute of Science and Technology (GIST) - Antipolo	GATEWAYS INSTITUTE OF SCIENCE AND TECHNOLOGY GIST ANTIPOLO	Grade 11-12	Unknown	Antipolo	Rizal	GIST Bldg., #83 Marcos Highway, Barangay Bagong Nayon 1, Cogeo, Antipolo City	14.6219674	121.1679438	Masterlist 2026	t	2026-07-03 16:53:16.033155	2026-07-03 16:53:16.033155
5895	\N	Gaudencio M. Sangalang Academy, Inc.	GAUDENCIO M SANGALANG ACADEMY INC	Grade 7-10 & Grade 11-12	Unknown	General Luna	Quezon	Perez St.	13.6882191	122.1719145	Masterlist 2026	t	2026-07-03 16:53:16.033155	2026-07-03 16:53:16.033155
5896	\N	Gaudencio Octavio Integrated High School	GAUDENCIO OCTAVIO INTEGRATED HIGH SCHOOL	Grade 7-10 & Grade 11-12	Unknown	Santa Maria	Laguna	Bagumbayan	14.5104219	121.4345412	Masterlist 2026	t	2026-07-03 16:53:16.033155	2026-07-03 16:53:16.033155
5897	\N	Gen. Emilio Aguinaldo-Bailen Integrated School	GEN EMILIO AGUINALDOBAILEN INTEGRATED SCHOOL	Grade 7-10 & Grade 11-12	Unknown	General Emilio Aguinaldo	Cavite	Lirio St.	14.1845295	120.796035	Masterlist 2026	t	2026-07-03 16:53:16.033155	2026-07-03 16:53:16.033155
5898	\N	Gen. Flaviano Yengko Senior High School	GEN FLAVIANO YENGKO SENIOR HIGH SCHOOL	Grade 11-12	Unknown	Unspecified	Region IV-A	Blk 7 Lot 66-68 Phase 11A Dama de Noche St.	12.879721	121.774017	Masterlist 2026	t	2026-07-03 16:53:16.033155	2026-07-03 16:53:16.033155
5899	\N	Gen. Juan CastaÃ±eda Senior High School	GEN JUAN CASTAA±EDA SENIOR HIGH SCHOOL	Grade 11-12	Unknown	Imus	Cavite	090 Anabu II-A Imus City	14.3835442	120.9392878	Masterlist 2026	t	2026-07-03 16:53:16.033155	2026-07-03 16:53:16.033155
5900	\N	Gen. Mariano Alvarez Technology High School	GEN MARIANO ALVAREZ TECHNOLOGY HIGH SCHOOL	Grade 7-10 & Grade 11-12	Unknown	General Mariano Alvarez	Cavite	688 Congresional Ave.	14.2952492	121.0070953	Masterlist 2026	t	2026-07-03 16:53:16.033155	2026-07-03 16:53:16.033155
5901	\N	Gen. Pantaleon Garcia Senior High School	GEN PANTALEON GARCIA SENIOR HIGH SCHOOL	Grade 11-12	Unknown	Imus	Cavite	PEDRO REYES ST. MALAGASANG I-G	14.3928095	120.9197443	Masterlist 2026	t	2026-07-03 16:53:16.033155	2026-07-03 16:53:16.033155
5902	\N	Gen. Vito Belarmino Integrated National High School	GEN VITO BELARMINO INTEGRATED NATIONAL HIGH SCHOOL	Grade 7-10 & Grade 11-12	Unknown	Silang	Cavite	Silang-Banaybanay Rd.	14.2108075	120.9587792	Masterlist 2026	t	2026-07-03 16:53:16.033155	2026-07-03 16:53:16.033155
5903	\N	General Luna Integrated National High School	GENERAL LUNA INTEGRATED NATIONAL HIGH SCHOOL	Grade 7-10 & Grade 11-12	Unknown	General Luna	Surigao del Norte	New Municipal Complex	9.7837527	126.1565715	Masterlist 2026	t	2026-07-03 16:53:16.033155	2026-07-03 16:53:16.033155
5904	\N	Genesis Colleges, Inc.	GENESIS COLLEGES INC	Kinder & Grade 11-12	Unknown	Antipolo	Rizal	C. Lawis Extension	14.5906141	121.1882342	Masterlist 2026	t	2026-07-03 16:53:16.033155	2026-07-03 16:53:16.033155
5905	\N	Gloria Umali Integrated NHS	GLORIA UMALI INTEGRATED NHS	Grade 7-10 & Grade 11-12	Unknown	Tiaong	Quezon	Ayusan II	13.9455414	121.2949817	Masterlist 2026	t	2026-07-03 16:53:16.033155	2026-07-03 16:53:16.033155
5906	\N	Godofredo M. Tan Memorial Integrated School of Arts and Trades (Formerly San Narciso Voc. HS)	GODOFREDO M TAN MEMORIAL INTEGRATED SCHOOL OF ARTS AND TRADES FORMERLY SAN NARCISO VOC HS	Grade 7-10 & Grade 11-12	Unknown	San Narciso	Quezon	San Andres Road	13.4999703	122.5598994	Masterlist 2026	t	2026-07-03 16:53:16.033155	2026-07-03 16:53:16.033155
5907	\N	GOV. ANACLETO C. ALCALA NATIONAL HIGH SCHOOL	GOV ANACLETO C ALCALA NATIONAL HIGH SCHOOL	Grade 7-10 & Grade 11-12	Unknown	Sariaya	Quezon	Concepcion, Banahaw	13.9846753	121.467701	Masterlist 2026	t	2026-07-03 16:53:16.033155	2026-07-03 16:53:16.033155
5908	\N	Gov. Felicisimo T. San Luis Integrated Senior High School	GOV FELICISIMO T SAN LUIS INTEGRATED SENIOR HIGH SCHOOL	Grade 7-10 & Grade 11-12	Unknown	Santa Cruz	Laguna	Laguna Sports Complex	14.2573767	121.4049749	Masterlist 2026	t	2026-07-03 16:53:16.033155	2026-07-03 16:53:16.033155
5909	\N	GOV. FELICISIMO T. SAN LUIS NATIONAL AGRO-INDUSTRIAL INTEGRATED HIGH SCHOOL	GOV FELICISIMO T SAN LUIS NATIONAL AGROINDUSTRIAL INTEGRATED HIGH SCHOOL	Grade 7-10 & Grade 11-12	Unknown	Siniloan	Laguna	Kapatalan	14.4851481	121.500796	Masterlist 2026	t	2026-07-03 16:53:16.033155	2026-07-03 16:53:16.033155
5910	\N	Gov. Ferrer Memorial Integrated National High School	GOV FERRER MEMORIAL INTEGRATED NATIONAL HIGH SCHOOL	Grade 7-10 & Grade 11-12	Unknown	General Trias	Cavite	-	14.3746679	120.8792232	Masterlist 2026	t	2026-07-03 16:53:16.033155	2026-07-03 16:53:16.033155
5911	\N	Gov. Isidro Rodriguez, Sr. Memorial National High School	GOV ISIDRO RODRIGUEZ SR MEMORIAL NATIONAL HIGH SCHOOL	Grade 7-10 & Grade 11-12	Unknown	Unspecified	Region IV-A	Resurrection St. , St. Gregory Subdivision	12.879721	121.774017	Masterlist 2026	t	2026-07-03 16:53:16.033155	2026-07-03 16:53:16.033155
5912	\N	Gov. Juanito Reyes Remulla Senior High School	GOV JUANITO REYES REMULLA SENIOR HIGH SCHOOL	Grade 11-12	Unknown	Imus	Cavite	TOCLONG II-B	14.4408338	120.9290926	Masterlist 2026	t	2026-07-03 16:53:16.033155	2026-07-03 16:53:16.033155
5913	\N	Grant Institute of Trade and Technology	GRANT INSTITUTE OF TRADE AND TECHNOLOGY	Grade 11-12	Unknown	San Pablo City	Laguna	Greenvalley Subd., Brgy. San Jose, San Pablo City, Laguna	14.0635622	121.3352101	Masterlist 2026	t	2026-07-03 16:53:16.033155	2026-07-03 16:53:16.033155
5914	\N	GREATLAND SCHOOL OF SAN PEDRO LAGUNA INC.	GREATLAND SCHOOL OF SAN PEDRO LAGUNA INC	Grade 11-12	Unknown	San Pedro	Laguna	Blk 23 Lot 16 Flamingo St., Ph 1	14.3498647	121.0507791	Masterlist 2026	t	2026-07-03 16:53:16.033155	2026-07-03 16:53:16.033155
5915	\N	Greenfield Montessori School - Tanay	GREENFIELD MONTESSORI SCHOOL TANAY	Grade 11-12	Unknown	Tanay	Rizal	E. Rodriguez Ave., Brgy. Katipunan Bayani, Tanay, Rizal	14.5045735	121.2874911	Masterlist 2026	t	2026-07-03 16:53:16.038878	2026-07-03 16:53:16.038878
5916	\N	Gregorio Reyes NHS	GREGORIO REYES NHS	Grade 7-10 & Grade 11-12	Unknown	San Narciso	Quezon	Villa Reyes	13.4454441	122.6220934	Masterlist 2026	t	2026-07-03 16:53:16.038878	2026-07-03 16:53:16.038878
5917	\N	Guardians Bona Fide for Hope Foundation	GUARDIANS BONA FIDE FOR HOPE FOUNDATION	Grade 11-12	Unknown	Biñan	Laguna	B2 L33 Brgy. Calabuso, Biñan City, Laguna	14.3141037	121.0727651	Masterlist 2026	t	2026-07-03 16:53:16.038878	2026-07-03 16:53:16.038878
5918	\N	Guinayangan Academy	GUINAYANGAN ACADEMY	Grade 7-10 & Grade 11-12	Unknown	Guinayangan	Quezon	Matta Molines Street	13.897202	122.452573	Masterlist 2026	t	2026-07-03 16:53:16.038878	2026-07-03 16:53:16.038878
5919	\N	Guinayangan College Foundation Inc.	GUINAYANGAN COLLEGE FOUNDATION INC	Grade 11-12	Unknown	Guinayangan	Quezon	Brgy. Sisi, Guinayangan, Quezon	13.9189813	122.4338093	Masterlist 2026	t	2026-07-03 16:53:16.038878	2026-07-03 16:53:16.038878
5920	\N	Guinayangan Senior High School	GUINAYANGAN SENIOR HIGH SCHOOL	Grade 11-12	Unknown	Guinayangan	Quezon Province	Bliss Site, Brgy. Sisi	13.9131349	122.437956	Masterlist 2026	t	2026-07-03 16:53:16.038878	2026-07-03 16:53:16.038878
5921	\N	Guites NHS	GUITES NHS	Grade 7-10 & Grade 11-12	Unknown	Lopez	Quezon	Guites	13.9737207	122.2029832	Masterlist 2026	t	2026-07-03 16:53:16.038878	2026-07-03 16:53:16.038878
5922	\N	Gulang-gulang National High School	GULANGGULANG NATIONAL HIGH SCHOOL	Grade 7-10 & Grade 11-12	Unknown	Lucena City	Quezon		13.9435137	121.6081107	Masterlist 2026	t	2026-07-03 16:53:16.038878	2026-07-03 16:53:16.038878
5923	\N	Gulod Senior High School	GULOD SENIOR HIGH SCHOOL	Grade 11-12	Unknown	Batangas City	Batangas	Gulod Itaas	13.762423	121.0825577	Masterlist 2026	t	2026-07-03 16:53:16.038878	2026-07-03 16:53:16.038878
5924	\N	Gumaca Integrated School	GUMACA INTEGRATED SCHOOL	Grade 7-10 & Grade 11-12	Unknown	Gumaca	Quezon	Inaclagan	13.9433961	122.0464403	Masterlist 2026	t	2026-07-03 16:53:16.038878	2026-07-03 16:53:16.038878
5925	\N	Gumaca National High School	GUMACA NATIONAL HIGH SCHOOL	Grade 7-10 & Grade 11-12	Unknown	Gumaca	Quezon	Mabini Street, Brgy. Mabini	13.9205904	122.0988877	Masterlist 2026	t	2026-07-03 16:53:16.038878	2026-07-03 16:53:16.038878
5926	\N	Hagonghong Integrated HS	HAGONGHONG INTEGRATED HS	Grade 7-10 & Grade 11-12	Unknown	Buenavista	Quezon	Hagonghong	13.6738302	122.4713008	Masterlist 2026	t	2026-07-03 16:53:16.038878	2026-07-03 16:53:16.038878
5927	\N	Halang Banaybanay Integrated School	HALANG BANAYBANAY INTEGRATED SCHOOL	Grade 7-10 & Grade 11-12	Unknown	Banaybanay	Davao Oriental	-	6.9639518	126.0119441	Masterlist 2026	t	2026-07-03 16:53:16.038878	2026-07-03 16:53:16.038878
5928	\N	HANKUK DREAM HIGH CHRISTIAN SCHOOL INC.	HANKUK DREAM HIGH CHRISTIAN SCHOOL INC	Grade 11-12	Unknown	Manila	Metro Manila	Ph 3 Blk 324 Lot 14 Metrogate	14.6123581	120.9838679	Masterlist 2026	t	2026-07-03 16:53:16.038878	2026-07-03 16:53:16.038878
5929	\N	Hankuk Educational Foundation, Inc.	HANKUK EDUCATIONAL FOUNDATION INC	Grade 1-6, Grade 7-10 & Grade 11-12	Unknown	Antipolo	Rizal	Block 3-4 Lot 1 C. Lawis Extension	14.5905478	121.1883654	Masterlist 2026	t	2026-07-03 16:53:16.038878	2026-07-03 16:53:16.038878
5930	\N	Hinguiwin National High School	HINGUIWIN NATIONAL HIGH SCHOOL	Grade 7-10 & Grade 11-12	Unknown	XRC+V	Quezon	Hinguiwin	13.9501338	121.8221691	Masterlist 2026	t	2026-07-03 16:53:16.038878	2026-07-03 16:53:16.038878
5931	\N	Holy Angels Learning School Inc.	HOLY ANGELS LEARNING SCHOOL INC	Grade 7-10 & Grade 11-12	Unknown	San Pedro	Laguna	Molave St., Southern Hts. 2-A	14.3440525	121.0377825	Masterlist 2026	t	2026-07-03 16:53:16.038878	2026-07-03 16:53:16.038878
5932	\N	Holy Cross Academy of Padre Burgos, Inc.	HOLY CROSS ACADEMY OF PADRE BURGOS INC	Grade 7-10 & Grade 11-12	Unknown	Pagbilao	Quezon		13.916179	121.8150534	Masterlist 2026	t	2026-07-03 16:53:16.038878	2026-07-03 16:53:16.038878
5933	\N	Holy Face of Jesus Lyceum of San Jose Inc.	HOLY FACE OF JESUS LYCEUM OF SAN JOSE INC	Grade 11-12	Unknown	Rodriguez	Rizal	285 Mabolo St., cor. Sampaguita St., San Jose, Rodriguez, Rizal	14.7295662	121.1353944	Masterlist 2026	t	2026-07-03 16:53:16.038878	2026-07-03 16:53:16.038878
5934	\N	Holy Family Academy	HOLY FAMILY ACADEMY	Grade 11-12	Unknown	Padre Garcia	Batangas	Banaba, Padre Garcia, Batangas	13.8815103	121.2168684	Masterlist 2026	t	2026-07-03 16:53:16.038878	2026-07-03 16:53:16.038878
5935	\N	Holy Trinity School of Padre Garcia - Mataasnakahoy Branch, Inc.	HOLY TRINITY SCHOOL OF PADRE GARCIA MATAASNAKAHOY BRANCH INC	Grade 11-12	Unknown	Mataas Na Kahoy	Batangas	V. Templo St., Poblacion, Mataasnakahoy, Batangas	13.957001	121.115669	Masterlist 2026	t	2026-07-03 16:53:16.038878	2026-07-03 16:53:16.038878
5936	\N	Holy Trinity School of Science and Technology Inc.	HOLY TRINITY SCHOOL OF SCIENCE AND TECHNOLOGY INC	Grade 11-12	Unknown	San Carlos City	Negros Occidental	National Road San Carlos	10.4826476	123.4193985	Masterlist 2026	t	2026-07-03 16:53:16.038878	2026-07-03 16:53:16.038878
5937	\N	Hondagua NHS	HONDAGUA NHS	Grade 7-10 & Grade 11-12	Unknown	Lopez	Quezon	Hondagua	13.9430277	122.2469545	Masterlist 2026	t	2026-07-03 16:53:16.038878	2026-07-03 16:53:16.038878
5938	\N	Hondagua Port High Schol	HONDAGUA PORT HIGH SCHOL	Grade 7-10 & Grade 11-12	Unknown	Lopez	Quezon		13.9481511	122.2418555	Masterlist 2026	t	2026-07-03 16:53:16.038878	2026-07-03 16:53:16.038878
5939	\N	Hulo National High School	HULO NATIONAL HIGH SCHOOL	Grade 7-10 & Grade 11-12	Unknown	Mandaluyong City	Metro Manila	Sitio Ligua	14.569246	121.034952	Masterlist 2026	t	2026-07-03 16:53:16.038878	2026-07-03 16:53:16.038878
5940	\N	Huyon-Uyon National High School	HUYONUYON NATIONAL HIGH SCHOOL	Grade 7-10 & Grade 11-12	Unknown	San Francisco (Aurora)	Quezon	Sitio Mabuhay 1	13.2652415	122.6107881	Masterlist 2026	t	2026-07-03 16:53:16.038878	2026-07-03 16:53:16.038878
5941	\N	Hyong Yang Institute of Technology Inc.,	HYONG YANG INSTITUTE OF TECHNOLOGY INC	Grade 11-12	Unknown	Lucena City	Quezon	8 Enriquez Street	13.9375631	121.6137416	Masterlist 2026	t	2026-07-03 16:53:16.038878	2026-07-03 16:53:16.038878
5942	\N	Ibabang Talim Integrated High School	IBABANG TALIM INTEGRATED HIGH SCHOOL	Grade 7-10 & Grade 11-12	Unknown	Lucena City	Quezon	Purok Masayahin, Brgy. Ibabang Talim	13.9099138	121.5808177	Masterlist 2026	t	2026-07-03 16:53:16.038878	2026-07-03 16:53:16.038878
5943	\N	Ibayiw Integrated National High School	IBAYIW INTEGRATED NATIONAL HIGH SCHOOL	Grade 7-10 & Grade 11-12	Unknown	Alaminos	Laguna		14.0526777	121.2588331	Masterlist 2026	t	2026-07-03 16:53:16.038878	2026-07-03 16:53:16.038878
5944	\N	ICCT Colleges Foundation, Inc. - Antipolo Campus	ICCT COLLEGES FOUNDATION INC ANTIPOLO CAMPUS	Grade 11-12	Unknown	Antipolo	Rizal	J. Sumulong Street	14.5834522	121.1696549	Masterlist 2026	t	2026-07-03 16:53:16.038878	2026-07-03 16:53:16.038878
5945	\N	ICCT Colleges Foundation, Inc. - Cogeo Campus	ICCT COLLEGES FOUNDATION INC COGEO CAMPUS	Grade 11-12	Unknown	Binangonan	Rizal	Forest Hills Road cor. Marcos Highway Ext., Cogeo	14.4796318	121.1879551	Masterlist 2026	t	2026-07-03 16:53:16.038878	2026-07-03 16:53:16.038878
5946	\N	ICCT Colleges Foundation, Inc.-Angono Campus	ICCT COLLEGES FOUNDATION INCANGONO CAMPUS	Grade 11-12	Unknown	Binangonan	Rizal	Manila East Road, Brgy. San Roque, Angono, Rizal	14.4796318	121.1879551	Masterlist 2026	t	2026-07-03 16:53:16.038878	2026-07-03 16:53:16.038878
5947	\N	ICCT Colleges Foundation, Inc.-Binangonan Campus	ICCT COLLEGES FOUNDATION INCBINANGONAN CAMPUS	Grade 11-12	Unknown	Binangonan	Rizal	National Hi-way, Brgy. Calumpang, Binangonan, Rizal	14.4796318	121.1879551	Masterlist 2026	t	2026-07-03 16:53:16.038878	2026-07-03 16:53:16.038878
5948	\N	ICCT Colleges Foundation, Inc.-Cainta	ICCT COLLEGES FOUNDATION INCCAINTA	Grade 11-12	Unknown	Cainta	Rizal	V.V. Soliven Avenue II, Cainta, Rizal	14.6177068	121.1026223	Masterlist 2026	t	2026-07-03 16:53:16.038878	2026-07-03 16:53:16.038878
5949	\N	ICCT Colleges Foundation, Inc.-San Mateo Campus	ICCT COLLEGES FOUNDATION INCSAN MATEO CAMPUS	Grade 11-12	Unknown	San Mateo	Rizal	General Luna Road cor. Resurrecsion St., Brgy. Sta. Ana, San Mateo, Rizal	14.6926726	121.1169832	Masterlist 2026	t	2026-07-03 16:53:16.038878	2026-07-03 16:53:16.038878
5950	\N	ICCT Colleges Foundation, Inc.-Sumulong Campus	ICCT COLLEGES FOUNDATION INCSUMULONG CAMPUS	Grade 11-12	Unknown	Cainta	Rizal	Sumulong Hi-way, Brgy. San Isidro, Cainta, Rizal	14.633503	121.1084812	Masterlist 2026	t	2026-07-03 16:53:16.038878	2026-07-03 16:53:16.038878
5951	\N	ICCT Colleges Foundation, Inc.-Taytay Campus	ICCT COLLEGES FOUNDATION INCTAYTAY CAMPUS	Grade 11-12	Unknown	Taytay	Rizal	Cabrera Road cor. Manila East Road, Brgy, San Juan, Taytay, Rizal	14.557907	121.1369772	Masterlist 2026	t	2026-07-03 16:53:16.038878	2026-07-03 16:53:16.038878
5952	\N	ICT-ED INSTITUTE  OF SCIENCE AND TECHNOLOGY INC.	ICTED INSTITUTE OF SCIENCE AND TECHNOLOGY INC	Grade 11-12	Unknown	Lipa City	Batangas	Barangay Pinagkawitan, Lipa City	13.9019062	121.1943864	Masterlist 2026	t	2026-07-03 16:53:16.038878	2026-07-03 16:53:16.038878
5954	\N	IETI College of Science and Technology	IETI COLLEGE OF SCIENCE AND TECHNOLOGY	Grade 11-12	Unknown	San Pedro	Metro Manila	3F MMG Bldg., USPS, National Highway	14.3355364	121.0316271	Masterlist 2026	t	2026-07-03 16:53:16.038878	2026-07-03 16:53:16.038878
5955	\N	IKON COLLEGE-Calamba, Inc.	IKON COLLEGECALAMBA INC	Grade 11-12	Unknown	Calamba	Laguna	9140 Cadena de Amor St., Dolor Subd., Brgy. Uno, Poblacion, Crossing, Calamba City	14.203488	121.15646	Masterlist 2026	t	2026-07-03 16:53:16.038878	2026-07-03 16:53:16.038878
5956	\N	Ilayang Ilog-A NHS (Formerly San Francisco B NHS Ilayang Ilog A Ext.)	ILAYANG ILOGA NHS FORMERLY SAN FRANCISCO B NHS ILAYANG ILOG A EXT	Grade 7-10 & Grade 11-12	Unknown	Lopez	Quezon	Ilayang Ilog A	13.8231463	122.2398636	Masterlist 2026	t	2026-07-03 16:53:16.038878	2026-07-03 16:53:16.038878
5957	\N	Ilayang Yuni Junior and Senior Integrated NHS	ILAYANG YUNI JUNIOR AND SENIOR INTEGRATED NHS	Grade 7-10 & Grade 11-12	Unknown	Mulanay	Quezon	Ilayang Yuni	13.4536358	122.5231281	Masterlist 2026	t	2026-07-03 16:53:16.038878	2026-07-03 16:53:16.038878
5958	\N	IMMACULATE COLLEGE OF CAVITE INC.	IMMACULATE COLLEGE OF CAVITE INC	Grade 11-12	Unknown	Bacoor	Cavite	2nd Floor, Maria Salud Building, E. Aguinaldo Highway, Panapaan VI, Bacoor City	14.4427824	120.9515499	Masterlist 2026	t	2026-07-03 16:53:16.038878	2026-07-03 16:53:16.038878
5959	\N	Immaculate Concepcion Catholic School	IMMACULATE CONCEPCION CATHOLIC SCHOOL	Grade 7-10 & Grade 11-12	Unknown	Santa Cruz	Laguna	P. Guevarra St., Brgy Polblacion 3, Sta Cruz, Laguna	14.2691095	121.4113308	Masterlist 2026	t	2026-07-03 16:53:16.038878	2026-07-03 16:53:16.038878
5960	\N	Immaculate Conception Academy-West Campus	IMMACULATE CONCEPTION ACADEMYWEST CAMPUS	Grade 7-10 & Grade 11-12	Unknown	Dasmariñas	Cavite	Amuntay Road	14.3218948	120.93373	Masterlist 2026	t	2026-07-03 16:53:16.038878	2026-07-03 16:53:16.038878
5961	\N	Immaculate Heart of Mary School	IMMACULATE HEART OF MARY SCHOOL	Grade 11-12	Unknown	San Pedro	Laguna	Avocado St., Guevara Subd., Pacita 2, Brgy. San Vicente, City of San Pedro, Laguna	14.3511355	121.0548037	Masterlist 2026	t	2026-07-03 16:53:16.038878	2026-07-03 16:53:16.038878
5962	\N	Indang Integrated National High School	INDANG INTEGRATED NATIONAL HIGH SCHOOL	Grade 7-10 & Grade 11-12	Unknown	Indang	Cavite	J. Dimabiling St.	14.1990173	120.8740117	Masterlist 2026	t	2026-07-03 16:53:16.038878	2026-07-03 16:53:16.038878
5963	\N	Infant Jesus Academy of Silang, Inc.	INFANT JESUS ACADEMY OF SILANG INC	Grade 7-10 & Grade 11-12	Unknown	Silang	Cavite	J.P. Rizal St., Silang, Cavite	14.224108	120.9749051	Masterlist 2026	t	2026-07-03 16:53:16.038878	2026-07-03 16:53:16.038878
5964	\N	Infanta NHS	INFANTA NHS	Grade 7-10 & Grade 11-12	Unknown	Infanta	Quezon	Ruanto St. Pob. 38	14.7407062	121.6451014	Masterlist 2026	t	2026-07-03 16:53:16.038878	2026-07-03 16:53:16.038878
5965	\N	INFORMATICS COLLEGE CAVITE, INC.	INFORMATICS COLLEGE CAVITE INC	Grade 11-12	Unknown	Imus	Cavite	Informatics Building, Km. 21 Anabu I-E, Imus City	14.3921711	120.9399899	Masterlist 2026	t	2026-07-03 16:53:16.044717	2026-07-03 16:53:16.044717
5966	\N	Informatics College Cavite, Inc. (fomerly Informatics Computer Institute Cavite Center, Inc.)	INFORMATICS COLLEGE CAVITE INC FOMERLY INFORMATICS COMPUTER INSTITUTE CAVITE CENTER INC	Grade 11-12	Unknown	Imus	Cavite	Informatics Building, Aguinaldo Highway, Anabu 1-E, Imus Cavite	14.3921711	120.9399899	Masterlist 2026	t	2026-07-03 16:53:16.044717	2026-07-03 16:53:16.044717
5967	\N	INFOTAB TECHNOLOGY INSTITUTE, INCORPORATED	INFOTAB TECHNOLOGY INSTITUTE INCORPORATED	Grade 11-12	Unknown	Lucena City	Quezon	Maharlika Highway, Purok Ilang-Ilang	13.9481404	121.5859747	Masterlist 2026	t	2026-07-03 16:53:16.044717	2026-07-03 16:53:16.044717
5968	\N	INFOTECH COLLEGE OF ARTS & SCIENCES PHILIPPINES, INC.	INFOTECH COLLEGE OF ARTS SCIENCES PHILIPPINES INC	Grade 11-12	Unknown	Antipolo	Rizal	4/F 4A & 4B Rafael Tower, 102 Plaza, Pagrai	14.625765	121.1453471	Masterlist 2026	t	2026-07-03 16:53:16.044717	2026-07-03 16:53:16.044717
5969	\N	Innovatech Skills & Resource Institute Inc.	INNOVATECH SKILLS RESOURCE INSTITUTE INC	Grade 11-12	Unknown	Antipolo	Rizal	#238 San Jose St.,	14.5908863	121.1772803	Masterlist 2026	t	2026-07-03 16:53:16.044717	2026-07-03 16:53:16.044717
5970	\N	Inosloban-Marawoy Integrated National High School	INOSLOBANMARAWOY INTEGRATED NATIONAL HIGH SCHOOL	Grade 7-10 & Grade 11-12	Unknown	Lipa City	Batangas	Marawoy	13.9754036	121.1678243	Masterlist 2026	t	2026-07-03 16:53:16.044717	2026-07-03 16:53:16.044717
5971	\N	Integrated School of Lawa	INTEGRATED SCHOOL OF LAWA	Grade 7-10 & Grade 11-12	Unknown	Calamba	Laguna	Purok 5 Brgy. Lawa	14.2083125	121.1412208	Masterlist 2026	t	2026-07-03 16:53:16.044717	2026-07-03 16:53:16.044717
5972	\N	Inter-Global College Foundation, Inc.	INTERGLOBAL COLLEGE FOUNDATION INC	Grade 11-12	Unknown	Lucena City	Quezon	Brgy. Bocohan, Lucena City	13.9573787	121.5921618	Masterlist 2026	t	2026-07-03 16:53:16.044717	2026-07-03 16:53:16.044717
5973	\N	International Electronics and Technical Institute (BiÃ±an), Inc.	INTERNATIONAL ELECTRONICS AND TECHNICAL INSTITUTE BIA±AN INC	Grade 11-12	Unknown	Biñan	Cavite	Caridad Mendoza Business Center, Km. 33  National Highway, Sto. Domingo BiÃ±an, Laguna	14.334145	121.081011	Masterlist 2026	t	2026-07-03 16:53:16.044717	2026-07-03 16:53:16.044717
5974	\N	International Electronics and Technical Institute (Calamba), Inc.	INTERNATIONAL ELECTRONICS AND TECHNICAL INSTITUTE CALAMBA INC	Grade 11-12	Unknown	Calamba	Laguna	IETI Bldg. No. 32 LE Burgos St., Brgy. San Jose , Calamba City, Laguna	14.2140415	121.1711514	Masterlist 2026	t	2026-07-03 16:53:16.044717	2026-07-03 16:53:16.044717
5975	\N	International Electronics and Technical Institute, Inc.-Imus	INTERNATIONAL ELECTRONICS AND TECHNICAL INSTITUTE INCIMUS	Grade 11-12	Unknown	Imus	Cavite	SC Realty Bldg., E. Aguinaldo Hi-way, Tanzang Luma III, Imus, Cavite	14.419762	120.941301	Masterlist 2026	t	2026-07-03 16:53:16.044717	2026-07-03 16:53:16.044717
5976	\N	International Peace Leadership College, Inc.	INTERNATIONAL PEACE LEADERSHIP COLLEGE INC	Grade 11-12	Unknown	Tanay	Rizal	Mayagay I, Sampaloc	14.5787997	121.3620348	Masterlist 2026	t	2026-07-03 16:53:16.044717	2026-07-03 16:53:16.044717
5977	\N	International School for Hotel and Restaurant Management (ISHRM)-DasmariÃ±as Branch	INTERNATIONAL SCHOOL FOR HOTEL AND RESTAURANT MANAGEMENT ISHRMDASMARIA±AS BRANCH	Grade 11-12	Unknown	Bacoor	Cavite	EVY Commercial Building, cor. Salawag and Molino Rd., DasmariÃ±as, Cavite	14.4219984	120.9750134	Masterlist 2026	t	2026-07-03 16:53:16.044717	2026-07-03 16:53:16.044717
5978	\N	ISHRM School System, Inc.	ISHRM SCHOOL SYSTEM INC	Grade 11-12	Unknown	Bacoor	Cavite	Tirona Highway	14.4482129	120.9411833	Masterlist 2026	t	2026-07-03 16:53:16.044717	2026-07-03 16:53:16.044717
5979	\N	Islamic Studies, Call and Guidance School	ISLAMIC STUDIES CALL AND GUIDANCE SCHOOL	Grade 11-12	Unknown	Dasmariñas	Cavite	Salitran I	14.3571245	120.9374332	Masterlist 2026	t	2026-07-03 16:53:16.044717	2026-07-03 16:53:16.044717
5980	\N	iTechnological Institute, Inc.	ITECHNOLOGICAL INSTITUTE INC	Grade 11-12	Unknown	Rosario	Cavite	3rd Flr., SS Abutin Bldg., 248, Gen. Trias Drive, Rosario, Cavite	14.4139407	120.8572531	Masterlist 2026	t	2026-07-03 16:53:16.044717	2026-07-03 16:53:16.044717
5981	\N	Itlugan Integrated National High School	ITLUGAN INTEGRATED NATIONAL HIGH SCHOOL	Grade 7-10 & Grade 11-12	Unknown	Rosario	Batangas	Itlugan, Rosario, Batangas	13.8185693	121.2025336	Masterlist 2026	t	2026-07-03 16:53:16.044717	2026-07-03 16:53:16.044717
5982	\N	J. Santiago Integrated High School	J SANTIAGO INTEGRATED HIGH SCHOOL	Grade 7-10 & Grade 11-12	Unknown	Tanay	Rizal	Brgy. Santiago	14.563273	121.4414415	Masterlist 2026	t	2026-07-03 16:53:16.044717	2026-07-03 16:53:16.044717
5983	\N	Jacinto G. Esplana National High School	JACINTO G ESPLANA NATIONAL HIGH SCHOOL	Grade 7-10 & Grade 11-12	Unknown	San Francisco (Aurora)	Quezon	Ilayang Tayuman	13.4155777	122.517367	Masterlist 2026	t	2026-07-03 16:53:16.044717	2026-07-03 16:53:16.044717
5984	\N	Jalajala National High School	JALAJALA NATIONAL HIGH SCHOOL	Grade 7-10 & Grade 11-12	Unknown	Jala-jala	Rizal	M. Bellin Jr. St.	14.3534587	121.3253907	Masterlist 2026	t	2026-07-03 16:53:16.044717	2026-07-03 16:53:16.044717
5985	\N	Janosa National High School	JANOSA NATIONAL HIGH SCHOOL	Grade 7-10 & Grade 11-12	Unknown	Binangonan	Rizal	Janosa	14.3524945	121.2190247	Masterlist 2026	t	2026-07-03 16:53:16.044717	2026-07-03 16:53:16.044717
5986	\N	Jaybanga Integrated National High School	JAYBANGA INTEGRATED NATIONAL HIGH SCHOOL	Grade 7-10 & Grade 11-12	Unknown	Lobo	Batangas	Jaybanga, Lobo, Batangas	13.6753929	121.2912463	Masterlist 2026	t	2026-07-03 16:53:16.044717	2026-07-03 16:53:16.044717
5987	\N	Jesus Is Lord Christian School	JESUS IS LORD CHRISTIAN SCHOOL	Grade 11-12	Unknown	Tanauan City	Batangas	J.V Pagaspas St., Brgy. Poblacion IV, Tanauan City, Batangas	14.0867993	121.148054	Masterlist 2026	t	2026-07-03 16:53:16.044717	2026-07-03 16:53:16.044717
5988	\N	Jesus Reigns Christian College - Amadeo	JESUS REIGNS CHRISTIAN COLLEGE AMADEO	Grade 11-12	Unknown	Amadeo	Cavite	Crisanto Delos Reyes Road, Brgy. Amadeo, Cavite	14.1804106	120.9322704	Masterlist 2026	t	2026-07-03 16:53:16.044717	2026-07-03 16:53:16.044717
5989	\N	JOEL B. ARQUIZA NHS	JOEL B ARQUIZA NHS	Grade 7-10 & Grade 11-12	Unknown	Malolos	Bulacan	Guinhawa	14.8559295	120.8161538	Masterlist 2026	t	2026-07-03 16:53:16.044717	2026-07-03 16:53:16.044717
5990	\N	Jomalig NHS	JOMALIG NHS	Grade 7-10 & Grade 11-12	Unknown	Jomalig	Quezon	Talisoy	14.699183	122.3390936	Masterlist 2026	t	2026-07-03 16:53:16.044717	2026-07-03 16:53:16.044717
5991	\N	Jongo National High School	JONGO NATIONAL HIGH SCHOOL	Grade 7-10 & Grade 11-12	Unknown	Lopez	Quezon	Jongo	13.876133	122.233597	Masterlist 2026	t	2026-07-03 16:53:16.044717	2026-07-03 16:53:16.044717
5992	\N	Juanito C. Wagan  Integrated National High School  (Formerly San Antonio National High School Annex)	JUANITO C WAGAN INTEGRATED NATIONAL HIGH SCHOOL FORMERLY SAN ANTONIO NATIONAL HIGH SCHOOL ANNEX	Grade 7-10 & Grade 11-12	Unknown	San Jose	Occidental Mindoro	San Jose	12.4011916	121.1022942	Masterlist 2026	t	2026-07-03 16:53:16.044717	2026-07-03 16:53:16.044717
5993	\N	Kabulusan Integrated National High School	KABULUSAN INTEGRATED NATIONAL HIGH SCHOOL	Grade 7-10 & Grade 11-12	Unknown	Pakil	Laguna	Sampaguita Street	14.3673155	121.4008087	Masterlist 2026	t	2026-07-03 16:53:16.044717	2026-07-03 16:53:16.044717
5994	\N	Kapayapaan Integrated School	KAPAYAPAAN INTEGRATED SCHOOL	Grade 7-10 & Grade 11-12	Unknown	Calamba	Laguna	Manfil, Kapayapaan Ville, Canlubang, Calamba City	14.2046799	121.096328	Masterlist 2026	t	2026-07-03 16:53:16.044717	2026-07-03 16:53:16.044717
5995	\N	Kasiglahan Village Senior High School	KASIGLAHAN VILLAGE SENIOR HIGH SCHOOL	Grade 11-12	Unknown	Rodriguez	Rizal	Phase 1K2, Kasiglahan Village, San Jose, Rodriguez, Rizal	14.7444204	121.144194	Masterlist 2026	t	2026-07-03 16:53:16.044717	2026-07-03 16:53:16.044717
5996	\N	Katimo NHS	KATIMO NHS	Grade 7-10 & Grade 11-12	Unknown	Tagkawayan	Quezon	Sitio Centro	13.9397435	122.4495547	Masterlist 2026	t	2026-07-03 16:53:16.044717	2026-07-03 16:53:16.044717
5997	\N	Kay-Anlog National High School	KAYANLOG NATIONAL HIGH SCHOOL	Grade 7-10 & Grade 11-12	Unknown	Calamba	Laguna	Purok 1, Brgy. Kay-Anlog	14.163976	121.1196797	Masterlist 2026	t	2026-07-03 16:53:16.044717	2026-07-03 16:53:16.044717
5998	\N	Kaylaway Integrated National High School	KAYLAWAY INTEGRATED NATIONAL HIGH SCHOOL	Grade 7-10 & Grade 11-12	Unknown	Nasugbu	Batangas	Kaylaway, Nasugbu, Batangas	14.0822505	120.8096918	Masterlist 2026	t	2026-07-03 16:53:16.044717	2026-07-03 16:53:16.044717
5999	\N	Kaysakat NHS	KAYSAKAT NHS	Grade 7-10 & Grade 11-12	Unknown	Antipolo	Rizal	Sitio Kaysakat	14.6498869	121.245723	Masterlist 2026	t	2026-07-03 16:53:16.044717	2026-07-03 16:53:16.044717
6000	\N	Kaytitinga Integrated School	KAYTITINGA INTEGRATED SCHOOL	Grade 7-10 & Grade 11-12	Unknown	Alfonso	Cavite	15	14.107958	120.828087	Masterlist 2026	t	2026-07-03 16:53:16.044717	2026-07-03 16:53:16.044717
6001	\N	KCD College of Accountancy	KCD COLLEGE OF ACCOUNTANCY	Grade 11-12	Unknown	Alaminos	Laguna	2nd Floor KCD Commercial Complex, National Highway, Alaminos, Laguna	14.0634451	121.2442651	Masterlist 2026	t	2026-07-03 16:53:16.044717	2026-07-03 16:53:16.044717
6002	\N	KCD Technical Institute	KCD TECHNICAL INSTITUTE	Grade 11-12	Unknown	Alaminos	Laguna	National Highway, Brgy. II, Poblacion, Alaminos, Laguna	14.0634451	121.2442651	Masterlist 2026	t	2026-07-03 16:53:16.044717	2026-07-03 16:53:16.044717
6003	\N	Kinatakutan NHS	KINATAKUTAN NHS	Grade 7-10 & Grade 11-12	Unknown	Tagkawayan	Quezon	Kinatakutan, Tagkawayan, Quezon	13.9537501	122.4750292	Masterlist 2026	t	2026-07-03 16:53:16.044717	2026-07-03 16:53:16.044717
6004	\N	L. Bernardo Memorial High School, Inc.	L BERNARDO MEMORIAL HIGH SCHOOL INC	Grade 7-10 & Grade 11-12	Unknown	Luisiana	Laguna	Bala	14.1846865	121.5064856	Masterlist 2026	t	2026-07-03 16:53:16.044717	2026-07-03 16:53:16.044717
6005	\N	La Consolacion College Biñan	LA CONSOLACION COLLEGE BINAN	Grade 11-12	Unknown	Biñan	Laguna	Sto. Tomas, Biñan City, Laguna	14.3265075	121.0777893	Masterlist 2026	t	2026-07-03 16:53:16.044717	2026-07-03 16:53:16.044717
6006	\N	LABAS SENIOR HIGH SCHOOL STAND ALONE	LABAS SENIOR HIGH SCHOOL STAND ALONE	Grade 11-12	Unknown	City of Santa Rosa	Laguna	Westdrive Village Brgy. Labas	14.3072272	121.1096112	Masterlist 2026	t	2026-07-03 16:53:16.044717	2026-07-03 16:53:16.044717
6007	\N	Lagay NHS	LAGAY NHS	Grade 7-10 & Grade 11-12	Unknown	Calauag	Quezon	Lagay	14.0825411	122.2256803	Masterlist 2026	t	2026-07-03 16:53:16.044717	2026-07-03 16:53:16.044717
6008	\N	Laguna College	LAGUNA COLLEGE	Grade 11-12	Unknown	San Pablo	Laguna	Paseo de Escudero Street, San Pablo City, Laguna	14.0724952	121.3261566	Masterlist 2026	t	2026-07-03 16:53:16.044717	2026-07-03 16:53:16.044717
6009	\N	Laguna College of Business and Arts	LAGUNA COLLEGE OF BUSINESS AND ARTS	Grade 11-12	Unknown	Calamba	Laguna	Padre Burgos, Calamba City, Laguna	14.210664	121.162031	Masterlist 2026	t	2026-07-03 16:53:16.044717	2026-07-03 16:53:16.044717
6010	\N	Laguna Eastern Academy of Santa. Rosa, Inc.	LAGUNA EASTERN ACADEMY OF SANTA ROSA INC	Grade 7-10 & Grade 11-12	Unknown	City of Santa Rosa	Laguna	Ambrocia Subd. Brgy. Ibaba, City of Santa Rosa, Laguna	14.3132123	121.1169343	Masterlist 2026	t	2026-07-03 16:53:16.044717	2026-07-03 16:53:16.044717
6011	\N	Laguna Maritime Arts and Business Colleges	LAGUNA MARITIME ARTS AND BUSINESS COLLEGES	Grade 7-10 & Grade 11-12	Unknown	Pangil	Laguna	109 San Marcos Street Balian Pangil, Laguna	14.4009668	121.4770388	Masterlist 2026	t	2026-07-03 16:53:16.044717	2026-07-03 16:53:16.044717
6012	\N	Laguna Northwestern College	LAGUNA NORTHWESTERN COLLEGE	Grade 11-12	Unknown	San Pedro	Laguna	56 Mabini St., San Antonio, San Pedro City, Laguna	14.3668946	121.0531612	Masterlist 2026	t	2026-07-03 16:53:16.044717	2026-07-03 16:53:16.044717
6013	\N	Laguna Northwestern College - SLRMC	LAGUNA NORTHWESTERN COLLEGE SLRMC	Grade 11-12	Unknown	Siniloan	Laguna	Brgy. Buhay, Siniloan, Laguna	14.4302348	121.4489124	Masterlist 2026	t	2026-07-03 16:53:16.044717	2026-07-03 16:53:16.044717
6014	\N	Laguna Northwestern College-Corinthian Center	LAGUNA NORTHWESTERN COLLEGECORINTHIAN CENTER	Grade 11-12	Unknown	City of Santa Rosa	Laguna	F. Reyes St., Balibago, Sta. Rosa City, Laguna	14.2913782	121.0965092	Masterlist 2026	t	2026-07-03 16:53:16.044717	2026-07-03 16:53:16.044717
6015	\N	Laguna Northwestern College-SLRMC	LAGUNA NORTHWESTERN COLLEGESLRMC	Grade 11-12	Unknown	Siniloan	Laguna	Brgy. Buhay, Siniloan, Laguna	14.4302348	121.4489124	Masterlist 2026	t	2026-07-03 16:53:16.050365	2026-07-03 16:53:16.050365
6016	\N	Laguna Science and Technology College	LAGUNA SCIENCE AND TECHNOLOGY COLLEGE	Grade 11-12	Unknown	San Pedro	Laguna	FilipiÃ±a Compound, National Highway, Landayan, San Pedro, Laguna	14.3502332	121.064161	Masterlist 2026	t	2026-07-03 16:53:16.050365	2026-07-03 16:53:16.050365
6017	\N	Laguna Science Integrated High School	LAGUNA SCIENCE INTEGRATED HIGH SCHOOL	Grade 7-10 & Grade 11-12	Unknown	Bay	Laguna	Brgy. Maitim Bay , Laguna	14.1846322	121.2755118	Masterlist 2026	t	2026-07-03 16:53:16.050365	2026-07-03 16:53:16.050365
6018	\N	LAGUNA SENIOR HIGH SCHOOL	LAGUNA SENIOR HIGH SCHOOL	Grade 11-12	Unknown	Santa Cruz	Laguna	Barangay 1- Poblacion	14.2774484	121.4192258	Masterlist 2026	t	2026-07-03 16:53:16.050365	2026-07-03 16:53:16.050365
6019	\N	Laguna State Polytechnic University	LAGUNA STATE POLYTECHNIC UNIVERSITY	Grade 11-12	Unknown	Santa Cruz	Laguna	Bubukal, Sta. Cruz, Laguna	14.2623126	121.397633	Masterlist 2026	t	2026-07-03 16:53:16.050365	2026-07-03 16:53:16.050365
6020	\N	LAGUNA STATE POLYTECHNIC UNIVERSITY - LOS BAÃ‘OS	LAGUNA STATE POLYTECHNIC UNIVERSITY LOS BAA‘OS	Grade 7-10 & Grade 11-12	Unknown	San Pablo City	Laguna	Brgy. mayondon, Los BaÃ±os, Laguna	14.083093	121.312231	Masterlist 2026	t	2026-07-03 16:53:16.050365	2026-07-03 16:53:16.050365
6021	\N	LAGUNA STATE POLYTECHNIC UNIVERSITY - STA CRUZ	LAGUNA STATE POLYTECHNIC UNIVERSITY STA CRUZ	Grade 1-6, Grade 7-10 & Grade 11-12	Unknown	Santa Cruz	Laguna	Brgy. Bubuka, Sta Cruz, Laguna	14.2623126	121.397633	Masterlist 2026	t	2026-07-03 16:53:16.050365	2026-07-03 16:53:16.050365
6022	\N	Laguna State Polytechnic University-Los Baños	LAGUNA STATE POLYTECHNIC UNIVERSITYLOS BANOS	Grade 11-12	Unknown	Los Baños	Laguna	Brgy. Malinta, Los Baños, Laguna	14.1867953	121.2318546	Masterlist 2026	t	2026-07-03 16:53:16.050365	2026-07-03 16:53:16.050365
6023	\N	Laguna State Polytechnic University-Nagcarlan	LAGUNA STATE POLYTECHNIC UNIVERSITYNAGCARLAN	Grade 11-12	Unknown	Nagcarlan	Laguna	, Nagcarlan, Laguna	14.1145404	121.4163769	Masterlist 2026	t	2026-07-03 16:53:16.050365	2026-07-03 16:53:16.050365
6024	\N	Laguna State Polytechnic University-San Pablo City	LAGUNA STATE POLYTECHNIC UNIVERSITYSAN PABLO CITY	Grade 1-6, Grade 7-10 & Grade 11-12	Unknown	San Pablo City	Laguna	Lt. Cosico Avenue	14.083093	121.312231	Masterlist 2026	t	2026-07-03 16:53:16.050365	2026-07-03 16:53:16.050365
6025	\N	Laguna State Polytechnic University-Siniloan	LAGUNA STATE POLYTECHNIC UNIVERSITYSINILOAN	Grade 11-12	Unknown	Siniloan	Laguna	L. de Leon, Siniloan, Laguna	14.4134583	121.4485178	Masterlist 2026	t	2026-07-03 16:53:16.050365	2026-07-03 16:53:16.050365
6028	\N	Laiban National High School	LAIBAN NATIONAL HIGH SCHOOL	Grade 7-10 & Grade 11-12	Unknown	Tanay	Rizal	Kamagong	14.61931	121.3889694	Masterlist 2026	t	2026-07-03 16:53:16.050365	2026-07-03 16:53:16.050365
6029	\N	Laiya Integrated National High School	LAIYA INTEGRATED NATIONAL HIGH SCHOOL	Grade 7-10 & Grade 11-12	Unknown	San Juan	Batangas	Laiya Ibabao, San Juan, Batangas	13.681922	121.4156167	Masterlist 2026	t	2026-07-03 16:53:16.050365	2026-07-03 16:53:16.050365
6030	\N	Lake Shore Educational Institution	LAKE SHORE EDUCATIONAL INSTITUTION	Grade 7-10 & Grade 11-12	Unknown	Biñan	Laguna	A. Bonifacio St., Canlalay BiÃ±an City, Laguna	14.3382365	121.0806243	Masterlist 2026	t	2026-07-03 16:53:16.050365	2026-07-03 16:53:16.050365
6031	\N	Lalaguna Rural Academy	LALAGUNA RURAL ACADEMY	Grade 7-10 & Grade 11-12	Unknown	Lopez	Quezon		13.8671644	122.3317138	Masterlist 2026	t	2026-07-03 16:53:16.050365	2026-07-03 16:53:16.050365
6032	\N	Lalig National High School	LALIG NATIONAL HIGH SCHOOL	Grade 7-10 & Grade 11-12	Unknown	Tiaong	Quezon	Lalig	13.9771603	121.327866	Masterlist 2026	t	2026-07-03 16:53:16.050365	2026-07-03 16:53:16.050365
6033	\N	Lamon Bay SOF - Main Gumaca	LAMON BAY SOF MAIN GUMACA	Grade 7-10 & Grade 11-12	Unknown	Gumaca	Quezon	San Vicente	13.9205904	122.0988877	Masterlist 2026	t	2026-07-03 16:53:16.050365	2026-07-03 16:53:16.050365
6034	\N	Lamon Bay SOF Annex - Capaluhan, Calauag	LAMON BAY SOF ANNEX CAPALUHAN CALAUAG	Grade 7-10 & Grade 11-12	Unknown	Calauag	Quezon	Capaluhan	14.0276319	122.3313933	Masterlist 2026	t	2026-07-03 16:53:16.050365	2026-07-03 16:53:16.050365
6035	\N	Langgas NHS	LANGGAS NHS	Grade 7-10 & Grade 11-12	Unknown	Infanta	Quezon	Langgas	14.7124545	121.6582548	Masterlist 2026	t	2026-07-03 16:53:16.050365	2026-07-03 16:53:16.050365
6036	\N	Lecheria Integrated School	LECHERIA INTEGRATED SCHOOL	Grade 7-10 & Grade 11-12	Unknown	Calamba	Laguna	Banahaw St.	14.2055536	121.1656154	Masterlist 2026	t	2026-07-03 16:53:16.050365	2026-07-03 16:53:16.050365
6037	\N	Lemery Colleges	LEMERY COLLEGES	Grade 11-12	Unknown	Lemery	Batangas	A. Bonifacio St., Illustre Ave.,	13.8831968	120.9179767	Masterlist 2026	t	2026-07-03 16:53:16.050365	2026-07-03 16:53:16.050365
6038	\N	Lemery Senior High School	LEMERY SENIOR HIGH SCHOOL	Grade 11-12	Unknown	Lemery	Batangas	Bagong Sikat, Lemery, Batangas	13.886141	120.9152789	Masterlist 2026	t	2026-07-03 16:53:16.050365	2026-07-03 16:53:16.050365
6039	\N	Leon Guinto Memorial College	LEON GUINTO MEMORIAL COLLEGE	Grade 7-10 & Grade 11-12	Unknown	Atimonan	Quezon	443 A. Mabini Street	14.0005626	121.9209883	Masterlist 2026	t	2026-07-03 16:53:16.050365	2026-07-03 16:53:16.050365
6040	\N	Leonarda D. Vera Cruz NHS (Formerly Panaon NHS)	LEONARDA D VERA CRUZ NHS FORMERLY PANAON NHS	Grade 7-10 & Grade 11-12	Unknown	Panaon	Misamis Occidental	Ibabang Panaon	8.3665348	123.8392888	Masterlist 2026	t	2026-07-03 16:53:16.050365	2026-07-03 16:53:16.050365
6041	\N	Lian Institute	LIAN INSTITUTE	Grade 7-10 & Grade 11-12	Unknown	Lian	Batangas	J.P. Rizal St.	14.0343706	120.652721	Masterlist 2026	t	2026-07-03 16:53:16.050365	2026-07-03 16:53:16.050365
6042	\N	Lian Senior High School	LIAN SENIOR HIGH SCHOOL	Grade 11-12	Unknown	Lian	Batangas	Malaruhatan, Lian, Batangas	14.025454	120.6671296	Masterlist 2026	t	2026-07-03 16:53:16.050365	2026-07-03 16:53:16.050365
6043	\N	Libo NHS	LIBO NHS	Grade 7-10 & Grade 11-12	Unknown	Unspecified	Region IV-A	Libo	12.879721	121.774017	Masterlist 2026	t	2026-07-03 16:53:16.050365	2026-07-03 16:53:16.050365
6044	\N	Liceo de Bay	LICEO DE BAY	Grade 7-10 & Grade 11-12	Unknown	Bay	Laguna	Rizal Avenue	14.180694	121.284097	Masterlist 2026	t	2026-07-03 16:53:16.050365	2026-07-03 16:53:16.050365
6045	\N	Liceo de Luisiana	LICEO DE LUISIANA	Grade 7-10 & Grade 11-12	Unknown	Luisiana	Laguna	Bonifacio	14.1848844	121.5091579	Masterlist 2026	t	2026-07-03 16:53:16.050365	2026-07-03 16:53:16.050365
6046	\N	Liceo de Mamatid	LICEO DE MAMATID	Grade 7-10 & Grade 11-12	Unknown	Cabuyao City	Laguna	Mamatid, Cabuyao Laguna	14.234892	121.158359	Masterlist 2026	t	2026-07-03 16:53:16.050365	2026-07-03 16:53:16.050365
6047	\N	Liceo de Paete	LICEO DE PAETE	Grade 7-10 & Grade 11-12	Unknown	Paete	Laguna	B-9 Tinawin St. Paete, Laguna	14.3647727	121.4814327	Masterlist 2026	t	2026-07-03 16:53:16.050365	2026-07-03 16:53:16.050365
6048	\N	Liceo de San Antonio	LICEO DE SAN ANTONIO	Grade 7-10 & Grade 11-12	Unknown	Kalayaan	Laguna	M. Dela Fuente St. San Antonio, Kalayaan, Laguna	14.3370822	121.5101991	Masterlist 2026	t	2026-07-03 16:53:16.050365	2026-07-03 16:53:16.050365
6049	\N	Liceo De Sto. Tomas De Aquinas Inc.	LICEO DE STO TOMAS DE AQUINAS INC	Grade 11-12	Unknown	San Roque	Northern Samar	T&C Business Center, 2nd Flr., Leon Bldg., Zone 5	12.540863	124.8755214	Masterlist 2026	t	2026-07-03 16:53:16.050365	2026-07-03 16:53:16.050365
6050	\N	Liceo de Victoria	LICEO DE VICTORIA	Grade 1-6, Grade 7-10 & Grade 11-12	Unknown	Victoria	Laguna	J.P. Rizal St.	14.2243239	121.33301	Masterlist 2026	t	2026-07-03 16:53:16.050365	2026-07-03 16:53:16.050365
6051	\N	Liliw Senior High School	LILIW SENIOR HIGH SCHOOL	Grade 11-12	Unknown	Liliw	Laguna	Ibabang Taykin, Liliw, Laguna	14.143119	121.438709	Masterlist 2026	t	2026-07-03 16:53:16.050365	2026-07-03 16:53:16.050365
6052	\N	Lilyrose Educational Foundation, Inc.	LILYROSE EDUCATIONAL FOUNDATION INC	Grade 11-12	Unknown	Tanauan City	Batangas	A. Mabini Avenue, Tanauan City, Batangas	14.0854715	121.1522367	Masterlist 2026	t	2026-07-03 16:53:16.050365	2026-07-03 16:53:16.050365
6053	\N	Lina Gayeta-Lasquety NHS (Formerly Kinagunan Ibaba NHS)	LINA GAYETALASQUETY NHS FORMERLY KINAGUNAN IBABA NHS	Grade 7-10 & Grade 11-12	Unknown	Padre Burgos	Quezon	Kinagunan Ibaba	13.8889288	121.8932592	Masterlist 2026	t	2026-07-03 16:53:16.050365	2026-07-03 16:53:16.050365
6054	\N	Lipa City National High School	LIPA CITY NATIONAL HIGH SCHOOL	Grade 7-10 & Grade 11-12	Unknown	Lipa City	Batangas	B. Morada Ave., Old City Hall Compound	13.942037	121.156877	Masterlist 2026	t	2026-07-03 16:53:16.050365	2026-07-03 16:53:16.050365
6055	\N	Lipa City Science Integrated National High School	LIPA CITY SCIENCE INTEGRATED NATIONAL HIGH SCHOOL	Grade 7-10 & Grade 11-12	Unknown	Lipa City	Batangas	611 B. Morada St., Brgy.1,Lipa City	13.9424787	121.1570108	Masterlist 2026	t	2026-07-03 16:53:16.050365	2026-07-03 16:53:16.050365
6056	\N	Lipa City Senior High School	LIPA CITY SENIOR HIGH SCHOOL	Grade 11-12	Unknown	Lipa City	Batangas	B. Morada Ave.	13.9411083	121.1559415	Masterlist 2026	t	2026-07-03 16:53:16.050365	2026-07-03 16:53:16.050365
6057	\N	Lipa City Sports Academy	LIPA CITY SPORTS ACADEMY	Grade 7-10 & Grade 11-12	Unknown	Lipa City	Batangas	Sto. Tomas-Lipa Road	13.966971	121.1842002	Masterlist 2026	t	2026-07-03 16:53:16.050365	2026-07-03 16:53:16.050365
6058	\N	Liwayway National High School	LIWAYWAY NATIONAL HIGH SCHOOL	Grade 7-10 & Grade 11-12	Unknown	Mauban	Quezon	Liwayway	14.1088267	121.6875932	Masterlist 2026	t	2026-07-03 16:53:16.050365	2026-07-03 16:53:16.050365
6059	\N	LNC Corinthian Center	LNC CORINTHIAN CENTER	Grade 11-12	Unknown	City of Santa Rosa	Laguna	Balibago, Sta. Rosa City, Laguna	14.2913782	121.0965092	Masterlist 2026	t	2026-07-03 16:53:16.050365	2026-07-03 16:53:16.050365
6060	\N	Lobo Institute, Inc.	LOBO INSTITUTE INC	Grade 7-10 & Grade 11-12	Unknown	Lobo	Batangas	Olo-olo Lobo Batangas	13.6430206	121.2177908	Masterlist 2026	t	2026-07-03 16:53:16.050365	2026-07-03 16:53:16.050365
6061	\N	Lobo Senior High School	LOBO SENIOR HIGH SCHOOL	Grade 11-12	Unknown	Lobo	Batangas	Poblacion, Lobo, Batangas	13.6496871	121.2087212	Masterlist 2026	t	2026-07-03 16:53:16.050365	2026-07-03 16:53:16.050365
6062	\N	Lodlod Integrated National High School	LODLOD INTEGRATED NATIONAL HIGH SCHOOL	Grade 7-10 & Grade 11-12	Unknown	Lipa City	Batangas		13.9281707	121.1429415	Masterlist 2026	t	2026-07-03 16:53:16.050365	2026-07-03 16:53:16.050365
6063	\N	Looc  Integrated School	LOOC INTEGRATED SCHOOL	Grade 7-10 & Grade 11-12	Unknown	Calamba	Laguna	Narra St.	14.2225563	121.1773887	Masterlist 2026	t	2026-07-03 16:53:16.050365	2026-07-03 16:53:16.050365
6064	\N	Lopez National Comprehensive High School	LOPEZ NATIONAL COMPREHENSIVE HIGH SCHOOL	Grade 7-10 & Grade 11-12	Unknown	Lopez	Quezon	Maharlika Highway	13.8856403	122.2636794	Masterlist 2026	t	2026-07-03 16:53:16.050365	2026-07-03 16:53:16.050365
6065	\N	Lord Immanuel Institute Foundation, Inc.	LORD IMMANUEL INSTITUTE FOUNDATION INC	Grade 11-12	Unknown	Lobo	Batangas	J. P. Rizal St., Poblacion, Lobo, Batangas	13.6453368	121.2077047	Masterlist 2026	t	2026-07-03 16:53:16.05627	2026-07-03 16:53:16.05627
6066	\N	Los BaÃ±os - Bayog Senior High School Stand Alone	LOS BAA±OS BAYOG SENIOR HIGH SCHOOL STAND ALONE	Grade 11-12	Unknown	Los Baños	Laguna		14.1914677	121.2440936	Masterlist 2026	t	2026-07-03 16:53:16.05627	2026-07-03 16:53:16.05627
6067	\N	Los BaÃ±os Bambang Senior High School Stand Alone	LOS BAA±OS BAMBANG SENIOR HIGH SCHOOL STAND ALONE	Grade 11-12	Unknown	Bambang	Nueva Vizcaya	-Purok 3, Bambang	16.3873795	121.1076009	Masterlist 2026	t	2026-07-03 16:53:16.05627	2026-07-03 16:53:16.05627
6068	\N	Los BaÃ±os Lalakay Senior High School Stand Alone	LOS BAA±OS LALAKAY SENIOR HIGH SCHOOL STAND ALONE	Grade 11-12	Unknown	Los Baños	Laguna	National Road, Lalakay, Los Banos, Laguna	14.1718306	121.2146703	Masterlist 2026	t	2026-07-03 16:53:16.05627	2026-07-03 16:53:16.05627
6069	\N	Los BaÃ±os Senior High School (SHS) Stand Alone	LOS BAA±OS SENIOR HIGH SCHOOL SHS STAND ALONE	Grade 11-12	Unknown	Los Baños	Laguna	San Antonio, Los Banos, Laguna	14.1780533	121.24976	Masterlist 2026	t	2026-07-03 16:53:16.05627	2026-07-03 16:53:16.05627
6070	\N	Lowland Integrated National High School	LOWLAND INTEGRATED NATIONAL HIGH SCHOOL	Grade 7-10 & Grade 11-12	Unknown	Nagcarlan	Laguna	Brgy. Maravilla, Nagcarlan, Laguna	14.1791555	121.3742768	Masterlist 2026	t	2026-07-03 16:53:16.05627	2026-07-03 16:53:16.05627
6071	\N	LPU-St. Cabrini School of Health Sciences	LPUST CABRINI SCHOOL OF HEALTH SCIENCES	Grade 11-12	Unknown	Calamba	Laguna	Km. 54, National Highway, Makiling, Calamba City, Laguna	14.2205321	121.1394648	Masterlist 2026	t	2026-07-03 16:53:16.05627	2026-07-03 16:53:16.05627
6072	\N	LUALHATI D. EDAÃ‘O NHS	LUALHATI D EDAA‘O NHS	Grade 7-10 & Grade 11-12	Unknown	San Francisco (Aurora)	Quezon	Nasalaan	13.1930041	122.6220934	Masterlist 2026	t	2026-07-03 16:53:16.05627	2026-07-03 16:53:16.05627
6073	\N	Lubayat National High School (Formerly Ungos NHS - Lubayat Extension Class)	LUBAYAT NATIONAL HIGH SCHOOL FORMERLY UNGOS NHS LUBAYAT EXTENSION CLASS	Grade 7-10 & Grade 11-12	Unknown	Real	Quezon	Brgy. Lubayat, Real, Quezon	14.5046526	121.6296325	Masterlist 2026	t	2026-07-03 16:53:16.05627	2026-07-03 16:53:16.05627
6074	\N	Lucban Academy	LUCBAN ACADEMY	Grade 7-10 & Grade 11-12	Unknown	Lucban	Quezon	77 San Luis St.	14.1143871	121.5554083	Masterlist 2026	t	2026-07-03 16:53:16.05627	2026-07-03 16:53:16.05627
6075	\N	Lucena City National High School	LUCENA CITY NATIONAL HIGH SCHOOL	Grade 7-10 & Grade 11-12	Unknown	Lucena City	Quezon Province	Purok Sariling Atin Brgy. Ibabang Dupay	13.9469506	121.6279599	Masterlist 2026	t	2026-07-03 16:53:16.05627	2026-07-03 16:53:16.05627
6076	\N	Lucena Dalahican National High School	LUCENA DALAHICAN NATIONAL HIGH SCHOOL	Grade 7-10 & Grade 11-12	Unknown	Lucena City	Quezon	Dalahican Road	13.9099553	121.6170316	Masterlist 2026	t	2026-07-03 16:53:16.05627	2026-07-03 16:53:16.05627
6077	\N	Lucsuhin Integrated School	LUCSUHIN INTEGRATED SCHOOL	Grade 7-10 & Grade 11-12	Unknown	Alfonso	Cavite	LUKSUHIN	14.0926766	120.8807545	Masterlist 2026	t	2026-07-03 16:53:16.05627	2026-07-03 16:53:16.05627
6078	\N	Luis Aguado National High School	LUIS AGUADO NATIONAL HIGH SCHOOL	Grade 7-10 & Grade 11-12	Unknown	Trece Martires City	Cavite	Southville 2	14.252843	120.8679185	Masterlist 2026	t	2026-07-03 16:53:16.05627	2026-07-03 16:53:16.05627
6079	\N	LUIS C. OBIAL SENIOR HIGH SCHOOL	LUIS C OBIAL SENIOR HIGH SCHOOL	Grade 11-12	Unknown	Paete	Laguna		14.3655936	121.4799873	Masterlist 2026	t	2026-07-03 16:53:16.05627	2026-07-03 16:53:16.05627
6080	\N	Luis Palad Integrated High School	LUIS PALAD INTEGRATED HIGH SCHOOL	Grade 7-10 & Grade 11-12	Unknown	City of Tayabas	Quezon	Pedro Orias	14.0251056	121.5865876	Masterlist 2026	t	2026-07-03 16:53:16.05627	2026-07-03 16:53:16.05627
6081	\N	Luis Y. Ferrer Jr. Senior High School	LUIS Y FERRER JR SENIOR HIGH SCHOOL	Grade 11-12	Unknown	General Trias	Cavite	South Square Village, Pasong Kawayan II, City of Gen. Trias	14.3387608	120.8821493	Masterlist 2026	t	2026-07-03 16:53:16.05627	2026-07-03 16:53:16.05627
6082	\N	Luis Y. Ferrer Jr. South Senior High School	LUIS Y FERRER JR SOUTH SENIOR HIGH SCHOOL	Grade 11-12	Unknown	General Trias	Cavite	Green Breeze Subdivision, Brgy. Biclatan, General Trias City	14.276916	120.9163779	Masterlist 2026	t	2026-07-03 16:53:16.05627	2026-07-03 16:53:16.05627
6083	\N	Luisiana Integrated National High School	LUISIANA INTEGRATED NATIONAL HIGH SCHOOL	Grade 7-10 & Grade 11-12	Unknown	Luisiana	Laguna	Estrellado St.	14.1849742	121.5151678	Masterlist 2026	t	2026-07-03 16:53:16.05627	2026-07-03 16:53:16.05627
6084	\N	Lumampong Integrated National High School	LUMAMPONG INTEGRATED NATIONAL HIGH SCHOOL	Grade 7-10 & Grade 11-12	Unknown	Lumampong Halayhay	Cavite	Alfonso-Indang Rd.,	14.1622369	120.8602011	Masterlist 2026	t	2026-07-03 16:53:16.05627	2026-07-03 16:53:16.05627
6085	\N	Lumangbayan Integrated National High School	LUMANGBAYAN INTEGRATED NATIONAL HIGH SCHOOL	Grade 7-10 & Grade 11-12	Unknown	San Juan	Batangas	Pinagbayanan, San Juan, Batangas	13.801282	121.4364609	Masterlist 2026	t	2026-07-03 16:53:16.05627	2026-07-03 16:53:16.05627
6086	\N	Lumban Senior High School	LUMBAN SENIOR HIGH SCHOOL	Grade 11-12	Unknown	Lumban	Laguna	Gen. Luna St.	14.3045764	121.4590562	Masterlist 2026	t	2026-07-03 16:53:16.05627	2026-07-03 16:53:16.05627
6087	\N	Lumbang Integrated NHS	LUMBANG INTEGRATED NHS	Grade 7-10 & Grade 11-12	Unknown	Lipa City	Batangas	Purok 3, Lumbang, Lipa City	13.9799345	121.2031211	Masterlist 2026	t	2026-07-03 16:53:16.05627	2026-07-03 16:53:16.05627
6088	\N	Lumil Integrated National High School	LUMIL INTEGRATED NATIONAL HIGH SCHOOL	Grade 7-10 & Grade 11-12	Unknown	Silang	Cavite	Km. 65 Tagaytay-Sta. Rosa Road	14.1791619	121.0066896	Masterlist 2026	t	2026-07-03 16:53:16.05627	2026-07-03 16:53:16.05627
6089	\N	Lusacan National High School	LUSACAN NATIONAL HIGH SCHOOL	Grade 7-10 & Grade 11-12	Unknown	Tiaong	Quezon	Alvarez Village	13.9581498	121.3484044	Masterlist 2026	t	2026-07-03 16:53:16.05627	2026-07-03 16:53:16.05627
6090	\N	Lutucan Integrated National High School	LUTUCAN INTEGRATED NATIONAL HIGH SCHOOL	Grade 7-10 & Grade 11-12	Unknown	Sariaya	Quezon	Brgy. Lutucan Malabag, Sariaya, Quezon	13.907547	121.4914251	Masterlist 2026	t	2026-07-03 16:53:16.05627	2026-07-03 16:53:16.05627
6091	\N	Luzonian Center of Excellence for Science and Technology Inc.	LUZONIAN CENTER OF EXCELLENCE FOR SCIENCE AND TECHNOLOGY INC	Grade 11-12	Unknown	Carranglan	Nueva Ecija	Maharlika Highway	15.9514259	120.9769786	Masterlist 2026	t	2026-07-03 16:53:16.05627	2026-07-03 16:53:16.05627
6092	\N	Lyceum de San Pablo	LYCEUM DE SAN PABLO	Grade 11-12	Unknown	San Pablo City	Laguna	Richfield Educational Compound, Mahabang Parang, Brgy. Calihan, San Francisco, San Pablo City, Laguna	14.0578669	121.3240466	Masterlist 2026	t	2026-07-03 16:53:16.05627	2026-07-03 16:53:16.05627
6094	\N	LYCEUM DE STA ROSA LAGUNA EDUCATION INC.	LYCEUM DE STA ROSA LAGUNA EDUCATION INC	Grade 11-12	Unknown	City of Santa Rosa	Laguna	National Highway, Brgy. Dila, Santa Rosa City	14.296364	121.1197676	Masterlist 2026	t	2026-07-03 16:53:16.05627	2026-07-03 16:53:16.05627
6095	\N	Lyceum of San Pedro	LYCEUM OF SAN PEDRO	Grade 11-12	Unknown	San Pedro	Laguna	Phase 1A Pacita Complex, San Pedro City, Laguna	14.3475183	121.0592914	Masterlist 2026	t	2026-07-03 16:53:16.05627	2026-07-03 16:53:16.05627
6096	\N	LYCEUM OF SOUTHERN LUZON, INC.	LYCEUM OF SOUTHERN LUZON INC	Grade 7-10 & Grade 11-12	Unknown	Balayan	Batangas	Brgy. Lanatan	13.9538042	120.7291617	Masterlist 2026	t	2026-07-03 16:53:16.05627	2026-07-03 16:53:16.05627
6097	\N	LYCEUM OF ST DOMINIC INC.	LYCEUM OF ST DOMINIC INC	Grade 11-12	Unknown	Santa Elena	Camarines Norte	SB Bldg., Olega Ext., Alda	14.1815462	122.3914214	Masterlist 2026	t	2026-07-03 16:53:16.05627	2026-07-03 16:53:16.05627
6098	\N	Lyceum of the Philippines University	LYCEUM OF THE PHILIPPINES UNIVERSITY	Grade 7-10 & Grade 11-12	Unknown	Batangas City	Batangas	Capitol Site, Batangas City	13.7564054	121.0583329	Masterlist 2026	t	2026-07-03 16:53:16.05627	2026-07-03 16:53:16.05627
6099	\N	Lyceum of The Philippines University - Batangas, Inc.	LYCEUM OF THE PHILIPPINES UNIVERSITY BATANGAS INC	Grade 7-10 & Grade 11-12	Unknown	Batangas City	Batangas	Gulod Labac, Batangas City	13.7625757	121.0724373	Masterlist 2026	t	2026-07-03 16:53:16.05627	2026-07-03 16:53:16.05627
6100	\N	Lyceum of the Philippines- Laguna, Inc.	LYCEUM OF THE PHILIPPINES LAGUNA INC	Grade 7-10 & Grade 11-12	Unknown	Calamba	Laguna	Km. 54 National Highway	14.159193	121.137032	Masterlist 2026	t	2026-07-03 16:53:16.05627	2026-07-03 16:53:16.05627
6101	\N	Lyceum of the Philippines-Laguna	LYCEUM OF THE PHILIPPINESLAGUNA	Grade 11-12	Unknown	Calamba	Laguna	Km. 54, National Hi-way, Makiling, Calamba City, Laguna	14.1585347	121.1365987	Masterlist 2026	t	2026-07-03 16:53:16.05627	2026-07-03 16:53:16.05627
6103	\N	Lyceum of the Phils,  Laguna, Inc.	LYCEUM OF THE PHILS LAGUNA INC	Grade 1-6, Grade 7-10 & Grade 11-12	Unknown	Unspecified	Region IV-A	Km. 54 National Highway	14.1406629	121.4691774	Masterlist 2026	t	2026-07-03 16:53:16.05627	2026-07-03 16:53:16.05627
6104	\N	LYCEUM OF TINGLOY DE SAN ROQUE INC.	LYCEUM OF TINGLOY DE SAN ROQUE INC	Grade 11-12	Unknown	Tingloy	Batangas	Brgy. Papaya, Tingloy	13.6348081	120.8986943	Masterlist 2026	t	2026-07-03 16:53:16.05627	2026-07-03 16:53:16.05627
6105	\N	LYCEUM TECHNOLOGICAL COLLEGE INC.	LYCEUM TECHNOLOGICAL COLLEGE INC	Grade 11-12	Unknown	Tiaong	Quezon	Brgy. Talisay, Tiaong, Quezon	13.9518934	121.3464075	Masterlist 2026	t	2026-07-03 16:53:16.05627	2026-07-03 16:53:16.05627
6106	\N	M. S. Enverga Academy Foundation, Inc.	M S ENVERGA ACADEMY FOUNDATION INC	Grade 7-10 & Grade 11-12	Unknown	Sampaloc	Quezon	BRGY. BAYONGON	14.1599615	121.6366835	Masterlist 2026	t	2026-07-03 16:53:16.05627	2026-07-03 16:53:16.05627
6107	\N	Maabud Integrated National High School	MAABUD INTEGRATED NATIONAL HIGH SCHOOL	Grade 7-10 & Grade 11-12	Unknown	San Nicolas	Batangas	Maabud North, San Nicolas, Batangas	13.9100373	120.9655194	Masterlist 2026	t	2026-07-03 16:53:16.05627	2026-07-03 16:53:16.05627
6108	\N	Mabato National High School	MABATO NATIONAL HIGH SCHOOL	Grade 7-10 & Grade 11-12	Unknown	Calamba	Laguna	Mabato, Calamba City	14.1575584	121.038401	Masterlist 2026	t	2026-07-03 16:53:16.05627	2026-07-03 16:53:16.05627
6109	\N	Mabini College of Batangas,Inc.	MABINI COLLEGE OF BATANGASINC	Grade 7-10 & Grade 11-12	Unknown	Mabini	Batangas	J. Panopio St., Poblacion, Mabini, Bats.	13.7484515	120.9413086	Masterlist 2026	t	2026-07-03 16:53:16.05627	2026-07-03 16:53:16.05627
6110	\N	Mabitac Integrated National High School	MABITAC INTEGRATED NATIONAL HIGH SCHOOL	Grade 7-10 & Grade 11-12	Unknown	Mabitac	Laguna	B. Sayarot	14.4267568	121.4279442	Masterlist 2026	t	2026-07-03 16:53:16.05627	2026-07-03 16:53:16.05627
6111	\N	Macalelon High School	MACALELON HIGH SCHOOL	Grade 7-10 & Grade 11-12	Unknown	Macalelon	Quezon	P. Pajarillo St.	13.7478763	122.1364163	Masterlist 2026	t	2026-07-03 16:53:16.05627	2026-07-03 16:53:16.05627
6112	\N	Magallanes - Cavite West Point  College Inc.	MAGALLANES CAVITE WEST POINT COLLEGE INC	Grade 11-12	Unknown	Magallanes	Cavite	Kaytitinga-Magallanes Rd.,	14.1554521	120.7704835	Masterlist 2026	t	2026-07-03 16:53:16.05627	2026-07-03 16:53:16.05627
6113	\N	Magallanes NHS	MAGALLANES NHS	Grade 7-10 & Grade 11-12	Unknown	Magallanes	Cavite	Magallanes	14.158284	120.7464897	Masterlist 2026	t	2026-07-03 16:53:16.05627	2026-07-03 16:53:16.05627
6114	\N	Magdalena Integrated National High School	MAGDALENA INTEGRATED NATIONAL HIGH SCHOOL	Grade 7-10 & Grade 11-12	Unknown	Magdalena	Laguna	Brgy.Malaking Ambling,Magdalena,Laguna	14.1975136	121.4290304	Masterlist 2026	t	2026-07-03 16:53:16.05627	2026-07-03 16:53:16.05627
6115	\N	Magna Anima Teachers College	MAGNA ANIMA TEACHERS COLLEGE	Grade 11-12	Unknown	City of Santa Rosa	Laguna	Mesa Drive, Brgy. Sto. Domingo, Sta. Rosa City, Laguna	14.240374	121.0627372	Masterlist 2026	t	2026-07-03 16:53:16.062035	2026-07-03 16:53:16.062035
6116	\N	Magsaysay NHS (Formerly Ajos NHS - Magsaysay Extension)	MAGSAYSAY NHS FORMERLY AJOS NHS MAGSAYSAY EXTENSION	Grade 7-10 & Grade 11-12	Unknown	Magsaysay	Davao del Sur	Magsaysay	6.752709	125.1522083	Masterlist 2026	t	2026-07-03 16:53:16.062035	2026-07-03 16:53:16.062035
6117	\N	Mahabang Dahilig Senior High School - Stand Alone	MAHABANG DAHILIG SENIOR HIGH SCHOOL STAND ALONE	Grade 11-12	Unknown	Batangas City	Batangas	MAHABANG DAHILIG	13.7105367	121.0928803	Masterlist 2026	t	2026-07-03 16:53:16.062035	2026-07-03 16:53:16.062035
6118	\N	Majada In Integrated School	MAJADA IN INTEGRATED SCHOOL	Grade 7-10 & Grade 11-12	Unknown	Calamba	Laguna	Majada In	14.188967	121.0906337	Masterlist 2026	t	2026-07-03 16:53:16.062035	2026-07-03 16:53:16.062035
6119	\N	Makiling Integrated School	MAKILING INTEGRATED SCHOOL	Grade 7-10 & Grade 11-12	Unknown	Calamba	Laguna	Purok 3 National Highway, Brgy. Makiling	14.1542512	121.1375606	Masterlist 2026	t	2026-07-03 16:53:16.062035	2026-07-03 16:53:16.062035
6120	\N	Malaya Integrated National High School	MALAYA INTEGRATED NATIONAL HIGH SCHOOL	Grade 7-10 & Grade 11-12	Unknown	Pililla	Rizal	Vicencio St.	14.399502	121.339887	Masterlist 2026	t	2026-07-03 16:53:16.062035	2026-07-03 16:53:16.062035
6121	\N	Malaya NHS	MALAYA NHS	Grade 7-10 & Grade 11-12	Unknown	Naujan	Oriental Mindoro	Malaya	13.2198353	121.2769423	Masterlist 2026	t	2026-07-03 16:53:16.062035	2026-07-03 16:53:16.062035
6122	\N	Malayan Colleges Laguna	MALAYAN COLLEGES LAGUNA	Grade 11-12	Unknown	Cabuyao City	Laguna	Pulo-Diezmo Road, Banay-banay, Cabuyao City, Laguna	14.2431864	121.1136126	Masterlist 2026	t	2026-07-03 16:53:16.062035	2026-07-03 16:53:16.062035
6123	\N	Maligaya Integrated National High School	MALIGAYA INTEGRATED NATIONAL HIGH SCHOOL	Grade 7-10 & Grade 11-12	Unknown	San Isidro	Nueva Ecija	San Isidro	15.3092837	120.9077783	Masterlist 2026	t	2026-07-03 16:53:16.062035	2026-07-03 16:53:16.062035
6124	\N	Maligaya National High School (formerly Paaralang Sek. Ng Hen. Nakar - Maligaya Extension)	MALIGAYA NATIONAL HIGH SCHOOL FORMERLY PAARALANG SEK NG HEN NAKAR MALIGAYA EXTENSION	Grade 7-10 & Grade 11-12	Unknown	El Nido	Palawan	Centro I Brgy. Maligaya	11.1728332	119.3903595	Masterlist 2026	t	2026-07-03 16:53:16.062035	2026-07-03 16:53:16.062035
6125	\N	Maligaya NHS	MALIGAYA NHS	Grade 7-10 & Grade 11-12	Unknown	El Nido	Palawan	Maligaya	11.1728332	119.3903595	Masterlist 2026	t	2026-07-03 16:53:16.062035	2026-07-03 16:53:16.062035
6126	\N	Malinao Ilaya Integrated National High School	MALINAO ILAYA INTEGRATED NATIONAL HIGH SCHOOL	Grade 7-10 & Grade 11-12	Unknown	Atimonan	Quezon	Malinao Ilaya	13.9946637	121.837662	Masterlist 2026	t	2026-07-03 16:53:16.062035	2026-07-03 16:53:16.062035
6127	\N	Malusak National High School	MALUSAK NATIONAL HIGH SCHOOL	Grade 7-10 & Grade 11-12	Unknown	Atimonan	Quezon	Malusak	13.9595134	121.9720284	Masterlist 2026	t	2026-07-03 16:53:16.062035	2026-07-03 16:53:16.062035
6128	\N	Malvar Senior High School	MALVAR SENIOR HIGH SCHOOL	Grade 11-12	Unknown	Malvar	Batangas	Trinidad Leviste Endaya Road, Brgy. Poblacion, Malvar, Batangas	14.0475849	121.161261	Masterlist 2026	t	2026-07-03 16:53:16.062035	2026-07-03 16:53:16.062035
6129	\N	Mamatid Senior High School	MAMATID SENIOR HIGH SCHOOL	Grade 11-12	Unknown	Cabuyao City	Laguna	Mamatid, Cabuyao City, Laguna	14.2373479	121.1509924	Masterlist 2026	t	2026-07-03 16:53:16.062035	2026-07-03 16:53:16.062035
6130	\N	MANSILAY NHS	MANSILAY NHS	Grade 7-10 & Grade 11-12	Unknown	Mansalay	Oriental Mindoro	Mansilay	12.5215784	121.4410015	Masterlist 2026	t	2026-07-03 16:53:16.062035	2026-07-03 16:53:16.062035
6131	\N	Manuel I. Santos Integrated School	MANUEL I SANTOS INTEGRATED SCHOOL	Grade 7-10 & Grade 11-12	Unknown	Taytay	Lalawigan ng Rizal	Sitio Lambak	14.5470057	121.1252118	Masterlist 2026	t	2026-07-03 16:53:16.062035	2026-07-03 16:53:16.062035
6132	\N	Manuel S. Enverga Institute Foundation, Inc.	MANUEL S ENVERGA INSTITUTE FOUNDATION INC	Grade 7-10 & Grade 11-12	Unknown	San Antonio	Quezon	Quizon St.	13.8946137	121.2927073	Masterlist 2026	t	2026-07-03 16:53:16.062035	2026-07-03 16:53:16.062035
6133	\N	Manuel S. Enverga Memorial School of Arts and Trades	MANUEL S ENVERGA MEMORIAL SCHOOL OF ARTS AND TRADES	Grade 7-10 & Grade 11-12	Unknown	Mauban	Quezon	Brgy. Soledad	14.1826812	121.706008	Masterlist 2026	t	2026-07-03 16:53:16.062035	2026-07-03 16:53:16.062035
6135	\N	Mapua Malayan Colleges Laguna	MAPUA MALAYAN COLLEGES LAGUNA	Grade 11-12	Unknown	Cabuyao City	Laguna	Blk. 4 Lot 6 Southpoint Subd., Pulo-Diezmo Road, Cabuyao City, Laguna	14.2422896	121.1138587	Masterlist 2026	t	2026-07-03 16:53:16.062035	2026-07-03 16:53:16.062035
6136	\N	Mapulot National High School	MAPULOT NATIONAL HIGH SCHOOL	Grade 7-10 & Grade 11-12	Unknown	Tagkawayan	Quezon	Brgy. Mapulot, Tagkawayan, Quezon	14.0354808	122.5887254	Masterlist 2026	t	2026-07-03 16:53:16.062035	2026-07-03 16:53:16.062035
6137	\N	Maragondon National High School	MARAGONDON NATIONAL HIGH SCHOOL	Grade 7-10 & Grade 11-12	Unknown	Maragondon	Cavite	Balitao St.,	14.2757437	120.7346817	Masterlist 2026	t	2026-07-03 16:53:16.062035	2026-07-03 16:53:16.062035
6138	\N	Marasigan Institute of Science and Technology	MARASIGAN INSTITUTE OF SCIENCE AND TECHNOLOGY	Grade 11-12	Unknown	Dasmariñas	Cavite	Victoria Complex, Emilio Aguinaldo Highway, Salitran I, Dasmarinas, Cavite	14.350831	120.9375453	Masterlist 2026	t	2026-07-03 16:53:16.062035	2026-07-03 16:53:16.062035
6139	\N	Marcelino Fule Memorial College	MARCELINO FULE MEMORIAL COLLEGE	Grade 11-12	Unknown	Unspecified	Region IV-A	Maharlika High Way Del Pilar Brgy. 1, Alaminos, Laguna	12.6678893	123.9881393	Masterlist 2026	t	2026-07-03 16:53:16.062035	2026-07-03 16:53:16.062035
6140	\N	Marcelino M. Santos NHS	MARCELINO M SANTOS NHS	Grade 7-10 & Grade 11-12	Unknown	Iloilo City	Iloilo	R. Pascual Street, Sitio Tagbac	10.7677157	122.5782788	Masterlist 2026	t	2026-07-03 16:53:16.062035	2026-07-03 16:53:16.062035
6141	\N	Marcial B. Villanueva NHS (Formerly San Francisco NHS, San Francisco)	MARCIAL B VILLANUEVA NHS FORMERLY SAN FRANCISCO NHS SAN FRANCISCO	Grade 7-10 & Grade 11-12	Unknown	San Francisco (Aurora)	Quezon	Cawayan I	13.3642248	122.5108632	Masterlist 2026	t	2026-07-03 16:53:16.062035	2026-07-03 16:53:16.062035
6142	\N	Margarito A. Duavit Memorial National High School	MARGARITO A DUAVIT MEMORIAL NATIONAL HIGH SCHOOL	Grade 7-10 & Grade 11-12	Unknown	Binangonan	Rizal	Nagsulo Road Brgy Pilapila Binangonan Rizal	14.4389125	121.2104844	Masterlist 2026	t	2026-07-03 16:53:16.062035	2026-07-03 16:53:16.062035
6143	\N	MARITIME ACADEMY FOR TRAINING AND EDUCATION 2018 (MATE) INC.	MARITIME ACADEMY FOR TRAINING AND EDUCATION 2018 MATE INC	Grade 11-12	Unknown	Unspecified	Region IV-A	Arcade II Building	12.879721	121.774017	Masterlist 2026	t	2026-07-03 16:53:16.062035	2026-07-03 16:53:16.062035
6144	\N	Mary Angelicum Development Academy, Inc.	MARY ANGELICUM DEVELOPMENT ACADEMY INC	Grade 1-6, Grade 7-10 & Grade 11-12	Unknown	Antipolo	Rizal	NHA Avenue, Bagong Nayon II, Phase 3-A	14.6279416	121.162448	Masterlist 2026	t	2026-07-03 16:53:16.062035	2026-07-03 16:53:16.062035
6145	\N	Mary Help of Christian College, Salesian Sisters	MARY HELP OF CHRISTIAN COLLEGE SALESIAN SISTERS	Grade 11-12	Unknown	Calamba	Laguna	Acacia St., Ceris I, Brgy. Canlubang, Calamba City, Laguna	14.2086715	121.1141891	Masterlist 2026	t	2026-07-03 16:53:16.062035	2026-07-03 16:53:16.062035
6146	\N	MARY THE QUEEN OF MONTALBAN RIZAL COLLEGE INC.	MARY THE QUEEN OF MONTALBAN RIZAL COLLEGE INC	Grade 11-12	Unknown	Rodriguez	Rizal	Blk. 16 Lot 11 Kanlaon St., Burgos, Rodriguez, Rizal	14.7137157	121.1410351	Masterlist 2026	t	2026-07-03 16:53:16.062035	2026-07-03 16:53:16.062035
6147	\N	Masapang Integrated National High School	MASAPANG INTEGRATED NATIONAL HIGH SCHOOL	Grade 7-10 & Grade 11-12	Unknown	Victoria	Laguna	Purok 2	14.1961161	121.3384371	Masterlist 2026	t	2026-07-03 16:53:16.062035	2026-07-03 16:53:16.062035
6148	\N	Masaya Integrated National High School	MASAYA INTEGRATED NATIONAL HIGH SCHOOL	Grade 7-10 & Grade 11-12	Unknown	Bay	Laguna	Gov. FT San Luis	14.1462277	121.2735164	Masterlist 2026	t	2026-07-03 16:53:16.062035	2026-07-03 16:53:16.062035
6149	\N	MaSTech Educational Institute Inc.	MASTECH EDUCATIONAL INSTITUTE INC	Grade 11-12	Unknown	General Emilio Aguinaldo	Cavite	San Jose St. Cor Lopez Jaena St., Gen. Emilio Aguinaldo, Bailen, Cavite	14.1829115	120.7973204	Masterlist 2026	t	2026-07-03 16:53:16.062035	2026-07-03 16:53:16.062035
6150	\N	Mataasnakahoy Senior High School	MATAASNAKAHOY SENIOR HIGH SCHOOL	Grade 11-12	Unknown	Mataas Na Kahoy	Batangas	Bayorbor, Mataasnakahoy, Batangas	13.9816437	121.0926307	Masterlist 2026	t	2026-07-03 16:53:16.062035	2026-07-03 16:53:16.062035
6151	\N	Matalatala Integrated National High School	MATALATALA INTEGRATED NATIONAL HIGH SCHOOL	Grade 7-10 & Grade 11-12	Unknown	Mabitac	Laguna	Matalatala	14.4153848	121.4080987	Masterlist 2026	t	2026-07-03 16:53:16.062035	2026-07-03 16:53:16.062035
6152	\N	Matandang Sabang National High School	MATANDANG SABANG NATIONAL HIGH SCHOOL	Grade 7-10 & Grade 11-12	Unknown	Catanauan	Quezon	MATANDANG SABANG SILANGAN	13.602259	122.2948776	Masterlist 2026	t	2026-07-03 16:53:16.062035	2026-07-03 16:53:16.062035
6153	\N	Mater Redemptoris Collegium	MATER REDEMPTORIS COLLEGIUM	Grade 11-12	Unknown	Calauan	Laguna	45 Purok 2, Brgy. Imok, Calauan, Laguna	14.1223813	121.2997765	Masterlist 2026	t	2026-07-03 16:53:16.062035	2026-07-03 16:53:16.062035
6154	\N	Maximo L. Gatlabayan Memorial NHS	MAXIMO L GATLABAYAN MEMORIAL NHS	Grade 7-10 & Grade 11-12	Unknown	Baras	Rizal	Sitio Paenaan	14.623119	121.2598713	Masterlist 2026	t	2026-07-03 16:53:16.062035	2026-07-03 16:53:16.062035
6155	\N	Maximo T. Hernandez Memorial Integrated High School	MAXIMO T HERNANDEZ MEMORIAL INTEGRATED HIGH SCHOOL	Grade 7-10 & Grade 11-12	Unknown	Ibaan	Batangas	Malainin, Ibaan, Batangas	13.841105	121.1171011	Masterlist 2026	t	2026-07-03 16:53:16.062035	2026-07-03 16:53:16.062035
6156	\N	Mayamot National High School	MAYAMOT NATIONAL HIGH SCHOOL	Grade 7-10 & Grade 11-12	Unknown	Marikina	Metro Manila	Rose Street, Greenheights Newtown I-A Subdivision	14.6352466	121.1189514	Masterlist 2026	t	2026-07-03 16:53:16.062035	2026-07-03 16:53:16.062035
6157	\N	Mayao Parada Agricultural Integrated High School	MAYAO PARADA AGRICULTURAL INTEGRATED HIGH SCHOOL	Grade 7-10 & Grade 11-12	Unknown	Lucena City	Quezon	Brgy. Mayao Parada	13.9331387	121.6455903	Masterlist 2026	t	2026-07-03 16:53:16.062035	2026-07-03 16:53:16.062035
6158	\N	Mayuro National High School	MAYURO NATIONAL HIGH SCHOOL	Grade 7-10 & Grade 11-12	Unknown	Rosario	Batangas	Mayuro, Rosario, Batangas	13.7906019	121.2650549	Masterlist 2026	t	2026-07-03 16:53:16.062035	2026-07-03 16:53:16.062035
6159	\N	Mayuro Senior High School	MAYURO SENIOR HIGH SCHOOL	Grade 11-12	Unknown	Rosario	Batangas	Mayuro, Rosario, Batangas	13.7913613	121.2683591	Masterlist 2026	t	2026-07-03 16:53:16.062035	2026-07-03 16:53:16.062035
6160	\N	Millennium Christian High School of Cavite Inc.	MILLENNIUM CHRISTIAN HIGH SCHOOL OF CAVITE INC	Grade 7-10 & Grade 11-12	Unknown	Bacoor	Cavite	Tirona Highway, Habay Uno	14.4475822	120.9410398	Masterlist 2026	t	2026-07-03 16:53:16.062035	2026-07-03 16:53:16.062035
6161	\N	Mind and Integrity (MAI) College	MIND AND INTEGRITY MAI COLLEGE	Grade 11-12	Unknown	Calamba	Laguna	Selina-Liz Bldg., National Highway, Brgy. San Cristobal, Calamba City	14.2268597	121.1400314	Masterlist 2026	t	2026-07-03 16:53:16.062035	2026-07-03 16:53:16.062035
6162	\N	Mind and Integrity College	MIND AND INTEGRITY COLLEGE	Grade 11-12	Unknown	Calamba	Laguna	Selina-Liz Bldg., National Hi-Way, San Cristobal, Calamba City, Laguna	14.2204469	121.1393586	Masterlist 2026	t	2026-07-03 16:53:16.062035	2026-07-03 16:53:16.062035
6163	\N	Missionari Della Fede Community-High School, Inc.	MISSIONARI DELLA FEDE COMMUNITYHIGH SCHOOL INC	Grade 7-10 & Grade 11-12	Unknown	Unspecified	Region IV-A	11 Quirino St.	12.879721	121.774017	Masterlist 2026	t	2026-07-03 16:53:16.062035	2026-07-03 16:53:16.062035
6164	\N	Monark Foundation, Inc.	MONARK FOUNDATION INC	Grade 11-12	Unknown	San Pedro	Laguna	South Expressway cor. Magsaysay Road,Barangay San Antonio, San Pedro, Laguna	14.3644419	121.0427455	Masterlist 2026	t	2026-07-03 16:53:16.062035	2026-07-03 16:53:16.062035
6165	\N	Montessori Integrated School	MONTESSORI INTEGRATED SCHOOL	Grade 11-12	Unknown	Antipolo	Rizal	#1 Senator Lorenzo Sumulong Memorial Circle	14.5894648	121.1702795	Masterlist 2026	t	2026-07-03 16:53:16.067504	2026-07-03 16:53:16.067504
6166	\N	Montessori Professional College - Antipolo	MONTESSORI PROFESSIONAL COLLEGE ANTIPOLO	Grade 11-12	Unknown	Antipolo	Rizal	M.L. Quezon Ave., Pines City Village, Antipolo City	14.5815651	121.1753709	Masterlist 2026	t	2026-07-03 16:53:16.067504	2026-07-03 16:53:16.067504
6167	\N	Montessori Professional College - Bacoor	MONTESSORI PROFESSIONAL COLLEGE BACOOR	Grade 11-12	Unknown	Bacoor	Cavite	Tirona Hi-way near cor. Aguinaldo Hi-way	14.4457809	120.9532604	Masterlist 2026	t	2026-07-03 16:53:16.067504	2026-07-03 16:53:16.067504
6168	\N	Montessori Professional College - Calamba	MONTESSORI PROFESSIONAL COLLEGE CALAMBA	Grade 11-12	Unknown	Calamba	Laguna	Sta.Cecilia Business Center 1, Parian Old National Hi-way, Calamba City, Laguna	14.2146457	121.1495187	Masterlist 2026	t	2026-07-03 16:53:16.067504	2026-07-03 16:53:16.067504
6169	\N	Montessori Professional College - Imus	MONTESSORI PROFESSIONAL COLLEGE IMUS	Grade 11-12	Unknown	Imus	Cavite	Rita Sanchez Compound, Aguinaldo Hi-way, Bayan Luma VII Imus, Cavite	14.4124945	120.9388438	Masterlist 2026	t	2026-07-03 16:53:16.067504	2026-07-03 16:53:16.067504
6170	\N	MOREH GLOBAL INNOVATIVE COLLEGE INCORPORATED	MOREH GLOBAL INNOVATIVE COLLEGE INCORPORATED	Grade 7-10 & Grade 11-12	Unknown	San Francisco	Cebu	169 San Francisco	10.6466066	124.3812152	Masterlist 2026	t	2026-07-03 16:53:16.067504	2026-07-03 16:53:16.067504
6171	\N	Morong National Senior High School	MORONG NATIONAL SENIOR HIGH SCHOOL	Grade 11-12	Unknown	Morong	Rizal	Juan Sumulong St.	14.5172841	121.2376365	Masterlist 2026	t	2026-07-03 16:53:16.067504	2026-07-03 16:53:16.067504
6172	\N	MOTHER THERESA COLEGIO DE NOVELETA, INC.	MOTHER THERESA COLEGIO DE NOVELETA INC	Grade 11-12	Unknown	Noveleta	Cavite	037 San Juan I	14.4331575	120.8857897	Masterlist 2026	t	2026-07-03 16:53:16.067504	2026-07-03 16:53:16.067504
6173	\N	Mount Carmel High School of Burdeos, Inc	MOUNT CARMEL HIGH SCHOOL OF BURDEOS INC	Grade 7-10 & Grade 11-12	Unknown	Burdeos	Quezon	Quezon St.	14.8404868	121.9683474	Masterlist 2026	t	2026-07-03 16:53:16.067504	2026-07-03 16:53:16.067504
6174	\N	Mount Carmel High School of Gen. Nakar, Inc.	MOUNT CARMEL HIGH SCHOOL OF GEN NAKAR INC	Grade 7-10 & Grade 11-12	Unknown	General Nakar	Quezon	Highway	14.758375	121.6285703	Masterlist 2026	t	2026-07-03 16:53:16.067504	2026-07-03 16:53:16.067504
6175	\N	MULANAY INSTITUTE	MULANAY INSTITUTE	Grade 7-10 & Grade 11-12	Unknown	Mulanay	Quezon	National Road	13.5220761	122.4068101	Masterlist 2026	t	2026-07-03 16:53:16.067504	2026-07-03 16:53:16.067504
6176	\N	Muntindilaw National High School	MUNTINDILAW NATIONAL HIGH SCHOOL	Grade 7-10 & Grade 11-12	Unknown	Antipolo	Rizal	Saint Martin de Porres Street, Brookside Hills Subdivision	14.5984595	121.1301373	Masterlist 2026	t	2026-07-03 16:53:16.067504	2026-07-03 16:53:16.067504
6177	\N	Munting Ilog Integrated National High School	MUNTING ILOG INTEGRATED NATIONAL HIGH SCHOOL	Grade 7-10 & Grade 11-12	Unknown	Silang	Cavite	Munting Ilog, Silang, Cavite	14.2179022	120.9963337	Masterlist 2026	t	2026-07-03 16:53:16.067504	2026-07-03 16:53:16.067504
6178	\N	Nabangka NHS	NABANGKA NHS	Grade 7-10 & Grade 11-12	Unknown	Guinayangan	Quezon	Capuluan Central	13.8022587	122.5109222	Masterlist 2026	t	2026-07-03 16:53:16.067504	2026-07-03 16:53:16.067504
6179	\N	Nagcarlan Senior High School	NAGCARLAN SENIOR HIGH SCHOOL	Grade 11-12	Unknown	Nagcarlan	Laguna	Kanluran Kabubuhayan, Nagcarlan	14.187417	121.3984705	Masterlist 2026	t	2026-07-03 16:53:16.067504	2026-07-03 16:53:16.067504
6180	\N	Nagsaulay Integrated National High School	NAGSAULAY INTEGRATED NATIONAL HIGH SCHOOL	Grade 7-10 & Grade 11-12	Unknown	San Juan	Batangas	Nagsaulay, San Juan, Batangas	13.7087155	121.4370471	Masterlist 2026	t	2026-07-03 16:53:16.067504	2026-07-03 16:53:16.067504
6181	\N	Nagsinamo NHS	NAGSINAMO NHS	Grade 7-10 & Grade 11-12	Unknown	Lucban	Quezon	Magsino Street	14.1115828	121.6111949	Masterlist 2026	t	2026-07-03 16:53:16.067504	2026-07-03 16:53:16.067504
6182	\N	Naic Coastal Integrated National High School	NAIC COASTAL INTEGRATED NATIONAL HIGH SCHOOL	Grade 7-10 & Grade 11-12	Unknown	Naic	Cavite	Calle Cena	14.3149106	120.7369721	Masterlist 2026	t	2026-07-03 16:53:16.067504	2026-07-03 16:53:16.067504
6183	\N	Naic Integrated National High School	NAIC INTEGRATED NATIONAL HIGH SCHOOL	Grade 7-10 & Grade 11-12	Unknown	Naic	Cavite	Naic-Indang Rd.	14.2955625	120.7943281	Masterlist 2026	t	2026-07-03 16:53:16.067504	2026-07-03 16:53:16.067504
6184	\N	Naic Senior High School Stand-Alone	NAIC SENIOR HIGH SCHOOL STANDALONE	Grade 11-12	Unknown	Naic	Cavite	`	14.3200494	120.7628607	Masterlist 2026	t	2026-07-03 16:53:16.067504	2026-07-03 16:53:16.067504
6185	\N	Naic West Point College Inc.	NAIC WEST POINT COLLEGE INC	Grade 11-12	Unknown	Naic	Cavite	JN Bldg., Governor's Drive	14.323851	120.7708773	Masterlist 2026	t	2026-07-03 16:53:16.067504	2026-07-03 16:53:16.067504
6186	\N	Nasugbu East Senior High School	NASUGBU EAST SENIOR HIGH SCHOOL	Grade 11-12	Unknown	Nasugbu	Batangas	Lumbangan, Nasugbu, Batangas	14.0524831	120.6680413	Masterlist 2026	t	2026-07-03 16:53:16.067504	2026-07-03 16:53:16.067504
6187	\N	Natalia V. Ramos Memorial Integrated School	NATALIA V RAMOS MEMORIAL INTEGRATED SCHOOL	Grade 7-10 & Grade 11-12	Unknown	Concepcion	Tarlac	Concepcion	15.323996	120.6559609	Masterlist 2026	t	2026-07-03 16:53:16.067504	2026-07-03 16:53:16.067504
6188	\N	National College of Science and Technology	NATIONAL COLLEGE OF SCIENCE AND TECHNOLOGY	Grade 11-12	Unknown	Dasmariñas	Cavite	Amafel Bldg., Emilio Aguinaldo Highway, Dasmarinas City, Cavite	14.3274892	120.9403585	Masterlist 2026	t	2026-07-03 16:53:16.067504	2026-07-03 16:53:16.067504
6189	\N	NATIONAL COLLEGE OF SCIENCE AND TECHNOLOGY (NCST) IMUS INC.	NATIONAL COLLEGE OF SCIENCE AND TECHNOLOGY NCST IMUS INC	Grade 11-12	Unknown	Dasmariñas	Cavite	F. Yengko St., Poblacion IV-6, Imus City	14.3274892	120.9403585	Masterlist 2026	t	2026-07-03 16:53:16.067504	2026-07-03 16:53:16.067504
6190	\N	Nava Institute of Science and Technical Education, Inc.	NAVA INSTITUTE OF SCIENCE AND TECHNICAL EDUCATION INC	Grade 11-12	Unknown	Pililla	Rizal	#8 G. Paz St., Sitio Combo	14.4901713	121.2982125	Masterlist 2026	t	2026-07-03 16:53:16.067504	2026-07-03 16:53:16.067504
6191	\N	NBL Education Systems	NBL EDUCATION SYSTEMS	Grade 11-12	Unknown	Biñan	Laguna	Mindanao Drive, Stage V, Macaria Village, San Francisco, BiÃ±an, Laguna	14.3405476	121.0621301	Masterlist 2026	t	2026-07-03 16:53:16.067504	2026-07-03 16:53:16.067504
6192	\N	NCST Institute of Industrial Research and Training - General Trias	NCST INSTITUTE OF INDUSTRIAL RESEARCH AND TRAINING GENERAL TRIAS	Grade 11-12	Unknown	General Trias	Cavite	NIA Rd., Bacao II, General Trias, Cavite	14.4104204	120.881473	Masterlist 2026	t	2026-07-03 16:53:16.067504	2026-07-03 16:53:16.067504
6193	\N	NCST Institute of Industrial Research and Training, DasmariÃ±as City	NCST INSTITUTE OF INDUSTRIAL RESEARCH AND TRAINING DASMARIA±AS CITY	Grade 11-12	Unknown	San Agustin II	Cavite	San Agustin 2, Aguinaldo Hi-way, DasmariÃ±as City, Cavite	14.3172093	120.9435497	Masterlist 2026	t	2026-07-03 16:53:16.067504	2026-07-03 16:53:16.067504
6194	\N	New Era SHS	NEW ERA SHS	Grade 11-12	Unknown	Dasmariñas	Cavite	Brgy Sampaloc V	14.279591	120.9653608	Masterlist 2026	t	2026-07-03 16:53:16.067504	2026-07-03 16:53:16.067504
6195	\N	New Generation International School Inc.	NEW GENERATION INTERNATIONAL SCHOOL INC	Grade 11-12	Unknown	Trece Martires City	Cavite	9044 Governor's Drive	14.2824645	120.8654586	Masterlist 2026	t	2026-07-03 16:53:16.067504	2026-07-03 16:53:16.067504
6196	\N	New Sinai School and Colleges Sta. Rosa	NEW SINAI SCHOOL AND COLLEGES STA ROSA	Grade 11-12	Unknown	City of Santa Rosa	Laguna	National Highway, Brgy. Tagapo, Sta. Rosa City, Laguna	14.3170995	121.0985823	Masterlist 2026	t	2026-07-03 16:53:16.067504	2026-07-03 16:53:16.067504
6197	\N	Nicolas L. Galvez Memorial Integrated National High School	NICOLAS L GALVEZ MEMORIAL INTEGRATED NATIONAL HIGH SCHOOL	Grade 7-10 & Grade 11-12	Unknown	Bay	Laguna	San Antonio, Bay, Laguna	14.1880763	121.2825778	Masterlist 2026	t	2026-07-03 16:53:16.067504	2026-07-03 16:53:16.067504
6198	\N	Northern Quezon College, Inc.	NORTHERN QUEZON COLLEGE INC	Grade 11-12	Unknown	Infanta	Quezon	National Highway, Brgy. Comon, Infanta, Quezon	14.7381989	121.6444808	Masterlist 2026	t	2026-07-03 16:53:16.067504	2026-07-03 16:53:16.067504
6199	\N	Noveleta Senior High School	NOVELETA SENIOR HIGH SCHOOL	Grade 11-12	Unknown	Noveleta	Cavite	San Rafael III	14.4371651	120.880794	Masterlist 2026	t	2026-07-03 16:53:16.067504	2026-07-03 16:53:16.067504
6200	\N	NU DasmariÃ±as Incorporated	NU DASMARIA±AS INCORPORATED	Grade 11-12	Unknown	Dasmariñas	Cavite	Gov. Drive SM Dasmarinas Complex, Sampaloc 1, Dasmarinas City, Cavite	14.301747	120.9567294	Masterlist 2026	t	2026-07-03 16:53:16.067504	2026-07-03 16:53:16.067504
6201	\N	NU FOUNDATION INCORPORATED	NU FOUNDATION INCORPORATED	Grade 11-12	Unknown	Calbayog	Samar	Km. 53 Pan Philippine Highway	12.1856365	124.4078297	Masterlist 2026	t	2026-07-03 16:53:16.067504	2026-07-03 16:53:16.067504
6202	\N	NU FOUNDATION INCORPORATED (NU Laguna)	NU FOUNDATION INCORPORATED NU LAGUNA	Grade 11-12	Unknown	Calamba	Laguna	Km.54 Pan-Phil Highway	14.1782167	121.1362266	Masterlist 2026	t	2026-07-03 16:53:16.067504	2026-07-03 16:53:16.067504
6203	\N	NU Lipa Incorporated	NU LIPA INCORPORATED	Grade 11-12	Unknown	Lipa City	Batangas	SM City Lipa, Ayala Highway	13.9558	121.1623657	Masterlist 2026	t	2026-07-03 16:53:16.067504	2026-07-03 16:53:16.067504
6204	\N	NU Sports Academy	NU SPORTS ACADEMY	Grade 11-12	Unknown	Calamba	Laguna	Km. 53, Pan Philippine Highway, Brgy. Milagrosa, Calamba City, Laguna	14.171309	121.137401	Masterlist 2026	t	2026-07-03 16:53:16.067504	2026-07-03 16:53:16.067504
6205	\N	NUESTRA SEÃ‘ORA DE ARANZAZU PAROCHIAL SCHOOL, INC.	NUESTRA SEA‘ORA DE ARANZAZU PAROCHIAL SCHOOL INC	Grade 11-12	Unknown	San Mateo	Rizal	Lo1-B,B. Mariano St., Sta. Ana, San Mateo, Rozal	14.6908426	121.1148252	Masterlist 2026	t	2026-07-03 16:53:16.067504	2026-07-03 16:53:16.067504
6206	\N	NYK-TDG Maritime Academy	NYKTDG MARITIME ACADEMY	Grade 11-12	Unknown	Calamba	Laguna	Knowledge Avenue, Carmeltown, Canlubang, Calamba City, Laguna	14.2043349	121.0796345	Masterlist 2026	t	2026-07-03 16:53:16.067504	2026-07-03 16:53:16.067504
6207	\N	OBB Institute of Learning Inc.	OBB INSTITUTE OF LEARNING INC	Grade 7-10 & Grade 11-12	Unknown	Amadeo	Cavite	Buho	14.1347598	120.9506512	Masterlist 2026	t	2026-07-03 16:53:16.067504	2026-07-03 16:53:16.067504
6208	\N	OBLATES OF ST. JOSEPH MINOR SEMINARY SAN JOSE, BATANGAS INC.	OBLATES OF ST JOSEPH MINOR SEMINARY SAN JOSE BATANGAS INC	Grade 11-12	Unknown	Batangas City	Batangas	J. De Villa Street, Poblacion 01, San Jose, Batangas	13.8804529	121.1045007	Masterlist 2026	t	2026-07-03 16:53:16.067504	2026-07-03 16:53:16.067504
6209	\N	Old Boso-boso National High School	OLD BOSOBOSO NATIONAL HIGH SCHOOL	Grade 7-10 & Grade 11-12	Unknown	Antipolo	Rizal	Sitio Old Boso-boso	14.6380623	121.240772	Masterlist 2026	t	2026-07-03 16:53:16.067504	2026-07-03 16:53:16.067504
6210	\N	Olinsterg College, Inc.	OLINSTERG COLLEGE INC	Grade 11-12	Unknown	Tiaong	Quezon	Zen Bldg., Maharlika Highway	13.957475	121.3275696	Masterlist 2026	t	2026-07-03 16:53:16.067504	2026-07-03 16:53:16.067504
6211	\N	Olivarez College Tagaytay	OLIVAREZ COLLEGE TAGAYTAY	Grade 11-12	Unknown	Tagaytay City	Cavite	E. Aguinaldo Highway, Brgy. San Jose, Tagaytay City, Cavite	14.1186395	120.9627024	Masterlist 2026	t	2026-07-03 16:53:16.067504	2026-07-03 16:53:16.067504
6212	\N	Olongtao National High School	OLONGTAO NATIONAL HIGH SCHOOL	Grade 7-10 & Grade 11-12	Unknown	Bayan ng Quezon	Quezon	Tancauco Drive	13.7325499	122.1803052	Masterlist 2026	t	2026-07-03 16:53:16.067504	2026-07-03 16:53:16.067504
6213	\N	Our Lady of Assumption College of Laguna	OUR LADY OF ASSUMPTION COLLEGE OF LAGUNA	Grade 11-12	Unknown	San Pedro	Laguna	Main Road Villa Olympia Subdivision, San Pedro City, Laguna	14.3434587	121.0405873	Masterlist 2026	t	2026-07-03 16:53:16.067504	2026-07-03 16:53:16.067504
6214	\N	Our Lady of Assumption College-Cabuyao	OUR LADY OF ASSUMPTION COLLEGECABUYAO	Grade 11-12	Unknown	Labuyao	Laguna	Phase 2 Mabuhay City, Mamatid, Cabuyao City, Laguna	14.239944	121.148743	Masterlist 2026	t	2026-07-03 16:53:16.067504	2026-07-03 16:53:16.067504
6215	\N	OUR LADY OF CARMEL SCHOOL-A.R. OF CALATAGAN, INC.	OUR LADY OF CARMEL SCHOOLAR OF CALATAGAN INC	Grade 7-10 & Grade 11-12	Unknown	Calatagan	Batangas	Sto. Domingo St. Calatagan, Batangas	13.8300937	120.6287182	Masterlist 2026	t	2026-07-03 16:53:16.072889	2026-07-03 16:53:16.072889
6216	\N	Our Lady of Fatima University - Antipolo City	OUR LADY OF FATIMA UNIVERSITY ANTIPOLO CITY	Grade 11-12	Unknown	Antipolo	Rizal	Sumulong Highway	14.619423	121.152095	Masterlist 2026	t	2026-07-03 16:53:16.072889	2026-07-03 16:53:16.072889
6217	\N	OUR LADY OF FATIMA UNIVERSITY LAGUNA INC.	OUR LADY OF FATIMA UNIVERSITY LAGUNA INC	Grade 11-12	Unknown	City of Santa Rosa	Laguna	Old National Hi-way (Manila South Road)	14.3043182	121.1030626	Masterlist 2026	t	2026-07-03 16:53:16.072889	2026-07-03 16:53:16.072889
6218	\N	Our Lady of Fatima University-Laguna	OUR LADY OF FATIMA UNIVERSITYLAGUNA	Grade 11-12	Unknown	City of Santa Rosa	Laguna	National Highway, Brgy. Macabling, Sta. Rosa City, Laguna	14.3043182	121.1030626	Masterlist 2026	t	2026-07-03 16:53:16.072889	2026-07-03 16:53:16.072889
6219	\N	Our Lady of Lourdes Academy of Tagkawayan, Inc.	OUR LADY OF LOURDES ACADEMY OF TAGKAWAYAN INC	Grade 7-10 & Grade 11-12	Unknown	Tagkawayan	Quezon	Lagdameo Blvd.	13.9674726	122.5374509	Masterlist 2026	t	2026-07-03 16:53:16.072889	2026-07-03 16:53:16.072889
6220	\N	Our Lady of Mount Carmel Seminary	OUR LADY OF MOUNT CARMEL SEMINARY	Grade 7-10 & Grade 11-12	Unknown	Cabanatuan City	Nueva Ecija	Mabini Extention	15.4862005	120.9740088	Masterlist 2026	t	2026-07-03 16:53:16.072889	2026-07-03 16:53:16.072889
6221	\N	Our Lady of Sorrows Academy Inc.	OUR LADY OF SORROWS ACADEMY INC	Grade 7-10 & Grade 11-12	Unknown	Dolores	Quezon	Cauyan St.	14.0148054	121.4028496	Masterlist 2026	t	2026-07-03 16:53:16.072889	2026-07-03 16:53:16.072889
6222	\N	OUR LADY OF THE PILLAR COLLEGE SEMINARY INC.	OUR LADY OF THE PILLAR COLLEGE SEMINARY INC	Grade 11-12	Unknown	Imus	Cavite	Buhay na Tubig	14.4156005	120.9497778	Masterlist 2026	t	2026-07-03 16:53:16.072889	2026-07-03 16:53:16.072889
6223	\N	Paagahan Integrated National High School	PAAGAHAN INTEGRATED NATIONAL HIGH SCHOOL	Grade 7-10 & Grade 11-12	Unknown	Mabitac	Laguna	Center 2, Brgy. Paagahan, Mabitac, Laguna	14.4416858	121.4002288	Masterlist 2026	t	2026-07-03 16:53:16.072889	2026-07-03 16:53:16.072889
6224	\N	Paaralang Sek. Ng Hen. Nakar	PAARALANG SEK NG HEN NAKAR	Grade 7-10 & Grade 11-12	Unknown	Pinamalayan	Oriental Mindoro	Anoling	13.0736458	121.4541881	Masterlist 2026	t	2026-07-03 16:53:16.072889	2026-07-03 16:53:16.072889
6225	\N	Paaralang Sek. Ng Lukban Integrated(formerly Paaralang Sekundarya ng Lucban)	PAARALANG SEK NG LUKBAN INTEGRATEDFORMERLY PAARALANG SEKUNDARYA NG LUCBAN	Grade 7-10 & Grade 11-12	Unknown	Lucban	Quezon	Nat'l. Road, Brgy. Aliliw, Lucban, Quezon	14.1397983	121.5542413	Masterlist 2026	t	2026-07-03 16:53:16.072889	2026-07-03 16:53:16.072889
6226	\N	Paaralang Sekundarya ng Umiray (PSU)	PAARALANG SEKUNDARYA NG UMIRAY PSU	Grade 7-10 & Grade 11-12	Unknown	General Nakar	Quezon	Lapdok	15.1034675	121.422761	Masterlist 2026	t	2026-07-03 16:53:16.072889	2026-07-03 16:53:16.072889
6227	\N	Pablo D. Maningas National High School	PABLO D MANINGAS NATIONAL HIGH SCHOOL	Grade 7-10 & Grade 11-12	Unknown	Quezon	Quezon	Brgy. Argosino	14.0088629	122.1822166	Masterlist 2026	t	2026-07-03 16:53:16.072889	2026-07-03 16:53:16.072889
6228	\N	Pacita Complex Senior High School	PACITA COMPLEX SENIOR HIGH SCHOOL	Grade 11-12	Unknown	San Pedro	Laguna	Tirad Pass  St. Pacita Complex 1 San Vicente, San Pedro, Laguna	14.3383226	121.056634	Masterlist 2026	t	2026-07-03 16:53:16.072889	2026-07-03 16:53:16.072889
6229	\N	Padre Garcia Integrated National High School	PADRE GARCIA INTEGRATED NATIONAL HIGH SCHOOL	Grade 7-10 & Grade 11-12	Unknown	Padre Garcia	Batangas	Poblacion, Padre Garcia, Batangas	13.8745265	121.2158626	Masterlist 2026	t	2026-07-03 16:53:16.072889	2026-07-03 16:53:16.072889
6230	\N	Padre Vicente Garcia Memorial Academy	PADRE VICENTE GARCIA MEMORIAL ACADEMY	Grade 7-10 & Grade 11-12	Unknown	Rosario	Batangas	Y. ZuÃ±o St.	13.8468667	121.20618	Masterlist 2026	t	2026-07-03 16:53:16.072889	2026-07-03 16:53:16.072889
6231	\N	Paete Science and Business College	PAETE SCIENCE AND BUSINESS COLLEGE	Grade 11-12	Unknown	Paete	Laguna	J.P. Rizal St., Paete, Laguna	14.3629432	121.4846324	Masterlist 2026	t	2026-07-03 16:53:16.072889	2026-07-03 16:53:16.072889
6233	\N	Pagbilao Academy, Inc.	PAGBILAO ACADEMY INC	Grade 7-10 & Grade 11-12	Unknown	Pagbilao	Quezon	Paterno	13.9707737	121.6875797	Masterlist 2026	t	2026-07-03 16:53:16.072889	2026-07-03 16:53:16.072889
6234	\N	Pagbilao Grande Island NHS	PAGBILAO GRANDE ISLAND NHS	Grade 7-10 & Grade 11-12	Unknown	Pagbilao	Quezon	Little Batangas	13.9143187	121.7708337	Masterlist 2026	t	2026-07-03 16:53:16.072889	2026-07-03 16:53:16.072889
6235	\N	Pagbilao NHS	PAGBILAO NHS	Grade 7-10 & Grade 11-12	Unknown	Pagbilao	Quezon	Mapagong	13.9662839	121.6767882	Masterlist 2026	t	2026-07-03 16:53:16.072889	2026-07-03 16:53:16.072889
6236	\N	Pagsangahan NHS	PAGSANGAHAN NHS	Grade 7-10 & Grade 11-12	Unknown	Presentacion	Camarines Sur	Pagsangahan	13.7730916	123.7489785	Masterlist 2026	t	2026-07-03 16:53:16.072889	2026-07-03 16:53:16.072889
6237	\N	Pagsanjan Integrated National High School	PAGSANJAN INTEGRATED NATIONAL HIGH SCHOOL	Grade 7-10 & Grade 11-12	Unknown	Pagsanjan	Laguna	B. Cosme St.	14.2761624	121.4530013	Masterlist 2026	t	2026-07-03 16:53:16.072889	2026-07-03 16:53:16.072889
6238	\N	Pagsanjan Stand-Alone Senior High School	PAGSANJAN STANDALONE SENIOR HIGH SCHOOL	Grade 11-12	Unknown	Pagsanjan	Laguna	E.R. Ville Street	14.2727009	121.4559396	Masterlist 2026	t	2026-07-03 16:53:16.072889	2026-07-03 16:53:16.072889
6239	\N	Paharang Integrated School	PAHARANG INTEGRATED SCHOOL	Grade 7-10 & Grade 11-12	Unknown	Batangas City	Batangas	Paharang	13.7547348	121.1452643	Masterlist 2026	t	2026-07-03 16:53:16.072889	2026-07-03 16:53:16.072889
6240	\N	Paiisa NHS	PAIISA NHS	Grade 7-10 & Grade 11-12	Unknown	Tiaong	Quezon	Paiisa	13.9258331	121.351304	Masterlist 2026	t	2026-07-03 16:53:16.072889	2026-07-03 16:53:16.072889
6241	\N	PAKIING NATIONAL HIGH SCHOOL	PAKIING NATIONAL HIGH SCHOOL	Grade 7-10 & Grade 11-12	Unknown	Mulanay	Quezon	Brgy. Pakiing, Mulanay, Quezon	13.491859	122.498121	Masterlist 2026	t	2026-07-03 16:53:16.072889	2026-07-03 16:53:16.072889
6242	\N	PAKIL SENIOR HIGH SCHOOL (Stand Alone SHS No. 2 Pakil)	PAKIL SENIOR HIGH SCHOOL STAND ALONE SHS NO 2 PAKIL	Grade 11-12	Unknown	Pakil	Laguna	V. Rarela St., Brgy. Burgos, Pakil, Laguna	14.3800858	121.4767033	Masterlist 2026	t	2026-07-03 16:53:16.072889	2026-07-03 16:53:16.072889
6243	\N	Palahanan Integrated National High School	PALAHANAN INTEGRATED NATIONAL HIGH SCHOOL	Grade 7-10 & Grade 11-12	Unknown	San Juan	Batangas	Palahanan II, San Juan, Batangas	13.8386348	121.351304	Masterlist 2026	t	2026-07-03 16:53:16.072889	2026-07-03 16:53:16.072889
6244	\N	Palakpak Integrated National High School	PALAKPAK INTEGRATED NATIONAL HIGH SCHOOL	Grade 7-10 & Grade 11-12	Unknown	Padre Garcia	Batangas	Palakpak, Rosario, Batangas	13.8745265	121.2158626	Masterlist 2026	t	2026-07-03 16:53:16.072889	2026-07-03 16:53:16.072889
6245	\N	Paliparan II Integrated High School	PALIPARAN II INTEGRATED HIGH SCHOOL	Grade 7-10 & Grade 11-12	Unknown	Dasmariñas	Cavite	Paliparan II, Dasmarinas City Cavite	14.3070997	120.991683	Masterlist 2026	t	2026-07-03 16:53:16.072889	2026-07-03 16:53:16.072889
6246	\N	Paliparan III SHS	PALIPARAN III SHS	Grade 11-12	Unknown	Dasmariñas	Cavite	Phase 5, Paliparan III	14.3214884	120.9791822	Masterlist 2026	t	2026-07-03 16:53:16.072889	2026-07-03 16:53:16.072889
6247	\N	Palo Alto Integrated School	PALO ALTO INTEGRATED SCHOOL	Grade 7-10 & Grade 11-12	Unknown	Calamba	Laguna	Palo Alto	14.1907597	121.1166193	Masterlist 2026	t	2026-07-03 16:53:16.072889	2026-07-03 16:53:16.072889
6248	\N	Pamampangin NHS	PAMAMPANGIN NHS	Grade 7-10 & Grade 11-12	Unknown	Lopez	Quezon	Pamampangin	13.8919938	122.2909078	Masterlist 2026	t	2026-07-03 16:53:16.072889	2026-07-03 16:53:16.072889
6249	\N	Pamantasan ng Cabuyao	PAMANTASAN NG CABUYAO	Grade 11-12	Unknown	Cabuyao City	Laguna	Katapatan Homes, Brgy. Banay-banay, Cabuyao City	14.2592295	121.1338387	Masterlist 2026	t	2026-07-03 16:53:16.072889	2026-07-03 16:53:16.072889
6250	\N	Pambayang Kolehiyo ng Mauban	PAMBAYANG KOLEHIYO NG MAUBAN	Grade 11-12	Unknown	Mauban	Quezon	African Daisy Street, Sitio Pilaway, Brgy. Polo, Mauban, Quezon	14.1736282	121.7168648	Masterlist 2026	t	2026-07-03 16:53:16.072889	2026-07-03 16:53:16.072889
6251	\N	Panikihan NHS	PANIKIHAN NHS	Grade 7-10 & Grade 11-12	Unknown	Unspecified	Region IV-A	Maharlika Hi-way	12.6678893	123.9881393	Masterlist 2026	t	2026-07-03 16:53:16.072889	2026-07-03 16:53:16.072889
6252	\N	Pansol Integrated National High School	PANSOL INTEGRATED NATIONAL HIGH SCHOOL	Grade 7-10 & Grade 11-12	Unknown	Padre Garcia	Batangas	Pansol, Padre Garcia, Batangas	13.8745265	121.2158626	Masterlist 2026	t	2026-07-03 16:53:16.072889	2026-07-03 16:53:16.072889
6253	\N	Pantalan Senior High School	PANTALAN SENIOR HIGH SCHOOL	Grade 11-12	Unknown	Nasugbu	Batangas	Pantalan, Nasugbu, Batangas	14.0833716	120.6336631	Masterlist 2026	t	2026-07-03 16:53:16.072889	2026-07-03 16:53:16.072889
6254	\N	Pantay Integrated High School	PANTAY INTEGRATED HIGH SCHOOL	Grade 7-10 & Grade 11-12	Unknown	Tanauan City	Batangas	Pantay Matanda, Tanauan City, Batangas	14.1194124	121.1192542	Masterlist 2026	t	2026-07-03 16:53:16.072889	2026-07-03 16:53:16.072889
6255	\N	Panukulan NHS (Formerly San Juan NHS)	PANUKULAN NHS FORMERLY SAN JUAN NHS	Grade 7-10 & Grade 11-12	Unknown	Angeles	Pampanga	Sapang Bato	15.1670159	120.4898564	Masterlist 2026	t	2026-07-03 16:53:16.072889	2026-07-03 16:53:16.072889
6256	\N	Paref - Northfield School for Boys, Inc.	PAREF NORTHFIELD SCHOOL FOR BOYS INC	Grade 1-6, Grade 7-10 & Grade 11-12	Unknown	Antipolo	Rizal	Sun Valley Estate	14.6430735	121.1780276	Masterlist 2026	t	2026-07-03 16:53:16.072889	2026-07-03 16:53:16.072889
6257	\N	PAREF Rosehill Preschool	PAREF ROSEHILL PRESCHOOL	Kinder & Grade 11-12	Unknown	Unspecified	Region IV-A	Sta. Monica Estate, Mission Hills Subdivision, HAVILA	12.879721	121.774017	Masterlist 2026	t	2026-07-03 16:53:16.072889	2026-07-03 16:53:16.072889
6258	\N	PAREF Rosehill School, Inc.	PAREF ROSEHILL SCHOOL INC	Grade 1-6, Grade 7-10 & Grade 11-12	Unknown	Unspecified	Region IV-A	Sta. Monica Estate, Mission Hills Subdivision, HAVILA	12.879721	121.774017	Masterlist 2026	t	2026-07-03 16:53:16.072889	2026-07-03 16:53:16.072889
6259	\N	Patnanungan NHS	PATNANUNGAN NHS	Grade 7-10 & Grade 11-12	Unknown	Patnanungan	Quezon	Poblacion	14.7896353	122.1859572	Masterlist 2026	t	2026-07-03 16:53:16.072889	2026-07-03 16:53:16.072889
6260	\N	Payapa Senior High School	PAYAPA SENIOR HIGH SCHOOL	Grade 11-12	Unknown	Payapa Rd	Payapa Ilaya	Payapa Ilaya, Lemery, Batangas	14.0019045	120.8868482	Masterlist 2026	t	2026-07-03 16:53:16.072889	2026-07-03 16:53:16.072889
6261	\N	Pedro Alegre Aure Senior High School	PEDRO ALEGRE AURE SENIOR HIGH SCHOOL	Grade 11-12	Unknown	Mendez	Cavite	Galicia I, Mendez	14.1282425	120.9078459	Masterlist 2026	t	2026-07-03 16:53:16.072889	2026-07-03 16:53:16.072889
6262	\N	Pedro S. Tolentino Memorial Integrated School	PEDRO S TOLENTINO MEMORIAL INTEGRATED SCHOOL	Grade 7-10 & Grade 11-12	Unknown	Batangas City	Batangas	Ilijan, Batangas City	13.6343515	121.0721288	Masterlist 2026	t	2026-07-03 16:53:16.072889	2026-07-03 16:53:16.072889
6263	\N	PELLE ACADEMY INC.	PELLE ACADEMY INC	Grade 11-12	Unknown	Tanza	Cavite	Belvedere Towne 1, Paradahan  1, Tanza	14.3192392	120.8628844	Masterlist 2026	t	2026-07-03 16:53:16.072889	2026-07-03 16:53:16.072889
6264	\N	Perez National High School	PEREZ NATIONAL HIGH SCHOOL	Grade 7-10 & Grade 11-12	Unknown	Perez	Quezon	Leon Guinto	14.1936484	121.926976	Masterlist 2026	t	2026-07-03 16:53:16.072889	2026-07-03 16:53:16.072889
6265	\N	PHILIPPIANS MONTESSORI SCHOOL INC.	PHILIPPIANS MONTESSORI SCHOOL INC	Grade 11-12	Unknown	Taytay	Rizal	94 Paseo Buenos Aires El Monteverde Subd., Brgy. San Juan, Taytay, Rizal	14.5563037	121.1407929	Masterlist 2026	t	2026-07-03 16:53:16.078621	2026-07-03 16:53:16.078621
6266	\N	PHILIPPINE HIGH SCHOOL FOR THE  ARTS	PHILIPPINE HIGH SCHOOL FOR THE ARTS	Grade 7-10 & Grade 11-12	Unknown	Los Baños	Laguna	Mt. Makiing, Los BaÃ±os, Laguna	14.1597258	121.2158882	Masterlist 2026	t	2026-07-03 16:53:16.078621	2026-07-03 16:53:16.078621
6267	\N	PHILIPPINE SCIENCE HIGH SCHOOL-CALABARZON Region Campus	PHILIPPINE SCIENCE HIGH SCHOOLCALABARZON REGION CAMPUS	Grade 7-10 & Grade 11-12	Unknown	Batangas City	Batangas	Sitio Sampaga West	13.7590676	121.0915785	Masterlist 2026	t	2026-07-03 16:53:16.078621	2026-07-03 16:53:16.078621
6268	\N	Philippine Technological Institute of Science Arts and Trade	PHILIPPINE TECHNOLOGICAL INSTITUTE OF SCIENCE ARTS AND TRADE	Grade 11-12	Unknown	Tanay	Rizal	FT Catapusan St., Brgy. Plaza Aldea, Tanay Rizal	14.4962506	121.2916988	Masterlist 2026	t	2026-07-03 16:53:16.078621	2026-07-03 16:53:16.078621
6269	\N	Philippine Technological Institute of Science Arts and Trade - Central, Inc. (Philtech Sta. Rosa)	PHILIPPINE TECHNOLOGICAL INSTITUTE OF SCIENCE ARTS AND TRADE CENTRAL INC PHILTECH STA ROSA	Grade 11-12	Unknown	City of Santa Rosa	Laguna	PhilTech Bldg. Canicosa Avenue Complex Brgy Balibago	14.3147078	121.1123219	Masterlist 2026	t	2026-07-03 16:53:16.078621	2026-07-03 16:53:16.078621
6271	\N	Philippine Technological Institute of Science, Arts and Trade-Cavite	PHILIPPINE TECHNOLOGICAL INSTITUTE OF SCIENCE ARTS AND TRADECAVITE	Grade 11-12	Unknown	General Mariano Alvarez	Cavite	2nd Flr. CRDM Bldg. Governor's Drive Corner Congressional road Brgy. G. Maderan,   GMA, Cavite	14.2837291	120.9990954	Masterlist 2026	t	2026-07-03 16:53:16.078621	2026-07-03 16:53:16.078621
6272	\N	Philippine Women's University Career Development and Continuing Education Center-Sta. Cruz	PHILIPPINE WOMEN'S UNIVERSITY CAREER DEVELOPMENT AND CONTINUING EDUCATION CENTERSTA CRUZ	Grade 11-12	Unknown	Santa Cruz	Laguna	M. H. Del Pilar St., Poblacion III, Sta. Cruz, Laguna	14.2828977	121.4154606	Masterlist 2026	t	2026-07-03 16:53:16.078621	2026-07-03 16:53:16.078621
6273	\N	Philippine Women's University-CDCEC - Calamba	PHILIPPINE WOMEN'S UNIVERSITYCDCEC CALAMBA	Grade 11-12	Unknown	Calamba	Laguna	Alva Center Rosal St., Brgy. Uno Crossing, Calamba City, Laguna	14.2052359	121.1564407	Masterlist 2026	t	2026-07-03 16:53:16.078621	2026-07-03 16:53:16.078621
6274	\N	Philippine Women's University-CDCEC-Sta. Cruz	PHILIPPINE WOMEN'S UNIVERSITYCDCECSTA CRUZ	Grade 11-12	Unknown	Santa Cruz	Laguna	M. H. del Pilar St., Poblacion III, Santa Cruz, Laguna	14.2814249	121.4159685	Masterlist 2026	t	2026-07-03 16:53:16.078621	2026-07-03 16:53:16.078621
6275	\N	PHILTECH INSTITUTE OF ARTS & TECHNOLOGY, INC.	PHILTECH INSTITUTE OF ARTS TECHNOLOGY INC	Grade 11-12	Unknown	Tagkawayan	Quezon	Brgy. Aldoboc, Tagkawayan, Quezon	13.968427	122.5337561	Masterlist 2026	t	2026-07-03 16:53:16.078621	2026-07-03 16:53:16.078621
6276	\N	Philtech Institute of Arts and Technology Inc.	PHILTECH INSTITUTE OF ARTS AND TECHNOLOGY INC	Grade 11-12	Unknown	Gumaca	Quezon	2nd Flr., Hong Bldg., San Diego, Gumaca, Quezon	13.9213941	122.1004575	Masterlist 2026	t	2026-07-03 16:53:16.078621	2026-07-03 16:53:16.078621
6277	\N	Philtech Institute of Arts and Technology Inc.-Catanauan, Quezon	PHILTECH INSTITUTE OF ARTS AND TECHNOLOGY INCCATANAUAN QUEZON	Grade 11-12	Unknown	Catanauan	Quezon	PIAT Bldg., Brgy. Dyes, Rotonda, Catanuan, Quezon	13.5956979	122.3232649	Masterlist 2026	t	2026-07-03 16:53:16.078621	2026-07-03 16:53:16.078621
6278	\N	Philtech Institute of Arts and Technology Inc.-Lucena City	PHILTECH INSTITUTE OF ARTS AND TECHNOLOGY INCLUCENA CITY	Grade 11-12	Unknown	Lucena City	Quezon	2nd Floor SY Bldg., Maharlika Highway, Brgy. Ibabang Dupay, Lucena City, Quezon	13.9413957	121.6234471	Masterlist 2026	t	2026-07-03 16:53:16.078621	2026-07-03 16:53:16.078621
6279	\N	Pila Senior High School	PILA SENIOR HIGH SCHOOL	Grade 11-12	Unknown	Pila	Laguna		14.2491039	121.3604257	Masterlist 2026	t	2026-07-03 16:53:16.078621	2026-07-03 16:53:16.078621
6280	\N	Pili NHS (Formerly Lutucan NHS Pili Ext.)	PILI NHS FORMERLY LUTUCAN NHS PILI EXT	Grade 7-10 & Grade 11-12	Unknown	Pili	Camarines Sur	Pili	13.5537412	123.2756171	Masterlist 2026	t	2026-07-03 16:53:16.078621	2026-07-03 16:53:16.078621
6281	\N	Pililla Academy Foundation, Inc.	PILILLA ACADEMY FOUNDATION INC	Grade 7-10 & Grade 11-12	Unknown	Pililla	Rizal	Quitiong St. Takungan, Pililla, Rizal	14.4810968	121.3051977	Masterlist 2026	t	2026-07-03 16:53:16.078621	2026-07-03 16:53:16.078621
6282	\N	Pililla National High School	PILILLA NATIONAL HIGH SCHOOL	Grade 7-10 & Grade 11-12	Unknown	Pililla	Rizal	M. A. Roxas St.	14.4770404	121.3144306	Masterlist 2026	t	2026-07-03 16:53:16.078621	2026-07-03 16:53:16.078621
6283	\N	PIMSAT Colleges-Rosario Campus: Colegio de Salinas	PIMSAT COLLEGESROSARIO CAMPUS COLEGIO DE SALINAS	Grade 11-12	Unknown	Cavite	Cavite	Scout Torrilo St., Barangay Poblacion, Rosario, Cavite	14.416225	120.855228	Masterlist 2026	t	2026-07-03 16:53:16.078621	2026-07-03 16:53:16.078621
6284	\N	Pinagbayanan Integrated National High School	PINAGBAYANAN INTEGRATED NATIONAL HIGH SCHOOL	Grade 7-10 & Grade 11-12	Unknown	Taysan	Batangas	Purok 5 Silangan, Pinagbayanan, Taysan, Batangas	13.7534884	121.2497099	Masterlist 2026	t	2026-07-03 16:53:16.078621	2026-07-03 16:53:16.078621
6285	\N	Pinagkawitan Integrated National Hgh School	PINAGKAWITAN INTEGRATED NATIONAL HGH SCHOOL	Grade 7-10 & Grade 11-12	Unknown	Lipa City	Batangas	Pinagkawitan	13.9007214	121.2025336	Masterlist 2026	t	2026-07-03 16:53:16.078621	2026-07-03 16:53:16.078621
6286	\N	Pinagtongulan Integrated National High School	PINAGTONGULAN INTEGRATED NATIONAL HIGH SCHOOL	Grade 7-10 & Grade 11-12	Unknown	Batangas City	Batangas	Macasaet St. Pinagtongulan	13.9312231	121.0985727	Masterlist 2026	t	2026-07-03 16:53:16.078621	2026-07-03 16:53:16.078621
6287	\N	Pinamukan Integrated School	PINAMUKAN INTEGRATED SCHOOL	Grade 7-10 & Grade 11-12	Unknown	Batangas City	Batangas	Pinamucan Proper	13.6937465	121.0578756	Masterlist 2026	t	2026-07-03 16:53:16.078621	2026-07-03 16:53:16.078621
6288	\N	Pintong Bukawe National High School	PINTONG BUKAWE NATIONAL HIGH SCHOOL	Grade 7-10 & Grade 11-12	Unknown	San Mateo	Rizal	Pintong Bukawe	14.6685375	121.2050156	Masterlist 2026	t	2026-07-03 16:53:16.078621	2026-07-03 16:53:16.078621
6289	\N	Pisipis NHS (Formerly Magallanes NHS Pisipis Extension)	PISIPIS NHS FORMERLY MAGALLANES NHS PISIPIS EXTENSION	Grade 7-10 & Grade 11-12	Unknown	Lopez	Quezon	Pisipis	13.8913018	122.3645949	Masterlist 2026	t	2026-07-03 16:53:16.078621	2026-07-03 16:53:16.078621
6290	\N	Pitogo Community High School	PITOGO COMMUNITY HIGH SCHOOL	Grade 7-10 & Grade 11-12	Unknown	Pitogo	Quezon	Eulalio Glinoga St.	13.7944796	122.0927492	Masterlist 2026	t	2026-07-03 16:53:16.078621	2026-07-03 16:53:16.078621
6291	\N	Placido T. Amo Senior High School	PLACIDO T AMO SENIOR HIGH SCHOOL	Grade 11-12	Unknown	Laurel	Batangas	Bugaan East, Laurel, Batangas	14.0448491	120.941153	Masterlist 2026	t	2026-07-03 16:53:16.078621	2026-07-03 16:53:16.078621
6292	\N	Plaridel Integrated High School	PLARIDEL INTEGRATED HIGH SCHOOL	Grade 7-10 & Grade 11-12	Unknown	Nagcarlan	Laguna	Banago, Nagcarlan	14.1149985	121.4162199	Masterlist 2026	t	2026-07-03 16:53:16.078621	2026-07-03 16:53:16.078621
6293	\N	PNTC Colleges	PNTC COLLEGES	Grade 11-12	Unknown	Dasmariñas	Cavite	Lt. Cantimbuhan St.	14.3261975	120.9354352	Masterlist 2026	t	2026-07-03 16:53:16.078621	2026-07-03 16:53:16.078621
6294	\N	Polillo Adventist Institute	POLILLO ADVENTIST INSTITUTE	Grade 7-10 & Grade 11-12	Unknown	Polillo	Quezon	BaÃ±adero Road	14.7305211	121.9700618	Masterlist 2026	t	2026-07-03 16:53:16.078621	2026-07-03 16:53:16.078621
6295	\N	Polillo National High School	POLILLO NATIONAL HIGH SCHOOL	Grade 7-10 & Grade 11-12	Unknown	Polillo	Quezon	Azurel St. Pob. Polillo, Quezon	14.7194725	121.9404207	Masterlist 2026	t	2026-07-03 16:53:16.078621	2026-07-03 16:53:16.078621
6296	\N	Polytechnic University of the Philippines-Biñan	POLYTECHNIC UNIVERSITY OF THE PHILIPPINESBINAN	Grade 11-12	Unknown	Biñan	Laguna	Brgy. Zapote, Biñan City, Laguna	14.3135397	121.0783374	Masterlist 2026	t	2026-07-03 16:53:16.078621	2026-07-03 16:53:16.078621
6297	\N	Polytechnic University of the Philippines-Calauan	POLYTECHNIC UNIVERSITY OF THE PHILIPPINESCALAUAN	Grade 11-12	Unknown	Calauan	Laguna	Brgy. Kanluran, Calauan, Laguna	14.1452913	121.311984	Masterlist 2026	t	2026-07-03 16:53:16.078621	2026-07-03 16:53:16.078621
6298	\N	Polytechnic University of the Philippines-San Pedro	POLYTECHNIC UNIVERSITY OF THE PHILIPPINESSAN PEDRO	Grade 11-12	Unknown	San Pedro	Laguna	Brgy. United Bayanihan, San Pedro City, Laguna	14.3344346	121.0293207	Masterlist 2026	t	2026-07-03 16:53:16.078621	2026-07-03 16:53:16.078621
6299	\N	Polytechnic University of the Philippines-Sta. Rosa	POLYTECHNIC UNIVERSITY OF THE PHILIPPINESSTA ROSA	Grade 11-12	Unknown	City of Santa Rosa	Laguna	LCA Blvd. Brgy. Tagapo, Sta. Rosa City, Laguna	14.3134993	121.106679	Masterlist 2026	t	2026-07-03 16:53:16.078621	2026-07-03 16:53:16.078621
6300	\N	Poten & Eliseo M. Quesada Memo. NHS	POTEN ELISEO M QUESADA MEMO NHS	Grade 7-10 & Grade 11-12	Unknown	Paete	Laguna	Manila East Rd.,Ibaba del Norte	14.3653374	121.478857	Masterlist 2026	t	2026-07-03 16:53:16.078621	2026-07-03 16:53:16.078621
6301	\N	Power School of Technology Inc.	POWER SCHOOL OF TECHNOLOGY INC	Grade 11-12	Unknown	Tanza	Cavite	516 A. Soriano Hi-Way	14.3885115	120.8475275	Masterlist 2026	t	2026-07-03 16:53:16.078621	2026-07-03 16:53:16.078621
6302	\N	Primitivo Kalaw Senior High School	PRIMITIVO KALAW SENIOR HIGH SCHOOL	Grade 11-12	Unknown	Balete	Batangas	Palsara, Balete, Batangas	14.0110625	121.1000349	Masterlist 2026	t	2026-07-03 16:53:16.078621	2026-07-03 16:53:16.078621
6303	\N	Progressive Senior High School	PROGRESSIVE SENIOR HIGH SCHOOL	Grade 11-12	Unknown	Bacoor	Cavite	Anthurium St., Progressive 3	14.4240482	120.9736027	Masterlist 2026	t	2026-07-03 16:53:16.078621	2026-07-03 16:53:16.078621
6304	\N	PTS College & Advanced Studies, Inc.	PTS COLLEGE ADVANCED STUDIES INC	Grade 11-12	Unknown	Dasmariñas	Cavite	Carlos Trinidad Ave., Salitran IV, DasmariÃ±as City, Cavite	14.3421943	120.9617037	Masterlist 2026	t	2026-07-03 16:53:16.078621	2026-07-03 16:53:16.078621
6305	\N	Pugon NHS	PUGON NHS	Grade 7-10 & Grade 11-12	Unknown	San Francisco (Aurora)	Quezon	Pugon	13.2313167	122.5655549	Masterlist 2026	t	2026-07-03 16:53:16.078621	2026-07-03 16:53:16.078621
6306	\N	Pulo ni Sara Integrated School	PULO NI SARA INTEGRATED SCHOOL	Grade 7-10 & Grade 11-12	Unknown	Maragondon	Cavite	Pulo ni Sara	14.1955189	120.8202318	Masterlist 2026	t	2026-07-03 16:53:16.078621	2026-07-03 16:53:16.078621
6307	\N	Pulo Senior High School	PULO SENIOR HIGH SCHOOL	Grade 11-12	Unknown	Cabuyao City	Laguna	Brgy. Pulo,  City of Cabuyao, Laguna	14.241996	121.131904	Masterlist 2026	t	2026-07-03 16:53:16.078621	2026-07-03 16:53:16.078621
6308	\N	PWU CDCEC Calamba	PWU CDCEC CALAMBA	Grade 11-12	Unknown	Calamba	Laguna	Rosal Street, Calamba City, Laguna	14.2052349	121.1564411	Masterlist 2026	t	2026-07-03 16:53:16.078621	2026-07-03 16:53:16.078621
6309	\N	Quezon Center for Research and Studies Inc.	QUEZON CENTER FOR RESEARCH AND STUDIES INC	Grade 11-12	Unknown	Lucena City	Quezon	2nd Flr., Garcia Corp. Tower cor. Rizal & Granja St., Lucena City, Quezon	13.9347282	121.6124458	Masterlist 2026	t	2026-07-03 16:53:16.078621	2026-07-03 16:53:16.078621
6310	\N	Quezon National High School	QUEZON NATIONAL HIGH SCHOOL	Grade 7-10 & Grade 11-12	Unknown	Lucena City	Quezon	M.L. Tagarao St.	13.9337522	121.6054368	Masterlist 2026	t	2026-07-03 16:53:16.078621	2026-07-03 16:53:16.078621
6311	\N	Quezon Science High School	QUEZON SCIENCE HIGH SCHOOL	Grade 7-10 & Grade 11-12	Unknown	City of Tayabas	Quezon	Diversion Road	13.9619186	121.5689717	Masterlist 2026	t	2026-07-03 16:53:16.078621	2026-07-03 16:53:16.078621
6312	\N	Quezonian Educational College, Inc.	QUEZONIAN EDUCATIONAL COLLEGE INC	Grade 7-10 & Grade 11-12	Unknown	Atimonan	Quezon	Dr.  Ramon Soler	13.9987835	121.9234693	Masterlist 2026	t	2026-07-03 16:53:16.078621	2026-07-03 16:53:16.078621
6313	\N	Quisao Integrated National High School	QUISAO INTEGRATED NATIONAL HIGH SCHOOL	Grade 7-10 & Grade 11-12	Unknown	Pililla	Rizal	J. P. Rizal Street	14.4379327	121.3484448	Masterlist 2026	t	2026-07-03 16:53:16.078621	2026-07-03 16:53:16.078621
6314	\N	R. CONCEPCION MONTESSORI SCHOOL-LEMERY INC.	R CONCEPCION MONTESSORI SCHOOLLEMERY INC	Grade 7-10 & Grade 11-12	Unknown	Lemery	Batangas	R. Diokno St. District I (Pob.)	13.8763839	120.9141892	Masterlist 2026	t	2026-07-03 16:53:16.078621	2026-07-03 16:53:16.078621
6315	\N	Raises Montessori Academe of Angono Ext	RAISES MONTESSORI ACADEME OF ANGONO EXT	Grade 11-12	Unknown	Angono	Lalawigan ng Rizal	#1320 Man Rey Vill,Pag-asa, Binangonan, Rizal	14.5276372	121.1592137	Masterlist 2026	t	2026-07-03 16:53:16.084163	2026-07-03 16:53:16.084163
6316	\N	Recto MNHS	RECTO MNHS	Grade 7-10 & Grade 11-12	Unknown	Bulan	Sorsogon	Recto	12.7424313	123.8801952	Masterlist 2026	t	2026-07-03 16:53:16.084163	2026-07-03 16:53:16.084163
6317	\N	Red Link Institute of Science & Technology	RED LINK INSTITUTE OF SCIENCE TECHNOLOGY	Grade 11-12	Unknown	Calamba	Laguna	3rd Floor, South Timberland Bldg., Km. 50, National Highway, Brgy. San Cristobal, Calamba City, Laguna	14.2252478	121.1402702	Masterlist 2026	t	2026-07-03 16:53:16.084163	2026-07-03 16:53:16.084163
6319	\N	Regional Lead School for the Arts in Angono	REGIONAL LEAD SCHOOL FOR THE ARTS IN ANGONO	Grade 7-10 & Grade 11-12	Unknown	Angono	Rizal	10th Street San Martin Subdivision	14.5391488	121.1540458	Masterlist 2026	t	2026-07-03 16:53:16.084163	2026-07-03 16:53:16.084163
6320	\N	Renato EdaÃ±o Vicencio NHS (Formerly Pagsangahan NHS-Don Juan Vercelos Annex)	RENATO EDAA±O VICENCIO NHS FORMERLY PAGSANGAHAN NHSDON JUAN VERCELOS ANNEX	Grade 7-10 & Grade 11-12	Unknown	San Francisco (Aurora)	Quezon	Don Juan Vercelos	13.2895726	122.5287884	Masterlist 2026	t	2026-07-03 16:53:16.084163	2026-07-03 16:53:16.084163
6321	\N	Ricardo O. Macasaet Sr. Memorial Academy Foundation Inc.	RICARDO O MACASAET SR MEMORIAL ACADEMY FOUNDATION INC	Grade 7-10 & Grade 11-12	Unknown	Lipa City	Batangas	Macasaet Street	13.9431655	121.1087872	Masterlist 2026	t	2026-07-03 16:53:16.084163	2026-07-03 16:53:16.084163
6322	\N	Rizal College of Laguna	RIZAL COLLEGE OF LAGUNA	Grade 7-10 & Grade 11-12	Unknown	Unspecified	Region IV-A	National Hi-way	14.1406629	121.4691774	Masterlist 2026	t	2026-07-03 16:53:16.084163	2026-07-03 16:53:16.084163
6323	\N	Rizal College of Taal	RIZAL COLLEGE OF TAAL	Grade 7-10 & Grade 11-12	Unknown	Taal	Batangas	G. Marella St. Taal, Batangas	13.8815423	120.9242526	Masterlist 2026	t	2026-07-03 16:53:16.084163	2026-07-03 16:53:16.084163
6324	\N	Rizal Integrated National High School	RIZAL INTEGRATED NATIONAL HIGH SCHOOL	Grade 7-10 & Grade 11-12	Unknown	Tanay	Rizal	-	14.534888	121.360098	Masterlist 2026	t	2026-07-03 16:53:16.084163	2026-07-03 16:53:16.084163
6325	\N	Rizal Marine & Technocomputer College	RIZAL MARINE TECHNOCOMPUTER COLLEGE	Grade 7-10 & Grade 11-12	Unknown	Unspecified	Region IV-A	San Marcos	12.879721	121.774017	Masterlist 2026	t	2026-07-03 16:53:16.084163	2026-07-03 16:53:16.084163
6326	\N	Rizal Marine and Technocomputer College, Inc	RIZAL MARINE AND TECHNOCOMPUTER COLLEGE INC	Grade 11-12	Unknown	Tanay	Rizal	No. 11 Yujuico St., Poblacion, Tabing-Ilog, Tanay, Rizal	14.497971	121.285737	Masterlist 2026	t	2026-07-03 16:53:16.084163	2026-07-03 16:53:16.084163
6327	\N	Rizal National Science High School	RIZAL NATIONAL SCIENCE HIGH SCHOOL	Grade 7-10 & Grade 11-12	Unknown	Binangonan	Rizal	J.P. Rizal St. Dalig Batingan, Binangonan, Rizal	14.4725075	121.1970145	Masterlist 2026	t	2026-07-03 16:53:16.084163	2026-07-03 16:53:16.084163
6328	\N	Rizal Sports Academy	RIZAL SPORTS ACADEMY	Grade 11-12	Unknown	Angono	Rizal	Ipil-ipil Street	14.5309968	121.1622984	Masterlist 2026	t	2026-07-03 16:53:16.084163	2026-07-03 16:53:16.084163
6329	\N	Rizal Standard Academy	RIZAL STANDARD ACADEMY	Grade 1-6, Grade 7-10 & Grade 11-12	Unknown	Nagcarlan	Laguna	Rizal Ave, Brgy II, Nagcarlan, Laguna	14.1358394	121.4153956	Masterlist 2026	t	2026-07-03 16:53:16.084163	2026-07-03 16:53:16.084163
6330	\N	Rizza NHS	RIZZA NHS	Grade 7-10 & Grade 11-12	Unknown	Unspecified	Region IV-A	Sitio Peterson	12.879721	121.774017	Masterlist 2026	t	2026-07-03 16:53:16.084163	2026-07-03 16:53:16.084163
6331	\N	RNC TECHNICAL LEARNING CENTER	RNC TECHNICAL LEARNING CENTER	Grade 11-12	Unknown	Romblon	Quezon	Brgy. Sta. Maria	13.9575229	122.2928366	Masterlist 2026	t	2026-07-03 16:53:16.084163	2026-07-03 16:53:16.084163
6332	\N	Rogationist College	ROGATIONIST COLLEGE	Grade 7-10 & Grade 11-12	Unknown	Silang	Cavite	Km 52 E. Aguinaldo Hi-way	14.1490981	120.9559694	Masterlist 2026	t	2026-07-03 16:53:16.084163	2026-07-03 16:53:16.084163
6333	\N	Rosario Integrated National High School	ROSARIO INTEGRATED NATIONAL HIGH SCHOOL	Grade 7-10 & Grade 11-12	Unknown	Rosario	Batangas	San Roque, Rosario, Batangas	13.8534215	121.2011022	Masterlist 2026	t	2026-07-03 16:53:16.084163	2026-07-03 16:53:16.084163
6334	\N	Rosario Quesada Integrated National High School	ROSARIO QUESADA INTEGRATED NATIONAL HIGH SCHOOL	Grade 7-10 & Grade 11-12	Unknown	Marikina	Metro Manila	Ibabang Nangka	14.6680939	121.109457	Masterlist 2026	t	2026-07-03 16:53:16.084163	2026-07-03 16:53:16.084163
6335	\N	Royal British College	ROYAL BRITISH COLLEGE	Grade 11-12	Unknown	Lipa City	Batangas	Brgy. Marawoy, Lipa City	13.9621588	121.170729	Masterlist 2026	t	2026-07-03 16:53:16.084163	2026-07-03 16:53:16.084163
6336	\N	Royal Heirs International School Inc.	ROYAL HEIRS INTERNATIONAL SCHOOL INC	Grade 11-12	Unknown	Silang	Cavite	B72 L13 & 14 Ipil II	14.2723572	120.9994617	Masterlist 2026	t	2026-07-03 16:53:16.084163	2026-07-03 16:53:16.084163
6337	\N	Rufina P. Trinidad Mem. NHS	RUFINA P TRINIDAD MEM NHS	Grade 7-10 & Grade 11-12	Unknown	City of Tayabas	Quezon	Dapdap	14.0588196	121.5683962	Masterlist 2026	t	2026-07-03 16:53:16.084163	2026-07-03 16:53:16.084163
6338	\N	Ruther E. Esconde School of Multiple Intelligences, Inc.	RUTHER E ESCONDE SCHOOL OF MULTIPLE INTELLIGENCES INC	Grade 7-10 & Grade 11-12	Unknown	Bacoor	Cavite	39 Gen. Evangelista St.	14.449116	120.935529	Masterlist 2026	t	2026-07-03 16:53:16.084163	2026-07-03 16:53:16.084163
6339	\N	S.J.B. Saint John Bosco I.A.S. (Ampid, San Mateo Rizal) Inc.	SJB SAINT JOHN BOSCO IAS AMPID SAN MATEO RIZAL INC	Grade 11-12	Unknown	Gen. Luna Ave	Rizal	1752 One Princeway Building, General Luna Avenue, Ampid 2, San Mateo, Rizal	14.6973202	121.1211211	Masterlist 2026	t	2026-07-03 16:53:16.084163	2026-07-03 16:53:16.084163
6340	\N	Sabang National High School	SABANG NATIONAL HIGH SCHOOL	Grade 7-10 & Grade 11-12	Unknown	Calabanga	Camarines Sur	Sabang	13.7243739	123.2093512	Masterlist 2026	t	2026-07-03 16:53:16.084163	2026-07-03 16:53:16.084163
6341	\N	Saint Anne Academy	SAINT ANNE ACADEMY	Grade 7-10 & Grade 11-12	Unknown	San Joaquin	Iloilo	Purok 1, Familiar St.	10.5941275	122.1447998	Masterlist 2026	t	2026-07-03 16:53:16.084163	2026-07-03 16:53:16.084163
6342	\N	Saint Augustine School	SAINT AUGUSTINE SCHOOL	Grade 11-12	Unknown	Tanza	Cavite	Sta. Cruz St., Poblacion, Tanza, Cavite	14.4015556	120.8563564	Masterlist 2026	t	2026-07-03 16:53:16.084163	2026-07-03 16:53:16.084163
6343	\N	Saint Benilde International School (Calamba)	SAINT BENILDE INTERNATIONAL SCHOOL CALAMBA	Grade 11-12	Unknown	Calamba	Laguna	Crossing, Calamba City, Laguna	14.2079666	121.1541474	Masterlist 2026	t	2026-07-03 16:53:16.084163	2026-07-03 16:53:16.084163
6344	\N	Saint Francis Academy	SAINT FRANCIS ACADEMY	Grade 7-10 & Grade 11-12	Unknown	Mabini	Batangas	F.Castillo Boulevard Poblacion, Mabini, Batangas	13.747176	120.9409006	Masterlist 2026	t	2026-07-03 16:53:16.084163	2026-07-03 16:53:16.084163
6345	\N	Saint Francis de Sales  Seminary High School Unit, Inc.	SAINT FRANCIS DE SALES SEMINARY HIGH SCHOOL UNIT INC	Grade 7-10 & Grade 11-12	Unknown	Unspecified	Region IV-A	#2 Calle Arzobispado (formerly San Lorenzo Ruiz Road)	12.879721	121.774017	Masterlist 2026	t	2026-07-03 16:53:16.084163	2026-07-03 16:53:16.084163
6346	\N	Saint Francis Institute of Computer Studies	SAINT FRANCIS INSTITUTE OF COMPUTER STUDIES	Grade 11-12	Unknown	San Pedro	Laguna	National Highway, San Pedro, Laguna	14.3611497	121.0594505	Masterlist 2026	t	2026-07-03 16:53:16.084163	2026-07-03 16:53:16.084163
6347	\N	Saint Francis NHS	SAINT FRANCIS NHS	Grade 7-10 & Grade 11-12	Unknown	Taguig	Metro Manila	TUKLAS ST.	14.490903	121.0523576	Masterlist 2026	t	2026-07-03 16:53:16.084163	2026-07-03 16:53:16.084163
6348	\N	Saint Francis of Assisi College - Binan	SAINT FRANCIS OF ASSISI COLLEGE BINAN	Grade 11-12	Unknown	Biñan	Laguna	PHASE 3, Juana Complex, Brgy. San Francisco, BiÃ±an City, Laguna	14.3145578	121.0831646	Masterlist 2026	t	2026-07-03 16:53:16.084163	2026-07-03 16:53:16.084163
6349	\N	Saint Gregory College of Science and Technology	SAINT GREGORY COLLEGE OF SCIENCE AND TECHNOLOGY	Grade 11-12	Unknown	Cavite	Cavite	2nd/3rd Floor, St. Michael's Building, Manila-Cavite Rd., Brgy. 15, Sta. Cruz, Cavite City, Cavite	14.471981	120.88776	Masterlist 2026	t	2026-07-03 16:53:16.084163	2026-07-03 16:53:16.084163
6350	\N	Saint John Paul II Minor Seminary	SAINT JOHN PAUL II MINOR SEMINARY	Grade 7-10 & Grade 11-12	Unknown	Antipolo	Rizal	Maguey Road	14.598668	121.192131	Masterlist 2026	t	2026-07-03 16:53:16.084163	2026-07-03 16:53:16.084163
6351	\N	Saint Joseph Academy	SAINT JOSEPH ACADEMY	Grade 7-10 & Grade 11-12	Unknown	San Jose	Batangas	J. De Villa St.	13.8785088	121.1034848	Masterlist 2026	t	2026-07-03 16:53:16.084163	2026-07-03 16:53:16.084163
6352	\N	Saint Matthew College	SAINT MATTHEW COLLEGE	Grade 1-6, Grade 7-10 & Grade 11-12	Unknown	San Mateo	Rizal	#3 Miguel Cristi St., Ampid 2	14.6873617	121.1172561	Masterlist 2026	t	2026-07-03 16:53:16.084163	2026-07-03 16:53:16.084163
6353	\N	Saint Michael's College of Laguna	SAINT MICHAEL'S COLLEGE OF LAGUNA	Grade 11-12	Unknown	Unspecified	Region IV-A	Old National Road	12.879721	121.774017	Masterlist 2026	t	2026-07-03 16:53:16.084163	2026-07-03 16:53:16.084163
6354	\N	Saint Peter's School (Calauag), Inc.	SAINT PETER'S SCHOOL CALAUAG INC	Grade 7-10 & Grade 11-12	Unknown	Calauag	Quezon	Rizal St.	13.9570789	122.2879509	Masterlist 2026	t	2026-07-03 16:53:16.084163	2026-07-03 16:53:16.084163
6355	\N	Saints John & Paul Educational Foundation, Inc.	SAINTS JOHN PAUL EDUCATIONAL FOUNDATION INC	Grade 7-10 & Grade 11-12	Unknown	Calamba	Laguna	Halang, Calamba City	14.1935047	121.1781975	Masterlist 2026	t	2026-07-03 16:53:16.084163	2026-07-03 16:53:16.084163
6356	\N	Saints John and Paul Educational Foundation	SAINTS JOHN AND PAUL EDUCATIONAL FOUNDATION	Grade 11-12	Unknown	Calamba	Laguna	National Highway, Brgy. Halang, Calamba City, Laguna	14.2085227	121.1609716	Masterlist 2026	t	2026-07-03 16:53:16.084163	2026-07-03 16:53:16.084163
6357	\N	Salinas Westpoint College Inc.	SALINAS WESTPOINT COLLEGE INC	Grade 11-12	Unknown	Makati City	Metro Manila	Poblacion	14.5656805	121.0320766	Masterlist 2026	t	2026-07-03 16:53:16.084163	2026-07-03 16:53:16.084163
6358	\N	Salitran IV Integrated High School	SALITRAN IV INTEGRATED HIGH SCHOOL	Grade 7-10 & Grade 11-12	Unknown	Dasmariñas	Cavite	Mangovillr Subdivision, Barangay Salitran IV	14.3536999	120.9492675	Masterlist 2026	t	2026-07-03 16:53:16.084163	2026-07-03 16:53:16.084163
6359	\N	Sampaloc NHS, Sampaloc	SAMPALOC NHS SAMPALOC	Grade 7-10 & Grade 11-12	Unknown	Sampaloc	Quezon	Banot	14.1669477	121.6710859	Masterlist 2026	t	2026-07-03 16:53:16.084163	2026-07-03 16:53:16.084163
6360	\N	Sampiro Integrated Senior High School	SAMPIRO INTEGRATED SENIOR HIGH SCHOOL	Grade 7-10 & Grade 11-12	Unknown	San Juan	Batangas	Sampiro, San Juan, Batangas	13.7865776	121.3841797	Masterlist 2026	t	2026-07-03 16:53:16.084163	2026-07-03 16:53:16.084163
6361	\N	Samuel Christian College of Gen. Trias, Inc.	SAMUEL CHRISTIAN COLLEGE OF GEN TRIAS INC	Grade 7-10 & Grade 11-12	Unknown	General Trias	Cavite	F. Manalo St., Navarro, Gen. Trias, Cavite	14.3800892	120.8888283	Masterlist 2026	t	2026-07-03 16:53:16.084163	2026-07-03 16:53:16.084163
6362	\N	San Agapito Integrated High School	SAN AGAPITO INTEGRATED HIGH SCHOOL	Grade 7-10 & Grade 11-12	Unknown	Batangas City	Batangas	San Agapito, Isla Verde	13.5370187	121.0879674	Masterlist 2026	t	2026-07-03 16:53:16.084163	2026-07-03 16:53:16.084163
6363	\N	San Agustin Integrated School	SAN AGUSTIN INTEGRATED SCHOOL	Grade 7-10 & Grade 11-12	Unknown	San Fernando	Pampanga	San Agustin Silangan, Isla Verde	15.0509975	120.6697495	Masterlist 2026	t	2026-07-03 16:53:16.084163	2026-07-03 16:53:16.084163
6364	\N	San Andres NHS ( formerly Camflora NHS)	SAN ANDRES NHS FORMERLY CAMFLORA NHS	Grade 7-10 & Grade 11-12	Unknown	San Andres	Quezon	Fernandez	13.357106	122.6390489	Masterlist 2026	t	2026-07-03 16:53:16.084163	2026-07-03 16:53:16.084163
6365	\N	San Antonio De Padua College	SAN ANTONIO DE PADUA COLLEGE	Grade 11-12	Unknown	Pila	Laguna	National Highway, Pila, Laguna	14.2253537	121.3618467	Masterlist 2026	t	2026-07-03 16:53:16.090394	2026-07-03 16:53:16.090394
6366	\N	San Antonio Integrated National High School	SAN ANTONIO INTEGRATED NATIONAL HIGH SCHOOL	Grade 7-10 & Grade 11-12	Unknown	Unspecified	Region IV-A	Sitio Lunao	29.4251905	-98.4945922	Masterlist 2026	t	2026-07-03 16:53:16.090394	2026-07-03 16:53:16.090394
6367	\N	San Antonio NHS	SAN ANTONIO NHS	Grade 7-10 & Grade 11-12	Unknown	San Antonio	Quezon	Sampaguita	13.8886975	121.2864189	Masterlist 2026	t	2026-07-03 16:53:16.090394	2026-07-03 16:53:16.090394
6368	\N	San Bartolome Integrated High School	SAN BARTOLOME INTEGRATED HIGH SCHOOL	Grade 7-10 & Grade 11-12	Unknown	San Pablo City	Laguna	Brgy. San Bartolome	14.0226595	121.2861275	Masterlist 2026	t	2026-07-03 16:53:16.090394	2026-07-03 16:53:16.090394
6369	\N	San Buenaventura Integrated National High School-Main	SAN BUENAVENTURA INTEGRATED NATIONAL HIGH SCHOOLMAIN	Grade 7-10 & Grade 11-12	Unknown	Luisiana	Laguna	Bgy. San Buenaventura	14.1900755	121.5655424	Masterlist 2026	t	2026-07-03 16:53:16.090394	2026-07-03 16:53:16.090394
6370	\N	San Celestino Integrated National High School	SAN CELESTINO INTEGRATED NATIONAL HIGH SCHOOL	Grade 7-10 & Grade 11-12	Unknown	San Joaquin	Iloilo	Purok 1	10.5941275	122.1447998	Masterlist 2026	t	2026-07-03 16:53:16.090394	2026-07-03 16:53:16.090394
6371	\N	San Cristobal Integrated High School	SAN CRISTOBAL INTEGRATED HIGH SCHOOL	Grade 7-10 & Grade 11-12	Unknown	San Pablo City	Laguna	Brgy. San Cristobal	14.0252302	121.3778687	Masterlist 2026	t	2026-07-03 16:53:16.090394	2026-07-03 16:53:16.090394
6372	\N	San Francisco B NHS	SAN FRANCISCO B NHS	Grade 7-10 & Grade 11-12	Unknown	Lopez	Quezon	Lopez-Catanauan Road	13.7754577	122.3050823	Masterlist 2026	t	2026-07-03 16:53:16.090394	2026-07-03 16:53:16.090394
6373	\N	San Francisco Integrated National High School	SAN FRANCISCO INTEGRATED NATIONAL HIGH SCHOOL	Grade 7-10 & Grade 11-12	Unknown	San Joaquin	Iloilo	Purok 1	10.5941275	122.1447998	Masterlist 2026	t	2026-07-03 16:53:16.090394	2026-07-03 16:53:16.090394
6374	\N	San Francisco Parochial Academy, Inc.	SAN FRANCISCO PAROCHIAL ACADEMY INC	Grade 7-10 & Grade 11-12	Unknown	Unspecified	Region IV-A	Capt. V. NapeÃ±as St.	12.879721	121.774017	Masterlist 2026	t	2026-07-03 16:53:16.090394	2026-07-03 16:53:16.090394
6375	\N	San Guillermo National High School	SAN GUILLERMO NATIONAL HIGH SCHOOL	Grade 7-10 & Grade 11-12	Unknown	San Marcelino	Zambales	Cosep St.	14.9787824	120.153957	Masterlist 2026	t	2026-07-03 16:53:16.090394	2026-07-03 16:53:16.090394
6376	\N	San Isidro Integrated High School	SAN ISIDRO INTEGRATED HIGH SCHOOL	Grade 7-10 & Grade 11-12	Unknown	San Joaquin	Iloilo	Purok 2	10.5889969	122.141251	Masterlist 2026	t	2026-07-03 16:53:16.090394	2026-07-03 16:53:16.090394
6377	\N	San Isidro Integrated National High School	SAN ISIDRO INTEGRATED NATIONAL HIGH SCHOOL	Grade 7-10 & Grade 11-12	Unknown	Lipa City	Batangas	San Isidro, Lipa City	13.9590585	121.2042766	Masterlist 2026	t	2026-07-03 16:53:16.090394	2026-07-03 16:53:16.090394
6378	\N	San Isidro Integrated School (formerly San Isidro NHS, Tagkawayan)	SAN ISIDRO INTEGRATED SCHOOL FORMERLY SAN ISIDRO NHS TAGKAWAYAN	Grade 7-10 & Grade 11-12	Unknown	San Fernando	Pampanga	San Isidro	15.0601675	120.6530644	Masterlist 2026	t	2026-07-03 16:53:16.090394	2026-07-03 16:53:16.090394
6379	\N	San Isidro National High School	SAN ISIDRO NATIONAL HIGH SCHOOL	Grade 7-10 & Grade 11-12	Unknown	Catanauan	Quezon	Barangay San Isidro, Catanauan	13.6329241	122.2410547	Masterlist 2026	t	2026-07-03 16:53:16.090394	2026-07-03 16:53:16.090394
6380	\N	SAN ISIDRO NATIONAL HIGH SCHOOL, PADRE BURGOS	SAN ISIDRO NATIONAL HIGH SCHOOL PADRE BURGOS	Grade 7-10 & Grade 11-12	Unknown	Padre Burgos	Quezon	San Isidro	13.9177711	121.8704926	Masterlist 2026	t	2026-07-03 16:53:16.090394	2026-07-03 16:53:16.090394
6381	\N	San Isidro NHS, Gen. Luna	SAN ISIDRO NHS GEN LUNA	Grade 7-10 & Grade 11-12	Unknown	General Luna	Quezon	San Isidro Ilaya	13.6666546	122.2143323	Masterlist 2026	t	2026-07-03 16:53:16.090394	2026-07-03 16:53:16.090394
6382	\N	San Isidro Senior High School	SAN ISIDRO SENIOR HIGH SCHOOL	Grade 11-12	Unknown	Rodriguez	Metro Manila		14.7492875	121.1580822	Masterlist 2026	t	2026-07-03 16:53:16.090394	2026-07-03 16:53:16.090394
6383	\N	San Isidro-Malvar Senior High School	SAN ISIDROMALVAR SENIOR HIGH SCHOOL	Grade 11-12	Unknown	Malvar	Batangas		14.0475849	121.161261	Masterlist 2026	t	2026-07-03 16:53:16.090394	2026-07-03 16:53:16.090394
6384	\N	San Jose Community High School	SAN JOSE COMMUNITY HIGH SCHOOL	Grade 7-10 & Grade 11-12	Unknown	San Pedro	Cavite	Nicolasa Virata	14.330367	121.035408	Masterlist 2026	t	2026-07-03 16:53:16.090394	2026-07-03 16:53:16.090394
6385	\N	San Jose Integrated High School	SAN JOSE INTEGRATED HIGH SCHOOL	Grade 7-10 & Grade 11-12	Unknown	Urdaneta City	Pangasinan	Brgy. San Jose	15.9827635	120.5077582	Masterlist 2026	t	2026-07-03 16:53:16.090394	2026-07-03 16:53:16.090394
6386	\N	San Jose Litex Senior High School	SAN JOSE LITEX SENIOR HIGH SCHOOL	Grade 11-12	Unknown	Rodriguez	Rizal	Litex Subd.,	14.7353899	121.1300115	Masterlist 2026	t	2026-07-03 16:53:16.090394	2026-07-03 16:53:16.090394
6388	\N	San Jose NHS	SAN JOSE NHS	Grade 7-10 & Grade 11-12	Unknown	Antipolo	Rizal	Sen. Lorenzo Sumulong Memorial Circle, Sitio Pulong Banal	14.58463	121.181511	Masterlist 2026	t	2026-07-03 16:53:16.090394	2026-07-03 16:53:16.090394
6389	\N	San Jose NHS (Formerly Tagbacan Ilaya Integ. Sec. Ext. Classes)	SAN JOSE NHS FORMERLY TAGBACAN ILAYA INTEG SEC EXT CLASSES	Grade 7-10 & Grade 11-12	Unknown	Catanauan	Quezon	San Jose Anyao	13.6521384	122.384425	Masterlist 2026	t	2026-07-03 16:53:16.090394	2026-07-03 16:53:16.090394
6390	\N	San Juan Institute of Technology	SAN JUAN INSTITUTE OF TECHNOLOGY	Grade 7-10 & Grade 11-12	Unknown	San Juan	Batangas	Mabalanoy	13.8152045	121.3992474	Masterlist 2026	t	2026-07-03 16:53:16.090394	2026-07-03 16:53:16.090394
6391	\N	San Juan National High School	SAN JUAN NATIONAL HIGH SCHOOL	Grade 7-10 & Grade 11-12	Unknown	San Carlos City	Pangasinan	Sitio Sapinit	15.9152012	120.376697	Masterlist 2026	t	2026-07-03 16:53:16.090394	2026-07-03 16:53:16.090394
6392	\N	San Juan Senior High School	SAN JUAN SENIOR HIGH SCHOOL	Grade 11-12	Unknown	San Juan	Batangas	Lipahan, San Juan, Batangas	13.8313811	121.3977728	Masterlist 2026	t	2026-07-03 16:53:16.090394	2026-07-03 16:53:16.090394
6393	\N	San Luis Academy, Inc.	SAN LUIS ACADEMY INC	Grade 7-10 & Grade 11-12	Unknown	San Luis	Batangas	Calumpang West, San Luis, Batangas	13.8428872	120.9726537	Masterlist 2026	t	2026-07-03 16:53:16.090394	2026-07-03 16:53:16.090394
6394	\N	San Luis Senior High School	SAN LUIS SENIOR HIGH SCHOOL	Grade 11-12	Unknown	San Luis	Batangas	Calumpang East, San Luis, Batangas	13.843601	120.9736346	Masterlist 2026	t	2026-07-03 16:53:16.090394	2026-07-03 16:53:16.090394
6395	\N	San Mateo Senior High School	SAN MATEO SENIOR HIGH SCHOOL	Grade 11-12	Unknown	San Mateo	Rizal	Sta. Cecilia Subdivision Guitnangbayan I8	14.6922875	121.1200156	Masterlist 2026	t	2026-07-03 16:53:16.090394	2026-07-03 16:53:16.090394
6396	\N	San Miguel National High School	SAN MIGUEL NATIONAL HIGH SCHOOL	Grade 7-10 & Grade 11-12	Unknown	Compostela	Davao de Oro	Sitio Ilang-Ilang, Brgy. San Miguel, Mabitac	7.6396649	126.121821	Masterlist 2026	t	2026-07-03 16:53:16.090394	2026-07-03 16:53:16.090394
6397	\N	San Nicolas Integrated High School	SAN NICOLAS INTEGRATED HIGH SCHOOL	Grade 7-10 & Grade 11-12	Unknown	San Nicolas	Batangas	Calangay	13.9186506	120.9424541	Masterlist 2026	t	2026-07-03 16:53:16.090394	2026-07-03 16:53:16.090394
6398	\N	San Pablo Christian School	SAN PABLO CHRISTIAN SCHOOL	Grade 7-10 & Grade 11-12	Unknown	San Pablo City	Laguna	77 Schetelig Avenue	14.0713812	121.3296392	Masterlist 2026	t	2026-07-03 16:53:16.090394	2026-07-03 16:53:16.090394
6399	\N	San Pablo City Integrated High School	SAN PABLO CITY INTEGRATED HIGH SCHOOL	Grade 7-10 & Grade 11-12	Unknown	San Pablo City	Laguna	F. MariÃ±o St. Lakeside Park Subd.	14.0797302	121.3195505	Masterlist 2026	t	2026-07-03 16:53:16.090394	2026-07-03 16:53:16.090394
6400	\N	San Pablo City Science Integrated High School	SAN PABLO CITY SCIENCE INTEGRATED HIGH SCHOOL	Grade 7-10 & Grade 11-12	Unknown	San Pablo City	Laguna	Brgy. San Jose	14.0646816	121.3423771	Masterlist 2026	t	2026-07-03 16:53:16.090394	2026-07-03 16:53:16.090394
6401	\N	San Pablo Colleges	SAN PABLO COLLEGES	Grade 11-12	Unknown	San Pablo City	Laguna	Hermanos Belen St., San Pablo City, Laguna	14.0670772	121.3276139	Masterlist 2026	t	2026-07-03 16:53:16.090394	2026-07-03 16:53:16.090394
6402	\N	San Pascual Senior High School 1	SAN PASCUAL SENIOR HIGH SCHOOL 1	Grade 11-12	Unknown	San Pascual	Batangas	San Antonio, San Pascual, Batangas	13.7865017	121.0184427	Masterlist 2026	t	2026-07-03 16:53:16.090394	2026-07-03 16:53:16.090394
6403	\N	San Pascual Senior High School 2	SAN PASCUAL SENIOR HIGH SCHOOL 2	Grade 11-12	Unknown	San Pascual	Batangas	Malaking Pook, San Pascual, Batangas	13.7865017	121.0184427	Masterlist 2026	t	2026-07-03 16:53:16.090394	2026-07-03 16:53:16.090394
6404	\N	San Pedro College of Business Administration	SAN PEDRO COLLEGE OF BUSINESS ADMINISTRATION	Grade 11-12	Unknown	San Pedro	Laguna	Km 30 Old National Highway, Brgy. Nueva, San Pedro City, Laguna	14.3543843	121.0616464	Masterlist 2026	t	2026-07-03 16:53:16.090394	2026-07-03 16:53:16.090394
6405	\N	San Pedro Relocation Center National High School, Main (Langgam) Campus	SAN PEDRO RELOCATION CENTER NATIONAL HIGH SCHOOL MAIN LANGGAM CAMPUS	Grade 7-10 & Grade 11-12	Unknown	San Pedro	Laguna	Imelda Avenue, Old tenant	14.3275408	121.0195335	Masterlist 2026	t	2026-07-03 16:53:16.090394	2026-07-03 16:53:16.090394
6406	\N	San Roque NHS	SAN ROQUE NHS	Grade 7-10 & Grade 11-12	Unknown	Antipolo	Rizal	#15 Marigman Street Brgy. San Roque	14.5775039	121.1716449	Masterlist 2026	t	2026-07-03 16:53:16.090394	2026-07-03 16:53:16.090394
6407	\N	San Roque NHS, Catanauan	SAN ROQUE NHS CATANAUAN	Grade 7-10 & Grade 11-12	Unknown	Catanauan	Quezon	San Roque	13.6544744	122.3334258	Masterlist 2026	t	2026-07-03 16:53:16.090394	2026-07-03 16:53:16.090394
6408	\N	San Roque Parochial School, Inc.	SAN ROQUE PAROCHIAL SCHOOL INC	Grade 1-6, Grade 7-10 & Grade 11-12	Unknown	Caloocan	Metro Manila	Birds of Paradise St.	14.7671034	121.0582971	Masterlist 2026	t	2026-07-03 16:53:16.090394	2026-07-03 16:53:16.090394
6409	\N	San Roque-Ilaya NHS, Calauag	SAN ROQUEILAYA NHS CALAUAG	Grade 7-10 & Grade 11-12	Unknown	Calauag	Quezon	San Roque Ilaya	13.94218	122.3645949	Masterlist 2026	t	2026-07-03 16:53:16.090394	2026-07-03 16:53:16.090394
6410	\N	San Sebastian College-Recoletos - Canlubang	SAN SEBASTIAN COLLEGERECOLETOS CANLUBANG	Grade 11-12	Unknown	Calamba	Laguna	Carmelray Industrial Park 1, Canlubang, Calamba City, Laguna	14.2065266	121.0852194	Masterlist 2026	t	2026-07-03 16:53:16.090394	2026-07-03 16:53:16.090394
6411	\N	San Vicente Integrated High School	SAN VICENTE INTEGRATED HIGH SCHOOL	Grade 7-10 & Grade 11-12	Unknown	San Vicente	Palawan	Brgy. San Vicente	10.3616657	119.1158017	Masterlist 2026	t	2026-07-03 16:53:16.090394	2026-07-03 16:53:16.090394
6412	\N	San Vicente Kanluran NHS	SAN VICENTE KANLURAN NHS	Grade 7-10 & Grade 11-12	Unknown	Catanauan	Quezon	San Vicente Kanluran	13.6617281	122.2483726	Masterlist 2026	t	2026-07-03 16:53:16.090394	2026-07-03 16:53:16.090394
6413	\N	Sangley Point NHS	SANGLEY POINT NHS	Grade 7-10 & Grade 11-12	Unknown	San Antonio	Cavite	La Naval Brgy 53B Sangley Point	14.4949765	120.9114075	Masterlist 2026	t	2026-07-03 16:53:16.090394	2026-07-03 16:53:16.090394
6414	\N	Sanmandelcar National High School	SANMANDELCAR NATIONAL HIGH SCHOOL	Grade 7-10 & Grade 11-12	Unknown	Tagkawayan	Quezon	Purok Kurba	13.9803965	122.407568	Masterlist 2026	t	2026-07-03 16:53:16.090394	2026-07-03 16:53:16.090394
6415	\N	Santa Cruz Integrated National High School	SANTA CRUZ INTEGRATED NATIONAL HIGH SCHOOL	Grade 7-10 & Grade 11-12	Unknown	Santa Cruz	Laguna	Brgy. Oogong	14.2317843	121.4027574	Masterlist 2026	t	2026-07-03 16:53:16.096522	2026-07-03 16:53:16.096522
6416	\N	Santa Rosa Science and Technology High School	SANTA ROSA SCIENCE AND TECHNOLOGY HIGH SCHOOL	Grade 7-10 & Grade 11-12	Unknown	City of Santa Rosa	Laguna	JP Rizal Blvd. Market Area	14.3165701	121.1113075	Masterlist 2026	t	2026-07-03 16:53:16.096522	2026-07-03 16:53:16.096522
6417	\N	Santiago Integrated National High School	SANTIAGO INTEGRATED NATIONAL HIGH SCHOOL	Grade 7-10 & Grade 11-12	Unknown	General Trias	Cavite	-	14.3450662	120.906226	Masterlist 2026	t	2026-07-03 16:53:16.096522	2026-07-03 16:53:16.096522
6418	\N	Santiago Malvar Senior High School	SANTIAGO MALVAR SENIOR HIGH SCHOOL	Grade 11-12	Unknown	Malvar	Batangas	Barangay Santiago, Malvar, Batangas	14.0475849	121.161261	Masterlist 2026	t	2026-07-03 16:53:16.096522	2026-07-03 16:53:16.096522
6419	\N	Santisimo Rosario Integrated High School	SANTISIMO ROSARIO INTEGRATED HIGH SCHOOL	Grade 7-10 & Grade 11-12	Unknown	Dapitan City	Zamboanga del Norte	Purok Ilaya	8.5436381	123.4285179	Masterlist 2026	t	2026-07-03 16:53:16.096522	2026-07-03 16:53:16.096522
6420	\N	Sapphire International Aviation Academy	SAPPHIRE INTERNATIONAL AVIATION ACADEMY	Grade 11-12	Unknown	Tanauan City	Batangas	Brgy. Santor	14.0958344	121.1147115	Masterlist 2026	t	2026-07-03 16:53:16.096522	2026-07-03 16:53:16.096522
6421	\N	Sariaya Institute, Inc.	SARIAYA INSTITUTE INC	Grade 1-6, Grade 7-10 & Grade 11-12	Unknown	Sariaya	Quezon	Gala St	13.965148	121.525831	Masterlist 2026	t	2026-07-03 16:53:16.096522	2026-07-03 16:53:16.096522
6422	\N	Schola Angelicus, Inc.	SCHOLA ANGELICUS INC	Grade 11-12	Unknown	Quezon City	Metro Manila	NIA Road	14.6400936	121.0431085	Masterlist 2026	t	2026-07-03 16:53:16.096522	2026-07-03 16:53:16.096522
6423	\N	Science Technology Institute of Rosario Cavite, Inc.	SCIENCE TECHNOLOGY INSTITUTE OF ROSARIO CAVITE INC	Grade 7-10 & Grade 11-12	Unknown	Rosario	Cavite	Lolo polo Bldg, Gen. Trias Drive, Tejero, Rosario, Cavite	14.3991346	120.8612215	Masterlist 2026	t	2026-07-03 16:53:16.096522	2026-07-03 16:53:16.096522
6424	\N	Senior High School-Dulong Bayan	SENIOR HIGH SCHOOLDULONG BAYAN	Grade 11-12	Unknown	Bacoor	Cavite	Sarino St.	14.4495566	120.9360508	Masterlist 2026	t	2026-07-03 16:53:16.096522	2026-07-03 16:53:16.096522
6425	\N	SERVITECH INSTITUTE ASIA INC.	SERVITECH INSTITUTE ASIA INC	Grade 11-12	Unknown	San Pedro	Laguna	RJT Bldg., 162 Magsaysay Ave.,	14.3358	121.0313929	Masterlist 2026	t	2026-07-03 16:53:16.096522	2026-07-03 16:53:16.096522
6426	\N	SHS in Batangas City (Sports)	SHS IN BATANGAS CITY SPORTS	Grade 11-12	Unknown	Batangas City	Batangas	-	13.7564054	121.0583329	Masterlist 2026	t	2026-07-03 16:53:16.096522	2026-07-03 16:53:16.096522
6427	\N	SHS in San Nicholas III, Bacoor City	SHS IN SAN NICHOLAS III BACOOR CITY	Grade 11-12	Unknown	Bacoor	Cavite	Gold St.	14.4074304	120.9930338	Masterlist 2026	t	2026-07-03 16:53:16.096522	2026-07-03 16:53:16.096522
6428	\N	SHS within Bacoor Elementary School	SHS WITHIN BACOOR ELEMENTARY SCHOOL	Grade 11-12	Unknown	Bacoor	Cavite	Gen. Evangelista St.	14.4596441	120.9436265	Masterlist 2026	t	2026-07-03 16:53:16.096522	2026-07-03 16:53:16.096522
6429	\N	SHS within Canda ES	SHS WITHIN CANDA ES	Grade 11-12	Unknown	Balayan	Batangas	Canda, Balayan, Batangas	13.9639205	120.6937809	Masterlist 2026	t	2026-07-03 16:53:16.096522	2026-07-03 16:53:16.096522
6430	\N	SHS within Santol ES	SHS WITHIN SANTOL ES	Grade 11-12	Unknown	Santol	La Union	SANTOL	16.7537529	120.5048792	Masterlist 2026	t	2026-07-03 16:53:16.096522	2026-07-03 16:53:16.096522
6431	\N	SHS within Sineguelasan Elementary School	SHS WITHIN SINEGUELASAN ELEMENTARY SCHOOL	Grade 11-12	Unknown	Bacoor	Cavite	Miranda St.	14.4592479	120.9272117	Masterlist 2026	t	2026-07-03 16:53:16.096522	2026-07-03 16:53:16.096522
6432	\N	Sico 1.0 Integrated National High School	SICO 10 INTEGRATED NATIONAL HIGH SCHOOL	Grade 7-10 & Grade 11-12	Unknown	San Juan	Batangas	Sico 1.0, San Juan, Batangas	13.8278295	121.3730391	Masterlist 2026	t	2026-07-03 16:53:16.096522	2026-07-03 16:53:16.096522
6433	\N	Silangan National High School	SILANGAN NATIONAL HIGH SCHOOL	Grade 7-10 & Grade 11-12	Unknown	San Mateo	Rizal	Old Army Rd	14.6567492	121.1508317	Masterlist 2026	t	2026-07-03 16:53:16.096522	2026-07-03 16:53:16.096522
6434	\N	Silangang Malicboy NHS	SILANGANG MALICBOY NHS	Grade 7-10 & Grade 11-12	Unknown	Pagbilao	Quezon	Silangang Malicboy	13.9928444	121.7936207	Masterlist 2026	t	2026-07-03 16:53:16.096522	2026-07-03 16:53:16.096522
6435	\N	Sinalhan Integrated High School	SINALHAN INTEGRATED HIGH SCHOOL	Grade 7-10 & Grade 11-12	Unknown	City of Santa Rosa	Laguna	Purok 3, Barangay Sinalhan	14.3301113	121.1093404	Masterlist 2026	t	2026-07-03 16:53:16.096522	2026-07-03 16:53:16.096522
6436	\N	Siniloan Integrated National High School	SINILOAN INTEGRATED NATIONAL HIGH SCHOOL	Grade 7-10 & Grade 11-12	Unknown	Santa Cruz	Laguna	L. De Leon St., Siniloan, Laguna	14.2751718	121.4192576	Masterlist 2026	t	2026-07-03 16:53:16.096522	2026-07-03 16:53:16.096522
6437	\N	Sirang Lupa National High School	SIRANG LUPA NATIONAL HIGH SCHOOL	Grade 7-10 & Grade 11-12	Unknown	Calamba	Laguna	Sirang Lupa, Calamba City	14.1977069	121.095131	Masterlist 2026	t	2026-07-03 16:53:16.096522	2026-07-03 16:53:16.096522
6438	\N	Sisters of Mary of Banneux, Inc.	SISTERS OF MARY OF BANNEUX INC	Grade 7-10 & Grade 11-12	Unknown	Silang	Cavite	Biga II, Silang, Cavite	14.2602737	120.9765236	Masterlist 2026	t	2026-07-03 16:53:16.096522	2026-07-03 16:53:16.096522
6439	\N	Sisters of Mary School-Adlas, Inc.	SISTERS OF MARY SCHOOLADLAS INC	Grade 7-10 & Grade 11-12	Unknown	Silang	Cavite	Adlas, Silang, Cavite	14.2584405	120.9668068	Masterlist 2026	t	2026-07-03 16:53:16.096522	2026-07-03 16:53:16.096522
6440	\N	Skill Power Institute, Inc.	SKILL POWER INSTITUTE INC	Grade 11-12	Unknown	Antipolo	Rizal	M. L. Quezon Ave. Ext., San Roque, Antipolo City, Rizal	14.5830099	121.1757436	Masterlist 2026	t	2026-07-03 16:53:16.096522	2026-07-03 16:53:16.096522
6441	\N	South Forbes City College Corp.	SOUTH FORBES CITY COLLEGE CORP	Grade 11-12	Unknown	Silang	Cavite	Brgy. Inchican, Silang, Cavite	14.2419555	121.0436416	Masterlist 2026	t	2026-07-03 16:53:16.096522	2026-07-03 16:53:16.096522
6442	\N	Southbay Montessori School and Colleges	SOUTHBAY MONTESSORI SCHOOL AND COLLEGES	Grade 11-12	Unknown	Santa Cruz	Laguna	Sitio Huwaran, Barangay Pagsawitan, Sta. Cruz, Laguna	14.2682154	121.4236242	Masterlist 2026	t	2026-07-03 16:53:16.096522	2026-07-03 16:53:16.096522
6443	\N	Southdale International School of Sciences, Arts and Technology (formerly Imus Business and Technology College (IBTC), Inc.)	SOUTHDALE INTERNATIONAL SCHOOL OF SCIENCES ARTS AND TECHNOLOGY FORMERLY IMUS BUSINESS AND TECHNOLOGY COLLEGE IBTC INC	Grade 11-12	Unknown	Imus	Cavite	NIA Road, Brgy. Bago 2, 3rd District, City of Imus, Cavite	14.4223545	120.9233878	Masterlist 2026	t	2026-07-03 16:53:16.096522	2026-07-03 16:53:16.096522
6444	\N	Southern Luzon Academy, Inc.	SOUTHERN LUZON ACADEMY INC	Grade 7-10 & Grade 11-12	Unknown	Unspecified	Region IV-A	F. Balagtas cor. DoÃ±a Carmen De Luna Sts.	12.879721	121.774017	Masterlist 2026	t	2026-07-03 16:53:16.096522	2026-07-03 16:53:16.096522
6445	\N	Southern Luzon State University-Laboratory School	SOUTHERN LUZON STATE UNIVERSITYLABORATORY SCHOOL	Grade 7-10 & Grade 11-12	Unknown	Lucban	Quezon	Brgy. Kulapi	14.1119872	121.5623585	Masterlist 2026	t	2026-07-03 16:53:16.096522	2026-07-03 16:53:16.096522
6446	\N	Southern Philippines Institute of Science and Technology Inc.	SOUTHERN PHILIPPINES INSTITUTE OF SCIENCE AND TECHNOLOGY INC	Grade 11-12	Unknown	Imus	Cavite	Carsadang Bago II	14.4132598	120.925555	Masterlist 2026	t	2026-07-03 16:53:16.096522	2026-07-03 16:53:16.096522
6447	\N	SOUTHVILLE 5-A INTEGRATED NATIONAL HIGH SCHOOL	SOUTHVILLE 5A INTEGRATED NATIONAL HIGH SCHOOL	Grade 7-10 & Grade 11-12	Unknown	Biñan	Laguna	Southville 5-A Brgy. Langkiwa, Binan City, Laguna	14.2958913	121.0588505	Masterlist 2026	t	2026-07-03 16:53:16.096522	2026-07-03 16:53:16.096522
6448	\N	Southville 8B Senior High School	SOUTHVILLE 8B SENIOR HIGH SCHOOL	Grade 11-12	Unknown	Rodriguez	Rizal	Laylayan, Phase 4, SDouthville 8B, San Isidro Rodriguez, Rizal	14.7482967	121.1516972	Masterlist 2026	t	2026-07-03 16:53:16.096522	2026-07-03 16:53:16.096522
6449	\N	Southville I Integrated National High School	SOUTHVILLE I INTEGRATED NATIONAL HIGH SCHOOL	Grade 7-10 & Grade 11-12	Unknown	Unspecified	Region IV-A	-BLK54-55 Southville 1	12.879721	121.774017	Masterlist 2026	t	2026-07-03 16:53:16.096522	2026-07-03 16:53:16.096522
6450	\N	SPI Systems Colleges, Inc.	SPI SYSTEMS COLLEGES INC	Kinder & Grade 11-12	Unknown	Unspecified	Region IV-A	#31 M.L. Quezon Avenue Extension	12.879721	121.774017	Masterlist 2026	t	2026-07-03 16:53:16.096522	2026-07-03 16:53:16.096522
6451	\N	St. Augustine International School-BiÃ±an, Laguna	ST AUGUSTINE INTERNATIONAL SCHOOLBIA±AN LAGUNA	Grade 11-12	Unknown	Biñan	Laguna	Km 32 National Highway Canlalay, Binan Laguna	14.3355578	121.0779269	Masterlist 2026	t	2026-07-03 16:53:16.096522	2026-07-03 16:53:16.096522
6452	\N	St. Augustine School of Nursing-Lipa City	ST AUGUSTINE SCHOOL OF NURSINGLIPA CITY	Grade 11-12	Unknown	Lipa City	Batangas	JM Katigbak St. Mataas na Lupa, Lipa City Batangas	13.942108	121.1538556	Masterlist 2026	t	2026-07-03 16:53:16.096522	2026-07-03 16:53:16.096522
6453	\N	St. Augustine School of Nursing-Lucena City	ST AUGUSTINE SCHOOL OF NURSINGLUCENA CITY	Grade 11-12	Unknown	Lucena City	Quezon	Carlos City Center, M.L. Tagarao Street, corner Quezon Ave., Lucena City	13.9366418	121.6136017	Masterlist 2026	t	2026-07-03 16:53:16.096522	2026-07-03 16:53:16.096522
6454	\N	ST. BENILDE COLLEGE OF SCIENCE AND TECHNOLOGY AND ASSESSMENT CENTER (SILANG CAVITE), INC.	ST BENILDE COLLEGE OF SCIENCE AND TECHNOLOGY AND ASSESSMENT CENTER SILANG CAVITE INC	Grade 11-12	Unknown	Emilio Aguinaldo Hwy	Cavite	50 Km. Aguinaldo Hiway, Lalaan II	14.2914868	120.958642	Masterlist 2026	t	2026-07-03 16:53:16.096522	2026-07-03 16:53:16.096522
6455	\N	St. Blaise Community Academy	ST BLAISE COMMUNITY ACADEMY	Grade 7-10 & Grade 11-12	Unknown	Lemery	Batangas	R. Diokno St.	13.8763839	120.9141892	Masterlist 2026	t	2026-07-03 16:53:16.096522	2026-07-03 16:53:16.096522
6456	\N	St. Claire School of Lipa Batangas Inc.	ST CLAIRE SCHOOL OF LIPA BATANGAS INC	Grade 7-10 & Grade 11-12	Unknown	San Jose	Batangas	Aya, San Jose, Batangas	13.8922808	121.1166193	Masterlist 2026	t	2026-07-03 16:53:16.096522	2026-07-03 16:53:16.096522
6457	\N	St. Clare Community Foundation School Inc.	ST CLARE COMMUNITY FOUNDATION SCHOOL INC	Grade 7-10 & Grade 11-12	Unknown	Laurel	Batangas	Leviste, Laurel, Batangas	14.0699377	120.9382629	Masterlist 2026	t	2026-07-03 16:53:16.096522	2026-07-03 16:53:16.096522
6458	\N	St. Constantine Institute of Science and Technology Inc.	ST CONSTANTINE INSTITUTE OF SCIENCE AND TECHNOLOGY INC	Grade 11-12	Unknown	Binangonan	Rizal	National Rd. Brgy. San Carlos, Binangonan, Rizal	14.5149292	121.1667435	Masterlist 2026	t	2026-07-03 16:53:16.096522	2026-07-03 16:53:16.096522
6459	\N	ST. DOMINIC SAVIO COLLEGE	ST DOMINIC SAVIO COLLEGE	Grade 7-10 & Grade 11-12	Unknown	Ibaan	Batangas	Ibaan, Batangas	13.818625	121.1321243	Masterlist 2026	t	2026-07-03 16:53:16.096522	2026-07-03 16:53:16.096522
6460	\N	St. Edward School Foundation Inc.	ST EDWARD SCHOOL FOUNDATION INC	Grade 7-10 & Grade 11-12	Unknown	General Trias	Cavite	Kensington 23, Lancaster New City	14.3967326	120.8999407	Masterlist 2026	t	2026-07-03 16:53:16.096522	2026-07-03 16:53:16.096522
6461	\N	St. Faustina School of Guitnangbayan Inc.	ST FAUSTINA SCHOOL OF GUITNANGBAYAN INC	Grade 7-10 & Grade 11-12	Unknown	San Mateo	Rizal	13 Leal Comp.	14.690926	121.1232445	Masterlist 2026	t	2026-07-03 16:53:16.096522	2026-07-03 16:53:16.096522
6462	\N	St. Ignatius Technical Institute of Business and Arts	ST IGNATIUS TECHNICAL INSTITUTE OF BUSINESS AND ARTS	Grade 11-12	Unknown	City of Laguna	Laguna	3rd Flr., Don Francisco M. Tan Gana Bldg., Brgy. Balibago, Sta. Rosa City, Laguna	14.296318	121.1055579	Masterlist 2026	t	2026-07-03 16:53:16.096522	2026-07-03 16:53:16.096522
6464	\N	St. Ignatius Technical Institute of Business and Arts-Biñan	ST IGNATIUS TECHNICAL INSTITUTE OF BUSINESS AND ARTSBINAN	Grade 11-12	Unknown	Biñan	Laguna	Brgy. Canlalay, Biñan City, Laguna	14.34087	121.0709281	Masterlist 2026	t	2026-07-03 16:53:16.096522	2026-07-03 16:53:16.096522
6465	\N	St. Ignatius Technical Institute of Business and Arts-Cabuyao	ST IGNATIUS TECHNICAL INSTITUTE OF BUSINESS AND ARTSCABUYAO	Grade 11-12	Unknown	Calamba	Laguna	3447 National Highway, Brgy. Banaybanay, Cabuyao City, Laguna	14.2204469	121.1393586	Masterlist 2026	t	2026-07-03 16:53:16.101947	2026-07-03 16:53:16.101947
6466	\N	St. Ignatius Technical Institute of Business and Arts-Sta. Rosa	ST IGNATIUS TECHNICAL INSTITUTE OF BUSINESS AND ARTSSTA ROSA	Grade 11-12	Unknown	City of Santa Rosa	Cavite	3rd Floor, VTG Bldg., Old National Highway, Brgy. Balibago, Sta. Rosa City, Laguna	14.296318	121.1055579	Masterlist 2026	t	2026-07-03 16:53:16.101947	2026-07-03 16:53:16.101947
6467	\N	St. John Colleges	ST JOHN COLLEGES	Grade 11-12	Unknown	Calamba	Laguna	Chipeco Avenue, Calamba City, Laguna	14.2085227	121.1609716	Masterlist 2026	t	2026-07-03 16:53:16.101947	2026-07-03 16:53:16.101947
6468	\N	St. Joseph Academy	ST JOSEPH ACADEMY	Grade 11-12	Unknown	San Jose	Batangas	J. De Villa Street, Poblacion 4, San Jose, Batangas	13.8785088	121.1034848	Masterlist 2026	t	2026-07-03 16:53:16.101947	2026-07-03 16:53:16.101947
6469	\N	St. Joseph Parish School, Inc.	ST JOSEPH PARISH SCHOOL INC	Grade 11-12	Unknown	San Fernando	Pampanga	San Jose St.,	15.0391368	120.6969578	Masterlist 2026	t	2026-07-03 16:53:16.101947	2026-07-03 16:53:16.101947
6470	\N	St. Joseph's High School	ST JOSEPH'S HIGH SCHOOL	Grade 7-10 & Grade 11-12	Unknown	Unspecified	Region IV-A	Sosing M. Tan	12.879721	121.774017	Masterlist 2026	t	2026-07-03 16:53:16.101947	2026-07-03 16:53:16.101947
6471	\N	St. Jude College DasmariÃ±as Cavite, Inc.	ST JUDE COLLEGE DASMARIA±AS CAVITE INC	Grade 11-12	Unknown	Dasmariñas	Cavite	URC Ave. Salawag, Salitran, DasmariÃ±as City, Cavite	14.3496214	120.9447591	Masterlist 2026	t	2026-07-03 16:53:16.101947	2026-07-03 16:53:16.101947
6472	\N	St. Lawrence Academy Foundation	ST LAWRENCE ACADEMY FOUNDATION	Grade 7-10 & Grade 11-12	Unknown	San Lorenzo	Guimaras	San Lorenzo	10.6045773	122.6842498	Masterlist 2026	t	2026-07-03 16:53:16.101947	2026-07-03 16:53:16.101947
6473	\N	St. Louis Anne Colleges of San Pedro	ST LOUIS ANNE COLLEGES OF SAN PEDRO	Grade 11-12	Unknown	San Pedro	Laguna	Old National Highway, Brgy. Nueva, San Pedro City, Laguna	14.3547315	121.0615048	Masterlist 2026	t	2026-07-03 16:53:16.101947	2026-07-03 16:53:16.101947
6474	\N	St. Mary Magdalene Colleges of Laguna	ST MARY MAGDALENE COLLEGES OF LAGUNA	Grade 11-12	Unknown	Calamba	Laguna	Brgy. Uwisan, Calamba City, Laguna	14.2313922	121.171633	Masterlist 2026	t	2026-07-03 16:53:16.101947	2026-07-03 16:53:16.101947
6476	\N	St. Mary's Academy of Nagcarlan Laguna, Inc.	ST MARY'S ACADEMY OF NAGCARLAN LAGUNA INC	Grade 7-10 & Grade 11-12	Unknown	Nagcarlan	Laguna	035 Banahaw St.	14.1367907	121.4177854	Masterlist 2026	t	2026-07-03 16:53:16.101947	2026-07-03 16:53:16.101947
6477	\N	ST. MARYS ACADEMY OF TECHNOLOGY LUCENA INC.	ST MARYS ACADEMY OF TECHNOLOGY LUCENA INC	Grade 11-12	Unknown	Lucena City	Quezon	2/F G.L.T. Bldg. 118 Merchan St. or. Cabana St., Barangay 4	13.9370368	121.6141513	Masterlist 2026	t	2026-07-03 16:53:16.101947	2026-07-03 16:53:16.101947
6478	\N	St. Michael TVET Training and Assessment Center Inc.	ST MICHAEL TVET TRAINING AND ASSESSMENT CENTER INC	Grade 11-12	Unknown	Lucena City	Quezon	3rd Flr., Pagkatipunan Bldg., Profugo corner Merchant St.	13.9349828	121.6140879	Masterlist 2026	t	2026-07-03 16:53:16.101947	2026-07-03 16:53:16.101947
6479	\N	St. Peregrine Institute	ST PEREGRINE INSTITUTE	Grade 11-12	Unknown	Bacoor	Cavite	144 Gen.Evangelista St.	14.4547557	120.9297714	Masterlist 2026	t	2026-07-03 16:53:16.101947	2026-07-03 16:53:16.101947
6480	\N	St. Peter's College Seminary	ST PETER'S COLLEGE SEMINARY	Grade 11-12	Unknown	San Pablo City	Laguna	Werner Schetelig Ave, San Pablo City, Laguna	14.0738492	121.3353437	Masterlist 2026	t	2026-07-03 16:53:16.101947	2026-07-03 16:53:16.101947
6481	\N	St. Raphael College of Business and Arts Inc.	ST RAPHAEL COLLEGE OF BUSINESS AND ARTS INC	Grade 7-10 & Grade 11-12	Unknown	Real	Quezon	M.L. Quezon Ave.	14.6630822	121.6041411	Masterlist 2026	t	2026-07-03 16:53:16.101947	2026-07-03 16:53:16.101947
6482	\N	St. Simon Montessori	ST SIMON MONTESSORI	Grade 11-12	Unknown	Calamba	Laguna	National Road Brgy. Crossing, Calamba City, Laguna	14.2047396	121.1550445	Masterlist 2026	t	2026-07-03 16:53:16.101947	2026-07-03 16:53:16.101947
6483	\N	St. Therese College of Arts and Sciences	ST THERESE COLLEGE OF ARTS AND SCIENCES	Grade 11-12	Unknown	Pila	Laguna	Brgy. Bulihan Sur, Pila, Laguna	14.2329783	121.3676204	Masterlist 2026	t	2026-07-03 16:53:16.101947	2026-07-03 16:53:16.101947
6484	\N	St. Thomas Academy	ST THOMAS ACADEMY	Grade 7-10 & Grade 11-12	Unknown	Pasuquin	Ilocos Norte	Poblacion 3	18.3309448	120.6149556	Masterlist 2026	t	2026-07-03 16:53:16.101947	2026-07-03 16:53:16.101947
6485	\N	St. Valens College of Business and Arts	ST VALENS COLLEGE OF BUSINESS AND ARTS	Grade 11-12	Unknown	Unspecified	Region IV-A	J.P. Rizal	12.879721	121.774017	Masterlist 2026	t	2026-07-03 16:53:16.101947	2026-07-03 16:53:16.101947
6486	\N	St. Vincent College of Cabuyao	ST VINCENT COLLEGE OF CABUYAO	Grade 11-12	Unknown	Cabuyao City	Laguna	#54 Mamatid, Cabuyao City, Laguna	14.2328407	121.1484987	Masterlist 2026	t	2026-07-03 16:53:16.101947	2026-07-03 16:53:16.101947
6487	\N	Sta. Catalina College	STA CATALINA COLLEGE	Grade 11-12	Unknown	Binalonan	Pangasinan	Sta. Catalina	16.0893669	120.6142365	Masterlist 2026	t	2026-07-03 16:53:16.101947	2026-07-03 16:53:16.101947
6488	\N	Sta. Catalina Integrated National High School	STA CATALINA INTEGRATED NATIONAL HIGH SCHOOL	Grade 7-10 & Grade 11-12	Unknown	Majayjay	Laguna	M. H. Del Pilar St. Brgy. San Miguel Majayjay, Laguna	14.1422051	121.4700442	Masterlist 2026	t	2026-07-03 16:53:16.101947	2026-07-03 16:53:16.101947
6489	\N	Sta. Catalina National High School	STA CATALINA NATIONAL HIGH SCHOOL	Grade 7-10 & Grade 11-12	Unknown	Candelaria	Quezon	Sta. Catalina Sur	13.8740768	121.4300828	Masterlist 2026	t	2026-07-03 16:53:16.101947	2026-07-03 16:53:16.101947
6490	\N	Sta. Clara Integrated National High School	STA CLARA INTEGRATED NATIONAL HIGH SCHOOL	Grade 7-10 & Grade 11-12	Unknown	Santo Tomas	Batangas	Sta. Clara, Sto. Tomas City, Batangas	14.0240989	121.2038933	Masterlist 2026	t	2026-07-03 16:53:16.101947	2026-07-03 16:53:16.101947
6491	\N	STA. CRUZ NATIONAL HIGH SCHOOL	STA CRUZ NATIONAL HIGH SCHOOL	Grade 7-10 & Grade 11-12	Unknown	Lubao	Pampanga	Sta. Cruz	14.9049418	120.5574768	Masterlist 2026	t	2026-07-03 16:53:16.101947	2026-07-03 16:53:16.101947
6492	\N	Sta. Ines National High School	STA INES NATIONAL HIGH SCHOOL	Grade 7-10 & Grade 11-12	Unknown	Santa Ignacia	Tarlac	Estefania St.	15.5664881	120.490967	Masterlist 2026	t	2026-07-03 16:53:16.101947	2026-07-03 16:53:16.101947
6493	\N	Sta. Lucia NHS (Formerly Dagatan NHS Annex - Sta. Lucia)	STA LUCIA NHS FORMERLY DAGATAN NHS ANNEX STA LUCIA	Grade 7-10 & Grade 11-12	Unknown	Balete	Batangas	Sitio Balete	14.0091974	121.1080244	Masterlist 2026	t	2026-07-03 16:53:16.101947	2026-07-03 16:53:16.101947
6494	\N	Sta. Maria Integrated High School	STA MARIA INTEGRATED HIGH SCHOOL	Grade 7-10 & Grade 11-12	Unknown	Santa Maria	Laguna	NUSEDELA St.	14.4686973	121.4242789	Masterlist 2026	t	2026-07-03 16:53:16.101947	2026-07-03 16:53:16.101947
6495	\N	Sta. Teresita National High School	STA TERESITA NATIONAL HIGH SCHOOL	Grade 7-10 & Grade 11-12	Unknown	Santa Teresita	Batangas	Bihis, Sta. Teresita, Batangas	13.8800418	120.9657247	Masterlist 2026	t	2026-07-03 16:53:16.101947	2026-07-03 16:53:16.101947
6496	\N	Stand Alone SHS No. 14 Santa Maria	STAND ALONE SHS NO 14 SANTA MARIA	Grade 11-12	Unknown	Santa Maria	Laguna	Brgy.Calangay Santa Maria Laguna	14.5106223	121.407224	Masterlist 2026	t	2026-07-03 16:53:16.101947	2026-07-03 16:53:16.101947
6497	\N	Stand Alone SHS No. 21 Papatahan	STAND ALONE SHS NO 21 PAPATAHAN	Grade 11-12	Unknown	Paete	Laguna	Sitio Papatahan	14.3648125	121.5514531	Masterlist 2026	t	2026-07-03 16:53:16.101947	2026-07-03 16:53:16.101947
6498	\N	STANFORD ASIA COLLEGE INC.	STANFORD ASIA COLLEGE INC	Grade 11-12	Unknown	Cabuyao City	Laguna	Brgy. Tres	14.2746314	121.1247067	Masterlist 2026	t	2026-07-03 16:53:16.101947	2026-07-03 16:53:16.101947
6499	\N	STI College - Bacoor	STI COLLEGE BACOOR	Grade 11-12	Unknown	Bacoor	Cavite	Panapaan IV	14.445654	120.9523078	Masterlist 2026	t	2026-07-03 16:53:16.101947	2026-07-03 16:53:16.101947
6500	\N	STI College - Balayan	STI COLLEGE BALAYAN	Grade 11-12	Unknown	Balayan	Batangas	PED Plaza Business Center, Brgy. Ermita, Balayan, Batangas	13.9454719	120.7304724	Masterlist 2026	t	2026-07-03 16:53:16.101947	2026-07-03 16:53:16.101947
6501	\N	STI College - Batangas	STI COLLEGE BATANGAS	Grade 11-12	Unknown	Batangas City	Batangas	Kumintang Ibaba, Batangas City	13.7659177	121.065041	Masterlist 2026	t	2026-07-03 16:53:16.101947	2026-07-03 16:53:16.101947
6502	\N	STI College - Calamba	STI COLLEGE CALAMBA	Grade 11-12	Unknown	Calamba	Laguna	Bgry. Uno, National Highway, Calamba City, Laguna	14.2204469	121.1393586	Masterlist 2026	t	2026-07-03 16:53:16.101947	2026-07-03 16:53:16.101947
6503	\N	STI College - Lipa	STI COLLEGE LIPA	Grade 11-12	Unknown	Lipa City	Batangas	C.M. Recto Ave.,Barangay 6 Lipa City	13.9414441	121.1633015	Masterlist 2026	t	2026-07-03 16:53:16.101947	2026-07-03 16:53:16.101947
6504	\N	STI College - Ortigas - Cainta	STI COLLEGE ORTIGAS CAINTA	Grade 11-12	Unknown	Cainta	Rizal	STI Academic Center, Ortigas Avenue Extension, Cainta, Rizal	14.5822746	121.1260222	Masterlist 2026	t	2026-07-03 16:53:16.101947	2026-07-03 16:53:16.101947
6505	\N	STI College - Southwoods	STI COLLEGE SOUTHWOODS	Grade 11-12	Unknown	Carmona	Cavite	Lot 2A, Maduya, Carmona, Cavite	14.3232774	121.0624389	Masterlist 2026	t	2026-07-03 16:53:16.101947	2026-07-03 16:53:16.101947
6507	\N	STI College - Tagaytay	STI COLLEGE TAGAYTAY	Grade 11-12	Unknown	Tagaytay City	Cavite	Frablyn Centrum Tower, Tagaytay Rotonda, Aguinaldo Highway, Tagaytay City	14.1162393	120.9620917	Masterlist 2026	t	2026-07-03 16:53:16.101947	2026-07-03 16:53:16.101947
6508	\N	STI College - Tanauan	STI COLLEGE TANAUAN	Grade 11-12	Unknown	Tanauan City	Batangas	#5 Mabini Ave., Tanauan, Batangas	14.0838742	121.1454309	Masterlist 2026	t	2026-07-03 16:53:16.101947	2026-07-03 16:53:16.101947
6509	\N	STI College - Tanay	STI COLLEGE TANAY	Grade 11-12	Unknown	Tanay	Rizal	Manila East Road, Barangay Tandang Kutyo, Tanay, Rizal	14.5083926	121.2875536	Masterlist 2026	t	2026-07-03 16:53:16.101947	2026-07-03 16:53:16.101947
6511	\N	STI COLLEGE DASMARIÃ‘AS, INC.	STI COLLEGE DASMARIA‘AS INC	Grade 11-12	Unknown	Dasmariñas	Cavite	STI BLDG. N. GUEVARRA ST. ZONE 1 DASMARIÃ‘AS CITY, CAVITE	14.3301492	120.9363174	Masterlist 2026	t	2026-07-03 16:53:16.101947	2026-07-03 16:53:16.101947
6512	\N	STI College Rosario, Cavite, Inc.	STI COLLEGE ROSARIO CAVITE INC	Grade 11-12	Unknown	Rosario	Cavite	STI Academic Center, Gen. Trias Drive Tejero, Rosario, Cavite	14.4075076	120.8586648	Masterlist 2026	t	2026-07-03 16:53:16.101947	2026-07-03 16:53:16.101947
6513	\N	STI College San Pablo	STI COLLEGE SAN PABLO	Grade 11-12	Unknown	San Pablo City	Laguna	Lopez Jaena St., San Pablo City, Laguna	14.0695979	121.3234623	Masterlist 2026	t	2026-07-03 16:53:16.101947	2026-07-03 16:53:16.101947
6515	\N	STI College Santa Rosa	STI COLLEGE SANTA ROSA	Grade 11-12	Unknown	City of Santa Rosa	Laguna	STI Academic Center, Ruby St., Brgy. Balibago, Sta. Rosa City, Laguna	14.2951067	121.1038117	Masterlist 2026	t	2026-07-03 16:53:16.107439	2026-07-03 16:53:16.107439
6518	\N	STI EDUCATION SERVICES GROUP, INC. - LUCENA	STI EDUCATION SERVICES GROUP INC LUCENA	Grade 11-12	Unknown	Lucena City	Quezon	Quezon Ave Cor Perez St.	13.9297924	121.6127395	Masterlist 2026	t	2026-07-03 16:53:16.107439	2026-07-03 16:53:16.107439
6519	\N	Sto. Angel National High School	STO ANGEL NATIONAL HIGH SCHOOL	Grade 7-10 & Grade 11-12	Unknown	San Pablo City	Laguna	Sto. Angel	14.1022908	121.3625197	Masterlist 2026	t	2026-07-03 16:53:16.107439	2026-07-03 16:53:16.107439
6520	\N	Sto. Domingo Integrated School	STO DOMINGO INTEGRATED SCHOOL	Grade 7-10 & Grade 11-12	Unknown	City of Santa Rosa	Laguna	Sto. Domingo, sta. Rosa city laguna	14.2276652	121.0479444	Masterlist 2026	t	2026-07-03 16:53:16.107439	2026-07-03 16:53:16.107439
6521	\N	Sto. Domingo NHS	STO DOMINGO NHS	Grade 7-10 & Grade 11-12	Unknown	Talavera	Nueva Ecija	Km 234 Maharlika Highway	15.6971447	120.8986775	Masterlist 2026	t	2026-07-03 16:53:16.107439	2026-07-03 16:53:16.107439
6522	\N	Sto. NiÃ±o Formation and Science School-Day Class	STO NIA±O FORMATION AND SCIENCE SCHOOLDAY CLASS	Grade 11-12	Unknown	Rosario	Batangas	J. Belen St., San Roque, Rosario, Batangas	13.8503559	121.2042195	Masterlist 2026	t	2026-07-03 16:53:16.107439	2026-07-03 16:53:16.107439
6523	\N	Sto. NiÃ±o Formation and Science School-Night Class	STO NIA±O FORMATION AND SCIENCE SCHOOLNIGHT CLASS	Grade 11-12	Unknown	Rosario	Batangas	J. Belen St., San Roque, Rosario, Batangas	13.8503559	121.2042195	Masterlist 2026	t	2026-07-03 16:53:16.107439	2026-07-03 16:53:16.107439
6524	\N	Sto. NiÃ±o National High School (Formerly Pagsangahan NHS Ext. Sto. NiÃ±o)	STO NIA±O NATIONAL HIGH SCHOOL FORMERLY PAGSANGAHAN NHS EXT STO NIA±O	Grade 7-10 & Grade 11-12	Unknown	Presentacion	Camarines Sur	Sto. NiÃ±o	13.7730916	123.7489785	Masterlist 2026	t	2026-07-03 16:53:16.107439	2026-07-03 16:53:16.107439
6525	\N	Sto. Nino Ilaya NHS (Formerly San Francisco B NHS Sto. NiÃƒÂ±o Ilaya Ext.)	STO NINO ILAYA NHS FORMERLY SAN FRANCISCO B NHS STO NIAƑA±O ILAYA EXT	Grade 7-10 & Grade 11-12	Unknown	Lopez	Quezon	Sto. NiÃ±o Ilaya	13.7754577	122.3050823	Masterlist 2026	t	2026-07-03 16:53:16.107439	2026-07-03 16:53:16.107439
6526	\N	Sto. Nino Integrated School	STO NINO INTEGRATED SCHOOL	Grade 7-10 & Grade 11-12	Unknown	Quezon City	Metro Manila	Sampaguita St.	14.6899057	121.0701992	Masterlist 2026	t	2026-07-03 16:53:16.107439	2026-07-03 16:53:16.107439
6527	\N	Sto. Tomas Integrated High School	STO TOMAS INTEGRATED HIGH SCHOOL	Grade 7-10 & Grade 11-12	Unknown	Calauan	Laguna	Lot 1, Block 32, Southville 7 NHA, Site 3 Brgy. Sto. Tomas, Calauan, Laguna	14.1681956	121.3489805	Masterlist 2026	t	2026-07-03 16:53:16.107439	2026-07-03 16:53:16.107439
6528	\N	Sto. Tomas Senior High School	STO TOMAS SENIOR HIGH SCHOOL	Grade 11-12	Unknown	Santo Tomas	Batangas	San Miguel, Sto. Tomas City, Batangas	14.0945305	121.1621665	Masterlist 2026	t	2026-07-03 16:53:16.107439	2026-07-03 16:53:16.107439
6529	\N	SUBSIDIZED TECHNICAL EDUCATION PROGRAM (STEP), INC.	SUBSIDIZED TECHNICAL EDUCATION PROGRAM STEP INC	Grade 11-12	Unknown	Calamba	Laguna	Lot 14 Borja Subdivision, National Highway, Parian, Calamba City	14.2119796	121.1528901	Masterlist 2026	t	2026-07-03 16:53:16.107439	2026-07-03 16:53:16.107439
6530	\N	SUMULONG COLLEGE OF ARTS AND SCIENCES, INC.	SUMULONG COLLEGE OF ARTS AND SCIENCES INC	Grade 11-12	Unknown	Antipolo	Rizal	Ligtasan Road, Brgy. San Roque, Antipolo City	14.5755584	121.1776843	Masterlist 2026	t	2026-07-03 16:53:16.107439	2026-07-03 16:53:16.107439
6531	\N	Sumulong Memorial High School	SUMULONG MEMORIAL HIGH SCHOOL	Grade 7-10 & Grade 11-12	Unknown	Antipolo	Rizal	Gen. Luna Street	14.5863966	121.173097	Masterlist 2026	t	2026-07-03 16:53:16.107439	2026-07-03 16:53:16.107439
6532	\N	Taal Senior High School	TAAL SENIOR HIGH SCHOOL	Grade 11-12	Unknown	Taal	Batangas	G. Marella Street	13.8817336	120.924646	Masterlist 2026	t	2026-07-03 16:53:16.107439	2026-07-03 16:53:16.107439
6533	\N	Tabangao Integrated School	TABANGAO INTEGRATED SCHOOL	Grade 7-10 & Grade 11-12	Unknown	Batangas City	Batangas	Tabangao	13.7149208	121.0624171	Masterlist 2026	t	2026-07-03 16:53:16.107439	2026-07-03 16:53:16.107439
6534	\N	Tabason NHS	TABASON NHS	Grade 7-10 & Grade 11-12	Unknown	Tagkawayan	Quezon	Tabason	14.0368254	122.531617	Masterlist 2026	t	2026-07-03 16:53:16.107439	2026-07-03 16:53:16.107439
6535	\N	Tagaytay City National High School - Integrated Senior High School	TAGAYTAY CITY NATIONAL HIGH SCHOOL INTEGRATED SENIOR HIGH SCHOOL	Grade 7-10 & Grade 11-12	Unknown	Tagaytay City	Cavite	Mayor's Drive Mendez Crossing East	14.1024382	120.9240204	Masterlist 2026	t	2026-07-03 16:53:16.107439	2026-07-03 16:53:16.107439
6536	\N	Tagaytay City Science National High School - Integrated Senior High School	TAGAYTAY CITY SCIENCE NATIONAL HIGH SCHOOL INTEGRATED SENIOR HIGH SCHOOL	Grade 7-10 & Grade 11-12	Unknown	Tagaytay City	Cavite	Sungay West	14.1254789	120.9849322	Masterlist 2026	t	2026-07-03 16:53:16.107439	2026-07-03 16:53:16.107439
6537	\N	Tagaytay-Mendez Academy INC.	TAGAYTAYMENDEZ ACADEMY INC	Grade 7-10 & Grade 11-12	Unknown	Mendez	Cavite	J.P. Rizal St., Galicia II, Mendez, Cavite	14.1266078	120.9059066	Masterlist 2026	t	2026-07-03 16:53:16.107439	2026-07-03 16:53:16.107439
6538	\N	Tagkawayan NHS	TAGKAWAYAN NHS	Grade 7-10 & Grade 11-12	Unknown	Tagkawayan	Quezon	Barangay Munting Parang	13.9684084	122.5625049	Masterlist 2026	t	2026-07-03 16:53:16.107439	2026-07-03 16:53:16.107439
6539	\N	Tala Senior High School	TALA SENIOR HIGH SCHOOL	Grade 11-12	Unknown	Nasugbu	Batangas	Tala, Munting Indang, Nasugbu, Batangas	14.0929546	120.6972065	Masterlist 2026	t	2026-07-03 16:53:16.107439	2026-07-03 16:53:16.107439
6540	\N	Talahib Pandayan Integrated High School	TALAHIB PANDAYAN INTEGRATED HIGH SCHOOL	Grade 7-10 & Grade 11-12	Unknown	Batangas City	Batangas	Talahib Pandayan	13.6637665	121.1538564	Masterlist 2026	t	2026-07-03 16:53:16.107439	2026-07-03 16:53:16.107439
6541	\N	Talangan Integrated National High School	TALANGAN INTEGRATED NATIONAL HIGH SCHOOL	Grade 7-10 & Grade 11-12	Unknown	Nagcarlan	Laguna	Brgy. Talangan	14.1411098	121.4131727	Masterlist 2026	t	2026-07-03 16:53:16.107439	2026-07-03 16:53:16.107439
6542	\N	Talim Point National High School	TALIM POINT NATIONAL HIGH SCHOOL	Grade 7-10 & Grade 11-12	Unknown	Binangonan	Rizal	Brgy. Rayap, Talim Pt.	14.296399	121.2356177	Masterlist 2026	t	2026-07-03 16:53:16.107439	2026-07-03 16:53:16.107439
6543	\N	Talipan National High School	TALIPAN NATIONAL HIGH SCHOOL	Grade 7-10 & Grade 11-12	Unknown	Bayan ng Quezon	Quezon	Sitio Fori	13.9643171	121.6564758	Masterlist 2026	t	2026-07-03 16:53:16.107439	2026-07-03 16:53:16.107439
6544	\N	Talisay High School,Inc.	TALISAY HIGH SCHOOLINC	Grade 7-10 & Grade 11-12	Unknown	Talisay	Batangas	Gen.A. Laurel Street, Zone 6	14.0928479	121.0216641	Masterlist 2026	t	2026-07-03 16:53:16.107439	2026-07-03 16:53:16.107439
6545	\N	Talisay Integrated School	TALISAY INTEGRATED SCHOOL	Grade 7-10 & Grade 11-12	Unknown	Tiaong	Quezon	Sitio De Gorio	13.9581334	121.3563176	Masterlist 2026	t	2026-07-03 16:53:16.107439	2026-07-03 16:53:16.107439
6546	\N	Talisay Polytechnic Institute	TALISAY POLYTECHNIC INSTITUTE	Grade 7-10 & Grade 11-12	Unknown	Talisay	Batangas	Banga, Talisay, Batangas	14.092921	121.0157646	Masterlist 2026	t	2026-07-03 16:53:16.107439	2026-07-03 16:53:16.107439
6547	\N	Talisay Senior High School	TALISAY SENIOR HIGH SCHOOL	Grade 11-12	Unknown	Talisay	Batangas	Tumaway, Talisay, Batangas	14.0924763	121.0281416	Masterlist 2026	t	2026-07-03 16:53:16.107439	2026-07-03 16:53:16.107439
6548	\N	Talon Integrated School	TALON INTEGRATED SCHOOL	Grade 7-10 & Grade 11-12	Unknown	Amadeo	Cavite	Sitio Matagbak	14.1407736	120.9429826	Masterlist 2026	t	2026-07-03 16:53:16.107439	2026-07-03 16:53:16.107439
6549	\N	Talumpok Integrated School	TALUMPOK INTEGRATED SCHOOL	Grade 7-10 & Grade 11-12	Unknown	Batangas City	Batangas	Talumpok	13.7342081	121.1452643	Masterlist 2026	t	2026-07-03 16:53:16.107439	2026-07-03 16:53:16.107439
6550	\N	Taluong NHS	TALUONG NHS	Grade 7-10 & Grade 11-12	Unknown	Polillo	Quezon	Taluong	14.8559382	121.8904136	Masterlist 2026	t	2026-07-03 16:53:16.107439	2026-07-03 16:53:16.107439
6551	\N	Tanauan City College	TANAUAN CITY COLLEGE	Grade 11-12	Unknown	Tanauan City	Batangas	Trapiche 1, Tanauan City, Batangas	14.087737	121.1451053	Masterlist 2026	t	2026-07-03 16:53:16.107439	2026-07-03 16:53:16.107439
6552	\N	Tanauan City Integrated High School	TANAUAN CITY INTEGRATED HIGH SCHOOL	Grade 7-10 & Grade 11-12	Unknown	Tanauan City	Batangas	Trapiche 1, Tanauan City, Batangas	14.0875093	121.1446993	Masterlist 2026	t	2026-07-03 16:53:16.107439	2026-07-03 16:53:16.107439
6553	\N	Tanauan School of Fisheries	TANAUAN SCHOOL OF FISHERIES	Grade 7-10 & Grade 11-12	Unknown	Tanauan City	Batangas	Ambulong, Tanauan City, Batangas	14.087284	121.0645036	Masterlist 2026	t	2026-07-03 16:53:16.107439	2026-07-03 16:53:16.107439
6554	\N	Tanay East National High School	TANAY EAST NATIONAL HIGH SCHOOL	Grade 7-10 & Grade 11-12	Unknown	Tanay	Rizal	Sitio Waray	14.5246844	121.3281155	Masterlist 2026	t	2026-07-03 16:53:16.107439	2026-07-03 16:53:16.107439
6555	\N	Tanay Sampaloc Integrated National High School	TANAY SAMPALOC INTEGRATED NATIONAL HIGH SCHOOL	Grade 7-10 & Grade 11-12	Unknown	Tanay	Rizal	Signal VIllage, Sampaloc, Tanay Rizal	14.534888	121.360098	Masterlist 2026	t	2026-07-03 16:53:16.107439	2026-07-03 16:53:16.107439
6556	\N	Tanay Senior High School	TANAY SENIOR HIGH SCHOOL	Grade 11-12	Unknown	Tanay	Rizal	Pantay Pinugay Road Sitio Dalawang Kawayan Brgy. Tandang Kutyo Tanay, Rizal	14.5195463	121.2939857	Masterlist 2026	t	2026-07-03 16:53:16.107439	2026-07-03 16:53:16.107439
6557	\N	Tanay West Integrated National High School	TANAY WEST INTEGRATED NATIONAL HIGH SCHOOL	Grade 7-10 & Grade 11-12	Unknown	Tanay	Rizal	Gregorio Trinidad St.	14.614188	121.3770336	Masterlist 2026	t	2026-07-03 16:53:16.107439	2026-07-03 16:53:16.107439
6558	\N	Tanza National Comprehensive High School	TANZA NATIONAL COMPREHENSIVE HIGH SCHOOL	Grade 7-10 & Grade 11-12	Unknown	Tanza	Cavite	Daang Amaya II, Tanza, Cavite	14.3962772	120.8536267	Masterlist 2026	t	2026-07-03 16:53:16.107439	2026-07-03 16:53:16.107439
6559	\N	Tanza National Trade School	TANZA NATIONAL TRADE SCHOOL	Grade 7-10 & Grade 11-12	Unknown	Tanza	Cavite	Paradahan 1, Tanza, Cavite	14.3186466	120.8601173	Masterlist 2026	t	2026-07-03 16:53:16.107439	2026-07-03 16:53:16.107439
6560	\N	Taysan San Jose Integrated National High School	TAYSAN SAN JOSE INTEGRATED NATIONAL HIGH SCHOOL	Grade 7-10 & Grade 11-12	Unknown	San Jose	Batangas	Taysan, San Jose, Batangas	13.8835468	121.0985947	Masterlist 2026	t	2026-07-03 16:53:16.107439	2026-07-03 16:53:16.107439
6561	\N	Taysan Senior High School	TAYSAN SENIOR HIGH SCHOOL	Grade 11-12	Unknown	Taysan	Batangas	Mahanadiong, Taysan, Batangas	13.793105	121.1920632	Masterlist 2026	t	2026-07-03 16:53:16.107439	2026-07-03 16:53:16.107439
6562	\N	Taytay Integrated School	TAYTAY INTEGRATED SCHOOL	Grade 7-10 & Grade 11-12	Unknown	Taytay	Rizal	Zloty St., Meralco Village	14.5528807	121.125706	Masterlist 2026	t	2026-07-03 16:53:16.107439	2026-07-03 16:53:16.107439
6563	\N	Taytay Senior High School	TAYTAY SENIOR HIGH SCHOOL	Grade 11-12	Unknown	Taytay	Rizal	#21 Binhing Pag-Asa St. Bgy. Dolores, Taytay, Rizal	14.5671648	121.1335806	Masterlist 2026	t	2026-07-03 16:53:16.107439	2026-07-03 16:53:16.107439
6564	\N	Technological University of the Philippines-Cavite	TECHNOLOGICAL UNIVERSITY OF THE PHILIPPINESCAVITE	Grade 11-12	Unknown	Dasmariñas	Cavite	CQT Ave., Salawag, City of DasmariÃ±as, Cavite	14.3450539	120.9661019	Masterlist 2026	t	2026-07-03 16:53:16.107439	2026-07-03 16:53:16.107439
6565	\N	TEKSQUAD Institute of Information Technology, Inc.	TEKSQUAD INSTITUTE OF INFORMATION TECHNOLOGY INC	Grade 11-12	Unknown	Antipolo	Rizal	3/F Gatsby Bldg., M.L. Quezon St.,	14.5868729	121.175657	Masterlist 2026	t	2026-07-03 16:53:16.11322	2026-07-03 16:53:16.11322
6566	\N	Teodoro M. Luansing College of Rosario	TEODORO M LUANSING COLLEGE OF ROSARIO	Grade 11-12	Unknown	Rosario	Batangas	National Road	13.8446025	121.200241	Masterlist 2026	t	2026-07-03 16:53:16.11322	2026-07-03 16:53:16.11322
6567	\N	Teresa National High School	TERESA NATIONAL HIGH SCHOOL	Grade 7-10 & Grade 11-12	Unknown	Teresa	Rizal	Corazon Aquino Ave Bagumbayan, Teresa, Rizal	14.5499059	121.2191067	Masterlist 2026	t	2026-07-03 16:53:16.11322	2026-07-03 16:53:16.11322
6568	\N	Ternate Integrated National High School	TERNATE INTEGRATED NATIONAL HIGH SCHOOL	Grade 7-10 & Grade 11-12	Unknown	Ternate	Cavite	H. Ventura St.	14.2846765	120.7192856	Masterlist 2026	t	2026-07-03 16:53:16.11322	2026-07-03 16:53:16.11322
6569	\N	Ternate West National High School	TERNATE WEST NATIONAL HIGH SCHOOL	Grade 7-10 & Grade 11-12	Unknown	Ternate	Cavite	Sitio Kasulog	14.2837447	120.7087103	Masterlist 2026	t	2026-07-03 16:53:16.11322	2026-07-03 16:53:16.11322
6570	\N	The Beacon Academy, Inc.	THE BEACON ACADEMY INC	Grade 7-10 & Grade 11-12	Unknown	Biñan	Laguna	Cecilia Araneta Parkway	14.2549593	121.0378225	Masterlist 2026	t	2026-07-03 16:53:16.11322	2026-07-03 16:53:16.11322
6571	\N	The Bearer of Light and Wisdom Colleges-(Main)	THE BEARER OF LIGHT AND WISDOM COLLEGESMAIN	Grade 7-10 & Grade 11-12	Unknown	Bacoor	Cavite	#403 Bee Bien Bldg. Molino 1 Bacoor, Cavite	14.4188275	120.9748467	Masterlist 2026	t	2026-07-03 16:53:16.11322	2026-07-03 16:53:16.11322
6573	\N	The First Uniting Christian College	THE FIRST UNITING CHRISTIAN COLLEGE	Grade 11-12	Unknown	Dasmariñas	Cavite	Block 23 Lot 15 Bahamas St., Greenbreeze Subd., Lancaan 2, Dasmarinas, Cavite	14.3081946	120.9337449	Masterlist 2026	t	2026-07-03 16:53:16.11322	2026-07-03 16:53:16.11322
6574	\N	The Philippine Women's University, Career Development and Continuing Education Center Sta. Cruz, Laguna, Inc.	THE PHILIPPINE WOMEN'S UNIVERSITY CAREER DEVELOPMENT AND CONTINUING EDUCATION CENTER STA CRUZ LAGUNA INC	Grade 11-12	Unknown	Santa Cruz	Laguna	M.H. Del Pilar St.	14.2816089	121.4157125	Masterlist 2026	t	2026-07-03 16:53:16.11322	2026-07-03 16:53:16.11322
6575	\N	The Power of Faith Christian Life Academy	THE POWER OF FAITH CHRISTIAN LIFE ACADEMY	Grade 11-12	Unknown	Bacoor	Cavite	678 Compound Mambog-Bayanan, Bacoor, Cavite	14.4234707	120.9651043	Masterlist 2026	t	2026-07-03 16:53:16.11322	2026-07-03 16:53:16.11322
6576	\N	THE RAYA SCHOOL, INC.	THE RAYA SCHOOL INC	Grade 11-12	Unknown	Calbayog	Samar	Km. 53 Pan Philippine Highway	12.1856365	124.4078297	Masterlist 2026	t	2026-07-03 16:53:16.11322	2026-07-03 16:53:16.11322
6577	\N	Tinga Sorosoro  Integrated School	TINGA SOROSORO INTEGRATED SCHOOL	Grade 7-10 & Grade 11-12	Unknown	Batangas City	Batangas	Sorosoro Ibaba	13.8076867	121.0893499	Masterlist 2026	t	2026-07-03 16:53:16.11322	2026-07-03 16:53:16.11322
6578	\N	Tingloy Senior High School	TINGLOY SENIOR HIGH SCHOOL	Grade 11-12	Unknown	Tingloy	Batangas	Barangay 14 (Poblacion 2), Tingloy, Batangas	13.655986	120.8707085	Masterlist 2026	t	2026-07-03 16:53:16.11322	2026-07-03 16:53:16.11322
6579	\N	Tiniguiban Rural High School	TINIGUIBAN RURAL HIGH SCHOOL	Grade 7-10 & Grade 11-12	Unknown	Calauag	Quezon		14.0682001	122.288002	Masterlist 2026	t	2026-07-03 16:53:16.11322	2026-07-03 16:53:16.11322
6580	\N	Tipas Integrated National High School	TIPAS INTEGRATED NATIONAL HIGH SCHOOL	Grade 7-10 & Grade 11-12	Unknown	San Juan	Batangas	Tipas, San Juan, Batangas	13.8281082	121.4256183	Masterlist 2026	t	2026-07-03 16:53:16.11322	2026-07-03 16:53:16.11322
6581	\N	Tongohin NHS	TONGOHIN NHS	Grade 7-10 & Grade 11-12	Unknown	Infanta	Quezon	Tongohin	14.7247254	121.6197527	Masterlist 2026	t	2026-07-03 16:53:16.11322	2026-07-03 16:53:16.11322
6582	\N	Trace College	TRACE COLLEGE	Grade 11-12	Unknown	Los Baños	Laguna	El Danda St., Batong Malake, Los Baños, Laguna	14.1772107	121.2399073	Masterlist 2026	t	2026-07-03 16:53:16.11322	2026-07-03 16:53:16.11322
6583	\N	Trece Martires City Senior High School	TRECE MARTIRES CITY SENIOR HIGH SCHOOL	Grade 11-12	Unknown	Trece Martires City	Cavite	Brgy. Gregorio	14.282846	120.8762409	Masterlist 2026	t	2026-07-03 16:53:16.11322	2026-07-03 16:53:16.11322
6584	\N	Trent Information First Technical Career Institute	TRENT INFORMATION FIRST TECHNICAL CAREER INSTITUTE	Grade 11-12	Unknown	Taytay	Rizal	RLC Bldg., National Rd., Brgy. San Juan, Taytay, Rizal	14.5513437	121.139792	Masterlist 2026	t	2026-07-03 16:53:16.11322	2026-07-03 16:53:16.11322
6585	\N	Trimex Colleges, Inc.	TRIMEX COLLEGES INC	Grade 11-12	Unknown	Biñan	Laguna	Trojan Building, Poblacion, Biñan City, Laguna	14.339063	121.0853509	Masterlist 2026	t	2026-07-03 16:53:16.11322	2026-07-03 16:53:16.11322
6586	\N	Tropical Village National High School	TROPICAL VILLAGE NATIONAL HIGH SCHOOL	Grade 7-10 & Grade 11-12	Unknown	General Trias	Cavite	N.A.	14.3032139	120.9176154	Masterlist 2026	t	2026-07-03 16:53:16.11322	2026-07-03 16:53:16.11322
6587	\N	Tumbaga National High School	TUMBAGA NATIONAL HIGH SCHOOL	Grade 7-10 & Grade 11-12	Unknown	San Francisco (Aurora)	Metro Manila	Tumbaga	14.6856871	121.0771637	Masterlist 2026	t	2026-07-03 16:53:16.11322	2026-07-03 16:53:16.11322
6588	\N	Tuna-Balibago National High School	TUNABALIBAGO NATIONAL HIGH SCHOOL	Grade 7-10 & Grade 11-12	Unknown	Cardona	Rizal	P. Sta. Maria St.	14.3258062	121.2404389	Masterlist 2026	t	2026-07-03 16:53:16.11322	2026-07-03 16:53:16.11322
6589	\N	Tuntungin-Putho Integrated National High School	TUNTUNGINPUTHO INTEGRATED NATIONAL HIGH SCHOOL	Grade 7-10 & Grade 11-12	Unknown	Los Baños	Laguna		14.1518841	121.2526547	Masterlist 2026	t	2026-07-03 16:53:16.11322	2026-07-03 16:53:16.11322
6590	\N	Tuy Senior High School	TUY SENIOR HIGH SCHOOL	Grade 11-12	Unknown	Tuy	Batangas	Luna (Poblacion), Tuy, Batangas	14.0193849	120.7335581	Masterlist 2026	t	2026-07-03 16:53:16.11322	2026-07-03 16:53:16.11322
6591	\N	Ungos  Integrated NHS	UNGOS INTEGRATED NHS	Grade 7-10 & Grade 11-12	Unknown	Real	Quezon	Ungos	14.6686899	121.6069157	Masterlist 2026	t	2026-07-03 16:53:16.11322	2026-07-03 16:53:16.11322
6592	\N	Ungos National High School Extension - Llavac	UNGOS NATIONAL HIGH SCHOOL EXTENSION LLAVAC	Grade 7-10 & Grade 11-12	Unknown	Real	Quezon	Llavac	14.5224473	121.5324845	Masterlist 2026	t	2026-07-03 16:53:16.11322	2026-07-03 16:53:16.11322
6593	\N	Union College of Laguna	UNION COLLEGE OF LAGUNA	Grade 11-12	Unknown	Santa Cruz	Laguna	A. MABINI	14.283369	121.416111	Masterlist 2026	t	2026-07-03 16:53:16.11322	2026-07-03 16:53:16.11322
6595	\N	Unisan Integrated High School (Formerly Unisan NHS)	UNISAN INTEGRATED HIGH SCHOOL FORMERLY UNISAN NHS	Grade 7-10 & Grade 11-12	Unknown	Unisan	Quezon	F. de Jesus	13.837423	121.9775727	Masterlist 2026	t	2026-07-03 16:53:16.11322	2026-07-03 16:53:16.11322
6596	\N	Universal Scholastic Academe	UNIVERSAL SCHOLASTIC ACADEME	Grade 7-10 & Grade 11-12	Unknown	Lemery	Batangas	Sinisian East, Lemery, Batangas	13.9103623	120.8569476	Masterlist 2026	t	2026-07-03 16:53:16.11322	2026-07-03 16:53:16.11322
6597	\N	University of Batangas	UNIVERSITY OF BATANGAS	Grade 7-10 & Grade 11-12	Unknown	Lipa City	Batangas	Gov. Feliciano Leviste Rd. Lipa City	13.9691656	121.1593787	Masterlist 2026	t	2026-07-03 16:53:16.11322	2026-07-03 16:53:16.11322
6598	\N	University of Perpetual Help System Dalta-Calamba	UNIVERSITY OF PERPETUAL HELP SYSTEM DALTACALAMBA	Grade 11-12	Unknown	Calamba	Laguna	Barangay Paciano Rizal, Calamba City, Laguna	14.2163022	121.1358903	Masterlist 2026	t	2026-07-03 16:53:16.11322	2026-07-03 16:53:16.11322
6599	\N	University of Perpetual Help System-Dr. Jose G. Tamayo Medical University	UNIVERSITY OF PERPETUAL HELP SYSTEMDR JOSE G TAMAYO MEDICAL UNIVERSITY	Grade 11-12	Unknown	Biñan	Laguna	Sto. Niño, Biñan City, Laguna	14.3311269	121.0853931	Masterlist 2026	t	2026-07-03 16:53:16.11322	2026-07-03 16:53:16.11322
6600	\N	University of Perpetual Help System-Laguna	UNIVERSITY OF PERPETUAL HELP SYSTEMLAGUNA	Grade 11-12	Unknown	Biñan	Laguna	Sto. Niño, Biñan City, Laguna	14.3311269	121.0853931	Masterlist 2026	t	2026-07-03 16:53:16.11322	2026-07-03 16:53:16.11322
6601	\N	University of Rizal System - Antipolo Campus	UNIVERSITY OF RIZAL SYSTEM ANTIPOLO CAMPUS	Grade 11-12	Unknown	Antipolo	Rizal	Marigman St.	14.5713826	121.171387	Masterlist 2026	t	2026-07-03 16:53:16.11322	2026-07-03 16:53:16.11322
6602	\N	University of Rizal System - Laboratory School Morong Campus	UNIVERSITY OF RIZAL SYSTEM LABORATORY SCHOOL MORONG CAMPUS	Grade 1-6, Grade 7-10 & Grade 11-12	Unknown	Morong	Rizal	J. Sumulong St. Brgy. San Juan	14.516689	121.2356227	Masterlist 2026	t	2026-07-03 16:53:16.11322	2026-07-03 16:53:16.11322
6603	\N	University of Rizal System - Morong Campus	UNIVERSITY OF RIZAL SYSTEM MORONG CAMPUS	Grade 1-6, Grade 7-10 & Grade 11-12	Unknown	Morong	Rizal	J. Sumulong St.	14.516689	121.2356227	Masterlist 2026	t	2026-07-03 16:53:16.11322	2026-07-03 16:53:16.11322
6604	\N	University of the Philippines-Los BaÃ±os-Rural HS	UNIVERSITY OF THE PHILIPPINESLOS BAA±OSRURAL HS	Grade 7-10 & Grade 11-12	Unknown	Los Baños	Laguna	Los BaÃ±os, Laguna	14.1613523	121.2459593	Masterlist 2026	t	2026-07-03 16:53:16.11322	2026-07-03 16:53:16.11322
6605	\N	University of the Philippines-Los Baños	UNIVERSITY OF THE PHILIPPINESLOS BANOS	Grade 11-12	Unknown	Los Baños	Laguna	Pedro R. Sandoval Avenue, Los Baños, Laguna	14.1651138	121.2401524	Masterlist 2026	t	2026-07-03 16:53:16.11322	2026-07-03 16:53:16.11322
6606	\N	University of the Philippines-Open University	UNIVERSITY OF THE PHILIPPINESOPEN UNIVERSITY	Grade 11-12	Unknown	Los Baños	Laguna	Maahas, Los Baños, Laguna	14.1757908	121.2620705	Masterlist 2026	t	2026-07-03 16:53:16.11322	2026-07-03 16:53:16.11322
6607	\N	Upland Integrated National High School	UPLAND INTEGRATED NATIONAL HIGH SCHOOL	Grade 7-10 & Grade 11-12	Unknown	San Joaquin	Iloilo	Purok 1	10.5941275	122.1447998	Masterlist 2026	t	2026-07-03 16:53:16.11322	2026-07-03 16:53:16.11322
6608	\N	Veronica NHS (Formerly Magallanes NHS Veronica Extension)	VERONICA NHS FORMERLY MAGALLANES NHS VERONICA EXTENSION	Grade 7-10 & Grade 11-12	Unknown	Magallanes	Cavite	Veronica	14.158284	120.7464897	Masterlist 2026	t	2026-07-03 16:53:16.11322	2026-07-03 16:53:16.11322
6609	\N	Veronica NHS (Grades 7 to 12)	VERONICA NHS GRADES 7 TO 12	Grade 7-10 & Grade 11-12	Unknown	Unspecified	Region IV-A	`	12.879721	121.774017	Masterlist 2026	t	2026-07-03 16:53:16.11322	2026-07-03 16:53:16.11322
6610	\N	Vicente Madrigal National High School	VICENTE MADRIGAL NATIONAL HIGH SCHOOL	Grade 7-10 & Grade 11-12	Unknown	Binangonan	Rizal	Quarry Road	14.5070357	121.1872578	Masterlist 2026	t	2026-07-03 16:53:16.11322	2026-07-03 16:53:16.11322
6611	\N	Victoria Senior High School	VICTORIA SENIOR HIGH SCHOOL	Grade 11-12	Unknown	Marikina	Metro Manila	E. Quirino Street	14.6366742	121.1033799	Masterlist 2026	t	2026-07-03 16:53:16.11322	2026-07-03 16:53:16.11322
6612	\N	Villa Perez NHS	VILLA PEREZ NHS	Grade 7-10 & Grade 11-12	Unknown	Gumaca	Quezon	Villa Perez	13.8711314	122.1206658	Masterlist 2026	t	2026-07-03 16:53:16.11322	2026-07-03 16:53:16.11322
6613	\N	Villa San Isidro NHS	VILLA SAN ISIDRO NHS	Grade 7-10 & Grade 11-12	Unknown	Calauag	Quezon	Villa San Isidro	14.1672379	122.2158891	Masterlist 2026	t	2026-07-03 16:53:16.11322	2026-07-03 16:53:16.11322
6614	\N	Washington School	WASHINGTON SCHOOL	Grade 1-6, Grade 7-10 & Grade 11-12	Unknown	General Mariano Alvarez	Cavite	Lot 3 South Horizon 1, Governors Drive	14.3102909	121.0320665	Masterlist 2026	t	2026-07-03 16:53:16.11322	2026-07-03 16:53:16.11322
6616	\N	West Greenville Laguna Colleges, Inc.	WEST GREENVILLE LAGUNA COLLEGES INC	Grade 7-10 & Grade 11-12	Unknown	Unspecified	Region IV-A	Sofia Brucal Greenvalley Subd.	14.1406629	121.4691774	Masterlist 2026	t	2026-07-03 16:53:16.116377	2026-07-03 16:53:16.116377
6617	\N	West Palale National High School	WEST PALALE NATIONAL HIGH SCHOOL	Grade 7-10 & Grade 11-12	Unknown	Macarthur	Leyte	West Palale	10.8219372	124.9383039	Masterlist 2026	t	2026-07-03 16:53:16.116377	2026-07-03 16:53:16.116377
6618	\N	Westbridge Institute of Technology-Cabuyao	WESTBRIDGE INSTITUTE OF TECHNOLOGYCABUYAO	Grade 11-12	Unknown	Cabuyao City	Laguna	#1 National Highway, Brgy. Banlic, Cabuyao City, Laguna	14.237015	121.133451	Masterlist 2026	t	2026-07-03 16:53:16.116377	2026-07-03 16:53:16.116377
6619	\N	Westbridge Institute of Technology, Inc	WESTBRIDGE INSTITUTE OF TECHNOLOGY INC	Grade 11-12	Unknown	Cabuyao City	Laguna	#1 Brgy. Banlic, City of Cabuyao, Laguna	14.237015	121.133451	Masterlist 2026	t	2026-07-03 16:53:16.116377	2026-07-03 16:53:16.116377
6621	\N	Western Colleges, Inc.	WESTERN COLLEGES INC	Grade 7-10 & Grade 11-12	Unknown	Naic	Cavite	033 Capt. C. Nazareno St., Naic, Cavite	14.3182193	120.7655104	Masterlist 2026	t	2026-07-03 16:53:16.116377	2026-07-03 16:53:16.116377
6622	\N	White Cliff NHS	WHITE CLIFF NHS	Grade 7-10 & Grade 11-12	Unknown	San Narciso	Quezon	Brgy. White Cliff San Narciso, Quezon	13.4653729	122.5542435	Masterlist 2026	t	2026-07-03 16:53:16.116377	2026-07-03 16:53:16.116377
6623	\N	WILL School of Antipolo, Inc.	WILL SCHOOL OF ANTIPOLO INC	Grade 11-12	Unknown	Antipolo	Rizal	#700 Topaz Lane, Cristimar Village	14.5836043	121.171494	Masterlist 2026	t	2026-07-03 16:53:16.116377	2026-07-03 16:53:16.116377
6624	\N	World Citi Colleges	WORLD CITI COLLEGES	Grade 11-12	Unknown	Antipolo	Rizal	156 M.L. Quezon Avenue	14.582784	121.175643	Masterlist 2026	t	2026-07-03 16:53:16.116377	2026-07-03 16:53:16.116377
6625	\N	Yllana Colleges of Business and Arts, Inc.	YLLANA COLLEGES OF BUSINESS AND ARTS INC	Grade 11-12	Unknown	Lucena City	Quezon	2nd Floor, RJJ Marison Bldg., Profugo cor. Merchan St., Lucena City	13.9369838	121.6142033	Masterlist 2026	t	2026-07-03 16:53:16.116377	2026-07-03 16:53:16.116377
6626	\N	ZION ACADEMY OF BATANGAS INC.	ZION ACADEMY OF BATANGAS INC	Kinder & Grade 11-12	Unknown	Nasugbu	Batangas	Sitio Bautista, Brgy. Mataas Na Pulo	14.0878554	120.7285499	Masterlist 2026	t	2026-07-03 16:53:16.116377	2026-07-03 16:53:16.116377
6627	\N	ZYMONN AULSTEIN COLLEGES OF THE PHILIPPINES INC.	ZYMONN AULSTEIN COLLEGES OF THE PHILIPPINES INC	Kinder & Grade 11-12	Unknown	Tanza	Cavite	1093 Antero Soriano Highway, Lambingan, Tanza, Cavite	14.3669091	120.8191538	Masterlist 2026	t	2026-07-03 16:53:16.116377	2026-07-03 16:53:16.116377
\.


--
-- Data for Name: student_imports; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.student_imports (id, student_number, full_name, previous_school, program, scholarship, municipality, imported_at, import_source, import_status, matched_school_id, match_confidence, match_rule, strand, admission_type) FROM stdin;
\.


--
-- Data for Name: students; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.students (id, student_number, name, referral_code) FROM stdin;
\.


--
-- Data for Name: students_processed; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.students_processed (id, raw_id, student_number, full_name, course, admission_type, last_school_name, last_school_type, school_registry_id, municipality, province, year_level, enrollment_status, enrollment_date, imported_source, archived_at, mapping_status, synced_at, processed_at, strand, previous_school, contact_number, schedule, iskolar_ni_kap, requirements) FROM stdin;
\.


--
-- Data for Name: students_raw; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.students_raw (id, import_id, student_number, full_name, course, last_school_name, last_school_type, student_type, municipality, raw_payload, synced_at, strand, province, previous_school, contact_number, schedule, iskolar_ni_kap, requirements, year_level) FROM stdin;
\.


--
-- Data for Name: system_settings; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.system_settings (key, value, description, updated_at) FROM stdin;
sheetsUrl	https://docs.google.com/spreadsheets/d/1hQEu3Jz6XknkdZYohWY3hN3ock6qvQFe3wYbN6xXKGs/edit?usp=sharing	\N	2026-07-03 13:26:33.858744
sheetsToken		\N	2026-07-03 13:26:33.861243
\.


--
-- Name: imports_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.imports_id_seq', 1, false);


--
-- Name: mapping_logs_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.mapping_logs_id_seq', 1, false);


--
-- Name: referrals_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.referrals_id_seq', 1, false);


--
-- Name: school_aliases_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.school_aliases_id_seq', 95, true);


--
-- Name: school_match_history_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.school_match_history_id_seq', 3, true);


--
-- Name: school_registry_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.school_registry_id_seq', 6990, true);


--
-- Name: student_imports_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.student_imports_id_seq', 18075, true);


--
-- Name: students_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.students_id_seq', 1, false);


--
-- Name: students_processed_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.students_processed_id_seq', 4649, true);


--
-- Name: students_raw_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.students_raw_id_seq', 1, false);


--
-- Name: imports imports_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.imports
    ADD CONSTRAINT imports_pkey PRIMARY KEY (id);


--
-- Name: mapping_logs mapping_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.mapping_logs
    ADD CONSTRAINT mapping_logs_pkey PRIMARY KEY (id);


--
-- Name: referrals referrals_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.referrals
    ADD CONSTRAINT referrals_pkey PRIMARY KEY (id);


--
-- Name: school_aliases school_aliases_normalized_alias_unique; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.school_aliases
    ADD CONSTRAINT school_aliases_normalized_alias_unique UNIQUE (normalized_alias);


--
-- Name: school_aliases school_aliases_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.school_aliases
    ADD CONSTRAINT school_aliases_pkey PRIMARY KEY (id);


--
-- Name: school_match_history school_match_history_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.school_match_history
    ADD CONSTRAINT school_match_history_pkey PRIMARY KEY (id);


--
-- Name: school_registry school_registry_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.school_registry
    ADD CONSTRAINT school_registry_pkey PRIMARY KEY (id);


--
-- Name: student_imports student_imports_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.student_imports
    ADD CONSTRAINT student_imports_pkey PRIMARY KEY (id);


--
-- Name: students students_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.students
    ADD CONSTRAINT students_pkey PRIMARY KEY (id);


--
-- Name: students_processed students_processed_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.students_processed
    ADD CONSTRAINT students_processed_pkey PRIMARY KEY (id);


--
-- Name: students_raw students_raw_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.students_raw
    ADD CONSTRAINT students_raw_pkey PRIMARY KEY (id);


--
-- Name: students students_referral_code_unique; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.students
    ADD CONSTRAINT students_referral_code_unique UNIQUE (referral_code);


--
-- Name: students students_student_number_unique; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.students
    ADD CONSTRAINT students_student_number_unique UNIQUE (student_number);


--
-- Name: system_settings system_settings_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.system_settings
    ADD CONSTRAINT system_settings_pkey PRIMARY KEY (key);


--
-- Name: mapping_logs mapping_logs_import_id_imports_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.mapping_logs
    ADD CONSTRAINT mapping_logs_import_id_imports_id_fk FOREIGN KEY (import_id) REFERENCES public.imports(id);


--
-- Name: mapping_logs mapping_logs_school_registry_id_school_registry_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.mapping_logs
    ADD CONSTRAINT mapping_logs_school_registry_id_school_registry_id_fk FOREIGN KEY (school_registry_id) REFERENCES public.school_registry(id);


--
-- Name: mapping_logs mapping_logs_student_processed_id_students_processed_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.mapping_logs
    ADD CONSTRAINT mapping_logs_student_processed_id_students_processed_id_fk FOREIGN KEY (student_processed_id) REFERENCES public.students_processed(id);


--
-- Name: referrals referrals_referrer_id_students_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.referrals
    ADD CONSTRAINT referrals_referrer_id_students_id_fk FOREIGN KEY (referrer_id) REFERENCES public.students(id);


--
-- Name: school_aliases school_aliases_school_registry_id_school_registry_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.school_aliases
    ADD CONSTRAINT school_aliases_school_registry_id_school_registry_id_fk FOREIGN KEY (school_registry_id) REFERENCES public.school_registry(id);


--
-- Name: school_match_history school_match_history_official_school_id_school_registry_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.school_match_history
    ADD CONSTRAINT school_match_history_official_school_id_school_registry_id_fk FOREIGN KEY (official_school_id) REFERENCES public.school_registry(id);


--
-- Name: student_imports student_imports_matched_school_id_school_registry_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.student_imports
    ADD CONSTRAINT student_imports_matched_school_id_school_registry_id_fk FOREIGN KEY (matched_school_id) REFERENCES public.school_registry(id);


--
-- Name: students_processed students_processed_raw_id_students_raw_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.students_processed
    ADD CONSTRAINT students_processed_raw_id_students_raw_id_fk FOREIGN KEY (raw_id) REFERENCES public.students_raw(id);


--
-- Name: students_processed students_processed_school_registry_id_school_registry_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.students_processed
    ADD CONSTRAINT students_processed_school_registry_id_school_registry_id_fk FOREIGN KEY (school_registry_id) REFERENCES public.school_registry(id);


--
-- Name: students_raw students_raw_import_id_imports_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.students_raw
    ADD CONSTRAINT students_raw_import_id_imports_id_fk FOREIGN KEY (import_id) REFERENCES public.imports(id);


--
-- PostgreSQL database dump complete
--

\unrestrict MwnQOHraRo4pDqKyDcmkHsmYBq743GS04Hr95y21deFaPvHHjGaVzObT7xvN8sq

