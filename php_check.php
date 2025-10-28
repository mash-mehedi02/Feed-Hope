<?php
// PHP Configuration Checker for Feed Hope App
// This script helps you check if GD extension is enabled

echo "<h2>Feed Hope - PHP Configuration Check</h2>";
echo "<hr>";

// Check GD extension
echo "<h3>GD Extension Status</h3>";
if (extension_loaded('gd')) {
    echo "<p style='color: green; font-weight: bold;'>✅ GD Extension is ENABLED</p>";
    echo "<p>Image processing functions are available.</p>";
    
    // Show GD info
    if (function_exists('gd_info')) {
        $gd_info = gd_info();
        echo "<h4>GD Information:</h4>";
        echo "<ul>";
        foreach ($gd_info as $key => $value) {
            if (is_bool($value)) {
                $value = $value ? 'Yes' : 'No';
            }
            echo "<li><strong>$key:</strong> $value</li>";
        }
        echo "</ul>";
    }
} else {
    echo "<p style='color: red; font-weight: bold;'>❌ GD Extension is DISABLED</p>";
    echo "<p>Image processing functions are not available.</p>";
    echo "<p><strong>Solution:</strong> Enable GD extension in your PHP configuration.</p>";
}

echo "<hr>";

// Check other important extensions
echo "<h3>Other Important Extensions</h3>";

$extensions = [
    'mysqli' => 'MySQL Database Connection',
    'json' => 'JSON Processing',
    'mbstring' => 'Multibyte String Support',
    'fileinfo' => 'File Information Detection'
];

foreach ($extensions as $ext => $description) {
    if (extension_loaded($ext)) {
        echo "<p style='color: green;'>✅ $ext - $description</p>";
    } else {
        echo "<p style='color: red;'>❌ $ext - $description</p>";
    }
}

echo "<hr>";

// Check upload settings
echo "<h3>File Upload Settings</h3>";
echo "<ul>";
echo "<li><strong>file_uploads:</strong> " . (ini_get('file_uploads') ? 'Enabled' : 'Disabled') . "</li>";
echo "<li><strong>upload_max_filesize:</strong> " . ini_get('upload_max_filesize') . "</li>";
echo "<li><strong>post_max_size:</strong> " . ini_get('post_max_size') . "</li>";
echo "<li><strong>max_execution_time:</strong> " . ini_get('max_execution_time') . " seconds</li>";
echo "<li><strong>memory_limit:</strong> " . ini_get('memory_limit') . "</li>";
echo "</ul>";

echo "<hr>";

// Check upload directory permissions
echo "<h3>Upload Directory Status</h3>";
$upload_dir = 'uploads/food_images';
if (is_dir($upload_dir)) {
    if (is_writable($upload_dir)) {
        echo "<p style='color: green;'>✅ Upload directory exists and is writable</p>";
    } else {
        echo "<p style='color: red;'>❌ Upload directory exists but is not writable</p>";
        echo "<p><strong>Solution:</strong> Set write permissions on the uploads directory</p>";
    }
} else {
    echo "<p style='color: orange;'>⚠️ Upload directory does not exist</p>";
    echo "<p><strong>Solution:</strong> The system will create it automatically when needed</p>";
}

echo "<hr>";

// Show PHP version
echo "<h3>PHP Version</h3>";
echo "<p><strong>Current Version:</strong> " . PHP_VERSION . "</p>";
echo "<p><strong>Recommended:</strong> PHP 7.4 or higher</p>";

if (version_compare(PHP_VERSION, '7.4.0') >= 0) {
    echo "<p style='color: green;'>✅ PHP version is compatible</p>";
} else {
    echo "<p style='color: orange;'>⚠️ Consider upgrading to PHP 7.4+ for better performance</p>";
}

echo "<hr>";

// Instructions for enabling GD
if (!extension_loaded('gd')) {
    echo "<h3>How to Enable GD Extension</h3>";
    echo "<div style='background: #f0f0f0; padding: 15px; border-radius: 5px;'>";
    echo "<h4>For XAMPP:</h4>";
    echo "<ol>";
    echo "<li>Open your XAMPP Control Panel</li>";
    echo "<li>Click 'Config' next to Apache</li>";
    echo "<li>Select 'PHP (php.ini)'</li>";
    echo "<li>Find the line: <code>;extension=gd</code></li>";
    echo "<li>Remove the semicolon to make it: <code>extension=gd</code></li>";
    echo "<li>Save the file and restart Apache</li>";
    echo "</ol>";
    
    echo "<h4>Alternative (if above doesn't work):</h4>";
    echo "<ol>";
    echo "<li>Find your php.ini file (usually in C:\\xampp\\php\\php.ini)</li>";
    echo "<li>Open it in a text editor</li>";
    echo "<li>Search for 'extension=gd'</li>";
    echo "<li>If it's commented out (starts with ;), remove the semicolon</li>";
    echo "<li>If it doesn't exist, add: <code>extension=gd</code></li>";
    echo "<li>Save and restart Apache</li>";
    echo "</ol>";
    echo "</div>";
}

echo "<hr>";
echo "<p><a href='fooddonateform.php' style='background: #06C167; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;'>Test Food Donation Form</a></p>";
?>

<style>
body {
    font-family: Arial, sans-serif;
    max-width: 900px;
    margin: 20px auto;
    padding: 20px;
    background-color: #f5f5f5;
}
h2, h3, h4 {
    color: #06C167;
}
code {
    background: #e0e0e0;
    padding: 2px 5px;
    border-radius: 3px;
    font-family: monospace;
}
ul, ol {
    margin: 10px 0;
    padding-left: 20px;
}
li {
    margin: 5px 0;
}
hr {
    margin: 20px 0;
    border: none;
    border-top: 2px solid #06C167;
}
</style>








