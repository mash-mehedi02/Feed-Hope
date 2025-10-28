<?php
ob_start(); 
include("connect.php"); 
if($_SESSION['name']==''){
	header("location:signin.php");
}

$connection=mysqli_connect("localhost","root","");
$db=mysqli_select_db($connection,'demo');

// Handle status updates
if(isset($_POST['update_status'])) {
    $donation_id = $_POST['donation_id'];
    $new_status = $_POST['status'];
    $delivery_person_id = $_POST['delivery_person_id'];
    
    $update_query = "UPDATE food_donations SET status = '$new_status', delivery_by = '$delivery_person_id' WHERE Fid = '$donation_id'";
    mysqli_query($connection, $update_query);
    
    // Add tracking record
    $tracking_query = "INSERT INTO delivery_tracking (donation_id, delivery_person_id, status) VALUES ('$donation_id', '$delivery_person_id', '$new_status')";
    mysqli_query($connection, $tracking_query);
    
    // Send notification
    $donation_query = "SELECT email FROM food_donations WHERE Fid = '$donation_id'";
    $donation_result = mysqli_query($connection, $donation_query);
    $donation_data = mysqli_fetch_assoc($donation_result);
    
    $notification_query = "INSERT INTO notifications (user_email, delivery_person_id, donation_id, type, message) VALUES ('{$donation_data['email']}', '$delivery_person_id', '$donation_id', '$new_status', 'Your food donation status updated to: $new_status')";
    mysqli_query($connection, $notification_query);
    
    echo '<script>alert("Status updated successfully!");</script>';
}

$loc = isset($_SESSION['location']) ? $_SESSION['location'] : '';
$id = isset($_SESSION['Aid']) ? $_SESSION['Aid'] : '';

// Get all donations with tracking info
$sql = "SELECT fd.*, dp.name as delivery_person_name, dp.city as delivery_city 
        FROM food_donations fd 
        LEFT JOIN delivery_persons dp ON fd.delivery_by = dp.Did 
        WHERE fd.location = '$loc' 
        ORDER BY fd.date DESC";
$result = mysqli_query($connection, $sql);

// Get delivery persons
$delivery_query = "SELECT * FROM delivery_persons WHERE city = '$loc'";
$delivery_result = mysqli_query($connection, $delivery_query);
?>

<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta http-equiv="X-UA-Compatible" content="IE=edge">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css">
    <link rel="stylesheet" href="admin.css">
    <title>Feed Hope - Admin Dashboard</title>
    <style>
        .tracking-container {
            max-width: 1200px;
            margin: 0 auto;
            padding: 2rem;
        }
        
        .tracking-header {
            text-align: center;
            margin-bottom: 3rem;
        }
        
        .tracking-title {
            font-size: 2.5rem;
            font-weight: 700;
            background: linear-gradient(135deg, var(--green), var(--green-dark));
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            background-clip: text;
            margin-bottom: 1rem;
        }
        
        .donations-grid {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(400px, 1fr));
            gap: 2rem;
            margin-bottom: 3rem;
        }
        
        .donation-card {
            background: white;
            border-radius: var(--border-radius-lg);
            box-shadow: var(--box-shadow-lg);
            overflow: hidden;
            transition: var(--transition);
        }
        
        .donation-card:hover {
            transform: translateY(-4px);
            box-shadow: 0 20px 40px -12px rgba(0,0,0,0.15);
        }
        
        .donation-image {
            width: 100%;
            height: 200px;
            object-fit: cover;
            background: linear-gradient(135deg, #f0f0f0, #e0e0e0);
        }
        
        .donation-image-placeholder {
            width: 100%;
            height: 200px;
            background: linear-gradient(135deg, var(--green-light), var(--green));
            display: flex;
            align-items: center;
            justify-content: center;
            color: white;
            font-size: 2rem;
        }
        
        .donation-content {
            padding: 1.5rem;
        }
        
        .donation-title {
            font-size: 1.2rem;
            font-weight: 600;
            color: var(--text-primary);
            margin-bottom: 0.5rem;
        }
        
        .donation-meta {
            display: flex;
            gap: 1rem;
            margin-bottom: 1rem;
            flex-wrap: wrap;
        }
        
        .meta-item {
            display: flex;
            align-items: center;
            gap: 0.5rem;
            font-size: 0.9rem;
            color: var(--text-secondary);
        }
        
        .meta-item i {
            color: var(--green);
        }
        
        .status-section {
            background: var(--bg-accent);
            padding: 1rem;
            border-radius: var(--border-radius);
            margin-bottom: 1rem;
        }
        
        .status-badge {
            display: inline-block;
            padding: 0.5rem 1rem;
            border-radius: 20px;
            font-size: 0.8rem;
            font-weight: 600;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            margin-bottom: 1rem;
        }
        
        .status-pending {
            background: #fef3c7;
            color: #92400e;
        }
        
        .status-assigned {
            background: #dbeafe;
            color: #1e40af;
        }
        
        .status-picked_up {
            background: #f3e8ff;
            color: #7c3aed;
        }
        
        .status-delivered {
            background: #d1fae5;
            color: #065f46;
        }
        
        .tracking-id {
            font-family: 'Courier New', monospace;
            font-weight: 600;
            color: var(--green-dark);
            margin-bottom: 0.5rem;
        }
        
        .delivery-person {
            display: flex;
            align-items: center;
            gap: 0.5rem;
            margin-bottom: 1rem;
            color: var(--text-secondary);
        }
        
        .delivery-person i {
            color: var(--green);
        }
        
        .status-form {
            display: flex;
            gap: 1rem;
            align-items: end;
            flex-wrap: wrap;
        }
        
        .form-group {
            flex: 1;
            min-width: 150px;
        }
        
        .form-group label {
            display: block;
            margin-bottom: 0.5rem;
            font-weight: 500;
            color: var(--text-primary);
        }
        
        .form-group select {
            width: 100%;
            padding: 0.75rem;
            border: 2px solid #e5e7eb;
            border-radius: var(--border-radius);
            font-size: 0.9rem;
            transition: var(--transition);
        }
        
        .form-group select:focus {
            outline: none;
            border-color: var(--green);
            box-shadow: 0 0 0 3px rgba(6, 193, 103, 0.1);
        }
        
        .update-btn {
            background: linear-gradient(135deg, var(--green), var(--green-dark));
            color: white;
            border: none;
            padding: 0.75rem 1.5rem;
            border-radius: var(--border-radius);
            font-weight: 600;
            cursor: pointer;
            transition: var(--transition);
            white-space: nowrap;
        }
        
        .update-btn:hover {
            transform: translateY(-2px);
            box-shadow: var(--box-shadow-lg);
        }
        
        .no-donations {
            text-align: center;
            padding: 4rem 2rem;
            color: var(--text-secondary);
        }
        
        .no-donations i {
            font-size: 4rem;
            color: var(--green-light);
            margin-bottom: 1rem;
        }
        
        @media (max-width: 768px) {
            .tracking-container {
                padding: 1rem;
            }
            
            .donations-grid {
                grid-template-columns: 1fr;
                gap: 1.5rem;
            }
            
            .tracking-title {
                font-size: 2rem;
            }
            
            .status-form {
                flex-direction: column;
            }
            
            .form-group {
                min-width: 100%;
            }
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
                <li><a href="admin.php">
                    <i class="uil uil-estate"></i>
                    <span class="link-name">Dashboard</span>
                </a></li>
                <li><a href="analytics.php">
                    <i class="uil uil-chart"></i>
                    <span class="link-name">Analytics</span>
                </a></li>
                <li><a href="donate.php">
                    <i class="uil uil-heart"></i>
                    <span class="link-name">Donates</span>
                </a></li>
                <li><a href="tracking.php" class="active">
                    <i class="uil uil-truck"></i>
                    <span class="link-name">Tracking</span>
                </a></li>
                <li><a href="feedback.php">
                    <i class="uil uil-comments"></i>
                    <span class="link-name">Feedbacks</span>
                </a></li>
                <li><a href="adminprofile.php">
                    <i class="uil uil-user"></i>
                    <span class="link-name">Profile</span>
                </a></li>
            </ul>
            
            <ul class="logout-mode">
                <li><a href="../logout.php">
                    <i class="uil uil-signout"></i>
                    <span class="link-name">Logout</span>
                </a></li>
            </ul>
        </div>
    </nav>

    <section class="dashboard">
        <div class="top">
            <i class="uil uil-bars sidebar-toggle"></i>
            <p class="logo">Feed <b style="color: #06C167; ">Hope</b></p>
            <p class="user"></p>
        </div>

        <div class="tracking-container">
            <div class="tracking-header">
                <h1 class="tracking-title">Food Donation Tracking</h1>
                <p style="color: var(--text-secondary); font-size: 1.1rem;">Manage and track all food donations in your area</p>
            </div>

            <?php if(mysqli_num_rows($result) > 0): ?>
                <div class="donations-grid">
                    <?php while($row = mysqli_fetch_assoc($result)): ?>
                        <div class="donation-card">
                            <?php if($row['food_image']): ?>
                                <img src="../uploads/food_images/<?php echo $row['food_image']; ?>" 
                                     alt="<?php echo htmlspecialchars($row['food']); ?>" 
                                     class="donation-image">
                            <?php else: ?>
                                <div class="donation-image-placeholder">
                                    <i class="fas fa-utensils"></i>
                                </div>
                            <?php endif; ?>
                            
                            <div class="donation-content">
                                <h3 class="donation-title"><?php echo htmlspecialchars($row['food']); ?></h3>
                                
                                <div class="donation-meta">
                                    <div class="meta-item">
                                        <i class="fas fa-user"></i>
                                        <span><?php echo htmlspecialchars($row['name']); ?></span>
                                    </div>
                                    <div class="meta-item">
                                        <i class="fas fa-calendar"></i>
                                        <span><?php echo date('M j, Y', strtotime($row['date'])); ?></span>
                                    </div>
                                    <div class="meta-item">
                                        <i class="fas fa-weight"></i>
                                        <span><?php echo htmlspecialchars($row['quantity']); ?></span>
                                    </div>
                                </div>
                                
                                <div class="status-section">
                                    <div class="status-badge status-<?php echo $row['status']; ?>">
                                        <?php echo ucfirst(str_replace('_', ' ', $row['status'])); ?>
                                    </div>
                                    
                                    <?php if($row['tracking_id']): ?>
                                        <div class="tracking-id">Tracking ID: <?php echo $row['tracking_id']; ?></div>
                                    <?php endif; ?>
                                    
                                    <?php if($row['delivery_person_name']): ?>
                                        <div class="delivery-person">
                                            <i class="fas fa-motorcycle"></i>
                                            <span>Assigned to: <?php echo htmlspecialchars($row['delivery_person_name']); ?></span>
                                        </div>
                                    <?php endif; ?>
                                    
                                    <form method="post" class="status-form">
                                        <input type="hidden" name="donation_id" value="<?php echo $row['Fid']; ?>">
                                        
                                        <div class="form-group">
                                            <label for="status_<?php echo $row['Fid']; ?>">Status</label>
                                            <select name="status" id="status_<?php echo $row['Fid']; ?>" required>
                                                <option value="pending" <?php echo $row['status'] == 'pending' ? 'selected' : ''; ?>>Pending</option>
                                                <option value="assigned" <?php echo $row['status'] == 'assigned' ? 'selected' : ''; ?>>Assigned</option>
                                                <option value="picked_up" <?php echo $row['status'] == 'picked_up' ? 'selected' : ''; ?>>Picked Up</option>
                                                <option value="delivered" <?php echo $row['status'] == 'delivered' ? 'selected' : ''; ?>>Delivered</option>
                                            </select>
                                        </div>
                                        
                                        <div class="form-group">
                                            <label for="delivery_person_<?php echo $row['Fid']; ?>">Delivery Person</label>
                                            <select name="delivery_person_id" id="delivery_person_<?php echo $row['Fid']; ?>" required>
                                                <option value="">Select Delivery Person</option>
                                                <?php 
                                                mysqli_data_seek($delivery_result, 0);
                                                while($delivery = mysqli_fetch_assoc($delivery_result)): 
                                                ?>
                                                    <option value="<?php echo $delivery['Did']; ?>" 
                                                            <?php echo $row['delivery_by'] == $delivery['Did'] ? 'selected' : ''; ?>>
                                                        <?php echo htmlspecialchars($delivery['name']); ?>
                                                    </option>
                                                <?php endwhile; ?>
                                            </select>
                                        </div>
                                        
                                        <button type="submit" name="update_status" class="update-btn">
                                            <i class="fas fa-sync"></i> Update
                                        </button>
                                    </form>
                                </div>
                            </div>
                        </div>
                    <?php endwhile; ?>
                </div>
            <?php else: ?>
                <div class="no-donations">
                    <i class="fas fa-utensils"></i>
                    <h3>No donations in your area</h3>
                    <p>Food donations will appear here when users post them in your location.</p>
                </div>
            <?php endif; ?>
        </div>
    </section>

    <script src="admin.js"></script>
</body>
</html>








