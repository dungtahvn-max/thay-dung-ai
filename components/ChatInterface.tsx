import React, { useState, useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import { ChatMessage, User } from '../types';
import { sendMessageToGemini, STORAGE_KEY_TRAINING } from '../services/geminiService';
import { PaperAirplaneIcon, PhotoIcon, XMarkIcon, ArrowPathIcon, CameraIcon, LockClosedIcon, CommandLineIcon, ChatBubbleLeftRightIcon, EyeIcon, EyeSlashIcon } from '@heroicons/react/24/solid';

interface ChatInterfaceProps {
  user: User;
  onLogout: () => void;
}

// Random greetings list
const GREETINGS = [
    "Chào em! Hôm nay em muốn chinh phục bài toán nào đây? 🚀",
    "Thầy Dũng chào em! Sẵn sàng cho buổi học đầy năng lượng chưa nào? 💪",
    "Chào trò! Có bài tập nào khó nhằn không, gửi qua đây thầy trò mình cùng xử lý nhé! 🧠",
    "Hello em! Hôm nay chúng ta sẽ học gì nhỉ? Thầy đang rất háo hức đây! ✨",
    "Chào em nhé! Đừng ngại hỏi, thầy ở đây để giúp em giỏi lên mỗi ngày! 📚"
];

// Custom component to render SVG code blocks as a toggleable button
const SvgRenderer = ({ code }: { code: string }) => {
    const [isVisible, setIsVisible] = useState(false);
    
    // Basic cleanup to ensure we just get the inner SVG
    const svgContent = code.trim();

    return (
        <div className="my-4">
            <button 
                onClick={() => setIsVisible(!isVisible)}
                className="flex items-center space-x-2 bg-indigo-100 hover:bg-indigo-200 text-indigo-700 px-4 py-2 rounded-xl font-bold transition-colors border-2 border-indigo-200"
            >
                {isVisible ? <EyeSlashIcon className="h-5 w-5" /> : <EyeIcon className="h-5 w-5" />}
                <span>{isVisible ? 'Ẩn hình minh họa' : 'Bấm để xem hình minh họa'}</span>
            </button>
            
            {isVisible && (
                <div 
                    className="mt-3 p-4 bg-white rounded-xl border-2 border-gray-200 overflow-x-auto flex justify-center"
                    dangerouslySetInnerHTML={{ __html: svgContent }}
                />
            )}
        </div>
    );
};

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
        const randomGreeting = GREETINGS[Math.floor(Math.random() * GREETINGS.length)];
        const initialGreeting: ChatMessage = {
          id: 'init-1',
          role: 'model',
          text: `${randomGreeting}\n\n*(Thầy Dũng đang lắng nghe...)*`,
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
    <div className="flex flex-col h-screen bg-gray-50 font-sans">
      {/* 3D Header - Red/Orange Theme */}
      <div className="bg-orange-500 p-4 flex justify-between items-center z-10 border-b-4 border-black shadow-lg">
        <div className="flex items-center space-x-3">
          <div className="w-12 h-12 rounded-xl bg-white flex items-center justify-center border-4 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
            <span className="text-2xl">👨‍🏫</span>
          </div>
          <div className="text-white drop-shadow-[2px_2px_0px_rgba(0,0,0,1)]">
            <h1 className="font-black text-xl leading-tight uppercase tracking-wide">Thầy Dũng</h1>
            <p className="text-xs font-bold text-yellow-300 flex items-center">
              <span className="w-2 h-2 bg-green-400 rounded-full mr-1 animate-pulse border border-black"></span>
              ONLINE • {user.role === 'student' ? user.grade : 'Giáo viên'}
            </p>
          </div>
        </div>
        <div className="flex items-center space-x-2">
            {user.role === 'teacher' && (
                <div className="flex bg-black/20 rounded-xl p-1 mr-2 border-2 border-black/10">
                    <button 
                        onClick={() => setActiveTab('chat')}
                        className={`px-3 py-1 rounded-lg text-sm font-bold transition-colors ${activeTab === 'chat' ? 'bg-white text-orange-600 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] border border-black' : 'text-white hover:bg-white/10'}`}
                    >
                        <ChatBubbleLeftRightIcon className="h-5 w-5 inline mr-1" />
                        Chat
                    </button>
                    <button 
                        onClick={() => setActiveTab('training')}
                        className={`px-3 py-1 rounded-lg text-sm font-bold transition-colors ${activeTab === 'training' ? 'bg-white text-orange-600 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] border border-black' : 'text-white hover:bg-white/10'}`}
                    >
                        <CommandLineIcon className="h-5 w-5 inline mr-1" />
                        Huấn luyện
                    </button>
                </div>
            )}
            <button 
                onClick={onLogout}
                className="text-sm bg-red-500 text-white hover:bg-red-600 font-bold px-4 py-2 rounded-xl border-2 border-black shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] active:shadow-none active:translate-y-[3px] transition-all"
            >
                Thoát
            </button>
        </div>
      </div>

      {/* Main Content Area */}
      {user.role === 'teacher' && activeTab === 'training' ? (
          // TEACHER TRAINING DASHBOARD
          <div className="flex-1 p-6 overflow-y-auto bg-purple-50">
              <div className="max-w-3xl mx-auto bg-white rounded-2xl shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] border-4 border-black p-8">
                  <h2 className="text-2xl font-black text-purple-600 mb-2 uppercase">Huấn luyện AI cá nhân hóa</h2>
                  <p className="text-gray-600 mb-6 text-sm font-medium">
                      Nhập các quy tắc, phương pháp giải, hoặc lời dặn dò bổ sung mà bạn muốn "nhúng" vào bộ não của Chatbot. 
                  </p>

                  <div className="space-y-4">
                      <div>
                          <label className="block text-sm font-black text-gray-800 mb-2 uppercase">
                              Dữ liệu hướng dẫn bổ sung
                          </label>
                          <textarea 
                              className="w-full h-64 p-4 border-4 border-gray-300 rounded-xl focus:border-purple-500 focus:outline-none bg-gray-50 text-gray-900 placeholder-gray-400 leading-relaxed font-mono text-sm"
                              placeholder="Ví dụ:&#10;- Khi giải toán hình học lớp 9, luôn yêu cầu học sinh vẽ hình trước.&#10;- Với các bài toán đố, hãy tóm tắt đề bài thành các gạch đầu dòng."
                              value={trainingData}
                              onChange={(e) => setTrainingData(e.target.value)}
                          ></textarea>
                      </div>

                      <div className="flex items-center justify-between pt-2">
                          <span className="text-xs text-gray-500 italic font-bold">
                              * Dữ liệu được lưu trên trình duyệt này.
                          </span>
                          <button
                              onClick={handleSaveTraining}
                              className={`flex items-center px-6 py-3 rounded-xl font-black text-white border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] active:shadow-none active:translate-y-[4px] transition-all ${
                                  saveStatus === 'saved' 
                                  ? 'bg-green-500' 
                                  : 'bg-purple-600 hover:bg-purple-700'
                              }`}
                          >
                              {saveStatus === 'saved' ? 'ĐÃ LƯU!' : 'LƯU KIẾN THỨC'}
                          </button>
                      </div>
                  </div>
              </div>
          </div>
      ) : (
          // CHAT VIEW (Student & Teacher)
          <>
            <div className="flex-1 overflow-y-auto p-4 space-y-6 bg-[#E0F7FA] bg-[url('https://www.transparenttextures.com/patterns/dot-grid.png')]">
                {messages.map((msg) => (
                <div
                    key={msg.id}
                    className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                    <div
                    className={`max-w-[90%] md:max-w-[75%] rounded-2xl p-5 relative border-2 border-black ${
                        msg.role === 'user'
                        ? 'bg-blue-500 text-white rounded-br-none shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]'
                        : 'bg-white text-gray-800 rounded-bl-none shadow-[6px_6px_0px_0px_#FF9800]'
                    }`}
                    >
                    {msg.image && (
                        <div className="mb-4">
                        <img 
                            src={msg.image} 
                            alt="Uploaded content" 
                            className="max-h-60 rounded-lg object-contain bg-white border-2 border-black shadow-sm" 
                        />
                        </div>
                    )}
                    
                    <div className={`prose break-words text-sm md:text-base leading-relaxed font-medium ${
                        msg.role === 'user' 
                        ? 'prose-invert prose-p:text-white prose-a:text-blue-200' 
                        : 'prose-stone prose-p:text-gray-900 prose-headings:text-purple-700'
                        } max-w-none`}>
                        <ReactMarkdown 
                            remarkPlugins={[remarkGfm, remarkMath]} 
                            rehypePlugins={[rehypeKatex]}
                            components={{
                                code({node, inline, className, children, ...props}) {
                                    const match = /language-(\w+)/.exec(className || '')
                                    // Custom renderer for SVG blocks
                                    if (!inline && match && match[1] === 'svg') {
                                        return <SvgRenderer code={String(children)} />
                                    }
                                    return <code className={className} {...props}>{children}</code>
                                }
                            }}
                        >
                        {msg.text}
                        </ReactMarkdown>
                    </div>
                    </div>
                </div>
                ))}
                
                {isLoading && (
                <div className="flex justify-start">
                    <div className="bg-white border-2 border-black rounded-2xl rounded-bl-none p-4 shadow-[4px_4px_0px_0px_#FF9800] flex items-center space-x-2">
                    <div className="w-3 h-3 bg-pink-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                    <div className="w-3 h-3 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                    <div className="w-3 h-3 bg-purple-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                    </div>
                </div>
                )}
                <div ref={messagesEndRef} />
            </div>

            {isLocked ? (
                <div className="bg-gray-100 p-8 border-t-4 border-black text-center">
                    <LockClosedIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-600 font-bold text-lg">Cuộc trò chuyện đã bị khóa.</p>
                    <button onClick={onLogout} className="mt-4 text-blue-600 font-bold hover:underline">Quay lại màn hình chính</button>
                </div>
            ) : (
                <div className="bg-white p-3 md:p-4 border-t-4 border-black z-20">
                    {selectedImage && (
                    <div className="mb-3 relative inline-block animate-fadeIn">
                        <div className="relative rounded-xl overflow-hidden border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,0.2)] group">
                            <img src={selectedImage} alt="Preview" className="h-24 w-auto object-cover" />
                            <button
                                onClick={() => setSelectedImage(null)}
                                className="absolute top-1 right-1 bg-red-500 hover:bg-red-600 text-white rounded-full p-1 border border-black shadow-sm"
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

                        <div className="flex flex-col gap-2">
                            <button
                                onClick={() => cameraInputRef.current?.click()}
                                className="p-3 text-white bg-pink-500 hover:bg-pink-600 rounded-xl transition-all border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:shadow-none active:translate-y-[2px]"
                                title="Chụp ảnh đề bài"
                            >
                                <CameraIcon className="h-6 w-6" />
                            </button>
                            <button
                                onClick={() => fileInputRef.current?.click()}
                                className="p-3 text-white bg-teal-500 hover:bg-teal-600 rounded-xl transition-all border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:shadow-none active:translate-y-[2px]"
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
                                placeholder="Nhập câu hỏi..."
                                className="w-full border-2 border-black rounded-2xl py-3 px-4 focus:outline-none focus:border-blue-500 resize-none max-h-32 bg-gray-50 focus:bg-white text-gray-900 placeholder-gray-400 font-medium"
                                rows={1}
                                style={{ minHeight: '60px' }}
                            />
                        </div>
                        
                        <button
                            onClick={handleSendMessage}
                            disabled={isLoading || (!inputText.trim() && !selectedImage)}
                            className={`p-3 rounded-2xl border-2 border-black flex items-center justify-center transition-all ${
                                isLoading || (!inputText.trim() && !selectedImage)
                                    ? 'bg-gray-200 text-gray-400 cursor-not-allowed border-gray-300'
                                    : 'bg-blue-500 text-white hover:bg-blue-600 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] active:shadow-none active:translate-y-[4px]'
                            }`}
                            style={{ height: '60px', width: '60px' }}
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
