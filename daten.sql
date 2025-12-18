USE defidb;

-- 1. ZUERST Koordinaten
INSERT INTO k_koordinaten (k_latitude, k_longitude) VALUES
(48.1810954, 16.3562034),
(48.1806330, 16.3532999),
(48.1814583, 16.3511552),
(48.1842160, 16.3469646),
(48.1851496, 16.3474096),
(48.1852020, 16.3506484),
(48.1867586, 16.3440004),
(48.1881797, 16.3438260),
(48.1868102, 16.3530739),
(48.1887919, 16.3526762),
(48.1855989, 16.3571681),
(48.1845995, 16.3615028),
(48.1887081, 16.3591965),
(48.1877160, 16.3623185),
(48.1879791, 16.3620091),
(48.1917359, 16.3587795),
(48.1953328, 16.3563125);

-- 2. DANN Adressen
INSERT INTO a_adresse (a_plz, a_stadt, a_straße, a_hausnummer, a_k_koordinaten) VALUES
(1050, 'Wien', 'Leopold-Rister-Gasse', '5', 1),
(1050, 'Wien', 'Einsiedlergasse', '2', 2),
(1050, 'Wien', 'Siebenbrunnenfeldgasse', '26-30', 3),
(1050, 'Wien', 'Arbeitergasse', '45', 4),
(1050, 'Wien', 'Johannagasse', '28', 5),
(1050, 'Wien', 'Embelgasse', '46-48', 6),
(1050, 'Wien', 'Margaretengürtel', '142', 7),
(1050, 'Wien', 'Bruno Kreisky Park', '-', 8),
(1050, 'Wien', 'Reinprechtsdorfer Straße', '52', 9),
(1050, 'Wien', 'Bräuhausgasse', '37', 10),
(1050, 'Wien', 'Spengergasse', '20', 11),
(1050, 'Wien', 'Wiednerhauptstrasse', '120', 12),
(1050, 'Wien', 'Viktor-Christ-Gasse', '9', 13),
(1050, 'Wien', 'Nikolsdorfergasse', '18', 14),
(1050, 'Wien', 'Nikolsdorfergasse', '32', 15),
(1050, 'Wien', 'Margaretenplatz', '2/131', 16),
(1050, 'Wien', 'Hamburgerstraße', '9', 17);

-- 3. ZULETZT Zusatzinfos
INSERT INTO z_zusatzinfo (z_ort, z_aktiv, z_a_adresse) VALUES
('an der Hauswand rechts eben dem Eingang', 1, 1),
('beim Portier der MA48-Garage', 1, 2),
('an der Hauswand', 1, 3),
('beim Haupteingang rein gerade durchgehen bis zum Lift rechts an der Wand', 1, 4),
('direkt an der Tankstelle außen', 1, 5),
('im Sekretariat', 1, 6),
('Rezeption und im SPA Bereich', 1, 7),
('beim Wartepersonal', 1, 8),
('im Foyer', 0, 9),
('im Foyer Bürohaus Erdgeschoß', 1, 10),
('links neben dem Portier direkt beim Eingang', 1, 11),
('beim Portier eingang links', 1, 12),
('im Eingangsbereich', 1, 13),
('Gerät befindet sich im Eingangsbereich in einem gekennzeichneten Kasten', 1, 14),
('beim Portier in der Eingangshalle', 1, 15),
('beim Empfang', 1, 16),
('im Stiegenhaus vor der Aufzugtüre im EG', 1, 17);