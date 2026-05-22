<?php

namespace App\Controllers\Api;

use App\Controllers\BaseController;
use App\Libraries\Auth;
use App\Models\UserAchievementModel;
use CodeIgniter\HTTP\ResponseInterface;

class AchievementsController extends BaseController
{
    private UserAchievementModel $model;

    public function __construct()
    {
        $this->model = new UserAchievementModel();
    }

    /** GET /api/profile/achievements */
    public function index(): ResponseInterface
    {
        return $this->response->setJSON(
            $this->model->findByUser(Auth::id())
        );
    }

    /** POST /api/profile/achievements */
    public function create(): ResponseInterface
    {
        $data = $this->request->getJSON(true) ?? $this->request->getPost();

        if (empty($data['title'])) {
            return $this->response->setStatusCode(422)
                ->setJSON(['message' => 'El título del logro es requerido']);
        }

        $id = $this->model->insert([
            'user_id'          => Auth::id(),
            'title'            => $data['title'],
            'description'      => $data['description']      ?? null,
            'achievement_date' => $data['achievement_date'] ?? null,
            'created_at'       => date('Y-m-d H:i:s'),
        ]);

        return $this->response->setStatusCode(201)
            ->setJSON($this->model->find($id));
    }

    /** PATCH /api/profile/achievements/:id */
    public function update(int $id): ResponseInterface
    {
        $item = $this->model->find($id);
        if (!$item || $item['user_id'] !== Auth::id()) {
            return $this->response->setStatusCode(404)
                ->setJSON(['message' => 'Logro no encontrado']);
        }

        $data    = $this->request->getJSON(true) ?? $this->request->getPost();
        $allowed = ['title', 'description', 'achievement_date'];
        $update  = array_intersect_key($data, array_flip($allowed));

        if (!empty($update)) {
            $this->model->update($id, $update);
        }

        return $this->response->setJSON($this->model->find($id));
    }

    /** DELETE /api/profile/achievements/:id */
    public function delete(int $id): ResponseInterface
    {
        $item = $this->model->find($id);
        if (!$item || $item['user_id'] !== Auth::id()) {
            return $this->response->setStatusCode(404)
                ->setJSON(['message' => 'Logro no encontrado']);
        }

        $this->model->delete($id);
        return $this->response->setStatusCode(204)->setBody('');
    }
}
