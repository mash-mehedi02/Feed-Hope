<?php
include("login.php"); 
if($_SESSION['name']==''){
	header("location: signin.php");
}

$connection=mysqli_connect("localhost","root","");
$db=mysqli_select_db($connection,'demo');

// Get all food donations with images
$query = "SELECT fd.*, dp.name as delivery_person_name, dp.city as delivery_city 
          FROM food_donations fd 
          LEFT JOIN delivery_persons dp ON fd.delivery_by = dp.Did 
          WHERE fd.status IN ('available', 'booking', 'running')
          ORDER BY fd.date DESC";
$result = mysqli_query($connection, $query);
?>

<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta http-equiv="X-UA-Compatible" content="IE=edge">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Feed Hope - Food Donations</title>
    <link rel="stylesheet" href="home.css">
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css">
    <style>
        .newsfeed-container {
            max-width: 1200px;
            margin: 0 auto;
            padding: 2rem;
            margin-top: 100px;
        }
        
        .newsfeed-header {
            text-align: center;
            margin-bottom: 3rem;
        }
        
        .newsfeed-title {
            font-size: 2.5rem;
            font-weight: 700;
            background: linear-gradient(135deg, var(--green), var(--green-dark));
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            background-clip: text;
            margin-bottom: 1rem;
        }
        
        .food-grid {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
            gap: 2rem;
            margin-bottom: 3rem;
        }
        
        .food-card {
            background: white;
            border-radius: var(--border-radius-lg);
            box-shadow: var(--box-shadow-lg);
            overflow: hidden;
            transition: var(--transition);
            position: relative;
        }
        
        .food-card:hover {
            transform: translateY(-8px);
            box-shadow: 0 25px 50px -12px rgba(0,0,0,0.25);
        }
        
        .food-image {
            width: 100%;
            height: 250px;
            object-fit: cover;
            background: linear-gradient(135deg, #f0f0f0, #e0e0e0);
        }
        
        .food-image-placeholder {
            width: 100%;
            height: 250px;
            background: linear-gradient(135deg, var(--green-light), var(--green));
            display: flex;
            align-items: center;
            justify-content: center;
            color: white;
            font-size: 3rem;
        }
        
        .food-content {
            padding: 1.5rem;
        }
        
        .food-title {
            font-size: 1.3rem;
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
        
        .food-description {
            color: var(--text-secondary);
            line-height: 1.6;
            margin-bottom: 1rem;
        }
        
        .food-location {
            display: flex;
            align-items: center;
            gap: 0.5rem;
            color: var(--text-secondary);
            font-size: 0.9rem;
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
        
        .tracking-info {
            background: var(--bg-accent);
            padding: 1rem;
            border-radius: var(--border-radius);
            margin-top: 1rem;
        }
        
        .tracking-id {
            font-family: 'Courier New', monospace;
            font-weight: 600;
            color: var(--green-dark);
        }
        
        .delivery-person {
            display: flex;
            align-items: center;
            gap: 0.5rem;
            margin-top: 0.5rem;
            color: var(--text-secondary);
        }
        
        .delivery-person i {
            color: var(--green);
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
        
        .donate-cta {
            text-align: center;
            margin: 3rem 0;
        }
        
        .donate-btn {
            display: inline-block;
            background: linear-gradient(135deg, var(--green), var(--green-dark));
            color: green;
            padding: 1rem 2rem;
            border-radius: var(--border-radius-lg);
            text-decoration: none;
            font-weight: 600;
            transition: var(--transition);
            box-shadow: var(--box-shadow-lg);
        }
        
        .donate-btn:hover {
            transform: translateY(-2px);
            box-shadow: 0 20px 25px -5px rgba(0,0,0,0.1);
        }
        
        @media (max-width: 768px) {
            .newsfeed-container {
                padding: 1rem;
                margin-top: 80px;
            }
            
            .food-grid {
                grid-template-columns: 1fr;
                gap: 1.5rem;
            }
            
            .newsfeed-title {
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
                <li><a href="home.html">Home</a></li>
                <li><a href="food_newsfeed.php" class="active">Donations</a></li>
                <li><a href="about.html">About</a></li>
                <li><a href="contact.html">Contact</a></li>
                <li><a href="profile.php">Profile</a></li>
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

    <div class="newsfeed-container">
        <div class="newsfeed-header">
            <h1 class="newsfeed-title">Food Donations Feed</h1>
            <p style="color: var(--text-secondary); font-size: 1.1rem;">See all the amazing food donations from our community</p>
        </div>
        
        <div class="donate-cta">
            <a href="fooddonateform.php" class="donate-btn">
                <i class="fas fa-plus"></i> Donate Food
            </a>
        </div>

        <?php if(mysqli_num_rows($result) > 0): ?>
            <div class="food-grid">
                <?php while($row = mysqli_fetch_assoc($result)): ?>
                    <div class="food-card">
                        <?php if(isset($row['food_image']) && $row['food_image']): ?>
                            <img src="uploads/food_images/<?php echo $row['food_image']; ?>" 
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
                            </div>
                            
                            <div class="food-description">
                                <strong>Type:</strong> <?php echo ucfirst($row['type']); ?><br>
                                <strong>Category:</strong> <?php echo ucfirst(str_replace('-', ' ', $row['category'])); ?>
                            </div>
                            
                            <div class="food-location">
                                <i class="fas fa-map-marker-alt"></i>
                                <span><?php echo htmlspecialchars($row['location']); ?></span>
                            </div>
                            
                            <div class="status-badge status-<?php echo isset($row['status']) ? $row['status'] : 'pending'; ?>">
                                <?php echo ucfirst(str_replace('_', ' ', isset($row['status']) ? $row['status'] : 'pending')); ?>
                            </div>
                            
                            <?php if(isset($row['tracking_id']) && $row['tracking_id']): ?>
                                <div class="tracking-info">
                                    <div><strong>Tracking ID:</strong> <span class="tracking-id"><?php echo $row['tracking_id']; ?></span></div>
                                    
                                    <?php if($row['delivery_person_name']): ?>
                                        <div class="delivery-person">
                                            <i class="fas fa-motorcycle"></i>
                                            <span>Delivered by: <?php echo htmlspecialchars($row['delivery_person_name']); ?></span>
                                        </div>
                                    <?php endif; ?>
                                </div>
                            <?php endif; ?>
                        </div>
                    </div>
                <?php endwhile; ?>
            </div>
        <?php else: ?>
            <div class="no-donations">
                <i class="fas fa-utensils"></i>
                <h3>No donations yet</h3>
                <p>Be the first to donate food and help feed those in need!</p>
                <a href="fooddonateform.php" class="donate-btn" style="margin-top: 1rem;">
                    <i class="fas fa-plus"></i> Donate Food
                </a>
            </div>
        <?php endif; ?>
    </div>
</body>
</html>
