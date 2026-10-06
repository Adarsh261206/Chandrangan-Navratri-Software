<?php

declare(strict_types=1);

namespace App\Core;

final class Route
{
    public function __construct(
        public readonly string $method,
        public readonly string $pattern,
        public readonly \Closure $handler,
        public readonly bool $auth,
        public readonly bool $csrf
    ) {
    }
}

final class Router
{
    /** @var list<Route> */
    private array $routes = [];

    public function add(string $method, string $pattern, \Closure $handler, bool $auth = true, bool $csrf = true): void
    {
        $this->routes[] = new Route(strtoupper($method), $pattern, $handler, $auth, $csrf);
    }

    public function get(string $pattern, \Closure $handler, bool $auth = true): void
    {
        $this->add('GET', $pattern, $handler, $auth, false);
    }

    public function post(string $pattern, \Closure $handler, bool $auth = true, bool $csrf = true): void
    {
        $this->add('POST', $pattern, $handler, $auth, $csrf);
    }

    public function put(string $pattern, \Closure $handler, bool $auth = true, bool $csrf = true): void
    {
        $this->add('PUT', $pattern, $handler, $auth, $csrf);
    }

    public function delete(string $pattern, \Closure $handler, bool $auth = true, bool $csrf = true): void
    {
        $this->add('DELETE', $pattern, $handler, $auth, $csrf);
    }

    public function dispatch(Request $request): never
    {
        $matchedPath = false;

        foreach ($this->routes as $route) {
            $regex = $this->compile($route->pattern);
            if (!preg_match($regex, $request->path, $matches)) {
                continue;
            }
            $matchedPath = true;

            if ($route->method !== $request->method) {
                continue;
            }

            if ($route->auth && !Auth::check()) {
                throw ApiException::unauthorized();
            }

            if ($route->csrf && $request->method !== 'GET' && Auth::check()) {
                Csrf::validate($request);
            }

            $params = [];
            foreach ($matches as $key => $value) {
                if (is_string($key)) {
                    $params[$key] = $value;
                }
            }

            $result = ($route->handler)($request, $params);
            if (is_array($result)) {
                Response::success($result['data'] ?? null, (string) ($result['message'] ?? ''));
            }
            Response::success();
        }

        if ($matchedPath) {
            throw new ApiException(405, 'Method not allowed.', 'method_not_allowed');
        }

        throw ApiException::notFound('Endpoint not found.');
    }

    private function compile(string $pattern): string
    {
        $regex = preg_replace('#\{([a-zA-Z_][a-zA-Z0-9_]*)\}#', '(?P<$1>[^/]+)', $pattern);
        return '#^' . $regex . '$#u';
    }
}
