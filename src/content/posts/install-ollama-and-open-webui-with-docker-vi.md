---
lang: vi
title: Thiết lập Open WebUI với Ollama & Docker Desktop
description: >-
  Học cách thiết lập Open WebUI với Ollama và Docker Desktop để tương tác với mô hình AI cục bộ. Hướng dẫn từng bước này hoàn hảo cho nhà phát triển AI và blogger.
author: minhpt
published: 2025-02-03
category: Self-hosted
tags: [tutorial, self-hosted, AI, docker, ollama, open webui]
---

Bài đăng blog này sẽ hướng dẫn bạn thiết lập **Open WebUI**, một giao diện thân thiện với người dùng, với **Ollama**, một framework nhẹ và có thể mở rộng để chạy các mô hình ngôn ngữ lớn, tất cả được container hóa với **Docker Desktop**. Thiết lập này hoàn hảo cho các nhà phát triển AI và blogger muốn thử nghiệm và trình diễn các mô hình AI cục bộ, mang lại quy trình làm việc hợp lý và hiệu quả.

### Tại Sao Stack Này?

* **Open WebUI**: Cung cấp giao diện web đẹp mắt và trực quan để tương tác với các mô hình ngôn ngữ. Quên giao diện dòng lệnh đi – Open WebUI mang đến trải nghiệm trực quan và thân thiện, lý tưởng cho demo và sáng tạo nội dung.
* **Ollama**: Đơn giản hóa quy trình chạy và quản lý các mô hình ngôn ngữ lớn trên máy cục bộ của bạn. Nó xử lý sự phức tạp của việc phục vụ mô hình, giúp bạn tập trung vào việc sử dụng các mô hình.
* **Docker Desktop**: Container hóa ở dạng tốt nhất. Docker đảm bảo môi trường của bạn nhất quán, cách ly và dễ tái tạo. Nó loại bỏ xung đột phụ thuộc và đơn giản hóa việc triển khai, giúp việc thiết lập trở nên dễ dàng trên các hệ điều hành khác nhau.

Cùng nhau, những công cụ này tạo ra một nền tảng mạnh mẽ và thân thiện cho việc khám phá AI và tạo nội dung.

### Yêu Cầu

Trước khi bắt đầu, hãy đảm bảo bạn đã cài đặt những thứ sau:

1. **Docker Desktop**: Tải xuống và cài đặt [Docker Desktop](https://www.google.com/url?sa=E&source=gmail&q=https://www.docker.com/products/docker-desktop/). Làm theo hướng dẫn cài đặt cho hệ điều hành của bạn (Windows, macOS hoặc Linux).
2. **Ollama**: Tải xuống và cài đặt [Ollama](https://www.google.com/url?sa=E&source=gmail&q=https://ollama.com/). Ollama cung cấp trình cài đặt cho macOS và Linux. Đối với người dùng Windows, Ollama hoạt động liền mạch trong WSL 2 (Windows Subsystem for Linux).

### Hướng Dẫn Thiết Lập Từng Bước

Hãy cùng thiết lập mọi thứ! Làm theo các bước đơn giản sau:

**Bước 1: Xác Minh Cài đặt Docker Desktop**

* Mở terminal hoặc command prompt và chạy: `docker --version`.
* Bạn sẽ thấy thông tin phiên bản Docker nếu cài đặt thành công.
* Đảm bảo Docker Desktop đang chạy trong nền.

**Bước 2: Chạy Ollama trong Docker**

Mặc dù Ollama được cài đặt cục bộ, trong thiết lập này, chúng ta sẽ tận dụng Docker để chạy nó. Điều này giữ cho môi trường của chúng ta sạch sẽ và nhất quán.

* Trong terminal của bạn, kéo image Docker Ollama:

    ```bash
    docker pull ollama/ollama
    ```

* Sau khi image được kéo, chạy Ollama:

    ```bash
    docker run -d -p 11434:11434 --name ollama ollama/ollama
    ```

  * `-d`: Chạy container ở chế độ tách rời (nền).
  * `-p 11434:11434`: Ánh xạ cổng 11434 trên máy chủ của bạn đến cổng 11434 trong container (cổng mặc định của Ollama).
  * `--name ollama`: Gán tên "ollama" cho container để quản lý dễ dàng.
  * `ollama/ollama`: Chỉ định image Docker để sử dụng.

**Bước 3: Triển Khai Open WebUI với Docker Compose**

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
    ports:
      - 3000:8080
    environment:
    OLLAMA_API_BASE_URL: http://ollama:11434/v1
    volumes:
      - open-webui:/app/data

    volumes:
    open-webui:
    driver: local
    ```

  * Tệp `docker-compose.yml` này định nghĩa một dịch vụ (mặc dù chúng ta chỉ định nghĩa rõ ràng một, `open-webui`, và ngầm dựa vào container `ollama` chúng ta đã khởi động ở bước trước):
    * `open-webui`: Định nghĩa dịch vụ Open WebUI.
      * `image`: Chỉ định image Docker cho Open WebUI.
      * `ports`: Ánh xạ cổng 3000 trên máy chủ đến cổng 8080 trong container (cổng của Open WebUI). Bạn sẽ truy cập Open WebUI qua `http://localhost:3000`.
      * `environment`: Đặt biến môi trường `OLLAMA_API_BASE_URL` để trỏ Open WebUI đến container Ollama của chúng ta. **Lưu ý:** Chúng ta sử dụng `http://ollama:11434/v1` vì Docker Compose, trong các thiết lập phức tạp hơn, có thể tạo một mạng nơi các container có thể phân giải lẫn nhau bằng tên. Trong trường hợp đơn giản của chúng ta, vì chúng ta chạy Ollama riêng biệt, điều này có thể không phân giải trực tiếp. Tuy nhiên, để mở rộng trong tương lai và các thiết lập Docker phức tạp hơn, đây là thực hành tốt. Đối với thiết lập đơn giản này, `http://localhost:11434/v1` cũng sẽ hoạt động nếu bạn gặp sự cố.
      * `volumes`: Gắn một volume Docker có tên `open-webui` để lưu trữ dữ liệu Open WebUI.

* Khởi động Open WebUI bằng Docker Compose:

    ```bash
    docker-compose up -d
    ```

  * `docker-compose up`: Tạo và khởi động các dịch vụ được định nghĩa trong `docker-compose.yml`.
  * `-d`: Chạy các dịch vụ ở chế độ tách rời (nền).

**Bước 4: Truy Cập Open WebUI trong Trình Duyệt**

* Mở trình duyệt web của bạn và điều hướng đến `http://localhost:3000`.
* Bạn sẽ thấy giao diện Open WebUI.

**Bước 5: Kết Nối với Ollama**

* Theo mặc định, Open WebUI được cấu hình để kết nối với Ollama chạy tại `http://ollama:11434/v1`. Nếu bạn sử dụng `docker-compose.yml` như đã cung cấp và chạy container `ollama` như hướng dẫn, nó sẽ tự động kết nối.
* Nếu bạn gặp sự cố, hoặc nếu bạn đang chạy Ollama cục bộ (không trong Docker), bạn có thể cần điều chỉnh `OLLAMA_API_BASE_URL`. Bạn thường có thể cấu hình điều này trong giao diện cài đặt Open WebUI nếu cần.

**Bước 6: Bắt Đầu Trò Chuyện!**

* Khám phá giao diện Open WebUI. Bạn có thể chọn và tải xuống các mô hình trực tiếp trong UI (được hỗ trợ bởi Ollama).
* Bắt đầu trò chuyện với các mô hình AI bạn đã chọn!

### Kết Luận

Chúc mừng! Bạn đã thiết lập thành công Open WebUI với Ollama và Docker Desktop. Bạn hiện có một môi trường AI cục bộ mạnh mẽ để thử nghiệm với các mô hình ngôn ngữ, tạo nội dung blog và khám phá thế giới AI thú vị.