<?php
ob_start(); 
include("connect.php"); 
if($_SESSION['name']==''){
	header("location:signin.php");
}

$connection=mysqli_connect("localhost","root","");
$db=mysqli_select_db($connection,'demo');

// Check if status column exists, if not, create it with all values
$check_status = mysqli_query($connection, "SHOW COLUMNS FROM food_donations LIKE 'status'");
if(mysqli_num_rows($check_status) == 0) {
    mysqli_query($connection, "ALTER TABLE food_donations ADD COLUMN status ENUM('pending','available','assigned','delivered','completed','rejected') DEFAULT 'pending'");
} else {
    // Update enum values if status exists
    mysqli_query($connection, "ALTER TABLE food_donations MODIFY COLUMN status ENUM('pending','available','assigned','delivered','completed','rejected') DEFAULT 'pending'");
}

// Check if admin_approved_by column exists
$check_col = mysqli_query($connection, "SHOW COLUMNS FROM food_donations LIKE 'admin_approved_by'");
if(mysqli_num_rows($check_col) == 0) {
    mysqli_query($connection, "ALTER TABLE food_donations ADD COLUMN admin_approved_by INT(11) DEFAULT NULL, ADD COLUMN admin_approved_at DATETIME DEFAULT NULL");
}

// Check/create notifications table
$check_notif = mysqli_query($connection, "SHOW TABLES LIKE 'notifications'");
if(mysqli_num_rows($check_notif) == 0) {
    mysqli_query($connection, "CREATE TABLE IF NOT EXISTS notifications (
        id INT(11) NOT NULL AUTO_INCREMENT PRIMARY KEY,
        user_email VARCHAR(255) NOT NULL,
        donation_id INT(11) NOT NULL,
        type ENUM('new_order','assigned','delivered') NOT NULL,
        message TEXT NOT NULL,
        is_read BOOLEAN DEFAULT FALSE,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )");
}

$admin_id = isset($_SESSION['Aid']) ? $_SESSION['Aid'] : '';

// Handle approval/rejection actions
if(isset($_POST['action']) && isset($_POST['donation_id'])) {
    $donation_id = intval($_POST['donation_id']);
    $action = $_POST['action'];
    
    if($action == 'accept') {
        $update_query = "UPDATE food_donations SET status = 'available', admin_approved_by = '$admin_id', admin_approved_at = NOW() WHERE Fid = $donation_id";
        if(mysqli_query($connection, $update_query)) {
            // Get donation details for notification
            $get_donation = mysqli_query($connection, "SELECT * FROM food_donations WHERE Fid = $donation_id");
            $donation_data = mysqli_fetch_assoc($get_donation);
            
            // Create notification for delivery men
            $notif_query = "INSERT INTO notifications (user_email, donation_id, type, message) 
                            VALUES ('{$donation_data['email']}', $donation_id, 'new_order', 
                            'New food order available: {$donation_data['food']} - {$donation_data['location']}')";
            mysqli_query($connection, $notif_query);
            
            echo '<script>alert("Order approved and available for delivery men!");</script>';
            echo '<script>window.location.href = "food_approval.php";</script>';
            exit;
        }
    } elseif($action == 'reject') {
        $update_query = "UPDATE food_donations SET status = 'rejected' WHERE Fid = $donation_id";
        if(mysqli_query($connection, $update_query)) {
            echo '<script>alert("Donation rejected.");</script>';
            echo '<script>window.location.href = "food_approval.php";</script>';
            exit;
        }
    }
}

// Show ALL donations regardless of admin location
// Get pending donations
$pending_sql = "SELECT * FROM food_donations WHERE (status = 'pending' OR status IS NULL) ORDER BY date DESC";
$pending_result = mysqli_query($connection, $pending_sql);

// Get available donations (approved and ready for delivery)
$available_sql = "SELECT * FROM food_donations WHERE status = 'available' ORDER BY date DESC";
$available_result = mysqli_query($connection, $available_sql);

// Get assigned donations
$assigned_sql = "SELECT fd.*, dp.name as delivery_person_name FROM food_donations fd 
                 LEFT JOIN delivery_persons dp ON fd.assigned_to = dp.Did 
                 WHERE fd.status = 'assigned' ORDER BY fd.date DESC";
$assigned_result = mysqli_query($connection, $assigned_sql);
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Food Approval - Feed Hope</title>
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css">
    <link rel="stylesheet" href="admin.css">
    <style>
        .approval-wrapper {
            max-width: 1400px;
            margin: 0 auto;
            padding: 20px;
        }
        
        .section-header {
            margin-bottom: 30px;
            padding-bottom: 15px;
            border-bottom: 3px solid #06C167;
        }
        
        .section-header h2 {
            color: #333;
            font-size: 28px;
            margin: 27px;
            display: flex;
            align-items: center;
            gap: 10px;
        }
        
        .badge {
            background: #06C167;
            color: white;
            padding: 5px 15px;
            border-radius: 20px;
            font-size: 14px;
        }
        
        .badge-pending {
            background: #f59e0b;
        }
        
        .badge-approved {
            background: #10b981;
        }
        
        .food-cards {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
            gap: 25px;
            margin-bottom: 40px;
        }
        
        .food-card {
            background: white;
            border-radius: 12px;
            box-shadow: 0 4px 6px rgba(0,0,0,0.1);
            overflow: hidden;
            transition: transform 0.3s, box-shadow 0.3s;
        }
        
        .food-card:hover {
            transform: translateY(-5px);
            box-shadow: 0 8px 20px rgba(0,0,0,0.15);
        }
        
        .food-image {
            width: 100%;
            height: 200px;
            object-fit: cover;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            display: flex;
            align-items: center;
            justify-content: center;
            color: white;
            font-size: 50px;
        }
        
        .food-body {
            padding: 20px;
        }
        
        .food-title {
            font-size: 20px;
            font-weight: 600;
            color: #1f2937;
            margin-bottom: 12px;
            display: flex;
            align-items: center;
            gap: 10px;
        }
        
        .food-info {
            display: flex;
            flex-direction: column;
            gap: 8px;
            margin-bottom: 15px;
        }
        
        .info-item {
            display: flex;
            align-items: center;
            gap: 10px;
            color: #6b7280;
            font-size: 14px;
        }
        
        .info-item i {
            color: #06C167;
            width: 18px;
        }
        
        .donor-name {
            font-weight: 600;
            color: #1f2937;
        }
        
        .action-buttons {
            display: flex;
            gap: 10px;
            margin-top: 15px;
        }
        
        .btn {
            flex: 1;
            padding: 12px 20px;
            border: none;
            border-radius: 8px;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.3s;
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 8px;
        }
        
        .btn-accept {
            background: linear-gradient(135deg, #10b981, #059669);
            color: white;
        }
        
        .btn-accept:hover {
            background: linear-gradient(135deg, #059669, #047857);
            transform: translateY(-2px);
        }
        
        .btn-reject {
            background: linear-gradient(135deg, #ef4444, #dc2626);
            color: white;
        }
        
        .btn-reject:hover {
            background: linear-gradient(135deg, #dc2626, #b91c1c);
            transform: translateY(-2px);
        }
        
        .no-donations {
            text-align: center;
            padding: 60px 20px;
            background: #f9fafb;
            border-radius: 12px;
            color: #6b7280;
        }
        
        .no-donations i {
            font-size: 60px;
            color: #d1d5db;
            margin-bottom: 15px;
        }
        
        .no-donations h3 {
            color: #374151;
            margin-bottom: 8px;
        }
    </style>
</head>
<body>
    <nav>
        <div class="logo-name">
            <div class="logo-image"></div>
            <span class="logo_name">ADMIN</span>
        </div>
        <div class="menu-items">
            <ul class="nav-links">
                <li><a href="admin.php"><i class="uil uil-estate"></i><span class="link-name">Dashboard</span></a></li>
                <li><a href="analytics.php"><i class="uil uil-chart"></i><span class="link-name">Analytics</span></a></li>
                <li><a href="donate.php"><i class="uil uil-heart"></i><span class="link-name">Donates</span></a></li>
                <li><a href="food_approval.php" class="active"><i class="uil uil-check-circle"></i><span class="link-name">Food Approval</span></a></li>
                <li><a href="feedback.php"><i class="uil uil-comments"></i><span class="link-name">Feedbacks</span></a></li>
                <li><a href="adminprofile.php"><i class="uil uil-user"></i><span class="link-name">Profile</span></a></li>
            </ul>
            <ul class="logout-mode">
                <li><a href="../logout.php"><i class="uil uil-signout"></i><span class="link-name">Logout</span></a></li>
            </ul>
        </div>
    </nav>

    <section class="dashboard">
        <div class="top">
            <i class="uil uil-bars sidebar-toggle"></i>
            <p class="logo">Feed <b style="color: #06C167;">Hope</b></p>
        </div>

        <div class="approval-wrapper">
            <!-- Pending Donations Section -->
            <div class="section-header">
                <h2>
                    <i class="fas fa-clock"></i>
                    Pending Donations
                    <span class="badge badge-pending"><?php echo mysqli_num_rows($pending_result); ?></span>
                </h2>
            </div>

            <?php if(mysqli_num_rows($pending_result) > 0): ?>
                <div class="food-cards">
                    <?php while($donation = mysqli_fetch_assoc($pending_result)): ?>
                            <div class="food-card">
                            <div class="food-image">
                                <?php if(!empty($donation['food_image'])): ?>
                                    <img src="../uploads/food_images/<?php echo htmlspecialchars($donation['food_image']); ?>" alt="<?php echo htmlspecialchars($donation['food']); ?>" style="width:100%;height:200px;object-fit:cover;">
                                <?php else: ?>
                                        <i class="fas fa-utensils"></i>
                                <?php endif; ?>
                                    </div>
                            <div class="food-body">
                                <h3 class="food-title">
                                    <?php echo htmlspecialchars($donation['food']); ?>
                                </h3>
                                <div class="food-info">
                                    <div class="info-item">
                                            <i class="fas fa-user"></i>
                                        <span><strong>Donor:</strong> <span class="donor-name"><?php echo htmlspecialchars($donation['name']); ?></span></span>
                                        </div>
                                    <div class="info-item">
                                        <i class="fas fa-weight"></i>
                                        <span><strong>Quantity:</strong> <?php echo htmlspecialchars($donation['quantity']); ?></span>
                                        </div>
                                    <div class="info-item">
                                        <i class="fas fa-map-marker-alt"></i>
                                        <span><strong>Location:</strong> <?php echo htmlspecialchars($donation['location']); ?></span>
                                        </div>
                                    <div class="info-item">
                                            <i class="fas fa-tag"></i>
                                        <span><strong>Type:</strong> <?php echo htmlspecialchars($donation['type']); ?></span>
                                    </div>
                                    <div class="info-item">
                                        <i class="fas fa-briefcase"></i>
                                        <span><strong>Category:</strong> <?php echo htmlspecialchars($donation['category']); ?></span>
                                    </div>
                                    <div class="info-item">
                                        <i class="fas fa-phone"></i>
                                        <span><strong>Contact:</strong> <?php echo htmlspecialchars($donation['phoneno']); ?></span>
                                    </div>
                                    <div class="info-item">
                                        <i class="fas fa-calendar"></i>
                                        <span><strong>Date:</strong> <?php echo date('M d, Y H:i', strtotime($donation['date'])); ?></span>
                                        </div>
                                    </div>
                                            <div class="action-buttons">
                                    <button type="button" class="btn btn-accept approve-btn" data-donation-id="<?php echo $donation['Fid']; ?>">
                                        <i class="fas fa-check"></i> Accept
                                    </button>
                                    <form method="POST" style="flex: 1;">
                                        <input type="hidden" name="donation_id" value="<?php echo $donation['Fid']; ?>">
                                        <button type="submit" name="action" value="reject" class="btn btn-reject" onclick="return confirm('Are you sure you want to reject this donation?');">
                                                    <i class="fas fa-times"></i> Reject
                                                </button>
                                        </form>
                                    </div>
                                </div>
                            </div>
                        <?php endwhile; ?>
                    </div>
                <?php else: ?>
                <div class="no-donations">
                    <i class="fas fa-inbox"></i>
                    <h3>No pending donations</h3>
                    <p>All donations have been reviewed.</p>
                    </div>
                <?php endif; ?>

            <!-- Available Donations Section -->
            <div class="section-header" style="margin-top: 50px;">
                <h2>
                    <i class="fas fa-shopping-bag"></i>
                    Available Orders (Ready for Delivery)
                    <span class="badge badge-approved"><?php echo mysqli_num_rows($available_result); ?></span>
                </h2>
            </div>

            <?php if(mysqli_num_rows($available_result) > 0): ?>
                <div class="food-cards">
                    <?php while($donation = mysqli_fetch_assoc($available_result)): ?>
                        <div class="food-card">
                            <div class="food-image">
                                <?php if(!empty($donation['food_image'])): ?>
                                    <img src="../uploads/food_images/<?php echo htmlspecialchars($donation['food_image']); ?>" alt="<?php echo htmlspecialchars($donation['food']); ?>" style="width:100%;height:200px;object-fit:cover;">
                                <?php else: ?>
                                    <i class="fas fa-utensils"></i>
                                <?php endif; ?>
                            </div>
                            <div class="food-body">
                                <h3 class="food-title">
                                    <?php echo htmlspecialchars($donation['food']); ?>
                                    <span class="badge badge-approved" style="margin-left: auto;">Available</span>
                                </h3>
                                <div class="food-info">
                                    <div class="info-item">
                                        <i class="fas fa-user"></i>
                                        <span><strong>Donor:</strong> <span class="donor-name"><?php echo htmlspecialchars($donation['name']); ?></span></span>
                                    </div>
                                    <div class="info-item">
                                        <i class="fas fa-weight"></i>
                                        <span><strong>Quantity:</strong> <?php echo htmlspecialchars($donation['quantity']); ?></span>
                                    </div>
                                    <div class="info-item">
                                        <i class="fas fa-map-marker-alt"></i>
                                        <span><strong>Location:</strong> <?php echo htmlspecialchars($donation['location']); ?></span>
                                    </div>
                                    <div class="info-item">
                                        <i class="fas fa-phone"></i>
                                        <span><strong>Contact:</strong> <?php echo htmlspecialchars($donation['phoneno']); ?></span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    <?php endwhile; ?>
                </div>
                <?php else: ?>
                    <div class="no-donations">
                        <i class="fas fa-shopping-bag"></i>
                        <h3>No available orders yet</h3>
                        <p>Orders will appear here when they are approved and ready for delivery.</p>
                    </div>
                <?php endif; ?>

            <!-- Assigned Donations Section -->
            <div class="section-header" style="margin-top: 50px;">
                <h2>
                    <i class="fas fa-user-check"></i>
                    Assigned Orders
                    <span class="badge badge-approved"><?php echo mysqli_num_rows($assigned_result); ?></span>
                </h2>
            </div>

            <?php if(mysqli_num_rows($assigned_result) > 0): ?>
                <div class="food-cards">
                    <?php while($donation = mysqli_fetch_assoc($assigned_result)): ?>
                        <div class="food-card">
                            <div class="food-image">
                                <?php if(!empty($donation['food_image'])): ?>
                                    <img src="../uploads/food_images/<?php echo htmlspecialchars($donation['food_image']); ?>" alt="<?php echo htmlspecialchars($donation['food']); ?>" style="width:100%;height:200px;object-fit:cover;">
                                <?php else: ?>
                                    <i class="fas fa-utensils"></i>
                                    <?php endif; ?>
                                </div>
                            <div class="food-body">
                                <h3 class="food-title">
                                    <?php echo htmlspecialchars($donation['food']); ?>
                                    <span class="badge badge-approved" style="margin-left: auto; background: #f59e0b;">Assigned to: <?php echo htmlspecialchars($donation['delivery_person_name'] ?? 'Unknown'); ?></span>
                                </h3>
                                <div class="food-info">
                                    <div class="info-item">
                                        <i class="fas fa-user"></i>
                                        <span><strong>Donor:</strong> <span class="donor-name"><?php echo htmlspecialchars($donation['name']); ?></span></span>
                                    </div>
                                    <div class="info-item">
                                        <i class="fas fa-weight"></i>
                                        <span><strong>Quantity:</strong> <?php echo htmlspecialchars($donation['quantity']); ?></span>
                                    </div>
                                    <div class="info-item">
                                        <i class="fas fa-map-marker-alt"></i>
                                        <span><strong>Location:</strong> <?php echo htmlspecialchars($donation['location']); ?></span>
                                    </div>
                                    <div class="info-item">
                                        <i class="fas fa-phone"></i>
                                        <span><strong>Contact:</strong> <?php echo htmlspecialchars($donation['phoneno']); ?></span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    <?php endwhile; ?>
                </div>
                <?php else: ?>
                <div class="no-donations">
                    <i class="fas fa-user-check"></i>
                    <h3>No assigned orders yet</h3>
                    <p>Orders will appear here after delivery men accept them.</p>
                    </div>
                <?php endif; ?>
        </div>
    </section>

    <script src="admin.js"></script>
    <script>
    document.addEventListener('click', async function(e){
        const btn = e.target.closest('.approve-btn');
        if(!btn) return;
        const id = btn.getAttribute('data-donation-id');
        const card = btn.closest('.food-card');
        try{
            const fd = new FormData();
            fd.append('donation_id', id);
            const res = await fetch('api/approve_food.php', { method:'POST', body: fd, credentials:'same-origin' });
            const j = await res.json();
            if(j.ok){ if(card) card.remove(); alert('Approved → Pending'); }
            else alert(j.error || 'Failed');
        }catch(err){ alert('Network error'); }
    });
    </script>
</body>
</html>

