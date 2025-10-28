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

// Handle booking acceptance/rejection
if(isset($_POST['booking_action']) && isset($_POST['booking_id'])) {
    $booking_id = $_POST['booking_id'];
    $action = $_POST['booking_action'];
    $notes = $_POST['booking_notes'] ?? '';
    
    if($action == 'accept') {
        // Update booking status to accepted
        $update_query = "UPDATE delivery_bookings SET 
                        booking_status = 'accepted',
                        accepted_at = NOW(),
                        booking_notes = '$notes'
                        WHERE booking_id = '$booking_id' AND delivery_person_id = '$id'";
        
        if(mysqli_query($connection, $update_query)) {
            // Update food donation status to running
            $booking_query = "SELECT donation_id FROM delivery_bookings WHERE booking_id = '$booking_id'";
            $booking_result = mysqli_query($connection, $booking_query);
            $booking_data = mysqli_fetch_assoc($booking_result);
            
            $food_update = "UPDATE food_donations SET 
                           status = 'running',
                           delivery_by = '$id',
                           delivery_accepted_at = NOW()
                           WHERE Fid = '{$booking_data['donation_id']}'";
            mysqli_query($connection, $food_update);
            
            // Add to history
            $history_query = "INSERT INTO food_history 
                             (donation_id, status_from, status_to, changed_by_type, changed_by_id, changed_by_name, notes) 
                             VALUES ('{$booking_data['donation_id']}', 'booking', 'running', 'delivery_person', '$id', '$name', '$notes')";
            mysqli_query($connection, $history_query);
            
            // Send notification to user and admin
            $donation_query = "SELECT email, name FROM food_donations WHERE Fid = '{$booking_data['donation_id']}'";
            $donation_result = mysqli_query($connection, $donation_query);
            $donation_data = mysqli_fetch_assoc($donation_result);
            
            $notification_query = "INSERT INTO notifications 
                                 (user_email, donation_id, type, message, status_from, status_to, action_by_type) 
                                 VALUES ('{$donation_data['email']}', '{$booking_data['donation_id']}', 'status_update', 
                                        'Your food donation \"{$donation_data['name']}\" is now being delivered by $name!', 
                                        'booking', 'running', 'delivery_person')";
            mysqli_query($connection, $notification_query);
            
            echo '<script>alert("Booking accepted! You are now delivering this food.");</script>';
        }
    } elseif($action == 'reject') {
        // Update booking status to rejected
        $update_query = "UPDATE delivery_bookings SET 
                        booking_status = 'rejected',
                        booking_notes = '$notes'
                        WHERE booking_id = '$booking_id' AND delivery_person_id = '$id'";
        
        if(mysqli_query($connection, $update_query)) {
            // Update food donation status back to available
            $booking_query = "SELECT donation_id FROM delivery_bookings WHERE booking_id = '$booking_id'";
            $booking_result = mysqli_query($connection, $booking_query);
            $booking_data = mysqli_fetch_assoc($booking_result);
            
            $food_update = "UPDATE food_donations SET 
                           status = 'available',
                           delivery_by = NULL
                           WHERE Fid = '{$booking_data['donation_id']}'";
            mysqli_query($connection, $food_update);
            
            // Add to history
            $history_query = "INSERT INTO food_history 
                             (donation_id, status_from, status_to, changed_by_type, changed_by_id, changed_by_name, notes) 
                             VALUES ('{$booking_data['donation_id']}', 'booking', 'available', 'delivery_person', '$id', '$name', 'Rejected: $notes')";
            mysqli_query($connection, $history_query);
            
            echo '<script>alert("Booking rejected. Food is available for other delivery persons.");</script>';
        }
    }
}

// Handle delivery completion
if(isset($_POST['complete_delivery']) && isset($_POST['donation_id'])) {
    $donation_id = $_POST['donation_id'];
    $completion_notes = $_POST['completion_notes'] ?? '';
    
    // Update food donation status to delivered
    $update_query = "UPDATE food_donations SET 
                    status = 'delivered',
                    delivery_completed_at = NOW(),
                    delivery_status = '$completion_notes'
                    WHERE Fid = '$donation_id' AND delivery_by = '$id'";
    
    if(mysqli_query($connection, $update_query)) {
        // Update booking status to completed
        $booking_update = "UPDATE delivery_bookings SET 
                          booking_status = 'completed',
                          completed_at = NOW()
                          WHERE donation_id = '$donation_id' AND delivery_person_id = '$id'";
        mysqli_query($connection, $booking_update);
        
        // Add to history
        $history_query = "INSERT INTO food_history 
                         (donation_id, status_from, status_to, changed_by_type, changed_by_id, changed_by_name, notes) 
                         VALUES ('$donation_id', 'running', 'delivered', 'delivery_person', '$id', '$name', '$completion_notes')";
        mysqli_query($connection, $history_query);
        
        // Send notification to user and admin
        $donation_query = "SELECT email, name FROM food_donations WHERE Fid = '$donation_id'";
        $donation_result = mysqli_query($connection, $donation_query);
        $donation_data = mysqli_fetch_assoc($donation_result);
        
        $notification_query = "INSERT INTO notifications 
                             (user_email, donation_id, type, message, status_from, status_to, action_by_type) 
                             VALUES ('{$donation_data['email']}', '$donation_id', 'status_update', 
                                    'Your food donation \"{$donation_data['name']}\" has been successfully delivered!', 
                                    'running', 'delivered', 'delivery_person')";
        mysqli_query($connection, $notification_query);
        
        echo '<script>alert("Delivery completed successfully!");</script>';
    }
}

// Get available food bookings for this delivery person
$available_sql = "SELECT fd.*, db.booking_id, db.booking_status, db.created_at as booking_created
                FROM food_donations fd 
                LEFT JOIN delivery_bookings db ON fd.Fid = db.donation_id AND db.delivery_person_id = '$id'
                WHERE fd.status = 'available' AND fd.location = '$city'
                ORDER BY fd.date DESC";
$available_result = mysqli_query($connection, $available_sql);

// Get pending bookings for this delivery person
$pending_sql = "SELECT fd.*, db.booking_id, db.booking_status, db.created_at as booking_created
               FROM food_donations fd 
               JOIN delivery_bookings db ON fd.Fid = db.donation_id
               WHERE db.delivery_person_id = '$id' AND db.booking_status = 'pending'
               ORDER BY db.created_at DESC";
$pending_result = mysqli_query($connection, $pending_sql);

// Get running deliveries for this delivery person
$running_sql = "SELECT fd.*, db.booking_id, db.booking_status, db.accepted_at
                FROM food_donations fd 
                JOIN delivery_bookings db ON fd.Fid = db.donation_id
                WHERE db.delivery_person_id = '$id' AND db.booking_status = 'accepted'
                ORDER BY db.accepted_at DESC";
$running_result = mysqli_query($connection, $running_sql);

// Get delivery history for this delivery person
$history_sql = "SELECT fh.*, fd.food, fd.name as donor_name 
                FROM food_history fh 
                JOIN food_donations fd ON fh.donation_id = fd.Fid 
                WHERE fh.changed_by_id = '$id' AND fh.changed_by_type = 'delivery_person'
                ORDER BY fh.created_at DESC 
                LIMIT 20";
$history_result = mysqli_query($connection, $history_sql);
?>

<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta http-equiv="X-UA-Compatible" content="IE=edge">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Feed Hope - Delivery Booking</title>
    <link rel="stylesheet" href="../home.css">
    <link rel="stylesheet" href="delivery.css">
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css">
    <style>
        .booking-container {
            max-width: 1200px;
            margin: 0 auto;
            padding: 2rem;
            margin-top: 100px;
        }
        
        .booking-header {
            text-align: center;
            margin-bottom: 3rem;
        }
        
        .booking-title {
            font-size: 2.5rem;
            font-weight: 700;
            background: linear-gradient(135deg, var(--green), var(--green-dark));
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            background-clip: text;
            margin-bottom: 1rem;
        }
        
        .section {
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
        
        .status-available {
            background: #dbeafe;
            color: #1e40af;
        }
        
        .status-pending {
            background: #fef3c7;
            color: #92400e;
        }
        
        .status-running {
            background: #f3e8ff;
            color: #7c3aed;
        }
        
        .action-form {
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
        
        .btn-book {
            background: linear-gradient(135deg, var(--green), var(--green-dark));
            color: white;
        }
        
        .btn-book:hover {
            transform: translateY(-2px);
            box-shadow: var(--box-shadow-lg);
        }
        
        .btn-accept {
            background: linear-gradient(135deg, var(--green), var(--green-dark));
            color: white;
        }
        
        .btn-accept:hover {
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
        
        .btn-complete {
            background: linear-gradient(135deg, #10b981, #059669);
            color: white;
        }
        
        .btn-complete:hover {
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
        
        .no-items {
            text-align: center;
            padding: 4rem 2rem;
            color: var(--text-secondary);
        }
        
        .no-items i {
            font-size: 4rem;
            color: var(--green-light);
            margin-bottom: 1rem;
        }
        
        @media (max-width: 768px) {
            .booking-container {
                padding: 1rem;
                margin-top: 80px;
            }
            
            .foods-grid {
                grid-template-columns: 1fr;
                gap: 1.5rem;
            }
            
            .booking-title {
                font-size: 2rem;
            }
            
            .action-buttons {
                flex-direction: column;
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
                <li><a href="delivery_booking.php" class="active">Bookings</a></li>
                <li><a href="delivery_tracking.php">Tracking</a></li>
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

    <div class="booking-container">
        <div class="booking-header">
            <h1 class="booking-title">Food Delivery Bookings</h1>
            <p style="color: var(--text-secondary); font-size: 1.1rem;">Manage your food delivery bookings and assignments</p>
        </div>

        <!-- Available Food for Booking -->
        <div class="section">
            <h2 class="section-title">Available Food for Booking</h2>
            
            <?php if(mysqli_num_rows($available_result) > 0): ?>
                <div class="foods-grid">
                    <?php while($row = mysqli_fetch_assoc($available_result)): ?>
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
                                        <i class="fas fa-map-marker-alt"></i>
                                        <span><?php echo htmlspecialchars($row['location']); ?></span>
                                    </div>
                                </div>
                                
                                <div class="status-badge status-available">Available for Booking</div>
                                
                                <div class="action-form">
                                    <form method="post">
                                        <input type="hidden" name="donation_id" value="<?php echo $row['Fid']; ?>">
                                        
                                        <div class="form-group">
                                            <label for="booking_notes_<?php echo $row['Fid']; ?>">Booking Notes (Optional)</label>
                                            <textarea name="booking_notes" id="booking_notes_<?php echo $row['Fid']; ?>" 
                                                      placeholder="Add any notes about this booking..."></textarea>
                                        </div>
                                        
                                        <div class="action-buttons">
                                            <button type="submit" name="book_food" class="btn btn-book">
                                                <i class="fas fa-hand-paper"></i> Book This Food
                                            </button>
                                        </div>
                                    </form>
                                </div>
                            </div>
                        </div>
                    <?php endwhile; ?>
                </div>
            <?php else: ?>
                <div class="no-items">
                    <i class="fas fa-utensils"></i>
                    <h3>No available food</h3>
                    <p>There are no food donations available for booking at the moment.</p>
                </div>
            <?php endif; ?>
        </div>

        <!-- Pending Bookings -->
        <div class="section">
            <h2 class="section-title">My Pending Bookings</h2>
            
            <?php if(mysqli_num_rows($pending_result) > 0): ?>
                <div class="foods-grid">
                    <?php while($row = mysqli_fetch_assoc($pending_result)): ?>
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
                                        <i class="fas fa-clock"></i>
                                        <span>Booked: <?php echo date('M j, g:i A', strtotime($row['booking_created'])); ?></span>
                                    </div>
                                </div>
                                
                                <div class="status-badge status-pending">Pending Acceptance</div>
                                
                                <div class="action-form">
                                    <form method="post">
                                        <input type="hidden" name="booking_id" value="<?php echo $row['booking_id']; ?>">
                                        
                                        <div class="form-group">
                                            <label for="booking_notes_<?php echo $row['booking_id']; ?>">Response Notes (Optional)</label>
                                            <textarea name="booking_notes" id="booking_notes_<?php echo $row['booking_id']; ?>" 
                                                      placeholder="Add any notes about accepting or rejecting this booking..."></textarea>
                                        </div>
                                        
                                        <div class="action-buttons">
                                            <button type="submit" name="booking_action" value="accept" class="btn btn-accept">
                                                <i class="fas fa-check"></i> Accept Booking
                                            </button>
                                            <button type="submit" name="booking_action" value="reject" class="btn btn-reject">
                                                <i class="fas fa-times"></i> Reject Booking
                                            </button>
                                        </div>
                                    </form>
                                </div>
                            </div>
                        </div>
                    <?php endwhile; ?>
                </div>
            <?php else: ?>
                <div class="no-items">
                    <i class="fas fa-clock"></i>
                    <h3>No pending bookings</h3>
                    <p>You don't have any pending bookings at the moment.</p>
                </div>
            <?php endif; ?>
        </div>

        <!-- Running Deliveries -->
        <div class="section">
            <h2 class="section-title">Active Deliveries</h2>
            
            <?php if(mysqli_num_rows($running_result) > 0): ?>
                <div class="foods-grid">
                    <?php while($row = mysqli_fetch_assoc($running_result)): ?>
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
                                        <i class="fas fa-map-marker-alt"></i>
                                        <span><?php echo htmlspecialchars($row['address']); ?></span>
                                    </div>
                                    <div class="meta-item">
                                        <i class="fas fa-clock"></i>
                                        <span>Started: <?php echo date('M j, g:i A', strtotime($row['accepted_at'])); ?></span>
                                    </div>
                                </div>
                                
                                <div class="status-badge status-running">Currently Delivering</div>
                                
                                <div class="action-form">
                                    <form method="post">
                                        <input type="hidden" name="donation_id" value="<?php echo $row['Fid']; ?>">
                                        
                                        <div class="form-group">
                                            <label for="completion_notes_<?php echo $row['Fid']; ?>">Delivery Completion Notes</label>
                                            <textarea name="completion_notes" id="completion_notes_<?php echo $row['Fid']; ?>" 
                                                      placeholder="Add notes about the delivery completion..." required></textarea>
                                        </div>
                                        
                                        <div class="action-buttons">
                                            <button type="submit" name="complete_delivery" class="btn btn-complete">
                                                <i class="fas fa-check-circle"></i> Mark as Delivered
                                            </button>
                                        </div>
                                    </form>
                                </div>
                            </div>
                        </div>
                    <?php endwhile; ?>
                </div>
            <?php else: ?>
                <div class="no-items">
                    <i class="fas fa-motorcycle"></i>
                    <h3>No active deliveries</h3>
                    <p>You don't have any active deliveries at the moment.</p>
                </div>
            <?php endif; ?>
        </div>

        <!-- Delivery History -->
        <div class="history-section">
            <h2 class="section-title">My Delivery History</h2>
            
            <?php if(mysqli_num_rows($history_result) > 0): ?>
                <?php while($history = mysqli_fetch_assoc($history_result)): ?>
                    <div class="history-item">
                        <div class="history-info">
                            <div class="history-food"><?php echo htmlspecialchars($history['food']); ?></div>
                            <div class="history-status">
                                <?php echo ucfirst($history['status_from']); ?> → <?php echo ucfirst($history['status_to']); ?>
                                <?php if($history['notes']): ?>
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
                <div class="no-items">
                    <i class="fas fa-history"></i>
                    <h3>No delivery history</h3>
                    <p>Your delivery history will appear here.</p>
                </div>
            <?php endif; ?>
        </div>
    </div>
</body>
</html>








