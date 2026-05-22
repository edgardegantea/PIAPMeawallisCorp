<?php

namespace App\Database\Migrations;

use CodeIgniter\Database\Migration;

class CreateProjectsTable extends Migration
{
    public function up()
    {
        $this->forge->addField([
            'id'                      => ['type' => 'INT', 'unsigned' => true, 'auto_increment' => true],
            'code'                    => ['type' => 'VARCHAR', 'constraint' => 20, 'unique' => true],
            'name'                    => ['type' => 'VARCHAR', 'constraint' => 255],
            'description'             => ['type' => 'TEXT'],
            'category_id'             => ['type' => 'INT', 'unsigned' => true],
            'status'                  => ['type' => 'ENUM', 'constraint' => ['INICIACION','PLANIFICACION','EJECUCION','MONITOREO','CIERRE','PAUSADO','CANCELADO'], 'default' => 'INICIACION'],
            'priority'                => ['type' => 'ENUM', 'constraint' => ['BAJA','MEDIA','ALTA','CRITICA'], 'default' => 'MEDIA'],
            'director_id'             => ['type' => 'INT', 'unsigned' => true],
            'sponsor_id'              => ['type' => 'INT', 'unsigned' => true, 'null' => true],
            'developer_representative'=> ['type' => 'VARCHAR', 'constraint' => 255, 'null' => true],
            'project_manager_name'    => ['type' => 'VARCHAR', 'constraint' => 255, 'null' => true],
            'client_name'             => ['type' => 'VARCHAR', 'constraint' => 255, 'null' => true],
            'client_representative'   => ['type' => 'VARCHAR', 'constraint' => 255, 'null' => true],
            'client_email'            => ['type' => 'VARCHAR', 'constraint' => 255, 'null' => true],
            'client_phone'            => ['type' => 'VARCHAR', 'constraint' => 50, 'null' => true],
            'client_address'          => ['type' => 'TEXT', 'null' => true],
            'client_rfc'              => ['type' => 'VARCHAR', 'constraint' => 20, 'null' => true],
            'client_tax_regime'       => ['type' => 'VARCHAR', 'constraint' => 100, 'null' => true],
            'client_cfdi_usage'       => ['type' => 'VARCHAR', 'constraint' => 100, 'null' => true],
            'client_billing_email'    => ['type' => 'VARCHAR', 'constraint' => 255, 'null' => true],
            'client_zip_code'         => ['type' => 'VARCHAR', 'constraint' => 10, 'null' => true],
            'planned_start_date'      => ['type' => 'DATE'],
            'planned_end_date'        => ['type' => 'DATE'],
            'actual_start_date'       => ['type' => 'DATE', 'null' => true],
            'actual_end_date'         => ['type' => 'DATE', 'null' => true],
            'planned_budget'          => ['type' => 'DECIMAL', 'constraint' => '12,2', 'default' => 0],
            'actual_budget'           => ['type' => 'DECIMAL', 'constraint' => '12,2', 'default' => 0],
            'objectives'              => ['type' => 'TEXT'],
            'scope'                   => ['type' => 'TEXT'],
            'deliverables'            => ['type' => 'TEXT', 'null' => true],
            'identified_risks'        => ['type' => 'TEXT', 'null' => true],
            'constraints'             => ['type' => 'TEXT', 'null' => true],
            'assumptions'             => ['type' => 'TEXT', 'null' => true],
            'completion_percentage'   => ['type' => 'TINYINT', 'unsigned' => true, 'default' => 0],
            'notes'                   => ['type' => 'TEXT', 'null' => true],
            'is_active'               => ['type' => 'TINYINT', 'constraint' => 1, 'default' => 1],
            'created_at'              => ['type' => 'DATETIME', 'null' => true],
            'updated_at'              => ['type' => 'DATETIME', 'null' => true],
        ]);
        $this->forge->addPrimaryKey('id');
        $this->forge->addForeignKey('category_id', 'project_categories', 'id', 'RESTRICT', 'RESTRICT');
        $this->forge->addForeignKey('director_id', 'users', 'id', 'RESTRICT', 'RESTRICT');
        $this->forge->addForeignKey('sponsor_id', 'users', 'id', 'SET NULL', 'SET NULL');
        $this->forge->createTable('projects');
    }

    public function down()
    {
        $this->forge->dropTable('projects');
    }
}
