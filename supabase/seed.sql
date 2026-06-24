-- ============================================================
--  Vigie — données d'exemple (réf. Project Cockpit)
--  À exécuter APRÈS schema.vigie.sql, dans Supabase → SQL Editor.
--  Idempotent : ne ré-insère pas si le projet PR25000499 existe déjà.
--  Rattaché à l'unique compte (le plus ancien dans auth.users).
-- ============================================================

-- 1. Clients (cadence reprise du relanceInterval du 1er projet)
insert into public.clients (user_id, nom, cadence_x)
select (select id from auth.users order by created_at limit 1), v.nom, v.cad
from (values
  ('Captel', 7), ('BSCA', 7), ('Elantis', 30), ('SAFRAN (FORF)', 7),
  ('Ignity', 7), ('Cosucra', 7), ('At. Charlier VL.', 7), ('WIN SA', 7),
  ('Luxinnovation', 7), ('Kitozyme', 14), ('RMGA', 7), ('Menuiserie Riche', 7)
) v(nom, cad)
where not exists (select 1 from public.projects p where p.code = 'PR25000499');

-- 2. Projets (santé/statut/phase + scoring risque + budget + MeP)
insert into public.projects
  (user_id, client_id, code, nom, type, sante, statut, phase, risk_type,
   risk_planning, risk_budget, risk_ressources, date_dernier_contact,
   budget, budget_consomme, etc, release_date, notes)
select c.user_id, c.id, v.code, v.nom, v.type,
       v.sante::public.project_health, v.statut::public.project_status, v.phase::public.phase,
       v.risk_type, v.rp, v.rb, v.rr, v.dlc::date,
       v.budget, v.consumed, v.etc, nullif(v.release, '')::date, v.notes
from (values
  ('PR25000499','Flux Sortant Peppol','Captel','Web/Custo','on_track','actif','developpement','Aucun',1,1,1,'2026-03-27',9100,9100,0,'','Document de réception en cours de validation par client'),
  ('PR25000493','Mise en place de Peppol','BSCA','Web/Custo','on_track','actif','developpement','Aucun',1,1,1,'2026-03-27',14000,13300,700,'','Réception définitive prévue en avril'),
  ('PR25000471','Gestion Transversale','Elantis','D365','on_track','actif','developpement','Aucun',1,1,1,'2026-03-27',12400,2480,9920,'','1 fois par mois chez le client'),
  ('PR25000468','Mise en place Field Service','SAFRAN (FORF)','D365','on_track','actif','developpement','Aucun',2,1,2,'2026-03-27',94000,65800,28200,'','MeP reportée — Facturer NRB pour 70% du projet'),
  ('PR25000458','Accompagnement Migration SP','Ignity','Intranet','a_risque','actif','developpement','Retard client',3,1,2,'2026-03-27',9600,8640,960,'','Dérapage planning (lié lenteur client + analyse mal calibrée)'),
  ('PR25000427','SharePoint Phase 2','Cosucra','Intranet','a_risque','actif','livraison','Aucun',2,1,2,'2026-03-27',48000,45600,2400,'2026-04-30','Décommissionnement avril 2026 → mise en prod en avril'),
  ('PR25000412','Intranet NL','At. Charlier VL.','Intranet','on_track','actif','developpement','Retard client',1,1,2,'2026-03-27',21500,12900,8600,'','Le projet n''avance pas du côté client'),
  ('PR25000329','Cotaclic','WIN SA','Web/Custo','on_track','actif','livraison','Aucun',1,1,1,'2026-03-27',92000,82800,9200,'2026-04-30','Test et stabilisation chez le client. MeP prévue en avril.'),
  ('PR25000258','D365 Scope 2025','Luxinnovation','D365','en_danger','actif','developpement','Ressources',3,2,2,'2026-03-27',20000,18000,2000,'','Compliqué côté planning de l''équipe PP'),
  ('PR25000239','Copilot','Kitozyme','AI','a_risque','en_pause','cadrage','Retard client',1,1,2,'2026-03-27',27000,6750,20250,'','Projet à l''arrêt — Offre en cours. Relancer le client'),
  ('PR25000185','Docuware','RMGA','Web/Custo','a_risque','actif','developpement','Aucun',2,1,2,'2026-03-27',35000,31500,3500,'','Uniquement QPR sur projet'),
  ('PR25000109','Authentification Azure/IIS','Elantis','Web/Custo','a_risque','actif','tests','Aucun',2,2,1,'2026-03-27',2000,1800,200,'','Samir planifié semaine du 18/01'),
  ('PR25000095','LXI PU Scopes 2025','Luxinnovation','D365','on_track','actif','developpement','Aucun',1,1,1,'2026-03-27',61500,55350,6150,'','Scope 8 en cours — estimation du scope 9 début avril'),
  ('PR23000972','Adaptations CRM 2023','Menuiserie Riche','D365','a_risque','actif','tests','Retard interne',3,1,3,'2026-03-27',63000,59850,3150,'','Problème de planning côté D365 → à mettre en priorité !')
) v(code,nom,client,type,sante,statut,phase,risk_type,rp,rb,rr,dlc,budget,consumed,etc,release,notes)
join public.clients c
  on c.nom = v.client and c.user_id = (select id from auth.users order by created_at limit 1)
where not exists (select 1 from public.projects p where p.code = 'PR25000499');

-- 3. Échéances / livrables
insert into public.deadlines (user_id, project_id, libelle, date, statut)
select p.user_id, p.id, v.libelle, v.date::date, 'a_venir'
from (values
  ('PR25000427','Migration données SharePoint','2026-04-15'),
  ('PR25000427','Décommissionnement ancienne solution','2026-04-30'),
  ('PR25000329','MeP Cotaclic','2026-04-30'),
  ('PR25000329','Stabilisation post-MeP','2026-05-15'),
  ('PR25000468','MeP Field Service','2026-05-01'),
  ('PR23000972','Livraison adaptations CRM prioritaires','2026-04-10')
) v(code,libelle,date)
join public.projects p on p.code = v.code
where not exists (select 1 from public.deadlines d where d.libelle = 'MeP Cotaclic');

-- 4. COPIL
insert into public.copils (user_id, project_id, date, notes)
select p.user_id, p.id, v.date::date, null
from (values
  ('PR25000329','2026-04-10'), ('PR25000468','2026-04-15'), ('PR25000427','2026-04-08')
) v(code,date)
join public.projects p on p.code = v.code
where not exists (select 1 from public.copils);

-- 5. Réunions internes
insert into public.meetings (user_id, project_id, date, notes)
select p.user_id, p.id, v.date::date, v.notes
from (values
  ('PR25000258','2026-04-04','Point planning équipe PP'),
  ('PR23000972','2026-04-03','Priorisation CRM avec D365'),
  ('PR25000468','2026-04-07','Suivi Field Service')
) v(code,date,notes)
join public.projects p on p.code = v.code
where not exists (select 1 from public.meetings);
