<?php

declare(strict_types=1);

namespace App\Services;

use App\Core\ApiException;
use App\Core\AppConfig;

final class ImageService
{
    /**
     * Validates, resizes and converts an uploaded photo to WebP.
     *
     * @param array<string, mixed> $file Entry from $_FILES
     * @return array{path: string, thumb: string, width: int, height: int}
     * @throws ApiException
     */
    public static function storeParticipantPhoto(array $file, AppConfig $config): array
    {
        $error = (int) ($file['error'] ?? UPLOAD_ERR_NO_FILE);
        if ($error === UPLOAD_ERR_NO_FILE) {
            throw ApiException::validation(['photo' => 'Please take or choose a photo.']);
        }
        if ($error === UPLOAD_ERR_INI_SIZE || $error === UPLOAD_ERR_FORM_SIZE) {
            throw ApiException::validation(['photo' => 'Photo is too large. Please use a smaller image.']);
        }
        if ($error !== UPLOAD_ERR_OK) {
            throw ApiException::validation(['photo' => 'Photo upload failed. Please try again.']);
        }

        $tmpPath = (string) ($file['tmp_name'] ?? '');
        $size = (int) ($file['size'] ?? 0);

        if ($tmpPath === '' || !is_uploaded_file($tmpPath)) {
            throw ApiException::validation(['photo' => 'Photo upload failed. Please try again.']);
        }

        $maxBytes = (int) $config->get('uploads.max_bytes');
        if ($size > $maxBytes) {
            $maxMb = round($maxBytes / (1024 * 1024), 1);
            throw ApiException::validation(['photo' => 'Photo must be smaller than ' . $maxMb . ' MB.']);
        }

        $mime = self::detectMime($tmpPath);
        $allowed = (array) $config->get('uploads.allowed_mime', []);
        if ($mime === null || !in_array($mime, $allowed, true)) {
            throw ApiException::validation(['photo' => 'Only JPEG, PNG or WebP images are allowed.']);
        }

        $source = self::decode($tmpPath, $mime);
        if ($source === null) {
            throw ApiException::validation(['photo' => 'That file does not look like a valid image.']);
        }

        // Fix EXIF orientation for phone camera JPEGs.
        if ($mime === 'image/jpeg') {
            $source = self::applyExifOrientation($source, $tmpPath);
        }

        $maxDimension = (int) $config->get('uploads.max_dimension', 800);
        $thumbDimension = (int) $config->get('uploads.thumb_dimension', 320);

        $display = self::resizeToFit($source, $maxDimension, $maxDimension);
        $thumb = self::resizeToFit($source, $thumbDimension, $thumbDimension);

        $directory = rtrim((string) $config->get('uploads.dir'), '/') . '/participants';
        if (!is_dir($directory) && !@mkdir($directory, 0755, true) && !is_dir($directory)) {
            throw ApiException::server('Could not save the photo. Please check upload permissions.');
        }
        if (!is_writable($directory)) {
            throw ApiException::server('Upload folder is not writable. Please contact the administrator.');
        }

        $basename = bin2hex(random_bytes(12));
        $displayFile = $directory . '/' . $basename . '.webp';
        $thumbFile = $directory . '/' . $basename . '_t.webp';

        $quality = (int) $config->get('uploads.quality', 80);
        $thumbQuality = (int) $config->get('uploads.thumb_quality', 72);

        if (!imagewebp($display, $displayFile, $quality)) {
            throw ApiException::server('Could not process the photo. Please try again.');
        }
        imagewebp($thumb, $thumbFile, $thumbQuality);

        $width = imagesx($display);
        $height = imagesy($display);

        return [
            'path' => 'participants/' . $basename . '.webp',
            'thumb' => 'participants/' . $basename . '_t.webp',
            'width' => $width,
            'height' => $height,
        ];
    }

    public static function delete(?string $relativePath, AppConfig $config): void
    {
        if ($relativePath === null || $relativePath === '') {
            return;
        }

        $uploads = rtrim((string) $config->get('uploads.dir'), '/');
        $base = realpath($uploads);
        $full = realpath($uploads . '/' . $relativePath);

        // Path traversal protection: resolved path must stay inside the uploads folder.
        if ($base === false || $full === false || !str_starts_with($full, $base . DIRECTORY_SEPARATOR)) {
            return;
        }
        if (is_file($full)) {
            @unlink($full);
        }
    }

    public static function publicUrl(?string $relativePath, AppConfig $config): ?string
    {
        if ($relativePath === null || $relativePath === '') {
            return null;
        }
        return rtrim((string) $config->get('uploads.url'), '/') . '/' . ltrim($relativePath, '/');
    }

    private static function detectMime(string $path): ?string
    {
        if (class_exists(\finfo::class)) {
            $finfo = new \finfo(FILEINFO_MIME_TYPE);
            $mime = $finfo->file($path);
            if (is_string($mime)) {
                return $mime;
            }
        }
        $info = @getimagesize($path);
        return is_array($info) && isset($info['mime']) ? (string) $info['mime'] : null;
    }

    private static function decode(string $path, string $mime): ?\GdImage
    {
        $raw = file_get_contents($path);
        if ($raw === false || $raw === '') {
            return null;
        }

        // Guard against decompression bombs: reject absurd pixel counts.
        $info = @getimagesize($path);
        if (!is_array($info)) {
            return null;
        }
        $pixels = (int) $info[0] * (int) $info[1];
        if ($pixels <= 0 || $pixels > 40_000_000) {
            return null;
        }

        $image = @imagecreatefromstring($raw);
        if (!$image instanceof \GdImage) {
            return null;
        }
        imagealphablending($image, false);
        imagesavealpha($image, true);
        return $image;
    }

    private static function applyExifOrientation(\GdImage $image, string $path): \GdImage
    {
        if (!function_exists('exif_read_data')) {
            return $image;
        }
        $exif = @exif_read_data($path);
        if (!is_array($exif) || !isset($exif['Orientation'])) {
            return $image;
        }
        $orientation = (int) ($exif['Orientation'] ?? 1);
        switch ($orientation) {
            case 2:
                imageflip($image, IMG_FLIP_HORIZONTAL);
                break;
            case 3:
                $image = imagerotate($image, 180, 0) ?: $image;
                break;
            case 4:
                imageflip($image, IMG_FLIP_VERTICAL);
                break;
            case 5:
                imageflip($image, IMG_FLIP_HORIZONTAL);
                $image = imagerotate($image, -90, 0) ?: $image;
                break;
            case 6:
                $image = imagerotate($image, -90, 0) ?: $image;
                break;
            case 7:
                imageflip($image, IMG_FLIP_HORIZONTAL);
                $image = imagerotate($image, 90, 0) ?: $image;
                break;
            case 8:
                $image = imagerotate($image, 90, 0) ?: $image;
                break;
        }
        return $image;
    }

    private static function resizeToFit(\GdImage $source, int $maxW, int $maxH): \GdImage
    {
        $width = imagesx($source);
        $height = imagesy($source);

        if ($width <= $maxW && $height <= $maxH) {
            $copy = imagecreatetruecolor($width, $height);
            imagealphablending($copy, false);
            imagesavealpha($copy, true);
            imagecopy($copy, $source, 0, 0, 0, 0, $width, $height);
            return $copy;
        }

        $ratio = min($maxW / $width, $maxH / $height);
        $newW = max(1, (int) round($width * $ratio));
        $newH = max(1, (int) round($height * $ratio));

        $resized = imagecreatetruecolor($newW, $newH);
        imagealphablending($resized, false);
        imagesavealpha($resized, true);
        imagecopyresampled($resized, $source, 0, 0, 0, 0, $newW, $newH, $width, $height);
        return $resized;
    }
}
