<?php

declare(strict_types=1);

namespace App\Core;

final class Request
{
    public readonly string $method;
    public readonly string $path;
    /** @var array<string, mixed> */
    public readonly array $query;
    /** @var array<string, mixed> */
    public readonly array $body;
    /** @var array<string, mixed> */
    public readonly array $files;
    private array $headers = [];

    private function __construct(
        string $method,
        string $path,
        array $query,
        array $body,
        array $files
    ) {
        $this->method = $method;
        $this->path = $path;
        $this->query = $query;
        $this->body = $body;
        $this->files = $files;
        $this->headers = self::collectHeaders();
    }

    public static function capture(AppConfig $config): self
    {
        $method = strtoupper($_SERVER['REQUEST_METHOD'] ?? 'GET');
        $uriPath = parse_url($_SERVER['REQUEST_URI'] ?? '/', PHP_URL_PATH);
        $uriPath = is_string($uriPath) ? $uriPath : '/';

        $path = self::resolvePath($uriPath, $config);

        $query = $_GET;
        $body = [];
        $contentType = strtolower($_SERVER['CONTENT_TYPE'] ?? '');

        if (str_contains($contentType, 'application/json')) {
            $raw = file_get_contents('php://input');
            if (is_string($raw) && $raw !== '') {
                $decoded = json_decode($raw, true);
                if (is_array($decoded)) {
                    $body = $decoded;
                }
            }
        } elseif ($method === 'POST') {
            $body = $_POST;
        } elseif (in_array($method, ['PUT', 'PATCH', 'DELETE'], true)) {
            $raw = file_get_contents('php://input');
            if (is_string($raw) && $raw !== '') {
                $decoded = json_decode($raw, true);
                if (is_array($decoded)) {
                    $body = $decoded;
                } else {
                    parse_str($raw, $body);
                }
            }
        }

        return new self($method, $path, $query, $body, $_FILES);
    }

    /**
     * Derives the route path by stripping the mount directory (e.g. "/api")
     * and any PATH_INFO suffix from the request URI.
     */
    private static function resolvePath(string $uriPath, AppConfig $config): string
    {
        $pathInfo = $_SERVER['PATH_INFO'] ?? '';
        if (is_string($pathInfo) && $pathInfo !== '') {
            $path = $pathInfo;
        } else {
            $scriptName = (string) ($_SERVER['SCRIPT_NAME'] ?? '');
            $base = str_replace('\\', '/', dirname($scriptName));
            if (in_array($base, ['/', '.', ''], true)) {
                $base = '';
            }

            $path = $uriPath;
            if ($base !== '' && str_starts_with($path, $base)) {
                $path = substr($path, strlen($base));
            }
        }

        $override = (string) $config->get('app.base_path', '');
        if ($override !== '' && str_starts_with($path, $override)) {
            $path = substr($path, strlen($override));
        }

        if ($path === '' || $path[0] !== '/') {
            $path = '/' . $path;
        }

        return rtrim($path, '/') ?: '/';
    }

    /** @return array<string, string> */
    private static function collectHeaders(): array
    {
        $headers = [];
        foreach ($_SERVER as $key => $value) {
            if (str_starts_with($key, 'HTTP_')) {
                $name = str_replace('_', '-', strtolower(substr($key, 5)));
                $headers[$name] = (string) $value;
            }
        }
        if (isset($_SERVER['CONTENT_TYPE'])) {
            $headers['content-type'] = (string) $_SERVER['CONTENT_TYPE'];
        }
        return $headers;
    }

    public function header(string $name): ?string
    {
        return $this->headers[strtolower($name)] ?? null;
    }

    public function input(string $key, mixed $default = null): mixed
    {
        return $this->body[$key] ?? $this->query[$key] ?? $default;
    }

    public function queryParam(string $key, mixed $default = null): mixed
    {
        return $this->query[$key] ?? $default;
    }

    public function intParam(string $key, int $default = 0): int
    {
        $value = $this->query[$key] ?? null;
        if ($value === null || $value === '' || !is_numeric($value)) {
            return $default;
        }
        return (int) $value;
    }

    public function stringParam(string $key, string $default = ''): string
    {
        $value = $this->query[$key] ?? null;
        return is_string($value) ? trim($value) : $default;
    }

    public function isJson(): bool
    {
        return str_contains(strtolower($this->header('content-type') ?? ''), 'application/json');
    }
}
