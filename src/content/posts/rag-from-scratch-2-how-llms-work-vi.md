---
lang: vi
title: "RAG từ số 0 #2: LLM hoạt động thế nào (và vì sao nó bịa)"
description: "Phần 2 của seri RAG: dự đoán token tiếp theo, token, tự hồi quy, huấn luyện trên hàng nghìn tỷ từ — và vì sao thiết kế đó khiến ảo giác là không thể tránh nếu thiếu retrieval."
published: 2026-10-10
category: AI
tags: ["RAG", "LLM", "AI", "Retrieval", "Tutorial"]
author: minhpt
series:
  name: "RAG from Scratch"
  order: 2
  total: 3

---

*Phần 2 của seri 3 phần về Retrieval-Augmented Generation. Phần 1 nói RAG là gì; ở đây ta nhìn vào bên trong LLM để hiểu vì sao retrieval giúp ích — và vì sao ảo giác nằm sẵn trong thiết kế.*

## LLM là một cái autocomplete rất giỏi

Người ta đôi khi đùa rằng LLM là "autocomplete xịn", và thật ra đó là một mô tả khá chính xác. Tất cả những gì LLM làm là dự đoán từ tiếp theo nên xuất hiện trong một đoạn văn bản.

Cho một người xem cụm chưa hoàn chỉnh *"what a beautiful day the sun is…"* và họ có thể đoán kết thúc. LLM cũng vậy. Với prompt đó, "shining" là khả năng cao nhất — dù "rising" hay "out" cũng hợp lý. Cụm bắt đầu gọi là **prompt**, mỗi cụm hoàn chỉnh gọi là một **completion**.

Một số completion đúng ngữ pháp nhưng không hợp lý. *"The sun is exploding"* là tiếng Anh hoàn toàn hợp lệ, nhưng không thực tế — mặt trời không nổ, chắc chắn không phải vào một ngày đẹp trời. Bạn có trực giác về cách dùng từ; theo một nghĩa nào đó, model cũng vậy.

Về mặt kỹ thuật, LLM là một mạng nơ-ron khổng lồ — một mô hình toán học phức tạp về ngôn ngữ. Nó lưu thông tin về những từ thường đi cùng nhau, thứ tự điển hình của chúng, và ở tầng cao hơn là ý nghĩa của chúng trong ngữ cảnh. Biểu diễn toán học đó của ngôn ngữ chính là thứ model dùng để tạo văn bản mới.

## Token, không phải từ

Khi tạo phản hồi, LLM nối thêm từng từ vào cuối prompt, mỗi lần một từ. Về kỹ thuật, nó không tạo *từ* mà tạo **token** — khái niệm tổng quát hơn cho các mảnh của từ. Một số từ ("London", "door") có thể có token riêng; các từ ghép phổ biến ("programmatically", "unhappy") thường bị chia thành nhiều token. Dấu câu cũng có thể có token riêng. Hầu hết LLM có vốn từ khoảng 10.000 đến hơn 100.000 token, và việc ghép từ từ các mảnh nhỏ cho phép model tạo ra bất kỳ từ nào mà không cần gán token cho mọi từ có thể.

Trước khi thêm mỗi token mới, model chạy một quy trình:

1. Xử lý trạng thái hiện tại của phần hoàn chỉnh, dựng hiểu biết sâu về quan hệ giữa từng từ và ý nghĩa tổng thể.
2. Xem xét từng token trong vốn từ — thường hàng chục tới hàng trăm nghìn — và tính xác suất nó xuất hiện tiếp theo.

Trong ví dụ trên, "shining" có thể có xác suất cao nhất và "rising" thấp hơn — nhưng cả những từ ít khả năng như "exploding" hay "snoring" vẫn giữ một cơ hội nhỏ.

## Tự hồi quy: mỗi lựa chọn định hình lựa chọn sau

Các token model chọn trước đó ảnh hưởng đến lựa chọn sau này. Điều đó là mong muốn: token mới có ý nghĩa trong ngữ cảnh các token đã chọn. Nhưng nó cũng nghĩa là một khi model ngẫu nhiên chọn một hướng, nó đi theo hướng đó đến cùng.

Nếu chọn "shining", nó có thể chọn tiếp "in", "the", "sky" — đều hợp lý so với những gì đã có. Nhưng nếu token đầu là "warming", nó có thể chọn "our faces", vì điều đó khớp với hướng model đã bắt đầu. Hành vi này gọi là **tự hồi quy (autoregressive)** — tự ảnh hưởng. Kết hợp với yếu tố ngẫu nhiên, nó khiến việc chạy cùng một prompt qua cùng một LLM nhiều lần thường cho kết quả khác nhau.

LLM hiểu được ý nghĩa câu hỏi và đưa ra dự đoán hợp lý vì nó được huấn luyện trên các bộ sưu tập văn bản lớn. Mô hình toán học đứng sau có hàng tỷ tham số (trọng số số học). Trước khi huấn luyện, model đó chỉ tạo ra văn bản vô nghĩa.

## Huấn luyện diễn ra thế nào

Trong quá trình huấn luyện, LLM được cho xem văn bản chưa hoàn chỉnh từ dữ liệu training và cố dự đoán từ tiếp theo. Dựa trên độ chính xác của dự đoán, nó cập nhật tham số nội bộ. Đây là cách nó học cả thông tin thực tế lẫn *phong cách* ngôn ngữ trong dữ liệu. Nhiều LLM hiện đại được huấn luyện trên hàng nghìn tỷ từ, phần lớn từ internet mở. Các model thu được có thể tạo văn bản với nhiều phong cách và chủ đề, chính vì ví dụ về những phong cách đó và dữ kiện về những chủ đề đó nằm trong dữ liệu huấn luyện.

## Vì sao LLM ảo giác

Hiểu cách LLM hoạt động và được huấn luyện cũng giải thích nhiều hành vi của nó. Bắt đầu với ảo giác: tất cả những gì LLM có thể làm là tạo ra chuỗi từ **có khả năng xảy ra** dựa trên các mẫu nó học được.

Nếu bạn hỏi LLM về dữ liệu nội bộ riêng tư của công ty, hay tin tức hôm nay, model gần như chắc chắn không được huấn luyện trên thông tin đó — nên nó không ở vị trí tốt để trả lời. Trong những trường hợp đó, nó đôi khi đưa ra câu trả lời nghe có vẻ đúng nhưng thực chất sai. Dù gọi là ảo giác, hãy nhớ model không gặp vấn đề tâm lý hay thực sự trục trặc: nó được thiết kế để tạo văn bản **có khả năng xảy ra cao**, không phải văn bản **trung thực**. Với LLM, sự thật chỉ đơn giản là chuỗi từ có xác suất cao theo dữ liệu huấn luyện. Với dữ liệu huấn luyện chất lượng cao, trực giác của chúng ta về sự thật và cảm nhận toán học của model về chuỗi từ xác suất cao có thể khớp nhau. Thách thức nằm ở việc đảm bảo LLM có quyền truy cập càng nhiều thông tin liên quan càng tốt.

## RAG sửa điều đó thế nào (và vì sao không thể nhồi hết)

RAG giải quyết bằng cách tận dụng khả năng hiểu ngữ cảnh của LLM. Nếu hệ thống RAG đưa thông tin liên quan vào prompt, LLM có thể hiểu và đưa thông tin đó vào phản hồi **kể cả khi nó chưa từng nằm trong dữ liệu huấn luyện**. Người ta thường gọi đây là *grounding* phản hồi.

Bạn có thể nghĩ cứ thêm càng nhiều thông tin liên quan càng tốt. Thực tế có hai lý do không thể:

1. **Prompt dài hơn tốn nhiều tính toán hơn.** Trước khi tạo mỗi token mới, model thực hiện một phép quét tốn kém về mặt tính toán trên mọi token đã có trong phần hoàn chỉnh — kể cả prompt gốc.
2. **Bạn chạm giới hạn context window.** Mỗi model có lượng văn bản tối đa xử lý cùng lúc. Model cũ chỉ vài nghìn token; model mới có thể tới hàng triệu. Nhưng khi retriever thêm nhiều thông tin, trước tiên bạn làm prompt đắt hơn, và cuối cùng dùng hết hoàn toàn context window.

Vậy nên retrieval phải *chọn lọc* — và đó là toàn bộ vấn đề. Làm sao hệ thống quyết định tài liệu nào đáng đưa vào prompt? Đó là phần 3.
