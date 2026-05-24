<?php

namespace App\Commands;

use CodeIgniter\CLI\BaseCommand;
use CodeIgniter\CLI\CLI;

class EmailTest extends BaseCommand
{
    /**
     * The Command's Group
     *
     * @var string
     */
    protected $group = 'Email';

    /**
     * The Command's Name
     *
     * @var string
     */
    protected $name = 'email:test';

    /**
     * The Command's Description
     *
     * @var string
     */
    protected $description = '';

    /**
     * The Command's Usage
     *
     * @var string
     */
    protected $usage = 'email:test';

    /**
     * The Command's Arguments
     *
     * @var array
     */
    protected $arguments = [];

    /**
     * The Command's Options
     *
     * @var array
     */
    protected $options = [];

    /**
     * Actually execute a command.
     *
     * @param array $params
     */
    public function run(array $params)
    {
        $email = \Config\Services::email();

        // Cambia esto por tu correo de pruebas
        $para = 'dejnej13@gmail.com';

        $email->setTo($para);
        $email->setSubject('Prueba desde Spark Command');
        $email->setMessage('Este es un test ejecutado desde la terminal con un comando personalizado.');

        if ($email->send()) {
            CLI::write('✅ ¡El correo se envió con éxito!', 'green');
        } else {
            CLI::error('❌ Error al enviar el correo.');
            CLI::write($email->printDebugger(['headers']));
        }
    }
}
