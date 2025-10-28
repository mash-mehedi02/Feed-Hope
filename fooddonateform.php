<?php
include("login.php"); 
if($_SESSION['name']==''){
	header("location: signin.php");
}
// include("login.php"); 
$emailid= $_SESSION['email'];
$connection=mysqli_connect("localhost","root","");
$db=mysqli_select_db($connection,'demo');
if(isset($_POST['submit']))
{
    $foodname=mysqli_real_escape_string($connection, $_POST['foodname']);
    $meal=mysqli_real_escape_string($connection, $_POST['meal']);
    $category=$_POST['image-choice'];
    $quantity=mysqli_real_escape_string($connection, $_POST['quantity']);
    // $email=$_POST['email'];
    $phoneno=mysqli_real_escape_string($connection, $_POST['phoneno']);
    $district=mysqli_real_escape_string($connection, $_POST['district']);
    $address=mysqli_real_escape_string($connection, $_POST['address']);
    $name=mysqli_real_escape_string($connection, $_POST['name']);
  

 



    // Handle image upload
    $image_name = '';
    if(isset($_FILES['food_image']) && $_FILES['food_image']['error'] == 0) {
        $target_dir = "uploads/food_images/";
        if(!file_exists($target_dir)) {
            mkdir($target_dir, 0777, true);
        }
        
        $file_name = $_FILES['food_image']['name'];
        $file_tmp = $_FILES['food_image']['tmp_name'];
        $file_ext = strtolower(pathinfo($file_name, PATHINFO_EXTENSION));
        $allowed_exts = ['jpg', 'jpeg', 'png', 'gif'];
        
        if(in_array($file_ext, $allowed_exts)) {
            $new_name = 'FH' . date('Ymd') . rand(100, 999) . '_' . time() . '.' . $file_ext;
            $target_path = $target_dir . $new_name;
            
            if(move_uploaded_file($file_tmp, $target_path)) {
                $image_name = $new_name;
            }
        }
    }

    // Check and add columns if they don't exist
    $check_col = mysqli_query($connection, "SHOW COLUMNS FROM food_donations LIKE 'food_image'");
    if(mysqli_num_rows($check_col) == 0) {
        mysqli_query($connection, "ALTER TABLE food_donations ADD COLUMN food_image VARCHAR(255) DEFAULT NULL");
    }
    
    $check_status = mysqli_query($connection, "SHOW COLUMNS FROM food_donations LIKE 'status'");
    if(mysqli_num_rows($check_status) == 0) {
        mysqli_query($connection, "ALTER TABLE food_donations ADD COLUMN status ENUM('pending','approved','rejected') DEFAULT 'pending'");
    }

    // Insert with or without image
    if($image_name != '') {
        $query="insert into food_donations(email,food,type,category,food_image,phoneno,location,address,name,quantity,status) values('$emailid','$foodname','$meal','$category','$image_name','$phoneno','$district','$address','$name','$quantity','pending')";
    } else {
        $query="insert into food_donations(email,food,type,category,phoneno,location,address,name,quantity,status) values('$emailid','$foodname','$meal','$category','$phoneno','$district','$address','$name','$quantity','pending')";
    }
    $query_run= mysqli_query($connection, $query);
    if($query_run)
    {

        echo '<script type="text/javascript">alert("Donation submitted successfully! Awaiting admin approval.")</script>';
        header("location:food_newsfeed.php");
    }
    else{
        echo '<script type="text/javascript">alert("Error: ' . mysqli_error($connection) . '")</script>';
    }
}
?>


<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta http-equiv="X-UA-Compatible" content="IE=edge">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Food Donate</title>
    <link rel="stylesheet" href="loginstyle.css">
    <style>
        :root{ --green:#06C167; --green-d:#059669; --bg:#f8fafc; --card:#ffffff; --text:#111827; --muted:#6b7280; }
        body{ background:var(--bg); }
        .page{ max-width:1100px; margin:32px auto; padding:0 16px; }
        .hero{ text-align:center; margin-bottom:18px; }
        .hero h1{ margin:0; font-size:28px; color:var(--text); font-weight:800; }
        .hero p{ margin:6px 0 0; color:var(--muted); }
        .card{ background:var(--card); border-radius:16px; box-shadow:0 14px 34px rgba(0,0,0,.10); overflow:hidden; }
        .card-header{ padding:20px; background:linear-gradient(135deg,#e6fff3,#ffffff); border-bottom:1px solid #eef2f7; display:flex; align-items:center; gap:10px; }
        .card-header .logo{ font-size:20px; font-weight:800; color:var(--text); }
        .card-body{ padding:20px; }
        .grid{ display:grid; grid-template-columns:repeat(12,1fr); gap:16px; }
        .col-6{ grid-column:span 12; }
        @media(min-width:900px){ .col-6{ grid-column:span 6; } }
        .input-group{ display:flex; flex-direction:column; gap:8px; margin-bottom:14px; }
        .input-group label{ color:var(--text); font-weight:600; }
        .input-group input[type="text"],
        .input-group input[type="email"],
        .input-group select{ padding:12px 12px; border:1px solid #e5e7eb; border-radius:10px; outline:none; font-size:15px; color:var(--text); background:#fff; }
        .input-group input:focus,
        .input-group select:focus{ border-color:var(--green); box-shadow:0 0 0 3px rgba(6,193,103,.12); }
        .radio-wrap{ display:flex; align-items:center; gap:14px; flex-wrap:wrap; }
        .category-group{ display:flex; gap:14px; align-items:center; flex-wrap:wrap; }
        .category-group img{ width:56px; height:56px; border-radius:12px; border:1px solid #e5e7eb; padding:6px; background:#fff; }
        .btn-row{ display:flex; justify-content:flex-end; padding:16px 20px; border-top:1px solid #eef2f7; background:#fafafa; }
        .btn{ padding:12px 22px; border:0; border-radius:999px; background:linear-gradient(135deg,var(--green),var(--green-d)); color:#fff; font-weight:700; cursor:pointer; box-shadow:0 10px 20px rgba(6,193,103,.25); }
        .two-col{ display:grid; grid-template-columns:repeat(12,1fr); gap:16px; }
        .two-col > .full{ grid-column:span 12; }
        @media(min-width:900px){ .two-col > .half{ grid-column:span 6; } }
    </style>
</head>
<body style="    background-color: #06C167;">
    <div class="page">
        <div class="card">
            <div class="card-header">
                <div class="logo">Food <b style="color:var(--green)">Donate</b></div>
            </div>
            <form action="" method="post" enctype="multipart/form-data">
                <div class="card-body">
                    <div class="grid">
                        <div class="col-6">
                            <div class="input-group">
                                <label for="foodname">Food Name</label>
                                <input type="text" id="foodname" name="foodname" placeholder="e.g., Fried Rice" required />
                            </div>
                        </div>
                        <div class="col-6">
                            <div class="input-group">
                                <label>Meal type</label>
                                <div class="radio-wrap">
                                    <label><input type="radio" name="meal" id="veg" value="veg" required /> Veg</label>
                                    <label><input type="radio" name="meal" id="Non-veg" value="Non-veg" /> Non-veg</label>
                                </div>
                            </div>
                        </div>

                        <div class="col-6">
                            <div class="input-group">
                                <label>Select the Category</label>
                                <div class="category-group">
                                    <label><input type="radio" id="raw-food" name="image-choice" value="raw-food"> <img src="img/raw-food.png" alt="raw-food"></label>
                                    <label><input type="radio" id="cooked-food" name="image-choice" value="cooked-food" checked> <img src="img/cooked-food.png" alt="cooked-food"></label>
                                    <label><input type="radio" id="packed-food" name="image-choice" value="packed-food"> <img src="img/packed-food.png" alt="packed-food"></label>
                                </div>
                            </div>
                        </div>
                        <div class="col-6">
                            <div class="input-group">
                                <label for="quantity">Quantity (people/kg)</label>
                                <input type="text" id="quantity" name="quantity" placeholder="e.g., 10 packs / 5 kg" required />
                            </div>
                        </div>

                        <div class="col-6">
                            <div class="input-group">
                                <label for="name">Your Name</label>
                                <input type="text" id="name" name="name" value="<?php echo ''. $_SESSION['name'] ;?>" required />
                            </div>
                        </div>
                        <div class="col-6">
                            <div class="input-group">
                                <label for="phoneno">Phone (11 digits)</label>
                                <input type="text" id="phoneno" name="phoneno" maxlength="11" pattern="[0-9]{11}" placeholder="01XXXXXXXXX" required />
                            </div>
                        </div>

                        <div class="col-6">
                            <div class="input-group">
                                <label for="district">Location</label>
                                <select id="district" name="district" required>
                                  <option value="dhanmondi">Dhanmondi</option>
                                  <option value="mirpur1">Mirpur 1</option>
                                  <option value="mirpur2">Mirpur 2</option>
                                  <option value="mirpur6">Mirpur 6</option>
                                  <option value="mirpur10">Mirpur 10</option>
                                  <option value="mirpur11">Mirpur 11</option>
                                  <option value="mirpur12">Mirpur 12</option>
                                  <option value="mirpur13">Mirpur 13</option>
                                  <option value="mirpur14">Mirpur 14</option>
                                  <option value="banani">Banani</option>
                                  <option value="gulshan1">Gulshan 1</option>
                                  <option value="gulshan2">Gulshan 2</option>
                                  <option value="uttara">Uttara</option>
                                  <option value="uttara_sector1">Uttara Sector 1</option>
                                  <option value="uttara_sector2">Uttara Sector 2</option>
                                  <option value="uttara_sector3">Uttara Sector 3</option>
                                  <option value="uttara_sector4">Uttara Sector 4</option>
                                  <option value="uttara_sector5">Uttara Sector 5</option>
                                  <option value="uttara_sector6">Uttara Sector 6</option>
                                  <option value="uttara_sector7">Uttara Sector 7</option>
                                  <option value="uttara_sector8">Uttara Sector 8</option>
                                  <option value="uttara_sector9">Uttara Sector 9</option>
                                  <option value="uttara_sector10">Uttara Sector 10</option>
                                  <option value="uttara_sector11">Uttara Sector 11</option>
                                  <option value="uttara_sector12">Uttara Sector 12</option>
                                  <option value="uttara_sector13">Uttara Sector 13</option>
                                  <option value="uttara_sector14">Uttara Sector 14</option>
                                  <option value="uttara_sector15">Uttara Sector 15</option>
                                  <option value="uttara_sector16">Uttara Sector 16</option>
                                  <option value="uttara_sector17">Uttara Sector 17</option>
                                  <option value="uttara_sector18">Uttara Sector 18</option>
                                  <option value="agargoan">Agargaon</option>
                                  <option value="tejgaon">Tejgaon</option>
                                  <option value="tejgaon_industrial">Tejgaon Industrial Area</option>
                                  <option value="rampura">Rampura</option>
                                  <option value="badda">Badda</option>
                                  <option value="khilgaon">Khilgaon</option>
                                  <option value="ramna">Ramna</option>
                                  <option value="paltan">Paltan</option>
                                  <option value="motijheel">Motijheel</option>
                                  <option value="shahbagh">Shahbagh</option>
                                  <option value="new_market">New Market</option>
                                  <option value="farmgate">Farmgate</option>
                                  <option value="mohammadpur">Mohammadpur</option>
                                  <option value="adabor">Adabor</option>
                                  <option value="shyamoli">Shyamoli</option>
                                  <option value="kallyanpur">Kallyanpur</option>
                                  <option value="gabtoli">Gabtoli</option>
                                  <option value="savar">Savar</option>
                                  <option value="tongi">Tongi</option>
                                  <option value="gazipur">Gazipur</option>
                                  <option value="narayanganj">Narayanganj</option>
                                </select>
                            </div>
                        </div>
                        <div class="col-6">
                            <div class="input-group">
                                <label for="address">Address</label>
                                <input type="text" id="address" name="address" placeholder="House, Road, Block" required />
                            </div>
                        </div>

                        <div class="col-6">
                            <div class="input-group">
                                <label for="food_image">Upload Food Image</label>
                                <input type="file" id="food_image" name="food_image" accept="image/*" />
                            </div>
                        </div>
                    </div>
                </div>
                <div class="btn-row">
                    <button type="submit" name="submit" class="btn">Submit Donation</button>
                </div>
            </form>
        </div>
    </div>
     
    
</body>
</html>