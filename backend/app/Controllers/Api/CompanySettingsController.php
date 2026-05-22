<?php

namespace App\Controllers\Api;

use App\Controllers\BaseController;
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
        return $this->response->setJSON($this->model->getSettings());
    }

    public function update(): ResponseInterface
    {
        $settings = $this->model->getSettings();
        $data     = $this->request->getJSON(true) ?? $this->request->getPost();

        $allowed = ['name', 'legal_name', 'representative_name', 'rfc', 'tax_regime', 'address', 'zip_code', 'email', 'phone', 'website'];
        $update  = array_intersect_key($data, array_flip($allowed));
        $update['updated_at'] = date('Y-m-d H:i:s');

        $this->model->update($settings['id'], $update);
        return $this->response->setJSON($this->model->getSettings());
    }
}
