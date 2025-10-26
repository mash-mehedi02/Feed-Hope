

<?php
// Enhanced Database Connection for Feed Hope App
// This file handles database connections with fallback options

// Connection configuration
$hosts = ['localhost', '127.0.0.1'];
$ports = ['', ':3306', ':3307'];
$username = 'root';
$password = '';
$database = 'demo';

$connection = null;
$connection_error = '';

// Try different connection combinations
foreach ($hosts as $host) {
    foreach ($ports as $port) {
        $host_with_port = $host . $port;
        
        try {
            $connection = mysqli_connect($host_with_port, $username, $password);
            
            if ($connection) {
                // Test if we can select the database
                if (mysqli_select_db($connection, $database)) {
                    // Success! Break out of both loops
                    break 2;
                } else {
                    // Database doesn't exist, but connection works
                    mysqli_close($connection);
                    $connection = null;
                }
            }
        } catch (Exception $e) {
            $connection_error = $e->getMessage();
            $connection = null;
        }
    }
}

// If no connection was successful, show helpful error
if (!$connection) {
    $error_message = "❌ Database Connection Failed!\n\n";
    $error_message .= "Possible solutions:\n";
    $error_message .= "1. Start XAMPP Control Panel\n";
    $error_message .= "2. Start Apache and MySQL services\n";
    $error_message .= "3. Check if 'demo' database exists\n";
    $error_message .= "4. Verify MySQL is running on port 3306 or 3307\n\n";
    $error_message .= "For detailed help, see: XAMPP_STARTUP_GUIDE.md";
    
    // Show error page instead of fatal error
    ?>
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Feed Hope - Database Connection Error</title>
        <style>
            body {
                font-family: Arial, sans-serif;
                max-width: 800px;
                margin: 50px auto;
                padding: 20px;
                background: linear-gradient(135deg, #f5f5f5, #e8f5e8);
            }
            .error-container {
                background: white;
                padding: 30px;
                border-radius: 10px;
                box-shadow: 0 4px 6px rgba(0,0,0,0.1);
                border-left: 5px solid #ef4444;
            }
            h1 {
                color: #ef4444;
                margin-bottom: 20px;
            }
            .error-message {
                background: #fef2f2;
                border: 1px solid #fecaca;
                padding: 20px;
                border-radius: 5px;
                margin: 20px 0;
                white-space: pre-line;
                font-family: monospace;
            }
            .solution-steps {
                background: #f0f9ff;
                border: 1px solid #bae6fd;
                padding: 20px;
                border-radius: 5px;
                margin: 20px 0;
            }
            .step {
                margin: 10px 0;
                padding: 10px;
                background: white;
                border-radius: 5px;
                border-left: 3px solid #06C167;
            }
            .step-number {
                font-weight: bold;
                color: #06C167;
            }
            .links {
                text-align: center;
                margin-top: 30px;
            }
            .links a {
                display: inline-block;
                margin: 0 10px;
                padding: 12px 24px;
                background: #06C167;
                color: white;
                text-decoration: none;
                border-radius: 5px;
                transition: background 0.2s;
            }
            .links a:hover {
                background: #05a854;
            }
            .status-check {
                background: #fef3c7;
                border: 1px solid #f59e0b;
                padding: 15px;
                border-radius: 5px;
                margin: 20px 0;
            }
        </style>
    </head>
    <body>
        <div class="error-container">
            <h1>🚨 Database Connection Error</h1>
            
            <div class="error-message"><?php echo htmlspecialchars($error_message); ?></div>
            
            <div class="solution-steps">
                <h3>🔧 Quick Fix Steps:</h3>
                
                <div class="step">
                    <span class="step-number">Step 1:</span> Open XAMPP Control Panel
                </div>
                
                <div class="step">
                    <span class="step-number">Step 2:</span> Start Apache service (click "Start" next to Apache)
                </div>
                
                <div class="step">
                    <span class="step-number">Step 3:</span> Start MySQL service (click "Start" next to MySQL)
                </div>
                
                <div class="step">
                    <span class="step-number">Step 4:</span> Wait for both to show "Running" status
                </div>
                
                <div class="step">
                    <span class="step-number">Step 5:</span> Refresh this page
                </div>
            </div>
            
            <div class="status-check">
                <h4>📊 Check Your XAMPP Status:</h4>
                <p>• <strong>Apache:</strong> Should show "Running" in green</p>
                <p>• <strong>MySQL:</strong> Should show "Running" in green</p>
                <p>• <strong>phpMyAdmin:</strong> Should be accessible at <a href="http://localhost/phpmyadmin" target="_blank">http://localhost/phpmyadmin</a></p>
            </div>
            
            <div class="links">
                <a href="http://localhost/phpmyadmin" target="_blank">Open phpMyAdmin</a>
                <a href="javascript:location.reload()">Refresh Page</a>
                <a href="XAMPP_STARTUP_GUIDE.md" target="_blank">View Full Guide</a>
            </div>
        </div>
    </body>
    </html>
    <?php
    exit;
}

// Connection successful - set charset
mysqli_set_charset($connection, "utf8mb4");

// Optional: Show connection info in development
if (isset($_GET['debug']) && $_GET['debug'] == 'connection') {
    echo "✅ Database connected successfully!<br>";
    echo "Host: " . mysqli_get_host_info($connection) . "<br>";
    echo "Database: " . $database . "<br>";
    echo "Charset: " . mysqli_character_set_name($connection) . "<br>";
}
?>
