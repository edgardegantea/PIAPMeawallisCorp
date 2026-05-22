<?php

namespace App\Database\Migrations;

use CodeIgniter\Database\Migration;

class ExtendUserProfile extends Migration
{
    public function up(): void
    {
        // ── Nuevos campos en users ───────────────────────────────────────────
        $fields = [
            'bio'              => ['type' => 'TEXT',    'null' => true, 'after' => 'department'],
            'birth_date'       => ['type' => 'DATE',    'null' => true, 'after' => 'bio'],
            'address'          => ['type' => 'VARCHAR', 'constraint' => 255, 'null' => true, 'after' => 'birth_date'],
            'city'             => ['type' => 'VARCHAR', 'constraint' => 100, 'null' => true, 'after' => 'address'],
            'state'            => ['type' => 'VARCHAR', 'constraint' => 100, 'null' => true, 'after' => 'city'],
            'country'          => ['type' => 'VARCHAR', 'constraint' => 100, 'null' => true, 'after' => 'state'],
            'rfc'              => ['type' => 'VARCHAR', 'constraint' => 20,  'null' => true, 'after' => 'country'],
            'curp'             => ['type' => 'VARCHAR', 'constraint' => 20,  'null' => true, 'after' => 'rfc'],
            'nss'              => ['type' => 'VARCHAR', 'constraint' => 20,  'null' => true, 'after' => 'curp'],
            'years_experience' => ['type' => 'TINYINT', 'null' => true,     'after' => 'nss'],
            'skills'           => ['type' => 'TEXT',    'null' => true,      'after' => 'years_experience'],
            'linkedin_url'     => ['type' => 'VARCHAR', 'constraint' => 255, 'null' => true, 'after' => 'skills'],
            'github_url'       => ['type' => 'VARCHAR', 'constraint' => 255, 'null' => true, 'after' => 'linkedin_url'],
            'website_url'      => ['type' => 'VARCHAR', 'constraint' => 255, 'null' => true, 'after' => 'github_url'],
        ];
        $this->forge->addColumn('users', $fields);

        // ── user_certifications ──────────────────────────────────────────────
        $this->forge->addField([
            'id'             => ['type' => 'INT', 'unsigned' => true, 'auto_increment' => true],
            'user_id'        => ['type' => 'INT', 'unsigned' => true],
            'name'           => ['type' => 'VARCHAR', 'constraint' => 255],
            'issuer'         => ['type' => 'VARCHAR', 'constraint' => 255, 'null' => true],
            'issued_date'    => ['type' => 'DATE', 'null' => true],
            'expiry_date'    => ['type' => 'DATE', 'null' => true],
            'credential_id'  => ['type' => 'VARCHAR', 'constraint' => 100, 'null' => true],
            'credential_url' => ['type' => 'VARCHAR', 'constraint' => 500, 'null' => true],
            'created_at'     => ['type' => 'DATETIME', 'null' => true],
        ]);
        $this->forge->addPrimaryKey('id');
        $this->forge->addForeignKey('user_id', 'users', 'id', 'CASCADE', 'CASCADE');
        $this->forge->createTable('user_certifications');

        // ── user_achievements ────────────────────────────────────────────────
        $this->forge->addField([
            'id'               => ['type' => 'INT', 'unsigned' => true, 'auto_increment' => true],
            'user_id'          => ['type' => 'INT', 'unsigned' => true],
            'title'            => ['type' => 'VARCHAR', 'constraint' => 255],
            'description'      => ['type' => 'TEXT', 'null' => true],
            'achievement_date' => ['type' => 'DATE', 'null' => true],
            'created_at'       => ['type' => 'DATETIME', 'null' => true],
        ]);
        $this->forge->addPrimaryKey('id');
        $this->forge->addForeignKey('user_id', 'users', 'id', 'CASCADE', 'CASCADE');
        $this->forge->createTable('user_achievements');
    }

    public function down(): void
    {
        $this->forge->dropTable('user_certifications', true);
        $this->forge->dropTable('user_achievements', true);

        $cols = ['bio', 'birth_date', 'address', 'city', 'state', 'country',
                 'rfc', 'curp', 'nss', 'years_experience', 'skills',
                 'linkedin_url', 'github_url', 'website_url'];
        foreach ($cols as $col) {
            $this->forge->dropColumn('users', $col);
        }
    }
}
