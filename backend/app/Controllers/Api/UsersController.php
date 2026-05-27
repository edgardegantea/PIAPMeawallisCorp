<?php

namespace App\Controllers\Api;

use App\Controllers\BaseController;
use App\Libraries\Auth;
use App\Models\UserModel;
use CodeIgniter\HTTP\ResponseInterface;
use Config\Database;

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
        $authUser = Auth::user();
        $search   = $this->request->getGet('search');
        $role     = $this->request->getGet('role');

        // TEAM_MEMBER: only see active teammates (users sharing at least one project)
        if ($authUser['role'] === 'TEAM_MEMBER') {
            $userId = Auth::id();
            $db     = Database::connect();

            $sql = "
                SELECT DISTINCT u.id, u.username, u.email, u.first_name, u.last_name,
                                u.phone, u.position, u.department, u.role, u.is_active, u.created_at
                FROM users u
                INNER JOIN project_members pm_other ON pm_other.user_id = u.id
                INNER JOIN project_members pm_self  ON pm_self.project_id = pm_other.project_id
                                                   AND pm_self.user_id = ?
                WHERE u.is_active = 1
            ";
            $params = [$userId];

            if ($search) {
                $like    = "%{$search}%";
                $sql    .= " AND (u.username LIKE ? OR u.first_name LIKE ? OR u.last_name LIKE ? OR u.email LIKE ?)";
                $params  = array_merge($params, [$like, $like, $like, $like]);
            }

            if ($role) {
                $sql    .= ' AND u.role = ?';
                $params[] = $role;
            }

            $sql .= ' ORDER BY u.first_name, u.last_name';

            return $this->response->setJSON(
                UserModel::castRows($db->query($sql, $params)->getResultArray())
            );
        }

        // ADMIN / DIRECTOR / PM: full list
        $builder = $this->model->select(
            'id, username, email, first_name, last_name, phone, position, department, role, is_active, created_at'
        );

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

        return $this->response->setJSON(UserModel::castRows($builder->findAll()));
    }

    /** GET /api/users/{id} */
    public function show(int $id): ResponseInterface
    {
        $user = $this->model->safeFind($id);
        if (!$user) {
            return $this->response->setStatusCode(404)->setJSON(['message' => 'Usuario no encontrado']);
        }
        return $this->response->setJSON(UserModel::castRow($user));
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

        return $this->response->setStatusCode(201)->setJSON(
            UserModel::castRow($this->model->safeFind($id))
        );
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

        return $this->response->setJSON(UserModel::castRow($this->model->safeFind($id)));
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

    /**
     * GET /api/admin/users/{id}/assignments
     * Retorna un resumen de lo que tiene asignado el usuario
     * para mostrar en el modal de confirmación antes de eliminar.
     */
    public function assignments(int $id): ResponseInterface
    {
        if ($id === Auth::id()) {
            return $this->response->setStatusCode(422)
                ->setJSON(['message' => 'No puedes eliminarte a ti mismo']);
        }

        $user = $this->model->find($id);
        if (!$user) {
            return $this->response->setStatusCode(404)->setJSON(['message' => 'Usuario no encontrado']);
        }

        $db = Database::connect();

        $projectsDirected = $db->query(
            'SELECT id, name, code, status FROM projects WHERE director_id = ? ORDER BY name',
            [$id]
        )->getResultArray();

        $tasksAssigned = (int) $db->query(
            'SELECT COUNT(*) AS cnt FROM task_assignees WHERE user_id = ?',
            [$id]
        )->getRow()->cnt;

        $timeLogs = (int) $db->query(
            'SELECT COUNT(*) AS cnt FROM task_time_logs WHERE user_id = ?',
            [$id]
        )->getRow()->cnt;

        $comments = (int) $db->query(
            'SELECT COUNT(*) AS cnt FROM task_comments WHERE user_id = ?',
            [$id]
        )->getRow()->cnt;

        return $this->response->setJSON([
            'user'              => UserModel::castRow($user),
            'projects_directed' => $projectsDirected,   // RESTRICT → obligatorio transferir
            'tasks_assigned'    => $tasksAssigned,       // CASCADE si no se transfieren
            'time_logs'         => $timeLogs,            // CASCADE → se pierden
            'comments'          => $comments,            // CASCADE → se pierden
            // Requiere transferencia obligatoria si dirige proyectos
            'transfer_required' => !empty($projectsDirected),
        ]);
    }

    /**
     * DELETE /api/admin/users/{id}/permanent
     * Elimina definitivamente el usuario.
     * Body: { "transfer_to": <userId> | null }
     *
     * Orden de operaciones:
     *  1. Transferir projects.director_id    (RESTRICT → obligatorio si existe)
     *  2. Reasignar task_assignees           (opcional; si no, CASCADE los borra)
     *  3. DELETE users → DB cascade limpia el resto
     */
    public function destroy(int $id): ResponseInterface
    {
        if ($id === Auth::id()) {
            return $this->response->setStatusCode(422)
                ->setJSON(['message' => 'No puedes eliminarte a ti mismo']);
        }

        $user = $this->model->find($id);
        if (!$user) {
            return $this->response->setStatusCode(404)->setJSON(['message' => 'Usuario no encontrado']);
        }

        $data       = $this->request->getJSON(true) ?? [];
        $transferTo = (isset($data['transfer_to']) && is_numeric($data['transfer_to']))
            ? (int) $data['transfer_to']
            : null;

        $db = Database::connect();

        // Verificar que el usuario receptor existe
        if ($transferTo !== null) {
            if ($transferTo === $id) {
                return $this->response->setStatusCode(422)
                    ->setJSON(['message' => 'El usuario de transferencia no puede ser el mismo a eliminar']);
            }
            if (!$this->model->find($transferTo)) {
                return $this->response->setStatusCode(422)
                    ->setJSON(['message' => 'Usuario de transferencia no encontrado']);
            }
        }

        // Si dirige proyectos, la transferencia es obligatoria (FK RESTRICT)
        $directsProjects = (bool) $db->query(
            'SELECT COUNT(*) AS cnt FROM projects WHERE director_id = ?', [$id]
        )->getRow()->cnt;

        if ($directsProjects && $transferTo === null) {
            return $this->response->setStatusCode(422)
                ->setJSON(['message' => 'El usuario dirige proyectos. Debes elegir a quién transferirlos antes de eliminar.']);
        }

        try {
            $db->transStart();

            if ($transferTo !== null) {
                // 1. Transferir dirección de proyectos
                $db->query(
                    'UPDATE projects SET director_id = ? WHERE director_id = ?',
                    [$transferTo, $id]
                );

                // 2. Reasignar task_assignees:
                //    a) Eliminar los que ya están asignados a transfer_to (evita duplicado)
                $db->query(
                    'DELETE FROM task_assignees
                     WHERE user_id = ?
                       AND task_id IN (
                           SELECT task_id FROM (
                               SELECT task_id FROM task_assignees WHERE user_id = ?
                           ) AS already_assigned
                       )',
                    [$id, $transferTo]
                );
                //    b) Reasignar el resto
                $db->query(
                    'UPDATE task_assignees SET user_id = ? WHERE user_id = ?',
                    [$transferTo, $id]
                );

                // 3. Actualizar tasks.assigned_to (campo de legado, primer asignado)
                $db->query(
                    'UPDATE tasks SET assigned_to = ? WHERE assigned_to = ?',
                    [$transferTo, $id]
                );

                // 4. Transferir incidentes asignados
                $db->query(
                    'UPDATE incidents SET assigned_to = ? WHERE assigned_to = ?',
                    [$transferTo, $id]
                );

                // 5. Reasignar PM membership si no existe ya
                // (el miembro eliminado será quitado por CASCADE, pero si era PM
                //  y transfer_to no es miembro, agregar como miembro)
                $pmProjects = $db->query(
                    'SELECT project_id FROM project_members WHERE user_id = ? AND role = ?',
                    [$id, 'PM']
                )->getResultArray();
                foreach ($pmProjects as $pm) {
                    $alreadyMember = (bool) $db->query(
                        'SELECT 1 FROM project_members WHERE project_id = ? AND user_id = ?',
                        [$pm['project_id'], $transferTo]
                    )->getRow();
                    if (!$alreadyMember) {
                        $db->query(
                            'INSERT INTO project_members (project_id, user_id, role) VALUES (?, ?, ?)',
                            [$pm['project_id'], $transferTo, 'PM']
                        );
                    }
                }
            } else {
                // Sin transferencia: solo nullificar director (ya verificamos que no hay proyectos)
                $db->query(
                    'UPDATE projects SET director_id = NULL WHERE director_id = ?', [$id]
                );
            }

            // Eliminar el usuario — el resto lo maneja CASCADE:
            //   task_assignees, task_time_logs, task_comments, project_members,
            //   user_favorites, refresh_tokens → CASCADE
            //   tasks.assigned_to, incidents.assigned_to, risks.owner_id → SET NULL
            $db->query('DELETE FROM users WHERE id = ?', [$id]);

            $db->transComplete();

            if ($db->transStatus() === false) {
                throw new \RuntimeException('Transacción fallida');
            }

            return $this->response->setStatusCode(204)->setBody('');
        } catch (\Throwable $e) {
            log_message('error', '[UsersController::destroy] ' . $e->getMessage());
            return $this->response->setStatusCode(500)
                ->setJSON(['message' => 'Error al eliminar el usuario: ' . $e->getMessage()]);
        }
    }

    /** POST /api/admin/users/{id}/activate */
    public function activate(int $id): ResponseInterface
    {
        $user = $this->model->find($id);
        if (!$user) {
            return $this->response->setStatusCode(404)->setJSON(['message' => 'Usuario no encontrado']);
        }
        $this->model->update($id, ['is_active' => 1]);
        return $this->response->setJSON(UserModel::castRow($this->model->safeFind($id)));
    }

    /** POST /api/admin/users/{id}/reset-password — admin envía enlace de recuperación */
    public function sendResetEmail(int $id): ResponseInterface
    {
        $user = $this->model->find($id);
        if (!$user) {
            return $this->response->setStatusCode(404)->setJSON(['message' => 'Usuario no encontrado']);
        }
        if (empty($user['email'])) {
            return $this->response->setStatusCode(422)->setJSON(['message' => 'El usuario no tiene email registrado']);
        }

        try {
            $resetModel = new \App\Models\PasswordResetModel();
            $token      = $resetModel->generate($user['email']);
        } catch (\Throwable $e) {
            log_message('error', '[AdminResetEmail] Error: ' . $e->getMessage());
            return $this->response->setStatusCode(500)->setJSON(['message' => 'Error al generar el enlace']);
        }

        $frontendUrl = rtrim((string)(env('APP_FRONTEND_URL') ?? 'https://piap.maewalliscorp.org'), '/');
        $resetLink   = "{$frontendUrl}/reset-password?token={$token}";

        if (!\App\Libraries\MailService::sendPasswordReset($user, $resetLink)) {
            return $this->response->setStatusCode(500)->setJSON(['message' => 'Error al enviar el correo']);
        }

        return $this->response->setJSON(['message' => "Enlace enviado a {$user['email']}"]);
    }
}
