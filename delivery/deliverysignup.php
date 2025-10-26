<?php
// session_start();
// $connection=mysqli_connect("localhost:3307","root","");
// $db=mysqli_select_db($connection,'demo');
include '../connection.php';
$msg=0;
if(isset($_POST['sign']))
{

    $username=$_POST['username'];
    $email=$_POST['email'];
    $password=$_POST['password'];
    $location=$_POST['district'];

    // $location=$_POST['district'];

    $pass=password_hash($password,PASSWORD_DEFAULT);
    $sql="select * from delivery_persons where email='$email'" ;
    $result= mysqli_query($connection, $sql);
    $num=mysqli_num_rows($result);
    if($num==1){
        // echo "<h1> already account is created </h1>";
        // echo '<script type="text/javascript">alert("already Account is created")</script>';
        echo "<h1><center>Account already exists</center></h1>";
    }
    else{
    
    $query="insert into delivery_persons(name,email,password,city) values('$username','$email','$pass','$location')";
    $query_run= mysqli_query($connection, $query);
    if($query_run)
    {
        // $_SESSION['email']=$email;
        // $_SESSION['name']=$row['name'];
        // $_SESSION['gender']=$row['gender'];
       
        header("location:delivery.php");
        // echo "<h1><center>Account does not exists </center></h1>";
        //  echo '<script type="text/javascript">alert("Account created successfully")</script>'; -->
    }
    else{
        echo '<script type="text/javascript">alert("data not saved")</script>';
        
    }
}


   
}
?>





<!DOCTYPE html>
<html lang="en">


  <head>
    <meta charset="UTF-8">
    <meta http-equiv="X-UA-Compatible" content="IE=edge">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">

    <title>Animated Login Form | CodingNepal</title>
    <link rel="stylesheet" href="deliverycss.css">
  </head>
  <body>
    <div class="center">
      <h1>Register</h1>
      <form method="post" action=" ">
        <div class="txt_field">
          <input type="text" name="username" required/>
          <span></span>
          <label>Username</label>
        </div>
        <div class="txt_field">
          <input type="password" name="password" required/>
          <span></span>
          <label>Password</label>
        </div>
        <div class="txt_field">
            <input type="email" name="email" required/>
            <span></span>
            <label>Email</label>
          </div>
          <div class="">
                           <!-- <label for="district">District:</label> -->
                           <select id="district" name="district" style="padding:10px; padding-left: 20px;">
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
                          <option value="dhanmondi" selected>Dhanmondi</option>
                        </select> 
                        
          </div>
          <br>
        <!-- <div class="pass">Forgot Password?</div> -->
        <input type="submit" name="sign" value="Register">
        <div class="signup_link">
          Alredy a member? <a href="deliverylogin.php">Sigin</a>
        </div>
      </form>
    </div>

  </body>
</html>
