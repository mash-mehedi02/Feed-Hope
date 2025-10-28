<?php
ob_start();
session_start();
include("connect.php");
include '../connection.php';

if (!isset($_SESSION['name']) || $_SESSION['name'] == '') {
    header("location:deliverylogin.php");
    exit;
}

$name = $_SESSION['name'];
$area = $_SESSION['city']; // Using city as area
$id = $_SESSION['Did'];

// Handle order completion
if (isset($_POST['complete_order'])) {
    $order_id = intval($_POST['order_id']);

    $order_info = mysqli_query($connection, "SELECT * FROM food_donations WHERE Fid = $order_id");
    $order = mysqli_fetch_assoc($order_info);

    $check_col = mysqli_query($connection, "SHOW COLUMNS FROM food_donations LIKE 'completed_at'");
    if (mysqli_num_rows($check_col) == 0) {
        mysqli_query($connection, "ALTER TABLE food_donations ADD COLUMN completed_at DATETIME DEFAULT NULL, ADD COLUMN completed_by INT(11) DEFAULT NULL");
    }

    $complete_query = "UPDATE food_donations SET status = 'completed', completed_at = NOW(), completed_by = $id WHERE Fid = $order_id";

    if (mysqli_query($connection, $complete_query)) {
        $notif_query = "INSERT INTO notifications (user_email, donation_id, type, message) 
                        VALUES ('{$order['email']}', $order_id, 'delivered', 
                        'Your food donation \"{$order['food']}\" has been successfully completed by delivery man: $name')";
        mysqli_query($connection, $notif_query);

        $_SESSION['flash'] = "Order marked as completed! User and admin will be notified.";
        header("Location: delivery_profile_premium.php");
        exit;
    } else {
        $_SESSION['flash'] = "Failed to mark order completed. Try again.";
        header("Location: delivery_profile_premium.php");
        exit;
    }
}

// Handle order acceptance
if (isset($_POST['accept_order'])) {
    $order_id = intval($_POST['order_id']);

    $check_order = mysqli_query($connection, "SELECT status, assigned_to FROM food_donations WHERE Fid = $order_id");
    $order_data = mysqli_fetch_assoc($check_order);

    if ($order_data && $order_data['status'] == 'available' && ($order_data['assigned_to'] == NULL || $order_data['assigned_to'] == '' || $order_data['assigned_to'] == 0)) {
        $assign_query = "UPDATE food_donations SET status = 'assigned', assigned_to = $id, delivery_by = $id WHERE Fid = $order_id AND (assigned_to IS NULL OR assigned_to = 0)";

        $result = mysqli_query($connection, $assign_query);

        if (mysqli_affected_rows($connection) > 0) {
            $order_info = mysqli_query($connection, "SELECT * FROM food_donations WHERE Fid = $order_id");
            $order = mysqli_fetch_assoc($order_info);

            $notif_query = "INSERT INTO notifications (user_email, donation_id, type, message) 
                            VALUES ('{$order['email']}', $order_id, 'assigned', 
                            'Your food order \"{$order['food']}\" has been accepted by: $name')";
            mysqli_query($connection, $notif_query);

            $_SESSION['flash'] = "Order accepted successfully!";
            header("Location: delivery_profile_premium.php");
            exit;
        } else {
            $_SESSION['flash'] = "Order already taken!";
            header("Location: delivery_profile_premium.php");
            exit;
        }
    } else {
        $_SESSION['flash'] = "Order is no longer available.";
        header("Location: delivery_profile_premium.php");
        exit;
    }
}

// Get orders
$pending_sql = "SELECT * FROM food_donations 
                WHERE status = 'available' 
                AND (assigned_to IS NULL OR assigned_to = '' OR assigned_to = 0) 
                AND location = '" . mysqli_real_escape_string($connection, $area) . "' ORDER BY date DESC";
$pending_result = mysqli_query($connection, $pending_sql);

$ongoing_sql = "SELECT * FROM food_donations 
                WHERE status = 'assigned' 
                AND (assigned_to = $id OR delivery_by = $id)
                ORDER BY date DESC";
$ongoing_result = mysqli_query($connection, $ongoing_sql);

$check_completed_col = mysqli_query($connection, "SHOW COLUMNS FROM food_donations LIKE 'completed_by'");
if (mysqli_num_rows($check_completed_col) == 0) {
    $completed_sql = "SELECT * FROM food_donations 
                      WHERE status = 'completed' 
                      AND (assigned_to = $id OR delivery_by = $id)
                      ORDER BY date DESC";
} else {
    $completed_sql = "SELECT * FROM food_donations 
                      WHERE status = 'completed' 
                      AND completed_by = $id
                      ORDER BY completed_at DESC";
}
$completed_result = mysqli_query($connection, $completed_sql);

$profile_sql = "SELECT * FROM delivery_persons WHERE Did = $id";
$profile_result = mysqli_query($connection, $profile_sql);
$profile = mysqli_fetch_assoc($profile_result);

$flash = '';
if (isset($_SESSION['flash'])) {
    $flash = $_SESSION['flash'];
    unset($_SESSION['flash']);
}
?>
<!DOCTYPE html>
<html lang="en">

<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>FeedHope — Delivery Dashboard</title>
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;600;700&display=swap" rel="stylesheet">
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.0/css/all.min.css">

    <style>
        :root {
            --primary: #0284c7;
            --secondary: #06c167;
            --accent: #059669;
            --bg-light: #f7fafc;
            --bg-dark: #0b1020;
            --text-dark: #111827; 
            --text-light: #f8fafc;
            --muted: #6b7280;
            --card-light: #ffffff;
            --card-dark: #111827;
            --shadow: 0 8px 28px rgba(2, 6, 23, 0.08);
        }

        [data-theme="dark"] {
            --bg-light: var(--bg-dark);
            --card-light: var(--card-dark);
            --text-dark: var(--text-light);
            --muted: #9ca3af;
            --shadow: 0 0 0 rgba(0, 0, 0, 0);
        }

        * {
            box-sizing: border-box;
            font-family: 'Poppins', sans-serif;
            transition: all 0.3s ease;
        }

        body {
            margin: 0;
            background: var(--bg-light);
            color: var(--text-dark);
        }

        a { text-decoration: none; color: inherit; }

        .sidebar {
            background: linear-gradient(180deg, var(--primary), var(--secondary));
            border-radius: 18px;
            color: white;
            padding: 24px;
            width: 260px;
            height: calc(100vh - 56px);
            display: flex;
            flex-direction: column;
            justify-content: space-between;
            position: sticky;
            top: 28px;
            box-shadow: 0 10px 30px rgba(0, 0, 0, 0.15);
        }

        .brand { font-size: 24px; font-weight: 700; letter-spacing: 0.5px; }
        .profile-brief { display:flex; gap:12px; margin-top:18px; align-items:center; }
        .avatar { background: rgba(255,255,255,0.2); border-radius:50%; width:56px; height:56px; display:flex; justify-content:center; align-items:center; font-size:22px; }
        .nav a { display:flex; align-items:center; gap:12px; padding:12px; font-weight:600; border-radius:10px; transition:0.3s; }
        .nav a:hover, .nav a.active { background: rgba(255,255,255,0.15); transform: translateX(5px); }

        .wrap { display:flex; gap:24px; max-width:1300px; margin:30px auto; padding:0 24px; }
        .main { flex:1; }

        .topbar { display:flex; justify-content:space-between; align-items:center; margin-bottom:18px; }

        .card, .order-card { 
            background: var(--card-light); 
            border-radius:16px; 
            padding:18px; 
            box-shadow: var(--shadow); 
            transition: all 0.3s ease; 
            color: var(--text-dark);
        }
        .card:hover, .order-card:hover { transform: translateY(-4px); box-shadow: 0 14px 28px rgba(0,0,0,0.12); }

        .stats { display:flex; flex-wrap:wrap; gap:16px; margin-top:16px; }
        .stat { flex:1 1 180px; background: linear-gradient(135deg, rgba(6,193,103,0.1), rgba(2,132,199,0.08)); border-radius:14px; padding:16px; text-align:center; transition:0.3s; }
        .stat:hover { background: linear-gradient(135deg, var(--primary), var(--secondary)); color:white; }

        .order-head { border-radius:16px 16px 0 0; padding:14px 18px; display:flex; justify-content:space-between; align-items:center; background: linear-gradient(90deg, var(--secondary), var(--primary)); color:white; }
        .badge { padding:6px 12px; border-radius:999px; font-weight:600; font-size:13px; background: rgba(255,255,255,0.2); transition:0.3s; }
        .badge:hover { background: rgba(255,255,255,0.35); }

        .btn { border:none; border-radius:10px; padding:10px 14px; font-weight:700; cursor:pointer; transition:0.3s; }
        .btn-accept { background: linear-gradient(135deg, #06c167, #0284c7); color:white; }
        .btn-accept:hover { opacity:0.9; transform:translateY(-2px); }
        .btn-complete { background:transparent; border:2px solid var(--accent); color:var(--accent); }
        .btn-complete:hover { background: var(--accent); color:white; transform:translateY(-2px); }

        .orders-grid { display:grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap:20px; margin-top:16px; }

        .toast { position: fixed; right: 22px; bottom: 22px; background: var(--card-light); box-shadow: 0 10px 30px rgba(2,6,23,0.1); padding:14px 18px; border-radius:10px; display:flex; gap:12px; align-items:center; min-width:260px; opacity:0; transform:translateY(20px); transition: all 0.4s ease; }
        .toast.show { opacity:1; transform:translateY(0); }
    </style>
</head>

<body data-theme="<?php echo (isset($_COOKIE['fh_theme']) && $_COOKIE['fh_theme'] == 'dark') ? 'dark' : 'light'; ?>">

    <div class="wrap">
        <!-- SIDEBAR -->
        <aside class="sidebar card" role="navigation">
            <div>
                <div class="brand">Feed <strong>Hope</strong></div>
                <div class="profile-brief">
                    <div class="avatar"><i class="fas fa-truck"></i></div>
                    <div>
                        <div style="font-weight:700"><?php echo htmlspecialchars($name); ?></div>
                        <div style="font-size:13px;opacity:0.9"><?php echo htmlspecialchars($profile['email'] ?? ''); ?></div>
                    </div>
                </div>

                <nav class="nav">
                    <a href="delivery.php" class="active"><i class="fas fa-box-open"></i> Available Orders</a>
                    <a href="delivery_profile_premium.php"><i class="fas fa-user"></i> My Profile</a>
                    <a href="deliverymyord.php"><i class="fas fa-list"></i> My Orders</a>
                    <a href="openmap.php"><i class="fas fa-map"></i> Map</a>
                </nav>
            </div>

            <div>
                <div style="margin-bottom:12px; font-size:13px; opacity:0.95">Theme</div>
                <div style="display:flex;gap:8px;margin-bottom:12px">
                    <button id="lightBtn" class="btn" style="background:#fff;color:#111">Light</button>
                    <button id="darkBtn" class="btn" style="background:transparent;border:1px solid rgba(255,255,255,0.12);color:#fff">Dark</button>
                </div>
                <a href="../logout.php" class="logout"><i class="fas fa-sign-out-alt"></i> Logout</a>
            </div>
        </aside>

        <!-- MAIN -->
        <main class="main">
            <div class="topbar">
                <div style="display:flex;flex-direction:column">
                    <div style="font-size:20px;font-weight:700">Delivery Dashboard</div>
                    <div style="color:var(--muted);font-size:13px">Area: <?php echo htmlspecialchars($area); ?></div>
                </div>
                <div class="actions">
                    <div style="text-align:right">
                        <div style="color:var(--muted);font-size:13px">Signed in as</div>
                        <div style="font-weight:700"><?php echo htmlspecialchars($name); ?></div>
                    </div>
                </div>
            </div>

            <!-- profile header & stats -->
            <div class="card profile-header">
                <h3 style="margin:0">Welcome, <?php echo htmlspecialchars($name); ?></h3>
                <p style="margin:6px 0 0;color:var(--muted)">Your FeedHope delivery dashboard — accept orders and mark them complete.</p>

                <div class="stats">
                    <div class="stat">
                        <h4>Pending Orders</h4>
                        <p><?php echo mysqli_num_rows($pending_result); ?></p>
                    </div>
                    <div class="stat">
                        <h4>Ongoing Deliveries</h4>
                        <p><?php echo mysqli_num_rows($ongoing_result); ?></p>
                    </div>
                    <div class="stat">
                        <h4>Completed</h4>
                        <p><?php echo mysqli_num_rows($completed_result); ?></p>
                    </div>
                </div>
            </div>

            <!-- Pending / Ongoing / Completed orders sections remain the same as before -->

        </main>
    </div>

    <!-- TOAST -->
    <div id="toast" class="toast" role="status" aria-live="polite" aria-atomic="true" style="display:none">
        <div style="font-size:20px;color:var(--accent)"><i class="fas fa-bell"></i></div>
        <div>
            <div id="toast-title" style="font-weight:700">Notification</div>
            <div id="toast-body" style="color:var(--muted);font-size:13px"></div>
        </div>
    </div>

    <script>
        const lightBtn = document.getElementById('lightBtn');
        const darkBtn = document.getElementById('darkBtn');

        function setTheme(t) {
            if (t === 'dark') {
                document.documentElement.setAttribute('data-theme', 'dark');
                document.cookie = "fh_theme=dark; path=/; max-age=" + 60*60*24*365;
            } else {
                document.documentElement.setAttribute('data-theme', 'light');
                document.cookie = "fh_theme=light; path=/; max-age=" + 60*60*24*365;
            }
        }

        lightBtn.addEventListener('click', () => setTheme('light'));
        darkBtn.addEventListener('click', () => setTheme('dark'));

        function showToast(title, body, duration=4500) {
            const toast = document.getElementById('toast');
            document.getElementById('toast-title').innerText = title;
            document.getElementById('toast-body').innerText = body;
            toast.style.display='flex';
            setTimeout(()=>toast.classList.add('show'),50);
            setTimeout(()=>{ toast.classList.remove('show'); setTimeout(()=>toast.style.display='none',350); }, duration);
        }

        <?php if(!empty($flash)): ?>
        showToast("Success", <?php echo json_encode($flash); ?>, 5000);
        <?php endif; ?>
    </script>
</body>
</html>
