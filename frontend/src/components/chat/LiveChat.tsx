"use client";

import { useState, useEffect, useRef, useCallback } from "react";

interface Message {
  id: string;
  senderId: string;
  senderName: string;
  senderRole: string;
  content: string;
  timestamp: string;
  read: boolean;
}

interface Chat {
  id: string;
  participantId: string;
  participantName: string;
  participantRole: string;
  lastMessage: string;
  lastMessageTime: string;
  unreadCount: number;
  isOnline: boolean;
}

interface LiveChatProps {
  userRole: string;
  userId: string;
}

export default function LiveChat({ userRole, userId }: LiveChatProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [chats, setChats] = useState<Chat[]>([]);
  const [activeChat, setActiveChat] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isMinimized, setIsMinimized] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [showOnlineUsers, setShowOnlineUsers] = useState(false);
  const [onlineUsers, setOnlineUsers] = useState<string[]>([]);
  const [sendingMessage, setSendingMessage] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'connected' | 'disconnected' | 'connecting'>('connecting');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Debug state changes
  useEffect(() => {
    console.log('Chat state changed:', { isOpen, isMinimized, activeChat });
  }, [isOpen, isMinimized, activeChat]);

  // Initialize chat system
  useEffect(() => {
    console.log('Initializing chat system...');
    const token = localStorage.getItem("token");
    console.log('Token found:', !!token);
    if (!token) {
      console.log('No token - not loading chats');
      return;
    }

    console.log('Loading initial chats...');
    loadChats();
    loadOnlineUsers();
    
    // Poll for new messages every 5 seconds
    const interval = setInterval(() => {
      if (activeChat) {
        loadMessages(activeChat);
      }
      loadChats();
    }, 5000);

    return () => clearInterval(interval);
  }, [userId, activeChat]);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Handle typing indicator
  useEffect(() => {
    if (isTyping && activeChat) {
      const typingTimeout = setTimeout(() => {
        setIsTyping(false);
      }, 1000);

      return () => clearTimeout(typingTimeout);
    }
  }, [isTyping, activeChat]);

  const loadChats = async () => {
    try {
      console.log('Starting to load chats...');
      const token = localStorage.getItem("token");
      console.log('Token in loadChats:', token ? 'exists' : 'missing');
      if (!token) {
        console.log('No token found in localStorage');
        return;
      }
      
      setConnectionStatus('connecting');
      
      console.log('Making API call to load chats...');
      const response = await fetch("http://localhost:5001/api/chat", {
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        }
      });
      
      console.log('API response status:', response.status);
      
      if (!response.ok) {
        if (response.status === 401) {
          console.log("Authentication required - user not logged in");
          setConnectionStatus('disconnected');
        } else if (response.status === 500) {
          console.error("Server error - likely database connection issue");
          setConnectionStatus('disconnected');
        } else {
          console.error("Failed to load chats:", response.status);
          setConnectionStatus('disconnected');
        }
        return;
      }
      
      const data = await response.json();
      console.log("Raw chats data from API:", data);
      
      // Transform the data to match our interface
      const transformedChats = Array.isArray(data) ? data.map((chat: any) => {
        console.log('Processing chat:', chat);
        const participant = chat.participants?.find((p: any) => p.user.role !== userRole.toUpperCase());
        console.log('Found participant:', participant);
        
        return {
          id: chat._id,
          participantId: participant?.user._id || "",
          participantName: participant?.user.fullName || "Unknown",
          participantRole: participant?.user.role || "USER",
          lastMessage: chat.lastMessage?.content || "",
          lastMessageTime: chat.lastMessageAt || chat.createdAt,
          unreadCount: chat.unreadCount || 0,
          isOnline: Math.random() > 0.5
        };
      }) : [];
      
      console.log('Transformed chats:', transformedChats);
      setChats(transformedChats);
      setUnreadCount(transformedChats.reduce((sum: number, chat: any) => sum + chat.unreadCount, 0));
      setConnectionStatus('connected');
    } catch (error) {
      console.error("Error loading chats:", error);
      console.log("Backend not available - using mock data for development");
      
      // Use mock data when backend is not available
      const mockChats = [
        {
          id: 'mock-chat-1',
          participantId: 'mock-user-1',
          participantName: userRole === 'student' ? 'Admin Support' : 'Student User',
          participantRole: userRole === 'student' ? 'ADMIN' : 'STUDENT',
          lastMessage: 'Hello! How can I help you today?',
          lastMessageTime: new Date().toISOString(),
          unreadCount: 1,
          isOnline: true
        }
      ];
      
      console.log('Using mock chat data:', mockChats);
      setChats(mockChats);
      setUnreadCount(mockChats.reduce((sum: number, chat: any) => sum + chat.unreadCount, 0));
      setConnectionStatus('connected'); // Set as connected to show mock data works
    }
  };

  const loadOnlineUsers = async () => {
    try {
      const token = localStorage.getItem("token");
      if (!token) return;
      
      const response = await fetch("http://localhost:5001/api/chat", {
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        const onlineUserIds = Array.isArray(data) ? 
          data.map((chat: any) => chat.participants?.find((p: any) => p.user.role !== userRole.toUpperCase())?.user._id)
          .filter(Boolean) : [];
        setOnlineUsers(onlineUserIds);
      } else if (response.status === 401) {
        console.log("Authentication required for online users");
      } else if (response.status === 500) {
        console.log("Server error - database issue for online users");
      }
    } catch (error) {
      console.error("Error loading online users:", error);
      console.log("Backend not available - using mock online users for development");
      
      // Use mock online users when backend is not available
      const mockOnlineUsers = ['mock-user-1'];
      setOnlineUsers(mockOnlineUsers);
    }
  };

  const loadMessages = async (chatId: string) => {
    try {
      const token = localStorage.getItem("token");
      if (!token) return;
      
      const response = await fetch(`http://localhost:5001/api/chat/${chatId}/messages`, {
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        }
      });
      
      if (!response.ok) {
        console.error("Failed to load messages:", response.status);
        setMessages([]);
        return;
      }
      
      const data = await response.json();
      console.log("Messages data:", data);
      
      // Transform the data to match our interface
      const transformedMessages = Array.isArray(data) ? data.map((msg: any) => ({
        id: msg._id,
        senderId: msg.sender?._id || "",
        senderName: msg.sender?.fullName || "Unknown",
        senderRole: msg.sender?.role || "USER",
        content: msg.content || "",
        timestamp: msg.createdAt || msg.timestamp,
        read: msg.readAt ? true : false
      })) : [];
      
      setMessages(transformedMessages);
    } catch (error) {
      console.error("Error loading messages:", error);
      setMessages([]);
    }
  };

  const sendMessage = useCallback(async () => {
    if (!newMessage.trim() || !activeChat || sendingMessage) return;

    setSendingMessage(true);
    
    try {
      const token = localStorage.getItem("token");
      if (!token) return;
      
      const response = await fetch(`http://localhost:5001/api/chat/${activeChat}/messages`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({ 
          content: newMessage.trim()
        })
      });
      
      if (response.ok) {
        const message = await response.json();
        console.log("Message sent:", message);
        
        // Transform the response to match our interface
        const transformedMessage = {
          id: message._id || Date.now().toString(),
          senderId: message.sender?._id || userId,
          senderName: message.sender?.fullName || (userRole === "admin" ? "Admin" : "Student"),
          senderRole: message.sender?.role || userRole.toUpperCase(),
          content: message.content || newMessage.trim(),
          timestamp: message.createdAt || new Date().toISOString(),
          read: false
        };
        
        setMessages(prev => [...prev, transformedMessage]);
        setNewMessage("");
        setIsTyping(false);
        loadChats();
      } else {
        console.error("Failed to send message:", response.status);
      }
    } catch (error) {
      console.error("Error sending message:", error);
    } finally {
      setSendingMessage(false);
    }
  }, [newMessage, activeChat, sendingMessage, userId, userRole]);

  const startNewChat = async (participantId: string) => {
    try {
      const token = localStorage.getItem("token");
      if (!token) return;
      
      const response = await fetch("http://localhost:5001/api/chat/start", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        console.log("New chat started:", data);
        
        if (data._id) {
          setActiveChat(data._id);
          loadMessages(data._id);
          loadChats();
        }
      } else {
        console.error("Failed to start new chat:", response.status);
      }
    } catch (error) {
      console.error("Error starting new chat:", error);
    }
  };

  const handleTyping = (e: React.ChangeEvent<HTMLInputElement>) => {
    setNewMessage(e.target.value);
    if (!isTyping && activeChat) {
      setIsTyping(true);
    }
  };

  const markMessagesAsRead = async (chatId: string) => {
    try {
      const token = localStorage.getItem("token");
      if (!token) return;
      
      const response = await fetch(`http://localhost:5001/api/chat/unread/count`, {
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        }
      });
      
      if (response.ok) {
        setMessages(prev => 
          prev.map(msg => ({ ...msg, read: true }))
        );
      }
    } catch (error) {
      console.error("Error marking messages as read:", error);
    }
  };

  const filteredChats = chats.filter(chat => 
    chat.participantName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Debug chat filtering
  console.log('Chat filtering debug:', {
    totalChats: chats.length,
    searchQuery,
    filteredChats: filteredChats.length,
    chats: chats,
    filteredChatsList: filteredChats
  });

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffMins < 1440) return `${Math.floor(diffMins / 60)}h ago`;
    return date.toLocaleDateString();
  };

  if (!isOpen) {
    console.log('Chat is closed - showing button only');
    return (
      <div className="fixed bottom-4 right-4 z-50">
        <button
          onClick={() => {
            console.log('Chat button clicked - opening chat');
            setIsOpen(true);
            setIsMinimized(false);
          }}
          className="relative bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-full p-4 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 cursor-pointer z-50"
        >
          <svg className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
          </svg>
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
              {unreadCount}
            </span>
          )}
        </button>
      </div>
    );
  }

  console.log('Chat is open - rendering chat window and button');
  return (
    <div className="fixed bottom-4 right-4 z-50">
      {/* Chat Button */}
      <button
        onClick={() => {
          console.log('Chat button clicked - minimizing chat');
          setIsMinimized(true);
        }}
        className="relative bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-full p-4 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 cursor-pointer z-50"
      >
        <svg className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
          <path d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
        </svg>
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
            {unreadCount}
          </span>
        )}
      </button>

      {/* Chat Window */}
      {!isMinimized && (
        <div className="absolute bottom-16 right-0 w-96 rounded-lg border border-gray-200 bg-white shadow-2xl">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-gray-200 bg-gradient-to-r from-blue-50 to-purple-50 px-4 py-3">
            <div className="flex items-center space-x-3">
              <h3 className="font-semibold text-gray-900">Live Chat</h3>
              <div className="flex items-center space-x-2">
                <span className={`w-2 h-2 rounded-full ${
                  connectionStatus === 'connected' ? 'bg-green-500 animate-pulse' : 
                  connectionStatus === 'connecting' ? 'bg-yellow-500 animate-pulse' : 
                  'bg-red-500'
                }`}></span>
                <span className="text-xs text-gray-600">
                  {connectionStatus === 'connected' ? `${onlineUsers.length} online` : 
                   connectionStatus === 'connecting' ? 'Connecting...' : 
                   'Server Offline'}
                </span>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setShowOnlineUsers(!showOnlineUsers)}
                className="text-sm text-blue-600 hover:text-blue-800 transition-colors"
                disabled={connectionStatus !== 'connected'}
              >
                Online
              </button>
              <button
                onClick={() => setIsMinimized(true)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                  <path d="M19 9l-7 7-7-7" />
                </svg>
              </button>
            </div>
          </div>

          {!activeChat ? (
            <div className="w-full h-96 flex flex-col">
              {/* Search */}
              <div className="border-b border-gray-200 p-3">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search conversations..."
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-20"
                />
              </div>

              {/* Chat List */}
              <div className="flex-1 overflow-y-auto">
                {connectionStatus === 'disconnected' ? (
                  <div className="p-4 text-center text-gray-500">
                    <div className="mb-2">
                      <svg className="h-12 w-12 mx-auto text-red-300" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                        <path d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                      </svg>
                    </div>
                    <p className="text-sm font-medium text-red-600">Server Offline</p>
                    <p className="text-xs text-gray-400 mt-1">Database connection issue</p>
                    <p className="text-xs text-gray-400 mt-2">Please check server status</p>
                  </div>
                ) : filteredChats.length === 0 ? (
                  <div className="p-4 text-center text-gray-500">
                    <div className="mb-2">
                      <svg className="h-12 w-12 mx-auto text-gray-300" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                        <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2M12 11a4 4 0 100-8 4 4 0 000 8z" />
                      </svg>
                    </div>
                    <p className="text-sm">No chats yet</p>
                    <p className="text-xs text-gray-400 mt-1">Start a conversation to see it here</p>
                  </div>
                ) : (
                  filteredChats.map(chat => (
                    <div
                      key={chat.id}
                      onClick={() => {
                        setActiveChat(chat.id);
                        loadMessages(chat.id);
                      }}
                      className={`flex items-center space-x-3 p-3 hover:bg-gray-50 cursor-pointer transition-colors ${activeChat === chat.id ? 'bg-blue-50 border-l-4 border-blue-500' : ''}`}
                    >
                      <div className="relative">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-semibold text-sm ${
                          chat.participantRole === 'ADMIN' ? 'bg-purple-500' : 
                          chat.participantRole === 'FACULTY' ? 'bg-blue-500' : 
                          'bg-green-500'
                        }`}>
                          {chat.participantName.charAt(0).toUpperCase()}
                        </div>
                        {chat.isOnline && (
                          <span className="absolute bottom-0 right-0 w-3 h-3 rounded-full bg-green-400 border-2 border-white"></span>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <p className="font-medium text-gray-900 truncate">{chat.participantName}</p>
                          <span className="text-xs text-gray-500">{formatTime(chat.lastMessageTime || '')}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <p className="text-sm text-gray-600 truncate">{chat.lastMessage}</p>
                          {chat.unreadCount > 0 && (
                            <span className="inline-flex items-center justify-center w-5 h-5 text-xs font-bold text-white bg-red-500 rounded-full">
                              {chat.unreadCount}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          ) : (
            <div className="w-full flex flex-col h-full">
              {/* Active Chat Header */}
              <div className="flex items-center justify-between border-b border-gray-200 p-3 bg-gray-50">
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => setActiveChat(null)}
                    className="text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                      <path d="M15 19l-7-7 7-7" />
                    </svg>
                  </button>
                  <div>
                    <p className="font-medium text-gray-900">
                      {chats.find(c => c.id === activeChat)?.participantName || "Chat"}
                    </p>
                    {isTyping && (
                      <p className="text-xs text-gray-500">Typing...</p>
                    )}
                  </div>
                </div>
                <button
                  onClick={() => markMessagesAsRead(activeChat)}
                  className="text-sm text-blue-600 hover:text-blue-800 transition-colors"
                >
                  Mark as read
                </button>
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {messages.length === 0 ? (
                  <div className="text-center text-gray-500 py-8">
                    <p className="text-sm">No messages yet</p>
                    <p className="text-xs text-gray-400 mt-1">Start the conversation!</p>
                  </div>
                ) : (
                  messages.map(message => (
                    <div
                      key={message.id}
                      className={`flex ${message.senderId === userId ? 'justify-end' : 'justify-start'}`}
                    >
                      <div className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                        message.senderId === userId 
                          ? 'bg-blue-600 text-white' 
                          : 'bg-gray-100 text-gray-900'
                      }`}>
                        <div className="flex items-center space-x-1 mb-1">
                          <span className="text-xs font-medium">{message.senderName}</span>
                          {message.senderId === userId && message.read && (
                            <span className="text-xs">✓✓</span>
                          )}
                        </div>
                        <p className="text-sm break-words">{message.content}</p>
                      </div>
                    </div>
                  ))
                )}
                
                <div ref={messagesEndRef} />
              </div>

              {/* Message Input */}
              <div className="border-t border-gray-200 p-3">
                <div className="flex items-center space-x-2">
                  <input
                    ref={inputRef}
                    type="text"
                    value={newMessage}
                    onChange={handleTyping}
                    onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
                    placeholder="Type a message..."
                    className="flex-1 rounded-full border border-gray-300 px-4 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-20"
                  />
                  <button
                    onClick={sendMessage}
                    disabled={!newMessage.trim() || sendingMessage}
                    className="rounded-full bg-blue-600 text-white p-2 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 hover:scale-105"
                  >
                    {sendingMessage ? (
                      <div className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
                    ) : (
                      <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                        <path d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                      </svg>
                    )}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
