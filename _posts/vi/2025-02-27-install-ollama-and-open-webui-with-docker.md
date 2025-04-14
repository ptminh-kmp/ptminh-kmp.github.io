---
title: Thiết lập Open WebUI với Ollama & Docker Desktop
description: >-
  Tìm hiểu cách thiết lập Open WebUI với Ollama và Docker Desktop để tương tác với mô hình AI cục bộ. Hướng dẫn từng bước này hoàn hảo cho các nhà phát triển AI và blogger.
author: minhpt
date: 2025-02-27 00:00:00 +0700
categories: [Self-hosted, Blogging, AI]
tags: [tutorial, self-hosted, AI, docker, ollama, open webui]
---

Bài đăng blog này sẽ hướng dẫn bạn cách thiết lập **Open WebUI**, một giao diện thân thiện với người dùng, cùng với **Ollama**, một framework nhẹ và có thể mở rộng để chạy các mô hình ngôn ngữ lớn, tất cả được đóng gói (containerized) bằng **Docker Desktop**. Thiết lập này hoàn hảo cho các nhà phát triển AI và blogger muốn thử nghiệm và giới thiệu các mô hình AI cục bộ, mang lại quy trình làm việc hợp lý và hiệu quả.

### Tại sao lại chọn Stack này?

  * **Open WebUI**: Cung cấp giao diện web đẹp mắt và trực quan để tương tác với các mô hình ngôn ngữ. Hãy quên giao diện dòng lệnh đi – Open WebUI mang đến trải nghiệm trực quan và thân thiện với người dùng, lý tưởng cho việc demo và tạo nội dung.
  * **Ollama**: Đơn giản hóa quá trình chạy và quản lý các mô hình ngôn ngữ lớn trên máy cục bộ của bạn. Nó xử lý sự phức tạp của việc phục vụ mô hình, cho phép bạn tập trung vào việc sử dụng các mô hình.
  * **Docker Desktop**: Container hóa ở mức tốt nhất. Docker đảm bảo môi trường của bạn nhất quán, biệt lập và dễ dàng sao chép. Nó loại bỏ xung đột dependency và đơn giản hóa việc triển khai, giúp việc thiết lập trở nên dễ dàng trên các hệ điều hành khác nhau.

Cùng với nhau, những công cụ này tạo ra một nền tảng mạnh mẽ và thân thiện với người dùng để khám phá AI và tạo nội dung.

### Điều kiện tiên quyết

Trước khi bắt đầu, hãy đảm bảo bạn đã cài đặt những thứ sau:

1.  **Docker Desktop**: Tải xuống và cài đặt [Docker Desktop](https://www.google.com/url?sa=E&source=gmail&q=https://www.docker.com/products/docker-desktop/). Làm theo hướng dẫn cài đặt cho hệ điều hành của bạn (Windows, macOS hoặc Linux).
2.  **Ollama**: Tải xuống và cài đặt [Ollama](https://www.google.com/url?sa=E&source=gmail&q=https://ollama.com/). Ollama cung cấp trình cài đặt cho macOS và Linux. Đối với người dùng Windows, Ollama hoạt động liền mạch trong WSL 2 (Windows Subsystem for Linux).

### Hướng dẫn Thiết lập Từng bước

Hãy cùng thiết lập mọi thứ! Làm theo các bước đơn giản sau:

**Bước 1: Xác minh Cài đặt Docker Desktop**

  * Mở terminal hoặc command prompt của bạn và chạy: `docker --version`.
  * Bạn sẽ thấy thông tin phiên bản Docker nếu cài đặt thành công.
  * Đảm bảo Docker Desktop đang chạy nền.

**Bước 2: Chạy Ollama trong Docker**

Mặc dù Ollama được cài đặt cục bộ, nhưng trong thiết lập này, chúng ta sẽ tận dụng Docker để chạy nó. Điều này giữ cho môi trường của chúng ta sạch sẽ và nhất quán.

  * Trong terminal của bạn, tải image Docker Ollama:

    ```bash
    docker pull ollama/ollama
    ```

  * Sau khi image được tải xuống, chạy Ollama:

    ```bash
    docker run -d -p 11434:11434 --name ollama ollama/ollama
    ```

      * `-d`: Chạy container ở chế độ detached (chạy nền).
      * `-p 11434:11434`: Ánh xạ cổng 11434 trên máy host của bạn đến cổng 11434 trong container (cổng mặc định của Ollama).
      * `--name ollama`: Gán tên "ollama" cho container để dễ quản lý.
      * `ollama/ollama`: Chỉ định image Docker để sử dụng.

**Bước 3: Triển khai Open WebUI với Docker Compose**

Docker Compose đơn giản hóa việc triển khai các ứng dụng Docker đa container. Chúng ta sẽ sử dụng nó để triển khai Open WebUI.

  * Tạo một thư mục cho dự án của bạn (ví dụ: `open-webui-ollama`) và điều hướng vào đó:

    ```bash
    mkdir open-webui-ollama
    cd open-webui-ollama
    ```

  * Tạo một tệp có tên `docker-compose.yml` bên trong thư mục này và dán nội dung sau:

    ```yaml
    version: '3'
    services:
      open-webui:
        image: ghcr.io/open-webui/open-webui:main
        container_name: open-webui
        depends_on:
          - ollama
        ports:
          - 3000:8080
        environment:
          - 'OLLAMA_BASE_URL=http://ollama:11434' # Required
          # Optional settings below
          - 'WEBUI_SECRET_KEY=' 
          - 'OPENAI_API_KEY=' 
        volumes:
          - open-webui:/app/backend/data
        extra_hosts:
          - host.docker.internal:host-gateway
    
      ollama:
        image: ollama/ollama
        container_name: ollama
        volumes:
          - ollama:/root/.ollama
        ports:
          - 11434:11434
        deploy:
          resources:
            reservations:
              devices:
                - driver: nvidia
                  count: all
                  capabilities: [gpu]
    
    volumes:
      open-webui: {}
      ollama: {}

    ```

      * Tệp `docker-compose.yml` này định nghĩa hai dịch vụ: `open-webui` và `ollama`:
          * `open-webui`: Định nghĩa dịch vụ Open WebUI.
              * `image`: Chỉ định image Docker cho Open WebUI.
              * `ports`: Ánh xạ cổng 3000 trên máy host của bạn đến cổng 8080 trong container (cổng của Open WebUI). Bạn sẽ truy cập Open WebUI qua `http://localhost:3000`.
              * `environment`: Đặt biến môi trường `OLLAMA_BASE_URL` để trỏ Open WebUI đến container Ollama của chúng ta. Chúng ta sử dụng `http://ollama:11434` vì Docker Compose tạo một mạng nơi các container có thể phân giải lẫn nhau bằng tên.
              * `volumes`: Gắn một Docker volume có tên `open-webui` để lưu trữ dữ liệu của Open WebUI.
              * `depends_on`: Đảm bảo container `ollama` khởi động trước `open-webui`.
          * `ollama`: Định nghĩa dịch vụ Ollama (giống như lệnh `docker run` trước đó nhưng được quản lý bởi Compose).
              * `volumes`: Gắn volume để lưu trữ các mô hình Ollama.
              * `ports`: Ánh xạ cổng Ollama.
              * `deploy`: (Tùy chọn) Cấu hình tài nguyên, ví dụ như sử dụng GPU nếu có.

  * Khởi động Open WebUI và Ollama bằng Docker Compose:

    ```bash
    docker compose up -d
    ```

      * `docker compose up`: Tạo và khởi động các dịch vụ được định nghĩa trong `docker-compose.yml`.
      * `-d`: Chạy các dịch vụ ở chế độ detached (chạy nền).

**Bước 4: Truy cập Open WebUI trong Trình duyệt của bạn**

  * Mở trình duyệt web của bạn và điều hướng đến `http://localhost:3000`.
  * Bạn sẽ thấy giao diện Open WebUI. Lần đầu tiên, bạn sẽ cần tạo một tài khoản quản trị.

**Bước 5: Kết nối với Ollama**

  * Open WebUI được cấu hình để kết nối với Ollama đang chạy tại `http://ollama:11434`. Vì chúng được khởi chạy cùng nhau bởi Docker Compose và `open-webui` phụ thuộc vào `ollama`, chúng sẽ tự động kết nối.

**Bước 6: Bắt đầu Trò chuyện!**

  * Khám phá giao diện Open WebUI. Giờ đây, bạn có thể chọn và tải xuống các mô hình trực tiếp trong giao diện người dùng (được cung cấp bởi Ollama).
  * Bắt đầu trò chuyện với các mô hình AI bạn đã chọn!

### Kết luận

Xin chúc mừng! Bạn đã thiết lập thành công Open WebUI với Ollama và Docker Desktop. Giờ đây, bạn có một môi trường AI cục bộ mạnh mẽ để thử nghiệm các mô hình ngôn ngữ, tạo nội dung blog và khám phá thế giới AI thú vị.
