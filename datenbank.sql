-- MySQL Workbench Forward Engineering

SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0;
SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0;
SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION';

-- -----------------------------------------------------
-- Schema defidb
-- -----------------------------------------------------
CREATE SCHEMA IF NOT EXISTS `defidb` DEFAULT CHARACTER SET utf8mb4;
USE `defidb`;

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

SET SQL_MODE=@OLD_SQL_MODE;
SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS;
SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS;