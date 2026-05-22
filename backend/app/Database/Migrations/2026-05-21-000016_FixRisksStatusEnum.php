<?php

namespace App\Database\Migrations;

use CodeIgniter\Database\Migration;

/**
 * Normaliza risks.status para coincidir con los valores del frontend:
 *   ABIERTO → ACTIVO  (renombrar)
 *   +MITIGADO          (agregar)
 *   EN_MITIGACION      (mantener)
 *   CERRADO            (mantener)
 */
class FixRisksStatusEnum extends Migration
{
    public function up(): void
    {
        // 1. Ampliar el ENUM para aceptar todos los valores temporalmente
        $this->db->query("ALTER TABLE risks MODIFY COLUMN status ENUM('ABIERTO','ACTIVO','EN_MITIGACION','MITIGADO','CERRADO') NOT NULL DEFAULT 'ACTIVO'");

        // 2. Migrar datos existentes: ABIERTO → ACTIVO
        $this->db->query("UPDATE risks SET status = 'ACTIVO' WHERE status = 'ABIERTO'");

        // 3. Dejar el ENUM final limpio (sin ABIERTO)
        $this->db->query("ALTER TABLE risks MODIFY COLUMN status ENUM('ACTIVO','EN_MITIGACION','MITIGADO','CERRADO') NOT NULL DEFAULT 'ACTIVO'");
    }

    public function down(): void
    {
        $this->db->query("ALTER TABLE risks MODIFY COLUMN status ENUM('ACTIVO','EN_MITIGACION','MITIGADO','CERRADO','ABIERTO') NOT NULL DEFAULT 'ACTIVO'");
        $this->db->query("UPDATE risks SET status = 'ABIERTO' WHERE status = 'ACTIVO'");
        $this->db->query("ALTER TABLE risks MODIFY COLUMN status ENUM('ABIERTO','EN_MITIGACION','CERRADO') NOT NULL DEFAULT 'ABIERTO'");
    }
}
