<?php

namespace App\Filters;

use CodeIgniter\Filters\FilterInterface;
use CodeIgniter\HTTP\RequestInterface;
use CodeIgniter\HTTP\ResponseInterface;

class CorsFilter implements FilterInterface
{
    /**
     * Orígenes permitidos.
     * Agrega aquí cualquier dominio que necesite consumir la API.
     */
    private array $allowed = [
        'https://piap.maewalliscorp.org',
        'http://localhost:5173',
        'http://localhost:5174',
        'http://localhost:3000',
    ];

    public function before(RequestInterface $request, $arguments = null)
    {
        $response = service('response');
        $origin   = $request->getHeaderLine('Origin');

        $allowedOrigin = in_array($origin, $this->allowed, true) ? $origin : $this->allowed[0];

        $response
            ->setHeader('Access-Control-Allow-Origin',      $allowedOrigin)
            ->setHeader('Access-Control-Allow-Credentials', 'true')
            ->setHeader('Access-Control-Allow-Methods',     'GET, POST, PUT, PATCH, DELETE, OPTIONS')
            ->setHeader('Access-Control-Allow-Headers',     'Content-Type, Authorization, X-Requested-With')
            ->setHeader('Access-Control-Max-Age',           '86400');

        // Responder preflight OPTIONS directamente sin pasar por rutas
        if (strtoupper($request->getMethod()) === 'OPTIONS') {
            return $response->setStatusCode(204)->setBody('');
        }
    }

    public function after(RequestInterface $request, ResponseInterface $response, $arguments = null)
    {
        // Headers ya aplicados en before()
    }
}
