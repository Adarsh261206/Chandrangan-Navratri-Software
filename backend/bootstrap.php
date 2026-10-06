<?php

declare(strict_types=1);

require __DIR__ . '/autoload.php';

$config = new \App\Core\AppConfig(require __DIR__ . '/config/config.php');

date_default_timezone_set((string) $config->get('app.timezone', 'UTC'));

$debug = (bool) $config->get('app.debug', false);
ini_set('display_errors', $debug ? '1' : '0');
ini_set('log_errors', '1');
ini_set('error_log', (string) $config->get('storage.log_file'));
error_reporting(E_ALL);

// Never leak PHP version / server details in headers.
header_remove('X-Powered-By');

return $config;
