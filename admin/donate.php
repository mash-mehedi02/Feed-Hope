
<?php
// $connection = mysqli_connect("localhost:3307", "root", "");
// $db = mysqli_select_db($connection, 'demo');
include "../connection.php";
include("connect.php"); 
if($_SESSION['name']==''){
	header("location:signin.php");
}
?>
<!DOCTYPE html>

<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta http-equiv="X-UA-Compatible" content="IE=edge">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/4.7.0/css/font-awesome.min.css">
    
    <!----======== CSS ======== -->
    <link rel="stylesheet" href="admin.css">
     
    <!----===== Iconscout CSS ===== -->
    <link rel="stylesheet" href="https://unicons.iconscout.com/release/v4.0.0/css/line.css">

    <title>Admin Dashboard Panel</title> 
    
<?php
// Database connection is already established in connect.php
// No need for duplicate connection code here
?>
</head>
<body>
    <nav>
        <div class="logo-name">
            <div class="logo-image">
                <!--<img src="images/logo.png" alt="">-->
            </div>

            <span class="logo_name">ADMIN</span>
        </div>

        <div class="menu-items">
            <ul class="nav-links">
                <li><a href="admin.php">
                    <i class="uil uil-estate"></i>
                    <span class="link-name">Dahsboard</span>
                </a></li>
                <!-- <li><a href="#">
                    <i class="uil uil-files-landscapes"></i>
                    <span class="link-name">Content</span>
                </a></li> -->
                <li><a href="analytics.php">
                    <i class="uil uil-chart"></i>
                    <span class="link-name">Analytics</span>
                </a></li>
                <li><a href="#">
                    <i class="uil uil-heart"></i>
                    <span class="link-name">Donates</span>
                </a></li>
                <li><a href="feedback.php">
                    <i class="uil uil-comments"></i>
                    <span class="link-name">Feedbacks</span>
                </a></li>
                <li><a href="adminprofile.php">
                    <i class="uil uil-user"></i>
                    <span class="link-name">Profile</span>
                </a></li>
                <!-- <li><a href="#">
                    <i class="uil uil-share"></i>
                    <span class="link-name">Share</span>
                </a></li> -->
            </ul>
            
            <ul class="logout-mode">
                <li><a href="../logout.php">
                    <i class="uil uil-signout"></i>
                    <span class="link-name">Logout</span>
                </a></li>

                <li class="mode">
                    <a href="#">
                        <i class="uil uil-moon"></i>
                    <span class="link-name">Dark Mode</span>
                </a>

                <div class="mode-toggle">
                  <span class="switch"></span>
                </div>
            </li>
            </ul>
        </div>
    </nav>

    <section class="dashboard">
        
        <div class="top">
            <i class="uil uil-bars sidebar-toggle"></i>
            <!-- <p>Food Donate</p> -->
            <p  class ="logo" >Feed <b style="color: #06C167; ">Hope</b></p>
             <p class="user"></p>
            <!-- <div class="search-box">
                <i class="uil uil-search"></i>
                <input type="text" placeholder="Search here...">
            </div> -->
            
            <!--<img src="images/profile.jpg" alt="">-->
        </div>
        <br>
        <br>
        <br>
    
  

            <div class="activity">
               
            <div class="location">
                <!-- <p class="logo">Filter by Location</p> -->
          <form method="post">
             <label for="location" class="logo">Select Location:</label>
             <!-- <br> -->
            <select id="location" name="location">
               <option value="mirpur1">Mirpur 1</option>
               <option value="mirpur2">Mirpur 2</option>
               <option value="mirpur6">Mirpur 6</option>
               <option value="mirpur10">Mirpur 10</option>
               <option value="mirpur11">Mirpur 11</option>
               <option value="mirpur12">Mirpur 12</option>
               <option value="mirpur13">Mirpur 13</option>
               <option value="mirpur14">Mirpur 14</option>
               <option value="dhanmondi">Dhanmondi</option>
               <option value="dhanmondi27">Dhanmondi 27</option>
               <option value="dhanmondi32">Dhanmondi 32</option>
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
               <option value="khilgaon_taltola">Khilgaon Taltola</option>
               <option value="ramna">Ramna</option>
               <option value="paltan">Paltan</option>
               <option value="motijheel">Motijheel</option>
               <option value="purana_dhaka">Purana Dhaka</option>
               <option value="lalbagh">Lalbagh</option>
               <option value="chawkbazar">Chawkbazar</option>
               <option value="sutrapur">Sutrapur</option>
               <option value="kotwali">Kotwali</option>
               <option value="hazaribagh">Hazaribagh</option>
               <option value="dhanmondi_lake">Dhanmondi Lake</option>
               <option value="wari">Wari</option>
               <option value="gandaria">Gandaria</option>
               <option value="shahbagh">Shahbagh</option>
               <option value="new_market">New Market</option>
               <option value="azimpur">Azimpur</option>
               <option value="dhaka_university">Dhaka University</option>
               <option value="farmgate">Farmgate</option>
               <option value="kawran_bazar">Kawran Bazar</option>
               <option value="mohammadpur">Mohammadpur</option>
               <option value="adabor">Adabor</option>
               <option value="shyamoli">Shyamoli</option>
               <option value="kallyanpur">Kallyanpur</option>
               <option value="gabtoli">Gabtoli</option>
               <option value="savar">Savar</option>
               <option value="ashulia">Ashulia</option>
               <option value="tongi">Tongi</option>
               <option value="gazipur">Gazipur</option>
               <option value="narsingdi">Narsingdi</option>
               <option value="narayanganj">Narayanganj</option>
               <option value="demra">Demra</option>
               <option value="jatrabari">Jatrabari</option>
               <option value="sabujbagh">Sabujbagh</option>
               <option value="khilkhet">Khilkhet</option>
               <option value="niketon">Niketon</option>
               <option value="baridhara">Baridhara</option>
               <option value="bashundhara">Bashundhara</option>
               <option value="bashundhara_ra">Bashundhara RA</option>
               <option value="purbachal">Purbachal</option>
               <option value="shahjahanpur">Shahjahanpur</option>
               <option value="kadamtali">Kadamtali</option>
            </select>
                <input type="submit" value="Get Details">
         </form>
         <br>

         <?php
    // Get the selected location from the form
    if(isset($_POST['location'])) {
      $location = $_POST['location'];
      
      // Query the database for people in the selected location
      $sql = "SELECT * FROM food_donations WHERE location='$location'";
      $result=mysqli_query($connection, $sql);
    //   $result = $conn->query($sql);
      
      // If there are results, display them in a table
      if ($result->num_rows > 0) {
        // echo "<h2>Food Donate in $location:</h2>";
        
        echo" <div class=\"table-container\">";
        echo "    <div class=\"table-wrapper\">";
        echo "  <table class=\"table\">";
        echo "<table><thead>";
        echo" <tr>
        <th >Name</th>
        <th>food</th>
        <th>Category</th>
        <th>phoneno</th>
        <th>date/time</th>
        <th>address</th>
        <th>Quantity</th>
        
    </tr>
    </thead><tbody>";

        while($row = $result->fetch_assoc()) {
            echo "<tr><td data-label=\"name\">".$row['name']."</td><td data-label=\"food\">".$row['food']."</td><td data-label=\"category\">".$row['category']."</td><td data-label=\"phoneno\">".$row['phoneno']."</td><td data-label=\"date\">".$row['date']."</td><td data-label=\"Address\">".$row['address']."</td><td data-label=\"quantity\">".$row['quantity']."</td></tr>";

        //   echo "<tr><td>" . $row["name"] . "</td><td>" . $row["phoneno"] . "</td><td>" . $row["location"] . "</td></tr>";
        }
        echo "</tbody></table></div>";
      } else {
        echo "<p>No results found.</p>";
      }
      
   
    }
  ?>
 </div>

 

            
            </div>
    </section>

    <script src="admin.js"></script>
</body>
</html>
