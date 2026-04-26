---
lang: vi
title: "Tạo Game Có Thể Chơi Chỉ Từ Một Câu Lệnh: OpenGame Vừa Biến Điều Đó Thành Hiện Thực"
description: "OpenGame từ CUHK MMLab là framework mã nguồn mở đầu tiên cho phép AI tạo ra những game web hoàn chỉnh, có thể chơi được từ một câu lệnh duy nhất, được hỗ trợ bởi GameCoder-27B — một code LLM được huấn luyện đặc biệt để làm chủ game engine."
published: 2026-04-26
category: AI
tags: ["AI", "Phát triển Game", "OpenGame", "CUHK", "MMLab", "LLM", "Sinh Code", "Web Games"]
author: minhpt
mermaid: false
---

LLMs có thể viết một hàm sắp xếp, refactor một component React, thậm chí tạo cả REST API từ một câu lệnh. Nhưng hãy thử yêu cầu nó xây dựng một game có thể chơi thực sự — với game loop, vật lý, quản lý state, sprite, phát hiện va chạm, và nhiều file liên kết với nhau — và nó sẽ thất bại. Lỗi không đồng bộ giữa các file, kết nối scene hỏng, logic không mạch lạc.

Đó là vấn đề OpenGame giải quyết.

## Từ Câu Lệnh Đến Game Có Thể Chơi

**OpenGame**, một dự án nghiên cứu từ CUHK MMLab (Phòng thí nghiệm Đa phương tiện tại Đại học Trung Văn Hồng Kông), là framework mã nguồn mở đầu tiên được thiết kế chuyên biệt cho việc tạo game web từ đầu đến cuối. Đưa cho nó một câu lệnh như *"một game platformer 2D nơi người chơi thu thập xu và tránh kẻ thù"*, và nó sẽ tạo ra một game HTML/JavaScript có thể chơi được — không cần engine, không cần kết nối thủ công, không cần debug.

Dự án gồm ba phần:

1. **OpenGame Framework** — pipeline agentic điều phối quá trình tạo game
2. **GameCoder-27B** — một code LLM được fine-tune đặc biệt cho phát triển game
3. **OpenGame-Bench** — pipeline đánh giá chấm điểm game dựa trên sức khỏe build, khả năng sử dụng trực quan, và độ khớp với ý đồ

## Đổi Mới Cốt Lõi: Game Skill

Trái tim của OpenGame là **Game Skill** — một khả năng có thể tái sử dụng và tự cải thiện, bao gồm hai kỹ năng con:

### Template Skill

Thay vì bắt đầu từ con số không mỗi lần, Template Skill duy trì một thư viện các project skeleton được học từ kinh nghiệm. Khi agent xây dựng một game mới, nó không phát minh lại kiến trúc — nó chọn từ các template đã được kiểm chứng và thích ứng chúng. Đây là lý do OpenGame không sụp đổ dưới độ phức tạp đa file như các cách tiếp cận LLM ngây thơ.

### Debug Skill

Đây là nơi OpenGame thực sự thông minh. Debug Skill duy trì một **giao thức sống của các bản sửa lỗi đã được kiểm chứng** — một cơ sở tri thức về cách sửa lỗi tích hợp một cách có hệ thống, thay vì vá các bug cú pháp riêng lẻ. Khi có thứ gì đó hỏng (và code game *luôn* hỏng), agent không phải đoán — nó tham khảo debug protocol, áp dụng bản sửa, kiểm tra, và cập nhật protocol cho lần sau.

## GameCoder-27B: Code LLM Hiểu Về Game

Hầu hết code LLMs được huấn luyện trên lập trình tổng quát — giải pháp LeetCode, tài liệu thư viện, snippet StackOverflow. GameCoder-27B khác biệt. Nó trải qua một pipeline ba giai đoạn chuyên biệt:

1. **Tiền huấn luyện liên tục** trên code game engine (Phaser, PixiJS, Three.js, Canvas 2D thuần)
2. **Fine-tuning có giám sát** trên các workflow phát triển game
3. **Học tăng cường dựa trên thực thi** — nơi model học từ việc code nó tạo ra có *thực sự chạy và chơi được* không

Giai đoạn thứ ba là điểm mấu chốt: kiểm tra một game khó hơn cơ bản so với kiểm tra code tĩnh. Một hàm có thể compile nhưng vẫn tạo ra một game không thể chơi. GameCoder học từ phản hồi thực thi, không chỉ từ cú pháp.

## Kết Luận

OpenGame chứng minh rằng ranh giới tiếp theo cho AI code không phải là tạo ra các hàm — mà là tạo ra các *hệ thống* hoạt động cùng nhau. Một game chỉ là một ví dụ đặc biệt khó của một hệ thống đa file, liên kết chặt chẽ. Nếu một AI agent có thể xây dựng một game có thể chơi, nó có thể xây dựng rất nhiều thứ phức tạp khác.

*Ảnh bìa: Trang dự án OpenGame (CUHK MMLab)*
