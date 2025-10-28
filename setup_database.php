<?php
// Database Setup Script for Feed Hope App
// This script helps you set up the database quickly

include('connection.php');

if (!$connection) {
    die("❌ Cannot connect to database. Please start XAMPP services first.");
}

echo "<h2>Feed Hope - Database Setup</h2>";
echo "<hr>";

// Check if demo database exists
$check_db = mysqli_query($connection, "SHOW DATABASES LIKE 'demo'");
if (mysqli_num_rows($check_db) == 0) {
    echo "<p style='color: orange;'>⚠️ 'demo' database does not exist. Creating it...</p>";
    
    if (mysqli_query($connection, "CREATE DATABASE demo CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci")) {
        echo "<p style='color: green;'>✅ 'demo' database created successfully!</p>";
        
        // Select the database
        mysqli_select_db($connection, 'demo');
    } else {
        echo "<p style='color: red;'>❌ Failed to create database: " . mysqli_error($connection) . "</p>";
        exit;
    }
} else {
    echo "<p style='color: green;'>✅ 'demo' database exists</p>";
    mysqli_select_db($connection, 'demo');
}

// Check if tables exist
$tables = ['login', 'admin', 'delivery_persons', 'food_donations', 'user_feedback'];
$missing_tables = [];

foreach ($tables as $table) {
    $check_table = mysqli_query($connection, "SHOW TABLES LIKE '$table'");
    if (mysqli_num_rows($check_table) == 0) {
        $missing_tables[] = $table;
    }
}

if (!empty($missing_tables)) {
    echo "<p style='color: orange;'>⚠️ Missing tables: " . implode(', ', $missing_tables) . "</p>";
    echo "<p>Please import the database schema from <code>database/demo.sql</code></p>";
    
    // Try to create basic tables if demo.sql doesn't exist
    echo "<h3>Creating Basic Tables...</h3>";
    
    // Create login table
    if (in_array('login', $missing_tables)) {
        $sql = "CREATE TABLE `login` (
            `id` int(11) NOT NULL AUTO_INCREMENT,
            `name` text NOT NULL,
            `email` varchar(60) NOT NULL,
            `password` text NOT NULL,
            `gender` text NOT NULL,
            PRIMARY KEY (`email`),
            UNIQUE KEY `id` (`id`)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci";
        
        if (mysqli_query($connection, $sql)) {
            echo "<p style='color: green;'>✅ Created 'login' table</p>";
        } else {
            echo "<p style='color: red;'>❌ Failed to create 'login' table: " . mysqli_error($connection) . "</p>";
        }
    }
    
    // Create admin table
    if (in_array('admin', $missing_tables)) {
        $sql = "CREATE TABLE `admin` (
            `Aid` int(11) NOT NULL AUTO_INCREMENT,
            `name` text NOT NULL,
            `email` varchar(60) DEFAULT NULL,
            `password` text NOT NULL,
            `location` text NOT NULL,
            `address` text NOT NULL,
            PRIMARY KEY (`Aid`),
            UNIQUE KEY `email` (`email`)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci";
        
        if (mysqli_query($connection, $sql)) {
            echo "<p style='color: green;'>✅ Created 'admin' table</p>";
        } else {
            echo "<p style='color: red;'>❌ Failed to create 'admin' table: " . mysqli_error($connection) . "</p>";
        }
    }
    
    // Create delivery_persons table
    if (in_array('delivery_persons', $missing_tables)) {
        $sql = "CREATE TABLE `delivery_persons` (
            `Did` int(11) NOT NULL AUTO_INCREMENT,
            `name` varchar(255) NOT NULL,
            `email` varchar(255) NOT NULL,
            `password` varchar(255) NOT NULL,
            `city` varchar(50) DEFAULT NULL,
            PRIMARY KEY (`Did`),
            UNIQUE KEY `email` (`email`)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci";
        
        if (mysqli_query($connection, $sql)) {
            echo "<p style='color: green;'>✅ Created 'delivery_persons' table</p>";
        } else {
            echo "<p style='color: red;'>❌ Failed to create 'delivery_persons' table: " . mysqli_error($connection) . "</p>";
        }
    }
    
    // Create food_donations table
    if (in_array('food_donations', $missing_tables)) {
        $sql = "CREATE TABLE `food_donations` (
            `Fid` int(11) NOT NULL AUTO_INCREMENT,
            `name` varchar(50) NOT NULL,
            `email` varchar(60) NOT NULL,
            `food` varchar(50) NOT NULL,
            `type` text NOT NULL,
            `category` text NOT NULL,
            `quantity` text NOT NULL,
            `date` datetime DEFAULT current_timestamp(),
            `address` text NOT NULL,
            `location` varchar(50) NOT NULL,
            `phoneno` varchar(25) NOT NULL,
            `assigned_to` int(11) DEFAULT NULL,
            `delivery_by` int(11) DEFAULT NULL,
            PRIMARY KEY (`Fid`)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci";
        
        if (mysqli_query($connection, $sql)) {
            echo "<p style='color: green;'>✅ Created 'food_donations' table</p>";
        } else {
            echo "<p style='color: red;'>❌ Failed to create 'food_donations' table: " . mysqli_error($connection) . "</p>";
        }
    }
    
    // Create user_feedback table
    if (in_array('user_feedback', $missing_tables)) {
        $sql = "CREATE TABLE `user_feedback` (
            `feedback_id` int(11) NOT NULL AUTO_INCREMENT,
            `name` varchar(255) DEFAULT NULL,
            `email` varchar(255) DEFAULT NULL,
            `message` text DEFAULT NULL,
            PRIMARY KEY (`feedback_id`)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci";
        
        if (mysqli_query($connection, $sql)) {
            echo "<p style='color: green;'>✅ Created 'user_feedback' table</p>";
        } else {
            echo "<p style='color: red;'>❌ Failed to create 'user_feedback' table: " . mysqli_error($connection) . "</p>";
        }
    }
    
} else {
    echo "<p style='color: green;'>✅ All required tables exist</p>";
}

echo "<hr>";
echo "<h3>Database Status</h3>";

// Show table count
$result = mysqli_query($connection, "SHOW TABLES");
$table_count = mysqli_num_rows($result);
echo "<p><strong>Tables in database:</strong> $table_count</p>";

// Show table names
echo "<p><strong>Table names:</strong> ";
$table_names = [];
while ($row = mysqli_fetch_array($result)) {
    $table_names[] = $row[0];
}
echo implode(', ', $table_names) . "</p>";

echo "<hr>";
echo "<h3>Next Steps</h3>";
echo "<p>1. <a href='run_migration.php'>Run Database Migration</a> (for new features)</p>";
echo "<p>2. <a href='food_newsfeed.php'>View Food Newsfeed</a></p>";
echo "<p>3. <a href='fooddonateform.php'>Test Food Donation Form</a></p>";

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
code {
    background: #e0e0e0;
    padding: 2px 5px;
    border-radius: 3px;
    font-family: monospace;
}
hr {
    margin: 20px 0;
    border: none;
    border-top: 2px solid #06C167;
}
a {
    color: #06C167;
    text-decoration: none;
}
a:hover {
    text-decoration: underline;
}
</style>








