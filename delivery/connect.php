<?php
// ✅ Start session safely (prevents duplicate start notice)
if (session_status() === PHP_SESSION_NONE) {
    session_start();
}

include '../connection.php';  // Ensure connection file doesn't start session again

$msg = 0;

if (isset($_POST['sign'])) {
    $email = trim($_POST['email']);
    $password = trim($_POST['password']);

    // ✅ Input sanitization
    $sanitized_email = mysqli_real_escape_string($connection, $email);
    $sanitized_password = mysqli_real_escape_string($connection, $password);

    // ✅ Query to check if admin exists
    $sql = "SELECT * FROM admin WHERE email='$sanitized_email' LIMIT 1";
    $result = mysqli_query($connection, $sql);

    if ($result && mysqli_num_rows($result) === 1) {
        $row = mysqli_fetch_assoc($result);

        // ✅ Password verification
        if (password_verify($sanitized_password, $row['password'])) {
            // ✅ Store session data
            $_SESSION['Aid'] = $row['Aid'];
            $_SESSION['email'] = $row['email'];
            $_SESSION['name'] = $row['name'];
            $_SESSION['location'] = $row['location'];

            // ✅ Redirect to admin dashboard
            header("Location: admin.php");
            exit();
        } else {
            $msg = 1; // Incorrect password
        }
    } else {
        $msg = 2; // Account doesn’t exist
    }
}
?>

<!-- ✅ Example minimal HTML for showing errors -->
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>Admin Login</title>
    <style>
        body { font-family: Arial; background: #f6f8fa; }
        .error { color: red; text-align: center; }
    </style>
</head>
<body>
    <?php if ($msg === 1): ?>
        <p class="error">⚠️ Incorrect password! Please try again.</p>
    <?php elseif ($msg === 2): ?>
        <p class="error">❌ Account does not exist!</p>
    <?php endif; ?>
</body>
</html>
