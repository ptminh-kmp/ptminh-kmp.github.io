---
lang: vi
title: "RAG từ số 0 #3: Information Retrieval"
description: "Phần cuối của seri RAG: retriever hoạt động thế nào — knowledge base, index, xếp hạng theo độ tương đồng, đánh đổi recall/precision, và vì sao vector database quan trọng ở quy mô lớn."
published: 2026-10-10
category: AI
tags: ["RAG", "LLM", "AI", "Retrieval", "Vector Database", "Tutorial"]
author: minhpt
series:
  name: "RAG from Scratch"
  order: 3
  total: 3

---

*Phần cuối của seri 3 phần về Retrieval-Augmented Generation. Phần 1 nói RAG là gì; phần 2 nhìn vào bên trong LLM. Giờ đến thành phần làm việc thật sự: retriever.*

## Nhiệm vụ của retriever

Đến đây, mục đích của retriever hẳn đã rõ: nó cần cung cấp cho LLM những thông tin hữu ích mà có thể đã không có sẵn khi model được huấn luyện. Câu hỏi là nó làm điều đó thực tế thế nào.

Bắt đầu bằng một ví dụ tương tự. Hãy tưởng tượng bạn đến thư viện để trả lời câu hỏi *"làm sao làm bánh pizza kiểu New York tại nhà?"* Thư viện có bộ sưu tập sách khổng lồ về mọi chủ đề. Để giúp bạn định hướng, sách được sắp xếp thành các phần và kệ theo chủ đề, thể loại, tác giả, v.v.

Nếu bạn chia sẻ câu hỏi với thủ thư, họ có thể giúp bạn tìm các phần — hoặc thậm chí những cuốn sách cụ thể — khớp nhất. Họ hiểu *ý nghĩa* câu hỏi của bạn và dùng nó để quyết định nên tìm ở kệ nào, rồi cuối cùng tìm ra các cuốn liên quan.

Retriever có những thành phần tương tự. Nơi thư viện có bộ sưu tập sách, retriever có một **knowledge base** gồm các tài liệu. Và giống như thư viện được tổ chức, retriever xây một **index** cho các tài liệu trong knowledge base — một cấu trúc sắp xếp tài liệu và giúp chúng có thể tìm kiếm được.

## Retrieval, từng bước

Bước tiếp theo là thực sự truy xuất thông tin liên quan. Trong thư viện, bạn hỏi thủ thư trực tiếp. Họ hiểu ý nghĩa câu hỏi bạn và biết nên tìm ở khu nấu ăn, ẩm thực Ý, hay New York. Khả năng hiểu ý nghĩa đó là thứ giúp họ nhắm đúng kệ sách.

Retriever cũng làm điều tương tự:

1. **Hiểu truy vấn.** Nó xử lý câu hỏi để nắm ý nghĩa tiềm ẩn.
2. **Tìm trong index.** Nó dùng sự hiểu biết đó để tìm trong index tài liệu.
3. **Trả về kết quả khớp.** Nó trả về những tài liệu trong knowledge base mà nó xác định là liên quan nhất.

Khi tìm xong, retriever **xếp hạng** các tài liệu theo độ liên quan. Mỗi tài liệu nhận một điểm số định lượng mức độ liên quan — thường là một thước đo **độ tương đồng** giữa văn bản câu hỏi và văn bản tài liệu. Các tài liệu điểm cao nhất là những tài liệu được trả về.

Có nhiều cách tính điểm tương đồng, và đó là phần lớn nội dung khi bạn đi sâu vào RAG.

## Đánh đổi: trả về bao nhiêu

Một retriever được thiết kế tốt phải trả về tài liệu liên quan — nhưng cũng phải *loại bỏ tài liệu không liên quan*.

Hỏi về pizza New York tại nhà và tưởng tượng retriever trả về *mọi tài liệu trong knowledge base*. Về mặt kỹ thuật, bạn có mọi tài liệu liên quan — nhưng chúng bị chôn trong một núi thông tin không liên quan. Như đã thấy ở phần 2, điều đó cũng làm prompt đắt hơn và có thể dùng hết context window của model.

Ngược lại, nếu chỉ trả về đúng một tài liệu xếp hạng cao nhất, bạn có thể bỏ lỡ thông tin liên quan giá trị đang nằm ở hạng 2, 3, hoặc 4.

Trong thế giới lý tưởng, retriever sẽ xếp hạng hoàn hảo và chọn đúng số lượng cần trả về. Thực tế, retriever đôi khi xếp tài liệu liên quan quá thấp và tài liệu không liên quan quá cao, khiến việc quyết định *bao nhiêu* tài liệu cần trả về trở nên khó thật sự.

Kết luận: tối ưu retriever nghĩa là theo dõi nó theo thời gian và thử nghiệm với các thiết lập khác nhau — đúng kiểu công việc lặp đi lặp lại xuất hiện xuyên suốt quá trình phát triển RAG.

## Đây không phải chuyện mới — chỉ là mới với LLM

Đáng chú ý: rất nhiều phần mềm quen thuộc làm những việc rất giống retriever. Một **công cụ tìm kiếm web** truy xuất các trang web liên quan tới truy vấn. Một **cơ sở dữ liệu quan hệ** truy xuất các hàng và bảng khớp với truy vấn SQL.

Lĩnh vực **information retrieval** đã trưởng thành từ lâu trước khi LLM ra đời. Nhưng các ý tưởng của nó là nền tảng cho cách thiết kế retriever và hệ thống RAG ngày nay — phần LLM là mới; phần retrieval là bài toán đã được giải quyết nhiều.

Về lý thuyết có nhiều cách triển khai retriever. Vì hầu hết công ty đã giữ dữ liệu trong cơ sở dữ liệu quan hệ truyền thống, sẽ rất tiện nếu giữ dữ liệu ở đó và truy xuất từ đó để cấp năng lượng cho hệ thống RAG. Nhưng **ở quy mô lớn, hầu hết retriever được xây trên vector database** — một loại cơ sở dữ liệu chuyên dụng, tối ưu để nhanh chóng tìm ra những tài liệu trong knowledge base khớp nhất với một yêu cầu tìm kiếm.

*Vì sao* vector database hoạt động — embedding, vector, và tìm kiếm tương đồng — là chủ đề tiếp theo tự nhiên, và là nơi hầu hết lộ trình học RAG đi tiếp.

## Tổng kết seri

Ba phần, một ý tưởng. RAG là cách cấp cho LLM thông tin mà nó không có:

- **Phần 1** — LLM không thể biết dữ liệu riêng tư hay mới của bạn, và nó sẽ tự tin bịa ra. RAG tăng cường prompt bằng ngữ cảnh đã truy xuất để sửa điều đó.
- **Phần 2** — LLM dự đoán token tiếp theo, từng cái một, theo kiểu tự hồi quy. Thiết kế đó khiến ảo giác là tự nhiên và biến context window thành ràng buộc cứng — nên retrieval buộc phải chọn lọc.
- **Phần 3** — retriever hiểu truy vấn, tìm trong index trên một knowledge base, xếp hạng tài liệu theo độ tương đồng, và trả về vài tài liệu tốt nhất. Chọn đúng *bao nhiêu* và *những cái nào* là cả một nghề.

Từ đây, các bước tiếp theo tự nhiên là embedding và vector search, chiến lược chunking, re-ranking, và đánh giá chất lượng retrieval. Nhưng bạn đã có mô hình tư duy mà mọi thứ khác đều treo lên đó.

*Đây là bài cuối của seri "RAG từ số 0".*
