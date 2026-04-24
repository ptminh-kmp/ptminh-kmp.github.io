---
lang: vi
title: "Anderspitman/awesome-tunneling: Tài Nguyên Đường Hầm Tự Lưu Trữ Tối Ưu"
description: "Khám phá anderspitman/awesome-tunneling, danh sách tuyển chọn các giải pháp thay thế ngrok và Cloudflare Tunnel cho các giải pháp đường hầm an toàn, tự lưu trữ."
published: 2025-09-20
tags: ['open-source', 'self-host', 'tunneling', 'networking', 'devops']
category: Self-hosted
author: minhpt
---

# anderspitman/awesome-tunneling - Đánh Giá Chi Tiết

## 1. Tổng Quan & Chỉ Số GitHub
- **URL:** [https://github.com/anderspitman/awesome-tunneling](https://github.com/anderspitman/awesome-tunneling)
- **Sao:** 18613

## 2. Mô Tả Dự Án
Anderspitman/awesome-tunneling là một danh sách được tuyển chọn tỉ mỉ về các phần mềm và dịch vụ đường hầm, tập trung vào các giải pháp thay thế tự lưu trữ cho các giải pháp thương mại phổ biến như ngrok và Cloudflare Tunnel. Nó phục vụ như một tài nguyên toàn diện cho các nhà phát triển, quản trị viên hệ thống và chuyên gia DevOps đang tìm kiếm thiết lập các đường hầm mạng riêng tư, an toàn mà không phụ thuộc vào dịch vụ bên thứ ba. Kho lưu trữ phân loại các công cụ dựa trên tính năng, giao thức và mức độ dễ sử dụng, khiến nó trở thành tài liệu tham khảo vô giá cho bất kỳ ai tham gia vào mạng, truy cập từ xa hoặc hiển thị dịch vụ.

## 3. Phần Mềm Này Thay Thế Những Gì?
Dự án này cung cấp các giải pháp thay thế cho một số dịch vụ đường hầm và reverse proxy được sử dụng rộng rãi, bao gồm:
- **ngrok**
- **Cloudflare Tunnel**
- **PageKite**
- **LocalTunnel**
- **Serveo**
- **Teleconsole**
- **Beeceptor** (cho giả lập HTTP)
- Nhiều giải pháp đường hầm độc quyền hoặc SaaS khác.

## 4. Chức Năng Chính
Bản thân kho lưu trữ awesome-tunneling không phải là một ứng dụng phần mềm mà là một danh sách phân loại các công cụ. Các tính năng chính của phần mềm được liệt kê thường bao gồm:
- Đường hầm TCP/UDP/HTTP an toàn.
- Hỗ trợ tự lưu trữ để duy trì quyền riêng tư dữ liệu.
- Khả năng reverse proxy.
- Kết thúc SSL/TLS.
- DNS động và quản lý tên miền phụ.
- Tương thích đa nền tảng (Linux, Windows, macOS).
- Tích hợp với Docker, Kubernetes và các công cụ điều phối khác.
- Cơ chế xác thực và kiểm soát truy cập.

## 5. Ưu và Nhược Điểm
**Ưu điểm:**
- Danh sách công cụ toàn diện và được tổ chức tốt.
- Tập trung vào các giải pháp mã nguồn mở và tự lưu trữ giúp tăng cường quyền riêng tư và kiểm soát.
- Được cập nhật thường xuyên với các dự án mới và cải tiến.
- Bao gồm so sánh, giúp dễ dàng chọn công cụ phù hợp.
- Được cộng đồng thúc đẩy, với sự đóng góp từ các chuyên gia trong lĩnh vực.

**Nhược điểm:**
- Là một danh sách chứ không phải một công cụ duy nhất, người dùng phải đánh giá và triển khai từng giải pháp riêng lẻ.
- Một số dự án được liệt kê có thể có đường cong học tập dốc hoặc tài liệu hạn chế.
- Yêu cầu tự bảo trì phần mềm đường hầm đã chọn, bao gồm cập nhật và bản vá bảo mật.

## 6. Hướng Dẫn Cài Đặt Chi Tiết (Tự lưu trữ)
Vì anderspitman/awesome-tunneling là một danh sách các công cụ, đây là hướng dẫn chung để tự lưu trữ một phần mềm đường hầm phổ biến từ danh sách, chẳng hạn như **frp** (Fast Reverse Proxy), trên máy chủ Ubuntu:

### Yêu cầu:
- Máy chủ Ubuntu 22.04 LTS.
- Quyền sudo.
- Kiến thức cơ bản về dòng lệnh Linux.

### Bước 1: Cập nhật Hệ thống
```bash
sudo apt update && sudo apt upgrade -y
```

### Bước 2: Tải frp
Truy cập [trang phát hành frp trên GitHub](https://github.com/fatedier/frp/releases) để tìm phiên bản mới nhất. Ví dụ, để tải v0.52.3 cho AMD64:
```bash
wget https://github.com/fatedier/frp/releases/download/v0.52.3/frp_0.52.3_linux_amd64.tar.gz
tar -xzf frp_0.52.3_linux_amd64.tar.gz
cd frp_0.52.3_linux_amd64
```

### Bước 3: Cấu hình Máy chủ frp
Chỉnh sửa tệp cấu hình máy chủ (`frps.ini`):
```bash
nano frps.ini
```
Ví dụ cấu hình:
```ini
[common]
bind_port = 7000
dashboard_port = 7500
dashboard_user = admin
dashboard_pwd = your_secure_password
token = your_secret_token
```

### Bước 4: Chạy Máy chủ frp
Khởi động máy chủ frp:
```bash
./frps -c frps.ini
```
Để chạy như một dịch vụ, tạo một tệp dịch vụ systemd:
```bash
sudo nano /etc/systemd/system/frps.service
```
Thêm:
```ini
[Unit]
Description=Frp Server Service
After=network.target

[Service]
Type=simple
User=nobody
Restart=on-failure
RestartSec=5s
ExecStart=/path/to/frps -c /path/to/frps.ini

[Install]
WantedBy=multi-user.target
```
Sau đó kích hoạt và khởi động dịch vụ:
```bash
sudo systemctl enable frps
sudo systemctl start frps
```

### Bước 5: Cấu hình Tường lửa
Cho phép các cổng cần thiết (ví dụ: 7000, 7500):
```bash
sudo ufw allow 7000/tcp
sudo ufw allow 7500/tcp
sudo ufw reload
```

### Bước 6: Truy cập Bảng Điều khiển
Mở trình duyệt và điều hướng đến `http://your_server_ip:7500`, sử dụng thông tin đăng nhập đã đặt trong `frps.ini`.

Thiết lập này cung cấp một giải pháp đường hầm tự lưu trữ tương tự như ngrok, cho phép bạn hiển thị các dịch vụ cục bộ một cách an toàn. Đối với các công cụ khác được liệt kê trong awesome-tunneling, hãy tham khảo tài liệu tương ứng của chúng để biết hướng dẫn cài đặt và cấu hình.