<?php

namespace App\Controllers\Api;

use App\Controllers\BaseController;
use App\Models\ProjectCategoryModel;
use CodeIgniter\HTTP\ResponseInterface;

class CategoriesController extends BaseController
{
    private ProjectCategoryModel $model;

    public function __construct()
    {
        $this->model = new ProjectCategoryModel();
    }

    public function index(): ResponseInterface
    {
        return $this->response->setJSON($this->model->where('is_active', 1)->findAll());
    }

    public function show(int $id): ResponseInterface
    {
        $cat = $this->model->find($id);
        if (!$cat) {
            return $this->response->setStatusCode(404)->setJSON(['message' => 'Categoría no encontrada']);
        }
        return $this->response->setJSON($cat);
    }

    public function create(): ResponseInterface
    {
        $data  = $this->request->getJSON(true) ?? $this->request->getPost();
        $rules = ['name' => 'required|max_length[100]|is_unique[project_categories.name]'];

        if (!$this->validate($rules)) {
            return $this->response->setStatusCode(422)->setJSON(['errors' => $this->validator->getErrors()]);
        }

        $id = $this->model->insert($data);
        return $this->response->setStatusCode(201)->setJSON($this->model->find($id));
    }

    public function update(int $id): ResponseInterface
    {
        if (!$this->model->find($id)) {
            return $this->response->setStatusCode(404)->setJSON(['message' => 'Categoría no encontrada']);
        }
        $data = $this->request->getJSON(true) ?? $this->request->getPost();
        $this->model->update($id, $data);
        return $this->response->setJSON($this->model->find($id));
    }

    public function delete(int $id): ResponseInterface
    {
        if (!$this->model->find($id)) {
            return $this->response->setStatusCode(404)->setJSON(['message' => 'Categoría no encontrada']);
        }
        $this->model->update($id, ['is_active' => 0]);
        return $this->response->setStatusCode(204)->setBody('');
    }
}
