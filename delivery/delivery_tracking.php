<?php
ob_start(); 
include '../connection.php';
include("connect.php"); 

if($_SESSION['name']==''){
	header("location:deliverylogin.php");
}

$name = isset($_SESSION['name']) ? $_SESSION['name'] : '';
$city = isset($_SESSION['city']) ? $_SESSION['city'] : '';
$id = isset($_SESSION['Did']) ? $_SESSION['Did'] : '';

$connection=mysqli_connect("localhost","root","");
$db=mysqli_select_db($connection,'demo');

// Handle status updates
if(isset($_POST['update_delivery_status'])) {
    $donation_id = $_POST['donation_id'];
    $new_status = $_POST['delivery_status'];
    $notes = $_POST['notes'] ?? '';
    
    // Update food donation status
    $update_query = "UPDATE food_donations SET status = '$new_status', delivery_status = '$notes' WHERE Fid = '$donation_id'";
    mysqli_query($connection, $update_query);
    
    // Add tracking record
    $tracking_query = "INSERT INTO delivery_tracking (donation_id, delivery_person_id, status, notes) VALUES ('$donation_id', '$id', '$new_status', '$notes')";
    mysqli_query($connection, $tracking_query);
    
    // Send notification to user
    $donation_query = "SELECT email FROM food_donations WHERE Fid = '$donation_id'";
    $donation_result = mysqli_query($connection, $donation_query);
    $donation_data = mysqli_fetch_assoc($donation_result);
    
    $notification_query = "INSERT INTO notifications (user_email, delivery_person_id, donation_id, type, message) VALUES ('{$donation_data['email']}', '$id', '$donation_id', '$new_status', 'Your food donation status updated to: $new_status')";
    mysqli_query($connection, $notification_query);
    
    echo '<script>alert("Status updated successfully!");</script>';
}

// Get assigned deliveries
$sql = "SELECT fd.*, dp.name as delivery_person_name 
        FROM food_donations fd 
        LEFT JOIN delivery_persons dp ON fd.delivery_by = dp.Did 
        WHERE fd.delivery_by = '$id' AND fd.status != 'delivered'
        ORDER BY fd.date DESC";
$result = mysqli_query($connection, $sql);
?>

<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta http-equiv="X-UA-Compatible" content="IE=edge">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Feed Hope - Delivery Tracking</title>
    <link rel="stylesheet" href="../home.css">
    <link rel="stylesheet" href="delivery.css">
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css">
    <style>
        .delivery-container {
            max-width: 1200px;
            margin: 0 auto;
            padding: 2rem;
            margin-top: 100px;
        }
        
        .delivery-header {
            text-align: center;
            margin-bottom: 3rem;
        }
        
        .delivery-title {
            font-size: 2.5rem;
            font-weight: 700;
            background: linear-gradient(135deg, var(--green), var(--green-dark));
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            background-clip: text;
            margin-bottom: 1rem;
        }
        
        .deliveries-grid {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(400px, 1fr));
            gap: 2rem;
            margin-bottom: 3rem;
        }
        
        .delivery-card {
            background: white;
            border-radius: var(--border-radius-lg);
            box-shadow: var(--box-shadow-lg);
            overflow: hidden;
            transition: var(--transition);
        }
        
        .delivery-card:hover {
            transform: translateY(-4px);
            box-shadow: 0 20px 40px -12px rgba(0,0,0,0.15);
        }
        
        .delivery-image {
            width: 100%;
            height: 200px;
            object-fit: cover;
            background: linear-gradient(135deg, #f0f0f0, #e0e0e0);
        }
        
        .delivery-image-placeholder {
            width: 100%;
            height: 200px;
            background: linear-gradient(135deg, var(--green-light), var(--green));
            display: flex;
            align-items: center;
            justify-content: center;
            color: white;
            font-size: 2rem;
        }
        
        .delivery-content {
            padding: 1.5rem;
        }
        
        .delivery-title-card {
            font-size: 1.2rem;
            font-weight: 600;
            color: var(--text-primary);
            margin-bottom: 0.5rem;
        }
        
        .delivery-meta {
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
        
        .delivery-address {
            background: #f8fafc;
            padding: 1rem;
            border-radius: var(--border-radius);
            margin-bottom: 1rem;
        }
        
        .address-title {
            font-weight: 600;
            color: var(--text-primary);
            margin-bottom: 0.5rem;
        }
        
        .address-text {
            color: var(--text-secondary);
            line-height: 1.5;
        }
        
        .status-form {
            display: flex;
            flex-direction: column;
            gap: 1rem;
        }
        
        .form-group {
            display: flex;
            flex-direction: column;
        }
        
        .form-group label {
            margin-bottom: 0.5rem;
            font-weight: 500;
            color: var(--text-primary);
        }
        
        .form-group select,
        .form-group textarea {
            padding: 0.75rem;
            border: 2px solid #e5e7eb;
            border-radius: var(--border-radius);
            font-size: 0.9rem;
            transition: var(--transition);
        }
        
        .form-group select:focus,
        .form-group textarea:focus {
            outline: none;
            border-color: var(--green);
            box-shadow: 0 0 0 3px rgba(6, 193, 103, 0.1);
        }
        
        .form-group textarea {
            resize: vertical;
            min-height: 80px;
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
        }
        
        .update-btn:hover {
            transform: translateY(-2px);
            box-shadow: var(--box-shadow-lg);
        }
        
        .no-deliveries {
            text-align: center;
            padding: 4rem 2rem;
            color: var(--text-secondary);
        }
        
        .no-deliveries i {
            font-size: 4rem;
            color: var(--green-light);
            margin-bottom: 1rem;
        }
        
        @media (max-width: 768px) {
            .delivery-container {
                padding: 1rem;
                margin-top: 80px;
            }
            
            .deliveries-grid {
                grid-template-columns: 1fr;
                gap: 1.5rem;
            }
            
            .delivery-title {
                font-size: 2rem;
            }
        }
    </style>
</head>
<body>
    <header>
        <div class="logo">Feed <b style="color: #06C167;">Hope</b></div>
        <div class="hamburger">
            <div class="line"></div>
            <div class="line"></div>
            <div class="line"></div>
        </div>
        <nav class="nav-bar">
            <ul>
                <li><a href="delivery.php">Home</a></li>
                <li><a href="openmap.php">Map</a></li>
                <li><a href="deliverymyord.php">My Orders</a></li>
                <li><a href="delivery_tracking.php" class="active">Tracking</a></li>
            </ul>
        </nav>
    </header>
    
    <script>
        hamburger=document.querySelector(".hamburger");
        hamburger.onclick =function(){
            navBar=document.querySelector(".nav-bar");
            navBar.classList.toggle("active");
        }
    </script>

    <div class="delivery-container">
        <div class="delivery-header">
            <h1 class="delivery-title">My Delivery Assignments</h1>
            <p style="color: var(--text-secondary); font-size: 1.1rem;">Track and update your delivery status</p>
        </div>

        <?php if(mysqli_num_rows($result) > 0): ?>
            <div class="deliveries-grid">
                <?php while($row = mysqli_fetch_assoc($result)): ?>
                    <div class="delivery-card">
                        <?php if($row['food_image']): ?>
                            <img src="../uploads/food_images/<?php echo $row['food_image']; ?>" 
                                 alt="<?php echo htmlspecialchars($row['food']); ?>" 
                                 class="delivery-image">
                        <?php else: ?>
                            <div class="delivery-image-placeholder">
                                <i class="fas fa-utensils"></i>
                            </div>
                        <?php endif; ?>
                        
                        <div class="delivery-content">
                            <h3 class="delivery-title-card"><?php echo htmlspecialchars($row['food']); ?></h3>
                            
                            <div class="delivery-meta">
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
                            
                            <div class="delivery-address">
                                <div class="address-title">Pickup Address:</div>
                                <div class="address-text"><?php echo htmlspecialchars($row['address']); ?></div>
                            </div>
                            
                            <div class="status-section">
                                <div class="status-badge status-<?php echo $row['status']; ?>">
                                    <?php echo ucfirst(str_replace('_', ' ', $row['status'])); ?>
                                </div>
                                
                                <?php if($row['tracking_id']): ?>
                                    <div class="tracking-id">Tracking ID: <?php echo $row['tracking_id']; ?></div>
                                <?php endif; ?>
                                
                                <form method="post" class="status-form">
                                    <input type="hidden" name="donation_id" value="<?php echo $row['Fid']; ?>">
                                    
                                    <div class="form-group">
                                        <label for="delivery_status_<?php echo $row['Fid']; ?>">Update Status</label>
                                        <select name="delivery_status" id="delivery_status_<?php echo $row['Fid']; ?>" required>
                                            <option value="assigned" <?php echo $row['status'] == 'assigned' ? 'selected' : ''; ?>>Assigned</option>
                                            <option value="picked_up" <?php echo $row['status'] == 'picked_up' ? 'selected' : ''; ?>>Picked Up</option>
                                            <option value="delivered" <?php echo $row['status'] == 'delivered' ? 'selected' : ''; ?>>Delivered</option>
                                        </select>
                                    </div>
                                    
                                    <div class="form-group">
                                        <label for="notes_<?php echo $row['Fid']; ?>">Notes (Optional)</label>
                                        <textarea name="notes" id="notes_<?php echo $row['Fid']; ?>" 
                                                  placeholder="Add any notes about the delivery..."><?php echo htmlspecialchars($row['delivery_status']); ?></textarea>
                                    </div>
                                    
                                    <button type="submit" name="update_delivery_status" class="update-btn">
                                        <i class="fas fa-sync"></i> Update Status
                                    </button>
                                </form>
                            </div>
                        </div>
                    </div>
                <?php endwhile; ?>
            </div>
        <?php else: ?>
            <div class="no-deliveries">
                <i class="fas fa-motorcycle"></i>
                <h3>No active deliveries</h3>
                <p>You don't have any active delivery assignments at the moment.</p>
                <a href="delivery.php" style="display: inline-block; margin-top: 1rem; padding: 0.75rem 1.5rem; background: linear-gradient(135deg, var(--green), var(--green-dark)); color: white; text-decoration: none; border-radius: var(--border-radius);">
                    <i class="fas fa-arrow-left"></i> Back to Available Orders
                </a>
            </div>
        <?php endif; ?>
    </div>
</body>
</html>

