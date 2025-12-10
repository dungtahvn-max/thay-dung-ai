import { GoogleGenAI, Content, Part } from "@google/genai";
import { ChatMessage, User } from "../types";

// Initialize Gemini Client
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

const MODEL_NAME = "gemini-2.5-flash";
export const STORAGE_KEY_TRAINING = 'thay_dung_training_data';

/**
 * Generates the system instruction based on the user's profile and teacher's training data.
 */
const getSystemInstruction = (user: User): string => {
  // Retrieve custom training data set by the teacher
  const teacherTrainingData = localStorage.getItem(STORAGE_KEY_TRAINING) || '';

  if (user.role === 'teacher') {
    return `Bạn là một trợ lý AI dành riêng cho giáo viên. Hãy hỗ trợ soạn giáo án, tìm kiếm tài liệu tham khảo và giải đáp các vấn đề sư phạm.
    
    DỮ LIỆU HUẤN LUYỆN BỔ SUNG (Bạn đã cài đặt):
    "${teacherTrainingData}"
    `;
  }

  return `Bạn là Thầy Dũng, một giáo viên tâm huyết, thân thiện và kiên nhẫn.
  Hiện tại thầy đang trò chuyện với học sinh tên là ${user.name}, đang học ${user.grade}.

  QUY TẮC CỐT LÕI (BẮT BUỘC TUÂN THỦ):
  1. Xưng hô: "Thầy" và "em".
  2. GIỚI HẠN CHỦ ĐỀ: Chỉ trả lời các câu hỏi liên quan đến học tập, giải bài tập, kiến thức giáo dục, tâm lý học đường.
     - Nếu học sinh hỏi chuyện phiếm, game, hoặc vấn đề không liên quan đến học tập:
       + Lần đầu: Hãy trả lời bắt đầu bằng cụm từ "[[WARNING]]" kèm theo lời nhắc nhở nhẹ nhàng.
       + Nếu trong lịch sử chat đã có cảnh báo (Warning) mà học sinh vẫn tiếp tục: Hãy trả lời duy nhất cụm từ "[[BLOCK]]".
  
  3. CẤU TRÚC TRẢ LỜI BÀI TẬP (BẮT BUỘC 4 BƯỚC):
     - Bước 1: **Phân tích đề bài (OCR)**. Ghi lại nguyên văn đề bài đã nhận diện. Nếu có bảng biểu, hãy vẽ lại bảng Markdown.
     - Bước 2: **Phương pháp & Kiến thức**. Nêu ngắn gọn lý thuyết hoặc phương pháp sẽ dùng.
     - Bước 3: **Lời giải chi tiết**. 
       + Trình bày từng dòng rõ ràng. 
       + BẮT BUỘC sử dụng các ký hiệu logic toán học: Suy ra ($\Rightarrow$), Tương đương ($\Leftrightarrow$) thay vì dùng dấu chấm câu hoặc lời văn khi biến đổi biểu thức.
       + Định dạng toán học chuẩn LaTeX (VD: $x^2 + 2x + 1 = 0$).
     - Bước 4: **Mẹo giải nhanh / Tổng kết**. Nếu là bài trắc nghiệm, hãy chỉ cách bấm máy tính Casio hoặc công thức tính nhanh.

  4. HÌNH ẢNH MINH HỌA & ĐỒ THỊ:
     - Nếu bài toán là Hình học hoặc cần Đồ thị hàm số, bạn BẮT BUỘC phải sinh ra mã SVG để vẽ hình.
     - Đặt mã SVG bên trong block code với ngôn ngữ là 'svg'. Ví dụ:
       \`\`\`svg
       <svg ...>...</svg>
       \`\`\`
     - Hãy vẽ hình chính xác, trực quan, có chú thích các điểm.

  5. TƯƠNG TÁC SƯ PHẠM:
     - Sau khi giải xong, LUÔN hỏi học sinh có muốn làm bài tương tự không.
     - Nếu đồng ý, đưa đề bài mới (tương tự dạng vừa làm) nhưng KHÔNG đưa lời giải ngay.

  DỮ LIỆU HUẤN LUYỆN BỔ SUNG TỪ THẦY DŨNG:
  "${teacherTrainingData}"

  Hãy bắt đầu bằng sự ân cần và nhiệt huyết.`;
};

/**
 * Sends a message to Gemini and returns the response.
 */
export const sendMessageToGemini = async (
  history: ChatMessage[],
  newMessageText: string,
  user: User,
  imageBase64?: string
): Promise<string> => {
  try {
    // 1. Convert app chat history to Gemini Content format
    const contents: Content[] = history.map((msg) => {
      const parts: Part[] = [];
      
      if (msg.image) {
        parts.push({
          inlineData: {
            mimeType: "image/jpeg", 
            data: msg.image.split(',')[1] 
          }
        });
      }
      
      if (msg.text) {
        parts.push({ text: msg.text });
      }

      return {
        role: msg.role,
        parts: parts,
      };
    });

    // 2. Add the new message to contents
    const newParts: Part[] = [];
    if (imageBase64) {
      newParts.push({
        inlineData: {
          mimeType: "image/jpeg",
          data: imageBase64.split(',')[1]
        }
      });
    }
    if (newMessageText) {
      newParts.push({ text: newMessageText });
    }
    
    contents.push({
      role: 'user',
      parts: newParts
    });

    // 3. Call the API
    const response = await ai.models.generateContent({
      model: MODEL_NAME,
      contents: contents,
      config: {
        systemInstruction: getSystemInstruction(user),
        temperature: 0.7, 
      }
    });

    return response.text || "Thầy chưa nghe rõ, em nói lại được không?";

  } catch (error) {
    console.error("Gemini API Error:", error);
    return "Hệ thống đang gặp trục trặc một chút. Em thử lại sau nhé!";
  }
};
