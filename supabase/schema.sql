-- SouverainScore v0.1 — schéma minimal du diagnostic gratuit
-- À exécuter dans Supabase : SQL Editor > New query > coller > Run

create table public.diagnostics (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  organisation text not null,
  fonction text not null,
  email text not null,
  email_perso_confirme boolean not null default false,
  optin_communaute boolean not null default false,
  optin_newsletter boolean not null default false,
  profil jsonb,
  reponses jsonb,
  score_global integer,
  scores_axes jsonb,
  alerte_id text
);

-- Sécurité : Row Level Security activée.
-- Le site public (clé "anon") peut UNIQUEMENT insérer.
-- Aucune policy SELECT/UPDATE/DELETE => lecture impossible via l'API publique ;
-- vous consultez les données dans le dashboard Supabase (Table Editor).
alter table public.diagnostics enable row level security;

create policy "insertion_anonyme"
  on public.diagnostics
  for insert
  to anon
  with check (true);

-- RGPD : prévoir une purge des enregistrements au-delà de la durée de
-- conservation annoncée (à définir avec le juriste — prérequis n°3).
