---
lang: vi
title: "RAG từ số 0 #1: RAG là gì và vì sao LLM cần nó"
description: "Phần 1 của seri 3 bài về Retrieval-Augmented Generation: vì sao LLM bịa với thông tin riêng tư hoặc mới, và vòng lặp hai bước Retrieval + Generation giải quyết điều đó thế nào."
published: 2026-10-10
category: AI
tags: ["RAG", "LLM", "AI", "Retrieval", "AI Agents", "Tutorial"]
author: minhpt
series:
  name: "RAG from Scratch"
  order: 1
  total: 3

---

*Đây là phần 1 của seri 3 phần về Retrieval-Augmented Generation. Ta bắt đầu từ vấn đề RAG giải quyết, rồi nhìn vào bên trong LLM (phần 2), và cuối cùng là cách retrieval thực sự hoạt động (phần 3).*

## Vấn đề: LLM biết nhiều — nhưng không biết dữ liệu của bạn

RAG — **Retrieval-Augmented Generation** — là cách cải thiện hiệu năng của LLM bằng việc cấp cho nó quyền truy cập vào những thông tin mà nó không biết từ dữ liệu huấn luyện.

Ý tưởng rất trực quan. Hỏi một câu chung chung như *"tại sao giá hotel thường cao hơn vào cuối tuần?"* thì model trả lời được từ kiến thức phổ thông: mọi người đi du lịch cuối tuần, nên cạnh tranh phòng nghỉ tăng. Nhưng hỏi *"tại sao hotel ở Vancouver siêu đắt vào cuối tuần này?"* thì kiến thức phổ thông không đủ — bạn cần thông tin cụ thể, cập nhật. Hỏi *"tại sao Vancouver có nhiều hotel đóng cửa hơn thị trấn bên cạnh?"* thì còn cần nhiều ngữ cảnh hơn nữa: lịch sử địa phương, quy định, điều kiện thị trường.

LLM giống như một người đọc rất nhiều. Nó có kiến thức rộng nhờ đọc lượng lớn văn bản. Với nhiều prompt, thế là đủ. Nhưng với câu hỏi về **sự kiện mới** hay **thông tin đặc thù, riêng tư** mà nó chưa từng gặp, nó đơn giản là không có dữ kiện — và nó cũng không đáng tin cậy trong việc nói rằng mình không biết.

## Hai bước để trả lời bất kỳ câu hỏi nào

Trả lời một câu hỏi gồm hai phần. Đầu tiên bạn **thu thập** thông tin cần thiết. Sau đó bạn **diễn giải** và tạo ra câu trả lời.

Với một số câu hỏi, bạn không cần thu thập gì cả — bạn biết câu trả lời ngay. Với những câu khác, bạn cần ít hoặc rất nhiều thông tin bổ sung. Trong RAG, hai bước này có tên:

- **Retrieval** — quá trình thu thập thông tin hữu ích.
- **Generation** — quá trình diễn giải thông tin đó và phản hồi.

LLM hưởng lợi từ retrieval vì lý do cơ bản giống hệt bạn: đầu vào tốt hơn dẫn tới câu trả lời tốt hơn.

## Vì sao model "bịa"

Trong quá trình huấn luyện, LLM thấy lượng lớn văn bản và học các mẫu trong đó. Khi bạn prompt nó, bạn đang hy vọng thông tin mình cần đã xuất hiện trong dữ liệu training đó. Thường thì đúng như vậy. Nhưng khi được hỏi về dữ liệu nội bộ của công ty bạn hay tin tức hôm nay, thông tin đó gần như chắc chắn không có trong training — nên model không ở vị trí tốt để trả lời.

Trong những trường hợp đó, nó sẽ đôi khi đưa ra câu trả lời *nghe có vẻ đúng* nhưng thực chất sai. Ta gọi đó là **ảo giác (hallucination)**. Điểm mấu chốt: model không bị trục trặc hay "nói dối" — nó được thiết kế để tạo ra văn bản **có khả năng xảy ra cao**, không phải văn bản **trung thực**. Với LLM, "sự thật" chỉ đơn giản là một chuỗi từ có xác suất cao dựa trên dữ liệu huấn luyện. Với dữ liệu huấn luyện chất lượng cao, cách hiểu này khớp với thực tế; thách thức nằm ở việc đảm bảo model có quyền truy cập càng nhiều thông tin liên quan càng tốt.

## Ý tưởng cốt lõi của RAG

Cách sửa đơn giản nhất gần như ngây thơ vì quá đơn giản: **chỉ cần đưa thông tin hữu ích vào prompt.**

Ý tưởng chính của RAG là bạn có thể *tăng cường* prompt trước khi gửi đến LLM. Bên cạnh câu hỏi gốc của người dùng, bạn thêm thông tin giúp LLM trả lời. Hỏi một hệ thống RAG *"tại sao hotel ở Vancouver siêu đắt cuối tuần này?"* — nó chạy bước **retrieval** để thu thập thông tin liên quan, rồi dựng một **prompt tăng cường** chứa cả câu hỏi gốc lẫn thông tin đã truy xuất.

Tất nhiên, thông tin đó phải được truy xuất từ đâu đó. Thành phần làm việc này gọi là **Retriever**.

## RAG xuất hiện ở đâu

Khi đã có retriever + generator, cùng một mô thức áp dụng được gần như khắp nơi:

- **Sinh code** — model đã thấy rất nhiều code, nhưng sinh code chính xác cho *dự án cụ thể* của bạn cần ngữ cảnh riêng của dự án.
- **Chatbot công ty** — trả lời câu hỏi nội bộ từ tài liệu nội bộ.
- **Kiến thức chuyên ngành** — bất kỳ lĩnh vực nào mà model chưa từng được huấn luyện tử tế.
- **Công cụ tìm kiếm** — truy xuất các tài liệu liên quan nhất với truy vấn.
- **RAG cá nhân hoá** — ghi chú, file, sở thích của chính bạn làm knowledge base.

Quy tắc chung: bất cứ khi nào bạn có quyền truy cập vào thông tin có thể chưa từng nằm trong dữ liệu huấn luyện của model, bạn đã có ứng viên cho một ứng dụng RAG hữu ích.

## Kiến trúc, trong một hơi thở

Với người dùng, hệ thống RAG trông giống hệt một LLM bình thường: nhập prompt, nhận câu trả lời. Bên trong có thêm vài bước:

1. Prompt đi tới **Retriever**.
2. Retriever truy vấn một **knowledge base** — kho tài liệu hữu ích — và trả về phần tài liệu liên quan nhất.
3. Hệ thống dựng **prompt tăng cường**: câu hỏi gốc cộng với tài liệu đã truy xuất.
4. **LLM** nhận prompt tăng cường và phản hồi, dựa trên cả kiến thức huấn luyện lẫn thông tin vừa truy xuất.

Trải nghiệm người dùng không đổi — chỉ thêm một chút delay. Đổi lại, câu trả lời có khả năng chính xác, cập nhật và phù hợp ngữ cảnh cao hơn nhiều.

## Vì sao đáng làm

Thêm ngữ cảnh đã truy xuất trông như thay đổi nhỏ, nhưng mang lại nhiều thứ:

- Cấp cho model thông tin mà nếu không nó **không thể có** — chính sách công ty, một dữ kiện cá nhân, tin tức sáng nay.
- **Giảm ảo giác**, vì thông tin liên quan trong prompt định hướng phản hồi và hạn chế output chung chung hoặc gây hiểu nhầm.
- **Cập nhật kiến thức dễ dàng** — không cần huấn luyện lại; chỉ cần cập nhật knowledge base và đánh index lại.
- Cải thiện **trích dẫn nguồn** — hệ thống RAG có thể đính kèm nguồn vào prompt tăng cường, và model có thể đưa chúng vào câu trả lời.
- Cho mỗi thành phần **làm việc nó giỏi nhất**: retriever lọc lượng thông tin khổng lồ xuống phần liên quan nhất, còn LLM tập trung viết phản hồi tốt.

Đó là lời chào hàng. Nhưng để hiểu *vì sao* nó hiệu quả — và nó vỡ ở đâu — bạn cần hiểu LLM thực chất làm gì. Đó là phần 2.
