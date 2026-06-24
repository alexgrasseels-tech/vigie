-- ============================================================
--  Vigie — RE-SEED avec le portefeuille réel (26 projets / 19 clients).
--  ⚠️ REMPLACE les données existantes : supprime d'abord tous les clients
--     (→ cascade projets + échéances/attentes/contacts/copils/réunions).
--  À exécuter dans Supabase → SQL Editor.
--  Mapping : code + client + nom extraits de PROJET ; budget = _BAC (€) ;
--  budget_consomme = Consommé (€) ; santé dérivée de la progression
--  (>150% → en_danger, >100% → a_risque, sinon on_track).
-- ============================================================

-- 0. Wipe (cascade depuis clients)
delete from public.clients
where user_id = (select id from auth.users order by created_at limit 1);

-- 1. Clients (19) — cadence par défaut 7 j
insert into public.clients (user_id, nom, cadence_x)
select (select id from auth.users order by created_at limit 1), v.nom, 7
from (values
  ('LABO BACH'), ('CHC'), ('Menuiserie Riche'), ('LUXINNOVATION'), ('ELANTIS'),
  ('RMGA'), ('KITOZYME'), ('PLASTISERVICE'), ('NeWIN'), ('AT. CHARLIER VL.'),
  ('COSUCRA'), ('NRB'), ('ETRTO'), ('BIDFOOD'), ('QUALITY ASSISTANCE'),
  ('LGTech'), ('GDSO'), ('PLUXEE'), ('AEROSPACELAB')
) v(nom);

-- 2. Projets (26) — statut actif, phase développement, budget + consommé (€)
insert into public.projects
  (user_id, client_id, code, nom, sante, statut, phase, budget, budget_consomme)
select c.user_id, c.id, v.code, v.nom,
       v.sante::public.project_health, 'actif'::public.project_status, 'developpement'::public.phase,
       v.budget, v.consomme
from (values
  ('PR17/000572','Windev - Labsoft','LABO BACH','en_danger',7584.00,28380.75),
  ('PR23/000771','MGT/Maintenance Sites In 2023-2024','CHC','on_track',8645.00,8133.13),
  ('PR23/000972','Adaptation CRM 2023','Menuiserie Riche','en_danger',48884.18,109527.79),
  ('PR25/000095','LXI PU Scopes 2025','LUXINNOVATION','a_risque',84951.86,86718.49),
  ('PR25/000099','Implémentation Windows 365','ELANTIS','a_risque',17075.64,18911.76),
  ('PR25/000109','Authentification Azure/IIS','ELANTIS','en_danger',12093.32,21955.94),
  ('PR25/000185','Adaptation Docuware ensemble du groupe','RMGA','en_danger',36670.68,69514.81),
  ('PR25/000239','Roadmap AI','KITOZYME','on_track',28575.00,10803.56),
  ('PR25/000248','Formations Teams','PLASTISERVICE','on_track',1545.04,1062.22),
  ('PR25/000329','Réécriture Application Cotaclic','NeWIN','a_risque',85998.00,82725.04),
  ('PR25/000412','Intranet NL','AT. CHARLIER VL.','on_track',22239.16,17792.45),
  ('PR25/000427','Sharepoint phase 2','COSUCRA','on_track',47953.76,47420.70),
  ('PR25/000468','SAFRAN - Mise en place Field Service','NRB','on_track',94140.00,81708.75),
  ('PR25/000471','Gestion projet tranversale','ELANTIS','on_track',12780.00,5857.50),
  ('PR26/000001','Mise en place Peppol','ETRTO','a_risque',7937.50,10351.84),
  ('PR26/000015','Intranet Phase 2 - Intégration entités NL','BIDFOOD','a_risque',11906.20,13837.55),
  ('PR26/000038','Migration SharePoint','QUALITY ASSISTANCE','on_track',25590.68,20046.70),
  ('PR26/000043','Accomp. Post Intranet','LGTech','on_track',8299.54,5893.30),
  ('PR26/000064','Power Apps & Azure Document intelligence','ELANTIS','on_track',22119.86,6704.68),
  ('PR26/000081','Mise en place Mycare (MSSP)','NeWIN','a_risque',28710.22,33114.76),
  ('PR26/000093','D365 Sales - Intégration site Web','Menuiserie Riche','en_danger',1881.02,3059.49),
  ('PR26/000096','Site TechXperience','NeWIN','a_risque',10000.04,11478.03),
  ('PR26/000126','Analyse et développements des sites','PLUXEE','on_track',79184.18,29398.84),
  ('PR26/000136','Payload','GDSO','on_track',15136.64,11366.03),
  ('PR26/000140','Initiation PURVIEW','QUALITY ASSISTANCE','on_track',6693.20,0),
  ('PR26/000141','Data Security','AEROSPACELAB','on_track',6693.20,865.50)
) v(code, nom, client, sante, budget, consomme)
join public.clients c
  on c.nom = v.client and c.user_id = (select id from auth.users order by created_at limit 1);
