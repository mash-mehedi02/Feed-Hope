<?php
ob_start(); 
include("connect.php"); 
if($_SESSION['name']==''){
	header("location:signin.php");
}

$connection=mysqli_connect("localhost","root","");
$db=mysqli_select_db($connection,'demo');

// Handle food approval/rejection - simplified for basic setup
if(isset($_POST['action']) && isset($_POST['donation_id'])) {
    $donation_id = $_POST['donation_id'];
    $action = $_POST['action'];
    $admin_id = isset($_SESSION['Aid']) ? $_SESSION['Aid'] : '';
    $admin_name = isset($_SESSION['name']) ? $_SESSION['name'] : 'Admin';
    $notes = isset($_POST['notes']) ? mysqli_real_escape_string($connection, $_POST['notes']) : '';
    
    if($action == 'approve') {
        // Simple approval - no status column needed
        $update_query = "UPDATE food_donations SET assigned_to = NULL WHERE Fid = '$donation_id'";
        
        if(mysqli_query($connection, $update_query)) {
            echo '<script>alert("Food donation approved successfully!");</script>';
            echo '<script>window.location.href = "admin.php";</script>';
        }
    } elseif($action == 'reject') {
        // Simple rejection - delete the donation
        $delete_query = "DELETE FROM food_donations WHERE Fid = '$donation_id'";
        
        if(mysqli_query($connection, $delete_query)) {
            echo '<script>alert("Food donation rejected and removed.");</script>';
            echo '<script>window.location.href = "admin.php";</script>';
        }
    }
}

$loc = isset($_SESSION['location']) ? $_SESSION['location'] : '';
$id = isset($_SESSION['Aid']) ? $_SESSION['Aid'] : '';

// Get pending food donations for approval
// Show all unassigned donations in the admin's location
$sql = "SELECT * FROM food_donations WHERE (assigned_to IS NULL OR assigned_to = '') AND location = '$loc' ORDER BY date DESC";
$result = mysqli_query($connection, $sql);

// Check if food_history table exists before querying
$history_result = null;
$history_table_exists = false;
$check_history_query = "SHOW TABLES LIKE 'food_history'";
$history_check = mysqli_query($connection, $check_history_query);

if (mysqli_num_rows($history_check) > 0) {
    $history_table_exists = true;
    // Get food history for this admin
    $history_sql = "SELECT fh.*, fd.food, fd.name as donor_name 
                   FROM food_history fh 
                   JOIN food_donations fd ON fh.donation_id = fd.Fid 
                   WHERE fd.location = '$loc' 
                   ORDER BY fh.created_at DESC 
                   LIMIT 20";
    $history_result = mysqli_query($connection, $history_sql);
}
?>

<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta http-equiv="X-UA-Compatible" content="IE=edge">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css">
    <link rel="stylesheet" href="admin.css">
    <title>Feed Hope - Food Approval</title>
    <style>
        .approval-container {
            max-width: 1200px;
            margin: 0 auto;
            padding: 2rem;
        }
        
        .approval-header {
            text-align: center;
            margin-bottom: 3rem;
        }
        
        .approval-title {
            font-size: 2.5rem;
            font-weight: 700;
            background: linear-gradient(135deg, var(--green), var(--green-dark));
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            background-clip: text;
            margin-bottom: 1rem;
        }
        
        .pending-foods {
            margin-bottom: 3rem;
        }
        
        .section-title {
            font-size: 1.5rem;
            font-weight: 600;
            color: var(--text-primary);
            margin-bottom: 1.5rem;
            padding-bottom: 0.5rem;
            border-bottom: 2px solid var(--green);
        }
        
        .foods-grid {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(400px, 1fr));
            gap: 2rem;
        }
        
        .food-card {
            background: white;
            border-radius: var(--border-radius-lg);
            box-shadow: var(--box-shadow-lg);
            overflow: hidden;
            transition: var(--transition);
        }
        
        .food-card:hover {
            transform: translateY(-4px);
            box-shadow: 0 20px 40px -12px rgba(0,0,0,0.15);
        }
        
        .food-image {
            width: 100%;
            height: 200px;
            object-fit: cover;
            background: linear-gradient(135deg, #f0f0f0, #e0e0e0);
        }
        
        .food-image-placeholder {
            width: 100%;
            height: 200px;
            background: linear-gradient(135deg, var(--green-light), var(--green));
            display: flex;
            align-items: center;
            justify-content: center;
            color: white;
            font-size: 2rem;
        }
        
        .food-content {
            padding: 1.5rem;
        }
        
        .food-title {
            font-size: 1.2rem;
            font-weight: 600;
            color: var(--text-primary);
            margin-bottom: 0.5rem;
        }
        
        .food-meta {
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
        
        .approval-form {
            background: var(--bg-accent);
            padding: 1rem;
            border-radius: var(--border-radius);
            margin-top: 1rem;
        }
        
        .form-group {
            margin-bottom: 1rem;
        }
        
        .form-group label {
            display: block;
            margin-bottom: 0.5rem;
            font-weight: 500;
            color: var(--text-primary);
        }
        
        .form-group textarea {
            width: 100%;
            padding: 0.75rem;
            border: 2px solid #e5e7eb;
            border-radius: var(--border-radius);
            font-size: 0.9rem;
            resize: vertical;
            min-height: 80px;
        }
        
        .form-group textarea:focus {
            outline: none;
            border-color: var(--green);
            box-shadow: 0 0 0 3px rgba(6, 193, 103, 0.1);
        }
        
        .action-buttons {
            display: flex;
            gap: 1rem;
            margin-top: 1rem;
        }
        
        .btn {
            padding: 0.75rem 1.5rem;
            border: none;
            border-radius: var(--border-radius);
            font-weight: 600;
            cursor: pointer;
            transition: var(--transition);
            flex: 1;
        }
        
        .btn-approve {
            background: linear-gradient(135deg, var(--green), var(--green-dark));
            color: white;
        }
        
        .btn-approve:hover {
            transform: translateY(-2px);
            box-shadow: var(--box-shadow-lg);
        }
        
        .btn-reject {
            background: linear-gradient(135deg, #ef4444, #dc2626);
            color: white;
        }
        
        .btn-reject:hover {
            transform: translateY(-2px);
            box-shadow: var(--box-shadow-lg);
        }
        
        .history-section {
            background: white;
            border-radius: var(--border-radius-lg);
            box-shadow: var(--box-shadow-lg);
            padding: 1.5rem;
        }
        
        .history-item {
            padding: 1rem;
            border-bottom: 1px solid #e5e7eb;
            display: flex;
            justify-content: space-between;
            align-items: center;
        }
        
        .history-item:last-child {
            border-bottom: none;
        }
        
        .history-info {
            flex: 1;
        }
        
        .history-food {
            font-weight: 600;
            color: var(--text-primary);
        }
        
        .history-status {
            font-size: 0.9rem;
            color: var(--text-secondary);
        }
        
        .history-time {
            font-size: 0.8rem;
            color: var(--text-secondary);
        }
        
        .no-pending {
            text-align: center;
            padding: 4rem 2rem;
            color: var(--text-secondary);
        }
        
        .no-pending i {
            font-size: 4rem;
            color: var(--green-light);
            margin-bottom: 1rem;
        }
        
        @media (max-width: 768px) {
            .approval-container {
                padding: 1rem;
            }
            
            .foods-grid {
                grid-template-columns: 1fr;
                gap: 1.5rem;
            }
            
            .approval-title {
                font-size: 2rem;
            }
            
            .action-buttons {
                flex-direction: column;
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
                <li><a href="food_approval.php" class="active">
                    <i class="uil uil-check-circle"></i>
                    <span class="link-name">Food Approval</span>
                </a></li>
                <li><a href="tracking.php">
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

        <div class="approval-container">
            <div class="approval-header">
                <h1 class="approval-title">Food Donation Approval</h1>
                <p style="color: var(--text-secondary); font-size: 1.1rem;">Review and approve pending food donations</p>
            </div>

            <div class="pending-foods">
                <h2 class="section-title">Pending Food Donations</h2>
                
                <?php if(mysqli_num_rows($result) > 0): ?>
                    <div class="foods-grid">
                        <?php while($row = mysqli_fetch_assoc($result)): ?>
                            <div class="food-card">
                                <?php if(isset($row['food_image']) && $row['food_image']): ?>
                                    <img src="../uploads/food_images/<?php echo $row['food_image']; ?>" 
                                         alt="<?php echo htmlspecialchars($row['food']); ?>" 
                                         class="food-image">
                                <?php else: ?>
                                    <div class="food-image-placeholder">
                                        <i class="fas fa-utensils"></i>
                                    </div>
                                <?php endif; ?>
                                
                                <div class="food-content">
                                    <h3 class="food-title"><?php echo htmlspecialchars($row['food']); ?></h3>
                                    
                                    <div class="food-meta">
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
                                        <div class="meta-item">
                                            <i class="fas fa-tag"></i>
                                            <span><?php echo htmlspecialchars($row['type']); ?></span>
                                        </div>
                                    </div>
                                    
                                    <div class="status-badge status-pending">Pending Approval</div>
                                    
                                    <div class="approval-form">
                                        <form method="post">
                                            <input type="hidden" name="donation_id" value="<?php echo $row['Fid']; ?>">
                                            
                                            <div class="form-group">
                                                <label for="notes_<?php echo $row['Fid']; ?>">Notes (Optional)</label>
                                                <textarea name="notes" id="notes_<?php echo $row['Fid']; ?>" 
                                                          placeholder="Add any notes about this food donation..."></textarea>
                                            </div>
                                            
                                            <div class="action-buttons">
                                                <button type="submit" name="action" value="approve" class="btn btn-approve">
                                                    <i class="fas fa-check"></i> Approve
                                                </button>
                                                <button type="submit" name="action" value="reject" class="btn btn-reject">
                                                    <i class="fas fa-times"></i> Reject
                                                </button>
                                            </div>
                                        </form>
                                    </div>
                                </div>
                            </div>
                        <?php endwhile; ?>
                    </div>
                <?php else: ?>
                    <div class="no-pending">
                        <i class="fas fa-check-circle"></i>
                        <h3>No pending food donations</h3>
                        <p>All food donations have been reviewed.</p>
                    </div>
                <?php endif; ?>
            </div>

            <div class="history-section">
                <h2 class="section-title">Recent Activity</h2>
                
                <?php if($history_result !== null && $history_table_exists && mysqli_num_rows($history_result) > 0): ?>
                    <?php while($history = mysqli_fetch_assoc($history_result)): ?>
                        <div class="history-item">
                            <div class="history-info">
                                <div class="history-food"><?php echo htmlspecialchars($history['food']); ?></div>
                                <div class="history-status">
                                    <?php echo ucfirst($history['status_from']); ?> → <?php echo ucfirst($history['status_to']); ?>
                                    <?php if(isset($history['notes']) && $history['notes']): ?>
                                        - <?php echo htmlspecialchars($history['notes']); ?>
                                    <?php endif; ?>
                                </div>
                                <div class="history-time">
                                    <?php echo date('M j, Y g:i A', strtotime($history['created_at'])); ?>
                                </div>
                            </div>
                        </div>
                    <?php endwhile; ?>
                <?php else: ?>
                    <div class="no-pending">
                        <i class="fas fa-history"></i>
                        <h3><?php echo $history_table_exists ? 'No activity yet' : 'History feature not enabled'; ?></h3>
                        <p><?php echo $history_table_exists ? 'Activity history will appear here.' : 'Enable the food history workflow to track donation activities.'; ?></p>
                    </div>
                <?php endif; ?>
            </div>
        </div>
    </section>

    <script src="admin.js"></script>
</body>
</html>






