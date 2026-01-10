-- ============================================
-- DefiDB - Komplettes Setup für Railway/MySQL
-- ============================================

-- Datenbank erstellen
CREATE DATABASE IF NOT EXISTS `defidb` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE `defidb`;

-- Deaktiviere Constraints temporär
SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0;
SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0;
SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION';

-- -----------------------------------------------------
-- Table `k_koordinaten`
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS `k_koordinaten` (
  `k_id` INT NOT NULL AUTO_INCREMENT,
  `k_latitude` DECIMAL(10,7) NULL,
  `k_longitude` DECIMAL(10,7) NULL,
  PRIMARY KEY (`k_id`)
) ENGINE = InnoDB;

-- -----------------------------------------------------
-- Table `a_adresse`
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS `a_adresse` (
  `a_id` INT NOT NULL AUTO_INCREMENT,
  `a_plz` INT NULL,
  `a_stadt` VARCHAR(45) NULL,
  `a_straße` VARCHAR(45) NULL,
  `a_hausnummer` VARCHAR(10) NULL,
  `a_k_koordinaten` INT NOT NULL,
  PRIMARY KEY (`a_id`),
  INDEX `fk_a_adresse_k_koordinaten_idx` (`a_k_koordinaten` ASC),
  CONSTRAINT `fk_a_adresse_k_koordinaten`
    FOREIGN KEY (`a_k_koordinaten`)
    REFERENCES `k_koordinaten` (`k_id`)
    ON DELETE CASCADE
    ON UPDATE CASCADE
) ENGINE = InnoDB;

-- -----------------------------------------------------
-- Table `z_zusatzinfo`
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS `z_zusatzinfo` (
  `z_id` INT NOT NULL AUTO_INCREMENT,
  `z_ort` VARCHAR(100) NULL,
  `z_aktiv` TINYINT(1) DEFAULT 1,
  `z_a_adresse` INT NOT NULL,
  PRIMARY KEY (`z_id`),
  INDEX `fk_z_zusatzinfo_a_adresse1_idx` (`z_a_adresse` ASC),
  CONSTRAINT `fk_z_zusatzinfo_a_adresse1`
    FOREIGN KEY (`z_a_adresse`)
    REFERENCES `a_adresse` (`a_id`)
    ON DELETE CASCADE
    ON UPDATE CASCADE
) ENGINE = InnoDB;

-- Daten einfügen
-- 1. Koordinaten
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

-- 2. Adressen
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

-- 3. Zusatzinfos
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

-- Constraints wieder aktivieren
SET SQL_MODE=@OLD_SQL_MODE;
SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS;
SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS;

-- Erfolgsmeldung
SELECT '✅ Datenbank erfolgreich erstellt und befüllt!' AS Status;
SELECT COUNT(*) AS 'Anzahl Defis' FROM k_koordinaten;