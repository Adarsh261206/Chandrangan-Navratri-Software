<?php

/**
 * Generates deterministic WebP placeholder portraits for the demo seed data.
 *
 *   php database/generate_demo_photos.php
 *
 * Produces backend/uploads/participants/demo-NN.webp  (800px display)
 * and                              demo-NN_t.webp     (320px thumbnail)
 * which match the photo_path values in database/seed.sql.
 */

declare(strict_types=1);

$root = dirname(__DIR__);

$defaultNames = [
    1 => 'Rahul Sharma', 2 => 'Priya Sharma', 3 => 'Aarav Mehta', 4 => 'Anaya Joshi',
    5 => 'Rahul Sharma', 6 => 'Kiara Singh', 7 => 'Reyansh Patel', 8 => 'Diya Verma',
    9 => 'Arjun Nair', 10 => 'Sara Khan', 11 => 'Ishita Reddy', 12 => 'Kabir Malhotra',
    13 => 'Tanvi Deshmukh', 14 => 'Aditya Iyer', 15 => 'Meera Kulkarni', 16 => 'Yash Bhosale',
    17 => 'Neha Pillai', 18 => 'Rohan Chawla', 19 => 'Simran Kaur', 20 => 'Devansh Rao',
    21 => 'Ananya Bose', 22 => 'Karthik Subramanian', 23 => 'Sunita Agarwal', 24 => 'Manish Trivedi',
    25 => 'Rahul Sharma', 26 => 'Kavita Sinha', 27 => 'Pooja Mathe', 28 => 'Sandeep Kulkarni',
    29 => 'Ramesh Krishnan', 30 => 'Shanti Devi', 31 => 'Girish Pawar', 32 => 'Kamla Ben Patel',
];

$names = $defaultNames;

// Prefer live database rows when available.
$env = static fn (string $key, string $default = ''): string => getenv($key) === false ? $default : (string) getenv($key);
try {
    $pdo = new PDO(
        sprintf('mysql:host=%s;port=%d;dbname=%s;charset=utf8mb4', $env('NAV_DB_HOST', '127.0.0.1'), (int) $env('NAV_DB_PORT', '3306'), $env('NAV_DB_NAME', 'navratrotsav')),
        $env('NAV_DB_USER', 'root'),
        $env('NAV_DB_PASS', ''),
        [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION]
    );
    $rows = $pdo->query('SELECT id, name FROM participants ORDER BY id ASC')->fetchAll(PDO::FETCH_KEY_PAIR);
    if ($rows !== []) {
        $names = array_map('strval', $rows);
    }
    echo "Using participant names from the database.\n";
} catch (Throwable $e) {
    echo "Database unavailable, using built-in demo names.\n";
}

$fontCandidates = [
    '/System/Library/Fonts/Supplemental/Arial Bold.ttf',
    '/Library/Fonts/Arial Bold.ttf',
    '/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf',
    '/usr/share/fonts/truetype/liberation/LiberationSans-Bold.ttf',
    '/usr/share/fonts/TTF/DejaVuSans-Bold.ttf',
];
$font = null;
foreach ($fontCandidates as $candidate) {
    if (is_file($candidate)) {
        $font = $candidate;
        break;
    }
}

$palettes = [
    [[135, 19, 42], [90, 16, 32]],
    [[163, 26, 50], [110, 17, 36]],
    [[194, 154, 46], [135, 98, 26]],
    [[110, 17, 36], [52, 6, 15]],
    [[163, 26, 50], [135, 98, 26]],
    [[78, 31, 46], [135, 19, 42]],
];

$outDir = $root . '/backend/uploads/participants';
if (!is_dir($outDir) && !mkdir($outDir, 0755, true) && !is_dir($outDir)) {
    fwrite(STDERR, "Cannot create output directory: {$outDir}\n");
    exit(1);
}

$displaySize = 800;
$thumbSize = 320;

$generated = 0;

foreach ($names as $id => $name) {
    $id = (int) $id;
    [$r1, $g1, $b1] = $palettes[$id % count($palettes)][0];
    [$r2, $g2, $b2] = $palettes[$id % count($palettes)][1];

    $canvas = imagecreatetruecolor($displaySize, $displaySize);

    // Diagonal-ish vertical gradient background.
    for ($y = 0; $y < $displaySize; $y++) {
        $t = $y / ($displaySize - 1);
        $color = imagecolorallocate(
            $canvas,
            (int) round($r1 + ($r2 - $r1) * $t),
            (int) round($g1 + ($g2 - $g1) * $t),
            (int) round($b1 + ($b2 - $b1) * $t)
        );
        imageline($canvas, 0, $y, $displaySize, $y, $color);
    }

    // Decorative concentric rings (subtle festive motif).
    $ring = imagecolorallocatealpha($canvas, 240, 225, 180, 74);
    imagesetthickness($canvas, 3);
    imageellipse($canvas, 400, 400, 772, 772, $ring);
    imageellipse($canvas, 400, 400, 724, 724, $ring);
    imagesetthickness($canvas, 1);

    $dot = imagecolorallocatealpha($canvas, 240, 225, 180, 70);
    for ($i = 0; $i < 12; $i++) {
        $angle = deg2rad($i * 30);
        $x = (int) round(400 + 330 * cos($angle));
        $y = (int) round(400 + 330 * sin($angle));
        imagefilledellipse($canvas, $x, $y, 16, 16, $dot);
    }

    // Portrait disc.
    $disc = imagecolorallocatealpha($canvas, 253, 251, 247, 8);
    $discRing = imagecolorallocatealpha($canvas, 214, 182, 91, 0);
    imagefilledellipse($canvas, 400, 400, 440, 440, $discRing);
    imagefilledellipse($canvas, 400, 400, 424, 424, $disc);

    // Initials.
    $words = preg_split('/\s+/', trim($name)) ?: [$name];
    $initials = mb_strtoupper(mb_substr($words[0], 0, 1));
    if (count($words) > 1) {
        $initials .= mb_strtoupper(mb_substr($words[count($words) - 1], 0, 1));
    }

    $textColor = imagecolorallocate($canvas, 135, 19, 42);
    if ($font !== null && function_exists('imagettftext')) {
        $size = 170;
        $box = imagettfbbox($size, 0, $font, $initials);
        $textWidth = abs($box[2] - $box[0]);
        $textHeight = abs($box[7] - $box[1]);
        $x = (int) round((400 - $textWidth / 2) - $box[0]);
        $y = (int) round((400 + $textHeight / 2) - $box[1]);
        imagettftext($canvas, $size, 0, $x, $y, $textColor, $font, $initials);
    } else {
        imagestring($canvas, 5, (int) round((400 - strlen($initials) * 9 / 2)), 390, $initials, $textColor);
    }

    $displayPath = sprintf('%s/demo-%02d.webp', $outDir, $id);
    $thumbPath = sprintf('%s/demo-%02d_t.webp', $outDir, $id);

    imagewebp($canvas, $displayPath, 80);

    $thumb = imagecreatetruecolor($thumbSize, $thumbSize);
    imagecopyresampled($thumb, $canvas, 0, 0, 0, 0, $thumbSize, $thumbSize, $displaySize, $displaySize);
    imagewebp($thumb, $thumbPath, 74);
    $generated += 2;
}

echo "Generated {$generated} WebP files in backend/uploads/participants\n";
