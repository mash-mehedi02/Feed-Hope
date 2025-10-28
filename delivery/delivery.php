<?php
ob_start();
include("connect.php");
include '../connection.php';

if ($_SESSION['name'] == '') {
    header("location:deliverylogin.php");
}

$name = $_SESSION['name'];
$city = $_SESSION['city'];
$id = $_SESSION['Did'];

// Accept order logic (unchanged)
if (isset($_POST['accept_order'])) {
    $order_id = intval($_POST['order_id']);
    $check_order = mysqli_query($connection, "SELECT status, assigned_to FROM food_donations WHERE Fid = $order_id");
    $order_data = mysqli_fetch_assoc($check_order);

    if ($order_data && $order_data['status'] == 'available' && ($order_data['assigned_to'] == NULL || $order_data['assigned_to'] == '')) {
        $assign_query = "UPDATE food_donations SET status = 'assigned', assigned_to = $id, delivery_by = $id WHERE Fid = $order_id AND assigned_to IS NULL";
        $result = mysqli_query($connection, $assign_query);

        if (mysqli_affected_rows($connection) > 0) {
            $order_info = mysqli_query($connection, "SELECT * FROM food_donations WHERE Fid = $order_id");
            $order = mysqli_fetch_assoc($order_info);
            $notif_query = "INSERT INTO notifications (user_email, donation_id, type, message)
                            VALUES ('{$order['email']}', $order_id, 'assigned',
                            'Your food order \"{$order['food']}\" has been accepted by delivery man: $name')";
            mysqli_query($connection, $notif_query);

            echo '<script>alert("Order accepted successfully! Check My Orders.");</script>';
            echo '<script>window.location.href = "delivery_profile.php";</script>';
            exit;
        } else {
            echo '<script>alert("Sorry, this order has already been taken by another delivery person.");</script>';
        }
    } else {
        echo '<script>alert("Sorry, this order is no longer available.");</script>';
    }
}
?>

<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>FeedHope Delivery Dashboard</title>
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.0/css/all.min.css">
    <style>
        * {
            box-sizing: border-box;
            margin: 0;
            padding: 0;
            font-family: 'Poppins', sans-serif;
        }

        body {
            background: #f4f6f8;
            display: flex;
            min-height: 100vh;
            overflow-x: hidden;
        }

        /* ===== SIDEBAR ===== */
        .sidebar {
            width: 250px;
            background: #06C167;
            color: #fff;
            display: flex;
            flex-direction: column;
            justify-content: space-between;
            padding: 20px 0;
            position: fixed;
            height: 100%;
        }

        .sidebar .logo {
            text-align: center;
            font-size: 24px;
            font-weight: 700;
            margin-bottom: 30px;
        }

        .sidebar ul {
            list-style: none;
        }

        .sidebar ul li {
            padding: 15px 30px;
            transition: 0.3s;
        }

        .sidebar ul li a {
            text-decoration: none;
            color: white;
            display: flex;
            align-items: center;
            gap: 10px;
            font-weight: 500;
        }

        .sidebar ul li:hover, .sidebar ul li.active {
            background: rgba(255, 255, 255, 0.2);
        }

        /* ===== MAIN CONTENT ===== */
        .main-content {
            margin-left: 250px;
            width: calc(100% - 250px);
            padding: 20px;
        }

        .topbar {
            display: flex;
            justify-content: space-between;
            align-items: center;
            background: white;
            padding: 15px 25px;
            border-radius: 12px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.05);
        }

        .topbar .title {
            font-size: 22px;
            font-weight: 600;
            color: #1f2937;
        }

        .topbar .profile {
            display: flex;
            align-items: center;
            gap: 10px;
            background: #06C167;
            color: white;
            padding: 8px 20px;
            border-radius: 25px;
            font-weight: 600;
        }

        /* ===== ORDER CARDS ===== */
        .orders-container {
            margin-top: 30px;
        }

        .order-card {
            background: white;
            border-radius: 12px;
            box-shadow: 0 4px 6px rgba(0,0,0,0.1);
            padding: 20px;
            margin-bottom: 20px;
            border-left: 4px solid #06C167;
            transition: transform 0.3s ease, box-shadow 0.3s ease;
        }

        .order-card:hover {
            transform: translateY(-5px);
            box-shadow: 0 10px 20px rgba(0,0,0,0.1);
        }

        .order-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
        }

        .order-title {
            font-size: 20px;
            font-weight: 600;
            color: #1f2937;
        }

        .status-badge {
            background: #fef3c7;
            color: #92400e;
            padding: 6px 15px;
            border-radius: 20px;
            font-weight: 600;
            font-size: 14px;
        }

        .order-img {
            width: 100%;
            height: 200px;
            object-fit: cover;
            border-radius: 10px;
            margin: 15px 0;
        }

        .order-info {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
            gap: 10px;
            margin-bottom: 10px;
            color: #374151;
        }

        .info-row {
            display: flex;
            align-items: center;
            gap: 8px;
            font-size: 14px;
        }

        .info-row i {
            color: #06C167;
        }

        .accept-btn {
            background: linear-gradient(135deg, #06C167, #059669);
            color: white;
            border: none;
            padding: 12px 30px;
            border-radius: 8px;
            font-weight: 600;
            cursor: pointer;
            transition: 0.3s;
            display: flex;
            align-items: center;
            gap: 8px;
        }

        .accept-btn:hover {
            transform: translateY(-2px);
            box-shadow: 0 8px 20px rgba(6, 193, 103, 0.3);
        }

        .no-orders {
            text-align: center;
            padding: 80px 20px;
            background: #f9fafb;
            border-radius: 12px;
            color: #6b7280;
            font-size: 18px;
        }

        @media (max-width: 768px) {
            .sidebar {
                display: none;
            }

            .main-content {
                margin-left: 0;
                width: 100%;
                padding: 15px;
            }

            .topbar {
                flex-direction: column;
                align-items: flex-start;
                gap: 10px;
            }

            .order-info {
                grid-template-columns: 1fr;
            }
        }
    </style>
</head>
<body>

<!-- ===== SIDEBAR ===== -->
<div class="sidebar">
    <div>
        <div class="logo">Feed <b style="color: #fff;">Hope</b></div>
        <ul>
            <li class="active"><a href="delivery.php"><i class="fas fa-box"></i> Available Orders</a></li>
            <li><a href="delivery_profile.php"><i class="fas fa-user"></i> My Profile</a></li>
            <li><a href="deliverymyord.php"><i class="fas fa-list"></i> My Orders</a></li>
            <li><a href="openmap.php"><i class="fas fa-map"></i> Map</a></li>
        </ul>
    </div>
    <div style="text-align:center;">
        <a href="../logout.php" style="color:#fff;text-decoration:none;font-weight:600;"><i class="fas fa-sign-out-alt"></i> Logout</a>
    </div>
</div>

<!-- ===== MAIN CONTENT ===== -->
<div class="main-content">
    <div class="topbar">
        <div class="title"><i class="fas fa-truck"></i> Delivery Dashboard</div>
        <div class="profile">
            <i class="fas fa-user-circle"></i> <?php echo htmlspecialchars($name); ?>
        </div>
    </div>

    <div class="orders-container">
        <h2 style="margin: 25px 0; color:#06C167;"><i class="fas fa-utensils"></i> Available Orders in <?php echo htmlspecialchars($city); ?></h2>

        <?php
        $sql = "SELECT * FROM food_donations 
                WHERE status = 'available' 
                AND (assigned_to IS NULL OR assigned_to = '') 
                AND location = '$city'
                ORDER BY date DESC";
        $result = mysqli_query($connection, $sql);

        if ($result && mysqli_num_rows($result) > 0) {
            while ($row = mysqli_fetch_assoc($result)) {
        ?>
        <div class="order-card">
            <div class="order-header">
                <div class="order-title"><i class="fas fa-utensils"></i> <?php echo htmlspecialchars($row['food']); ?></div>
                <span class="status-badge"><?php echo htmlspecialchars($row['status']); ?></span>
            </div>

            <?php if (!empty($row['food_image'])): ?>
                <img src="../uploads/food_images/<?php echo htmlspecialchars($row['food_image']); ?>" alt="Food Image" class="order-img">
            <?php endif; ?>

            <div class="order-info">
                <div class="info-row"><i class="fas fa-user"></i> <strong>Donor:</strong> <?php echo htmlspecialchars($row['name']); ?></div>
                <div class="info-row"><i class="fas fa-weight"></i> <strong>Quantity:</strong> <?php echo htmlspecialchars($row['quantity']); ?></div>
                <div class="info-row"><i class="fas fa-map-marker-alt"></i> <strong>Pickup:</strong> <?php echo htmlspecialchars($row['address']); ?></div>
                <div class="info-row"><i class="fas fa-phone"></i> <strong>Contact:</strong> <?php echo htmlspecialchars($row['phoneno']); ?></div>
                <div class="info-row"><i class="fas fa-tag"></i> <strong>Type:</strong> <?php echo htmlspecialchars($row['type']); ?></div>
                <div class="info-row"><i class="fas fa-calendar"></i> <strong>Date:</strong> <?php echo date('M d, Y H:i', strtotime($row['date'])); ?></div>
            </div>

            <form method="POST">
                <input type="hidden" name="order_id" value="<?php echo $row['Fid']; ?>">
                <button type="submit" name="accept_order" class="accept-btn"><i class="fas fa-check-circle"></i> Accept Order</button>
            </form>
        </div>
        <?php
            }
        } else {
            echo '<div class="no-orders"><i class="fas fa-inbox" style="font-size:60px;color:#d1d5db;"></i><br>No available orders yet.</div>';
        }
        ?>
    </div>
</div>

</body>
</html>
