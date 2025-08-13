---
title: "Dolibarr ERP CRM – A Complete Open-Source Business Management Solution"
description: "Discover Dolibarr, an open-source ERP and CRM system for businesses of all sizes. Learn its features, pros & cons, and how to self-host it."
published: 2025-08-13
tags: ['open-source', 'self-host', 'erp', 'crm', 'php', 'business-management']
category: Self-hosted
author: minhpt
---

# Dolibarr/dolibarr - Detailed Review

## 1. Overview & GitHub Stats  
- **URL:** [https://github.com/Dolibarr/dolibarr](https://github.com/Dolibarr/dolibarr)  
- **Stars:** 5951 (as of August 2025)  

## 2. Project Description  
**Dolibarr ERP CRM** is a modern, open-source web application designed to help businesses, freelancers, and foundations manage their operations efficiently. Written in PHP, it integrates **Enterprise Resource Planning (ERP)** and **Customer Relationship Management (CRM)** functionalities into a single platform.  

Key aspects include:  
✔ **Modular design** – Only install the features you need.  
✔ **Self-hosted** – Full control over your data.  
✔ **Multi-user & multi-company support** – Ideal for growing businesses.  

## 3. What Software Does It Replace?  
Dolibarr serves as a free, open-source alternative to commercial solutions like:  
- **SAP Business One** (ERP)  
- **Salesforce CRM** (CRM)  
- **Odoo** (ERP/CRM)  
- **Microsoft Dynamics 365**  

For small businesses, it can replace standalone tools like **QuickBooks (accounting)**, **Zoho CRM**, or **HubSpot**.

## 4. Core Functionality  
Dolibarr’s modular structure allows businesses to enable only the features they require:  

### **ERP Features**  
- **Invoicing & Payments** – Generate quotes, invoices, and track payments.  
- **Inventory & Stock Management** – Manage products, warehouses, and orders.  
- **Accounting** – Double-entry bookkeeping with export to accounting software.  
- **HR & Project Management** – Track employees, timesheets, and projects.  

### **CRM Features**  
- **Contact & Lead Management** – Store customer details and track interactions.  
- **Email Campaigns** – Send bulk emails and newsletters.  
- **Event Scheduling** – Manage meetings and tasks via an integrated calendar.  

### **Additional Modules**  
- **Point of Sale (POS)** – For retail businesses.  
- **Donations & Memberships** – Ideal for nonprofits.  
- **E-commerce Integration** – Connect with platforms like WooCommerce.  

## 5. Pros and Cons  

### **Pros ✅**  
✔ **Open-source & Free** – No licensing costs.  
✔ **Highly Customizable** – Add or remove modules as needed.  
✔ **Self-Hosted** – Ensures data privacy and security.  
✔ **Multi-language & Multi-currency** – Supports global businesses.  

### **Cons ❌**  
❌ **Steep Learning Curve** – Requires time to master all features.  
❌ **Limited Mobile App** – Web-based interface may not be as mobile-friendly.  
❌ **Community Support Only** – No dedicated enterprise support (paid plans available for assistance).  

## 6. Detailed Installation Guide (Self-host on Ubuntu)  

### **Prerequisites**  
- **Ubuntu 22.04 LTS** (or newer)  
- **LAMP Stack** (Linux, Apache, MySQL, PHP)  
- **Composer** (PHP dependency manager)  

### **Step-by-Step Setup**  

#### **1. Install LAMP Stack**  
```bash
sudo apt update && sudo apt upgrade -y  
sudo apt install apache2 mysql-server php libapache2-mod-php php-mysql php-curl php-gd php-zip php-xml -y  
```

#### **2. Configure MySQL**  
Secure MySQL and create a database:  
```bash
sudo mysql_secure_installation  
sudo mysql -u root -p  
CREATE DATABASE dolibarr_db;  
CREATE USER 'doliuser'@'localhost' IDENTIFIED BY 'YourSecurePassword';  
GRANT ALL PRIVILEGES ON dolibarr_db.* TO 'doliuser'@'localhost';  
FLUSH PRIVILEGES;  
EXIT;  
```

#### **3. Install Dolibarr**  
```bash
cd /var/www/html  
sudo git clone https://github.com/Dolibarr/dolibarr.git  
cd dolibarr  
sudo chown -R www-data:www-data /var/www/html/dolibarr  
```

#### **4. Configure Apache**  
Create a virtual host:  
```bash
sudo nano /etc/apache2/sites-available/dolibarr.conf  
```
Paste:  
```apache
<VirtualHost *:80>
    ServerAdmin admin@yourdomain.com  
    DocumentRoot /var/www/html/dolibarr/htdocs  
    ServerName yourdomain.com  
    <Directory /var/www/html/dolibarr/htdocs>  
        Options FollowSymLinks  
        AllowOverride All  
        Require all granted  
    </Directory>  
</VirtualHost>  
```
Enable the site:  
```bash
sudo a2ensite dolibarr.conf  
sudo a2enmod rewrite  
sudo systemctl restart apache2  
```

#### **5. Complete Setup via Web Installer**  
- Visit `http://yourdomain.com/install` in a browser.  
- Follow the on-screen instructions to configure Dolibarr.  
- Enter your MySQL credentials when prompted.  

### **Optional: Docker Installation**  
For Docker users:  
```bash
docker run -d --name dolibarr -p 80:80 -v dolibarr_data:/var/www/html/dolibarr -e PHP_TIMEZONE="UTC" dolibarr/dolibarr:latest  
```

### **Final Notes**  
✔ Secure your installation with **HTTPS** (use Let’s Encrypt).  
✔ Regularly back up the `/var/www/html/dolibarr` directory and database.  

Dolibarr is a powerful, cost-effective solution for businesses looking to streamline operations without vendor lock-in. Try it today!  
```