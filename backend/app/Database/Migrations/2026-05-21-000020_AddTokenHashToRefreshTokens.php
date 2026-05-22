<?php

namespace App\Database\Migrations;

use CodeIgniter\Database\Migration;

class AddTokenHashToRefreshTokens extends Migration
{
    public function up(): void
    {
        // Reemplazamos el campo 'token TEXT' por 'token_hash VARCHAR(64)' indexado.
        $this->forge->modifyColumn('refresh_tokens', [
            'token' => [
                'name'       => 'token_hash',
                'type'       => 'VARCHAR',
                'constraint' => 64,
                'null'       => false,
                'default'    => '',
            ],
        ]);

        $this->db->query('CREATE INDEX idx_refresh_token_hash ON refresh_tokens (token_hash)');
    }

    public function down(): void
    {
        $this->db->query('DROP INDEX idx_refresh_token_hash ON refresh_tokens');

        $this->forge->modifyColumn('refresh_tokens', [
            'token_hash' => [
                'name' => 'token',
                'type' => 'TEXT',
                'null' => true,
            ],
        ]);
    }
}
