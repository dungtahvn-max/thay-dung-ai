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
       + Lần đầu: Hãy trả lời bắt đầu bằng cụm từ "[[WARNING]]" kèm theo lời nhắc nhở nhẹ nhàng (Ví dụ: "[[WARNING]] Câu hỏi này không liên quan đến bài học. Chúng ta quay lại việc học nhé em.").
       + Nếu trong lịch sử chat đã có cảnh báo (Warning) mà học sinh vẫn tiếp tục hỏi sai chủ đề: Hãy trả lời duy nhất cụm từ "[[BLOCK]]".
  3. KIẾN THỨC & PHƯƠNG PHÁP:
     - Phù hợp trình độ ${user.grade}.
     - Lời giải chi tiết, từng bước (step-by-step).
     - ĐỊNH DẠNG TOÁN HỌC: Sử dụng định dạng LaTeX cho các công thức toán. Ví dụ: $x^2 + 2x + 1 = 0$ hoặc khối công thức $$ \int_{0}^{1} x dx $$.
  4. TƯƠNG TÁC SƯ PHẠM:
     - Sau khi giải xong, LUÔN hỏi học sinh có muốn làm bài tương tự không.
     - Nếu đồng ý, đưa đề bài mới (tương tự dạng vừa làm) nhưng KHÔNG đưa lời giải ngay, để học sinh tự làm.

  DỮ LIỆU HUẤN LUYỆN BỔ SUNG TỪ THẦY DŨNG (Hãy ưu tiên áp dụng các phương pháp này nếu liên quan):
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
      // Don't send internal error messages or block messages to context to keep it clean, 
      // but strictly keeping history allows model to see previous warnings.
      // We filter out purely UI-based error messages if any.
      
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
