<?php

namespace Config;

use App\Libraries\ApiExceptionHandler;
use CodeIgniter\Config\BaseConfig;
use CodeIgniter\Debug\ExceptionHandler;
use CodeIgniter\Debug\ExceptionHandlerInterface;
use Psr\Log\LogLevel;
use Throwable;

class Exceptions extends BaseConfig
{
    public bool   $log                  = true;
    public array  $ignoreCodes          = [404];
    public string $errorViewPath        = APPPATH . 'Views/errors';
    public array  $sensitiveDataInTrace = [];
    public bool   $logDeprecations      = true;
    public string $deprecationLogLevel  = LogLevel::WARNING;

    public function handler(int $statusCode, Throwable $exception): ExceptionHandlerInterface
    {
        // Rutas /api/* siempre responden JSON limpio
        $uri = service('request')->getUri()->getPath();
        if (str_starts_with($uri, 'api/') || str_starts_with($uri, '/api/')) {
            return new ApiExceptionHandler($this);
        }

        return new ExceptionHandler($this);
    }
}
