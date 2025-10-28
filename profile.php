
<?php
include("login.php"); 
// if($_SESSION['loggedin']==true){
//     header("location:loginindex.html");
// }

if($_SESSION['name']==''){
	header("location: signup.php");
}

?> 

<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta http-equiv="X-UA-Compatible" content="IE=edge">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <!-- <title>Document</title> -->
    <link rel="stylesheet" href="home.css">
    <link rel="stylesheet" href="profile.css">
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/4.7.0/css/font-awesome.min.css">
    <style>
        :root{ --green:#06C167; --text:#111827; --muted:#6b7280; --card:#ffffff; --bg:#f8fafc; }
        body{ background: var(--bg); }
        .profile-container{ max-width:1100px; margin:40px auto; padding:0 16px; }
        .card{ background:var(--card); border-radius:16px; box-shadow:0 10px 25px rgba(0,0,0,.08); overflow:hidden; }
        .profile-header{ display:flex; align-items:center; gap:24px; padding:24px; background:linear-gradient(135deg,#e6fff3,#ffffff); }
        .avatar{ width:96px; height:96px; border-radius:50%; background:var(--green); color:#fff; display:flex; align-items:center; justify-content:center; font-size:36px; font-weight:700; box-shadow:0 10px 20px rgba(6,193,103,.25); }
        .profile-meta{ flex:1; }
        .profile-name{ margin:0; font-size:28px; color:var(--text); font-weight:700; }
        .profile-sub{ margin:6px 0 0; color:var(--muted); }
        .logout-btn{ background:linear-gradient(135deg,#ef4444,#dc2626); color:#fff; padding:10px 18px; border-radius:999px; text-decoration:none; font-weight:600; display:inline-flex; gap:8px; align-items:center; box-shadow:0 8px 18px rgba(239,68,68,.25); }
        .grid{ display:grid; grid-template-columns:repeat(12,1fr); gap:16px; padding:20px; }
        .panel{ grid-column: span 12; background:var(--card); border-radius:14px; padding:18px; box-shadow:0 8px 18px rgba(0,0,0,.06); }
        @media(min-width:900px){ .panel-left{ grid-column: span 5; } .panel-right{ grid-column: span 7; } }
        .section-title{ margin:0 0 12px; font-size:18px; color:var(--text); font-weight:700; }
        .kv{ margin:6px 0; color:var(--muted); }
        .kv b{ color:var(--text); }
        .stats{ display:grid; grid-template-columns: repeat(3,1fr); gap:12px; margin-top:12px; }
        .stat{ background:#f1fff7; border:1px solid #d1fae5; padding:14px; border-radius:12px; text-align:center; }
        .stat .num{ font-size:20px; font-weight:800; color:var(--green); }
        .table{ width:100%; border-collapse:collapse; }
        .table th,.table td{ padding:12px 10px; border-bottom:1px solid #eef2f7; text-align:left; }
        .table th{ color:#374151; font-weight:700; background:#f8fafc; }
        .table tr:hover{ background:#f9fffb; }
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
                <li><a href="about.html" >About</a></li>
                <li><a href="contact.html"  >Contact</a></li>
                <li><a href="profile.php"  class="active">Profile</a></li>
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
  
    
    



    <div class="profile-container">
        <div class="card profile-header">
            <?php $initial = strtoupper(substr($_SESSION['name'] ?? 'U',0,1)); ?>
            <div class="avatar"><?php echo $initial; ?></div>
            <div class="profile-meta">
                <h2 class="profile-name"><?php echo htmlspecialchars($_SESSION['name'] ?? 'User'); ?></h2>
                <p class="profile-sub"><i class="fa fa-envelope"></i> <?php echo htmlspecialchars($_SESSION['email'] ?? ''); ?> &nbsp; • &nbsp; <i class="fa fa-user"></i> <?php echo htmlspecialchars($_SESSION['gender'] ?? ''); ?></p>
            </div>
            <a class="logout-btn" href="logout.php"><i class="fa fa-sign-out"></i> Logout</a>
        </div>

        <div class="grid">
            <div class="panel panel-left">
                <h3 class="section-title">Profile Details</h3>
                <p class="kv"><b>Name:</b> <?php echo htmlspecialchars($_SESSION['name'] ?? ''); ?></p>
                <p class="kv"><b>Email:</b> <?php echo htmlspecialchars($_SESSION['email'] ?? ''); ?></p>
                <p class="kv"><b>Gender:</b> <?php echo htmlspecialchars($_SESSION['gender'] ?? ''); ?></p>
                <div class="stats">
                    <?php
                        $email = isset($_SESSION['email']) ? $_SESSION['email'] : '';
                        $total = 0; $recent = '';
                        if(!empty($email)){
                            $cRes = mysqli_query($connection, "SELECT COUNT(*) c FROM food_donations WHERE email='".mysqli_real_escape_string($connection,$email)."'");
                            $rowC = $cRes? mysqli_fetch_assoc($cRes): ['c'=>0];
                            $total = (int)$rowC['c'];
                            $rRes = mysqli_query($connection, "SELECT MAX(date) d FROM food_donations WHERE email='".mysqli_real_escape_string($connection,$email)."'");
                            $rowR = $rRes? mysqli_fetch_assoc($rRes): ['d'=>null];
                            $recent = $rowR['d']? date('M d, Y H:i', strtotime($rowR['d'])): '—';
                        }
                    ?>
                    <div class="stat"><div class="num"><?php echo $total; ?></div><div>Total Donations</div></div>
                    <div class="stat"><div class="num"><?php echo $recent; ?></div><div>Last Donated</div></div>
                    <div class="stat"><div class="num">BD</div><div>Location</div></div>
                </div>
            </div>
            <div class="panel panel-right">
                <h3 class="section-title">Your Donations</h3>
                <table class="table">
                    <thead>
                        <tr>
                            <th>Food</th>
                            <th>Type</th>
                            <th>Category</th>
                            <th>Date/Time</th>
                        </tr>
                    </thead>
                    <tbody>
                        <?php
                        $email = isset($_SESSION['email']) ? $_SESSION['email'] : '';
                        $query = "SELECT food AS food_name, type, category, date FROM food_donations WHERE email='".mysqli_real_escape_string($connection,$email)."' ORDER BY date DESC";
                        $result = mysqli_query($connection, $query);
                        if($result){
                            while($row = mysqli_fetch_assoc($result)){
                                echo '<tr>';
                                echo '<td>'.htmlspecialchars($row['food_name']).'</td>';
                                echo '<td>'.htmlspecialchars($row['type']).'</td>';
                                echo '<td>'.htmlspecialchars($row['category']).'</td>';
                                echo '<td>'.date('M d, Y H:i', strtotime($row['date'])).'</td>';
                                echo '</tr>';
                            }
                        }
                        ?>
                    </tbody>
                </table>
            </div>
        </div>
    </div>


   
    
    
</body>
</html>