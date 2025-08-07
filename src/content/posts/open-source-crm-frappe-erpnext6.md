---
title: "Frappe/ERPNext - Giải pháp ERP mã nguồn mở hàng đầu cho doanh nghiệp"
description: "Khám phá ERPNext - nền tảng ERP mã nguồn mở miễn phí với hơn 24k stars trên GitHub. Đánh giá chi tiết tính năng, ưu nhược điểm và hướng dẫn cài đặt."
published: 2023-11-15
tags: ['open-source', 'self-host', 'erp', 'business-management', 'python']
category: Self-hosted
author: minhpt
---

# frappe/erpnext - Đánh giá chi tiết

## 1. Tổng quan & Thống kê GitHub
- **URL:** [https://github.com/frappe/erpnext](https://github.com/frappe/erpnext)
- **Stars:** 24801 (tính đến 11/2023)
- **Ngôn ngữ chính:** Python (74.2%), JavaScript (19.1%)
- **Framework:** Frappe Framework
- **License:** GNU General Public License v3.0

## 2. Mô tả dự án
ERPNext là giải pháp ERP (Enterprise Resource Planning) mã nguồn mở miễn phí, được phát triển trên nền tảng Frappe Framework. Hệ thống cung cấp đầy đủ các module quản lý doanh nghiệp từ kế toán, bán hàng, mua hàng, kho vận, sản xuất đến quản lý nhân sự và dự án.

Điểm mạnh của ERPNext:
- Giao diện hiện đại, thân thiện
- Hỗ trợ đa ngôn ngữ (bao gồm tiếng Việt)
- Tích hợp sẵn nhiều tính năng cốt lõi
- Cộng đồng hỗ trợ mạnh mẽ

## 3. Lựa chọn thay thế cho phần mềm nào?
ERPNext có thể thay thế các giải pháp ERP thương mại như:
- SAP Business One
- Microsoft Dynamics 365
- Oracle NetSuite
- Odoo (mã nguồn mở)
- Dolibarr (mã nguồn mở)

## 4. Các chức năng cốt lõi
ERPNext cung cấp hơn 50 module quản lý chính:

**Quản lý bán hàng:**
- Báo giá, đơn hàng
- Hóa đơn điện tử
- CRM tích hợp

**Quản lý mua hàng:**
- Yêu cầu mua hàng
- Đơn đặt hàng nhà cung cấp
- Hóa đơn nhập

**Kế toán:**
- Sổ cái, công nợ
- Báo cáo tài chính
- Thuế GTGT, TNDN

**Kho vận:**
- Quản lý tồn kho
- Phiếu nhập/xuất
- Theo dõi lô/seri

**Sản xuất:**
- Định mức nguyên vật liệu
- Lệnh sản xuất
- Quản lý chất lượng

## 5. Ưu và nhược điểm

### Ưu điểm:
✅ Miễn phí, mã nguồn mở  
✅ Dễ tùy chỉnh với Frappe Framework  
✅ Hỗ trợ đa ngành nghề  
✅ Cộng đồng hỗ trợ tích cực  
✅ Tích hợp sẵn nhiều tính năng  

### Nhược điểm:
⛔ Yêu cầu kiến thức kỹ thuật để tự host  
⛔ Tài liệu chưa đầy đủ ở một số module  
⛔ Hiệu năng giảm khi dữ liệu lớn  

## 6. Hướng dẫn cài đặt chi tiết (Self-host)

### Yêu cầu hệ thống:
- Ubuntu 20.04/22.04 LTS (khuyến nghị)
- 4GB RAM (tối thiểu)
- 2 CPU cores
- 40GB disk space

### Các bước cài đặt:

**1. Cập nhật hệ thống**
```bash
sudo apt update && sudo apt upgrade -y
```

**2. Cài đặt các gói phụ thuộc**
```bash
sudo apt install -y python3-dev python3-setuptools python3-pip \
python3-virtualenv git curl software-properties-common
```

**3. Cài đặt MariaDB**
```bash
sudo apt install -y mariadb-server mariadb-client
sudo mysql_secure_installation
```

**4. Cài đặt Redis**
```bash
sudo apt install -y redis-server
```

**5. Cài đặt Node.js và Yarn**
```bash
curl -sL https://deb.nodesource.com/setup_16.x | sudo -E bash -
sudo apt install -y nodejs
sudo npm install -g yarn
```

**6. Cài đặt ERPNext**
```bash
sudo -i
adduser frappe --disabled-password --gecos ""
usermod -aG sudo frappe

su - frappe
bench init frappe-bench --frappe-branch version-14
cd frappe-bench
bench new-site erp.example.com
bench get-app erpnext https://github.com/frappe/erpnext
bench --site erp.example.com install-app erpnext
```

**7. Khởi động ERPNext**
```bash
bench start
```

Sau khi cài đặt thành công, bạn có thể truy cập ERPNext tại:
`http://your-server-ip:8000`

### Lưu ý:
- Để triển khai production, nên sử dụng Nginx và Supervisor
- Có thể cài đặt thông qua Docker với lệnh:
```bash
docker run -d --name erpnext \
  -p 8000:8000 \
  -e "SITE_NAME=erp.example.com" \
  frappe/erpnext:latest
```

ERPNext là lựa chọn tuyệt vời cho doanh nghiệp vừa và nhỏ muốn triển khai hệ thống ERP mà không tốn chi phí bản quyền. Với cộng đồng phát triển mạnh mẽ, ERPNext đang ngày càng hoàn thiện và trở thành đối thủ đáng gờm của các giải pháp ERP thương mại.
