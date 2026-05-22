<?php

namespace App\Controllers\Api;

use App\Controllers\BaseController;
use App\Libraries\Auth;
use App\Models\CompanySettingsModel;
use CodeIgniter\HTTP\ResponseInterface;

class CompanySettingsController extends BaseController
{
    private CompanySettingsModel $model;

    public function __construct()
    {
        $this->model = new CompanySettingsModel();
    }

    public function show(): ResponseInterface
    {
        if (Auth::user()['role'] === 'TEAM_MEMBER') {
            return $this->response->setStatusCode(403)->setJSON(['message' => 'Acceso restringido']);
        }
        return $this->response->setJSON($this->model->getSettings());
    }

    public function update(): ResponseInterface
    {
        if (Auth::user()['role'] === 'TEAM_MEMBER') {
            return $this->response->setStatusCode(403)->setJSON(['message' => 'No tienes permisos para esta acción']);
        }
        $settings = $this->model->getSettings();
        $data     = $this->request->getJSON(true) ?? $this->request->getPost();

        $allowed = ['name', 'legal_name', 'representative_name', 'rfc', 'tax_regime', 'address', 'zip_code', 'email', 'phone', 'website'];
        $update  = array_intersect_key($data, array_flip($allowed));
        $update['updated_at'] = date('Y-m-d H:i:s');

        $this->model->update($settings['id'], $update);
        return $this->response->setJSON($this->model->getSettings());
    }
}
