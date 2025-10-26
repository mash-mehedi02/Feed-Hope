# XAMPP Startup Guide for Feed Hope App

## 🚨 **MySQL Connection Error Fix**

The error "No connection could be made because the target machine actively refused it" means MySQL/MariaDB is not running.

## 🔧 **Step-by-Step Solution**

### **1. Start XAMPP Services**
1. **Open XAMPP Control Panel** (as Administrator)
2. **Start Apache** - Click "Start" next to Apache
3. **Start MySQL** - Click "Start" next to MySQL
4. **Wait for both to show "Running" status**

### **2. Check Service Status**
- ✅ **Apache**: Should show "Running" in green
- ✅ **MySQL**: Should show "Running" in green
- ❌ **If red**: Click "Start" to start the service

### **3. Verify Database Connection**
1. **Open phpMyAdmin**: Go to `http://localhost/phpmyadmin`
2. **Check if 'demo' database exists**
3. **If not, create it** (see instructions below)

### **4. Common Issues & Solutions**

#### **Issue: Port Conflicts**
- **Apache Port 80**: If busy, change to 8080
- **MySQL Port 3306**: If busy, change to 3307
- **Solution**: Click "Config" → "Service and Port Settings"

#### **Issue: MySQL Won't Start**
- **Check Error Logs**: Click "Logs" next to MySQL
- **Common Causes**: 
  - Another MySQL service running
  - Port already in use
  - Corrupted data files

#### **Issue: Permission Errors**
- **Run as Administrator**: Right-click XAMPP → "Run as administrator"
- **Check Windows Firewall**: Allow XAMPP through firewall

## 🗄️ **Database Setup**

### **Create 'demo' Database**
1. **Open phpMyAdmin**: `http://localhost/phpmyadmin`
2. **Click "New"** in left sidebar
3. **Database name**: `demo`
4. **Collation**: `utf8mb4_general_ci`
5. **Click "Create"**

### **Import Database Schema**
1. **Select 'demo' database**
2. **Click "Import" tab**
3. **Choose file**: `database/demo.sql`
4. **Click "Go"**

## 🔍 **Troubleshooting Commands**

### **Check if MySQL is Running**
```bash
# Open Command Prompt and run:
netstat -an | findstr :3306
```

### **Check Apache Status**
```bash
netstat -an | findstr :80
```

### **Restart Services**
1. **Stop** both Apache and MySQL
2. **Wait 10 seconds**
3. **Start** MySQL first, then Apache

## 📋 **Quick Checklist**

- [ ] XAMPP Control Panel open
- [ ] Apache service running (green)
- [ ] MySQL service running (green)
- [ ] phpMyAdmin accessible at `http://localhost/phpmyadmin`
- [ ] 'demo' database exists
- [ ] Database tables imported

## 🆘 **If Still Not Working**

### **Alternative Port Configuration**
If default ports don't work, try these settings in your PHP files:

```php
// For MySQL on port 3307
$connection = mysqli_connect("localhost:3307", "root", "");

// For MySQL on different host
$connection = mysqli_connect("127.0.0.1", "root", "");
```

### **Check XAMPP Logs**
1. **Apache Logs**: Click "Logs" next to Apache
2. **MySQL Logs**: Click "Logs" next to MySQL
3. **Look for error messages**

### **Reinstall XAMPP**
If nothing works:
1. **Backup your project files**
2. **Uninstall XAMPP**
3. **Download latest XAMPP**
4. **Install fresh**
5. **Restore project files**

## ✅ **Success Indicators**

When everything is working:
- ✅ XAMPP shows both services as "Running"
- ✅ phpMyAdmin loads without errors
- ✅ Feed Hope app loads without connection errors
- ✅ Database queries execute successfully

## 📞 **Need More Help?**

If you're still having issues:
1. **Check XAMPP version** (should be 8.0+)
2. **Verify Windows compatibility**
3. **Check antivirus software** (may block ports)
4. **Try different ports** (8080 for Apache, 3307 for MySQL)


