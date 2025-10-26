<?php
// Database Migration Runner for Feed Hope App
// Run this script to update your database with new features

$connection = mysqli_connect("localhost", "root", "");
$db = mysqli_select_db($connection, 'demo');

if (!$connection) {
    die("Connection failed: " . mysqli_connect_error());
}

echo "<h2>Feed Hope Database Migration</h2>";
echo "<p>Updating database to support new features...</p>";

// Read and execute the migration SQL file
$migration_sql = file_get_contents('database/migration.sql');

if ($migration_sql === false) {
    die("Could not read migration file. Please ensure database/migration.sql exists.");
}

// Split the SQL into individual statements
$statements = array_filter(array_map('trim', explode(';', $migration_sql)));

$success_count = 0;
$error_count = 0;

foreach ($statements as $statement) {
    if (empty($statement) || strpos($statement, '--') === 0) {
        continue; // Skip empty statements and comments
    }
    
    if (mysqli_query($connection, $statement)) {
        $success_count++;
        echo "<p style='color: green;'>✓ " . substr($statement, 0, 50) . "...</p>";
    } else {
        $error_count++;
        echo "<p style='color: red;'>✗ Error: " . mysqli_error($connection) . "</p>";
    }
}

echo "<hr>";
echo "<h3>Migration Complete!</h3>";
echo "<p><strong>Successful operations:</strong> $success_count</p>";
echo "<p><strong>Errors:</strong> $error_count</p>";

if ($error_count == 0) {
    echo "<p style='color: green; font-weight: bold;'>🎉 Database successfully updated! All new features are now available.</p>";
    echo "<p><a href='food_newsfeed.php' style='background: #06C167; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;'>View Food Newsfeed</a></p>";
} else {
    echo "<p style='color: orange;'>⚠️ Some operations failed. Please check the errors above.</p>";
}

mysqli_close($connection);
?>

<style>
body {
    font-family: Arial, sans-serif;
    max-width: 800px;
    margin: 50px auto;
    padding: 20px;
    background-color: #f5f5f5;
}
h2, h3 {
    color: #06C167;
}
p {
    margin: 10px 0;
}
hr {
    margin: 20px 0;
    border: none;
    border-top: 2px solid #06C167;
}
</style>



