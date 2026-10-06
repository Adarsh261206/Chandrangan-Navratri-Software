<?php

declare(strict_types=1);

namespace App\Core;

final class Validator
{
    /**
     * Validates and normalises input against a rule map.
     *
     * Rules: required|string|int|numeric|min:n|max:n|min_len:n|max_len:n|in:a,b,c|email|trim|lower|upper
     *
     * @param array<string, mixed> $input
     * @param array<string, string> $rules
     * @return array<string, mixed> Cleaned values (only for provided/validated keys).
     * @throws ApiException
     */
    public static function check(array $input, array $rules): array
    {
        $errors = [];
        $clean = [];

        foreach ($rules as $field => $ruleString) {
            $ruleList = array_map('trim', explode('|', $ruleString));
            $isRequired = in_array('required', $ruleList, true);
            $value = $input[$field] ?? null;

            if ($value === null || $value === '') {
                if ($isRequired) {
                    $errors[$field] = ucfirst(str_replace('_', ' ', $field)) . ' is required.';
                }
                continue;
            }

            if (in_array('trim', $ruleList, true) && is_string($value)) {
                $value = trim($value);
            }

            if (in_array('string', $ruleList, true) && !is_string($value)) {
                $errors[$field] = ucfirst(str_replace('_', ' ', $field)) . ' must be text.';
                continue;
            }

            if (in_array('int', $ruleList, true)) {
                if (is_string($value)) {
                    $value = trim($value);
                }
                if (!is_numeric($value) || (string) (int) $value !== (string) $value) {
                    $errors[$field] = ucfirst(str_replace('_', ' ', $field)) . ' must be a whole number.';
                    continue;
                }
                $value = (int) $value;
            }

            if (in_array('lower', $ruleList, true) && is_string($value)) {
                $value = mb_strtolower($value);
            }

            if (in_array('upper', $ruleList, true) && is_string($value)) {
                $value = mb_strtoupper($value);
            }

            if (in_array('email', $ruleList, true) && (!is_string($value) || !filter_var($value, FILTER_VALIDATE_EMAIL))) {
                $errors[$field] = 'Please enter a valid email address.';
                continue;
            }

            if (is_string($value)) {
                if (in_array('min_len', $ruleList, true)) {
                    $min = self::ruleValue($ruleList, 'min_len');
                    if (mb_strlen($value) < $min) {
                        $errors[$field] = 'Must be at least ' . $min . ' characters.';
                        continue;
                    }
                }
                if (in_array('max_len', $ruleList, true)) {
                    $max = self::ruleValue($ruleList, 'max_len');
                    if (mb_strlen($value) > $max) {
                        $errors[$field] = 'Must be ' . $max . ' characters or fewer.';
                        continue;
                    }
                }
            }

            if ((in_array('min', $ruleList, true) || in_array('max', $ruleList, true)) && is_numeric($value)) {
                if (in_array('min', $ruleList, true) && $value < self::ruleValue($ruleList, 'min')) {
                    $errors[$field] = 'Must be at least ' . self::ruleValue($ruleList, 'min') . '.';
                    continue;
                }
                if (in_array('max', $ruleList, true) && $value > self::ruleValue($ruleList, 'max')) {
                    $errors[$field] = 'Must be ' . self::ruleValue($ruleList, 'max') . ' or less.';
                    continue;
                }
            }

            foreach ($ruleList as $rule) {
                if (str_starts_with($rule, 'in:')) {
                    $allowed = explode(',', substr($rule, 3));
                    $asString = is_scalar($value) ? (string) $value : '';
                    if (!in_array($asString, $allowed, true)) {
                        $errors[$field] = 'Invalid value for ' . str_replace('_', ' ', $field) . '.';
                        continue 2;
                    }
                }
            }

            $clean[$field] = $value;
        }

        if ($errors !== []) {
            throw ApiException::validation($errors);
        }

        return $clean;
    }

    /** @param list<string> $rules */
    private static function ruleValue(array $rules, string $name): int
    {
        foreach ($rules as $rule) {
            if (str_starts_with($rule, $name . ':')) {
                return (int) substr($rule, strlen($name) + 1);
            }
        }
        return 0;
    }
}
