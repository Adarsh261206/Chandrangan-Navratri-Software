<?php

declare(strict_types=1);

namespace App\Core;

final class AppConfig
{
    private array $values;

    public function __construct(array $values)
    {
        $this->values = $values;
    }

    public function get(string $path, mixed $default = null): mixed
    {
        $segments = explode('.', $path);
        $value = $this->values;
        foreach ($segments as $segment) {
            if (!is_array($value) || !array_key_exists($segment, $value)) {
                return $default;
            }
            $value = $value[$segment];
        }
        return $value;
    }

    public function all(): array
    {
        return $this->values;
    }
}
