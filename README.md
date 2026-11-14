# SiteSphere - Construction ERP System

React + Vite + Supabase. Roles: Contractor/Administrator, Site Supervisor, Civil Engineer, Accountant.

## Setup

1. `npm install`
2. Copy `.env.example` to `.env` and fill in your Supabase URL and publishable (anon) key.
3. In the Supabase SQL editor run `supabase/civil_engineer_module.sql` (creates the `building_plans`
   table, the private `building-plans` storage bucket and all access policies).
4. `npm run dev`

## Civil Engineer module

- `/civil-engineer` - dashboard (plan counts by status, recent plans, plans per project)
- `/building-plans` - upload, search/filter, view, download, edit and delete plans
  (PDF, DWG, DXF, IFC, PNG, JPG, WEBP up to 25 MB)

| Role | Access to building plans |
| --- | --- |
| Civil Engineer, Contractor/Administrator | Full manage |
| Site Supervisor | Read-only, Approved plans only |
| Accountant | None |

Create a Civil Engineer login by adding a user with the role `Civil Engineer` on the Users page.
