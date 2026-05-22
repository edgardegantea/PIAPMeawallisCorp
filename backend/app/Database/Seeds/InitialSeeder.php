<?php

namespace App\Database\Seeds;

use CodeIgniter\Database\Seeder;

class InitialSeeder extends Seeder
{
    public function run()
    {
        // Categorías por defecto
        $categories = [
            ['name' => 'Desarrollo Web',    'color' => '#667eea', 'description' => 'Proyectos de desarrollo web'],
            ['name' => 'Desarrollo Móvil',  'color' => '#f093fb', 'description' => 'Aplicaciones móviles iOS/Android'],
            ['name' => 'Infraestructura',   'color' => '#4facfe', 'description' => 'Proyectos de infraestructura TI'],
            ['name' => 'Consultoría',       'color' => '#43e97b', 'description' => 'Servicios de consultoría'],
            ['name' => 'Mantenimiento',     'color' => '#fa709a', 'description' => 'Mantenimiento de sistemas'],
            ['name' => 'Inteligencia Artificial', 'color' => '#a18cd1', 'description' => 'Proyectos de IA y ML'],
        ];

        foreach ($categories as $cat) {
            $exists = $this->db->table('project_categories')->where('name', $cat['name'])->get()->getRowArray();
            if (!$exists) {
                $this->db->table('project_categories')->insert(array_merge($cat, [
                    'is_active'  => 1,
                    'created_at' => date('Y-m-d H:i:s'),
                    'updated_at' => date('Y-m-d H:i:s'),
                ]));
            }
        }

        // Admin por defecto
        $adminExists = $this->db->table('users')->where('username', 'admin')->get()->getRowArray();
        if (!$adminExists) {
            $this->db->table('users')->insert([
                'username'   => 'admin',
                'email'      => 'admin@maewallis.com',
                'password'   => password_hash('Admin1234!', PASSWORD_DEFAULT),
                'first_name' => 'Administrador',
                'last_name'  => 'Sistema',
                'role'       => 'ADMIN',
                'is_active'  => 1,
                'is_verified'=> 1,
                'created_at' => date('Y-m-d H:i:s'),
                'updated_at' => date('Y-m-d H:i:s'),
            ]);
        }

        // Configuración de empresa
        $settingsExists = $this->db->table('company_settings')->get()->getRowArray();
        if (!$settingsExists) {
            $this->db->table('company_settings')->insert([
                'name'       => 'Maewallis Corp',
                'legal_name' => 'Maewallis Corp S.A. de C.V.',
                'updated_at' => date('Y-m-d H:i:s'),
            ]);
        }
    }
}
