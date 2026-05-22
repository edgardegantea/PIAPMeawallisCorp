<?php

namespace App\Libraries;

use CodeIgniter\Debug\ExceptionHandlerInterface;
use CodeIgniter\HTTP\RequestInterface;
use CodeIgniter\HTTP\ResponseInterface;
use Config\Exceptions as ExceptionsConfig;
use Throwable;

/**
 * Maneja excepciones en rutas /api/* devolviendo JSON limpio.
 * Agrega headers CORS manualmente porque el filtro CORS `after`
 * no se ejecuta cuando send() se llama desde el exception handler.
 */
class ApiExceptionHandler implements ExceptionHandlerInterface
{
    public function __construct(private readonly ExceptionsConfig $config)
    {
    }

    public function handle(
        Throwable $exception,
        RequestInterface $request,
        ResponseInterface $response,
        int $statusCode,
        int $exitCode
    ): void {
        $message = $exception->getMessage();

        // En producción, no exponer mensajes internos en errores 5xx
        if (ENVIRONMENT === 'production' && $statusCode >= 500) {
            $message = 'Error interno del servidor';
        }

        // Agregar CORS manualmente — el filtro `after` no corre cuando
        // el handler llama send() directamente.
        $this->addCorsHeaders($request, $response);

        $response
            ->setStatusCode($statusCode)
            ->setContentType('application/json')
            ->setBody(json_encode([
                'message' => $message,
                'status'  => $statusCode,
            ], JSON_UNESCAPED_UNICODE))
            ->send();
    }

    private function addCorsHeaders(RequestInterface $request, ResponseInterface $response): void
    {
        $origin  = $request->getHeaderLine('Origin');
        $allowed = config('Cors')->default['allowedOrigins'] ?? [];

        if ($origin && in_array($origin, $allowed, true)) {
            $response->setHeader('Access-Control-Allow-Origin',      $origin);
            $response->setHeader('Access-Control-Allow-Credentials', 'true');
            $response->setHeader('Vary',                             'Origin');
        }
    }
}
