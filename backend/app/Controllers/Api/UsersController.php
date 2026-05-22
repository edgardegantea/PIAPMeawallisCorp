<?php

namespace App\Controllers\Api;

use App\Controllers\BaseController;
use App\Libraries\Auth;
use App\Models\UserModel;
use CodeIgniter\HTTP\ResponseInterface;

class UsersController extends BaseController
{
    private UserModel $model;

    public function __construct()
    {
        $this->model = new UserModel();
    }

    /** GET /api/users */
    public function index(): ResponseInterface
    {
        $search = $this->request->getGet('search');
        $role   = $this->request->getGet('role');

        $builder = $this->model->select('id, username, email, first_name, last_name, phone, position, department, role, is_active, created_at');

        if ($search) {
            $builder->groupStart()
                ->like('username', $search)
                ->orLike('first_name', $search)
                ->orLike('last_name', $search)
                ->orLike('email', $search)
                ->groupEnd();
        }

        if ($role) {
            $builder->where('role', $role);
        }

        return $this->response->setJSON($builder->findAll());
    }

    /** GET /api/users/{id} */
    public function show(int $id): ResponseInterface
    {
        $user = $this->model->safeFind($id);
        if (!$user) {
            return $this->response->setStatusCode(404)->setJSON(['message' => 'Usuario no encontrado']);
        }
        return $this->response->setJSON($user);
    }

    /** POST /api/admin/users  — admin creates user */
    public function create(): ResponseInterface
    {
        $data  = $this->request->getJSON(true) ?? $this->request->getPost();
        $rules = [
            'username'   => 'required|min_length[3]|max_length[150]|is_unique[users.username]',
            'email'      => 'required|valid_email|is_unique[users.email]',
            'password'   => 'required|min_length[8]',
            'first_name' => 'permit_empty|max_length[150]',
            'last_name'  => 'permit_empty|max_length[150]',
            'role'       => 'permit_empty|in_list[ADMIN,DIRECTOR,PM,TEAM_MEMBER]',
        ];

        if (!$this->validate($rules)) {
            return $this->response->setStatusCode(422)->setJSON(['errors' => $this->validator->getErrors()]);
        }

        $id = $this->model->insert([
            'username'   => $data['username'],
            'email'      => $data['email'],
            'password'   => password_hash($data['password'], PASSWORD_DEFAULT),
            'first_name' => $data['first_name'] ?? '',
            'last_name'  => $data['last_name']  ?? '',
            'role'       => $data['role'] ?? 'TEAM_MEMBER',
            'position'   => $data['position'] ?? null,
            'department' => $data['department'] ?? null,
            'is_active'  => 1,
            'is_verified'=> 1,
        ]);

        return $this->response->setStatusCode(201)->setJSON($this->model->safeFind($id));
    }

    /** PATCH /api/admin/users/{id} */
    public function update(int $id): ResponseInterface
    {
        $user = $this->model->find($id);
        if (!$user) {
            return $this->response->setStatusCode(404)->setJSON(['message' => 'Usuario no encontrado']);
        }

        $data    = $this->request->getJSON(true) ?? $this->request->getPost();
        $allowed = ['first_name', 'last_name', 'email', 'phone', 'position', 'department', 'role', 'is_active'];
        $update  = array_intersect_key($data, array_flip($allowed));

        // Validate email uniqueness if changing
        if (!empty($update['email']) && $update['email'] !== $user['email']) {
            $exists = (new UserModel())->where('email', $update['email'])->where('id !=', $id)->first();
            if ($exists) {
                return $this->response->setStatusCode(422)->setJSON(['message' => 'El correo ya está en uso por otro usuario']);
            }
        }

        if (!empty($data['password'])) {
            if (strlen($data['password']) < 8) {
                return $this->response->setStatusCode(422)->setJSON(['message' => 'La contraseña debe tener al menos 8 caracteres']);
            }
            $update['password'] = password_hash($data['password'], PASSWORD_DEFAULT);
        }

        if (!empty($update)) {
            $this->model->update($id, $update);
        }

        return $this->response->setJSON($this->model->safeFind($id));
    }

    /** DELETE /api/admin/users/{id}  — soft delete (deactivate) */
    public function delete(int $id): ResponseInterface
    {
        if ($id === Auth::id()) {
            return $this->response->setStatusCode(422)->setJSON(['message' => 'No puedes desactivar tu propia cuenta']);
        }

        $user = $this->model->find($id);
        if (!$user) {
            return $this->response->setStatusCode(404)->setJSON(['message' => 'Usuario no encontrado']);
        }

        $this->model->update($id, ['is_active' => 0]);
        return $this->response->setStatusCode(204)->setBody('');
    }

    /** POST /api/admin/users/{id}/activate */
    public function activate(int $id): ResponseInterface
    {
        $user = $this->model->find($id);
        if (!$user) {
            return $this->response->setStatusCode(404)->setJSON(['message' => 'Usuario no encontrado']);
        }
        $this->model->update($id, ['is_active' => 1]);
        return $this->response->setJSON($this->model->safeFind($id));
    }
}
