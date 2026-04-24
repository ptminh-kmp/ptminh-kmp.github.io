---
lang: vi
title: "LizardByte/Sunshine: Giải Pháp Phát Trực Tiếp Game Tự Lưu Trữ Tối Ưu"
description: "Khám phá LizardByte/Sunshine, máy chủ phát trực tiếp game mã nguồn mở thay thế các dịch vụ độc quyền. Tìm hiểu cách cài đặt, tính năng và lợi ích."
published: 2025-09-11
tags: ['open-source', 'self-host', 'game-streaming', 'moonlight', 'c-plus-plus', 'linux']
category: Self-hosted
author: minhpt
---

# LizardByte/Sunshine - Đánh Giá Chi Tiết

## 1. Tổng Quan & Chỉ Số GitHub
- **URL:** [https://github.com/LizardByte/Sunshine](https://github.com/LizardByte/Sunshine)
- **Sao:** 28293

## 2. Mô Tả Dự Án
LizardByte/Sunshine là một máy chủ phát trực tiếp game mã nguồn mở, tự lưu trữ được thiết kế để hoạt động liền mạch với ứng dụng khách Moonlight. Nó cho phép người dùng phát trực tiếp game từ máy tính chơi game cá nhân của họ đến bất kỳ thiết bị tương thích nào qua mạng nội bộ hoặc internet, cung cấp trải nghiệm phát trực tiếp độ trễ thấp, chất lượng cao mà không phụ thuộc vào dịch vụ đám mây của bên thứ ba.

## 3. Phần Mềm Này Thay Thế Những Gì?
Sunshine là giải pháp thay thế mạnh mẽ cho các dịch vụ phát trực tiếp game độc quyền như:
- NVIDIA GeForce Experience (GFE) và chức năng GameStream
- Steam Link (khi được sử dụng để chơi từ xa bên ngoài hệ sinh thái Steam)
- Parsec (cho các thiết lập tự lưu trữ)
- Các nền tảng game đám mây thương mại cho các trường hợp sử dụng phát trực tiếp cục bộ

## 4. Chức Năng Chính
Các tính năng chính của Sunshine bao gồm:
- **Phát trực tiếp Độ trễ Thấp:** Được tối ưu hóa cho chơi game thời gian thực với độ trễ đầu vào tối thiểu.
- **Hỗ trợ Đa nền tảng:** Hoạt động trên Windows, Linux và macOS, cả máy chủ và máy khách (qua Moonlight).
- **Mã hóa Phần cứng:** Tận dụng mã hóa GPU (NVENC, AMF, VAAPI) cho hiệu suất hiệu quả.
- **Giao diện Web:** Cấu hình dễ dàng thông qua bảng điều khiển dựa trên trình duyệt trực quan.
- **Xác thực & Bảo mật:** Hỗ trợ xác thực dựa trên mã PIN và người dùng/mật khẩu.
- **Độ phân giải & Bitrate Tùy chỉnh:** Điều chỉnh chất lượng phát trực tiếp dựa trên điều kiện mạng.
- **Hỗ trợ Nhiều Màn hình:** Phát trực tiếp các màn hình cụ thể hoặc tất cả các màn hình cùng lúc.

## 5. Ưu và Nhược Điểm
**Ưu điểm:**
- **Quyền riêng tư & Kiểm soát:** Bản chất tự lưu trữ đảm bảo dữ liệu ở lại trên phần cứng của bạn.
- **Tiết kiệm Chi phí:** Miễn phí và mã nguồn mở, tránh phí đăng ký.
- **Tùy chỉnh:** Có thể cấu hình cao để phù hợp với các thiết lập phần cứng và mạng cụ thể.
- **Cộng đồng Tích cực:** Sự hiện diện mạnh mẽ trên GitHub với các bản cập nhật và hỗ trợ thường xuyên.

**Nhược điểm:**
- **Độ phức tạp khi Thiết lập:** Yêu cầu kiến thức kỹ thuật cho cấu hình ban đầu và khắc phục sự cố.
- **Phụ thuộc vào Phần cứng:** Hiệu suất phụ thuộc vào khả năng của máy chủ và độ ổn định của mạng.
- **Không có Ứng dụng Di động Chính thức:** Phụ thuộc vào ứng dụng khách bên thứ ba như Moonlight để truy cập di động.

## 6. Hướng Dẫn Cài Đặt Chi Tiết (Tự lưu trữ)
Thực hiện theo các bước sau để cài đặt Sunshine trên máy chủ Ubuntu (22.04 LTS trở lên):

### Yêu cầu:
- Ubuntu Linux (đã thử nghiệm trên 22.04)
- Quyền sudo
- GPU được hỗ trợ (NVIDIA, AMD hoặc Intel với VAAPI)

### Bước 1: Cập nhật Hệ thống
```bash
sudo apt update && sudo apt upgrade -y
```

### Bước 2: Cài đặt Các Gói Phụ thuộc
```bash
sudo apt install -y git cmake gcc g++ libavcodec-dev libavformat-dev libavutil-dev libswscale-dev libopus-dev libssl-dev
```

### Bước 3: Cài đặt Sunshine
Sao chép kho lưu trữ và biên dịch:
```bash
git clone https://github.com/LizardByte/Sunshine.git
cd Sunshine
mkdir build && cd build
cmake ..
make -j$(nproc)
sudo make install
```

### Bước 4: Cấu hình Sunshine
Chỉnh sửa tệp cấu hình (nằm tại `~/.config/sunshine/sunshine.conf`) để thiết lập người dùng, độ phân giải và tùy chọn bitrate.

### Bước 5: Chạy Sunshine
Khởi động dịch vụ:
```bash
sunshine
```
Truy cập giao diện web tại `https://localhost:47990` để hoàn tất thiết lập.

### Bước 6 (Tùy chọn): Thiết lập như một Dịch vụ
Tạo một tệp dịch vụ systemd để tự động khởi động:
```bash
sudo nano /etc/systemd/system/sunshine.service
```
Thêm:
```
[Unit]
Description=Sunshine Game Streaming
After=network.target

[Service]
Type=simple
User=your_username
ExecStart=/usr/local/bin/sunshine
Restart=always

[Install]
WantedBy=multi-user.target
```
Sau đó kích hoạt và khởi động:
```bash
sudo systemctl enable sunshine
sudo systemctl start sunshine
```

Máy chủ Sunshine tự lưu trữ của bạn đã sẵn sàng! Sử dụng Moonlight trên thiết bị khách của bạn để kết nối và bắt đầu phát trực tiếp.