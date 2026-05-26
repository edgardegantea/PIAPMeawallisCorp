<?php

namespace App\Commands;

use App\Libraries\MailService;
use CodeIgniter\CLI\BaseCommand;
use CodeIgniter\CLI\CLI;

class EmailTest extends BaseCommand
{
    protected $group       = 'Email';
    protected $name        = 'email:test';
    protected $description = 'Envía un correo de prueba para verificar la configuración SMTP.';
    protected $usage       = 'email:test [destinatario@ejemplo.com]';
    protected $arguments   = [
        'to' => '(Opcional) Dirección de destino. Por defecto: la cuenta configurada en Config/Email.php',
    ];
    protected $options = [];

    public function run(array $params)
    {
        $cfg  = config('Email');
        $para = $params[0] ?? $cfg->fromEmail;
        $date = date('d/m/Y H:i:s');

        CLI::write("📧  Enviando correo de prueba a: {$para}", 'yellow');

        $htmlBody = '<html lang="es"><head><meta charset="UTF-8"></head>'
            . '<body style="font-family:Arial,sans-serif;padding:32px;background:#f1f5f9">'
            . '<div style="max-width:520px;margin:auto;background:#fff;border-radius:12px;padding:36px;box-shadow:0 2px 8px rgba(0,0,0,.08)">'
            . '<h2 style="color:#4f46e5;margin-top:0">PIAP — MaeWallisCorp</h2>'
            . '<p>Este es un correo de prueba generado por el comando <code>php spark email:test</code>.</p>'
            . '<p>Si recibes este mensaje, la configuración SMTP está funcionando correctamente.</p>'
            . '<hr style="border:none;border-top:1px solid #e2e8f0;margin:24px 0">'
            . '<p style="font-size:12px;color:#94a3b8">Enviado el: <strong>' . $date . '</strong></p>'
            . '</div></body></html>';

        $ok = MailService::send($para, 'Prueba de correo — PIAP MaeWallisCorp', $htmlBody);

        if ($ok) {
            CLI::write('✅  ¡Correo enviado con éxito!', 'green');
        } else {
            CLI::error('❌  Error al enviar el correo. Revisa los logs en writable/logs/.');
        }
    }
}
