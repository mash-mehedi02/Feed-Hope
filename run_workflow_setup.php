<?php
// Complete Workflow Migration Runner for Feed Hope App
// This script sets up the complete food donation workflow system

$connection = mysqli_connect("localhost", "root", "");
$db = mysqli_select_db($connection, 'demo');

if (!$connection) {
    die("Connection failed: " . mysqli_connect_error());
}

echo "<h2>Feed Hope - Complete Workflow Setup</h2>";
echo "<p>Setting up the complete food donation workflow system...</p>";

// Read and execute the workflow schema
$workflow_sql = file_get_contents('database/workflow_schema.sql');

if ($workflow_sql === false) {
    die("Could not read workflow schema file. Please ensure database/workflow_schema.sql exists.");
}

// Split the SQL into individual statements
$statements = array_filter(array_map('trim', explode(';', $workflow_sql)));

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
echo "<h3>Workflow Setup Complete!</h3>";
echo "<p><strong>Successful operations:</strong> $success_count</p>";
echo "<p><strong>Errors:</strong> $error_count</p>";

if ($error_count == 0) {
    echo "<p style='color: green; font-weight: bold;'>🎉 Complete workflow system is now active!</p>";
    
    echo "<h3>New Features Available:</h3>";
    echo "<ul>";
    echo "<li>✅ <strong>Admin Food Approval:</strong> Admins can approve/reject food donations</li>";
    echo "<li>✅ <strong>Delivery Booking System:</strong> Delivery persons can book available food</li>";
    echo "<li>✅ <strong>Status Workflow:</strong> pending → available → booking → running → delivered</li>";
    echo "<li>✅ <strong>History Tracking:</strong> Complete history for all parties</li>";
    echo "<li>✅ <strong>Real-time Notifications:</strong> Status updates for everyone</li>";
    echo "<li>✅ <strong>Filtered Newsfeed:</strong> Only shows available/active food</li>";
    echo "</ul>";
    
    echo "<h3>Access Points:</h3>";
    echo "<p><a href='admin/food_approval.php' style='background: #06C167; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; margin: 5px;'>Admin Food Approval</a></p>";
    echo "<p><a href='delivery/delivery_booking.php' style='background: #06C167; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; margin: 5px;'>Delivery Booking System</a></p>";
    echo "<p><a href='food_newsfeed.php' style='background: #06C167; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; margin: 5px;'>Updated Food Newsfeed</a></p>";
    
} else {
    echo "<p style='color: orange;'>⚠️ Some operations failed. Please check the errors above.</p>";
}

echo "<hr>";
echo "<h3>Workflow Process:</h3>";
echo "<div style='background: #f0f9ff; padding: 20px; border-radius: 5px; margin: 20px 0;'>";
echo "<h4>1. User Posts Food Donation</h4>";
echo "<p>• Status: <strong>pending</strong></p>";
echo "<p>• Admin receives notification</p>";
echo "<br>";

echo "<h4>2. Admin Reviews & Approves</h4>";
echo "<p>• Status: <strong>pending</strong> → <strong>available</strong></p>";
echo "<p>• Food appears in newsfeed and delivery booking system</p>";
echo "<p>• User receives approval notification</p>";
echo "<br>";

echo "<h4>3. Delivery Person Books Food</h4>";
echo "<p>• Status: <strong>available</strong> → <strong>booking</strong></p>";
echo "<p>• Delivery person can accept/reject the booking</p>";
echo "<p>• User and admin receive booking notification</p>";
echo "<br>";

echo "<h4>4. Delivery Person Accepts Booking</h4>";
echo "<p>• Status: <strong>booking</strong> → <strong>running</strong></p>";
echo "<p>• Delivery person starts delivering</p>";
echo "<p>• Everyone receives status update</p>";
echo "<br>";

echo "<h4>5. Delivery Completed</h4>";
echo "<p>• Status: <strong>running</strong> → <strong>delivered</strong></p>";
echo "<p>• Food removed from active feeds</p>";
echo "<p>• Complete history maintained for all parties</p>";
echo "</div>";

mysqli_close($connection);
?>

<style>
body {
    font-family: Arial, sans-serif;
    max-width: 900px;
    margin: 50px auto;
    padding: 20px;
    background-color: #f5f5f5;
}
h2, h3, h4 {
    color: #06C167;
}
ul {
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
a {
    display: inline-block;
    margin: 5px;
}
</style>








