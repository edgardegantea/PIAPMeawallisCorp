<?php

namespace App\Commands;

use CodeIgniter\CLI\BaseCommand;
use CodeIgniter\CLI\CLI;
use CodeIgniter\Email\Email;

/**
 * php spark email:test [destino@email.com]
 *
 * Diagnostica la configuracion SMTP mostrando el handshake completo.
 * Util para verificar conectividad en el servidor de produccion.
 */
class EmailTest extends BaseCommand
{
    protected $group       = 'Email';
    protected $name        = 'email:test';
    protected $description = 'Prueba la configuracion SMTP y muestra diagnostico completo.';
    protected $usage       = 'email:test [destinatario@ejemplo.com]';
    protected $arguments   = [
        'to' => '(Opcional) Direccion de destino. Por defecto: la cuenta SMTP configurada.',
    ];
    protected $options = [];

    public function run(array $params)
    {
        $cfg  = config('Email');
        $para = $params[0] ?? $cfg->fromEmail;
        $date = date('d/m/Y H:i:s');

        CLI::write('');
        CLI::write('=== PIAP Email Diagnostic ===', 'yellow');
        CLI::write("Host    : {$cfg->SMTPHost}:{$cfg->SMTPPort} ({$cfg->SMTPCrypto})");
        CLI::write("Usuario : {$cfg->SMTPUser}");
        CLI::write("Destino : {$para}");
        CLI::write('');

        // Crear instancia fresca directamente (evita shared instance de CI4)
        $mailer = new Email();
        $mailer->initialize([
            'protocol'       => 'smtp',
            'SMTPHost'       => $cfg->SMTPHost,
            'SMTPUser'       => $cfg->SMTPUser,
            'SMTPPass'       => $cfg->SMTPPass,
            'SMTPPort'       => $cfg->SMTPPort,
            'SMTPCrypto'     => $cfg->SMTPCrypto,
            'SMTPTimeout'    => $cfg->SMTPTimeout,
            'SMTPKeepAlive'  => false,
            'SMTPAuthMethod' => 'login',
            'mailType'       => 'html',
            'charset'        => 'UTF-8',
            'wordWrap'       => true,
            'validate'       => false,
            'newline'        => "\r\n",
            'CRLF'           => "\r\n",
        ]);

        $mailer->setFrom($cfg->fromEmail, 'PIAP - MaeWallisCorp');
        $mailer->setTo($para);
        $mailer->setSubject('Prueba SMTP - PIAP MaeWallisCorp');
        $mailer->setMessage(
            '<html><body style="font-family:Arial,sans-serif;padding:24px">'
            . '<h2 style="color:#4f46e5">PIAP - MaeWallisCorp</h2>'
            . '<p>Correo de prueba generado con <code>php spark email:test</code>.</p>'
            . '<p>Si recibes este mensaje, la configuracion SMTP es correcta.</p>'
            . "<p style='color:#64748b;font-size:12px'>Enviado: {$date}</p>"
            . '</body></html>'
        );

        CLI::write('Enviando...', 'yellow');
        $ok = $mailer->send(false);

        CLI::write('');
        CLI::write('--- Debug completo ---', 'light_gray');
        // printDebugger acepta: headers | subject | body
        CLI::write(strip_tags($mailer->printDebugger(['headers', 'subject'])));
        CLI::write('');

        if ($ok) {
            CLI::write('✅  Correo enviado con exito.', 'green');
        } else {
            CLI::error('❌  Error al enviar. Revisa el debug de arriba y writable/logs/.');
            exit(1);
        }
    }
}
