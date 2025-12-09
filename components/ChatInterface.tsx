import React, { useState, useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import { ChatMessage, User } from '../types';
import { sendMessageToGemini, STORAGE_KEY_TRAINING } from '../services/geminiService';
import { PaperAirplaneIcon, PhotoIcon, XMarkIcon, ArrowPathIcon, CameraIcon, LockClosedIcon, CommandLineIcon, ChatBubbleLeftRightIcon } from '@heroicons/react/24/solid';

interface ChatInterfaceProps {
  user: User;
  onLogout: () => void;
}

const ChatInterface: React.FC<ChatInterfaceProps> = ({ user, onLogout }) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isLocked, setIsLocked] = useState(false);
  
  // Teacher Mode State
  const [activeTab, setActiveTab] = useState<'chat' | 'training'>('chat');
  const [trainingData, setTrainingData] = useState('');
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saved'>('idle');

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  // Initial greeting & Load Training Data
  useEffect(() => {
    // Greeting
    if (messages.length === 0) {
      if (user.role === 'student') {
        const initialGreeting: ChatMessage = {
          id: 'init-1',
          role: 'model',
          text: `Chào em, ${user.name}! 👋\n\nThầy là Thầy Dũng đây. Rất vui được đồng hành cùng em trong chương trình ${user.grade}.\n\nEm có bài tập nào khó hay thắc mắc gì cần thầy giải đáp không? Cứ gửi đề bài hoặc chụp ảnh gửi cho thầy nhé!`,
        };
        setMessages([initialGreeting]);
      } else if (user.role === 'teacher') {
          const initialGreeting: ChatMessage = {
              id: 'init-1',
              role: 'model',
              text: `Chào đồng nghiệp. Hệ thống trợ lý AI đã sẵn sàng hỗ trợ bạn soạn giáo án và nghiên cứu tài liệu.`,
          };
          setMessages([initialGreeting]);
      }
    }

    // Load training data for teacher
    if (user.role === 'teacher') {
        const savedData = localStorage.getItem(STORAGE_KEY_TRAINING);
        if (savedData) setTrainingData(savedData);
    }
  }, [user, messages.length]);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading, activeTab]);

  // Paste Event Handler for Images
  useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
        if (isLocked || (user.role === 'teacher' && activeTab === 'training')) return;
        const items = e.clipboardData?.items;
        if (!items) return;

        for (const item of items) {
            if (item.type.indexOf('image') !== -1) {
                const blob = item.getAsFile();
                if (blob) {
                    const reader = new FileReader();
                    reader.onload = (event) => {
                        setSelectedImage(event.target?.result as string);
                    };
                    reader.readAsDataURL(blob);
                    e.preventDefault(); 
                }
            }
        }
    };

    document.addEventListener('paste', handlePaste);
    return () => {
        document.removeEventListener('paste', handlePaste);
    };
  }, [isLocked, activeTab, user.role]);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setSelectedImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
    e.target.value = '';
  };

  const handleSaveTraining = () => {
      localStorage.setItem(STORAGE_KEY_TRAINING, trainingData);
      setSaveStatus('saved');
      setTimeout(() => setSaveStatus('idle'), 2000);
  };

  const handleSendMessage = async () => {
    if ((!inputText.trim() && !selectedImage) || isLoading || isLocked) return;

    const newMessage: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      text: inputText,
      image: selectedImage || undefined,
    };

    setMessages((prev) => [...prev, newMessage]);
    setInputText('');
    setSelectedImage(null);
    setIsLoading(true);

    try {
      const responseText = await sendMessageToGemini(messages, newMessage.text, user, newMessage.image);
      
      // Check for BLOCK signal
      if (responseText.includes('[[BLOCK]]')) {
        const blockMessage: ChatMessage = {
            id: (Date.now() + 1).toString(),
            role: 'model',
            text: "🔒 **Đoạn chat đã bị khóa.**\n\nThầy đã nhắc nhở nhưng em vẫn tiếp tục hỏi về vấn đề không liên quan đến học tập. Thầy xin phép dừng cuộc trò chuyện tại đây. Em hãy tải lại trang nếu muốn bắt đầu lại nghiêm túc hơn nhé.",
        };
        setMessages((prev) => [...prev, blockMessage]);
        setIsLocked(true);
      } else {
        const cleanText = responseText.replace('[[WARNING]]', '⚠️ **Nhắc nhở:** ');
        const botMessage: ChatMessage = {
            id: (Date.now() + 1).toString(),
            role: 'model',
            text: cleanText,
        };
        setMessages((prev) => [...prev, botMessage]);
      }

    } catch (error) {
      console.error(error);
      const errorMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'model',
        text: 'Xin lỗi em, mạng của thầy hơi chập chờn. Em hỏi lại được không?',
        isError: true,
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <div className="flex flex-col h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-teal-500 to-cyan-500 shadow-md p-4 flex justify-between items-center z-10">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center border-2 border-teal-100 shadow-sm">
            <span className="text-xl">👨‍🏫</span>
          </div>
          <div className="text-white">
            <h1 className="font-bold text-lg leading-tight">Thầy Dũng</h1>
            <p className="text-xs text-teal-100 flex items-center opacity-90">
              <span className="w-2 h-2 bg-green-400 rounded-full mr-1 animate-pulse"></span>
              Trực tuyến • {user.role === 'student' ? user.grade : 'Giáo viên'}
            </p>
          </div>
        </div>
        <div className="flex items-center space-x-2">
            {user.role === 'teacher' && (
                <div className="flex bg-black/20 rounded-lg p-1 mr-2">
                    <button 
                        onClick={() => setActiveTab('chat')}
                        className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${activeTab === 'chat' ? 'bg-white text-teal-600 shadow-sm' : 'text-teal-100 hover:bg-white/10'}`}
                    >
                        <ChatBubbleLeftRightIcon className="h-5 w-5 inline mr-1" />
                        Chat
                    </button>
                    <button 
                        onClick={() => setActiveTab('training')}
                        className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${activeTab === 'training' ? 'bg-white text-teal-600 shadow-sm' : 'text-teal-100 hover:bg-white/10'}`}
                    >
                        <CommandLineIcon className="h-5 w-5 inline mr-1" />
                        Huấn luyện
                    </button>
                </div>
            )}
            <button 
                onClick={onLogout}
                className="text-sm bg-white/10 text-white hover:bg-white/20 font-medium px-4 py-2 rounded-lg transition-colors backdrop-blur-sm border border-white/20"
            >
                Thoát
            </button>
        </div>
      </div>

      {/* Main Content Area */}
      {user.role === 'teacher' && activeTab === 'training' ? (
          // TEACHER TRAINING DASHBOARD
          <div className="flex-1 p-6 overflow-y-auto bg-gray-50">
              <div className="max-w-3xl mx-auto bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
                  <h2 className="text-2xl font-bold text-gray-800 mb-2">Huấn luyện AI cá nhân hóa</h2>
                  <p className="text-gray-500 mb-6 text-sm">
                      Nhập các quy tắc, phương pháp giải, hoặc lời dặn dò bổ sung mà bạn muốn "nhúng" vào bộ não của Chatbot. 
                      Học sinh sẽ nhận được các câu trả lời dựa trên những hướng dẫn này.
                  </p>

                  <div className="space-y-4">
                      <div>
                          <label className="block text-sm font-bold text-gray-700 mb-2">
                              Dữ liệu hướng dẫn bổ sung
                          </label>
                          <textarea 
                              className="w-full h-64 p-4 border border-gray-300 rounded-xl focus:ring-2 focus:ring-teal-500 focus:border-transparent bg-gray-50 text-gray-900 placeholder-gray-400 leading-relaxed font-mono text-sm"
                              placeholder="Ví dụ:&#10;- Khi giải toán hình học lớp 9, luôn yêu cầu học sinh vẽ hình trước.&#10;- Với các bài toán đố, hãy tóm tắt đề bài thành các gạch đầu dòng.&#10;- Luôn động viên các em bằng câu nói: 'Cố lên, không có bài toán nào là không thể giải!'"
                              value={trainingData}
                              onChange={(e) => setTrainingData(e.target.value)}
                          ></textarea>
                      </div>

                      <div className="flex items-center justify-between pt-2">
                          <span className="text-xs text-gray-400 italic">
                              * Dữ liệu được lưu trên trình duyệt này.
                          </span>
                          <button
                              onClick={handleSaveTraining}
                              className={`flex items-center px-6 py-3 rounded-xl font-bold text-white transition-all ${
                                  saveStatus === 'saved' 
                                  ? 'bg-green-500 hover:bg-green-600' 
                                  : 'bg-teal-600 hover:bg-teal-700 shadow-lg shadow-teal-500/30'
                              }`}
                          >
                              {saveStatus === 'saved' ? 'Đã lưu thành công!' : 'Lưu kiến thức'}
                          </button>
                      </div>
                  </div>
              </div>
          </div>
      ) : (
          // CHAT VIEW (Student & Teacher)
          <>
            <div className="flex-1 overflow-y-auto p-4 space-y-6 bg-[url('https://www.transparenttextures.com/patterns/graphy.png')]">
                {messages.map((msg) => (
                <div
                    key={msg.id}
                    className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                    <div
                    className={`max-w-[85%] md:max-w-[70%] rounded-2xl p-4 shadow-sm relative ${
                        msg.role === 'user'
                        ? 'bg-teal-600 text-white rounded-br-none shadow-teal-500/20'
                        : 'bg-white text-gray-800 border border-gray-100 rounded-bl-none shadow-gray-200/50'
                    }`}
                    >
                    {msg.image && (
                        <div className="mb-3">
                        <img 
                            src={msg.image} 
                            alt="Uploaded content" 
                            className="max-h-60 rounded-lg object-contain bg-black/5 border border-black/5" 
                        />
                        </div>
                    )}
                    
                    <div className={`prose break-words text-sm md:text-base leading-relaxed ${
                        msg.role === 'user' 
                        ? 'prose-invert prose-p:text-white prose-a:text-teal-200' 
                        : 'prose-teal prose-p:text-gray-800'
                        } max-w-none`}>
                        <ReactMarkdown 
                            remarkPlugins={[remarkGfm, remarkMath]} 
                            rehypePlugins={[rehypeKatex]}
                        >
                        {msg.text}
                        </ReactMarkdown>
                    </div>
                    </div>
                </div>
                ))}
                
                {isLoading && (
                <div className="flex justify-start">
                    <div className="bg-white border border-gray-100 rounded-2xl rounded-bl-none p-4 shadow-sm flex items-center space-x-2">
                    <div className="w-2 h-2 bg-pink-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                    <div className="w-2 h-2 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                    <div className="w-2 h-2 bg-teal-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                    </div>
                </div>
                )}
                <div ref={messagesEndRef} />
            </div>

            {isLocked ? (
                <div className="bg-gray-100 p-6 border-t border-gray-300 text-center">
                    <LockClosedIcon className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                    <p className="text-gray-500 font-medium">Cuộc trò chuyện đã bị khóa.</p>
                    <button onClick={onLogout} className="mt-2 text-teal-600 hover:underline">Quay lại màn hình chính</button>
                </div>
            ) : (
                <div className="bg-white p-3 md:p-4 border-t border-gray-200 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)] z-20">
                    {selectedImage && (
                    <div className="mb-3 relative inline-block animate-fadeIn">
                        <div className="relative rounded-xl overflow-hidden border-2 border-teal-500 shadow-lg group">
                            <img src={selectedImage} alt="Preview" className="h-24 w-auto object-cover" />
                            <button
                                onClick={() => setSelectedImage(null)}
                                className="absolute top-1 right-1 bg-black/50 hover:bg-red-500 text-white rounded-full p-1 transition-colors backdrop-blur-sm"
                            >
                                <XMarkIcon className="h-4 w-4" />
                            </button>
                        </div>
                    </div>
                    )}

                    <div className="flex items-end space-x-2">
                        <input
                            type="file"
                            accept="image/*"
                            className="hidden"
                            ref={fileInputRef}
                            onChange={handleImageUpload}
                        />
                        <input
                            type="file"
                            accept="image/*"
                            capture="environment" 
                            className="hidden"
                            ref={cameraInputRef}
                            onChange={handleImageUpload}
                        />

                        <div className="flex flex-col gap-1">
                            <button
                                onClick={() => cameraInputRef.current?.click()}
                                className="p-2.5 text-gray-500 hover:text-pink-600 hover:bg-pink-50 rounded-xl transition-colors"
                                title="Chụp ảnh đề bài"
                            >
                                <CameraIcon className="h-6 w-6" />
                            </button>
                            <button
                                onClick={() => fileInputRef.current?.click()}
                                className="p-2.5 text-gray-500 hover:text-teal-600 hover:bg-teal-50 rounded-xl transition-colors"
                                title="Tải ảnh từ thư viện"
                            >
                                <PhotoIcon className="h-6 w-6" />
                            </button>
                        </div>
                        
                        <div className="flex-1 relative">
                            <textarea
                                value={inputText}
                                onChange={(e) => setInputText(e.target.value)}
                                onKeyDown={handleKeyDown}
                                placeholder="Nhập câu hỏi hoặc dán ảnh (Ctrl+V)..."
                                className="w-full border border-gray-300 rounded-2xl py-3 px-4 pr-10 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent resize-none max-h-32 bg-gray-50 focus:bg-white text-gray-900 placeholder-gray-400 transition-colors"
                                rows={1}
                                style={{ minHeight: '52px' }}
                            />
                        </div>
                        
                        <button
                            onClick={handleSendMessage}
                            disabled={isLoading || (!inputText.trim() && !selectedImage)}
                            className={`p-3 rounded-2xl shadow-lg transition-all transform active:scale-95 flex items-center justify-center ${
                                isLoading || (!inputText.trim() && !selectedImage)
                                    ? 'bg-gray-200 text-gray-400 cursor-not-allowed shadow-none'
                                    : 'bg-gradient-to-br from-teal-500 to-teal-600 text-white hover:from-teal-600 hover:to-teal-700 hover:shadow-teal-500/30'
                            }`}
                            style={{ height: '52px', width: '52px' }}
                        >
                            {isLoading ? <ArrowPathIcon className="h-6 w-6 animate-spin" /> : <PaperAirplaneIcon className="h-6 w-6" />}
                        </button>
                    </div>
                </div>
            )}
          </>
      )}
    </div>
  );
};

export default ChatInterface;