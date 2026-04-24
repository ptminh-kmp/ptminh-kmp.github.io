---
lang: vi
title: "Uptime Kuma: Giải Pháp Giám Sát Tự Lưu Trữ Tối Ưu"
description: "Khám phá Uptime Kuma, công cụ giám sát mã nguồn mở mạnh mẽ với hơn 73k sao GitHub. Tìm hiểu cách tự lưu trữ và thay thế các giải pháp thương mại."
published: 2025-08-28
tags: ['open-source', 'self-host', 'monitoring', 'docker', 'nodejs', 'uptime']
category: Self-hosted
author: minhpt
---

# louislam/uptime-kuma - Đánh Giá Chi Tiết

## 1. Tổng Quan & Chỉ Số GitHub

- **URL:** [https://github.com/louislam/uptime-kuma](https://github.com/louislam/uptime-kuma)
- **Sao:** 73635

## 2. Mô Tả Dự Án

Uptime Kuma là một công cụ giám sát thanh lịch, tự lưu trữ được thiết kế để theo dõi thời gian hoạt động và hiệu suất của các trang web, ứng dụng và dịch vụ của bạn. Với giao diện web hiện đại và bộ tính năng toàn diện, nó cung cấp giám sát thời gian thực, cảnh báo và trang trạng thái mà không cần đăng ký thương mại đắt đỏ. Được xây dựng với sự đơn giản và mạnh mẽ trong tâm trí, nó đã trở thành giải pháp hàng đầu cho các nhà phát triển và quản trị viên hệ thống muốn kiểm soát hoàn toàn cơ sở hạ tầng giám sát của họ.

## 3. Phần Mềm Này Thay Thế Những Gì?

Uptime Kuma là giải pháp thay thế hấp dẫn cho một số giải pháp giám sát phổ biến:

- **UptimeRobot** (SaaS thương mại)
- **StatusCake** (SaaS thương mại)
- **Pingdom** (SaaS thương mại)
- **Nagios** (Mã nguồn mở nhưng phức tạp)
- **Zabbix** (Giám sát doanh nghiệp)
- **Datadog Synthetics** (Tính năng thương mại)

## 4. Chức Năng Chính

Uptime Kuma cung cấp một bộ khả năng giám sát mạnh mẽ:

- **Giám sát HTTP(s):** Kiểm tra khả năng truy cập trang web với khoảng thời gian tùy chỉnh
- **Giám sát Cổng TCP:** Xác minh tính khả dụng của dịch vụ trên các cổng cụ thể
- **Giám sát Ping:** Kiểm tra tính khả dụng ở cấp độ mạng
- **Giám sát DNS:** Xác thực độ phân giải bản ghi DNS và thời gian phản hồi
- **Giám sát Push:** Nhận tín hiệu heartbeat từ các ứng dụng của bạn
- **Giám sát Đa Vùng:** Triển khai giám sát từ các vị trí địa lý khác nhau
- **Trang Trạng thái Thời gian thực:** Trang trạng thái công khai với lịch sử sự cố
- **Hỗ trợ Đa Thông báo:** Cảnh báo qua Telegram, Discord, Slack, Email, Webhook và hơn thế nữa
- **Giám sát Chứng chỉ:** Cảnh báo hết hạn chứng chỉ SSL/TLS
- **Theo dõi Thời gian Phản hồi:** Số liệu hiệu suất và dữ liệu lịch sử

## 5. Ưu và Nhược Điểm

**Ưu điểm:**
- Hoàn toàn miễn phí và mã nguồn mở
- Giao diện web hiện đại, đáp ứng
- Dễ dàng thiết lập và cấu hình
- Nhiều tùy chọn thông báo
- Nhẹ và tiết kiệm tài nguyên
- Cộng đồng tích cực và cập nhật thường xuyên
- Không phụ thuộc vào dịch vụ bên thứ ba
- Hỗ trợ nhiều giao thức giám sát

**Nhược điểm:**
- Yêu cầu cơ sở hạ tầng tự lưu trữ
- Thiếu các tính năng cấp doanh nghiệp của các lựa chọn thương mại
- Không có giám sát phân tán tích hợp (yêu cầu thiết lập thủ công)
- Lưu trữ dữ liệu lịch sử hạn chế so với dịch vụ trả phí
- Chỉ hỗ trợ cộng đồng (không có SLA chính thức)

## 6. Hướng Dẫn Cài Đặt Chi Tiết (Tự lưu trữ)

### Yêu cầu
- Máy chủ Ubuntu 20.04+
- Docker và Docker Compose đã được cài đặt
- Khuyến nghị 1GB+ RAM
- Tên miền (tùy chọn cho SSL)

### Cài đặt Từng bước

**1. Cập nhật Gói Hệ thống**
```bash
sudo apt update && sudo apt upgrade -y
```

**2. Cài đặt Docker và Docker Compose**
```bash
# Cài đặt Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# Cài đặt Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/download/v2.20.0/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose
```

**3. Tạo Tệp Docker Compose**
```bash
mkdir uptime-kuma
cd uptime-kuma
nano docker-compose.yml
```

**4. Thêm nội dung sau:**
```yaml
version: '3.8'

services:
  uptime-kuma:
    image: louislam/uptime-kuma:1
    container_name: uptime-kuma
    volumes:
      - ./data:/app/data
    ports:
      - "3001:3001"
    restart: unless-stopped
```

**5. Khởi động Uptime Kuma**
```bash
docker-compose up -d
```

**6. Truy cập Giao diện Web**
Mở trình duyệt và điều hướng đến:
```
http://your-server-ip:3001
```

**7. Thiết lập Ban đầu**
- Tạo tài khoản quản trị
- Cấu hình giám sát đầu tiên của bạn
- Thiết lập kênh thông báo
- Tùy chỉnh trang trạng thái của bạn

**8. (Tùy chọn) Reverse Proxy với Nginx**
```bash
sudo apt install nginx -y
sudo nano /etc/nginx/sites-available/uptime-kuma
```

Thêm cấu hình Nginx:
```nginx
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://localhost:3001;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

Kích hoạt site:
```bash
sudo ln -s /etc/nginx/sites-available/uptime-kuma /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

Phiên bản Uptime Kuma của bạn hiện đã sẵn sàng giám sát các dịch vụ của bạn với khả năng chuyên nghiệp!