<?php

declare(strict_types=1);

/** @var AppConfig $config */
$config = require __DIR__ . '/bootstrap.php';

use App\Controllers\AgeGroupController;
use App\Controllers\AuthController;
use App\Controllers\DashboardController;
use App\Controllers\HealthController;
use App\Controllers\ParticipantController;
use App\Controllers\ResultController;
use App\Core\ApiException;
use App\Core\Database;
use App\Core\RateLimiter;
use App\Core\Request;
use App\Core\Response;
use App\Core\Router;
use App\Core\Session;

Database::init($config);
RateLimiter::configure((string) $config->get('storage.rate_limit_dir'));

// CORS (only when explicitly configured; the SPA is same-origin in production).
$corsOrigin = (string) $config->get('app.cors_origin', '');
if ($corsOrigin !== '') {
    header('Access-Control-Allow-Origin: ' . $corsOrigin);
    header('Access-Control-Allow-Credentials: true');
    header('Access-Control-Allow-Headers: Content-Type, X-CSRF-Token');
    header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
}
if (($_SERVER['REQUEST_METHOD'] ?? 'GET') === 'OPTIONS') {
    http_response_code(204);
    exit;
}

Session::start($config);

$request = Request::capture($config);

$router = new Router();

// --- Auth -----------------------------------------------------------------
$router->post('/auth/login', static fn (Request $r) => AuthController::login($r, $config), auth: false, csrf: false);
$router->post('/auth/logout', static fn () => AuthController::logout($config));
$router->get('/auth/me', static fn () => AuthController::me($config));
$router->post('/auth/change-password', static fn (Request $r) => AuthController::changePassword($r, $config));

// --- Dashboard -------------------------------------------------------------
$router->get('/dashboard/stats', static fn () => DashboardController::stats($config));

// --- Age groups ------------------------------------------------------------
$router->get('/age-groups', static fn () => AgeGroupController::index($config));
$router->get('/age-groups/{id}', static fn (Request $r, array $p) => AgeGroupController::show($p, $config));
$router->post('/age-groups', static fn (Request $r) => AgeGroupController::store($r, $config));
$router->post('/age-groups/reorder', static fn (Request $r) => AgeGroupController::reorder($r, $config));
$router->put('/age-groups/{id}', static fn (Request $r, array $p) => AgeGroupController::update($r, $p, $config));
$router->delete('/age-groups/{id}', static fn (Request $r, array $p) => AgeGroupController::destroy($r, $p, $config));

// --- Participants ----------------------------------------------------------
$router->get('/participants', static fn (Request $r) => ParticipantController::index($r, $config));
$router->get('/participants/search', static fn (Request $r) => ParticipantController::search($r, $config));
$router->get('/participants/check-duplicate', static fn (Request $r) => ParticipantController::checkDuplicate($r, $config));
$router->post('/participants', static fn (Request $r) => ParticipantController::store($r, $config));
$router->get('/participants/{id}', static fn (Request $r, array $p) => ParticipantController::show($r, $p, $config));
$router->delete('/participants/{id}', static fn (Request $r, array $p) => ParticipantController::destroy($r, $p, $config));

// --- Results (public) ------------------------------------------------------
$router->get('/results', static fn (Request $r) => ResultController::index($r, $config), auth: false);

// --- Health ----------------------------------------------------------------
$router->get('/health', static fn () => HealthController::check($config), auth: false);

try {
    $router->dispatch($request);
} catch (ApiException $e) {
    Response::error($e->getMessage(), $e->status, $e->apiCode, $e->extra);
} catch (Throwable $e) {
    error_log('[navratrotsav] ' . $e->getMessage() . ' @ ' . $e->getFile() . ':' . $e->getLine());
    Response::error('Something went wrong. Please try again.', 500, 'server_error');
}
