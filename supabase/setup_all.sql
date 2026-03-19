-- ============================================================
-- ESDEN Analytics Dashboard — FULL DATABASE SETUP
-- Version: 1.1.0
-- ============================================================

-- ── 1. Enable UUID Extension ────────
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- NOTE: The legacy table and its associated RPC functions
-- have been removed. The dashboard now uses the 9-table normalized schema
-- (lead, llamadas, agendamientos, etc.) and the dynamic KPI engine.

-- For basic lead-based KPIs, refer to dynamic_kpi.sql
