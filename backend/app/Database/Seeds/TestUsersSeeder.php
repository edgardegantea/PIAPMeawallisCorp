<?php

namespace App\Database\Seeds;

use CodeIgniter\Database\Seeder;

class TestUsersSeeder extends Seeder
{
    public function run(): void
    {
        $users = [
            [
                'username'   => 'test.admin',
                'email'      => 'test.admin@test.com',
                'password'   => 'Admin1234!',
                'first_name' => 'Admin',
                'last_name'  => 'De Prueba',
                'role'       => 'ADMIN',
                'position'   => 'Administrador del Sistema',
                'department' => 'TI',
                'phone'      => '+52 55 0000 0001',
            ],
            [
                'username'   => 'test.director',
                'email'      => 'test.director@test.com',
                'password'   => 'Director1234!',
                'first_name' => 'Director',
                'last_name'  => 'De Prueba',
                'role'       => 'DIRECTOR',
                'position'   => 'Director de Proyectos',
                'department' => 'Dirección General',
                'phone'      => '+52 55 0000 0002',
            ],
            [
                'username'   => 'test.pm',
                'email'      => 'test.pm@test.com',
                'password'   => 'Pm1234!',
                'first_name' => 'ProjectManager',
                'last_name'  => 'De Prueba',
                'role'       => 'PM',
                'position'   => 'Project Manager',
                'department' => 'Gestión de Proyectos',
                'phone'      => '+52 55 0000 0003',
            ],
            [
                'username'   => 'test.member',
                'email'      => 'test.member@test.com',
                'password'   => 'Member1234!',
                'first_name' => 'TeamMember',
                'last_name'  => 'De Prueba',
                'role'       => 'TEAM_MEMBER',
                'position'   => 'Desarrollador',
                'department' => 'Ingeniería',
                'phone'      => '+52 55 0000 0004',
            ],
        ];

        $db = \Config\Database::connect();

        foreach ($users as $data) {
            $exists = $db->table('users')->where('username', $data['username'])->get()->getFirstRow();
            if ($exists) {
                // Actualizar contraseña por si cambió
                $db->table('users')->where('username', $data['username'])->update([
                    'password'  => password_hash($data['password'], PASSWORD_DEFAULT),
                    'is_active' => 1,
                ]);
                echo "  ↻ Actualizado: {$data['username']}\n";
            } else {
                $db->table('users')->insert([
                    'username'    => $data['username'],
                    'email'       => $data['email'],
                    'password'    => password_hash($data['password'], PASSWORD_DEFAULT),
                    'first_name'  => $data['first_name'],
                    'last_name'   => $data['last_name'],
                    'role'        => $data['role'],
                    'position'    => $data['position'],
                    'department'  => $data['department'],
                    'phone'       => $data['phone'],
                    'is_active'   => 1,
                    'is_verified' => 1,
                    'created_at'  => date('Y-m-d H:i:s'),
                    'updated_at'  => date('Y-m-d H:i:s'),
                ]);
                echo "  ✓ Creado: {$data['username']}\n";
            }
        }
    }
}
